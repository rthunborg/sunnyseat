# Validate SunnySeat Bicep Templates
# Validates all Bicep templates without deploying

param(
    [ValidateSet('dev', 'staging', 'prod', 'all')]
    [string]$Environment = 'all'
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "SunnySeat Bicep Validation" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Bicep is installed
Write-Host "Checking Bicep installation..." -ForegroundColor Yellow
try {
    az bicep version
    Write-Host "✓ Bicep CLI found" -ForegroundColor Green
}
catch {
    Write-Host "Installing Bicep..." -ForegroundColor Yellow
    az bicep install
}
Write-Host ""

# Build main template
Write-Host "Building main.bicep..." -ForegroundColor Yellow
az bicep build --file bicep/main.bicep

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ main.bicep builds successfully" -ForegroundColor Green
Write-Host ""

# Validate modules
$modules = @(
    "network.bicep",
    "postgresql.bicep",
    "redis.bicep",
    "keyvault.bicep",
    "keyvault-secrets.bicep",
    "monitoring.bicep",
    "storage.bicep",
    "container-registry.bicep",
    "container-apps-environment.bicep",
    "container-app.bicep"
)

Write-Host "Validating modules..." -ForegroundColor Yellow
foreach ($module in $modules) {
    Write-Host "  Checking $module..." -NoNewline
    az bicep build --file "bicep/modules/$module" --stdout | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✓" -ForegroundColor Green
    }
    else {
        Write-Host " ✗" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Lint check
Write-Host "Running linter on main template..." -ForegroundColor Yellow
az bicep lint --file bicep/main.bicep
Write-Host ""

Write-Host "=====================================" -ForegroundColor Green
Write-Host "All templates validated successfully!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Templates are ready for deployment." -ForegroundColor White
Write-Host ""
