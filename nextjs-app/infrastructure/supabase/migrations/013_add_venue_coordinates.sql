-- Migration 013: Add explicit Latitude/Longitude columns to venues
-- Fixes: PostGIS geography columns return hex-encoded WKB via PostgREST,
-- which the API couldn't parse reliably. Explicit numeric columns are simpler.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS "Latitude" DOUBLE PRECISION;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS "Longitude" DOUBLE PRECISION;

-- Backfill from existing Location geography column
UPDATE venues SET
    "Latitude" = ST_Y("Location"::geometry),
    "Longitude" = ST_X("Location"::geometry)
WHERE "Location" IS NOT NULL
  AND "Latitude" IS NULL;
