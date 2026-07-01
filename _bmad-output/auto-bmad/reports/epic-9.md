# auto-bmad epic report log — epic-9

## Report — 2026-07-01T17:50:49Z (final)

**Epic:** `9` — 11 stories.
**Branch:** `epic/9-live-app-hardening-clean-up` (HEAD `eb592d7`).
**Pipeline status:** ✅ Clean completion — all 11 stories (9.0–9.10) landed at review; epic trace gate PASS; Tier-B integration review converged clean after 2 iterations (0 Critical/High). Ready to batch-flip to done and open one PR (final CI verdict in the chat report).
**Continues:** (none — first run)

**Summary:** Epic 9 "Live-App Hardening & Clean-Up" — post-launch remediation of a party-mode live-app triage across 5 root-cause spines (wrong CTA gradient token, fabricated venue metadata, dead/unwired controls, undebounced+uncached time→query engine, onboarding-gate hydration placeholder) plus clean-app deletions and real venue sharing. 11 stories implemented on one epic branch; a genuine latent production bug (unguarded MapLibre project() on a null-coord deep-link venue) found and fixed in 9.10; the Tier-B integration review caught 6 cross-story defects a per-story review structurally could not see (rate-limiter sweeping the feedback POST, orphaned tag chips, half-threaded honest-distance, $-corrupting share text).

**Timing:** started 2026-06-30T14:18:23Z; completed in progress — elapsed 27h 32m (≈1h 47m AI-run, ≈25h 44m human/idle wait).

**Stories:**
1. `9-0-production-gate-...` — review; prod planner-forcing gate (DCE'd from the prod bundle so ?_time=/?_date= are ignored in production); Tier-A passed.
2. `9-1-clean-app-content-sweep` — review; removed fabricated venue-metadata (EXPONERING / BÄST KL. / Platser ute / uncertainty prose) from detail + cards; Tier-A passed.
3. `9-2-design-system-cta-token-fix` — review; CTA gradient gold→bright-amber (no olive) + 'Takterrass' copy fix; Tier-A passed.
4. `9-3-venue-sun-compute-performance-server-caching` — review; server/edge caching (Cache-Control/ETag/304, RPC 14→7) + rate limiter relocated to Edge proxy.ts; Tier-A passed.
5. `9-4-client-query-hygiene-time-change-debounce` — review; single settled fetch + time-drag coalescing + Favoriter-from-cache; Tier-A passed.
6. `9-5-location-onboarding-reliability` — review; first-paint overlay (no map flash) + amber location dot + honest fallback distance; Tier-A passed.
7. `9-6-map-chrome-consolidation-dead-control-cleanup` — review; single control set, wired settings gear, dead chevrons/category buttons removed, bare-Enter search; Tier-A passed.
8. `9-7-tag-filtering-real-data-working-chips` — review; real DB tags + interactive chips (OR/union via shared TagFilterContext); Tier-A passed.
9. `9-8-venue-sharing-real` — review; native share + copy-link/targets modal + ?venue= deep-link; Tier-A Approve (0 Crit/High; 1 Low patch fixed; 2 Med decisions auto-resolved defer/dismiss).
10. `9-9-mobile-venue-quick-info-card-rework` — review; reference-match compact card + planner-clearance + honest distance; Tier-A Approve (0 Crit/High; 1 Low defer).
11. `9-10-mobile-device-verification-pass-regression-guards` — review; mobile verification + regression nets + a real null-coord project() bug fixed & guarded; Tier-A Approve (0 findings).

**Skipped (already done):** (none — all 11 stories processed this run)

**Integration review:** Tier-B integration review (blind/edge/auditor × 2 reviewer models × 3 diff chunks + a full-diff security pass), 2 iterations → converged clean. Iter-1 verdict Changes Requested (0 Critical/High): 6 cross-story defects fixed — rate-limiter GET-scoped (feedback POST no longer collides with the read bucket), orphaned tag-chip pruning (retainTags), honest-distance threaded to the Favoriter list + venue-detail Avstånd card, $-safe share-text interpolation, NaN-distance approximate-label gate, dead shareText removed from ForcedVenueDetailInitialFrame. Iter-2 (convergence): 1 Low false-comment fix (a rate-limit comment/test falsely claimed the feedback route 'keeps its own quota'). Security: 0 exploitable findings (the rate-limit-DoS 'HIGH' from the blind lenses was adjudicated out-of-scope per the security authority). 15 Low deferred; ~40 dismissed. Final: 0 Critical/High/Med open.

**Epic gate:** Trace (blocking) PASS — 30/30 ACs FULL in-CI coverage (P0 5/5, P1 14/14), 0 gaps, no remediation. NFR advisory PASS 4/4 core attributes (0 FAIL; 3 accepted maintainer CONCERNS: live p95, reference-PNG rebaseline, pre-existing mobile e2e reds). Test-review advisory 92/100 (Grade A; 1 Med = MapView.test.tsx 3046-line monolith + 3 Low).

**TEA:** Epic-level test design (E2, prior session); per-story testarch-automate on the med/high stories; epic-end gates trace PASS / NFR PASS / test-review 92/100. Suite grew to 107 files / 953 tests, all green (tsc + eslint clean).

**UAT:**
1. Full 89-step single-session manual checklist across 15 flows (A–O) at `_bmad-output/implementation-artifacts/epic-9-uat-checklist.md` (consolidated from 107 per-story items) — run it setup-first on `npm run dev`.
2. Flows: A setup · B clean-app detail/cards · C CTA gradient · D caching/rate-limit · E query-hygiene/debounce · F onboarding/location · G honest distance (4-surface parity) · H map chrome · I tag chips · J/K sharing (desktop + mobile + deep-links) · L mobile quick-info rework · M mobile verification · N PRODUCTION-ONLY · O optional automated sanity.
3. PRODUCTION-ONLY (need `npm run build && npm run start`): the 9.0 prod planner-gate ignores ?_time=; the 9.5 SW-update single auto-reload.
4. Real-device-only (maintainer): physical native share sheet + the real-GPS onboarding-CTA permission prompt (DevTools emulation does not fire it).

**Overrides:** none

**Open questions:**
1. [9-0] CI e2e runs Playwright against `next dev` (development), so the Story 9.0 prod-gate does NOT fire in CI; the deterministic ?_time= sun specs stay green. Reopen only if the e2e webServer switches to `next build`/`start`.

**Deferred work:**
1. Maintainer [close-out A1]: ONE consolidated reference-PNG rebaseline across 9.1/9.5/9.6/9.7/9.8/9.9 mobile chrome + the new 9.8 share-modal & 9.5 location-dot references — blocks a truthfully-green automated visual gate (host /tmp visual-gate tooling bug; dev agents are forbidden from self-blessing references).
2. Maintainer/preview: capture Story 9.3 live cold/warm p95 latency in a deployed preview (the in-CI signal is the RPC-count + cache-hit tests).
3. Pre-existing (NOT epic-9 regressions, verified RED at HEAD): 2 mobile-only e2e reds (onboarding-CTA geolocation under iPhone-14 emulation; mobile Favoriter 'Sol HH:MM' label) + 1 desktop map-primary:645 planner-bar width; physical real-device spot-check for native share + real-GPS onboarding prompt.
4. 15 Low integration-review defers + ~55 pre-existing cross-epic defers remain in deferred-work.md (all non-blocking robustness/hygiene): e.g. Edge per-isolate rate-limiter (DoS-only), feedback POST intentionally un-edge-throttled, predictionUncertainty/visual-metadata server-side reduction (9.1↔9.7 seam), ShareModal focus-restore + clipboard-absent feedback, STRIPPED_SHARE_PARAMS denylist→allowlist, stale middleware.ts comments.
5. SM/hygiene: retarget the deferred-work.md 'Share action behaviour' entry from the cut Story 6.4 → 9.8; strip ATDD (RED)/skip metadata when a scaffold goes green (test-review convention).
Reconcile marked 0 new resolutions (the one epic-9-landed item — 9.5→9.9 honest-distance — already carries its CLOSED marker; asymmetric keep-on-doubt). Archived 4 fully-resolved entries → deferred-work-resolved.md.

**Auto-decided (epic mode):**
1. [Tier A · 9-8] Share-target tiles render text glyphs not brand icons [Med] → defer (maintainer visual-gate/asset call at rebaseline; logged to deferred-work.md).
2. [Tier A · 9-8] Shipped share targets differ from the reference's 5 tiles [Med] → dismiss (functional-only is the OQ4 anti-dead-control default; strict 5-tile parity would reintroduce dead tiles).
3. [E_review] Detail route + feedback POST swept into the read rate-limit bucket [Med] → fix (GET-scope the limiter; applied + tested).
4. [E_review] DesktopNavBar active tag orphaned with no chip to clear [Med] → fix (retainTags prune to the live tag union; applied + tested).
5. [E_review] Honest-distance annotation missing on Favoriter list + venue-detail Avstånd card [Med] → fix (threaded distanceIsApproximate; applied + tested).
6. [E_review] ForcedVenueDetailInitialFrame dead shareText label [Low] → fix (removed the unused label; applied). NOTE: all 4 E_review decisions + the 2 Tier-A 9-8 decisions were Med/Low — none Critical/High, so none forced a draft PR.

**Planning drift:** Detail-level only, non-blocking (no structural drift, no auto re-sync run): sprint-status 9-0 stale ready-for-dev vs the story file's review (the E_final batch-flip corrects it to done); architecture.md cites a non-existent LocationPermission.tsx (permission flow actually lives in OnboardingScreen.tsx + useGeolocation.tsx); deferred-work.md 'Share action behaviour' still targets the cut Story 6.4 (fulfilled by 9.8 — retarget or remove); ux-design-spec was already correct (9.6 realigned code TO the spec).

**⚠️ Needs human:**
1. OPTIONAL — none of these gate the epic's `done` status or the merge: the consolidated reference-PNG rebaseline [A1] before claiming a green automated visual gate; a live p95 capture in a preview deploy; a physical real-device spot-check of native share + the real-GPS onboarding-CTA prompt. All are the epic's known close-out debt, tracked in the retrospective's action items.

**Next:** (none — Epic 9 is the last authored epic; no Epic 10 exists in epics.md. Epics 4/5/6 remain deferred.)
