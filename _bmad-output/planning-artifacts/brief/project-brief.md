# Project Brief — SunnySeat

> Status: **Superseded for MVP scope** · Owner: Analyst · Last updated: 2026-05-19
>
> **MVP scope correction:** PRD v3.1, `epics.md` v3.1, and `sprint-change-proposal-2026-05-19.md` supersede this original brief where they differ. Time planner, future date simulation, and favourites are free MVP functionality. Season Pass, Swish payment, paywalls, premium activation, premium recovery, and payment failure flows are preserved only for Future Monetization after MVP adoption.

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
- Lightweight admin to **manually map** accurate patio polygons (source of truth)
- **Proprietary data moat:** verified outdoor seating database that Google/Apple Maps don't have
- **B2B revenue:** partner venue features (Golden Pins, Sunny Now badge)

**Must-have:** Venue DB with patio polygons, sun/shadow engine, now/next cards, map UI, confidence %, search/filter, admin tools, accuracy tracking.

**Growth features:** PWA, OSM ingestion, crowdsource verification, B2B partners, and future consumer monetization. Time planner, date picker, and favourites are no longer premium features for MVP.

## 5. Competitive / Alternatives

- **Direct competitors:** None focused on patio-sun for Gothenburg.
- **Indirect/DIY:** Google/Maps, weather apps, phone calls, social media posts.
- **Gaps exploited:** No patio-level sunlight + timing; no combined geometry + solar + cloud view; no verified outdoor seating database.

## 6. Scope

### Complete (Epics 1–6)

- Foundation & data setup, building import, admin auth
- Sun/shadow engine (NREL SPA + 2.5D shadow geometry)
- Weather integration (Met.no), confidence scoring
- Public interface (map, cards, venue pages, feedback)
- Platform migration to Next.js / Vercel / Supabase

### Complete (Epic 7: Admin & Operations)

- Admin backend APIs (auth, venue CRUD, building import, accuracy dashboard)
- Admin front-end pages removed — will be rebuilt in Epic 8

### Planned (Epic 8: Front-end Implementation)

- Fresh front-end build from scratch on top of existing backend APIs
- Previous front-end (old Epics 7, 10, 11) was removed

### Planned (Epic 9: Growth & Monetization)

- PWA (installable, offline, app store ready)
- Data moat (OSM ingestion, crowdsource verification)
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
**Building data:** Lantmäteriet GeoPackage (.gpkg) already obtained.

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Shadow accuracy | LOD1 heuristic heights + admin overrides + feedback loop |
| Cloud granularity | Met.no nowcast blend, confidence caps, transparency |
| Swish setup delays | Preserve Future Monetization design; do not block MVP planner/date/favourites |
| Admin workload | Top 100 venues + OSM bulk import + crowdsource |
| Map performance | Precompute + cache + clustering |
| Seasonality | Tomorrow/weekend planning; future date picker is free MVP scope |

## 10. Milestones

| Phase | Epics | Status | Timeline |
|-------|-------|--------|----------|
| A: Foundation + Engine | 1, 2, 3 | ✅ Complete | Done |
| B: Public Interface + Migration | 4, 5, 6 | ✅ Complete | Done |
| C: Public Launch | 7 | 📋 In Progress | 3–4 weeks |
| D: Admin & Operations | 8 | 📋 Planned | 3–4 weeks |
| E: Growth & Monetization | 9 | 📋 Planned | 12–19 weeks |
| **Total remaining** | | | **~18–27 weeks** |
