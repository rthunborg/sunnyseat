# Background Jobs Migration Guide

This document describes the migration of background jobs from .NET Background Services and Hangfire to Vercel Cron jobs.

## Overview

All background jobs have been migrated to Vercel Cron jobs (for short-running tasks) or documented for alternative solutions (for long-running tasks).

## Vercel Cron Jobs

### Configuration

Cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/weather-ingestion",
      "schedule": "*/10 * * * *"
    },
    {
      "path": "/api/cron/accuracy-metrics",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/precomputation-schedule",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/cache-warmup",
      "schedule": "0 3,15 * * *"
    },
    {
      "path": "/api/cron/cleanup-old-data",
      "schedule": "0 1 * * 0"
    }
  ]
}
```

### Security

All cron endpoints require authentication via `CRON_SECRET` environment variable:

```env
CRON_SECRET=your-secure-random-secret-key
```

Vercel automatically sends this secret in the `Authorization` header when invoking cron jobs.

### Job Endpoints

#### 1. Weather Ingestion

- **Path:** `/api/cron/weather-ingestion`
- **Schedule:** Every 10 minutes (`*/10 * * * *`)
- **Execution Time:** ~5-30 seconds
- **Status:** Structure in place, weather service implementation pending

#### 2. Accuracy Metrics

- **Path:** `/api/cron/accuracy-metrics`
- **Schedule:** Every 15 minutes (`*/15 * * * *`)
- **Execution Time:** ~2-5 seconds
- **Status:** Implemented and functional

#### 3. Precomputation Scheduling

- **Path:** `/api/cron/precomputation-schedule`
- **Schedule:** Daily at midnight UTC (`0 0 * * *`)
- **Execution Time:** ~1-3 seconds
- **Status:** Implemented and functional

#### 4. Cache Warmup

- **Path:** `/api/cron/cache-warmup`
- **Schedule:** Daily at 3 AM and 3 PM UTC (`0 3,15 * * *`)
- **Execution Time:** ~5-15 seconds
- **Status:** Structure in place, cache service implementation pending

#### 5. Cleanup Old Data

- **Path:** `/api/cron/cleanup-old-data`
- **Schedule:** Weekly on Sundays at 1 AM UTC (`0 1 * * 0`)
- **Execution Time:** ~5-30 seconds
- **Status:** Implemented and functional

## Long-Running Jobs

### Daily Precomputation Execution

**Status:** Requires alternative solution (too long for Vercel Cron)

**Options:**

1. **Supabase Edge Functions** (Recommended)
   - Create Edge Function for precomputation
   - Trigger via Supabase Cron or external scheduler
   - Can run up to 60 seconds (may need batching)

2. **GitHub Actions** (Alternative)
   - Scheduled workflow that calls API endpoint
   - Can run for extended periods
   - Good for batch processing

3. **External Service** (Alternative)
   - Dedicated worker service
   - Can handle long-running tasks
   - More complex setup

**Implementation Note:** The precomputation execution should be broken into batches if using Supabase Edge Functions, or use an external service for full execution.

## Environment Variables

Add to `.env.local` and Vercel project settings:

```env
# Cron Security
CRON_SECRET=your-secure-random-secret-key-min-32-chars

# Weather API (for weather ingestion job)
WEATHER_API_KEY=your-openweathermap-key
WEATHER_API_URL=https://api.openweathermap.org/data/2.5
```

## Monitoring

### Vercel Dashboard

Monitor cron job execution in Vercel Dashboard:

- Go to your project → Settings → Cron Jobs
- View execution history
- Check success/failure rates
- Review execution logs

### Logging

All cron jobs log to console:

- Start/end times
- Execution duration
- Success/failure status
- Error details (if any)

Logs are available in:

- Vercel Dashboard → Logs
- Vercel CLI: `vercel logs`

## Error Handling

All cron jobs include:

- Try-catch error handling
- Error logging
- Graceful failure (returns error response)
- Duration tracking

## Testing

### Local Testing

Test cron endpoints manually:

```bash
# Test weather ingestion
curl -X POST http://localhost:3000/api/cron/weather-ingestion \
  -H "Authorization: Bearer your-cron-secret"

# Test accuracy metrics
curl -X POST http://localhost:3000/api/cron/accuracy-metrics \
  -H "Authorization: Bearer your-cron-secret"
```

### Vercel Testing

1. Deploy to Vercel
2. Configure `CRON_SECRET` in Vercel project settings
3. Wait for scheduled execution or trigger manually via Vercel Dashboard
4. Check logs for execution results

## Migration Checklist

- [x] Weather ingestion job created
- [x] Accuracy metrics job created
- [x] Precomputation scheduling job created
- [x] Cache warmup job created
- [x] Cleanup old data job created
- [x] Vercel Cron configuration in `vercel.json`
- [x] Security (CRON_SECRET) implemented
- [x] Error handling and logging in place
- [ ] Weather service implementation (pending)
- [ ] Cache service implementation (pending)
- [ ] Precomputation execution alternative solution (pending)

## Next Steps

1. Implement weather service for weather ingestion job
2. Implement cache service for cache warmup job
3. Set up alternative solution for daily precomputation execution
4. Configure `CRON_SECRET` in Vercel project settings
5. Deploy and test all cron jobs
6. Monitor job execution in Vercel Dashboard
