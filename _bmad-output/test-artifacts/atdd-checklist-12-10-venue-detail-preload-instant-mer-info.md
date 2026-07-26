---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-07-26'
storyId: '12.10'
storyKey: 12-10-venue-detail-preload-instant-mer-info
storyFile: _bmad-output/implementation-artifacts/12-10-venue-detail-preload-instant-mer-info.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-12-10-venue-detail-preload-instant-mer-info.md
generatedTestFiles:
  - nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts
  - nextjs-app/test/unit/api/story-12-10-detail-public-resolver.atdd.test.ts
  - nextjs-app/test/components/story-12-10-venue-detail-cache-miss-shell.atdd.test.tsx
  - nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/12-10-venue-detail-preload-instant-mer-info.md
  - project-context.md
  - _bmad/tea/config.yaml
  - nextjs-app/package.json
  - nextjs-app/playwright.config.ts
---

# ATDD Checklist: Story 12.10 Venue Detail Preload - Instant "Mer info"

## Green Execution

Red-phase scaffolds were activated during implementation. The Story 12.10 local ATDD suite now runs as executable green coverage.

| Level | File | Active scenarios | Acceptance criteria |
| --- | --- | ---: | --- |
| Unit | `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts` | 9 | AC1, AC2, AC3, AC4, AC6 |
| Unit/API | `nextjs-app/test/unit/api/story-12-10-detail-public-resolver.atdd.test.ts` | 3 | AC5 |
| Component | `nextjs-app/test/components/story-12-10-venue-detail-cache-miss-shell.atdd.test.tsx` | 2 | AC6 |
| E2E | `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts` | 4 scenarios x desktop/mobile | AC1, AC2, AC3, AC6, AC7 |

Total: 14 local ATDD scenarios plus 8 browser executions.

## Acceptance Criteria Coverage

- AC1 Initial-settle-only candidate prefetch: unit scheduler source contract plus E2E top-six/order/concurrency request counter.
- AC2 Exact mounted detail key: unit shared query-options contract and E2E detail URL planner/date/location assertions.
- AC3 Epic 11 request-count invariants: unit first-run guard and E2E no detail restart on same-date scrub or planner-date change.
- AC4 Interaction yield, cancellation, and error backoff: unit scheduler contract asserts idle/yield, exact-key cancellation seams, the special case that opening **Mer info** preserves/promotes the opened in-flight detail key instead of aborting the observer's own query, and the 429 regression where prefetch stops after the current concurrency pair, clears failed background query state, enters a 60s cooldown, and emits no app console error.
- AC5 Public resolver convergence and hidden guard: API/source scaffold asserts `resolvePublicVenueIdentifier` adoption and public error behavior.
- AC6 Instant open and cache-miss shell: component scaffold asserts exact Swedish loading copy, `aria-busy`, one status region, stable skeletons, and route chrome; unit and E2E scaffolds assert warmed/in-flight opens keep the opened exact key alive while other queued candidates can be canceled.
- AC7 Measurement and release evidence: E2E writes deterministic local fixture timing evidence to `_bmad-output/implementation-artifacts/validation/story-12-10-mer-info-timing/20260726-local/evidence.json`.

## Chosen Mode And Levels

Generation mode: AI generation from current source and existing test patterns. Browser recording was skipped because Story 12.10 changes background scheduling/cache behavior, and existing Playwright tests already expose stable route matchers, onboarding bypass, planner controls, and venue pins.

Execution mode: sequential within this delegate run. The workflow configuration requested `auto`; the surrounding agent constraints changed during execution, so scaffolds were generated directly instead of launching additional workers.

Primary levels:

- Unit for exact query key, URL, scheduler bounds, source seams, and resolver convergence.
- Component for cache-miss shell accessibility/copy.
- E2E for request-count, instant-open, warmed/unwarmed distinction, and initial-pass concurrency evidence.

## Activation Status

All Story 12.10 ATDD clusters are active. Story 12.10 E2E routes use `?_prefetch=venue-detail` to opt into background prefetch on forced-time test URLs; ordinary `_state`, `_time`, and `_date` validation routes keep the no-prefetch boundary so they do not consume the shared venue read limiter.

## Mock And Fixture Notes

- E2E scaffolds use local route fulfillment for `**/api/venues?**` and `/api/venues/<slug>`; no live Met.no or protected production dependency.
- Candidate DTOs are generated inline with day-series data, following existing Epic 11 request-count specs.
- No reusable fixture infrastructure was added in RED phase; promote helpers only if green-phase implementation needs 3+ uses.

## Validation

- Story 12.10 focused unit/API/component tests pass in full Vitest.
- Story 12.10 E2E passes on desktop and mobile with local route fixtures and no live Met.no dependency.
- Full Vitest passes with `VITEST_MAX_WORKERS=4`.
- Full serialized Playwright passed after final triage: `PLAYWRIGHT_PORT=3225 PLAYWRIGHT_BASE_URL=http://localhost:3225 npx playwright test --workers=1` -> 150 passed, 63 skipped.
- Earlier full-suite failures were resolved or non-reproducible: the Next/Turbopack `/sv` startup overlay cleared after removing generated `.next`; the Story 12.10 cold-shell race was fixed with a 1500 ms local fixture delay; the stale Story 12.9 map-primary E2E assertion was corrected; one Story 12.4 `browserContext.newPage` setup timeout passed in focused isolation and in the final full run.

## Next Workflow

Keep Story 12.10 in `in-progress` until the orchestrator-controlled review transition finishes.
