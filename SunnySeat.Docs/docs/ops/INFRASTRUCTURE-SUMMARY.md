# SunnySeat Infrastructure Overview

**Last Updated:** October 14, 2025  
**Status:** Infrastructure as Code (IaC) Implementation Complete

## Quick Start

```powershell
# 1. Login to Azure
az login

# 2. Deploy development environment
cd infrastructure
.\scripts\deploy-dev.ps1

# 3. Deploy frontend
cd ..\src\frontend\admin
npm install && npm run build
az staticwebapp upload --name sunnyseat-dev-frontend --resource-group sunnyseat-dev-rg
```

**Full guide:** See `DEPLOYMENT-GUIDE.md`

## Infrastructure Architecture

### Technology Stack

| Component              | Technology               | Purpose                         |
| ---------------------- | ------------------------ | ------------------------------- |
| **IaC**                | Azure Bicep              | Infrastructure provisioning     |
| **Frontend Hosting**   | Azure Static Web Apps    | PWA hosting with CDN            |
| **Backend API**        | Azure Container Apps     | REST API + Solar calculations   |
| **Database**           | PostgreSQL with PostGIS  | Venue data + geospatial queries |
| **Cache**              | Azure Cache for Redis    | Session + computed data caching |
| **Monitoring**         | Application Insights     | Telemetry + Web Vitals          |
| **Logging**            | Log Analytics            | Centralized logging             |
| **Secrets**            | Azure Key Vault          | Secret management               |
| **Container Registry** | Azure Container Registry | Docker image storage            |
| **Networking**         | Azure VNet               | Network isolation               |

## Bicep Modules

All infrastructure is defined in `infrastructure/bicep/`:

### Core Modules

1. **`main.bicep`** - Main orchestration template

   - Coordinates all module deployments
   - Defines parameters and outputs
   - Sets up dependencies

2. **`modules/static-web-app.bicep`** ⭐ NEW

   - Azure Static Web Apps for frontend
   - GitHub integration support
   - Environment variables configuration
   - Custom domain support (optional)

3. **`modules/monitoring.bicep`**

   - Application Insights
   - Log Analytics Workspace
   - Connection strings output

4. **`modules/postgresql.bicep`**

   - PostgreSQL Flexible Server
   - PostGIS extension
   - High availability (prod)
   - VNet integration

5. **`modules/redis.bicep`**

   - Azure Cache for Redis
   - SSL enabled
   - VNet integration

6. **`modules/container-app.bicep`**

   - API Container App
   - Auto-scaling configuration
   - Environment variables from Key Vault

7. **`modules/container-apps-environment.bicep`**

   - Shared environment for Container Apps
   - Log Analytics integration

8. **`modules/container-registry.bicep`**

   - Docker image registry
   - Admin access enabled

9. **`modules/keyvault.bicep`**

   - Secret storage
   - Access policies
   - Enabled for template deployment

10. **`modules/storage.bicep`**

    - Blob storage
    - Static website hosting (backup option)

11. **`modules/network.bicep`**
    - VNet with subnets
    - Network security groups
    - Service endpoints

## Deployment Outputs

After running `deploy-dev.ps1`, these outputs are available:

```powershell
# Get all outputs
az deployment group show \
  --name sunnyseat-dev-deployment \
  --resource-group sunnyseat-dev-rg \
  --query properties.outputs

# Key outputs:
# - frontendUrl: https://sunnyseat-dev-frontend.azurestaticapps.net
# - apiUrl: https://sunnyseat-dev-api.xxx.azurecontainerapps.io
# - appInsightsConnectionString: InstrumentationKey=...
# - databaseHost: sunnyseat-dev-psql-xxx.postgres.database.azure.com
```

## Environments

### Development (`dev`)

- **Purpose:** Daily development and testing
- **SKUs:** Minimal (Burstable DB, Basic Redis, Free Static Web App)
- **Cost:** ~$65/month
- **Deployment:** `.\scripts\deploy-dev.ps1`

### Staging (`staging`)

- **Purpose:** Pre-production testing and QA
- **SKUs:** Mid-tier (General Purpose DB, Standard Redis, Free/Standard SWA)
- **Cost:** ~$150/month
- **Deployment:** `.\scripts\deploy-staging.ps1`

### Production (`prod`)

- **Purpose:** Live production environment
- **SKUs:** High-tier (High availability DB, Standard Redis, Standard SWA)
- **Cost:** ~$354/month
- **Deployment:** `.\scripts\deploy-prod.ps1`

## Resource Naming Convention

Format: `sunnyseat-{environment}-{resource-type}-{uniqueSuffix}`

Examples:

- `sunnyseat-dev-frontend` (Static Web App)
- `sunnyseat-dev-api` (Container App)
- `sunnyseat-dev-psql-abc123` (PostgreSQL)
- `sunnyseat-dev-insights` (Application Insights)

## Security

### Secrets Management

All sensitive values stored in Azure Key Vault:

- PostgreSQL admin password
- JWT secret key
- API keys (OpenWeatherMap, MapTiler)
- Connection strings

**Never commit secrets to Git!**

### Network Security

- Database and Redis in private VNet subnets
- Container Apps in isolated subnet
- Public access only for Static Web Apps and API endpoints
- SSL/TLS required for all connections

### Access Control

- Service Principal for GitHub Actions (minimal permissions)
- Key Vault access policies for runtime components
- No admin credentials in code or config files

## CI/CD Integration

### GitHub Actions

Secrets required in repository:

1. `AZURE_STATIC_WEB_APPS_API_TOKEN` - Static Web App deployment token
2. `VITE_APPLICATIONINSIGHTS_CONNECTION_STRING` - Telemetry connection string
3. `AZURE_CREDENTIALS` - Service Principal for Azure deployments

### Deployment Flow

```
Code Push → GitHub Actions → Build → Test → Deploy to Static Web App → Notify
```

## Monitoring & Observability

### Application Insights

- **Web Vitals:** LCP, FID, CLS automatically tracked
- **Custom Events:** User interactions, searches, venue views
- **Exceptions:** Errors logged with stack traces
- **Performance:** Page load times, API latency

### Log Analytics

- Centralized logs from all components
- Query language (KQL) for analysis
- Retention: 30 days (dev), 90 days (prod)

### Alerts

Recommended alerts (configure manually or via IaC extension):

- Error rate > 5%
- LCP > 3 seconds
- API latency > 2 seconds
- Database connection failures

## Cost Management

### Development Environment

| Resource             | SKU            | Monthly Cost (approx) |
| -------------------- | -------------- | --------------------- |
| Static Web App       | Free           | $0                    |
| Container Apps       | 0.5 vCPU, 1 GB | $30                   |
| PostgreSQL           | Burstable B1ms | $15                   |
| Redis                | Basic C0       | $15                   |
| Application Insights | 5 GB free      | $5                    |
| **Total**            |                | **~$65**              |

### Production Environment

| Resource             | SKU           | Monthly Cost (approx) |
| -------------------- | ------------- | --------------------- |
| Static Web App       | Standard      | $9                    |
| Container Apps       | 2-10 replicas | $100                  |
| PostgreSQL           | Standard D4s  | $150                  |
| Redis                | Standard C1   | $75                   |
| Application Insights | ~20 GB        | $20                   |
| **Total**            |               | **~$354**             |

## Maintenance Tasks

### Regular

- [ ] Review Application Insights for errors (weekly)
- [ ] Check cost management dashboard (weekly)
- [ ] Update dependencies (frontend/backend) (monthly)
- [ ] Review and rotate secrets (quarterly)

### As Needed

- [ ] Scale Container Apps based on load
- [ ] Adjust Redis cache size
- [ ] Optimize database queries
- [ ] Review and update Bicep templates

## Troubleshooting

### Common Issues

**Issue:** Bicep deployment fails with "resource already exists"

**Solution:** Delete the resource group or use `--mode Complete` to replace

---

**Issue:** Static Web App shows "Waiting for content"

**Solution:** Check GitHub Actions logs, verify deployment token is correct

---

**Issue:** Database connection fails

**Solution:** Verify firewall rules, check VNet integration, test connection string

---

**Issue:** High costs in dev environment

**Solution:** Shut down Container Apps when not in use, scale down PostgreSQL

## Next Steps

1. ✅ PWA icons created and placed
2. ⏳ Deploy infrastructure to Azure
3. ⏳ Configure GitHub Secrets
4. ⏳ Deploy frontend to Static Web Apps
5. ⏳ Verify deployment and monitoring
6. ⏳ Configure custom domain (optional)
7. ⏳ Set up Google Search Console (optional)

## Additional Resources

- **Deployment Guide:** `DEPLOYMENT-GUIDE.md` (detailed step-by-step)
- **Story 5.1 Checklist:** `docs/stories/5.1.manual-setup-checklist.md`
- [Azure Bicep Documentation](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
- [Azure Static Web Apps Documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [Application Insights Documentation](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)

---

**Questions or issues?** See `DEPLOYMENT-GUIDE.md` troubleshooting section or check Azure Portal logs.
