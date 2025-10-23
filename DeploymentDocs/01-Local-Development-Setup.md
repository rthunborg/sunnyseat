# Local Development Setup

This guide walks you through setting up the SunnySeat application for local development.

## Prerequisites

-  Windows 10/11 with PowerShell 7+
-  .NET 8 SDK
-  Node.js 18+ and npm
-  PostgreSQL 14+ (or Docker Desktop to run PostgreSQL in container)
-  Git
-  Visual Studio Code (recommended) or Visual Studio 2022

## Quick Start (Recommended)

### Option 1: Using Docker Compose (Easiest)

```powershell
# Navigate to project root
cd D:\SunnySeat

# Start all services (API, PostgreSQL, Redis)
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Access the application
# API: http://localhost:5000
# Swagger: http://localhost:5000/swagger
# PostgreSQL: localhost:5432
```

**Stop services:**
```powershell
docker-compose -f docker-compose.dev.yml down
```

### Option 2: Running Services Individually

#### Step 1: Set Up PostgreSQL

**With Docker:**
```powershell
docker run --name sunnyseat-postgres `
  -e POSTGRES_PASSWORD=YourPassword123! `
  -e POSTGRES_DB=sunnyseat_dev `
  -p 5432:5432 `
  -d postgis/postgis:14-3.3
```

**With Local PostgreSQL:**
1. Install PostgreSQL 14+ with PostGIS extension
2. Create database: `CREATE DATABASE sunnyseat_dev;`
3. Enable PostGIS: `CREATE EXTENSION postgis;`

#### Step 2: Configure Connection String

Create/update `src/backend/SunnySeat.Api/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=sunnyseat_dev;Username=postgres;Password=YourPassword123!"
  },
  "Jwt": {
    "SecretKey": "your-development-secret-key-min-32-characters",
    "Issuer": "SunnySeat.Dev",
    "Audience": "SunnySeat.Admin",
    "ExpirationMinutes": 480,
    "RefreshTokenExpirationDays": 7
  }
}
```

#### Step 3: Run Database Migrations

```powershell
cd D:\SunnySeat\src\backend\SunnySeat.Api

# Apply migrations
dotnet ef database update

# Verify
dotnet ef migrations list
```

#### Step 4: Start the Backend API

```powershell
cd D:\SunnySeat\src\backend\SunnySeat.Api

# Run with hot reload
dotnet watch run

# Or run normally
dotnet run
```

**API will be available at:**
- HTTP: http://localhost:5000
- HTTPS: https://localhost:5001
- Swagger: http://localhost:5000/swagger

#### Step 5: Start Admin Frontend

```powershell
cd D:\SunnySeat\src\frontend\admin

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Admin UI will be available at:** http://localhost:5173

#### Step 6: Start Public Frontend

```powershell
cd D:\SunnySeat\src\frontend\public

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Public UI will be available at:** http://localhost:5174

## Development Workflow

### Hot Reload

- **Backend**: `dotnet watch run` automatically restarts on code changes
- **Admin Frontend**: Vite automatically reloads on file changes
- **Public Frontend**: Vite automatically reloads on file changes

### Debugging

**Backend (VS Code):**
1. Open project in VS Code
2. Press F5 or use "Run and Debug" panel
3. Select ".NET Core Launch (web)"

**Frontend (Browser DevTools):**
- Chrome/Edge: F12
- Source maps enabled by default in development

### Database Management

**View data:**
```powershell
# Using psql
psql -h localhost -U postgres -d sunnyseat_dev

# Common queries
\dt                  # List tables
SELECT * FROM venues;
SELECT * FROM patios;
```

**Reset database:**
```powershell
cd D:\SunnySeat\src\backend\SunnySeat.Api

# Drop database
dotnet ef database drop --force

# Recreate and migrate
dotnet ef database update
```

### Seed Development Data

```powershell
cd D:\SunnySeat\src\backend\SunnySeat.Api

# Seed venues (50+ Gothenburg venues)
dotnet run -- seed-venues

# Create sample patios with building data
dotnet run -- create-sample-patios
```

## Environment Variables

### Backend (.NET)

Edit `appsettings.Development.json`:
- Database connection strings
- JWT settings
- CORS origins
- External API keys (Weather, etc.)

### Admin Frontend (React)

Create `src/frontend/admin/.env.local`:
```env
VITE_API_URL=http://localhost:5000
VITE_ENABLE_MOCK_API=false
```

### Public Frontend (Vue)

Create `src/frontend/public/.env.local`:
```env
VITE_API_URL=http://localhost:5000
VITE_ENABLE_ANALYTICS=false
```

## Testing Locally

See [02-Testing-Locally.md](02-Testing-Locally.md) for comprehensive testing instructions.

## Common Issues

### Port Already in Use

**Backend (5000/5001):**
```powershell
# Find process using port
netstat -ano | findstr :5000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

**Frontend (5173/5174):**
```powershell
# Kill Node processes
taskkill /F /IM node.exe
```

### Database Connection Failed

1. Check PostgreSQL is running: `docker ps` or `pg_isready`
2. Verify connection string in `appsettings.Development.json`
3. Test connection: `psql -h localhost -U postgres -d sunnyseat_dev`

### PostGIS Extension Missing

```sql
-- Connect to database
psql -h localhost -U postgres -d sunnyseat_dev

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify
SELECT PostGIS_version();
```

### NuGet Restore Failed

```powershell
# Clear NuGet cache
dotnet nuget locals all --clear

# Restore packages
cd D:\SunnySeat
dotnet restore
```

### npm Install Failed

```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

## Next Steps

Once you have everything running locally:
1. Review [02-Testing-Locally.md](02-Testing-Locally.md) for testing
2. Try creating an admin user: [07-Authentication-Setup.md](07-Authentication-Setup.md)
3. Explore the API via Swagger: http://localhost:5000/swagger
4. Start developing features!

## Useful Commands Cheat Sheet

```powershell
# Backend
dotnet watch run                    # Run with hot reload
dotnet test                         # Run all tests
dotnet ef database update           # Apply migrations
dotnet ef migrations add MyMigration # Create new migration

# Frontend (Admin)
cd src/frontend/admin
npm run dev                         # Start dev server
npm run build                       # Build for production
npm run test                        # Run tests
npm run lint                        # Lint code

# Frontend (Public)
cd src/frontend/public
npm run dev                         # Start dev server
npm run build                       # Build for production
npm run preview                     # Preview production build

# Docker Compose
docker-compose -f docker-compose.dev.yml up -d    # Start all
docker-compose -f docker-compose.dev.yml logs -f   # View logs
docker-compose -f docker-compose.dev.yml down      # Stop all
docker-compose -f docker-compose.dev.yml down -v   # Stop and delete volumes
```

## Tips for Productive Development

1. **Use VS Code Extensions:**
   - C# Dev Kit
   - Volar (Vue)
   - ES7+ React/Redux/React-Native snippets
   - Prettier
   - ESLint

2. **Enable auto-save** in VS Code for instant feedback

3. **Use multiple terminals** to run backend + both frontends simultaneously

4. **Keep Swagger open** for API exploration while developing

5. **Use Git branches** for features: `git checkout -b feature/my-feature`
