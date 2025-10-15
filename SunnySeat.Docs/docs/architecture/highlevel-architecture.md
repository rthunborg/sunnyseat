# High‑Level Architecture
[Azure Front Door/CDN] → Public SPA (React+MapLibre) & Admin SPA → API (.NET 8 Minimal API) → Postgres/PostGIS
Workers: **Sun/Shadow Precompute** (daily + ad‑hoc), **Weather Ingest** (5–10 min).
