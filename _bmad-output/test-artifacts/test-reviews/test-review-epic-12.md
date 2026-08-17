---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-quality-evaluation
  - step-03f-aggregate-scores
  - step-04-generate-report
lastStep: step-04-generate-report
lastSaved: 2026-08-17
workflowType: testarch-test-review
reviewScope: suite
epic: "12"
inputDocuments:
  - project-context.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-12.md
  - _bmad-output/qa/epic-12-test-design-2026-07-12.md
  - _bmad-output/test-artifacts/traceability/traceability-report-epic-12.md
  - _bmad-output/test-artifacts/nfr-assessment-epic-12.md
  - _bmad-output/test-artifacts/automation-summary.md
  - _bmad-output/test-artifacts/epic-12-protected-validation/protected-validation-report-2026-08-08.md
  - _bmad-output/test-artifacts/traceability/gate-decision-epic-12.json
  - _bmad-output/test-artifacts/traceability/e2e-trace-summary-epic-12.json
  - nextjs-app/package.json
  - nextjs-app/playwright.config.ts
  - nextjs-app/vitest.config.ts
---

# Test Quality Review: Epic 12 Test Suite

**Quality Score:** 90/100
**Grade:** A- - Good, approved with comments
**Verdict:** Approve with Comments
**Review Date:** 2026-08-17
**Reviewer:** TEA Agent
**Execution Mode:** Evidence-only refresh of existing suite evidence plus targeted static test inspection. Broad suites were not rerun locally.

## Scope Boundary

This review evaluates the quality of the Epic 12 test suite itself. The original 2026-08-07 findings are retained below for history; the 2026-08-17 protected-evidence refresh updates their current disposition. The separately owned trace workflow has now consumed the protected report and records PASS at 21/21 FULL.

## 2026-08-17 Evidence-Only Refresh

**Current verdict:** **Approve with Comments** for test-suite quality.

The protected/final evidence now materially changes the test-review outcome:

- Final main CI run `32039760444` passed on exact SHA `a20aac8a4a333a00efa82f4d334eeed033037f46`, including TypeScript, lint, production build, full Vitest, bundle/MapLibre, Playwright, touch-target, Lighthouse, and desktop/mobile axe lanes.
- The authoritative final suite evidence records **215 Vitest files / 1,986 tests** plus green E2E/touch/axe/Lighthouse gates.
- Protected primary, alternate, and security reviews reported zero findings after finalization.
- Protected geometry and weather jobs are green, production deployment is exact-SHA/ready/promoted, and live zero-error scans plus pg_stat deltas support the release evidence set.

### Current Finding Disposition

| Prior finding | Current disposition | Evidence |
| --- | --- | --- |
| Live OpenFreeMap style dependency in console hygiene E2E | Resolved | `story-12-4-console-hygiene.spec.ts` still declares the Positron URL, but routes it to `MAP_STYLE_FIXTURE` before navigation and no longer uses `page.request.get()` for the assertion path. |
| Permanently skipped Story 12.2 P1 feedback scenario | Resolved | Targeted inspection found no `test.skip()` in `story-12-2-feedback-evidence.atdd.spec.ts`. |
| Story 12.3 hard wait in request-count regression | Resolved | Targeted inspection found no `waitForTimeout()` in `story-12-3-persisted-geometry-request-count.atdd.spec.ts`; the file now uses fixed date fixtures and event/assertion-oriented flow. |
| Story 12.10 shared aggregate timing evidence | Resolved | Timing evidence is now attached with `testInfo.attach('story-12-10-mer-info-timing', ...)` instead of a shared repo-local aggregate JSON/lock. |
| Large multi-purpose story specs | Open P2 maintainability comment | Examples remain large: `map-primary.spec.ts` 1092 lines, `story-12-10-venue-detail-prefetch.atdd.spec.ts` 501 lines, `story-12-11-coach-mark-guide.spec.ts` 447 lines, `story-12-1-hours-policy-and-operations.atdd.test.ts` 374 lines. Split only when touched; not a release blocker. |
| Runtime timestamp/current-date helpers | Accepted low-severity comment | Story 12.3 now uses fixed primary date fixtures; remaining `new Date(Date.UTC(...))` uses are deterministic helper transforms. Keep preferring fixed fixtures for new date-boundary tests. |

### Residual Test-Review Caveats

- Some Playwright specs intentionally use project-routed `test.skip(...)` guards for mobile/desktop-specific scenarios. These are acceptable as test routing, but they make raw skip counts noisy; keep reasons explicit.
- Recovered Vercel request/function/external telemetry belongs to NFR observability evidence, not test-code quality. It classifies only `3` true cold starts and cannot group external calls by destination path, so those residuals remain explicit without reducing the suite-quality score.
- The formal trace refresh is PASS at 21/21 FULL; this review did not edit the trace-owned artifacts.

## Score Breakdown

| Dimension | Score | Weight | Weighted | Rationale |
| --- | ---: | ---: | ---: | --- |
| Determinism | 92 | 30% | 27.6 | Prior live style fetch, unconditional skip, and hard wait findings are resolved; fixed fixtures and route mocks dominate the inspected suite. |
| Isolation | 90 | 30% | 27.0 | API/provider seams remain strong, protected live checks are observational/read-only, and Story 12.10 evidence now uses Playwright attachments instead of shared aggregate state. |
| Maintainability | 86 | 25% | 21.5 | Coverage is broad and traceable, but several multi-purpose E2E/story files remain large enough to slow review and increase coupling risk. |
| Performance | 92 | 15% | 13.8 | Final CI and focused reruns are green; bounded waits/attachments are acceptable. Large browser specs remain the main execution-cost concern. |
| **Total** |  |  | **89.9 -> 90** |  |

## Historical Actionable Findings From 2026-08-07

The findings below are preserved as the original review history. Current disposition is recorded in the 2026-08-17 table above; resolved items are not current blockers.

## Original Actionable Findings

### High

1. **Console hygiene E2E can depend on a live third-party style URL.**
   `nextjs-app/test/e2e/story-12-4-console-hygiene.spec.ts:9`, `nextjs-app/test/e2e/story-12-4-console-hygiene.spec.ts:149`, and `nextjs-app/test/e2e/story-12-4-console-hygiene.spec.ts:211` define `https://tiles.openfreemap.org/styles/positron` and call `page.request.get()` from the assertion helper. This makes the local test outcome conditional on network availability and upstream style content when the Positron warning path is exercised. Replace the live request with a pinned local style fixture, route the style URL before navigation, or inspect the already-loaded MapLibre style through a test hook.

### Medium

2. **A P1 feedback scenario is permanently skipped.**
   `nextjs-app/test/e2e/story-12-2-feedback-evidence.atdd.spec.ts:80` uses `test.skip()` for the weather-gated grey public verdict scenario. Skipped P1 tests are invisible to the gate and can go stale. Either make the scenario deterministic with a fixed weather/venue fixture and enable it, or convert it to an explicit `fixme` with a tracked reason and expiry.

3. **A request-count regression test relies on a hard wait.**
   `nextjs-app/test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts:174` waits 500 ms after slider interaction before asserting the `/api/venues` request count. This can be both slow and flaky under load. Replace it with an event-based no-extra-request assertion or `expect.poll` over the request counter with a bounded stability window.

4. **One prefetch E2E spec writes shared repo-local aggregate evidence.**
   `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts:263`, `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts:310`, and `nextjs-app/test/e2e/story-12-10-venue-detail-prefetch.atdd.spec.ts:489` write an aggregate JSON evidence file guarded by a custom filesystem lock. This creates cross-project/shared-state coupling and stale-state risk when tests are sharded, interrupted, or run concurrently. Prefer `testInfo.attach()` or per-test output files under `testInfo.outputPath`, with any aggregation performed after the Playwright run.

5. **Several story specs are large enough to slow review and increase hidden coupling.**
   Notable examples are `story-12-10-venue-detail-prefetch.atdd.spec.ts` at 521 lines, `story-12-11-coach-mark-guide.spec.ts` at 406 lines, `story-12-4-console-hygiene.spec.ts` at 322 lines, and `story-12-1-hours-policy-and-operations.atdd.test.ts` at 350 lines. Extract shared route builders, evidence helpers, and console predicates into local test support modules as these files change next.

### Low

6. **Some route mock payloads use runtime timestamps where fixed fixtures would be clearer.**
   `nextjs-app/test/e2e/story-12-2-feedback-evidence.atdd.spec.ts:61` and `nextjs-app/test/e2e/story-12-2-feedback-evidence.atdd.spec.ts:107` set `createdAt` with `new Date().toISOString()`. The value is not central to the assertion, but fixed timestamps keep snapshots and logs easier to compare.

7. **A date helper defaults to the runner's current date.**
   `nextjs-app/test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts:114` defaults to `new Date()`. The test computes tomorrow, which usually stays valid for the product window, but a fixed `_date` fixture would make date-boundary and DST behavior easier to reason about.

## Strengths

- Epic 12 has broad layered coverage across unit, component, API, SQL assertion, and Playwright E2E tests. The original trace report recorded 15 FULL / 6 PARTIAL / 0 UNCOVERED before the protected-evidence refresh.
- Provider isolation is generally strong: Met.no/Google/live-provider boundaries are guarded by static tests and API seam tests.
- Playwright CI wiring includes the `a11y-mobile` project, and Story 12 mobile accessibility coverage is active.
- Request-count and scrub/prefetch tests target real regression risks instead of only rendering states.
- Most tests use stable role/test-id selectors, explicit route mocking, and assertion-oriented flows instead of screenshot-only checks.

## Checklist Result

| Check | Result |
| --- | --- |
| Independent and deterministic | Pass |
| No real provider dependency | Pass |
| Clear setup/teardown | Pass |
| BDD/readability | Pass with maintainability comments for large specs |
| No hard waits | Pass for inspected prior findings |
| CI suitability | Pass |
| Required evidence preserved | Pass; final CI/protected evidence reviewed |

## Open Questions / Deferred Work

- Consider splitting the largest Playwright/story specs when they are next touched, especially `map-primary.spec.ts` and Story 12.10.
- If required for a later public-launch gate, collect a larger provider-classified cold-start sample and add destination-path instrumentation; keep those NFR concerns outside test-code quality scoring.

## Blockers

None for producing this review artifact. Current test-suite quality verdict is Approve with Comments.

## Retro Notes

None.

## 2026-08-17 Sign-Off

- **Suite Quality:** Approve with Comments
- **Score:** 90/100
- **Critical findings:** 0
- **High findings:** 0 current
- **Medium findings:** 0 current blockers
- **Test-code residuals:** large-spec maintainability and noisy project-routed skips.
- **NFR evidence notes outside the suite-quality score:** strict-cold sample size and external destination-path attribution.
- **Generated by:** BMAD `testarch-test-review` evidence-only refresh.
