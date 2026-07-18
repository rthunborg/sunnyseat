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
