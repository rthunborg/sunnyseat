---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-identify-targets'
  - 'step-03-generate-tests'
  - 'step-03c-aggregate'
  - 'step-04-validate-and-summarize'
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-07-03'
inputDocuments:
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
