-- Create all indexes for SunnySeat database
-- This includes spatial GIST indexes and regular B-tree indexes
-- Run after tables are created

-- ============================================================================
-- SPATIAL INDEXES (GIST) - Critical for spatial query performance
-- ============================================================================

-- Venues spatial index
CREATE INDEX IF NOT EXISTS "IX_Venues_Location_Spatial" 
ON venues USING GIST ("Location");

-- Patios spatial index
CREATE INDEX IF NOT EXISTS "IX_Patios_Geometry_Spatial" 
ON patios USING GIST ("Geometry");

-- Buildings spatial index
CREATE INDEX IF NOT EXISTS "IX_Buildings_Geometry_Spatial" 
ON buildings USING GIST ("Geometry");

-- ProcessedWeather spatial index
CREATE INDEX IF NOT EXISTS "IX_ProcessedWeather_Location_Spatial" 
ON processed_weather USING GIST ("Location");

-- ============================================================================
-- VENUES INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IX_Venues_IsActive" ON venues ("IsActive");
CREATE INDEX IF NOT EXISTS "IX_Venues_IsMapped" ON venues ("IsMapped");
CREATE INDEX IF NOT EXISTS "IX_Venues_Type" ON venues ("Type");
CREATE INDEX IF NOT EXISTS "IX_Venues_Name" ON venues ("Name");

-- ============================================================================
-- PATIOS INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IX_Patios_VenueId" ON patios ("VenueId");
CREATE INDEX IF NOT EXISTS "IX_Patios_ReviewNeeded" ON patios ("ReviewNeeded");
CREATE INDEX IF NOT EXISTS "IX_Patios_PolygonQuality" ON patios ("PolygonQuality");
CREATE INDEX IF NOT EXISTS "IX_Patios_HeightSource" ON patios ("HeightSource");

-- ============================================================================
-- BUILDINGS INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IX_Buildings_Source" ON buildings ("Source");
CREATE INDEX IF NOT EXISTS "IX_Buildings_CreatedAt" ON buildings ("CreatedAt");
CREATE INDEX IF NOT EXISTS "IX_Buildings_ExternalId_Source" 
ON buildings ("ExternalId", "Source") 
WHERE "ExternalId" IS NOT NULL;

-- ============================================================================
-- VENUE_QUALITY_METRICS INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IX_VenueQualityMetrics_VenueId" 
ON venue_quality_metrics ("VenueId");
CREATE INDEX IF NOT EXISTS "IX_VenueQualityMetrics_OverallQuality" 
ON venue_quality_metrics ("OverallQuality");
CREATE INDEX IF NOT EXISTS "IX_VenueQualityMetrics_AssessedAt" 
ON venue_quality_metrics ("AssessedAt");

-- ============================================================================
-- SUN_WINDOWS INDEXES (Date-based queries are critical)
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IX_SunWindows_Date" ON sun_windows ("Date");
CREATE INDEX IF NOT EXISTS "IX_SunWindows_StartTime" ON sun_windows ("StartTime");
CREATE INDEX IF NOT EXISTS "IX_SunWindows_PatioId_Date" 
ON sun_windows ("PatioId", "Date");

-- ============================================================================
-- WEATHER_SLICES INDEXES (Temporal queries)
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IX_WeatherSlices_Timestamp" 
ON weather_slices ("Timestamp");
CREATE INDEX IF NOT EXISTS "IX_WeatherSlices_Source_Timestamp" 
ON weather_slices ("Source", "Timestamp");
CREATE INDEX IF NOT EXISTS "IX_WeatherSlices_IsForecast" 
ON weather_slices ("IsForecast");

-- ============================================================================
-- PROCESSED_WEATHER INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IX_ProcessedWeather_Timestamp" 
ON processed_weather ("Timestamp");
CREATE INDEX IF NOT EXISTS "IX_ProcessedWeather_WeatherSliceId" 
ON processed_weather ("WeatherSliceId");
CREATE INDEX IF NOT EXISTS "IX_ProcessedWeather_Timestamp_IsSunBlocking" 
ON processed_weather ("Timestamp", "IsSunBlocking");
CREATE INDEX IF NOT EXISTS "IX_ProcessedWeather_ProcessedAt" 
ON processed_weather ("ProcessedAt");

-- ============================================================================
-- FEEDBACK INDEXES (Analytics queries)
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IX_Feedback_BinnedTimestamp" 
ON feedback ("BinnedTimestamp");
CREATE INDEX IF NOT EXISTS "IX_Feedback_PatioId_BinnedTimestamp" 
ON feedback ("PatioId", "BinnedTimestamp");
CREATE INDEX IF NOT EXISTS "IX_Feedback_VenueId_UserTimestamp" 
ON feedback ("VenueId", "UserTimestamp");

-- ============================================================================
-- ADMIN_USERS INDEXES
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS "IX_AdminUsers_Username" 
ON admin_users ("Username");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_AdminUsers_Email" 
ON admin_users ("Email");
CREATE INDEX IF NOT EXISTS "IX_AdminUsers_Role" ON admin_users ("Role");
CREATE INDEX IF NOT EXISTS "IX_AdminUsers_IsActive" ON admin_users ("IsActive");
CREATE INDEX IF NOT EXISTS "IX_AdminUsers_RefreshToken" 
ON admin_users ("RefreshToken") 
WHERE "RefreshToken" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "IX_AdminUsers_CreatedAt" 
ON admin_users ("CreatedAt");

-- ============================================================================
-- PRECOMPUTED_SUN_EXPOSURE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IX_PrecomputedSunExposure_Date" 
ON precomputed_sun_exposure ("Date");
CREATE INDEX IF NOT EXISTS "IX_PrecomputedSunExposure_Date_PatioId" 
ON precomputed_sun_exposure ("Date", "PatioId");
CREATE INDEX IF NOT EXISTS "IX_PrecomputedSunExposure_PatioId_Date_Time" 
ON precomputed_sun_exposure ("PatioId", "Date", "Time");
CREATE INDEX IF NOT EXISTS "IX_PrecomputedSunExposure_IsStale" 
ON precomputed_sun_exposure ("IsStale");
CREATE INDEX IF NOT EXISTS "IX_PrecomputedSunExposure_ExpiresAt" 
ON precomputed_sun_exposure ("ExpiresAt");

-- ============================================================================
-- PRECOMPUTATION_SCHEDULES INDEXES
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS "IX_PrecomputationSchedules_TargetDate" 
ON precomputation_schedules ("TargetDate");
CREATE INDEX IF NOT EXISTS "IX_PrecomputationSchedules_Status" 
ON precomputation_schedules ("Status");
CREATE INDEX IF NOT EXISTS "IX_PrecomputationSchedules_Status_TargetDate" 
ON precomputation_schedules ("Status", "TargetDate");
