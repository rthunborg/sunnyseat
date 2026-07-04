## Story epic-11
- [Phase 2 â€” test-design] Epic thesis is anti-'shipped-but-insufficient': epics 9/10 each landed caching/debounce wins yet the user-visible stall survived; the 11.8 gate is deliberately the request-count invariant (scrub=0 requests, date change=1) + real-touch profile, NOT wall-clock alone.
- [Phase 2 â€” test-design] Story 11-7 accuracy: the lightningcss error-swallow is in vercel.json's installCommand ('... || true'), NOT buildCommand as the epic text says â€” fix the install step.
- [Phase 2 â€” test-design] Four thresholds left UNKNOWN by design, to be set at story drafting: light-tint overlay strength (11-5), day-series gzipped payload ceiling (11-1), sheet collapsed-snap height + @use-gesture thresholds (11-3); live date-change p95 unknown until 11-8 measures it.

## Story 11-1-client-side-day-series-instant-time-scrubbing
- [Phase 5 â€” dev-story] Zero-fetch invariant only held after fixing the liveâ†”off-live query-key boundary: live path emitted a planner-less 'list' key while off-live used 'planner', so the first off-live scrub silently fetched. The load-bearing change is the date-carrying key in BOTH modes via the new isLiveNow flag â€” 11-2/11-8 build on this seam.
- [Phase 5 â€” dev-story] Query keys for useVenueSearch/useFavouriteVenues no longer include time (date-only + coords + isLiveNow) â€” later stories must not reintroduce time into these keys.
- [Phase 5 â€” dev-story] Date-change dim+spinner overlay is a NEW visual state with NO reference PNG â€” self-blessing forbidden; 11-7 owns the consolidated maintainer rebaseline.
- [Phase 7 â€” trace advisory] PASS, 0 uncovered ACs, but AC3 overlay/marker-persistence and the MapView per-step derivation seam (incl. the favourites review fix) are E2E-ONLY guarded (epic-11-scrub-zero-fetch.spec) â€” a jsdom component test would harden the pyramid; location-changeâ†’one-fetch path is unit-only. Epic-end gate should weigh this.

## Story 11-2-time-slider-drag-fix-planner-range-rules
- [Phase 3 â€” create-story] Current planner-date rule in HEAD is season-based (Mar 1â€“Oct 31 + >= today), NOT todayâ†’today+3 â€” AC3 is a shared-helper change rippling across six isPlannerDateSelectable consumers + validatePlannerDateTime; dev must reconcile all of them.
- [Phase 3 â€” create-story] No dedicated real-touch Playwright profile exists, but the mobile project (iPhone 14) already has hasTouch:true â€” touch-gesture e2e can run there without a new project.
- [Phase 4 â€” atdd] Real touch is driven via CDP Input.dispatchTouchEvent on the existing mobile (iPhone 14, Chromium) project â€” no new Playwright project needed; desktop self-skips on !hasTouch. Pattern for 11-3/11-8 touch specs.
- [Phase 5 â€” dev-story] Today-min uses FLOOR not ceil â€” ceiling pushes the live 'now' below the min, flips isLiveNow and thrashes the 11-1 date-only query key. Later slider stories must NOT 'fix' it back to ceil.
- [Phase 5 â€” dev-story] The todayâ†’today+3 window is a CLIENT/state concern: validatePlannerDateTime enforces it by default but the server route opts out (enforceWindow:false) so far-future forecast bookmarks keep serving 200. Do not add server-side window rejection.
- [Phase 5 â€” dev-story] New Chromium 'touch' Playwright project (Pixel 5) added for CDP raw-touch specs â€” mobile/iPhone-14 is WebKit and cannot drive Input.dispatchTouchEvent; 11-3/11-8 touch specs should use --project=touch.
- [Phase 7 â€” Tier A review] Pattern to avoid: 'add a Playwright project, forget the CI wiring' â€” the new touch project passed locally but build-and-test-nextjs.yml never invoked it, leaving AC1's only automated proof dormant-green. Fixed in the review pass; check CI wiring whenever a project/profile is added.
