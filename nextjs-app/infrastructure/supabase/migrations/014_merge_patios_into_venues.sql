-- ============================================================================
-- Migration 014: Merge patios table into venues
-- ============================================================================
-- This migration eliminates the patios table by moving patio geometry columns
-- directly onto the venues table. The 1:1 patios-to-venues relationship makes
-- a separate table unnecessary.
--
-- Operations:
--   1. Add geometry columns to venues
--   2. Copy data from patios to venues
--   3. Add VenueId to sun_windows and precomputed_sun_exposure
--   4. Drop old PatioId FKs, add new VenueId FKs
--   5. Drop PatioId columns from dependent tables
--   6. Rename precomputation_schedules columns
--   7. Drop and recreate spatial functions for venues
--   8. Create GIST spatial index on venues."Geometry"
--   9. Grant execute permissions on new functions
--  10. Drop old spatial functions
--  11. Drop patios table
--
-- Safe to run multiple times (idempotent via IF NOT EXISTS / DO blocks).
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add geometry columns to venues
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'venues' AND column_name = 'Geometry'
  ) THEN
    ALTER TABLE venues ADD COLUMN "Geometry" GEOGRAPHY(POLYGON, 4326);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'venues' AND column_name = 'HeightM'
  ) THEN
    ALTER TABLE venues ADD COLUMN "HeightM" NUMERIC(5, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'venues' AND column_name = 'HeightSource'
  ) THEN
    ALTER TABLE venues ADD COLUMN "HeightSource" INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'venues' AND column_name = 'PolygonQuality'
  ) THEN
    ALTER TABLE venues ADD COLUMN "PolygonQuality" NUMERIC(3, 2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'venues' AND column_name = 'Orientation'
  ) THEN
    ALTER TABLE venues ADD COLUMN "Orientation" VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'venues' AND column_name = 'Notes'
  ) THEN
    ALTER TABLE venues ADD COLUMN "Notes" VARCHAR(500);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'venues' AND column_name = 'ReviewNeeded'
  ) THEN
    ALTER TABLE venues ADD COLUMN "ReviewNeeded" BOOLEAN NOT NULL DEFAULT false;
  END IF;

  RAISE NOTICE 'Step 1 complete: geometry columns added to venues';
END $$;

-- ============================================================================
-- STEP 2: Copy data from patios to venues (only if patios table still exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'patios' AND table_schema = 'public'
  ) THEN
    UPDATE venues v SET
      "Geometry" = p."Geometry",
      "HeightM" = p."HeightM",
      "HeightSource" = p."HeightSource",
      "PolygonQuality" = p."PolygonQuality",
      "Orientation" = p."Orientation",
      "Notes" = p."Notes",
      "ReviewNeeded" = p."ReviewNeeded",
      "UpdatedAt" = CURRENT_TIMESTAMP
    FROM patios p
    WHERE p."VenueId" = v."Id";

    RAISE NOTICE 'Step 2 complete: patio data copied to venues';
  ELSE
    RAISE NOTICE 'Step 2 skipped: patios table does not exist (already migrated)';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add VenueId columns to sun_windows and precomputed_sun_exposure,
--         populate from patios join
-- ============================================================================

-- sun_windows: add VenueId and populate
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sun_windows' AND column_name = 'VenueId'
  ) THEN
    ALTER TABLE sun_windows ADD COLUMN "VenueId" INTEGER;

    -- Populate from patios join (only if patios still exists)
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'patios' AND table_schema = 'public'
    ) THEN
      UPDATE sun_windows sw SET "VenueId" = p."VenueId"
      FROM patios p
      WHERE sw."PatioId" = p."Id";
    END IF;

    -- Delete orphaned rows that could not be populated (patios already gone)
    DELETE FROM sun_windows WHERE "VenueId" IS NULL;

    -- Make NOT NULL after population
    ALTER TABLE sun_windows ALTER COLUMN "VenueId" SET NOT NULL;

    RAISE NOTICE 'Step 3a complete: VenueId added to sun_windows';
  ELSE
    RAISE NOTICE 'Step 3a skipped: VenueId already exists on sun_windows';
  END IF;
END $$;

-- precomputed_sun_exposure: add VenueId and populate
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'precomputed_sun_exposure' AND column_name = 'VenueId'
  ) THEN
    ALTER TABLE precomputed_sun_exposure ADD COLUMN "VenueId" INTEGER;

    -- Populate from patios join (only if patios still exists)
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'patios' AND table_schema = 'public'
    ) THEN
      UPDATE precomputed_sun_exposure pse SET "VenueId" = p."VenueId"
      FROM patios p
      WHERE pse."PatioId" = p."Id";
    END IF;

    -- Delete orphaned rows that could not be populated (patios already gone)
    DELETE FROM precomputed_sun_exposure WHERE "VenueId" IS NULL;

    -- Make NOT NULL after population
    ALTER TABLE precomputed_sun_exposure ALTER COLUMN "VenueId" SET NOT NULL;

    RAISE NOTICE 'Step 3b complete: VenueId added to precomputed_sun_exposure';
  ELSE
    RAISE NOTICE 'Step 3b skipped: VenueId already exists on precomputed_sun_exposure';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Drop old PatioId FKs, add new VenueId FKs
-- ============================================================================

-- Drop PatioId FKs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_SunWindows_Patios_PatioId') THEN
    ALTER TABLE sun_windows DROP CONSTRAINT "FK_SunWindows_Patios_PatioId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_PrecomputedSunExposure_Patios_PatioId') THEN
    ALTER TABLE precomputed_sun_exposure DROP CONSTRAINT "FK_PrecomputedSunExposure_Patios_PatioId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_Feedback_Patios_PatioId') THEN
    ALTER TABLE feedback DROP CONSTRAINT "FK_Feedback_Patios_PatioId";
  END IF;
END $$;

-- Add new VenueId FKs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_SunWindows_Venues_VenueId') THEN
    ALTER TABLE sun_windows ADD CONSTRAINT "FK_SunWindows_Venues_VenueId"
      FOREIGN KEY ("VenueId") REFERENCES venues ("Id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_PrecomputedSunExposure_Venues_VenueId') THEN
    ALTER TABLE precomputed_sun_exposure ADD CONSTRAINT "FK_PrecomputedSunExposure_Venues_VenueId"
      FOREIGN KEY ("VenueId") REFERENCES venues ("Id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  RAISE NOTICE 'Step 4 complete: FK constraints updated';
END $$;

-- ============================================================================
-- STEP 5: Drop PatioId columns from dependent tables
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sun_windows' AND column_name = 'PatioId'
  ) THEN
    ALTER TABLE sun_windows DROP COLUMN "PatioId";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'precomputed_sun_exposure' AND column_name = 'PatioId'
  ) THEN
    ALTER TABLE precomputed_sun_exposure DROP COLUMN "PatioId";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback' AND column_name = 'PatioId'
  ) THEN
    ALTER TABLE feedback DROP COLUMN "PatioId";
  END IF;

  RAISE NOTICE 'Step 5 complete: PatioId columns dropped from dependent tables';
END $$;

-- ============================================================================
-- STEP 6: Rename precomputation_schedules columns
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'precomputation_schedules' AND column_name = 'PatiosTotal'
  ) THEN
    ALTER TABLE precomputation_schedules RENAME COLUMN "PatiosTotal" TO "VenuesTotal";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'precomputation_schedules' AND column_name = 'PatiosProcessed'
  ) THEN
    ALTER TABLE precomputation_schedules RENAME COLUMN "PatiosProcessed" TO "VenuesProcessed";
  END IF;

  RAISE NOTICE 'Step 6 complete: precomputation_schedules columns renamed';
END $$;

-- ============================================================================
-- STEP 7: Drop old spatial functions and create new ones for venues
-- ============================================================================

-- Drop old patio-based functions (safe even if they don't exist)
DROP FUNCTION IF EXISTS get_patios_near_point(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS get_patio_centroid(INTEGER);
DROP FUNCTION IF EXISTS find_patio_containing_point(DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS get_patios_within_bounds(TEXT);

-- --------------------------------------------------------------------------
-- FUNCTION: get_venues_near_point
-- --------------------------------------------------------------------------
-- Search for venues with geometry within a specified radius of a point.
-- Returns all venue columns plus distance. Filters on IsActive and has geometry.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_venues_near_point(
    search_lat DOUBLE PRECISION,
    search_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION
)
RETURNS TABLE (
    "Id" INTEGER,
    "Name" VARCHAR(200),
    "Address" VARCHAR(500),
    "Phone" VARCHAR(50),
    "Website" VARCHAR(500),
    "Type" INTEGER,
    "Description" VARCHAR(1000),
    "Location" GEOGRAPHY(POINT, 4326),
    "IsActive" BOOLEAN,
    "IsMapped" BOOLEAN,
    "Geometry" GEOGRAPHY(POLYGON, 4326),
    "HeightM" NUMERIC(5, 2),
    "HeightSource" INTEGER,
    "PolygonQuality" NUMERIC(3, 2),
    "Orientation" VARCHAR(50),
    "Notes" VARCHAR(500),
    "ReviewNeeded" BOOLEAN,
    "CreatedAt" TIMESTAMP WITH TIME ZONE,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE,
    "DistanceMeters" DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
DECLARE
    search_point GEOGRAPHY;
BEGIN
    search_point := ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography;

    RETURN QUERY
    SELECT
        v."Id",
        v."Name",
        v."Address",
        v."Phone",
        v."Website",
        v."Type",
        v."Description",
        v."Location",
        v."IsActive",
        v."IsMapped",
        v."Geometry",
        v."HeightM",
        v."HeightSource",
        v."PolygonQuality",
        v."Orientation",
        v."Notes",
        v."ReviewNeeded",
        v."CreatedAt",
        v."UpdatedAt",
        ST_Distance(v."Geometry", search_point) AS "DistanceMeters"
    FROM venues v
    WHERE v."IsActive" = true
      AND v."Geometry" IS NOT NULL
      AND ST_DWithin(v."Geometry", search_point, radius_meters)
    ORDER BY ST_Distance(v."Geometry", search_point)
    LIMIT 50;
END;
$$;

COMMENT ON FUNCTION get_venues_near_point IS
'Searches for venues with patio geometry within a specified radius of a geographic point. Uses PostGIS ST_DWithin for efficient spatial queries with GIST index support.';

-- --------------------------------------------------------------------------
-- FUNCTION: get_venue_centroid
-- --------------------------------------------------------------------------
-- Get the centroid (center point) of a venue's patio polygon.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_venue_centroid(venue_id INTEGER)
RETURNS TABLE (
    "Latitude" DOUBLE PRECISION,
    "Longitude" DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ST_Y(ST_Centroid(v."Geometry"::geometry))::DOUBLE PRECISION AS "Latitude",
        ST_X(ST_Centroid(v."Geometry"::geometry))::DOUBLE PRECISION AS "Longitude"
    FROM venues v
    WHERE v."Id" = venue_id
      AND v."Geometry" IS NOT NULL;
END;
$$;

COMMENT ON FUNCTION get_venue_centroid IS
'Returns the centroid (center point) coordinates of a venue patio polygon for distance calculations.';

-- --------------------------------------------------------------------------
-- FUNCTION: find_venue_containing_point
-- --------------------------------------------------------------------------
-- Find a venue whose patio polygon contains a given point.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION find_venue_containing_point(
    search_lat DOUBLE PRECISION,
    search_lng DOUBLE PRECISION
)
RETURNS TABLE (
    "Id" INTEGER,
    "Name" VARCHAR(200),
    "Geometry" GEOGRAPHY(POLYGON, 4326)
)
LANGUAGE plpgsql
AS $$
DECLARE
    search_point GEOMETRY;
BEGIN
    search_point := ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326);

    RETURN QUERY
    SELECT
        v."Id",
        v."Name",
        v."Geometry"
    FROM venues v
    WHERE v."IsActive" = true
      AND v."Geometry" IS NOT NULL
      AND ST_Contains(v."Geometry"::geometry, search_point)
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION find_venue_containing_point IS
'Finds a venue whose patio polygon contains a given geographic point. Returns the first matching venue.';

-- --------------------------------------------------------------------------
-- FUNCTION: get_venues_within_bounds
-- --------------------------------------------------------------------------
-- Get venues with patio geometry within a bounding box (polygon).
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_venues_within_bounds(
    bounds_wkt TEXT
)
RETURNS TABLE (
    "Id" INTEGER,
    "Name" VARCHAR(200),
    "Geometry" GEOGRAPHY(POLYGON, 4326)
)
LANGUAGE plpgsql
AS $$
DECLARE
    bounds_geom GEOMETRY;
BEGIN
    bounds_geom := ST_GeomFromText(bounds_wkt, 4326);

    RETURN QUERY
    SELECT
        v."Id",
        v."Name",
        v."Geometry"
    FROM venues v
    WHERE v."IsActive" = true
      AND v."Geometry" IS NOT NULL
      AND ST_Intersects(v."Geometry"::geometry, bounds_geom)
    ORDER BY v."Name";
END;
$$;

COMMENT ON FUNCTION get_venues_within_bounds IS
'Returns all venues with patio geometry that intersect with a given bounding polygon. Useful for map viewport queries.';

-- ============================================================================
-- STEP 8: Create GIST spatial index on venues."Geometry"
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IX_Venues_Geometry_Spatial"
    ON venues USING GIST ("Geometry");

-- ============================================================================
-- STEP 9: Grant execute permissions on new functions
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_venues_near_point TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_venue_centroid TO anon, authenticated;
GRANT EXECUTE ON FUNCTION find_venue_containing_point TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_venues_within_bounds TO anon, authenticated;

-- ============================================================================
-- STEP 10: Drop old spatial functions (already handled in step 7, but
--          included here for clarity — DROP IF EXISTS is safe to repeat)
-- ============================================================================
-- Already dropped in Step 7 above.

-- ============================================================================
-- STEP 11: Drop patios table
-- ============================================================================
DROP TABLE IF EXISTS patios CASCADE;

DO $$ BEGIN
  RAISE NOTICE 'Migration 014 complete: patios merged into venues';
END $$;

COMMIT;
