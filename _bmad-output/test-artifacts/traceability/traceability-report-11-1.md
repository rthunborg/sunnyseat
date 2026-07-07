---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-07-04'
mode: advisory
scope: story
story: '11.1'
---

# Traceability Report — Story 11.1 (Client-Side Day-Series — Instant Time Scrubbing & Fast Date Switch)

**Pass type:** ADVISORY, story-scoped. Surfaces AC → test coverage for review. Non-blocking; no gate opened.

## Advisory Verdict: PASS

All four ACs have covering automated tests at the appropriate level; the two live/visual halves are correctly and explicitly deferred (AC4 live p95 → maintainer handoff; Design-Gate screenshot → Story 11.7 rebaseline checkpoint) exactly as the ACs' own "Reading" clauses prescribe. Every AC's CI-enforceable portion is covered and green. The residual gaps are advisory-only (see below) — the CI-provable invariants are all present.

## Coverage Summary

- Total ACs traced: 4 (AC1–AC4)
- Fully covered (CI-enforceable portion): 4 / 4 (100%)
- P0 coverage: 100%
- Deferred-by-design (not a gap): AC4 live wall-clock p95, Design-Gate visual screenshot
- Day-series test files discovered: 10 (5 un-skipped ATDD scaffolds + 4 coverage-expansion suites + 1 Playwright e2e); 55 vitest day-series tests run green locally.

## Discovered Tests (by level)

| Level | File | Covers |
|---|---|---|
| Unit (client, pure) | `test/unit/utils/venue-day-series.derivation.atdd.test.ts` | AC1 — per-step derivation for all 5 output surfaces (marker %, pin state, quick-info figure, ordering input, obscured presentation); purity/offline (no fetch); client-safe source-scan (no server-only import) |
| Unit (client, pure) | `test/unit/utils/venue-day-series.edge.test.ts` | AC1 — null/fallback branches (undefined/empty/non-array/sparse series), snap + planner-boundary + NaN clamp |
| Unit (engine) | `test/unit/services/sun-engine.day-series-parity.atdd.test.ts` | AC1 — 61-step coverage; **byte-parity** vs single-instant compute at requestedAt + 4 sampled steps; Epic-10 gate per-step (cloud gate + never-gate-non-sunlit); explicit `isRaining` thread under nowcast horizon |
| Unit (cache, fake-timer) | `test/unit/services/sun-engine-day-series-cache.atdd.test.ts` | AC2 — same (venue,day,weather-bucket) served from cache; new weather bucket recomputes; degraded (null-buildings) not pinned; cached==uncached |
| Unit (cache, pure key) | `test/unit/services/sun-engine-cache.day-series-key.test.ts` | AC2 — `weatherRefreshBucketMs` floor/boundary; `sunDaySeriesCacheKey` disambiguation (venue/day/bucket/elevation), NOT keyed on requested instant |
| API/contract | `test/unit/api/venues-route-day-series.atdd.test.ts` | AC1+AC2 — real-engine list DTO carries `sunDaySeries` (61 steps, %+status); seed (flag OFF) + `[slug]` detail byte-identical (no series); ETag/304; **gzipped payload measured (1769 B) + guard (8000 B)** |
| API/contract | `test/unit/api/venues-route-day-series-degrade.test.ts` | AC1 — degrade path: producer throw → no 500, series omitted, per-venue isolation, ETag still valid |
| Hook (integration) | `test/unit/queries/useVenueSearch.day-series-key.test.tsx` | AC1(zero-fetch)+AC3 — `isLiveNow` wiring: live omits date/time + polls; live→off-live same-date flip = 0 additional fetches; off-live sends date+time + no poll |
| Component | `test/components/MapView.test.tsx` (Story 11.1 additions) | AC1/AC3 — `isLiveNow:true` on live-today (date in key, request omits it); committed future date → `isLiveNow:false` + key flips (the one allowed fetch) |
| E2E (Playwright) | `test/e2e/epic-11-scrub-zero-fetch.spec.ts` | AC1(R-001)+AC3 — settled same-date scrub = **0** `/api/venues` requests; date change = **1**; markers persist (keyed by id, no remount); dim+spinner overlay visible in flight; no live api.met.no |

Unit `venue-day-series-query-key.atdd.test.ts` also covers AC1/AC3 at the pure query-key-builder level (same-date scrub = same key; date/location change = different key).

## Traceability Matrix (AC → tests)

### AC1 — Day-series in list DTO; settled time change fetches nothing — **FULL (P0)**
- Series shape/61-step/parity/per-step-gate/rain → `sun-engine.day-series-parity.atdd`
- Client derivation of every UI surface + purity + client-safety → `venue-day-series.derivation.atdd` + `venue-day-series.edge`
- DTO carries series on real path; seed/detail byte-identical; ETag → `venues-route-day-series.atdd` (+ degrade isolation in `...degrade`)
- Zero-fetch query key (same-date scrub) → `venue-day-series-query-key.atdd` (pure), `useVenueSearch.day-series-key` (hook), `MapView.test.tsx` (component), `epic-11-scrub-zero-fetch.spec` (e2e, request-count=0)
- Heuristics: endpoint (`/api/venues` real + seed + `[slug]`) covered; error-path (degrade/throw, null/sparse series) covered. Not happy-path-only.

### AC2 — Series cached server-side; payload measured and bounded — **FULL (P0/P1)**
- Cache per (venue,date,weather-bucket); recompute on new bucket; degraded-not-pinned → `sun-engine-day-series-cache.atdd`
- Key builders / bucket floor / no per-instant keying → `sun-engine-cache.day-series-key`
- Payload measured (1769 B gzipped, 7 venues×61 steps) + guard (8000 B) + ETag/304 → `venues-route-day-series.atdd`

### AC3 — Date/location change keeps markers mounted under dim + spinner — **FULL (P0)** (visual screenshot deferred by design)
- Key flips only on date/location change → `venue-day-series-query-key.atdd`, `useVenueSearch.day-series-key`, `MapView.test.tsx`
- Markers persist (keyed by id, no remount) + dim+spinner overlay visible while single request in flight → `epic-11-scrub-zero-fetch.spec` (e2e)
- Design-Gate screenshot of the dim+spinner state → **deferred to Story 11.7 consolidated rebaseline** (dev forbidden from self-blessing PNGs; matches AC3 Design-Gate note). This is a prescribed deferral, not a coverage gap.

### AC4 — Live perf: date change < 3 s p95, scrub = 0 requests — **PARTIAL (by design)**
- **Request-count invariant** (scrub = 0, date change = 1) — the CI-enforceable half — is FULLY covered → `epic-11-scrub-zero-fetch.spec` (e2e) + the query-key/hook units. Story 11.8 owns the standing regression guard + real-touch profile.
- **Wall-clock p95** on the LIVE deployment is explicitly NOT a CI gate (AC4 "Reading" clause) → handed to the maintainer as a `needs-human` step with a full protocol in the Dev Agent Record. Correctly NOT fabricated.

## Advisory Gaps (non-blocking — surfaced for review)

1. **AC3 date-change overlay + marker-persistence has E2E-only coverage, no component-level assertion.** The `date-change-overlay` testid, the "markers stay mounted through a date change", and the client per-step **derivation seam through MapView** (`applyDaySeriesDerivation` over `rawVenues` and `networkFavouriteRows`) are asserted only in the Playwright e2e (`epic-11-scrub-zero-fetch.spec`), which CI runs against `next dev`. `MapView.test.tsx` covers the `isLiveNow`/date-in-key contract but does **not** assert (a) the overlay renders while `isFetching && isPlaceholderData`, (b) that a scrub changes rendered pin %/status from the series, or (c) that favourite rows derive from the series. If the e2e ever flakes or is quarantined, AC3's overlay/persistence + AC1's MapView derivation seam lose their only guard. Advisory: a fast jsdom component test for the overlay-on-placeholder-data state and for the scrub-changes-derived-value seam would harden the pyramid. (Review Finding already fixed the favourites-derivation code path; a regression test for it specifically is not present.)

2. **AC4 live p95 is a genuine open item (by design).** Not a test gap — it needs the maintainer's live deployment. Tracked as `needs-human` with protocol; Story 11.8 will measure it. No action here beyond visibility.

3. **AC3 "material location change" fetch-key path is unit-only.** `venue-day-series-query-key.atdd` proves a coords change flips the key; there is no e2e/component test that a location change actually triggers exactly one fetch + overlay (only the date-change path is exercised end-to-end). Low risk (same key mechanism as date), advisory only.

## Recommendations (advisory)

- LOW: add a component-level test for the date-change overlay (visible on placeholder data) and the MapView per-step derivation seam so AC1/AC3 are not solely e2e-dependent (harden gap 1).
- INFO: ensure Story 11.8 promotes `epic-11-scrub-zero-fetch.spec` into the standing request-count guard and captures the AC4 live p95 (already the planned owner).
- No P0/P1 remediation required. No gate opened.

## Gate Decision (advisory only — NOT persisted as a quality gate)

- P0 coverage: 100% → MET
- Overall CI-enforceable coverage: 100% → MET
- Advisory decision: **PASS** — proceed; the two deferred halves (live p95, visual screenshot) are prescribed hand-offs, not blockers.
