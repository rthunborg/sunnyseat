# Epic 15 owner policy amendment — 2026-09-10

Status: **Product policy accepted by Rasmus; measurement completion and production budgets NOT accepted.**

**September 12 scoped supersession:** [Detector selection and residual-risk acceptance](epic-15-detector-risk-acceptance-2026-09-12.md) replaces the strict universal interior-gap discovery requirement below with the accepted empirical five-minute/5pp/one-minute detector. Preserve detected shade gaps; undetected-gap risk is explicitly accepted. Earlier wording and gate disposition below record September 10's decision; G1b method/risk is now accepted, while combined G1 and budget/story acceptance remain open.

Approval source: after discussing the four G1 decisions and the assistant's recommended five-minute interval filter, actual-year full-season coverage and provisional arrays, Rasmus said: “Alright, that sounds good for all the points, lets go with your recommendations according to above.” This accepts the recommendations in that exchange, not the earlier two-endpoint/five-minute state-memory suggestion.

This is the decision record for the amendments incorporated into the living PRD, E15-AD-01/02 architecture, Epic 15, UX and test design. It supersedes their earlier pending product choices only as specified below. The September 9 proposal, readiness assessment and recorded measurement runs remain historical evidence. No runtime, schema, migration, rollout or Story 15.2 implementation is authorized by this record.

## Accepted product rules

1. **G1a — Horizon/presentation accepted.** Refraction-corrected solar-centre elevation below 5° is “not sunny” in SunnySeat; >=5° is eligible for further geometry/weather checks. No special per-pin model-support warning is required by this decision. Preserve the documented distinction from physical beam absence: the model convention does not establish that sunlight cannot physically reach the seating below 5°. Existing Swedish-first and accessibility requirements remain binding; no new copy is implemented here.
2. **G1b — Five-minute minimum geometric sun window accepted as a requirement.** A raw sunny interval is a continuous model-supported interval with seating sunlit share >50%. Suppress intervals shorter than 300 seconds; intervals lasting >=300 seconds qualify from their calculated start until their calculated end, subject to weather. Do not wait five real minutes, consult previous displayed state, or infer continuity from two endpoint samples. Do not bridge shade gaps. Use the same derived eligibility for map, list, detail, ranking/peaks and planner at a given instant. Preserve raw geometric percentages and intervals separately from this public-window eligibility; do not overwrite raw exposure with zero merely to suppress a short window. This is a future behavior amendment, not an assertion that the existing public DTO or runtime already implements it.
3. **Weather remains independent.** Qualifying geometry is necessary but insufficient: public sunny status still requires fresh, coherent directSunState=likely. Blocked or unknown evidence removes the recommendation as soon as available under existing refresh/read behavior; there is no new five-minute hold of stale sunny status. Unknown does not become cloudy or clear. TTL, provider-time matching, snapshot cadence and no-live-provider/no-request-geometry rules are unchanged. This rule does not claim sub-minute cloud forecasting.
4. **G1c — Actual-year full-season completeness accepted.** Every non-deleted venue, including hidden venues, must have March 1–October 31 coverage for the selected season year, including dates already past. Use 2026 dates for 2026 and 2027 dates for 2027, with exact date keys and Europe/Stockholm offsets. No cross-year date substitution and no effective-date exemption. Remaining-date generation is staging only. Calculation using current captured geometry does not prove historical building/seating truth; retain generation/input attribution.
5. **G1d — Arrays provisionally selected.** Prefer arrays pending representative computation, actual JSONB baseline, retained growth/headroom, decode/read/load and operational evidence. Numeric production budgets and final schema/precision remain unapproved. Do not infer approval of integer rounding from approval of arrays: earlier equal-precision evidence and >50% predicate differences remain relevant.

## Required measurement follow-through

The 300-second rule changes public-window eligibility, not the raw-engine accuracy claim. Existing <=2-minute raw transition and <=10-second horizon-root targets remain unless separately amended; five minutes is a minimum window duration, not a sampling period or extra refresh delay. Detection must find qualifying windows and must not turn separate short bursts into a qualifying interval by missing an intervening shade gap. Existing endpoint/midpoint/minute failures stay in the evidence ledger; do not relabel historical failures as passes.

Benchmark short bursts, repeated bursts separated by shade, sustained sun, 299/300/301-second boundaries, uncertainty around the duration threshold, first/last horizon edges, equality at 50%, DST/year rollover, and every safety-limit failure. Compare raw and filtered intervals separately using adequate engine-backed references; quantify added CPU/storage work. A duration whose uncertainty crosses 300 seconds is unresolved measurement evidence, not an assumed pass. Representativeness and detection guarantees remain unproven by the present synthetic runs.

## Gate disposition

- G1a: product policy ACCEPTED; measured implementation/field limits still require verification.
- G1b: product policy ACCEPTED; method selection, detection/precision/cost evidence NOT COMPLETE.
- G1c: completeness policy ACCEPTED; implementation/exact-set verification still required.
- G1d: arrays PROVISIONAL; production encoding/budgets NOT READY.
- Combined G1: OPEN. Story 15.1 remains in-progress; not accepted as done. Story 15.2 remains blocked. No fourth automatic review is authorized.
