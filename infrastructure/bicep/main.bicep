// SunnySeat - Main Infrastructure Template
// Provisions complete Azure infrastructure for SunnySeat application

@description('Environment name (dev, staging, prod)')
param environment string = 'dev'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('PostgreSQL administrator username')
@secure()
param postgresAdminUsername string

@description('PostgreSQL administrator password')
@secure()
param postgresAdminPassword string

@description('JWT secret key for authentication')
@secure()
param jwtSecretKey string

@description('Weather API - OpenWeatherMap API Key')
@secure()
param openWeatherMapApiKey string = ''

@description('MapTiler API Key')
@secure()
param mapTilerApiKey string = ''

@description('Allowed CORS origins for API')
param corsAllowedOrigins array = []

@description('Tags to apply to all resources')
param tags object = {
  Environment: environment
  Application: 'SunnySeat'
  ManagedBy: 'Bicep'
}

// Generate unique suffix for globally unique resources
var uniqueSuffix = uniqueString(resourceGroup().id)
var namingPrefix = 'sunnyseat-${environment}'

// Virtual Network
module network 'modules/network.bicep' = {
  name: '${namingPrefix}-vnet-deployment'
  params: {
    location: location
    environment: environment
    vnetName: '${namingPrefix}-vnet'
    tags: tags
  }
}

// PostgreSQL Database with PostGIS
module database 'modules/postgresql.bicep' = {
  name: '${namingPrefix}-db-deployment'
  params: {
    location: location
    environment: environment
    serverName: '${namingPrefix}-psql-${uniqueSuffix}'
    administratorLogin: postgresAdminUsername
    administratorPassword: postgresAdminPassword
    databaseName: 'sunnyseat_${environment}'
    enablePostGIS: true
    skuName: environment == 'prod' ? 'Standard_D4s_v3' : 'Standard_B1ms'
    highAvailability: environment == 'prod'
    subnetId: network.outputs.databaseSubnetId
    tags: tags
  }
}

// Redis Cache
module redis 'modules/redis.bicep' = {
  name: '${namingPrefix}-redis-deployment'
  params: {
    location: location
    environment: environment
    redisName: '${namingPrefix}-redis-${uniqueSuffix}'
    skuName: environment == 'prod' ? 'Standard' : 'Basic'
    skuFamily: environment == 'prod' ? 'C' : 'C'
    skuCapacity: environment == 'prod' ? 1 : 0
    subnetId: network.outputs.redisSubnetId
    tags: tags
  }
}

// Key Vault for secrets
module keyVault 'modules/keyvault.bicep' = {
  name: '${namingPrefix}-kv-deployment'
  params: {
    location: location
    environment: environment
    keyVaultName: 'ss-kv-${uniqueSuffix}'
    enabledForDeployment: true
    tags: tags
  }
}

// Application Insights & Log Analytics
module monitoring 'modules/monitoring.bicep' = {
  name: '${namingPrefix}-monitoring-deployment'
  params: {
    location: location
    environment: environment
    logAnalyticsName: '${namingPrefix}-logs'
    appInsightsName: '${namingPrefix}-insights'
    tags: tags
  }
}

// Storage Account for static website (frontend)
module storage 'modules/storage.bicep' = {
  name: '${namingPrefix}-storage-deployment'
  params: {
    location: location
    environment: environment
    storageAccountName: 'ss${environment}${uniqueSuffix}'
    enableStaticWebsite: true
    tags: tags
  }
}

// Azure Static Web App for frontend hosting
module staticWebApp 'modules/static-web-app.bicep' = {
  name: '${namingPrefix}-swa-deployment'
  params: {
    location: location
    staticWebAppName: '${namingPrefix}-frontend'
    skuName: environment == 'prod' ? 'Standard' : 'Free'
    repositoryUrl: '' // Set via GitHub Actions or manual deployment
    branch: 'main'
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    appLocation: '/src/frontend/admin'
    apiLocation: ''
    outputLocation: 'dist'
    tags: tags
  }
}

// Container Registry for Docker images
module containerRegistry 'modules/container-registry.bicep' = {
  name: '${namingPrefix}-acr-deployment'
  params: {
    location: location
    environment: environment
    registryName: 'sunnyseat${environment}${uniqueSuffix}'
    skuName: environment == 'prod' ? 'Standard' : 'Basic'
    tags: tags
  }
}

// Container Apps Environment
module containerAppsEnv 'modules/container-apps-environment.bicep' = {
  name: '${namingPrefix}-caenv-deployment'
  params: {
    location: location
    environment: environment
    environmentName: '${namingPrefix}-caenv'
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
    subnetId: network.outputs.containerAppsSubnetId
    tags: tags
  }
}

// API Container App
module apiContainerApp 'modules/container-app.bicep' = {
  name: '${namingPrefix}-api-deployment'
  params: {
    location: location
    environment: environment
    containerAppName: '${namingPrefix}-api'
    containerAppsEnvironmentId: containerAppsEnv.outputs.environmentId
    containerImage: '${containerRegistry.outputs.loginServer}/sunnyseat-api:latest'
    containerRegistryServer: containerRegistry.outputs.loginServer
    keyVaultName: keyVault.outputs.keyVaultName
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    databaseConnectionString: 'Host=${database.outputs.fullyQualifiedDomainName};Database=${database.outputs.databaseName};Username=${postgresAdminUsername};Password=${postgresAdminPassword};SSL Mode=Require'
    redisConnectionString: '${redis.outputs.hostName}:${redis.outputs.sslPort},password=${redis.outputs.primaryKey},ssl=True,abortConnect=False'
    jwtSecretKey: jwtSecretKey
    openWeatherMapApiKey: openWeatherMapApiKey
    corsAllowedOrigins: corsAllowedOrigins
    minReplicas: environment == 'prod' ? 2 : 1
    maxReplicas: environment == 'prod' ? 10 : 3
    tags: tags
  }
}

// Store secrets in Key Vault
module secrets 'modules/keyvault-secrets.bicep' = {
  name: '${namingPrefix}-secrets-deployment'
  params: {
    keyVaultName: keyVault.outputs.keyVaultName
    secrets: [
      {
        name: 'ConnectionStrings--DefaultConnection'
        value: 'Host=${database.outputs.fullyQualifiedDomainName};Database=${database.outputs.databaseName};Username=${postgresAdminUsername};Password=${postgresAdminPassword};SSL Mode=Require'
      }
      {
        name: 'ConnectionStrings--Redis'
        value: '${redis.outputs.hostName}:${redis.outputs.sslPort},password=${redis.outputs.primaryKey},ssl=True,abortConnect=False'
      }
      {
        name: 'JwtOptions--SecretKey'
        value: jwtSecretKey
      }
      {
        name: 'WeatherApi--OpenWeatherMap--ApiKey'
        value: openWeatherMapApiKey
      }
      {
        name: 'MapTiler--ApiKey'
        value: mapTilerApiKey
      }
    ]
  }
}

// Outputs
output apiUrl string = apiContainerApp.outputs.fqdn
output frontendUrl string = staticWebApp.outputs.staticWebAppUrl
output staticWebAppName string = staticWebApp.outputs.staticWebAppName
output databaseHost string = database.outputs.fullyQualifiedDomainName
output databaseName string = database.outputs.databaseName
output redisHost string = redis.outputs.hostName
output keyVaultUri string = keyVault.outputs.vaultUri
output keyVaultName string = keyVault.outputs.keyVaultName
output storageWebsiteUrl string = storage.outputs.staticWebsiteUrl
output containerRegistryLoginServer string = containerRegistry.outputs.loginServer
output appInsightsInstrumentationKey string = monitoring.outputs.appInsightsInstrumentationKey
output appInsightsConnectionString string = monitoring.outputs.appInsightsConnectionString
output resourceGroupName string = resourceGroup().name
