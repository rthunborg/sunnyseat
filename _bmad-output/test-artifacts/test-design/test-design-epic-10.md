---
stepsCompleted: ['step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-07-02'
---

# Test Design: Epic 10 - "Honest Sky" (Weather-Gated Two-Signal Sun Display)

**Date:** 2026-07-02
**Author:** Rasmus
**Status:** Draft
**Design Level:** Epic-Level (single test plan, stories 10.1–10.5)

---

## Executive Summary

**Scope:** Epic-level test design for Epic 10 — making the LIVE app's headline sun state weather-honest while
preserving the geometric sun-position layer as a clearly-labelled second signal ("cloudy now — but when it clears,
THIS is the terrace in sun"). Covers all 5 stories: 10.1 cloud-gated engine + weather-truth root-cause fixes, 10.2
the "Sun behind clouds" two-signal UI state, 10.3 layered cloud detail (`complete` endpoint + effective cover), 10.4
the rain-now Nowcast signal, 10.5 the weather-reality verification pass + regression guards.

> **Context note:** the app is already in **Production** on the real data path (Supabase venue store + real sun
> engine + persisted feedback/reviews). This epic changes what the live product *tells users about the sky right
> now* — the defining failure mode is a **truth/data-integrity regression**: a terrace shown at 63–100% "FULL SOL"
> while it rains. The dominant risk theme is therefore **honest-output correctness**, not greenfield feature risk.
> Three stories (10.1 engine, 10.3 data, 10.4 data) have **no UI of their own** — their acceptance signal is a
> red-first unit-test matrix, not screenshots. One story (10.2) deliberately introduces a **fourth visual state**
> and is the only one that touches visual references. One story (10.5) is a **verification + regression-guard**
> story whose gate is a deterministic mocked-weather e2e matrix plus a recorded live spot-check.

> **The four root causes this epic must actually fix (confirmed in source, not just claimed):**
> 1. `sun-engine.ts:439-441` — `currentSunStatus` is geometry-only (`isSunVisible` = above-horizon astronomy).
> 2. `confidence-calculator.ts:151-157` — `calcCloudCertainty` never reads `weather.cloudCover` (scores
>    freshness/forecast-flag/source only), so FR12's promised geometry×cloud blend was never implemented.
> 3. `sun-engine.ts:451-453` — `skyCondition` is computed and serialized but no component consumes it.
> 4. `met-no-service.ts:85` — `cloud_area_fraction ?? 0` defaults missing cloud to **clear sky** (the optimistic
>    default is exactly the wrong failure mode).

**Risk Summary:**

- Total risks identified: **17**
- High-priority risks (score ≥6): **6** (one CRITICAL, score 9 — R-001, the exact failure the epic exists to kill)
- Critical categories: **DATA/BUS** (the sun-lies-during-rain regression + its recurrence), **TECH** (incomplete
  status-union sweep; e2e sky-flakiness), **PERF/DATA** (cache pinning an inconsistent status/weather pair),
  **OPS/REL** (external Nowcast/complete-endpoint degradation).

**Coverage Summary:**

- P0 scenarios: **11** (~20–32 hours)
- P1 scenarios: **13** (~14–24 hours)
- P2/P3 scenarios: **10** (~6–14 hours)
- **Total effort:** ~**40–70 hours** (~**1–1.75 weeks** for one engineer, much of it extending existing
  `sun-engine` / `confidence-calculator` / `met-no-service` / component fixtures rather than net-new harness)

> **Reading the priority columns:** P0/P1/P2/P3 denote **priority / risk class**, NOT execution timing. Execution
> timing (PR vs nightly) is handled separately in the Execution Strategy section. Because the whole suite is
> vitest + a small deterministic Playwright set that all run under ~15 min, everything here runs on PR.

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| **Tier 3 — commercial satellite irradiance nowcasting** (Solcast-type feeds) | Explicitly excluded by the epic; backlog, revisit only if the hourly cloud signal feels laggy in user feedback | Documented as future work; no code/test in this epic |
| **Per-cloud / per-patio "is THIS terrace's sun blocked by THAT cloud right now"** | Physically unachievable from any data source (cumulus ~100s m moving 30–50 km/h; Met.no ~2.5 km grid; radar stale on arrival) — weather is a citywide-scale signal, geometry is the per-patio signal | Copy-review tests assert UI never claims per-venue cloud precision; per-venue cloud *differences* within the city are treated as noise, not signal (no test asserts venue-to-venue cloud variance) |
| **Changing the geometric meaning of `sunExposurePercent` / `sunWindow` / `peakTime`** | Hard scope guardrail — the % must keep ONE physical meaning (clear-sky potential); the weather gate is additive | Byte-identical regression guard: geometric fields identical across weather variations for the same geometry+instant (R-001 mitigation / Story 10.5 AC) |
| **Blending cloud into `sunExposurePercent`** | Rejected by maintainer decision — fabricates an undefendable number | Confidence (not %) absorbs cloud; a test asserts % is weather-invariant (see above) |
| **List ranking algorithm change** | "Mest sol" must keep ranking by geometric solläge so comparison still works under overcast | Component/behaviour test: ranking stable across weather states (Story 10.2 AC) |
| **Met.no TOS re-negotiation / new contact identity** | Carries over unchanged (identifying User-Agent `rasmus.thunborg@enhancior.se`, ≤4-decimal coords, dedupe/cache) — Nowcast just inherits the same posture | Contract-style unit tests assert User-Agent + coord truncation on the new Nowcast client (R-013) |
| **Pixel-perfect visual diffing of the new Obscured state** | The project "Visual validation" gate is an LLM eyeball (sonnet) that ignores sizing/spacing — proportion/centering regressions can slip (MEMORY: Story 2.5 full-width time-picker) | Story 10.2 adds explicit component-level assertions (no amber/FULL-SOL while gated; obscured accessible name present exactly once; AA contrast via axe) as code tests, not relying on the visual gate alone |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- | -------- |
| **R-001** | DATA / BUS | **The epic's raison d'être returns:** a venue geometrically sunlit under ≥threshold cloud (or active rain) still renders "FULL SOL" / amber / high %. This is the live incident (63–100% during rain). Multiple independent surfaces (pin, card, quick-info, detail, list) each read status/`%`/badge — any one un-gated re-lies. | 3 | 3 | **9** | Extend `VenueSunStatus` with `CloudObscured` at the engine; gate at the single derivation point (`sun-engine.ts` currentSunStatus); red-first unit + component + e2e that assert NO surface shows FULL SOL/amber while gate active; a standing regression guard "100% cloud can never render FULL SOL on any surface". | Dev | Story 10.1 + 10.2 |
| **R-002** | DATA | **Missing cloud data reads as clear sky** (`cloud_area_fraction ?? 0`) — the optimistic default is the wrong failure mode; absent data must read "unknown", never "sunny". Also applies to absent `_low/_medium/_high` split (10.3) and Nowcast `[]`/null (10.4). | 2 | 3 | **6** | Change the default to weather-unknown (no gate applied, no fabricated clear); unit test proves missing cloud can NEVER produce a "clear" gate input; freshness/uncertainty signals reflect the gap; 10.3 falls back to total, 10.4 degrades to Tier 0/1. | Dev | Story 10.1 (10.3/10.4 inherit) |
| **R-003** | TECH | **Incomplete `VenueSunStatus` union sweep.** Adding a 5th value to the `'Sunny' \| 'Partial' \| 'Shaded' \| 'NoSun'` union touches API sanitizer/`normalizeVenueForResponse`, `lib/types/api.ts` (3+ sites), `lib/types/map.ts`, fixtures, `FeedbackFlow` predicted-state, `venue-pin-mapping.ts`, and every list/pin/card/detail switch. A missed exhaustive switch → runtime crash or a silent wrong badge. | 2 | 3 | **6** | Prefer a `never`-exhaustive switch (compile-time miss detection) over string comparison; venues-route contract tests cover the new value; component tests render all four visual states; grep-audit every `currentSunStatus`/`sunStatus`/`predictedState` reader (43 files matched) as a task checklist. | Dev | Story 10.1 |
| **R-004** | BUS / DATA | **Absence-of-rain leaks a positive sun signal** (violates the hard constraint "no-rain must NEVER imply sun"). Easy to introduce: a naive `if (!raining) status = Sunny` or letting no-rain short-circuit the cloud/geometry gates. | 2 | 3 | **6** | Rain contributes only negatively; dedicated red-first tests: (a) no-rain + overcast + geometrically-sunlit is still Obscured; (b) no-rain + clear + geometrically-shaded is still Shaded. Nowcast is consulted only for near-now; future/planner requests never mix a stale "now" radar reading. | Dev | Story 10.4 |
| **R-005** | TECH / OPS | **Weather-state e2e is sky-flaky.** Today's e2e hit the real dev-server `/api/venues` (server computes state from the live Met.no fetch); `?_time=` pins wall clock but NOT sky. Without a deterministic weather-boundary mock the 10.5 matrix passes/fails with the real Gothenburg weather → red CI on sunny days, green on rainy ones. | 3 | 2 | **6** | Introduce a deterministic weather mock BEFORE writing the matrix: either `page.route('**/api/venues*')` injecting fixed `currentSunStatus`/`skyCondition`/`cloudCover` per scenario, or a dev-only weather-forcing param analogous to `?_time=`. No live Met.no calls in CI. Matrix asserts each of {overcast, clear, high-cirrus-only, active-rain, weather-missing} at a forced `?_time=`. | Dev/QA | Story 10.5 |
| **R-006** | PERF / DATA | **The 15-min sun-compute cache pins an inconsistent status/weather pair.** The gated status now depends on the weather slice; the cache (`sun-engine-cache.ts`, 15-min bucket, SUCCESS-only) must cache the gated outcome *with* its weather slice so a cached bucket stays internally consistent, and a weather-unknown/degraded compute is not pinned. | 2 | 3 | **6** | Fake-timer cache tests prove: gated outcome + its weather cached together; a weather-missing/degraded compute is NOT cached (retries next request, mirroring the existing `cacheable: buildings !== null` rule); geometric fields byte-identical across cache hit/miss. | Dev | Story 10.1 |

### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| **R-007** | DATA | **Cloud-layer weighting formula wrong** (10.3): 100% high-cirrus-only trips the gate (false "no sun" under thin haze), or 100% low stratus fails to trip it. | 2 | 2 | **4** | Named-constant weighting (low/medium dominate, high weak); unit matrix pins boundary: 100% high-only must NOT gate, 100% low MUST gate; document formula + rationale. | Dev |
| **R-008** | REL / OPS | **`complete`-endpoint or Nowcast outage is not silent** — a fetch failure throws/500s instead of degrading to Tier 0/1. | 2 | 3 | **6** → capped MONITOR* | Mirror forecast client posture: graceful `[]`/null on failure, never a throw/500/fabricated value; unit test proves outage degrades and changes nothing positive. *Listed here (not ≥6 table) because the existing `getForecast` try/catch already returns `[]` on error — new clients inherit the pattern; residual risk is a NEW client forgetting it. | Dev |
| **R-009** | PERF | **Extra Nowcast fetch inflates request latency / RPC count.** A per-venue near-now Nowcast call added on top of the existing forecast + buildings fetches could regress the 9.3 caching win if not deduped/short-TTL-cached. | 2 | 2 | **4** | Per-coordinate dedupe + short-TTL cache consistent with the 5-min product cadence (≤4-decimal coord key, like forecast); Nowcast consulted only for near-now (not future/planner); no unbounded fan-out. | Dev |
| **R-010** | BUS | **Two-signal copy confuses users or over-claims.** "Solläge 100% · sol här när det klarnar" must read as position-not-weather; sky-condition copy must be plain-language (no geodata/meteorology internals per Story 3.0.6). | 2 | 2 | **4** | Copy-review component tests: `sv`/`en` parity (new keys in both locales); geometric potential labelled as position; no meteorology internals leaked; About-page copy still truthful post-blend (10.5). | Dev/UX |
| **R-011** | TECH / BUS | **Fourth visual state not visually distinct** — Obscured looks like Shaded (grey) or Partial, defeating the "at a glance" honesty goal. | 2 | 2 | **4** | Muted palette from DESIGN.md tokens (no ad-hoc hex); component test asserts distinct state class/label across all four states on pin+card+quick-info+detail; visual-validation screenshots (mobile+desktop) of the overcast state before QA handoff. | Dev/UX |
| **R-012** | DATA | **`skyConditionFromCloudCover` never emits `rain`; missing/unknown must map to a real state.** `design-tokens.ts` `SkyCondition` already has `'rain'` + `'unavailable'`; the engine must now emit `rain` (10.4) and `unavailable` (missing) so the UI renders them. | 2 | 2 | **4** | Unit tests over the sky-condition mapper for rain + unavailable; component test renders each `SkyCondition` value with `sv`/`en` copy. | Dev |
| **R-013** | SEC / OPS | **New Nowcast client breaks Met.no TOS posture** — missing identifying User-Agent or un-truncated coordinates on the new endpoint. | 1 | 2 | **2** | Contract-style unit test asserts the Nowcast request carries the identifying User-Agent and ≤4-decimal lat/lon (reuse the `met-no-service` pattern). | Dev |

*R-008 is scored P2×I3=6 by the matrix but is downgraded to MONITOR in practice because the graceful-degradation
pattern already exists in `getForecast` and the new clients inherit it; the residual risk is a new client omitting
the try/catch, which the P1 outage-degradation test directly covers.*

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------ |
| **R-014** | TECH | Near-now horizon boundary off-by-one: a `requestedAt` exactly at the Nowcast horizon edge flips consult/don't-consult. | 1 | 2 | 2 | Unit boundary test at the horizon edge; document the horizon constant. |
| **R-015** | OPS | Live spot-check (10.5 AC) can't be automated — depends on real Gothenburg sky + raw Met.no responses on the day. | 1 | 2 | 2 | Manual, recorded in the story record (screenshots + fetched cloud/precip values); any mismatch triaged to root cause before epic closes. Deferred-verification, not a code gate. |
| **R-016** | PERF | Gate adds a branch to the hot compute path; negligible but worth confirming no per-venue O(n) weather re-fetch. | 1 | 1 | 1 | Monitor — the weather slice is already fetched once per venue; the gate is a comparison, not a fetch. |
| **R-017** | BUS | A venue with sun geometrically up but cloud just under threshold flip-flops Partial↔Obscured on refresh as cloud hovers at the boundary. | 1 | 2 | 2 | Monitor — "no flash when a venue crosses the gate on refresh" is a Story 10.2 animation gate criterion; a single named threshold (not a range) keeps it deterministic per bucket. |

### Risk Category Legend

- **TECH**: Technical/Architecture (union sweep, e2e determinism, integration)
- **SEC**: Security (TOS/identity posture on external calls)
- **PERF**: Performance (cache consistency, extra-fetch latency)
- **DATA**: Data Integrity (honest output, missing-data defaulting, cache pairing)
- **BUS**: Business Impact (the sun-lies regression, copy honesty, at-a-glance clarity)
- **OPS / REL**: Operations / Reliability (external-dependency degradation, manual verification)

### Risk Matrix (probability × impact)

| Impact \ Probability | Unlikely (1) | Possible (2) | Likely (3) |
| -------------------- | ------------ | ------------ | ---------- |
| **Critical (3)**     | — | R-002, R-003, R-004, R-006, R-008 (🟠 6) | 🔴 **R-001 (9)** |
| **Degraded (2)**     | R-014, R-015, R-017 (🟢 2) | R-007, R-009, R-010, R-011, R-012 (🟡 4) | R-005 (🟠 6) |
| **Minor (1)**        | R-016 (🟢 1) | R-013 (🟢 2) | — |

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later
`nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
| ------------ | ----------------------- | --------- | ------------------ | --------------- |
| **Reliability** | Nowcast + `complete`-endpoint outage degrades silently to Tier 0/1 — never a throw, 500, or fabricated value. No live Met.no calls in CI. | R-008, R-002 | Unit tests: fetch failure → `[]`/null → Tier-0/1 outcome; engine test proves nowcast failure changes nothing. | Vitest reports for the new client's error path + engine degradation test |
| **Performance** | Extra Nowcast fetch must not blow the sun-compute budget or regress the 9.3 double-RPC win; per-coordinate dedupe + short-TTL cache; the 15-min sun-compute cache stays internally consistent. | R-006, R-009, R-016 | Fake-timer cache tests (gated outcome cached with weather; degraded not cached); dedupe test (co-located near-now requests collapse). No new perf budget number is set by this epic. | Cache/dedupe vitest reports; (optional) p95 note in the 10.5 live spot-check |
| **Maintainability** | Exactly ONE named, documented, tunable cloud-gate threshold constant (proposed ≥80); a documented named-constant cloud-layer weighting formula with recorded rationale. | R-007, R-011 | Unit tests reference the named constant (not a magic number); code review verifies the formula is documented with rationale; DESIGN.md tokens used for the muted palette (no ad-hoc hex). | Constant + formula in source with doc comments; token usage in the component |
| **Accessibility** | The new muted Obscured state meets WCAG AA contrast; the CI axe gate (ACTIVE since Epic 9) stays green; each surface's accessible name includes the obscured state exactly once. | R-011, R-001 | axe e2e gate green on the new state; component test asserts accessible-name presence exactly once (no duplicated/orphaned phrase). | axe.spec.ts / axe-mobile.spec.ts green; component test report |
| **Security / Compliance (Met.no TOS)** | New Nowcast client carries identifying User-Agent + ≤4-decimal coordinates; caching/dedupe consistent with the 5-min product cadence. | R-013 | Contract-style unit test on the Nowcast request headers + coord precision. | Vitest report asserting UA + `toFixed(4)` on the Nowcast URL |

**Unknown thresholds (do NOT invent values — resolve during story drafting):**

- **Cloud-gate threshold** — proposed default ≥80% effective cover, but the exact value is a story design decision
  (10.1). Must land as a single named constant. `UNKNOWN` until 10.1 fixes it.
- **Cloud-layer weighting** — the low/medium/high weights (10.3) are a documented story design decision. `UNKNOWN`
  until 10.3 records the formula + rationale. Tests must pin the *boundary behaviour* (100% high-only ≠ gate; 100%
  low = gate), not a specific weight.
- **Nowcast near-now horizon** — the cutoff beyond which the nowcast is not consulted (10.4) is `UNKNOWN` until the
  story sets it against the Nowcast 2.0 product horizon. Boundary test required.
- **Effective-rain threshold** — "precipitation rate above zero" is the epic's phrasing; whether a tiny trace value
  gates is `UNKNOWN` until 10.4 decides (likely `> 0`, but confirm to avoid drizzle-trace false gates).

---

## Entry Criteria

- [ ] Story 10.1's cloud-gate threshold constant, 10.3's layer-weighting formula, 10.4's rain threshold + near-now
      horizon are all named and documented (resolves the four `UNKNOWN` NFR thresholds above).
- [ ] A deterministic weather-boundary mock exists (network `page.route` on `/api/venues` OR a dev-only
      weather-forcing param) BEFORE the 10.5 e2e matrix is written (mitigates R-005).
- [ ] The `VenueSunStatus` union-sweep task checklist is enumerated (grep of all `currentSunStatus` / `sunStatus`
      / `predictedState` readers — 43 files matched today) before 10.1 dev starts.
- [ ] Muted-Obscured palette tokens confirmed present in DESIGN.md (or added + DESIGN.md-synced) before 10.2 UI.
- [ ] Local dev DB has the 7 seeded test venues so the deterministic `?_time=` + mocked-weather e2e can navigate.

## Exit Criteria

- [ ] All P0 tests passing (100%).
- [ ] All P1 tests passing or failures triaged with a waiver.
- [ ] The standing regression guards are green: 100% cloud never renders FULL SOL on any surface; missing cloud
      never renders as clear; confidence@100%cloud < confidence@0%cloud; rain forces Obscured; no-rain changes
      nothing; geometric fields (`sunExposurePercent`, `sunWindow`) byte-identical across weather variations for
      the same geometry+instant.
- [ ] The mocked-weather e2e matrix is green in CI (wall-clock- and sky-independent).
- [ ] The recorded live spot-check (10.5) shows displayed states matching the observable sky + fetched Met.no
      values, with any mismatch triaged to root cause.
- [ ] axe AA gate green on the new Obscured state (mobile + desktop).
- [ ] No open high-priority (≥6) risk unmitigated.

---

## Test Coverage Plan

> **Dedup discipline:** engine truth is tested at UNIT level (pure functions:
> `classifySunStatus`/new gate, `calcCloudCertainty`, `skyConditionFromCloudCover`, the effective-cover formula,
> the Nowcast client, `fetchWeatherForVenue`); the DTO contract at API/contract level (`venues-route*`); the
> fourth-state rendering + a11y at COMPONENT level (pin/card/quick-info/detail/list); and only the end-to-end
> honest-display promise at E2E level (the mocked-weather matrix). The same fact is never asserted at two levels
> unless it is the CRITICAL R-001 guard (defence-in-depth is deliberate there).

### P0 (Critical) — Run on every commit

**Criteria:** Blocks the epic's core promise (honest sun state) + High risk (≥6) + No workaround

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Effective cloud ≥ threshold + geometrically sunlit → new `CloudObscured` status (not Sunny/Partial); NoSun precedence preserved | Unit | R-001 | 4 | DEV | Red-first; below-horizon still wins; gate only when sun geometrically up & venue sunlit |
| Missing `cloud_area_fraction` → weather-unknown (no gate, NO fabricated clear); missing can never produce a "clear" gate input | Unit | R-002 | 3 | DEV | Red-first; replaces `?? 0`; covers absent total + absent split (10.3) + Nowcast `[]`/null (10.4) |
| `calcCloudCertainty` reads `cloudCover`; 100% cover → materially lower confidence than 0% (identical other inputs); geometry-only path byte-identical to today | Unit | R-001 | 3 | DEV | Red-first FR12 fix; documented formula; no-weather path unchanged |
| No surface (pin, card, quick-info, detail, list) shows FULL SOL / amber / high-% badge while the gate is active | Component | R-001 | 5 | DEV | One per surface; the standing "100% cloud ⇒ never FULL SOL anywhere" guard |
| `VenueSunStatus` union extended and every consumer sweeps the new value (sanitizer/`normalizeVenueForResponse`, api types, fixtures, `FeedbackFlow`, pin-mapping, switch statements) | API + Unit | R-003 | 4 | DEV | `never`-exhaustive switch preferred; venues-route contract test covers new value |
| Active precipitation (rate > 0) at near-now → Obscured regardless of cloud fraction (rain wins); sky condition reflects rain | Unit | R-001, R-004 | 3 | DEV | Rain forces the gate; `SkyCondition='rain'` emitted |
| Absence-of-rain contributes NOTHING positive: no-rain+overcast+sunlit still Obscured; no-rain+clear+shaded still Shaded | Unit | R-004 | 2 | DEV | Red-first; the hard-constraint guard |
| Deterministic mocked-weather e2e matrix: {overcast, clear, high-cirrus-only, active-rain, weather-missing} → correct card+pin+detail at forced `?_time=` | E2E | R-001, R-005 | 5 | QA | Requires the weather-boundary mock (entry criterion); no live Met.no in CI |
| 15-min sun-compute cache caches the gated outcome WITH its weather slice; degraded/weather-missing compute NOT cached | Unit (fake-timer) | R-006 | 3 | DEV | Internal consistency per bucket; mirrors `cacheable` rule |
| Geometric fields (`sunExposurePercent`, `sunWindow`, `peakTime`) byte-identical across weather variations for the same geometry+instant | Unit | R-001 | 2 | DEV | The "% keeps one meaning" guard; a diff is a FAIL not a rebaseline |
| Obscured state accessible-name present exactly once per surface; muted palette meets AA (axe gate green) | Component + E2E(axe) | R-011, R-001 | 3 | DEV | No duplicated/orphaned phrase; axe mobile+desktop |

**Total P0:** ~**37 tests** across 11 requirement rows, **~20–32 hours**

### P1 (High) — Run on PR to main

**Criteria:** Important behaviour + Medium risk (4–5) + common workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| `complete` endpoint carries `cloud_area_fraction_low/_medium/_high` (+ total retained); fetch/dedupe/revalidate otherwise unchanged | Unit | R-002 | 3 | DEV | Endpoint switch; missing split falls back to total |
| Cloud-layer weighting boundary: 100% high-only must NOT trip the gate; 100% low MUST | Unit | R-007 | 4 | DEV | Named-constant weighting; pins the formula's edges |
| Nowcast client: TOS posture (identifying UA, ≤4-dec coords), per-coord dedupe + short-TTL cache, graceful `[]`/null degradation | Unit | R-008, R-013, R-009 | 4 | DEV | Mirrors `getForecast` posture; outage degrades to Tier 0/1 |
| Future/planner request (`requestedAt` beyond nowcast horizon or a future day) → nowcast NOT consulted; forecast cloud governs | Unit | R-004, R-014 | 3 | DEV | No stale "now" radar in future planning; horizon boundary test |
| Two-signal UI: geometric potential remains visible + labelled as position-not-weather; sun-window timeline still renders as clear-sky potential; "Mest sol" still ranks by geometric solläge | Component | R-010, R-001 | 4 | DEV | Ranking stable across weather states |
| `skyCondition` surfaced on venue detail/quick-info (clear/partly-cloudy/overcast/rain/unavailable) with `sv`/`en` parity + new keys in both locales | Component | R-012, R-010 | 4 | DEV | Plain-language copy; the "serialized-but-never-rendered field" now consumed |
| Fourth visual state distinct from Sunny/Partial/Shaded on pin+card+quick-info+detail; muted palette from DESIGN.md tokens | Component | R-011 | 4 | DEV | Distinct state class/label; no ad-hoc hex |
| No flash / status jump when a venue crosses the gate on refresh (existing pin/card transitions unchanged) | Component | R-017 | 2 | DEV | Single named threshold keeps it deterministic per bucket |

**Total P1:** ~**28 tests** across 8 requirement rows, **~14–24 hours**

### P2 (Medium) — Run on PR (fast) / nightly

**Criteria:** Secondary flows + Low risk (1–2) + edge cases

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| `skyConditionFromCloudCover` + missing/rain mapping unit matrix (clear/partly/overcast/rain/unavailable boundaries) | Unit | R-012 | 5 | DEV | Threshold edges 20/60 + rain + unavailable |
| Freshness/uncertainty signals reflect missing weather (existing `geometry-only`/`weather` uncertainty plumbing) when cloud data absent | Unit | R-002 | 3 | DEV | No fabricated freshness on unknown weather |
| About-page copy still truthfully describes the model (geometry + weather genuinely blended per FR12), `sv`/`en` parity, updated if any claim went stale | Component/Content | R-010 | 2 | DEV | Story 10.5 AC |
| Effective-cover fallback: any missing layer field → falls back to total; missing total still = weather-unknown | Unit | R-002, R-007 | 3 | DEV | Story 10.3 layered fallback |

**Total P2:** ~**13 tests**, **~4–9 hours**

### P3 (Low) — Run on-demand / documented

**Criteria:** Nice-to-have + exploratory + manual

| Requirement | Test Level | Test Count | Owner | Notes |
| ----------- | ---------- | ---------- | ----- | ----- |
| Nowcast horizon exact-edge boundary (consult flips at the horizon second) | Unit | 1 | DEV | R-014 documentation-grade edge |
| Drizzle-trace: a very small precip rate near the rain threshold (guard against a trace-value false gate) | Unit | 2 | DEV | Confirms the rain-threshold decision (R-004 follow-on) |
| Manual live reality spot-check vs raw Met.no responses for central Gothenburg (screenshots + fetched values, recorded in story) | Manual | 1 | QA | R-015 — deferred-verification, not a code gate |

**Total P3:** ~**4 tests/checks**, **~2–5 hours**

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose:** Fast feedback; catch a re-lie immediately

- [ ] 100% cloud + geometrically sunlit → `CloudObscured`, not Sunny (unit) (~1s)
- [ ] Missing cloud → weather-unknown, never clear (unit) (~1s)
- [ ] Active rain → Obscured regardless of cloud fraction (unit) (~1s)
- [ ] No surface shows FULL SOL/amber while gated (single component smoke) (~3s)

**Total:** 4 scenarios

### P0 Tests (<10 min)

**Purpose:** The honest-display promise + union sweep + cache consistency + a11y

- [ ] Engine gate + confidence-blend + missing-data unit matrix (unit)
- [ ] Union-sweep contract (API/venues-route + fixtures)
- [ ] Four-surface no-FULL-SOL-while-gated + accessible-name-once (component)
- [ ] Cache pins gated-outcome-with-weather; degraded not cached (fake-timer unit)
- [ ] Byte-identical geometric fields across weather (unit)
- [ ] Mocked-weather e2e matrix — 5 scenarios (E2E) + axe AA on the new state

**Total:** ~37 scenarios

### P1 Tests (<30 min)

**Purpose:** Layered cloud, Nowcast client, two-signal UI, sky-condition copy

- [ ] `complete` endpoint + layer weighting boundary (unit)
- [ ] Nowcast client posture + degradation + future-request-skip (unit)
- [ ] Two-signal UI: geometric potential labelled, ranking stable, sky-condition rendered, distinct state (component)

**Total:** ~28 scenarios

### P2/P3 Tests (<15 min added)

**Purpose:** Mapping edges, missing-weather freshness, About copy, exploratory boundaries

- [ ] Sky-condition + fallback + About-copy + horizon/drizzle edges (unit/content) + the recorded manual live check

**Total:** ~17 scenarios/checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
| -------- | ----- | ---------- | ----------- | ----- |
| P0 | ~37 | ~0.6–0.9 | ~20–32 | Red-first engine matrix + cross-surface component + e2e matrix + a11y; some are one-assertion guards |
| P1 | ~28 | ~0.5–0.85 | ~14–24 | Layered cloud, new Nowcast client (new fetch harness), two-signal UI |
| P2 | ~13 | ~0.3–0.7 | ~4–9 | Mostly pure-function mapping + fallback + copy parity |
| P3 | ~4 | ~0.5–1.25 | ~2–5 | Edge boundaries + one manual live spot-check |
| **Total** | **~82** | **–** | **~40–70** | **~1–1.75 weeks** for one engineer |

### Prerequisites

**Test Data:**

- `WeatherSlice` factory extended for the layered split (`cloudCover`, `_low/_medium/_high`) + a `precipitationRate`
  field for Nowcast; `undefined`/absent variants for the missing-data cases.
- A Nowcast-response fixture (radar precip) + a `[]`/null failure fixture.
- Reuse the existing `getForecastOverride` injection seam in `sun-engine` for weather in unit tests (no network).
- The 7 seeded test venues in the local dev DB for e2e navigation.

**Tooling:**

- Vitest fake timers for the cache-consistency + freshness tests (existing pattern in `sun-engine-caching.atdd.test.ts`).
- A NEW deterministic weather-boundary mock for e2e: `page.route('**/api/venues*')` injecting fixed
  `currentSunStatus`/`skyCondition`/`cloudCover` per scenario, OR a dev-only weather-forcing param analogous to
  `?_time=`/`?_state=` (prod-gated like the other forcing params). **This is the single most important new harness
  piece — R-005.**
- `@axe-core/playwright` (already wired) for the AA-contrast gate on the new state.

**Environment:**

- CI runs Playwright against `next dev` (`NODE_ENV=development`) so `?_time=` forcing fires (see project-context
  "Production planner-forcing gate" — do NOT switch the webServer to a production build or the deterministic sun +
  weather specs break).
- No live Met.no/Nowcast calls in CI (all mocked at the boundary).

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate:** 100% (no exceptions — these are the honest-display guards)
- **P1 pass rate:** ≥95% (waivers required for failures)
- **P2/P3 pass rate:** ≥90% (informational; the manual live spot-check is recorded, not auto-gated)
- **High-risk (≥6) mitigations:** 100% complete or approved waivers

### Coverage Targets

- **The honest-output guards (R-001/R-002/R-004):** 100% — every surface + missing-data + no-rain path covered
- **Engine truth (gate, confidence blend, effective cover, Nowcast):** ≥90% unit
- **DTO contract (union sweep):** 100% of the new value at API/contract level
- **Two-signal UI + a11y:** all four visual states rendered; accessible-name-once on every surface

### Non-Negotiable Requirements

- [ ] All P0 tests pass.
- [ ] No high-risk (≥6) item unmitigated.
- [ ] The standing regression guards (Story 10.5 AC) are green in CI.
- [ ] The mocked-weather e2e matrix is wall-clock- and sky-independent (no live Met.no in CI).
- [ ] axe AA gate green on the new Obscured state (mobile + desktop).
- [ ] Geometric fields byte-identical across weather variations for the same geometry+instant (a diff is a FAIL).
- [ ] The recorded live spot-check exists and any mismatch is triaged to root cause before the epic closes.

---

## Mitigation Plans

### R-001: The sun-lies-during-rain regression returns (Score: 9, CRITICAL)

**Mitigation Strategy:** Gate at the SINGLE engine derivation point (`sun-engine.ts` currentSunStatus), extend the
`VenueSunStatus` union with `CloudObscured`, and defend it with defence-in-depth at three levels: red-first unit
(gate logic), component (no FULL SOL/amber on any of the 5 surfaces while gated), and the deterministic e2e overcast
+ rain scenarios. Add a STANDING regression guard "100% cloud can never render FULL SOL on any surface" that runs on
every commit.
**Owner:** Dev
**Timeline:** Stories 10.1 (engine) + 10.2 (UI)
**Status:** Planned
**Verification:** All three levels green; the smoke-tier guard fails loudly if any surface re-lies.

### R-003: Incomplete `VenueSunStatus` union sweep (Score: 6)

**Mitigation Strategy:** Enumerate every reader (grep `currentSunStatus`/`sunStatus`/`predictedState` — 43 files
today) as a task checklist BEFORE dev. Prefer `never`-exhaustive switches so a missed case is a compile error, not a
runtime crash. Cover the new value in the venues-route contract test and render all four visual states in component
tests.
**Owner:** Dev
**Timeline:** Story 10.1
**Status:** Planned
**Verification:** Type-check passes with the exhaustive switches; contract + component tests cover the new value.

### R-005: Weather-state e2e is sky-flaky (Score: 6)

**Mitigation Strategy:** Build the deterministic weather-boundary mock as an ENTRY CRITERION before writing the 10.5
matrix — a `page.route` intercept on `/api/venues*` injecting fixed status/sky/cloud per scenario, or a prod-gated
dev-only weather-forcing param. Assert each scenario at a forced `?_time=` so the suite is both wall-clock- and
sky-independent.
**Owner:** Dev/QA
**Timeline:** Story 10.5 (harness first)
**Status:** Planned
**Verification:** The matrix is green regardless of the real Gothenburg sky; no live Met.no calls in CI logs.

### R-006: Cache pins an inconsistent status/weather pair (Score: 6)

**Mitigation Strategy:** Cache the gated outcome together with the weather slice that produced it; extend the
existing `cacheable` rule so a weather-unknown/degraded compute is never pinned (retries next request). Fake-timer
tests prove per-bucket internal consistency and byte-identical geometric fields across hit/miss.
**Owner:** Dev
**Timeline:** Story 10.1
**Status:** Planned
**Verification:** Fake-timer cache tests green; a degraded compute is provably not served for the whole 15-min window.

---

## Assumptions and Dependencies

### Assumptions

1. The cloud-gate threshold, cloud-layer weighting, rain threshold, and nowcast near-now horizon are all resolved to
   named documented constants during story drafting (they are `UNKNOWN` here by design — not invented).
2. `design-tokens.ts` already carries `SkyCondition='rain'|'unavailable'`; the muted Obscured `SunStatus`/palette
   token is added (or already present) and DESIGN.md-synced before 10.2.
3. The existing `getForecastOverride` seam in `sun-engine` is the injection point for deterministic weather in unit
   tests; a new equivalent seam/mock is added for the Nowcast client.
4. CI keeps running Playwright against `next dev` (dev mode), so `?_time=` and any new dev-only weather-forcing param
   fire (a switch to a production webServer would silently disable forcing and break the deterministic specs).
5. The live DB still holds only the 7 seeded test venues (no bulk production venues), so the e2e/spot-check venue set
   is deterministic.

### Dependencies

1. **Met.no `complete` Locationforecast 2.0 endpoint** — same API/TOS as `compact`; required by Story 10.3.
2. **Met.no Nowcast 2.0** (radar precipitation, Nordics) — required by Story 10.4; external, degrade-gracefully.
3. **The `@axe-core/playwright` AA gate** (active since Epic 9) — must stay green on the new muted state.
4. **The deterministic weather-boundary mock** — a prerequisite for the entire Story 10.5 e2e matrix.

### Risks to Plan

- **Risk:** the layer-weighting / threshold constants are chosen late, forcing test-matrix churn.
  - **Impact:** P1 boundary tests re-pinned to new values.
  - **Contingency:** tests assert *relative* boundary behaviour (100% high-only ≠ gate; 100% low = gate) rather than
    an exact magic number, so they survive a constant re-tune.
- **Risk:** the live spot-check falls on a persistently clear-sky week and can't exercise the overcast/rain path
  against the real sky.
  - **Impact:** the "displayed matches observable sky under overcast/rain" evidence is delayed.
  - **Contingency:** record the raw Met.no cloud/precip values fetched and assert the displayed state matches *those
    values* even if the sky itself is clear that day; hold the epic-close evidence open until a grey day is captured.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate the failing red-first P0 engine + guard tests (separate workflow; not auto-run).
- Run `*automate` for broader coverage once implementation exists.
- Run `*trace` at the epic boundary to produce the traceability matrix + gate decision.
- Run `*nfr-assess` once implementation evidence exists (this doc PLANS NFR validation; it does not assess final
  PASS/CONCERNS/FAIL).

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
| **`lib/services/sun-engine.ts`** | New gate branch on currentSunStatus; skyCondition now consumed; cache stores gated+weather pair | `sun-engine.test.ts`, `sun-engine-caching.atdd.test.ts` must stay green; geometric fields byte-identical |
| **`lib/solar/confidence-calculator.ts`** | `calcCloudCertainty` now reads `cloudCover` (FR12) | `confidence-calculator.test.ts` — geometry-only path byte-identical; cloud lowers confidence |
| **`lib/weather/met-no-service.ts`** | `compact`→`complete` endpoint; `?? 0` default removed; new layered fields | `met-no-service.test.ts` — dedupe/revalidate unchanged; missing → unknown |
| **NEW `lib/weather/*` Nowcast client** | Adds a near-now precip source + a per-request fetch | New unit tests; must not regress the 9.3 double-RPC caching win |
| **`lib/types/api.ts` / `lib/types/map.ts`** | `VenueSunStatus` union +1 value | `venues-route*.test.ts`, `venue-pin-mapping.test.ts` — new value handled |
| **`FeedbackFlow` predicted-state** | Predicted-state enum gains the obscured value | `FeedbackFlow.test.tsx` — predicted-state still renders |
| **VenuePin / VenueCard / VenueQuickInfo / VenueDetailContent / VenueList** | Fourth visual state; no amber/FULL-SOL while gated | The four venue-surface component tests + `venue-pin-mapping.test.ts`; axe AA gate |
| **`app/api/venues/route.ts` + `[slug]/route.ts` (sanitizer)** | `normalizeVenueForResponse` must pass the new status through | venues-route contract tests |
| **e2e suite (`map-primary`, etc.)** | New deterministic weather mock; existing `?_time=` specs unaffected | All 12 existing e2e specs stay green; new mocked-weather matrix added |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — risk classification framework
- `probability-impact.md` — P×I scoring methodology (1–9; ≥6 MITIGATE, 9 BLOCK)
- `test-levels-framework.md` — Unit/Integration(API)/Component/E2E selection + duplicate-coverage guard
- `test-priorities-matrix.md` — P0–P3 prioritization + risk-to-priority mapping

### Related Documents

- Epic: `_bmad-output/planning-artifacts/epics.md` §"Epic 10" (lines 2645–2790)
- PRD (FR12 — geometry × cloud blend): `_bmad-output/planning-artifacts/prd.md`
- Architecture (caching strategy, API boundary): `_bmad-output/planning-artifacts/architecture.md`
- Project Context (Epic 9 ratified conventions, prod-gate, caching windows): `project-context.md`
- Prior epic test design (house style + regression-guard pattern): `test-design-epic-9.md`

### Source Files Confirming the Four Root Causes

- `nextjs-app/lib/services/sun-engine.ts:439-441` (geometry-only status), `:451-453` (skyCondition computed, unconsumed)
- `nextjs-app/lib/solar/confidence-calculator.ts:151-157` (`calcCloudCertainty` ignores `cloudCover`)
- `nextjs-app/lib/weather/met-no-service.ts:85` (`cloud_area_fraction ?? 0`), `:53` (`compact` endpoint)
- `nextjs-app/lib/types/api.ts:7` (`VenueSunStatus` union), `nextjs-app/lib/types/design-tokens.ts` (`SkyCondition` already has `rain`)

---

**Generated by:** BMad TEA Agent — Test Architect Module
**Workflow:** `bmad-testarch-test-design` (Epic-Level mode)
**Version:** 4.0 (BMad v6)
