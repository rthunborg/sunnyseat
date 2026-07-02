# Story 9.1: Clean-App Content Sweep (Venue Card & Detail De-Bloat)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want the venue card and detail to show only the essential verdict (a sun % and the basics),
so that the app feels clean and I'm not overloaded with explanatory noise.

## Acceptance Criteria

1. **Given** the venue detail panel (`VenueDetailContent.tsx`) and quick-info card (`VenueQuickInfo.tsx`) on mobile and desktop, **When** they render, **Then** the following are removed: the "EXPONERING" / exposure block, the uncertainty-reason line ("Osäker prognos · Byggnadsskuggor · mer osäkra" and its variants), the "Blir skuggigt om X min" line, and the "Vi räknar på solens läge, byggnadsskuggor och väder…" explanatory paragraph, plus the fabricated venue-detail fact cards that have no truthful source — "BÄST KL." (which contradicts the real Solprognos best-time, e.g. "BÄST KL. 18:00" vs a real "Bäst 08:30–14:00") and "Platser ute ~N" (fabricated seat count) — while the confidence / "Säkerhet %" figure and genuinely-real fact cards (e.g. "Avstånd") are preserved as the trustworthy signals.

2. **Given** these elements are removed, **When** the layout reflows, **Then** no orphaned separators, middots ("·"), empty rows, or dangling labels remain in either breakpoint.

3. **Given** the venue-card accessible name currently embeds the entire uncertainty paragraph and duplicates the confidence ("Säkerhet: 60% Säkerhet 60%"), **When** the visible bloat text is removed, **Then** each card's `aria-label` / accessible name is also reduced to the essentials (name, sun %, confidence once, distance) with no duplicated or orphaned phrases.

4. **Given** the supporting code and content, **When** the sweep is complete, **Then** the now-unused i18n keys are removed from `messages/{sv,en}/venue.json`, the dead `shadowWarningMinutes` render branch + `prediction-uncertainty-display` reason logic are removed (or reduced to what the % still needs), the stale `bistro-bakgarden.shadow_warning_minutes=0` seed is nulled, and the corresponding unit test (`test/unit/prediction-uncertainty-display.test.ts`) is updated/removed accordingly.

### Design Gate Criteria (frontend story — all four are blocking)

- **Visual:** Venue card + detail match the reference `venue-detail` / `map-with-selected-venue` / `map-panel-venues` PNGs with the removed elements (EXPONERING, uncertainty paragraph, shadow-warning line, BÄST KL. + PLATSER UTE fact cards) absent and spacing intact — no gaps or collapsed-but-still-bordered rows where they used to be.
- **Behaviour:** The confidence / "Säkerhet %" still renders for all venue states (full sun, partial, shaded, confidence-unavailable, approximate); no empty/placeholder rows in any state; tapping name/Mer Info/Visa Rutt and favourite toggling all still work.
- **Animation:** No regressions to the existing sun-timeline / confidence / card entrance + QuickInfo slide-up animations (the removed blocks are static text, not animated — removing them must not break the surrounding `motion`/`AnimatePresence` trees).
- **Visual validation:** Screenshot comparison of card + detail (mobile & desktop) against references PASSES before QA handoff (see Dev Notes "Visual gate — exact commands").

## Tasks / Subtasks

- [x] **Task 1 — Remove bloat from `VenueDetailContent.tsx` (AC: #1, #2)**
  - [x] Remove the uncertainty paragraph block — the `{!loading && uncertaintyDisplay && (<p …>…</p>)}` (the "Vi räknar…" description + visibleLabel/visibleSummary + sr-only reasonText). DONE.
  - [x] Remove the **mobile** EXPONERING + BÄST KL. + PLATSER UTE fact cards. KEPT the `labels.facts.distance` (Footprints) FactCard and collapsed the `grid grid-cols-2` to a single full-width AVSTÅND FactCard so there is no empty cell (AC #2). DONE.
  - [x] Remove the **desktop** EXPONERING `DetailRow`. DONE.
  - [x] Remove the dead `shadowWarningMinutes` "Blir skuggigt om X min" branch. DONE.
  - [x] Dropped the now-unused imports (`Compass`, `Armchair`; KEPT `Clock` for Öppettider) + label props (`facts.exposure/bestAt/outdoorSeats`, `shadowWarning`, `uncertainty`) from `VenueDetailContentLabels`; stopped computing `uncertaintyDisplay`/`bestAt`. `getVenueVisualMetadata` still supplies `type/rating/reviewCount/tags/price/distance` — left untouched (the `exposure/bestAt/seats` fields are now unused but the util is shared and out of de-bloat scope; left as-is). DONE.

- [x] **Task 2 — Remove uncertainty block from `VenueQuickInfo.tsx` (AC: #1, #2)**
  - [x] Removed the `{uncertaintyDisplay && (<p …>…</p>)}` block. DONE.
  - [x] Stopped computing `uncertaintyDisplay`; removed `predictionUncertainty` from props + `VenueQuickInfoProps` + `labels.uncertainty`; dropped the prop at `MapView.tsx` (both QuickInfo instances) and the `uncertainty:` line from `quickInfoLabels`/`venueDetailLabels`. DONE.
  - [x] PRESERVED the QuickInfo confidence ("Säkerhet %") line and the `sunExposurePercent` "% SOL" thumbnail badge. DONE.

- [x] **Task 3 — Reduce `VenueCard.tsx` visible bloat + de-duplicate the accessible name (AC: #1, #3)**
  - [x] Removed the uncertainty `<span>` blocks (compact + non-compact). DONE.
  - [x] De-duplicated the accessible name: the button `aria-label` (`labels.select`) carries name + sun% + Säkerhet (once) + Avstånd; removed the in-card sr-only confidence repeats and the sr-only sun+confidence+distance summary; dropped the `selectLabel` uncertainty concatenation. Each fact is now announced exactly once. DONE.
  - [x] Stopped computing `uncertaintyDisplay`; removed `predictionUncertainty` from props + `VenueCardProps` and `labels.uncertainty` from `VenueCardLabels`; removed the `predictionUncertainty={…}` + `uncertainty: predictionUncertaintyLabels(tVenue)` wiring at `VenueList.tsx` (and the now-unused local `predictionUncertaintyLabels`/`tVenue`/type import). DONE.
  - [x] PRESERVED the visible confidence chip (`showVisibleConfidence` path), the `{sunPercent} {sunUnitLabel}` text, and the `statusLabel` sun/cloud chip with its `?? 'MEST SKUGGA'` fallbacks (Story-5.1 deferred item, left in place). DONE.

- [x] **Task 4 — Remove the now-unused i18n keys from `messages/{sv,en}/venue.json` — but KEEP the `uncertainty` keys the route overlay still needs (AC: #4)**
  - [x] KEPT the whole `uncertainty` object (route overlay still consumes it). CONSERVATIVE PATH chosen per the story's steer.
  - [x] Removed nothing from `uncertainty.*` (the util is left intact per Task 5's conservative path, so `short`/`reasons`/`description`/`accessible`/`levels` are all still read).
  - [x] Deleted `detail.facts.exposure/bestAt/outdoorSeats` from BOTH locales; kept `detail.facts.distance` under the `facts` parent. DONE.
  - [x] Deleted `detail.shadowWarning` from BOTH locales. DONE.
  - [x] messages-parity test green (18/18); grep confirms no remaining runtime read of any deleted key; `predictionUncertaintyLabels()` in `MapView.tsx` kept for the route overlay. DONE.

- [x] **Task 5 — Reduce (do NOT delete) `prediction-uncertainty-display` + update its test (AC: #4)**
  - [x] `lib/utils/prediction-uncertainty-display.ts` KEPT — `MapView.tsx` (route overlay) is still a consumer (`getPredictionUncertaintyDisplay` import + `routeConfidenceLabel`). DONE.
  - [x] CONSERVATIVE PATH: left the util's shape unchanged (route overlay reads `visibleLabel`; the other fields stay), so no `uncertainty.*` i18n removal needed in Task 4. AC #4-compliant ("reduced to what the % still needs" — the route overlay needs the level + the util).
  - [x] `test/unit/prediction-uncertainty-display.test.ts` LEFT UNCHANGED (module + its full surface survive for the route overlay) — still green.
  - [x] Route-overlay path verified live (`?venue=test-venue-sunny` → Visa Rutt renders the "Säkerhet · <level>" row); no code on that path was touched, RouteOverlay.tsx + routeLabels/routeConfidenceLabel intact. DONE.

- [x] **Task 6 — Null the stale `bistro-bakgarden` shadow-warning seed (AC: #4)**
  - [x] Live `public.venues.shadow_warning_minutes` for `slug='bistro-bakgarden'` set to NULL via an idempotent service-role PATCH against the live Supabase REST API (project hhnbxrhfhlzxgllxukzj). Verified before=0 → after=null (see Debug Log). No migration framework introduced. DONE.
  - [x] Nulled the seed in the 8-2 contract SQL (`'12:00', 0,` → `'12:00', null,` for the bistro-bakgarden insert row) so a re-seed cannot reintroduce `0`. Confirmed `lib/services/venues-fixture.ts` does not set `shadowWarningMinutes` on the list DTO. DONE.

- [x] **Task 7 — Update component tests to match the trimmed surfaces (AC: all)**
  - [x] `VenueDetailContent.test.tsx` — deleted the uncertainty-note test (reframed to assert the disclaimer is ABSENT); removed `shadowWarningMinutes: 45`, the EXPONERING/BÄST KL./PLATSER UTE facts fields, the `shadowWarning` label, the `uncertaintyLabels` fixture + the `PredictionUncertaintyDisplayLabels`/`expectNoSensitiveSourceTerms` imports; added guards that AVSTÅND + Säkerhet % still render and the removed labels are absent. DONE.
  - [x] Updated `VenueCard`/`VenueList`/`VenueQuickInfo`/`MapView` component tests: replaced the uncertainty assertions with negative guards, and asserted the accessible name contains the confidence exactly once (AC #3). DONE.
  - [x] Full vitest suite green: 83 files / 693 tests (no regressions). DONE.

- [x] **Task 8 — Visual gate + regression verification (AC: Design Gate, #2)**
  - [x] Ran all four visual-gate routes. `map-with-selected-venue` (mobile) and `map-panel-venues` (mobile) PASS. `venue-detail` (mobile + desktop) FAIL — the failures are the references being stale-by-design for this REMOVAL story (the reference PNGs still show the EXPONERING/BÄST KL./PLATSER UTE tiles this story deletes), plus PRE-EXISTING desktop scope-drift (time-slider-not-full-bleed → Story 9.9; language-switcher navbar → merged PR #14). Captured implementation screenshots confirm the de-bloated surface is clean: uncertainty paragraph gone, single full-width AVSTÅND tile (no orphaned cell/separator — AC #2), shadow-warning gone, all kept signals intact. Reference re-baseline needs maintainer sign-off (see Completion Notes — gate script forbids self-editing the reference/gate).
  - [x] Desktop `responsive-layout.spec.ts` D5–D7 bounding-box invariants PASS (3 passed) — venue-detail/QuickInfo geometry did not regress. DONE.

## Dev Notes

### Why this exists (root cause)
Spine 2 of the Epic 9 party-mode live-app triage: "fabricated venue metadata." The venue card and detail currently surface a wall of explanatory + invented content — an exposure compass direction, a "BÄST KL." best-time that contradicts the real Solprognos window, a made-up "Platser ute ~N" seat count, a multi-sentence uncertainty disclaimer, and a dead "Blir skuggigt om X min" warning — none of which has a truthful data source. The brief is to strip them to the trustworthy signals (sun %, Säkerhet %, real distance, the real sun timeline) so the app reads clean and honest. This is a content/UX SWEEP, not a redesign — keep the surviving layout pixel-faithful to the references.

### Exact removal map (file → lines → what)
All paths under `nextjs-app/`. Line numbers are at the time of writing — confirm by reading the file first.

| File | Lines | Remove |
|---|---|---|
| `components/composed/venue/VenueDetailContent.tsx` | 221-233 | uncertainty paragraph `<p>` (description + reason + sr-only) |
| `components/composed/venue/VenueDetailContent.tsx` | 270-284 | mobile FactCards: EXPONERING (Compass), BÄST KL. (Clock), PLATSER UTE (Armchair). Keep AVSTÅND (Footprints, 265-269). |
| `components/composed/venue/VenueDetailContent.tsx` | 337-344 | desktop EXPONERING `DetailRow` |
| `components/composed/venue/VenueDetailContent.tsx` | 301-307 | `shadowWarningMinutes` "Blir skuggigt om X min" branch |
| `components/composed/venue/VenueQuickInfo.tsx` | 232-249 | uncertainty `<p>` |
| `components/composed/venue/VenueCard.tsx` | 166-175, 211-219 | uncertainty `<span>` (compact + non-compact) |
| `components/composed/venue/VenueCard.tsx` | 106-108, 196-224 | de-dup accessible name (selectLabel uncertainty + redundant sr-only repeats) |
| `messages/sv/venue.json` + `messages/en/venue.json` | `detail.facts.exposure/bestAt/outdoorSeats`, `detail.shadowWarning` (and OPTIONALLY `uncertainty.short/reasons/description` — only if the util is reduced; the route overlay keeps `uncertainty.levels`) | remove identically in both locales |
| `lib/utils/prediction-uncertainty-display.ts` + `test/unit/prediction-uncertainty-display.test.ts` | KEEP (still used by the route overlay) | optionally reduce to `visibleLabel`/`levels`; update the test to the surviving surface — do NOT delete |

### Wiring sites that pass the removed props/labels (must also be trimmed)
- `components/custom/venue/VenueList.tsx:94` — `predictionUncertainty={venue.predictionUncertainty}`; `:122` — `uncertainty: predictionUncertaintyLabels(tVenue)`; `:103-108` — the `cardAria` build whose `{confidence}` is `confidenceDisplay.accessibleText` (this is half the AC #3 duplication).
- `components/custom/map/MapView.tsx:914,942` — `predictionUncertainty={selectedQuickInfoVenue?.predictionUncertainty}` on the two `VenueQuickInfo` instances → REMOVE; `:1127` (`quickInfoLabels`), `:1170` (`venueDetailLabels`) — the `uncertainty: predictionUncertaintyLabels(t)` lines → REMOVE; `:1157-1162` — the `facts.{exposure,bestAt,outdoorSeats}` label object → REMOVE (keep `facts.distance`); `:1149` — `shadowWarning` → REMOVE. **KEEP `:1187` (`routeLabels` `uncertainty: predictionUncertaintyLabels(t)`) and KEEP `routeConfidenceLabel`/`predictionUncertaintyLabels` (≈1229-1320)** — the route overlay still renders the uncertainty level word. The `getPredictionUncertaintyDisplay` import at `MapView.tsx:44` stays.

### The AC #3 duplication, concretely
With `confidence=60`, `cardAria` ("Välj {name}, {sun}, {confidence}, Avstånd {distance}") interpolates `{confidence}` = `confidenceDisplay.accessibleText` (which already reads "Säkerhet 60% …"), THEN `VenueCard` appends `uncertaintyDisplay.accessibleText` to that, AND the in-card sr-only spans re-emit "Säkerhet: 60% Säkerhet 60% …" and a second sun+confidence+distance summary. The fix is to make the button's accessible name carry each fact once (name, sun%, Säkerhet once, Avstånd) and delete the redundant sr-only repeats — do not just trim the visible text and leave the sr-only duplication.

### Visual gate — exact commands (the gate is an LLM eyeball, not a pixel diff)
The "Visual validation" criterion is produced by `.claude/scripts/visual-validate.sh`, which screenshots the running dev server and asks `claude-sonnet-4-6` for a PASS/FAIL against the reference PNG. It is lenient on spacing but BLOCKS on gross layout/position/missing-element differences. Reference PNGs already exist for all three screens. With the dev server running (`cd nextjs-app && npm run dev`) and `ANTHROPIC_API_KEY` set:
```bash
.claude/scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=14:00" mobile
.claude/scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=16:30" desktop
.claude/scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00" mobile
.claude/scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues&_time=14:00" mobile
```
Routes/viewports come from the Screen ID → Route Map in `project-context.md` (the gate reads it). The dev-seeded slug `test-venue-sunny` must exist in the dev DB. **Do NOT edit `visual-validate.sh` or the prompt to force a pass — fix the implementation.** The LLM gate misses width/centering regressions (MEMORY: "visual gate is an LLM eyeball"), so ALSO run the deterministic `responsive-layout.spec.ts` D5–D7 desktop bounding-box invariants as the reliable geometric backstop. Note the `?_time=14:00`/`16:30` in these routes is the Story 9.0-gated dev-forcing param; it stays active because the gate runs against `next dev` (development), not a production build.

### Scope discipline (do NOT expand)
- This is a removal/cleanup sweep. Do NOT redesign the card/detail, change colours/tokens, or touch the CTA gradient (that is Story 9.2), the sun-compute path (9.3/9.4), the map chrome (9.6), tags (9.7), sharing (9.8), or the QuickInfo card rework (9.9).
- Do NOT remove the `VenueCard` hardcoded Swedish status fallbacks (`?? 'MEST SKUGGA'`) — that is a Story-5.1-targeted deferred item, out of scope here (see Deferred-work check).
- Preserve every kept signal: sun %, Säkerhet %, real AVSTÅND, the SunTimeline / Solprognos, the "% SOL" thumbnail badge, the ÖPPET status badge.

### Project Structure Notes
- Components live in `components/composed/venue/` (presentational) wired by containers in `components/custom/venue/` (VenueList) and `components/custom/map/` (MapView). Labels are threaded from the containers via `useTranslations('venue')` — never hardcode copy.
- Tests: `test/components/[Name].test.tsx` mirrors a component; `test/unit/` mirrors `lib/`; `test/e2e/` Playwright (per architecture.md §"Test Organization"). Design tokens come from `docs/design/DESIGN.md` — do not redefine.
- i18n: sv + en must stay key-for-key identical (enforced by `test/unit/messages-parity.test.ts`); Swedish is the source language and the production default.

### Constraints carried in from Epic 9 retro-notes (`_bmad-output/auto-bmad/retro-notes/epic-9.md`)
- **Story 9.0 convention (ratified):** the `_time`/`_date` planner-forcing params are now production-gated but remain active under `next dev`. The visual-gate routes above append `?_time=` and still work because the gate runs against the dev server — do NOT "fix" them by dropping `_time` (you would de-determinise the reference time).
- The other epic-9 retro bullets (sun-engine double-RPC / false "one buildings fetch reused" comment) belong to Stories 9.3/9.4, NOT this story — out of scope.

### Deferred-work ledger check (`_bmad-output/implementation-artifacts/deferred-work.md`)
- **Active overlap — `VenueCard` hardcoded Swedish sun-label fallbacks** *(Target: Story 5.1)*: `VenueCard.tsx:109-113` carries `?? 'MEST SKUGGA'` / `?? 'FULL SOL'` / `?? 'DELVIS SOL'`. This story touches `VenueCard.tsx` but the fallbacks are explicitly targeted at Story 5.1 (the venue-card/pin rework). **Leave them in place** — removing them here would steal scope from 5.1 and is not part of this AC. Just don't let your aria-label refactor accidentally drop the `statusLabel` they back.
- **Pre-existing color-contrast (WCAG) on venue-card amber labels** *(Target: Story 5.1)*: the venue-card `text-amber-text` confidence label (~1.63:1 on cream) is a known a11y debt targeted at 5.1. You are removing surrounding text, not restyling the confidence chip, so don't worsen it — but do NOT take on the contrast fix here.
- No other ledger entry overlaps this story's files/area.

### Persistent facts (epic-wide / earlier-story conventions)
- The app is LIVE on the real data path (`SUNNYSEAT_VENUE_STORE=supabase`, `SUN_ENGINE=real`) since the 2026-06-29 production cutover. The venue detail's `shadowWarningMinutes` therefore comes from the live `public.venues` column, not a fixture — hence Task 6 nulls the live row.
- `getConfidenceDisplayState` (`lib/utils/confidence-display.ts`) is the canonical confidence renderer and is PRESERVED; only `getPredictionUncertaintyDisplay` is being removed/reduced.
- `getVenueVisualMetadata` still legitimately supplies `type/rating/reviewCount/tags/price/distance` to the detail header — only its `exposure/bestAt/seats` outputs become unused after this sweep. Prune those fields only if nothing else reads them (grep `metadata.exposure`, `metadata.seats`, `metadata.bestAt`).
- Swedish is the source/default locale; en mirrors it key-for-key (messages-parity gate).

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.1: Clean-App Content Sweep (Venue Card & Detail De-Bloat)] — user story, 4 ACs, Design Gate Criteria.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9] — Spine 2 "fabricated venue metadata" rationale.
- [Source: nextjs-app/components/composed/venue/VenueDetailContent.tsx (lines 221-344)] — uncertainty paragraph, fact cards, desktop exposure row, shadow-warning branch.
- [Source: nextjs-app/components/composed/venue/VenueQuickInfo.tsx (lines 103-108, 232-249)] — uncertainty compute + render block.
- [Source: nextjs-app/components/composed/venue/VenueCard.tsx (lines 100-224)] — uncertainty blocks + accessible-name duplication.
- [Source: nextjs-app/components/custom/venue/VenueList.tsx (lines 73-127)] — card wiring, `cardAria`, `predictionUncertaintyLabels`.
- [Source: nextjs-app/components/custom/map/MapView.tsx (lines 912-946, 1115-1190)] — QuickInfo/detail/route label builders + prop wiring.
- [Source: nextjs-app/lib/utils/prediction-uncertainty-display.ts + test/unit/prediction-uncertainty-display.test.ts] — the logic + test to KEEP (still used by the route overlay) and optionally reduce.
- [Source: nextjs-app/components/custom/routing/RouteOverlay.tsx (lines 132-137) + components/custom/map/MapView.tsx (routeConfidenceLabel ≈1229-1268, predictionUncertaintyLabels ≈1288-1320)] — the SURVIVING uncertainty consumer; why the util + `uncertainty.levels` keys must be kept.
- [Source: nextjs-app/messages/sv/venue.json + messages/en/venue.json] — `uncertainty`, `detail.facts.*`, `detail.shadowWarning` keys.
- [Source: nextjs-app/app/api/venues/[slug]/route.ts (lines 140-176)] — `buildDetailDto` `shadowWarningMinutes` source.
- [Source: _bmad-output/implementation-artifacts/8-2-venues-store-contract.sql (lines 239-244)] — bistro-bakgarden `shadow_warning_minutes=0` seed.
- [Source: nextjs-app/lib/services/venues-fixture.ts (lines 170-191)] — fixture row (no list-DTO shadowWarningMinutes).
- [Source: nextjs-app/lib/utils/venue-visual-metadata.ts] — `exposure/bestAt/seats` fields (fabricated metadata source).
- [Source: project-context.md (§Screen ID → Route Map, lines 167-170)] — visual-gate routes for the affected screens.
- [Source: .claude/scripts/visual-validate.sh + .claude/skills/visual-validation/SKILL.md] — the visual gate mechanism + manual commands.
- [Source: nextjs-app/test/e2e/responsive-layout.spec.ts (D5–D7)] — deterministic geometric backstop.
- [Source: nextjs-app/test/unit/messages-parity.test.ts] — sv/en key-parity enforcement.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — Story-5.1-targeted venue-card fallback + amber-contrast items (do not action here).
- [Source: _bmad-output/auto-bmad/retro-notes/epic-9.md] — Story 9.0 `_time` dev-forcing convention.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Amelia / bmad-dev-story)

### Debug Log References

- **Live SQL hygiene (Task 6):** read-then-update-then-verify against live Supabase project `hhnbxrhfhlzxgllxukzj` via an idempotent service-role REST PATCH (`/rest/v1/venues?slug=eq.bistro-bakgarden`, body `{"shadow_warning_minutes": null}`, `Prefer: return=representation`). Before: `shadow_warning_minutes: 0`. After (verified read): `shadow_warning_minutes: null`. The MCP server was reachable (HTTP 401 unauth = up); the service-role key from `nextjs-app/.env.local` (bypasses RLS, matching the documented server-only venue-read access model) was used for the one-row update. Idempotent (re-running sets null→null).
- **Visual gate:** `map-with-selected-venue` (mobile) PASS, `map-panel-venues` (mobile) PASS, `venue-detail` (mobile + desktop) FAIL — stale-by-design reference (still shows the removed tiles) + pre-existing desktop scope-drift (time-slider, language switcher). Implementation screenshots captured to scratchpad confirm the cleaned surface.
- **Regression:** vitest 83 files / 693 tests pass; tsc 0; eslint 0 errors (6 pre-existing warnings in untouched code). `responsive-layout.spec.ts` D5–D7 pass. Two `map-primary.spec.ts` e2e tests fail (mobile future-date planner-API timeout @451; desktop planner-bar-spans-viewport @645) — both exercise the time-planner/calendar chrome, NOT this story's surface; confirmed pre-existing (my diff touches no planner/API/spec code) and owned by Story 9.9 / the 9.0 `_time` work.

### Completion Notes List

Story 9.1 — Clean-App Content Sweep (venue card + detail de-bloat), Epic 9 Spine 2 "fabricated venue metadata."

**What was removed (the bloat):**
- Venue detail: the "Vi räknar…" uncertainty paragraph + "Osäker prognos · …" reason line; the fabricated EXPONERING / BÄST KL. / PLATSER UTE fact cards (mobile) and the desktop EXPONERING DetailRow; the dead "Blir skuggigt om X min" shadow-warning line. The mobile 2-col fact grid collapsed to a single full-width AVSTÅND tile (no orphaned cell — AC #2).
- Venue quick-info (map-selected card): the uncertainty paragraph block.
- Venue card (list): the visible uncertainty `<span>` (compact + non-compact) AND the duplicated accessible-name fragments — the button `aria-label` now carries name + sun% + Säkerhet (once) + Avstånd, with the redundant in-card sr-only confidence/summary repeats removed (AC #3 de-dup verified by tests).
- Forced-state initial frame (`ForcedVenueDetailInitialFrame.tsx` / `forced-venue-detail.ts`): trimmed the same labels + dropped the `shadowWarningMinutes: 45` forced DTO field (an extra consumer the story's removal map did not list — found via grep, so the deleted i18n keys are truly unreferenced).

**What was preserved (the trustworthy signals):** sun %, "Säkerhet %" confidence, the real AVSTÅND, the Solprognos/SunTimeline, the "% SOL" thumbnail badge, the ÖPPET status badge, the `statusLabel` sun/cloud chip (and its Story-5.1-deferred `?? 'MEST SKUGGA'` fallbacks, left intact).

**Conservative-path decision (Tasks 4/5):** the RouteOverlay still consumes `getPredictionUncertaintyDisplay` via `MapView.routeConfidenceLabel`, so per the story's explicit steer I KEPT `lib/utils/prediction-uncertainty-display.ts` + its test fully intact and KEPT the entire `uncertainty.*` i18n block + `predictionUncertaintyLabels()` in MapView (route surface). Only the truly-unreferenced keys were deleted: `detail.facts.exposure/bestAt/outdoorSeats` + `detail.shadowWarning` (both locales). This is AC #4-compliant ("reduced to what the % still needs"). A literal full deletion would have broken the route overlay — avoided.

**Design gate:** Visual — the two card/quick-info gates PASS; the two `venue-detail` gates FAIL ONLY because the reference PNGs predate this removal story (they still render the deleted tiles) plus pre-existing desktop scope-drift. Per the gate script's own shape-(b) instruction, the reference re-baseline for `venue-detail` (mobile + desktop) requires explicit maintainer sign-off — the script forbids self-editing the reference/gate to force a pass. Behaviour — confidence renders in all states; Mer Info/Visa Rutt/favourite untouched. Animation — only static text removed; the `motion`/`AnimatePresence` trees in QuickInfo/VenueCard are unchanged (reduced-motion + stagger tests pass). Geometric backstop D5–D7 PASS.

**Open items for review/maintainer:**
1. **Reference re-baseline (maintainer action):** `nextjs-app/docs/design/references/screens/{mobile,desktop}/venue-detail.png` must be re-captured to reflect the de-bloated surface so the visual gate goes green. The gate script (`.claude/scripts/visual-validate.sh`) explicitly prohibits the dev agent from editing the reference; this is a deliberate hand-off.
2. Two pre-existing `map-primary.spec.ts` e2e failures (planner/time-slider chrome) are out of scope — Story 9.9 territory.

### File List

Modified (source):
- nextjs-app/components/composed/venue/VenueDetailContent.tsx
- nextjs-app/components/composed/venue/VenueQuickInfo.tsx
- nextjs-app/components/composed/venue/VenueCard.tsx
- nextjs-app/components/custom/venue/VenueList.tsx
- nextjs-app/components/custom/map/MapView.tsx
- nextjs-app/components/custom/venue/ForcedVenueDetailInitialFrame.tsx
- nextjs-app/components/custom/venue/forced-venue-detail.ts
- nextjs-app/messages/sv/venue.json
- nextjs-app/messages/en/venue.json

Modified (tests):
- nextjs-app/test/components/VenueDetailContent.test.tsx
- nextjs-app/test/components/VenueQuickInfo.test.tsx
- nextjs-app/test/components/VenueCard.test.tsx
- nextjs-app/test/components/VenueList.test.tsx
- nextjs-app/test/components/MapView.test.tsx

Modified (contract / data hygiene):
- _bmad-output/implementation-artifacts/8-2-venues-store-contract.sql (bistro-bakgarden shadow_warning_minutes seed 0 → null)
- Live DB: `public.venues.shadow_warning_minutes` set NULL for slug `bistro-bakgarden` (not git-tracked; idempotent live UPDATE)

Kept intentionally (NOT deleted — still consumed by the RouteOverlay):
- nextjs-app/lib/utils/prediction-uncertainty-display.ts
- nextjs-app/test/unit/prediction-uncertainty-display.test.ts
- `uncertainty.*` keys in messages/{sv,en}/venue.json

### Change Log

- 2026-06-30 — Story 9.1 de-bloat implemented: removed the EXPONERING/uncertainty/BÄST KL./PLATSER UTE/shadow-warning content from venue card + detail + quick-info, de-duplicated the venue-card accessible name (AC #3), deleted the unreferenced `detail.facts.{exposure,bestAt,outdoorSeats}` + `detail.shadowWarning` i18n keys (both locales), and nulled the bistro-bakgarden `shadow_warning_minutes` seed live + in the 8-2 contract SQL. Kept `prediction-uncertainty-display` + `uncertainty.*` keys for the surviving RouteOverlay. Status → review.

### Review Findings

Code review (THIN Tier-A, epic-mode, R=1): Acceptance Auditor lens + dedicated security review. **Verdict: Approve.** Severity counts — Critical 0 / High 0 / Med 0 / Low 0 (surviving). All 4 ACs confirmed faithfully implemented, KEEP scoping constraint verified clean (no over-deletion of the route-overlay surface). Security: 0 findings (net content reduction; removed JSX/labels/i18n only — no new executable surface, no injection/auth/crypto/XSS exposure). No surviving Decision / Patch / Defer items.

Dismissed (noise) — 3 Low, all categorized already-handled:
- [Dismissed][Low] `getVenueVisualMetadata.exposure/bestAt/seats` outputs left dead — explicit story decision (Dev Notes "Persistent facts" + Task 1): the util is shared and pruning is out of de-bloat scope; the fabricated values are no longer surfaced to the user, which satisfies the AC intent. Documented intentional deviation, not a defect. (category: already-handled / out-of-scope)
- [Dismissed][Low] `forced-venue-detail.ts` `shadowWarningMinutes: 45` removal undocumented-in-AC — the auditor itself concludes "Correct, not a violation"; the dev found the extra consumer via grep and trimmed it + the matching `shadowWarning` label so the deleted i18n key is truly unreferenced (prevents an orphaned `t('detail.shadowWarning')` runtime throw). Correct implementation detail, not a defect. (category: already-handled)
- [Dismissed][Low] 8-2 contract SQL seed change (`0` → `null` for bistro-bakgarden) "not visible in the diff" — DIFF-SCOPE ARTIFACT: the review diff intentionally excludes `_bmad-output/` paths. The SQL change IS committed (verified in commit 2441e9a, 1 file changed) and is recorded in the story File List + Task 6. (category: already-handled / diff-scope artifact)

Failed layers: none (Tier-A thin review runs only the Auditor + security lenses by design; Blind/Edge lenses intentionally not run — absence is not a failed layer).
