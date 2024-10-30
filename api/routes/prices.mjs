import express from 'express'
import { getDatabase } from '../db.mjs'
import fetchPrices from '../../entso/query.mjs'
import { formatDate } from '../../entso/utils.mjs'
import { parse as parseDuration, toSeconds } from 'iso8601-duration'
import data from '../../entso/priceData.mjs'

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

      await insertPrices(fetchedData)
      dbData = fetchedData
    }

    // Convert to PriceData format
    data.length = 0 // Clear existing data
    data.push(...dbData.map(item => ({
      ...item,
      time: new Date(item.time).toISOString(),
    })))

    const result = data
      .from(start)
      .to(end)
      .match(req.query.domain ? { domain: req.query.domain } : {})
      .groupBy(resolution)
      .sort((a, b) => new Date(a.time) - new Date(b.time))
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

  for (const item of data) {
    await stmt.run(
      item.domain,
      item.resolution,
      new Date(item.time).getTime(),
      item.price,
    )
  }

  await stmt.finalize()
}

export default router
