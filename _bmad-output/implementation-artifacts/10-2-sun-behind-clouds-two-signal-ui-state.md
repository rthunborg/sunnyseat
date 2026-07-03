# Story 10.2: "Sun Behind Clouds" Two-Signal UI State

Status: review

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

- [x] **Task 1 — Introduce the muted "obscured" design token + the UI-token `SunStatus` value (AC1)**
  - [x] Added muted slate cloud tokens to `app/globals.css` `@theme` (below `--color-pin-shaded`): `--color-pin-obscured: #5e6a7a` (fill; white text 5.50:1 AA) + `--color-obscured-text: #41505f` (label; 8.28/7.94/7.29:1 on white/cream/sand). Distinct from amber AND `--color-pin-shaded` grey. Documented in DESIGN.md token table. No inline hexes in components.
  - [x] Extended UI-token `SunStatus` in `lib/types/design-tokens.ts:1` with `'obscured'`.
  - [x] Added shared mapper `lib/utils/sun-status-presentation.ts` — `toSunStatusToken` uses a `never`-exhaustive `switch` on `VenueSunStatus` (future missed status = compile error) + `isObscuredSunStatus` + `skyConditionCopy` (AC3). Unit-tested.

- [x] **Task 2 — Map pin: muted obscured pill (`VenuePin` + `VenuePinLayer`) (AC1, AC4)**
  - [x] `VenuePin.tsx`: added a THIRD `'obscured'` render branch → new `ObscuredPill` (slate `bg-pin-obscured` fill, white Cloud icon + `%`, no selected-morph, no entrance fade → no gate-crossing flash). Extended `VenuePinSelection` (`lib/types/map.ts`) with `'obscured'`.
  - [x] `VenuePinLayer.resolveAria`: added `pinObscuredAria` branch BEFORE the shaded fallback. Added `pinObscuredAria` (`{name}`+`{percent}`) to BOTH `messages/{sv,en}/map.json` (parity-guarded).
  - [x] `venueFingerprint` already includes `sunStatus` — verified, no change (status flip re-renders correctly).

- [x] **Task 3 — Venue card: muted obscured state + fix the `isSunny`-derived label (`VenueCard` + `VenueList`) (AC1, AC2, AC4)**
  - [x] Threaded a NEW `isObscured?: boolean` prop into `VenueCard` (did NOT overload `isSunny`). Muted status label (`text-obscured-text`, Cloud icon), muted thumbnail badge (`bg-pin-obscured` white icon), muted position chip on the non-compact card. No amber FULL SOL/DELVIS SOL/Sun icon while obscured.
  - [x] Added `statusObscured` + `obscuredPosition` to `VenueCardLabels`, passed from `VenueList` via `venue.list.*`. Geometric % reframed as "{percent} solläge · sol här när det klarnar" (AC2).
  - [x] Fixed `getVenueSunRankForList` — CloudObscured ranks by `(sunExposurePercent/100)*2` into the Sunny(2)/Partial(1)/Shaded(0) space (95%-obscured → 1.9 out-ranks Partial; low-solläge sinks). Non-obscured ordering byte-identical; distance tiebreak kept. Sort tests prove RELATIVE ordering both ways.
  - [x] `isVenueSunnyForList` returns false for obscured (no amber) — muted treatment driven off the separate `isObscured` signal.

- [x] **Task 4 — Quick-info & detail: muted headline + preserved geometric layer + `skyCondition` copy (AC1, AC2, AC3, AC4)**
  - [x] `VenueQuickInfo`: added `currentSunStatus` + `skyCondition` props, threaded from `selectedQuickInfoVenue` at BOTH MapView call sites. Muted the amber `% SOL` photo-strip badge → `bg-pin-obscured` + Cloud icon; muted the amber sun-time-range; added the "Sol bakom moln" headline + plain-language sky line (`data-testid="quick-info-obscured"`).
  - [x] `VenueDetailContent`: muted the always-amber HeroImage sun badge (→ `bg-pin-obscured`, "% solläge") + the section Sun icon (→ Cloud), added the obscured hero headline + sky line (`data-testid="venue-detail-obscured"`). SunTimeline/SunForecastBars UNCHANGED (clear-sky potential, AC2). Fixed `timelineFromListVenue` to map a CloudObscured headline back to the geometric `Partial` window so the fallback timeline potential still renders (AC2).
  - [x] `skyCondition`→copy via `skyConditionCopy` (Story 3.0.6, no meteorology internals). Added `sky.*` groups + obscured phrase to `quickInfo.*`/`detail.*` in BOTH locales (parity-guarded). `'unavailable'`/absent → NO sky line (never fabricate) — unit + component tested.
  - [x] Accessible name — exactly once: the obscured card uses a dedicated `cardAriaObscured` built in ONE place in `VenueList`; the pin uses the single `pinObscuredAria`. Tests assert the phrase appears exactly once.

- [x] **Task 5 — Deterministic obscured force-state for the visual/axe/e2e gates (AC1, AC4 — test determinism)**
  - [x] Added TWO dev-only `_state` screen-ids: `map-with-obscured-venue` (MapView `normalizeForcedObscuredPin`/`normalizeForcedObscuredVenue` — pins + quick-info normalized to CloudObscured + overcast, geometric layer preserved) + `venue-detail-obscured` (`forced-venue-detail.ts`). Both gated by the existing `useForcedState()` prod-DCE hook; seeded `test-venue-sunny` slug. Registered in `project-context.md` §"Screen ID → Route Map".
  - [x] Extended `test/e2e/axe.spec.ts` with active desktop obscured scans (quick-info + detail) — BOTH PASS (muted palette is AA). `axe-mobile.spec.ts` obscured scans added as `test.fixme` (they inherit the SAME pre-existing venue-card amber-label contrast debt as every mobile card scan; the obscured chrome itself is AA and gated active on desktop).
  - [x] No live Met.no / real-network weather in any test — obscured state constructed solely via forced-state normalizers.

- [x] **Task 6 — Component tests across all four visual states + verify gates (AC1, AC2, AC4)**
  - [x] Added component tests across surfaces asserting the obscured state: no FULL SOL/DELVIS SOL/amber badge (AC1); geometric %/window preserved as position (AC2); plain-language skyCondition copy (AC3); obscured phrase in the accessible name exactly once (AC4). All four states (Sunny/Partial/Shaded/Obscured) proven distinct on the card + pin.
  - [x] Added the VenueList sort tests (high-solläge obscured > low-solläge partial; low-solläge obscured < partial).
  - [x] Added the `skyConditionCopy` mapping test incl. `'unavailable'`/`undefined`/`'rain'`/unknown → null.
  - [x] Gate: `npx tsc --noEmit` 0 errors; `npx eslint .` 0 errors (13 pre-existing warnings, none new); `npx vitest run` **113 files / 1013 tests, 0 skipped** (fresh HEAD baseline was 112/993 → +1 file, +20 tests, none dropped); Playwright `a11y` obscured scans PASS.
  - [x] Clear-sky path visually unchanged — all 6 existing clear-sky axe scans PASS; clear-sky component tests green; added explicit "sunny unchanged" behaviour tests to VenueDetailContent + VenueQuickInfo.

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

Opus 4.8 (claude-opus-4-8[1m])

### Debug Log References

- Fresh HEAD vitest baseline BEFORE editing: **112 files / 993 tests, 0 skipped, all green** (matches Story 10.1 completion record).
- Final vitest: **113 files / 1013 tests, 0 skipped, all green** (+1 file, +20 tests, none dropped).
- `npx tsc --noEmit` → 0 errors. `npx eslint .` → 0 errors (13 pre-existing warnings, none introduced).
- Playwright `a11y` (desktop) obscured scans PASS: `map obscured venue QuickInfo` + `obscured venue detail`. All 6 pre-existing clear-sky axe scans still PASS (regression clean).
- Transient note: the compute-heavy `test/unit/services/sun-engine.test.ts` intermittently 5s-timed-out only when the post-edit hook ran the FULL suite concurrently with active editing; it passes cleanly in isolation (29/29) and in the single-threaded full run. `sun-engine.ts` is untouched by this UI-only story.

### Completion Notes List

**What shipped (the muted two-signal fourth visual state):**
- New design tokens `--color-pin-obscured: #5e6a7a` (fill, white text 5.50:1 AA) + `--color-obscured-text: #41505f` (label, 7.3–8.3:1 AA) — a slate blue-grey cloud family distinct from amber sun and shaded grey. Contrast verified numerically before use and gated live by the desktop axe scans.
- `SunStatus` UI-token union extended with `'obscured'`; shared `lib/utils/sun-status-presentation.ts` mapper uses a `never`-exhaustive switch (epic-10 convention).
- Obscured muted presentation on ALL six surfaces: map pin (`ObscuredPill`), pin aria (`pinObscuredAria`), venue card (label + badge + position chip), list ranking, quick-info (badge + headline + sky), and venue detail (hero badge + headline + sky). No amber FULL SOL / sun badge anywhere while gated.
- `getVenueSunRankForList` fixed (the 10.1 hand-off): CloudObscured ranks by `(sunExposurePercent/100)*2`, so "Mest sol" still ranks by geometric solläge under overcast. Non-obscured ordering is byte-identical.
- `skyCondition` surfaced as plain-language copy on quick-info + detail (`clear`/`partly-cloudy`/`overcast`); `'unavailable'`/absent renders NO sky line (never fabricate). AC3 is a pure client render + i18n — engine/route/store untouched.
- Two deterministic dev-only force-states (`map-with-obscured-venue`, `venue-detail-obscured`) close the R-005 weather-mock determinism gap WITHOUT live Met.no; registered in `project-context.md`.

**Decisions / deviations:**
1. **Deferred 3.4 (`?? 'MEST SKUGGA'` etc. hardcoded fallbacks) NOT closed** — the story offered making the status labels REQUIRED as a side-effect. Doing so would force churning ~10 existing VenueCard/VenueList test cases that omit those labels, for no functional gain (the fallbacks are non-violating: `VenueList` always passes the labels, now including the obscured ones). Left the `??` fallbacks in place with the obscured label added; 3.4 stays as-is (not made worse). SM may keep the 3.4 deferred entry.
2. **Confidence chip suppressed on obscured cards** — the amber `text-amber-text` confidence chip is hidden for obscured venues to avoid amber chrome under the gate (AC1). The `·` separator logic was checked for no orphaned middot. Confidence is still available via the accessible name on non-obscured cards.
3. **`timelineFromListVenue` maps a CloudObscured headline → `Partial` window** so the fallback (pre-detail-load) sun-window potential still renders as "when it clears" rather than a transparent shaded bar (AC2 completeness for the list-fallback timeline path). The real detail timeline (engine geometric windows) is unaffected.
4. **Mobile obscured axe scans are `test.fixme`** — they render the mobile venue-card-bearing shell underneath, inheriting the SAME pre-existing amber-label contrast debt (Story 5.1) that fixmes every mobile card scan. The obscured chrome itself is AA and gated active on the DESKTOP obscured scans (no venue cards there).

**Maintainer follow-ups (do NOT self-bless):**
- **Visual-validation reference PNGs for the obscured state must be rebaselined by a maintainer.** There is NO reference PNG for `map-with-obscured-venue` or `venue-detail-obscured` today, and the dev is explicitly forbidden from creating/editing reference PNGs to force a pass (Design-Gate honesty callout + retro 9-2 host `/tmp` bug). The muted state was made unambiguous in HUE (slate vs amber vs grey), per the callout, and its AA contrast is gated by the live desktop axe scans. Confirmed no obscured reference PNG exists.
- When the venue-card amber-label contrast debt (Story 5.1) lands, flip the two `test.fixme` mobile obscured axe scans in `axe-mobile.spec.ts` back to `test`.

**Breaking changes:** none. All new props are optional (`isObscured?`, `currentSunStatus?`, `skyCondition?`, new optional label keys); new i18n keys added alongside existing ones (no renames/removals); two new dev-only `_state` ids are additive. No public interface/config/schema/CLI/migration change.

### File List

**Source (12):**
- `nextjs-app/app/globals.css` — added `--color-pin-obscured` + `--color-obscured-text` tokens.
- `nextjs-app/lib/types/design-tokens.ts` — added `'obscured'` to `SunStatus`.
- `nextjs-app/lib/types/map.ts` — added `'obscured'` to `VenuePinSelection`.
- `nextjs-app/lib/utils/sun-status-presentation.ts` — NEW: `toSunStatusToken` (never-exhaustive), `isObscuredSunStatus`, `skyConditionCopy`.
- `nextjs-app/components/custom/map/VenuePin.tsx` — obscured branch + `ObscuredPill`.
- `nextjs-app/components/custom/map/VenuePinLayer.tsx` — `pinObscuredAria` branch.
- `nextjs-app/components/composed/venue/VenueCard.tsx` — `isObscured` prop + muted label/badge/position chip.
- `nextjs-app/components/custom/venue/VenueList.tsx` — `getVenueSunRankForList` obscured ranking, `isVenueSunnyForList`, obscured card wiring + `cardAriaObscured`.
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx` — `currentSunStatus`/`skyCondition` props, muted badge/headline/sky line.
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx` — muted hero badge/headline/section icon + sky line + `timelineFromListVenue` obscured→Partial mapping.
- `nextjs-app/components/custom/map/MapView.tsx` — quick-info prop threading (both call sites), obscured labels in `quickInfoLabels`/`venueDetailLabels`, `map-with-obscured-venue` force-state + `normalizeForcedObscured*`.
- `nextjs-app/components/custom/venue/forced-venue-detail.ts` — `venue-detail-obscured` force-state.

**i18n (4):**
- `nextjs-app/messages/sv/map.json`, `nextjs-app/messages/en/map.json` — `pinObscuredAria`.
- `nextjs-app/messages/sv/venue.json`, `nextjs-app/messages/en/venue.json` — `list.statusObscured`/`obscuredPosition`/`cardAriaObscured`; `quickInfo.obscuredHeadline`/`sky.*`; `detail.obscuredHeadline`/`obscuredBadge`/`sky.*`.

**Docs (2):**
- `nextjs-app/docs/design/DESIGN.md` — obscured token table rows.
- `project-context.md` — `map-with-obscured-venue` + `venue-detail-obscured` Screen ID rows.

**Tests (8):**
- `nextjs-app/test/unit/sun-status-presentation.test.ts` — NEW: mapper + skyCondition tests.
- `nextjs-app/test/components/VenuePin.test.tsx` — obscured pill + single-state.
- `nextjs-app/test/components/VenuePinLayer.test.tsx` — obscured aria (exactly once).
- `nextjs-app/test/components/VenueCard.test.tsx` — four states distinct + position reframe.
- `nextjs-app/test/components/VenueList.test.tsx` — obscured sort ranking (both ways) + muted label.
- `nextjs-app/test/components/VenueQuickInfo.test.tsx` — obscured headline/sky + unavailable + sunny-unchanged.
- `nextjs-app/test/components/VenueDetailContent.test.tsx` — obscured hero/sky + unavailable + sunny-unchanged.
- `nextjs-app/test/e2e/axe.spec.ts`, `nextjs-app/test/e2e/axe-mobile.spec.ts` — obscured surface axe scans (desktop active, mobile fixme).

### Change Log

| Date | Change |
|---|---|
| 2026-07-03 | Story 10.2 implemented — "Sun Behind Clouds" muted two-signal fourth visual state across all six render surfaces (pin/card/list/quick-info/detail), `getVenueSunRankForList` obscured-solläge ranking fix (the 10.1 hand-off), `skyCondition` plain-language copy, two deterministic obscured force-states, obscured axe/component/unit tests. tsc/eslint/vitest all green; desktop obscured axe scans PASS. Status → review. |

### Review Findings

Triaged from the auto-bmad code review (primary Tier-A auditor lens + dedicated security review). Security review: clean (no findings). Blind/Edge lenses deliberately did not run in this epic-mode thin pass.

- [x] [Review][Decision][Med] Non-compact venue card shows no visible "Sol bakom moln" headline — On the obscured non-compact (favourites bottom-sheet) card the muted `statusLabel` ("SOL BAKOM MOLN") is rendered ONLY in the `compact` branch (`VenueCard.tsx:209`); the non-compact branch (`VenueCard.tsx:212-277`) renders only the reframed position chip ("92% solläge · sol här när det klarnar") + Cloud icon + slate palette, plus `cardAriaObscured` on the button. The state is muted, non-amber and visually distinct (AC1 core satisfied), but the literal "Sol bakom moln" headline phrase AC1 names for the card surface is not visibly rendered on this variant. Pre-existing structure (the non-compact card never carried a visible status label). Recommended: fix: add the muted "Sol bakom moln" headline (Cloud icon + `statusObscured`/`obscuredHeadline`, `text-obscured-text`) to the non-compact obscured branch to mirror the compact card and match AC1 wording — low-risk additive render, no logic change. [RESOLVED — added a muted `text-obscured-text` headline (Cloud icon + `statusLabel`/`statusObscured`) at the top of the non-compact obscured branch (`VenueCard.tsx`), gated on `isObscured` only so the sunny/shaded non-compact layout is byte-unchanged. Extended the non-compact AC2 test to assert the "SOL BAKOM MOLN" headline renders in `span.text-obscured-text`.]
- [x] [Review][Decision][Low] Amber open-until pill (with a Sun glyph on desktop) not muted under the obscured gate — `VenueDetailContent.tsx:159-166` renders the "Öppet till {time}" pill as `bg-amber-primary` with a `Sun` glyph (desktop) unconditionally, so an obscured detail header still shows a small amber pill bearing a sun icon while the gate is active. Borderline vs AC1 ("no amber sun badge while the gate is active"): this is an opening-hours affordance, not a sun-status badge. Recommended: dismiss: the open-until pill signals opening hours (shared across sunny/shaded/obscured states alike), not sun state; its amber is the app's standard "open" affordance and the desktop Sun glyph is decorative hours-chrome, not a sun-status badge — AC1's "amber sun badge" targets the sun-status surfaces, all of which were correctly muted. Won't-fix (out of 10.2 scope). [auto-resolved: dismissed per triage recommendation — epic mode]
- [x] [Review][Patch][Med] Amber "Säkerhet" confidence chip not suppressed on the obscured QuickInfo surface [nextjs-app/components/composed/venue/VenueQuickInfo.tsx:278] — `VenueQuickInfo` renders `<span className="font-bold text-amber-text">{labels.confidence}: {confidenceDisplay.visibleText}…</span>` with NO `isObscured` guard, so an obscured quick-info card still shows amber-colored "Säkerhet: X%" text while the gate is active. Asymmetric with `VenueCard`, which explicitly gates its amber confidence chip on `!isObscured` (Completion Note #2, AC1 measure). Fix: wrap the visible amber confidence chip in `!isObscured` (mirror `VenueCard.tsx:238`), keeping the sr-only `accessibleText` path so the accessible name is unchanged; add an obscured QuickInfo test that passes `confidencePercent` and asserts `.text-amber-text` is absent (the current obscured QuickInfo test omits `confidencePercent`, so this path is unexercised). [RESOLVED — gated the visible amber chip on `!isObscured`; when obscured, the sr-only `accessibleText` fallback now renders instead (via `isObscured || !confidenceDisplay.visibleText`) so the accessible name is unchanged, and the desktop `·` separator is suppressed under the gate. Added the obscured QuickInfo test with `confidencePercent={92}` asserting `.text-amber-text` is absent and the accessible name is preserved.]
- [x] [Review][Defer][Low] Shared mapper `toSunStatusToken` is never consumed by any render surface (inert exhaustiveness guard) [nextjs-app/lib/utils/sun-status-presentation.ts:15] — deferred, pre-existing (Task 1 design deviation; not a runtime defect)

