# SunnySeat Launch-Readiness Continuation Handoff

Date: 2026-08-24 (Europe/Stockholm)

This is a portable WIP checkpoint for continuing Story 13.1. The implementation
has merged and deployed, but the story is intentionally still `in-progress`:
provider-classified cold-start evidence, an isolated restore, and human device
acceptance remain incomplete. This document is not release approval.

## Resume target

- Repository: `https://github.com/rthunborg/sunnyseat.git`
- Branch: `codex/launch-resilience-follow-up`
- Exact continuation checkpoint:
  `668badb0ce15ee321a6aca207f1c5288dbe8f7ea`.
- Parent reconciliation checkpoint:
  `1b1d4083e803a86beed9254d8bcb935ca8499eae`
  (`chore: reconcile post-epic-12 local work`).
- Protected Epic 12 main: `236dde353972e707388468a0686d9ca022a0cc09`.
- Epic 12 is complete. Do not reopen it. Its closeout merged through PR #26.
- Story implementation commits:
  - `56995fbd91d174b8ca8204b85122aa5fd4133bf0`
  - `2a0ce92c0d022e724dc6c2a2fd196dab7c92a6d8`
- PR #27 merged to `main` as
  `6c09f8ce69bb8ec7c035b01b855bd1b91fbe36e2`.
- Production is `https://sunnyseat.vercel.app`, deployment
  `dpl_9ycVfmVttmAxP9mrCi4Jq8Qh7Y4L`, READY in `dub1` from that merge.

Fresh-clone setup:

```powershell
git clone https://github.com/rthunborg/sunnyseat.git
Set-Location sunnyseat
git switch --track origin/codex/launch-resilience-follow-up
git status --short --branch
git log -3 --oneline --decorate
```

Read `AGENTS.md`, this handoff, `project-context.md`, and the Story 13.1 file
before changing anything. Re-establish required local environment variables and
Vercel/Supabase authentication on the new computer; no credentials or secrets
are in this checkpoint.

## What is safely complete

### Primary checkout reconciliation

- The two user-owned tracked changes were inspected without discarding either.
- The nondeterministic Story 12.10 timing drift was archived to a new dated
  evidence artifact and the authoritative historical artifact was restored.
- The valid `await bypassOnboarding(page)` change in
  `nextjs-app/test/e2e/map-primary.spec.ts` was preserved.
- The reconciliation result was committed as
  `1b1d4083e803a86beed9254d8bcb935ca8499eae`, directly on top of the
  immutable Epic 12 main SHA.
- Unrelated untracked validation captures and local Supabase material were left
  untouched.

### Separate post-Epic-12 work item

- Epic 13, **Launch Resilience Evidence**, and Story 13.1 were created so none of
  this work reopens Epic 12.
- Relevant files:
  - `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-17.md`
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`
  - `_bmad-output/implementation-artifacts/13-1-provider-classified-cold-starts-dependency-path-tracing-and-isolated-restore-drill.md`
- Sprint status currently records Epic 13 and Story 13.1 as `in-progress`.
  The story document and Auto-BMAD state now also say `in-progress`, reconciled
  through the sanctioned workflow convention. Do not directly force a sprint
  status transition and do not move the story to `review` until all evidence and
  gates are complete.

### Request identity and directly observed dependency paths

- A request-scoped AsyncLocalStorage context and a Supabase fetch observer were
  added.
- The public venue route directly observes only these bounded paths:
  - `/rest/v1/venues`
  - `/rest/v1/rpc/read_current_venue_sun_geometry_batch`
  - `/rest/v1/weather_bucket_snapshots`
- Telemetry omits query strings, payloads, headers, secrets, venue IDs,
  coordinates, and arbitrary path or label values.
- Request logging is generic and context-preserving across the venue list,
  venue detail, reviews GET/POST, and feedback POST routes, including handled
  success and error responses.
- Tests cover request isolation, route identity headers, destination allowlists,
  and omission of unsafe fields.
- The persisted public read path still performs one venue-list read, one batched
  geometry RPC, and one batched weather read. No Met.no request and no
  shadow-caster/hash RPC runs on that public read path.

### Reproducible production probe lane

- The probe uniquely tags each client request, preserves raw correctness and
  timing rows, and uses one exact Vercel CLI 59.1.3 request-log export per client:
  `vercel logs <deployment> --environment production --request-id <id> --limit 10 --json`.
- It rejects missing, duplicate, extra, truncated, or mismatched provider log
  envelopes. Accepted log sources are restricted to `serverless` and
  `serverless-middleware`.
- A Vercel provider metric remains the sole authority for function start class
  and function region. Cache `MISS` is never called a cold start.
- Edge-hit samples require their own exact provider-correlated envelope.
- Live discovery confirmed that the suffix of `x-vercel-id` matches the exact
  request log envelope ID. A production HIT was correlated this way.
- Production correctness was rechecked on
  `/api/venues?lat=57.7089&lng=11.9746&radiusKm=3`: HTTP 200, 42 venues, 42
  unique IDs, and exactly 61 series steps per venue.
- This is implementation and feasibility evidence only. The required set of at
  least 20 provider-classified true cold starts has **not** been collected.
- Production window 01 captured 30 uncached origin attempts, one edge-prime
  request, and 20 edge repeats. Every response was HTTP 200 with 42 unique
  venues and exactly 61 ordered steps per venue. Client-only nearest-rank
  results were origin MISS n=30 p50/p95 498.842/3141.4 ms, edge-prime MISS n=1
  1325.426/1325.426 ms, and edge HIT n=20 64.351/84.539 ms. These are not cold,
  prewarmed, or hot-origin classifications. The authenticated connector does
  not expose `function_start_type`; accepted provider-classified cold n remains
  zero until the pinned Vercel CLI/metrics lane is authenticated and imported.
- One exact request was correlated to a single GET `/api/venues` 200 MISS
  envelope in `dub1` plus directly observed Supabase calls only: GET
  `/rest/v1/venues`, GET `/rest/v1/weather_bucket_snapshots`, and POST
  `/rest/v1/rpc/read_current_venue_sun_geometry_batch`. No Met.no or
  shadow-caster/hash request was observed.

### Disaster-recovery preparation

- A written, safety-gated runbook exists at
  `docs/launch/disaster-recovery-runbook.md`.
- The read-only verifier is `scripts/dr/verify-restore.sql`.
- The runbook requires a fresh pre-confirmation clone session, live source and
  provider refresh, an empty run ledger, a unique isolated target, at least a
  30-minute safety margin, exact target rebinding for smoke tests, and identity-
  based cleanup verification.
- It covers schema/migration parity, extensions, outbound-capability absence,
  RLS, grants, service-role-only RPCs, Storage policy/object-byte limitations,
  venue visibility, geometry, weather, application reads/writes, rollback, and
  cleanup.
- Fresh provider inventory on 2026-09-03 reports source `ACTIVE_HEALTHY` in
  `eu-west-1`, PostgreSQL 17.6, 24 migrations, one empty `venue-media` bucket,
  zero Auth users/identities/sessions, no branches, WAL-G enabled, PITR disabled,
  and organization plan `free`.
- Fresh `backups list` returned no selectable backup (`backups: null`, empty
  physical-backup metadata). Supabase documents Restore to New Project as a
  paid-plan/physical-backup feature. The displayed cost/confirmation boundary
  is therefore currently unreachable; do not upgrade the plan or create a
  target without a separate user decision.
- The verifier now renders one fixed UTC anchor into a hash-bound ignored copy
  because the linked Management API query path does not inherit `PGOPTIONS`.
  Supabase CLI remains exact 2.114.0 and runs through Corepack/pnpm 11.24.0.
- Latest fresh source capture at `2026-09-03T09:03:58.557Z` passed read-only
  with `hard_failure_count=0` and template SHA-256
  `7C3C0E46673F425E06B603C5A0B51A75F0D48EB11C785F926F0DFD57EB2DCB37`:
  - geometry: 924 valid exact-61 rows, 22 complete 42-venue cohorts, required
    5/5, checksum `6920ae761dc43ba9ce9b33c2ebf400d4`;
  - weather: 882 rows over 21 complete cohorts, required 4/4 and 168/168
    required rows nonempty and unexpired, 30 legitimate retained empty rows
    outside required dates, zero malformed rows, checksum
    `550bd200762426749145cc99f7c7aa43`;
  - the exact five-edge service-role membership contract passed after recording
    the provider's current, stricter `admin_option=false` values.
- Before that recovery, a capture at `2026-09-03T08:57:48.710Z` proved all 168
  required rows were expired despite the preceding weather job succeeding.
  The latest 100 successful scheduled runs contain 36 delivery gaps over the
  two-hour TTL, with a worst gap of 606.6 minutes. Expiry remains fail-closed to
  weather `unknown`; it is not a restore-integrity failure, but reliable live
  weather remains a launch-readiness defect. Manual weather-only run
  `33736676157` restored freshness and passed in 41 seconds.
- No restore, clone creation, failover, paid-plan change, or target resource was
  performed. The only production write was the existing protected weather-only
  refresh workflow. At a future displayed **Restore to New Project** price/
  confirmation boundary, stop and obtain fresh explicit user approval.

### Infrastructure maintenance already implemented

- **Security release applied.** `next`, `eslint-config-next`, and
  `@next/bundle-analyzer` are pinned to the official patched Next.js 16.3.3
  release.
- GitHub workflows use exact Node-24-runtime action pins:
  - `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1`
    (v7.0.1)
  - `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020`
    (v7.0.0)
  - `actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`
    (v7.0.1)
- Installs use `npm ci --no-audit`, followed by an explicit production audit:
  `npm audit --omit=dev --audit-level=high`.
- Lighthouse now runs in the build job, eliminating the `.next` artifact
  upload/download path whose GitHub codeload requests intermittently returned
  429/502. Normal setup-node exact cache-hit/no-save behavior is documented.
- The npm 10 lockfile was regenerated/repaired. Production audit was zero.
  The full audit reports 14 findings (2 low, 4 moderate, 8 high), all in the
  development-only Lighthouse CI transitive tree. Browserslist is pinned by an
  exact override to patched 4.28.8. Do not use `npm audit fix --force` or perform
  broad blind upgrades.

### Accessibility and acceptance preparation

- The AVSTÅND fact-card text now uses the AA-safe body text token.
- The complete mobile axe project passes 14/14 and the complete desktop axe
  project passes 18/18, including the re-enabled Privacy route.
- Route/device acceptance coverage has been inventoried. Production has no
  venue media, so photo-loaded validation remains local/intercepted or against
  canonical references.
- Physical-device validation remains required for PWA installation, standalone
  launch/update behavior, true offline fallback, real GPS, touch gestures, and
  VoiceOver/TalkBack.

## Final bundle and compiler decision

- React Compiler remains deliberately disabled for launch in `next.config.ts`;
  `project-context.md` records the decision and a later evidence-led
  reevaluation path.
- A single strict `LazyMotion` + `domMin` provider boundary now serves source-
  wide `m.*` usage.
- A small hydration-safe `useReducedMotion` hook preserves the explicit reduced-
  motion branches without pulling the Motion hook path into chunks.
- NotFound's one imperative Motion animation was replaced with equivalent WAAPI.
- The budget gate now correctly treats **all emitted** `.next/static/**/*.js` as
  the binding total, not just the initial + MapLibre union.
- Final exact results:
  - initial: 231.37 KiB / 280 KiB — PASS
  - MapLibre-loaded: 298.43 KiB / 320 KiB — PASS
  - all emitted static JavaScript: 598.40 KiB / 600 KiB — PASS
- The MapLibre asynchronous-loading verifier also passes: one MapLibre chunk is
  absent from the root first-load files across all 15 inspected manifests.

## Verification at this pause

The final combined working tree has completed the clean local gate set:

- `npx tsc --noEmit` — PASS
- `npx eslint . --quiet` — PASS
- `npx vitest run` — PASS (225 files, 2076 tests)
- `npm run build` — PASS on Next.js 16.3.3
- exact bundle verifier — PASS at 231.37 KiB initial, 298.43 KiB
  MapLibre-loaded, and 598.40 KiB all-static
- MapLibre async verifier — PASS
- Playwright mobile + desktop — PASS (149 passed, 51 project-inapplicable skips)
- Playwright touch — PASS (8/8)
- mobile axe — PASS (14/14)
- desktop axe — PASS (18/18)
- Lighthouse — PASS assertions over three runs; performance 0.86 / 0.88 /
  0.87 and accessibility 1.00 / 1.00 / 1.00
- Protected CI run `33731589197` — PASS, including the complete test, browser,
  touch, axe, build, bundle, async-loading, and Lighthouse lanes.
- PR #27 merged and production deployment
  `dpl_9ycVfmVttmAxP9mrCi4Jq8Qh7Y4L` reached READY on the canonical alias.
- Automated production browser verification passed at 390x844 and 1440x900:
  healthy Swedish accessibility trees, no page/console errors, zero venue-list
  requests across three same-date scrubs, exactly one venue-list request on a
  date change, and a working venue detail/reviews entry flow without submission.
  Headless screenshots show the token fallback map surface while network logs
  prove OpenFreeMap style/tile HTTP 200; physical-device map rendering remains
  required.
- Focused post-merge DR source-contract tests — PASS (11/11); fresh read-only
  source verifier — PASS with zero hard failures. A subsequent independent
  focused DR patch rereview found no actionable findings.
- Story 13.1 has no mapped Screen ID or standalone visual deliverable, so visual
  validation is not applicable; do not describe this as a screenshot PASS.
- Post-review verification changes received a targeted adversarial audit and
  rereview. All actionable findings were fixed. Four formal review rounds ran;
  the user explicitly accepted the mechanical convergence caveat after Round 4.

## Launch blockers and remaining work, in order

1. Authenticate pinned Vercel CLI 59.1.3, import exact provider metrics for
   window 01, and continue the production measurement lane until there
   are at least 20 **provider-classified** cold starts. Report cold, prewarmed,
   hot-origin, and edge-hit cohorts separately with raw n/p50/p95; enforce HTTP
   200, 42 unique venues, 61 ordered steps per venue, and the approximately
   five-second uncached-route threshold. Claim endpoint paths only from directly
   observed telemetry.
2. Resolve production weather scheduling reliability. GitHub's requested
   five-minute schedule has repeatedly exceeded the two-hour freshness TTL.
   Do not extend the TTL. The reviewed narrow direction is a CRON_SECRET-
   authenticated Vercel Pro cron using the existing refresh logic plus a durable
   cross-scheduler lease; configuration and schema/application changes need a
   dedicated reviewed follow-up before activation. Until then, monitor and use
   the protected weather-only manual dispatch when stale.
3. Decide whether to move the Supabase organization off `free` and establish a
   selectable physical backup. Only then can the runbook reach the provider's
   displayed Restore to New Project cost boundary and request fresh approval.
   After approval, measure recovery, run parity and isolated application smoke,
   roll back, and identity-verify cleanup. Never overwrite or fail over
   production without a separate fresh approval.
4. Give the user the physical-device
   checklist with exact production URLs, screenshots/reference images, and
   pass/fail questions. Do not create fake production reviews or feedback.
5. Publish the durable launch report with changes, commits/PRs, commands and
    results, production evidence, remaining caveats, and an explicit GO / GO
    WITH CAVEATS / NO-GO recommendation.

Until the provider cold-start sample, reliable weather scheduling, isolated
restore drill, and required human device checks are resolved, the honest
interim recommendation is **NO-GO**.

## Acceptance URLs and human-only scope

Use the production origin `https://sunnyseat.vercel.app` with:

- `/`
- `/?venue=posthotellet`
- `/favoriter`
- `/about`
- `/sekretess`

The final physical-device checklist must cover map load/gestures/location and
selected venue behavior; same-date scrub with zero extra venue requests; date
change with exactly one venue-list request; detail/photos/fallback/reviews/
feedback; favourites and selected-time closed venues; PWA install/standalone/
update/offline behavior; Swedish copy/accessibility; and console/network
cleanliness.

## Non-portable local material intentionally not committed

The old checkout contains unrelated user-owned validation logs, screenshots,
candidate directories, `nextjs-app/AGENTS.md`, and `nextjs-app/supabase/`. They
were deliberately preserved and excluded from this checkpoint. A fresh clone
will not contain them. The accessibility screenshots created during this work
also live outside the repository under the prior Codex visualization directory;
use the canonical checked-in design references or recapture on the new machine.

## External-state and cleanup statement

- PR #27 changed production to deployment
  `dpl_9ycVfmVttmAxP9mrCi4Jq8Qh7Y4L`; protected CI and deployment are green.
- No restore target or paid cloud resource was created.
- No production feedback/review test data was written.
- Protected manual workflow run `33736676157` refreshed only production weather
  snapshots after the source verifier proved they had expired.
- No task-owned server, browser, watcher, container, WSL process, or other
  long-lived runtime remains active at this checkpoint.
