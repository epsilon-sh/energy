import express from 'express'
import { getBestProducts } from '../../data/productlist.mjs'

import postalCodes from '../../data/postalCodes.mjs'

const router = express.Router()

const PRICING_MODELS = ['FixedPrice', 'Spot'] // exclude time-of-use
const TARGET_GROUPS = ['Both', 'Company', 'Household']

import { z } from 'zod'
const parameters = {
  targetGroup: z.enum(TARGET_GROUPS).optional(),
  pricingModel: z.enum(PRICING_MODELS).optional(),
  postalCode: z.string().length(5).refine(x => postalCodes.includes(x)).optional(),
  consumption: z.string().refine(v => {
    const n = Number(v)
    return !isNaN(n) && v?.length > 0
  }, { message: "Invalid number" }).optional().default('5000'),
}

router.get('/best', async (req, res) => {
  try {
    const filters = z.object(parameters).parse(req.query)

    const result = await getBestProducts(filters)

    res.header('Content-Type', 'application/json')
    res.send(JSON.stringify({
      meta: filters,
      data: result
    }, null, 2))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message })
    }
  }
})

export default router
