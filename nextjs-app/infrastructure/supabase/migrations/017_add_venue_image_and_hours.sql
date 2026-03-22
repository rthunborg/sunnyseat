-- ============================================================================
-- Migration 017: Add image_url and opening_hours to venues
-- ============================================================================
-- Supports the frontend refactor (Phase 0): venue photos and opening hours
-- are required for the new image-forward VenuePhotoCard component.
--
-- ImageUrl:       URL to the venue's primary photo (nullable — fallback UI used)
-- OpeningHours:   JSONB storing structured opening hours per day of week
--                 Format: { "mon": "11:00-22:00", "tue": "11:00-22:00", ... }
--                 Allows null values for days the venue is closed.
-- ============================================================================

BEGIN;

-- Add ImageUrl column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'venues' AND column_name = 'ImageUrl'
  ) THEN
    ALTER TABLE venues ADD COLUMN "ImageUrl" VARCHAR(512);
    COMMENT ON COLUMN venues."ImageUrl" IS 'Primary venue photo URL for cards and detail views';
  END IF;
END $$;

-- Add OpeningHours column (JSONB for flexible day-of-week storage)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'venues' AND column_name = 'OpeningHours'
  ) THEN
    ALTER TABLE venues ADD COLUMN "OpeningHours" JSONB;
    COMMENT ON COLUMN venues."OpeningHours" IS 'Structured opening hours: {"mon":"11:00-22:00", ...}';
  END IF;
END $$;

-- Update the get_venues_near_point RPC to include the new columns
-- Preserves the existing signature from migration 016, adding ImageUrl and OpeningHours
CREATE OR REPLACE FUNCTION get_venues_near_point(
    search_lat DOUBLE PRECISION,
    search_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION
)
RETURNS TABLE (
    "Id" INTEGER,
    "Name" VARCHAR(200),
    "Slug" VARCHAR(200),
    "Neighborhood" VARCHAR(200),
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
    "DistanceMeters" DOUBLE PRECISION,
    "ImageUrl" VARCHAR(512),
    "OpeningHours" JSONB
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
        v."Slug",
        v."Neighborhood",
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
        ST_Distance(v."Geometry", search_point) AS "DistanceMeters",
        v."ImageUrl",
        v."OpeningHours"
    FROM venues v
    WHERE v."IsActive" = true
      AND v."Geometry" IS NOT NULL
      AND ST_DWithin(v."Geometry", search_point, radius_meters)
    ORDER BY ST_Distance(v."Geometry", search_point)
    LIMIT 50;
END;
$$;

COMMENT ON FUNCTION get_venues_near_point IS
'Searches for venues with patio geometry within a specified radius of a geographic point. Returns all venue columns including Slug, Neighborhood, ImageUrl, and OpeningHours plus distance.';

COMMIT;
