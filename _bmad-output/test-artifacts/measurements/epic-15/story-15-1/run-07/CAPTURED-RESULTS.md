# Captured-input measurement supplement — Story 15.1

Production capture: 2026-09-10T19:36:11.649287+00:00; census: 2026-09-10T19:34:53.111077+00:00. These are separate read-only snapshots. Replay started 2026-09-11T11:13:07.895Z.

42 venues, 1566 distinct resolved casters, 4278 memberships. Existing production database: 306498707 B. Existing geometry-series relation: 161595392 B, including TOAST/index overhead. This is the actual current baseline, not the proposed schema.

## Bounded computation and detection

All venues were recomputed for September 22 at a 15-minute grid with exact 5-degree support edges, five observations plus one warmup. Sum of per-venue median daily wall times: 11061.5 ms. This sum is a derived summary, not a timed batch or season projection. Timings are on a shared Windows host; validation activity overlapped part of the run.

Three transition-bearing venues selected by low/median/high caster count, each with a clipped 30-minute window. Reference: independent uniform 250ms samples (detected-boundary uncertainty 125ms). Candidate: grid plus detected-crossing bisection to 100ms brackets. Five observations; no p95 estimate.

| Venue | Cadence s | Samples | Median wall ms | Raw topology matches | Max matched error ms | Duration resolved |
|---|---:|---:|---:|---|---:|---|
| 34 | 60 | 40 | 136.1 | true | 106.0 | true |
| 34 | 10 | 177 | 778.8 | true | 117.0 | true |
| 34 | 5 | 345 | 1301.2 | true | 117.0 | true |
| 34 | 1 | 1693 | 5769.9 | true | 93.5 | true |
| 8 | 60 | 42 | 216.0 | true | 130.0 | true |
| 8 | 10 | 188 | 921.7 | true | 101.0 | true |
| 8 | 5 | 367 | 2420.8 | true | 101.0 | true |
| 8 | 1 | 1805 | 13301.6 | true | 93.5 | true |
| 47 | 60 | 42 | 488.0 | true | 110.5 | true |
| 47 | 10 | 188 | 2002.9 | true | 101.0 | true |
| 47 | 5 | 367 | 3821.9 | true | 101.0 | true |
| 47 | 1 | 1805 | 14069.5 | true | 93.5 | true |

Neither reference nor candidate proves absence of sub-grid shade gaps. Clipped endpoints are window boundaries, not proven full sun-window starts/ends; duration filtering is diagnostic only. The analytic unit tests retain a missed-gap counterexample at every cadence, including 1s. No candidate is accepted for production.

## Local retained-storage replay

Same 42 measured day rows per encoding, copied into five simulated retention roles, then recomputed +2m seating edits retained as a sixth generation. Previous-season copies were not recalculated for another year.

| Encoding | Clean total relations B | After edits total relations B |
|---|---:|---:|
| jsonb | 1720320 | 3219456 |
| arrays | 1744896 | 3276800 |
| bytes | 1728512 | 3252224 |

Whole isolated database after edits: 18117423 B; includes all three encodings and its own catalog baseline. Do not add it to production or treat it as the size of one design.

Write phases (including WAL):

```json
[
  {
    "phase": "noop-updates",
    "kind": "all",
    "wallMs": 270.116399999999,
    "walBytes": 523144,
    "n": 1,
    "p95": null,
    "scope": "Includes docker/psql transport; WAL is isolated-cluster LSN difference, not attributed production WAL."
  },
  {
    "phase": "changed-input-generation",
    "kind": "jsonb",
    "wallMs": 479.41179999999804,
    "walBytes": 1581480,
    "n": 1,
    "p95": null,
    "scope": "Includes docker/psql transport; WAL is isolated-cluster LSN difference, not attributed production WAL."
  },
  {
    "phase": "changed-input-generation",
    "kind": "arrays",
    "wallMs": 489.58740000000034,
    "walBytes": 1581152,
    "n": 1,
    "p95": null,
    "scope": "Includes docker/psql transport; WAL is isolated-cluster LSN difference, not attributed production WAL."
  },
  {
    "phase": "changed-input-generation",
    "kind": "bytes",
    "wallMs": 473.03499999999985,
    "walBytes": 1589632,
    "n": 1,
    "p95": null,
    "scope": "Includes docker/psql transport; WAL is isolated-cluster LSN difference, not attributed production WAL."
  }
]
```

Controlled SQL selection and warm read observations are retained in sql-04. Host latency includes Docker/psql startup and text transport. Local PostgreSQL 15 differs from production PostgreSQL 17/aarch64. Retained copies and edit frequency are experimental assumptions. The legacy SQL summary's synthetic/no-production-baseline labels describe that isolated lane; the separately captured census supplies an actual baseline here.

## Recommendation and remaining acceptance

Keep the accepted 5-degree convention, 300-second continuous eligibility and full actual-year March–October completeness. Arrays remain provisional. Use 1s sampling only as an offline diagnostic reference candidate, not a correctness guarantee or approved production cadence. A bounded method must certify no intervening shade (or conservatively mark intervals unresolved); point sampling alone cannot satisfy the no-gap requirement.

Numerical production CPU/storage/read budgets remain unapproved. This one-date replay cannot establish full-season adaptive costs, concurrency, retained seasonal growth, cold-cache behavior or available disk/plan headroom. Next evidence must measure those against a selected detection method. No production writes or application changes. Story 15.1 remains in-progress; 15.2 remains blocked.

