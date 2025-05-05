import Database from 'better-sqlite3'

const DB_STRING = process.env.DB_STRING
const DB_PRICE_TABLE = process.env.DB_PRICE_TABLE || 'prices'
const DB_CONSUMPTION_TABLE = process.env.DB_CONSUMPTION_TABLE || 'measurements'

let db

export const initializeDatabase = async () => {
  try {
    db = new Database(DB_STRING)
    db.pragma('journal_mode = WAL')

    db.prepare(`CREATE TABLE IF NOT EXISTS ${DB_PRICE_TABLE} (
      domain TEXT NOT NULL,
      resolution STRING NOT NULL,
      time INTEGER NOT NULL,
      price REAL NOT NULL,
      UNIQUE(domain, resolution, time)
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
    console.error(`Couldn't connect or initialize DB ${DB_STRING}:`, error)
    throw error // Re-throw to prevent application startup on DB error
  }
}

export const getDatabase = () => {
  if (!db)
    throw new Error('Database not initialized')

  return db
}

export const closeDatabase = () => {
  if (db) {
    db.close()
    console.log('Database connection closed.')
  }
}
