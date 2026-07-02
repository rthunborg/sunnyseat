---
stepsCompleted:
  - 'step-01-load-context'
  - 'step-02-define-thresholds'
  - 'step-03-gather-evidence'
  - 'step-04-evaluate-and-score'
  - 'step-04e-aggregate-nfr'
  - 'step-05-generate-report'
lastStep: 'step-05-generate-report'
lastSaved: '2026-07-01'
workflowType: 'testarch-nfr-assess'
inputDocuments:
  - '_bmad-output/implementation-artifacts/9-0..9-10 story files'
  - '_bmad-output/test-artifacts/traceability/traceability-report-epic-9.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-9.md'
  - '_bmad-output/planning-artifacts/architecture.md (NFR table + Caching Strategy)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
---

# NFR Assessment - Epic 9 "Live-App Hardening & Clean-Up"

**Date:** 2026-07-01
**Story:** Epic 9 (stories 9.0–9.10)
**Overall Status:** PASS (advisory) ✅ — with 3 CONCERNS (all accepted deferrals, none blocking)

---

Note: This assessment summarizes existing evidence; it does not run tests or CI workflows.
This is an **ADVISORY** audit — one tier below the blocking requirement→test **trace gate**,
which already returned **PASS** (30/30 ACs FULL, P0 100%). It audits the *quality of NFR evidence*
for the four core attributes (performance, security, reliability, maintainability) plus the
scalability/deployability dimensions the shipped work touches.

## Executive Summary

**Assessment:** 4 core attributes PASS, 3 sub-criteria CONCERNS (all accepted, evidenced deferrals).

**Blockers:** 0. No FAIL. No exploitable security finding across any of the 11 stories.

**High Priority Issues:** 0. The single CRITICAL-risk item of the epic (R-002, uncached double-RPC
sun engine, score 9) is fully mitigated with in-CI proof.

**Recommendation:** **PASS (advisory)** — release is not gated by NFR evidence. The three CONCERNS are
evidence *completeness* items (live latency numbers, visual-reference rebaseline, two pre-existing
mobile-only e2e failures) that are each already covered by an accepted CI proxy signal or a logged
maintainer follow-up, exactly as the epic test design prescribed. None represents an unmitigated risk.

---

## Performance Assessment — **PASS (with 1 evidence CONCERN)** ⚠️→✅

Epic 9's performance thesis is Story 9.3 (server caching) + Story 9.4 (client query hygiene). Together
they resolve the live "stalls on every load" symptom (test-design risk R-002 score 9 + R-005 score 6).

### Response Time (server compute cost)

- **Status:** PASS ✅ (proxy metric); ms-latency CONCERNS ⚠️ (deferred)
- **Threshold:** `<200ms API p95` (architecture NFR9); epic acceptance signal = RPC volume halved +
  byte-identical sun outputs + measurable warm-cache speedup.
- **Actual:** RPC volume per 7-venue list **14 → 7** (2 building RPCs/venue → 1); **warm 2nd identical
  list = 0 additional building RPCs** (full cache hit). Sun outputs **byte-identical** to the pre-refactor
  engine (inline-snapshot deep-equality, treated as FAIL-not-rebaseline). Building RPCs measured at
  ~145–440 ms each live, so removing ~7 per list load is a material latency win.
- **Evidence:** `test/unit/services/sun-engine-caching.atdd.test.ts` (RPC call-count = 1/venue +
  `toMatchInlineSnapshot` byte-identical + 2nd-request-same-bucket = 0 RPCs + new-bucket recompute +
  cached `toEqual` uncached + honest `weatherUpdatedAt`); `venues-route-caching.atdd.test.ts`
  (edge-cacheable identical ETag). Two server caches: buildings (centroid@4dp+radius, TTL 24h) and
  sun-compute (venue.id + 15-min bucket + Stockholm day + geometry/elevation variant, TTL 15 min).
  Both live in the engine seam so `/api/venues` (list) AND `/api/venues/[slug]` (detail) inherit them.
- **Findings:** The in-CI acceptance signal (RPC-count + cache-hit) is present and green. **Live cold/warm
  wall-clock ms-latency is DEFERRED to a maintainer/preview run** — measuring against live Supabase here
  is network-dependent and non-reproducible (exactly the flaky timing the test design forbids asserting
  in CI). No timing numbers were fabricated. **CONCERN (accepted):** absolute p95 vs the <200ms NFR is
  not yet captured with real numbers — proxy-covered, not a gap.

### Client Request Volume (query hygiene)

- **Status:** PASS ✅
- **Threshold:** a settled time change issues **exactly ONE** `/api/venues` request; Favoriter↔Närmast
  issues no redundant fetch; single initial fetch (no fallback→GPS double-fetch).
- **Actual:** `useDeferredValue(plannerQuery)` defers only the query-driving key (thumb/badge stay live);
  a 4-step drag settling off-live enqueues **exactly 1** additional fetch (`fetchSpy` = 2 total, never 4);
  Favoriter derived from the `venues.list`/`planner` cache (`enabled:false` → 0 fetch); first fetch gated
  on `coordsSettled`. Nav-chip `useVenueSearch` key was **realigned** to MapView's exact deferred+gated
  key (a Med review finding, RESOLVED) so TanStack de-dupes both to one request.
- **Evidence:** `deferred-planner-query.test.tsx`, `MapView.test.tsx`, `useVenueSearch.test.ts`,
  `useFavouriteVenues.test.ts`, `DesktopNavBar.test.tsx` (de-dupe-invariant test).
- **Findings:** All three 9.4 fixes assert deterministically at the hook/component level; 4-dp coordinate
  bucket, `staleTime`, and `keepPreviousData` preserved. No flaky timing assertion needed.

### CDN / Edge Cacheability

- **Status:** PASS ✅
- **Threshold:** the `s-maxage=30` CDN header must become genuinely honour-able (it was dead because the
  handler read `x-forwarded-for` for rate-limiting, forcing the route dynamic) — R-013.
- **Actual:** Rate-limiting relocated to the Edge proxy (`proxy.ts`); the GET handler no longer reads
  request headers → pure, header-independent, edge-cacheable function. Edge-safe pure-JS IP validators
  replaced `node:net` (Edge runtime forbids it). Identical ETag regardless of `x-forwarded-for` proven.
- **Evidence:** `venues-route-caching.atdd.test.ts`, `rate-limit.test.ts`, `proxy-matcher.test.ts`;
  `architecture.md` Caching Strategy documents Option A + the staleness window.

### Bundle / Frontend Budget

- **Status:** PASS ✅ (no regression)
- **Threshold:** ≤600KB gzipped JS total (NFR8; MapLibre chunk excluded from the tighter sub-budget).
- **Actual:** 9.3 is server-side (no bundle impact). 9.7/9.8/9.9 are small component/i18n edits; no new
  runtime dependency added across the epic. `next build` succeeds. The Lighthouse/bundle gate runs as
  today and was not regressed (no story added a heavy dependency).
- **Evidence:** Story File Lists (no dependency additions); `next build` green in 9.3 debug log.

---

## Security Assessment — **PASS** ✅

### Vulnerability Management / Exploitable Findings

- **Status:** PASS ✅
- **Threshold:** 0 exploitable findings; the production planner-leak (R-001) proven gated.
- **Actual:** **Every one of the 11 stories carried a dedicated security review; 0 exploitable findings
  across the epic.** R-001 (production `?_time=`/`?_date=` planner-pin URL leak) is gated: forced values
  resolve to `undefined` when `NODE_ENV==='production'` via a two-component split that lets the bundler
  DCE the `useSearchParams` read out of the production bundle entirely — asserted in prod AND dev branches.
- **Evidence:** `AppContextProviders.test.tsx` (prod branch: forced date absent + `useSearchParams` never
  called; dev branch honours `13:00`/forced date); per-story "Review Findings → Security: 0 findings".

### Authentication / Authorization

- **Status:** PASS ✅ (N/A surface, no new exposure)
- **Threshold:** no new auth/authz surface; DB access remains server-only.
- **Actual:** Epic 9 introduces no user-auth surface — venue reads are public. The 9.7 `tags` migration
  uses a **server-only service-role Supabase client** (`lib/supabase/server.ts`); no client-side privilege.
  The only access-control-adjacent behaviour is the per-IP rate limiter, now relocated to the Edge proxy.
- **Evidence:** trace report auth/authz heuristic (0 auth negative-path gaps); 9.7 review "SQL / RLS clean".

### Data Protection / Rate Limiting

- **Status:** PASS ✅
- **Threshold:** DoS rate-limiting preserved after the relocation; malformed input rejected.
- **Actual:** 429 (per-IP token-bucket) + 400 (malformed `x-forwarded-for`) negative paths preserved,
  now fired from the proxy. `coerceTags` sanitizes null/garbage DB values → `[]`. Share-URL builder drops
  `_state`/`_time`/`_date`/tag params for a clean link (no dev-param leakage in shared URLs).
- **Evidence:** `rate-limit.test.ts`, `venues-route-caching.atdd.test.ts`, `venue-store.test.ts`
  (`coerceTags`), `share.test.ts`.

### Data Integrity (fabricated-metadata removal)

- **Status:** PASS ✅
- **Threshold:** remove venue metadata that contradicts the real engine (R-003, trust/data-honesty).
- **Actual:** EXPONERING / BÄST KL. / Platser ute / uncertainty paragraph / fabricated tags removed;
  only truthful signals (confidence %, real distance, real Supabase-sourced tags) retained; honest
  "≈ från centrum" approximate-distance labelling added on the Gothenburg fallback.
- **Evidence:** `VenueDetailContent.test.tsx`, `VenueQuickInfo.test.tsx`, `VenueCard.test.tsx`,
  `VenueTagsData.atdd.test.tsx`, approximate-distance ATDD tests, `messages-parity.test.ts`.

---

## Reliability Assessment — **PASS (with 1 CONCERN)** ⚠️→✅

### Error / Degradation Paths

- **Status:** PASS ✅
- **Threshold:** risky degradation paths handled, not crashed; transient failures not pinned in cache.
- **Actual:** building-RPC `null` → unavailable result **NOT cached** as success (transient failure never
  pinned across the 15-min window); native-share `AbortError`/unsupported/failed → graceful modal
  fallback (never a dead button or unhandled rejection); clipboard rejected-write → no false "Kopierad";
  geolocation fallback/denied → honest labelling + retry; null-coord MapLibre `project()` guarded.
- **Evidence:** `sun-engine-caching.atdd.test.ts` (null not cached), `VenueDetailOverlay.test.tsx` +
  `ShareModal.test.tsx` (share degradation), `LocateAndSwReload.atdd.test.tsx`, `MapView.test.tsx`
  (`hasValidVenueLocation` guard, +3 tests).

### Availability / Freshness (staleness handling)

- **Status:** PASS ✅
- **Threshold:** 99.5% uptime + weather-staleness handling (architecture Reliability NFR); a bounded,
  documented cache-staleness window.
- **Actual:** Documented staleness envelope — client TanStack 5 min · CDN `s-maxage=30` · sun-compute
  server cache 15 min (≤1 slider bucket) · buildings server cache 24h (geometry is static). Weather
  honesty (`isForecast` / >2h / `weatherUpdatedAt`) preserved through caching — a cached bucket carries
  its honest valid-time, so caching does not make the weather signal dishonest.
- **Evidence:** `architecture.md` Caching Strategy; `sun-engine-caching.atdd.test.ts` (honest
  `weatherUpdatedAt` preserved for a cached bucket); route freshness headers preserved.

### Onboarding / First-Paint Reliability

- **Status:** PASS ✅
- **Threshold:** correct screen from frame #1 (no map-flash / dead locate click); SW stale-shell single
  reload (R-004).
- **Actual:** Synchronous first-render onboarded read (real screen frame #1, no flash); locate wired
  immediately (early click → permission prompt); SW `controllerchange` → exactly one reload (refreshing
  latch + first-install guard).
- **Evidence:** `OnboardingGate.synchronous.atdd.test.tsx` (7 tests), `LocateAndSwReload.atdd.test.tsx`
  (5 tests), `onboarding.spec.ts` clean-context.

### CI Stability / Regression Guard

- **Status:** PASS ✅ (with mobile-e2e CONCERN)
- **Threshold:** full suite green; the Story 9.10 named regression set present + green.
- **Actual:** Final suite **106 files / 936 tests all green** (tsc 0, eslint 0, `next build` green). The
  9.10 AC2 regression net (clean-URL date refetch, one-request-per-settled-time, Favoriter↔Närmast
  no-refetch, location-dot on success, prod planner-leak gate) all present + green. Mobile Playwright pass:
  **38 pass / 4 pre-existing failures logged**.
- **Findings:** **CONCERN (accepted):** 2 mobile-only e2e failures surfaced by the 9.10 pass —
  onboarding-CTA `getCurrentPosition` not resolving under iPhone-14 emulation, and the mobile favourites
  `Sol HH:MM` label absent — both verified RED with the 9.10 guard reverted (**pre-existing, NOT introduced
  by Epic 9**); plus a pre-existing desktop-only `map-primary.spec.ts:645` red on baseline `main`. Handed
  to the maintainer for a real-device confirm. Not an Epic 9 regression.

---

## Maintainability Assessment — **PASS** ✅

### Test Coverage / Test Growth

- **Status:** PASS ✅
- **Threshold:** every AC covered by a deterministic in-CI test; test count grows, none dropped.
- **Actual:** Trace gate = **30/30 ACs FULL, P0 100%, P1 100%**. Suite grew monotonically across the epic
  (83 files/699 → 106 files/936; +~237 tests) with 0 dropped. New ATDD scaffolds un-skipped and green.
- **Evidence:** `traceability-report-epic-9.md` (PASS); per-story vitest deltas in Completion Notes.

### Code Quality / Debt (honesty of the codebase)

- **Status:** PASS ✅
- **Threshold:** no false comments; no dead controls; lint/type clean.
- **Actual:** The two actively-FALSE "one buildings fetch reused internally" comments in `sun-engine.ts`
  were corrected (they had masked the double-RPC perf bug). Dead placeholders removed (nav chevrons,
  category buttons, disabled settings gear now wired, disabled share button now wired). Dead i18n keys
  removed with parity held. tsc 0 / eslint 0 on every story.
- **Evidence:** 9.3 Task 1 (comment correction), 9.6 (dead-control cleanup), 9.7/9.8 (wired controls),
  `messages-parity.test.ts`.

### Documentation Completeness

- **Status:** PASS ✅
- **Threshold:** design decisions + staleness window documented; state-forcing convention truthful.
- **Actual:** AC3 caching decision (Option A) + staleness window documented in `architecture.md` Caching
  Strategy AND a route-file comment; `docs/dev/state-forcing.md` extended to cover `_time`/`_date`
  production gating alongside `_state`.
- **Evidence:** `architecture.md`, `route.ts` comment, `docs/dev/state-forcing.md`.

### Visual-Fidelity Evidence

- **Status:** CONCERNS ⚠️ (accepted maintainer follow-up)
- **Threshold:** per-story visual gate passes; spacing/overlap asserted in code (the LLM visual gate
  ignores sizing/spacing).
- **Actual:** Spacing/overlap correctness IS asserted in code (9.9 card-vs-planner live-bbox clearance;
  9.1 no-orphaned-separators). Several **mobile reference PNGs predate the 9.1 removals + 9.5/9.6/9.7
  chrome** (and there is no reference for the 9.8 share modal / 9.5 location dot), so the LLM comparison
  fails on **pre-existing chrome drift only** — the stories' own surfaces were verified via DOM/behaviour
  tests. Dev agents are forbidden from self-blessing references.
- **Findings:** **CONCERN (accepted):** one consolidated maintainer reference-PNG rebaseline pass is
  outstanding (compounded by a host `/tmp` visual-tooling bug on this Windows environment). This is a
  visual-gate hand-off, not a code-correctness gap.

---

## Scalability & Deployability (touched dimensions) — **PASS** ✅

- **Scalability:** PASS ✅ — the caching + de-dupe work directly *improves* per-request load on the
  Supabase RPC (14→7 cold, →0 warm) at MVP scale (7 venues, ≤10K MAU). No scale-fragile new pattern.
- **Deployability:** PASS ✅ — additive-only DB migration (`tags text[] not null default '{}'`),
  idempotent + reversible (`drop column if exists`), applied to live `public.venues` (7 test rows, no
  production data) with byte-match verification and 0 data loss. `next build` green incl. the Edge proxy.
- **Data Integrity migration risk (R-006):** MITIGATED — contract (`8-2-...sql`) + `types.ts` +
  `VENUE_SELECT_COLUMNS` updated in lockstep; live `getVenues` SELECT still succeeds; absent/empty tags
  render (`coerceTags → []`).

---

## Evidence Gaps

3 accepted evidence CONCERNS (each already covered by an in-CI proxy or a logged maintainer follow-up —
none is a silent gap; all match the epic test design's Execution Strategy):

- [ ] **Story 9.3 live cold/warm ms-latency** (Performance)
  - **Owner:** Maintainer · **When:** next preview run
  - **Suggested Evidence:** capture warm/cold list + detail p95 against live Supabase in a preview deploy.
  - **Impact:** LOW — RPC-count (14→7) + cache-hit unit tests are the sanctioned in-CI acceptance signal
    (present + green). Confirms the absolute <200ms p95 NFR with real numbers.

- [ ] **Visual-reference rebaseline cascade** (Maintainability / visual fidelity)
  - **Owner:** Maintainer · **When:** consolidated rebaseline pass (+ REBASELINE-LOG.md)
  - **Suggested Evidence:** rebaseline mobile `map-primary`, `map-with-selected-venue`, `venue-detail`;
    add references for the 9.8 share modal + 9.5 location dot.
  - **Impact:** LOW — each story's own surface verified via DOM/behaviour tests; failures are pre-existing
    chrome drift, not story surfaces. Compounded by the host `/tmp` visual-tooling bug.

- [ ] **Two pre-existing mobile-only e2e failures** (Reliability / CI)
  - **Owner:** Maintainer · **When:** real-device spot-check
  - **Suggested Evidence:** confirm onboarding-CTA geolocation + favourites sun-window label on hardware.
  - **Impact:** LOW — verified RED with the 9.10 guard reverted (NOT an Epic 9 regression); location-dot
    AC guarded via the reliable auto-acquire path instead.

---

## Findings Summary

**Based on ADR Quality Readiness Checklist (8 categories) — mapped to the 4 core NFR attributes + the
touched scalability/deployability dimensions.**

| Category                                         | Overall Status |
| ------------------------------------------------ | -------------- |
| 1. Testability & Automation                      | PASS ✅ |
| 2. Test Data Strategy                            | PASS ✅ (7-venue deterministic seed; RPC-boundary mocks) |
| 3. Scalability & Availability                    | PASS ✅ (RPC de-dupe + caching reduce load; bounded staleness) |
| 4. Disaster Recovery                             | N/A (no DR surface in this epic; additive reversible migration) |
| 5. Security                                      | PASS ✅ (0 exploitable across 11 stories; prod leak gated) |
| 6. Monitorability/Debuggability/Manageability    | PASS ✅ (honest freshness headers; false comments corrected) |
| 7. QoS/QoE                                       | PASS ⚠️ (perf proxy PASS; live ms-latency + visual rebaseline deferred) |
| 8. Deployability                                 | PASS ✅ (additive/idempotent/reversible migration; build green) |

**Score (advisory):** **4/4 core NFR attributes PASS**; 3 sub-criteria CONCERNS (all accepted deferrals);
**0 FAIL, 0 blocker**. Overall verdict: **PASS (strong foundation)**.

---

## Gate YAML Snippet

```yaml
nfr_assessment:
  date: '2026-07-01'
  epic_id: '9'
  feature_name: 'Live-App Hardening & Clean-Up'
  mode: 'advisory' # one tier below the blocking trace gate (which PASSED)
  attributes:
    performance: 'PASS' # RPC 14->7 + byte-identical + cache-hit; live ms-latency deferred (CONCERN)
    security: 'PASS' # 0 exploitable across 11 stories; R-001 prod leak gated
    reliability: 'PASS' # degradation paths covered; staleness bounded; 2 pre-existing mobile e2e CONCERN
    maintainability: 'PASS' # 30/30 ACs, false comments fixed, dead controls removed; visual rebaseline CONCERN
    scalability: 'PASS'
    deployability: 'PASS' # additive/idempotent/reversible migration, 0 data loss
  overall_status: 'PASS'
  critical_issues: 0
  high_priority_issues: 0
  concerns: 3 # live ms-latency, visual rebaseline, 2 pre-existing mobile-only e2e (all accepted deferrals)
  blockers: false
  evidence_gaps: 3 # all proxy-covered or logged maintainer follow-ups
  recommendations:
    - 'Capture Story 9.3 live cold/warm p95 in a preview run to confirm the <200ms API NFR with real numbers.'
    - 'Run one consolidated maintainer reference-PNG rebaseline pass (+ REBASELINE-LOG.md).'
    - 'Real-device spot-check the 2 pre-existing mobile-only e2e failures (not an Epic 9 regression).'
```

---

## Related Artifacts

- **Story Files:** `_bmad-output/implementation-artifacts/9-0..9-10-*.md`
- **Trace Gate (blocking, PASSED):** `_bmad-output/test-artifacts/traceability/traceability-report-epic-9.md`
- **Test Design (risk model R-001..R-018):** `_bmad-output/test-artifacts/test-design/test-design-epic-9.md`
- **Architecture NFR thresholds + Caching Strategy:** `_bmad-output/planning-artifacts/architecture.md`
- **Sprint status:** `_bmad-output/implementation-artifacts/sprint-status.yaml`

---

## Sign-Off

**NFR Assessment (advisory):**

- Overall Status: PASS ✅
- Critical Issues: 0
- High Priority Issues: 0
- Concerns: 3 (all accepted, evidenced deferrals)
- Evidence Gaps: 3 (all proxy-covered or logged maintainer follow-ups)

**Gate Status:** PASS ✅ (advisory — does not gate release; the blocking trace gate already PASSED)

**Next Actions:**

- PASS ✅: proceed — NFR evidence supports release. Track the 3 CONCERNS as release-readiness follow-ups
  (live latency capture, visual rebaseline, real-device mobile spot-check), none of which is a blocker.

**Generated:** 2026-07-01
**Workflow:** testarch-nfr (advisory epic audit)

---

<!-- Powered by BMAD-CORE™ -->
