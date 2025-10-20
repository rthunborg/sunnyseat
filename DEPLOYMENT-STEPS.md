# SunnySeat Deployment Steps

## Completed

- [x] Azure resources provisioned
- [x] Configuration files created

## Step-by-Step Deployment Guide

### Step 1: Enable PostGIS Extension on PostgreSQL

Run these commands in PowerShell (you'll be prompted for the password):

```powershell
# Set password as environment variable
$env:PGPASSWORD = "CcSutYfHlkzjFwD1sir9eJa2VTRphWdK"

# Enable PostGIS
psql "host=sunnyseat-dev-psql.postgres.database.azure.com port=5432 dbname=sunnyseat_dev user=sunnyseataadmin sslmode=require" -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Enable PostGIS Topology
psql "host=sunnyseat-dev-psql.postgres.database.azure.com port=5432 dbname=sunnyseat_dev user=sunnyseataadmin sslmode=require" -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;"

# Verify PostGIS installation
psql "host=sunnyseat-dev-psql.postgres.database.azure.com port=5432 dbname=sunnyseat_dev user=sunnyseataadmin sslmode=require" -c "SELECT PostGIS_Version();"
```

**Alternative (if psql not installed):** Use Azure Portal Query Editor:

1. Go to PostgreSQL server Query editor
2. Run: `CREATE EXTENSION IF NOT EXISTS postgis;`
3. Run: `CREATE EXTENSION IF NOT EXISTS postgis_topology;`

---

### Step 2: Run Database Migrations

```powershell
cd D:\SunnySeat

# Install EF Core tools if not already installed
dotnet tool install --global dotnet-ef

# Run migrations
dotnet ef database update --project src/backend/SunnySeat.Data --startup-project src/backend/SunnySeat.Api --connection "Host=sunnyseat-dev-psql.postgres.database.azure.com;Database=sunnyseat_dev;Username=sunnyseataadmin;Password=CcSutYfHlkzjFwD1sir9eJa2VTRphWdK;SSL Mode=Require"
```

---

### Step 3A: Create Storage Account for Public Frontend

```powershell
# Create a separate storage account for the public-facing frontend
az storage account create `
  --name sspublicstorage4323 `
  --resource-group sunnyseat-dev-rg `
  --location swedencentral `
  --sku Standard_LRS `
  --kind StorageV2

# Enable static website hosting
az storage blob service-properties update `
  --account-name sspublicstorage4323 `
  --static-website `
  --index-document index.html `
  --404-document index.html

# Configure CORS for public storage
az storage cors add `
  --account-name sspublicstorage4323 `
  --services b `
  --methods GET HEAD OPTIONS `
  --origins "*" `
  --allowed-headers "*" `
  --exposed-headers "*" `
  --max-age 3600
```

**Note:** The public frontend URL will be: `https://sspublicstorage4323.z1.web.core.windows.net/`

---

### Step 3B: Build and Deploy Admin Frontend

```powershell
cd D:\SunnySeat\src\frontend\admin

# Install dependencies (if not already installed)
npm install

# Build for production (uses .env.production)
npm run build

# Deploy to Azure Storage (Admin)
az storage blob upload-batch --account-name ssdevstorage4323 --source dist --destination '$web' --auth-mode login --overwrite
```

**Verify:** Visit https://ssdevstorage4323.z1.web.core.windows.net/

---

### Step 3C: Create Production Environment Config for Public Frontend

Create `.env.production` file in `src/frontend/public/`:

```powershell
cd D:\SunnySeat\src\frontend\public

# Create .env.production file
@"
VITE_API_BASE_URL=https://sunnyseat-dev-api.wonderfulforest-63b21830.swedencentral.azurecontainerapps.io
VITE_MAP_DEFAULT_CENTER_LNG=11.9746
VITE_MAP_DEFAULT_CENTER_LAT=57.7089
VITE_MAP_DEFAULT_ZOOM=12
"@ | Out-File -FilePath .env.production -Encoding utf8
```

---

### Step 3D: Build and Deploy Public Frontend

```powershell
cd D:\SunnySeat\src\frontend\public

# Install dependencies (if not already installed)
npm install

# Build for production
npm run build

# Deploy to Azure Storage (Public)
az storage blob upload-batch --account-name sspublicstorage4323 --source dist --destination '$web' --auth-mode login --overwrite
```

**Verify:** Visit https://sspublicstorage4323.z1.web.core.windows.net/

---

### Step 4: Build and Deploy Backend API

```powershell
cd D:\SunnySeat\src\backend\SunnySeat.Api

# Build Docker image
docker build -t sunnyseat-dev-api:latest -f Dockerfile ../..

# Tag for Azure Container Registry (replace [ACR-NAME] with your registry name)
docker tag sunnyseat-dev-api:latest [ACR-NAME].azurecr.io/sunnyseat-api:latest

# Login to ACR
az acr login --name [ACR-NAME]

# Push image
docker push [ACR-NAME].azurecr.io/sunnyseat-api:latest
```

**Note:** You'll need to find your Container Registry name first. Run:

```powershell
az acr list --resource-group sunnyseat-dev-rg --query "[].name" -o tsv
```

---

### Step 5: Update Container App Configuration

```powershell
# Get ACR credentials
$acrName = az acr list --resource-group sunnyseat-dev-rg --query "[0].name" -o tsv
$acrServer = "$acrName.azurecr.io"
$acrUser = az acr credential show --name $acrName --query "username" -o tsv
$acrPassword = az acr credential show --name $acrName --query "passwords[0].value" -o tsv

# Update Container App with new image and environment variables
az containerapp update `
  --name sunnyseat-dev-api `
  --resource-group sunnyseat-dev-rg `
  --image $acrServer/sunnyseat-api:latest `
  --registry-server $acrServer `
  --registry-username $acrUser `
  --registry-password $acrPassword `
  --set-env-vars `
    "ConnectionStrings__DefaultConnection=Host=sunnyseat-dev-psql.postgres.database.azure.com;Database=sunnyseat_dev;Username=sunnyseataadmin;Password=[YOUR_DB_PASSWORD];SSL Mode=Require" `
    "ConnectionStrings__Redis=sunnyseat-dev-redis.redis.cache.windows.net:6380,password=[YOUR_REDIS_KEY],ssl=True,abortConnect=False" `
    "JwtOptions__SecretKey=[YOUR_JWT_SECRET_KEY]" `
    "WeatherApi__OpenWeatherMap__ApiKey=[YOUR_OPENWEATHERMAP_KEY]" `
    "APPLICATIONINSIGHTS_CONNECTION_STRING=[YOUR_APP_INSIGHTS_CONNECTION_STRING]" `
    "ASPNETCORE_ENVIRONMENT=Production"
```

---

### Step 6: Test Deployment

```powershell
# Test API health endpoint
curl https://sunnyseat-dev-api.wonderfulforest-63b21830.swedencentral.azurecontainerapps.io/health

# Test Admin Frontend
start https://ssdevstorage4323.z1.web.core.windows.net/

# Test Public Frontend
start https://sspublicstorage4323.z1.web.core.windows.net/
```

---

## Summary

**Public Frontend URL:** https://sspublicstorage4323.z1.web.core.windows.net/
**Admin Frontend URL:** https://ssdevstorage4323.z1.web.core.windows.net/
**API URL:** https://sunnyseat-dev-api.wonderfulforest-63b21830.swedencentral.azurecontainerapps.io

**Resources:**

- Configuration: `DEPLOYMENT-CONFIG.md`
- Admin Frontend env: `src/frontend/admin/.env.production`
- Public Frontend env: `src/frontend/public/.env.production`

---

## Troubleshooting

**If frontend shows blank page:**

- Check browser console for errors
- Verify .env.production has correct API URL
- Rebuild and redeploy

**If API returns 500 errors:**

- Check Container App logs: `az containerapp logs show --name sunnyseat-dev-api --resource-group sunnyseat-dev-rg --follow`
- Verify environment variables are set
- Check database connection

**If database connection fails:**

- Verify PostgreSQL firewall allows Azure services
- Check connection string is correct
- Verify PostGIS extensions are installed
