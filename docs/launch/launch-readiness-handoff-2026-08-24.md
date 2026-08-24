# SunnySeat Launch-Readiness Continuation Handoff

Date: 2026-08-24 (Europe/Stockholm)

This is a portable WIP checkpoint for continuing from a fresh clone. The commit
that contains this document is intentionally not a completed Story 13.1 commit
and must not be treated as release approval.

## Resume target

- Repository: `https://github.com/rthunborg/sunnyseat.git`
- Branch: `codex/launch-resilience-follow-up`
- Resolve the exact checkpoint with `git rev-parse HEAD` after checkout.
- Parent checkpoint: `1b1d408361fbc374b443740270b347c848095acf`
  (`chore: reconcile post-epic-12 local work`).
- Protected Epic 12 main: `236dde353972e707388468a0686d9ca022a0cc09`.
- Epic 12 is complete. Do not reopen it. Its closeout merged through PR #26.
- Production remains `https://sunnyseat.vercel.app` from deployment
  `dpl_FszRAy5d7i84BvfTWt1`; this WIP branch has not been deployed to production.

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
- The result was committed as `1b1d408`, directly on top of the immutable Epic
  12 main SHA.
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
  The story document still says `ready-for-dev`; reconcile this only through the
  sanctioned BMAD workflow/state mechanism. Do not directly force a sprint
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
- A pinned Supabase CLI 2.114.0 read-only source verification passed:
  - `read_only=on`, `hard_failure_count=0`
  - geometry: 504 rows, 12 complete cohorts of 42, required 5/5, checksum
    `5c89e1507406b4b68de70b2f5bbd1e42`
  - weather: 462 rows, 11 complete cohorts of 42, required 4/4, checksum
    `5552328de825c28a2a04142793f895bf`
  - verifier SHA-256:
    `4EC7569D654F9A89182D66BAE0B6319AB88A1FF00C699A16877CCEF4F82EF012`
- The previously observed latest source backup was physical backup ID
  `1408240294`, timestamp `2026-08-18T07:05:56.434Z`, WALG enabled, no PITR,
  region `eu-west-1`, source size approximately 922 MB. This is stale metadata;
  refresh it before any drill.
- No restore, clone creation, failover, production write, or other cloud
  mutation was performed. At the provider's displayed **Restore to New Project**
  price/confirmation boundary, stop and obtain fresh explicit user approval.

### Infrastructure maintenance already implemented

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
  The full audit still reported 10 findings (2 low, 1 moderate, 7 high), all in
  the development-only transitive tree of the current latest
  `@lhci/cli@0.15.1`; do not use `npm audit fix --force` or blindly downgrade.

### Accessibility and acceptance preparation

- The AVSTÅND fact-card text now uses the AA-safe body text token.
- Eight mobile axe checks were activated and the relevant mobile axe project
  passed 13/13 during the work.
- Route/device acceptance coverage has been inventoried. Production has no
  venue media, so photo-loaded validation remains local/intercepted or against
  canonical references.
- Physical-device validation remains required for PWA installation, standalone
  launch/update behavior, true offline fallback, real GPS, touch gestures, and
  VoiceOver/TalkBack.

## Compile-safe but unfinished bundle work

- React Compiler is temporarily disabled in `next.config.ts`.
- A single strict `LazyMotion` + `domMin` provider boundary now serves source-
  wide `m.*` usage.
- A small hydration-safe `useReducedMotion` hook preserves the explicit reduced-
  motion branches without pulling the Motion hook path into chunks.
- NotFound's one imperative Motion animation was replaced with equivalent WAAPI.
- The budget gate now correctly treats **all emitted** `.next/static/**/*.js` as
  the binding total, not just the initial + MapLibre union.
- Fresh results after these changes:
  - initial: 249,769 / 286,720 bytes — PASS
  - MapLibre: 305,536 / 327,680 bytes — PASS
  - all emitted static JavaScript: 628,977 / 614,400 bytes — **FAIL by 14,577**
- Baseline reductions were 48,831 total bytes, 25,003 initial bytes, and 17,791
  MapLibre bytes. Stop treating the total budget as passed until the final
  14,577 bytes are removed safely and the exact gate passes.

## Verification at this pause

The final combined working tree reached this safe boundary:

- `npx tsc --noEmit` — PASS
- `npx eslint . --quiet` — PASS
- `npm run build` — PASS
- reduced-motion and bundle-gate unit tests — 8/8 PASS
- focused source/interaction tests — 47/47 PASS
- request-identity route tests and related route suites — 37/37 PASS
- production-probe focused tests — 31/31 PASS
- mobile axe run during the work — 13/13 PASS
- exact bundle gate — initial PASS, MapLibre PASS, total FAIL by 14,577 bytes
- `git diff --check` — PASS (line-ending normalization notices only)

The following final gates have **not** been run as a clean, complete set after
all combined changes: full Vitest, all relevant Playwright projects, desktop and
touch acceptance, the complete axe matrix, Lighthouse, and visual validation.
Do not infer their result from focused passes.

## Launch blockers and remaining work, in order

1. **Security release first.** The application is pinned to Next.js 16.3.1.
   The official Next.js blog announced an August 26, 2026 coordinated release
   for a critical vulnerability affecting the 16.3 and 15.5 lines. On resume,
   check the official advisory/release, upgrade `next`, `eslint-config-next`, and
   `@next/bundle-analyzer` to the matching patched version, regenerate the lock
   with npm 10, and rerun both production and full audits. Do not assume 16.3.2
   is the security fix merely because it is newer.
2. Finish the remaining 14,577-byte all-static JavaScript reduction without
   weakening the binding budgets or accessibility/interaction behavior. Decide
   deliberately whether React Compiler remains disabled, then reconcile
   `project-context.md` with the final decision.
3. Perform the second independent/adversarial review round over the combined
   observability, probe, DR, route-identity, CI, accessibility, and bundle diffs.
   The first probe and DR review findings were fixed, but no final combined
   review has accepted this checkpoint.
4. From a clean npm 10 install, run the complete gates: typecheck, lint, full
   Vitest, production build, exact bundle verifier, MapLibre async verifier,
   relevant mobile/desktop/touch Playwright projects, axe projects, Lighthouse,
   and required visual validation.
5. Update Story 13.1 tasks, Dev Agent Record, verification evidence, and file
   list. Use `scripts/story-review.sh` through `scripts/run-sh.ps1` for any review
   transition. Human approval alone moves a reviewed story to done.
6. Commit/PR the finished Story 13.1 code, obtain green protected CI, merge, and
   deploy before collecting final production evidence.
7. Run the production measurement lane across controlled windows until there
   are at least 20 **provider-classified** cold starts. Report cold, prewarmed,
   hot-origin, and edge-hit cohorts separately with raw n/p50/p95; enforce HTTP
   200, 42 unique venues, 61 ordered steps per venue, and the approximately
   five-second uncached-route threshold. Claim endpoint paths only from directly
   observed telemetry.
8. Refresh backup/source metadata, then execute the isolated provider-native
   restore only after fresh user approval at the displayed-cost confirmation.
   Measure recovery time, state actual RPO/RTO, run the complete verifier and
   restored-app smoke matrix, roll back, and verify cleanup. Never overwrite or
   fail over production without a separate fresh approval.
9. Run automated production acceptance and give the user the physical-device
   checklist with exact production URLs, screenshots/reference images, and
   pass/fail questions. Do not create fake production reviews or feedback.
10. Publish the durable launch report with changes, commits/PRs, commands and
    results, production evidence, remaining caveats, and an explicit GO / GO
    WITH CAVEATS / NO-GO recommendation.

Until the security patch, total bundle budget, provider cold-start sample,
isolated restore drill, complete gate suite, and required human device checks
are resolved, the honest interim recommendation is **NO-GO**.

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

- No production deployment was changed by this WIP branch.
- No restore target or paid cloud resource was created.
- No production feedback/review test data was written.
- No task-owned server, browser, watcher, container, WSL process, or other
  long-lived runtime remains active at this checkpoint.
