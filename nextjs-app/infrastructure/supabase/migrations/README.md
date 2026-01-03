# Supabase Migration Scripts

This directory contains SQL migration scripts for setting up the SunnySeat database schema in Supabase.

## Migration Order

**IMPORTANT**: Run migrations in this exact order:

1. `001_enable_postgis.sql` - Enable PostGIS extension
2. `002_create_tables.sql` - Create all database tables
3. `003_create_indexes.sql` - Create indexes (including spatial GIST indexes)
4. `004_create_foreign_keys.sql` - Add foreign key constraints
5. `005_validate_schema.sql` - Validate migration success
6. `006_create_spatial_functions.sql` - Create PostGIS RPC functions for spatial queries

## Running Migrations

### Using Supabase SQL Editor

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste each script content
4. Click "Run" to execute
5. Verify success messages

### Using psql

```bash
# Set connection string
export DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Run migrations
psql $DATABASE_URL -f 001_enable_postgis.sql
psql $DATABASE_URL -f 002_create_tables.sql
psql $DATABASE_URL -f 003_create_indexes.sql
psql $DATABASE_URL -f 004_create_foreign_keys.sql
psql $DATABASE_URL -f 005_validate_schema.sql
psql $DATABASE_URL -f 006_create_spatial_functions.sql
```

## Script Details

### 001_enable_postgis.sql

- Enables PostGIS extension
- Verifies PostGIS installation
- Displays PostGIS version

### 002_create_tables.sql

- Creates all 11 database tables
- Defines all columns with correct data types
- Sets up default values and constraints

### 003_create_indexes.sql

- Creates spatial GIST indexes on all geography columns
- Creates B-tree indexes for performance
- Sets up composite indexes for common query patterns

### 004_create_foreign_keys.sql

- Establishes foreign key relationships
- Configures CASCADE delete behavior
- Ensures referential integrity

### 005_validate_schema.sql

- Validates PostGIS extension
- Verifies all tables exist
- Checks spatial indexes
- Validates foreign keys
- Generates summary report

### 006_create_spatial_functions.sql

- Creates PostGIS RPC functions for spatial queries
- Implements `get_patios_near_point` for patio search
- Implements helper functions for spatial operations
- Grants execute permissions to API roles
- Required for Story 6.5: Spatial/Geographic API Migration

## Notes

- All spatial columns use `GEOGRAPHY` type with EPSG:4326
- All foreign keys use `ON DELETE CASCADE`
- Timestamps use `TIMESTAMP WITH TIME ZONE`
- Indexes use `IF NOT EXISTS` to allow re-running
