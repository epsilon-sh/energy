import express from 'express'
import fetchBestContracts from '../../ev/query.mjs'

const router = express.Router()

router.get('/', async (req, res, next) => {
  try {
    const postalCode = parseInt(req.query.postalCode)
    if (!postalCode) {
      return res.status(400).json({ error: 'Postal code is required' })
    }
    const bestContracts = await fetchBestContracts(postalCode)
    res.json(bestContracts)
  } catch (error) {
    next(error)
  }
})

export default router
