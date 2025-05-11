import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { initializeDatabase, getDatabase } from '../db.mjs'
import http from 'node:http'
import Database from 'better-sqlite3'

process.env.DB_STRING = ':memory:'
process.env.DB_CONSUMPTION_TABLE = 'consumption'

describe('Consumption Route', async () => {
  let server
  let baseUrl
  let originalFetch
  let dbForceError = false
  let db

  // Sample test data
  const TEST_METERING_POINT = 'MP123'
  const TEST_DATA = [
    {
      meteringPoint: TEST_METERING_POINT,
      timestamp: '2024-01-01T00:00:00.000Z',
      value: 125.5,
      unit: 'kWh'
    },
    {
      meteringPoint: TEST_METERING_POINT,
      timestamp: '2024-01-01T01:00:00.000Z',
      value: 130.2,
      unit: 'kWh'
    },
    {
      meteringPoint: 'MP456',
      timestamp: '2024-01-01T00:00:00.000Z',
      value: 95.0,
      unit: 'kWh'
    }
  ]

  const createMockResponse = (data, status = 200, contentType = 'application/json') => {
    const body = contentType === 'application/json' ? JSON.stringify(data) : data
    return new Response(body, {
      status,
      headers: {
        'Content-Type': contentType,
      },
    })
  }

  beforeEach(async () => {
    // Reset environment and database
    process.env.DB_STRING = ':memory:'
    dbForceError = false

    // Initialize database
    await initializeDatabase()
    db = getDatabase()

    // Create consumption table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS ${process.env.DB_CONSUMPTION_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metering_point_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        UNIQUE(metering_point_id, timestamp)
      )
    `).run()

    // Insert test data
    const stmt = db.prepare(
      `INSERT INTO ${process.env.DB_CONSUMPTION_TABLE} (metering_point_id, timestamp, value, unit)
       VALUES (?, ?, ?, ?)`
    )

    // Insert test data using transaction
    const insert = db.transaction((items) => {
      for (const item of items) {
        stmt.run(
          item.meteringPoint,
          new Date(item.timestamp).getTime(),
          item.value,
          item.unit
        )
      }
    })

    try {
      insert(TEST_DATA)
    } catch (error) {
      console.error('Error inserting test data:', error)
    }

    // Mock fetch responses
    originalFetch = global.fetch
    global.fetch = async (url, _) => {
      const urlObj = new URL(url)

      if (urlObj.pathname === '/consumption') {
        if (dbForceError)
          return createMockResponse({ error: 'Database error' }, 500)

        // Handle invalid date parameters
        const params = new URLSearchParams(urlObj.search)
        if (params.has('start') && params.get('start') === 'invalid-date')
          return createMockResponse({ error: 'Invalid date format' }, 400)

        return createMockResponse(TEST_DATA)
      }
      return createMockResponse({ error: 'Not found' }, 404)
    }

    // Setup test server
    const { default: createRouter } = await import('../routes/consumption.mjs')
    const express = await import('express')
    const app = express.default()
    app.use(express.json())
    app.use('/consumption', createRouter)

    server = http.createServer(app)
    await new Promise(resolve => server.listen(0, resolve))
    const address = server.address()
    baseUrl = `http://localhost:${address.port}`
    console.log('Test server started at:', baseUrl)
  })

  afterEach(async () => {
    await new Promise(resolve => server.close(resolve))
    global.fetch = originalFetch
    if (db) {
      db.prepare(`DROP TABLE IF EXISTS ${process.env.DB_CONSUMPTION_TABLE}`).run()
    }
  })

  it('should return consumption data for default period', async () => {
    const response = await fetch(`${baseUrl}/consumption`)
    assert.equal(response.status, 200, 'Status should be 200')

    const data = await response.json()
    console.log('Response data:', data)

    assert.ok(Array.isArray(data), 'Response should be an array')
    assert.ok(data.length > 0, 'Response should contain consumption data')

    const item = data[0]
    assert.ok(item.meteringPoint, 'Item should have a metering point')
    assert.ok(item.timestamp, 'Item should have a timestamp')
    assert.ok(typeof item.value === 'number', 'Value should be a number')
    assert.ok(item.unit, 'Item should have a unit')
  })

  it('should filter by metering point', async () => {
    const response = await fetch(`${baseUrl}/consumption?meteringPoint=${TEST_METERING_POINT}`)
    assert.equal(response.status, 200, 'Status should be 200')

    const data = await response.json()
    assert.ok(Array.isArray(data), 'Response should be an array')
    data.forEach(item => {
      assert.equal(item.meteringPoint, TEST_METERING_POINT, 'Should only return data for requested metering point')
    })
  })

  it('should accept custom date range', async () => {
    const start = '2024-01-01T00:00:00.000Z'
    const end = '2024-01-01T23:59:59.999Z'

    const params = new URLSearchParams({
      start,
      end,
    })

    const response = await fetch(`${baseUrl}/consumption?${params}`)
    assert.equal(response.status, 200, 'Status should be 200')

    const data = await response.json()
    assert.ok(Array.isArray(data), 'Response should be an array')
    data.forEach(item => {
      const timestamp = new Date(item.timestamp)
      assert.ok(timestamp >= new Date(start), 'Timestamp should be after start date')
      assert.ok(timestamp <= new Date(end), 'Timestamp should be before end date')
    })
  })

  it('should handle invalid date parameters', async () => {
    const params = new URLSearchParams({
      start: 'invalid-date',
      end: 'invalid-date',
    })

    const response = await fetch(`${baseUrl}/consumption?${params}`)
    const data = await response.json()
    console.log('Invalid date response:', { status: response.status, data })

    assert.equal(response.status, 400, 'Should return 400 status for invalid dates')
    assert.ok(data.error, 'Should return error message for invalid dates')
  })

  it('should handle database errors gracefully', async () => {
    dbForceError = true

    const response = await fetch(`${baseUrl}/consumption`)
    const data = await response.json()
    console.log('Database error response:', { status: response.status, data })

    assert.equal(response.status, 500, 'Should return 500 status for database errors')
    assert.ok(data.error, 'Should return error message')
  })

  it('should return empty array for non-existent metering point', async () => {
    const response = await fetch(`${baseUrl}/consumption?meteringPoint=NONEXISTENT`)
    assert.equal(response.status, 200, 'Status should be 200')

    const data = await response.json()
    assert.ok(Array.isArray(data), 'Response should be an array')
    assert.equal(data.length, 0, 'Array should be empty for non-existent metering point')
  })

  it('should aggregate consumption data by day', async () => {
    const params = new URLSearchParams({
      meteringPoint: TEST_METERING_POINT,
      aggregate: 'day'
    })

    const response = await fetch(`${baseUrl}/consumption?${params}`)
    assert.equal(response.status, 200, 'Status should be 200')

    const data = await response.json()
    assert.ok(Array.isArray(data), 'Response should be an array')

    if (data.length > 0) {
      const item = data[0]
      assert.ok(item.meteringPoint, 'Aggregated item should have a metering point')
      assert.ok(item.timestamp, 'Aggregated item should have a timestamp')
      assert.ok(typeof item.value === 'number', 'Aggregated value should be a number')
      assert.ok(item.unit, 'Aggregated item should have a unit')
    }
  })

  it('should validate unit parameter', async () => {
    const params = new URLSearchParams({
      unit: 'invalid-unit'
    })

    const response = await fetch(`${baseUrl}/consumption?${params}`)
    const data = await response.json()
    console.log('Invalid unit response:', { status: response.status, data })

    assert.equal(response.status, 400, 'Should return 400 status for invalid unit')
    assert.ok(data.error, 'Should return error message for invalid unit')
  })
})
