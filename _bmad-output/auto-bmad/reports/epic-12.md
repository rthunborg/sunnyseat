# auto-bmad epic report log — epic-12

## Report — 2026-07-18T12:08:34Z (halted â€” needs-human)

**Epic:** `12` — 14 stories.
**Branch:** `epic/12-real-venue-launch-readiness-perf-trust-hours-console-hygiene` (HEAD `f6c62ec`).
**Pipeline status:** â›” halted at Story 12-2 / Phase 5 â€” mandatory prerequisite contracts are missing; no production implementation was made.
**Continues:** (none â€” first run)

**Summary:** Epic 12 preflight, branch setup, and epic test design completed. Story 12-2 context and red ATDD scaffolds landed, but its implementation is ordered before four contracts that its own Task 0 requires.

**Timing:** started 2026-07-18T11:27:25Z; completed in progress — elapsed 41m (≈38m AI-run, ≈2m human/idle wait).

**Stories:**
1. 12-2 â€” context validated and 17 red ATDD scaffolds committed; dev-story blocked before production changes.
2. 12-3 through 12-14 â€” not started because the epic stopped at the first hard blocker.

**Skipped (already done):** 12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours (already done before this run)

**Integration review:** not run â€” story loop halted before Tier A review

**Epic gate:** not run

**TEA:** Epic test design completed: 23 risks, 11 High, six score-9 release blockers. Story 12-2 classified High; ATDD completed; automate/trace and later story TEA did not run.

**UAT:** (none)

**Overrides:** none

**Open questions:** (none)

**Deferred work:**
1. Story 12-2 implementation is deferred until its four prerequisite Epic 12 contracts exist or the story dependency gate is explicitly revised.

**Auto-decided (epic mode):** (none)

**Planning drift:** (none)

**⚠️ Needs human:**
1. Reconcile Story 12-2 dependency ordering: move it after Stories 12-3, 12-6, 12-7, and 12-13, or explicitly revise its mandatory Task 0 gate.
2. Missing prerequisite: Story 12.3 canonical geometry_input_hash.
3. Missing prerequisite: Story 12.6 shared public-sunny predicate and weatherGateState.
4. Missing prerequisite: Story 12.7 shared live public venue resolver for feedback POST.
5. Missing prerequisite: Story 12.13 confidence-removal premise; visible and screen-reader confidence is still active.

**Next:** After correcting the dependency order or gate, resume with $auto-bmad epic --epic 12.

## Report — 2026-07-19T18:30:07Z (halted — needs-human)

**Epic:** `12` — 14 stories.
**Branch:** `epic/12-real-venue-launch-readiness-perf-trust-hours-console-hygiene` (HEAD `9346726`).
**Pipeline status:** Halted at Story 12.12 / Phase 5: code and automated gates are complete, but four new visual references require maintainer approval before promotion and the canonical review gate.
**Continues:** Prior halted report at HEAD f6c62ec; resumed under the maintainer-approved dependency order and landed Stories 12.3, 12.7, 12.6, and 12.13.

**Summary:** Four stories are landed in this run. Story 12.12 is implemented with its photo-storage, media-selection, fallback, forced-state, documentation, migration, and test work present but uncommitted pending the visual approval gate.

**Timing:** started 2026-07-18T11:27:25Z; completed in progress — elapsed 31h 02m (≈12h 05m AI-run, ≈18h 56m human/idle wait); resumed 1×.

**Stories:**
1. 12-1 — already done before this run.
2. 12-3 — landed; persisted geometry/hash/weather snapshot and cold-start foundation.
3. 12-7 — landed; shared live venue visibility resolver (deployment migration still required).
4. 12-6 — landed; shared sunny/not-sunny presentation predicate and pin model.
5. 12-13 — landed; user-facing confidence removed while internal evidence remains.
6. 12-12 — implementation and automated validation complete; paused before visual-reference promotion/review.
7. 12-9, 12-4, 12-10, 12-5, 12-8, 12-11, 12-2, 12-14 — not yet entered in this resumed order.

**Skipped (already done):** 12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours (already done before this run)

**Integration review:** Not run — Story 12.12 is paused before its Tier A review and before epic-level Tier B review.

**Epic gate:** Not run — remaining stories have not landed.

**TEA:** Epic test design is complete. Story 12.12 was classified High; red ATDD scaffolds were implemented, and development validation passed typecheck, lint, full Vitest, full Playwright, focused photo E2E, and desktop photo axe.

**UAT:**
1. 50 manual UAT checks from the four landed stories are retained on the epic anchor; epic consolidation has not run yet.

**Overrides:** Maintainer-approved custom story dependency order; human/manual visual review enabled.

**Open questions:** (none)

**Deferred work:**
1. Promote the approved Story 12.12 candidate PNGs to the four new active reference paths, update REBASELINE-LOG.md, run visual validation, then run the canonical story-review gate.

**Auto-decided (epic mode):**
1. [12-7] Adopted the architecture-backed canonical hidden boolean not null default false migration/type contract after probes found no legacy visibility column; no protected database mutation was performed.

**Planning drift:** Story 12.2 remains intentionally deferred until its prerequisite Epic 12 contracts land, per the maintainer-approved order.

**⚠️ Needs human:**
1. Approve or reject candidate set 20260719T195547 for venue-photo-loaded and venue-photo-fallback on mobile and desktop.

**Next:** After approval, resume this task with “Approved: rebaseline Story 12.12”; Auto-BMAD will promote/log the references, complete the story gate and Tier A review, then continue to Story 12.9.

## Report — 2026-07-20T14:29:50Z (halted â€” needs-human)

**Epic:** `12` — 14 stories.
**Branch:** `epic/12-real-venue-launch-readiness-perf-trust-hours-console-hygiene` (HEAD `e0bc76b`).
**Pipeline status:** â›” Epic 12 halted during Story 12.9 visual/rebaseline gate; implementation and dev verification are complete, but canonical-reference promotion and inherited desktop hydration rationale require human approval.
**Continues:** 2026-07-19T18:30:07Z (halted â€” needs-human)

**Summary:** Story 12.12 was reviewed, repaired, UAT-recorded, and landed in the epic anchor. Story 12.9 now has the row-count sheet/slim-slider implementation and automated dev gates complete, but is not yet landed.

**Timing:** started 2026-07-18T11:27:25Z; completed in progress — elapsed 51h 02m (≈15h 17m AI-run, ≈35h 44m human/idle wait); resumed 2×.

**Stories:**
1. [12-12] landed; Tier A Changes Requested -> fixed (2 High); story remains BMAD review for human approval.
2. [12-9] in progress; implementation/dev checks complete; mobile visual candidates await rebaseline approval and desktop hydration accept-with-rationale.

**Skipped (already done):** 12-1 already done

**Integration review:** not run â€” remaining stories and epic-end review pending

**Epic gate:** not run â€” epic-end gates pending

**TEA:** Story 12.9 classified medium; post-dev automate remains after visual approval/feature commit.

**UAT:** (none)

**Overrides:** User-confirmed dependency order; human/manual visual review allowed, explicit rebaseline approval still required.

**Open questions:**
1. Approve Story 12.9 mobile map-primary and map-panel-venues rebaseline candidates?
2. Accept the inherited canonical desktop OnboardingGate hydration warning as deferred to Story 12.4?

**Deferred work:**
1. [12-3] Protected production cold-p95/GitHub Production evidence remains.
2. [12-7] Apply 20260718214954_add_public_venue_visibility.sql before deploy.
3. [12-12] Apply 20260719000000_venue_media_storage.sql and verify protected Storage policies before hosted venue media.

**Auto-decided (epic mode):** (none)

**Planning drift:** No dependency-order drift. Story 12.9 required implementation-derived references because the old fixed-snap prototype is stale; no canonical PNG has been promoted.

**⚠️ Needs human:**
1. Review `_bmad-output/implementation-artifacts/validation/story-12-9-row-sheet-candidates/20260720-161700/`.
2. Approve promotion of `mobile-map-primary-slim-slider-rows-0.png` to mobile/map-primary.png and `mobile-map-panel-venues-rows-3.png` to mobile/map-panel-venues.png; accept rows 0/1/max/mid-drag as auxiliary behavior evidence.
3. Explicitly accept that the desktop canonical capture failure is the inherited OnboardingGate hydration issue owned by Story 12.4, so Story 12.9 may proceed before Story 12.4.

**Next:** On approval, promote the two mobile references, update the rebaseline audit, rerun visual/story-review gates, commit Story 12.9, run post-dev automate/Tier A/UAT, then advance to Story 12.4.

## Report — 2026-07-24T14:03:20Z (halted â€” needs-human)

**Epic:** `12` — 14 stories.
**Branch:** `epic/12-real-venue-launch-readiness-perf-trust-hours-console-hygiene` (HEAD `645a2c0`).
**Pipeline status:** Paused in Epic 12 E5 / Story 12.9 Phase 5 at the required human visual-candidate approval gate; Story 12.9 remains in-progress and no canonical reference was promoted.
**Continues:** Resumed after the human approved the compact slider/date-pill design and its written implementation plan.

**Summary:** Stories 12.3, 12.7, 12.6, 12.13, and 12.12 are landed on the epic anchor; Story 12.9 implementation and focused verification are complete pending visual approval.

**Timing:** started 2026-07-18T11:27:25Z; completed in progress — elapsed 146h 35m (≈15h 54m AI-run, ≈130h 41m human/idle wait); resumed 3×.

**Stories:**
1. 12-3 landed
2. 12-7 landed
3. 12-6 landed
4. 12-13 landed
5. 12-12 landed
6. 12-9 needs-human: approve or reject fresh slider/date candidates

**Skipped (already done):** 12-1 was already done before this epic run.

**Integration review:** Not yet run; Story 12.9 has not landed.

**Epic gate:** Not yet run.

**TEA:** Story 12.9 risk med; automate selected. Typecheck, lint, focused Vitest/real-engine rerun, and relevant Playwright suites passed; full parallel Vitest retained three existing real-engine timeouts and desktop axe retained an unrelated Story 12.12 forced-photo failure.

**UAT:** (none)

**Overrides:** User-confirmed dependency order; human visual validation/rebaseline approvals enabled.

**Open questions:**
1. Approve or reject `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/`.

**Deferred work:**
1. Apply Story 12.7 visibility migration before deployment.
2. Apply Story 12.12 venue-media storage migration before hosted media use.
3. Protected Story 12.3 production latency/coverage evidence remains unavailable locally.

**Auto-decided (epic mode):**
1. Story 12.7 canonical hidden boolean contract was adopted after schema probes.

**Planning drift:** none

**⚠️ Needs human:**
1. Review the four fresh Story 12.9 mobile candidates: slim slider/date pill, ordinary N=3, N=max with zoom controls hidden/inert, and mid-drag with three full rows plus a partial fourth.

**Next:** On approval, promote/rebaseline the accepted references with an audit-log update, complete deterministic gates, run the canonical Story 12.9 review transition, and resume Epic 12 with Story 12.4.

## Report — 2026-07-25T13:16:56Z (halted â€” needs-human)

**Epic:** `12` — 14 stories.
**Branch:** `epic/12-real-venue-launch-readiness-perf-trust-hours-console-hygiene` (HEAD `272b46d`).
**Pipeline status:** Epic 12 paused in Story 12.4 Phase 5 after repeated portal lifecycle fixes failed the full onboarding interaction matrix; human architecture approval is required before a structural refactor.
**Continues:** 2026-07-24T14:03:20Z (halted â€” needs-human)

**Summary:** Stories 12.3, 12.7, 12.6, 12.13, 12.12, and 12.9 are landed. Story 12.4 has proven the React and Positron sources and has green static/console gates, but the inline-to-body portal architecture remains interaction-racy and is not committed.

**Timing:** started 2026-07-18T11:27:25Z; completed in progress — elapsed 169h 49m (≈35h 37m AI-run, ≈134h 11m human/idle wait); resumed 4×.

**Stories:**
1. 12-3, 12-7, 12-6, 12-13, 12-12, and 12-9 landed
2. 12-4 in progress; portal-free stable-sibling architecture decision required before another implementation attempt

**Skipped (already done):** 12-1 was already done before this epic run.

**Integration review:** Not run; Story 12.4 has not landed.

**Epic gate:** Not run.

**TEA:** Story 12.4 risk med; automate selected. Current final-diff typecheck/lint/full Vitest pass (194 files, 1784 tests), console hygiene passes 8/8, visibility stress passes 30/30, but full onboarding interaction verification fails 3/14.

**UAT:** (none)

**Overrides:** User-confirmed dependency order; human/manual visual review allowed.

**Open questions:**
1. Approve Option A: eliminate the onboarding body portal and render the overlay as a stable sibling outside data-app-shell?

**Deferred work:**
1. Apply Story 12.7 visibility migration before deployment.
2. Apply Story 12.12 venue-media storage migration before hosted media use.
3. Protected Story 12.3 production latency/coverage evidence remains unavailable locally.
4. Rerun Story 12.4 manual visual capture after the structural fix; the current manual package is invalid because its fallback dev server hit an unprefixed-route redirect loop.

**Auto-decided (epic mode):** (none)

**Planning drift:** No epic dependency-order drift. Story 12.4 escalated from local portal fixes to an architecture decision after three-plus failed lifecycle iterations, as required by the systematic-debugging gate.

**⚠️ Needs human:**
1. Approve or reject the recommended portal-free stable-sibling onboarding architecture.
2. If rejected, choose whether to retain a layout-owned portal provider despite the remaining lifecycle risk.

**Next:** On approval, replace the portal with a stable sibling overlay outside the inert app shell, stress both skip and geolocation CTA flows on mobile and desktop, rerun static/console/visual gates, and continue Story 12.4.

## Report — 2026-07-25T19:27:28Z (resumed â€” in-progress)

**Epic:** `12` — 14 stories.
**Branch:** `epic/12-real-venue-launch-readiness-perf-trust-hours-console-hygiene` (HEAD `26a1f1e`).
**Pipeline status:** Epic 12 resumed in Story 12.4 Phase 5 after human approval of Option A; the portal-free stable-sibling onboarding refactor is being implemented.
**Continues:** 2026-07-25T13:16:56Z (halted â€” needs-human)

**Summary:** Stories 12.3, 12.7, 12.6, 12.13, 12.12, and 12.9 are landed. Story 12.4 architecture approval is resolved and implementation has resumed.

**Timing:** started 2026-07-18T11:27:25Z; completed in progress — elapsed 176h 00m (≈35h 37m AI-run, ≈140h 22m human/idle wait); resumed 5×.

**Stories:**
1. 12-3, 12-7, 12-6, 12-13, 12-12, and 12-9 landed
2. 12-4 in progress; Option A approved: stable sibling onboarding outside data-app-shell

**Skipped (already done):** 12-1 was already done before this epic run.

**Integration review:** Not run; Story 12.4 has not landed.

**Epic gate:** Not run.

**TEA:** Story 12.4 risk med; automate selected. Final gates will be rerun after the approved structural refactor.

**UAT:** (none)

**Overrides:** User-confirmed dependency order; human/manual visual review allowed; Option A explicitly approved.

**Open questions:** (none)

**Deferred work:**
1. Apply Story 12.7 visibility migration before deployment.
2. Apply Story 12.12 venue-media storage migration before hosted media use.
3. Protected Story 12.3 production latency/coverage evidence remains unavailable locally.
4. Rerun Story 12.4 manual visual capture after the structural fix; the prior package is invalid because it contains redirect-error pages.

**Auto-decided (epic mode):** (none)

**Planning drift:** No epic dependency-order drift. The approved structural refactor remains within Story 12.4 scope.

**⚠️ Needs human:** (none)

**Next:** Implement Option A with RED-first structural/hydration coverage, stress both dismissal flows on mobile and desktop, then rerun static, console, visual, review, and UAT gates.

## Report — 2026-07-27T16:01:02Z (halted — needs-human)

**Epic:** `12` — 14 stories.
**Branch:** `epic/12-real-venue-launch-readiness-perf-trust-hours-console-hygiene` (HEAD `fa23bf2`).
**Pipeline status:** Halted at Story 12.5 / Phase 5: core implementation and automated development checks are complete, but the required visual gate cannot run without ANTHROPIC_API_KEY or explicit approval for documented manual human validation.
**Continues:** 2026-07-25T19:27:28Z (resumed — in-progress)

**Summary:** Story 12.10 was human-approved and recorded done. Story 12.5 now has its dev-only venue editor implementation and core automated checks complete, but remains in-progress with its implementation uncommitted until the visual-validation choice is resolved.

**Timing:** started 2026-07-18T11:27:25Z; completed in progress — elapsed 220h 33m (≈38h 03m AI-run, ≈182h 29m human/idle wait); resumed 6×.

**Stories:**
1. 12-1 was already done before this epic run.
2. 12-3, 12-7, 12-6, 12-13, 12-12, 12-9, 12-4, and 12-10 are landed; Story 12.10 is human-approved and done.
3. 12-5 is halted in Phase 5 after implementation and core automated validation; required mobile/desktop visual validation is unresolved.
4. 12-8, 12-11, 12-2, and 12-14 have not started in the confirmed dependency order.

**Skipped (already done):** 12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours (already done before this epic run).

**Integration review:** Not reached; Story 12.5 has not landed and later stories remain.

**Epic gate:** Not reached; the epic is halted in Story 12.5 Phase 5.

**TEA:** Story 12.5 is High risk. Pre-dev ATDD is complete. Typecheck, lint, full Vitest, focused Story 12.5 Playwright, and accessibility suites passed; post-dev automate and trace-advisory have not run because Phase 5 has not completed.

**UAT:** (none)

**Overrides:** User-confirmed dependency order and per-story human visual review are retained.

**Open questions:**
1. Use documented manual human visual validation for Story 12.5, or supply ANTHROPIC_API_KEY for the legacy automated validator?

**Deferred work:**
1. [12-3] Capture protected-production 42+ venue cold-p95 evidence and verify the protected GitHub Production environment when access is available.
2. [12-7] Apply 20260718214954_add_public_venue_visibility.sql before deployment, regenerate Supabase types, and verify no contract diff.
3. [12-12] Apply 20260719000000_venue_media_storage.sql before hosted venue media use and verify protected Supabase Storage bucket/RLS behavior.
No additional deferred work was archived in this halted session.

**Auto-decided (epic mode):**
1. [12-7] Adopted the architecture-backed canonical hidden boolean not null default false migration/type contract after live/schema probes found all previously referenced visibility columns absent; no protected database mutation was performed.

**Planning drift:** None; Story 12.5 is being executed in the maintainer-approved dependency order.

**⚠️ Needs human:**
1. Choose documented manual human visual validation for Story 12.5, or provide ANTHROPIC_API_KEY so the legacy automated visual validator can run.

**Next:** Resume Story 12.5 Phase 5 after that choice; complete its visual evidence, remaining acceptance-evidence matrix, canonical review gate, post-dev TEA, and thin review before advancing to Story 12.8.

## Report — 2026-07-27T17:14:07Z (halted — needs-human)

**Epic:** `12` — 14 stories.
**Branch:** `epic/12-real-venue-launch-readiness-perf-trust-hours-console-hygiene` (HEAD `fd970d0`).
**Pipeline status:** Halted after Story 12.5 Tier-A fixes and PASS trace advisory; explicit human visual acceptance is required before landing the story on the Epic 12 anchor.
**Continues:** 2026-07-27T16:01:02Z (halted — needs-human)

**Summary:** Story 12.5 is fully implemented, at BMAD review, and has passed development, automation, manual mobile/desktop visual validation, thin acceptance/security review after three Medium fixes, and story-level traceability. It is paused only for the maintainer-requested visual acceptance.

**Timing:** started 2026-07-18T11:27:25Z; completed in progress — elapsed 221h 46m (≈39h 02m AI-run, ≈182h 44m human/idle wait); resumed 7×.

**Stories:**
1. 12-1 was already done before this epic run.
2. 12-3, 12-7, 12-6, 12-13, 12-12, 12-9, 12-4, and 12-10 are landed.
3. 12-5 is review-ready: implementation and automation green; Tier-A Critical 0 / High 0 / Med 3 / Low 0 with all three Medium findings fixed; trace PASS across AC1-AC8; awaiting human visual acceptance.
4. 12-8, 12-11, 12-2, and 12-14 have not started in the confirmed dependency order.

**Skipped (already done):** 12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours (already done before this epic run).

**Integration review:** Not reached; Story 12.5 awaits visual acceptance and anchor landing.

**Epic gate:** Not reached; later stories remain.

**TEA:** Story 12.5 High risk: ATDD, post-dev automate, and trace-advisory all completed. Typecheck, lint, 206-file full Vitest, focused desktop/mobile Playwright, and accessibility passed. Trace verdict PASS with all eight ACs fully covered.

**UAT:**
1. Run development without SUNNYSEAT_ADMIN=dev and open /?_editor=venues -> the normal map appears with no editor or dev data.
2. Run a production server even with SUNNYSEAT_ADMIN=dev and request /api/dev/venues -> receive non-cacheable 404 JSON.
3. Run local development with SUNNYSEAT_ADMIN=dev and open /?_editor=venues -> the Swedish venue editor exposes the supported coordinate, polygon, visibility, metadata, and media fields.
4. Edit, validate, save, reset, hide, and unhide a seeded venue -> valid atomic changes reach public surfaces while invalid input leaves persisted data unchanged.

**Overrides:** User-confirmed dependency order; per-story human visual review enabled; Story 12.5 manual visual provider path explicitly authorized.

**Open questions:**
1. Approve or reject the four Story 12.5 manual evidence images: mobile/desktop map-primary and mobile/desktop venue-detail.

**Deferred work:**
1. [12-3] Capture protected-production 42+ venue cold-p95 evidence and verify the protected GitHub Production environment when access is available.
2. [12-7] Apply 20260718214954_add_public_venue_visibility.sql before deployment, regenerate Supabase types, and verify no contract diff.
3. [12-12] Apply 20260719000000_venue_media_storage.sql before hosted venue media use and verify protected Supabase Storage bucket/RLS behavior.
No Story 12.5 review finding was deferred.

**Auto-decided (epic mode):**
1. [12-7] Adopted the architecture-backed canonical hidden boolean not null default false migration/type contract after live/schema probes found all previously referenced visibility columns absent; no protected database mutation was performed.
2. [12-5] Gate-off public pin visual decision [Med] -> fix: retained the accessibility-safe pin color and made the post-fix manual visual acceptance evidence explicit (Tier A).

**Planning drift:** None; Story 12.5 remains within the maintainer-approved dependency order and scope.

**⚠️ Needs human:**
1. Review and approve or reject the four Story 12.5 manual visual evidence images before anchor landing.

**Next:** On approval, record Story 12.5 human acceptance and UAT, land it atomically on the epic anchor, then start Story 12.8.

## Report — 2026-07-27T19:07:49Z (halted — needs-human)

**Epic:** `12` — 14 stories.
**Branch:** `epic/12-real-venue-launch-readiness-perf-trust-hours-console-hygiene` (HEAD `67ac36b`).
**Pipeline status:** Halted at Story 12.8 Tier-A review; explicit human visual acceptance is the sole remaining finding before the thin review can complete.
**Continues:** 2026-07-27T17:14:07Z (halted — needs-human)

**Summary:** Story 12.5 was visually approved and landed. Story 12.8 is fully implemented at BMAD review with clean typecheck, lint, unit, accessibility, automation, and security evidence; only its candidate visuals await approval.

**Timing:** started 2026-07-18T11:27:25Z; completed in progress — elapsed 223h 40m (≈39h 54m AI-run, ≈183h 46m human/idle wait); resumed 8×.

**Stories:**
1. 12-1 was already done before this epic run.
2. 12-3, 12-7, 12-6, 12-13, 12-12, 12-9, 12-4, 12-10, and 12-5 are landed.
3. 12-8 is review-ready: implementation and automation green; Tier-A Critical 0 / High 1 / Med 0 / Low 0, where the sole High Decision is explicit visual acceptance; security clean.
4. 12-11, 12-2, and 12-14 have not started in the confirmed dependency order.

**Skipped (already done):** 12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours (already done before this epic run).

**Integration review:** Not reached; Story 12.8 awaits visual acceptance and Tier-A completion.

**Epic gate:** Not reached; later stories remain.

**TEA:** Story 12.8 Medium risk: post-dev automate completed. Full Vitest, typecheck, lint, About desktop/mobile axe, and focused copy-contract tests passed; two unrelated mobile Playwright flakes passed on exact rerun.

**UAT:**
1. Review the focused mobile legend candidate -> both amber sunny and grey not-sunny cards plus the 70% explanation are fully visible above the fixed navigation.
2. Review the mobile full-page and desktop candidates -> the About page remains coherent across breakpoints, contains no public 85% accuracy claim, and explains that 70% is seating-area share rather than probability.

**Overrides:** User-confirmed dependency order; per-story human visual review enabled; providerless manual visual evidence authorized.

**Open questions:**
1. Approve or reject the Story 12.8 mobile full-page, focused mobile legend, and desktop About candidates.

**Deferred work:**
1. [12-3] Capture protected-production 42+ venue cold-p95 evidence and verify the protected GitHub Production environment when access is available.
2. [12-7] Apply 20260718214954_add_public_venue_visibility.sql before deployment, regenerate Supabase types, and verify no contract diff.
3. [12-12] Apply 20260719000000_venue_media_storage.sql before hosted venue media use and verify protected Supabase Storage bucket/RLS behavior.
No Story 12.8 review finding was deferred.

**Auto-decided (epic mode):**
1. [12-7] Adopted the architecture-backed canonical hidden boolean migration/type contract after schema probes found the referenced visibility columns absent.
2. [12-5] Retained the accessibility-safe public pin color with explicit human visual acceptance evidence.

**Planning drift:** None; Story 12.8 remains within the maintainer-approved dependency order and trust scope.

**⚠️ Needs human:**
1. Review and approve or reject the three Story 12.8 visual candidates before Tier-A completion and anchor landing.

**Next:** On approval, resolve the Story 12.8 visual decision, complete Tier A and UAT, land it atomically, then start Story 12.11.

## Report — 2026-08-07T14:50:25Z (halted â€” needs-human)

**Epic:** `12` — 14 stories.
**Branch:** `epic/12-real-venue-launch-readiness-perf-trust-hours-console-hygiene` (HEAD `18ee246`).
**Pipeline status:** Halted at Story 12.14 / Phase 5: implementation and automated checks passed, but required visual validation cannot run without ANTHROPIC_API_KEY and four approved selected-time reference PNGs.
**Continues:** 2026-07-27T19:07:49Z (halted â€” needs-human)

**Summary:** Twelve stories are already landed by this Epic 12 run. Story 12.14 now has its selected-time availability implementation and automated verification complete in the working tree, but remains in-progress and uncommitted because the visual gate requires human-provided references or explicit manual acceptance.

**Timing:** started 2026-07-18T11:27:25Z; completed in progress — elapsed 483h 23m (≈60h 10m AI-run, ≈423h 12m human/idle wait); resumed 9×.

**Stories:**
1. 12-1 was already done before this epic run.
2. 12-3, 12-7, 12-6, 12-13, 12-12, 12-9, 12-4, 12-10, 12-5, 12-8, 12-11, and 12-2 are landed on the epic anchor.
3. 12-14 is halted in Phase 5 after implementation and automated validation; visual validation and the canonical review transition have not completed.

**Skipped (already done):** 12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours (already done before this run)

**Integration review:** Not run â€” Story 12.14 has not landed, so the whole-epic Tier B review remains pending.

**Epic gate:** Not run â€” the Epic 12 trace, NFR, and test-quality gates remain pending after Story 12.14 lands.

**TEA:** Story 12.14 risk medium; post-dev automate is selected but has not run because Phase 5 is incomplete. Typecheck, lint, full Vitest (213 files / 1938 tests), focused Story 12.14 Vitest (9 files / 247 tests), and Story 12.14 Playwright passed; one existing Epic 11 desktop timeout passed on exact rerun.

**UAT:** (none)

**Overrides:** none

**Open questions:**
1. Approve or promote implementation-derived selected-time reference PNGs, or explicitly approve manual visual acceptance; then rerun visual validation and scripts/story-review.sh.

**Deferred work:**
1. [12-3] Capture the protected-production 42+ venue cold-p95 dataset and verify the protected GitHub Production environment when access is available.
2. [12-7] Apply 20260718214954_add_public_venue_visibility.sql before deploying Story 12.7, regenerate Supabase types, and verify no contract diff.
3. [12-12] Apply 20260719000000_venue_media_storage.sql before hosted venue media is used, then verify protected Storage bucket/RLS behavior.
4. [12-11] Stabilize the mobile future-date exact-response wait in nextjs-app/test/e2e/map-primary.spec.ts under full-suite concurrency.

**Auto-decided (epic mode):**
1. [12-7] Adopted the architecture-backed canonical hidden boolean migration/type contract after schema probes found the referenced visibility columns absent.
2. [12-5] Retained the accessibility-safe public pin color with explicit visual rebaseline/acceptance evidence.
3. [12-11] Kept enough Settings state after guide close so focus returns to the guide row rather than the map fallback.

**Planning drift:** none

**⚠️ Needs human:**
1. Set/provide ANTHROPIC_API_KEY, or explicitly authorize documented manual visual acceptance for Story 12.14.
2. Provide or approve nextjs-app/docs/design/references/screens/mobile/map-selected-time-open.png.
3. Provide or approve nextjs-app/docs/design/references/screens/desktop/map-selected-time-open.png.
4. Provide or approve nextjs-app/docs/design/references/screens/mobile/map-selected-time-closed.png.
5. Provide or approve nextjs-app/docs/design/references/screens/desktop/map-selected-time-closed.png.

**Next:** After resolving the visual gate, rerun $auto-bmad epic --epic 12; the pipeline will resume Story 12.14 Phase 5, then run post-dev coverage, Tier A, epic gates, Tier B integration review, and local finalization.

## Report — 2026-08-07T19:50:17Z (halted — needs-human)

**Epic:** `12` — 14 stories.
**Branch:** `epic/12-real-venue-launch-readiness-perf-trust-hours-console-hygiene` (HEAD `e58cd5a`).
**Pipeline status:** Epic 12 implementation, automated verification, manual visual acceptance, two-pass Tier-B integration review, and E8b closing artifacts are complete locally. Final Git staging/commits are blocked because the Codex approval/usage quota rejected the required workspace Git write until 2026-08-12 18:30. The trace gate remains FAIL at its two-iteration cap, so the epic is caveated and not launch-ready; git mode is local and no push/PR was attempted.
**Continues:** 2026-08-07T14:50:25Z halted report at HEAD 18ee246; resumed after the user's blanket manual-visual authorization and landed Story 12.14, gate remediation, and both integration-review passes.

**Summary:** All 13 fresh Epic 12 stories landed on the epic branch (Story 12.1 was pre-existing done). The assembled app now has persisted real-scale geometry/weather reads, shared live venue identity/visibility, public sun presentation with internal-only confidence, selected-time availability, media renditions/fallbacks, bounded detail prefetch, row-quantized mobile sheet, coach guide, About/trust copy, feedback accuracy tooling, dev-only venue editing, and console/operational hardening. Typecheck, lint, and 213 Vitest files / 1,960 tests are green. Tier-B iteration 2 converged with no new surviving findings and security 0/0/0. Protected production/Supabase evidence remains outstanding, and final Git closeout is blocked by the approval quota.

**Timing:** started 2026-07-18T11:27:25Z; completed in progress — elapsed 488h 22m (≈64h 26m AI-run, ≈423h 56m human/idle wait); resumed 10×.

**Stories:**
1. 12-1 provider-hours policy — pre-existing done; provider-neutral/no-Google-durable-hours policy retained
2. 12-2 feedback accuracy loop — landed; review; server-owned evidence verification and reporting hardened
3. 12-3 persisted real-scale day series — landed; review; protected 42+ venue cold-p95 and Production-environment proof outstanding
4. 12-4 console hygiene — landed; done; hydration/MapLibre console contract guarded
5. 12-5 dev-only venue editor — landed; done; localhost/dev authorization, bounds, visibility, geometry, and media guards hardened
6. 12-6 simplified public pin model — landed; review; amber percentage vs grey no-number contract
7. 12-7 live venue resolver — landed; review; protected visibility migration/type proof outstanding
8. 12-8 About/legend trust copy — landed; done; public accuracy/confidence framing corrected
9. 12-9 row-quantized mobile sheet — landed; review; real row-count/gesture behavior covered
10. 12-10 bounded venue-detail prefetch — landed; done; exact-key placeholder and candidate-scoped cooldown hardened
11. 12-11 first-run coach guide — landed; done; full-concurrency future-date response wait remains a stabilization item
12. 12-12 Supabase venue media — landed; review; protected Storage migration/policy proof outstanding
13. 12-13 internal-only confidence — landed; review; public confidence surfaces removed
14. 12-14 selected-time availability — landed; review; manual mobile/desktop open/closed visuals accepted and canonical review gate passed

**Skipped (already done):** 12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours (already done before this run)

**Integration review:** Tier B ran two complete chunked iterations over the whole epic with 6 logical lenses (ab-deep + independent ab-alt-deep) and a single dedicated security review. Iteration 1 triaged 32 patches (9 High, 23 Med; 0 Decisions/Defers), all fixed and verified. Iteration 2 covered 17 chronological chunks: primary 0 blind / 1 edge / 7 auditor candidates; secondary 10 blind / 10 edge / 7 auditor; security HIGH 0 / MEDIUM 0 / LOW 0. Joint triage retained 0 new findings and dismissed 17 final-tree candidates (6 artifact-only, 9 false-positive/current-contract, 2 duplicate/already-fixed). Gate exit-clean: 0 non-deferred, all 6 lenses ran. convergence_unverified remains sticky from earlier high-severity history, so any eventual PR must be draft/caveated.

**Epic gate:** Trace FAIL at the 2-pass remediation cap: 21 material rows = 15 FULL, 6 PARTIAL, 0 UNCOVERED; remaining gaps are protected production p95/no-recompute proof, protected GitHub Production environment/live Supabase visibility migration, protected Storage-policy proof, concurrent visibility/cache evidence, and the Story 12.11 full-concurrency stability lane. NFR: Performance FAIL, Security FAIL, Reliability/Maintainability/Deployability CONCERNS because protected/live evidence is absent. Test review: 82/100 Grade B, Request Changes. These are launch gates, not claims of missing implementation.

**TEA:** Epic-level trace, NFR, and test-review artifacts are complete. Gate remediation added targeted coverage in two iterations. Final local checks: npx tsc --noEmit PASS; npx eslint . --quiet PASS; npx vitest run PASS (213 files / 1,960 tests). Story 12.14 focused Playwright passed 8/8 and its canonical story-review gate passed after user-authorized manual visual evidence.

**UAT:**
1. Setup: run `cd C:\Users\Rasmus\sunnyseat\nextjs-app && npm run dev`; use mobile 390x844 and desktop 1440x900, with Console/Network open -> app serves locally without hydration errors or new SunnySeat/MapLibre main-thread warnings
2. Clear onboarding state on mobile `/` -> welcome overlay appears once over the map; choose `Hoppa till Göteborgs centrum` -> map, pins, and list become usable
3. Returning-user desktop `/?_time=16:30` -> map/list/planner load without onboarding and no venue request contains stale date `2026-05-20`
4. Visual pass `/?_state=map-primary&_time=14:00` mobile and `/?_time=16:30` desktop -> planner, map, pins, sheet/panel, Swedish list, and navigation match their canonical viewport layout without clipping
5. Inspect map pins visually and in the accessibility tree -> amber pins show sun + seating percentage + sunny label; grey shade/cloud pins show cloud/no number + not-sunny label; every pin is keyboard-activatable with visible focus and >=44x44 target
6. Open `/?_state=map-with-obscured-venue&_time=14:00` on both viewports -> obscured venue is grey/no-number and selected copy says `Sol bakom moln` without amber or confidence wording
7. Open `/?_state=map-panel-venues&_time=14:00` and `/favoriter?_state=favourites-tab&_time=14:00` -> genuinely sunny rows sort ahead of grey rows; no visible/hidden `Säkerhet`, `Confidence`, `~NN%`, or secondary confidence percentage appears
8. Open sunny and obscured venue-detail forced states on mobile/desktop -> selected-time hours, distance/address, route, feedback/reviews, and correct sunny/grey hero render; no confidence metadata appears visibly or in accessibility names
9. From `/?venue=test-venue-sunny&_time=14:00`, choose `Visa Rutt` -> route overlay has usable directions/fallback and no empty separator/confidence number; uncertainty copy for `cafe-halvvags` remains qualitative only
10. Open feedback state, answer and submit -> thank-you state appears with no public confidence; Network payload contains server-verifiable prediction evidence including the hidden internal fields
11. Drag the mobile time slider and select tomorrow -> badge follows the thumb, time commits on release, calendar restores focus, same-date scrub produces zero venue/weather requests, and date change produces exactly one venue-list request
12. Exercise `_sheetRows=0|1|3|max` -> resting sheet shows only complete rows, tracks finger without a map gap, scrolls internally at max, retains height when selecting a venue, and ArrowUp/ArrowDown moves one row with reduced-motion respected
13. Open `venue-photo-loaded` and `venue-photo-fallback` states on mobile/desktop -> list/card/detail use card/hero renditions when loaded and branded initials/placeholders with no broken-image icon on failure
14. Observe detail prefetch after initial settle -> at most six candidates and concurrency two; opening a prefetched/selected-intent venue duplicates no request, switching venue updates the surface/URL, and a throttled cold detail shows accessible in-place loading before replacement
15. After 21:00 Stockholm time, blur the live planner -> visible/accessibility time remains the true live value while only the thumb is clamped; shaded/night detail never fabricates a stale percentage
16. Open `/about` on mobile/desktop -> legend precedes algorithm; amber 70% is explained as seating-area exposure, grey is no-number, confidence is internal-only, data sources are accurate, no fake 85%/Google-hours claim appears, and navigation/focus are accessible
17. Run first-guide, middle-guide, Settings relaunch, keyboard trap/Escape, reduced-motion, and cross-tab seen-state flows -> guide anchors to mounted controls, restores Settings focus, never opens feedback/detail during list guidance, and syncs dismissal
18. At 14:00, Kafé Magasinet is discoverable/open; at 09:00 partial search `Kafé` excludes it but exact `Kafé Magasinet` remains labelled `Stängt vid vald tid` and opens detail without a pin/open claim
19. Open `/favoriter?_state=map-selected-time-closed&_time=09:00` -> saved closed venue remains accessible/openable, stays labelled closed, and does not regain a map pin; unknown-hours Brygghuset Lerum remains visible without an open/closed claim
20. Request `/api/venues` with 51 ids -> 400 at-most-50; exercise feedback 201 sunny/grey/weather-gated bodies plus contradictory 400, missing 404, and venueId mismatch 409 paths
21. With migrated disposable/live Supabase, verify public ID/slug reviews/feedback identity, hidden/deleted/collision non-leaking failures, no-store reads, absent/public/hidden/public transitions, and precompute hidden projection
22. Run without and with `SUNNYSEAT_ADMIN=dev`, plus a production build -> editor is absent when disabled, production route is hard-denied, and localhost editor validates coordinate bounds, polygons, visibility, tags/description, managed media, reset, and cache contracts
23. Protected Story 12.7: apply `20260718214954_add_public_venue_visibility.sql`, regenerate types, and inspect schema/data -> `hidden` is boolean NOT NULL DEFAULT false and live queries have no 42703/contract diff
24. Protected Story 12.12: apply Storage migration and run `node scripts/upload-venue-media.mjs ...` with optimized WebP -> exact card/hero paths upload create-only without secret output; duplicates, wrong names/types/sizes, browser writes, and unauthorized policy paths fail
25. Protected Story 12.3: cold-request the 42+ venue central viewport -> p95 <= ~5s with persisted geometry and zero request-path provider recompute; missing current hash returns machine-readable 503; weather re-gates unchanged geometry; scheduled coverage spans today through max future + 1
26. Protected operations: verify geometry/weather RPC/table grants are service-role-only, GitHub Production configuration exists without committed secrets, retired warmer is absent, feedback accuracy report emits ranked evidence, and `SUNNYSEAT_COVERAGE_CAP` is absent in Vercel
27. Final regression: rerun typecheck, quiet lint, full Vitest, and focused Epic 12 Playwright/request-count/visual states -> all pass or any failure is recorded with exact command/scope

**Overrides:** User-approved dependency order; user authorized manual visual acceptance for all remaining stories and required mobile/desktop resources to accompany validation asks.

**Open questions:** (none)

**Deferred work:**
1. [12-3] Capture protected-production 42+ venue cold-p95/no-recompute evidence and protected GitHub Production configuration proof
2. [12-7] Apply the visibility migration, regenerate Supabase types, and verify the protected live/disposable route contract
3. [12-12] Apply the Storage migration and verify protected service-role upload, public reads, create-only behavior, and no browser writes
4. [12-11] Stabilize or narrow the mobile future-date exact-response wait under full-suite concurrency
Epic-end reconciliation marked 4 missed completions; 10 total resolved entries were atomically moved to deferred-work-resolved.md; 95 unresolved/conditional entries remain active.

**Auto-decided (epic mode):**
1. [12-7] Adopted canonical `hidden boolean not null default false` after schema probes found the referenced visibility columns absent; no protected database mutation was performed
2. [12-5] Retained the accessibility-safe public pin color with explicit visual rebaseline/acceptance evidence
3. [12-11] Preserved enough Settings state after guide close so focus returns to `Visa guide igen` rather than the map fallback

**Planning drift:** Structural: Story 12.1 Google-hours framing became a provider-neutral weekly-hours/manual-review workflow; Story 12.10 broad prefetch wording narrowed to initial-settle-only, six candidates, concurrency two, no restart/10 km expansion; Story 12.14 closed-venue policy became exact-name closed search plus openable grey favourites. Detail/product drift: 12.8/12.13 moved all confidence internal. Execution/operational drift: 12.7 mocks/local proof could not establish migrated live truth, and protected launch evidence became epic-boundary follow-up rather than story-local finish work. Re-sync epics/PRD/architecture before the next feature epic; use correct-course if the structural policy changes are carried forward.

**⚠️ Needs human:**
1. Restore/approve Git write capacity: the required staging approval was rejected because the Codex usage/approval quota is exhausted until 2026-08-12 18:30; closing docs/report/state are therefore uncommitted
2. Run and approve the protected Story 12.3 production performance/coverage/environment evidence
3. Apply and verify the Story 12.7 visibility migration/types against protected Supabase
4. Apply and verify the Story 12.12 Storage migration/policies against protected Supabase
5. Resolve the Story 12.11 full-concurrency future-date wait and approve the eight stories still at BMAD review

**Next:** When Git staging approval becomes available, explicitly stage only the E8a/E8b artifacts and report/state files (preserving the unrelated map-primary/evidence/validation working-tree items), commit the closing docs and pipeline report, run the caveated local finalize plan (no story status flips), mark the epic anchor done, and commit final state. Protected evidence must then be collected and the epic gates re-run before launch approval.

## Report — 2026-08-07T20:42:19Z (final - caveated)

**Epic:** `12` — 14 stories.
**Branch:** `epic/12-real-venue-launch-readiness-perf-trust-hours-console-hygiene` (HEAD `d5200a4`).
**Pipeline status:** Local caveated completion: all Epic 12 implementation, automated verification, manual visual evidence, two-pass integration review, gate artifacts, project-context refresh, deferred-work archive, and retrospective are committed. Git mode is local, so no push or PR was attempted. Trace remains FAIL at the two-pass cap and convergence_unverified remains sticky; therefore no BMAD story statuses are flipped and the epic is not launch-ready.
**Continues:** 2026-08-07T19:50:17Z halted report at HEAD e58cd5a; resumed after explicit Git staging/final-commit approval.

**Summary:** All 13 fresh Epic 12 stories landed on the epic branch and Story 12.1 was pre-existing done. The final application tree passes typecheck, quiet lint, and 213 Vitest files / 1,960 tests. Tier-B iteration 2 converged with zero new surviving findings and dedicated security review 0/0/0. The remaining work is protected production/Supabase evidence, one Story 12.11 concurrency stabilization item, and human approval of the eight review stories.

**Timing:** started 2026-07-18T11:27:25Z; completed in progress — elapsed 489h 14m (≈64h 26m AI-run, ≈424h 48m human/idle wait); resumed 11×.

**Stories:**
1. 12-1 provider-hours policy â€” pre-existing done; provider-neutral/no-Google-durable-hours policy retained
2. 12-2 feedback accuracy loop â€” landed; review; server-owned evidence verification and reporting hardened
3. 12-3 persisted real-scale day series â€” landed; review; protected 42+ venue cold-p95 and Production-environment proof outstanding
4. 12-4 console hygiene â€” landed; done; hydration/MapLibre console contract guarded
5. 12-5 dev-only venue editor â€” landed; done; localhost/dev authorization, bounds, visibility, geometry, and media guards hardened
6. 12-6 simplified public pin model â€” landed; review; amber percentage vs grey no-number contract
7. 12-7 live venue resolver â€” landed; review; protected visibility migration/type proof outstanding
8. 12-8 About/legend trust copy â€” landed; done; public accuracy/confidence framing corrected
9. 12-9 row-quantized mobile sheet â€” landed; review; real row-count/gesture behavior covered
10. 12-10 bounded venue-detail prefetch â€” landed; done; exact-key placeholder and candidate-scoped cooldown hardened
11. 12-11 first-run coach guide â€” landed; done; full-concurrency future-date response wait remains a stabilization item
12. 12-12 Supabase venue media â€” landed; review; protected Storage migration/policy proof outstanding
13. 12-13 internal-only confidence â€” landed; review; public confidence surfaces removed
14. 12-14 selected-time availability â€” landed; review; manual mobile/desktop open/closed visuals accepted and canonical review gate passed

**Skipped (already done):** 12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours (already done before this run)

**Integration review:** Tier B completed two chunked whole-epic iterations with six logical lenses plus dedicated security. Iteration 1 persisted and fixed 32 patches (9 High, 23 Med). Iteration 2 reviewed 17 chronological chunks, retained zero new findings after joint triage, and exited clean with all six lenses complete. Security findings: HIGH 0 / MEDIUM 0 / LOW 0. The earlier high-severity history keeps convergence_unverified sticky, so any future PR must be draft/caveated.

**Epic gate:** Trace FAIL at remediation cap: 21 material rows = 15 FULL, 6 PARTIAL, 0 UNCOVERED. Remaining gaps require protected production p95/no-recompute proof, protected GitHub environment/live visibility migration, protected Storage-policy proof, concurrent visibility/cache evidence, and Story 12.11 full-concurrency stability. NFR: Performance FAIL, Security evidence FAIL, Reliability/Maintainability/Deployability CONCERNS. Test review: 82/100 Grade B, Request Changes.

**TEA:** Epic trace/NFR/test-review artifacts and two remediation iterations are committed. Final local verification: npx tsc --noEmit PASS; npx eslint . --quiet PASS; npx vitest run PASS (213 files / 1,960 tests). Story 12.14 focused Playwright passed 8/8 and the canonical story-review gate passed with user-authorized manual mobile/desktop visual evidence.

**UAT:**
1. Setup: run `cd C:\Users\Rasmus\sunnyseat\nextjs-app && npm run dev`; use mobile 390x844 and desktop 1440x900, with Console/Network open -> app serves locally without hydration errors or new SunnySeat/MapLibre main-thread warnings
2. Clear onboarding state on mobile `/` -> welcome overlay appears once over the map; choose `Hoppa till GÃ¶teborgs centrum` -> map, pins, and list become usable
3. Returning-user desktop `/?_time=16:30` -> map/list/planner load without onboarding and no venue request contains stale date `2026-05-20`
4. Visual pass `/?_state=map-primary&_time=14:00` mobile and `/?_time=16:30` desktop -> planner, map, pins, sheet/panel, Swedish list, and navigation match their canonical viewport layout without clipping
5. Inspect map pins visually and in the accessibility tree -> amber pins show sun + seating percentage + sunny label; grey shade/cloud pins show cloud/no number + not-sunny label; every pin is keyboard-activatable with visible focus and >=44x44 target
6. Open `/?_state=map-with-obscured-venue&_time=14:00` on both viewports -> obscured venue is grey/no-number and selected copy says `Sol bakom moln` without amber or confidence wording
7. Open `/?_state=map-panel-venues&_time=14:00` and `/favoriter?_state=favourites-tab&_time=14:00` -> genuinely sunny rows sort ahead of grey rows; no visible/hidden `SÃ¤kerhet`, `Confidence`, `~NN%`, or secondary confidence percentage appears
8. Open sunny and obscured venue-detail forced states on mobile/desktop -> selected-time hours, distance/address, route, feedback/reviews, and correct sunny/grey hero render; no confidence metadata appears visibly or in accessibility names
9. From `/?venue=test-venue-sunny&_time=14:00`, choose `Visa Rutt` -> route overlay has usable directions/fallback and no empty separator/confidence number; uncertainty copy for `cafe-halvvags` remains qualitative only
10. Open feedback state, answer and submit -> thank-you state appears with no public confidence; Network payload contains server-verifiable prediction evidence including the hidden internal fields
11. Drag the mobile time slider and select tomorrow -> badge follows the thumb, time commits on release, calendar restores focus, same-date scrub produces zero venue/weather requests, and date change produces exactly one venue-list request
12. Exercise `_sheetRows=0|1|3|max` -> resting sheet shows only complete rows, tracks finger without a map gap, scrolls internally at max, retains height when selecting a venue, and ArrowUp/ArrowDown moves one row with reduced-motion respected
13. Open `venue-photo-loaded` and `venue-photo-fallback` states on mobile/desktop -> list/card/detail use card/hero renditions when loaded and branded initials/placeholders with no broken-image icon on failure
14. Observe detail prefetch after initial settle -> at most six candidates and concurrency two; opening a prefetched/selected-intent venue duplicates no request, switching venue updates the surface/URL, and a throttled cold detail shows accessible in-place loading before replacement
15. After 21:00 Stockholm time, blur the live planner -> visible/accessibility time remains the true live value while only the thumb is clamped; shaded/night detail never fabricates a stale percentage
16. Open `/about` on mobile/desktop -> legend precedes algorithm; amber 70% is explained as seating-area exposure, grey is no-number, confidence is internal-only, data sources are accurate, no fake 85%/Google-hours claim appears, and navigation/focus are accessible
17. Run first-guide, middle-guide, Settings relaunch, keyboard trap/Escape, reduced-motion, and cross-tab seen-state flows -> guide anchors to mounted controls, restores Settings focus, never opens feedback/detail during list guidance, and syncs dismissal
18. At 14:00, KafÃ© Magasinet is discoverable/open; at 09:00 partial search `KafÃ©` excludes it but exact `KafÃ© Magasinet` remains labelled `StÃ¤ngt vid vald tid` and opens detail without a pin/open claim
19. Open `/favoriter?_state=map-selected-time-closed&_time=09:00` -> saved closed venue remains accessible/openable, stays labelled closed, and does not regain a map pin; unknown-hours Brygghuset Lerum remains visible without an open/closed claim
20. Request `/api/venues` with 51 ids -> 400 at-most-50; exercise feedback 201 sunny/grey/weather-gated bodies plus contradictory 400, missing 404, and venueId mismatch 409 paths
21. With migrated disposable/live Supabase, verify public ID/slug reviews/feedback identity, hidden/deleted/collision non-leaking failures, no-store reads, absent/public/hidden/public transitions, and precompute hidden projection
22. Run without and with `SUNNYSEAT_ADMIN=dev`, plus a production build -> editor is absent when disabled, production route is hard-denied, and localhost editor validates coordinate bounds, polygons, visibility, tags/description, managed media, reset, and cache contracts
23. Protected Story 12.7: apply `20260718214954_add_public_venue_visibility.sql`, regenerate types, and inspect schema/data -> `hidden` is boolean NOT NULL DEFAULT false and live queries have no 42703/contract diff
24. Protected Story 12.12: apply Storage migration and run `node scripts/upload-venue-media.mjs ...` with optimized WebP -> exact card/hero paths upload create-only without secret output; duplicates, wrong names/types/sizes, browser writes, and unauthorized policy paths fail
25. Protected Story 12.3: cold-request the 42+ venue central viewport -> p95 <= ~5s with persisted geometry and zero request-path provider recompute; missing current hash returns machine-readable 503; weather re-gates unchanged geometry; scheduled coverage spans today through max future + 1
26. Protected operations: verify geometry/weather RPC/table grants are service-role-only, GitHub Production configuration exists without committed secrets, retired warmer is absent, feedback accuracy report emits ranked evidence, and `SUNNYSEAT_COVERAGE_CAP` is absent in Vercel
27. Final regression: rerun typecheck, quiet lint, full Vitest, and focused Epic 12 Playwright/request-count/visual states -> all pass or any failure is recorded with exact command/scope

**Overrides:** User-approved dependency order; manual visual acceptance authorized for all remaining stories with mobile/desktop resources supplied for validation.

**Open questions:** (none)

**Deferred work:**
1. [12-3] Capture protected-production 42+ venue cold-p95/no-recompute evidence and protected GitHub Production configuration proof
2. [12-7] Apply the visibility migration, regenerate Supabase types, and verify the protected live/disposable route contract
3. [12-12] Apply the Storage migration and verify protected service-role upload, public reads, create-only behavior, and no browser writes
4. [12-11] Stabilize or narrow the mobile future-date exact-response wait under full-suite concurrency
Epic-end reconciliation marked 4 missed completions; 10 total resolved entries were archived; 95 unresolved/conditional entries remain active.

**Auto-decided (epic mode):**
1. [12-7] Adopted canonical `hidden boolean not null default false` after schema probes found the referenced visibility columns absent; no protected database mutation was performed
2. [12-5] Retained the accessibility-safe public pin color with explicit visual rebaseline/acceptance evidence
3. [12-11] Preserved enough Settings state after guide close so focus returns to `Visa guide igen` rather than the map fallback

**Planning drift:** Structural: provider-neutral hours replaced the historical Google-hours framing; detail prefetch narrowed to initial-settle/six candidates/concurrency two/no restart; selected-time policy retained exact-name closed search and openable grey favourites. Product: confidence became internal-only. Execution: local mocks could not establish live migrated visibility, and protected launch evidence became epic-boundary follow-up. Re-sync epics/PRD/architecture before the next feature epic.

**⚠️ Needs human:**
1. Collect and approve protected Story 12.3 production performance, coverage, grants, and GitHub-environment evidence
2. Apply and verify the Story 12.7 visibility migration and regenerated types against protected Supabase
3. Apply and verify the Story 12.12 Storage migration, service-role uploads, public reads, and no-browser-write policies
4. Resolve the Story 12.11 full-concurrency future-date wait, re-run the epic gates, and approve the eight stories still at BMAD review

**Next:** Commit this pipeline report, run the caveated local finalize predicate (no story status flips), mark the epic anchor done, and commit final state. Then collect protected evidence and re-run gates before launch approval.
