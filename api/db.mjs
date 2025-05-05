import Database from 'better-sqlite3'

const DB_STRING = process.env.DB_STRING
const DB_PRICE_TABLE = process.env.DB_PRICE_TABLE || 'prices'
const DB_CONSUMPTION_TABLE = process.env.DB_CONSUMPTION_TABLE || 'measurements'

let db = null

export const resetDatabase = () => {
  if (db) {
    db.close()
    db = null
  }
}

// Helper function to convert statement to Promise-based API
const wrapStatement = stmt => {
  return {
    run: async (...params) => {
      return new Promise((resolve, reject) => {
        try {
          const result = stmt.run(...params)
          resolve(result)
        } catch (err) {
          reject(err)
        }
      })
    },
    // No need for finalize() method as better-sqlite3 handles cleanup automatically
  }
}

export const initializeDatabase = async () => {
  try {
    db = new Database(DB_STRING)
    db.pragma('journal_mode = WAL')

    db.prepare(`CREATE TABLE IF NOT EXISTS ${DB_PRICE_TABLE} (
      domain TEXT NOT NULL,
      resolution STRING NOT NULL,
      time INTEGER NOT NULL,
      price REAL NOT NULL
    )`).run()

    db.prepare(`CREATE TABLE IF NOT EXISTS ${DB_CONSUMPTION_TABLE} (
      "MeteringPointGSRN" TEXT,
      "Product Type" TEXT,
      "Resolution" TEXT,
      "Unit Type" TEXT,
      "Reading Type" TEXT,
      "Start Time" TEXT,
      "Quantity" TEXT,
      "Quality" TEXT
    )`).run()

    db.prepare(`CREATE TABLE IF NOT EXISTS waitlist (
      email TEXT PRIMARY KEY NOT NULL,
      source TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`).run()

    console.log(`Connected to database ${DB_STRING}`)
  } catch (error) {
    console.error(`Couldn't connect to DB ${DB_STRING}:`, error)
    throw error
  }
}

export const getDatabase = () => {
  if (!db)
    throw new Error('Database not initialized')

  return {
    // Basic query methods
    run: async (sql, ...params) => {
      const stmt = db.prepare(sql)
      return new Promise((resolve, reject) => {
        try {
          const result = stmt.run(...params)
          resolve(result)
        } catch (err) {
          reject(err)
        }
      })
    },
    get: async (sql, ...params) => {
      const stmt = db.prepare(sql)
      return new Promise((resolve, reject) => {
        try {
          const result = stmt.get(...params)
          resolve(result)
        } catch (err) {
          reject(err)
        }
      })
    },
    all: async (sql, ...params) => {
      const stmt = db.prepare(sql)
      return new Promise((resolve, reject) => {
        try {
          const result = stmt.all(...params)
          resolve(result)
        } catch (err) {
          reject(err)
        }
      })
    },
    // Prepared statement support
    prepare: async sql => {
      const stmt = db.prepare(sql)
      return wrapStatement(stmt)
    },
  }
}

export const closeDatabase = () => {
  if (db) {
    db.close()
    console.log('Database connection closed.')
  }
}
