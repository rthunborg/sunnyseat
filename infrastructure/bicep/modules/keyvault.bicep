// Azure Key Vault Module
// Creates Key Vault for secure secret storage

@description('Azure region')
param location string

@description('Environment name')
param environment string

@description('Key Vault name')
param keyVaultName string

@description('Enable for deployment')
param enabledForDeployment bool = true

@description('Resource tags')
param tags object = {}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enabledForDeployment: enabledForDeployment
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enableSoftDelete: environment == 'prod'
    softDeleteRetentionInDays: environment == 'prod' ? 90 : 7
    enableRbacAuthorization: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

output keyVaultId string = keyVault.id
output keyVaultName string = keyVault.name
output vaultUri string = keyVault.properties.vaultUri
