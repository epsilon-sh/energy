import express from 'express'
import data from '../../fingrid/data.mjs'
import fs from 'fs/promises'
import parseDsv from '../../fingrid/parseImport.mjs'
import { parse as parseDuration, toSeconds } from 'iso8601-duration'

const router = express.Router()

router.get('/', (req, res, next) => {
  try {
    const start = new Date(req.query.start || '2023/01/01 00:00 UTC+2')
    const period = req.query.period || 'P1Y'
    const resolution = req.query.resolution || 'PT1H'

    // Calculate end time based on period
    const periodSeconds = toSeconds(parseDuration(period))
    const end = new Date(start.getTime() + periodSeconds * 1000)

    const result = data
      .from(start)
      .to(end)
      .match(req.query.filter || {})
      .groupBy(resolution)
      .sort((a, b) => a.startTime - b.startTime)
      .select(['startTime', 'resolution', 'quantity'])

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
