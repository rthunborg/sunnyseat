# SunnySeat Deployment Documentation

Welcome to the SunnySeat deployment guides! This folder contains practical, step-by-step instructions for running and deploying the application.

##  Available Guides

### Local Development
- **[01-Local-Development-Setup.md](01-Local-Development-Setup.md)** - Set up and run everything locally for development
- **[02-Testing-Locally.md](02-Testing-Locally.md)** - How to test the application locally

### Azure Deployment
- **[03-Backend-Deployment-Azure.md](03-Backend-Deployment-Azure.md)** - Deploy the .NET API to Azure Container Apps
- **[04-Admin-Frontend-Deployment.md](04-Admin-Frontend-Deployment.md)** - Deploy the React admin frontend to Azure Storage
- **[05-Public-Frontend-Deployment.md](05-Public-Frontend-Deployment.md)** - Deploy the Vue.js public frontend to Azure Storage
- **[06-Full-Stack-Deployment.md](06-Full-Stack-Deployment.md)** - Deploy everything (backend + both frontends)

### Utilities & Troubleshooting
- **[07-Authentication-Setup.md](07-Authentication-Setup.md)** - Create admin users and get JWT tokens
- **[08-Database-Management.md](08-Database-Management.md)** - Database migrations, seeding, and backups
- **[09-Common-Issues.md](09-Common-Issues.md)** - Troubleshooting common deployment issues
- **[10-Docker-ACR-Explained.md](10-Docker-ACR-Explained.md)** - Understanding the Docker  ACR  App Service flow

##  Quick Start

**First time?** Start here:
1. Read [01-Local-Development-Setup.md](01-Local-Development-Setup.md)
2. Get everything running locally
3. Then move to Azure deployment guides as needed

**Need to deploy?**
- Backend only: [03-Backend-Deployment-Azure.md](03-Backend-Deployment-Azure.md)
- Admin UI only: [04-Admin-Frontend-Deployment.md](04-Admin-Frontend-Deployment.md)
- Public UI only: [05-Public-Frontend-Deployment.md](05-Public-Frontend-Deployment.md)
- Everything: [06-Full-Stack-Deployment.md](06-Full-Stack-Deployment.md)

##  Prerequisites

All guides assume you have:
- Windows with PowerShell 7+
- Git installed
- .NET 8 SDK installed
- Node.js 18+ and npm installed
- Azure CLI installed (for Azure deployments)
- Docker Desktop installed (for containerization)

##  Contributing

Found an issue or want to improve these guides? Please update the relevant file and commit your changes!

##  Support

If you encounter issues not covered in these guides, check [09-Common-Issues.md](09-Common-Issues.md) or reach out to the team.
