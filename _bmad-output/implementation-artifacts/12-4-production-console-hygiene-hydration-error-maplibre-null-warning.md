---
baseline_commit: 1882e290a573f054028dd84ec201bbbe675542de
---

# Story 12.4: Production Console Hygiene - Hydration Error + MapLibre Null Warning

Status: in-progress

## Story

As a **maintainer verifying the live app**,
I want the production console free of app-originated errors,
so that genuine runtime errors are not buried and the production session is trustworthy.

## Source Context (Verbatim From Epic)

_Context (2026-07-08, first real-venue prod session):_ the live app's console shows
two app-originated errors (separate from the extension noise —
`contentscript.js`/MaxListeners/ObjectMultiplex are the user's browser extensions,
NOT ours, and are out of scope). Both are non-blocking (the map + venues render),
but an error-free console is the baseline for trusting the prod session and for a
console-error CI guard.

1. **`Uncaught Error: Minified React error #418`** (hydration text mismatch —
   server-rendered HTML ≠ first client render). Almost certainly a wall-clock/`new
   Date()`-derived value rendered during SSR that differs by the time the client
   hydrates: candidates carry `new Date()`/`toLocale`/`Intl` in render —
   `components/custom/time/TimeSliderPanel.tsx`,
   `components/composed/venue/VenueDetailContent.tsx`, `components/custom/map/MapView.tsx`
   (`quickInfoOpeningHours` derives "Öppet till HH:MM" from `new Date()`). This is the
   same class as the pre-existing `TimeProvider` initial-`new Date()` hydration note.
   (NOT `TimeSlider.tsx` — it documents "never reads `new Date()`", `TimeSlider.tsx:26`,
   so it is the deliberately-clean controlled child, not a suspect.)
2. **`Expected value to be of type number, but found null` ×3** (MapLibre style
   validation). PRIME SUSPECT IS APP-ORIGIN: `MapView.tsx:723-729` documents this EXACT
   warning text — `mapInstance.project([null, null])` when a selected venue carries
   null/non-finite coordinates (the `?venue=` deep-link selects without a location check),
   firing once on the effect run + again on every move/zoom, matching the observed ×3.
   Story 9.10 added a guard for precisely this, so a live recurrence means the guard
   REGRESSED or another projection/easeTo path is unguarded. Secondary hypothesis only:
   the upstream positron style (the app authors no numeric style expression — pins are DOM
   `maplibregl.Marker`s, the recolour sets only color strings). Cosmetic (map renders),
   but noisy.

## Acceptance Criteria (Verbatim From Epic)

**Given** React error #418 (hydration mismatch) fires on load of the live map
**When** the mismatching node is found (reproduce with a NON-minified/dev build to
get the readable message + component stack, then fix the root cause — render the
time-derived value only after mount, or seed server + client from one stable value,
NOT by blanket `suppressHydrationWarning`)
**Then** a cold load of `/` (map) and a venue detail produce ZERO React hydration
errors in the console, and the fix names the offending component + value in the
story record

**Given** the MapLibre `Expected value to be of type number, but found null` warning
fires ×3 — and the repo DOCUMENTS this exact warning as app-origin
(`mapInstance.project([null, null])` on a null-coordinate selected venue,
`MapView.tsx:723-729`, guarded by Story 9.10)
**When** the source is identified — inspecting the APP paths FIRST: has the 9.10 guard
regressed, is another selected-venue projection/`easeTo`/anchor path unguarded, and does a
live venue row actually carry null/non-finite coordinates (that would be a DATA bug worth
fixing at the source too)? Only if the warning still reproduces with verified-finite
coordinates and no app projection in the stack may it be attributed to the upstream
positron style (diff the style before/after our `setPaintProperty` pass to confirm)
**Then** it is resolved by the lever matching its PROVEN source: fix/guard the app
projection path (and any null-coordinate data), or — only with the upstream attribution
evidenced — fork/patch the style layer or document it as the explicitly-named third-party
allow-list entry per AC3. Never allow-list first and investigate later (that would bless
our own bug as third-party noise)

**Given** there is currently NO automated console-error guard (grep of `test/e2e`
finds no `console`/`pageerror` listener)
**When** the two errors are fixed
**Then** a Playwright spec (via `page.on('console')` + `pageerror`) asserts a cold map
load and a venue-detail open emit no app-origin console messages at level **error OR
warning** — catching the MapLibre "Expected value…" message even if it surfaces as a
`console.warn` (not only `console.error`), UNLESS Story-12.4 AC2 has confirmed it is an
upstream positron-style warning, in which case it is an EXPLICITLY-documented third-party
allow-list entry (a named, justified exception — never a silent blanket skip), plus React
`pageerror`s; an allowlist may exclude known third-party/extension noise, but NOT React or
our-own-code MapLibre app-origin
errors/warnings — so a future regression re-breaks the build

## Design Gate Criteria

- **Visual:** None — console/correctness only; the map + venues render identically
- **Behaviour:** No hydration-driven remount/flicker on first paint; time-derived
  labels ("Öppet till HH:MM") still render correctly for the current Stockholm weekday
- **Animation:** None
- **Visual validation:** Screenshot comparison of the map + venue detail against the
  current baseline must pass before review — a console-only fix must not move pixels

## Completed Probe Findings (Tier A)

These findings refine the implementation plan below. The Source Context and Acceptance
Criteria remain verbatim because they are the story contract, but the implementation should
start from these completed probes rather than reopening broad speculation.

- Baseline for this story context is Tier A entry
  `1882e290a573f054028dd84ec201bbbe675542de`.
- React #418 is proven structural in `OnboardingGate`: the server emitted the inline
  onboarding wrapper, while the first client render switched to a body portal created by the
  `usePortalTarget()` `useState` initializer. The readable React hydration diff was captured
  and shows this topology mismatch. The inherited working-tree diff changes comments and
  cleanup behavior only; it does not fix the first-render topology.
- The hydration fix must preserve the early-click/no-remount behavior: first-time users must
  still get the onboarding blocker without a dead-click window, returning users must still
  bypass it cleanly, and the app shell must not visibly remount or flicker.
- `TimeContext` is already stable-seeded for SSR and first client render. The probed
  `TimeSliderPanel`, `MapView`, and `VenueDetailContent` render behind
  `MapViewDynamic` with `ssr: false`, so their current `new Date()` calls are not the
  proven hydration source. Do not change those modules as a hydration fix unless fresh
  evidence contradicts this probe.
- The exact MapLibre warning is proven upstream Positron style-expression noise, not a
  SunnySeat coordinate path. The three layers are `highway-shield-non-us`,
  `highway-shield-us-interstate`, and `road_shield_us`; each numerically compares a missing
  or null `ref_length` property. The warnings occur on an unselected cold map. The installed
  MapLibre build converts `[null, null]` to `(0, 0)`, SunnySeat's recolor pass changes only
  color strings, and selected projection/easeTo/pin/store finite guards remain intact.
- Implementation should revalidate those probe conclusions, then either use the AC-permitted
  exact, source-attributed third-party exception in the console guard or apply a narrowly
  justified Positron style patch. Do not add a blanket MapLibre allow-list. Keep unrelated
  geolocation hardening out of scope unless new evidence connects it to this warning.

## Post-Dev Scope Addendum (2026-07-25)

- The React #418 fix is the `OnboardingGate`/`OnboardingScreen` topology change only. The
  final implementation uses a layout-owned route frame: onboarding-scoped routes render the
  app shell and onboarding gate as stable siblings, with no runtime body host move. App-shell
  `aria-hidden`/`inert` shielding applies while the direct sibling gate is visible.
- `TimeContext` work is separate request hygiene, not the #418 root cause: canonical
  dev/preview `_time` routes emitted a stale hydration-seed
  `/api/venues?...date=2026-05-20&time=...` 400 before the client clock resolved to
  2026-07-25. The scope is limited to suppressing forced planner params until the first
  client clock pass, then emitting the current Stockholm client-clock date/time.
- The reduced-motion-related `OnboardingScreen` `initial` hardening is secondary hydration
  hardening; it is not the primary offending value from the captured #418 diff.

## Tasks / Subtasks

- [x] Baseline and revalidate the completed probes before editing app code.
  - [x] From `nextjs-app/`, run `npx tsc --noEmit` and `npx eslint . --quiet` before code
        changes. Stop and surface unrelated failures rather than hiding them.
  - [x] Confirm the working baseline is
        `1882e290a573f054028dd84ec201bbbe675542de` and record any newer local changes that
        affect this story.
  - [x] Revalidate the readable React hydration diff for `OnboardingGate`: server inline
        inert wrapper versus first-client body portal from the `useState` portal-target
        initializer.
  - [x] Revalidate the MapLibre warning source: unselected cold map, upstream Positron
        `ref_length` numeric comparisons in `highway-shield-non-us`,
        `highway-shield-us-interstate`, and `road_shield_us`, with SunnySeat app coordinate
        guards still intact.
  - [x] Run browser probes with isolated Playwright server ownership. Use `CI=1`
        or explicit `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_PORT`, and
        `PLAYWRIGHT_WEB_SERVER_COMMAND` so Playwright does not reuse an unrelated
        localhost:3000 server.
  - [x] Cover at minimum cold `/`, canonical desktop `/?_time=16:30`, canonical mobile
        `/?_time=14:00`, and venue detail
        `/?venue=test-venue-sunny&_state=venue-detail&_time=16:30` /
        `/?venue=test-venue-sunny&_state=venue-detail&_time=14:00`.
  - [x] Record the exact offending component/value in this story's Dev Agent Record. Remove
        any temporary diagnostic logging before completion.

- [x] Fix the React hydration mismatch at its source.
  - [x] Inspect and own the inherited working-tree candidate in
        `nextjs-app/components/custom/onboarding/OnboardingGate.tsx` first. Story 12.9
        explicitly deferred this file's hydration warning to Story 12.4.
  - [x] Fix the proven topology mismatch: server inline inert wrapper versus first-client
        body portal from the `usePortalTarget()` `useState` initializer.
  - [x] Fix any `OnboardingGate` mismatch without breaking the first-visit overlay,
        returning-user bypass, forced-state bypass, focus behavior, `aria-hidden`/`inert`
        app-shell shielding, early-click/no-remount behavior, or visual-validation state
        forcing.
  - [x] Do not make time/MapView opening-hours edits as the hydration fix. `TimeContext` is
        stable-seeded, and `TimeSliderPanel`, `MapView`, and `VenueDetailContent` are
        client-only behind `MapViewDynamic ssr:false` in the completed probes. Investigate
        or change their `new Date()` calls only if fresh evidence contradicts the probe.
  - [x] Do not add blanket `suppressHydrationWarning`, `@ts-ignore`, or client-only shims
        that hide a real mismatch.
  - [x] Confirm time-derived labels still use the correct Stockholm weekday and intended
        selected/current time after hydration.

- [x] Revalidate and handle the proven upstream Positron MapLibre warning.
  - [x] Reconfirm the warning occurs on an unselected cold map and maps to the three Positron
        layers `highway-shield-non-us`, `highway-shield-us-interstate`, and `road_shield_us`
        comparing missing/null `ref_length` numerically.
  - [x] Reconfirm SunnySeat's selected projection/easeTo/pin/store finite guards remain
        intact, and that the installed MapLibre behavior converts `[null, null]` to `(0, 0)`
        rather than producing this exact style-expression warning.
  - [x] Choose the smallest compliant lever: either an exact, source-attributed third-party
        exception in the console guard, as permitted by AC3 after AC2 proof, or a narrowly
        justified Positron style patch.
  - [x] Do not add a blanket MapLibre allow-list, and do not expand into unrelated
        geolocation hardening unless new evidence connects geolocation to this exact
        warning.

- [x] Add an automated console/page-error hygiene guard.
  - [x] Add a focused Playwright spec, for example
        `nextjs-app/test/e2e/story-12-4-console-hygiene.spec.ts`.
  - [x] Install `page.on('console')` and `page.on('pageerror')` listeners before navigation.
        Fail on app-origin console `error`, app-origin console `warning`, and any page error.
  - [x] Exercise the first-user cold `/` path and venue-detail open across the normal mobile
        and desktop Playwright projects. The listeners must be registered before navigation.
  - [x] Keep allow-lists exact and narrow. Browser-extension or third-party noise may be
        allowed only with source evidence. React hydration output and app-origin MapLibre
        validation output must fail the test; the proven Positron warning may be excepted
        only by exact layer/message/source attribution or removed by a style patch.
  - [x] Ensure the test is actually invoked by the repo's Playwright project selection and is
        non-vacuous. Do not rely on a dormant-green guard.

- [x] Handle the separate TimeContext forced-route stale-seed request issue.
  - [x] Reproduce the canonical `_time` route stale request as a pre-client-clock
        `/api/venues?...date=2026-05-20&time=...` 400.
  - [x] Suppress forced planner query params until the first client clock pass resolves.
  - [x] Cover both no-query pre-client render and mounted forced-session current-date query
        behavior in `TimeContext` tests.

- [ ] Regression, visual, and completion gates.
  - [x] Add the smallest red unit/component test for the proven hydration bug: a real
        `hydrateRoot` test around `OnboardingGate` that fails on the server inline wrapper
        versus first-client portal topology before the fix.
  - [x] Run relevant onboarding E2E coverage if `OnboardingGate` changes.
  - [x] Run existing MapLibre null-coordinate guard tests only if fresh evidence requires
        touching `MapView` or coordinate paths.
  - [x] Run required repo gates from `nextjs-app/`: `npx tsc --noEmit`,
        `npx eslint . --quiet`, `npx vitest run`, and the focused Playwright console-hygiene
        spec. Run broader Playwright projects if the implementation changes shared UI
        contracts or helpers.
        Post-dev audit status: final required gates passed: typecheck, lint, full Vitest,
        focused console-hygiene Playwright, full onboarding Playwright matrix, and targeted
        onboarding stress coverage.
  - [x] If MapLibre import boundaries change, run the async-boundary verifier before review
        and keep the MapLibre dynamic chunk discipline intact.
  - [ ] If rendered UI changes, run the visual validation wrapper from the repo root:
        `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-primary / mobile`,
        `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-primary / desktop`,
        `.\scripts\run-sh.ps1 scripts/visual-validate.sh venue-detail /?venue=test-venue-sunny mobile`,
        and the corresponding desktop detail route with the canonical `_time` query. Record
        exact results and do not self-approve any rebaseline.
        Post-dev audit status: pending; not waived and no rebaseline claimed.
  - [ ] Move the story to review only through the canonical story-review gate. Do not edit
        `_bmad-output/implementation-artifacts/sprint-status.yaml` directly.
        Delegate note: story-review gate intentionally not run by orchestrator instruction;
        sprint status was not edited.

## Dev Notes

### Architecture And Requirements

- `project-context.md` makes `E12-AD-13` the adopted operational gate for this story:
  Playwright must listen to `console` and `pageerror` on supported cold map/detail flows and
  fail on every app-origin error or warning. Any third-party warning exception must name the
  exact message/source and evidence; no blanket MapLibre allow-list.
- `prd.md` NFR39 requires supported cold map and venue-detail flows to produce no
  app-origin React errors or MapLibre warnings. Third-party warning allow-lists must be
  explicit, narrow, and attributed.
- Hydration mismatches must be fixed at source rather than suppressed. The React docs for
  `hydrateRoot` require the first client render to match server output. The completed probe
  identifies this story's source as `OnboardingGate` first-render structure, not
  `TimeContext` or MapView-owned time labels.
- Tests must not make live Met.no, Google, or other provider calls. The existing test setup
  blocks those domains; keep this story local and deterministic.
- Client components must keep using API/hooks boundaries. Do not import backend engine
  modules from client code.
- No database/schema/API-contract work is expected. The completed probes did not find invalid
  venue coordinate data as the source of the exact MapLibre warning.

### Current Code Intelligence

- `nextjs-app/lib/contexts/TimeContext.tsx` already has a hydration-safe initial clock:
  `HYDRATION_SAFE_NOW_ISO` seeds SSR and first client render, then an effect advances to the
  real injected `clock()`. The completed probe found this stable seed intact.
- `nextjs-app/components/custom/time/TimeSliderPanel.tsx`,
  `nextjs-app/components/custom/map/MapView.tsx`, and
  `nextjs-app/components/composed/venue/VenueDetailContent.tsx` remain worth knowing about
  because the epic named their `new Date()`/opening-hours paths, but the probe shows they
  are client-only behind `MapViewDynamic` with `ssr: false`. They are not the proven React
  #418 source. Do not edit them for hydration unless a fresh readable React stack or diff
  points there.
- `nextjs-app/components/custom/onboarding/OnboardingGate.tsx` is the proven hydration
  source: server output contains the inline inert onboarding wrapper, while the first client
  render creates a body portal target in the `usePortalTarget()` `useState` initializer and
  changes the tree topology before hydration completes.
- `nextjs-app/components/custom/map/MapView.tsx` has the Story 9.10 quick-info guard around
  the selected-venue projection path: it checks `hasValidVenueLocation(selectedVenueDto)`
  before calling `mapInstance.project([lng, lat])`, and `hasValidVenueLocation` uses
  `Number.isFinite` for both coordinates. Completed probes found this guard intact.
- `nextjs-app/lib/utils/venue-pin-mapping.ts` filters invalid venue locations before pin
  data reaches `VenuePinLayer`.
- `nextjs-app/components/custom/map/VenuePinLayer.tsx` relies on already-filtered pin data
  before calling `marker.setLngLat([venue.lng, venue.lat])`.
- `nextjs-app/components/custom/map/UserLocationLayer.tsx` and
  `nextjs-app/components/custom/map/MapControls.tsx` still have deferred geolocation
  hardening opportunities, but the completed probes do not connect them to this warning.
  Keep them out of scope unless new evidence directly implicates geolocation.
- `nextjs-app/components/custom/map/MapContainer.tsx` applies token-mapped basemap paint
  overrides through `applyBasemapColorOverridesToMap`; SunnySeat does not author numeric
  style expressions there. Completed probes found the warnings in upstream Positron shield
  layers, while SunnySeat recolor changes only color strings.
- The exact upstream Positron layers identified by probe are `highway-shield-non-us`,
  `highway-shield-us-interstate`, and `road_shield_us`. Each compares missing/null
  `ref_length` numerically and can warn on an unselected cold map.
- Existing component tests in `nextjs-app/test/components/MapView.test.tsx` cover the
  Story 9.10 null-coordinate warning guard. They should remain passing, but do not make them
  central to this story unless new evidence requires `MapView` changes.
- Existing `nextjs-app/test/e2e/onboarding.spec.ts` covers first-visit and returning-user
  onboarding behavior. It is relevant if `OnboardingGate` changes.
- At story creation, no generic E2E console/pageerror guard exists under `nextjs-app/test/e2e`.
  This story must add one rather than relying on manual production inspection.

### Inherited Working-Tree Candidate Work

- `nextjs-app/components/custom/onboarding/OnboardingGate.tsx` already contains uncommitted
  candidate work inherited into Story 12.4. Story 12.9 explicitly recorded that it did not
  edit or claim this file and that inherited onboarding hydration warnings remain deferred
  to Story 12.4.
- Current candidate details to inspect:
  - `useSyncExternalStore` reads the localStorage onboarding flag with a server snapshot of
    `false`.
  - `usePortalTarget()` uses a `useState` initializer that creates and appends a body portal
    target during the first client render when `document` exists.
  - The captured readable React diff proves the first-user structural mismatch: server inline
    inert wrapper versus first-client body portal.
  - Returning-user behavior still needs regression coverage because localStorage bypass must
    remain clean after the structural fix.
- The current inherited diff changes comments and cleanup behavior only. It does not fix the
  first-render topology that triggers React #418.
- Do not blindly revert this file. Treat it as pre-existing candidate work that Story 12.4
  must either complete, replace, or explicitly document as not the root cause.

### Previous Story Intelligence

- Story 12.3 moved day-series compute/weather behavior toward persisted production-ready
  paths. Do not reintroduce request-path provider calls, cold shadow-compute behavior, or
  broad provider side effects while adding console guards.
- Story 12.9 explicitly deferred the `OnboardingGate` hydration warning to Story 12.4 and
  noted a desktop `pageError` hydration mismatch on canonical `/?_time=16:30`. Use that as
  a concrete reproduction lane.
- Story 12.9 also rebaselined mobile map/sheet references on 2026-07-24 with human approval.
  Current visual comparisons should use those references; do not assume pre-12.9 sheet or
  slider geometry.
- Story 12.13 and Story 12.6 changed visible confidence/pin semantics. This story should not
  restore old confidence or pin copy while touching `MapView` or venue overlays.

### Epic 11 Retro Lessons Applied

- When rendered strings or UI hydration behavior changes, run E2E coverage as well as unit
  or component tests. A typecheck plus Vitest-only pass is not enough for this story.
- Audit that the new console guard is wired into Playwright execution and fails for a known
  synthetic warning/error during development, or otherwise prove it is non-vacuous.
- Re-check file/line references close to implementation handoff; line numbers in this story
  are current at story creation but should not be trusted after edits.
- Do not self-bless visual or live-production evidence. Record whether visual validation was
  automated, manual, unavailable, or explicitly human-accepted.
- Do not fabricate test counts, production evidence, or physical-device evidence. Derive
  counts from actual tool output.

### Deferred Work Context To Preserve

- If touching `OnboardingGate`, consider the existing deferred note about cross-tab dismissal
  effect/session-sticky behavior and close it only if the implementation genuinely resolves
  it.
- If touching `UserLocationLayer` or geolocation coordinates, consider closing the deferred
  finite-coordinate/stale-marker cleanup item. The completed probes do not connect it to the
  exact Story 12.4 warning; do not expand into it unless new evidence makes it relevant.
- If touching `MapContainer`, preserve accessibility around inert/aria-hidden failed-map
  state and consider the existing deferred `inert` without `aria-hidden` note.
- If touching MapLibre imports, preserve the dynamic import boundary and performance budget.
  Existing deferred work notes flag top-level `maplibre-gl` imports as an async-chunk concern.

### Current External API / Library Notes

- React hydration: the server HTML and first client render must produce the same output.
  `suppressHydrationWarning` is an escape hatch only and should not be used as a blanket fix.
  `useSyncExternalStore` can avoid mismatches only when the server snapshot and hydration
  snapshot represent the same initial value.
- Playwright: use event listeners before navigation:
  `page.on('console', message => ...)` and `page.on('pageerror', error => ...)`. Inspect
  `message.type()` and `message.text()` and report enough source detail to make failures
  actionable.
- MapLibre: coordinate APIs expect finite WGS84 longitude/latitude values, usually
  `[lng, lat]`. Existing app coordinate guards should stay intact, but the completed probe
  attributes this story's exact warning to upstream Positron style expressions, not
  SunnySeat coordinate calls.

## Project Structure Notes

- Repository root is `C:\Users\Rasmus\sunnyseat`; the Next.js app root is
  `C:\Users\Rasmus\sunnyseat\nextjs-app`.
- Run app commands from `nextjs-app/`.
- On Windows/PowerShell, invoke repo shell scripts through the wrapper, for example:
  `.\scripts\run-sh.ps1 scripts/story-review.sh 12-4-production-console-hygiene-hydration-error-maplibre-null-warning`.
- Do not edit `_bmad-output/implementation-artifacts/sprint-status.yaml` directly. The
  current sprint-status entry for this story is `backlog` at story creation; it should move
  only through the canonical story-review gate after implementation and verification.

## Expected File Impact

- Likely implementation files:
  - `nextjs-app/components/custom/onboarding/OnboardingGate.tsx`
  - `nextjs-app/components/custom/onboarding/OnboardingScreen.tsx`
  - `nextjs-app/lib/contexts/TimeContext.tsx` only for the separate canonical `_time`
    stale hydration-seed request fix described in the post-dev scope addendum; not as the
    React #418 hydration root cause
  - A focused Positron style-wrapper/config location or console-hygiene helper only if the
    implementation chooses a style patch instead of an exact third-party exception
- Conditional implementation files:
  - `nextjs-app/components/custom/map/MapView.tsx` only if fresh evidence contradicts the
    completed probes or a narrowly justified style patch is best located near map setup
  - `nextjs-app/components/composed/venue/VenueDetailContent.tsx`,
    `nextjs-app/components/custom/time/TimeSliderPanel.tsx`, and additional
    `nextjs-app/lib/contexts/TimeContext.tsx` hydration-root work only if a fresh readable
    hydration stack/diff contradicts the probe and points at time-rendered text
  - `nextjs-app/components/custom/map/UserLocationLayer.tsx`,
    `nextjs-app/components/custom/map/MapControls.tsx`, or DTO/API sanitation only if new
    evidence directly connects them to the exact warning
- Likely test files:
  - A component/unit test file that can run a real `hydrateRoot` path for `OnboardingGate`
  - `nextjs-app/test/e2e/story-12-4-console-hygiene.spec.ts`
  - `nextjs-app/test/e2e/onboarding.spec.ts`
  - Existing `nextjs-app/test/components/MapView.test.tsx` only if `MapView` or coordinate
    guards change
- No new runtime dependencies are expected.
- No design-token, screenshot-reference, premium/payment, or backend shadow/weather compute
  changes are expected.

## Out Of Scope

- Do not change the product UI or visual layout except where unavoidable to remove the
  hydration mismatch; any pixel movement needs evidence and human-approved rebaseline.
- Do not add broad console allow-lists or hide app-origin warnings.
- Do not treat `TimeSliderPanel`, `MapView`, `VenueDetailContent`, `TimeContext`, or
  geolocation hardening as required implementation work unless fresh evidence contradicts
  the completed probes.
- Do not change venue confidence, pin semantics, planner behavior, provider contracts, or
  future monetization code.
- Do not mark the story `review` by editing sprint status directly.

## References

- `AGENTS.md` - canonical repo source for commands, BMAD story workflow, visual validation, API/client boundary, design-token, testing, and sprint-status rules.
- `_bmad-output/planning-artifacts/epics.md` - Epic 12 and Story 12.4 source text.
- `_bmad-output/planning-artifacts/architecture.md` - `E12-AD-13` operational gate.
- `_bmad-output/planning-artifacts/prd.md` - NFR39 console hygiene and NFR8 performance.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - persistent map canvas and
  no-remount UX expectations.
- `project-context.md` - active Epic 12 decisions and Screen ID -> Route Map.
- `nextjs-app/docs/design/DESIGN.md` - binding design tokens and MapLibre basemap override
  policy.
- `nextjs-app/docs/design/references/claude-design/README.md` - prototype/reference usage
  rules.
- `nextjs-app/docs/design/references/REBASELINE-LOG.md` - latest approved visual baseline
  changes.
- `_bmad-output/implementation-artifacts/epic-11-retro-2026-07-05.md` - prior-epic testing
  and evidence lessons.
- `_bmad-output/auto-bmad/retro-notes/epic-12.md` - Story 12.9 inherited
  `OnboardingGate` hydration warning and local Playwright server notes.
- `_bmad-output/implementation-artifacts/deferred-work.md` - conditional deferred cleanup
  items for onboarding, MapLibre async boundaries, and user-location coordinates.

## Dev Agent Record

### Agent Model Used

GPT-5.5 (auto-bmad dev-story delegate)

### Debug Log References

- Baseline gate before edits: `npx tsc --noEmit` and `npx eslint . --quiet` passed from
  `nextjs-app/`. No git command was run.
- Red hydration regression: before production changes,
  `npx vitest run test/components/OnboardingGate.test.tsx -t "hydrates the app route frame"`
  failed 1/15 because the real `renderToString` + `hydrateRoot` path still created one
  legacy onboarding host where the new contract expected zero.
- Offending hydration component/value: `OnboardingGate` changed the host topology during
  the first client render. The final fix makes that topology stable by rendering the
  onboarding gate as a direct sibling of `[data-app-shell]` from the localized app route
  frame.
- Route-scope audit: `/` and `/favoriter` are onboarding-scoped; `/about` and `/sekretess`
  render the responsive layout without onboarding and without shell `aria-hidden`/`inert`.
- Runtime identifier audit: `rg -n "createPortal|usePortalTarget|portalTarget"
  nextjs-app/app nextjs-app/components nextjs-app/test` returned no matches. The legacy
  `[data-onboarding-portal]` selector remains only in absence assertions.
- MapLibre source revalidation: the exact
  `Expected value to be of type number, but found null instead.` warning remains attributed
  to upstream OpenFreeMap Positron worker-blob style expressions over missing/null
  `ref_length` in `highway-shield-non-us`, `highway-shield-us-interstate`, and
  `road_shield_us`; SunnySeat finite coordinate guards and selected-venue projection paths
  stayed untouched.
- Fresh `_time` route evidence: canonical forced-time routes emitted a stale
  `/api/venues?...date=2026-05-20&time=...` 400 from the hydration-safe seed before the
  client clock corrected to 2026-07-25. This contradicted the "TimeContext is already
  stable-seeded" probe only for dev/preview query emission, not for the React #418 root, so
  `TimeContext` now suppresses forced planner params until the first client clock pass.

### Completion Notes

- Fixed the React hydration mismatch with the approved Option A topology:
  `AppRouteFrame` renders `<ResponsiveLayout>{children}</ResponsiveLayout>` and
  `<AppRouteOnboardingGate />` as stable siblings under the existing provider tree.
- `OnboardingGate` now owns route scoping for localized routes and shows onboarding only on
  `/` and `/favoriter`; informational routes such as `/about` and `/sekretess` retain the
  app layout without onboarding.
- Removed the runtime body-host move entirely. `OnboardingScreen` renders directly, keeps
  its phase/pending controller state in one mounted instance, and remains outside the inerted
  app shell while visible.
- Retained the `AppContextProviders` single-child-tree workaround and added mount-count
  coverage proving the child tree does not remount while dev `_time`/`_date` URL sync runs.
- Added a focused console/pageerror Playwright guard with listeners installed before
  navigation. It fails same-text Positron warnings on the main thread and app/browser errors,
  but permits the proven Positron worker-blob warning exactly and caps it per worker.
- ✅ Resolved review finding [Med]: narrowed the Positron warning exception so same-text
  worker warnings are allowed only after the page has loaded OpenFreeMap Positron and the
  exact `highway-shield-non-us`, `highway-shield-us-interstate`, and `road_shield_us`
  `ref_length` comparison layers are present.
- Added TimeContext forced-route regressions so canonical `_time` routes do not fire stale
  hydration-seed planner API requests, while mounted forced sessions still emit the current
  Stockholm client-clock date/time.
- No MapView, coordinate guard, MapLibre import-boundary, design-token, reference-PNG, or
  sprint-status changes were made. Visual validation remains pending and was not waived; no
  rebaseline was attempted.
- Story-review gate was not run by orchestrator instruction, and
  `_bmad-output/implementation-artifacts/sprint-status.yaml` was not edited.

### File List

- `nextjs-app/app/[locale]/layout.tsx`
- `nextjs-app/app/[locale]/page.tsx`
- `nextjs-app/app/[locale]/favoriter/page.tsx`
- `nextjs-app/components/custom/layout/AppRouteFrame.tsx`
- `nextjs-app/components/custom/layout/AppContextProviders.tsx`
- `nextjs-app/components/custom/onboarding/OnboardingGate.tsx`
- `nextjs-app/components/custom/onboarding/OnboardingScreen.tsx`
- `nextjs-app/lib/contexts/TimeContext.tsx`
- `nextjs-app/test/components/OnboardingGate.test.tsx`
- `nextjs-app/test/components/OnboardingGate.synchronous.atdd.test.tsx`
- `nextjs-app/test/components/OnboardingScreen.test.tsx`
- `nextjs-app/test/components/AppContextProviders.test.tsx`
- `nextjs-app/test/unit/TimeContext.test.tsx`
- `nextjs-app/test/e2e/story-12-4-console-hygiene.spec.ts`
- `nextjs-app/test/e2e/onboarding.spec.ts`
- `_bmad-output/implementation-artifacts/12-4-production-console-hygiene-hydration-error-maplibre-null-warning.md`

### Test Results

- Pre-edit baseline: `npx tsc --noEmit` passed; `npx eslint . --quiet` passed.
- Red regression before production fix:
  `npx vitest run test/components/OnboardingGate.test.tsx -t "hydrates the app route frame"`
  failed 1/15 with the expected legacy-host cardinality failure.
- Focused unit/component after implementation:
  `npx vitest run test/components/OnboardingGate.test.tsx test/components/OnboardingGate.synchronous.atdd.test.tsx test/components/OnboardingGateSessionLatch.test.tsx test/components/OnboardingScreen.test.tsx test/components/AppContextProviders.test.tsx test/unit/TimeContext.test.tsx`
  passed 6 files / 64 tests.
- Post-implementation type/lint: `npx tsc --noEmit` passed and `npx eslint . --quiet`
  passed from `nextjs-app/`.
- Console hygiene E2E:
  `npx playwright test test/e2e/story-12-4-console-hygiene.spec.ts --project=mobile --project=desktop --retries=0`
  passed 8/8; only the existing Next.js multiple-lockfile warning appeared in the
  web-server log.
- Onboarding stress matrix, single worker and zero retries:
  desktop first-time skip 30/30, desktop first-frame CTA 30/30, mobile first-time skip
  30/30, and mobile first-frame CTA 30/30 passed.
- Required repo Vitest gate: `VITEST_MAX_WORKERS=4 npx vitest run` passed 194 files with
  2 skipped, 1790 tests with 15 skipped. jsdom printed the existing
  `Not implemented: navigation to another Document` line.
- Final onboarding Playwright matrix after route-scope coverage:
  `npx playwright test test/e2e/onboarding.spec.ts --project=mobile --project=desktop --retries=0`
  passed 18/18. The broader onboarding run still logged the existing Next.js
  multiple-lockfile warning, Motion reduced-motion warnings, and existing
  `VenuePinLayer` synchronous-unmount React warnings outside the Story 12.4 console-hygiene
  guarded routes.
- Review patch baseline: `npx tsc --noEmit` passed and `npx eslint . --quiet` passed from
  `nextjs-app/` before editing.
- Review patch focused console-hygiene E2E:
  `PLAYWRIGHT_BASE_URL=http://localhost:43220 PLAYWRIGHT_PORT=43220 npx playwright test test/e2e/story-12-4-console-hygiene.spec.ts --project=mobile --project=desktop --retries=0`
  passed 10/10. The first default-port attempt failed because an existing Next dev server
  already owned `.next` on port `43220`; no app assertions failed in that attempt.
- Review patch post-edit static gates: `npx tsc --noEmit` passed and
  `npx eslint . --quiet` passed from `nextjs-app/`.

### Change Log

- 2026-07-25: Added `AppRouteFrame` so the app shell and onboarding gate render as stable
  siblings under the localized app providers.
- 2026-07-25: Removed the onboarding runtime body-host move; `OnboardingScreen` now renders
  directly outside `[data-app-shell]` on onboarding-scoped routes.
- 2026-07-25: Added real hydration, shell-sibling, route-scope, no-remount, and provider
  mount-count regressions for onboarding.
- 2026-07-25: Added Story 12.4 Playwright console/pageerror hygiene coverage across cold `/`,
  canonical `_time` map routes, and canonical `_time` venue-detail routes for mobile and
  desktop.
- 2026-07-25: Suppressed stale forced-time planner query params until the client clock
  resolves, with unit coverage for pre-mount and mounted forced sessions.
- 2026-07-25: Addressed code review finding - narrowed the Positron worker warning exception
  to require loaded-style evidence for the documented `ref_length` layers and added a
  same-origin blob-worker regression.

### Review Findings

- [x] [Review][Patch][Med] Console guard allow-list is broader than the proven Positron source: `isAllowedThirdPartyWarning()` allows the exact `Expected value to be of type number, but found null instead.` warning from any same-origin blob worker, capped per worker, without checking the proven OpenFreeMap Positron layers (`highway-shield-non-us`, `highway-shield-us-interstate`, `road_shield_us`) or `ref_length` expression source. Source: Acceptance Auditor primary. [nextjs-app/test/e2e/story-12-4-console-hygiene.spec.ts:40]
