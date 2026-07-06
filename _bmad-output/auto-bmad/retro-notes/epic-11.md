## Story epic-11
- [Phase 2 â€” test-design] Epic thesis is anti-'shipped-but-insufficient': epics 9/10 each landed caching/debounce wins yet the user-visible stall survived; the 11.8 gate is deliberately the request-count invariant (scrub=0 requests, date change=1) + real-touch profile, NOT wall-clock alone.
- [Phase 2 â€” test-design] Story 11-7 accuracy: the lightningcss error-swallow is in vercel.json's installCommand ('... || true'), NOT buildCommand as the epic text says â€” fix the install step.
- [Phase 2 â€” test-design] Four thresholds left UNKNOWN by design, to be set at story drafting: light-tint overlay strength (11-5), day-series gzipped payload ceiling (11-1), sheet collapsed-snap height + @use-gesture thresholds (11-3); live date-change p95 unknown until 11-8 measures it.
- [Post-run â€” Codex external review] All 8 findings verified REAL (0 false positives) â€” notable because the 55-lens in-run review missed several (slider native-min geometry, hidden DesktopNavBar key divergence, effect-dependency re-fly). External cross-model review of the assembled PR adds real value on top of the pipeline's own lenses.
- [Post-run â€” Codex external review] The slider geometry bug survived every gate because forced ?_time= sessions disable the today-min â€” deterministic forcing can mask the exact code path it bypasses; add a non-forced live-today e2e variant when a feature is gated on wall-clock state.

## Story 11-1-client-side-day-series-instant-time-scrubbing
- [Phase 5 â€” dev-story] Zero-fetch invariant only held after fixing the liveâ†”off-live query-key boundary: live path emitted a planner-less 'list' key while off-live used 'planner', so the first off-live scrub silently fetched. The load-bearing change is the date-carrying key in BOTH modes via the new isLiveNow flag â€” 11-2/11-8 build on this seam.
- [Phase 5 â€” dev-story] Query keys for useVenueSearch/useFavouriteVenues no longer include time (date-only + coords + isLiveNow) â€” later stories must not reintroduce time into these keys.
- [Phase 5 â€” dev-story] Date-change dim+spinner overlay is a NEW visual state with NO reference PNG â€” self-blessing forbidden; 11-7 owns the consolidated maintainer rebaseline.
- [Phase 7 â€” trace advisory] PASS, 0 uncovered ACs, but AC3 overlay/marker-persistence and the MapView per-step derivation seam (incl. the favourites review fix) are E2E-ONLY guarded (epic-11-scrub-zero-fetch.spec) â€” a jsdom component test would harden the pyramid; location-changeâ†’one-fetch path is unit-only. Epic-end gate should weigh this.
- [Fix pass â€” desktop e2e] The 'planner-date-next not visible on desktop' failure was a SPEC selector trap, not a product bug: both responsive TimeSliderPanel variants are always mounted (CSS-hidden per breakpoint), so DOM-order .first() binds the hidden mobile instance on desktop. Dual-variant e2e selectors must use .filter({ visible: true }), never positional .first()/.last().

## Story 11-2-time-slider-drag-fix-planner-range-rules
- [Phase 3 â€” create-story] Current planner-date rule in HEAD is season-based (Mar 1â€“Oct 31 + >= today), NOT todayâ†’today+3 â€” AC3 is a shared-helper change rippling across six isPlannerDateSelectable consumers + validatePlannerDateTime; dev must reconcile all of them.
- [Phase 3 â€” create-story] No dedicated real-touch Playwright profile exists, but the mobile project (iPhone 14) already has hasTouch:true â€” touch-gesture e2e can run there without a new project.
- [Phase 4 â€” atdd] Real touch is driven via CDP Input.dispatchTouchEvent on the existing mobile (iPhone 14, Chromium) project â€” no new Playwright project needed; desktop self-skips on !hasTouch. Pattern for 11-3/11-8 touch specs.
- [Phase 5 â€” dev-story] Today-min uses FLOOR not ceil â€” ceiling pushes the live 'now' below the min, flips isLiveNow and thrashes the 11-1 date-only query key. Later slider stories must NOT 'fix' it back to ceil.
- [Phase 5 â€” dev-story] The todayâ†’today+3 window is a CLIENT/state concern: validatePlannerDateTime enforces it by default but the server route opts out (enforceWindow:false) so far-future forecast bookmarks keep serving 200. Do not add server-side window rejection.
- [Phase 5 â€” dev-story] New Chromium 'touch' Playwright project (Pixel 5) added for CDP raw-touch specs â€” mobile/iPhone-14 is WebKit and cannot drive Input.dispatchTouchEvent; 11-3/11-8 touch specs should use --project=touch.
- [Phase 7 â€” Tier A review] Pattern to avoid: 'add a Playwright project, forget the CI wiring' â€” the new touch project passed locally but build-and-test-nextjs.yml never invoked it, leaving AC1's only automated proof dormant-green. Fixed in the review pass; check CI wiring whenever a project/profile is added.

## Story 11-3-mobile-tag-filtering-bottom-sheet-overhaul
- [Phase 5 â€” dev-story] @use-gesture release `direction` is 0 at pointer/touch-up â€” decide snap release from accumulated movement sign (releaseDir), never instantaneous direction. Applies to ANY future @use-gesture snap logic.
- [Phase 5 â€” dev-story] Do NOT set pointer:{touch:true} on @use-gesture â€” it ignores synthetic PointerEvents (breaks jsdom/pointer tests); default pointer mode + releaseDir handles both synthetic tests and CDP real touch.
- [Phase 5 â€” dev-story] Turbopack stale-CSS trap: after any globals.css token change, restart next dev with a fresh .next before running touch e2e (token resolved to empty string until restart).
- [Phase 5 â€” dev-story] PRE-EXISTING failure found at baseline: epic-11-scrub-zero-fetch DESKTOP date-change fails â€” 11-1's planner-date-next testid exists in both TimeSliderPanel variants but is not visible/reachable on desktop. Orchestrator dispatching a targeted fix(story-11-1) pass this run.
- [Phase 5 â€” dev-story] PRE-EXISTING axe boundary flake: VenueDetailContent amber sun badge color-contrast 4.47:1 vs 4.5 AA â€” same amber-badge class as Story 5.1 debt. 11-6 (venue-detail rework) MUST land the badge at >=4.5:1 so the axe gate stays deterministically green.

## Story 11-4-venue-quick-info-rework-reference-alignment
- [Phase 3 â€” create-story] Seed path serves raw VENUE_FIXTURE with NO openingHours (no VENUE_DETAIL_SEED merge) â€” AC1's opening-hours render is unreachable in CI unless fixtures seed both present- and absent-cases. Anti-'shipped-but-insufficient' applied to a data field.
- [Phase 5 â€” dev-story] Two MapView integration tests that proved per-time preview refresh via the sun-window TEXT now assert the geometric % SOL badge instead (line removed) â€” same behaviour, different surfaced field; not lost coverage.
- [Phase 5 â€” dev-story] quickInfo.sunUnavailable became fully dead once the sun-window line was removed â€” pruned with the two story-named keys; VenueQuickInfoProps dropped sunTimeRange/routeEstimateLabel/labels.sunUnavailable (MapView was the only consumer).

## Story 11-5-map-legibility-location-dot-recenter
- [Phase 5 â€” dev-story] PRE-EXISTING red at HEAD: map-primary.spec.ts:353 asserts 'ca N min' in QuickInfo â€” a label 11-4 removed. Stale-spec casualty of a landed story; orchestrator dispatching a targeted test fix. Pattern: when a story removes user-visible text, grep the e2e specs for assertions on it.
- [Phase 5 â€” dev-story] CI-wiring gap: the a11y-mobile Playwright project is defined but NOT invoked by build-and-test-nextjs.yml (only --project=a11y runs); it also carries a Story-5.1 test.fixme. Do NOT blind-wire it into CI (would red on known debt) â€” epic retro / Story 5.1 decision.
- [Phase 5 â€” dev-story] OnboardingGate grant flyTo left on default mid-sheet framing (sibling of MapView, no sheet-state access) â€” acceptable; recenter BUTTON is fully viewport-aware via computeRecenterPadding.

## Story 11-6-venue-detail-clean-first-paint-content-polish
- [Phase 5 â€” dev-story] Amber-badge contrast debt CLOSED: --color-amber-badge-text #6d5000 -> #5c4300 (5.63:1); axe.spec.ts:82 venue-detail scan now deterministically green. The token was self-contained to the badge.
- [Phase 5 â€” dev-story] Story guidance said KEEP the peak/best-window helpers for 11-1 coupling â€” that was a code-location misread: the subtitle lived inside the removed forecast section, and the ENGINE sun-engine.ts#peakTimeFromTimeline (same name, different function) + detail.timeline DTO are untouched. 11-1's day-series consumption unaffected.
- [Phase 5 â€” dev-story] Empty-reviews screenshot has no forced-state route â€” maintainer should capture it during the 11-7 rebaseline (behaviourally covered by a component test meanwhile).

## Story 11-7-hygiene-deferred-debt
- [Phase 3 â€” create-story] .gitattributes renormalization footgun fenced: 113 tracked .log artifacts + core.autocrlf=true + ~800 CRLF files mean a blanket '* text=auto' would be unreviewable â€” the story scopes eol=lf to a SOURCE extension set + binary guards, renormalization isolated in its own commit (R-016).
- [Phase 3 â€” create-story] toSunStatusToken grep-verified orphaned (only its own test imports it) â€” story recommends DELETE over wiring-in (wiring would break the byte-identical design gate); never-exhaustiveness survives via windowLabelTier.
- [Phase 5 â€” dev-story] Fail-loud proven with a real injected ETARGET (lightningcss@99.99.99-does-not-exist) â€” the vercel installCommand now fails the build on install error; swallow was installCommand, not buildCommand.
- [Phase 5 â€” dev-story] Renormalization footprint: only 15 files had a genuinely CRLF index (not the ~800 census) â€” the .gitattributes rule mostly locks in future LF-on-commit.
- [Phase 5 â€” dev-story] 11-6's venue-detail rework silently drifted the epic-10 obscured reference PNGs (still showed the removed Solprognos bars) â€” 'shared-surface refs are byte-stable, skip them' is an unsafe assumption; re-capture whenever a shared surface changes.
- [Phase 6 â€” automate] Regex-based config guards need adversarial mutation-checking before commit â€” the ERROR_SWALLOW regex initially missed the '|| :' shell no-op form; a too-loose guard passes silently against the current clean file.
- [Phase 7 â€” Tier A review] The byte-identical PNG pair was a CARRIED-FORWARD pre-existing baseline defect (map-primary == map-panel-venues at the prior commit too) â€” the capture recipe's per-screen state assertion can't catch it. Capture harnesses must assert resulting PNGs are PAIRWISE DISTINCT, not just individually in-state.
- [Phase 7 â€” Tier A review] High auto-decision recorded (epic mode): re-capture before blessing. Epic convergence_unverified set -> PR ships as draft so the maintainer sees the rebaseline before merge.
- [Phase 7 â€” fix pass] map-primary's route has NO state-forcing to collapse the sheet (default mid), so any naive re-capture silently duplicates map-panel-venues again. Durable fix candidate: make ?_state=map-primary force the sheet to peek in MapView so the resting-map reference is reproducible.

## Story 11-8-live-verification-pass-touch-gesture-perf-guards
- [Phase 3 â€” create-story] Seam specs shipped with un-reconciled red-phase headers across the epic (epic-11-scrub-zero-fetch header still says RED PHASE / describe.skip while the body is un-skipped and green) â€” 11-8 reconciles; future ATDD un-skips should update the header in the same change.
- [Phase 5 â€” dev-story] Cross-epic test drift is caught only by full-suite sweeps: 11-4's removal of the visible SÃ¤kerhet chip left a stale CONFIDENCE_BADGE_COPY regex in the epic-10 weather-matrix e2e that no per-story review caught (they ran vitest only). Verification stories should always run the FULL e2e suite.
- [Phase 5 â€” dev-story] The sheet 'map interactive behind collapsed' touch test survived CI only via retries:2 (~66% first-attempt flake) â€” exactly the shipped-but-insufficient fragility 11-8 exists to kill; hardened to deterministic re-aim + bounded retry.
- [Phase 6 â€” automate] The verification story's own thesis ('the gate must keep running') had zero guard on the gate's WIRING â€” CI project invocations + Playwright testMatch/testIgnore routing are now locked by 7 mutation-checked vitest contract guards (a silent --project drop or vacuous 0-spec green now fails fast).

## Story 11-9-venue-data-model-cleanup
- [Phase 3 â€” create-story] The closesAt Ã–PPET-badge is-open-guard deferral names Story 11.9 per-weekday data-layer change as its exact trigger â€” close or re-scope that deferred entry once 11.9 lands (queue-not-archive convention).
- [Phase 4 â€” atdd] AC1 (auto-assign PK) + AC6 (idempotent live migration) have NO runtime test scaffold â€” DB-DDL/RLS criteria proven only by the migration smoke checks; flagged in checklist so *trace reads them as smoke-check-covered, not un-tested.
