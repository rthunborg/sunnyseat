# Story 15.2 final local evidence

Reviewed by the implementing Codex agent on 2026-09-15. This is implementation
evidence review, not independent human approval or production authorization.

## Acceptance evidence

| AC | Result | Evidence |
| --- | --- | --- |
| 1 | PASS | Immutable seasons keyed by actual year and engine version; generations, Float64 days, manifests, per-year pointers and shared canonical inputs. Codec/release unit tests and real SQL constraints pass. No intermediate shadow polygons are stored. |
| 2 | PASS | Literal independently verified g2 vectors, ordering normalization, geometric/version mutations and strict malformed-input rejection. The measured manifest binds the additive g2 subsecond correction. |
| 3 | PASS | Display/weather exclusions and geometric invalidation tests pass. Original g1 source, vectors, attribution and rolling RPC behavior are preserved. |
| 4 | PASS | `sql-16-lease-bound`: 185 actual SQL checks. `migration-upgrade-01`: populated 994-row replay preserves snapshots. `storage-04-g2-full/final-revalidation.json`: every saved payload, count, digest, version, retained-input difference and complete current/rollback target passes the final schema/decoder audit. Component budgets below pass. |
| 5 | PASS | Staged/committed revision and dirty-state contracts, deterministic inventory/revision races, distinct complete compatible rollback manifests, unchanged input/weather digests, evidence protection and server-time lease fencing pass. |
| 6 | PASS locally | Migration order, replay/recovery, compatibility and rollback evidence reviewed in this file, EVIDENCE-REVIEW.md and the contract handoff. Production remains separately authorized. |

## Actual retained storage

The captured 42-venue scene was recalculated for all 245 dates of both 2025 and
2026. A deliberate +1 m correction to venue 49's resolved caster heights supplies
two further complete retained generations. A +2 m variant supplies a 14-day failed
fixture whose occupied storage is retained. These are labelled counterfactuals,
not historical or outdoor ground truth.

- 21,084 actual date rows; 4,442,504 samples.
- 86 ready generations, one failed partial, 44 input versions, eight manifests.
- Four distinct complete current/rollback targets revalidated against committed inputs.
- Retained day relation: 50,126,848 bytes including indexes, counting shared generations once.
- Shared metadata: 1,769,472 bytes, below the decimal 5,000,000-byte limit.
- Combined seasonal relations: 51,896,320 bytes.

Separate physical layout specimens measure each complete release's 10,290 day
rows. Diagnostic copies are excluded from the candidate occupancy above.

| Actual year | Retained mapping | Heap/TOAST bytes | Index bytes | Total bytes | Limit |
| --- | --- | ---: | ---: | ---: | ---: |
| 2025 | Baseline | 24,264,704 | 376,832 | 24,641,536 | 30,000,000 |
| 2025 | Changed input | 24,256,512 | 376,832 | 24,633,344 | 30,000,000 |
| 2026 | Baseline | 24,256,512 | 368,640 | 24,625,152 | 30,000,000 |
| 2026 | Changed input | 24,248,320 | 368,640 | 24,616,960 | 30,000,000 |

The candidate database is 60,568,367 bytes before diagnostic copies. Three
captured legacy rows add a 180,224-byte legacy relation; this establishes bounded
coexistence, not a complete legacy census. The dated application-only arithmetic
is 366,226,579 bytes (314,330,259 dated application bytes plus measured seasonal
relations), below 375 MB warning/400 MB admission thresholds **only in that
extrapolation**. It excludes a fresh target aggregate/disk/WAL assessment.
**Capacity admission remains HELD.** Later 15.5 I13 and O01/O02 obligations remain.

## Timeout and verification disposition

The fresh calculation executed every measurement assertion and wrote its complete
`storage-result.json`, then Vitest reported its three-hour timeout at 11,605.755
seconds. The exit-1 result is preserved in `storage-04-g2-full/vitest-timeout.json`.
It is not relabelled as a successful command. The future measurement allowance is
now six hours; numerical precision, sample limits, data coverage and assertions
were not weakened.

The completed calculations were not unnecessarily repeated. Instead, the separate
revalidation test replayed the final migration and independently checked every
saved day against both TS and SQL, all reported generation counts/samples, actual
year/input diversity, all input/generation/release digests, evidence references,
four current/rollback targets and four full physical layout specimens. That test
passed in 160.23 seconds. `summarize-storage.py storage-04-g2-full` then passed all
component-budget comparisons. The revised six-hour calculation command itself
has not been rerun; this is not candidate-worker performance acceptance.

Observed generation calculation time is 184.477 minutes wall / 173.821 minutes
Node CPU, excluding database/child CPU. Local regression/SQL checks overlapped
portions of the run. These measurements do not prove an isolated worker budget.

Latest typecheck/lint pass. The full regression report `vitest-resumed.json` has
256 files / 2,327 passing tests, zero failures or skips. The dedicated SQL/probe
lane passes three tests across two files, including 185 SQL checks. The canonical
review gate passes lint, typecheck and all 2,327 tests, and moved sprint status to
review. Its log is `implementation-artifacts/validation/15-2-define-g2-generation-schema-and-migration-rollback-contract-review-20260915-182747.log` under `_bmad-output/`. No UI/E2E screen gate
applies to this backend-only story.

Earlier failure folders, including the original unresolved-duration result, are
preserved. The corrected full run reproduces the venue 19 / 2026-09-09 interval
as 300,306 ms with bounds [300,256, 300,356] ms and 199 samples, satisfying the
unchanged duration rule. No production operation or next-story implementation
was performed.
