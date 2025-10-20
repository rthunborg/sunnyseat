# Backend Deployment to Azure

This guide covers deploying the SunnySeat .NET API to Azure Container Apps via Azure Container Registry.

## Prerequisites

-  Azure CLI installed and authenticated (`az login`)
-  Docker Desktop installed and running
-  Azure subscription with resources deployed (Container Registry, Container App)
-  Contributor access to resource group

## Understanding the Deployment Flow

```
Your Code  Docker Image  Azure Container Registry  Azure Container App
                                                          
  Build        Package            Private Store            Running App
```

**Why this flow?**
- Container Registry (ACR) is your private Docker Hub
- Stores images securely within Azure
- Container App pulls latest image on deployment
- Enables version control and rollback

See [10-Docker-ACR-Explained.md](10-Docker-ACR-Explained.md) for detailed explanation.

## Quick Deployment Script

Save this as `deploy-backend.ps1` in your project root:

```powershell
# Quick Backend Deployment Script
param(
    [string]$ResourceGroup = "sunnyseat-dev-rg",
    [string]$ContainerApp = "sunnyseat-dev-api",
    [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"
Write-Host " Deploying SunnySeat API to Azure..." -ForegroundColor Cyan

# Get ACR name
Write-Host " Getting Container Registry info..." -ForegroundColor Yellow
$ACR_NAME = az acr list --resource-group $ResourceGroup --query "[0].name" -o tsv
$ACR_SERVER = "$ACR_NAME.azurecr.io"
Write-Host "   Using ACR: $ACR_NAME" -ForegroundColor Green

# Build Docker image
Write-Host " Building Docker image..." -ForegroundColor Yellow
docker build -t sunnyseat-api:$Tag -f Dockerfile .
if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }
Write-Host "    Build complete" -ForegroundColor Green

# Login to ACR and push
Write-Host "  Pushing to Azure Container Registry..." -ForegroundColor Yellow
az acr login --name $ACR_NAME
docker tag sunnyseat-api:$Tag "$ACR_SERVER/sunnyseat-api:$Tag"
docker push "$ACR_SERVER/sunnyseat-api:$Tag"
if ($LASTEXITCODE -ne 0) { throw "Docker push failed" }
Write-Host "    Push complete" -ForegroundColor Green

# Update Container App
Write-Host " Updating Container App..." -ForegroundColor Yellow
$ACR_USERNAME = az acr credential show --name $ACR_NAME --query "username" -o tsv
$ACR_PASSWORD = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv

az containerapp update `
    --name $ContainerApp `
    --resource-group $ResourceGroup `
    --image "$ACR_SERVER/sunnyseat-api:$Tag" `
    --registry-server $ACR_SERVER `
    --registry-username $ACR_USERNAME `
    --registry-password $ACR_PASSWORD

if ($LASTEXITCODE -ne 0) { throw "Container App update failed" }
Write-Host "    Update complete" -ForegroundColor Green

# Get API URL
$APP_URL = az containerapp show `
    --name $ContainerApp `
    --resource-group $ResourceGroup `
    --query "properties.configuration.ingress.fqdn" -o tsv

Write-Host ""
Write-Host " DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host " API URL: https://$APP_URL" -ForegroundColor Cyan
Write-Host " Swagger: https://$APP_URL/swagger" -ForegroundColor Cyan
Write-Host " Health: https://$APP_URL/health" -ForegroundColor Cyan
```

## Usage

```powershell
# Deploy with defaults (to dev environment)
.\deploy-backend.ps1

# Deploy to staging with custom tag
.\deploy-backend.ps1 -ResourceGroup "sunnyseat-staging-rg" -ContainerApp "sunnyseat-staging-api" -Tag "v1.2.3"

# Deploy to production
.\deploy-backend.ps1 -ResourceGroup "sunnyseat-prod-rg" -ContainerApp "sunnyseat-prod-api" -Tag "prod"
```

## Step-by-Step Manual Deployment

### Step 1: Set Environment Variables

```powershell
# Set these based on your environment
$RESOURCE_GROUP = "sunnyseat-dev-rg"
$CONTAINER_APP = "sunnyseat-dev-api"
$TAG = "latest"  # or use git commit: $(git rev-parse --short HEAD)

# Get ACR name automatically
$ACR_NAME = az acr list --resource-group $RESOURCE_GROUP --query "[0].name" -o tsv
$ACR_SERVER = "$ACR_NAME.azurecr.io"

Write-Host "Resource Group: $RESOURCE_GROUP"
Write-Host "Container App: $CONTAINER_APP"
Write-Host "ACR Server: $ACR_SERVER"
Write-Host "Image Tag: $TAG"
```

### Step 2: Build Docker Image

```powershell
# Navigate to project root
cd D:\SunnySeat

# Build the image
docker build -t sunnyseat-api:$TAG -f Dockerfile .

# Verify image was created
docker images | Select-String "sunnyseat-api"
```

**Optional: Test locally before pushing**
```powershell
# Run container locally
docker run -p 8080:8080 `
    -e ASPNETCORE_ENVIRONMENT=Development `
    -e ConnectionStrings__DefaultConnection="your-connection-string" `
    sunnyseat-api:$TAG

# Test health endpoint
curl http://localhost:8080/health

# Stop container
docker stop $(docker ps -q --filter ancestor=sunnyseat-api:$TAG)
```

### Step 3: Login to Azure Container Registry

```powershell
# Login using Azure CLI (recommended)
az acr login --name $ACR_NAME

# OR login using credentials (if needed)
$ACR_USERNAME = az acr credential show --name $ACR_NAME --query "username" -o tsv
$ACR_PASSWORD = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv
docker login $ACR_SERVER --username $ACR_USERNAME --password $ACR_PASSWORD
```

### Step 4: Tag and Push Image

```powershell
# Tag for ACR
docker tag sunnyseat-api:$TAG "$ACR_SERVER/sunnyseat-api:$TAG"

# Also tag as 'latest' for easier rollback
docker tag sunnyseat-api:$TAG "$ACR_SERVER/sunnyseat-api:latest"

# Push both tags
docker push "$ACR_SERVER/sunnyseat-api:$TAG"
docker push "$ACR_SERVER/sunnyseat-api:latest"
```

### Step 5: Update Container App

```powershell
# Get ACR credentials
$ACR_USERNAME = az acr credential show --name $ACR_NAME --query "username" -o tsv
$ACR_PASSWORD = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv

# Update Container App with new image
az containerapp update `
    --name $CONTAINER_APP `
    --resource-group $RESOURCE_GROUP `
    --image "$ACR_SERVER/sunnyseat-api:$TAG" `
    --registry-server $ACR_SERVER `
    --registry-username $ACR_USERNAME `
    --registry-password $ACR_PASSWORD
```

### Step 6: Verify Deployment

```powershell
# Get application URL
$APP_URL = az containerapp show `
    --name $CONTAINER_APP `
    --resource-group $RESOURCE_GROUP `
    --query "properties.configuration.ingress.fqdn" -o tsv

Write-Host " API URL: https://$APP_URL" -ForegroundColor Cyan

# Test health endpoint
curl "https://$APP_URL/health"

# Open Swagger in browser
Start-Process "https://$APP_URL/swagger"

# View logs
az containerapp logs show `
    --name $CONTAINER_APP `
    --resource-group $RESOURCE_GROUP `
    --tail 50 `
    --follow
```

## Advanced Operations

### View Container Registry Images

```powershell
# List all repositories
az acr repository list --name $ACR_NAME

# Show tags for sunnyseat-api
az acr repository show-tags --name $ACR_NAME --repository sunnyseat-api

# Show manifest (detailed info)
az acr repository show --name $ACR_NAME --repository sunnyseat-api:latest
```

### Rollback to Previous Version

```powershell
# List available tags
az acr repository show-tags --name $ACR_NAME --repository sunnyseat-api --orderby time_desc

# Update to specific previous version
az containerapp update `
    --name $CONTAINER_APP `
    --resource-group $RESOURCE_GROUP `
    --image "$ACR_SERVER/sunnyseat-api:previous-tag"
```

### Update Environment Variables

```powershell
# Update single environment variable
az containerapp update `
    --name $CONTAINER_APP `
    --resource-group $RESOURCE_GROUP `
    --set-env-vars "WEATHER_API_KEY=new-key"

# Set multiple environment variables
az containerapp update `
    --name $CONTAINER_APP `
    --resource-group $RESOURCE_GROUP `
    --set-env-vars `
        "WEATHER_API_KEY=new-key" `
        "ANOTHER_VAR=value"
```

### Scale Container App

```powershell
# Set scaling rules
az containerapp update `
    --name $CONTAINER_APP `
    --resource-group $RESOURCE_GROUP `
    --min-replicas 1 `
    --max-replicas 5 `
    --scale-rule-name http-rule `
    --scale-rule-type http `
    --scale-rule-http-concurrency 50
```

## Troubleshooting

### Build Fails: "No such file or directory"

Check Dockerfile paths match your project structure:
```dockerfile
# Verify these paths exist
COPY SunnySeat.sln .
COPY src/backend/SunnySeat.Api/SunnySeat.Api.csproj src/backend/SunnySeat.Api/
```

### Push Fails: "unauthorized: authentication required"

Re-login to ACR:
```powershell
az acr login --name $ACR_NAME
```

### Container App Won't Start

View logs to diagnose:
```powershell
az containerapp logs show `
    --name $CONTAINER_APP `
    --resource-group $RESOURCE_GROUP `
    --tail 100
```

Common issues:
- Missing environment variables
- Database connection string incorrect
- Port misconfiguration (must use 8080)

### Image Not Updating

Force pull latest image:
```powershell
# Restart Container App
az containerapp revision restart `
    --name $CONTAINER_APP `
    --resource-group $RESOURCE_GROUP
```

## Best Practices

1. **Tag with Git SHA** for traceability:
   ```powershell
   $TAG = git rev-parse --short HEAD
   docker tag sunnyseat-api:latest "$ACR_SERVER/sunnyseat-api:$TAG"
   ```

2. **Always keep a 'latest' tag** for easy rollback

3. **Test locally** before pushing to ACR

4. **Use staging environment** before production

5. **Monitor logs** during and after deployment

6. **Have rollback plan ready** (know previous working tag)

## Next Steps

- Set up frontend: [04-Admin-Frontend-Deployment.md](04-Admin-Frontend-Deployment.md)
- Configure database: [08-Database-Management.md](08-Database-Management.md)
- Set up authentication: [07-Authentication-Setup.md](07-Authentication-Setup.md)

## Related Documents

- [10-Docker-ACR-Explained.md](10-Docker-ACR-Explained.md) - Understanding the container flow
- [06-Full-Stack-Deployment.md](06-Full-Stack-Deployment.md) - Deploy everything at once
- [09-Common-Issues.md](09-Common-Issues.md) - Troubleshooting guide
