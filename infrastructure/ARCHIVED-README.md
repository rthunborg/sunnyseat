# ⚠️ ARCHIVED: Legacy Azure Infrastructure

**This infrastructure code is archived.** The platform has been migrated to Vercel/Supabase.

## Current Platform

The current platform uses:
- **Vercel** for hosting (instead of Azure Container Apps)
- **Supabase** for database (instead of Azure PostgreSQL)
- **Next.js** full-stack (instead of .NET 8 API)

## Archived Infrastructure

This directory contains the **legacy Azure infrastructure** code that was used before the migration:

- **Bicep Templates** (`bicep/`) - Azure resource definitions
- **Deployment Scripts** (`scripts/`) - PowerShell deployment scripts
- **Configuration Files** - Environment-specific parameters

## Migration Reference

For current deployment, see:
- [Vercel Deployment Guide](../nextjs-app/docs/vercel-deployment.md)
- [Migration Guide](../SunnySeat.Docs/docs/migration-guide.md)

## Why This Code Exists

This code is kept for:
- **Historical Reference**: Understanding the original infrastructure
- **Migration Context**: Reference for migration decisions
- **Pattern Reference**: Azure patterns that were adapted

## Do NOT Use This Code

**Do not**:
- Deploy this infrastructure (use Vercel instead)
- Reference this as current infrastructure
- Use these scripts for new deployments

## Current Infrastructure Documentation

For current infrastructure, see:
- [Architecture Documentation](../SunnySeat.Docs/docs/architecture/)
- [Vercel Architecture](../SunnySeat.Docs/docs/architecture/vercel-architecture.md)
- [Supabase Architecture](../SunnySeat.Docs/docs/architecture/supabase-architecture.md)

---

**Status**: Archived  
**Migration Date**: Epic 6 (2024)  
**Current Platform**: Vercel / Supabase / Next.js
