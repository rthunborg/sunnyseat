// Container App Module
// Creates Azure Container App for API hosting

@description('Azure region')
param location string

@description('Environment name')
param environment string

@description('Container App name')
param containerAppName string

@description('Container Apps Environment ID')
param containerAppsEnvironmentId string

@description('Container image (e.g., myregistry.azurecr.io/app:tag)')
param containerImage string

@description('Container registry server')
param containerRegistryServer string

@description('Key Vault name for secrets')
param keyVaultName string

@description('Application Insights connection string')
param appInsightsConnectionString string

@description('Database connection string')
@secure()
param databaseConnectionString string

@description('Redis connection string')
@secure()
param redisConnectionString string

@description('JWT secret key')
@secure()
param jwtSecretKey string

@description('OpenWeatherMap API key')
@secure()
param openWeatherMapApiKey string = ''

@description('CORS allowed origins')
param corsAllowedOrigins array = []

@description('Minimum replicas')
param minReplicas int = 1

@description('Maximum replicas')
param maxReplicas int = 3

@description('Resource tags')
param tags object = {}

resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'http'
        allowInsecure: false
        corsPolicy: {
          allowedOrigins: corsAllowedOrigins
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
          allowedHeaders: ['*']
          allowCredentials: true
        }
      }
      registries: [
        {
          server: containerRegistryServer
          identity: 'system'
        }
      ]
      secrets: [
        {
          name: 'db-connection-string'
          value: databaseConnectionString
        }
        {
          name: 'redis-connection-string'
          value: redisConnectionString
        }
        {
          name: 'jwt-secret-key'
          value: jwtSecretKey
        }
        {
          name: 'openweathermap-api-key'
          value: openWeatherMapApiKey
        }
        {
          name: 'appinsights-connection-string'
          value: appInsightsConnectionString
        }
      ]
    }
    template: {
      containers: [
        {
          name: containerAppName
          image: containerImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'ASPNETCORE_ENVIRONMENT'
              value: environment == 'prod' ? 'Production' : 'Development'
            }
            {
              name: 'ConnectionStrings__DefaultConnection'
              secretRef: 'db-connection-string'
            }
            {
              name: 'ConnectionStrings__Redis'
              secretRef: 'redis-connection-string'
            }
            {
              name: 'Jwt__SecretKey'
              secretRef: 'jwt-secret-key'
            }
            {
              name: 'Weather__OpenWeatherMapApiKey'
              secretRef: 'openweathermap-api-key'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              secretRef: 'appinsights-connection-string'
            }
            {
              name: 'Jwt__Issuer'
              value: 'SunnySeat.Api'
            }
            {
              name: 'Jwt__Audience'
              value: 'SunnySeat.Admin'
            }
            {
              name: 'Jwt__ExpirationMinutes'
              value: '480'
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}

output containerAppId string = containerApp.id
output fqdn string = containerApp.properties.configuration.ingress.fqdn
output principalId string = containerApp.identity.principalId
