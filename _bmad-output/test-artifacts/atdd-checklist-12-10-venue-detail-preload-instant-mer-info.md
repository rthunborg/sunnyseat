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

## TDD Red Phase

Red-phase scaffolds generated. All executable scenarios are intentionally skipped with `test.skip()` until the implementation agent activates the current task.

| Level | File | Skipped scenarios | Acceptance criteria |
| --- | --- | ---: | --- |
| Unit | `nextjs-app/test/unit/story-12-10-venue-detail-prefetch.atdd.test.ts` | 5 | AC1, AC2, AC3, AC4, AC6 |
| Unit/API | `nextjs-app/test/unit/api/story-12-10-detail-public-resolver.atdd.test.ts` | 3 | AC5 |
| Component | `nextjs-app/test/components/story-12-10-venue-detail-cache-miss-shell.atdd.test.tsx` | 2 | AC6 |
| E2E | `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts` | 3 | AC1, AC2, AC3, AC6, AC7 |

Total: 13 skipped RED scenarios.

## Acceptance Criteria Coverage

- AC1 Initial-settle-only candidate prefetch: unit scheduler source contract plus E2E top-six/order/concurrency request counter.
- AC2 Exact mounted detail key: unit shared query-options contract and E2E detail URL planner/date/location assertions.
- AC3 Epic 11 request-count invariants: unit first-run guard and E2E no detail restart on same-date scrub or planner-date change.
- AC4 Interaction yield, cancellation, and error backoff: unit scheduler contract asserts idle/yield, exact-key cancellation seams, and the special case that opening **Mer info** preserves/promotes the opened in-flight detail key instead of aborting the observer's own query.
- AC5 Public resolver convergence and hidden guard: API/source scaffold asserts `resolvePublicVenueIdentifier` adoption and public error behavior.
- AC6 Instant open and cache-miss shell: component scaffold asserts exact Swedish loading copy, `aria-busy`, one status region, stable skeletons, and route chrome; unit and E2E scaffolds assert warmed/in-flight opens keep the opened exact key alive while other queued candidates can be canceled.
- AC7 Measurement and release evidence: E2E scaffold creates deterministic request-count evidence for prefetched vs non-prefetched opens; actual before/after timing evidence remains a green/release-lane task.

## Chosen Mode And Levels

Generation mode: AI generation from current source and existing test patterns. Browser recording was skipped because Story 12.10 changes background scheduling/cache behavior, and existing Playwright tests already expose stable route matchers, onboarding bypass, planner controls, and venue pins.

Execution mode: sequential within this delegate run. The workflow configuration requested `auto`; the surrounding agent constraints changed during execution, so scaffolds were generated directly instead of launching additional workers.

Primary levels:

- Unit for exact query key, URL, scheduler bounds, source seams, and resolver convergence.
- Component for cache-miss shell accessibility/copy.
- E2E for request-count, instant-open, warmed/unwarmed distinction, and initial-pass concurrency evidence.

## Activation Guidance

Activate one cluster at a time by replacing `test.skip(` with `test(` only for the task currently being implemented.

Recommended order:

1. Activate the shared query-options scenarios, implement `hooks/queries/venue-detail-query-options.ts`, and refactor `useVenueDetail`.
2. Activate scheduler unit scenarios, implement `hooks/queries/useVenueDetailPrefetch.ts`, and integrate it in `MapView.tsx`.
3. Before wiring interaction cancellation, activate the in-flight **Mer info** preservation scenario and prove the opened exact key is not canceled after the observer mounts.
4. Activate API resolver scenarios, update `app/api/venues/[slug]/route.ts` to use Story 12.7 public resolution.
5. Activate component cache-miss scenarios only if the implementation touches the shell/copy; update locale files to `Laddar platsinformation`.
6. Activate E2E scenarios after unit coverage is green, then record prefetched and non-prefetched **Mer info** timing in story completion notes.

## Mock And Fixture Notes

- E2E scaffolds use local route fulfillment for `**/api/venues?**` and `/api/venues/<slug>`; no live Met.no or protected production dependency.
- Candidate DTOs are generated inline with day-series data, following existing Epic 11 request-count specs.
- No reusable fixture infrastructure was added in RED phase; promote helpers only if green-phase implementation needs 3+ uses.

## Validation

- Scaffold files are present.
- All executable scenarios use `test.skip()`.
- No `expect(true).toBe(true)` placeholder assertions were emitted.
- No `page.waitForTimeout()` or `networkidle` waits were emitted.
- Future helper imports that do not exist yet were intentionally avoided so skipped scaffolds can still typecheck.

## Next Workflow

Proceed to `dev-story`. The implementation agent should activate the relevant skipped scenario before each implementation slice, confirm RED, implement, then keep the activated tests green.
