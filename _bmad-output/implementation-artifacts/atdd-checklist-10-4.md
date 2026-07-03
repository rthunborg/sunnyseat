---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04-generate-tests'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-07-03'
workflowType: 'testarch-atdd'
inputDocuments:
  - '_bmad-output/implementation-artifacts/10-4-rain-now-signal-met-no-nowcast.md'
  - 'nextjs-app/lib/services/sun-engine.ts'
  - 'nextjs-app/lib/weather/met-no-service.ts'
  - 'nextjs-app/lib/utils/sun-status-presentation.ts'
  - 'nextjs-app/lib/types/design-tokens.ts'
  - 'nextjs-app/test/unit/weather/met-no-service.cloud-gate.atdd.test.ts'
  - 'nextjs-app/test/unit/services/sun-engine.cloud-gate.atdd.test.ts'
  - 'nextjs-app/test/unit/confidence-calculator.cloud-gate.atdd.test.ts'
  - 'nextjs-app/test/unit/sun-status-presentation.test.ts'
---

# ATDD Checklist — Epic 10, Story 10.4: Rain-Now Signal (Met.no Nowcast 2.0)

**Date:** 2026-07-03
**Author:** Rasmus (auto-bmad TEA delegate)
**Primary Test Level:** Unit / Engine (Vitest + node, deterministic — mocked `fetch` / injected nowcast override, fake timers; no network, no live Met.no)

---

## Story Summary

Tier 2 of the "Honest Sky" epic: add a radar-based rain-now signal so a terrace is never
presented as a sun destination during active rain. A new `lib/weather/nowcast-service.ts`
client gives the engine "precipitation rate at this coordinate now"; active precipitation
(rate > 0) at a near-now instant force-gates a geometrically-sunlit venue to `CloudObscured`
(rain wins over any cloud value) and surfaces the `'rain'` sky-condition copy; a no-rain /
unknown reading contributes NOTHING (the epic's hard constraint); and the nowcast is skipped
entirely for future-planner requests beyond a short horizon.

**As a** user
**I want** the app to know it is raining right now
**So that** a terrace is never presented as a sun destination during active rain

**Backend/data story — NO new screen** (rain reuses the Story 10.2 obscured chrome). The
acceptance signal is explicitly the unit/engine test matrix below — there is NO screenshot
surface and NO reference-PNG change.

---

## Acceptance Criteria (mapped to scaffolds)

1. **AC1** — A TOS-compliant Nowcast 2.0 client (`/nowcast/2.0/complete`, shared identifying
   User-Agent, ≤4-decimal coords, short-TTL) with graceful degradation: outage / no-coverage /
   absent field ⇒ `undefined` (never a throw, never a fabricated `0`).
2. **AC2** — Active precipitation (rate > 0) at a near-now instant force-gates a
   geometrically-sunlit venue to `CloudObscured` REGARDLESS of cloud fraction (rain wins), and the
   surfaced `skyCondition` becomes `'rain'` with plain-language copy.
3. **AC3** — Absence of rain (rate `0` OR `undefined`) contributes NOTHING positive: it never
   un-gates a cloud-gated venue, never lifts a non-sunlit venue to Sunny — cloud + geometry alone
   decide. (The epic's HARD CONSTRAINT: "absence of rain must NEVER imply sun.")
4. **AC4** — A `requestedAt` beyond `NOWCAST_HORIZON_MS` (or in the past) never consults the
   nowcast — forecast cloud governs, exactly as Tiers 0/1; no stale "now" radar reading leaks into
   a future answer.

---

## Generation Mode

**AI generation** (browser recording skipped). Rationale: every acceptance signal is a
deterministic Vitest assertion — mocked-`fetch` synthetic Nowcast responses (AC1), injected
nowcast-override + fake-timers engine runs (AC2/AC3/AC4), and a pure copy-mapper call (AC2 copy).
No live-browser interaction exists to record (this is a backend/data story with no new screen).
The deterministic mocked-weather e2e matrix + live spot-check is Story **10.5**'s job — no e2e
authored here per the story's explicit instruction.

---

## Test Strategy (levels + priorities)

| AC | Signal | Level | Priority | Scaffold |
|----|--------|-------|----------|----------|
| 1 | URL `/nowcast/2.0/complete` + 4-dp `lat`/`lon`; not `/classic` | Unit (fetch-stub) | P0 | `nowcast-service.cloud-gate.atdd.test.ts` |
| 1 | Shared identifying User-Agent (403 otherwise) | Unit | P0 | `nowcast-service.cloud-gate.atdd.test.ts` |
| 1 | `precipitation_rate` present ⇒ returned; `0` distinct from unknown | Unit | P0 | `nowcast-service.cloud-gate.atdd.test.ts` |
| 1 | Field ABSENT / non-OK / throw / empty / coverage≠ok ⇒ `undefined` (never `0`, never throw) | Unit | P0 | `nowcast-service.cloud-gate.atdd.test.ts` |
| 2 | Pure `applyCloudGate` rain OR-term: sunlit+rain ⇒ gate even below cloud threshold / unknown cloud | Unit (pure helper) | P0 | `sun-engine.cloud-gate.atdd.test.ts` |
| 2 | Rain never gates Shaded / NoSun / down-sun (precedence preserved) | Unit (pure helper) | P0 | `sun-engine.cloud-gate.atdd.test.ts` |
| 2 | E2E engine: rain (0.5) + low cloud + sunlit ⇒ `CloudObscured` + `skyCondition='rain'` + geometry preserved | Engine (injected override) | P0 | `sun-engine.cloud-gate.atdd.test.ts` |
| 2/3 | Rain over below-horizon venue ⇒ stays NoSun (rain never gates non-sunlit) | Engine | P0 | `sun-engine.cloud-gate.atdd.test.ts` |
| 3 | (a) no-rain(0)+overcast+sunlit ⇒ still `CloudObscured` (no un-gate) | Engine | P0 | `sun-engine.cloud-gate.atdd.test.ts` |
| 3 | (b) no-rain(0)+clear+non-sunlit ⇒ stays NoSun (no lift to Sunny) | Engine | P0 | `sun-engine.cloud-gate.atdd.test.ts` |
| 3 | `undefined` rate ≡ `0` rate (cloud+geometry alone decide); rain is additive-only | Engine | P0 | `sun-engine.cloud-gate.atdd.test.ts` |
| 4 | `requestedAt` beyond `NOWCAST_HORIZON_MS` ⇒ nowcast NOT called + not force-gated | Engine | P0 | `sun-engine.cloud-gate.atdd.test.ts` |
| 4 | `requestedAt` inside horizon ⇒ nowcast called + gates; PAST instant ⇒ NOT called | Engine | P0 | `sun-engine.cloud-gate.atdd.test.ts` |
| 2 | `skyConditionCopy('rain', …)` ⇒ plain-language copy (no meteorology internals); others unchanged | Unit (pure mapper) | P0 | `sun-status-presentation.rain.cloud-gate.atdd.test.ts` |

**Deliberately deferred to dev (not scaffolded here — the story assigns them as in-place edits or to 10.5):**
- **Flipping the existing `sun-status-presentation.test.ts:59`** `skyConditionCopy('rain', SKY_COPY)).toBeNull()` assertion to expect the rain copy + adding `rain` to that file's `SKY_COPY` — a Task-4 IN-PLACE edit on an existing (non-`.atdd`) unit test, done during GREEN. The new `.rain.cloud-gate.atdd.test.ts` is the red-first driver for it.
- **`messages-parity` sv/en `rain` keys + component sky-copy fixtures** (`VenueQuickInfo.test.tsx`, `VenueDetailContent.test.tsx`) — mechanical fixture/parity updates the dev makes alongside the copy wiring (Task 4); a red-first scaffold would only duplicate the parity test that already guards them.
- **List-route deduped-nowcast + detail-route default wiring** (Task 5) — thin call-site plumbing over the already-proven engine seam + `getNowcastPrecipitationRate` client; the default-seed byte-identical regression is covered by the existing `test/unit/api/venues-route*.test.ts` staying green (Task 6/7).
- **The deterministic mocked-weather e2e matrix + live spot-check** — explicitly Story **10.5**.

---

## Failing Tests Created (RED Phase)

All new blocks are `describe.skip`. Because the tsc CI gate compiles `.skip`-ped tests AND Vite's
`import-analysis` resolves string-literal `import()` specifiers even inside skipped bodies, the
scaffolds use the **epic-10 ratified red-first pattern**:

- **Loosely-typed dynamic-import accessor via a RUNTIME VARIABLE specifier** for the not-yet-existent
  module `@/lib/weather/nowcast-service` (a string-literal specifier failed Vite import-analysis
  even under `.skip` — confirmed during authoring; a variable specifier is opaque to it).
- **Cast-through-current-signature helpers** for the seams whose SHAPE has not changed yet:
  `applyRealSunEngine` (future 5th `getNowcastOverride`), `applyCloudGate` (future 4th `isRaining`),
  the not-yet-exported `NOWCAST_HORIZON_MS`, and `SkyConditionCopy` (future `rain` field). `tsc`
  only ever sees the loose cast, so it stays green; the casts resolve to the real, correctly-typed
  seams once dev lands them.

**Verified: 3 files, 29 skipped scaffold tests; the 18 pre-existing 10.1/10.3 tests in the extended
sun-engine file still pass; `tsc --noEmit` exit 0; `eslint` exit 0; `vitest run` on the three files
green (18 passed / 29 skipped).**

### File 1 — `nextjs-app/test/unit/weather/nowcast-service.cloud-gate.atdd.test.ts` (9 tests, AC1)
NEW file. RED — `@/lib/weather/nowcast-service` (`getNowcastPrecipitationRate`) does not exist.
Mirrors the `met-no-service.cloud-gate.atdd.test.ts` `vi.stubGlobal('fetch', …)` + synthetic-response
pattern (no network). Verifies: URL `/nowcast/2.0/complete` + 4-dp `lat`/`lon` (not `/classic`);
shared identifying `User-Agent` (`SunnySeat…`); `precipitation_rate: 0.4` ⇒ `0.4`; genuine `0` ⇒ `0`
(distinct reading); ABSENT field (no radar coverage) ⇒ `undefined` (never `0`); coverage marker ≠ `ok`
⇒ `undefined`; non-OK HTTP ⇒ `undefined` (no throw); thrown fetch ⇒ `undefined`; empty timeseries ⇒
`undefined`.

### File 2 — `nextjs-app/test/unit/services/sun-engine.cloud-gate.atdd.test.ts` (extended, +17 tests, AC2/AC3/AC4)
EXTENDED (appended four `describe.skip` blocks below the existing 10.1/10.3 suites; reuses their
hoisted `@/lib/supabase/server` + `@/lib/weather/met-no-service` mocks and the `makeStoredVenue` /
`weatherSlice` factories). RED — the `getNowcastOverride` 5th param, the `isRaining` 4th param on
`applyCloudGate`, the `NOWCAST_HORIZON_MS` export, and a `skyCondition==='rain'` outcome do not exist.
- **[10.4 AC2] applyCloudGate rain OR-term (7)** — sunlit+rain gates below-threshold / unknown cloud;
  never gates Shaded / NoSun / down-sun; no-rain leaves the 10.3 result byte-identical; rain never
  un-gates.
- **[10.4 AC2] rain forces the gate through the engine (2)** — rain(0.5)+low cloud+sunlit ⇒
  `CloudObscured` + `skyCondition='rain'` + `sunExposurePercent`/`sunWindow` preserved; rain over a
  below-horizon venue ⇒ stays NoSun.
- **[10.4 AC3] absence of rain changes nothing (4)** — (a) no-rain(0)+overcast+sunlit ⇒ still
  `CloudObscured` (skyCondition `overcast`, never `rain`); (b) no-rain(0)+clear+below-horizon ⇒ NoSun;
  `undefined` rate ≡ `0` rate; no-override lazy path ⇒ pure-cloud outcome (rain additive-only).
- **[10.4 AC4] future-horizon skips the nowcast (3)** — beyond `NOWCAST_HORIZON_MS` ⇒ nowcast NOT
  called + not force-gated; inside horizon ⇒ called + gates; PAST `requestedAt` ⇒ NOT called. Boundary
  READ from the constant (re-tune safe).

### File 3 — `nextjs-app/test/unit/sun-status-presentation.rain.cloud-gate.atdd.test.ts` (4 tests, AC2 copy)
NEW file. RED — `skyConditionCopy('rain', …)` returns `null` on HEAD and `SkyConditionCopy` has no
`rain` field. Copy fixture cast through the current type. Verifies: `'rain'` ⇒ plain-language copy
(no `mm`/`rate`/`radar`/`%` internals); `clear`/`partly-cloudy`/`overcast` unchanged; unavailable /
undefined / unknown still render nothing.

---

## Mock Requirements

| Boundary | Mock | Why |
|----------|------|-----|
| `global.fetch` (nowcast client) | `vi.stubGlobal('fetch', …)` → synthetic Nowcast 2.0 `complete` JSON | Mirrors the met-no-service ATDD boundary; no network, no live Met.no (MEMORY). |
| `@/lib/weather/nowcast-service` (engine tests) | **Injected via the new `getNowcastOverride` param**, NOT `vi.mock` | The module does not exist on HEAD — a `vi.mock` of a missing module also risks Vite resolution failure. Param injection is clean and matches the story's `getForecastOverride` precedent. |
| `@/lib/supabase/server` (rpc) + `@/lib/weather/met-no-service` (getForecast) | Existing hoisted mocks in the sun-engine ATDD file | Deepest-adapter boundary (vitest dynamic-import-bypass lesson); drives geometry + cloud deterministically. |
| Wall clock | `vi.useFakeTimers()` + `vi.setSystemTime` (`SUMMER_MIDDAY` sunlit / `SUMMER_NIGHT` below-horizon) | Deterministic sun visibility + the AC4 `requestedAt` vs `now` horizon test. |

---

## Implementation Checklist (RED → GREEN)

- [ ] **Task 1** — create `lib/weather/nowcast-service.ts` (`getNowcastPrecipitationRate`,
      `/nowcast/2.0/complete`, shared UA via exported `userAgent()` or `met-no-common.ts`,
      `.toFixed(4)` coords, `revalidate: 60`, absent/failed/no-coverage ⇒ `undefined`). → **un-skip
      `nowcast-service.cloud-gate.atdd.test.ts`; convert the variable specifier to a normal import.**
- [ ] **Task 2** — thread `getNowcastOverride?: GetNowcastRate` through
      `applyRealSunEngine`→`…Cached`→`…Result`; export `NOWCAST_HORIZON_MS = 90*60*1000`; consult the
      nowcast ONLY when `requestedAt ∈ [now, now+NOWCAST_HORIZON_MS]`. → **un-skip the [10.4 AC4]
      block; drop the `applyRealSunEngineWithNowcast` / `nowcastHorizonMs` casts.**
- [ ] **Task 3** — add the 4th `isRaining` param to `applyCloudGate` (`isSunVisible && (cloudGates
      || isRaining)`, switch untouched); derive `isRaining = rate !== undefined && rate > 0` at the
      call site. → **un-skip the [10.4 AC2] applyCloudGate + engine-gate blocks + the [10.4 AC3]
      block; drop the `applyCloudGateWithRain` cast.**
- [ ] **Task 4** — `skyCondition = isRaining ? 'rain' : …` at the engine call site; add
      `rain: string` to `SkyConditionCopy` + `case 'rain'` to `skyConditionCopy`. → **un-skip
      `sun-status-presentation.rain.cloud-gate.atdd.test.ts`; drop its cast. THEN flip the existing
      `sun-status-presentation.test.ts:59` `toBeNull()` assertion + add `rain` to its `SKY_COPY`.**
- [ ] **Task 4 (copy/parity)** — add `rain` sky key to both `messages/{sv,en}/venue.json` blocks
      (×2 scopes) + thread through `MapView.tsx` + `VenueQuickInfo`/`VenueDetailContent`
      `SkyConditionCopy` shapes; keep `messages-parity` + component fixtures green.
- [ ] **Task 5** — list-route deduped nowcast (`createDedupedNowcastFetcher`) + detail-route default;
      confirm default-seed path never imports the nowcast.
- [ ] **Task 7** — full gate; `test/unit/api/venues-route*.test.ts` byte-identical.
- [ ] After each: convert dynamic specifier back to a top-level import + drop the loose `as unknown as`
      casts as each seam lands.

---

## Running Tests

```bash
cd nextjs-app
# The three scaffolds (currently 29 skipped; 18 pre-existing pass)
npx vitest run test/unit/weather/nowcast-service.cloud-gate.atdd.test.ts test/unit/services/sun-engine.cloud-gate.atdd.test.ts test/unit/sun-status-presentation.rain.cloud-gate.atdd.test.ts
# Full gate
npx tsc --noEmit && npx eslint . && npx vitest run
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete)
- 29 acceptance scaffolds authored across 3 files, all `describe.skip`, reaching not-yet-existent
  seams via a runtime variable specifier (module) + cast-through-current-signature helpers (params /
  constant / type) so the gate stays green.
- Verified skipped + gate-clean (vitest 18 passed / 29 skipped, tsc 0, eslint 0).

### GREEN Phase (DEV — next)
Un-skip each block as its target seam lands (order above), convert the dynamic specifier to a normal
import + drop the loose casts, make the assertions pass with the minimal implementation the story
prescribes, keep the gate green. Each block should go RED first when un-skipped (proving it tests
real behaviour), then GREEN on implementation.

---

## Notes / Risks / Assumptions

- **Vite import-analysis constraint (confirmed during authoring, not just tsc).** A string-literal
  `import('@/lib/weather/nowcast-service')` failed `vite:import-analysis` ("Failed to resolve import")
  even inside a `.skip` block — the transform-time analyzer does not honour `.skip`. The fix is a
  RUNTIME VARIABLE specifier (`const NOWCAST_MODULE = '…'; await import(NOWCAST_MODULE)`), which is
  opaque to the static analyzer. Recorded here so the dev knows why the specifier is a variable and
  can simplify it to a normal import once the module exists.
- **Rain-vs-Shaded via below-horizon (`SUMMER_NIGHT`), not caster geometry.** AC3b calls for
  "geometrically-shaded ⇒ still Shaded", but the gate `switch` treats `Shaded` and `NoSun`
  identically (both fall through un-gated). The scaffolds assert the non-sunlit guarantee with a
  deterministic below-horizon `NoSun` case rather than fragile caster-row geometry; the story
  explicitly permits "add casters or use a below-horizon time". The pure `applyCloudGate` block
  additionally pins the literal `'Shaded'` case directly.
- **AC4 boundary is READ from `NOWCAST_HORIZON_MS`, never hard-coded** (retro-note: the constant is
  re-tunable). Rain INTENT (rate>0 gates; 0/undefined inert) is asserted, never an exact rate number.
- **Injection over `vi.mock` for the nowcast** — matches the story's `getNowcastOverride` design and
  sidesteps mocking a module that does not exist yet.
- **No confidence rain-term is scaffolded** — deliberate; the story states a rain slice's high cloud
  already lowers confidence via 10.3's effective-cover path, so a separate rain penalty would
  double-count and is not in the AC set. No `confidence-calculator.ts` touch (the mixed-EOL blob is
  left alone).
- **No e2e, no reference-PNG, no new component** — consistent with the backend/data Design Gate.

---

## Next Recommended Workflow

`bmad-dev-story` on `10-4-rain-now-signal-met-no-nowcast.md` — implement Tasks 1-7, un-skip each
scaffold block as its seam lands (order above), then the standard four-command gate. No visual
affordance / e2e here (10.5 owns the deterministic mocked-weather matrix + live spot-check).

---

**Generated by BMad TEA Agent (auto-bmad delegate)** — 2026-07-03
