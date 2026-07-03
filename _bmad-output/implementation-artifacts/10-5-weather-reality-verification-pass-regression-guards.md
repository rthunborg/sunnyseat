# Story 10.5: Weather-Reality Verification Pass & Regression Guards

Status: ready-for-dev

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

- [ ] **Task 1 — Build the deterministic mocked-weather e2e matrix (AC1)**
  - [ ] Decide the deterministic mechanism (see Dev Notes "How to mock the weather boundary
        deterministically"). **Default recommendation:** intercept `**/api/venues*` (and
        `**/api/venues/*` for detail) with Playwright `page.route(...).fulfill(...)`, returning a
        hand-crafted `VenueDataDto` list/detail response per scenario. This exercises the REAL render
        surfaces end-to-end (card + pin + detail), needs NO live Met.no, no real-engine flag, and stays
        green on CI's seed path. The 10.2 `?_state` force-state normalizers are the fallback/complement
        for the two obscured scenarios they already cover — do NOT rebuild what 10.2 shipped; cover the
        THREE scenarios 10.2 does not (clear-sunny, high-cirrus-only-sunny, weather-missing-ungated).
  - [ ] Add a new spec (e.g. `test/e2e/epic-10-weather-matrix.spec.ts`) that runs under BOTH
        `--project=desktop` and `--project=mobile` (the matrix must hold at both breakpoints — the Design
        Gate says "both breakpoints"). Force `?_time=13:00` so the sun is deterministically up (retro-note:
        `?_time=` pins wall clock only, the weather MOCK pins the sky — together they are fully
        deterministic). Bypass onboarding via the `ONBOARDED_FLAG_KEY` init-script pattern used across the
        e2e suite.
  - [ ] Assert the five scenarios on card + pin + detail (per AC1 reading):
    1. **overcast ≥ threshold** ⇒ muted obscured chrome: `[data-testid="quick-info-obscured"]` /
       `[data-testid="venue-detail-obscured"]` present, NO amber FULL SOL / sun badge, the obscured pill,
       and the geometric `%` STILL visible (reframed "solläge"). (Reuse the 10.2 `data-testid`s.)
    2. **clear** ⇒ amber Sunny: obscured testids ABSENT, FULL SOL / amber badge present, no sky-obscured line.
    3. **high-cirrus-only** ⇒ Sunny (NOT gated): obscured testids ABSENT (effective cover from high cloud
       alone stays < 80), amber Sunny — the 10.3 differentiator. If the plain-language sky line renders,
       assert it is NOT the overcast/obscured copy.
    4. **active rain** ⇒ obscured chrome + rain sky copy: obscured testids present, the `skyCondition='rain'`
       plain-language copy ("Regn"/"Rain") on the sky line.
    5. **weather-missing** ⇒ ungated-with-uncertainty: obscured testids ABSENT (no fabricated clear sky —
       geometry governs), NO sky line (`skyCondition='unavailable'` ⇒ never rendered, 10.2), and the
       weather-missing freshness/uncertainty signal present if surfaced.
  - [ ] **No live Met.no in CI:** if you turn the real engine ON in the spec to exercise the gate, you MUST
        stub the Met.no fetch (`page.route('**api.met.no/**')` or the injected forecast/nowcast overrides) so
        no outbound request leaves CI. The `page.route`-fulfill-the-DTO approach avoids this entirely (the
        engine never runs). State the choice in Completion Notes. Assert RELATIVE presentation, not an
        absolute cloud % (relative-boundary discipline).

- [ ] **Task 2 — Provide the AC2 live-reality spot-check protocol + hand to maintainer (`needs-human`)**
  - [ ] Write, in this story's Dev Agent Record, the exact spot-check protocol the maintainer runs: the live
        URL(s) to open (production map + a venue detail on the current day), the raw Met.no endpoints to fetch
        for central Gothenburg (`https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=57.7089&lon=11.9746`
        for cloud split, `https://api.met.no/weatherapi/nowcast/2.0/complete?lat=57.7089&lon=11.9746` for
        precipitation_rate — with the identifying User-Agent), and the comparison table to fill (observable sky
        vs displayed state vs fetched cloud/precip values), with slots to paste screenshots + fetched values.
  - [ ] Mark AC2 as a recorded `needs-human` maintainer step — the dev agent does NOT self-fabricate a live sky
        observation or a PASS. If any live mismatch is later found, it is triaged to a root cause before the epic
        closes (that triage may spawn a follow-up story). Record this honestly.

- [ ] **Task 3 — Verify the About copy is still truthful + `sv`/`en` parity (AC3)**
  - [ ] Read `messages/{sv,en}/about.json` and the About page component. Confirm every claim is truthful for
        the shipped two-signal model: the algorithm body describes geometry + weather blend (already does),
        the Met.no data source cites clouds + precipitation (already does), the accuracy copy is honest
        ("vägledning, inte garanti"), and NO line (a) implies a geometry-only model, or (b) over-claims
        per-venue cloud precision (physics guardrail, epics.md:2657).
  - [ ] If a claim is stale, update it in BOTH locales (parity-guarded). If nothing is stale, record
        "verified truthful — no copy change needed" in Completion Notes. Either way, confirm
        `test/unit/messages-parity.test.ts` is green and (if `AboutPage.test.tsx` asserts copy) that it still passes.

- [ ] **Task 4 — Consolidate + fill the AC4 regression guards**
  - [ ] VERIFY each ALREADY-covered invariant is present + green (do NOT duplicate/rewrite — reference/extend):
    - **100% cloud ⇒ CloudObscured (never FULL SOL):** `test/unit/services/sun-engine.cloud-gate.atdd.test.ts`
      (10.1 gate tests) + the 10.2 component tests asserting no amber under the gate on each surface. Confirm green.
    - **Missing cloud ⇒ never clear:** 10.1 AC2 test (missing `cloud_area_fraction` ⇒ weather-unknown, no
      fabricated clear); `skyConditionFromCloudCover(undefined) === 'unavailable'`. Confirm green.
    - **Confidence 100% cloud < 0% cloud:** 10.1 AC3 red-first confidence test. Confirm green.
    - **Rain forces obscured / no-rain changes nothing:** the 10.4 `[10.4 AC2]`/`[10.4 AC3]` describes. Confirm green.
  - [ ] ADD the ONE genuinely-new cross-tier invariant (AC4's byte-identical-geometry clause): a test that runs
        the engine (or asserts on the DTO) for the SAME venue geometry + instant across the five weather variations
        and asserts `sunExposurePercent` and `sunWindow` are **byte-identical** while ONLY `currentSunStatus` /
        `skyCondition` / `confidence` differ. Put it at the engine/unit level (`test/unit/services/`) mirroring the
        existing `sun-engine.cloud-gate.atdd.test.ts` mock harness (inject forecast + nowcast overrides — NO live
        network). This is the two-signal guarantee, and no single-tier test pins it today.
  - [ ] **Fold in the epic-wide no-live-Met.no guard (retro-note 10.4 R1):** a unit test was caught silently
        issuing a live `api.met.no` fetch via an un-mocked lazy-import path (it passed only because errors swallow
        to `undefined`). Add a **shared-setup fetch guard** in `test/setup/setup.ts` (there is NO global fetch stub
        there today — verified): a `beforeEach`/`afterEach` that installs a `vi.stubGlobal('fetch', …)` (or wraps
        the real fetch) which THROWS if any test attempts an outbound request to an `api.met.no` host, so a masked
        live call becomes a hard failure instead of a silent pass. Keep it surgical — allow same-origin/relative
        URLs and MSW-style mocks; ONLY trap real `api.met.no` (and, defensively, any absolute `http(s)://` to an
        external host if that does not break existing tests — verify against the full suite; if it does, scope to
        `api.met.no` only and note it). This is the honest way to enforce the "no live Met.no in any test"
        invariant the epic ratified.
  - [ ] Run the full gate (Task 5). Every net-new/un-skipped guard is red-first where it exercises new logic.

- [ ] **Task 5 — Verify gates + record decisions**
  - [ ] Fresh HEAD vitest baseline BEFORE edits: **118 test files** on this branch (10.4 finished 117 vitest
        files / 1089 tests → +1 from the 10.4 review fetch-mock fix; measure fresh at start). The vitest/e2e count
        is expected to INCREASE (the new cross-tier byte-identical guard + the shared fetch guard + the new e2e
        matrix spec); NONE dropped.
  - [ ] Standard four-command gate from `nextjs-app/`: `npx tsc --noEmit` (0 errors), `npx eslint .` (0 errors;
        note pre-existing warnings, add none), `npx vitest run` (all green, 0 unexpected skips), and
        messages-parity green.
  - [ ] Run the e2e matrix explicitly: `npx playwright test --project=desktop --project=mobile
        test/e2e/epic-10-weather-matrix.spec.ts` (e2e is NOT part of the vitest gate). Record pass/fail per
        scenario. Note any PRE-EXISTING e2e reds you observe (e.g. the desktop `map-primary.spec.ts` planner-bar
        width red is pre-existing on `main`, retro-note 9-0 — do NOT try to fix it here; confirm still-red and
        report). Confirm NO outbound `api.met.no` request fired during the run.
  - [ ] Record all decisions in Completion Notes.

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

### Debug Log References

### Completion Notes List

### File List

### Change Log

### Review Findings
