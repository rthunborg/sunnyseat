# Vercel Deployment Architecture

## Overview

SunnySeat is deployed on Vercel, leveraging serverless functions, edge network, and automatic deployments for optimal performance and developer experience.

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Vercel Edge Network (Global CDN)             │
│  - Automatic SSL/TLS                                      │
│  - DDoS Protection                                        │
│  - Geographic Routing                                     │
│  - Edge Caching                                          │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Vercel Serverless Functions                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Next.js API Routes                               │  │
│  │  - /api/patios                                    │  │
│  │  - /api/sun-exposure                              │  │
│  │  - /api/feedback                                  │  │
│  │  - /api/auth                                      │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Next.js Pages (SSR/SSG)                          │  │
│  │  - Server Components                             │  │
│  │  - Static Generation                             │  │
│  │  - Incremental Static Regeneration               │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Vercel Cron Jobs                                 │  │
│  │  - Sun Precomputation (daily)                    │  │
│  │  - Weather Ingestion (5-10 min)                  │  │
│  │  - Cache Warmup (scheduled)                     │  │
│  │  - Data Cleanup (scheduled)                     │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Serverless Functions

### Function Configuration

```json
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 10
    }
  },
  "crons": [
    {
      "path": "/api/cron/precomputation-schedule",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/weather-ingestion",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

### Function Limits

- **Execution Time**: 10 seconds (Hobby), 50 seconds (Pro)
- **Memory**: 1024 MB (default)
- **Concurrent Executions**: Unlimited (auto-scaling)

### Cold Starts

- **Mitigation**: Vercel keeps functions warm
- **Edge Functions**: Lower latency, faster cold starts
- **Regional Deployment**: Deploy to specific regions if needed

## Edge Network

### CDN Features

- **Global Distribution**: Content served from nearest edge location
- **Automatic Caching**: Static assets cached automatically
- **Image Optimization**: Automatic image optimization
- **Asset Compression**: Automatic compression (gzip, brotli)

### Caching Strategy

```typescript
// API Route with caching
export async function GET(request: NextRequest) {
  const response = NextResponse.json(data);
  
  // Cache for 1 hour
  response.headers.set(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400'
  );
  
  return response;
}
```

### Cache Headers

- **Static Assets**: Long-term caching (1 year)
- **API Responses**: Configurable TTL (1 hour default)
- **ISR Pages**: Revalidate on-demand or scheduled

## Deployment Process

### Automatic Deployments

1. **Push to `main`**: Triggers production deployment
2. **Pull Request**: Creates preview deployment
3. **Build Process**: Runs `npm run build`
4. **Deployment**: Automatic to Vercel edge network

### Preview Deployments

- **Automatic**: Created for every pull request
- **Isolated**: Separate environment variables
- **Shareable**: Unique URL for each preview
- **Testing**: Test changes before merging

### Production Deployment

- **Branch**: `main` (or configured branch)
- **Environment**: Production environment variables
- **Rollback**: One-click rollback to previous deployment
- **Analytics**: Automatic performance monitoring

## Environment Variables

### Configuration

Set in Vercel Dashboard → Project Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
JWT_EXPIRATION_MINUTES=60
OPENWEATHERMAP_API_KEY=...
```

### Environment Types

- **Production**: Used for `main` branch deployments
- **Preview**: Used for pull request deployments
- **Development**: Used for local development (`.env.local`)

## Vercel Cron Jobs

### Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/precomputation-schedule",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/weather-ingestion",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

### Cron Job Endpoints

- **Sun Precomputation**: Daily at 2 AM UTC
- **Weather Ingestion**: Every 10 minutes
- **Cache Warmup**: Scheduled as needed
- **Data Cleanup**: Scheduled as needed

### Cron Job Implementation

```typescript
// app/api/cron/precomputation-schedule/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Run precomputation
  await runSunPrecomputation();
  
  return NextResponse.json({ success: true });
}
```

## Monitoring & Analytics

### Vercel Analytics

- **Web Vitals**: Core Web Vitals tracking
- **Performance Metrics**: Page load times, API response times
- **Error Tracking**: Automatic error logging
- **Real User Monitoring**: Real user performance data

### Vercel Logs

- **Function Logs**: Execution logs for serverless functions
- **Build Logs**: Build process logs
- **Deployment Logs**: Deployment process logs
- **Real-Time**: Stream logs in real-time

### Custom Monitoring

- **Health Checks**: `/api/health` endpoints
- **Database Monitoring**: Supabase dashboard
- **Error Tracking**: Custom error logging

## Performance Optimization

### Build Optimization

- **Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Remove unused code
- **Minification**: Automatic code minification
- **Bundle Analysis**: Available via `@next/bundle-analyzer`

### Runtime Optimization

- **Edge Functions**: For low-latency endpoints
- **ISR**: Incremental Static Regeneration
- **Image Optimization**: Automatic via Next.js Image
- **Font Optimization**: Automatic via `next/font`

## Security

### SSL/TLS

- **Automatic**: SSL certificates for all domains
- **HTTPS**: Required for all deployments
- **Certificate Management**: Automatic renewal

### DDoS Protection

- **Automatic**: Built-in DDoS protection
- **Rate Limiting**: Configurable per route
- **IP Filtering**: Available if needed

### Access Control

- **Environment Variables**: Encrypted at rest
- **Function Isolation**: Each function runs in isolated environment
- **Network Security**: VPC support (Enterprise tier)

## Scaling

### Automatic Scaling

- **Serverless**: Automatic scaling based on traffic
- **No Configuration**: Zero-config scaling
- **Global Distribution**: Automatic geographic distribution

### Scaling Limits

- **Hobby Tier**: 100 GB bandwidth/month
- **Pro Tier**: 1 TB bandwidth/month
- **Enterprise**: Custom limits

## Cost Optimization

### Usage-Based Pricing

- **Serverless Functions**: Pay per invocation
- **Bandwidth**: Pay per GB transferred
- **Build Minutes**: Included per tier

### Optimization Strategies

- **Caching**: Reduce function invocations
- **Edge Functions**: Lower latency, lower cost
- **Static Generation**: Pre-render when possible
- **Image Optimization**: Reduce bandwidth usage

## Related Documentation

- [Vercel Deployment Guide](../../nextjs-app/docs/vercel-deployment.md)
- [Environment Variables](../../nextjs-app/docs/environment-variables.md)
- [Background Jobs](../../nextjs-app/docs/background-jobs-migration.md)
