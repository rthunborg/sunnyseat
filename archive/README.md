# Archived Code - Legacy Platform

This directory documents the archived code from the legacy .NET 8 / Azure platform that was migrated to Next.js / Vercel / Supabase in Epic 6.

## ⚠️ Important Note

**This code is archived for reference only.** The current platform uses:
- **Next.js 16+** (instead of .NET 8 API)
- **Vercel** (instead of Azure Container Apps)
- **Supabase** (instead of Azure PostgreSQL)
- **Next.js App Router** (instead of separate React/Vue frontends)

## Archived Components

### Backend Code

**Location**: `../src/backend/`

**Contents**:
- `.NET 8 Minimal API` code (SunnySeat.Api, SunnySeat.Core, SunnySeat.Data, SunnySeat.Workers)
- Entity Framework migrations
- API endpoint implementations
- Background worker patterns
- Authentication logic

**Why Archived**: Replaced by Next.js API routes in `nextjs-app/app/api/`

**Reference**: See [Story 6.4: Core API Routes Migration](../SunnySeat.Docs/docs/stories/6.4.core-api-routes-migration.md)

### Frontend Code

**Location**: `../src/frontend/admin/` and `../src/frontend/public/`

**Contents**:
- React admin frontend (Vite + React)
- Vue.js public frontend
- Component implementations
- State management patterns
- Map integration (MapLibre GL JS)

**Why Archived**: Replaced by Next.js App Router in `nextjs-app/`

**Reference**: See [Story 6.6: Frontend Migration to Next.js](../SunnySeat.Docs/docs/stories/6.6.frontend-migration-nextjs.md)

### Infrastructure Code

**Location**: `../infrastructure/`

**Contents**:
- Azure Bicep templates (`infrastructure/bicep/`)
- Deployment scripts (`infrastructure/scripts/`)
- Azure resource configurations
- Container App definitions
- PostgreSQL configurations

**Why Archived**: Replaced by Vercel deployment configuration

**Reference**: See [Story 6.8: Vercel Deployment Configuration](../SunnySeat.Docs/docs/stories/6.8.vercel-deployment-configuration.md)

### Docker Configuration

**Location**: `../docker-compose.dev.yml`, `../Dockerfile`

**Contents**:
- Docker Compose configuration for local development
- Dockerfile for .NET 8 API
- Container configurations

**Why Archived**: Replaced by Next.js development server and Vercel serverless functions

### Configuration Files

**Location**: Various locations

**Contents**:
- `appsettings.json` and related .NET configuration files
- Azure-specific configuration
- Old environment variable configurations

**Why Archived**: Replaced by Next.js environment variables and Vercel configuration

## Migration Reference

For details on the migration process, see:

- [Migration Guide](../SunnySeat.Docs/docs/migration-guide.md) - Complete migration documentation
- [Epic 6: Platform Migration](../SunnySeat.Docs/docs/epics/epic-6-platform-migration.md) - Epic overview
- [Story 6.1-6.10](../SunnySeat.Docs/docs/stories/) - Individual migration stories

## What Was Preserved

The following patterns and implementations were preserved during migration:

### API Patterns
- API endpoint structure and contracts
- Request/response formats
- Error handling patterns
- Authentication flow

### Database Patterns
- Entity relationships
- Spatial query logic
- Migration patterns (adapted to Supabase)

### Frontend Patterns
- Component structure
- State management approaches
- Map integration patterns
- UI/UX design

### Background Jobs
- Job scheduling patterns
- Data processing logic
- Error handling and retries

## Accessing Archived Code

The archived code remains in the repository for reference:

- **Backend**: `src/backend/`
- **Frontend**: `src/frontend/`
- **Infrastructure**: `infrastructure/`
- **Docker**: Root directory (`docker-compose.dev.yml`, `Dockerfile`)

## When to Reference Archived Code

Refer to archived code when:

1. **Understanding Original Implementation**: To understand how features were originally implemented
2. **Migration Questions**: To answer questions about migration decisions
3. **Pattern Reference**: To reference patterns that were preserved
4. **Historical Context**: To understand project evolution

## When NOT to Use Archived Code

**Do NOT**:

- Copy code directly from archived files (use new Next.js patterns instead)
- Deploy archived infrastructure (use Vercel deployment instead)
- Run archived Docker configurations (use Next.js dev server instead)
- Reference archived code as current implementation

## Cleanup Recommendations

In the future, consider:

1. **Git Archive Branch**: Create a git branch with archived code for cleaner main branch
2. **Separate Repository**: Move archived code to separate repository for reference
3. **Documentation Only**: Keep only documentation and remove actual code files

## Support

For questions about archived code:

1. Review migration documentation
2. Check story documentation for migration details
3. Contact development team

---

**Archived Date**: Epic 6 completion (2024)  
**Migration Status**: ✅ Complete  
**Current Platform**: Next.js 16+ / Vercel / Supabase
