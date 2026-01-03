-- Enable PostGIS extension for Supabase
-- This script enables PostGIS and verifies installation
-- Run this first before creating any spatial tables

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS installation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        RAISE NOTICE 'PostGIS extension enabled successfully';
        RAISE NOTICE 'PostGIS version: %', (SELECT PostGIS_version());
    ELSE
        RAISE EXCEPTION 'Failed to enable PostGIS extension';
    END IF;
END $$;

-- Display PostGIS version for verification
SELECT PostGIS_version() AS postgis_version;
