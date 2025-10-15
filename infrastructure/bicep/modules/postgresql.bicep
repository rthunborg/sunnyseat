// PostgreSQL Flexible Server Module
// Creates PostgreSQL database with PostGIS extension enabled

@description('Azure region')
param location string

@description('Environment name')
param environment string

@description('PostgreSQL server name')
param serverName string

@description('Database name')
param databaseName string

@description('PostgreSQL admin username')
@secure()
param administratorLogin string

@description('PostgreSQL admin password')
@secure()
param administratorPassword string

@description('Enable PostGIS extension')
param enablePostGIS bool = true

@description('SKU name')
param skuName string = 'Standard_B1ms'

@description('Enable high availability')
param highAvailability bool = false

@description('Subnet ID for private networking')
param subnetId string

@description('Resource tags')
param tags object = {}

// Determine tier from SKU name
var tier = startsWith(skuName, 'Burstable')
  ? 'Burstable'
  : (startsWith(skuName, 'Standard') ? 'GeneralPurpose' : 'MemoryOptimized')

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: serverName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: tier
  }
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    version: '15'
    storage: {
      storageSizeGB: environment == 'prod' ? 128 : 32
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: environment == 'prod' ? 30 : 7
      geoRedundantBackup: environment == 'prod' ? 'Enabled' : 'Disabled'
    }
    highAvailability: highAvailability
      ? {
          mode: 'ZoneRedundant'
          standbyAvailabilityZone: ''
        }
      : {
          mode: 'Disabled'
        }
    network: {
      delegatedSubnetResourceId: subnetId
      privateDnsZoneArmResourceId: privateDnsZone.id
    }
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
  }
}

// Private DNS Zone for PostgreSQL
resource privateDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: '${serverName}.private.postgres.database.azure.com'
  location: 'global'
  tags: tags
}

// Database
resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresServer
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Enable PostGIS and related extensions
resource postgisExtension 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-03-01-preview' = if (enablePostGIS) {
  parent: postgresServer
  name: 'azure.extensions'
  properties: {
    value: 'POSTGIS,POSTGIS_TOPOLOGY,POSTGIS_RASTER,UUID-OSSP'
    source: 'user-override'
  }
}

// Firewall rule to allow Azure services
resource firewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-03-01-preview' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

output serverId string = postgresServer.id
output fullyQualifiedDomainName string = postgresServer.properties.fullyQualifiedDomainName
output databaseName string = database.name
output serverName string = postgresServer.name
