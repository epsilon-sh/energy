import express from 'express'
import fetchPrices from '../entso/query.mjs'
import { Database } from 'sqlite-async'

import consumptionData from '../fingrid/data.mjs'
import { domains, documentTypes } from '../entso/params.mjs'
const epochFromPosition = (from, position, resolution = 'PT60M') => {
  if (resolution !== 'PT60M')
    throw new Error(`Unsupported offset resolution: ${resolution}`)

  const offset = position - 1
  const origin = new Date(from)
  const epoch = origin.setUTCHours(origin.getUTCHours() - offset)

  return epoch
}

const localData = {
  prices: [],
  consumption: [],
}

const api = express()
api.get('/prices', async (req, res) => {
  const now = new Date()
  const defaultStart = new Date('2023/01/01 00:00 UTC').getTime()
  const defaultEnd = now.setUTCDate(now.getUTCDate() + 1)

  const start = new Date(req.query.start || req.query.periodStart || defaultStart)
  const end = new Date(req.query.end || req.query.periodEnd || defaultEnd)

  const data = localData.prices.filter(point => point.time >= start && point.time <= end) ||
    await db?.all(`SELECT * FROM ${DB_PRICE_TABLE} WHERE time >= (?) AND time <= (?)`, start, end) ||
    await fetchPrices({ start, end })

  return res.send(data)
})

api.get('/consumption', async (req, res) => {
  const now = new Date()
  const defaultStart = new Date('2023/01/01 00:00 UTC').getTime()
  const defaultEnd = now.setUTCDate(now.getUTCDate() + 1)

  const start = new Date(req.query.start || req.query.from || req.query.periodStart || defaultStart)
  const end = new Date(req.query.end || req.query.to || req.query.periodEnd || defaultEnd)

  const data = consumptionData.TimeSeries[0].Observations.filter(({ Epoch }) => {
    const dataTime = new Date(+Epoch)

    if (dataTime > start && dataTime < end)
      return true

    return false
  }).map(({ Epoch: epoch, Quantity: quantity }) => ({
    deliveryPoint: 'epsilon',
    epoch,
    resolution: 'PT60M',
    quantity,
    unit: 'kWh',
  }))

  return res.send(data)
})

api.listen(8989, process.env.HOSTNAME || 'localhost', _ => {
  console.log('http://anthracite.local:8989/prices')
})

const DB_STRING = process.env.DB_STRING
const DB_PRICE_TABLE = 'prices'
// const DB_CONSUMPTION_TABLE = 'consumption'

// TODO: split data sources e.g db / fetch to own files
// TODO: getData(type, start, end) -> cache / db / fetch priority
// TODO: Don't wait for data to open API
// TODO: Redux in /data for isomorphic state ?

let db

try {
  db = await Database.open(DB_STRING)

  await db.run(`CREATE TABLE IF NOT EXISTS prices (
        domain TEXT NOT NULL,
        resolution STRING NOT NULL,
        time INTEGER NOT NULL,
        price REAL NOT NULL
    )`)

  console.log(`Connected to database ${DB_STRING}`)

  try {
    console.log('Try DB cache...')
    localData.prices = await db.all(`SELECT * FROM ${DB_PRICE_TABLE}`) || []
    if (localData.prices.length > 0)
      console.log(JSON.stringify(localData.prices[0], null, 2), `${localData.prices.length} prices retrieved.`)
    else
      console.log('No data found in the database cache.')
  } catch (e) {
    console.error('Error getting pricePoints', e)
  }
} catch (e) {
  console.error(`Couldn't connect to DB ${DB_STRING}`)
}

if (!localData.prices.length) {
  console.log('Cache miss.')
  console.log('Fetch ENTSO prices')
  const entsoData = await fetchPrices()

  // Format ENTSO data
  if (entsoData.TimeSeries.length) {
    const documentType = documentTypes[entsoData.type]
    const { 'period.timeInterval': timeInterval } = entsoData
    const { start, end } = timeInterval
    const startDate = new Date(start)
    const endDate = new Date(end)

    const count = entsoData.TimeSeries.length

    console.log({
      documentType,
      interval: {
        startDate,
        endDate,
      },
      count,
    }, 'got ENTSO data')

    const { TimeSeries: data } = entsoData
    const timeSeries = data.reduce((series, aggregate) => {
      const {
        'in_Domain.mRID': domainKey,
        Period: {
          resolution,
          timeInterval,
          Point: period,
        },
      } = aggregate

      const points = period.map(point => {
        const {
          position,
          'price.amount': price,
        } = point
        const time = new Date(epochFromPosition(timeInterval.start, position, resolution))

        const extracted = {
          domain: domains[domainKey],
          time,
          resolution,
          price,
        }

        db?.run('INSERT INTO prices VALUES (?,?,?,?)', extracted.domain, extracted.resolution, extracted.time, extracted.price)

        return extracted
      })

      return [
        ...series,
        ...points,
      ]
    }, [])

    localData.prices = timeSeries

    console.log(JSON.stringify(localData.prices[0], null, 2), `${localData.prices.length} points acquired.`)
  }
}
