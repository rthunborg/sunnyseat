# CI/CD Pipeline Troubleshooting Guide

This guide covers common CI/CD pipeline failures, their root causes, and step-by-step solutions.

## Quick Diagnosis

### Pipeline Failure Checklist

1. **Which job failed?** Build, Test, Security, Code Quality, or Deployment?
2. **Is it reproducible locally?** Can you replicate the issue on your machine?
3. **Recent changes?** What files were modified in the failing commit?
4. **Environment-specific?** Does it only fail in CI or also locally?

## Build Failures

### Error: "Build FAILED"

#### Symptom

```
error CS0246: The type or namespace name 'SomeClass' could not be found
```

#### Cause

- Missing project reference
- Missing NuGet package
- Namespace typo

#### Solution

```bash
# 1. Verify locally
dotnet build SunnySeat.sln

# 2. Check project references
dotnet list reference

# 3. Restore packages
dotnet restore --force

# 4. Clean and rebuild
dotnet clean
dotnet build
```

#### Prevention

- Always build locally before pushing
- Keep project references aligned
- Don't manually edit `.csproj` files if possible

---

### Error: "Package restore failed"

#### Symptom

```
error NU1101: Unable to find package 'PackageName'. No packages exist with this id
```

#### Cause

- Typo in package name
- Package doesn't exist in configured NuGet feeds
- Network connectivity issues in CI

#### Solution

```bash
# 1. Verify package exists
dotnet add package PackageName --dry-run

# 2. Check NuGet sources
dotnet nuget list source

# 3. Clear NuGet cache
dotnet nuget locals all --clear

# 4. Re-add package with explicit version
dotnet add package PackageName --version X.Y.Z
```

#### CI-Specific Fix

If only failing in CI, clear GitHub Actions cache:

1. Go to Actions > Caches
2. Delete NuGet cache entries
3. Re-run workflow

---

### Error: "The current .NET SDK does not support targeting .NET 8.0"

#### Symptom

```
error NETSDK1045: The current .NET SDK does not support targeting .NET 8.0
```

#### Cause

- Wrong .NET version specified in workflow
- `global.json` specifies unavailable SDK version

#### Solution

**Option 1: Update workflow**

```yaml
- name: Setup .NET
  uses: actions/setup-dotnet@v4
  with:
    dotnet-version: "8.0.x" # Ensure this matches project
```

**Option 2: Update `global.json`**

```json
{
  "sdk": {
    "version": "8.0.100",
    "rollForward": "latestMinor"  # Allow newer minor versions
  }
}
```

---

## Test Failures

### Error: "Tests failed with errors"

#### Symptom

```
Failed TestName [142 ms]
  Expected: 200
  Actual:   500
```

#### Diagnosis Steps

1. **Identify failing test**

   - Review GitHub Actions job logs
   - Download test results artifact for detailed report

2. **Run test locally**

   ```bash
   dotnet test --filter "FullyQualifiedName~TestNamespace.TestClass.TestMethod"
   ```

3. **Check for environment differences**
   - Database state
   - Configuration values
   - Service dependencies

#### Common Causes

**Database State Issues**

```bash
# CI runs migrations but database may have stale data
# Solution: Ensure tests use transactions or cleanup

[Fact]
public async Task TestMethod()
{
    using var transaction = await _dbContext.Database.BeginTransactionAsync();
    try
    {
        // Test code
    }
    finally
    {
        await transaction.RollbackAsync();
    }
}
```

**Configuration Missing**

```bash
# Test expects configuration value not set in CI
# Solution: Add to workflow environment variables

env:
  ConnectionStrings__DefaultConnection: "Host=localhost;..."
  SomeApiKey: "test-key"
```

---

### Error: "Health check tests fail with 503"

#### Symptom

```
FullSystemIntegrationTests.API_HealthEndpoint_ShouldRespondQuickly()
Expected: 200 OK
Actual:   503 Service Unavailable
```

#### Cause

- Application not fully started
- Dependencies (PostgreSQL, Redis) not ready
- Health check endpoint requires authenticated services

#### Solution

**Option 1: Increase startup wait time**

```bash
# In workflow, add wait before health check tests
- name: Start API for integration tests
  run: |
    dotnet run --project src/backend/SunnySeat.Api &
    sleep 10  # Wait for startup
    curl -f http://localhost:5001/health || exit 1
```

**Option 2: Categorize tests appropriately**

```csharp
[Trait("Category", "E2E")]  // Don't run in standard CI
public class FullSystemIntegrationTests
{
    // Tests that require full running system
}
```

**Option 3: Use health check with retries**

```bash
- name: Wait for API health
  run: |
    for i in {1..30}; do
      if curl -f http://localhost:5001/health; then
        exit 0
      fi
      sleep 2
    done
    exit 1
```

---

### Error: "Database connection refused"

#### Symptom

```
Npgsql.NpgsqlException: Connection refused
  at host=localhost, port=5432
```

#### Cause

- PostgreSQL service container not ready
- Wrong connection string
- Missing service configuration in workflow

#### Solution

**Verify service container in workflow:**

```yaml
services:
  postgres:
    image: postgis/postgis:15-3.4
    env:
      POSTGRES_DB: sunnyseat_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432
```

**Add explicit wait:**

```yaml
- name: Wait for PostgreSQL
  run: |
    timeout 60 bash -c 'until pg_isready -h localhost -p 5432 -U postgres; do sleep 1; done'
```

**Check connection string:**

```yaml
env:
  ConnectionStrings__DefaultConnection: "Host=localhost;Database=sunnyseat_test;Username=postgres;Password=postgres"
```

---

## Security Scan Failures

### Error: "Vulnerable packages detected"

#### Symptom

```
Package 'Newtonsoft.Json' 12.0.1 has known vulnerabilities:
  - CVE-2024-12345 (High)
```

#### Solution

**Step 1: Check vulnerability details**

```bash
dotnet list package --vulnerable --include-transitive
```

**Step 2: Update vulnerable package**

```bash
# Direct dependency
dotnet add package Newtonsoft.Json --version 13.0.3

# Transitive dependency (update parent package)
dotnet list package --include-transitive | grep Newtonsoft
# Then update the package that depends on it
```

**Step 3: Verify fix**

```bash
dotnet list package --vulnerable
# Should show no vulnerabilities
```

**Step 4: If no fix available, document exception**

```yaml
# In workflow, allow specific CVEs as known/accepted
- name: Security scan
  run: |
    dotnet list package --vulnerable --include-transitive || \
    echo "Known CVE-2024-XXXX accepted until Q2 2025"
  continue-on-error: true # Only if documented and approved
```

---

## Code Quality Failures

### Error: "Code formatting violations detected"

#### Symptom

```
error: Code formatting is not correct
  Run 'dotnet format' to fix formatting issues
```

#### Solution

**Step 1: Auto-fix formatting**

```bash
dotnet format SunnySeat.sln
```

**Step 2: Review changes**

```bash
git diff
```

**Step 3: Commit formatting fixes**

```bash
git add .
git commit -m "fix: Apply code formatting"
git push
```

#### Prevention

**Add pre-commit hook:**

```bash
# .git/hooks/pre-commit
#!/bin/sh
dotnet format --verify-no-changes || {
  echo "Code formatting issues detected. Run 'dotnet format' to fix."
  exit 1
}
```

**Configure IDE:**

- Visual Studio: Enable "Format on Save"
- VS Code: Install C# extension, enable format on save

---

### Error: "Architecture compliance test failed"

#### Symptom

```
ArchitectureComplianceTests.Core_ShouldNotDependOnData()
Expected: 0 references
Actual:   1 reference found (SunnySeat.Core -> SunnySeat.Data)
```

#### Cause

- Violation of layered architecture
- Core layer referencing Data layer (should be opposite)

#### Solution

**Step 1: Identify violating reference**

```bash
# Check project references
dotnet list src/backend/SunnySeat.Core/SunnySeat.Core.csproj reference
```

**Step 2: Remove incorrect reference**

```bash
dotnet remove src/backend/SunnySeat.Core/SunnySeat.Core.csproj reference ../SunnySeat.Data/SunnySeat.Data.csproj
```

**Step 3: Refactor code**

- Move shared interfaces to Core
- Implement interfaces in Data layer
- Use dependency injection

**Example Fix:**

```csharp
// WRONG: Core referencing Data
using SunnySeat.Data.Repositories;  // ❌

// RIGHT: Core defines interface, Data implements
using SunnySeat.Core.Interfaces;    // ✅
```

---

## Deployment Failures

### Error: "Health check failed after deployment"

#### Symptom

```
Deployment completed but health check failed
GET https://sunnyseat-staging.azurewebsites.net/health
Status: 503 Service Unavailable
```

#### Diagnosis

**Step 1: Check Azure App Service logs**

```bash
az webapp log tail \
  --name sunnyseat-staging \
  --resource-group sunnyseat-rg
```

**Step 2: Check common issues**

- Database connection string misconfigured
- Missing environment variables
- Database not accessible from Azure
- Redis cache connection issues

**Step 3: Verify configuration in Azure Portal**

1. Navigate to App Service → Configuration
2. Check connection strings match expected format
3. Verify all required app settings present

#### Solutions

**Connection String Issue:**

```bash
# Update connection string in Azure
az webapp config connection-string set \
  --name sunnyseat-staging \
  --resource-group sunnyseat-rg \
  --settings DefaultConnection="Host=...;Database=...;Username=...;Password=..." \
  --connection-string-type PostgreSQL
```

**Missing Environment Variable:**

```bash
az webapp config appsettings set \
  --name sunnyseat-staging \
  --resource-group sunnyseat-rg \
  --settings ASPNETCORE_ENVIRONMENT="Staging"
```

**Database Firewall Issue:**

```bash
# Allow Azure services to access database
az postgres server firewall-rule create \
  --resource-group sunnyseat-rg \
  --server-name sunnyseat-db \
  --name AllowAllAzureIPs \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

---

### Error: "Azure deployment timed out"

#### Symptom

```
Error: Deployment timed out after 20 minutes
```

#### Cause

- Large application package
- Slow network connection
- Azure service issues

#### Solution

**Step 1: Check Azure status**

- Visit [Azure Status Page](https://status.azure.com/)
- Verify no outages in your region

**Step 2: Optimize deployment package**

```bash
# Publish with trimming to reduce size
dotnet publish -c Release --self-contained false -p:PublishTrimmed=false
```

**Step 3: Increase timeout in workflow**

```yaml
- name: Deploy to Azure
  timeout-minutes: 30 # Increase from default 20
  run: |
    # Deployment steps
```

**Step 4: Retry deployment**

- Re-run workflow manually
- If persistent, contact Azure support

---

### Error: "Slot swap failed"

#### Symptom

```
Error: Failed to swap deployment slots
```

#### Cause

- Staging slot unhealthy
- Configuration mismatch between slots
- Active connections preventing swap

#### Solution

**Step 1: Verify staging slot health**

```bash
az webapp show \
  --name sunnyseat-production \
  --resource-group sunnyseat-rg \
  --slot staging \
  --query "state"
```

**Step 2: Manual health check**

```bash
curl -f https://sunnyseat-production-staging.azurewebsites.net/health
```

**Step 3: Check slot settings**

```bash
# Ensure swap doesn't change critical settings
az webapp config appsettings list \
  --name sunnyseat-production \
  --resource-group sunnyseat-rg \
  --slot staging
```

**Step 4: Force swap with warmup**

```bash
az webapp deployment slot swap \
  --name sunnyseat-production \
  --resource-group sunnyseat-rg \
  --slot staging \
  --target-slot production
```

---

## Cache Issues

### Error: "Cache restoration failed"

#### Symptom

```
Warning: Failed to restore cache
Cache not found for key: ubuntu-latest-nuget-abc123
```

#### Cause

- Cache expired (GitHub caches expire after 7 days of no access)
- Cache key changed (project files modified)
- GitHub Actions cache storage full

#### Solution

**This is usually not a problem:**

- Warning only, build will continue
- Dependencies will restore from NuGet instead
- Subsequent builds will recreate cache

**If causing issues:**

```yaml
# Adjust cache key strategy for more stable caching
- name: Cache NuGet packages
  uses: actions/cache@v4
  with:
    path: ~/.nuget/packages
    key: ${{ runner.os }}-nuget-${{ hashFiles('**/packages.lock.json') }}
    restore-keys: |
      ${{ runner.os }}-nuget-
```

---

### Error: "Out of disk space"

#### Symptom

```
Error: No space left on device
```

#### Cause

- Build artifacts consuming too much space
- Old caches not being cleaned up

#### Solution

**Step 1: Clear caches**

1. Go to repository Settings > Actions > Caches
2. Delete old/unused caches

**Step 2: Optimize build output**

```yaml
- name: Clean before build
  run: dotnet clean

- name: Build
  run: dotnet build --no-incremental
```

**Step 3: Reduce artifact retention**

```yaml
- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: TestResults/
    retention-days: 7 # Reduce from default 90
```

---

## Workflow Syntax Errors

### Error: "Invalid workflow file"

#### Symptom

```
Invalid workflow file: .github/workflows/build-and-test.yml
  (Line 23, Col 5): Unexpected value 'stepss'
```

#### Cause

- YAML syntax error
- Typo in workflow keywords
- Incorrect indentation

#### Solution

**Step 1: Validate YAML**

- Use online validator: https://www.yamllint.com/
- Check indentation (use spaces, not tabs)

**Step 2: Common mistakes**

```yaml
# WRONG
stepss:  # Typo
  - name: Build

# WRONG
steps:
- name: Build  # Missing indentation

# RIGHT
steps:
  - name: Build
    run: dotnet build
```

**Step 3: Test locally**

```bash
# Install act to run GitHub Actions locally
act -l  # List workflows
act push  # Simulate push event
```

---

## Rollback Procedures

### Rollback Production Deployment

**Scenario:** Production deployment succeeded but application is broken

**Immediate Action:**

```bash
# Swap back to previous slot
az webapp deployment slot swap \
  --name sunnyseat-production \
  --resource-group sunnyseat-rg \
  --slot production \
  --target-slot staging
```

**Alternative: Redeploy previous version**

```bash
# Find last working commit
git log --oneline

# Re-run deploy workflow with specific commit
# In GitHub: Actions > Deploy to Production > Run workflow
# Select branch/tag: <commit-sha>
```

---

### Rollback Database Migration

**Scenario:** Migration broke production database

**Step 1: Identify migration to rollback**

```bash
dotnet ef migrations list --project src/backend/SunnySeat.Data
```

**Step 2: Rollback to previous migration**

```bash
dotnet ef database update PreviousMigrationName \
  --project src/backend/SunnySeat.Data \
  --startup-project src/backend/SunnySeat.Api \
  --connection "Host=prod-server;..."
```

**Step 3: Remove bad migration file**

```bash
dotnet ef migrations remove \
  --project src/backend/SunnySeat.Data
```

---

## Getting Help

### Self-Service Resources

1. **Review workflow logs** - Most specific to your issue
2. **Check this troubleshooting guide** - Common scenarios
3. **Search GitHub Issues** - Others may have encountered same problem
4. **GitHub Actions Documentation** - [docs.github.com/actions](https://docs.github.com/en/actions)

### Escalation Path

1. **Search existing issues:** [GitHub Issues](https://github.com/your-org/sunnyseat/issues)
2. **Create new issue** with:
   - Workflow name and run ID
   - Error message (full output)
   - Steps to reproduce
   - Recent changes
3. **Tag appropriate team:**
   - `@devops-team` for pipeline issues
   - `@backend-team` for build/test issues
   - `@frontend-team` for frontend deployment issues

### Contact Information

- **DevOps Team:** devops@example.com
- **On-call Engineer:** [PagerDuty/Slack channel]
- **Emergency Escalation:** [Phone number]

---

## Preventive Measures

### Before Pushing Code

- [ ] Run `dotnet build` locally
- [ ] Run `dotnet test` locally
- [ ] Run `dotnet format --verify-no-changes`
- [ ] Check for vulnerable packages: `dotnet list package --vulnerable`
- [ ] Review changes: `git diff`

### Best Practices

1. **Keep builds fast** - Slow builds = less frequent CI runs
2. **Fix broken builds immediately** - Don't merge over failures
3. **Monitor build trends** - Identify flaky tests early
4. **Keep workflows simple** - Complexity = harder debugging
5. **Document unusual configurations** - Future you will thank current you

### Regular Maintenance

- **Weekly:** Review failed builds, identify patterns
- **Monthly:** Review and update dependencies
- **Quarterly:** Audit secrets and credentials
- **Annually:** Review and optimize entire pipeline

---

**Last Updated:** October 9, 2025  
**Maintained By:** DevOps Team  
**Feedback:** Create issue or PR with improvements
