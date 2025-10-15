# PRD — Sunny Seat (Gothenburg) · v0.2 (Merged with Addendum A1–A3)

> Owner: PM · Source: Analyst project brief · Status: Draft tightened after checklist pass (2025‑09‑21)

## 1. Summary / Goals
Build a web app that lets people in Gothenburg instantly find patios **in direct sun now** and see **when** specific venues will get sun later **today/tomorrow**, with a **confidence %** that blends geometry certainty and short‑term cloud cover.

### Success Metrics
- **Activation:** ≥60% of first‑time users see a “sunny patio near me” within **2 minutes**.
- **Retention:** **D7 ≥25%**.
- **Efficiency:** decision time (open → choose) **<90s** median.
- **Accuracy:** **≥85%** agreement with user feedback within ±10 min.
- **Business (post‑MVP):** venue sign‑ups ≥10/month; affiliate ≥5 SEK/session.

### Non‑Goals (V1)
Push notifications, favorites, routing/ETA, bookings, multi‑city expansion, loyalty/ads, ML patio detection.

## 2. Users & Jobs‑to‑Be‑Done
- **Primary:** Locals/visitors in Gothenburg seeking a sunny patio now or later today.
- **Secondary:** Venue owners/managers (benefit from demand when sun hits).

**Top Jobs**
1) “Show me nearby patios that are sunny **right now**.”
2) “Tell me **when** a specific venue’s patio gets sun **today/tomorrow**.”
3) “Show **confidence** so I can decide if it’s worth going.”

## 3. Scope — MVP (V1)
### Must‑Have (In Scope)
1. **Admin tooling** to draw/import **patio polygons** per venue (manual mapping).  
2. **Data model** for venues, patios, orientation, optional height hints.  
3. **Solar + shadow engine (2.5D)** using building footprints + heights (heuristics floors→meters when missing).  
4. **Now / next 2–4 hours** sunlight status per patio with **confidence %** (cloud cover via public API nowcast/forecast).  
5. **Public map + list** with basic filters (distance, district, price level).  
6. **SEO’d venue page** (shareable deep link).  

### Out of Scope (Later)
Notifications, favorites, routing/ETA, multi‑city, ML polygon detection, bookings/loyalty.

## 4. User Stories & Acceptance Criteria

### Search sunny now (near me)
- *As a* visitor in Gothenburg, *I want* to see patios sunny **now** within 1–2 km, *so that* I can pick quickly.
- **Acceptance**
  - If location permission is granted **or** a manual pin is set, the system returns results within the selected **radius (default 1.5 km, max 3 km)**.
  - **Performance:** First 10 results visible **<2s p50 / <4s p90** on 4G; full list **<5s p90**.
  - **Result card shows:** venue name, distance (meters), **state now** (Sunny / Partial / Shaded), **confidence %**, and a **mini 2‑hour timeline** with 10‑min ticks.
  - **Empty state:** If <3 patios are sunny, show nearest top 10 with **ETA to next sun window**.
  - **Geofence:** Never show venues >10 km from the pin; show banner to adjust radius.

### See when a venue gets sun
- *As a* user with a venue in mind, *I want* to open its page and see **today/tomorrow sun windows**.
- **Acceptance**
  - Venue page renders **sorted sun windows** (start–end in local time) for **today and tomorrow** with per‑window **confidence %**.
  - **Freshness:** Recompute / refresh view on open and every **5 min** while open.
  - **No sun expected:** show “No direct sun expected in next 4h” and reason badge (**Shadow**/**Cloud**).
  - **Shareability:** Copyable deep link preserves venue and selected date.

### Understand confidence
- *As a* user, *I want* a simple **confidence %** and visual state, *so that* I can judge reliability.
- **Acceptance**
  - **Computation:** confidence = weighted blend of **GeometryQuality (0–1)** and **CloudCertainty (0–1)**, mapped to %; cap at **90%** when cloud source is forecast (not nowcast).
  - **Badge states:** **High (≥70%)**, **Medium (40–69%)**, **Low (<40%)** with tooltip explainer and info link.
  - **Fallbacks:** If either component is missing, display **“Est.”** label and cap at **60%**.

### Admin: map patios
- *As an* admin, *I want* to draw/edit patio polygons and set optional height overrides, *so that* predictions improve.
- **Acceptance**
  - Import **GeoPackage (.gpkg)/GeoJSON**; draw/edit/save polygons with **snap, undo/redo**, and metadata (orientation, notes).
  - **Quality flags per patio:** `height_source` (surveyed|osm|heuristic), `polygon_quality` (0–1), `review_needed` (bool).
  - Batch import **top 100 venues**; audit list of **unmapped venues** with add‑button.

### Accuracy telemetry
- *As a* product team, *I want* user feedback on “was it sunny?”, *so that* we can track accuracy.
- **Acceptance**
  - One‑tap feedback (Yes/No) stores **venue_id, patio_id, user_timestamp, predicted_state_at_timestamp, confidence_at_prediction** (rounded to 5‑min bins).
  - **Metric:** rolling 14‑day **agreement rate ≥85%** with dashboard sparkline.

## 5. Functional Requirements

### 5.1 Public App (Web)
- Map view (MapLibre GL) with clustered markers and optional heat shading for “sunny now”.
- List view synchronized with map bounds; sort by distance and confidence.
- Filters: distance, district, price level; search by venue name.
- Venue detail page with: polygon overlay, **sun windows** for today/tomorrow, confidence badge, share link.

### 5.2 Admin App
- Authenticated (basic admin auth) CRUD for venues/patios.
- Polygon drawing/editing; import from GeoPackage/GeoJSON; bulk operations.
- Height override per patio; data quality flags.

### 5.3 Sun/Shadow & Weather
- Solar position by timestamp & lat/long (minute granularity).
- 2.5D shadow using building footprints + height (floors→meters heuristic when missing). 
- Precompute per‑patio **sun windows** daily; cache for today/tomorrow.
- Cloud cover **nowcast + short‑term forecast** ingestion; blend to **confidence %** capped when uncertain.

### 5.4 Data & Telemetry
- Event logging for search, views, selections; feedback events for accuracy calculation.
- Basic SEO: indexable venue pages with meta tags and static preview images.

## 6. Non‑Functional Requirements
- **Performance (client):** initial results <2s p50 / <4s p90 on 4G; map pan/zoom ≥50 FPS mobile, ≥60 FPS desktop where possible.
- **Performance (server):** `/api/patios` **p95 <400 ms** at 100 RPS; cache hits **>70%** at edge.
- **Availability:** 99% for public app during **06:00–22:00** local.
- **Cost:** target infra cost ≤ **$100/month** at MVP scale (~5k MAU, 50k req/mo).
- **Privacy:** no PII required; store coarse location only (nearest 50 m when persisted).
- **Accessibility:** WCAG **AA**; keyboard navigation on list/detail; map alternatives.
- **Observability:** structured logs, request tracing id, **4 dashboards** (traffic, latency, cache hit ratio, accuracy).

## 7. Technical Considerations
- **Frontend:** React + MapLibre GL.  
- **Backend:** .NET (C#).  
- **DB:** PostgreSQL + **PostGIS**.  
- **Infra:** Azure (App Service/Container Apps), Azure Postgres; optional Azure Maps; CI/CD via GitHub Actions.  
- **Data sources:** Lantmäteriet/OSM buildings (.gpkg exists), Nordic weather APIs.

## 8. Data Model (high‑level)
- **Venue**(id, name, location(point), district, price_level, …)
- **Patio**(id, venue_id, polygon(geom), orientation, height_override_m, quality_flag, …)
- **Building**(id, polygon(geom), height_m, source, floors, …)
- **Prediction**(patio_id, date, sun_windows[timespans], generated_at)
- **WeatherSlice**(timestamp, cloud_cover_pct, source, location)
- **Feedback**(venue_id, timestamp, observed_state, confidence_at_prediction)

## 9. APIs (proposed)
- `GET /api/patios?lat=..&lng=..&radius=..` → list patios with current state + confidence; **422** if radius>3km; **503** when weather unavailable (with Retry‑After).
- `GET /api/venues/{id}` → venue details + today/tomorrow windows.
- `POST /api/feedback` → stores yes/no accuracy feedback; idempotent by time bucket.
- Admin: import & patio CRUD (auth required).

## 10. Milestones & Release Plan
- **A — Foundation & Data Setup (Weeks 1–4):** 
  - **Week 1:** Project setup (.NET Framework), PostgreSQL + PostGIS database setup, schema creation and migration framework
  - **Week 2:** Lantmäteriet .gpkg import pipeline, building data validation and processing
  - **Week 3:** Admin authentication setup, admin SPA with polygon editor
  - **Week 4:** Seed 50–100 venues with patio polygons, data quality validation
- **B — Sun/Shadow Engine (Weeks 5–8):** solar position calculations, 2.5D shadow modeling, precompute pipeline + caching infrastructure
- **C — Weather Integration & Confidence (Weeks 9–10):** 
  - **Week 9:** Yr/Met.no API setup, authentication testing, fallback strategy implementation
  - **Week 10:** Weather data ingestion, confidence blending algorithm, accuracy logging + dashboard setup
- **Launch (Weeks 11–12):** public map/search interface, venue detail pages, feedback collection, SEO basics

## 11. Risks & Mitigations
- **Shadow accuracy** → LOD1 heuristics, feedback loop, per‑patio overrides.
- **Cloud granularity** → blend nowcast+forecast, cap confidence, uncertainty UI; degrade gracefully.
- **Admin load** → focus top 100; streamlined drawing/import; batch ops.
- **Map performance** → precompute, edge cache, simplify polygons.
- **Seasonality** → tomorrow/weekend planning; wind/shelter later.

## 12. Dependencies & Assumptions
- **Building Data:** Lantmäteriet/OSM buildings (.gpkg local) with validation pipeline for height data quality
- **Weather Provider:** Primary - Yr/Met.no with API key setup and testing; Fallback - generic locationforecast when nowcast unavailable
- **Database:** PostgreSQL + PostGIS setup with migration framework for .NET Framework compatibility  
- **Infrastructure:** Azure/Postgres within budget; CDN/edge cache; admin authentication mechanism
- **API Integration:** Weather API testing and fallback behavior before confidence calculations dependency

## 13. Definition of Done (V1)
- All acceptance in §4 met; p95 API & client perf budgets in §6 met.
- Rolling 14‑day **accuracy ≥85%** or improvement plan.
- Smoke tests + e2e for search→venue selection; synthetic test for “no sun expected”.
- Docs: runbook, admin how‑to, data import guide; dashboard links.

## 14. Open Questions
- District & price level seed sources?  
- Venue owner access in V1: read‑only vs invite‑only admin?  
- Confidence weights initial values (e.g., 0.6 geometry / 0.4 cloud) and tuning plan.

---

### Addendum (Final)
**A1) Rate Limits & 429**  
- Defaults: 60 rpm/IP (`/api/patios`), 120 rpm/IP (`/api/venues/{id}`), 30 rpm/IP (`/api/feedback`).  
- 429 JSON: `{ "error":"rate_limited","retry_after": <seconds> }` + `Retry‑After` header; clients backoff with jitter ≤3 retries.

**A2) Data Retention & Backups**  
- Weather slices 14 days; feedback 1 year; daily backups + PITR ≥7 days.

**A3) SLO & Error Budget**  
- 99% during 06:00–22:00 local; 1%/month error budget; SLIs: p95 <400 ms, edge cache hit >50%, accuracy ≥85%.
