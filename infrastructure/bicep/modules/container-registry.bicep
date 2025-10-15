// Azure Container Registry Module
// Creates container registry for Docker images

@description('Azure region')
param location string

@description('Environment name')
param environment string

@description('Container registry name (must be globally unique, 5-50 chars, alphanumeric)')
param registryName string

@description('SKU name (Basic, Standard, Premium)')
param skuName string = 'Basic'

@description('Resource tags')
param tags object = {}

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: registryName
  location: location
  tags: tags
  sku: {
    name: skuName
  }
  properties: {
    adminUserEnabled: true
    publicNetworkAccess: 'Enabled'
    zoneRedundancy: skuName == 'Premium' ? 'Enabled' : 'Disabled'
  }
}

output registryId string = containerRegistry.id
output loginServer string = containerRegistry.properties.loginServer
output registryName string = containerRegistry.name
