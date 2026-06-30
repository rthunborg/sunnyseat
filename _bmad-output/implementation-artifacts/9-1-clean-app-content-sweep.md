# Story 9.1: Clean-App Content Sweep (Venue Card & Detail De-Bloat)

Status: ready-for-dev

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

- [ ] **Task 1 — Remove bloat from `VenueDetailContent.tsx` (AC: #1, #2)**
  - [ ] Remove the uncertainty paragraph block — the `{!loading && uncertaintyDisplay && (<p …>…</p>)}` at `VenueDetailContent.tsx:221-233` (the "Vi räknar…" description + visibleLabel/visibleSummary + sr-only reasonText). This is the "Vi räknar på solens läge, byggnadsskuggor och väder…" paragraph AND the "Osäker prognos · Byggnadsskuggor mer osäkra" reason line in one element.
  - [ ] Remove the **mobile** EXPONERING + BÄST KL. + PLATSER UTE fact cards from the 2-col grid (`VenueDetailContent.tsx:263-286`): delete the three `<FactCard>`s for `labels.facts.exposure` (Compass icon), `labels.facts.bestAt` (Clock icon), and `labels.facts.outdoorSeats` (Armchair icon). **Keep** the `labels.facts.distance` (Footprints) FactCard — it is the genuine "Avstånd" signal. A single surviving fact card in a `grid grid-cols-2` will sit in one cell; collapse the grid to a single full-width fact (or a simple row) so there is no empty second cell / orphaned column (AC #2).
  - [ ] Remove the **desktop** EXPONERING row — the `{isDesktop && (<DetailRow … title={labels.facts.exposure}>{metadata.exposure}</DetailRow>)}` at `VenueDetailContent.tsx:337-344`.
  - [ ] Remove the dead `shadowWarningMinutes` render branch at `VenueDetailContent.tsx:301-307` (`{detail?.shadowWarningMinutes != null && (<p className="…text-error">{formatLabel(labels.shadowWarning,…)}</p>)}`) — the "Blir skuggigt om X min" line.
  - [ ] Drop the now-unused imports + label props: `Compass`, `Armchair` (and `Clock` ONLY if no longer used — it is still used by the Öppettider DetailRow, so KEEP `Clock`); remove `labels.facts.exposure/bestAt/outdoorSeats`, `labels.shadowWarning`, and `labels.uncertainty` from `VenueDetailContentLabels` and stop computing `uncertaintyDisplay`/`bestAt`/`metadata.exposure`/`metadata.seats`. Verify `getVenueVisualMetadata` is still needed for `metadata.type/rating/reviewCount/tags/price/distance` (it is) before deciding what to prune from the returned object.

- [ ] **Task 2 — Remove uncertainty block from `VenueQuickInfo.tsx` (AC: #1, #2)**
  - [ ] Remove the `{uncertaintyDisplay && (<p …>…</p>)}` block at `VenueQuickInfo.tsx:232-249` (visibleLabel + " · " + visibleSummary + sr-only accessibleText).
  - [ ] Stop computing `uncertaintyDisplay` (lines 103-108) and remove `predictionUncertainty` from the destructured props + `VenueQuickInfoProps` + `labels.uncertainty`. Verify the prop is also dropped at the call sites in `MapView.tsx:914,942` (`predictionUncertainty={…}`) and that `quickInfoLabels`/`venueDetailLabels` in `MapView.tsx` stop passing `uncertainty: predictionUncertaintyLabels(t)` (lines 1127, 1170).
  - [ ] The QuickInfo confidence (`{labels.confidence}: {confidenceDisplay.visibleText}` + sr-only) at lines 207-217 is PRESERVED — that is the "Säkerhet %" trustworthy signal. Do NOT touch the `sunExposurePercent` "% SOL" thumbnail badge (`VenueThumbnail`, lines 373-378) — it is a real signal, not the EXPONERING block.

- [ ] **Task 3 — Reduce `VenueCard.tsx` visible bloat + de-duplicate the accessible name (AC: #1, #3)**
  - [ ] Remove the uncertainty `<span>` blocks: compact branch `VenueCard.tsx:166-175` AND non-compact branch `VenueCard.tsx:211-219`.
  - [ ] De-duplicate the accessible name. Today three places emit confidence/uncertainty text: (a) `selectLabel` (lines 106-108) appends `uncertaintyDisplay.accessibleText` (the whole paragraph) to `labels.select`; (b) the `select` label itself is built in `VenueList.tsx:103-108` from `cardAria` whose `{confidence}` arg is `confidenceDisplay.accessibleText`; (c) the in-card sr-only blocks at lines 196-199 / 204-207 re-emit `labels.confidence: visibleText accessibleText`, and the sr-only summary at lines 221-224 emits sun + confidence + distance AGAIN. Reduce to: the button `aria-label` = name + sun% + confidence (once) + distance, and remove the now-redundant in-card sr-only repeats so a screen reader hears each fact exactly once. Drop the `selectLabel` uncertainty concatenation (no more `uncertaintyDisplay` in the accessible name).
  - [ ] Stop computing `uncertaintyDisplay` (lines 100-105); remove `predictionUncertainty` from props + `VenueCardProps` and `labels.uncertainty` from `VenueCardLabels`. Remove the `predictionUncertainty={venue.predictionUncertainty}` and `uncertainty: predictionUncertaintyLabels(tVenue)` wiring at `VenueList.tsx:94,122`.
  - [ ] PRESERVE the visible confidence chip (`VenueCard.tsx:191-209`, `showVisibleConfidence` path) and the `{sunPercent} {sunUnitLabel}` text — these are the kept signals. PRESERVE the `statusLabel` sun/cloud chip. (Note the hardcoded Swedish status fallbacks `?? 'MEST SKUGGA'` etc. at lines 109-113 are a SEPARATE deferred item targeted at Story 5.1 — do NOT remove them here; see Deferred-work check.)

- [ ] **Task 4 — Remove the now-unused i18n keys from `messages/{sv,en}/venue.json` — but KEEP the `uncertainty` keys the route overlay still needs (AC: #4)**
  - [ ] **CRITICAL — the `uncertainty` block is NOT fully dead.** The RouteOverlay still surfaces it: `MapView.tsx:routeConfidenceLabel` (≈ lines 1229-1268) calls `getPredictionUncertaintyDisplay(...)` and renders `uncertaintyDisplay.visibleLabel` as the route-overlay confidence row ("Säkerhet 88% · Osäker prognos", `RouteOverlay.tsx:132-137`). This story's AC names only the card/detail/quickinfo surfaces — do NOT remove the route-overlay uncertainty label. Therefore do **NOT** delete the whole `uncertainty` object.
  - [ ] Delete ONLY the `uncertainty` sub-keys that become unreferenced once the card/detail/quickinfo paragraphs are gone AND the util is reduced (Task 5): the route path consumes only the level word (`uncertainty.levels.*`). The `uncertainty.short.*` and `uncertainty.reasons.*` and `uncertainty.description` sub-objects feed only the removed paragraph/summary/accessible-paragraph text. Remove those sub-keys from BOTH locales **only after** Task 5 has trimmed `getPredictionUncertaintyDisplay` so it no longer reads them; if you keep the util's `accessibleText` builder intact (lower-risk), KEEP `description`/`reasons`/`accessible` and remove nothing from `uncertainty` — that is an acceptable, AC-compliant outcome since the AC says "reduced to what the % still needs," and the route overlay needs the level + accessible builder. **Pick the conservative path unless you fully trace the reduction.**
  - [ ] Delete `detail.facts.exposure`, `detail.facts.bestAt`, `detail.facts.outdoorSeats` from BOTH locales (keep `detail.facts.distance`). If `facts` would then hold only `distance`, keep it as `{ "distance": … }` (do not delete the parent if `distance` survives).
  - [ ] Delete `detail.shadowWarning` from BOTH locales (no surviving consumer — the route overlay does not use it; the only reader was the removed `VenueDetailContent` branch).
  - [ ] Run the messages-parity test (`test/unit/messages-parity.test.ts`) — sv and en must stay key-for-key identical; delete the SAME keys from both files. Then grep for any remaining `t('uncertainty.<removed-key>')` / `t('detail.facts.<removed-key>')` / `t('detail.shadowWarning')` runtime read and remove it, so no live lookup references a deleted key. **`predictionUncertaintyLabels()` in `MapView.tsx` (lines 1288-1320) is STILL needed for the route overlay** — keep it (and only drop the sub-key reads inside it that correspond to keys you deleted).

- [ ] **Task 5 — Reduce (do NOT delete) `prediction-uncertainty-display` + update its test (AC: #4)**
  - [ ] `getPredictionUncertaintyDisplay` / `PredictionUncertaintyDisplayLabels` is imported by `VenueCard.tsx`, `VenueQuickInfo.tsx`, `VenueDetailContent.tsx` AND `MapView.tsx` (the route-overlay builder, line 44 + 1243). After Tasks 1-3 remove the first three importers, **`MapView.tsx` is still a consumer** — so `lib/utils/prediction-uncertainty-display.ts` MUST be KEPT (do not delete the module).
  - [ ] Optionally reduce the util to what the surviving route surface needs (`visibleLabel` from `levels`). The route path reads only `uncertaintyDisplay.visibleLabel`; `descriptionText`/`reasonText`/`visibleSummary`/`accessibleText` become unused. You MAY trim those (and then the matching `short`/`reasons`/`description` label fields + i18n keys in Task 4), OR leave the util intact — both satisfy AC #4's "reduced to what the % still needs." The conservative, lower-risk choice is to leave the util's shape unchanged and remove nothing from `uncertainty.*` in Task 4; only do the reduction if you trace every reader.
  - [ ] Update `test/unit/prediction-uncertainty-display.test.ts` to match WHATEVER you kept — it must keep importing the (surviving) module and only assert on the surviving surface. Do NOT delete the test (the module survives for the route overlay).
  - [ ] After any reduction, run the route-overlay path in dev (`?venue=test-venue-sunny` → Visa Rutt) to confirm the "Säkerhet · <level>" row still renders for an uncertain venue — that is the regression risk of over-trimming.

- [ ] **Task 6 — Null the stale `bistro-bakgarden` shadow-warning seed (AC: #4)**
  - [ ] The app is LIVE on the Supabase venue store (`SUNNYSEAT_VENUE_STORE=supabase`), so `shadowWarningMinutes` for the detail comes from the live `public.venues.shadow_warning_minutes` column via `storedVenueDetail` → `buildDetailDto` (`app/api/venues/[slug]/route.ts:172-174`). Set `public.venues.shadow_warning_minutes = NULL` where `slug = 'bistro-bakgarden'` (it is seeded `0` in `_bmad-output/implementation-artifacts/8-2-venues-store-contract.sql:239-244`). Because the render branch is being removed in Task 1, this is belt-and-suspenders data hygiene; do it via a small idempotent SQL update (record it in the Debug Log) — do NOT introduce a migration framework.
  - [ ] Also null the seed in the 8-2 contract SQL (`shadow_warning_minutes` for the bistro-bakgarden insert row) so a future re-seed does not reintroduce `0`, and confirm the in-memory fixture (`lib/services/venues-fixture.ts:170-191`) does not set `shadowWarningMinutes` on the list DTO (it does not — only the detail route did, via the stored column).

- [ ] **Task 7 — Update component tests to match the trimmed surfaces (AC: all)**
  - [ ] `test/components/VenueDetailContent.test.tsx` — DELETE the `it('renders a concise uncertainty note near the sun forecast context', …)` test (lines ≈260-289; it asserts the "Vi räknar…" paragraph, "Lokala hinder kan påverka", "Träd kan påverka platsen" — all removed). Remove the `shadowWarningMinutes: 45` fixture field (line ≈42) and any assertion of "Blir skuggigt om…". Remove `labels.facts.exposure/bestAt/outdoorSeats` ("EXPONERING"/"BÄST KL."/"PLATSER UTE") fixture fields (lines ≈67-69) and any assertion on them; drop the `uncertaintyLabels` fixture + `PredictionUncertaintyDisplayLabels` import + `labels.shadowWarning` (lines ≈8,57,80) if no longer referenced. ADD guards: the AVSTÅND fact + the Säkerhet % still render, and (AC #2) no empty grid cell / dangling separator remains. Keep `expectNoSensitiveSourceTerms` only if a surviving render still exercises it.
  - [ ] Update any `VenueCard` / `VenueList` / `VenueQuickInfo` component tests that assert on the uncertainty text or the duplicated aria-label; add/keep an assertion that the accessible name contains the confidence exactly once (AC #3).
  - [ ] Run the full vitest suite — it must stay green (baseline 689/689 after Story 9.0; expect the count to change as the uncertainty-display test is removed/trimmed).

- [ ] **Task 8 — Visual gate + regression verification (AC: Design Gate, #2)**
  - [ ] Run the visual gate for the three affected screens at both viewports (see Dev Notes "Visual gate — exact commands"). All must PASS before flipping sprint-status to `review`.
  - [ ] Run the desktop `responsive-layout.spec.ts` bounding-box invariants (D5–D7) to confirm the venue-detail/QuickInfo geometry did not regress when the rows were removed.

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

### Debug Log References

### Completion Notes List

### File List
