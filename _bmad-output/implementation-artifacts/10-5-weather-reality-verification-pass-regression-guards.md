# Story 10.5: Weather-Reality Verification Pass & Regression Guards

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **maintainer**,
I want the weather-gated display verified against the real sky and protected by deterministic regression tests,
so that "the app said sunny while it rained" can never silently return.

## Context & Why This Story Exists

This is **the LAST story of Epic 10 "Honest Sky"** — a **cross-story verification + regression-guard
pass**, not a feature. It is the twin of Story 9.10 (the last-story-of-epic verification pass for Epic 9);
follow that structure. Epic 10 made the headline sun state weather-honest across four tiers, ALL on the
opt-in real-engine path (`SUNNYSEAT_SUN_ENGINE=real`), all DONE (status `review`) on this branch:

- **10.1 (Tier 0, ENGINE):** a geometrically-sunlit venue whose **effective** cloud cover ≥
  `CLOUD_GATE_THRESHOLD_PERCENT` (80) is re-labelled `CloudObscured`; missing cloud stays `undefined`
  (never `?? 0`); the FR12 confidence blend now reads cloud cover (100% cloud < 0% cloud confidence).
- **10.2 (UI):** the muted "Sol bakom moln" fourth visual state renders `CloudObscured` on all six
  surfaces; the geometric `%`/`sunWindow`/`peakTime` is preserved as clearly-labelled clear-sky
  potential; `skyCondition` is surfaced as plain-language copy. Added TWO dev-only force-states
  (`map-with-obscured-venue`, `venue-detail-obscured`).
- **10.3 (Tier 1, DATA):** switched to the Met.no `complete` endpoint; `effectiveCloudCover`
  (`clamp(1.0·low + 1.0·medium + 0.25·high, 0, 100)`) feeds the gate + confidence, so thin high cirrus
  no longer gates; `skyCondition` deliberately stays on the RAW TOTAL (observable-sky honesty).
- **10.4 (Tier 2, DATA):** the Met.no Nowcast 2.0 radar rain signal; active rain (rate > 0) forces the
  gate as a ONE-WAY OR-term (`isSunVisible && (cloudGates || isRaining)`); `skyCondition='rain'`
  precedence; no-rain / unknown-rain changes nothing (the epic's hard constraint); future planner
  requests skip the nowcast (`NOWCAST_HORIZON_MS`).

**10.5 closes the two gaps the epic left open:**

1. **The weather-gated behaviour was verified only by unit/engine tests + isolated 10.2 force-states —
   there is NO deterministic END-TO-END weather-boundary e2e matrix.** The historical failure mode
   ("weather fetched but not consumed", epics.md:2650–2653) is exactly the kind of regression a
   full-stack e2e catches that a unit test can miss. AC1 builds that matrix: five weather scenarios
   (overcast≥threshold / clear / high-cirrus-only / active-rain / weather-missing) rendered end-to-end
   and asserted on card + pin + detail, **wall-clock- and sky-independent (no live Met.no in CI).**
2. **The behavioural invariants of the whole tier stack lack a consolidated regression net + one live
   reality check.** AC4 pins the load-bearing invariants (100%-cloud never FULL SOL; missing-cloud
   never clear; confidence-100%-cloud < confidence-0%-cloud; rain forces obscured; no-rain changes
   nothing; the geometric fields stay byte-identical across weather for the same geometry+instant). AC2
   is the maintainer live spot-check. AC3 verifies the About copy stayed truthful.

**This story has NO new UI of its own.** Its Design Gate (below) is a verification gate — the mocked
weather e2e matrix green in CI + the recorded live spot-check + all Story 10.2 visual references passing.
Do NOT invent a new visual surface. Do NOT re-implement or re-touch any 10.1–10.4 tier code except to add
a regression test around it, wire the deterministic weather-mock scaffolding, or fix a genuine defect this
pass surfaces (log substantial reworks as follow-ups rather than expanding scope).

## Acceptance Criteria

**AC1 — Deterministic mocked-weather e2e matrix (the R-005 fix)**
**Given** the full Tier 0+1+2 stack is implemented
**When** a deterministic e2e matrix runs with the weather boundary mocked (overcast ≥ threshold, clear, high-cirrus-only, active rain, weather-missing) at a forced `?_time=`
**Then** each scenario asserts the correct card + pin + detail presentation (obscured / sunny / sunny-under-cirrus / obscured-rain / ungated-with-uncertainty respectively), and the suite is wall-clock- and sky-independent (no live Met.no calls in CI)

> _Reading (not part of the verbatim AC):_ The five scenarios map to observable states — (1) overcast
> ≥80 effective ⇒ `CloudObscured` muted "Sol bakom moln" chrome; (2) clear ⇒ amber Sunny; (3) high-cirrus-only
> (high cloud can be near-100 but effective = `0.25·high` stays < 80) ⇒ NOT gated, amber Sunny with `skyCondition`
> that is NOT overcast — this is the exact 10.3 differentiator ("thin cirrus ≠ blocking stratus"); (4) active rain
> ⇒ `CloudObscured` + `skyCondition='rain'`; (5) weather-missing (Met.no returns no cloud slice) ⇒ NOT gated (no
> fabricated clear sky), geometry governs, `skyCondition='unavailable'` ⇒ NO sky line, and the freshness/uncertainty
> signal reflects the missing weather. **The deterministic mechanism is the load-bearing decision — see Dev Notes
> "How to mock the weather boundary deterministically". The existing 10.2 force-states cover only scenarios (1) and
> (4-ish obscured chrome); 10.5 must cover the rest (retro-note R-005 / 10.2 determinism gap).** Assert RELATIVE
> presentation (muted-vs-amber, sky-line-present-vs-absent, state distinct), never a hardcoded cloud % or threshold
> number, so a future re-tune of the 80 threshold / layer weights survives (retro-note: relative-boundary tests).

**AC2 — Live reality spot-check recorded in the story record**
**Given** the live app and a real grey-or-clear day
**When** a manual reality spot-check is performed against the live site and the raw Met.no responses for central Gothenburg
**Then** the displayed states match the observable sky and the fetched cloud/precipitation values, with the outcome recorded in the story record (screenshots + fetched values), and any mismatch triaged to a root cause before the epic closes

> _Reading:_ This is a **maintainer / `needs-human`** step — it requires the live production site (real-engine
> flag ON, live Met.no) on a real day and manual eyeballing of the sky. The dev agent CANNOT self-fabricate a live
> sky observation. The dev agent's job for AC2 is to (a) provide the exact spot-check protocol (which live URLs, which
> raw Met.no endpoints + coordinates to fetch, what to compare, where to paste screenshots + fetched values in this
> story's Dev Agent Record) and (b) hand the observation itself to the maintainer as a recorded `needs-human` step.
> Do NOT invent a sky observation or a "PASS". See Dev Notes "AC2 — live spot-check is a maintainer step".

**AC3 — About copy still truthfully describes the two-signal model**
**Given** the About page explains predictions and cites accuracy
**When** the two-signal model ships
**Then** the About copy still truthfully describes the model (geometry + weather now genuinely blended per FR12) with `sv`/`en` parity, updated if any claim became stale

> _Reading:_ VERIFY first, edit only if stale. The current copy ALREADY describes the blend post-Epic-10:
> `about.json` `algorithmBody` = "…Sedan vägs väderprognosen in, så att en plats som ligger i moln inte räknas som
> solig" (weather is weighed in, so a venue in clouds isn't counted as sunny) and `sourceMetnoDesc` = "Väderprognoser
> för moln och nederbörd…" (forecasts for clouds AND precipitation). This reads as truthful for the shipped two-signal
> model. Confirm `sv`/`en` parity (messages-parity green) and confirm no claim became stale (e.g. no line implies
> geometry-only, no line over-claims per-venue cloud precision — the physics guardrail, epics.md:2657). If a claim IS
> stale, update it in BOTH locales; if not, record "verified truthful, no change needed" — do NOT churn copy for its
> own sake.

**AC4 — Regression guards for the historical failure mode**
**Given** the historical failure mode (weather fetched but not consumed)
**When** regression guards are added
**Then** they cover at least: 100% cloud can never render FULL SOL on any surface; missing cloud data never renders as clear; confidence at 100% cloud < confidence at 0% cloud; rain forces the obscured state; no-rain changes nothing; and the geometric fields (`sunExposurePercent`, `sunWindow`) remain byte-identical across weather variations for the same geometry and instant

> _Reading:_ "cover at least" — most of these ALREADY have isolated coverage from 10.1–10.4 (see Dev Notes
> "AC4 — what is ALREADY covered vs the net-new"). VERIFY each is present + green, add the MISSING dimension, and
> ADD the ONE genuinely-new cross-tier invariant: **the geometric `sunExposurePercent`/`sunWindow` are byte-identical
> across the five weather variations for the same geometry + instant** (the two-signal guarantee — weather changes ONLY
> the headline status/sky/confidence, never the geometry). This is the invariant the epic exists to protect and no
> single-tier test pins it. Also fold in the epic-wide **no-live-Met.no test-setup guard** (see Dev Notes / retro-note
> 10.4 R1) as an AC4 regression guard.

## Design Gate Criteria (verification story — no new UI of its own)

Carried from epics.md:2789 — **"No new UI of its own; the gate is the mocked-weather e2e matrix green in
CI, the recorded live spot-check, and all Story 10.2 visual references passing at both breakpoints."**
This story ships no new visible surface, so the usual four-criteria frontend Design Gate does NOT apply
in its screenshot-of-new-component form (auto-memory `feedback_visual_gate_criteria` — the four criteria
are for stories that introduce a surface; this one does not). Reflect that honestly — do NOT fabricate
Visual/Behaviour/Animation gates for a surface that doesn't exist. Instead:

- **Visual (verification, not new surface):** The gate is that **all Story 10.2 obscured visual
  references pass at both breakpoints.** **Reality check (retro-note 10.2 Phase-5 + deferred-work):** the
  two 10.2 obscured reference PNGs (`map-with-obscured-venue`, `venue-detail-obscured`) DO NOT EXIST yet
  and the host `visual-validate.sh` fails on this Windows machine (`/tmp/impl-*.png` unwritable, retro-note
  9-2). So "10.2 references pass" is **currently BLOCKED on a maintainer rebaseline**, which is an
  already-open 10.2 maintainer follow-up — NOT a 10.5 code defect. Record the reference-rebaseline debt as
  a consolidated maintainer follow-up in Completion Notes; the dev agent is FORBIDDEN from editing or
  creating reference PNGs or forcing a visual pass (visual-gate-inversion, retro-note 9-1).
- **Behaviour:** The mocked-weather e2e matrix (AC1) + the AC4 regression suite are green in CI; each tier
  invariant holds end-to-end; any mismatch surfaced by AC2's live check is triaged to a root cause before
  the epic closes.
- **Animation:** N/A — no new animation. Confirm no gate crossing (weather flip on refresh) flashes — the
  10.2 obscured pill/badge deliberately has no entrance fade (10.2 Task 2); assert no flash if you exercise
  a refresh-crossing path, else N/A.
- **Visual validation:** The automated visual-validate gate cannot run on this Windows host
  (`/tmp/impl-*.png` unwritable — retro-note 9-2); this story adds NO new screenshot target, so there is
  nothing new to byte-compare. Verify via the mocked-weather e2e matrix + the AC2 maintainer live
  spot-check; route the 10.2 obscured-reference rebaseline to the maintainer.

## Tasks / Subtasks

- [x] **Task 1 — Build the deterministic mocked-weather e2e matrix (AC1)** — DONE
  - [x] Deterministic mechanism: `page.route` DTO fulfillment (RECOMMENDED default). Intercept the
        detail route `**/api/venues/<slug>*` FIRST (more specific) then the list route `**/api/venues?**`,
        `fulfill`ing a hand-crafted `GetVenuesResponse`/`GetVenueDetailResponse` per scenario. The engine +
        Met.no never run; zero production-code change. Reused the plain `?venue=` deep-link (NOT the 10.2
        `?_state` normalizers, which would CLOBBER the mocked status/sky). Covered all five scenarios incl.
        the three 10.2 does not (clear, high-cirrus-only, weather-missing).
  - [x] New spec `test/e2e/epic-10-weather-matrix.spec.ts` runs under `--project=desktop` + `--project=mobile`.
        `?_time=13:00` forced (sun up); onboarding bypassed via `ONBOARDED_FLAG_KEY` init script.
  - [x] Asserted the five scenarios on card + pin + detail. Card selected via UI (desktop pin click / mobile
        bottom-sheet list card) because `?venue=` opens detail and SUPPRESSES the quick-info card. Detail
        asserted via `?venue=` deep-link. Relative presentation only (obscured-vs-amber, sky-line present/absent,
        rain copy, geometric % still visible) — no hardcoded cloud % / threshold.
  - [x] **No live Met.no:** the route-mock approach means the engine never runs; belt-and-braces
        `page.route('**://api.met.no/**', abort)` asserts ZERO outbound Met.no hits per scenario. All 10 tests
        green (warm server); zero met.no hits.

- [x] **Task 2 — Provide the AC2 live-reality spot-check protocol + hand to maintainer (`needs-human`)** — DONE
  - [x] Exact spot-check protocol + comparison table written into the Dev Agent Record below (live URLs, raw
        Met.no endpoints for central Gothenburg 57.7089,11.9746 with identifying User-Agent, comparison table).
  - [x] AC2 recorded as a `needs-human` maintainer step. NOT self-fabricated.

- [x] **Task 3 — Verify the About copy is still truthful + `sv`/`en` parity (AC3)** — DONE
  - [x] Read `messages/{sv,en}/about.json` + AboutPage. Every claim truthful for the shipped two-signal model
        (algorithm body = geometry+weather blend; Met.no source = clouds AND precipitation; accuracy honest;
        no geometry-only implication, no per-venue-precision over-claim).
  - [x] Nothing stale ⇒ NO copy change. `messages-parity` (18) + `AboutPage.test.tsx` (9) green.

- [x] **Task 4 — Consolidate + fill the AC4 regression guards** — DONE
  - [x] Verified each already-covered invariant green: 100%-cloud⇒obscured/no-amber + missing-cloud⇒never-clear +
        rain-forces-obscured + no-rain-inert (`sun-engine.cloud-gate.atdd.test.ts`), confidence-100%<0%
        (`confidence-calculator.cloud-gate.atdd.test.ts`). 41 tests green; 10.2 component no-amber tests green
        in the full run.
  - [x] Added the NET-NEW byte-identical-geometry cross-tier guard
        (`sun-engine.two-signal-invariants.atdd.test.ts`) — `sunExposurePercent`/`sunWindow` byte-identical across
        all five weather variations for the same geometry+instant, only status/sky/confidence differ. PASS.
        FINDING (see Completion Notes): the confidence-100%<0% clause was surfaced RED at the *displayed-engine*
        level (both 60) because the conservative shadow-coverage cap flattens unvalidated fixture venues —
        re-asserted at the confidence-CALCULATOR layer where the FR12 blend is observable.
  - [x] Folded in the epic-wide no-live-Met.no shared-setup fetch guard (`test/setup/setup.ts`), scoped to
        `api.met.no`. Acceptance test `test/unit/no-live-metno-fetch-guard.atdd.test.ts` green (3/3); full suite green.

- [x] **Task 5 — Verify gates + record decisions** — DONE
  - [x] Fresh HEAD baseline: 118 files passed + 2 skipped (the scaffolds) / 1099 passed + 8 skipped. After
        green-phase: **120 files / 1107 tests, 0 skipped** — net +2 files / +8 tests, NONE dropped.
  - [x] Four-command gate from `nextjs-app/`: `tsc --noEmit` 0 errors; `eslint .` 0 errors (13 pre-existing
        warnings in untouched files, none added); `vitest run` all green 0 unexpected skips; messages-parity green.
  - [x] e2e matrix: `npx playwright test --project=desktop --project=mobile test/e2e/epic-10-weather-matrix.spec.ts`
        → 10/10 pass (warm server), ZERO `api.met.no` hits. Cold-start first-test flake handled by CI `retries: 2`.
  - [x] Decisions recorded in Completion Notes.

## Dev Notes

### What this story is (and is NOT)
- **IS:** a deterministic mocked-weather e2e matrix (AC1) + the AC2 live-spot-check protocol handed to the
  maintainer + an About-copy truth verification (AC3) + a consolidated cross-tier regression net incl. the
  net-new byte-identical-geometry guard and the shared no-live-Met.no fetch guard (AC4).
- **IS NOT:** a re-implementation of any 10.1–10.4 tier code. The tier code is already merged on this branch.
  Touch tier/engine code ONLY to add a regression test around it, wire the e2e weather-mock scaffolding, or fix
  a genuine defect this pass surfaces (log anything larger as a follow-up).
- **No new component, no new visual state, no new i18n key** are expected (AC3 edits copy only IF stale). If the
  e2e mock needs a dev-only weather-scenario force-state, keep it inside the existing forced-state seam
  (`MapView` normalizers + `use-forced-state`) and register any new `_state` id in `project-context.md`,
  mirroring 10.2 Task 5. If you can cover the scenarios with a pure `page.route` DTO mock (no app-code change),
  prefer that — it is zero production footprint.

### How to mock the weather boundary deterministically (AC1 — the load-bearing decision)
The R-005 gap (retro-note epic-10 + 10.2): the e2e specs hit the real dev-server and `?_time=` pins ONLY the
wall clock, NOT the sky. There is NO deterministic weather-boundary mock today. In CI the real-engine flag is
OFF (`shouldUseRealSunEngine()` false — verified `sun-engine.ts:151,165`), so the venues route serves the SEED
fixture path (`venues-fixture.ts`, all `Sunny`/`Partial`/`Shaded`, NONE `CloudObscured`/rain) with NO live
Met.no. Two ways to make the five weather scenarios deterministic:

1. **`page.route` DTO fulfillment (RECOMMENDED — default).** In the spec, intercept the list + detail API
   (`page.route('**/api/venues*', route => route.fulfill({ json: <scenario DTO list> }))` and the `[slug]`
   detail route) and return a hand-crafted `VenueDataDto` per scenario with the fields the render surfaces
   branch on: `currentSunStatus` (`'CloudObscured'` / `'Sunny'`), `skyCondition`
   (`'overcast'`/`'clear'`/`'partly-cloudy'`/`'rain'`/`'unavailable'`/absent), `sunExposurePercent`,
   `sunWindow`, `confidence`, plus the freshness header/field for the weather-missing case. This exercises the
   REAL card/pin/detail render path (the thing AC1 asserts on), is fully deterministic, needs NO real engine
   and NO live Met.no, and stays green on CI's seed path. It does NOT exercise the engine gate itself — but the
   ENGINE gate is already exhaustively unit-tested by 10.1–10.4; AC1 is a **presentation** matrix ("each
   scenario asserts the correct card + pin + detail presentation"), so mocking at the DTO/route boundary is the
   right altitude. Match the fixture DTO shape exactly — read `venues-fixture.ts` + `lib/types/api.ts` for the
   required `VenueDataDto` fields so the response deserializes.
2. **Real engine ON + stubbed Met.no + per-scenario forecast/nowcast overrides (heavier).** Only if you want
   the gate itself exercised end-to-end. Requires setting `SUNNYSEAT_SUN_ENGINE=real` + Supabase service-role
   config for that spec's server, and stubbing the Met.no fetch (`page.route('**api.met.no/**')`) with
   per-scenario cloud/precip payloads. This is more faithful but far more moving parts and risks a live call
   leaking on CI. NOT recommended unless the DTO-mock approach cannot assert something AC1 needs.

The 10.2 dev-only force-states (`?_state=map-with-obscured-venue`, `?_state=venue-detail-obscured`) already
give deterministic OBSCURED chrome (scenarios 1 and the obscured half of 4) WITHOUT live weather — but they
HARDCODE the DTO in `MapView` normalizers (`normalizeForcedObscuredPin`/`normalizeForcedObscuredVenue`,
`MapView.tsx:1277-1291`), bypassing the engine AND the API. They do NOT cover clear-sunny, high-cirrus-only, or
weather-missing (retro-note R-005: "10.2 added its own force ids but the 10.5 weather-mock must cover the
rest"). So: reuse the 10.2 force-states for the obscured scenarios if convenient, and cover the other three via
the `page.route` DTO mock (or new per-scenario forced-state normalizers if you go that route — but the
`page.route` mock is cleaner and touches no production code).

### AC2 — the live spot-check is a maintainer step (`needs-human`)
AC2 requires the LIVE production site (real-engine flag ON, live Met.no) on a real grey-or-clear day and a
human eyeballing the sky. The dev agent CANNOT produce a genuine sky observation from this environment — do NOT
fabricate one, do NOT claim a PASS. Mirror 9.10's honest handling of its physical-device spot-check: provide
the exact protocol + comparison table in the Dev Agent Record and hand the observation to the maintainer as a
recorded `needs-human` verification. This is the correct completion for AC2 from the dev side; the epic does
not "close" on AC2 until the maintainer records the observation (and triages any mismatch to a root cause).
Central Gothenburg coordinates: `57.7089, 11.9746` (the app's fallback centre). Raw Met.no endpoints (with the
identifying `User-Agent`): locationforecast `complete` (cloud split) + nowcast `2.0/complete` (precipitation_rate).

### AC3 — About copy is already truthful (verify, don't churn)
`messages/sv/about.json` (+ the `en` mirror) already describes the two-signal blend for the shipped model:
`algorithmBody` says the weather forecast is weighed in "så att en plats som ligger i moln inte räknas som
solig" (so a venue in clouds is not counted as sunny), and `sourceMetnoDesc` cites "moln och nederbörd" (clouds
and precipitation). This is truthful for Tiers 0–2. The likely outcome of AC3 is "verified truthful, no change"
— do NOT invent copy churn. ONLY edit if a specific claim is stale or over-claims per-venue precision, and then
edit BOTH locales (parity-guarded). `TRÄFFSÄKERHET`/accuracy stat copy is unrelated to the gate — leave it.

### AC4 — what is ALREADY covered vs the net-new
The five invariants AC4 names are MOSTLY already pinned by 10.1–10.4 — your job is verify-green + add the two
gaps:
- **Already covered (confirm green, do NOT rewrite):** 100%-cloud⇒obscured + no-amber (10.1 gate tests + 10.2
  component tests); missing-cloud⇒never-clear (10.1 AC2 + `skyConditionFromCloudCover(undefined)==='unavailable'`);
  confidence-100%<0% (10.1 AC3 red-first); rain-forces-obscured + no-rain-changes-nothing (10.4 `[10.4 AC2/AC3]`).
- **NET-NEW #1 — the byte-identical geometry cross-tier invariant:** no test today asserts that
  `sunExposurePercent`/`sunWindow` are IDENTICAL across the five weather variations for the same geometry +
  instant while only status/sky/confidence change. This is THE two-signal guarantee (the geometric layer is
  sacred, epics.md:2659). Add it at the engine/unit level with injected forecast+nowcast overrides (NO network),
  mirroring the `sun-engine.cloud-gate.atdd.test.ts` harness.
- **NET-NEW #2 — the shared no-live-Met.no fetch guard:** see retro-note 10.4 R1 below.

### Ratified epic invariants (retro-notes epic-10 + 10.1–10.4 — MUST hold; assert AROUND them, never change)
- **`CLOUD_GATE_THRESHOLD_PERCENT = 80`** and the gate `switch`/precedence are fixed. 10.5 adds NO gate logic —
  it verifies and guards. Do NOT re-tune the threshold; do NOT hardcode `80` (or any cloud %) in a test — assert
  RELATIVE behaviour (obscured vs sunny, muted vs amber) so a future re-tune survives (retro-note: relative-boundary
  tests survive re-tune).
- **`effectiveCloudCover` (low/med = 1.0, high = 0.25, clamped 0..100) feeds gate + confidence; `skyCondition`
  reads the RAW total** (10.3 ratified split). The high-cirrus-only scenario (AC1 #3) is the exact case this
  split protects: high cloud near-100 ⇒ effective `≈ 0.25·100 = 25` < 80 ⇒ NOT gated. Your DTO mock for that
  scenario sets `currentSunStatus='Sunny'` with a `skyCondition` that is NOT `overcast` (the engine would emit
  e.g. `partly-cloudy` from the raw total, or `clear` — match a plausible value; the presentation assertion is
  "not obscured, not the overcast sky line").
- **Missing weather stays `undefined` — NEVER `?? 0`** (10.1 hard constraint, extended to `precipitation_rate` in
  10.4). The weather-missing scenario (AC1 #5) is NOT gated (no fabricated clear) and shows NO sky line
  (`skyCondition='unavailable'` ⇒ never rendered, 10.2). Do NOT introduce a `?? 0` anywhere.
- **`skyCondition` precedence: rain > cloud-derived label** (10.4). The rain scenario's DTO carries
  `skyCondition='rain'`; assert the "Regn"/"Rain" copy renders.
- **Never-exhaustive-switch discipline** (epic-level): 10.5 adds NO new `VenueSunStatus`/`SkyCondition` member,
  so no sweep. If a test needs to enumerate states, cover all five (`Sunny`/`Partial`/`Shaded`/`NoSun`/`CloudObscured`)
  / all sky values so a future member is caught.
- **`confidence-calculator.ts` has a mixed-EOL committed blob** (230 CRLF + 70 bare-LF): a Read/Edit round-trip
  on this Windows host pure-CRLF-ifies it (~73-line phantom churn — 10.1 lost a review round, 10.3 reconstructed
  from the parent blob). **You almost certainly do NOT touch `confidence-calculator.ts` in 10.5** (no confidence
  change is in scope). If some ripple forces an edit, reconstruct from the parent blob
  (`git cat-file blob HEAD:nextjs-app/lib/solar/confidence-calculator.ts`) preserving per-line EOLs — do NOT let
  the editor re-EOL the file. The same EOL caution applies to any tier file you touch (mixed CRLF/LF repo,
  `core.autocrlf=true`, no `.gitattributes`); confine diffs to the lines you actually change.
- **The gate lives on the real-engine path ONLY.** The default seed/fixture path (flag OFF, what CI runs) never
  calls Met.no, the nowcast, or the effective helper and stays byte-identical — that is what keeps CI green. Your
  e2e matrix must not require the real engine on the seed-path CI run (the `page.route` DTO mock keeps this true).

### Retro-note 10.4 R1 — the no-live-Met.no test-setup guard (AC4 fold-in)
A 10.4 unit test (`sun-engine.cloud-gate.atdd.test.ts` "no nowcast override (engine lazy path)") silently issued
a REAL outbound fetch to `api.met.no/nowcast/2.0/complete` on every run via an un-mocked lazy-import path — it
passed ONLY because the client catches all errors → `undefined` (non-gating), masking the live call. Green
vitest cannot detect a masked live call. The 10.4 review fixed THAT test (added `vi.mock('@/lib/weather/nowcast-service')`),
but the retro-note escalates it to an EPIC-WIDE invariant: **the no-live-Met.no discipline needs an explicit
fetch-stub guard in shared test setup, not just per-file mocks.** `test/setup/setup.ts` (the only vitest
`setupFiles` entry — verified) has NO global fetch stub today. Task 4 adds one that hard-fails any test making
an outbound `api.met.no` request. This is the single highest-value regression guard 10.5 can add, because it
prevents a WHOLE CLASS of masked-live-call regressions across every future engine/weather test.

### Retro-note: red scaffolds against future modules need runtime-variable import() (only if you scaffold)
`vite:import-analysis` resolves a string-literal `import('...')` specifier at transform time EVEN inside
`describe.skip`, so a red scaffold referencing a not-yet-existent module hard-breaks the whole vitest file at
import resolution (retro-notes 10.1 Phase-4 + 10.4 Phase-4). For 10.5 EVERY module already exists (this is a
verification/regression story), so static imports are fine — this only matters if you scaffold a placeholder
against something that does not exist yet (you should not need to). If you do, use a runtime-VARIABLE specifier
(`const M = '@/...'; await import(M)`), not a string literal.

### Test infra constraints (retro-notes 9-9 / 9-10 — READ before writing component/MapView tests)
- **MapView component test:** the shared map mock in `test/setup` hardcodes a **390×700 canvas** and jsdom has
  **no `matchMedia`** (always resolves the MOBILE branch). Keep any MapView-level assertion on the mobile /
  fixed-canvas path; do desktop-vs-mobile verification in the Playwright projects where a real viewport exists.
  For 10.5 the e2e matrix (Task 1) IS the right home for both-breakpoint presentation assertions — put them there,
  not in a jsdom MapView test.
- **CI e2e runs against `next dev`** (NODE_ENV=development), NOT a prod build (retro-note 9-0). So the `?_time=`
  forcing stays honoured and the `?_state` force-states + `page.route` mocks work in CI. If the webServer ever
  switches to a prod build, the `?_state`/`?_time` forcing is DCE'd — reopen then.
- **`--project=a11y-mobile` is NOT run in CI** (only `mobile`/`desktop`/`a11y` are — `build-and-test-nextjs.yml:110-113`).
  The 10.2 mobile obscured axe scans are `test.fixme` on the pre-existing Story-5.1 amber-label contrast debt; do
  NOT flip them (Story 5.1 owns that). Do NOT add your matrix to an axe spec (it would double-execute — retro R-007).

### Deferred-work items folded in (subject-overlap only — NONE reopened)
This is the final Epic-10 story, so deferred items whose subject overlaps this verification scope are surfaced.
Fold each in as a guard the dev ADDS or KNOWINGLY records as a maintainer follow-up — do NOT reopen unrelated
ledger items.
- **[10.2 code review — `toSunStatusToken` orphaned mapper; Target: None — conditional]**
  (`lib/utils/sun-status-presentation.ts:15`): the shared exhaustiveness mapper is consumed by no render surface
  (every surface branches inline on `CloudObscured`/`isObscuredSunStatus`). Your e2e matrix renders those SAME
  inline-branching surfaces, so it does NOT exercise `toSunStatusToken`. Do NOT wire it in or remove it here
  (out of scope — it is a design-deviation defer, not a runtime defect). If your matrix happens to prove a
  surface renders a state correctly that the mapper would have centralized, note it; otherwise leave the defer.
- **[10.1 R1 — `WeatherDataDto.cloudCover` required vs legacy optional; Target: None — conditional]**
  (`api.ts:284`): the legacy `sun-exposure-service` DTO, NOT on the live venues route, NOT touched by 10.5. Do
  NOT reopen.
- **[8.5 R1 — future-valid-time / dedupe-no-eviction / unparseable-entry.time; 8.7 elevation caps]:** engine/data
  robustness on the real path, not overlapping this verification/regression scope. Do NOT reopen.
- **[Consolidate — 10.2 obscured reference-PNG rebaseline; Target: None — maintainer rebaseline]:** the two 10.2
  obscured reference PNGs do not exist + host `/tmp` visual tooling is broken. The Design-Gate "10.2 references
  pass at both breakpoints" is BLOCKED on this maintainer rebaseline (an already-open 10.2 follow-up). Consolidate
  it into ONE clear maintainer follow-up in Completion Notes (which screens: `map-with-obscured-venue`,
  `venue-detail-obscured`, at mobile + desktop). Dev is FORBIDDEN from editing/creating reference PNGs.

### Engine / API boundary (AGENTS.md scope guardrail)
Client components must NEVER import `lib/weather` / `lib/solar` / `lib/services/sun-engine` / `lib/supabase` —
all data flows through `app/api/*` + hooks and arrives as `VenueDataDto`. 10.5 is verification + tests + (at most)
a dev-only forced-state or a copy edit; you do NOT touch the engine, route handler, or store. If you find
yourself editing tier logic (`sun-engine.ts`/`met-no-service.ts`/`nowcast-service.ts`/`effective-cloud-cover.ts`/
`confidence-calculator.ts`/`route.ts`/`venue-store.ts`) beyond adding a test AROUND it, STOP — that is out of
10.5 scope. Windows/PowerShell host: run vitest via `cd nextjs-app; npx vitest run`, Playwright via
`npx playwright test`. Do NOT run git — the orchestrator owns all git/PR work.

### Project Structure Notes
- **Files you create:** a new e2e matrix spec (e.g. `nextjs-app/test/e2e/epic-10-weather-matrix.spec.ts`), a
  net-new cross-tier byte-identical-geometry unit test (e.g. under `nextjs-app/test/unit/services/`).
- **Files you edit:** `nextjs-app/test/setup/setup.ts` (add the shared no-live-Met.no fetch guard); possibly
  `messages/{sv,en}/about.json` (ONLY if a claim is stale — likely no change); possibly `project-context.md`
  (ONLY if you add a new weather-scenario `_state` id — likely not, prefer the `page.route` DTO mock).
- **NO new dependency, NO schema/migration, NO new route, NO new component, NO new visual state, NO
  reference-PNG change.** If you find yourself creating a weather component, colour, or reference image, STOP —
  out of 10.5 scope (this is a verification story).
- Standard four-command gate on every test-file write (`tsc --noEmit` + `vitest run` + `eslint`). e2e runs
  explicitly via `npx playwright test --project=desktop --project=mobile <spec>` (not part of the vitest gate).

### References

**Primary project sources:**
- [Source: CLAUDE.md] → defers to [Source: AGENTS.md] — canonical AI-agent rulebook: API boundary (clients never
  import `lib/weather`/`lib/solar`/`lib/supabase`), Met.no TOS (identifying User-Agent, ≤4-decimal coords), the
  standard four-command test gate, "do NOT run git".
- [Source: project-context.md] — Screen ID → Route Map + `?_state`/`?_time` forcing convention + `test-venue-sunny`
  seed slug (register any new `_state` id here IF you add one).
- [Source: _bmad-output/planning-artifacts/architecture.md] — test organization (unit/components/e2e), CI/CD merge
  gates, client/server boundary, no live weather in tests.
- [Source: _bmad-output/planning-artifacts/prd.md#FR12] — the geometric + weather two-signal confidence blend the
  epic implemented; AC3 verifies the About copy describes it.

**Story-specific sources:**
- [Source: _bmad-output/planning-artifacts/epics.md#Story-10.5 (lines 2765-2789)] — the 4 verbatim ACs + the
  verification-story Design Gate. [Epic-10 preamble (2645-2659)] — the two-signal decision, the four tiers, the
  Tier-2 hard constraint, the physics guardrail, and the scope guardrails ("weather-state specs must mock the
  weather boundary deterministically or they will be sky-flaky").
- [Source: _bmad-output/implementation-artifacts/10-1-cloud-gated-sun-state-weather-truth-fixes.md] — the gate,
  `CLOUD_GATE_THRESHOLD_PERCENT=80`, `CloudObscured`, unknown-never-clear, confidence-blend tests (AC4 already-covered).
- [Source: _bmad-output/implementation-artifacts/10-2-sun-behind-clouds-two-signal-ui-state.md] — the muted obscured
  chrome + `data-testid`s (`quick-info-obscured`, `venue-detail-obscured`), the two obscured `_state` force-states,
  the obscured axe scans, the obscured reference-PNG rebaseline debt.
- [Source: _bmad-output/implementation-artifacts/10-3-layered-cloud-detail-met-no-complete-endpoint.md] — the
  `effectiveCloudCover` split (high cloud = 0.25) that makes the high-cirrus-only scenario NOT gate; `skyCondition`
  reads raw total.
- [Source: _bmad-output/implementation-artifacts/10-4-rain-now-signal-met-no-nowcast.md] — rain forces the gate,
  `skyCondition='rain'`, no-rain-inert tests, the `NOWCAST_HORIZON_MS` horizon, and the R1 review finding (a test
  silently hit live Met.no → the shared fetch-guard rationale).
- [Source: _bmad-output/implementation-artifacts/9-10-mobile-device-verification-pass-regression-guards.md] — the
  TWIN last-story-of-epic verification pass; its structure (verify-green + fill gaps + one investigation, honest
  `needs-human` handling of the manual spot-check, consolidated maintainer follow-ups) is the template for 10.5.
- [Source: _bmad-output/auto-bmad/retro-notes/epic-10.md] — R-005 (e2e determinism gap, `?_time=` pins wall clock
  not sky, 10.2 force-ids cover only obscured, 10.5 mock must cover the rest); the no-live-Met.no shared-setup guard
  (10.4 R1); `vite:import-analysis` resolves `import()` in `describe.skip` (runtime-variable specifier for future-module
  scaffolds); ratified engine facts (threshold 80, effectiveCloudCover weights, skyCondition raw-total with rain
  precedence, `NOWCAST_HORIZON_MS`, undefined-never-0).
- [Source: nextjs-app/playwright.config.ts:36-49] — the `mobile`/`desktop` projects (run the matrix under both);
  `a11y`/`a11y-mobile` projects run ONLY the axe specs (do NOT add the matrix there); webServer = `npm run dev`.
- [Source: .github/workflows/build-and-test-nextjs.yml:109-113] — CI runs `--project=mobile --project=desktop`
  then `--project=a11y` (NOT `a11y-mobile`); no `SUNNYSEAT_SUN_ENGINE` env ⇒ seed path ⇒ no live Met.no.
- [Source: nextjs-app/test/e2e/axe.spec.ts:41-69] — the 10.2 desktop obscured scans + the `ONBOARDED_FLAG_KEY`
  init-script bypass-onboarding pattern to reuse.
- [Source: nextjs-app/test/e2e/map-primary.spec.ts:206-214] — the `?_time=13:00` forcing pattern (page.route init
  script that sets `_time` if absent) to reuse for sun determinism.
- [Source: nextjs-app/components/custom/map/MapView.tsx:188-194,463-480,1277-1291] — `useForcedState`,
  `isForcedObscuredReference`, `normalizeForcedObscuredPin`/`normalizeForcedObscuredVenue` (the 10.2 obscured
  force-state; reuse for the obscured scenarios, do NOT rebuild).
- [Source: nextjs-app/lib/dev/use-forced-state.ts] — the prod-DCE `?_state` hook (register any new id in project-context.md).
- [Source: nextjs-app/lib/services/venues-fixture.ts] + [nextjs-app/lib/types/api.ts] — the `VenueDataDto` shape
  your `page.route` mock responses must match (read before hand-crafting a scenario DTO).
- [Source: nextjs-app/lib/services/sun-engine.ts:151,165,534-581,706-766] — `shouldUseRealSunEngine` (flag off in
  CI), the gate call site, `applyCloudGate`, `skyCondition` precedence, `skyConditionFromCloudCover(undefined)==='unavailable'`.
- [Source: nextjs-app/test/setup/setup.ts] — the ONLY vitest setup file; add the shared no-live-Met.no fetch guard here.
- [Source: nextjs-app/messages/sv/about.json + nextjs-app/messages/en/about.json] + [nextjs-app/test/components/AboutPage.test.tsx]
  — AC3 About copy to verify (already describes the blend) + parity guard.
- [Source: nextjs-app/test/unit/services/sun-engine.cloud-gate.atdd.test.ts] — the engine mock harness (injected
  forecast/nowcast overrides, NO network) to mirror for the net-new byte-identical-geometry cross-tier guard.
- **DESIGN.md, ux-design-specification.md are intentionally NOT primary references here:** 10.5 is a
  verification + regression story with NO new screen (the acceptance signal is the mocked-weather e2e matrix +
  the AC2 live spot-check + the AC4 regression net + the AC3 About-copy verification). There is no new visual
  surface to design or gate — consistent with the Stories 10.1/10.3/10.4 backend/verification precedent. The
  ONLY UI-adjacent change is a conditional copy edit (AC3, only if a claim is stale). The `frontend-component`
  skill is NOT triggered (no component is created or restyled). The one visual dependency — the Story 10.2
  obscured reference PNGs passing at both breakpoints — is a maintainer rebaseline follow-up (Design Gate above),
  not a dev-authored surface.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context) — auto-bmad dev-story delegate.

### Debug Log References

- Fresh HEAD vitest baseline (before edits): 118 files passed + 2 skipped (the red-phase scaffolds) /
  1099 passed + 8 skipped. `tsc --noEmit` 0 errors.
- Post-green-phase full vitest: **120 files / 1107 tests, 0 skipped.** `tsc --noEmit` 0 errors.
  `eslint .` 0 errors / 13 pre-existing warnings (untouched files).
- e2e matrix (`--project=desktop --project=mobile epic-10-weather-matrix.spec.ts`): 10/10 pass on a
  warm dev server; ZERO `api.met.no` requests observed in any test (belt-and-braces assertion green).
- Cross-tier confidence RED (investigated, not weakened): `expected 60 to be less than 60`. Root cause
  traced to `applyShadowDataCoverageCap` → `coverageCapForStatus('unknown') === 0.6` (all launch clusters
  ship `status:'unknown'` in `CONSERVATIVE_CLUSTER_COVERAGE`, no validation artifact). See Completion Notes.

### Completion Notes List

**Scope:** verification + regression story. No production runtime code changed. Files touched: two net-new
test files (un-skipped from the red-phase scaffolds), one shared-test-setup edit, one e2e spec (fleshed out
from the scaffold). No component, colour, i18n key, route, migration, or reference-PNG created (as designed).

**AC1 — deterministic mocked-weather e2e matrix (DONE, green).**
- Mechanism: `page.route` DTO fulfillment (the recommended default). Intercept the detail route
  `**/api/venues/<slug>*` first (specific) then the list route `**/api/venues?**`; `fulfill` a hand-crafted
  `GetVenuesResponse`/`GetVenueDetailResponse` per scenario. The venues route handler / engine / Met.no never
  run → fully deterministic, no real-engine flag, no live weather, zero production footprint.
- Deliberately did NOT reuse the 10.2 `?_state=map-with-obscured-venue` / `map-with-selected-venue` forced
  states: those apply `normalizeForcedObscuredVenue`/`normalizeForcedVisualVenue`, which OVERRIDE
  `currentSunStatus`/`skyCondition`/`confidence` and would clobber the mocked scenario. Plain `?venue=<slug>`
  deep-link (no forced state) drives the detail from the mocked DTO cleanly.
- Card vs detail seam: `?venue=<slug>` opens the detail overlay AND suppresses the quick-info card
  (`selectedPinData && !isVenueDetailRequested`, MapView.tsx). So the CARD is asserted by selecting the venue
  through the UI (desktop: pin click; mobile: the bottom-sheet `Välj Kafé Magasinet` list card — the mid-state
  sheet covers the projected pin), and the DETAIL by the `?venue=` deep-link.
- Scaffold correction: the mobile detail panel testid is `mobile-venue-detail-sheet`, not the scaffold's
  placeholder `venue-detail-panel`. Fixed.
- Assertions are RELATIVE (obscured-vs-amber via `quick-info-obscured`/`venue-detail-obscured`, geometric `95%`
  still visible on the obscured card, rain copy `Regn|Rain`, weather-missing ⇒ no sky line, non-obscured ⇒ NOT
  the overcast copy). No hardcoded cloud % or the 80 threshold → survives a future re-tune.
- Cold-start note: on a COLD local dev server the very first test can exceed the 30 s budget while Turbopack
  compiles the route on first hit (identical to every other e2e spec in this suite). CI sets `retries: 2`
  (documented in `playwright.config.ts`), which absorbs the warmed-second-attempt flake. In isolation and on a
  warm server all 10 pass cleanly.

**AC2 — live reality spot-check: `needs-human` maintainer step (protocol below, NOT fabricated).**
The dev agent cannot produce a genuine live sky observation. The exact protocol + comparison table for the
maintainer follows. AC2 does not "close" until the maintainer records the observation (and triages any
mismatch to a root cause before the epic closes).

_Steps for the maintainer (run on a real grey-or-clear day):_
1. Open the LIVE production site (real-engine flag ON): the map (`/`) and one venue detail on the current
   day. Screenshot each showing the headline sun state + the sky line.
2. Fetch the raw Met.no responses for central Gothenburg (`57.7089, 11.9746`) with the identifying
   User-Agent (`sunnyseat/… rasmus.thunborg@enhancior.se`):
   - Cloud split: `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=57.7089&lon=11.9746`
     → read `cloud_area_fraction` + `cloud_area_fraction_low` / `_medium` / `_high` for the current timestep.
   - Precipitation: `https://api.met.no/weatherapi/nowcast/2.0/complete?lat=57.7089&lon=11.9746`
     → read `precipitation_rate` for the near-now timestep.
3. Compute effective cover ≈ `low + medium + 0.25·high` (clamped 0..100). Fill the table; paste screenshots
   + fetched values here.
4. If observable sky / displayed state / fetched values disagree, TRIAGE to a root cause before the epic
   closes (may spawn a follow-up story).

---

#### AC2 RESULT — RECORDED 2026-07-03 (verdict: **AGREE**)

**Method — Met.no-as-ground-truth (documented contingency, no physical observer).** No human sky
eyeball was available, so per the epic's test-design contingency the *physical sky observation is
replaced by Met.no's own published values as ground truth*: the live displayed state is compared
against the raw Met.no `locationforecast/2.0/complete` cloud split + `nowcast/2.0/complete`
precipitation for the same instant, and the derived gate expectation. This is a data-vs-data
agreement check, not a data-vs-eyeball check — it fully catches the historical failure mode
("weather fetched but not consumed") since a broken pipeline would diverge from Met.no's own numbers,
but it cannot catch a case where Met.no itself disagrees with the actual sky (that residual needs the
maintainer's physical eyeball on a future grey/rain day and stays open below).

**Fetch context (all HTTP 200):**
- **Live API:** `GET https://sunnyseat.vercel.app/api/venues?lat=57.7089&lng=11.9746&radius=2`
  fetched `2026-07-03T15:17:03Z`. `meta.sunDataSource='weather'` (real two-signal path ON),
  `meta.weatherUpdatedAt='2026-07-03T15:00:00Z'` (the 15:00 UTC compute-cache bucket) — so the app's
  weather corresponds to Met.no's **15:00Z** timestep, which is what is used as ground truth below.
- **Met.no locationforecast `complete`** (UA `SunnySeat/1.0 rasmus.thunborg@enhancior.se`), 15:00Z
  timestep: `cloud_area_fraction=38.3` (raw total), `_low=12.3`, `_medium=29.7`, `_high=1.2`
  (symbol `fair_day`, next_1h precip 0). (16:00Z for reference: raw 16.5 / low 4.8 / med 12.3 / high 0.)
- **Met.no nowcast `2.0/complete`** (same UA), near-now (15:15–15:30Z): `precipitation_rate = 0` at
  every step ⇒ **no rain**.
- **Computed effective cover** = clamp(1.0·12.3 + 1.0·29.7 + 0.25·1.2, 0, 100) = **42.3** (< 80 gate
  threshold). Raw-total sky label expectation: 20 ≤ 38.3 ≤ 60 ⇒ `partly-cloudy`
  (`skyConditionFromCloudCover`, sun-engine.ts:767-769).
- **Expected gating:** effective 42.3 < 80 AND precip 0 ⇒ **NO `CloudObscured` gate on any venue**;
  `skyCondition` = the raw-total label `partly-cloudy`; no `rain`. (Daylight: ~17:17 local, sun well
  up — sunWindows span into the evening — so the gate check is NON-vacuous: geometrically-sunlit
  venues ARE eligible to be gated and correctly are not.)

**Per-venue displayed vs expected (7 of 7 venues in the 2 km fetch — all agree):**

| Venue (slug) | Displayed `currentSunStatus` | Displayed `skyCondition` | `sunExposure%` | Gate-eligible? (isSunVisible) | Expected gate | Displayed gate | Expected `skyCondition` | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Skuggans Hus (`skuggans-hus`) | Sunny | partly-cloudy | 100 | yes | none (eff 42.3<80, no rain) | none | partly-cloudy | **AGREE** |
| Kafé Magasinet (`test-venue-sunny`) | Sunny | partly-cloudy | 82 | yes | none | none | partly-cloudy | **AGREE** |
| Brygghuset Lerum (`brygghuset-lerum`) | Sunny | partly-cloudy | 100 | yes | none | none | partly-cloudy | **AGREE** |
| Bryggerietsoltak (`bryggeriet-soltak`) | Sunny | partly-cloudy | 100 | yes | none | none | partly-cloudy | **AGREE** |
| Bistro Bakgården (`bistro-bakgarden`) | Partial | partly-cloudy | 52 | yes | none | none | partly-cloudy | **AGREE** |
| Café Halvvägs (`cafe-halvvags`) | Partial | partly-cloudy | 42 | yes | none | none | partly-cloudy | **AGREE** |
| Solplats Magasinsgatan (`solplats-magasinsgatan`) | Shaded | partly-cloudy | 23 | no (never gated) | none | none | partly-cloudy | **AGREE** |

**Verdict: AGREE (no mismatch).** With effective cover 42.3 % (well below the 80 % gate) and zero
precipitation at the app's own 15:00Z weather bucket, the two-signal gate must NOT fire — and it does
not: every geometrically-sunlit venue renders its geometric state (Sunny/Partial) rather than
`CloudObscured`, and every venue's `skyCondition` is exactly the `partly-cloudy` label the raw 38.3 %
total maps to. `sunDataSource='weather'` confirms the live production path genuinely blended the
Met.no signal (not a fixture/geometry-only fallback). No venue is `CloudObscured`, none carries
`skyCondition='rain'`, consistent with a clear-ish, dry sky. The pipeline is consuming the weather it
fetches.

**Tolerances applied / caveats:**
- **Compute-cache bucket:** the app's weather is the 15:00Z bucket (15-min compute cache); ground
  truth read from the identical 15:00Z Met.no timestep, so no bucket skew. The 16:00Z step (even
  clearer, raw 16.5) would also be non-gating, so the conclusion is robust to a one-bucket slip.
- **Weather far below threshold:** this was a fair, dry afternoon (effective 42 « 80) — a benign case
  that proves the "sunny-when-clear" path but does NOT exercise the OBSCURED/rain gate against a real
  overcast/rainy sky. The gate *firing* under real ≥80 or real rain is proven only by the AC1 mocked
  matrix + AC4 unit guards, not yet by a live grey/rain-day observation.
- **No physical eyeball:** Met.no is treated as ground truth (contingency method). A residual
  maintainer follow-up remains: repeat this spot-check on a genuinely overcast or rainy Gothenburg
  day AND confirm against the actual sky, to close the data-vs-reality half AC2's verbatim wording
  ("match the observable sky") asks for. Recorded as a deferred maintainer item, not a defect.

_Original maintainer eyeball-protocol template (retained for the future grey/rain-day check):_

| Observable sky (eyeball) | Displayed headline state | Displayed sky line | Fetched effective cloud (low+med+0.25·high) | Fetched precip_rate | Match? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| _(grey/clear/rain)_ | _(Sunny / CloudObscured / …)_ | _(Sol bakom moln / Regn / none)_ | _(value)_ | _(value)_ | _(Y/N)_ | _(triage if N)_ |

**AC3 — About copy: VERIFIED TRUTHFUL, no change needed.**
`messages/{sv,en}/about.json` already truthfully describes the shipped two-signal model:
`algorithmBody` = geometry+weather blend ("så att en plats som ligger i moln inte räknas som solig" / "a place
under cloud is not counted as sunny"); `sourceMetnoDesc` cites clouds AND precipitation; `accuracyBody` is
honest ("vägledning, inte som garanti" / "guidance, not a guarantee"). No line implies geometry-only, no line
over-claims per-venue cloud precision (physics guardrail). No churn. `messages-parity` (18) + `AboutPage.test.tsx`
(9) green.

**AC4 — regression guards.**
- NET-NEW #1 (byte-identical geometry): PASS. Across all five weather variations for the same geometry+instant,
  `sunExposurePercent` and `sunWindow` are byte-identical while only status/sky/confidence vary. Weather-missing
  never fabricates clear (`skyCondition === 'unavailable'`, not gated). This is the two-signal guarantee no
  single-tier test pinned before.
- **FINDING (surfaced by the confidence clause; NOT a two-signal defect):** the AC4 "confidence at 100% cloud <
  confidence at 0% cloud" clause was RED at the *displayed-engine* level — both returned exactly 60. Root cause:
  the conservative shadow-data-coverage cap. Every launch cluster ships `status:'unknown'` in
  `CONSERVATIVE_CLUSTER_COVERAGE` (no validation artifact loaded), `coverageCapForStatus('unknown') === 0.6`, and
  `applyConfidenceCaps` clips BOTH the clear and overcast outcomes to 0.6 → displayed 60. The FR12 cloud term
  genuinely fires BELOW that cap, so its effect is clipped from the *displayed number* for any venue the coverage
  gate has not marked `eligible`. This is a pre-existing intentional cap (Story 3.0.5), not an Epic-10 regression.
  Resolution: assert the FR12 blend at the confidence-CALCULATOR layer (`calculateConfidenceFactors`, eligible
  coverage, the SAME cloud slices the engine feeds) where it is observable — matching the already-green 10.1 AC3
  test `confidence-calculator.cloud-gate.atdd.test.ts`. Documented inline in the test. The assertion was NOT
  weakened; it was moved to the layer where the property is guaranteed. See Deferred/Follow-ups.
- NET-NEW #2 (shared no-live-Met.no fetch guard): added to `test/setup/setup.ts`. A `beforeEach` wraps
  `globalThis.fetch`; any outbound request whose host is `api.met.no` is REJECTED with a clear guard message;
  relative/same-origin and all other hosts pass through untouched. **Scoped to `api.met.no` only** (deliberately
  NOT all external hosts — the broad form would trap benign absolute thumbnail URLs some tests construct; verified
  the surgical scope keeps the full suite green). Acceptance test green (3/3), full suite unchanged (still 120/1107).
- Already-covered invariants re-verified green: 100%-cloud⇒obscured/no-amber, missing-cloud⇒never-clear,
  rain-forces-obscured, no-rain-inert (`sun-engine.cloud-gate.atdd.test.ts`), confidence blend
  (`confidence-calculator.cloud-gate.atdd.test.ts`).

**Design Gate (verification story — no new UI).** No new screenshot target added. The two Story 10.2 obscured
reference PNGs (`map-with-obscured-venue`, `venue-detail-obscured`, at mobile + desktop) still DO NOT EXIST and
the host `visual-validate.sh` cannot run on this Windows machine (`/tmp/impl-*.png` unwritable, retro-note 9-2).
"10.2 references pass at both breakpoints" remains BLOCKED on a MAINTAINER rebaseline (an already-open 10.2
follow-up). The dev agent is forbidden from creating/editing reference PNGs and did not. The e2e matrix + the
AC4 regression net are the behavioural gate; the AC2 live spot-check is the maintainer's reality gate.

**Deferred / maintainer follow-ups:**
1. **[AC2 — live reality spot-check]** `needs-human`: maintainer runs the protocol above on a real day and
   records the observation (screenshots + fetched values) before the epic closes.
2. **[Design Gate — 10.2 obscured reference-PNG rebaseline]** maintainer rebaseline of `map-with-obscured-venue`
   + `venue-detail-obscured` at mobile + desktop (host `/tmp` visual tooling is broken; dev forbidden from
   editing PNGs). Consolidated single follow-up — an already-open 10.2 item.
3. **[Displayed-confidence coverage cap flattens the FR12 cloud signal]** (finding, NOT reopened here): for
   unvalidated venues (all clusters today), the shadow-coverage 0.6 cap clips the displayed confidence so the
   "more cloud ⇒ lower displayed confidence" property is not visible to users until a cluster is marked
   `eligible` via a validation artifact. Consider whether this is acceptable product behaviour or whether the
   cloud term should apply before/independent of the coverage cap. Out of 10.5 scope (engine change).

### File List

- `nextjs-app/test/e2e/epic-10-weather-matrix.spec.ts` — NEW (fleshed out from red scaffold): AC1 deterministic
  mocked-weather e2e matrix, 5 scenarios × desktop+mobile, `page.route` DTO fulfillment, no-live-Met.no guard.
  EDITED (review R1, 2026-07-03): added the AC1 #5 freshness/uncertainty-signal assertion — `expectConfidenceBadge`
  scenario flag + card confidence-badge present/absent check (weather-missing absent vs clear-control present).
- `nextjs-app/test/unit/services/sun-engine.two-signal-invariants.atdd.test.ts` — NEW (un-skipped + confidence
  clause re-homed to the calculator layer): AC4 net-new byte-identical-geometry cross-tier guard.
- `nextjs-app/test/unit/no-live-metno-fetch-guard.atdd.test.ts` — NEW (un-skipped): acceptance test for the
  shared fetch guard.
- `nextjs-app/test/unit/no-live-metno-fetch-guard.coverage.test.ts` — NEW (test-automation expansion pass,
  2026-07-03): 9 tests hardening the guard's `isApiMetNoRequest` host-matching — input-shape coverage
  (URL/Request/case), exact-host discipline (suffix-spoof / prefix / non-api met.no all NOT trapped), and
  surgical pass-through of other external hosts. Residual gap around net-new Story-10.5 code; not a matrix duplicate.
- `nextjs-app/test/setup/setup.ts` — EDITED: added the shared no-live-Met.no `beforeEach` fetch guard (scoped to
  `api.met.no`).
- `_bmad-output/test-artifacts/atdd-checklist-10-5.md` — EDITED: green-phase checkboxes ticked + notes.

### Change Log

- 2026-07-03 — Story 10.5 implemented. Un-skipped the three red-phase ATDD scaffolds and completed them:
  (1) the AC1 e2e weather matrix (DTO builders, mobile-testid fix, card-via-UI + detail-via-deep-link,
  sky-line assertions); (2) the AC4 byte-identical-geometry cross-tier guard (green; confidence clause
  re-homed to the confidence-calculator layer after surfacing the coverage-cap finding); (3) the AC4 shared
  no-live-Met.no fetch guard (added to `test/setup/setup.ts`, scoped to `api.met.no`). AC3 About copy verified
  truthful (no change). AC2 live spot-check handed to the maintainer as a recorded `needs-human` step. Full
  gate green: tsc 0, eslint 0 errors, vitest 120 files / 1107 tests 0 skipped, e2e matrix 10/10 (zero met.no hits).
- 2026-07-03 — Code-review R1 fix (the single open `[Review][Patch][Med]`): closed the unverified half of AC1 #5
  by asserting the weather-missing freshness/uncertainty signal in the e2e matrix — the card confidence badge is
  now asserted ABSENT for weather-missing (geometry-only) vs PRESENT for the clear control. tsc clean; matrix
  10/10 green (desktop+mobile), zero met.no hits. No production code changed.

### Review Findings

_Triage of code review (2026-07-03). Source: Tier-A thin review — Acceptance Auditor lens (reviewer `primary`) + dedicated security review (0 findings). Blind/Edge lenses deliberately did not run in this epic-mode thin pass. Deduped, classified, Low-selectivity applied._

- [x] [Review][Patch][Med] AC1 scenario 5 (weather-missing) freshness/uncertainty signal is set up in the mock but never asserted [nextjs-app/test/e2e/epic-10-weather-matrix.spec.ts:346] — The mock sets `meta.sunDataSource='geometry-only'` (and omits `weatherUpdatedAt`) for weather-missing, but the only presentation assertions are `expectNoSkyLine` + `not.toContainText(overcast)`. The AC1 reading (story lines 66–68) explicitly requires the "freshness/uncertainty signal reflects the missing weather." Verified this IS observable at the presentation layer: `getConfidenceDisplayState` (`lib/utils/confidence-display.ts:36`) returns `kind:'hidden'` / `visibleText:null` when `sunDataSource==='geometry-only'`, so the confidence `%` badge is HIDDEN for weather-missing but rendered for clear/cirrus. Fix: in `assertCardAndPin`/`assertDetail`, add an assertion for the weather-missing scenario that the confidence signal is absent/hidden (vs present for a `weather`-sourced scenario) — closing the unverified half of AC1 #5. **RESOLVED 2026-07-03:** added an `expectConfidenceBadge` flag to the scenario spec (`false` for `weather-missing`, `true` for the `clear` control) and an assertion in `assertCardAndPin` on the card confidence badge (`Säkerhet:|Confidence:` label — distinct from the geometric "% SOL" thumbnail badge): the badge is asserted ABSENT for weather-missing and PRESENT for the clear control, so the two byte-identical-geometry non-obscured cards are now distinguished by the freshness/uncertainty signal. The card is the correct surface (the detail overlay renders confidence only as sr-only accessible text; the obscured cards suppress the amber confidence chip regardless, so the assertion is scoped to the non-obscured opt-in scenarios). `quickInfoConfidenceMeta` falls back to the mocked list-response `meta` (`MapView.tsx:760-762`, `isForcedVisualReference` false in these tests), so the mocked `sunDataSource`/`weatherUpdatedAt` genuinely drives the display. tsc clean; the matrix runs 10/10 green (desktop+mobile), zero met.no hits.
- [x] [Review][Defer][Med] AC1 does not differentiate scenario 2 (clear) from scenario 3 (high-cirrus-only) at the presentation layer [nextjs-app/test/e2e/epic-10-weather-matrix.spec.ts:120] — Both non-obscured DTOs render byte-identically (amber Sunny, `95%`, no obscured chrome; the sky line renders only inside the `isObscured` block), so the matrix would still pass if `high-cirrus-only` were dropped or set to `skyCondition:'clear'`. The "thin cirrus ≠ blocking stratus" differentiator IS guarded — at the engine layer, in the net-new `sun-engine.two-signal-invariants.atdd.test.ts` (high-cirrus-only NOT obscured vs overcast obscured), exactly where the story states the gate is "already exhaustively unit-tested" and mocking at the DTO boundary is "the right altitude." The residual presentation-layer non-distinction is correct-by-design (the app intentionally shows both as amber Sunny). Deferred — minor e2e presentation-coverage gap, differentiator is guarded at the engine layer.
- [x] [Review][Defer][Low] Shared no-live-Met.no fetch guard `afterEach` never restores the original fetch, so guards nest across every test [nextjs-app/test/setup/setup.ts:54] — `beforeEach` captures `realFetch = globalThis.fetch` (the prior test's `guardedFetch`) and the paired `afterEach` is a deliberate no-op, so a fresh wrapper nests on every test for the whole run. Behaviourally idempotent for the met.no check and the full suite is verified green, but it leaves a latent cross-test leakage path: if a future test installs its own `globalThis.fetch` stub without restoring it, the next `beforeEach` captures that leftover as `realFetch`. The clean equivalent (a `vi.stubGlobal('fetch', …)` + `vi.unstubAllGlobals()` in `afterEach`, as the red scaffold itself suggested) removes the nesting. Deferred — minor test-infra hygiene, not a correctness defect.

Dismissed (noise / handled elsewhere): L2 (AC4 confidence guarded at calculator layer not displayed-engine layer) — story-sanctioned and already logged as maintainer follow-up #3 (Completion Notes lines 528–538, 561–565); the displayed-layer flattening is a pre-existing intentional Story-3.0.5 coverage cap, not a defect of this change. L3 (e2e asserts no `peakTime`/`sunWindow` copy) — coverage preference; the byte-identical-geometry invariant is guarded at the unit layer (`sun-engine.two-signal-invariants.atdd.test.ts`) and the `%` badge proves geometry visibility, no concrete wrong behaviour.
