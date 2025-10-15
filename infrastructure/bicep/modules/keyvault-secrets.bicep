// Key Vault Secrets Module
// Stores secrets in Azure Key Vault

@description('Key Vault name')
param keyVaultName string

@description('Array of secrets to store')
param secrets array = []

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

@batchSize(1)
resource secret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = [
  for item in secrets: {
    parent: keyVault
    name: item.name
    properties: {
      value: item.value
    }
  }
]

output secretNames array = [for i in range(0, length(secrets)): secrets[i].name]
