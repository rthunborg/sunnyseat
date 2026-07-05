# Story 11.5: Map Legibility, Living Location Dot & True Recenter

Status: ready-for-dev

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

- [ ] **Task 1 — De-dull the map overlay to a light warm tint (AC1)**
  - [ ] In `app/globals.css`, reduce the two-layer wash to ~one-quarter of current strength. Both layers are the source of the dullness: (a) the `bg-surface-sand/80` div (`MapContainer.tsx:169-173`, z-1) and (b) the `--gradient-map-overlay` amber wash (`globals.css:165`, `MapContainer.tsx:174-178`, z-2). Prefer a **token change** — do NOT introduce ad-hoc hex/rgba in the component (test-design R-006 mitigation: "via a token change (no ad-hoc hex)").
  - [ ] Concrete approach: lower the sand div's opacity (e.g. `bg-surface-sand/20` — ~quarter of `/80`) AND scale the `--gradient-map-overlay` alpha stops down to ~a quarter (the current stops are `rgba(245,158,11,0.05)` / `rgba(249,115,22,0.1)` → roughly `0.0125` / `0.025`, or drop the sand layer's role to the primary tint and thin the gradient). The EXACT final values are a **design-gate eyeball against the live map** (this story SETS the light-tint overlay strength the epic left UNKNOWN — retro-notes epic-11 Phase-2 test-design; test-design "Unknown thresholds" §). Verify legibility by loading the running map; do NOT invent a number and skip the eyeball.
  - [ ] Keep `--gradient-map-overlay` and the DESIGN.md token table entry (`DESIGN.md:80`) internally consistent — if you change the gradient token value, update the DESIGN.md "Subtle warm map tint overlay" row so the doc matches the source.
  - [ ] **Turbopack stale-CSS trap:** after any `globals.css` token change, restart `next dev` with a fresh `.next` before running the map/axe e2e (a token can resolve to an empty string until restart — retro-notes epic-11 Story 11.3 Phase-5). This applies to the local dev-server the e2e drives.
  - [ ] Do NOT touch the tile-failure fallback overlay (`MapContainer.tsx:179-188`), the `inert`/`aria-hidden` handling, the style source, or the error/sourcedata handlers — this task is purely the two decorative tint layers.

- [ ] **Task 2 — Tokenize the UserPin amber (AC2, resolves a carried maintainability debt)**
  - [ ] `UserPin.tsx:27` hardcodes the raw reference value `const USER_PIN_AMBER = '#d97706'` and Story 9.5 deliberately left it un-tokenized (recorded in its Completion Notes as a token gap). Test-design NFR Maintainability (R-016) requires: "The `UserPin` amber becomes a design token (no raw `#d97706`)". Resolve it in THIS story.
  - [ ] There is no existing DESIGN.md token equal to `#d97706` — the closest are `--color-amber-pin #f1b100` and `--color-amber-primary #ffbf00` (DESIGN.md:26-27), neither an exact match. Add a new named token for the location dot (e.g. `--color-amber-location-dot: #d97706;` in the `@theme` block of `globals.css` alongside the other `--color-amber-*` tokens) and reference it from `UserPin.tsx` (via `var(--color-amber-location-dot)` in the inline style, or a Tailwind color class if one is generated). Add the matching DESIGN.md color-token-table row. Keep the visual value `#d97706` (the reference/Story-9.5 fill) unless the design-gate eyeball says otherwise — the AC upgrades size + halo, not the hue.
  - [ ] Update `test/components/UserPin.test.tsx:37` — it asserts `dot.style.background === 'rgb(217, 119, 6)'` (jsdom-normalized `#d97706`). If you route the fill through a CSS variable, jsdom will not resolve `var(...)` to rgb; adjust the assertion to match the new source (assert the `var(--color-amber-location-dot)` string, or keep the resolved hex if you keep a literal fallback). Keep the halo/dimension/`pointer-events`/`aria-hidden` assertions intact.

- [ ] **Task 3 — Upgrade the location dot: larger + white ring + pulsing halo (AC2)**
  - [ ] In `UserPin.tsx`, scale the dot **noticeably larger** than 18px (the current size, matched byte-for-byte to the reference `Pins.jsx:126` — `docs/design/references/claude-design/project/src/Pins.jsx`). Keep the design-token amber fill + the `3px solid #fff` white ring + drop shadow. The dot must be "clearly distinguishable from venue pins at all zooms": venue sun pins are 44×50 amber teardrops (`Pins.jsx:26-58`) and shaded pins are grey pills — the location dot is a round amber+white-ring dot with a halo, so scaling it up (e.g. ~22-28px) keeps it distinct from those. Keep `pointer-events: none` (it must never intercept a map drag or venue-pin tap — `UserPin.tsx:38`) and `aria-hidden="true"` (decorative).
  - [ ] Replace the STATIC halo (`UserPin.tsx:42-51`, an inset radial-gradient div) with a **continuous soft pulsing halo animation**. Drive it via a CSS `@keyframes` + `@utility` in `globals.css` (mirror the existing `pulse-cta` pattern at `globals.css:272-280`) so it is GPU-friendly CSS, NOT a JS per-frame loop (test-design R-018). A subtle scale+opacity pulse on the halo layer (e.g. keyframe `0%/100% { transform: scale(1); opacity: .55 } 50% { transform: scale(1.15); opacity: .3 }`) reads as a "living" dot. The pulse must be "smooth and subtle" (Design Gate Animation).
  - [ ] **Reduced-motion (AC2 + Design Gate Animation): static halo under `prefers-reduced-motion`.** Gate the pulse with a CSS `@media (prefers-reduced-motion: reduce)` override that pins the halo to its resting state (`animation: none`) so a reduced-motion user sees a static halo, not the pulse. Do the reduced-motion gate at the CSS level (like other components use `motion-reduce:`/media queries — see `MapControls.tsx:115`, `MapView.tsx:1055`), because `UserPin` is rendered into a detached DOM element by `UserLocationLayer` via `createRoot` (see below), so a React `useReducedMotion` hook inside `UserPin` is fine but a pure-CSS media query is simpler and matches R-018 "CSS/token-driven".
  - [ ] The dot is mounted by `UserLocationLayer.tsx` into a detached element handed to a MapLibre `Marker` (`UserLocationLayer.tsx:76-82`, `createRoot(element)` + `root.render(<UserPin />)`), gated on `status === 'success'` (real GPS fix only — never on the centrum fallback). Do NOT change the layer's mount/position/lifecycle; only the `UserPin` visual is in scope. The detached-root render means global `globals.css` classes/keyframes still apply (they are global), so a CSS-utility approach works.

- [ ] **Task 4 — Make recenter viewport-aware (AC3)**
  - [ ] The recenter `flyTo` lives in `MapControls.tsx:98-106` (the shared success-fly-to effect fired by both the mobile top-bar locate in `VenueSearchShell` and the desktop-nav locate in `DesktopNavBar`, both driving the same `useGeolocation` context). It currently flies to the raw `[lng, lat]` with `zoom` + `duration: DURATION_FLY_MS` (500 ms) and NO padding, so the dot lands under the bottom sheet / side panel.
  - [ ] Add a `padding`/`offset` to the `flyTo` options derived from the CURRENTLY-visible obstructions so the dot lands in the visual center of the unobscured map area (MapLibre `flyTo` accepts `padding: { top, bottom, left, right }`). Compute it from state, NOT a fixed constant (test-design R-013: "Offset derived from the CURRENT snap/panel state; a fixed offset lands the dot off-center at the collapsed vs full sheet").
    - **Mobile:** the bottom sheet covers the bottom of the viewport by the current snap height. The snap state is `mobileSheetState` (`MobileBottomSheetState = 'collapsed' | 'peek' | 'mid' | 'full' | 'dismissed'`) held in `MapView.tsx:172-173`; the snap heights are tokens `--size-bottom-sheet-collapsed-h` / `-peek-h` (120px) / `-mid-h` (320px) / `-full-h` (560px) in `globals.css:190-193`. Map the current snap to a bottom `padding` (e.g. peek→~120, mid→~320, full→~560, collapsed→~44+safe-area). Also account for the mobile top search bar if it materially obstructs (top `padding`).
    - **Desktop:** the 340px venue list is pinned left (`desktop-venue-list-panel`, `MapView.tsx:1125-1128`, width `--size-venue-list-desktop-w`); the 390px detail panel (`--size-venue-detail-panel-w`) appears on the right when `isVenueDetailRequested` (`MapView.tsx:649`). Add left `padding` for the list and right `padding` for the detail panel when open.
  - [ ] **Wiring:** `MapControls` does NOT currently receive `mobileSheetState` or `isVenueDetailRequested` — it is mounted with no props at `MapView.tsx:1286`. Thread the needed state in via props (preferred: pass `mobileSheetState` and `isVenueDetailRequested`/panel flags as props to `<MapControls>`), OR move/duplicate the viewport-aware recenter effect into `MapView` where that state already lives. Do NOT read the sheet DOM height imperatively — derive padding from the snap-state enum + the height tokens (deterministic, testable per snap).
  - [ ] **flyTo stays 500 ms** — keep `duration: DURATION_FLY_MS` (`lib/constants/animation.ts:11`); only add padding/offset (Design Gate Animation).
  - [ ] Consider the OnboardingGate grant flyTo (`OnboardingGate.tsx:215-224`) — it also flies to the granted coord and lands under the default `'mid'` sheet. AC3's literal target is the recenter *button*; if the grant flyTo is trivially reachable by the same padding helper, apply it, otherwise leave it (the grant path fires before the sheet is at a covering snap in the common case). Note any decision in Completion Notes. Do NOT regress the grant flyTo's existing behaviour (deferred-until-ready, dismiss-bail guard).

- [ ] **Task 5 — Tests (component + e2e)**
  - [ ] **UserPin component test** (`test/components/UserPin.test.tsx`): update for the new size (assert the enlarged dimensions), the tokenized fill (assert `var(--color-amber-location-dot)` or the resolved value per your fill approach), the white ring + halo presence, `pointer-events: none`, `aria-hidden`. Add a reduced-motion assertion: under `prefers-reduced-motion` the halo carries no active pulse animation (assert the static/`animation: none` state — e.g. by matching the media-query'd class OR a `useReducedMotion`-driven prop, whichever your Task-3 approach uses; jsdom does not run CSS animations, so assert the class/attribute that CSS keys off, not a computed animation).
  - [ ] **Recenter offset test** (component or `MapView.test.tsx` / a `MapControls` test): mock the map instance and assert `flyTo` is called with a `padding`/`offset` that varies per snap state — at least one mobile snap (e.g. `mid` → bottom padding ≈ mid height) vs another (e.g. `full` → larger bottom padding) so a fixed-offset regression fails, plus the desktop list-panel left padding and detail-open right padding. Assert `duration` stays `DURATION_FLY_MS` (500). (test-design row R-013: "Test the landed center per snap/panel state; flyTo stays 500 ms".)
  - [ ] **axe AA gate (the load-bearing gate for AC1)** — the de-dulled map MUST keep the axe AA gate GREEN on BOTH breakpoints. The gate runs against `/` (map-primary) at desktop (`test/e2e/axe.spec.ts:15`) and mobile (`test/e2e/axe-mobile.spec.ts`, project `a11y-mobile`), and `/?venue=…&_state=map-with-selected-venue`. Run these after the tint change (with a fresh `.next` per the Turbopack trap). Do NOT weaken the axe impact filter or add new fixmes. The axe gate is ACTIVE in CI since Epic 9 (retro-notes epic-11 R-006) — a contrast regression from the tint change fails the build.
  - [ ] **Optional map/dot e2e** (`test/e2e/`): if a de-dulled-map / dot presence spec is added, dual-mounted responsive variants require `.filter({ visible: true })` selectors, never positional `.first()`/`.last()` (retro-notes epic-11 Story 11.1 fix-pass trap: both responsive panel variants are always mounted, CSS-hidden per breakpoint). Force `?_time=13:00` if a spec touches sun-dependent state (CI e2e sun-specs are wall-clock-flaky without it — MEMORY: ci-and-e2e-gotchas). The recenter e2e can run on the existing `touch` (Pixel 5, Chromium) or `mobile` (iPhone 14) project for snap-state coverage; the `touch` project drives CDP raw touch (retro-notes 11.2/11.3). If you add a Playwright project or spec, verify it is actually invoked by `build-and-test-nextjs.yml` — a new project that CI never runs is dormant-green (retro-notes epic-11 Story 11.2 Tier-A review).

- [ ] **Task 6 — Gates + visual-validation handoff**
  - [ ] Run the standard gate: `npm run typecheck` (tsc 0 errors), `npm run lint` (0 new errors — the 13 pre-existing warnings are acceptable, add none), `npm test` (vitest — no dropped tests; net-new only), and the e2e axe suite green on both breakpoints. Fix the map/UserPin/recenter tests you touched; do not skip.
  - [ ] **NEW visual state → dev is FORBIDDEN from self-blessing reference PNGs.** The de-dulled map, the enlarged pulsing dot, and post-recenter framing are new visual states with no blessed reference. The consolidated maintainer reference-PNG rebaseline is owned by **Story 11.7** (retro-notes epic-11 Story 11.1 Phase-5 + 11.4). Record the three required visual-validation screenshots (a: de-dulled map, b: animated dot, c: post-recenter framing) as a maintainer checkpoint in Completion Notes; do NOT edit or overwrite reference PNGs, and do NOT run a self-blessing visual-validate that regenerates baselines. The real-device pass over map tint/dot/recenter is **Story 11.8's** (epics.md:3011).

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

### Debug Log References

### Completion Notes List

### File List
