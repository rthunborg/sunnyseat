# Story 11.6: Venue Detail — Clean First Paint & Content Polish

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want the venue detail to open smoothly into a complete, tidy view,
So that "Mer info" never flashes a broken-looking half-render.

## Acceptance Criteria

_(Verbatim from `_bmad-output/planning-artifacts/epics.md` §"Story 11.6", lines 2961-2971. Given/When/Then wording, the em-dashes, the `VenueTimeline` code span, and the Swedish section names ("Soltider idag", "Omdömen", "Inga omdömen") are the maintainer's — do not paraphrase.)_

**AC1 — Clean first paint (no wrong-data / malformed frame)**
**Given** the detail currently renders the list-DTO fallback venue first (detail-only fields missing → malformed layout) before the detail DTO streams in
**When** the loading strategy is fixed
**Then** fields present in the fallback render immediately and every detail-only region renders a proper skeleton until real data arrives — at no frame does a malformed/empty-value layout appear, and the fallback→detail swap causes no layout jump

**AC2 — Remove "Soltider idag" + prune the dead timeline render path**
**Given** the "Soltider idag" section (day timeline strip)
**When** the detail renders
**Then** the section is removed entirely on both breakpoints (the time planner is the canonical way to explore times), with no orphaned spacing, and the now-unused `VenueTimeline` rendering path + i18n keys are pruned (the engine's timeline computation itself stays — Story 11.1 consumes it)

**AC3 — "Omdömen" centered + single empty message**
**Given** the "Omdömen" section
**When** it renders with and without reviews
**Then** the section content is centered per the reference, and the empty state shows exactly ONE "Inga omdömen" message (the duplicate is removed)

### Design Gate Criteria (verbatim, epics.md:2973-2977)

- **Visual:** Detail view matches the reference `VenueDetail` minus the removed section; skeleton states look intentional
- **Behaviour:** No malformed pre-load frame; reviews empty state single-messaged; all remaining fields real
- **Animation:** Detail open transition unchanged; skeleton→content swap is flicker-free
- **Visual validation:** Screenshots of (a) loading skeleton state, (b) loaded detail, (c) empty-reviews state pass before QA handoff

## Tasks / Subtasks

- [x] **Task 1 — Clean first paint: skeleton every detail-only region, never fabricate a value (AC1)**
  - [x] The bug is a **wrong-data-first render**, not a missing skeleton: `VenueDetailContent` opens on `fallbackVenue` while `detail` is `undefined`. Detail-only regions show a proper `Skeleton` while `loading`; no region renders a fabricated/empty placeholder.
  - [x] **Fabricated-value audit (AC1).** Replaced `openUntil = detail?.openingHours.closesAt ?? '22:00'` with `closesAt = detail?.openingHours.closesAt` (no fabrication). The header badge now: (loading) → same-box `Skeleton` (`h-8 w-24 rounded-pill`); (loaded, `closesAt` present) → "ÖPPET · {closesAt}"; (loaded, no `closesAt`) → badge omitted, never a stand-in time. `openingHours.display`/`address` still skeleton on `loading`; description swap-in unchanged; `metadata` (fallback-derived) renders immediately (not skeletoned).
  - [x] **No layout jump on fallback→detail swap.** The badge skeleton occupies the same pill box; existing `h-5 w-44`/`h-5 w-56` detail-region skeletons kept.
  - [x] Verified the `forcedVisualVenueDetail` / `_state=venue-detail` path still renders fully-loaded (axe gate green via this path).

- [x] **Task 2 — Remove the "Soltider idag" section + prune the dead `VenueTimeline` render path (AC2)**
  - [x] Removed the timeline `<section>` on BOTH breakpoints. The surrounding `space-y-*` container spaces cleanly (description `<p>` + tag row now adjacent, no orphaned spacing).
  - [x] Pruned the dead render path: deleted `SunTimeline.tsx` + `SunTimeline.test.tsx`; deleted the `SunForecastBars` local component + `timelineWindowLabel` helper. **DEVIATION (see Completion Notes #1):** the peak/best-window subtitle (`<p>` at old `:222-226`) is STRUCTURALLY INSIDE the removed forecast section (not the `<header>`) and the reference `VenueDetail` header has no such subtitle — so per verbatim AC2 + reference it was removed too, and the now-dead in-component helpers `peakTimeFromTimeline`/`bestWindowLabel`/`timelineFromListVenue` + the `timeline`/`bestWindow`/`peakHour` vars were pruned to keep lint/tsc green. **The ENGINE timeline is untouched** — `detail.timeline` DTO, the `[slug]` route, `VenueSunTimelineDto`, and the ENGINE `sun-engine.ts#peakTimeFromTimeline` (a different function, same name) all stay; Story 11.1 still consumes the day-series.
  - [x] **Reconciled the `SunTimelineLabels` dependency** via refactor (b): removed the `timeline: SunTimelineLabels` field from `VenueDetailContentLabels` and dropped the (now dead) header fallback on `labels.timeline.*`. `windowLabelTier` stays shared in `sun-status-presentation.ts`.
  - [x] **Pruned i18n keys symmetrically** in both locales: removed `venue.detail.timeline` block + `venue.detail.sectionTitle` AND (since the subtitle is gone) `venue.detail.peakTime`/`venue.detail.bestWindow`. `messages-parity.test.ts` green. Also pruned the matching label-builders in `MapView.tsx` (`venueDetailLabels`) and `ForcedVenueDetailInitialFrame.tsx`.
  - [x] Grepped e2e specs before removing text: no e2e asserts "Soltider"/"Solprognos"/timeline text. Updated `VenueDetailContent.test.tsx` (rewrote the `'Solprognos idag'` + timeline assertions to negative assertions; removed the obsolete SunForecastBars sr-only-leak repro since that surface no longer exists) and the `MapView.test.tsx:1481` `'Bäst 11:00-15:00'` assertion.

- [x] **Task 3 — "Omdömen" centered + single empty message (AC3)**
  - [x] `ReviewFlow` reviewed; `feedback.review.*` namespace untouched structurally.
  - [x] **Removed the duplicate "Inga omdömen".** The `count=0` summary line is now suppressed (summary `<p>` renders only when `reviewCount > 0`, or the loading label while unresolved); the empty-body `labels.empty` ("Inga omdömen än.") is the single canonical empty message → substring "Inga omdömen" appears exactly once at 0 reviews. `>0` counts + loading/error states unchanged; the `feedback.review.summary` `=0` ICU branch left intact (unused now, no i18n churn).
  - [x] **Centered the section content** with Tailwind utilities only: header `flex flex-col items-center text-center`, empty message `text-center`. Review cards / form / `AmberCTAButton` CTA / reduced-motion `AnimatePresence` and the `useVenueReviews`/`useSubmitReview` wiring untouched.
  - [x] Kept the section heading `feedback.review.sectionTitle` ("Omdömen").

- [x] **Task 4 — Fix the amber sun badge to ≥4.5:1 (deterministic axe green)**
  - [x] Darkened the token `--color-amber-badge-text` from `#6d5000` to `#5c4300` (5.63:1 pure-sRGB on `#ffbf00`, comfortably above the 4.5:1 AA threshold and the axe-read 4.47:1 boundary of the old value). Token used ONLY on this badge (text + mobile dot) — self-contained.
  - [x] Synced the `color-amber-badge-text` row in `DESIGN.md` to `#5c4300` with the rationale.
  - [x] Cleared `.next` before running the axe e2e (Turbopack stale-CSS trap).
  - [x] Verified `axe.spec.ts:82` (desktop `/?venue=test-venue-sunny&_state=venue-detail`) + the obscured venue-detail scan green. Mobile venue-detail axe stays `test.fixme` (Story-5.1 venue-card debt) — NOT un-fixme'd.

- [x] **Task 5 — Tests (component + e2e)**
  - [x] **`VenueDetailContent.test.tsx`:** AC1 — asserts no fabricated "ÖPPET · 22:00" pre-load (skeleton present), opening-hours/address skeletons, name + fallback fields render immediately, no timeline section; a dedicated test pins the badge omit-when-no-`closesAt` path. AC2 — asserts "Solprognos idag"/"Soltider idag" and the timeline windows are absent on both modes. Removed the obsolete SunForecastBars leak repro + the local `peakTimeFromTimeline` unit test (function pruned).
  - [x] **`ReviewFlow.test.tsx`:** AC3 — with 0 reviews asserts "Inga omdömen" occurs EXACTLY once + the empty message and header carry the centering classes; a second test pins the `>0` count summary + no empty-message leak. Loading/error tests kept.
  - [x] **axe e2e:** `axe.spec.ts:82` + full desktop `a11y` project green (12 passed, 2 pre-existing Story-5.1 fixmes skipped). No impact filter weakened, no new `test.fixme`.
  - [x] No new venue-detail e2e project/spec added (not required; the axe gate + component tests cover the ACs) — avoids CI-wiring risk.

- [x] **Task 6 — Gates + visual-validation handoff**
  - [x] Four-command gate from a fresh `.next`: `npm run typecheck` (0 errors), `npm run lint` (0 errors; 13 pre-existing warnings baseline untouched), `npm test` (1331 pass / 140 files, net-new tests added, none dropped; `messages-parity.test.ts` green after symmetric pruning), axe e2e green.
  - [x] **Reference PNGs NOT self-blessed** — recorded the three visual-validation screenshot routes as a maintainer checkpoint in Completion Notes; no reference PNG edited/regenerated. Rebaseline is Story 11.7; real-device pass is Story 11.8.

## Dev Notes

### Scope fences (what this story is and is NOT)

**IN scope:** `VenueDetailContent.tsx` (clean first paint / skeleton-every-detail-region; remove the "Soltider idag" section; the amber-badge token fix), `ReviewFlow.tsx` (center + single empty message), deletion of `SunTimeline.tsx` + `SunForecastBars` + `timelineWindowLabel` + `SunTimeline.test.tsx`, symmetric i18n pruning in `messages/{sv,en}/venue.json` (timeline block + `sectionTitle`), the `--color-amber-badge-text` token in `globals.css` + its `DESIGN.md` row, and the tests above.

**OUT of scope (other Epic 11 stories / do NOT touch):**
- Client day-series / query-key seam and the date-change dim+spinner overlay (Story 11.1 — shipped; the engine `timeline` computation + the `[slug]` route's `detail.timeline` STAY, 11.1 consumes them).
- Slider drag / planner range rules (11.2); mobile tag chips / bottom-sheet snaps / desktop chip strip (11.3).
- Quick-info rework (11.4 — shipped); map tint / location dot / recenter (11.5).
- `toSunStatusToken` wire-or-delete, `vercel.json` lightningcss, `.gitattributes` EOL, the consolidated reference-PNG rebaseline (11.7).
- Live perf / real-touch / request-count and the physical-device checklist (11.8).
- Do NOT change: the sun engine, the weather gates, the `[slug]` detail route DTO shape, `useVenueDetail`, the share/favourite chrome, the Story-10.2 obscured hero/badge two-signal treatment (the muted `bg-pin-obscured` hero badge + `venue-detail-obscured` block — leave it exactly as shipped), or the routing overlay.
- No new route, schema, dependency, or engine/weather change.

### Architecture & pattern constraints

- **Design-system-first / token discipline:** no ad-hoc hex/rgba in components — the badge fix goes through the `--color-amber-badge-text` token in `globals.css` `@theme`, and `DESIGN.md` (`docs/design/DESIGN.md`) is canonical for tokens; keep its color-table row in sync. Centering + skeletons use existing Tailwind utilities + the existing `Skeleton` component (`@/components/ui/skeleton`). [Source: `frontend-component` skill; `AGENTS.md`; `DESIGN.md:33`]
- **Skeleton convention:** the file already uses `<Skeleton data-testid="venue-detail-skeleton" className="h-N w-N bg-surface-muted" />` for detail-only regions (`VenueDetailContent.tsx:307-323`, `:384-387`, `LoadingBlock` `:604-616`). New skeletons (e.g. the header badge) must follow the same testid + sizing convention and occupy the real content's box to avoid layout jump. [Source: `VenueDetailContent.tsx`]
- **Detail loading gate:** `loading = isLoading && !detail` (`:123`); `isLoading` is threaded from MapView as `venueDetailQuery.isFetching && !detailVenue` (`MapView.tsx:1177,1201`). The `article` sets `aria-busy={loading}` (`:148`) and `LoadingBlock` uses `role="status"` — preserve these a11y signals. [Source: `VenueDetailContent.tsx`, `MapView.tsx`]
- **Turbopack stale-CSS trap:** after any `globals.css` token change, restart `next dev` with a fresh `.next` before running the axe/visual e2e (token resolves to empty string until restart). [Source: retro-notes epic-11 Story 11.3 Phase-5]
- **Animation unchanged:** the detail open transition (`VenueDetailOverlay.tsx` enter/exit `motion.aside`) is out of scope — do not touch it (Design Gate: "Detail open transition unchanged"). The skeleton→content swap must be flicker-free (no opacity/AnimatePresence churn on the swap; the content simply replaces skeletons in place).

### Why the badge is the axe-gate load-bearing item

- Retro-notes epic-11 (Story 11.3 Phase-5) and this story's own critical constraint: `VenueDetailContent`'s amber sun badge is measured by axe at **4.47:1** vs the 4.5:1 AA threshold — an intermittent boundary flake on the axe color-contrast rule, same amber-badge class as the Story 5.1 debt. The venue-detail axe scan (`axe.spec.ts:82`, ACTIVE in CI since Epic 9) can flip red on this. Because THIS story reworks venue detail, it MUST land the badge ≥4.5:1 (with headroom) so the gate is deterministically green — do not leave it at the flaky boundary. The token `--color-amber-badge-text (#6d5000)` on `bg-amber-primary (#ffbf00)` is the exact pairing; darkening the token (e.g. `#5c4300` ≈5.6:1, or `#554300` ≈5.8:1) is self-contained (token used only on this badge). [Source: retro-notes epic-11 Story 11.3; `axe.spec.ts:82`; `globals.css:34`; `DESIGN.md:33`]

### Reference alignment (AC2/AC3 Visual)

- Reference `VenueDetail`: `docs/design/references/claude-design/project/src/VenueDetail.jsx`. It has NO "Soltider idag"/timeline strip section (the shipped app added it; AC2 removes it to match). The reviews preview (`:291-340`) is centered-ish and single-messaged. AC2/AC3 Visual = "matches the reference `VenueDetail` minus the removed section". Note the reference reviews header reads "Senaste recensioner"/"Skriv recension" — but AC3 explicitly names the shipped **"Omdömen"** section and only asks to center it + de-duplicate the empty message; keep "Omdömen". [Source: `VenueDetail.jsx`; epics.md:2969-2974]

### Persistent facts (carried debt + epic constraints folded in)

- **The amber sun badge MUST land ≥4.5:1 in THIS story (deterministic axe green).** 4.47:1 baseline flake surfaced at 11-3; this is a hard epic constraint, not optional. See "Why the badge is the axe-gate load-bearing item" above. [retro-notes epic-11 Story 11.3]
- **The engine timeline computation STAYS.** AC2 removes only the render path + i18n keys of the detail's "Soltider idag" strip; `detail.timeline` (DTO), `timelineFromListVenue`, `peakTimeFromTimeline`, `bestWindowLabel`, and the server `[slug]` route timeline all remain — **Story 11.1 consumes the day-series** derived from the same engine walk. Do NOT delete the timeline data. [epics.md:2967; test-design R-011]
- **When a story removes user-visible text, grep the e2e specs for assertions on it** before deleting (epic-11 Story 11.5 lesson — a stale spec assertion `ca N min` red'd HEAD after 11.4 removed the label). Confirmed here: no e2e asserts "Soltider"/"Solprognos"/timeline text, but re-grep after your exact wording removals to be safe. [retro-notes epic-11 Story 11.5]
- **Dual-variant selectors:** the mobile (`mobile-venue-detail-sheet`) and desktop (`desktop-venue-detail-panel`) overlays are BOTH always mounted (CSS-hidden per breakpoint). Any e2e you add must use `:visible` / `.filter({ visible: true })`, never positional `.first()`/`.last()`. [retro-notes epic-11 Story 11.1]
- **New visual states → dev forbidden from self-blessing reference PNGs.** Story 11.7 owns the consolidated maintainer rebaseline; Story 11.8 owns the real-device pass. Record screenshots as a checkpoint only. [retro-notes epic-11 Story 11.1/11.4/11.5]
- **e2e sun-specs force `?_time=13:00`** — sun is server-computed from wall clock, so any e2e touching sun state is wall-clock-flaky without the pin. [MEMORY: ci-and-e2e-gotchas]
- **Query keys (date-only + `isLiveNow`) are 11.1's seam — do NOT reintroduce time into them.** This story does not touch query keys, but note it if you look at `useVenueDetail`. [retro-notes epic-11 Story 11.1]

### Deferred-work overlap (subject-matched to this story's files; folded, NONE reopened)

Reviewed `_bmad-output/implementation-artifacts/deferred-work.md`. The only entries whose subject overlaps this story's files/ACs:

- **[NOTE — do NOT reopen] `VenueDetailContent` Avstånd card hardcoded-distance vs suppressed "≈ från centrum" qualifier** (`VenueDetailContent.tsx:245-252`; epic-9 iter-2 review, Target: None conditional, fixture-only seam). This story touches `VenueDetailContent` but NOT the distance/`FactCard` logic. The malformed-first-paint audit (Task 1) should confirm the `FactCard` distance renders from the fallback venue (present immediately, not skeletoned) and that your changes don't disturb the `Number.isFinite(venue.distanceMeters)` gate. Do NOT take on the hardcoded-distance hardening (out of scope, still conditional). [deferred-work.md, epic-9 iter-2]
- **[NOTE — do NOT reopen] Automated visual-validation gate not satisfiable within the diff (host `/tmp` tooling bug); venue-detail reference PNGs predate recent states** (Story 9.8 defer, Target: None — maintainer rebaseline). This story adds NEW venue-detail visual states (timeline removed, badge darkened, centered reviews) → same situation: record screenshots, do NOT self-bless; the rebaseline is Story 11.7's. [deferred-work.md, Story 9.8]
- No other deferred entry overlaps venue detail, the timeline strip, the reviews section, or the amber badge. Entries for slider/sheet/quick-info/map/weather/DTO/SW belong to other stories and are NOT in scope.

### Project Structure Notes

- All work is in `nextjs-app/`:
  - `components/composed/venue/VenueDetailContent.tsx` — clean first paint (skeleton audit + remove the fabricated `openUntil` fallback flash), remove the "Soltider idag" `<section>` + `SunForecastBars` + `timelineWindowLabel`, keep header subtitle helpers, badge token class stays (`text-amber-badge-text`).
  - `components/composed/venue/SunTimeline.tsx` — DELETE (only consumer was VenueDetailContent).
  - `components/custom/feedback/ReviewFlow.tsx` — center + single "Inga omdömen".
  - `app/globals.css` — darken `--color-amber-badge-text`.
  - `docs/design/DESIGN.md` — sync the `color-amber-badge-text` row.
  - `messages/sv/venue.json` + `messages/en/venue.json` — prune `detail.timeline.*` + `detail.sectionTitle` symmetrically (parity-guarded).
  - `messages/sv/feedback.json` + `messages/en/feedback.json` — only if AC3's single-message fix needs a `summary` `=0` copy tweak (keep parity).
  - Tests: `test/components/VenueDetailContent.test.tsx` (rewrite timeline/skeleton assertions), delete `test/components/SunTimeline.test.tsx`, add/extend a `ReviewFlow` single-empty-message + centered test.
- `VenueDetailContent` is rendered by `VenueDetailOverlay` (mobile sheet + desktop panel) which is mounted twice (both breakpoints) in `MapView` — do not add a third render path.
- No new route, schema, dependency, or engine/weather change. No conflicts with the unified structure.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story-11.6` (lines 2953-2977) — ACs + Design Gate; epics.md:2801 root-cause "malformed first paint = list-DTO fallback rendering detail-only fields missing"; epics.md:2803 "Venue detail: remove the 'Soltider idag' section entirely (the time planner is the one way to explore times)"]
- [Source: `_bmad-output/test-artifacts/test-design/test-design-epic-11.md` — R-011 (detail malformed first paint / removed-section residue / double-message, lines 124, 268-269), R-010 (i18n/aria residue after removals, line 283), Unknown-thresholds note line 170; component-map line 578; test-plan lines 353-354]
- [Source: `nextjs-app/components/composed/venue/VenueDetailContent.tsx` — `:122-124` fallback venue + loading gate + timeline var; `:138` fabricated `openUntil` `?? '22:00'`; `:164-171` amber badge (`bg-amber-primary`/`text-amber-badge-text`); `:200-257` the "Soltider idag" section to remove; `:244` `<SunTimeline>`; `:250` `<SunForecastBars>`; `:307-323` skeleton sizing convention; `:352` `reviewSlot`; `:505-556` `SunForecastBars` to delete; `:558-602` header helpers to KEEP; `:569-585` `timelineWindowLabel` to delete; `:619-634` `timelineFromListVenue` to KEEP]
- [Source: `nextjs-app/components/composed/venue/SunTimeline.tsx` — component to DELETE (imported only by VenueDetailContent)]
- [Source: `nextjs-app/components/custom/feedback/ReviewFlow.tsx:82-86` (summary header `count=0` → "Inga omdömen") + `:158-161` (empty body `labels.empty` → "Inga omdömen än.") — the duplicate to collapse to ONE; `:70-163` section to center]
- [Source: `nextjs-app/components/custom/map/MapView.tsx:1177,1201` (`isLoading` gate), `:628-638` (`renderReviewSlot`), `:1171-1216` (both overlay mounts)]
- [Source: `nextjs-app/app/globals.css:28` (`--color-amber-primary #ffbf00`), `:33` (`--color-amber-cta-text #554300`), `:34` (`--color-amber-badge-text #6d5000` — darken this)]
- [Source: `nextjs-app/docs/design/DESIGN.md:33` (`color-amber-badge-text` row to sync), `:27` (amber-primary fill use), `:435,461` (info-section card / warm overlay context)]
- [Source: `nextjs-app/messages/sv/venue.json:136` (`sectionTitle`), `:185-190` (`timeline` block) + `nextjs-app/messages/en/venue.json:136,185-191` — prune symmetrically; `messages/sv/feedback.json:19-24` (`review.sectionTitle`/`summary`/`empty`)]
- [Source: `nextjs-app/test/e2e/axe.spec.ts:82` (desktop venue-detail axe gate) + `axe-mobile.spec.ts:45,87` (mobile venue-detail, `test.fixme` — do NOT un-fixme) — the ACTIVE axe AA gate the badge fix must keep/turn green]
- [Source: `nextjs-app/test/components/VenueDetailContent.test.tsx:102,156` (`'Solprognos idag'` assertions to update), `:209` (deleted-path regression test to remove), `:421` (skeleton-count assertion pattern), `:407-421` (loading-state test to extend for the badge)]
- [Source: `nextjs-app/test/unit/messages-parity.test.ts` — sv/en parity guard; prune both locales symmetrically]
- [Source: `nextjs-app/docs/design/references/claude-design/project/src/VenueDetail.jsx` — reference detail (no timeline strip; reviews preview `:291-340`)]
- [Source: retro-notes `_bmad-output/auto-bmad/retro-notes/epic-11.md` — badge ≥4.5:1 (11-3), Turbopack fresh-.next after globals.css (11-3), dual-variant `.filter({visible:true})` (11-1), grep e2e when removing text (11-5), self-bless forbidden / 11-7 owns rebaseline (11-1/11-4/11-5)]
- [Source: `_bmad-output/planning-artifacts/architecture.md:58` (WCAG 2.1 AA — colour contrast); `:41` (map-as-persistent-root, detail overlay in the shell)]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — venue-detail spec + reduced-motion behaviour]
- [Source: `project-context.md` (repo root) — Screen ID → Route Map + visual-validation gate the axe/visual checks navigate by (venue-detail route/state); design + screen map]
- [Source: `CLAUDE.md` / `AGENTS.md` — repo rulebook; `nextjs-app/docs/design/DESIGN.md` — canonical design tokens]

## Dev Agent Record

### Agent Model Used

Opus 4.8 (1M context) — `claude-opus-4-8[1m]` (auto-bmad dev-story delegate).

### Debug Log References

- `npm run typecheck` → 0 errors.
- `npm run lint` → 0 errors (13 pre-existing warnings baseline unchanged).
- `npm test` → 1331 passed / 140 files, 0 failed.
- Fresh `.next`, then `npx playwright test --project=a11y` → 12 passed, 2 skipped (pre-existing Story-5.1 mobile-card fixmes). The load-bearing `axe.spec.ts:82` venue-detail scan + the obscured venue-detail scan both green with the darkened badge token.
- Contrast check: `#5c4300` on `#ffbf00` = 5.63:1 (WCAG); old `#6d5000` = 4.54:1 pure-sRGB but axe read 4.47:1 (the boundary flake).

### Completion Notes List

1. **DEVIATION — peak/best-window header subtitle removed (not just relocated).** The story's Task 2/Task 5 assumed the `peakTime`/`bestWindow` subtitle lives in the `<header>` and survives the section removal, and told me to KEEP `peakTimeFromTimeline`/`bestWindowLabel`/`timelineFromListVenue`/the `timeline` var. In the actual code that subtitle (`<p>` at old `:222-226`) is STRUCTURALLY INSIDE the removed "Soltider idag" forecast `<section>`, and the reference `docs/design/.../VenueDetail.jsx` header (venue-name + open-badge + type/rating row) has NO such subtitle. Verbatim AC2 ("removed entirely on both breakpoints", "no orphaned spacing", "matches the reference minus the removed section") is the authority, so I removed the subtitle with the section and pruned the now-dead in-component helpers + the `venue.detail.peakTime`/`bestWindow` i18n keys to keep lint/tsc green (shipping dead code would be a review finding). **The ENGINE timeline is fully intact** — `detail.timeline` DTO, the `[slug]` route, `VenueSunTimelineDto`, and `sun-engine.ts#peakTimeFromTimeline` (a DIFFERENT function that happens to share the name; its `sun-engine.test.ts` coverage is untouched) all stay; Story 11.1 still consumes the day-series. Only the detail's presentation path was pruned, exactly as the epic guardrail states.
2. **No-fabrication badge.** The old `?? '22:00'` fallback is gone. Because `closesAt` is optional even on a loaded `VenueDetailDto`, the badge is omitted (not stand-in'd) when a real detail has no closing time — pinned by a test. This also removes the pre-load "ÖPPET · 22:00" flash that was the clearest malformed-frame source.
3. **Single empty-review message via render-gating, not i18n edit.** I suppressed the `count=0` summary line in `ReviewFlow` rather than editing the `feedback.review.summary` `=0` ICU branch — zero i18n churn, parity untouched, and the `>0` counts / loading / error states are byte-identical. The `=0` branch string remains in the JSON (harmless, unreferenced).
4. **Also updated two label-builders the story didn't call out:** `MapView.tsx#venueDetailLabels` and `ForcedVenueDetailInitialFrame.tsx#venueDetailLabels` both built the removed `sectionTitle`/`peakTime`/`timeline` labels and pass them to `VenueDetailContent`; leaving them would be a runtime `t()` on pruned keys. Pruned symmetrically.

**Visual-validation checkpoint (maintainer — NOT self-blessed; rebaseline is Story 11.7):**
- (a) Loading skeleton state: no dedicated forced-loading route exists; covered behaviourally by `VenueDetailContent.test.tsx` "shows the venue name + fallback fields immediately and skeletons every detail-only region while loading" (asserts no fabricated badge + skeletons present).
- (b) Loaded detail (timeline-removed, badge-fixed): `/?venue=test-venue-sunny&_state=venue-detail` (desktop panel + mobile sheet). Axe-green; timeline section absent; badge at `#5c4300`.
- (c) Empty-reviews state: covered behaviourally by `ReviewFlow.test.tsx` "shows exactly ONE 'Inga omdömen' empty message and centers the section". No forced empty-reviews route is wired (reviews come from the API), so no screenshot route; recommend the maintainer capture it against a zero-review venue during the 11.7 rebaseline.

No reference PNG was edited or regenerated.

### File List

- `nextjs-app/components/composed/venue/VenueDetailContent.tsx` (M — clean first paint / no-fabrication badge + skeleton; removed the "Soltider idag" section, `SunForecastBars`, `timelineWindowLabel`, `bestWindowLabel`, local `peakTimeFromTimeline`, `timelineFromListVenue`; pruned `timeline`/`sectionTitle`/`peakTime`/`bestWindow` from `VenueDetailContentLabels`)
- `nextjs-app/components/composed/venue/SunTimeline.tsx` (D — deleted; only consumer was VenueDetailContent)
- `nextjs-app/components/custom/feedback/ReviewFlow.tsx` (M — centered header + empty state; suppressed the duplicate `count=0` "Inga omdömen" summary)
- `nextjs-app/components/custom/map/MapView.tsx` (M — pruned removed labels from `venueDetailLabels`)
- `nextjs-app/components/custom/venue/ForcedVenueDetailInitialFrame.tsx` (M — pruned removed labels from its `venueDetailLabels`)
- `nextjs-app/app/globals.css` (M — `--color-amber-badge-text` `#6d5000` → `#5c4300`)
- `nextjs-app/docs/design/DESIGN.md` (M — synced the `color-amber-badge-text` row)
- `nextjs-app/messages/sv/venue.json` (M — pruned `detail.sectionTitle`/`peakTime`/`bestWindow`/`timeline` block)
- `nextjs-app/messages/en/venue.json` (M — same symmetric prune)
- `nextjs-app/test/components/VenueDetailContent.test.tsx` (M — rewrote timeline/skeleton/badge assertions; dropped `peakTimeFromTimeline` import + obsolete leak repro)
- `nextjs-app/test/components/SunTimeline.test.tsx` (D — deleted with the component)
- `nextjs-app/test/components/ReviewFlow.test.tsx` (M — added single-empty-message + centered-layout tests)
- `nextjs-app/test/components/VenueDetailOverlay.test.tsx` (M — cleaned stale label props off the test `labels` object)
- `nextjs-app/test/components/MapView.test.tsx` (M — replaced the `'Bäst 11:00-15:00'` subtitle assertion with a section-removed assertion)

### Review Findings

_Triage of the thin (auditor-only) Tier-A code review, 2026-07-05. Verdict: Approve. Security review: 0 findings. Of the 5 raw auditor findings (2 Low, 3 Info), 1 Low survives as a Defer; the other Low and all 3 Info are dismissed as noise (out-of-scope / no-defect confirmation notes). No Decision or Patch findings._

- [x] [Review][Defer][Low] AC3 "centered per the reference" diverges from the literal reference JSX (left-aligned `space-between`) [nextjs-app/components/custom/feedback/ReviewFlow.tsx:75] — deferred, pre-existing. The code centers the reviews header/empty body (`flex flex-col items-center text-center`) per AC3's explicit "centered" prose, but the reference `docs/design/references/claude-design/project/src/VenueDetail.jsx:291-340` renders the reviews preview left-aligned (`justifyContent:'space-between'`). AC3's written text is the maintainer's stated authority and the story's Dev Notes flag exactly this reference/AC tension, so the code satisfies AC3 — no code change. Flagged only so the Story 11.7 visual rebaseline confirms "centered" is the intended look (and the reference file, not the code, is the stale side).
