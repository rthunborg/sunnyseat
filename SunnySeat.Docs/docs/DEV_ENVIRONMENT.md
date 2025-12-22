# SunnySeat Local Development Environment

This guide covers setting up the complete SunnySeat development environment for the Next.js/Supabase stack.

## Prerequisites

- **Node.js** 18+ and npm
- **Supabase CLI** (optional - for local Supabase)
- **Git**

## Quick Start

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd SunnySeat
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Start the development server:**

   ```bash
   npm run dev
   ```

5. **Access the application:**
   - Application: http://localhost:3000
   - API Routes: http://localhost:3000/api/\*
   - Database: Managed via Supabase (cloud or local)

## Services

### Supabase Database

- **Hosting**: Supabase Cloud (or local with Supabase CLI)
- **Database**: PostgreSQL with PostGIS
- **PostGIS Extensions**: Enabled automatically
- **Connection**: Via Supabase client library

**Local Supabase (Optional):**

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Access local Supabase dashboard
# URL will be shown in terminal output
```

### Next.js Development Server

- **Port**: 3000
- **Hot Reload**: Automatic with Next.js
- **Environment**: Development
- **Features**: Server Components, API Routes, automatic code splitting

## Development Workflow

### Running Database Migrations

```bash
# Using Supabase CLI (if using local Supabase)
supabase db push

# Or apply migrations via Supabase Dashboard (cloud)
# Navigate to SQL Editor and run migration files
```

### Viewing Logs

```bash
# Next.js development server logs
# Logs appear in terminal where `npm run dev` is running

# Supabase logs (if using local Supabase)
supabase logs
```

### Environment Variables

Required environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
WEATHER_API_KEY=[weather-api-key]
```

### Building for Production

```bash
# Build the application
npm run build

# Start production server locally
npm start
```

docker-compose -f docker-compose.dev.yml logs -f postgres

````

### Hot Reload Development

The API container uses `dotnet watch` for automatic rebuilding when source files change. Simply edit files in `src/backend/` and the API will automatically restart.

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it sunnyseat-postgres psql -U postgres -d sunnyseat_dev

# Test PostGIS
SELECT PostGIS_Version();
SELECT ST_Distance(ST_Point(0,0), ST_Point(1,1));
````

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
