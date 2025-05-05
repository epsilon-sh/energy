import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { initializeDatabase, getDatabase, resetDatabase } from '../db.mjs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import fs from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEST_DB = resolve(__dirname, '../test.db')

describe('Database Module', async () => {
  beforeEach(async () => {
    process.env.DB_STRING = TEST_DB
    await initializeDatabase()
  })

  afterEach(() => {
    // Clean up test database
    try {
      fs.unlinkSync(TEST_DB)
    } catch (err) {
      // Ignore if file doesn't exist
    }
  })

  it('should initialize database with required tables', async () => {
    const db = getDatabase()

    // Check prices table
    const pricesTable = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='prices'")
    assert.ok(pricesTable, 'Prices table should exist')

    // Check measurements table
    const measurementsTable = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='measurements'")
    assert.ok(measurementsTable, 'Measurements table should exist')

    // Check waitlist table
    const waitlistTable = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='waitlist'")
    assert.ok(waitlistTable, 'Waitlist table should exist')
  })

  it('should perform basic CRUD operations', async () => {
    const db = getDatabase()

    // Test INSERT
    await db.run('INSERT INTO prices (domain, resolution, time, price) VALUES (?, ?, ?, ?)',
      'test-domain', 'PT1H', Date.now(), 42.5)

    // Test SELECT
    const row = await db.get('SELECT * FROM prices WHERE domain = ?', 'test-domain')
    assert.equal(row.domain, 'test-domain')
    assert.equal(row.price, 42.5)

    // Test UPDATE
    await db.run('UPDATE prices SET price = ? WHERE domain = ?', 43.5, 'test-domain')
    const updated = await db.get('SELECT price FROM prices WHERE domain = ?', 'test-domain')
    assert.equal(updated.price, 43.5)

    // Test DELETE
    await db.run('DELETE FROM prices WHERE domain = ?', 'test-domain')
    const deleted = await db.get('SELECT * FROM prices WHERE domain = ?', 'test-domain')
    assert.equal(deleted, undefined)
  })

  it('should support prepared statements', async () => {
    const db = getDatabase()
    const stmt = await db.prepare('INSERT INTO prices (domain, resolution, time, price) VALUES (?, ?, ?, ?)')

    // Test multiple inserts with the same prepared statement
    await stmt.run('domain1', 'PT1H', Date.now(), 10.5)
    await stmt.run('domain2', 'PT1H', Date.now(), 20.5)

    const rows = await db.all('SELECT * FROM prices ORDER BY price')
    assert.equal(rows.length, 2)
    assert.equal(rows[0].price, 10.5)
    assert.equal(rows[1].price, 20.5)
  })

  it('should retrieve multiple rows with db.all', async () => {
    const db = getDatabase()
    const now = Date.now()

    // Insert multiple rows
    await db.run('INSERT INTO prices (domain, resolution, time, price) VALUES (?, ?, ?, ?)',
      'domain1', 'PT1H', now, 10.5)
    await db.run('INSERT INTO prices (domain, resolution, time, price) VALUES (?, ?, ?, ?)',
      'domain2', 'PT1H', now, 20.5)
    await db.run('INSERT INTO prices (domain, resolution, time, price) VALUES (?, ?, ?, ?)',
      'domain3', 'PT1H', now, 30.5)

    const rows = await db.all('SELECT * FROM prices ORDER BY price')
    assert.equal(rows.length, 3)
    assert.deepEqual(rows.map(row => row.price), [10.5, 20.5, 30.5])
  })

  it('should handle transactions correctly', async () => {
    const db = getDatabase()

    // Start transaction
    await db.run('BEGIN TRANSACTION')

    try {
      await db.run('INSERT INTO prices (domain, resolution, time, price) VALUES (?, ?, ?, ?)',
        'test1', 'PT1H', Date.now(), 10.5)
      await db.run('INSERT INTO prices (domain, resolution, time, price) VALUES (?, ?, ?, ?)',
        'test2', 'PT1H', Date.now(), 20.5)
      await db.run('COMMIT')
    } catch (err) {
      await db.run('ROLLBACK')
      throw err
    }

    const rows = await db.all('SELECT * FROM prices ORDER BY price')
    assert.equal(rows.length, 2)
  })

  it('should handle errors gracefully', async () => {
    const db = getDatabase()

    // Test invalid SQL
    await assert.rejects(
      async () => {
        await db.run('INVALID SQL')
      },
      /syntax error/i,
    )

    // Test constraint violation
    await assert.rejects(
      async () => {
        await db.run('INSERT INTO waitlist (email) VALUES (?)', null)
      },
      /NOT NULL constraint failed/i,
    )

    // Test prepared statement with wrong parameter count
    const stmt = await db.prepare('INSERT INTO prices (domain, resolution, time, price) VALUES (?, ?, ?, ?)')
    await assert.rejects(
      async () => {
        await stmt.run('test-domain', 'PT1H', Date.now()) // Missing price parameter
      },
      /Too few parameter values were provided/i,
    )
  })

  it('should fail when database is not initialized', async () => {
    // Remove the database file
    try {
      fs.unlinkSync(TEST_DB)
    } catch (err) {
      // Ignore if file doesn't exist
    }

    // Reset database state
    resetDatabase()

    assert.throws(
      () => getDatabase(),
      /Database not initialized/i,
    )
  })
})
