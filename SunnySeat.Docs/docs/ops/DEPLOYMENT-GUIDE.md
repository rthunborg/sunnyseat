# SunnySeat Deployment Guide

**Version:** 1.0  
**Last Updated:** October 14, 2025  
**Applies to:** Epic 5 - Deployment & Operations

## Overview

This guide covers the complete Infrastructure as Code (IaC) deployment process for SunnySeat using Azure Bicep templates. All Azure resources are provisioned automatically - no manual portal clicking required (except for initial Azure subscription setup).

## Architecture

**Deployment Stack:**

- **IaC Tool:** Azure Bicep
- **CI/CD:** GitHub Actions
- **Frontend:** Azure Static Web Apps
- **Backend:** Azure Container Apps
- **Database:** Azure Database for PostgreSQL with PostGIS
- **Cache:** Azure Cache for Redis
- **Monitoring:** Azure Application Insights + Log Analytics
- **Secrets:** Azure Key Vault
- **Container Registry:** Azure Container Registry

## Prerequisites

### 1. Azure Subscription

- [ ] Active Azure subscription
- [ ] Owner or Contributor role on subscription
- [ ] Azure CLI installed (`az --version`)
- [ ] Logged in to Azure (`az login`)

### 2. GitHub Repository

- [ ] Repository admin access
- [ ] Ability to create GitHub Actions secrets
- [ ] Repository: `https://github.com/[your-org]/SunnySeat`

### 3. Local Tools

- [ ] Azure CLI 2.50+ installed
- [ ] PowerShell 7+ (Windows) or Bash (Linux/Mac)
- [ ] Git installed and configured
- [ ] Node.js 18+ and npm (for frontend builds)
- [ ] .NET 8 SDK (for backend builds)

### 4. Assets

- [ ] PWA icons generated (icon-192.png, icon-512.png, apple-touch-icon.png)
- [ ] OpenWeatherMap API key (https://openweathermap.org/api)
- [ ] MapTiler API key (optional, https://www.maptiler.com/)

## Step-by-Step Deployment

### Step 1: Initial Azure Setup

#### 1.1 Create Resource Groups

```powershell
# Login to Azure
az login

# Set your subscription (if you have multiple)
az account set --subscription "Your Subscription Name"

# Create resource groups for each environment
az group create --name sunnyseat-dev-rg --location westeurope
az group create --name sunnyseat-staging-rg --location westeurope
az group create --name sunnyseat-prod-rg --location westeurope

# Create a secrets resource group (shared across environments)
az group create --name sunnyseat-secrets-rg --location westeurope
```

#### 1.2 Create Secrets Key Vault

```powershell
# Create a shared Key Vault for deployment secrets
$secretsKvName = "sunnyseat-secrets-kv-$(Get-Random -Maximum 9999)"

az keyvault create `
  --name $secretsKvName `
  --resource-group sunnyseat-secrets-rg `
  --location westeurope `
  --enabled-for-template-deployment true

# Store the Key Vault ID for later use
$secretsKvId = az keyvault show --name $secretsKvName --resource-group sunnyseat-secrets-rg --query id -o tsv
Write-Host "Secrets Key Vault ID: $secretsKvId"
```

#### 1.3 Generate and Store Secrets

```powershell
# Generate JWT secret (strong random key)
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# Generate PostgreSQL admin password
$postgresPassword = -join ((65..90) + (97..122) + (48..57) + (33,35,36,37,38,42,43,45,61,63,64) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Store secrets in Key Vault
az keyvault secret set --vault-name $secretsKvName --name "jwt-secret-key" --value $jwtSecret
az keyvault secret set --vault-name $secretsKvName --name "postgres-admin-password" --value $postgresPassword
az keyvault secret set --vault-name $secretsKvName --name "openweathermap-api-key" --value "YOUR_API_KEY_HERE"

Write-Host "✅ Secrets stored in Key Vault"
```

### Step 2: Update Parameter Files

Update the parameter files with your Key Vault ID:

**File:** `infrastructure/bicep/parameters/dev.parameters.json`

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": {
      "value": "dev"
    },
    "postgresAdminUsername": {
      "value": "sunnyseatadmin"
    },
    "postgresAdminPassword": {
      "reference": {
        "keyVault": {
          "id": "<YOUR-SECRETS-KEYVAULT-ID>"
        },
        "secretName": "postgres-admin-password"
      }
    },
    "jwtSecretKey": {
      "reference": {
        "keyVault": {
          "id": "<YOUR-SECRETS-KEYVAULT-ID>"
        },
        "secretName": "jwt-secret-key"
      }
    },
    "openWeatherMapApiKey": {
      "reference": {
        "keyVault": {
          "id": "<YOUR-SECRETS-KEYVAULT-ID>"
        },
        "secretName": "openweathermap-api-key"
      }
    },
    "mapTilerApiKey": {
      "value": ""
    },
    "corsAllowedOrigins": {
      "value": ["http://localhost:3000", "http://localhost:5173"]
    }
  }
}
```

Replace `<YOUR-SECRETS-KEYVAULT-ID>` with the actual Key Vault ID from Step 1.2.

### Step 3: Deploy Infrastructure

#### 3.1 Validate Templates (Optional but Recommended)

```powershell
# Navigate to infrastructure directory
cd infrastructure

# Validate dev template
.\scripts\validate-templates.ps1
```

#### 3.2 Deploy to Development Environment

```powershell
# Deploy dev environment
.\scripts\deploy-dev.ps1

# This will:
# - Deploy all Azure resources via Bicep
# - Output connection strings and URLs
# - Take approximately 15-20 minutes
```

#### 3.3 Capture Deployment Outputs

After deployment completes, capture these outputs:

```powershell
# Get deployment outputs
az deployment group show `
  --name sunnyseat-dev-deployment `
  --resource-group sunnyseat-dev-rg `
  --query properties.outputs

# Key outputs you need:
# - appInsightsConnectionString
# - staticWebAppName
# - apiUrl
# - frontendUrl
```

### Step 4: Configure GitHub Secrets

Navigate to your GitHub repository settings: `https://github.com/[your-org]/SunnySeat/settings/secrets/actions`

#### Required Secrets

Add the following secrets (use values from Step 3.3):

1. **`AZURE_STATIC_WEB_APPS_API_TOKEN`**

   ```powershell
   # Get the deployment token for Static Web Apps
   $swaName = "sunnyseat-dev-frontend"
   $swaToken = az staticwebapp secrets list `
     --name $swaName `
     --resource-group sunnyseat-dev-rg `
     --query properties.apiKey -o tsv

   Write-Host "Add this to GitHub Secrets as AZURE_STATIC_WEB_APPS_API_TOKEN:"
   Write-Host $swaToken
   ```

2. **`VITE_APPLICATIONINSIGHTS_CONNECTION_STRING`**

   ```powershell
   # Get Application Insights connection string
   $aiConnString = az deployment group show `
     --name sunnyseat-dev-deployment `
     --resource-group sunnyseat-dev-rg `
     --query properties.outputs.appInsightsConnectionString.value -o tsv

   Write-Host "Add this to GitHub Secrets as VITE_APPLICATIONINSIGHTS_CONNECTION_STRING:"
   Write-Host $aiConnString
   ```

3. **Azure credentials for GitHub Actions (if deploying backend via Actions)**

   ```powershell
   # Create a service principal for GitHub Actions
   $subscriptionId = az account show --query id -o tsv

   az ad sp create-for-rbac `
     --name "github-actions-sunnyseat" `
     --role contributor `
     --scopes /subscriptions/$subscriptionId/resourceGroups/sunnyseat-dev-rg `
     --sdk-auth

   # Copy the entire JSON output and add as AZURE_CREDENTIALS secret
   ```

### Step 5: Update Environment Variables

#### 5.1 Update `.env.production` File

**File:** `src/frontend/admin/.env.production`

```env
# Application Insights connection string from deployment
VITE_APPLICATIONINSIGHTS_CONNECTION_STRING=<from-step-3.3>

# Application URL (use Static Web App URL from deployment)
VITE_APP_URL=<frontendUrl-from-step-3.3>

# Production API URL
VITE_API_BASE_URL=<apiUrl-from-step-3.3>

# Map Configuration
VITE_MAP_DEFAULT_CENTER_LNG=11.9746
VITE_MAP_DEFAULT_CENTER_LAT=57.7089
VITE_MAP_DEFAULT_ZOOM=12

# Production Settings
VITE_LOG_LEVEL=error
```

#### 5.2 Configure Static Web App Environment Variables (via Azure Portal or CLI)

```powershell
# Add environment variables to Static Web App
az staticwebapp appsettings set `
  --name sunnyseat-dev-frontend `
  --resource-group sunnyseat-dev-rg `
  --setting-names `
    "VITE_APPLICATIONINSIGHTS_CONNECTION_STRING=$aiConnString" `
    "VITE_APP_URL=https://sunnyseat-dev-frontend.azurestaticapps.net"
```

### Step 6: Initial Deployment

#### 6.1 Deploy Frontend

```powershell
# Navigate to frontend directory
cd src/frontend/admin

# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Static Web Apps using CLI
az staticwebapp upload `
  --name sunnyseat-dev-frontend `
  --resource-group sunnyseat-dev-rg `
  --app-location . `
  --output-location dist

# Or commit and push to trigger GitHub Actions (if configured)
git add .
git commit -m "Deploy: Initial production build"
git push origin main
```

#### 6.2 Monitor Deployment

- **GitHub Actions:** Watch the workflow at `https://github.com/[your-org]/SunnySeat/actions`
- **Azure Portal:** Monitor Static Web App deployment status
- **Expected time:** 3-5 minutes for frontend build and deployment

### Step 7: Verification & Testing

#### 7.1 Verify Deployment

```powershell
# Check Static Web App status
az staticwebapp show `
  --name sunnyseat-dev-frontend `
  --resource-group sunnyseat-dev-rg `
  --query "{name:name, url:defaultHostname, status:sku.tier}" -o table

# Test the frontend URL
Start-Process "https://sunnyseat-dev-frontend.azurestaticapps.net"
```

#### 7.2 Run Lighthouse Audit

```powershell
cd src/frontend/admin

# Build and preview locally first
npm run build
npm run preview

# In another terminal, run Lighthouse
npx lighthouse http://localhost:4173 --view
```

**Target Scores:**

- ✅ Performance: >80
- ✅ SEO: >90
- ✅ Accessibility: >90
- ✅ PWA: >70

#### 7.3 Test PWA Installation

1. Open the deployed URL in Chrome
2. Look for "Install" icon in address bar
3. Click and verify installation works
4. Test offline functionality (DevTools → Application → Service Workers → Offline)

#### 7.4 Verify Application Insights

```powershell
# Check if telemetry is being received
az monitor app-insights metrics show `
  --app sunnyseat-dev-insights `
  --resource-group sunnyseat-dev-rg `
  --metric "requests/count" `
  --interval PT1H
```

Or visit Azure Portal → Application Insights → Live Metrics

### Step 8: Production Deployment

#### 8.1 Repeat for Production Environment

```powershell
# Deploy production infrastructure
.\scripts\deploy-prod.ps1

# Update production parameter files
# Deploy frontend to production Static Web App
# Configure custom domain (if applicable)
```

#### 8.2 Custom Domain & SSL (Optional)

```powershell
# Add custom domain to Static Web App
az staticwebapp hostname set `
  --name sunnyseat-prod-frontend `
  --resource-group sunnyseat-prod-rg `
  --hostname sunnyseat.com

# SSL certificate is automatically provisioned (5-10 minutes)
# Configure DNS CNAME record:
# CNAME: www -> sunnyseat-prod-frontend.azurestaticapps.net
```

## Monitoring & Operations

### Application Insights Dashboards

Create custom dashboard for Core Web Vitals:

1. Navigate to Application Insights in Azure Portal
2. Click "Dashboards" → "New Dashboard"
3. Add tiles for:
   - LCP (Largest Contentful Paint)
   - FID (First Input Delay)
   - CLS (Cumulative Layout Shift)
   - Page Load Time
   - Error Rate

### Alerts Configuration

```powershell
# Create alert for high error rate
az monitor metrics alert create `
  --name "High Error Rate" `
  --resource-group sunnyseat-prod-rg `
  --scopes /subscriptions/$subscriptionId/resourceGroups/sunnyseat-prod-rg/providers/Microsoft.Insights/components/sunnyseat-prod-insights `
  --condition "avg exceptions/server > 10" `
  --window-size 5m `
  --evaluation-frequency 1m

# Create alert for slow page load
az monitor metrics alert create `
  --name "Slow Page Load" `
  --resource-group sunnyseat-prod-rg `
  --scopes /subscriptions/$subscriptionId/resourceGroups/sunnyseat-prod-rg/providers/Microsoft.Insights/components/sunnyseat-prod-insights `
  --condition "avg performanceCounters/processCpuPercentage > 80" `
  --window-size 5m `
  --evaluation-frequency 1m
```

## Troubleshooting

### Deployment Fails

**Issue:** Bicep deployment fails with validation error

**Solution:**

```powershell
# Validate template locally
az deployment group validate `
  --resource-group sunnyseat-dev-rg `
  --template-file infrastructure/bicep/main.bicep `
  --parameters infrastructure/bicep/parameters/dev.parameters.json

# Check detailed error message
```

### Static Web App Not Deploying

**Issue:** GitHub Actions workflow fails or Static Web App shows "Waiting for content"

**Solution:**

```powershell
# Verify deployment token is correct
az staticwebapp secrets list `
  --name sunnyseat-dev-frontend `
  --resource-group sunnyseat-dev-rg

# Check GitHub Actions logs for build errors
# Ensure app location and output location are correct
```

### Application Insights Not Receiving Data

**Issue:** No telemetry in Application Insights

**Solution:**

1. Verify connection string is set in `.env.production`
2. Check browser console for telemetry errors
3. Verify firewall/ad-blocker not blocking Azure endpoints
4. Check Application Insights SDK initialization in app code

## Rollback Procedure

### Rollback Frontend Deployment

```powershell
# Static Web Apps maintains deployment history
# Rollback via Azure Portal:
# Static Web App → Environments → Select previous deployment → Activate
```

### Rollback Infrastructure

```powershell
# Redeploy previous version of Bicep templates
git checkout <previous-commit>
.\scripts\deploy-dev.ps1
```

## Cost Estimation

**Development Environment (per month):**

- Static Web Apps (Free tier): $0
- Container Apps: ~$30
- PostgreSQL (Burstable): ~$15
- Redis (Basic): ~$15
- Application Insights: ~$5 (first 5GB free)
- **Total: ~$65/month**

**Production Environment (per month):**

- Static Web Apps (Standard): ~$9
- Container Apps: ~$100
- PostgreSQL (Standard): ~$150
- Redis (Standard): ~$75
- Application Insights: ~$20
- **Total: ~$354/month**

## Security Best Practices

- ✅ All secrets stored in Azure Key Vault
- ✅ No secrets in source control
- ✅ Service Principal with minimal permissions for CI/CD
- ✅ SSL/TLS automatic via Azure Static Web Apps
- ✅ Database with SSL required
- ✅ Redis with SSL enabled
- ✅ Network isolation via VNet integration

## Next Steps

- [ ] Set up staging environment
- [ ] Configure custom domain
- [ ] Set up Google Search Console
- [ ] Implement CI/CD pipelines
- [ ] Configure automated testing
- [ ] Set up monitoring dashboards
- [ ] Document runbooks for operations

## Resources

- [Azure Bicep Documentation](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
- [Azure Static Web Apps Documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [Application Insights Documentation](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [GitHub Actions for Azure](https://docs.github.com/en/actions/deployment/deploying-to-your-cloud-provider/deploying-to-azure)
