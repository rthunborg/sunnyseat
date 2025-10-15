-- Initialize PostGIS extensions for SunnySeat database
-- This script runs automatically when the PostgreSQL container starts

\echo 'Loading PostGIS extensions into sunnyseat_dev database...'

-- Connect to the sunnyseat_dev database
\c sunnyseat_dev;

-- Create PostGIS extension (provides spatial types and functions)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create PostGIS topology extension (optional, for advanced topology features)
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create PostGIS raster extension (optional, for raster data support)
CREATE EXTENSION IF NOT EXISTS postgis_raster;

-- Create PostGIS SFCGAL extension (optional, for 3D geometry support)
-- CREATE EXTENSION IF NOT EXISTS postgis_sfcgal;

-- Verify PostGIS installation
SELECT PostGIS_Version();

-- Create spatial reference system entries for Gothenburg area (EPSG:3006 - SWEREF99 TM)
-- This is useful for local Swedish coordinate system
INSERT INTO spatial_ref_sys (srid, auth_name, auth_srid, proj4text, srtext) 
VALUES (3006, 'EPSG', 3006, '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', 
'PROJCS["SWEREF99 TM",GEOGCS["SWEREF99",DATUM["SWEREF99",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],TOWGS84[0,0,0,0,0,0,0],AUTHORITY["EPSG","6619"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4619"]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",15],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AUTHORITY["EPSG","3006"]]')
ON CONFLICT (srid) DO NOTHING;

-- Set up some useful configuration for spatial queries
-- Enable parallel query execution for spatial operations
SET max_parallel_workers_per_gather = 2;
SET parallel_tuple_cost = 0.1;
SET parallel_setup_cost = 1000.0;

-- Optimize for spatial index usage
SET enable_seqscan = off;  -- Prefer index scans for spatial queries
SET enable_bitmapscan = on;
SET random_page_cost = 1.1;  -- SSD-optimized setting

\echo 'PostGIS extensions loaded successfully!'
\echo 'Database is ready for SunnySeat spatial data.'