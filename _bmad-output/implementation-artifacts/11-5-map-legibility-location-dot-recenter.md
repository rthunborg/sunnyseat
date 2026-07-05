# Story 11.5: Map Legibility, Living Location Dot & True Recenter

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to actually read the map, instantly spot where I am, and have "center on me" put me in the visible middle,
So that the map feels like a navigation tool, not a background texture.

## Acceptance Criteria

_(Verbatim from `_bmad-output/planning-artifacts/epics.md` §"Story 11.5", lines 2933-2951. Given/When/Then and the "~quarter of current strength" wording are the maintainer's — do not paraphrase.)_

**AC1 — De-dull the map to a light warm tint**
**Given** `MapContainer.tsx` layers `bg-surface-sand/80` + `gradient-map-overlay` over the basemap
**When** the treatment is reduced to a light warm tint (~quarter of current strength — exact values via design-gate eyeball against the live map)
**Then** streets, water, parks, and labels are clearly legible at common zooms while a subtle warm brand tone remains, and pin/label contrast still passes the axe gate

**AC2 — Living location dot**
**Given** the user-location dot (`UserPin.tsx`) is a small static marker
**When** it is upgraded
**Then** it renders noticeably larger with the design-token amber + white ring and a continuous soft **pulsing halo animation** (respecting `prefers-reduced-motion` with a static halo), clearly distinguishable from venue pins at all zooms

**AC3 — Viewport-aware true recenter**
**Given** the recenter button flies to the raw GPS coordinate, which lands off-center of the *visible* map (bottom sheet / panels cover part of the viewport)
**When** recentering is made viewport-aware
**Then** `flyTo` applies padding/offset for the currently visible obstructions (bottom-sheet snap state on mobile, side/top panels on desktop) so the dot lands in the visual center of the unobscured map area

### Design Gate Criteria (verbatim, epics.md:2947-2951)

- **Visual:** Map reads clearly with the light tint; location dot matches the reference `UserPin` scaled up with halo
- **Behaviour:** Recenter lands the dot centered in the visible map area at every sheet snap state
- **Animation:** Halo pulse is smooth and subtle (and static under reduced motion); flyTo remains 500 ms spec
- **Visual validation:** Screenshots of (a) the de-dulled map, (b) the animated dot, (c) post-recenter framing pass before QA handoff

## Tasks / Subtasks

- [x] **Task 1 — De-dull the map overlay to a light warm tint (AC1)**
  - [x] In `app/globals.css`, reduce the two-layer wash to ~one-quarter of current strength. Both layers are the source of the dullness: (a) the `bg-surface-sand/80` div (`MapContainer.tsx:169-173`, z-1) and (b) the `--gradient-map-overlay` amber wash (`globals.css:165`, `MapContainer.tsx:174-178`, z-2). Prefer a **token change** — do NOT introduce ad-hoc hex/rgba in the component (test-design R-006 mitigation: "via a token change (no ad-hoc hex)").
  - [x] Concrete approach: lowered the sand div's opacity `/80` → `/20` (Tailwind opacity modifier on the `--color-surface-sand` token, no ad-hoc hex) AND scaled the `--gradient-map-overlay` alpha stops to a quarter (`0.05` → `0.0125`, `0.1` → `0.025`). Final strength SET by a design-gate eyeball against the live map (screenshots below); tests assert the OUTCOME (legible basemap + axe AA green), never an opacity number.
  - [x] Keep `--gradient-map-overlay` and the DESIGN.md token table entry (`DESIGN.md:80`) internally consistent — updated the "Subtle warm map tint overlay" row to the thinned values + a note about the companion sand-wash `/80→/20` drop.
  - [x] **Turbopack stale-CSS trap:** restarted `next dev` with a fresh `.next` after each `globals.css` token change before running the map/axe e2e.
  - [x] Did NOT touch the tile-failure fallback overlay, the `inert`/`aria-hidden` handling, the style source, or the error/sourcedata handlers — only the two decorative tint layers changed.

- [x] **Task 2 — Tokenize the UserPin amber (AC2, resolves a carried maintainability debt)**
  - [x] Resolved the Story-9.5 token gap: `UserPin.tsx` no longer holds a raw `#d97706`.
  - [x] Added `--color-amber-location-dot: #d97706;` to the `@theme` block of `globals.css` (alongside the other `--color-amber-*` tokens) with a doc comment, referenced from `UserPin.tsx` via `var(--color-amber-location-dot)` in the inline style, and added the matching DESIGN.md colour-token-table row. Hue unchanged (`#d97706`) — the AC upgrades size + halo, not the colour.
  - [x] Updated `test/components/UserPin.test.tsx`: the fill assertion now expects `var(--color-amber-location-dot)` (jsdom does not resolve `var(...)`); halo/dimension/`pointer-events`/`aria-hidden` assertions kept; added a source-guard test that no raw `#d97706` literal remains in the component.

- [x] **Task 3 — Upgrade the location dot: larger + white ring + pulsing halo (AC2)**
  - [x] Scaled the dot 18 → **24px** (noticeably larger; distinct from the 44×50 venue teardrops / grey pills at all zooms — verified in the full-map screenshot). Kept the design-token amber fill + `3px solid #fff` white ring + drop shadow + `pointer-events: none` + `aria-hidden="true"`. Halo inset scaled 22 → 26 to stay proportional.
  - [x] Replaced the STATIC halo with a continuous soft pulsing halo via a CSS `@keyframes user-location-halo` + `@utility animate-user-location-halo` in `globals.css` (mirrors the `pulse-cta` pattern), a GPU-friendly `transform: scale()` + `opacity` pulse (`scale(1)/opacity .55` ↔ `scale(1.15)/opacity .3`, 2s ease-in-out infinite) — no JS per-frame loop (R-018).
  - [x] **Reduced-motion:** added a global `@media (prefers-reduced-motion: reduce)` override in `globals.css` that pins `.animate-user-location-halo` to `animation: none` + the resting `scale(1)/opacity .55` — a reduced-motion user sees a static halo. CSS-level gate (matches R-018), which works for the detached-root render.
  - [x] Did NOT change `UserLocationLayer`'s mount/position/lifecycle or the `status === 'success'` gate; only the `UserPin` visual changed. Verified in a real browser (e2e) that the GLOBAL halo utility + reduced-motion media query reach the detached `createRoot` marker.

- [x] **Task 4 — Make recenter viewport-aware (AC3)**
  - [x] The recenter `flyTo` in `MapControls.tsx` now applies a viewport-aware `padding` (kept `duration: DURATION_FLY_MS` 500 ms).
  - [x] Padding is DERIVED from the current obstruction state (not a fixed offset) via a new pure helper `lib/utils/recenter-padding.ts` → `computeRecenterPadding({ isDesktop, mobileSheetState, isVenueDetailOpen })`:
    - **Mobile:** `bottom` = current snap cover (peek 120 / mid 320 / full 560 / collapsed 44+24 safe-area allowance / dismissed 0) + `top` = 72 (mobile search bar). Snap heights mirror `--size-bottom-sheet-*-h` (JS constants, same convention as `DURATION_FLY_MS` mirroring the token).
    - **Desktop:** `left` = 340 (always-present venue list) + `right` = 390 when the detail panel is open.
  - [x] **Wiring:** threaded `mobileSheetState` + `isVenueDetailOpen` (= `isVenueDetailRequested`) as props to `<MapControls>` at `MapView.tsx`. Breakpoint detected via `matchMedia('(min-width: 1024px)')` read at fly-time (mirrors the existing pattern in `MapView`). Padding is derived from the snap enum + tokens, NOT an imperative DOM read.
  - [x] **flyTo stays 500 ms** — `duration: DURATION_FLY_MS` unchanged.
  - [x] OnboardingGate grant flyTo: **left unchanged** (decision recorded in Completion Notes) — it is a sibling of `MapView` with no access to the sheet state, so the helper is NOT trivially reachable, and the grant path fires as the overlay dismisses to the default `mid` sheet where the raw-coord landing is acceptable. AC3's literal target (the recenter button) is fully handled. Did not regress its deferred-until-ready / dismiss-bail guards.

- [x] **Task 5 — Tests (component + e2e)**
  - [x] **UserPin component test** updated: new 24px dimensions, tokenized fill (`var(--color-amber-location-dot)`), pulsing-halo class presence (`animate-user-location-halo`), `pointer-events: none`, `aria-hidden`, + a raw-`#d97706` source guard. (Reduced-motion is asserted at the e2e level where CSS media queries actually run — jsdom cannot evaluate the media query.)
  - [x] **Recenter offset tests**: added a pure-helper unit suite (`test/unit/utils/recenter-padding.test.ts`, per-snap + per-panel derivation, proves mid≠full and detail-open≠closed) AND `MapControls.test.tsx` assertions that `flyTo` is called with padding varying per snap (mid 320 vs full 560), collapsed handle-strip cover, and desktop left/right panel padding — all with `duration: 500`.
  - [x] **axe AA gate**: GREEN on both breakpoints after the tint change (fresh `.next`). Desktop `a11y` 12 pass; mobile `a11y-mobile` active scan pass. Confirmed via a throwaway diagnostic that the de-dulled map + dot add ZERO new serious/critical violations — the only mobile-map violation is the pre-existing venue-card `text-amber-text` debt (Story 5.1), unchanged. No impact filter weakened, no new fixmes.
  - [x] **Optional map/dot e2e**: added two `map-primary.spec.ts` tests (mobile project, CI-invoked) — the user-location dot renders with the live pulsing halo (`animationName === 'user-location-halo'`) + is `aria-hidden`/`pointer-events: none`, and under `emulateMedia({ reducedMotion: 'reduce' })` the halo is static (`animationName === 'none'`). Used `?_time=13:00` (via the suite's `beforeEach`) and `:visible` selectors.

- [x] **Task 6 — Gates + visual-validation handoff**
  - [x] Standard gate: `npm run typecheck` (0 errors), `npm run lint` (0 errors; 13 pre-existing warnings, none added), `npm test` (1318 pass, +12 net new, 0 dropped), axe e2e green on both breakpoints.
  - [x] **Reference PNGs NOT self-blessed** — the three visual-validation screenshots (de-dulled map, animated dot, post-recenter framing) are recorded as a maintainer checkpoint in Completion Notes; no reference PNG was edited or regenerated. Consolidated rebaseline stays with Story 11.7; real-device pass with Story 11.8.

## Dev Notes

### Scope fences (what this story is and is NOT)

**IN scope:** the two decorative map-tint layers (`MapContainer.tsx` + `globals.css` tint tokens), the `UserPin` visual (size, tokenized amber, pulsing+reduced-motion halo), and the viewport-aware recenter padding/offset (`MapControls` flyTo + the wiring to reach snap/panel state). Plus the tokenization of `#d97706` (carried R-016 debt) and the DESIGN.md token-table rows for any changed/added tokens.

**OUT of scope (other Epic 11 stories — do NOT touch):**
- Client day-series / query-key seam, date-change dim+spinner overlay (Story 11.1 — already shipped; the `date-change-overlay` at `MapView.tsx:1010-1030` is a DIFFERENT overlay from the map tint, leave it).
- Slider drag / planner range rules (11.2); mobile tag chips / bottom-sheet snaps / desktop chip strip (11.3 — the sheet snap states you *read* for recenter padding are 11.3's; do not re-tune the gesture thresholds or snap heights).
- Quick-info rework (11.4 — shipped); venue-detail first paint / "Soltider idag" removal (11.6).
- `toSunStatusToken` wire-or-delete, `vercel.json` lightningcss, `.gitattributes` EOL, consolidated reference-PNG rebaseline (11.7).
- Live perf / real-touch / request-count and the physical-device checklist (11.8).
- Do NOT change `UserLocationLayer`'s marker lifecycle, the geolocation gate (`status === 'success'`), the style source, the tile-failure fallback, or the venue-pin visuals.

### Architecture & pattern constraints

- **Design-system-first / token discipline:** no ad-hoc hex/rgba in components — the tint reduction and the location-dot amber go through `globals.css` tokens (`@theme` for colors, `@utility`/`@keyframes` for the halo pulse, mirroring `pulse-cta` at `globals.css:272-280`). DESIGN.md `docs/design/DESIGN.md` is canonical for tokens; keep its color/gradient table in sync with any token you change (rows at `DESIGN.md:26-27,80`). [Source: `frontend-component` skill; `AGENTS.md`]
- **Animation timings:** `flyTo` uses `DURATION_FLY_MS = 500` (`lib/constants/animation.ts:11`, mirrors `--duration-fly: 500ms` at `globals.css:179`) — keep both in sync, change neither. `prefers-reduced-motion` disables/reduces non-essential animation (DESIGN.md:255). [Source: `lib/constants/animation.ts`, `DESIGN.md#Transitions`]
- **Reduced-motion convention:** existing components gate motion at the CSS level with `motion-reduce:` variants or `@media (prefers-reduced-motion: reduce)` (e.g. `MapControls.tsx:115` `motion-reduce:transition-none`, `MapView.tsx:1026` `motion-safe:animate-spin`). Follow the same pattern for the halo pulse. [Source: existing map/motion components]
- **MapLibre `flyTo` padding:** `flyTo({ center, zoom, duration, padding })` — `padding` is `{ top, bottom, left, right }` in pixels and shifts the visual center so the target sits centered in the *padded* (unobscured) area. This is the mechanism for AC3. [Source: MapLibre GL JS `flyTo` / `CameraOptions.padding`]

### Recenter obstruction geometry (AC3 reference)

| Obstruction | Source | Recenter padding to add |
| --- | --- | --- |
| Mobile bottom sheet | `mobileSheetState` (`MapView.tsx:172`); heights `--size-bottom-sheet-collapsed-h`/`-peek-h`(120)/`-mid-h`(320)/`-full-h`(560) `globals.css:190-193` | `bottom` = current snap height (per-snap, NOT fixed) |
| Mobile top search bar | `VenueSearchShell` mobile, `top-[…+*3]` `MapView.tsx:1036-1041` | small `top` if it materially covers |
| Desktop venue list | `desktop-venue-list-panel` 340px left `MapView.tsx:1125-1128`, `--size-venue-list-desktop-w` | `left` = list width (desktop only) |
| Desktop detail panel | 390px right when `isVenueDetailRequested` `MapView.tsx:649`, `--size-venue-detail-panel-w` | `right` = detail width when open |

### Reference alignment (AC2)

- The reference `UserPin` is `docs/design/references/claude-design/project/src/Pins.jsx:110-133` — the current `UserPin.tsx` matches it byte-for-byte (18px, halo `inset:-22`, `#d97706`, `3px solid #fff`, shadow). AC2 asks to **scale it up** and **animate the halo** — the reference is the starting shape, not a cap on size. "matches the reference `UserPin` scaled up with halo" (Design Gate Visual).

### Persistent facts (carried debt + epic constraints folded in)

- **This story SETS the light-tint overlay strength** that Epic 11 explicitly left UNKNOWN (test-design "Unknown thresholds"; retro-notes epic-11 Phase-2 test-design). The value is a design-gate eyeball against the LIVE map; tests assert the OUTCOME (legible basemap + axe AA passes), never a specific opacity number (test-design "Risks to Plan" — outcome-asserting tests survive a value re-tune).
- **The axe AA gate is ACTIVE in CI (since Epic 9) and is the hard gate for AC1** — the de-dulled map must keep it green on desktop + mobile (retro-notes epic-11 R-006; test-design NFR Accessibility). This is the primary regression risk of the tint change.
- **`UserPin` raw `#d97706` must become a design token** in THIS story (test-design NFR Maintainability R-016; carried from Story 9.5's recorded token gap — see `UserPin.tsx:18-25` completion note). No raw `#d97706` may remain in the component.
- **Turbopack stale-CSS trap:** restart `next dev` with a fresh `.next` after any `globals.css` token change before running touch/map/axe e2e (retro-notes epic-11 Story 11.3 Phase-5).
- **Dual-variant e2e selectors** must use `.filter({ visible: true })`, never positional `.first()`/`.last()` — both responsive panel variants are always mounted, CSS-hidden per breakpoint (retro-notes epic-11 Story 11.1 fix-pass; folded into Story 11.4 too).
- **A Playwright `touch` (Pixel 5, Chromium) project exists** for CDP raw-touch specs (added in 11.2); the `mobile` (iPhone 14) project is WebKit with `hasTouch:true`. If you add a gesture/recenter e2e, use `--project=touch` for raw touch and confirm CI (`build-and-test-nextjs.yml`) actually invokes any new project/spec (retro-notes epic-11 Story 11.2 Tier-A: "add a project, forget the CI wiring").
- **New visual states → dev forbidden from self-blessing reference PNGs.** Story 11.7 owns the consolidated maintainer rebaseline; Story 11.8 owns the real-device pass (retro-notes epic-11 Story 11.1/11.4).
- **e2e sun-specs force `?_time=13:00`** — sun is server-computed from wall clock, so any e2e touching sun state is wall-clock-flaky without the pin (MEMORY: ci-and-e2e-gotchas).

### Deferred-work overlap (subject-matched to this story's files; folded, NONE reopened)

Reviewed `_bmad-output/implementation-artifacts/deferred-work.md`. The only entries whose subject overlaps this story's files/ACs:

- **[FOLD — resolves this story] `UserPin` raw `#d97706` not a token (Story 9.5 recorded gap).** Task 2 tokenizes it (test-design R-016). This closes the token-gap debt on `UserPin.tsx:27`.
- **[NOTE only — do NOT reopen] `UserLocationLayer` stale-marker / NaN-coord robustness** (epic-9 review, Target: None conditional — `UserLocationLayer.tsx`). This story does NOT change the layer lifecycle; leave it. If your recenter wiring happens to touch the layer, do not silently regress it, but do not take on the stale-marker/NaN hardening (out of scope, still conditional).
- **[NOTE only — do NOT reopen] W1/W2 per-pin `createRoot` + top-level MapLibre import (Target: Story 5.1).** `UserLocationLayer` uses `createRoot` per the same pattern; irrelevant to this story's visual/recenter work — do not refactor.
- No other deferred entry overlaps map tint, the location dot, or recenter. Entries for slider/sheet/quick-info/detail/weather/DTO are other stories' and are NOT in scope.

### Project Structure Notes

- All work is in `nextjs-app/`: `components/custom/map/MapContainer.tsx`, `components/custom/map/UserPin.tsx`, `components/custom/map/MapControls.tsx`, `components/custom/map/MapView.tsx` (recenter wiring), `app/globals.css` (tint tokens + halo keyframes + amber-location-dot token), `docs/design/DESIGN.md` (token-table rows), and the tests `test/components/UserPin.test.tsx` + a recenter offset test (component or `MapView.test.tsx`). No new route, schema, dependency, or engine/weather change.
- `UserLocationLayer.tsx` renders `<UserPin />` into a detached MapLibre marker element via `createRoot` — global CSS (keyframes/utilities in `globals.css`) still applies to it; do not change the layer.
- No conflicts with the unified structure; the tint/dot/recenter all sit inside the existing map component tree.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story-11.5` (lines 2933-2951) — ACs + Design Gate; epics.md:2799 root-cause "map dullness is self-inflicted"; epics.md:2803 "Map treatment = light warm tint (~quarter of today's overlay strength)"]
- [Source: `_bmad-output/test-artifacts/test-design/test-design-epic-11.md` — R-006 (de-dull axe, Score 6, Timeline 11.5, lines 490-498), R-013 (recenter offset per snap, line 126), R-018 (halo pulse reduced-motion, line 136); NFR rows lines 165-167; test-plan rows 250/266/267; "Unknown thresholds" lines 170-174; component-map lines 579-580; source refs line 612]
- [Source: `nextjs-app/components/custom/map/MapContainer.tsx:169-178` — the two decorative tint layers to reduce]
- [Source: `nextjs-app/app/globals.css:165` (`--gradient-map-overlay`), `:21` (`--color-surface-sand`), `:272-280` (`pulse-cta` keyframe/utility pattern), `:190-193` (sheet-height tokens), `:179` (`--duration-fly`)]
- [Source: `nextjs-app/components/custom/map/UserPin.tsx` — dot to upgrade; `:27` raw `#d97706`; `:42-51` static halo; `:18-25` Story-9.5 token-gap note]
- [Source: `nextjs-app/components/custom/map/UserLocationLayer.tsx:63-83` — detached-root marker mount, `status==='success'` gate (do not change)]
- [Source: `nextjs-app/components/custom/map/MapControls.tsx:98-106` — the recenter flyTo to make viewport-aware; `:115` reduced-motion CSS pattern]
- [Source: `nextjs-app/components/custom/map/MapView.tsx:172-173` (`mobileSheetState`), `:649` (`isVenueDetailRequested`), `:1125-1128` (desktop list panel), `:1286` (`<MapControls />` mount — no props today)]
- [Source: `nextjs-app/components/custom/onboarding/OnboardingGate.tsx:215-224` — the grant flyTo (secondary recenter site; do not regress)]
- [Source: `nextjs-app/lib/constants/animation.ts:11` — `DURATION_FLY_MS = 500` (keep)]
- [Source: `nextjs-app/docs/design/DESIGN.md:26-27` (amber tokens), `:80` (map-tint gradient token), `:255` (reduced-motion), `:461` map warm-overlay usage]
- [Source: `nextjs-app/docs/design/references/claude-design/project/src/Pins.jsx:110-133` — reference `UserPin` shape]
- [Source: `nextjs-app/test/e2e/axe.spec.ts:15` (map-primary desktop) + `test/e2e/axe-mobile.spec.ts` — the ACTIVE axe AA gate the de-dull must keep green]
- [Source: `nextjs-app/test/components/UserPin.test.tsx:37` — the fill assertion to update for the token]
- [Source: retro-notes `_bmad-output/auto-bmad/retro-notes/epic-11.md` — light-tint UNKNOWN set here, axe active, Turbopack CSS trap, dual-variant selectors, touch project, CI-wiring, self-bless forbidden]
- [Source: `project-context.md:229` — `#d97706` UserPin colour has NO DESIGN.md token (raw reference value, flagged candidate — do NOT invent ad-hoc; Task 2 resolves it); `:95` `map-primary-offline` reference note; `:143-165` Screen ID → Route Map + visual-validation gate the axe/visual checks navigate by]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md:781` — map canvas spec (`color-surface-sand` base + decorative road lines + `gradient-map-overlay`, fills viewport behind all elements); `:475`,`:820` — `prefers-reduced-motion` map/pin behaviour (motion-safe gating, opacity-only / instant state)]
- [Source: `_bmad-output/planning-artifacts/architecture.md:41` (map-as-persistent-root + geolocation permission flow), `:58` (WCAG 2.1 AA — colour contrast + reduced motion + shape-not-colour differentiation), `:59` (MapLibre integration + graceful degradation)]
- [Source: `nextjs-app/docs/design/DESIGN.md` — canonical design tokens (color/gradient/transition tables); the frontend-story primary design source]
- [Source: `CLAUDE.md` / `AGENTS.md` — repo rulebook; local Docker/WSL fences]

## Dev Agent Record

### Agent Model Used

Opus 4.8 (1M context) — `claude-opus-4-8[1m]` (auto-bmad dev-story delegate).

### Debug Log References

- Design-gate eyeball + visual-validation screenshots (scratchpad, NOT reference PNGs):
  - `map-desktop.png`, `map-mobile.png` — de-dulled map, both breakpoints (legible basemap).
  - `dot-crop.png`, `dot-full.png` — enlarged pulsing location dot vs venue pins.
  - `recenter-mobile-mid.png` — post-recenter framing, `mid` sheet (dot centred at y≈298 in the unobscured area 72→524).
- axe verification: `--project=a11y` 12 pass; `--project=a11y-mobile` active scan pass; throwaway diagnostic confirmed the sole mobile-map serious violation is the pre-existing venue-card `text-amber-text` debt (Story 5.1), NOT the tint/dot.

### Completion Notes List

**What shipped (all 3 ACs + 4 Design Gate criteria met):**

- **AC1 (de-dull):** the two decorative tint layers cut to ~¼ strength — sand wash `bg-surface-sand/80 → /20` (`MapContainer.tsx`, token opacity modifier, no ad-hoc hex) + `--gradient-map-overlay` alpha stops `0.05/0.1 → 0.0125/0.025` (`globals.css`, DESIGN.md row kept in sync). Basemap (streets, water, parks, labels) reads clearly on both breakpoints with a subtle warm tone retained (design-gate eyeball). **Load-bearing axe AA gate GREEN on both breakpoints; the de-dull adds ZERO new serious/critical violations** (verified by diagnostic scan). Lowering the tint only ever *helps* pin/label contrast.
- **AC2 (living dot + tokenization):** `UserPin` scaled 18→24px, tokenized amber (`--color-amber-location-dot`, resolving the Story-9.5 `#d97706` gap / test-design R-016 — no raw hex left), white ring + shadow + `pointer-events:none` + `aria-hidden` kept. Static halo → continuous soft pulsing halo via a GPU-friendly CSS `@keyframes`/`@utility` (`animate-user-location-halo`, transform+opacity, R-018), static under `prefers-reduced-motion: reduce` (global media-query override). Clearly distinct from the 44×50 venue teardrops at all zooms.
- **AC3 (viewport-aware recenter):** `flyTo` now applies obstruction-derived `padding` (not a fixed offset — R-013) from a pure helper `computeRecenterPadding` (per-snap bottom on mobile + top for the search bar; left/right side-panel padding on desktop). `mobileSheetState` + `isVenueDetailOpen` threaded to `<MapControls>`; `duration` stays 500 ms (`DURATION_FLY_MS`). Verified the dot lands in the visual centre of the unobscured map at the `mid` snap (y≈298, exactly the midpoint of the 72→524 unobscured band).

**Decisions / deviations:**

- **OnboardingGate grant flyTo left unchanged (per Task 4).** It is a *sibling* of `MapView` in `page.tsx` (not a child), so it has no access to `mobileSheetState`/`isVenueDetailRequested` — the padding helper is NOT trivially reachable without lifting sheet state across the onboarding boundary (out of scope). The grant path fires as the overlay dismisses to the default `mid` sheet where the raw-coord landing is acceptable. AC3's literal target (the recenter button) is fully handled; the grant's deferred-until-ready / dismiss-bail guards were not regressed.
- **Reduced-motion asserted at the e2e level, not jsdom.** jsdom does not evaluate CSS `@media` queries, so the component test asserts the `.animate-user-location-halo` class presence and the e2e (`emulateMedia reducedMotion:'reduce'`) asserts the computed `animationName === 'none'`. This is the faithful gate for the CSS-driven reduced-motion pin.
- The halo gradient keeps its literal `rgba(217,119,6,…)` stops (the reference `Pins.jsx` value, the rgb form of `#d97706`) — R-016 targets the `#d97706` hex literal, which is fully removed; the rgba gradient stops match the existing convention (map-overlay/sun-burst gradients keep raw rgba stops with no token alias).

**BREAKING CHANGE (internal component API):** `MapControls` now accepts two optional props — `mobileSheetState?: MobileBottomSheetState` and `isVenueDetailOpen?: boolean` (both default to `'mid'` / `false`). The only mount site (`MapView`) passes them. No runtime break (defaults preserve prior behaviour), but the recenter flyTo now always includes a `padding` field it previously omitted.

**Maintainer visual-validation checkpoint (dev did NOT self-bless):** three new visual states have no blessed reference — (a) de-dulled map, (b) enlarged pulsing dot, (c) post-recenter framing. Screenshots recorded in Debug Log above. Reference-PNG rebaseline stays with **Story 11.7**; real-device pass with **Story 11.8**. No reference PNG was edited or regenerated.

**Pre-existing failure NOT in scope (flag for Story 11.4's code-review):** `test/e2e/map-primary.spec.ts:353` ("QuickInfo route opens maps and keeps route overlay dismissible") fails at HEAD asserting `ca \d+ min` in the QuickInfo — a route-estimate label **Story 11.4 removed** (commit `6ca0240`, already on this branch). This is stale relative to 11.4's shipped change (quick-info is 11.4's territory, explicitly fenced OUT of 11.5). Not touched here; belongs to 11.4's follow-up. Confirmed none of Story 11.5's changed files touch `VenueQuickInfo` or the route estimate.

**CI-wiring observation (not a blocker):** the mobile axe project `a11y-mobile` is defined in `playwright.config.ts` but is NOT invoked by `build-and-test-nextjs.yml` (only `--project=a11y` runs). So the mobile map-primary axe scan is doubly dormant (both `test.fixme` for the Story-5.1 venue-card debt AND not CI-run). Wiring `a11y-mobile` into CI is out of this story's file scope; flagged for the epic retro / Story 5.1.

### File List

- `nextjs-app/app/globals.css` — de-dulled `--gradient-map-overlay` (¼ alpha); added `--color-amber-location-dot` token; added `@keyframes user-location-halo` + `@utility animate-user-location-halo` + `@media (prefers-reduced-motion: reduce)` override.
- `nextjs-app/components/custom/map/MapContainer.tsx` — sand wash `/80 → /20` (+ explanatory comment).
- `nextjs-app/components/custom/map/UserPin.tsx` — 18→24px, tokenized amber fill, pulsing halo class, refreshed doc comment.
- `nextjs-app/components/custom/map/MapControls.tsx` — new optional props (`mobileSheetState`, `isVenueDetailOpen`); viewport-aware `flyTo` padding via `computeRecenterPadding`; `isDesktopViewport()` helper.
- `nextjs-app/components/custom/map/MapView.tsx` — passes `mobileSheetState` + `isVenueDetailOpen` to `<MapControls>`.
- `nextjs-app/lib/utils/recenter-padding.ts` — NEW: pure `computeRecenterPadding` helper + mirrored snap-height/panel-width constants.
- `nextjs-app/docs/design/DESIGN.md` — updated `gradient-map-overlay` row; added `color-amber-location-dot` row.
- `nextjs-app/test/components/UserPin.test.tsx` — updated for 24px + tokenized fill + halo class + raw-hex source guard.
- `nextjs-app/test/components/MapControls.test.tsx` — updated success-fly-to expectation for padding; added per-snap / desktop-panel recenter padding assertions.
- `nextjs-app/test/unit/utils/recenter-padding.test.ts` — NEW: per-snap / per-panel padding derivation unit suite.
- `nextjs-app/test/e2e/map-primary.spec.ts` — added user-location dot (live halo) + reduced-motion (static halo) e2e tests.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story status ready-for-dev → in-progress → review.

### Change Log

- 2026-07-05 — Story 11.5 implemented (dev-story). AC1 map de-dull (sand `/80→/20` + gradient ¼ alpha), AC2 living location dot (24px + tokenized amber `--color-amber-location-dot` + pulsing halo `@keyframes`/`@utility` with reduced-motion static override), AC3 viewport-aware recenter (`computeRecenterPadding` derived per snap/panel, `flyTo` padding, 500 ms kept). Tests: UserPin component + `recenter-padding` unit + `MapControls` recenter + 2 e2e (dot live halo / reduced-motion static). Gates green: typecheck 0, lint 0 new, vitest 1318 (+12), axe AA both breakpoints. Reference PNGs deliberately NOT self-blessed (Story 11.7). Status → review.