# Epic 15 architecture update — rubric and input reconciliation

**Verdict: PASS WITH ONE MEDIUM CORRECTION.** E15-AD-01/02 now fixes the
Epic-15-level divergences: supported-model versus physical-light semantics,
transition detector limits, complete actual-year publication, replay,
representation, bounded generation, compatible rollback, capacity admission,
and the independent weather/launch boundaries. The September 15 consolidation
preserves the September 10/12/14 history rather than rewriting historical
pending statements or accepted detector risk.

## Medium finding

### M1 — Retain an enforceable scheduled coverage-reporting rule

**Source:** PRD NFR35 and epics NFR35 amendment require scheduled reporting of
venue-by-date completeness across the selectable window, including continuous
midnight rollover. E15-AD-01 retains typed 503s and validates a release at
publication, but its Lifecycle 5/6 rules do not explicitly bind ongoing
coverage reporting after routine nightly geometry generation is retired. A
builder could therefore keep correct immutable releases while dropping the
operational reporting/rollover check that the NFR keeps.

**Correction:** Add to E15-AD-01 Lifecycle 5 or 6 that scheduled coverage
reporting remains an availability operation: it must check the current release
for every selectable venue/date through midnight rollover, surface missing or
incompatible coverage as an observable failure, and must not recompute
geometry. Carry a corresponding 15.4/15.5 verification obligation. This does
not reopen the retired nightly geometry schedule.

## Reconciliation results

| Controlling input | Result in E15-AD-01/02 |
| --- | --- |
| PRD NFR20 | Complete March–October seasonal materialization, exact supported-horizon boundaries, independent of hours/picker, and no unchanged-season computation are explicit. |
| PRD NFR35 | Exact-date/current-input/version/checksum-compatible atomic releases, staged-versus-committed input behavior, fail-closed reads, and deterministic below-horizon coverage are explicit. M1 is the only unlanded operational-reporting clause. |
| PRD NFR40 | Shards, leases, idempotence, measured limits, relation/index accounting, retention, compatible rollback, and independent weather gates are explicit. |
| Epics Epic 15 and dependencies | The documented sequence is preserved: 15.1 is done; 15.2–15.6 remain backlog. 15.5 I13 and 15.6 O02 retain A1’s unpassed cold/no-op/writer-load proof; Epic 13 cold/recovery and Epic 14 weather/field gates remain independent. |
| Readiness addendum | Its original open-lock findings remain historical; the September 15 addendum correctly records G1a–G1d as accepted, capacity as held, and later-story/production gates as unpassed. |
| Test design and CD15.1-v1/A1 | The accepted 5°/UTC-root/detector/window contract, Float64/raw-boundary representation, actual-year completeness, budget table, retention, A1 carry-forward, and four-minute missed-gap diagnostic all land without claiming universal discovery, physical accuracy, or deployed compliance. |
| Direct-sun/weather decision and accuracy/production findings | The model-qualified negative is distinguished from physical absence, while geometry remains separate from fresh coherent `likely` weather, snapshot-only reads, and the existing weather reliability/field-validation gates. |

## Good-spine checklist

- **Real divergence points:** covered by the two stable existing AD IDs; no new
  decision identifier is needed.
- **Enforceable rules:** lifecycle rules bind hashes, manifests, publication,
  representation, limits, failure handling and rollback. M1 should make the
  remaining coverage-monitor operation equally explicit.
- **Deferred/open work:** candidate proof is named and assigned, rather than
  silently deferred: capacity admission, actual-year retention diversity,
  M06 cold/combined/no-op/writer evidence, implemented full-cohort throughput,
  caster spatial resolution, rollback, Epic 13 and Epic 14 gates.
- **Brownfield and inherited constraints:** preserves existing public 61-step
  projection, exact-date reads, typed coverage 503, service-role boundary,
  zero request-path geometry and zero live Met.no behavior; no technology or
  runtime upgrade is introduced.
- **Operational envelope:** bounded worker/shard/lease/retry behavior, storage
  admission, validation, publication, retention and rollback are decided;
  production rollout remains gated. M1 is the sole reporting-operation gap.

No critical finding: the consolidation does not weaken acceptance history,
claim that below 5° proves darkness, treat the known missed gap as a pass,
reduce retention to solve capacity, certify deployment, or start Story 15.2.
