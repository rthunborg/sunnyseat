# 4. User Stories & Acceptance Criteria

## Search sunny now (near me)
- *As a* visitor in Gothenburg, *I want* to see patios sunny **now** within 1–2 km, *so that* I can pick quickly.
- **Acceptance**
  - If location permission is granted **or** a manual pin is set, the system returns results within the selected **radius (default 1.5 km, max 3 km)**.
  - **Performance:** First 10 results visible **<2s p50 / <4s p90** on 4G; full list **<5s p90**.
  - **Result card shows:** venue name, distance (meters), **state now** (Sunny / Partial / Shaded), **confidence %**, and a **mini 2‑hour timeline** with 10‑min ticks.
  - **Empty state:** If <3 patios are sunny, show nearest top 10 with **ETA to next sun window**.
  - **Geofence:** Never show venues >10 km from the pin; show banner to adjust radius.

## See when a venue gets sun
- *As a* user with a venue in mind, *I want* to open its page and see **today/tomorrow sun windows**.
- **Acceptance**
  - Venue page renders **sorted sun windows** (start–end in local time) for **today and tomorrow** with per‑window **confidence %**.
  - **Freshness:** Recompute / refresh view on open and every **5 min** while open.
  - **No sun expected:** show “No direct sun expected in next 4h” and reason badge (**Shadow**/**Cloud**).
  - **Shareability:** Copyable deep link preserves venue and selected date.

## Understand confidence
- *As a* user, *I want* a simple **confidence %** and visual state, *so that* I can judge reliability.
- **Acceptance**
  - **Computation:** confidence = weighted blend of **GeometryQuality (0–1)** and **CloudCertainty (0–1)**, mapped to %; cap at **90%** when cloud source is forecast (not nowcast).
  - **Badge states:** **High (≥70%)**, **Medium (40–69%)**, **Low (<40%)** with tooltip explainer and info link.
  - **Fallbacks:** If either component is missing, display **“Est.”** label and cap at **60%**.

## Admin: map patios
- *As an* admin, *I want* to draw/edit patio polygons and set optional height overrides, *so that* predictions improve.
- **Acceptance**
  - Import **GeoPackage (.gpkg)/GeoJSON**; draw/edit/save polygons with **snap, undo/redo**, and metadata (orientation, notes).
  - **Quality flags per patio:** `height_source` (surveyed|osm|heuristic), `polygon_quality` (0–1), `review_needed` (bool).
  - Batch import **top 100 venues**; audit list of **unmapped venues** with add‑button.

## Accuracy telemetry
- *As a* product team, *I want* user feedback on “was it sunny?”, *so that* we can track accuracy.
- **Acceptance**
  - One‑tap feedback (Yes/No) stores **venue_id, patio_id, user_timestamp, predicted_state_at_timestamp, confidence_at_prediction** (rounded to 5‑min bins).
  - **Metric:** rolling 14‑day **agreement rate ≥85%** with dashboard sparkline.
