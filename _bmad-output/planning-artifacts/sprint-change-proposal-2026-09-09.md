# Sprint Change Proposal — Season-wide clear-sky geometry precomputation

**Date:** 2026-09-09 (Europe/Stockholm)  
**Project:** SunnySeat  
**Workflow:** BMAD Correct Course  
**Status:** Approved for planning handoff by Rasmus on 2026-09-10; implementation and production gates remain  
**Change classification:** Major technical change; product MVP intent unchanged  
**Recommended path:** Direct adjustment through a new implementation epic plus dated, superseding PRD/architecture amendments

## 1. Issue summary

SunnySeat already separates deterministic clear-sky sun/building-shadow geometry from independently refreshed Met.no weather snapshots. Public venue reads use persisted geometry and persisted weather and make no live Met.no calls. However, geometry persistence is still designed as a rolling window: Stockholm today through `today + PLANNER_MAX_FUTURE_DAYS + 1`, currently five dates, with 61 fixed 15-minute steps from 06:00 through 21:00. A scheduled geometry run therefore keeps repopulating predictable results even when no seating, elevation, caster, or algorithm input changed.

This creates an avoidable operational dependency on nightly geometry delivery. The September 2026 production evidence also shows that scheduled-delivery reliability is not theoretical: weather schedules have exceeded the two-hour TTL and recent scheduled runs failed before refresh. Seasonal geometry materialization can remove most routine geometry scheduling, but it cannot and must not be represented as fixing weather delivery. Weather remains independently refreshed, subject to the existing two-hour TTL and signed 90-minute provider-valid-time match.

The trigger is a technical/operational limitation discovered after Story 12.3 and during Epic 13/14 launch-readiness work. It does not invalidate the MVP or require rollback. It requires a new persistence/publication design because merely extending the existing rolling job would retain fixed-clock coverage, duplicate large input payloads per day, promote venues independently during a cohort run, and continue to bind geometry storage to the UI planner window.

### Verified current architecture

- Product season is currently March 1 through October 31 of the Stockholm calendar year (`sunSeasonBounds`), while the client planner selects only today through today+3 and only 06:00–21:00 at 15-minute increments.
- The geometry runner covers today through today+4, all non-deleted venues including hidden venues. At 42 venues, one complete run is 210 venue-days and 12,810 shadow-series points.
- `venue_sun_geometry_series` stores one JSONB array per `(venue_id, stockholm_date, geometry_input_hash)`. The database validator requires exactly 61 objects, and `input_payload` is duplicated on each day row.
- Clear-sky geometry is generated independently of weather. Weather refresh writes separate coordinate/date snapshots; public reads join the two and classify `likely | blocked | unknown` at read time.
- Missing/wrong-date/wrong-hash geometry is a typed, observable `503 SUN_GEOMETRY_COVERAGE_MISSING`; no request-path shadow fallback exists.
- A database lease and GitHub concurrency prevent overlapping geometry runs. Publication is atomic for one venue's supplied date window, but a failed multi-venue run can leave a mixed cohort of newly and previously published venue generations.
- The canonical `g1` hash includes the normalized seating polygon, centroid, seating and ground elevations, resolved caster rows, and the planner contract. Display-only `display_lat`/`display_lng` is correctly excluded. The implementation relies on the manually maintained `g1` contract to represent solar/shadow algorithm constants and library behavior rather than naming those dependencies explicitly.
- Solar visibility currently means refraction-corrected solar-centre elevation `> 0°`. The shadow engine does no caster projection below its `5°` reliable-elevation floor and returns a 25% low-confidence placeholder there. Consequently the current public predicate cannot be affirmative below 5°, but stored geometry does not explicitly describe that as a model-support boundary.
- The current caster hash RPC is aligned to the eligible runtime caster set and includes geometry, height and elevation fields. Conservative all-venue invalidation remains necessary when an import's affected venue set cannot be proven.
- The active workflow contains independent geometry schedules (daily) and weather schedules (nominally every five minutes). Recent production evidence proves successful manual weather refresh and snapshot-only reads, but not reliable scheduled five-minute delivery.

## 2. Change-navigation checklist

| Checklist area | Status | Finding |
| --- | --- | --- |
| 1.1 Triggering work | [x] | Story 12.3 established rolling persisted geometry; Epic 13 and Epic 14 exposed the operational and correctness boundaries. |
| 1.2 Core problem | [x] | Predictable geometry is repeatedly recomputed and depends on nightly rolling-window delivery even when inputs are unchanged. |
| 1.3 Evidence | [x] | Fixed five-date/61-step code and schema, nightly workflow, production scheduling gaps, and current hash/publication contracts inspected. |
| 2.1 Current epic impact | [x] | Epic 13 remains valid and weather scheduling remains separate. Its public 61-step response assertion can remain unchanged. |
| 2.2 Epic-level change | [x] | Epic 15 approved and added; 14.3/14.5/14.6 cross-linked without rewriting historical intent. |
| 2.3 Remaining epics | [x] | Epic 14 gains a dependency on generation/version evidence but no weather-threshold or field-validation scope change. |
| 2.4 Obsolete/new epics | [x] | No epic is obsolete; one new technical epic is needed. Epic 12 stays closed. |
| 2.5 Order/priority | [x] | Measurement precedes design lock, generator, compatibility reads, verification and rollout; launch evidence uses the final generation. |
| 3.1 PRD | [x] | NFR20/NFR35 amended; NFR40 added. MVP scope unchanged. |
| 3.2 Architecture | [x] | Dated E15-AD-01/02 added; supersession is limited to rolling storage/hash/schedule requirements. |
| 3.3 UX | [x] | No visual or interaction change is required. Preserve the 06:00–21:00, 15-minute public planner and existing Swedish uncertainty/error behavior. |
| 3.4 Other artifacts | [x] | Operational and launch planning notes added; schema, runner, workflow and test implementation remains Epic 15 backlog. |
| 4.1 Direct adjustment | Viable | New epic and additive/superseding architecture delta; medium/high effort, medium risk. |
| 4.2 Rollback | Not viable | Rolling persistence is already the safe availability boundary; reverting would restore cold request geometry. |
| 4.3 MVP review | Not needed | The change improves operations and preserves product scope and API behavior. |
| 4.4 Selected path | [x] | Direct adjustment with shadow publication, staged rollout, and explicit approval gates. |
| 5.1–5.5 Proposal components | [x] | Included below. |
| 6.1–6.2 Final review | [x] | Proposal checked against repository code, planning artifacts, recent production findings, and binding invariants. |
| 6.3 Owner approval | [x] | Rasmus approved the proposal on 2026-09-10, retaining its measurement and separate production gates. |
| 6.4 Sprint status mutation | [x] | Epic 15 and six stories added as backlog after approval; no existing story status changed. |
| 6.5 Handoff | [x] | Major-change PM/architect handoff recorded in Section 10; first execution item is Story 15.1. |

## 3. Recommended approach

Adopt **versioned, season-wide, daylight-aware clear-sky geometry generations**. Generate one supported March–October season at a time, store compact per-venue/day exposure samples, and publish only a complete compatible release manifest. Recompute only affected venue generations when an input changes. Continue applying weather exclusively at read time.

### 3.1 Coverage and time rules

1. **Supported product season:** retain March 1–October 31, keyed by explicit `season_year` and `Europe/Stockholm`. Do not infer the next supported season from wall-clock year during November/December; generation commands take an explicit season ID/year.
2. **Public operating window:** retain the existing 06:00–21:00 and 15-minute UI/API series. This proposal does not expand or shrink the picker.
3. **Computation window:** calculate model-supported daylight for each venue/date independently of opening hours and the UI window. Opening hours never affect geometry generation.
4. **Two explicit solar boundaries:**
   - Astronomical visibility remains the current model's refraction-corrected solar-centre elevation `> 0°`; twilight/diffuse light at or below that boundary is never direct sun.
   - The recommended **supported direct-sun geometry horizon is refraction-corrected elevation `>= 5°`**, matching the existing shadow engine's reliable-elevation floor and its current inability to produce an affirmative result below 5°. From `0°` to `<5°`, record deterministic no-direct-sun for the supported model, not missing geometry or unknown weather. This is a model-support convention, not a claim that the physical sun is below the astronomical horizon.
5. Find the daily 5° rising/setting crossings from UTC instants using the solar-position function and bisection to at most 10 seconds. Store the exact UTC boundary instants. Do not round inward to quarter-hours. Quarter-hour samples are anchored to Stockholm wall-clock time, but the exact first/last boundary records preserve the edge intervals.
6. Venue seating/ground elevation continues to affect effective caster height, not solar event time. The current solar model has no terrain skyline or observer-elevation horizon. This limitation must be named in the generation metadata and field-validation plan.
7. DST conversion occurs only through `Europe/Stockholm` zoned instants. Tests cover the 2026 spring transition (March 29), autumn transition (October 25), and season/date keys without assuming 24 equal local-clock hours.

### 3.2 Resolution and transition accuracy

The existing 15-minute series is compatible with the planner but is not sufficient to bound a live "right now" shadow transition: nearest-step selection can be wrong around a sharp 50% crossing, and a quarter-hour interval can conceal a short sun/shade run.

Recommended sampling:

- Retain every 15-minute daylight sample for parity and API projection.
- Add adaptive samples within an interval when endpoint exposure straddles 50%, changes by at least 10 percentage points, or field validation identifies a sensitive edge. Recursively refine until the transition-time uncertainty is at most 2 minutes or a documented safety limit is reached.
- Store aligned minute/second offsets and integer exposure values, not shadow polygons. Public 15-minute DTOs remain value-compatible; live selected-instant lookup may use the refined samples after parity/shadow-mode rollout proves it safer.
- Do not claim that two-minute temporal resolution equals physical accuracy. The 200 m shadow cap, 5° floor, caster quality, vegetation/awnings and polygon accuracy remain limiting factors.

The two-minute/10-point refinement thresholds and the 5° supported horizon require owner approval. Before locking them, a measurement story must report added compute/storage cost and transition parity on representative venues.

### 3.3 Proposed data model and lifecycle

Use a new versioned schema rather than stretching the fixed-shape Story 12.3 table in place:

- `sun_geometry_seasons`: season ID/year, Stockholm dates, timezone, horizon convention/version, base step, transition-refinement policy, engine/hash/storage format versions, status, expected counts, timestamps, checksum and release notes.
- `sun_geometry_venue_generations`: immutable generation ID, season ID, venue ID, `geometry_input_hash`, status (`building | ready | retired | failed`), expected/completed day and sample counts, source input reference, run ID, timestamps and checksum. Unique ready generation per `(season, venue, hash, format_version)`.
- `sun_geometry_days`: generation ID, Stockholm date, exact rising/setting supported-horizon UTC instants, aligned compact offset array plus exposure array (or a byte encoding selected only after SQL/TypeScript benchmark), sample count and checksum. Primary key `(generation_id, stockholm_date)`; index only the current read path.
- `sun_geometry_releases`: immutable season release manifest mapping each in-scope venue to a ready generation, with status (`building | verified | current | retired`), compatibility versions, expected/completed venue/day counts and checksum.
- One small current-release pointer per season. A transaction flips it only after every referenced venue generation is ready, internally complete, checksum-valid and version-compatible.

Do not duplicate the caster/input payload on every venue-day. Keep the canonical input once on the venue generation (or in a content-addressed input table), with compact per-day values only. Do not persist intermediate or unioned shadow polygons.

At read time, the server resolves the current season release and venue generation, reads the exact date, validates checksum/shape/version, deterministically fills public 06:00–21:00 points below the supported horizon with zero, and applies the current weather snapshot. Missing season/date/hash/release coverage remains an observable typed 503. Weather missing/stale/malformed/unmatched remains `unknown`, not a geometry coverage error.

### 3.4 Input hashing and invalidation

Introduce `g2`, retaining `g1` for historical feedback attribution. `g2` must include or bind through an immutable engine manifest:

- canonical seating polygon and derived canonical engine coordinate;
- seating elevation and venue ground elevation;
- resolved eligible caster IDs, canonical 2D geometry, effective height inputs, ground/roof elevation and import generation;
- every field that changes caster eligibility or exposure math;
- solar-position/refraction algorithm version;
- shadow algorithm version and constants, including search/shadow distance, minimum meaningful height and supported direct-sun horizon;
- canonicalization version, base sampling interval, transition-refinement policy and storage decoder version;
- dependency versions where a library upgrade can change numeric geometry results (notably Turf).

The season dates and timezone policy belong to the generation/release contract. UI opening hours, planner date-window length, venue name/tags/photos/hours, weather, and display-only pin coordinates do not affect the geometry hash.

Invalidation rules:

- Seating polygon, seating elevation, ground elevation, canonical engine-coordinate derivation, relevant caster geometry/height/elevation/eligibility, algorithm/constants or numeric-geometry dependency changes create a new affected generation.
- A display-only pin move does not invalidate geometry or weather coordinates.
- A new venue generates all remaining supported season dates (and the full next season when preparing rollover) before it enters the current release.
- A mid-season venue edit stages the data, computes and verifies a full season generation for reproducibility, then publishes a new release manifest. An optional optimization may compute only remaining dates, but historical feedback replay then requires retaining the old generation and explicit effective-date semantics; full-season regeneration is the safer default at 42–50 venues.
- Caster import tooling computes affected venues spatially using the same runtime search radius. If that proof is unavailable or the engine/selection algorithm changes, invalidate all venues.
- Season rollover is explicit: build next year's March–October release ahead of activation, verify it, and switch the season pointer only when the product begins serving that season. Retain at least the current and immediately previous season plus any generation referenced by retained feedback evidence.

### 3.5 Safe generation and publication

- Plan work as bounded `(season, venue batch, date range)` shards with deterministic keys. Default shard: 5 venues × 14 dates, adjusted after benchmark.
- Each shard is idempotent, upserts only immutable/non-current build rows, heartbeats its lease, records counts/checksums and can resume from verified completed days.
- Use database leases and workflow concurrency, but do not use one global lease that prevents an urgent single-venue repair from being queued. Serialize publication, not all computation; prevent two builders for the same venue/season/hash.
- A failed/expired run never changes the current release pointer. Resume missing shards or abandon the build. The previously current release stays readable.
- Completeness checks cover exact season dates, every non-deleted venue including hidden venues, horizon metadata, required samples, monotonic offsets, 0–100 exposure, per-day checksum, generation checksum and compatible versions.
- Publication creates a verified immutable release manifest, rechecks it inside the pointer-flip transaction, then atomically makes it current. No partially written cohort becomes current.
- Rollback is an atomic pointer flip to the last retained verified compatible release. Retain two verified release manifests and their generations at minimum; prune only unreferenced generations after feedback/evidence retention checks.
- If valid current coverage is missing, fail closed with the existing typed 503 behavior. If inputs changed and a new generation is building, the old generation remains current only when the input change itself is still staged. An out-of-band committed input change marks the venue dirty and makes reads fail closed until a matching generation is published.

### 3.6 Weather integration remains separate

This change removes:

- nightly/twice-nightly rolling geometry computation in steady state;
- Stockholm-midnight geometry lookahead dependency;
- repeated full geometry work when no input changed.

It does not remove:

- frequent Locationforecast/Nowcast refresh;
- weather snapshot storage, the two-hour TTL, or signed 90-minute matching;
- monitoring and recovery for weather scheduler gaps;
- snapshot-only public reads and the zero-live-Met.no invariant;
- weather classification/calibration work in Epic 14.

Clear-sky geometry never contains cloud, fog, precipitation, weather status, localized copy or a public verdict. Public affirmative direct sun continues to require geometry above 50% and coherent `directSunState === 'likely'`.

## 4. Quantified trade-offs

### 4.1 Date-dependent work estimate

For the existing 2026 March 1–October 31 season at Gothenburg's canonical coordinate, repository solar code gives 245 dates. Counting Stockholm quarter-hour samples only while refraction-corrected elevation is at least 5°, plus two exact boundary records per date, yields approximately:

| Venue count | Base samples for one season | Notes |
| ---: | ---: | --- |
| 42 current | 553,812 | Before adaptive transition refinement |
| 50 launch | 659,300 | Before adaptive refinement |
| 100 | 1,318,600 | Linear if caster complexity is unchanged |
| 500 | 6,593,000 | Requires parallel shards and storage measurement |

For comparison, a fixed 61-point full season would be 14,945 samples per venue. Daylight-aware 5° coverage plus exact boundaries is about 13,186 per venue, but its main correctness benefit is not the roughly 12% sample reduction: it computes the actual varying daylight interval, preserves exact edges, and does not misclassify skipped night as missing coverage. The 0° astronomical interval would contain more samples and includes the current engine's unsupported 0–5° range.

The repository contains no accepted production measurement of milliseconds per shadow sample or full geometry-run duration. Therefore an honest initial-duration estimate must be scenario-based until Story 1 benchmarks the real caster distribution:

| Effective shadow-sample cost | 42 venues, base season | 50 venues, base season |
| ---: | ---: | ---: |
| 5 ms | ~46 min | ~55 min |
| 20 ms | ~3.1 h | ~3.7 h |
| 50 ms | ~7.7 h | ~9.2 h |

Add an initial planning allowance of 10–30% for adaptive samples and 15–25% for serialization, checks and retry headroom until measured. The existing 30-minute workflow timeout is not an acceptable full-season assumption. Bounded resumable shards are required even if the fast case is observed.

An incremental single-venue full-season rebuild is approximately 13,186 base samples: ~66 seconds at 5 ms/sample, ~4.4 minutes at 20 ms/sample, or ~11 minutes at 50 ms/sample, before refinement and publication overhead. A one-day repair averages about 54 base records per venue.

### 4.2 Database storage estimate

Earlier “tiny values” estimates were raw-value counts, not database-size estimates. Actual size includes row headers, arrays/JSON encoding, indexes, generation/release metadata, checksums, retained versions, TOAST behavior and the canonical input payload.

Planning ranges for the proposed compact aligned-offset/exposure representation are:

| Scale | One ready season generation set | Two retained compatible sets |
| --- | ---: | ---: |
| 42 venues / 10,290 venue-days | ~4–10 MB | ~8–20 MB |
| 50 venues / 12,250 venue-days | ~5–12 MB | ~10–24 MB |
| 100 venues | ~10–24 MB | ~20–48 MB |
| 500 venues | ~50–120 MB | ~100–240 MB |

These ranges assume roughly 0.35–0.8 KB per compact day including row/index share, plus generation/input metadata, and modest adaptive refinement. They exclude unrelated database tables and backups. JSONB objects at every sample can be several times larger. Repeating the full caster/input payload on every day can dominate all exposure values and is explicitly rejected.

Before migration approval, measure representative `pg_column_size`, index size and `pg_total_relation_size` for 42/50 venues with real caster payloads and two retained generations. Storage acceptance is based on measured total relation size, not extrapolated payload bytes.

### 4.3 Alternatives considered

| Alternative | Benefit | Cost/risk | Disposition |
| --- | --- | --- | --- |
| Keep rolling five-day geometry | No migration; small active dataset | Nightly dependency and repeated deterministic CPU remain | Reject as steady state; retain as rollback during rollout |
| Extend current JSONB table to 245 fixed days | Small code delta | Fixed clock range, duplicated payloads, weak cohort publication, larger rows | Reject |
| Precompute a full season once as 61 fixed points/day | Predictable shape and simple reads | Ignores true daylight edges and keeps UI/storage coupled | Reject |
| Monthly staged materialization | Fits bounded jobs and can deliver near-term months first | Requires manifest/completeness semantics anyway | Adopt as build strategy, not final data model |
| Store every shadow polygon | Enables visual replay | Very large, expensive, unnecessary for public contract | Reject |
| Compute exact geometry on every current request | Best temporal precision | Reintroduces cold latency/CPU and request availability risk | Reject |
| 15-minute base plus adaptive transitions | Preserves compatibility and improves boundary accuracy compactly | More implementation/testing complexity | Recommend, subject to benchmark and owner thresholds |

## 5. Artifact and backlog impact

### 5.1 PRD amendments (exact proposal)

**PRD `NFR20` — replace current rolling-window text**

OLD:

> Persist ungated sun geometry for every venue and date in the selectable planner window so high-traffic and cold requests do not recompute the full venue × day-series geometry path. Coverage rolls continuously across Stockholm midnight so the complete selectable window is available before the new day begins.

NEW:

> Persist versioned ungated clear-sky geometry for every non-deleted venue across the explicitly supported March–October season. Compute date-dependent model-supported daylight independently of UI opening hours and planner limits, preserve exact supported-horizon boundary instants, and project the existing 06:00–21:00 15-minute public series from the seasonal artifact. Routine reads and unchanged seasons do not recompute shadow geometry; changed inputs publish a complete compatible generation before becoming current.

**PRD `NFR35` — append:**

> A season release is current only when every referenced venue generation has exact date coverage, a matching current input hash, compatible engine/horizon/storage versions and verified checksums. Partial builds never become current. Staged edits keep the last complete generation current; committed out-of-band input changes remain fail-closed until recomputed. Legitimate below-horizon no-direct-sun intervals are deterministic coverage, not missing coverage or weather staleness.

**Add `NFR40 — Seasonal geometry lifecycle`:**

> Seasonal geometry generation is bounded, resumable, idempotent and rollback-capable. It records measured compute time, total database relation/index size, expected/completed counts and retained versions. At least one previous verified compatible release is retained. Weather refresh, freshness and scheduler reliability remain independent launch gates.

No FR, UI, monetization, accessibility or performance-budget change is proposed.

### 5.2 Architecture amendments (exact proposal)

Append a dated section **“E15-AD-01 — Season-wide daylight-aware geometry generations”**. It explicitly supersedes only these E12 statements:

- E12-AD-02's requirement that persisted storage itself contain exactly 61 fixed planner entries;
- E12-AD-03's inclusion of UI planner range/max-future-days in the geometry hash;
- E12-AD-04's today-through-today+4 nightly coverage and midnight-roll dependency.

Retain E12's geometry/weather separation, service-role boundary, exact-date/hash reads, no request compute, fail-closed 503, leases, emergency switches and auditability. The new section incorporates Sections 3.1–3.6 of this proposal and names `g2` plus the release-manifest publication model.

Append **“E15-AD-02 — Supported direct-sun horizon and transition sampling”** with the approved horizon/refraction/elevation convention and measured adaptive-refinement thresholds. Do not silently edit the existing solar/shadow constants without this accepted decision.

### 5.3 Epics and stories

Add after Epic 14:

#### Epic 15 — Seasonal Clear-sky Geometry Materialization

Replace routine rolling-window shadow computation with versioned, daylight-aware seasonal generations while preserving snapshot-only weather gating, fail-closed correctness and the existing public planner/API contract.

1. **15.1 Measure daylight, transition accuracy, CPU and storage.** Produce representative winter/out-of-season, March, summer, transition-season and DST measurements; compare 15-minute results with 1-minute/exact engine evaluation around >50% crossings; benchmark real caster distributions and database encodings. Decision gate: approve horizon and refinement thresholds.
2. **15.2 Define `g2`, generation schema and migration/rollback contract.** Add engine manifest, season/generation/day/release tables, RLS/grants, validators, indexes and measured storage fixtures. No production mutation until reviewed migration and rollback evidence exist.
3. **15.3 Build resumable seasonal generator and invalidation planner.** Implement bounded idempotent shards, affected-venue calculation, new/mid-season/rollover flows, checksums, run records, recovery and retention.
4. **15.4 Add atomic release publication and compatibility reads.** Shadow-read new artifacts, preserve 61-step DTOs, keep weather separate, prevent partial publication and support pointer rollback.
5. **15.5 Prove parity, transition correctness and operational recovery.** Cover representative geometries, DST, exact daylight edges, hash invalidation, partial-run resume, corrupted/incompatible generation rejection, performance and relation-size limits.
6. **15.6 Staged production rollout and retire routine geometry schedule.** Build without publish, compare, canary selected venues, publish full release, observe, then disable routine rolling geometry only after acceptance. Weather schedule remains active and independently gated.

Cross-links:

- Epic 13 Story 13.1 keeps its public `42 venues × 61 ordered steps` correctness assertion because API projection remains unchanged. Add a note that internal storage shape is not inferred from the DTO and the public path may add only the bounded release/day read replacing the old batch RPC.
- Epic 14 Story 14.3 field validation records the seasonal `geometry_input_hash`/generation ID and adds low-angle/transition examples.
- Epic 14 Story 14.5 replay/champion design treats seasonal generations as the geometry layer and weather/classifier versions separately.
- Epic 14 Story 14.6 launch evidence must be attributable to the current seasonal generation and still verifies weather scheduling independently.
- Do not reopen Epic 12. Preserve Story 12.3 as historical evidence; the dated architecture delta is the controlling source for new work.

### 5.4 UX specification

No normative UX change. Add one implementation note under degradation patterns:

> Seasonal geometry generation changes storage and operations only. The public planner remains 06:00–21:00 at 15-minute steps. Deterministic below-supported-horizon intervals render the existing blocked-by-geometry state; missing/incompatible seasonal coverage uses the existing venue API failure/retry path. Weather unknown remains the existing neutral qualified-potential state.

No reference image or rebaseline is required unless implementation changes visible behavior.

### 5.5 Other artifacts after approval

- `project-context.md`: add the seasonal geometry facts, horizon convention, explicit season rollover, and unchanged weather contract.
- `docs/launch/launch-readiness-handoff-2026-08-24.md`: append a dated addendum linking the approved decision and keeping geometry rollout, weather scheduling and Epic 14 field correctness as distinct gates.
- `nextjs-app/docs/github-actions-scheduled-jobs.md`: replace steady-state rolling geometry instructions with build/invalidate/rollover/rollback operations; keep weather instructions separate.
- `nextjs-app/docs/venue-data-load.md`: require generation before a new/edited venue enters a current season release.
- Sprint status: only after approval, add Epic 15 and stories as backlog through the normal BMAD planning workflow. Do not direct-edit a story to `review`.
- Preserve this proposal as decision history. Once approved, architecture/PRD/epics/project context become the controlling sources; do not maintain a second live specification in this file.

## 6. Ordered implementation and verification plan

### Gate 0 — Approval and baselines

- Owner approves the horizon, transition tolerance, retention and rollout choices below.
- Run required typecheck/lint baseline from `nextjs-app/` before each story.
- Record branch/HEAD/dirty state and preserve unrelated work.

### Gate 1 — Measurement and decision lock

Acceptance:

- Report actual daylight boundaries/sample counts for at least March 1, March 29 DST, June 21, a September transition date, October 25 DST and October 31; include an out-of-season winter date without silently expanding the supported season.
- For representative open, courtyard, narrow-street, rooftop/elevated and irregular seating polygons, compare 15-minute samples with 1-minute or exact-engine evaluations around every >50% transition.
- Quantify false transition timing, additional adaptive samples, p50/p95 sample cost by caster count, full-season wall time and measured compact/JSONB relation size.
- No schema or production change until the owner accepts the final sampling/horizon decision.

### Gate 2 — Schema and generator correctness

Acceptance:

- Migration replay, RLS/force-RLS/grants, checksum validators, unique/current-pointer constraints and rollback SQL tests pass.
- `g2` golden vectors change for every geometry-affecting dependency and remain stable for ring/caster ordering; display pin, hours, tags, photos and weather do not change it.
- Shards resume after interruption without duplicates; expired leases recover; concurrent same-generation builders are rejected; unrelated venue generations can proceed safely.
- No build or failed release can become current.

### Gate 3 — Shadow mode and parity

Acceptance:

- Generate a complete candidate season without publishing it.
- Existing public 61-step results are identical at ordinary quarter-hour points unless a difference is an approved low-angle/transition correction.
- Every difference is attributed by venue/date/time/hash/reason and sampled near transition boundaries.
- Public route tests observe no live Met.no and no request-path shadow-caster/hash computation.
- Weather matrix, two-hour TTL, signed 90-minute match and affirmative predicate regressions remain green.

### Gate 4 — Canary publication

Acceptance:

- Publish a release containing a small representative canary venue set only in a non-production or explicitly approved canary lane.
- Verify exact-date reads, 61-step projection, selected-instant behavior, partial/corrupt release rejection and atomic rollback.
- Measure API p95 and Supabase call count against the current persisted batch path; do not regress the approximately five-second cold gate or warm <200 ms target.

### Gate 5 — Full release and schedule retirement

Acceptance:

- Candidate covers 100% of non-deleted venues, hidden and visible, for every supported season date and matching current input.
- Total relation/index size and wall time are within owner-approved measured budgets.
- Full release pointer flips atomically; rollback drill restores the preceding verified release.
- Monitor at least seven days or through one real input invalidation, whichever is later, with zero unexplained parity/coverage failures.
- Only then disable routine nightly geometry computation. Retain manual/invalidated/season-rollover generation and its emergency switch.
- Weather refresh remains enabled, monitored and separately unresolved until its own launch gate passes.

### Required test matrix

- Solar/date: winter control, March 1, spring DST, summer solstice, transition season, autumn DST, October 31; UTC/local round trips and exact boundary inclusion.
- Geometry: no casters, fully shaded, multiple overlapping casters, courtyard, narrow street, irregular/holed polygon, rooftop seating, terrain delta, caster exactly at radius/effective-height boundaries.
- Resolution: all >50% crossings, short sun windows, first/last supported daylight intervals, nearest-sample ties, adaptive recursion limit.
- Invalidation: seating ring reorder (no change), real polygon edit, seating/ground elevation, caster geometry/height/Z/eligibility/import, algorithm/constants/dependency version, display-only pin (no change), weather (no change).
- Publication: partial shard, retry, duplicate, expired lease, corrupt checksum, incompatible decoder, missing venue/date, new venue, mid-season edit, season rollover, rollback and retention protection for feedback-referenced hashes.
- Integration: snapshot-only list/detail, missing/stale/malformed/incomplete/unmatched/contradictory weather, `>50% && likely`, Swedish-first uncertainty, WCAG/reduced motion and unchanged JS budgets.

## 7. Rollout acceptance and rollback conditions

Approve publication only when:

- quarter-hour parity is 100% outside explicitly approved corrections;
- transition error meets the approved bound on all benchmark cases and representative field cases;
- complete-season/current-hash coverage is 100%;
- no partial/incompatible release is observable;
- measured compute and total storage are within approved budgets;
- public request latency/call count does not regress materially;
- all weather truth and provider-free invariants pass unchanged;
- rollback has been executed successfully against a candidate release.

Rollback immediately when any of the following occurs:

- an affirmative result differs without an approved and evidenced correction;
- current release references a missing/wrong-hash/incompatible day;
- 503 coverage rate increases above the pre-rollout baseline;
- read latency or Supabase load breaches the accepted budget;
- checksums/decoder disagreement, DST/date leakage, or publication atomicity failure is observed.

Rollback flips the current release pointer to the previous verified compatible manifest. It does not change weather data, thresholds, TTL, provider matching, venue inputs or production configuration beyond the explicitly approved geometry release seam.

## 8. Decisions presented for owner approval (2026-09-09 historical record)

1. **Supported model horizon:** approve 5° refraction-corrected solar-centre elevation as the deterministic public direct-sun computation floor, while retaining 0° as the astronomical visibility boundary. Alternative: compute 0–5° with a new long-shadow/terrain-horizon model before seasonal rollout.
2. **Transition refinement:** approve the proposed trigger (50% crossing or >=10 percentage-point endpoint change) and <=2-minute transition-time uncertainty, or select another measured tolerance after Gate 1.
3. **Season semantics:** confirm March 1–October 31 remains the supported product season and that November/December prepare an explicit next-year release without expanding public planner dates.
4. **Retention:** approve minimum current + previous verified season/release, with indefinite protection for generations referenced by retained feedback, or specify a longer operational retention period.
5. **Storage encoding:** authorize the implementation team to choose `smallint[]` versus versioned `bytea` only after measured readability/size/validation results. Recommended default is transparent arrays unless `bytea` saves materially more without weakening validation.
6. **Rollout observation period:** approve seven days or one real invalidation event (whichever is later) before retiring routine geometry schedules.
7. **Backlog placement:** approve new Epic 15 after Epic 14, rather than expanding Epic 14 or reopening Epic 12.

## 9. Handoff after approval

This is a **major technical course correction** because it introduces a new generation/release persistence model and supersedes accepted rolling-coverage architecture. It does not change the customer-facing MVP.

- Product Owner / PM: approve season scope, backlog placement and launch-gate wording.
- Solution Architect: finalize E15-AD-01/02, `g2`, schema/publication/read compatibility and rollback design.
- Test Architect: own transition-parity, DST, invalidation, recovery, storage/performance and launch traceability gates.
- Developer: implement only approved stories in order, preserving API/weather/component boundaries.
- Maintainer: approve production migration, candidate publication, rollback drill and eventual retirement of routine geometry schedules separately.

No implementation, production mutation, configuration change, commit, merge or deployment is authorized by this planning session. Owner approval for the planning handoff was received on 2026-09-10; measurement and production checkpoints remain mandatory.

## 10. Approval disposition and workflow execution log — 2026-09-10

Rasmus responded **“Approve”** to the completed proposal. The seven recommended directions in Section 8 are accepted for planning, including the explicitly conditional sampling/horizon measurement gate. This does not waive Gate 1's owner acceptance of measured horizon/refinement results, authorize application implementation in this session, or authorize production operations.

The canonical requirements now live in [PRD](prd.md), [architecture](architecture.md) E15-AD-01/02, [Epic 15](epics.md), and [project context](../../project-context.md). Sections 1–9 remain proposal/evidence history, not a competing living specification. Architecture and Story 15.1 explicitly retain the unresolved short-window/refinement and new-venue completeness questions for decision lock.

Applied planning amendments: PRD NFR20/NFR35/NFR40; architecture delta; six Epic 15 stories and Epic 13/14 dependency notes; UX degradation note; project context; launch handoff; future-operation notes in scheduled-jobs and venue-data runbooks; Epic 15 backlog entries in sprint status. Existing runnable operations remain documented until their replacements are implemented and approved; no speculative commands replace current runbooks.

**Major-change handoff:** PM owns scope/backlog and launch conditions; Solution Architect owns the measurement decision lock and generation/publication contract; Test Architect owns traceability and validation gates; Developer follows Stories 15.1–15.6 after normal story authorization. Maintainer separately approves production migration/publication/rollback and eventual schedule retirement. This records role responsibilities and deliverables; it does not dispatch agents or start implementation.

**Next item:** Story 15.1, measurement only, with required story baselines before work. No delivery date is promised before measured cost and correctness results exist. Epic 12 remains closed; Epic 14 field correctness and weather scheduling remain independent launch gates.

**Scope verification:** planning/documentation changes only. No application code, production data/configuration, commit, merge or deployment changes. Pre-existing working-tree changes and protected paths are preserved.
