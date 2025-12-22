# Infrastructure Migration Note

> **Important**: This document notes the infrastructure migration from Azure/.NET to Vercel/Supabase that was completed in Epic 6.

## Migration Status

**Completed**: Epic 6 - Platform Migration to Next.js/Vercel/Supabase

The infrastructure has been migrated from:

- **Old Stack**: Azure Container Apps, .NET 8 API, Azure PostgreSQL, Azure Front Door
- **New Stack**: Vercel, Next.js Full-Stack, Supabase (PostgreSQL+PostGIS)

## Legacy Documentation

The following operational documentation files reference the **old Azure infrastructure** and are kept for historical reference:

- `infrastructure-deployment.md` - Azure Bicep templates and deployment
- `INFRASTRUCTURE-SUMMARY.md` - Azure resource summary
- `infrastructure-guide.md` - Azure networking and configuration
- `azure-setup-quick-reference.md` - Azure setup guide
- `secrets-management.md` - Azure Key Vault setup

## Current Infrastructure

For current infrastructure documentation, see:

- `architecture/tech-stack.md` - Current technology stack
- `architecture/deployment.md` - Current deployment approach
- `DEV_ENVIRONMENT.md` - Local development setup
- Epic 6 stories (6.1-6.10) - Migration implementation details

## Migration Details

The migration was completed in Epic 6 with the following stories:

- 6.1: Next.js Project Setup
- 6.2: Supabase Database Schema Migration
- 6.3: Data Migration Script
- 6.4: Core API Routes Migration
- 6.5: Spatial/Geographic API Migration
- 6.6: Frontend Migration to Next.js
- 6.7: Background Jobs Migration
- 6.8: Vercel Deployment Configuration
- 6.9: Integration Testing & Validation
- 6.10: Documentation & Cleanup

## Questions?

If you need information about the current infrastructure, refer to the architecture documentation or Epic 6 migration stories.
