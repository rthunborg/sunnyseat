# Story 9.2: Design-System CTA Token Fix + Copy Correction

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want all primary buttons to use the current gold→amber design, not a legacy olive fill,
so that the app looks consistent and current.

## Acceptance Criteria

_(Verbatim from epics.md §"Story 9.2"; the parenthetical clarifications in AC1 — the exact ramp values + the 5.8:1 contrast figure — are dev guardrails, not changes to the criterion.)_

1. **Given** `--gradient-route-button` in `nextjs-app/app/globals.css` currently ramps olive→gold, **When** the token is corrected to the canonical gold→bright-amber ramp (matching `--gradient-cta-amber` / the reference), **Then** all three consumers — `RouteButton.tsx` ("VISA RUTT"), `AboutPage.tsx` ("Tillbaka till kartan", mobile + desktop), and `NotFoundPage.tsx` (404 CTA) — render the corrected gradient with their existing shadow tokens intact, and the `amber-cta-text` foreground still meets contrast on the brighter end stop.
   _(Dev guardrail: corrected ramp = `var(--color-amber-gold) #d4af37 0% → var(--color-amber-primary) #ffbf00 100%`. Existing shadow token = `shadow-route-button`. Contrast on the brighter end stop: `amber-cta-text #554300` on `amber-primary #ffbf00` = **5.8:1**, passes AA and improves on today; never below 4.5:1.)_

2. **Given** the Swedish filter-chip label, **When** `messages/sv/common.json` is corrected, **Then** the `nav.filterChips.rooftop` value changes from "Takt" to "Takterrass" (EN stays "Rooftop") and the duplicated fixture string in `test/components/DesktopNavBar.test.tsx` is updated to match.

3. **Given** the mobile smoke test found other amber-gradient surfaces that read as gold/olive (the venue-detail sun-% badge and the "ÖPPET" status badge), not just the three known CTAs, **When** the token fix lands, **Then** every amber-gradient surface is audited against the canonical ramp — any still using the legacy olive `--color-amber-dark` start is corrected, and surfaces already on the correct ramp are confirmed unchanged.

> **Supporting requirement (not a separate AC):** `docs/design/DESIGN.md` is the canonical design-token source of truth and currently DOCUMENTS the legacy olive ramp (gradient table row line ~75 = `linear-gradient(169deg, #735c00 0%, #d4af37 100%)`; recipe heading line ~397 = "Route Button (gold-to-dark gradient)"). The token fix in AC1 is incomplete unless DESIGN.md is updated in the same change to describe the corrected gold→bright-amber ramp — otherwise the source-of-truth doc still describes the bug. Handled in Task 5.

### Design Gate Criteria (frontend story — all four are blocking)

- **Visual:** The corrected CTAs (VISA RUTT route button, About "Tillbaka till kartan", 404 CTA) match the reference button styling — a gold→bright-amber ramp with **no olive start stop anywhere**. The existing pill shape, padding, icon/label layout, and `shadow-route-button` drop-shadow are unchanged; only the gradient stops shift.
- **Behaviour:** Buttons keep their existing actions and hover/active/focus/disabled states (RouteButton opens native maps; AboutPage/NotFoundPage CTAs navigate back to the map; all keep `hover:opacity-90` / `focus-visible:ring` / `disabled:opacity-*`).
- **Animation:** Existing button transitions unchanged (`transition-opacity duration-default ease-default`, `motion-reduce:transition-none`).
- **Visual validation:** Screenshot comparison of the route CTA + About CTA against references passes before QA handoff (see Dev Notes "Visual gate — exact commands"). Because this is a token-value change the references should already match the canonical design intent; if a reference PNG itself depicts the OLD olive button, that is a maintainer re-baseline hand-off (the gate script forbids the dev agent from editing references) — surface it in Completion Notes, do not force a pass.

## Tasks / Subtasks

- [ ] **Task 1 — Correct the `--gradient-route-button` token (AC: #1)**
  - [ ] In `nextjs-app/app/globals.css` (line ~152), change `--gradient-route-button` from `linear-gradient(169deg, var(--color-amber-dark) 0%, var(--color-amber-gold) 100%)` to the canonical gold→bright-amber ramp matching `--gradient-cta-amber` (line 153 = `linear-gradient(171deg, var(--color-amber-gold) 0%, var(--color-amber-primary) 100%)`). Use the named tokens (`var(--color-amber-gold)` → `var(--color-amber-primary)`); do NOT introduce raw hex. Keep the existing `169deg` angle (or align to `171deg` if the reference shows the route button matching the CTA exactly — note the chosen angle in Completion Notes).
  - [ ] Do NOT touch the `@utility gradient-route-button` block (line 191-193) — it already reads `var(--gradient-route-button)`; correcting the variable is sufficient.
  - [ ] Confirm `--color-amber-dark` (#735c00) is still referenced elsewhere (`--gradient-onboarding` line 148, the map-overlay decorative stripe line 219, the `DESIGN.md` functional-amber-text token) so do NOT delete the color token — only stop the route-button gradient from STARTING on it.

- [ ] **Task 2 — Verify the three CTA consumers inherit the fix without code changes (AC: #1)**
  - [ ] `components/composed/routing/RouteButton.tsx:39` — uses the `gradient-route-button` utility class. NO change to the `.tsx` needed; the corrected token flows through. Verify the rendered VISA RUTT button shows gold→bright-amber.
  - [ ] `components/custom/about/AboutPage.tsx:18` (`CTA_LINK_CLASSNAME`) — uses `gradient-route-button` (the "Tillbaka till kartan" back-to-map CTA, mobile + desktop). NO `.tsx` change needed; verify visually.
  - [ ] `components/custom/NotFoundPage.tsx:15` (`CTA_CLASSNAME`) — uses `gradient-route-button` (the 404 CTA). NO `.tsx` change needed; verify visually.
  - [ ] Confirm each keeps `shadow-route-button` + `text-amber-cta-text` (they all already do — leave the class strings intact).

- [ ] **Task 3 — Correct the Swedish rooftop filter-chip copy + its test fixture (AC: #2)**
  - [ ] `messages/sv/common.json:31` — change `"rooftop": "Takt"` → `"rooftop": "Takterrass"`. Leave `messages/en/common.json:31` (`"Rooftop"`) UNCHANGED.
  - [ ] `test/components/DesktopNavBar.test.tsx:105` — change the duplicated inline fixture `rooftop: 'Takt',` → `rooftop: 'Takterrass',` so the test mock matches the corrected source string.
  - [ ] Run `test/unit/messages-parity.test.ts` — sv/en stay key-for-key identical (this change is value-only, so parity is preserved). No other locale or key changes.

- [ ] **Task 4 — Audit ALL amber-gradient surfaces against the canonical ramp (AC: #3)**
  - [ ] Grep for every gradient/amber consumer: `gradient-route-button`, `gradient-cta-amber`, `--color-amber-dark`, `bg-amber-gold`, `bg-amber-primary`, plus the `@theme` `--gradient-*` definitions in `globals.css`. The CTA token (Task 1) is the only gradient on the legacy olive START — confirm by inspection.
  - [ ] For the two surfaces the mobile smoke-test flagged ("read as gold/olive"): the **venue-detail sun-% badge** (`VenueDetailContent.tsx:343` = `bg-amber-gold/90`) and the **"ÖPPET" status badge** (`VenueDetailContent.tsx:115` = `bg-amber-primary`) — verify these are FLAT amber tokens (`bg-amber-gold/90` and `bg-amber-primary`), NOT the legacy gradient. They are already correct (a flat amber-gold or amber-primary fill, no olive start); they only "read as gold" because amber-gold IS gold. CONFIRM UNCHANGED — do NOT restyle them (that would be scope creep and risks regressing references). Also confirm the QuickInfo sun-% badge (`VenueQuickInfo.tsx:343` = `bg-amber-gold/90`) and the QuickInfo placeholder hero (`VenueQuickInfo.tsx:289` = `gradient-cta-amber` — already canonical).
  - [ ] `--gradient-onboarding` (line 148) legitimately ends on `--color-amber-dark` as a warm-orange→gold→dark sunset ramp — that is the intended onboarding decorative, NOT a CTA; leave it. Same for the `--gradient-timeline-bar` (amber-primary→amber-gold, line 155) and `--gradient-wordmark-sun` — confirm and leave unchanged.
  - [ ] Record the audit result in Completion Notes: which surfaces were on the legacy olive ramp (expected: only `gradient-route-button`), which are already on the canonical ramp (`gradient-cta-amber` consumers), and which are flat fills (the badges) — confirming surfaces already correct are unchanged.

- [ ] **Task 5 — Update the canonical design doc (AC: #1 supporting requirement — DESIGN.md sync)**
  - [ ] `docs/design/DESIGN.md` line ~75: the gradient table row `| gradient-route-button | linear-gradient(169deg, #735c00 0%, #d4af37 100%) | "Visa Rutt" primary route button |` — update the gradient value to the corrected gold→bright-amber stops (`#d4af37 0%, #ffbf00 100%`, keeping the chosen angle from Task 1).
  - [ ] `docs/design/DESIGN.md` line ~397: the recipe heading "### Route Button (gold-to-dark gradient)" + its `Background: gradient-route-button` block — rename/clarify so it no longer says "gold-to-dark" (it is now gold-to-bright-amber, the same family as the CTA button). Adjust the prose accordingly.
  - [ ] Do NOT change the `gradient-cta-amber` row (line 76) — it is already canonical and the reference for the fix.

- [ ] **Task 6 — Visual gate + regression verification (AC: Design Gate, all)**
  - [ ] Run typecheck + lint + unit tests from `nextjs-app/`: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx vitest run`. The `DesktopNavBar.test.tsx` assertion (Task 3) and `messages-parity.test.ts` must be green.
  - [ ] Run the visual gate for the CTA-bearing screens (dev server running, `ANTHROPIC_API_KEY` set) — see Dev Notes "Visual gate — exact commands". The corrected CTAs (route button on map-with-selected-venue / about / not-found) must read gold→bright-amber with no olive.
  - [ ] If a reference PNG depicts the OLD olive button (i.e. the gate fails because the reference is stale, not the implementation), STOP and flag for maintainer re-baseline sign-off in Completion Notes — do NOT edit the reference or the gate. If the reference already shows the canonical button, the gate should PASS as-is.
  - [ ] No new test files are required (this is a token + copy change). Behaviour/regression coverage for the broader Epic-9 set lands in Story 9.10.

## Dev Notes

### Why this exists (root cause)
Spine 1 of the Epic 9 party-mode live-app triage: **"one wrong CTA gradient token."** `nextjs-app/app/globals.css` defines `--gradient-route-button` as an olive→gold ramp (`--color-amber-dark #735c00 0% → --color-amber-gold #d4af37 100%`), while the canonical reference and the already-correct sibling token `--gradient-cta-amber` (`#d4af37 → #ffbf00`) ramp the opposite way (gold→bright amber). Every "legacy" gold/olive primary button (VISA RUTT, "Tillbaka till kartan", the 404 CTA) inherits this one bad token. The fix is essentially a **one-line token-value change** plus the copy correction and the audit/doc updates — the three button components need NO code edits because they all consume the `gradient-route-button` utility, which references the variable. This is a token-correctness story, NOT a redesign — keep everything else pixel-faithful.

### The exact fix (file → what)
All paths under `nextjs-app/`. Line numbers are at the time of writing — confirm by reading the file first.

| File | Line | Change |
|---|---|---|
| `app/globals.css` | ~152 | `--gradient-route-button`: swap stops to `var(--color-amber-gold) 0%, var(--color-amber-primary) 100%` (matching `--gradient-cta-amber` line 153). Keep named tokens; no raw hex. |
| `messages/sv/common.json` | 31 | `"rooftop": "Takt"` → `"rooftop": "Takterrass"` (EN unchanged). |
| `test/components/DesktopNavBar.test.tsx` | 105 | `rooftop: 'Takt',` → `rooftop: 'Takterrass',` (fixture mirrors the source string). |
| `docs/design/DESIGN.md` | ~75, ~397 | Gradient table row + "Route Button" recipe heading: describe the corrected gold→bright-amber ramp (no "gold-to-dark"). |

**Consumers that inherit the fix with NO code change** (verify visually only):
- `components/composed/routing/RouteButton.tsx:39` (`gradient-route-button` utility) — VISA RUTT.
- `components/custom/about/AboutPage.tsx:18` (`CTA_LINK_CLASSNAME`, `gradient-route-button`) — "Tillbaka till kartan", mobile + desktop.
- `components/custom/NotFoundPage.tsx:15` (`CTA_CLASSNAME`, `gradient-route-button`) — 404 CTA.

### File impact (expected)
**Modified (source/content/doc):**
- `nextjs-app/app/globals.css` — `--gradient-route-button` stops (Task 1).
- `nextjs-app/messages/sv/common.json` — `nav.filterChips.rooftop` "Takt" → "Takterrass" (Task 3).
- `nextjs-app/docs/design/DESIGN.md` — gradient table row + Route Button recipe heading (Task 5).

**Modified (test):**
- `nextjs-app/test/components/DesktopNavBar.test.tsx` — `rooftop: 'Takt'` fixture → "Takterrass" (Task 3).

**NOT modified (verify visually / audit-confirm only — no code edit):**
- `RouteButton.tsx`, `AboutPage.tsx`, `NotFoundPage.tsx` — they consume the `gradient-route-button` utility and inherit the corrected token automatically.
- `messages/en/common.json` — EN "Rooftop" is already correct.
- `AmberCTAButton.tsx` + other `gradient-cta-amber` consumers — already canonical.
- `VenueDetailContent.tsx` / `VenueQuickInfo.tsx` badges (`bg-amber-gold/90`, `bg-amber-primary`) — flat fills, audit-confirm unchanged (AC #3).
- The `--color-amber-dark` color token + `--gradient-onboarding` / `--gradient-timeline-bar` / `--gradient-wordmark-sun` / `--gradient-map-overlay` — legitimate non-CTA uses, left unchanged.

**No new files** — this is a token + copy + doc change; no new components, hooks, tests, or config.

### Token reference (read before editing)
From `globals.css` `@theme` (lines 26-35) and the gradient block (lines 148-156):
```
--color-amber-primary: #ffbf00;   /* bright amber — fill/CTA */
--color-amber-gold:    #d4af37;   /* gold — gradient mid/start */
--color-amber-dark:    #735c00;   /* OLIVE — functional text + onboarding-bottom, NOT a CTA start */
--color-amber-cta-text:#554300;   /* CTA label text */

--gradient-route-button: linear-gradient(169deg, var(--color-amber-dark) 0%, var(--color-amber-gold) 100%);  /* ← BROKEN: olive start */
--gradient-cta-amber:    linear-gradient(171deg, var(--color-amber-gold) 0%, var(--color-amber-primary) 100%); /* ← CANONICAL: copy this ramp */
```
The corrected `--gradient-route-button` should ramp `var(--color-amber-gold) → var(--color-amber-primary)` (gold → bright amber), the same color family as `--gradient-cta-amber`.

### Contrast — the AC #1 brighter-end-stop check (do this, it is an AC)
`amber-cta-text #554300` is the CTA label color. WCAG AA contrast on the corrected ramp's stops (computed):
- on **amber-primary #ffbf00** (the corrected bright end stop) = **5.8:1** → PASSES AA (≥4.5:1) — and is BETTER than the legacy olive start.
- on **amber-gold #d4af37** (the shared mid stop) = **4.56:1** → just PASSES AA.
- on the legacy **amber-dark #735c00** olive start = **1.49:1** → would FAIL (this is part of why the legacy ramp was wrong).

So correcting the ramp IMPROVES the contrast at the relevant (brighter) stop — AC #1's "still meets contrast on the brighter end stop" is satisfied (5.8:1). The dev should re-state this in Completion Notes (cite the 5.8:1 figure) rather than re-deriving silently.

### Scope discipline — what is OUT of scope (do NOT expand)
- **Do NOT touch the separate venue-card amber-contrast debt (Story 5.1).** The venue-card decorative sun-% label uses `text-amber-text` (#fbbc00 ≈ 1.63:1 on cream) — a SERIOUS WCAG color-contrast debt deferred to **Story 5.1**, surfaced by the Playwright a11y gate (red at HEAD, independent of any Epic-9 work; about/privacy footer ≈3.13:1 folds into the same 5.1 pass). That is a DIFFERENT token (`amber-text`), a DIFFERENT surface (venue-card label on cream), and a DIFFERENT story. This story's `amber-cta-text` (#554300) on the CTA gradient is unrelated and already passes (5.8:1). The CTA token change does NOT affect the venue-card label contrast — confirm you are not accidentally widening into 5.1's surface.
- **Do NOT restyle the sun-% badge or the ÖPPET badge.** AC #3 is an AUDIT (confirm they are flat amber-gold/amber-primary fills, already correct), not a re-skin. Changing their fill would risk regressing the `venue-detail` / `map-with-selected-venue` visual references that Story 9.1 is already mid-re-baseline on.
- This story does NOT touch: the sun-compute path (9.3/9.4), location/onboarding (9.5), map chrome (9.6), tags (9.7), sharing (9.8), the QuickInfo card rework (9.9), or any non-CTA gradient (onboarding, timeline-bar, wordmark-sun, map-overlay — all confirmed-and-left).
- Do NOT delete `--color-amber-dark` — it is still used by `--gradient-onboarding`, the map-overlay decorative stripe, and the functional-amber-text token. Only stop the route-button gradient from starting on it.

### Test gate (project is past all transitional phases — standard gate)
Before marking the story `review`, the canonical checks must pass (run from `nextjs-app/`, per AGENTS.md §"Testing Requirements"):
- Typecheck: `cd nextjs-app && npx tsc --noEmit` (expect 0 errors)
- Lint: `cd nextjs-app && npx eslint . --quiet` (0 errors; 6 pre-existing warnings in untouched code are tolerated, do not "fix" them)
- Unit/component tests: `cd nextjs-app && npx vitest run` (expect 83 files / 693 tests green — count unchanged by this story; the `DesktopNavBar.test.tsx` rooftop assertion + `messages-parity.test.ts` must be green)
- E2E: `cd nextjs-app && npx playwright test` — NOT required by `story-review.sh` (the canonical gate runs lint/tsc/unit + the visual gate, not Playwright). The two pre-existing `map-primary.spec.ts` failures (planner/time-slider chrome) are out of scope (Story 9.9 / 9.0). Do not gate on e2e here.
- The story is moved to `review` via `scripts/story-review.sh 9-2` (Windows: `.\scripts\run-sh.ps1 scripts/story-review.sh 9-2`) — NOT by editing sprint-status directly (AGENTS.md §"BMAD Story Workflow").

### Visual gate — exact commands (the gate is an LLM eyeball, not a pixel diff)
The "Visual validation" criterion is produced by `.claude/scripts/visual-validate.sh`, which screenshots the running dev server and asks `claude-sonnet-4-6` for a PASS/FAIL against the reference PNG. It is lenient on spacing/sizing but BLOCKS on gross layout/colour/missing-element differences (MEMORY: "visual gate is an LLM eyeball" — it can miss width/proportion regressions but should catch a colour-ramp change). With the dev server running (`cd nextjs-app && npm run dev`) and `ANTHROPIC_API_KEY` set, the CTA-bearing screens are:
```bash
# Route CTA (VISA RUTT) appears on the selected-venue map state:
.claude/scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00" mobile
# About CTA ("Tillbaka till kartan") — mobile + desktop:
.claude/scripts/visual-validate.sh about "/about" mobile
.claude/scripts/visual-validate.sh about "/about" desktop
# 404 CTA:
.claude/scripts/visual-validate.sh not-found "/__sunnyseat-invalid" mobile
.claude/scripts/visual-validate.sh not-found "/__sunnyseat-invalid" desktop
```
On Windows/PowerShell, invoke through `.\scripts\run-sh.ps1 scripts/visual-validate.sh <screen-id> <route> [mobile|desktop]` per AGENTS.md. Routes/viewports come from the Screen ID → Route Map in `project-context.md` (the gate reads it). The dev-seeded slug `test-venue-sunny` must exist in the dev DB. **Do NOT edit `visual-validate.sh` or the prompt to force a pass — fix the implementation.** Note the `?_time=14:00` on the map route is the Story 9.0-gated dev-forcing param; it stays active because the gate runs against `next dev` (development), not a production build (see retro-notes constraint below). The `about`/`not-found` routes do not need `_time`.

### Project Structure Notes
- Design tokens are binding (AGENTS.md §"Design Tokens"): use Tailwind v4 `@theme` utilities + project tokens only; no raw hex/ad-hoc pixels/custom shadows/arbitrary colors. This story corrects a token VALUE using named color tokens — fully within the system. `docs/design/DESIGN.md` is the canonical token doc and must be kept in sync (Task 5).
- The gradient utilities live in `globals.css` as `@utility` blocks (cannot go in `@theme`); the color + gradient variables live in `@theme`. Components reference the utility class (`gradient-route-button`), never inline gradient CSS.
- Swedish is the source/default user-facing language (AGENTS.md §"Swedish Copy"); en mirrors sv key-for-key (enforced by `test/unit/messages-parity.test.ts`). The rooftop chip copy fix is sv-only because the EN value ("Rooftop") is already correct.
- Three-layer component architecture: `components/custom/` → `components/composed/` → `components/ui/`. RouteButton is composed; AboutPage/NotFoundPage are custom. No layering change here.

### Constraints carried in from Epic 9 retro-notes (`_bmad-output/auto-bmad/retro-notes/epic-9.md`)
- **Story 9.0 convention (ratified):** the `_time`/`_date` planner-forcing params are now production-gated but remain active under `next dev`. The visual-gate route `?_time=14:00` (route CTA) works because the gate runs against the dev server — do NOT "fix" it by dropping `_time`.
- **Story 9.1 learning — REMOVAL/CHANGE stories can invert the visual gate:** if a reference PNG predates the change, a correct implementation FAILS the LLM visual gate until the reference is re-baselined; the gate routes that to maintainer sign-off (the dev agent is FORBIDDEN from editing references). For 9.2 this is LESS likely (a token-value change should already match the canonical references), but be alert: if the route/about/404 reference PNG depicts the OLD olive button, flag it for re-baseline rather than forcing a pass. Story 9.1 already left `venue-detail` mobile+desktop refs needing re-baseline — that is 9.1's hand-off, not 9.2's; do not conflate.
- The sun-engine double-RPC / "one buildings fetch reused" comment and the time→query debounce belong to Stories 9.3/9.4 — out of scope here.

### Deferred-work ledger check (`_bmad-output/implementation-artifacts/deferred-work.md`)
- **Active overlap — pre-existing WCAG color-contrast debt** *(Target: Story 5.1 — Golden Pin & Partner Visual Enhancement)*: the venue-card `text-amber-text` (#fbbc00 ≈ 1.63:1 on cream) sun-% label + the about/privacy footer wordmark (≈3.13:1) are a SERIOUS contrast debt explicitly targeted at Story 5.1, surfaced by the Playwright a11y gate (axe-core, red at HEAD). **This is NOT 9.2's scope.** 9.2's AC #1 contrast check is about a DIFFERENT token (`amber-cta-text` #554300) on the CTA gradient (5.8:1 — passes). The CTA token change does not touch the venue-card label or the footer wordmark, so it cannot affect that debt. Do NOT absorb the 5.1 contrast fix; just verify your CTA change leaves the brighter-end-stop contrast ≥AA (it does: 5.8:1).
- No other ledger entry overlaps this story's files/area (the `AmberCTAButton` extraction was carried into Story 3.2 long ago; `gradient-cta-amber` consumers are already canonical and untouched here).

### Persistent facts (epic-wide / earlier-story conventions)
- The app is LIVE on the real data path since the 2026-06-29 production cutover — but this story is purely a token + copy + doc change with no data/engine impact, so the data path is irrelevant beyond running the dev server for the visual gate.
- `--gradient-cta-amber` (and its `AmberCTAButton` / QuickInfo-placeholder consumers) is the CANONICAL ramp and the reference for the fix — leave it untouched.
- Baseline before this story (from Story 9.1 dev record): vitest 83 files / 693 tests, tsc 0, eslint 0 errors (6 pre-existing warnings in untouched code). This story should change test COUNT by 0 (a fixture-string edit, not a new test) and keep tsc/eslint clean. Two pre-existing `map-primary.spec.ts` e2e failures (planner/time-slider chrome) are out of scope (Story 9.9 / 9.0 territory) — do not attempt to fix them.
- Swedish is the source/default locale; en mirrors it key-for-key (messages-parity gate).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.2: Design-System CTA Token Fix + Copy Correction] — user story, 3 ACs, Design Gate Criteria.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9 (root-cause note, Spine 1)] — "one wrong CTA gradient token" rationale + the mobile-smoke-test "audit ALL amber surfaces" addendum.
- [Source: nextjs-app/app/globals.css (lines 26-35 colors, 148-156 gradients, 191-197 utilities)] — the token to correct + the canonical sibling + the color tokens to preserve.
- [Source: nextjs-app/components/composed/routing/RouteButton.tsx (line 39)] — VISA RUTT consumer (no code change; inherits the token).
- [Source: nextjs-app/components/custom/about/AboutPage.tsx (lines 14-18)] — "Tillbaka till kartan" CTA (`CTA_LINK_CLASSNAME`, no code change).
- [Source: nextjs-app/components/custom/NotFoundPage.tsx (lines 11-15)] — 404 CTA (`CTA_CLASSNAME`, no code change).
- [Source: nextjs-app/components/composed/shared/AmberCTAButton.tsx (line 7)] — `gradient-cta-amber` consumer, ALREADY canonical, must NOT change.
- [Source: nextjs-app/components/composed/venue/VenueDetailContent.tsx (line 115 ÖPPET badge `bg-amber-primary`, line 343 sun-% badge `bg-amber-gold/90`)] — flat-fill surfaces flagged by the smoke test; audit-confirm unchanged.
- [Source: nextjs-app/components/composed/venue/VenueQuickInfo.tsx (line 289 `gradient-cta-amber` placeholder, line 343 `bg-amber-gold/90` badge)] — already-correct surfaces; audit-confirm unchanged.
- [Source: nextjs-app/messages/sv/common.json (line 31) + nextjs-app/messages/en/common.json (line 31)] — `nav.filterChips.rooftop` (sv → "Takterrass"; en unchanged "Rooftop").
- [Source: nextjs-app/test/components/DesktopNavBar.test.tsx (line ~105)] — duplicated `rooftop: 'Takt'` fixture to update.
- [Source: nextjs-app/test/unit/messages-parity.test.ts] — sv/en key-parity gate (value-only change preserves parity).
- [Source: nextjs-app/docs/design/DESIGN.md (lines 27-36 color tokens, 75-76 gradient table, 386-407 button recipes)] — canonical token doc to keep in sync (Task 5).
- [Source: project-context.md (§Screen ID → Route Map, lines 161-189)] — visual-gate routes/viewports for map-with-selected-venue / about / not-found.
- [Source: .claude/scripts/visual-validate.sh + .claude/skills/visual-validation/SKILL.md] — visual gate mechanism + manual commands; dev agent must NOT edit references/gate.
- [Source: CLAUDE.md] — root project instructions (redirects to AGENTS.md as the canonical rulebook).
- [Source: AGENTS.md (§Design Tokens, §Visual Source Of Truth, §Swedish Copy, §Visual Validation, §Component Architecture)] — token + copy + visual-gate guardrails.
- [Source: _bmad-output/planning-artifacts/architecture.md] — frontend stack (Tailwind v4 CSS-first `@theme`, shadcn/ui); no story-specific architectural decision beyond "tokens are CSS-first in globals.css" — minimal direct relevance to a token-value change.
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX behaviour/animation spec; relevant only to confirm the Design Gate "Behaviour/Animation: unchanged" (no new interaction is introduced) — minimal direct relevance to a token-value change.
- [Source: _bmad-output/auto-bmad/retro-notes/epic-9.md] — Story 9.0 `_time` dev-forcing convention + Story 9.1 removal-story-inverts-the-visual-gate / forbidden-to-edit-references learning.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md (Story 7.3 PWA entry — color-contrast debt → Story 5.1)] — the separate venue-card/footer amber-contrast debt this story must NOT absorb.
- [Source: _bmad-output/implementation-artifacts/9-1-clean-app-content-sweep.md] — previous Epic 9 story; visual-gate command pattern, scope-discipline pattern, "ÖPPET status badge preserved" note.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

### Review Findings
