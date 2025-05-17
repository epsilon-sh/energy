import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

describe('Contracts Route', async () => {
  let server
  let baseUrl

  beforeEach(async () => {
    const { default: createRouter } = await import('../routes/contracts.mjs')
    const express = await import('express')
    const app = express.default()
    app.use(express.json())
    app.use('/contracts', createRouter)

    server = http.createServer(app)
    await new Promise(resolve => server.listen(0, resolve))
    const address = server.address()
    baseUrl = `http://localhost:${address.port}`
  })

  afterEach(async () => {
    await new Promise(resolve => server.close(resolve))
  })

  describe('GET /contracts/best', () => {
    it('should return best products with default parameters', async () => {
      const response = await fetch(`${baseUrl}/contracts/best`)
      assert.equal(response.status, 200)

      const result = await response.json()
      assert.ok(result.data, 'Response should have data property')
      assert.ok(typeof result.data === 'object', 'Data property should be an object')
      assert.ok(result.data.Spot || result.data.FixedPrice, 'Should have at least one pricing model')
      assert.ok(result.meta, 'Response should have meta property')
      assert.equal(result.meta.consumption, '5000', 'Default consumption should be 5000')
    })

    it('should filter by target group', async () => {
      const targetGroup = 'Company'
      const response = await fetch(`${baseUrl}/contracts/best?targetGroup=${targetGroup}`)
      assert.equal(response.status, 200)

      const result = await response.json()
      assert.ok(result.data, 'Response should have data property')
      assert.ok(typeof result.data === 'object', 'Data property should be an object')

      Object.values(result.data).forEach(product => {
        assert.ok(
          product.TargetGroup === targetGroup || product.TargetGroup === 'Both',
          'Products should match target group or be available for both'
        )
      })
      assert.equal(result.meta.targetGroup, targetGroup)
    })

    it('should filter by pricing model', async () => {
      const pricingModel = 'FixedPrice'
      const response = await fetch(`${baseUrl}/contracts/best?pricingModel=${pricingModel}`)
      assert.equal(response.status, 200)

      const result = await response.json()
      assert.ok(result.data, 'Response should have data property')
      assert.ok(typeof result.data === 'object', 'Data property should be an object')
      assert.ok(result.data[pricingModel], 'Should have requested pricing model')
      assert.equal(Object.keys(result.data).length, 1, 'Should only return requested pricing model')
      assert.equal(result.meta.pricingModel, pricingModel)
    })

    it('should validate postal code', async () => {
      // Test invalid postal code
      const invalidResponse = await fetch(`${baseUrl}/contracts/best?postalCode=001`)
      assert.equal(invalidResponse.status, 400, 'Should reject invalid postal code format')
      const invalidData = await invalidResponse.json()
      assert.ok(invalidData.error, 'Should return error message for invalid format')

      // Test valid postal code
      const validResponse = await fetch(`${baseUrl}/contracts/best?postalCode=00100`)
      assert.equal(validResponse.status, 200, 'Should accept valid postal code')
      const validResult = await validResponse.json()
      assert.ok(validResult.data, 'Response should have data property')
    })

    it('should validate consumption parameter', async () => {
      const validResponse = await fetch(`${baseUrl}/contracts/best?consumption=3000`)
      assert.equal(validResponse.status, 200)
      const result = await validResponse.json()
      assert.equal(result.meta.consumption, '3000')

      const invalidResponse = await fetch(`${baseUrl}/contracts/best?consumption=invalid`)
      assert.equal(invalidResponse.status, 400)
      const invalidData = await invalidResponse.json()
      assert.ok(invalidData.error)
    })

    it('should reject invalid target group', async () => {
      const response = await fetch(`${baseUrl}/contracts/best?targetGroup=Invalid`)
      assert.equal(response.status, 400)
      const data = await response.json()
      assert.ok(data.error)
    })

    it('should reject invalid pricing model', async () => {
      const response = await fetch(`${baseUrl}/contracts/best?pricingModel=Invalid`)
      assert.equal(response.status, 400)
      const data = await response.json()
      assert.ok(data.error)
    })
  })
})
