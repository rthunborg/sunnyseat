---
baseline_commit: 1b1d408361fbc374b443740270b347c848095acf
---
# Story 13.1: Provider-Classified Cold Starts, Dependency-Path Tracing, and Isolated Restore Drill

Status: ready-for-dev

## Story

As the SunnySeat maintainer,
I want directly measured production resilience and recovery evidence,
so that launch decisions rest on provider-classified performance, attributable dependencies, and a rehearsed recovery path.

## Acceptance Criteria

1. The production lane uniquely tags every request and records raw client timing, exact UTC window, deployment, Vercel request correlation, provider start class when a function runs, execution region, status, and cache cohort. Application code never infers start class and cache MISS is never called cold.
2. Accepted evidence contains at least 20 provider-classified cold starts. Cold, prewarmed, hot-origin, and edge-hit cohorts are separate, each with raw n, p50, and p95.
3. Every included response is HTTP 200, has exactly 42 unique venues, and each venue has exactly 61 ordered day-series steps. A failed assertion fails the lane and is excluded from latency statistics. The approximately five-second uncached threshold remains.
4. Origin telemetry directly observes the bounded paths /rest/v1/venues, /rest/v1/rpc/read_current_venue_sun_geometry_batch, and /rest/v1/weather_bucket_snapshots. It records only request tag, bounded path/operation, method, status, duration, and region.
5. Telemetry omits query strings, payloads, request/response headers, secrets, venue IDs, coordinates, and arbitrary or high-cardinality metric labels. Concurrent request contexts remain isolated.
6. Tests and evidence prove that the public route performs one venue list read, one batched geometry RPC, and one batched weather read, with no Met.no call and no shadow-caster/hash RPC.
7. A written DR runbook precedes execution. Restore runs only against an isolated disposable or staging target; production overwrite or failover requires fresh explicit approval.
8. Restore evidence covers source snapshot identity, procedure, schema and migration-history parity, representative ordered counts/checksums, RLS, grants, service-role-only RPCs, Storage policy and object-byte limitations, venue visibility, geometry/weather contracts, application smoke tests where possible, measured recovery time, stated RPO/RTO, rollback, and cleanup.
9. Unsafe or unavailable portions are documented precisely and are not represented as exercised.

## Tasks / Subtasks

- [ ] Task 1 — Add request-scoped safe telemetry (AC: 1, 4, 5, 6)
  - [ ] Create a server-only request context using Node AsyncLocalStorage.
  - [ ] Accept only a tightly validated controlled probe tag or generate a UUID; do not use it as a metric label.
  - [ ] Echo the origin request tag and emit one bounded route-completion event for 200 and handled error responses.
  - [ ] Observe the Supabase client fetch seam and map only allowlisted destination paths to fixed operation names.
  - [ ] Preserve the three-call batching path and all cache semantics.
- [ ] Task 2 — Add tests before implementation completion (AC: 1, 3, 4, 5, 6)
  - [ ] Unit-test context isolation, validation/generation, allowlisting, and secret/query omission.
  - [ ] Route-test tag echo and completion logging on 200 and 503.
  - [ ] Retain the 42-venue / 61-step batching and source-contract guards.
  - [ ] Mutation-check that Met.no and shadow-caster/hash paths remain absent.
- [ ] Task 3 — Build the production measurement lane (AC: 1, 2, 3, 4)
  - [ ] Generate unique query nonce only for uncached/origin attempts and a unique sanitized request tag for every request.
  - [ ] Preserve exact raw rows and join them to Vercel logs by tag/request ID and exact time window.
  - [ ] Treat Vercel provider telemetry as the sole authority for cold, prewarmed, and hot classification.
  - [ ] Continue sampling until provider-classified cold n is at least 20.
  - [ ] Report cohorts independently with raw n, p50, and p95.
- [ ] Task 4 — Write the DR runbook before the drill (AC: 7, 8, 9)
  - [ ] Document backup/snapshot selection, isolated target prerequisites, restore, parity checks, rollback, cleanup, and approval boundary.
  - [ ] State that local Compose validates PostgreSQL/PostGIS contracts only, not Supabase Auth, Storage API, object bytes, or project settings.
  - [ ] Add read-only validation SQL/scripts for repeatable parity, security, count, and checksum checks.
- [ ] Task 5 — Execute the safest available isolated rehearsal (AC: 7, 8, 9)
  - [ ] Prefer a provider-native restored clone or staging Supabase project when credentials and backup capabilities are available.
  - [ ] Otherwise execute and label the local disposable SQL-only lane, record its limitations, and do not claim a full Supabase restore.
  - [ ] Measure elapsed recovery time, state RPO/RTO, exercise rollback/cleanup, and record proof that production was unchanged.
- [ ] Task 6 — Run required gates and publish evidence (AC: all)
  - [ ] Typecheck, lint, full Vitest, build/bundle checks, relevant Playwright, axe, and Lighthouse.
  - [ ] Use scripts/story-review.sh through scripts/run-sh.ps1 for any review transition.
  - [ ] Never directly edit sprint status to force review.

## Dev Notes

### Current Public Read Contract

- app/api/venues/route.ts loads venues, prepares request-scoped persisted repositories, and builds outcomes without live computation.
- lib/services/venue-store.ts issues the single public venue list query.
- lib/services/sun-geometry-repository.ts issues read_current_venue_sun_geometry_batch once for the full set.
- lib/services/weather-snapshots.ts issues one batched weather_bucket_snapshots read.
- The geometry and weather preparations run concurrently and feed in-memory repositories.
- Existing batching automation proves 42 venues, one geometry RPC, one weather read, and 61 steps per venue.
- Story 12.3 source-contract tests guard against Met.no imports and live shadow projection. Preserve and extend them; do not replace them with weaker source inference.

### Telemetry Design Guardrails

- Use Node runtime AsyncLocalStorage, not browser state and not a global mutable request ID.
- Instrument the configured Supabase fetch seam so destination paths are directly observed.
- Allowlist the configured Supabase origin and normalize to exactly three fixed path values.
- Structured events may include request_id, operation, destination_path, method, status, duration_ms, and VERCEL_REGION.
- Do not emit URL query, headers, bodies, credentials, service-role keys, venue IDs, coordinates, arbitrary host/path values, or UUID metric dimensions.
- An origin response header cannot identify edge-cache hits because the function does not execute; correlate those through Vercel request logs.
- Do not infer cold start in application code. Function start type comes only from Vercel logs/observability.

### Measurement Guardrails

- A unique cache-busting query marks an uncached/origin attempt only; it does not prove a cold start.
- Retain a unique sanitized request tag/User-Agent plus exact UTC window and deployment ID for provider-log correlation.
- Preserve raw sample rows and correctness failures.
- Report edge hits, hot-origin, prewarmed, and cold separately.
- Do not claim endpoint-level external attribution unless the instrumented fetch directly observed the path.

### DR Guardrails

- No production mutation, restore, overwrite, or failover without fresh explicit maintainer approval.
- compose.test.yaml is disposable PostgreSQL/PostGIS only and cannot validate Supabase Auth, Storage API/object bytes, PostgREST API keys, or project configuration.
- The local migration directory is not a self-contained historical production rebuild. Base schema contracts also live in historical implementation SQL artifacts and remote migration versions have documented drift.
- A full drill requires an isolated Supabase/staging project or provider-native restored clone, database credentials, backup/snapshot metadata, and separate handling of Storage object bytes.
- Cleanup must identify the exact isolated Compose project or staging project before removal.

### Architecture Compliance

- Client components remain behind app/api routes; no frontend/backend boundary changes.
- Use existing server-only Supabase infrastructure and preserve dub1 colocation.
- Keep the public route response and Cache-Control/ETag behavior unchanged except for a safe origin correlation header.
- No new user-facing copy or visual changes are expected.
- No raw colors, UI tokens, or component architecture changes are in scope.

### Testing Requirements

- Add failing tests before telemetry implementation.
- Cover parallel context isolation and nested async work.
- Mock the configured fetch seam and assert only fixed allowlisted paths are logged.
- Verify query strings, headers, request bodies, and secret values never appear in serialized events.
- Verify 200 and handled 503 completion events.
- Run the existing persisted-sun batching, route, and source-contract suites unchanged.
- Final gates: TypeScript, ESLint, full Vitest, Next build, MapLibre async verifier, relevant Playwright projects, axe, bundle budget, and Lighthouse.

### Project Structure Notes

Likely update files:
- nextjs-app/app/api/venues/route.ts
- nextjs-app/lib/supabase/server.ts
- nextjs-app/lib/middleware/request-logger.ts or a replacement under nextjs-app/lib/observability/

Likely new files:
- nextjs-app/lib/observability/request-context.ts
- nextjs-app/lib/observability/supabase-fetch-observer.ts
- nextjs-app/scripts/measure-venues-production.mjs
- scripts/dr/verify-restore.sql
- docs/launch/disaster-recovery.md
- targeted unit/route tests
- durable validation evidence under _bmad-output/implementation-artifacts/validation/launch-resilience/

Do not create a second unrelated logger if request-logger.ts can be safely replaced or redirected.

### References

- _bmad-output/test-artifacts/nfr-assessment-epic-12.md
- _bmad-output/test-artifacts/epic-12-protected-validation/protected-validation-report-2026-08-08.md
- _bmad-output/planning-artifacts/epics.md, Epic 13
- project-context.md, Epic 12 persisted-read contract
- nextjs-app/app/api/venues/route.ts
- nextjs-app/lib/services/venue-store.ts
- nextjs-app/lib/services/sun-geometry-repository.ts
- nextjs-app/lib/services/weather-snapshots.ts
- nextjs-app/test/unit/api/persisted-sun-read-batching.automate.test.ts
- nextjs-app/test/unit/api/story-12-3-venues-route.atdd.test.ts
- https://vercel.com/docs/logs/runtime
- https://vercel.com/docs/cli/logs
- https://vercel.com/docs/headers/request-headers

## Dev Agent Record

### Agent Model Used

GPT-5.6

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created.
- Mandatory baseline before story creation: typecheck PASS; lint PASS.
- Checkout reconciliation focused mobile map test: PASS.

### File List
