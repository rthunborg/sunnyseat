# auto-bmad report log — 11-9-venue-data-model-cleanup

## Report — 2026-07-06T18:15:14Z (final)

**Story:** `11-9-venue-data-model-cleanup` (epic 11, story 9) — last-in-epic.
**Branch:** `story/11-9-venue-data-model-cleanup` (HEAD `6ee103a`).
**Pipeline status:** âœ… clean completion â€” all phases ran; review converged cleanly; epic-11 trace gate PASS; live DB migrated + verified (CI/PR outcome is chat-only, post-write)
**Continues:** (none â€” first run)

**Timing:** started 2026-07-06T14:29:45Z; completed in progress — elapsed 3h 45m (≈3h 32m AI-run, ≈12m human/idle wait).

**Phases run:** Phase 0 (triage: ab-alt-standard), Phase 1, Phase 3 (ab-deep), Phase 4 (ab-standard), Phase 5 (ab-deep), Phase 6 (ab-standard), Phase 7 Ã—2 iterations (lenses: ab-deep + ab-alt-deep; security: ab-security; fixes: ab-standard), Phase 8 (trace: ab-deep; nfr/test-review/project-context/reconcile: ab-standard; retro: ab-alt-standard), Phase 9
**Skipped:** Phase 2 (both gates false: mid-epic, project-context exists), Phase 7 tail trace-advisory (not selected â€” last-story distance gate)

**Overrides:** none from the invocation (--story 11-9). Deliberate constraint: effective base branch is epic/11-feels-instant-reads-clear, not main â€” epic 11 is unmerged on draft PR #17 and main lacks the 11.9 definition; the story PR stacks onto #17.

**TEA:** Triage HIGH (live-DB schema migration) â†’ atdd + automate. ATDD: 4 scaffold files / 26 red-phase blocks (AC1/AC6 smoke-check-covered by design). Automate: +23 unit tests (suite 152 files / 1439â†’1440 green). Epic-end gates: trace PASS (P0 18/18, P1 8/8, P2 4/4, overall 88%; no 11.9 regression), NFR PASS (live-DB RLS/deny-by-default re-verified), test-review 96/100 Grade A.

**Code review:** 2 iterations, dual reviewer roster (ab-deep + ab-alt-deep, 6 lenses/pass) + dedicated security pass each iteration (clean 0/0/0 both). Iter 1: Changes Requested â€” Critical 0 / High 0 / Medium 2 / Low 3 persisted (51 raw â†’ 5 after dedup); 1 Patch fixed (weekday-token never-fabricate), 1 Decision dismissed by human (peakTime seed fallback), 3 deferred; 15 noise dismissed. Iter 2: converged â€” Critical 0 / High 0 / Medium 1 / Low 2 new (58 raw â†’ 3 after dedup vs Round-1 adjudications); 1 Patch fixed (stale ATDD headers), 1 Decision dismissed by human (Ã–ppettider fallback row), 1 deferred; 21 dismissed. Loop gate exit-clean; HITL halt skipped (clean convergence).

**UAT:**
1. Local seed path: `npm run dev` then GET /api/venues â†’ test-venue-sunny has per-weekday openingHours object (keys "1".."7"), no {display,closesAt}, no peakTime/shadowWarningMinutes anywhere
2. Same JSON: solplats-magasinsgatan (ids 3â€“7) has NO openingHours key at all (absent-hours branch, never fabricated)
3. GET /api/venues/test-venue-sunny â†’ detail openingHours per-weekday; timeline has NO peakTime on seed path; no shadowWarningMinutes key
4. GET /api/venues/solplats-magasinsgatan â†’ openingHours serializes as {} (honest empty), not a fabricated display string
5. Click KafÃ© Magasinet pin â†’ quick-info shows bold "Ã–ppet till 22:00" (bryggeriet-soltak: "Ã–ppet till 23:00")
6. Quick-info for a venue without hours (Solplats Magasinsgatan / CafÃ© HalvvÃ¤gs) â†’ NO "Ã–ppet tillâ€¦" line at all
7. Switch to English locale, reopen KafÃ© Magasinet quick-info â†’ "Open until 22:00" (locale-aware template)
8. Detail view KafÃ© Magasinet â†’ amber "Ã–PPET Â· 22:00" pill next to title + Ã–ppettider row "Ã–ppet till 22:00" (EN: "OPEN Â· 22:00")
9. Detail view for hours-less venue â†’ NO Ã–PPET badge (omitted, no fabricated close time)
10. While detail overlay loads â†’ grey skeleton pill occupies the badge footprint and swaps in-place, no layout jump
11. Live DB: SELECT column_default â€¦ venues.id â†’ (nextval('venues_id_seq'::regclass))::text (AC1 auto-assign)
12. Live DB: INSERT a venue WITHOUT id (slug uat-tmp) RETURNING id â†’ next auto text id (e.g. "8"); then DELETE the row
13. Live DB: information_schema count of peak_time + shadow_warning_minutes columns â†’ 0 (AC3/AC4 dropped)
14. Live DB: SELECT opening_hours WHERE id='1' â†’ per-weekday object, close '22:00' on key '1', NO display key (AC2, gate venue stable)
15. Live DB: seating_area/seating_elevation_m/ground_elevation_m columns still present â†’ 3 (server-only columns untouched, AC6)
16. Live DB: RLS enabled (relrowsecurity = t) with single venues_service_read policy (AC6)
17. Doc: nextjs-app/docs/venue-data-load.md â†’ id row says "auto â€” Do NOT send it"; per-weekday example incl. past-midnight Fri/Sat 02:00 + Sunday null; no peak_time/shadow_warning_minutes rows (AC5)

**Open questions:**
1. Per-weekday jsonb key convention (numeric ISO vs mon..sun) was left to the dev at create-story â€” RESOLVED in Phase 5: numeric ISO keys "1".."7" chosen and ratified in project-context.md

**Deferred work:**
1. [Med] Ã–PPET badge/line has no intra-day/past-midnight is-open-now guard â€” weekday-correctness half solved by 11.9; minute-precise gating deliberately out of scope (ledger, Target: None â€” conditional)
2. [Low] MapView quickInfoOpeningHours memo can go stale across a local-midnight boundary (ledger)
3. [Low] AC3 peakTime route test is a vacuous/no-op guard on the seed path (ledger)
4. [Low] Closed-day + past-midnight opening-hours shapes documented/unit-tested but never seeded on a live row or CI fixture (ledger)
Phase 8 reconcile: 0 of 104 ledger entries marked (delegate verified ~30 non-resolved entries against post-11.9 code; none met the fully-done bar â€” the is-open-guard items remain partial by design). Archive: 0 moved (all 7 marker-hinted entries carry open conditional remainders).

**Planning drift:** epics.md structural-but-deliberate: Epic 12 drafted then dissolved into Epic 11 as Story 11.9 before any code (scope-location change, content intact â€” maintainer decision, no re-sync needed). Story 11.9 detail-level: AC2 'renders NOTHING' strictly unmet for the detail Ã–ppettider row (honest 'Detaljer saknas' fallback kept â€” human-adjudicated won't-fix). No PRD/architecture drift.

**⚠️ Needs human:**
1. Optional (not blocking done): merge the stacked story PR into epic/11-feels-instant-reads-clear so 11.9 rides PR #17
2. Pre-existing epic gate unchanged: PR #17's refreshed 12-PNG set still awaits the maintainer's blessing (the un-draft gate); 11.9 adds nothing to that PNG set

**Next:** story_plan.py would pick 11-1-map-loads-fast-first-paint (review) â€” but stories 11.1â€“11.8 are deliberately parked at review pending PR #17's blessing+merge; no fresh backlog story exists.
