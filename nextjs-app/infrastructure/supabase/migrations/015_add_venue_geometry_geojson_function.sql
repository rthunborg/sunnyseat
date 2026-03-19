-- Helper function to return venue geometry as GeoJSON text
-- PostgREST returns geography columns as WKB hex, which the frontend can't use.
-- This function uses PostGIS ST_AsGeoJSON to return a parseable GeoJSON string.

CREATE OR REPLACE FUNCTION get_venue_geometry_geojson(venue_id INTEGER)
RETURNS TABLE (geojson TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT ST_AsGeoJSON(v."Geometry"::geometry)::TEXT AS geojson
  FROM venues v
  WHERE v."Id" = venue_id
    AND v."Geometry" IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION get_venue_geometry_geojson TO anon, authenticated;
