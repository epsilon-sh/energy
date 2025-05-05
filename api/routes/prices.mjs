import { add, endOfDay, intervalToDuration, startOfMonth } from 'date-fns'
import express from 'express'
import { parse as parseDuration, toSeconds } from 'iso8601-duration'
import pricesData from '../../entso/priceData.mjs'
import fetchPrices from '../../entso/query.mjs'
import { transformPrices as extractPrices } from '../../entso/transform.mjs'
import { formatDate } from '../../entso/utils.mjs'
import { getDatabase } from '../db.mjs'

const router = express.Router()
const DB_PRICE_TABLE = process.env.DB_PRICE_TABLE || 'prices'

router.get('/', async (req, res, next) => {
  try {
    // Parse and validate dates
    const now = new Date()
    const defaultStart = startOfMonth(now)
    const defaultEnd = endOfDay(now)

    let end

    // Parse and validate start date
    const start = req.query.start ? new Date(req.query.start) : defaultStart
    if (isNaN(start.getTime()))
      return res.status(400).json({ error: 'Invalid start date' })

    // Handle end date options
    if (req.query.end) {
      end = new Date(req.query.end)
      if (isNaN(end.getTime()))
        return res.status(400).json({ error: 'Invalid end date' })
    } else if (req.query.period) {
      const duration = parseDuration(req.query.period)
      end = add(start, duration)
    } else
      end = defaultEnd

    // Allow future dates but return empty array if no data available
    if (start > defaultEnd)
      return res.json([])

    // Validate date range
    if (end < start)
      return res.status(400).json({ error: 'End date must be after start date' })

    const resolution = req.query.resolution || 'PT1H'

    const padToRes = (interval, resolution) => {
      console.log({ interval, resolution }, 'pad')
      const { start, end } = interval
      console.log(parseDuration(resolution))
      const delta = toSeconds(parseDuration(resolution)) * 1000
      const startPadded = start.getTime() - (start.getTime() % delta)
      const endPadded = end.getTime() - (end.getTime() % delta) + delta

      return { ...interval, start: new Date(startPadded), end: new Date(endPadded) }
    }
    console.log({ start, end, resolution }, 'requested')
    const padded = padToRes({ start, end }, resolution)

    const db = getDatabase()
    const query = `SELECT * FROM ${DB_PRICE_TABLE} WHERE time >= ? AND time <= ?`
    const dbData = await db.all(query, padded.start.getTime(), padded.end.getTime())

    const resolutionDuration = parseDuration(resolution)
    const resolutionSeconds = toSeconds(resolutionDuration)
    const intervalSeconds = toSeconds(intervalToDuration(padded))
    const expectedCount = Math.floor(intervalSeconds / resolutionSeconds)

    console.log({ resolution, resolutionSeconds, intervalSeconds, expectedCount })

    const missingBefore = {
      start: padded.start,
      end: new Date(dbData[0]?.time || padded.end),
    }
    const toFetch = []
    // Tolerance margin of 1 res for rounding? idk ¯\_(ツ)_/¯
    if (toSeconds(intervalToDuration(missingBefore)) > toSeconds(resolution)) {
      console.log('BEFORE:Should we fetch this?', missingBefore)
      toFetch.push(missingBefore)
    }
    console.log(`${dbData.length} in dbData`)

    if (dbData.length < expectedCount) {
      console.warn(`Missing DB data: ${expectedCount - dbData.length}`)

      if (dbData.length > 0) {
        const missingAfter = {
          start: new Date(dbData.at(-1)?.time),
          end: padded.end,
        }
        if (toSeconds(intervalToDuration(missingAfter)) > toSeconds(resolution)) {
          console.log('AFTER:Should we fetch this?', missingAfter)
          toFetch.push(missingAfter)
        }
      }
    }

    const pricesRequests = toFetch.map(interval => fetchPrices({
      periodStart: formatDate(interval.start),
      periodEnd: formatDate(interval.end),
    }))

    const incoming = await Promise.all(pricesRequests) // [Period{TimeSeries:[]}]
    if (incoming.length) {
      const extracted = incoming.flatMap(i => extractPrices(i))

      console.log(`${extracted.length} price points from ENTSO`)
      if (extracted)
        await insertPrices(extracted)
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
    console.error('Price route error:', error)
    if (error.message.includes('Database not initialized'))
      return res.status(500).json({ error: 'Database unavailable' })

    if (error.message.includes('No data provided') || error.message.includes('Invalid period data'))
      return res.status(500).json({ error: 'Failed to fetch price data' })

    next(error)
  }
})

const insertPrices = async data => {
  const db = getDatabase()
  const stmt = await db.prepare(
    `INSERT INTO ${DB_PRICE_TABLE} (domain, resolution, time, price) VALUES (?, ?, ?, ?)`,
  )

  try {
    // Insert each item individually since we're using the Promise API
    for (const item of data) {
      await stmt.run(
        item.domain,
        item.resolution,
        new Date(item.time).getTime(),
        item.price,
      )
    }

    pricesData.insert(...data)
  } catch (error) {
    console.error('Insert error:', error)
    console.error('Failed data:', data)
  }
}

export default router
