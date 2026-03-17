-- Create PostGIS spatial functions for API endpoints
-- These functions replace Entity Framework spatial queries with optimized PostGIS RPC calls
-- Run after tables, indexes, and foreign keys are created

-- ============================================================================
-- FUNCTION: get_patios_near_point
-- ============================================================================
-- Search for patios within a specified radius of a point
-- Uses ST_DWithin on geography for accurate distance calculations
-- ============================================================================

CREATE OR REPLACE FUNCTION get_patios_near_point(
    search_lat DOUBLE PRECISION,
    search_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION
)
RETURNS TABLE (
    "Id" INTEGER,
    "VenueId" INTEGER,
    "Name" VARCHAR(100),
    "Geometry" GEOGRAPHY(POLYGON, 4326),
    "HeightM" NUMERIC(5, 2),
    "HeightSource" INTEGER,
    "PolygonQuality" NUMERIC(3, 2),
    "Orientation" VARCHAR(50),
    "Notes" VARCHAR(500),
    "ReviewNeeded" BOOLEAN,
    "CreatedAt" TIMESTAMP WITH TIME ZONE,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE,
    "VenueName" VARCHAR(200),
    "VenueLocation" GEOGRAPHY(POINT, 4326),
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
        p."Id",
        p."VenueId",
        p."Name",
        p."Geometry",
        p."HeightM",
        p."HeightSource",
        p."PolygonQuality",
        p."Orientation",
        p."Notes",
        p."ReviewNeeded",
        p."CreatedAt",
        p."UpdatedAt",
        v."Name" AS "VenueName",
        v."Location" AS "VenueLocation",
        ST_Distance(p."Geometry", search_point) AS "DistanceMeters"
    FROM patios p
    INNER JOIN venues v ON p."VenueId" = v."Id"
    WHERE ST_DWithin(p."Geometry", search_point, radius_meters)
      AND v."IsActive" = true
    ORDER BY ST_Distance(p."Geometry", search_point)
    LIMIT 50;
END;
$$;

COMMENT ON FUNCTION get_patios_near_point IS
'Searches for patios within a specified radius of a geographic point. Uses PostGIS ST_DWithin for efficient spatial queries with GIST index support.';

-- ============================================================================
-- FUNCTION: get_patio_centroid
-- ============================================================================
-- Get the centroid (center point) of a patio polygon
-- Casts geography to geometry for ST_Centroid, then extracts coordinates
-- ============================================================================

CREATE OR REPLACE FUNCTION get_patio_centroid(patio_id INTEGER)
RETURNS TABLE (
    "Latitude" DOUBLE PRECISION,
    "Longitude" DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ST_Y(ST_Centroid(p."Geometry"::geometry))::DOUBLE PRECISION AS "Latitude",
        ST_X(ST_Centroid(p."Geometry"::geometry))::DOUBLE PRECISION AS "Longitude"
    FROM patios p
    WHERE p."Id" = patio_id;
END;
$$;

COMMENT ON FUNCTION get_patio_centroid IS
'Returns the centroid (center point) coordinates of a patio polygon for distance calculations.';

-- ============================================================================
-- FUNCTION: find_patio_containing_point
-- ============================================================================
-- Find a patio that contains a given point
-- Casts geography to geometry for ST_Contains
-- ============================================================================

CREATE OR REPLACE FUNCTION find_patio_containing_point(
    search_lat DOUBLE PRECISION,
    search_lng DOUBLE PRECISION
)
RETURNS TABLE (
    "Id" INTEGER,
    "VenueId" INTEGER,
    "Name" VARCHAR(100),
    "Geometry" GEOGRAPHY(POLYGON, 4326),
    "VenueName" VARCHAR(200)
)
LANGUAGE plpgsql
AS $$
DECLARE
    search_point GEOMETRY;
BEGIN
    search_point := ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326);

    RETURN QUERY
    SELECT
        p."Id",
        p."VenueId",
        p."Name",
        p."Geometry",
        v."Name" AS "VenueName"
    FROM patios p
    INNER JOIN venues v ON p."VenueId" = v."Id"
    WHERE ST_Contains(p."Geometry"::geometry, search_point)
      AND v."IsActive" = true
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION find_patio_containing_point IS
'Finds a patio polygon that contains a given geographic point. Returns the first matching patio.';

-- ============================================================================
-- FUNCTION: get_patios_within_bounds
-- ============================================================================
-- Get patios within a bounding box (polygon)
-- Casts geography to geometry for ST_Intersects with WKT input
-- ============================================================================

CREATE OR REPLACE FUNCTION get_patios_within_bounds(
    bounds_wkt TEXT
)
RETURNS TABLE (
    "Id" INTEGER,
    "VenueId" INTEGER,
    "Name" VARCHAR(100),
    "Geometry" GEOGRAPHY(POLYGON, 4326),
    "VenueName" VARCHAR(200)
)
LANGUAGE plpgsql
AS $$
DECLARE
    bounds_geom GEOMETRY;
BEGIN
    bounds_geom := ST_GeomFromText(bounds_wkt, 4326);

    RETURN QUERY
    SELECT
        p."Id",
        p."VenueId",
        p."Name",
        p."Geometry",
        v."Name" AS "VenueName"
    FROM patios p
    INNER JOIN venues v ON p."VenueId" = v."Id"
    WHERE ST_Intersects(p."Geometry"::geometry, bounds_geom)
      AND v."IsActive" = true
    ORDER BY p."VenueId", p."Name";
END;
$$;

COMMENT ON FUNCTION get_patios_within_bounds IS
'Returns all patios that intersect with a given bounding polygon. Useful for map viewport queries.';

-- ============================================================================
-- FUNCTION: calculate_spatial_distance
-- ============================================================================
-- Calculate distance between two geographic points in meters
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_spatial_distance(
    lat1 DOUBLE PRECISION,
    lng1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN ST_Distance(
        ST_SetSRID(ST_MakePoint(lng1, lat1), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lng2, lat2), 4326)::geography
    );
END;
$$;

COMMENT ON FUNCTION calculate_spatial_distance IS
'Calculates the distance in meters between two geographic points using PostGIS.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_patios_near_point TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_patio_centroid TO anon, authenticated;
GRANT EXECUTE ON FUNCTION find_patio_containing_point TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_patios_within_bounds TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_spatial_distance TO anon, authenticated;

-- ============================================================================
-- VALIDATION
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'get_patios_near_point'
    ) THEN
        RAISE EXCEPTION 'Function get_patios_near_point was not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'get_patio_centroid'
    ) THEN
        RAISE EXCEPTION 'Function get_patio_centroid was not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'find_patio_containing_point'
    ) THEN
        RAISE EXCEPTION 'Function find_patio_containing_point was not created';
    END IF;

    RAISE NOTICE 'All spatial functions created successfully';
END $$;
