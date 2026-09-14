# Epic 15 measurement closure acceptance — September 14, 2026

**Status: ACCEPTED by Rasmus. Combined G1 measurement decision lock is satisfied under amendment A1.** This is acceptance of CD15.1-v1, not deployed compliance, a done transition, or authorization to start Story 15.2.

## Approval and exact artifact

The assistant asked: “Do you approve CD15.1-v1’s encoding, retention and numerical budgets, including amendment A1 moving the explicitly unpassed cold-read, load and representative-retention measurements to mandatory candidate-validation gates before publication?” Rasmus replied **“Yes”** on September 14, 2026.

Accepted package: [CLOSURE-DECISION-2026-09-14-v1.md](../../test-artifacts/measurements/epic-15/story-15-1/CLOSURE-DECISION-2026-09-14-v1.md), SHA256 `8135743c74d8777f4e6e3d3bfdc00c88508c390596b6e0a2b9d62571627a657e`. That artifact remains unchanged as the submitted decision text. This acceptance record supersedes its pending disposition and the earlier pending G1d wording in living documents. Historical measurement/review outcomes remain unchanged.

G1a/G1b/G1c retain their September 10/12 accepted horizon, reconstructed-window, detector-risk, weather and actual-year completeness policies. They were not reopened. The measured conclusions, limitations, G1d numerical table, retention model and A1 in the identified package are accepted in full.

## G1d selection

- Full Float64 adaptive exposure/offset arrays, retaining every computed point and raw interval boundary without integer rounding; half-millisecond boundary midpoint values survive. Share immutable versioned inputs and bind date, checksum, engine/horizon/detector/decoder identity. Derive public qualifying windows separately; reject malformed/nonfinite/unsupported representations.
- Retain current plus one verified compatible rollback generation for each retained season, current and immediately previous actual-year seasons, and every evidence/feedback-referenced generation. Count distinct physical generations once; unchanged manifests may share them. Four full season-equivalent copies is the conservative rebuild model; staging adds a fifth. No deletion is authorized.
- Numerical pilot budgets are the complete “Numerical budgets proposed for G1d” table in the accepted package, now accepted as **targets and safety/admission limits, not measured production compliance**. They include initial/all-invalidation 120 active wall /100 Node CPU minutes for 42×245 dates; venue-season 180/150 seconds; repair 15/10 seconds; one worker and ≤5×3 shards with 60s ceiling/45s admission cutoff; 120s lease/15s heartbeat; ≤3 attempts and ≤60s backoff; 20,000 evaluations/day; 512MB worker RSS; 30MB season day relations and 5MB retained shared metadata; 375MB warning/400MB aggregate admission; p95 100ms batch query+decode, 5ms decode, 100ms no-op DB lookup; and ≤20% writer-load p95 increase under the specified matched 1/5-reader workload, with zero new errors/timeouts. Units, boundaries, exclusions, growth scaling and evidence limitations are exactly those in the package. Existing application NFRs continue to apply.
- **Capacity remains held.** Four-copy legacy coexistence exceeds the accepted 400MB ceiling even before auxiliary databases/protected growth. Fresh measured capacity, fewer actual distinct generations, separately authorized legacy retirement/migration, or separately approved capacity change must resolve admission. This approval does not authorize any of those operations or certify Free-plan feasibility.

## Accepted amendment A1 and enforceable destinations

The following original M06 requirements are deliberately moved out of Story 15.1's completion gate; their measurement status remains **NOT RUN**, not PASS:

| Requirement | Mandatory destination / block |
|---|---|
| Controlled cold query+decode, combined p95, no-op DB p95, matched generator-on/off read-load delta | Story 15.5 I13 before 15.6 O02. Isolated production-like PG/driver/schema; documented cache states; ≥20 valid observations per cohort; same validation and retained plans/buffers. Provider-classified public cold remains Epic 13/I13. |
| Actual current/previous-year geometry, retained input-version diversity, evidence references, staging/failed footprint and realistic churn | Story 15.2 storage validation and 15.5 I13, with fresh aggregate/disk/WAL capacity checks at O01/O02. Resolve the admission hold before generation. Same-value copies are not actual-year retention evidence. |

M05's bounded interpretation is also accepted: 20-repeat caster cells, one actual venue season, 161 bounded shards and weighted actual-date full-cohort extrapolations suffice for this measurement decision. Full-cohort end-to-end throughput and new/removed-caster spatial resolution belong to 15.3/15.5; full exact-year publication coverage remains required at O01/O02.

No detector accuracy bound, failed-computation handling, duration-uncertainty failure, full-season denominator, public parity, weather rule or release gate is waived. The amendment changes measurement timing only. The Architect/Test Architect owns the carried measurements; the candidate must fail its relevant gate if evidence or budget compliance is absent. No living document may treat approval of a target as measured compliance.

## Workflow disposition

Story 15.1 can pass its canonical review gate after documentation synchronization and normal verification. Human acceptance of the reviewed story remains separate; do not mark done here. Story 15.2 is not started and its backlog status is preserved. No fourth automatic review, runtime change, migration, dependency change, production write, resource launch, commit, push, merge or deployment is authorized by this record.
