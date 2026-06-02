# Project Brief — SunnySeat

> Status: **Superseded for MVP and admin scope** · Owner: Analyst · Last updated: 2026-06-01
>
> **MVP scope correction:** PRD v3.1, `epics.md` v3.1, and `sprint-change-proposal-2026-05-19.md` supersede this original brief where they differ. Time planner, future date simulation, and favourites are free MVP functionality. Season Pass, Swish payment, paywalls, premium activation, premium recovery, and payment failure flows are preserved only for Future Monetization after MVP adoption.
>
> **Admin removal correction:** Story 3.0 and the 2026-05-30 product decision supersede the original admin/tooling assumptions in this brief. SunnySeat has no admin page, admin venue CRUD/configuration API, admin authentication surface, venue candidate review queue, or admin-operated building upload surface. New and changed venues are handled through direct database insert/update queries only.
>
> **Shadow data correction:** The 2026-06-02 shadow-data trust decision supersedes the original GeoPackage-only building-data assumption. `building_geodata/byggnad_kn1480.gpkg` is a 2D footprint source only; MVP building shadows use filtered central records derived from 2D Lantmäteriet footprints + Göteborg Baskarta 3D linework + Göteborg Höjdmodell 2022 DTM-derived ground elevation inside the EPSG:3007 bbox `x=140000..150000, y=6390000..6410000`.

## 1. Elevator Pitch

A **web app and PWA** that helps **people in Gothenburg** quickly **find outdoor seating in direct sun right now (and soon)** by **combining venue geometry with real-time sun position, building shadow modeling, and weather**, unlike **manually guessing on Google/Maps or calling venues**. MVP monetization is deferred; future revenue hypotheses include B2B partner features and possible consumer Season Pass / Swish after adoption.

## 2. Problem Statement

**Current workflow:** People wander between bars/restaurants or scan generic map apps hoping a patio is sunny.

**Pain points:** No source for "sun right now" on specific patios; building shadows shift by time/season; cloud cover adds uncertainty.

**Impact:** Wasted time and missed moments (especially after work/weekends); lost revenue for venues when sun hits but no one knows.

## 3. Target Users & Jobs-to-Be-Done

**Primary users:** Locals & visitors in Gothenburg who want a sunny patio now or later today.
**Secondary stakeholders:** Venue owners/managers (attract guests when sun arrives), tourism/city guides.
**B2B customers:** Partner venues seeking premium visibility.

**Top Jobs**

1. "Show me nearby patios that are sunny **right now**."
2. "Tell me **when** a specific venue's patio gets sun **today/tomorrow**."
3. "Estimate **confidence** (sun vs. cloud) so I can decide if it's worth going."
4. "Let me **plan ahead** for a specific date." (Free MVP)
5. "Help me **discover** verified outdoor seating places." (Data Moat)

## 4. Value Proposition

**Differentiators:**

- Patio-level sunlight prediction (minute-granularity) using building shadow modeling — no one else does this
- Clear **now/next** timeline + **confidence %** factoring clouds
- Manual database-maintained patio polygons as the source of truth
- **Proprietary data moat:** verified outdoor seating database that Google/Apple Maps don't have
- **B2B revenue:** partner venue features (Golden Pins, Sunny Now badge)

**Must-have:** Venue DB with patio polygons, sun/shadow engine, now/next cards, map UI, confidence %, search/filter, manual data-maintenance discipline, accuracy tracking.

**Growth features:** PWA, consumer verification for existing venues, B2B partners, and future consumer monetization. Time planner, date picker, and favourites are no longer premium features for MVP.

## 5. Competitive / Alternatives

- **Direct competitors:** None focused on patio-sun for Gothenburg.
- **Indirect/DIY:** Google/Maps, weather apps, phone calls, social media posts.
- **Gaps exploited:** No patio-level sunlight + timing; no combined geometry + solar + cloud view; no verified outdoor seating database.

## 6. Scope

### Complete (Epics 1–6)

- Foundation & data setup, building data, server-only service-role infrastructure
- Sun/shadow engine (NREL SPA + 2.5D shadow geometry)
- Weather integration (Met.no), confidence scoring
- Public interface (map, cards, venue pages, feedback)
- Platform migration to Next.js / Vercel / Supabase

### Retired Admin Operations

- Former admin backend/API/auth/dashboard plans are retired.
- Venue and geometry changes are direct database insert/update work.
- No admin front-end rebuild is planned.

### Planned (Epic 8: Front-end Implementation)

- Fresh front-end build from scratch on top of existing backend APIs
- Previous front-end (old Epics 7, 10, 11) was removed

### Planned (Epic 9: Growth & Monetization)

- PWA (installable, offline, app store ready)
- Data moat via maintained venue geometry and consumer feedback signals
- B2B (Golden Pins, Sunny Now badge, partner deep-links)
- Future consumer monetization (Season Pass / Swish, feature boundary TBD after MVP adoption)

### Out of Scope

Notifications, multi-city, ML patio detection, bookings/loyalty, user accounts, and active consumer payment flows. Favourites are now MVP scope.

## 7. Success Metrics

- **Activation:** ≥60% see "sunny patio near me" within 2 minutes
- **Retention:** D7 ≥25%
- **Decision time:** <90s median (open → choose)
- **Accuracy:** ≥85% agreement with user feedback within ±10 min
- **Data moat:** 500+ verified outdoor seating locations
- **B2B:** 10 paid partner venues
- **Premium:** >2% free-to-paid conversion
- **Revenue:** venue sign-ups ≥10/month

## 8. Technical Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16+, React 19, TypeScript, Tailwind CSS, MapLibre GL JS |
| Backend | Next.js API Routes (Vercel serverless) |
| Database | Supabase (PostgreSQL 15 + PostGIS) |
| Sun Engine | TypeScript (NREL SPA + Turf.js shadow geometry) |
| Weather | Met.no Locationforecast 2.0 |
| Payments | Swish Merchant API (Future Monetization only) |
| Hosting | Vercel (serverless, edge, CDN, cron) |
| Testing | Vitest + Playwright |

**Budget:** ≤ $100/month operational cost.
**Building data:** Lantmäteriet GeoPackage already obtained as 2D footprint input only. MVP shadow casters require the combined central open-data pipeline documented in `decisions/shadow-data-trust-realignment.md`: 2D Lantmäteriet footprints + Göteborg Baskarta 3D linework + Göteborg Höjdmodell 2022 DTM-derived ground elevation.

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Shadow accuracy | Filtered central open-data shadow casters + cluster spot-check gates + manual verified overrides + feedback loop |
| Cloud granularity | Met.no nowcast blend, confidence caps, transparency |
| Swish setup delays | Preserve Future Monetization design; do not block MVP planner/date/favourites |
| Manual venue operations | Reviewed direct database insert/update workflow for venue and geometry changes |
| Map performance | Precompute + cache + clustering |
| Seasonality | Tomorrow/weekend planning; future date picker is free MVP scope |

## 10. Milestones

| Phase | Epics | Status | Timeline |
|-------|-------|--------|----------|
| A: Foundation + Engine | 1, 2, 3 | ✅ Complete | Done |
| B: Public Interface + Migration | 4, 5, 6 | ✅ Complete | Done |
| C: Public Launch | 7 | 📋 In Progress | 3–4 weeks |
| D: Admin & Operations | 8 | Retired by 2026-05-30 decision | n/a |
| E: Growth & Monetization | 9 | 📋 Planned | 12–19 weeks |
| **Total remaining** | | | **~18–27 weeks** |
