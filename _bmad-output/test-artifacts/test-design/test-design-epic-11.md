---
stepsCompleted: ['step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-07-04'
---

# Test Design: Epic 11 - "Feels Instant, Reads Clear" (Time-Scrub Performance, Mobile Interaction & Surface Polish)

**Date:** 2026-07-04
**Author:** Rasmus
**Status:** Draft
**Design Level:** Epic-Level (single test plan, stories 11.1–11.8)

---

## Executive Summary

**Scope:** Epic-level test design for Epic 11 — the post-Epic-10 field-test cleanup that makes the LIVE app *feel*
right: the time planner goes from a ~9.6 s stall to an instant client-side lookup (11.1), the slider becomes
grabbable and range-constrained (11.2), mobile gets first-class tag filtering + a proper bottom sheet (11.3), the
quick-info / detail / map surfaces are aligned to the reference and made truthful (11.4/11.5/11.6), three-epics-
deferred build/config debt is finally paid (11.7), and every fix is locked in by a real-device + Playwright-mobile
verification pass with perf regression guards (11.8).

> **Context note:** the app is already in **Production** on the real data path (Supabase venue store + real sun
> engine + weather-gated two-signal display from Epic 10). This epic ships almost entirely **interaction,
> performance, and surface-polish** change — very little new business logic. That inverts the usual risk profile:
> the dominant failure mode is **"shipped but insufficient"** — the exact pattern Epics 9 and 10 hit, where a
> caching win (9.3/9.4) and a debounce landed but the user-visible symptom persisted because the *root* cause
> (time in the query key; per-request per-time engine compute) was only dampened, not removed. Story 11.8 exists
> precisely to break that pattern, so this plan treats the **verification pass and the request-count / real-touch
> guards as P0**, on par with the perf refactor itself.

> **The six root causes this epic must actually fix — confirmed in HEAD source, not just claimed:**
> 1. **`TimeSlider.tsx`** — the decorative thumb `div` (`:104-118`) and the topPanel value badge (`:52-61`) are
>    absolutely positioned ON TOP of the invisible `<input type="range">` (`:73-103`) with **no
>    `pointer-events-none`**. A finger (or mouse) landing on the thumb hits the decoration, not the input → "drag
>    only works from the track", "mobile never drags". (11.2)
> 2. **`app/api/venues/route.ts`** — the list route computes for a **single** `requestedAt`
>    (`resolveRequestedAt(planner.selection, now)`, `:277`); the DTO carries no day-series. Every slider commit
>    feeds `TimeContext` → the TanStack query key → a fresh per-venue engine walk (~9–14 s). Story 9.4's
>    `useDeferredValue` dampens the storm but does not remove the fetch. (11.1)
> 3. **The engine already walks the whole day** for the detail route's `timeline`, yet the list route discards
>    everything except the requested instant — so every scrub re-buys the same computation. (11.1)
> 4. **`MapContainer.tsx`** — a `bg-surface-sand/80` div (`zIndex:1`, `:169-173`) plus a `gradient-map-overlay`
>    amber wash (`zIndex:2`, `:174-178`) sit over the basemap, making streets/water/labels hard to read. (11.5)
> 5. **`DesktopNavBar.tsx`** — the data-driven chip row (`collectTags`/`localizeTag` on `TagFilterContext`) renders
>    ONLY here (`:101-126`), inside an `overflow-hidden` flex row (`:104`) that hard-clips mid-chip; **mobile has no
>    tag-filter UI at all**. (11.3)
> 6. **`VenueDetailContent`** — the detail opens on the list-DTO fallback venue (detail-only fields missing →
>    malformed layout) BEFORE the detail DTO streams in — a wrong-data-first render, not a missing skeleton. (11.6)
>
> **Hygiene targets also source-confirmed:** `UserPin.tsx` is a static 18px dot with a **static** halo and a raw
> `#d97706` hex (no token); `toSunStatusToken` (`sun-status-presentation.ts:15`) is orphaned (only its own unit
> test imports it while every surface branches inline); `vercel.json` installCommand ends `... || true` (swallows a
> real lightningcss failure); the root `.gitattributes` normalizes only `/.gitattributes` + `*.sh` — no LF rule for
> `.ts/.tsx/.json/.css`, and `nextjs-app/` has none (the direct cause of Epic 10's `confidence-calculator.ts`
> EOL-churn review round). (11.7)

**Risk Summary:**

- Total risks identified: **18**
- High-priority risks (score ≥6): **6** (one CRITICAL, score 9 — R-001, the ~9.6 s stall / "shipped-but-
  insufficient" recurrence the epic exists to kill)
- Critical categories: **PERF/BUS** (the time-scrub stall + its recurrence), **DATA/PERF** (client-derived
  day-series diverging from server truth or bloating the payload), **BUS/TECH** (thumb-grab drag still dead on real
  touch under emulated-only e2e), **BUS/DATA** (date-change unmounting markers or regressing the Epic-10 weather
  gate in the client-derived path), **SEC/BUS** (map de-dull dropping contrast below the axe AA gate).

**Coverage Summary:**

- P0 scenarios: **12 requirement rows / ~40 tests** (~22–34 hours)
- P1 scenarios: **9 requirement rows / ~30 tests** (~15–26 hours)
- P2/P3 scenarios: **7 rows / ~15 tests+checks** (~5–12 hours)
- **Total effort:** ~**42–72 hours** (~**1–1.75 weeks** for one engineer, much of it extending existing
  `venues-route` / `sun-engine` / component fixtures + one new client-series module and a new real-touch e2e profile
  rather than net-new harness)

> **Reading the priority columns:** P0/P1/P2/P3 denote **priority / risk class**, NOT execution timing. Execution
> timing (PR vs nightly vs the wall-clock live-perf pass) is handled separately in the Execution Strategy section.
> The whole automated suite (vitest + a deterministic Playwright set incl. one real-touch profile) runs under
> ~15 min on PR; the **one thing that cannot run in CI is the live wall-clock perf number** (date-change p95 < 3 s)
> and the physical-device pass — those are recorded in the Story 11.8 record, and CI guards the *request-count
> invariant* (scrub = 0 fetches, date change = 1) instead.

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| **Server-side per-time recompute retained as the scrub mechanism** | Rejected by the maintainer workshop — the whole epic pivots to a **client-side day-series** so a settled time change is a zero-network client lookup. | The perf ACs make server-per-scrub a FAIL: a settled time change must issue **zero** network requests (11.1 AC1, 11.8 request-count guard). |
| **Blending weather differently per planner step, or re-deriving the Epic-10 gate on the client from scratch** | Epic 10's cloud/rain gate is authoritative and stays server-side; the day-series carries the **already-gated** `currentSunStatus` + `sunExposurePercent` per step (11.1 AC1). The client only *reads* the gated series, it does not re-gate. | Regression guard: the client-derived obscured/rain presentation for any step matches the server-gated value for that step (no client re-implementation of the gate). |
| **Changing the geometric meaning of `sunExposurePercent` / `sunWindow` / peak** | Same hard guardrail as Epic 10 — the % keeps ONE physical meaning; the day-series is just that meaning sampled per planner step. | Guard: for a fixed (venue, date, weather-bucket), the per-step series values equal the old single-instant compute at each corresponding instant (parity, not a rebaseline). |
| **Real turn-by-turn routing / a live ETA service** | 11.4 REMOVES the truncated "ca 16…" ETA from the compact button; it does not add a real ETA source. The ETA may live on in the detail/route surface only if already present. | Test asserts the compact button reads only "VISA RUTT" (+icon) at common widths — no truncation, no fabricated ETA. |
| **Fabricating opening hours for venues without the data** | 11.4 surfaces real `venues.opening_hours`; a venue with no data shows **nothing**, never a placeholder value. | Component test: missing opening-hours → no opening-hours line rendered (never a fabricated "Öppet till 22:00"). |
| **Pixel-perfect visual diffing of the reworked surfaces** | The project "Visual validation" gate is an LLM eyeball (sonnet) that **ignores sizing/spacing** — proportion/centering/width regressions can slip (MEMORY: Story 2.5 full-width time-picker slipped the visual gate). | Every polish story adds explicit code-level assertions (no "Säkerhet"/sun-window text; opening-hours line present/absent by data; single "Inga omdömen"; four sheet snaps; thumb `pointer-events-none`) as component/e2e tests, NOT relying on the visual gate alone. 11.7 owns the maintainer-blessed reference-PNG rebaseline (dev FORBIDDEN from self-blessing refs). |
| **New PWA icons / brand-mark work (Epic-7 A3 deferred item)** | Not part of Epic 11's field-test intake. | Remains backlog. |
| **Physical-device automation** | A real phone cannot be driven headless in CI. | 11.8 records the real-device checklist manually (screenshots + pass/fail per surface); the Playwright **mobile real-touch profile** covers the automatable half; any device-only gap is triaged before epic close. |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- | -------- |
| **R-001** | PERF / BUS | **The epic's raison d'être fails: the ~9.6 s time-change stall persists (or "shipped-but-insufficient" repeats).** Epics 9/10 both landed a caching/debounce win yet the symptom survived because time stayed in the query key and the engine recomputed per request. If 11.1 dampens instead of REMOVING the fetch (or 11.2's commit still reaches the query key), the headline promise is unmet on the live site. | 3 | 3 | **9** | Client-side day-series: the list DTO carries the whole gated per-step series; the client derives ALL time-dependent UI from the cache. A **settled time change issues ZERO network requests** — asserted at three levels: unit (client series lookup is pure/offline), e2e request-count guard (0 venue requests during a scrub), and the LIVE wall-clock pass (date-change p95 < 3 s). Story 11.8 is the standing anti-"insufficient" gate. | Dev/QA | 11.1 + 11.2 + 11.8 |
| **R-002** | PERF | **Per-step commit still floods requests during drag.** Even with the day-series, if the slider commits to `TimeContext` on every `onChange` (today's behaviour), and the query key still references time, a drag can still fan out cancelled requests (the network-capture symptom). | 3 | 2 | **6** | Decouple drag: the slider tracks a LOCAL visual value during drag and commits once on release/keyboard-settle/blur (the existing `onSnap` seam); with 11.1 that single commit triggers zero fetches. Test: a full drag gesture commits app-level time **exactly once**, and issues zero venue requests. | Dev | 11.2 |
| **R-003** | DATA / PERF | **Client-derived values diverge from server truth, or the payload bloats.** Moving marker %, pin state, quick-info figures, list ordering ("Mest sol"), and the obscured presentation to client derivation risks the client computing a *different* answer than the old server-per-instant path — and ~50 venues × ~64 steps of series data could balloon the response. | 2 | 3 | **6** | Parity guard: for a fixed (venue, date, weather-bucket) the per-step series equals the old single-instant compute at each instant (the Epic-10 gate applies **per step**, never only to "now"). Measure + record gzipped payload size; assert it stays reasonable and CDN/ETag-friendly. Cache the series per (venue, date, weather-refresh-bucket) in `sun-engine-cache.ts`. | Dev | 11.1 |
| **R-004** | BUS / TECH | **Thumb-grab drag still dead on real touch.** The exact live defect. Emulated Playwright "drag" is a synthesized mouse sequence that can pass even when a real finger on the thumb hits the decoration. Fixing `pointer-events-none` on the decoration but verifying only with click-simulation would ship the bug again. | 2 | 3 | **6** | Make the decoration `pointer-events-none`, keep the input the sole pointer target with an adequate touch height. Verify with a **real touch-gesture e2e** (Playwright touch events / a mobile real-touch profile), not click simulation — plus the physical-device checklist (11.8). Test: touch-drag initiated ON the thumb changes time. | Dev/QA | 11.2 + 11.8 |
| **R-005** | BUS / DATA | **Date change unmounts/reloads markers, or the Epic-10 weather gate regresses in the client-derived path.** The date-change flow must keep existing markers mounted (keyed by venue id) under a dim+spinner, then update in place; and the obscured/rain presentation for any planner step must still reflect the server gate. A naive re-key or a client re-gate breaks one or the other. | 2 | 3 | **6** | Markers persist across a date change (no unmount/remount — keyed by id); the dim-gray + centered spinner overlay is token-based. Regression guard: the client obscured/rain presentation for a given step equals the server-gated series value (no client re-gate); a date change fires **exactly one** request. | Dev | 11.1 + 11.5(overlay) |
| **R-006** | SEC / BUS | **Map de-dull drops pin/label contrast below the axe AA gate.** Reducing the sand+gradient wash to a light tint (~quarter strength) improves basemap legibility but can lower the contrast of amber pins/labels against the now-lighter background — and the axe AA gate has been ACTIVE since Epic 9. | 2 | 3 | **6** | Reduce the overlay to a light warm tint (exact value via design-gate eyeball against the LIVE map); assert **pin/label contrast still passes the axe gate** (mobile + desktop) after the change. The de-dull is a token change, not ad-hoc hex. | Dev/UX | 11.5 |

### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| **R-007** | BUS / DATA | **Planner range rules not enforced in state.** "today→today+3 only" and "on Idag the slider min is the current wall-clock time" must hold against a forced/URL date/time outside the window (clamp), not just visually. The today-minimum must also advance as the live clock ticks. | 2 | 2 | **4** | Enforce in state, not just disabled UI: a forced/URL date outside [today, today+3] clamps; positions earlier than the snapped current time on Idag are unreachable by drag/tap/keyboard; a boundary test at "now" + a tick-advance test. | Dev |
| **R-008** | TECH / BUS | **Sheet gesture regressions: fourth collapsed snap unreachable, or horizontal chip scroll hijacks the vertical sheet drag.** Adding a handle-only collapsed snap and a scrollable chip row to the header can create gesture dead-zones or axis-conflict (a horizontal chip fling drags the sheet down). | 2 | 2 | **4** | Tune `@use-gesture` thresholds/rubberband; the chip row is drag-compatible (horizontal chip scroll must NOT trigger vertical sheet movement). Touch e2e: all four snaps reachable by gesture; a horizontal chip scroll leaves the sheet snap-state unchanged; map stays interactive behind the collapsed sheet. | Dev |
| **R-009** | BUS | **Mobile chips diverge from desktop.** The mobile chip row must share the SAME data-driven set (`collectTags`/`localizeTag`) and the SAME `TagFilterContext` — a parallel implementation would filter list+pins differently across breakpoints. | 2 | 2 | **4** | Single shared filter context + data source; test: toggling a tag filters list AND map pins IDENTICALLY on both breakpoints; empty state present; orphaned-tag prune (the Story 9.7 guard) still holds on mobile. | Dev |
| **R-010** | BUS / DATA | **Quick-info content removals leave orphaned aria / i18n / fabricated fields.** Removing "Säkerhet: NN%" + the sun-window line and adding opening hours risks a broken accessible name (orphaned separators, duplicated phrases) and unused i18n keys; opening hours could be fabricated where data is absent. | 2 | 2 | **4** | Regenerate aria to essentials (name, sun %, opening hours, distance) with no orphaned separators/duplication; prune unused `messages/{sv,en}` keys (parity-guarded); missing opening-hours → nothing rendered; the sr-only confidence text may remain but the visible "Säkerhet" text is gone on both breakpoints. | Dev |
| **R-011** | BUS | **Detail malformed first paint / removed-section residue.** Fixing the fallback-first render can still flash a malformed frame if detail-only regions lack skeletons; removing "Soltider idag" can leave orphaned spacing / dead `VenueTimeline` path; the "Omdömen" empty state currently double-messages. | 2 | 2 | **4** | Fallback fields render immediately, every detail-only region shows a proper skeleton until real data arrives (no malformed frame, no layout jump on swap); "Soltider idag" removed on both breakpoints with the now-unused `VenueTimeline` render path + i18n pruned (engine timeline stays — 11.1 consumes it); reviews empty state shows EXACTLY ONE "Inga omdömen". | Dev |
| **R-012** | PERF / DATA | **Day-series cache pins a stale or inconsistent bucket.** The per-(venue, date, weather-refresh-bucket) series must be internally consistent (the whole gated series cached together) and must roll over when the weather bucket does — a cache keyed only on (venue, date) would serve yesterday's weather gating. | 2 | 2 | **4** | Cache key includes the weather-refresh bucket; fake-timer test proves a new bucket recomputes the series; the series + its weather gating are cached together (mirrors the Epic-10 gated-outcome-with-weather rule). | Dev |
| **R-013** | TECH | **Recenter offset math wrong at a snap state.** Viewport-aware `flyTo` padding must account for the current obstruction (bottom-sheet snap on mobile, side/top panels on desktop); a fixed offset lands the dot off-center at the collapsed vs full sheet. | 2 | 2 | **4** | Offset derived from the CURRENT snap/panel state; test the landed center per snap state (peek/mid/full/collapsed) and per desktop panel config; flyTo stays 500 ms. | Dev |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------ |
| **R-014** | OPS | **Live wall-clock perf pass can't be automated / is environment-sensitive** (network + cold vs warm cache vary the date-change p95). | 2 | 1 | 2 | Record methodology + repeated trials (warm/cold noted) in the 11.8 story record; the CI gate is the request-count invariant, not the wall-clock number. |
| **R-015** | OPS | **Physical-device pass depends on a real phone on the day** and cannot gate CI. | 1 | 2 | 2 | Manual checklist recorded (screenshots per surface); any device-only gap triaged before epic close; the Playwright mobile real-touch profile covers the automatable half. |
| **R-016** | TECH | **`.gitattributes` renormalization commit churns the tree** if not isolated — mixing the one-time `git add --renormalize` with functional change makes the diff unreviewable. | 1 | 2 | 2 | Keep the renormalization commit SEPARATE from any functional change (11.7 AC); build fails loudly on a real lightningcss error after removing the `|| true` swallow. |
| **R-017** | TECH | **`toSunStatusToken` half-resolved** — wired into some surfaces but not all, leaving a worse half-state than the current all-inline. | 1 | 2 | 2 | Binary outcome only: EITHER all sun-status surfaces consume it OR it is deleted and the comment corrected — a grep proves no surface half-references it. |
| **R-018** | PERF | **Halo pulse animation jank / ignores reduced-motion.** The new pulsing location-dot halo could drop frames or animate under `prefers-reduced-motion`. | 1 | 2 | 2 | Monitor — component/e2e assert a static halo under reduced motion; the pulse is CSS/token-driven (GPU-friendly), not JS per-frame. |

### Risk Category Legend

- **TECH**: Technical/Architecture (gesture physics, offset math, dead-code resolution, EOL/build config)
- **SEC**: Security/Accessibility posture (contrast/axe AA gate on the de-dulled map)
- **PERF**: Performance (the time-scrub stall, request floods, payload/cache)
- **DATA**: Data Integrity (client-derived series parity with server truth, honest opening-hours)
- **BUS**: Business Impact (the instant-feel promise, real-touch drag, mobile filter parity, surface polish)
- **OPS**: Operations (live wall-clock + physical-device verification, renormalization hygiene)

### Risk Matrix (probability × impact)

| Impact \ Probability | Unlikely (1) | Possible (2) | Likely (3) |
| -------------------- | ------------ | ------------ | ---------- |
| **Critical (3)**     | — | R-003, R-004, R-005, R-006 (🟠 6) | 🔴 **R-001 (9)** |
| **Degraded (2)**     | R-016, R-017, R-018 (🟢 2) | R-007, R-008, R-009, R-010, R-011, R-012, R-013 (🟡 4) | R-002 (🟠 6) |
| **Minor (1)**        | R-015 (🟢 2) | R-014 (🟢 2) | — |

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later
`nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
| ------------ | ----------------------- | --------- | ------------------ | --------------- |
| **Performance** | A settled time change issues **0** network requests (client lookup); a date change fires **exactly 1** and completes **< 3 s p95** on the LIVE deployment (stretch < 1.5 s warm-cache). Gzipped ~50-venue × ~64-step day-series stays reasonable and CDN/ETag-friendly. | R-001, R-002, R-003, R-012, R-014 | e2e request-count guard (scrub=0, date-change=1) in CI; the LIVE wall-clock p95 pass recorded in the 11.8 story record with methodology (warm/cold); payload-size measurement recorded in the 11.1 story record. | CI request-count spec green; recorded live p95 (before/after) + payload byte size in the story records. |
| **Accessibility** | The de-dulled map keeps pin/label contrast passing the axe AA gate (ACTIVE since Epic 9); the pulsing location-dot halo honours `prefers-reduced-motion` (static under reduced motion); slider thumb has an adequate touch target; sheet handle/chips keyboard-navigable; reworked quick-info aria has no orphaned separators/duplication. | R-006, R-018, R-010 | axe e2e gate green (mobile + desktop) AFTER the map tint change; reduced-motion component/e2e for the halo; component assertion on the regenerated quick-info accessible name; keyboard-nav test for the chip strip + sheet. | axe.spec.ts / axe-mobile.spec.ts green post-change; reduced-motion + aria component reports. |
| **Usability / Interaction** | Thumb-grab drag works with real touch AND mouse on mobile + desktop; the thumb/fill/badge follow the pointer 1:1 during drag; all four sheet snaps reachable by gesture; horizontal chip scroll never moves the sheet; recenter lands the dot in the visible map center at every snap state. | R-004, R-008, R-013 | Playwright **real-touch** profile (touch events, not click-sim) for thumb-drag + sheet snaps; component/e2e for recenter offset per snap state; the physical-device checklist (11.8). | Real-touch e2e green; recenter offset test per snap; recorded device checklist. |
| **Maintainability** | The `UserPin` amber becomes a design token (no raw `#d97706`); `toSunStatusToken` is fully wired OR deleted (no half-state); `vercel.json` fails the build loudly on a real lightningcss error; `.gitattributes` enforces LF for source with an isolated renormalization commit. | R-016, R-017, R-006 | Grep-audit proving no surface half-references `toSunStatusToken`; a deliberate lightningcss-fail smoke of the build command; the renormalization commit isolated; token used for the dot. | Grep report; build-fails-loudly evidence; separate renormalization commit; token in source. |
| **Reliability / Regression** | No Epic-9/10 regression: markers persist across a date change; the Epic-10 obscured/rain gate still governs every planner step; "Mest sol" ordering stable; the axe gate stays green; existing e2e specs stay green. | R-003, R-005, R-009, R-006 | The full existing vitest + e2e suite stays green; the client-series parity guard; the marker-persistence e2e; the ordering-stable test. | Green regression run; parity + persistence + ordering test reports. |

**Unknown thresholds (do NOT invent values — resolve during story drafting):**

- **Light-tint overlay strength** — "~quarter of current strength" is the maintainer's target; the exact token
  value is a design-gate eyeball against the LIVE map (11.5). `UNKNOWN` until 11.5 sets it. Tests must assert the
  *outcome* (basemap legible + axe AA still passes), not a specific opacity number.
- **Nowcast/day-series payload size ceiling** — "must stay reasonable gzipped" (11.1 AC2) has no hard number yet;
  measure and record, then set a guard. `UNKNOWN` until the 11.1 measurement lands.
- **Sheet collapsed-snap height + gesture thresholds** — the handle-only collapsed height and the tuned
  `@use-gesture` distance/velocity thresholds (11.3) are a story design decision. `UNKNOWN`; tests pin the
  *behaviour* (four snaps reachable, no axis hijack), not the magic px.
- **Date-change p95 target is fixed at < 3 s** (stretch < 1.5 s warm) by the epic — but whether the measured
  number MEETS it on the live deployment is `UNKNOWN` until 11.8 measures it; a miss is a triage item, not a
  fabricated pass.

---

## Entry Criteria

- [ ] The client-side day-series DTO shape + the `sun-engine-cache.ts` bucket key are agreed (11.1) before the
      slider decouple (11.2) is wired, so "commit triggers zero fetches" is testable end-to-end.
- [ ] A **Playwright real-touch profile** (touch events, mobile viewport) is available/added before the 11.2 +
      11.3 gesture e2e are written (mitigates R-004/R-008 — emulated mouse-drag is insufficient).
- [ ] The `openingHours` column (`venues.opening_hours`) is confirmed present on the store and surfaceable on the
      list DTO before 11.4 UI (so real hours can render and the "no data → nothing" path is exercisable).
- [ ] The shared `TagFilterContext` + `collectTags`/`localizeTag` are confirmed reusable from the
      `MobileBottomSheet` header (11.3) before the mobile chip row is built (mitigates R-009 divergence).
- [ ] The local dev DB has the seeded test venues so the deterministic `?_time=` + mocked-`/api/venues` e2e can
      navigate (the Epic-10 `epic-10-weather-matrix.spec.ts` mock pattern is the precedent).
- [ ] The maintainer is available to bless the consolidated reference-PNG rebaseline (11.7) — dev is structurally
      forbidden from self-blessing references.

## Exit Criteria

- [ ] All P0 tests passing (100%).
- [ ] All P1 tests passing or failures triaged with a waiver.
- [ ] The standing regression + request-count guards are green in CI: a settled time scrub issues **0** venue
      requests; a date change issues **exactly 1**; markers persist (no unmount) across a date change; touch-drag ON
      the slider thumb changes time (real touch); a full drag gesture commits time exactly once; the today-minimum +
      today+3 cap hold in state; the sheet reaches all four snaps by gesture; chip toggling filters pins + list on
      mobile; the quick-info renders no "Säkerhet"/sun-window text.
- [ ] The LIVE date-change p95 < 3 s is recorded (with methodology + before/after) and time-scrub = 0 requests is
      recorded; any p95 miss triaged before epic close.
- [ ] The real-device checklist is recorded (screenshots per surface) with any device-only gap triaged.
- [ ] The axe AA gate is green on the de-dulled map (mobile + desktop) and on every reworked surface.
- [ ] The maintainer-blessed reference-PNG rebaseline set is committed (11.7).
- [ ] No open high-priority (≥6) risk unmitigated.

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
| ---- | ---- | ------------------------ |
| Rasmus | Maintainer / QA Lead | Reference-PNG blessing (11.7), physical-device pass + live wall-clock perf pass (11.8), gate decisions |
| Dev agent | Dev | Red-first unit/component/e2e per story; request-count + real-touch guards; regression suite |

---

## Test Coverage Plan

> **Dedup discipline:** the client day-series math (marker %, pin state, ordering, obscured presentation for any
> step) is tested at UNIT level (pure derivation from a fixed series); the day-series DTO contract + payload size at
> API/contract level (`venues-route*`); the slider/sheet/chip/quick-info/detail render + a11y at COMPONENT level;
> and only the end-to-end interaction promises (instant scrub = 0 fetches, date change = 1 + markers persist,
> real-touch thumb-drag, four sheet snaps) at E2E level. The **request-count invariant is asserted at e2e** (it is a
> whole-app network fact); the **wall-clock perf number is measured live, not in CI**. The same fact is not asserted
> at two levels unless it is the CRITICAL R-001 guard (defence-in-depth is deliberate there).

### P0 (Critical)

**Criteria:** Blocks the epic's core promise (instant time-feel + working touch) + High risk (≥6) + No workaround
_(Priority = risk class, NOT execution timing — see the Execution Order section for when each tier runs.)_

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Client derives marker %, pin state, quick-info figures, list ordering, and obscured presentation for ANY planner time from the cached day-series (pure, offline) | Unit | R-001, R-003 | 5 | DEV | Red-first; one derivation per output; no network in the code path |
| A settled time change issues **zero** venue network requests | E2E | R-001, R-002 | 2 | QA | The headline guard; request-count assertion during a scrub |
| A full slider drag gesture commits app-level time **exactly once** (local visual value during drag, commit on release/keyboard-settle/blur) | Component + E2E | R-002 | 3 | DEV | `onSnap` seam; thumb/fill/badge follow pointer 1:1 during drag |
| Touch-drag initiated **ON the thumb** changes time with real touch AND mouse, on mobile + desktop viewports | E2E (real-touch) | R-004 | 3 | QA | Real touch events, NOT click-sim; decoration `pointer-events-none`, input sole pointer target |
| Day-series parity: per-step series equals the old single-instant compute at each instant for a fixed (venue, date, weather-bucket); Epic-10 gate applies per-step (100% cloud/rain gates any step, never only "now") | Unit | R-003, R-005 | 4 | DEV | The "one meaning per %" + "no client re-gate" guard; a diff is a FAIL not a rebaseline |
| Date change: existing markers NOT unmounted/reloaded (keyed by id); dim-gray + centered spinner overlay until the new series arrives; exactly **one** request fires | E2E + Component | R-005 | 3 | QA/DEV | Marker persistence + single-request + token-based overlay |
| Day-series DTO contract: `/api/venues` returns a per-venue series (one entry per `PLANNER_STEP_MINUTES` across the range) each carrying `sunExposurePercent` + weather-gated `currentSunStatus`; gzipped payload measured + reasonable | API | R-003, R-012 | 3 | DEV | Contract + a recorded payload-size assertion; CDN/ETag-friendly |
| De-dulled map keeps pin/label contrast passing the **axe AA gate** (mobile + desktop) after the light-tint change | E2E (axe) | R-006 | 2 | QA | Gate stays green post tint reduction; basemap legibility is a design-gate eyeball |
| Planner range rules hold in STATE: only today→today+3 selectable (forced/URL date outside window clamps); on Idag the slider min = snapped current wall-clock time (earlier unreachable by drag/tap/keyboard); min advances as the clock ticks | Unit + Component | R-007 | 4 | DEV | Boundary at "now" + a tick-advance test; future dates → full range |
| Mobile tag chips: same data set (`collectTags`/`localizeTag`) + same `TagFilterContext`; toggling filters list AND pins IDENTICALLY on both breakpoints; empty state present | Component + E2E | R-009 | 4 | DEV | Orphaned-tag prune (Story 9.7 guard) still holds on mobile |
| Sheet reaches all four snaps by gesture (peek/mid/full + handle-only collapsed) with the map interactive behind the collapsed state; horizontal chip scroll never triggers vertical sheet movement | E2E (real-touch) | R-008 | 4 | QA | No gesture dead-zones; axis-conflict guard |
| Quick-info renders NO "Säkerhet: NN%" and NO "Sol HH:mm–HH:mm" line on either breakpoint; real opening hours render (or nothing when data absent, never fabricated); compact route button reads only "VISA RUTT" | Component | R-010 | 5 | DEV | sr-only confidence text may remain; aria regenerated to essentials, no orphaned separators |

**Total P0:** ~**40 tests** across 12 requirement rows, **~22–34 hours**

### P1 (High)

**Criteria:** Important behaviour + Medium risk (4) + common workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Day-series cached per (venue, date, weather-refresh-bucket) in `sun-engine-cache.ts`; a new weather bucket recomputes; the series + its gating cached together | Unit (fake-timer) | R-012 | 3 | DEV | Mirrors the Epic-10 gated-outcome-with-weather cache rule |
| Desktop chip row made horizontally scrollable with left/right arrow buttons + edge-fade; arrows page + disable at the ends; row keyboard-navigable; all tags reachable at any width | Component | R-008 | 4 | DEV | Replaces the `overflow-hidden` mid-chip clip |
| Recenter is viewport-aware: `flyTo` padding/offset per current obstruction (sheet snap on mobile, panels on desktop) lands the dot in the visible-map center | Component + E2E | R-013 | 4 | DEV | Test the landed center per snap/panel state; flyTo stays 500 ms |
| Location dot upgraded: larger, design-token amber + white ring, continuous pulsing halo; static halo under `prefers-reduced-motion`; distinct from venue pins at all zooms | Component + E2E | R-018, R-006 | 4 | DEV | Token replaces raw `#d97706`; reduced-motion path asserted |
| Detail clean first paint: fallback fields render immediately, every detail-only region shows a skeleton until real data; no malformed frame; no layout jump on fallback→detail swap | Component + E2E | R-011 | 4 | DEV | The wrong-data-first render is the bug, not a missing skeleton |
| Detail content polish: "Soltider idag" removed on both breakpoints (no orphaned spacing) + `VenueTimeline` render path & i18n pruned; "Omdömen" empty state shows EXACTLY ONE "Inga omdömen"; reviews centered | Component | R-011 | 4 | DEV | Engine timeline computation stays (11.1 consumes it) |
| Slider visual: thumb/badge/track match the reference; disabled/elapsed segment (today-clamp) visually distinct + visually inert | Component | R-007, R-004 | 3 | DEV | Idle + today-clamped states |
| Mobile card layout aligned to the reference `QuickInfo` (spacing/type/badge/CTA) holds without overflow across sun states (full/partial/shaded/obscured) at common mobile widths; obscured two-signal treatment preserved | Component | R-010 | 3 | DEV | The Epic-10 obscured chrome must survive the rework |
| No Epic-9/10 regression: existing e2e specs + full vitest suite stay green; "Mest sol" ordering stable across time steps (client re-sort agrees with server pre-slice via `sunListRank`) | Unit + E2E | R-003, R-005 | 2 | DEV/QA | `sunListRank` client/server lock-step preserved |

**Total P1:** ~**31 tests** across 9 requirement rows, **~15–26 hours**

### P2 (Medium)

**Criteria:** Secondary flows + Low risk (1-2) + edge cases

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| `toSunStatusToken` fully resolved: EITHER all sun-status surfaces consume it OR it is deleted + comment corrected; grep proves no half-reference | Unit + static | R-017 | 2 | DEV | Binary outcome; no worse half-state |
| Unused i18n keys pruned from `messages/{sv,en}` after the quick-info + detail removals; `sv`/`en` parity green | Unit | R-010, R-011 | 2 | DEV | messages-parity test stays green |
| `.gitattributes` LF normalization lands with an ISOLATED `git add --renormalize` commit; build fails loudly on a real lightningcss error (`|| true` removed) | Static / build | R-016 | 2 | DEV | Renormalization diff kept separate from functional change |
| Sheet drag feel: drags track the finger 1:1; snap decisions respect distance AND velocity; no dead-zones (beyond the four-snap P0 guard) | E2E (real-touch) | R-008 | 3 | QA | Tuning-quality edges |

**Total P2:** ~**9 tests/checks**, **~4–8 hours**

### P3 (Low)

**Criteria:** Nice-to-have + exploratory + manual

| Requirement | Test Level | Test Count | Owner | Notes |
| ----------- | ---------- | ---------- | ----- | ----- |
| LIVE date-change p95 < 3 s (warm/cold trials) + time-scrub = 0 requests, recorded with methodology | Manual (live) | 1 | QA | R-014 — wall-clock, recorded not CI-gated |
| Physical-device checklist over every Epic-11 surface (slider thumb-drag, sheet 4-snap + chips, quick-info states, map tint/dot/recenter, detail first paint) with screenshots | Manual (device) | 1 | QA | R-015 — device-only gaps triaged before close |
| Maintainer-blessed consolidated reference-PNG rebaseline (Epic-9 list + Epic-10 obscured + every surface Epic 11 touches) committed | Manual (maintainer) | 1 | Maintainer | R-006/R-011 — dev FORBIDDEN from self-blessing refs |
| Gzipped day-series payload size measurement recorded + a guard set once measured | Unit/manual | 2 | DEV | R-003/R-012 — sets the currently-`UNKNOWN` ceiling |

**Total P3:** ~**5 tests/checks**, **~2–5 hours**

---

## Execution Strategy

**Keep it simple — run everything in PRs unless it is expensive or cannot run headless.**

- **Every PR (<15 min, Playwright parallelizes 100s of tests in 10–15 min):** the entire automated suite — all
  vitest unit/component tests, the deterministic Playwright e2e (incl. the **request-count guard** and the **mobile
  real-touch profile**), and the axe AA gate. There is no expensive automated tier here.
- **Manual / on-demand (NOT CI-gated — recorded in the Story 11.8 record):** the LIVE wall-clock date-change p95
  pass (needs the real deployment + warm/cold trials), the physical-device checklist (a real phone cannot run
  headless), and the maintainer-blessed reference-PNG rebaseline. These are the only things deferred out of PR, and
  they are deferred because they are wall-clock / device / human-judgement bound, not because they are slow.
- **No nightly/weekly tier is needed** — this epic adds no k6/chaos/long-running suite.

## Execution Order

### Smoke Tests (<5 min)

**Purpose:** Fast feedback; catch a re-lie on the headline promise immediately

- [ ] Settled time scrub issues 0 venue requests (e2e request-count) (~3s)
- [ ] Touch-drag ON the thumb changes time (real-touch e2e, mobile profile) (~3s)
- [ ] Client series derivation returns the same % as the server single-instant for a fixed step (unit) (~1s)
- [ ] Quick-info shows no "Säkerhet" / no sun-window line (component smoke) (~2s)

**Total:** 4 scenarios

### P0 Tests (<10 min)

**Purpose:** Instant-feel + working touch + range rules + mobile filter + de-dull a11y

- [ ] Client series derivation matrix + parity-with-server (unit)
- [ ] Scrub=0-requests / date-change=1-request + markers persist (e2e)
- [ ] Thumb real-touch drag + one-commit-per-gesture (e2e/component)
- [ ] Day-series DTO contract + payload size (API)
- [ ] Planner today→today+3 + today-minimum-in-state (unit/component)
- [ ] Mobile chips filter list+pins identically both breakpoints + four sheet snaps (component + real-touch e2e)
- [ ] Quick-info content removals + opening-hours-or-nothing (component)
- [ ] axe AA green on the de-dulled map (e2e axe)

**Total:** ~40 scenarios

### P1 Tests (<30 min)

**Purpose:** Cache, desktop chip scroll, recenter, living dot, detail first-paint + polish, no regression

- [ ] Day-series cache bucket (fake-timer unit)
- [ ] Desktop scrollable chip strip + arrows/edge-fade (component)
- [ ] Viewport-aware recenter per snap state (component/e2e)
- [ ] Pulsing dot + reduced-motion (component/e2e)
- [ ] Detail clean first paint + skeletons + content polish (component/e2e)
- [ ] Slider reference visual + today-clamp; mobile card layout across sun states; ordering-stable + green regression

**Total:** ~31 scenarios

### P2/P3 Tests (<15 min added) + Manual passes

**Purpose:** Dead-code resolution, i18n prune, EOL/build hygiene, drag-feel edges + the live/device/rebaseline passes

- [ ] `toSunStatusToken` resolution + i18n prune + `.gitattributes`/build-fail-loud + drag-feel edges (unit/static/e2e)
- [ ] Live p95 pass + physical-device checklist + maintainer reference-PNG rebaseline + payload-size guard (manual)

**Total:** ~14 scenarios/checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
| -------- | ----- | ---------- | ----------- | ----- |
| P0 | ~40 | ~0.6–0.9 | ~22–34 | Client-series matrix + request-count/real-touch e2e (new profile) + range rules + mobile chips + de-dull axe |
| P1 | ~31 | ~0.5–0.85 | ~15–26 | Cache, chip scroll, recenter offset, living dot, detail first-paint + polish, regression |
| P2 | ~9 | ~0.3–0.7 | ~4–8 | Dead-code/i18n/EOL hygiene + drag-feel edges |
| P3 | ~5 | ~0.5–1.5 | ~2–5 | Live p95 + device checklist + maintainer rebaseline + payload guard (mostly manual) |
| **Total** | **~85** | **–** | **~42–72** | **~1–1.75 weeks** for one engineer |

### Prerequisites

**Test Data:**

- A fixed day-series fixture (one venue, one date, one weather-bucket) with the per-step gated series, for the
  client-derivation parity unit tests (no network).
- The Epic-10 mocked-`/api/venues` `page.route` pattern (`epic-10-weather-matrix.spec.ts`) extended to return a
  day-series-carrying DTO for the scrub/date-change e2e.
- The seeded test venues in the local dev DB for e2e navigation; at least one venue WITH and one WITHOUT
  `opening_hours` (for the "real hours vs nothing" quick-info test).
- Tag fixtures that overflow the desktop chip row width (to exercise the scroll/arrows) + a shared set for the
  mobile chip parity test.

**Tooling:**

- A **Playwright mobile real-touch profile** (touch events / `hasTouch`) — the single most important NEW harness
  piece (R-004/R-008): emulated mouse-drag is insufficient for thumb-grab and sheet-snap physics.
- The **request-count guard** mechanism (count `**/api/venues*` requests across a scrub / a date change) — the CI
  proxy for the wall-clock perf win.
- Vitest fake timers for the day-series cache-bucket + today-minimum tick-advance tests.
- `@axe-core/playwright` (already wired) for the AA gate on the de-dulled map + reworked surfaces.

**Environment:**

- CI keeps running Playwright against `next dev` so `?_time=` forcing fires (project-context "Production
  planner-forcing gate" — do NOT switch the webServer to a production build or the deterministic time specs break).
- No live Met.no/Nowcast in CI (the day-series is served from the mocked DTO at the boundary; the LIVE p95 pass runs
  against the real deployment, recorded manually).

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate:** 100% (no exceptions — these are the instant-feel + working-touch + honest-content guards)
- **P1 pass rate:** ≥95% (waivers required for failures)
- **P2/P3 pass rate:** ≥90% (informational; the live-perf + device + rebaseline passes are recorded, not auto-gated)
- **High-risk (≥6) mitigations:** 100% complete or approved waivers

### Coverage Targets

- **The instant-feel guards (R-001/R-002):** 100% — scrub=0-requests + one-commit-per-gesture + client-derivation
  parity all covered
- **Real-touch interaction (R-004/R-008):** the thumb-drag + four-snap paths covered by a real-touch profile, not
  click-sim
- **Client-derived series parity (R-003/R-005):** every time-dependent output (%, pin, ordering, obscured) proven
  to equal the server truth per step
- **a11y (R-006/R-018):** axe AA green on the de-dulled map + reworked surfaces; reduced-motion halo path covered

### Non-Negotiable Requirements

- [ ] All P0 tests pass.
- [ ] No high-risk (≥6) item unmitigated.
- [ ] The request-count invariants (scrub=0, date-change=1) are green in CI.
- [ ] Real-touch thumb-drag + four sheet snaps are proven by a real-touch profile (not click-sim).
- [ ] Client-derived series values are byte-parity with the server single-instant compute per step (a diff is a FAIL).
- [ ] axe AA gate green on the de-dulled map (mobile + desktop).
- [ ] The LIVE date-change p95 pass + the physical-device checklist exist and any gap is triaged before the epic closes.

---

## Mitigation Plans

### R-001: The ~9.6 s time-change stall / "shipped-but-insufficient" recurrence (Score: 9, CRITICAL)

**Mitigation Strategy:** Do not dampen — REMOVE the fetch. The list DTO carries the whole gated per-step day-series;
the client derives every time-dependent output from the cache; a settled time change issues ZERO network requests.
Defend with defence-in-depth at three levels: unit (client derivation is pure/offline), e2e (request-count = 0
during a scrub), and the LIVE wall-clock pass (date-change p95 < 3 s). Story 11.8 is the STANDING anti-"insufficient"
gate that makes the pattern impossible to repeat silently.
**Owner:** Dev/QA
**Timeline:** Stories 11.1 (series) + 11.2 (drag decouple) + 11.8 (verification)
**Verification:** All three levels green; the smoke-tier request-count guard fails loudly if a scrub re-fetches; the
recorded live p95 shows the before/after win.

### R-003: Client-derived values diverge from server truth / payload bloats (Score: 6)

**Mitigation Strategy:** Parity guard — for a fixed (venue, date, weather-bucket) the per-step series equals the old
single-instant compute at each corresponding instant, and the Epic-10 cloud/rain gate applies PER STEP (never only
to "now"). Measure and record the gzipped ~50-venue × ~64-step payload; assert it stays reasonable and CDN/ETag-
friendly; cache per (venue, date, weather-refresh-bucket).
**Owner:** Dev
**Timeline:** Story 11.1
**Verification:** Parity unit test green (a diff FAILs, not a rebaseline); recorded payload byte size in the story
record; cache-bucket fake-timer test green.

### R-004: Thumb-grab drag still dead on real touch (Score: 6)

**Mitigation Strategy:** Make the decoration (`thumb` div + value badge) `pointer-events-none`; keep the range input
the sole pointer target with an adequate touch height. Verify with a Playwright **real-touch** profile (touch
events, not click-simulation) PLUS the physical-device checklist — emulated mouse-drag can pass while a real finger
fails.
**Owner:** Dev/QA
**Timeline:** Stories 11.2 + 11.8
**Verification:** Real-touch e2e: a touch-drag initiated ON the thumb changes time on mobile + desktop; device
checklist recorded.

### R-005: Date change unmounts markers / Epic-10 gate regresses on the client (Score: 6)

**Mitigation Strategy:** Markers stay mounted (keyed by venue id) under a token-based dim-gray + centered spinner
overlay, then update in place; a date change fires EXACTLY ONE request. The client never re-implements the Epic-10
gate — it reads the already-gated series value for each step, so the obscured/rain presentation for any planner time
equals the server gate.
**Owner:** Dev
**Timeline:** Story 11.1 (+ 11.5 overlay treatment)
**Verification:** Marker-persistence e2e (no unmount across a date change); single-request assertion; the client
obscured/rain presentation matches the server-gated series value per step.

### R-006: Map de-dull drops contrast below the axe AA gate (Score: 6)

**Mitigation Strategy:** Reduce the sand+gradient wash to a light warm tint (~quarter strength, exact value via a
design-gate eyeball against the LIVE map) via a token change (no ad-hoc hex); re-run the axe AA gate on the map
(mobile + desktop) AFTER the change and confirm pin/label contrast still passes.
**Owner:** Dev/UX
**Timeline:** Story 11.5
**Verification:** axe.spec.ts + axe-mobile.spec.ts green post-tint; the design-gate eyeball confirms basemap
legibility.

---

## Assumptions and Dependencies

### Assumptions

1. The light-tint overlay strength, day-series payload ceiling, sheet collapsed-snap height + gesture thresholds are
   all resolved to concrete values during story drafting (they are `UNKNOWN` here by design — not invented). Tests
   assert *behaviour/outcome* (legibility, four snaps, 0 requests), not magic numbers.
2. `venues.opening_hours` exists and is surfaceable on the list DTO (11.4); a venue without it shows nothing.
3. The Epic-10 mocked-`/api/venues` `page.route` pattern is the injection seam for the day-series-carrying DTO in
   the scrub/date-change e2e (no live Met.no in CI); the LIVE p95 pass runs against the real deployment.
4. CI keeps running Playwright against `next dev`, so `?_time=` forcing fires; a Playwright real-touch profile can be
   added for the gesture specs.
5. The seeded test venue set is deterministic for e2e; at least one venue with and one without opening-hours data.
6. `sunListRank` (client + server mirror) stays in lock-step so "Mest sol" ordering is stable as the client derives
   ordering per step from the series.

### Dependencies

1. **The client-side day-series DTO + `sun-engine-cache.ts` bucket** — the foundation 11.2/11.4/11.8 build on.
2. **A Playwright real-touch profile** — a prerequisite for the 11.2/11.3 gesture e2e (R-004/R-008).
3. **The `@axe-core/playwright` AA gate** (active since Epic 9) — must stay green on the de-dulled map + reworked
   surfaces.
4. **Maintainer availability** — for the reference-PNG blessing, the physical-device pass, and the live p95 pass
   (11.7/11.8).

### Risks to Plan

- **Risk:** the light-tint value / sheet thresholds are chosen late, forcing test-matrix churn.
  - **Impact:** P1 tuning tests re-pinned.
  - **Contingency:** tests assert *outcome/behaviour* (legibility + axe pass; four snaps reachable; no axis hijack)
    not a specific opacity/px, so they survive a value re-tune.
- **Risk:** the live p95 pass falls on a slow-network day and cannot cleanly show < 3 s.
  - **Impact:** the wall-clock evidence is delayed.
  - **Contingency:** the CI request-count invariant (scrub=0, date-change=1) is the durable gate; the p95 is
    recorded with warm/cold methodology + repeated trials and any miss triaged, not fabricated as a pass.
- **Risk:** the day-series payload measures larger than "reasonable".
  - **Impact:** CDN/ETag efficiency + first-paint budget at risk.
  - **Contingency:** record the byte size, set the guard from the measurement, and if bloated, trim series
    resolution or field set in-story before merge (do not ship an unbounded payload).

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate the failing red-first P0 tests (client-series derivation + request-count + real-touch
  thumb-drag) — separate workflow; not auto-run.
- Run `*automate` for broader coverage once implementation exists.
- Run `*trace` at the epic boundary to produce the traceability matrix + gate decision.
- Run `*nfr-assess` once implementation evidence exists (this doc PLANS NFR validation; it does not assess final
  PASS/CONCERNS/FAIL — in particular the live p95 + payload-size + axe evidence).

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: {name} Date: {date}
- [ ] Tech Lead: {name} Date: {date}
- [ ] QA Lead: {name} Date: {date}

**Comments:**

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **`app/api/venues/route.ts`** | Adds the per-venue day-series to the DTO; day-series cached; `sunListRank` still governs ordering | `venues-route*.test.ts` — new series field + contract; ordering byte-stable; ETag still valid |
| **`lib/services/sun-engine.ts` + `sun-engine-cache.ts`** | Exposes/reuses the per-day timeline walk for the list route; series cached per (venue, date, weather-bucket) | `sun-engine*.test.ts` + caching atdd — geometric fields + gate byte-identical per step; bucket rollover |
| **`components/composed/time/TimeSlider.tsx`** | Decoration `pointer-events-none`; local drag value + single commit on settle; today-clamp + date-range rendering | `TimeSlider` component tests + a real-touch e2e; one-commit-per-gesture |
| **`lib/contexts/TimeContext` + `DatePickerDialog`** | today→today+3 cap + today-minimum enforced in state | Component + unit; forced/URL out-of-window clamps; tick-advance |
| **`components/custom/sheets/MobileBottomSheet.tsx`** | Fourth handle-only collapsed snap; header chip row; `@use-gesture` retune | Real-touch e2e: four snaps + no axis hijack; map interactive behind collapsed |
| **`components/custom/layout/DesktopNavBar.tsx`** | Chip row scrollable + arrows/edge-fade (replaces `overflow-hidden` clip) | Component: all tags reachable + keyboard-nav; shared `TagFilterContext` |
| **`components/composed/venue/VenueQuickInfo.tsx`** | Removes "Säkerhet"/sun-window; adds opening hours; compact route button "VISA RUTT" only; aria regenerated | Component across sun states; obscured chrome preserved; i18n parity |
| **`components/composed/venue/VenueDetailContent.tsx`** | Clean first paint (skeletons for detail-only regions); "Soltider idag" + `VenueTimeline` path removed; single "Inga omdömen" | `VenueDetailContent.test.tsx` + e2e; no malformed frame; no layout jump |
| **`components/custom/map/MapContainer.tsx` + `UserPin.tsx`** | Overlay → light warm tint (token); dot larger + tokenized amber + pulsing halo (reduced-motion static) | axe AA gate green; reduced-motion halo; `MapView.test.tsx` |
| **`components/custom/map/MapView.tsx` (recenter)** | Viewport-aware `flyTo` offset per snap/panel state | `MapControls`/`MapView` tests + e2e; landed center per snap |
| **`lib/utils/sun-status-presentation.ts` (`toSunStatusToken`)** | Wired into all surfaces OR deleted | Grep proof of no half-state; existing `sun-status-presentation.test.ts` updated |
| **`vercel.json` + `.gitattributes`** | Build fails loudly on lightningcss error; LF normalization + isolated renormalization commit | Build-fails-loud evidence; renormalization diff isolated |
| **e2e suite** | New real-touch profile + request-count guard; existing `?_time=`/axe/mobile-regression specs unaffected | All existing e2e specs (`smoke`, `map-primary`, `responsive-layout`, `axe`, `axe-mobile`, `epic-9-mobile-regression`, `epic-10-weather-matrix`) stay green |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — risk classification framework
- `probability-impact.md` — P×I scoring methodology (1–9; ≥6 MITIGATE, 9 BLOCK)
- `test-levels-framework.md` — Unit/Integration(API)/Component/E2E selection + duplicate-coverage guard
- `test-priorities-matrix.md` — P0–P3 prioritization + risk-to-priority mapping

### Related Documents

- Epic: `_bmad-output/planning-artifacts/epics.md` §"Epic 11" (lines ~2791–3021)
- PRD (FR12 — geometry × cloud blend, consumed per-step by the day-series): `_bmad-output/planning-artifacts/prd.md`
- Architecture (caching strategy, API/DTO boundary): `_bmad-output/planning-artifacts/architecture.md`
- Project Context (Epic 9/10 ratified conventions, prod-gate, caching windows, visual-gate-is-an-LLM-eyeball): `project-context.md`
- Prior epic test design (house style + regression-guard + dedup pattern): `test-design-epic-10.md`

### Source Files Confirming the Six Root Causes (+ hygiene)

- `nextjs-app/components/composed/time/TimeSlider.tsx:52-61` (value badge over input, no `pointer-events-none`), `:104-118` (thumb div over input), `:73-103` (input; per-step `onChange` commit)
- `nextjs-app/app/api/venues/route.ts:277` (`resolveRequestedAt` single instant; no day-series field), `:87-95` (`sunListRank` client/server lock-step)
- `nextjs-app/components/custom/map/MapContainer.tsx:169-173` (`bg-surface-sand/80` z1), `:174-178` (`gradient-map-overlay` z2)
- `nextjs-app/components/custom/layout/DesktopNavBar.tsx:101-126` (chip row desktop-only, `:104` `overflow-hidden` clip)
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx:285` ("Säkerhet"), `:273` (`sunTimeRange` window), `:330` (`estimateLabel`→RouteButton); no `openingHours` prop
- `nextjs-app/components/custom/sheets/MobileBottomSheet.tsx:14` (peek/mid/full/dismissed — no handle-only interactive collapsed snap; no header chip row)
- `nextjs-app/components/custom/map/UserPin.tsx:27` (raw `#d97706`), `:42-51` (STATIC halo)
- `nextjs-app/lib/utils/sun-status-presentation.ts:15` (`toSunStatusToken` orphaned — only its own unit test imports it)
- `nextjs-app/vercel.json` (installCommand `... || true` swallows lightningcss), root `.gitattributes` (LF only for `/.gitattributes` + `*.sh`; no source-file rule; `nextjs-app/` has none)

---

**Generated by:** BMad TEA Agent — Test Architect Module
**Workflow:** `bmad-testarch-test-design` (Epic-Level mode)
**Version:** 4.0 (BMad v6)
