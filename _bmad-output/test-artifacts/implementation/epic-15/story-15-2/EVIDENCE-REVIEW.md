# Story 15.2 local evidence review

## Review boundary

Reviewer: implementing Codex agent, 2026-09-15. This is an implementation evidence
review, not independent peer approval or authorization for production. Story 15.2
is now review: the actual storage audit/component budgets and canonical gate pass.

## Observed checks

| Family | Evidence | Result and practical limit |
| --- | --- | --- |
| I01 / I15 identity | g2 unit vectors and unchanged g1 regression | PASS: two literal hashes, independently checked using Python; each manifest/caster field mutation, ring/hole/order normalization and display/weather exclusions. g1 files unchanged. |
| I02 representation | codec and release contract unit tests | PASS: Float64/half-ms round-trip, strict arrays/versions/checksums, exact dates, DST, supported negative, 299/300/301 seconds, uncertainty and detected gaps. Does not prove universal event detection. |
| I03 migration/security | `sql-16-lease-bound/schema-result.json`, `schema-sql-log.json` | PASS: 185 checks in actual isolated PG15, transactional interruption and replay; separate service, anon, authenticated, inherited PUBLIC and non-bypass owner connections. Existing rolling migrations/RPC output preserved. Same-year engine upgrades and server-time lease bounds pass. |
| I08 / I14 publication contract | Same SQL run | PASS: full two-year releases, distinct compatible rollback, unchanged input/weather digests, stale revisions and concurrent inventory writes blocked/rejected, abort preserves pointer. Public publishers/readers remain later integration work. |
| I15 retention | Same SQL run | PASS: immutable references, restrictive FKs and no service DELETE/TRUNCATE privilege; deletion rejected during an uncommitted evidence-reference transaction. No pruning implementation or production deletion. |
| I13 bounded storage | `storage-02/storage-result.json`, `final-revalidation.json` | PASS for the declared one-venue dataset: 994 actual-date rows, 189,417 samples, four complete generations plus a failed partial, eight release manifests. Insufficient alone for the pilot component budgets. |
| I13 previous full attempt | `storage-03-full/` | Preserved FAIL: venue 19, 2026-09-09 has unresolved duration at 300 seconds. Partial payload audit passes; this attempt cannot prove component budgets. See BLOCKED.md. |
| G2 precision regression | `duration-probe-03-g2/`, g2 solar unit test | PASS: original rejection preserved; additive g2 subsecond correction passes the same captured day without weakening uncertainty bounds. g1 runtime is unchanged. |
| I13 resumed full storage | `storage-04-g2-full/`, `FINAL-LOCAL-EVIDENCE.md` | PASS actual stored-data audit and component budgets: 21,084 rows / 4,442,504 samples; all four full layouts 24.62–24.64 MB (<30 MB), metadata 1.77 MB (<5 MB). Original calculation command timed out after saving its complete report; failed command preserved, future timeout adjusted, full independent audit passed. No revised six-hour calculation-command pass is claimed. |
| Populated local migration replay | `migration-upgrade-01/result.json` | PASS: 994 day rows and all four current/rollback targets preserved across composite-season migration replay; exact before/after snapshots match. This precedes the later lease-only fix. |
| Regression | `npx tsc --noEmit`, `npx eslint . --quiet`, `npx vitest run --reporter=json --outputFile=…/vitest-resumed.json` from `nextjs-app/` | PASS; full suite 256 files / 2,327 tests, no failures or skips. Dedicated SQL/storage tests use separate explicit configs and are not counted as default-suite proof. |

## Contract review conclusions

- Canonical input is content-addressed once and shared by generations. Day rows
  contain no caster payload or intermediate shadow polygons.
- Seasons reference immutable engine policy; releases own completion/checksum
  summaries. The per-year pointer is the current-state authority, avoiding mutable
  duplicate current labels. Each pointer requires a distinct complete rollback
  manifest; shared immutable generation IDs are allowed.
- Committed revision, inventory and payload checks run under database locks.
  Verification recomputes the day-to-generation-to-release chain. Later callers
  still need the documented writer transaction, lease fencing and fail-closed read
  behavior; these contracts are not wired into the public runtime here.
- All geometry tables remain service-only with FORCE RLS. The tests explicitly
  distinguish the BYPASSRLS service role from a constrained owner. No new SECURITY
  DEFINER function is introduced.
- Same-hash/new-revision recovery retires only an already incompatible ready generation, preserving its payload and evidence. Compatible ready generations cannot retire. SQL rejects manifests that contradict the accepted horizon/sampling/threshold policy.
- Local migration replay is transactional and additive. Recovery preserves data;
  it does not use a down migration, reset or cleanup. Whole-release rollback never
  changes committed geometry inputs or weather evidence.

## Limitations retained at their owning gates

Capacity admission remains **HELD**. The local captured scene is dated; 2025 output
uses that scene and is counterfactual. Height corrections are deliberate labelled
variants, not historical field truth. Missing source roof elevations are recorded
as null. Three available legacy rows can only establish bounded coexistence;
fresh target aggregate/disk/WAL evidence remains O01/O02. Cold/combined reads,
no-op DB p95, matched writer load and integrated release proof remain 15.5 I13.
No production performance or capacity pass follows from this local run.

Earlier failed SQL iterations and the unchanged-output first storage experiment
remain in their original evidence directories. No failed result was relabelled.
The final decoder/migration revalidation records its own source hashes separately
from the numerical measurement's source hashes.

Canonical full-key review wrapper PASS: lint, typecheck and 256 files / 2,327 tests. Sprint transitioned through the wrapper to review. See `FINAL-LOCAL-EVIDENCE.md` and `verification-resumed-final.json`; no production authorization or next-story work.
