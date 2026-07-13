---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted:
  - 'step-01-detect-mode'
  - 'step-02-load-context'
  - 'step-03-risk-and-testability'
  - 'step-04-coverage-plan'
  - 'step-05-generate-output'
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-07-13'
inputDocuments:
  - '_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-12.md'
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/research/technical-google-places-api-policy-epic-12-research-2026-07-12.md'
  - 'project-context.md'
  - '_bmad-output/qa/mvp-test-design-scope-correction-2026-05-19.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-11.md'
  - '_bmad-output/test-artifacts/nfr-assessment-epic-11.md'
  - '_bmad-output/test-artifacts/traceability/traceability-report-epic-11.md'
---

# Test Design: Epic 12 — Real-Venue Launch Readiness

**Date:** 2026-07-12 · Product-policy amendment: 2026-07-13

**Author:** Rasmus

**Status:** Draft — approved inputs, pre-implementation evidence plan

**Design level:** Epic-level with a system-delta lens; Stories 12.1–12.14

## Executive Summary

This document is the forward Epic 12 QA delta. It does not rewrite the historical April test designs or the completed Epic 11 evidence. The [MVP scope correction](mvp-test-design-scope-correction-2026-05-19.md) remains active except that Story 12.13 supersedes its user-facing confidence-display clauses.

Epic 12 touches the production request path, service-only persisted geometry, opening-hours provenance, every public venue identity seam, selected-instant filtering, shared ranking/presentation semantics, touch interaction, accessibility, media security, and scheduled operations. The test posture therefore combines deterministic CI with evidence that cannot be honestly produced in ordinary PR CI.

**Risk summary:** 22 risks; 10 score at least 6. The launch-critical categories are performance, security, data integrity, business truth, and operations. Stories 12.3 and 12.7 remain explicit public-launch blockers. Story 12.2 is an ongoing accuracy loop, not a hard launch gate.

**Coverage summary:**

- P0: 10 scenario groups, approximately 70–110 atomic checks, ~55–90 test-engineering hours.
- P1: 12 scenario groups, approximately 65–105 atomic checks, ~45–75 hours.
- P2/P3: regression hardening, exploratory/device/performance repetitions, ~20–40 hours.
- Total: ~120–205 hours, approximately 3–5 engineer-weeks depending on fixture and database-harness reuse.

Priority denotes risk and business criticality, not execution timing. Deterministic P0, P1, and applicable P2 tests run in PRs when the complete suite stays below the standing ~15-minute budget. Expensive live, physical-device, and rebaseline evidence uses the separate lanes below.

## Controlling Decisions and Test Defaults

The adopted architecture, completed provider-policy research, and revised PRD/UX control when retained Epic 12 prose conflicts with them.

1. Story 12.1's retained “Google Places weekly sync” wording is superseded. Its story brief must include a **Superseded Epic Text** section naming the dated proposal/research and `E12-AD-01`/`E12-AD-13`. Implementing or testing Google `regularOpeningHours` ingestion is prohibited.
2. Story 12.10's retained wider-discovery and post-scrub options are superseded by `E12-AD-09`: initial-settle-only, already-returned list/favourite candidates, budget 6, concurrency 2, and no restart after scrub or date change. Its story brief needs the same explicit supersession section.
3. Story 12.14's retained acceptance-criterion wording that filters `/favoriter` rows, plus its search/favourites “Open questions for planning” paragraph, is superseded by the 2026-07-13 Product decision and `E12-AD-07`. Its story brief must name both conflicting passages rather than hiding a saved closed venue or treating either behavior as open.
4. Opening hours remain single-interval per ISO weekday. Whole field absent means unknown; missing/null weekday means closed; `close < open` is prior-day spillover. Split, 24/7, seasonal, and holiday-specific schedules route the whole venue to manual review.
5. Public sunny is strictly `sunExposurePercent > 50 && weatherGateState !== 'gated'`. Exactly 50 is grey. Weather `unknown` may expose geometric potential only with explicit unknown/uncertainty communication; it is never presented as known-clear.
6. Same-date scrub remains zero venue requests. Date change remains exactly one list/favourites day-series request. Detail prefetch never restarts for either.
7. Map pins, ranked/area/partial discovery, and availability counts exclude venues explicitly closed at the selected instant. Exact by-name matches remain discoverable with `Stängt vid vald tid`; saved closed favourites remain visible with an accessible greyed treatment and enabled detail navigation. Tests exercise this adopted branch only.
8. No automated test calls live Met.no, Google Places, or another external provider. Adapter, fan-out, expiry, timeout, and policy coverage use deterministic fixtures/mocks or transactionally isolated local/test infrastructure.

## Not in Scope

| Item | Reason | Risk treatment |
|---|---|---|
| Rewriting April `test-design-architecture.md`, `test-design-progress.md`, `test-design-qa.md`, or their handoff | They are explicitly historical inputs. | This dated delta is the forward pointer. |
| Changing or renumbering Stories 12.1–12.14 | The approved proposal preserves the backlog verbatim. | Story briefs reconcile superseded prose before implementation. |
| Multi-interval, 24/7 sentinel, seasonal, or holiday hours | Not in the adopted launch contract. | Whole-venue manual review; never flatten or guess. |
| Alternative closed-search or closed-favourite policies | Product resolved the behavior on 2026-07-13. | Test only the adopted labelled-search/retained-favourite branch; any change requires a new dated product decision. |
| Google Places hours/content persistence | Current ordinary 2026 EEA/MapLibre terms reject it. | Static policy guard, provenance audit, and no-live-call guard. Place IDs alone may remain. |
| Pixel changes without rebaseline governance | Reference changes need human-reviewed evidence. | Separate rebaseline lane and `REBASELINE-LOG.md` gate. |
| Final NFR PASS/CONCERNS/FAIL decision | Implementation evidence does not yet exist. | Run the NFR assessment after evidence collection. |

## Risk Assessment

Probability and impact use the BMad 1–3 scale; score is probability × impact. Score 9 is a release blocker. Scores 6–8 require a completed mitigation or an explicit, time-bounded waiver from the accountable owner.

### High-Priority Risks (score ≥6)

| ID | Category | Risk | P | I | Score | Mitigation / required evidence | Owner | Timeline |
|---|---|---|---:|---:|---:|---|---|---|
| R-001 | PERF/BUS | Cold 42+ venue requests freeze or silently fall back to request-path shadow compute. | 3 | 3 | 9 | Persist exact daily ungated geometry; cold p95, parity, coverage, rollover, and no-fallback gates. | Dev + QA + Platform | Story 12.3, before public launch |
| R-002 | SEC/DATA | Public clients read or poison service-only geometry/weather/run artifacts. | 3 | 3 | 9 | SQL role denial, preview REST denial, service-role secret audit, exact-read tests. | Dev + Platform + QA | Story 12.3 |
| R-003 | SEC/BUS | Hidden/unknown venues leak or live id/slug identity drifts across public routes. | 3 | 3 | 9 | One resolver and the full route/identifier matrix, cache-bound and race evidence. | Dev + QA | Story 12.7; consumed by 12.5/12.10/12.14 |
| R-004 | BUS/DATA | Selected-instant hours or surface policy differs across pins, ranked lists, favourites, exact search, counts, copy, tags, or past-midnight boundaries. | 3 | 3 | 9 | One pure tri-state predicate; all-source parity, surface-policy assertions, and boundary matrix. | Dev + QA + Product | Story 12.14 |
| R-005 | PERF/BUS | New filtering/prefetch/background work breaks scrub=0 or date-change=1. | 3 | 3 | 9 | Network-count E2E on mobile/desktop/touch; prefetch budget/restart assertions. | Dev + QA | Stories 12.3/12.10/12.14 |
| R-006 | BUS/DATA | The >50% public-sunny boundary or comparator drifts among server/client/pin/card/ARIA/feedback/About/window/peak. | 3 | 3 | 9 | Shared predicate/comparator plus parity and boundary golden vectors. | Dev + QA + UX | Stories 12.2/12.6/12.8 |
| R-007 | SEC | Dev editor or include-hidden reads become reachable in production or browser code gains direct Supabase writes. | 2 | 3 | 6 | Production-first deny with flag set, host/origin denial, DCE/static scan, route/RLS tests. | Dev + Security/Platform + QA | Story 12.5 |
| R-008 | DATA/OPS | Hash invalidation, pending generation, or non-atomic promotion mixes old inputs with new artifacts. | 2 | 3 | 6 | Canonical hash golden vectors; dirty/missing fail-closed; atomic promotion race tests. | Dev + QA + Data | Stories 12.3/12.5; consumed by 12.2/imports |
| R-009 | PERF/OPS | Weather fan-out exceeds budgets, delays list reads, uses stale/far-off slices, or fabricates clear on missing data. | 2 | 3 | 6 | Snapshot call-budget/concurrency/deadline/expiry tests; explicit `unknown`; current-bucket parity. | Dev + QA + Platform | Story 12.3 |
| R-010 | DATA/TECH | SQL migration, generated Supabase types, Zod, DTOs, fixtures, and deployed schema drift. | 2 | 3 | 6 | Additive/dual-read rollout tests, old-row contracts, preview apply and empty post-apply schema diff. | Dev + Data/Platform + QA | Every schema-bearing Epic 12 story |

### Medium-Priority Risks (score 3–4)

| ID | Category | Risk | P | I | Score | Mitigation / required evidence | Owner |
|---|---|---|---:|---:|---:|---|---|
| R-011 | BUS/A11Y | Confidence disappears visually but remains in accessible names, route handoff, stale copy/tests, or uncertainty disappears with it. | 2 | 2 | 4 | Visible + accessibility source scan, component/E2E matrix, retained uncertainty assertions. | Dev + QA + UX |
| R-012 | DATA/OPS | Hours audit overwrites valid schedules, stores ineligible provider content, loses provenance, or one venue aborts the batch. | 2 | 2 | 4 | Provider-neutral adapter/outcome, atomic/idempotent write, provenance and per-venue isolation tests. | Dev + QA + Data |
| R-013 | BUS/A11Y | Row-quantized sheet clips rows, exposes a drag gap, breaks real touch/keyboard/internal scroll/recenter/reduced motion. | 2 | 2 | 4 | Real-touch row ladder, keyboard 0..max, scroll-vs-drag and visual states. | Dev + QA + UX |
| R-014 | TECH/OPS | Hydration or MapLibre app-origin warnings return and become allow-listed as noise. | 2 | 2 | 4 | Cold map/detail `console` and `pageerror` fail-on-warning/error guard. | Dev + QA |
| R-015 | PERF/SEC | Media serves mutable/raw/oversized bytes, leaks write access, selects the wrong rendition, or shows broken-image UI. | 2 | 2 | 4 | Storage policy/security checks, create-only/versioning, size/key/origin tests, all-surface fallback. | Dev + QA + Platform |
| R-016 | PERF | Detail prefetch misses the mounted key or creates a 50–100 request idle burst. | 2 | 2 | 4 | Exact shared-key test, budget 6/concurrency 2, cancellation/backoff, favourite candidates, no restart. | Dev + QA |
| R-017 | BUS/A11Y | Coach mark targets are absent or focus/skip/ESC/persistence/reopen behavior fails across layouts. | 2 | 2 | 4 | Target-presence contract and responsive focus-flow E2E/component tests. | Dev + QA + UX |
| R-018 | TECH/OPS | Retained Story 12.1/12.10/12.14 prose is implemented despite the research, architecture, or signed product-policy pivot. | 2 | 2 | 4 | Story-brief supersession audit plus static and behavioral policy guards. | PM/SM + Architect + QA |
| R-019 | BUS/UX | Visual references are rebaselined to an incorrect state or production change moves unrelated UI. | 2 | 2 | 4 | Forced-state assertions, before/after review, dated rebaseline log, human approval. | UX + QA + Rasmus |
| R-020 | BUS/A11Y | Closed exact-name search or saved-favourite behavior drifts from the signed policy, hides deliberate access, appears disabled, or relies on grey alone. | 2 | 2 | 4 | Concrete search/favourite component and E2E assertions: labelled retention, enabled detail action, no map pin, WCAG contrast, and non-colour status. | Dev + QA + UX |

### Low-Priority Risks (score 1–2)

| ID | Category | Risk | P | I | Score | Action |
|---|---|---|---:|---:|---:|---|
| R-021 | OPS | Live p95 or physical-device evidence is environment-sensitive and under-sampled. | 1 | 2 | 2 | Use dated method, repeated trials, device/browser matrix, and raw evidence. |
| R-022 | TECH | Test duplication makes the expanded suite exceed the PR budget and encourages skipping full sweeps. | 1 | 2 | 2 | Keep pure rules at unit level, route contracts at API level, and only critical journeys in E2E; shard Playwright. |

**Residual risk:** public launch remains blocked until all P0 evidence lanes are complete. The closed-search/favourite policy is resolved, but its implementation and accessibility evidence do not yet exist. Google policy could change later, but no test or implementation may assume future permission.

## NFR Planning

| Category | Requirement / threshold | Risk | Planned validation | Evidence for later NFR assessment |
|---|---|---|---|---|
| Performance | Fully cold central-viewport request with 42+ venues is approximately 5 seconds or less at p95; warm/edge p95 <200 ms; pin render for 50 venues ≤100 ms. | R-001/R-005/R-009/R-016 | Live/staging repeated p95 with persisted artifacts; deterministic no-shadow-fallback and request-count tests; prefetch budget instrumentation. | Dated latency dataset with cold definition, percentiles, response mode/hash, venue count; CI reports. |
| Security | Service-only tables deny `anon`/`authenticated`; editor production deny is unconditional; media writes are service-only; no credentials/content leak. | R-002/R-007/R-015 | Compose SQL `SET ROLE`, preview Supabase REST denial smoke, production-config route tests, static secret/provider scan, Storage policy tests. | SQL/REST logs, route test report, policy and environment audit. |
| Reliability | Exact current-hash coverage is 100% across all venues (including hidden) and today..`today + PLANNER_MAX_FUTURE_DAYS + 1`; missing coverage yields typed 503; current weather absence yields explicit unknown within the request budget. | R-001/R-008/R-009 | Coverage-run fixtures, lease/concurrency tests, promotion race, midnight clock tests, expiry/failure injection. | Run summary/alerts, deterministic test output, telemetry sample. |
| Scalability | Weather refresh: deduplicated four-decimal engine-coordinate buckets, provider concurrency 4, 2-second per-call timeout, ≤2 transient retries with jitter; public request path issues zero provider bursts. | R-009 | Fake provider with call counter and virtual time; 42+ and 100-venue synthetic fan-out. | Call-count/concurrency/deadline report and trace. |
| Accessibility | WCAG 2.1 AA; interactive targets ≥44×44; keyboard sheet to 0/max; confidence absent from accessibility sources; coach focus trap/ESC; reduced motion. | R-011/R-013/R-017 | Component semantics + full `a11y` and `a11y-mobile` Playwright projects; touch project for gestures. | Axe reports, Playwright reports, physical-device checklist. |
| Compliance/policy | No Google hours/returned URLs/content in DB, queues, logs, fixtures, DTOs, or public UI; no request-path or scheduled `regularOpeningHours` call. | R-012/R-018 | Static policy scan, fixture/schema scan, provenance audit, deterministic provider-adapter tests. | Zero-ineligible-content audit and signed provenance remediation report. |
| Maintainability | One predicate/resolver/hash/availability helper/query-key factory; typecheck/lint/full tests green; post-apply schema diff empty. | R-003/R-004/R-006/R-010/R-022 | Import-boundary/static guards, golden vectors, full regression sweeps, migration/type parity checks. | CI report, schema diff, traceability update. |
| UX/visual | Every affected forced state matches approved mobile/desktop references; no unrelated layout movement. | R-011/R-013/R-019 | Provider-neutral visual validation plus human rebaseline review. | PNG comparison artifacts and `REBASELINE-LOG.md` entry. |

**Unknown thresholds:** there is no numeric “instant detail open” latency threshold for Story 12.10, no numeric coach-mark transition duration in the Epic text beyond the UX token system, and no numeric visual-diff tolerance because the project uses its provider-neutral visual review. These remain qualitative gates; this document does not invent numbers.

## Entry Criteria

- The Epic 12 story brief being implemented cites the 2026-07-12 proposal, PRD v3.2, UX revision, and its controlling `E12-AD` decisions.
- Story 12.1, 12.10, and 12.14 briefs contain the mandatory **Superseded Epic Text** section before implementation begins.
- Story 12.14 tests encode the adopted labelled exact-search and retained closed-favourite behavior; no alternative parameter remains active.
- Baseline typecheck and lint pass before each story, per `AGENTS.md`.
- Deterministic fixtures exist for 42+ venues, hidden/unknown identity, all hours states, geometry generations, weather buckets, media failures, and Google-policy-negative cases.
- Compose test PostGIS or an isolated equivalent is available for migration/RLS/atomicity tests; live production data is never mutated by automated tests.
- No live Met.no/Google/provider access is possible from the automated test environment.

## Test Coverage Plan

P0/P1/P2/P3 are priority and risk classes, not execution timing. Counts below are planning ranges because one parameterized table may compile into many atomic test cases.

### P0 — Core launch blockers and high risks

| Scenario group | Level | Risks | Atomic checks | Required evidence |
|---|---|---|---:|---|
| Cold persisted geometry and planner coverage | API/integration + live perf | R-001/R-008 | 10–16 | 42+ cold p95; persisted read; no request-path 61-step shadow fallback; value parity for all shared planner steps; current bucket re-gate; exact full horizon + buffer; midnight continuity. |
| Service-only artifact security and exact reads | SQL/API/static | R-002/R-008 | 8–12 | RLS enabled; `anon`/`authenticated` denial; preview REST denial; service-role-only path; old/missing/wrong-hash cannot satisfy read; no public DTO leakage. |
| Canonical hash, invalidation, and atomic promotion | Unit/integration/SQL | R-008/R-010 | 10–16 | `g1:` golden vectors; row/ring/order invariance; all caster/input changes invalidate; dirty path; old generation remains complete until new transaction commits; interrupted promotion never mixes generations. |
| Scheduled geometry completeness and lease | Integration/SQL | R-001/R-008/R-009 | 8–12 | All visible+hidden venues; expected/written/reused/missing/stale/failed counts; 100% or failed run; DB lease + workflow concurrency; heartbeat expiry; idempotent rerun; emergency stop. |
| Weather snapshot budget and degradation | Unit/integration/API | R-001/R-009 | 10–16 | Deduped buckets; concurrency 4; 2-second deadline; ≤2 transient retries; no permanent retry; current/future coverage; expiry→unknown; day+3 outside horizon→unknown; zero request-path provider fan-out; server/list parity. |
| Public venue identity/visibility matrix | API/integration/E2E | R-003/R-007 | 16–28 | ID and slug across list, detail, reviews GET/POST, feedback POST, favourites-by-ID, and prefetch; visible/hidden/unknown; fixture fallback only in fixture mode; public `includeHidden` denied; show restores; cache race and ≤30-second bound. |
| Selected-instant availability across every source | Unit/component/E2E | R-004/R-005/R-020 | 18–28 | Unknown field visible; null/missing weekday closed; before/open/close boundary; prior-day past midnight; Stockholm date/DST; ranked rows/pins/counts exclude closed; exact-name result remains labelled/openable; saved favourite remains greyed, labelled, openable, and pin-free; selection continuity, copy, tag AND. |
| Request-count invariants and bounded detail prefetch | Unit/E2E | R-005/R-016 | 8–12 | Same-date scrub=0; date-change=1; exact mounted key; initial-settle only; total 6/concurrency 2; list+favourite candidates in visible order; yield/cancel/backoff; no scrub/date restart or expanded discovery. |
| Shared sunny predicate/comparator/window/peak parity | Unit/API/component/E2E | R-006 | 14–22 | 50 grey/50+epsilon amber; gated grey; unknown-weather honesty; server/client comparison tuple; low-Partial; pin/card/ARIA/feedback/About; longest run, first/last qualifying endpoints, earliest equal-length window, earliest equal peak; server-client parity. |
| Production editor hard deny and API boundary | Unit/API/static/SQL | R-007/R-010 | 10–16 | `NODE_ENV=production` denies before flag/input even with flag set; loopback only; forwarded-host ambiguity denied; UI absent from production bundle; include-hidden editor-only; strict Zod; browser never imports/writes Supabase; minimum grants; polygon/media/hash/visibility seams. |

**P0 estimate:** ~55–90 hours. P0 is intentionally compact in scenario groups even though parameter matrices expand to many checks.

### P1 — High-value correctness, UX, policy, and operational gates

| Scenario group | Level | Risks | Atomic checks | Required evidence |
|---|---|---|---:|---|
| Confidence removal without honesty loss | Static/unit/component/E2E/a11y | R-011 | 10–16 | No visible or screen-reader confidence percentage in card, QuickInfo, detail, list aria, route overlay, or both locales; stale props/util/keys/tests removed; internal confidence remains; uncertainty/weather row remains with clean separators. |
| Provider-neutral hours audit and provenance | Unit/integration/SQL/static | R-012/R-018 | 14–22 | `accepted/manual_review/failed`; split/24-7/seasonal/holiday whole-venue manual review; no partial write; failure retains prior verified schedule and marks stale; provenance atomic/idempotent; per-venue isolation; 180-day outcome retention; no public trigger. |
| Google-content and no-live-provider policy guard | Static/contract | R-012/R-018 | 8–12 | No `regularOpeningHours` request, raw/normalized Google hours, returned/provider/API-key URL, credential, fixture, queue, log, DTO, or UI path; Place ID-only allowance; zero user-path calls; Story 12.1 supersession audit. |
| Row-quantized sheet, touch, and accessibility | Unit/component/E2E touch+a11y | R-013/R-019 | 12–20 | Height formula includes chrome + actual row; 0/1/few/max/mid-drag; no gap/safe area; body drag; scrollTop rule/internal scroll; keyboard one row to 0/max; announcement/focus; recenter padding; reduced-motion; desktop unchanged. |
| Console and page-error hygiene | E2E | R-014 | 4–8 | Cold map and detail emit zero app-origin error **or warning** and zero `pageerror`; exact-source exceptions only with evidence; no blanket MapLibre allow-list. |
| Immutable media rendition/security/fallback | Unit/component/API/SQL/E2E | R-015 | 14–22 | Exact origin/bucket/key; create-only immutable version; card ≤640×400/120 KiB; hero ≤1600×900/350 KiB; sRGB WebP/metadata stripped; originals inaccessible; public SELECT only; anon/auth writes denied; correct rendition per surface; legacy fallback; missing/decode/error fallback once and failed image leaves accessibility tree. |
| Coach-mark target/focus/persistence | Component/E2E/a11y | R-017/R-019 | 10–16 | Mobile/desktop target exists before step; no hidden feedback target; skip/close at every step; ESC; focus trap/description; seen flag/cross-tab; Settings reopen; responsive anchor; reduced motion; Swedish/en parity. |
| About explanation and accuracy truth | Unit/component/visual | R-006/R-011/R-019 | 5–8 | Legend matches shared predicate; sun percentage is seating share, not probability; selected-time wording; no confidence number; placeholder accuracy removed/labelled or sourced from real aggregation. |
| Feedback accuracy/version contract | Unit/API/SQL | R-006/R-008/R-010 | 8–12 | Exposure/verdict/gated/unknown/hash persisted and server-validated; gated+unknown impossible; `unsure` excluded/reported separately; current-hash aggregation only; real live resolver. |
| Migration and schema-drift gate | SQL/type/contract | R-010 | 8–14 | Versioned idempotent repo migration; live-only reconciliation; additive→dual-read→backfill→consumer→remove sequence; old rows; generated type/Zod/DTO/fixture parity; preview apply; post-apply diff empty. |
| Visual rebaseline set | Visual + human review | R-019 | 7 story sets | Stories 12.6, 12.8, 12.9, 12.11, 12.12, 12.13, and 12.14 provide affected mobile/desktop state evidence and update `REBASELINE-LOG.md` in the same operation. |
| Story-brief supersession guard | Static/review | R-018 | 2–4 | Story 12.1 and 12.10 briefs name superseded intent and controlling decisions before their review gate. |

**P1 estimate:** ~45–75 hours.

### P2/P3 — Hardening and exploratory evidence

| Scenario group | Level | Priority | Evidence |
|---|---|---|---|
| 100-venue synthetic headroom and scheduled-run burn-in | Integration/perf | P2 | Repeated idempotent runs, bounded memory/storage/call counts, no lease overlap. |
| Locale/timezone/DST fuzz around hours and window labels | Unit/property-style | P2 | Deterministic Stockholm boundary seeds and malformed schedule rejection. |
| Physical-device matrix and real network variation | Manual device | P3 | iOS Safari and Android Chrome touch/keyboard/safe-area checklist with screenshots. |
| Cold p95 repetition and production visibility propagation observation | Live observation | P3 | Raw trial set and cache-state labels; no automated provider calls. |
| Exploratory coach-mark/sheet/media recovery | Manual exploratory | P3 | Session notes linked from the owning story. |

**P2/P3 estimate:** ~20–40 hours.

## Story-to-Risk Traceability

Every story has planned coverage; shared contracts are verified at their owning story and re-run at consumers.

| Story | Primary risks | Required test levels and evidence |
|---|---|---|
| 12.1 | R-012, R-018, R-010 | Static policy, adapter unit/contract, scheduled-audit integration/SQL, provenance live-data audit, schema drift, superseded-text brief audit. No Google calls. |
| 12.2 | R-006, R-008, R-003, R-010, R-011 | Shared predicate unit parity, feedback API/SQL/version aggregation, real resolver, uncertainty component regression, full Vitest and cross-project Playwright where public assertions change. |
| 12.3 | R-001, R-002, R-005, R-008, R-009, R-010 | Hash/series unit golden vectors, SQL/RLS/atomicity, scheduled integration, API degradation/request counts, live cold p95, full Vitest + Playwright request-count regression. |
| 12.4 | R-014, R-019 | Cold map/detail console/pageerror E2E on mobile+desktop; visual no-change evidence; full relevant Playwright sweep. |
| 12.5 | R-007, R-003, R-008, R-010, R-015 | Production-config route/static/RLS tests, public route matrix, coordinate separation, polygon/media validation, hash/atomic invalidation, default visual no-leak. |
| 12.6 | R-006, R-019, R-011 | Predicate/comparator unit/API, pin/card/ARIA components, mobile+desktop E2E+a11y, full Vitest/Playwright, approved rebaseline. |
| 12.7 | R-003, R-007 | ID/slug visible/hidden/unknown API matrix for every route, fixture/live mode separation, cache race; launch-blocking integration evidence. |
| 12.8 | R-006, R-011, R-019 | About component/i18n/presentation tests, no fabricated accuracy/confidence, mobile+desktop a11y/visual rebaseline. |
| 12.9 | R-013, R-005, R-019 | Pure height/recenter unit, component keyboard/scroll, real-touch ladder, mobile a11y, desktop non-regression, full Playwright projects, forced-state/rebaseline evidence. |
| 12.10 | R-016, R-005, R-003, R-018 | Exact query-key and scheduler unit, network-count E2E including favourites, hidden guard, cancellation/backoff, superseded-text brief audit. |
| 12.11 | R-017, R-019 | Component focus/persistence/target contracts; mobile+desktop E2E+a11y/reduced-motion; visual first/middle steps. |
| 12.12 | R-015, R-010, R-019 | Storage SQL/security and upload contract, media DTO migration, component/E2E all-surface rendition/fallback/a11y, visual real+broken states. |
| 12.13 | R-011, R-019, R-010 | Source/i18n scan, component/E2E/a11y absence + uncertainty retention, internal DTO/log contract, full Vitest and all Playwright projects, rebaseline. |
| 12.14 | R-004, R-005, R-003, R-020, R-019 | Hours unit boundary table, all-source component integration, request-count and route E2E across mobile/desktop/touch/a11y, exact-name labelled return, retained greyed/inspectable favourite, no closed map pin, superseded-text brief audit, and visual open/closed states. |

## Cross-Epic Regression Requirement

When a story changes a shared DTO, query key, selected-instant derivation, status presentation, comparator, opening-hours contract, public identity/visibility guard, or responsive interaction, story-level focused tests are insufficient. The review evidence must include:

1. Full `npx vitest run`.
2. Full Playwright `mobile`, `desktop`, `touch`, `a11y`, and `a11y-mobile` projects, not a selected spec subset.
3. The standing Epic 11 scrub=0/date-change=1, real-touch slider/sheet, tag-filter parity, day-series parity, opening-hours honest-render, and recenter gates.
4. Epic 10 weather matrix and no-live-Met.no guards whenever weather state, public sunny, uncertainty, or day-series gating changes.
5. A source/i18n accessibility scan whenever visible copy or user-facing fields are removed.

This full sweep is expected for Stories 12.2, 12.3, 12.5, 12.6, and 12.8–12.14. Story 12.1 and 12.4 may remain focused only if they truly leave shared contracts/assertions unchanged; any schema/DTO or UI assertion change triggers the same full sweep. Story 12.7 requires the full API/route suite and the full browser sweep if the shared resolver changes any client-visible status or cache behavior.

## Evidence Lanes

Evidence from one lane cannot substitute for another.

### 1. Deterministic PR/CI evidence

- Typecheck, lint, full Vitest, and applicable full Playwright projects.
- Local/test PostGIS migrations, SQL role denial, lease, atomic promotion, and schema-diff checks.
- Deterministic 42+ venue fixtures, fake clocks, provider/weather fixtures, and static policy/source scans.
- No live Met.no, Google Places, Supabase production mutation, or other external-provider calls.
- CI retains Playwright reports/traces on failure and migration/test logs.

### 2. Live performance and provider-operational evidence

- A deployed, production-like cold path with 42+ real-shape venues and already-populated geometry/weather snapshots. Tests observe the SunnySeat endpoint; they do not call Met.no or Google directly.
- Cold is defined and recorded (fresh application instance/process caches empty, edge-hit state identified, persisted DB artifacts retained). Collect enough trials to calculate p95; report raw values, failures, venue count, Stockholm date, hash generation, and whether the result was edge/warm/cold.
- Prove the request performed persisted geometry reads and zero request-path provider fan-out/shadow recompute through logs/metrics, not latency alone.
- Scheduled provider behavior is validated against deterministic replay/stub infrastructure. The hours provenance audit is a reviewed data report, not a live Google test.

### 3. Physical-device evidence

- iOS Safari and Android Chrome on at least one notched/safe-area phone.
- Sheet row ladder from venue body and handle, internal scroll, slim slider thumb drag, focus/keyboard where supported, coach marks, media fallback, and reduced-motion setting.
- Record device/OS/browser, orientation, pass/fail, screenshots, and any device-only variance.

### 4. Visual rebaseline evidence

- Required for visual changes in Stories 12.6, 12.8, 12.9, 12.11, 12.12, 12.13, and 12.14.
- Assert the forced state before capture; include mobile and desktop where the screen exists and touch/mid-drag evidence where applicable.
- Update `nextjs-app/docs/design/references/REBASELINE-LOG.md` with reason, story, source, viewport, and reviewer in the same operation.
- A reference must not be replaced merely to make a failing implementation pass. Human approval is required.

### 5. Public-launch sign-off evidence

- All P0 scenario groups at 100%, no open score-9 risk, and no unmitigated score ≥6 risk.
- Stories 12.3 and 12.7 complete with their live/route evidence.
- 100% current planner-window-plus-buffer geometry coverage, current weather snapshot monitoring, and typed missing-coverage/unknown-weather behavior observed.
- Service-role secret/environment/rotation and emergency-stop audit; preview RLS/Storage REST denial; production editor deny.
- One-time hours provenance remediation shows zero Google-derived or unprovenanced public schedules retained; no live/production Google hours path.
- The adopted exact-name closed-search and retained closed-favourite branch passes before Story 12.14 is signed off or public-launch sign-off is granted.
- Physical-device and visual rebaseline evidence approved; cold p95 target met; no app-origin console errors/warnings.
- Migration applied from repository authority, generated types match, and post-apply schema diff is empty.

## Execution Strategy

**PR:** Run all deterministic functional tests when the full job remains under ~15 minutes: typecheck, lint, full Vitest, and Playwright sharded across mobile/desktop/touch/a11y projects. Run Compose-backed SQL/security/migration tests in an isolated project-scoped database. Fail fast on static Google-policy, production-editor, schema/type, and no-live-provider guards.

**Nightly:** Run the 42+/100-venue scheduled-job integration set, lease/atomicity burn-in, retry/deadline/expiry fault injection, and longer migration replay. These remain deterministic and provider-isolated.

**Weekly or release-candidate:** Collect production-like cold p95 and operational snapshot evidence, run physical-device checks, complete visual rebaseline review, and assemble public-launch sign-off. Provider-policy research is rechecked only through an explicit research/governance action, never by probing Google in tests.

Philosophy: run everything in PRs unless infrastructure or duration makes it genuinely expensive; do not use priority as a reason to omit deterministic coverage.

## Resource Estimates

| Priority | Effort range | Notes |
|---|---:|---|
| P0 | ~55–90 hours | Database/security harness, 42+ venue geometry/weather fixtures, route matrices, request counts, live p95 method. |
| P1 | ~45–75 hours | Cross-surface/a11y/visual/media/provider-neutral operations and full sweeps. |
| P2 | ~12–24 hours | Synthetic scale, migration burn-in, timezone/property hardening. |
| P3 | ~8–16 hours | Physical-device, repeated live observation, exploratory records. |
| **Total** | **~120–205 hours** | Approximately **3–5 engineer-weeks**, excluding feature implementation and policy/product decision time. |

### Test Data and Environment Prerequisites

- A deterministic 42+ venue fixture with visible and hidden rows, unique/shared IDs/slugs, favourites outside the nearby list, valid/invalid seating polygons, and exact current/old/pending geometry hashes.
- Geometry series fixtures for every shared planner minute, missing/wrong/stale hashes, and atomic-generation race control.
- Weather snapshots for gated/not-gated/unknown, current/expired/future/out-of-horizon, radar rain, transient/permanent failures, concurrency and timeout control.
- Hours fixtures for unknown whole field, closed weekday, normal interval, before/at/after boundaries, past-midnight prior day, split/24-7/seasonal/manual-review, and the adopted labelled-search/retained-favourite surface policy.
- Media fixtures for valid card/hero, legacy URL, wrong origin/key/type/size, missing object, decode failure, immutable replacement, and denied write roles.
- Project-scoped Compose test database or isolated preview Supabase; protected production-like performance target with read-only observation credentials where possible.

## Exit Criteria

- All P0 scenario groups pass with complete deterministic and required live evidence; no score-9 risk remains open.
- P1 pass rate is at least 95%, with no security, policy, accessibility, or data-integrity failure waived into public launch.
- The full cross-epic Vitest/Playwright sweep is green wherever shared assertions changed.
- The correct evidence lane contains cold p95, device, visual rebaseline, schema/RLS, provider-policy, and public-launch records; a CI substitute is not accepted for a missing live/manual gate.
- No open P0/P1 defect remains; any lower-priority residual has an owner, rationale, and review date.
- The adopted exact-name closed-search and retained closed-favourite branch passes before Story 12.14 is signed off or public-launch sign-off is granted.

## Quality Gates

- P0 pass rate: 100%; no waiver for score-9 risks.
- P1 pass rate: at least 95%; any failure has owner, rationale, expiry, and evidence that no P0 path is affected.
- Security/policy scenarios: 100% pass.
- High-risk mitigations: 100% complete before public-launch sign-off.
- Requirements/risk traceability: 100% of Stories 12.1–12.14 mapped; at least 80% overall atomic scenario automation, with manual-only evidence explicitly labelled.
- Full cross-epic Vitest/Playwright sweep wherever shared assertions change.
- Cold p95, coverage, request-count, RLS/editor, provider-policy, console, migration/schema, device, and visual evidence present in their correct lanes.
- Final NFR status is deferred to a post-implementation NFR assessment; missing evidence is not interpreted as PASS.

## Interworking and Regression

| Component / boundary | Epic 12 impact | Required regression scope |
|---|---|---|
| Sun engine, persisted geometry, weather snapshots | Splits deterministic geometry from read-time gating. | Epic 10 two-signal/no-fabrication + Epic 11 day-series parity/request-count suites; hash and current-bucket parity. |
| Supabase migrations/RLS/generated types | Adds service-only tables and public venue/media/provenance fields. | Migration replay, role denial, old-row dual-read, generated type/Zod/DTO/fixture parity, empty schema diff. |
| Venue list/detail/query keys | Full candidate set, selected-instant filter, bounded prefetch. | Date-only list keys, exact detail key, scrub/date counts, favourites and hidden route matrix. |
| Reviews/feedback | Shared live ID/slug resolver and versioned prediction evidence. | Existing review/feedback persistence/rate-limit/error tests plus hidden/unknown matrix. |
| Pin/list/card/About/route overlay | Shared sunny semantics and confidence removal. | Server/client sort parity, low-Partial, ARIA/i18n, uncertainty/weather honesty, visual states. |
| Mobile sheet/time slider/recenter | Fixed snaps become height/row model. | Epic 11 real-touch slider/sheet, forced state, internal scroll, recenter, a11y and reduced motion. |
| Media/Storage | Immutable card/hero renditions and fallbacks. | Storage access policies, DTO rollout, component/E2E load/error/a11y, bandwidth limits. |
| Scheduled GitHub workflows | Geometry/weather/hours audits with independent stops. | Auth/trust boundary, lease/non-overlap, failure isolation, summaries/retention, secret audit, no provider calls in tests. |

## Assumptions and Dependencies

1. `PLANNER_MAX_FUTURE_DAYS` remains a shared imported constant; tests derive the horizon rather than copy `3`.
2. Current technical defaults in `E12-AD-01`–`E12-AD-13` are approved unless a new dated decision supersedes them.
3. Public visibility has a documented maximum cross-browser staleness of 30 seconds; the editing browser invalidates immediately.
4. The existing Playwright projects remain `mobile`, `desktop`, `touch`, `a11y`, and `a11y-mobile`.
5. Rasmus/Product resolved the closed-search/favourite policy on 2026-07-13; changing it requires a new dated product decision and corresponding canonical/test updates.
6. Story ordering honors shared ownership: 12.3 owns hash/geometry; 12.7 owns resolver; 12.6/shared domain owns sunny; 12.14 owns availability; consumers do not invent local variants.

## Appendix: Source and Knowledge References

- [Approved sprint change proposal](../planning-artifacts/sprint-change-proposal-2026-07-12.md), especially §4.5.
- [PRD v3.2](../planning-artifacts/prd.md).
- [UX design specification](../planning-artifacts/ux-design-specification.md).
- [Architecture Epic 12 delta](../planning-artifacts/architecture.md), `E12-AD-01`–`E12-AD-13`.
- [Epic 12 stories](../planning-artifacts/epics.md), Stories 12.1–12.14; retained superseded wording is historical input only.
- [Google Places policy research](../planning-artifacts/research/technical-google-places-api-policy-epic-12-research-2026-07-12.md).
- [Project context](../../project-context.md), including planned Epic 12 invariants and the resolved closed-search/favourite policy.
- [Epic 11 test design](../test-artifacts/test-design/test-design-epic-11.md), [NFR assessment](../test-artifacts/nfr-assessment-epic-11.md), and [traceability report](../test-artifacts/traceability/traceability-report-epic-11.md).
- BMad knowledge: `risk-governance.md`, `probability-impact.md`, `test-levels-framework.md`, `test-priorities-matrix.md`, and `nfr-criteria.md`.

---

**Generated by:** BMad TEA test-design workflow

**Workflow mode:** Epic-Level / system delta

**Version:** 2026-07-12
