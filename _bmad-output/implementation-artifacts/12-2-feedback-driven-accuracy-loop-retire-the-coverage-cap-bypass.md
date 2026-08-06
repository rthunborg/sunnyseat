# Story 12.2: Feedback-Driven Accuracy Loop + Retire the Coverage-Cap Bypass

Status: review

## Story

As a **maintainer improving prediction accuracy**,
I want visit feedback captured with the exact public prediction evidence and aggregated against the current venue geometry version,
so that SunnySeat can identify venues/time windows that look wrong, correct the underlying geometry inputs, and retire the dead coverage-cap bypass without letting stale pre-fix feedback distort current accuracy.

## Pre-Implementation Dependency Gate

This story is ready as a brief, but implementation must begin with an explicit prerequisite check. Do not invent local substitutes for these shared Epic 12 contracts:

1. **Story 12.3 geometry hash:** the canonical server-owned `geometry_input_hash` exists and is available to the typed feedback evidence path in the exact `g1:<lowercase SHA-256>` format. No client, route, report, or test in this story may construct or approximate the hash independently.
2. **Story 12.6 public sunny predicate:** a shared predicate/helper exists for `sunExposurePercent > 50 && weatherGateState !== 'gated'`, with explicit `weatherGateState: 'gated' | 'not_gated' | 'unknown'`. If it is not present, stop rather than mapping from raw `VenueSunStatus` or treating every `Partial` as sunny.
3. **Story 12.7 live venue resolver:** feedback POST uses the shared live id-or-slug public resolver/visibility guard. Fixture fallback is allowed only in fixture mode. If the route still resolves via `VENUE_FIXTURE` in live mode, stop before implementing the accuracy loop.
4. **Story 12.13 confidence-removal premise:** user-facing confidence may already be gone by the time this story is implemented. If not, keep this story scoped: do not complete Story 12.13 here, do not add new visible/screen-reader confidence, and run uncertainty/display regression tests for any label change.

If a prerequisite is absent on the implementation branch, mark dev-story blocked with the missing contract and do not ship a local one-off resolver, hash, or sunny predicate.

## Acceptance Criteria

1. **Live feedback identity prerequisite.** Feedback POST resolves real venues by id or slug through the shared Story 12.7 public visibility guard and consistently rejects hidden or unknown venues. The current fixture-only feedback route bug is fixed by consuming that resolver, not by duplicating route-local fixture matching.
2. **Explicit agreement mapping.** Accuracy aggregation computes agreement from `predicted_state`/prediction evidence versus `sun_accuracy` with an explicit mapping. Public sunny is the shared 12.6 rule (`sunExposurePercent > 50 && weatherGateState !== 'gated'`) / amber verdict, not a raw string comparison and not any `Partial` status. `unsure` feedback is excluded from the agreement denominator and reported separately.
3. **Prediction evidence is persisted.** Feedback contract and storage persist prediction-time `sun_exposure_percent`, `public_sun_verdict` (`amber` or `grey`), `weather_gated`, `weather_unknown`, and `geometry_input_hash`, alongside the existing predicted state, user answer, timestamp, and optional note/outdoor-seating answer.
4. **Maintainer-ranked wrong-venue list.** A deterministic maintainer report ranks venues and areas that look wrong, with enough context to drive corrective edits to seating polygons, elevations, caster heights, or the Story 12.5 editor/direct DB workflow.
5. **Corrected geometry resets current accuracy.** Old feedback must not keep a fixed venue ranked wrong. Aggregation is scoped to the venue's current `geometry_input_hash`; rows with old or missing hashes are excluded from current agreement and counted separately as legacy/stale evidence.
6. **Coverage-cap bypass is retired.** Remove the `SUNNYSEAT_COVERAGE_CAP` env-gated bypass from code, tests, docs/configuration, and deployment checklist. The internal coverage confidence cap may remain, but the environment escape hatch must not.
7. **Uncertainty impact is deliberate.** Because `buildPredictionUncertainty` currently derives its tier from confidence, any change to the internal cap/confidence path either decouples uncertainty tiers from capped confidence with tests or intentionally rebaselines uncertainty labels/tests. User-facing label changes trigger normal copy, accessibility, and visual validation.
8. **Remaining internal confidence uses are documented.** Any retained internal confidence computation is documented as diagnostic/maintainer-only and not exposed as a visible or screen-reader percentage.

Design gate: this is primarily backend/ops/data-analysis work. No visual gate is required if public UI copy and uncertainty labels do not change. If uncertainty copy, feedback copy, or any visible confidence/percentage behavior changes, run the normal frontend checks and visual validation for affected screen IDs.

## Design Gate Criteria

No standalone visual deliverable. Story 12.2 changes the hidden feedback evidence payload, feedback API/persistence contract, maintainer reporting, and coverage-cap bypass behavior. Public feedback copy, layout, uncertainty labels, and visible confidence presentation are unchanged; the executable browser evidence is the targeted Playwright feedback route mock.

## Tasks / Subtasks

- [x] **Task 0 - Verify shared Epic 12 prerequisites before coding** (AC: 1, 2, 3, 5, 7)
  - [x] Confirm the current branch has the Story 12.3 `geometry_input_hash` module/database field and that feedback can submit the exact server-owned current hash.
  - [x] Confirm the shared Story 12.6 public sunny predicate and `weatherGateState` tri-state exist in a server-safe module or parity-tested client/server mirror.
  - [x] Confirm the Story 12.7 public venue resolver is available and usable by feedback POST. Hidden and unknown venues must return the same public 404.
  - [x] Confirm current confidence UI state after Story 12.13. If visible confidence remains, preserve existing behavior and do not claim this story removes it.
  - [x] If any check fails, stop with a blocked dev-story record naming the missing prerequisite. Do not implement local one-off versions.

- [x] **Task 1 - Evolve feedback storage and generated types through the controlled migration seam** (AC: 3, 5)
  - [x] Add a versioned idempotent migration under repository-root `supabase/migrations/` for nullable additive columns on `public.feedback`: `sun_exposure_percent`, `public_sun_verdict`, `weather_gated`, `weather_unknown`, and `geometry_input_hash`.
  - [x] Enforce checks: exposure is integer `0..100`; verdict is `amber` or `grey`; gated and unknown cannot both be true; hash matches `^g[0-9]+:[0-9a-f]{64}$`; existing note/control-character/answer coherence checks stay intact.
  - [x] Preserve the write-only public contract: RLS enabled, no `anon`/`authenticated`/`public` grants or policies, service-role insert/select only as required for insert-returning.
  - [x] Regenerate `nextjs-app/lib/supabase/types.ts`; update `FeedbackResponse`, `SubmitFeedbackRequest`, persistence row types, route Zod schemas, fixtures, and any route/component test types together.
  - [x] Legacy rows remain valid but are not used for current agreement unless they contain the new evidence and current hash.

- [x] **Task 2 - Route feedback POST through live identity and prediction evidence validation** (AC: 1, 3)
  - [x] Replace `VENUE_FIXTURE` lookup in `nextjs-app/app/api/venues/[slug]/feedback/route.ts` with the shared Story 12.7 resolver in public mode; fixture fallback only when the resolver is explicitly in fixture mode.
  - [x] Validate body `venueId`/`venueSlug` against the resolved venue and keep stable `404`, `409`, `400`, `415`, and `503` behavior where applicable.
  - [x] Accept and persist prediction-time evidence fields from the typed feedback request. The server should recompute or verify fields against the resolved venue/current prediction data wherever that contract exists; otherwise fail closed rather than silently trusting contradictory evidence.
  - [x] Keep `CloudObscured` accepted as a diagnostic `predictedState`; weather-gated public verdict is determined by `weatherGateState`, not by rejecting that state.
  - [x] Update `nextjs-app/hooks/mutations/useSubmitFeedback.ts`, `FeedbackFlow`, `feedback-session`, and the feedback E2E route mock to include the new evidence without changing the two-tap Swedish feedback UX unless required by AC7.

- [x] **Task 3 - Centralize agreement mapping on the public sunny predicate** (AC: 2, 7)
  - [x] Use the shared predicate for amber/grey verdict: `amber` iff `sunExposurePercent > 50 && weatherGateState !== 'gated'`; exactly `50` is grey.
  - [x] Treat weather `unknown` as explicit unknown-weather evidence, never as known-clear. It may be amber only under the shared predicate's approved unknown-weather contract and must retain `weather_unknown=true`.
  - [x] Do not derive agreement from raw `VenueSunStatus`; a `Partial` at `40` is grey/not sunny and a `Partial` at `60` can be amber if not gated.
  - [x] Map user answers explicitly: `sun_accuracy='sunny'` agrees with `amber`; `sun_accuracy='not_sunny'` agrees with `grey`; `sun_accuracy='unsure'` is excluded from denominator and reported separately.

- [x] **Task 4 - Build maintainer accuracy aggregation/reporting** (AC: 2, 4, 5, 8)
  - [x] Provide a deterministic report surface, either a service-only SQL view/RPC plus test harness or a repository script under `nextjs-app/scripts/` (remember `nextjs-app/.gitignore` ignores scripts unless explicitly allow-listed).
  - [x] Rank by disagreement rate with minimum sample count, then disagreement count, then newest disagreeing feedback, then stable venue id/slug. Report venue id, slug/name, area/neighborhood, current hash, sample counts, agreement rate, disagree count, unsure count, legacy/stale count, last feedback timestamp, and representative wrong windows if available.
  - [x] Scope current agreement to rows whose `geometry_input_hash` equals the venue's current hash. Rows missing the new evidence or carrying old hashes are counted as `legacy_unscored_count`/`stale_hash_count`, not backfilled with fabricated evidence.
  - [x] Preserve per-venue isolation: malformed evidence for one venue is reported as bounded invalid evidence and must not abort the whole report.
  - [x] Keep repeatable CI deterministic. Any live/protected operational run evidence belongs in the Dev Agent Record and is not a substitute for mocked/fixture tests.

- [x] **Task 5 - Retire the coverage-cap bypass without weakening uncertainty honesty** (AC: 6, 7, 8)
  - [x] Remove `process.env.SUNNYSEAT_COVERAGE_CAP` reads and the `isCoverageCapDisabled` bypass from `nextjs-app/lib/solar/shadow-data-coverage.ts`.
  - [x] Delete or rewrite `nextjs-app/test/unit/shadow-data-coverage.cap-flag.test.ts` so tests assert the default fail-closed cap only; keep the core cap behavior tested in `shadow-data-coverage.test.ts`.
  - [x] Search documentation, env examples, CI/Vercel docs, test setup, and code for `SUNNYSEAT_COVERAGE_CAP`; remove references or replace with a deployment checklist item confirming the Vercel env var is deleted.
  - [x] Preserve the internal coverage cap unless there is a deliberate, tested replacement. Do not raise displayed/user-facing certainty by removing a conservative cap.
  - [x] If confidence math changes, add focused `sun-engine` / uncertainty-display tests proving `buildPredictionUncertainty` remains honest and accessible after the cap cleanup.

- [x] **Task 6 - Complete deterministic evidence and story-gate reporting** (AC: all)
  - [x] Add/update unit and API tests for live resolver use, hidden/unknown rejection, evidence schema validation, mismatch rejection, `CloudObscured`, `weather_gated`/`weather_unknown`, and legacy row compatibility.
  - [x] Add SQL/contract tests for migration replay, checks, role denial, generated type parity, and current-hash aggregation/reset semantics.
  - [x] Add aggregation tests for at least these vectors: Sunny/high exposure agrees with `sunny`; `Partial` 40 agrees with `not_sunny`; `Partial` 60 agrees with `sunny`; exactly 50 is grey; weather-gated high exposure is grey; weather-unknown is explicit; `unsure` is excluded and counted; old hash is excluded from current rate; missing evidence is legacy/unscored.
  - [x] Run from `nextjs-app/`: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx vitest run`, and targeted Playwright for the changed feedback browser evidence path.
  - [x] If user-facing uncertainty labels or feedback UI change, update Swedish/English translations, run affected component/E2E/a11y tests, run visual validation for `feedback` (`/?venue=test-venue-sunny&_state=feedback`) and any affected venue surfaces, and make `a11y-mobile` evidence executable if the mobile UI is touched.

## Dev Notes

### ATDD Artifacts

- Checklist: `_bmad-output/test-artifacts/atdd-checklist-12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass.md`
- API/unit tests: `nextjs-app/test/unit/api/story-12-2-feedback-accuracy-loop.atdd.test.ts`
- SQL/ops/source-contract tests: `nextjs-app/test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts`
- E2E tests: `nextjs-app/test/e2e/story-12-2-feedback-evidence.atdd.spec.ts`

### Current Implementation Facts

- `nextjs-app/app/api/venues/[slug]/feedback/route.ts` currently imports `VENUE_FIXTURE`, resolves only fixture venues by id/slug, and therefore cannot submit real live venue feedback. This is the direct AC1 bug.
- The feedback route currently validates and persists only `predictedState`, `sunAccuracy`, optional `confidenceAtPrediction`, `wasSunny`, `outdoorSeatingConfirmed`, and note. It accepts the full `VenueSunStatus` union, including `CloudObscured`.
- `nextjs-app/lib/services/venue-feedback-persistence.ts` writes a write-only `feedback` sink through service role only when `SUNNYSEAT_FEEDBACK_PERSISTENCE=supabase`; default/test mode is in-memory. The existing insert maps only the old columns.
- `nextjs-app/lib/types/api.ts` has `SubmitFeedbackRequest` / `FeedbackResponse` without the evidence fields. It also still has legacy `AccuracyMetricsResponse` and `ProblematicVenueResponse` types that are not an implementation contract for this story unless deliberately reused and updated.
- `nextjs-app/components/custom/feedback/FeedbackFlow.tsx` and `nextjs-app/lib/services/feedback-session.ts` currently record `predictedState` and `confidenceAtPrediction` only. They do not capture sun-exposure percent, public verdict, weather state, or geometry hash at detail-view time.
- `nextjs-app/components/custom/map/MapView.tsx` renders `FeedbackFlow` only for live planner time or forced `feedback` state. The visual route in project context is `/?venue=test-venue-sunny&_state=feedback`.
- `public.feedback` currently has only the Story 3.2/8.4/10-era columns in `nextjs-app/lib/supabase/types.ts` and `_bmad-output/implementation-artifacts/3-2-feedback-contract.sql`: venue id/slug, timestamp, predicted state, sun accuracy, confidence, was_sunny, outdoor seating, note, and created_at.
- `nextjs-app/lib/solar/shadow-data-coverage.ts` currently supports `SUNNYSEAT_COVERAGE_CAP=off` to bypass the conservative coverage clamp. Story 12.2 removes that flag, not necessarily the internal clamp.
- `nextjs-app/lib/services/sun-engine.ts` currently derives uncertainty level from confidence via `uncertaintyLevelFromConfidence`. `applyCloudGate` has an `isRaining=false` default; any new caller must pass explicit weather/rain state and must not infer weather gating from status text alone.
- `nextjs-app/app/api/reviews/route.ts` and `nextjs-app/lib/services/venue-reviews-persistence.ts` still demonstrate the fixture-only identifier seam that Story 12.7 is intended to replace across reviews and feedback.

### Data Contract

- Planned feedback evidence fields come from Architecture Epic 12 persisted data contracts: `feedback.sun_exposure_percent`, `feedback.public_sun_verdict`, `feedback.weather_gated`, `feedback.weather_unknown`, and `feedback.geometry_input_hash`.
- `weather_gated` and `weather_unknown` are separate booleans because unknown weather must not later be reconstructed as known-clear. SQL and Zod both require that they cannot both be true.
- `geometry_input_hash` is Story 12.3-owned. This story only stores and compares it; it must not hash seating polygons/casters itself.
- Public handlers may expose the hash only as typed prediction evidence needed to submit feedback. Do not expose engine coordinates, provider provenance, service-only geometry rows, or maintainer report internals in public DTOs.

### Aggregation Contract

- Current agreement denominator: determinate rows only (`sunny` or `not_sunny`) with complete evidence and `geometry_input_hash` equal to the venue's current hash.
- Excluded but reported: `unsure`, legacy/missing evidence, stale hash, malformed evidence, and venues whose current hash cannot be resolved.
- Preferred ranking fields: `current_sample_count`, `agreement_count`, `disagreement_count`, `agreement_rate`, `unsure_count`, `legacy_unscored_count`, `stale_hash_count`, `invalid_evidence_count`, `latest_feedback_at`, and stable venue identity/area fields.
- The report is maintainer-facing. It may be CLI/SQL output; do not create a public dashboard or product analytics UI unless a later story explicitly asks for one.

### Confidence, Cap, And Uncertainty

- PRD v3.2 and UX spec say internal confidence remains diagnostic-only; public UI communicates weather obstruction and uncertainty without a confidence percentage.
- The overlapping deferred-work item from Epic 10 says the existing coverage cap deliberately preserves honesty for unvalidated venues. Do not remove that honesty mechanism just to make cloud-confidence changes visible. If confidence factors are reordered, cloud/weather factors may lower capped confidence but must not raise user-facing certainty.
- The separate deferred metadata cleanup notes that `predictionUncertainty` and some visual metadata are still computed after several UI consumers were removed. This story may touch uncertainty only to satisfy AC7. Do not delete uncertainty reasoning wholesale unless current post-12.13 consumers and tests prove it is dead.
- Remaining internal confidence uses should be documented in code or docs as diagnostics, coverage assessment, uncertainty reasoning, and maintainer prioritization only.

### Retro Carry-Ins From Story 12.1

- Persistence/data stories need explicit run ownership, input binding, and per-venue isolation versus whole-population atomicity. Apply that to the aggregation/report: each venue's evidence is isolated; one bad venue cannot certify or fail the whole accuracy loop invisibly.
- Database hardening needs executable state-transition/schema tests. Text-presence assertions are not enough for hash reset, old-row exclusion, RLS/grants, and weather flag constraints.
- If Supabase CLI push is blocked by local profile validation, the protected-pooler plus explicit migration-history transaction fallback is an accepted live-apply path, but the Dev Agent Record must record exact apply/evidence. Do not simulate live schema evidence in repeatable CI.
- If adding a script under `nextjs-app/scripts/`, update `nextjs-app/.gitignore` allow-list in the same change. If adding a root `scripts/*` helper, update root `.gitignore` allow-list too.
- Do not put live provenance/remediation checks into repeatable CI. Deterministic CI covers contracts; protected/live operational evidence is separately recorded.
- Derive ATDD/test counts from the test framework output, not hand-authored priority/count tables.

### Testing Requirements

- Required local baseline and gate commands from `nextjs-app/`: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx vitest run`.
- Run `npx playwright test` or targeted/full Playwright projects when API/DTO changes affect browser flows, when feedback E2E mocks need updating, or when uncertainty/copy/UI behavior changes.
- For frontend changes, follow design-token rules in `nextjs-app/docs/design/DESIGN.md`; Swedish remains default user-facing copy; interactive controls keep semantic names, visible focus, and 44x44 touch targets.
- Automated tests must not call live Met.no, Google Places, Supabase production, or another external provider. Use fixtures/mocks or project-scoped local/test infrastructure.
- Visual validation is required only if visible feedback UI or uncertainty labels change. Use `.\scripts\run-sh.ps1 scripts/visual-validate.sh feedback /?venue=test-venue-sunny^&_state=feedback mobile` from PowerShell with appropriate escaping if the story introduces a visual change.

### Out Of Scope

- Do not implement the Story 12.5 maintainer editor, seating polygon editing UI, elevation editor, media tooling, or hidden-venue admin flow here.
- Do not implement Story 12.3 persisted geometry generation, Story 12.6 public pin simplification, Story 12.7 resolver, Story 12.13 confidence removal, or Story 12.14 availability filtering inside this story. Consume those contracts only after they exist.
- Do not backfill old feedback by guessing missing exposure percent, verdict, weather flags, or geometry hash.
- Do not add a public accuracy dashboard or publish a global accuracy statistic to About unless the aggregation source, window, denominator, and copy are explicitly approved and tested.

### Project Structure Notes

- Repository root is `C:\Users\Rasmus\sunnyseat`; the Next.js app root is `nextjs-app/`. Run npm/npx commands from `nextjs-app/`.
- Versioned production migrations belong in repository-root `supabase/migrations/`. Local `_bmad-output/*.sql` artifacts are evidence only, not migration authority.
- Client components must not import server-only Supabase, solar, weather, middleware, or building modules. Data access flows through `app/api/*` routes and hooks under `hooks/queries` or `hooks/mutations`.
- Preserve the component layering: `components/custom` may use `components/composed`; `components/composed` may use `components/ui`; do not reverse the dependency direction.
- If a maintainer script is created under `nextjs-app/scripts/`, update `nextjs-app/.gitignore` because it ignores `scripts/*` except explicit allow-list entries.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 12.2]
- [Source: `project-context.md` - Active Epic 12 invariants and Screen ID -> Route Map]
- [Source: `_bmad-output/planning-artifacts/prd.md` - Validation Approach, FR12, FR17, LR4]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - Feedback screen, confidence removal, public sunny model]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - E12-AD-03, E12-AD-05, E12-AD-08, E12-AD-12, persisted data contracts]
- [Source: `_bmad-output/test-artifacts/test-design/test-design-epic-12.md` - Story 12.2 risk/coverage and feedback accuracy/version contract]
- [Source: `_bmad-output/auto-bmad/retro-notes/epic-12.md` - Story 12.1 retro carry-ins]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` - overlapping confidence/coverage-cap and uncertainty deferred items]
- [Source: `nextjs-app/app/api/venues/[slug]/feedback/route.ts` - current fixture-only feedback POST]
- [Source: `nextjs-app/lib/services/venue-feedback-persistence.ts` - current feedback persistence adapter]
- [Source: `nextjs-app/lib/types/api.ts` - current feedback DTO types]
- [Source: `nextjs-app/components/custom/feedback/FeedbackFlow.tsx` and `nextjs-app/lib/services/feedback-session.ts` - current submitted prediction fields]
- [Source: `nextjs-app/lib/solar/shadow-data-coverage.ts` and `nextjs-app/lib/services/sun-engine.ts` - coverage cap and uncertainty coupling]

### Review Findings

- [x] [Review][Patch][Med] Maintainer report has no ranked area output [nextjs-app/lib/services/feedback-accuracy-report.ts:38] — AC4 requires the maintainer report to rank venues and areas that look wrong; the current report shape only returns `venues`, with `area` as per-venue context rather than a ranked area/neighborhood aggregate.
- [x] [Review][Patch][Med] Minimum sample count is bypassed for any disagreement [nextjs-app/lib/services/feedback-accuracy-report.ts:72] — AC4 requires ranking with a minimum sample count, but the current filter includes any venue with one disagreement even when the CLI default threshold is higher.
- [x] [Review][Patch][Med] Tie-breaker uses latest feedback rather than latest disagreeing feedback [nextjs-app/lib/services/feedback-accuracy-report.ts:100] — AC4 requires deterministic ordering by newest disagreeing feedback after disagreement rate/count, but `latestFeedbackAt` is updated before row classification and can be set by agreeing, unsure, stale, legacy, or invalid evidence.
- [x] [Review][Patch][Med] Malformed complete evidence is counted as legacy rather than invalid [nextjs-app/lib/services/feedback-accuracy-report.ts:183] — AC4/AC5 require malformed evidence to be reported as bounded invalid evidence while missing pre-12.2 evidence is counted as legacy; `parseEvidence` returns `null` for several malformed present fields and the caller increments `legacyUnscoredCount`.

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

- 2026-08-06: Baseline `cd nextjs-app && npx tsc --noEmit` passed before story edits.
- 2026-08-06: Baseline `cd nextjs-app && npx eslint . --quiet` passed before story edits.
- 2026-08-06: Task 0 prerequisite scan passed:
  - Story 12.3 geometry hash exists in `nextjs-app/lib/services/sun-geometry-hash.ts`, `nextjs-app/lib/services/sun-geometry-repository.ts`, `supabase/migrations/20260718193000_persist_sun_geometry_series_and_weather_snapshots.sql`, and `VenueDataDto.predictionEvidence.geometryInputHash`.
  - Story 12.6 shared public-sunny predicate exists in `nextjs-app/lib/utils/public-sun.ts` with the `WeatherGateState` tri-state from `nextjs-app/lib/types/api.ts`.
  - Story 12.7 resolver exists in `nextjs-app/lib/services/venue-store.ts` and is used by feedback POST.
  - Story 12.13 confidence-removal boundary is enforced by removed-i18n/unit tests; retained confidence is internal diagnostic evidence only.
- 2026-08-06: Red phase activated the Story 12.2 ATDD unit scaffolds; targeted Story 12.2 run failed as expected before implementation.
- 2026-08-06: `cd nextjs-app && npx tsc --noEmit` passed after implementation.
- 2026-08-06: `cd nextjs-app && npx eslint . --quiet` passed after implementation.
- 2026-08-06: Targeted Vitest passed: `npx vitest run test/unit/api/story-12-2-feedback-accuracy-loop.atdd.test.ts test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts test/unit/services/feedback-accuracy-report.test.ts test/unit/services/venue-feedback-persistence.test.ts test/unit/api/venue-feedback-route.test.ts test/components/FeedbackFlow.test.tsx test/unit/services/feedback-session.test.ts test/unit/mutations/useSubmitFeedback.test.tsx` => 8 files / 52 tests passed.
- 2026-08-06: Full Vitest passed: `npx vitest run` => 210 files / 1913 tests passed.
- 2026-08-06: Targeted Playwright passed: `npx playwright test test/e2e/story-12-2-feedback-evidence.atdd.spec.ts` => P0 evidence submission passed on mobile and desktop; P1 weather-gated visual scaffold remains skipped because `_state=venue-detail-obscured` does not force-render the feedback prompt. Weather-gated evidence is covered by API/unit tests without changing production forced-state behavior.
- 2026-08-06: First canonical review wrapper run passed lint/typecheck/full Vitest, then failed the auto-detected `feedback` visual gate because `ANTHROPIC_API_KEY` is not set. Added explicit no-standalone-visual-deliverable metadata because this story makes no visible UI change.
- 2026-08-06: Canonical review wrapper passed: `.\scripts\run-sh.ps1 scripts/story-review.sh 12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass` => lint/typecheck/full Vitest passed; visual validation skipped via no-standalone-visual-deliverable metadata; sprint status moved to `review`. Validation artifact: `_bmad-output/implementation-artifacts/validation/12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass-review-20260806-201352.log`.
- 2026-08-06: Post-review `/bmad-testarch-automate` added executable maintainer CLI wrapper coverage: `npx vitest run test/unit/scripts/feedback-accuracy-report.test.ts` => 1 file / 2 tests passed.
- 2026-08-06: Post-review `/bmad-testarch-automate` static checks passed after the CLI runner extraction: `npx tsc --noEmit`; `npx eslint . --quiet`.
- 2026-08-06: Post-review `/bmad-testarch-automate` focused Story 12.2 regression passed: `npx vitest run test/unit/api/story-12-2-feedback-accuracy-loop.atdd.test.ts test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts test/unit/services/feedback-accuracy-report.test.ts test/unit/scripts/feedback-accuracy-report.test.ts test/unit/services/venue-feedback-persistence.test.ts test/unit/api/venue-feedback-route.test.ts test/components/FeedbackFlow.test.tsx test/unit/services/feedback-session.test.ts test/unit/mutations/useSubmitFeedback.test.tsx` => 9 files / 54 tests passed.
- 2026-08-06: Review patch pass resolved all four unchecked `[Review][Patch][Med]` findings in the maintainer accuracy report.
- 2026-08-06: Review patch focused report validation passed: `npx vitest run test/unit/services/feedback-accuracy-report.test.ts test/unit/scripts/feedback-accuracy-report.test.ts` => 2 files / 6 tests passed.
- 2026-08-06: Review patch static checks passed: `npx tsc --noEmit`; `npx eslint . --quiet`.
- 2026-08-06: Review patch focused Story 12.2 regression passed: `npx vitest run test/unit/api/story-12-2-feedback-accuracy-loop.atdd.test.ts test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts test/unit/services/feedback-accuracy-report.test.ts test/unit/scripts/feedback-accuracy-report.test.ts test/unit/services/venue-feedback-persistence.test.ts test/unit/api/venue-feedback-route.test.ts test/components/FeedbackFlow.test.tsx test/unit/services/feedback-session.test.ts test/unit/mutations/useSubmitFeedback.test.tsx` => 9 files / 55 tests passed.
- 2026-08-06: Review patch full Vitest passed with bounded worker count: `$env:VITEST_MAX_WORKERS='4'; npx vitest run` => 211 files / 1916 tests passed; existing non-fatal jsdom navigation and `--localstorage-file` warnings remained.

### Completion Notes List

- Feedback POST now uses the Story 12.7 resolver, validates prediction-time evidence, rejects contradictory public verdict/weather evidence, and persists the new evidence fields.
- Feedback UI/session now snapshots `sunExposurePercent`, `publicSunVerdict`, weather flags, and `geometryInputHash` at detail-view time while preserving the existing Swedish two-tap UX.
- Added nullable feedback evidence migration and updated Supabase/API/persistence types. Legacy rows remain valid but are excluded from current agreement when evidence/hash is absent or stale.
- Added deterministic maintainer report service plus CLI under `nextjs-app/scripts/`, with current-hash agreement, stale/legacy/unsure/invalid counters, representative wrong windows, and deterministic ranking.
- Post-review automate made the maintainer report CLI runner injectable and covered its Supabase query shape, env-configured minimum-sample threshold, deterministic JSON output, and query-failure behavior.
- ✅ Resolved review finding [Med]: maintainer report now returns ranked `areas` aggregates alongside ranked venues.
- ✅ Resolved review finding [Med]: venue and area rankings now enforce `minimumSampleCount` instead of including one-off disagreements below threshold.
- ✅ Resolved review finding [Med]: ranking tie-breakers now use `latest_disagreeing_feedback_at`; `latest_feedback_at` remains report context only.
- ✅ Resolved review finding [Med]: present-but-malformed prediction evidence now increments `invalid_evidence_count`; only rows with all evidence fields missing count as legacy/unscored.
- Removed the `SUNNYSEAT_COVERAGE_CAP` bypass while preserving the fail-closed internal coverage confidence cap and diagnostic-only confidence documentation.
- No public copy, uncertainty-label, or visual presentation change was made; visual validation was not required.

### File List

- _bmad-output/implementation-artifacts/12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/validation/12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass-review-20260806-201032.log
- _bmad-output/implementation-artifacts/validation/12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass-review-20260806-201352.log
- nextjs-app/.gitignore
- nextjs-app/app/api/venues/[slug]/feedback/route.ts
- nextjs-app/components/custom/feedback/FeedbackFlow.tsx
- nextjs-app/components/custom/venue/forced-venue-detail.ts
- nextjs-app/docs/environment-variables.md
- nextjs-app/lib/services/feedback-accuracy-report.ts
- nextjs-app/lib/services/feedback-session.ts
- nextjs-app/lib/services/venue-feedback-persistence.ts
- nextjs-app/lib/services/venues-fixture.ts
- nextjs-app/lib/solar/shadow-data-coverage.ts
- nextjs-app/lib/supabase/types.ts
- nextjs-app/lib/types/api.ts
- nextjs-app/lib/utils/public-sun.ts
- nextjs-app/scripts/feedback-accuracy-report.ts
- nextjs-app/test/components/FeedbackFlow.test.tsx
- nextjs-app/test/e2e/story-12-2-feedback-evidence.atdd.spec.ts
- nextjs-app/test/unit/api/story-12-2-feedback-accuracy-loop.atdd.test.ts
- nextjs-app/test/unit/api/story-12-5-public-display-and-hidden.automation.test.ts
- nextjs-app/test/unit/api/story-12-7-feedback-route-live-venues.atdd.test.ts
- nextjs-app/test/unit/api/story-12-7-shared-resolver-convergence.automation.test.ts
- nextjs-app/test/unit/api/venue-feedback-route.test.ts
- nextjs-app/test/unit/mutations/useSubmitFeedback.test.tsx
- nextjs-app/test/unit/services/feedback-accuracy-report.test.ts
- nextjs-app/test/unit/services/feedback-session.test.ts
- nextjs-app/test/unit/services/sun-engine.cloud-gate.coverage.test.ts
- nextjs-app/test/unit/services/venue-feedback-persistence.test.ts
- nextjs-app/test/unit/scripts/feedback-accuracy-report.test.ts
- nextjs-app/test/unit/shadow-data-coverage.cap-flag.test.ts
- nextjs-app/test/unit/story-12-2-accuracy-ops-and-cap-cleanup.atdd.test.ts
- supabase/migrations/20260806190000_feedback_accuracy_loop_evidence.sql
