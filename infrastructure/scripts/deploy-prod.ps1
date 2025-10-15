# Deploy SunnySeat Production Environment
# This script provisions all Azure infrastructure for the production environment
# REQUIRES MANUAL APPROVAL

param(
    [string]$SubscriptionId = "",
    [string]$Location = "westeurope",
    [string]$ResourceGroupName = "sunnyseat-prod-rg"
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Red
Write-Host "PRODUCTION DEPLOYMENT" -ForegroundColor Red
Write-Host "=====================================" -ForegroundColor Red
Write-Host ""
Write-Host "⚠️  WARNING: This will deploy to PRODUCTION" -ForegroundColor Red
Write-Host ""

# Check Azure CLI
az version | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Azure CLI not found" -ForegroundColor Red
    exit 1
}

# Set subscription
if ($SubscriptionId) {
    az account set --subscription $SubscriptionId
}

$currentSub = az account show --query "{Name:name, Id:id}" -o json | ConvertFrom-Json
Write-Host "Using subscription: $($currentSub.Name)" -ForegroundColor Cyan
Write-Host ""

# Double confirmation for production
Write-Host "Type 'DEPLOY TO PRODUCTION' to confirm:" -ForegroundColor Yellow
$confirmation = Read-Host
if ($confirmation -ne "DEPLOY TO PRODUCTION") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

# Create resource group
Write-Host "Creating resource group: $ResourceGroupName" -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location --tags Environment=production Application=SunnySeat
Write-Host "✓ Resource group created" -ForegroundColor Green
Write-Host ""

# Validate first
Write-Host "Validating production template..." -ForegroundColor Yellow
az deployment group validate `
    --resource-group $ResourceGroupName `
    --template-file bicep/main.bicep `
    --parameters @bicep/parameters/prod.parameters.json `
    --output none

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Validation failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Validation passed" -ForegroundColor Green
Write-Host ""

# Deploy infrastructure
Write-Host "Deploying PRODUCTION infrastructure... (this may take 20-30 minutes)" -ForegroundColor Yellow
az deployment group create `
    --resource-group $ResourceGroupName `
    --template-file bicep/main.bicep `
    --parameters @bicep/parameters/prod.parameters.json `
    --name "sunnyseat-prod-$(Get-Date -Format 'yyyyMMdd-HHmmss')" `
    --output json | Tee-Object -Variable deploymentOutput

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Deployment failed" -ForegroundColor Red
    exit 1
}

$outputs = ($deploymentOutput | ConvertFrom-Json).properties.outputs

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "PRODUCTION Deployment Successful!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Production API URL: https://$($outputs.apiUrl.value)" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Remember to:" -ForegroundColor Yellow
Write-Host "  1. Configure custom domain (if applicable)" -ForegroundColor White
Write-Host "  2. Enable monitoring alerts" -ForegroundColor White
Write-Host "  3. Review security settings" -ForegroundColor White
Write-Host "  4. Test all endpoints" -ForegroundColor White
Write-Host ""
