---
baseline_commit: 1b1d4083e803a86beed9254d8bcb935ca8499eae
---
# Story 13.1: Provider-Classified Cold Starts, Dependency-Path Tracing, and Isolated Restore Drill

Status: in-progress

## Story

As the SunnySeat maintainer,
I want directly measured production resilience and recovery evidence,
so that launch decisions rest on provider-classified performance, attributable dependencies, and a rehearsed recovery path.

## Acceptance Criteria

1. **Given** /api/venues can be served by an edge cache or a Vercel Function
   **When** the production measurement lane runs
   **Then** every sample has a unique sanitized request tag, exact UTC window, deployment ID, client timing, Vercel request correlation, function start classification when invoked, execution region, HTTP status, cache cohort, and directly observed external dependency records
   **And** application telemetry never guesses a function start class and never relabels cache MISS as cold
2. **Given** cold starts are provider-defined
   **When** evidence is accepted
   **Then** it contains at least 20 Vercel-provider-classified true cold starts
   **And** cold, prewarmed, hot-origin, and edge-hit cohorts are reported separately with raw sample counts, p50, and p95
   **And** sampling continues across as many controlled windows as necessary to reach cold n >= 20
3. **Given** every timing sample must remain a correctness proof
   **When** a response is recorded
   **Then** it is HTTP 200, contains exactly 42 unique venue identifiers, and every venue contains exactly 61 ordered day-series steps
   **And** any failed correctness assertion excludes the sample from latency statistics and fails the lane
   **And** the existing approximately five-second uncached-route threshold remains the performance gate
4. **Given** the public persisted-read contract is three Supabase calls
   **When** the route performs an origin invocation
   **Then** bounded structured telemetry directly observes only /rest/v1/venues, /rest/v1/rpc/read_current_venue_sun_geometry_batch, and /rest/v1/weather_bucket_snapshots
   **And** it records request tag, bounded operation/path, method, status, duration, and region without query strings, payloads, headers, secrets, venue IDs, coordinates, or arbitrary high-cardinality labels
   **And** evidence proves no Met.no request and no shadow-caster/hash RPC runs on the public read path
   **And** endpoint-level attribution is claimed only for paths directly observed
5. **Given** correlation must remain safe under concurrent requests
   **When** telemetry is implemented
   **Then** request context is isolated per invocation, generated or tightly validated request tags are echoed only on origin responses, and edge hits remain correlated through Vercel request logs
   **And** unit and route tests cover context isolation, path allowlisting, sanitization, 200/503 completion, and secret/query omission
6. **Given** recovery evidence must not risk production
   **When** the disaster-recovery rehearsal begins
   **Then** a written runbook first identifies the backup/source snapshot, isolated target, prerequisites, restore commands, validation queries, rollback, and cleanup
   **And** the restore runs only into an isolated disposable or staging database/project
   **And** production overwrite or failover is prohibited without fresh explicit maintainer approval
7. **Given** the isolated restore completes
   **When** parity is assessed
   **Then** evidence covers schema and migration-history parity, representative ordered row counts and checksums, RLS, grants, service-role-only RPCs, Storage bucket/policy and object-byte limitations, venue visibility, geometry, weather, and application contracts
   **And** application smoke tests run against the restored environment where credentials and provider capabilities permit
   **And** recovery time is measured, RPO and RTO are stated, rollback is documented, temporary resources are cleaned up, and anything unsafe or unavailable is explicitly recorded without overstating the drill

## Operational Gate Criteria

- Direct provider evidence: cold n >= 20; all cohorts have raw rows, n, p50, and p95.
- Correctness: every included sample is 200 / 42 unique venues / 61 ordered steps per venue.
- Attribution: only directly observed bounded destination paths are claimed.
- Public path: zero Met.no and zero shadow-caster/hash RPC invocations.
- Recovery: isolated restore only; production unchanged; measured RTO and stated RPO; cleanup proven.

## Tasks / Subtasks

- [x] Task 1 — Add request-scoped safe telemetry (AC: 1, 4, 5)
  - [x] Create a server-only request context using Node AsyncLocalStorage.
  - [x] Accept only a tightly validated controlled probe tag or generate a UUID; do not use it as a metric label.
  - [x] Echo the origin request tag and emit one bounded route-completion event for 200 and handled error responses.
  - [x] Observe the Supabase client fetch seam and map only allowlisted destination paths to fixed operation names.
  - [x] Preserve the three-call batching path and all cache semantics.
- [x] Task 2 — Add tests before implementation completion (AC: 1, 3, 4, 5)
  - [x] Unit-test context isolation, validation/generation, allowlisting, and secret/query omission.
  - [x] Route-test tag echo and completion logging on 200 and 503.
  - [x] Retain the 42-venue / 61-step batching and source-contract guards.
  - [x] Mutation-check that Met.no and shadow-caster/hash paths remain absent.
- [ ] Task 3 — Build the production measurement lane (AC: 1, 2, 3, 4)
  - [x] Generate unique query nonce only for uncached/origin attempts and a unique sanitized request tag for every request.
  - [x] Preserve exact raw rows and join them to Vercel logs by tag/request ID and exact time window.
  - [x] Treat Vercel provider telemetry as the sole authority for cold, prewarmed, and hot classification.
  - [ ] Continue sampling until provider-classified cold n is at least 20.
  - [ ] Report cohorts independently with raw n, p50, and p95.
- [x] Task 4 — Write the DR runbook before the drill (AC: 6, 7)
  - [x] Document backup/snapshot selection, isolated target prerequisites, restore, parity checks, rollback, cleanup, and approval boundary.
  - [x] State that local Compose validates PostgreSQL/PostGIS contracts only, not Supabase Auth, Storage API, object bytes, or project settings.
  - [x] Add read-only validation SQL/scripts for repeatable parity, security, count, and checksum checks.
- [ ] Task 5 — Execute the safest available isolated rehearsal (AC: 6, 7)
  - [ ] Prefer a provider-native restored clone or staging Supabase project when credentials and backup capabilities are available.
  - [ ] Otherwise execute and label the local disposable SQL-only lane, record its limitations, and do not claim a full Supabase restore.
  - [ ] Measure elapsed recovery time, state RPO/RTO, exercise rollback/cleanup, and record proof that production was unchanged.
- [ ] Task 6 — Run required gates and publish evidence (AC: all)
  - [x] Typecheck, lint, full Vitest, build/bundle checks, relevant Playwright, axe, and Lighthouse.
  - [ ] Use scripts/story-review.sh through scripts/run-sh.ps1 for any review transition.
  - [x] Never directly edit sprint status to force review.

## Dev Notes

### Current Public Read Contract

- app/api/venues/route.ts loads venues, prepares request-scoped persisted repositories, and builds outcomes without live computation.
- lib/services/venue-store.ts issues the single public venue list query.
- lib/services/sun-geometry-repository.ts issues read_current_venue_sun_geometry_batch once for the full set.
- lib/services/weather-snapshots.ts issues one batched weather_bucket_snapshots read.
- The geometry and weather preparations run concurrently and feed in-memory repositories.
- Existing batching automation proves 42 venues, one geometry RPC, one weather read, and 61 steps per venue.
- Story 12.3 source-contract tests guard against Met.no imports and live shadow projection. Preserve and extend them; do not replace them with weaker source inference.

### Telemetry Design Guardrails

- Use Node runtime AsyncLocalStorage, not browser state and not a global mutable request ID.
- Instrument the configured Supabase fetch seam so destination paths are directly observed.
- Allowlist the configured Supabase origin and normalize to exactly three fixed path values.
- Structured events may include request_id, operation, destination_path, method, status, duration_ms, and VERCEL_REGION.
- Do not emit URL query, headers, bodies, credentials, service-role keys, venue IDs, coordinates, arbitrary host/path values, or UUID metric dimensions.
- An origin response header cannot identify edge-cache hits because the function does not execute; correlate those through Vercel request logs.
- Do not infer cold start in application code. Function start type comes only from Vercel logs/observability.

### Measurement Guardrails

- A unique cache-busting query marks an uncached/origin attempt only; it does not prove a cold start.
- Retain a unique sanitized request tag/User-Agent plus exact UTC window and deployment ID for provider-log correlation.
- Preserve raw sample rows and correctness failures.
- Report edge hits, hot-origin, prewarmed, and cold separately.
- Do not claim endpoint-level external attribution unless the instrumented fetch directly observed the path.

### DR Guardrails

- No production mutation, restore, overwrite, or failover without fresh explicit maintainer approval.
- compose.test.yaml is disposable PostgreSQL/PostGIS only and cannot validate Supabase Auth, Storage API/object bytes, PostgREST API keys, or project configuration.
- The local migration directory is not a self-contained historical production rebuild. Base schema contracts also live in historical implementation SQL artifacts and remote migration versions have documented drift.
- A full drill requires an isolated Supabase/staging project or provider-native restored clone, database credentials, backup/snapshot metadata, and separate handling of Storage object bytes.
- Cleanup must identify the exact isolated Compose project or staging project before removal.

### Architecture Compliance

- Client components remain behind app/api routes; no frontend/backend boundary changes.
- Use existing server-only Supabase infrastructure and preserve dub1 colocation.
- Keep the public route response and Cache-Control/ETag behavior unchanged except for a safe origin correlation header.
- No new user-facing copy or visual changes are expected.
- No raw colors, UI tokens, or component architecture changes are in scope.

### Testing Requirements

- Add failing tests before telemetry implementation.
- Cover parallel context isolation and nested async work.
- Mock the configured fetch seam and assert only fixed allowlisted paths are logged.
- Verify query strings, headers, request bodies, and secret values never appear in serialized events.
- Verify 200 and handled 503 completion events.
- Run the existing persisted-sun batching, route, and source-contract suites unchanged.
- Final gates: TypeScript, ESLint, full Vitest, Next build, MapLibre async verifier, relevant Playwright projects, axe, bundle budget, and Lighthouse.

### Project Structure Notes

Likely update files:
- nextjs-app/app/api/venues/route.ts
- nextjs-app/lib/supabase/server.ts
- nextjs-app/lib/middleware/request-logger.ts or a replacement under nextjs-app/lib/observability/

Likely new files:
- nextjs-app/lib/observability/request-context.ts
- nextjs-app/lib/observability/supabase-fetch-observer.ts
- nextjs-app/scripts/measure-venues-production.mjs
- scripts/dr/verify-restore.sql
- docs/launch/disaster-recovery.md
- targeted unit/route tests
- durable validation evidence under _bmad-output/implementation-artifacts/validation/launch-resilience/

Do not create a second unrelated logger if request-logger.ts can be safely replaced or redirected.

### References

- AGENTS.md
- docs/launch/launch-readiness-handoff-2026-08-24.md
- docs/launch/disaster-recovery-runbook.md
- _bmad-output/test-artifacts/nfr-assessment-epic-12.md
- _bmad-output/test-artifacts/epic-12-protected-validation/protected-validation-report-2026-08-08.md
- _bmad-output/planning-artifacts/epics.md, Epic 13
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md
- project-context.md, Epic 12 persisted-read contract
- nextjs-app/docs/design/DESIGN.md
- nextjs-app/app/api/venues/route.ts
- nextjs-app/lib/services/venue-store.ts
- nextjs-app/lib/services/sun-geometry-repository.ts
- nextjs-app/lib/services/weather-snapshots.ts
- nextjs-app/test/unit/api/persisted-sun-read-batching.automate.test.ts
- nextjs-app/test/unit/api/story-12-3-venues-route.atdd.test.ts
- https://vercel.com/docs/logs/runtime
- https://vercel.com/docs/cli/logs
- https://vercel.com/docs/headers/request-headers

## Dev Agent Record

### Agent Model Used

GPT-5.6

### Debug Log References

- 2026-08-26 review-fix baseline before edits: `cd nextjs-app && npx tsc --noEmit` PASS; `cd nextjs-app && npx eslint . --quiet` PASS.
- 2026-08-26 focused review-fix telemetry/error tests: `cd nextjs-app && npx vitest run test/unit/supabase/server-observability.test.ts test/unit/middleware/request-logger.test.ts` PASS (2 files, 10 tests).
- 2026-08-26 focused launch-hardening tests: `cd nextjs-app && npx vitest run test/unit/scripts/venue-launch-probe-review-hardening.test.ts test/unit/scripts/venue-launch-probe.test.ts test/unit/story-13-1-wip-findings-source-contract.test.ts` PASS (3 files, 49 tests).
- 2026-08-26 final static/unit/build gates: `cd nextjs-app && npx tsc --noEmit` PASS; `cd nextjs-app && npx eslint . --quiet` PASS; `cd nextjs-app && npx vitest run` PASS (225 files, 2069 tests); `cd nextjs-app && npm run build` PASS; `cd nextjs-app && npm audit --omit=dev --audit-level=high` PASS; `cd nextjs-app && npm run bundle:verify` PASS (route initial 231.38 KiB / 280 KiB, MapLibre-loaded 298.44 KiB / 320 KiB, all static JS 598.43 KiB / 600 KiB); `cd nextjs-app && node scripts/verify-maplibre-async.mjs` PASS.
- 2026-08-26 Playwright browser dependency repaired with `cd nextjs-app && npx playwright install chromium webkit`; subsequent `cd nextjs-app && npx playwright test --project=mobile --project=desktop` completed non-green (137 passed, 51 skipped, 12 failed) on broader existing E2E surfaces including venue-pin/card readiness, mobile coach, invalid venue slug copy, and console-hygiene routes. No story status transition made.
- 2026-08-26 Round 2 review-fix baseline before edits: `cd nextjs-app && npx tsc --noEmit` PASS; `cd nextjs-app && npx eslint . --quiet` PASS.
- 2026-08-26 Round 2 red-phase tests: `cd nextjs-app && npx vitest run test/unit/scripts/venue-launch-probe-review-hardening.test.ts test/unit/hooks/use-reduced-motion.test.tsx test/unit/story-13-1-wip-findings-source-contract.test.ts` failed as expected on exact external-provider counts, canonical deployment IDs, fail-closed reduced-motion fallback, and restore verifier as-of anchoring.
- 2026-08-26 Round 2 focused/relevant checks after fixes: `cd nextjs-app && npx tsc --noEmit` PASS; `cd nextjs-app && npx eslint . --quiet` PASS; `cd nextjs-app && npx vitest run test/unit/scripts/venue-launch-probe-review-hardening.test.ts test/unit/scripts/venue-launch-probe.test.ts test/unit/hooks/use-reduced-motion.test.tsx test/unit/story-13-1-wip-findings-source-contract.test.ts test/components/VenuePin.public-sun.atdd.test.tsx test/components/VenuePin.test.tsx test/components/VenuePinLayer.test.tsx test/components/VenueQuickInfo.test.tsx test/components/FeedbackPrompt.test.tsx test/components/ReviewForm.test.tsx test/components/SettingsModal.test.tsx test/components/VenueDetailOverlay.test.tsx test/components/ShareModal.test.tsx test/components/TimeSliderPanel.test.tsx test/components/MobileBottomSheet.test.tsx test/components/FirstRunCoachMarkGuide.test.tsx test/components/OnboardingScreen.test.tsx test/components/NotFoundPage.test.tsx` PASS (18 files, 247 tests).
- 2026-08-26 Round 2 proportional full Vitest probe: `cd nextjs-app && npx vitest run` non-green (217 files/2061 tests passed, 8 files/9 tests failed): one relevant stale VenuePin null-mock expectation was fixed; remaining failures were long-running sun-engine timeouts and one weather snapshot in unrelated service suites. Full suite not rerun per instruction to finish without broadening.
- 2026-09-02 Round 3 review-fix baseline before edits: `cd nextjs-app && npx tsc --noEmit` PASS; `cd nextjs-app && npx eslint . --quiet` PASS.
- 2026-09-02 Round 3 focused review-fix tests: `cd nextjs-app && npx vitest run test/unit/scripts/venue-launch-probe-review-hardening.test.ts` PASS (1 file, 21 tests); `cd nextjs-app && npx vitest run test/unit/story-13-1-wip-findings-source-contract.test.ts` PASS (1 file, 11 tests); `cd nextjs-app && npx vitest run test/unit/scripts/venue-launch-probe.test.ts test/unit/scripts/venue-launch-probe-review-hardening.test.ts test/unit/story-13-1-wip-findings-source-contract.test.ts` PASS (3 files, 51 tests).
- 2026-09-02 Round 3 final static gates: `cd nextjs-app && npx tsc --noEmit` PASS; `cd nextjs-app && npx eslint . --quiet` PASS.
- 2026-09-03 Round 4 review-fix baseline before edits: `cd nextjs-app && npx tsc --noEmit` PASS; `cd nextjs-app && npx eslint . --quiet` PASS.
- 2026-09-03 Round 4 red-phase focused tests: `cd nextjs-app && npx vitest run test/unit/middleware/request-logger.test.ts test/unit/api/venues-route-observability.test.ts test/unit/scripts/venue-launch-probe.test.ts test/unit/scripts/venue-launch-probe-review-hardening.test.ts test/unit/scripts/js-budgets.test.ts test/unit/story-13-1-wip-findings-source-contract.test.ts` failed as expected on cacheable request-id suppression, missing-MISS echo acceptance, extra provider region rejection, concrete DR cleanup prerequisites, and empty first-load chunk rejection.
- 2026-09-03 Round 4 focused tests after fixes: `cd nextjs-app && npx vitest run test/unit/middleware/request-logger.test.ts test/unit/api/venues-route-observability.test.ts test/unit/scripts/venue-launch-probe.test.ts test/unit/scripts/venue-launch-probe-review-hardening.test.ts test/unit/scripts/js-budgets.test.ts test/unit/story-13-1-wip-findings-source-contract.test.ts` PASS (6 files, 67 tests).
- 2026-09-03 Round 4 final static/bundle gates: `cd nextjs-app && npx tsc --noEmit` PASS; `cd nextjs-app && npx eslint . --quiet` PASS; `cd nextjs-app && npm run bundle:verify` PASS (route initial 231.38 KiB / 280 KiB, MapLibre-loaded 298.44 KiB / 320 KiB, all static JS 598.43 KiB / 600 KiB); `cd nextjs-app && node scripts/verify-maplibre-async.mjs` PASS.
- 2026-09-03 security maintenance: official Next.js August 2026 advisories verified before launch recommendation; `next`, `eslint-config-next`, and `@next/bundle-analyzer` are pinned to the patched 16.3.3 line. `browserslist` is overridden to patched 4.28.8 for the September advisories. Clean install used npm 10.9.4. `npm audit --omit=dev` PASS (0 vulnerabilities); full `npm audit` remains non-green with 14 development-only Lighthouse CI transitive findings (2 low, 4 moderate, 8 high), with no force fix or broad blind upgrade.
- 2026-09-03 final clean static/unit/build gates: `npx tsc --noEmit` PASS; `npx eslint . --quiet` PASS; `npx vitest run` PASS (225 files, 2076 tests); `npm run build` PASS on Next.js 16.3.3.
- 2026-09-03 final bundle gates: `npm run bundle:verify` PASS (route initial 231.37 KiB / 280 KiB, MapLibre-loaded 298.43 KiB / 320 KiB, all emitted static JavaScript 598.40 KiB / 600 KiB); `node scripts/verify-maplibre-async.mjs` PASS (one async MapLibre chunk, absent from root first-load files across 15 manifests).
- 2026-09-03 final browser/accessibility gates: `npx playwright test --project=mobile --project=desktop` PASS (149 passed, 51 project-inapplicable skips); touch project PASS (8/8); mobile axe PASS (14/14); desktop axe PASS (18/18, including the re-enabled Privacy route). The owned Playwright server shut down and port 3000 was clear after each run.
- 2026-09-03 final Lighthouse gate: `npm run lighthouse` PASS, three runs with performance 0.86 / 0.88 / 0.87 and accessibility 1.00 / 1.00 / 1.00. Story 13.1 has no mapped Screen ID or standalone visual deliverable, so the canonical review gate is expected to record visual validation as not applicable rather than claim a visual PASS.
- 2026-09-03 post-review verification-change audit: four actionable harness/accessibility findings were fixed without weakening gates; a focused rereview found one deterministic date-change request-gate race, which was fixed. Final Vitest, browser, axe, build, bundle, async-loading, and Lighthouse gates are green. The user explicitly accepted the four-round convergence caveat; no unresolved implementation finding remains, while the post-deploy cold-start evidence and approved isolated restore remain open acceptance work.
- 2026-09-03 protected CI run 33730992614: production audit, typecheck, lint, and build passed; full Vitest stopped at one deterministic Story 13.1 source-contract assertion because the reconciled handoff had removed the literal `**Security release applied.**` marker. The handoff now retains that explicit durable marker while keeping completed work out of the remaining-work list; the focused source-contract suite passes before the CI rerun.

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created.
- Mandatory baseline before story creation: typecheck PASS; lint PASS.
- Checkout reconciliation focused mobile map test: PASS.
- Review-fix pass completed for all unresolved Review Findings without changing Story Status or sprint-status.
- External dependency telemetry payloads now retain only AC4 dependency fields plus bounded operation/destination path; deployment/environment/timestamp provenance is no longer embedded in each `external_dependency` payload.
- Restore verifier, launch probe parser/cohorting, thrown-handler request logging, workflow production audit gates, launch context version notes, DR cleanup allowlisting, and MapView split-chunk prefetching were hardened per review.
- Two previously checked critical sequencing decisions remain checked and the underlying evidence tasks remain open for the post-merge/deploy provider cold-start sampling and approved isolated restore phases.
- Round 2 external-provider evidence now rejects inflated same-route production traffic by requiring exact per-region/path counts for provider-correlated function requests, while request-log runtime events remain the per-probe attribution source.
- Round 2 Vercel evidence-plan generation now rejects non-canonical deployment IDs before interpolation into metric filters.
- Round 2 reduced-motion handling now fails closed during hydration/unavailable `matchMedia`; direct motion callers no longer default unresolved preference to animation.
- Round 2 restore verifier now uses one fixed as-of UTC session setting for geometry/weather windows and unexpired-weather counts.
- Round 3 DR runbook now uses runtime-supplied production Vercel IDs plus reviewed SHA-256 bindings/runtime assertions, and no longer commits the raw production project/deployment IDs.
- Round 3 restore verifier now receives its shared source/target as-of UTC anchor through the runbook-controlled runtime `PGOPTIONS` value and asserts the reviewed verifier SQL SHA-256 before use.
- Round 3 launch report acceptance now requires provider classification and runtime dependency attribution for every function-running MISS sample, including the edge-prime cache-warming request, while keeping edge-prime out of origin/cold-start cohorts.
- Round 4 cacheable public GET responses no longer emit `x-sunnyseat-request-id`; function-running correlation remains in structured request events, non-cacheable errors still echo the id, and the launch parser accepts absent cacheable MISS echoes while rejecting stale mismatches.
- Round 4 provider external-host evidence now rejects valid-shaped rows from function regions with no accepted provider sample.
- Round 4 DR cleanup controller prerequisites now include the concrete cleanup helper functions invoked by `Invoke-DrCleanup` before target/preview mutation is armed.
- Round 4 JS bundle verification now fails closed when the root route diagnostic has an empty `firstLoadChunkPaths` graph.
- Final verification hardening isolates the Playwright-only rate-limit bypass to an explicitly flagged development server, refuses reuse of an unflagged borrowed server, stabilizes the held date-change request-count assertion, waits for Motion opacity to settle before axe analysis, and restores the Privacy page to the complete axe matrix with token-compliant AA text contrast.
- React Compiler remains disabled for launch. The measured non-compiler build is inside every binding JavaScript budget, and `project-context.md` records the decision for a later evidence-led reevaluation instead of accepting compiler-related launch risk now.
- Code and local gates are ready for delivery, but Task 3's required provider-classified cold-start sample and Task 5's isolated provider restore rehearsal are deliberately still open. No restore, production failover, fake feedback, or fake review has been executed.

### File List

- .github/workflows/hours-review-audit.yml
- .github/workflows/sun-geometry-and-weather.yml
- .github/workflows/build-and-test-nextjs.yml
- AGENTS.md
- docs/launch/disaster-recovery-runbook.md
- docs/launch/launch-readiness-handoff-2026-08-24.md
- nextjs-app/app/api/venues/[slug]/feedback/route.ts
- nextjs-app/components/composed/feedback/FeedbackPrompt.tsx
- nextjs-app/components/composed/feedback/ReviewForm.tsx
- nextjs-app/components/composed/search/VenueSearchCombobox.tsx
- nextjs-app/components/composed/venue/VenueQuickInfo.tsx
- nextjs-app/components/custom/NotFoundPage.tsx
- nextjs-app/components/custom/about/AboutPage.tsx
- nextjs-app/components/custom/about/DataSourceList.tsx
- nextjs-app/components/custom/coach-tour/FirstRunCoachMarkGuide.tsx
- nextjs-app/components/custom/feedback/AppFeedbackModal.tsx
- nextjs-app/components/custom/feedback/FeedbackFlow.tsx
- nextjs-app/components/custom/feedback/ReviewFlow.tsx
- nextjs-app/components/custom/layout/DesktopNavBar.tsx
- nextjs-app/components/custom/legal/PrivacyPage.tsx
- nextjs-app/components/custom/map/MapView.tsx
- nextjs-app/components/custom/map/VenuePin.tsx
- nextjs-app/components/custom/map/VenuePinLayer.tsx
- nextjs-app/components/custom/onboarding/OnboardingScreen.tsx
- nextjs-app/components/custom/routing/RouteOverlay.tsx
- nextjs-app/components/custom/settings/SettingsModal.tsx
- nextjs-app/components/custom/sheets/MobileBottomSheet.tsx
- nextjs-app/components/custom/time/TimeSliderPanel.tsx
- nextjs-app/components/custom/venue/ShareModal.tsx
- nextjs-app/components/custom/venue/VenueDetailOverlay.tsx
- nextjs-app/docs/dev/ci-gates.md
- nextjs-app/hooks/use-reduced-motion.ts
- nextjs-app/lib/middleware/request-logger.ts
- nextjs-app/lib/observability/request-context.ts
- nextjs-app/lib/observability/supabase-fetch-observer.ts
- nextjs-app/lib/utils/venue-rate-limit-middleware.ts
- nextjs-app/next.config.ts
- nextjs-app/package-lock.json
- nextjs-app/package.json
- nextjs-app/playwright.config.ts
- nextjs-app/scripts/launch-resilience/venue-probe.mjs
- nextjs-app/scripts/launch-resilience/venue-probe-lib.mjs
- nextjs-app/scripts/verify-js-budgets.mjs
- nextjs-app/test/unit/api/venues-route-observability.test.ts
- nextjs-app/test/unit/middleware/request-logger.test.ts
- nextjs-app/test/unit/hooks/use-reduced-motion.test.tsx
- nextjs-app/test/unit/scripts/js-budgets.test.ts
- nextjs-app/test/unit/scripts/venue-launch-probe-review-hardening.test.ts
- nextjs-app/test/unit/scripts/venue-launch-probe.test.ts
- nextjs-app/test/unit/story-13-1-wip-findings-source-contract.test.ts
- nextjs-app/test/unit/supabase/server-observability.test.ts
- nextjs-app/test/components/AboutPage.test.tsx
- nextjs-app/test/components/DesktopNavBar.test.tsx
- nextjs-app/test/components/FirstRunCoachMarkGuide.test.tsx
- nextjs-app/test/components/MobileBottomSheet.test.tsx
- nextjs-app/test/components/NotFoundPage.test.tsx
- nextjs-app/test/components/OfflineBanner.test.tsx
- nextjs-app/test/components/OnboardingGateSessionLatch.test.tsx
- nextjs-app/test/components/OnboardingScreen.test.tsx
- nextjs-app/test/components/PrivacyPage.test.tsx
- nextjs-app/test/components/VenuePin.public-sun.atdd.test.tsx
- nextjs-app/test/components/VenuePin.test.tsx
- nextjs-app/test/components/VenuePinLayer.test.tsx
- nextjs-app/test/components/VenueQuickInfo.test.tsx
- nextjs-app/test/components/VenueQuickInfoApproximateDistance.test.tsx
- nextjs-app/test/components/VenueSearchCombobox.test.tsx
- nextjs-app/test/components/story-12-6-honesty.automation.test.tsx
- nextjs-app/test/e2e/axe.spec.ts
- nextjs-app/test/e2e/helpers/axe.ts
- nextjs-app/test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts
- nextjs-app/test/setup/setup.ts
- nextjs-app/test/unit/api/request-identity-routes.test.ts
- nextjs-app/test/unit/api/venues-route.test.ts
- nextjs-app/test/unit/observability/request-context.test.ts
- nextjs-app/test/unit/story-13-1-wip-findings-source-contract.test.ts
- _bmad-output/auto-bmad/state/13-1-provider-classified-cold-starts-dependency-path-tracing-and-isolated-restore-drill.yaml
- _bmad-output/implementation-artifacts/deferred-work.md
- _bmad-output/test-artifacts/automation-summary.md
- project-context.md
- scripts/dr/verify-restore.sql
- _bmad-output/implementation-artifacts/13-1-provider-classified-cold-starts-dependency-path-tracing-and-isolated-restore-drill.md

### Review Findings

- [x] [Review][Decision][Critical] Accepted evidence still lacks the required set of at least 20 provider-classified cold starts; explicit continuation decision: do not narrow or split AC2, and collect the required provider-classified cold n >= 20 evidence only after code fixes, gates, merge, and deploy. Underlying story evidence task remains open for that later phase. Recommended: fix: preserve AC2 unchanged and complete the required post-deploy sampling phase. [docs/launch/launch-readiness-handoff-2026-08-24.md:104]
- [x] [Review][Decision][Critical] The isolated provider restore drill is explicitly not exercised, leaving AC6-AC7 without restored-target parity, smoke, measured recovery time, rollback, or cleanup evidence; explicit continuation decision: do not narrow or split AC6-AC7, and reach the provider cost boundary later before obtaining fresh approval and executing the isolated restore. Underlying story restore tasks remain open for that later phase. Recommended: fix: preserve AC6-AC7 unchanged and complete the approved provider-restore phase. [docs/launch/disaster-recovery-runbook.md:3]
- [x] [Review][Decision][Med] External dependency events include deployment, environment, and UTC timestamp fields even though AC4 says origin telemetry records only request tag, bounded path/operation, method, status, duration, and region; explicit continuation decision: keep safe bounded Supabase destination-path telemetry and directly observed paths only. Recommended: fix: move deployment_id, environment, timestamp_utc, and any provenance needed for report matching outside each external_dependency event payload so the dependency event itself contains only the AC4 field set plus the bounded operation/destination path. [nextjs-app/lib/observability/supabase-fetch-observer.ts:17]
- [x] [Review][Patch][High] `verify-restore.sql` selects `pg_auth_members.inherit_option` and `set_option`, which are not present in the documented PostgreSQL 15 target, so the DR verifier will abort before producing the required grants/parity report. [scripts/dr/verify-restore.sql:218]
- [x] [Review][Patch][High] The story is not review-ready under its own gate set: the exact bundle gate is recorded as failing by 14,577 bytes and the clean final Vitest/Playwright/axe/Lighthouse/visual-validation sweep has not been rerun after all combined changes. [docs/launch/launch-readiness-handoff-2026-08-24.md:179]
- [x] [Review][Patch][Med] Launch context is internally inconsistent after the Next security update: package files and project-context are pinned to 16.3.3, but AGENTS.md and the continuation handoff still claim 16.3.1/security-release-pending, which can send the next operator down the wrong remediation path. [AGENTS.md:11]
- [x] [Review][Patch][Med] The `edge-prime` cache-warming MISS is included in `originSamples`, and provider cold counts are computed across all accepted provider samples, so the cache-prime request can inflate origin latency cohorts and count toward the AC2 cold-start total. [nextjs-app/scripts/launch-resilience/venue-probe-lib.mjs:1435]
- [x] [Review][Patch][Med] Metric export plans request `--limit 500`, but `metricRows()` does not validate `query.limit`, pagination/completeness metadata, or truncation state before accepting summary rows, so a partial provider export can satisfy the parser if the retained rows look valid. [nextjs-app/scripts/launch-resilience/venue-probe-lib.mjs:540]
- [x] [Review][Patch][Med] `withRequestLogging` sets correlation headers only after the wrapped handler returns; if the handler throws, it logs a 500 completion event but the generated error response does not carry the request/deployment headers needed for failure correlation. [nextjs-app/lib/middleware/request-logger.ts:62]
- [x] [Review][Patch][Med] The hours and sun-geometry/weather workflows now use `npm ci --no-audit` but do not add the explicit production audit step that the build workflow uses, leaving those CI lanes without the documented audit gate. [.github/workflows/hours-review-audit.yml:36]
- [x] [Review][Patch][Med] The DR runbook's reusable Vercel DELETE helper accepts an arbitrary API path while always passing `--dangerously-skip-permissions`; add a final allowlist/identity assertion at the helper boundary so one wrong caller path cannot become a broad delete primitive. [docs/launch/disaster-recovery-runbook.md:1861]
- [x] [Review][Patch][Low] `VenueDetailOverlay`, `FeedbackFlow`, and `ReviewFlow` are now loaded with `next/dynamic()` without a loading fallback or prefetch path, so the first venue tap or review/feedback open can render nothing while the split chunk downloads. [nextjs-app/components/custom/map/MapView.tsx:90]
- [x] [Review][Defer][Low] Offline banner reduced-motion exit still fades over the default transition duration; the diff only changed Motion imports, so the motion-policy issue predates Story 13.1. [nextjs-app/components/custom/offline/OfflineBanner.tsx:38] — deferred, pre-existing
- [x] [Review][Patch][Med] Provider external-host evidence can still be accepted with unrelated same-route production traffic: `validateExternalProviderEvidence()` only requires each region/path count to be at least the accepted origin-provider sample count, and the hardening test explicitly blesses inflated organic counts, so the metric can pass without proving the exact probe requests accounted for those Supabase calls. [nextjs-app/scripts/launch-resilience/venue-probe-lib.mjs:1104] [nextjs-app/test/unit/scripts/venue-launch-probe-review-hardening.test.ts:719]
- [x] [Review][Patch][Med] Vercel deployment IDs are interpolated into generated metric filters after only a non-empty check, so whitespace, quote, or filter syntax in `--deployment-id` can produce sanctioned commands for the wrong metrics query instead of failing before evidence capture. [nextjs-app/scripts/launch-resilience/venue-probe-lib.mjs:144] [nextjs-app/scripts/launch-resilience/venue-probe-lib.mjs:233]
- [x] [Review][Patch][Med] The shared reduced-motion hook exposes a hydration-time `null`, while many migrated motion surfaces default that unknown state to "animate"; reduced-motion users can receive first-hydration entrance, sheet, or list animations before `matchMedia` resolves. [nextjs-app/hooks/use-reduced-motion.ts:27] [nextjs-app/components/composed/venue/VenueQuickInfo.tsx:121]
- [x] [Review][Patch][Med] The restore verifier derives geometry/weather required windows and unexpired weather counts from `now()`, so source and target verifier runs across midnight or a long restore can compare different expected cohorts instead of one captured anchor date/window. [scripts/dr/verify-restore.sql:1052] [scripts/dr/verify-restore.sql:1303]
- [x] [Review][Decision][Med] The committed DR runbook hard-codes the production Vercel project ID even though its redaction policy says raw provider IDs live only in the current PowerShell process and durable evidence should retain SHA-256 identity bindings; decide whether the exact production Vercel identity is an approved safety exception or must be resolved at drill time from hashed bindings. Recommended: fix: replace committed raw production provider IDs with reviewed hash-binding placeholders and runtime assertions unless the maintainer explicitly approves a narrow Vercel-identity exception. [docs/launch/disaster-recovery-runbook.md:39] [docs/launch/disaster-recovery-runbook.md:94] [docs/launch/disaster-recovery-runbook.md:894]
- [x] [Review][Patch][High] `verify-restore.sql` now hard-codes the restore verifier as-of anchor to `2026-08-26T00:00:00Z` while the runbook requires fresh source capture immediately before paid confirmation and still cites an older verifier SHA-256, so the later isolated restore cannot produce a current, hash-consistent AC8 evidence chain without editing reviewed SQL/docs. [scripts/dr/verify-restore.sql:12] [docs/launch/disaster-recovery-runbook.md:448] [docs/launch/disaster-recovery-runbook.md:411]
- [x] [Review][Patch][Med] After the edge-prime overcount fix, the launch report only requires provider classification for origin MISS samples; an `edge-prime` cache-warming MISS can be omitted from provider samples and dependency attribution while acceptance still passes, despite AC1 requiring provider start class whenever a function runs. [nextjs-app/scripts/launch-resilience/venue-probe-lib.mjs:1596] [nextjs-app/test/unit/scripts/venue-launch-probe-review-hardening.test.ts:1135]
- [x] [Review][Patch][Med] `withRequestLogging` writes `x-sunnyseat-request-id` onto cacheable public GET responses, while `/api/venues` is explicitly `public, s-maxage=30`; a CDN HIT can replay the origin MISS request tag to later clients, making the response header a stale cross-request identifier even though the probe already treats HIT echoes as untrusted. [nextjs-app/lib/middleware/request-logger.ts:64] [nextjs-app/app/api/venues/route.ts:430]
- [x] [Review][Patch][Med] `validateExternalProviderEvidence()` accepts extra same-deployment/provider-shaped rows for function regions that are not represented by any accepted provider sample; exact per-region path counts are enforced only for accepted regions, so unrelated cross-region Supabase traffic can keep `external_provider_complete` true while inflating the provider external request evidence. [nextjs-app/scripts/launch-resilience/venue-probe-lib.mjs:1070] [nextjs-app/scripts/launch-resilience/venue-probe-lib.mjs:1099]
- [x] [Review][Patch][Med] The DR cleanup controller preflight only requires the top-level cleanup entry points, not the concrete helper functions that `Invoke-DrCleanup` resolves later, so a copied or partially loaded controller can proceed into target/preview mutation and discover missing cleanup primitives only inside the final cleanup path. [docs/launch/disaster-recovery-runbook.md:1954] [docs/launch/disaster-recovery-runbook.md:2286]
- [x] [Review][Patch][Low] The JS budget verifier accepts a root route diagnostic whose `firstLoadChunkPaths` array exists but is empty, which would report a zero-byte initial route and let the initial-budget check pass if Next's route diagnostics degrade or omit the route graph. [nextjs-app/scripts/verify-js-budgets.mjs:186] [nextjs-app/scripts/verify-js-budgets.mjs:191]
