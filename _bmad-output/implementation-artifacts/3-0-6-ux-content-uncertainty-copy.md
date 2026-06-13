---
baseline_commit: 07d52ba
drafted_at: 2026-06-07T11:43:28+02:00
---

# Story 3.0.6: UX Content for Sun Prediction Uncertainty

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Sequencing:** This is the final Epic 3 Prelude story before Story 3.1 can resume. Stories 3.0 through 3.0.5 and Story 3.0.7 are done. Story 3.1 is already `ready-for-dev` but remains paused until this story is implemented, reviewed, and approved.
>
> **Scope boundary:** This story adds user-facing, Swedish-first uncertainty copy and the safe public metadata needed to choose that copy. Do not recalibrate confidence math, rework geodata imports, edit shadow-caster SQL, activate new non-building caster classes, add routing, add feedback/reviews, add admin surfaces, add premium/payment branches, or create a new About page route unless a live About surface already exists in the app.
>
> **User-copy boundary:** Normal user copy may say SunnySeat models sun position, building shadows, and weather, and that trees, awnings, umbrellas, bridges, temporary structures, seasonal furniture, and local conditions can affect the result. It must not expose CRS, EPSG:3007, Baskarta, DTM, `byggnad_l`, import batches, source layers, source geometry, quality-score internals, RPC names, or database terms.

## Story

As a **user**,
I want concise Swedish copy that explains prediction uncertainty,
So that I understand confidence without needing geodata details.

## Acceptance Criteria

**Given** SunnySeat models building shadows but not every obstruction
**When** confidence help text, about-page copy, venue detail microcopy, or uncertainty labels are shown
**Then** Swedish copy clearly communicates that building shadows are modelled while trees, awnings, umbrellas, bridges, and temporary structures can affect real conditions.

**Given** a venue has low building-data confidence or known obstruction uncertainty
**When** the venue appears in the map/list/detail surfaces
**Then** the UI communicates uncertainty without implying the prediction is broken
**And** it avoids exposing implementation details such as CRS, Baskarta, DTM, or import batch IDs in normal user copy.

**Given** the app is Swedish-first
**When** copy is added
**Then** strings are added through scoped `next-intl` keys and English fallback copy is kept in sync.

**Design Gate Criteria:**
- **Visual:** Use existing confidence and about-page surfaces; no new standalone screen unless explicitly scoped.
- **Behaviour:** Copy must be accessible, concise, and not color-only.
- **Visual validation:** Required for any changed screen reference.

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx.cmd tsc --noEmit` before editing. Stop and surface any errors outside this story's scope.
  - [x] 1.2 Run `cd nextjs-app && npx.cmd eslint . --quiet` before editing. Stop and surface any errors outside this story's scope.
  - [x] 1.3 Read `AGENTS.md`, `project-context.md`, this story, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/prd.md`, `_bmad-output/planning-artifacts/architecture.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`, `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`, and `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md`.
  - [x] 1.4 Read `nextjs-app/docs/design/DESIGN.md`, `nextjs-app/docs/design/references/claude-design/README.md`, and the relevant MVP AboutModal sources before changing visible UI copy. Match visual outcome, not prototype implementation.
  - [x] 1.5 Read previous prelude stories 3.0.5 and 3.0.7. Story 3.0.5 owns conservative confidence semantics; Story 3.0.7 owns Baskarta XYZ/source-geometry realignment. This story only exposes safe user copy.
  - [x] 1.6 Confirm no deferred-work queue item targets Story 3.0.6. At draft time, `_bmad-output/implementation-artifacts/deferred-work.md` had no active `3.0.6` target.
  - [x] 1.7 Confirm sprint sequencing in `_bmad-output/implementation-artifacts/sprint-status.yaml`: `3-0-6-ux-content-uncertainty-copy` is the active ready-for-dev prelude story and Story 3.1 remains paused until this story is done.

- [x] **Task 2: Define the public, user-safe uncertainty contract** (AC: #2, #3)
  - [x] 2.1 Extend `nextjs-app/lib/types/api.ts` with a public DTO field for prediction uncertainty. Use user-safe enum values, not backend/geodata names. Suggested shape: `predictionUncertainty?: { level: 'low' | 'medium' | 'high'; reasons: PredictionUncertaintyReason[] }`.
  - [x] 2.2 Keep allowed reason values user-facing and stable, for example `building_shadow_coverage`, `vegetation`, `awning`, `umbrella`, `bridge`, `temporary_structure`, `seasonal_furniture`, `weather`, and `other`. Do not expose `qualityIssues`, `shadowDataCoverage`, `source_flags`, `source_layer`, `Baskarta`, `DTM`, CRS, import batch IDs, SQL/RPC names, or raw confidence-factor strings to client UI.
  - [x] 2.3 Populate the fixture-backed public routes deterministically: `nextjs-app/app/api/venues/route.ts`, `nextjs-app/app/api/venues/[slug]/route.ts`, and `nextjs-app/lib/services/venues-fixture.ts`. Choose at least one seeded venue for low building-shadow confidence and one for a known obstruction risk so list, QuickInfo, detail, and query tests can exercise the states.
  - [x] 2.4 Ensure `normalizeVenueForResponse()` preserves only sanitized uncertainty metadata. Invalid, duplicate, unknown, or empty reason values should be omitted or normalized to `other` without throwing a 500.
  - [x] 2.5 Keep TanStack query hooks unchanged unless the response type change requires test fixture updates. Data still flows only through `/api/venues*`, `hooks/queries/*`, and central `queryKeys`.
  - [x] 2.6 Do not import from `nextjs-app/lib/solar`, `lib/weather`, `lib/supabase`, `lib/middleware`, or `lib/buildings` in client components. Server routes may map safe metadata, but client UI must consume only the public DTO.

- [x] **Task 3: Add scoped Swedish and English copy** (AC: #1, #2, #3)
  - [x] 3.1 Add scoped `next-intl` keys under `nextjs-app/messages/sv/venue.json` and `nextjs-app/messages/en/venue.json` for uncertainty labels and helper text used by list cards, selected QuickInfo, and venue detail.
  - [x] 3.2 Add or update `nextjs-app/messages/sv/about.json` and `nextjs-app/messages/en/about.json` only as reusable About content keys. Do not create `/about`, an About modal, settings sheet, or navigation in this story if the app still has no live About surface.
  - [x] 3.3 Swedish copy must be concise, matter-of-fact, and trust-preserving. It should explain that the forecast models building shadows, sun position, and weather, while trees, awnings, umbrellas, bridges, and temporary structures can affect real conditions.
  - [x] 3.4 English fallback copy must keep the same meaning and key structure as Swedish. Do not leave English keys empty, stale, or meaningfully broader than the Swedish source.
  - [x] 3.5 Replace or quarantine any active user copy copied from the prototype that overpromises "högupplösta 3D-modeller", "imponerande precision", or "perfektion". The corrected MVP model is conservative central open-data building-shadow prediction, not a promise of perfect 3D coverage.
  - [x] 3.6 Keep confidence labels such as `Säkerhet` and existing exact/approximate/unavailable behavior unless the new copy requires an adjacent helper. Do not globally hide confidence or rename the confidence metric without explicit product approval.

- [x] **Task 4: Render uncertainty in existing venue surfaces** (AC: #1, #2, #3)
  - [x] 4.1 Add a small pure display helper under `nextjs-app/lib/utils/`, or extend `confidence-display.ts`, to map the public uncertainty DTO plus localized labels into visible text and accessible text. Keep this helper free of React and backend imports.
  - [x] 4.2 Update `nextjs-app/components/composed/venue/VenueCard.tsx` and `nextjs-app/components/custom/venue/VenueList.tsx` so list cards can show a concise uncertainty label when metadata is present. The label must be text, not color-only.
  - [x] 4.3 Update `nextjs-app/components/composed/venue/VenueQuickInfo.tsx` and the `MapView` label wiring so the selected map surface communicates uncertainty in QuickInfo and in accessible text. Do not clutter unselected pins with new visible chrome unless required by the visual reference.
  - [x] 4.4 Update `nextjs-app/components/composed/venue/VenueDetailContent.tsx` and `VenueDetailOverlay` label wiring so venue detail shows a short uncertainty note near the existing confidence/sun forecast context. Keep the detail card screenshot-friendly.
  - [x] 4.5 If `VenueCard` label props change, update all callers, including favourites and tests. Do not hardcode Swedish in component props or tests where `next-intl` messages are already available.
  - [x] 4.6 Preserve existing behavior for venues without uncertainty metadata: current confidence display, sun exposure percent, distance, favourites, planner/date, and detail UI should render unchanged.
  - [x] 4.7 Do not derive uncertainty from visual tags in `nextjs-app/lib/utils/venue-visual-metadata.ts`. Tags like `Parasoller` are current visual/reference metadata, not a durable uncertainty data source.

- [x] **Task 5: Accessibility, visual, and copy QA** (AC: #1, #2, #3)
  - [x] 5.1 Every new visible uncertainty label must have accessible text and must not rely on color alone. If an icon is added, use `lucide-react` and include text or an accessible name.
  - [x] 5.2 Interactive help affordances are optional. If added, they must be keyboard reachable, have a semantic role and accessible name, meet 44x44 px touch target minimum, work on touch devices, and not rely on hover-only tooltip behavior.
  - [x] 5.3 Use only design tokens from `nextjs-app/docs/design/DESIGN.md` and Tailwind v4 `@theme` utilities. Do not introduce raw hex values, arbitrary Tailwind colors, ad-hoc spacing, custom shadows, or copied prototype CSS.
  - [x] 5.4 Validate that added copy fits at mobile 390 px and desktop 1440 px without overlapping controls, truncating critical words, resizing fixed-format UI, or shifting map/list/detail layout unexpectedly.
  - [x] 5.5 Ensure `prefers-reduced-motion` remains respected. This story should not need new animation; if any subtle reveal is added, use existing motion tokens and motion-reduce behavior.
  - [x] 5.6 Preserve the UX spec's error/degradation tone: matter-of-fact Swedish, no exclamation marks, no apologies, no emoji.

- [x] **Task 6: Focused tests for contract, copy, and rendering** (AC: all)
  - [x] 6.1 Add or update API route tests under `nextjs-app/test/unit/api/` to prove list and detail responses include sanitized `predictionUncertainty` for seeded venues and omit invalid/internal metadata.
  - [x] 6.2 Add or update query hook tests only where typed fixtures need the new DTO field. Do not change query key construction.
  - [x] 6.3 Add or update pure utility tests for the uncertainty display helper. Cover low building-shadow confidence, obstruction risk, multiple reasons, unknown/empty reasons, Swedish labels, and English labels.
  - [x] 6.4 Add or update component tests for `VenueCard`, `VenueQuickInfo`, `VenueDetailContent`, and any changed parent wiring so uncertainty text appears when metadata is present and stays absent when metadata is missing.
  - [x] 6.5 Add tests proving sensitive source terms do not appear in normal rendered user copy. At minimum assert absence of `Baskarta`, `DTM`, `CRS`, `EPSG`, `import batch`, `source layer`, and `byggnad_l` in affected component output.
  - [x] 6.6 Preserve existing tests for confidence freshness: exact confidence, stale weather `~`, geometry-only hidden confidence, and unavailable confidence still behave as before unless explicitly updated by this story's ACs.

- [x] **Task 7: Final verification and review gate** (AC: all)
  - [x] 7.1 Run `cd nextjs-app && npx.cmd tsc --noEmit`.
  - [x] 7.2 Run `cd nextjs-app && npx.cmd eslint . --quiet`.
  - [x] 7.3 Run `cd nextjs-app && npx.cmd vitest run`.
  - [x] 7.4 Run focused Playwright tests only if interaction, routing, or keyboard behavior is added. If this remains copy/contract/component work only, document the skip rationale.
  - [x] 7.5 Run visual validation for every changed mapped screen. Expected likely screens: `map-panel-venues` mobile, `map-with-selected-venue` mobile, `venue-detail` mobile, and `venue-detail` desktop. Run `about` mobile/desktop only if a live About surface or `/about` route is touched.
  - [x] 7.6 If a reference PNG or capture recipe must change, update `nextjs-app/docs/design/references/REBASELINE-LOG.md` in the same operation with rationale. Do not rebaseline merely to hide implementation mistakes.
  - [x] 7.7 Run the MVP monetization quarantine scan before review: `rg -n "PremiumContext|usePremiumStatus|queryKeys\\.premium|/api/payments|Swish|swish|paywall|premium gate|lock badge|Season Pass|Säsongskortet" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib nextjs-app/messages`. Any active-runtime hit must be removed or documented as inactive/future-only.
  - [x] 7.8 Before changing sprint status to `review`, run `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-6-ux-content-uncertainty-copy`.

### Review Findings

**Round 1 of 3** (2026-06-07)

- [x] [Review][Patch] Full uncertainty explanation is defined but not rendered [`nextjs-app/lib/utils/prediction-uncertainty-display.ts:60`] — AC1 requires user-facing Swedish copy to communicate that SunnySeat models sun position, building shadows, and weather while trees, awnings, umbrellas, bridges, and temporary structures can affect real conditions. The complete `uncertainty.description` string exists in `messages/{sv,en}/venue.json`, but `getPredictionUncertaintyDisplay()` never reads `labels.description`; live list, QuickInfo, and detail surfaces render only the label plus short summary. Render the full model/obstruction explanation in an existing surface, or include it in the helper's accessible/detail text so it actually reaches users. **Fixed:** `descriptionText` now flows through the display helper, detail renders it visibly near the forecast, and accessible text includes the full description plus reason details.
- [x] [Review][Patch] Display helper can crash or emit undefined labels on malformed API metadata [`nextjs-app/lib/utils/prediction-uncertainty-display.ts:56`] — client query hooks cast JSON to DTO types without runtime validation, so stale cache or a future API regression such as `{ level: "medium" }` makes `normalizeReasons(predictionUncertainty.reasons)` iterate a non-array and crash. An invalid `level` also indexes `labels.levels` to `undefined`. Guard with `Array.isArray(predictionUncertainty.reasons)` and validate the level before formatting; return `null` for invalid metadata. **Fixed:** helper now rejects malformed reasons and invalid levels before formatting, with regression coverage.
- [x] [Review][Patch] Venue detail hides detailed uncertainty reasons behind `aria-label` only [`nextjs-app/components/composed/venue/VenueDetailContent.tsx:209`] — the detail note's visible DOM contains only `visibleLabel` and `visibleSummary`; the specific reasons are only in `aria-label` on a static `<p>`, which is not reliably exposed in screen-reader browse modes. Match the VenueCard/QuickInfo pattern by rendering the full accessible reason text in an `sr-only` span or otherwise keeping it in the element's text content. **Fixed:** detail note now keeps the specific reason text in the DOM via `sr-only` text instead of relying on a static `aria-label`.
- [x] [Review][Patch] API sensitive-term regression test misses underscore/hyphen source-layer leaks [`nextjs-app/test/unit/api/venues-route.test.ts:186`] — the API test checks for `"source layer"` with a space, but the malformed input under test is `"source_layer"`. A future regression that leaks the underscore form would pass. Reuse the regex-based sensitive-term helper or include `source_layer` / `source-layer` variants in the API serialization assertions. **Fixed:** list and detail API tests now reuse the regex-based sensitive-term helper that covers space, underscore, and hyphen variants.

## Dev Notes

### Current Implementation State

- The public venue routes are still fixture-backed: `nextjs-app/app/api/venues/route.ts` and `nextjs-app/app/api/venues/[slug]/route.ts` serve data from `nextjs-app/lib/services/venues-fixture.ts`.
- Public DTOs in `nextjs-app/lib/types/api.ts` currently expose `confidence`, `sunExposurePercent`, `sunWindow`, and freshness metadata. They do not yet expose safe building-data or obstruction uncertainty metadata to client UI.
- `nextjs-app/lib/utils/confidence-display.ts` handles only weather freshness/source behavior: exact confidence, stale-weather approximate confidence, and hidden confidence when geometry-only or missing metadata.
- Existing rendered confidence surfaces:
  - `nextjs-app/components/composed/venue/VenueCard.tsx`
  - `nextjs-app/components/custom/venue/VenueList.tsx`
  - `nextjs-app/components/composed/venue/VenueQuickInfo.tsx`
  - `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
  - `nextjs-app/components/custom/map/MapView.tsx` for label wiring and selected QuickInfo/detail data flow.
- The app currently has empty `messages/{sv,en}/about.json` files and loads the `about` scope, but the active app tree has no `app/[locale]/about/page.tsx` route. Story 7.1 owns the full About page.

### Copy Guidance

- Good Swedish direction: short, calm, and specific enough to set expectations.
- Acceptable concepts: "Vi räknar på solens läge, byggnadsskuggor och väder"; "Träd, markiser, parasoller, broar och tillfälliga saker kan påverka platsen"; "Prognosen är mer osäker här."
- Avoid overpromising words: "perfekt", "garanterad", "exakt", "imponerande precision", unless paired with clear uncertainty and approved by product.
- Avoid internal/source terms in normal copy: `Baskarta`, `DTM`, `CRS`, `EPSG`, `byggnad_l`, `shadow_casters`, `get_buildings_near_point`, source layer, import batch, quality score, confidence cap.
- English fallback should be plain, not more technical than Swedish.

### Architecture Guardrails

- Client components must not import from `nextjs-app/lib/solar`, `nextjs-app/lib/weather`, `nextjs-app/lib/supabase`, `nextjs-app/lib/middleware`, or `nextjs-app/lib/buildings`.
- Data access must continue through `nextjs-app/app/api/*` routes and TanStack hooks in `nextjs-app/hooks/queries/`. Query keys stay in `nextjs-app/lib/query-keys.ts`.
- Maintain the component-layer direction: `components/custom/` may consume `components/composed/`; `components/composed/` may consume `components/ui/`; do not create reverse dependencies.
- Use shadcn/ui primitives when a UI primitive is needed. Do not build custom tooltip/popover behavior if the existing primitive is appropriate.
- Do not add dependencies or upgrade packages. Use the versions already in `nextjs-app/package.json`, including Next.js `^16.2.2`, React `^19.2.5`, TypeScript `^6.0.2`, next-intl `^4.9.1`, TanStack Query `^5.99.0`, Motion `^12.38.0`, lucide-react `^1.8.0`, and Vitest `^4.1.4`.

### Previous Story Intelligence

- Story 3.0.5 implemented coverage-aware confidence semantics and obstruction risk caps in the solar runtime, but intentionally added no Swedish uncertainty labels, help text, About-page copy, or new UI surfaces.
- Story 3.0.5 confirmed current venue APIs remain fixture-backed and public DTOs stayed stable at that time.
- Story 3.0.7 clarified that Baskarta is a full XYZ object inventory and `byggnad_l` is only the first validated runtime building subset. For user copy, this means general uncertainty language is appropriate; source-layer and source-geometry detail is not.
- Story 3.0.7 explicitly handed off this story as the owner of Swedish uncertainty copy after the corrected data-source model landed.
- Recent commits `f08d04a` and `07d52ba` changed backend/geodata confidence and data-contract code. Do not re-open those implementation areas unless a missing user-safe API field is strictly required for this story.

### Expected File Impact

Likely files:

- `nextjs-app/lib/types/api.ts`
- `nextjs-app/lib/services/venues-fixture.ts`
- `nextjs-app/app/api/venues/route.ts`
- `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/lib/utils/confidence-display.ts` or a new `nextjs-app/lib/utils/*uncertainty*.ts`
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/messages/en/venue.json`
- `nextjs-app/messages/sv/about.json`
- `nextjs-app/messages/en/about.json`
- `nextjs-app/components/composed/venue/VenueCard.tsx`
- `nextjs-app/components/custom/venue/VenueList.tsx`
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx`
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
- `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- focused tests under `nextjs-app/test/unit/` and `nextjs-app/test/components/`

Possible files only if required by changed callers:

- `nextjs-app/components/custom/favourites/FavouritesList.tsx`
- `nextjs-app/test/unit/queries/useVenueSearch.test.ts`
- `nextjs-app/test/unit/queries/useVenueDetail.test.ts`
- `nextjs-app/test/unit/queries/useFavouriteVenues.test.ts`
- `nextjs-app/docs/design/references/REBASELINE-LOG.md` only if reference PNGs or capture recipes change.

Avoid unless a defect directly blocks this story:

- `nextjs-app/lib/solar/*`
- `scripts/geodata/*`
- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql`
- Supabase migrations or live database operations
- `nextjs-app/app/[locale]/about/page.tsx` if it does not already exist
- routing, feedback, reviews, admin, premium, payment, Season Pass, Swish, paywall, or lock-badge runtime paths.

### Visual Validation Targets

Run visual validation for changed screens only, through the Windows wrapper:

- `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues&_time=14:00" mobile`
- `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00" mobile`
- `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=14:00" mobile`
- `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=16:30" desktop`
- `about` mobile/desktop only if a live About surface is touched.

If visual validation fails because the implementation is wrong, fix the implementation. If it fails because the reference depicts UI outside this story's scope, stop and ask Rasmus for explicit accept-with-rationale.

### References

- `AGENTS.md`
- `project-context.md`
- `_bmad-output/planning-artifacts/epics.md` - Epic 3 Prelude and Story 3.0.6 ACs.
- `_bmad-output/planning-artifacts/prd.md` - Shadow Data Trust Realignment, confidence as first-class UI, and transparent confidence copy.
- `_bmad-output/planning-artifacts/architecture.md` - API boundary, component structure, process patterns, and shadow-data confidence gates.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - honest data, confidence as expectation calibration, error/degradation tone, venue list/detail/about surfaces.
- `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md`
- `_bmad-output/implementation-artifacts/3-0-5-confidence-engine-data-coverage.md`
- `_bmad-output/implementation-artifacts/3-0-7-baskarta-xyz-inventory-data-contract-realignment.md`
- `nextjs-app/docs/design/DESIGN.md`
- `nextjs-app/docs/design/references/claude-design/README.md`
- `nextjs-app/docs/design/references/claude-design/project/src/AboutModal.jsx`
- `nextjs-app/docs/design/references/claude-design/project/src-desktop/AboutModal.jsx`
- `nextjs-app/docs/design/references/REBASELINE-LOG.md`
- `nextjs-app/lib/types/api.ts`
- `nextjs-app/lib/utils/confidence-display.ts`
- `nextjs-app/lib/services/venues-fixture.ts`
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/messages/en/venue.json`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (Codex desktop)

### Debug Log References

- Draft BMAD config load returned `user_name=Rasmus`, `communication_language=English`, `document_output_language=English`, and `implementation_artifacts=C:\Users\Rasmus\sunnyseat/_bmad-output/implementation-artifacts`.
- Draft sprint-status scan identified `3-0-6-ux-content-uncertainty-copy` as the first backlog story after completed Story 3.0.7; Story 3.1 remains `ready-for-dev` but paused behind this prelude.
- Draft baseline before story creation: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Draft baseline before story creation: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Draft worktree check: `git status --short` returned clean before creating this story.
- Draft deferred-work scan found no active target for Story 3.0.6.
- Draft code inventory confirmed venue APIs are fixture-backed, `about.json` scopes exist but are empty, and no live `app/[locale]/about/page.tsx` route exists.
- Draft code inventory confirmed public DTOs currently lack user-safe uncertainty metadata, while `lib/solar` has internal coverage and obstruction-risk semantics from Story 3.0.5.
- Draft design analysis read `DESIGN.md`, Claude Design README, MVP mobile/desktop AboutModal sources, and `REBASELINE-LOG.md`; prototype copy contains stale overpromising 3D-model language and must be corrected if touched.
- Draft recent-git analysis read commits `07d52ba` and `f08d04a`; the relevant handoff is to preserve geodata/confidence work and add only safe UX copy/API metadata.
- Story-file-audit completed after drafting; all seven checks passed.
- Dev baseline before editing: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Dev baseline before editing: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Source-context check read the required project, planning, ADR, sprint-change, design, Claude Design AboutModal, previous prelude story, deferred-work, and sprint sequencing context.
- Deferred-work scan found no active target for Story 3.0.6.
- Sprint sequencing confirmed: `3-0-6-ux-content-uncertainty-copy` is the current in-progress prelude story; Story 3.1 remains paused until this story is reviewed and approved.
- Task 2 red phase: `cd nextjs-app && npx.cmd vitest run test/unit/api/venues-route.test.ts test/unit/api/venue-detail-route.test.ts` failed as expected on missing `predictionUncertainty` response metadata and missing exported `normalizeVenueForResponse()`.
- Task 2 focused green validation: `cd nextjs-app && npx.cmd vitest run test/unit/api/venues-route.test.ts test/unit/api/venue-detail-route.test.ts` passed (2 files / 45 tests).
- Task 2 full validation: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Task 2 full validation: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Task 2 full validation: `cd nextjs-app && npx.cmd vitest run` passed (45 files / 389 tests).
- Task 3 red phase: `cd nextjs-app && npx.cmd vitest run test/unit/uncertainty-copy.test.ts` failed as expected because uncertainty/About copy keys were absent.
- Task 3 focused green validation: `cd nextjs-app && npx.cmd vitest run test/unit/uncertainty-copy.test.ts` passed (1 file / 2 tests).
- Task 3 full validation: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Task 3 full validation: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Task 3 full validation: `cd nextjs-app && npx.cmd vitest run` passed (46 files / 391 tests).
- Task 4 red phase: `cd nextjs-app && npx.cmd vitest run test/unit/prediction-uncertainty-display.test.ts test/components/VenueCard.test.tsx test/components/VenueQuickInfo.test.tsx test/components/VenueDetailContent.test.tsx test/components/VenueList.test.tsx` failed as expected on the missing display helper and unwired component surfaces.
- Task 4 focused green validation: `cd nextjs-app && npx.cmd vitest run test/unit/prediction-uncertainty-display.test.ts test/components/VenueCard.test.tsx test/components/VenueQuickInfo.test.tsx test/components/VenueDetailContent.test.tsx test/components/VenueList.test.tsx` passed (5 files / 47 tests).
- Task 4 full validation: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Task 4 full validation: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Task 4 full validation: `cd nextjs-app && npx.cmd vitest run` passed (47 files / 400 tests).
- Task 5/6 QA scan: raw color/arbitrary-style search over touched UI files returned no matches.
- Task 5/6 QA scan: client API-boundary search for `lib/solar`, `lib/weather`, `lib/supabase`, `lib/middleware`, and `lib/buildings` imports under `components`, `app`, and `hooks` returned no matches.
- Task 6 focused rendered-copy validation: `cd nextjs-app && npx.cmd vitest run test/components/VenueList.test.tsx test/components/VenueQuickInfo.test.tsx test/components/VenueDetailContent.test.tsx` passed (3 files / 31 tests).
- Task 6 full validation: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Task 6 full validation: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Task 6 full validation: `cd nextjs-app && npx.cmd vitest run` passed (47 files / 400 tests).
- Task 7 visual validation: `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues&_time=14:00" mobile` passed.
- Task 7 visual validation: `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00" mobile` passed.
- Rasmus approved completion after Round 1 code-review fixes; story status moved from review to done.
- Task 7 visual validation: `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=14:00" mobile` passed.
- Task 7 visual validation: `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=16:30" desktop` passed.
- Task 7 Playwright E2E skip: no routing, keyboard-flow, or browser interaction behavior was added; scope remained API contract, localized copy, pure display helper, and component rendering.
- Task 7 rebaseline check: no reference PNG or capture-recipe change was needed; `REBASELINE-LOG.md` was not updated.
- Task 7 monetization quarantine scan returned no matches in active app/components/hooks/lib/messages runtime paths.
- Task 7 final verification: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Task 7 final verification: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Task 7 final verification: `cd nextjs-app && npx.cmd vitest run` passed (47 files / 400 tests).
- Review gate attempt: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-6-ux-content-uncertainty-copy` passed lint/typecheck/Vitest, then failed visual validation on `map-panel-venues` for search-bar presence, venue-card thumbnail styling, and filter-chip casing differences. Validation artifact: `_bmad-output/implementation-artifacts/validation/3-0-6-ux-content-uncertainty-copy-review-20260607-122818.log`.
- Visual-gate investigation found three concrete implementation mismatches against `nextjs-app/docs/design/references/screens/mobile/map-panel-venues.png`: forced visual-reference routes still rendered live mobile search chrome, compact venue-filter chips inherited uppercase `text-label-md`, and `h-venue-card-thumb` / `w-venue-card-thumb` custom size classes were present in markup but had no emitted CSS so thumbnail placeholders collapsed to content width.
- Visual-gate fix validation: `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues&_time=14:00" mobile` passed after hiding search only on forced visual-reference routes, using mixed-case compact chip typography, and adding token-backed venue-card sizing utilities.
- Visual-gate fix validation: `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00" mobile` passed.
- Visual-gate fix validation: `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=14:00" mobile` passed.
- Visual-gate fix validation: `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=16:30" desktop` passed.
- Visual-gate fix focused validation: `cd nextjs-app && npx.cmd vitest run test/components/MapView.test.tsx test/components/VenueList.test.tsx test/components/VenueCard.test.tsx` passed (3 files / 75 tests).
- Visual-gate fix final validation: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Visual-gate fix final validation: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Visual-gate fix final validation: `cd nextjs-app && npx.cmd vitest run` passed (47 files / 400 tests).
- Review gate success: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-6-ux-content-uncertainty-copy` passed lint, typecheck, Vitest, and all mapped visual validations; sprint status updated to `review`. Validation artifact: `_bmad-output/implementation-artifacts/validation/3-0-6-ux-content-uncertainty-copy-review-20260607-124225.log`.
- Code review Round 1 wrote four patch findings; all four were batch-fixed by Codex in the same review session.
- Round 1 focused validation: `cd nextjs-app && npx.cmd vitest run test/unit/prediction-uncertainty-display.test.ts test/unit/api/venues-route.test.ts test/unit/api/venue-detail-route.test.ts test/components/VenueDetailContent.test.tsx test/components/VenueCard.test.tsx test/components/VenueQuickInfo.test.tsx test/components/VenueList.test.tsx` passed (7 files / 93 tests).
- Round 1 final validation: `cd nextjs-app && npx.cmd tsc --noEmit` passed.
- Round 1 final validation: `cd nextjs-app && npx.cmd eslint . --quiet` passed.
- Round 1 final validation: `cd nextjs-app && npx.cmd vitest run` passed (47 files / 401 tests).
- Round 1 review-gate rerun attempt: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-6-ux-content-uncertainty-copy` passed lint, typecheck, and Vitest, then failed visual validation before comparison because the dev server was not running at `http://localhost:3000`. Validation artifact: `_bmad-output/implementation-artifacts/validation/3-0-6-ux-content-uncertainty-copy-review-20260607-132848.log`.
- Started the local Next.js dev server at `http://localhost:3000` for visual validation.
- Round 1 review-gate success: `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-6-ux-content-uncertainty-copy` passed lint, typecheck, Vitest, and all mapped visual validations; sprint status was already `review`. Validation artifact: `_bmad-output/implementation-artifacts/validation/3-0-6-ux-content-uncertainty-copy-review-20260607-133036.log`.

### Completion Notes List

- Story drafted by Bob/Codex on 2026-06-07.
- Acceptance criteria are preserved verbatim from `_bmad-output/planning-artifacts/epics.md`.
- Story is frontend/content/API-contract scoped and intentionally does not reopen confidence math, geodata imports, SQL, routing, feedback, reviews, admin, or premium/payment work.
- Story-file-audit: all seven checks pass.
- Task 1 complete: baseline typecheck/lint passed before implementation edits; required source context loaded; no active deferred-work queue item targets Story 3.0.6; story moved to in-progress.
- Task 2 complete: added public `predictionUncertainty` DTO types, seeded safe uncertainty metadata for fixture list/detail routes, centralized response normalization, and tests proving sensitive geodata/source terms are not returned.
- Task 3 complete: added scoped Swedish and English uncertainty copy plus reusable About copy keys, with regression tests for locale key parity, obstruction concepts, and sensitive/overpromising terms.
- Task 4 complete: added pure localized uncertainty display mapping and rendered concise, accessible uncertainty text in list cards, selected QuickInfo, and venue detail without changing venues that lack metadata.
- Task 5 complete: uncertainty labels are visible text with accessible detail, no interactive help affordance or new animation was added, touched UI uses project tokens, and mapped-screen visual validation passed at mobile and desktop target sizes.
- Task 6 complete: expanded API, locale, utility, and component coverage, including rendered-output regression checks that block sensitive source/geodata terms.
- Task 7 complete: canonical story-review gate passed after visual-reference alignment fixes, and sprint status is now `review`.
- Code review Round 1 fixes complete: the uncertainty helper now rejects malformed runtime metadata, includes the full model/obstruction description in accessible text, venue detail renders the description visibly and keeps specific reasons in DOM text, and API sensitive-term assertions cover source-layer variants.

### File List

- `_bmad-output/implementation-artifacts/3-0-6-ux-content-uncertainty-copy.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/validation/3-0-6-ux-content-uncertainty-copy-review-20260607-122818.log`
- `_bmad-output/implementation-artifacts/validation/3-0-6-ux-content-uncertainty-copy-review-20260607-124225.log`
- `_bmad-output/implementation-artifacts/validation/3-0-6-ux-content-uncertainty-copy-review-20260607-132848.log`
- `_bmad-output/implementation-artifacts/validation/3-0-6-ux-content-uncertainty-copy-review-20260607-133036.log`
- `nextjs-app/app/api/venues/route.ts`
- `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/app/globals.css`
- `nextjs-app/components/composed/venue/VenueListControls.tsx`
- `nextjs-app/lib/services/venues-fixture.ts`
- `nextjs-app/lib/types/api.ts`
- `nextjs-app/messages/en/about.json`
- `nextjs-app/messages/en/venue.json`
- `nextjs-app/messages/sv/about.json`
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/components/composed/venue/VenueCard.tsx`
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/venue/VenueList.tsx`
- `nextjs-app/lib/utils/prediction-uncertainty-display.ts`
- `nextjs-app/test/components/VenueCard.test.tsx`
- `nextjs-app/test/components/VenueDetailContent.test.tsx`
- `nextjs-app/test/components/VenueList.test.tsx`
- `nextjs-app/test/components/MapView.test.tsx`
- `nextjs-app/test/components/VenueQuickInfo.test.tsx`
- `nextjs-app/test/setup/sensitive-source-terms.ts`
- `nextjs-app/test/unit/prediction-uncertainty-display.test.ts`
- `nextjs-app/test/unit/api/venues-route.test.ts`
- `nextjs-app/test/unit/api/venue-detail-route.test.ts`
- `nextjs-app/test/unit/uncertainty-copy.test.ts`

## Change Log

| Date | Author | Note |
|------|--------|------|
| 2026-06-07 | Bob | Story drafted from Epic 3 Prelude ACs, Story 3.0.5/3.0.7 handoffs, architecture/API boundary, UX copy guidance, design tokens, current venue DTO/API/message/component code, and clean baseline gates. Status -> ready-for-dev. |
| 2026-06-07 | Bob | Story-file-audit completed with all seven checks passing. |
| 2026-06-07 | Amelia | Started implementation, completed baseline/source-context check, and moved status to in-progress. |
| 2026-06-07 | Amelia | Added safe public prediction uncertainty DTO, fixture metadata, route normalization, and API contract tests. |
| 2026-06-07 | Amelia | Added Swedish/English uncertainty and About copy keys with sensitive-term copy regression tests. |
| 2026-06-07 | Amelia | Rendered localized uncertainty labels in venue list cards, selected QuickInfo, and venue detail using a pure display helper. |
| 2026-06-07 | Amelia | Added rendered-output source-term regression checks for affected uncertainty surfaces. |
| 2026-06-07 | Amelia | Fixed canonical visual-gate failures by aligning forced visual-reference map states with the reference, restoring token-backed venue thumbnail sizing, and removing uppercase chip typography in mobile venue filters. |
| 2026-06-07 | Amelia | Story review gate passed and sprint status moved to review. |
| 2026-06-07 | Codex | Addressed all four Round 1 code review findings and reran focused tests, full typecheck/lint/Vitest, and the canonical story-review gate successfully. |
| 2026-06-07 | Rasmus | Approved Story 3.0.6 after Round 1 code-review fixes and final gate. Status -> done. |
