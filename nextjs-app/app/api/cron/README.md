# Cron Jobs API

This directory contains Vercel Cron job endpoints for scheduled background tasks.

## Overview

All background jobs have been migrated from .NET Background Services and Hangfire to Vercel Cron jobs. Jobs are configured in `vercel.json` and execute on a schedule.

## Security

All cron endpoints require authentication via `CRON_SECRET` environment variable. Vercel automatically sends this secret in the `Authorization` header when invoking cron jobs.

**Required Environment Variable:**

```env
CRON_SECRET=your-secure-random-secret-key-min-32-chars
```

## Available Jobs

### 1. Weather Ingestion

- **Path:** `/api/cron/weather-ingestion`
- **Schedule:** Every 10 minutes
- **Purpose:** Fetch weather data from external APIs
- **Status:** Structure in place, weather service implementation pending

### 2. Accuracy Metrics

- **Path:** `/api/cron/accuracy-metrics`
- **Schedule:** Every 15 minutes
- **Purpose:** Calculate and cache accuracy metrics
- **Status:** Implemented and functional

### 3. Precomputation Scheduling

- **Path:** `/api/cron/precomputation-schedule`
- **Schedule:** Daily at midnight UTC
- **Purpose:** Schedule precomputation jobs for upcoming dates
- **Status:** Implemented and functional

### 4. Cache Warmup

- **Path:** `/api/cron/cache-warmup`
- **Schedule:** Daily at 3 AM and 3 PM UTC
- **Purpose:** Warm cache with popular patios
- **Status:** Structure in place, cache service implementation pending

### 5. Cleanup Old Data

- **Path:** `/api/cron/cleanup-old-data`
- **Schedule:** Weekly on Sundays at 1 AM UTC
- **Purpose:** Remove expired precomputed data
- **Status:** Implemented and functional

## Long-Running Jobs

### Daily Precomputation Execution

**Status:** Requires alternative solution (too long for Vercel Cron)

The daily precomputation execution can take minutes to hours depending on patio count. This job should be migrated to:

- Supabase Edge Functions (with batching)
- GitHub Actions (scheduled workflow)
- External worker service

See `docs/background-jobs-migration.md` for details.

## Testing

### Manual Testing

Test cron endpoints locally:

```bash
# Set CRON_SECRET
export CRON_SECRET=test-secret

# Test weather ingestion
curl -X POST http://localhost:3000/api/cron/weather-ingestion \
  -H "Authorization: Bearer $CRON_SECRET"

# Test accuracy metrics
curl -X POST http://localhost:3000/api/cron/accuracy-metrics \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Vercel Testing

1. Deploy to Vercel
2. Configure `CRON_SECRET` in Vercel project settings
3. Monitor execution in Vercel Dashboard → Settings → Cron Jobs
4. Check logs for execution results

## Monitoring

- **Vercel Dashboard:** Settings → Cron Jobs → View execution history
- **Logs:** Available in Vercel Dashboard → Logs or via `vercel logs`
- **Metrics:** Execution duration, success/failure rates tracked automatically

## Error Handling

All cron jobs include:

- Authentication verification
- Try-catch error handling
- Error logging to console
- Duration tracking
- Success/failure response

## Implementation Status

- ✅ Cron job structure created
- ✅ Security (CRON_SECRET) implemented
- ✅ Error handling and logging in place
- ✅ Accuracy metrics job fully implemented
- ✅ Precomputation scheduling job fully implemented
- ✅ Cleanup old data job fully implemented
- ⏳ Weather service implementation (pending)
- ⏳ Cache service implementation (pending)
- ⏳ Precomputation execution alternative solution (pending)
