---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04-generate-tests'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-07-05'
workflowType: 'testarch-atdd'
inputDocuments:
  - '_bmad-output/implementation-artifacts/11-8-live-verification-pass-touch-gesture-perf-guards.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-11.md'
  - '_bmad-output/test-artifacts/atdd-checklist-11-1.md (Live-Perf Handoff + 11.1↔11.8 boundary)'
  - '_bmad-output/test-artifacts/atdd-checklist-11-2.md (real-touch scaffold precedent)'
  - '_bmad-output/implementation-artifacts/9-10-mobile-device-verification-pass-regression-guards.md (verification-story precedent)'
  - 'nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts'
  - 'nextjs-app/test/e2e/epic-11-slider-touch-drag.spec.ts'
  - 'nextjs-app/test/e2e/epic-11-sheet-touch-gestures.spec.ts'
  - 'nextjs-app/test/e2e/epic-11-chip-filter-parity.spec.ts'
  - 'nextjs-app/playwright.config.ts'
  - '.github/workflows/build-and-test-nextjs.yml'
  - 'nextjs-app/components/custom/map/MapView.tsx (date-change-overlay testid)'
---

# ATDD Checklist: Story 11.8 — Live Verification Pass, Touch-Gesture Coverage & Perf Regression Guards

**Date:** 2026-07-05
**Author:** Rasmus
**Primary Test Level:** E2E (promotion) + verification sweep — this is a VERIFICATION story, not a feature story

---

## ⚠️ Read this first — why this checklist is mostly "verify green, do NOT author"

Story 11.8 is the **LAST story of Epic 11** and is a **cross-story verification + regression-guard-promotion + protocol-consolidation pass** with **NO new product code and NO new UI of its own** (story §"Context & Root Cause" + Design Gate). The ATDD red-phase deliverable is therefore *deliberately small*: **every AC2 behaviour already has green (or promotable-green) coverage from Stories 11.1–11.6, every testid the specs depend on already exists, and the CI request-count / real-touch / axe wiring is already in place.**

Per the Master Test Architect discipline — and the explicit instruction "Never fabricate scaffolds for behavior that already has green coverage" — **this pass authors ZERO new red-phase test files.** Fabricating red-phase scaffolds for facts that already ship green coverage would be a dedup breach (test-design line 228–234) and would create standing skipped tests that assert already-satisfied behaviour.

What this checklist DOES produce:

1. A **coverage-verification map** (every AC2 "at least" behaviour → its existing green spec → the run command). "Verify present + green", not "author".
2. The **two comment-only promotion edits** (reconcile the stale RED-PHASE header comments on `epic-11-scrub-zero-fetch.spec.ts` and `epic-11-slider-touch-drag.spec.ts` to STANDING-11.8 language — NO assertion change, NO skip added or removed that changes behaviour).
3. **One honest correction** to the story's Source-of-truth facts (§ below): the story claims `epic-11-slider-touch-drag.spec.ts:150` is an *unconditional red-phase* `test.skip` awaiting un-skip. It is NOT — in HEAD it is already a `hasTouch`-project self-skip (`test.skip(!testInfo.project.use.hasTouch, …)`), identical in kind to the sheet-gesture guard, which is CORRECT and must stay. So there is **no red-phase skip to remove** — only the stale *header comment* to reconcile. This removes the "if the touch-drag now passes, remove the skip" branch from the dev's Task 2 and replaces it with "confirm green under `--project=touch`/`--project=mobile` + reconcile the header."
4. The **Post-Merge Verification Protocol** (the 3 maintainer-gated, unattended-run-unavailable items — live p95, physical-device checklist, PNG blessing) captured as `needs-human` handoffs, consolidated in ONE place.

**If any promoted/verified spec is RED against HEAD, that is a genuine Epic-11 regression → STOP and report `needs-human`; do NOT weaken/delete an assertion to force green** (story Task 6). No such regression was assumed here — the dev/orchestrator confirms green at run time.

---

## Story Summary

**As a** maintainer
**I want** every Epic 11 fix verified on the live deployment and on a real device, with the interaction and performance wins locked in by tests
**So that** the "shipped but insufficient" pattern of Epics 9/10 (caching + debounce landed, symptoms persisted) cannot repeat.

The standing anti-"shipped-but-insufficient" gate (test-design **R-001, score 9 CRITICAL**): the gate is the **request-count invariant (scrub = 0 venue requests, date change = exactly 1) + the real-touch profile**, NOT wall-clock alone — a wall-clock number is environment-flaky and cannot prove the fetch was REMOVED (only that it was dampened).

---

## Acceptance Criteria (verbatim intent)

- **AC1** — Live + real-device verification pass over every Epic 11 surface: BOTH a Playwright mobile-profile sweep AND a real-device (physical phone) checklist over every Epic 11 surface, results (incl. screenshots) recorded in the story record, any gap triaged before epic close.
- **AC2** — Regression guards for the Epic 11 interaction fixes (the standing CI net), covering **at least**: touch-drag ON the slider thumb changes time (real touch); a full drag commits time exactly once; time scrub issues zero venue requests and a date change exactly one; markers persist (no unmount) across a date change; the today-minimum and today+3 cap; sheet reaches all four snaps by gesture; chip toggling filters pins + list on mobile; quick-info renders no "Säkerhet"/sun-window text.
- **AC3** — Live perf gated + request-count invariant guarded in CI: a repeatable LIVE measurement records date-change p95 < 3 s + time-scrub = 0 network requests (stored with methodology), and a CI-runnable variant guards the request-count invariants (wall-clock perf measured live, counts guarded in CI).

---

## Step 1 — Preflight & Context

- **Detected stack:** `fullstack` (Next.js app + API routes under `nextjs-app/`; both `playwright.config.ts` and `vitest.config.ts` present).
- **Prerequisites:** Story approved (`ready-for-dev`) with clear ACs (AC1–AC3 + verification Design Gate). Playwright + Vitest configured. ✅ Satisfied.
- **Framework & patterns:** Vitest for unit/component; Playwright for e2e (projects: `mobile`/iPhone-14/WebKit, `desktop`/Desktop-Chrome, `touch`/Pixel-5/Chromium+hasTouch, `a11y`/Desktop-Chrome, `a11y-mobile`/iPhone-14). Real touch is CDP `Input.dispatchTouchEvent`, Chromium-only → runs under `touch` only; the four standard projects `testIgnore` the touch specs; desktop self-skips on `!hasTouch`.
- **TEA config flags:** `test_stack_type: auto` → fullstack; `tea_use_playwright_utils: true`; `tea_execution_mode: auto` → resolved **sequential** (no subagent runtime here; `/tmp` unwritable on this Windows host — carried gotcha — so no subagent temp-file fan-out; verification reasoning done inline).
- **Knowledge fragments applied (core tier):** `test-quality.md` (Given-When-Then, one-fact-per-level, determinism), `selector-resilience.md` (`.filter({visible:true})` dual-variant rule), `timing-debugging.md` (no wall-clock asserts → request-count/element-persistence signals), `component-tdd.md`, `data-factories.md`.

## Step 2 — Generation Mode

- **Mode:** AI-generation reasoning, **no live-browser recording** — the epic-11 e2e specs use the established `page.route` mocked-DTO harness (Epic-10 precedent) + `?_time=13:00` forcing, not recorded selectors. **No new scaffold files are generated** (see the "Read this first" banner).

## Step 3 — Test Strategy (AC → level → verification action)

Dedup discipline (test-design line 228–234): client day-series math is **UNIT-only**; DTO/payload **API-only**; request-count invariant **E2E-only**; render/a11y **COMPONENT-only**. The ONE deliberate defence-in-depth is the R-001 zero-fetch guard (query-key **unit** AND **e2e**) — keep both, add no third.

| AC | Behaviour ("at least" list) | Level (owner) | Priority | Existing coverage (VERIFY GREEN — do NOT author) | 11.8 action |
| -- | --------------------------- | ------------- | -------- | ------------------------------------------------ | ----------- |
| AC2 | Touch-drag ON the thumb changes time (REAL touch) | E2E `touch` | P0 (R-004) | `test/e2e/epic-11-slider-touch-drag.spec.ts` | **Promote** (reconcile stale header → STANDING) + confirm green under `--project=touch`/`--project=mobile` |
| AC2 | A full drag gesture commits time **exactly once** | E2E `touch` + Component | P0 (R-002) | `epic-11-slider-touch-drag.spec.ts` + `test/components/TimeSlider.dragdecouple.atdd.test.tsx` | Verify green |
| AC2 | Time scrub = **0** venue requests | Unit + E2E | P0 (R-001 headline) | `test/unit/utils/venue-day-series-query-key.atdd.test.ts` + `epic-11-scrub-zero-fetch.spec.ts` | **Promote** (reconcile stale header) + verify the deliberate double-cover holds; add NO third copy |
| AC2 | Date change = **exactly 1** request + **markers persist** (no unmount) | E2E | P0 (R-005) | `epic-11-scrub-zero-fetch.spec.ts` (date-change describe; `date-change-overlay` testid present in `MapView.tsx:1013`) | **Promote** + verify green on `mobile`+`desktop` |
| AC2 | Today-minimum + today+3 cap | Unit + Component | P1 | `test/unit/time-planner.today-window.atdd.test.ts`, `test/unit/TimeContext.today-window-min.atdd.test.tsx`, `test/components/DatePickerDialog.today-window.atdd.test.tsx`, `test/unit/time-planner.window-boundaries.automate.test.ts`, `test/unit/venue-planner.window-optout.automate.test.ts`, `test/unit/TimeContext.min-edge-cases.automate.test.tsx` | Verify green (FLOOR-not-ceil + `enforceWindow:false` invariants — do NOT "fix") |
| AC2 | Sheet reaches all four snaps by gesture + chip axis guard | E2E `touch` | P0 | `test/e2e/epic-11-sheet-touch-gestures.spec.ts` (correct `hasTouch` self-skip — KEEP) | Verify green under `--project=touch` |
| AC2 | Chip toggling filters pins + list on mobile (breakpoint parity) | E2E `mobile`+`desktop` | P1 | `test/e2e/epic-11-chip-filter-parity.spec.ts` | Verify green |
| AC2 | Quick-info renders NO "Säkerhet"/sun-window text | Component + Unit | P1 | `test/components/VenueQuickInfo.test.tsx` + `test/components/MapView.test.tsx` + `test/unit/removed-i18n-keys.test.ts` | Verify green |
| AC3 | Request-count invariant guarded **in CI** | E2E (CI) | P0 | CI runs `--project=mobile --project=desktop` (workflow L110), `--project=touch` (L120), `--project=a11y` (L123); playwright projects `testIgnore`/`testMatch` correct | Verify wiring (already in place) — record as standing gate |
| AC3 | LIVE date-change **p95 < 3 s** + scrub = 0 requests | Manual (live) | P3 (R-014) | **needs-human** — protocol (below) | Consolidate into Post-Merge Protocol #1 |
| AC1 | Physical-device gesture pass over every surface | Manual (device) | P3 (R-015) | **needs-human** — checklist (below) | Consolidate into Post-Merge Protocol #2 |
| AC1/Design Gate | Maintainer blessing of 11.7-staged reference-PNG rebaseline (12 pairs) | Manual (maintainer) | — | **needs-human** — dev structurally forbidden to self-bless (`AGENTS.md:177-179`) | Consolidate into Post-Merge Protocol #3 |

**Red-phase conclusion:** No AC2/AC3 row lacks green coverage. **Zero new red-phase scaffolds are warranted.** Any attempt to author one would duplicate an existing fact (dedup breach) or assert already-satisfied behaviour (not a valid red phase). This is the correct ATDD outcome for a verification story.

## Step 4 — Generate Tests (RED PHASE)

**Outcome: NO NEW TEST FILES GENERATED.** (Sequential mode; no subagent fan-out; `/tmp` unwritable on host — irrelevant here because there is nothing to author.) The subagent-generation machinery (step-04a API / step-04b E2E) is intentionally a no-op for this verification story: there is no un-covered acceptance behaviour to scaffold. See the coverage map above — every "at least" behaviour resolves to a present spec.

**Two comment-only PROMOTION edits (the ONLY code delta — NO assertion change):**

1. `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts` — the `test.describe(...)` at line 149 is already **LIVE (not `.skip`)** and green on `mobile`+`desktop`; the `.filter({visible:true})` desktop selector fix is in place (line 207). The header comment block (lines 35–41, "RED PHASE / `test.describe.skip` — Un-skip once Tasks 2/4/5 land") is **STALE**. Reconcile it to state this is the **STANDING Story-11.8 request-count + marker-persistence invariant** (no longer a red-phase seam), preserving the DETERMINISTIC-MECHANISM + `?_time=13:00` documentation. Comment-only.

2. `nextjs-app/test/e2e/epic-11-slider-touch-drag.spec.ts` — the header comment block (lines 40–46, "RED PHASE — why the describe is `.skip`-ed / Un-skip when Tasks 1 + 2 land") is **STALE**. In HEAD, line 150 is a `hasTouch`-project self-skip (`test.skip(!testInfo.project.use.hasTouch, …)`), NOT an unconditional red-phase skip — the describe already runs and (per Tasks 1+2 of Story 11.2 having landed) exercises the real touch-drag. Reconcile the header to **STANDING Story-11.8 real-touch invariant** language and keep the `hasTouch` self-skip (it is correct — same pattern as the sheet-gesture spec). Comment-only. **Do NOT add or remove a behaviour-changing skip here.**

## Required data-testid Attributes

**None to add.** Every testid the promoted specs depend on already exists in HEAD:
- `date-change-overlay` — present (`components/custom/map/MapView.tsx:1013`, landed by 11.1)
- `venue-pin` (marker persistence / count), `planner-time-label`, `time-slider-thumb`, `planner-date-next` (dual-variant, `.filter({visible:true})`) — all present and used by the existing specs.

## Mock Requirements

**None new.** The existing specs use the established `page.route` DTO-fulfillment harness (`**/api/venues?**` with a request COUNTER as the acceptance signal) + `forbidLiveMetno` belt-and-braces (fails on any `api.met.no` request) + `?_time=13:00` wall-clock forcing. No live Met.no, no new fixture.

---

## Implementation Checklist (dev / orchestrator — verification actions, NOT authoring)

- [ ] **Reconcile 2 stale headers (comment-only):** update the RED-PHASE header blocks in `epic-11-scrub-zero-fetch.spec.ts` (L35–41) and `epic-11-slider-touch-drag.spec.ts` (L40–46) to STANDING-Story-11.8 language. **No assertion / skip-behaviour change.**
- [ ] **Run the full vitest suite:** `npm test` — record baseline→final file/test count in the Dev Agent Record. **Count must NOT drop** (a dropped test is a regression, not a pass). Confirm every AC2 unit/component file in the coverage map is present + green.
- [ ] **Run the Playwright projects:** `npx playwright test --project=mobile --project=desktop`, `--project=touch`, `--project=a11y`. Record pass/fail per spec.
  - Turbopack stale-CSS discipline: if any run follows a `globals.css` token change, restart `next dev` + fresh `.next` before the touch e2e. (This story changes no token — discipline noted for re-runs.)
- [ ] **Confirm the two promoted e2e specs are GREEN** (`epic-11-scrub-zero-fetch` on mobile+desktop; `epic-11-slider-touch-drag` + `epic-11-sheet-touch-gestures` on `touch`). **If RED → STOP, report `needs-human` (genuine Epic-11 regression); do NOT weaken an assertion.**
- [ ] **Confirm CI wiring is intact** (already in place — verify, do not edit unless broken): `.github/workflows/build-and-test-nextjs.yml` L110 (`--project=mobile --project=desktop`), L120 (`--project=touch`), L123 (`--project=a11y`). Do **NOT** blind-wire `a11y-mobile` (Story-5.1 `test.fixme` debt — would red).
- [ ] **Mobile-profile surface sweep (AC1):** walk each Epic 11 surface at the `mobile` viewport (11.1/11.2 slider+scrub, 11.3 sheet+chips, 11.4 quick-info, 11.5 map/dot/recenter, 11.6 detail first paint); confirm the fix holds; log any mobile-only gap as a `deferred-work.md` entry with a target (do NOT silently fix a large defect).
- [ ] **Write the consolidated Post-Merge Verification Protocol** (below) into the story's Dev Agent Record → Completion Notes.
- [ ] **Gates:** `npm run typecheck` (0), `npm run lint` (0), `npm test` (count not dropped), Playwright (`mobile`/`desktop`/`touch`/`a11y`). Confirm ZERO rendered-output change (Design Gate = verification gate).

---

## Post-Merge Verification Protocol (needs-human — the 3 consolidated maintainer handoffs)

These are the ONLY items deferred out of PR/CI, and ONLY because they are **wall-clock / physical-device / human-judgement bound**, NOT because they are slow. Everything automatable (request-count invariant, real-touch gestures, regression net, axe AA gate) is a live CI gate. Consolidated here so they are recorded in ONE place (story Task 5), not re-deferred piecemeal.

1. **LIVE date-change p95 < 3 s + time-scrub = 0 requests (AC3 wall-clock half).**
   Method (from the 11.1 ATDD "Live-Perf Handoff", `atdd-checklist-11-1.md:122-134`): against the live Vercel **Production** deployment (real data path — Supabase venue store + real sun engine), map at a known origin, change the planner DATE (today → today+1), measure end-to-end wall-clock to markers updating in place; repeat **≥10 trials**; report **p95** (note warm vs cold cache per trial; stretch < 1.5 s warm). Separately scrub the time slider across several settled steps and confirm the network panel shows **0** `**/api/venues*` requests. Also record the measured **gzipped `sunDaySeries` payload byte size**. A p95 MISS is a triage item, NOT a fabricated pass (Epic-10 live-spot-check precedent).

2. **Physical-device (real phone) checklist** over every Epic 11 surface: slider thumb-drag, sheet 4-snap + chip row, quick-info states, map tint/dot/recenter, detail first paint — **with screenshots per surface**; any device-only gap triaged before epic close. In THIS unattended run a physical phone is unavailable → the Playwright `iPhone 14` (`mobile`) + `Pixel 5` (`touch`) profiles serve as the automated proxy; the physical pass is a `needs-human` handoff. **Do NOT fabricate a "physical device passed" claim.**

3. **Maintainer blessing of the 11.7-staged consolidated reference-PNG rebaseline** (12 pairs under `nextjs-app/docs/design/references/screens/{mobile,desktop}/` with a `REBASELINE-LOG.md` entry, incl. the re-captured distinct `map-primary`/`map-panel-venues` pair). Dev is structurally forbidden from self-blessing (`AGENTS.md:177-179`); the maintainer blesses at PR review. This story RECORDS the blessing item — it does NOT re-capture or re-bless.

---

## Correction to the story's Source-of-truth facts (recorded honestly, not silently)

The story's §"Source-of-truth facts" (line 132) and Task 2 assume `epic-11-slider-touch-drag.spec.ts:150` is an **unconditional red-phase `test.skip`** awaiting un-skip "if the touch-drag now passes." **HEAD does not match:** line 150 is already a `hasTouch`-project self-skip (`test.skip(!testInfo.project.use.hasTouch, …)`) — the correct run-only-under-a-touch-project guard, structurally identical to the sheet-gesture spec's guard. There is therefore **no red-phase skip to remove** — the describe already runs. The only 11.8 action on this file is the **stale header-comment reconciliation** (already captured above). This does not change scope or risk; it simplifies Task 2 from "un-skip if green, else STOP" to "confirm green under `--project=touch`/`--project=mobile` + reconcile header." Flagged so the dev does not go looking for a red-phase skip that isn't there.

---

## Red-Green-Refactor Status

- **RED phase:** N/A — no new failing tests authored (verification story; all AC behaviours already green). This is the intended outcome; see banner.
- **GREEN phase (dev/orchestrator):** run the coverage map green, apply the 2 comment-only header reconciliations, run the mobile sweep, write the Post-Merge Protocol. Count must not drop.
- **REFACTOR:** none — no product code, no test-logic change.

---

## Running Tests

```bash
# Full unit/component suite (count must not drop vs baseline)
cd nextjs-app && npm test

# The promoted standing e2e invariants
npx playwright test --project=mobile --project=desktop test/e2e/epic-11-scrub-zero-fetch.spec.ts test/e2e/epic-11-chip-filter-parity.spec.ts
npx playwright test --project=touch test/e2e/epic-11-slider-touch-drag.spec.ts test/e2e/epic-11-sheet-touch-gestures.spec.ts

# Axe AA gate (desktop — the CI-invoked one)
npx playwright test --project=a11y

# Full mobile-profile sweep (AC1)
npx playwright test --project=mobile
```

---

## Notes

- **This is the standing anti-"shipped-but-insufficient" gate (R-001, score 9 CRITICAL).** The gate is the request-count invariant (scrub=0, date-change=1) + the real-touch profile, NOT wall-clock alone.
- **Deferred-work review:** no `Target: 11.8` entry exists; the reference-PNG / verification-cascade items are absorbed by Story 11.7's AC3 (11.8 only records the maintainer blessing in the Post-Merge Protocol). No out-of-scope deferred item reopened.
- **Do NOT** reintroduce time into the `useVenueSearch`/`useFavouriteVenues` query keys; do NOT "fix" the today-min FLOOR back to ceil; do NOT add server-side today+3 window rejection (`enforceWindow:false` is intentional). These are load-bearing Epic-11 invariants the verification confirms, not touches.

---

**Generated by BMad TEA Agent (ATDD, verification-story mode)** — 2026-07-05
