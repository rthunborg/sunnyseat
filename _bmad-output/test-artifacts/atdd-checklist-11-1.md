---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04-generate-tests'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-07-04'
inputDocuments:
  - '_bmad-output/implementation-artifacts/11-1-client-side-day-series-instant-time-scrubbing.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-11.md'
  - 'nextjs-app/test/unit/services/sun-engine-caching.atdd.test.ts (house-style precedent)'
  - 'nextjs-app/test/unit/api/venues-route-caching.atdd.test.ts (house-style precedent)'
  - 'nextjs-app/test/e2e/epic-10-weather-matrix.spec.ts (page.route mock DTO precedent)'
  - 'nextjs-app/lib/services/sun-engine.ts / sun-engine-cache.ts / lib/types/api.ts / lib/query-keys.ts / lib/utils/time-planner.ts'
---

# ATDD Checklist: Story 11.1 — Client-Side Day-Series (Instant Time Scrubbing & Fast Date Switch)

## TDD Red Phase (Current)

All acceptance scaffolds below are authored in the **red phase**: every `describe`/`it`/`test`
block is `.skip`-ed and asserts the EXPECTED post-implementation behaviour. They compile against the
current tree (imports resolve, or are marked as "will exist after the dev creates the module" — see
each file's header) and stay green-because-skipped in CI until the dev un-skips them task-by-task as
each goes green. No latency timers (project lesson: wall-clock is flaky); the acceptance signal is
call-count / request-count / cache-key behaviour / byte-parity / payload-byte-size — all deterministic.

### Step 1 — Preflight & Context

- **Detected stack:** `fullstack` (Next.js app + API routes under `nextjs-app/`; `playwright.config.ts`
  + `vitest.config.ts` both present).
- **Prerequisites:** Story approved with clear ACs (AC1–AC4 + Design Gate). Playwright + Vitest configured.
  ✅ Satisfied.
- **Framework & patterns loaded:** Vitest for unit/component/API-contract; Playwright for e2e. Reused
  house-style precedents: `sun-engine-caching.atdd.test.ts` (adapter-boundary mock + fake-timer cache),
  `venues-route-caching.atdd.test.ts` (route ETag/304 + seed-byte-identical), `epic-10-weather-matrix.spec.ts`
  (`page.route` DTO fulfillment, no live Met.no, `?_time=` forcing).
- **TEA config flags:** `test_stack_type: auto` → fullstack; `tea_use_playwright_utils: true`;
  `tea_execution_mode: auto` → resolved **sequential** (no subagent runtime here — scaffolds authored inline).

### Step 2 — Generation Mode

- **Mode:** AI generation (ACs are clear; scenarios are data/perf/contract + one interaction seam).
  No live-browser recording — the e2e uses the established `page.route` mocked-DTO pattern, not recorded selectors.

### Step 3 — Test Strategy (AC → level → priority)

| AC | Scenario | Level | Priority | Risk | Scaffold file |
| -- | -------- | ----- | -------- | ---- | ------------- |
| AC1 | Client derives %/status/pin/ordering/obscured for ANY planner time from the cached series (pure, offline) | Unit | P0 | R-001, R-003 | `test/unit/utils/venue-day-series.derivation.atdd.test.ts` |
| AC1 | Per-step series == old single-instant compute at each instant; Epic-10 gate applies PER STEP (100%-cloud/rain gates that step, never only "now"; below-horizon/shaded never gated); `isRaining` threaded explicitly per step | Unit | P0 | R-003, R-005 | `test/unit/services/sun-engine.day-series-parity.atdd.test.ts` |
| AC1 | Real-engine list response carries `sunDaySeries` (one entry per 15-min step across 06:00–21:00) each with `sunExposurePercent` + `currentSunStatus`; seed/fixture path + `[slug]` detail DTO byte-identical (no series); ETag/304 holds; **gzipped payload measured + guarded** | API | P0 | R-003, R-012 | `test/unit/api/venues-route-day-series.atdd.test.ts` |
| AC1 | Settled same-date time scrub does NOT change the TanStack query key / issues zero `/api/venues` requests | Unit + E2E | P0 | R-001, R-002 | `venue-day-series-query-key.atdd.test.ts` (unit) + `epic-11-scrub-zero-fetch.spec.ts` (e2e) |
| AC2 | Series cached per (venue, date, weather-refresh bucket); a new weather bucket recomputes the whole series; a degraded (null-buildings) series is NOT cached | Unit (fake-timer) | P1 | R-012 | `test/unit/services/sun-engine-day-series-cache.atdd.test.ts` |
| AC3 | Date change (or material location change) keeps markers MOUNTED (keyed by venue id) under a dim + centered spinner overlay; fires EXACTLY ONE request; markers update in place | E2E | P0 | R-005 | `epic-11-scrub-zero-fetch.spec.ts` (date-change describe) |
| AC4 | LIVE date-change p95 < 3 s + scrub = 0 requests | Manual (live) | P3 | R-014 | **needs-human** — protocol handed to maintainer (see below); NOT a CI gate |

- **Red-phase requirement confirmed:** every block designed to FAIL before implementation (the module
  `lib/utils/venue-day-series.ts` does not yet exist; `sunDaySeries` is not yet on the DTO; the query key
  still carries the deferred planner time). All `.skip`-ed.
- **Dedup discipline (from the epic test design):** client series math tested at UNIT only; DTO contract +
  payload at API only; the request-count invariant at E2E only. The one deliberate defence-in-depth is the
  R-001 zero-fetch guard (asserted at BOTH the query-key unit level AND e2e), which the epic explicitly wants
  double-covered.

## Acceptance Criteria Coverage

- **AC1 (day-series in DTO; settled time change fetches nothing):** ✅ covered — derivation unit (5 outputs),
  engine parity unit, API contract, query-key unit + e2e zero-fetch.
- **AC2 (series cached server-side; payload measured & bounded):** ✅ covered — fake-timer cache unit +
  the API payload-byte-size measurement/guard.
- **AC3 (date/location change keeps markers mounted under dim + spinner):** ✅ covered — e2e marker-persistence
  + exactly-one-request + overlay presence (code-level testid asserts, not the LLM eyeball).
- **AC4 (live perf p95 < 3 s):** ⚠️ **needs-human** — cannot run in CI/this session; protocol below.

## Generated Files (all RED / skipped)

1. `nextjs-app/test/unit/utils/venue-day-series.derivation.atdd.test.ts` — P0 client-derivation (pure/offline)
2. `nextjs-app/test/unit/services/sun-engine.day-series-parity.atdd.test.ts` — P0 engine per-step parity + per-step gate
3. `nextjs-app/test/unit/api/venues-route-day-series.atdd.test.ts` — P0 DTO contract + seed byte-identical + ETag + payload size
4. `nextjs-app/test/unit/services/sun-engine-day-series-cache.atdd.test.ts` — P1 fake-timer cache bucket
5. `nextjs-app/test/unit/utils/venue-day-series-query-key.atdd.test.ts` — P0 query-key decouple (scrub leaves the key unchanged)
6. `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts` — P0 e2e: scrub = 0 requests / date change = 1 + markers persist + overlay

> **Note on the e2e / Story 11.8 boundary:** the *standing* request-count + marker-persistence guards are
> OWNED by Story 11.8. This spec provides the 11.1 seam-provable subset (scrub=0, date-change=1, markers keyed
> by id, overlay present) so the seam is testable now; 11.8 later promotes/extends it with the real-touch
> profile. The spec is `test.describe.skip`-ed until 11.1 lands.

## Next Steps (TDD Green Phase)

After implementing Story 11.1 (per its Tasks 1–7):

1. Un-skip each scaffold block as the corresponding task goes green (derivation → parity → DTO → cache →
   query-key → e2e), NOT all at once.
2. Run `npx vitest run` (unit/component/API) + `npx playwright test` (e2e) → verify PASS (green phase).
3. **Record the measured gzipped `sunDaySeries` payload byte size** in the Dev Agent Record and set the
   API-test payload guard from the measurement (the ceiling is `UNKNOWN` by design — see the `PAYLOAD_CEILING`
   TODO in the API scaffold). If it measures large, trim the field set / resolution in-story before merge.
4. If a parity block fails, it is a FEATURE bug (a per-step value diverged from the single-instant compute) —
   FIX the implementation, never rebaseline the parity expectation.
5. Record baseline→final vitest count in the Dev Agent Record (count must increase, none dropped).

## Implementation Guidance (from the scaffolds)

- **New module the dev must create:** `lib/utils/venue-day-series.ts` — a PURE, client-safe helper
  `deriveVenueSunAtMinutes(series, selectedMinutes)` returning `{ sunExposurePercent, currentSunStatus }`
  by exact-match on the snapped 15-min step. MUST NOT import `sun-engine.ts`/`sun-engine-cache.ts`/`met-no-service`.
- **DTO change:** add OPTIONAL `sunDaySeries?: { minutes: number; sunExposurePercent: number; currentSunStatus: VenueSunStatus }[]`
  to `VenueDataDto` in `lib/types/api.ts`; populate ONLY on the `useRealEngine` list branch of `app/api/venues/route.ts`.
- **Engine:** a per-step day-series producer reusing the SAME shared `buildings` set + `getForecast`/`getNowcast`
  inputs; call the existing `applyCloudGate` per step (do NOT re-implement); thread `isRaining` explicitly per step
  under the `NOWCAST_HORIZON_MS` horizon rule.
- **Cache:** a day-series `TtlCache` in `sun-engine-cache.ts` keyed on (venue.id, Stockholm day, weather-refresh
  bucket, elevation variant) — NOT the per-instant 15-min `requestedAt` bucket; extend `clearSunEngineCachesForTests`.
- **Query key:** decouple the scrub time from `queryKeys.venues.planner(...)` so a same-date time change leaves the
  key unchanged (date + coords stay in the key).

## Live-Perf Handoff (AC4) — needs-human

The AC4 wall-clock date-change p95 (< 3 s, stretch < 1.5 s warm-cache) is measured on the LIVE deployment and
RECORDED in the story's Dev Agent Record — it is NOT a CI gate and cannot run in this session. Hand the maintainer:

- **URL:** the live Vercel Production deployment (real data path — Supabase venue store + real sun engine).
- **Method:** with the map at a known origin, change the planner DATE (today → today+1) and measure end-to-end
  wall-clock to the markers updating in place; repeat ≥10 trials; report p95 (note warm vs cold cache per trial).
  Separately, scrub the time slider across several settled steps and confirm the network panel shows **0**
  `**/api/venues*` requests.
- **Record:** before/after p95 + the 0-request scrub observation + the measured gzipped `sunDaySeries` payload
  byte size, in the story's Dev Agent Record. A p95 miss is a triage item, not a fabricated pass (Epic-10
  live-spot-check handoff precedent). The CI-enforceable half (scrub=0 / date-change=1) is Story 11.8's standing guard.

## Validation (Step 5)

- [x] Prerequisites satisfied (approved ACs, frameworks configured).
- [x] Test files created correctly (6 files; each header explains scope, red-phase status, mock boundary).
- [x] Checklist maps every AC to a level + priority + scaffold (table above).
- [x] All tests designed to FAIL before implementation (all `.skip`-ed; assert EXPECTED behaviour; no placeholder `expect(true)`).
- [x] No CLI browser sessions opened (AI generation only — no orphaned browsers).
- [x] Temp artifacts stored under `{test_artifacts}` (this checklist) + `nextjs-app/test/**` (the scaffolds), not random locations.

## Key Risks / Assumptions

- **Payload ceiling is UNKNOWN by design** — the API scaffold leaves a `PAYLOAD_CEILING` TODO the dev sets from
  the real measurement. Do not invent a number.
- **Parity is byte-parity, not a rebaseline** — a per-step diff from the single-instant compute is a FAIL.
- **The e2e overlay assertion is code-level** (testid + request-count), NOT the LLM visual eyeball (which ignores
  sizing/spacing). The maintainer-blessed reference-PNG for the new dim+spinner state is owned by Story 11.7.
- **No live Met.no in any test** — the day-series is served from the seed path (flag OFF) or the mocked
  `/api/venues` `page.route` DTO in e2e.

**Next recommended workflow:** implement Story 11.1 (`dev-story`), un-skipping each scaffold as it goes green;
then `*automate` for broader coverage and `*trace` at the Epic-11 boundary.
