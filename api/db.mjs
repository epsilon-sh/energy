import { Database } from 'sqlite-async'

const DB_STRING = process.env.DB_STRING
const DB_PRICE_TABLE = process.env.DB_PRICE_TABLE || 'prices'
const DB_CONSUMPTION_TABLE = process.env.DB_CONSUMPTION_TABLE || 'measurements'

let db

export const initializeDatabase = async () => {
  try {
    db = await Database.open(DB_STRING)

    await db.run(`CREATE TABLE IF NOT EXISTS ${DB_PRICE_TABLE} (
      domain TEXT NOT NULL,
      resolution STRING NOT NULL,
      time INTEGER NOT NULL,
      price REAL NOT NULL
    )`)

    await db.run(`CREATE TABLE IF NOT EXISTS ${DB_CONSUMPTION_TABLE} (
      "MeteringPointGSRN" TEXT,
      "Product Type" TEXT,
      "Resolution" TEXT,
      "Unit Type" TEXT,
      "Reading Type" TEXT,
      "Start Time" TEXT,
      "Quantity" TEXT,
      "Quality" TEXT,
      UNIQUE("MeteringPointGSRN", "Product Type", "Start Time", "Resolution")
    )`)

    await db.run(`CREATE TABLE IF NOT EXISTS waitlist (
      email TEXT PRIMARY KEY NOT NULL,
      source TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`)

    console.log(`Connected to database ${DB_STRING}`)
  } catch (error) {
    console.error(`Couldn't connect to DB ${DB_STRING}:`, error)
    throw error
  }
}

export const getDatabase = () => {
  if (!db)
    throw new Error('Database not initialized')

  return db
}
