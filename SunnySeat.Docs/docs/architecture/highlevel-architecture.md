# High-Level Architecture

## System Overview

SunnySeat is a full-stack serverless application that helps users find patios with optimal sun exposure based on real-time calculations, weather data, and spatial analysis.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                      │
│              (Global CDN, SSL, DDoS Protection)             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js Full-Stack Application                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Frontend (React 19 + MapLibre GL JS)                │   │
│  │  - Server Components (data fetching)                  │   │
│  │  - Client Components (interactivity)                  │   │
│  │  - Map-based patio search                             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Backend (Next.js API Routes)                         │   │
│  │  - /api/patios - Patio search                        │   │
│  │  - /api/sun-exposure - Sun calculations              │   │
│  │  - /api/feedback - User feedback                    │   │
│  │  - /api/auth - Authentication                        │   │
│  │  - /api/health - Health checks                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Background Jobs (Vercel Cron)                        │   │
│  │  - Sun/Shadow Precompute (daily)                      │   │
│  │  - Weather Ingest (5-10 min intervals)                │   │
│  │  - Cache Warmup (scheduled)                          │   │
│  │  - Data Cleanup (scheduled)                          │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL + PostGIS)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Spatial Database                                     │   │
│  │  - Buildings (polygons with height)                  │   │
│  │  - Patios (polygons)                                  │   │
│  │  - Sun windows (precomputed intervals)                │   │
│  │  - Weather data (cloud cover, forecasts)               │   │
│  │  - User feedback                                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Layer
- **Next.js 16+** with App Router
- **React 19** for UI components
- **MapLibre GL JS** for interactive maps
- **Tailwind CSS** for styling
- **TanStack Query** for server state management

### Backend Layer
- **Next.js API Routes** (serverless functions)
- **TypeScript** for type safety
- **Supabase Client** for database access
- **JWT** for authentication

### Data Layer
- **Supabase PostgreSQL** with PostGIS extension
- **Spatial indexes** (GIST) for geographic queries
- **Connection pooling** via Supabase pooler

### Infrastructure Layer
- **Vercel** for hosting and serverless functions
- **Vercel Edge Network** for global CDN
- **Vercel Cron** for scheduled jobs
- **Supabase** for managed database

## Data Flow

### Patio Search Flow
1. User searches for patios near location
2. Frontend sends request to `/api/patios`
3. API route queries Supabase with spatial search
4. Results include sun exposure data (precomputed)
5. Frontend displays patios on map with sun indicators

### Sun Calculation Flow
1. Background job (Vercel Cron) runs daily
2. Calculates sun windows for all patios
3. Stores results in `sun_window` table
4. Real-time requests use precomputed data
5. Weather data integrated for cloud cover adjustments

### Weather Integration Flow
1. Vercel Cron job runs every 5-10 minutes
2. Fetches weather data from OpenWeatherMap/YR.no
3. Stores in `weather_slice` table
4. Updates `current_cloud_grid` view
5. Sun calculations adjust for cloud cover

## Key Architectural Decisions

### Serverless Architecture
- **Why**: Automatic scaling, zero-config deployment, cost-effective
- **Trade-off**: Cold starts possible, but mitigated by Vercel's edge network

### Next.js Full-Stack
- **Why**: Single codebase, type-safe end-to-end, excellent DX
- **Trade-off**: Larger bundle size, but mitigated by code splitting

### Supabase + PostGIS
- **Why**: Managed PostgreSQL with spatial extensions, excellent DX
- **Trade-off**: Vendor lock-in, but acceptable for MVP

### Vercel Hosting
- **Why**: Optimized for Next.js, automatic deployments, edge network
- **Trade-off**: Platform-specific, but excellent integration

## Performance Characteristics

- **API Response Time**: <200ms (95th percentile)
- **Sun Calculation**: <100ms for single patio (precomputed)
- **Spatial Queries**: <50ms with GIST indexes
- **Page Load**: <2.5s LCP on 3G
- **Map Render**: <3s on 3G

## Scalability

- **Horizontal Scaling**: Automatic via Vercel serverless functions
- **Database Scaling**: Supabase connection pooling + read replicas (if needed)
- **Caching**: Vercel Edge caching + Supabase query caching
- **Background Jobs**: Vercel Cron with automatic scaling

## Security

- **Authentication**: JWT tokens for admin endpoints
- **Public Access**: No auth required for patio search (MVP)
- **Database**: Supabase Row Level Security (if configured)
- **API**: Rate limiting on API routes
- **HTTPS**: Automatic via Vercel Edge Network

## Monitoring & Observability

- **Vercel Analytics**: Application performance monitoring
- **Vercel Logs**: Function execution logs
- **Supabase Dashboard**: Database monitoring
- **Custom Metrics**: Sun calculation accuracy, API performance

## Related Documentation

- [Next.js Architecture Details](./nextjs-architecture.md)
- [Supabase Architecture Details](./supabase-architecture.md)
- [Vercel Deployment Architecture](./vercel-architecture.md)
- [Runtime Components](./runtime-components.md)
- [Tech Stack](./tech-stack.md)
