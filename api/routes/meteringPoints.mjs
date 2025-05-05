import express from 'express'
import { getDatabase } from '../db.mjs'
import data from '../../fingrid/consumptionData.mjs'

const router = express.Router()
const DB_CONSUMPTION_TABLE = process.env.DB_CONSUMPTION_TABLE || 'measurements'

router.get('/', async (_req, res, next) => {
  try {
    // Get points from memory, convert to lowercase
    const memPoints = new Set(data.map(d => d.meteringPoint?.toLowerCase()).filter(Boolean))

    // Get points from DB, convert to lowercase
    const db = getDatabase()
    // Use LOWER() for case-insensitive distinct selection in SQL
    const points = db.prepare(
      `SELECT DISTINCT LOWER("MeteringPointGSRN") as meteringPoint FROM ${DB_CONSUMPTION_TABLE}`,
    ).all()
    const dbPoints = new Set(points.map(p => p.meteringPoint))

    // Merge and sort (case-insensitively)
    const uniquePoints = Array.from(new Set([...memPoints, ...dbPoints])).sort()

    res.send(uniquePoints)
  } catch (error) {
    next(error)
  }
})

export default router 