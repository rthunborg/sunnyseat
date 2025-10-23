# Understanding Docker  ACR  Azure Container App Flow

This document explains why we use Azure Container Registry and how the container deployment flow works.

## The Big Picture

\\\

 Your Computer      1. BUILD
 D:\SunnySeat       Create Docker image from source code

          docker build
         

 Docker Image       2. PACKAGE
 sunnyseat-api      Standalone container with all dependencies

          docker push
         

 Azure Container    3. STORE
 Registry (ACR)     Private Docker registry in Azure
 Your Private Hub   Version control for containers

          az containerapp update
         

 Azure Container    4. RUN
 App (or Service)   Pulls image and runs your application
 Production         Auto-scales, monitors, manages

\\\

## Why Not Deploy Directly?

### Option 1: Direct Deployment (What We DON'T Do)
\\\
Your Code  Azure App Service
         (upload files)
\\\
**Problems:**
-  Slow deployments (upload all files every time)
-  Inconsistent environments (dependencies installed at runtime)
-  No version control
-  Harder to roll back
-  Platform-dependent (tied to Azure)

### Option 2: Container Deployment (What We DO)
\\\
Your Code  Docker Image  ACR  Container App
\\\
**Benefits:**
-  Fast deployments (pull pre-built image)
-  Consistent environments (everything baked into image)
-  Easy versioning (tag images)
-  Simple rollback (switch to previous tag)
-  Platform-independent (run anywhere Docker runs)

## What is Docker?

**Docker** packages your application + all dependencies into a single "image".

Think of it like a ZIP file that contains:
- Your compiled .NET application
- .NET runtime
- Operating system libraries
- Configuration files

**Example:** Your Dockerfile does this:
\\\dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0  # Start with .NET 8 runtime
COPY . .                                    # Add your application
ENTRYPOINT [\"dotnet\", \"SunnySeat.Api.dll\"]  # Run command
\\\

Result: A \sunnyseat-api\ image that runs identically anywhere.

## What is Azure Container Registry (ACR)?

**ACR** is your private Docker Hub in Azure.

### Why Not Use Docker Hub?

| Docker Hub | Azure Container Registry |
|-----------|--------------------------|
|  Public by default |  Private by default |
|  Rate limits |  No rate limits for your images |
|  Slower (external) |  Fast (same Azure region) |
|  Separate auth |  Integrated with Azure AD |
|  No network integration |  Private networking available |

### What ACR Provides

1. **Storage**: Stores multiple versions of your images
2. **Security**: Private, requires Azure authentication
3. **Performance**: Fast pulls within Azure (same datacenter)
4. **Integration**: Works seamlessly with Azure services
5. **Versioning**: Tag-based version control

## The Deployment Workflow in Detail

### Step 1: Build Docker Image Locally

\\\powershell
cd D:\SunnySeat
docker build -t sunnyseat-api:latest -f Dockerfile .
\\\

**What happens:**
1. Docker reads your Dockerfile
2. Downloads base image (mcr.microsoft.com/dotnet/aspnet:8.0)
3. Copies your code into image
4. Runs dotnet publish inside container
5. Creates final image with compiled application

**Result:** Local Docker image ready to run

### Step 2: Tag for ACR

\\\powershell
\ = \"sunnyseatdevacr.azurecr.io\"
docker tag sunnyseat-api:latest \/sunnyseat-api:latest
\\\

**What happens:**
- Creates an alias pointing to your ACR
- No data copied yet, just a pointer

**Think of it like:** Renaming a file to include the destination path

### Step 3: Push to ACR

\\\powershell
az acr login --name sunnyseatdevacr
docker push \/sunnyseat-api:latest
\\\

**What happens:**
1. Authenticate with ACR using Azure credentials
2. Upload image layers to ACR
3. ACR stores the image in Azure Blob Storage
4. Image is now accessible from anywhere in Azure

**Result:** Your image is in Azure's private registry

### Step 4: Deploy to Container App

\\\powershell
az containerapp update \
    --name sunnyseat-dev-api \
    --resource-group sunnyseat-dev-rg \
    --image \/sunnyseat-api:latest
\\\

**What happens:**
1. Container App connects to ACR
2. Pulls the latest image
3. Stops old container
4. Starts new container with new image
5. Routes traffic to new container

**Result:** Your application is live!

## Version Control with Tags

### Why Tag Images?

Without tags:
-  Can't roll back to previous version
-  Don't know which code version is deployed
-  Overwriting \"latest\" loses old version

With tags:
-  Each deployment has unique identifier
-  Easy to roll back: just deploy previous tag
-  Clear history of deployments

### Tagging Strategy

\\\powershell
# Tag with Git commit SHA (recommended)
\ = git rev-parse --short HEAD
docker tag sunnyseat-api:latest \/sunnyseat-api:\
docker tag sunnyseat-api:latest \/sunnyseat-api:latest

# Push both
docker push \/sunnyseat-api:\      # Specific version
docker push \/sunnyseat-api:latest    # Always points to newest
\\\

**Result in ACR:**
\\\
sunnyseat-api:a1b2c3d   Specific commit
sunnyseat-api:latest    Always newest
sunnyseat-api:v1.2.3    Release version
sunnyseat-api:prod      Production
\\\

### Rolling Back

\\\powershell
# See available versions
az acr repository show-tags --name sunnyseatdevacr --repository sunnyseat-api

# Deploy previous version
az containerapp update \
    --name sunnyseat-dev-api \
    --resource-group sunnyseat-dev-rg \
    --image sunnyseatdevacr.azurecr.io/sunnyseat-api:previous-tag
\\\

## Security & Authentication

### How Authentication Works

1. **Your Computer  ACR:**
   - z acr login gets token from Azure AD
   - Docker uses token to push images
   
2. **Container App  ACR:**
   - Container App has Managed Identity
   - Given \"AcrPull\" role on ACR
   - Automatically authenticates to pull images

### Best Practices

1. **Never use admin credentials** in production
2. **Use Managed Identities** for Container App
3. **Enable vulnerability scanning** on ACR
4. **Use private endpoints** for sensitive workloads
5. **Regularly update base images** for security patches

## Performance Optimization

### Image Layer Caching

Docker caches unchanged layers:

\\\dockerfile
#  BAD: Changes invalidate all layers
COPY . .
RUN dotnet restore
RUN dotnet build

#  GOOD: Restore cached when project files unchanged
COPY *.csproj .
RUN dotnet restore
COPY . .
RUN dotnet build
\\\

### Multi-stage Builds

Your Dockerfile uses multi-stage builds:

\\\dockerfile
# Build stage (large, includes SDK)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app/publish

# Runtime stage (small, only runtime)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT [\"dotnet\", \"SunnySeat.Api.dll\"]
\\\

**Result:** Final image is ~200MB instead of ~2GB!

## Cost Considerations

### ACR Costs

- **Storage:** ~\.10 per GB/month
- **Data transfer:** Free within same region
- **Build minutes:** \.0016/minute (if using ACR Tasks)

**Typical costs for dev environment:** \-10/month

### Container App Costs

- **Consumption plan:** Pay only for usage
- **Idle:** Nearly free (memory only)
- **Active:** \.000024/vCPU-second + \.000003/GiB-second

**Typical costs for dev environment:** \-50/month

## Common Scenarios

### Scenario 1: Development Deployment

\\\powershell
# Quick iteration
docker build -t sunnyseat-api:latest .
az acr login --name sunnyseatdevacr
docker tag sunnyseat-api:latest sunnyseatdevacr.azurecr.io/sunnyseat-api:dev
docker push sunnyseatdevacr.azurecr.io/sunnyseat-api:dev
az containerapp update --name sunnyseat-dev-api --image sunnyseatdevacr.azurecr.io/sunnyseat-api:dev
\\\

### Scenario 2: Production Release

\\\powershell
# Tested build with version tag
\ = \"v1.2.3\"
docker build -t sunnyseat-api:\ .
docker tag sunnyseat-api:\ sunnyseatprodacr.azurecr.io/sunnyseat-api:\
docker tag sunnyseat-api:\ sunnyseatprodacr.azurecr.io/sunnyseat-api:prod
docker push sunnyseatprodacr.azurecr.io/sunnyseat-api:\
docker push sunnyseatprodacr.azurecr.io/sunnyseat-api:prod
az containerapp update --name sunnyseat-prod-api --image sunnyseatprodacr.azurecr.io/sunnyseat-api:\
\\\

### Scenario 3: Rollback After Bad Deploy

\\\powershell
# Oops, new version has bugs
# List previous versions
az acr repository show-tags --name sunnyseatprodacr --repository sunnyseat-api

# Deploy previous working version
az containerapp update --name sunnyseat-prod-api --image sunnyseatprodacr.azurecr.io/sunnyseat-api:v1.2.2
\\\

## Troubleshooting

### \"Failed to push: unauthorized\"

\\\powershell
# Re-authenticate
az acr login --name your-acr-name
\\\

### \"Image not found\" in Container App

- Verify image exists in ACR: z acr repository list --name your-acr
- Check Container App has AcrPull role
- Verify image name is correct (including registry URL)

### Slow deployments

- Enable image caching in Dockerfile
- Use smaller base images
- Consider ACR Geo-replication for multi-region

## Summary

| Step | What | Why |
|------|------|-----|
| 1. Build | Create Docker image | Package everything together |
| 2. Tag | Add version labels | Track and manage versions |
| 3. Push | Upload to ACR | Store in Azure's private registry |
| 4. Deploy | Update Container App | Run new version in production |

**Key Insight:** Container Registry is the bridge between development and production, providing security, performance, and control.

## Related Documents

- [03-Backend-Deployment-Azure.md](03-Backend-Deployment-Azure.md) - Practical deployment steps
- [06-Full-Stack-Deployment.md](06-Full-Stack-Deployment.md) - Complete deployment
- [09-Common-Issues.md](09-Common-Issues.md) - Troubleshooting
