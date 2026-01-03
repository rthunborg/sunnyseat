# Common Issues & Troubleshooting Guide

This guide covers common issues you might encounter when developing or deploying SunnySeat.

## Table of Contents

- [Local Development Issues](#local-development-issues)
- [Database Issues](#database-issues)
- [API Issues](#api-issues)
- [Deployment Issues](#deployment-issues)
- [Environment Variables](#environment-variables)
- [Build & Compilation Issues](#build--compilation-issues)
- [Performance Issues](#performance-issues)

## Local Development Issues

### Port Already in Use

**Problem**: `Error: Port 3000 is already in use`

**Solution**:
```bash
# Use a different port
npm run dev -- -p 3001

# Or find and kill the process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill
```

### Module Not Found Errors

**Problem**: `Module not found: Can't resolve '@/...'`

**Solution**:
1. Check `tsconfig.json` has path aliases configured:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./*"]
       }
     }
   }
   ```
2. Restart the development server
3. Clear Next.js cache: `rm -rf .next`

### Hot Reload Not Working

**Problem**: Changes not reflecting in browser

**Solution**:
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Restart development server
4. Check for syntax errors in console

### TypeScript Errors

**Problem**: Type errors in IDE or build

**Solution**:
```bash
# Run type checking
npm run type-check

# Regenerate Supabase types (if using Supabase CLI)
supabase gen types typescript --local > lib/supabase/types.ts

# Or manually update types from Supabase dashboard
```

## Database Issues

### Supabase Connection Errors

**Problem**: `Failed to connect to Supabase`

**Solution**:
1. Verify Supabase credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
   SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
   ```
2. Check Supabase project is active in dashboard
3. Verify network connectivity
4. Check Supabase status page for outages

### PostGIS Functions Not Working

**Problem**: Spatial queries failing or returning errors

**Solution**:
1. Verify PostGIS extension is enabled:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
2. Check migration files were applied correctly
3. Verify geometry columns have correct type: `geography(Polygon)` or `geography(Point)`
4. Check GIST indexes are created on geometry columns

### Migration Errors

**Problem**: Database migrations failing

**Solution**:
1. Check migration files are in correct order
2. Verify previous migrations were applied
3. Check for syntax errors in SQL
4. Review Supabase dashboard logs
5. Rollback and reapply if needed

### Query Performance Issues

**Problem**: Slow database queries

**Solution**:
1. Check GIST indexes exist on geometry columns:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'patios';
   ```
2. Use `EXPLAIN ANALYZE` to analyze query plans
3. Verify connection pooling is enabled
4. Check for N+1 query problems
5. Consider adding additional indexes

## API Issues

### 401 Unauthorized Errors

**Problem**: API endpoints returning 401 Unauthorized

**Solution**:
1. Verify JWT token is included in request:
   ```typescript
   headers: {
     'Authorization': `Bearer ${token}`
   }
   ```
2. Check JWT token hasn't expired
3. Verify `JWT_SECRET` matches between signing and verification
4. Check token format is correct

### 500 Internal Server Error

**Problem**: API endpoints returning 500 errors

**Solution**:
1. Check Vercel logs for error details
2. Verify environment variables are set correctly
3. Check database connection
4. Review error handling in API route
5. Check for unhandled exceptions

### CORS Errors

**Problem**: CORS errors in browser console

**Solution**:
1. Verify `NEXT_PUBLIC_APP_URL` is set correctly
2. Check API routes allow requests from your domain
3. Verify Vercel deployment has correct environment variables
4. Check for middleware blocking requests

### Rate Limiting

**Problem**: Too many requests errors

**Solution**:
1. Check rate limiting configuration
2. Implement request throttling
3. Use caching to reduce API calls
4. Review API usage patterns

## Deployment Issues

### Vercel Build Failures

**Problem**: Build failing on Vercel

**Solution**:
1. Check build logs in Vercel dashboard
2. Verify `package.json` has correct build script
3. Check for TypeScript errors: `npm run type-check`
4. Verify all dependencies are in `package.json`
5. Check Node.js version compatibility

### Environment Variables Not Working

**Problem**: Environment variables not available in deployment

**Solution**:
1. Verify variables are set in Vercel Dashboard → Project Settings → Environment Variables
2. Check environment type (Production, Preview, Development)
3. Ensure variable names match exactly (case-sensitive)
4. Redeploy after adding variables
5. Check `NEXT_PUBLIC_*` prefix for client-side variables

### Deployment Not Updating

**Problem**: Changes not reflected after deployment

**Solution**:
1. Check deployment logs for errors
2. Verify build completed successfully
3. Clear browser cache
4. Check for caching headers
5. Wait for CDN propagation (can take a few minutes)

### Cron Jobs Not Running

**Problem**: Vercel Cron jobs not executing

**Solution**:
1. Verify `vercel.json` has cron configuration:
   ```json
   {
     "crons": [{
       "path": "/api/cron/job-name",
       "schedule": "0 2 * * *"
     }]
   }
   ```
2. Check `CRON_SECRET` is set in environment variables
3. Verify cron endpoint returns 200 status
4. Check Vercel Cron logs in dashboard
5. Verify cron schedule syntax is correct

## Environment Variables

### Missing Environment Variables

**Problem**: `Missing environment variable: NEXT_PUBLIC_SUPABASE_URL`

**Solution**:
1. Check `.env.local` exists (local development)
2. Verify variables are set in Vercel (deployment)
3. Ensure variable names match exactly
4. Restart development server after adding variables
5. Check for typos in variable names

### Invalid JWT Secret

**Problem**: JWT verification failures

**Solution**:
1. Verify `JWT_SECRET` is at least 32 characters
2. Ensure same secret is used for signing and verification
3. Check for whitespace or special characters
4. Regenerate secret if compromised:
   ```bash
   openssl rand -base64 32
   ```

### Environment Variables Not Available in Browser

**Problem**: `NEXT_PUBLIC_*` variables not accessible in client code

**Solution**:
1. Verify variable name starts with `NEXT_PUBLIC_`
2. Restart development server after adding variables
3. Check variable is set in correct environment (Production/Preview)
4. Verify variable is not in `.env` (must be `.env.local` for local dev)

## Build & Compilation Issues

### TypeScript Compilation Errors

**Problem**: Type errors preventing build

**Solution**:
1. Run type checking: `npm run type-check`
2. Fix type errors in code
3. Update type definitions if needed
4. Check for missing type imports
5. Verify `tsconfig.json` configuration

### ESLint Errors

**Problem**: Linting errors blocking build

**Solution**:
```bash
# Fix auto-fixable issues
npm run lint:fix

# Check specific file
npm run lint -- app/page.tsx

# Temporarily disable rule (not recommended)
// eslint-disable-next-line rule-name
```

### Module Resolution Errors

**Problem**: Cannot find module errors

**Solution**:
1. Verify module is in `package.json` dependencies
2. Run `npm install` to install dependencies
3. Check import path is correct
4. Verify path aliases in `tsconfig.json`
5. Clear Next.js cache: `rm -rf .next`

### Build Timeout

**Problem**: Build timing out on Vercel

**Solution**:
1. Optimize build process
2. Reduce bundle size
3. Check for circular dependencies
4. Review build logs for slow operations
5. Consider upgrading Vercel plan

## Performance Issues

### Slow Page Loads

**Problem**: Pages loading slowly

**Solution**:
1. Check network tab for slow requests
2. Optimize images (use Next.js Image component)
3. Enable caching for static content
4. Use Server Components for data fetching
5. Implement code splitting
6. Check database query performance

### Slow API Responses

**Problem**: API endpoints responding slowly

**Solution**:
1. Check database query performance
2. Add database indexes if needed
3. Implement response caching
4. Optimize query logic
5. Check for N+1 query problems
6. Review Vercel function logs

### High Memory Usage

**Problem**: Application using too much memory

**Solution**:
1. Check for memory leaks
2. Optimize data structures
3. Implement pagination for large datasets
4. Review image sizes and formats
5. Check for unnecessary data loading

## Getting Help

If you encounter an issue not covered here:

1. **Check Logs**:
   - Vercel deployment logs
   - Supabase dashboard logs
   - Browser console errors
   - Network tab for failed requests

2. **Review Documentation**:
   - [Vercel Deployment Guide](../nextjs-app/docs/vercel-deployment.md)
   - [Environment Variables](../nextjs-app/docs/environment-variables.md)
   - [API Documentation](../nextjs-app/app/api/README.md)

3. **Search Issues**:
   - Check GitHub issues
   - Search Next.js documentation
   - Search Supabase documentation
   - Search Vercel documentation

4. **Ask for Help**:
   - Create a GitHub issue with:
     - Error message
     - Steps to reproduce
     - Environment details
     - Relevant logs

---

**Last Updated**: 2024  
**Platform**: Next.js 16+ / Vercel / Supabase
