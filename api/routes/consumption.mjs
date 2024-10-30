import express from 'express'
import { getDatabase } from '../db.mjs'
import data from '../../fingrid/consumptionData.mjs'
import fs from 'fs/promises'
import parseDsv from '../../fingrid/parseImport.mjs'
import { parse as parseDuration, toSeconds } from 'iso8601-duration'

const router = express.Router()
const DB_CONSUMPTION_TABLE = process.env.DB_CONSUMPTION_TABLE || 'measurements'

router.get('/', async (req, res, next) => {
  try {
    const start = new Date(req.query.start || '2023/01/01 00:00 UTC+2')
    const period = req.query.period || 'P1Y'
    const periodSeconds = toSeconds(parseDuration(period))
    const end = new Date(req.query.end || (start.getTime() + periodSeconds * 1000))
    const resolution = req.query.resolution || 'PT1H'

    const db = getDatabase()
    const dbData = await db.all(
      `SELECT * FROM ${DB_CONSUMPTION_TABLE} WHERE "Start Time" >= ? AND "Start Time" <= ?`,
      start.getTime(),
      end.getTime(),
    )

    const result = data
      .from(start)
      .to(end)
      .match(req.query.filter || {})
      .groupBy(resolution)

    console.log(result[0], result.at(-1))

    res.send(result)
  } catch (error) {
    next(error)
  }
})

export default router

const source = '../data/fingrid.import.csv'
console.log(`Load ${source}`)
fs.readFile(source, 'utf-8')
  .then(content => { console.log(`Parse ${content.length} bytes`); return content })
  .then(parseDsv)
  .then(parsed => {
    data.push(...parsed)
    console.log(`Data size: ${data.length}`)
  })
  .catch(error => {
    console.error(error)
  })
