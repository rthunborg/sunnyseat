---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-08-07'
workflowType: testarch-atdd
storyId: '12.12'
storyKey: 12-12-venue-photos-supabase-storage-hosting-render-fallback-fixes
storyFile: C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\12-12-venue-photos-supabase-storage-hosting-render-fallback-fixes.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-12-12-venue-photos-supabase-storage-hosting-render-fallback-fixes.md
generatedTestFiles:
  - nextjs-app/test/unit/services/story-12-12-venue-media-contract.atdd.test.ts
  - nextjs-app/test/unit/story-12-12-storage-upload-and-policy.atdd.test.ts
  - nextjs-app/test/unit/story-12-12-visual-state-contract.atdd.test.ts
  - nextjs-app/test/components/story-12-12-venue-photo-surfaces.atdd.test.tsx
  - nextjs-app/test/e2e/story-12-12-venue-photo-states.atdd.spec.ts
inputDocuments:
  - project-context.md
  - _bmad/tea/config.yaml
  - _bmad-output/implementation-artifacts/12-12-venue-photos-supabase-storage-hosting-render-fallback-fixes.md
  - nextjs-app/package.json
  - nextjs-app/playwright.config.ts
  - nextjs-app/vitest.config.ts
  - nextjs-app/test/components/VenueCard.test.tsx
  - nextjs-app/test/components/VenueQuickInfo.test.tsx
  - nextjs-app/test/components/VenueDetailContent.test.tsx
  - nextjs-app/test/unit/services/venue-store.test.ts
  - nextjs-app/test/e2e/story-12-6-public-sun-pins.atdd.spec.ts
---

# ATDD Checklist - Epic 12, Story 12.12: Venue Photos

Date: 2026-07-19
Author: Rasmus
Primary Test Level: Component + service/unit, with E2E forced-state coverage

## Story Summary

Story 12.12 adds Supabase Storage-hosted optimized venue photo renditions and wires one thumbnail contract across list cards, desktop quick-info, and detail hero. The red-phase scaffolds pin the additive `{ cardUrl, heroUrl, url }` contract, real image error fallback behavior, upload/policy constraints, docs, and deterministic visual states.

## Acceptance Criteria Coverage

| AC / Contract | Red-phase scaffold coverage |
| --- | --- |
| Supabase public URL accepted unchanged; no `next/image` dependency | `story-12-12-venue-media-contract.atdd.test.ts`; storage policy tests |
| Optimized WebP rendition limits | `story-12-12-storage-upload-and-policy.atdd.test.ts` |
| `cardUrl` / `heroUrl` explicit selection with legacy `url` fallback | media contract and component tests |
| Detail hero renders photo and falls back to branded placeholder | component test `VenueDetailContent renders thumbnail.heroUrl...`; error/decode tests |
| Desktop `VenueQuickInfo` error fallback; mobile anchored placeholder unchanged | component quick-info tests |
| Venue data docs describe Storage convention over hotlinks | docs assertion in storage/docs test |
| Visual loaded/fallback states, mobile + desktop | visual-state unit checks and `story-12-12-venue-photo-states.atdd.spec.ts` |

## Trace Gate Remediation Evidence (2026-08-07)

| Trace gap | Story / AC | Discoverable test | Local evidence | Residual external blocker |
| --- | --- | --- | --- | --- |
| 12.12 local Storage migration policy matrix | Supabase public URL, public read, no browser writes | `nextjs-app/test/unit/story-12-12-storage-upload-and-policy.atdd.test.ts` -> `[P0] local migration source permits browser public reads only for venue-media and no browser writes` | Source-level migration assertion proves Storage RLS is enabled, browser read policies are exact to `venue-media` for `anon`/`authenticated`, no browser `insert`/`update`/`delete`/`all` policy exists, and no browser write `with check` path is introduced. Focused remediation command passed on 2026-08-07: `npx vitest run test/unit/api/story-12-3-persisted-geometry-route.atdd.test.ts test/unit/services/story-12-7-public-venue-resolver.automation.test.ts test/unit/story-12-12-storage-upload-and-policy.atdd.test.ts` -> 3 files / 29 tests passed, duration 3.77s. | Does not claim the policy was applied in protected Supabase, that service-role upload succeeded live, that public read succeeded live, or that anon/auth write denial was verified against the protected instance. |

## Red-Phase Test Scaffolds Created

All scaffolds use `it.skip()` or `test.skip()` and assert expected behavior. They are intended to be activated one scenario at a time during implementation.

### Component Tests

File: `nextjs-app/test/components/story-12-12-venue-photo-surfaces.atdd.test.tsx`

- `[P0] VenueCard selects thumbnail.cardUrl over legacy thumbnail.url`
- `[P0] VenueCard keeps the legacy thumbnail.url read fallback`
- `[P0] VenueCard falls back to accessible initials on an actual image error event`
- `[P0] desktop VenueQuickInfo selects thumbnail.cardUrl over legacy thumbnail.url`
- `[P0] desktop VenueQuickInfo falls back to initials and removes the failed image from the accessibility tree`
- `[P1] desktop VenueQuickInfo resets the failed-image state when the selected URL changes`
- `[P1] anchored mobile VenueQuickInfo keeps its placeholder treatment`
- `[P0] VenueDetailContent renders thumbnail.heroUrl as an object-cover hero image`
- `[P0] VenueDetailContent falls back to the branded placeholder when the hero image errors`
- `[P1] VenueDetailContent treats a decoded zero-width hero image as failed without duplicate announcements`

### Service / DTO Tests

File: `nextjs-app/test/unit/services/story-12-12-venue-media-contract.atdd.test.ts`

- `[P0]` sanitizer preserves valid Supabase `cardUrl`/`heroUrl`
- `[P0]` legacy `url` rows keep working
- `[P0]` malformed optional media fields are dropped while alt/initials survive
- `[P0]` wrong origin/bucket/key is rejected for new rendition fields
- `[P0]` DTO projection preserves additive media and leaks no storage metadata
- `[P0]` shared client-safe selection helpers select card and hero images deterministically

### Storage / Upload / Docs Tests

File: `nextjs-app/test/unit/story-12-12-storage-upload-and-policy.atdd.test.ts`

- `[P0]` migration creates public-read `venue-media` and no anon/auth writes
- `[P0]` protected-policy evidence gaps are explicit
- `[P0]` upload validator rejects bad slug, version, MIME/content type
- `[P0]` missing service-role config fails without secret leakage
- `[P1]` docs include bucket, key convention, byte/dimension limits, fallback initials, no hotlinks/raw originals

### Visual-State Contract Tests

File: `nextjs-app/test/unit/story-12-12-visual-state-contract.atdd.test.ts`

- `[P0]` `project-context.md` registers `venue-photo-loaded` and `venue-photo-fallback` for mobile and desktop
- `[P0]` Claude Design state mapping and capture script include both states and viewports
- `[P0]` rebaseline log references the new mobile/desktop PNGs

### E2E Tests

File: `nextjs-app/test/e2e/story-12-12-venue-photo-states.atdd.spec.ts`

- `[P0] mobile venue-photo-loaded proves cross-surface photo contract`
- `[P0] desktop venue-photo-loaded proves cross-surface photo contract`
- `[P0] mobile venue-photo-fallback proves actual image-error fallback`
- `[P0] desktop venue-photo-fallback proves actual image-error fallback`

## Required Implementation Hooks

The implementation should expose stable test IDs only where the E2E contract needs to distinguish loaded images from fallback surfaces:

- `venue-card-photo`
- `venue-card-photo-fallback`
- `venue-quick-info-photo`
- `venue-quick-info-photo-fallback`
- `venue-detail-hero-photo`
- `venue-detail-hero-fallback`

These IDs are for deterministic visual-state proof. Component tests primarily use accessible roles and names.

## Red-Green Activation Guide

1. Start with `nextjs-app/test/unit/services/story-12-12-venue-media-contract.atdd.test.ts`.
2. Remove `it.skip()` from one scenario and confirm it fails for the missing contract.
3. Implement the narrow behavior needed for that scenario.
4. Run the focused command, for example:

```bash
cd nextjs-app && npx vitest run test/unit/services/story-12-12-venue-media-contract.atdd.test.ts
```

5. Continue through component tests, storage/tooling tests, visual-state contract tests, then E2E.
6. Before review, run the story gates from the story file: typecheck, lint, Vitest, Playwright, and visual validation for both photo states and both viewports.

## Mock And Fixture Requirements

- No live Supabase dependency in default tests. Storage client/upload behavior should be mocked.
- No external image hosts in unit/component/E2E tests.
- The E2E scaffold intercepts `/storage/v1/object/public/venue-media/**/*.webp`; loaded state fulfills a deterministic image response, fallback state aborts the request so browser `error` handlers run.
- Protected Supabase read/write policy proof remains an evidence gap unless credentials are available; do not fake a live verification pass.

## Verification Evidence

Pre-edit baseline:

```text
cd nextjs-app && npx tsc --noEmit
cd nextjs-app && npx eslint . --quiet
```

Both commands exited successfully before scaffold edits.

Scaffold verification should be captured after generation by running the focused skipped-test files and confirming they compile and are skipped.

Post-generation scaffold verification:

```text
cd nextjs-app && npx tsc --noEmit
cd nextjs-app && npx eslint . --quiet
cd nextjs-app && npx vitest run test/components/story-12-12-venue-photo-surfaces.atdd.test.tsx test/unit/services/story-12-12-venue-media-contract.atdd.test.ts test/unit/story-12-12-storage-upload-and-policy.atdd.test.ts test/unit/story-12-12-visual-state-contract.atdd.test.ts
  Test Files  4 skipped (4)
  Tests       24 skipped (24)
cd nextjs-app && npx playwright test test/e2e/story-12-12-venue-photo-states.atdd.spec.ts --project=desktop
  4 skipped
```

## Notes

- Sequential generation mode was used because this runtime disables proactive sub-agent spawning.
- Browser recording was not used because `venue-photo-loaded` / `venue-photo-fallback` are new forced states and the required selectors do not exist yet.
- The scaffolds intentionally assert actual error/decode-failure behavior, not only missing-url placeholders.
