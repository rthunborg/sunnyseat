---
stepsCompleted:
  - step-01-load-context
  - step-02-discover-tests
  - step-03-quality-evaluation
  - step-03f-aggregate-scores
  - step-04-generate-report
lastStep: step-04-generate-report
lastSaved: 2026-08-07
workflowType: testarch-test-review
reviewScope: suite
epic: "12"
inputDocuments:
  - project-context.md
  - _bmad-output/test-artifacts/test-design/test-design-epic-12.md
  - _bmad-output/qa/epic-12-test-design-2026-07-12.md
  - _bmad-output/test-artifacts/traceability/traceability-report-epic-12.md
  - _bmad-output/test-artifacts/nfr-assessment-epic-12.md
  - nextjs-app/package.json
  - nextjs-app/playwright.config.ts
---

# Test Quality Review: Epic 12 Test Suite

**Quality Score:** 82/100
**Grade:** B - Good, with required fixes before treating the suite as release-gate evidence
**Verdict:** Request Changes
**Review Date:** 2026-08-07
**Reviewer:** TEA Agent
**Execution Mode:** Static review of existing evidence plus targeted test inspection. Broad suites were not run.

## Scope Boundary

This review evaluates the quality of the Epic 12 test suite itself. The already-known trace cap failure, protected/live evidence gaps, and NFR evidence gaps remain release-gate issues, but they are not counted as test-code defects here unless the inspected test code creates a concrete reliability, isolation, or maintainability problem.

## Score Breakdown

| Dimension | Score | Weight | Weighted | Rationale |
| --- | ---: | ---: | ---: | --- |
| Determinism | 80 | 30% | 24.0 | Strong mocking overall, but one live external style fetch, one unconditional skip, and one hard wait reduce repeatability. |
| Isolation | 85 | 30% | 25.5 | Good API/provider seams, but one E2E spec writes shared aggregate evidence with a custom lock. |
| Maintainability | 78 | 25% | 19.5 | Broad coverage and clear helpers, with several large multi-purpose specs over 300 lines. |
| Performance | 86 | 15% | 12.9 | Mostly bounded, but avoidable waits and aggregate evidence IO add cost and variance. |
| **Total** |  |  | **81.9 -> 82** |  |

## Actionable Findings

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

- Epic 12 has broad layered coverage across unit, component, API, SQL assertion, and Playwright E2E tests, matching the trace report's 15 FULL / 6 PARTIAL / 0 UNCOVERED picture.
- Provider isolation is generally strong: Met.no/Google/live-provider boundaries are guarded by static tests and API seam tests.
- Playwright CI wiring includes the `a11y-mobile` project, and Story 12 mobile accessibility coverage is active.
- Request-count and scrub/prefetch tests target real regression risks instead of only rendering states.
- Most tests use stable role/test-id selectors, explicit route mocking, and assertion-oriented flows instead of screenshot-only checks.

## Checklist Result

| Check | Result |
| --- | --- |
| Independent and deterministic | Concerns |
| No real provider dependency | Concerns due OpenFreeMap style fetch |
| Clear setup/teardown | Pass with concerns for shared aggregate evidence |
| BDD/readability | Pass with concerns for large specs |
| No hard waits | Concerns |
| CI suitability | Pass with concerns |
| Required evidence preserved | Pass; existing evidence reviewed only |

## Open Questions / Deferred Work

- Decide whether the skipped Story 12.2 weather-gated feedback scenario is still a required P1 release guard or should be explicitly removed from the acceptance/evidence set.
- Decide whether Story 12.10 timing evidence belongs in Playwright attachments, `_bmad-output/test-artifacts`, or a separate post-run report generated outside the spec body.

## Blockers

None for producing this review artifact. The suite quality verdict remains Request Changes until the high finding and skipped P1 scenario are addressed or accepted with rationale.

## Retro Notes

- The console-hygiene suite's live OpenFreeMap style fetch is a hidden external dependency despite the broader Epic 12 no-live-provider testing posture.
