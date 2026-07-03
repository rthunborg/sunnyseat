---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-07-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/10-1-cloud-gated-sun-state-weather-truth-fixes.md'
  - 'nextjs-app/lib/services/sun-engine.ts'
  - 'nextjs-app/lib/solar/confidence-calculator.ts'
  - 'nextjs-app/lib/weather/met-no-service.ts'
  - 'nextjs-app/lib/types/api.ts'
  - 'nextjs-app/app/api/venues/route.ts'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist: Story 10.1 — Cloud-Gated Sun State & Weather-Truth Fixes (Engine)

## Preflight & Context (Step 1)

- **Detected stack:** `backend` (engine/data logic under `nextjs-app/lib/{services,solar,weather}`; no UI in scope — UI is Story 10.2).
- **Framework:** Vitest (`nextjs-app/vitest.config.ts`) — the correct level per the story's own "Test surfaces (all red-first)" section. Playwright exists (`playwright.config.ts`) but **no e2e is in scope for 10.1** (the deterministic mocked-weather e2e matrix is Story 10.5; the story explicitly forbids adding e2e or live Met.no calls here).
- **Prerequisites:** Story is `ready-for-dev` with four precise ACs → PASS.
- **Generation mode (Step 2):** AI generation, sequential — no browser recording (backend project). Red-phase scaffolds authored directly against the real source signatures.

## TDD Red Phase (Current)

Failing (skipped) acceptance scaffolds generated following the project's existing
`*.atdd.test.ts` convention (see `sun-engine-caching.atdd.test.ts`): dedicated
red-phase files, every block `describe.skip`, asserting EXPECTED
post-implementation behaviour (no placeholder `expect(true)` assertions).
CI stays green (all skipped) until the dev un-skips per task.

- **Total scaffolds:** 24 tests across 4 files (all skipped).
- **tsc:** 0 errors · **eslint:** 0 errors · **vitest (scoped):** 4 files / 24 tests skipped, green.

| # | File | AC | Tests | Un-skip trigger |
|---|------|----|------:|-----------------|
| 1 | `nextjs-app/test/unit/weather/met-no-service.cloud-gate.atdd.test.ts` | AC2 | 4 | Task 2 — `met-no-service.ts:85` stops `?? 0`, cloud becomes unknown-representable |
| 2 | `nextjs-app/test/unit/confidence-calculator.cloud-gate.atdd.test.ts` | AC3 (FR12) | 4 | Task 4 — `calcCloudCertainty` reads `weather.cloudCover`; no-weather branch pinned byte-identical |
| 3 | `nextjs-app/test/unit/services/sun-engine.cloud-gate.atdd.test.ts` | AC1 + AC4 (cache) | 13 | Task 1/3 — `applyCloudGate` + `CLOUD_GATE_THRESHOLD_PERCENT` exports; gate in `computeRealSunEngineResult` |
| 4 | `nextjs-app/test/unit/api/venues-route.cloud-gate.atdd.test.ts` | AC4 | 3 | Task 1/5 — `VenueSunStatus` gains `CloudObscured`; sanitizer + `SUN_STATUS_ORDER` handle it |

## Acceptance Criteria Coverage

### AC1 — Cloud-gated headline status (`CloudObscured`)
- `applyCloudGate` pure helper: Sunny/Partial + sun-visible + overcast ⇒ `CloudObscured`; below-threshold ⇒ unchanged; `NoSun`/`Shaded` untouched; sun-down ⇒ no gate; unknown cloud ⇒ no gate; `>=` threshold boundary read from the constant (survives a re-tune). *(file 3, block 1 — 8 tests)*
- End-to-end via `applyRealSunEngine` (mocked RPC + `getForecast`): overcast ⇒ `CloudObscured`; geometric layer (`sunExposurePercent`, `sunWindow`, `peakTime`) preserved; clear weather ⇒ no false gate; missing weather ⇒ no gate + `skyCondition='unavailable'`. *(file 3, block 2 — 4 tests)*

### AC2 — Missing cloud data ⇒ weather-unknown, never clear
- Absent `cloud_area_fraction` ⇒ cloud is unknown, never `0`/clear and never a fabricated `100`; present value flows through unchanged; non-cloud fields (temperature/source/validAt) untouched. *(file 1 — 4 tests)*

### AC3 — Cloud cover genuinely lowers confidence (FR12)
- 100% cover ⇒ materially lower `overallConfidence` than 0% (>0.05 drop, not rounding noise), identical geometry/solar/shadow; `cloudCertainty` sensitive to cover; unknown cloud NOT penalised as overcast; geometry-only (no-weather) branch pinned byte-identical. *(file 2 — 4 tests)*

### AC4 — Consumer sweep + contract tests + cache consistency
- Sanitizer `normalizeVenueForResponse` round-trips `CloudObscured` without corruption / downgrade; every status maps to a finite sort rank (no NaN from `SUN_STATUS_ORDER`). *(file 4 — 3 tests)*
- Cache consistency: repeat request in the same 15-min bucket returns the SAME gated status + skyCondition, `getForecast` called once (outcome + weather slice + gate cache together). *(file 3, block 3 — 1 test)*

## Design decisions the dev OWNS (assertions written to survive them)

- **`CLOUD_GATE_THRESHOLD_PERCENT`** (proposed 80): tests drive cover to 100/0 and read the constant at the boundary → a re-tune does not break them.
- **"Unknown cloud" representation** (preferred `cloudCover?: number | undefined`): file 1 + file 2 assertions are written against the undefined representation with an inline note to adjust if the dev picks the `cloudCoverKnown: boolean` flag instead — the INVARIANT (unknown ≠ 0, unknown ≠ 100, unknown non-gating) is fixed.
- **Confidence formula** (AC3): asserted RELATIVELY (100% < 0%, material drop) not by exact value → survives formula re-authoring.
- **`SUN_STATUS_ORDER` rank for `CloudObscured`** (proposed between Partial and Shaded): asserted only as "finite rank / no NaN / value preserved", not a hard-coded position.

## RED-PHASE tsc-safety technique (important for the dev)

The tsc gate ignores `.skip`, so scaffolds must not hard-break the compile by
referencing symbols/union-members that do not exist yet:
- **File 3** resolves `applyCloudGate` + `CLOUD_GATE_THRESHOLD_PERCENT` via a
  loosely-typed `loadEngine()` dynamic-import accessor (inside the skipped
  blocks). Post-Task-3: replace with a static import.
- **File 4** produces the `'CloudObscured'` literal via `cloudObscuredStatus()`
  (cast through the current union) so a DTO can carry it before Task 1 widens
  `VenueSunStatus`. Post-Task-1: inline the plain literal.
Both techniques are documented in each file header.

## Next Steps (TDD Green Phase)

After implementing Story 10.1 (Tasks 1–5):
1. In each `*.cloud-gate.atdd.test.ts`, remove the `describe.skip` → `describe`
   and swap the two red-phase indirections (`loadEngine()` → static import;
   `cloudObscuredStatus()` → `'CloudObscured'` literal).
2. Adjust the file-1 / file-2 "unknown cloud" assertions if the boolean-flag
   representation was chosen (do NOT weaken the unknown ≠ 0 / ≠ 100 invariant).
3. Capture the file-2 no-weather byte-identical pin from HEAD before editing
   `confidence-calculator.ts`, then freeze it.
4. Run `cd nextjs-app; npx tsc --noEmit && npx eslint . && npx vitest run` → all green.
5. Verify the default seed path (flag OFF) contract tests stay green unchanged.

## Validation (Step 5)

- [x] Prerequisites satisfied (story approved, framework configured).
- [x] Test files created correctly (4 files, real source signatures, project `.atdd` convention).
- [x] Checklist matches acceptance criteria (AC1–AC4 fully mapped).
- [x] Tests designed to fail before implementation (all `describe.skip`, no placeholder assertions).
- [x] No live Met.no / Supabase calls (deepest adapter boundaries mocked; `fetch` stubbed).
- [x] No e2e added (correctly deferred to Story 10.5).
- [x] tsc 0 / eslint 0 / scoped vitest green (24 skipped).
- [x] Temp artifacts stored under `_bmad-output/test-artifacts/` (this checklist); no orphaned browser sessions (backend, no recording).

## Vitest baseline (pre-scaffold, per story Task 6)

- **HEAD baseline:** 107 files / 953 tests, all green when run per-file.
- **Known flake:** `test/unit/services/sun-engine.test.ts` intermittently times out
  under FULL-suite load ("Not implemented: navigation to another Document" jsdom
  artifact); passes 29/29 in isolation. Pre-existing, unrelated to these scaffolds.
- **Post-scaffold:** +4 files / +24 tests (all skipped); no existing test dropped.
