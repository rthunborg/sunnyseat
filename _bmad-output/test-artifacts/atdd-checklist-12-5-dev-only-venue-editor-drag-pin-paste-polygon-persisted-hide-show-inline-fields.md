# ATDD Checklist: Story 12.5 - Dev-Only Venue Editor

Story file: `C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\12-5-dev-only-venue-editor-drag-pin-paste-polygon-persisted-hide-show-inline-fields.md`

Mode: AI-generated red-phase scaffolds, no browser recording.

## Generated Scaffolds

- `nextjs-app/test/unit/api/story-12-5-dev-venue-editor-guard.atdd.test.ts`
- `nextjs-app/test/unit/api/story-12-5-dev-venue-editor-route.atdd.test.ts`
- `nextjs-app/test/unit/services/story-12-5-venue-display-coordinate.atdd.test.ts`
- `nextjs-app/test/unit/services/story-12-5-polygon-validation.atdd.test.ts`
- `nextjs-app/test/unit/services/story-12-5-media-editor-contract.atdd.test.ts`
- `nextjs-app/test/components/story-12-5-dev-venue-editor.atdd.test.tsx`
- `nextjs-app/test/e2e/story-12-5-dev-venue-editor.atdd.spec.ts`

All scaffold suites are `describe.skip(...)` red-phase acceptance contracts. They are compile-safe now and should be unskipped only as the corresponding Story 12.5 implementation seams are introduced.

## Risk Coverage Map

| Risk / AC | Scaffold Coverage | Expected Red Behavior When Unskipped |
| --- | --- | --- |
| Production-impossibility boundary | `story-12-5-dev-venue-editor-guard.atdd.test.ts`, E2E gate-off test | Production denies before flags, body parsing, or Supabase; no editor route/UI appears |
| Privileged server-only writes | `story-12-5-dev-venue-editor-route.atdd.test.ts` | Editor mutations use service-role server route only; no service-role value reaches client |
| Validated polygon and coordinate inputs | `story-12-5-polygon-validation.atdd.test.ts`, route and E2E polygon tests | Invalid rings/bounds/non-finite inputs return specific errors and write nothing |
| Story 12.3 geometry-input hash invalidation | route polygon test, display-coordinate hash test, E2E drag/hash test | Polygon edits dirty/publish geometry; display drag never changes hash |
| Story 12.7 live visibility semantics | route hidden matrix, E2E hide/show workflow | Hidden venues are indistinguishable from unknown on public list/detail/reviews/feedback/prefetch |
| Story 12.12 media contract preservation | `story-12-5-media-editor-contract.atdd.test.ts` | New media accepts only exact Supabase `venue-media/{slug}/{mediaVersion}/{card|hero}.webp`; legacy `url` is read fallback only |
| Atomic rollback and cache invalidation | route rollback and invalidation tests | Failed publish/invalidation rolls back writes; success returns editor/public invalidation hints |
| Accessible local editor interactions | component and E2E UI scaffolds | Swedish labels, keyboard coordinate fallback, focus recovery, 44px controls, inline errors |

## Implementation Checklist

- [ ] Add a server-only dev editor guard that denies production before env flags, body parsing, Supabase access, or route-specific work.
- [ ] Add guarded dev API routes under a dev-only path; all writes must execute server-side with the service-role client.
- [ ] Add `display_lat` and `display_lng` persistence and public DTO projection while keeping sun engine inputs tied to `seating_area` centroid.
- [ ] Add strict editor-only polygon validation for closed `[lng, lat]` outer rings or GeoJSON Polygon input within Gothenburg bounds.
- [ ] Wire polygon writes through Story 12.3 dirty/publish seams and preserve atomic rollback on any downstream failure.
- [ ] Enforce `venues.hidden` across public list, detail, reviews GET/POST, feedback, and detail prefetch with unknown/hidden parity.
- [ ] Keep `includeHidden` accepted only behind the dev editor guard; public handlers must ignore or reject it without hidden leakage.
- [ ] Preserve Story 12.12 thumbnail DTO shape and reject editor-created legacy external URLs.
- [ ] Invalidate editing-browser venue and editor query keys immediately; document/publicly account for the existing 30 second cache window.
- [ ] Build the editor with Swedish accessible labels, semantic controls, visible focus, 44px touch targets, reduced-motion-safe interactions, and no gate-off visual drift.

## Activation Notes

- Replace each scaffold loader with the real module import only after the matching implementation seam exists.
- Unskip tests in small groups: guard, route write contract, polygon/media service validators, component interactions, then E2E workflow.
- Keep failing assertions specific; do not weaken production-boundary, hidden-venue, hash, or media-origin checks to make the scaffold pass.

## Validation

- Baseline before ATDD generation: `cd nextjs-app && npx tsc --noEmit` passed.
- Baseline before ATDD generation: `cd nextjs-app && npx eslint . --quiet` passed.
- Post-generation: `cd nextjs-app && npx tsc --noEmit` passed.
- Post-generation: `cd nextjs-app && npx eslint . --quiet` passed.
- Post-generation focused Vitest: `npx vitest run ...story-12-5...` passed with 6 files skipped and 29 tests skipped.
- Post-generation focused Playwright: `npx playwright test test/e2e/story-12-5-dev-venue-editor.atdd.spec.ts` passed with 10 tests skipped across mobile and desktop.
