---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-identify-targets'
  - 'step-03-generate-tests'
  - 'step-04-validate-and-summarize'
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-06-30'
inputDocuments:
  - '_bmad-output/implementation-artifacts/9-3-venue-sun-compute-performance-server-caching.md'
  - 'nextjs-app/lib/services/sun-engine-cache.ts'
  - 'nextjs-app/lib/utils/rate-limit.ts'
  - 'nextjs-app/lib/services/sun-engine.ts'
  - 'nextjs-app/app/api/venues/[slug]/route.ts'
  - 'nextjs-app/test/unit/services/sun-engine-caching.atdd.test.ts'
  - 'nextjs-app/test/unit/api/venues-route-caching.atdd.test.ts'
  - 'nextjs-app/test/unit/utils/rate-limit.test.ts'
---

# Automation Expansion Summary — Story 9.3 (Venue Sun-Compute Performance / Server Caching)

## Preflight & Context
- Stack: backend/perf (Next.js + Vitest 4, jsdom). Framework present — no HALT.
- Mode: BMad-Integrated, scoped to Story 9.3 (sun-compute building-fetch dedupe, the process-scoped TTL caches in `lib/services/sun-engine-cache.ts`, the Edge proxy rate-limiter in `proxy.ts` / `lib/utils/rate-limit.ts`, and `/api/venues` + `/api/venues/[slug]` caching). Coverage-expansion only.
- Given the tightly-scoped, deterministic nature (extend existing Vitest unit specs at named gaps), executed in-session rather than dispatching the API/E2E subagent fan-out — all targets are unit-level, no new API/e2e surface.
- Existing coverage reviewed to avoid duplication: `rate-limit.test.ts` (IP validation/token-bucket quota/reset/independent keys — already complete, NOT touched), `sun-engine-caching.atdd.test.ts` (dedupe 2→1, byte-identical, null-buildings, co-located collapse, same/new bucket), `venues-route-caching.atdd.test.ts` (route headers/ETag/304/429).

## Targets & Coverage Plan (test levels / priorities)
All unit-level (Vitest), deterministic (call-counts, cache keys, injected/fake clock). NO wall-clock latency asserts (project lesson). No existing assertion duplicated.

| Gap (from brief) | Where covered | Priority |
|---|---|---|
| TTL expiry / eviction with fake timers | `sun-engine-cache.test.ts` (TtlCache boundary `expiresAt<=now`, lazy eviction, TTL restart, 24h/15min constants) + `sun-engine-caching.atdd.test.ts` (24h buildings TTL → re-fetch via fake timers) | P1 |
| Cache-key collisions vs co-located venues | `sun-engine-cache.test.ts` (`buildingsCacheKey` collapse vs near-but-distinct separation, radius folding, lat/lng ordering, NaN sentinel; `timeBucketMs`/`sunComputeCacheKey` 15-min flooring + id/day/variant disambiguation) | P1 |
| Detail-route cache parity | `sun-engine-caching.atdd.test.ts` (list-then-detail through the shared `applyRealSunEngine` engine seam → 0 extra RPCs) | P0 |
| Concurrent / repeated-request cache reuse | `sun-engine-cache.test.ts` (one shared in-flight promise per key + rejection eviction for `getOrFetchNonNull`, `getOrComputeConditional`, `getOrCompute`) | P0 |
| Success-only caching (degraded NOT pinned) | `sun-engine-cache.test.ts` (`getOrFetchNonNull` never caches null; `getOrComputeConditional` cacheable:false not stored) + `sun-engine-caching.atdd.test.ts` (engine seam: building-RPC-failed compute recomputes & recovers same-bucket, 50→100) | P0 |
| Distinct venues NOT collapsing (negative of co-location) | `sun-engine-caching.atdd.test.ts` (two distinct 4-dp centroids → 2 RPCs) | P1 |

## Tests Generated
- **New file:** `nextjs-app/test/unit/services/sun-engine-cache.test.ts` — 28 pure-unit tests for `TtlCache`, `buildingsCacheKey`, `sunComputeCacheKey`/`timeBucketMs`, and the three `getOr*` helpers.
- **Extended:** `nextjs-app/test/unit/services/sun-engine-caching.atdd.test.ts` — +4 engine-level integration tests (10 → 14) + imported `BUILDINGS_CACHE_TTL_MS`.

## Results
- `tsc --noEmit`: 0 errors. `eslint . --quiet`: 0 errors.
- Full suite: **87 files / 760 tests passed** (was 86 / 728 → net +32 tests, none removed or weakened).
- No source code modified; no visual references touched (story is backend-only, visual gate auto-skips).

## Coverage notes / deferred
- The cache helpers expose an injectable `now`, so most TTL behaviour is asserted purely (no timer mocking). The one integrated 24h-TTL test drives the engine's default `Date.now()` path under `vi.useFakeTimers()` + `vi.advanceTimersByTime`, which is deterministic.
- Live cold/warm wall-clock latency remains a maintainer/preview measurement (Task 5 escalation), intentionally NOT asserted in CI.

## Next recommended workflow
`test-review` (validate test quality) or `trace` (traceability matrix) for Story 9.3.
