# 5. Functional Requirements

## 5.1 Public App (Web)
- Map view (MapLibre GL) with clustered markers and optional heat shading for “sunny now”.
- List view synchronized with map bounds; sort by distance and confidence.
- Filters: distance, district, price level; search by venue name.
- Venue detail page with: polygon overlay, **sun windows** for today/tomorrow, confidence badge, share link.

## 5.2 Admin App
- Authenticated (basic admin auth) CRUD for venues/patios.
- Polygon drawing/editing; import from GeoPackage/GeoJSON; bulk operations.
- Height override per patio; data quality flags.

## 5.3 Sun/Shadow & Weather
- Solar position by timestamp & lat/long (minute granularity).
- 2.5D shadow using building footprints + height (floors→meters heuristic when missing). 
- Precompute per‑patio **sun windows** daily; cache for today/tomorrow.
- Cloud cover **nowcast + short‑term forecast** ingestion; blend to **confidence %** capped when uncertain.

## 5.4 Data & Telemetry
- Event logging for search, views, selections; feedback events for accuracy calculation.
- Basic SEO: indexable venue pages with meta tags and static preview images.
