# Epic 15 architecture consolidation — adversarial seam review

**Initial verdict: NEEDS TWO CLARIFICATIONS BEFORE FINAL HANDOFF.** The accepted
measurement choices themselves are preserved: CD15.1-v1/A1, the four-minute
missed-gap diagnostic, the supported-model/physical-light distinction, and
the capacity admission hold are intact. The findings below only make the
already accepted operating and rollback rules enforceable across independently
implemented stories.

## High findings

### H1 — One-worker pilot conflicts with the current concurrency wording

**Evidence:** E15-AD-01 Lifecycle 5 fixes the accepted pilot at one worker,
but then says to use workflow concurrency, not to serialize all computation,
and to avoid a global lease that prevents urgent repair. Story 15.3 AC2 fixes
one worker, while AC3 and test family I05 require unrelated venue builders to
progress. A compliant Story 15.2 lease/schema implementation can therefore
enable several active geometry workers, while a compliant Story 15.3 follows
the one-worker CPU/RSS/shard budget.

**Required clarification:** Define the pilot as **one active geometry worker
across all seasonal shards**. Per-generation lease keys may make unrelated
work independently queueable and let an urgent repair take the next eligible
slot, but must not permit concurrent active geometry work. Publication remains
separately serialized. Amend 15.3 AC3 and I05 to assert queue eligibility and
post-slot progress for unrelated work, rather than concurrent execution.

This retains the accepted one-worker/5 venues × 3 dates envelope and avoids
inventing a new scaling policy.

### H2 — Retention names a generation while atomic rollback requires a whole release

**Evidence:** Lifecycle 5 correctly rolls back by atomically flipping a
season's pointer to a retained verified compatible *release*. The retention
text in Lifecycle 5, the consolidated Epic 15 disposition, and the September
14 record instead repeatedly says each season retains a current plus a
compatible rollback *generation*. Story 15.2 AC5 can therefore retain an
individually compatible venue generation, while Story 15.4 attempts a pointer
flip requiring a complete, coherent manifest for every in-scope venue.

**Required clarification:** Retention must protect, for each retained season,
the complete current release and at least one complete verified compatible
rollback release manifest, including every generation it references. Retain
individual evidence-referenced generations additionally; count shared physical
generation rows once. A rollback target is usable only when its manifest,
generation set, committed input hashes, and engine/format/decoder compatibility
all validate together. Align 15.2 AC5, 15.4 AC5 and I14/I15 to that release
unit.

This does not alter the accepted retention quantity, the evidence protection
rule, or the capacity hold; it supplies the atomic unit that those accepted
rules already require.

## Medium finding

### M1 — Exact-date reads need an explicit season-pointer selection rule

**Evidence:** The E15 read path begins with a “current season release,” and
the design separately requires explicit actual-year generation, current and
previous retention, actual-date coverage, and no cross-year substitution. Two
otherwise compliant read implementations can select a release from wall-clock
year or from the request's Stockholm date, producing different results around
year rollover and retained-date/replay inspection.

**Required clarification:** Derive `season_year` solely from the requested
`stockholm_date` in `Europe/Stockholm`; resolve only that season's current
release pointer. Never select a season by server wall clock or substitute a
different year. If the requested date is outside the supported season or that
season has no compatible current release, keep the existing fail-closed
coverage result. This does not require public historical replay: replay still
requires retained original geometry/input, weather and classifier evidence.

## Checked and preserved

- The 5° result remains a supported-model negative, never evidence that a
  physical direct beam is absent.
- The five-minute/5pp/one-minute detector, <=100ms detected brackets,
  <=2-minute target, >=300-second reconstructed geometric window rule, and
  known untriggered four-minute shade gap remain unchanged.
- Full 245-date actual-year coverage includes hidden and new non-deleted
  venues; remaining-date work remains staging only.
- Float64/raw-boundary storage, shared immutable inputs, all A1 carry-forward
  gates, and the 375MB/400MB capacity hold remain unchanged.
- The separate rubric review's NFR35 coverage-reporting correction was already
  being applied; it is not duplicated here.

## Resolution verification — 2026-09-15

**Final verdict: PASS.** The canonical consolidation resolves all three seam
findings without changing an accepted measurement-dependent choice.

- **H1 resolved:** Lifecycle 5 now permits exactly one active geometry worker
  across all shards, distinguishes queue concurrency from computation
  concurrency, permits unrelated or urgent work to queue/prioritize, and keeps
  publication separately serialized. The test-design seam assertion requires
  I05 to prove that exact rule.
- **H2 resolved:** Lifecycle 5 now retains each season's complete current
  release manifest and at least one complete verified compatible rollback
  release manifest, with every referenced generation. It expressly rejects a
  collection of per-venue fallback rows as a rollback target; I14/I15 carry
  that release-unit check.
- **M1 resolved:** the read chain now derives `season_year` from the requested
  Stockholm date, selects only that season's current-release pointer, and
  returns the existing typed coverage 503 if compatible requested-season
  coverage is absent. It forbids wall-clock and cross-year substitution; I02/I10
  carry the assertion.

The separate scheduled coverage-reporting correction is also present in
Lifecycle 5 and the Story 15.4/15.5 proof path. No production/runtime work,
Story 15.1 review, or modification of the accepted detector, capacity, or A1
gates occurred in this verification.
