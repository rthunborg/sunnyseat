-- ============================================================================
-- Migration 016: Add Slug and Neighborhood to get_venues_near_point RPC
-- ============================================================================
-- The RPC function from migration 014 omits the Slug and Neighborhood columns
-- added in migration 012. Without them the frontend cannot build venue detail
-- links (/v/[slug]) or display neighborhood labels on VenueCards.
-- ============================================================================

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
'Searches for venues with patio geometry within a specified radius of a geographic point. Returns all venue columns including Slug and Neighborhood plus distance.';
