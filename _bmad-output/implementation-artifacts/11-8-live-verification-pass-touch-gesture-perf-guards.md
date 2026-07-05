# Story 11.8: Live Verification Pass, Touch-Gesture Coverage & Perf Regression Guards

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **maintainer**,
I want every Epic 11 fix verified on the live deployment and on a real device, with the interaction and performance wins locked in by tests,
So that the "shipped but insufficient" pattern of Epics 9/10 (caching + debounce landed, symptoms persisted) cannot repeat.

## Context & Root Cause

This is **the LAST story of Epic 11** — a **cross-story verification + regression-guard + live/device-protocol pass, NOT a feature.** Epic 11 was the post-Epic-10 field-test cleanup that made the LIVE app *feel* right: the time planner went from a ~9.6 s stall to an instant client-side day-series lookup (11.1), the slider became grabbable + range-constrained (11.2), mobile got first-class tag filtering + a proper 4-snap bottom sheet (11.3), and the quick-info / map / detail surfaces were aligned to the reference and made truthful (11.4/11.5/11.6). 11.7 paid three-epics-deferred build/config debt and staged the consolidated reference-PNG rebaseline. **Stories 11.1–11.7 are all `review`.** Story 11.8 closes three gaps and is the STANDING anti-"shipped-but-insufficient" gate the whole epic thesis rests on (test-design R-001, score 9 CRITICAL):

1. **The interaction + perf wins are proven at the SEAM, not yet PROMOTED to the standing epic gate.** Each earlier story left its e2e/touch spec as a "seam-provable subset" and explicitly deferred the *standing* request-count + marker-persistence + real-touch guards to **this story** (see the 11.1 ATDD checklist "11.1 ↔ 11.8 boundary" note and the 11.2 slider-touch-drag header "The STANDING request-count guard is owned by Story 11.8"). 11.8 OWNS promoting/keeping those invariants green in CI as the durable epic gate.
2. **The wall-clock perf number and the physical-device gesture pass CANNOT run in CI** — they are wall-clock / device / human-judgement bound. Earlier stories each deferred a piece piecemeal (11.1's Live-Perf Handoff, the physical-device checklist, the maintainer PNG blessing staged by 11.7). 11.8 **consolidates these into ONE clear post-merge verification protocol** rather than re-deferring them separately.
3. **The consolidated regression net must be verified green, not just assumed.** Most AC2 behaviours already have isolated unit/component/e2e coverage from stories 11.1–11.6 (see "What is ALREADY covered" below); 11.8 **verifies each is present + green, fills any enumerated gap, and confirms the CI wiring** so a future edit that regresses a fix trips the gate.

**This story has NO new UI of its own.** Its Design Gate (below) is a verification gate, not a screenshot-of-new-surface gate. Do NOT invent visual surface. Do NOT re-implement or re-touch any 11.1–11.7 feature code except to add/promote a regression test around it, wire an existing spec into CI, or fix a genuine defect this pass surfaces (log substantial reworks as follow-ups rather than expanding scope).

## Acceptance Criteria

_(Verbatim from `_bmad-output/planning-artifacts/epics.md` §"Story 11.8", lines 3007-3021. Given/When/Then wording is the maintainer's — do not paraphrase; the "at least" list in AC2 and the "wall-clock perf measured live, counts guarded in CI" split in AC3 are load-bearing.)_

**AC1 — Live + real-device verification pass over every Epic 11 surface**
**Given** the historical gap — visual gates ignore sizing/spacing and emulated viewports miss real gesture physics
**When** the verification pass runs
**Then** it includes BOTH a Playwright mobile-profile sweep AND a real-device (physical phone) checklist over every Epic 11 surface — slider thumb-drag, sheet 4-snap drag + chip row, quick-info states, map tint/dot/recenter, detail first paint — with results (including screenshots) recorded in the story record and any gap triaged before the epic closes

**AC2 — Regression guards for the Epic 11 interaction fixes (the standing CI net)**
**Given** the interaction fixes need durable protection
**When** regression tests are added
**Then** they cover **at least**: touch-drag ON the slider thumb changes time (real touch events); a full drag gesture commits time exactly once; time scrub issues zero venue requests and a date change exactly one; markers persist (no unmount) across a date change; the today-minimum and today+3 cap; sheet reaches all four snaps by gesture; chip toggling filters pins + list on mobile; and the quick-info renders no "Säkerhet"/sun-window text

**AC3 — Live perf gated + request-count invariant guarded in CI**
**Given** the performance goal is the epic's headline
**When** perf is gated
**Then** a repeatable measurement against the LIVE deployment records date-change p95 < 3 s and time-scrub = 0 network requests, stored in the story record with the methodology, and a CI-runnable variant guards the request-count invariants (wall-clock perf measured live, counts guarded in CI)

## Design Gate Criteria (verification story — no new UI of its own)

Per epics.md:3021 — **the gate is all other Epic 11 stories' visual references passing at both breakpoints, the real-device checklist recorded, and the regression + request-count suites green in CI.** This story ships no new visible surface, so the usual four-criteria frontend Design Gate does NOT apply in its screenshot-of-new-component form. Reflect that honestly — do NOT fabricate Visual/Behaviour/Animation gates for a surface that doesn't exist. Instead:

- **Visual (verification, not new surface):** Confirm the Epic 11 stories' own references render correctly at BOTH the mobile (`iPhone 14`) and desktop breakpoints. **Reality check:** the consolidated reference-PNG rebaseline (Epic-9 list + Epic-10 obscured + every Epic-11 surface, 12 pairs) was CAPTURED + STAGED + DOCUMENTED by Story 11.7 but its **maintainer blessing is deferred to PR review** (dev is structurally forbidden from self-blessing — `AGENTS.md:177-179`). So "references pass" for THIS story means "the 11.7-staged set is presented for blessing and the automated visual-validate gate is not self-blessed by the dev." Do NOT re-capture or re-bless PNGs here — that is 11.7's deliverable + the maintainer's PR checkpoint. Record the blessing as part of the consolidated post-merge protocol (AC3/AC1), NOT as a new 11.8 debt.
- **Behaviour:** The regression + request-count suites (AC2) are green in CI at both breakpoints AND under the `touch` project; each Epic 11 fix is confirmed to hold on the mobile profile (AC1); any device-only gap is logged, not silently accepted.
- **Animation:** N/A — no new animation. Confirm no Epic 11 fix regressed an existing animation (slider thumb/fill 1:1 follow during drag, sheet snap transitions, pin fade, the pulsing location-dot halo — which must stay static under `prefers-reduced-motion`, guarded by 11.5's tests).
- **Visual validation:** The **automated** visual-validate gate (`.claude/scripts/visual-validate.sh`) cannot run on this Windows host (`/tmp/impl-*.png` unwritable — carried gotcha from 9.8/9.10); this story adds NO new screenshot target, so there is nothing new to byte-compare. Verify via the e2e suite (mobile + desktop + touch projects) + the manual device spot-check; route the 11.7-staged rebaseline blessing to the maintainer.

## Tasks / Subtasks

- [x] **Task 1 — Promote/confirm the standing request-count + marker-persistence invariants as the durable CI gate (AC2, AC3)**
  - [x] The scrub=0 / date-change=1 + marker-persistence e2e already exists and is **un-skipped and green on both `mobile` + `desktop`**: `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts` (its `test.describe(...)` is live, not `.skip` — verified; the `.filter({ visible: true })` selector fix landed so the desktop `planner-date-next` binds the visible variant). This story **PROMOTES it to the standing epic invariant** — it must remain un-skipped, green, and CI-wired. Confirm it runs under `--project=mobile --project=desktop` (the CI "E2E tests" step, `.github/workflows/build-and-test-nextjs.yml:110`). ✅ Ran green on both projects (2 tests × 2 = 4 pass); CI wiring confirmed at workflow L110.
  - [x] **Reconcile the stale RED-PHASE header comment** in that spec. NOTE: the mid-file header block (lines 30-44) was ALREADY reconciled to STANDING-11.8 language by the ATDD pass (committed at HEAD; see ATDD checklist "two comment-only PROMOTION edits"). The only residual stale artifact was the top-of-file banner line ("ATDD RED-PHASE acceptance scaffolds — Story 11.1") — reconciled to "STANDING Story-11.8 invariant (promoted from the Story 11.1 seam)". Comment-only; no assertion weakened. DETERMINISTIC-MECHANISM + `?_time=13:00` docs preserved.
  - [x] Verify the two assertions still hold as the epic gate: (a) a settled same-date time scrub adds **zero** `**/api/venues*` requests (R-001 headline); (b) a date change fires **exactly one** request, markers stay MOUNTED (keyed by venue id via `VenuePinLayer`), and the `date-change-overlay` dim+spinner testid is visible while in-flight. Belt-and-braces api.met.no forbid holds. ✅ Both assertions green on mobile + desktop.
  - [x] No redundant third copy added — dedup discipline held: the request-count invariant stays e2e-only; the deliberate R-001 zero-fetch double-cover (query-key unit `test/unit/utils/venue-day-series-query-key.atdd.test.ts` AND e2e) kept, no third level added.

- [x] **Task 2 — Promote/confirm the real-touch gesture guards under the `touch` project (AC2)**
  - [x] Two real-touch e2e specs run under the Chromium/Pixel-5 `touch` project (CDP `Input.dispatchTouchEvent`): `epic-11-slider-touch-drag.spec.ts` (11.2 AC1) and `epic-11-sheet-touch-gestures.spec.ts` (11.3 AC2/AC3). **Confirmed both green under `--project=touch`** (3 tests pass; CI step workflow L120) and the four standard projects `testIgnore` them (`playwright.config.ts:43-87`).
  - [x] **CORRECTION (per ATDD checklist, honest):** the story's source-of-truth claim that `epic-11-slider-touch-drag.spec.ts:150` is an *unconditional red-phase* `test.skip` to remove is WRONG against HEAD — line ~157 is already a `hasTouch`-PROJECT self-skip (`test.skip(!testInfo.project.use.hasTouch, …)`), structurally identical to the sheet-gesture guard, which is CORRECT and MUST stay. There was NO red-phase skip to remove. The header was already reconciled to STANDING-11.8 by the ATDD pass; only the top-of-file banner line remained stale → reconciled (comment-only). The touch-drag PASSES green against the current tree → no regression.
  - [x] **@use-gesture release-direction + no `pointer:{touch:true}` invariants respected** — no @use-gesture / gesture-logic touched this story. The one touch-spec change (sheet-gesture hardening, see Completion Notes) uses raw `page.touchscreen.tap` retries, not @use-gesture.
  - [x] **Turbopack stale-CSS trap:** no `globals.css`/token change this story, so no fresh-`.next` needed; the reused dev server served the touch e2e green.

- [x] **Task 3 — Verify (do NOT duplicate) the AC2 unit/component regression net is present + green (AC2)**
  - [x] AC2 says "cover **at least**" its enumerated behaviours. MOST already have isolated coverage from 11.1–11.6 — **VERIFIED each present and green; NO duplicate authored** (dedup discipline held). All 11 enumerated regression files present + green (11 files / 211 tests green as a targeted group):
    - **Touch-drag ON thumb changes time (real touch) + one-commit-per-gesture:** `epic-11-slider-touch-drag.spec.ts` (e2e, `touch`) + `test/components/TimeSlider.dragdecouple.atdd.test.tsx`. ✅ green.
    - **Time scrub = 0 requests / date change = 1 / markers persist:** `epic-11-scrub-zero-fetch.spec.ts` (e2e) + `test/unit/utils/venue-day-series-query-key.atdd.test.ts`. ✅ green (Task 1).
    - **Today-minimum + today+3 cap in STATE:** `test/unit/time-planner.today-window.atdd.test.ts`, `test/unit/TimeContext.today-window-min.atdd.test.tsx`, `test/components/DatePickerDialog.today-window.atdd.test.tsx`, `test/unit/time-planner.window-boundaries.automate.test.ts`, `test/unit/venue-planner.window-optout.automate.test.ts`, `test/unit/TimeContext.min-edge-cases.automate.test.tsx`. ✅ green — FLOOR-not-ceil + `enforceWindow:false` invariants confirmed, NOT touched.
    - **Sheet reaches all four snaps by gesture + chip axis guard:** `epic-11-sheet-touch-gestures.spec.ts` (e2e, `touch`). ✅ green (Task 2; see hardening note in Completion Notes).
    - **Chip toggling filters pins + list on mobile (breakpoint parity):** `epic-11-chip-filter-parity.spec.ts` (BOTH `mobile` + `desktop`). ✅ green.
    - **Quick-info renders NO "Säkerhet"/sun-window text:** `test/components/VenueQuickInfo.test.tsx` + `test/components/MapView.test.tsx` + `test/unit/removed-i18n-keys.test.ts`. ✅ green (the visible "Säkerhet" chip is confirmed sr-only-only post-11.4 — see the epic-10 stale-regex fix in Completion Notes).
  - [x] Ran `npm test` (full vitest): **baseline 142 files / 1354 tests → final 142 files / 1354 tests, ALL PASS. Count did NOT drop.** No genuinely-missing AC2 dimension surfaced → no new unit/component test authored.

- [x] **Task 4 — Mobile-profile Playwright sweep + record the physical-device checklist (AC1)**
  - [x] Ran the FULL e2e suite at `--project=mobile` (52 pass / 12 skip / 0 fail), `--project=desktop` (35 pass / 29 skip / 0 fail), and `--project=touch` (3 pass). Green on all three. `a11y` (desktop axe) run separately: 12 pass / 2 skip (Story-5.1 fixme). **`a11y-mobile` NOT wired into CI** — left as-is (Story-5.1 debt; epic-retro decision).
  - [x] Walked each Epic 11-touched surface at the mobile viewport and confirmed the fix holds (via the mobile-project e2e specs that exercise each surface):
    - **11.1/11.2 instant scrub + grabbable slider:** `epic-11-scrub-zero-fetch` (scrub=0/date-change=1+overlay) + `epic-11-slider-touch-drag` (thumb grabbable, commits once, 0 fetch) — green on mobile/touch.
    - **11.3 mobile sheet + chips:** `epic-11-sheet-touch-gestures` (four snaps + map interactive behind collapsed + chip axis guard) + `epic-11-chip-filter-parity` (chip filters list AND pins) — green.
    - **11.4 reworked quick-info:** `epic-10-weather-matrix` (all 5 scenarios × mobile+desktop) confirms NO visible "Säkerhet" chip (sr-only only), obscured two-signal chrome survives, opening-hours/route-button rework holds — green after the stale-regex fix.
    - **11.5 de-dulled map + living dot + recenter:** `map-primary` mobile Story-11.5 AC2 tests (pulsing-halo location dot + reduced-motion static halo) — green.
    - **11.6 detail clean first paint:** covered by the vitest component net (`VenueDetailContent` tests) + axe gate — green.
  - [x] **Physical-device spot-check:** no real phone in this unattended run → the Playwright `iPhone 14` (`mobile`) + `Pixel 5` (`touch`) profiles serve as the automated proxy; the physical-device pass is recorded as `needs-human` item #2 of the consolidated Post-Merge Verification Protocol (Task 5). NO "physical device passed" claim fabricated.
  - [x] Mobile-only gaps found: NONE that are product defects. One test-only flake surfaced (sheet-gesture map-tap) + one stale-regex e2e (epic-10 confidence copy) — both were genuine defects THIS pass surfaced and were fixed in-scope (small, covered, recorded in Completion Notes), not silently. No `deferred-work.md` entry needed (no product-code defect deferred).

- [x] **Task 5 — Consolidate the live/device/blessing handoffs into ONE post-merge verification protocol (AC1, AC3)**
  - [x] Wrote a SINGLE consolidated **Post-Merge Verification Protocol** in the Dev Agent Record → Completion Notes (below), gathering the three maintainer-gated `needs-human` items (live p95 + time-scrub-0-requests; physical-device checklist; 11.7-staged PNG rebaseline blessing) into one place.
  - [x] Stated explicitly in that section that these three are the ONLY items deferred out of PR/CI — because they are wall-clock / device / human-judgement bound, NOT slow — and that everything automatable is a live CI gate.
  - [x] Confirmed the CI wiring one final time: `.github/workflows/build-and-test-nextjs.yml` runs (a) `--project=mobile --project=desktop` (L110, incl. scrub-zero-fetch + chip-parity + weather-matrix), (b) `--project=touch` (L120, real-touch slider + sheet), (c) `--project=a11y` (L123, desktop axe). `a11y-mobile` NOT invoked (correct). Recorded as the standing gate in Completion Notes.

- [x] **Task 6 — Gates + no-visual-change verification (Design Gate)**
  - [x] Ran the four-command gate: `npm run typecheck` ✅ 0 errors, `npm run lint` ✅ 0 errors, `npm test` ✅ 1354/1354 (count not dropped vs baseline 1354), Playwright `mobile`/`desktop`/`touch`/`a11y` ✅ all green. Results recorded in Completion Notes.
  - [x] **Design Gate (verification gate):** this story touches ZERO rendered output — the code delta is (1) comment-only header reconciliation on the two promoted specs, (2) a test-only flake hardening + a test-only stale-regex fix. NO new route, schema, dependency, component, engine, weather, or `@theme`/DESIGN.md token change. The ONLY visual artifact remains the 11.7-staged rebaseline the maintainer blesses at PR (protocol item #3).
  - [x] No promoted/un-skipped spec is RED against the current tree after the two in-scope test fixes → no `needs-human`/blocker regression. Both fixes preserve the asserted fact (see Completion Notes); no assertion weakened or deleted to force green.

## Dev Notes

### Scope fences (what this story is and is NOT)

**IN scope (verification + regression-guard promotion + protocol consolidation — no new feature code):**
- Reconcile the stale RED-PHASE header comments + remove the landed-red-phase `test.skip` on the Epic-11 e2e specs (`epic-11-scrub-zero-fetch.spec.ts`, `epic-11-slider-touch-drag.spec.ts`) so they are the STANDING Story-11.8 invariants (comment + skip-removal only; NO assertion weakening).
- Run + confirm green: the full vitest suite, the `mobile`/`desktop`/`touch`/`a11y` Playwright projects.
- Verify (do NOT duplicate) the AC2 unit/component/e2e regression net is present + green; add ONLY a genuinely-missing enumerated dimension at the correct dedup level.
- The mobile-profile sweep across every Epic 11 surface (AC1).
- The consolidated Post-Merge Verification Protocol (live p95 + physical-device checklist + maintainer PNG blessing) written into this story's Dev Agent Record (AC1/AC3).

**OUT of scope (do NOT touch — other stories own these, or explicitly deferred elsewhere):**
- Any RENDERED output / component / CSS token / `@theme` change. This is a verification story: it ships no new visible surface (Design Gate). If a "fix" would change a pixel, scope it as a follow-up, do not do it here.
- Re-implementing / re-touching any 11.1–11.7 feature code, EXCEPT to add/promote a regression test around it, wire an existing spec into CI, or fix a genuine defect this pass surfaces (log substantial reworks as follow-ups).
- **Re-capturing or blessing reference PNGs.** The consolidated 12-pair rebaseline is 11.7's deliverable (captured + staged + documented); the maintainer blesses at PR. Do NOT self-bless (`AGENTS.md:177-179`). Do NOT re-run the capture here.
- **Blind-wiring the `a11y-mobile` Playwright project into CI** — it carries a Story-5.1 `test.fixme` and would red on known color-contrast debt. Epic-retro / Story-5.1 decision, not this story's.
- **Do NOT "fix" the today-min FLOOR back to ceil** (11.2 invariant — ceil thrashes the 11.1 date-only query key) and do NOT add server-side today+3 window rejection (`enforceWindow:false` is intentional so far-future forecast bookmarks serve 200).
- **Do NOT reintroduce time into the `useVenueSearch`/`useFavouriteVenues` query keys** (11.1 removed it — date-only + coords + isLiveNow); a settled scrub must leave the key unchanged.
- No live Vercel deploy, no new dependency, no schema/migration. The live p95 pass runs against the ALREADY-deployed production (maintainer, post-merge).

### Architecture & pattern constraints

- **This is the STANDING anti-"shipped-but-insufficient" gate (R-001, score 9 CRITICAL).** The epic thesis is that Epics 9/10 each landed a caching/debounce win yet the user-visible stall survived because the root cause (time in the query key; per-request per-time engine compute) was only dampened, not removed. 11.8's gate is deliberately the **request-count invariant (scrub=0 requests, date change=1) + the real-touch profile, NOT wall-clock alone** — a wall-clock number is environment-flaky and cannot prove the fetch was REMOVED. [Source: test-design-epic-11 R-001 line 109, retro-notes epic-11 Phase-2]
- **Dedup discipline (test-design line 228-234):** the client day-series math is UNIT-only; the DTO contract + payload at API-only; the request-count invariant at E2E-only; the render/a11y at COMPONENT-only. The ONE deliberate defence-in-depth is the R-001 zero-fetch guard (query-key unit AND e2e). Do NOT assert the same fact at a third level.
- **Dual-variant e2e selector rule (11.1 fix-pass lesson):** both responsive `TimeSliderPanel` variants are always mounted (CSS-hidden per breakpoint), so a DOM-order `.first()`/`.last()` binds the wrong (hidden) instance on the other breakpoint. Dual-variant selectors MUST use `.filter({ visible: true })`, never positional `.first()`. The `planner-date-next` selector in the scrub spec already does this (line 207) — keep it. [Source: retro-notes epic-11 (11-1 fix-pass)]
- **Real touch is CDP-driven under the `touch` project** (`devices['Pixel 5']`, Chromium + `hasTouch`) — CDP `Input.dispatchTouchEvent` is Chromium-only, so the WebKit `mobile`/iPhone-14 project cannot drive it; the four standard projects `testIgnore` the touch specs. Desktop self-skips on `!hasTouch`. This project IS wired into CI (workflow line 120). Do NOT use `pointer:{touch:true}`. [Source: retro-notes epic-11 (11-2/11-3), playwright.config.ts:68-76]
- **@use-gesture release direction:** snap decisions derive from accumulated movement (`releaseDir`), never the instantaneous `direction` (0 at touch-up). Load-bearing 11.3 invariant. [Source: retro-notes epic-11 (11-3)]
- **`?_time=13:00` forcing for any sun-touching e2e:** sun is server-computed from the wall clock, so any spec touching sun state pins `?_time=13:00` for determinism. All the epic-11 specs already do this via their `forceMiddayTime` helper — do NOT remove it. CI keeps running Playwright against `next dev` (not a prod build) so `?_time=` forcing fires (project-context "Production planner-forcing gate"). [Source: MEMORY ci-and-e2e-gotchas; retro-notes epic-11; test-design line 405-408]
- **Verification-story reference-PNG rule (structural):** dev agents are FORBIDDEN from blessing/replacing reference PNGs; a failing visual gate is fixed by fixing the implementation, or (if the reference depicts out-of-scope UI) by an explicit maintainer accept-with-rationale. The 11.7-staged consolidated set awaits the maintainer's PR blessing — this story records the blessing in the post-merge protocol, it does NOT perform it. [Source: `AGENTS.md:177-179`; retro-notes epic-11 (11-1/11-4/11-5/11-6/11-7)]

### Source-of-truth facts (verified in HEAD at drafting, 2026-07-05)

- **`epic-11-scrub-zero-fetch.spec.ts` is un-skipped + green on `mobile`+`desktop`.** `test.describe('[11.1 AC1/AC3] day-series scrub = 0 requests, date change = 1 + markers persist', ...)` at line 149 is LIVE (not `.skip`). The `.filter({ visible: true })` desktop selector fix is in place (line 207). The header comment (lines 35-41) still reads "RED PHASE / `test.describe.skip`" — STALE, reconcile in Task 1. [Verified 2026-07-05]
- **`epic-11-slider-touch-drag.spec.ts` still carries `test.skip(...)` at line 150** with a red-phase header (line 40). Tasks 1+2 of Story 11.2 landed (`review`), so verify whether the touch-drag now passes and remove the red-phase skip if so (Task 2). [Verified 2026-07-05]
- **`epic-11-sheet-touch-gestures.spec.ts` uses a CORRECT `hasTouch`-project self-skip** (`test.beforeEach` → `test.skip(!testInfo.project.use.hasTouch, ...)` at line 189-192) — this is the run-only-under-`touch`-project guard, NOT a red-phase skip; keep it. [Verified 2026-07-05]
- **The `date-change-overlay` testid exists in `MapView.tsx`** (landed by 11.1) — the dim+spinner overlay the scrub spec asserts. [Verified 2026-07-05: grep hit in `components/custom/map/MapView.tsx`]
- **CI wiring (`.github/workflows/build-and-test-nextjs.yml`):** E2E = `--project=mobile --project=desktop` (line 110); touch = `--project=touch` (line 120); axe = `--project=a11y` (line 123). `a11y-mobile` is NOT invoked. [Verified 2026-07-05]
- **Playwright projects (`playwright.config.ts`):** `mobile` (iPhone 14, WebKit) + `desktop` (Desktop Chrome) both `testIgnore` the two touch specs; `touch` (Pixel 5, Chromium) `testMatch`es both touch specs; `a11y` (Desktop Chrome) `testMatch`es `axe.spec.ts`; `a11y-mobile` (iPhone 14) `testMatch`es `axe-mobile.spec.ts`. [Verified 2026-07-05]
- **11.1 Live-Perf Handoff** is recorded in `_bmad-output/test-artifacts/atdd-checklist-11-1.md` §"Live-Perf Handoff (AC4) — needs-human" (lines 122-134) — the canonical method 11.8 consolidates. [Verified 2026-07-05]
- **The 11.7-staged rebaseline** = 12 pairs under `nextjs-app/docs/design/references/screens/{mobile,desktop}/` + a `REBASELINE-LOG.md` entry, blessing deferred to PR (11.7 File List + Completion Notes; the AC3 byte-identical map-primary/map-panel-venues pair was RE-CAPTURED into distinct DOM-asserted states in the 11.7 review, still awaiting blessing). [Verified 2026-07-05: `11-7-hygiene-deferred-debt.md` Review Findings]

### Persistent facts (accumulated epic constraints folded in — from retro-notes epic-11 + prior story files)

- **The scrub=0/date-change=1 e2e is un-skipped + green on both desktop+mobile** (after the `.filter({visible:true})` selector fix). **This story OWNS promoting/keeping the standing CI request-count invariant.** [retro-notes epic-11 (Story 11-8 accumulated fact); 11.1 ATDD "11.1↔11.8 boundary"]
- **The Chromium `touch` Playwright project (Pixel 5, CDP `Input.dispatchTouchEvent`) exists AND is wired into CI** (build-and-test-nextjs.yml) — the sheet + slider touch specs run there. @use-gesture release decisions derive from accumulated movement (`releaseDir`), never instantaneous direction; do NOT use `pointer:{touch:true}`. [retro-notes epic-11 (11-2/11-3); Story 11-8 accumulated fact]
- **The `a11y-mobile` Playwright project is defined but NOT invoked by CI** (carries a Story-5.1 `test.fixme`) — do NOT blind-wire it (would red on known debt); it is an epic-retro/5.1 decision. [retro-notes epic-11 (11-5); Story 11-8 accumulated fact]
- **LIVE/maintainer-gated handoffs this story documents (NOT blockers — this run is unattended):** the live date-change p95 <3 s protocol (recorded in atdd-checklist-11-1 "Live-Perf Handoff"), the physical-device touch/gesture checklist, the maintainer PNG blessing (staged by 11-7 at PR review). **The story CONSOLIDATES these into ONE clear post-merge verification protocol** rather than re-deferring piecemeal. [Story 11-8 accumulated fact; test-design R-014/R-015 + Exit Criteria]
- **Turbopack stale-CSS trap** (restart `next dev` + fresh `.next` after any `globals.css` token change before touch e2e); **dual-variant selectors** use `.filter({visible:true})`; **sun-touching e2e forces `?_time=13:00`.** [retro-notes epic-11 (11-1/11-3); MEMORY ci-and-e2e-gotchas]
- **Today-min uses FLOOR not ceil** (ceil flips isLiveNow + thrashes the 11.1 date-only query key) — later slider work must NOT "fix" it back to ceil. **The today→today+3 window is a CLIENT/state concern:** `validatePlannerDateTime` enforces it by default but the server route opts out (`enforceWindow:false`) so far-future forecast bookmarks serve 200 — do NOT add server-side window rejection. [retro-notes epic-11 (11-2)]
- **Query keys for `useVenueSearch`/`useFavouriteVenues` no longer include time** (date-only + coords + isLiveNow via the `isLiveNow` flag) — do NOT reintroduce time; a settled scrub must leave the key unchanged. [retro-notes epic-11 (11-1)]
- **PRE-EXISTING axe boundary CLOSED by 11.6:** the VenueDetailContent amber sun badge color-contrast was raised to ≥4.5:1 (`--color-amber-badge-text` #6d5000 → #5c4300, 5.63:1); the axe gate is deterministically green. Do NOT reopen. [retro-notes epic-11 (11-6)]

### Deferred-work overlap (subject-matched to this story's ACs; folded, NONE reopened out of scope)

Reviewed `_bmad-output/implementation-artifacts/deferred-work.md` end-to-end. **NO entry is `Target: 11.8`.** The only entries whose SUBJECT overlaps 11.8's ACs (verification, request-count/real-touch guards, live perf, reference-PNG rebaseline blessing) are the reference-PNG + verification-cascade items, which are ALREADY absorbed by Story 11.7's AC3 (staged the consolidated rebaseline) — 11.8 only RECORDS the maintainer blessing in its post-merge protocol, it does not re-open the capture. Explicitly:

- **[RECORD in protocol — do NOT reopen] Maintainer blessing of the consolidated reference-PNG rebaseline.** The 9.8 / epic-9-review / 11.6 rebaseline-cascade entries were all ABSORBED into Story 11.7's AC3 (captured + staged + documented; blessing deferred to PR). The 11.7 code review re-captured the byte-identical `map-primary`/`map-panel-venues` mobile pair into distinct DOM-asserted states, still PREPARED for blessing. 11.8's Task 5 records this blessing as item #3 of the consolidated post-merge protocol — it does NOT re-capture or re-bless. [deferred-work: 11.7 review §; `11-7` File List/Review Findings]
- **[RECORD in protocol — conditional/None] Live wall-clock p95 + physical-device pass.** These are test-design R-014/R-015 (Low/OPS) — recorded, not CI-gated. Folded into the post-merge protocol (Task 5 items #1 + #2), consolidating the 11.1 "Live-Perf Handoff". NOT a separate deferred-work entry. [test-design R-014/R-015; atdd-checklist-11-1 Live-Perf Handoff]
- **[NOTE — out of scope, do NOT reopen] All other deferred entries** (slider keyboard-drag stale `dragValue` 11.2-Low, desktop chip-strip real-overflow proof 11.3-Med, OnboardingGate grant-flyTo viewport-awareness 11.5-Low, `MOBILE_TOP_BAR_COVER` token 11.5-Low, AC3 centered-vs-left-aligned reference 11.6-Low, and all epic-8/9/10 engine/weather/SW/rate-limit/share robustness items) are conditional/`Target: None` follow-ups whose subject does NOT overlap 11.8's ACs (verification, request-count/real-touch guards, live perf, blessing). They belong to their own future stories. Do NOT reopen them here. The 11.6 AC3 centered-reviews reconciliation is resolved AT the 11.7 rebaseline blessing (maintainer), not by 11.8. [deferred-work end-to-end review]

### What is ALREADY covered vs. what 11.8 adds

- **ALREADY covered (verify green, do NOT duplicate):** every AC2 behaviour has isolated coverage from 11.1–11.6 (see Task 3 for the exact file map). The `touch` project + its CI step exist. The scrub-zero-fetch e2e is un-skipped + green.
- **11.8 ADDS:** (a) PROMOTION of the seam specs to the standing epic invariant (comment reconciliation + red-phase-skip removal, NO assertion change); (b) the mobile-profile verification sweep (AC1); (c) the CONSOLIDATED post-merge protocol (live p95 + device checklist + PNG blessing in ONE place); (d) a final CI-wiring confirmation. It writes essentially NO product code — if it does, that is a scope-fence breach, log it as a follow-up.

### Project Structure Notes

- Files touched (all `nextjs-app/`-relative):
  - `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts` (M — reconcile the stale RED-PHASE header to STANDING-11.8 language; NO assertion change).
  - `nextjs-app/test/e2e/epic-11-slider-touch-drag.spec.ts` (M — remove the landed red-phase `test.skip` + reconcile header, IF the touch-drag now passes against the current tree; otherwise STOP + report the regression).
  - Possibly a single new regression test IF a genuinely-missing AC2 dimension surfaces (at the correct dedup level — unlikely; most is covered).
  - This story file's Dev Agent Record (the consolidated Post-Merge Verification Protocol).
- No new route, schema, dependency, component, engine, weather, or `@theme`/DESIGN.md token change. No conflicts with the unified structure.
- **Commit-grouping note for the orchestrator:** this story's code delta is test-spec comment/skip reconciliation only (verification-story). The live p95 + physical-device + PNG-blessing are maintainer post-merge actions recorded in the story, not commits.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story-11.8` (lines 3001-3021) — ACs + Design Gate; §"Epic 11" (lines ~2791-3021) — epic thesis "feels instant, reads clear"]
- [Source: `_bmad-output/test-artifacts/test-design/test-design-epic-11.md` — R-001 (score 9, the anti-"shipped-but-insufficient" gate, line 109), R-002 (per-step commit flood, line 110), R-004 (real-touch thumb-drag, line 112), R-005 (marker persistence, line 113), R-014/R-015 (live-perf + device pass, non-CI, lines 132-133); Exit Criteria lines 201-215; NFR Performance/Interaction/Reliability rows lines 164-168; Execution Strategy lines 304-316; dedup discipline line 228-234]
- [Source: `_bmad-output/test-artifacts/atdd-checklist-11-1.md` — §"Live-Perf Handoff (AC4) — needs-human" (lines 122-134, the p95 method 11.8 consolidates); §"Note on the e2e / Story 11.8 boundary" (lines 88-91, "standing guards OWNED by Story 11.8")]
- [Source: `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts` (line 149 live `test.describe`, line 207 `.filter({visible:true})`, lines 35-41 stale red-phase header to reconcile), `epic-11-slider-touch-drag.spec.ts` (line 150 `test.skip`, line 40 red-phase header), `epic-11-sheet-touch-gestures.spec.ts` (line 189 correct `hasTouch` self-skip — keep), `epic-11-chip-filter-parity.spec.ts` (mobile+desktop chip parity)]
- [Source: `nextjs-app/playwright.config.ts:43-87` (mobile/desktop/touch/a11y/a11y-mobile projects + testIgnore/testMatch wiring), `.github/workflows/build-and-test-nextjs.yml:109-123` (E2E mobile+desktop / touch / a11y CI steps; a11y-mobile NOT invoked)]
- [Source: AC2 regression coverage files — `nextjs-app/test/components/TimeSlider.dragdecouple.atdd.test.tsx`, `test/unit/utils/venue-day-series-query-key.atdd.test.ts`, `test/unit/time-planner.today-window.atdd.test.ts`, `test/unit/TimeContext.today-window-min.atdd.test.tsx`, `test/components/DatePickerDialog.today-window.atdd.test.tsx`, `test/components/VenueQuickInfo.test.tsx`, `test/components/MapView.test.tsx`, `test/unit/removed-i18n-keys.test.ts`]
- [Source: retro-notes `_bmad-output/auto-bmad/retro-notes/epic-11.md` — Phase-2 (R-001 request-count gate rationale), 11-1 (query-key decouple + dual-variant `.filter({visible:true})` + "11-7 owns rebaseline"), 11-2 (FLOOR-not-ceil, server `enforceWindow:false`, touch project), 11-3 (`releaseDir` not instantaneous direction, no `pointer:{touch:true}`, Turbopack stale-CSS), 11-5 (a11y-mobile NOT CI-wired / Story-5.1 fixme), 11-6 (amber badge ≥4.5:1 CLOSED); Story-11-8 accumulated-facts block]
- [Source: `_bmad-output/implementation-artifacts/11-7-hygiene-deferred-debt.md` — Task 4 + Review Findings: the 12-pair consolidated rebaseline staged for maintainer PR blessing (incl. the re-captured distinct map-primary/map-panel-venues pair)]
- [Source: `_bmad-output/implementation-artifacts/9-10-mobile-device-verification-pass-regression-guards.md` — the structural precedent: a verification+regression-guard LAST-story-of-epic with no new UI, a mobile-profile sweep, a "verify green, do not duplicate" regression net, and a maintainer physical-device/rebaseline handoff]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` — reviewed end-to-end; NO `Target: 11.8` entry; reference-PNG/verification-cascade items absorbed by 11.7 AC3, blessing recorded in 11.8's post-merge protocol]
- [Source: `MEMORY.md` — ci-and-e2e-gotchas (`?_time=13:00` forcing, bundle gate excludes lazy MapLibre chunk, npm-ci lockfile); Epic-10/11 project entries; visual-gate-is-an-LLM-eyeball (ignores sizing/spacing → why 11.8 asserts code-level facts, not the eyeball)]
- [Source: `AGENTS.md:177-179` (dev forbidden to bless/replace reference PNGs; any ref/recipe change updates REBASELINE-LOG same operation) — `AGENTS.md` is the canonical repo rulebook, `CLAUDE.md` a shim pointing to it; `_bmad-output/planning-artifacts/architecture.md` (CI/deploy + caching/DTO context); `project-context.md` (Production planner-forcing gate, caching windows, Screen ID → Route Map)]
- [Source: `nextjs-app/docs/design/DESIGN.md` — canonical design tokens the Epic-11 surfaces this pass verifies must match (UNCHANGED this story — no `@theme`/token edit); `_bmad-output/planning-artifacts/ux-design-specification.md` — canonical visual/interaction intent for the reworked slider / sheet / quick-info / map / detail surfaces the AC1 mobile sweep confirms]

## Dev Agent Record

### Agent Model Used

Opus 4.8 (claude-opus-4-8[1m]) — BMAD dev-story workflow, autonomous single-pass.

### Debug Log References

- Baseline vitest: **142 files / 1354 tests pass** (before any edit).
- AC2 regression net (targeted group, 11 files): **211 tests pass**.
- Gates: `npm run typecheck` 0 errors; `npm run lint` 0 errors.
- Playwright: `scrub-zero-fetch`+`chip-parity` on mobile+desktop = 6 pass; `touch` project = 3 pass; `a11y` = 12 pass / 2 skip; full `mobile` sweep = 52 pass / 12 skip; full `desktop` = 35 pass / 29 skip; CI-shape re-run (mobile+desktop 87 pass / 41 skip, touch 3 pass, a11y 12 pass / 2 skip).
- Flake investigation: `epic-11-sheet-touch-gestures.spec.ts:197` failed 2/3 then 2/5 on first attempt (map-tap-selects-venue-raises-sheet step) → traced to raw-touch tap miss on the MapLibre marker button (selection never registered; four-snap drag core always passed). After hardening: **6/6 pass with retries=0**.
- Final vitest after edits: **142 files / 1354 tests pass** (unchanged — count did not drop).

### Completion Notes List

Story 11.8 is the LAST story of Epic 11 — a cross-story verification + regression-guard-promotion + protocol-consolidation pass. It writes essentially no product code. Two genuine defects surfaced during the mobile-profile sweep were fixed IN-SCOPE (both test-only, both preserve the asserted fact); a third stale artifact (top-of-file banners) was reconciled comment-only.

**1. Header reconciliation (Task 1/Task 2 — comment-only, no assertion change).** The mid-file STANDING-11.8 header blocks on `epic-11-scrub-zero-fetch.spec.ts` and `epic-11-slider-touch-drag.spec.ts` were ALREADY reconciled by the ATDD pass (committed at HEAD). The only residual stale artifact was each file's top-of-file banner line ("ATDD RED-PHASE acceptance scaffold…") — reconciled to STANDING-Story-11.8 language so a reader no longer sees "RED PHASE" at the top of a now-standing gate. No assertion, skip, or behaviour changed.

**2. HONEST CORRECTION to the story's source-of-truth facts (per ATDD checklist).** The story claimed `epic-11-slider-touch-drag.spec.ts:150` was an *unconditional red-phase* `test.skip` to remove "if the touch-drag now passes." Against HEAD this is FALSE — that line is a `hasTouch`-PROJECT self-skip (`test.skip(!testInfo.project.use.hasTouch, …)`), the correct run-only-under-a-touch-project guard, identical in kind to the sheet-gesture spec's guard, and it MUST stay. There was no red-phase skip to remove. The touch-drag PASSES green under `--project=touch` → no regression. Task 2 reduced to "confirm green + reconcile the stale top banner."

**3. IN-SCOPE FIX A — sheet-gesture real-touch flake hardening (`epic-11-sheet-touch-gestures.spec.ts`).** The promoted touch spec's "map interactive behind collapsed" test flaked ~66% on first attempt (deterministically green in CI ONLY because of `retries:2`). Root cause (systematic-debug): the final step taps a venue pin with `page.touchscreen.tap(centerX, centerY)` to prove the map is interactive behind the collapsed sheet; a discrete raw-touch tap at the pin's geometric center intermittently lands off the interactive pill (the `<button>` box also spans the pointer tail + a flex gap), so `toggleVenue` never fires, the venue stays unselected, and the sheet stays `collapsed`. The four-snap DRAG core (the load-bearing AC2 behaviour) passed every run — only the map-tap flaked. Fix: keep the REAL finger tap (AC3 intent) but re-aim to the tappable pill region and bounded-retry (≤4) until the pin reports selected (`data-pin-state` gains `-selected`), then assert the sheet rose to `peek`. Same asserted fact; deterministic aim. Verified 6/6 green with retries=0 (duration 21.8s flaky → ~7s deterministic). This is exactly the fragility 11.8 exists to eliminate for the standing gate. NOT a product-code change.

**4. IN-SCOPE FIX B — stale confidence-copy regex in `epic-10-weather-matrix.spec.ts`.** The full mobile+desktop sweep surfaced a genuine test-vs-implementation drift introduced by Story 11.4 that 11.4's review missed (it only ran vitest, not this epic-10 e2e). Story 11.4 (AC1/AC4) intentionally REMOVED the VISIBLE "Säkerhet: NN%" confidence chip from `VenueQuickInfo` — confidence now lives on ONLY as sr-only accessible text with format `"<Säkerhet|Confidence> [cirka|about ]NN%"` (no colon; from `getConfidenceDisplayState.accessibleText`), the visible chip having moved to the detail view. The epic-10 constant `CONFIDENCE_BADGE_COPY = /Säkerhet:|Confidence:/` keyed on the OLD colon-labelled visible chip and no longer matched, so the "clear" scenario failed. Fix: update the regex to `/(Säkerhet|Confidence)\s+(cirka\s+|about\s+)?\d+\s*%/` — matches the current present-confidence sr-only copy (exact OR approximate, both locales) while staying ABSENT for the geometry-only "Säkerhet saknas"/"Confidence unavailable" case (no trailing `\d+%`). The test's FACT is preserved (confidence present iff weather-backed): verified green on the "clear" (present) AND "weather-missing" (absent) scenarios on both breakpoints. This directly serves 11.8 AC2 ("quick-info renders no visible 'Säkerhet'/sun-window text") by aligning the epic-10 gate with the landed 11.4 rework, and confirms the sr-only reading-order text is intact. NOT a product-code change.

**Standing CI gate confirmed (AC3 request-count half + real-touch).** `.github/workflows/build-and-test-nextjs.yml` runs the durable gate exactly as required: `--project=mobile --project=desktop` (L110 — scrub-zero-fetch request-count invariant + chip-parity + weather-matrix), `--project=touch` (L120 — real-touch slider + sheet), `--project=a11y` (L123 — desktop axe AA). `a11y-mobile` remains defined-but-not-invoked (Story-5.1 `test.fixme` debt; NOT blind-wired — correct per scope fence). `playwright.config.ts` project routing (mobile/desktop `testIgnore` the two touch specs; `touch` `testMatch`es them; `a11y` matches axe.spec.ts) is intact.

**Invariants confirmed held (not touched):** today-min FLOOR-not-ceil; server `enforceWindow:false` (far-future forecast bookmarks serve 200); `useVenueSearch`/`useFavouriteVenues` query keys are date-only + coords + isLiveNow (no time — a settled scrub leaves the key unchanged, proven by scrub=0-requests); @use-gesture `releaseDir` accumulated-movement snap; no `pointer:{touch:true}`; `?_time=13:00` forcing on all sun-touching e2e; `.filter({visible:true})` dual-variant selector; amber sun badge ≥4.5:1 (axe green).

**Design Gate (verification gate) — PASS.** Zero rendered-output change (all four code deltas are test-spec comments / test-only harness robustness). No new route/schema/dependency/component/engine/weather/`@theme`/DESIGN.md token. The only visual artifact is the 11.7-staged reference-PNG rebaseline the maintainer blesses at PR (protocol item #3 below). The automated `visual-validate.sh` gate cannot run on this Windows host (`/tmp` unwritable — carried 9.8/9.10 gotcha) and this story adds no new screenshot target, so there is nothing new to byte-compare; verification is via the green e2e suite (mobile+desktop+touch+a11y) + this record, with the rebaseline blessing routed to the maintainer.

---

### Post-Merge Verification Protocol (needs-human — the 3 consolidated maintainer handoffs)

These are the ONLY items deferred out of PR/CI, and ONLY because they are **wall-clock / physical-device / human-judgement bound** — NOT because they are slow. Everything automatable (the request-count invariant, real-touch gestures, the full regression net, the axe AA gate) is a live CI gate on this branch. Consolidated here in ONE place per story Task 5, rather than re-deferred piecemeal.

1. **LIVE date-change p95 < 3 s + time-scrub = 0 requests (AC3 wall-clock half).** Method (from the 11.1 ATDD "Live-Perf Handoff", `_bmad-output/test-artifacts/atdd-checklist-11-1.md:122-134`): against the live Vercel **Production** deployment (real data path — Supabase venue store + real sun engine), map at a known origin, change the planner DATE (today → today+1) and measure end-to-end wall-clock to markers updating in place; repeat **≥10 trials**; report **p95** (note warm vs cold cache per trial; stretch < 1.5 s warm). Separately scrub the time slider across several settled steps and confirm the browser network panel shows **0** `**/api/venues*` requests. Also record the measured **gzipped `sunDaySeries` payload byte size**. A p95 MISS is a triage item, NOT a fabricated pass (Epic-10 live-spot-check precedent). — *Runs against the ALREADY-deployed production; no new deploy needed.*

2. **Physical-device (real phone) checklist** over every Epic 11 surface — slider thumb-drag, sheet 4-snap + chip row, quick-info states, map tint/dot/recenter, detail first paint — **with screenshots per surface**; any device-only gap triaged before epic close. In THIS unattended run no physical phone is available → the Playwright `iPhone 14` (`mobile`) + `Pixel 5` (`touch`) profiles served as the automated proxy (all green); the physical pass remains a `needs-human` handoff. No "physical device passed" claim is fabricated.

3. **Maintainer blessing of the 11.7-staged consolidated reference-PNG rebaseline** (12 pairs under `nextjs-app/docs/design/references/screens/{mobile,desktop}/` with a `REBASELINE-LOG.md` entry, incl. the re-captured distinct `map-primary`/`map-panel-venues` pair). Dev is structurally forbidden from self-blessing (`AGENTS.md:177-179`); the maintainer blesses at PR review. This story RECORDS the blessing item — it does NOT re-capture or re-bless.

### File List

- `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts` (M — comment-only: reconciled the top-of-file banner to STANDING-Story-11.8 language; no assertion change)
- `nextjs-app/test/e2e/epic-11-slider-touch-drag.spec.ts` (M — comment-only: reconciled the top-of-file banner to STANDING-Story-11.8 language; no assertion/skip change)
- `nextjs-app/test/e2e/epic-11-sheet-touch-gestures.spec.ts` (M — test-only: hardened the flaky "map interactive behind collapsed" real-touch tap to re-aim + bounded-retry-until-selected; same asserted fact, deterministic aim)
- `nextjs-app/test/e2e/epic-10-weather-matrix.spec.ts` (M — test-only: updated the stale `CONFIDENCE_BADGE_COPY` regex to match the post-11.4 sr-only confidence copy; same fact — present iff weather-backed)
- `_bmad-output/implementation-artifacts/11-8-live-verification-pass-touch-gesture-perf-guards.md` (M — Dev Agent Record: tasks checked, Completion Notes + consolidated Post-Merge Verification Protocol, File List, Change Log, Status → review)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (M — status 11-8 ready-for-dev → in-progress → review)

### Change Log

| Date | Version | Description |
| ---- | ------- | ----------- |
| 2026-07-05 | 1.0 | Story 11.8 dev-story pass. Promoted the standing request-count + marker-persistence e2e (scrub=0/date-change=1) + the real-touch slider/sheet guards to the durable epic CI gate (comment-only banner reconciliation; confirmed green on mobile/desktop/touch). Verified the AC2 unit/component net present + green (11 files / 211 tests; full vitest 1354 unchanged). Ran the full mobile+desktop+touch+a11y Playwright sweep. Two in-scope test-only fixes surfaced by the sweep: (A) hardened a ~66%-first-attempt real-touch flake in the sheet-gesture spec (map-tap-selects-venue) to a deterministic re-aim+retry; (B) fixed a stale `CONFIDENCE_BADGE_COPY` regex in `epic-10-weather-matrix.spec.ts` that no longer matched the post-11.4 sr-only confidence copy — both preserve the asserted fact, no product code changed. Consolidated the live-p95 / physical-device / PNG-blessing handoffs into ONE Post-Merge Verification Protocol. Gates: typecheck 0, lint 0, vitest 1354/1354, Playwright mobile/desktop/touch/a11y all green. Status → review. |
