# Story 10.2: "Sun Behind Clouds" Two-Signal UI State

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to see at a glance that the sun is behind clouds right now — while still seeing which terraces have the best sun position when it clears,
so that the app is honest about the sky and still uniquely useful on a grey day.

## Context & Why This Story Exists

Story 10.1 (the ENGINE half of Epic 10 "Honest Sky") is COMPLETE on this branch (status `review`). It introduced the weather-gated headline status `'CloudObscured'` (added to `VenueSunStatus` at `lib/types/api.ts:13`), fixed the three data root causes (missing-cloud ⇒ unknown; FR12 confidence blend; the cloud gate at cloud cover ≥ 80%), and swept every `currentSunStatus` consumer to COMPILE and not crash — but **left all render surfaces treating `CloudObscured` as a Shaded-like PLACEHOLDER**. This story (10.2) owns **ALL the UI**: it replaces those placeholders with the real muted two-signal presentation.

**The two-signal model (maintainer decision — read carefully, it constrains every AC):** the headline state is now weather-honest, but the geometric layer (`sunExposurePercent`, `sunWindow`, `peakTime`, the sun-window timeline) is PRESERVED unchanged as clearly-labelled clear-sky POTENTIAL — that geometric layer is the product's unique IP ("cloudy now — but when it clears, THIS is the terrace in sun"). You must NOT change the meaning of `sunExposurePercent`/`sunWindow`/`peakTime`. The obscured state is an ADDITIVE fourth visual state layered on top; it MUTES the amber "sunny" chrome and adds a plain-language sky signal, but it keeps the geometric %/windows visible and labelled as *position, not weather*.

What 10.1 explicitly handed to 10.2 (from `10-1`'s Open Question + Completion Notes):
1. **`getVenueSunRankForList` placeholder ranking** (`VenueList.tsx:163-172`) — it currently `default: return 0`s a `CloudObscured` venue (ranking it like Shaded). AC2 requires "Mest sol" list ranking to keep ranking by **geometric solläge** so venue comparison still works under overcast. **You must fix this.**
2. **Every render surface treats `CloudObscured` as a Shaded/cloud placeholder** — `VenueCard` flows it as `!isSunny → "MEST SKUGGA"`, `VenuePin` renders it as the grey `shaded` pill, `VenuePinLayer` gives it the `pinShadedAria` label, `VenueQuickInfo`/`VenueDetailContent` show the amber sunny badge regardless. **Replace all of these with the muted obscured presentation.**

## Acceptance Criteria

**AC1 — A distinct, muted fourth visual state on every surface**
**Given** a venue whose engine state is the new cloud-gated status
**When** it renders anywhere — map pin (`VenuePin`/`VenuePinLayer`), venue card (`VenueCard`), quick-info (`VenueQuickInfo`), detail (`VenueDetailContent`), list (`VenueList`)
**Then** the headline presentation is a muted/cloud state ("Sol bakom moln" / "Sun behind clouds") that is visually unmistakable from BOTH the amber sunny state AND the grey shaded state (a fourth visual state: Sunny / Partial / Shaded / Obscured), and no surface shows "FULL SOL"/"DELVIS SOL" or an amber sun badge while the gate is active

> _Reading:_ "engine state is the new cloud-gated status" = `currentSunStatus === 'CloudObscured'` (added to the union by Story 10.1). The obscured chrome mutes the amber "sunny" treatment; the geometric % stays (that is AC2).

**AC2 — The geometric layer is preserved and clearly labelled as position-not-weather**
**Given** the two-signal model preserves the geometric layer
**When** a cloud-gated venue renders its details
**Then** the geometric potential remains visible and clearly labelled as position-not-weather (e.g. "Solläge 100% · sol här när det klarnar" — final copy at design discretion), the sun-window timeline keeps rendering as clear-sky potential, and list ranking ("Mest sol") continues to rank by geometric solläge so venue comparison still works under an overcast sky

> _Reading:_ the "list ranking ('Mest sol') continues to rank by geometric solläge" clause is the 10.1 hand-off — fix `getVenueSunRankForList` (`VenueList.tsx:163-172`), which currently sinks obscured venues to rank 0 (see Task 3 / Dev Notes).

**AC3 — Surface the serialized-but-never-rendered `skyCondition` field**
**Given** the serialized-but-never-rendered `skyCondition` field
**When** the UI state ships
**Then** the current sky condition is surfaced on at least the venue detail/quick-info surface (clear / partly cloudy / overcast — plain-language copy, no geodata or meteorology internals per Story 3.0.6), with `sv`/`en` message parity and the new keys added to both locales

> _Reading:_ `skyCondition` is ALREADY on `VenueDataDto.skyCondition` (10.1 plumbed it end-to-end) — AC3 is a pure client render + i18n task, NO engine/route/store change.

**AC4 — Accessibility & honest labelling (Epic 9 lessons)**
**Given** accessibility and honest labelling requirements (Epic 9 lessons)
**When** the new state renders
**Then** each surface's accessible name includes the obscured state exactly once (no duplicated or orphaned phrases), the muted palette meets WCAG AA contrast (the axe CI gate stays green), and the state change is covered by component tests across all four visual states

## Design Gate Criteria (frontend story — REAL screenshot gate)

Carried verbatim from epics.md:2712-2715:
- **Visual:** The Obscured state on pin + card + quick-info + detail is distinct from Sunny/Partial/Shaded at a glance; muted palette matches the design-token system (no ad-hoc hexes)
- **Behaviour:** Gate active → no FULL SOL/amber anywhere; geometric potential labelled as position; sorting still works; clear-sky venues unchanged
- **Animation:** Existing pin/card transitions unchanged; no flash when a venue crosses the gate on refresh
- **Visual validation:** Screenshot comparison of an overcast-state card + pin + detail (mobile & desktop, forced via mocked weather) against references passes before QA handoff

> **Design-gate honesty callout (Epic 9 lessons — carried in):** The visual-validation gate is a real screenshot surface for the NEW obscured state, BUT there is NO reference PNG for it today, and the host `visual-validate.sh` fails on this Windows machine (`/tmp/impl-*.png` unwritable — retro-note 9-2). So: reproduce the LLM-eyeball comparison via the manual affordance (`VISUAL_VALIDATE_PROVIDER=none ALLOW_MANUAL_VISUAL_VALIDATION=1`) where possible, **do NOT self-bless or edit/create reference PNGs to force a pass** — a maintainer rebaselines the new obscured references. Record this as a Completion-Notes maintainer follow-up. The LLM visual gate is NOT a pixel diff and is explicitly told to ignore sizing/spacing (auto-memory `reference_visual_gate_is_llm_eyeball`), so width/proportion/centering regressions can slip past it — get the obscured muting VISUALLY unambiguous rather than relying on the gate to catch subtle drift.

## Tasks / Subtasks

- [ ] **Task 1 — Introduce the muted "obscured" design token + the UI-token `SunStatus` value (AC1)**
  - [ ] Add a muted/cloud palette token to `app/globals.css` `@theme` (near `--color-pin-shaded: #e4e1e5;` at line 50). The obscured state must be distinct from BOTH amber (`--color-amber-*`) AND the existing shaded grey (`--color-pin-shaded`). Choose a muted cloud/slate family (e.g. a desaturated blue-grey pin fill + a readable body text color) that meets **WCAG AA (4.5:1)** against its background for any text/badge — the axe gate WILL fail otherwise (retro/auto-memory: the venue-card amber labels historically measured ≈1.63 and the muted-text family had to be bumped to AA in Epic 9). Add the CSS variable(s) with a comment; do NOT inline raw hexes in components.
  - [ ] Extend the **UI-token vocabulary** `SunStatus` in `lib/types/design-tokens.ts:1` from `'sunny' | 'partial' | 'shaded' | 'upcoming'` to add `'obscured'`. This is the SEPARATE presentational vocabulary (lowercase) — 10.1 explicitly deferred adding it here. `SkyCondition` (`design-tokens.ts:3`) already carries `'overcast'`/`'partly-cloudy'`/`'clear'`/`'unavailable'` — no change needed there.
  - [ ] If you add a shared status→visual mapper (recommended, see Task 2), use a `never`-exhaustive `switch` on `VenueSunStatus` so a future missed status is a COMPILE error (epic-wide ratified convention — retro-note epic-10: "use a never-exhaustive switch so a missed consumer is a compile error").

- [ ] **Task 2 — Map pin: muted obscured pill (`VenuePin` + `VenuePinLayer`) (AC1, AC4)**
  - [ ] `VenuePin.tsx:51-56`: today `isSunny = sunStatus === 'Sunny' || 'Partial'` and everything else (incl. `CloudObscured`) collapses to the grey `ShadedPill`. Add a THIRD render branch for `CloudObscured` → a muted "cloud" pill visually distinct from the amber sunny pill AND the grey shaded pill (use the new token; keep the `Cloud` lucide icon so it is not colour-only per NFR27; keep the `%` still shown — it is the geometric solläge, AC2). Preserve the existing morph/`AnimatePresence` machinery and `data-pin-state` contract (extend the `VenuePinSelection` type at `lib/types/map.ts:43` if you add an `obscured` pin state, or keep `state` = a new `'obscured'` value — whichever keeps the morph logic honest; a `CloudObscured` pin does NOT need a selected-morph variant, mirror the shaded pill's single-state treatment).
  - [ ] `VenuePinLayer.tsx:68-73` `resolveAria`: add a `pinObscuredAria` branch BEFORE the shaded fallback so a `CloudObscured` pin announces the obscured state, not "shaded". Add the `pinObscuredAria` key to BOTH `messages/sv/map.json` and `messages/en/map.json` (parity-guarded). Include the geometric `{percent}` and `{name}` placeholders exactly like the other three aria keys so the ICU parity test passes.
  - [ ] `VenuePinLayer.venueFingerprint` (`:361-369`) already includes `sunStatus`, so a status flip to/from `CloudObscured` correctly re-renders the pin — no fingerprint change needed. Verify (do not regress the Story-1.4 fingerprint contract).

- [ ] **Task 3 — Venue card: muted obscured state + fix the `isSunny`-derived label (`VenueCard` + `VenueList`) (AC1, AC2, AC4)**
  - [ ] `VenueCard.tsx` derives its state from the `isSunny` BOOLEAN prop + `sunExposurePercent`, NOT from `currentSunStatus` directly (`:104-108` `statusLabel`, `:169-176` compact icon/label, `:356-368` thumbnail badge). A `CloudObscured` venue currently arrives as `isSunny=false` (via `isVenueSunnyForList`, which is `getVenueSunRankForList(venue) > 0`) → renders "MEST SKUGGA" + grey cloud badge. That is the placeholder to replace. **Thread the obscured signal into the card** — add an explicit prop (e.g. `sunStatus?: VenueSunStatus` or `isObscured?: boolean`) so the card can render the muted "Sol bakom moln" label + muted badge for `CloudObscured` DISTINCT from both the amber sunny path and the grey shaded path. Do NOT overload `isSunny` (keep it meaning "geometrically sunny amber chrome"); an obscured venue is neither amber-sunny nor plain-shaded.
  - [ ] Add `statusObscured` (and any obscured helper copy) to `VenueCardLabels` and pass it from `VenueList.tsx:109-130` via the `venue.list.*` namespace. The obscured card MUST NOT show "FULL SOL"/"DELVIS SOL" or the amber `Sun` icon (AC1). Keep the geometric `{percent} sol` visible but reframe/label per AC2 (position-not-weather) — final copy at design discretion, but never an amber "FULL SOL" while obscured.
  - [ ] **Fix `getVenueSunRankForList` (`VenueList.tsx:163-172`) per AC2 + the 10.1 hand-off:** "Mest sol" must rank by geometric solläge. A `CloudObscured` venue is geometrically `Sunny`/`Partial` underneath — but that geometric tier is NOT recoverable from `currentSunStatus` alone once gated. Rank `CloudObscured` by its **geometric `sunExposurePercent`** (the honest solläge signal that survives the gate — a 95%-solläge obscured venue should still out-rank a 40%-solläge partial one in "Mest sol") rather than `default: return 0` (which sinks every obscured venue below every Partial). Document the chosen rank formula in a code comment. Keep the clear-sky ordering (Sunny > Partial > Shaded) unchanged for non-obscured venues, and keep the secondary distance tiebreak. Add/extend the `VenueList.test.tsx` sort test to prove a high-solläge obscured venue ranks above a low-solläge partial one under "Mest sol".
  - [ ] `isVenueSunnyForList` (`:159-161`) currently gates the amber vs grey thumbnail/icon via `isSunny`. Decide its behaviour for obscured: an obscured venue is NOT amber-sunny (so `isSunny=false` for the amber-chrome decision is correct), but the card still needs the muted-vs-grey distinction from the new obscured prop. Keep `isVenueSunnyForList` returning false for obscured (no amber), and drive the muted treatment off the separate obscured signal.

- [ ] **Task 4 — Quick-info & detail: muted headline + preserved geometric layer + `skyCondition` copy (AC1, AC2, AC3, AC4)**
  - [ ] `VenueQuickInfo` does NOT currently receive `currentSunStatus` OR `skyCondition` (MapView passes only name/sunTimeRange/percent/etc at `MapView.tsx:1064-1089` mobile + `:1091-1118` desktop). **Thread both** `currentSunStatus` and `skyCondition` from `selectedQuickInfoVenue` into both `VenueQuickInfo` call sites, and render: (a) the muted obscured headline chrome when `currentSunStatus === 'CloudObscured'` (mute the amber `% SOL` badge in `VenueThumbnail` `:378-394` — no amber sun badge while obscured, AC1); (b) the geometric solläge %/sun-window still visible + labelled as position-not-weather (AC2); (c) the plain-language `skyCondition` copy (AC3).
  - [ ] `VenueDetailContent` receives the full `VenueDataDto`/`VenueDetailDto` (`venue.currentSunStatus`, `venue.skyCondition` already available — no new prop threading needed). Replace the always-amber `HeroImage` sun badge (`:355-363`) + the always-amber `Sun` section icon (`:189`) with the muted treatment when `venue.currentSunStatus === 'CloudObscured'`. The `SunTimeline`/`SunForecastBars` (`:198-211`) KEEP rendering as clear-sky potential (AC2) — do NOT mute or hide the timeline; it IS the "when it clears" signal. Surface `skyCondition` plain-language copy on the detail surface (AC3).
  - [ ] **`skyCondition` → plain-language copy (AC3, Story 3.0.6):** `venue.skyCondition` is a string `'clear' | 'partly-cloudy' | 'overcast' | 'unavailable'`. Map it to user-facing copy with NO meteorology internals (no cloud %, no `cloud_area_fraction`, no geodata). Add a `sky.*` (or `detail.sky.*` / `quickInfo.sky.*`) key group to BOTH `messages/sv/venue.json` and `messages/en/venue.json`, parity-guarded. Suggested sv: `clear` → "Klart", `partly-cloudy` → "Delvis molnigt", `overcast` → "Mulet", `unavailable` → (omit / "Väder saknas"). Do NOT render a sky line for `'unavailable'` (10.1's honest "we don't know" — never fabricate). The headline obscured phrase "Sol bakom moln" / "Sun behind clouds" is a SEPARATE key from the skyCondition descriptor.
  - [ ] **Accessible name — exactly once (AC4, Epic 9 lesson):** wherever you add the obscured phrase to a surface's accessible name, ensure it appears EXACTLY once (no duplicated/orphaned phrase — the Epic 9 de-dup discipline). The card's activation `aria-label` is built in `VenueList.tsx` via `t('cardAria', …)`; if you fold the obscured state into it, do it in ONE place, not both the label and an sr-only repeat.

- [ ] **Task 5 — Deterministic obscured force-state for the visual/axe/e2e gates (AC1, AC4 — test determinism)**
  - [ ] **CRITICAL determinism gap:** NO fixture venue has `currentSunStatus: 'CloudObscured'` (all 7 `VENUE_FIXTURE` venues are Sunny/Partial/Shaded; `venues-fixture.ts:45-185`), and CI runs the fixture path (flag OFF) — so the obscured state cannot be reached deterministically today. The `?_state=map-primary|map-panel-venues|map-with-selected-venue` forced-visual path NORMALIZES every venue to `Sunny` (`normalizeForcedVisualVenue`/`normalizeForcedVisualPin`, `MapView.tsx:1225-1248`). You MUST add a deterministic obscured path so the visual-validation gate + axe gate + any component/e2e test can force the obscured surface WITHOUT live Met.no weather (retro-note R-005: no deterministic weather-boundary mock exists — 10.5's e2e matrix is sky-flaky until one lands, so 10.2 owns forcing its OWN obscured surface). Prefer ONE of: (a) a new `_state` screen-id (e.g. `map-with-obscured-venue` and/or `venue-detail-obscured`) whose normalizer sets the selected venue to `currentSunStatus: 'CloudObscured'` + `skyCondition: 'overcast'` (mirror `normalizeForcedVisualVenue`); OR (b) a dedicated obscured fixture venue. If you add a `_state` id, register it in `project-context.md` §"Screen ID → Route Map" and follow `docs/dev/state-forcing.md` (production-DCE-safe; `useForcedState()` already gates NODE_ENV==='production' → null). Keep the seeded slug convention (`test-venue-sunny`).
  - [ ] Extend `test/e2e/axe.spec.ts` (and `axe-mobile.spec.ts` for the mobile viewport) with a scan of the forced obscured surface (pin + quick-info + detail) so the AA-contrast requirement (AC4) is a CI gate, not a manual claim. The axe gate is currently green at HEAD (Epic 9 landed the CI axe gate active — auto-memory: only the Story-5.1 `test.fixme` about/privacy footer debt remains); do NOT let the muted palette reintroduce a contrast violation.
  - [ ] Do NOT add live Met.no calls or real-network weather to any test (Met.no TOS + determinism). Construct the obscured state via the forced-state normalizer or a fixture, never a live fetch.

- [ ] **Task 6 — Component tests across all four visual states + verify gates (AC1, AC2, AC4)**
  - [ ] Add component tests (Vitest + Testing Library, mirror `test/components/VenueCard.test.tsx` / `VenuePin.test.tsx` / `VenueQuickInfo.test.tsx` / `VenueDetailContent.test.tsx` / `VenueList.test.tsx` conventions) proving each surface renders all FOUR states distinctly: Sunny / Partial / Shaded / Obscured (AC4 "across all four visual states"). Assert the obscured state: (i) shows NO "FULL SOL"/"DELVIS SOL"/amber-sun-badge (AC1); (ii) still shows the geometric solläge %/window labelled as position (AC2); (iii) renders the plain-language skyCondition copy on quick-info/detail (AC3); (iv) puts the obscured phrase in the accessible name exactly once (AC4).
  - [ ] Add the `VenueList` sort test from Task 3 (high-solläge obscured out-ranks low-solläge partial under "Mest sol").
  - [ ] Add a `skyCondition`→copy mapping test incl. the `'unavailable'`-renders-nothing branch (AC3, no fabricated sky).
  - [ ] Run the standard gate from `nextjs-app/` (AGENTS.md): `npx tsc --noEmit` (0 errors), `npx eslint .` (0 errors), `npx vitest run` (all green), and the Playwright axe project for the new obscured scan. Capture the fresh HEAD vitest baseline BEFORE editing (Story 10.1 finished at **112 files / 993 tests**, 0 skipped — measure it fresh, count expected to INCREASE, none dropped).
  - [ ] Confirm the **clear-sky path is visually unchanged** (Design Gate "Behaviour": clear-sky venues unchanged) — the existing map-primary / venue-detail / quick-info visual gates and their component tests must stay green for Sunny/Partial/Shaded venues.

## Dev Notes

### frontend-component skill is MANDATORY for this story
This is a UI story touching six render surfaces. Read and apply the **`frontend-component`** skill (design-system-first: design tokens over inline hexes, DESIGN.md/ux-spec prototypes, all UI states, a11y, animation). Every visual-gate criterion above traces to it. Auto-memory `feedback_visual_gate_criteria`: every frontend story needs the 4 design-gate criteria — they are present above (Visual / Behaviour / Animation / Visual-validation).

### Two distinct status vocabularies — do NOT confuse them (inherited from 10.1)
- **DTO / API layer: `VenueSunStatus`** = `'Sunny' | 'Partial' | 'Shaded' | 'NoSun' | 'CloudObscured'` (`lib/types/api.ts:13`). 10.1 already added `CloudObscured`. This is the value you BRANCH ON to decide the muted rendering. `VenuePinData.sunStatus` (`lib/types/map.ts:28`), `feedback-session.ts predictedState`, `VenueSunTimelineWindowDto.status` all reuse it.
- **UI-token layer: `SunStatus`** = `'sunny' | 'partial' | 'shaded' | 'upcoming'` (`lib/types/design-tokens.ts:1`, lowercase presentational). **Task 1 adds `'obscured'` HERE.** 10.1 deferred this to you.
- `SkyCondition` (`design-tokens.ts:3`) already carries `'clear' | 'partly-cloudy' | 'overcast' | 'rain' | 'unavailable'` — no change; `'rain'` is Story 10.4's, ignore it.

### `skyCondition` is ALREADY plumbed — 10.2 only RENDERS it (AC3)
10.1 fully wired `skyCondition` end-to-end: it is on `VenueDataDto.skyCondition` (`api.ts:68`), set by the real engine (`sun-engine.ts:480-481,511`), coerced through the DB store (`venue-store.ts:389,407`), present on every fixture (`venues-fixture.ts`), and `skyConditionFromCloudCover(undefined) → 'unavailable'` (the honest unknown). **Do NOT touch the engine, route, or store for AC3** — it is a pure client render + i18n task. The field is `skyCondition?: string` on the DTO; treat an absent/`'unavailable'` value as "render no sky line" (never fabricate).

### The geometric layer is SACRED (AC2) — the whole point of two-signal
`sunExposurePercent`, `sunWindow`, `peakTime`, and the `SunTimeline`/`SunForecastBars` are clear-sky POTENTIAL and MUST keep rendering for an obscured venue — muted/reframed as "position, not weather" but NEVER hidden or zeroed. An obscured venue with 95% solläge is EXACTLY the "when it clears, this is the terrace in sun" case the epic exists to preserve. The scope guardrail (epics.md:2659): "The geometric meaning of `sunExposurePercent`, `sunWindow`, and `peakTime` must NOT change." You render them differently (labelled); you do not change their value or meaning.

### Muted palette — token, not hex (Design Gate "Visual" + AC4 contrast)
- Existing sun palette: amber family `--color-amber-pin #f1b100` / `--color-amber-primary #ffbf00` / `--color-amber-gold #d4af37` / `--color-amber-dark #735c00` (`globals.css:27-35`); shaded pin `--color-pin-shaded #e4e1e5` (light grey, `:50`); body text `--color-text-body #4d4635`.
- The obscured state needs to be distinct from BOTH amber AND `#e4e1e5` grey. A muted **blue-grey/slate** cloud family reads as "clouds/overcast" and separates cleanly from the warm amber and the neutral shaded grey. Add named token(s) in `@theme` with a comment. **Any text or badge on the obscured chrome must hit WCAG AA 4.5:1** — verify with the axe scan (Task 5). The Epic 9 muted-text debt is the cautionary tale (amber labels ≈1.63:1, footer wordmark 3.13:1 both failed axe); do not repeat it.
- The LLM visual gate ignores sizing/spacing (auto-memory `reference_visual_gate_is_llm_eyeball`) — it catches COLOR/state changes well but not proportions. So the muting must be obvious in HUE/CHROMA, not a subtle spacing tweak.

### `getVenueSunRankForList` fix (AC2) — the 10.1 open question, resolved here
`VenueList.tsx:163-172` currently: `Sunny→2, Partial→1, default→0`. A gated `CloudObscured` venue hits `default→0` and sinks below every Partial, breaking "Mest sol" comparison under overcast (the exact case AC2 protects). The honest geometric solläge that survives the gate is `venue.sunExposurePercent`. Rank obscured venues by their `sunExposurePercent` (e.g. map it into the same ordering space as Sunny/Partial, or use it as the primary key with a small offset so a 95%-solläge obscured venue ranks like a near-Sunny venue). Keep non-obscured ordering exactly as-is (Sunny > Partial > Shaded) so the clear-sky list is byte-identical. Note `sortVenuesForList` (`:145-157`) uses `getVenueSunRankForList` for the sun-sort and a distance tiebreak — keep the tiebreak. `isVenueSunnyForList` (`:159-161`) also derives from this rank and feeds `VenueCard.isSunny` (amber chrome decision) — make sure an obscured venue does NOT become amber via this path.

### Data-flow gaps you must close (props threading)
- `VenueQuickInfo` has NO `currentSunStatus`/`skyCondition` prop today — add them and thread from MapView `selectedQuickInfoVenue` at BOTH call sites (`MapView.tsx:1064-1089` mobile, `:1091-1118` desktop). Watch the `isForcedVisualReference` normalization (`:463-468`) — the forced path normalizes to Sunny; your new obscured force-state (Task 5) must bypass/override that for the obscured surface.
- `VenueCard` derives state from `isSunny` boolean, not status — add an obscured signal prop (Task 3); do NOT overload `isSunny`.
- `VenueDetailContent` already gets the whole venue (`venue.currentSunStatus`, `venue.skyCondition`) — no threading, just branch on it.
- `VenuePin` gets `VenuePinData` (has `sunStatus`) — branch on `sunStatus === 'CloudObscured'`.

### i18n — parity-guarded, new keys in BOTH locales
`test/unit/messages-parity.test.ts` fails a build if a key exists in one locale but not the other, and pins ICU argument names per key (retro/deferred: it checks arg NAMES not formatter styles — fine here). New keys this story adds (all in BOTH `sv` and `en`):
- `map.pinObscuredAria` (with `{name}` + `{percent}`, matching the other 3 pin aria keys — `messages/{sv,en}/map.json`).
- Venue-namespace obscured headline phrase + skyCondition descriptors (`messages/{sv,en}/venue.json`) — e.g. an obscured phrase ("Sol bakom moln" / "Sun behind clouds") and a `sky.{clear,partlyCloudy,overcast}` group. Reuse the existing `list.*` / `quickInfo.*` / `detail.*` namespaces where the label is consumed; add a `statusObscured` alongside `statusFullSun`/`statusPartialSun`/`statusMostlyShade` in `list.*` (`venue.json:110-112`).
- Do NOT remove or rename existing keys (avoid churn); ADD alongside.

### Retro-notes folded in (epic-10, subject-overlap only)
- **Union-extension sweep = compile-forced:** 10.1 already extended the union and swept consumers to compile; your NEW switches (status→visual mapper, obscured branches) must ALSO use a `never`-exhaustive default so a future status is a compile error (ratified epic convention).
- **Four thresholds deliberately UNKNOWN → tests assert RELATIVE behaviour:** not directly yours (you own no threshold), but the obscured rendering must not hardcode a cloud % or threshold — it branches on the STATUS (`CloudObscured`) the engine already decided, never re-computes the gate. Your sort test asserts RELATIVE ordering (obscured-high > partial-low), not an absolute rank number, so a future re-tune survives.
- **E2E weather-mock is Story 10.5, but 10.2 must force its OWN obscured surface deterministically (R-005):** there is NO deterministic weather-boundary mock today; ?_time= pins wall clock, not sky. 10.2's visual/axe/e2e gates for the obscured state MUST use the forced-state normalizer or a fixture (Task 5), NOT live weather. Do not wait for 10.5's mock; do not add live Met.no calls.
- **EOL / whitespace churn (epic-10 code-review):** repo has mixed CRLF/LF under `core.autocrlf=true` with no `.gitattributes`; editors rewriting touched blocks produce phantom line-ending churn that inflates review. Keep your diffs confined to the lines you actually change (especially in `MapView.tsx` and `globals.css`); preserve each untouched line's original EOL. If you must reformat, do it in a separate, obvious step. (10.1 lost a review round to exactly this.)

### Deferred-work items folded in (subject-overlap only — none reopened)
- **3.4 — `VenueCard` hardcoded Swedish sun-label fallbacks** (`VenueCard.tsx:104-108`, Target: Story 5.1): the `?? 'MEST SKUGGA'` / `?? 'FULL SOL'` / `?? 'DELVIS SOL'` inline fallbacks are the SAME `statusLabel` block you are reworking for the obscured state. While you are in `:104-108`, the labels are always passed from `VenueList` today (Swedish is source), so the fallbacks are non-violating — but if your rework makes the labels required (recommended), remove the `??` fallbacks and make the status labels required props, closing this Story-5.1-targeted debt as a natural side-effect. Note it in Completion Notes if you do (SM may retire the deferred entry).
- **9.5→9.9 honest-distance annotation** (`distanceIsApproximate` on card/quick-info/detail): ALREADY landed and unrelated to sun state — do NOT touch or regress it; just keep passing it through when you add the new obscured props.
- **10.1 R1 (Target: None, conditional): `WeatherDataDto.cloudCover` required vs legacy optional** — legacy `sun-exposure-service`/`VenueSunExposureResponse` DTO, NOT on the live venues route, NOT a UI concern. Do NOT reopen; out of 10.2 scope.
- **8.5/8.7 items** (future-valid-time, elevation caps, met-no parse guards): engine/data path, not overlapping the UI. Do NOT reopen.

### Engine / API boundary (AGENTS.md scope guardrail)
Client components must NEVER import `lib/weather` / `lib/solar` / `lib/services/sun-engine` / `lib/supabase` — all data flows through `app/api/*` + hooks and arrives as `VenueDataDto`. This story is 100% client-render + i18n + one dev-only forced-state normalizer; you do NOT touch the engine, route handler, or store (10.1 already did the engine/data work). If you find yourself editing `sun-engine.ts`/`met-no-service.ts`/`route.ts`/`venue-store.ts`, STOP — that is out of scope for 10.2.

### Test surfaces
- `test/components/VenuePin.test.tsx`, `VenuePinLayer.test.tsx` — obscured pill + aria (AC1, AC4).
- `test/components/VenueCard.test.tsx`, `VenueList.test.tsx` — obscured card + the sort-rank fix (AC1, AC2, AC4).
- `test/components/VenueQuickInfo.test.tsx`, `VenueDetailContent.test.tsx` — muted headline + preserved geometric layer + skyCondition copy (AC1, AC2, AC3).
- New skyCondition→copy mapping test incl. `'unavailable'`→no-render (AC3).
- `test/unit/messages-parity.test.ts` — stays green with the new sv/en keys.
- `test/e2e/axe.spec.ts` + `axe-mobile.spec.ts` — forced obscured surface scan (AC4 contrast, CI gate).

### Project Structure Notes
- Render surfaces: `components/composed/venue/{VenueCard,VenueList→custom/venue,VenueQuickInfo,VenueDetailContent,SunTimeline}.tsx` (NOTE: `VenueList.tsx` is at `components/custom/venue/`, not `composed/`), `components/custom/map/{VenuePin,VenuePinLayer}.tsx`, `components/custom/map/MapView.tsx` (props threading + forced-state normalizer).
- Tokens/types: `app/globals.css` (`@theme`), `lib/types/design-tokens.ts`, `lib/types/map.ts` (if you extend `VenuePinSelection`).
- i18n: `messages/{sv,en}/{venue,map}.json`.
- Dev-only: `docs/dev/state-forcing.md` + `project-context.md` §"Screen ID → Route Map" (if you add an obscured `_state` id).
- No new dependency, no engine/route/store edits expected. Windows/PowerShell host: run vitest via `cd nextjs-app; npx vitest run`; Playwright via `npx playwright test`. Do NOT run git — the orchestrator owns all git/PR work.

### References
- [Source: CLAUDE.md] + [Source: AGENTS.md] — root project instructions; AGENTS.md is the canonical AI-agent rulebook (CLAUDE.md is a compatibility shim pointing at it): API boundary, Met.no TOS, local-Docker rules, test gate.
- [Source: project-context.md] — design + "Screen ID → Route Map" (register any new obscured `_state` id here) + seeded-development-slug contract.
- [Source: _bmad-output/planning-artifacts/epics.md#Story-10.2] (lines 2687-2715) — the 4 verbatim ACs + 4 Design Gate Criteria + the two-signal model + physics/scope guardrails.
- [Source: _bmad-output/implementation-artifacts/10-1-cloud-gated-sun-state-weather-truth-fixes.md] — the engine half: `CloudObscured` added, `skyCondition` plumbed, consumer sweep = placeholders, the `getVenueSunRankForList` Open Question handed to 10.2.
- [Source: _bmad-output/planning-artifacts/prd.md#FR12] — the geometric+weather two-signal intent 10.1 implemented in the engine, 10.2 surfaces in the UI.
- [Source: _bmad-output/planning-artifacts/architecture.md] + [Source: AGENTS.md] — API boundary (clients never import lib/weather|solar|supabase), Met.no TOS, no live weather in tests.
- [Source: nextjs-app/docs/design/DESIGN.md] + [Source: _bmad-output/planning-artifacts/design/DESIGN.md] + [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — token table (amber/pin-shaded/text), pin/badge shadow + z-index conventions (no Obscured state defined yet — you introduce it in-token).
- [Source: nextjs-app/lib/types/api.ts:13,68] — `VenueSunStatus` (`CloudObscured`) + `skyCondition?: string` DTO field.
- [Source: nextjs-app/lib/types/design-tokens.ts:1] — `SunStatus` UI-token union to extend with `'obscured'`.
- [Source: nextjs-app/components/custom/venue/VenueList.tsx:163-172] — `getVenueSunRankForList` (the AC2 fix).
- [Source: nextjs-app/components/composed/venue/VenueCard.tsx:104-108,169-176,356-368] — `isSunny`-derived state (thread the obscured signal).
- [Source: nextjs-app/components/custom/map/VenuePin.tsx:51-56], [VenuePinLayer.tsx:68-73,361-369] — pin state + aria + fingerprint.
- [Source: nextjs-app/components/composed/venue/VenueQuickInfo.tsx:74-95,378-394] + [VenueDetailContent.tsx:189,355-363] — surfaces to mute + thread skyCondition.
- [Source: nextjs-app/components/custom/map/MapView.tsx:1064-1118,1225-1248,449-468] — quick-info call sites + forced-visual normalizers (add obscured force-state).
- [Source: nextjs-app/lib/services/venues-fixture.ts] — 7 fixture venues, NONE obscured (determinism gap, Task 5).
- [Source: nextjs-app/app/globals.css:26-53] — amber + pin-shaded + text palette (add muted obscured token).
- [Source: nextjs-app/messages/{sv,en}/{venue,map}.json] + [test/unit/messages-parity.test.ts] — i18n parity guard.
- [Source: nextjs-app/test/e2e/axe.spec.ts] + [docs/dev/state-forcing.md] — axe gate + forced-state convention.
- [Source: _bmad-output/auto-bmad/retro-notes/epic-10.md] — never-exhaustive-switch discipline, relative-boundary tests, R-005 weather-mock-is-10.5, EOL churn caution.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
