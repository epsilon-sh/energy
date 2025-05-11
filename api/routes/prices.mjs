import express from 'express'
import { getDatabase } from '../db.mjs'
import fetchPrices from '../../entso/query.mjs'
import { transformPrices as extractPrices } from '../../entso/transform.mjs'
import { formatDate } from '../../entso/utils.mjs'
import { parse as parseDuration, toSeconds } from 'iso8601-duration'
import { add, intervalToDuration, min, endOfDay } from 'date-fns'
import pricesData from '../../entso/priceData.mjs'
import { getDefaultRange } from '../utils/dateDefaults.mjs'

const router = express.Router()
const DB_PRICE_TABLE = process.env.DB_PRICE_TABLE || 'prices'

router.get('/', async (req, res, next) => {
  try {
    const { start: defaultStart, end: defaultEndFromRange } = getDefaultRange()
    // Cap for user-specified end or period should be end of next day
    const capAtEndOfNextDay = endOfDay(add(new Date(), { days: 1 }))

    const start = new Date(req.query.start || defaultStart)

    const duration = req.query.end
      ? intervalToDuration({ start, end: new Date(req.query.end) })
      : parseDuration(req.query.period || 'P7D') // Default period if no end or period

    const requestedEnd = req.query.end ? new Date(req.query.end) : null

    const end = requestedEnd
      ? min([requestedEnd, capAtEndOfNextDay]) // Cap with end of next day
      : req.query.period
        ? min([add(start, duration), capAtEndOfNextDay]) // Cap with end of next day
        : defaultEndFromRange // Default to end of today if neither end nor period is given

    const resolution = req.query.resolution || 'PT1H'

    const padToRes = (interval, resolution) => {
      console.log({ interval, resolution }, 'pad')
      const { start, end } = interval
      const delta = toSeconds(parseDuration(resolution)) * 1000
      const startPadded = start.getTime() - (start.getTime() % delta)
      const endPadded = end.getTime() - (end.getTime() % delta) + delta

      return { ...interval, start: new Date(startPadded), end: new Date(endPadded) }
    }
    // console.log({ start, end, resolution }, 'requested')
    const padded = padToRes({ start, end }, resolution)

    const db = getDatabase()
    const dbData = db.prepare(
      `SELECT * FROM ${DB_PRICE_TABLE} WHERE time >= ? AND time <= ?`,
    ).all(
      padded.start.getTime(),
      padded.end.getTime(),
    )

    const resolutionDuration = parseDuration(resolution)
    const resolutionSeconds = toSeconds(resolutionDuration)
    const intervalSeconds = toSeconds(intervalToDuration(padded))
    const expectedCount = Math.floor(intervalSeconds / resolutionSeconds)

    // console.log({ resolution, resolutionSeconds, intervalSeconds, expectedCount })

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
        insertPrices(extracted)
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
  const stmt = db.prepare(
    `REPLACE INTO ${DB_PRICE_TABLE} (domain, resolution, time, price) VALUES (?, ?, ?, ?)`,
  )

  try {
    const insert = db.transaction(items => {
      for (const item of items) {
        stmt.run(
          item.domain,
          item.resolution,
          new Date(item.time).getTime(),
          item.price,
        )
      }
    })

    insert(data)

    pricesData.insert(...data)
  } catch (error) {
    console.error(data, error)
  }
}

export default router
