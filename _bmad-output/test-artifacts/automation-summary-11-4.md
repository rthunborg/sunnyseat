---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-identify-targets'
  - 'step-03-generate-tests'
  - 'step-03c-aggregate'
  - 'step-04-validate-and-summarize'
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-07-05'
inputDocuments:
  - _bmad-output/implementation-artifacts/11-4-venue-quick-info-rework-reference-alignment.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-11.md
  - nextjs-app/components/composed/venue/VenueQuickInfo.tsx
  - nextjs-app/lib/services/venue-store.ts
  - nextjs-app/lib/services/sun-engine.ts
  - nextjs-app/lib/services/venues-fixture.ts
  - nextjs-app/lib/types/api.ts
  - nextjs-app/test/components/VenueQuickInfo.test.tsx
  - nextjs-app/test/unit/services/venue-store.test.ts
  - nextjs-app/test/unit/api/venues-route.test.ts
  - nextjs-app/test/unit/api/venues-route-real-engine.test.ts
  - nextjs-app/test/unit/removed-i18n-keys.test.ts
knowledgeFragments:
  - test-levels-framework.md
  - test-priorities-matrix.md
  - test-quality.md
  - data-factories.md
  - selective-testing.md
---

# Test Automation Expansion — Story 11.4 (Venue Quick-Info Rework)

## Step 1 — Preflight & Context

- **Stack detected:** `frontend` (Next.js + React; `playwright.config.ts` + `vitest.config.ts` present under `nextjs-app/`). Framework verified — no HALT.
- **Execution mode:** BMad-Integrated (story file + epic test-design present).
- **Existing baseline (from story Dev Agent Record):** vitest 1300 pass across 139 files; axe green both breakpoints. Dev-story already authored strong coverage across component / store / route / i18n levels.
- **TEA config:** `tea_execution_mode: auto`, `test_stack_type: auto`, `tea_use_playwright_utils: true`. For this tightly-scoped single-story gap fill the generation runs sequentially/inline (subagent JSON round-trip adds no value for a narrow, well-defined gap set).

## Step 2 — Identify Targets & Coverage Plan

The story landed with thorough coverage already in place (present/absent opening-hours branches at component + store + route level, no-Säkerhet/no-sun-window pins, ETA-span-absent, sr-only confidence kept, aria-shape, four sun states, i18n prune pins). The **automate** mandate is genuine gaps only — edge cases, error paths, boundaries — with NO weakening/deletion of existing tests.

### Genuine gaps identified (not covered by the dev-story tests)

| # | Gap | Level | Priority | Why it matters |
|---|-----|-------|----------|----------------|
| G1 | Real-engine list path (`SUN_ENGINE=real`, the LIVE production path) preserves `openingHours` end-to-end | API / unit | P1 | `mergeSunFields(toVenueData(venue), fields)` spreads the base; the field's survival is only *implicit*. A future `mergeSunFields`/`toVenueData` refactor could silently blank the live card. No test pins it. |
| G2 | `closesAt`-only opening hours (`{ closesAt: '22:00' }`, no `display`) → render NOTHING | Component | P1 | The exact honest-rule boundary AC1 calls out ("never a closesAt-only fallback"). The component guards on `openingHours?.display`; only the whole-object-absent case was pinned. |
| G3 | Empty-string `display` (`{ display: '' }`) → render NOTHING, no orphaned node | Component | P2 | Falsy-but-present display must not leave an empty line / dangling paragraph. Boundary between "present object" and "renderable value". |
| G4 | Obscured state WITH opening hours absent (cross case) | Component | P2 | Pins that the Story-10.2 obscured block and the absent-hours branch coexist cleanly (no dangling separator, obscured block still renders). |
| G5 | `toVenueData` copies `openingHours` by reference incl. an object that carries only `display` (no `closesAt`) — the store→DTO shape is preserved verbatim | Unit | P2 | Guards that the copy is faithful (no accidental field drop/shape mutation) for the `closesAt`-absent store shape (the live Supabase rows can omit `closesAt`). |

### De-dup discipline (per epic test-design)
- Quick-info render + a11y facts = **COMPONENT** (`VenueQuickInfo.test.tsx`).
- Day-series / list-DTO shape = **API/unit** (`venue-store.test.ts`, `venues-route-real-engine.test.ts`).
- No E2E added — the request-count/perf/real-device gates are Story 11.8's; the copy-over-mocked-DTO e2e is optional and the component tests prove both branches more cheaply. (Matches the story Task-6 E2E "(optional)" note.)

### Justification for scope: **selective** (edge-case / boundary top-up on an already-comprehensive suite)
The dev-story delivered P0/P1 acceptance coverage; this pass adds the missing boundary + live-path invariants only.

## Step 3 — Generation (sequential/inline)

Tests authored directly into the existing suites (extend, never replace):
- `test/unit/api/venues-route-real-engine.test.ts` — G1
- `test/components/VenueQuickInfo.test.tsx` — G2, G3, G4
- `test/unit/services/venue-store.test.ts` — G5

See Step 4 for the executed-gate results.

## Step 3C — Aggregation

No-op for this scope: tests were authored inline into the existing suites (extend, never replace). No new shared fixtures/helpers required — the `labels`/`OPENING_HOURS` component fixtures and the `SUPABASE_ROW`/`stored`/`computedOutcome` factories already in the harnesses were reused. No CLI/browser sessions opened (no orphaned browsers). All artifacts live under `_bmad-output/test-artifacts/`.

## Step 4 — Validate & Summarize

### Gate results (all green)
- `npx tsc --noEmit` → **0 errors** (incl. the `@ts-expect-error` on the deliberately-malformed closesAt-only prop, which is consumed → no unused-directive error).
- `npx vitest run` (full) → **139 files, 1306 passed** (baseline at HEAD 1300 → **+6 net new**, none dropped).
  - Touched files in isolation: `VenueQuickInfo.test.tsx` + `venue-store.test.ts` + `venues-route-real-engine.test.ts` → **79 passed**.
- `npx eslint` on the three touched test files → **0 errors, 0 warnings**.
- Axe gate: unchanged — no source/component edits, so the Story-11.4 axe-green state (a11y/a11y-mobile) is untouched. No new e2e added.

### Coverage added (6 tests)
| Gap | Test file | Test |
|-----|-----------|------|
| G1 | `venues-route-real-engine.test.ts` | preserves openingHours end-to-end on the REAL-engine list DTO (live path) |
| G1b | `venues-route-real-engine.test.ts` | does not fabricate openingHours when the engine geometry-degrades |
| G2 | `VenueQuickInfo.test.tsx` | renders NOTHING for a closesAt-only opening-hours object |
| G3 | `VenueQuickInfo.test.tsx` | renders NOTHING for an empty-string display |
| G4 | `VenueQuickInfo.test.tsx` | keeps the obscured block clean when opening hours are absent |
| G5 | `venue-store.test.ts` | toVenueData copies a closesAt-absent openingHours shape verbatim |

### Files updated (extended, none replaced/weakened)
- `nextjs-app/test/unit/api/venues-route-real-engine.test.ts` (+2 tests, G1/G1b)
- `nextjs-app/test/components/VenueQuickInfo.test.tsx` (+3 tests, G2/G3/G4)
- `nextjs-app/test/unit/services/venue-store.test.ts` (+1 test, G5)
- `nextjs-app/_bmad-output/test-artifacts/automation-summary-11-4.md` (this doc)

### Assumptions & risks
- **No existing test weakened or deleted** — every change is additive per the mandate.
- The live production path is `SUN_ENGINE=real` (per project memory), so G1 pins the highest-value invariant: the field's survival through `mergeSunFields(toVenueData(...))`.
- E2E deliberately NOT added — request-count/perf/real-device gates are Story 11.8's; component tests prove both opening-hours branches more cheaply (matches the story's "(optional)" E2E note).

### Next recommended workflow
- `trace` (traceability matrix) to confirm every Story-11.4 AC maps to a test, or `test-review` for a quality pass on the reworked `VenueQuickInfo.test.tsx`. Neither is blocking — this pass is purely additive top-up on an already-comprehensive suite.

