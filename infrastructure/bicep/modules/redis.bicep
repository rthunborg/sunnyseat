// Azure Cache for Redis Module
// Creates Redis cache instance for application caching

@description('Azure region')
param location string

@description('Environment name')
param environment string

@description('Redis cache name')
param redisName string

@description('SKU name (Basic, Standard, Premium)')
param skuName string = 'Basic'

@description('SKU family (C for Basic/Standard, P for Premium)')
param skuFamily string = 'C'

@description('SKU capacity (0-6 depending on family)')
param skuCapacity int = 0

@description('Subnet ID for private networking (Premium only)')
param subnetId string = ''

@description('Resource tags')
param tags object = {}

resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: redisName
  location: location
  tags: tags
  properties: {
    sku: {
      name: skuName
      family: skuFamily
      capacity: skuCapacity
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
    }
    redisVersion: '6'
  }
}

output redisId string = redis.id
output hostName string = redis.properties.hostName
output sslPort int = redis.properties.sslPort
output primaryKey string = redis.listKeys().primaryKey
output connectionString string = '${redis.properties.hostName}:${redis.properties.sslPort},password=${redis.listKeys().primaryKey},ssl=True,abortConnect=False'
