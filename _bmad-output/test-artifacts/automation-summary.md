---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-identify-targets'
  - 'step-03-generate-tests'
  - 'step-03c-aggregate'
  - 'step-04-validate-and-summarize'
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-07-06T11-9'
inputDocuments:
  - '_bmad-output/implementation-artifacts/11-9-venue-data-model-cleanup.md'
  - 'nextjs-app/lib/utils/opening-hours.ts'
  - 'nextjs-app/lib/services/venue-store.ts'
  - '_bmad-output/implementation-artifacts/11-6-venue-detail-clean-first-paint-content-polish.md'
  - 'nextjs-app/components/composed/venue/VenueDetailContent.tsx'
  - 'nextjs-app/components/custom/feedback/ReviewFlow.tsx'
  - 'nextjs-app/components/custom/map/MapView.tsx'
  - 'nextjs-app/components/custom/venue/ForcedVenueDetailInitialFrame.tsx'
  - 'nextjs-app/test/components/VenueDetailContent.test.tsx'
  - 'nextjs-app/test/components/ReviewFlow.test.tsx'
  - 'nextjs-app/test/unit/removed-i18n-keys.test.ts'
  - 'nextjs-app/test/unit/venue-detail-label-prune.test.ts'
  - '_bmad-output/implementation-artifacts/10-4-rain-now-signal-met-no-nowcast.md'
  - 'nextjs-app/lib/weather/nowcast-service.ts'
  - 'nextjs-app/test/unit/weather/nowcast-service.cloud-gate.atdd.test.ts'
  - '_bmad-output/implementation-artifacts/10-1-cloud-gated-sun-state-weather-truth-fixes.md'
  - '_bmad-output/implementation-artifacts/10-2-sun-behind-clouds-two-signal-ui-state.md'
  - '_bmad-output/implementation-artifacts/10-3-layered-cloud-detail-met-no-complete-endpoint.md'
  - 'nextjs-app/lib/solar/effective-cloud-cover.ts'
  - 'nextjs-app/test/unit/solar/effective-cloud-cover.test.ts'
  - 'nextjs-app/lib/services/sun-engine.ts'
  - 'nextjs-app/lib/solar/confidence-calculator.ts'
  - 'nextjs-app/lib/weather/met-no-service.ts'
  - 'nextjs-app/lib/utils/sun-status-presentation.ts'
  - 'nextjs-app/components/custom/venue/VenueList.tsx'
  - 'nextjs-app/components/composed/venue/VenueCard.tsx'
  - 'nextjs-app/components/composed/venue/VenueQuickInfo.tsx'
  - 'nextjs-app/components/composed/venue/VenueDetailContent.tsx'
  - 'nextjs-app/components/composed/venue/SunTimeline.tsx'
  - 'nextjs-app/test/unit/services/sun-engine.cloud-gate.atdd.test.ts'
  - 'nextjs-app/test/unit/weather/met-no-service.cloud-gate.atdd.test.ts'
  - 'nextjs-app/test/unit/confidence-calculator.cloud-gate.atdd.test.ts'
  - 'nextjs-app/test/unit/confidence-calculator.test.ts'
  - 'nextjs-app/test/unit/api/venues-route.cloud-gate.atdd.test.ts'
  - 'nextjs-app/test/unit/api/venues-route-real-engine.test.ts'
  - 'nextjs-app/test/unit/sun-status-presentation.test.ts'
  - 'nextjs-app/test/components/VenueList.test.tsx'
  - 'nextjs-app/test/components/VenueCard.test.tsx'
  - 'nextjs-app/test/components/VenueDetailContent.test.tsx'
  - '_bmad-output/implementation-artifacts/11-7-hygiene-deferred-debt.md'
  - 'nextjs-app/vercel.json'
  - 'nextjs-app/docs/vercel-deployment.md'
  - '.gitattributes'
  - 'nextjs-app/test/unit/map-legibility-tokens.automate.test.ts (precedent)'
  - '_bmad/tea/config.yaml'
---

# Automation Expansion Summary — Story 10.1 (Cloud-Gated Sun State & Weather-Truth Fixes)

## Preflight & Context
- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) + Playwright present. Verified — no HALT.
- **Stack:** fullstack (Next.js frontend + server-only sun engine). Story 10.1 is the ENGINE half of Epic 10 — server-only, env-gated (`SUNNYSEAT_SUN_ENGINE=real`), zero UI. All targets are unit-level engine surfaces; no e2e (that is Story 10.5).
- **Mode:** BMad-Integrated (story with AC1–AC4 + rich Dev Notes / Test Surfaces). Sequential generation (single cohesive engine surface).

## Existing coverage reviewed (to avoid duplication)
The four AC-driven ATDD scaffolds + two supporting suites already prove all four ACs on their headline paths:
- `sun-engine.cloud-gate.atdd.test.ts` — `applyCloudGate` (Sunny/Partial-above ⇒ gated, NoSun/Shaded untouched, unknown/null no-gate, exact `>=` boundary), end-to-end gate + geometric-layer preservation, cache consistency.
- `met-no-service.cloud-gate.atdd.test.ts` — missing `cloud_area_fraction` ⇒ unknown, never 0/100/clear; known-cloud path preserved.
- `confidence-calculator.cloud-gate.atdd.test.ts` + `confidence-calculator.test.ts` — FR12 cloud sensitivity, **monotonicity across [0,25,50,75,100]**, unknown-neutral, byte-identical no-weather pin. Assessed as comprehensive — NOT expanded.
- `venues-route.cloud-gate.atdd.test.ts` + `venues-route-real-engine.test.ts` — sanitizer round-trip + `SUN_STATUS_ORDER` sort-rank invariant (no NaN), CloudObscured sorts between Partial and Shaded through the route.

## Gaps Identified & Filled
New file: **`nextjs-app/test/unit/services/sun-engine.cloud-gate.coverage.test.ts`** (9 tests). Residual branch/edge gaps the scaffolds intentionally left, no duplication:

| # | Gap | Priority |
| - | --- | -------- |
| 1 | `skyConditionFromCloudCover(undefined)` ⇒ `'unavailable'` — AC2 unknown branch of the pure mapper (existing pure-mapper test only covers 0..100 numeric boundaries; `undefined` never asserted). Also pins that `undefined` ≠ known `0`. | P1 |
| 2 | `applyCloudGate` idempotency — `CloudObscured` in ⇒ stays `CloudObscured` under overcast, below-threshold, and unknown (helper documents "already gated stays gated" but ATDD never re-feeds it). | P2 |
| 3 | `applyCloudGate` Partial-below-threshold stays `Partial` (ATDD only drove the Sunny-below case). | P2 |
| 4 | `applyCloudGate` defensive out-of-range cover: `>100` still gates (`>=` semantics), `<0` does not, no throw. | P3 |
| 5 | End-to-end FORECAST gating — overcast `isForecast:true` slice gates to `CloudObscured` (geometric layer preserved); clear forecast does not gate. Pins the Story-10.4 seam per Dev Notes ("Gating on forecast cloud is correct and intended… do not special-case forecast here"). Injected via `getForecastOverride` — the documented seam, no live Met.no. | P1 |

Mock boundary mirrors the ATDD scaffold (deepest adapters only). Threshold assertions read `CLOUD_GATE_THRESHOLD_PERCENT` so a re-tune cannot break them (epic-10 test-design "assert relative behaviour" discipline).

## Validation / Gate
- `npx tsc --noEmit` → **0 errors**
- `npx eslint <new file>` → **0 errors**
- `npx vitest run` → **112 files / 993 tests, all passing, 0 skipped** (story HEAD was 111 files / 984 tests → net **+1 file / +9 tests**, none dropped, none regressed).
- Default seed path (flag OFF, as CI runs it) untouched — no CI-path change; test-only addition.
- (`Not implemented: navigation to another Document` in vitest output is a benign pre-existing jsdom log, not a failure.)

---

# Automation Expansion Summary — Story 10.2 ("Sun Behind Clouds" Two-Signal UI State)

## Preflight & Context
- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) + Playwright present. Verified — no HALT.
- **Stack:** fullstack (Next.js). Story 10.2 is the **UI half** of Epic 10 — 100% client render + i18n + one dev-only forced-state normalizer; zero engine/route/store change (10.1 owned all of that). All targets are component- and unit-level. No new API endpoint or e2e journey; the obscured e2e/axe surface already exists (Task 5). E2E weather-mock remains Story 10.5.
- **Mode:** BMad-Integrated (story with AC1–AC4 + rich Dev Notes / Test Surfaces). **Execution mode: sequential** — a narrowly-scoped, purely-additive coverage top-up on existing component/unit surfaces; no API/E2E fan-out to farm to subagents, so tests were authored inline (the deterministic sequential fallback of step-03).

## Existing coverage reviewed (to avoid duplication)
Story 10.2 shipped strong AC-headline coverage already — NOT re-created:
- `sun-status-presentation.test.ts` — `toSunStatusToken` full mapping + distinctness, `isObscuredSunStatus` (incl. `undefined`), `skyConditionCopy` (known + `unavailable`/`undefined`/`rain`/unknown → null). **Comprehensive — not expanded.**
- `VenueList.test.tsx` — obscured sort RELATIVE ordering both ways (high-solläge obscured > low-solläge partial; low-solläge obscured < partial), muted label, single-aria de-dup — via full render.
- `VenueCard.test.tsx` — four states distinct on the compact card, AC2 position reframe on the non-compact card.
- `VenuePin` / `VenuePinLayer` — obscured pill distinct + no selection-morph; `pinObscuredAria` (exactly once, solläge preserved).
- `VenueQuickInfo` / `VenueDetailContent` — muted headline + sky line + `unavailable`→no-line + sunny-unchanged behaviour gate.
- `axe.spec.ts` (desktop) — obscured quick-info + detail scans active + green.

## Gaps Identified & Filled
Residual branch/boundary gaps the AC-headline (render-level) tests left, no duplication:

| # | Gap (previously uncovered) | Level | Priority | Where |
| - | -------------------------- | ----- | -------- | ----- |
| 1 | `getVenueSunRankForList` exact **tie boundaries**: 100%-solläge obscured **ties** Sunny (rank 2); 50% **ties** Partial (rank 1) → the render sort tests only proved strict `>`/`<`, never the equal-rank case where the **distance tiebreak** decides. | Unit | P1 | `VenueList.rank.test.ts` |
| 2 | `getVenueSunRankForList` **non-finite / undefined solläge** on an obscured venue → **0, never NaN** (a NaN rank would corrupt the `Array.sort` comparator → unstable order). | Unit | P1 | `VenueList.rank.test.ts` |
| 3 | `getVenueSunRankForList` **out-of-range clamp**: >100 does not exceed the Sunny(2) ceiling; <0 clamps to 0. | Unit | P2 | `VenueList.rank.test.ts` |
| 4 | `isVenueSunnyForList` **direct** assertion: obscured → `false` even at 100% solläge (the AC1 amber-chrome guard, only tested indirectly before). | Unit | P1 | `VenueList.rank.test.ts` |
| 5 | `sortVenuesForList` tie broken by **distance** for equal-rank obscured/Sunny (integration of #1). | Component/int | P2 | `VenueList.rank.test.ts` |
| 6 | `VenueCard` **confidence-chip suppression under the gate** (Completion Note #2 / AC1): the amber `text-amber-text` chip is hidden for obscured — a regression re-adding amber chrome would slip past the label-only headline tests. | Component | P1 | `VenueCard.test.tsx` |
| 7 | `VenueCard` obscured **thumbnail badge** uses `bg-pin-obscured` (cloud icon), never the amber sun badge (AC1). | Component | P2 | `VenueCard.test.tsx` |
| 8 | `VenueDetailContent` **fallback-timeline potential** (Completion Note #3 / AC2): an obscured venue with a `sunWindow` and **no loaded `detail`** → `timelineFromListVenue` maps the window to `Partial` so the "when it clears" potential renders (labelled "Delvis sol …") rather than a transparent shaded bar. The real-detail obscured test always passes an explicit `detail`, so this fallback branch was uncovered. | Component | P1 | `VenueDetailContent.test.tsx` |

All rank assertions are RELATIVE / boundary, never an absolute magic number (epic-10 "a gate re-tune survives" convention). No live Met.no / real-network weather in any added test; obscured state is constructed purely from props/fixtures.

## Files Created / Updated
- **NEW** `nextjs-app/test/components/VenueList.rank.test.ts` — 10 tests: obscured-solläge rank ties/clamps/NaN-guard + distance-tiebreak sort integration + `isVenueSunnyForList` amber guard (gaps #1–#5, #4).
- **UPDATED** `nextjs-app/test/components/VenueCard.test.tsx` — +2 tests: confidence-chip suppression under the gate; muted-slate thumbnail badge (gaps #6, #7).
- **UPDATED** `nextjs-app/test/components/VenueDetailContent.test.tsx` — +1 test: obscured fallback-timeline potential renders as Partial, not a shaded bar (gap #8).

## Validation / Gate
- `npx tsc --noEmit` → **0 errors**
- `npx eslint <changed test files>` → **0 errors / 0 warnings**
- `npx vitest run` → **114 files / 1026 tests, all passing, 0 skipped** (Story 10.2 completion HEAD was 113 files / 1013 tests → net **+1 file / +13 tests**, none dropped, none regressed).
- Test-only addition — no source, engine, route, store, i18n, or CI-path change.
- Observation (not in scope for this coverage pass): `VenueQuickInfo` keeps the amber `text-amber-text` confidence chip visible on an obscured card (line ~278), unlike `VenueCard` which suppresses it (Completion Note #2). Both are AA-gated by the existing desktop axe scan, but this is a minor amber-chrome inconsistency under the gate worth a maintainer glance.

## Next recommended workflow
`trace` (traceability matrix / quality-gate decision for Story 10.2) or `test-review` (quality validation of the new + existing obscured suites).

---

# Automation Expansion Summary — Story 10.3 (Layered Cloud Detail — Met.no `complete` + Effective Cover)

## Preflight & Context
- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) + Playwright present. Verified — no HALT.
- **Stack:** frontend/Next.js with server-only sun engine. Story 10.3 is **Tier 1** of Epic 10 "Honest Sky" — a backend/data story: switches the Met.no fetch to the `complete` endpoint, carries the three-layer cloud split on `WeatherSlice`, and feeds a layer-weighted **effective cloud cover** into BOTH the Story 10.1 gate and the FR12 confidence blend. **NO UI / i18n / e2e** (the deterministic mocked-weather e2e matrix is Story 10.5). All targets stayed UNIT-level.
- **Mode:** BMad-Integrated (story with AC1–AC3 + rich Dev Notes / Test Surfaces). **Sequential** — a narrow, additive top-up on the four existing 10.3 unit surfaces; no API/E2E fan-out to farm out.

## Existing coverage reviewed (to avoid duplication)
The story shipped a strong AC-driven matrix — NOT re-created:
- `effective-cloud-cover.test.ts` (14) — 100%-high-not-gating / 100%-low-gating / medium-gating / ordering / 100/100/100-clamp / 0-clear / full-vs-partial fallback / total-undefined ⇒ undefined / null slice.
- `sun-engine.cloud-gate.atdd.test.ts` [10.3 block, 3] — end-to-end cirrus-doesn't-gate (skyCondition still overcast) / low-deck-gates / partial-split Tier-0 fallback.
- `met-no-service.cloud-gate.atdd.test.ts` [10.3 block, 4] — `complete` URL / full-split mapping / partial-split ⇒ undefined bands / compact-shaped total-only.
- `confidence-calculator.cloud-gate.atdd.test.ts` [10.3 block, 3] — cirrus > low-deck confidence ordering / partial-split ≡ Tier-0 / unknown stays neutral. **Assessed comprehensive — not expanded.**

## Gaps Identified & Filled
Residual algebraic edges + per-entry-mapping gaps the AC matrix intentionally left. All RELATIVE to the weight constants / threshold (epic-10 "a re-tune survives" discipline), never a bare magic number:

| # | Gap (previously uncovered) | Level | Priority | Where |
| - | -------------------------- | ----- | -------- | ----- |
| 1 | Clamp **lower bound**: a sub-zero band glitch floors at 0 (`Math.max(0,…)` branch was untested) — never a negative gate input. | Unit | P2 | `effective-cloud-cover.test.ts` |
| 2 | **Additive** two-band weighting (low+high summed, not max'd) — the summed term is strictly > the low-only reading. | Unit | P1 | `effective-cloud-cover.test.ts` |
| 3 | **Medium ≡ Low** parity (both weight 1.0) — same coverage in either band yields the same effective cover; catches a silent divergence on re-tune. | Unit | P2 | `effective-cloud-cover.test.ts` |
| 4 | **Strict-undefined vs falsy**: all-three-layers present as `0` runs the weighting (→0), does NOT fall back to a non-zero total — guards the `=== undefined` check against a `0`-trips-fallback bug. | Unit | P1 | `effective-cloud-cover.test.ts` |
| 5 | **Weight-ordering invariant** meta-guard: `HIGH < LOW` and `HIGH < MEDIUM` (and `HIGH > 0`) — a re-tune inverting cirrus-vs-stratus intent fails at the constant level; plus the gate-vs-weights derivation. | Unit | P1 | `effective-cloud-cover.test.ts` |
| 6 | **Per-entry** three-layer mapping across a MULTI-hour `complete` forecast (full / cirrus-only / partial / compact-shaped hours) — one entry's missing band never bleeds into another. The AC1 mapping tests were all single-entry. | Unit | P1 | `met-no-service.cloud-gate.atdd.test.ts` |
| 7 | **Additive effective cover through the engine**: a full low deck under cirrus still gates; cirrus over a thin (20%) low haze stays below the gate (no false gate). Complements the helper-level additive test end-to-end. | Unit | P2 | `sun-engine.cloud-gate.atdd.test.ts` |

## Files Updated (all test-only, additive)
- **UPDATED** `nextjs-app/test/unit/solar/effective-cloud-cover.test.ts` — +6 tests (gaps #1–#5; imported `CLOUD_WEIGHT_LOW`/`_MEDIUM`).
- **UPDATED** `nextjs-app/test/unit/weather/met-no-service.cloud-gate.atdd.test.ts` — +1 test (gap #6).
- **UPDATED** `nextjs-app/test/unit/services/sun-engine.cloud-gate.atdd.test.ts` — +2 tests (gap #7).

## Validation / Gate
- `npx tsc --noEmit` → **0 errors**
- `npx eslint <the 3 changed test files>` → **0 errors / 0 warnings**
- `npx vitest run` → **115 files / 1060 tests, all passing, 0 skipped** (Story 10.3 completion HEAD was 115 files / 1051 tests → net **+9 tests**, none dropped, none regressed).
- Test-only addition — no source, engine, route, store, i18n, or CI-path change. Default seed path (flag OFF, as CI runs it) untouched.
- (`Not implemented: navigation to another Document` in vitest output remains a benign pre-existing jsdom log, not a failure.)

## Next recommended workflow
`trace` (traceability matrix / quality-gate decision for Story 10.3) or `test-review` (quality validation of the new + existing layered-cloud suites).

---

# Automation Expansion Summary — Story 10.4 (Rain-Now Signal — Met.no Nowcast 2.0)

## Preflight & Context
- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) + Playwright present. Verified — no HALT.
- **Stack:** fullstack (Next.js) with server-only sun engine. Story 10.4 is **Tier 2** of Epic 10 "Honest Sky" — a backend/data story: adds a Met.no Nowcast 2.0 client (`getNowcastPrecipitationRate`), a one-way additive rain gate (`applyCloudGate` rain OR-term), the `skyCondition='rain'` precedence + copy, an AC4 future-horizon skip, and a list-route nowcast deduper. **NO new screen** (rain reuses the 10.2 obscured chrome). All targets stayed UNIT-level; **e2e intentionally NOT touched** (the deterministic mocked-weather e2e matrix + live spot-check is Story 10.5).
- **Mode:** BMad-Integrated (story with AC1–AC4 + rich Dev Notes / Test Surfaces). **Sequential** — a narrow, additive top-up on the existing 10.4 unit surfaces; no API/E2E fan-out to farm out.

## Existing coverage reviewed (to avoid duplication)
The dev-story un-skipped a strong AC-driven matrix — NOT re-created:
- `nowcast-service.cloud-gate.atdd.test.ts` [AC1, 9] — `/nowcast/2.0/complete` URL + 4-dp coords / shared identifying UA / 0.4⇒0.4 / genuine 0 / absent field⇒undefined / non-`ok` coverage marker⇒undefined / non-OK HTTP / thrown fetch / empty timeseries — all single-entry synthetic responses, no network.
- `sun-engine.cloud-gate.atdd.test.ts` [10.4 AC2/AC3/AC4 blocks] — rain-forces-gate + `skyCondition='rain'` + geometry preserved / rain over below-horizon stays NoSun / no-rain(0)+overcast still CloudObscured / no-rain(0)+clear+below-horizon stays NoSun / undefined≡0 / no-override lazy path / beyond-`NOWCAST_HORIZON_MS` not called + not gated / inside-horizon called + gates / past `requestedAt` not called. **Assessed comprehensive — not expanded.**
- `sun-status-presentation.rain.cloud-gate.atdd.test.ts` + `sun-status-presentation.test.ts` — `skyConditionCopy('rain', …)` renders plain-language copy, no meteorology internals, others unchanged, unavailable/undefined/unknown → null.
- `messages-parity.test.ts` + the two component fixtures — sv/en `rain` sky keys, `sky` shape gains `rain`.

## Gaps Identified & Filled
Residual branch/edge gaps the AC matrix structurally could not reach (single-entry fixtures, an untested deduper twin, an optional-param back-compat contract). All assert INTENT / relative behaviour (unknown ≠ 0; re-tunable `NOWCAST_HORIZON_MS` never hard-coded):

| # | Gap (previously uncovered) | Level | Priority | Where |
| - | -------------------------- | ----- | -------- | ----- |
| 1 | `nearestToNowEntry` **multi-entry** selection — the near-now rate is the entry nearest the real clock, not the first or last; a nearer FUTURE step wins over a farther past one. The AC1 suite used only single-entry responses. | Unit | P1 | `nowcast-service.coverage.test.ts` |
| 2 | `nearestToNowEntry` **Invalid-Date defensiveness** — an unparseable `entry.time` is SKIPPED (nearest parseable selected, never the NaN slice's rate); all-unparseable falls back to the FIRST entry (never NaN-select / throw). [8.5-R1 folded-in guard] | Unit | P1 | `nowcast-service.coverage.test.ts` |
| 3 | **Unknown-vs-0 on the SELECTED near-now entry** — the nearest entry's absent `precipitation_rate` returns `undefined` (never a neighbour's 0, never a fabricated 0). Single-entry AC1 tests could not exercise the "which entry's field" question. | Unit | P1 | `nowcast-service.coverage.test.ts` |
| 4 | **Default-coordinate accessor** — `getNowcastPrecipitationRate()` with no args defaults to Gothenburg (4-dp truncated). The fixed-coordinate AC1 tests never hit the default-param path. | Unit | P2 | `nowcast-service.coverage.test.ts` |
| 5 | `createDedupedNowcastFetcher` **coalescing** — co-located venues share ONE upstream nowcast request per ≤4-dp key (TOS-hygiene, Task 5); only the forecast twin was tested. | Unit | P1 | `sun-engine.test.ts` |
| 6 | `createDedupedNowcastFetcher` **undefined pass-through / no-eviction** — a transient `undefined`-resolving underlying coalesces to the correct per-venue "unknown → non-gating" degrade for every co-located caller. | Unit | P1 | `sun-engine.test.ts` |
| 7 | `applyCloudGate` **3-arg back-compat** — the optional 4th `isRaining` defaults to `false` (dev-flagged deliberate deviation): a 3-arg call is byte-identical to an explicit `false` and never fabricates a rain gate. | Unit | P2 | `sun-engine.test.ts` |

## Files Created / Updated (all test-only, additive)
- **NEW** `nextjs-app/test/unit/weather/nowcast-service.coverage.test.ts` — 6 tests (gaps #1–#4).
- **UPDATED** `nextjs-app/test/unit/services/sun-engine.test.ts` — +4 tests (gaps #5–#7); added `applyCloudGate` + `createDedupedNowcastFetcher` imports.

## Validation / Gate
- `npx tsc --noEmit` → **0 errors**
- `npx eslint <changed test files>` → **0 errors / 0 warnings**
- `npx vitest run` → **118 files / 1099 tests, all passing, 0 skipped** (Story 10.4 completion HEAD was 117 files / 1089 tests → net **+1 file / +10 tests**, none dropped, none regressed).
- Test-only addition — no source, engine, route, store, client, or CI-path change. Default seed path (flag OFF, as CI runs it) untouched.
- Authoring note: initial "all-unparseable time" fixtures used strings (`garbage-1`) that JS `Date` partially parses to valid 2001 dates; switched to genuinely unparseable strings so gap #2's fallback branch is truly exercised.
- (`Not implemented: navigation to another Document` in vitest output remains a benign pre-existing jsdom log, not a failure.)

## Next recommended workflow
`trace` (traceability matrix / quality-gate decision for Story 10.4) or `test-review` (quality validation of the new + existing rain-now suites).

---

# Automation Expansion Summary — Story 11.1 (Client-Side Day-Series — Instant Time Scrubbing)

## Preflight & Context
- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) + Playwright present. Verified — no HALT.
- **Stack:** fullstack (Next.js frontend + server-only sun engine). Story 11.1 is the Epic-11 FOUNDATION: engine per-step day-series producer + whole-day cache, `sunDaySeries` on the real-engine list DTO, a pure client derivation helper, and a query-key decouple (scrub = 0 fetches; date change = 1). Landed with all 6 ATDD scaffolds green (1150 pass / 0 skip; tsc + eslint clean).
- **Mode:** BMad-Integrated (story + 6 ATDD scaffolds + Epic-11 test-design). **Sequential** — a tightly-scoped edge/error-path top-up on a small set of pure functions with clear untested branches; no API/E2E fan-out warranting subagents.

## Existing coverage reviewed (to avoid duplication — NOT re-created)
The 6 landed ATDD suites cover the AC-headline happy paths and are left untouched:
- `venue-day-series.derivation.atdd.test.ts` — pure exact-step lookup per output surface + purity/no-server-import.
- `sun-engine.day-series-parity.atdd.test.ts` — per-step byte-parity with the single-shot compute + per-step Epic-10 gate + explicit `isRaining` under the horizon rule.
- `venues-route-day-series.atdd.test.ts` — real-engine DTO carries the series, seed/detail byte-identical, ETag/304, gzipped payload measured (1769 B) + guard (8000 B).
- `sun-engine-day-series-cache.atdd.test.ts` — same-bucket hit / new-weather-bucket recompute / degraded-not-pinned (end-to-end through the producer).
- `venue-day-series-query-key.atdd.test.ts` — same-date scrub keeps the key; date/location flips it.
- `epic-11-scrub-zero-fetch.spec.ts` (e2e) — request-count invariant (owned/extended by Story 11.8; NOT expanded here per the story).

## Gaps Identified & Filled (edge cases / error paths / boundaries the scaffolds left open)

| # | Gap | Level | Priority | File |
|---|-----|-------|----------|------|
| G1 | `deriveVenueSunAtMinutes` **null/fallback branches** — the ATDD wrapper makes a `null` THROW, so the documented fallback (undefined/empty/non-array series, sparse-series missing step → `null` so MapView keeps the server single-instant fields) was never asserted; plus internal snapping of an unsnapped input, exact 06:00/21:00 boundaries, out-of-range clamp, and NaN-safe. | Unit | P1 | `test/unit/utils/venue-day-series.edge.test.ts` (9) |
| G3 | Cache **key builders** `weatherRefreshBucketMs` / `sunDaySeriesCacheKey` — the R-012 bucket floor at the exact window edge (no off-by-one), epoch-grid alignment, and full disambiguation (venue / day / weather-bucket / elevation variant) + the whole-day "no per-instant component" invariant. Only exercised indirectly before. | Unit | P1 | `test/unit/services/sun-engine-cache.day-series-key.test.ts` (9) |
| G4 | Route **degrade path** (the whole reason `sunDaySeries` is optional) — a THROWING `computeVenueDaySeries` must NOT 500, must OMIT the series for the affected venue (keeping the single-instant fields), must isolate the failure per-venue (others keep their 61-entry series), and still emit a valid ETag/304. The green DTO ATDD only stubbed the producer to RESOLVE. | API | P0 | `test/unit/api/venues-route-day-series-degrade.test.ts` (3) |
| G5 | `useVenueSearch` **`isLiveNow` boundary** (the BREAKING-CHANGE headline) — live-now OMITS date/time from the request yet keys on `date` and POLLS; flipping isLiveNow true→false on the SAME date fires ZERO additional fetches; off-live sends date+time and disables polling. The existing suite never passes `isLiveNow`. | Unit (hook) | P0 | `test/unit/queries/useVenueSearch.day-series-key.test.tsx` (6) |

(Deliberately NOT added: a standalone reference re-implementation of `applyDaySeriesDerivation`'s override rule — it is covered end-to-end by `MapView.test.tsx` + G1's derivation edges, and a duplicated reference would risk drift from the source. Engine parity/gate internals already byte-covered. Live p95 (AC4) is a maintainer `needs-human` per the story, not a CI test.)

## Files Created (all test-only, additive)
- **NEW** `test/unit/utils/venue-day-series.edge.test.ts` — 9 tests (G1).
- **NEW** `test/unit/services/sun-engine-cache.day-series-key.test.ts` — 9 tests (G3).
- **NEW** `test/unit/api/venues-route-day-series-degrade.test.ts` — 3 tests (G4).
- **NEW** `test/unit/queries/useVenueSearch.day-series-key.test.tsx` — 6 tests (G5).

## Validation / Gate
- `npx tsc --noEmit` → **0 errors**
- `npx eslint <the 4 new files>` → **0 errors / 0 warnings**
- `npx vitest run` → **130 files / 1175 tests, all passing, 0 skipped** (Story 11.1 HEAD was 126 files / 1150 tests → net **+4 files / +25 tests**, none dropped, none regressed).
- Test-only addition — no source, engine, route, store, client, hook, i18n, or CI-path change. Default seed path (flag OFF, as CI runs it) untouched.
- (`Not implemented: navigation to another Document` in vitest output remains a benign pre-existing jsdom log, not a failure.)

## Next recommended workflow
`trace` (traceability matrix / quality-gate decision for Story 11.1) or `test-review` (quality validation of the new + existing day-series suites).

---

# Automation Expansion Summary — Story 11.6 (Venue Detail — Clean First Paint & Content Polish)

## Preflight & Context
- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) + Playwright present. Verified — no HALT.
- **Stack:** frontend (Next.js + React). Story 11.6 is a pure UI-polish story: `VenueDetailContent` clean first paint (no-fabrication "ÖPPET" badge + detail-only skeletons), removal of the "Soltider idag" strip + its dead `SunTimeline`/`SunForecastBars`/`timelineWindowLabel` render path, symmetric i18n prune (venue `detail.timeline`/`sectionTitle`/`peakTime`/`bestWindow` in both locales), `ReviewFlow` centering + single "Inga omdömen", and the amber-badge token darken (`#6d5000`→`#5c4300`) for a deterministic axe green. Landed at `review` with vitest 1331/140 files, axe green.
- **Mode:** BMad-Integrated (story with AC1–AC3 + Design-Gate + rich Dev Notes). **Sequential** — a narrowly-scoped, purely-additive component/unit coverage top-up; no API/E2E fan-out to farm to subagents.

## Existing coverage reviewed (to avoid duplication — NOT re-created, NOT weakened)
The story shipped strong AC-headline coverage, left untouched:
- `VenueDetailContent.test.tsx` — AC1 skeleton-while-loading + no fabricated "ÖPPET · 22:00" + badge omit-when-no-`closesAt`; AC2 "Soltider idag"/"Solprognos idag"/timeline windows absent on BOTH breakpoints.
- `ReviewFlow.test.tsx` — AC3 single "Inga omdömen" at 0 reviews + centered header/message; `>0` count summary + no empty leak.
- `messages-parity.test.ts` — sv/en structural + ICU parity across every namespace.
- `removed-i18n-keys.test.ts` — established pruned-key deletion-pin pattern (Story 9.6 + 11.4 suites).
- `MapView.test.tsx` — AC2 section-removed assertion through the live overlay.
- `axe.spec.ts:82` (desktop venue-detail) — the ACTIVE AA gate the badge token keeps green.

## Gaps Identified & Filled (edge / boundary / regression-guard, no duplication)

| # | Gap (previously uncovered) | Level | Priority | Where |
|---|-----------------------------|-------|----------|-------|
| 1 | **fallback→detail swap in the SAME instance** (AC1 no-layout-jump): the two AC1 tests were separate renders — none re-rendered one mounted component from `detail=undefined`+loading to `detail` present to prove the badge skeleton → real badge and detail-region skeletons → real content with NO stale skeleton left behind. Also pins `aria-busy` toggling true→false (a Dev-Notes a11y signal previously unasserted anywhere). | Component | P1 | `VenueDetailContent.test.tsx` |
| 2 | **loading-gate boundary** `loading = isLoading && !detail`: `detail`-present + `isLoading=true` (a background refetch) must render CONTENT not skeletons + `aria-busy=false` — the gate's other side, previously untested. | Component | P1 | `VenueDetailContent.test.tsx` |
| 3 | **ReviewFlow loading boundary** (AC3): while `reviewsQuery.data` is undefined (pending fetch), NO "Inga omdömen" of either flavour may leak — the empty-state-flash class the AC3 fix closed, but only ever asserted at the resolved-empty state. | Component | P1 | `ReviewFlow.test.tsx` |
| 4 | **ReviewFlow error boundary** (AC3): a failed fetch shows the load-error alert exactly ONCE with no empty message co-rendering (error and empty are mutually-exclusive branches) + the retry affordance. | Component | P2 | `ReviewFlow.test.tsx` |
| 5 | **Pruned venue-detail i18n keys stay gone** (AC2): `venue.detail.timeline`/`sectionTitle`/`peakTime`/`bestWindow` deleted in BOTH locales, `openUntil` kept — a deletion-pin `messages-parity` cannot catch (parity passes if a key is re-added to both). Raw-scan scoped to `venue.json` (so `feedback.json#sectionTitle` "Omdömen" is not a false positive). | Unit | P1 | `removed-i18n-keys.test.ts` |
| 6 | **Label-builder / component prune regression guard** (AC2): a source-scan pin that the three surfaces that BUILD `VenueDetailContentLabels` (`MapView#venueDetailLabels`, `ForcedVenueDetailInitialFrame#venueDetailLabels`, `VenueDetailContent`) never re-introduce a `t('detail.timeline\|sectionTitle\|peakTime\|bestWindow')` read (the runtime-raw-key path the JSON scan can't see), the `VenueDetailContentLabels` type drops those fields + the `SunTimelineLabels` import, and `SunTimeline`/`SunForecastBars`/`timelineWindowLabel` stay fully removed. | Unit (source-scan) | P1 | `venue-detail-label-prune.test.ts` (NEW) |

Scope discipline: the ENGINE timeline data path (`detail.timeline` DTO, `[slug]` route, `sun-engine.ts`, `VenueSunTimelineDto`) is deliberately OUT of scope per AC2 — Story 11.1 consumes it. All new pins target the pruned i18n **presentation** keys + the render/label surfaces only, never the data path.

## Files Created / Updated (all test-only, additive)
- **UPDATED** `nextjs-app/test/components/VenueDetailContent.test.tsx` — +2 (gaps #1, #2).
- **UPDATED** `nextjs-app/test/components/ReviewFlow.test.tsx` — +2 (gaps #3, #4).
- **UPDATED** `nextjs-app/test/unit/removed-i18n-keys.test.ts` — +5 (gap #5: timeline-key deletion sv/en + kept `openUntil` sv/en + raw-scan).
- **NEW** `nextjs-app/test/unit/venue-detail-label-prune.test.ts` — +5 (gap #6).

## Validation / Gate
- `npx tsc --noEmit` → **0 errors**
- `npx eslint <the 3 changed + 1 new test file>` → **0 errors**
- `npx vitest run` → **141 files / 1345 tests, all passing, 0 skipped** (Story 11.6 completion HEAD was 140 files / 1331 tests → net **+1 file / +14 tests**, none dropped, none regressed).
- Test-only addition — no source, component, i18n, token, or CI-path change. The axe e2e badge gate is untouched (source unchanged).
- (`Not implemented: navigation to another Document` in vitest output remains a benign pre-existing jsdom log — it predates this change, emitted by ReviewFlow's `scrollIntoView` under jsdom — not a failure.)

## Next recommended workflow
`trace` (traceability matrix / quality-gate decision for Story 11.6) or `test-review` (quality validation of the new + existing venue-detail suites).

---

# Automation Expansion Summary — Story 11.7 (Hygiene — Three-Epics-Deferred Debt)

## Preflight & Context
- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) + Playwright present. Verified — no HALT.
- **Stack:** fullstack (Next.js). Story 11.7 is a HYGIENE story with three orthogonal fixes that are **byte-identical UI** (nothing renders): (1) `vercel.json` installCommand fail-loud — removed the `|| true` lightningcss error-swallow (AC1); (2) a **scoped** `.gitattributes` EOL policy + one-time renormalization (AC1); (3) deleted the orphaned `toSunStatusToken` mapper, never-guard surviving via `windowLabelTier` (AC2). AC3 (consolidated reference-PNG rebaseline) is a maintainer-blessed VISUAL checkpoint — not unit-automatable.
- **Mode:** BMad-Integrated (story + Epic-11 test-design R-016/R-017). **Sequential** — three tightly-scoped, jsdom-free STATIC config/source contracts; no runtime behaviour, so no API/E2E fan-out warranted. Authored one guard suite inline (the deterministic sequential path).

## Existing coverage reviewed (to avoid duplication — NOT re-created, NOT weakened)
- `sun-status-presentation.test.ts` — the surviving mapper exports (`isObscuredSunStatus`, `skyConditionCopy`); the `toSunStatusToken` block was already REMOVED by the dev-story. Left untouched.
- `map-legibility-tokens.automate.test.ts` — the **precedent** this suite follows: a `.automate.test.ts` that reads a config/source file from disk and asserts its structural contract (never a rendered pixel).
- **Pre-existing coverage of the three 11.7 contracts: NONE** — a repo-wide `test/` grep for `vercel.json` / `gitattributes` / `installCommand` / `toSunStatusToken` returned nothing. These were entirely uncovered because the changes render nothing (no runtime/e2e/visual guard).

## Gaps Identified & Filled (config/source contract guards — the genuinely automatable 11.7 debt)

| # | Gap (previously uncovered) | Level | Priority | Where |
|---|-----------------------------|-------|----------|-------|
| 1 | **AC1 vercel.json fail-loud** — `installCommand` must contain NO error-swallow (`\|\| true` / `; true` / `\|\| :` / `\|\| exit 0`). A re-added swallow silently ships a broken lightningcss build (the exact Epic-8 A2 regression). | Unit (config contract) | P1 | `hygiene-config-contracts.automate.test.ts` |
| 2 | **AC1 load-bearing fragments preserved** — removing the swallow must not gut the workaround: `--include=dev`, the `(cd .. && …)` root reach, `--no-package-lock`, pinned `lightningcss@1.31.1`, `2>&1`, and the `&&` chain all survive. | Unit (config contract) | P1 | same |
| 3 | **AC1 buildCommand stays clean** — the swallow was NEVER in `buildCommand`; pin it `npm run build` so nobody "fixes" the wrong line. | Unit | P2 | same |
| 4 | **AC1 doc↔config mirror** — `docs/vercel-deployment.md` quotes the exact `installCommand`; assert the doc contains the live string AND its mirrored quote carries no swallow (drift guard). | Unit | P1 | same |
| 5 | **AC1 `.gitattributes` no blanket sweep** — no `* text=auto` (R-016: a blanket rule re-poisons the renormalization diff by sweeping the ~113 `.log` artifacts + binaries). | Unit (config contract) | P1 | same |
| 6 | **AC1 `.log` stays excluded** — no `*.log` text/EOL rule (the review-capture/console artifacts stay untouched). | Unit | P2 | same |
| 7 | **AC1 source-extension LF pins** — `text eol=lf` on ts/tsx/js/jsx/json/css/md/yml/yaml/sql/sh (ends the recurring CRLF↔LF review churn). | Unit | P1 | same |
| 8 | **AC1 binary guards** — `-text` on png/jpg/ico/woff/woff2/ttf so the 12 rebaselined reference PNGs + fonts are NEVER EOL-normalized (a corrupted binary is a silent, invisible regression). | Unit | P1 | same |
| 9 | **AC2 `toSunStatusToken` stays deleted** (R-017 binary outcome) — source-scan proves the export is absent from `sun-status-presentation.ts` AND from its only former consumer (the unit test); a re-add resurrects the orphan + its misleading "single source of truth" comment. | Unit (source-scan) | P2 | same |
| 10 | **AC2 never-guard survives** — `windowLabelTier`'s `switch (status)` + `: never = status` default is preserved; this is the compile-time "a new VenueSunStatus breaks the build" property AC2 relies on inheriting from the deleted mapper. | Unit (source-scan) | P2 | same |

The shared `ERROR_SWALLOW` regex was **mutation-checked** against `\|\| true`, `; true`, `\|\| :`, `\|\| exit 0` (all caught) and the live clean commands (no false positives) — an initial `\|\| :` miss (a `\b` after the non-word `:`) was found and fixed. The blanket and `.log` regexes were likewise verified for word-boundary correctness.

## Files Created (test-only, additive)
- **NEW** `nextjs-app/test/unit/hygiene-config-contracts.automate.test.ts` — 11 tests, 3 describe blocks (vercel.json fail-loud + doc mirror; scoped `.gitattributes`; `toSunStatusToken` delete + never-guard survival).

## Deliberately NOT covered (not worth / not automatable at unit level — no fabricated coverage)
- Live Vercel deploy fail-loud behaviour → orchestrator/maintainer PR concern; the static installCommand contract is the automatable proxy.
- The `git add --renormalize` working-tree effect → a git operation owned by the orchestrator, not a code contract.
- AC3 reference-PNG rebaseline blessing → a maintainer visual checkpoint; dev is structurally forbidden from self-blessing and no unit test can assert a "correct" pixel.

## Validation / Gate
- `npx tsc --noEmit` → **0 errors** (no error references the new file).
- `npx eslint <new file>` → **0 errors** (exit 0).
- `npx vitest run` → **142 files / 1354 tests, all passing, 0 skipped** (Story 11.7 completion HEAD was 141 files / 1343 tests → net **+1 file / +11 tests**, none dropped, none regressed).
- Test-only addition — no source, config, component, or CI-path change. Byte-identical UI preserved (this suite reads config/source from disk; it renders nothing).
- (`Not implemented: navigation to another Document` in vitest output remains a benign pre-existing jsdom log, not a failure.)

## Next recommended workflow
`trace` (traceability matrix / quality-gate decision for Story 11.7) or `test-review` (quality validation of the new config-contract suite).

---

# Automation Expansion Summary — Story 11.9 (Venue Data Model Cleanup — IDs, Per-Weekday Hours, Dead-Field Removal)

## Preflight & Context
- **Framework:** Vitest 4.1.4 (`nextjs-app/vitest.config.ts`) + Playwright present. Verified — no HALT.
- **Stack:** fullstack (Next.js + server-only venue store). Story 11.9 is the data-model cleanup: per-weekday `opening_hours` (AC2) with a NEW pure formatter `lib/utils/opening-hours.ts`, a defensive store coercer `coerceOpeningHours` in `lib/services/venue-store.ts`, an auto-assigning text PK (AC1, DB-only), and the removal of `peak_time`/`shadow_warning_minutes` end-to-end (AC3/AC4).
- **Mode:** BMad-Integrated (story + 4 ATDD scaffolds, all un-skipped and green). **Sequential** — a narrow, purely-additive UNIT top-up on the two new pure-logic surfaces (formatter + coercer); no API/E2E fan-out warranted.

## Existing coverage reviewed (to avoid duplication — NOT re-created, NOT weakened)
- `opening-hours.atdd.test.ts` — `formatOpeningHours` headline AC2: open/closed/past-midnight/malformed/no-hours + gate-parity "22:00".
- `venue-store.opening-hours-shape.atdd.test.ts` — `VENUE_SELECT_COLUMNS` drops the dead columns; `coerceOpeningHours` well-formed/null/malformed-scalar; fixture present/absent branches + no `peakTime`/`shadowWarningMinutes`.
- `venue-detail-route.data-cleanup.atdd.test.ts` — detail DTO: `shadowWarningMinutes` gone, engine `timeline.peakTime` kept, new `openingHours` shape serializes, no fabricated absent-hours display.
- `VenueDetailContent.opening-hours-derived.atdd.test.tsx` — derived ÖPPET badge + Öppettider row (open/closed/loading same-box swap).
- E2E already exists (`epic-10-weather-matrix`, `map-primary`); pure weekday/coercion logic at E2E would be duplicate coverage (test-levels anti-pattern) — kept at UNIT.

## Gaps Identified & Filled (branch/boundary, no duplication)

| # | Gap (previously uncovered) | Level | Priority | Where |
|---|-----------------------------|-------|----------|-------|
| 1 | `stockholmIsoWeekday` — each of the 7 ISO weekdays asserted DIRECTLY (only indirectly exercised via the formatter before). | Unit | P1 | `opening-hours.coverage.test.ts` |
| 2 | `stockholmIsoWeekday` **DST correctness** — a WINTER instant (CET=UTC+1) + local-midnight crossing map to the ZONED weekday, not the UTC weekday. The honesty of weekday selection depends on this; scaffold only used summer instants. | Unit | P1 | same |
| 3 | `formatOpeningHours` **i18n `template` param** — the composition path the real render surfaces use (`labels.openUntilLine`); replaces EVERY `{time}`; default-template fallback. Scaffold only used the default. | Unit | P1 | same |
| 4 | `formatOpeningHours` edge branches — empty `{}` hours object → nothing; `open===close` derived honestly (no clamp); boundary `00:00`/`23:59` pass, out-of-range `24:00` → nothing (no throw). | Unit | P2 | same |
| 5 | `coerceOpeningHours` **all-malformed object** → undefined (the `hasEntry` gate — an object with zero recognizable weekday entries is "no hours"); non-weekday-only keys → undefined. The trust-boundary branch that stops a bad prod jsonb reaching render. | Unit | P1 | `venue-store.opening-hours-coerce.test.ts` |
| 6 | `coerceOpeningHours` **mixed validity** — valid intervals kept, malformed dropped, in one call; an explicit `null` weekday PRESERVED (closed-that-day is honest data); stray legacy keys (`display`/`timezone`) do not leak through. | Unit | P1 | same |
| 7 | `coerceOpeningHours` **interval time validation** — boundary (`00:00`/`23:59`) + past-midnight (`close<open`) accepted; out-of-range (`24:00`/`12:60`) + non-string times → undefined. | Unit | P2 | same |

All formatter tests inject a fixed `now` (offset-annotated) — wall-clock-deterministic, no `?_time=` flake. Coercer tests are pure structural assertions, no clock, no live Supabase.

## Files Created (test-only, additive)
- **NEW** `nextjs-app/test/unit/utils/opening-hours.coverage.test.ts` — 13 tests (gaps #1–#4).
- **NEW** `nextjs-app/test/unit/services/venue-store.opening-hours-coerce.test.ts` — 10 tests (gaps #5–#7).

## Validation / Gate
- `npx tsc --noEmit` → **0 errors**.
- `npx eslint <the 2 new files> --quiet` → **0 errors** (exit 0).
- `npx vitest run` → **152 files / 1439 tests, all passing, 0 skipped** (Story 11.9 handoff HEAD was 150 files / 1416 tests → net **+2 files / +23 tests**, none dropped, none regressed).
- Test-only addition — no source, store, formatter, DTO, i18n, or CI-path change. Default seed path (flag OFF, as CI runs it) untouched.
- (`Not implemented: navigation to another Document` in vitest output remains a benign pre-existing jsdom log, not a failure.)

## Next recommended workflow
`trace` (traceability matrix / quality-gate decision for Story 11.9) or `test-review` (quality validation of the new + existing opening-hours suites).
