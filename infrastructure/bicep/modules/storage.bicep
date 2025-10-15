// Storage Account Module
// Creates storage account with static website hosting for frontend

@description('Azure region')
param location string

@description('Environment name')
param environment string

@description('Storage account name (must be globally unique, 3-24 chars, lowercase alphanumeric)')
param storageAccountName string

@description('Enable static website hosting')
param enableStaticWebsite bool = true

@description('Resource tags')
param tags object = {}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: environment == 'prod' ? 'Standard_GRS' : 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: true
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    encryption: {
      services: {
        blob: {
          enabled: true
        }
        file: {
          enabled: true
        }
      }
      keySource: 'Microsoft.Storage'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = if (enableStaticWebsite) {
  parent: storageAccount
  name: 'default'
  properties: {
    cors: {
      corsRules: [
        {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'HEAD', 'OPTIONS']
          maxAgeInSeconds: 3600
          exposedHeaders: ['*']
          allowedHeaders: ['*']
        }
      ]
    }
  }
}

resource staticWebsite 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = if (enableStaticWebsite) {
  parent: blobService
  name: '$web'
  properties: {
    publicAccess: 'Blob'
  }
}

output storageAccountId string = storageAccount.id
output storageAccountName string = storageAccount.name
output primaryEndpoints object = storageAccount.properties.primaryEndpoints
output staticWebsiteUrl string = enableStaticWebsite ? storageAccount.properties.primaryEndpoints.web : ''
