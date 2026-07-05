# Story 11.6: Venue Detail — Clean First Paint & Content Polish

Status: ready-for-dev

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

- [ ] **Task 1 — Clean first paint: skeleton every detail-only region, never fabricate a value (AC1)**
  - [ ] The bug is a **wrong-data-first render**, not a missing skeleton: `VenueDetailContent` opens on `fallbackVenue` (a `VenueDataDto` from the list) while `detail` (`VenueDetailDto`) is `undefined`, and `venue = detail ?? fallbackVenue` (`VenueDetailContent.tsx:122`). The MapView loading gate is `isLoading={venueDetailQuery.isFetching && !detailVenue}` (`MapView.tsx:1177,1201`), and the content-level gate is `loading = isLoading && !detail` (`:123`). Detail-only regions must show a proper `Skeleton` while `loading`, and NO region may render a fabricated/empty placeholder that would flash a malformed layout.
  - [ ] **Fabricated-value audit — the load-bearing part of AC1.** Walk every field that reads `detail?.…` (or is derived from it) and confirm that during `loading` it renders a skeleton, NOT a stand-in value:
    - `openUntil = detail?.openingHours.closesAt ?? '22:00'` (`:138`) → the header badge (`:170`, "OPEN · {time}") currently shows a fabricated **"22:00"** before detail loads. During `loading` the badge must be a skeleton (or hidden), never a hardcoded time. This is the clearest malformed-frame source.
    - `openingHours.display` (`:312`) and `address` (`:327`) already skeleton on `loading` — verify they still do after the rework, and that `?? labels.detailsUnavailable` only ever renders once real detail has arrived (not as a pre-load flash).
    - `description` (`:196`, `:261`) is gated on `!loading` — verify no empty `<p>` collapses/jumps when it swaps in.
    - `metadata` (`getVenueVisualMetadata(venue)` `:125`) and `peakHour`/`bestWindow` are derived from the list fallback and are legitimately present immediately — those are the "fields present in the fallback render immediately" per AC1; do NOT skeleton them.
  - [ ] **No layout jump on fallback→detail swap.** Skeletons for each detail-only region must occupy the SAME box (height/width) the real content will fill, so the swap does not reflow. Reuse the existing `Skeleton` sizing convention already in the file (`h-5 w-44`, `h-5 w-56`, etc. `:307-323`) and mirror it for the badge/new skeletons you add.
  - [ ] Verify the `forcedVisualVenueDetail` / `_state=venue-detail` path still renders fully-loaded (the forced visual venue supplies a `detail`, so `loading` is false — the axe/visual gates navigate via this path).

- [ ] **Task 2 — Remove the "Soltider idag" section + prune the dead `VenueTimeline` render path (AC2)**
  - [ ] Remove the timeline `<section>` in `VenueDetailContent.tsx` (`:200-257`) on BOTH breakpoints — the block whose heading is `labels.sectionTitle` ("Solprognos idag", mobile) / `labels.timeline.ariaLabel` ("Soltider idag", desktop) and that renders `<SunTimeline>` (desktop, `:244`) / `<SunForecastBars>` (mobile, `:250`). Remove with NO orphaned spacing — check the surrounding `space-y-*` container (`:160`) still spaces cleanly with the section gone (the mobile `<p>` description at `:259` and the tag row at `:265` become adjacent).
  - [ ] **Prune the now-dead render path** (nothing else consumes it — verified: `SunTimeline` is imported only by `VenueDetailContent.tsx`; `SunForecastBars` is defined & used only inside `VenueDetailContent`):
    - Delete `nextjs-app/components/composed/venue/SunTimeline.tsx` (the `SunTimeline` component) and its test `nextjs-app/test/components/SunTimeline.test.tsx`.
    - Delete the `SunForecastBars` local component (`VenueDetailContent.tsx:505-556`) and the `timelineWindowLabel` helper (`:569-585`) which is only called by `SunForecastBars`.
    - **KEEP** `peakTimeFromTimeline` (`:558`), `bestWindowLabel` (`:587`), `timelineFromListVenue` (`:619`), and the `timeline` variable (`:124`) — the HEADER subtitle still uses them (`bestWindow` at `:137`, rendered `:222-226`). Do NOT remove the timeline computation or the `VenueSunTimelineDto` type; the **engine timeline stays** (Story 11.1 consumes the day-series; the `[slug]` route still returns `detail.timeline`).
  - [ ] **Reconcile the `SunTimelineLabels` dependency.** `VenueDetailContent.tsx:79` types `timeline: SunTimelineLabels` and imports the type from the deleted file. After removing `SunTimeline.tsx`, either (a) move the `SunTimelineLabels` type into `VenueDetailContent` (or a shared location) since the header's `bestWindowLabel` fallback still references `labels.timeline.sunnyWindow`/`partialWindow`, or (b) refactor `bestWindowLabel` (`:597-601`) so it no longer needs `labels.timeline.*` (note `labels.bestWindow` is ALWAYS defined in both locales, so the `?? labels.timeline.*` fallback is currently dead). Prefer (b) — it lets you prune more i18n keys — but do NOT break the header subtitle. `windowLabelTier` stays (shared, `sun-status-presentation.ts`).
  - [ ] **Prune i18n keys in BOTH locales** (`messages/sv/venue.json` + `messages/en/venue.json`) — `messages-parity.test.ts` guards sv/en parity, so prune symmetrically:
    - `venue.detail.timeline` block (`ariaLabel`, `currentTime`, `sunnyWindow`, `partialWindow`, `shadedWindow` — `sv:185-190`/`en:185-190`) — prune the whole block IF you take refactor (b) so nothing references it; if you keep the header fallback on `timeline.sunnyWindow/partialWindow`, keep only those two + drop `ariaLabel`/`currentTime`/`shadedWindow`.
    - `venue.detail.sectionTitle` ("Solprognos idag"/"Sun forecast today" — `sv:136`/`en:136`) — only the removed section's mobile heading uses it; prune.
    - Do NOT prune `venue.detail.peakTime` / `venue.detail.bestWindow` — the header subtitle still uses them.
  - [ ] Grep the e2e specs before removing user-visible text (epic-11 convention): confirmed no e2e asserts "Soltider"/"Solprognos"/timeline text (`epic-10-weather-matrix.spec.ts:238` only sets `timeline` in a mocked DTO, never asserts its render). Update `VenueDetailContent.test.tsx` assertions that reference `'Solprognos idag'` (`:102`, `:156`) and the timeline render — remove/rewrite them, but KEEP the CloudObscured-window sr-only-leak regression coverage (`:209-…`) intent: since `SunForecastBars` is gone, that mobile-sr-label leak surface no longer exists, so remove the now-obsolete test rather than leave it asserting a deleted path.

- [ ] **Task 3 — "Omdömen" centered + single empty message (AC3)**
  - [ ] The reviews section is `ReviewFlow` (`nextjs-app/components/custom/feedback/ReviewFlow.tsx`), rendered via `renderReviewSlot()` into `VenueDetailContent`'s `reviewSlot` (`MapView.tsx:628-638` → `VenueDetailContent.tsx:352`). This is a `feedback.review.*` i18n namespace, NOT `venue.detail.*`.
  - [ ] **Remove the duplicate "Inga omdömen".** With 0 reviews the user currently sees TWO messages: the header summary line `t('summary', { count: 0 })` → "Inga omdömen" (`ReviewFlow.tsx:82-86`, from `feedback.review.summary` `{count, plural, =0 {Inga omdömen} …}` `sv:20`) AND the empty body `labels.empty` → "Inga omdömen än." (`:158-161`, `feedback.review.empty` `sv:24`). Land EXACTLY ONE. Preferred: keep the empty-body `labels.empty` as the single canonical empty message and change the `count=0` summary branch so it no longer duplicates it (e.g. the summary line renders only when `reviewCount > 0`, or its `=0` plural becomes a neutral non-duplicating string / is suppressed). Whichever you pick, when `reviews.length === 0` the surface must contain the substring "Inga omdömen" exactly once. Preserve the `>0` summary counts ("# omdöme"/"# omdömen") and the loading/error states unchanged.
  - [ ] **Center the section content per the reference.** The shipped `ReviewFlow` left-aligns; the reference `VenueDetail` reviews block is `docs/design/references/claude-design/project/src/VenueDetail.jsx:291-340`. Center the section (heading + empty state at minimum) using Tailwind utilities (`text-center`, `items-center`) — no ad-hoc CSS. Keep the review cards, the "Lämna ett omdöme" CTA (`AmberCTAButton`), the form, and the reduced-motion `AnimatePresence` behaviour intact. Do NOT restructure `ReviewFlow`'s data/query wiring (`useVenueReviews`, `useSubmitReview`) — this is a presentation/copy change.
  - [ ] Keep the section heading `feedback.review.sectionTitle` ("Omdömen") — AC3 references "Omdömen" as the section name, do not rename it to the reference's "Senaste recensioner".

- [ ] **Task 4 — Fix the amber sun badge to ≥4.5:1 (deterministic axe green — epic constraint from 11-3)**
  - [ ] The venue-detail amber sun badge (`VenueDetailContent.tsx:164`, `bg-amber-primary` + `text-amber-badge-text`, the "OPEN · {time}" header badge with a `Sun` icon) sits at **4.47:1 per axe** vs the 4.5:1 AA threshold — an intermittent color-contrast boundary flake surfaced at Story 11-3's baseline. THIS story reworks venue detail and MUST land the badge at ≥4.5:1 so the axe gate is **deterministically green** (not a flake). Same amber-badge class family as the Story 5.1 debt.
  - [ ] Fix via the design token: `--color-amber-badge-text: #6d5000` (`globals.css:34`) computes ~4.54:1 in pure sRGB but axe reads it at 4.47:1 (rounding/gamma path) — too tight. Darken the token to clear the threshold WITH headroom, e.g. `#5c4300` (≈5.6:1) or reuse the existing `--color-amber-cta-text: #554300` (≈5.8:1). This token is used ONLY on this badge (`VenueDetailContent.tsx:164` text + `:168` dot) — grep-confirmed — so the change is self-contained. Keep DESIGN.md in sync: update the `color-amber-badge-text` row (`DESIGN.md:33`, "Badge label text — SOL NU badge on venue detail header") to the new hex.
  - [ ] After the token change restart `next dev` with a fresh `.next` before running the axe e2e (Turbopack stale-CSS trap, epic-11 Story 11.3 convention).
  - [ ] Verify BOTH axe gates stay/turn green: desktop `axe.spec.ts:82` (`/?venue=test-venue-sunny&_state=venue-detail`) and, where applicable, the mobile sheet. This badge fix is what makes the venue-detail axe scan deterministic.

- [ ] **Task 5 — Tests (component + e2e)**
  - [ ] **`VenueDetailContent.test.tsx`:** (a) AC1 — while `isLoading && !detail`, assert the header badge is NOT the fabricated "22:00" (i.e. no `OPEN · 22:00` visible pre-load; a skeleton is present) and detail-only regions (opening hours, address) show skeletons; assert the venue NAME and fallback-present fields render immediately; assert no timeline section. (b) AC2 — assert "Solprognos idag"/"Soltider idag" and the timeline strip are NOT in the document on either mode; assert the header subtitle (peakTime/bestWindow) still renders. Update/remove the existing `'Solprognos idag'` assertions (`:102`,`:156`) and the deleted-path regression test (`:209`).
  - [ ] **`ReviewFlow` test (or `VenueDetailContent`/`MapView` integration):** AC3 — with 0 reviews assert the surface contains "Inga omdömen" EXACTLY ONCE (`getAllByText`/regex count === 1, not the current 2); with `>0` reviews assert the count summary still renders; assert the centered layout class is present. Keep the loading/error-state tests.
  - [ ] **axe e2e:** confirm `axe.spec.ts:82` (desktop venue-detail) is green after the badge token fix; if a mobile venue-detail axe scan is active, confirm it too. Do NOT weaken any impact filter or add a `test.fixme`. (The mobile venue-detail axe tests are currently `test.fixme` for the Story-5.1 venue-card debt — do NOT un-fixme them here; that is Story 5.1 / epic-retro territory.)
  - [ ] Optional venue-detail e2e (mobile/desktop project, CI-invoked): if you add one, use `[data-testid="…"]:visible` / `.filter({ visible: true })` for the dual-mounted mobile+desktop overlay variants, and `?_time=13:00` if it touches sun state. Confirm `build-and-test-nextjs.yml` actually invokes any new project/spec (epic-11 Story 11.2 CI-wiring lesson).

- [ ] **Task 6 — Gates + visual-validation handoff**
  - [ ] Standard four-command gate from a fresh `.next`: `npm run typecheck` (0 errors), `npm run lint` (0 new errors/warnings — 13 pre-existing warnings baseline), `npm test` (all pass, net-new tests added, none dropped; `messages-parity.test.ts` green after symmetric i18n pruning), axe e2e green on the applicable breakpoint(s).
  - [ ] **Reference PNGs NOT self-blessed.** Record the three visual-validation screenshots — (a) loading skeleton state, (b) loaded detail (timeline-removed, badge-fixed), (c) empty-reviews state — as a maintainer checkpoint in Completion Notes; do NOT edit or regenerate any reference PNG. The consolidated maintainer-blessed rebaseline is **Story 11.7**; the real-device pass is **Story 11.8**.

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

Opus 4.8 (1M context) — `claude-opus-4-8[1m]` (auto-bmad create-story delegate).

### Debug Log References

### Completion Notes List

### File List
