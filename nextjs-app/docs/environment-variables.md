# Environment Variables Reference

This document lists all environment variables required for the SunnySeat Next.js application.

## Required Variables

### Supabase Configuration

| Variable | Description | Required | Secret? | Environment |
|----------|-------------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes | No (public) | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) | Yes (live path) | **Yes** | All |

**How to get:**
1. Go to Supabase Dashboard → Project Settings → API
2. Copy Project URL → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

**Security Note:** `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security and is
read only by server-only `lib/` modules. Never expose it to the client; never
give it a `NEXT_PUBLIC_` prefix. All data access flows through `/api/*` routes
using the service-role client — there is **no anon/browser Supabase client**, so
`NEXT_PUBLIC_SUPABASE_ANON_KEY` is not needed (you can remove it from your env).

### Data-source adapters (server-only feature flags)

| Variable | Description | Required | Environment |
|----------|-------------|----------|-------------|
| `SUNNYSEAT_VENUE_STORE` | `supabase` reads `public.venues` (else in-memory seed) | No | Production only |
| `SUNNYSEAT_SUN_ENGINE` | `real` computes live sun/shadow/weather (else seed) | No | Production only |
| `SUNNYSEAT_FEEDBACK_PERSISTENCE` | `supabase` writes `public.feedback` | No | Production only |
| `SUNNYSEAT_REVIEW_PERSISTENCE` | `supabase` reads/writes `public.reviews` | No | Production only |

Unset = the in-memory fixture/seed default, so CI and local dev have **zero
live-Supabase dependency** and the output is byte-identical to the fixture era.
These are flipped on for the **Production** environment only (Story 8.5). Never
set them in committed CI/test config. Non-secret, but server-only (never
`NEXT_PUBLIC_`).

### Weather API (Met.no)

| Variable | Description | Required | Secret? | Environment |
|----------|-------------|----------|---------|-------------|
| `MET_NO_USER_AGENT` | Met.no `User-Agent` with a real contact email (TOS) | Recommended on live path | No (public identifier) | All |

Met.no Locationforecast is a free public API needing no key — only an identifying
`User-Agent` with a way to make contact per its Terms of Service. Server-only
(read in `lib/weather/met-no-service.ts`); never `NEXT_PUBLIC_`. If unset, the
code falls back to a non-secret default that still identifies the app. (There is
no OpenWeatherMap dependency.)

### Cron Jobs

There are **no `/api/cron` endpoints** in the MVP (compute-on-request, DECISION D
— no precompute/Cron pipeline), so **no `CRON_SECRET` is required**. Reintroduce
one here only if a cron endpoint is added.

### Application Configuration

| Variable | Description | Required | Default | Environment |
|----------|-------------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | Public application URL | Yes | `http://localhost:3000` | All |
| `NODE_ENV` | Node environment | Yes | `development` | All |

**Environment-Specific Values:**

- **Development**: `http://localhost:3000`
- **Preview**: `https://[project-name]-[hash].vercel.app`
- **Production**: `https://sunnyseat.se`

## Environment-Specific Configuration

### Development (Local)

Create `.env.local` file in `nextjs-app/` directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]

# Data-source adapters (omit to use the in-memory seed default)
# SUNNYSEAT_VENUE_STORE=supabase
# SUNNYSEAT_SUN_ENGINE=real
# SUNNYSEAT_FEEDBACK_PERSISTENCE=supabase
# SUNNYSEAT_REVIEW_PERSISTENCE=supabase

# Met.no weather (public API; identifying User-Agent with a contact email)
MET_NO_USER_AGENT=SunnySeat/1.0 rasmus.thunborg@enhancior.se

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

See `.env.example` for the authoritative annotated list.

### Preview (Vercel Preview Deployments)

Configure in Vercel Dashboard → Project Settings → Environment Variables:

- Select **Preview** environment
- Set all required variables
- Use preview-specific values where applicable

### Production (Vercel Production)

Configure in Vercel Dashboard → Project Settings → Environment Variables:

- Select **Production** environment
- Set all required variables
- Use production values:
  - `NEXT_PUBLIC_APP_URL=https://sunnyseat.se`
  - `NODE_ENV=production`

## Variable Validation

The live data path fails closed if its required server-side config is missing:

- **Public (client-readable)**: `NEXT_PUBLIC_SUPABASE_URL` (the anon key is not
  consumed by runtime code today).
- **Server-side (live path)**: `SUPABASE_SERVICE_ROLE_KEY` — the env-gated
  adapters throw a clear "credentials are incomplete" error if a `SUNNYSEAT_*`
  flag is set to a live value without it. With the flags unset (the default),
  the in-memory/seed path needs none of these.

No secret carries a `NEXT_PUBLIC_` prefix.

## Security Best Practices

1. **Never commit secrets**:
   - Add `.env.local` to `.gitignore`
   - Use Vercel environment variables for deployment
   - Never log or expose secrets in code

2. **Use strong secrets**:
   - Minimum 32 characters for CRON_SECRET
   - Use cryptographically secure random generators
   - Rotate secrets periodically

3. **Environment separation**:
   - Use different secrets for development, preview, and production
   - Never reuse production secrets in development

4. **Access control**:
   - Limit access to Vercel environment variables
   - Use team/organization settings to control access
   - Audit variable access regularly

5. **Monitoring**:
   - Monitor for exposed secrets in logs
   - Set up alerts for cron authentication failures
   - Review access logs regularly

## Troubleshooting

### Missing Environment Variables

**Error**: `Missing Supabase environment variables`

**Solution**: 
1. Check `.env.local` exists (local development)
2. Verify variables are set in Vercel (deployment)
3. Ensure variable names match exactly (case-sensitive)
4. Restart development server after adding variables

### Cron Job Authentication Failures

**Error**: `Unauthorized` responses from cron endpoints

**Solution**:
1. Verify `CRON_SECRET` matches Vercel configuration
2. Check Vercel Cron settings in dashboard
3. Ensure secret is set for correct environment
4. Verify Authorization header format

## Testing Environment Variables

### Local Testing

```bash
# Set variables
export NEXT_PUBLIC_SUPABASE_URL="https://test.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="test-key"
export SUPABASE_SERVICE_ROLE_KEY="test-service-key"
export CRON_SECRET="test-cron-secret-min-32-characters-long"

# Run application
npm run dev
```

### Vercel Testing

1. Set variables in Vercel Dashboard
2. Deploy to preview environment
3. Test endpoints
4. Check logs for errors

## Migration from .NET

If migrating from .NET backend, map these variables:

| .NET (appsettings.json) | Next.js Environment Variable |
|-------------------------|----------------------------|
| `Supabase:Url` | `NEXT_PUBLIC_SUPABASE_URL` |
| `Supabase:AnonKey` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `Supabase:ServiceRoleKey` | `SUPABASE_SERVICE_ROLE_KEY` |
| `WeatherApi:Key` | `WEATHER_API_KEY` |
| `WeatherApi:Url` | `WEATHER_API_URL` |

## Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)
