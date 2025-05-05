import { test, describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { startServer, stopServer } from '../index.mjs' // Adjust path as needed
import { getDatabase, closeDatabase } from '../db.mjs'  // Adjust path as needed
import { initializeDatabase } from '../db.mjs'  // Adjust path as needed

const TEST_PORT = process.env.PORT || 8990
const BASE_URL = `http://localhost:${TEST_PORT}`

describe('Waitlist API', () => {
  let server
  let db

  before(async () => {
    // Initialize DB for this suite
    await initializeDatabase()
    server = await startServer() // Start the server
    db = getDatabase() // Get the initialized DB instance
  })

  after(async () => {
    await stopServer() // Stop the server
    closeDatabase() // Close the DB connection
  })

  it('should add an email to the waitlist via JSON', async () => {
    const testEmail = `test-${Date.now()}@example.com`
    const response = await fetch(`${BASE_URL}/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: testEmail, source: 'test-json' }),
    })

    assert.strictEqual(response.status, 200, 'Expected status code 200')
    const responseBody = await response.json()
    assert.deepStrictEqual(responseBody, { message: 'Successfully joined waitlist' })

    // Verify in DB
    const row = db.prepare('SELECT email, source FROM waitlist WHERE email = ?').get(testEmail)
    assert.ok(row, 'Email not found in database')
    assert.strictEqual(row.email, testEmail)
    assert.strictEqual(row.source, 'test-json')
  })

  it('should ignore duplicate email entries', async () => {
    const testEmail = `duplicate-${Date.now()}@example.com`

    // First insertion
    let response = await fetch(`${BASE_URL}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    })
    assert.strictEqual(response.status, 200)

    // Second insertion (should be ignored)
    response = await fetch(`${BASE_URL}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, source: 'ignored' }),
    })
    assert.strictEqual(response.status, 200)

    // Verify only one entry exists with the default source
    const rows = db.prepare('SELECT email, source FROM waitlist WHERE email = ?').all(testEmail)
    assert.strictEqual(rows.length, 1, 'Expected only one entry for the email')
    assert.strictEqual(rows[0].source, 'website', 'Expected source to be the default from the first insert')
  })

  it('should return 400 if email is missing (JSON)', async () => {
    const response = await fetch(`${BASE_URL}/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'test-no-email' }),
    })

    assert.strictEqual(response.status, 400, 'Expected status code 400')
    const responseBody = await response.json()
    assert.deepStrictEqual(responseBody, { error: 'Email is required' })
  })

  // Note: Testing form submission redirection with fetch is tricky
  // as fetch doesn't automatically follow redirects like a browser.
  // We can check the redirect status and Location header.
  it('should handle form submission and redirect on success', async () => {
    const testEmail = `test-form-${Date.now()}@example.com`
    const formData = new URLSearchParams()
    formData.append('email', testEmail)
    formData.append('source', 'test-form')

    const response = await fetch(`${BASE_URL}/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'manual', // Prevent fetch from following the redirect
    })

    assert.strictEqual(response.status, 302, 'Expected status code 302 for redirect')
    const location = response.headers.get('location')
    assert.ok(location, 'Expected Location header for redirect')
    // Compare against the full expected URL
    const expectedUrl = new URL('#success=Thanks for joining our waitlist!', BASE_URL).toString()
    assert.strictEqual(location, expectedUrl, 'Redirect URL mismatch')

    // Verify in DB
    const row = db.prepare('SELECT email, source FROM waitlist WHERE email = ?').get(testEmail)
    assert.ok(row, 'Email not found in database after form submission')
    assert.strictEqual(row.email, testEmail)
    assert.strictEqual(row.source, 'test-form')
  })

  it('should handle form submission and redirect on missing email', async () => {
    const formData = new URLSearchParams()
    formData.append('source', 'test-form-no-email')

    const response = await fetch(`${BASE_URL}/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'manual',
    })

    assert.strictEqual(response.status, 302, 'Expected status code 302 for redirect')
    const location = response.headers.get('location')
    assert.ok(location, 'Expected Location header for redirect')
    // Compare against the correctly encoded relative path
    assert.strictEqual(location, '/#error=Email%20is%20required', 'Redirect URL mismatch for missing email')
  })

  it('should retrieve all waitlist entries', async () => {
    // Clear table first (as beforeEach might not exist or run before this)
    try {
      db.prepare('DELETE FROM waitlist').run()
    } catch (e) { /* ignore if table doesn't exist yet */ }

    // Insert test data
    const entries = [
      { email: 'test1@example.com', source: 'source1' },
      { email: 'test2@example.com', source: 'source2' },
    ]
    const stmt = db.prepare('INSERT INTO waitlist (email, source) VALUES (?, ?)')
    const insert = db.transaction((items) => {
      for (const item of items) {
        stmt.run(item.email, item.source)
      }
    })
    insert(entries)

    // Fetch the waitlist
    const response = await fetch(`${BASE_URL}/waitlist`)
    assert.strictEqual(response.status, 200, 'Expected status code 200')

    const retrievedEntries = await response.json()
    assert.ok(Array.isArray(retrievedEntries), 'Expected response to be an array')
    assert.strictEqual(retrievedEntries.length, 2, 'Expected 2 entries in the response')

    // Verify content (ignoring created_at for simplicity, checking emails)
    const retrievedEmails = retrievedEntries.map(e => e.email).sort()
    const expectedEmails = entries.map(e => e.email).sort()
    assert.deepStrictEqual(retrievedEmails, expectedEmails, 'Retrieved emails do not match inserted emails')

    // Optionally check sources or created_at if needed
    assert.ok(retrievedEntries[0].created_at, 'Expected created_at field')
  })
})
