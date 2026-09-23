---
baseline_commit: d51687c03732ad799971ecdc2f0d726a3621cf6f
---
# Story 15.2: Define g2, generation schema and migration/rollback contract

Status: done

Story key: `15-2-define-g2-generation-schema-and-migration-rollback-contract`
Epic: 15 — Seasonal Clear-sky Geometry Materialization
Depends on: Story 15.1 decision lock (done; CD15.1-v1/A1 accepted).
Owner: Solution Architect / Developer.

## Story

As the maintainer of SunnySeat's sun-prediction service,
I want versioned, verifiable seasonal geometry records with stable input identity and a tested migration/rollback contract,
so that later generation and publication can avoid partial or incompatible coverage while preserving historical prediction attribution.

## Acceptance Criteria

The following six criteria are copied verbatim from `epics.md`, Story 15.2. The tasks and Dev Notes unpack their implementation and evidence obligations without replacing them.

1. Specify and test immutable seasons, venue generations, compact day results, release manifests and current pointer; store canonical input once per generation, never intermediate shadow polygons.
2. Define g2 golden vectors binding normalized seating/engine coordinates/elevations, eligible caster geometry/heights/elevations/import, selection rules, solar/refraction/shadow constants and algorithms, numerical dependency/canonicalization/sampling/decoder versions. Ordering-only normalization remains stable.
3. Display-only pins, opening hours, metadata, weather and UI planner length do not invalidate geometry. Real geometric edits and data corrections do. Preserve g1 feedback attribution.
4. Migration replay, constraints, complete coverage/checksum validation, RLS/force-RLS/grants, indexes and decoder compatibility pass in an approved isolated environment. Verify actual relation/index storage against Story 15.1 budgets.
5. Specify staged input revisions, publication rechecks, out-of-band dirty detection and compatible pointer rollback without implicit input/weather rollback. Retention protects evidence references.
6. Review migration and rollback evidence before any separately authorized production mutation.

**Design gate:** backend/schema story; Epic 15.2 has no screen reference or frontend design gate. No UI, copy, animation, reference PNG or capture-recipe change is needed. Retained public semantics are constraints on the stored information, not permission to implement Story 15.4's consumers.

## Scope and decision precedence

- This brief prepares **15.2 only**. Implementation delivers additive g2/codec/schema contracts, isolated migration/security/storage tests and a reviewed migration/rollback handoff. It does not implement the seasonal worker (15.3), wire public seasonal reads/publication (15.4), claim candidate release proof (15.5), or operate production (15.6).
- Controlling sources: current PRD NFR20/NFR35/NFR40; architecture E15-AD-01/02; Epic 15 and Epic 13/14 amendments; sprint state; current test design. Read the September 15 consolidation and readiness reassessment alongside the September 10 readiness report.
- **Superseded historical wording:** the September 9 proposal and dated September 10 pending statements preserve decision history. G1a–G1d is accepted under the September 10/12/14 decisions and September 15 consolidation. Do not reopen encoding/horizon/completeness choices because historical text still says “blocked”, “proposed” or “arrays provisionally preferred”. Do not rewrite that history.
- Accepted choices are not deployed compliance. **Capacity admission remains held.** A1's actual-year retained-version diversity/churn is required within this story's storage validation. Controlled cold/combined-read, no-op DB p95 and matched writer-load proof remain NOT RUN at 15.5 I13 before 15.6 O02. Missing evidence blocks the affected implementation gate, not creation of this brief.
- Production mutation requires a separately reviewed, concrete authorization. Local schema work and bounded suitable isolated validation do not imply permission to migrate, publish, refresh weather, delete retained data, upgrade capacity or deploy. Preserve the existing rolling runtime and schedules.
- In this task, do not reset, revert, clean, commit, push, merge or deploy. Preserve all pre-existing work, especially `.codex/config.toml`, `_bmad-output/party-mode/`, the architecture audit/history, and `nextjs-app/test/unit/services/direct-sun-documentation-contract.test.ts`.

## Tasks / Subtasks

- [x] **1. Freeze the implementation inputs and isolated evidence plan** (AC1–6; I01–I03/I13–I15).
  - [x] Re-read this story, AGENTS.md, current E15-AD-01/02 and the accepted CD15.1-v1/A1 package; record branch/HEAD and relevant dirty-file hashes. Run baseline typecheck and lint from `nextjs-app/`; stop before edits for unrelated failures.
  - [x] Record the exact installed numerical dependencies, Node/PG/PostGIS versions and fixture provenance. Identify an approved isolated migration/role/storage lane and record its suitability and applicable authorization before dependent execution; managed resources must also be guard-admitted. Existing applicable authorization is sufficient. No production credentials or provider fallback in the harness.
  - [x] Define test cases and evidence paths for every AC, separating deterministic unit proof, actual DB integration, actual-year storage measurements and later 15.5/15.6 obligations. An unavailable lane is BLOCKED/NOT RUN, never a mock-backed DB pass.

- [x] **2. Add the independent g2 identity contract and golden vectors** (AC2–3; I01/I15).
  - [x] Define canonical input and immutable engine-manifest types; bind every input listed under “g2 identity” below. Keep g1's existing algorithm, prefix, vectors and feedback attribution usable.
  - [x] Test independent mutations of each geometric/selection/algorithm/version dependency, including numeric library versions and sampling/decoder policy. Add literal deterministic expected vectors, not expected values regenerated with the same implementation under test.
  - [x] Test ring-start/orientation, caster ordering and equivalent numeric normalization stability; reject malformed and nonfinite inputs. Test exclusions separately: display pins, hours/name/tags/photos, weather and UI planner length.

- [x] **3. Define and test the immutable season/day representation** (AC1/4; I02).
  - [x] Implement versioned types and strict encode/decode/validation for full Float64 adaptive offsets/exposure and raw boundaries, including half-millisecond values, exact dates and supported-horizon endpoints. Preserve all computed points and raw intervals.
  - [x] Specify empty/deterministic supported-negative day representation separately from missing, failed, exhausted or uncertain computation. Test malformed horizons, duplicate/non-monotonic/out-of-range offsets, dimensions, lengths/counts, nonfinite values, exposure outside 0–100, truncation and incompatible versions.
  - [x] Define a reproducible day → generation → release checksum chain and exact-set coverage validation. Reject 245 rows containing a missing date plus an extra/duplicate/wrong-year date; do not accept count-only coverage. Test current/previous-year, hidden/new venue, DST and missing requested-season pointer cases.
  - [x] Retain raw geometry separately from >=300-second reconstructed-window eligibility. Round-trip 299/300/301-second cases, uncertainty bounds, detected shade gaps and exact endpoints without rounding or dropping raw values. Full generator/oracle parity belongs to 15.3/15.5.

- [x] **4. Implement additive schema and prove migration/security contracts** (AC1/4/6; I02/I03).
  - [x] Add seasons, venue generations, day records, release membership/manifests, current pointers and shared versioned input references following the model below. Define immutable payload versus permitted lifecycle transitions explicitly; freeze verified content and protect current/evidence-referenced data.
  - [x] Add PK/FK/unique/check constraints, compatible ready-generation uniqueness, narrowly justified read-path indexes, service-only grants, RLS and force-RLS. Scope any privileged function and its search path/EXECUTE permissions explicitly.
  - [x] Replay from clean prerequisite schema and supported existing rolling-schema fixtures; test replay/idempotence and migration interruption/transaction behavior. Prove existing g1 rows, feedback attribution, rolling RPCs and their permissions survive.
  - [x] Execute real positive and negative operations in the approved isolated lane using separate role connections for service role, anon and authenticated; also test inherited PUBLIC privileges and the intended owner/force-RLS boundary. SQL source scanning and a superuser-only run are insufficient. If no suitable approved lane can be admitted, record the affected AC4 DB/storage evidence as BLOCKED/NOT RUN and do not mark it passed.

- [x] **5. Specify and exercise revision, compatibility, rollback and retention contracts** (AC3/5/6; I02/I08/I14/I15).
  - [x] Document staged versus committed revision state and the generation snapshot identity. Specify transaction-time rechecks of input revisions, inventory, exact dates, all versions/counts/checksums and ready state; specify dirty detection for out-of-band changes without request-time caster/hash computation.
  - [x] Exercise the schema-level contract with isolated seeded releases and deterministic transaction barriers: stale revision/inventory, added/removed venue, candidate mutation, failed validation and abort cannot make an incompatible pointer current. Leave production publication integration to 15.4.
  - [x] Prove a compatible pointer rollback with two complete isolated release fixtures; reject missing referenced generations, stale committed hash, bad checksum or unsupported decoder. Record unchanged input and weather digests. An old generation alone or a running legacy job is not rollback compatibility.
  - [x] Protect each retained season's complete current and compatible rollback manifests and every referenced generation, plus independent evidence/feedback references. Test shared generations counted once and reference/retention transaction races; no deletion of user or production data. Specify worker/lease schema so 15.3 can enforce one active geometry worker and separately serialized publication.

- [x] **6. Measure actual candidate relation/index and retained-version storage** (AC4; I13, A1).
  - [x] Populate provenance-labelled actual current/previous-year values, distinct retained input versions, protected evidence references, current/rollback manifests and realistic staged/failed occupancy and churn. Same-value repeated copies or 294 reused day rows are not this proof. Record fixture gaps honestly.
  - [x] Census heap/TOAST/indexes, shared inputs/engine versions/releases, all retained/staged/failed/evidence-protected rows, legacy coexistence and aggregate footprint without double counting. Compare with the accepted decimal 30MB/5MB component budgets and 375MB warning/400MB admission limits.
  - [x] Record observed values separately from extrapolations and measured relation size separately from disk/WAL/headroom. Preserve the capacity hold unless a separately authorized target admission review resolves it; never make room by weakening retention, precision or coverage.
  - [x] Record remaining A1 evidence at its owning gate: repeat actual candidate storage at 15.5 I13; controlled cold/combined/no-op/writer proof at I13 before O02; fresh aggregate/disk/WAL at O01/O02. Do not claim production performance from a local test DB.

- [x] **7. Review the contract/evidence and run story gates** (AC1–6).
  - [x] Document migration order/prerequisites, compatibility matrix, failed-migration recovery, pointer-rollback preconditions, retained evidence and explicit production authorization boundary. Commands must match implemented tooling; do not publish placeholder production commands as verified operations.
  - [x] Run typecheck, lint, full Vitest and the implemented isolated SQL/integration/storage suite. Record exact commands, environment, results and limitations; no skip inflation, suppressed failures or fabricated passes.
  - [x] Complete Dev Agent Record, File List and evidence review. Invoke the canonical review wrapper only after every story obligation passes; human approval alone moves `review` to `done`. Do not start 15.3 as part of this story.

### Review Findings — Round 8 (2026-09-21)

- [x] [Review][Patch][P2][R8-01] Reject manifest-map keys silently omitted by TypeScript. `sun-geometry-hash-g2.ts:103-110` uses Zod records that drop an own `__proto__` key; SQL manifest admission at migration lines 206–218 accepts and hashes it. A real service-role transaction admitted a synthetic input whose stored g2 hash differs from TypeScript readback recomputation, violating AC2/AC4. Apply a matching fail-closed key policy in both runtimes (or preserve keys identically), with regression coverage for all three manifest maps. Reproducer and rolled-back database evidence: `../test-artifacts/implementation/epic-15/story-15-2/review-round8-2026-09-21/README.md`.
  - Resolved 2026-09-21: raw-map preflight and SQL admission now reject the key consistently; all three maps have negative and positive readback coverage. Fresh typecheck/lint, 2,379-test suite, 450 SQL checks, 1,003 topology cases and original retained-database audit pass. Evidence: `../test-artifacts/implementation/epic-15/story-15-2/round8-remediation/README.md`.

Round 9 provenance (2026-09-21): Rasmus explicitly authorized this review. Blind
Hunter, Edge Case Hunter and Acceptance Auditor ran under both the primary and
secondary independent reviewers; the dedicated security review also succeeded with
zero findings. All seven layers returned successfully. The findings below are
deduplicated across those sources; the topology-status item incorporates the
overlapping differential-corpus concern. This records review results only: no
remediation, status transition, sprint-status change, Git operation or production
operation occurred.

- [x] [Review][Patch][High] Replace the endpoint-derived AVL sweep comparator with a proven stable sweep-status ordering; the current relation can change after insertion, miss non-neighbour intersections, or throw its invariant error, and the regression corpus must cover arbitrary arrangements, equal-x stacks and order changes. [nextjs-app/lib/services/sun-geometry-hash-g2.ts:195]
- [x] [Review][Patch][High] Apply engine-manifest and geometry-input semantic validation unconditionally; owner/admin sessions currently bypass the exact-key, type, topology, normalization and manifest checks and can persist rows later trusted as immutable evidence. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:406]
- [x] [Review][Patch][High] Permit a conservatively dirtied revision to reconcile to the same canonical committed hash; the current distinct-hash-only promotion path can never clear dirty state after an ordering-only or no-op invalidation and permanently blocks publication. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:618]
- [x] [Review][Patch][High] Bind `robust-predicates` to the required numerical dependency manifest and golden-vector mutation tests; topology admission now depends on `orient2d`, but the dependency version is absent from g2 identity. [nextjs-app/test/fixtures/epic-15/g2-input.ts:26]
- [x] [Review][Patch][High] Serialize generation retirement with release verification and reject retirement of generations referenced by verified/current/rollback releases or retained evidence; the current transition can race verification or deterministically invalidate a published rollback tree. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:695]
- [x] [Review][Patch][High] Require a generation entering `ready` to match its venue's committed input hash and source revision; the current transition can certify complete days with false venue provenance before a later release assertion notices. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:681]
- [x] [Review][Patch][High] Revalidate retained evidence in a fresh clone rather than replaying migrations, legacy tables and layout specimens inside the original retained measurement database. [nextjs-app/test/integration/epic-15/storage.revalidation.ts:51]
- [x] [Review][Patch][Med] Add per-map and aggregate entry limits for `solarConstants`, `shadowConstants` and `numericalDependencies` before TypeScript parsing/canonicalization and SQL `jsonb_each` processing. [nextjs-app/lib/services/sun-geometry-hash-g2.ts:103]
- [x] [Review][Patch][Med] Preflight day-array lengths and the exact 245-day season length before Zod element parsing, decoding and sorting so oversized rejected payloads cannot bypass the intended admission-work bounds. [nextjs-app/lib/services/sun-geometry-season-codec.ts:7]
- [x] [Review][Patch][Med] Correct the volatility contract of timezone-dependent `validate_day_payload`; calculations through `Europe/Stockholm` tzdata must not be declared `IMMUTABLE`. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:500]
- [x] [Review][Patch][Med] Make the schema integration harness run-isolated and self-cleaning; it leaves random databases and cluster-global login roles behind and reuses fixed principals/password assumptions across concurrent or previously configured runs. [nextjs-app/test/integration/epic-15/schema.test.ts:29]
- [x] [Review][Patch][Med] Implement the declared `verified -> current -> retired` release lifecycle atomically with pointer publication/supersession, or narrow the stored contract; the current trigger makes both declared states unreachable. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:757]
- [x] [Review][Patch][Med] Reject worker-lease inserts and renewals whose `expires_at` is already past; the current trigger accepts a successful acquisition with no active lease. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:663]
- [x] [Review][Patch][Med] Return conservative qualifying-window boundaries or carry boundary uncertainty in the API; the current result exposes raw edges even though up to 100 ms at each edge is unconfirmed. [nextjs-app/lib/services/sun-geometry-season-codec.ts:128]
- [x] [Review][Patch][Med] Index generations and revisions once in `verifyReleaseContract`; repeated `.find` scans make release verification quadratic in venue count despite already rejecting duplicate identities. [nextjs-app/lib/services/sun-geometry-release-contract.ts:42]
- [x] [Review][Patch][Med] Make migration replay reconcile or explicitly reject every required table column and constraint; `CREATE TABLE IF NOT EXISTS` plus partial repairs can preserve a weaker interrupted/earlier schema. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:255]
- [x] [Review][Patch][Med] Add the accepted season lifecycle and audit contract fields, including horizon/base/refinement policy, status, expected counts, verification/update metadata, checksum and release notes. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:255]
- [x] [Review][Defer][Low] Fix the missing-probe regression so offsets and exposure remove the same interior index; it currently passes by creating a different endpoint/sample mismatch. [nextjs-app/test/unit/services/sun-geometry-season-codec.test.ts:103] — deferred, pre-existing
- [x] [Review][Defer][Low] Require evidence references to target a ready, checksum-bound generation; the current foreign key also accepts building, failed and retired generations. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:349] — resolved 2026-09-22 by the overlapping R10-02 patch: admission locks and requires `ready`; the ready transition requires all 245 days, a verified digest and `verified_at`, and immutable payload triggers preserve that checksum binding.

Round 10 provenance (2026-09-22): Rasmus explicitly authorized this review
round only. Blind Hunter, Edge Case Hunter and Acceptance Auditor ran under both
the primary and secondary independent reviewers; the dedicated security review
also succeeded with zero findings. All seven layers returned successfully. The
supplied candidates were reconciled against the Round 9-remediated source,
accepted Story 15.2 contract and prior review history; the eight surviving Patch
findings below are deduplicated across those sources. This records review results
only: no source fix, status transition, sprint-status change, Git operation,
managed-resource operation or production operation occurred.

- [x] [Review][Patch][High] Preserve compatible same-hash retained coverage when a conservative dirty event advances the source revision; a current/rollback generation with the unchanged canonical hash cannot retire, while the ready-generation unique key excludes `source_revision`, so no replacement can become ready and the retained release remains permanently incompatible. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:753]
- [x] [Review][Patch][High] Serialize generation retirement with both release-member and evidence-reference insertion; the retirement check takes an advisory lock that neither insertion path shares, `member_insert` reads the generation without a conflicting row lock, and evidence insertion has no admission trigger, allowing immutable references to commit against a newly retired generation. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:753]
- [x] [Review][Patch][High] Make replay validation compare the exact required catalog contract; `assert_table_shape` still accepts wrong column types/defaults, primary-key columns, foreign/check/unique definitions, indexes, triggers, policies and grants while reporting the replay compatible. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:934]
- [x] [Review][Patch][High] Enforce a valid season lifecycle instead of exposing forgeable terminal states and an unreachable normal transition; service-role inserts may start as `verified`, `current` or `retired` without checksum evidence, while the unconditional immutability trigger prevents a legitimate `building` season from ever advancing or recording verification metadata. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:278]
- [x] [Review][Patch][High] Confine release lifecycle changes to coherent pointer publication and supersession; direct service-role updates can mark an unpointed release `current` or retire a still-pointed current/rollback release, and later pointer flips leave the aged-out rollback release labelled `current`. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:825]
- [x] [Review][Patch][High] Gate input-revision inserts through the server-owned revision contract; direct service-role insert currently accepts an arbitrary revision with `dirty=false` and an arbitrary committed hash, bypassing staged-hash promotion before the row is trusted by generation admission. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:305]
- [x] [Review][Patch][Med] Bind TypeScript release verification to the immutable engine manifest's crossing-bracket policy; `verifyReleaseContract` trusts each caller-supplied generation value, so it can approve day evidence under a looser bound than the identified engine and database contract allow. [nextjs-app/lib/services/sun-geometry-release-contract.ts:14]
- [x] [Review][Patch][Low] Normalize syntactically valid but unsupported season years to `SUN_GEOMETRY_COVERAGE_MISSING`; `requestedSeasonPointer` currently calls `seasonDates` first and leaks its unrelated `Invalid season year` error for values such as `9999-03-01`. [nextjs-app/lib/services/sun-geometry-release-contract.ts:50]

Round 11 provenance (2026-09-23): Rasmus explicitly authorized one additional
review iteration. Blind Hunter, Edge Case Hunter and Acceptance Auditor ran under
both independent reviewer profiles, and the dedicated security review also
returned successfully. All seven layers produced non-empty output. The 24
surviving findings below are deduplicated across those sources and reconciled
against the accepted same-hash retained-coverage behavior from Round 10. This
records triage results only: no remediation, status transition, sprint-status
change, Git operation or production operation occurred.

- [x] [Review][Decision][High] Pointer publication revalidates every stored day while holding the global advisory and inventory locks, so the retained multi-million-sample corpus can turn a routine pointer change into a long blocking transaction — the accepted publication contract requires transaction-time compatibility rechecks, but it does not decide whether immutable day validation may be frozen at release verification. Recommended: fix: freeze checksum-bound day-validation evidence when the release is verified, then have pointer movement recheck immutable digest/count metadata, current inventory and revisions without rescanning every payload array.
- [x] [Review][Patch][High] Keep season verification metadata synchronized with the release selected for publication; a later verified/current release can leave the season checksum and expected venue count describing the first release that verified. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:883]
- [x] [Review][Patch][High] Replace the legacy manifest replay exception that treats any `lockfile` string as proof of `robust-predicates@2.0.4` with an allow-listed, digest-bound historical dependency identity. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:230]
- [x] [Review][Patch][High] Make the TypeScript engine-manifest schema enforce the persistable SQL policy constraints and accepted algorithm/version values, or expose a separately named permissive identity schema so producers cannot create a g2 identity the database rejects. [nextjs-app/lib/services/sun-geometry-hash-g2.ts:483]
- [x] [Review][Patch][High] Invalidate caster-dependent revisions only when a caster row or identity-bearing field actually changes; the statement trigger currently dirties every venue after zero-row statements and metadata-only updates. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:746]
- [x] [Review][Patch][High] Allow pointer rollback to reactivate a retired season for the target engine; a cross-engine flip back currently makes the release current while its season remains retired. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:931]
- [x] [Review][Patch][High] Bind the caster `active` eligibility field into the strict g2 caster schema, canonical identity and independent mutation vectors. [nextjs-app/lib/services/sun-geometry-hash-g2.ts:489]
- [x] [Review][Patch][High] Reject caller-controlled revision changes when a dirty row is cleared after staging the unchanged committed hash; the current branch permits a forged source revision to survive promotion. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:720]
- [x] [Review][Patch][Med] Require callers of day encode/decode, coverage, checksum and window extraction to supply the engine's crossing-bracket policy instead of silently defaulting to 100 ms, which can validate evidence forbidden by a stricter manifest. [nextjs-app/lib/services/sun-geometry-season-codec.ts:19]
- [x] [Review][Patch][Med] Add persisted day and generation sample counts to the TypeScript release evidence contract and verify the generation aggregate equals the sum of its day rows. [nextjs-app/lib/services/sun-geometry-release-contract.ts:14]
- [x] [Review][Patch][Med] Reject noncanonical dimensions and lower bounds for zero-length day arrays before checksum validation; the current checks apply array shape only when cardinality is positive. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:595]
- [x] [Review][Patch][Med] Keep `checksum` and `verified_at` null on building generations and releases until their validated transition, rather than allowing arbitrary values that can persist onto failed records. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:806]
- [x] [Review][Patch][Med] Extend the replay catalog fingerprint to cover the internal function definitions and ownership/ACLs, schema ACLs and required extension versions that implement the executable and authorization contract. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:1041]
- [x] [Review][Patch][Med] Grant `service_role` execute only on the reviewed worker entry points instead of every present and future function in `sun_geometry_internal`. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:1093]
- [x] [Review][Patch][Med] Add bounded formats and lengths for service-written run, lease owner, evidence, weather, classifier and release-note text fields to prevent unbounded indexed and TOAST-backed lifecycle data. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:323]
- [x] [Review][Patch][Med] Preflight each caster's `sourceFlags` array length before Zod traverses its entries so an oversized collection is rejected within the advertised admission-work bound. [nextjs-app/lib/services/sun-geometry-hash-g2.ts:94]
- [x] [Review][Patch][Med] Bound and shape-check caster `sourceFlags` before SQL canonicalization iterates the JSON value. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:503]
- [x] [Review][Patch][Med] Resolve the zero-venue lifecycle contradiction by consistently rejecting empty releases/seasons or allowing an empty verified season; releases currently permit zero while season verification requires at least one venue. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:905]
- [x] [Review][Patch][Med] Replace `pg_trigger_depth()` as lifecycle authorization with an explicit transaction-local guard scoped to the approved pointer, dirtying and verification operations. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:718]
- [x] [Review][Patch][Med] Enforce that a season's persisted crossing-bracket policy equals its referenced immutable engine manifest so audit metadata cannot disagree with the policy used to validate its days. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:287]
- [x] [Review][Patch][Med] Reject venue primary-key mutation or transfer the input-revision identity atomically; an unchanged-geometry rename can otherwise leave the new venue without a revision row. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:736]
- [x] [Review][Patch][Med] Add expected and completed aggregate day counts to release manifests and verify them at publication, rather than relying only on per-generation 245-day checks. [supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql:363]
- [x] [Review][Patch][Med] Remove the persistent-lane fallback that creates a shared `BYPASSRLS` login with the committed password; use an isolated random credential and drop every role created by the test on success and failure. [nextjs-app/test/integration/epic-15/schema.test.ts:79]
- [x] [Review][Patch][Low] Validate requested-season pointer identifiers before returning them so malformed or empty map values fail at the lookup boundary. [nextjs-app/lib/services/sun-geometry-release-contract.ts:55]

## Dev Notes

### Accepted model and storage contract

Source: architecture E15-AD-01 Lifecycles 1–5 and E15-AD-02; test families I01–I03/I08/I14/I15.

| Record | Required contract |
| --- | --- |
| `sun_geometry_seasons` | Explicit season ID/year, March 1–October 31 Stockholm dates/timezone, horizon convention/version, base/refinement policy, engine/hash/storage versions, status, expected counts, timestamps/checksum/notes. |
| `sun_geometry_venue_generations` | Immutable generation identity, season and venue, g2 input hash, source-input reference, run ID, lifecycle `building / ready / retired / failed`, expected/completed day/sample counts, timestamps/checksum. Unique ready generation per `(season, venue, hash, format_version)`. |
| `sun_geometry_days` | PK `(generation_id, stockholm_date)`; exact UTC supported-horizon endpoints; full Float64 adaptive offsets/exposure and raw boundaries, count/checksum. Index the actual read path only. |
| `sun_geometry_releases` and membership | Immutable full venue → ready-generation mapping, compatibility versions, expected/completed counts/checksum and `building / verified / current / retired` lifecycle. A manifest can reuse unchanged compatible generation IDs; identical generation IDs across the whole cohort are not required. |
| Per-season current pointer | Exactly one selected current release per season; transactional compatibility gate. Resolve by requested Stockholm date's year, never server wall-clock year or nearest available season. |
| Shared input/version and evidence references | Canonical input once per generation or content-addressed shared input table. Retain attributable original inputs, version manifests and evidence references; no per-day caster payload or intermediate/unioned shadow polygons. |

The architectural table names are the starting model; exact companion membership/pointer/input tables and constraint implementations are this story's design work. Do not invent a competing living architecture document. Put concrete implementation choices and evidence in this story's contract handoff and reconcile any true source conflict before dependent implementation.

“Immutable” applies to identity and verified content. Specify which build counters/statuses can change before verification and how lifecycle status/current pointers can change afterward without altering checksum-bound payloads. Do not use a mutable release's membership as the current read source.

**Completeness:** every non-deleted venue, including hidden and newly added venues, needs all **245 dates of the explicitly selected actual year**. No past-date exemption, remaining-season publication or cross-year substitution. Validate exact membership and digest chain at all levels. Season/timezone is a generation/release constraint, distinct from UI planner length and g2 geometric inputs.

**Time/precision:** supported horizon is refraction-corrected solar centre >=5°, with UTC roots within <=10 seconds. Preserve exact endpoints and every Float64 point/boundary, including half-ms midpoints; integer exposure/minute encoding is not accepted. UTC five-minute base plus endpoints; inclusive 45–55% endpoint proximity or >50% classification change triggers one-minute probes; detected crossings refine to <=100ms brackets. The <=2-minute target concerns detected/matched transitions, not universal event discovery.

Raw potential must survive public-window filtering. Reconstructed >=5° / >50% runs qualify at >=300 seconds; preserve every detected shade gap and fail unresolved duration uncertainty. The accepted untriggered four-minute shade gap and shorter between-probe misses remain diagnostics. Do not re-label failed historical detector cases as passes. Below 5° is a supported-model negative, not physical absence of direct beam; seating height affects caster math, not solar event time. No terrain skyline/observer-dip/low-angle model is added.

Define offset units, origin, array dimensions/lower bounds, endpoint inclusion and fractional-time round-trip explicitly. Do not lose half-millisecond boundaries through integer timestamp conversions. Test March 1/October 31 and February 28/November 1 controls, March 29 and October 25 2026 DST (23/25-hour Stockholm days), and explicit previous/next-year keys. Use actual-year date functions rather than adding fixed 24-hour milliseconds; finite horizon/offset validation must agree in the decoder and SQL boundary.

### g2 identity and legacy compatibility

Bind normalized seating polygon and derived canonical engine coordinate; seating/ground elevation; resolved eligible caster IDs, normalized geometry, effective height inputs, ground/roof elevations, import generation and every eligibility/exposure field; selection radius/rules; solar/refraction/shadow algorithms and constants (including search/shadow distance, minimum meaningful height and supported horizon); canonicalization, base sampling/refinement, storage decoder and numerical dependency versions, notably Turf. Preserve stable ring rotation/orientation/caster ordering and normalized equivalent numbers. Reject invalid/nonfinite values before hashing.

Display pins, metadata, opening hours, weather and UI planner length are excluded. Real geometry, data corrections and numerical version changes invalidate. Do not change g1's existing planner-dependent identity or relabel historical g1 evidence as g2. A mid-season recalculation with current inputs is counterfactual; historical replay requires the original retained geometry/input, weather and classifier evidence, with missing legacy evidence disclosed.

### Revision, publication and rollback handoff

Staged edits retain matching old committed inputs/results. Out-of-band committed geometry changes must mark dirty and ultimately produce `SUN_GEOMETRY_COVERAGE_MISSING` 503 until compatible results exist; the public request cannot resolve casters or calculate hashes to discover this. Specify triggers/revision ownership and transaction rechecks here; actual invalidation planning/worker integration is 15.3, and public read/publication integration is 15.4.

Rollback targets the **complete compatible release**, not a collection of venue fallback rows. Every referenced generation, date, hash and engine/horizon/format/decoder version must validate against committed inputs. Flip only the pointer; do not roll back inputs, weather or unrelated configuration. If no compatible target exists, fail closed. Retain current and immediately previous actual-year seasons, each with current plus at least one complete verified compatible rollback release, all their generations and every evidence-referenced generation. Shared physical generations count once; staged/failed data counts while present.

The later generator must allow one active geometry worker across the pilot, with unrelated/urgent jobs independently queued and prioritized, duplicate same-generation builders excluded, and publication separately serialized. Define compatible lifecycle/fencing fields without implementing the worker now. NFR35's scheduled selectable-window/midnight coverage reporting survives routine geometry retirement; replacement execution/proof belongs to 15.4/15.5.

### Accepted budgets and evidence boundaries

The complete accepted table is in `../test-artifacts/measurements/epic-15/story-15-1/CLOSURE-DECISION-2026-09-14-v1.md`, “Numerical budgets proposed for G1d”, SHA256 `8135743c74d8777f4e6e3d3bfdc00c88508c390596b6e0a2b9d62571627a657e`. Its historical title is not a pending decision. Units, workload boundaries, exclusions and growth rules control.

| Budget | Accepted limit / boundary |
| --- | --- |
| Initial or all-invalidated 42 ×245 season | <=120 active wall minutes /100 Node CPU minutes. |
| New/edited venue-season; one-day repair | <=180/150 seconds; <=15/10 seconds, wall/Node CPU respectively. |
| Worker/shard | One active worker; <=5 venues ×3 dates; <=60s active wall/CPU; admit no new venue-day after 45s. |
| Lease/retry/safety | 120s lease; heartbeat gaps <=15s; stop on lost lease; <=3 attempts with <=60s backoff each; <=20,000 evaluations/venue-day; <=512MB RSS including retained inputs. |
| Day relations | <=30 **decimal MB** per distinct 42-venue season generation set including heap/TOAST/indexes. |
| Shared metadata | <=5 decimal MB total input/version/release metadata across the retained pilot. |
| Aggregate capacity | Warn >=375MB; deny projected aggregate >400MB. Include legacy, retained, staged, failed, evidence-protected versions and growth. Admission remains held. |
| 42-venue query + decode | p95 <=100ms for warm and separately controlled cold cohorts; decode p95 <=5ms; no-op DB p95 <=100ms, zero geometry evaluations/writes. Excludes network/API/process startup. |
| Matched writer load | At 1 and 5 readers, <=20% p95 increase, still <=100ms and zero new errors/timeouts. A1 carries this and cold/combined/no-op proof to 15.5 I13 before O02. |

Retried active computation counts; queue/backoff/human waiting is reported separately. Node CPU excludes PostgreSQL/child processes. Do not turn estimates for 50/100/500 venues into accepted pilot throughput guarantees.

Four season-equivalent copies plus legacy already exceed 400MB in the accepted model; a staging set adds a fifth. Count sharing where real, not by assumption. Actual current/previous-year values, distinct input revisions, references and churn are required **now in 15.2 storage validation**, and again at 15.5 I13. Fresh target aggregate/disk/WAL admission checks remain O01/O02. The existing 294-row same-data layout comparison cannot satisfy actual-year retention evidence.

### Isolated database/security lane

`compose.test.yaml` provides PostgreSQL 15/PostGIS, not a full Supabase REST stack. It currently uses 512MB tmpfs, `fsync=off`, `full_page_writes=off`, `synchronous_commit=off`, 20 connections and 64MB shared buffers. It may support bounded schema/role tests if admitted by the resource guard; it is not automatically suitable for retained storage churn, durable recovery or production-like latency. Record the actual lane, driver, roles, DB/extensions/settings and limits; select a suitable bounded isolated lane for the required storage evidence. Do not silently treat mocked Supabase calls as actual role/SQL proof.

Use the future actor's latest trusted resource-guard context with Windows PowerShell 5.1 for any managed launch. Do not copy this task's actor identity into the story, scripts or command line. Request guard Stop when finished; preserve saved state. Older Docker down/reset examples in local docs do not override the active lifecycle rules. No deleting containers, volumes, user files or unrelated resources as teardown.

Security tests must distinguish SQL grants from RLS filtering and actual service-role bypass. FORCE RLS does not constrain superusers/BYPASSRLS roles. Deny inherited PUBLIC/anon/authenticated table and function access to internal inputs/builds/publication, protect the server-only boundary, and prove necessary service operations work. Any SECURITY DEFINER function needs a hardened search path and explicitly restricted EXECUTE grants. Do not add user-session checks to a service-only job contract just to copy an auth example.

### Preserved public contracts and dependencies

- Geometry is clear-sky potential, not weather-adjusted percentage or probability. Public affirmative sun requires >50% and coherent `directSunState === 'likely'`, with the accepted geometric window rule when the seasonal consumer lands. Diffuse daylight is not direct sun.
- Keep independent snapshot weather, exact two-hour expiry and signed provider-valid-time ±90-minute matching. Missing/stale/malformed/incomplete/unmatched/legacy/contradictory weather stays unknown; blocked/unknown can remove a recommendation immediately. No five-minute weather hold.
- Keep 61 ordered 06:00–21:00 quarter-hours, today-through-today+3 client selection, existing server bookmark validation opt-out, date-only query keys and zero-fetch same-date scrub. Seasonal storage does not expand public dates or change existing DTOs in 15.2.
- Preserve the service-only rolling batch path, zero public provider/geometry/hash/caster computation, canonical engine/weather coordinates distinct from display coordinates, typed coverage failures and public DTO stripping. Retain API/component boundaries, Swedish-first accessibility, reduced motion and <=600/280/320KB total/initial/MapLibre JS budgets.
- Epic 13 keeps independent scheduler/cold/recovery work and its recorded 42×61 evidence cohort. Epic 14.3/14.5 need separately attributable generation/input/weather/classifier evidence; 14.6 final seasonal launch proof follows 15.5 and the deployed candidate. Missing Epic 14 sprint keys do not mean completion; do not regenerate them here.

### Existing implementation seams and realistic file impact

Paths below are repository-relative. NEW names for companion modules/tests are suggestions; verify neighboring naming before implementing. Do not create parallel repositories or replace existing g1 modules wholesale.

| File / disposition | Current behavior | 15.2 change and preservation |
| --- | --- | --- |
| `nextjs-app/lib/services/sun-geometry-hash.ts` — optional UPDATE | `computeGeometryInputHash`, `canonicalizeGeometryInput` and `buildPlannerHashContract` implement g1. Ring rotation/orientation, hole/caster sorting, EWKB case and -0 normalization exist; planner start/end/step/maxFutureDays remain legacy dependencies. | Add a distinct g2 entry point or a sibling `sun-geometry-hash-g2.ts` using suitable existing helpers. Keep g1 exports and outputs unchanged. g2 needs typed allowlisted input validation; generic canonicalization alone does not establish all required semantic dependencies. |
| `nextjs-app/lib/supabase/types.ts` — conditional UPDATE | Shared `Database` Row/Insert/Update/Relationships and RPC types include rolling geometry, weather, venues and feedback contracts. | Add only types for the new schema actually consumed. Generate against the approved isolated schema or maintain a narrowly scoped additive change; do not regenerate from production or erase unrelated types. |
| `supabase/migrations/` — NEW migration | Existing timestamped migrations own the rolling schema and service RPC. | Create an additive migration using the installed CLI's documented migration-new operation after checking its help, with repository root as project working directory. Keep historical migration files intact. No apply-to-production command in this story. |
| `nextjs-app/lib/services/` — NEW codec/model module(s) | No production seasonal g2 decoder/release model is established yet. | Add versioned day/manifest types, codec and validators, with server-only persistence and client-safe boundaries explicit. Do not import benchmark scripts into the production graph. |
| `nextjs-app/test/unit/services/`, `nextjs-app/test/unit/` — NEW focused tests | Existing g1, persisted read and SQL source assertions provide regression patterns. | Add g2/codec/coverage tests; retain existing g1 vectors. SQL-text tests supplement actual isolated DB tests, never replace them. |
| `nextjs-app/test/integration/` or scoped SQL harness — NEW if needed | Default Vitest execution covers unit/components; no 15.2 DB runner is claimed to exist. | Implement explicit executable migration/role/rollback/storage coverage and document its command. A dedicated harness/config is preferable to silently excluding integration files from the default run. |
| `_bmad-output/implementation-artifacts/15-2-*` and `_bmad-output/test-artifacts/` — NEW handoff/evidence | Story 15.1 evidence is immutable historical input. | Store the concrete schema/compatibility/migration/rollback contract and new raw evidence with provenance; do not overwrite 15.1 runs. |

Read-only coexistence anchors: `supabase/migrations/20260718193000_persist_sun_geometry_series_and_weather_snapshots.sql` defines fixed 61-entry JSONB rows keyed by `(venue_id, stockholm_date, geometry_input_hash)` and per-venue current inputs. `supabase/migrations/20260817160522_read_current_venue_sun_geometry_batch.sql` joins current input with same-date/same-hash coverage atomically, service-only. `nextjs-app/lib/services/sun-geometry-repository.ts` consumes that contract. Preserve those files and the `sun-engine.ts`/cache/public route path through 15.2; replacement belongs to 15.4.

`nextjs-app/app/api/venues/[slug]/feedback/route.ts` and accuracy-report parsing still accept `^g1:[0-9a-f]{64}$`. Do not widen public feedback or emit g2 DTOs now. The database's generic hash validator accepting `g[0-9]+` is not evidence that all consumers support g2. Define the internal evidence/reference bridge while preserving legacy attribution.

Reuse regression coverage in `test/unit/services/sun-geometry-hash.atdd.test.ts`, `persisted-sun-read-batching.automate.test.ts`, and `test/unit/story-12-3-geometry-migrations-and-leases.atdd.test.ts` (all under `nextjs-app/`). The last uses SQL source assertions/local modeling; its presence does not certify real grants, isolation or rollback.

**Resolved lockfile versions at preparation:** Next 16.3.3, TypeScript 6.0.3, Turf 7.3.5, Supabase JS 2.108.2, date-fns-tz 3.2.0, Zod 4.4.3, Vitest 4.1.9 and Playwright 1.61.1. These were read from `nextjs-app/package-lock.json`, not inferred from package.json ranges. Bind the actual numerical versions used by fixtures/g2 and preserve dependency versions; no framework upgrade is needed. Preserve `@swc/helpers` override and the npm-10/Linux lockfile convention if a genuinely necessary dependency change is separately justified.

### Previous-story and production intelligence

Story 15.1 (`d51687c`, `feat(15): measure daylight transition accuracy CPU and storage`) adds measurement tooling and accepted evidence, not a seasonal runtime. The other four recent commits are `ed13d76` owner diagnostics, `a1da01a`/`16244bb` venue-price removal, and `3255f75` production weather/photo audit. None is a g2 schema or publication implementation to assume already exists.

Reuse the fixture provenance and representation cases in `nextjs-app/test/fixtures/epic-15/geometries.ts`, `nextjs-app/scripts/benchmarks/epic-15/representation.ts`, `pipeline.measurement.ts`, `captured-storage.mjs` and `closure-evidence.mjs`, plus `nextjs-app/test/unit/benchmarks/epic-15/`. The accepted evidence tree is `_bmad-output/test-artifacts/measurements/epic-15/story-15-1/`: capture-01, run-14 through run-19, sql-01 through sql-06, capacity-02, accepted-matrix and closure packages. Retain all raw failure ledgers and hashes; check exact names/provenance before reuse.

15.1's bounded measurement scope includes one actual 245-date venue-season and weighted full-cohort extrapolation, not a timed implemented 42×245 run. The 294-row storage comparison selected arrays but did not exercise actual retained-year diversity. CPU excludes database/child processes. The pure shadow seam requires injected casters and mocked server imports; synthetic/default clear precompute inputs must never be relabelled captured real inputs. Guard exhaustion, nonfinite results, narrow threshold/uncertain-duration cases and the accepted missed-gap diagnostic must remain distinguishable.

The latest recorded production checkpoint in `spec-direct-sun-weather-accuracy.md`, September 9, reports 42 blocked list venues, zero weather-unavailable reasons and list/detail agreement after the canonical-coordinate correction. Before the fix, list had stripped server engine inputs and weather lookup used rounded display coordinates. Preserve canonical engine/weather location until lookup, then strip it from public DTOs. This is API consistency evidence, not outdoor ground truth. Failed scheduled deliveries at 01:16, 05:01 and 09:33 UTC plus a successful manual refresh do not prove scheduling reliability. The September 10 diagnostics handoff also does not prove a new deployment or complete historical replay. No production verification was performed for this brief.

## Verification plan and handoff

| Scenario | This story's proof | Later proof retained |
| --- | --- | --- |
| I01 | g2 golden mutation/stability/exclusion vectors; g1 regression. | Re-run on integrated candidate in 15.5. |
| I02 | Codec/schema immutability, exact coverage/digest/version/negative cases and requested-year pointer contract. | Full candidate publication/read negatives in 15.4/15.5. |
| I03 | Actual isolated migration replay, permissions/RLS/force-RLS/indexes and reviewed artifacts. | Production remains separately authorized. |
| I08 | Schema/revision transaction contract with seeded fixtures and deterministic race barriers. | Real competing publishers/readers and acknowledgement recovery in 15.4/15.5. |
| I13 | Actual-year distinct-version retained storage/churn and relation/index census versus budgets. | Controlled cold/combined/no-op/writer performance at 15.5; fresh target capacity O01/O02. |
| I14 | Isolated complete-compatible pointer rollback and rejected unsafe targets, unchanged input/weather digests. | Candidate API rollback drill in 15.4/15.5. |
| I15 | Legacy attribution, complete release/evidence reference protection and reference/retention races. | Generator retention and integrated replay in 15.3/15.5. |

Run application commands from `C:\DEV\sunnyseat\nextjs-app\`:

```powershell
npx tsc --noEmit
npx eslint . --quiet
npx vitest run
```

Add the exact implemented isolated DB/storage commands to the Dev Agent Record. The current default Vitest suite does not itself prove real PostgreSQL behavior. Dedicated new tests must actually execute and fail on broken invariants. No blanket E2E or visual gate is needed for this isolated backend story; if implementation unexpectedly changes a public/UI seam, resolve scope and run the relevant route/E2E/visual obligations before review.

The future review transition runs from `C:\DEV\sunnyseat\`:

```powershell
.\scripts\run-sh.ps1 scripts/story-review.sh 15-2
```

Record scenario/variant and AC IDs; source/dirty hashes; fixture/year/date/input/generation/version identity; command/environment; expected/actual result; raw artifact checksum; reviewer and limitations. Distinguish PASS, FAIL, BLOCKED, NOT RUN and EXTRAPOLATED. Migration/rollback evidence review does not authorize production. Human approval is required for `done`.

## References

- [AGENTS.md](../../AGENTS.md) and [project-context.md](../../project-context.md): commands, boundaries, Epic 12 conventions and current Epic 15 disposition.
- [PRD](../planning-artifacts/prd.md): NFR20/NFR35/NFR40; [architecture](../planning-artifacts/architecture.md): E15-AD-01/02; [epics](../planning-artifacts/epics.md): Story 15.2 and Epic 13/14 dependency amendments.
- [Sprint state](sprint-status.yaml); [Story 15.1](15-1-measure-daylight-transition-accuracy-cpu-and-storage.md): previous implementation/evidence/review history.
- [September 10 readiness](../planning-artifacts/implementation-readiness-report-2026-09-10-epic-15.md) with current addendum; [September 15 reassessment](../planning-artifacts/implementation-readiness-report-2026-09-15-epic-15.md): resolved entry gates and precise 15.2 evidence handoff.
- [Test design](../test-artifacts/test-design/test-design-epic-15.md): I01/I02/I03/I08/I13/I14/I15, A1 and G3.
- [Approved proposal](../planning-artifacts/sprint-change-proposal-2026-09-09.md): decision history only.
- [Owner policy](../planning-artifacts/decisions/epic-15-owner-policy-2026-09-10.md), [detector-risk acceptance](../planning-artifacts/decisions/epic-15-detector-risk-acceptance-2026-09-12.md), [closure acceptance](../planning-artifacts/decisions/epic-15-closure-acceptance-2026-09-14.md), [September 15 consolidation](../planning-artifacts/decisions/epic-15-architecture-consolidation-2026-09-15.md).
- [Accepted CD15.1-v1 package](../test-artifacts/measurements/epic-15/story-15-1/CLOSURE-DECISION-2026-09-14-v1.md): complete numerical table and declared measurement limitations.
- [Consolidation execution](../planning-artifacts/architecture/epic-15-update-2026-09-15/EXECUTION.md) and [resolved seam review](../planning-artifacts/architecture/epic-15-update-2026-09-15/reviews/review-seams.md): one active worker, whole-release rollback, requested-year pointer and coverage reporting. The sibling `history/` files are preserved historical copies.
- [Direct-sun/weather decision](../planning-artifacts/decisions/direct-sun-weather-truth-2026-09-03.md), [accuracy specification](spec-direct-sun-weather-accuracy.md), [launch handoff](../../docs/launch/launch-readiness-handoff-2026-08-24.md): truth contract and recorded production findings, not fresh production proof.
- [UX specification](../planning-artifacts/ux-design-specification.md): retained public semantics and dated accepted amendments; no frontend implementation in 15.2.
- [Local DB guide](../../docs/local-docker.md), [test Compose](../../compose.test.yaml): isolated infrastructure candidates subject to current guard rules.
- [PostgreSQL 15 RLS](https://www.postgresql.org/docs/15/ddl-rowsecurity.html), [function security](https://www.postgresql.org/docs/15/sql-createfunction.html), [arrays](https://www.postgresql.org/docs/15/arrays.html), [size functions](https://www.postgresql.org/docs/15/functions-admin.html), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): consulted September 15 for role bypass, restricted function privileges, explicit array-shape validation and physical-size measurement. Inherit installed dependencies; this story does not request upgrades.

## Dev Agent Record

### Agent Model Used

Codex (GPT-6), Story 15.2 implementation using the installed bmad-dev-story workflow.

### Debug Log References

- Preparation branch: `epic/15-seasonal-clear-sky-geometry-materialization`.
- Preparation HEAD: `d51687c03732ad799971ecdc2f0d726a3621cf6f`.
- Initial shell invocations landed at `C:\` despite the requested workdir and failed read-only. Subsequent commands explicitly used `Set-Location`; application checks ran from `nextjs-app/`.
- Baseline `npx tsc --noEmit`: PASS, exit 0. Baseline `npx eslint . --quiet`: PASS, exit 0.
- Protected documentation regression: `npx vitest run test/unit/services/direct-sun-documentation-contract.test.ts` passed (1 file, 3 tests); the file was not edited.
- Story implementation/full-suite/DB/storage/rollback results: NOT RUN during story creation. No managed resources or production access were needed.

### Implementation verification and blocker history

- Initial implementation baseline typecheck and lint passed. Branch/HEAD and 1,029 pre-existing file hashes recorded in `test-artifacts/implementation/epic-15/story-15-2/preservation-before.json`.
- Installed dependency versions, captured-scene provenance and approved local lane suitability: `PLAN.md` and each storage `environment.json`.
- Real PostgreSQL 15.13 / PostGIS 3.5.2 integration: `sql-14-final/schema-result.json` PASS, 168 logged checks, separate service/anon/authenticated/PUBLIC/owner connections, exact g1 rolling RPC preservation, transactional migration interruption/replay, complete releases, reference protection and revision/inventory barriers.
- Smaller actual-date run `storage-02`: PASS, 994 days / 189,417 samples, four complete generations and one failed partial generation. Final TS/SQL payload/hash/release revalidation PASS. This is bounded fixture evidence, not full pilot capacity proof.
- Full 42-venue current/previous-year measurement: `storage-03-full`, FAIL at venue 19 / 2026-09-09 due to unresolved 300-second duration uncertainty. The bounded diagnostic still has a [299999, 300000] ms duration range; the accepted rule correctly rejects it. AC4/I13 and review remain BLOCKED. See `test-artifacts/implementation/epic-15/story-15-2/BLOCKED.md`.
- Partial final revalidation PASS: 4,844 persisted rows, 4,847 raw observations, 1,172,722 samples, 19 complete ready generations and one failed partial. Three unflushed observations remain in NDJSON. This is not a full-coverage or component-budget pass.
- Final full Vitest PASS: 255 files / 2,326 tests. Final dedicated DB config PASS: two tests (168 SQL checks plus the captured duration rejection regression). Canonical review wrapper NOT RUN because the full storage obligation failed.
- Final typecheck and lint PASS (exit 0); preservation audit PASS for 1,029 existing files. Exact commands/results: `test-artifacts/implementation/epic-15/story-15-2/verification-final.json`.
- No production operation, commit, push, merge, deployment or next-story work.

### Resumed development

- User requested continued development. Fresh baseline typecheck/lint passed; branch/HEAD and protected-file hashes unchanged.
- Isolated g2 hour-angle adapter restores the millisecond UTC-minute term while preserving the original g1 solver and runtime. The formerly blocked captured date passes the unchanged duration rule with bounds [300256, 300356] ms; its original rejection remains a separate regression.
- New numerical source/refinement versions are bound into the measured g2 manifest. `storage-04-g2-full` is a fresh all-42, two-year calculation; prior numerical outputs are not reused. See `test-artifacts/implementation/epic-15/story-15-2/RESUMED.md`.
- Same-year engine versions now use composite season references. `sql-16-lease-bound` passes 185 SQL checks, including version transitions and server-time lease bounds. `migration-upgrade-01` preserves all 994 existing day rows and four pointer targets across replay.
- Resumed full regression: 256 files / 2,327 tests pass, zero failed or skipped (`vitest-resumed.json`). Latest typecheck and lint pass. The full stored-data audit and component budgets now pass; the canonical review gate passes.
- Review invocation resolves to the exact sprint key: `.\scripts\run-sh.ps1 scripts/story-review.sh 15-2-define-g2-generation-schema-and-migration-rollback-contract`. The installed wrapper performs an exact status-key lookup; the abbreviated `15-2` shown in the preparation guide would not match. No gate implementation change is needed.

- Canonical full-key review wrapper PASS: lint/typecheck and 256 files / 2,327 tests; no mapped screen gate applies. Wrapper transitioned sprint status to review. Log: `validation/15-2-define-g2-generation-schema-and-migration-rollback-contract-review-20260915-182747.log`.

### Round 5 remediation — 2026-09-19

The fifth review was supplied externally and requested changes for two P1 and
four P2 findings. The user authorized this remediation and requested a prompt
for a sixth independent review. This is implementation verification, not a new
review round or human completion approval. Story/sprint status remains `review`.

- Polygon admission now checks ring simplicity, shell/hole containment, nested/
  overlapping holes and contact-cycle connectedness, preserving valid isolated
  point tangencies. Shared specimens exercise TypeScript and actual PostGIS.
- SQL canonicalization derives ECMAScript shortest-roundtrip Float64 decimals
  from exact binary bits; arbitrary-precision identities, overflow and underflow
  cannot enter through canonical text. Tests include `1e23`, adjacent bit-pattern
  boundaries, 1,024 seeded bit patterns and nondefault float display settings.
- Replay-applied safe-integer revision constraints reject overflow atomically.
- NUL/lone-surrogate strings and keys are rejected; code-point lengths and map
  key limits agree across runtimes. Unsorted unique source flags are independently
  rejected by SQL instead of being masked by duplicate-flag tests.
- Real anon/authenticated/inherited-PUBLIC writes test grants and RLS separately,
  with persisted-state comparisons and an admissible service-role control.
- Retained revalidation verifies literal original corpus/measurement pins before
  mutation, requires separate fresh output, binds all local verifier modules and
  the predicate dependency, and rejects source changes during execution.
- Typecheck and quiet lint PASS; full Vitest PASS, 257 files / 2,351 tests.
  Final dedicated database lane PASS, 2 files / 3 tests / 433 logged checks,
  under `schema-07-round5-final`. The preceding 427-check run is also preserved.
- Pinned retained revalidation PASS in `storage-06-g2-full-round5-refresh`,
  283.75 seconds: all 21,084 days / 4,442,504 samples; 87 generations, 44 inputs,
  eight releases and four complete current/rollback targets. All 13 final source/
  dependency hashes independently match. Four full layouts remain <30 MB each;
  shared metadata remains 1,769,472 bytes (<5 MB). No recalculation or production
  admission is claimed; original storage-04/05 evidence is unchanged.
- The new direct `robust-predicates` dependency is pinned to the already installed
  lockfile version 2.0.4; no package upgrade or install was performed. The minimal
  local declaration compensates for its missing published type file, not a
  suppressed compiler error. No public/g1/solar numerical runtime was changed.
- Exact evidence, preservation results and remaining limitations are recorded in
  `../test-artifacts/implementation/epic-15/story-15-2/ROUND-5-FIXES-2026-09-19.md`.
  The sixth-review prompt is beside that record as `REVIEW-6-PROMPT.md`.

### Completion Notes List

- Round 10 remediation implemented all eight open Patch findings (6 High, 1 Medium, 1 Low). Baseline/final typecheck and lint pass; focused release-contract tests pass 8/8; full Vitest passes 259 files / 2,382 tests; and the final guard-owned PostgreSQL suite passes 502 logged schema checks plus topology parity. Restored access to the pinned original retained database exposed and fixed an R10-03 replay-convergence regression involving a legacy season freeze trigger and equivalent generated CHECK identities. The final fresh-clone verifier passes all eight pins, 21,084 days / 4,442,504 samples, 87 generations, 44 inputs and eight releases; controlled cleanup removed the clone and the original before/after counts are identical. Evidence: `../test-artifacts/implementation/epic-15/story-15-2/round10-remediation/README.md`. Story/sprint remain `review`; no Round 11 or human completion approval occurred.

- Round 9 remediation implemented all 17 open Patch findings (7 High, 10 Medium). Baseline and final typecheck/lint pass; focused suites pass 84/84 and the pre-database full Vitest run passes 259 files / 2,381 tests. After Docker admission was restored, fresh disposable PostgreSQL verification exposed and fixed role isolation, shared-endpoint sweep ordering, retirement-fixture separation, replay compatibility and clone-cleanup regressions. The final database suite passes 456 logged schema checks and 1,014 TypeScript/PostGIS cases; original retained-data validation passes 21,084 days / 4,442,504 samples in a removed clone with all eight pins unchanged. Evidence: `../test-artifacts/implementation/epic-15/story-15-2/round9-remediation/README.md`. Story/sprint remain `review`; no Round 10 or human completion approval occurred.

- Local g2, Float64 codec, immutable schema/release/revision/rollback contracts implemented. Existing planning edits and Story 15.1 evidence remain preserved. Existing g1 numerical engine and public runtime unchanged.
- Full local AC4/I13 storage evidence passes: 21,084 dates / 4,442,504 samples, 86 ready generations plus one failed partial, 44 inputs and eight manifests. Four complete 42-venue layouts use 24,616,960–24,641,536 bytes each (<30 MB); shared metadata uses 1,769,472 bytes (<5 MB). Capacity admission remains HELD.
- The calculation completed all assertions and saved its report before Vitest reported a three-hour timeout. That failed command is preserved; the allowance is now six hours. Independent final migration/payload/count/diversity/release/storage revalidation passes (160.23 seconds). Calculations were not repeated, and no fresh six-hour runner pass or candidate-worker performance pass is claimed. See `FINAL-LOCAL-EVIDENCE.md`.
- Story context analysis completed and developer guide audited. Six ACs match the epic verbatim; all local links resolve; the accepted closure package SHA256 matches. Independent audit clarified approved isolated-lane execution before readiness.

- Story 15.2 is ready for human review; all tasks are complete. No Story 15.3 work, production operations or Git publication actions were performed.

### File List

Preparation files only:

- `_bmad-output/implementation-artifacts/15-2-define-g2-generation-schema-and-migration-rollback-contract.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (only 15.2 readiness and last-updated metadata after audit).

Implementation files (in addition to the preparation story/status files):

- `supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql`
- `nextjs-app/lib/solar/g2-solar-position.ts`
- `nextjs-app/lib/services/sun-geometry-hash-g2.ts`
- `nextjs-app/lib/services/sun-geometry-season-codec.ts`
- `nextjs-app/lib/services/sun-geometry-release-contract.ts`
- `nextjs-app/test/fixtures/epic-15/g2-input.ts`
- `nextjs-app/test/fixtures/epic-15/g2-topology-boundaries.ts`
- `nextjs-app/test/fixtures/epic-15/g2-sweep-parity.ts`
- `nextjs-app/test/fixtures/epic-15/storage-04-provenance.ts`
- `nextjs-app/test/fixtures/epic-15/crossing-day.ts` (Round 2 crossing-validation fixtures)
- `nextjs-app/test/fixtures/epic-15/refine-storage-duration.ts` (diagnostic only)
- `nextjs-app/test/unit/services/sun-geometry-hash-g2.test.ts`
- `nextjs-app/test/unit/services/sun-geometry-g2-admission.test.ts`
- `nextjs-app/test/unit/services/sun-geometry-g2-topology-cost.test.ts`
- `nextjs-app/test/unit/services/storage-04-provenance.test.ts`
- `nextjs-app/test/unit/services/sun-geometry-season-codec.test.ts`
- `nextjs-app/test/unit/services/sun-geometry-storage-duration.test.ts`
- `nextjs-app/test/unit/services/sun-geometry-g2-solar-position.test.ts`
- `nextjs-app/test/unit/services/sun-geometry-release-contract.test.ts`
- `nextjs-app/test/integration/epic-15/schema.test.ts`
- `nextjs-app/test/integration/epic-15/topology-parity.test.ts`
- `nextjs-app/test/integration/epic-15/duration-probe.test.ts`
- `nextjs-app/test/integration/epic-15/storage.measurement.ts`
- `nextjs-app/test/integration/epic-15/storage.revalidation.ts`
- `nextjs-app/vitest.epic15-db.config.ts`
- `nextjs-app/vitest.epic15-storage.config.ts`
- `nextjs-app/types/robust-predicates.d.ts`
- `nextjs-app/package.json` and `nextjs-app/package-lock.json` (pin existing predicate dependency).
- `nextjs-app/vitest.epic15-revalidate.config.ts`
- `_bmad-output/implementation-artifacts/15-2-schema-migration-rollback-contract.md`
- `_bmad-output/implementation-artifacts/validation/15-2-define-g2-generation-schema-and-migration-rollback-contract-review-20260915-182747.log`
- `_bmad-output/implementation-artifacts/validation/15-2-define-g2-generation-schema-and-migration-rollback-contract-review-20260916-130032.log`
- `_bmad-output/implementation-artifacts/validation/15-2-define-g2-generation-schema-and-migration-rollback-contract-review-20260916-142100.log`
- `_bmad-output/test-artifacts/implementation/epic-15/story-15-2/` (plan, preservation hashes, raw SQL runs, actual-date measurements and revalidation evidence; failed experiments retained).

## Story File Audit

| Criterion | Status | Fix Applied |
| --- | --- | --- |
| ACs preserved | pass | All six criteria mechanically compared with current Epic 15.2; verbatim. |
| Design gate criteria | pass | Backend/schema story; no epic screen/design gate. Preserved semantics and conditional scope-change gates are explicit. |
| Task sequencing | pass | Inputs/lane → g2 → codec → schema/security → revision/rollback → actual-year storage → evidence/review. |
| No invented requirements | pass | Tasks map to AC1–6 and I01/I02/I03/I08/I13/I14/I15. Production reads/worker/rollout remain with later stories; approved-lane condition clarified. |
| File impact list | pass | New additive schema/codec/tests, optional g2 hash/type additions; existing g1 runtime and historical migrations preserved. |
| Doc references | pass | Current controlling sources, accepted decisions, history/evidence, source seams and relevant UX constraints linked. Local links resolve. |
| Test gate | pass | Fresh preparation typecheck/lint and protected 3-test regression pass; future real isolated DB/storage and full review gates explicitly required. |

All checks pass, story ready for dev.

## Change Log

- 2026-09-23: Completed restored original retained-database verification for Round 10. Fixed R10-03 replay convergence for legacy lifecycle triggers and equivalent generated CHECKs, passed 502 focused SQL checks and the full 21,084-day fresh-clone audit, removed every task-created clone, and preserved the original source counts. Story/sprint remain review; no Round 11, Git or production operation.

- 2026-09-21: Completed resumed Round 9 database verification after Docker recovery. Fixed the database-only regressions, passed 456 schema checks / 1,014 topology cases and the original 21,084-day retained clone audit, removed every audit clone and preserved status `review` without starting Round 10.

- 2026-09-21: Fixed R8-01 at both TypeScript and SQL boundaries, demonstrated three failing regressions before the fix, and passed full unit, real database and original retained-data validation afterward. Story/sprint remain review; no further review round, commit or production operation.

- 2026-09-21: User-requested Round 8 review completed with one independently reproduced P2 finding (R8-01: manifest-map key parity). Recorded the open action item; no implementation fixes, status transition or Git publication. The earlier retained audit remains a valid pass; completion now also requires disposition of R8-01.

- 2026-09-21: Cleared the retained-database audit blocker using the guard-admitted original database and pinned storage-04 corpus. Fresh typecheck, lint, 2,373-test suite and retained audit pass. Updated evidence and commit proposal; story/sprint remain review pending human approval, with no commit or production operation.

- 2026-09-19: Implemented all six externally reported Round 5 fixes, expanded shared admission/security/provenance verification, and supplied the explicitly overridden Round 6 review prompt. No sixth review, status transition, production action or Git publication was performed.

- 2026-09-15: Created Story 15.2 context from the accepted consolidated architecture and current source/fixture seams; preserved six epic ACs and all carried validation/authorization gates.

- 2026-09-15: Implemented additive g2 identity, Float64 codec, immutable schema/release/revision/rollback contracts and actual isolated test harnesses. Local role/race tests pass; full-cohort storage evaluation is still in progress.

- 2026-09-15: Full-cohort storage failed on venue 19 / 2026-09-09 unresolved duration. Preserved and audited partial data, reproduced the rejection with bounded test-only refinement, recorded BLOCKED.md, and left Story 15.2 in-progress without invoking review or starting 15.3.

- 2026-09-15: Resumed at user request. Added an isolated version-bound g2 subsecond solar correction, preserved g1 behavior, reproduced the old rejection and passed the corrected-date probe. Started a fresh full actual-year storage run.

- 2026-09-15: Completed fresh 42-venue/two-year retained storage and final independent audit; all component budgets pass. Preserved the post-calculation Vitest timeout, adjusted its future allowance, documented the exact verification disposition, and prepared the canonical review gate.

- 2026-09-15: Canonical full-key review wrapper passed lint, typecheck and all 2,327 tests; sprint/story moved to review. All seven tasks complete. Human approval alone may move to done; stopped before Story 15.3.

- 2026-09-16: Applied the user-authorized Round 3 review fixes for canonical database admission, manifest-bound validation, revision fencing, bounded/topology-safe inputs, replay convergence, rollback/crash-path evidence and missing contract tests. Story and sprint status remain review.

- 2026-09-17: Applied the user-authorized Round 4 fixes for cross-runtime canonical JSON parity, normalized SQL admission, range parity, fail-closed outer inputs, source-aligned retained-data evidence and invoker trigger functions. Story and sprint status remain review.

## Review Findings

### Round 1 — 2026-09-15; remediation authorized 2026-09-16

The review was reported in the task without editing this story. This records that
existing round; it is not a second review or human completion approval.

- [x] [Review][Patch][P1] Reject incomplete sampled days before trusting their
  checksum: TypeScript and SQL now require every five-minute UTC base sample,
  every conditional one-minute probe, and agreement between horizon samples and
  the first/last raw interval classification. Regression cases include the
  twelve-hour/two-zero-sample false sunny window, missing grids, inclusive 5pp
  trigger boundaries, classification changes, DST dates and short horizons.
- [x] [Review][Patch][P2] Reject release assertions outside READ COMMITTED before
  acquiring validation locks. Real PostgreSQL tests establish a Repeatable Read
  snapshot, commit another session's revision change, then verify publication is
  rejected with its pointer unchanged. SERIALIZABLE is also rejected; existing
  READ COMMITTED publication/rollback and revision-writer barriers still pass.

Remediation evidence is under
`../test-artifacts/implementation/epic-15/story-15-2/review-fixes-2026-09-16/`.
The first SQL run exposed integer overflow in grid arithmetic; its raw failure
log is preserved in `sql/`. Bigint grid iteration fixed that implementation
error; `sql-02/` passes 194 logged SQL checks and the dedicated suite's three
tests. The full regression suite passes 256 files / 2,335 tests.

Final retained-data revalidation passes all 21,084 days / 4,442,504 samples and
four complete compatible current/rollback targets under the stricter TypeScript
and SQL validators. The original raw-data checksum is unchanged. The canonical
gate dry-run passes lint/typecheck and all 2,335 tests; log:
`validation/15-2-define-g2-generation-schema-and-migration-rollback-contract-review-20260916-130032.log`.
Ready for re-review (Round 2); no re-review has been performed during remediation.

The schema handoff documents required samples and the isolation contract. No
numerical calculation, public runtime, weather policy, production operation,
Git publication or Story 15.3 work is introduced. Re-review and human approval
remain separate. Story/sprint status is unchanged.

### Round 2 — 2026-09-16; remediation authorized 2026-09-16

The second review was reported in the task without changing this story. This
records that existing round and the user-authorized fix, not a third review.

- [x] [Review][Patch][P1] Reject sunny intervals unsupported by retained samples.
  The reported all-zero, boundary-aligned fixture and its false-shade inverse are
  rejected by both TypeScript and SQL. Every internal transition now requires
  correctly classified observations strictly on either side, within its declared
  uncertainty and a <=100ms bracket. Exact-boundary observations cannot replace
  those witnesses. Regression coverage preserves valid crossings, detected gaps,
  DST dates, Float64 boundaries and half-millisecond uncertainty.

Evidence: `../test-artifacts/implementation/epic-15/story-15-2/review-round-2-fix-2026-09-16/`.
The new regressions failed against the previous codec, then passed after the fix.
The isolated database suite passes 202 logged SQL checks and three tests. The
retained-data audit passes all 21,084 days / 4,442,504 samples, 87 generations and
four compatible current/rollback targets; original raw bytes/checksum are unchanged.
The canonical dry-run gate passes lint/typecheck and 256 files / 2,341 tests:
`validation/15-2-define-g2-generation-schema-and-migration-rollback-contract-review-20260916-142100.log`.

The schema handoff and file list include the correction and new crossing fixture.
Protected config, party-mode memory, documentation-contract test, project context
and sprint status match pre-fix hashes. No numerical recalculation, production
operation, Git publication, Story 15.3 work or completion approval occurred.
Ready for re-review (Round 3); no third review was performed during remediation.
Story/sprint status remains `review`.

### Round 3 — 2026-09-16; remediation authorized 2026-09-16

This records the fixes authorized after the third review. It is not completion
approval and does not move the story or sprint status beyond `review`.

- [x] [Review][Patch][P1] Engine manifests and g2 inputs now fail closed in both
  TypeScript and PostgreSQL: exact fields, canonical JSON, required named numerical
  dependencies, manifest equality, supported eligibility enums, polygon topology
  and explicit collection/coordinate bounds are enforced before admission.
- [x] [Review][Patch][P1] Ring canonicalization uses bounded linear-time least
  rotation rather than materializing every rotation; aggregate input limits keep
  the worker contract within the declared memory envelope.
- [x] [Review][Patch][P1] Crossing witnesses are validated against the bound
  engine manifest's `crossingBracketMs` in TypeScript release verification and SQL
  day/release validation; regressions cover stricter and invalid policies.
- [x] [Review][Patch][P1] Revision values are server-owned. Staging/commit and
  source-trigger transitions receive deterministic increments; direct revision
  inflation is rejected and covered by the real-role database suite.
- [x] [Review][Patch][P1] Migration replay now replaces weaker named policy
  constraints, validates existing engine/input rows and restores generation and
  release composite foreign keys independently.
- [x] [Review][Patch][P1] Rollback negatives cover unsupported decoders,
  nonexistent generation membership, corrupt generation/release checksums and
  rejected pointer changes with the prior pointer retained.
- [x] [Review][Patch][P2] The storage harness atomically writes a failure marker,
  best-effort transitions an active build to `failed`, and permits final partial
  validation of explicitly recorded hard-crash `building` state without claiming
  complete coverage.
- [x] [Review][Patch][P2] The seating-identity regression now mutates a fresh
  fixture, and the schema suite explicitly verifies the ready/build/member/evidence
  index contract.
- [x] [Review][Patch][P3] The two previously omitted Round 1/2 validation logs are
  listed in the story File List.

Verification after remediation: typecheck passes; full quiet lint passes; the full
Vitest suite passes 256 files / 2,344 tests; and the guard-owned isolated PostGIS
suite passes three tests with 232 logged SQL checks, including interrupted apply,
idempotent/populated replay, real roles, checksum failures, pointer preservation,
concurrency barriers and legacy coexistence. No production operation, numerical
recalculation, Git publication or Story 15.3 work occurred. Story/sprint status
remains `review` for re-review and separate human completion approval.

### Round 4 — 2026-09-17; remediation authorized 2026-09-17

This records the fixes authorized after the user-overridden fourth review. It is
not a fifth review, completion approval, or a status transition.

- [x] [Review][Patch][P1] TypeScript and PostgreSQL canonical JSON now share plain
  decimal number spelling (including exponent inputs and numeric scale), UTF-8/C
  object-key ordering, and normalized negative zero semantics.
- [x] [Review][Patch][P1] SQL admission now rejects rotated/reversed/noncanonical
  polygon rings and hole order, non-sorted caster identities, and duplicate or
  unsorted source flags rather than accepting alternate text for the same g2 input.
- [x] [Review][Patch][P1] PostgreSQL mirrors TypeScript's manifest sign/integer/
  percentage ranges and longitude/latitude bounds for every polygon position.
- [x] [Review][Patch][P1] The outer TypeScript input schema strips only the five
  explicitly excluded display/weather/product fields; every other unknown field
  fails closed.
- [x] [Review][Patch][P1] The complete retained 42-venue/two-year corpus was
  revalidated after the fixes. Current source hashes are recorded with the same
  21,084 days, 4,442,504 samples and raw-days SHA-256; no numerical recalculation
  or production admission is claimed.
- [x] [Review][Patch][P2] Engine/input trigger functions are SECURITY INVOKER with
  pinned search paths, matching the handoff. Non-service writes still reach FORCE
  RLS, while service-role admissions run the strict internal validators.

The migration additionally drops the obsolete two-argument day validator on replay
to avoid overload ambiguity, and the retained-data harness declares PostGIS as an
explicit prerequisite and reuses prior bounded layout specimens idempotently.
Evidence is under `../test-artifacts/implementation/epic-15/story-15-2/` in
`review-round-4-fixes-schema-final-r2-2026-09-17/` (238 logged SQL checks) and
`storage-05-g2-full-round4-refresh/` (complete source-aligned revalidation).

Verification after remediation: typecheck passes; full quiet lint passes; the full
Vitest suite passes 256 files / 2,346 tests; the dedicated guard-owned PostGIS suite
passes three tests; and the retained-data revalidation passes. Protected existing
work remains preserved. No production operation, Git publication, Story 15.3 work,
or completion/status transition occurred. Story/sprint status remains `review` for
a separately authorized fifth review and separate human approval.

### Round 6 remediation — 2026-09-19

This is the bounded remediation authorized for the confirmed P1 topology-cost
finding. It is not another formal review, human approval or a status transition.
The externally supplied Round 5 remains Round 5. Story/sprint remain `review`.

- Early length-only admission now precedes nested Zod parsing/topology; piped
  structural validation prevents failed shapes entering topology. PostgreSQL
  mirrors early collection/aggregate admission before canonicalization/ST_IsValid.
- Exact-predicate endpoint sweep with deterministic AVL status replaces quadratic
  segment-pair enumeration. Grouped contacts retain vertical/T/multiway tangencies,
  reject backtracking and contact cycles, and preserve connected interior.
- Once simple ring pairs have at most one contact, one non-contact vertex per
  ring determines containment. Total containment scans are <=127*N over seating
  plus all casters; sweep work is O(N log N + sum(R_p^2)), with unchanged limits.
  Cached canonical hole-sort keys reduce allocation without changing hash bytes.
- New regressions: `nextjs-app/test/unit/services/sun-geometry-g2-admission.test.ts`,
  `sun-geometry-g2-topology-cost.test.ts`, shared `test/fixtures/epic-15/g2-sweep-parity.ts`
  and dedicated `test/integration/epic-15/topology-parity.test.ts`. The existing
  `schema.test.ts` adds four early-admission cases and an explicit disposable-lane
  option; default persistent-lane behavior and role/security assertions remain.
- Final typecheck/quiet lint pass. Full Vitest passes 259 files / 2,362 tests with
  bounded concurrency. An earlier unrelated SettingsModal focus failure is retained;
  its isolated rerun passed without edits. Fresh real PostgreSQL suite passes
  3 files / 4 tests, 441 logged schema checks and four exact current migration
  executions. TypeScript/PostGIS agree on 1,003 new differential cases.
- The old huge case was not executed. Under the fixed validator its complete
  input (249,860 entries including the fixture caster) performs 994,725 segment
  checks, locally taking 1.52s wall / 1.67s Node CPU, peak process RSS 320MB including
  the non-listening test loader. These are diagnostics, not universal worker bounds.
- Fresh captured-geometry parity passes all 42 venues. Fresh retained DATABASE
  revalidation remains BLOCKED: persistent guard admission reported
  `DOCKER_UNAVAILABLE / worker-failed` and `start-recovery-identity-mismatch`.
  The request was not blindly retried; the usable disposable lane lacks the
  original retained DB. Original eight corpus pins and prior evidence are preserved.
  Round 5 retained-row/storage results remain historical for changed sources.

Exact evidence, bounded-work argument, alternatives, commands, failed attempts,
source/preservation hashes and resource Stop acknowledgments:
`../test-artifacts/implementation/epic-15/story-15-2/round6-remediation/README.md`
and `verification.json`. No support limit, canonical identity policy, dependency,
capacity hold or later-story obligation was weakened. No production operation,
cleanup/reset/deletion, Git publication, next-story work or formal review occurred.
The fix is ready for a separately authorized review with the retained-DB limitation
explicit; human completion approval remains separate.

### Round 7 remediation — 2026-09-19

Rasmus authorized the bounded R7-01 fix after the independent Round 7 review.
This is remediation, not Round 8 or an automatic review/fix loop. Status stays
`review`; completion approval and later-story work remain separate.

The TypeScript preflight now rejects rings with fewer than four entries,
non-array rings, empty/non-array ring collections and non-object polygons before
nested Zod parsing. This matches the existing SQL shape/minimum checks without
changing supported geometry, canonical bytes, maximum limits or the reviewed
sweep/containment implementation. The migration and database harness are unchanged.

Deterministic regressions cover 0–3 entries, malformed ring/collection shapes,
poisoned subsequent entries and 5,000 casters containing 640,000 empty ring
occurrences. Both safeParse and parse now return one issue. The bounded 500-caster
probe reproduced 64,000 issues before the fix and one afterward. The vulnerable
maximum-size case was not executed. Relevant admission/topology/hash tests pass
43 tests; final check results and preservation hashes are recorded in
`../test-artifacts/implementation/epic-15/story-15-2/round7-remediation/README.md`
and `verification.json`.

No fresh PostgreSQL execution or infrastructure startup was attempted for this
TypeScript-only follow-up. Round 7's SQL/parity results remain dated evidence;
unchanged SQL is not relabelled a fresh current-source differential pass. Retained
DATABASE revalidation remains blocked by the previously recorded persistent-lane
failure and must remain visible before human completion approval. Capacity stays
HELD; A1 and Stories 15.3–15.6 obligations are unchanged. No production access,
cleanup/reset/deletion, commit/push/merge/deploy or status transition occurred.

### Focused Round 7 patch verification and commit preparation — 2026-09-19

Independent bounded verification found no concrete defect in R7-01. This is not
Round 8 or a review/fix loop. The existing 43 admission/topology/hash tests pass;
a separate 39-case probe checks both parse modes, seating/caster paths, malformed
polygon/ring shapes, short rings and an effective poisoned-getter positive control.
The 5,000-caster / 640,000-empty-ring-occurrence input returns exactly one issue
per mode. Valid literal identity, maximum limits and SQL acceptance parity remain
covered. No implementation, dependency or migration edits were made in this task.

Fresh baseline/final typecheck and quiet lint pass. Full Vitest with maxWorkers=4
passes 259 files / 2,373 tests, zero failures/skips. Fresh guard-admitted disposable
PostgreSQL validation passes 3 files / 4 tests: 441 logged checks, four exact
migration executions and 1,003 PostGIS parity cases. Earlier Round 5/6/7 results
remain historical and are not relabelled fresh.

Fresh retained DATABASE revalidation is BLOCKED / NOT RUN. Persistent ComposeUp
was admitted, then failed with DOCKER_UNAVAILABLE / worker-failed, lifecycle
start_uncertain and start-recovery-identity-mismatch. The existing persistent
container was observed stopped; it was not adopted, raw-started or mutated.
All eight original retained artifact pins match. Restoring guard admission of
the existing persistent volume/container and verifying the original measurement
database must precede the required retained audit. No replacement data or numerical
recalculation is permitted as a substitute. Guard Stop requests for both admitted
resources were accepted (stop_requested, verified=false); no shutdown polling.

Exact fresh results, preservation/source hashes, infrastructure evidence and the
proposed commit file manifest are under
`../test-artifacts/implementation/epic-15/story-15-2/focused-verification-2026-09-19/`.
The story File List now explicitly includes the four existing Round 6 test/fixture
files previously described only in remediation history. Story/sprint remain review;
index and HEAD are unchanged. No completion approval or commit was requested while
the retained audit remains blocked. Capacity remains HELD; A1 and Stories 15.3–15.6
remain mandatory. Local validation is not production or physical-accuracy proof.

### Retained-database blocker cleared — 2026-09-21

Resumed at Rasmus's request. Persistent guard admission now succeeds without an
administrative repair. The original saved database was verified before executing
the pinned retained audit; no replacement data or numerical recalculation occurred.
All eight original artifact pins pass, as do migration replay, SQL payload checks,
current TypeScript decoding/input hashing, checksum chains and all four complete
current/rollback targets. Fresh results: 21,084 days / 4,442,504 samples,
87 generations, 44 inputs and eight releases. Full layouts measure
24,633,344–24,657,920 bytes each (<30 MB), shared metadata 1,769,472 bytes (<5 MB).

Baseline typecheck/lint and full Vitest pass (259 files / 2,373 tests, no failures
or skips). All 13 implementation/dependency hashes match September 19. Existing
schema/role/parity results retain that date; this task adds the missing fresh
retained-database proof. No source, migration or dependency edits were necessary.

Evidence and refreshed commit proposal:
`../test-artifacts/implementation/epic-15/story-15-2/resume-2026-09-21/README.md`.
Guard Stop was requested with saved data preserved. The recorded completion
blocker is cleared; story/sprint remain review pending human approval. No new
review round, commit, push, merge, deployment or production access occurred.
Capacity remains HELD; A1 and Stories 15.3–15.6 obligations are unchanged.

### Round 8 remediation — 2026-09-21

Rasmus authorized fixing R8-01. Both runtime boundaries now reject the exact
`__proto__` manifest-map key; TypeScript checks the raw map before Zod can omit it.
Supported keys, including `constructor` and `prototype`, preserve their identity.
No canonical format, numerical behavior, dependency version or geometry limit
changed. The unshipped migration uses the shared validator on admission and replay.

Three new regressions failed before implementation. The fixed focused suite passes
27 tests; full Vitest passes 259 files / 2,379 tests with zero skips. Typecheck and
lint pass. The real SQL lane passes 450 logged checks and four byte-exact migration
executions, including six forbidden-key denials and three positive readbacks;
1,003 PostGIS topology cases also pass. Fresh original retained-database validation
passes 21,084 days / 4,442,504 samples with all eight corpus pins intact, current
source hashes and four complete current/rollback targets. Full layouts remain
24,633,344–24,657,920 bytes each; shared metadata is 1,802,240 bytes, within budgets.

R8-01 is resolved. Evidence and refreshed commit scope are in
`../test-artifacts/implementation/epic-15/story-15-2/round8-remediation/README.md`.
Guard Stop was accepted with saved state retained. Story/sprint remain review;
human completion approval is separate. No Round 9, commit or production operation
occurred. Capacity remains HELD; later-story and A1 obligations are unchanged.
