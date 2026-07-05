---
stepsCompleted:
  - 'step-01-load-context'
  - 'step-02-define-thresholds'
  - 'step-03-gather-evidence'
  - 'step-04-evaluate-and-score'
  - 'step-04e-aggregate-nfr'
  - 'step-05-generate-report'
lastStep: 'step-05-generate-report'
lastSaved: '2026-07-05'
workflowType: 'testarch-nfr-assess'
inputDocuments:
  - '_bmad-output/test-artifacts/test-design/test-design-epic-11.md'
  - '_bmad-output/test-artifacts/traceability/traceability-report-epic-11.md'
  - '_bmad-output/planning-artifacts/epics.md (§Epic 11, lines 2791-3021)'
  - '_bmad-output/implementation-artifacts/11-1..11-8-*.md'
  - 'nextjs-app/test/unit/api/venues-route-day-series.atdd.test.ts (payload guard)'
  - 'nextjs-app/test/unit/epic-11-standing-gate-ci-wiring.automate.test.ts'
  - 'nextjs-app/.github/workflows/build-and-test-nextjs.yml (project wiring)'
  - 'nextjs-app/vercel.json + root .gitattributes (hygiene)'
---

# NFR Assessment - Epic 11 "Feels Instant, Reads Clear" (Time-Scrub Performance, Mobile Interaction & Surface Polish)

**Date:** 2026-07-05
**Story:** Epic 11 (stories 11.1–11.8)
**Branch:** `epic/11-feels-instant-reads-clear`
**Overall Status:** PASS ✅ (with 3 tracked, non-blocking CONCERNS — all P3 manual-by-design)

---

Note: This is an ADVISORY audit. It summarizes existing evidence (story records, trace gate, test-design NFR
plan) and re-verifies load-bearing facts against the current tree; it does not block the epic. Live/production
telemetry (the live wall-clock date-change p95, a physical-device gesture sweep, and the maintainer reference-PNG
blessing) is out of CI scope **by design** — Epic 11 ships interaction/performance/surface-polish, and its
headline perf promise is guarded in CI by a **request-count invariant** while the wall-clock number is measured
live. Those three items are recorded `needs-human` post-merge handoffs, not evidence gaps that the audit can close.

## Executive Summary

**Assessment:** Performance PASS · Security PASS · Reliability PASS · Maintainability PASS · Accessibility PASS
· Usability/Interaction PASS — **4 core NFRs PASS, 2 custom NFRs PASS, 0 FAIL** (3 non-blocking P3 CONCERNS).

**Blockers:** 0 — no NFR failure blocks the epic.

**High Priority Issues:** 0 — no critical/high NFR gap.

**Recommendation:** **PASS.** Epic 11's dominant NFR is **performance** (kill the ~9.6 s time-change stall) and its
dominant failure mode is **"shipped-but-insufficient"** — the Epic-9/10 pattern where a caching/debounce win
landed but the user-visible symptom survived because the root cause was only dampened. That risk is met head-on:
the fetch is **removed**, not dampened (client-side day-series → a settled scrub issues **zero** network requests),
and the invariant is guarded at unit + e2e + a standing CI-wiring contract so it cannot silently regress. Security
(no auth/secrets/new-dependency surface — the epic is interaction/polish over the existing public read path),
Reliability (day-series degrade isolation + Epic-10 gate applied per-step + markers persist across a date change),
Maintainability (tokenized dot, orphan-mapper resolved, build fails loudly, isolated LF renormalization), and
Accessibility (axe AA green on both breakpoints AFTER the map de-dull; reduced-motion halo) are all PASS on
evidence re-verified this audit. The three CONCERNS are the P3 manual-by-design halves the trace gate already
flagged: the **live wall-clock p95** (its CI-provable request-count half is FULL + green), the **physical-device
gesture sweep** (the iPhone-14 + Pixel-5 real-touch profiles are the green automated proxy), and the **maintainer
reference-PNG blessing** (dev is structurally forbidden from self-blessing). None is a coverage gap; each is a
recorded post-merge handoff.

---

## NFR Category Matrix & Thresholds

| NFR Category | Threshold (source) | Verdict |
| ------------ | ------------------ | ------- |
| **Performance** | Settled time change = **0** `/api/venues` requests; date change = **exactly 1**, **< 3 s p95** live (stretch < 1.5 s warm); gzipped ~50-venue × ~64-step day-series stays "reasonable"/CDN-ETag-friendly (test-design NFR Planning; 11.1 AC1/AC2/AC4; 11.8 AC3) | **PASS** ✅ (CI-provable halves FULL+green; live p95 = P3 handoff) |
| **Security** | No auth/authz surface introduced; no new runtime third-party dependency; no secrets/PII surface (public read path) (test-design; trace Auth/Authz = 0/N/A) | **PASS** ✅ |
| **Reliability / Regression** | Markers persist across a date change (no unmount); Epic-10 obscured/rain gate governs **every** planner step; day-series producer failure isolated (no 500); "Mest sol" ordering stable; full suite stays green (test-design NFR Planning; R-003/R-005/R-009) | **PASS** ✅ |
| **Maintainability** | `UserPin` amber tokenized (no raw `#d97706`); `toSunStatusToken` fully resolved (no half-state); build fails loudly on lightningcss; `.gitattributes` LF with an **isolated** renormalization commit (test-design NFR Planning; R-016/R-017) | **PASS** ✅ |
| **Accessibility** (custom) | De-dulled map keeps pin/label contrast passing the axe AA gate (ACTIVE since Epic 9, mobile + desktop); pulsing halo static under `prefers-reduced-motion`; reworked quick-info aria has no orphaned separators (test-design NFR Planning; R-006/R-018/R-010) | **PASS** ✅ |
| **Usability / Interaction** (custom) | Real-touch thumb-grab drag works (touch events, not click-sim); four sheet snaps by gesture; horizontal chip scroll never moves the sheet; recenter lands the dot in the visible center per snap state (test-design NFR Planning; R-004/R-008/R-013) | **PASS** ✅ |

**UNKNOWN thresholds (resolved in-story, per test-design — NOT invented by the audit):** light-tint overlay
strength (set by design-gate eyeball; tests assert *legible + axe AA*, not an opacity number), day-series payload
ceiling (measured then guarded — see Performance), sheet collapsed-snap height + gesture thresholds (tests pin
*behaviour*: four snaps + no axis hijack). The only fixed-number threshold that remains genuinely unmeasured is
the **live p95 < 3 s** — a P3 manual-by-design handoff (a miss is a triage item, not a fabricated pass).

---

## Performance Assessment

> Epic 11's raison d'être. The threshold is behavioural-and-numeric: a settled scrub = **0** fetches (the fetch
> is *removed*, not dampened), a date change = **exactly 1** in **< 3 s p95** live, and the day-series payload stays
> bounded/CDN-friendly. The "shipped-but-insufficient" trap (R-001, score 9 CRITICAL) is that a caching win lands
> but time stays in the query key and the symptom survives — so the audit's central question is *did the fetch
> actually go away, provably.*

### Time-Scrub = Zero Fetches (R-001 / R-002) — the headline

- **Status:** PASS ✅
- **Threshold:** A settled same-date time change issues **zero** `/api/venues` requests; a full slider drag
  commits app-level time **at most once**, and that commit fetches nothing.
- **Actual:** The list DTO now carries a per-venue day-series (one entry per `PLANNER_STEP_MINUTES`, each with
  `sunExposurePercent` + weather-gated `currentSunStatus`); the client derives marker %, pin state, quick-info
  figures, list ordering, and the obscured presentation for ANY planner time from the cached series — a pure,
  offline lookup. The slider decouples drag (local visual value during drag; single commit on
  release/keyboard-settle/blur via the existing `onSnap` seam), and the query key is date/location-keyed, not
  minute-keyed.
- **Evidence:** `epic-11-scrub-zero-fetch.spec.ts` (settled scrub = 0 `/api/venues`, the R-001 headline, on
  `--project=mobile --project=desktop`); `venue-day-series-query-key.atdd.test.ts` (same-date scrub = same key —
  deliberate defence-in-depth with the e2e, the one sanctioned R-001 double-cover);
  `TimeSlider.dragdecouple.atdd.test.tsx` (multi-step drag commits `onMinutesChange` ≤1×);
  `venue-day-series.derivation.atdd.test.ts` (+ `.edge.test.ts`) (all 5 derived surfaces are pure/offline).
- **Findings:** R-001/R-002 mitigated at the root, not dampened. The fetch is provably removed at unit + e2e, and
  the standing CI-wiring contract (below) blocks silent gate-degradation. This is the single most important NFR
  result of the epic and it holds.

### Client-Derived Parity with Server Truth (R-003) — no divergence

- **Status:** PASS ✅
- **Threshold:** For a fixed (venue, date, weather-bucket), the per-step series equals the OLD single-instant
  compute at each instant (a diff is a FAIL, not a rebaseline); the Epic-10 cloud/rain gate applies per-step.
- **Actual:** 61-step **byte-parity** vs single-instant compute at requestedAt + sampled steps; the Epic-10 gate
  is applied per step (100% cloud/rain gates any step, never only "now"); rain threaded under the nowcast horizon.
- **Evidence:** `sun-engine.day-series-parity.atdd.test.ts` (61-step byte-parity; per-step gate).
- **Findings:** The "one physical meaning per %" invariant survives the move to client derivation — the client
  *reads* the gated series, it does not re-gate. R-003 divergence risk closed.

### Payload Size — measured + bounded (R-003 / R-012)

- **Status:** PASS ✅ (the previously-`UNKNOWN` ceiling is now MEASURED and guarded)
- **Threshold:** The gzipped ~50-venue × ~64-step day-series must stay "reasonable" and CDN/ETag-friendly.
- **Actual:** MEASURED gzipped `/api/venues` payload with day-series = **1769 bytes** for the 7 seeded venues ×
  61 steps; the ~50-venue live worst case extrapolates to ≈12 KB gzipped (the live store today holds a handful of
  venues, so real payloads are far smaller). A guard is set at **8000 bytes** (≈4.5× the measured seed payload —
  headroom for growth, still catches a genuine per-step field blowup). ETag/304 covered; seed and `[slug]` DTOs
  byte-identical.
- **Evidence:** `venues-route-day-series.atdd.test.ts:245-258` (`gzipSync` measurement + `PAYLOAD_CEILING_BYTES =
  8000` guard, re-read this audit — the console.log prints the measured bytes); the ceiling rationale is doc-commented in
  source (`:82-90`).
- **Findings:** R-012 mitigated. The previously-open payload ceiling is now a measured, doc-justified guard at the
  API boundary — exactly the test-design's "measure then set the guard" contingency. No unbounded payload ships.

### Cache Bucket Consistency (R-012)

- **Status:** PASS ✅
- **Threshold:** The series is cached per (venue, date, weather-refresh-bucket) in `sun-engine-cache.ts`; a new
  weather bucket recomputes; a degraded (null-buildings) compute is not pinned; cached == uncached.
- **Actual:** Same bucket served from cache; new weather bucket recomputes; `weatherRefreshBucketMs` floor/boundary
  respected; the key is NOT keyed on the requested instant (so a scrub never invalidates it); degraded compute not
  pinned.
- **Evidence:** `sun-engine-day-series-cache.atdd.test.ts` + `sun-engine-cache.day-series-key.test.ts`.
- **Findings:** Mirrors the Epic-10 gated-outcome-with-weather cache rule. R-012 mitigated.

### Live Date-Change p95 < 3 s (R-014)

- **Status:** PASS on the CI-provable half ✅ / P3 CONCERNS on the live wall-clock half ⚠️ (manual-by-design)
- **Threshold:** Date change completes **< 3 s p95** on the LIVE deployment over ≥10 warm/cold trials.
- **Actual:** The CI-provable request-count invariant (date change = exactly 1 request; markers persist keyed by
  id; dim+spinner overlay in-flight) is FULL + green. The wall-clock number itself is recorded as `needs-human` #1
  in the Story-11.8 Post-Merge Verification Protocol with a documented ≥10-trial warm/cold method — a wall-clock
  number cannot prove the fetch was *removed*; the request-count invariant, which can, is the durable gate.
- **Evidence:** `epic-11-scrub-zero-fetch.spec.ts` (date change = 1 request; markers persist); the CI-wiring
  contract guard; `atdd-checklist-11-1.md` §"Live-Perf Handoff (AC4)" (the method).
- **Findings:** The AC-load-bearing split ("wall-clock measured live, counts guarded in CI") is honoured exactly.
  A p95 miss on the live day is a triage item, not a fabricated pass. This is CONCERN #1 (non-blocking).

**Performance overall:** PASS ✅ — the headline fetch is provably removed, parity holds, the payload ceiling is
measured + guarded, cache buckets are consistent; the only open item is the live wall-clock p95 (P3 handoff).

---

## Security Assessment

> Epic 11 introduces **no auth/authz surface** and **no new runtime third-party dependency** — it is interaction,
> performance, and surface-polish over the already-public, read-only sun/venue path. The security-class NFR is
> therefore a negative one: *the epic must not open any new surface.*

### Authentication / Authorization

- **Status:** N/A ℹ️ — no authenticated or permissioned surface introduced or touched. Trace confirms 0 auth/authz
  negative-path gaps (nothing to test); the epic works over the existing public read path.

### New Dependency / Supply-Chain Surface

- **Status:** PASS ✅
- **Threshold:** No new runtime third-party dependency (a new dependency is a new supply-chain surface).
- **Actual:** `git diff main..HEAD -- nextjs-app/package.json` is **empty** — the epic adds no runtime dependency.
  The one config change to `vercel.json` pins `lightningcss@1.31.1` for the CSS build (a hardening, replacing the
  old `|| true` failure-swallow; see Maintainability), not a new app dependency.
- **Evidence:** empty `package.json` diff (verified this audit); `vercel.json` re-read.
- **Findings:** No supply-chain surface added.

### Secrets / PII / Data Protection

- **Status:** PASS ✅
- **Threshold:** No `.env`/credential/secret files touched; no PII surface added; the additive DTO fields carry no
  sensitive data.
- **Actual:** The epic diff touches no `.env`, credential, key, or secret material (the only `*key*` filenames in
  the diff are query-**key** test files). The two additive `/api/venues` DTO fields — `sunDaySeries` (public sun
  geometry) and `openingHours` (already-public venue metadata from the existing `venues.opening_hours` column) —
  carry no PII. Opening hours are rendered only when present; a venue without data shows **nothing**, never a
  fabricated value.
- **Evidence:** epic diff name-only scan (no secrets); `venues-route.test.ts` + `venue-store.test.ts`
  (openingHours present/absent contract); `VenueQuickInfo.test.tsx` (absent → nothing rendered).
- **Findings:** No secret/PII exposure. Additive DTO fields are public-data-only.

### Vulnerability Management

- **Status:** N/A ℹ️ — no dependency-scan artifact (Snyk/Dependabot) in scope for this advisory audit; the epic
  adds no new third-party runtime dependency, so it introduces no new scannable surface.

**Security overall:** PASS ✅ — no auth/authz surface, zero new runtime dependency, no secrets/PII; additive DTO
fields are public-data-only with the honest "absent → nothing" rule enforced.

---

## Reliability Assessment

> The reliability NFR is **no Epic-9/10 regression** from moving time-dependent UI to client derivation: markers
> must persist across a date change (no unmount), the Epic-10 obscured/rain gate must govern EVERY planner step
> (not just "now"), a day-series producer failure must be isolated (no 500), and "Mest sol" ordering must stay
> stable while the client re-sorts per step.

### Marker Persistence Across a Date Change (R-005)

- **Status:** PASS ✅
- **Threshold:** Existing markers are NOT unmounted/reloaded on a date change (keyed by venue id); the map dims
  under a token-based gray hue + centered spinner until the new series arrives; exactly **one** request fires.
- **Actual:** Date change = 1 request; markers persist (keyed by id, no remount); `date-change-overlay`
  dim+spinner visible in-flight; the key flips only on date/location change, never on a minute tick.
- **Evidence:** `epic-11-scrub-zero-fetch.spec.ts`; `useVenueSearch.day-series-key.test.tsx`; `MapView.test.tsx`
  (`isLiveNow` wiring; key flips only on date/location).
- **Findings:** R-005 mitigated. (Advisory: the overlay + per-step derivation seam is asserted only at e2e — a
  jsdom component test would harden the pyramid but does not reduce the AC below FULL.)

### Client Never Re-Gates — Epic-10 Gate Per-Step (R-003 / R-005)

- **Status:** PASS ✅
- **Threshold:** The obscured/rain presentation for any planner step equals the server-gated series value (no
  client re-implementation of the Epic-10 gate).
- **Actual:** The day-series carries the already-gated `currentSunStatus` per step; the client reads it. Parity
  test confirms 100% cloud/rain gates any step (never only "now").
- **Evidence:** `sun-engine.day-series-parity.atdd.test.ts` (per-step gate); `venue-day-series.derivation.*`
  (obscured presentation derived, not re-gated).
- **Findings:** The Epic-10 honesty invariant is preserved across the client-derivation refactor. R-003/R-005
  (regression half) mitigated.

### Day-Series Producer Failure Isolation

- **Status:** PASS ✅
- **Threshold:** A day-series producer throw must not 500 the list route; the series is omitted per-venue, other
  venues unaffected; null/sparse/NaN series clamp gracefully on the client.
- **Actual:** Producer throw → no 500, series omitted, per-venue isolation; client derivation clamps null/sparse/
  NaN branches.
- **Evidence:** trace §Happy-Path-Only (day-series degrade: producer throw → no 500, series omitted, per-venue
  isolation); `venue-day-series.derivation.edge.test.ts` (null/sparse/NaN clamp).
- **Findings:** Graceful degradation preserved; a producer fault does not take down the list.

### Ordering Stability ("Mest sol") (R-003)

- **Status:** PASS ✅
- **Threshold:** "Mest sol" ordering stays stable as the client derives ordering per step (client re-sort agrees
  with server pre-slice via `sunListRank`).
- **Actual:** `sunListRank` client/server mirror stays in lock-step; ordering byte-stable across time steps.
- **Evidence:** test-design Interworking (`sunListRank` lock-step); trace P1 regression row (ordering stable).
- **Findings:** R-003 ordering half mitigated.

### CI Burn-In / Flakiness

- **Status:** PASS ✅ (one real flake found + hardened)
- **Threshold:** No unmitigated flaky test.
- **Actual:** The sweep surfaced a ~66% real-touch map-tap flake (deterministic-aim hardened; 6/6 with retries=0)
  and a stale `CONFIDENCE_BADGE_COPY` regex left by 11.4 (fixed preserving the asserted fact). No unmitigated flake
  remains.
- **Evidence:** trace §P0 Flaky Tests (0 unmitigated); Story-11.8 record; automation-summary-11-8.
- **Findings:** Exactly the "shipped-but-insufficient" fragility Story 11.8 exists to eliminate — both defects were
  test-only and fixed without weakening the assertion.

### Physical-Device Gesture Sweep (R-015)

- **Status:** PASS on the automatable half ✅ / P3 CONCERNS on the real-device half ⚠️ (manual-by-design)
- **Threshold:** A real-phone checklist over every Epic-11 surface (slider thumb-drag, sheet 4-snap + chips,
  quick-info states, map tint/dot/recenter, detail first paint), any gap triaged before epic close.
- **Actual:** The full Playwright mobile-profile sweep is green (mobile 52 pass / desktop 35 / touch 3 / a11y 12);
  the iPhone-14 + Pixel-5 real-touch profiles are the automated proxy. A real phone cannot run headless in CI, so
  the physical-device sweep is `needs-human` #2 (no "physical device passed" claim fabricated).
- **Evidence:** trace §11.8-AC1; Story-11.8 Post-Merge Verification Protocol.
- **Findings:** The automatable half is FULL + green; the device sweep is CONCERN #2 (non-blocking, maintainer
  post-merge).

**Reliability overall:** PASS ✅ — markers persist, the Epic-10 gate is preserved per-step, producer faults are
isolated, ordering is stable, the one real flake was hardened; the physical-device sweep is the deferred half
(P3 handoff).

---

## Maintainability Assessment

### Dead-Code Resolution — `toSunStatusToken` (R-017)

- **Status:** PASS ✅
- **Threshold:** Binary outcome — EITHER all sun-status surfaces consume the mapper OR it is deleted and its
  misleading "single source of truth" comment corrected; a grep proves no surface half-references it.
- **Actual:** DELETE chosen (keeps the story byte-identical). The `toSunStatusToken` import + its describe block
  are removed; all other exports (`windowLabelTier`/`isObscuredSunStatus`/`skyConditionCopy`) kept + green; a
  repo-wide grep proves ZERO live references (only gitignored stale `.next` artifacts). The `never`-exhaustiveness
  guard survives via the sibling `windowLabelTier`.
- **Evidence:** `sun-status-presentation.test.ts`; `hygiene-config-contracts.automate.test.ts` (guards the deleted
  orphan). DEVIATION: the now-fully-orphaned `windowLabelTier`/`isSunWindowStatus` siblings (their 11.6 callers
  gone) were comment-tightened + KEPT to preserve the `never`-guard, flagged as a follow-up dead-export cleanup.
- **Findings:** R-017 mitigated (no worse half-state). One tracked follow-up (dead-export cleanup with a re-homed
  `never`-guard).

### Build Fails Loudly + LF Normalization (R-016)

- **Status:** PASS ✅
- **Threshold:** The build fails loudly on a real lightningcss error (the `|| true` swallow removed); a
  `.gitattributes` enforcing LF for source lands with a one-time renormalization commit kept SEPARATE from any
  functional change.
- **Actual:** `vercel.json` installCommand no longer ends `... || true` — it pins `lightningcss@1.31.1` and lets a
  real failure surface (proven via an injected `lightningcss@99.99.99` ETARGET: OLD → exit 0, NEW → exit 1). The
  root `.gitattributes` carries explicit `text eol=lf` rules for `.ts/.tsx/.js/.json/.css/…` and deliberately
  EXCLUDES the ~113 tracked `*.log` artifacts (a blanket `* text=auto` would have swept them into one unreviewable
  diff — R-016). Renormalization was kept as an orchestrator-owned isolated `git add --renormalize` commit (dev did
  not run git).
- **Evidence:** `hygiene-config-contracts.automate.test.ts` (11 tests — guards the removed `|| true` swallow + the
  no-blanket `.gitattributes`); `vercel.json` + root `.gitattributes` re-read this audit (LF rules present, `.log`
  excluded).
- **Findings:** R-016 mitigated. The three-epics-deferred Epic-8 A2/A3 debt is finally paid, with the isolation
  discipline the risk required. (Live Vercel deploy is the maintainer/orchestrator PR concern; the static contract
  guard is the durable CI proxy.)

### Tokenized Location Dot (R-006 token / R-016)

- **Status:** PASS ✅
- **Threshold:** The `UserPin` amber becomes a design token (no raw `#d97706`).
- **Actual:** 24px dot; fill `var(--color-amber-location-dot)` (resolves the Story-9.5 `#d97706` gap);
  `animate-user-location-halo`; `pointer-events:none`; `aria-hidden`; a raw-`#d97706` source-guard prevents
  regression.
- **Evidence:** `UserPin.test.tsx` (token + raw-hex source-guard).
- **Findings:** No ad-hoc hex; the token is enforced by a source-guard.

### i18n Prune + Parity

- **Status:** PASS ✅
- **Threshold:** Unused `messages/{sv,en}` keys pruned after the quick-info + detail removals; sv/en parity green.
- **Actual:** The three pruned `quickInfo.*` keys (`sunWindow`/`sunUnavailable`/`obscuredPosition`) are pinned as
  removed; the timeline block + `sectionTitle`/`peakTime`/`bestWindow` pruned symmetrically; `confidence*` kept;
  `messages-parity.test.ts` stays green.
- **Evidence:** `removed-i18n-keys.test.ts`; `messages-parity.test.ts`.
- **Findings:** Symmetric prune, parity-enforced.

### Test Coverage & Quality

- **Status:** PASS ✅
- **Threshold:** P0/P1 ACs 100% covered; tagged BDD; deterministic e2e; the standing anti-"insufficient" CI net.
- **Actual:** Trace P0 100% (14/14), P1 100% (8/8), overall 89% (25/28 — the 3 non-FULL are P3 manual-by-design).
  Vitest **1361 tests / 143 files, all pass**; Playwright mobile 52 / desktop 35 / touch 3 / a11y 12 — all green;
  typecheck 0 errors, eslint 0 errors (13 pre-existing warnings, none new) across all 8 story gate runs. The
  standing gate is itself test-guarded: `epic-11-standing-gate-ci-wiring.automate.test.ts` (7 non-vacuous config
  contracts) locks that CI keeps invoking `--project=mobile/desktop/touch/a11y` and that `playwright.config.ts`
  keeps its `testMatch`/`testIgnore` routing — blocking a silent gate-degradation (a dropped `--project=touch` or
  emptied `testMatch`).
- **Evidence:** trace §Test Execution Evidence; `.github/workflows/build-and-test-nextjs.yml` (L110 mobile+desktop,
  L120 touch, L123 a11y — re-read this audit); `epic-11-standing-gate-ci-wiring.automate.test.ts` (7 tests).
- **Findings:** Exemplary — every test carries an explicit `[11.x ACn]` tag; the CI net that makes "shipped-but-
  insufficient" impossible to repeat silently is itself contract-guarded.

**Maintainability overall:** PASS ✅ — orphan resolved, build fails loudly, LF renormalization isolated, dot
tokenized, i18n pruned+parity-green, exemplary tagged coverage with a self-guarding CI net; one tracked
dead-export follow-up.

---

## Custom NFR Assessments

### Accessibility (WCAG AA — de-dulled map + reworked surfaces) — R-006 / R-018 / R-010

- **Status:** PASS ✅ (both breakpoints green AFTER the de-dull)
- **Threshold:** The de-dulled map keeps pin/label contrast passing the axe AA gate (ACTIVE since Epic 9, mobile +
  desktop); the pulsing location-dot halo is static under `prefers-reduced-motion`; the reworked quick-info aria has
  no orphaned separators/duplication; the amber sun badge ≥4.5:1.
- **Actual:**
  - axe AA **GREEN on both breakpoints AFTER** the tint reduction (`bg-surface-sand/80→/20` + `--gradient-map-
    overlay` ¼ alpha, a token change, no ad-hoc hex). The de-dull adds ZERO new serious/critical violations — the
    sole remaining mobile-map violation is the PRE-EXISTING Story-5.1 venue-card debt (unchanged, `test.fixme`'d,
    NOT new to this epic).
  - Reduced-motion: under `emulateMedia({reducedMotion:'reduce'})` the halo is static (`animationName==='none'`);
    live it pulses (`animationName==='user-location-halo'`).
  - Amber sun badge hardened to `--color-amber-badge-text #6d5000 → #5c4300` (**5.63:1**), closing the boundary
    flake surfaced at 11.3.
  - Quick-info accessible name regenerated to name → sun% → opening hours → distance with no dangling `·`/duplicate.
- **Evidence:** `axe.spec.ts` (desktop `a11y`, 12 pass) + `axe-mobile` active scan; `UserPin.test.tsx` +
  `map-primary.spec.ts` (reduced-motion static halo); `axe.spec.ts:82` (badge 5.63:1); `VenueQuickInfo.test.tsx`
  (aria essentials).
- **Findings:** The de-dull did NOT drop contrast below AA — R-006's central fear is disproven by a green gate on
  both breakpoints. The only skip is inherited Story-5.1 shell debt (tracked, not new). PASS.

### Usability / Interaction (real-touch physics) — R-004 / R-008 / R-013

- **Status:** PASS ✅ (real touch, not click-sim — the exact live-defect class is proven fixed)
- **Threshold:** Thumb-grab drag works with **real touch** (touch events, not click-sim) on mobile + desktop; all
  four sheet snaps reachable by gesture; horizontal chip scroll never moves the sheet; recenter lands the dot in
  the visible-map center per snap state.
- **Actual:**
  - Thumb-grab: all 3 slider decorations are `pointer-events-none` + `aria-hidden`; the input is the sole pointer
    target (`h-11`, ≥44px). A real finger sweep ON the thumb (CDP `Input.dispatchTouchEvent`, genuine touch — NOT
    `click()`/`fill()`) changes the committed time.
  - Sheet: all FOUR snaps (peek/mid/full + handle-only collapsed) reachable by real finger; the map stays
    interactive behind the collapsed strip (a tap above the strip selects a venue + raises the sheet); a horizontal
    chip fling leaves `data-state` unchanged (axis guard).
  - Recenter: pure `computeRecenterPadding` per snap (mid 320 ≠ full 560) + per panel (detail-open ≠ closed);
    `flyTo` called with padding varying per snap + desktop left/right, `duration:500`.
- **Evidence:** `epic-11-slider-touch-drag.spec.ts` (`--project=touch`, CDP real touch);
  `epic-11-sheet-touch-gestures.spec.ts` (`--project=touch`, four snaps + axis guard + map-interactive-behind);
  `recenter-padding.test.ts` + `MapControls.test.tsx` (per-snap padding, flyTo 500 ms).
- **Findings:** The exact live defect (thumb-grab dead on real touch, R-004) is proven fixed with REAL touch
  events — not the emulated mouse-drag that could mask it. PASS. (Advisory: `dragY`-follows-`my` 1:1 is asserted
  only via terminal `data-state` at e2e; the desktop chip real-overflow is jsdom-mocked; the OnboardingGate
  grant-flyTo is not viewport-aware and `MOBILE_TOP_BAR_COVER=72` is untokened — all review-deferred maintainability
  follow-ups; none reduces an AC below FULL.)

---

## Quick Wins

3 quick wins identified (all optional, non-blocking test-hardening / cleanup):

1. **Component-level date-change overlay assertion** (Reliability/Accessibility) — LOW — a jsdom test for the
   dim+spinner-on-placeholder-data state hardens the pyramid below the e2e (11.1 AC3). No production change.
2. **Real-browser desktop chip-overflow e2e** (Usability) — LOW — closes the jsdom scroll-geometry limitation on
   the desktop chip arrows/edge-fade (11.3 AC4). No production change.
3. **Dead-export cleanup with a re-homed `never`-guard** (Maintainability) — LOW — remove the now-fully-orphaned
   `windowLabelTier`/`isSunWindowStatus` siblings and re-home the exhaustiveness guard (11.7 follow-up).

---

## Recommended Actions

### Immediate (Before Release) - CRITICAL/HIGH Priority

**None.** No NFR blocker. The epic trace gate is PASS (P0 100% / P1 100% / overall 89%) and NFR evidence is green
at test level across Performance, Security, Reliability, Maintainability, Accessibility, and Usability.

### Short-term (Next Milestone / Post-Merge) - MEDIUM Priority

1. **Live date-change p95 pass (11.1 AC4 / 11.8 AC3)** — MEDIUM — Maintainer, post-merge against live Vercel.
   ≥10 warm/cold trials per the recorded method; confirm time-scrub = 0 requests; record the gzipped `sunDaySeries`
   payload size. **Any p95 miss is triaged before epic close** (a miss is a triage item, not a fabricated pass).
2. **Physical-device gesture sweep (11.8 AC1)** — MEDIUM — Maintainer, real phone. Checklist over every Epic-11
   surface (slider thumb-drag, sheet 4-snap + chips, quick-info states, map tint/dot/recenter, detail first paint)
   with screenshots; triage any device-only gap before close.
3. **Bless the 11.7 consolidated reference-PNG rebaseline** — MEDIUM — Maintainer, at PR review. 12 staged pairs
   (incl. the review-corrected distinct `map-primary`/`map-panel-venues` pair); dev is structurally forbidden from
   self-blessing.

### Long-term (Backlog) - LOW Priority

1. Component-level date-change overlay assertion (11.1) — the quick win above.
2. Real-browser desktop chip-overflow e2e (11.3) + `dragY`-follows-`my` 1:1 unit assertion.
3. Grant-flyTo viewport-awareness + a `MOBILE_TOP_BAR_COVER` token (11.5).
4. Dead-export cleanup with a re-homed `never`-guard (11.7).

---

## Monitoring Hooks

Epic 11 adds no new runtime monitoring surface. The one durable operational hook it DOES add is the **request-count
invariant as a standing CI gate** (scrub=0, date-change=1), plus the CI-wiring contract guard that prevents the gate
itself from being silently dropped — so the ~9.6 s stall class cannot recur unnoticed. Existing recommendations
carry over from prior epics (the app runs on the real data path). No new alerting threshold is introduced.

---

## Fail-Fast Mechanisms

- **Performance (request-count invariant):** a settled scrub re-fetching or a date change firing >1 request FAILS
  the e2e gate on every PR; the CI-wiring contract guard FAILS if the gate is silently disabled.
- **Reliability (degradation):** a day-series producer throw omits the series per-venue with no 500; markers persist
  across a date change; the Epic-10 gate governs every step (no client re-gate).
- **Maintainability (build):** the removed `|| true` swallow means a real lightningcss error now FAILS the build
  loudly (proven by the injected-ETARGET smoke).
- **Data integrity (honest content):** opening hours render only when present — a venue without data shows nothing,
  never a fabricated value.

---

## Evidence Gaps

3 items — all P3 manual-by-design (each is the CI-un-automatable half of an AC whose CI-provable half is FULL +
green; recorded `needs-human` in the Story-11.8 Post-Merge Verification Protocol — NOT coverage gaps):

- [ ] **Live date-change p95 < 3 s wall-clock** (11.1 AC4 / 11.8 AC3, R-014) — needs the live Vercel deployment;
  ≥10-trial warm/cold method documented. The CI request-count invariant is the durable gate and is FULL + green.
  **Owner:** Maintainer. **Impact:** LOW (MEDIUM only on a real miss).
- [ ] **Physical-device gesture sweep** (11.8 AC1, R-015) — a real phone cannot run headless; the iPhone-14 +
  Pixel-5 profiles are the green automated proxy. **Owner:** Maintainer. **Impact:** LOW.
- [ ] **Maintainer blessing of the 11.7-staged reference-PNG rebaseline** — dev structurally forbidden from
  self-blessing; the 12-pair set is captured + staged + documented. **Owner:** Maintainer. **Impact:** LOW.

Non-material / accepted:

- No dependency-vuln scan artifact in this audit (no new third-party runtime dependency added — empty
  `package.json` diff).
- Live p95 / uptime / error-rate telemetry (out of CI scope; the request-count invariant is the CI proxy for the
  perf win).
- Two mobile obscured/venue-card axe cases remain `test.fixme` against pre-existing Story-5.1 shell contrast debt
  (inherited, tracked, NOT new to this epic).

---

## Findings Summary

**Based on ADR Quality Readiness Checklist (8 categories) — scoped to Epic 11's actual surface**

> Several checklist categories have no Epic-11 surface (this epic changes interaction/perf/polish, not the
> ops/DR/deploy runtime surface). Those are N/A and excluded from the scored denominator to avoid a misleading
> "gap" where the epic simply doesn't touch that area.

| Category | Epic-11 Surface | Status |
| -------- | --------------- | ------ |
| 1. Testability & Automation | P0 100% / P1 100% coverage; tagged BDD; deterministic e2e incl. a real-touch profile; the CI-wiring contract guard | PASS ✅ |
| 2. Test Data Strategy | Fixed day-series fixture (parity); mocked-`/api/venues` DTO for scrub/date-change e2e; opening-hours present/absent venues; overflow tag fixtures | PASS ✅ |
| 3. Scalability & Availability | Client day-series removes per-scrub compute; payload measured (1769 B) + guarded (8000 B); cache bucket consistency; producer-fault isolation | PASS ✅ |
| 4. Disaster Recovery | No DR surface introduced | N/A ℹ️ |
| 5. Security | No auth/authz surface; zero new runtime dependency; no secrets/PII; additive DTO fields public-data-only | PASS ✅ |
| 6. Monitorability/Debuggability | Request-count invariant as a standing CI gate + CI-wiring contract guard; build fails loudly on lightningcss | PASS ✅ |
| 7. QoS/QoE | Instant time-feel (0-fetch scrub) + real-touch drag + axe AA on the de-dulled map + honest quick-info content | PASS ✅ |
| 8. Deployability | `vercel.json` build now fails loudly (hardened); prod-gated dev-only forcing params unchanged | PASS ✅ |

**Scored categories (excluding N/A):** 7 PASS, 0 CONCERNS, 0 FAIL out of 7 assessed = **strong foundation.**
(The 3 non-blocking CONCERNS are all P3 manual-by-design post-merge handoffs, which do not map to a scored ADR
category failure — the CI-provable half of each is PASS.)

---

## Gate YAML Snippet

```yaml
nfr_assessment:
  date: '2026-07-05'
  story_id: 'epic-11'
  feature_name: "Feels Instant, Reads Clear — Time-Scrub Performance, Mobile Interaction & Surface Polish"
  categories:
    performance: 'PASS'      # scrub=0/date=1 provably removed; payload measured+guarded; live p95 = P3 handoff
    security: 'PASS'         # no auth/secrets/new-dependency surface; additive DTO fields public-only
    reliability: 'PASS'      # markers persist; Epic-10 gate per-step; producer-fault isolated; ordering stable
    maintainability: 'PASS'  # orphan resolved, build fails loudly, LF renorm isolated, dot tokenized
    accessibility: 'PASS'    # axe AA green BOTH breakpoints after de-dull; reduced-motion halo; badge 5.63:1
    usability: 'PASS'        # real-touch thumb-drag + four sheet snaps (CDP touch, not click-sim); recenter per-snap
  overall_status: 'PASS'
  advisory: true
  critical_issues: 0
  high_priority_issues: 0
  medium_priority_issues: 3   # all P3 manual-by-design post-merge handoffs
  concerns: 3                 # live p95 (deferred); physical-device sweep (deferred); PNG blessing (deferred)
  blockers: false
  quick_wins: 3
  evidence_gaps: 3            # all P3 manual-by-design needs-human (not coverage gaps)
  recommendations:
    - 'PASS (advisory) — no NFR blocker; merge on green CI'
    - 'Maintainer post-merge: live p95 (≥10 warm/cold trials) + physical-device sweep + reference-PNG blessing'
    - 'Backlog: date-change overlay component test; real-browser chip-overflow e2e; dead-export cleanup; grant-flyTo/72 token'
```

---

## Related Artifacts

- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-11.md`
- **Traceability + Gate:** `_bmad-output/test-artifacts/traceability/traceability-report-epic-11.md`
- **Automation Summary:** `_bmad-output/test-artifacts/automation-summary-11-8.md`
- **Live-Perf Method:** `_bmad-output/test-artifacts/atdd-checklist-11-1.md` §"Live-Perf Handoff (AC4)"
- **Epic:** `_bmad-output/planning-artifacts/epics.md` §Epic 11 (lines 2791–3021)
- **Stories:** `_bmad-output/implementation-artifacts/11-1..11-8-*.md`
- **Source / Evidence (NFR-load-bearing, re-verified this audit):**
  - `nextjs-app/test/unit/api/venues-route-day-series.atdd.test.ts` (`PAYLOAD_CEILING_BYTES = 8000`, gzip measure 1769 B)
  - `nextjs-app/test/unit/epic-11-standing-gate-ci-wiring.automate.test.ts` (7 CI-wiring contracts)
  - `nextjs-app/.github/workflows/build-and-test-nextjs.yml` (L110 mobile+desktop, L120 touch, L123 a11y)
  - `nextjs-app/vercel.json` (`|| true` swallow removed; lightningcss pinned) + root `.gitattributes` (source LF, `.log` excluded)
  - `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts` (scrub=0 / date=1 / markers persist)
  - `nextjs-app/test/e2e/epic-11-slider-touch-drag.spec.ts` + `epic-11-sheet-touch-gestures.spec.ts` (CDP real touch)
  - `git diff main..HEAD -- nextjs-app/package.json` = empty (no new runtime dependency)

---

## Recommendations Summary

**Release Blocker:** None. Overall NFR status = PASS (advisory).

**High Priority:** None.

**Medium Priority (all Maintainer, post-merge — do not block the gate):** run the LIVE date-change p95 pass
(≥10 warm/cold trials, triage any miss before epic close), the physical-device gesture sweep, and bless the 11.7
consolidated reference-PNG rebaseline.

**Next Steps:** Proceed to release/merge on green CI. The trace gate is PASS and NFR evidence is green at test level
across all six assessed categories. Track the 3 P3 manual-by-design handoffs to epic close.

---

## Sign-Off

**NFR Assessment:**

- Overall Status: PASS ✅ (advisory)
- Critical Issues: 0
- High Priority Issues: 0
- Concerns: 3 (live p95 deferred; physical-device sweep deferred; reference-PNG blessing deferred) — all
  non-blocking, all P3 manual-by-design, all recorded `needs-human` post-merge
- Evidence Gaps: 3 (the same three P3 manual-by-design handoffs — not coverage gaps)

**Gate Status:** PASS ✅ (advisory — does not block)

**Next Actions:**

- PASS ✅: Proceed to release/merge on green CI. Maintainer performs the 3 recorded post-merge handoffs (live p95,
  physical-device sweep, reference-PNG blessing) before formally closing the epic; optionally clear the 4 backlog
  test-hardening items.

**Generated:** 2026-07-05
**Workflow:** testarch-nfr v4.0

---

<!-- Powered by BMAD-CORE™ -->
