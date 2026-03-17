-- Create foreign key constraints for SunnySeat database
-- This script establishes all relationships between tables
-- Run after tables and indexes are created
-- Uses DO blocks for idempotency (PostgreSQL has no ADD CONSTRAINT IF NOT EXISTS)

-- ============================================================================
-- PATIOS FOREIGN KEYS
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_Patios_Venues_VenueId') THEN
    ALTER TABLE patios ADD CONSTRAINT "FK_Patios_Venues_VenueId"
      FOREIGN KEY ("VenueId") REFERENCES venues ("Id") ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- VENUE_QUALITY_METRICS FOREIGN KEYS
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_VenueQualityMetrics_Venues_VenueId') THEN
    ALTER TABLE venue_quality_metrics ADD CONSTRAINT "FK_VenueQualityMetrics_Venues_VenueId"
      FOREIGN KEY ("VenueId") REFERENCES venues ("Id") ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- SUN_WINDOWS FOREIGN KEYS
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_SunWindows_Patios_PatioId') THEN
    ALTER TABLE sun_windows ADD CONSTRAINT "FK_SunWindows_Patios_PatioId"
      FOREIGN KEY ("PatioId") REFERENCES patios ("Id") ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- PROCESSED_WEATHER FOREIGN KEYS
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ProcessedWeather_WeatherSlices_WeatherSliceId') THEN
    ALTER TABLE processed_weather ADD CONSTRAINT "FK_ProcessedWeather_WeatherSlices_WeatherSliceId"
      FOREIGN KEY ("WeatherSliceId") REFERENCES weather_slices ("Id") ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- FEEDBACK FOREIGN KEYS
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_Feedback_Patios_PatioId') THEN
    ALTER TABLE feedback ADD CONSTRAINT "FK_Feedback_Patios_PatioId"
      FOREIGN KEY ("PatioId") REFERENCES patios ("Id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_Feedback_Venues_VenueId') THEN
    ALTER TABLE feedback ADD CONSTRAINT "FK_Feedback_Venues_VenueId"
      FOREIGN KEY ("VenueId") REFERENCES venues ("Id") ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- PRECOMPUTED_SUN_EXPOSURE FOREIGN KEYS
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_PrecomputedSunExposure_Patios_PatioId') THEN
    ALTER TABLE precomputed_sun_exposure ADD CONSTRAINT "FK_PrecomputedSunExposure_Patios_PatioId"
      FOREIGN KEY ("PatioId") REFERENCES patios ("Id") ON DELETE CASCADE;
  END IF;
END $$;
