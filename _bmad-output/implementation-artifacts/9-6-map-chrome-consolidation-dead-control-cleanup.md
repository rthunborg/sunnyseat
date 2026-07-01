# Story 9.6: Map Chrome Consolidation & Dead-Control Cleanup

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want one clear set of map controls and no buttons that don't do anything,
so that the interface is clean and every control works.

## Acceptance Criteria

_(Verbatim from epics.md §"Story 9.6: Map Chrome Consolidation & Dead-Control Cleanup". This is Spine 3 of the Epic 9 triage — "visual shell without plumbing": controls rendered `disabled` / `cursor-not-allowed` with no handler. The maintainer decision baked into the ACs: KEEP the top-bar locate + settings pair as the single mobile access point [ENABLE the disabled settings gear]; REMOVE the duplicate floating locate + settings buttons over the map. AC4 is explicitly a LOW-PRIORITY polish — it does not gate the story.)_

1. **Given** the mobile UI currently shows duplicate locate + settings buttons — one pair in the top search row (`VenueSearchShell.tsx`) and one pair floating over the map (`MapControls.tsx`), **When** the chrome is consolidated, **Then** the floating mobile locate + settings buttons are removed from `MapControls` (zoom +/- remain), and the top-bar pair is kept as the single access point.

2. **Given** the top-bar settings gear is currently hard-`disabled` (`VenueSearchShell.tsx:111-118`), **When** it is wired, **Then** it opens the settings modal via `useSettings().openSettings` (the same call `MapControls` used), and the top-bar locate button continues to request location — both fully functional, neither greyed out.

3. **Given** other disabled placeholder controls exist (nav pager chevrons in `DesktopNavBar.tsx`, "Café"/"Öppet nu" category buttons in `VenueListControls.tsx`), **When** the cleanup runs, **Then** these are hidden/removed until their features are built, so no inert control reads as broken (tag chips are handled in Story 9.7; the share button in Story 9.8).

4. **Given** the search bar is a working autocomplete with no submit affordance, **When** a low-priority polish is applied, **Then** pressing Enter with no highlighted option selects the first visible result (pans the map), closing the "type-then-Enter does nothing" expectation gap.

### Design Gate Criteria

_(Frontend story. Carried verbatim from epics.md §"Story 9.6 → Design Gate Criteria". This is a REMOVAL/consolidation story — see "Removal stories invert the visual gate" in Dev Notes: a correct implementation REMOVES chrome, so a screenshot vs the stale reference PNGs may FAIL by design and route to maintainer rebaseline. The mandatory manual visual affordance on this host is documented under "Visual gate on this host".)_

- **Visual:** Single, consistent control set on mobile; no greyed/disabled controls remain on screen.
- **Behaviour:** Kept locate + settings buttons both work; removed/hidden controls are gone; Enter selects first search result.
- **Animation:** Control hover/press states unchanged.
- **Visual validation:** Screenshot of the mobile map chrome (top bar + remaining zoom stack) passes before QA handoff.

## Tasks / Subtasks

- [x] **Task 1 — Remove the DUPLICATE floating mobile locate + settings buttons from `MapControls` (zoom +/- stay) and RELOCATE Story 9.5's locate-state feedback onto the surviving mobile locate button (AC: #1)**
  - [x] Read the "9.5 coordination" section first — 9.5's floating-button reliability wiring is PRESERVED by relocation, not deleted.
  - [x] Deleted the two `lg:hidden` `GlassButton`s (locate `map-control-my-location` + settings `map-control-settings`) from `MapControls.tsx`; zoom in/out remain at every breakpoint.
  - [x] Relocated 9.5's locate feedback onto the `VenueSearchShell` mobile `Navigation` button: `aria-busy` on `pending`, `data-locate-state={geolocation.status}`, `motion-safe:animate-pulse` icon on `pending`; button has no `disabled` so it stays clickable on `fallback` to retry. Added `data-testid="search-shell-my-location"`.
  - [x] Fly-to-on-success KEPT in `MapControls` (the smallest correct change — Open Question 2 default). Both the mobile top-bar locate and `desktop-nav-my-location` drive the same `useGeolocation` context, so the single shared effect re-centres on success regardless of which button fired. Verified via `DesktopNavBar.test.tsx` + `responsive-layout.spec.ts` D7 (both green) and a new MapControls success-fly-to test that drives the hook state directly.
  - [x] Reused the existing inline top-bar button markup (ported attributes inline) rather than lifting `GlassButton` — no third locate implementation.

- [x] **Task 2 — Enable the hard-`disabled` top-bar settings gear so it opens the settings modal (AC: #2)**
  - [x] `VenueSearchShell.tsx` mobile settings button: consumes `useSettings()`, `onClick={openSettings}`, removed `disabled` + `opacity-60` + `cursor-not-allowed`; now renders as a live glass button matching the sibling locate button. Added `data-testid="search-shell-settings"`.
  - [x] Top-bar locate button stays wired to `geolocation.requestLocation` (unchanged) — Task 1 added its state feedback.
  - [x] i18n label unchanged (`venue.search.settings`); no new key.
  - [x] Followed the canonical `const { openSettings } = useSettings();` → `onClick={openSettings}` pattern.

- [x] **Task 3 — Hide/remove the remaining dead placeholder controls (AC: #3)**
  - [x] Removed both `HeaderChevron` render calls + the `HeaderChevron` component + the `ChevronLeft`/`ChevronRight` imports from `DesktopNavBar.tsx`. Filter chips + the `<nav>` wrapper LEFT untouched (Story 9.7). Also removed the now-orphaned `common.json` `nav.previous`/`nav.next` keys from BOTH locales (they were the chevron labels, now truly unreferenced).
  - [x] Removed the "Café" + "Öppet nu" `SortButton`s + the `Coffee`/`UsersRound` imports from `VenueListControls.tsx`; working sun/distance sort buttons untouched.
  - [x] FULL removal of `categoryCafe`/`openNow`: the two `VenueListControlsLabels` type members, the two `MapView.tsx:1414-1415` call-site lines, and both-locale `venue.controls.*` JSON keys. `unavailable` kept (still used by favourites-mode distance disabled state). `messages-parity` green.
  - [x] Did NOT touch the venue-detail share button (Story 9.8) or the tag chips (Story 9.7).

- [x] **Task 4 — LOW-PRIORITY polish: bare-Enter selects first result (AC: #4)**
  - [x] Verified empirically (jsdom + cmdk 1.1.1): a bare Enter with NO prior ArrowDown already fires the first visible item's `onSelect` — cmdk auto-highlights the first item on list open. AC4 is ALREADY SATISFIED by cmdk's default.
  - [x] No production code change needed to `VenueSearchCombobox.tsx` — the `onKeyDown` Enter branch was NOT added (cmdk handles it). Added a documenting regression test instead.
  - [x] Confirmed the shared-component pan behaviour (`handleSelectVenue` → `easeTo`) already applies — no extra wiring.

- [x] **Task 5 — Update broken tests + add coverage (AC: #1–4)**
  - [x] `MapControls.test.tsx` rewritten: asserts only zoom buttons render (no `map-control-my-location`/`map-control-settings`); kept zoom + drag-fade + unmount cleanup; the success-fly-to test now drives `useGeolocation` state directly (fly on `success`, no fly on `fallback`).
  - [x] `responsive-layout.spec.ts`: tightened D6 to `.toHaveCount(0)` (full removal, not just `:visible`); added M6 (mobile) asserting the top-bar locate + settings are the single enabled pair with no floating duplicates and zoom present. D7 unchanged + green.
  - [x] `DesktopNavBar.test.tsx`: split the chrome test — kept the `'Innergård'` chip-disabled assertion (Story 9.7); removed the chevron-disabled assertions and added a test asserting `'Föregående filter'`/`'Nästa filter'` are no longer in the DOM.
  - [x] NEW `VenueSearchShell.test.tsx` (mobile): settings enabled + calls `openSettings`; locate wired to `requestLocation` + exposes `data-locate-state=idle`; pending → `aria-busy`+`data-locate-state=pending`; fallback → clickable + `data-locate-state=fallback`.
  - [x] `VenueList.test.tsx`: dropped the `categoryCafe`/`openNow` labels from the fixture; asserts the "Café"/"Öppet nu" buttons are no longer rendered.
  - [x] `VenueSearchCombobox.test.tsx`: added the AC4 bare-Enter regression test (type → Enter, no ArrowDown → first visible venue selected). Also relocated 9.5's ATDD locate-feedback scaffold (`LocateAndSwReload.atdd.test.tsx` part (a)) from `MapControls` to `VenueSearchShell` so 9.5's behaviour is guarded on the surviving surface.

- [x] **Task 6 — Test gate + regression verification (standard gate)**
  - [x] `npx tsc --noEmit` → 0 · `npx eslint . --quiet` → 0 · `npx vitest run` → all green. Before: **96 files / 817 tests**. After: **97 files / 822 tests** (+1 file = new `VenueSearchShell.test.tsx`; +5 tests net = new top-bar (4) + bare-Enter (1) + fly-to fallback (1) + chevron-absent (1) + category-absent stays 1, minus consolidated MapControls assertions). Also ran the touched e2e: `responsive-layout.spec.ts` (mobile+desktop) 13 passed / 13 project-skipped; `a11y-mobile` offline shell clean (map-primary a11y is a pre-existing `test.fixme` for venue-card contrast → Story 5.1, not reopened).
  - [x] No regression in MapControls (zoom/drag-fade/cleanup), DesktopNavBar (search/locate/settings/chips), VenueSearchShell/VenueSearchCombobox (typed search untouched — `useVenueSearch` call unchanged), VenueListControls sort buttons, messages-parity (18), and 9.5 locate-reliability (now on the top-bar surface). `useGeolocation` contract UNCHANGED — no `'denied'` status added.
  - [x] **Visual gate (manual affordance).** Ran `VISUAL_VALIDATE_PROVIDER=none ALLOW_MANUAL_VISUAL_VALIDATION=1 bash scripts/visual-validate.sh map-primary "/?_state=map-primary&_time=14:00" mobile` → exit 0 (manual mode). Wiped `.next` + restarted dev before capture. Performed the manual comparison — see Completion Notes. As predicted (removal-inverts-the-gate), the stale reference PNG diverges ONLY on the story's intended removals → routed to maintainer rebaseline; reference PNGs NOT edited.
  - [x] Status moved to `review` (story file). The orchestrator owns sprint-status/gate/commit/PR.

## Dev Notes

### Why this exists (root cause — Spine 3 of the Epic 9 triage)

Per the Epic 9 party-mode triage (root cause #3, "visual shell without plumbing"): controls were shipped as **disabled / `cursor-not-allowed` placeholders with no handler** — nav pager chevrons, list category buttons, the duplicate mobile-search settings button, and the map-chrome duplicate floating locate/settings buttons. On a live device these read as broken ("why is this greyed out / why doesn't this do anything?"). The maintainer decision that shapes every AC: **KEEP the top-bar locate + settings pair as the single mobile access point (ENABLE the disabled settings gear), REMOVE the duplicate floating locate + settings over the map.** Zoom +/- stay because they are the only genuinely-map-specific controls with no top-bar equivalent.

This is not just a maintainer whim — it realigns the code with the DESIGN AUTHORITY. The UX spec's mobile map-controls inventory (`ux-design-specification.md:676-684, 780-786`) lists **Zoom + / Zoom − / My location ONLY** for the floating GlassButton stack; a floating *settings* gear over the map was never in the spec, and settings belongs in the top bar / the settings modal. Removing the floating pair returns the map chrome to the specified control set while keeping the single wired top-bar access point.

### CRITICAL — Story 9.5 coordination (read before Task 1)

Story 9.5 ("Location & Onboarding Reliability", already merged on this branch, status `review`) landed locate-button reliability BEHAVIOUR. Its Completion Notes (`_bmad-output/implementation-artifacts/9-5-location-onboarding-reliability.md`, "AC4(a)") state explicitly: **9.5 wired the feedback on the FLOATING `MapControls` locate button ONLY** — `aria-busy="true"` + `data-locate-state` (idle/pending/success/fallback) + a `motion-safe:animate-pulse` icon on `pending`; the button stays clickable on `fallback` to retry. 9.5 deliberately **did NOT touch the top-bar surface and did NOT remove the duplicate floating pair** — it left that chrome consolidation to THIS story, and noted "9.6 should decide which locate control survives; the BEHAVIOUR now lives on the floating control and the new `busy`/`dataLocateState` props are reusable wherever the surviving button lands."

**Consequence for 9.6:** the floating `MapControls` locate button is the one being REMOVED (AC1). The surviving mobile locate control is the `VenueSearchShell` top-bar `Navigation` button — which today has NO state feedback. **9.5's reliability wiring (`data-locate-state` / `aria-busy` / pulse / clickable-on-fallback) must be PRESERVED by RELOCATING it onto that surviving button, not silently deleted with the floating one.** This is the single highest-risk mistake in the story: a naive "delete the floating locate button" drops 9.5's post-hydration reliability work. Task 1 makes the relocation explicit.

Also from 9.5's retro (`_bmad-output/auto-bmad/retro-notes/epic-9.md` §"Story 9-5", Phase-5 bullet): the 9.5/9.6 locate split was honoured — "9.5 wired feedback on the FLOATING MapControls locate button only … 9.6 owns that chrome consolidation." Nothing to undo; just relocate.

### The exact current chrome inventory (read these before touching code — verified against HEAD)

- **Mobile top search row (the surface to KEEP)** — `VenueSearchShell.tsx` `variant='mobile'` (mounted in `MapView.tsx:838-841`, `lg:hidden`, positioned top-left/right). It renders: the `VenueSearchCombobox`, a WORKING locate `<button>` (`:103-110`, `onClick={geolocation.requestLocation}`, icon `Navigation`, label `common.nav.myLocation`) with NO state feedback, and a hard-`disabled` settings `<button>` (`:111-118`, `opacity-60 cursor-not-allowed`, NO handler, label `venue.search.settings`). **AC1 keeps this pair; AC2 enables the gear; Task 1 adds the locate feedback.**
- **Floating map stack (the surface to TRIM)** — `MapControls.tsx` (mounted `MapView.tsx:1063`). It renders a 4-button glass stack: locate (`:129-147`, `map-control-my-location`, `lg:hidden`, carries 9.5's `busy`/`dataLocateState`/pulse), settings (`:148-155`, `map-control-settings`, `lg:hidden`), zoom-in (`:156-163`), zoom-out (`:164-171`). The comment at `:119-122` already documents "Locate + settings are `lg:hidden`: on desktop the top nav owns these; they remain on mobile where the bottom nav has no locate/settings." **AC1 removes the two `lg:hidden` buttons (locate + settings); zoom +/- stay at all breakpoints.** The success-fly-to `useEffect` (`:100-108`) and drag-fade (`:63-81`) are separate concerns — see Task 1's fly-to subtask.
- **Desktop nav (already fully wired — the placeholder here is the chevrons)** — `DesktopNavBar.tsx` has WORKING locate (`:79-85`, `desktop-nav-my-location`, `onClick={geolocation.requestLocation()}`) + settings (`:86-92`, `desktop-nav-settings`, `onClick={openSettings}`). Its dead controls are the two `HeaderChevron`s (`:49,69` sites; `:98-116` def) — `disabled cursor-not-allowed` pager arrows flanking the filter-chip row. **AC3 removes the chevrons.** The 8 filter chips (`:50-68`) are Story 9.7's — LEAVE THEM.
- **List controls (mobile category placeholders)** — `VenueListControls.tsx` mobile branch renders sort "sun"/"distance" (real, `:81-98`) + "Café" (`:99-106`, `Coffee`, `disabled`) + "Öppet nu" (`:107-114`, `UsersRound`, `disabled`). **AC3 removes the two disabled category buttons; the sort buttons stay.**
- **Search Enter behaviour** — `VenueSearchCombobox.tsx` `<Command shouldFilter={false}>` (cmdk 1.1.1). `onKeyDown` handles only `Escape` (`:135-141`). ArrowDown+Enter already selects (test-proven). **AC4 (low-priority) fills the bare-Enter-selects-first gap — verify cmdk's default highlight first.**

### Wiring reference — the canonical `openSettings` pattern (do NOT reinvent)

Both `MapControls` and `DesktopNavBar` open the settings modal identically:
```tsx
import { useSettings } from '@/lib/contexts/SettingsContext';
const { openSettings } = useSettings();
// ...
<button onClick={openSettings} aria-label={t('settings')}>…</button>
```
`useSettings()` returns `{ activeView, openSettings, openFeedback, close }` (`SettingsContext.tsx:14-19`). The default context value is a **no-op object, not a throw** (`:23-34`), so a settings trigger renders safely in a unit test without `SettingsProvider`. The real provider is mounted in `AppContextProviders`. Wire the `VenueSearchShell` gear with this exact pattern.

### Removal stories invert the visual gate (binding — from the 9.1 retro)

Per `epic-9.md` §"Story 9-1", Phase-5: "REMOVAL stories invert the visual gate: the reference screenshot is the OLD design, so a correct de-bloat implementation FAILS the LLM visual gate until the reference is re-baselined. Expected; the gate routes it to maintainer sign-off (dev agent is forbidden from editing references)." 9.6 removes on-screen chrome (floating locate/settings, chevrons, category buttons) and enables a previously-greyed gear — all deliberate visual changes. If the `map-primary` reference PNGs still depict the old floating pair, the gate FAILs BY DESIGN → capture the consolidated chrome for the maintainer, log it, and route the rebaseline to maintainer sign-off. **Do NOT force a pass and do NOT edit reference PNGs.**

### Visual gate on this host (HOST TOOLING BUG — applies to every Epic 9 frontend story)

`.claude/scripts/visual-validate.sh` screenshots via a `mktemp /tmp/impl-XXXXXX.png` path the Windows-native Playwright binary CANNOT write, so the AUTOMATED visual gate always errors "Could not screenshot dev server" on this host (retro-notes 9-2, confirmed again 9-4/9-5). Use the documented manual affordance: `VISUAL_VALIDATE_PROVIDER=none ALLOW_MANUAL_VISUAL_VALIDATION=1`, reproduce the gate's claude-sonnet-4-6 comparison byte-identically (same reviewer + verbatim prompt + on-disk reference PNG vs the corrected dev-server render captured to a Windows-safe path), and record the rationale in Completion Notes. **Leave the gate script UNMODIFIED** (maintainer should make the temp path Windows-portable — out of scope). Beware the **stale Turbopack CSS cache trap** (retro-notes 9-2): a running `next dev` can keep serving old CSS after an edit — a full `.next` wipe + restart may be needed before capturing; verify the served chunk before any visual capture.

### Constraints carried from Epic 9 retro-notes (binding)

- **Story 9.4 gating is untouched.** `VenueSearchShell` consumes `useVenueSearch` for typed search and is INTENTIONALLY left ungated (retro-notes 9-4, Phase-5: "`VenueSearchShell` (typed-search, intentionally LEFT ungated)"). 9.6 wires the settings gear + relocates locate feedback on this component — it must NOT change `VenueSearchShell`'s query firing or its `useVenueSearch` call (`:53-59`). Only touch the two trailing buttons.
- **Story 9.5 `useGeolocation` contract is shared and frozen for this story.** `status: 'idle' | 'pending' | 'success' | 'fallback'`, `coords` always defined, `requestLocation()`. Do NOT add a `'denied'` status (9.5 Open Question 2 / a maintainer follow-up, NOT this story). Relocated feedback keys off the existing `status`.
- **The desktop locate fly-to dependency.** `DesktopNavBar.tsx:76-78` explicitly relies on the fly-to-on-success effect that today lives in `MapControls` (`:100-108`). `MapControls` still mounts after this story (zoom stack), so the effect can stay — but confirm both the mobile top-bar locate AND `desktop-nav-my-location` still recenter on success. This is the subtlest regression in the story (see Task 1 fly-to subtask).

### Deferred-work items folded in (only overlapping items — chrome / dead-control / locate-surface)

- **Inert desktop-nav icons on the 404 page announced as disabled buttons** (`deferred-work.md`, "Deferred from: code review of 7-2-404-page", Target: None — conditional) — `NotFoundPage.tsx`'s `InertHeaderIcon` renders the SAME decorative location/settings chrome as `disabled` `<button aria-label>`s, mirroring the live `DesktopNavBar`. NOT in 9.6's scope (the live app, not the 404 page), and NOT reopened here — but noted because 9.6 changes what the "live" chrome looks like: if a reviewer flags the 404 chrome drifting from the (now-consolidated) live nav, that is the 404 page's own future concern, not a 9.6 regression. Do NOT edit `NotFoundPage.tsx`.
- _(Not folded in — out of subject:_ the AC3-VenueQuickInfo honest-distance defer [Target: 9.9], the AC4 denied-vs-fallback defer [Target: None], the venue-card/about contrast debt [Target: 5.1], and all SW/offline/sun-engine defers are unrelated to map-chrome consolidation / dead-control cleanup and are NOT reopened here.)_

### Project / file-impact map (expected touch list — confirm during dev, verified against HEAD)

- **Edit** `nextjs-app/components/custom/map/MapControls.tsx` — DELETE the two `lg:hidden` `GlassButton`s (locate `:129-147`, settings `:148-155`); keep zoom +/-; decide the fate of the success-fly-to `useEffect` (`:100-108`) + the now-unused `LocateFixed`/`Settings` imports + possibly `useGeolocation`/`useSettings` if the fly-to moves out.
- **Edit** `nextjs-app/components/custom/search/VenueSearchShell.tsx` — ENABLE the settings gear (`:111-118`: add `useSettings`, `onClick={openSettings}`, drop `disabled`/`opacity-60`/`cursor-not-allowed`); RELOCATE 9.5's locate feedback onto the `Navigation` locate button (`:103-110`: `data-locate-state`, `aria-busy`, pulse). Add the `Settings`/`Navigation` handling; do NOT touch `useVenueSearch`.
- **Edit** `nextjs-app/components/custom/layout/DesktopNavBar.tsx` — REMOVE both `HeaderChevron` render calls (`:49,69`) + the `HeaderChevron` component (`:98-116`) + the `ChevronLeft`/`ChevronRight` imports. LEAVE the 8 filter chips + the `<nav>` wrapper (Story 9.7).
- **Edit** `nextjs-app/components/composed/venue/VenueListControls.tsx` — REMOVE the "Café" (`:99-106`) + "Öppet nu" (`:107-114`) `SortButton`s + the `Coffee`/`UsersRound` imports. Prune `categoryCafe`/`openNow` from `VenueListControlsLabels` (`:10-19`) and its sole call site `MapView.tsx:1414-1415`. KEEP `unavailable` + the sort buttons.
- **Edit** `nextjs-app/messages/sv/venue.json` + `nextjs-app/messages/en/venue.json` — remove `controls.categoryCafe` + `controls.openNow` from BOTH locales (parity-guarded) IF fully pruning; keep `controls.unavailable`.
- **Possibly edit** `nextjs-app/components/composed/search/VenueSearchCombobox.tsx` — add the bare-Enter-selects-first `onKeyDown` branch (`:135-141`) ONLY if cmdk does not already do it (AC4, low-priority).
- **Possibly new / edit** a small shared success-fly-to hook or `MapView` wiring — ONLY if you move the fly-to out of `MapControls` so mobile top-bar + desktop-nav locate both keep recentring on success.
- **Tests:** update `MapControls.test.tsx`, `DesktopNavBar.test.tsx`, `responsive-layout.spec.ts`, `VenueList.test.tsx` (`VenueListControls` labels); add mobile-`VenueSearchShell` settings+locate-feedback test; add `VenueSearchCombobox` bare-Enter test (if Task 4 implemented). New/removed i18n keys auto-checked by `messages-parity.test.ts`.

### Technical stack (verified — do not drift)

Next.js 16.2.2 (Turbopack-default) + React 19 + Tailwind v4 (CSS-first tokens) + Motion 12.x (`motion/react`, NOT `framer-motion`) + MapLibre GL JS 5.x + TanStack Query 5.x + next-intl + `cmdk` 1.1.1 (the search combobox) + `lucide-react` (icons). The `frontend-component` skill applies to any button-styling touch (design-system-first: reuse the existing `bg-glass-standard`/`rounded-pill`/`shadow-button-float` classes the sibling buttons use; do not invent new tokens for the enabled gear — match the live locate button's classes). No new dependency is needed.

### Project Structure Notes

- Map chrome components live in `nextjs-app/components/custom/map/` (`MapControls.tsx` — architecture.md:776 "Zoom, locate-me, compass floating buttons"). Layout/nav in `nextjs-app/components/custom/layout/` (`DesktopNavBar.tsx` — architecture.md:806). Search in `nextjs-app/components/custom/search/` + `nextjs-app/components/composed/search/`. List controls in `nextjs-app/components/composed/venue/`.
- i18n message files: `nextjs-app/messages/{sv,en}/venue.json` (list/search copy) + `common.json` (nav copy). Any key removal must be mirrored across both locales for `messages-parity.test.ts`.
- No new component directory is created by this story (it removes/enables/relocates within existing files). If you extract a shared success-fly-to hook, it belongs in `nextjs-app/hooks/`.

### References

- [Source: CLAUDE.md] + [Source: AGENTS.md] — root agent rulebook (repo conventions, local Docker/WSL rules).
- [Source: project-context.md] — design + screen map (AI rules, screen inventory).
- [Source: nextjs-app/docs/design/DESIGN.md] — design tokens for the glass buttons (`bg-glass-standard`, `rounded-pill`, `shadow-button-float`); reuse the live locate-button classes for the enabled gear.
- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.6: Map Chrome Consolidation & Dead-Control Cleanup] — ACs + Design Gate Criteria (verbatim) + the maintainer keep-top-bar/remove-floating decision.
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:676-684 (Map controls / re-centre behaviour) + :577 (GlassButton tier) + :780-786 (mobile map-view chrome inventory) + :695 (DesktopNavBar 84px)] — DESIGN AUTHORITY corroborating the maintainer decision: the spec's mobile map-controls list is **Zoom + / Zoom − + My location ONLY** (NO floating settings gear over the map; settings is a top-bar/modal concern), and the drag-fade-to-60% + 500 ms success-pan are the behaviours to preserve. Removing the floating locate/settings aligns the code back to this spec.
- [Source: _bmad-output/planning-artifacts/architecture.md:776 (MapControls "Zoom, locate-me, compass floating buttons") + :806 (DesktopNavBar) + component map] — the component locations + the provider tree the settings/geolocation contexts flow through.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9 root cause #3 (visual shell without plumbing)] — the disabled-control-with-no-handler root cause.
- [Source: _bmad-output/implementation-artifacts/9-5-location-onboarding-reliability.md#Completion Notes → AC4(a); #Open Questions 3] — the 9.5/9.6 locate-surface split; 9.5 wired feedback on the FLOATING `MapControls` locate button; 9.6 decides which control survives; relocate the feedback, do not delete it.
- [Source: _bmad-output/auto-bmad/retro-notes/epic-9.md#Story 9-5 (Phase-5 "9.5/9.6 locate split honoured") + #Story 9-1 (Phase-5 "REMOVAL stories invert the visual gate") + #Story 9-2 (visual-validate /tmp host bug)] — binding cross-story + host-tooling constraints.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md#Deferred from: code review of 7-2-404-page] — the parallel inert 404-nav chrome (out of scope, do not edit).
- [Source: nextjs-app/components/custom/map/MapControls.tsx:100-108,119-155,190-217] — the floating locate/settings to remove, the success-fly-to effect, and the `GlassButton` (with 9.5's `busy`/`dataLocateState` props) to reuse.
- [Source: nextjs-app/components/custom/search/VenueSearchShell.tsx:86-119] — the mobile top-bar pair: working locate button + hard-disabled settings gear (the AC1/AC2 surface).
- [Source: nextjs-app/components/custom/layout/DesktopNavBar.tsx:49,69,79-92,98-116] — the working desktop locate/settings + the two dead `HeaderChevron`s to remove; the filter chips to LEAVE (Story 9.7).
- [Source: nextjs-app/components/composed/venue/VenueListControls.tsx:81-114] — the working sort buttons + the "Café"/"Öppet nu" disabled category buttons to remove.
- [Source: nextjs-app/components/composed/search/VenueSearchCombobox.tsx:105-141,205-225] — the cmdk `<Command shouldFilter={false}>` + `onKeyDown` (Escape only today) + item `onSelect` for the AC4 Enter-selects-first polish.
- [Source: nextjs-app/lib/contexts/SettingsContext.tsx:14-53] — `useSettings().openSettings` (no-op default value; the canonical settings-open pattern).
- [Source: nextjs-app/test/components/MapControls.test.tsx:143-337] — the floating-button assertions that WILL break (locate/settings removed).
- [Source: nextjs-app/test/components/DesktopNavBar.test.tsx:157-219] — ArrowDown+Enter already works; the chevron-disabled assertions (`:217-218`) that WILL break; the chip-disabled assertion (`:216`) to KEEP.
- [Source: nextjs-app/test/e2e/responsive-layout.spec.ts:240-263] — the desktop `map-control-my-location`/`map-control-settings` zero-visible + D7 locate-enabled assertions to verify/tighten.
- [Source: nextjs-app/messages/{sv,en}/venue.json (controls.categoryCafe/openNow/unavailable at venue.json:122-124, search.settings at venue.json:10) + common.json (nav.myLocation/settings/previous/next)] — the i18n keys touched/removed.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (auto-bmad dev-story delegate)

### Debug Log References

- Baseline gate (pre-edit): `tsc --noEmit` 0 · `eslint . --quiet` 0 · `vitest run` 96 files / 817 tests all green.
- Final gate: `tsc --noEmit` 0 · `eslint . --quiet` 0 · `vitest run` 97 files / 822 tests all green.
- E2E (touched spec): `playwright test responsive-layout.spec.ts --project=mobile --project=desktop` → 13 passed / 13 project-skipped. `playwright test --project=a11y-mobile` → offline-shell clean (the 4 venue-card a11y scans stay `test.fixme` for pre-existing contrast debt, Story 5.1).
- AC4 empirical check: throwaway jsdom test proved `cmdk` 1.1.1 (`shouldFilter={false}`) fires the first visible item's `onSelect` on a bare Enter (no ArrowDown) — logged `BARE_ENTER_CALLS [ '1' ]`. Temp test deleted; behaviour captured as a real regression test.
- Visual capture: `.next` wiped + dev restarted; captured the consolidated mobile chrome (iPhone-14, `/?_time=14:00`, onboarding bypassed via `sunnyseat_onboarded=1`). DOM audit confirmed: top-bar locate enabled + `data-locate-state` present, top-bar settings enabled (not disabled), floating locate/settings absent, zoom +/- present.

### Completion Notes List

- **Where 9.5's locate wiring landed (load-bearing decision):** relocated onto the `VenueSearchShell` mobile top-bar `Navigation` button (`data-testid="search-shell-my-location"`) — `aria-busy` on `pending`, `data-locate-state={geolocation.status}`, `motion-safe:animate-pulse` icon on `pending`; the button has no `disabled`, so it is inherently clickable on `fallback` to retry. 9.5's ATDD scaffold (`LocateAndSwReload.atdd.test.tsx` part (a)) was re-pointed from `map-control-my-location` to this surviving surface so the behaviour is still guarded (the file stays `describe.skip` only because part (b)'s SW-reload module path is dynamic; part (a) is now green against the relocated surface).
- **Where the success fly-to lives:** KEPT in `MapControls` (Open Question 2 default — smallest correct change). `MapControls` still mounts for the zoom stack; the shared `useEffect` fires on `geolocation.status === 'success'` and both the mobile top-bar locate and `desktop-nav-my-location` feed the same `useGeolocation` context, so both re-centre on success. Verified: `DesktopNavBar.test.tsx` + `responsive-layout.spec.ts` D7 green; new MapControls test drives the hook to `success`/`fallback` directly.
- **AC4 result:** cmdk already selects the first visible result on a bare Enter — NO explicit `onKeyDown` handler was added to `VenueSearchCombobox.tsx` (verified empirically). AC satisfied by cmdk's default; a documenting regression test guards it.
- **i18n full-removal (Task 3 choice):** fully removed `venue.controls.categoryCafe`/`openNow` (type members + `MapView.tsx` call site + both-locale JSON) AND the now-orphaned `common.json` `nav.previous`/`nav.next` chevron labels (both locales). `messages-parity` (18) green. `venue.controls.unavailable` kept.
- **Visual gate — manual comparison verdict (reproducing the claude-sonnet-4-6 gate):** the consolidated mobile render vs the stale `docs/design/references/screens/mobile/map-primary.png` diverges on EXACTLY and ONLY the story's intended changes: (1) floating locate + settings removed from the right-edge stack (reference still shows the old 4-button floating stack incl. crosshair-locate + gear); (2) "Kafé"/"Öppet nu" category chips removed from the list controls (reference still shows them); (3) the top-bar locate + settings pair is now the single enabled access point (the reference prototype frame has no top search row). Zoom +/-, tokens (`bg-glass-standard`/`rounded-pill`/`shadow-button-float`), hover/press states, and layout are otherwise unchanged. No unintended regressions. This is the documented "removal stories invert the visual gate" case → a re-baseline of `map-primary.png` (mobile + desktop) is a MAINTAINER decision. The dev did NOT edit or self-bless any reference PNG. Consolidated capture available at the session scratchpad (`map-primary-consolidated.png`) for the rebaseline.
- **No breaking changes** to public APIs/contracts. `useGeolocation` status contract (`idle|pending|success|fallback`) untouched — no `'denied'` status added (remains a 9.5/maintainer follow-up). The 9.4 `VenueSearchShell` ungated typed-search path (`useVenueSearch`) was not touched.

### File List

- `nextjs-app/components/custom/map/MapControls.tsx` — removed the two `lg:hidden` locate + settings `GlassButton`s + the `LocateFixed`/`Settings` imports + `useSettings`/`openSettings` + the dead `handleMyLocation`; kept the shared success-fly-to effect (comment refreshed) + zoom stack + drag-fade.
- `nextjs-app/components/custom/search/VenueSearchShell.tsx` — added `useSettings`; enabled the settings gear (`onClick={openSettings}`, dropped `disabled`/`opacity-60`/`cursor-not-allowed`); relocated 9.5's locate feedback onto the `Navigation` button (`aria-busy`/`data-locate-state`/pulse); added `data-testid`s.
- `nextjs-app/components/custom/layout/DesktopNavBar.tsx` — removed both `HeaderChevron` render calls + the component + the `ChevronLeft`/`ChevronRight` imports; left the filter chips + `<nav>` wrapper.
- `nextjs-app/components/composed/venue/VenueListControls.tsx` — removed the "Café"/"Öppet nu" `SortButton`s + `Coffee`/`UsersRound` imports + the `categoryCafe`/`openNow` type members; kept sort buttons + `unavailable`.
- `nextjs-app/components/custom/map/MapView.tsx` — removed the `categoryCafe`/`openNow` label call-site lines from `venueListControlLabels`.
- `nextjs-app/messages/sv/venue.json` + `nextjs-app/messages/en/venue.json` — removed `controls.categoryCafe`/`controls.openNow` (both locales).
- `nextjs-app/messages/sv/common.json` + `nextjs-app/messages/en/common.json` — removed the orphaned `nav.previous`/`nav.next` chevron labels (both locales).
- `nextjs-app/test/components/MapControls.test.tsx` — rewritten for the trimmed component (zoom + drag-fade + cleanup + shared fly-to via hook state).
- `nextjs-app/test/components/VenueSearchShell.test.tsx` — NEW: settings-gear + relocated locate-feedback coverage.
- `nextjs-app/test/components/DesktopNavBar.test.tsx` — chip-disabled kept; chevron assertions replaced with chevron-absent assertions.
- `nextjs-app/test/components/VenueList.test.tsx` — category-label fixture removed; category buttons asserted absent.
- `nextjs-app/test/components/VenueSearchCombobox.test.tsx` — added the AC4 bare-Enter regression test.
- `nextjs-app/test/components/LocateAndSwReload.atdd.test.tsx` — 9.5 ATDD part (a) re-pointed from `MapControls` to the surviving `VenueSearchShell` locate surface.
- `nextjs-app/test/e2e/responsive-layout.spec.ts` — D6 tightened to full removal; new M6 mobile single-pair assertion.

## Open Questions

1. **cmdk bare-Enter default (AC4, low-priority):** it is unconfirmed from docs whether `cmdk` 1.1.1 with `shouldFilter={false}` auto-highlights the first item so a bare Enter (no ArrowDown) already selects it. The dev verifies empirically first (dev-server: type → Enter without arrowing). If it already works, the AC is satisfied by a documenting test; if not, add the explicit `onKeyDown` Enter→first-visible branch. Not a blocker; AC4 is explicitly low-priority.
2. **Where the success-fly-to lives after removing the floating locate (Task 1):** `DesktopNavBar` relies on the fly-to `useEffect` that currently sits in `MapControls` (`:100-108`). `MapControls` still mounts (zoom stack) so the effect CAN stay, but it would then live in a component that no longer renders any locate button — a code-smell. Dev default: keep it in `MapControls` if it's the smallest correct change; extract to a shared hook only if that reads cleaner. Either way, BOTH the mobile top-bar locate AND `desktop-nav-my-location` must still recenter on success — verify. Not a blocker.
3. **Full-remove vs leave-unreferenced for `categoryCafe`/`openNow` i18n keys + label-type members (Task 3):** the story recommends full removal for cleanliness, but that touches the `VenueListControlsLabels` type + its `MapView.tsx`/`VenueList.tsx` call sites + both-locale JSON. If the ripple is larger than expected, leaving the keys unreferenced-but-present (removing only the buttons) is an acceptable fallback that keeps `messages-parity` green. Dev decides; record the choice. Not a blocker.
4. **Visual-reference rebaseline for the consolidated `map-primary` chrome:** removing the floating locate/settings + enabling the gear changes the mobile map chrome, so the stale `map-primary.png` reference will FAIL the visual gate by design (removal-inverts-the-gate). Capturing a new baseline is a maintainer rebaseline decision (the dev agent is forbidden from self-blessing references). Expect to route this to maintainer sign-off at QA handoff — flag it, do not block dev on it.

## Review Findings

**Code review (2026-07-01) — THIN Tier-A (epic-mode), R=1: Acceptance Auditor lens + dedicated Security review only (Blind/Edge intentionally not run in Tier A — not failed layers).**

**Verdict: PASS.** Auditor confirmed all 4 ACs satisfied + the CRITICAL Story-9.5 relocation check passes; Security reported a genuine zero. Triage yielded **0 surviving findings**.

- Critical: 0 · High: 0 · Medium: 0 · Low: 0
- Open Decisions: 0 · Deferrals logged: 0
- Failed layers: none
- Dismissed as noise: 3 — (1) [Low] AC4 test doesn't exercise the `filterResults={true}` "first VISIBLE" edge — dismissed as hypothetical: production `VenueSearchShell` always passes `filterResults={false}`, so the shipped call site is correctly covered; the gap has no realistic trigger. (2) [Low] Stale `DesktopNavBar` JSDoc still mentions the removed chevrons — dismissed as cosmetic doc drift, no behavioural/AC impact. (3) [Info] 404-page `NotFoundPage.tsx` inert chrome left untouched — dismissed as below-Low informational and explicitly scoped out by Dev Notes ("Do NOT edit `NotFoundPage.tsx`").
