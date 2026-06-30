---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04-generate-tests'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-06-30'
workflowType: 'testarch-atdd'
inputDocuments:
  - '_bmad-output/implementation-artifacts/9-5-location-onboarding-reliability.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-9.md'
  - 'nextjs-app/components/custom/onboarding/OnboardingGate.tsx'
  - 'nextjs-app/components/custom/onboarding/OnboardingScreen.tsx'
  - 'nextjs-app/hooks/useGeolocation.tsx'
  - 'nextjs-app/components/custom/map/MapView.tsx'
  - 'nextjs-app/components/custom/map/MapControls.tsx'
  - 'nextjs-app/components/custom/map/VenuePinLayer.tsx'
  - 'nextjs-app/components/custom/venue/VenueList.tsx'
  - 'nextjs-app/app/ServiceWorkerProvider.tsx'
  - 'nextjs-app/test/components/OnboardingGate.test.tsx'
  - 'nextjs-app/test/components/VenuePinLayer.test.tsx'
  - 'nextjs-app/test/components/MapControls.test.tsx'
  - 'nextjs-app/test/components/VenueList.test.tsx'
  - 'nextjs-app/test/e2e/onboarding.spec.ts'
---

# ATDD Checklist - Epic 9, Story 9.5: Location & Onboarding Reliability

**Date:** 2026-06-30
**Author:** Rasmus
**Primary Test Level:** Component (RTL / jsdom) + one E2E (clean-context onboarding)
**Stack detected:** `frontend` (Next.js 16 + React 19; Vitest+RTL for components, Playwright for e2e)
**Generation mode:** AI generation from source + acceptance criteria (recording mode N/A — deterministic jsdom assertions, not live-browser recording)

---

## Story Summary

The onboarding gate renders a non-interactive placeholder on first paint and portals the real welcome screen in only after a `localStorage`-gated client effect resolves. That single hydration window is the root of BOTH the "map flashes before the welcome overlay" symptom AND the intermittent "Use my location did nothing" dead-click, and a clean (empty-`localStorage`) automated session can slip straight to the map with no overlay (live smoke-test gap, epics.md:2360). Story 9.5 resolves the onboarded state synchronously on first render, draws the amber user-location `UserPin` on geolocation success, labels distances honestly on the Gothenburg-centre fallback, and adds a locate-button pending/denied affordance plus an SW-activated reload prompt.

**As a** user
**I want** the welcome screen to appear cleanly and "Use my location" to reliably work and show me on the map
**So that** I trust the app knows where I am

---

## Acceptance Criteria (verbatim intent)

1. **AC1 — synchronous first render.** Gate reads "onboarded" state synchronously on first render (`useSyncExternalStore` over the `localStorage` flag, or a server-readable cookie) → correct screen from the first frame, no map-flash; the real wired "Use my location" CTA exists immediately so an early click always triggers the permission prompt.
2. **AC2 — UserPin on success.** Amber `UserPin` drawn at the user's coords via a dedicated marker layer, updates on coordinate changes, NOT shown while status is the Gothenburg fallback.
3. **AC3 — honest fallback labelling.** On the centrum fallback, distances are labelled approximate ("≈ från centrum") — or "Närmast" suppressed — rather than implying a real personal fix.
4. **AC4 — recover locate + SW stale-shell.** On `prompt`/denied, surface a (re-)request path instead of silently using the fallback; the locate button shows pending/denied feedback; an activated SW update prompts/forces a single reload so the fresh shell is shown.

---

## Test Strategy (AC → Level → Priority → Red-phase signal)

| # | Acceptance signal | Level | Priority | Red-phase assertion (deterministic — NOT wall-clock) | Risk |
|---|---|---|---|---|---|
| 1 | First-visit shows the REAL OnboardingScreen on render #1 (no placeholder) | Component | **P0** | synchronous `getByTestId('onboarding-screen')`; `queryByTestId('onboarding-gate-placeholder')` is null | R-004 |
| 2 | Early CTA click reaches `requestLocation()` (dead-click fix) | Component | **P0** | `fireEvent.click` on first frame → `requestLocationSpy` called once | R-004 |
| 3 | Returning user renders null from first render (no placeholder window) | Component | **P0** | both `onboarding-screen` + placeholder absent | R-004 |
| 4 | SSR shows welcome overlay (`getServerSnapshot === false`), no crash | Component | P1 | `renderToString` contains `onboarding-screen`, not placeholder; no throw | R-004 |
| 5 | Forced `_state=onboarding` still shows screen on first render | Component | P1 | screen present with flag set + forced state | regression |
| 6 | Dual `inert` + `aria-hidden` app-shell isolation preserved | Component | P1 | shell has both attrs while overlay up | 7-3 deferred |
| 7 | `success` → ONE marker at `[lng, lat]` | Component | **P0** | `allMarkers.length === 1`; `setLngLat([lng,lat])` | R-004 |
| 8 | Coords change re-positions SAME marker (no recreate) | Component | P1 | still 1 marker; `setLngLat` last-called with new coords; `remove` not called | R-004 |
| 9 | `fallback`/`idle`/`pending` → NO marker | Component | **P0** | `allMarkers.length === 0` (AC2 "not shown on fallback") | R-004 |
| 10 | Symmetric cleanup on unmount + success→fallback | Component | P1 | `marker.remove()` called | regression |
| 11 | Approximate label renders on fallback | Component | **P0** | `getByText(/≈ från centrum/)` present when `locationIsApproximate` | R-004 |
| 12 | Plain distance on success (no approximate label) | Component | P1 | label absent; distance number still present | R-004 |
| 13 | Real distance VALUE never hidden on fallback | Component | P1 | `getByText(/\d/)` present (anti-pattern 9.1 removed) | regression |
| 14 | New i18n key exists (sv source) | Component | P1 | `sv/venue.json` contains the label string (parity auto-covered) | i18n |
| 15 | Locate button reflects PENDING (`status==='pending'`) | Component | **P0** | `aria-busy="true"` or `data-locate-state="pending"` | R-004 |
| 16 | Locate button stays clickable on `fallback` (retry) | Component | **P0** | `button.disabled === false`; `data-locate-state="fallback"` | R-004 |
| 17 | SW controllerchange → exactly ONE reload | Component | **P0** | `location.reload` called once | 7-3 deferred |
| 18 | Repeat controllerchange → no 2nd reload (no loop) | Component | **P0** | reload still called once (refreshing guard) | 7-3 deferred |
| 19 | SW handler cleanup detaches listener | Component | P1 | listener removed on cleanup | regression |
| 20 | Clean-context (empty localStorage) reliably shows overlay | **E2E** | **P0** | fresh context → `onboarding-screen` visible | R-004 (smoke gap) |
| 21 | Map shell inert/hidden under overlay (no flash-through) | **E2E** | P1 | `[data-app-shell]` has `aria-hidden` + `inert` | R-004 |
| 22 | First-frame CTA interactive immediately (granted geo) → overlay exits | **E2E** | **P0** | early click dismisses overlay, map shown | R-004 |

**Deliberately OUT of scope (per story scope discipline):**
- Raw timing / animation-duration asserts (wall-clock-flaky per the e2e gotchas lesson) — the visual gate (dot render + clean first paint) is a manual screenshot pass in Completion Notes, NOT a CI assert.
- Story 9.10's cross-cutting mobile-viewport regression sweep + "location dot renders on geolocation success" regression guard (9.10 AC2) — this scaffold proves 9.5's OWN surfaces only.
- Story 9.4's venue-query gating (`coordsSettled`/`geolocation.status`) — untouched; 9.5 must NOT change venue-query firing.
- Story 9.6's locate-chrome consolidation — 9.5 owns locate BEHAVIOUR (request + feedback), not which button survives where.

---

## Failing Tests Created (RED Phase)

> All blocks are `describe.skip` / `test.describe.skip` so they do NOT break the green CI run. The dev un-skips each block as the matching task goes green (red→green per block). Collected SKIPPED (Vitest: **4 files / 23 tests skipped, 0 failing**; full suite **775 passed / 23 skipped**, baseline was 775/7 → +16 skipped, none dropped). `tsc --noEmit` 0 errors and `eslint --quiet` 0 errors across all four scaffold files + the e2e spec.

### AC1 — synchronous first-render gate (7 tests)
**File:** `nextjs-app/test/components/OnboardingGate.synchronous.atdd.test.tsx`
Mirrors the existing `OnboardingGate.test.tsx` localStorage harness + `useForcedState`/`useMapInstance` mocks. `useGeolocation` is mocked so `requestLocation` is a spy (the dead-click signal).
- **AC1** `first visit renders the REAL OnboardingScreen on the FIRST render — no placeholder` — RED: today returns the placeholder until a mount effect flips `hasReadFlag`.
- **AC1** `an EARLY click on the first-frame CTA reaches requestLocation()` — RED: the placeholder CTA is a plain `<div>` with no handler.
- **AC1** `returning user renders nothing from the FIRST render — no placeholder window` — RED: today shows the placeholder first.
- **AC1** `SSR: server render shows the welcome overlay (getServerSnapshot === false)` — RED: asserts the new server snapshot default; today SSR emits the placeholder.
- **AC1** `SSR does not crash / produces HTML` — hydration-safety guard.
- **AC1** `forced state still shows the screen on first render for a returning user` — preserves the dev `?_state=onboarding` branch.
- **AC1** `preserves dual inert + aria-hidden app-shell isolation` — guards the 7-3 deferred dual-attr behaviour through the refactor.

### AC2 — UserLocationLayer / UserPin (5 tests)
**File:** `nextjs-app/test/components/UserLocationLayer.atdd.test.tsx`
Models the `VenuePinLayer.test.tsx` MapLibre-Marker stub (spies on `setLngLat`/`addTo`/`remove`) + `MapInstanceContext` stub map. **The `UserLocationLayer` module does not exist yet**, so it is loaded via a runtime dynamic specifier (`USER_LOCATION_LAYER_MODULE`) inside the skipped test bodies — neither `tsc` nor vite import-analysis resolves the not-yet-existing path. **Un-skip step for the dev:** create the component, then convert the dynamic specifier to a normal top-level `import { UserLocationLayer } from '@/components/custom/map/UserLocationLayer'`.
- `mounts exactly ONE marker at the resolved coords when status === "success"`.
- `re-positions the SAME marker via setLngLat on a coords change (no recreate)`.
- `renders NO marker when status === "fallback"|"idle"|"pending"` (3 cases via `it.each`).
- `removes the marker symmetrically on unmount`.
- `removes the marker when status transitions success → fallback`.

> **Prop-contract assumption:** `<UserLocationLayer status coords />`. If the dev instead consumes `useGeolocation()` internally, swap the props for a mocked hook and keep the marker assertions (noted in the file header).

### AC3 — honest approximate-distance label (4 tests)
**File:** `nextjs-app/test/components/VenueListApproximateDistance.atdd.test.tsx`
Imports the existing `VenueList` + `sv/venue.json`. The NEW `locationIsApproximate` prop is passed via a `Record<string,unknown>` cast so the scaffold type-checks against today's `VenueListProps`; the dev removes the cast and adds the prop. Label string centralised as `APPROXIMATE_LABEL = '≈ från centrum'`.
- `shows "≈ från centrum" when locationIsApproximate is true (fallback)`.
- `does NOT show the approximate label when locationIsApproximate is false (real fix)`.
- `still renders the real distance VALUE on the fallback path (number not hidden)`.
- `sv/venue.json defines the approximate-distance label key` (parity guard; `messages-parity.test.ts` auto-covers the en counterpart once both exist).

> **ALTERNATIVE (suppress "Närmast"):** if the dev chooses suppression over labelling, replace the label assertions with a sort-control/`sortMode` assertion and keep the success-path "plain distance" assertion.

### AC4 — locate feedback + SW reload (7 tests)
**File:** `nextjs-app/test/components/LocateAndSwReload.atdd.test.tsx`
Two `describe.skip` blocks. Block (a) drives `MapControls` with a mocked `useGeolocation` status (`map-control-my-location` testid). Block (b) loads the **not-yet-existing** SW-update hook via a runtime dynamic specifier (`SW_RELOAD_MODULE = '@/hooks/useServiceWorkerUpdate'`), stubs `navigator.serviceWorker` + `location.reload`.
- **(a)** `reflects a PENDING state on the locate button while status === "pending"` (`aria-busy` or `data-locate-state`).
- **(a)** `keeps the locate button available to RETRY on status === "fallback"` (`disabled === false`, `data-locate-state="fallback"`).
- **(b)** `reloads exactly ONCE on a controllerchange event`.
- **(b)** `does NOT reload a second time on a repeat controllerchange (refreshing guard — no loop)`.
- **(b)** `cleanup detaches the controllerchange listener`.

> **Handler-shape assumption:** `registerServiceWorkerUpdateReload(): () => void`. The dev may name/locate it differently (e.g. inside `ServiceWorkerProvider` via the SerwistProvider update signal); adjust the import + call site and keep the once-only-reload assertions.

### AC1/AC4 — clean-context onboarding E2E (3 tests)
**File:** `nextjs-app/test/e2e/onboarding.spec.ts` (new `test.describe.skip('Story 9.5 — clean-context onboarding reliability (RED)')`)
Deterministic by construction — a fresh Playwright context has empty localStorage, so no timing dependency. Closes the live smoke-test gap (epics.md:2360) + test-design **R-004** verification.
- `a first-time user (empty localStorage) reliably sees the welcome overlay`.
- `the map underneath is inert/hidden while the welcome overlay is up (no flash-through)`.
- `the first-frame CTA is interactive immediately — an early click triggers the geolocation flow` (grants + sets geolocation so the click resolves to success and the overlay exits).

---

## Mock Requirements

| Boundary | Used by | Shape |
|---|---|---|
| `@/hooks/useGeolocation` (`useGeolocation`) | AC1 gate, AC4(a) | `{ status, coords, requestLocation: spy, useCentrum: spy }` — drive `status` directly to exercise pending/fallback/success branches; spy `requestLocation` for the dead-click signal |
| `maplibre-gl` `Marker` | AC2 | stub class pushing a `{ setLngLat, addTo, remove }` spy into `allMarkers` (copied from `VenuePinLayer.test.tsx`) |
| `MapInstanceContext` | AC2, AC4(a) | stub map via `Provider` (mapRef + mapInstance) |
| `@/lib/dev/use-forced-state`, `@/lib/contexts/MapInstanceContext`, `@/lib/contexts/SettingsContext` | AC1, AC4(a) | minimal mocks mirroring the existing component tests |
| `window.localStorage` | AC1 | in-memory `Map`-backed stub (the established `OnboardingGate.test.tsx` harness) |
| `navigator.serviceWorker` + `window.location.reload` | AC4(b) | controllerchange listener registry + `reload` spy; restored in `afterEach` |

**Not-yet-existing modules loaded via runtime dynamic specifier (so the gate stays green):** `@/components/custom/map/UserLocationLayer` (AC2), `@/hooks/useServiceWorkerUpdate` (AC4b). The dev converts these to normal top-level imports when un-skipping.

---

## Implementation Checklist (maps tests → tasks; un-skip as each block goes green)

### Task 1 — synchronous first-render gate (AC1, P0)
- [ ] Replace the `useState(false)` + mount `useEffect` flag read in `OnboardingGate.tsx` with `useSyncExternalStore(subscribe, getSnapshot=readFlag, getServerSnapshot=false)` (RECOMMENDED) — or the server-cookie alternative if the returning-user transition flashes the map. Record the decision in Completion Notes.
- [ ] Delete the `OnboardingGatePlaceholder` non-interactive stand-in so the real wired `OnboardingScreen` is the first frame; an early CTA click reaches `requestLocation()`.
- [ ] Preserve forced-state branches, the `data-app-shell` dual inert+aria-hidden effect, and the dismiss/flyTo/flag-write semantics.
- [ ] Un-skip `OnboardingGate.synchronous.atdd.test.tsx`. If the cookie path is chosen, adapt the two SSR tests to `initialOnboarded` props.

### Task 2 — UserLocationLayer / UserPin (AC2, P0)
- [ ] Create `UserLocationLayer.tsx` (single `maplibregl.Marker`, model on `VenuePinLayer.tsx`) + presentational `UserPin.tsx` (amber dot + halo per `Pins.jsx:110-133`; prefer a DESIGN.md `--color-amber-*` token over raw `#d97706`, note the token gap if none matches).
- [ ] Mount in `MapView` inside the `{!showOfflineShell}` block, gated on `geolocation.status === 'success'`; use `setLngLat` on coords change (no recreate).
- [ ] Do NOT duplicate the existing `flyTo`; dot is `pointer-events:none`.
- [ ] Convert the AC2 scaffold's dynamic specifier to a top-level import; un-skip the block.

### Task 3 — honest distance label (AC3, P0)
- [ ] Thread `locationIsApproximate` (`status === 'fallback'`) from `MapView` → `VenueList`; render the "≈ från centrum" treatment, keep the real number.
- [ ] Add the new key to BOTH `sv/venue.json` + `en/venue.json` (parity-guarded). Update `APPROXIMATE_LABEL` if the final sv copy differs.
- [ ] Un-skip the AC3 block.

### Task 4 — locate feedback + SW reload (AC4, P0)
- [ ] Drive a visible pending state (`aria-busy`/`data-locate-state="pending"`) off `status==='pending'` and a retry-able fallback affordance off `status==='fallback'` on the locate control.
- [ ] Add a controllerchange→single-reload handler (hook or in `ServiceWorkerProvider`) with a `refreshing` guard (no loop). Note in Completion Notes whether this closes the 7-3 `skipWaiting`/`clientsClaim` deferred item or only partially.
- [ ] Do NOT change the SW caching strategy (precache-only).
- [ ] Convert the AC4(b) dynamic specifier to a top-level import; un-skip both AC4 blocks.

### Task 5/6 — E2E + gate (AC1/AC4, P0)
- [ ] Un-skip the `test/e2e/onboarding.spec.ts` clean-context block once Task 1 lands.
- [ ] Run the canonical gate: `npx tsc --noEmit` · `npx eslint . --quiet` · `npx vitest run` (all green; count increases, none dropped).
- [ ] Visual gate is MANUAL on this host (`VISUAL_VALIDATE_PROVIDER=none ALLOW_MANUAL_VISUAL_VALIDATION=1`): dot-on-success + clean welcome first paint. New map-with-dot reference PNG → route to maintainer rebaseline (dev forbidden from self-blessing references).

---

## Running Tests

```bash
# RED-phase component scaffolds (currently all skipped — un-skip per task as it goes green)
cd nextjs-app && npx vitest run \
  test/components/OnboardingGate.synchronous.atdd.test.tsx \
  test/components/UserLocationLayer.atdd.test.tsx \
  test/components/VenueListApproximateDistance.atdd.test.tsx \
  test/components/LocateAndSwReload.atdd.test.tsx

# RED-phase e2e (skipped block in the existing onboarding spec)
cd nextjs-app && npx playwright test test/e2e/onboarding.spec.ts

# Full gate (Task 6)
cd nextjs-app && npx tsc --noEmit && npx eslint . --quiet && npx vitest run
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅
- 23 component scaffolds (4 files) + 3 e2e scaffolds authored, all `*.skip` so CI stays green.
- Collected SKIPPED (Vitest 4 files / 23 tests skipped, 0 failing; full suite 775 passed / 23 skipped). `tsc --noEmit` 0 errors, `eslint --quiet` 0 errors.
- Deterministic RTL/jsdom assertions only (render output, click→spy wiring, status-branching, marker call-counts, mocked controllerchange). NO wall-clock / animation-timing asserts.
- Not-yet-existing modules (`UserLocationLayer`, `useServiceWorkerUpdate`) loaded via runtime dynamic specifier so the green gate is not broken by an unresolvable import.

### GREEN Phase (DEV — next)
Pick one block, un-skip it (and convert any dynamic specifier to a top-level import / remove the prop cast), implement the matching task until it passes, repeat. Do NOT change Story 9.4's venue-query gating or Story 9.6's locate-chrome ownership.

### REFACTOR Phase
After all un-skipped, keep tsc/eslint/vitest green, then move Status to `review`. Visual gate is the manual affordance on this host; new dot reference PNG routes to maintainer sign-off.

---

## Notes

- **Why scaffolds, not full tests:** TDD red phase — every assertion targets POST-implementation behaviour and fails today by design. Skipping keeps the green gate intact until the dev un-skips per task.
- **Two open prop-contract assumptions** the dev resolves at implementation (both flagged in-file): `UserLocationLayer` props vs internal `useGeolocation`; SW handler name/home. Neither blocks dev — the assertions are stable; only the wiring adapts.
- **AC4 denied-vs-fallback granularity:** the scaffold treats `'fallback'` as the honest "couldn't place you" signal (story Open Question 2 default). If the dev adds a distinct `'denied'` status, extend the AC4(a) block accordingly.
- **No new data factories/fixtures** — reused the existing `OnboardingGate`/`VenuePinLayer`/`MapControls`/`VenueList` test harnesses verbatim.

---

**Generated by BMad TEA Agent** - 2026-06-30
