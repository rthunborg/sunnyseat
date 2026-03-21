-- Data Validation Script for Supabase Migration
-- This script validates data integrity after migration
-- Run this after importing data to verify migration success

-- ============================================================================
-- ROW COUNT VALIDATION
-- ============================================================================
DO $$
DECLARE
    table_name TEXT;
    row_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'venues', 'patios', 'buildings', 'venue_quality_metrics',
        'sun_windows', 'weather_slices', 'processed_weather', 'feedback',
        'admin_users', 'precomputed_sun_exposure', 'precomputation_schedules'
    ];
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Row Count Validation';
    RAISE NOTICE '========================================';
    
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO row_count;
        RAISE NOTICE '  %: % rows', table_name, row_count;
    END LOOP;
    
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- SAMPLE DATA VALIDATION
-- ============================================================================
DO $$
DECLARE
    sample_venue RECORD;
    sample_patio RECORD;
    sample_building RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Sample Data Validation';
    RAISE NOTICE '========================================';
    
    -- Sample venue
    SELECT * INTO sample_venue FROM venues LIMIT 1;
    IF FOUND THEN
        RAISE NOTICE 'Sample Venue:';
        RAISE NOTICE '  ID: %', sample_venue."Id";
        RAISE NOTICE '  Name: %', sample_venue."Name";
        RAISE NOTICE '  Location: %', ST_AsText(sample_venue."Location");
    ELSE
        RAISE NOTICE '  No venues found';
    END IF;
    
    -- Sample patio
    SELECT * INTO sample_patio FROM patios LIMIT 1;
    IF FOUND THEN
        RAISE NOTICE 'Sample Patio:';
        RAISE NOTICE '  ID: %', sample_patio."Id";
        RAISE NOTICE '  Name: %', sample_patio."Name";
        RAISE NOTICE '  VenueId: %', sample_patio."VenueId";
        RAISE NOTICE '  Geometry: %', ST_AsText(sample_patio."Geometry");
    ELSE
        RAISE NOTICE '  No patios found';
    END IF;
    
    -- Sample building
    SELECT * INTO sample_building FROM buildings LIMIT 1;
    IF FOUND THEN
        RAISE NOTICE 'Sample Building:';
        RAISE NOTICE '  ID: %', sample_building."Id";
        RAISE NOTICE '  Height: %', sample_building."Height";
        RAISE NOTICE '  Geometry: %', ST_AsText(sample_building."Geometry");
    ELSE
        RAISE NOTICE '  No buildings found';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- SPATIAL DATA VALIDATION
-- ============================================================================
DO $$
DECLARE
    spatial_validation RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Spatial Data Validation';
    RAISE NOTICE '========================================';
    
    -- Validate venues location
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN ST_IsValid("Location") THEN 1 END) as valid,
        COUNT(CASE WHEN NOT ST_IsValid("Location") THEN 1 END) as invalid
    INTO spatial_validation
    FROM venues;
    
    RAISE NOTICE 'Venues Location:';
    RAISE NOTICE '  Total: %', spatial_validation.total;
    RAISE NOTICE '  Valid geometries: %', spatial_validation.valid;
    RAISE NOTICE '  Invalid geometries: %', spatial_validation.invalid;
    
    -- Validate patios geometry
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN ST_IsValid("Geometry") THEN 1 END) as valid,
        COUNT(CASE WHEN NOT ST_IsValid("Geometry") THEN 1 END) as invalid
    INTO spatial_validation
    FROM patios;
    
    RAISE NOTICE 'Patios Geometry:';
    RAISE NOTICE '  Total: %', spatial_validation.total;
    RAISE NOTICE '  Valid geometries: %', spatial_validation.valid;
    RAISE NOTICE '  Invalid geometries: %', spatial_validation.invalid;
    
    -- Validate buildings geometry
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN ST_IsValid("Geometry") THEN 1 END) as valid,
        COUNT(CASE WHEN NOT ST_IsValid("Geometry") THEN 1 END) as invalid
    INTO spatial_validation
    FROM buildings;
    
    RAISE NOTICE 'Buildings Geometry:';
    RAISE NOTICE '  Total: %', spatial_validation.total;
    RAISE NOTICE '  Valid geometries: %', spatial_validation.valid;
    RAISE NOTICE '  Invalid geometries: %', spatial_validation.invalid;
    
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- FOREIGN KEY RELATIONSHIP VALIDATION
-- ============================================================================
DO $$
DECLARE
    fk_check RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Foreign Key Relationship Validation';
    RAISE NOTICE '========================================';
    
    -- Check patios -> venues
    SELECT 
        COUNT(*) as total_patios,
        COUNT(v."Id") as valid_fks,
        COUNT(*) - COUNT(v."Id") as orphaned
    INTO fk_check
    FROM patios p
    LEFT JOIN venues v ON p."VenueId" = v."Id";
    
    RAISE NOTICE 'Patios -> Venues:';
    RAISE NOTICE '  Total patios: %', fk_check.total_patios;
    RAISE NOTICE '  Valid foreign keys: %', fk_check.valid_fks;
    RAISE NOTICE '  Orphaned records: %', fk_check.orphaned;
    
    -- Check sun_windows -> patios
    SELECT 
        COUNT(*) as total_windows,
        COUNT(p."Id") as valid_fks,
        COUNT(*) - COUNT(p."Id") as orphaned
    INTO fk_check
    FROM sun_windows sw
    LEFT JOIN patios p ON sw."PatioId" = p."Id";
    
    RAISE NOTICE 'Sun Windows -> Patios:';
    RAISE NOTICE '  Total windows: %', fk_check.total_windows;
    RAISE NOTICE '  Valid foreign keys: %', fk_check.valid_fks;
    RAISE NOTICE '  Orphaned records: %', fk_check.orphaned;
    
    -- Check feedback -> patios and venues
    SELECT 
        COUNT(*) as total_feedback,
        COUNT(DISTINCT CASE WHEN p."Id" IS NOT NULL THEN f."Id" END) as valid_patio_fks,
        COUNT(DISTINCT CASE WHEN v."Id" IS NOT NULL THEN f."Id" END) as valid_venue_fks
    INTO fk_check
    FROM feedback f
    LEFT JOIN patios p ON f."PatioId" = p."Id"
    LEFT JOIN venues v ON f."VenueId" = v."Id";
    
    RAISE NOTICE 'Feedback -> Patios/Venues:';
    RAISE NOTICE '  Total feedback: %', fk_check.total_feedback;
    RAISE NOTICE '  Valid patio FKs: %', fk_check.valid_patio_fks;
    RAISE NOTICE '  Valid venue FKs: %', fk_check.valid_venue_fks;
    
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- SPATIAL QUERY TEST
-- ============================================================================
DO $$
DECLARE
    test_point GEOGRAPHY;
    nearby_venues INTEGER;
    test_result RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Spatial Query Test';
    RAISE NOTICE '========================================';
    
    -- Test point: Gothenburg city center (approximately)
    test_point := ST_GeogFromText('POINT(11.9746 57.7089)');
    
    -- Find venues within 5km
    SELECT COUNT(*) INTO nearby_venues
    FROM venues
    WHERE ST_DWithin("Location", test_point, 5000);  -- 5000 meters = 5km
    
    RAISE NOTICE 'Venues within 5km of Gothenburg center: %', nearby_venues;
    
    -- Test spatial distance calculation
    SELECT 
        v."Name",
        ST_Distance(v."Location", test_point) / 1000.0 as distance_km
    INTO test_result
    FROM venues v
    ORDER BY v."Location" <-> test_point
    LIMIT 1;
    
    IF FOUND THEN
        RAISE NOTICE 'Nearest venue: % (%.2f km)', test_result."Name", test_result.distance_km;
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================
SELECT 
    'Data Migration Validation Summary' AS report,
    (SELECT COUNT(*) FROM venues) AS venues_count,
    (SELECT COUNT(*) FROM patios) AS patios_count,
    (SELECT COUNT(*) FROM buildings) AS buildings_count,
    (SELECT COUNT(*) FROM sun_windows) AS sun_windows_count,
    (SELECT COUNT(*) FROM feedback) AS feedback_count,
    (SELECT COUNT(*) FROM admin_users) AS admin_users_count,
    (SELECT COUNT(*) FROM weather_slices) AS weather_slices_count,
    (SELECT COUNT(*) FROM processed_weather) AS processed_weather_count,
    (SELECT COUNT(*) FROM precomputed_sun_exposure) AS precomputed_sun_exposure_count,
    (SELECT COUNT(*) FROM venue_quality_metrics) AS venue_quality_metrics_count,
    (SELECT COUNT(*) FROM precomputation_schedules) AS precomputation_schedules_count;

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE 'Validation Complete!';
RAISE NOTICE 'Review the results above to verify data integrity.';
RAISE NOTICE '========================================';
