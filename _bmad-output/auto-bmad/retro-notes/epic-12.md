## Story 12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours
- [Phase 2 â€” epic test design] a11y-mobile is absent from CI and all current scenarios are test.fixme; mobile UI gates need executable axe coverage.
- [Phase 4 â€” ATDD] Worker metadata overcounted one parameterized case; future ATDD aggregation should derive totals from framework collection rather than hand-authored priority counts.
- [Phase 5 â€” dev-story] Protected preview access and live provenance evidence must be preflighted before stories with mandatory operational acceptance lanes.
- [Phase 5 â€” dev-story] story-review.sh resolves the full Story 12.1 sprint key but not the abbreviated 12-1 argument; align the wrapper or generated task wording.
- [Phase 5 â€” dev-story] The story audit caught that nextjs-app/scripts/* initially ignored the hours audit runner; the runner is now explicitly allow-listed.
- [Phase 6 â€” test automation] Keep live provenance remediation out of repeatable CI; cover governance idempotency, audit boundaries, failure isolation, and redaction deterministically.
- [Phase 7 â€” code review] A remediation CLI under scripts/ required an explicit .gitignore allow-list entry because the repository ignores scripts/* by default.
- [Phase 7 â€” code review] Supabase CLI db push was blocked by local Profile.DashboardURL validation; the authorized protected-pooler psql path applied the verified migration transactionally and linked history remained aligned.
- [Phase 7 â€” code review] GitHub Production is main-only with required Supabase secrets and SUN_HOURS_AUDIT_ENABLED=true; the first scheduled/manual workflow execution awaits the workflow reaching the default branch.
- [Phase 7 â€” code review] Iteration 5 explicitly overrode the three-round review cap. Future persistence stories should specify run ownership/input binding and per-venue isolation versus whole-population atomicity before implementation.
- [Phase 7 â€” code review] Supabase CLI profile validation can prevent otherwise valid database pushes. Keep the protected pooler plus explicit migration-history transaction documented as the fallback.
- [Phase 7 â€” code review] Iterative database hardening needs executable state-transition tests alongside each new overload and replay path; text-presence assertions did not protect the ownership/idempotence invariants.

## Story 12-2-feedback-driven-accuracy-loop-retire-the-coverage-cap-bypass
- [Phase 5 â€” dev-story] Story 12.2 correctly stopped at its mandatory Task 0 because Stories 12.3, 12.6, 12.7, and 12.13 own prerequisite shared contracts that are not yet on the branch.

## Story 12-3-day-series-compute-at-real-venue-scale-kill-the-cold-start-freeze
- [Phase 5 â€” dev-story] Keep geometry_input_hash date-independent; stockholm_date is the separate persisted-coverage key.
- [Phase 5 â€” dev-story] Local Playwright can reuse an unrelated localhost:3000 process; run with CI=1 for the repo-owned server during validation.
- [Phase 6 â€” test automation] Automation ran sequentially because nested worker fan-out is unavailable inside the delegate runtime; coverage results were unaffected.
- [Phase 7 â€” story trace] Protected-production evidence remains a release lane: collect 42+ venue cold-p95 with date/hash/run metadata, persisted-read proof, zero provider/shadow recompute proof, protected GitHub Production configuration, and live protected Supabase advisor evidence.

## Story 12-7-reviews-route-resolves-live-venues-fix-the-404-on-real-venues
- [Phase 5 â€” dev-story] Visibility schema drift remains: the runtime seam uses is_hidden / visibility / deleted_at, while the planned hidden column is absent from generated types on this branch; downstream consumers must use the shared resolver rather than re-inventing visibility checks.
- [Phase 7 â€” code review] Live/schema probes proved hidden, is_hidden, visibility, and deleted_at were all absent; the review fix adopted the architecture-backed canonical hidden boolean not null default false migration and removed invented visibility vocabularies.
- [Phase 7 â€” code review] Mocks had concealed a nonexistent live projection. Future schema-backed stories should validate canonical migrations/generated types or exercise disposable migrated Postgres before relying on mocked rows.
- [Phase 7 â€” story trace] Traceability is CONCERNS with 8/10 full and 2/10 partial: migrated-database/live resolver-precompute verification and concurrent in-flight visibility changes remain deployment/edge evidence lanes; no composite criterion is uncovered.

## Story 12-6-simplify-map-pins-one-grey-not-sunny-pin-no-number
- Story 12.6's tri-state public-sun contract required explicit weatherGateState propagation across API DTOs, fixtures, persisted outcomes, and client derivation; one client/server-safe pure module prevented comparator, card, pin, and ARIA drift.
- The existing a11y-mobile Playwright project was effectively vacuous because CI omitted it and a legacy unit guard enforced that omission; invoking it alongside a11y plus an active pin-bearing axe scenario closes the gap.
- The legacy visual validator remains credential-gated on this host: a missing ANTHROPIC_API_KEY blocks comparison but does not authorize reference replacement, manual-pass claims, or a sprint-status transition.
- The independent TEA automate pass caught seven contract defects that the initial green suite missed: reverse-order peak ties, all-grey top-50 truncation, fail-closed weather normalization, and missing unknown/not-sunny card/QuickInfo honesty copy.
- Keeping the automation additions test-only and committing them red preserves an auditable red-to-green handoff before production fixes.
- Fail-closed weather provenance must be carried directly as tri-state data; deriving it later from CloudObscured or sky strings creates silent known-clear promotions.
- Public window/peak DTOs need their own gate-state provenance so unknown-weather qualification survives persistence and serialization.
- Final Story 12.6 functional evidence after the automate fix pass: 1,758 Vitest tests passed; the five-project Playwright matrix passed with two retry-classified flakes; typecheck and lint passed.
- Tier-A found one Medium invariant gap after the broader green fix: syntactically valid but semantically contradictory CloudObscured + not_gated tuples could still enter the public-sunny band.
- The thin-review fix keeps the shared status-agnostic predicate unchanged and enforces the relational invariant at the public DTO sanitizer for both top-level and day-series entries; 103 focused tests plus typecheck/lint passed.
- Dedicated Tier-A security review reported no exploitable findings.

## Story 12-13-remove-the-user-facing-confidence-indicator-keep-it-internal
- [Phase 3 â€” create-story] Story 12.13 source citations contain stale PRD/UX line claims; implementation should use a surgical current-contract audit instead of broad documentation rewrites.
- [Phase 5 â€” dev-story] Positive visual assertions must distinguish amber sun-exposure figures from confidence; candidate review caught and corrected two over-removals before rebaseline.
- [Phase 5 â€” dev-story] On this Windows host the canonical full-suite gate required VITEST_MAX_WORKERS=4 to avoid CPU-contention timeouts; test timeouts and code remained unchanged.
