# Fullstack Architecture — Sunny Seat (Gothenburg)

> Role: Architect · Inputs: PRD v0.2 + UX Spec · Date: 2025‑09‑21 · Updated: 2025‑12‑21 (Post-Epic 6 Migration) · Status: Current

## High‑Level Architecture

[Vercel Edge/CDN] → Next.js Full-Stack App (React+MapLibre) → Supabase (PostgreSQL+PostGIS)
Background Jobs: **Sun/Shadow Precompute** (Vercel Cron daily + ad‑hoc), **Weather Ingest** (Vercel Cron 5–10 min).

## Runtime Components

- **Next.js Full-Stack Application**: API routes `/api/patios`, `/api/venues/{id}`, `/api/feedback`; Server Components for data fetching; Client Components for interactivity; rate‑limit middleware; ETags/cache headers.
- **Public Pages**: map/list & venue detail; confidence badges; mini timeline.
- **Admin Pages**: polygon editor; import GeoJSON/GeoPackage; quality flags; height overrides.
- **Precompute Job**: compute per‑patio sun windows (today/tomorrow) at minute granularity; write `sun_window` intervals (Vercel Cron).
- **Weather Worker**: fetch **Yr/Met.no** nowcast/forecast; store `weather_slice`; maintain `current_cloud_grid` view (Vercel Cron).

## Algorithms

- **Solar position**: SPA/NREL‑equivalent per‑minute ephemeris; precompute city‑level table.
- **2.5D shadow**: extrude building footprints w/ height; cast shadow polygons; intersect with patio polygon to mark sunny/partial/shaded.
- **Confidence**: `100*(0.6*geometryQuality + 0.4*cloudCertainty)` with caps (90% forecast‑only; 60% when estimated).

## Data Model (PostgreSQL + PostGIS)

Tables: `venue`, `patio`, `building`, `sun_window`, `weather_slice`, `feedback`.  
Indexes: GIST on geographies; date index on `sun_window`.

## API Design

- **/api/patios**: near‑me list with state now + confidence; CDN cache 5–30s; lat/lng snapped to 50 m.
- **/api/venues/{id}**: details + windows today/tomorrow; reason chip when no sun next 4h.
- **/api/feedback**: idempotent yes/no; sinks to analytics.

## Tooling & Import

- **GDAL/ogr2ogr** to load Lantmäteriet `.gpkg` into `building`.
- Patio mapping via Admin SPA; validation/snap/undo/redo.

## Performance & Scaling

- `/api/patios` p95 <400 ms @100 RPS; edge caching; clustered markers; simplified geometries on mobile.

## Security & Privacy

- HTTPS + HSTS; **admin authentication via Supabase Auth** (if needed); rate limiting; no PII; coarse location (snapped) if persisted; audit log for admin actions

## Observability

- Vercel Analytics and Logs; Supabase monitoring; dashboards (traffic, latency, cache hit, accuracy, coverage); alerts (p95>800 ms, cache<50%, accuracy<75%).

## Deployment

- Envs: dev, preview, production; CI/CD via GitHub Actions; Vercel for hosting and deployment; automatic preview deployments for PRs
- **Database migrations:** Supabase SQL migrations; schema versioning via Supabase migration system

## Weather Integration

- **Primary:** Yr/Met.no API with dedicated service account and rate limiting
- **Fallback:** locationforecast.no when nowcast unavailable; graceful degradation with "Est." confidence cap at 60%
- **Error handling:** 503 with Retry-After when weather service completely unavailable
