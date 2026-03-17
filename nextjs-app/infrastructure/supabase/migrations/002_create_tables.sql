-- Create all database tables for SunnySeat
-- This script creates all tables matching the Azure PostgreSQL schema
-- Run after PostGIS extension is enabled

-- ============================================================================
-- VENUES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS venues (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(200) NOT NULL,
    "Address" VARCHAR(500) NOT NULL,
    "Phone" VARCHAR(50),
    "Website" VARCHAR(500),
    "Type" INTEGER NOT NULL,
    "Description" VARCHAR(1000),
    "Location" GEOGRAPHY(POINT, 4326) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "IsMapped" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PATIOS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS patios (
    "Id" SERIAL PRIMARY KEY,
    "VenueId" INTEGER NOT NULL,
    "Name" VARCHAR(100) NOT NULL,
    "Geometry" GEOGRAPHY(POLYGON, 4326) NOT NULL,
    "HeightM" NUMERIC(5, 2),
    "HeightSource" INTEGER NOT NULL,
    "PolygonQuality" NUMERIC(3, 2) NOT NULL,
    "Orientation" VARCHAR(50),
    "Notes" VARCHAR(500),
    "ReviewNeeded" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- BUILDINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS buildings (
    "Id" SERIAL PRIMARY KEY,
    "Geometry" GEOGRAPHY NOT NULL,
    "Height" NUMERIC(6, 2) NOT NULL,
    "HeightM" DOUBLE PRECISION,
    "HeightSource" INTEGER NOT NULL,
    "Source" VARCHAR(50) NOT NULL,
    "QualityScore" NUMERIC(4, 3) NOT NULL,
    "ExternalId" VARCHAR(100),
    "BuildingType" TEXT,
    "AdminHeightOverride" DOUBLE PRECISION,
    "UpdatedBy" TEXT,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- VENUE_QUALITY_METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS venue_quality_metrics (
    "Id" SERIAL PRIMARY KEY,
    "VenueId" INTEGER NOT NULL,
    "OverallQuality" NUMERIC(3, 2) NOT NULL,
    "AveragePatioQuality" NUMERIC(3, 2) NOT NULL,
    "PatioCount" INTEGER NOT NULL,
    "HasAccurateLocation" BOOLEAN NOT NULL,
    "HasCompleteMetadata" BOOLEAN NOT NULL,
    "HasQualityPatios" BOOLEAN NOT NULL,
    "ValidationIssues" TEXT NOT NULL,
    "AssessedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SUN_WINDOWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sun_windows (
    "Id" SERIAL PRIMARY KEY,
    "PatioId" INTEGER NOT NULL,
    "Date" DATE NOT NULL,
    "StartTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "EndTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "LocalStartTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "LocalEndTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "PeakExposureTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "LocalPeakExposureTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "PeakExposure" NUMERIC(3, 2) NOT NULL,
    "AverageExposurePercent" DOUBLE PRECISION NOT NULL,
    "MinExposurePercent" DOUBLE PRECISION NOT NULL,
    "MaxExposurePercent" DOUBLE PRECISION NOT NULL,
    "Confidence" NUMERIC(3, 2) NOT NULL,
    "DataPointCount" INTEGER NOT NULL,
    "Quality" INTEGER NOT NULL,
    "IsRecommended" BOOLEAN NOT NULL,
    "PriorityScore" DOUBLE PRECISION NOT NULL,
    "Description" TEXT NOT NULL,
    "RecommendationReason" TEXT NOT NULL,
    "CalculatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- WEATHER_SLICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS weather_slices (
    "Id" SERIAL PRIMARY KEY,
    "Timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
    "CloudCover" NUMERIC(5, 2) NOT NULL,
    "PrecipitationProbability" NUMERIC(3, 2) NOT NULL,
    "Temperature" NUMERIC(4, 1) NOT NULL,
    "Visibility" NUMERIC(5, 2),
    "Source" VARCHAR(50) NOT NULL,
    "IsForecast" BOOLEAN NOT NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PROCESSED_WEATHER TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS processed_weather (
    "Id" SERIAL PRIMARY KEY,
    "WeatherSliceId" INTEGER NOT NULL,
    "Timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
    "Location" GEOGRAPHY(POINT, 4326),
    "NormalizedCloudCover" NUMERIC(5, 2) NOT NULL,
    "PrecipitationIntensity" NUMERIC(5, 2) NOT NULL,
    "Condition" INTEGER NOT NULL,
    "IsSunBlocking" BOOLEAN NOT NULL,
    "ConfidenceLevel" NUMERIC(3, 2) NOT NULL,
    "ProcessedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- FEEDBACK TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback (
    "Id" SERIAL PRIMARY KEY,
    "PatioId" INTEGER NOT NULL,
    "VenueId" INTEGER NOT NULL,
    "UserTimestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
    "BinnedTimestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
    "PredictedState" VARCHAR(20) NOT NULL,
    "WasSunny" BOOLEAN NOT NULL,
    "ConfidenceAtPrediction" NUMERIC(3, 2) NOT NULL,
    "IpAddress" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ADMIN_USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
    "Id" SERIAL PRIMARY KEY,
    "Username" VARCHAR(50) NOT NULL,
    "Email" VARCHAR(255) NOT NULL,
    "PasswordHash" VARCHAR(255) NOT NULL,
    "Role" VARCHAR(50) NOT NULL DEFAULT 'Admin',
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "Claims" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "RefreshToken" VARCHAR(500),
    "RefreshTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
    "LastLoginAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PRECOMPUTED_SUN_EXPOSURE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS precomputed_sun_exposure (
    "Id" SERIAL PRIMARY KEY,
    "PatioId" INTEGER NOT NULL,
    "Date" DATE NOT NULL,
    "Time" TIME WITHOUT TIME ZONE NOT NULL,
    "Timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
    "LocalTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "State" INTEGER NOT NULL,
    "SunExposurePercent" DOUBLE PRECISION NOT NULL,
    "SunlitAreaSqM" DOUBLE PRECISION NOT NULL,
    "ShadedAreaSqM" DOUBLE PRECISION NOT NULL,
    "SolarElevation" DOUBLE PRECISION NOT NULL,
    "SolarAzimuth" DOUBLE PRECISION NOT NULL,
    "Confidence" DOUBLE PRECISION NOT NULL,
    "AffectingBuildingsCount" INTEGER NOT NULL,
    "ComputationVersion" TEXT NOT NULL,
    "CompressedSunlitGeometry" BYTEA,
    "CalculationDuration" INTERVAL NOT NULL,
    "ComputedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "ExpiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "IsStale" BOOLEAN NOT NULL DEFAULT false
);

-- ============================================================================
-- PRECOMPUTATION_SCHEDULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS precomputation_schedules (
    "Id" SERIAL PRIMARY KEY,
    "TargetDate" DATE NOT NULL,
    "Status" INTEGER NOT NULL,
    "ScheduledAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "StartedAt" TIMESTAMP WITH TIME ZONE,
    "CompletedAt" TIMESTAMP WITH TIME ZONE,
    "PatiosTotal" INTEGER NOT NULL,
    "PatiosProcessed" INTEGER NOT NULL,
    "RetryCount" INTEGER NOT NULL DEFAULT 0,
    "JobId" TEXT,
    "ErrorMessage" TEXT,
    "Metrics" TEXT NOT NULL,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);
