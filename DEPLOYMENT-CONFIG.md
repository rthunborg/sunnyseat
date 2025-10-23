# SunnySeat Deployment Configuration

## Azure Resources Created

### PostgreSQL Database

- **Server**: sunnyseat-dev-psql.postgres.database.azure.com
- **Database**: sunnyseat_dev
- **Username**: sunnyseataadmin
- **Password**: [STORED IN AZURE KEY VAULT OR LOCAL CONFIG]
- **Connection String**:

```
Host=sunnyseat-dev-psql.postgres.database.azure.com;Database=sunnyseat_dev;Username=sunnyseataadmin;Password=[YOUR_PASSWORD];SSL Mode=Require
```

### Redis Cache

- **Host**: sunnyseat-dev-redis.redis.cache.windows.net
- **SSL Port**: 6380
- **Primary Key**: [STORED IN AZURE KEY VAULT OR LOCAL CONFIG]
- **Connection String**:

```
sunnyseat-dev-redis.redis.cache.windows.net:6380,password=[YOUR_REDIS_KEY],ssl=True,abortConnect=False
```

### Storage Account (Frontend)

- **Admin Frontend Storage Name**: ssdevstorage4323
- **Admin Frontend URL**: https://ssdevstorage4323.z1.web.core.windows.net/
- **Public Frontend Storage Name**: sspublicstorage4323
- **Public Frontend URL**: https://sspublicstorage4323.z1.web.core.windows.net/

### Container App (Backend API)

- **Name**: sunnyseat-dev-api
- **URL**: https://sunnyseat-dev-api.wonderfulforest-63b21830.swedencentral.azurecontainerapps.io

### Application Insights

- **Connection String**: InstrumentationKey=709013f2-4736-43a5-8eeb-37bccb249bd0;IngestionEndpoint=https://swedencentral-0.in.applicationinsights.azure.com/;LiveEndpoint=https://swedencentral.livediagnostics.monitor.azure.com/;ApplicationId=70568c89-fc8b-4237-a382-423a8508e570

### API Keys

- **OpenWeatherMap**: [STORED IN AZURE KEY VAULT OR LOCAL CONFIG]
- **JWT Secret**: [STORED IN AZURE KEY VAULT OR LOCAL CONFIG]

---

## Next Steps

See DEPLOYMENT-STEPS.md for detailed deployment instructions.
