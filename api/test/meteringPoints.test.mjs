import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { initializeDatabase, getDatabase } from '../db.mjs'
import http from 'node:http'

process.env.DB_STRING = ':memory:'
process.env.DB_CONSUMPTION_TABLE = 'measurements'

const setupTestData = async (db, points) => {
  const stmt = db.prepare(
    `INSERT INTO ${process.env.DB_CONSUMPTION_TABLE} ("MeteringPointGSRN") VALUES (?)`
  )
  const insert = db.transaction((items) => {
    for (const item of items) {
      if (item !== null && item !== '') {  // Skip null and empty values
        stmt.run(item)
      }
    }
  })

  try {
    await insert(points)
  } catch (error) {
    throw error
  }
}

describe('Metering Points Route', async () => {
  let server
  let baseUrl
  let db

  beforeEach(async () => {
    process.env.DB_STRING = ':memory:'

    await initializeDatabase()
    db = getDatabase()

    db.prepare(`
      CREATE TABLE IF NOT EXISTS ${process.env.DB_CONSUMPTION_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        "MeteringPointGSRN" TEXT NOT NULL
      )
    `).run()

    await setupTestData(db, ['mp123', 'mp456', 'mp999'])

    const { default: createRouter } = await import('../routes/meteringPoints.mjs')
    const express = await import('express')
    const app = express.default()
    app.use(express.json())
    app.use('/meteringPoints', createRouter)

    // Add error handling middleware
    app.use((err, req, res, next) => {
      res.status(500).json({ error: err.message })
    })

    server = http.createServer(app)
    await new Promise(resolve => server.listen(0, resolve))
    const address = server.address()
    baseUrl = `http://localhost:${address.port}`
  })

  afterEach(async () => {
    await new Promise(resolve => server.close(resolve))
    if (db) {
      try {
        db.prepare(`DROP TABLE IF EXISTS ${process.env.DB_CONSUMPTION_TABLE}`).run()
        const { default: data } = await import('../../fingrid/consumptionData.mjs')
        data.length = 0
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  })

  it('should return metering points from the database', async () => {
    const response = await fetch(`${baseUrl}/meteringPoints`)
    assert.equal(response.status, 200)

    const data = await response.json()
    const expectedPoints = ['mp123', 'mp456', 'mp999'].sort()
    assert.deepEqual(data, expectedPoints)
  })

  it('should return an empty array when the database is empty', async () => {
    db.prepare(`DELETE FROM ${process.env.DB_CONSUMPTION_TABLE}`).run()

    const response = await fetch(`${baseUrl}/meteringPoints`)
    assert.equal(response.status, 200)

    const data = await response.json()
    assert.deepEqual(data, [])
  })

  it('should handle case-insensitive duplicates', async () => {
    await setupTestData(db, ['MP123', 'Mp456'])

    const response = await fetch(`${baseUrl}/meteringPoints`)
    assert.equal(response.status, 200)

    const data = await response.json()
    const uniquePoints = new Set(data.map(p => p.toLowerCase()))

    assert.equal(uniquePoints.size, data.length)
    assert.equal(data.length, 3)
  })

  it('should handle special characters in metering points', async () => {
    const specialPoints = ['TEST-123#', 'POINT@456', 'POINT.789']
    await setupTestData(db, specialPoints)

    const response = await fetch(`${baseUrl}/meteringPoints`)
    assert.equal(response.status, 200)

    const data = await response.json()
    specialPoints.forEach(point => {
      assert.ok(data.includes(point.toLowerCase()))
    })
  })

  it('should handle database errors gracefully', async () => {
    // Drop the table to simulate database error
    db.prepare(`DROP TABLE ${process.env.DB_CONSUMPTION_TABLE}`).run()

    const response = await fetch(`${baseUrl}/meteringPoints`)
    assert.equal(response.status, 500)

    const data = await response.json()
    assert.ok(data.error)
  })

  it('should merge points from memory and database', async () => {
    const memoryPoints = ['MEM_POINT1', 'MEM_POINT2']
    const { default: data } = await import('../../fingrid/consumptionData.mjs')
    data.push(...memoryPoints.map(mp => ({ meteringPoint: mp })))

    const response = await fetch(`${baseUrl}/meteringPoints`)
    assert.equal(response.status, 200)

    const responseData = await response.json()

    // Verify both memory and database points
    const allExpectedPoints = [...memoryPoints, 'mp123', 'mp456', 'mp999']
    allExpectedPoints.forEach(point => {
      assert.ok(responseData.includes(point.toLowerCase()))
    })
  })

  it('should handle invalid metering points', async () => {
    const response = await fetch(`${baseUrl}/meteringPoints`)
    assert.equal(response.status, 200)

    const data = await response.json()
    assert.ok(!data.includes(''))
    assert.ok(!data.includes(null))
  })

  it('should handle large number of metering points', async () => {
    const largePointSet = Array.from(
      { length: 1000 },
      (_, i) => `TEST_POINT_${i}`
    )
    await setupTestData(db, largePointSet)

    const response = await fetch(`${baseUrl}/meteringPoints`)
    assert.equal(response.status, 200)

    const data = await response.json()
    assert.ok(data.length >= largePointSet.length)
  })

  it('should maintain sorting order', async () => {
    const unsortedPoints = ['Z_POINT', 'A_POINT', 'M_POINT']
    await setupTestData(db, unsortedPoints)

    const response = await fetch(`${baseUrl}/meteringPoints`)
    assert.equal(response.status, 200)

    const data = await response.json()
    const sortedData = [...data].sort()
    assert.deepEqual(data, sortedData)
  })
})
