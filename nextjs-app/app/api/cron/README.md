# Scheduled Background Jobs API

This directory contains API endpoints for scheduled background tasks that are triggered by GitHub Actions workflows.

## Overview

All background jobs have been migrated from .NET Background Services and Hangfire to API endpoints that are called by GitHub Actions scheduled workflows. This approach avoids Vercel Hobby account limitations (2 cron jobs total across all projects).

**Scheduling:** Jobs are triggered by GitHub Actions workflows in `.github/workflows/scheduled-jobs-*.yml`

## Security

All endpoints require authentication via `CRON_SECRET` environment variable. GitHub Actions workflows send this secret in the `Authorization` header when invoking the endpoints.

**Required Environment Variables:**

```env
CRON_SECRET=your-secure-random-secret-key-min-32-chars
```

**GitHub Secrets Required:**
- `CRON_SECRET` - Same value as above
- `VERCEL_APP_URL` - Your Vercel deployment URL (e.g., `https://sunnyseat.se` or `https://your-app.vercel.app`)

## Available Jobs

### 1. Weather Ingestion

- **Path:** `/api/cron/weather-ingestion`
- **Schedule:** Daily at 2 AM UTC (was every 10 minutes, limited by Vercel Hobby account)
- **Purpose:** Fetch weather data from external APIs
- **Status:** Structure in place, weather service implementation pending

### 2. Accuracy Metrics

- **Path:** `/api/cron/accuracy-metrics`
- **Schedule:** Daily at 4 AM UTC (was every 15 minutes, limited by Vercel Hobby account)
- **Purpose:** Calculate and cache accuracy metrics
- **Status:** Implemented and functional

### 3. Precomputation Scheduling

- **Path:** `/api/cron/precomputation-schedule`
- **Schedule:** Daily at midnight UTC
- **Purpose:** Schedule precomputation jobs for upcoming dates
- **Status:** Implemented and functional

### 4. Cache Warmup

- **Path:** `/api/cron/cache-warmup`
- **Schedule:** Daily at 3 AM UTC (was twice daily, limited by Vercel Hobby account)
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

### GitHub Actions Testing

1. Deploy to Vercel
2. Configure `CRON_SECRET` and `VERCEL_APP_URL` in GitHub repository secrets
3. Manually trigger workflows from GitHub Actions tab → "Run workflow"
4. Monitor execution in GitHub Actions → Workflow runs
5. Check Vercel logs for endpoint execution results

## Monitoring

- **GitHub Actions:** View workflow runs in `.github/workflows/` → Workflow runs tab
- **Vercel Logs:** Available in Vercel Dashboard → Logs or via `vercel logs`
- **Metrics:** Execution duration, success/failure rates tracked in both GitHub Actions and Vercel

## Error Handling

All cron jobs include:

- Authentication verification
- Try-catch error handling
- Error logging to console
- Duration tracking
- Success/failure response

## Implementation Status

- ✅ API endpoint structure created
- ✅ Security (CRON_SECRET) implemented
- ✅ Error handling and logging in place
- ✅ GitHub Actions workflows configured
- ✅ Accuracy metrics job fully implemented
- ✅ Precomputation scheduling job fully implemented
- ✅ Cleanup old data job fully implemented
- ⏳ Weather service implementation (pending)
- ⏳ Cache service implementation (pending)
- ⏳ Precomputation execution alternative solution (pending)

## GitHub Actions Workflows

Scheduled jobs are triggered by the following workflows:

- `.github/workflows/scheduled-jobs-precomputation.yml` - Daily at midnight UTC
- `.github/workflows/scheduled-jobs-weather.yml` - Daily at 2 AM UTC
- `.github/workflows/scheduled-jobs-cache.yml` - Daily at 3 AM UTC
- `.github/workflows/scheduled-jobs-accuracy.yml` - Daily at 4 AM UTC
- `.github/workflows/scheduled-jobs-cleanup.yml` - Weekly on Sundays at 1 AM UTC

All workflows can also be manually triggered via GitHub Actions UI.
