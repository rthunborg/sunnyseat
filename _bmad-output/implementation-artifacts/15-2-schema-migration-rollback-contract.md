# Story 15.2 schema, identity and rollback handoff

## Scope and status

Local additive implementation only. No worker, public seasonal reads, schedule,
production migration, deployment or feedback-format switch is included. The
rolling runtime, historical migrations and g1 consumer contract are unchanged.
The canonical architecture remains E15-AD-01/02. This file describes concrete
schema choices; it does not replace accepted product policy.

## Identity and payloads

`sun-geometry-hash-g2.ts` validates the explicit geometry input envelope, canonical
polygon rings/holes and eligible caster inputs. Object/caster ordering, ring start
and orientation, equivalent numbers and negative zero are normalized. Canonical
numbers use plain decimal spelling and object keys use UTF-8/C byte order in both
TypeScript and PostgreSQL. The five named display/weather/product fields are
explicitly stripped from the outer envelope; every other unknown outer, caster or
engine-manifest key fails validation rather than silently escaping identity.
The producer supplies the derived canonical engine coordinate and its derivation
version; it must never substitute display coordinates. g1 is unchanged.

The engine manifest binds algorithm versions, numerical dependencies and constants,
selection/search/shadow policy, horizon, sampling/refinement and decoder. Canonical
input text lives once in `sun_geometry_inputs`, referenced by hash from generations.
SQL admission additionally enforces the accepted 5-degree/50-percent, five-minute/
one-minute, 300-second policy and bounded root/refinement precision. A different
policy can have a different g2 identity but cannot silently enter this decoder's
season tables just by keeping the old horizon/format labels.
SQL also rejects non-normalized polygon winding/start/hole order, caster order and
source flags, and mirrors the TypeScript coordinate and manifest numeric ranges.
Engine manifests are shared separately. Neither day rows nor manifests store
intermediate shadows. The storage experiment labels the absence of source roof
elevations in the old capture; it does not invent them.

The measured g2 source set includes `lib/solar/g2-solar-position.ts`. This opt-in
adapter restores the millisecond term omitted by the legacy hour-angle calculation.
Apply it exactly once to legacy solar output, consistently for horizon and shadow
calculations. Its source is bound into the numerical manifest; g1 remains unchanged.
The original captured 300-second rejection and the corrected g2 result are both
retained in the duration-probe evidence. Later worker integration belongs to 15.3.

Seasons identify an actual year, March 1–October 31 and Europe/Stockholm. Each
generation requires all 245 exact dates. Non-deleted hidden and new venues remain
in the release inventory. Public planner length is neither a g2 input nor a
season-size control.

The immutable season key is `(season_year, engine_id)`. Generations and releases
reference both fields, so a numerical dependency/algorithm update can register a
new season version for the same actual year without rewriting its predecessor.
The current pointer remains keyed by requested year and selects a version through
its release. When multiple engine versions exist for a year, a release insert
must identify its engine explicitly; there is no nearest/latest-engine fallback.
Generation engine identity is derived from and checked against its canonical input.

The season row owns immutable year/date/timezone/hash/format identity and references
the engine manifest for horizon and sampling policy. Expected/completed venue
counts, verification timestamp and checksum live on its releases; expected/day/
sample counters live on generations. This normalization avoids a second mutable
season summary disagreeing with a verified release. Current state is derived from
the per-year pointer. Retirement never authorizes retention deletion.

Day arrays are one-dimensional and one-based in PostgreSQL. All offsets, exposure,
raw interval endpoints and uncertainty bounds use Float64. Offsets are milliseconds
from **that date's Stockholm midnight UTC instant**, whose next midnight can be
23/24/25 hours later. Fractional offsets do not pass through JavaScript Date or an
integer timestamp conversion. Horizon endpoints and all adaptive points survive.
A null horizon with every array empty is a completed supported-model negative;
missing, failed or exhausted work is not a day row. Raw >50% intervals partition
the supported horizon and retain every detected shade gap. Qualification at 300s
is derived separately, with unresolved duration uncertainty rejected.

Review correction (2026-09-16): both TypeScript and SQL require every UTC-aligned
five-minute base observation plus exact horizon endpoints. Each base cell whose
endpoint is within 5 percentage points of 50%, or whose endpoint classifications
differ, must also contain every one-minute UTC probe. First/last raw interval
classifications must agree with the horizon samples, including short horizons
with no interior grid point. This validates required observations without claiming
discovery of events outside the accepted empirical detector's guarantees.

Round 2 correction (2026-09-16): every internal raw transition also requires
retained observations strictly before and after its boundary. The nearest
observations must match the respective adjacent interval classifications, lie
within the declared boundary uncertainty, and form a bracket no wider than
100ms. An observation exactly at the boundary cannot replace either witness.
This rejects invented sunny windows and shade gaps even when every required
base sample is present. Horizon endpoints remain separately validated; existing
Float64 values, sub-millisecond uncertainty and raw detected gaps are preserved.

Day checksum encoding is documented in the codec: `|`-separated format/date,
horizon (`-` for supported negative), offsets/exposure/start/end arrays, boolean
bits, and start/end uncertainty arrays. Float arrays encode normalized-zero
big-endian IEEE754 bytes as hex. PostgreSQL `float8send` and Node `writeDoubleBE`
therefore agree without JSON exponent-spelling assumptions. Generations bind g2,
actual year, timezone, format and sorted `date:day-checksum` lines. Releases bind
year, engine ID, format and sorted `venue:generation:revision:checksum` lines.
Delimiter-bearing record IDs are forbidden. Literal g2 SHA256 was independently
verified using Python, without importing the implementation under test.

## Immutability and permissions

Engine/input/season/day/member/evidence payloads are insert-only. Generations start
building and may update counters or become ready/failed; verified payloads cannot
change. A ready generation can become retired only when it is already incompatible
with the committed revision or dirty state; every payload field and evidence
reference stays intact. A currently compatible ready generation cannot retire.
This frees the unique ready slot for a later same-hash/new-revision rebuild without
deleting history. Ready transition recomputes counts, exact coverage and checksum. Releases
start building, accept only ready compatible members and become verified only
through transaction-time validation. Verified membership is immutable. The pointer
is the authoritative current state; release `current`/`retired` labels are reserved
and not used as an independently mutable read source.

All eleven new public tables have RLS and FORCE RLS, service-only SELECT/INSERT
and narrowly scoped UPDATE grants. Anon, authenticated and inherited PUBLIC are
denied both relation and internal function access. Internal functions use explicit
search paths and SECURITY INVOKER; no new privileged definer function is needed.
FORCE RLS does not constrain superusers/BYPASSRLS; tests separately exercise a
non-bypass owner, following the [PostgreSQL 15 RLS contract](https://www.postgresql.org/docs/15/ddl-rowsecurity.html).
Existing rolling definer RPC permissions are preserved.

No DELETE/TRUNCATE grant exists for seasonal data. Immutable rows and non-cascading
references protect complete current/rollback releases and evidence, even during a
concurrent reference creation attempt. A later retention operation needs its own
transactional design and authorization; this migration does not introduce pruning.
Legacy evidence records retain g1 hashes without changing the public feedback API.
Weather and classifier evidence identities remain independent nullable references;
missing historical evidence is disclosed, never manufactured.

## Revisions, races and publication boundary

Input revisions contain committed and staged hashes. Staging alone keeps the old
committed revision valid. Committing a changed hash advances the revision; so do
observed venue geometry/source changes. A generation records the revision with
which it is intended to become compatible. Builders must capture and recheck the
source snapshot and anticipated committed revision; a raw input hash is not a
substitute for that check. No caller may clear dirty state or overwrite a revision
merely to make a candidate pass.

The migration adds cheap write-time venue dirty detection for seating/elevations,
canonical lat/lng and deletion. Display pins, names, hours and visibility do not
invalidate geometry. Caster writes conservatively dirty all registered venues
until the later planner proves the spatially affected set. There is no request-time
caster query or hash calculation. These triggers do not change the rolling read
path; seasonal fail-closed public integration belongs to 15.4.

Verification and pointer writes serialize through one transaction advisory lock,
hold SHARE locks over live inventory and revision tables, and lock the release.
Release assertions require READ COMMITTED transaction isolation. REPEATABLE READ
and SERIALIZABLE are rejected before acquiring assertion locks; a table lock
cannot refresh an already established transaction snapshot. Callers must begin
a READ COMMITTED transaction before verification/publication or pointer rollback.
They recheck exact venue membership, committed hash/revision/dirty state, ready
generation identity, dates and checksum chain. Partial rows and incompatible years
cannot become current. A real two-session test holds an uncommitted revision write,
observes a pointer lock timeout, commits the writer and proves rejection of the
stale release with the old pointer intact. Aborted pointer changes roll back.

The worker lease table has exactly one geometry slot and a separate publication
slot. Ownership cannot change while a lease is active; expiry requires a greater
fencing token. Heartbeat timestamps cannot move backward; leases cannot exceed
120s from heartbeat or the server's current time. Future-dated heartbeats are
rejected on insert and update. Scheduling, 15s heartbeat enforcement, bounded shards, retries,
queue priority and stopping a worker after lease loss belong to 15.3.

## Migration and recovery

The CLI created `20260915104303_seasonal_geometry_g2_contract.sql`. It applies in
one transaction. Prerequisites are PostgreSQL 15, public venues with text IDs,
the established Supabase roles and the existing service-owned migration boundary.
PostGIS is needed by the retained rolling-schema test fixture, not by day decoding.
The real-role harness uses isolated local login adapters plus explicit SET ROLE;
it never changes production role attributes or reads provider credentials.

The local suite tests clean prerequisite replay, deliberately interrupted migration
rollback, idempotent replay and supported rolling-schema coexistence with unchanged
historical migration files and exact rolling RPC output. If transactional apply
fails, the connection rolls back; correct the defect and replay locally. Do not
drop the schema or run a destructive down migration as recovery.

The unshipped migration also supports the earlier local 15.2 fixture shape. Within
its transaction it backfills new generation/release engine references, replaces
the year-only season key with the composite key, and restores the invariant
triggers before commit. A populated 994-day fixture replayed twice with unchanged
payload, generation, season, release-checksum and pointer snapshots; four complete
current/rollback targets revalidated. Evidence: `migration-upgrade-01/result.json`.

Pointer rollback requires a complete retained verified release compatible with
**current committed inputs**, season/engine/format/decoder and checksum chain.
Recheck both current and designated rollback targets in the transaction. Flip only
the pointer. A pointer requires a non-null, distinct rollback manifest; both may
share the same immutable compatible generations. Tests compare input and weather
digests before/after. If inputs changed
and no compatible release remains, reject the rollback and keep coverage failed
closed; an older generation or running rolling job is not a valid fallback.

Resolve a pointer by the requested Stockholm date's year, never the server clock
or nearest available season. The pure verifier covers this contract; it is not
wired to public routes in this story.

## Executable local checks

From `C:\DEV\sunnyseat\nextjs-app`:

```powershell
npx tsc --noEmit
npx eslint . --quiet
npx vitest run
# Supply an explicitly guard-admitted local container and a new absolute output.
$env:E15_DB_CONTAINER = '<guard-owned container ID>'
$env:E15_DB_OUTPUT = '<fresh absolute evidence directory>'
npx vitest run --config vitest.epic15-db.config.ts
# Use another fresh output directory for measured actual-date storage.
npx vitest run --config vitest.epic15-storage.config.ts
# Revalidate the pinned original full-cohort corpus into a separate fresh directory.
$env:E15_RETAINED_OUTPUT = 'C:\DEV\sunnyseat\_bmad-output\test-artifacts\implementation\epic-15\story-15-2\storage-04-g2-full'
$env:E15_DB_OUTPUT = '<different, nonexistent absolute evidence directory>'
# Verifies pinned raw/measurement hashes BEFORE replaying the additive migration.
npx vitest run --config vitest.epic15-revalidate.config.ts
# Full captured pilot: same serial runner, all 42 venues for both actual years.
$env:E15_FULL_COHORT = '1'
# Set E15_DB_OUTPUT to another fresh absolute directory before this run.
npx vitest run --config vitest.epic15-storage.config.ts
```

The angle-bracket values are local harness inputs, not verified production commands.
No provider fallback exists. Schema/measurement runs create new isolated `e152_*`
databases; revalidation uses the pinned retained measurement database and preserves
its bytes. Guard Stop preserves the named volume; no Docker down/prune/reset or
database deletion is part of teardown. Host actor identity is never saved here.

After every story obligation passes, run the canonical gate from the repository
root using the exact sprint key (the installed wrapper does not expand `15-2`):

```powershell
.\scripts\run-sh.ps1 scripts/story-review.sh 15-2-define-g2-generation-schema-and-migration-rollback-contract
```

## Evidence limits and completion gate

Raw runs and preservation hashes are under
`_bmad-output/test-artifacts/implementation/epic-15/story-15-2/`. The initial storage
run is retained as a failure: changing one captured caster's height did not change
the calculated exposure. The next experiment deliberately changes all resolved
caster heights and labels that counterfactual. Neither is historical field truth.

Actual measured relation sizes must be reported separately from extrapolation and
disk/WAL headroom. A bounded one-venue cohort cannot certify full 42-venue retained
storage or fresh aggregate legacy coexistence. Capacity admission remains HELD;
no budget, retention or precision reduction is authorized. I13 cold/combined/no-op/
writer-load proof remains with 15.5, and fresh target capacity/disk/WAL with O01/O02.
Unperformed obligations must remain unchecked. Review migration/rollback evidence
before any separately authorized production operation; local checks never provide
that authorization.

## Previous local stop and resumed validation

The prior full actual-year storage run failed on unresolved
300-second duration uncertainty at venue 19 / 2026-09-09. See
`../test-artifacts/implementation/epic-15/story-15-2/BLOCKED.md` and
`verification-final.json` in that evidence directory. The partial payload audit and
regression checks passed; that run did not pass full component budgets or review.
Development resumed at the user's request with the isolated g2 correction above.
`storage-04-g2-full` completes all 42 venues for both actual years, plus changed
retained inputs and failed occupancy. Final independent migration/byte/count/
diversity/release audit and all component budgets pass: 21,084 rows, 4,442,504
samples, four full layouts at 24.62–24.64 MB each and shared metadata at 1.77 MB.
The original calculation command exceeded its three-hour timeout after writing
its complete report; that failed command is preserved. The future allowance is
six hours, and the completed data passed the separate audit without repeating
calculations. See `FINAL-LOCAL-EVIDENCE.md` in the evidence directory for exact
bytes, commands, retained limitations and the verification disposition. The latest
SQL lane (`sql-16-lease-bound`) passes 185 checks, including same-year engine
upgrades and server-time lease bounds. No production authorization is implied.

Round 4 remediation revalidated the unchanged retained `storage-04-g2-full` bytes
under the current sources in `storage-05-g2-full-round4-refresh`. The audit installs
the isolated PostGIS prerequisite explicitly, replays the final migration, and
passes all 21,084 rows / 4,442,504 samples with the original raw-days SHA-256.
`final-revalidation.json` records the current hash/codec/revalidation/migration
source hashes and four complete layouts at 24.63–24.66 MB. The retained numerical
calculations keep their original source provenance; no recalculation or production
admission is claimed.

## Round 5 shared-admission and provenance hardening — 2026-09-19

The TypeScript/SQL boundary uses the same finite Float64 number identity. SQL's
canonical number formatter derives an exact integer rational from the Float64
bits, then chooses the shortest round-tripping decimal (nearest/even on ties).
It does not use PostgreSQL's different midpoint-avoiding float text formatter.
Canonical text equality rejects overflow/underflow and extra decimal precision
that JavaScript cannot reproduce; it does not silently round a stored identity.
Input/source revisions are restricted to 1..9007199254740991, with replay-applied
constraints and transactional rejection at overflow.

Strings and map keys reject NUL/lone surrogates; bounded strings use 1..256 Unicode
code points in both runtimes. Polygon validity includes shell/hole containment,
ring simplicity, nesting/crossing/overlap and connected interior. Isolated valid
point tangencies remain supported. Robust orientation uses the already installed
`robust-predicates` 2.0.4, now explicitly pinned as a direct dependency without a
dependency upgrade. The published package lacks its declared type file, so the
local ambient declaration describes only the used six-number orientation API.

The database lane makes actual INSERT/UPDATE attempts through separate anon,
authenticated and inherited-PUBLIC logins. It checks grant denials across all
eleven tables and separately proves RLS denial/zero updates under temporary
isolated grants, comparing the full persisted state before/after. A valid service
INSERT is the positive control. No production grants are changed.

Revalidation requires literal SHA-256 pins for the original storage-04 raw corpus
and measurement records before database mutation. It writes only to a fresh
evidence directory, includes the release verifier and dependency provenance in
its source hashes, and requires those hashes to remain stable during the run.
Original storage-04/05 evidence remains historical, unchanged; numerical engine
calculations are not repeated or relabelled as current performance evidence.

## Round 6 topology-cost remediation — 2026-09-19

The existing input limits are unchanged: 2,048 entries/ring, 128 rings/polygon,
5,000 casters, 250,000 total coordinates. A length-only preflight now rejects
oversized TypeScript input before nested parsing/topology. PostgreSQL similarly
checks all geometry collection lengths before canonicalization and ST_IsValid.
No new geometry-support or work-admission restriction was introduced.

TypeScript topology uses an exact-orientation endpoint sweep with AVL balancing,
grouped contact events and contact-cycle detection. Containment uses non-contact
vertices after proving simple boundaries and at most one pair contact. Across
seating and every caster, sweep work is O(N log N + sum(R_p^2)); containment
visits at most 127*N edges, N<=250,000 and R_p<=128. Auxiliary geometry storage
is O(N + sum(R_p^2)). Cached canonical hole-sort keys preserve byte identity.
These operation bounds are not a universal elapsed-time or worker-RSS guarantee.
15.3 must still enforce heartbeat/cancellation, resource admission and the full
accepted worker envelope; no worker was implemented in this remediation.

Fresh typecheck/lint, 259-file / 2,362-test Vitest suite, real PostgreSQL
migration/role/rollback suite (441 logged checks, four exact migration executions)
and 1,003-case PostGIS topology differential pass. Captured geometry acceptance
also remains unchanged for all 42 venues. The default integration harness uses
the persistent lane; `E15_DB_LANE=disposable` explicitly selects the existing
Compose test lane's local credentials for schema/parity checks only.

Fresh retained DATABASE revalidation is BLOCKED because the persistent guard
request failed with DOCKER_UNAVAILABLE / worker-failed and no usable retained-DB
container. A disposable schema pass cannot replace that audit. Original storage-04
pins are intact; Round 5 retained storage results remain historical, and changed
source hashes require a future fresh applicable retained audit. Do not rerun the
multi-hour numerical measurement or use a new empty DB as retained evidence.

See `../test-artifacts/implementation/epic-15/story-15-2/round6-remediation/README.md`
for exact commands, diagnostics, failures, preservation and resource acknowledgments.
Story/sprint stay `review`; the fix awaits separately authorized review and human
approval. Capacity stays HELD, and A1/15.3–15.6 obligations remain outstanding.

## Round 7 malformed-ring admission remediation — 2026-09-19

The TypeScript length/shape preflight now rejects short (0–3 entry) and non-array
rings, empty/non-array ring collections and non-object polygons immediately.
Previously empty rings bypassed the aggregate coordinate counter and could
produce one nested Zod issue per ring. The maximum-caster regression now proves
one issue for 640,000 empty-ring occurrences in both parse modes, with poisoned
later entries proving early termination. Valid geometry and canonical identity
are unchanged; the exact sweep and SQL migration were not modified.

See `../test-artifacts/implementation/epic-15/story-15-2/round7-remediation/README.md`
for fresh TypeScript/regression results and preservation evidence. No PostgreSQL
or retained-database audit was rerun in this bounded follow-up. Earlier database
results remain historical for the changed TypeScript source; persistent retained
validation remains blocked. This is a Round 7 fix, not another review or human
approval. Story/sprint stay `review`, capacity stays HELD and later gates remain.

## Focused post-Round-7 verification — 2026-09-19

R7-01 independently passes focused verification; no new formal review or automatic
fix cycle occurred. Fresh evidence is in
`../test-artifacts/implementation/epic-15/story-15-2/focused-verification-2026-09-19/README.md`.
Relevant tests pass 43/43; independent malformed-shape/poison probes pass 39 cases
in both parse modes; full Vitest passes 259 files / 2,373 tests with four workers.
Baseline/final typecheck and quiet lint pass. Current-source disposable PostgreSQL
validation passes 441 schema checks, four exact migration executions and 1,003
PostGIS parity cases. No source, migration or dependency change was needed.

The original retained database has NOT been freshly revalidated. Guard admission
of the persistent lane again failed with DOCKER_UNAVAILABLE / worker-failed and
start-recovery-identity-mismatch. Eight original corpus/measurement pins match;
that file verification does not replace a database audit. The last successful
retained database audit remains the historical Round 5 storage-06 run. Restore the
existing retained lane through an authorized guard repair, verify its original
measurement database, and run vitest.epic15-revalidate.config.ts with pinned
storage-04 input and a new absolute output before completion approval. Do not
recreate retained data or rerun numerical measurements. Both Stop requests were
accepted without deleting state. Story/sprint remain review; capacity remains HELD.

## Retained-database verification completed — 2026-09-21

The persistent lane now reaches guard-verified readiness with its original saved
database; no administrative repair or replacement corpus was required. The fresh
audit verifies all eight storage-04 pins before mutation, replays the migration,
and passes current SQL/TypeScript payload, input-hash, checksum and four complete
current/rollback-target assertions. All 21,084 days / 4,442,504 samples,
87 generations, 44 inputs and eight releases pass. Complete layouts remain
24,633,344–24,657,920 bytes (<30 MB each); shared metadata is 1,769,472 bytes (<5 MB).

Typecheck, quiet lint and full Vitest pass (259 files / 2,373 tests, no skips).
All 13 source/dependency hashes match the September 19 verification. Numerical
calculations retain their original provenance; the schema/role/parity suite was
not rerun or relabelled fresh. Evidence and the refreshed commit proposal are in
`../test-artifacts/implementation/epic-15/story-15-2/resume-2026-09-21/README.md`.

This clears the retained-database completion blocker described above. Guard Stop
was accepted with saved data preserved. Story/sprint remain review pending human
approval, and no commit or production operation occurred. Capacity remains HELD;
A1 and Stories 15.3–15.6 obligations remain unchanged.

## Round 8 manifest-map admission fix — 2026-09-21

The three manifest maps (`solarConstants`, `shadowConstants`,
`numericalDependencies`) reject an own `__proto__` key in both runtimes. TypeScript
checks before record parsing because Zod otherwise silently omits that key; SQL's
shared manifest validator rejects it on engine/input admission and migration
replay. Valid canonical bytes are unchanged. `constructor` and `prototype` remain
supported and covered by positive SQL/TypeScript hash readback tests.

R8-01 is fixed with red/green coverage. Fresh typecheck/lint, all 2,379 unit tests,
450 SQL checks and 1,003 PostGIS parity cases pass. The original pinned retained
database also passes fresh current-source validation: 21,084 days / 4,442,504
samples, eight releases and four complete current/rollback targets. Layouts remain
24,633,344–24,657,920 bytes each; shared metadata is 1,802,240 bytes, within component
budgets. No numerical recalculation occurred. Evidence:
`../test-artifacts/implementation/epic-15/story-15-2/round8-remediation/README.md`.

Story/sprint remain review pending human approval. No new review round, commit,
deployment or production migration; capacity remains HELD and later gates remain.
