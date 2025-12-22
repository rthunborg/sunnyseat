# Runtime Components

- **Next.js Full-Stack Application**: API routes `/api/patios`, `/api/venues/{id}`, `/api/feedback`; Server Components for data fetching; Client Components for interactivity; rate‑limit middleware; ETags/cache headers.
- **Public Pages**: map/list & venue detail; confidence badges; mini timeline.
- **Admin Pages**: polygon editor; import GeoJSON/GeoPackage; quality flags; height overrides.
- **Precompute Job**: compute per‑patio sun windows (today/tomorrow) at minute granularity; write `sun_window` intervals (Vercel Cron).
- **Weather Worker**: fetch **Yr/Met.no** nowcast/forecast; store `weather_slice`; maintain `current_cloud_grid` view (Vercel Cron).
