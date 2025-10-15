// Azure Static Web Apps Module
// Provisions Static Web App for frontend hosting with GitHub integration

@description('Azure region')
param location string

@description('Static Web App name')
param staticWebAppName string

@description('SKU name (Free or Standard)')
@allowed([
  'Free'
  'Standard'
])
param skuName string = 'Free'

@description('GitHub repository URL (optional, for GitHub Actions integration)')
param repositoryUrl string = ''

@description('GitHub branch to deploy from')
param branch string = 'main'

@description('Application Insights connection string')
param appInsightsConnectionString string = ''

@description('App location in repository')
param appLocation string = '/src/frontend/admin'

@description('API location in repository (if applicable)')
param apiLocation string = ''

@description('Output location (build artifacts)')
param outputLocation string = 'dist'

@description('Resource tags')
param tags object = {}

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: skuName
  }
  properties: {
    repositoryUrl: repositoryUrl
    branch: branch
    buildProperties: {
      appLocation: appLocation
      apiLocation: apiLocation
      outputLocation: outputLocation
    }
    provider: 'GitHub'
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
  }
}

// Configure application settings (environment variables for build)
resource staticWebAppSettings 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    VITE_APPLICATIONINSIGHTS_CONNECTION_STRING: appInsightsConnectionString
    VITE_APP_URL: 'https://${staticWebApp.properties.defaultHostname}'
  }
}

// Custom domain configuration (optional - can be added later)
// Uncomment when you have a custom domain
// resource customDomain 'Microsoft.Web/staticSites/customDomains@2023-01-01' = {
//   parent: staticWebApp
//   name: 'sunnyseat.com'
//   properties: {}
// }

output staticWebAppId string = staticWebApp.id
output staticWebAppName string = staticWebApp.name
output defaultHostname string = staticWebApp.properties.defaultHostname
output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
// Note: Deployment token must be retrieved separately using Azure CLI:
// az staticwebapp secrets list --name <name> --resource-group <rg> --query properties.apiKey -o tsv
