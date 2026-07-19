---
baseline_commit: NO_VCS
---

# Story 12.12: Venue Photos — Supabase Storage Hosting + Render/Fallback Fixes

Status: ready-for-dev

## Story

As a **maintainer adding real venue photos**,
I want a stable place to host them and every surface to render them (and degrade
gracefully),
So that photos actually show and never break to a broken-image icon.

## Source Context (Verbatim From Epic)

_Context (2026-07-08, grounded):_ thumbnails are a `{ alt, initials, url? }` jsonb
rendered by plain `<img>` (not `next/image`, so no `next.config` change needed). Today:
the **list card** already degrades a broken URL to initials (`VenueCard` has an
`onError` guard); the **desktop quick-info** card does NOT (`VenueQuickInfo` has no
`onError` → a 404 shows a broken image); and the **detail hero never renders the photo
at all** — it reads `thumbnail` only for alt text and always shows the placeholder. The
fixture currently hotlinks `images.unsplash.com` (fragile, unlicensed for product use).

## Acceptance Criteria (Verbatim From Epic)

**Given** photos need hosting for ~50–100 venues
**When** they are stored in a **public Supabase Storage bucket** (the app already runs on
Supabase; stable public URLs `…/storage/v1/object/public/<bucket>/<slug>.jpg`, no
hotlink/licensing risk) and each venue's `thumbnail.url` is set to its public URL (keep
`initials` populated as the fallback)
**Then** the sanitizer accepts the URL unchanged (http/https allowed) and no
`next.config`/CSP change is required (plain `<img>`)

**Given** the app renders thumbnails via plain `<img>` (no `next/image` auto-resize), so an
original phone/camera photo would download full-size on the list card + detail hero across
50–100 venues — a real bandwidth + LCP regression against the perf budget
**When** the storage convention is defined
**Then** it MANDATES optimized renditions — explicit max dimension/byte/format limits (e.g.
a small card thumbnail + a larger hero rendition, WebP/JPEG, capped px + KB), NOT raw
uploads — so no surface ever downloads a multi-megabyte original; the doc records the exact
limits/rendition sizes to produce before uploading

**Given** the thumbnail contract is a single `{ alt, initials, url }` and VenueCard,
VenueQuickInfo, AND the detail hero all read that ONE `url` — so "a card thumbnail AND a
hero rendition" can't be selected without a contract to carry both
**When** renditions are introduced
**Then** the story defines HOW each surface picks its rendition — either add explicit fields
(e.g. `thumbnail.cardUrl` / `thumbnail.heroUrl`, back-compat with the single `url`), OR a
**deterministic URL convention** (e.g. `<slug>-card.webp` / `<slug>-hero.webp`) the surfaces
derive — with tests — so cards load the small file and the hero the large one (never a card
downloading the hero, nor a blurry hero from the card file)

**Given** the detail hero ignores `thumbnail.url` today
**When** `VenueDetailContent` HeroImage is wired to render `thumbnail.url` (object-cover)
with its OWN `onError`→placeholder
**Then** the real photo shows on the detail overlay, and a broken/missing URL degrades to
the branded placeholder (never a broken image)

**Given** `VenueQuickInfo` has no `onError`
**When** the same `onError`→initials fallback that `VenueCard` already uses is added to
`VenueQuickInfo`'s thumbnail
**Then** a 404/stale URL on the desktop quick-info card degrades to initials, not a broken
image (the list card needs no change; the mobile anchored quick-info already forces the
placeholder)

**Given** `docs/venue-data-load.md` documents the thumbnail field
**When** hosting lands
**Then** the doc explains the Supabase Storage bucket convention (upload keyed by slug,
set `thumbnail.url`, keep `initials`) as the recommended path over external hotlinks

**Design Gate Criteria:**
- **Visual:** Photos render on list card, desktop quick-info, and detail hero; broken
  URLs show initials/placeholder (never a broken-image icon)
- **Behaviour:** Missing `url` → initials everywhere; the mobile anchored quick-info is
  unchanged (still placeholder by design)
- **Animation:** None
- **Visual validation:** Card + quick-info + detail hero with a real photo AND with a
  deliberately-broken URL vs a new reference passes

## Resolved Implementation Contract

Architecture decision `E12-AD-10` resolves the AC3 option: use explicit
`thumbnail.cardUrl` and `thumbnail.heroUrl`, retaining `thumbnail.url` only as a legacy
read fallback during rollout.

- The DTO/database thumbnail contract is `{ alt, initials, cardUrl?, heroUrl?, url? }`.
- List cards and desktop `VenueQuickInfo` select `cardUrl ?? url`.
- Venue detail selects `heroUrl ?? url`.
- Mobile anchored `VenueQuickInfo` keeps its existing placeholder treatment even when media
  URLs exist.
- New media lives in public Supabase Storage bucket `venue-media` with immutable keys
  `{slug}/{mediaVersion}/card.webp` and `{slug}/{mediaVersion}/hero.webp`.
- Card rendition: sRGB WebP, maximum `640x400`, maximum `120 KiB`.
- Hero rendition: sRGB WebP, maximum `1600x900`, maximum `350 KiB`.
- Raw originals are never consumer-addressable, metadata is stripped before upload, and a
  changed image requires a new `mediaVersion`.
- New `cardUrl`/`heroUrl` values must match the configured Supabase project origin, bucket
  `venue-media`, and the exact key convention above. Existing external `url` values may be
  read as legacy fallback until backfilled, but new/editor-created media values must not be
  external hotlinks.
- AC4's `thumbnail.url` wording is interpreted through this adopted contract: the detail
  hero renders the selected detail image URL, `heroUrl ?? url`, with its own failure path.

Latest Supabase Storage docs checked on 2026-07-19: public object URLs use the
`/storage/v1/object/public/<bucket>/<path>` convention; bucket public-read does not grant
anonymous write access; Storage authorization is backed by RLS policies on
`storage.objects`; service-role keys bypass RLS and must remain server/tooling only; object
operations should go through the Storage API rather than direct writes to storage metadata.

## Pre-Implementation Dependency Gate

Start with these checks before editing:

1. Run from `nextjs-app/`: `npx tsc --noEmit` and `npx eslint . --quiet`. If failures are
   outside this story's scope, stop and report them before editing. These checks passed at
   story creation on 2026-07-19.
2. Confirm the branch already includes the Story 12.6 public sunny/not-sunny contract and
   the Story 12.13 confidence-removal contract before touching shared venue card,
   quick-info, or detail surfaces. Do not reintroduce user-facing confidence or percentage
   chips on weather-gated/grey surfaces while wiring photos.
3. Confirm the current seams still match this story: `VenueDataDto.thumbnail` and
   `normalizeVenueForResponse` only know `{ alt, initials, url? }`; fixtures still hotlink
   `images.unsplash.com`; `VenueCard` already has image failure fallback; `VenueQuickInfo`
   lacks it; `VenueDetailContent` hero never renders a real image.
4. Do not add `next/image`, `next.config` image domains, CSP changes, a browser upload
   surface, a public Supabase browser client, or raw original-photo serving routes.
5. Put any new maintainer media scripts under `nextjs-app/scripts/` unless the root
   `.gitignore` allow-list is deliberately updated. Root `scripts/*` is ignored by default.

## Tasks / Subtasks

- [ ] **Task 0 - Preflight source, branch, and test baseline** (AC: all)
  - [ ] Run the required baseline from `nextjs-app/`: `npx tsc --noEmit` and
    `npx eslint . --quiet`.
  - [ ] Inspect `nextjs-app/lib/types/api.ts`, `nextjs-app/lib/services/venues-fixture.ts`,
    `nextjs-app/lib/services/venue-store.ts`, `nextjs-app/components/composed/venue/VenueCard.tsx`,
    `nextjs-app/components/composed/venue/VenueQuickInfo.tsx`,
    `nextjs-app/components/composed/venue/VenueDetailContent.tsx`,
    `nextjs-app/components/custom/map/MapView.tsx`, and
    `nextjs-app/components/custom/venue/forced-venue-detail.ts` before editing.
  - [ ] Reconfirm the branch's active visual reference set and state map:
    `project-context.md`, `nextjs-app/docs/design/references/claude-design/README.md`,
    `nextjs-app/docs/design/references/claude-design/STATE-MAPPING.md`,
    `nextjs-app/scripts/capture-claude-design-refs.mjs`, and
    `nextjs-app/docs/design/references/REBASELINE-LOG.md`.
  - [ ] Record any missing protected Supabase credentials as an operational evidence gap,
    not as a reason to fake storage-policy verification.

- [ ] **Task 1 - Add the thumbnail DTO, selection, and sanitizer contract** (AC: 1, 3)
  - [ ] Extend `VenueDataDto.thumbnail` to `{ alt: string; initials: string; cardUrl?: string; heroUrl?: string; url?: string }`.
  - [ ] Prefer a shared client-safe helper for media selection, for example
    `selectVenueCardImageUrl(thumbnail)` and `selectVenueHeroImageUrl(thumbnail)`, so list,
    quick-info, and detail cannot drift.
  - [ ] Update `normalizeVenueForResponse` so `alt` and `initials` remain required when a
    thumbnail is present, legacy `url` is still sanitized as an http/https read fallback, and
    new `cardUrl`/`heroUrl` are preserved only when they match the configured Supabase
    origin plus `venue-media/{slug}/{mediaVersion}/{card|hero}.webp` convention.
  - [ ] Keep malformed optional URLs non-fatal: drop the bad optional field and retain
    valid `alt`/`initials` fallback data instead of throwing from public list/detail routes.
  - [ ] Update route/store/fixture tests so old rows with only `url`, rows with explicit
    `cardUrl`/`heroUrl`, missing media, wrong origin, wrong bucket/key, and malformed URLs
    are all covered.
  - [ ] Do not add new public DTO fields beyond the media contract. Public handlers still
    expose only DTO fields and must not leak service data, raw storage metadata, or private
    provenance notes.

- [ ] **Task 2 - Add Supabase Storage bucket/policy migration and verification** (AC: 1, 2)
  - [ ] Add an idempotent repository-root migration under `supabase/migrations/` for the
    public-read `venue-media` bucket and its object policies. `_bmad-output` SQL evidence is
    not the deployable migration authority.
  - [ ] Configure the bucket for optimized WebP renditions only, with file-size enforcement
    aligned to the `350 KiB` hero maximum. If Supabase bucket metadata cannot express both
    surface-specific byte limits, enforce the tighter surface-specific checks in the upload
    tool and document that split.
  - [ ] Add a public `SELECT` policy scoped to bucket `venue-media` and avoid anon/auth
    `INSERT`, `UPDATE`, or `DELETE` policies. Service-role/manual tooling owns writes.
  - [ ] Verify locally or in a protected Supabase preview that public reads work for
    `venue-media` and anon/auth writes are denied. If protected credentials are unavailable,
    document the exact missing evidence in the Dev Agent Record and keep local policy tests
    explicit.
  - [ ] Regenerate `nextjs-app/lib/supabase/types.ts` when the migration changes generated
    schemas in this project. If generated public types are unchanged because the migration
    only touches Supabase Storage metadata, record that explicitly.

- [ ] **Task 3 - Add maintainer upload/data workflow and update venue data docs** (AC: 1, 2, 6)
  - [ ] Replace fixture/default hotlinks to `images.unsplash.com`. Production-like data
    should point to Supabase Storage renditions; deterministic local/test assets may be used
    only for tests and forced visual states.
  - [ ] Add or update maintainer tooling under `nextjs-app/scripts/` to validate/upload
    already-rendered `card.webp` and `hero.webp` objects with `@supabase/supabase-js`,
    `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
  - [ ] The upload path is create-only: use Storage API upload with `upsert: false`, fail if
    either key already exists, and require a new `mediaVersion` when bytes change.
  - [ ] Validate slug, mediaVersion, file path, MIME/content type, byte size, and dimensions
    before upload. If the implementation chooses to generate renditions from originals, add
    any image-processing dependency as dev/tooling-only and confirm it does not enter the
    runtime bundle path.
  - [ ] Ensure the script never logs the service-role key and never writes through browser
    clients.
  - [ ] Update `nextjs-app/docs/venue-data-load.md` with the `venue-media` bucket, exact key
    convention, public URL examples, rendition limits, create-only/versioning rule, fallback
    initials requirement, and warning against external hotlinks/raw originals.
  - [ ] Update `.env.example` or app environment docs only if the script needs an already
    undocumented variable. Do not commit real secrets.

- [ ] **Task 4 - Render photos and graceful fallback on every owned surface** (AC: 3, 4, 5)
  - [ ] Update `VenueCard` to select `thumbnail.cardUrl ?? thumbnail.url` while preserving
    its existing failure-to-initials behavior, layout, Swedish labels, touch targets, focus
    behavior, and Story 12.6 public-sun badge semantics.
  - [ ] Add desktop `VenueQuickInfo` image failure handling equivalent to `VenueCard`:
    reset failure state when the selected URL changes, switch once to initials on `error` or
    decode/natural-size failure, remove failed images from the accessibility tree, and avoid
    infinite retries.
  - [ ] Preserve `VenueQuickInfo` mobile anchored behavior: when `forcePlaceholder` is true,
    it remains the shipped placeholder even if `cardUrl`/`heroUrl` exist.
  - [ ] Wire `VenueDetailContent` hero to render `thumbnail.heroUrl ?? thumbnail.url` with
    `object-cover` in the existing stable hero frame and its own `onError`/decode failure
    path to the branded placeholder.
  - [ ] Prevent layout shift and duplicate screen-reader announcements: the successful image
    and the fallback each have a clear accessible treatment, and a failed image is no longer
    announced.
  - [ ] Do not reintroduce confidence text, alter route overlay behavior, or change the
    shared public sunny predicate while touching these components.
  - [ ] Review the existing deferred `VenueQuickInfo`/`VenueCard` thumbnail badge note about
    stale literal `SOL` wording. Only close it if the touched code path demonstrably already
    satisfies the Story 12.6 grey/percentage-free contract; otherwise leave it out of scope.

- [ ] **Task 5 - Add deterministic photo loaded/fallback states and visual references** (AC: 4, 5, Design Gate)
  - [ ] Add `venue-photo-loaded` and `venue-photo-fallback` to the canonical Screen ID ->
    Route Map in `project-context.md` for mobile and desktop, using the seeded
    `test-venue-sunny` path/slug convention.
  - [ ] Update `nextjs-app/docs/design/references/claude-design/STATE-MAPPING.md` and
    `nextjs-app/scripts/capture-claude-design-refs.mjs` with deterministic capture recipes
    for both states and both viewports.
  - [ ] Add forced-state data so `venue-photo-loaded` exercises a valid card rendition on
    list/desktop quick-info and a valid hero rendition on detail. The mobile anchored
    quick-info must remain placeholder by design.
  - [ ] Add forced-state data so `venue-photo-fallback` uses a deliberately broken media URL
    that triggers the browser image `onError` path. A missing-URL-only placeholder is not
    sufficient for this state.
  - [ ] Add or update references under
    `nextjs-app/docs/design/references/screens/{mobile,desktop}/venue-photo-loaded.png` and
    `.../venue-photo-fallback.png`; update `REBASELINE-LOG.md` in the same operation.
  - [ ] Pair visual validation with DOM/E2E assertions. A single screenshot cannot prove
    list card, desktop quick-info, and detail hero surface selection at once, so tests must
    assert the selected card/hero URLs and fallback states directly.
  - [ ] If the canonical visual validator is blocked by missing credentials or the known
    Windows `/tmp` capture issue, do not silently bypass it. Use the documented manual
    validation affordance only when explicitly allowed by the environment and record the
    rationale and evidence path.

- [ ] **Task 6 - Add focused automated coverage** (AC: all)
  - [ ] Component tests: `VenueCard` uses `cardUrl` over `url`, keeps legacy `url` fallback,
    and still falls back to initials on image failure.
  - [ ] Component tests: desktop `VenueQuickInfo` uses `cardUrl ?? url`, falls back to
    initials on failure, resets when URL changes, and mobile anchored quick-info still forces
    placeholder.
  - [ ] Component tests: `VenueDetailContent` uses `heroUrl ?? url`, object-covers in the
    hero frame, and switches to branded placeholder for missing/broken/decode-failed media.
  - [ ] API/service tests: normalization preserves valid `cardUrl`/`heroUrl`, preserves
    legacy `url` read fallback, rejects new invalid origins/keys, and keeps old rows working.
  - [ ] Script/tool tests: upload validation rejects wrong slug, wrong mediaVersion, wrong
    MIME/content type, too-large card/hero files, duplicate keys, raw originals, and missing
    service-role configuration without leaking secrets.
  - [ ] Storage policy/migration tests or protected verification: public read succeeds for
    `venue-media`; anon/auth insert/update/delete fail; service-role upload succeeds when
    credentials are available.
  - [ ] E2E/visual tests: `venue-photo-loaded` and `venue-photo-fallback` cover mobile and
    desktop, include deterministic waits for loaded/fallback image state, and include
    `a11y` plus `a11y-mobile` coverage for image/fallback changes.

- [ ] **Task 7 - Run required gates and transition through the review script** (AC: all)
  - [ ] Run from `nextjs-app/`: `npx tsc --noEmit`, `npx eslint . --quiet`, and
    `npx vitest run`.
  - [ ] Run focused tests while developing for media normalization, components, upload
    tooling, storage policy/migration, forced states, and any changed E2E specs.
  - [ ] Run `npx playwright test` because this story changes user-visible photo/fallback
    behavior and visual state forcing.
  - [ ] Run visual validation for `venue-photo-loaded` and `venue-photo-fallback` on mobile
    and desktop using `.\scripts\run-sh.ps1 scripts/visual-validate.sh <screen-id> <route> <viewport>`.
  - [ ] Move the story to review only through
    `.\scripts\run-sh.ps1 scripts/story-review.sh 12-12-venue-photos-supabase-storage-hosting-render-fallback-fixes`
    from the repository root.

## Dev Notes

### Current Implementation Facts

- `nextjs-app/lib/types/api.ts` currently defines `VenueDataDto.thumbnail` as
  `{ alt: string; initials: string; url?: string }`.
- `nextjs-app/lib/services/venues-fixture.ts` currently sanitizes `alt`, `initials`, and
  `url`; the fixture rows currently use external `images.unsplash.com` URLs.
- `nextjs-app/lib/services/venue-store.ts` selects the `thumbnail` JSONB field and passes it
  through to the public DTO path; keep this server-only boundary intact.
- `VenueCard` already handles broken image URLs by falling back to initials. Reuse that
  behavior; do not replace it with a new visual language.
- `VenueQuickInfo` currently renders `<img src={thumbnail.url}>` on desktop with no
  `onError`; mobile anchored quick-info uses `forcePlaceholder`.
- `VenueDetailContent` currently reads `thumbnail` for alt/placeholder context but never
  renders the real photo in the hero frame.
- Forced visual venue code currently strips or omits thumbnail URLs. It must explicitly
  carry the new media fields for the photo states without changing unrelated forced states.

### API Boundary And Architecture

Client components must not import `nextjs-app/lib/supabase`, `nextjs-app/lib/solar`,
`nextjs-app/lib/weather`, `nextjs-app/lib/middleware`, or `nextjs-app/lib/buildings`.
Keep Supabase URL validation/upload/policy checks in server/tooling modules and pass only
DTO fields into React components. Query keys remain centralized in
`nextjs-app/lib/query-keys.ts`; this story should not create inline query keys.

The JSONB `venues.thumbnail` shape is additive. Do not add separate `card_url` or
`hero_url` public columns unless a later architecture decision explicitly changes the
contract. Story 12.5's dev-only editor will consume the same shared media validator; do not
build the editor UI in this story.

### Visual And Accessibility Notes

Use existing design tokens from `nextjs-app/docs/design/DESIGN.md`: `radius-venue-image`,
`size-venue-card-thumb`, `size-venue-card-thumb-compact`, and the existing detail hero
frame sizes. Do not add raw colors, arbitrary spacing, custom shadows, copied prototype CSS,
or non-token Tailwind colors.

Fallbacks must be semantic and stable:

- Initials fallback has an accessible image name derived from the venue name/thumbnail alt.
- Branded detail placeholder has one clear accessible announcement, not a failed URL plus a
  second decorative placeholder announcement.
- Failed images are removed from the accessibility tree after failure.
- Focus behavior, touch targets, Swedish copy, and `prefers-reduced-motion` behavior remain
  unchanged. This story adds no animation.

### Testing Guidance

The risk class is high because the story spans Supabase policy, public DTOs, renderer
selection, visual states, and performance. Default to focused red/green tests at each seam
before broad suites. Do not rely on live Supabase or external image hosts in the default
unit/component/E2E suites; mock Storage API calls and route image requests deterministically.

Use `VITEST_MAX_WORKERS=4` if the Windows suite shows worker instability, as noted by
Epic 12 retro evidence. For Playwright, isolate the dev server port if another localhost
server is already running, and use `CI=1`/the repo Playwright webServer path when that is the
most reliable way to avoid a reused unrelated server.

### Out Of Scope

- No `next/image` migration.
- No production/admin browser upload surface.
- No Story 12.5 editor UI.
- No Story 12.10 detail preloading.
- No Story 12.14 closed-venue filtering.
- No changes to the sun/shadow engine, weather adapter, confidence model, public-sunny
  predicate, or payment/future-premium flows.
- No reference replacement without the required visual-gate evidence and `REBASELINE-LOG.md`
  entry.

## References

- `_bmad-output/planning-artifacts/epics.md` - Story 12.12 source text and design gate.
- `_bmad-output/planning-artifacts/architecture.md` - `E12-AD-10` media contract and
  `E12-AD-12` controlled migration seam.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - `VenuePhoto` behavior and
  `venue-photo-loaded` / `venue-photo-fallback` state contracts.
- `_bmad-output/planning-artifacts/test-design-epic-12.md` - media/storage R-012 risk and
  recommended test data.
- `_bmad-output/planning-artifacts/implementation-readiness-epic-12.md` - LR5 readiness
  lane and dependency notes.
- `_bmad-output/auto-bmad/retro-notes/epic-12.md` - Epic 12 implementation/review lessons,
  especially protected policy evidence, visual-gate credentials, and Windows test caveats.
- `project-context.md` - durable project context, Screen ID -> Route Map, visual validation
  rules, and known Windows visual-validator issue.
- `nextjs-app/docs/design/DESIGN.md` - binding design tokens.
- `nextjs-app/docs/venue-data-load.md` - venue data loading docs to update.
- Supabase docs checked 2026-07-19:
  - `https://supabase.com/docs/guides/storage/serving/downloads`
  - `https://supabase.com/docs/guides/storage/security/access-control`
  - `https://supabase.com/docs/guides/storage/schema/design`
  - `https://supabase.com/docs/guides/storage/schema/helper-functions`
  - `https://supabase.com/docs/guides/local-development/database-migrations`

## Dev Agent Record

### Agent Model Used

_(To be filled by dev agent)_

### Debug Log References

_(To be filled by dev agent)_

### Completion Notes

_(To be filled by dev agent)_

### File List

_(To be filled by dev agent)_

### Change Log

- 2026-07-19 - Story created by BMAD create-story workflow; baseline typecheck and lint
  passed before drafting; status set to ready-for-dev.

## Create-Story Self-Validation

- Acceptance criteria preserved verbatim from the epic source.
- Ambiguous AC3 option resolved through adopted architecture decision `E12-AD-10`:
  explicit `cardUrl`/`heroUrl` with legacy `url` fallback.
- Current implementation seams were checked against app files, including DTO, fixture,
  store, card, quick-info, detail hero, and forced-state code.
- Project structure notes cover the app-root command boundary, client/server API boundary,
  Supabase migration authority, root script ignore trap, and visual-reference update rules.
- Testing tasks cover unit/component/API/script/storage/E2E/a11y/visual evidence and the
  four required new media references.
- Scope fences exclude editor UI, preloading, closed-venue filtering, engine/weather,
  confidence, payments, and unaudited rebaseline work.
