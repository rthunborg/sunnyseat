# auto-bmad epic report log — epic-11

## Report — 2026-07-05T20:24:23Z (final — caveated)

**Epic:** `11` — 8 stories.
**Branch:** `epic/11-feels-instant-reads-clear` (HEAD `f2af019`).
**Pipeline status:** Draft PR (deliberate): all 8 stories landed, gates PASS, review converged clean — but the 11-7 High auto-decision (PNG rebaseline re-capture) requires the maintainer's blessing, so convergence_unverified ships the epic as a draft and all stories stay at review.
**Continues:** (none — first run)

**Summary:** Epic 11 'Feels Instant, Reads Clear': time scrubbing is now zero-fetch via a server-computed 61-step client day series (date changes fetch exactly once under a dim+spinner overlay with markers persisting); the slider thumb drags for real (incl. real CDP touch) with the planner clamped to today->today+3 and a live-ticking today-minimum; mobile gets tag-filter chips + a four-snap bottom sheet with retuned gesture physics; the quick-info card and venue detail are reworked to the reference (honest opening hours, no fabricated first paint, single empty-reviews state, AA-fixed amber badge); the map is de-dulled with a living location dot and viewport-aware recentering; three epics of hygiene debt closed (fail-loud vercel install, scoped LF policy + isolated renorm, dead-export deletion, 12-pair PNG rebaseline staged); and the epic's anti-'shipped-but-insufficient' thesis is locked in CI as standing request-count + real-touch + wiring-contract gates.

**Timing:** started 2026-07-04T15:28:43Z; completed in progress — elapsed 28h 55m (≈27h 07m AI-run, ≈1h 48m human/idle wait).

**Stories:**
1. 11-1 client-side-day-series — review; Tier A: Changes Requested -> fixed (1 Med favourites-derivation gap); security clean; trace advisory PASS
2. 11-2 time-slider-drag-fix-planner-range-rules — review; Tier A: 2 Med Decisions auto-fixed (state-layer min clamp; touch project wired into CI) + 1 Low patch; 1 Low deferred; trace advisory PASS
3. 11-3 mobile-tag-filtering-bottom-sheet-overhaul — review; Tier A: Approve (favourites-parity Med auto-fixed; reduced-motion Med dismissed as accommodation); 1 Med deferred (jsdom overflow proof)
4. 11-4 venue-quick-info-rework — review; Tier A: Approve (1 Low dead-prop fixed, 1 Low dismissed); security clean
5. 11-5 map-legibility-location-dot-recenter — review; Tier A: Approve, 0 fixable (2 minor Lows deferred); axe green after de-dull
6. 11-6 venue-detail-clean-first-paint — review; Tier A: Approve, 0 fixable (1 Low deferred to the 11-7 rebaseline); amber badge fixed to 5.63:1
7. 11-7 hygiene-deferred-debt — review; Tier A: Changes Requested -> fixed (HIGH byte-identical PNG pair re-captured with pairwise-distinct proof — the draft-forcing auto-decision; File-List Low fixed; 2 doc Lows deferred)
8. 11-8 live-verification-pass — review; Tier A: Approve (1 Low string fix); full matrix green; standing CI gates promoted + wiring-contract guards added

**Skipped (already done):** (none)

**Integration review:** Tier B ran 2 iterations at cap. Iter 1: 8 per-story chunks x 6 lenses (ab-deep + ab-alt-deep) + whole-epic security (0/0/0); ~350 raw findings triaged to 14 survivors (0 Crit, 1 High->Defer, 8 Med, 5 Low; 71 dismissed verified-against-source); 6 fixed in-run (52px nav-bar recenter cover, per-step skyCondition through the day series, synchronous isDraggingRef, exact-arg a11y CI-guard regex, required windowDate, addDaysToDateKey guard). Iter 2 (changed window, same roster + security): exit-clean — 0 open non-deferred, ~43 re-raises dismissed (14 already-tracked, 7 verified false positives), 2 self-resolving Defers ledgered; both auditors re-verified the four locked invariants INTACT. convergence_unverified stays TRUE (sticky 11-7 High) -> draft PR by design.

**Epic gate:** trace PASS (P0 14/14 = 100%, P1 8/8 = 100%, overall 25/28 = 89% >= 80%; 0 gaps — the 3 non-FULL rows are the manual-by-design post-merge handoffs). Advisory: NFR PASS (all 6 categories), test review 92/100 Grade A.

**TEA:** Per-story: 11-1/11-2/11-8 HIGH (atdd+automate; 11-1/11-2 also trace-advisory PASS), 11-3/11-4/11-5/11-6/11-7 MED (automate). Epic-level: test design at E2 (18 risks, R-001 critical); epic-end trace/NFR/test-review as above. Suite grew 1120 -> 1365 vitest tests (143 files) + real-touch/chip-parity/scrub-zero-fetch e2e as standing CI gates.

**UAT:**
1. SECTION A - SETUP: start dev (cd nextjs-app && npm run dev, http://localhost:3000); DevTools Network filtered on api/venues; SEED = no engine flags, REAL = SUNNYSEAT_SUN_ENGINE=real + SUNNYSEAT_VENUE_STORE=supabase (key in .env.local; restart dev); prepare ~360px mobile + >=1024px desktop viewports and a GPS fix / Sensors override
2. SECTION B - SCRUB, DATE & RANGE: initial load -> exactly ONE /api/venues request, pins appear
3. Desktop mouse: press-and-hold ON the thumb and drag -> grabs immediately, badge/thumb/fill follow continuously, commits on release
4. Mobile: press-drag ON the thumb -> grabs and follows; tap track away from thumb -> jumps + commits once
5. Same date, drag across steps (09->12->18) and release -> ZERO /api/venues requests; scrub away and back to live now -> still zero (live/off-live same key)
6. Click planner-date-next chevron -> exactly ONE request; during flight the map dims under a gray scrim + spinner with pins STAYING visible; overlay fades, pins update in place
7. Calendar: today + next 3 days enabled, day 4+/past greyed unselectable; disabled in-season beyond-window aria-label 'Datum utanfor planeringsfonstret' vs past 'Datum har passerat'; valid future date -> one request + same overlay; today -> live path
8. Load /?_date=2027-01-01&_time=13:00 -> planner clamps to today (no 2027, no error)
9. Plain URL, date=today -> pre-now track muted/inert, thumb can't drag earlier; keyboard Home/Left stops at the current-time minimum; future date -> full range, no inert segment
10. SECTION C - REAL ENGINE: scrub across the day -> pin %/state, card figures, Mest sol ordering change per step, zero requests
11. Shaded early/late vs midday step -> card/pin flips sunlit <-> Shaded/NoSun tracking the per-step gated value (per-step skyCondition + currentSunStatus)
12. Favourite / out-of-radius venue via /favoriter or deep link, scrub same date -> row figures + Mest sol rank update per step, zero requests
13. curl /api/venues?lat=57.7089&lng=11.9746&radiusKm=1.5&date=<D>&time=13:00 -> each venue carries sunDaySeries with 61 {minutes, sunExposurePercent, currentSunStatus} entries (360-1260); re-issue with If-None-Match -> 304
14. SEED path same curl -> byte-compatible with pre-11.1, NO sunDaySeries on any venue
15. SECTION D - CHIPS & SHEET (mobile): sheet above peek -> scrollable chip row directly UNDER the sort toggles (absent at peek); chip set == desktop strip, same first-seen order; neither renders before tags load
16. Tap a chip -> dark on-pill, list AND pins prune identically; tap again -> restore; zero-match combo -> 'Inga platser hittades' copy, NOT a skeleton
17. Chip toggled on mobile, resize to desktop -> same tag active, identical filtering (shared context)
18. Favourites: mobile chip row disappears in favourites mode and returns on Narmast; desktop strip hidden on /favoriter and returns on /
19. From peek, firm drag down (~64px+) or fast swipe -> COLLAPSED (pill + safe-area only); drag up -> peek -> mid -> full
20. Collapsed: tap a pin above the handle -> map fully interactive (pin selects, sheet raises), no backdrop; body aria-hidden while the handle stays focusable
21. Keyboard on the handle: ArrowDown full->mid->peek->collapsed and STOPS; ArrowUp collapsed->peek->mid->full; Enter/Space cycles peek->mid->full->peek (never lands on collapsed)
22. Gesture physics: slow drag tracks the finger 1:1, settles on release; horizontal chip fling never moves the sheet vertically; at full, list-scroll-to-top then pull down -> sheet drags toward peek with no spurious chip toggle
23. Desktop chip overflow: narrow until overflow -> horizontal scroll + arrows + edge fades; LEFT disabled at far-left; RIGHT pages smoothly and disables at end; widen until fit -> both arrows/fades gone; Tab reaches arrows + every chip, off-screen chip auto-scrolls into view; click/Enter toggles the filter (arrows never toggle)
24. SECTION E - QUICK-INFO (final card): SEED, Kafe Magasinet / Bryggerietsoltak -> single honest opening-hours line (Oppet till 22:00/23:00), NO Sakerhet text, NO sun-window line (both breakpoints)
25. Venue WITHOUT hours (Solplats Magasinsgatan, Cafe Halvvags, Brygghuset Lerum, Skuggans Hus, Bistro Bakgarden) -> no hours line, no fabricated placeholder
26. Route CTA reads only VISA RUTT (no ETA) at both widths; clicking it fires the route and any 'ca N min promenad' ETA appears on the detail/route surface only
27. Narrow mobile (~360px): sunny card layout (badge, heart, name, hours, VISA RUTT + MER INFO) holds; Partial-sun venue -> amber % SOL + Sun icon, no confidence/sun-window; Shaded venue -> low % SOL, no overflow
28. Venue name / MER INFO opens detail; heart toggles favourite; close X dismisses with its transition
29. Screen reader: name -> sun % -> opening hours -> distance (sr-only confidence spoken), no dangling separator. (CloudObscured two-signal state = real-path/weather-gated, not seed-reachable - component-tested)
30. SECTION F - MAP & DOT & RECENTER: desktop + mobile city zoom -> basemap clearly legible under a faint warm tint at every zoom; teardrop amber label contrast not degraded
31. Grant geolocation -> ~24px amber dot, white ring, soft shadow, clearly distinct from venue pins; halo pulses (~2s loop); stays distinguishable at all zooms; never intercepts pointers (pan + pin taps work through it)
32. prefers-reduced-motion + reload + locate -> halo STATIC, dot full-size with ring
33. Mobile recenter (band accounts for sheet cover AND the 52px nav bar): locate at mid -> dot centered in the visible band above the sheet; at full -> centered in the smaller band; at peek/collapsed -> centered lower; search-bar card never covers the landed dot
34. Desktop recenter: list-only -> dot centers RIGHT of the 340px list; with detail open -> centers between list and the 390px panel
35. SECTION G - VENUE DETAIL (final states): forced route mobile 14:00 + desktop 16:30 -> fully loaded (no skeletons): name, OPPET-22:00 pill, type/city/rating, description, chips, Avstand, hours+address, route, reviews
36. Scroll top-to-bottom both breakpoints -> NO Soltider-idag timeline and no orphaned gap; OPPET badge text is #5c4300 on #ffbf00 (clearly legible)
37. Omdomen centered; zero-review venue -> 'Inga omdomen' EXACTLY once, centered; venue with reviews -> cards + count line, no empty message
38. Slow-3G + real pin: streaming detail shows same-sized grey skeletons for badge/hours/address (never fabricated values) while fallback name/type/rating/distance appear immediately; skeleton->content swap has no layout jump; a real venue lacking closesAt shows NO OPPET badge after load
39. SECTION H - MAINTAINER-GATED (at/after PR review): BLESS or reject each of the 12 staged rebaseline PNGs under docs/design/references/screens/ against the live surface + confirm the REBASELINE-LOG entry (dev forbidden from self-blessing)
40. Spot-check the resolved High: mobile map-primary.png = resting de-dulled map with COLLAPSED sheet (no chips/control); map-panel-venues.png = expanded 11-3 sheet (chips + cards); genuinely distinct (md5 eaadf98 vs 5b24572)
41. Obscured re-verify: the 4 obscured references still show intact chrome (slate pill, 'SOL BAKOM MOLN - MULET') matching live
42. POST-MERGE 1 (live Production): date-change wall-clock over >=10 trials -> p95 < 3s recorded (warm/cold noted; a miss is triaged); scrub with Network open -> 0 /api/venues requests; capture the gzipped sunDaySeries payload size
43. POST-MERGE 2 (physical phone on Production): thumb-drag 1:1; all four sheet snaps by gesture with chips usable + map interactive behind collapsed; quick-info clean; tint/dot/recenter correct; detail clean first paint - one screenshot per surface, gaps triaged
44. Branch gate spot-check (not hand-run): mobile+desktop / touch / a11y suites green; a11y-mobile deliberately un-invoked (5.1 fixme debt)

**Overrides:** none

**Open questions:**
1. Test-design left 4 thresholds UNKNOWN for story drafting — all were subsequently SET by their owning stories (payload guard 8000B, collapsed-snap 44px+safe-area, gesture thresholds 64px/96px, light-tint quarter-alpha) — none remain open

**Deferred work:**
1. Maintainer blessing of the 12-pair staged PNG rebaseline (incl. the re-captured distinct map-primary/map-panel-venues pair) — the draft-PR gate
2. Live date-change p95 <3s + scrub=0 measurement against production (post-merge protocol 1; request-count half already a green CI gate)
3. Physical-device gesture sweep with screenshots (post-merge protocol 2)
4. Epic-review defers (ledgered under 'epic review of epic-11'): recenter canvas-clamp High -> 11.8 device pass; query-key derivation shared-helper extraction; CI-wiring guard regex hardening; sheet-touch retry idempotence; MOBILE_TOP_BAR_COVER token mirror; skyCondition-branch unit coverage; lostpointercapture hardening; enforceWindow URL-replace; closesAt is-open DTO signal
5. Dead-export cluster (windowLabelTier/isSunWindowStatus/formatPeakHour) — next hygiene sweep; consider a knip/ts-prune gate
6. sun-engine.test.ts concurrency flake carried across 2 epics (retro flag)
reconcile marked 2 missed completions (toSunStatusToken deleted in 11-7 — evidence: sun-status-presentation.ts + the AC2 contract guard; 9.7 empty-state fixed in 11-3 — evidence: isNearListLoading keyed off the pre-filter count at MapView.tsx:830); archived 2 resolved -> deferred-work-resolved.md; every conditional/blessing-pending entry kept

**Auto-decided (epic mode):**
1. AC4 min-clamp enforced only in component, not in state [Med] -> fix: add minMinutes-aware floor inside setSelectedMinutes/snapSelectedMinutes + the missing below-min-commit state test (Tier A, 11-2-time-slider-drag-fix-planner-range-rules)
2. AC1 real-touch e2e never runs in CI [Med] -> fix: add npx playwright test --project=touch step to build-and-test-nextjs.yml so the thumb-drag proof is a live gate (Tier A, 11-2-time-slider-drag-fix-planner-range-rules)
3. Mobile chip row hidden in favourites but desktop strip is not â€” AC1 parity [Med] -> fix: gate DesktopNavBar TagChipStrip on listMode==='favourites' (mirror the mobile gate) (Tier A, 11-3-mobile-tag-filtering-bottom-sheet-overhaul)
4. 1:1 finger tracking suppressed under prefers-reduced-motion [Med] -> dismiss: jump-on-release is a standard reduced-motion accommodation; AC3's 1:1 describes the default animated path (Tier A, 11-3-mobile-tag-filtering-bottom-sheet-overhaul)
5. AC3 byte-identical rebaseline PNGs (mobile map-primary == map-panel-venues, carried-forward pre-existing duplication) [High] -> fix: re-capture both with an in-DOM different-state assertion + pairwise-distinct check BEFORE maintainer blessing (Tier A, 11-7-hygiene-deferred-debt) — HIGH auto-decision: epic ships draft for human review
6. Recenter omits 52px mobile nav-bar cover [Med] -> fix: add MOBILE_NAV_BAR_COVER=52 to the mobile bottom for non-dismissed snaps (E_review, epic-11)
7. applyDaySeriesDerivation freezes skyCondition on scrub [Med] -> fix: carry skyCondition on VenueDaySeriesEntry and override it in the derivation (E_review, epic-11)
8. TimeSlider isDragging same-tick race [Med] -> fix: back the drag flag with a synchronous isDraggingRef (E_review, epic-11)
9. enforceWindow:false URL-vs-state date divergence [Med] -> defer: accepted 11.2 design; optional URL-replace rides the 11.8 live pass (E_review, epic-11)
10. closesAt ÖPPET badge no is-open guard [Low] -> defer: needs an isOpenNow DTO signal, data-layer change out of epic scope (E_review, epic-11)

**Planning drift:** none — all 8 stories' ACs and design-gate criteria trace cleanly to the 2026-07-04 maintainer-workshop root causes in epics.md; the only drift found was execution-internal asset/prose staleness, resolved toward the verbatim AC text

**⚠️ Needs human:**
1. Bless (or reject) the 12 staged reference PNGs at PR review — this is what un-drafts the PR (UAT Section H items 1-3)
2. Run post-merge protocol 1 (live p95 + scrub=0 + payload size) and protocol 2 (physical-device sweep) against production after merge
3. After blessing + merge: flip the 8 story statuses + epic-11 to done (they stay at review because the caveated epic skips the batch flip)

**Next:** No epic-12 planning exists yet — sprint-status shows no actionable story after epic 11; next run would hard-stop pending new planning.

## Report — 2026-07-06T14:04:38Z (final — caveated)

**Epic:** `11` — 8 stories.
**Branch:** `epic/11-feels-instant-reads-clear` (HEAD `2deb273`).
**Pipeline status:** Post-run iteration on the open draft PR #17: the maintainer's Codex review (8 findings) verified 8/8 REAL and fixed; maintainer-requested basemap recolor landed (bluer water, greener parks) with 10 map-visible reference PNGs re-captured and re-staged. PR stays a DRAFT pending the refreshed blessing.
**Continues:** 2026-07-05T20:24:23Z (final — caveated)

**Summary:** (unchanged — see the 2026-07-05 section; this session adds the external-review fixes and the basemap recolor on top of the landed epic)

**Timing:** started 2026-07-04T15:28:43Z; completed 2026-07-05T20:26:37Z — elapsed 28h 57m (≈27h 07m AI-run, ≈1h 50m human/idle wait); resumed 1×.

**Stories:**
1. (unchanged — all 8 stories as rolled up in the prior section; this session's fixes touch 11-1/11-2/11-3/11-5 surfaces + the venues route, all committed as epic-scoped fixes)

**Skipped (already done):** (none)

**Integration review:** External (Codex) review of PR #17: 8 findings (6 P2, 2 P3) — ALL verified against source and confirmed REAL (0 false positives; notably the slider native-min pointer-geometry mismatch that forced-?_time= e2e structurally masked, and the hidden DesktopNavBar list->planner key flip that broke scrub=0 for the always-mounted nav query). All 8 fixed in commit 224b14c: shared venuePlannerQueryArgs/deriveQueryKeyPlanner (the ledgered shared-helper defer, now materialized), MapControls obstruction refs (no re-fly on snap/panel change), inert collapsed sheet body, day-peak-stable route truncation, 44px chip arrows, reduced-motion chip scrolling, full-span native slider with handler/state clamps, disabled planner-date-next at the window end. Suite 1385/145 after fixes; scrub-zero-fetch, slider-touch, sheet-touch, chip-parity, map-primary e2e all green.

**Epic gate:** (unchanged — trace PASS P0 100%, NFR PASS, test review 92/A; this session added +28 tests: suite now 1393 / 146 files, axe green on both breakpoints after the recolor — R-006 re-verified)

**TEA:** (unchanged; suite total after this session: vitest 1393 / 146 files)

**UAT:**
1. The blessing set is REFRESHED: 10 map-visible reference PNGs re-captured with the new basemap colors (water #7cc0e8, waterway #5fb0df, park #b6e0a6, wood #a6d691 through the unchanged warm tint); mobile venue-detail + venue-detail-obscured unchanged (sheet covers the map). Re-review via the PR image diff (2-up/swipe/onion) + REBASELINE-LOG's dated entry.
2. Pairwise-distinctness re-proven: mobile map-primary (sheet at PEEK, md5 4598871...) vs map-panel-venues (sheet at MID, md5 7bc57cd...) — byte-distinct.
3. Visual spot-check of the recolor: Gota alv / harbour / canals read clearly blue, parks/forests read fresh green, roads/buildings/labels neutral, warm brand tint intact.
4. All other Section A-G walk-through items from the 2026-07-05 section still apply unchanged; Section H (blessing + post-merge protocols) now targets the refreshed set.

**Overrides:** none

**Open questions:**
1. The working tree carries the maintainer's own UNCOMMITTED Epic 12 planning edit to _bmad-output/planning-artifacts/epics.md (+106 lines) — deliberately excluded from this PR; it belongs to the future /auto-bmad 12.1 run

**Deferred work:**
1. Maintainer blessing of the REFRESHED reference set (10 re-captured + 2 unchanged) — still the draft-PR gate
2. Post-merge protocols 1 & 2 (live p95 + scrub=0 + payload size; physical-device sweep) — unchanged
3. Ledger untouched this session (all 8 Codex findings were direct fixes; prior defers stand)
none this session — the reconcile + archive ran in the prior section's session (2 marked, 2 archived)

**Auto-decided (epic mode):** (none)

**Planning drift:** none

**⚠️ Needs human:**
1. Re-review + bless the refreshed 12-PNG set on PR #17 (10 changed again with the new colors), then mark the PR ready and merge
2. After merge: flip the 8 stories + epic-11 to done (unchanged from the prior section)

**Next:** Epic 12 'Cleaner Venue Data' planning is drafted in the maintainer's working tree (uncommitted, out of this PR) — next run: /auto-bmad 12.1 once this PR merges and the planning is committed.
