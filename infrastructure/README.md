# SunnySeat Infrastructure (Bicep IaC)

## Overview

This directory contains **Infrastructure as Code (IaC)** for provisioning SunnySeat infrastructure on Azure using Bicep templates.

## Quick Start

### Prerequisites

1. **Azure CLI** (v2.50+): [Install Azure CLI](https://aka.ms/azure-cli)
2. **PowerShell** (v7+): [Install PowerShell](https://aka.ms/powershell)
3. **Azure Subscription** with Contributor access
4. **Logged in to Azure**: `az login`

### Deploy Development Environment

```powershell
cd infrastructure
.\scripts\deploy-dev.ps1 -Location "westeurope"
```

This will:

- ✅ Create resource group `sunnyseat-dev-rg`
- ✅ Generate secrets automatically (PostgreSQL password, JWT secret)
- ✅ Deploy all Azure resources (Container Apps, PostgreSQL, Redis, Key Vault, etc.)
- ✅ Store secrets in Key Vault
- ⏱️ Takes ~15-20 minutes

### What Gets Deployed

| Resource                       | Purpose                   | SKU (Dev)             |
| ------------------------------ | ------------------------- | --------------------- |
| **Container Apps Environment** | Managed container hosting | Consumption           |
| **Container App (API)**        | .NET 8 API                | 0.5 vCPU, 1 GB RAM    |
| **PostgreSQL 15**              | Database with PostGIS     | Burstable B1ms, 32 GB |
| **Redis Cache**                | Caching layer             | Basic C0 (250 MB)     |
| **Key Vault**                  | Secrets management        | Standard              |
| **Storage Account**            | Frontend hosting          | Standard LRS          |
| **Container Registry**         | Docker images             | Basic                 |
| **Application Insights**       | Monitoring                | Pay-as-you-go         |
| **Virtual Network**            | Network isolation         | 10.0.0.0/16           |

**Monthly Cost (Dev):** ~$80 USD

## Directory Structure

```
infrastructure/
├── bicep/
│   ├── main.bicep                          # Main orchestration template
│   ├── parameters/
│   │   ├── dev.parameters.json             # Development parameters
│   │   ├── staging.parameters.json         # Staging parameters
│   │   └── prod.parameters.json            # Production parameters
│   └── modules/
│       ├── container-app.bicep             # Container App configuration
│       ├── container-apps-environment.bicep # Container Apps Environment
│       ├── container-registry.bicep        # Azure Container Registry
│       ├── keyvault.bicep                  # Key Vault
│       ├── keyvault-secrets.bicep          # Key Vault secrets management
│       ├── monitoring.bicep                # App Insights & Log Analytics
│       ├── network.bicep                   # Virtual Network
│       ├── postgresql.bicep                # PostgreSQL Flexible Server
│       ├── redis.bicep                     # Azure Cache for Redis
│       └── storage.bicep                   # Storage Account
└── scripts/
    ├── deploy-dev.ps1                      # Deploy development
    ├── deploy-staging.ps1                  # Deploy staging
    ├── deploy-prod.ps1                     # Deploy production
    └── validate-templates.ps1              # Validate Bicep templates
```

## Deployment Guide

### Step 1: Validate Templates (Optional)

```powershell
.\scripts\validate-templates.ps1
```

### Step 2: Deploy Infrastructure

**Development:**

```powershell
.\scripts\deploy-dev.ps1 `
    -SubscriptionId "your-subscription-id" `
    -Location "westeurope" `
    -ResourceGroupName "sunnyseat-dev-rg"
```

**Staging:**

```powershell
.\scripts\deploy-staging.ps1 -Location "westeurope"
```

**Production:**

```powershell
.\scripts\deploy-prod.ps1 -Location "westeurope"
```

⚠️ Production requires typing `DEPLOY TO PRODUCTION` to confirm.

### Step 3: Post-Deployment

After deployment completes, you'll receive outputs like:

```
API URL: https://sunnyseat-dev-api.{region}.azurecontainerapps.io
Database Host: sunnyseat-dev-psql-abc123.postgres.database.azure.com
Key Vault: sunnyseat-dev-kv-abc123
```

**Next steps:**

1. Build and push Docker image
2. Run database migrations
3. Deploy frontend to Storage Account

See: [Infrastructure Deployment Guide](../SunnySeat.Docs/docs/ops/infrastructure-deployment.md)

## Manual Deployment (Azure CLI)

If you prefer manual control:

```powershell
# Create resource group
az group create --name sunnyseat-dev-rg --location westeurope

# Deploy infrastructure
az deployment group create `
    --resource-group sunnyseat-dev-rg `
    --template-file bicep/main.bicep `
    --parameters @bicep/parameters/dev.parameters.json `
    --name sunnyseat-dev-deployment
```

## Secrets Management

Secrets are stored in a central Key Vault and referenced by all environments.

**Required secrets:**

- `postgres-admin-password` - Database admin password
- `jwt-secret-key` - JWT authentication secret
- `openweathermap-api-key` - Weather API key (optional for MVP)
- `maptiler-api-key` - Map tiles API key (Story 4.1)

The deployment script automatically generates strong secrets for PostgreSQL and JWT.

**To add API keys manually:**

```powershell
az keyvault secret set `
    --vault-name sunnyseat-secrets-kv `
    --name "openweathermap-api-key" `
    --value "YOUR_API_KEY"
```

See: [Secrets Management Guide](../SunnySeat.Docs/docs/ops/secrets-management.md)

## Architecture

```
┌────────────────────────────────────────┐
│  Virtual Network (10.0.0.0/16)        │
│  ┌──────────────────────────────────┐ │
│  │ Container Apps Subnet            │ │
│  │ ┌──────────────────────────────┐ │ │
│  │ │  Container App (API)         │ │ │
│  │ │  .NET 8 Web API             │ │ │
│  │ └──────────────────────────────┘ │ │
│  └──────────────────────────────────┘ │
│  ┌──────────────────────────────────┐ │
│  │ Database Subnet                  │ │
│  │ ┌──────────────────────────────┐ │ │
│  │ │  PostgreSQL 15 + PostGIS     │ │ │
│  │ └──────────────────────────────┘ │ │
│  └──────────────────────────────────┘ │
│  ┌──────────────────────────────────┐ │
│  │ Redis Subnet                     │ │
│  │ ┌──────────────────────────────┐ │ │
│  │ │  Azure Cache for Redis       │ │ │
│  │ └──────────────────────────────┘ │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘

External Services:
- Key Vault (secrets)
- Storage Account (frontend)
- Container Registry (Docker images)
- Application Insights (monitoring)
```

## Environment Differences

| Feature                | Dev            | Staging             | Production        |
| ---------------------- | -------------- | ------------------- | ----------------- |
| **Container Replicas** | 1-3            | 1-5                 | 2-10              |
| **PostgreSQL SKU**     | Burstable B1ms | General Purpose D2s | Standard D4s (HA) |
| **Redis SKU**          | Basic C0       | Standard C1         | Standard C1       |
| **Storage**            | LRS            | GRS                 | GRS               |
| **Backup Retention**   | 7 days         | 14 days             | 30 days           |
| **High Availability**  | ❌ No          | ✅ Yes              | ✅ Yes            |
| **Monthly Cost**       | ~$80           | ~$400               | ~$695             |

## Troubleshooting

### Template Validation Fails

```powershell
# Check Bicep version
az bicep version

# Upgrade Bicep
az bicep upgrade

# Validate template
az bicep build --file bicep\main.bicep
```

### Deployment Fails

```powershell
# Check deployment status
az deployment group list --resource-group sunnyseat-dev-rg --output table

# View deployment details
az deployment group show `
    --resource-group sunnyseat-dev-rg `
    --name sunnyseat-dev-deployment
```

### Cannot Access Key Vault

```powershell
# Grant yourself access
az role assignment create `
    --assignee "your-email@domain.com" `
    --role "Key Vault Secrets Officer" `
    --scope "/subscriptions/<sub-id>/resourceGroups/sunnyseat-secrets-rg/providers/Microsoft.KeyVault/vaults/<vault-name>"
```

## Cleanup

To delete all resources and stop billing:

```powershell
# WARNING: This deletes everything!
az group delete --name sunnyseat-dev-rg --yes --no-wait
```

## Documentation

Comprehensive guides available:

- **[Infrastructure Deployment Guide](../SunnySeat.Docs/docs/ops/infrastructure-deployment.md)** - Complete deployment instructions
- **[Secrets Management Guide](../SunnySeat.Docs/docs/ops/secrets-management.md)** - Secret rotation and access control
- **[Infrastructure Guide](../SunnySeat.Docs/docs/ops/infrastructure-guide.md)** - Architecture diagrams and best practices

## Support

For issues:

1. Check Application Insights logs
2. Review deployment history in Azure Portal
3. Consult documentation above
4. Open issue in repository

## Story Reference

This infrastructure was created as part of:

**Story 1.7: Azure Infrastructure Provisioning & IaC Setup**

- Epic 1 - Foundation & Data Setup
- Implements complete Infrastructure as Code for all environments
- Replaces manual Azure Portal setup with automated Bicep deployments

---

**Created:** October 9, 2025  
**Maintained By:** DevOps Team  
**Version:** 1.0
