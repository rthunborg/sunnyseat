# Source Tree

_Version 1.0 - Created by Winston (Architect Agent)_

## Overview

This document defines the project structure and organization for SunnySeat, designed to support clean architecture principles and effective team collaboration.

## Repository Structure

```
SunnySeat/
??? SunnySeat.Docs/.github/                          # GitHub workflows and templates
?   ??? workflows/                    # CI/CD automation
?   ?   ??? build-and-test.yml       # Build, test, security scan
?   ?   ??? deploy-staging.yml       # Staging deployment (Vercel)
?   ?   ??? deploy-production.yml    # Production deployment (Vercel)
?   ??? ISSUE_TEMPLATE/               # Issue templates
?   ??? pull_request_template.md     # PR template
??? SunnySeat.Docs/.bmad-core/                       # BMad methodology artifacts
?   ??? agents/                       # AI agent definitions
?   ??? tasks/                        # Workflow tasks
?   ??? templates/                    # Document templates
?   ??? workflows/                    # Development workflows
??? SunnySeat.Docs/docs/                             # Project documentation
?   ??? prd/                         # Product requirements (sharded)
?   ??? architecture/                # Architecture documentation
?   ??? qa/                          # Quality assurance documentation
?   ??? stories/                     # User stories
?   ??? decisions/                   # Architecture decision records
??? src/                             # Application source code
?   ??? app/                         # Next.js App Router (pages and API routes)
?   ??? lib/                         # Shared libraries and utilities
?   ??? components/                  # React components (Server/Client)
?   ??? public/                      # Static assets
??? infrastructure/                   # Infrastructure as Code
?   ??? vercel/                      # Vercel configuration
?   ?   ??? vercel.json             # Vercel deployment config
?   ??? supabase/                    # Supabase migrations
?   ?   ??? migrations/              # Database migration files
?   ??? scripts/                     # Deployment scripts
??? tests/                           # Test suites
?   ??? integration/                 # Integration tests
?   ??? performance/                 # Performance/load tests
?   ??? e2e/                         # End-to-end tests
??? tools/                           # Development tools and utilities
    ??? data-import/                 # Building/venue data import scripts
    ??? sun-calculator-test/         # Sun calculation validation tools
    ??? deployment/                  # Deployment utilities
```

## Frontend Structure (src/frontend/)

```
src/frontend/
??? public/                          # Static assets
?   ??? index.html                   # Main HTML template
?   ??? favicon.ico                  # App icon
?   ??? manifest.json               # PWA manifest
??? src/
?   ??? components/                  # Reusable UI components
?   ?   ??? common/                  # Generic components
?   ?   ?   ??? Button/             # Button component
?   ?   ?   ?   ??? Button.tsx
?   ?   ?   ?   ??? Button.test.tsx
?   ?   ?   ?   ??? index.ts        # Barrel export
?   ?   ?   ??? Modal/              # Modal component
?   ?   ?   ??? LoadingSpinner/     # Loading component
?   ?   ??? map/                    # Map-specific components
?   ?   ?   ??? PatioMap/           # Main map component
?   ?   ?   ??? PatioMarker/        # Patio marker component
?   ?   ?   ??? SunOverlay/         # Sun visualization overlay
?   ?   ??? patio/                  # Patio-specific components
?   ?       ??? PatioCard/          # Patio information card
?   ?       ??? PatioList/          # List of patios
?   ?       ??? SunForecast/        # Sun forecast display
?   ??? pages/                      # Route-level components
?   ?   ??? HomePage/               # Main search page
?   ?   ??? PatioDetailPage/        # Individual patio details
?   ?   ??? AboutPage/              # About/help page
?   ??? hooks/                      # Custom React hooks
?   ?   ??? useCurrentLocation.ts   # User location hook
?   ?   ??? usePatioData.ts         # Patio data fetching
?   ?   ??? useSunForecast.ts       # Sun forecast data
?   ?   ??? useMapInteraction.ts    # Map interaction logic
?   ??? services/                   # API services and external calls
?   ?   ??? api/                    # Backend API calls
?   ?   ?   ??? patioService.ts     # Patio-related API calls
?   ?   ?   ??? weatherService.ts   # Weather data API calls
?   ?   ?   ??? client.ts           # HTTP client configuration
?   ?   ??? geolocation/            # Browser geolocation
?   ?   ?   ??? locationService.ts  # Location utilities
?   ?   ??? storage/                # Local storage utilities
?   ?       ??? preferencesService.ts # User preferences
?   ??? types/                      # TypeScript type definitions
?   ?   ??? patio.ts               # Patio-related types
?   ?   ??? weather.ts             # Weather data types
?   ?   ??? location.ts            # Geographic types
?   ?   ??? api.ts                 # API response types
?   ??? utils/                      # Pure utility functions
?   ?   ??? sunCalculations.ts      # Client-side sun utilities
?   ?   ??? dateUtils.ts           # Date/time utilities
?   ?   ??? geoUtils.ts            # Geographic calculations
?   ?   ??? formatters.ts          # Data formatting functions
?   ??? constants/                  # Application constants
?   ?   ??? config.ts              # App configuration
?   ?   ??? apiUrls.ts             # API endpoint URLs
?   ?   ??? mapDefaults.ts         # Map default settings
?   ??? styles/                     # Global styles and themes
?   ?   ??? globals.css            # Global CSS imports
?   ?   ??? tailwind.css           # Tailwind base styles
?   ?   ??? components.css         # Component-specific styles
?   ??? context/                    # React Context providers
?   ?   ??? LocationContext.tsx     # User location context
?   ?   ??? PatioContext.tsx       # Selected patio context
?   ?   ??? PreferencesContext.tsx # User preferences context
?   ??? App.tsx                     # Main App component
?   ??? main.tsx                    # Application entry point
?   ??? vite-env.d.ts              # Vite type definitions
??? package.json                    # Dependencies and scripts
??? tsconfig.json                   # TypeScript configuration
??? vite.config.ts                  # Vite build configuration
??? tailwind.config.js              # Tailwind CSS configuration
??? eslint.config.js                # ESLint configuration
??? vitest.config.ts                # Test configuration
```

## Backend Structure (src/backend/)

```
src/backend/
??? SunnySeat.Api/                   # Main API project
?   ??? Program.cs                   # Application entry point
?   ??? Endpoints/                   # API endpoint definitions
?   ?   ??? PatioEndpoints.cs        # Patio search and details
?   ?   ??? WeatherEndpoints.cs      # Weather data endpoints
?   ?   ??? HealthEndpoints.cs       # Health check endpoints
?   ??? Middleware/                  # Custom middleware
?   ?   ??? RequestLoggingMiddleware.cs # Request logging
?   ?   ??? RateLimitingMiddleware.cs   # Rate limiting
?   ?   ??? ErrorHandlingMiddleware.cs  # Global error handling
?   ??? Configuration/               # Configuration classes
?   ?   ??? DatabaseOptions.cs       # Database configuration
?   ?   ??? WeatherApiOptions.cs     # Weather API settings
?   ?   ??? CacheOptions.cs          # Redis cache settings
?   ??? SunnySeat.Api.csproj        # Project file
?   ??? appsettings.json            # Configuration file
??? SunnySeat.Core/                  # Business logic and domain
?   ??? Entities/                    # Domain entities
?   ?   ??? Patio.cs                # Patio entity
?   ?   ??? Building.cs             # Building entity
?   ?   ??? WeatherData.cs          # Weather data entity
?   ?   ??? SunExposure.cs          # Sun exposure calculation result
?   ??? Services/                    # Business logic services
?   ?   ??? PatioService.cs         # Patio business logic
?   ?   ??? SunCalculationService.cs # Sun exposure calculations
?   ?   ??? WeatherService.cs       # Weather data processing
?   ?   ??? GeocodingService.cs     # Address/coordinate conversion
?   ??? Interfaces/                  # Service contracts
?   ?   ??? IPatioRepository.cs     # Patio data access interface
?   ?   ??? ISunCalculator.cs       # Sun calculation interface
?   ?   ??? IWeatherProvider.cs     # Weather data interface
?   ??? Models/                      # DTOs and request/response models
?   ?   ??? Requests/               # API request models
?   ?   ?   ??? GetPatiosRequest.cs # Patio search request
?   ?   ?   ??? SunForecastRequest.cs # Sun forecast request
?   ?   ??? Responses/              # API response models
?   ?   ?   ??? PatioResponse.cs    # Patio data response
?   ?   ?   ??? SunForecastResponse.cs # Sun forecast response
?   ?   ??? Shared/                 # Shared models
?   ?       ??? Coordinates.cs      # Geographic coordinates
?   ?       ??? TimeRange.cs        # Time range representation
?   ?       ??? Result.cs           # Result wrapper type
?   ??? Algorithms/                  # Core algorithms
?   ?   ??? SunPositionCalculator.cs # Solar position calculations
?   ?   ??? ShadowCaster.cs         # Shadow projection logic
?   ?   ??? ConfidenceScorer.cs     # Confidence calculation logic
?   ??? Extensions/                  # Extension methods
?   ?   ??? GeometryExtensions.cs   # PostGIS geometry helpers
?   ?   ??? DateTimeExtensions.cs   # DateTime utilities
?   ??? SunnySeat.Core.csproj       # Project file
??? SunnySeat.Data/                  # Data access layer
?   ??? Repositories/                # Data access implementations
?   ?   ??? PatioRepository.cs      # Patio data access
?   ?   ??? BuildingRepository.cs   # Building data access
?   ?   ??? WeatherRepository.cs    # Weather data access
?   ??? Configurations/             # Entity Framework configurations
?   ?   ??? PatioConfiguration.cs   # Patio entity mapping
?   ?   ??? BuildingConfiguration.cs # Building entity mapping
?   ?   ??? WeatherConfiguration.cs # Weather entity mapping
?   ??? Migrations/                 # Database migrations
?   ?   ??? [timestamp]_InitialCreate.cs # Initial database schema
?   ??? SunnySeatDbContext.cs       # Entity Framework context
?   ??? ConnectionFactory.cs        # Database connection management
?   ??? SunnySeat.Data.csproj       # Project file
??? SunnySeat.Workers/              # Background processing
?   ??? Services/                   # Worker services
?   ?   ??? SunPrecomputeWorker.cs  # Daily sun calculation worker
?   ?   ??? WeatherIngestWorker.cs  # Weather data ingestion worker
?   ?   ??? HealthCheckWorker.cs    # System health monitoring
?   ??? Configuration/              # Worker-specific configuration
?   ?   ??? WorkerOptions.cs        # Worker settings
?   ?   ??? SchedulingOptions.cs    # Job scheduling settings
?   ??? Program.cs                  # Worker host entry point
?   ??? SunnySeat.Workers.csproj    # Project file
??? SunnySeat.Shared/               # Shared utilities
    ??? Constants/                  # Shared constants
    ?   ??? ErrorCodes.cs          # Error code definitions
    ?   ??? TimeConstants.cs       # Time-related constants
    ??? Extensions/                 # Shared extension methods
    ?   ??? ServiceCollectionExtensions.cs # DI extensions
    ??? SunnySeat.Shared.csproj     # Project file
```

## Infrastructure Structure (infrastructure/)

```
infrastructure/
??? azure/                          # Azure Resource Manager templates
?   ??? main.bicep                  # Main infrastructure template
?   ??? modules/                    # Reusable resource modules
?   ?   ??? app-service.bicep       # Container instances
?   ?   ??? database.bicep          # PostgreSQL database
?   ?   ??? cache.bicep             # Redis cache
?   ?   ??? monitoring.bicep        # Application insights
?   ??? environments/               # Environment-specific parameters
?   ?   ??? dev.parameters.json     # Development environment
?   ?   ??? staging.parameters.json # Staging environment
?   ?   ??? prod.parameters.json    # Production environment
?   ??? deploy.ps1                  # Deployment script
??? docker/                         # Docker configurations
?   ??? Dockerfile.api              # API container
?   ??? Dockerfile.workers          # Workers container
?   ??? docker-compose.dev.yml      # Development environment
?   ??? docker-compose.prod.yml     # Production environment
??? scripts/                        # Utility scripts
    ??? deploy-staging.sh           # Staging deployment
    ??? deploy-production.sh        # Production deployment
    ??? backup-database.sh          # Database backup
    ??? restore-database.sh         # Database restore
```

## Tests Structure (tests/)

```
tests/
??? integration/                     # Integration tests
?   ??? PatioEndpointsTests.cs      # API integration tests
?   ??? SunCalculationTests.cs      # Sun calculation integration
?   ??? WeatherIntegrationTests.cs  # Weather API integration
??? performance/                     # Performance tests
?   ??? LoadTests.cs                # API load testing
?   ??? SunCalculationBenchmarks.cs # Calculation performance
?   ??? DatabasePerformanceTests.cs # Database query performance
??? e2e/                            # End-to-end tests
?   ??? playwright.config.ts        # Playwright configuration
?   ??? tests/                      # E2E test scenarios
?   ?   ??? patio-search.spec.ts    # Main search functionality
?   ?   ??? sun-forecast.spec.ts    # Sun forecast features
?   ?   ??? map-interaction.spec.ts # Map interaction tests
?   ??? fixtures/                   # Test data fixtures
??? shared/                         # Shared test utilities
    ??? TestHelpers.cs              # Common test utilities
    ??? DatabaseTestFixture.cs      # Database test setup
    ??? MockDataFactory.cs          # Test data generation
```

## Configuration Management

### Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# External APIs
WEATHER_API_KEY=openweathermap_key
WEATHER_API_URL=https://api.openweathermap.org/data/2.5

# Application
NODE_ENV=development|production
NEXT_PUBLIC_APP_URL=https://sunnyseat.se
```

### Configuration Files

- **Development**: `.env.local` (gitignored)
- **Staging**: Vercel environment variables
- **Production**: Vercel environment variables (secure)

## Build Artifacts

### Next.js Build Output

```
.next/
??? server/                        # Server-side code
?   ??? app/                       # App Router server components
?   ??? chunks/                    # Code splitting chunks
??? static/                        # Static assets
?   ??? chunks/                    # Client-side chunks
?   ??? [hash]/                    # Hashed assets
??? cache/                         # Build cache
```

### Vercel Deployment

- Automatic build on git push
- Serverless functions for API routes
- Edge network for static assets
- Automatic preview deployments for PRs

## Development Workflows

### Local Development Setup

1. Clone repository
2. Install dependencies: `npm install`
3. Set up environment variables: Copy `.env.example` to `.env.local`
4. Run Supabase migrations: `supabase db push` (or via Supabase dashboard)
5. Start development server: `npm run dev`
6. Access application: `http://localhost:3000`

### Testing Workflow

1. Unit tests: `npm test` (Jest/Vitest)
2. Integration tests: `npm run test:integration`
3. E2E tests: `npx playwright test`
4. Performance tests: `npm run test:performance`

### Deployment Process

1. Feature development in branches
2. Pull request with automated testing
3. Automatic preview deployment on PR creation (Vercel)
4. Merge to main triggers production deployment (Vercel)
5. Automatic database migrations via Supabase

---

**Source Tree Evolution**: This structure will evolve as the project grows. Major structural changes require architecture team approval and documentation updates.
