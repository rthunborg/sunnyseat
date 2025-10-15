# Weather API Setup Guide

## Overview

This guide documents the setup and configuration of weather data providers for the SunnySeat platform. The system uses a dual-source weather integration with Met.no (Yr.no) as the primary source and OpenWeatherMap as the fallback provider.

## Architecture

```
Met.no API (Primary)
    ↓ (fails)
OpenWeatherMap API (Fallback)
    ↓
Weather Ingestion Service
    ↓
PostgreSQL Database (7-day retention)
```

## Prerequisites

- Azure subscription with Key Vault access
- Email address for Met.no User-Agent compliance
- Credit card for OpenWeatherMap Professional subscription (~$40/month)
- Access to `az` CLI or Azure Portal for Key Vault management

---

## Part 1: Yr.no / Met.no Service Account Setup

### 1.1 Understanding Met.no Requirements

Met.no (Norwegian Meteorological Institute) provides free weather data via `api.met.no` with the following requirements:

- **Authentication**: None required (public API)
- **User-Agent Header**: REQUIRED - must include contact email
- **Rate Limits**: 20 requests/second maximum
- **Terms of Service**: https://api.met.no/doc/TermsOfService

### 1.2 Configure User-Agent Header

The User-Agent header is **mandatory** and must include:

- Application name
- Version
- Contact email (for abuse/issues)

**Example Format:**

```
SunnySeat/1.0 (https://sunnyseat.app; contact@sunnyseat.app)
```

**Configuration Location:**
This is already configured in `src/backend/SunnySeat.Api/Program.cs`:

```csharp
builder.Services.AddHttpClient("MetNo", client =>
{
    client.BaseAddress = new Uri("https://api.met.no/");
    client.DefaultRequestHeaders.UserAgent.ParseAdd(
        "SunnySeat/1.0 (https://sunnyseat.app; contact@sunnyseat.app)"
    );
    client.Timeout = TimeSpan.FromSeconds(30);
});
```

**Action Required:**

- ✅ Update the contact email in `Program.cs` to your actual operations email
- ✅ Update version number as application evolves

### 1.3 Document Met.no Configuration

Create an internal operations document with:

- **Service Name**: Met.no Weather API
- **Base URL**: `https://api.met.no/weatherapi/locationforecast/2.0/compact`
- **Authentication**: None (public API)
- **Contact Email**: [Your operations email]
- **Rate Limit**: 20 requests/second
- **Polling Interval**: 10 minutes (600 seconds) - well within limits
- **Service Availability**: 99.9% uptime (per Met.no SLA)

### 1.4 No Credential Storage Required

Met.no does not require API keys or authentication credentials. The only requirement is the User-Agent header, which is configured in code.

**Key Vault Storage: NOT REQUIRED for Met.no**

---

## Part 2: OpenWeatherMap Professional Account Setup

### 2.1 Create OpenWeatherMap Account

1. Navigate to: https://openweathermap.org/
2. Click **Sign Up** (top right)
3. Fill in registration form:
   - Email: [Your operations email]
   - Password: [Strong password - store in password manager]
   - Company name: SunnySeat AB
4. Verify email address
5. Log in to dashboard

### 2.2 Subscribe to Professional Plan

**Why Professional Plan?**

- Free tier: 60 calls/hour (insufficient for 10-minute polling)
- Professional tier: 60 calls/minute (3,600 calls/hour)
- Cost: ~$40 USD/month (check current pricing)

**Steps:**

1. Log in to OpenWeatherMap dashboard
2. Navigate to **Pricing** → **Professional**
3. Click **Subscribe**
4. Enter billing information
5. Confirm subscription
6. Note subscription ID for accounting records

**Billing Contact:** [Your finance team email]

### 2.3 Obtain API Key

1. Log in to OpenWeatherMap dashboard
2. Navigate to **API Keys** tab
3. Copy the default API key (or generate new one)
4. **DO NOT commit this key to source control**

**API Key Format:** 32-character hexadecimal string  
**Example:** `2d1b6d709917a015d422387dde381246`

### 2.4 Store API Key in Azure Key Vault

#### Option A: Azure Portal

1. Navigate to Azure Portal: https://portal.azure.com
2. Search for "Key Vaults" and select your SunnySeat Key Vault
3. Click **Secrets** → **+ Generate/Import**
4. Configure secret:
   - **Name**: `openweathermap-api-key`
   - **Value**: [Paste your API key]
   - **Content Type**: `application/x-api-key`
   - **Activation Date**: [Today]
   - **Expiration Date**: [1 year from today]
5. Click **Create**
6. Note the Secret Identifier URL

#### Option B: Azure CLI

```bash
# Set variables
VAULT_NAME="sunnyseat-kv"  # Replace with your Key Vault name
API_KEY="your-api-key-here"

# Store secret
az keyvault secret set \
  --vault-name $VAULT_NAME \
  --name "openweathermap-api-key" \
  --value "$API_KEY" \
  --description "OpenWeatherMap Professional API Key" \
  --expires "2026-01-01T00:00:00Z"

# Verify storage
az keyvault secret show \
  --vault-name $VAULT_NAME \
  --name "openweathermap-api-key" \
  --query "value" \
  --output tsv
```

### 2.5 Grant Application Access to Key Vault

The Container App managed identity needs **Get** and **List** permissions:

```bash
# Get the managed identity principal ID
PRINCIPAL_ID=$(az containerapp show \
  --name sunnyseat-api \
  --resource-group sunnyseat-rg \
  --query "identity.principalId" \
  --output tsv)

# Grant Key Vault access
az keyvault set-policy \
  --name $VAULT_NAME \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list
```

**Verify in Portal:**

- Key Vault → Access Policies
- Ensure `sunnyseat-api` has **Get** and **List** permissions

### 2.6 Configure Local Development (User Secrets)

**NEVER store API keys in `appsettings.json` for development.**

Use .NET User Secrets for local development:

```bash
# Navigate to API project
cd src/backend/SunnySeat.Api

# Initialize user secrets (if not already done)
dotnet user-secrets init

# Set the API key
dotnet user-secrets set "Weather:OpenWeatherMapApiKey" "your-api-key-here"

# Verify
dotnet user-secrets list
```

**User Secrets Storage Location:**

- Windows: `%APPDATA%\Microsoft\UserSecrets\<user_secrets_id>\secrets.json`
- macOS/Linux: `~/.microsoft/usersecrets/<user_secrets_id>/secrets.json`

**Important:** User Secrets are per-developer, per-machine. Each developer must configure their own.

---

## Part 3: Configuration Verification

### 3.1 Verify appsettings.json Configuration

File: `src/backend/SunnySeat.Api/appsettings.json`

```json
{
  "Weather": {
    "OpenWeatherMapApiKey": "", // EMPTY - uses Key Vault or User Secrets
    "UpdateIntervalMinutes": 10,
    "DataRetentionDays": 7
  }
}
```

**Critical:** The API key field MUST be empty in source control.

### 3.2 Verify Program.cs Configuration

File: `src/backend/SunnySeat.Api/Program.cs`

```csharp
// Load weather configuration from appsettings.json + Key Vault
builder.Services.Configure<WeatherOptions>(
    builder.Configuration.GetSection("Weather")
);

// Named HttpClients for weather services
builder.Services.AddHttpClient("MetNo", client => { /* ... */ });
builder.Services.AddHttpClient("OpenWeatherMap", client => { /* ... */ });

// Register weather services
builder.Services.AddSingleton<IWeatherService, MetNoWeatherService>();
builder.Services.AddSingleton<IWeatherService, OpenWeatherMapService>();
builder.Services.AddHostedService<WeatherIngestionService>();
```

### 3.3 Test Local Development

```bash
# Build the application
dotnet build

# Run the application
dotnet run --project src/backend/SunnySeat.Api

# Check health endpoint
curl http://localhost:5000/health/weather
```

**Expected Response:**

```json
{
  "status": "Healthy",
  "results": {
    "weather": {
      "status": "Healthy",
      "description": "Weather data is current and both APIs are available"
    }
  }
}
```

### 3.4 Test Production Deployment

After deploying to Azure Container Apps:

```bash
# Check environment variables are set
az containerapp show \
  --name sunnyseat-api \
  --resource-group sunnyseat-rg \
  --query "properties.template.containers[0].env" \
  --output table

# Expected: Weather__OpenWeatherMapApiKey = @Microsoft.KeyVault(...)
```

**Health Check Endpoint:**

```bash
curl https://sunnyseat-api.azurecontainerapps.io/health/weather
```

---

## Part 4: Rate Limits and Quotas

### 4.1 Met.no Rate Limits

| Metric               | Limit                | Current Usage | Headroom           |
| -------------------- | -------------------- | ------------- | ------------------ |
| Requests/Second      | 20                   | 0.0017        | 99.99%             |
| Requests/Hour        | 72,000               | 6             | 99.99%             |
| Requests/Day         | 1,728,000            | 144           | 99.99%             |
| **Polling Interval** | **Every 10 minutes** | -             | Well within limits |

**Notes:**

- Met.no limits are per IP address
- SunnySeat polling (10 min) = 6 requests/hour
- No risk of rate limiting under normal operation

### 4.2 OpenWeatherMap Rate Limits

**Professional Plan:**

| Metric               | Limit          | Current Usage | Headroom |
| -------------------- | -------------- | ------------- | -------- |
| Requests/Minute      | 60             | 1             | 98.3%    |
| Requests/Hour        | 3,600          | 6             | 99.8%    |
| Requests/Day         | 86,400         | 144           | 99.8%    |
| **Polling Interval** | **10 minutes** | -             | Safe     |

**Notes:**

- Limits are per API key
- Fallback activation only (not primary)
- Usage expected to be minimal under normal operation

### 4.3 Monitoring Rate Limit Usage

**Application Insights Queries:**

```kql
// Track API call frequency
traces
| where message contains "Weather API"
| summarize Count=count() by bin(timestamp, 10m), source=tostring(customDimensions.Source)
| render timechart
```

```kql
// Detect rate limit errors (HTTP 429)
requests
| where resultCode == 429
| where name contains "weather"
| summarize Count=count() by bin(timestamp, 1h)
```

**Alerting Rules:**

- Alert if Met.no returns HTTP 429 (should never happen)
- Alert if OpenWeatherMap usage > 40 calls/minute (approaching limit)
- Alert if fallback is active for > 1 hour (primary failure)

---

## Part 5: Credential Rotation Procedures

### 5.1 OpenWeatherMap API Key Rotation

**Rotation Schedule:** Quarterly (every 3 months)  
**Responsible:** DevOps + Security Team

**Rotation Steps:**

1. **Generate New API Key** (in OpenWeatherMap dashboard)

   - Log in to OpenWeatherMap
   - Navigate to **API Keys**
   - Click **+ Create Key**
   - Name: `SunnySeat-Production-Q[X]-2025`
   - Copy new key

2. **Store New Key in Key Vault**

   ```bash
   az keyvault secret set \
     --vault-name sunnyseat-kv \
     --name "openweathermap-api-key" \
     --value "new-api-key-here" \
     --expires "2026-04-01T00:00:00Z"
   ```

3. **Restart Container App** (to reload configuration)

   ```bash
   az containerapp revision restart \
     --name sunnyseat-api \
     --resource-group sunnyseat-rg
   ```

4. **Verify New Key Works**

   - Check health endpoint: `/health/weather`
   - Monitor Application Insights for errors
   - Verify weather data is still being ingested

5. **Revoke Old API Key** (after 24 hours of verification)

   - Log in to OpenWeatherMap
   - Navigate to **API Keys**
   - Delete old key

6. **Document Rotation**
   - Update internal ops runbook with rotation date
   - Update Key Vault secret expiration date
   - Schedule next rotation (3 months)

### 5.2 Met.no Configuration Updates

**No credential rotation required** - Met.no uses User-Agent header only.

**Configuration Updates:**

- Update contact email if operations team changes
- Update version number in User-Agent during releases
- Verify User-Agent compliance annually

### 5.3 Rotation Verification Checklist

- [ ] New API key generated in OpenWeatherMap dashboard
- [ ] New key stored in Azure Key Vault with expiration date
- [ ] Container App restarted to reload configuration
- [ ] Health check endpoint returns "Healthy"
- [ ] Application Insights shows successful API calls
- [ ] Weather data ingestion continues (check database)
- [ ] Old API key revoked after 24-hour verification
- [ ] Rotation documented in ops runbook
- [ ] Next rotation scheduled (3 months)

---

## Part 6: Troubleshooting

### 6.1 Common Issues

#### Issue: "API key not found" in logs

**Symptoms:**

```
Error: OpenWeatherMap API key is not configured
```

**Resolution:**

1. Verify Key Vault secret exists: `az keyvault secret show --vault-name sunnyseat-kv --name openweathermap-api-key`
2. Verify Container App has Key Vault access policy
3. Verify environment variable references Key Vault: `Weather__OpenWeatherMapApiKey=@Microsoft.KeyVault(...)`
4. Restart Container App

#### Issue: HTTP 401 Unauthorized from OpenWeatherMap

**Symptoms:**

```
HTTP 401: {"cod":401, "message": "Invalid API key"}
```

**Resolution:**

1. Verify API key is correct in Key Vault
2. Check if subscription is active (billing issue)
3. Verify API key hasn't been revoked
4. Generate new key if necessary

#### Issue: HTTP 429 Too Many Requests

**Symptoms:**

```
HTTP 429: Rate limit exceeded
```

**Resolution:**

1. Met.no: Should never happen (6 req/hour << 20 req/sec limit)
   - Check for runaway loop in `WeatherIngestionService`
   - Review Application Insights for excessive calls
2. OpenWeatherMap: Check if another service is using same key
   - Review API usage in OpenWeatherMap dashboard
   - Consider upgrading plan if legitimate usage

#### Issue: Health check fails - "No weather data found"

**Symptoms:**

```json
{
  "status": "Unhealthy",
  "description": "No weather data in database"
}
```

**Resolution:**

1. Check if `WeatherIngestionService` is running (hosted service logs)
2. Verify database connectivity
3. Check for API errors in Application Insights
4. Manually trigger ingestion (restart Container App)
5. Verify database migrations applied

#### Issue: Fallback to OpenWeatherMap always active

**Symptoms:**

```
Warning: Met.no API failed, using OpenWeatherMap fallback
```

**Resolution:**

1. Verify Met.no API is accessible: `curl https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=57.7089&lon=11.9746`
2. Check User-Agent header configuration in `Program.cs`
3. Review Met.no service status: https://api.met.no/
4. Check network connectivity from Azure (firewall rules)

### 6.2 Health Check Endpoints

**Weather Service Health:**

```bash
curl https://sunnyseat-api.azurecontainerapps.io/health/weather
```

**Full System Health:**

```bash
curl https://sunnyseat-api.azurecontainerapps.io/health
```

**Health Check Logic:**

- Verifies at least 1 weather data point in database
- Verifies data is less than 24 hours old
- Verifies both Met.no and OpenWeatherMap APIs are reachable

### 6.3 Logging and Monitoring

**Application Insights Queries:**

**API Call Success Rate:**

```kql
dependencies
| where name contains "weather"
| summarize SuccessRate=avg(todouble(success)) by bin(timestamp, 10m)
| render timechart
```

**Fallback Activation Frequency:**

```kql
traces
| where message contains "OpenWeatherMap fallback"
| summarize Count=count() by bin(timestamp, 1h)
| render timechart
```

**Data Ingestion Latency:**

```kql
traces
| where message contains "Weather data ingested"
| extend Duration=todouble(customDimensions.DurationMs)
| summarize avg(Duration), max(Duration) by bin(timestamp, 10m)
```

---

## Part 7: Operations Runbook

### 7.1 Daily Operations

**Automated Tasks (No Action Required):**

- Weather data ingestion every 10 minutes
- 7-day data retention cleanup
- Health check monitoring

**Monitoring:**

- Review Application Insights dashboard daily
- Check for HTTP 429 (rate limiting) or 401 (auth) errors
- Verify fallback activation frequency (should be rare)

### 7.2 Weekly Operations

- Review API usage trends (met.no and OpenWeatherMap)
- Verify database size (should be stable with 7-day retention)
- Check for any degraded health check statuses

### 7.3 Monthly Operations

- Review OpenWeatherMap billing (should be ~$40/month)
- Verify no unexpected API charges
- Review weather data quality metrics

### 7.4 Quarterly Operations

- **API Key Rotation** (see Part 5)
- Review and update contact email in User-Agent if needed
- Review this documentation for accuracy

### 7.5 Emergency Contacts

| Role                   | Contact                    | Escalation       |
| ---------------------- | -------------------------- | ---------------- |
| Primary On-Call        | [Your DevOps team]         | 24/7             |
| Met.no Support         | https://api.met.no/        | Email support    |
| OpenWeatherMap Support | support@openweathermap.org | Business hours   |
| Azure Support          | Azure Portal               | Per support plan |

---

## Part 8: Cost Analysis

### 8.1 OpenWeatherMap Professional Plan

**Monthly Cost:** ~$40 USD  
**Annual Cost:** ~$480 USD  
**Payment Method:** Credit card (auto-renewal)

**Cost Breakdown:**

- Professional plan base: $40/month
- Additional charges: None (under rate limits)
- Total: $40/month

### 8.2 Met.no API

**Cost:** FREE (public service)  
**Terms:** Comply with User-Agent requirements

### 8.3 Azure Costs

**Storage (PostgreSQL):**

- 7 days × 144 records/day × 48 data points/record ≈ 48,384 records
- Storage size: ~10 MB (negligible)

**Bandwidth:**

- API calls: 6/hour × 2 APIs × ~50 KB/response ≈ 14.4 MB/day
- Monthly: ~432 MB (negligible)

**Total Infrastructure Cost:** < $1/month (weather data specific)

---

## Appendix A: Configuration Reference

### Environment Variables (Production)

```bash
# Azure Container App Environment Variables
Weather__OpenWeatherMapApiKey=@Microsoft.KeyVault(SecretUri=https://sunnyseat-kv.vault.azure.net/secrets/openweathermap-api-key/)
Weather__UpdateIntervalMinutes=10
Weather__DataRetentionDays=7
```

### appsettings.json (Development)

```json
{
  "Weather": {
    "OpenWeatherMapApiKey": "",
    "UpdateIntervalMinutes": 10,
    "DataRetentionDays": 7
  }
}
```

### User Secrets (Local Development)

```json
{
  "Weather:OpenWeatherMapApiKey": "your-local-dev-api-key"
}
```

---

## Appendix B: API Endpoint Reference

### Met.no API

**Endpoint:**

```
GET https://api.met.no/weatherapi/locationforecast/2.0/compact
```

**Parameters:**

- `lat`: Latitude (e.g., 57.7089)
- `lon`: Longitude (e.g., 11.9746)

**Headers:**

- `User-Agent`: Required (e.g., "SunnySeat/1.0 (contact@sunnyseat.app)")

**Response:** JSON with forecast data

### OpenWeatherMap API

**Endpoint:**

```
GET https://api.openweathermap.org/data/3.0/onecall
```

**Parameters:**

- `lat`: Latitude
- `lon`: Longitude
- `appid`: API key
- `units`: metric

**Response:** JSON with current + forecast data

---

## Document Revision History

| Date       | Version | Changes               | Author      |
| ---------- | ------- | --------------------- | ----------- |
| 2025-10-12 | 1.0     | Initial documentation | James (Dev) |

---

**Document Owner:** DevOps Team  
**Review Cycle:** Quarterly  
**Next Review:** 2026-01-12
