-- Migration 012: Add Slug and Neighborhood columns to venues
-- Required by admin CRUD and public venue pages (/v/[slug])

ALTER TABLE venues ADD COLUMN IF NOT EXISTS "Slug" VARCHAR(200);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS "Neighborhood" VARCHAR(200);

-- Unique index on Slug for URL lookups and upsert conflict target
CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_slug
    ON venues ("Slug")
    WHERE "Slug" IS NOT NULL;
