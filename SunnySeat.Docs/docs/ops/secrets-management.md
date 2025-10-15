# SunnySeat Secrets Management Guide

## Overview

This guide covers how to securely manage secrets and credentials for the SunnySeat application using Azure Key Vault.

## Secret Storage Strategy

### Central Secrets Key Vault

All environments (dev, staging, prod) reference secrets from a **central secrets Key Vault**:

- **Name:** `sunnyseat-secrets-kv` (with unique suffix)
- **Resource Group:** `sunnyseat-secrets-rg`
- **Purpose:** Store sensitive credentials shared across environments

### Environment-Specific Key Vaults

Each environment also has its own Key Vault for environment-specific secrets:

- `sunnyseat-dev-kv-<uniqueid>` - Development environment
- `sunnyseat-staging-kv-<uniqueid>` - Staging environment
- `sunnyseat-prod-kv-<uniqueid>` - Production environment

## Required Secrets

### Database Credentials

**Secret Name:** `postgres-admin-password`

**Generate:**

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$postgresPassword = [Convert]::ToBase64String($bytes)
```

**Store:**

```powershell
az keyvault secret set `
    --vault-name sunnyseat-secrets-kv `
    --name "postgres-admin-password" `
    --value $postgresPassword
```

### JWT Secret Key

**Secret Name:** `jwt-secret-key`

**Generate:**

```powershell
$bytes = New-Object byte[] 64
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$jwtSecret = [Convert]::ToBase64String($bytes)
```

**Store:**

```powershell
az keyvault secret set `
    --vault-name sunnyseat-secrets-kv `
    --name "jwt-secret-key" `
    --value $jwtSecret
```

### Weather API Keys

**OpenWeatherMap API Key:**

```powershell
az keyvault secret set `
    --vault-name sunnyseat-secrets-kv `
    --name "openweathermap-api-key" `
    --value "YOUR_API_KEY_HERE"
```

**Yr.no Service Account (if required):**

```powershell
az keyvault secret set `
    --vault-name sunnyseat-secrets-kv `
    --name "yrno-service-account" `
    --value "YOUR_SERVICE_ACCOUNT"
```

### Map Service API Keys

**MapTiler API Key:**

```powershell
az keyvault secret set `
    --vault-name sunnyseat-secrets-kv `
    --name "maptiler-api-key" `
    --value "YOUR_MAPTILER_KEY"
```

## Accessing Secrets

### From Azure Portal

1. Navigate to Key Vault in Azure Portal
2. Go to **Secrets**
3. Click on secret name
4. Click **Show Secret Value**

### Using Azure CLI

View secret value:

```powershell
az keyvault secret show `
    --vault-name sunnyseat-secrets-kv `
    --name "postgres-admin-password" `
    --query "value" -o tsv
```

List all secrets:

```powershell
az keyvault secret list `
    --vault-name sunnyseat-secrets-kv `
    --query "[].name" -o table
```

### From Application Code

Secrets are automatically injected into Container Apps as environment variables via Key Vault references in the Bicep template.

**Example (in Container App):**

```csharp
// Accessed via IConfiguration
var dbConnectionString = configuration.GetConnectionString("DefaultConnection");
var jwtSecret = configuration["Jwt:SecretKey"];
```

## Secret Rotation

### When to Rotate Secrets

- **Immediately:** If a secret is compromised
- **Regularly:**
  - JWT secrets: Every 90 days
  - Database passwords: Every 180 days
  - API keys: When provider recommends or annually

### How to Rotate Secrets

#### 1. Rotate PostgreSQL Password

Generate new password:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$newPassword = [Convert]::ToBase64String($bytes)
```

Update Azure PostgreSQL:

```powershell
az postgres flexible-server update `
    --resource-group sunnyseat-dev-rg `
    --name sunnyseat-dev-psql-<uniqueid> `
    --admin-password $newPassword
```

Update Key Vault:

```powershell
az keyvault secret set `
    --vault-name sunnyseat-secrets-kv `
    --name "postgres-admin-password" `
    --value $newPassword
```

Restart Container App to pick up new secret:

```powershell
az containerapp revision restart `
    --name sunnyseat-dev-api `
    --resource-group sunnyseat-dev-rg
```

#### 2. Rotate JWT Secret Key

⚠️ **WARNING:** Rotating JWT secret will invalidate all existing user sessions.

Generate new secret:

```powershell
$bytes = New-Object byte[] 64
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$newJwtSecret = [Convert]::ToBase64String($bytes)
```

Update Key Vault:

```powershell
az keyvault secret set `
    --vault-name sunnyseat-secrets-kv `
    --name "jwt-secret-key" `
    --value $newJwtSecret
```

Restart application:

```powershell
az containerapp revision restart `
    --name sunnyseat-dev-api `
    --resource-group sunnyseat-dev-rg
```

**Communication:** Notify users they will need to re-authenticate.

#### 3. Rotate API Keys

Update in Key Vault:

```powershell
az keyvault secret set `
    --vault-name sunnyseat-secrets-kv `
    --name "openweathermap-api-key" `
    --value "NEW_API_KEY"
```

Restart application to pick up new key.

## Access Control

### Grant User Access to Key Vault

**Using Azure RBAC (Recommended):**

```powershell
# Grant "Key Vault Secrets Officer" role (full access to secrets)
az role assignment create `
    --assignee "user@domain.com" `
    --role "Key Vault Secrets Officer" `
    --scope "/subscriptions/<sub-id>/resourceGroups/sunnyseat-secrets-rg/providers/Microsoft.KeyVault/vaults/sunnyseat-secrets-kv"

# Grant "Key Vault Secrets User" role (read-only access)
az role assignment create `
    --assignee "user@domain.com" `
    --role "Key Vault Secrets User" `
    --scope "/subscriptions/<sub-id>/resourceGroups/sunnyseat-secrets-rg/providers/Microsoft.KeyVault/vaults/sunnyseat-secrets-kv"
```

### Grant Container App Access

Container Apps use **Managed Identity** to access Key Vault secrets.

1. **System-assigned managed identity** is automatically created when Container App is deployed
2. Bicep template grants necessary permissions automatically
3. No credentials needed in application code

Verify access:

```powershell
# Get Container App managed identity
$principalId = az containerapp show `
    --name sunnyseat-dev-api `
    --resource-group sunnyseat-dev-rg `
    --query "identity.principalId" -o tsv

# Check role assignments
az role assignment list `
    --assignee $principalId `
    --all `
    --output table
```

### Grant Service Principal Access (for CI/CD)

```powershell
# For GitHub Actions or Azure DevOps service principal
az role assignment create `
    --assignee <service-principal-id> `
    --role "Key Vault Secrets User" `
    --scope "/subscriptions/<sub-id>/resourceGroups/sunnyseat-secrets-rg/providers/Microsoft.KeyVault/vaults/sunnyseat-secrets-kv"
```

## Audit Logging

### Enable Diagnostic Settings

```powershell
# Get Log Analytics workspace ID
$workspaceId = az monitor log-analytics workspace show `
    --resource-group sunnyseat-dev-rg `
    --workspace-name sunnyseat-dev-logs `
    --query "id" -o tsv

# Enable diagnostic logs for Key Vault
az monitor diagnostic-settings create `
    --name KeyVaultAuditLogs `
    --resource /subscriptions/<sub-id>/resourceGroups/sunnyseat-secrets-rg/providers/Microsoft.KeyVault/vaults/sunnyseat-secrets-kv `
    --workspace $workspaceId `
    --logs '[{"category": "AuditEvent", "enabled": true}]' `
    --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

### Query Audit Logs

View who accessed secrets:

```kusto
// In Azure Portal → Log Analytics Workspace → Logs
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where OperationName == "SecretGet"
| project TimeGenerated, CallerIPAddress, identity_claim_upn_s, requestUri_s
| order by TimeGenerated desc
```

## Emergency Access Procedures

### Lost Access to Key Vault

If you've lost access to Key Vault:

1. **Azure Portal → Key Vault → Access Control (IAM)**
2. Have a subscription administrator grant you access
3. Or use Azure AD Global Administrator "break glass" access

### Secrets Compromised

If secrets are compromised:

1. **Immediately rotate the compromised secret** (see rotation procedures above)
2. **Check audit logs** to determine scope of compromise
3. **Restart all affected services**
4. **Notify security team**
5. **Document incident**

### Key Vault Accidentally Deleted

Key Vault has **soft-delete** enabled (90 days for prod, 7 days for dev).

Recover deleted vault:

```powershell
# List deleted vaults
az keyvault list-deleted

# Recover vault
az keyvault recover `
    --name sunnyseat-secrets-kv `
    --resource-group sunnyseat-secrets-rg
```

## Best Practices

### ✅ DO

- ✅ Use managed identities instead of storing credentials
- ✅ Enable soft-delete on all Key Vaults
- ✅ Use RBAC for access control (not access policies)
- ✅ Rotate secrets regularly
- ✅ Enable audit logging
- ✅ Use separate secrets for each environment
- ✅ Store all secrets in Key Vault (never in code or config files)

### ❌ DON'T

- ❌ Store secrets in source control
- ❌ Share secrets via email or chat
- ❌ Use the same secret across environments
- ❌ Grant broad access to Key Vault
- ❌ Disable soft-delete on production vaults
- ❌ Hardcode secrets in application code

## Secret Inventory

### Current Secrets (Story 1.7)

| Secret Name               | Type                | Used By                   | Rotation Schedule     |
| ------------------------- | ------------------- | ------------------------- | --------------------- |
| `postgres-admin-password` | Database credential | Container App, Migrations | Every 180 days        |
| `jwt-secret-key`          | Authentication      | Container App             | Every 90 days         |
| `openweathermap-api-key`  | Third-party API     | Container App             | Annually or on breach |
| `maptiler-api-key`        | Third-party API     | Container App (Story 4.1) | Annually or on breach |
| `yrno-service-account`    | Third-party API     | Container App (Story 3.1) | Annually or on breach |

### Upcoming Secrets (Future Stories)

| Secret Name               | Type           | Introduced By | Notes            |
| ------------------------- | -------------- | ------------- | ---------------- |
| `redis-connection-string` | Auto-generated | Story 1.7     | Managed by Azure |
| `acr-admin-password`      | Auto-generated | Story 1.7     | Managed by Azure |

## Troubleshooting

### Cannot Access Secret

**Error:** `The user, group or application does not have secrets get permission`

**Solution:**

```powershell
az role assignment create `
    --assignee "your-email@domain.com" `
    --role "Key Vault Secrets User" `
    --scope "/subscriptions/<sub-id>/resourceGroups/sunnyseat-secrets-rg/providers/Microsoft.KeyVault/vaults/sunnyseat-secrets-kv"
```

### Container App Cannot Access Secret

**Check managed identity has permissions:**

```powershell
$principalId = az containerapp show `
    --name sunnyseat-dev-api `
    --resource-group sunnyseat-dev-rg `
    --query "identity.principalId" -o tsv

az role assignment list --assignee $principalId
```

### Secret Update Not Reflected in App

Restart Container App to pick up updated secrets:

```powershell
az containerapp revision restart `
    --name sunnyseat-dev-api `
    --resource-group sunnyseat-dev-rg
```

## Additional Resources

- [Azure Key Vault Documentation](https://learn.microsoft.com/azure/key-vault/)
- [Managed Identities Documentation](https://learn.microsoft.com/azure/active-directory/managed-identities-azure-resources/)
- [Container Apps Secrets Management](https://learn.microsoft.com/azure/container-apps/manage-secrets)

---

**Document Version:** 1.0  
**Last Updated:** October 9, 2025  
**Owner:** DevOps / Security Team
