# Supabase Database Migration Guide

This directory contains SQL migration scripts to recreate the SunnySeat database schema in Supabase with PostGIS support.

## Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Supabase Project**: Create a new project in your Supabase dashboard
3. **Database Access**: You'll need the connection credentials from your Supabase project settings

## Migration Steps

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in project details:
   - **Name**: `sunnyseat` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
4. Wait for project provisioning (2-3 minutes)

### Step 2: Get Connection Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Note down:
   - **Project URL**: `https://[project-ref].supabase.co`
   - **anon/public key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**: `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)
3. Go to **Settings** → **Database**
4. Note down:
   - **Connection string**: For direct database access
   - **Connection pooling**: Supabase provides connection pooling automatically

### Step 3: Update Environment Variables

Update `nextjs-app/.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

### Step 4: Run Migrations

You can run migrations in two ways:

#### Option A: Using Supabase SQL Editor (Recommended for first-time setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run each migration script in order:
   - `001_enable_postgis.sql`
   - `002_create_tables.sql`
   - `003_create_indexes.sql`
   - `004_create_foreign_keys.sql`
   - `005_validate_schema.sql`

#### Option B: Using psql Command Line

```bash
# Connect to Supabase database
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Run migrations in order
\i infrastructure/supabase/migrations/001_enable_postgis.sql
\i infrastructure/supabase/migrations/002_create_tables.sql
\i infrastructure/supabase/migrations/003_create_indexes.sql
\i infrastructure/supabase/migrations/004_create_foreign_keys.sql
\i infrastructure/supabase/migrations/005_validate_schema.sql
```

### Step 5: Verify Migration

The validation script (`005_validate_schema.sql`) will automatically verify:

- ✅ PostGIS extension is enabled
- ✅ All tables are created
- ✅ All spatial indexes exist
- ✅ All foreign keys are in place
- ✅ Spatial columns are correctly configured

## Connection Pooling

Supabase automatically provides connection pooling. The connection pooler is available at:

- **Port**: `6543` (pooled connection)
- **Port**: `5432` (direct connection)

For production applications, use the pooled connection (port 6543) to avoid connection limit issues.

## Migration Scripts Overview

| Script                        | Purpose                                 | Order |
| ----------------------------- | --------------------------------------- | ----- |
| `001_enable_postgis.sql`      | Enable PostGIS extension                | 1     |
| `002_create_tables.sql`       | Create all database tables              | 2     |
| `003_create_indexes.sql`      | Create indexes (including spatial GIST) | 3     |
| `004_create_foreign_keys.sql` | Add foreign key constraints             | 4     |
| `005_validate_schema.sql`     | Validate migration success              | 5     |

## Tables Created

- `venues` - Restaurant/café locations
- `patios` - Patio geometries with spatial data
- `buildings` - Building footprints for shadow calculations
- `venue_quality_metrics` - Venue quality tracking
- `sun_windows` - Precomputed sun exposure time windows
- `weather_slices` - Weather data
- `processed_weather` - Processed weather data
- `feedback` - User accuracy feedback
- `admin_users` - Admin authentication
- `precomputed_sun_exposure` - Precomputed exposure data
- `precomputation_schedules` - Background job schedules

## Spatial Features

All spatial columns use **GEOGRAPHY** type with **EPSG:4326** (WGS84) coordinate system:

- `venues.Location` - POINT
- `patios.Geometry` - POLYGON
- `buildings.Geometry` - POLYGON
- `processed_weather.Location` - POINT

All spatial columns have **GIST indexes** for optimal spatial query performance.

## Troubleshooting

### PostGIS Extension Not Available

If PostGIS extension is not available in your Supabase project:

1. Check your Supabase plan (PostGIS is available on all plans)
2. Contact Supabase support if the issue persists

### Migration Errors

If you encounter errors:

1. Check that migrations are run in the correct order
2. Verify PostGIS is enabled before creating spatial tables
3. Check Supabase logs in the dashboard for detailed error messages

### Connection Issues

- Use the connection pooler (port 6543) for better connection management
- Verify your connection string format
- Check that your IP is not blocked in Supabase firewall settings

## Next Steps

After successful migration:

1. ✅ Update `.env.local` with Supabase credentials
2. ✅ Test Supabase client connection (Story 6.1)
3. ✅ Proceed to Story 6.3: Data Migration Script (migrate actual data)

## References

- [Supabase Documentation](https://supabase.com/docs)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
