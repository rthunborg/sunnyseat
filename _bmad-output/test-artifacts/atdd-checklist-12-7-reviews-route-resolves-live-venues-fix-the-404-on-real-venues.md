---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: 2026-08-07
storyId: "12.7"
storyKey: 12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues
storyFile: C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues.md
generatedTestFiles:
  - nextjs-app/test/unit/services/story-12-7-public-venue-resolver.atdd.test.ts
  - nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts
  - nextjs-app/test/unit/api/story-12-7-reviews-route-live-venues.atdd.test.ts
  - nextjs-app/test/unit/api/story-12-7-feedback-route-live-venues.atdd.test.ts
  - nextjs-app/test/unit/api/story-12-7-shared-resolver-convergence.automation.test.ts
inputDocuments:
  - project-context.md
  - _bmad-output/implementation-artifacts/12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues.md
  - _bmad/tea/config.yaml
  - nextjs-app/package.json
  - nextjs-app/vitest.config.ts
---

# ATDD Checklist: Story 12.7 Reviews Route Resolves Live Venues

## TDD Red Phase

Active red-phase acceptance tests were generated because this run explicitly required focused tests that demonstrate the current missing Story 12.7 behavior. These tests should fail before implementation, then pass as the shared public venue resolver and route rewiring land.

- Service resolver tests: 5 active red tests
- Reviews route tests: 5 active red tests
- Feedback route tests: 4 active red tests
- Total: 14 active red tests
- E2E/browser tests: not generated; this is backend/API contract work with no UI or visual delta.

## Generation Mode And Scope

- Mode: AI generation from story ACs and existing route/service source.
- Primary level: Vitest unit/API route contract tests.
- Scope boundary: shared public venue identity resolution for reviews GET, reviews POST, and venue feedback POST only.
- Pact.js guidance was not applied; this is an internal Next.js route/service contract in one monorepo, and the existing Story 12.x pattern is focused Vitest ATDD.

## Acceptance Criteria Coverage

| AC | Red-phase coverage |
| --- | --- |
| AC1 live id/slug resolver and zero-review 200 | Resolver tests require Supabase id/slug parity and reviews GET requires 200 `reviews: []` / `reviewCount: 0` for a live venue absent from fixtures. |
| AC2 one shared identity source for reviews GET/POST | Reviews route source test requires `resolvePublicVenueIdentifier`; POST test requires numeric live id to resolve before slug and persist with canonical live id/slug. |
| AC3 live Supabase regression plus fixture boundary | Route tests require Supabase mode not to fall back to fixture identity; resolver test requires fixture fallback only outside Supabase mode. |
| AC4 feedback POST uses same live resolver | Feedback route tests require live slug and numeric id submissions to succeed, hidden/unknown to 404 before persistence, and no route-local `VENUE_FIXTURE.find`. |
| Visibility and leakage | Resolver and route tests cover hidden/deleted/unknown/blank misses, same public 404 class, and no hidden/deleted/visibility wording in response bodies. |
| Cache/race consistency | Resolver tests require corrupt id/slug collisions to fail closed and misses not to be cached over later visible rows. |

## Trace Gate Remediation Evidence (2026-08-07)

| Trace gap | Story / risk | Discoverable test | Local evidence | Residual external blocker |
| --- | --- | --- | --- | --- |
| 12.7 concurrent same-slug visibility/cache isolation | Cache/race consistency; hidden/deleted public leakage | `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts` -> `[P1] isolates concurrent same-slug visibility reads without in-flight cache bleed` | Uses a pending first mocked Supabase `.limit()` promise and a second immediate same-slug visible row to prove concurrent resolver calls do not share in-flight cache state or leak the first query's visibility result. Focused remediation command passed on 2026-08-07: `npx vitest run test/unit/api/story-12-3-persisted-geometry-route.atdd.test.ts test/unit/services/story-12-7-public-venue-resolver.automation.test.ts test/unit/story-12-12-storage-upload-and-policy.atdd.test.ts` -> 3 files / 29 tests passed, duration 3.77s. | Does not prove the migration was applied to live Supabase or that protected/live schema visibility columns are present. |

## Generated Files

- `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.atdd.test.ts`
- `nextjs-app/test/unit/services/story-12-7-public-venue-resolver.automation.test.ts`
- `nextjs-app/test/unit/api/story-12-7-reviews-route-live-venues.atdd.test.ts`
- `nextjs-app/test/unit/api/story-12-7-feedback-route-live-venues.atdd.test.ts`
- `nextjs-app/test/unit/api/story-12-7-shared-resolver-convergence.automation.test.ts`

## Activation Plan

1. Implement/export the shared server-only public resolver, then run `npx vitest run test/unit/services/story-12-7-public-venue-resolver.atdd.test.ts`.
2. Rewire reviews GET/POST to the shared resolver, then run `npx vitest run test/unit/api/story-12-7-reviews-route-live-venues.atdd.test.ts`.
3. Rewire feedback POST to the same resolver, then run `npx vitest run test/unit/api/story-12-7-feedback-route-live-venues.atdd.test.ts`.
4. Keep the existing focused suites in the story's Testing Requirements green:
   - `npx vitest run test/unit/api/reviews-route.test.ts test/unit/api/venue-feedback-route.test.ts`
   - `npx vitest run test/unit/services/venue-store.test.ts test/unit/services/venue-reviews-persistence.test.ts`

## Expected Red Failures

- Resolver tests fail because `resolvePublicVenueIdentifier` is not exported yet.
- Reviews route live tests fail because `/api/reviews` still uses fixture-only `resolveReviewVenueIdentifier`.
- Feedback route live tests fail because `/api/venues/[slug]/feedback` still imports and searches `VENUE_FIXTURE`.
- Source-contract tests fail until route-local fixture matching is removed and all three routes converge on the shared resolver.

## Mock Requirements

- Supabase is mocked through `@/lib/supabase/server`; no live Supabase calls are made.
- Reviews persistence is mocked through the existing service-role chain for `reviews`.
- Feedback persistence is mocked through `persistVenueFeedback`.
- Hidden/deleted rows are represented with `is_hidden`, `visibility`, and `deleted_at` to force the implementation to reconcile the actual branch schema.

## Running Tests

```bash
cd nextjs-app
npx vitest run test/unit/services/story-12-7-public-venue-resolver.atdd.test.ts test/unit/api/story-12-7-reviews-route-live-venues.atdd.test.ts test/unit/api/story-12-7-feedback-route-live-venues.atdd.test.ts
```

## Red-Green-Refactor Handoff

RED is complete when the focused command fails for the missing shared resolver and fixture-only routes. During implementation, make one file green at a time, then run the existing route/resolver regression suites and the story gate commands from the story file.

## Test Execution Evidence

Focused red verification was run after generation. See the final auto-bmad delegate report for exact failure counts and representative failure messages.

## Notes

- No story implementation, sprint status, or auto-bmad state was changed by this ATDD step.
- No Playwright or visual validation is expected for this backend-only story.
