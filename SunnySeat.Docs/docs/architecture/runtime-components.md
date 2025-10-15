# Runtime Components
- **API Service (.NET 8)**: endpoints `/api/patios`, `/api/venues/{id}`, `/api/feedback`; OpenTelemetry; rate‑limit middleware; ETags/cache headers.  
- **Public SPA**: map/list & venue detail; confidence badges; mini timeline.  
- **Admin SPA**: polygon editor; import GeoJSON/GeoPackage; quality flags; height overrides.  
- **Precompute Job**: compute per‑patio sun windows (today/tomorrow) at minute granularity; write `sun_window` intervals.  
- **Weather Worker**: fetch **Yr/Met.no** nowcast/forecast; store `weather_slice`; maintain `current_cloud_grid` view.
