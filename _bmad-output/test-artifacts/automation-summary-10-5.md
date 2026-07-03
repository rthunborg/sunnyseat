---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-identify-targets'
  - 'step-03-generate-tests'
  - 'step-04-validate-and-summarize'
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-07-03'
inputDocuments:
  - '_bmad-output/implementation-artifacts/10-5-weather-reality-verification-pass-regression-guards.md'
  - 'nextjs-app/test/setup/setup.ts'
  - 'nextjs-app/test/unit/no-live-metno-fetch-guard.atdd.test.ts'
  - 'nextjs-app/test/unit/services/sun-engine.two-signal-invariants.atdd.test.ts'
  - 'nextjs-app/test/unit/services/sun-engine.cloud-gate.atdd.test.ts'
  - 'nextjs-app/test/unit/solar/effective-cloud-cover.test.ts'
  - 'nextjs-app/test/e2e/epic-10-weather-matrix.spec.ts'
---

# Test Automation Expansion — Story 10.5 (Weather-Reality Verification Pass & Regression Guards)

## Preflight & Context

- **Stack:** fullstack (Next.js 16 + React; Playwright e2e + Vitest unit/component). Frameworks verified present (`nextjs-app/playwright.config.ts`, `nextjs-app/vitest.config.ts`).
- **Mode:** BMad-Integrated (story file provided).
- **Execution:** sequential — the residual gap is a single, tightly-scoped unit file; subagent/agent-team orchestration would be overkill and risk duplicating the already-comprehensive matrix, which the task explicitly warns against.

## Scope Discipline (why this expansion is narrow)

Story 10.5 is itself a verification/regression-guard story. Its acceptance work already ships a
**comprehensive, deterministic matrix** that this expansion must NOT duplicate:

- Engine gate + rain OR-term + cache consistency: `sun-engine.cloud-gate.atdd.test.ts` (all five
  states, threshold read from the constant, rain precedence, horizon boundaries, lazy-path guard).
- Layer-weighted effective cover algebra + boundary intent: `effective-cloud-cover.test.ts`
  (clamp, additive two-band, low≡medium parity, strict-undefined, weight-ordering meta-guard).
- Cross-tier two-signal guarantee (geometry byte-identical across all five weather variations;
  FR12 confidence blend at the calculator layer): `sun-engine.two-signal-invariants.atdd.test.ts`.
- `skyConditionFromCloudCover` boundaries + `undefined⇒'unavailable'`: `sun-engine.test.ts` +
  `sun-engine.cloud-gate.coverage.test.ts`.
- End-to-end presentation across the five scenarios × both breakpoints, no live Met.no:
  `epic-10-weather-matrix.spec.ts`.

I confirmed each of these green before authoring anything, and added coverage in the **one** place a
genuine residual gap remained.

## Coverage Plan (targets by level / priority)

| Target | Level | Priority | Status |
| --- | --- | --- | --- |
| Fetch-guard host-matching logic (`isApiMetNoRequest` in `test/setup/setup.ts`) — input shapes, exact-host discipline, surgical pass-through | Unit | **P1** | **NET-NEW (added)** |
| Engine gate / rain / cache / horizon | Unit | P0 | Already covered — verified green, not touched |
| Effective-cloud-cover formula algebra | Unit | P1 | Already covered — verified green, not touched |
| Two-signal geometry-invariance + FR12 confidence | Unit | P0 | Already covered — verified green, not touched |
| Five-scenario presentation matrix (card+pin+detail, both breakpoints) | E2E | P0 | Already covered — verified green, not touched |
| No-live-Met.no guard existence + surgical relative-URL pass | Unit | P1 | Already covered (acceptance) — extended below |

### The residual gap (justification)

The shared no-live-Met.no fetch guard is the single highest-value regression guard the epic added
(retro-note 10.4 R1: a masked live Met.no call slipped a green vitest run). Its **acceptance** test
(`no-live-metno-fetch-guard.atdd.test.ts`, 3 tests) proves the guard *exists* and is surgical for the
two string happy-path URLs + a relative URL. But the guard's **own distinctive host-matching code**,
authored by this story in `setup.ts`, is unpinned on exactly the axes where a well-meaning future
edit silently re-opens the masked-call class:

1. **Input-shape coverage** — `fetch` accepts `string | URL | Request`; the guard branches on all
   three, but only the string shape was tested. A refactor that passes a `URL`/`Request` object while
   the guard recognised only strings would leak a live call undetected.
2. **Exact-host discipline** — the guard matches `host === 'api.met.no'`, not a substring. A naive
   `.includes('api.met.no')` rewrite would false-positive-trap `api.met.no.evil.example` (suffix
   spoof) **and still pass all 3 acceptance tests**. Prefix host `notapi.met.no` and a non-api met.no
   host must also NOT match. Untested.
3. **Surgical pass-through** — the guard is deliberately scoped to `api.met.no` only (a decision the
   story's Completion Notes explicitly flag), so benign external absolute-URL fixtures (map-tile /
   thumbnail hosts) still work. A future broadening to "all external hosts" would silently break them.
   Unguarded.

## Files Created / Updated

- **NEW** `nextjs-app/test/unit/no-live-metno-fetch-guard.coverage.test.ts` — 9 tests across three
  describes: input-shape coverage (URL object / Request object / case-insensitive host), exact-host
  discipline (suffix-spoof, prefix, non-api met.no host all NOT trapped), surgical pass-through
  (unrelated external host / same-origin absolute / odd input all NOT trapped). Relies on the shared
  setup guard (no local fetch mock); distinguishes the guard's own rejection from a generic network
  error by matching the guard message text.

No production code touched. No new fixture/factory/helper, no CLI browser session opened (unit-only
expansion), no e2e added (the presentation matrix is already comprehensive across both breakpoints —
adding to it would double-execute, retro-note R-007).

## Gate Results

- `tsc --noEmit`: 0 errors.
- `eslint` (new file): 0 errors / 0 warnings.
- `vitest run` (full suite): **121 files / 1116 tests passed, 0 skipped, 0 failed.** Clean net-add of
  +1 file / +9 tests over the story's post-green baseline (120 files / 1107 tests); nothing dropped.

## Assumptions & Risks

- The suffix-spoof negative control (`api.met.no.evil.example` NOT trapped) was verified against
  `new URL(...).hostname` semantics — it resolves to `api.met.no.evil.example`, so the exact-host
  check correctly lets it pass; a `.includes` rewrite would flip that assertion red (the intended
  regression signal).
- The guard's URL-parse `catch` branch is not exercised by the "odd input" case (that input resolves
  same-origin against the `http://localhost` base rather than throwing); the test asserts the
  observable contract (guard does not fire for a non-met.no input) rather than the internal branch.

## Next Recommended Workflow

- `trace` (traceability matrix / gate decision) if a formal AC→test map is wanted for Epic 10 close-out.
- Otherwise none — the engine/data/presentation matrix plus this guard-hardening leave no material
  residual automation gap for this verification story.
