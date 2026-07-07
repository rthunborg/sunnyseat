# GitHub Actions Scheduled Jobs Setup

This guide explains how to set up GitHub Actions workflows to trigger scheduled background jobs, replacing Vercel cron jobs to avoid Hobby account limitations.

## Overview

Instead of using Vercel cron jobs (limited to 2 total on Hobby accounts), we use GitHub Actions scheduled workflows to call our API endpoints at specified times.

## Required GitHub Secrets

Configure these secrets in your GitHub repository:

1. Go to **Repository Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add the following secrets:

### `CRON_SECRET`
- **Value:** Same as your `CRON_SECRET` environment variable in Vercel
- **Purpose:** Authenticates requests to cron endpoints
- **Example:** `your-secure-random-secret-key-min-32-chars`

### `VERCEL_APP_URL`
- **Value:** Your Vercel deployment URL
- **Purpose:** Base URL for API endpoint calls
- **Examples:**
  - Production: `https://sunnyseat.se` (if using custom domain)
  - Production: `https://your-app.vercel.app` (default Vercel domain)
  - **Note:** Use your production URL, not preview URLs

## Workflow Files

The following workflow files are in `.github/workflows/`:

- `scheduled-jobs-precomputation.yml` - Daily at midnight UTC
- `scheduled-jobs-weather.yml` - Daily at 2 AM UTC
- `scheduled-jobs-cache.yml` - Daily at 3 AM UTC
- `scheduled-jobs-accuracy.yml` - Daily at 4 AM UTC
- `scheduled-jobs-cleanup.yml` - Weekly on Sundays at 1 AM UTC

## Verification

### 1. Check Workflow Files
Verify all workflow files exist in `.github/workflows/`:
```bash
ls .github/workflows/scheduled-jobs-*.yml
```

### 2. Test Manual Execution
1. Go to **GitHub** → **Actions** tab
2. Select any scheduled job workflow (e.g., "Weather Ingestion Job")
3. Click **"Run workflow"** → **"Run workflow"**
4. Check the workflow run logs for success

### 3. Verify API Endpoints
After a workflow runs, check Vercel logs:
1. Go to **Vercel Dashboard** → Your project → **Logs**
2. Filter by the endpoint name (e.g., "weather-ingestion")
3. Verify successful execution

## Troubleshooting

### Workflow Fails with 401 Unauthorized
- **Issue:** `CRON_SECRET` mismatch
- **Solution:** Ensure GitHub secret `CRON_SECRET` matches Vercel environment variable `CRON_SECRET`

### Workflow Fails with Connection Error
- **Issue:** `VERCEL_APP_URL` is incorrect
- **Solution:** Verify the URL is correct and accessible. Use production URL, not preview.

### Workflow Not Running on Schedule
- **Issue:** GitHub Actions schedules can have delays (up to 15 minutes)
- **Solution:** This is normal. Schedules are approximate, not exact.

### Need to Change Schedule
- Edit the `cron` expression in the workflow file
- Push changes to trigger workflow updates
- GitHub Actions will use the new schedule

## Manual Triggering

All workflows support manual triggering:

1. Go to **GitHub** → **Actions**
2. Select the workflow you want to run
3. Click **"Run workflow"** → Select branch → **"Run workflow"**

This is useful for testing or running jobs outside the schedule.

## Monitoring

### GitHub Actions
- View workflow runs: **GitHub** → **Actions** → Workflow name
- See execution history, logs, and success/failure rates

### Vercel Logs
- View API endpoint logs: **Vercel Dashboard** → **Logs**
- Filter by endpoint path to see execution details

## Benefits of This Approach

✅ **No Vercel Cron Limits** - Avoids Hobby account 2-cron-job limit  
✅ **Free** - GitHub Actions provides 2,000 minutes/month free  
✅ **Reliable** - GitHub Actions has excellent uptime  
✅ **Flexible** - Easy to modify schedules or add new jobs  
✅ **Transparent** - Full execution history in GitHub  
✅ **Manual Trigger** - Can run jobs on-demand for testing

## Migration Notes

- **Removed:** All cron jobs from `vercel.json`
- **Added:** GitHub Actions workflow files
- **Unchanged:** API endpoints remain the same, still require `CRON_SECRET`
- **Compatible:** Existing endpoints work with both approaches
