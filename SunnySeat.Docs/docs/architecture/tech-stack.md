# Tech Stack

*Version 1.0 - Created by Winston (Architect Agent)*

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
- **React 18** with TypeScript
  - **Why**: Excellent ecosystem, team familiarity, great dev tools
  - **Version**: Latest stable (18.2+)
  - **Key Features**: Concurrent features, automatic batching

### Build Tooling
- **Vite** as build tool
  - **Why**: Faster than Webpack, excellent dev experience
  - **Config**: Custom PostCSS setup for Tailwind processing

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

### HTTP Client
- **TanStack Query (React Query)** for server state
  - **Why**: Built-in caching, background refetching, optimistic updates
  - **Configuration**: 5-minute stale time for patio data

### Development Tools
- **TypeScript** (strict mode)
- **ESLint** + **Prettier** for code quality
- **Vitest** for unit testing
- **React Testing Library** for component testing

## Backend Stack

### Runtime & Framework
- **.NET 8** with Minimal APIs
  - **Why**: Excellent performance, mature ecosystem, strong typing
  - **Hosting Model**: Self-contained deployment
  - **Configuration**: AOT compilation for startup performance

### Database
- **PostgreSQL 15** with **PostGIS 3.4**
  - **Why**: Best-in-class spatial capabilities, strong consistency
  - **Spatial Features**: GIST indexes, geography types, sun angle calculations
  - **Connection Pooling**: pgBouncer for production

### Caching
- **Redis 7** for application caching
  - **Use Cases**: Sun calculation results, weather data, session data
  - **TTL Strategy**: 1 hour for sun calculations, 5 minutes for weather

### Background Processing
- **.NET Hosted Services** for workers
  - **Sun Calculator**: Daily precompute + on-demand calculations
  - **Weather Ingest**: Real-time weather data (5-10 min intervals)
  - **Monitoring**: Health checks with custom metrics

### API Documentation
- **OpenAPI 3.0** with Swashbuckle
  - **Features**: Auto-generated docs, request/response examples
  - **Authentication**: JWT bearer token support

## Infrastructure Stack

### Cloud Platform
- **Azure** as primary cloud provider
  - **Regions**: West Europe (Stockholm) for EU data residency
  - **Account**: Pay-as-you-go with cost alerts

### Hosting
- **Azure Container Instances** for application hosting
  - **Why**: Serverless containers, automatic scaling
  - **Configuration**: 2 vCPU, 4GB RAM baseline

### CDN & Edge
- **Azure Front Door** for global distribution
  - **Features**: DDoS protection, SSL termination, geographic routing
  - **Caching**: Static assets (24h TTL), API responses (5m TTL)

### Database Hosting
- **Azure Database for PostgreSQL**
  - **Tier**: General Purpose, 2 vCores
  - **PostGIS**: Enabled through extensions
  - **Backup**: Point-in-time recovery, 7-day retention

### Monitoring & Observability
- **Application Insights** for application monitoring
- **Azure Monitor** for infrastructure metrics
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
- **Docker** for containerization
  - **Base Images**: Alpine Linux for size optimization
  - **Multi-stage**: Separate build and runtime images
  - **Registry**: Azure Container Registry

### Environment Management
- **Development**: Local Docker Compose
- **Staging**: Azure Container Instances (smaller resources)
- **Production**: Azure Container Instances (full resources)

### Infrastructure as Code
- **Azure Resource Manager (ARM)** templates
- **Azure CLI** for deployment automation

## Security Stack

### Authentication
- **Azure AD B2C** for admin authentication (future)
- **JWT tokens** for API authorization
- **No authentication** required for public search (MVP)

### Security Scanning
- **Dependabot** for dependency vulnerabilities
- **CodeQL** for static analysis
- **Azure Security Center** for infrastructure security

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