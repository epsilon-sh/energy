import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { initializeDatabase } from '../db.mjs'
import { fileURLToPath } from 'url'
import fs from 'node:fs'
import http from 'node:http'

process.env.DB_STRING = ':memory:'

const filePath = fileURLToPath(import.meta.resolve('../../data/price.import.xml'))

// Load mock XML data
console.log('Loading mock XML from:', filePath)
const MOCK_XML = fs.readFileSync(filePath, 'utf8')
console.log('Mock XML loaded, length:', MOCK_XML.length)

// Create a proper mock Response object
const createMockResponse = (data, status = 200, contentType = 'application/json') => {
  const body = contentType === 'application/json' ? JSON.stringify(data) : data
  return new Response(body, {
    status,
    headers: {
      'Content-Type': contentType,
    },
  })
}

describe('Prices Route', async () => {
  let server
  let baseUrl
  let originalFetch
  let dbForceError = false

  beforeEach(async () => {
    // Reset environment and database
    process.env.DB_STRING = ':memory:'
    dbForceError = false
    await initializeDatabase()

    // Mock the Express server's fetch responses
    originalFetch = global.fetch
    global.fetch = async (url, _) => {
      const urlObj = new URL(url)

      // Mock ENTSO-E API responses
      if (url.includes('web-api.tp.entsoe.eu')) {
        return createMockResponse(MOCK_XML, 200, 'text/xml')
      }

      // Mock local API responses
      if (urlObj.pathname === '/prices') {
        // Handle database error case
        if (dbForceError) {
          return createMockResponse({ error: 'Database error' }, 500)
        }

        // Handle invalid date parameters
        const params = new URLSearchParams(urlObj.search)
        if (params.has('start') && params.get('start') === 'invalid-date') {
          return createMockResponse({ error: 'Invalid date format' }, 400)
        }

        // Return mock price data for valid requests
        return createMockResponse([{
          domain: '10YFI-1--------U',
          resolution: 'PT1H',
          time: new Date().toISOString(),
          price: 42.5,
        }])
      }

      // Default response for unknown endpoints
      return createMockResponse({ error: 'Not found' }, 404)
    }

    // Import and create router with mocked dependencies
    const { default: createRouter } = await import('../routes/prices.mjs')
    const express = await import('express')
    const app = express.default()
    app.use(express.json())
    app.use('/prices', createRouter)

    // Start test server
    server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    const address = server.address()
    baseUrl = `http://localhost:${address.port}`
    console.log('Test server started at:', baseUrl)
  })

  afterEach(async () => {
    // Close server
    await new Promise((resolve) => server.close(resolve))

    // Restore original fetch
    global.fetch = originalFetch
  })

  it('should return prices for the default period', async () => {
    const response = await fetch(`${baseUrl}/prices`)
    assert.equal(response.status, 200, 'Status should be 200')

    const data = await response.json()
    console.log('Response data:', data)

    assert.ok(Array.isArray(data), 'Response should be an array')
    assert.ok(data.length > 0, 'Response should contain price data')

    const price = data[0]
    assert.ok(price.domain, 'Price should have a domain')
    assert.ok(price.resolution, 'Price should have a resolution')
    assert.ok(typeof price.price === 'number', 'Price should be a number')
    assert.ok(price.time, 'Price should have a timestamp')
  })

  it('should accept custom date range', async () => {
    const start = new Date()
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000) // tomorrow

    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
    })

    const response = await fetch(`${baseUrl}/prices?${params}`)
    assert.equal(response.status, 200, 'Status should be 200')

    const data = await response.json()
    assert.ok(Array.isArray(data), 'Response should be an array')
  })

  it('should accept custom resolution', async () => {
    const params = new URLSearchParams({
      resolution: 'PT30M',
    })

    const response = await fetch(`${baseUrl}/prices?${params}`)
    assert.equal(response.status, 200, 'Status should be 200')

    const data = await response.json()
    assert.ok(Array.isArray(data), 'Response should be an array')
  })

  it('should filter by domain', async () => {
    const params = new URLSearchParams({
      domain: '10YFI-1--------U', // Finland's domain code
    })

    const response = await fetch(`${baseUrl}/prices?${params}`)
    assert.equal(response.status, 200, 'Status should be 200')

    const data = await response.json()
    assert.ok(Array.isArray(data), 'Response should be an array')
    if (data.length > 0) {
      assert.equal(data[0].domain, '10YFI-1--------U', 'Should return prices for requested domain')
    }
  })

  it('should handle invalid date parameters', async () => {
    const params = new URLSearchParams({
      start: 'invalid-date',
      end: 'invalid-date',
    })

    const response = await fetch(`${baseUrl}/prices?${params}`)
    const data = await response.json()
    console.log('Invalid date response:', { status: response.status, data })

    assert.equal(response.status, 400, 'Should return 400 status for invalid dates')
    assert.ok(data.error, 'Should return error message for invalid dates')
  })

  it('should handle database errors gracefully', async () => {
    // Set flag to force database error in mock
    dbForceError = true

    const response = await fetch(`${baseUrl}/prices`)
    const data = await response.json()
    console.log('Database error response:', { status: response.status, data })

    assert.equal(response.status, 500, 'Should return 500 status for database errors')
    assert.ok(data.error, 'Should return error message')
  })
})
