# Supabase Architecture

## Overview

SunnySeat uses Supabase (managed PostgreSQL with PostGIS) as the primary database for storing spatial data, user feedback, and application state.

## Database Schema

### Core Tables

```
patios
├── id (uuid, PK)
├── name (text)
├── geometry (geography(Polygon))
├── venue_id (uuid, FK → venues.id)
└── created_at (timestamp)

venues
├── id (uuid, PK)
├── name (text)
├── address (text)
└── location (geography(Point))

buildings
├── id (uuid, PK)
├── geometry (geography(Polygon))
├── height_meters (numeric)
└── created_at (timestamp)

sun_windows
├── id (uuid, PK)
├── patio_id (uuid, FK → patios.id)
├── start_time (timestamp)
├── end_time (timestamp)
├── date (date)
└── confidence_score (numeric)

weather_slices
├── id (uuid, PK)
├── timestamp (timestamp)
├── cloud_cover (numeric)
├── temperature (numeric)
└── location (geography(Point))

feedback
├── id (uuid, PK)
├── patio_id (uuid, FK → patios.id)
├── accuracy_rating (integer)
├── comment (text)
└── created_at (timestamp)
```

## PostGIS Integration

### Spatial Data Types

- **geography(Polygon)**: For patio and building geometries
- **geography(Point)**: For venue locations and weather data points
- **GIST Indexes**: On all geometry columns for fast spatial queries

### Spatial Functions

```sql
-- Distance calculation
ST_Distance(geometry1, geometry2)

-- Point-in-polygon check
ST_Contains(polygon, point)

-- Buffer creation
ST_Buffer(geometry, distance)

-- Intersection
ST_Intersection(geometry1, geometry2)
```

### Spatial Indexes

```sql
-- GIST index on geometry columns
CREATE INDEX idx_patios_geometry ON patios USING GIST (geometry);
CREATE INDEX idx_buildings_geometry ON buildings USING GIST (geometry);
```

## Client Architecture

### Browser Client

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**Use Cases:**
- Client-side data fetching (with TanStack Query)
- Real-time subscriptions (if needed)
- Public data access

### Server Client

```typescript
// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js';

export function createClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-side only
  );
}
```

**Use Cases:**
- Server Components data fetching
- API Routes database access
- Background jobs
- Admin operations

## Connection Management

### Connection Pooling

Supabase provides automatic connection pooling:
- **Pooler**: Handles connection management
- **Max Connections**: Configured per tier
- **Connection Reuse**: Automatic

### Connection String

```
postgresql://postgres:[password]@[host]:5432/postgres?pgbouncer=true
```

The `pgbouncer=true` parameter enables connection pooling.

## Query Patterns

### Spatial Queries

```typescript
// Find patios within radius
const { data } = await supabase
  .rpc('find_patios_near_point', {
    center_lat: 57.7089,
    center_lng: 11.9746,
    radius_km: 1.0
  });
```

### RPC Functions

Custom PostgreSQL functions for complex queries:

```sql
-- Example: Find patios near point
CREATE FUNCTION find_patios_near_point(
  center_lat float,
  center_lng float,
  radius_km float
)
RETURNS TABLE(...) AS $$
  SELECT * FROM patios
  WHERE ST_DWithin(
    geometry,
    ST_MakePoint(center_lng, center_lat)::geography,
    radius_km * 1000
  );
$$ LANGUAGE sql;
```

## Migrations

### Migration Structure

```
infrastructure/supabase/migrations/
├── 001_enable_postgis.sql
├── 002_create_tables.sql
├── 003_create_indexes.sql
├── 004_create_foreign_keys.sql
├── 005_validate_schema.sql
└── 006_create_spatial_functions.sql
```

### Migration Process

1. **Create migration file**: `001_description.sql`
2. **Apply locally**: Test with local Supabase
3. **Apply to staging**: Test in staging environment
4. **Apply to production**: Deploy via Supabase dashboard or CLI

### Migration Best Practices

- **Idempotent**: Can be run multiple times safely
- **Reversible**: Include rollback scripts if possible
- **Tested**: Test on staging before production
- **Documented**: Include comments explaining changes

## Row Level Security (RLS)

### Current Configuration

- **Public Tables**: No RLS (MVP - public access)
- **Admin Tables**: RLS can be enabled for future multi-tenant scenarios

### Example RLS Policy

```sql
-- Example: Users can only see their own feedback
CREATE POLICY "Users can view own feedback"
ON feedback FOR SELECT
USING (auth.uid() = user_id);
```

## Backup & Recovery

### Automatic Backups

- **Daily Backups**: Automatic via Supabase
- **Point-in-Time Recovery**: Available on Pro tier
- **Backup Retention**: Configurable per tier

### Manual Backups

```bash
# Export data
pg_dump -h [host] -U postgres -d postgres > backup.sql

# Import data
psql -h [host] -U postgres -d postgres < backup.sql
```

## Performance Optimization

### Query Optimization

- **Indexes**: GIST indexes on all geometry columns
- **Query Planning**: EXPLAIN ANALYZE for slow queries
- **Connection Pooling**: Automatic via Supabase pooler

### Caching

- **Query Result Caching**: Via Supabase (if configured)
- **Application-Level Caching**: Via TanStack Query
- **CDN Caching**: Via Vercel Edge Network

## Monitoring

### Supabase Dashboard

- **Database Metrics**: Query performance, connection count
- **API Metrics**: Request count, response times
- **Storage Metrics**: Database size, growth trends

### Custom Monitoring

- **Query Logging**: Enable in Supabase dashboard
- **Slow Query Alerts**: Configure thresholds
- **Connection Pool Monitoring**: Track pool usage

## Security

### Authentication

- **Supabase Auth**: Available but not used in MVP (public access)
- **JWT Tokens**: Used for admin authentication (custom implementation)

### Data Security

- **Encryption**: At rest and in transit
- **SSL/TLS**: Required for all connections
- **Access Control**: Via RLS policies (if enabled)

## Related Documentation

- [Data Model](./data-model-postgresql-postgis.md)
- [Migrations Guide](../../nextjs-app/infrastructure/supabase/migrations/README.md)
- [Tech Stack](./tech-stack.md)
