# Story 15.2 Round 11 remediation evidence

Date: 2026-09-23

## Result

- All 24 Round 11 review findings are resolved and checked in the story file.
- Pointer publication uses checksum-bound validation evidence frozen during full release verification. Pointer movement rechecks release/generation digests, aggregate counts, inventory membership, and current source revisions without rescanning day payload arrays under publication locks.
- Historical active-less caster inputs are admitted only during migration replay when their manifest carries the allow-listed retained lockfile digest. Current admission requires `active` and the strict robust-predicates dependency identity.
- The retained storage-04 source database was used only as a template source. Revalidation ran in a fresh clone and the clone was dropped by the harness.

## Verification

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS, 259 files and 2,384 tests
- Focused geometry contract unit tests: PASS, 4 files and 82 tests
- Disposable PostgreSQL schema/replay/publication harness: PASS, 1 test in 104.80 s
- Topology parity and duration probes: PASS, 2 files and 3 tests
- Retained corpus final revalidation: PASS, 1 test in 293.49 s

## Retained source database preservation

Database: `e152_storage_f80188cb590c46ea812eaea4909a6ce5`

The pre-audit and post-audit snapshots were identical:

```json
{"database_bytes":168391471,"tables":15,"days":21084,"generations":87,"inputs":44,"releases":8}
```

The retained immutable corpus checksum is also revalidated in `retained-clone-audit/final-revalidation.json` before the clone migration runs.

## Evidence files

- `schema-disposable/schema-result.json`
- `schema-disposable/schema-sql-log.json`
- `disposable-supplemental/topology-parity-result.json`
- `disposable-supplemental/duration-probe.json`
- `disposable-supplemental/g2-duration-probe.json`
- `retained-clone-audit/final-revalidation.json`
