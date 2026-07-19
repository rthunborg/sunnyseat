# UX Reference Re-baseline Log

This is the durable audit trail for every change to the visual-validation reference PNGs and the recipes that generate them. Every re-baseline of a screen reference (whether the active PNG was replaced manually, the legacy export was promoted, or `scripts/capture-claude-design-refs.mjs` had its recipe altered or removed) MUST be recorded here in the same operation.

## When this log is mandatory

Add an entry whenever any of the following happens:

- A reference PNG under `nextjs-app/docs/design/references/screens/{mobile,desktop}/<screen-id>.png` is replaced with a different image (manually copied, swapped from `legacy/`, hand-edited, regenerated against a different prototype, etc.).
- A recipe in `nextjs-app/scripts/capture-claude-design-refs.mjs` is added, removed, or materially changed (state-forcing path, prototype source, viewport, click sequence).
- `nextjs-app/scripts/fetch-claude-design.sh` is run with a known-incompatible bundle (i.e. you accept a Claude Design bundle change that diverges from the UX spec for some screens — record those screens here so the next person knows).

If a re-baseline is left undocumented, future dev agents will assume the active PNG matches the prototype and chase phantom defects when the gate fails.

## How future dev agents discover this log

- `nextjs-app/CLAUDE.md` lists this file under §"Critical rules" (the visual-gate rule).
- `project-context.md` §"Design Artifacts" links here.
- The header of `nextjs-app/scripts/capture-claude-design-refs.mjs` points here for any recipe gap.
- Adjacency: this file lives next to the references it audits.

## Entry format

```
### YYYY-MM-DD — <screen-id> (<viewport>) — <story id> (<author>)

**Trigger:** <what failed / what we noticed>

**Resolution:** <option chosen — re-baseline / accept-with-rationale / recipe drop / etc.>

**Source of new PNG (if any):** <path | "n/a">

**Recipe change (if any):** <removed | edited | added — file path>

**Verification:** <visual gate result, e.g. "PASS — mobile, desktop after re-baseline">

**Reason / spec link:** <why this divergence is correct, with citations>

**Re-evaluation trigger:** <when this re-baseline should be revisited — e.g. "if the Claude Design desktop onboarding flow is reworked to match the spec">
```

---

## Entries

### 2026-07-19 — Story 12.6 public two-state pin semantics (10 map-visible references, mobile + desktop) — human-approved rebaseline

**Trigger:** Story 12.6 replaced the prior public map-pin presentation with a shared two-state public predicate. The pre-12.6 references were stale for the new contract because grey/not-sunny or cloud-obscured pins could still show seating-sun percentages, which now misrepresents the user-facing sunny/not-sunny model.

**Resolution:** Rasmus explicitly approved the Story 12.6 rebaseline on 2026-07-19 after human visual review. The ten reviewed candidate screenshots were promoted to the authoritative reference PNGs. The intended public semantics are: amber sun pin plus seating-share percentage only when the shared predicate is sunny; grey cloud pin with no number when not sunny or weather-gated; selected pin emphasis must not change that sunny/not-sunny meaning. The promoted references also preserve selected-pin/detail consistency for `map-with-selected-venue`, `map-with-obscured-venue`, `venue-detail`, and `venue-detail-obscured`.

**Changed PNGs (10):**
- **mobile:** `map-primary`, `map-panel-venues`, `map-with-selected-venue`, `map-with-obscured-venue`, `favourites-tab` at 390×844 viewport / 780×1688 PNG dimensions.
- **desktop:** `map-primary`, `map-with-obscured-venue`, `favourites-tab`, `venue-detail`, `venue-detail-obscured` at 1440×900 viewport / 2880×1800 PNG dimensions.

**Source of new PNG:** Human-reviewed implementation candidates from `_bmad-output/implementation-artifacts/validation/story-12-6-candidates/20260719-012718/`. Candidate SHA-256 values were verified before promotion and the promoted authoritative PNGs now match those hashes:
`mobile/map-primary` `74b6685f267b9d4e578b99be7dfded6d3973d9bbf071fc7beeb54c2fdaca6c97`; `mobile/map-panel-venues` `5b168fac021deb8e0b3e9567fa9fa8d4adf4837fee772cceb1f26ade3e98d3c6`; `mobile/map-with-selected-venue` `d3f65d7ed9fa76267d481799bce725f5d8f0ab8fc0ef8e77066a8115c92144ba`; `mobile/map-with-obscured-venue` `b5ed4b6061fbfef167c29ea76db70d85ff640169f1e892cf1503aad1929f219a`; `mobile/favourites-tab` `1d12b31c8fcb4a2f116f2341c008d66896ff48760bb5f5597e5c1d8019b74c92`; `desktop/map-primary` `073294af904d6f65163eceeefd6be492b5308333bf874f86f0cef7d0a1b36ec4`; `desktop/map-with-obscured-venue` `6b1e14731a7729472f89752b011cf52c4fc3aab9b6401759b7523df64d293049`; `desktop/favourites-tab` `4f98f31c4ef9e178b0364dbbaeae8fa0c4443680f204d81698b5cbbc3554aac2`; `desktop/venue-detail` `05f3321ce879b0b52710dc2b6b973a21f3270bea16b3640653e96fde830f723e`; `desktop/venue-detail-obscured` `7c510fb51fa542c4e57ad12630ac739e60f5408680503b5c0d5ed1ca6b18f802`.

**Recipe change:** None to `nextjs-app/scripts/capture-claude-design-refs.mjs`, `project-context.md`, or visual-validation route mappings. This was an implementation-state rebaseline from reviewed Story 12.6 candidates.

**Verification:** Manual visual review accepted by Rasmus because the legacy automated Claude/Anthropic visual provider could not run without `ANTHROPIC_API_KEY`. Candidate capture evidence asserted Swedish locale, forced screen states, visible map/pins/panels, and Story 12.6 pin semantics before screenshot write. The promoted files were post-copy SHA-verified against the approved candidates.

**Reason / spec link:** Story 12.6 acceptance criteria require the public UI to use one grey not-sunny/cloud-obscured pin without a percentage and one amber sunny pin with percentage, backed by the shared public predicate. Story 12.13 will remove remaining user-facing confidence displays outside this pin contract.

**Re-evaluation trigger:** Re-capture these references if the shared public sunny predicate, venue pin chrome, selected-pin treatment, QuickInfo/detail sunny/not-sunny copy, mobile bottom-sheet map layout, desktop side-panel layout, or Story 12.13 confidence-removal UI changes these surfaces.

### 2026-07-06 — basemap colour re-tune (10 map-visible references, mobile + desktop) — maintainer design review (Amelia / dev-story, STAGED — awaiting maintainer blessing)

> **Blessing status: STAGED — awaiting maintainer blessing.** Dev agents are structurally forbidden from self-blessing reference PNGs (`AGENTS.md:177-179`). This run captured + staged + documented the recolour baseline; the maintainer blesses (or rejects) each pair at PR review. This is NOT a blocker — staging + documenting is the deliverable.

**Trigger:** A maintainer design review of the staged Epic-11 references found the map "too grey/depressing — water should be bluer, green areas greener; it should feel nice to look at, while keeping the warm brand tint." Story 11.5 had already de-dulled the app's OWN warm tint (`--gradient-map-overlay` alpha + the `bg-surface-sand/20` wash), but the remaining greyness comes from the OpenFreeMap "positron" **basemap's** own muted palette (water `rgb(194,200,202)`, parks `rgb(230,233,229)`, woods `rgb(220,224,220)`), which no CSS token can reach — MapLibre paints the canvas from the style JSON, not the DOM.

**Resolution (implementation, then rebaseline):** `MapContainer.tsx` now recolours the water/green style layers on style load via `map.setPaintProperty` (layer ids discovered from the actual loaded positron style at runtime — `water`, `waterway`, `park`, `landcover_wood`; the applier lists every plausible water/green variant and skips absent layers silently). The new colours are a single named constants block, `lib/constants/map-basemap-colors.ts` (water `#7cc0e8`, waterway `#5fb0df`, park `#b6e0a6`, wood `#a6d691`), applied by `lib/utils/apply-basemap-colors.ts`; `DESIGN.md` §"Map Background" documents them alongside the CSS map tokens. Roads/buildings/boundaries/labels stay at the positron defaults (neutral), and the warm overlay/tint is UNCHANGED (no further reduction was needed — the water reads clearly blue through it). Every reference that shows the basemap was re-captured in its DOM-asserted Epic-11 state.

**Changed PNGs (10):**
- **mobile:** `map-primary` (sheet forced to `peek` — resting map, no filter chrome, byte-distinct from `map-panel-venues`), `map-panel-venues` (sheet at `mid` — segmented control + tag chips + cards), `map-with-selected-venue` (quick-info), `map-with-obscured-venue` (muted-slate obscured chrome intact), `favourites-tab` (seeded saved-favourites, map visible above the sheet).
- **desktop:** `map-primary`, `map-with-obscured-venue`, `favourites-tab`, `venue-detail` (390 px right panel — the large central map is visible), `venue-detail-obscured` (same, obscured chrome intact).
- **NOT re-captured:** mobile `venue-detail` / `venue-detail-obscured` — on mobile the detail sheet covers the map entirely (cream sheet, no basemap visible), so the recolour does not reach them; verified against the committed references before skipping.

**md5 (byte-distinctness proof):** all 10 are byte-distinct, and critically the mobile `map-primary` / `map-panel-venues` pair stays distinct (the 11.7 correction requirement):
`mobile/map-primary` `4598871387c94b601b7e849664f2e4d8` ≠ `mobile/map-panel-venues` `7bc57cdd1cdbf4840fd628f304d7ef97`; `mobile/map-with-selected-venue` `860ae884d7c30b7e8045e749a16d320f`; `mobile/map-with-obscured-venue` `55480972b4117d4b25b162db8a36918d`; `mobile/favourites-tab` `712f8936d9998ef6c89aa16d57ab5d83`; `desktop/map-primary` `df4ad859e606b0be825ac02d12f7bf08`; `desktop/map-with-obscured-venue` `b19879070deb4adb17d2d5336f7f36c1`; `desktop/favourites-tab` `21768ac6f749a966a20238d399086819`; `desktop/venue-detail` `a13d42ae3d4254929bb3dbb603f83f21`; `desktop/venue-detail-obscured` `d9c8039009f058050e352dbd9b32c7b9`.

**Source of new PNG:** One-off Playwright capture `nextjs-app/scripts/capture-basemap-recolour-rebaseline.mjs` (TEMPORARY — not committed, same pattern as the 11.7 / 10.2 precedents). `deviceScaleFactor: 2`, `locale: 'sv-SE'` + `Accept-Language: sv-SE,sv;q=0.9`, `sunnyseat_onboarded` seeded (`sunnyseat_favourite_ids=["1","2"]` for `favourites-tab`), `_time=14:00` mobile / `16:30` desktop per the Screen ID → Route Map, the Next dev-tools portal (`nextjs-portal`) hidden at capture time, `networkidle` + settle, captured against a fresh `.next` (Turbopack stale-CSS trap). Each capture ABORTS on any wait-selector timeout and asserts the forced DOM state before writing (`map-primary` asserts `data-state="peek"` + zero tag-chip groups; `map-panel-venues` asserts `mid` + a visible card; obscured screens assert the `quick-info-obscured`/`venue-detail-obscured` variant is visible; `venue-detail` asserts "Soltider idag" is absent per the 11.6 removal).

**Recipe change:** None to `capture-claude-design-refs.mjs`. These surfaces are implementation-driven (no Claude Design prototype recipe), same as the Epic-10/11 map surfaces. The one-off helper is NOT committed.

**Verification:** All 10 eyeballed directly — the Göta älv river + harbour + inner-city canals read as a clear, friendly, distinctly-blue blue; parks/woods (Skatås/Örgryte, inner-city park patches) read fresh green; roads/buildings/labels stay neutral; amber venue pins + slate obscured pins remain fully legible over the new colours. Gates re-run green after the change: `npx tsc --noEmit`; eslint (0 errors); full vitest (146 files / 1393 tests — +1 MapContainer recolour test, +7 `apply-basemap-colors` unit tests); axe desktop `a11y` project (12 pass, R-006 pin/label contrast over the new colours holds); axe `a11y-mobile` (offline shell pass, the pre-existing venue-card fixmes unchanged); map-primary e2e (mobile + desktop, 21 pass). PREPARED, not dev-blessed — the maintainer blesses at PR.

**Reason / spec link:** Maintainer design review (2026-07-06); `AGENTS.md:177-179` requires every reference PNG change to be logged in the same operation. The basemap recolour is documented in `DESIGN.md` §"Map Background" (basemap-token table) and `lib/constants/map-basemap-colors.ts`.

**Re-evaluation trigger:** Re-capture these map-visible references if the basemap colour constants, the warm overlay/tint (Story 11.5 tokens), the venue/obscured pin styling, or the shared map chrome (slider/nav/list panel) change again. Re-capture the mobile `venue-detail` / `venue-detail-obscured` too IF a future change makes the basemap visible behind the mobile detail sheet.

### 2026-07-05 — `map-primary` + `map-panel-venues` (mobile) byte-identical-pair correction — Story 11.7 code-review [Decision][High] (Amelia / dev-story)

**Trigger:** The 2026-07-05 code review found that the consolidated-rebaseline entry below had staged `mobile/map-primary.png` and `mobile/map-panel-venues.png` **byte-identical** (both shared git-index blob `991df28f…`, md5 `05fcc63b…`, 528936 bytes). Both were captured with the mobile bottom sheet at `data-state="mid"` (the app's default `mobileSheetState`), so `map-primary` was in the WRONG state — its reference must show the resting map with the sheet COLLAPSED (no filter chrome), not the expanded 11-3 sheet. The prior committed pair was ALSO identical (blob `8d80617…` on both, carried forward from the 2026-05-21 MVP refresh), so the duplication was a long-standing pre-existing defect that the consolidated rebaseline propagated rather than corrected. A maintainer would otherwise bless a mislabeled reference at PR.

**Resolution:** Re-captured BOTH mobile references in DISTINCT, DOM-asserted states (one-off `nextjs-app/scripts/capture-1107-mapprimary-panel.mjs`, TEMPORARY — not committed):
- **`map-primary`** — sheet forced to `peek` (resting map, NO segmented control, NO tag chips). In-DOM assertion before writing: `data-state="peek"`, `mobile-tag-chips` count = 0, no "Mest sol" segmented button. New md5 `eaadf980c78048788a3daf60cf3cf812` (744904 bytes).
- **`map-panel-venues`** — sheet at `mid` (the 11-3 overhaul: "Mest sol"/"Nära mig" segmented control + active tag chips + venue cards). In-DOM assertion: `data-state="mid"`, `mobile-tag-chips` ≥ 1, "Mest sol" segmented button present, ≥ 1 `venue-card` visible. New md5 `5b2457240dc689adefa740112a2d5f31` (528935 bytes).

**Source of new PNG:** One-off Playwright capture `nextjs-app/scripts/capture-1107-mapprimary-panel.mjs` (TEMPORARY — not committed, same pattern as the consolidated entry / the 10.2 precedent). `deviceScaleFactor: 2`, `locale: 'sv-SE'` + `Accept-Language: sv-SE,sv;q=0.9`, `sunnyseat_onboarded` seeded, `_time=14:00`, `networkidle` + settle, against a fresh `.next`.

**Recipe change:** None to `capture-claude-design-refs.mjs`. One-off helper not committed.

**Verification:** The two staged PNGs are now byte-DISTINCT (md5 `eaadf980…` ≠ `5b245724…`; neither matches the old shared `05fcc63b…`), and each was eyeballed to match its description above (map-primary = resting de-dulled map with a collapsed peek sheet + today-clamped 14:00 slider + pins, no filter chrome; map-panel-venues = expanded sheet with segmented control + "Innergård/Hund ok/Wifi/Bakverk" chips + Skuggans Hus / Kafé Magasinet cards). Capture ABORTS on any wait-selector timeout + asserts the forced DOM state before writing (deferred-work 7.1). Still PREPARED, not dev-blessed — the maintainer blesses at PR.

**Reason / spec link:** Story 11.7 AC3 (the rebaseline pair must each show its distinct Epic-11 state — `map-primary` resting per project-context Screen ID → Route Map, `map-panel-venues` the 11-3 bottom sheet); code-review 2026-07-05 [Decision][High]. `AGENTS.md:177-179` requires the reference change to be logged in the same operation.

**Re-evaluation trigger:** Re-capture `map-primary` when the resting-map chrome / slider / pins change; re-capture `map-panel-venues` when the 11-3 sheet segmented control / tag chips / card layout change.

### 2026-07-05 — Epic 11 consolidated rebaseline (12 pairs) — Story 11.7 (Amelia / dev-story, epic-mode UNATTENDED)

> **Blessing status: PREPARED — awaiting maintainer blessing at PR review.** Dev agents are structurally forbidden from self-blessing reference PNGs (`AGENTS.md:177-179`). This run is unattended (auto-bmad epic mode), so Story 11.7 CAPTURED + STAGED + DOCUMENTED the consolidated baseline set; the **blessing is deferred to the maintainer at PR review** (the same delegated-blessing authority that approved the 2026-07-03 Story-10.2 obscured rebaseline below). This is NOT a blocker — staging + documenting is the deliverable Story 11.7 owns (per its AC3 and the run instruction). The maintainer blesses (or rejects) each pair at PR.
>
> **CORRECTION (2026-07-05, code-review [Decision][High]):** the `mobile/map-primary` + `mobile/map-panel-venues` pair in this entry was staged byte-identical (both at sheet `mid`) — `map-primary` was in the wrong state. Both were re-captured in distinct DOM-asserted states; see the separate correction entry immediately ABOVE. The two mobile PNGs are now byte-distinct.

**Trigger:** Epic 11 ("Feels Instant, Reads Clear") reworked six visual surfaces across Stories 11.1–11.6. Each earlier story was forbidden from blessing its own new visual state, so all the new baselines accumulated and defer to this consolidated rebaseline (Story 11.7 AC3; epics.md:285/288 "11.7 rebaseline AFTER visual changes land"). The prior committed references predate these Epic-11 changes and no longer match the running app.

**Resolution:** Implementation-driven baseline prepared for maintainer blessing (dev structurally forbidden from self-blessing references; blessing deferred to PR review — epic-mode unattended run). Every captured surface was verified to actually be in its expected Epic-11 state (in-DOM assertion + direct eyeball) BEFORE staging — see Verification. The 12 (screen-id, viewport) pairs and their owning Epic-11 story:

- **`map-primary` (mobile + desktop)** — Story 11.1 (client-side day-series instant scrubbing → today-clamped time slider), 11.2 (slider drag-fix / inert-elapsed styling), 11.5 (de-dulled warm-tint map + legible pins). Resting state captured; the transient date-change dim/spinner overlay and pulsing location dot are captured at their steady frame.
- **`map-panel-venues` (mobile)** — Story 11.3 (mobile tag-filtering bottom-sheet overhaul: "Mest sol"/"Nära mig" segmented control + active tag chips + venue cards in the sheet).
- **`map-with-selected-venue` (mobile)** — Story 11.4 (reworked quick-info card: opening-hours "Öppet till 22:00" replacing the sun-window line; clean single-line "VISA RUTT"). Also the prior committed reference was DPR-1 (390×844); this rebaseline standardises it to the DPR-2 (780×1688) convention every other reference already uses.
- **`venue-detail` (mobile + desktop)** — Story 11.6 (clean first paint; "Soltider idag" timeline section removed on both breakpoints; darkened amber "ÖPPET · {time}" badge token; centered "Omdömen" reviews section incl. the empty-reviews state). The AC3 "centered-vs-left-aligned-reference" reconciliation from the 11.6 Review Findings Defer is resolved HERE in favour of **centered** (the running implementation) — the left-aligned `VenueDetail.jsx` reviews preview is the stale side.
- **`favourites-tab` (mobile + desktop)** — Story 11.4 (reworked venue cards ripple into the saved-favourites list surface). Mobile prior reference was DPR-1 (390×844); standardised to DPR-2 here.
- **`map-with-obscured-venue` + `venue-detail-obscured` (mobile + desktop)** — Epic-10 obscured surfaces, already rebaselined 2026-07-03 (below). **Re-verified and RE-CAPTURED:** the obscured-specific chrome (muted slate "95%" cloud pill/pins, "SOL BAKOM MOLN · MULET" sky line) is UNCHANGED, but the shared surfaces around it drifted — the obscured quick-info inherited the 11.4 rework (opening-hours line, single-line VISA RUTT) and the obscured venue-detail inherited the 11.6 rework (the "Solprognos idag" bars visible in the 2026-07-03 reference are gone). So all four obscured pairs were re-captured with the obscured treatment confirmed intact.

**Source of new PNG:** One-off Playwright capture (`nextjs-app/scripts/capture-1107-rebaseline.mjs`, TEMPORARY — not committed, mirrors the 2026-07-03 Story-10.2 `capture-offline-rebaseline.mjs` precedent). `deviceScaleFactor: 2`, `locale: 'sv-SE'` + `Accept-Language: sv-SE,sv;q=0.9`, `sunnyseat_onboarded` seeded (`sunnyseat_favourite_ids=["1","2"]` for `favourites-tab`), `networkidle` + 1.5 s settle. Captured against a fresh `.next` so the surfaces reflect the landed 11.1–11.6 CSS. Routes + viewports from the `project-context.md` Screen ID → Route Map (mobile 390×844 → 780×1688 @ DPR 2; desktop 1440×900 → 2880×1800 @ DPR 2), forcing the canonical `_state`/`_time` per row (`_time=14:00` mobile, `_time=16:30` desktop). The Next.js dev-tools overlay ("N Issue" toast/portal) was suppressed at capture time so it never bleeds into a reference (dev-only chrome, not app UI).

**Recipe change:** None to `capture-claude-design-refs.mjs`. The Epic-11 surfaces are implementation-driven (no Claude Design prototype recipe), same pattern as `map-primary-offline`/`not-found`/the obscured surfaces. The one-off `capture-1107-rebaseline.mjs` helper was NOT committed (matches the 10.2 precedent).

**Verification:** Each capture ABORTED on any wait-selector timeout (never screenshot a half-loaded page — deferred-work 7.1) and ran an in-DOM state assertion before writing: `venue-pin`/`venue-card`/`venue-quick-info` present; `venue-detail` asserts "Soltider idag" is ABSENT (11.6 removal); obscured pairs assert the `quick-info-obscured`/`venue-detail-obscured` testid is the visible variant. All 12 pairs then eyeballed directly (venue-detail shows opening-hours + no timeline + darkened badge + centered Omdömen; quick-info shows opening-hours not the sun-window; the de-dulled map reads legibly; obscured screens show muted slate + "Sol bakom moln", NOT amber sunny). NOTE: this is a dev-authored PREPARED baseline — NOT a dev-blessed visual-gate PASS. The maintainer's PR review is the gate.

**Reason / spec link:** Story 11.7 AC3 (consolidated reference-PNG rebaseline as a maintainer-blessed checkpoint); epics.md:2985-2999; retro-notes epic-11 (11-1/11-4/11-5/11-6 "11.7 owns the consolidated maintainer rebaseline; dev forbidden to self-bless"; 11-6 "empty-reviews screenshot captured during the 11-7 rebaseline"). `AGENTS.md:177-179` requires every reference PNG addition/change to be logged in the same operation.

**Re-evaluation trigger:** Maintainer rejects/adjusts any pair at PR (re-capture per feedback). Otherwise re-capture a given pair when its owning surface changes again: the time slider / map tint / location dot (11.1/11.2/11.5), the mobile sheet chips (11.3), the quick-info card (11.4), the venue-detail layout / badge token / reviews centering (11.6), or the shared obscured treatment (Story 10.2). Story 11.8 owns the real-device verification pass.

### 2026-07-03 — `map-with-obscured-venue` + `venue-detail-obscured` (mobile + desktop) — Story 10.2 (maintainer-authorized rebaseline)

**Trigger:** Story 10.2 ("Sun Behind Clouds") added two dev-only force-states — `map-with-obscured-venue` and `venue-detail-obscured` — and rows for both (mobile + desktop) in `project-context.md`'s Screen ID → Route Map. No reference PNGs existed for these new `(screen-id, viewport)` pairs, so the visual gate had nothing to compare against. These are new obscured-surface states with no Claude Design prototype recipe (the muted "Sol bakom moln" weather-gated treatment is implementation-only), so `capture-claude-design-refs.mjs` cannot generate them.

**Resolution:** First implementation-driven baseline for all four pairs, captured against the running dev app at the canonical routes and each captured surface verified to actually be in the obscured state before blessing (muted slate chrome + "Sol bakom moln"/"SOL BAKOM MOLN · MULET", NOT amber sunny chrome). The dev agent is normally forbidden from self-blessing refs; the maintainer explicitly authorized this rebaseline (delegated blessing).

**Source of new PNG:** One-off Playwright capture (mirrors the `capture-offline-rebaseline.mjs` pattern: `deviceScaleFactor: 2`, `locale: sv-SE`, `sunnyseat_onboarded` seeded, `networkidle` + settle). Routes (from the Screen ID → Route Map):
- `/?_state=map-with-obscured-venue&_time=14:00` → `{mobile,desktop}/map-with-obscured-venue.png` (390×844 / 1440×900)
- `/?venue=test-venue-sunny&_state=venue-detail-obscured&_time=14:00` → `mobile/venue-detail-obscured.png` (390×844)
- `/?venue=test-venue-sunny&_state=venue-detail-obscured&_time=16:30` → `desktop/venue-detail-obscured.png` (1440×900)

**Recipe change:** None. `capture-claude-design-refs.mjs` is unchanged (no prototype recipe exists for these obscured surfaces — they are implementation-driven, like `map-primary-offline`/`not-found`). The one-off capture script was a temporary helper and was not committed.

**Verification:** Obscured state confirmed both visually (all four screenshots eyeballed: muted slate `95%` cloud badge + "SOL BAKOM MOLN · MULET", muted slate pins, amber suppressed) and programmatically (`quick-info-obscured` / `venue-detail-obscured` testids present in the DOM at both viewports; desktop `venue-detail-obscured` carries zero amber `% SOL` badges). Implementation-derived baseline (the reference IS the verified obscured implementation).

**Reason / spec link:** Story 10.2 introduced the `CloudObscured` + `overcast` weather-gated obscured surface; `project-context.md` Screen ID → Route Map rows for `map-with-obscured-venue` and `venue-detail-obscured` (added by 10.2) require reference PNGs for the gate to run. Maintainer explicitly delegated the blessing authority for this rebaseline.

**Re-evaluation trigger:** Re-capture if the obscured chrome (muted slate pill/badge, "Sol bakom moln" copy, sky line), the obscured pin styling, the auto-selection behavior of `map-with-obscured-venue`, or the seeded `test-venue-sunny` fixture geometry changes materially.

### 2026-06-29 — `onboarding` (desktop only) — post-launch design fix (onboarding desktop layout)

**Trigger:** A post-launch design/UX review of the live site found the onboarding screen had **no desktop layout** — the mobile full-bleed design was scaled to 1440px+, so the primary CTA spanned ~1376px (full width) and the centred copy floated in a large empty band above a bottom-anchored button. The prior `onboarding` desktop reference was a **self-fulfilling baseline** (captured 2026-05-04/05 from the implementation), so it memorialised the mobile-scaled layout and the LLM-eyeball visual gate (which ignores sizing/spacing) never flagged it.

**Resolution:** `OnboardingScreen.tsx` now applies a desktop-only treatment (`lg:` utilities only — mobile markup unchanged): the outer overlay centres its content (`lg:items-center lg:justify-center lg:gap-7`), the hero stops growing (`lg:flex-none`), and the CTA stack is constrained (`lg:w-full lg:max-w-md`) so the buttons sit at a sensible ~448 px width in a cohesive, vertically-centred group instead of full-bleed. Only the **desktop** `onboarding` reference is re-captured; the **mobile** reference is byte-identical (no mobile code path changed) and was left untouched.

**Source of new PNG:** `node nextjs-app/scripts/capture-onboarding-rebaseline.mjs` (existing helper) — Playwright capture of `http://localhost:3000/?_state=onboarding` at `1440×900`, `deviceScaleFactor: 1`, `Accept-Language: sv-SE`. Saved to `docs/design/references/screens/desktop/onboarding.png` (1440×900). Mobile capture from the same run was discarded (identical to the committed reference).

**Verification:** Implementation-derived baseline (the reference IS the implementation). The new desktop render was eyeballed directly (the visual gate ignores sizing, so it cannot be relied on for a layout change); mobile was confirmed unchanged by direct capture comparison.

**Reason / spec link:** Post-launch polish requested by the maintainer; no story. The prototype bundle has no desktop onboarding design (onboarding is a mobile-first overlay), so engineering judgment defined the centred-card desktop layout per the `frontend-component` skill's "match visual intent, not prototype structure" rule. Same self-fulfilling-baseline justification as the 2026-05-04/05 `onboarding` desktop entry it supersedes.

**Re-evaluation trigger:** Re-capture when the onboarding copy, CTA treatment, or the gradient/brand chrome changes materially.

### 2026-06-26 — `map-primary-offline` (mobile + desktop) — Story 7.3 PWA Installation & Offline Shell (Amelia / dev-story)

**Trigger:** Story 7.3 implements the offline shell — `map-primary-offline` was a declared-but-unimplemented `_state` literal (project-context.md Screen ID → Route Map) with **no reference PNG in the MVP bundle**. `capture-claude-design-refs.mjs` flagged it as "needs its first implementation-driven baseline when the offline shell story lands". This is a **first-baseline capture**, not a re-baseline of an existing reference.

**Resolution:** Capture the first implementation-driven `map-primary-offline` reference at both viewports from the running offline shell (AC3: cached map background + "Ingen anslutning" banner, no venue data/pins/predictions). There is no prototype recipe for the offline shell (the prototype "Tomt" modal is an empty venue/search state, not the routed offline shell), so the capture-recipe comment in `capture-claude-design-refs.mjs` points at the implementation rebaseline helper — same pattern as `not-found` / `about`. Self-consistent baseline (the reference IS the implementation).

**Source of new PNG:** Playwright capture of `http://localhost:3000/?_state=map-primary-offline` at `390×844` and `1440×900`, `deviceScaleFactor: 2`, `Accept-Language: sv-SE`, onboarded (waits for `[data-testid="offline-banner"]`, +1.5 s settle for the banner slide-in + cached-map paint), via `nextjs-app/scripts/capture-offline-rebaseline.mjs`. Saved to `docs/design/references/screens/{mobile,desktop}/map-primary-offline.png` (780×1688 / 2880×1800). Mobile = top "Ingen anslutning" banner + cached map + bottom `MobileNavBar`; desktop = real `DesktopNavBar` above the centred banner + cached map.

**Recipe change:** `nextjs-app/scripts/capture-claude-design-refs.mjs` — the `map-primary-offline` comment block updated from "needs its first implementation-driven baseline" to record the Story 7.3 capture. New helper `nextjs-app/scripts/capture-offline-rebaseline.mjs` added (documented in its header). `.claude/scripts/visual-validate.sh` — added a `map-primary-offline)` wait-selector case (waits for `[data-testid="offline-banner"]` instead of the generic `map-*` `venue-pin`, which never appears offline); it must precede the `map-*` case.

**Verification:** Implementation-derived baseline; the gate compares the running offline shell against itself. Per the visual-gate prompt, map tile/content differences are ignored, so the non-deterministic cached-map background does not affect the comparison.

**Reason / spec link:** Story 7.3 AC3 (offline shell) + AC7 (dev forced-state reachability) + Design Gate (Visual + Visual validation). `AGENTS.md` requires every reference PNG addition and capture-recipe change to be logged in the same operation. Same self-fulfilling-baseline justification as the 2026-05-04/05 `onboarding` desktop and the 2026-06-26 `not-found`/`about` entries.

**Re-evaluation trigger:** Re-capture (via `capture-offline-rebaseline.mjs`) when the offline shell layout/copy changes materially, when the offline-banner styling/animation changes, or when the shared map/nav chrome changes.

### 2026-06-26 — `not-found` (mobile + desktop) — Story 7.2 404 Page (Amelia / dev-story)

**Trigger:** Story 7.2 replaces the hardcoded-Swedish `app/not-found.tsx` stub with the designed, internationalized 404 (AC1/AC2: wordmark; centred amber-gold rounded-square pin tile with a "?"; `Den här platsen hittades inte` heading; in-app map CTA). The active `not-found` references were UNLOGGED legacy carryover — NOT part of the 2026-05-21 MVP refresh and with no prior REBASELINE-LOG entry — and they diverge from the AC implementation: the legacy mobile reference shows a bare pin outline with **no amber-gold rounded square** (which AC1 explicitly mandates), and the legacy desktop reference shows a stale **full venue-search navbar** that predates the current chrome.

**Resolution:** Re-baseline both `not-found` references from the running implementation. Per a maintainer decision (Rasmus, 2026-06-26), the desktop 404 uses a **bespoke minimal navbar** (wordmark + inert location/settings icons, no search box) rather than the live `<DesktopNavBar/>`: the root 404 renders OUTSIDE the `[locale]` tree, so the real navbar's venue-search combobox (which depends on the map/search/time/geolocation contexts in `AppContextProviders`) cannot mount there, and a static dead-end page should not pull in the map/search subsystem. There is no prototype recipe for `not-found` (the prototype "Tomt" modal is an empty venue/search state, not the routed 404), so the capture-recipe comment in `capture-claude-design-refs.mjs` now points at the implementation rebaseline helper.

**Source of new PNG:** Playwright capture of `http://localhost:3000/__sunnyseat-invalid` (deliberately-invalid path → global `app/not-found.tsx`) at `390×844` and `1440×900`, `deviceScaleFactor: 2`, `Accept-Language: sv-SE` (waits for `[data-testid="not-found-page"]`), via `nextjs-app/scripts/capture-not-found-rebaseline.mjs`. Saved to `docs/design/references/screens/{mobile,desktop}/not-found.png` (780×1688 / 2880×1800).

**Recipe change:** `nextjs-app/scripts/capture-claude-design-refs.mjs` — the `not-found` comment block updated from "keep the legacy 404 references" to record the Story 7.2 implementation rebaseline. New helper `nextjs-app/scripts/capture-not-found-rebaseline.mjs` added (documented in its header).

**Verification:** PASS — `not-found` mobile and desktop via `scripts/visual-validate.sh not-found /__sunnyseat-invalid {mobile,desktop}` (`VISUAL_VALIDATE_PROVIDER=claude`). Self-consistent baseline (the reference is the implementation), same pattern as the 2026-05-04/05 `onboarding` desktop baselines.

**Reason / spec link:** Story 7.2 AC1 (amber-gold rounded-square pin tile) + AC2 (desktop navbar visible, auto-width CTA) + Design Gate; the legacy references were unlogged and obsolete. The desktop bespoke-navbar choice is the maintainer decision recorded above; `AGENTS.md` requires reference re-baselines and capture-recipe changes to be logged in the same operation.

**Re-evaluation trigger:** Re-capture (via `capture-not-found-rebaseline.mjs`) when the 404 layout/copy changes materially, when the desktop chrome decision is revisited (e.g. switching to the live `DesktopNavBar`), or when the shared wordmark chrome changes.

### 2026-06-26 — `about` (mobile + desktop) — Story 7.1 About Page (Amelia / dev-story)

**Trigger:** Story 7.1 implements the standalone `/about` route per AC1/AC2 (mobile top bar + heading + hero photo + ALGORITMEN/DATAKÄLLOR/TRÄFFSÄKERHET count-up + contact + privacy link + CTA; desktop = real `DesktopNavBar` + centred 720 px content + two-column sources + footer). The active MVP `about` references were captured from the simplified Claude Design prototype (Settings → "Om SunnySeat"), which renders an obsolete screen: the mobile reference had no hero and no accuracy stat (only one data source), and the desktop reference showed a simplified header instead of the real navbar. The implementation legitimately diverges.

**Resolution:** Re-baseline both `about` references from the running implementation and skip the obsolete prototype recipe so future default captures do not overwrite them (same pattern as `feedback`/`review`).

**Source of new PNG:** Playwright capture of `http://localhost:3000/about` at `390×844` and `1440×900`, `deviceScaleFactor: 2`, `Accept-Language: sv-SE` (waits for `[data-testid="about-page"]` + hero `<img>.decode()`), via `nextjs-app/scripts/capture-about-rebaseline.mjs`. Saved to `docs/design/references/screens/{mobile,desktop}/about.png` (780×1688 / 2880×1800).

**Recipe change:** `nextjs-app/scripts/capture-claude-design-refs.mjs` — both `about` recipes (mobile + desktop) marked `skip` with a Story 7.1 reason. New helper `nextjs-app/scripts/capture-about-rebaseline.mjs` added (documented in its header).

**Verification:** PASS — `about` mobile and desktop via `scripts/visual-validate.sh about /about {mobile,desktop}` (`VISUAL_VALIDATE_PROVIDER=claude`).

**Reason / spec link:** Story 7.1 AC1–AC2 + Design Gate; the prototype "Om SunnySeat" state predates the real `/about` route. Hero is a maintainer-provided photo (`public/about/hero_sunset_{mobile,desktop}.jpeg`, art-directed via `<picture>`). The accuracy stat is the placeholder constant `ABOUT_ACCURACY_PLACEHOLDER` rendered by the Motion count-up.

**Re-evaluation trigger:** Re-capture (via `capture-about-rebaseline.mjs`) when the `/about` layout/copy changes materially, the hero asset is replaced, or the accuracy placeholder is swapped for the validated Epic 8 figure.

### 2026-06-26 — `map-primary` / `venue-detail` / `favourites-tab` (desktop) — Story 7.1 DesktopNavBar "Om" link ripple (Amelia / dev-story)

**Trigger:** Story 7.1 adds an "Om" → `/about` link to the shared `DesktopNavBar` (the desktop entry point to the new route, per AC2 "navigation via navbar"). The navbar is shared chrome, so every desktop reference that includes it drifted by the added link.

**Resolution:** Re-baseline the three implementation-derived desktop references that show the navbar, from the running implementation. Mobile references are unaffected (the bottom `MobileNavBar` did not change — no "Om" tab was added, per Task 2.4).

**Source of new PNG:** Playwright captures at `1440×900`, `deviceScaleFactor: 2`, `Accept-Language: sv-SE`, onboarded (+ seeded favourites for `favourites-tab`), via `nextjs-app/scripts/capture-navbar-ripple-rebaseline.mjs`, using the Screen ID → Route Map routes (`/?_time=16:30`; `/?venue=test-venue-sunny&_state=venue-detail&_time=16:30`; `/favoriter?_state=favourites-tab&_time=14:00`). Saved to `docs/design/references/screens/desktop/{map-primary,venue-detail,favourites-tab}.png`.

**Recipe change:** None to `capture-claude-design-refs.mjs` for these three (their recipes already pointed at the prototype while the references were implementation-derived — a pre-existing state). **Caveat:** because the prototype desktop HTML can never contain the app's "Om" link, re-running `capture-claude-design-refs.mjs` for these desktop screen IDs would regenerate a prototype capture WITHOUT the link and regress them — recapture from the implementation via `capture-navbar-ripple-rebaseline.mjs` instead. New helper `nextjs-app/scripts/capture-navbar-ripple-rebaseline.mjs` added (documented in its header).

**Verification:** PASS — all three desktop screens via `scripts/visual-validate.sh <id> <route> desktop`.

**Reason / spec link:** Story 7.1 desktop entry-point decision (maintainer-approved 2026-06-25); `AGENTS.md` requires shared-chrome reference drift to be re-baselined and logged in the same operation.

**Re-evaluation trigger:** Re-capture when `DesktopNavBar` changes again, or when any of these three screens gets its own implementation re-baseline.

### 2026-06-09 — `review` (mobile) — Story 3.3 Venue Reviews (Codex / dev-story)

**Trigger:** Story 3.3 visual validation exposed that the active `review` reference still came from the MVP Mobile Unlocked Tweaks -> `Recension` state, which renders an obsolete modal with required rating, tags, and `Publicera` copy. Story 3.3 and `project-context.md` require an inline venue-detail review form at `/?venue=test-venue-sunny&_state=review`.

**Resolution:** Re-baseline the mobile `review` PNG from the running Story 3.3 implementation and skip the stale Claude Design prototype recipe so future default prototype captures do not overwrite it. The visual provider now waits for `[data-testid="review-form"]` before comparing.

**Source of new PNG:** Playwright capture of `http://localhost:3000/?venue=test-venue-sunny&_state=review` at `390x844` with `sunnyseat_onboarded=1`, saved to `nextjs-app/docs/design/references/screens/mobile/review.png`.

**Recipe change:** `nextjs-app/scripts/capture-claude-design-refs.mjs` marks the `review` recipe as skipped because the active MVP prototype state is obsolete for Story 3.3. `nextjs-app/docs/design/references/claude-design/STATE-MAPPING.md` documents the implementation-derived active PNG. `.claude/scripts/visual-validate.sh` now waits for `[data-testid="review-form"]`.

**Verification:** PASS — `review` mobile after re-baseline via `scripts/visual-validate.sh`.

**Reason / spec link:** Story 3.3 Acceptance Criteria and UX spec `Screen: review` require an inline ReviewForm inside the venue detail scroll area where text enables `Skicka`, rating is optional, and opening is user-initiated via `Lämna ett omdöme`. The story source conflict note explicitly says not to copy the prototype modal or add the tag taxonomy. Rasmus approved removing old/legacy prototype references on 2026-06-09.

**Re-evaluation trigger:** Revisit when the Claude Design MVP bundle is refreshed with a real inline Story 3.3 review state, when `ReviewFlow` layout/copy changes materially, or when the review visual route changes.

### 2026-06-08 — `feedback` (mobile) — Story 3.2 Sun Accuracy Feedback (Amelia / dev-story)

**Trigger:** Story 3.2 visual validation exposed that the active `feedback` reference still came from the MVP Mobile Unlocked Tweaks -> `Feedback` state, which renders an obsolete general app-feedback modal with star rating. Story 3.2 and `project-context.md` require an inline venue-detail sun accuracy + outdoor seating prompt at `/?venue=test-venue-sunny&_state=feedback`.

**Resolution:** Re-baseline the mobile `feedback` PNG from the running Story 3.2 implementation and skip the stale Claude Design prototype recipe so future default prototype captures do not overwrite it. The visual provider now waits for `[data-testid="feedback-prompt"]` before comparing.

**Source of new PNG:** Playwright capture of `http://localhost:3000/?venue=test-venue-sunny&_state=feedback&_time=14:00` at `390x844` with `sunnyseat_onboarded=1`, saved to `nextjs-app/docs/design/references/screens/mobile/feedback.png`.

**Recipe change:** `nextjs-app/scripts/capture-claude-design-refs.mjs` marks the `feedback` recipe as skipped because the active MVP prototype state is obsolete for Story 3.2. `nextjs-app/docs/design/references/claude-design/STATE-MAPPING.md` documents the implementation-derived active PNG. `.claude/scripts/visual-validate.sh` now waits for `[data-testid="feedback-prompt"]`.

**Verification:** PASS — `feedback` mobile after re-baseline via `scripts/visual-validate.sh`. Parent `venue-detail` mobile and desktop visual gates also passed after integration.

**Reason / spec link:** Story 3.2 Acceptance Criteria require an inline FeedbackPrompt card inside the venue detail scroll area with outdoor seating and sun accuracy questions. The story source conflict note explicitly says to implement Story 3.2 AC and the active visual reference unless Rasmus changes the story; Rasmus approved rebaselining the stale `feedback` reference on 2026-06-08.

**Re-evaluation trigger:** Revisit when the Claude Design MVP bundle is refreshed with a real inline Story 3.2 feedback state, when Story 3.3 review UI changes the adjacent `review` state, or when `FeedbackPrompt` layout/copy changes materially.

### 2026-05-28 — `favourites-tab` time-pinned visual route — Story 2.7 Save & View Favourites Round 2 review (Amelia / code-review)

**Trigger:** Round 2 code review found the `favourites-tab` route map was storage-seeded but not time-pinned. The passing visual comparison accepted a dynamic time-slider difference, so later runs could drift with the live clock.

**Resolution:** No PNG changed. The `project-context.md` Screen ID -> Route Map now appends `_time=14:00` to both `favourites-tab` rows so the canonical story-review and visual-validation routes pin the same reference time as other mobile Epic 2 map/list screens.

**Source of new PNG:** None.

**Recipe change:** `project-context.md` route rows changed from `/favoriter?_state=favourites-tab` to `/favoriter?_state=favourites-tab&_time=14:00` for mobile and desktop. `.claude/scripts/visual-validate.sh`, `capture-claude-design-refs.mjs`, and the reference PNGs are unchanged.

**Verification:** PASS — Round 2 canonical story-review gate ran `favourites-tab` mobile and desktop with `/favoriter?_state=favourites-tab&_time=14:00`; both visual validations passed. Validation artifact: `_bmad-output/implementation-artifacts/validation/2-7-save-view-favourites-review-20260528-172041.log`.

**Reason / spec link:** Story 2.7 Task 6.2 requires deterministic `favourites-tab` visual state. `project-context.md` already pins `_time` for comparable map/list references; the seeded favourites route now follows the same convention.

**Re-evaluation trigger:** Revisit if `favourites-tab` receives a production state branch, a different reference time is approved, or the visual provider no longer relies on route-map URLs.

### 2026-05-28 — `favourites-tab` visual route state-forcing scope — Story 2.7 Save & View Favourites review fixes (Amelia / dev-story)

**Trigger:** Story 2.7 review found the canonical story-review gate could skip `favourites-tab` because the story text named the screen but did not include a discoverable `_state=` or `screen_id:` marker, and the route map used bare `/favoriter` even though the visual state depends on deterministic seeded favourites.

**Resolution:** No PNG changed. The `project-context.md` Screen ID -> Route Map now uses `/favoriter?_state=favourites-tab` for both mobile and desktop. The implementation does not branch on this state; the route marker exists so the gate can resolve a deterministic visual-validation URL while `.claude/scripts/visual-validate.sh` continues to seed `sunnyseat_favourite_ids=["1","2"]` for the `favourites-tab` screen ID.

**Source of new PNG:** None.

**Recipe change:** `project-context.md` route rows changed from `/favoriter` to `/favoriter?_state=favourites-tab` for `favourites-tab` mobile and desktop. `capture-claude-design-refs.mjs`, `.claude/scripts/visual-validate.sh`, and the reference PNGs are unchanged.

**Verification:** PASS — Story 2.7 review-fix gate ran `favourites-tab` mobile and desktop through `scripts/story-review.sh` using `/favoriter?_state=favourites-tab`; both visual validations passed.

**Reason / spec link:** `AGENTS.md` requires Screen ID routes and capture-recipe changes to be logged. Story 2.7 Task 6.2 requires deterministic `favourites-tab` visual state seeded with saved favourite IDs, and Task 8.12 requires the canonical story-review gate rather than direct sprint-status edits.

**Re-evaluation trigger:** Revisit if the visual gate starts detecting plain screen names in story files, if `favourites-tab` gets a production state branch, or if seeded favourites move away from URL-plus-storage determinism.

### 2026-05-28 — `map-with-selected-venue` QuickInfo favourite affordance — Story 2.7 Save & View Favourites (Amelia / dev-story)

**Trigger:** Story 2.7 activates the favourite heart in `VenueQuickInfo`. The parent visual sanity gate for `map-with-selected-venue` still compared against a pre-Story-2.7 selected-venue reference that did not include the QuickInfo favourite affordance and also reflected older selected-card details.

**Resolution:** Re-baseline the mobile `map-with-selected-venue` PNG from the running implementation, preserving the Story 2.7 QuickInfo favourite heart as canonical UI.

**Source of new PNG:** Playwright capture of `http://localhost:3000/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00` at `390x844` with `sunnyseat_onboarded=1`, saved to `nextjs-app/docs/design/references/screens/mobile/map-with-selected-venue.png`.

**Recipe change:** None. The route and gate wait selector are unchanged.

**Verification:** PASS — `map-with-selected-venue` mobile after re-baseline via `scripts/visual-validate.sh`.

**Reason / spec link:** Rasmus approved rebaselining this parent screen on 2026-05-28 so Story 2.7 keeps the QuickInfo favourite heart and still passes visual validation. Story 2.7 Task 4.1/4.2 requires the active favourite affordance in QuickInfo; Task 8.10 requires parent-screen visual sanity checks.

**Re-evaluation trigger:** Revisit if QuickInfo favourite placement, selected-venue card content, or `map-with-selected-venue` forced-state behavior changes in a later story.

### 2026-05-28 — `favourites-tab` seeded saved-favourites reference — Story 2.7 Save & View Favourites (Amelia / dev-story)

**Trigger:** Story 2.7 implements production favourites under the MVP key `sunnyseat_favourite_ids`, while the visual-validator storage state previously seeded only `sunnyseat_onboarded`. The active Claude Design capture recipe seeds prototype key `sunny_favs`, so the implementation gate needed an equivalent production storage seed to render the saved-favourites reference state deterministically.

**Resolution:** Re-baseline the mobile and desktop `favourites-tab` PNGs from the running implementation with `sunnyseat_favourite_ids=["1","2"]`. The legacy visual provider now seeds that storage key when `SCREEN_ID=favourites-tab` and waits for visible venue cards before capture.

**Source of new PNG:** Playwright captures of `http://localhost:3000/favoriter` at `390x844` and `1440x900` with `sunnyseat_onboarded=1` and `sunnyseat_favourite_ids=["1","2"]`, saved to `nextjs-app/docs/design/references/screens/mobile/favourites-tab.png` and `nextjs-app/docs/design/references/screens/desktop/favourites-tab.png`.

**Recipe change:** `.claude/scripts/visual-validate.sh` storage-state setup now adds the favourites key only for `favourites-tab`, and its wait-selector switch waits for venue cards in the mobile sheet or desktop list panel as appropriate. `project-context.md` now describes the screen as seeded saved-favourites content instead of an empty state.

**Verification:** PASS — `favourites-tab` mobile and desktop after re-baseline via `scripts/visual-validate.sh`. Desktop comparison noted only a one-minute dynamic time-display difference.

**Reason / spec link:** Rasmus approved the seeded saved-favourites reference decision on 2026-05-28 after the gate exposed a conflict between the stale empty-state PNG and Story 2.7 acceptance criteria. Story 2.7 Task 6.2/6.3 requires deterministic favourite seeding; `AGENTS.md` Visual Validation rule requires storage/capture recipe changes and reference PNG updates to be logged in the same operation.

**Re-evaluation trigger:** Revisit if the production favourites storage key changes, fixture IDs `1`/`2` are removed, or the visual provider stops using `.claude/scripts/visual-validate.sh`.

### 2026-05-21 — MVP Claude Design source refresh (mobile + desktop) — Story 2.5 course correction (Codex)

**Trigger:** Rasmus provided the refreshed Claude Design handoff `sunnyseat-claude-design-2026-05-21/` and clarified the page split: MVP validation must use only `SunnySeat MVP Mobile Unlocked.html` and `SunnySeat MVP Desktop Unlocked.html`; Post-MVP Unlocked/Locked pages are future-only for Season Pass, Swish, paywalls, payment, and locked states. Previous Story 2.x visual acceptances may have treated stale story text as reference drift, so active references needed to be regenerated before continuing Story 2.5.

**Resolution:** Replaced the active generated Claude Design bundle from the 2026-05-21 handoff while preserving curated `STATE-MAPPING.md` and `ESLINT-AUDIT.md`; updated capture recipes to regenerate only MVP-covered states from the two MVP Unlocked prototypes; removed premium/paywall/payment recipes from the default MVP capture pass; regenerated active MVP reference PNGs.

**Source of new PNG:** `nextjs-app/docs/design/references/claude-design/project/SunnySeat MVP Mobile Unlocked.html` and `nextjs-app/docs/design/references/claude-design/project/SunnySeat MVP Desktop Unlocked.html`.

**Changed PNGs:** `mobile/onboarding.png`, `mobile/map-primary.png`, `mobile/map-panel-venues.png`, `mobile/map-with-selected-venue.png`, `mobile/venue-detail.png`, `mobile/feedback.png`, `mobile/review.png`, `mobile/about.png`, `mobile/favourites-tab.png`, `desktop/map-primary.png`, `desktop/venue-detail.png`, `desktop/about.png`, `desktop/favourites-tab.png`.

**Recipe change:** `nextjs-app/scripts/capture-claude-design-refs.mjs` now points active recipes at `SunnySeat MVP Mobile Unlocked.html` / `SunnySeat MVP Desktop Unlocked.html`, uses `sunny_screen` for MVP mobile map states, adds MVP `about` captures through settings -> `Om SunnySeat`, retains desktop onboarding as the prior curated baseline, and excludes Post-MVP paywall/payment/locked recipes from the MVP capture pass. `nextjs-app/docs/design/references/claude-design/STATE-MAPPING.md` was rewritten to document the MVP/Post-MVP split.

**Verification:** `cd nextjs-app && node scripts/capture-claude-design-refs.mjs` captured 13, skipped 0, failed 0. Manual inspection covered `map-with-selected-venue` mobile, `map-panel-venues` mobile, `venue-detail` desktop, and `about` mobile. Visual validation against the running app must be rerun after Story 2.5 implementation is reconciled with these refreshed references.

**Reason / spec link:** User-approved visual source refresh on 2026-05-21; `AGENTS.md` Visual Source Of Truth rule; `project-context.md` 2026-05-21 visual source refresh; PRD/epics/architecture/UX notes updated to state that MVP references come only from the two MVP Unlocked pages.

**Re-evaluation trigger:** Re-run this flow whenever the Claude Design MVP Unlocked pages change, when a Post-MVP payment/locked story is reactivated, or when a visual gate exposes a mismatch that the team classifies as obsolete reference instead of implementation defect.

### 2026-05-04 — `onboarding` (desktop) — Story 1.5 Onboarding & Geolocation (Amelia / dev-story)

**Trigger:** The visual validation gate failed on the desktop `?_state=onboarding` capture. The verdict described a "two-panel onboarding modal with illustration on left and text/navigation on right ... pagination dots ... 'NÄSTA' next button ... 'SOLVÄDERSAPPEN' label ... step-by-step onboarding flow" — a multi-step desktop onboarding flow that the implementation does not, and should not, render.

**Resolution:** Re-baseline the desktop reference PNG to the legacy Figma export, and remove the desktop `onboarding` recipe from `capture-claude-design-refs.mjs` so a recapture does not silently regenerate the spec-incorrect prototype state.

**Source of new PNG:** `nextjs-app/docs/design/references/screens/legacy/desktop/onboarding.png` copied to `nextjs-app/docs/design/references/screens/desktop/onboarding.png`.

**Recipe change:** removed from `nextjs-app/scripts/capture-claude-design-refs.mjs` — the desktop `{ screenId: 'onboarding', viewport: 'desktop', prototype: PROTO.freeDesktop, steps: [...] }` entry is replaced with a comment block pointing here.

**Verification:** Mobile visual gate `PASS`; desktop visual gate `PASS` after re-baseline. (Both ran via `.claude/scripts/visual-validate.sh onboarding "/?_state=onboarding" {mobile,desktop}` against `next dev` on `localhost:3000`.)

**Reason / spec link:** UX spec §"Screen: onboarding (desktop)" explicitly states the desktop onboarding is "Identical to mobile — obtain location permission" with content centred horizontally and vertically. The Claude Design desktop prototype includes an alternate 3-step onboarding flow that the spec does not adopt. Story 1.5 implements the spec-compliant single-screen layout. Story 1.5 file Dev Notes §"Important caveats / known issues at story start" #1 documented this scope-drift in advance and offered the re-baseline path; Rasmus accepted on 2026-05-04.

**Re-evaluation trigger:** If the Claude Design desktop prototype is updated so its onboarding flow matches the spec (single-screen, centred, identical to mobile), re-add the recipe and capture against the new prototype state. Until then, the legacy PNG is authoritative for desktop onboarding.

### 2026-05-04 — `onboarding` (desktop) — Story 1.5 Onboarding & Geolocation (Amelia / dev-story) — second pass

**Trigger:** After the legacy-promote re-baseline above, the desktop visual gate still failed because the legacy Figma export pre-dates the story's explicit AC interpretations: the export is missing the wordmark sun icon, the trust microcopy line ("Gratis · Ingen registrering · Ingen spårning"), and the underlined skip link — all three of which Story 1.5 AC1 interpretation notes mandate. The legacy PNG is therefore an incomplete reference that does not reflect the story's specified behaviour.

**Resolution:** Auto-capture the running implementation at 1440×900 and use it as the desktop reference (option (b) in the dev-story decision tree, accepted by Rasmus 2026-05-04). The implementation already passes mobile against the prototype-derived reference, the UX spec mandates "Identical to mobile" on desktop, and every story-spec AC interpretation note was implemented verbatim — the implementation is the most faithful representation of "what desktop should look like" available without designer involvement.

**Source of new PNG:** Playwright capture of `http://localhost:3000/?_state=onboarding` at viewport `1440×900` via `npx playwright screenshot --browser chromium --viewport-size "1440,900" --wait-for-timeout 1500 ...`. Saved to `nextjs-app/docs/design/references/screens/desktop/onboarding.png`, overwriting the legacy promote from earlier today.

**Recipe change:** None. The desktop `onboarding` recipe in `capture-claude-design-refs.mjs` remains intentionally absent (see prior entry) because the prototype's desktop onboarding state is spec-incorrect; recapturing from the prototype would regenerate the wrong PNG.

**Verification:** Desktop visual gate `PASS` after re-baseline (`.claude/scripts/visual-validate.sh onboarding "/?_state=onboarding" desktop`). Mobile gate remains `PASS` against the prototype-derived reference, which is unchanged.

**Reason / spec link:** This is a self-fulfilling baseline — the gate passes because the reference *is* the implementation. The justification is structural rather than designer-blessed: the UX spec §"Screen: onboarding (desktop)" mandates "Identical to mobile", the mobile implementation passed against its prototype reference, and every Story 1.5 AC interpretation note (§"AC1 caveats") was implemented verbatim. Until a designer produces a definitive desktop layout that supersedes "identical to mobile", the implementation IS the spec for desktop. The trade-off — that this baseline cannot catch desktop regressions until a real reference exists — is accepted in exchange for unblocking Story 1.5 review without further manual design work.

**Re-evaluation trigger:** Mandatory recapture when ANY of the following happens: (1) a designer produces a desktop-specific onboarding design that supersedes "identical to mobile"; (2) the mobile reference is updated (the desktop should be re-derived from the same source so they stay in sync); (3) any AC1 visual element of `OnboardingScreen` is changed (gradient token, wordmark, microcopy, CTA chrome, layout). At that point a third entry replaces this baseline.

### 2026-05-05 — `onboarding` (mobile) — Story 1.5 Onboarding & Geolocation, code review Round 1 (Amelia / dev-story)

**Trigger:** Code review Round 1 batch-apply landed three patches that change the static onboarding overlay relative to the prior prototype-derived mobile reference: P1 (explicit `<br />` between "Hitta uteplatser" and "i solen — just nu." per Task 4.3) introduces a two-line headline; P2 (entrance fade-in from white per UX spec) is interaction-only — completes before the 1.5 s capture stability wait; P3 (skip-link `min-h-[44px]` per WCAG 2.1 AA touch-target rule) makes the skip-link box ~14 px taller and shifts the trust-microcopy line down accordingly. The prior mobile reference (440 KB, prototype-derived) does not show any of these.

**Resolution:** Auto-capture the running implementation at 390×844 with `Accept-Language: sv-SE,sv;q=0.9` (Playwright's default `Accept-Language: en-US` would otherwise resolve the locale to English) and use it as the new mobile reference. The implementation is the most faithful representation of the post-Round-1 spec — every patch is anchored to either an explicit acceptance criterion (P1 → Task 4.3, P3 → CLAUDE.md a11y rule) or the UX spec (P2 → §"Screen: onboarding (mobile)" entrance fade), and the prior reference predates these clarifications.

**Source of new PNG:** Playwright capture of `http://localhost:3000/?_state=onboarding` at viewport `390×844` via `node nextjs-app/scripts/capture-onboarding-rebaseline.mjs`. Saved to `nextjs-app/docs/design/references/screens/mobile/onboarding.png`, replacing the prior prototype-derived 440 KB PNG.

**Recipe change:** None to `nextjs-app/scripts/capture-claude-design-refs.mjs` — the mobile `onboarding` recipe still points at the Claude Design prototype, which remains the long-term source of truth. A one-off helper `nextjs-app/scripts/capture-onboarding-rebaseline.mjs` was added that captures from the running dev server with `Accept-Language: sv-SE` so the rebaseline is reproducible (the helper is documented in its header comment).

**Verification:** Mobile reference visually inspected — Swedish copy renders, two-line headline renders with explicit `<br />`, 44 px skip-link visible, trust microcopy intact. Visual gate not run end-to-end at this commit (the next sprint-status transition will exercise it).

**Reason / spec link:** P1 — Story 1.5 Tasks/Subtasks §4.3 ("Keep the line break (`<br />`) explicit between 'Hitta uteplatser' and 'i solen — just nu.'"). P3 — `CLAUDE.md` §"Critical rules" → "Accessibility is non-negotiable. … Every interactive element has a 44×44 px minimum touch target". The prior reference's ~30 px skip-link box reflects the prototype's plain-HTML rendering, which the project's a11y rule supersedes per "Match the visual outcome, not the prototype's implementation".

**Re-evaluation trigger:** Mandatory recapture when (1) any future code change alters the static layout of `OnboardingScreen` (font-size shifts, padding edits, copy-length shifts that break visual rhythm), (2) the locale-negotiation issue tracked in `deferred-work.md` ("Investigate why Accept-Language is not honoured by localePrefix: 'as-needed' at /") is fixed and the helper script becomes redundant.

### 2026-05-05 — `onboarding` (desktop) — Story 1.5 Onboarding & Geolocation, code review Round 1 (Amelia / dev-story) — third pass

**Trigger:** Same as the mobile entry above — Round 1 patches P1, P2, P3 change the static overlay. The prior 2026-05-04 second-pass desktop reference was a self-fulfilling baseline captured from the implementation, but it pre-dates Round 1 patches; the implementation has now diverged from it (post-P1 two-line headline, post-P3 taller skip-link).

**Resolution:** Recapture from the running implementation at 1440×900 with `Accept-Language: sv-SE,sv;q=0.9` so the desktop reference stays in sync with the mobile reference (per the prior 2026-05-04 second-pass entry's re-evaluation trigger #2: "the mobile reference is updated — the desktop should be re-derived from the same source so they stay in sync"). The "Identical to mobile" UX-spec mandate is satisfied.

**Source of new PNG:** Playwright capture of `http://localhost:3000/?_state=onboarding` at viewport `1440×900` via `node nextjs-app/scripts/capture-onboarding-rebaseline.mjs`. Saved to `nextjs-app/docs/design/references/screens/desktop/onboarding.png`.

**Recipe change:** None. The desktop `onboarding` recipe in `capture-claude-design-refs.mjs` remains intentionally absent (see 2026-05-04 first-pass entry — the prototype's desktop onboarding state is spec-incorrect and recapturing from the prototype would regenerate the wrong PNG).

**Verification:** Desktop reference visually inspected — same Swedish copy as mobile, content centred horizontally, full-width CTA, footer trust microcopy intact. UX spec §"Screen: onboarding (desktop)" mandate of "Identical to mobile" satisfied.

**Reason / spec link:** Same as the mobile entry above (P1 → Task 4.3, P3 → CLAUDE.md a11y rule, P2 → UX spec). Plus the 2026-05-04 second-pass entry's re-evaluation trigger #2 explicitly mandates this rebaseline whenever the mobile reference is updated.

**Re-evaluation trigger:** Inherits all triggers from the 2026-05-04 second-pass entry (designer produces a desktop-specific design; mobile reference updated; any AC1 visual element of `OnboardingScreen` is changed). The locale-negotiation issue (deferred-work.md) is also a re-evaluation trigger if fixed — the helper script becomes redundant.

### 2026-06-10 — `review` visual gate wait recipe — Story 3.3 review-finding fixes (Amelia / dev-story)

**Trigger:** Story 3.3 review finding noted that mobile and desktop venue-detail overlays could mount duplicate `ReviewFlow` instances with duplicate heading IDs/test IDs. The implementation now scopes review flows and forms by overlay instance (`mobile` / `desktop`), which changed the visual gate's form wait selector.

**Resolution:** No PNG changed. The legacy provider script `.claude/scripts/visual-validate.sh` now waits for `[data-testid="review-form-mobile"]` on mobile and `[data-testid="review-form-desktop"]` on desktop for the `review` screen instead of the obsolete shared `[data-testid="review-form"]`.

**Source of new PNG:** None.

**Recipe change:** `.claude/scripts/visual-validate.sh` `review)` wait-selector case only. `nextjs-app/scripts/capture-claude-design-refs.mjs` and `STATE-MAPPING.md` are unchanged.

**Verification:** Re-run `.\scripts\run-sh.ps1 scripts/visual-validate.sh review "/?venue=test-venue-sunny&_state=review" mobile` after this recipe change before Story 3.3 returns to review.

**Reason / spec link:** `AGENTS.md` requires any visual capture-recipe change to update this log in the same operation. Story 3.3 review finding required unique review-flow DOM identifiers while preserving the inline review visual gate.

**Re-evaluation trigger:** Re-check this wait selector if `ReviewFlow`/`ReviewForm` test IDs change again, if the visual gate stops delegating to `.claude/scripts/visual-validate.sh`, or if a future desktop standalone `review` screen is added to `project-context.md`.

### 2026-05-05/06 — `map-primary` + `onboarding` (desktop) — Story 1.6 CI/CD Quality Gates Task 2.13 (Amelia / dev-story)

**Trigger:** Story 1.6 Task 2.13 instructs "Re-run Stories 1.3 / 1.4 / 1.5 visual validation gates to confirm no regression. … For 1.5, re-capture both viewport reference PNGs from the running implementation and log the re-baseline … with the trigger 'Story 1.6 Task 2 reconciliation pass'". Task 2 reconciles design-token foundations (`--spacing-*`, `--z-*`, `--ease-*`, font fallback), lifts inline RGBA in `OnboardingScreen`, and replaces hardcoded navbar heights with tokens. The token consolidation shifts pixel-exact computed values for screens that consume `globals.css` — i.e. screens with a real Story 1.4/1.5 implementation backing the route. This entry covers ONLY those screens.

**Resolution:** Re-baseline the two desktop reference PNGs whose implementations consume `globals.css` and therefore drift from the post-Task-2 build: `map-primary.png` (Story 1.4 desktop) and `onboarding.png` (Story 1.5 desktop). The four future-story desktop captures (`payment-failed`, `premium-paywall`, `premium-paywall-processing`, `venue-detail`) were re-captured in the same operation but for a different reason — see the separate entry below.

**Source of new PNG:** Playwright captures of the dev-server routes per `project-context.md` Screen ID → Route Map at `1440×900` via `node nextjs-app/scripts/capture-claude-design-refs.mjs <screen-id>` against the running Next.js implementation. Each PNG saved into `nextjs-app/docs/design/references/screens/desktop/`.

**Recipe change:** None. Existing recipes in `capture-claude-design-refs.mjs` are unchanged; the captures use the same state-forcing routes the gate already consults.

**Verification:** Visual gate re-runs against the new references PASSED for both screen IDs at the desktop viewport. The post-1.6 P39 multi-viewport iteration (`sprint-status-gate.sh`) was used so both mobile and desktop rows were validated where present; no defects surfaced.

**Reason / spec link:** Story 1.6 §Tasks/Subtasks Task 2.13 (mandatory re-baseline trigger). Token reconciliation from Tasks 2.1 → 2.11 (spacing, z-index, ease, font fallback, sun-burst tokens, navbar height tokens) shifted computed values for the two desktop screens whose Story 1.4/1.5 implementations consume the affected tokens.

**Re-evaluation trigger:** Mandatory recapture when (1) any further token consolidation alters computed pixel values, (2) Story 5.x partner-pin styling changes the desktop `map-primary` overlay panel layout, (3) the Plan B re-baseline numbers in PRD NFR8 change again (would imply a different optimisation pass that may shift route-bundle-derived JS load times affecting first-paint).

### 2026-05-05/06 — Future-story desktop screens (desktop) — post-Story-1.5 prototype-state baseline carry-forward (Amelia / dev-story)

**Trigger:** Round 2 R-010 + D-B=B (2026-05-08) split this entry off from the Task 2.13 entry above. The four screens covered here — `payment-failed`, `premium-paywall`, `premium-paywall-processing`, `venue-detail` — are owned by future stories (Epic 4 Swish Payment / Epic 2 Venue Detail) that have NO implementation in the working tree; the captures necessarily come from the Claude Design prototype's hand-coded HTML/CSS, which does NOT consume `globals.css`. Story 1.6 Task 2 token reconciliation therefore CANNOT have shifted these PNGs' computed values — the original entry over-attributed the cause.

The actual cause was a post-Story-1.5 prototype-state baseline carry-forward: prior to Story 1.5 the desktop reference PNGs for these four future screens had been pending an explicit re-capture (see 2026-05-04 desktop-onboarding caveat) and were still showing pre-Story-1.5 prototype state. Story 1.6's blanket Task 2.13 sweep happened to refresh them, but the trigger is "prototype-state baseline carry-forward", not token reconciliation.

**Resolution:** Re-baseline the four desktop reference PNGs from the latest Claude Design prototype state: `payment-failed.png`, `premium-paywall.png`, `premium-paywall-processing.png`, `venue-detail.png`. These remain the authoritative references for the future stories (Epic 2 / Epic 4) that will eventually implement these screens; when those stories ship, their implementations will be visually validated against these prototype-state PNGs and re-baselined to implementation captures at that time.

**Source of new PNG:** Playwright captures of the Claude Design prototype HTML at `1440×900` via `node nextjs-app/scripts/capture-claude-design-refs.mjs <screen-id>` (the prototype state-forcing recipes drive each screen to its target state). Saved into `nextjs-app/docs/design/references/screens/desktop/`.

**Recipe change:** None. The recipes in `capture-claude-design-refs.mjs` for these four screen IDs were unchanged; the captures use the same prototype state-forcing routes documented in `STATE-MAPPING.md`.

**Verification:** Visual gate re-runs PASSED for all four screen IDs against their newly-baselined references; the screens are not yet implemented, so the gate runs against the prototype-state expectation. The state-mapping recipes in `capture-claude-design-refs.mjs` were re-confirmed to produce stable captures across two consecutive runs.

**Reason / spec link:** No story explicitly mandated this carry-forward — the captures happened in the same Task 2.13 sweep as the implementation-screen rebaselines. Round 2 R-010 surfaced the trigger-attribution gap and Round 2 D-B=B resolved it by splitting this entry. Future Epic 2 / Epic 4 stories that implement these screens will produce their own re-baseline entries against the implementation, superseding this prototype-state baseline.

**Re-evaluation trigger:** Mandatory recapture when (1) the upstream Claude Design bundle is refreshed and the prototype state for any of the four screens changes (`scripts/fetch-claude-design.sh` followed by `node nextjs-app/scripts/capture-claude-design-refs.mjs`), (2) the corresponding future story (Epic 2 venue-detail; Epic 4 paywall / payment-failed) implements the screen — at that point the entry is superseded by an implementation-state re-baseline.

### 2026-05-19 — `venue-detail` visual gate wait recipe — Story 2.4 Venue Search, code review Round 1 (Amelia / code-review)

**Trigger:** Story 2.4 visual validation for desktop `venue-detail` captured before the venue-detail overlay had reliably mounted, causing dev-mode race noise in the screenshot comparison instead of measuring the implemented screen state.

**Resolution:** Update the legacy provider script `.claude/scripts/visual-validate.sh` so `venue-detail` waits for `[data-testid="desktop-venue-detail-panel"]` on desktop and `[data-testid="mobile-venue-detail-sheet"]` on mobile before capture, matching the same explicit-state wait style already used by `map-with-selected-venue`.

**Source of new PNG:** None. No reference PNG changed in this operation.

**Recipe change:** `.claude/scripts/visual-validate.sh` adds a `venue-detail)` case to the wait-selector switch. `nextjs-app/scripts/capture-claude-design-refs.mjs` is unchanged.

**Verification:** Story 2.4 review gate later ran with `VISUAL_VALIDATE_PROVIDER=none` and documented manual visual acceptance for downstream/reference-scope differences. This entry records the capture-recipe change only; it is not a reference re-baseline.

**Reason / spec link:** `AGENTS.md` Visual Validation requires any reference PNG or capture-recipe change to update this log in the same operation. Story 2.4 Task 8.11 requires desktop `venue-detail` visual validation as a parent screen for search/list chrome.

**Re-evaluation trigger:** Re-check this wait selector if `VenueDetailOverlay` data-testid values change, if the provider-neutral wrapper stops delegating to `.claude/scripts/visual-validate.sh`, or if the visual gate moves to a provider that uses its own state-wait contract.

### 2026-05-19 — MVP scope correction for premium references — planning update only

**Trigger:** Rasmus approved a course correction after Story 2.4: time planner, future date picker, future sun simulation, and favourites are free MVP functionality. Season Pass, Swish payments, paywalls, premium activation, premium recovery, and payment failure flows are deferred to Future Monetization.

**Resolution:** No PNG was changed in this operation. Premium/paywall/payment references are retained as future-only assets, but MVP visual gates must not require a Season Pass prompt, Swish CTA, payment status, premium recovery, or favourites lock badge. Future implementation stories must re-evaluate these references before reactivating Season Pass.

**Source of new PNG:** None.

**Recipe change:** None.

**Verification:** Planning artifacts now mark premium screens as inactive for MVP and preserve details in `_bmad-output/planning-artifacts/future-monetization-season-pass.md`.

**Reason / spec link:** Sprint Change Proposal `sprint-change-proposal-2026-05-19.md`; Future Monetization archive `future-monetization-season-pass.md`; PRD v3.1 MVP scope correction.

**Re-evaluation trigger:** Mandatory rebaseline or explicit accept-with-rationale when Story 2.5 or Story 2.7 validates screens whose references still contain old locked-planner or favourites-lock chrome.
### 2026-05-27 — `map-primary` mobile visual route state-forcing scope — Story 2.5 rereview (Amelia / dev-story)

**Trigger:** DS 2.5 rereview found that bare `/?_time=14:00` was being treated as both a real planner URL and a visual-reference normalization trigger. That leaked reference-only sunny/list normalization into normal mobile planner runtime.

**Resolution:** No PNG changed. The mobile `map-primary` visual route now uses `/?_state=map-primary&_time=14:00`, keeping sunny/list reference normalization behind the dev-only `_state` convention while bare `?_time=14:00` preserves real API-derived venue states.

**Source of new PNG:** None.

**Recipe change:** `project-context.md` Screen ID -> Route Map changed the mobile `map-primary` route from `/?_time=14:00` to `/?_state=map-primary&_time=14:00`. `capture-claude-design-refs.mjs` and the reference PNG are unchanged.

**Verification:** The DS 2.5 rereview regression covers bare mobile `?_time=14:00` preserving real pin/list data. The canonical story gate re-runs the updated route map before story completion.

**Reason / spec link:** `AGENTS.md` requires reference/capture recipe changes to be logged, and `docs/dev/state-forcing.md` reserves `_state` for dev-only visual-state forcing.

**Re-evaluation trigger:** Revisit this route if the visual gate stops using `project-context.md`, if `_state` is removed from dev URLs, or if the `map-primary` mobile reference PNG is re-baselined to real fixture data instead of normalized visual data.
