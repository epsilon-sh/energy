import express from 'express'
import fetchBestContracts from '../../energiavirasto/query.mjs'

import validCodes from '../../data/postalCodes.mjs'

const router = express.Router()

const getFilters = (query) => ({
  limitMaxKWhPerY: query.limitMaxKWhPerY || 'null',
  limitMinKWhPerY: query.limitMinKWhPerY || '0.0',
  pricingModel: query.pricingModel || 'Spot', // FixedPrice | Spot
  targetGroup: query.targetGroup || 'Household', // Company | Household | Both
})

router.get('/', async (req, res, next) => {
  if (!validCodes.includes(req.query.postalCode))
    return res.status(400).json({ error: 'Invalid postal code' })

  try {
    const postalCode = req.query.postalCode
    const filters = getFilters(req.query)

    const bestContracts = await fetchBestContracts(
      postalCode,
      filters,
    )
    res.json(bestContracts)
  } catch (error) {
    next(error)
  }
})

export default router
