import express from 'express'
import { getDatabase } from '../db.mjs'
import fetchPrices from '../../entso/query.mjs'
import { transformPrices as extractPrices } from '../../entso/transform.mjs'
import { formatDate } from '../../entso/utils.mjs'
import { parse as parseDuration, toSeconds } from 'iso8601-duration'
import pricesData from '../../entso/priceData.mjs'

const router = express.Router()
const DB_PRICE_TABLE = process.env.DB_PRICE_TABLE || 'prices'

router.get('/', async (req, res, next) => {
  try {
    const start = new Date(req.query.start || '2023/01/01 00:00 UTC')
    const period = req.query.period || 'P1Y'
    const resolution = req.query.resolution || 'PT1H'

    // Calculate end time based on period
    const periodSeconds = toSeconds(parseDuration(period))
    const end = new Date(start.getTime() + periodSeconds * 1000)

    // TODO : check if data in pricesData already (start, end, resolution)
    // - check from pricesData map
    // - try to get missing datapoints from db
    // - try to get missing datapoints from entso
    // - insert missing datapoints
    const db = getDatabase()
    const dbData = await db.all(
      `SELECT * FROM ${DB_PRICE_TABLE} WHERE time >= ? AND time <= ?`,
      start.getTime(),
      end.getTime(),
    )

    if (dbData.length === 0) {
      const fetchedData = await fetchPrices({
        periodStart: formatDate(start),
        periodEnd: formatDate(end),
      })

      const fetchedPrices = extractPrices(fetchedData)

      await insertPrices(fetchedPrices)
    }

    pricesData.insert(...dbData.map(item => ({
      ...item,
      time: new Date(item.time).toISOString(),
    })))

    const result = pricesData
      .from(start)
      .to(end)
      .match(req.query.domain ? { domain: req.query.domain } : {})
      .groupBy(resolution)
      .select(['time', 'domain', 'resolution', 'price'])

    res.send(result)
  } catch (error) {
    next(error)
  }
})

const insertPrices = async data => {
  const db = getDatabase()
  const stmt = await db.prepare(
    `INSERT INTO ${DB_PRICE_TABLE} (domain, resolution, time, price) VALUES (?, ?, ?, ?)`,
  )

  try {
    for (const item of data) {
      await stmt.run(
        item.domain,
        item.resolution,
        new Date(item.time).getTime(),
        item.price,
      )
    }

    pricesData.insert(data)
  } catch (error) {
    console.error(data, error)
  } finally {
    await stmt.finalize()
  }
}

export default router
