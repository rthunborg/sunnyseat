# Azure for Students Deployment Notes

## Overview

Azure for Students subscriptions have some restrictions compared to standard Azure subscriptions. This document outlines the key differences and how to work around them for SunnySeat deployment.

## Region Restrictions

**Issue:** Azure for Students has a policy that restricts which regions you can deploy to.

**Error Message:**

```
Resource 'xxx' was disallowed by Azure: This policy maintains a set of best available regions where your subscription can deploy resources.
```

**Solution:** The deployment scripts have been updated to try multiple regions automatically:

1. East US (default)
2. West US
3. Central US
4. North Europe

**Recommended regions for Azure for Students:**

- `eastus` (default in scripts)
- `westus`
- `centralus`
- `northeurope`

**Not recommended:**

- `westeurope` (often restricted)
- `westeurope2`
- Regional services in Asia/Pacific

## Resource Limitations

### 1. Key Vault

**Limitation:** May be restricted in some regions

**Workaround:**

- The `deploy-dev.ps1` script automatically tries multiple regions
- If all fail, you can create the Key Vault manually in Azure Portal in an allowed region

### 2. Static Web Apps

**Limitation:** Free tier only (Standard tier may be restricted)

**Workaround:**

- Use Free tier for development (already configured in `dev.parameters.json`)
- Free tier is sufficient for MVP and testing

### 3. PostgreSQL

**Limitation:** High availability and certain SKUs may not be available

**Workaround:**

- Development uses Burstable tier (`Burstable_B1ms`) - works fine
- Production deployment may need manual review

### 4. Container Apps

**Limitation:** May have quota limits on number of replicas

**Workaround:**

- Dev environment uses 1-3 replicas (within quota)
- If you hit quota limits, scale down manually

## Cost Management

Azure for Students includes:

- **$100 USD credit** (valid for 12 months)
- **Free tier services** (always free)

### SunnySeat Development Environment Cost

| Resource               | Monthly Cost      | Notes                       |
| ---------------------- | ----------------- | --------------------------- |
| Static Web App (Free)  | $0                | Within free tier            |
| Container Apps         | ~$15-30           | Minimal replicas            |
| PostgreSQL (Burstable) | ~$10-15           | B1ms tier                   |
| Redis (Basic)          | ~$15              | C0 tier                     |
| Application Insights   | ~$2-5             | First 5GB free              |
| **Total**              | **~$42-65/month** | **Well within $100 credit** |

### Tips to Reduce Costs

1. **Stop Container Apps when not in use:**

   ```powershell
   az containerapp update --name sunnyseat-dev-api --resource-group sunnyseat-dev-rg --min-replicas 0
   ```

2. **Delete dev environment when done:**

   ```powershell
   az group delete --name sunnyseat-dev-rg --yes --no-wait
   ```

3. **Use free tier where possible:**

   - Static Web Apps: Free tier
   - Application Insights: Stay under 5GB/month

4. **Monitor spending:**
   ```powershell
   az consumption usage list --start-date 2025-10-01 --end-date 2025-10-31
   ```

## Deployment Workflow for Azure for Students

### 1. Initial Setup

```powershell
# Clone repository
cd D:\SunnySeat\infrastructure

# Run deployment with default region (eastus)
.\scripts\deploy-dev.ps1
```

### 2. If Deployment Fails with Region Error

**Option A: Try different region manually**

```powershell
.\scripts\deploy-dev.ps1 -Location "westus"
```

**Option B: Create Key Vault manually**

1. Go to Azure Portal
2. Create Key Vault in an allowed region (check portal for available regions)
3. Create these secrets:
   - `postgres-admin-password`: Random 32-character password
   - `jwt-secret-key`: Random base64 string
4. Note the Key Vault ID
5. Update `bicep/parameters/dev.parameters.json` with the Key Vault ID
6. Re-run deploy script

### 3. Verify Deployment

```powershell
# Check resource group
az group show --name sunnyseat-dev-rg

# List all resources
az resource list --resource-group sunnyseat-dev-rg --output table

# Check Static Web App
az staticwebapp show --name sunnyseat-dev-frontend --resource-group sunnyseat-dev-rg
```

## Common Issues

### Issue 1: Key Vault Creation Fails

**Error:** `RequestDisallowedByAzure`

**Solution:**

1. Try the script again (it will try multiple regions)
2. Or create Key Vault manually in Azure Portal
3. Update parameter file with manual Key Vault ID

### Issue 2: Quota Exceeded

**Error:** `Quota exceeded for resource type`

**Solution:**

1. Request quota increase via Azure Portal (support ticket)
2. Or reduce resource SKUs in parameter files
3. Or use fewer resources (skip staging environment)

### Issue 3: Insufficient Credit

**Error:** Deployment stops due to credit limit

**Solution:**

1. Check credit balance: Azure Portal → Cost Management
2. Delete unused resources to free up credit
3. Upgrade to Pay-As-You-Go if needed for production

## Recommended Development Flow

### Phase 1: Infrastructure (Week 1)

- Deploy dev environment
- Verify all resources created
- **Cost: ~$15 for 1 week**

### Phase 2: Application Development (Weeks 2-4)

- Keep infrastructure running
- Deploy and test application
- **Cost: ~$60 for 3 weeks**

### Phase 3: Testing & MVP (Week 5)

- Full integration testing
- Performance testing
- **Cost: ~$15 for 1 week**

**Total for 5-week project: ~$90** (within $100 credit)

### After MVP

- Delete dev environment if done
- Keep only what's needed for demos
- Consider upgrading to Pay-As-You-Go for production

## Support Resources

1. **Azure for Students Documentation:**
   https://azure.microsoft.com/en-us/free/students/

2. **Request Quota Increase:**
   Azure Portal → Help + Support → New Support Request

3. **Cost Management:**
   Azure Portal → Cost Management + Billing

4. **SunnySeat Specific Issues:**
   See `docs/ops/DEPLOYMENT-GUIDE.md` troubleshooting section

## Cleanup Commands

### Delete Everything (Frees All Resources)

```powershell
# Delete development resources
az group delete --name sunnyseat-dev-rg --yes --no-wait

# Delete secrets (if you're done)
az group delete --name sunnyseat-secrets-rg --yes --no-wait

# Verify deletion
az group list --query "[?contains(name, 'sunnyseat')]" --output table
```

### Pause Resources (Keep Data, Stop Charges)

```powershell
# Stop Container Apps (API)
az containerapp update \
  --name sunnyseat-dev-api \
  --resource-group sunnyseat-dev-rg \
  --min-replicas 0 \
  --max-replicas 0

# Note: PostgreSQL and Redis will still charge (minimal when idle)
# Static Web Apps Free tier is always $0
```

## Next Steps

1. ✅ Run `deploy-dev.ps1` successfully
2. ✅ Verify all resources in Azure Portal
3. ✅ Continue with Story 5.1 checklist (GitHub Secrets, Frontend deployment)
4. ✅ Monitor costs weekly

For full deployment guide, see: `docs/ops/DEPLOYMENT-GUIDE.md`
