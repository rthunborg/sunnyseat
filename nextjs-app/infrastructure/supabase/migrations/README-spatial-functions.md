# Spatial Functions Migration

This document describes the PostGIS RPC functions created for Story 6.5: Spatial/Geographic API Migration.

## Overview

The spatial functions provide optimized PostGIS queries for common spatial operations used by the SunnySeat API. These functions replace Entity Framework spatial queries with direct PostGIS RPC calls, providing better performance and leveraging spatial indexes.

## Functions

### get_patios_near_point

**Purpose:** Search for patios within a specified radius of a geographic point.

**Parameters:**

- `search_lat` (DOUBLE PRECISION): Latitude of search point in degrees
- `search_lng` (DOUBLE PRECISION): Longitude of search point in degrees
- `radius_meters` (DOUBLE PRECISION): Search radius in meters

**Returns:** Table with patio data including:

- All patio columns
- Venue name and location
- Distance from search point in meters
- Results ordered by distance (nearest first)
- Limited to 50 results (matches API MAX_RESULTS)

**Usage:**

```typescript
const { data } = await supabase.rpc('get_patios_near_point', {
  search_lat: 57.7089,
  search_lng: 11.9746,
  radius_meters: 1500,
});
```

**Performance:**

- Uses PostGIS `ST_DWithin` for efficient spatial filtering
- Leverages GIST spatial index on `patios.Geometry`
- Typical query time: <50ms for radius <3km

### get_patio_centroid

**Purpose:** Get the centroid (center point) coordinates of a patio polygon.

**Parameters:**

- `patio_id` (INTEGER): ID of the patio

**Returns:** Table with:

- `Latitude` (DOUBLE PRECISION)
- `Longitude` (DOUBLE PRECISION)

**Usage:**

```typescript
const { data } = await supabase.rpc('get_patio_centroid', {
  patio_id: 123,
});
```

### find_patio_containing_point

**Purpose:** Find a patio polygon that contains a given geographic point.

**Parameters:**

- `search_lat` (DOUBLE PRECISION): Latitude of search point
- `search_lng` (DOUBLE PRECISION): Longitude of search point

**Returns:** Table with patio data (first matching patio)

**Usage:**

```typescript
const { data } = await supabase.rpc('find_patio_containing_point', {
  search_lat: 57.7089,
  search_lng: 11.9746,
});
```

### get_patios_within_bounds

**Purpose:** Get all patios that intersect with a bounding polygon.

**Parameters:**

- `bounds_wkt` (TEXT): Polygon in WKT format (e.g., "POLYGON((lng1 lat1, lng2 lat2, ...))")

**Returns:** Table with patio data ordered by venue and name

**Usage:**

```typescript
const { data } = await supabase.rpc('get_patios_within_bounds', {
  bounds_wkt: 'POLYGON((11.9 57.7, 12.0 57.7, 12.0 57.8, 11.9 57.8, 11.9 57.7))',
});
```

### calculate_spatial_distance

**Purpose:** Calculate distance between two geographic points in meters.

**Parameters:**

- `lat1`, `lng1`: First point coordinates
- `lat2`, `lng2`: Second point coordinates

**Returns:** Distance in meters (DOUBLE PRECISION)

**Usage:**

```typescript
const { data } = await supabase.rpc('calculate_spatial_distance', {
  lat1: 57.7089,
  lng1: 11.9746,
  lat2: 57.709,
  lng2: 11.9747,
});
```

## Performance Considerations

### Spatial Indexes

All spatial functions leverage GIST indexes created in `003_create_indexes.sql`:

- `patios.Geometry` - GIST index for patio polygon queries
- `venues.Location` - GIST index for venue location queries
- `buildings.Geometry` - GIST index for building polygon queries

### Query Optimization

1. **ST_DWithin vs ST_Distance**: Functions use `ST_DWithin` for radius queries as it's optimized for spatial indexes
2. **Limit Results**: `get_patios_near_point` limits results to 50 to match API requirements
3. **Order by Distance**: Results are pre-ordered by distance to avoid client-side sorting

### Performance Targets

- **get_patios_near_point**: <50ms for radius <3km (p95)
- **find_patio_containing_point**: <30ms (p95)
- **get_patios_within_bounds**: <100ms for typical viewport (p95)

## Testing

After running the migration, test the functions:

```sql
-- Test get_patios_near_point
SELECT * FROM get_patios_near_point(57.7089, 11.9746, 1500);

-- Test get_patio_centroid
SELECT * FROM get_patio_centroid(1);

-- Test find_patio_containing_point
SELECT * FROM find_patio_containing_point(57.7089, 11.9746);

-- Test calculate_spatial_distance
SELECT calculate_spatial_distance(57.7089, 11.9746, 57.7090, 11.9747);
```

## Migration Notes

- Functions are created with `CREATE OR REPLACE` to allow updates
- Execute permissions granted to `anon` and `authenticated` roles
- Functions use `LANGUAGE plpgsql` for complex logic
- All functions are idempotent (safe to re-run)

## Future Enhancements

For Story 6.5 completion, additional functions may be needed:

- `calculate_sun_exposure` - Complex sun exposure calculation (may require application logic)
- `calculate_batch_sun_exposure` - Batch sun exposure for multiple patios
- `get_shadow_geometry` - Shadow projection calculations

These will be added as needed based on API requirements.
