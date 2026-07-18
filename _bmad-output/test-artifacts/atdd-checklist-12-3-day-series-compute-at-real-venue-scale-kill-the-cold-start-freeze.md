---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: 2026-07-18
storyId: "12.3"
storyKey: 12-3-day-series-compute-at-real-venue-scale-kill-the-cold-start-freeze
storyFile: C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\12-3-day-series-compute-at-real-venue-scale-kill-the-cold-start-freeze.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-12-3-day-series-compute-at-real-venue-scale-kill-the-cold-start-freeze.md
generatedTestFiles:
  - nextjs-app/test/unit/api/story-12-3-persisted-geometry-route.atdd.test.ts
  - nextjs-app/test/unit/services/sun-geometry-hash.atdd.test.ts
  - nextjs-app/test/unit/services/sun-geometry-precompute.atdd.test.ts
  - nextjs-app/test/unit/services/weather-snapshots.atdd.test.ts
  - nextjs-app/test/unit/story-12-3-geometry-migrations-and-leases.atdd.test.ts
  - nextjs-app/test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts
inputDocuments:
  - project-context.md
  - _bmad-output/implementation-artifacts/12-3-day-series-compute-at-real-venue-scale-kill-the-cold-start-freeze.md
  - _bmad/tea/config.yaml
  - nextjs-app/package.json
  - nextjs-app/playwright.config.ts
  - nextjs-app/vitest.config.ts
---

# ATDD Checklist: Story 12.3 Day-Series Compute at Real-Venue Scale

## TDD Red Phase

Red-phase acceptance scaffolds are generated and intentionally skipped with `test.skip()` / `test.describe.skip()`.

- API/route tests: 5 skipped scaffolds
- Hash/unit tests: 7 skipped scaffolds
- Precompute/unit tests: 5 skipped scaffolds
- Weather snapshot tests: 5 skipped scaffolds
- SQL/ops tests: 6 skipped scaffolds
- E2E request-count tests: 2 skipped scaffolds
- Total: 30 skipped scaffolds
- Expected behavior: activated tests should fail before Story 12.3 implementation, then pass as the persisted geometry, weather snapshot, SQL lease, and scheduled job tasks land.

## Mode And Constraints

- Detected stack: fullstack Next.js with Vitest and Playwright.
- Generation mode: AI generation. Browser recording was not needed because this story has no visual delta and uses existing request-count selectors.
- Execution mode: sequential. The skill's orchestration step was followed locally because the active runtime instruction forbids subagent delegation unless explicitly requested.
- Pact.js guidance was not applied. This story is an internal Next.js/Supabase contract in a monorepo, and the existing Vitest + Playwright scaffold style is the lower-friction project pattern.

## Acceptance Criteria Coverage

| AC | Scaffold coverage |
| --- | --- |
| AC1 deterministic ungated geometry + exact hash invalidation | Hash tests cover `g1:<sha256>`, ring/order invariance, row-order invariance, `-0`, non-finite rejection, planner-step version, caster EWKB, import generation, and z-values. Precompute tests require geometry-only series. |
| AC2 persisted Supabase geometry + cold-route behavior | Route tests require persisted reads, no request-path `computeVenueDaySeries`/Met.no fan-out, exact current-hash coverage, typed `503 SUN_GEOMETRY_COVERAGE_MISSING`, and fail-closed gaps. SQL tests require RLS and service-only access. |
| AC3 GitHub Action precompute across planner window | Precompute tests require today through `today + PLANNER_MAX_FUTURE_DAYS + 1` and all venues. Ops tests require scheduled/workflow_dispatch GitHub Actions with direct Supabase jobs, production environment, and concurrency. |
| AC4 forecast horizon | Weather tests require planner-horizon snapshots or explicit unknown, and a day+3 boundary that does not reuse stale nearest 48-hour slices. |
| AC5 midnight roll | Precompute window test requires the one-day lookahead buffer used for midnight continuity. |
| AC6 CPU profiling | Precompute tests require cold-route before/after, bucket-roll, and precompute timing evidence. |
| AC7 retire external warmer | Ops tests reject quarter-hour warmer/keep-alive references in workflows and deployment docs. |

## Generated Files

- `nextjs-app/test/unit/api/story-12-3-persisted-geometry-route.atdd.test.ts`
- `nextjs-app/test/unit/services/sun-geometry-hash.atdd.test.ts`
- `nextjs-app/test/unit/services/sun-geometry-precompute.atdd.test.ts`
- `nextjs-app/test/unit/services/weather-snapshots.atdd.test.ts`
- `nextjs-app/test/unit/story-12-3-geometry-migrations-and-leases.atdd.test.ts`
- `nextjs-app/test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts`
- `_bmad-output/test-artifacts/tea-atdd-api-tests-2026-07-18T00-00-00-000Z-story-12-3.json`
- `_bmad-output/test-artifacts/tea-atdd-e2e-tests-2026-07-18T00-00-00-000Z-story-12-3.json`
- `_bmad-output/test-artifacts/tea-atdd-summary-2026-07-18T00-00-00-000Z-story-12-3.json`

## Activation Plan

1. Task 1 hash canonicalization: activate `sun-geometry-hash.atdd.test.ts` first and prove the geometry hash before using it in SQL or routes.
2. Task 2 SQL/state: activate `story-12-3-geometry-migrations-and-leases.atdd.test.ts` table/RLS/lease/state tests alongside the migration.
3. Task 3 precompute: activate `sun-geometry-precompute.atdd.test.ts` as the batch runner and coverage table publish semantics land.
4. Task 4 weather snapshots: activate `weather-snapshots.atdd.test.ts`, especially the day+3 stale-nearest-slice boundary.
5. Task 5 public route: activate `story-12-3-persisted-geometry-route.atdd.test.ts` after the route reads persisted geometry and snapshots fail-closed.
6. Task 6 request-count regression: activate `story-12-3-persisted-geometry-request-count.atdd.spec.ts` after route mocks expose the persisted DTO and the app remains UI-stable.

## Red-Phase Validation

- All generated test functions use `test.skip()` or are inside `test.describe.skip()`.
- No scaffold uses placeholder assertions such as `expect(true).toBe(true)`.
- Top-level imports reference existing modules only. Future implementation modules are loaded inside skipped bodies through dynamic imports.
- Activated tests are expected to fail on the current implementation because `/api/venues` still computes day-series on the request path, `getForecast` still slices 48 entries, and the persisted geometry/hash/precompute/weather snapshot modules and SQL state machine do not exist yet.
- No visual validation is required; Story 12.3 is explicitly non-visual.

## Assumptions

- The implementation will expose test hooks or equivalent dependency-injection seams for route repository tests. If production code chooses a different seam, update only the hook wiring in the skipped route tests, not the acceptance expectations.
- SQL object names may vary, but table/state/service-only semantics should remain equivalent to the assertions.
- The exact hash implementation owns the final canonical byte specification. The current scaffold pins invariants and format, with the implementation expected to add/retain full golden vectors.

## Next Workflow

Run `bmad-dev-story` for Story 12.3. During implementation, activate the skipped scenarios task by task and prove red before green.
