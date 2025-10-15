# Deploy SunnySeat Development Environment
# This script provisions all Azure infrastructure for the development environment

param(
    [string]$SubscriptionId = "",
    [string]$Location = "swedencentral",  # Azure for Students allowed region
    [string]$ResourceGroupName = "sunnyseat-dev-rg"
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "SunnySeat Development Deployment" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is installed
Write-Host "Checking Azure CLI installation..." -ForegroundColor Yellow
try {
    az version | Out-Null
    Write-Host "✓ Azure CLI found" -ForegroundColor Green
}
catch {
    Write-Host "✗ Azure CLI not found. Please install: https://aka.ms/azure-cli" -ForegroundColor Red
    exit 1
}

# Login to Azure (if not already logged in)
Write-Host "Checking Azure login status..." -ForegroundColor Yellow
$account = az account show 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please login to Azure..." -ForegroundColor Yellow
    az login
}

# Set subscription if provided
if ($SubscriptionId) {
    Write-Host "Setting subscription to: $SubscriptionId" -ForegroundColor Yellow
    az account set --subscription $SubscriptionId
}

# Display current subscription
$currentSub = az account show --query '{Name:name, Id:id}' -o json | ConvertFrom-Json
Write-Host "Using subscription:" -ForegroundColor Cyan
Write-Host "  Name: $($currentSub.Name)" -ForegroundColor White
Write-Host "  ID: $($currentSub.Id)" -ForegroundColor White
Write-Host ""

# Confirm deployment
$confirmation = Read-Host "Deploy to development environment? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

# Create resource group
Write-Host "Creating resource group: $ResourceGroupName" -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location --tags Environment=dev Application=SunnySeat
Write-Host "✓ Resource group created" -ForegroundColor Green
Write-Host ""

# Generate secrets if not exists
Write-Host "Checking for secrets..." -ForegroundColor Yellow
$secretsRgName = "sunnyseat-secrets-rg"

# Check if secrets resource group exists
$secretsRgExists = az group exists --name $secretsRgName
if ($secretsRgExists -eq "false") {
    Write-Host "Creating secrets resource group..." -ForegroundColor Yellow
    az group create --name $secretsRgName --location $Location --tags Application=SunnySeat Purpose=Secrets | Out-Null
    Write-Host "✓ Secrets resource group created" -ForegroundColor Green
}

# Check if any Key Vault exists in the secrets resource group
$existingKv = az keyvault list --resource-group $secretsRgName --query "[0].name" -o tsv 2>$null
if ($existingKv) {
    $secretsKvName = $existingKv
    Write-Host "✓ Found existing Key Vault: $secretsKvName" -ForegroundColor Green
    
    # Check if required secrets exist
    $postgresSecretExists = az keyvault secret show --vault-name $secretsKvName --name "postgres-admin-password" --query "id" -o tsv 2>$null
    $jwtSecretExists = az keyvault secret show --vault-name $secretsKvName --name "jwt-secret-key" --query "id" -o tsv 2>$null
    
    if (-not $postgresSecretExists -or -not $jwtSecretExists) {
        Write-Host "Some secrets are missing. Generating..." -ForegroundColor Yellow
        
        if (-not $postgresSecretExists) {
            Write-Host "  Generating PostgreSQL admin password..." -ForegroundColor Gray
            $postgresPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
            az keyvault secret set --vault-name $secretsKvName --name "postgres-admin-password" --value $postgresPassword | Out-Null
        }
        
        if (-not $jwtSecretExists) {
            Write-Host "  Generating JWT secret key..." -ForegroundColor Gray
            $bytes = New-Object byte[] 64
            $rng = [Security.Cryptography.RNGCryptoServiceProvider]::Create()
            $rng.GetBytes($bytes)
            $jwtSecret = [Convert]::ToBase64String($bytes)
            az keyvault secret set --vault-name $secretsKvName --name "jwt-secret-key" --value $jwtSecret | Out-Null
        }
        
        Write-Host "✓ Secrets generated" -ForegroundColor Green
    }
    else {
        Write-Host "✓ All required secrets exist" -ForegroundColor Green
    }
}
else {
    Write-Host "No existing Key Vault found. Creating new one..." -ForegroundColor Yellow
    
    # Generate unique Key Vault name (must be 3-24 alphanumeric characters, globally unique)
    $uniqueSuffix = Get-Random -Minimum 100000 -Maximum 999999
    $secretsKvName = "ss-kv-$uniqueSuffix"
    
    Write-Host "  Generated Key Vault name: $secretsKvName" -ForegroundColor Gray
    
    # Try creating Key Vault with fallback regions for Azure for Students
    # Note: Azure for Students subscription only allows specific regions
    $kvCreated = $false
    $lastError = ""
    $regionsToTry = @("swedencentral", "italynorth", "polandcentral", "norwayeast", "spaincentral")
    
    # Register Key Vault provider if needed
    $kvProvider = az provider show --namespace Microsoft.KeyVault --query "registrationState" -o tsv 2>$null
    if ($kvProvider -ne "Registered") {
        Write-Host "  Registering Microsoft.KeyVault provider..." -ForegroundColor Gray
        az provider register --namespace Microsoft.KeyVault | Out-Null
        Start-Sleep -Seconds 30  # Wait for registration
    }
    
    foreach ($region in $regionsToTry) {
        Write-Host "  Trying region: $region..." -ForegroundColor Gray
        
        $createResult = az keyvault create `
            --name $secretsKvName `
            --resource-group $secretsRgName `
            --location $region `
            --enable-rbac-authorization false `
            2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Key Vault created in $region" -ForegroundColor Green
            $kvCreated = $true
            break
        }
        else {
            $lastError = $createResult
            Write-Host "    Failed: $($createResult -split "`n" | Select-Object -First 1)" -ForegroundColor DarkGray
        }
    }
    
    if (-not $kvCreated) {
        Write-Host ""
        Write-Host "✗ Failed to create Key Vault in any region." -ForegroundColor Red
        Write-Host ""
        Write-Host "Last error:" -ForegroundColor Yellow
        Write-Host $lastError -ForegroundColor Red
        Write-Host ""
        Write-Host "This might be due to:" -ForegroundColor Yellow
        Write-Host "  1. Key Vault name '$secretsKvName' already exists globally (must be globally unique)" -ForegroundColor Gray
        Write-Host "  2. Azure for Students policy restrictions" -ForegroundColor Gray
        Write-Host "  3. Insufficient permissions" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Solutions:" -ForegroundColor Cyan
        Write-Host "  A. Try running the script again (will generate a new random name)" -ForegroundColor White
        Write-Host "  B. Create Key Vault manually in Azure Portal:" -ForegroundColor White
        Write-Host "     - Go to portal.azure.com → Create Resource → Key Vault" -ForegroundColor Gray
        Write-Host "     - Name: choose any unique name" -ForegroundColor Gray
        Write-Host "     - Resource Group: $secretsRgName" -ForegroundColor Gray
        Write-Host "     - Region: westeurope (or any available)" -ForegroundColor Gray
        Write-Host "     - Then add secrets: postgres-admin-password, jwt-secret-key" -ForegroundColor Gray
        Write-Host "     - Update bicep/parameters/dev.parameters.json with the Key Vault ID" -ForegroundColor Gray
        Write-Host ""
        exit 1
    }
    
    # Wait for Key Vault to be ready
    Start-Sleep -Seconds 10
    
    # Generate PostgreSQL password (alphanumeric only for compatibility)
    Write-Host "Generating PostgreSQL admin password..." -ForegroundColor Yellow
    $postgresPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    
    $maxRetries = 3
    $retryCount = 0
    while ($retryCount -lt $maxRetries) {
        try {
            az keyvault secret set --vault-name $secretsKvName --name "postgres-admin-password" --value $postgresPassword 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) { break }
        }
        catch {
            $retryCount++
            Start-Sleep -Seconds 5
        }
    }
    
    # Generate JWT secret
    Write-Host "Generating JWT secret key..." -ForegroundColor Yellow
    $bytes = New-Object byte[] 64
    $rng = [Security.Cryptography.RNGCryptoServiceProvider]::Create()
    $rng.GetBytes($bytes)
    $jwtSecret = [Convert]::ToBase64String($bytes)
    
    $retryCount = 0
    while ($retryCount -lt $maxRetries) {
        try {
            az keyvault secret set --vault-name $secretsKvName --name "jwt-secret-key" --value $jwtSecret 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) { break }
        }
        catch {
            $retryCount++
            Start-Sleep -Seconds 5
        }
    }
    
    Write-Host "✓ Secrets Key Vault created and secrets generated" -ForegroundColor Green
    Write-Host "  Key Vault name: $secretsKvName" -ForegroundColor Gray
}
Write-Host ""

# Update parameter file with subscription ID
$paramFile = "bicep/parameters/dev.parameters.json"
Write-Host "Updating parameter file with subscription ID..." -ForegroundColor Yellow
$params = Get-Content $paramFile | ConvertFrom-Json
$subscriptionId = $currentSub.Id
$kvId = "/subscriptions/$subscriptionId/resourceGroups/$secretsRgName/providers/Microsoft.KeyVault/vaults/$secretsKvName"
$params.parameters.postgresAdminPassword.reference.keyVault.id = $kvId
$params.parameters.jwtSecretKey.reference.keyVault.id = $kvId
$params | ConvertTo-Json -Depth 10 | Set-Content $paramFile
Write-Host "✓ Parameter file updated" -ForegroundColor Green
Write-Host ""

# Validate Bicep template
Write-Host "Validating Bicep template..." -ForegroundColor Yellow
$validationResult = az deployment group validate `
    --resource-group $ResourceGroupName `
    --template-file bicep/main.bicep `
    --parameters @bicep/parameters/dev.parameters.json `
    2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Template validation failed" -ForegroundColor Red
    Write-Host $validationResult -ForegroundColor Red
    exit 1
}
Write-Host "✓ Template validation passed" -ForegroundColor Green
Write-Host ""

# Deploy infrastructure
Write-Host "Deploying infrastructure... (this may take 15-20 minutes)" -ForegroundColor Yellow
Write-Host ""
az deployment group create `
    --resource-group $ResourceGroupName `
    --template-file bicep/main.bicep `
    --parameters @bicep/parameters/dev.parameters.json `
    --name "sunnyseat-dev-$(Get-Date -Format 'yyyyMMdd-HHmmss')" `
    --output json | Tee-Object -Variable deploymentOutput

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Deployment failed" -ForegroundColor Red
    exit 1
}

# Parse outputs
$outputs = ($deploymentOutput | ConvertFrom-Json).properties.outputs

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Deployment Successful!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Infrastructure Details:" -ForegroundColor Cyan
Write-Host "  Frontend URL: $($outputs.frontendUrl.value)" -ForegroundColor White
Write-Host "  Static Web App: $($outputs.staticWebAppName.value)" -ForegroundColor White
Write-Host "  API URL: https://$($outputs.apiUrl.value)" -ForegroundColor White
Write-Host "  Database Host: $($outputs.databaseHost.value)" -ForegroundColor White
Write-Host "  Redis Host: $($outputs.redisHost.value)" -ForegroundColor White
Write-Host "  Key Vault: $($outputs.keyVaultName.value)" -ForegroundColor White
Write-Host "  Storage Website: $($outputs.storageWebsiteUrl.value)" -ForegroundColor White
Write-Host "  Container Registry: $($outputs.containerRegistryLoginServer.value)" -ForegroundColor White
Write-Host "  App Insights Connection: (available in outputs)" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Next Steps for Story 5.1:" -ForegroundColor Cyan
Write-Host "  1. Get Static Web Apps deployment token:" -ForegroundColor Yellow
Write-Host "     az staticwebapp secrets list --name $($outputs.staticWebAppName.value) --resource-group $ResourceGroupName --query properties.apiKey -o tsv" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Get Application Insights connection string:" -ForegroundColor Yellow
Write-Host "     Already in outputs: $($outputs.appInsightsConnectionString.value)" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Add GitHub Secrets (see Story 5.1 checklist step 4)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  4. Update .env.production with deployment URLs" -ForegroundColor Yellow
Write-Host ""
Write-Host "  5. Deploy frontend:" -ForegroundColor Yellow
Write-Host "     cd src/frontend/admin && npm install && npm run build" -ForegroundColor Gray
Write-Host "     az staticwebapp upload --name $($outputs.staticWebAppName.value) --resource-group $ResourceGroupName" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed instructions, see: docs/stories/5.1.manual-setup-checklist.md" -ForegroundColor Cyan
Write-Host "For deployment guide, see: docs/ops/DEPLOYMENT-GUIDE.md" -ForegroundColor Cyan
Write-Host ""
