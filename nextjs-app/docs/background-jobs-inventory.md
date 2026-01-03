# Background Jobs Inventory

This document inventories all background jobs in the SunnySeat application that need to be migrated to Vercel Cron or alternative solutions.

## Current Background Jobs

### 1. Weather Ingestion Service

**Type:** Continuous Background Service  
**Current Implementation:** `WeatherIngestionService` (BackgroundService)  
**Schedule:** Runs continuously, executes every 10 minutes (configurable)  
**Execution Time:** ~5-30 seconds (depends on API response times)  
**Purpose:** Ingest weather data from Met.no (primary) and OpenWeatherMap (fallback)  
**Dependencies:**

- MetNoWeatherService
- OpenWeatherMapService
- WeatherRepository
- WeatherProcessingService

**Tasks:**

- Fetch weather forecast for Gothenburg coordinates
- Store weather data in database
- Process weather data for use in sun calculations
- Cleanup old weather data (older than retention period)

**Migration Strategy:** Convert to Vercel Cron job (short-running, <10s typical)

---

### 2. Accuracy Metrics Background Service

**Type:** Continuous Background Service  
**Current Implementation:** `AccuracyMetricsBackgroundService` (BackgroundService)  
**Schedule:** Runs continuously, executes every 15 minutes  
**Execution Time:** ~2-5 seconds  
**Purpose:** Calculate and cache accuracy metrics for monitoring  
**Dependencies:**

- IAccuracyTrackingService
- IAlertingService
- IAccuracyMetricsBroadcaster (SignalR)

**Tasks:**

- Calculate 14-day rolling accuracy metrics
- Identify problematic venues (<80% accuracy)
- Check accuracy alert thresholds
- Cache metrics for quick access
- Broadcast updates via SignalR (if available)
- Send alerts for problematic venues

**Migration Strategy:** Convert to Vercel Cron job (short-running, <10s)

---

### 3. Precomputation Scheduling Job

**Type:** Scheduled Recurring Job (Hangfire)  
**Current Implementation:** `PrecomputationBackgroundJobs.ScheduleUpcomingPrecomputations()`  
**Schedule:** Daily at midnight (0 0 \* \* \*) - W. Europe Standard Time  
**Execution Time:** ~1-3 seconds  
**Purpose:** Schedule precomputation jobs for upcoming dates  
**Dependencies:**

- IPrecomputationService

**Tasks:**

- Check if precomputation is needed for today, tomorrow, day after
- Schedule precomputation jobs for dates that need it
- Schedule execution at 2 AM local time for each date

**Migration Strategy:** Convert to Vercel Cron job (short-running, <10s)

---

### 4. Daily Precomputation Execution

**Type:** Scheduled Job (Hangfire)  
**Current Implementation:** `PrecomputationBackgroundJobs.ExecuteDailyPrecomputationJob()`  
**Schedule:** Daily at 2 AM local time (scheduled dynamically)  
**Execution Time:** **LONG-RUNNING** - Can take minutes to hours depending on patio count  
**Purpose:** Precompute sun exposure data for all patios for a specific date  
**Dependencies:**

- IPrecomputationService
- ISunExposureService
- IPatioRepository
- IPrecomputationRepository

**Tasks:**

- Get all mapped patios
- For each patio, calculate sun exposure for all time slots (8 AM - 8 PM, 10-minute intervals)
- Store precomputed data in database
- Update precomputation schedule status

**Migration Strategy:** **Alternative solution required** (Supabase Edge Functions or external service) - Too long for Vercel Cron

---

### 5. Cache Warmup Job

**Type:** Scheduled Recurring Job (Hangfire)  
**Current Implementation:** `PrecomputationBackgroundJobs.CacheWarmupJob()`  
**Schedule:** Daily at 3 AM and 3 PM (0 3,15 \* \* \*) - W. Europe Standard Time  
**Execution Time:** ~5-15 seconds  
**Purpose:** Warm cache with popular patios during low-traffic hours  
**Dependencies:**

- ICacheService

**Tasks:**

- Get popular patios
- Precompute sun exposure for next 4 hours
- Store in cache for quick access

**Migration Strategy:** Convert to Vercel Cron job (short-running, <10s typical)

---

### 6. Cleanup Old Data Job

**Type:** Scheduled Recurring Job (Hangfire)  
**Current Implementation:** `PrecomputationBackgroundJobs.CleanupExpiredDataJob()`  
**Schedule:** Weekly on Sundays at 1 AM (0 1 \* \* SUN) - W. Europe Standard Time  
**Execution Time:** ~5-30 seconds (depends on data volume)  
**Purpose:** Cleanup expired precomputed data older than retention period  
**Dependencies:**

- IPrecomputationRepository

**Tasks:**

- Find expired precomputed sun exposure records
- Delete expired records
- Update statistics

**Migration Strategy:** Convert to Vercel Cron job (short-running, <10s typical)

---

## Job Categorization

### Short-Running Jobs (<10s) - Vercel Cron

1. ✅ Weather Ingestion (5-30s typical, but can be optimized)
2. ✅ Accuracy Metrics Calculation (2-5s)
3. ✅ Precomputation Scheduling (1-3s)
4. ✅ Cache Warmup (5-15s)
5. ✅ Cleanup Old Data (5-30s)

### Long-Running Jobs (>10s) - Alternative Solution

1. ⚠️ Daily Precomputation Execution (minutes to hours) - **Requires alternative solution**

---

## Migration Notes

### Weather Ingestion

- Current: Continuous service running every 10 minutes
- Migration: Vercel Cron job every 10 minutes
- Note: May need to optimize to ensure <10s execution (or use Pro plan for 50s limit)

### Accuracy Metrics

- Current: Continuous service running every 15 minutes
- Migration: Vercel Cron job every 15 minutes
- Note: SignalR broadcasting may need to be replaced with alternative (webhooks, polling, etc.)

### Precomputation Execution

- Current: Scheduled via Hangfire at 2 AM
- Migration: **Supabase Edge Functions** or **GitHub Actions** (long-running)
- Alternative: Break into smaller batches processed over multiple cron jobs

---

## Schedule Summary

| Job                       | Current Schedule    | Vercel Cron Schedule     | Notes               |
| ------------------------- | ------------------- | ------------------------ | ------------------- |
| Weather Ingestion         | Every 10 minutes    | `*/10 * * * *`           | UTC                 |
| Accuracy Metrics          | Every 15 minutes    | `*/15 * * * *`           | UTC                 |
| Precomputation Scheduling | Daily at midnight   | `0 0 * * *`              | UTC (was W. Europe) |
| Daily Precomputation      | Daily at 2 AM local | See alternative solution | Too long for Cron   |
| Cache Warmup              | 3 AM and 3 PM daily | `0 3,15 * * *`           | UTC (was W. Europe) |
| Cleanup Old Data          | Sundays at 1 AM     | `0 1 * * 0`              | UTC (was W. Europe) |

**Note:** Timezone conversion from W. Europe Standard Time to UTC:

- W. Europe Standard Time = UTC+1 (winter) / UTC+2 (summer)
- Midnight W. Europe = 23:00 UTC (winter) / 22:00 UTC (summer)
- 2 AM W. Europe = 01:00 UTC (winter) / 00:00 UTC (summer)
- 3 AM W. Europe = 02:00 UTC (winter) / 01:00 UTC (summer)
- 1 AM W. Europe = 00:00 UTC (winter) / 23:00 UTC (summer)

For simplicity, using UTC times. Consider using Europe/Stockholm timezone if Vercel supports it.
