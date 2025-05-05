import express from 'express'
import multer from 'multer'
import { getDatabase } from '../db.mjs'
import data from '../../fingrid/consumptionData.mjs'
import fs from 'fs/promises'
import parseDsv from '../../fingrid/parseImport.mjs'
import { parse as parseDuration, toSeconds } from 'iso8601-duration'

const router = express.Router()
const DB_CONSUMPTION_TABLE = process.env.DB_CONSUMPTION_TABLE || 'measurements'
const upload = multer({
  dest: 'uploads/',
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'text/csv') {
      cb(new Error('Only CSV files are allowed'))
      return
    }
    cb(null, true)
  },
})

router.get('/', async (req, res, next) => {
  try {
    const start = new Date(req.query.start || '2023/01/01 00:00 UTC+2')
    const period = req.query.period || 'P1Y'
    const periodSeconds = toSeconds(parseDuration(period))
    const end = new Date(req.query.end || new Date(start.getTime() + periodSeconds * 1000))
    const resolution = req.query.resolution || 'PT1H'
    const meteringPoint = req.query.MeteringPointGSRN ||
      req.query.meteringPoint ||
      req.query.meteringPointGSRN ||
      'TEST_METERINGPOINT'

    console.log('Query params:', { start, end, resolution, meteringPoint })

    const db = getDatabase()
    const query = `SELECT * FROM ${DB_CONSUMPTION_TABLE}
      WHERE "Start Time" >= ?
        AND "Start Time" <= ?
        AND "MeteringPointGSRN" = ?`
    const params = [start.toISOString(), end.toISOString(), meteringPoint]

    console.log({
      query,
      params,
    }, 'for DB')

    const dbData = await db.all(query, ...params)
    const format = x => ({
      meteringPoint: x.MeteringPointGSRN,
      productType: x['Product Type'],
      readingType: x['Reading Type'],
      resolution: x.Resolution,
      startTime: new Date(x['Start Time']),
      quantity: x.Quantity,
      quality: x.Quality,
    })

    console.log(`${dbData.length} found in db`)
    if (dbData.length)
      data.insert(...dbData.map(format))

    const result = data
      .from(start)
      .to(end)
      .match({ meteringPoint })
      .groupBy(resolution)

    console.log(result.length, 'items to return')

    res.send(result)
    console.log(`${result.length} sent`)
  } catch (error) {
    next(error)
  }
})

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'No file uploaded' })

    // Read the uploaded file
    const fileContent = await fs.readFile(req.file.path, 'utf-8')

    // Parse the CSV content
    const measurements = parseDsv(fileContent)

    // Find common labels
    const commonLabels = {}

    // Initialize with first measurement's values
    if (measurements.length > 0) {
      Object.entries(measurements[0]).forEach(([key, value]) => {
        commonLabels[key] = value
      })
    }

    // Compare with all other measurements
    for (const measurement of measurements) {
      Object.entries(commonLabels).forEach(([key, value]) => {
        if (measurement[key] !== value)
          delete commonLabels[key]
      })
    }

    // Get database connection
    const db = getDatabase()

    // Insert measurements into database using Promise-based API
    const stmt = await db.prepare(
      `INSERT INTO measurements (
        "MeteringPointGSRN",
        "Product Type",
        "Resolution",
        "Unit Type",
        "Reading Type",
        "Start Time",
        "Quantity",
        "Quality"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )

    // Insert measurements one by one (we could optimize this later if needed)
    for (const measurement of measurements) {
      await stmt.run(
        measurement.MeteringPointGSRN,
        measurement['Product Type'],
        measurement.Resolution,
        measurement['Unit Type'],
        measurement['Reading Type'],
        measurement['Start Time'],
        measurement.Quantity,
        measurement.Quality,
      )
    }

    // Clean up uploaded file
    await fs.unlink(req.file.path)

    res.status(200).json({
      message: 'File uploaded and processed successfully',
      count: measurements.length,
      info: commonLabels,
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to process file',
    })
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
