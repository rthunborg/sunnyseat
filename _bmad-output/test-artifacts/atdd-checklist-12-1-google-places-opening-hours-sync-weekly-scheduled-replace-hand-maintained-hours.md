---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-07-13T19:16:34+02:00'
storyId: '12.1'
storyKey: '12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours'
storyFile: 'C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours.md'
atddChecklistPath: 'C:\Users\Rasmus\sunnyseat\_bmad-output\test-artifacts\atdd-checklist-12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours.md'
generatedTestFiles:
  - 'nextjs-app/test/unit/story-12-1-hours-policy-and-operations.atdd.test.ts'
  - 'nextjs-app/test/unit/story-12-1-hours-governance-migrations.atdd.test.ts'
  - 'nextjs-app/test/unit/services/opening-hours-governance.atdd.test.ts'
  - 'nextjs-app/test/unit/services/opening-hours-audit.atdd.test.ts'
  - 'nextjs-app/test/unit/api/venue-detail-hours-unknown.atdd.test.ts'
inputDocuments:
  - '_bmad/tea/config.yaml'
  - 'project-context.md'
  - '_bmad-output/implementation-artifacts/12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours.md'
  - '_bmad-output/qa/epic-12-test-design-2026-07-12.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - 'nextjs-app/package.json'
  - 'nextjs-app/vitest.config.ts'
  - 'nextjs-app/playwright.config.ts'
  - 'nextjs-app/test/setup/setup.ts'
  - 'nextjs-app/test/setup/sensitive-source-terms.ts'
  - 'nextjs-app/test/unit/services/venue-store.opening-hours-shape.atdd.test.ts'
  - 'nextjs-app/test/unit/api/venue-detail-route.test.ts'
  - '.agents/skills/bmad-testarch-atdd/resources/tea-index.csv'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/data-factories.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/component-tdd.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/test-quality.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/test-healing-patterns.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/selector-resilience.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/timing-debugging.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/overview.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/api-request.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/network-recorder.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/auth-session.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/intercept-network-call.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/recurse.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/log.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/file-utils.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/network-error-monitor.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/fixtures-composition.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/playwright-cli.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/pact-mcp.md'
---

# ATDD Checklist — Story 12.1

## Preflight and Context

- **Detected stack:** `frontend` by TEA manifest detection (Next.js/React application with Vitest and Playwright; server routes are exercised inside the same app).
- **Test frameworks:** Vitest unit/component tests and Playwright browser tests are configured.
- **Development environment:** available; `nextjs-app/node_modules` is present.
- **Story readiness:** `ready-for-dev`, with eight controlling acceptance criteria and an explicit supersession boundary that prohibits the historical Google-hours design.
- **Story contract:** provider-neutral canonical hours, service-only provenance/review data, one-time remediation, direct weekly GitHub audit, honest whole-field unknown handling, no public/provider leakage, and no visual change.
- **Primary risks:** R-012 (data/operations), R-018 (superseded intent), and R-010 (migration/type/schema drift).
- **Evidence lanes:** deterministic tests may scaffold policy, adapter, migration/static, audit, API/DTO, and job-workflow behavior; preview/live schema verification and the all-42 provenance remediation remain explicitly manual/protected evidence.
- **Existing patterns:** `.atdd.test.ts` Vitest source-contract tests, server route tests using direct route invocation, source scans with `node:fs`, shared outbound-provider fetch guard, and Playwright route fixtures.
- **Generation direction:** focus on deterministic Vitest API/static/integration scaffolds. No new UI or screenshot test scaffold is needed because AC6 requires existing pixels and `formatOpeningHours` to remain unchanged.

Inputs were confirmed under the autonomous workflow default; generation proceeds without an interactive halt.

## Generation Mode

- **Mode:** AI generation.
- **Reason:** The story's controlling ACs define deterministic static, schema, service, batch, workflow, and API contracts. There are no new UI interactions to discover, and AC6 explicitly requires no pixel or formatter change.
- **Recording:** skipped; live browser selector capture would not improve the required red-phase evidence.

## Test Strategy

The Epic 12 design classifies Story 12.1 under R-012/R-018/R-010. Coverage is intentionally concentrated at unit/static, API contract, and deterministic integration levels; adding browser duplicates would not improve the provider/schema/job contracts.

| Scenario | AC | Level | Priority | Red-phase signal |
|---|---:|---|---|---|
| Production/scheduled source scan prohibits Google hours, returned/provider URLs, and provider credentials while allowing server-side Place IDs and policy citations | 1, 8 | Static contract | P1 | Current authoring docs still contain `places_api_url`/Google-sync guidance; the provider guard is absent |
| Shared test setup names and blocks Google/provider hosts without making a live request during the scaffold run | 1, 8 | Static contract of test infrastructure | P1 | `test/setup/setup.ts` currently guards only `api.met.no` |
| Story file retains the superseded-text section and controlling dated decisions | 1, 8 | Static contract | P1 | Expected to pass now; remains a regression lock alongside the failing policy checks |
| Reconciliation and forward migrations establish Place-ID-only provenance plus service-only run/outcome tables, checks, indexes, RLS/revokes, non-overlap, and 180-day cleanup | 2, 8 | SQL/static integration scaffold | P0 | `supabase/migrations/` is absent |
| Provider-neutral evidence classification returns only `accepted`, `manual_review`, or `failed`; handles closed, past-midnight, unknown, split, 24/7, seasonal, holiday, conflict, malformed, and failure cases losslessly | 3, 4, 8 | Unit | P1 | Governance module does not exist |
| Accepted writes are atomic/idempotent; manual-review/failed outcomes preserve prior verified schedules; duplicate Place IDs never merge venue identities | 3, 4, 8 | Unit/service integration | P1 | Governance/remediation seam does not exist |
| Deterministic one-time remediation classifies every input row, never relabels unproven evidence, maps unresolved schedules to whole-field unknown, isolates failures, and emits bounded outcomes | 3, 8 | Service integration | P1 | Remediation runner does not exist; live 42-row execution remains a protected evidence lane |
| Weekly audit classifies due/unknown/conflicting/split/failed/stale rows, isolates per-venue failures, prevents overlap, is idempotent, never mutates canonical hours, and prunes >180-day outcomes | 5, 8 | Service integration | P1 | Audit runner does not exist |
| Dedicated GitHub workflow is weekly + manual, main/protected-environment scoped, concurrency-bounded, fail-closed disabled, direct-script only, summary-bounded, and removes the obsolete scheduled OSM trigger | 1, 5, 7, 8 | Static workflow contract | P1 | Workflow is absent and the documentary OSM trigger remains |
| Hours-less detail fixture/route omits `openingHours`; known hours remain structurally unchanged; no provenance/Place ID/service outcome leaks into public DTOs | 6, 8 | API contract | P0 | Detail route currently converts absent fixture hours to `{}` |
| Authoring, scheduled-job, environment, and deployment docs describe provider-neutral evidence, unknown-vs-closed, manual review, direct audit, emergency stop, and safe placeholders | 7 | Static documentation contract | P1 | Current docs describe the retired Google-sync/URL model |

### Level boundaries

- Pure schedule/provenance and audit decisions stay at unit/service level.
- SQL shape/security and GitHub/docs wiring use deterministic repository-contract tests; actual migration replay and `SET ROLE` execution remain the Compose-backed implementation lane.
- Public absence/leakage is exercised once at the API route boundary, not repeated in component or browser tests.
- Existing visual references are verification evidence only. No new screenshot scaffold is generated because the expected outcome is byte/pixel stability.

### Red-phase contract

- Scaffolds never call live Google, Met.no, OSM, Supabase production, or any provider.
- Missing implementation modules are represented by deliberate red imports/contracts; missing migrations/workflows are asserted through safe filesystem probes rather than setup-time crashes.
- The current route's `{}` fallback guarantees a deterministic API red signal.
- Protected/live evidence is listed in the checklist but is not simulated in CI.

## ATDD Red-Phase Scaffolds

- **Phase:** RED. All 41 generated checks are deliberately skipped until their owning implementation task activates them.
- **Coverage:** AC1–AC8 across static policy/operations, migration governance, provider-neutral classification/remediation, weekly audit behavior, and the public venue-detail boundary.
- **API/static/service tests:** 41 checks in five Vitest files.
- **E2E tests:** none generated. Story 12.1 adds no UI flow, and AC6 requires the existing pixels and `formatOpeningHours` behavior to remain unchanged.
- **Live-provider safety:** the scaffolds make no network calls. The shared provider-host hard block is itself a source contract until Task 0 implements it.

### Fixture and harness plan

No new shared fixture module is needed for the red phase. The service contracts use inline deterministic data and injected stores/spies, while the route contract reuses the repository's real `brygghuset-lerum` hours-less fixture and existing known-hours fixture. Compose-backed migration replay, role-denial checks, preview schema diff, the live 42-venue remediation, protected workflow execution, and visual comparisons remain implementation/manual evidence lanes rather than simulated fixtures.

### Activation map

| Implementation task | Scaffolds to activate |
|---|---|
| Task 0 | `story-12-1-hours-policy-and-operations.atdd.test.ts` policy guard, provider-host guard, and supersession checks |
| Task 1 | `story-12-1-hours-governance-migrations.atdd.test.ts` |
| Tasks 2–3 | `services/opening-hours-governance.atdd.test.ts` |
| Task 4 | `services/opening-hours-audit.atdd.test.ts` |
| Task 5 | workflow/documentation checks in `story-12-1-hours-policy-and-operations.atdd.test.ts` |
| Task 6 | `api/venue-detail-hours-unknown.atdd.test.ts` plus the existing visual baseline lanes |

### Generated files

- `nextjs-app/test/unit/story-12-1-hours-policy-and-operations.atdd.test.ts`
- `nextjs-app/test/unit/story-12-1-hours-governance-migrations.atdd.test.ts`
- `nextjs-app/test/unit/services/opening-hours-governance.atdd.test.ts`
- `nextjs-app/test/unit/services/opening-hours-audit.atdd.test.ts`
- `nextjs-app/test/unit/api/venue-detail-hours-unknown.atdd.test.ts`

## Validation and Completion

- **Prerequisites:** satisfied; story, test configuration, project context, architecture/test-design inputs, and existing route/store test patterns were available.
- **Acceptance coverage:** the strategy and generated scaffolds map all controlling criteria AC1–AC8. Protected/live evidence is explicitly separated from deterministic CI scaffolds.
- **Red-phase integrity:** focused Vitest collected five files and 41 tests; all five files and all 41 tests were skipped, with no placeholder `expect(true)` assertions and no provider calls.
- **Type safety:** `npx tsc --noEmit` passed from `nextjs-app/`.
- **Lint:** targeted ESLint passed for all five generated test files.
- **CLI/browser cleanup:** no browser or Playwright CLI session was launched by this workflow, so there is no owned session to clean up.
- **Worker artifacts:** API, E2E-decision, and aggregate manifests are stored beside this checklist in `_bmad-output/test-artifacts/`.
- **Story handoff:** the story's `Dev Notes` links this checklist and all generated tests.

### Risks and assumptions retained for implementation

- Migration replay, role denial, preview schema diff, and post-apply empty-diff evidence require the project Compose/protected Supabase lanes and must not be replaced by source scans alone.
- The all-42 live venue remediation and protected weekly workflow execution remain manual/operations evidence.
- The skipped service tests intentionally import future server-only modules only when activated; Tasks 2–4 own the final module seams.
- Existing visual comparisons, rather than a new browser scaffold, remain the required no-change UI evidence.

### Handoff

- **Story:** `12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours`
- **Story file:** `_bmad-output/implementation-artifacts/12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours.md`
- **Recommended next workflow:** `dev-story`; activate each skipped contract with its owning task. Run test automation expansion only after implementation exists.
