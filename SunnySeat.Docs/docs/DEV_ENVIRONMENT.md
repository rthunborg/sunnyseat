# SunnySeat Local Development Environment

This guide covers setting up the complete SunnySeat development environment using Docker.

## Prerequisites

- Docker Desktop with Docker Compose V2
- .NET 8.0 SDK (optional - if running outside containers)
- Git

## Quick Start

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd SunnySeat
   ```

2. **Start the development environment:**

   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Verify services are running:**

   ```bash
   docker-compose -f docker-compose.dev.yml ps
   ```

4. **Access the application:**
   - API: http://localhost:5000
   - API Documentation (Swagger): http://localhost:5000/swagger
   - Database: localhost:5432 (postgres/postgres)
   - Redis: localhost:6379

## Services

### PostgreSQL + PostGIS Database

- **Container**: `sunnyseat-postgres`
- **Image**: `postgis/postgis:15-3.4`
- **Port**: 5432
- **Database**: `sunnyseat_dev`
- **Username**: `postgres`
- **Password**: `postgres`

**PostGIS Extensions Enabled:**

- `postgis` - Core spatial functionality
- `postgis_topology` - Topology support
- `postgis_raster` - Raster data support

### Redis Cache

- **Container**: `sunnyseat-redis`
- **Image**: `redis:7-alpine`
- **Port**: 6379
- **Usage**: Application caching (future feature)

### SunnySeat API

- **Container**: `sunnyseat-api`
- **Port**: 5000
- **Hot Reload**: Enabled with `dotnet watch`
- **Environment**: Development

## Development Workflow

### Running Migrations

```bash
# Run from host machine (requires .NET 9 SDK)
dotnet ef database update --project src/backend/SunnySeat.Data --startup-project src/backend/SunnySeat.Api

# Or run inside the API container
docker exec -it sunnyseat-api dotnet ef database update --project src/backend/SunnySeat.Data
```

### Viewing Logs

```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f api
docker-compose -f docker-compose.dev.yml logs -f postgres
```

### Hot Reload Development

The API container uses `dotnet watch` for automatic rebuilding when source files change. Simply edit files in `src/backend/` and the API will automatically restart.

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it sunnyseat-postgres psql -U postgres -d sunnyseat_dev

# Test PostGIS
SELECT PostGIS_Version();
SELECT ST_Distance(ST_Point(0,0), ST_Point(1,1));
```

### Redis Access

```bash
# Connect to Redis CLI
docker exec -it sunnyseat-redis redis-cli

# Test Redis
redis-cli ping
```

## Environment Variables

### API Container

- `ASPNETCORE_ENVIRONMENT=Development`
- `ASPNETCORE_URLS=http://+:5000`
- `ConnectionStrings__DefaultConnection=Host=postgres;Database=sunnyseat_dev;Username=postgres;Password=postgres`

### Database Container

- `POSTGRES_DB=sunnyseat_dev`
- `POSTGRES_USER=postgres`
- `POSTGRES_PASSWORD=postgres`

## Troubleshooting

### Services Won't Start

1. Check if ports are available:

   ```bash
   netstat -an | findstr "5000 5432 6379"
   ```

2. View service logs:

   ```bash
   docker-compose -f docker-compose.dev.yml logs
   ```

3. Restart services:
   ```bash
   docker-compose -f docker-compose.dev.yml down
   docker-compose -f docker-compose.dev.yml up -d
   ```

### Database Connection Issues

1. Verify PostgreSQL is ready:

   ```bash
   docker exec sunnyseat-postgres pg_isready -U postgres -d sunnyseat_dev
   ```

2. Check PostGIS extensions:
   ```bash
   docker exec -it sunnyseat-postgres psql -U postgres -d sunnyseat_dev -c "SELECT PostGIS_Version();"
   ```

### API Issues

1. Check if API is responding:

   ```bash
   curl http://localhost:5000/health
   ```

2. View API logs:
   ```bash
   docker logs sunnyseat-api -f
   ```

### Performance Issues

- **Database**: Ensure Docker Desktop has sufficient memory (8GB+ recommended)
- **Hot Reload**: Large file changes may take time to rebuild
- **Spatial Queries**: PostGIS spatial indexes are created during initialization

## Cleanup

### Stop Services

```bash
docker-compose -f docker-compose.dev.yml down
```

### Remove Volumes (WARNING: Deletes all data)

```bash
docker-compose -f docker-compose.dev.yml down -v
```

### Clean Docker System

```bash
docker system prune -a
```

## Next Steps

After the environment is running:

1. Run database migrations
2. Verify health check endpoint: `GET /health`
3. Access Swagger documentation: http://localhost:5000/swagger
4. Begin implementing features according to user stories

For production deployment, see `infrastructure/` directory for Azure deployment templates.
