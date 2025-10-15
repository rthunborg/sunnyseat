# Azure Infrastructure Deployment Guide

## Overview

This guide covers deploying SunnySeat infrastructure to Azure using Infrastructure as Code (Bicep templates).

## Prerequisites

### Required Tools

- **Azure CLI** (v2.50+): [Install Azure CLI](https://aka.ms/azure-cli)
- **PowerShell** (v7+): [Install PowerShell](https://aka.ms/powershell)
- **Azure Bicep**: Installed automatically with Azure CLI 2.20+
- **.NET 8 SDK**: For building the application
- **Docker**: For building container images

### Required Permissions

You need the following Azure RBAC roles:

- **Contributor** role on the subscription (or resource group)
- **User Access Administrator** (for managed identity role assignments)

### Azure Subscription

Ensure you have an active Azure subscription. Check current subscription:

```powershell
az account show
```

Set a specific subscription:

```powershell
az account set --subscription "Your Subscription Name"
```

## Infrastructure Architecture

### Resources Provisioned

| Resource                       | Purpose                       | SKU (Dev)      | SKU (Prod)                     |
| ------------------------------ | ----------------------------- | -------------- | ------------------------------ |
| **Container Apps Environment** | Managed Kubernetes            | Consumption    | Consumption                    |
| **Container App (API)**        | .NET 8 API hosting            | 0.5 vCPU, 1 GB | 0.5 vCPU, 1 GB (2-10 replicas) |
| **PostgreSQL Flexible Server** | Primary database with PostGIS | Burstable B1ms | Standard D4s (HA)              |
| **Azure Cache for Redis**      | Caching layer                 | Basic C0       | Standard C1                    |
| **Key Vault**                  | Secrets management            | Standard       | Standard                       |
| **Application Insights**       | Monitoring & logging          | Pay-as-you-go  | Pay-as-you-go                  |
| **Log Analytics Workspace**    | Centralized logging           | Pay-as-you-go  | Pay-as-you-go                  |
| **Storage Account**            | Static website hosting        | Standard LRS   | Standard GRS                   |
| **Container Registry**         | Docker image storage          | Basic          | Standard                       |
| **Virtual Network**            | Network isolation             | N/A            | N/A                            |

### Network Architecture

```
Virtual Network (10.0.0.0/16)
├── Container Apps Subnet (10.0.0.0/23) - 512 IPs
├── Database Subnet (10.0.2.0/24) - Delegated to PostgreSQL
└── Redis Subnet (10.0.3.0/24)
```

## Pre-Deployment Setup

### 1. Generate Secrets

Secrets are stored in a central Key Vault (`sunnyseat-secrets-kv`) and referenced by all environments.

**Generate PostgreSQL password:**

```powershell
# Generate strong password (32 characters)
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$postgresPassword = [Convert]::ToBase64String($bytes)
Write-Host $postgresPassword
```

**Generate JWT secret key:**

```powershell
# Generate JWT secret (64 bytes, base64 encoded)
$bytes = New-Object byte[] 64
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$jwtSecret = [Convert]::ToBase64String($bytes)
Write-Host $jwtSecret
```

### 2. Create Secrets Key Vault

Create a resource group for secrets:

```powershell
az group create --name sunnyseat-secrets-rg --location westeurope
```

Create Key Vault (name must be globally unique):

```powershell
$uniqueSuffix = Get-Random -Maximum 99999
$kvName = "sunnyseat-secrets-$uniqueSuffix"

az keyvault create `
    --name $kvName `
    --resource-group sunnyseat-secrets-rg `
    --location westeurope `
    --enable-rbac-authorization false
```

Store secrets:

```powershell
# Store PostgreSQL password
az keyvault secret set --vault-name $kvName --name "postgres-admin-password" --value $postgresPassword

# Store JWT secret
az keyvault secret set --vault-name $kvName --name "jwt-secret-key" --value $jwtSecret

# Store API keys (add your actual keys)
az keyvault secret set --vault-name $kvName --name "openweathermap-api-key" --value "YOUR_API_KEY"
az keyvault secret set --vault-name $kvName --name "maptiler-api-key" --value "YOUR_API_KEY"
```

### 3. Update Parameter Files

Update the Key Vault references in parameter files:

**File:** `infrastructure/bicep/parameters/dev.parameters.json`

Replace `{subscription-id}` with your Azure subscription ID in all parameter files.

Get subscription ID:

```powershell
az account show --query "id" -o tsv
```

## Deployment

### Development Environment

Navigate to infrastructure directory:

```powershell
cd infrastructure
```

**Option 1: Using deployment script (recommended):**

```powershell
.\scripts\deploy-dev.ps1 `
    -SubscriptionId "your-subscription-id" `
    -Location "westeurope" `
    -ResourceGroupName "sunnyseat-dev-rg"
```

**Option 2: Manual deployment:**

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

**Deployment time:** 15-20 minutes

### Staging Environment

```powershell
.\scripts\deploy-staging.ps1 `
    -SubscriptionId "your-subscription-id" `
    -Location "westeurope"
```

### Production Environment

⚠️ **Production requires manual approval:**

```powershell
.\scripts\deploy-prod.ps1 `
    -SubscriptionId "your-subscription-id" `
    -Location "westeurope"
```

Type `DEPLOY TO PRODUCTION` when prompted to confirm.

## Post-Deployment Steps

### 1. Configure Container Registry

Get Container Registry credentials:

```powershell
$acrName = "sunnyseatdev<uniqueid>"
$acrPassword = az acr credential show --name $acrName --query "passwords[0].value" -o tsv

Write-Host "ACR Username: $acrName"
Write-Host "ACR Password: $acrPassword"
```

### 2. Build and Push Docker Image

```powershell
# Login to Container Registry
az acr login --name $acrName

# Build and push API image
cd ../src/backend
docker build -t $acrName.azurecr.io/sunnyseat-api:latest -f SunnySeat.Api/Dockerfile .
docker push $acrName.azurecr.io/sunnyseat-api:latest
```

### 3. Grant Container App Access to ACR

```powershell
# Get Container App managed identity
$apiIdentity = az containerapp show `
    --name sunnyseat-dev-api `
    --resource-group sunnyseat-dev-rg `
    --query "identity.principalId" -o tsv

# Grant AcrPull role
az role assignment create `
    --assignee $apiIdentity `
    --role "AcrPull" `
    --scope "/subscriptions/<subscription-id>/resourceGroups/sunnyseat-dev-rg/providers/Microsoft.ContainerRegistry/registries/$acrName"
```

### 4. Run Database Migrations

Get database connection string from Key Vault:

```powershell
$kvName = "sunnyseat-dev-kv-<uniqueid>"
$dbConnString = az keyvault secret show `
    --vault-name $kvName `
    --name "ConnectionStrings--DefaultConnection" `
    --query "value" -o tsv

# Run migrations
cd ../../src/backend
$env:ConnectionStrings__DefaultConnection = $dbConnString
dotnet ef database update --project SunnySeat.Data --startup-project SunnySeat.Api
```

### 5. Deploy Frontend to Storage Account

```powershell
# Build frontend
cd ../frontend/admin
npm install
npm run build

# Get storage account name
$storageName = az storage account list `
    --resource-group sunnyseat-dev-rg `
    --query "[0].name" -o tsv

# Upload to $web container
az storage blob upload-batch `
    --account-name $storageName `
    --source ./dist `
    --destination '$web' `
    --overwrite
```

### 6. Verify Deployment

Get API URL:

```powershell
$apiUrl = az containerapp show `
    --name sunnyseat-dev-api `
    --resource-group sunnyseat-dev-rg `
    --query "properties.configuration.ingress.fqdn" -o tsv

Write-Host "API URL: https://$apiUrl"

# Test API
Invoke-RestMethod -Uri "https://$apiUrl/health"
```

## Validation

### Template Validation

Validate Bicep templates before deployment:

```powershell
.\scripts\validate-templates.ps1
```

### Deployment Validation

Check deployment status:

```powershell
az deployment group list --resource-group sunnyseat-dev-rg --output table
```

View deployment outputs:

```powershell
az deployment group show `
    --resource-group sunnyseat-dev-rg `
    --name sunnyseat-dev-deployment `
    --query "properties.outputs"
```

## Troubleshooting

### Common Issues

**1. Template validation fails:**

```powershell
# Check Bicep version
az bicep version

# Update Bicep
az bicep upgrade

# Validate locally
az bicep build --file bicep/main.bicep
```

**2. Key Vault access denied:**

```powershell
# Grant yourself Key Vault Secrets Officer role
az role assignment create `
    --assignee "your-email@domain.com" `
    --role "Key Vault Secrets Officer" `
    --scope "/subscriptions/<sub-id>/resourceGroups/sunnyseat-secrets-rg/providers/Microsoft.KeyVault/vaults/<vault-name>"
```

**3. Container App not starting:**

Check logs:

```powershell
az containerapp logs show `
    --name sunnyseat-dev-api `
    --resource-group sunnyseat-dev-rg `
    --follow
```

**4. Database connection fails:**

Check firewall rules:

```powershell
az postgres flexible-server firewall-rule list `
    --resource-group sunnyseat-dev-rg `
    --name sunnyseat-dev-psql-<uniqueid>
```

## Rollback Procedures

### Rollback to Previous Deployment

List deployments:

```powershell
az deployment group list `
    --resource-group sunnyseat-dev-rg `
    --output table
```

Re-deploy previous version:

```powershell
az deployment group create `
    --resource-group sunnyseat-dev-rg `
    --template-file bicep/main.bicep `
    --parameters @bicep/parameters/dev.parameters.json `
    --mode Incremental
```

### Emergency Shutdown

Stop Container App (stops billing for compute):

```powershell
az containerapp revision deactivate `
    --name sunnyseat-dev-api `
    --resource-group sunnyseat-dev-rg `
    --revision <revision-name>
```

## Cost Management

### Estimated Monthly Costs

**Development:**

- Container Apps: ~$30
- PostgreSQL (Burstable): ~$15
- Redis (Basic): ~$15
- Storage: ~$5
- Other services: ~$15
- **Total: ~$80/month**

**Production:**

- Container Apps (2 replicas): ~$200
- PostgreSQL (Standard, HA): ~$350
- Redis (Standard): ~$75
- Storage: ~$20
- Other services: ~$50
- **Total: ~$695/month**

### Cost Optimization

View current costs:

```powershell
az costmanagement query `
    --type Usage `
    --scope "/subscriptions/<subscription-id>/resourceGroups/sunnyseat-dev-rg" `
    --timeframe MonthToDate
```

Set up cost alerts:

```powershell
# Create budget (e.g., $100/month for dev)
az consumption budget create `
    --amount 100 `
    --budget-name sunnyseat-dev-budget `
    --category Cost `
    --time-grain Monthly `
    --resource-group sunnyseat-dev-rg
```

## Cleanup

Delete entire environment:

```powershell
# WARNING: This deletes all resources and data
az group delete --name sunnyseat-dev-rg --yes --no-wait
```

Delete secrets vault (if no longer needed):

```powershell
az group delete --name sunnyseat-secrets-rg --yes --no-wait
```

## Additional Resources

- [Azure Bicep Documentation](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)
- [Container Apps Documentation](https://learn.microsoft.com/azure/container-apps/)
- [PostgreSQL Flexible Server Documentation](https://learn.microsoft.com/azure/postgresql/flexible-server/)
- [Azure Key Vault Documentation](https://learn.microsoft.com/azure/key-vault/)

## Support

For issues or questions:

1. Check logs in Application Insights
2. Review deployment history in Azure Portal
3. Consult this documentation
4. Contact DevOps team

---

**Document Version:** 1.0  
**Last Updated:** October 9, 2025  
**Maintained By:** DevOps Team
