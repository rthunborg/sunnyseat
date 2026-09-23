# Evidence review — Epic 15 architecture consolidation

- Date: 2026-09-15
- Lens: `bmad-architecture` reality/evidence review
- Scope: canonical `architecture.md` E15-AD-01/02 only; no runtime, production, or Story 15.1 review activity.

## Result: PASS — no evidence or architecture finding

The accepted closure package hash was recomputed as
`8135743c74d8777f4e6e3d3bfdc00c88508c390596b6e0a2b9d62571627a657e`.
Its acceptance record, the September 15 consolidation record, the retained
Story 15.1 evidence, the direct-sun/weather decision, the accuracy specification,
and the existing solar floor were compared with the canonical decisions.

## Verified invariants

- **Horizon and accuracy claim:** `architecture.md` Lifecycle 1–2 and
  E15-AD-02 retain the refraction-corrected `>=5°` supported-model horizon,
  `<=10s` UTC roots, the five-minute/5pp/one-minute detector, `<=100ms`
  brackets and the `<=2-minute` detected/matched-transition target. They
  correctly state that a below-5° result is a supported-model negative rather
  than evidence that physical direct sunlight is absent. The documented
  untriggered four-minute shade gap remains a limitation; finite agreement is
  not recast as universal detection or physical accuracy.
- **Weather separation:** clear-sky geometry, fresh coherent
  `directSunState === 'likely'`, the two-hour TTL, signed `±90-minute`
  provider match and snapshot-only public reads stay independent. This matches
  the retained direct-sun/weather contract; no geometry result is presented as
  a weather or physical-light conclusion.
- **Completeness and replay:** every non-deleted venue, including hidden and
  newly added venues, requires all 245 actual-year March–October dates before
  publication. Remaining dates are staging only. Counterfactual recomputation
  is distinguished from historical replay, which requires retained original
  geometry/input, weather and classifier evidence.
- **Encoding and budget semantics:** the Float64 arrays/raw-boundaries choice,
  observed 294-day relation totals (655,360 B arrays; 671,744 B JSONB;
  737,280 B bytes), and the full accepted numerical envelope match CD15.1-v1.
  Limits preserve their stated populations, units and exclusions: 42×245
  initial/invalidation, one-worker/5×3 shards, CPU excluding PostgreSQL and
  child-process CPU, decimal MB, and bounded query/decode scope. They are
  consistently labelled targets/safety limits, not deployed measurements or
  SLAs.
- **Capacity, retention and rollback:** current plus previous actual-year
  seasons, each with current and a compatible rollback generation, plus
  protected evidence generations, are retained while distinct physical
  generations are counted once. The 406.75/439.33 MB four-copy lower bounds
  remain an explicit admission hold; no retention reduction, deletion,
  migration, upgrade, or Free-plan feasibility conclusion is introduced.
  Rollback remains version/input compatible and atomic.
- **Unpassed A1 gates:** controlled cold/combined reads, no-op DB p95 and
  writer-load proof remain NOT RUN at 15.5 I13 before 15.6 O02. Actual-year
  retained diversity/churn and fresh aggregate/disk/WAL capacity proof remain
  assigned to 15.2/15.5 and O01/O02. The architecture does not relabel either
  as passed.

## Code reality check

`nextjs-app/lib/solar/shadow-geometry.ts` retains
`MIN_RELIABLE_ELEVATION = 5.0`; the existing service handles elevations below
that floor separately. The architecture marks seasonal runtime as unimplemented
and introduces no dependency/version upgrade, so it does not claim that this
future seasonal contract is already deployed.

## Review boundaries

No benchmark, Story 15.1 review gate, application test, production action, or
runtime change was run. Existing protected work was not modified.
