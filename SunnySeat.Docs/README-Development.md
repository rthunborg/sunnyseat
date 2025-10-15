# SunnySeat Local Development Environment

This document describes how to set up and run the SunnySeat development environment using Docker.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v2+ installed
- Git for version control

## Quick Start

1. **Clone the repository** (if not already done):

   ```bash
   git clone <repository-url>
   cd SunnySeat
   ```

2. **Start the development environment**:

   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

3. **Verify services are running**:
   - API: http://localhost:5000
   - API Health Check: http://localhost:5000/health
   - Database Health: http://localhost:5000/health/database
   - Swagger UI: http://localhost:5000/swagger
   - PostgreSQL: localhost:5432 (postgres/postgres)
   - Redis: localhost:6379

## Services

### PostgreSQL with PostGIS

- **Image**: `postgis/postgis:15-3.4`
- **Database**: `sunnyseat_dev`
- **User/Password**: `postgres/postgres`
- **Port**: `5432`
- **Extensions**: PostGIS, PostGIS Topology, PostGIS Raster
- **Data Persistence**: Docker volume `postgres_data`

### Redis Cache

- **Image**: `redis:7-alpine`
- **Port**: `6379`
- **Data Persistence**: Docker volume `redis_data`

### SunnySeat API

- **Framework**: .NET 8 Minimal API
- **Port**: `5000`
- **Hot Reload**: Enabled with `dotnet watch`
- **Environment**: Development

## Database Management

### Running Migrations

```bash
# From the API container
docker-compose -f docker-compose.dev.yml exec api dotnet ef database update --project src/backend/SunnySeat.Api

# Or from host (requires .NET SDK)
cd src/backend/SunnySeat.Api
dotnet ef database update
```

### Creating New Migrations

```bash
# From the API container
docker-compose -f docker-compose.dev.yml exec api dotnet ef migrations add <MigrationName> --project src/backend/SunnySeat.Api

# Or from host
cd src/backend/SunnySeat.Api
dotnet ef migrations add <MigrationName>
```

### Database Access

```bash
# Connect to PostgreSQL
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d sunnyseat_dev

# Basic PostGIS verification
SELECT PostGIS_Version();
```

## Development Workflow

### Hot Reload

The API container uses `dotnet watch` for automatic recompilation when source files change. Simply edit your code and the application will restart automatically.

### Debugging

1. **Logs**: `docker-compose -f docker-compose.dev.yml logs -f api`
2. **Container Shell**: `docker-compose -f docker-compose.dev.yml exec api bash`
3. **Database Shell**: `docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d sunnyseat_dev`

### Stopping Services

```bash
# Stop all services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (WARNING: Deletes database data)
docker-compose -f docker-compose.dev.yml down -v
```

## Health Checks

All services include health checks:

- **PostgreSQL**: `pg_isready` command
- **Redis**: `redis-cli ping` command
- **API**: Custom health endpoints

Check service health:

```bash
docker-compose -f docker-compose.dev.yml ps
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**:

   ```bash
   # Check what's using port 5432 or 5000
   netstat -an | findstr :5432
   netstat -an | findstr :5000
   ```

2. **Database Connection Errors**:

   - Ensure PostgreSQL health check passes
   - Verify connection string in `appsettings.Development.json`
   - Check container logs: `docker-compose -f docker-compose.dev.yml logs postgres`

3. **PostGIS Extension Errors**:

   - Verify initialization script ran: Check postgres logs
   - Manually connect and run: `CREATE EXTENSION postgis;`

4. **API Build Errors**:

   - Check container logs: `docker-compose -f docker-compose.dev.yml logs api`
   - Rebuild containers: `docker-compose -f docker-compose.dev.yml up --build --force-recreate`

5. **Hot Reload Not Working**:
   - Verify file watcher environment variables are set
   - Check that source code is properly mounted as volume

### Resetting Environment

```bash
# Complete reset (deletes all data)
docker-compose -f docker-compose.dev.yml down -v --remove-orphans
docker-compose -f docker-compose.dev.yml up --build --force-recreate
```

### Performance Tuning

- **PostgreSQL**: Adjust shared memory settings in docker-compose.yml
- **API**: Configure Kestrel connection limits in appsettings
- **File Watching**: Use polling watcher on slower file systems

## Architecture Compliance

This development environment follows the architecture specifications:

- ✅ PostgreSQL 15 with PostGIS 3.4
- ✅ .NET 8 Minimal API
- ✅ Docker containerization
- ✅ Hot reload for development productivity
- ✅ Health checks for service monitoring
- ✅ Spatial data support with PostGIS
- ✅ Redis for future caching requirements

## Running Tests

### Unit Tests

```bash
# Run all unit tests
dotnet test --filter "Category=Unit"

# Run specific test project
dotnet test src/backend/SunnySeat.Core.Tests
dotnet test src/backend/SunnySeat.Api.Tests

# Run with coverage
dotnet test --collect:"XPlat Code Coverage" --settings coverlet.runsettings
```

### Integration Tests

```bash
# Requires Docker for TestContainers
dotnet test tests/SunnySeat.Integration.Tests

# Run specific test class
dotnet test --filter "FullyQualifiedName~WeatherEnhancedTimelineIntegrationTests"
```

### Performance Benchmarks

```bash
# Navigate to benchmarks project
cd tests/SunnySeat.Performance.Benchmarks

# Run benchmarks (always use Release configuration)
dotnet run -c Release
```

### Test Documentation

See [TEST-GUIDE-WEATHER-APIS.md](./docs/TEST-GUIDE-WEATHER-APIS.md) for comprehensive testing documentation including:

- Test scenarios and expected results
- Coverage metrics
- Troubleshooting guide
- CI/CD integration

## Security Notes

**Development Only**: This setup uses default passwords and is not suitable for production. For production deployment, use:

- Strong, unique passwords
- Encrypted connections
- Secret management systems
- Network segmentation
