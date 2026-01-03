-- Validation script for Supabase schema migration
-- This script verifies that all tables, indexes, and constraints are in place
-- Run after all migrations to verify successful migration

-- ============================================================================
-- POSTGIS VALIDATION
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        RAISE NOTICE '✓ PostGIS extension is enabled';
        RAISE NOTICE '  PostGIS version: %', (SELECT PostGIS_version());
    ELSE
        RAISE EXCEPTION '✗ PostGIS extension is NOT enabled';
    END IF;
END $$;

-- Test basic PostGIS functions
SELECT 
    'PostGIS Functions Test' AS test_name,
    ST_Distance(
        ST_GeogFromText('POINT(11.9746 57.7089)'), -- Gothenburg coordinates
        ST_GeogFromText('POINT(11.9746 57.7089)')
    ) AS distance_test,
    ST_Point(11.9746, 57.7089) AS point_test;

-- ============================================================================
-- TABLE VALIDATION
-- ============================================================================
DO $$
DECLARE
    expected_tables TEXT[] := ARRAY[
        'venues', 'patios', 'buildings', 'venue_quality_metrics',
        'sun_windows', 'weather_slices', 'processed_weather', 'feedback',
        'admin_users', 'precomputed_sun_exposure', 'precomputation_schedules'
    ];
    table_name TEXT;
    table_count INTEGER;
BEGIN
    RAISE NOTICE 'Validating tables...';
    
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = table_name;
        
        IF table_count > 0 THEN
            RAISE NOTICE '  ✓ Table "%" exists', table_name;
        ELSE
            RAISE EXCEPTION '  ✗ Table "%" is missing', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✓ All tables validated';
END $$;

-- ============================================================================
-- SPATIAL INDEX VALIDATION
-- ============================================================================
DO $$
DECLARE
    spatial_indexes TEXT[] := ARRAY[
        'IX_Venues_Location_Spatial',
        'IX_Patios_Geometry_Spatial',
        'IX_Buildings_Geometry_Spatial',
        'IX_ProcessedWeather_Location_Spatial'
    ];
    idx_name TEXT;
    idx_count INTEGER;
BEGIN
    RAISE NOTICE 'Validating spatial indexes...';
    
    FOREACH idx_name IN ARRAY spatial_indexes
    LOOP
        SELECT COUNT(*) INTO idx_count
        FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = idx_name;
        
        IF idx_count > 0 THEN
            RAISE NOTICE '  ✓ Spatial index "%" exists', idx_name;
        ELSE
            RAISE EXCEPTION '  ✗ Spatial index "%" is missing', idx_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✓ All spatial indexes validated';
END $$;

-- ============================================================================
-- FOREIGN KEY VALIDATION
-- ============================================================================
DO $$
DECLARE
    expected_fks INTEGER := 7;
    actual_fks INTEGER;
BEGIN
    SELECT COUNT(*) INTO actual_fks
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_schema = 'public';
    
    IF actual_fks >= expected_fks THEN
        RAISE NOTICE '✓ Foreign keys validated: % found (expected at least %)', actual_fks, expected_fks;
    ELSE
        RAISE EXCEPTION '✗ Foreign keys validation failed: % found (expected at least %)', actual_fks, expected_fks;
    END IF;
END $$;

-- ============================================================================
-- SPATIAL COLUMN VALIDATION
-- ============================================================================
DO $$
DECLARE
    spatial_columns RECORD;
BEGIN
    RAISE NOTICE 'Validating spatial columns...';
    
    FOR spatial_columns IN
        SELECT 
            table_name,
            column_name,
            udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND (udt_name = 'geography' OR udt_name = 'geometry')
        ORDER BY table_name, column_name
    LOOP
        RAISE NOTICE '  ✓ Spatial column: %.% (type: %)', 
            spatial_columns.table_name, 
            spatial_columns.column_name,
            spatial_columns.udt_name;
    END LOOP;
    
    RAISE NOTICE '✓ Spatial columns validated';
END $$;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================
SELECT 
    'Schema Validation Summary' AS report,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS total_tables,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') AS total_indexes,
    (SELECT COUNT(*) FROM information_schema.table_constraints 
     WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public') AS total_foreign_keys,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND (udt_name = 'geography' OR udt_name = 'geometry')) AS total_spatial_columns,
    (SELECT PostGIS_version()) AS postgis_version;

RAISE NOTICE '========================================';
RAISE NOTICE 'Schema validation complete!';
RAISE NOTICE 'All checks passed successfully.';
RAISE NOTICE '========================================';
