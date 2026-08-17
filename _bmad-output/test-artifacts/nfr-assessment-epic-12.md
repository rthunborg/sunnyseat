---
stepsCompleted:
  - 'step-01-load-context'
  - 'step-02-define-thresholds'
  - 'step-03-gather-evidence'
  - 'step-04-evaluate-and-score'
  - 'step-04e-aggregate-nfr'
  - 'step-05-generate-report'
lastStep: 'step-05-generate-report'
lastSaved: '2026-08-17'
workflowType: 'testarch-nfr-assess'
inputDocuments:
  - 'project-context.md'
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-12.md'
  - '_bmad-output/test-artifacts/traceability/traceability-report-epic-12.md'
  - '_bmad-output/test-artifacts/traceability/gate-decision-epic-12.json'
  - '_bmad-output/test-artifacts/traceability/e2e-trace-summary-epic-12.json'
  - '_bmad-output/test-artifacts/traceability/tea-trace-coverage-matrix-epic-12-2026-08-07T18-14-43+02-00.json'
  - '_bmad-output/test-artifacts/automation-summary.md'
  - '_bmad-output/test-artifacts/epic-12-protected-validation/protected-validation-report-2026-08-08.md'
  - '_bmad-output/auto-bmad/state/epic/epic-12.yaml'
  - '_bmad-output/auto-bmad/retro-notes/epic-12.md'
  - '_bmad-output/implementation-artifacts/12-1..12-14 story records'
---

# NFR Evidence Audit - Epic 12 "Real-Venue Launch Readiness"

**Date:** 2026-08-17 evidence-only refresh; original 2026-08-07 assessment preserved below
**Scope:** Epic 12, stories 12.1-12.14
**Overall Status:** CONCERNS - protected P0 evidence now closed; strict-cold sample size, external endpoint granularity, and the missing full restore/failover drill remain non-blocking evidence gaps

---

This audit summarizes existing implementation evidence. It did not run tests, mutate protected services, inspect git, or fabricate protected/live evidence. The original 2026-08-07 assessment below is preserved for history; the 2026-08-17 protected-evidence refresh supersedes its missing-evidence findings for NFR purposes. The separately owned trace workflow has now consumed the protected report and records **PASS** at 21/21 FULL.

## 2026-08-17 Protected Evidence Refresh

**Assessment:** NFR status improves from **FAIL** to **CONCERNS**.

The formerly blocking protected/live lanes now have durable evidence:

- Performance: exact-SHA production `/api/venues` returned 20/20 origin `MISS` responses with p95 `2565.530 ms` TTFB and `2672.727 ms` total, below the approximately five-second route threshold. Edge `HIT` p95 was `169.377 ms` TTFB / `267.938 ms` total for identity responses and `165.474 ms` TTFB / `167.005 ms` total for Brotli responses. Recovered official Vercel telemetry for the tagged deployment/window recorded 41/41 unique user agents as 200 responses, split into 21 `MISS` and 20 `HIT`; Vercel internal request-duration p95 was `2358 ms` for origin `MISS` and `56 ms` for `HIT`.
- Function classification: recovered Vercel invocation telemetry recorded 21 `/api/venues` invocations, all `dub1` and 200, classified as 3 cold, 1 prewarmed, and 17 hot. The origin subset was 3 cold, 1 prewarmed, and 16 hot, with the edge-prime invocation hot. Function-duration p95 was `1827 ms` for cold (`n=3`), `575 ms` for hot-origin, `2146 ms` for prewarmed, and `1827 ms` overall.
- Data-path proof: a protected read-only `pg_stat_statements` delta around one unique origin `MISS` recorded exactly `+1` venue-list statement, `+1` batch geometry RPC, and `+1` batched weather statement, with `+0` legacy per-venue geometry/weather statements and `+0` shadow-provider RPCs.
- External-provider proof: recovered Vercel canonical external metrics recorded 63 calls, all Supabase, on the `/api/venues` origin route in `dub1`, all 200. Vercel did not expose destination path for this metric, so the exact `21 x 3` endpoint split remains an inference backed by code inspection, a Supabase log sample, and the exact pg_stat delta.
- Security/deployability: protected Supabase core schema, batch RPC, visibility behavior, GitHub Production variables, and owner-compatible `venue-media` Storage bucket/policy are verified. Storage has exactly one anon/auth SELECT policy, no browser write policy, WebP-only objects, and a `358400` byte limit.
- Reliability: protected geometry run `32036137520` produced `210/210` venue-date outputs; protected weather run `32036508651` produced exactly `168` snapshot rows; exact deployment `dpl_91a1VcSSJpa8JSGCnrvqXecSSAHi` at SHA `a20aac8a4a333a00efa82f4d334eeed033037f46` had a zero-error runtime scan beyond 60 seconds.
- CI: GitHub Actions run `32039760444` passed on exact SHA `a20aac8a4a333a00efa82f4d334eeed033037f46`, including TypeScript, lint, production build, full Vitest, bundle/MapLibre, Playwright, touch-target, Lighthouse, and desktop/mobile axe gates.

**Residual caveats:** Vercel provider telemetry is now partially recovered, so the old "metrics unavailable" caveat is superseded. The strict 20-classified-cold-start lane is still under-sampled because only 3 function starts were classified cold in the recovered window. Vercel's canonical external metric proves 63 successful Supabase calls for `/api/venues`, but destination path is unsupported; therefore the exact `21 x 3` Supabase endpoint split is still an inference backed by implementation, Supabase log sampling, and pg_stat delta rather than a Vercel destination-path measurement. Legacy aggregate queries still timeout and are not used for the current pass decision. Separately, fail-closed behavior, leases, emergency stops, and rollback notes are documented, but this epic did not execute a full restore/failover drill.

### Refreshed NFR Classification

| Area | Status | Refreshed rationale |
| --- | --- | --- |
| Testability & automation | PASS | Final CI is green; 215 Vitest files / 1,986 tests, Playwright, touch, Lighthouse, and desktop/mobile axe lanes passed on exact SHA. |
| Test data strategy | PASS | Deterministic fixture/provider-isolated coverage remains intact; protected live checks used observation and read-only SQL deltas without provider payload leakage. |
| Scalability & availability | PASS | Batched persisted-read architecture is deployed and live-proven by pg_stat delta; origin and edge p95 datasets meet the Epic 12 route thresholds. |
| Disaster recovery | CONCERNS | Fail-closed coverage, leases, emergency stops, and rollback notes exist, but no full restore/failover drill is in this epic evidence set. |
| Security | PASS | Protected GitHub Production variables/secrets names, service-only batch RPC posture, visibility, and Storage public-read/no-browser-write policy are verified. |
| Monitorability/debuggability/manageability | CONCERNS | Runtime error scan is clean and recovered Vercel telemetry covers request/function/external aggregates, but strict cold-start sample size is only `n=3`, external destination path is unsupported, and legacy aggregate queries still timeout. |
| QoS/QoE | PASS | Live response correctness, uncached p95, edge p95, Brotli size, visual/manual acceptance, touch, Lighthouse, and axe evidence are green. |
| Deployability | PASS | Exact SHA main CI and Vercel production promotion are verified; Supabase migrations/RPC/storage/visibility compatibility are applied and checked. |

**Current NFR sign-off:** **CONCERNS**, not FAIL. The remaining issues are strict cold-start sample size, destination-level external-call attribution, and the absence of a full restore/failover drill—not failed correctness, latency, security, or deployability evidence.

## Original 2026-08-07 Executive Summary

**Assessment:** Local implementation evidence is strong, but release-grade NFR evidence is not complete.

**Blocking result:** FAIL. P0 coverage is 5/9 FULL (55.56%), below the required 100%. Overall material-row coverage is 15/21 FULL (71.43%), below the 80% gate threshold.

**Primary blockers:**

- Story 12.3 protected production cold-p95 evidence is missing.
- Story 12.3 protected GitHub Production environment and live Supabase service-only evidence are missing.
- Story 12.7 live visibility migration execution/schema proof is missing.
- Story 12.12 protected Supabase Storage policy verification is missing.

**Secondary concerns:**

- Story 12.7 concurrent visibility/cache race evidence remains partial.
- Story 12.11 future-date exact-response wait is proven only in serialized 3/3 evidence; prior parallel repeat was 2/3, so no broad-concurrency stability claim is made.

**Recommendation:** Do not treat Epic 12 as public-launch ready. Collect the protected/live evidence lanes, keep the two P1 caveats scoped, then re-run trace/NFR gates.

## NFR Thresholds Used

| Category | Threshold / requirement | Source |
| --- | --- | --- |
| Performance | Warm/edge venue search and sun-exposure p95 <200 ms; fully cold 42+ venue central-viewport path approximately <=5s p95 using persisted geometry and read-time weather gating; pin render for 50 venues <=100 ms. | PRD NFR1/NFR6, Epic 12 test design |
| Security | Service-only tables deny anon/authenticated; protected Production secrets/config are present; editor production deny is unconditional; media writes are service-role/tooling only; no credentials or provider content leak. | Architecture E12-AD-04/E12-AD-10/E12-AD-11, Epic 12 test design |
| Reliability | 100% current-hash geometry coverage for all venues and planner window plus buffer; missing coverage yields typed 503; missing weather is explicit unknown; supported map/detail flows emit no app-origin errors/warnings. | PRD NFR35/NFR39, Architecture E12-AD-04/E12-AD-13 |
| Maintainability | One shared resolver/hash/availability/predicate/query-key seam; typecheck/lint/tests green in story evidence; schema migrations, generated types, DTOs, and fixtures stay aligned; post-apply schema diff empty where live migration is required. | Architecture E12-AD-05/E12-AD-08/E12-AD-12, Epic 12 test design |

No invented numeric threshold was used for Story 12.10 "instant detail open", coach-mark transition duration, or visual diff tolerance; those remain qualitative/visual-review gates.

## Performance Assessment - FAIL

**Status:** FAIL for release evidence.

**Evidence present:**

- Story 12.3 deterministic persisted-geometry evidence is strong: hash golden vectors, precompute coverage, weather snapshot behavior, missing-coverage typed 503, request-count gates, scheduled runner bundles, and local SQL/service-only contracts are recorded.
- Same-date scrub and date-change request-count invariants are covered through Story 12.3 and consumed by Stories 12.10 and 12.14.
- Story 12.10 bounded detail prefetch is traced FULL: exact detail key, budget 6, concurrency 2, cancellation/no restart, hidden guard, and loading replacement.
- Story 12.14 preserves scrub=0 and date-change=1 under selected-time filtering.

**Evidence missing:**

- No protected production 42+ venue cold-p95 dataset exists.
- No protected logs/metrics prove persisted geometry reads and zero request-path provider/shadow recompute for the production cold path.
- No route/date/hash/run metadata, cold/warm/edge classification, venue count, or raw p95 trial set is present.

**Rationale:** Local tests prove the intended architecture and request-count behavior, but PRD NFR1 and Epic 12 R-001 require protected production p95 evidence. Because this is a critical P0 lane, missing evidence is a FAIL, not a concern.

## Security Assessment - FAIL

**Status:** FAIL for release evidence.

**Evidence present:**

- Story 12.1 provider-neutral hours governance and no-Google-hours policy are traced FULL.
- Story 12.5 dev-only editor production deny, localhost/dev-only route guard, validation, and service-route write boundary are traced FULL.
- Story 12.7 public resolver tests cover id/slug live identity, fixture-mode isolation, hidden/unknown public 404 behavior, control-character rejection before data access, and route convergence for reviews/feedback.
- Story 12.12 local SQL/text tests cover intended Storage public-read/write-denial policy shape and upload tooling avoids logging service-role keys.
- Static/provider policy evidence keeps automated tests off live Met.no/Google/provider paths.

**Evidence missing:**

- Story 12.3 protected GitHub Production variables/secrets and live protected Supabase/service-only posture are not verified.
- Story 12.7 visibility migration was not applied and verified against a migrated live/protected database.
- Story 12.12 protected Supabase Storage public reads, service-role upload, anon/auth write denial, bucket constraints, and public rendition reads were not verified.

**Rationale:** The local security posture is mostly covered, but the protected/live authorization lanes are exactly the release trust boundary. Local SQL/text assertions cannot substitute for protected environment, live Supabase, or Storage policy verification.

## Reliability Assessment - CONCERNS

**Status:** CONCERNS, with cross-domain blockers inherited from performance/security.

**Evidence present:**

- Story 12.3 covers missing/stale/wrong-hash geometry fail-closed behavior, typed 503, weather unknown degradation, midnight buffer, direct scheduled jobs, DB lease/concurrency intent, and no external warmer path.
- Story 12.4 cold map/detail console and pageerror hygiene is recorded complete.
- Story 12.6 public sunny/pin semantics passed with visual/a11y evidence and the strict `>50% && weatherGateState !== 'gated'` predicate.
- Story 12.11 coach-guide behavior, focus, persistence, axe, and visual acceptance are recorded complete.
- Story 12.14 selected-time open/closed filtering, exact closed search, retained closed favourite, unknown-hours handling, and request-count behavior are recorded complete.

**Concerns:**

- Story 12.7 concurrent visibility/cache race evidence is partial. Sequential absent/public/hidden/public transitions are covered, but concurrent in-flight behavior is not directly exercised.
- Story 12.11 future-date exact-response wait passed serialized 3/3 after refinement, but prior parallel repeat was 2/3 and no broad-concurrency pass is claimed.
- Missing Story 12.7 live migration evidence can become a reliability failure if runtime resolver/precompute projections reach a database without `venues.hidden`.

**Rationale:** No uncovered reliability criterion is present in the local implementation record, but the concurrency/stability caveats are real and should remain scoped until direct evidence exists.

## Maintainability Assessment - CONCERNS

**Status:** CONCERNS.

**Evidence present:**

- Epic 12 has broad story-level test evidence and no uncovered material rows.
- The trace matrix records 15 FULL / 6 PARTIAL / 0 UNCOVERED, and each story is mapped.
- Shared seams were established or consumed: public sunny predicate, public venue resolver, selected-time availability helper, media DTO selection, bounded prefetch query key, and geometry hash/precompute contracts.
- Typecheck, lint, focused/full Vitest, Playwright, axe, and manual/provider-neutral visual evidence are recorded across story Dev Agent Records and automation summaries.

**Concerns:**

- Trace gate still fails at iteration cap.
- Story 12.7 requires live migration apply, type regeneration, and no-contract-diff verification before deployment.
- Story 12.12 protected Storage migration/policy verification remains external.
- Story 12.11 full Vitest and Playwright stability have Windows/concurrency caveats; the latest specific fix is serialized only.

**Rationale:** Maintainability is structurally good at the code/test design level, but release evidence is incomplete where schema/apply verification and broad-concurrency stability matter.

## Scalability And Deployability - CONCERNS

**Status:** CONCERNS.

**Evidence present:**

- Architecture moved cold scale away from request-path shadow recompute and provider fan-out.
- Weather refresh budgets are specified: four-decimal coordinate buckets, provider concurrency 4, 2-second timeout, <=2 transient retries, and explicit unknown on missing/expired snapshots.
- Vercel/Supabase deployment shape remains stateless for public reads, with scheduled direct Supabase jobs for long-running work.

**Concerns:**

- Scalability cannot be signed off without the protected production cold-p95 dataset and persisted-read proof.
- Deployability cannot be signed off while the visibility and Storage migrations are source/local-policy-only and not verified in the protected/live target.

## Evidence Gaps

- [ ] **Story 12.3 protected production p95** (Performance, P0)
  - **Owner:** Rasmus / platform-maintainer lane.
  - **Required evidence:** protected-production `/api/venues` central-viewport cold request over the 42+ venue dataset with p95 <= approximately 5s, route/date/hash/run metadata, cold/warm/edge classification, logs proving persisted geometry reads, and zero request-path provider or shadow recompute.
  - **Impact:** Blocks public-launch NFR PASS.

- [ ] **Story 12.3 protected environment / live Supabase audit** (Security, P0)
  - **Owner:** Rasmus / platform-maintainer lane.
  - **Required evidence:** protected GitHub Production secrets/variables for geometry precompute and weather refresh, protected environment behavior, and live service-only Supabase evidence.
  - **Impact:** Blocks security sign-off for service-only artifact posture.

- [ ] **Story 12.7 visibility migration live verification** (Security/Reliability/Maintainability, P0)
  - **Owner:** maintainer deployment lane.
  - **Required evidence:** apply `20260718214954_add_public_venue_visibility.sql`, verify `venues.hidden boolean not null default false`, prove resolver/precompute projections do not 42703, regenerate Supabase types, and verify no contract diff.
  - **Impact:** Blocks deployment readiness for live identity/visibility.

- [ ] **Story 12.12 protected Storage policy verification** (Security/Deployability, P0)
  - **Owner:** maintainer deployment lane.
  - **Required evidence:** apply `20260719000000_venue_media_storage.sql`, verify `venue-media` public reads, service-role upload, anon/auth write denial, bucket constraints, and public rendition reads.
  - **Impact:** Blocks hosted media sign-off.

- [ ] **Story 12.7 concurrent visibility/cache behavior** (Reliability, P1)
  - **Owner:** dev/QA.
  - **Required evidence:** concurrent resolver/cache test or narrowed claim.
  - **Impact:** Medium; does not replace the P0 migration blocker.

- [ ] **Story 12.11 broad-concurrency future-date stability** (Reliability, P1)
  - **Owner:** dev/QA.
  - **Required evidence:** broad-concurrency stable evidence for the future-date exact-response wait, or keep documentation scoped to serialized 3/3.
  - **Impact:** Medium; do not claim broad-concurrency pass yet.

## Findings Summary

| Area | Status | Rationale |
| --- | --- | --- |
| Testability & automation | PASS | Deterministic local test coverage is broad; all material rows are at least partial and no row is uncovered. |
| Test data strategy | PASS | Fixture/local evidence covers 42+ synthetic venues, hidden/visible identity, media, weather, hours, and feedback paths without live provider calls. |
| Scalability & availability | CONCERNS | Architecture and local gates are strong, but protected cold-p95 and live persisted-read proof are absent. |
| Disaster recovery | CONCERNS | Emergency stops, leases, and fail-closed paths exist; no DR drill/restore evidence is in scope. |
| Security | FAIL | Protected environment, live Supabase, visibility migration, and Storage policy evidence remain partial. |
| Monitorability/debuggability/manageability | CONCERNS | Scheduled summaries/docs exist, but production metrics/log evidence for p95 and persisted reads is missing. |
| QoS/QoE | FAIL | Local UI/interaction evidence is strong, but the critical cold p95 lane is missing. |
| Deployability | CONCERNS | Source migrations and types exist locally, but required protected/live apply and verification are incomplete. |

## Original 2026-08-07 Gate YAML Snippet

```yaml
nfr_assessment:
  date: '2026-08-07'
  epic_id: '12'
  feature_name: 'Real-Venue Launch Readiness'
  mode: 'advisory_epic_audit'
  trace_gate:
    decision: 'FAIL'
    gate_iteration: 2
    gate_iteration_cap_reached: true
    material_rows:
      full: 15
      partial: 6
      uncovered: 0
      total: 21
    p0:
      full: 5
      total: 9
      full_pct: 55.56
  attributes:
    performance: 'FAIL'
    security: 'FAIL'
    reliability: 'CONCERNS'
    maintainability: 'CONCERNS'
    scalability: 'CONCERNS'
    deployability: 'CONCERNS'
  overall_status: 'FAIL'
  critical_issues: 2
  high_priority_issues: 2
  medium_priority_issues: 2
  blockers: true
  evidence_gaps: 6
  recommendations:
    - 'Collect Story 12.3 protected production p95 and protected environment evidence.'
    - 'Apply and verify Story 12.7 visibility migration, regenerate types, and prove no contract diff.'
    - 'Apply and verify Story 12.12 protected Storage bucket/RLS policy behavior.'
    - 'Collect Story 12.7 concurrent visibility/cache evidence or narrow the claim.'
    - 'Collect Story 12.11 broad-concurrency stability evidence or keep the claim scoped to serialized execution.'
```

## Related Artifacts

- Trace gate: `_bmad-output/test-artifacts/traceability/traceability-report-epic-12.md`
- Gate JSON: `_bmad-output/test-artifacts/traceability/gate-decision-epic-12.json`
- E2E trace summary: `_bmad-output/test-artifacts/traceability/e2e-trace-summary-epic-12.json`
- Coverage matrix: `_bmad-output/test-artifacts/traceability/tea-trace-coverage-matrix-epic-12-2026-08-07T18-14-43+02-00.json`
- Test design: `_bmad-output/test-artifacts/test-design/test-design-epic-12.md`
- Epic state: `_bmad-output/auto-bmad/state/epic/epic-12.yaml`

## Original 2026-08-07 Sign-Off

**NFR Evidence Audit:** FAIL

- Critical issues: 2
- High-priority issues: 2
- Medium-priority issues: 2
- Evidence gaps: 6

**Gate status:** FAIL. Epic 12 is not ready for public-launch NFR approval until protected production performance/security, live migration, and protected Storage policy evidence are completed and re-gated.

**Generated:** 2026-08-07
**Workflow:** testarch-nfr

<!-- Powered by BMAD-CORE -->

---

## 2026-08-17 Gate YAML Snippet

```yaml
nfr_assessment:
  date: '2026-08-17'
  epic_id: '12'
  feature_name: 'Real-Venue Launch Readiness'
  mode: 'evidence_only_protected_refresh'
  exact_sha: 'a20aac8a4a333a00efa82f4d334eeed033037f46'
  main_ci_run: '32039760444'
  production_deployment: 'dpl_91a1VcSSJpa8JSGCnrvqXecSSAHi'
  trace_artifact_status: 'refreshed_pass_21_of_21_full'
  attributes:
    performance: 'PASS'
    security: 'PASS'
    reliability: 'PASS'
    maintainability: 'PASS'
    scalability: 'PASS'
    deployability: 'PASS'
    monitorability: 'CONCERNS'
    disaster_recovery: 'CONCERNS'
  live_evidence:
    tagged_vercel_window:
      unique_user_agents_200: '41/41'
      cache_split:
        miss: 21
        hit: 20
      api_venues_invocations:
        total: 21
        status_200: 21
        region: 'dub1'
        cold: 3
        prewarmed: 1
        hot: 17
        origin_subset:
          cold: 3
          prewarmed: 1
          hot: 16
          edge_prime: 'hot'
      function_duration_p95_ms:
        cold_n3: 1827
        hot_origin: 575
        prewarmed: 2146
        all: 1827
      vercel_internal_request_duration_p95_ms:
        origin_miss: 2358
        hit: 56
      external_metrics:
        calls: 63
        provider: 'Supabase'
        route: '/api/venues'
        region: 'dub1'
        status_200: 63
        destination_path: 'unsupported'
        endpoint_split: 'inferred_21x3_from_code_supabase_log_sample_and_pg_stat_delta'
    origin_miss:
      samples: 20
      correctness_passed: 20
      p95_ttfb_ms: 2565.530
      p95_total_ms: 2672.727
    edge_identity_hit:
      samples: 20
      correctness_passed: 20
      p95_ttfb_ms: 169.377
      p95_total_ms: 267.938
    edge_brotli_hit:
      samples: 20
      correctness_passed: 20
      p95_ttfb_ms: 165.474
      p95_total_ms: 167.005
      wire_bytes: 12609
    pg_stat_delta_single_origin_miss:
      venue_list_statements: '+1'
      batch_geometry_rpc_statements: '+1'
      batched_weather_statements: '+1'
      legacy_geometry_input_statements: '+0'
      legacy_geometry_series_statements: '+0'
      legacy_weather_statements: '+0'
      shadow_provider_rpcs: '+0'
  caveats:
    - 'Strict 20-classified-cold-start lane remains under-sampled: recovered function telemetry includes 3 cold starts, 1 prewarmed, and 17 hot invocations.'
    - 'Vercel external metric proves 63 Supabase calls for /api/venues, but destination path is unsupported; exact 21x3 endpoint split remains inferred from code, Supabase log sample, and pg_stat delta.'
    - 'Fail-closed behavior, leases, emergency stops, and rollback notes are documented, but no full restore/failover drill was executed in this epic evidence set.'
    - 'Legacy aggregate queries still timeout and are not used as pass evidence.'
  overall_status: 'CONCERNS'
  blockers: false
  critical_issues: 0
  high_priority_issues: 0
  evidence_gaps: 3
  recommendations:
    - 'If strict cold-start proof is required, collect a larger provider-classified cold-start sample rather than reclassifying cache MISS samples as cold starts.'
    - 'If destination-level external attribution is required, supplement Vercel metrics with Supabase-side logs or application instrumentation because Vercel destination path is unsupported.'
    - 'Before a public-launch resilience gate that requires disaster-recovery proof, execute and record a full restore/failover drill.'
```

## 2026-08-17 Sign-Off

**NFR Evidence Audit:** CONCERNS

- Critical issues: 0
- High-priority issues: 0
- Evidence gaps: 3 non-blocking caveats: strict cold-start sample size, destination-path attribution, and no full restore/failover drill

**Gate status:** NFR can proceed with caveat. Protected production performance, security, deployability, Storage, geometry/weather jobs, exact-head CI, exact deployment evidence, recovered request/function/external Vercel telemetry, and the formal trace PASS are complete. The remaining NFR caveats are strict cold-start sample size (`n=3`, not 20), destination-level external-call attribution, and the absence of a full restore/failover drill.

**Generated:** 2026-08-17
**Workflow:** testarch-nfr evidence-only refresh
