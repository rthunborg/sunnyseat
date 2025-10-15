// Virtual Network Module
// Creates VNet with subnets for Container Apps, Database, and Redis

@description('Azure region')
param location string

@description('Environment name')
param environment string

@description('Virtual Network name')
param vnetName string

@description('Resource tags')
param tags object = {}

var addressPrefix = '10.0.0.0/16'
var containerAppsSubnetPrefix = '10.0.0.0/23' // /23 = 512 IPs required for Container Apps
var databaseSubnetPrefix = '10.0.2.0/24'
var redisSubnetPrefix = '10.0.3.0/24'

resource vnet 'Microsoft.Network/virtualNetworks@2023-05-01' = {
  name: vnetName
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        addressPrefix
      ]
    }
    subnets: [
      {
        name: 'container-apps-subnet'
        properties: {
          addressPrefix: containerAppsSubnetPrefix
          delegations: []
          serviceEndpoints: [
            {
              service: 'Microsoft.KeyVault'
            }
            {
              service: 'Microsoft.Storage'
            }
          ]
        }
      }
      {
        name: 'database-subnet'
        properties: {
          addressPrefix: databaseSubnetPrefix
          delegations: [
            {
              name: 'Microsoft.DBforPostgreSQL/flexibleServers'
              properties: {
                serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers'
              }
            }
          ]
          serviceEndpoints: []
        }
      }
      {
        name: 'redis-subnet'
        properties: {
          addressPrefix: redisSubnetPrefix
          delegations: []
          serviceEndpoints: []
        }
      }
    ]
  }
}

output vnetId string = vnet.id
output vnetName string = vnet.name
output containerAppsSubnetId string = vnet.properties.subnets[0].id
output databaseSubnetId string = vnet.properties.subnets[1].id
output redisSubnetId string = vnet.properties.subnets[2].id
