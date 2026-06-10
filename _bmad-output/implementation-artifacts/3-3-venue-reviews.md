---
baseline_commit: 583af1a
drafted_at: 2026-06-08T18:30:00+02:00
---

# Story 3.3: Venue Reviews

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Sequencing:** Stories 3.0, 3.0.1-3.0.7, 3.1, and 3.2 are done. Reviews now build on the completed routing flow, inline feedback flow, shared Amber CTA, forced venue-detail states, and corrected uncertainty/confidence model.
>
> **Scope boundary:** Implement consumer venue reviews only. Do not add admin/candidate-review queues, moderation dashboards, venue CRUD, user accounts, auth, analytics dashboards, partner features, premium/payment/Swish paths, route recalculation, geodata imports, confidence recalibration, or live SQL execution.
>
> **Source conflict note:** The active mobile prototype's `ReviewModal` contains modal chrome, required star rating, review tags, and "Publicera" copy. Story 3.3 ACs and UX spec define an inline venue-detail review form where text enables `Skicka`, rating is optional, and review submission is user-initiated via "Lämna ett omdöme". Implement the story ACs/UX spec and match the visual outcome; do not copy prototype modal structure or add tag taxonomy unless Rasmus explicitly changes scope.

## Story

As a **user**,
I want to read reviews from other visitors and write my own review,
So that I can learn from others' experiences and share mine.

## Acceptance Criteria

**Given** a venue has reviews submitted by other users
**When** the venue detail renders
**Then** a reviews section appears below the main venue information
**And** each ReviewCard displays: review text, optional rating, and relative timestamp
**And** reviews are fetched from `GET /api/reviews?venueId=[id]`

**Given** the user wants to write a review
**When** they tap the "Lämna ett omdöme" CTA button (AmberCTAButton styling) in the venue detail
**Then** a ReviewForm opens with: venue name header + "Plats inom SunnySeat" subtitle, "Skriv ett omdöme" heading (`text-heading-lg`), a multi-line text area (`color-surface-muted` background, `radius-card`), optional "Lägg till foto" link with camera icon, and a "Skicka" CTA button

**Given** the review text area is empty
**When** the form state is evaluated
**Then** the "Skicka" button is disabled at 40% opacity

**Given** the user has entered text in the review field
**When** the text area has content
**Then** the "Skicka" button becomes enabled
**And** the text area border transitions to `color-amber-dark` on focus (150ms)

**Given** the user taps "Skicka" with valid review text
**When** the review is submitted to `POST /api/reviews`
**Then** the button shows a spinner and input is disabled during submission
**And** on success: inline confirmation "Tack för ditt omdöme." replaces the form
**And** on failure: inline error "Kunde inte skicka. Försök igen." appears below the form with retry

**Given** the user taps "Stäng" on the review form
**When** the form is dismissed
**Then** the form closes and returns to the venue detail scroll position without submitting

**Given** the user taps "Lägg till foto"
**When** the photo picker opens
**Then** the device's native camera or photo library picker opens
**And** the selected photo attaches to the review (optional, not required for submission)

**Given** `prefers-reduced-motion` is enabled
**When** review form animations occur
**Then** all state changes are instant (no crossfade transitions)

**Design Gate Criteria:**
- **Visual:** Matches active visual reference `review` from the current source-of-truth bundle
- **Behaviour:** All interactions and states defined in UX spec §ReviewForm and §ReviewCard are implemented
- **Animation:** Form open/close, text-area focus, and submission confirmation animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx.cmd tsc --noEmit` before editing. Stop and surface any errors outside this story's scope.
  - [x] 1.2 Run `cd nextjs-app && npx.cmd eslint . --quiet` before editing. Stop and surface any errors outside this story's scope.
  - [x] 1.3 Read `AGENTS.md`, `project-context.md`, this story, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/prd.md`, `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`, and `nextjs-app/docs/design/DESIGN.md`.
  - [x] 1.4 Read `nextjs-app/docs/design/references/claude-design/README.md`, `STATE-MAPPING.md`, and the MVP mobile `review`, `venue-detail`, and review-prototype source before changing visible review UI. Match visual outcome, not prototype implementation.
  - [x] 1.5 Confirm Story 3.2 feedback remains done and that this story does not change the feedback API contract, likely-visited eligibility, or feedback duplicate-suppression behaviour.
  - [x] 1.6 Confirm `_bmad-output/implementation-artifacts/deferred-work.md` no longer has an active Story 3.3 carry-in item; the ratings/review-count/price metadata decision is carried into Task 7 below.

- [x] **Task 2: Define review DTOs, query keys, and persistence boundary** (AC: #1, #5, #7)
  - [x] 2.1 Extend `nextjs-app/lib/types/api.ts` with review DTOs: `ReviewDto`, `ReviewSummaryDto`, `GetReviewsResponse`, `SubmitReviewRequest`, `SubmitReviewResponse`, and optional safe `ReviewPhotoAttachmentDto`.
  - [x] 2.2 Add a centralized query key such as `queryKeys.reviews.byVenue(venueId)` in `nextjs-app/lib/query-keys.ts`; update `nextjs-app/test/unit/query-keys.test.ts`.
  - [x] 2.3 Add a server-only review persistence adapter under `nextjs-app/lib/services/`, defaulting to deterministic fixture/memory-backed local data and optional Supabase persistence only behind an explicit environment opt-in.
  - [x] 2.4 If Supabase review persistence is added, create a manual contract artifact such as `_bmad-output/implementation-artifacts/3-3-reviews-contract.sql`; do not run live SQL or assume the production table/storage bucket exists.
  - [x] 2.5 Keep review submissions anonymous for MVP. Do not collect name, email, account ID, precise user coordinates, raw IP, or other PII. Seeded fixture reviews may use generic display names only if needed for the visual reference.
  - [x] 2.6 Validate review text server-side: trimmed non-empty text, maximum length, safe line breaks, and no unsafe control characters. Validate optional rating as a bounded 1-5 integer or omit it.
  - [x] 2.7 Treat photo support as an attachment to the pending review: use a native file picker and server-side metadata validation, but do not add Supabase Storage/binary persistence unless an explicit reviewed storage contract is included.

- [x] **Task 3: Add `/api/reviews` GET and POST route** (AC: #1, #5, #7)
  - [x] 3.1 Add `nextjs-app/app/api/reviews/route.ts` with `GET /api/reviews?venueId=[id]`. Resolve `venueId` against existing fixture identifiers (`id`, `venueId`, `slug`, `venueSlug`) so the seeded `test-venue-sunny` visual route works.
  - [x] 3.2 Return reviews ordered newest-first or in a documented deterministic order, with review text, optional rating, optional safe photo metadata, createdAt, and relative-time inputs. Include a summary object with `averageRating` and `reviewCount`.
  - [x] 3.3 Add `POST /api/reviews` with structured validation. It must reject unknown venues, mismatched venue identifiers, malformed text/rating/photo metadata, oversized payloads, unsafe control characters, and invalid content types with stable 4xx responses.
  - [x] 3.4 Keep `POST` retry semantics user-triggered only. Do not auto-submit duplicate reviews in the route or mutation hook.
  - [x] 3.5 Add public API rate-limit protection consistent with existing unauthenticated route patterns where practical. Do not add admin review queues, moderation dashboards, analytics streams, or review approval tooling.
  - [x] 3.6 Ensure local visual/E2E tests can intercept or use fixture-backed review responses without Supabase credentials.

- [x] **Task 4: Add TanStack review hooks** (AC: #1, #5)
  - [x] 4.1 Add `nextjs-app/hooks/queries/useVenueReviews.ts` to fetch `/api/reviews?venueId=${identifier}` using `queryKeys.reviews.byVenue(identifier)`.
  - [x] 4.2 Add `nextjs-app/hooks/mutations/useSubmitReview.ts` to POST to `/api/reviews`. Keep `retry: false` or strictly user-triggered.
  - [x] 4.3 On successful submit, update or invalidate only the relevant review query key through the central key factory. Do not invalidate venue list/detail queries unless Task 7 wires review summary fields into those DTOs.
  - [x] 4.4 Surface stable pending/success/error states for UI tests; do not hide failed submissions behind toasts or route changes.

- [x] **Task 5: Build composed review UI primitives** (AC: #1, #2, #3, #4, #5, #6, #7, #8)
  - [x] 5.1 Add `nextjs-app/components/composed/feedback/ReviewCard.tsx` or another composed-layer review path that displays review text, optional rating stars, and relative timestamp. Keep it independent of venue-detail orchestration.
  - [x] 5.2 Add `nextjs-app/components/composed/feedback/ReviewForm.tsx` with venue name header, "Plats inom SunnySeat" subtitle, `text-heading-lg` heading, token-backed textarea, optional rating control, native photo-picker trigger with camera icon, `AmberCTAButton`, "Stäng" action, inline success, inline error, and retry.
  - [x] 5.3 Reuse `nextjs-app/components/composed/shared/AmberCTAButton.tsx`. Preserve `gradient-cta-amber`, `shadow-cta`, `rounded-pill`, 44x44 px minimum target, visible focus ring, disabled 40% opacity, loading spinner, and reduced-motion behaviour.
  - [x] 5.4 Use lucide icons for camera, send/spinner, and rating stars. Do not draw custom SVGs or rely on color alone for rating/selection state.
  - [x] 5.5 The textarea is the required field. Optional rating must not block submit when text is present, despite the prototype's required-rating modal.
  - [x] 5.6 Use Motion 12 (`motion/react`) for open/close and submit-to-confirmation only where useful; `prefers-reduced-motion` must make state changes instant.
  - [x] 5.7 Keep Swedish copy in `nextjs-app/messages/sv/feedback.json` and matching English fallback in `nextjs-app/messages/en/feedback.json`, unless a smaller existing namespace is clearly more appropriate. Do not hardcode English UI copy.

- [x] **Task 6: Orchestrate reviews inside venue detail** (AC: #1, #2, #5, #6, #8)
  - [x] 6.1 Add a custom review flow component, for example `nextjs-app/components/custom/feedback/ReviewFlow.tsx`, to own review query loading/error states, form open/close, submission, query refresh, and forced-state behaviour.
  - [x] 6.2 Integrate reviews into `VenueDetailContent` through a dedicated slot or explicit section below the main venue information and route CTA. Preserve the existing `feedbackSlot` contract and do not move the feedback prompt unless necessary for the review visual gate.
  - [x] 6.3 Render a "Lämna ett omdöme" CTA using AmberCTAButton styling. Opening and closing the form must preserve the venue detail scroll position and selected venue state.
  - [x] 6.4 Add support for `_state=review` from `project-context.md` so `/?venue=test-venue-sunny&_state=review` reliably renders the review form for visual validation.
  - [x] 6.5 Keep review submission intentional. Do not show the review form automatically after feedback, after routing, or after likely-visited eligibility.
  - [x] 6.6 Handle empty review lists with localized Swedish/English copy and no blank panel. Loading states should use shadcn `Skeleton`, not full-page spinners.
  - [x] 6.7 Desktop venue-detail should remain coherent inside the 390 px overlay even though `project-context.md` maps the standalone `review` visual ID only for mobile.

- [x] **Task 7: Close ratings/review-count/price metadata debt** (AC: #1, Design Gate)
  - [x] 7.1 Audit `nextjs-app/lib/utils/venue-visual-metadata.ts`, `VenueCard`, `VenueList`, `VenueDetailContent`, and existing list/detail tests for hardcoded `rating`, `reviewCount`, and `price` metadata.
  - [x] 7.2 Implement the story decision: review counts and average ratings shown in venue detail must be backed by the reviews contract for the selected venue. List-card ratings may either be backed by a review summary field on `/api/venues` or explicitly retained as fixture venue metadata with rationale in completion notes.
  - [x] 7.3 If review summaries are added to venue list/detail DTOs, compute them server-side or from fixture/persistence helpers; do not issue a client-side `GET /api/reviews` for every venue card.
  - [x] 7.4 Price remains venue metadata, not review data, unless Rasmus explicitly changes the product contract. If price display is retained, document its source and keep Swedish/English visual labels aligned.
  - [x] 7.5 Run visual validation for `map-panel-venues` mobile if list-card rating output changes. Run `venue-detail` mobile and desktop validation if header rating/review-count output changes.
  - [x] 7.6 If ratings are intentionally removed or a reference PNG/capture recipe changes, update `nextjs-app/docs/design/references/REBASELINE-LOG.md` in the same operation with explicit rationale.

- [x] **Task 8: Focused regression coverage** (AC: all)
  - [x] 8.1 Add API route tests for `GET /api/reviews` success/unknown venue/validation, `POST /api/reviews` success, text validation, optional rating, optional photo metadata, stable error shapes, and no admin/moderation side effects.
  - [x] 8.2 Add persistence adapter tests for fixture/memory behaviour and explicit Supabase opt-in failure with incomplete config if Supabase support is included.
  - [x] 8.3 Add hook tests for `useVenueReviews` and `useSubmitReview`: query key usage, successful fetch, failed fetch, successful submit invalidation/update, and no automatic duplicate retry.
  - [x] 8.4 Add `ReviewCard` component tests for text, optional rating, relative timestamp, no-rating state, accessibility, focus, and token classes.
  - [x] 8.5 Add `ReviewForm` tests for disabled/enabled submit, textarea focus border, loading disabled inputs, optional rating, optional photo attachment, success confirmation, failure retry, close action, reduced motion, keyboard access, and 44x44 touch targets.
  - [x] 8.6 Update `VenueDetailContent`, `VenueDetailOverlay`, `MapView`, and forced-detail tests so reviews render inside detail without breaking route buttons, open-maps links, favourites, feedback prompt, uncertainty copy, selected-pin state, or scroll/dismiss behaviour.
  - [x] 8.7 Add or update Playwright coverage for mobile `_state=review`. Intercept `GET /api/reviews` and `POST /api/reviews`; do not depend on live Supabase or real camera access.

- [x] **Task 9: Final verification and review gate** (AC: all)
  - [x] 9.1 Run `cd nextjs-app && npx.cmd tsc --noEmit`.
  - [x] 9.2 Run `cd nextjs-app && npx.cmd eslint . --quiet`.
  - [x] 9.3 Run `cd nextjs-app && npx.cmd vitest run`.
  - [x] 9.4 Run `cd nextjs-app && npx.cmd playwright test` if review E2E coverage is added; otherwise document why component/API tests provide the required coverage.
  - [x] 9.5 Run visual validation for `review` mobile: `.\scripts\run-sh.ps1 scripts/visual-validate.sh review "/?venue=test-venue-sunny&_state=review" mobile`.
  - [x] 9.6 Run parent detail validation after integration: `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=14:00" mobile` and `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=16:30" desktop`.
  - [x] 9.7 Run `map-panel-venues` mobile validation if list rating output changes: `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues&_time=14:00" mobile`.
  - [x] 9.8 Run the API-boundary scan: `rg -n "lib/(solar|weather|supabase|middleware|buildings)" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib`.
  - [x] 9.9 Run the MVP monetization quarantine scan: `rg -n "PremiumContext|usePremiumStatus|queryKeys\.premium|/api/payments|Swish|swish|paywall|premium gate|lock badge|Season Pass|Säsongskortet" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib nextjs-app/messages`.
  - [x] 9.10 Before changing sprint status to `review`, run `.\scripts\run-sh.ps1 scripts/story-review.sh 3-3-venue-reviews`.

### Review Findings

- [x] [Review][Patch] GET `/api/reviews` uses public caching, so a post-submit refetch can overwrite the freshly submitted review with stale cached data [nextjs-app/app/api/reviews/route.ts:98]
- [x] [Review][Patch] Supabase review persistence is insert-only; GET/detail summaries still read only fixture and memory reviews when the opt-in provider is enabled [nextjs-app/lib/services/venue-reviews-persistence.ts:111]
- [x] [Review][Patch] Venue-detail header rating/review-count cache is not updated or invalidated after a successful review submit [nextjs-app/hooks/mutations/useSubmitReview.ts:33]
- [x] [Review][Patch] Review success confirmation stays visible until manual close instead of fading after the UX-specified 3 seconds [nextjs-app/components/custom/feedback/ReviewFlow.tsx:164]
- [x] [Review][Patch] Review textarea is fixed with `resize-none` and does not expand to accommodate input as specified [nextjs-app/components/composed/feedback/ReviewForm.tsx:126]
- [x] [Review][Patch] Review form omits the UX-specified experience prompt and the Swedish optional-photo wording [nextjs-app/components/composed/feedback/ReviewForm.tsx:112]
- [x] [Review][Patch] Invalid or oversized selected photo metadata can make an otherwise valid text review fail instead of treating the photo as optional [nextjs-app/components/composed/feedback/ReviewForm.tsx:171]
- [x] [Review][Patch] Mobile and desktop detail overlays can mount duplicate `ReviewFlow` instances with duplicate review heading IDs/test IDs for the same venue [nextjs-app/components/custom/map/MapView.tsx:388]
- [x] [Review][Patch] Review summary copy is not plural-aware and renders incorrect singular text such as `1 omdömen` / `1 reviews` [nextjs-app/messages/sv/feedback.json:20]
- [x] [Review][Patch] Long review text and selected-photo filenames lack wrapping safeguards and can overflow the narrow venue panel [nextjs-app/components/composed/feedback/ReviewCard.tsx:62]
- [x] [Review][Patch] Oversized POST bodies without `Content-Length` are fully buffered before the API rejects them [nextjs-app/app/api/reviews/route.ts:124]
- [x] [Review][Patch] POST rejects slug-like values in `venueId` even though the route resolves the primary identifier against slug/id aliases [nextjs-app/app/api/reviews/route.ts:153]
- [x] [Review][Patch] Venue detail now fails when review-summary persistence is unavailable [nextjs-app/app/api/venues/[slug]/route.ts:151]
- [x] [Review][Patch] Review POST can persist a review and still return failure if the follow-up summary read fails [nextjs-app/app/api/reviews/route.ts:172]
- [x] [Review][Patch] GET `/api/reviews` reads persistence twice and can return inconsistent reviews versus summary [nextjs-app/app/api/reviews/route.ts:90]
- [x] [Review][Patch] Supabase review persistence still mixes seeded fixture reviews into persisted review results [nextjs-app/lib/services/venue-reviews-persistence.ts:128]
- [x] [Review][Patch] Venue-detail average rating can fall back to fixture metadata while review count comes from the review contract [nextjs-app/lib/utils/venue-visual-metadata.ts:196]
- [x] [Review][Patch] Supabase nullable rating/photo columns can leak `null` into optional review DTO fields [nextjs-app/lib/services/venue-reviews-persistence.ts:261]
- [x] [Review][Patch] Native photo input is visually hidden but still keyboard-focusable without its own label or focus indicator [nextjs-app/components/composed/feedback/ReviewForm.tsx:179]
- [x] [Review][Patch] Story 3.3 deletes the repo-level Claude compatibility shim out of scope while AGENTS.md still references it [CLAUDE.md:1]

## Dev Notes

### Current Implementation State

- No review API route, review query hook, review mutation hook, review types, `ReviewCard`, `ReviewForm`, or custom review flow exists yet.
- `project-context.md` already maps `review` to `/?venue=test-venue-sunny&_state=review` for mobile visual validation. The seeded venue slug is `test-venue-sunny`.
- Story 3.2 added `FeedbackFlow`, `FeedbackPrompt`, `useSubmitFeedback`, server-only feedback persistence, `AmberCTAButton`, and a `feedbackSlot` passed into `VenueDetailContent` from `MapView`.
- `VenueDetailContent` currently renders star rating/review count and desktop price through `getVenueVisualMetadata()`, not live reviews. This story must explicitly resolve the review-summary source.
- `VenueCard`/`VenueList` currently show fixture visual rating metadata. Do not fetch per-card reviews from the client to fix this; use a summary field or keep it clearly documented as venue metadata.
- `nextjs-app/test/components/VenueDetailContent.test.tsx` still has a test asserting no future feedback or review flows when no slot is provided. Preserve that invariant for bare composed content while adding explicit review slots/props.
- The app currently keeps data access through API routes and hooks. Client components must not import server persistence, fixtures, Supabase service-role helpers, or backend engine modules.

### Architecture Guardrails

- Add reviews under `nextjs-app/app/api/reviews/route.ts`, matching the architecture's GET/POST review route. Do not place review POST under `/api/venues/[slug]/feedback`.
- Data access flows through `hooks/queries/useVenueReviews.ts` and `hooks/mutations/useSubmitReview.ts`. Components should not call `fetch` directly except inside those hooks.
- Query keys must come from `nextjs-app/lib/query-keys.ts`; do not construct keys inline.
- Component direction remains `components/custom/ -> components/composed/ -> components/ui/`. A custom `ReviewFlow` may consume composed `ReviewCard`/`ReviewForm`; composed components must not import custom components.
- Keep MapLibre dynamically loaded and mounted. Review UI is venue-detail chrome and must not remount `MapContainer`, `VenuePinLayer`, or selected-venue state.
- Public review copy must avoid geodata/source internals. Do not expose EPSG, Baskarta, DTM, SQL/RPC names, import batches, or confidence internals.
- MVP runtime must remain free of premium, payment, Swish, Season Pass, paywall, lock badge, and future-monetization dependencies.

### UX And Design Notes

- `nextjs-app/docs/design/DESIGN.md` relevant tokens: `gradient-cta-amber`, `shadow-cta`, `radius-pill`, `radius-card`, `color-surface-muted`, `color-amber-dark`, `color-amber-cta-text`, `text-heading-lg`, `duration-fast`, `duration-default`, `duration-slow`, `ease-default`, and `ease-exit`.
- UX spec `Screen: review` requires the review form inline within venue detail, with venue header, "Plats inom SunnySeat", "Skriv ett omdöme", textarea, optional photo link, `Skicka`, and `Stäng`.
- Textarea focus border transition is 150 ms. Submit-to-success should behave like the feedback pattern: form crossfade to inline confirmation when motion is allowed and instant state changes when `prefers-reduced-motion` is enabled.
- Success copy is "Tack för ditt omdöme." Failure copy is "Kunde inte skicka. Försök igen." Keep Swedish punctuation and casing exact.
- Native photo picker should use a real file input (`accept="image/*"`) reachable from the "Lägg till foto" control. Do not fake native camera behaviour in tests; test the file input/attachment state.
- `review` has only a mobile standalone visual reference. Desktop review integration is validated through `venue-detail` desktop and component tests.

### Previous Story Intelligence

- Story 3.0 removed admin runtime scope. Reviews are public consumer content, not an admin candidate queue or moderation dashboard.
- Story 3.1 introduced shared route helpers and route overlay. Review integration must preserve route CTA/open-map behaviour and selected venue state.
- Story 3.2 established the pattern for an unauthenticated write route, mutation hook, server-only persistence adapter, inline venue-detail flow, forced visual state, shared Amber CTA, and parent visual validation artifacts.
- Story 3.2 review rounds found multiple state/persistence edge cases. Apply those lessons here: no stale payload retry, no forced-state suppression, no hidden sibling duplicate state, no placeholder detail submission, and explicit opt-in failure if a persistence provider is configured but incomplete.
- Story 3.0.6 added safe uncertainty copy. Do not let review copy leak geodata/source details or undermine confidence semantics.

### Expected File Impact

Expected files created:

- `nextjs-app/app/api/reviews/route.ts`
- `nextjs-app/hooks/queries/useVenueReviews.ts`
- `nextjs-app/hooks/mutations/useSubmitReview.ts`
- `nextjs-app/components/composed/feedback/ReviewCard.tsx`
- `nextjs-app/components/composed/feedback/ReviewForm.tsx`
- `nextjs-app/components/custom/feedback/ReviewFlow.tsx`
- `nextjs-app/lib/services/venue-reviews-persistence.ts`
- `nextjs-app/test/unit/api/reviews-route.test.ts`
- `nextjs-app/test/unit/queries/useVenueReviews.test.tsx`
- `nextjs-app/test/unit/mutations/useSubmitReview.test.tsx`
- `nextjs-app/test/unit/services/venue-reviews-persistence.test.ts`
- `nextjs-app/test/components/ReviewCard.test.tsx`
- `nextjs-app/test/components/ReviewForm.test.tsx`
- `nextjs-app/test/components/ReviewFlow.test.tsx`
- `nextjs-app/test/e2e/review.spec.ts` if Playwright coverage is added
- `_bmad-output/implementation-artifacts/3-3-reviews-contract.sql` only if Supabase review persistence/storage contract is specified

Expected files modified:

- `nextjs-app/lib/types/api.ts`
- `nextjs-app/lib/query-keys.ts`
- `nextjs-app/messages/sv/feedback.json`
- `nextjs-app/messages/en/feedback.json`
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
- `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/lib/utils/venue-visual-metadata.ts`
- `nextjs-app/components/composed/venue/VenueCard.tsx` and/or `nextjs-app/components/custom/venue/VenueList.tsx` if list rating source changes
- `nextjs-app/test/unit/query-keys.test.ts`
- `nextjs-app/test/components/VenueDetailContent.test.tsx`
- `nextjs-app/test/components/VenueDetailOverlay.test.tsx`
- `nextjs-app/test/components/MapView.test.tsx`

Possible files modified:

- `nextjs-app/app/api/venues/route.ts` and `nextjs-app/app/api/venues/[slug]/route.ts` if review summaries are added to venue DTOs.
- `nextjs-app/lib/services/venues-fixture.ts` if seeded review summaries need fixture-level alignment.
- `nextjs-app/docs/design/references/REBASELINE-LOG.md` only if a reference PNG or capture recipe changes.
- `nextjs-app/scripts/capture-claude-design-refs.mjs` only if the `review` capture recipe needs a selector/wait update.

Files intentionally not created:

- No admin/review-moderation route or page.
- No user account/auth provider.
- No payment, premium, Swish, Season Pass, paywall, or lock-badge runtime path.
- No geodata/import/confidence recalibration script.
- No broad design-system abstraction beyond the existing shared Amber CTA.

### References

- `AGENTS.md` - repo commands, design-token rules, API boundary, Swedish copy, accessibility, visual validation, and sprint workflow.
- `project-context.md` - current project state, Screen ID -> Route Map, design-source discipline, seeded `test-venue-sunny`, and Epic 3 status.
- `_bmad-output/planning-artifacts/epics.md` - Story 3.3 source of truth for story statement, ACs, design gate, and deferred visual/data carry-ins.
- `_bmad-output/planning-artifacts/prd.md` - FR19/FR20 review requirements and Erik journey.
- `_bmad-output/planning-artifacts/architecture.md` - `/api/reviews` route, review components/hooks mapping, query-key rule, i18n namespaces, API boundary, component layers, NFRs.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Journey 2, intentional review pattern, venue-detail scroll reveal, `Screen: review`, and feedback/confirmation timing.
- `nextjs-app/docs/design/DESIGN.md` - binding review-form, Amber CTA, typography, motion, radius, surface, and accessibility tokens.
- `nextjs-app/docs/design/references/claude-design/README.md` - visual source-of-truth reading discipline.
- `nextjs-app/docs/design/references/claude-design/STATE-MAPPING.md` - `review` mobile recipe and active MVP prototype scope.
- `nextjs-app/docs/design/references/claude-design/project/src/Flows.jsx` and `project/src/VenueDetail.jsx` - active prototype review/venue-detail visual references to translate, not copy.
- `_bmad-output/implementation-artifacts/3-2-sun-accuracy-feedback.md` - prior story implementation patterns, review findings, and feedback completion handoff.
- `_bmad-output/implementation-artifacts/deferred-work.md` - ratings/review-count/price metadata carry-in removed when this story was drafted.

### Draft Verification

- Draft baseline passed before writing this story:
  - `cd nextjs-app && npx.cmd tsc --noEmit`
  - `cd nextjs-app && npx.cmd eslint . --quiet`
- Story-file-audit completed with all seven checks passing.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Baseline before implementation: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Baseline before implementation: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Baseline confidence check: `cd nextjs-app && npx.cmd vitest run` passed before Story 3.3 implementation edits.
- Source context read: repo rules, project context, Story 3.3, PRD, architecture, epics, UX spec, design tokens, active visual bundle mapping, and prototype review/detail sources.
- Focused review suite passed: `cd nextjs-app && npx.cmd vitest run test/unit/api/reviews-route.test.ts test/unit/services/venue-reviews-persistence.test.ts test/unit/query-keys.test.ts test/unit/queries/useVenueReviews.test.tsx test/unit/mutations/useSubmitReview.test.tsx test/components/ReviewCard.test.tsx test/components/ReviewForm.test.tsx test/components/ReviewFlow.test.tsx test/components/VenueDetailContent.test.tsx`.
- Final typecheck passed: `cd nextjs-app && npx.cmd tsc --noEmit`.
- Final lint passed: `cd nextjs-app && npx.cmd eslint . --quiet`.
- Final full Vitest passed after review fixes: `cd nextjs-app && npx.cmd vitest run` (62 files / 490 tests).
- Full Playwright passed after review fixes: `cd nextjs-app && npx.cmd playwright test` (49 passed / 30 skipped).
- Parent detail visual validation passed for mobile: `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=14:00" mobile`.
- Parent detail visual validation passed for desktop: `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=16:30" desktop`.
- Standalone review visual validation initially failed twice: `.\scripts\run-sh.ps1 scripts/visual-validate.sh review "/?venue=test-venue-sunny&_state=review" mobile`. The evaluator expected the out-of-scope prototype modal (`Recensera platsen`, required stars/tags, `Publicera`) and captured an early loading/background state.
- Rebaselined `review` mobile to the active inline Story 3.3 route after Rasmus approved removing old/legacy prototype references. Updated `capture-claude-design-refs.mjs`, `STATE-MAPPING.md`, `.claude/scripts/visual-validate.sh`, `mobile/review.png`, and `REBASELINE-LOG.md`.
- Standalone review visual validation passed after rebaseline: `.\scripts\run-sh.ps1 scripts/visual-validate.sh review "/?venue=test-venue-sunny&_state=review" mobile`.
- Canonical story-review gate passed and moved Story 3.3 to review: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-3-venue-reviews`. Validation artifact: `_bmad-output/implementation-artifacts/validation/3-3-venue-reviews-review-20260609-174438.log`.
- API-boundary scan run. Matches were confined to existing server/lib references plus the new server-only review persistence Supabase opt-in import; no client review UI imported backend engine modules.
- MVP monetization quarantine scan run and returned no matches.
- Review finding regression suite passed after fixes: `cd nextjs-app && npx.cmd vitest run test/components/MapView.test.tsx test/components/ReviewFlow.test.tsx test/unit/api/reviews-route.test.ts test/unit/services/venue-reviews-persistence.test.ts test/unit/mutations/useSubmitReview.test.tsx test/components/ReviewForm.test.tsx test/components/ReviewCard.test.tsx` (7 files / 86 tests).
- Post-review-fix typecheck passed: `cd nextjs-app && npx.cmd tsc --noEmit`.
- Post-review-fix lint passed: `cd nextjs-app && npx.cmd eslint . --quiet`.
- Review visual validation passed after unique form IDs and wait-selector update: `.\scripts\run-sh.ps1 scripts/visual-validate.sh review "/?venue=test-venue-sunny&_state=review" mobile`.
- Parent detail visual validation passed after review fixes for mobile and desktop: `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=14:00" mobile` and `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=16:30" desktop`.
- Post-review-fix API-boundary scan run. Matches were confined to existing server/lib references plus server-only persistence imports; no client review UI imported backend engine modules.
- Post-review-fix MVP monetization quarantine scan returned no matches.
- Final canonical story-review gate passed and moved Story 3.3 to review: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-3-venue-reviews`. Validation artifact: `_bmad-output/implementation-artifacts/validation/3-3-venue-reviews-review-20260610-104837.log`.
- Round 2 focused review-fix suite passed: `cd nextjs-app && npx.cmd vitest run test/unit/api/reviews-route.test.ts test/unit/api/venue-detail-route.test.ts test/unit/services/venue-reviews-persistence.test.ts test/components/VenueDetailContent.test.tsx test/components/ReviewForm.test.tsx` (5 files / 49 tests).
- Round 2 post-fix typecheck passed: `cd nextjs-app && npx.cmd tsc --noEmit`.
- Round 2 post-fix lint passed: `cd nextjs-app && npx.cmd eslint . --quiet`.
- Round 2 focused review Playwright spec passed: `cd nextjs-app && npx.cmd playwright test test/e2e/review.spec.ts` (2 passed).
- Round 2 API-boundary scan run. Matches were confined to existing server/lib references plus server-only feedback/review persistence imports; no client review UI imported backend engine modules.
- Round 2 MVP monetization quarantine scan returned no matches.
- Round 2 canonical story-review gate passed: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-3-venue-reviews` (lint, typecheck, Vitest 62 files / 494 tests, map-panel-venues mobile visual, review mobile visual, venue-detail mobile/desktop visuals). Validation artifact: `_bmad-output/implementation-artifacts/validation/3-3-venue-reviews-review-20260610-155756.log`.
- Human approval received from Rasmus on 2026-06-10; Story 3.3 moved to done.

### Completion Notes List

- Task 1 complete. Story 3.2 remains marked done; existing feedback API, likely-visited eligibility, and duplicate suppression are treated as out of scope for Story 3.3 changes.
- The active prototype review modal conflicts with Story 3.3 UX/ACs on modal structure and required rating; implementation follows the story/UX inline form while translating the visual outcome.
- Added fixture/memory-backed anonymous reviews with optional Supabase insert behind `SUNNYSEAT_REVIEW_PERSISTENCE=supabase`; included a manual SQL contract artifact and did not execute live SQL or add binary photo storage.
- Added `/api/reviews` GET/POST with fixture identifier resolution, stable validation errors, content-type/size checks, safe text normalization, optional rating/photo metadata validation, and hashed-header rate limiting without storing raw IP values.
- Added `useVenueReviews` and `useSubmitReview` with central review query keys, `retry: false` submit semantics, and scoped review-cache updates only.
- Added composed `ReviewCard`/`ReviewForm` and custom `ReviewFlow`; the form is inline, user-initiated, Swedish-first, textarea-required, optional-rating/photo, and uses the shared Amber CTA and Motion reduced-motion handling.
- Integrated reviews into venue detail through a dedicated `reviewSlot` below the route CTA while preserving the existing `feedbackSlot` placement and behavior.
- Detail header average rating/review count is now backed by `reviewSummary` from the review persistence helper on the venue detail API. List-card ratings are intentionally retained as existing fixture visual metadata to avoid client-side per-card review fan-out; price remains venue visual metadata, not review data.
- `_state=review` opens the inline form and scrolls the review section into view for forced-state browser/E2E paths. The stale prototype modal reference is no longer used for active Story 3.3 validation.
- Resolved 12 review findings: review GET is `no-store`; Supabase opt-in reads now feed review GET/detail summaries; submit updates cached venue-detail summaries; success confirmation auto-dismisses after 3 seconds; textarea can grow; form copy matches the UX prompt and optional-photo wording; invalid local photos are ignored as optional; mobile/desktop review flows use unique instance IDs; summary copy is plural-aware; long review/filename text wraps; request bodies are size-limited while streaming; and slug-like `venueId` aliases are accepted.
- Resolved 8 Round 2 review findings: venue detail degrades when only review summaries are unavailable; review GET summarizes fetched data directly; review POST returns success after a persisted insert even if a summary refresh fails; Supabase opt-in no longer mixes fixture reviews; nullable Supabase optional columns are omitted from DTOs; null-average detail ratings no longer fall back to fixture ratings; the native photo input is removed from keyboard focus; and the repo-level Claude compatibility shim is restored.

### File List

- `_bmad-output/implementation-artifacts/3-3-venue-reviews.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/3-3-reviews-contract.sql`
- `_bmad-output/implementation-artifacts/stale-reference-audit-2026-06-09.md`
- `_bmad-output/implementation-artifacts/validation/3-3-venue-reviews-review-20260609-174438.log`
- `_bmad-output/implementation-artifacts/validation/3-3-venue-reviews-review-20260610-104837.log`
- `_bmad-output/implementation-artifacts/validation/3-3-venue-reviews-review-20260610-155756.log`
- `.claude/scripts/visual-validate.sh`
- `CLAUDE.md`
- `nextjs-app/app/api/reviews/route.ts`
- `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/components/composed/feedback/ReviewCard.tsx`
- `nextjs-app/components/composed/feedback/ReviewForm.tsx`
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
- `nextjs-app/components/custom/feedback/ReviewFlow.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx`
- `nextjs-app/components/custom/venue/forced-venue-detail.ts`
- `nextjs-app/docs/design/references/REBASELINE-LOG.md`
- `nextjs-app/docs/design/references/claude-design/STATE-MAPPING.md`
- `nextjs-app/docs/design/references/screens/mobile/review.png`
- `nextjs-app/hooks/mutations/useSubmitReview.ts`
- `nextjs-app/hooks/queries/useVenueReviews.ts`
- `nextjs-app/lib/query-keys.ts`
- `nextjs-app/lib/services/venue-reviews-persistence.ts`
- `nextjs-app/lib/types/api.ts`
- `nextjs-app/lib/utils/venue-visual-metadata.ts`
- `nextjs-app/messages/en/feedback.json`
- `nextjs-app/messages/sv/feedback.json`
- `nextjs-app/scripts/capture-claude-design-refs.mjs`
- `nextjs-app/test/components/MapView.test.tsx`
- `nextjs-app/test/components/ReviewCard.test.tsx`
- `nextjs-app/test/components/ReviewFlow.test.tsx`
- `nextjs-app/test/components/ReviewForm.test.tsx`
- `nextjs-app/test/components/VenueDetailContent.test.tsx`
- `nextjs-app/test/e2e/review.spec.ts`
- `nextjs-app/test/unit/api/reviews-route.test.ts`
- `nextjs-app/test/unit/api/venue-detail-route.test.ts`
- `nextjs-app/test/unit/mutations/useSubmitReview.test.tsx`
- `nextjs-app/test/unit/queries/useVenueReviews.test.tsx`
- `nextjs-app/test/unit/query-keys.test.ts`
- `nextjs-app/test/unit/services/venue-reviews-persistence.test.ts`

## Change Log

| Date | Author | Note |
|------|--------|------|
| 2026-06-10 | Codex | Moved Story 3.3 to done after Rasmus approval. |
| 2026-06-10 | Codex | Addressed Round 2 code-review findings for review-summary resilience, Supabase-only review reads/null normalization, detail rating fallback, photo input accessibility, and restored the Claude compatibility shim; reran focused and canonical gates. |
| 2026-06-10 | Codex | Addressed 12 review findings with regression coverage for review caching, Supabase read summaries, detail cache updates, review confirmation timing, textarea/copy/photo behavior, unique overlay IDs, plural copy, wrapping, streamed size limits, and slug alias validation. |
| 2026-06-09 | Codex | Rebaselined active `review` mobile visual reference from the inline Story 3.3 implementation, skipped the obsolete prototype review modal recipe, updated visual waits/mapping docs, and passed standalone review visual validation. |
| 2026-06-08 | Codex | Implemented anonymous venue reviews API, hooks, inline review UI, venue-detail integration, review-backed detail summary metadata, regression coverage, and final verification up to the blocked standalone review visual gate. |
| 2026-06-08 | Codex | Started implementation, moved Story 3.3 to in-progress, and completed baseline/source-context checks. |
| 2026-06-08 | Bob | Drafted Story 3.3 ready-for-dev brief from current epics, Story 3.2 completion context, review API/UI architecture, UX/design references, installed package versions, and deferred ratings/review metadata carry-in. |
| 2026-06-08 | Bob | Story-file-audit completed with all seven checks passing; Story 3.3 sprint status moved from backlog to ready-for-dev. |
