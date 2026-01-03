# Next.js API Routes

This directory contains the migrated API endpoints from .NET 8 Minimal APIs to Next.js Route Handlers.

## API Structure

```
/app/api
  /auth              # Authentication endpoints
    /login           # POST - Admin login
    /refresh         # POST - Refresh access token
    /logout          # POST - Logout and revoke token
    /me              # GET - Get current user (requires auth)
  /patios            # GET - Search patios by location
  /feedback          # POST/GET - User feedback submission and querying
    /[id]            # GET - Get feedback by ID (requires auth)
    /metrics         # GET - Get accuracy metrics (requires auth)
  /sun-exposure      # Sun exposure calculation endpoints
    /patio/[id]      # GET - Get sun exposure for patio
  /health            # Health check endpoints
    /ready           # GET - Readiness check
    /live            # GET - Liveness check
    /database        # GET - Database connectivity check
```

## Authentication

Most endpoints use JWT-based authentication. Include the token in the Authorization header:

```
Authorization: Bearer <access-token>
```

### Environment Variables

Add to `.env.local`:

```env
JWT_SECRET=your-secret-key-change-in-production-min-32-chars
JWT_EXPIRATION_MINUTES=60
REFRESH_TOKEN_EXPIRATION_DAYS=7
```

## API Endpoints

### Authentication

- **POST /api/auth/login** - Authenticate admin user
- **POST /api/auth/refresh** - Refresh access token
- **POST /api/auth/logout** - Logout and revoke refresh token
- **GET /api/auth/me** - Get current user info (requires auth)

### Patios

- **GET /api/patios?latitude={lat}&longitude={lng}&radiusKm={km}** - Search patios by location

### Feedback

- **POST /api/feedback** - Submit user feedback (public)
- **GET /api/feedback** - Query feedback (requires auth)
- **GET /api/feedback/[id]** - Get feedback by ID (requires auth)
- **GET /api/feedback/metrics** - Get accuracy metrics (requires auth)

### Sun Exposure

- **GET /api/sun-exposure/patio/[id]?timestamp={iso}** - Get sun exposure for patio

### Health Checks

- **GET /api/health** - Basic health check
- **GET /api/health/ready** - Readiness check
- **GET /api/health/live** - Liveness check
- **GET /api/health/database** - Database connectivity check

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "detail": "Additional details",
  "statusCode": 400
}
```

Validation errors:

```json
{
  "title": "Validation Error",
  "detail": "Error message",
  "status": 400,
  "errors": {
    "field": ["Error message"]
  }
}
```

## Implementation Notes

### Spatial Queries

The patios endpoint currently uses a placeholder for spatial queries. The full implementation with PostGIS RPC functions will be completed in Story 6.5: Spatial/Geographic API Migration.

### Sun Exposure Calculation

Sun exposure calculation is currently a placeholder. Full implementation will be migrated in Story 6.5.

### Database Operations

All database operations use the Supabase client (`supabaseAdmin` from `@/lib/supabase/server`).

## Testing

Integration tests should be created for each endpoint. See `test/api/` directory for test files.

## Next Steps

- Story 6.5: Spatial/Geographic API Migration (complex spatial queries, RPC functions)
- Story 6.6: Frontend Migration (connect frontend to new API routes)
