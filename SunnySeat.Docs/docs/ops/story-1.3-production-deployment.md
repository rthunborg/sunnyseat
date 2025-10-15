# Story 1.3: Production Deployment Guide

## Admin Authentication & Security - Azure Setup Instructions

**Status**: Ready for Azure Configuration  
**Created**: 2025-10-09  
**Updated**: 2025-10-09  
**Owner**: DevOps / Platform Team

---

## 📋 **Overview**

This guide provides step-by-step instructions for deploying Story 1.3 (Admin Authentication & Security) to Azure production environment. The implementation uses **local JWT authentication** for development/MVP, with a clear path to **Azure AD B2C** integration for production.

---

## 🚨 **CRITICAL: Pre-Deployment Security Requirements**

Before deploying to production, you **MUST** complete these security steps:

### 🔴 **MANDATORY STEPS (BLOCKING)**

1. ✅ Remove demo JWT secret from `appsettings.json`
2. ✅ Configure Azure Key Vault for secret management
3. ✅ Generate production JWT signing key (minimum 256-bit entropy)
4. ✅ Configure production CORS origins
5. ✅ Verify HTTPS enforcement

---

## 📖 **Deployment Phases**

### **Phase 1: Azure Resource Setup** (Manual Steps Required)

#### **Step 1.1: Create Azure Key Vault**

**Azure Portal Steps:**

1. Navigate to Azure Portal: https://portal.azure.com
2. Click "+ Create a resource" → Search for "Key Vault"
3. Create new Key Vault with these settings:
   - **Name**: `sunnyseat-keyvault-prod` (or your naming convention)
   - **Region**: Same as your App Service (e.g., West Europe)
   - **Pricing Tier**: Standard
   - **Access Policy**: Azure role-based access control (RBAC)
4. Click "Review + Create" → "Create"

**Information to Provide Back:**

```
✅ Key Vault Name: ____________________
✅ Key Vault URI: ____________________
✅ Resource Group: ____________________
```

---

#### **Step 1.2: Generate and Store JWT Secret**

**PowerShell Command (Run Locally):**

```powershell
# Generate cryptographically secure secret (64 bytes = 512 bits)
$bytes = New-Object byte[] 64
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)
Write-Host "Generated JWT Secret (SAVE THIS SECURELY):"
Write-Host $secret
```

**Azure Portal Steps:**

1. Open your Key Vault in Azure Portal
2. Navigate to "Secrets" → "+ Generate/Import"
3. Create secret with these settings:
   - **Name**: `JwtSecretKey`
   - **Value**: [Paste the generated secret from PowerShell]
   - **Content Type**: JWT Signing Key
   - **Enabled**: Yes
4. Click "Create"

**Information to Provide Back:**

```
✅ Secret Name: JwtSecretKey (confirm)
✅ Secret Version: ____________________
✅ Secret Created: [Yes/No]
```

---

#### **Step 1.3: Create App Service (if not exists)**

**Azure Portal Steps:**

1. Create App Service for SunnySeat API
   - **Name**: `sunnyseat-api-prod`
   - **Runtime**: .NET 8
   - **Operating System**: Linux
   - **Region**: Same as Key Vault
   - **Pricing Tier**: B1 or higher (for production)
2. Enable "System-assigned Managed Identity"
   - Go to App Service → Settings → Identity
   - Turn on "System assigned" → Save
   - Copy the "Object (principal) ID"

**Information to Provide Back:**

```
✅ App Service Name: ____________________
✅ App Service URL: ____________________
✅ Managed Identity Object ID: ____________________
```

---

#### **Step 1.4: Grant App Service Access to Key Vault**

**Azure Portal Steps:**

1. Open Key Vault → "Access control (IAM)"
2. Click "+ Add" → "Add role assignment"
3. Select role: **"Key Vault Secrets User"**
4. Click "Next"
5. Select "Managed identity"
6. Click "+ Select members"
7. Find and select your App Service managed identity
8. Click "Review + assign"

**Verification:**

```
✅ App Service can access Key Vault: [Yes/No]
✅ Role Assignment Created: [Yes/No]
```

---

### **Phase 2: Application Configuration** (I'll Help You With This)

Once you provide the Azure resource information above, I'll help you:

1. ✅ Update `appsettings.json` for production
2. ✅ Configure Key Vault references in App Service
3. ✅ Set up environment variables
4. ✅ Configure CORS for production frontend
5. ✅ Enable Application Insights (optional but recommended)

---

### **Phase 3: Database Setup**

#### **Option A: Azure Database for PostgreSQL (Recommended)**

**Azure Portal Steps:**

1. Create Azure Database for PostgreSQL Flexible Server
   - **Name**: `sunnyseat-db-prod`
   - **Version**: PostgreSQL 14 or higher
   - **Compute + Storage**: Burstable B1ms (can scale later)
   - **Enable PostGIS**: Yes (for geospatial data)
2. Configure firewall to allow Azure services
3. Create database: `sunnyseat_production`

**Information to Provide Back:**

```
✅ Database Server Name: ____________________
✅ Database Name: sunnyseat_production
✅ Admin Username: ____________________
✅ Connection String (with password): ____________________
```

#### **Option B: Continue with Docker PostgreSQL (Development Only)**

- Not recommended for production
- Only use for extended testing/staging

---

## 🔧 **Configuration Files After Azure Setup**

### **appsettings.Production.json** (I'll create this for you)

After you provide Azure details, I'll generate:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "@Microsoft.KeyVault(SecretUri=https://[YOUR-VAULT].vault.azure.net/secrets/DbConnectionString/)"
  },
  "Jwt": {
    "SecretKey": "@Microsoft.KeyVault(SecretUri=https://[YOUR-VAULT].vault.azure.net/secrets/JwtSecretKey/)",
    "Issuer": "SunnySeat.Production",
    "Audience": "SunnySeat.Admin",
    "ExpirationMinutes": 480,
    "RefreshTokenExpirationDays": 7
  },
  "Cors": {
    "AllowedOrigins": ["https://[YOUR-FRONTEND-DOMAIN]"]
  }
}
```

---

## 🔐 **Security Checklist**

### **Before First Production Deployment:**

- [ ] JWT secret stored in Azure Key Vault (not in code)
- [ ] Database connection string in Key Vault
- [ ] Managed Identity configured for App Service
- [ ] CORS configured for specific production domain (no wildcards)
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Security headers enabled (HSTS, X-Frame-Options, etc.)
- [ ] Rate limiting configured (100/min general, 10/min auth)
- [ ] Application Insights enabled for monitoring
- [ ] Admin user created in production database

### **Post-Deployment Verification:**

- [ ] Test login endpoint with real admin credentials
- [ ] Verify JWT tokens are generated correctly
- [ ] Test token refresh functionality
- [ ] Verify rate limiting is working
- [ ] Check security headers in browser dev tools
- [ ] Test CORS with actual frontend domain
- [ ] Monitor Application Insights for authentication events

---

## 🚀 **Deployment Commands**

### **Database Migration (First Time)**

```bash
# From your local development machine
cd d:\SunnySeat\src\backend\SunnySeat.Data

# Set connection string to Azure database
$env:ConnectionStrings__DefaultConnection = "[YOUR AZURE DB CONNECTION STRING]"

# Run migrations
dotnet ef database update --project ../SunnySeat.Data/SunnySeat.Data.csproj --startup-project ../SunnySeat.Api/SunnySeat.Api.csproj
```

### **Deploy Application to Azure**

```bash
# Build for production
dotnet publish src/backend/SunnySeat.Api/SunnySeat.Api.csproj -c Release -o ./publish

# Deploy to Azure (using Azure CLI)
az webapp deployment source config-zip --resource-group [YOUR-RG] --name sunnyseat-api-prod --src ./publish.zip
```

---

## 📊 **Monitoring & Observability**

### **Application Insights Setup**

1. Create Application Insights resource in Azure Portal
2. Add connection string to App Service Configuration
3. Monitor these key metrics:
   - Authentication success/failure rates
   - Rate limiting violations
   - JWT token generation performance
   - Failed login attempts (potential attacks)

### **Key Metrics to Monitor:**

| Metric                | Threshold               | Alert Action                |
| --------------------- | ----------------------- | --------------------------- |
| Failed Login Rate     | > 10/min from single IP | Investigate for brute force |
| Rate Limit Violations | > 50/hour               | Check for DDoS attempt      |
| JWT Generation Time   | > 200ms                 | Performance investigation   |
| Auth Service Errors   | > 5/min                 | Check logs immediately      |

---

## 🔄 **Future Enhancements (Post-MVP)**

### **Azure AD B2C Integration** (Architecture Spec)

When ready to implement Azure AD B2C:

1. Create Azure AD B2C tenant
2. Configure user flows (sign-up, sign-in, password reset)
3. Register SunnySeat API as application
4. Update authentication to use Azure AD B2C tokens
5. Migration plan for existing local admin users

**Estimated Effort**: 2-3 days  
**Priority**: Post-MVP (current JWT auth is production-ready)

### **Additional Security Features:**

- [ ] Multi-factor authentication (MFA)
- [ ] JWT token blacklisting for immediate revocation
- [ ] Failed login attempt tracking with temporary lockouts
- [ ] Distributed rate limiting with Redis
- [ ] Advanced security event monitoring

---

## 📞 **Support & Troubleshooting**

### **Common Issues:**

**Issue**: App Service can't access Key Vault  
**Solution**: Verify Managed Identity is enabled and has "Key Vault Secrets User" role

**Issue**: JWT secret not loading from Key Vault  
**Solution**: Check Key Vault reference syntax: `@Microsoft.KeyVault(SecretUri=...)`

**Issue**: CORS errors in production  
**Solution**: Verify frontend domain is in AllowedOrigins array

**Issue**: Rate limiting too strict  
**Solution**: Adjust thresholds in `RateLimitingMiddleware.cs` (requires redeployment)

### **Get Help:**

- Review Story 1.3 QA Results: `docs/qa/gates/1.3-admin-authentication-security.yml`
- Check authentication service logs in Application Insights
- Contact: Quinn (Test Architect) for security questions

---

## ✅ **Completion Checklist**

Use this checklist to track your deployment progress:

### **Azure Resources Created:**

- [ ] Azure Key Vault created and configured
- [ ] JWT secret generated and stored in Key Vault
- [ ] App Service created with Managed Identity
- [ ] App Service granted access to Key Vault
- [ ] PostgreSQL database created and configured
- [ ] Application Insights created (optional)

### **Application Configured:**

- [ ] `appsettings.Production.json` created with Key Vault references
- [ ] App Service Configuration updated
- [ ] CORS configured for production domain
- [ ] Database migrations applied
- [ ] First admin user created

### **Security Verified:**

- [ ] No secrets in source code
- [ ] HTTPS enforced
- [ ] Security headers enabled
- [ ] Rate limiting working
- [ ] Authentication tested end-to-end

### **Monitoring Enabled:**

- [ ] Application Insights connected
- [ ] Authentication metrics being tracked
- [ ] Alerts configured for security events

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-09  
**Next Review**: After first production deployment

---

## 🎯 **Next Steps for You**

1. **Complete Phase 1 (Azure Setup)** - Follow steps 1.1 through 1.4 above
2. **Provide the requested information** in the checkboxes
3. **I'll generate** the production configuration files for you
4. **Deploy and verify** using the checklists above

**Questions?** Provide your Azure resource details and I'll help with the next steps!
