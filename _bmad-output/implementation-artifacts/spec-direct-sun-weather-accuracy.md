---
title: 'Direct-Sun Truth and Weather-Decision Correction'
type: 'bugfix'
created: '2026-09-03'
status: 'done'
baseline_commit: '16dea3bd4529b60e793e33b52e67e698af924fd2'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/nextjs-app/docs/design/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Fresh complete-overcast data can produce a sunny result because snapshot gating uses divergent cloud math, `unknown` is publicly affirmative, and UI presents clear-sky geometry as actual sunlight.

**Approach:** Separate clear-sky geometry from a `likely / blocked / unknown` direct-sun state shared by snapshot-only APIs and Swedish-first UI.

## Boundaries & Constraints

**Always:** Actual sunlight means direct beam can reach the polygon geometrically and fresh, coherent forecast evidence supports it; diffuse daylight is not direct sun. Geometry ≤50% is `blocked`; positive geometry with indeterminate weather is `unknown`. Initially, `likely` requires valid total/layer cloud and fog ≤20%, zero precipitation, and a clear/fair symbol. Obstruction ≥80%, precipitation, or a blocking symbol is `blocked`; 20–80% and incomplete/unmatched/malformed/contradictory evidence are `unknown`. Use `clamp(low + medium + 0.25 × high, 0, 100)` plus raw total. Preserve the two-hour TTL, 90-minute match, accessibility, reduced motion, performance budgets, and provider-free reads.

**Ask First:** Changing 20/80; adding a provider, scheduler, migration, telemetry, or rebaseline; removing clear-sky potential.

**Never:** Treat stale/missing/legacy-incomplete weather as clear; extend TTL; derive visibility from fog; change production state/secrets; reopen Epic 12 or merge into Story 13.1.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Behavior |
|----------|---------------|-------------------|
| Clear | Geometry >50%; complete clear/fair evidence ≤20% | `likely`; direct-sun copy/amber |
| Broken clouds | Geometry >50%; obstruction 20–80% | `unknown`; clear-sky potential only |
| Overcast fixture | Geometry 95%; total 100, low 0, medium 100, high 0 | `blocked`; no sunny/rank/window/peak path |
| Precipitation | Positive amount or precipitation symbol | `blocked` with reason |
| Fog | Fog ≥80% or fog symbol; partial fog | `blocked`; partial is `unknown` |
| Stale/missing | Expired, absent, or unmatched snapshot | `unknown` for positive geometry |
| Incomplete | Required field absent or invalid | `unknown` until refreshed |
| Contradictory | Clear symbol conflicts with overcast metrics | `unknown` absent an independent blocker |

</frozen-after-approval>

## Code Map

- `nextjs-app/lib/weather/**`, `lib/solar/effective-cloud-cover.ts`, `lib/services/weather-snapshots.ts`, `scripts/refresh-weather-snapshots.ts` -- parse, persist, normalize, classify.
- `nextjs-app/lib/{types/api,utils/public-sun}.ts`, `app/api/venues/**` -- serialize verdicts, ordering, windows, and peaks.
- `nextjs-app/components/{custom,composed}/**`, `lib/utils/venue-*.ts`, `messages/{sv,en}/**` -- current/scrubbed UI and accessibility.
- Planning artifacts, `project-context.md`, and launch handoff -- durable decisions and gates.

## Tasks & Acceptance

**Execution:**
- [x] Add classifier/reason codes. Parse/store total/layer cloud, fog, next-hour precipitation, and symbol; never synthesize visibility.
- [x] Remove divergent math and every `gate !== gated` sunny assumption; retain separately named geometry.
- [x] Extend current/day-series DTOs, scrubbing, feedback evidence, ordering, windows, peaks, and APIs. Legacy rows fail safe; public reads stay provider-free.
- [x] Update pins, cards, quick info, detail, bilingual copy, forced states, and ARIA so unknown is neutral, never sunny.
- [x] Cover the matrix, match/DST boundaries, cache transitions, serialization, and no-provider invariant at unit, integration, API, component, and Playwright levels.
- [x] Write a dated brief with trace, reproduction, facts/hypotheses, ranked causes, official Met.no limits, options, telemetry design, and calibration experiment. Amend PRD, architecture, UX, Epic 14, project context, and launch handoff; preserve prior history.

**Acceptance Criteria:**
- The medium-layer overcast fixture is `blocked` through persisted APIs; no surface gives it amber, sunny copy, ranking, peak, or sun window.
- Unknown weather uses uncertain wording and labels geometry only as clear-sky potential on current/scrubbed views.
- Public venue-route tests observe zero calls to live provider adapters.
- Durable documents define one contract and separate this blocker from scheduler reliability.

## Spec Change Log

- 2026-09-03: Applied all eight confirmed findings from the independent
  post-implementation review. The pass preserves the approved product contract
  while hardening timestamped Nowcast persistence, malformed snapshot handling,
  DTO coherence, evidence provenance/confidence, qualifying-window status, test
  fixtures, and the controlling UX/Epic documentation. No P0 finding was
  reported, and `bmad-correct-course` was not required because no product intent
  or architecture decision was renegotiated.
- 2026-09-03: Implemented the approved conservative direct-sun contract and
  documented the staged route toward field-calibrated geometry, shadows,
  weather, and venue polygons. No production state, schedules, TTL, provider,
  schema, deployment configuration, or telemetry sink changed.
- 2026-09-03: Three independent review passes found and resolved timestamp-key
  bypass, distant/invalid forecast matching, unknown-nowcast dry promotion,
  malformed runtime evidence, contradictory sky labels, neutral-card colour,
  active PRD/UX predicate drift, and missing edge regressions. Temporal
  freshness remains an adapter responsibility; the classifier receives only
  admitted evidence.

### External Review Findings (2026-09-03)

- [x] **[Review][P1] Preserve positive near-now rain across an hourly forecast
  boundary.** Nowcast persistence carries the provider observation timestamp,
  admits only a bounded current observation, and attaches it to one nearest
  forecast slice rather than requiring that slice to begin after refresh time or
  smearing one observation across the horizon.
  [`nowcast-service.ts:88`](../../nextjs-app/lib/weather/nowcast-service.ts#L88)
  [`weather-snapshots.ts:88`](../../nextjs-app/lib/services/weather-snapshots.ts#L88)
  [`weather-snapshots.direct-sun.test.ts:73`](../../nextjs-app/test/unit/services/weather-snapshots.direct-sun.test.ts#L73)
- [x] **[Review][P1] Fail closed on malformed persisted snapshot arrays.** The
  JSON boundary discards nulls, primitives, invalid timestamps, and invalid
  fields; mixed arrays retain valid evidence, while all-malformed arrays become
  weather-unknown without a route exception.
  [`weather-snapshots.ts:70`](../../nextjs-app/lib/services/weather-snapshots.ts#L70)
  [`persisted-sun-read-batching.automate.test.ts:398`](../../nextjs-app/test/unit/services/persisted-sun-read-batching.automate.test.ts#L398)
  [`story-12-3-persisted-geometry-route.atdd.test.ts:300`](../../nextjs-app/test/unit/api/story-12-3-persisted-geometry-route.atdd.test.ts#L300)
  [`story-12-3-persisted-geometry-route.atdd.test.ts:359`](../../nextjs-app/test/unit/api/story-12-3-persisted-geometry-route.atdd.test.ts#L359)
- [x] **[Review][P2] Neutralize contradictory affirmative DTOs.** A legacy or
  malformed `CloudObscured + gated + likely` tuple is normalized to unknown, and
  the shared public predicate independently requires `not_gated` before amber,
  ranking, windows, or peaks are possible.
  [`venues-fixture.ts:361`](../../nextjs-app/lib/services/venues-fixture.ts#L361)
  [`public-sun.ts:37`](../../nextjs-app/lib/utils/public-sun.ts#L37)
  [`venues-route.cloud-gate.atdd.test.ts:81`](../../nextjs-app/test/unit/api/venues-route.cloud-gate.atdd.test.ts#L81)
- [x] **[Review][P2] Derive provenance and confidence from request-relevant
  evidence.** A nominally ready row with an invalid update time, invalid
  provider valid-times, no nearby evidence, or an empty sanitized body is
  reported as geometry-only and receives the existing confidence cap.
  [`sun-geometry-repository.ts:282`](../../nextjs-app/lib/services/sun-geometry-repository.ts#L282)
  [`sun-geometry-persisted-outcome.automate.test.ts:416`](../../nextjs-app/test/unit/services/sun-geometry-persisted-outcome.automate.test.ts#L416)
- [x] **[Review][P2] Carry timeline status from the qualifying run.** A selected
  shaded/blocked instant can coexist with a later valid direct-sun window; the
  detail DTO now serializes the window run's `Sunny | Partial` tier rather than
  borrowing the selected instant's status.
  [`sun-geometry-repository.ts:199`](../../nextjs-app/lib/services/sun-geometry-repository.ts#L199)
  [`route.ts:132`](../../nextjs-app/app/api/venues/[slug]/route.ts#L132)
  [`venues-route-real-engine.test.ts:382`](../../nextjs-app/test/unit/api/venues-route-real-engine.test.ts#L382)
- [x] **[Review][P2] Reconcile the UX percentage rule.** Grey pins,
  unqualified headlines, accessible labels, and weather-blocked presentations
  remain percentage-free; unknown cards/details may show only the explicitly
  qualified clear-sky geometric potential.
  [`ux-design-specification.md:623`](../planning-artifacts/ux-design-specification.md#L623)
- [x] **[Review][P2] Mark the Epic 12 sunny predicate as historical.** The
  controlling rule is now explicitly `sunExposurePercent > 50 &&
  directSunState === 'likely'`, with Epic 14 identified as the superseding
  contract and Epic 12 left closed.
  [`epics.md:3196`](../planning-artifacts/epics.md#L3196)
- [x] **[Review][P3] Make affirmative fixtures coherent.** Development fixtures
  with `directSunState: likely` now use the allowed clear-sky projection, and a
  documentation/fixture contract test prevents the impossible
  `likely + partly-cloudy` combination from returning.
  [`venues-fixture.ts:128`](../../nextjs-app/lib/services/venues-fixture.ts#L128)
  [`direct-sun-documentation-contract.test.ts:1`](../../nextjs-app/test/unit/services/direct-sun-documentation-contract.test.ts#L1)

## Design Notes

`geometryPotentialPercent` is clear-sky potential; `directSunState` is the present forecast; evidence reasons explain uncertainty. Grid forecasts cannot prove polygon conditions, so copy expresses likelihood. Next, compare timestamped Gothenburg evidence, geometry/shadows, predictions, and observed direct beam before calibration.

## Verification

**Commands:**
- `cd nextjs-app && npx tsc --noEmit`
- `cd nextjs-app && npx eslint . --quiet`
- `cd nextjs-app && npx vitest run`
- `cd nextjs-app && npx playwright test`
- `git diff --check`

**Historical local results (2026-09-03; superseded by follow-up verification below):**

- TypeScript: pass.
- ESLint: pass.
- Vitest: 229 files, 2,153 tests passed.
- Focused snapshot/persistence/engine/API/document regression: 9 files, 98 tests
  passed.
- Playwright compilation/discovery: the eight-scenario weather matrix produced
  16 mobile/desktop cases; the full suite produced 246 discoverable cases in 26
  files. Browser execution was intentionally not started because the trusted
  resource-guard lifecycle context was unavailable in this actor; this is
  recorded as an execution limitation, not a browser-pass claim.
- `git diff --check`: pass; only existing checkout line-ending warnings.

## Implementation Notes

- One server-owned classifier now emits `likely | blocked | unknown` with
  public-safe reason categories and compatibility projections.
- Met.no `complete` ingestion retains provider units and UTC valid times and now
  carries total/layer cloud, fog, next-hour precipitation, and symbol evidence.
- Near-now radar rain is persisted with its own valid time on one bounded,
  nearest forecast slice; malformed persisted JSON is sanitized before any
  indexing or valid-time matching.
- Persisted geometry remains the sole clear-sky source; public venue routes join
  it to unexpired snapshots and never call Met.no.
- Weather provenance and full confidence require validated, request-relevant
  evidence, and detail-window presentation uses the qualifying run's status.
- Public predicates, ranking, peaks, windows, feedback evidence, cached planner
  scrubbing, pins, cards, QuickInfo, detail, ARIA, and coach copy consume the
  explicit verdict. Missing legacy state normalizes to `unknown`.
- Durable product/architecture/UX/launch documents now bind Epic 14 field
  validation and calibration before release; scheduler reliability remains a
  separate launch blocker.

## Suggested Review Order

**Decision boundary**

- Start with the single conservative geometry-plus-weather policy.
  [`direct-sun-classifier.ts:53`](../../nextjs-app/lib/services/direct-sun-classifier.ts#L53)

- Verify provider-time admission and fail-closed snapshot matching.
  [`weather-snapshots.ts:92`](../../nextjs-app/lib/services/weather-snapshots.ts#L92)

- Follow persisted geometry and weather into one response outcome.
  [`sun-geometry-repository.ts:116`](../../nextjs-app/lib/services/sun-geometry-repository.ts#L116)

- Confirm every public sunny consumer shares the explicit likely predicate.
  [`public-sun.ts:37`](../../nextjs-app/lib/utils/public-sun.ts#L37)

**Provider evidence**

- Check Met.no fields, units, valid times, and malformed-entry rejection.
  [`met-no-service.ts:99`](../../nextjs-app/lib/weather/met-no-service.ts#L99)

**Swedish-first presentation**

- Inspect state-specific map-pin accessible names.
  [`VenuePinLayer.tsx:70`](../../nextjs-app/components/custom/map/VenuePinLayer.tsx#L70)

- Inspect neutral unknown styling and qualified clear-sky potential.
  [`VenueCard.tsx:125`](../../nextjs-app/components/composed/venue/VenueCard.tsx#L125)

**Durable product decisions**

- Read the accepted architecture delta and complete pipeline trace.
  [`architecture.md:1467`](../planning-artifacts/architecture.md#L1467)

- Review the corrected product contract and measurable release gate.
  [`prd.md:579`](../planning-artifacts/prd.md#L579)

- Review semantic copy, visual states, and uncertainty treatment.
  [`ux-design-specification.md:1451`](../planning-artifacts/ux-design-specification.md#L1451)

- Continue with calibration and field-validation stories.
  [`epics.md:4565`](../planning-artifacts/epics.md#L4565)

- See evidence, options, root-cause ranking, and next experiment.
  [`direct-sun-weather-truth-2026-09-03.md:1`](../planning-artifacts/decisions/direct-sun-weather-truth-2026-09-03.md#L1)

**Regression evidence**

- Reproduce fresh complete overcast and clear control paths deterministically.
  [`weather-snapshots.direct-sun.test.ts:6`](../../nextjs-app/test/unit/services/weather-snapshots.direct-sun.test.ts#L6)

- Review all eight weather states across mobile and desktop surfaces.
  [`epic-10-weather-matrix.spec.ts:437`](../../nextjs-app/test/e2e/epic-10-weather-matrix.spec.ts#L437)

## Story File Audit

This completed bugfix spec was re-audited after the external-review fix pass;
the frozen human-owned intent and acceptance criteria were not changed.

| Criterion | Status | Fix Applied |
|---|---|---|
| ACs preserved | pass | Frozen approved intent and acceptance criteria remain verbatim. |
| Design gate criteria | pass | No visual rebaseline is needed; the change corrects semantic/API truth and retains the approved Swedish-first neutral/amber states. |
| Task sequencing | pass | Provider admission and persisted normalization precede outcome, API, UI-contract, and documentation verification. |
| No invented requirements | pass | All work maps to the eight confirmed review findings and approved direct-sun contract. |
| File impact list | pass | Code Map and review links cover every changed production layer and its regression evidence. |
| Doc references | pass | Repository rules, project context, PRD, architecture, UX, epics, and the dated decision are linked or named. |
| Test gate | pass | TypeScript, ESLint, full Vitest, focused tests, Playwright discovery, and diff checks match the repository commands; the guarded browser-run limitation is explicit. |

Historical conclusion (2026-09-03): the completed bugfix spec remained `done`
and ready for follow-up independent review. See the current disposition below.

## Follow-up Review Findings — 2026-09-07

Scope: the three attached follow-up claims, evaluated against the existing
working tree on `codex/direct-sun-weather-accuracy`, HEAD `6e493c1`. Three read-only
reviewers divided production traces, regression/UI edges, and documentation.
The maintainer explicitly requested this bounded follow-up after the recorded
three earlier passes; this is the review-round guard's human-directed override,
not another unsolicited automatic review round. BMAD triage: three patches,
zero decision-needed, deferred, or dismissed findings. No product renegotiation
or `bmad-correct-course` was necessary. Frozen intent remains verbatim; no sprint
status transition or Epic 12 reopen occurred.

| Finding | Disposition | Confirmed failure and correction |
| --- | --- | --- |
| P1 malformed boolean weather flags | Confirmed; fixed | The JSON normalizer omitted malformed `weatherUnknown`/`isRaining`, allowing complete-clear fields to become likely. Present nonboolean flags now retain only timestamp/minute identity and weather-unknown, blocking nearest-clear substitution and affirmative classification. |
| P2 contradictory likely reasons | Confirmed; fixed | Otherwise coherent likely DTOs retained precipitation/unavailable reasons, qualifying for public ranking/windows/peaks. Current/day-series normalization now requires absent or empty reasons; nonempty or malformed payloads become unknown with contradictory-weather. No ordinary current live producer of this incoherent tuple was demonstrated; legacy/corrupt/future producer reachability is the bounded trust-boundary risk. |
| P2 neutralized legacy obscured UI | Confirmed; fixed | Raw CloudObscured or isObscured took precedence over authoritative unknown. Card, QuickInfo, detail hero and list activation names now permit obscured copy only for blocked, retaining uncertain Swedish copy and qualified geometry for unknown. |

- [x] **[Review][P1][Patch] Fail closed on malformed weather flags** —
  `nextjs-app/lib/services/weather-snapshots.ts:334` (flag boundary), `:218`
  (equal-distance unknown precedence), and `:239` (pure-fixture minute ties).
  Regression: `nextjs-app/test/unit/services/weather-snapshots.direct-sun.test.ts:12`
  and `nextjs-app/test/unit/api/story-12-3-persisted-geometry-route.atdd.test.ts:44`.
  Both string values, other malformed values, and both duplicate input orders
  are covered; list/detail remain
  HTTP 200 with geometry-only provenance, confidence 40, no sun windows or peaks,
  no public sun, and no outbound fetch. Cache ETags change from clear to unknown;
  repeated unknown replies return 304 and cached scrub results remain unknown.
- [x] **[Review][P2][Patch] Reject contradictory likely reason payloads** —
  `nextjs-app/lib/services/venues-fixture.ts:382`.
  Regression: `nextjs-app/test/unit/api/venues-route.cloud-gate.atdd.test.ts:51`
  and `nextjs-app/test/unit/api/venues-route-real-engine.test.ts:111`.
  Top-level/day-series serialization, cached scrubbing, genuine-likely-first
  sorting, public predicate, window/peak extraction and list/detail/304 responses
  are covered. The shared public predicate remains unchanged; coherence belongs
  to its existing DTO boundary.
- [x] **[Review][P2][Patch] Give unknown precedence over legacy obstruction** —
  `nextjs-app/components/composed/venue/VenueCard.tsx:105`,
  `nextjs-app/components/composed/venue/VenueQuickInfo.tsx:136`,
  `nextjs-app/components/composed/venue/VenueDetailContent.tsx:127`, and
  `nextjs-app/components/custom/venue/VenueList.tsx:81`.
  Regression: corresponding `test/components/VenueCard.test.tsx:12`,
  `VenueQuickInfo.test.tsx:77`, `VenueDetailContent.test.tsx:89`, and
  `VenueList.test.tsx:20`. Normalized legacy DTOs exercise compact/noncompact,
  mobile/desktop, fallback/detail loading transition, Swedish copy and ARIA.
  Existing obscured fixtures now explicitly supply blocked state. The browser
  matrix adds neutralized-legacy-obscured at
  `nextjs-app/test/e2e/epic-10-weather-matrix.spec.ts:130`; its unknown assertion
  rejects unqualified sun percentage while allowing qualified geometric percent.

### Follow-up verification

All app commands ran from `nextjs-app/`; diff check ran from the repository root.

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` (baseline and final) | Pass, exit 0. An intermediate run caught two missing onRoute callbacks in new tests; corrected before the final run. |
| `npx eslint . --quiet` (baseline and final) | Pass, exit 0. |
| `npx vitest run` | Pass, exit 0: 229 files, 2,173 tests. Includes API/component, classification, provenance, persistence/cache, time/TTL and provider-free contract suites. |
| Focused command below | Pass, exit 0: 8 files, 160 tests. |
| `npx playwright test --list` | Pass, exit 0: 248 tests in 26 files. Compilation/discovery only. |
| `npx playwright test test/e2e/epic-10-weather-matrix.spec.ts --list` | Pass, exit 0: 18 tests in one file (nine scenarios, mobile/desktop). Discovery only. |
| `git diff --check` | Pass, exit 0; checkout CRLF-to-LF warnings only. |

```powershell
npx vitest run test/unit/services/weather-snapshots.direct-sun.test.ts test/unit/api/venues-route.cloud-gate.atdd.test.ts test/unit/api/story-12-3-persisted-geometry-route.atdd.test.ts test/unit/api/venues-route-real-engine.test.ts test/components/VenueCard.test.tsx test/components/VenueQuickInfo.test.tsx test/components/VenueDetailContent.test.tsx test/components/VenueList.test.tsx --reporter=dot
```

Red-first evidence: before production fixes the five-file regression run failed
13 new tests and passed 105 existing tests, reproducing all three findings.
Subsequent failures identified eight legacy obscured fixtures lacking blocked
state and two route-test day-series mock wiring errors; corrected fixtures/mocks
preserve the intended assertions. Bounded fix verification found an equal-time
duplicate bypass: a clear slice could win over malformed evidence by input
order. Two additional red-first tests reproduced it; unknown now wins equal
timestamp-distance and pure-fixture minute ties. Final results supersede earlier
158-focused / 2,171-full passing runs.

Actual Playwright and screenshot/visual validation were not run: no trusted
resource-guard lifecycle context was supplied to this actor. No unmanaged server
was started and no guard context was invented. Guarded browser execution remains
follow-up verification, not a claimed pass or a waived release gate. No visual
references, motion, design tokens, or layouts changed. Provider/grid-versus-terrace
uncertainty and human field validation remain; correctness and scheduling are
distinct launch blockers and the two-hour TTL/signed 90-minute match remain intact.

### Follow-up changed-file inventory and preservation

Task edits layered onto pre-existing modified files:

- This spec; `planning-artifacts/architecture.md`, `prd.md`, `epics.md`,
  `ux-design-specification.md`, `decisions/direct-sun-weather-truth-2026-09-03.md`;
  `docs/launch/launch-readiness-handoff-2026-08-24.md`; `project-context.md`.
- `nextjs-app/lib/services/weather-snapshots.ts`, `venues-fixture.ts`.
- `nextjs-app/test/components/VenueQuickInfo.test.tsx`;
  `test/unit/services/weather-snapshots.direct-sun.test.ts`;
  `test/unit/api/story-12-3-persisted-geometry-route.atdd.test.ts`,
  `venues-route.cloud-gate.atdd.test.ts`, `venues-route-real-engine.test.ts`.

Files clean at entry and modified by this task:

- `nextjs-app/components/composed/venue/{VenueCard,VenueQuickInfo,VenueDetailContent}.tsx`;
  `nextjs-app/components/custom/venue/VenueList.tsx`.
- `nextjs-app/test/components/{VenueCard,VenueDetailContent,VenueList}.test.tsx`;
  `nextjs-app/test/e2e/epic-10-weather-matrix.spec.ts`.

All other entry-time changes remain pre-existing and untouched, including the
untracked `nextjs-app/test/unit/services/direct-sun-documentation-contract.test.ts`
and `_bmad-output/party-mode/`. No commit, deployment, production data/config,
schedule, schema, provider integration, secret, or telemetry mutation occurred.

The 13 pre-existing modified files not edited by this task are
`nextjs-app/app/api/venues/[slug]/route.ts`,
`nextjs-app/lib/services/{sun-engine,sun-geometry-repository}.ts`,
`nextjs-app/lib/utils/public-sun.ts`, `nextjs-app/lib/weather/nowcast-service.ts`,
`nextjs-app/scripts/refresh-weather-snapshots.ts`,
`nextjs-app/test/unit/api/venue-detail-route.test.ts`,
`nextjs-app/test/unit/services/persisted-sun-read-batching.automate.test.ts`,
`nextjs-app/test/unit/services/sun-geometry-persisted-outcome.automate.test.ts`,
`nextjs-app/test/unit/services/weather-snapshots.atdd.test.ts`,
`nextjs-app/test/unit/story-12-6-contract-defects.automation.test.ts`,
`nextjs-app/test/unit/utils/public-sun.atdd.test.ts`, and
`nextjs-app/test/unit/weather/nowcast-service.coverage.test.ts`.

Final inventory: 36 unstaged modified tracked files (23 touched in this task:
15 already dirty plus 8 previously clean; 13 pre-existing-only), no staged
changes, and the same two pre-existing untracked paths. Temporary test logs were
removed. HEAD and branch are unchanged. All three confirmed findings and the
duplicate-timestamp follow-up are resolved; actual browser/visual and human
launch validation remain explicitly outstanding.

### Browser execution continuation — 2026-09-07 (blocked before launch)

Entry checkpoint confirmed `codex/direct-sun-weather-accuracy`, HEAD `6e493c1`,
36 unstaged modified tracked files, no staged changes, and the two pre-existing
untracked paths. Browser execution and a managed local server are explicitly
approved; approval is not the blocker. No trusted startup-hook lifecycle context
was supplied to this actor. The installed guard script cannot substitute for it.

The shell tool initially reported PowerShell 7.6.5 despite its requested shell.
An explicit child invocation verified built-in Windows PowerShell 5.1.26100.9168:

```powershell
& 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe' -NoProfile -NonInteractive -Command '$taskContextVariable = Get-Variable -Name ctx -ErrorAction SilentlyContinue; [pscustomobject]@{ ContextVariablePresent = ($null -ne $taskContextVariable); PowerShellVersion = $PSVersionTable.PSVersion.ToString() } | ConvertTo-Json'
```

Result: exit 0, `ContextVariablePresent: false`. This is a presence check only,
not an actor-authentication mechanism; no context identifiers were read from
unrelated sources or invented. The supplied conversation also contains no trusted
hook context. Therefore no guard Start, runner, server, or browser was launched.

Static inspection of `nextjs-app/playwright.config.ts` confirms automatic
`webServer.command` (default `npm run dev`), `reuseExistingServer: false`, and
separate mobile/iPhone 14 and desktop/Chrome projects. Launching the ordinary
runner would start a server. A future guarded execution must account for the
runner, its server and browser descendants without starting a duplicate server;
this continuation does not claim that process ownership has been verified.

Pending command, from `nextjs-app/`, after trusted context and managed fixture
server setup are available (NOT executed in this continuation):

```powershell
npx playwright test test/e2e/epic-10-weather-matrix.spec.ts --project=mobile --project=desktop
```

| Evidence | Mobile | Desktop |
| --- | --- | --- |
| Nine-scenario weather matrix, including neutralized-legacy-obscured | Not executed | Not executed |
| Card, QuickInfo and detail screenshots for clear/likely, blocked, ordinary unknown and legacy-obscured unknown | Not captured or inspected | Not captured or inspected |
| Accessibility/browser checks | Not executed | Not executed |
| Automated reference comparison through visual-validation workflow | Not executed | Not executed |

Screenshot paths: none created by this continuation. No reference replacement,
rebaseline, application/test edit, or newly confirmed runtime defect occurred.
Historical TypeScript, lint, Vitest and discovery results above remain historical;
they were not rerun or promoted to browser evidence. Only this spec and the
existing launch handoff were updated. Frozen intent and both pre-existing
untracked paths were preserved. Final `git diff --check` is recorded below.

Final verification: `git diff --check` passed (exit 0; existing CRLF-to-LF
warnings only). Final status remains 36 unstaged modified tracked files, zero
staged changes and the same two untracked paths, with branch and HEAD unchanged.

Cleanup: no owned runtime resources were started. Actor-scoped `CloseActor` and
`List` cannot be invoked without the same missing trusted context; cleanup is
not guard-verified, and no assertion is made about resources from earlier actors.
Resumption requires trusted hook injection, not renewed user approval. Direct-sun
correctness and scheduling reliability remain separate launch blockers.

### Hook diagnosis continuation — 2026-09-07

Trusted lifecycle context is still absent. The user reports active hooks in
Codex CLI 0.153.4, with SessionStart, UserPromptSubmit and Stop failing with exit
1. The repo feature flag was changed from deprecated `codex_hooks` to `hooks`;
this is configuration maintenance, not evidence that the hook failure is fixed.
The locally created resource-guard source was recovered at
`C:\Users\Rasmus\Documents\Codex\2026-08-31\investigate-and-design-a-machine-level\work\resource-guard-src`.
Neither recovered source nor installed runtime was patched.

Isolated diagnostics are in the sibling `hook-repair-2026-09-07` directory.
Using `C:\Users\Rasmus\AppData\Local\Programs\Python\Python314\python.exe`:

```powershell
$diagnosticRoot = 'C:\Users\Rasmus\Documents\Codex\2026-08-31\investigate-and-design-a-machine-level\work\hook-repair-2026-09-07'
$python = 'C:\Users\Rasmus\AppData\Local\Programs\Python\Python314\python.exe'
& $python (Join-Path $diagnosticRoot 'probe-launch.py')
& $python (Join-Path $diagnosticRoot 'test-shell-probe.py')
```

Both commands exited 0. The startup probe passed eight combinations of direct
or cmd launch, suspended Windows job containment, and window creation flags.
A separate bounded Windows PowerShell 5.1 read-only adapter preflight returned
`PREFLIGHT_OK` (exit 0). The shell diagnostic passed four byte-exact passthrough
and safe-log cases. Exact compiler/preflight details and JSON results are in
that diagnostic directory. These are hook diagnostics, not application tests.
The hook failure itself has not been reproduced or corrected. An operator-run
normal Codex launcher is prepared to capture only its allowlisted failure stage;
it has not been run by this agent and does not modify protected runtime files.

Mobile/desktop browser, screenshots, accessibility and automated visual comparison
remain unexecuted; screenshot paths remain none. No application code changed and
historical app gates were not rerun. Bounded diagnostic children completed and
their owned job handles closed; no app server, browser or broker was launched.
Actor-scoped guard CloseActor/List remain unavailable without trusted context,
so no guard-verified cleanup is claimed. The working-tree checkpoint is now 37
unstaged modified tracked files (the extra path is `.codex/config.toml`), no
staged changes, and the same two untouched pre-existing untracked paths. Branch
and HEAD remain `codex/direct-sun-weather-accuracy` / `6e493c1`.

### Browser execution and screenshot verification — 2026-09-08

This actor received its own trusted RESOURCE LIFECYCLE CONTEXT before launch.
Every guard request used that structured context through built-in Windows
PowerShell 5.1; no prior actor context was adopted. Entry matched the historical
checkpoint: branch `codex/direct-sun-weather-accuracy`, HEAD
`6e493c1e073cb0e08012d6773f05125055de4142`, 37 unstaged modified tracked files,
zero staged changes, and the two pre-existing untracked paths.

#### Actual execution setup

`playwright.config.ts` was inspected first. The guarded runner owned Playwright,
its automatic `webServer` and browser descendants; no separate server was
launched and `reuseExistingServer: false` was preserved. App commands ran from
`C:\DEV\sunnyseat\nextjs-app` using `npx.cmd` on Windows.

Runner-local environment (no repository or production configuration edit):

```powershell
$env:SUNNYSEAT_VENUE_STORE='fixture'
$env:SUNNYSEAT_SUN_ENGINE='fixture'
$env:SUN_ENGINE='fixture'
$env:PLAYWRIGHT_PORT='43127'
$env:PLAYWRIGHT_BASE_URL='http://localhost:43127'
$env:PLAYWRIGHT_WEB_SERVER_COMMAND='npm run dev -- --hostname localhost --port 43127'
$env:NEXT_TELEMETRY_DISABLED='1'
npx playwright test test/e2e/epic-10-weather-matrix.spec.ts --project=mobile --project=desktop
```

The first numeric-loopback bind caused a Next.js/next-intl redirect loop before
presentation assertions. Changing only the browser URL to localhost, then a
webpack diagnostic, did not resolve it. Matching both server bind hostname and
browser origin to localhost resolved it on the original Turbopack runtime.
Local HTTP evidence was a 307 with `x-middleware-rewrite: .../sv` and
`location: /`. No application routing or dependency change was needed.
A similar upstream hostname/rewrite issue is documented at
https://github.com/vercel/next.js/issues/94745 (corroboration, not a substitute
for this checkout's observed result).

The final matrix fixes browser time at `2026-06-21T10:00:00Z` and selects 13:00
Stockholm using `_time`. The forced time deliberately differs from live-now:
forcing exactly live-now leaves the existing dev-only detail planner query gate
unresolved. List and detail DTOs are mocked. The map style is fulfilled locally
with no sources/layers; all unexpected external browser requests are aborted
and fail the test. Local blob workers are allowed. No live Met.no request or
production-service read/write was needed. The final detail captures explicitly
wait for the mocked description, rather than accepting list-fallback content.
Three consecutive stable bounding-box samples at 200 ms intervals prevent
capturing JS/Motion/map positioning mid-transition. Reference PNGs and their
capture recipes were not changed.

#### Results and in-scope fixes

| Scenario | mobile (WebKit, 390x664 CSS viewport, DPR 3) | desktop (Chromium, 1280x720, DPR 1) |
| --- | --- | --- |
| neutralized-legacy-obscured | PASS, reduced motion | PASS, reduced motion |
| overcast | PASS | PASS |
| clear | PASS | PASS |
| broken-clouds | PASS | PASS |
| precipitation | PASS | PASS |
| fog | PASS | PASS |
| stale-missing | PASS | PASS |
| incomplete | PASS | PASS |
| contradictory | PASS | PASS |

Final exact-command execution: **18 passed, exit 0, 1.3 minutes**. The configured
mobile device screen is 390x844, but its browser viewport is 390x664; these are
not 390x844 viewport captures. The unaugmented existing matrix first passed
18/18 in 36.8 s. Screenshot/axe instrumentation passed 18/18 before visual
inspection exposed defects beyond the old text assertions.

Confirmed and corrected in this session:

1. Non-likely card, QuickInfo and detail photo fallbacks retained amber decoration.
   They now use existing neutral surface/text tokens; likely keeps amber. Real
   venue photographs and route-action brand styling are unchanged.
2. The long unknown detail badge overlapped favourite/share controls at both
   breakpoints. It now occupies a bounded row below the controls, with qualified
   geometry below it. Unknown placeholder content no longer overlaps those rows.
3. Axe caught the fallback caption at 3.06:1 on the new neutral background. The
   existing body-text token replaces muted text and clears the final axe scans.

The existing E2E file now meaningfully guards neutral fallback backgrounds,
unknown visible/accessible wording, qualified 95% clear-sky geometry, detail
headline/control non-overlap, list activation names/focus and >=44x44 target
size, and page/console errors. It captures all four distinct verdict
presentations on card, QuickInfo and loaded detail. Full-page WCAG 2.1 A/AA axe
scans at those checkpoints retain all violations and use the repo's
serious/critical failure threshold: **24 scans, zero violations of any severity**.
All 18 cases report zero page errors, console errors and unexpected external
requests. Genuine blocked cloud/rain/fog treatment remains, including the
obscured headline and rain context. Unknown retains Swedish uncertainty and
qualified clear-sky potential without affirmative or definite-obscured names.

#### Screenshot inspection and paths

All **24 final screenshots were opened and visually inspected**, separately
from DOM assertions and axe. Clear remains amber; overcast retains slate cloud
badges and obscured copy; ordinary unknown and neutralized legacy-obscured use
neutral photo fallbacks/badges with readable uncertainty and qualified geometry.
The corrected detail headline no longer overlaps its controls. Blank maps are
intentional fixture backgrounds, not evidence of live tile rendering.

Persistent evidence directory:

`C:\Users\Rasmus\.codex\visualizations\2026\09\08\01a08266-440b-7fc1-9fcc-18c0be4cc9a1\final-evidence\`

Exact PNG filenames in that directory (each row lists card, QuickInfo, detail):

| Breakpoint/state | Files |
| --- | --- |
| mobile clear | `mobile-clear-card.png`, `mobile-clear-quick-info.png`, `mobile-clear-detail.png` |
| desktop clear | `desktop-clear-card.png`, `desktop-clear-quick-info.png`, `desktop-clear-detail.png` |
| mobile blocked | `mobile-overcast-card.png`, `mobile-overcast-quick-info.png`, `mobile-overcast-detail.png` |
| desktop blocked | `desktop-overcast-card.png`, `desktop-overcast-quick-info.png`, `desktop-overcast-detail.png` |
| mobile ordinary unknown | `mobile-stale-missing-card.png`, `mobile-stale-missing-quick-info.png`, `mobile-stale-missing-detail.png` |
| desktop ordinary unknown | `desktop-stale-missing-card.png`, `desktop-stale-missing-quick-info.png`, `desktop-stale-missing-detail.png` |
| mobile legacy unknown | `mobile-neutralized-legacy-obscured-card.png`, `mobile-neutralized-legacy-obscured-quick-info.png`, `mobile-neutralized-legacy-obscured-detail.png` |
| desktop legacy unknown | `desktop-neutralized-legacy-obscured-card.png`, `desktop-neutralized-legacy-obscured-quick-info.png`, `desktop-neutralized-legacy-obscured-detail.png` |

Each PNG has sibling `-aria.txt` and `-axe.json` evidence using the same stem.
Original runner output remains under `nextjs-app/test-results/`; the persistent
copies survive subsequent Playwright runs. The evidence directory's parent
contains `matrix.log` (final), `matrix-original-pass.log`,
`matrix-before-visual-fixes.log`, diagnostic/intermediate matrix logs,
`focused.log`, and `vitest-full.log`. Pre-fix captures are preserved in
`before-visual-fixes/` and are explicitly not final acceptance evidence.

#### Static/unit gates and automated visual-comparison limitation

- `npx tsc --noEmit`: baseline and final PASS, exit 0.
- `npx eslint . --quiet`: baseline and final PASS, exit 0.
- The exact eight-file focused command recorded in the 2026-09-07 section:
  PASS, 8 files / 160 tests, exit 0.
- `npx vitest run`: PASS after production UI fixes, 229 files / 2,173 tests,
  exit 0, 51.11 s. Subsequent edits only refined the E2E capture harness, which
  passed the final matrix, TypeScript and lint checks.

The repository visual-validation workflow was invoked from the repo root:

```powershell
.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail '/?venue=test-venue-sunny&_time=13:00' mobile
.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail '/?venue=test-venue-sunny&_time=13:00' desktop
```

Both exit 1 before capture/provider comparison: `ANTHROPIC_API_KEY is not set in
the environment`. **Automated reference comparison did not execute and is not a
PASS.** No manual-mode override, reference replacement, rebaseline or story
review transition occurred. Screenshot inspection is not a waived comparison
gate. Full physical-device/assistive-technology and field accuracy validation
remain open; this run is not a real-map, production-build performance-budget,
or release validation. No new runtime dependency or engine/API change was added.

#### Cleanup and preservation

Every owned runner was stopped through its exact guard resource ID, with
`ok=true` and `verified=true`; failed diagnostic runs were also cleaned up.
Final runner `214ba16d-d752-4d50-ab9a-f609f7e8a172` is stopped (revision 52).
Actor-scoped `CloseActor` returned `state=closed`, `verified=true`, zero leased
resources. Subsequent `List` returned `verified=true`, revision 53, all ten owned
runner records stopped, zero active/unresolved resources and no leases. No
user-owned application was adopted or stopped.

This session changed only six already-modified tracked files: this spec,
`docs/launch/launch-readiness-handoff-2026-08-24.md`,
`nextjs-app/components/composed/venue/VenueCard.tsx`, `VenueQuickInfo.tsx`,
`VenueDetailContent.tsx`, and `nextjs-app/test/e2e/epic-10-weather-matrix.spec.ts`.
The other 31 modified tracked files are pre-existing-only, including
`.codex/config.toml`. Both pre-existing untracked paths remain untouched.
No commit, deployment, production mutation, schema/schedule/provider/secret or
telemetry change occurred. Frozen approved intent, the two-hour TTL, signed
90-minute matching boundary and snapshot-only public reads remain unchanged.
Epic 12 remains closed; direct-sun field correctness and scheduling reliability
remain separate launch blockers.

Final repository verification: git diff --check PASS (exit 0; CRLF-to-LF warnings only). Branch codex/direct-sun-weather-accuracy, HEAD 6e493c1e073cb0e08012d6773f05125055de4142; 37 unstaged modified tracked files, zero staged changes, and the same two untouched pre-existing untracked paths.

## Manual visual acceptance and production release — 2026-09-09

Rasmus explicitly approved all new fixes, requested skipping the Anthropic API
key, and authorized proceeding with production deployment. This supersedes the
previous no-deployment instruction for this approved bugfix release. It does not
claim that scheduling reliability, field accuracy, or other launch evidence is
complete. No commit, schema, schedule, provider configuration, secret or telemetry
change is authorized or performed as part of this release.

Manual visual acceptance is based on the previously inspected 24 screenshots,
18 executed weather-matrix cases and 24 clean axe scans recorded above. The
rationale is the approved neutral unknown presentation, preserved qualified
clear-sky potential, corrected detail overlap and contrast, and retained genuine
blocked treatment. No reference PNG or capture recipe was replaced.

Both manual wrapper invocations exited 0 with process-local
`VISUAL_VALIDATE_PROVIDER=none` and `ALLOW_MANUAL_VISUAL_VALIDATION=1`:

```powershell
.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail '/?venue=test-venue-sunny&_time=13:00' mobile
.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail '/?venue=test-venue-sunny&_time=13:00' desktop
```

This is explicit human acceptance, **not automated visual comparison**. The
Anthropic comparison remains unexecuted by user choice.

Fresh release checks, run from `nextjs-app/`, all exited 0:

- `npm run build` — Next.js 16.3.3 production build, including TypeScript.
- `npm run bundle:verify` — initial 231.37/280 KiB, MapLibre-loaded
  298.85/320 KiB, all emitted static JS 599.04/600 KiB (gzip).
- `node scripts/verify-maplibre-async.mjs` — async boundary passes across
  15 route manifests.

Existing final TypeScript, lint, full Vitest and browser evidence from September 8
remains applicable: no application/test source changed during this release turn.
Build emitted only the existing external `C:\DEV\pnpm-lock.yaml` warning; no
workspace/root configuration was changed. Local Node was 22.23.2; the existing
Vercel project uses Node 24.x.

Production before this release was `dpl_E4JHngr8SDe2RDk6MjWXM86GeqEz`, READY in
`dub1`, built from `16dea3bd4529b60e793e33b52e67e698af924fd2`. That commit was
verified as an ancestor of the current HEAD. The linked target is the existing
`enhancior/sunnyseat` project, with root directory `nextjs-app`.

### Actual deployment outcome

Final production deployment: `dpl_8mFMnsRMTaFcA4XYhcQ8cvYim88R`, **READY**, runtime
region **dub1**, aliases `https://sunnyseat.vercel.app` and
`https://sunnyseat-enhancior.vercel.app`. Immutable deployment URL:
`https://sunnyseat-8p7yk32ic-enhancior.vercel.app`.

The first CLI deployment (`dpl_YXWPqBpKW2HmEf5zEkgrUhucEuBN`) unexpectedly used
`iad1` despite the nested app configuration. Post-deploy inspection caught this;
the same source was redeployed with explicit `--regions dub1`, restoring the
required Dublin placement. No repository or project region setting was edited.
The superseded deployment remains in Vercel history.

Release evidence directory:
`C:\Users\Rasmus\.codex\visualizations\2026\09\08\01a08266-440b-7fc1-9fcc-18c0be4cc9a1\release-2026-09-09`.
Its `source/` contains 747 tracked application files copied byte-for-byte from the
approved dirty working tree, preserving the `nextjs-app/` layout and existing
project link. Local secrets, ignored files and both pre-existing untracked paths
were excluded. `source-manifest.json` records SHA-256 for every copied application
file; all 747 hashes were rechecked against the working tree. This is a retained
release artifact, not a new source of product intent. No commit was created.

Exact final deploy command, invoked from `C:\DEV\sunnyseat\nextjs-app` with
`$releaseRoot` set to the evidence directory above:

```powershell
npx --yes vercel@59.1.3 deploy "$releaseRoot\source" --prod --yes --scope enhancior --regions dub1 --meta sunnyseatSourceHead=6e493c1e073cb0e08012d6773f05125055de4142 --meta sunnyseatDirtyWorkingTree=true
```

Both deployment commands exited 0. The first command was identical except for
omitting `--regions dub1`; logs are `deploy.log` and `deploy-dub1.log`.
Final cloud build completed in 16 seconds. Read-only HTTP smoke checks passed for
`/`, `/sv/about`, `/api/venues?lat=57.7089&lng=11.9746&radiusKm=3`, and
`/api/venues/tyska-bron`. All returned 200; both APIs returned the exact final
deployment ID, and response region headers included `dub1`. The list returned
42 venues: 26 blocked, 16 unknown, zero likely. Evidence: `smoke-final.json`.
No production writes or live provider requests were deliberately triggered;
public requests exercised the existing snapshot-only route. These HTTP checks do
not establish field accuracy or constitute a new production browser/screenshot run.

The final connector error-log query timed out. A bounded CLI retry exited 0 with
no error entries returned:

```powershell
npx --yes vercel@59.1.3 logs dpl_8mFMnsRMTaFcA4XYhcQ8cvYim88R --environment production --level error --since 5m --limit 20 --json --no-follow
```

This is a short post-deploy sample, not sustained monitoring. Output is preserved
in `runtime-errors.log`; monitoring configuration was not changed.

### Newly observed dependency audit failure — remains open

During the remote build npm reported dependency advisories. The subsequent
`npm audit --omit=dev --audit-level=high --json` exited **1**, reporting one
critical MapLibre advisory and one high-severity sharp advisory. Evidence:
`production-audit.json`. Package manifests and lockfiles are unchanged from HEAD,
so these were pre-existing dependencies, not introduced by the direct-sun fixes.
The audit failure became known while the first deployment was building; it was
not a passed pre-deploy gate and is not waived by visual acceptance.

- MapLibre: https://github.com/advisories/GHSA-jrc7-96c5-q579 — attribution HTML
  sanitization issue; the advisory lists 6.4.1 as patched. The current 5.x
  dependency is reported affected; a major upgrade or mitigation needs explicit
  implementation and regression testing.
- sharp: https://github.com/advisories/GHSA-rgj7-g3m4-5g8c — libheif advisory,
  reported affected below 0.35.4.

No dependency upgrade or exploitability clearance was performed. These findings
require follow-up before claiming full production readiness, alongside existing
scheduling and field/device validation gaps. The approved direct-sun bugfix is
live; this is not an all-clear for launch.

### Final working tree and lifecycle

Only the existing spec and launch handoff were edited in this release turn. No
application/test source, dependencies, schema, schedule, provider configuration,
secrets or telemetry configuration changed. Branch remains
`codex/direct-sun-weather-accuracy`, HEAD
`6e493c1e073cb0e08012d6773f05125055de4142`, with 37 unstaged tracked modifications,
zero staged changes and the same two pre-existing untracked paths. The live source
includes uncommitted fixes; a future Git deployment must include those fixes to
avoid overwriting them.

This actor received its own trusted lifecycle context. All local commands were
bounded foreground work; no managed server/browser was launched in this turn.
The first cleanup helper invocation failed at PowerShell pipeline binding before
issuing an operation. Retrying through the external built-in Windows PowerShell
5.1 executable with JSON stdin succeeded: `CloseActor` verified, then `List`
verified with **zero active owned resources**. The context-bearing helper was
removed after verification. Final `git diff --check` passed.

## Git reconciliation authorization — 2026-09-09

Rasmus explicitly authorized committing and merging the relevant production work,
then switching to main. The release changes are being reconciled through a PR;
this supersedes earlier no-commit/no-merge constraints. The unrelated local
`.codex/config.toml` hook-key change and the two protected pre-existing untracked
paths remain outside this commit. No sprint-status transition is made.

Application source remains identical to the deployed, SHA-256-recorded release.
The prior successful TypeScript, lint, full Vitest, 18-case browser matrix,
24 screenshot inspections and axe scans, manual visual approval, production
build and bundle checks remain the evidence for these unchanged fixes. The
known production dependency audit failure is not waived; PR CI will determine
whether the normal merge checks pass. Security dependency remediation remains
separate from the approved direct-sun patch until scoped and verified.

## Security dependency remediation and browser checkpoint — 2026-09-09

Rasmus authorized fixing the dependency audit blockers, committing and merging
production-relevant work. This checkpoint supersedes the open dependency finding
above; it does not waive scheduling reliability or field/device launch blockers.

MapLibre is pinned to 6.4.1 (GHSA-jrc7-96c5-q579 patched); the lockfile resolves
sharp 0.35.4 (GHSA-rgj7-g3m4-5g8c patched). MapLibre 6 requires native ESM and a
module worker. A build-time esbuild/Terser step prepares versioned same-origin
modules with shared code and a SHA-256 manifest. The map remains asynchronously
loaded. No external CDN or provider call is needed to prepare these modules.
The bundle gate now counts public JavaScript and .mjs/.cjs as well as .js, and
checks the prepared module hashes; budgets were not increased. Active stack
references were updated, preserving historical architecture review text.

Execution exposed two defects corrected in this patch: the old bundle verifier
omitted .mjs/public JavaScript, and locale routing treated .mjs URLs as pages.
Both have deterministic regression coverage. A browser security regression also
renders fixture geometry through the real local worker and verifies removal of
consecutive malicious attribution event attributes. No design tokens, Swedish
copy, direct-sun rules, weather matching boundaries, schedules or data changed.

Commands run from `nextjs-app/`:

```powershell
npm install --save-exact maplibre-gl@6.4.1 --no-audit
npm update sharp --no-audit
npm install --save-dev --save-exact terser@5.44.1 --no-audit
npx tsc --noEmit
npx eslint . --quiet
npm audit --omit=dev
npm run build
node scripts/verify-js-budgets.mjs
node scripts/verify-maplibre-async.mjs
npx vitest run
npx playwright test test/e2e/epic-10-weather-matrix.spec.ts test/e2e/maplibre-security.spec.ts --project=mobile --project=desktop --output C:\Users\Rasmus\.codex\visualizations\2026\09\08\01a08266-440b-7fc1-9fcc-18c0be4cc9a1\release-2026-09-09\dependency-browser
```

Final TypeScript, lint, production build and async-boundary checks passed.
Production dependency audit: **zero vulnerabilities**. Full isolated Vitest:
**229 files, 2,174 tests passed**. An earlier full run overlapped a build and timed
out in one geometry precompute test; the isolated full rerun passed without
altering that test or its timeout. Native sharp AVIF encode/decode also passed
for a generated 2x2 image (sharp 0.35.4, libheif 1.23.2).

Complete gzip accounting: **231.44 KiB initial, 300.84 KiB MapLibre-loaded,
599.46 KiB total emitted/public JavaScript**, within unchanged 280/320/600 KiB
limits. Headroom is small and remains enforced in CI.

Actual browser execution: **20 passed** — all nine weather scenarios on both
mobile (WebKit/iPhone 14) and desktop (Chromium), plus the security test on each.
The approved runner and its automatic webServer/browser descendants were started
through resource-guard with this actor's trusted context. Local fixture engines,
mocked venue/list/detail responses, and a mocked style/GeoJSON source avoided
production services and live Met.no. The first browser attempt exposed the .mjs
routing failure; the complete rerun passed after the narrow matcher correction.

Evidence root:
`C:\Users\Rasmus\.codex\visualizations\2026\09\08\01a08266-440b-7fc1-9fcc-18c0be4cc9a1\release-2026-09-09`.
`dependency-browser.log` and `dependency-browser-exit.txt` record the final run;
`dependency-vitest-final.log` records the full passing unit run.

`dependency-browser/` contains **26 screenshots**: the weather matrix's 24
card/QuickInfo/detail captures and two map-security captures. This checkpoint
visually inspected **eight**: both breakpoint security captures, both
`neutralized-legacy-obscured-detail.png`, both `clear-card.png`, and both
`overcast-quick-info.png`. Unknown detail remained visually neutral with qualified
clear-sky potential; clear cards retained affirmative treatment and genuinely
blocked QuickInfo retained obscured treatment. All 24 matrix axe JSON artifacts
contain empty violation arrays, and the scenario accessible-name assertions
passed. The earlier complete 24-image inspection remains historical evidence.
Automated reference comparison was **not run**: the user's explicit manual visual
acceptance and instruction to skip the Anthropic API remain in effect. No
reference replacement or rebaseline occurred.

Both owned browser-runner resources were stopped with verified results.
Actor-scoped `CloseActor` then `List` through Windows PowerShell 5.1 returned
verified cleanup and **zero active owned resources**. `git diff --check` passed.
The unrelated `.codex/config.toml` change and both protected untracked paths stay
outside the security commit. PR #29 CI and the subsequent main deployment must
confirm the remote outcome; no claim of their completion is made at this local
checkpoint.

### Full CI follow-up — 2026-09-09

Security commit `8521a1a` passed clean Linux install, production audit (zero),
TypeScript, lint, build, all committed unit tests and unchanged bundle budgets.
Vercel preview `dpl_Gg8wJF4c9nn9oYjMWShAo8esQCmC` reached READY in dub1. GitHub
run https://github.com/rthunborg/sunnyseat/actions/runs/34333691620 then reported
**151 E2E passes, 51 skips and eight failures** (four tests on each breakpoint).
Later touch/accessibility/Lighthouse steps were skipped by that failure.

The follow-up changes only three E2E files:
- Feedback evidence now expects the neutral grey verdict for the synthetic
  forced-detail fallback that intentionally has no authoritative directSunState.
  Its legacy geometry/weather flags remain independently asserted.
- The unknown map-pin locator is scoped to venue-pin, avoiding a strict-locator
  collision with the corrected VenueList uncertainty label.
- The coach guide footer is scrolled into view inside its existing scrollable
  dialog before checking clipping, geometry, spacing and touch-target bounds.
  No bounds tolerance is relaxed; the test also captures `coach-footer.png`.

An attempted change to add likely evidence to the dev fallback was rejected by
its existing MapView unit regression and withdrawn before commit. Production and
dev application behavior remain unchanged; Epic 12 is not reopened. Final local
`npx tsc --noEmit`, `npx eslint . --quiet`, and `npx vitest run` pass again:
**229 files / 2,174 tests** (local count includes the protected untracked test).
Evidence: `ci-tests-vitest-final.log`; the failed exploratory run is retained in
`ci-fixture-vitest.log` under the evidence root above.

A new local managed browser launch was rejected with `ACTOR_CLOSING` after this
actor's earlier CloseActor. No unmanaged fallback was started. A further
CloseActor/List verified zero active resources, and the context-bearing helper
was removed. Browser execution of these three test corrections is delegated to
the normal GitHub CI rerun; it is not claimed as a local browser pass or screenshot
inspection. This is the expected closed-actor guard boundary, not missing trusted
context or a restarted machine-hook investigation. Final `git diff --check`
passed. The PR remains unmerged pending the new remote result.
