# Vercel Deployment Guide

This guide covers the complete setup and deployment process for the SunnySeat Next.js application on Vercel.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Vercel Project Setup](#vercel-project-setup)
3. [Environment Variables Configuration](#environment-variables-configuration)
4. [Build Configuration](#build-configuration)
5. [Preview Deployments](#preview-deployments)
6. [Production Deployment](#production-deployment)
7. [Deployment Logs](#deployment-logs)
8. [Rollback Procedure](#rollback-procedure)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- Vercel account ([sign up](https://vercel.com/signup))
- GitHub repository with the project code
- Supabase project with database configured
- A contact email for the Met.no `User-Agent` (the weather API is free and
  keyless; see `MET_NO_USER_AGENT`)

## Vercel Project Setup

### Step 1: Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository:
   - Select the repository containing the `nextjs-app` directory
   - Vercel will auto-detect Next.js framework
4. Configure project settings:
   - **Project Name**: `sunnyseat` (or your preferred name)
   - **Root Directory**: `nextjs-app` (important: set this to the Next.js app directory)
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### Step 2: Link Project to Repository

The project is automatically linked when you import from GitHub. To verify:

1. Go to **Project Settings** → **Git**
2. Confirm the repository is linked
3. Configure branch settings:
   - **Production Branch**: `main` (or `master`)
   - **Preview Deployments**: Enabled for all branches

### Step 3: Configure Project Settings

1. **General Settings**:
   - Project name and description
   - Team/organization assignment
   - Region selection (choose closest to your users)

2. **Build & Development Settings**:
   - Framework: Next.js
   - Node.js Version: 20.x (recommended)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **Environment Variables** (see next section)

## Environment Variables Configuration

### Required Environment Variables

Configure these in **Project Settings** → **Environment Variables**:

See `nextjs-app/.env.example` for the authoritative annotated list and
`docs/environment-variables.md` for per-variable detail. Mark every secret
**"Sensitive"** in Vercel.

#### Supabase Configuration

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]   # SECRET, server-only, never NEXT_PUBLIC_
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is currently unused (no anon client is wired) —
leave it blank. Map tiles need no key (keyless OpenFreeMap style).

#### Data-source feature flags (Production only)

```env
SUNNYSEAT_VENUE_STORE=supabase
SUNNYSEAT_SUN_ENGINE=real
SUNNYSEAT_FEEDBACK_PERSISTENCE=supabase
SUNNYSEAT_REVIEW_PERSISTENCE=supabase
```

Unset everywhere else; the default is the in-memory seed (zero live dependency).

#### Weather API (Met.no — free, keyless)

```env
MET_NO_USER_AGENT=SunnySeat/1.0 rasmus.thunborg@enhancior.se   # non-secret identifier, server-only
```

#### Application URL

```env
NEXT_PUBLIC_APP_URL=https://sunnyseat.se
NODE_ENV=production
```

There are no `/api/cron` endpoints in the MVP, so no `CRON_SECRET` is needed.

### Environment-Specific Configuration

Vercel supports three environments:

1. **Production**: Applied to production deployments
2. **Preview**: Applied to preview deployments (PRs, branches)
3. **Development**: Applied to local development (via Vercel CLI)

**Configuration Strategy:**

- **Production**: All variables with production values
- **Preview**: Same as production, but `NEXT_PUBLIC_APP_URL` points to preview URL
- **Development**: Local `.env.local` file (not in Vercel)

### Setting Environment Variables in Vercel

1. Go to **Project Settings** → **Environment Variables**
2. Click **"Add New"**
3. Enter variable name and value
4. Select environments (Production, Preview, Development)
5. Click **"Save"**

**Important Notes:**

- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Never commit secrets to the repository
- Use Vercel's environment variable management for all secrets
- Rotate secrets regularly

## Build Configuration

The project uses `vercel.json` for Vercel-specific configuration. There are no
cron jobs in the MVP (compute-on-request, DECISION D), so `vercel.json` declares
no `crons`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install --include=dev && (cd .. && npm install --no-package-lock lightningcss@1.31.1 2>&1)"
}
```

### Build Optimization

The `next.config.ts` is configured for optimal production builds:

- **Standalone Output**: Creates optimized standalone build
- **React Compiler**: Enabled for better performance
- **Automatic Optimizations**: Next.js handles code splitting, tree shaking, etc.

### Build Verification

After deployment, verify the build:

1. Check **Deployments** tab for build status
2. Review build logs for warnings/errors
3. Test the deployed application
4. Verify all routes are accessible

## Preview Deployments

### Automatic Preview Deployments

Vercel automatically creates preview deployments for:

- Pull requests
- Feature branches
- Commits to non-production branches

### Preview Deployment Settings

Configure in **Project Settings** → **Git**:

- **Preview Deployments**: Enabled
- **Automatic Preview Comments**: Enabled (comments on PRs)
- **Preview Deployment Protection**: Optional (requires approval)

### Testing Preview Deployments

1. Create a pull request
2. Vercel automatically creates a preview deployment
3. Check PR comments for preview URL
4. Test the preview deployment
5. Verify environment variables are applied correctly

### Preview URL Format

Preview URLs follow this pattern:

```
https://[project-name]-[hash].vercel.app
```

## Production Deployment

### Automatic Production Deployments

Production deployments are triggered by:

- Push to production branch (default: `main`)
- Manual deployment from Vercel dashboard

### Production Domain Configuration

1. Go to **Project Settings** → **Domains**
2. Add custom domain: `sunnyseat.se`
3. Configure DNS records as instructed by Vercel
4. Wait for DNS propagation
5. SSL certificate is automatically provisioned

### Production Deployment Checklist

Before deploying to production:

- [ ] All environment variables are set
- [ ] Build completes without errors
- [ ] Tests pass locally
- [ ] Preview deployment tested
- [ ] Database migrations applied
- [ ] Cron jobs configured
- [ ] Monitoring/logging configured

### Verifying Production Deployment

1. Check deployment status in dashboard
2. Test production URL: `https://sunnyseat.se`
3. Verify all API endpoints work
4. Check health endpoints: `/api/health`
5. Monitor logs for errors

## Deployment Logs

### Accessing Logs

1. **Vercel Dashboard**:
   - Go to **Deployments** → Select deployment → **Logs** tab
   - Real-time logs during deployment
   - Historical logs for past deployments

2. **Vercel CLI**:

   ```bash
   vercel logs [deployment-url]
   ```

3. **API**:
   - Use Vercel API to fetch logs programmatically

### Log Retention

- **Free Plan**: 100 hours of logs
- **Pro Plan**: 1,000 hours of logs
- **Enterprise**: Custom retention

### Log Monitoring

Monitor logs for:

- Build errors
- Runtime errors
- Performance issues
- Cron job execution
- API request patterns

## Rollback Procedure

### Automatic Rollback

Vercel can automatically rollback on build failure (configurable in settings).

### Manual Rollback

1. Go to **Deployments** tab
2. Find the previous working deployment
3. Click **"..."** menu → **"Promote to Production"**
4. Confirm the rollback
5. Verify the application works correctly

### Rollback Checklist

- [ ] Identify the issue causing rollback
- [ ] Select previous working deployment
- [ ] Promote to production
- [ ] Verify application functionality
- [ ] Document the rollback reason
- [ ] Create issue/ticket to fix the problem
- [ ] Test fix in preview before redeploying

### Rollback via CLI

```bash
vercel promote [deployment-url] --prod
```

## Troubleshooting

### Build Failures

**Common Issues:**

1. **Missing Dependencies**:
   - Check `package.json` includes all dependencies
   - Verify `package-lock.json` is committed

2. **TypeScript Errors**:
   - Run `npm run type-check` locally
   - Fix all TypeScript errors before deploying

3. **Environment Variable Issues**:
   - Verify all required variables are set
   - Check variable names match exactly
   - Ensure variables are set for correct environment

### Runtime Errors

1. **Check Logs**: Review deployment logs for errors
2. **Environment Variables**: Verify all variables are accessible
3. **Database Connection**: Check Supabase connection
4. **API Endpoints**: Test all API routes

### Cron Job Issues

Opening-hours review is not a Vercel cron. Inspect the protected GitHub
`Hours Review Audit` workflow, its bounded step summary/run ID, and
`SUN_HOURS_AUDIT_ENABLED`. The direct runner has no public trigger and its
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` configuration belongs to the
GitHub `production` environment.

### Performance Issues

1. **Build Optimization**: Review build output size
2. **Bundle Analysis**: Use Next.js bundle analyzer
3. **Caching**: Verify caching headers are set correctly
4. **Database Queries**: Optimize slow queries

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

## Support

For deployment issues:

1. Check Vercel status page
2. Review Vercel documentation
3. Check project logs
4. Contact Vercel support if needed
