# Tech Stack

_Version 1.0 - Created by Winston (Architect Agent)_

## Overview

This document defines the technology stack for SunnySeat, chosen to optimize for rapid development, real-time performance, and geographical data processing capabilities.

## Architecture Decisions

### Core Technology Selection Principles

- **Boring Technology**: Proven, well-supported technologies for core infrastructure
- **Developer Experience**: Excellent tooling and documentation
- **Performance**: Real-time sun calculations require efficient data processing
- **Spatial First**: Technologies optimized for geographical data
- **Cost-Conscious**: Balanced performance vs. operational cost

## Frontend Stack

### Core Framework

- **Next.js 14+** with App Router and TypeScript
  - **Why**: Full-stack framework, excellent ecosystem, great dev tools, serverless-ready
  - **Version**: Latest stable (14+)
  - **Key Features**: Server Components, Client Components, automatic code splitting, built-in routing

### Build Tooling

- **Next.js Built-in Build System**
  - **Why**: Optimized for Next.js, excellent dev experience, automatic optimizations
  - **Config**: TypeScript, Tailwind CSS, ESLint, Prettier

### UI Framework

- **Tailwind CSS** for styling
  - **Why**: Rapid prototyping, consistent design system
  - **Custom Config**: Extended with SunnySeat color palette

### Mapping

- **MapLibre GL JS** for interactive maps
  - **Why**: Open source, performant, excellent mobile support
  - **Tile Source**: OpenStreetMap via MapTiler
  - **Performance**: Vector tiles for crisp rendering at all zoom levels

### State Management

- **React Context** + **useReducer** for global state
  - **Why**: Built-in, sufficient for MVP scope
  - **Stores**: Location, selected patio, user preferences
  - **Server State**: Server Components for initial data fetching

### HTTP Client

- **TanStack Query (React Query)** for server state
  - **Why**: Built-in caching, background refetching, optimistic updates
  - **Configuration**: 5-minute stale time for patio data
  - **Supabase Client**: Direct Supabase client for database queries in Server Components

### Development Tools

- **TypeScript** (strict mode)
- **ESLint** + **Prettier** for code quality
- **Vitest** for unit testing
- **React Testing Library** for component testing

## Backend Stack

### Runtime & Framework

- **Next.js 14+** with App Router (Full-Stack)
  - **Why**: Modern full-stack framework, excellent developer experience, serverless-ready
  - **Hosting Model**: Serverless functions on Vercel
  - **Configuration**: API Routes for backend endpoints, Server Actions for form submissions
  - **TypeScript**: Strict mode for type safety

### Database

- **Supabase** (PostgreSQL with PostGIS)
  - **Why**: Managed PostgreSQL with PostGIS, excellent developer experience, built-in auth
  - **Spatial Features**: GIST indexes, geography types, sun angle calculations
  - **Connection Pooling**: Supabase connection pooler
  - **Row Level Security**: Available if needed for multi-tenant scenarios

### Caching

- **Vercel Edge Caching** + **Supabase Caching**
  - **Use Cases**: Sun calculation results, weather data, API responses
  - **TTL Strategy**: 1 hour for sun calculations, 5 minutes for weather
  - **CDN**: Automatic edge caching via Vercel

### Background Processing

- **Vercel Cron** for scheduled jobs
  - **Sun Calculator**: Daily precompute + on-demand calculations (Vercel Cron)
  - **Weather Ingest**: Real-time weather data (5-10 min intervals via Vercel Cron)
  - **Limitations**: Max 10s execution (50s on Pro plan); longer jobs use Supabase Edge Functions or external services
  - **Monitoring**: Vercel deployment logs and Supabase monitoring

### API Documentation

- **Next.js API Routes** with TypeScript
  - **Features**: Type-safe API endpoints, automatic OpenAPI generation possible
  - **Authentication**: Supabase Auth or JWT tokens

## Infrastructure Stack

### Cloud Platform

- **Vercel** as primary hosting platform
  - **Regions**: Global edge network with EU data residency options
  - **Account**: Hobby/Pro/Enterprise tiers with usage-based pricing

### Hosting

- **Vercel Serverless Functions** for application hosting
  - **Why**: Automatic scaling, zero-config deployment, excellent DX
  - **Configuration**: Automatic resource allocation, edge network optimization
  - **Edge Functions**: For low-latency endpoints

### CDN & Edge

- **Vercel Edge Network** for global distribution
  - **Features**: Automatic DDoS protection, SSL termination, geographic routing
  - **Caching**: Static assets (automatic), API responses (configurable TTL)
  - **Performance**: Automatic image optimization, asset compression

### Database Hosting

- **Supabase** (Managed PostgreSQL)
  - **Tier**: Free/Pro/Enterprise tiers
  - **PostGIS**: Enabled through extensions
  - **Backup**: Automatic daily backups with point-in-time recovery
  - **Regions**: EU data residency available

### Monitoring & Observability

- **Vercel Analytics** for application monitoring
- **Vercel Logs** for function execution logs
- **Supabase Dashboard** for database monitoring
- **Custom Dashboards**: Sun calculation accuracy, API performance

## External Integrations

### Weather Data

- **OpenWeatherMap API**
  - **Plan**: Professional plan for minute-level forecasts
  - **Data**: Cloud cover, temperature, precipitation
  - **Backup**: YR.no API for failover

### Map Tiles

- **MapTiler** for vector map tiles
  - **Style**: Custom style based on OpenStreetMap data
  - **Plan**: Professional plan for commercial usage

### Geocoding

- **Nominatim** (OpenStreetMap)
  - **Why**: Free, accurate for European addresses
  - **Backup**: Azure Maps for fallback

## Development & Deployment

### Version Control

- **Git** with GitHub
  - **Branching**: GitFlow with feature branches
  - **Protection**: Required PR reviews, automated testing

### CI/CD Pipeline

- **GitHub Actions** for automation
  - **Triggers**: Push to main, PR creation
  - **Steps**: Test ? Build ? Security scan ? Deploy

### Container Strategy

- **Vercel Serverless Functions** (no containers needed)
  - **Build**: Automatic build on Vercel
  - **Deployment**: Automatic deployment on git push
  - **Scaling**: Automatic scaling based on traffic

### Environment Management

- **Development**: Local Next.js development server
- **Preview**: Automatic preview deployments for pull requests
- **Production**: Vercel production deployment

### Infrastructure as Code

- **Vercel Configuration** via `vercel.json`
- **GitHub Actions** for CI/CD automation
- **Supabase Migrations** for database schema management

## Security Stack

### Authentication

- **Supabase Auth** for admin authentication (if needed)
- **JWT tokens** for API authorization
- **No authentication** required for public search (MVP)

### Security Scanning

- **Dependabot** for dependency vulnerabilities
- **CodeQL** for static analysis
- **Vercel Security** for infrastructure security
- **Supabase Security** for database security

## Performance Targets

### Frontend Performance

- **First Contentful Paint**: <1.5s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1
- **Map Load Time**: <3s on 3G

### Backend Performance

- **API Response Time**: <200ms (95th percentile)
- **Sun Calculation**: <100ms for single patio
- **Database Queries**: <50ms for spatial searches
- **Concurrent Users**: 1000+ simultaneous

### Database Performance

- **Spatial Index**: GIST indexes on all geometry columns
- **Query Planning**: Forced spatial index usage
- **Connection Pooling**: Max 100 connections

## Scalability Strategy

### Horizontal Scaling

- **API**: Stateless design enables easy horizontal scaling
- **Database**: Read replicas for sun calculation queries
- **Cache**: Redis Cluster for distributed caching

### Vertical Scaling

- **CPU**: Optimized for parallel sun calculations
- **Memory**: In-memory caching of building geometries
- **Storage**: SSD for spatial index performance

## Cost Optimization

### Resource Sizing

- **Development**: Minimal resources (1 vCPU, 2GB RAM)
- **Production**: Right-sized based on monitoring data
- **Auto-scaling**: Scale down during low usage periods

### Caching Strategy

- **Aggressive caching** of sun calculations
- **CDN caching** for static assets and API responses
- **Database query optimization** to reduce compute costs

---

**Technology Review Cycle**: Quarterly review of technology choices and performance metrics. Major version updates require architecture team approval.
