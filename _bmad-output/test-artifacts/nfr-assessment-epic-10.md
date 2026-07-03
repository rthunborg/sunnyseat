---
stepsCompleted:
  - 'step-01-load-context'
  - 'step-02-define-thresholds'
  - 'step-03-gather-evidence'
  - 'step-04-evaluate-and-score'
  - 'step-04e-aggregate-nfr'
  - 'step-05-generate-report'
lastStep: 'step-05-generate-report'
lastSaved: '2026-07-03'
workflowType: 'testarch-nfr-assess'
inputDocuments:
  - '_bmad-output/test-artifacts/test-design/test-design-epic-10.md'
  - '_bmad-output/test-artifacts/traceability/traceability-report-epic-10.md'
  - '_bmad-output/test-artifacts/automation-summary-10-5.md'
  - '_bmad-output/planning-artifacts/epics.md (§Epic 10)'
  - '_bmad-output/implementation-artifacts/10-1..10-5-*.md'
  - 'nextjs-app/lib/services/sun-engine.ts'
  - 'nextjs-app/lib/solar/effective-cloud-cover.ts'
  - 'nextjs-app/lib/weather/nowcast-service.ts'
  - 'nextjs-app/lib/weather/met-no-service.ts'
  - 'nextjs-app/lib/solar/confidence-calculator.ts'
---

# NFR Assessment - Epic 10 "Honest Sky" (Weather-Gated Two-Signal Sun Display)

**Date:** 2026-07-03
**Story:** Epic 10 (stories 10.1–10.5)
**Overall Status:** PASS ✅ (with 2 tracked, non-blocking CONCERNS)

---

Note: This assessment summarizes existing evidence; it does not run tests or CI workflows beyond the fresh
verification runs recorded below. Live/production telemetry (uptime, MTTR, live p95, DR drills) is out of scope
for this epic — Epic 10 changes *what the live product tells users about the sky*, not the runtime/ops surface.

## Executive Summary

**Assessment:** 4 PASS, 2 CONCERNS, 0 FAIL

**Blockers:** 0 — no NFR failure blocks the epic.

**High Priority Issues:** 0 — no critical/high NFR gap.

**Recommendation:** **PASS.** Epic 10 is a truth/data-integrity epic (make the headline sun state weather-honest
without fabricating a number). Its dominant NFR is honest-output correctness, which is proven at unit + component +
E2E level. Reliability (graceful external-dependency degradation), Security/Compliance (Met.no TOS posture on the
new Nowcast client), Performance (cache internal-consistency + dedupe), and Maintainability (named documented
tunable constants) are all PASS on evidence. Two CONCERNS are tracked and non-blocking: (1) **Accessibility** — the
new muted "obscured" palette is AA and green on the desktop axe gate, but two *mobile* obscured axe cases are
`test.fixme`'d against pre-existing bottom-sheet-shell contrast debt (Story 5.1 territory, not new to this epic);
(2) **Reliability/Ops** — the AC2 live-reality spot-check against the real Gothenburg sky is a maintainer,
non-automatable, deferred-verification step (not yet recorded).

---

## Performance Assessment

> Epic 10 introduces **no new perf budget number** (explicit in the test-design). The NFR here is that the weather
> gate does not regress the Epic 9.3 caching win and that the 15-min sun-compute cache stays internally consistent
> now that status depends on the weather slice.

### Response Time (p95)

- **Status:** N/A (no epic-specific p95 threshold set) ℹ️
- **Threshold:** UNKNOWN — the epic deliberately sets no new p95 budget; existing app p95 posture carries over.
- **Actual:** Not separately measured this audit. The gate is a comparison on an already-fetched weather slice,
  not a new per-venue fetch.
- **Evidence:** test-design §NFR Planning ("No new perf budget number is set by this epic").
- **Findings:** No performance regression path introduced beyond the single extra Nowcast client fetch (see below).

### Throughput / Extra-Fetch Latency (Nowcast)

- **Status:** PASS ✅
- **Threshold:** The new near-now Nowcast fetch must not blow the sun-compute budget or regress the 9.3
  double-RPC caching win; per-coordinate dedupe + short-TTL cache; Nowcast consulted only for near-now.
- **Actual:** Nowcast is consulted ONLY when `requestedAt` is within `[now, now + NOWCAST_HORIZON_MS]`
  (90 min); future/planner requests skip it entirely (`nextjs-app/lib/services/sun-engine.ts:517-524`). Coord
  key truncated to `.toFixed(4)` (same dedupe key shape as the forecast client). No unbounded fan-out.
- **Evidence:** `sun-engine.cloud-gate.atdd.test.ts` — `[10.4 AC4]` beyond `NOWCAST_HORIZON_MS` ⇒ nowcast NOT
  called; inside horizon ⇒ consulted; past `requestedAt` ⇒ not called (fresh run 2026-07-03: green).
- **Findings:** Near-now scoping + coord-keyed dedupe bound the extra fetch. R-009 mitigated.

### Cache Internal Consistency (15-min sun-compute bucket) — R-006

- **Status:** PASS ✅
- **Threshold:** The gated status now depends on the weather slice; the cache must store the gated outcome WITH
  its weather slice so a bucket is internally consistent, and a weather-unknown/degraded compute must NOT be
  pinned for the whole 15-min window.
- **Actual:** Repeat request in the same 15-min bucket ⇒ identical `currentSunStatus` + `skyCondition`; a
  degraded/weather-missing compute is not cached (retries next request, mirroring the existing
  `cacheable: buildings !== null` rule). Geometric fields byte-identical across hit/miss.
- **Evidence:** `sun-engine.cloud-gate.atdd.test.ts` — `[10.1 AC4] gated outcome caches with its weather slice`
  (fresh run 2026-07-03: 43/43 green in the cloud-gate + met-no suite).
- **Findings:** R-006 (inconsistent status/weather pair pinned in cache) mitigated and guarded.

### Resource Usage (CPU / Memory)

- **Status:** N/A ℹ️
- **Threshold:** None set for this epic.
- **Actual:** The gate adds a single comparison branch to the hot compute path on an already-fetched weather
  slice (R-016, scored 1 — monitor-only). No per-venue O(n) re-fetch introduced.
- **Evidence:** test-design R-016; source `sun-engine.ts:556-557` (single `applyCloudGate` call on
  `effectiveCloudCover(weather)`).
- **Findings:** Negligible; confirmed no extra weather re-fetch per venue.

**Performance overall:** PASS ✅ — no regression path; cache consistency and extra-fetch scoping guarded.

---

## Security Assessment

> Epic 10 introduces **no auth/authz surface** — the app is a public, read-only weather/sun display. The only
> security-class NFR is the **Met.no Terms-of-Service posture** on the new external Nowcast client.

### Authentication Strength

- **Status:** N/A ℹ️ — no authenticated surface introduced or touched by this epic.

### Authorization Controls

- **Status:** N/A ℹ️ — no authz surface; public read-only. Trace confirms 0 auth/authz negative-path gaps
  (nothing to test).

### Data Protection / External-Call Compliance (Met.no TOS) — R-013

- **Status:** PASS ✅
- **Threshold:** The new Nowcast client must carry the identifying `User-Agent` and ≤4-decimal coordinates
  (same posture as the existing `met-no-service` forecast client); caching/dedupe consistent with the 5-min
  product cadence.
- **Actual:** `nowcast-service.ts` uses the **shared** `userAgent()` helper (imported so the two clients cannot
  drift) and `.toFixed(4)` on both lat and lon against the `nowcast/2.0/complete` endpoint
  (`nextjs-app/lib/weather/nowcast-service.ts:66-71`).
- **Evidence:** `nowcast-service.cloud-gate.atdd.test.ts` — `[10.4 AC1]` asserts `/nowcast/2.0/complete`,
  4-decimal coords, and the shared identifying User-Agent (fresh run 2026-07-03: green).
- **Findings:** R-013 mitigated. TOS posture inherited, not re-invented.

### No-Live-Met.no Guard (CI hygiene / call-masking regression) — R-005 / retro 10.4

- **Status:** PASS ✅
- **Threshold:** No live `api.met.no` (or nowcast host) calls in CI; a masked live call must be rejected by a
  shared guard.
- **Actual:** A shared setup guard rejects outbound `api.met.no` requests (exact-host match, `string | URL |
  Request` shapes) while letting same-origin `/api/venues` and benign external hosts through.
- **Evidence:** `no-live-metno-fetch-guard.atdd.test.ts` (acceptance, 3 tests) +
  `no-live-metno-fetch-guard.coverage.test.ts` (9 tests hardening host-matching against suffix-spoof/prefix/
  non-api hosts) — fresh run 2026-07-03: green. Automation-summary-10-5 documents the retro-driven addition.
- **Findings:** The masked-call class (retro-note 10.4 R1) is guarded and the guard's own host logic is pinned.

### Vulnerability Management

- **Status:** N/A ℹ️ — no dependency-scan artifact (Snyk/Dependabot report) in scope for this audit; epic added
  no new third-party runtime dependency (the Nowcast client is first-party code against an existing external
  API already used via the forecast client).

### Compliance

- **Status:** PASS ✅ (Met.no TOS) — identifying UA + coord truncation asserted; no PII/GDPR surface added.

**Security overall:** PASS ✅ — TOS posture proven, no-live-Met.no guard hardened, no auth/vuln surface introduced.

---

## Reliability Assessment

> The reliability NFR is **graceful degradation of the two new external dependencies** (Met.no `complete`
> Locationforecast + Met.no Nowcast) to "weather unknown" — never a throw, 500, or fabricated clear/sunny value.

### Availability (Uptime)

- **Status:** N/A ℹ️ — no epic-specific uptime SLA; live uptime telemetry out of scope for this data-truth epic.

### Error Rate

- **Status:** N/A ℹ️ — no live error-rate metric collected in this audit; the reliability guarantee here is
  behavioural (degradation semantics), proven by unit tests below rather than by production error-rate logs.

### Fault Tolerance / External-Dependency Degradation — R-002 / R-008

- **Status:** PASS ✅
- **Threshold:** Nowcast + `complete`-endpoint outage degrades silently to Tier 0/1 — network error, non-OK
  HTTP, empty timeseries, or absent radar coverage all resolve to `undefined` ("unknown"), NEVER a throw, a 500,
  or a fabricated `0`/clear. Missing `cloud_area_fraction` reads "unknown", not clear sky.
- **Actual:**
  - Nowcast (`nowcast-service.ts:66-99`): `try/catch` → `return undefined` on any failure; explicit non-`ok`
    radar-coverage marker ⇒ `undefined`; absent `precipitation_rate` field ⇒ `undefined`; empty timeseries ⇒
    `undefined`. `0` is preserved as a real reading ("radar says no rain"), distinct from "unknown".
  - `met-no-service.ts`: the optimistic `cloud_area_fraction ?? 0` default (the original root-cause bug) is
    removed — missing cloud now maps to weather-unknown, never fabricated clear.
- **Evidence:**
  - `nowcast-service.cloud-gate.atdd.test.ts` — 9 degradation cases (absent field / no radar coverage / HTTP
    503 / network error / empty timeseries → `undefined`, never `0`, never throws).
  - `met-no-service.cloud-gate.atdd.test.ts` — `[10.1 AC2]` missing cloud ⇒ weather-unknown, never 0/clear,
    never fabricates overcast either.
  - `sun-engine.two-signal-invariants.atdd.test.ts` — weather-missing NEVER fabricates clear
    (`skyCondition="unavailable"`).
  - Fresh run 2026-07-03: all green.
- **Findings:** R-002 and R-008 mitigated. New clients inherit the existing `getForecast` graceful-`[]`/null
  posture; the residual "a new client forgets the try/catch" risk is directly covered.

### Rain-Gate Honesty Invariants (no false positive/negative) — R-004

- **Status:** PASS ✅
- **Threshold:** Rain contributes ONLY negatively (rain forces obscured; absence-of-rain must NEVER imply sun).
- **Actual:** No-rain + overcast + sunlit ⇒ still `CloudObscured`; no-rain + clear + below-horizon ⇒ still
  `NoSun`; `undefined` rate ≡ 0; rain never un-gates.
- **Evidence:** `sun-engine.cloud-gate.atdd.test.ts` — `[10.4 AC2]`/`[10.4 AC3]` (fresh run: green).
- **Findings:** The "absence of rain must never imply sun" hard constraint is guarded.

### CI Burn-In (Stability)

- **Status:** CONCERNS ⚠️ (informational, non-blocking)
- **Threshold:** No formal burn-in run required by the epic; the e2e matrix is deterministic-by-construction.
- **Actual:** No formal N-consecutive-run burn-in executed. The weather-boundary e2e matrix is deterministic
  (weather mocked, `?_time=` forced, no live Met.no) so the specific R-005 sky-flakiness was designed out; full
  suite green on single runs (1116/1116 in the trace run; 53/53 + 43/43 NFR-relevant subsets fresh this audit).
- **Evidence:** trace-report §Flakiness Validation; automation-summary-10-5.
- **Findings:** Flakiness root cause (live-sky dependence) eliminated by design. A formal burn-in was not run —
  low residual risk given the deterministic construction. Non-blocking.

### Live-Reality Spot-Check (deferred verification) — R-015

- **Status:** CONCERNS ⚠️ (deferred-verification, non-blocking, maintainer action)
- **Threshold:** Displayed sun state must match the observable Gothenburg sky + raw Met.no `complete` + `nowcast`
  values on a real day; recorded in the story with a comparison table; any mismatch triaged to root cause before
  the epic is formally closed.
- **Actual:** Not yet recorded — non-automatable by design (depends on a real sky on the day; the dev agent is
  forbidden from fabricating a sky observation).
- **Evidence:** test-design R-015 ("deferred-verification, not a code gate"); trace 10.5-AC2 (Coverage: NONE,
  manual-by-design).
- **Findings:** This is the single genuine open reliability-verification item. It gates *epic close*, not this
  audit. See Evidence Gaps.

### Disaster Recovery (RTO/RPO)

- **Status:** N/A ℹ️ — no DR surface introduced; carries over from prior epics unchanged.

**Reliability overall:** PASS ✅ (with 2 informational CONCERNS: no formal burn-in; live spot-check deferred).

---

## Maintainability Assessment

### Test Coverage

- **Status:** PASS ✅
- **Threshold:** Honest-output guards 100% covered; engine truth ≥90% unit; DTO contract 100% of the new value;
  all four visual states rendered.
- **Actual:** P0 acceptance-criteria coverage 100% (8/8), P1 100% (7/7), overall 89% (17/19) — the 2 non-FULL
  are both P2/P3 in the 10.5 verification story. Full vitest suite: **1116 passed / 0 failed / 0 skipped**
  (trace run); NFR-relevant subsets re-verified green this audit.
- **Evidence:** traceability-report-epic-10.md §Coverage Summary; fresh vitest subset runs 2026-07-03.
- **Findings:** Exemplary — every test carries an explicit `[10.x ACn]` tag; defence-in-depth on the R-001
  critical guard at unit + component + E2E.

### Code Quality / Named-Constant Discipline — R-007 / R-011

- **Status:** PASS ✅
- **Threshold:** Exactly ONE named, documented, tunable cloud-gate threshold; a documented named-constant
  cloud-layer weighting formula with recorded rationale; muted palette from DESIGN.md tokens (no ad-hoc hex).
- **Actual:**
  - Cloud gate: `CLOUD_GATE_THRESHOLD_PERCENT = 80` — single exported named constant with a doc-comment
    rationale (`sun-engine.ts:85-98`).
  - Nowcast horizon: `NOWCAST_HORIZON_MS = 90 * 60 * 1000` — named + documented (`sun-engine.ts:102-108`).
  - Layer weighting: `CLOUD_WEIGHT_LOW = 1.0`, `CLOUD_WEIGHT_MEDIUM = 1.0`, `CLOUD_WEIGHT_HIGH = 0.25` — each a
    named exported constant with an extensive doc comment recording the physical rationale (low/medium block the
    direct beam; cirrus transmits most of it) and the boundary intent (100% high-only lands at 25 ≪ 80 ⇒ does
    NOT gate; 100% low = 100 ≥ 80 ⇒ DOES gate). Weighted sum clamped 0..100 (`effective-cloud-cover.ts:42-73`).
  - Boundary tests assert *relative* behaviour so a constant re-tune does not churn the matrix.
- **Evidence:** source (above); `effective-cloud-cover.test.ts` weight-ordering meta-guard;
  `sun-engine.cloud-gate.atdd.test.ts` boundary reads the named constant. Fresh run 2026-07-03: green.
- **Findings:** R-007 and R-011 mitigated. No magic numbers; formula + rationale documented in source.

### Technical Debt / Union-Sweep Safety — R-003

- **Status:** PASS ✅
- **Threshold:** Adding the 5th `VenueSunStatus` value (`CloudObscured`) must sweep every consumer; a missed
  exhaustive switch must be a compile-time miss, not a runtime crash.
- **Actual:** `tsc --noEmit` green across all consumers (types, sanitizer, presentation, feedback predictedState,
  pin-mapping); venues-route contract test covers the new value; component tests render all four states.
- **Evidence:** trace 10.1-AC4 (union sweep verified in source + full `tsc --noEmit` green); story records.
- **Findings:** R-003 mitigated via compile-time exhaustiveness + contract coverage.

### Documentation Completeness

- **Status:** PASS ✅ (with 1 optional P2 nit)
- **Threshold:** About-page copy still truthfully describes the two-signal (geometry × cloud) model with sv/en
  parity; new sky keys in both locales.
- **Actual:** `about.json` `algorithmBody` states "…a place under cloud is not counted as sunny" /
  "…en plats som ligger i moln inte räknas som solig"; `sourceMetnoDesc` cites "cloud and precipitation";
  `messages-parity.test.ts` machine-enforces sv/en key + ICU parity.
- **Evidence:** trace 10.5-AC3 (PARTIAL — structure + parity covered; the exact two-signal-blend *sentence* is
  not pinned by a dedicated string-contains assertion — asserted only via reading-UAT + code review).
- **Findings:** Copy is shipped correctly and parity-enforced. The un-pinned semantic sentence is an OPTIONAL,
  non-blocking P2 backlog item (add an `AboutPage` string-contains assertion to lock it against future drift).

### Test Quality

- **Status:** PASS ✅ — all epic-10 tests follow Given/When/Then and carry `[10.x ACn]` traceability tags;
  test-design dedup discipline honoured (engine truth at unit, DTO at contract, rendering at component,
  honest-display at E2E); no unacceptable duplication (trace §Duplicate Coverage Analysis).

**Maintainability overall:** PASS ✅ — named documented tunable constants, compile-safe union sweep, exemplary
tagged coverage; one optional P2 copy-assertion nit.

---

## Custom NFR Assessments

### Accessibility (WCAG AA on the new muted "obscured" state) — R-011 / R-001

- **Status:** CONCERNS ⚠️ (desktop PASS; mobile fixme'd against pre-existing debt — non-blocking)
- **Threshold:** The new muted Obscured palette meets WCAG AA contrast; the CI axe gate (ACTIVE since Epic 9)
  stays green on the new state; each surface's accessible name includes the obscured phrase exactly once.
- **Actual:**
  - Slate palette documented AA: **5.50:1 fill / 8.28:1 text** (both exceed the 4.5:1 AA text / 3:1 UI minimum).
  - Desktop obscured axe cases: **2/2 PASS** (`axe.spec.ts`, project `a11y`).
  - Accessible-name-once: `VenuePinLayer.test.tsx` asserts the CloudObscured pin announces "sol bakom moln"
    (not "shaded"); component tests render all four states.
  - Two **mobile** obscured axe cases are `test.fixme` — the skips stem from PRE-EXISTING bottom-sheet-shell
    contrast violations UNDERNEATH the forced obscured surface, not from the obscured chrome itself.
- **Evidence:** trace 10.2-AC4; trace §Quality Assessment (WARNING); MEMORY (Story 5.1 bottom-sheet-shell
  contrast debt is the fast-follow owner).
- **Findings:** The obscured chrome's OWN AA is proven (palette + desktop axe green). The mobile skips are
  inherited Story-5.1 shell debt, explicitly accepted and tracked — NOT new to this epic. Non-blocking CONCERN;
  remediation is to un-fixme once the shell contrast debt lands.

---

## Quick Wins

2 quick wins identified:

1. **Pin the About two-signal-blend sentence** (Maintainability/Documentation) — LOW — ~15 min
   - Add an `AboutPage` string-contains assertion for the weather-gating phrase in sv + en to lock the honest
     claim against future copy drift. No production code change.

2. **Record the live-reality spot-check** (Reliability/Ops) — LOW effort, gated on a real grey/clear day
   - Maintainer follows the exact protocol + comparison table already shipped in Story 10.5's Dev Agent Record.

---

## Recommended Actions

### Immediate (Before Release) - CRITICAL/HIGH Priority

**None.** No NFR blocker. The epic coverage/trace gate is PASS and NFR evidence is green at test level.

### Short-term (Next Milestone) - MEDIUM Priority

1. **Live-reality spot-check (10.5-AC2)** - MEDIUM - Maintainer - deferred until a suitable-sky day
   - Perform the recorded spot-check per the Story 10.5 protocol; fetch Met.no `complete` + `nowcast` for
     57.7089,11.9746; compute effective ≈ low+medium+0.25·high; verify the displayed state agrees; fill the
     comparison table. On mismatch, triage root cause BEFORE formally closing the epic.
   - **Validation:** comparison table filled in the story record; displayed state matches fetched values.

2. **Rebaseline the two obscured visual-validation reference PNGs** - MEDIUM - Maintainer
   - map-with-obscured-venue + venue-detail-obscured (mobile + desktop). Dev agents are forbidden from
     self-blessing refs; host screenshot tooling is broken on this Windows machine.

### Long-term (Backlog) - LOW Priority

1. **Un-fixme the 2 mobile obscured axe cases** - LOW - once the Story-5.1 bottom-sheet-shell contrast debt lands.
2. **About two-signal-blend copy assertion** - LOW - the quick win above.

---

## Monitoring Hooks

Epic 10 adds no new runtime monitoring surface. Existing recommendations carry over from prior epics
(the live app already runs on the real data path). No new alerting threshold is introduced by this epic.

---

## Fail-Fast Mechanisms

The epic's fail-fast is behavioural and already in place:

- **Graceful degradation (Reliability):** external-weather outage ⇒ `undefined`/weather-unknown, never a
  throw/500/fabricated clear — proven for both `complete` and `nowcast` clients.
- **Validation gate (Data integrity):** missing cloud can NEVER produce a "clear" gate input; the standing
  regression guard "100% cloud never renders FULL SOL on any surface" runs on every commit.
- **No-live-Met.no guard (CI hygiene):** outbound `api.met.no`/nowcast host rejected in CI by the shared guard.

---

## Evidence Gaps

1 material evidence gap (deferred-verification by design):

- [ ] **Live-reality spot-check (10.5-AC2)** (Reliability / Ops)
  - **Owner:** Maintainer
  - **Deadline:** Before formal epic close (on a suitable-sky day)
  - **Suggested Evidence:** Screenshots of the live map + one venue detail (headline + sky line) alongside the
    raw Met.no `complete` + `nowcast` values for 57.7089,11.9746, with the effective-cover computation.
  - **Impact:** LOW (MEDIUM only if a real displayed-vs-observed mismatch surfaces). The logic is proven
    deterministically at unit + E2E level; this is real-world confirmation, not a code gate.

Non-material / accepted:

- Formal CI burn-in not run (deterministic-by-construction e2e; low residual).
- No dependency-vuln scan artifact in this audit (no new third-party runtime dependency added).
- Live p95 / uptime / error-rate telemetry (out of scope for a data-truth epic; no new perf budget set).

---

## Findings Summary

**Based on ADR Quality Readiness Checklist (8 categories) — scoped to Epic 10's actual surface**

> Several checklist categories have no epic-10 surface (this epic changes displayed truth, not the
> ops/DR/deploy surface). Those are marked N/A and excluded from the scored denominator to avoid a misleading
> "gap" where the epic simply doesn't touch that area.

| Category | Epic-10 Surface | Status |
| -------- | --------------- | ------ |
| 1. Testability & Automation | P0 100% / P1 100% coverage; tagged BDD; deterministic e2e | PASS ✅ |
| 2. Test Data Strategy | WeatherSlice factory (layered split + precip); no-live-Met.no guard; mocked-weather e2e | PASS ✅ |
| 3. Scalability & Availability | Nowcast near-now scoping + coord dedupe; cache internal-consistency | PASS ✅ |
| 4. Disaster Recovery | No DR surface introduced | N/A ℹ️ |
| 5. Security | Met.no TOS posture (shared UA + 4-dec coords); no auth/vuln surface | PASS ✅ |
| 6. Monitorability/Debuggability | Behavioural fail-fast (graceful degradation, standing guards); no new monitor surface | PASS ✅ |
| 7. QoS/QoE | Honest-output correctness (R-001 guard) + a11y AA on obscured state | CONCERNS ⚠️ (mobile axe fixme) |
| 8. Deployability | No deploy-surface change (prod-gated dev-only forcing params unchanged) | N/A ℹ️ |

**Scored categories (excluding N/A):** 5 PASS, 1 CONCERNS, 0 FAIL out of 6 assessed = **strong foundation**.

---

## Gate YAML Snippet

```yaml
nfr_assessment:
  date: '2026-07-03'
  story_id: 'epic-10'
  feature_name: "Honest Sky — Weather-Gated Two-Signal Sun Display"
  categories:
    performance: 'PASS'
    security: 'PASS'
    reliability: 'PASS' # 2 informational CONCERNS (no burn-in; live spot-check deferred)
    maintainability: 'PASS'
    accessibility: 'CONCERNS' # desktop AA green; 2 mobile obscured axe fixme (pre-existing shell debt)
  overall_status: 'PASS'
  critical_issues: 0
  high_priority_issues: 0
  medium_priority_issues: 2 # live spot-check (deferred); visual-ref rebaseline (maintainer)
  concerns: 2 # accessibility mobile axe fixme; live spot-check deferred
  blockers: false
  quick_wins: 2
  evidence_gaps: 1 # live-reality spot-check (deferred-verification by design)
  recommendations:
    - 'PASS — no NFR blocker; merge on green CI'
    - 'Maintainer: record live-reality spot-check (10.5-AC2) before epic close'
    - 'Backlog: un-fixme mobile obscured axe once Story-5.1 shell contrast debt lands; pin About two-signal copy'
```

---

## Related Artifacts

- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-10.md`
- **Traceability + Gate:** `_bmad-output/test-artifacts/traceability/traceability-report-epic-10.md`
- **Automation Summary:** `_bmad-output/test-artifacts/automation-summary-10-5.md`
- **Epic:** `_bmad-output/planning-artifacts/epics.md` §Epic 10 (lines 2645–2790)
- **Stories:** `_bmad-output/implementation-artifacts/10-1..10-5-*.md`
- **Source (NFR-load-bearing):**
  - `nextjs-app/lib/services/sun-engine.ts` (`CLOUD_GATE_THRESHOLD_PERCENT`, `NOWCAST_HORIZON_MS`, `applyCloudGate`)
  - `nextjs-app/lib/solar/effective-cloud-cover.ts` (`CLOUD_WEIGHT_LOW/MEDIUM/HIGH`)
  - `nextjs-app/lib/weather/nowcast-service.ts` (TOS posture + graceful degradation)
  - `nextjs-app/lib/weather/met-no-service.ts` (`?? 0` removed; `complete` endpoint)
- **Evidence Sources (fresh runs 2026-07-03):**
  - NFR-relevant vitest subset: 53/53 passed (nowcast, no-live guard ×2, two-signal-invariants,
    effective-cloud-cover, confidence-calculator)
  - Cloud-gate + met-no subset: 43/43 passed (cache consistency, rain, horizon, missing-data)
  - Full suite (trace run): 1116/1116 passed, 0 skipped; e2e matrix 10/10; desktop obscured axe 2/2

---

## Recommendations Summary

**Release Blocker:** None. Overall NFR status = PASS.

**High Priority:** None.

**Medium Priority:** Maintainer records the live-reality spot-check (10.5-AC2) and rebaselines the two obscured
visual-validation reference PNGs before formally closing the epic (both deferred-verification, not code gates).

**Next Steps:** Proceed to release/merge on a green CI run. The trace gate is PASS and NFR evidence is green at
test level across Performance, Security, Reliability, and Maintainability. Track the 2 non-blocking CONCERNS
(mobile obscured axe fixme; deferred live spot-check) to epic close.

---

## Sign-Off

**NFR Assessment:**

- Overall Status: PASS ✅
- Critical Issues: 0
- High Priority Issues: 0
- Concerns: 2 (Accessibility mobile axe fixme; Reliability live spot-check deferred) — both non-blocking
- Evidence Gaps: 1 (live-reality spot-check — deferred-verification by design)

**Gate Status:** PASS ✅

**Next Actions:**

- PASS ✅: Proceed to release/merge on green CI. Maintainer performs the recorded live spot-check + visual-ref
  rebaseline before formally closing the epic; optionally clear the 2 backlog polish items.

**Generated:** 2026-07-03
**Workflow:** testarch-nfr v4.0

---

<!-- Powered by BMAD-CORE™ -->
