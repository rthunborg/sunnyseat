# Data Migration Scripts

This directory contains scripts for migrating data from Azure PostgreSQL to Supabase.

## Overview

The migration process consists of:

1. **Export** data from Azure PostgreSQL
2. **Import** data to Supabase
3. **Validate** data integrity

## Prerequisites

- PostgreSQL client tools (`pg_dump`, `psql`) installed
- Access to Azure PostgreSQL database
- Access to Supabase database
- Schema migration completed (Story 6.2)

## Scripts

### Export Scripts

- `export-data.sh` / `export-data.ps1` - Export all data from Azure PostgreSQL
- `get-row-counts.sh` / `get-row-counts.ps1` - Get row counts from source for comparison

### Import Scripts

- `import-data.sh` / `import-data.ps1` - Import exported data to Supabase

### Validation Scripts

- `validate-data.sql` - Comprehensive data validation script
- `test-small-dataset.sh` - Test migration with small dataset first

## Migration Process

### Step 1: Backup Source Database

**IMPORTANT**: Always create a backup before migration!

```bash
# Azure PostgreSQL backup
pg_dump --host=<azure-host> --dbname=<database> --username=<user> \
  --file=backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Get Source Row Counts

```bash
# Linux/Mac
./get-row-counts.sh

# Windows PowerShell
./get-row-counts.ps1
```

Save the output for comparison after migration.

### Step 3: Test with Small Dataset (Recommended)

```bash
# Test with small dataset first
./test-small-dataset.sh
```

Review the test export and validate before proceeding with full migration.

### Step 4: Export Data

```bash
# Linux/Mac
export AZURE_DB_HOST=your-azure-host.postgres.database.azure.com
export AZURE_DB_NAME=sunnyseat
export AZURE_DB_USER=your-username
./export-data.sh

# Windows PowerShell
$env:AZURE_DB_HOST = "your-azure-host.postgres.database.azure.com"
$env:AZURE_DB_NAME = "sunnyseat"
$env:AZURE_DB_USER = "your-username"
./export-data.ps1
```

This creates timestamped export files in the `./exports` directory.

### Step 5: Import Data

```bash
# Linux/Mac
export SUPABASE_DB_HOST=db.your-project.supabase.co
export SUPABASE_DB_NAME=postgres
export SUPABASE_DB_USER=postgres
./import-data.sh [timestamp]

# Windows PowerShell
$env:SUPABASE_DB_HOST = "db.your-project.supabase.co"
$env:SUPABASE_DB_NAME = "postgres"
$env:SUPABASE_DB_USER = "postgres"
./import-data.ps1 -Timestamp "latest"  # or specific timestamp
```

### Step 6: Validate Data

```bash
# Connect to Supabase and run validation
psql "postgresql://postgres:[password]@db.[project].supabase.co:6543/postgres" \
  --file=validate-data.sql
```

Or use Supabase SQL Editor to run `validate-data.sql`.

## Import Order

Data is imported in dependency order to respect foreign keys:

1. **Independent tables** (no foreign keys):
   - `venues`
   - `buildings`
   - `admin_users`
   - `weather_slices`
   - `precomputation_schedules`

2. **Dependent tables** (with foreign keys):
   - `patios` (FK: venues)
   - `venue_quality_metrics` (FK: venues)
   - `sun_windows` (FK: patios)
   - `feedback` (FK: patios, venues)
   - `processed_weather` (FK: weather_slices)
   - `precomputed_sun_exposure` (FK: patios)

## Validation Checks

The validation script (`validate-data.sql`) performs:

- ✅ **Row Count Validation** - Counts rows in all tables
- ✅ **Sample Data Validation** - Checks sample records
- ✅ **Spatial Data Validation** - Validates geometry/geography columns
- ✅ **Foreign Key Validation** - Verifies relationships
- ✅ **Spatial Query Test** - Tests PostGIS functions

## Troubleshooting

### Export Errors

- Verify Azure PostgreSQL connection credentials
- Check network connectivity
- Ensure `pg_dump` is installed and in PATH
- Verify table names match exactly

### Import Errors

- Verify Supabase connection credentials
- Check that schema migration (Story 6.2) is complete
- Verify foreign key order is correct
- Check for data type mismatches

### Foreign Key Violations

If you encounter foreign key violations:

1. Verify import order matches dependency order
2. Check that parent tables were imported first
3. Verify exported data includes all required parent records

### Spatial Data Issues

If spatial data fails to import:

1. Verify PostGIS extension is enabled (Story 6.2)
2. Check that spatial columns use correct type (GEOGRAPHY)
3. Validate spatial data with PostGIS functions

## Rollback Procedure

If migration fails:

1. **Keep source backup intact** - Do not delete Azure PostgreSQL backup
2. **Document what was migrated** - Note which tables were successfully imported
3. **Clean Supabase database** if needed:
   ```sql
   -- Truncate all tables (in reverse dependency order)
   TRUNCATE TABLE precomputed_sun_exposure CASCADE;
   TRUNCATE TABLE processed_weather CASCADE;
   TRUNCATE TABLE feedback CASCADE;
   TRUNCATE TABLE sun_windows CASCADE;
   TRUNCATE TABLE venue_quality_metrics CASCADE;
   TRUNCATE TABLE patios CASCADE;
   TRUNCATE TABLE precomputation_schedules CASCADE;
   TRUNCATE TABLE weather_slices CASCADE;
   TRUNCATE TABLE admin_users CASCADE;
   TRUNCATE TABLE buildings CASCADE;
   TRUNCATE TABLE venues CASCADE;
   ```
4. **Fix issues** and retry migration

## Environment Variables

### Azure PostgreSQL

- `AZURE_DB_HOST` - Azure PostgreSQL hostname
- `AZURE_DB_NAME` - Database name
- `AZURE_DB_USER` - Username
- `AZURE_DB_PASSWORD` - Password (or prompted)
- `AZURE_DB_PORT` - Port (default: 5432)

### Supabase

- `SUPABASE_DB_HOST` - Supabase database hostname
- `SUPABASE_DB_NAME` - Database name (usually `postgres`)
- `SUPABASE_DB_USER` - Username (usually `postgres`)
- `SUPABASE_DB_PASSWORD` - Password (or prompted)
- `SUPABASE_DB_PORT` - Port (default: 6543 for connection pooler)

## Connection Strings

### Azure PostgreSQL

```
postgresql://[user]:[password]@[host]:5432/[database]
```

### Supabase

**Direct connection:**

```
postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

**Connection pooler (recommended):**

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

## Notes

- Export files are timestamped for tracking
- Use connection pooler (port 6543) for Supabase to avoid connection limits
- Test with small dataset before full migration
- Always validate data integrity after import
- Keep backups of both source and exported data

## Next Steps

After successful data migration:

1. ✅ Verify all data is migrated correctly
2. ✅ Update application to use Supabase connection
3. ✅ Test application with migrated data
4. ✅ Proceed to Story 6.4: Core API Routes Migration
