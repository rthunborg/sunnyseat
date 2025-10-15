# Project Brief

> Status: Draft 0.1 · Owner: Analyst · Last updated:

## 1) One‑liner / Elevator Pitch
A **web app** that helps **people in Gothenburg** quickly **find outdoor seating that’s in direct sun right now (and soon)** by **combining venue geometry with real-time sun position, building shadow modeling, and weather**, unlike **manually guessing on Google/Maps or calling venues**.

## 2) Problem Statement
**Current workflow:** People wander between bars/restaurants or scan generic map apps hoping a patio is sunny.

**Pain points:** No source for “sun right now” on specific patios; building shadows shift by time/season; cloud cover adds uncertainty.

**Impact:** Wasted time and missed moments (esp. after work/weekends); lost revenue for venues when sun hits but no one knows.

## 3) Target Users & Jobs‑to‑Be‑Done
**Primary users:** Locals & visitors in Gothenburg who want a sunny patio now or later today.  
**Secondary stakeholders:** Venue owners/managers (to attract guests when sun arrives), tourism/city guides.

**Top 3 jobs**
1. “Show me nearby patios that are sunny **right now**.”  
2. “Tell me **when** a specific venue’s patio gets sun **today/tomorrow**.”  
3. “Estimate **confidence** (sun vs. cloud) so I can decide if it’s worth going.”

## 4) Value Proposition
**Differentiators:**
- Patio-level sunlight prediction (minute‑granularity) using building shadows, not just generic “weather = sunny”.
- Clear **now/next** timeline + **confidence %** factoring clouds.
- Lightweight admin to **manually map** accurate patio polygons (source of truth).

**Must-have vs nice-to-have:**
- **Must:** Venue DB with patio polygons, sun/shadow engine, now/next cards, map UI, confidence %, basic search/filter.
- **Nice:** Crowd validation, venue self-service, notifications, favorites, wrappers, routing.

## 5) Competitive / Alternatives
Direct competitors: none focused on patio‑sun for Gothenburg.  
Indirect/DIY: Google/Maps, weather apps, calls, social posts.  
Gaps: no patio‑level sunlight & timing; no combined **geometry + solar + cloud** view.

## 6) Scope – MVP (V1)
**In-scope:** admin mapping; data model; solar+shadow; now/next + confidence; map+list; SEO venue page.  
**Out-of-scope:** notifications, favorites, routing/ETA, multi‑city, ML patio detection, loyalty, bookings.

## 7) Success Metrics
Activation ≥60% in 2 min; D7 ≥25%; decision time <90s; accuracy ≥85% within ±10 min; venue sign‑ups ≥10/mo; affiliate ≥5 SEK/session.

## 8) Constraints & Assumptions
**Stack:** .NET (C#); React + MapLibre; Postgres + PostGIS; Azure.  
**Budget/timeline:** ≤$100/mo run; beta within 6 months.  
**Data/privacy:** venue geometry only; respect API T&Cs.  
**Assumption:** LOD1 heights sufficient for useful shadow accuracy.  
**Building data:** Lantmäteriet `.gpkg` already obtained locally.

## 9) Risks & Mitigations
Shadow accuracy → LOD1 heuristics + overrides; Cloud granularity → blend, cap, explain; Admin load → top 100 venues + bulk tools; Map perf → precompute & cache; Seasonality → tomorrow/weekend; Building data ingested from `.gpkg`.

## 10) Milestones
A Data/Admin → schema, import, admin map, 50 venues.  
B Sun/Shadow → solar calc, 2.5D, precompute.  
C Weather/Confidence → nowcast + blend + logging.  
Launch → map/search, venue pages, feedback.

## 11) Research Backlog
TBD

## 12) Appendix
Glossary; prior art links; weather APIs.
