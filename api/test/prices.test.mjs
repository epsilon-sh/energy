import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert'
import { startServer, stopServer } from '../index.mjs'
import { getDatabase, closeDatabase } from '../db.mjs'
import { add, sub, formatISO } from 'date-fns'
import { initializeDatabase } from '../db.mjs'

const TEST_PORT = process.env.PORT || 8990
const BASE_URL = `http://localhost:${TEST_PORT}`
const DB_PRICE_TABLE = process.env.DB_PRICE_TABLE || 'test_prices'

describe('Prices API', () => {
  let server
  let db

  before(async () => {
    // Initialize DB for this suite
    await initializeDatabase()
    server = await startServer()
    db = getDatabase()
  })

  after(async () => {
    await stopServer()
    closeDatabase()
  })

  // Clear the table before each test to ensure isolation
  beforeEach(() => {
    try {
      db.prepare(`DELETE FROM ${DB_PRICE_TABLE}`).run()
    } catch (error) {
      // Ignore errors if the table doesn't exist yet (first run)
      if (!error.message.includes('no such table')) {
        throw error
      }
    }
  })

  const insertTestData = (data) => {
    const stmt = db.prepare(
      `INSERT INTO ${DB_PRICE_TABLE} (domain, resolution, time, price) VALUES (?, ?, ?, ?)`
    )
    const insert = db.transaction((items) => {
      for (const item of items) {
        // Ensure time is stored as milliseconds epoch
        const timeMs = typeof item.time === 'string' ? new Date(item.time).getTime() : item.time
        stmt.run(
          item.domain || 'FI',
          item.resolution || 'PT1H',
          timeMs,
          item.price
        )
      }
    })
    insert(data)
  }

  it('should return prices from the database within the requested range', async () => {
    const now = new Date()
    const startTime = sub(now, { hours: 2 })
    const endTime = sub(now, { hours: 1 })
    const testData = [
      { time: sub(now, { hours: 3 }).getTime(), price: 10.0 }, // Outside range (before)
      { time: startTime.getTime(), price: 20.0 },            // Inside range (start)
      { time: endTime.getTime(), price: 30.0 },              // Inside range (end)
      { time: add(now, { hours: 1 }).getTime(), price: 40.0 },  // Outside range (after)
    ]
    insertTestData(testData)

    const startQuery = formatISO(startTime)
    const endQuery = formatISO(endTime)

    const response = await fetch(`${BASE_URL}/prices?start=${startQuery}&end=${endQuery}`)
    assert.strictEqual(response.status, 200, 'Expected status code 200')

    const prices = await response.json()
    assert.ok(Array.isArray(prices), 'Expected response to be an array')
    // Since the default resolution is PT1H and we inserted data exactly on the hour,
    // we expect the two points within the start/end range.
    assert.strictEqual(prices.length, 2, 'Expected 2 price points in the response')

    // Verify timestamps (should be ISO strings)
    assert.strictEqual(new Date(prices[0].time).getTime(), startTime.getTime(), 'First price timestamp mismatch')
    assert.strictEqual(new Date(prices[1].time).getTime(), endTime.getTime(), 'Second price timestamp mismatch')

    // Verify prices
    assert.strictEqual(prices[0].price, 20.0, 'First price value mismatch')
    assert.strictEqual(prices[1].price, 30.0, 'Second price value mismatch')
  })

  it('should return prices using default period (PT1H) when only start is provided', async () => {
    const now = new Date()
    const startTime = sub(now, { hours: 5 }) // Query start time
    const testData = [
      { time: sub(startTime, { hours: 1 }).getTime(), price: 10.0 }, // Before
      { time: startTime.getTime(), price: 20.0 },            // The hour we expect
      { time: add(startTime, { hours: 1 }).getTime(), price: 30.0 },  // After
    ]
    insertTestData(testData)

    const startQuery = formatISO(startTime)
    const response = await fetch(`${BASE_URL}/prices?start=${startQuery}`) // No end or period
    assert.strictEqual(response.status, 200)

    const prices = await response.json()
    assert.ok(Array.isArray(prices))

    // Default period is PT1H. We expect only the data point matching the start time.
    assert.strictEqual(prices.length, 1, 'Expected 1 price point for the default 1-hour period')

    // Check the timestamp and price
    assert.strictEqual(new Date(prices[0].time).getTime(), startTime.getTime(), 'Timestamp should match start query time')
    assert.strictEqual(prices[0].price, 20.0, 'Price value mismatch')
  })

  it('should handle missing data by potentially triggering fetch (difficult to test without mock)', async () => {
    // This test primarily ensures the endpoint doesn't crash when the DB is empty
    // or has gaps relative to the requested period.
    const startQuery = formatISO(sub(new Date(), { days: 1 }))
    const endQuery = formatISO(new Date())

    const response = await fetch(`${BASE_URL}/prices?start=${startQuery}&end=${endQuery}`)
    assert.strictEqual(response.status, 200)
    const prices = await response.json()
    assert.ok(Array.isArray(prices))
    assert.strictEqual(prices.length, 0, 'Expected 0 prices when DB is empty for the range')
    // In a real scenario, this might trigger a fetch, but we can't easily assert that here.
  })

  // Add more tests:
  // - Test with specific resolution (e.g., PT30M) - requires adjusting expected results
  // - Test with domain filtering
  // - Test error handling for invalid date formats or parameters
}) 