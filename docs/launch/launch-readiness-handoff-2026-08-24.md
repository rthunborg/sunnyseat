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

1. Complete Epic 14 direct-sun correctness and field-validation gates. Fresh
   complete-overcast input must never produce amber/sunny output; unknown weather
   must stay neutral and geometric percentages must remain qualified clear-sky
   potential. The deterministic matrix, both UI breakpoints, accessibility, and
   an explicit field-evidence false-positive ceiling must pass before release.
2. Authenticate pinned Vercel CLI 59.1.3, import exact provider metrics for
   window 01, and continue the production measurement lane until there
   are at least 20 **provider-classified** cold starts. Report cold, prewarmed,
   hot-origin, and edge-hit cohorts separately with raw n/p50/p95; enforce HTTP
   200, 42 unique venues, 61 ordered steps per venue, and the approximately
   five-second uncached-route threshold. Claim endpoint paths only from directly
   observed telemetry.
3. Resolve production weather scheduling reliability. GitHub's requested
   five-minute schedule has repeatedly exceeded the two-hour freshness TTL.
   Do not extend the TTL. The reviewed narrow direction is a CRON_SECRET-
   authenticated Vercel Pro cron using the existing refresh logic plus a durable
   cross-scheduler lease; configuration and schema/application changes need a
   dedicated reviewed follow-up before activation. Until then, monitor and use
   the protected weather-only manual dispatch when stale.
4. Decide whether to move the Supabase organization off `free` and establish a
   selectable physical backup. Only then can the runbook reach the provider's
   displayed Restore to New Project cost boundary and request fresh approval.
   After approval, measure recovery, run parity and isolated application smoke,
   roll back, and identity-verify cleanup. Never overwrite or fail over
   production without a separate fresh approval.
5. Give the user the physical-device
   checklist with exact production URLs, screenshots/reference images, and
   pass/fail questions. Do not create fake production reviews or feedback.
6. Publish the durable launch report with changes, commits/PRs, commands and
    results, production evidence, remaining caveats, and an explicit GO / GO
    WITH CAVEATS / NO-GO recommendation.

Until direct-sun correctness/field validation, the provider cold-start sample,
reliable weather scheduling, isolated restore drill, and required human device
checks are resolved, the honest
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
# 2026-09-03 Direct-sun correctness addendum

A fresh-data correctness defect was reproduced: complete medium-layer overcast
could be publicly sunny because persisted snapshot cloud math diverged from the
canonical model and the public predicate treated unknown weather as affirmative.
The remediation introduces a conservative `likely/blocked/unknown` direct-sun
verdict; overcast is blocked and missing/expired/legacy-incomplete snapshots are
unknown. This is a separate launch blocker from the documented scheduler gaps.
The two-hour TTL remains unchanged, and public venue reads remain snapshot-only
with zero live Met.no calls. See
[direct-sun truth decision](../../_bmad-output/planning-artifacts/decisions/direct-sun-weather-truth-2026-09-03.md).

Historical verification record (2026-09-03): an independent post-implementation review reported no P0 findings and eight
actionable conformance defects, all corrected in the local Epic 14 fix pass:
positive Nowcast rain now retains its provider time across the hourly forecast
boundary; malformed persisted JSON fails closed on list and detail; contradictory
affirmative DTOs are neutralized; weather provenance/full confidence requires
validated request-relevant evidence; detail-window status comes from its
qualifying run; the UX percentage rule and Epic 12 historical predicate are
explicitly reconciled; and affirmative fixtures are coherent. The approved
product contract did not change, so `bmad-correct-course` was not required and
Epic 12 remains closed. Local verification passes TypeScript, ESLint, 2,153
Vitest tests, the 98-test focused regression set, `git diff --check`, and
Playwright discovery (246 cases/26 files, including the 16-case weather matrix).
Actual browser execution was not claimed because this actor lacked the trusted
resource-guard lifecycle context. Nothing in this fix pass was deployed, and no
production data, schedule, TTL, provider path, schema, secret, or telemetry sink
was changed.

## Direct-sun follow-up conformance — 2026-09-07

The three later review findings are corrected locally: malformed present weather
flags retain timestamped unknown evidence; nonempty/malformed reasons invalidate
likely current/day-series DTOs; and unknown takes precedence over legacy obscured
copy and accessible names on card, list, QuickInfo and detail. Unknown also wins
duplicate/equal-distance weather matches regardless of input order. No ordinary live
producer of contradictory likely reasons was demonstrated; the DTO boundary now
also rejects that corrupt/legacy/future input. Approved intent is unchanged,
`bmad-correct-course` was unnecessary, and Epic 12 remains closed.

Final local TypeScript/lint pass; full Vitest passes 229 files / 2,173 tests;
focused regression passes 8 files / 160 tests. Playwright discovers 248 cases in
26 files, including 18 weather-matrix cases. Discovery is not browser execution:
trusted resource-guard context was unavailable, so browser and screenshot
validation remain unexecuted. See the existing
[bugfix spec](../../_bmad-output/implementation-artifacts/spec-direct-sun-weather-accuracy.md)
for exact commands, per-finding evidence and final diff verification.

Nothing was committed or deployed. This pass changed no production data,
configuration, schedules, schemas, provider integrations, secrets or telemetry.
The signed 90-minute match and two-hour TTL remain unchanged. Direct-sun
correctness/human validation and scheduling reliability remain separate launch
blockers; these local fixes are not release approval.

### Browser continuation checkpoint — 2026-09-07

Browser/server approval is explicit, but execution remains blocked before launch:
this actor received no trusted startup-hook resource-guard context. An explicit
built-in Windows PowerShell 5.1.26100.9168 presence check returned
`ContextVariablePresent: false` (exit 0). Guard installation alone is insufficient.
The exact check and pending matrix command are recorded in the existing
[bugfix spec](../../_bmad-output/implementation-artifacts/spec-direct-sun-weather-accuracy.md#browser-execution-continuation--2026-09-07-blocked-before-launch).

Playwright configuration inspection confirms automatic server startup and
`reuseExistingServer: false`; the runner was not launched. Mobile and desktop
each still have all nine matrix scenarios unexecuted. No card, QuickInfo or detail
screenshots were captured or inspected (no new screenshot paths), no browser
accessibility checks ran, and no automated visual comparison ran. Historical
passing unit/static checks and discovery remain distinct from those open gates.

No application/test defects were corrected in this continuation; only this
handoff and the existing spec changed. Branch `codex/direct-sun-weather-accuracy`
and HEAD `6e493c1` remain the checkpoint. The 36 modified tracked files and two
pre-existing untracked paths are preserved; no commit, deployment or external
service mutation occurred. No owned runtime was started. Guard `CloseActor`/`List`
verification is unavailable without trusted context, so no verified-cleanup claim
is made. Resume after trusted hook injection; renewed approval is unnecessary.

### Hook diagnosis update — 2026-09-07

The locally created guard source has been found. Eight isolated PowerShell
startup cases, a read-only adapter preflight, and four shell-proxy passthrough
tests passed. The actual Codex hook failure has not been reproduced or fixed;
trusted context remains absent. An operator-run diagnostic launcher is prepared
outside the repo to capture the failure stage during a normal Codex launch.
The installed guard and recovered source remain unchanged. See the existing
[bugfix spec](../../_bmad-output/implementation-artifacts/spec-direct-sun-weather-accuracy.md#hook-diagnosis-continuation--2026-09-07)
for commands, diagnostic paths, results and limits.

Browser execution, screenshots, accessibility checks and automated visual
comparison remain pending on both breakpoints. No screenshot paths exist for
this continuation. The deprecated repo feature flag was updated to `hooks`;
the current status is 37 unstaged modified tracked files and the same two
pre-existing untracked paths, with branch/HEAD unchanged. No app code was
changed by this continuation and no server/browser/broker was launched.
Diagnostic subprocesses completed; guard CloseActor/List cannot be verified
without context. Historical test results and both separate launch blockers
remain unchanged.

### Actual browser and screenshot follow-up — 2026-09-08

Trusted context was received by this actor and guarded browser execution is now
complete. The exact app command was:

```powershell
npx playwright test test/e2e/epic-10-weather-matrix.spec.ts --project=mobile --project=desktop
```

From `nextjs-app/`, the runner used fixture venue/sun services, port 43127,
`PLAYWRIGHT_BASE_URL=http://localhost:43127` and
`PLAYWRIGHT_WEB_SERVER_COMMAND=npm run dev -- --hostname localhost --port 43127`.
Playwright owned its automatic server beneath resource-guard. A numeric-loopback
bind initially caused locale redirect loops; matching the bind/origin hostname
resolved them without app routing changes. The final harness fixes the clock,
mocks list/detail and map style, blocks unexpected external requests and waits
for loaded detail plus stable animation bounds.

**Browser:** mobile WebKit 390x664 and desktop Chromium 1280x720 each pass all
nine scenarios: clear, overcast, broken-clouds, precipitation, fog, stale-missing,
incomplete, contradictory, neutralized-legacy-obscured. Final result: 18/18,
exit 0, 1.3 minutes. Legacy-obscured also exercises reduced motion on both.
**Accessibility/browser checks:** 24 WCAG 2.1 A/AA axe scans, zero violations;
unknown accessible names, list focus/target size and headline/control separation
pass. Zero page/console errors and unexpected external browser requests.

**Screenshots:** all 24 final PNGs were opened and inspected: card, QuickInfo and
loaded detail for clear, overcast, ordinary unknown and legacy-obscured unknown
on both breakpoints. They are retained at:
`C:\Users\Rasmus\.codex\visualizations\2026\09\08\01a08266-440b-7fc1-9fcc-18c0be4cc9a1\final-evidence\`.
Filenames are `{mobile|desktop}-{clear|overcast|stale-missing|neutralized-legacy-obscured}-{card|quick-info|detail}.png`;
each has matching `-aria.txt` and `-axe.json`. The existing
[bugfix spec](../../_bmad-output/implementation-artifacts/spec-direct-sun-weather-accuracy.md)
contains the exact filename inventory, execution environment and historical /
intermediate results. These are fixture maps, not live tile-rendering evidence.

Inspection exposed residual amber photo fallbacks for non-likely states and an
unknown detail headline overlapping controls. Both are corrected with existing
tokens, and a resulting 3.06:1 placeholder-caption contrast failure was corrected
with the body-text token. Regression coverage now checks those rendered defects.
Unknown is neutral with Swedish uncertainty and qualified geometry; genuine
blocked states retain obscured treatment and clear remains amber.

TypeScript/lint pass; focused regression passes 8 files / 160 tests; full Vitest
passes 229 files / 2,173 tests. Automated reference comparison is **still open**:
these root commands both exit 1 before capture because ANTHROPIC_API_KEY is absent:

```powershell
.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail '/?venue=test-venue-sunny&_time=13:00' mobile
.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail '/?venue=test-venue-sunny&_time=13:00' desktop
```

No reference or capture recipe was replaced, no rebaseline/manual waiver was
made, and no review/release approval is implied. Physical-device, field accuracy,
production-build budgets and scheduling reliability are not established by this
run. The dev `_time` detail gate still requires a forced time distinct from
live-now in this harness; no production routing change was made for it.

Cleanup is guard-verified: every exact runner stopped; CloseActor verified;
List revision 53 verified all ten owned records stopped, zero active/unresolved
resources and no leases. No user-owned resources were stopped. Branch/HEAD remain
`codex/direct-sun-weather-accuracy` / `6e493c1`. This session layered changes onto
six already-dirty files (three venue components, weather-matrix E2E, existing spec
and this handoff); the other 31 dirty tracked files and both pre-existing
untracked paths are preserved. No commit, deployment or production mutation.
The two-hour TTL and signed 90-minute match are unchanged. Direct-sun field
correctness and scheduling remain separate launch blockers; Epic 12 stays closed.

Final repository verification: git diff --check PASS (exit 0; CRLF-to-LF warnings only). Branch codex/direct-sun-weather-accuracy, HEAD 6e493c1e073cb0e08012d6773f05125055de4142; 37 unstaged modified tracked files, zero staged changes, and the same two untouched pre-existing untracked paths.

## Manual visual acceptance and production release — 2026-09-09

Rasmus explicitly approved all new fixes, requested skipping the Anthropic API
key, and authorized proceeding with production deployment. This supersedes the
previous no-deployment instruction for this approved bugfix release. It does not
claim that scheduling reliability, field accuracy, or other launch evidence is
complete. No commit, schema, schedule, provider configuration, secret or telemetry
change is authorized or performed as part of this release.

Manual visual acceptance is based on the previously inspected 24 screenshots,
18 executed weather-matrix cases and 24 clean axe scans recorded above. The
rationale is the approved neutral unknown presentation, preserved qualified
clear-sky potential, corrected detail overlap and contrast, and retained genuine
blocked treatment. No reference PNG or capture recipe was replaced.

Both manual wrapper invocations exited 0 with process-local
`VISUAL_VALIDATE_PROVIDER=none` and `ALLOW_MANUAL_VISUAL_VALIDATION=1`:

```powershell
.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail '/?venue=test-venue-sunny&_time=13:00' mobile
.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail '/?venue=test-venue-sunny&_time=13:00' desktop
```

This is explicit human acceptance, **not automated visual comparison**. The
Anthropic comparison remains unexecuted by user choice.

Fresh release checks, run from `nextjs-app/`, all exited 0:

- `npm run build` — Next.js 16.3.3 production build, including TypeScript.
- `npm run bundle:verify` — initial 231.37/280 KiB, MapLibre-loaded
  298.85/320 KiB, all emitted static JS 599.04/600 KiB (gzip).
- `node scripts/verify-maplibre-async.mjs` — async boundary passes across
  15 route manifests.

Existing final TypeScript, lint, full Vitest and browser evidence from September 8
remains applicable: no application/test source changed during this release turn.
Build emitted only the existing external `C:\DEV\pnpm-lock.yaml` warning; no
workspace/root configuration was changed. Local Node was 22.23.2; the existing
Vercel project uses Node 24.x.

Production before this release was `dpl_E4JHngr8SDe2RDk6MjWXM86GeqEz`, READY in
`dub1`, built from `16dea3bd4529b60e793e33b52e67e698af924fd2`. That commit was
verified as an ancestor of the current HEAD. The linked target is the existing
`enhancior/sunnyseat` project, with root directory `nextjs-app`.

### Actual deployment outcome

Final production deployment: `dpl_8mFMnsRMTaFcA4XYhcQ8cvYim88R`, **READY**, runtime
region **dub1**, aliases `https://sunnyseat.vercel.app` and
`https://sunnyseat-enhancior.vercel.app`. Immutable deployment URL:
`https://sunnyseat-8p7yk32ic-enhancior.vercel.app`.

The first CLI deployment (`dpl_YXWPqBpKW2HmEf5zEkgrUhucEuBN`) unexpectedly used
`iad1` despite the nested app configuration. Post-deploy inspection caught this;
the same source was redeployed with explicit `--regions dub1`, restoring the
required Dublin placement. No repository or project region setting was edited.
The superseded deployment remains in Vercel history.

Release evidence directory:
`C:\Users\Rasmus\.codex\visualizations\2026\09\08\01a08266-440b-7fc1-9fcc-18c0be4cc9a1\release-2026-09-09`.
Its `source/` contains 747 tracked application files copied byte-for-byte from the
approved dirty working tree, preserving the `nextjs-app/` layout and existing
project link. Local secrets, ignored files and both pre-existing untracked paths
were excluded. `source-manifest.json` records SHA-256 for every copied application
file; all 747 hashes were rechecked against the working tree. This is a retained
release artifact, not a new source of product intent. No commit was created.

Exact final deploy command, invoked from `C:\DEV\sunnyseat\nextjs-app` with
`$releaseRoot` set to the evidence directory above:

```powershell
npx --yes vercel@59.1.3 deploy "$releaseRoot\source" --prod --yes --scope enhancior --regions dub1 --meta sunnyseatSourceHead=6e493c1e073cb0e08012d6773f05125055de4142 --meta sunnyseatDirtyWorkingTree=true
```

Both deployment commands exited 0. The first command was identical except for
omitting `--regions dub1`; logs are `deploy.log` and `deploy-dub1.log`.
Final cloud build completed in 16 seconds. Read-only HTTP smoke checks passed for
`/`, `/sv/about`, `/api/venues?lat=57.7089&lng=11.9746&radiusKm=3`, and
`/api/venues/tyska-bron`. All returned 200; both APIs returned the exact final
deployment ID, and response region headers included `dub1`. The list returned
42 venues: 26 blocked, 16 unknown, zero likely. Evidence: `smoke-final.json`.
No production writes or live provider requests were deliberately triggered;
public requests exercised the existing snapshot-only route. These HTTP checks do
not establish field accuracy or constitute a new production browser/screenshot run.

The final connector error-log query timed out. A bounded CLI retry exited 0 with
no error entries returned:

```powershell
npx --yes vercel@59.1.3 logs dpl_8mFMnsRMTaFcA4XYhcQ8cvYim88R --environment production --level error --since 5m --limit 20 --json --no-follow
```

This is a short post-deploy sample, not sustained monitoring. Output is preserved
in `runtime-errors.log`; monitoring configuration was not changed.

### Newly observed dependency audit failure — remains open

During the remote build npm reported dependency advisories. The subsequent
`npm audit --omit=dev --audit-level=high --json` exited **1**, reporting one
critical MapLibre advisory and one high-severity sharp advisory. Evidence:
`production-audit.json`. Package manifests and lockfiles are unchanged from HEAD,
so these were pre-existing dependencies, not introduced by the direct-sun fixes.
The audit failure became known while the first deployment was building; it was
not a passed pre-deploy gate and is not waived by visual acceptance.

- MapLibre: https://github.com/advisories/GHSA-jrc7-96c5-q579 — attribution HTML
  sanitization issue; the advisory lists 6.4.1 as patched. The current 5.x
  dependency is reported affected; a major upgrade or mitigation needs explicit
  implementation and regression testing.
- sharp: https://github.com/advisories/GHSA-rgj7-g3m4-5g8c — libheif advisory,
  reported affected below 0.35.4.

No dependency upgrade or exploitability clearance was performed. These findings
require follow-up before claiming full production readiness, alongside existing
scheduling and field/device validation gaps. The approved direct-sun bugfix is
live; this is not an all-clear for launch.

### Final working tree and lifecycle

Only the existing spec and launch handoff were edited in this release turn. No
application/test source, dependencies, schema, schedule, provider configuration,
secrets or telemetry configuration changed. Branch remains
`codex/direct-sun-weather-accuracy`, HEAD
`6e493c1e073cb0e08012d6773f05125055de4142`, with 37 unstaged tracked modifications,
zero staged changes and the same two pre-existing untracked paths. The live source
includes uncommitted fixes; a future Git deployment must include those fixes to
avoid overwriting them.

This actor received its own trusted lifecycle context. All local commands were
bounded foreground work; no managed server/browser was launched in this turn.
The first cleanup helper invocation failed at PowerShell pipeline binding before
issuing an operation. Retrying through the external built-in Windows PowerShell
5.1 executable with JSON stdin succeeded: `CloseActor` verified, then `List`
verified with **zero active owned resources**. The context-bearing helper was
removed after verification. Final `git diff --check` passed.

## Git reconciliation authorization — 2026-09-09

Rasmus explicitly authorized committing and merging the relevant production work,
then switching to main. The release changes are being reconciled through a PR;
this supersedes earlier no-commit/no-merge constraints. The unrelated local
`.codex/config.toml` hook-key change and the two protected pre-existing untracked
paths remain outside this commit. No sprint-status transition is made.

Application source remains identical to the deployed, SHA-256-recorded release.
The prior successful TypeScript, lint, full Vitest, 18-case browser matrix,
24 screenshot inspections and axe scans, manual visual approval, production
build and bundle checks remain the evidence for these unchanged fixes. The
known production dependency audit failure is not waived; PR CI will determine
whether the normal merge checks pass. Security dependency remediation remains
separate from the approved direct-sun patch until scoped and verified.

## Security dependency remediation and browser checkpoint — 2026-09-09

Rasmus authorized fixing the dependency audit blockers, committing and merging
production-relevant work. This checkpoint supersedes the open dependency finding
above; it does not waive scheduling reliability or field/device launch blockers.

MapLibre is pinned to 6.4.1 (GHSA-jrc7-96c5-q579 patched); the lockfile resolves
sharp 0.35.4 (GHSA-rgj7-g3m4-5g8c patched). MapLibre 6 requires native ESM and a
module worker. A build-time esbuild/Terser step prepares versioned same-origin
modules with shared code and a SHA-256 manifest. The map remains asynchronously
loaded. No external CDN or provider call is needed to prepare these modules.
The bundle gate now counts public JavaScript and .mjs/.cjs as well as .js, and
checks the prepared module hashes; budgets were not increased. Active stack
references were updated, preserving historical architecture review text.

Execution exposed two defects corrected in this patch: the old bundle verifier
omitted .mjs/public JavaScript, and locale routing treated .mjs URLs as pages.
Both have deterministic regression coverage. A browser security regression also
renders fixture geometry through the real local worker and verifies removal of
consecutive malicious attribution event attributes. No design tokens, Swedish
copy, direct-sun rules, weather matching boundaries, schedules or data changed.

Commands run from `nextjs-app/`:

```powershell
npm install --save-exact maplibre-gl@6.4.1 --no-audit
npm update sharp --no-audit
npm install --save-dev --save-exact terser@5.44.1 --no-audit
npx tsc --noEmit
npx eslint . --quiet
npm audit --omit=dev
npm run build
node scripts/verify-js-budgets.mjs
node scripts/verify-maplibre-async.mjs
npx vitest run
npx playwright test test/e2e/epic-10-weather-matrix.spec.ts test/e2e/maplibre-security.spec.ts --project=mobile --project=desktop --output C:\Users\Rasmus\.codex\visualizations\2026\09\08\01a08266-440b-7fc1-9fcc-18c0be4cc9a1\release-2026-09-09\dependency-browser
```

Final TypeScript, lint, production build and async-boundary checks passed.
Production dependency audit: **zero vulnerabilities**. Full isolated Vitest:
**229 files, 2,174 tests passed**. An earlier full run overlapped a build and timed
out in one geometry precompute test; the isolated full rerun passed without
altering that test or its timeout. Native sharp AVIF encode/decode also passed
for a generated 2x2 image (sharp 0.35.4, libheif 1.23.2).

Complete gzip accounting: **231.44 KiB initial, 300.84 KiB MapLibre-loaded,
599.46 KiB total emitted/public JavaScript**, within unchanged 280/320/600 KiB
limits. Headroom is small and remains enforced in CI.

Actual browser execution: **20 passed** — all nine weather scenarios on both
mobile (WebKit/iPhone 14) and desktop (Chromium), plus the security test on each.
The approved runner and its automatic webServer/browser descendants were started
through resource-guard with this actor's trusted context. Local fixture engines,
mocked venue/list/detail responses, and a mocked style/GeoJSON source avoided
production services and live Met.no. The first browser attempt exposed the .mjs
routing failure; the complete rerun passed after the narrow matcher correction.

Evidence root:
`C:\Users\Rasmus\.codex\visualizations\2026\09\08\01a08266-440b-7fc1-9fcc-18c0be4cc9a1\release-2026-09-09`.
`dependency-browser.log` and `dependency-browser-exit.txt` record the final run;
`dependency-vitest-final.log` records the full passing unit run.

`dependency-browser/` contains **26 screenshots**: the weather matrix's 24
card/QuickInfo/detail captures and two map-security captures. This checkpoint
visually inspected **eight**: both breakpoint security captures, both
`neutralized-legacy-obscured-detail.png`, both `clear-card.png`, and both
`overcast-quick-info.png`. Unknown detail remained visually neutral with qualified
clear-sky potential; clear cards retained affirmative treatment and genuinely
blocked QuickInfo retained obscured treatment. All 24 matrix axe JSON artifacts
contain empty violation arrays, and the scenario accessible-name assertions
passed. The earlier complete 24-image inspection remains historical evidence.
Automated reference comparison was **not run**: the user's explicit manual visual
acceptance and instruction to skip the Anthropic API remain in effect. No
reference replacement or rebaseline occurred.

Both owned browser-runner resources were stopped with verified results.
Actor-scoped `CloseActor` then `List` through Windows PowerShell 5.1 returned
verified cleanup and **zero active owned resources**. `git diff --check` passed.
The unrelated `.codex/config.toml` change and both protected untracked paths stay
outside the security commit. PR #29 CI and the subsequent main deployment must
confirm the remote outcome; no claim of their completion is made at this local
checkpoint.
