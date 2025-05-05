import type { Config } from 'drizzle-kit';

export default {
  schema: './data/schema/*', // Look for schema files in data/schema/
  out: './data/migrations',   // Output migrations to data/migrations/
  dialect: 'sqlite',          // Specify SQLite dialect
  driver: 'better-sqlite3',   // Use the better-sqlite3 driver
  dbCredentials: {
    url: './data/api.sqlite', // Path to the database file relative to this config file
  },
  verbose: true, // Enable detailed logging from drizzle-kit
  strict: true,  // Enable stricter checks
} satisfies Config;
