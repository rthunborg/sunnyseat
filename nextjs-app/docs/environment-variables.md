# Environment Variables Reference

This document lists all environment variables required for the SunnySeat Next.js application.

## Required Variables

### Supabase Configuration

| Variable | Description | Required | Environment |
|----------|-------------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Yes | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | Yes | All |

**How to get:**
1. Go to Supabase Dashboard → Project Settings → API
2. Copy Project URL → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

**Security Note:** `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. Never expose it to the client.

### Authentication

| Variable | Description | Required | Default | Environment |
|----------|-------------|----------|---------|-------------|
| `JWT_SECRET` | Secret key for JWT token signing | Yes | - | All |
| `JWT_EXPIRATION_MINUTES` | JWT token expiration in minutes | No | 60 | All |
| `REFRESH_TOKEN_EXPIRATION_DAYS` | Refresh token expiration in days | No | 7 | All |

**Security Requirements:**
- `JWT_SECRET` must be at least 32 characters
- Use a cryptographically secure random string
- Never commit to version control
- Rotate periodically

**Generate secure secret:**
```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Cron Jobs

| Variable | Description | Required | Environment |
|----------|-------------|----------|-------------|
| `CRON_SECRET` | Secret for authenticating Vercel Cron requests | Yes | Production, Preview |

**Security Requirements:**
- Must be at least 32 characters
- Use a cryptographically secure random string
- Must match the secret configured in Vercel Cron settings

**Generate secure secret:**
```bash
openssl rand -base64 32
```

### Weather API (Optional)

| Variable | Description | Required | Default | Environment |
|----------|-------------|----------|---------|-------------|
| `WEATHER_API_KEY` | OpenWeatherMap API key | No | - | All |
| `WEATHER_API_URL` | OpenWeatherMap API base URL | No | `https://api.openweathermap.org/data/2.5` | All |

**Note:** Required only if weather service is implemented.

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
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]

# Authentication
JWT_SECRET=[your-secure-secret-key-min-32-chars]
JWT_EXPIRATION_MINUTES=60
REFRESH_TOKEN_EXPIRATION_DAYS=7

# Cron (for local testing)
CRON_SECRET=[your-secure-secret-key-min-32-chars]

# Weather API (optional)
WEATHER_API_KEY=[openweathermap-key]
WEATHER_API_URL=https://api.openweathermap.org/data/2.5

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

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

The application validates required environment variables at startup:

- **Client-side**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Server-side**: `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`

Missing variables will cause runtime errors with clear messages.

## Security Best Practices

1. **Never commit secrets**:
   - Add `.env.local` to `.gitignore`
   - Use Vercel environment variables for deployment
   - Never log or expose secrets in code

2. **Use strong secrets**:
   - Minimum 32 characters for JWT_SECRET and CRON_SECRET
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
   - Set up alerts for authentication failures
   - Review access logs regularly

## Troubleshooting

### Missing Environment Variables

**Error**: `Missing Supabase environment variables`

**Solution**: 
1. Check `.env.local` exists (local development)
2. Verify variables are set in Vercel (deployment)
3. Ensure variable names match exactly (case-sensitive)
4. Restart development server after adding variables

### Invalid JWT Secret

**Error**: JWT verification failures

**Solution**:
1. Verify `JWT_SECRET` is at least 32 characters
2. Ensure same secret is used for signing and verification
3. Check for whitespace or special characters
4. Regenerate if compromised

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
export JWT_SECRET="test-secret-min-32-characters-long"
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
| `Jwt:Secret` | `JWT_SECRET` |
| `Jwt:ExpirationMinutes` | `JWT_EXPIRATION_MINUTES` |
| `WeatherApi:Key` | `WEATHER_API_KEY` |
| `WeatherApi:Url` | `WEATHER_API_URL` |

## Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)
