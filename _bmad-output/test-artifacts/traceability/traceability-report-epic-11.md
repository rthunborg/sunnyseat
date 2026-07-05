---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-07-05'
workflowType: 'testarch-trace'
gateType: 'epic'
decisionMode: 'deterministic'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (§Epic 11, lines 2791-3021)'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-11.md'
  - '_bmad-output/implementation-artifacts/11-1..11-8-*.md'
  - '_bmad-output/test-artifacts/traceability/traceability-report-11-1.md'
  - '_bmad-output/test-artifacts/traceability/traceability-report-11-2.md'
---

# Traceability Matrix & Gate Decision — Epic 11

**Epic:** "Feels Instant, Reads Clear" — Time-Scrub Performance, Mobile Interaction & Surface Polish (stories 11.1–11.8)
**Date:** 2026-07-05
**Evaluator:** TEA Agent (Master Test Architect)
**Gate Type:** epic
**Decision Mode:** deterministic
**Story status at trace time:** all 8 stories (11.1–11.8) at `review` on the epic branch.

---

Note: This workflow does not generate tests. If gaps exist, run `*atdd` or `*automate` to create coverage.

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

The epic decomposes into **28 acceptance criteria** (Given/When/Then blocks) across 8 stories
(11.1: 4, 11.2: 4, 11.3: 4, 11.4: 4, 11.5: 3, 11.6: 3, 11.7: 3, 11.8: 3). Priority is inherited
from `test-design-epic-11.md`: the instant-feel + working-touch + honest-content guards map to the
P0 rows (R-001/002/003/004/005/006/007/009/010 + the DTO contract); important interaction/polish
behaviour maps to P1 (R-008/011/012/013/018 + regression); dead-code/i18n/EOL hygiene + drag-feel
edges map to P2 (R-016/017); and the live wall-clock p95 + physical-device sweep + maintainer PNG
blessing are the P3 manual-by-design rows (R-014/015).

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status  |
| --------- | -------------- | ------------- | ---------- | ------- |
| P0        | 14             | 14            | 100%       | ✅ PASS |
| P1        | 8              | 8             | 100%       | ✅ PASS |
| P2        | 3              | 3             | 100%       | ✅ PASS |
| P3        | 3              | 0             | 0%         | ℹ️ INFO (manual by design — R-014/015 + PNG blessing) |
| **Total** | **28**         | **25**        | **89%**    | ✅ PASS |

**Legend:**

- ✅ PASS - Coverage meets quality gate threshold
- ⚠️ WARN - Coverage below threshold but not critical
- ❌ FAIL - Coverage below minimum threshold (blocker)

> Overall = FULL / total = 25/28 = **89%** (well above the ≥80% minimum). **P0 = 100%**, **P1 = 100%**.
> The three non-FULL items are all in the P3 manual-by-design tier — the live date-change p95 wall-clock
> number (11.1 AC4 / 11.8 AC3 live half), the physical-device gesture sweep (11.8 AC1 device half), and
> the maintainer reference-PNG blessing (11.7 AC3 blessing half). Each is the CI-un-automatable portion of
> an AC whose CI-provable half is FULLY covered and green, and each is correctly recorded as a `needs-human`
> post-merge handoff (consolidated in the Story-11.8 Post-Merge Verification Protocol) — NOT fabricated,
> NOT a coverage gap. These are the documented handoffs the run context flagged as "intentional non-CI
> items, NOT coverage gaps." No P0 or P1 gap exists.

---

### Detailed Mapping

> The two per-story advisory reports (`traceability-report-11-1.md`, `traceability-report-11-2.md`)
> already trace 11.1 + 11.2 at FULL. Their conclusions are folded in below and re-verified against the
> current tree; this epic pass extends the same discipline to 11.3–11.8 and rolls up the gate.

#### 11.1-AC1: Day-series in list DTO; client derives all time-dependent UI; a settled time change fetches ZERO requests (P0, R-001/R-003)

- **Coverage:** FULL ✅
- **Tests:**
  - `test/unit/services/sun-engine.day-series-parity.atdd.test.ts` — 61-step **byte-parity** vs single-instant compute at requestedAt + sampled steps; Epic-10 cloud/rain gate applied **per step** (never only "now"); rain threaded under nowcast horizon.
  - `test/unit/utils/venue-day-series.derivation.atdd.test.ts` + `...edge.test.ts` — client derivation of all 5 output surfaces (marker %, pin, quick-info figure, ordering input, obscured presentation); purity/offline; null/sparse/NaN clamp branches.
  - `test/e2e/epic-11-scrub-zero-fetch.spec.ts` — settled same-date scrub = **0** `/api/venues` requests (the R-001 headline); no live api.met.no.
  - `test/unit/utils/venue-day-series-query-key.atdd.test.ts` — same-date scrub = same key (pure query-key builder, deliberate defence-in-depth with the e2e).
- **Recommendation:** None. Parity guard makes a divergence a FAIL not a rebaseline; zero-fetch guarded at unit + e2e (the one sanctioned R-001 double-cover).

#### 11.1-AC2: Series cached per (venue, date, weather-bucket); payload measured + CDN/ETag-friendly (P0/P1, R-012)

- **Coverage:** FULL ✅
- **Tests:**
  - `test/unit/services/sun-engine-day-series-cache.atdd.test.ts` — same bucket served from cache; new weather bucket recomputes; degraded (null-buildings) not pinned; cached == uncached.
  - `test/unit/services/sun-engine-cache.day-series-key.test.ts` — `weatherRefreshBucketMs` floor/boundary; key NOT keyed on the requested instant.
  - `test/unit/api/venues-route-day-series.atdd.test.ts` — real-engine list DTO carries `sunDaySeries` (61 steps); seed/`[slug]` byte-identical; **gzipped payload measured (1769 B) + guard (8000 B)**; ETag/304.
- **Recommendation:** None. The currently-`UNKNOWN` payload ceiling was measured and a guard set at the API level.

#### 11.1-AC3: Date/location change keeps markers mounted under dim + spinner; exactly one request (P0, R-005)

- **Coverage:** FULL ✅ (Design-Gate screenshot deferred by design → 11.7)
- **Tests:**
  - `test/e2e/epic-11-scrub-zero-fetch.spec.ts` — date change = **1** request; markers persist (keyed by id, no remount); `date-change-overlay` dim+spinner visible in-flight.
  - `test/unit/queries/useVenueSearch.day-series-key.test.tsx` + `test/components/MapView.test.tsx` — `isLiveNow` wiring; key flips only on date/location change.
- **Gaps:** (advisory, non-blocking) The date-change overlay + marker-persistence + the MapView per-step derivation seam are asserted only at e2e (per the 11.1 advisory report gap #1). The screenshot of the dim+spinner state is a prescribed 11.7 rebaseline deferral (dev forbidden from self-blessing PNGs), not a coverage gap.
- **Recommendation:** LOW (advisory) — a jsdom component test for the overlay-on-placeholder-data state would harden the pyramid. Does not reduce AC below FULL.

#### 11.1-AC4: Live date-change p95 < 3 s; time-scrub = 0 requests (P0 request-count half / P3 live half)

- **Coverage:** FULL (CI-enforceable half) ✅ / PARTIAL (live wall-clock half — P3 manual-by-design)
- **Tests:**
  - Request-count invariant (scrub=0, date-change=1) → `epic-11-scrub-zero-fetch.spec.ts` + the query-key/hook units (the CI half — FULL).
  - Live wall-clock p95 → recorded as `needs-human` #1 in the 11.8 Post-Merge Verification Protocol with a ≥10-trial warm/cold method. Correctly NOT fabricated (see P3 table below).
- **Recommendation:** None beyond the recorded live-perf handoff (owner: maintainer, post-merge).

#### 11.2-AC1: Thumb-grab hit-testing fixed; drag works mouse AND touch, verified by real-touch e2e (P0, R-004)

- **Coverage:** FULL ✅
- **Tests:**
  - `test/components/TimeSlider.dragdecouple.atdd.test.tsx` — all 3 decorations `pointer-events-none` + `aria-hidden`; input sole pointer target (`h-11`, ≥44px), not `pointer-events-none`.
  - `test/e2e/epic-11-slider-touch-drag.spec.ts` (`--project=touch`, CDP `Input.dispatchTouchEvent`) — a real finger sweep ON the thumb changes the committed time (genuine touch, not `click()`/`fill()`).
- **Recommendation:** None. Real-touch proof runs in CI on Chromium/Pixel-5; cross-engine device pass is the recorded 11.8 handoff.

#### 11.2-AC2: Drag decoupled; one app-level commit per gesture; that commit fetches nothing (P0, R-002)

- **Coverage:** FULL ✅
- **Tests:**
  - `TimeSlider.dragdecouple.atdd.test.tsx` — multi-step drag commits `onMinutesChange` ≤1×; `onSnap` once on settle; keyboard commits per keypress; blur snaps.
  - `TimeSlider.edge-cases.automate.test.tsx` — no-`pointerDown` pointer-up → no phantom commit; `pointerCancel` parity.
  - `epic-11-slider-touch-drag.spec.ts` + `epic-11-scrub-zero-fetch.spec.ts` — a same-date settled drag issues 0 `/api/venues` (the seam; standing guard 11.8-owned).
- **Recommendation:** None.

#### 11.2-AC3: Date picker — only today→today+3 selectable; out-of-window forced/URL dates clamp in STATE (P0, R-007)

- **Coverage:** FULL ✅
- **Tests:**
  - `test/unit/time-planner.today-window.atdd.test.ts` — `isPlannerDateSelectable`/`PLANNER_MAX_FUTURE_DAYS===3`; `validatePlannerDateTime` rejects beyond-window coherently (no throw/500).
  - `test/components/DatePickerDialog.today-window.atdd.test.tsx` — today+3 enabled+pickable; today+4/past disabled+unpickable.
  - `test/unit/TimeContext.today-window-min.atdd.test.tsx` — forced date beyond window OR past clamps to today; in-window preserved.
  - `test/unit/time-planner.window-boundaries.automate.test.ts` — rollover/leap; reason precedence; `enforceWindow` route opt-out.
- **Recommendation:** None.

#### 11.2-AC4: On today, slider min = snapped current wall-clock; min advances as the clock ticks (P0, R-007 + P1 visual)

- **Coverage:** FULL ✅
- **Tests:**
  - `TimeSlider.dragdecouple.atdd.test.tsx` — `minMinutes` in native `min` + `aria-valuemin`; below-min/ArrowLeft/Home clamp UP; inert `time-slider-elapsed` segment distinct non-amber token.
  - `TimeContext.today-window-min.atdd.test.tsx` — today min = floored wall-clock; advances on a tick; does NOT thrash the date-only key on a minute tick (the 11.1 seam).
  - `TimeContext.min-edge-cases.automate.test.tsx` — direct `setSelectedMinutes`/`snapSelectedMinutes` below-min floored IN STATE (closes the review finding); pre-06:00 clamp; tick-out-of-window reset.
- **Recommendation:** None.

#### 11.3-AC1: Mobile tag-chip row in the sheet header; same data set + shared filter context; filters list AND pins identically on both breakpoints; empty state (P0, R-009)

- **Coverage:** FULL ✅
- **Tests:**
  - `test/components/MobileTagChips.test.tsx` (8 tests) — data-driven set; en-label with canonical toggle; "on" pill + `aria-pressed`; 44px target; `pan-x` axis guard; live toggle.
  - `test/e2e/epic-11-chip-filter-parity.spec.ts` (BOTH `--project=mobile` + `--project=desktop`) — toggling the unique 'Kanal' chip prunes the visible list AND the pins to the one matching venue; toggle-off restores both.
  - `test/components/MapView.test.tsx` — chip row under the toggles; filtered-to-empty shows empty copy NOT skeleton (9.7 fold-in).
- **Recommendation:** None. The shared `TagFilterContext` reuse (R-009 mitigation) is proven at both breakpoints. The favourites-mode chip asymmetry surfaced in review was RESOLVED (desktop strip now gated on `!isFavouritesRoute`).

#### 11.3-AC2: Fourth handle-only collapsed snap; map interactive behind it (P1, R-008)

- **Coverage:** FULL ✅
- **Tests:**
  - `test/components/MobileBottomSheet.test.tsx` (extended) — ArrowDown peek→collapsed (never dismissed); ArrowUp collapsed→peek; saturates; collapsed renders handle-only with the collapsed-h token + no backdrop.
  - `test/e2e/epic-11-sheet-touch-gestures.spec.ts` (`--project=touch`) — all FOUR snaps by real finger; map interactive behind collapsed (map tap above the strip selects a venue + raises the sheet).
- **Recommendation:** None. The collapsed-snap height (epic-`UNKNOWN`) was SET from the rendered handle strip; tests assert behaviour, not the px.

#### 11.3-AC3: Retuned gesture feel — 1:1 tracking, distance+velocity snaps, no dead-zones, chip row drag-compatible (P1/P2, R-008)

- **Coverage:** FULL ✅
- **Tests:**
  - `epic-11-sheet-touch-gestures.spec.ts` — four snaps reachable by gesture (the `releaseDir` accumulated-movement fix); horizontal chip fling leaves `data-state` unchanged (axis guard).
- **Gaps:** (advisory) No unit assertion that `dragY` tracks `my` 1:1 on the default animated path (the e2e asserts terminal `data-state`, not intermediate position); the reduced-motion jump-on-release path is a standard accommodation (review-dismissed). Neither reduces the AC below FULL.
- **Recommendation:** LOW (advisory) — optional `dragY`-follows-`my` unit assertion.

#### 11.3-AC4: Desktop chip row scrollable with arrows + edge-fades; keyboard-navigable; all tags reachable (P1, R-008)

- **Coverage:** FULL ✅
- **Tests:**
  - `test/components/DesktopNavBar.test.tsx` (extended) — strip `overflow-x-auto` not `overflow-hidden`; all tags in DOM + focusable; arrows labelled/`type=button`; left disabled at start; right enables + `scrollBy` on overflow; right edge-fade only when overflowing.
- **Gaps:** (advisory, review-deferred) AC4 arrow/overflow reachability is proven with jsdom-mocked scroll metrics (jsdom reports 0 for scroll geometry); no real-browser overflow e2e. Implementation is correct + unit-covered; deferred as test-hardening, not a code defect.
- **Recommendation:** LOW (advisory) — a real-browser overflow e2e would close the jsdom limitation. Does not reduce the AC below FULL.

#### 11.4-AC1: Remove "Säkerhet"/sun-window text; render real opening hours (requires `openingHours` on the list DTO); never fabricated (P0, R-010)

- **Coverage:** FULL ✅
- **Tests:**
  - `test/components/VenueQuickInfo.test.tsx` (rewritten) — NO visible "Säkerhet" text node; NO "Sol HH:mm–HH:mm" line on mobile+desktop; `openingHours.display` renders when present, NOTHING when absent (both branches); sr-only accessible confidence kept.
  - `test/unit/services/venue-store.test.ts` — `toVenueData`/seed-list contract carries `openingHours` (present + absent).
  - `test/unit/api/venues-route.test.ts` — seed-path `/api/venues` DTO carries `openingHours` (present + absent).
- **Recommendation:** None. The additive optional `VenueDataDto.openingHours` is pinned at the DTO boundary; the honest "absent → nothing" rule is covered.

#### 11.4-AC2: Route CTA reads only "VISA RUTT" (drop the truncated ETA) (P0, R-010)

- **Coverage:** FULL ✅
- **Tests:**
  - `VenueQuickInfo.test.tsx` — the compact `RouteButton` has NO ETA span.
  - `test/e2e/map-primary.spec.ts` (re-anchored) — the quick-info card shows "VISA RUTT" + `toHaveCount(0)` for card ETA text.
- **Recommendation:** None. (Review [Patch][Low]: the orphaned `routeEstimateLabel?` type member left after the removal — cosmetic type-only, resolved.)

#### 11.4-AC3: Mobile card re-aligned to the reference across all four sun states; obscured two-signal preserved (P1, R-010)

- **Coverage:** FULL ✅
- **Tests:**
  - `VenueQuickInfo.test.tsx` — all four sun states (Sunny/Partial/Shaded/obscured `CloudObscured`) render; obscured block + muted badge preserved (Story 10.2) alongside the opening-hours line; no confidence/sun-window text.
- **Recommendation:** None. Reference-alignment (spacing/hierarchy) visual gate is the 11.7 rebaseline (maintainer); the code-level facts are asserted.

#### 11.4-AC4: Regenerated aria + pruned unused i18n keys (P0/P2, R-010)

- **Coverage:** FULL ✅
- **Tests:**
  - `VenueQuickInfo.test.tsx` — accessible name = name → sun% → opening hours → distance with no dangling `·` / duplicate phrase.
  - `test/unit/removed-i18n-keys.test.ts` — pins the three pruned `quickInfo.*` keys (`sunWindow`/`sunUnavailable`/`obscuredPosition`) + `confidence*` kept.
  - `test/unit/messages-parity.test.ts` — sv/en parity stays green.
- **Recommendation:** None.

#### 11.5-AC1: De-dull the map to a light warm tint; basemap legible; pin/label contrast still passes axe (P0, R-006)

- **Coverage:** FULL ✅
- **Tests:**
  - `test/e2e/axe.spec.ts` (desktop `a11y`, 12 pass) + `axe-mobile` active scan — axe AA GREEN on both breakpoints AFTER the tint change; the de-dull adds ZERO new serious/critical violations (the sole mobile-map violation is the pre-existing Story-5.1 venue-card debt, unchanged).
  - The tint reduction is a token change (`bg-surface-sand/80→/20` + `--gradient-map-overlay` ¼ alpha), no ad-hoc hex.
- **Recommendation:** None. The exact tint value (epic-`UNKNOWN`) was SET by a design-gate eyeball; tests assert the OUTCOME (legible + axe AA), never an opacity number — survives a value re-tune.

#### 11.5-AC2: Living location dot — larger, tokenized amber + white ring, pulsing halo (static under reduced-motion) (P1, R-018 + R-006 token)

- **Coverage:** FULL ✅
- **Tests:**
  - `test/components/UserPin.test.tsx` — 24px; tokenized fill `var(--color-amber-location-dot)` (resolves the Story-9.5 `#d97706` gap, R-016); `animate-user-location-halo` class; `pointer-events:none`; `aria-hidden`; raw-`#d97706` source-guard.
  - `test/e2e/map-primary.spec.ts` — live pulsing halo (`animationName==='user-location-halo'`); under `emulateMedia({reducedMotion:'reduce'})` the halo is static (`animationName==='none'`).
- **Recommendation:** None.

#### 11.5-AC3: Viewport-aware true recenter — flyTo padding per snap/panel; dot lands in the visible center (P1, R-013)

- **Coverage:** FULL ✅
- **Tests:**
  - `test/unit/utils/recenter-padding.test.ts` — pure `computeRecenterPadding` per-snap (mid 320 ≠ full 560) + per-panel (detail-open ≠ closed) derivation.
  - `test/components/MapControls.test.tsx` — `flyTo` called with padding varying per snap + desktop left/right, `duration:500` (flyTo stays 500 ms).
- **Gaps:** (advisory, review-deferred) The OnboardingGate grant-flyTo secondary recenter site is not made viewport-aware (sibling of MapView, no sheet-state access; dismisses to `mid` where raw-coord is acceptable). AC3's literal target (the recenter button) is fully handled → AC FULL. `MOBILE_TOP_BAR_COVER=72` is a hand-picked constant with no mirrored token (deferred, maintainability).
- **Recommendation:** LOW (advisory) — track the grant-flyTo + the `72` token for a follow-up. Neither reduces the AC below FULL.

#### 11.6-AC1: Clean first paint — skeleton every detail-only region; never fabricate a value; no layout jump (P1, R-011)

- **Coverage:** FULL ✅
- **Tests:**
  - `test/components/VenueDetailContent.test.tsx` (rewritten) — no fabricated "ÖPPET · 22:00" pre-load (skeleton present); opening-hours/address skeletons; name + fallback fields render immediately; a dedicated test pins the badge omit-when-no-`closesAt` path.
- **Recommendation:** None. The wrong-data-first render (the actual bug) is closed by removing the `?? '22:00'` fabrication + skeletoning detail-only regions.

#### 11.6-AC2: Remove "Soltider idag" + prune the dead `VenueTimeline` render path (engine timeline stays) (P1, R-011)

- **Coverage:** FULL ✅
- **Tests:**
  - `VenueDetailContent.test.tsx` — "Solprognos idag"/"Soltider idag" + timeline windows ABSENT on both modes.
  - `test/components/MapView.test.tsx` — the `'Bäst 11:00-15:00'` subtitle assertion replaced with a section-removed assertion.
  - `test/unit/messages-parity.test.ts` — symmetric i18n prune (timeline block + `sectionTitle`/`peakTime`/`bestWindow`) stays parity-green.
  - `SunTimeline.tsx` + `SunTimeline.test.tsx` deleted; the ENGINE `detail.timeline`/`[slug]` route/`sun-engine.ts` timeline UNTOUCHED (11.1 still consumes the day-series).
- **Recommendation:** None. DEVIATION (peak/best-window subtitle removed with the section, being structurally inside it and absent from the reference) is documented + test-pinned.

#### 11.6-AC3: "Omdömen" centered + single "Inga omdömen" empty message (P1, R-011)

- **Coverage:** FULL ✅
- **Tests:**
  - `test/components/ReviewFlow.test.tsx` — with 0 reviews "Inga omdömen" occurs EXACTLY once; empty message + header carry the centering classes; a second test pins the `>0` count summary + no empty-message leak.
- **Gaps:** (advisory, review-deferred) "Centered per reference" diverges from the literal left-aligned reference JSX; AC3's written text is the maintainer's authority (code satisfies AC3), and the 11.7 rebaseline confirms the intended look. Not a code defect.
- **Recommendation:** None.

#### 11.6-supporting: amber sun badge ≥4.5:1 (deterministic axe green)

- **Coverage:** FULL ✅ (folded into the 11.6 axe evidence; closes the boundary flake surfaced at 11.3)
- **Tests:** `axe.spec.ts:82` (desktop venue-detail) + obscured venue-detail scan green with `--color-amber-badge-text #6d5000 → #5c4300` (5.63:1). Not a distinct AC — a hard epic constraint the story landed.

#### 11.7-AC1: Build fails loudly on lightningcss + `.gitattributes` LF normalization (isolated renormalization) (P2, R-016)

- **Coverage:** FULL ✅
- **Tests / evidence:**
  - `test/unit/hygiene-config-contracts.automate.test.ts` (11 tests) — guards the removed `vercel.json` `|| true` swallow; the no-blanket `.gitattributes` (source `text eol=lf` + binary `-text`, NO `.log`).
  - AC1 fail-loud proven statically + via an injected `lightningcss@99.99.99` ETARGET (OLD `|| true`→exit 0; NEW→exit 1). `.gitattributes` verified on disk (source LF rules present, `.log` excluded).
  - Renormalization kept SEPARATE (orchestrator owns the isolated `git add --renormalize` commit; dev did not run git).
- **Recommendation:** None. (Live Vercel deploy is the maintainer/orchestrator PR concern, not CI-provable — the static contract guard is the durable CI proxy.)

#### 11.7-AC2: Orphaned `toSunStatusToken` mapper resolved — no half-state (P2, R-017)

- **Coverage:** FULL ✅
- **Tests / evidence:**
  - `test/unit/sun-status-presentation.test.ts` — the `toSunStatusToken` import + describe block removed (its only consumer); all OTHER exports (`windowLabelTier`/`isObscuredSunStatus`/`skyConditionCopy`) kept + green.
  - `hygiene-config-contracts.automate.test.ts` — guards the deleted orphan.
  - R-017 binary outcome: a repo-wide grep proves ZERO references remain (only gitignored stale `.next` artifacts); the `never`-exhaustiveness guard survives via the sibling `windowLabelTier`.
- **Recommendation:** None. Chose DELETE (recommended, keeps the story byte-identical). DEVIATION: the now-fully-orphaned `windowLabelTier`/`isSunWindowStatus` siblings (their 11.6 callers gone) were comment-tightened + KEPT to preserve the `never`-guard; flagged as a follow-up dead-export cleanup.

#### 11.7-AC3: Consolidated reference-PNG rebaseline — maintainer-blessed checkpoint (P3, R-006/R-011 — blessing manual-by-design)

- **Coverage:** FULL (dev deliverable: capture + stage + document) ✅ / **blessing = P3 needs-human**
- **Tests / evidence:**
  - 12 pairs (re)captured + staged under `nextjs-app/docs/design/references/screens/{mobile,desktop}/` with a consolidated `REBASELINE-LOG.md` entry; each verified in-state (in-DOM assertion + eyeball) before staging; the capture helper aborts on wait-timeout (never screenshots a half-loaded page).
  - Review [Decision][High] (byte-identical `map-primary`/`map-panel-venues` mobile pair) was RESOLVED — re-captured into distinct DOM-asserted states (`peek` vs `mid`); byte-distinctness proven (differing md5s).
- **Gaps:** Maintainer blessing is DEFERRED to PR review (dev structurally forbidden from self-blessing — `AGENTS.md:177-179`). This is the prescribed handoff, not a coverage gap. Recorded as `needs-human` #3 in the 11.8 protocol.
- **Recommendation:** None. Staging + documenting IS the dev deliverable; the blessing is the maintainer's PR checkpoint.

#### 11.8-AC1: Live + real-device verification pass over every Epic 11 surface (P1 mobile sweep / P3 device half)

- **Coverage:** FULL (mobile-profile sweep) ✅ / PARTIAL (physical-device half — P3 manual-by-design)
- **Tests / evidence:**
  - Full e2e sweep green: `--project=mobile` 52 pass / 12 skip, `--project=desktop` 35 pass / 29 skip, `--project=touch` 3 pass, `--project=a11y` 12 pass / 2 skip — each Epic-11 surface exercised by the mobile-project specs (scrub-zero-fetch, slider-touch-drag, sheet-touch-gestures, chip-filter-parity, weather-matrix, map-primary dot).
  - Physical-device sweep → `needs-human` #2 (Playwright iPhone-14 + Pixel-5 profiles serve as the automated proxy; no "physical device passed" claim fabricated).
- **Recommendation:** None beyond the recorded device handoff.

#### 11.8-AC2: Standing regression guards for the Epic 11 interaction fixes (the CI net) (P0, R-001/002/004/005/007/009/010)

- **Coverage:** FULL ✅
- **Tests / evidence:**
  - All 11 enumerated AC2 regression files present + green (211 tests as a targeted group): touch-drag-on-thumb + one-commit (`epic-11-slider-touch-drag` + `TimeSlider.dragdecouple`); scrub=0/date-change=1/markers persist (`epic-11-scrub-zero-fetch` + `venue-day-series-query-key`); today-min + today+3 (`time-planner.today-window` + `TimeContext.today-window-min` + `DatePickerDialog.today-window` + 3 automate); four sheet snaps (`epic-11-sheet-touch-gestures`); mobile chip filter parity (`epic-11-chip-filter-parity`); quick-info no "Säkerhet"/sun-window (`VenueQuickInfo` + `MapView` + `removed-i18n-keys`).
  - `test/unit/epic-11-standing-gate-ci-wiring.automate.test.ts` (7 config-contract guards, verified non-vacuous) — locks that CI keeps invoking mobile/desktop/touch/a11y and that `playwright.config.ts` keeps its `testMatch`/`testIgnore` routing (blocks silent gate-degradation — a dropped `--project=touch` or emptied `testMatch`).
- **Recommendation:** None. Two in-scope test-only defects the sweep surfaced (a ~66% real-touch map-tap flake; a stale `CONFIDENCE_BADGE_COPY` regex left by 11.4) were fixed preserving the asserted fact — exactly the "shipped-but-insufficient" fragility this story exists to eliminate.

#### 11.8-AC3: Live perf gated + request-count invariant guarded in CI (P0 CI half / P3 live half)

- **Coverage:** FULL (request-count CI half) ✅ / PARTIAL (live wall-clock half — P3 manual-by-design)
- **Tests / evidence:**
  - Request-count invariant (scrub=0, date-change=1) is a live CI gate: `epic-11-scrub-zero-fetch.spec.ts` under `--project=mobile --project=desktop` (workflow L110), plus the CI-wiring contract guard.
  - Live date-change p95 < 3 s → `needs-human` #1 (≥10-trial warm/cold method against production; a miss is a triage item, not a fabricated pass).
- **Recommendation:** None. The "wall-clock measured live, counts guarded in CI" split (AC-load-bearing) is honoured exactly.

---

### Gap Analysis

#### Critical Gaps (BLOCKER) ❌

**0 gaps.** All 14 P0 acceptance criteria are FULL. No release blocker.

#### High Priority Gaps (PR BLOCKER) ⚠️

**0 gaps.** All 8 P1 acceptance criteria are FULL.

#### Medium Priority Gaps (Nightly) ⚠️

**0 gaps.** All 3 P2 acceptance criteria (11.7 AC1 build-fail/EOL, 11.7 AC2 mapper, plus the 11.4-AC4 i18n-prune P2 facet) are FULL.

#### Low Priority Gaps (Optional) ℹ️

**3 P3 manual-by-design items — NOT coverage gaps** (each is the CI-un-automatable half of an AC whose CI half is FULL + green, correctly recorded as a `needs-human` post-merge handoff in the Story-11.8 Post-Merge Verification Protocol):

1. **Live date-change p95 < 3 s wall-clock** (11.1 AC4 / 11.8 AC3 live half, R-014) — needs the live Vercel Production deployment; ≥10-trial warm/cold method documented. The CI request-count invariant (scrub=0, date-change=1) is the durable gate and is FULL + green.
2. **Physical-device (real phone) gesture sweep** (11.8 AC1 device half, R-015) — a real phone cannot run headless in CI; the Playwright iPhone-14 + Pixel-5 profiles are the automated proxy and are green.
3. **Maintainer blessing of the 11.7-staged consolidated reference-PNG rebaseline** (11.7 AC3 blessing half) — dev is structurally forbidden from self-blessing; the set is captured + staged + documented; the maintainer blesses at PR review.

#### Advisory (non-blocking test-hardening — surfaced, none reduce an AC below FULL)

- 11.1 AC3 / 11.3 AC3 / 11.3 AC4: e2e-only or jsdom-mocked coverage for the date-change overlay seam, the sheet 1:1-track path, and the desktop chip real-overflow — all FULL at the AC level; component/real-browser hardening is optional.
- 11.5 AC3: OnboardingGate grant-flyTo not viewport-aware + `MOBILE_TOP_BAR_COVER=72` untokened — review-deferred maintainability; the recenter-button target (the AC's literal scope) is FULL.

---

### Coverage Heuristics Findings

#### Endpoint Coverage Gaps

- Endpoints without direct API tests: **0.** The only endpoint change in the epic is the additive `/api/venues` list DTO (`sunDaySeries` from 11.1, `openingHours` from 11.4). Both are pinned at API/contract level (`venues-route-day-series.atdd.test.ts`, `venues-route.test.ts`, `venue-store.test.ts`) on the real-engine + seed paths, with the `[slug]` detail DTO asserted byte-identical and ETag/304 covered. The scrub zero-fetch is asserted as an intended NEGATIVE endpoint signal (0 `/api/venues` on a settled scrub).

#### Auth/Authz Negative-Path Gaps

- Criteria missing denied/invalid-path tests: **0 (N/A).** Epic 11 touches no auth/session/permission surface — it is interaction, performance, and surface-polish over the already-authenticated public read path.

#### Happy-Path-Only Criteria

- Criteria missing error/edge scenarios: **0.** Error/edge paths are strong across the epic: day-series degrade (producer throw → no 500, series omitted, per-venue isolation), null/sparse/NaN series clamp, out-of-window/past/forced-date clamps, pre-06:00 clamp, no-`pointerDown` pointer-up, `pointerCancel` parity, filtered-to-empty empty-copy, `openingHours` absent → nothing, badge omit-when-no-`closesAt`, weather-missing confidence-absent, reduced-motion static halo, degraded-cache-not-pinned.

---

### Coverage by Test Level

| Test Level | Role in this epic | Coverage |
| ---------- | ----------------- | -------- |
| E2E (Playwright) | request-count invariant (scrub=0/date=1), real-touch thumb-drag + four sheet snaps (`--project=touch`), chip filter parity (both breakpoints), axe AA gate, mobile surface sweep | FULL for the whole-app interaction promises |
| API / Contract | `/api/venues` list DTO carries `sunDaySeries` (61 steps, %+status) + `openingHours`; payload measured + bounded; seed/`[slug]` byte-identical; ETag/304 | FULL |
| Component | slider decouple + range rules, mobile/desktop chips, quick-info removals + opening hours + aria, detail first-paint + skeleton + reviews, UserPin dot, recenter padding, sheet snaps | FULL |
| Unit | client day-series derivation + parity + purity, cache bucket/key, today-window state + tick-advance, i18n prune, config-contract + CI-wiring guards | FULL |
| Manual (live/device/bless) | live p95 wall-clock, physical-device sweep, maintainer PNG blessing | P3 — recorded needs-human handoffs (by design) |

---

### Test Execution Evidence (from the story records — current tree)

- **Vitest:** 1361 tests / 143 files, ALL PASS (final count after the 11.8 automate expansion: baseline 1354 → +7 CI-wiring guards).
- **Playwright:** `mobile` 52 pass / 12 skip, `desktop` 35 pass / 29 skip, `touch` 3 pass, `a11y` (desktop axe) 12 pass / 2 skip — all green; 0 fail.
- **Gates:** `typecheck` 0 errors, `eslint` 0 errors (13 pre-existing warnings, none new) across all 8 story gate runs.
- **CI wiring confirmed:** `build-and-test-nextjs.yml` invokes `--project=mobile --project=desktop` (L110), `--project=touch` (L120), `--project=a11y` (L123); `a11y-mobile` deliberately NOT invoked (Story-5.1 `test.fixme` debt — guarded as a deliberate-omission by the CI-wiring contract test).

---

## PHASE 2: QUALITY GATE DECISION

**Gate Type:** epic
**Decision Mode:** deterministic

### Decision Criteria Evaluation

#### P0 Criteria (Must ALL Pass)

| Criterion | Threshold | Actual | Status |
| --------- | --------- | ------ | ------ |
| P0 Coverage | 100% | 14/14 = 100% | ✅ PASS |
| P0 Test Pass Rate | 100% | 100% (vitest 1361/1361; Playwright mobile/desktop/touch/a11y all green) | ✅ PASS |
| Security Issues | 0 | 0 (per-story dedicated security passes: 0 findings) | ✅ PASS |
| Critical NFR Failures | 0 | 0 (axe AA green post map de-dull; request-count invariant green) | ✅ PASS |
| Flaky Tests (unmitigated) | 0 | 0 (the one real-touch map-tap flake was hardened to deterministic aim; 6/6 with retries=0) | ✅ PASS |

**P0 Evaluation:** ✅ ALL PASS

#### P1 Criteria (Required for PASS)

| Criterion | Threshold | Actual | Status |
| --------- | --------- | ------ | ------ |
| P1 Coverage | ≥90% (PASS) / ≥80% (min) | 8/8 = 100% | ✅ PASS |
| Overall Coverage | ≥80% | 25/28 = 89% | ✅ PASS |
| Overall Test Pass Rate | ≥95% | 100% | ✅ PASS |

**P1 Evaluation:** ✅ ALL PASS

#### P2/P3 (Informational)

| Criterion | Actual | Notes |
| --------- | ------ | ----- |
| P2 Coverage | 3/3 = 100% | Hygiene (build-fail/EOL, mapper resolution, i18n prune) all FULL |
| P3 Coverage | 0/3 = 0% | Manual-by-design (live p95, physical-device, PNG blessing) — recorded needs-human handoffs, do NOT block |

---

### GATE DECISION: PASS ✅

---

### Rationale

**Deterministic rule outcome:** P0 coverage 100% (Rule 1 satisfied) → overall coverage 89% ≥ 80% (Rule 2
satisfied) → P1 coverage 100% ≥ 90% (Rule 4 satisfied) ⇒ **PASS**.

All 14 P0 acceptance criteria — the instant-feel guards (scrub = 0 fetches at unit + e2e; client
day-series byte-parity with the server single-instant; date change = exactly 1 request with markers
persisting), working real touch (thumb-grab drag verified by CDP `Input.dispatchTouchEvent`, not
click-sim; one commit per gesture), the planner range rules enforced in state (today→today+3 cap +
today-minimum + tick-advance), the mobile filter parity over the shared `TagFilterContext`, the honest
quick-info content (no "Säkerhet"/sun-window; opening-hours-or-nothing), the de-dulled map keeping the
axe AA gate green, and the standing anti-"shipped-but-insufficient" CI net (AC2 regression suite +
CI-wiring contract guard) — are FULL and green. All 8 P1 criteria (cache bucket, desktop chip scroll,
viewport-aware recenter, living location dot with reduced-motion, detail clean first-paint + content
polish, four sheet snaps, reference-aligned card, mobile sweep) are FULL. All 3 P2 hygiene criteria are
FULL. Security = 0 findings; no unmitigated flake.

The 3 non-FULL items are entirely in the P3 manual-by-design tier and are **not coverage gaps**: they are
the CI-un-automatable halves of ACs whose CI-provable halves are FULL + green — the live wall-clock
date-change p95 (a wall-clock number cannot prove the fetch was *removed*; the request-count invariant,
which can, is the durable gate and is green), the physical-device gesture sweep (no phone runs headless;
the iPhone-14 + Pixel-5 profiles are the green automated proxy), and the maintainer reference-PNG blessing
(dev is structurally forbidden from self-blessing; the set is captured + staged + documented). All three
are correctly recorded as `needs-human` items in the Story-11.8 consolidated Post-Merge Verification
Protocol — exactly the documented handoffs the run context flagged as intentional non-CI items.

**Caveats (do not affect the gate):**
- The live p95 number and physical-device sweep are the maintainer's post-merge actions; a p95 miss is a
  triage item, not a fabricated pass. The CI request-count invariant durably guards that the ~9.6 s stall
  cannot silently recur.
- The 11.7 reference-PNG rebaseline (incl. the review-corrected distinct `map-primary`/`map-panel-venues`
  pair) awaits maintainer blessing at PR — the epic's only remaining human visual checkpoint.
- Advisory test-hardening (component-level date-change overlay assertion; real-browser desktop-chip
  overflow e2e; grant-flyTo viewport-awareness; `72`/token) is optional backlog — none reduces any AC
  below FULL.

---

### Residual Risks (tracked, non-blocking)

| Risk | Priority | Prob | Impact | Score | Mitigation / Remediation |
| ---- | -------- | ---- | ------ | ----- | ------------------------ |
| Live date-change p95 misses < 3 s on a slow-network day | P3 | Low | Med | 2 | CI request-count invariant is the durable gate; p95 recorded warm/cold ≥10 trials, any miss triaged before close (R-014). |
| Physical-device gesture differs from the emulated profile | P3 | Low | Med | 2 | Real-touch CDP profile (Pixel-5) covers the automatable half; device checklist recorded, any gap triaged (R-015). |
| Maintainer blesses a mislabeled reference PNG | P3 | Low | Low | 1 | The one byte-identical mobile pair was re-captured into distinct DOM-asserted states pre-blessing (11.7 review [Decision][High] resolved). |

**Overall Residual Risk:** LOW.

---

### Next Steps

**Immediate (before/at PR merge):** none blocking. The regression + request-count suites are green in CI;
P0/P1 at 100%.

**Post-merge (maintainer, consolidated in the Story-11.8 Post-Merge Verification Protocol):**
1. Run the LIVE date-change p95 (≥10 trials, warm/cold) + confirm time-scrub = 0 requests + record the gzipped `sunDaySeries` payload size; triage any p95 miss.
2. Physical-device checklist over every Epic 11 surface (screenshots per surface); triage any device-only gap before epic close.
3. Bless the 11.7-staged consolidated reference-PNG rebaseline (12 pairs) at PR review.

**Backlog (advisory test-hardening):** component-level date-change overlay assertion (11.1); real-browser
desktop chip-overflow e2e (11.3); `dragY`-follows-`my` 1:1 unit assertion (11.3); grant-flyTo
viewport-awareness + `MOBILE_TOP_BAR_COVER` token (11.5); the fully-orphaned `windowLabelTier`/`isSunWindowStatus`
dead-export cleanup with a re-homed `never`-guard (11.7).

---

## Integrated YAML Snippet (CI/CD)

```yaml
traceability_and_gate:
  traceability:
    epic_id: "11"
    date: "2026-07-05"
    stories: ["11.1","11.2","11.3","11.4","11.5","11.6","11.7","11.8"]
    total_criteria: 28
    coverage:
      overall: 89
      p0: 100
      p1: 100
      p2: 100
      p3: 0   # manual-by-design (live p95 + physical-device + PNG blessing) — needs-human, not a gap
    gaps:
      critical: 0
      high: 0
      medium: 0
      low: 3   # all P3 manual-by-design needs-human handoffs
    quality:
      vitest_tests: 1361
      vitest_files: 143
      playwright: "mobile 52 / desktop 35 / touch 3 / a11y 12 — all green"
      security_findings: 0
      unmitigated_flaky: 0
  gate_decision:
    decision: "PASS"
    gate_type: "epic"
    decision_mode: "deterministic"
    criteria:
      p0_coverage: 100
      p0_pass_rate: 100
      p1_coverage: 100
      overall_coverage: 89
      overall_pass_rate: 100
      security_issues: 0
      critical_nfrs_fail: 0
      flaky_tests: 0
    thresholds:
      min_p0_coverage: 100
      min_p0_pass_rate: 100
      min_p1_coverage: 90
      min_overall_pass_rate: 95
      min_coverage: 80
    needs_human_post_merge:
      - "LIVE date-change p95 < 3 s + time-scrub = 0 requests (R-014)"
      - "physical-device gesture sweep over every Epic 11 surface (R-015)"
      - "maintainer blessing of the 11.7-staged consolidated reference-PNG rebaseline"
    next_steps: "PASS — merge unblocked; run the 3 consolidated post-merge needs-human items; triage any p95 miss before epic close."
```

---

## Related Artifacts

- **Epic:** `_bmad-output/planning-artifacts/epics.md` §"Epic 11" (lines 2791–3021)
- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-11.md`
- **Story files:** `_bmad-output/implementation-artifacts/11-1..11-8-*.md`
- **Per-story traceability (folded in):** `traceability-report-11-1.md`, `traceability-report-11-2.md`
- **Live-perf method:** `_bmad-output/test-artifacts/atdd-checklist-11-1.md` §"Live-Perf Handoff (AC4)"
- **Automation summary:** `_bmad-output/test-artifacts/automation-summary-11-8.md`
- **CI:** `nextjs-app/.github/workflows/build-and-test-nextjs.yml` (L110 mobile+desktop, L120 touch, L123 a11y)

---

## Sign-Off

**Phase 1 — Traceability Assessment:**

- Overall Coverage: 89% (25/28 FULL)
- P0 Coverage: 100% (14/14) ✅
- P1 Coverage: 100% (8/8) ✅
- Critical Gaps: 0
- High Priority Gaps: 0

**Phase 2 — Gate Decision:**

- **Decision:** PASS ✅
- **P0 Evaluation:** ✅ ALL PASS
- **P1 Evaluation:** ✅ ALL PASS

**Overall Status:** PASS ✅ — Epic 11 release approved; coverage meets standards. The 3 P3
manual-by-design items (live p95, physical-device, PNG blessing) are recorded post-merge needs-human
handoffs, not coverage gaps.

**Generated:** 2026-07-05
**Workflow:** testarch-trace v4.0 (Enhanced with Gate Decision) — Epic-Level mode

---

<!-- Powered by BMAD-CORE™ -->
