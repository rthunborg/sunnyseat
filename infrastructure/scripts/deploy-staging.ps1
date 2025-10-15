# Deploy SunnySeat Staging Environment
# This script provisions all Azure infrastructure for the staging environment

param(
    [string]$SubscriptionId = "",
    [string]$Location = "westeurope",
    [string]$ResourceGroupName = "sunnyseat-staging-rg"
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "SunnySeat Staging Deployment" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
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

# Confirm deployment
$confirmation = Read-Host "Deploy to STAGING environment? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

# Create resource group
Write-Host "Creating resource group: $ResourceGroupName" -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location --tags Environment=staging Application=SunnySeat
Write-Host "✓ Resource group created" -ForegroundColor Green
Write-Host ""

# Deploy infrastructure
Write-Host "Deploying infrastructure... (this may take 15-20 minutes)" -ForegroundColor Yellow
az deployment group create `
    --resource-group $ResourceGroupName `
    --template-file bicep/main.bicep `
    --parameters @bicep/parameters/staging.parameters.json `
    --name "sunnyseat-staging-$(Get-Date -Format 'yyyyMMdd-HHmmss')" `
    --output json | Tee-Object -Variable deploymentOutput

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Deployment failed" -ForegroundColor Red
    exit 1
}

$outputs = ($deploymentOutput | ConvertFrom-Json).properties.outputs

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Staging Deployment Successful!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "API URL: https://$($outputs.apiUrl.value)" -ForegroundColor White
Write-Host ""
