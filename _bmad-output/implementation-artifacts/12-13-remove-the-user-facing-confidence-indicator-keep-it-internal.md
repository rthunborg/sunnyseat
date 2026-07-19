---
baseline_commit: e442fedc27f4250f83dcf3a1df126de00a4ed75b
---

# Story 12.13: Remove the User-Facing Confidence Indicator (Keep It Internal)

Status: in-progress

## Story

As a **user**,
I want the map and cards to show just how sunny a place is (and whether it's sunny at
all), without a second "confidence" number to interpret,
So that the app is simple to read and I trust the sun figure at face value.

## Source Context (Verbatim From Epic)

_Context (2026-07-08, maintainer decision):_ the per-venue confidence figure (the faded
"~84%" chip on the card, and its quick-info/detail equivalents) makes users do
unwanted meta-reasoning ("how sure are they about THIS one vs that one?"). The product
promise is simpler: **we show how much of the seating is in sun; we aim for it to be
right; where it's off, user feedback drives corrections.** So confidence is **removed
from all user-facing surfaces**, kept **internally** (still computed, still in
logs/uncertainty reasons, available to the dev tools and the maintainer), and explained
lightly on the About page. Confirmed wiring (2026-07-08 investigation): the visible chip
is `confidenceDisplay.visibleText` on `VenueCard.tsx:248-258`, mirrored on
`VenueQuickInfo` and `VenueDetailContent`; the bold "N% sol" (sun-exposure) is a
SEPARATE value and STAYS.

## Acceptance Criteria (Verbatim From Epic)

**Given** confidence reaches the user through MORE sites than a naive scope names
(grounding pass 2026-07-08): the visible chip `confidenceDisplay.visibleText`
(`VenueCard.tsx:255`; quick-info/detail visible chips were already removed in Story 11.4);
the card's SCREEN-READER name — which is built in **`VenueList.tsx:102-107`** via
`t('cardAria', { confidence: confidenceDisplay.accessibleText })` against the template at
**`messages/sv/venue.json:125`** (+ en), NOT in `VenueCard.tsx` (which only renders
`labels.select`); the quick-info/detail sr-only lines (`VenueQuickInfo.tsx:299`,
`VenueDetailContent.tsx:202`); and the directions handoff's `routeConfidenceLabel`, which is
BUILT in **`MapView.tsx:1624`** (via `routeOverlayLabels`) and merely RENDERED by
`RouteOverlay.tsx:132-135` (+ its `confidence` prop)
**When** the confidence indicator is removed from ALL those surfaces — the bold
sun-exposure "N% sol" is untouched
**Then** no confidence percentage appears anywhere in the user UI — **visible OR
screen-reader**: the visible chip is gone; the `cardAria` template drops its `{confidence}`
segment in BOTH locales (and `VenueList.tsx` drops the `confidence` arg +
`getConfidenceDisplayState` call/import) — `cardAriaObscured` already omits it; the
quick-info/detail sr-only lines drop it; and the route overlay's CONFIDENCE segment is
removed — but NOT the whole row: `routeConfidenceLabel` (MapView.tsx:1638-1648) joins the
confidence text AND the prediction-UNCERTAINTY label (`getPredictionUncertaintyDisplay`)
into one " · " row, and the uncertainty copy is an honesty signal this story explicitly
PRESERVES — so the builder/prop is reduced/renamed to an **uncertainty-only** row (rendered
when an uncertainty label exists, omitted otherwise), with RouteOverlay tests covering both
the with-uncertainty and without cases. Layouts reflow cleanly (no empty
slot / stray separator)

**Given** removing the confidence display leaves dead plumbing + tests that CURRENTLY PIN
the old behaviour (so the story is incomplete without naming them)
**When** the removal lands
**Then** the story also: (a) **flips the guard test** `removed-i18n-keys.test.ts:98-103`,
which today ASSERTS the `confidence`/`confidenceApproximate`/`confidenceUnavailable` keys
STAY — move them from "kept" to "removed" (or the dead keys are deleted and this guard is
updated in lock-step, per that file's own no-orphan-keys convention); (b) removes the now-dead
`showVisibleConfidence` prop chain (`VenueCard.tsx:79,104`, `VenueList.tsx:23,45,124`,
`MapView.tsx:1131,1176` + `VenueCard.test.tsx:391`); (c) states the disposition of the
display-only `lib/utils/confidence-display.ts` (all five UI readers removed → delete it, as
it is PRESENTATION not the internal model) and updates ALL its tests — both its direct unit
spec `test/unit/confidence-display.test.ts` (delete/reframe it, else the unit suite goes red
the moment the util is deleted) AND the confidence assertions across the suite — the
`e2e/epic-10-weather-matrix.spec.ts:112-186` visible "Säkerhet …" checks, PLUS (since this
story reduces `routeConfidenceLabel` + the RouteOverlay row to uncertainty-only)
`test/e2e/visit-loop.spec.ts` (`/Säkerhet \d+%/`) and `test/components/RouteOverlay.test.tsx`
(flip the confidence-row assertions to the uncertainty-only contract) — so no orphaned util / dead prop / red
test survives anywhere in the suite

**Given** this document's own canonical Requirements Inventory still PROMISES user-facing
confidence — FR2 ("…confidence score…", :49), FR7 ("…confidence percentage for any
venue", :54), FR12 ("The system displays confidence scores…", :59), the FR Coverage Map
rows (:205, :210), and the UX rows UX-DR5 / UX-DR11 / UX-DR23 (confidence in quick-info,
tilde-on-stale, list cards; :170/:176/:188) — and future story generation / audits read
those lines as authoritative, so left unchanged they could legitimately REINTRODUCE the
deleted chip
**When** 12.13 lands
**Then** those FR/UX inventory + coverage-map lines are amended in the SAME change with an
explicit supersession note ("superseded 2026-07-08 — confidence is computed internally but
not displayed; Story 12.13"), so the forward-looking requirements match the shipped product;
historical epic/story sections stay untouched (they are records of what was built)

**Given** confidence is still valuable internally
**When** the display is removed
**Then** confidence is STILL computed and available server-side (logs, the coverage
pipeline, `prediction_uncertainty` reasons, and any dev/maintainer tooling) — this story
removes only the user-facing NUMBER, not the internal model

**Given** the weather-honesty signal must survive
**When** confidence is gone from the UI
**Then** "it's cloudy / sun is blocked" is still communicated by the **grey pin** and
the venue-detail sky/uncertainty copy (the weather truth is carried by pin STATE, not by
a confidence number) — no honesty regression

**Given** the About page (Story 12.8) planned a "Sol vs Säkerhet" section
**When** confidence is no longer shown
**Then** that section is reframed (see 12.8) to explain the sun % + that accuracy
improves from feedback, rather than teaching a "Säkerhet" number users will never see

**Design Gate Criteria:**
- **Visual:** No confidence chip on card / quick-info / detail; the sun figure and all
  other chrome are unchanged; clean reflow
- **Behaviour:** Sun %, sunny/grey verdict, and the grey-pin weather signal are all
  unchanged; only the confidence number is gone
- **Animation:** None
- **Visual validation:** Card / quick-info / detail vs a rebaselined reference — the
  confidence chip is absent, nothing else moved

## Knock-On Effects (Verbatim From Epic)

> **Knock-on effects (all handled):** (1) With confidence not displayed, the
> `SUNNYSEAT_COVERAGE_CAP` cap (which clamps the DISPLAYED confidence) no longer has any
> user-facing effect — see the reframed Story 12.2, which drops the flag as cleanup and
> repurposes the walk/feedback verification toward finding and fixing wrong sun-%
> predictions rather than gating a shown confidence. (2) Story 12.8's confidence section
> is reframed accordingly. (3) **The confidence number is NOT the only cap-driven user
> surface:** `buildPredictionUncertainty` derives the public uncertainty TIER from numeric
> confidence (`uncertaintyLevelFromConfidence`, `sun-engine.ts:1122` — `<50 high, <75
> medium`), rendered as "Låg osäkerhet / Osäker prognos" copy. So the cap still moves
> user-visible uncertainty LABELS after the chip is gone — handled in Story 12.2 (decouple
> or intentionally re-baseline that copy when the cap is removed/simplified).

## Pre-Implementation Dependency Gate

Story 12.13 is a presentation/API-boundary cleanup, not a confidence-model rewrite. Start
with these checks before editing:

1. **Story 12.6 public sun contract is present.** The branch must already have the shared
   `sunExposurePercent > 50 && weatherGateState !== 'gated'` predicate and the two-state
   amber/grey pin/card model. Do not remove, rename, or weaken that predicate while deleting
   confidence presentation.
2. **Internal confidence stays internal.** Do not delete `calculateConfidenceFactors`,
   coverage-cap logic, `buildPredictionUncertainty`, weather freshness handling, server logs,
   or maintainer/dev diagnostics merely because the public chip is gone.
3. **Public DTO/feedback disposition is explicit.** Architecture says public list/detail DTOs
   retire `confidence` after Story 12.13 consumers are removed. Current client feedback code
   still reads `venue.confidence` to submit `confidenceAtPrediction`; do not break feedback
   silently. Either move/retire that client dependency with tests, or document a short-lived
   non-rendering transition if the field cannot be removed until Story 12.2 replaces the
   feedback evidence contract.
4. **Planning-doc audit is surgical.** PRD v3.2 and the UX spec already appear mostly aligned
   to the no-public-confidence contract on this branch. Search and fix only forward-looking
   stale promises; do not rewrite historical shipped Epic 1-11 story text.

If any prerequisite conflicts with current branch reality, stop and record the blocker rather
than implementing a local one-off confidence/display policy.

## Tasks / Subtasks

- [ ] **Task 0 - Reconfirm baseline, sources, and scope** (AC: all)
  - [ ] From `nextjs-app/`, run the required pre-story baseline `npx tsc --noEmit` and `npx eslint . --quiet`. Stop for unrelated failures.
  - [ ] Read `AGENTS.md`, `project-context.md`, `nextjs-app/docs/design/DESIGN.md`, UX §Public Confidence Removal Contract, Architecture §Public DTO and API Delta, Epic 12 QA risk R-011/R-019/R-010, `REBASELINE-LOG.md`, and the current files listed under "Current Implementation Facts".
  - [ ] Confirm Story 12.6's public-sun predicate/two-pin model is present; preserve amber seating-share percentages and grey no-number weather honesty.
  - [ ] Confirm no new dependency or design token is required. This story should remove text/plumbing and adjust layout, not add ad-hoc colours, spacing, shadows, or animation.

- [ ] **Task 1 - Remove card/list confidence presentation and accessible-name leakage** (AC: 1, 2)
  - [ ] In `VenueList.tsx`, remove `getConfidenceDisplayState` import/use, stop passing `{confidence}` into `cardAria`, and remove `confidenceMeta` / `showVisibleConfidence` props unless another non-rendering consumer remains.
  - [ ] Update `messages/sv/venue.json` and `messages/en/venue.json`: `venue.list.cardAria` drops the confidence segment and remains grammatical in both locales. Keep `cardAriaObscured` percent-free as-is unless a scan proves it needs a parallel copy cleanup.
  - [ ] In `VenueCard.tsx`, remove `confidencePercent`, `confidenceMeta`, `showVisibleConfidence`, confidence labels, `getConfidenceDisplayState`, and the visible confidence chip/separator. Preserve the sun-exposure chip/text for amber public-sunny cards and preserve grey percentage-free cards from Story 12.6.
  - [ ] Verify no empty separator remains in the card metadata row when the chip disappears. Do not remove distance, rating, tags, favourite, sun-exposure, weather, or image fallback behavior.

- [ ] **Task 2 - Remove QuickInfo/detail sr-only confidence while preserving distance, hours, sky, and uncertainty** (AC: 1, 4, 5)
  - [ ] In `VenueQuickInfo.tsx`, remove the sr-only `{confidenceDisplay.accessibleText}` line and the related confidence props/labels/imports. Keep selected-instant opening-hours, distance, approximate-distance qualifier, `publicVerdictQualification`, sky line, and route/detail buttons.
  - [ ] In `VenueDetailContent.tsx`, remove the sr-only confidence span in the header metadata row and the related confidence props/labels/imports. Keep rating, city, price, opening-hours badge/row, sky copy, detail rows, route button, feedback, and review slots.
  - [ ] Update `MapView.tsx` call sites so QuickInfo and VenueDetail overlays no longer receive confidence props/labels. Do not alter the selected-venue, day-series, planner, review, favourite, or feedback mounting logic except where required by the DTO/feedback disposition task.
  - [ ] Update component tests that currently expect `Säkerhet 92%`, `Säkerhet cirka 92%`, or `Säkerhet saknas` sr-only content to assert absence instead and retain positive assertions for weather/uncertainty/distance.

- [ ] **Task 3 - Convert route overlay confidence context to uncertainty-only** (AC: 1, 2, 5)
  - [ ] In `MapView.tsx`, remove `getConfidenceDisplayState` from route label building. Replace `routeConfidenceLabel` with an uncertainty-only builder that calls `getPredictionUncertaintyDisplay` and returns a row only when meaningful uncertainty copy exists.
  - [ ] Rename route label/types away from `confidence` in `RouteOverlay.tsx` (`uncertainty` or equivalent). Keep the row itself when uncertainty exists and omit it cleanly when it does not.
  - [ ] Remove `venue.route.confidence*` translation readers/keys in both locales if no remaining reader exists. Keep the `venue.uncertainty.*` namespace and accessible descriptions.
  - [ ] Update `RouteOverlay.test.tsx` for both with-uncertainty and without-uncertainty cases. The row must not include `Säkerhet`, `Confidence`, `~NN%`, or an sr-only confidence fallback.

- [ ] **Task 4 - Delete dead display utility, props, i18n keys, and stale tests without touching internal confidence** (AC: 2, 4)
  - [ ] Delete `nextjs-app/lib/utils/confidence-display.ts` if the UI readers are gone. Delete or rewrite `nextjs-app/test/unit/confidence-display.test.ts` accordingly.
  - [ ] Flip `removed-i18n-keys.test.ts` so `quickInfo.confidence*`, `route.confidence*`, `list.confidence*`, and `detail.confidence*` are removed when no readers remain. Keep `messages-parity.test.ts` green.
  - [ ] Update stale tests named by the epic: `VenueCard.test.tsx`, `VenueList.test.tsx`, `VenueQuickInfo.test.tsx`, `VenueDetailContent.test.tsx`, `epic-10-weather-matrix.spec.ts`, `visit-loop.spec.ts`, and `RouteOverlay.test.tsx`.
  - [ ] Add a targeted source/i18n guard that fails if user-facing UI files or message namespaces reintroduce `Säkerhet`/`Confidence` numeric display strings or `getConfidenceDisplayState`. Scope the guard so internal `confidence-calculator`, `sun-engine`, feedback persistence, SQL, and maintainer diagnostics remain allowed.
  - [ ] If the existing deferred dead keys `quickInfo.obscuredPosition` / `detail.obscuredPosition` are still unconsumed and you are already editing the same i18n guard, remove them only after a repo-wide reader scan proves no runtime/test reader. Otherwise leave them as a separate low-risk i18n cleanup note; do not let them distract from confidence removal.

- [ ] **Task 5 - Make public DTO/internal confidence disposition explicit and feedback-safe** (AC: 3, 4)
  - [ ] Audit all remaining `venue.confidence` client reads after Tasks 1-4. Expected survivors should be zero presentation/a11y reads.
  - [ ] If feasible in this story, remove `confidence` from public list/detail DTOs (`VenueDataDto` / `VenueDetailDto` serialization, Zod/route types, fixtures, hooks/tests) while keeping server/internal `StoredVenue` and sun-engine confidence intact.
  - [ ] Before removing the DTO field, resolve current feedback-session usage: `recordVenueDetailView` and `FeedbackFlow` currently persist/send `confidenceAtPrediction` from `venue.confidence`. Either move this stamping to a server/internal source, drop it deliberately as obsolete until Story 12.2 evidence fields land, or retain the public DTO field temporarily with a comment stating it is non-rendering transition data. Cover the chosen path with tests.
  - [ ] Do not remove `confidenceAtPrediction` database/persistence support in a way that breaks existing feedback POST compatibility unless the route/schema/tests are updated deliberately.
  - [ ] Document any remaining internal confidence consumers in comments or tests as diagnostics/coverage/uncertainty/maintainer-only, not user display.

- [ ] **Task 6 - Audit forward-looking docs without rewriting history** (AC: 3, 6)
  - [ ] Search `_bmad-output/planning-artifacts/prd.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/qa/mvp-test-design-scope-correction-2026-05-19.md`, and `_bmad-output/qa/epic-12-test-design-2026-07-12.md` for stale forward-looking claims that users see per-venue confidence numbers.
  - [ ] Current branch evidence shows PRD FR2/FR7/FR12 and UX §Public Confidence Removal Contract already state the new contract. Do not add duplicate supersession notes where the text is already corrected.
  - [ ] Amend only stale forward-looking inventory/coverage/addendum lines that still require visible/screen-reader confidence. Use the explicit supersession wording from the AC where needed.
  - [ ] Leave historical Epic 1-11 story text and old completed-story records intact. They are history, not live product requirements.

- [ ] **Task 7 - Prove absence, retention, accessibility, and visual stability** (AC: all; Design Gate)
  - [ ] Add/update component tests for card/list, QuickInfo, detail, and RouteOverlay: no visible or sr-only confidence number; amber sun-exposure percentage retained; grey/not-sunny surfaces percentage-free; uncertainty/weather copy retained.
  - [ ] Add/update E2E tests that previously expected confidence: Epic 10 weather matrix, visit loop/route handoff, map/list/favourites surfaces as needed. Tests must not call live Met.no or production Supabase.
  - [ ] Run `npx tsc --noEmit`, `npx eslint . --quiet`, `npx vitest run`, and full or story-relevant Playwright projects. Because this story touches accessibility and public UI, include `--project=a11y` and `--project=a11y-mobile` evidence or a clear reason if a project is outside scope.
  - [ ] Run visual validation or produce human-reviewed candidates for affected screen IDs: `map-panel-venues` mobile, `map-with-selected-venue` mobile, `favourites-tab` mobile+desktop, `venue-detail` mobile+desktop, and `map-primary` desktop. Include `venue-detail-obscured` variants if sr-only/detail changes or test coverage shows the obscured detail path differs. Do not invent a route-overlay screen ID; cover RouteOverlay via component/E2E unless the route map is formally extended.
  - [ ] If references change, update `nextjs-app/docs/design/references/REBASELINE-LOG.md` in the same operation and require explicit human approval for manual visual validation/rebaseline when the legacy provider is unavailable. Never replace a reference solely to make a wrong implementation pass.
  - [ ] Transition through `.\scripts\run-sh.ps1 scripts/story-review.sh 12-13-remove-the-user-facing-confidence-indicator-keep-it-internal` only after functional, a11y, visual, and doc gates are satisfied. Do not edit `sprint-status.yaml` directly to force review.

## Dev Notes

### Binding Contract Summary

- The public product no longer shows model confidence as a visible, `aria-label`, sr-only,
  live-region, route-overlay, or card-name number.
- The amber `N% sol` value is not confidence. It remains the seating-share percentage only
  on public-sunny surfaces.
- Story 12.6's grey state remains percentage-free and carries weather truth through the
  grey pin/cloud/sky/uncertainty surfaces, not through confidence.
- Internal confidence remains in server-side diagnostics, coverage caps, uncertainty
  derivation, logs, and maintainer tooling. Do not delete the model.

### Current Implementation Facts

- `VenueList.tsx` imports `getConfidenceDisplayState`, builds non-obscured card aria via
  `cardAria` with `{confidence}`, passes `confidencePercent`, `confidenceMeta`, and
  `showVisibleConfidence` into `VenueCard`.
- `VenueCard.tsx` imports `getConfidenceDisplayState`, accepts `confidencePercent`,
  `confidenceMeta`, and `showVisibleConfidence`, and renders a visible confidence chip for
  sunny cards when `confidenceDisplay.visibleText` is present.
- `VenueQuickInfo.tsx` already removed the visible Story 11.4 confidence chip, but still
  renders sr-only `confidenceDisplay.accessibleText` before distance.
- `VenueDetailContent.tsx` already removed visible confidence text, but still renders
  sr-only `confidenceDisplay.accessibleText` in the header metadata row.
- `MapView.tsx` imports `getConfidenceDisplayState`, passes confidence props to list/detail/
  QuickInfo surfaces, and builds route overlay labels with `routeConfidenceLabel`.
- `RouteOverlay.tsx` types and renders `labels.confidence`; both visible and sr-only forms
  can include confidence text. This must become uncertainty-only.
- `messages/sv/venue.json` and `messages/en/venue.json` still contain `quickInfo.confidence*`,
  `route.confidence*`, `list.confidence*`, `detail.confidence*`, and `list.cardAria` still
  interpolates `{confidence}`.
- `removed-i18n-keys.test.ts` currently pins `quickInfo.confidence*` as kept because Story
  11.4 preserved sr-only confidence. Story 12.13 supersedes that.
- `lib/types/api.ts` currently exposes `VenueDataDto.confidence` publicly, and feedback
  types still include `confidenceAtPrediction`. `feedback-session.ts` and `FeedbackFlow.tsx`
  currently read client `venue.confidence` for feedback evidence.
- Server-side `venue-store.ts`, `sun-geometry-repository.ts`, `sun-engine.ts`, fixture data,
  feedback persistence, and confidence-calculator tests use confidence internally. Do not
  remove these blindly.

### Retro Carry-Ins From Earlier Epic 12 Stories

- From Story 12.6: fail-closed weather provenance and the shared public predicate prevent
  comparator/card/pin/ARIA drift. Confidence must not re-enter that predicate or masquerade
  as sun exposure.
- From Story 12.6: a11y-mobile was previously vacuous; this story touches accessibility
  output, so include executable `a11y-mobile` evidence rather than relying only on desktop
  axe or text scans.
- From Story 12.6: the legacy visual validator is credential-gated on this host. Manual
  visual acceptance/rebaseline is allowed only with explicit human approval and a logged
  rationale.
- From Story 12.7: visibility schema drift was resolved through a canonical shared resolver.
  This story should not add any new live-venue identity or visibility checks while touching
  feedback/DTO seams.
- From Story 12.3: persisted geometry rows are geometry-only and contain no confidence,
  weather, sky, public verdict, or label. Do not add confidence to persisted geometry or
  derive public presentation from persisted artifacts.

### Deferred-Work Fold-Ins

- The Epic 10 deferred item about cloud confidence being hidden by the coverage cap is now
  mostly superseded from a public-number perspective: users will not see confidence after
  this story. Do not "fix" the cap here; Story 12.2 owns the remaining cap/uncertainty
  coupling because uncertainty labels can still be confidence-derived.
- The deferred `quickInfo.obscuredPosition` / `detail.obscuredPosition` i18n keys overlap
  only if the same i18n cleanup/removed-key guard is being edited. Remove them only with a
  reader scan; otherwise leave them deferred.
- The deferred obscured thumbnail `"SOL"` wording is sun-exposure copy, not confidence. Do
  not remove amber sun-exposure or `solläge` content under this story unless it directly
  violates the no-confidence/no-grey-percentage contract already owned by Story 12.6.

### API / DTO Guidance

- Architecture `E12-AD-12` requires controlled contract evolution through DTO/types/tests.
  If public `confidence` is removed from `VenueDataDto`, update all serializers, fixtures,
  mocks, route types, hooks, and tests in one change.
- If public `confidence` is temporarily retained for feedback compatibility, add a comment
  and test guard proving UI/a11y does not read it. Treat it as transition data to be retired
  when Story 12.2 feedback evidence fields land.
- Do not remove internal `confidence` from `StoredVenue`, Supabase row mapping, fixture rows,
  `sun-engine`, `sun-geometry-repository`, `venue-planner`, `venue-feedback-persistence`, or
  maintainer accuracy types unless the internal replacement is explicit and tested.

### Visual Source Reconciliation

- The visual outcome after this story should look like the current Story 12.6-approved UI
  minus confidence chips/text. It should not move cards, QuickInfo, detail panels, map pins,
  route buttons, or bottom-sheet chrome beyond natural reflow from removing the card chip.
- Do not copy prototype inline CSS or use raw colours/spacing. Use existing tokens from
  `DESIGN.md`.
- Current Story 12.6 rebaseline in `REBASELINE-LOG.md` explicitly lists Story 12.13 as a
  re-evaluation trigger. Any reference PNG replacement must log source, screen IDs, viewports,
  route/state assertions, and human blessing status.

### Testing Requirements

- Required local baseline/gates from `nextjs-app/`:
  - `npx tsc --noEmit`
  - `npx eslint . --quiet`
  - `npx vitest run`
  - `npx playwright test` or the full relevant project matrix when public UI, route handoff,
    a11y, or E2E assertions change.
- Include component and source/i18n scans proving no visible/screen-reader confidence number
  survives in card, list aria, QuickInfo, detail, route overlay, both locales, or route handoff.
- Include positive assertions that uncertainty/weather copy remains. A no-confidence test that
  also deletes `Osäker prognos`, `Väder saknas`, `Sol bakom moln`, or sky copy is a false pass.
- Use deterministic fixtures/mocks only. No live Met.no, Google Places, production Supabase, or
  protected service dependencies in repeatable tests.
- Visual validation is required for affected references. On Windows/PowerShell, use the repo
  wrapper, for example:
  `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-panel-venues '/?_state=map-panel-venues&_time=14:00' mobile`

### Out Of Scope

- Do not implement Story 12.2 feedback accuracy aggregation, coverage-cap cleanup, or
  uncertainty-tier decoupling beyond keeping current uncertainty copy intact.
- Do not implement Story 12.8 About page copy; only leave the prerequisite by making confidence
  absent from live UI.
- Do not implement Story 12.12 photo contract, Story 12.9 sheet model, Story 12.10 prefetch, or
  Story 12.14 availability filtering.
- Do not remove internal confidence-calculator, shadow-data coverage caps, server diagnostics,
  or maintainer-only fields merely because their name includes "confidence".

### Project Structure Notes

- Repository root is `C:\Users\Rasmus\sunnyseat`; the Next.js app root is `nextjs-app/`.
  Run all `npm`/`npx` commands from `nextjs-app/`.
- Client components must not import server-only Supabase, solar, weather, middleware, or
  building modules. This story should stay within existing public DTO/hooks/component seams.
- Preserve component layering: `components/custom` may use `components/composed`, which may use
  `components/ui`; do not reverse dependencies.
- Swedish is the default user-facing language. Remove stale keys symmetrically from Swedish and
  English, and keep `messages-parity.test.ts` green.

### Anticipated Files Impacted

- UI components: `nextjs-app/components/custom/venue/VenueList.tsx`,
  `nextjs-app/components/composed/venue/VenueCard.tsx`,
  `nextjs-app/components/composed/venue/VenueQuickInfo.tsx`,
  `nextjs-app/components/composed/venue/VenueDetailContent.tsx`,
  `nextjs-app/components/custom/map/MapView.tsx`, and
  `nextjs-app/components/custom/routing/RouteOverlay.tsx`.
- Public copy/i18n and guards: `nextjs-app/messages/sv/venue.json`,
  `nextjs-app/messages/en/venue.json`, `removed-i18n-keys.test.ts`, and
  `messages-parity.test.ts` or the nearest existing i18n guard files.
- Display-only confidence plumbing: `nextjs-app/lib/utils/confidence-display.ts` and
  `nextjs-app/test/unit/confidence-display.test.ts` if all UI readers are removed.
- Public DTO/feedback seam, if retiring the public field now:
  `nextjs-app/lib/types/api.ts`, API serializers/fixtures, hooks/tests,
  `nextjs-app/lib/services/feedback-session.ts`, and
  `nextjs-app/components/custom/feedback/FeedbackFlow.tsx`.
- Tests likely affected: `VenueCard.test.tsx`, `VenueList.test.tsx`,
  `VenueQuickInfo.test.tsx`, `VenueDetailContent.test.tsx`,
  `RouteOverlay.test.tsx`, `epic-10-weather-matrix.spec.ts`, and
  `visit-loop.spec.ts`.
- Planning/reference docs: only stale forward-looking confidence promises in PRD/UX/QA
  artifacts and, if reference images change, `nextjs-app/docs/design/references/REBASELINE-LOG.md`.

### References

- [Source: `AGENTS.md` - repo rules, BMAD workflow, design/token/a11y/API-boundary requirements]
- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 12.13]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR2, FR7, FR12, NFR34]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - Public Confidence Removal Contract, Accessibility Floor, list/QuickInfo/detail specs]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - E12-AD-12 and Public DTO/API Delta]
- [Source: `_bmad-output/qa/epic-12-test-design-2026-07-12.md` - R-011/R-019/R-010 and Story 12.13 test expectations]
- [Source: `project-context.md` - Epic 12 invariants and Screen ID -> Route Map]
- [Source: `nextjs-app/docs/design/DESIGN.md` - tokens and two-state pin/card design rules]
- [Source: `nextjs-app/docs/design/references/REBASELINE-LOG.md` - Story 12.6 rebaseline and Story 12.13 re-evaluation trigger]
- [Source: `_bmad-output/auto-bmad/retro-notes/epic-12.md` - Story 12.3/12.6/12.7 carry-ins]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` - overlapping confidence/uncertainty/i18n deferrals]
- [Source: `nextjs-app/components/custom/venue/VenueList.tsx` - current card aria confidence path]
- [Source: `nextjs-app/components/composed/venue/VenueCard.tsx` - current visible confidence chip path]
- [Source: `nextjs-app/components/composed/venue/VenueQuickInfo.tsx` - current sr-only confidence path]
- [Source: `nextjs-app/components/composed/venue/VenueDetailContent.tsx` - current sr-only detail confidence path]
- [Source: `nextjs-app/components/custom/map/MapView.tsx` - current route overlay labels and confidence prop chain]
- [Source: `nextjs-app/components/custom/routing/RouteOverlay.tsx` - current confidence row rendering]
- [Source: `nextjs-app/lib/utils/confidence-display.ts` - display-only confidence utility]
- [Source: `nextjs-app/lib/types/api.ts`, `nextjs-app/lib/services/feedback-session.ts`, `nextjs-app/components/custom/feedback/FeedbackFlow.tsx` - public DTO / feedback confidence coupling]

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

### Completion Notes List

### File List
