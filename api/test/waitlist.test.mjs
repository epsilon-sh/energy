import { describe, it, beforeEach, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import { initializeDatabase, getDatabase } from '../db.mjs';
import http from 'node:http';
import express from 'express';
import { register } from 'node:module';

// Mock environment variables
process.env.DB_STRING = ':memory:';
process.env.API_URL = 'http://test.local';
process.env.FRONTEND_URL = 'http://test.local';

describe('Waitlist Route', async () => {
  before(async () => {
    register('./mocks/emailjs.mjs', import.meta.url);
  });

  let server;
  let baseUrl;
  let db;

  beforeEach(async () => {
    // Initialize/reset the global emails array
    globalThis.sentEmails = [];

    // Initialize test database
    await initializeDatabase();
    db = getDatabase();

    // Create required tables
    db.prepare(`
      CREATE TABLE IF NOT EXISTS waitlist (
        email TEXT PRIMARY KEY,
        source TEXT NOT NULL DEFAULT 'website',
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS confirm_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        expires_at INTEGER NOT NULL,
        used_at INTEGER
      )
    `).run();

    // Setup test server
    const { default: router } = await import('../routes/waitlist.mjs');
    const app = express();
    app.use(express.json());
    app.use('/waitlist', router);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const address = server.address();
    baseUrl = `http://localhost:${address.port}`;
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (db) {
      db.prepare('DROP TABLE IF EXISTS waitlist').run();
      db.prepare('DROP TABLE IF EXISTS confirm_codes').run();
    }
  });

  describe('POST /waitlist', () => {
    it('should add email to waitlist and send confirmation email', async () => {
      const email = 'test@example.com';
      const response = await fetch(`${baseUrl}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      // Wait for all promises to resolve
      await new Promise((resolve) => setTimeout(resolve, 1000));

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.ok(data.message.includes('Successfully processed'));

      // Check database
      const dbEntry = db.prepare('SELECT email FROM waitlist WHERE email = ?').get(email);
      assert.equal(dbEntry.email, email);

      // Check confirmation codes
      const codes = db.prepare('SELECT * FROM confirm_codes WHERE email = ?').all(email);
      assert.equal(codes.length, 2); // One activation, one unsubscribe
      assert.ok(codes.some((c) => c.type === 'activation'));
      assert.ok(codes.some((c) => c.type === 'unsubscribe'));

      // Verify email was "sent"
      assert.equal(globalThis.sentEmails.length, 1, 'Expected one email to be sent');
      assert.equal(globalThis.sentEmails[0].to, email);
    });

    it('should reject request without email', async () => {
      const response = await fetch(`${baseUrl}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      assert.equal(response.status, 400);
      const data = await response.json();
      assert.ok(data.error.includes('Email is required'));
    });
  });

  describe('GET /waitlist/confirm', () => {
    it('should confirm valid activation code', async () => {
      const email = 'test@example.com';
      const code = 'TEST123';
      const nowInSeconds = Math.floor(Date.now() / 1000);

      // Insert test data
      db.prepare('INSERT INTO waitlist (email) VALUES (?)').run(email);
      db.prepare(`
        INSERT INTO confirm_codes (email, code, type, expires_at)
        VALUES (?, ?, 'activation', ?)
      `).run(email, code, nowInSeconds + 900); // 15 minutes from now

      const response = await fetch(`${baseUrl}/waitlist/confirm?code=${code}`);
      assert.equal(response.status, 200);

      // Verify code was marked as used
      const usedCode = db.prepare('SELECT used_at FROM confirm_codes WHERE code = ?').get(code);
      assert.ok(usedCode.used_at);
    });

    it('should reject invalid activation code', async () => {
      const response = await fetch(`${baseUrl}/waitlist/confirm?code=INVALID`);
      assert.equal(response.status, 400);
    });
  });

  describe('GET /waitlist/bye', () => {
    it('should remove email from waitlist with valid unsubscribe code', async () => {
      const email = 'test@example.com';
      const code = 'UNSUB123';
      const nowInSeconds = Math.floor(Date.now() / 1000);

      // Insert test data
      db.prepare('INSERT INTO waitlist (email) VALUES (?)').run(email);
      db.prepare(`
        INSERT INTO confirm_codes (email, code, type, expires_at)
        VALUES (?, ?, 'unsubscribe', ?)
      `).run(email, code, nowInSeconds + 86400); // 24 hours from now

      const response = await fetch(`${baseUrl}/waitlist/bye?code=${code}`);
      assert.equal(response.status, 200);

      // Verify email was removed
      const dbEntry = db.prepare('SELECT email FROM waitlist WHERE email = ?').get(email);
      assert.equal(dbEntry, undefined);
    });

    it('should reject invalid unsubscribe code', async () => {
      const response = await fetch(`${baseUrl}/waitlist/bye?code=INVALID`);
      assert.equal(response.status, 400);
    });
  });

  describe('GET /waitlist', () => {
    it('should return all waitlist entries', async () => {
      // Insert test data
      const testEmails = ['test1@example.com', 'test2@example.com'];
      const insert = db.prepare('INSERT INTO waitlist (email) VALUES (?)');
      testEmails.forEach((email) => insert.run(email));

      const response = await fetch(`${baseUrl}/waitlist`);
      assert.equal(response.status, 200);
      const data = await response.json();

      assert.equal(data.length, testEmails.length);
      data.forEach((entry) => {
        assert.ok(testEmails.includes(entry.email));
      });
    });
  });
});
