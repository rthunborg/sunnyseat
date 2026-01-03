-- Create foreign key constraints for SunnySeat database
-- This script establishes all relationships between tables
-- Run after tables and indexes are created

-- ============================================================================
-- PATIOS FOREIGN KEYS
-- ============================================================================
ALTER TABLE patios
ADD CONSTRAINT IF NOT EXISTS "FK_Patios_Venues_VenueId"
FOREIGN KEY ("VenueId") 
REFERENCES venues ("Id") 
ON DELETE CASCADE;

-- ============================================================================
-- VENUE_QUALITY_METRICS FOREIGN KEYS
-- ============================================================================
ALTER TABLE venue_quality_metrics
ADD CONSTRAINT IF NOT EXISTS "FK_VenueQualityMetrics_Venues_VenueId"
FOREIGN KEY ("VenueId") 
REFERENCES venues ("Id") 
ON DELETE CASCADE;

-- ============================================================================
-- SUN_WINDOWS FOREIGN KEYS
-- ============================================================================
ALTER TABLE sun_windows
ADD CONSTRAINT IF NOT EXISTS "FK_SunWindows_Patios_PatioId"
FOREIGN KEY ("PatioId") 
REFERENCES patios ("Id") 
ON DELETE CASCADE;

-- ============================================================================
-- PROCESSED_WEATHER FOREIGN KEYS
-- ============================================================================
ALTER TABLE processed_weather
ADD CONSTRAINT IF NOT EXISTS "FK_ProcessedWeather_WeatherSlices_WeatherSliceId"
FOREIGN KEY ("WeatherSliceId") 
REFERENCES weather_slices ("Id") 
ON DELETE CASCADE;

-- ============================================================================
-- FEEDBACK FOREIGN KEYS
-- ============================================================================
ALTER TABLE feedback
ADD CONSTRAINT IF NOT EXISTS "FK_Feedback_Patios_PatioId"
FOREIGN KEY ("PatioId") 
REFERENCES patios ("Id") 
ON DELETE CASCADE;

ALTER TABLE feedback
ADD CONSTRAINT IF NOT EXISTS "FK_Feedback_Venues_VenueId"
FOREIGN KEY ("VenueId") 
REFERENCES venues ("Id") 
ON DELETE CASCADE;

-- ============================================================================
-- PRECOMPUTED_SUN_EXPOSURE FOREIGN KEYS
-- ============================================================================
ALTER TABLE precomputed_sun_exposure
ADD CONSTRAINT IF NOT EXISTS "FK_PrecomputedSunExposure_Patios_PatioId"
FOREIGN KEY ("PatioId") 
REFERENCES patios ("Id") 
ON DELETE CASCADE;
