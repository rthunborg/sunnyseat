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
storyId: "12.2"
storyKey: 12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass
storyFile: C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass.md
generatedTestFiles:
  - nextjs-app/test/unit/api/story-12-2-feedback-accuracy-loop.atdd.test.ts
  - nextjs-app/test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts
  - nextjs-app/test/e2e/story-12-2-feedback-evidence.atdd.spec.ts
inputDocuments:
  - project-context.md
  - _bmad-output/implementation-artifacts/12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass.md
  - _bmad/tea/config.yaml
  - nextjs-app/package.json
  - nextjs-app/playwright.config.ts
  - nextjs-app/vitest.config.ts
---

# ATDD Checklist: Story 12.2 Feedback-Driven Accuracy Loop + Retire Coverage-Cap Bypass

## TDD Red Phase

Red-phase acceptance scaffolds are generated and intentionally skipped with `test.skip()`.

- API/unit/SQL tests: 15 skipped scaffolds
- E2E tests: 2 skipped scaffolds
- Total: 17 skipped scaffolds
- Expected behavior: activated tests should fail before Story 12.2 implementation, then pass after the matching implementation task lands

## Mode And Constraints

- Detected stack: fullstack Next.js with Vitest and Playwright.
- Generation mode: AI generation. Browser recording was not needed because the affected UI path already has stable forced-state selectors and the story is primarily backend/ops/data-analysis work.
- Execution mode: sequential. The skill's subagent files were read, but subagent spawning was not used because the active runtime instruction forbids delegation unless explicitly requested.
- Pact.js guidance loaded as required by TEA, but no Pact files were added. Existing SunnySeat patterns fit this story better as Vitest API, source-contract, SQL, and Playwright E2E scaffolds.

## Acceptance Criteria Coverage

| AC | Scaffold coverage |
| --- | --- |
| AC1 live feedback identity prerequisite | Route source must consume the shared 12.7 public resolver, remove `VENUE_FIXTURE.find` from live matching, and reject hidden/unknown venues with identical 404 before persistence. |
| AC2 explicit agreement mapping | Functional and report-source scaffolds cover amber/grey mapping from exposure plus weather gate, exactly 50 as grey, `Partial` 40/60 vectors, no raw status/string comparison, and `unsure` excluded from denominator. |
| AC3 prediction evidence persisted | Route, DTO/type, Supabase type, migration, and persistence scaffolds require `sun_exposure_percent`, `public_sun_verdict`, `weather_gated`, `weather_unknown`, and `geometry_input_hash`. |
| AC4 maintainer-ranked wrong-venue list | Source-contract scaffold requires a deterministic maintainer script/report with ranking fields, area context, current hash, representative windows, and per-venue invalid-evidence isolation. |
| AC5 corrected geometry resets current accuracy | Migration/report scaffolds require current-hash-only denominator, stale hash counts, legacy/missing evidence counts, and no fabricated backfill. |
| AC6 coverage-cap bypass retired | Source-contract scaffold requires all `SUNNYSEAT_COVERAGE_CAP` and `isCoverageCapDisabled` references removed from code/docs/config/workflows while preserving the internal cap. |
| AC7 uncertainty impact deliberate | E2E and source-contract scaffolds guard against adding visible confidence copy and require the internal cap to remain fail-closed unless deliberately replaced. |
| AC8 internal confidence documented | Source-contract scaffold requires retained confidence to be documented as diagnostic/maintainer-only, not public visible or screen-reader percentage copy. |

## Generated Files

- `nextjs-app/test/unit/api/story-12-2-feedback-accuracy-loop.atdd.test.ts`
- `nextjs-app/test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts`
- `nextjs-app/test/e2e/story-12-2-feedback-evidence.atdd.spec.ts`
- `_bmad-output/test-artifacts/tea-atdd-api-tests-2026-07-18T00-00-00-000Z-story-12-2.json`
- `_bmad-output/test-artifacts/tea-atdd-e2e-tests-2026-07-18T00-00-00-000Z-story-12-2.json`
- `_bmad-output/test-artifacts/tea-atdd-summary-2026-07-18T00-00-00-000Z-story-12-2.json`

## Activation Plan

1. Task 0 prerequisite check: activate only the source-contract assertions that prove the shared resolver, public sunny predicate, geometry hash, and confidence-removal premise are consumed rather than locally invented.
2. Task 1 migration/types/persistence: activate the migration/type/persistence tests in `story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts`.
3. Task 2 feedback POST: activate the route tests in `story-12-2-feedback-accuracy-loop.atdd.test.ts` and the first E2E evidence submission test.
4. Task 3 agreement mapping: activate the exact-50, `Partial`, weather-gated, and `unsure` mapping scaffolds.
5. Task 4 maintainer report: activate the maintainer report source/contract tests and add lower-level deterministic data tests during implementation if the report is a script/RPC.
6. Task 5 coverage-cap bypass retirement: activate the coverage-cap cleanup tests after removing the env escape hatch.
7. Task 6 gate reporting: run `cd nextjs-app && npx tsc --noEmit`, `npx eslint . --quiet`, `npx vitest run`, and targeted/full Playwright according to whether browser-visible behavior changed.

## Red-Phase Validation

- All generated test functions use `test.skip()`.
- No scaffold uses placeholder assertions such as `expect(true).toBe(true)`.
- Scaffolds import only existing modules at top level so they do not break TypeScript while skipped.
- Activated tests are expected to fail on the current implementation because Story 12.2 fields, resolver consumption, report script, migration, and coverage-cap cleanup are not yet complete.
- No CLI browser session was opened, so there are no orphaned sessions to clean up.
- Temp generation artifacts are stored under `_bmad-output/test-artifacts/`, not random temp paths.

## Assumptions

- The maintainer report will live under `nextjs-app/scripts/` if implemented as a script; if it becomes SQL/RPC-only, update the report-source scaffold to inspect the migration/RPC source instead.
- Fixture-mode fallback remains valid for deterministic test/dev states, but live mode must use the shared Story 12.7 resolver.
- Pact.js was not introduced because this is an internal Next.js route/database contract in a monorepo, and existing Vitest contracts give lower-friction coverage.

## Next Workflow

Run `bmad-dev-story` for Story 12.2. During implementation, activate the skipped scenarios task by task and prove red before green.
