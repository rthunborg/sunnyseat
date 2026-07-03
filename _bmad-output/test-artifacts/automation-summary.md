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
  - '_bmad-output/implementation-artifacts/10-1-cloud-gated-sun-state-weather-truth-fixes.md'
  - '_bmad-output/implementation-artifacts/10-2-sun-behind-clouds-two-signal-ui-state.md'
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
