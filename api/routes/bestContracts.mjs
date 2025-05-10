import express from 'express'
import fetchBestContracts from '../../ev/query.mjs'

const router = express.Router()

router.get('/', async (req, res, next) => {
  try {
    const postalCode = req.query.postalCode;

    const bestContracts = await fetchBestContracts(postalCode)
    res.json(bestContracts)
  } catch (error) {
    next(error)
  }
})

export default router
