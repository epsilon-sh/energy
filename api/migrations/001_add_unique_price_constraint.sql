-- Migration 001: Add unique constraint to prices table and deduplicate
-- IMPORTANT: Backup your database before running this migration.
-- This script assumes the 'prices' table exists but lacks the unique constraint.

-- Start transaction for safety
BEGIN TRANSACTION;

-- Step 1: Deduplicate the existing data in the original table
-- Keep the row with the minimum rowid for each duplicate set
DELETE FROM prices
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM prices
  GROUP BY domain, resolution, time
);

-- Step 2: Rename the old table
ALTER TABLE prices RENAME TO prices_old;

-- Step 3: Create the new table with the correct schema (including UNIQUE constraint)
CREATE TABLE prices (
    domain TEXT NOT NULL,
    resolution STRING NOT NULL,
    time INTEGER NOT NULL,
    price REAL NOT NULL,
    UNIQUE(domain, resolution, time)
);

-- Step 4: Copy data from the old table to the new table
-- Since we deduplicated first, a simple INSERT is fine here.
INSERT INTO prices (domain, resolution, time, price)
SELECT domain, resolution, time, price
FROM prices_old;

-- Step 5: Drop the old table
DROP TABLE prices_old;

-- Commit the transaction
COMMIT; 