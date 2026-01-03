# SunnySeat Deployment Documentation

Welcome to the SunnySeat deployment guides! This folder contains practical, step-by-step instructions for running and deploying the application.

## ⚠️ Important Note

**This folder contains legacy Azure deployment documentation.** The current platform uses **Vercel** for hosting and **Supabase** for the database. For current deployment instructions, see:

- **[Vercel Deployment Guide](../nextjs-app/docs/vercel-deployment.md)** - Current deployment guide for Vercel
- **[Environment Variables](../nextjs-app/docs/environment-variables.md)** - Environment variable configuration

## Current Platform Architecture

- **Hosting**: Vercel (serverless functions, edge network)
- **Database**: Supabase (PostgreSQL with PostGIS)
- **Frontend/Backend**: Next.js 16+ (full-stack)
- **Background Jobs**: Vercel Cron

## Available Guides

### Current Deployment (Vercel)

- **[Vercel Deployment Guide](../nextjs-app/docs/vercel-deployment.md)** - Complete guide for deploying to Vercel
- **[Environment Variables](../nextjs-app/docs/environment-variables.md)** - Environment variable setup
- **[Local Development Setup](01-Local-Development-Setup.md)** - Set up and run locally (updated for new platform)

### Legacy Azure Deployment (Archived)

These guides are for reference only - the platform has migrated from Azure to Vercel:

- **[03-Backend-Deployment-Azure.md](03-Backend-Deployment-Azure.md)** - Legacy: Deploy .NET API to Azure Container Apps
- **[04-Admin-Frontend-Deployment.md](04-Admin-Frontend-Deployment.md)** - Legacy: Deploy React admin frontend to Azure Storage
- **[05-Public-Frontend-Deployment.md](05-Public-Frontend-Deployment.md)** - Legacy: Deploy Vue.js public frontend to Azure Storage
- **[06-Full-Stack-Deployment.md](06-Full-Stack-Deployment.md)** - Legacy: Full-stack Azure deployment
- **[10-Docker-ACR-Explained.md](10-Docker-ACR-Explained.md)** - Legacy: Docker ACR App Service flow

### Utilities & Troubleshooting

- **[07-Authentication-Setup.md](07-Authentication-Setup.md)** - Create admin users and get JWT tokens
- **[08-Database-Management.md](08-Database-Management.md)** - Database migrations, seeding, and backups
- **[09-Common-Issues.md](09-Common-Issues.md)** - Troubleshooting common deployment issues

## Quick Start

**First time?** Start here:
1. Read [01-Local-Development-Setup.md](01-Local-Development-Setup.md) for local setup
2. Read [Vercel Deployment Guide](../nextjs-app/docs/vercel-deployment.md) for deployment
3. Get everything running locally, then deploy to Vercel

**Need to deploy?**
- **Current Platform**: [Vercel Deployment Guide](../nextjs-app/docs/vercel-deployment.md)
- **Legacy Azure**: See archived guides above (for reference only)

## Prerequisites

### Current Platform (Vercel)

- Node.js 20+ and npm
- Git installed
- Vercel account ([sign up](https://vercel.com/signup))
- Supabase account and project
- OpenWeatherMap API key (optional)

### Legacy Platform (Azure - Archived)

- Windows with PowerShell 7+
- .NET 8 SDK installed
- Azure CLI installed
- Docker Desktop installed

## Migration Notes

The platform has been migrated from:
- **Old**: Azure Container Apps + Azure Storage + .NET 8 API
- **New**: Vercel + Supabase + Next.js full-stack

See [Migration Documentation](../SunnySeat.Docs/docs/stories/6.4.core-api-routes-migration.md) for migration details.

## Contributing

Found an issue or want to improve these guides? Please update the relevant file and commit your changes!

## Support

If you encounter issues not covered in these guides:
1. Check [09-Common-Issues.md](09-Common-Issues.md)
2. Check [Vercel Deployment Guide](../nextjs-app/docs/vercel-deployment.md) troubleshooting section
3. Reach out to the team
