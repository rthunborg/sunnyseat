# Story 9.5: Location & Onboarding Reliability

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want the welcome screen to appear cleanly and "Use my location" to reliably work and show me on the map,
so that I trust the app knows where I am.

## Acceptance Criteria

_(Verbatim from epics.md §"Story 9.5: Location & Onboarding Reliability". Parentheticals — "e.g. a server-readable cookie or `useSyncExternalStore`", "the amber `UserPin` from the design reference", "or 'Närmast' is suppressed" — are the epic's own option menus / examples, not new criteria. The dev picks the option per AC and records the choice. The hydration-strategy decision in AC1 is elevated to its own explicit task, Task 1, with a recommended default.)_

1. **Given** the onboarding gate currently renders a non-interactive placeholder on first paint and portals the real screen in after hydration, **When** the gate reads its "onboarded" state synchronously on first render (e.g. a server-readable cookie or `useSyncExternalStore`), **Then** the correct screen (welcome or map) is shown from the first frame — eliminating the brief "map flashes before the welcome overlay" — and the real, wired "Use my location" button exists immediately so an early click always triggers the permission prompt.

2. **Given** geolocation resolves successfully, **When** the map renders, **Then** a "you-are-here" marker (the amber `UserPin` from the design reference) is drawn at the user's coordinates via a dedicated marker layer, updates on coordinate changes, and is not shown while status is the Gothenburg fallback.

3. **Given** the user skips/denies location (origin is the Gothenburg-centre fallback), **When** distances and the "Närmast" sort render, **Then** the UI is honest about it — distances are labelled approximate / "≈ från centrum" (or "Närmast" is suppressed) rather than implying a real personal fix.

4. **Given** a returning user whose permission state is "prompt", and the service-worker can serve a stale precached shell after a deploy, **When** these edge cases occur, **Then** the app surfaces a way to (re-)request location instead of silently using the fallback, the locate button shows pending/denied feedback, and an activated SW update prompts/forces a reload so the fresh shell is shown.

### Design Gate Criteria

_(Frontend/reliability story. Carried verbatim from epics.md §"Story 9.5 → Design Gate Criteria". This story HAS a new on-screen element — the user-location dot — so the visual gate is a real screenshot pass, not a no-visual-change confirm. See "Visual gate on this host" in Dev Notes for the mandatory manual affordance.)_

- **Visual:** User-location dot matches the reference `UserPin` (amber dot + halo); welcome screen covers the map with no flash.
- **Behaviour:** "Use my location" reliably prompts and recenters; dot appears on success; honest distance labelling when denied.
- **Animation:** No map-flash on load; dot appears without jarring jump; existing fly-to animation preserved.
- **Visual validation:** Screenshot of map with the location dot + clean first paint of the welcome screen passes before QA handoff.

## Tasks / Subtasks

- [x] **Task 1 — Decide & implement the synchronous first-render onboarding-state strategy (cookie vs `useSyncExternalStore`) (AC: #1)**
  - [x] **This is the load-bearing architectural decision of the story — make it FIRST, record the rationale in Completion Notes.** (Chose `useSyncExternalStore` — the recommended default. Rationale + the latch/portal-after-mount refinements in Completion Notes.)
  - [x] **RECOMMENDED DEFAULT — `useSyncExternalStore` over the `localStorage` flag.** Implemented `useHasOnboarded()` = `useSyncExternalStore(subscribeToOnboardedFlag, readFlag, getServerOnboardedSnapshot)` — `getSnapshot=readFlag()` (synchronous client first-frame read), `getServerSnapshot=false`, `subscribe`=cross-tab `storage` listener. No returning-user map-flash observed (verified empirically via dev-server capture); cookie alternative NOT needed.
  - [x] **ALTERNATIVE — server-readable cookie.** Not chosen (the `useSyncExternalStore` returning-user transition did not flash). No cookie plumbing / privacy-cookie documentation burden incurred.
  - [x] **Either way, the real, wired CTA must exist on the first frame.** Deleted `OnboardingGatePlaceholder`; the gate renders the real `OnboardingScreen` from frame #1 (portal-after-mount preserves the `data-app-shell` escape). Forced-state branches + dual `inert`/`aria-hidden` blocking effect preserved.
  - [x] **Do NOT regress the existing dismiss / flyTo / flag-write semantics.** Flag write stays on grant/deny; forced-state never writes; deferred-flyTo bails on `dismissed`. Added a session latch + `wroteFlagThisSessionRef` so a same-tab flag write does not yank the overlay mid-exit (the synchronous snapshot would otherwise flip live); cross-tab onboarding still dismisses.

- [x] **Task 2 — Draw the amber user-location `UserPin` marker via a dedicated marker layer (AC: #2)**
  - [x] **Reuse the existing MapLibre marker-layer pattern.** Created `UserLocationLayer.tsx` (single `maplibregl.Marker`, `createRoot` into a detached element, symmetric cleanup) modelled on `VenuePinLayer`, + presentational `UserPin.tsx`.
  - [x] **`UserPin` visual = the design reference exactly.** 18×18 `#d97706` dot, `3px solid #fff`, `box-shadow 0 2px 8px rgba(0,0,0,0.25)`, halo `inset:-22` radial-gradient `rgba(217,119,6,0.3)→0`, `pointer-events:none`. Verified against the dev-server render (DOM-computed `rgb(217,119,6)`, 18px, white border). No exact DESIGN.md token for `#d97706` — used the raw reference value, token gap recorded in Completion Notes (no new token invented).
  - [x] **Mount the layer in `MapView`, gated on `status === 'success'`** inside the `{!showOfflineShell}` block alongside `<VenuePinLayer />`; renders nothing on fallback/idle/pending (the layer owns the gate).
  - [x] **Update on coordinate changes** via `marker.setLngLat` (no recreate, no flicker).
  - [x] **Do NOT duplicate the `flyTo` recenter.** Dot-only; existing OnboardingGate + MapControls fly-to preserved.

- [x] **Task 3 — Honest distance labelling on the Gothenburg-centre fallback (AC: #3)**
  - [x] **Root cause confirmed.** Threaded `locationIsApproximate` (= `geolocation.status === 'fallback'`) MapView → VenueList → VenueCard.
  - [x] **RECOMMENDED DEFAULT — label distances as approximate.** New `venue.json` key `list.distanceApproximate` (sv "≈ från centrum" / en "≈ from centre"). The real distance VALUE stays visible; only the LABEL is qualified (rendered in both the full and compact card layouts).
  - [x] **ALTERNATIVE — suppress "Närmast".** Not chosen (the approximate label is the honest, less-disruptive treatment).
  - [x] **i18n parity.** Key added to BOTH locales; `messages-parity.test.ts` green.

- [x] **Task 4 — Recover the locate affordance on "prompt"/denied + handle the SW stale-shell window (AC: #4)**
  - [x] **(a) Surface a (re-)request-location path.** Touched `MapControls.tsx` (the floating `map-control-my-location` button) — it already calls `requestLocation()`; now also reflects state. Scope boundary with 9.6 recorded in Completion Notes (9.5 = behaviour on the floating control; 9.6 owns chrome consolidation).
  - [x] **(b) Locate button pending/denied feedback.** `aria-busy="true"` + `data-locate-state` (idle/pending/success/fallback) + a `motion-safe:animate-pulse` icon on pending; the button stays clickable on `fallback` to retry. Used `'fallback'` as the honest "couldn't place you" signal — did NOT add a distinct `'denied'` status (noted in Completion Notes).
  - [x] **(c) SW stale-shell → single reload on activated update.** New `hooks/useServiceWorkerUpdate.ts` (`registerServiceWorkerUpdateReload` + `useServiceWorkerUpdateReload`), wired into `ServiceWorkerProvider`. `controllerchange` → ONE `location.reload()`, `refreshing` latch (no loop), first-install guard (no prior controller → no reload), cleanup detaches. Closes the 7.3 deferred item — assessment in Completion Notes.
  - [x] **Do NOT change the SW caching strategy.** `app/sw.ts` untouched; update/reload affordance only.

- [x] **Task 5 — Unit / component / e2e tests for THIS story's four fixes**
  - [x] **AC1.** Un-skipped `OnboardingGate.synchronous.atdd.test.tsx` (7 tests) + updated the stale placeholder-SSR assertion in `OnboardingGate.test.tsx` to the new synchronous behaviour. First-render real screen, early-click→`requestLocation`, returning-user null, `getServerSnapshot=false` SSR-safe, forced-state, dual inert/aria-hidden.
  - [x] **AC2.** Un-skipped `UserLocationLayer.atdd.test.tsx` (7 tests) + added a MapView-level gating describe (3 tests: success threads status/coords, fallback threads status, offline shell unmounts the layer).
  - [x] **AC3.** Un-skipped `VenueListApproximateDistance.atdd.test.tsx` (4 tests). Tightened one scaffold assertion (`getByText('250 m')` vs the over-broad `/\d/`). Key auto-covered by `messages-parity.test.ts`.
  - [x] **AC4.** Un-skipped `LocateAndSwReload.atdd.test.tsx` (5 tests). Completed two scaffold stubs (map `.on`/`.off`; whole-`window.location` swap for the non-configurable `reload` in this jsdom). Un-skipped the `onboarding.spec.ts` RED e2e block (clean-context reliability) for CI.

- [x] **Task 6 — Test gate + regression verification (standard gate)**
  - [x] `npx tsc --noEmit` → 0 · `npx eslint . --quiet` → 0 · `npx vitest run` → 92 files / 801 tests all green (baseline 88 files/772 from the 9.4 record + the 4 ATDD scaffolds already present skipped; now all 16 prior-skipped tests active + 3 new MapView AC2 tests — none dropped).
  - [x] **No regression** in OnboardingGate/OnboardingScreen/useGeolocation/MapView/VenuePinLayer/VenueCard/messages-parity suites; the 9.4 `coordsSettled` query-gating untouched.
  - [x] **Visual gate (manual affordance).** Captured to a Windows-safe path + reproduced the gate's claude-sonnet-4-6 comparison byte-identically. onboarding mobile + desktop = PASS (clean first paint, no map-flash). map-primary FAILs are pre-existing STALE-reference drift (shipped search bar / nav / language switcher / desktop planner card), NOT 9.5, and never mention the dot (gate ignores it as map content; dot verified correct via DOM inspection + crop). The new map-with-user-location-dot state has NO reference PNG — routed to maintainer rebaseline (dev forbidden from self-blessing; captures logged in Completion Notes). Details in Completion Notes.
  - [x] Move Status to `review` (story file + sprint-status). The orchestrator owns gate/commit/PR.

## Dev Notes

### Why this exists (root cause — Spine 5 of the Epic 9 triage)

Per the Epic 9 party-mode triage (epics.md:2348, root cause #5): **"Onboarding gate renders a non-interactive placeholder on first paint** (`OnboardingGate.tsx`), with the real screen portalled in only after client hydration of a `localStorage`-gated effect — causing both the brief 'map flashes before the welcome overlay' and the intermittent 'Use my location did nothing' dead-click, compounded by a service-worker stale-shell window."

The mobile live smoke-test (epics.md:2360) added a second symptom: **"Onboarding did not gate a fresh automated session"** — the live site loaded straight to the map with no welcome overlay in a clean (empty-`localStorage`) Playwright context. This story must verify a true new user reliably sees the welcome screen (the Task 5 clean-context e2e is the proof).

This is the test-design **R-004** story (test-design-epic-9.md:334-340, score 6): "Onboarding-gate hydration flash + dead locate click." Mitigation = synchronous first-render read (cookie / `useSyncExternalStore`) + wire the real locate button immediately + force/prompt reload on activated SW update + honest fallback labels. Owner: Dev. Verification: clean-localStorage Playwright context reliably shows the welcome overlay + component test for immediate locate-button presence + UserPin on success.

### The exact current defect (read these before touching code)

- **The placeholder window** — `OnboardingGate.tsx:71-79`: `hasReadFlag` starts `false`; the flag is only read in a mount `useEffect`. While `!hasReadFlag && !dismissed` the gate returns `OnboardingGatePlaceholder` (`OnboardingGate.tsx:180-191`), a `aria-hidden="true"` div with the CTA rendered as a plain `<div>` (NOT a `<button>`, NO handler — `OnboardingGate.tsx:252-255`). Only after the effect flips `hasReadFlag` does the real, portalled `OnboardingScreen` mount (`OnboardingGate.tsx:193-203`). That two-phase render is the flash + the dead-click.
- **The real screen IS already correct once it mounts** — `OnboardingScreen.tsx` has the wired `AmberCTAButton` → `handleUseLocation` → `geolocation.requestLocation()` (`OnboardingScreen.tsx:86-92, 176-186`) with a `pending` pulse, a skip link → centrum, and a phase/exit timer. The fix is to make THIS screen the first frame, not the placeholder.
- **The geolocation hook is the single source of truth** — `useGeolocation.tsx`: `status: 'idle' | 'pending' | 'success' | 'fallback'`, `coords` always defined (starts at `GOTHENBURG_CENTRE`). `success` = real GPS; `fallback` = centrum (denied / timeout / skip / no-geolocation). The returning-user auto-acquire (`useGeolocation.tsx:124-176`) reads the SAME `ONBOARDED_FLAG_KEY` localStorage flag the gate writes — if you move the gate to a cookie, the hook's flag read still works (keep localStorage as the channel) OR update the hook in lockstep; do NOT let the two drift (the flag key is centralised in `lib/constants/onboarding.ts` precisely to prevent drift).
- **`MapView` already has everything for the dot** — `geolocation` (`MapView.tsx:120`), the `{!showOfflineShell && (…)}` venue-tree block (`MapView.tsx:823-825`), and the `VenuePinLayer` pattern to copy. The dot is purely additive.
- **The SW** — `app/sw.ts:213-214` (`skipWaiting`/`clientsClaim`), `app/ServiceWorkerProvider.tsx` (`SerwistProvider`, `disable` in dev). No update prompt exists today.

### Recommended hydration-strategy decision (the explicit Task 1 decision)

**Default = `useSyncExternalStore`** keyed on the existing `readFlag()` snapshot, with `getServerSnapshot = false`. Rationale: it keeps `localStorage` as the source of truth (no new cookie, no SSR plumbing, no privacy-cookie documentation burden), gives a synchronous client first-frame read (kills the placeholder window), and lets the existing cross-tab `storage` listener become the store's `subscribe`. The one risk is the returning-user hydration transition (server `false` → client `true`) painting two frames; the welcome overlay is a full-screen cover so the worst case is a single overlay frame that resolves to `null` — still strictly better than today. **If that transition visibly flashes the map, fall back to the server-readable cookie** (truly zero hydration flash because the server HTML already knows), accepting the cookie-documentation cost (functional/GDPR-exempt, NOT consent-gated — reconcile with architecture.md:56). Record which path you took and why in Completion Notes; this is the story's headline decision.

### Visual gate on this host (HOST TOOLING BUG — applies to every Epic 9 frontend story)

`.claude/scripts/visual-validate.sh` screenshots via a `mktemp /tmp/impl-XXXXXX.png` path the Windows-native Playwright binary CANNOT write, so the AUTOMATED visual gate always errors "Could not screenshot dev server" on this host (retro-notes 9-2 / confirmed again in 9-4). Use the documented manual affordance: `VISUAL_VALIDATE_PROVIDER=none ALLOW_MANUAL_VISUAL_VALIDATION=1`, reproduce the gate's comparison byte-identically (same claude-sonnet-4-6 reviewer + verbatim prompt + on-disk reference PNG vs the corrected dev-server render captured to a Windows-safe path), and record the rationale in Completion Notes. **Leave the gate script UNMODIFIED** (maintainer should make the temp path Windows-portable — out of this story's scope). Also beware the **stale Turbopack CSS cache trap** (retro-notes 9-2): a running `next dev` can keep serving old CSS after an edit — a full `.next` wipe + restart may be needed before capturing; verify the served chunk before any visual capture.

This story differs from 9.4: it is NOT a no-visual-change story. The new user-location dot is a genuinely new visual element and the first-paint behaviour change is observable, so the gate is a real PASS, not a "renders identically" confirm. The `onboarding` reference (`docs/design/references/screens/{mobile,desktop}/onboarding.png`) and the `map-primary` references are the comparison baselines. Note the existing deferred caveat: the DESKTOP `onboarding.png` baseline is implementation-derived, not designer-blessed (deferred-work.md "Deferred from: Story 1.5", 2026-05-04) — it cannot catch desktop onboarding regressions; do not treat a desktop onboarding pass as authoritative. There is NO existing reference PNG for the map-with-user-location-dot state — capturing one is a NEW baseline; the dev agent must NOT self-bless it (route to maintainer rebaseline sign-off; the dev is forbidden from editing references).

### Constraints carried from Epic 9 retro-notes (binding)

- **Story 9.0 production-gates `?_time=`/`?_date=`** in production (`AppContextProviders.tsx`, mirroring `lib/dev/use-forced-state.ts`). The OnboardingGate is part of the SAME first-paint surface and reads `useForcedState()` (`OnboardingGate.tsx:61`) for the dev `?_state=onboarding` branch. Whatever first-render strategy you pick, the prod DCE pattern must hold: the dev-only forced-state read must not pull dev tooling into the prod bundle, and the synchronous onboarded read must not depend on a dev-only param. (Convention from 9.0: a two-component split — default providers for prod + dev-search-param providers for dev/test — keeps `useSearchParams` reads DCE-eligible. If your strategy reads any URL/dev signal, reuse that convention; the plain `localStorage`/cookie read does not need it.)
- **Story 7.3 PWA is the SW context** for the stale-shell window (AC4c): Serwist SW served at `/serwist/sw.js` via `app/serwist/[path]/route.ts` (`Service-Worker-Allowed: /` root-scope claim), registered by `app/ServiceWorkerProvider.tsx`, `disable`d in dev. The offline shell (`MapView` `showOfflineShell` branch + `OfflineBanner`) is the 7.3 surface — do not disturb it; AC4 adds an UPDATE/reload affordance only.
- **Story 9.4 just landed the query-gating** that reads `geolocation.status` (`coordsSettled = status === 'success' || 'fallback'`, `MapView.tsx:174-175`). 9.5 must NOT change the venue-query firing — it changes the onboarding gate, adds the dot, and adds honest labels. The `geolocation` hook API surface (status/coords/requestLocation/useCentrum) is the contract both stories share; do not break it.

### Deferred-work items folded in (only onboarding / geolocation / SW / first-paint overlaps)

- **`OnboardingGate` desktop-onboarding visual baseline is implementation-derived, not designer-blessed** (deferred-work.md, "Deferred from: Story 1.5", 2026-05-04, Target: None — conditional) — the desktop `onboarding.png` reference was auto-captured from the Story-1.5 implementation, so the visual gate cannot catch desktop onboarding regressions. RELEVANT to this story's first-paint visual gate: treat the desktop onboarding pass as non-authoritative. Do NOT re-bless or "fix" this baseline as part of 9.5 (it remains a conditional deferred item with no target).
- **SW `skipWaiting` + `clientsClaim` can break open tabs across a deploy** (deferred-work.md, "Deferred from: code review of 7-3", Target: None — conditional; triggers if a deploy lands while users hold open tabs and chunk-load errors appear) — `app/sw.ts:213-214`. DIRECTLY overlaps AC4c. The AC4 controllerchange-driven reload prompt is the natural mitigation; if you add it, note in Completion Notes whether it closes this deferred item (the SM removes it per the queue convention) or only partially addresses it. Do NOT change the SW to a conservative wait-until-tabs-close strategy unless that turns out to be the cleaner AC4 implementation — that's a design call worth flagging.
- **`inert` on the failed map canvas lacks a paired `aria-hidden`** (deferred-work.md, 7-3 R1, Target: None — conditional) is noted there as "`OnboardingGate` sets both `inert` and `aria-hidden`" — confirming the gate's `data-app-shell` blocking effect (`OnboardingGate.tsx:151-176`) is the belt-and-suspenders reference. Preserve that dual `inert` + `aria-hidden` behaviour through your Task 1 refactor (do not drop one).
- _(Not folded in — out of subject:_ the offline-blip subtree-unmount debounce, cold-offline map→sand fallback, `app/sw.ts` not type-checked, and the venue-card/about contrast debt are unrelated to onboarding/geolocation/SW-update/first-paint and are NOT reopened here.)_

### Project / file-impact map (expected touch list — confirm during dev)

- **Edit** `nextjs-app/components/custom/onboarding/OnboardingGate.tsx` — synchronous first-render strategy; remove/bypass the non-interactive placeholder; preserve forced-state + `data-app-shell` inert + dismiss/flyTo/flag-write semantics.
- **Possibly edit** the Server Component pages that mount the gate — `nextjs-app/app/[locale]/page.tsx` AND `nextjs-app/app/[locale]/favoriter/page.tsx` (both Server Components) — ONLY if the cookie option is chosen (read `cookies()` from `next/headers`, pass `initialOnboarded` into `OnboardingGateWithSuspense`). Thread BOTH or the `/favoriter` deep link regresses. **Note:** `nextjs-app/app/[locale]/layout.tsx` DOES exist and wraps `{children}` in `<ResponsiveLayout>` (the `[data-app-shell]` div), so `<OnboardingGateWithSuspense />` is nested INSIDE the subtree the gate makes `inert` — the gate's `shouldBlockAppShell` is gated on `mounted` (only inert once the overlay has portalled out to `document.body`) to avoid a same-commit dead-click.
- **New** `nextjs-app/components/custom/map/UserLocationLayer.tsx` + `nextjs-app/components/custom/map/UserPin.tsx` (model on `VenuePinLayer.tsx` / `VenuePin.tsx`).
- **Edit** `nextjs-app/components/custom/map/MapView.tsx` — mount `<UserLocationLayer />` gated on `status === 'success'` inside the `{!showOfflineShell}` block; thread `locationIsApproximate` to the list.
- **Edit** `nextjs-app/components/custom/venue/VenueList.tsx` (and possibly `VenueCard.tsx` / `VenueQuickInfo.tsx`) — honest approximate-distance label on fallback.
- **Edit** `nextjs-app/messages/sv/venue.json` + `nextjs-app/messages/en/venue.json` — new "≈ från centrum" key (parity-guarded).
- **Possibly edit** `nextjs-app/hooks/useGeolocation.tsx` — ONLY if you add a `'denied'` status distinct from `'fallback'` for AC4b copy (flag in Completion Notes).
- **Edit** `nextjs-app/app/ServiceWorkerProvider.tsx` (and/or a small new SW-update hook) — controllerchange→reload prompt for AC4c. Do NOT change `app/sw.ts` caching.
- **Possibly edit** `nextjs-app/components/custom/map/MapControls.tsx` / `VenueSearchShell.tsx` — locate-button pending/denied feedback (coordinate the surface ownership with Story 9.6; 9.5 owns behaviour, 9.6 owns chrome).
- **Tests:** extend `test/components/OnboardingGate.test.tsx`, `test/e2e/onboarding.spec.ts`; add `UserLocationLayer`/`UserPin` + `MapView` dot tests; add the approximate-label test; add the SW-update-reload test. New keys auto-covered by `test/unit/messages-parity.test.ts`.

### Technical stack (verified — do not drift)

Next.js 16.2.2 (Turbopack-default) + React 19 + Tailwind v4 (CSS-first tokens) + Motion 12.x (`motion/react`, NOT `framer-motion`) + MapLibre GL JS 5.x + TanStack Query 5.x + next-intl + Serwist (via `@serwist/turbopack`; `@serwist/next` was never installed). `useSyncExternalStore` is a stable React 18+/19 API (no import gymnastics — `import { useSyncExternalStore } from 'react'`). MapLibre `Marker` + `setLngLat` is the marker-update API (already used by `VenuePinLayer`). The `frontend-component` skill applies to the new `UserPin`/`UserLocationLayer` (design-system-first: prefer tokens, follow DESIGN.md, honor reduced-motion if you animate the dot's appearance).

### Project Structure Notes

- New map-layer components belong in `nextjs-app/components/custom/map/` alongside `VenuePinLayer.tsx` / `VenuePin.tsx` (architecture.md component map: Map + Pins → `custom/map/*`, `useGeolocation` — architecture.md:974).
- Onboarding components live in `nextjs-app/components/custom/onboarding/` (architecture.md:796-798). Note architecture.md references a `LocationPermission.tsx` that does NOT exist in the current tree (the permission flow lives inside `OnboardingScreen.tsx` + `useGeolocation.tsx`) — do NOT create `LocationPermission.tsx`; that was a planning-time placeholder. Extend the existing files.
- i18n message files: `nextjs-app/messages/{sv,en}/venue.json` (and `common.json` if a shared "from centre" string is more appropriate — but venue-distance copy belongs in `venue.json`).

### References

- [Source: CLAUDE.md] + [Source: AGENTS.md] — root agent rulebook (local Docker/WSL rules, repo conventions).
- [Source: project-context.md] — design + screen map (AI rules, screen inventory).
- [Source: nextjs-app/docs/design/DESIGN.md] — design tokens (amber colours, transitions/`--duration-*`, reduced-motion conventions); consult for the closest token to the `#d97706` UserPin dot.
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:63,190,720-735] — geolocation-as-critical-onboarding-gate principle; first-time flow (Onboarding → "Använd min plats" → permission); the `onboarding (mobile)` screen spec (CTA → grant → map centred on user / deny → map centred on Gothenburg centrum, 300ms fade).
- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.5: Location & Onboarding Reliability] — ACs + Design Gate Criteria (verbatim).
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9 root cause #5 (line 2348) + mobile smoke-test addendum (line 2360)] — the placeholder/flash/dead-click/SW-stale-shell root cause + the clean-context onboarding-gate gap.
- [Source: _bmad-output/test-artifacts/test-design/test-design-epic-9.md#R-004 (lines 334-340) + P0 rows (lines 173-175)] — risk, mitigation, verification, test ideas (Component + E2E for the gate; Component for the wired button + UserPin).
- [Source: _bmad-output/auto-bmad/retro-notes/epic-9.md#Story 9-2 (visual-validate /tmp host bug) + Story 9-0 (prod-gate of ?_time/?_date) + general 9.5/9.6/9.9 frontend note] — binding host-tooling + first-paint constraints.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md#Story 1.5 desktop-onboarding baseline + 7-3 SW skipWaiting/clientsClaim + 7-3 inert/aria-hidden] — folded-in overlaps.
- [Source: nextjs-app/components/custom/onboarding/OnboardingGate.tsx:17-203] — the placeholder/flag/portal defect + the semantics to preserve.
- [Source: nextjs-app/components/custom/onboarding/OnboardingScreen.tsx:86-92,176-186] — the already-wired CTA the first frame must expose.
- [Source: nextjs-app/hooks/useGeolocation.tsx:16-176] — status/coords contract + returning-user auto-acquire reading the same onboarded flag.
- [Source: nextjs-app/components/custom/map/MapView.tsx:120,174-175,823-825] — geolocation consumption, the 9.4 coordsSettled signal to not break, the venue-tree block where the dot mounts.
- [Source: nextjs-app/components/custom/map/VenuePinLayer.tsx:1-75] — the marker-layer pattern to model UserLocationLayer on.
- [Source: nextjs-app/docs/design/references/claude-design/project/src/Pins.jsx:110-133] — the UserPin reference (amber #d97706 dot + halo).
- [Source: nextjs-app/components/custom/venue/VenueList.tsx + nextjs-app/messages/{sv,en}/venue.json] — distance render + i18n keys for the honest-label task.
- [Source: nextjs-app/app/sw.ts:213-214 + nextjs-app/app/ServiceWorkerProvider.tsx] — the SW skipWaiting/clientsClaim + registration provider for the AC4c reload affordance.
- [Source: _bmad-output/planning-artifacts/architecture.md:41,49,56,543-548,974,1066] — provider tree, geolocation fallback coords, privacy/no-consent-cookie NFR, component map.

## Dev Agent Record

### Agent Model Used

Amelia (BMAD dev-story) / Claude Opus 4.8 (claude-opus-4-8).

### Debug Log References

- Gate: `npx tsc --noEmit` → 0 errors · `npx eslint . --quiet` → 0 errors · `npx vitest run` → 92 files / 801 tests, 0 failures, 0 skipped.
- Visual: dev server captured (port 3000, `.next` wiped first to dodge the stale-Turbopack-CSS trap) → screenshots to a Windows-safe scratch path → manual reproduction of `.claude/scripts/visual-validate.sh`'s claude-sonnet-4-6 comparison (verbatim prompt).

### Completion Notes List

**Headline decision — hydration strategy (Task 1): `useSyncExternalStore` (the recommended default).** Replaced the `useState(false)` + mount-`useEffect` flag read with `useHasOnboarded()` = `useSyncExternalStore(subscribe, readFlag, getServerSnapshot=false)`. `readFlag()` runs synchronously on the client first render, so the gate knows `hasOnboarded` on frame #1 — the placeholder-then-portal window is gone, which kills BOTH the map-flash-before-overlay AND the dead "Use my location" click in one move. `subscribe` wires the existing cross-tab `storage` listener (Story 7.3 Task 8.2 preserved). `getServerSnapshot=false` shows the welcome overlay on the server frame (never leaks the map under a privacy choice). Empirically the returning-user transition does NOT flash the map (verified on the dev server), so the cookie alternative was NOT needed — no SSR cookie plumbing, no functional-cookie privacy documentation burden, `localStorage` stays the single source of truth.

**Two refinements the synchronous read forced (both worth a reviewer's eye):**
1. **Session latch.** With a synchronous snapshot, the same-tab `writeFlag()` on grant/deny would flip `liveHasOnboarded` true on the very next render and yank the overlay out BEFORE its exit fade — a regression the old gate avoided for free (its `writeFlag` never touched local state). Fix: latch the first-frame value in a `useState(() => liveHasOnboarded)` and drive `shouldShow` off the latch; a `wroteFlagThisSessionRef` distinguishes our own write from a genuine cross-tab onboarding (the latter still dismisses via a small effect). Net: exit animation + dismiss/flyTo/flag-write semantics all preserved; cross-tab sync preserved.
2. **Portal-after-mount.** The overlay MUST portal to `document.body` to escape the `[data-app-shell]` subtree this gate makes `inert` (otherwise it would inert ITSELF — reintroducing the dead-click). `createPortal` is browser-only and jsdom's `renderToString` has a `document`, so the old `typeof document` guard SSR-errored once the real screen (not the placeholder) became the server output. Fix: render the screen inline on the server frame + the first hydration render, flip a `mounted` flag in an effect, then portal. A fixed full-screen overlay is visually identical inline vs portalled, so the one-frame inline render is invisible. (Minor: Playwright with `domcontentloaded` can catch the brief inline+portal double; at `networkidle` it reconciles to exactly one `onboarding-screen` under `<body>` — confirmed.)

**AC2 token gap (recorded as instructed, no new token invented):** the reference `UserPin` fill `#d97706` (Tailwind amber-600) has NO exact DESIGN.md token — closest are `--color-amber-pin #f1b100` and `--color-amber-primary #ffbf00`, neither a match. `#d97706` was bumped to `#b45309` for the bottom-nav *tab* token in Story 1.6 for AA contrast, but the user dot is a non-text decorative `pointer-events:none` element so contrast rules don't apply. Used the raw reference value `#d97706` per the story's frontend-component guidance. **Token-gap follow-up for the maintainer: consider adding a `--color-amber-dot`/`--color-user-pin` token if the user dot recurs.**

**AC3 scope note:** honest-distance label is wired on the `VenueList`/`VenueCard` path (the AC3 surface — distances + "Närmast" sort). `VenueQuickInfo` distance was left unchanged deliberately: it is a single-venue secondary surface, not covered by the AC3 test, and Story 9.9 owns the mobile quick-info rework — touching its intricate anchored-mobile/desktop distance variants now would collide with 9.9. Flagged here so 9.9 can fold the same label in if wanted.

**AC4(a) — locate surface touched (coordination with Story 9.6):** I wired pending/fallback feedback on the FLOATING `MapControls` locate button (`data-testid="map-control-my-location"`) — `aria-busy` + `data-locate-state` + a pulse icon; it stays clickable on `fallback` to retry. I did NOT touch the top-bar locate surface (`VenueSearchShell`) and did NOT remove the duplicate floating pair — **that chrome consolidation is Story 9.6's job.** 9.6 should decide which locate control survives; the BEHAVIOUR (request + state reflection) now lives on the floating control and the new `GlassButton` `busy`/`dataLocateState` props are reusable wherever the surviving button lands. Used `'fallback'` as the denied signal — did NOT add a distinct `'denied'` status to `useGeolocation` (the hook still collapses PERMISSION_DENIED + timeout → `fallback`); flag for the maintainer if distinct "enable it in settings" copy is wanted later.

**AC4(c) — does it close the 7.3 deferred item? YES (closes it).** The new `controllerchange → single reload` handler is the direct mitigation for deferred-work.md "SW `skipWaiting` + `clientsClaim` can break open tabs across a deploy → `ChunkLoadError`". When a fresh deploy's SW activates and claims an open tab (firing `controllerchange`), we force ONE reload so the fresh shell + renamed chunks are served before the stale tab lazy-imports a chunk the deploy renamed. Guards: `refreshing` latch (no reload loop), first-install guard (no prior controller ⇒ nothing stale ⇒ no reload), SSR/unsupported/dev-disabled no-op, cleanup detaches. The SW caching strategy (precache-only) is untouched. **Recommendation: the SM may remove that deferred-work entry — it is now mitigated at the controllerchange seam.** (Strictly, this addresses the cross-deploy stale-tab/chunk-load window via reload rather than by changing the SW's claim strategy, which the deferred item explicitly left as the open question; the reload is the lighter, recommended fix and fully covers the user-visible symptom.)

**Test-scaffold resolutions (the two flagged prop-contract assumptions + jsdom fixes):** (a) `UserLocationLayer` consumes `status`/`coords` PROPS (the scaffold's primary assumption) — MapView threads `geolocation.status`/`.coords`; kept that contract. (b) AC4(a) asserts BOTH `aria-busy` and `data-locate-state` — I implemented both, so both assertions hold. jsdom fixes inside the (permitted) test scaffolds: added `.on`/`.off` to the AC4 stub map; swapped the whole `window.location` (jsdom marks `.reload` non-configurable) for the SW-reload spy; tightened the AC3 "number not hidden" assertion from `/\d/` (multiple matches) to the concrete `'250 m'`.

**Visual gate (manual affordance — host `/tmp` bug):** `.claude/scripts/visual-validate.sh` screenshots via `mktemp /tmp/impl-XXXXXX.png`, unwritable by the Windows Playwright binary (retro-notes 9-2/9-4). Reproduced the gate's comparison byte-identically (same claude-sonnet-4-6, verbatim prompt, on-disk reference PNG vs a corrected dev-server render captured to a Windows-safe path). Results:
- `onboarding` mobile = **PASS** ("correct gradient, logo, headline, subtitle, location button, skip link, footer all present and positioned"). `onboarding` desktop = **PASS** ("pixel-perfect match"). → AC1 "clean first paint of the welcome screen, no map-flash" gate item PASSES.
- `map-primary` mobile/desktop = FAIL, but the FAILs are **pre-existing STALE-reference drift, NOT 9.5**: they call out the shipped search bar, the current TimeSliderPanel layout, the two-tab bottom nav, the SV/EN language switcher (PR #14), and the desktop planner card — all shipped chrome the May-31 `map-primary.png` predates. **None mention the user-location dot** (the gate ignores it as map content). The dot itself is verified correct independently: DOM-computed `rgb(217,119,6)` = `#d97706`, 18×18, `3px solid #fff`, single marker, plus a cropped capture showing the amber dot + halo exactly matching `Pins.jsx:110-133`.
- **MAINTAINER REBASELINE REQUEST (dev forbidden from self-blessing references):** there is NO reference PNG for the map-with-user-location-dot state — it is a NEW baseline. Captured for review at `…/scratchpad/map-user-location-dot.{mobile,desktop}.png` and `…/scratchpad/dot-crop.mobile.png`. Please rebaseline (or add a new `map-user-location` screen ref) before treating the dot's visual gate as authoritative. Also note the pre-existing conditional deferred item: the desktop `onboarding.png` baseline is implementation-derived (Story 1.5), so the desktop onboarding PASS is non-authoritative — not re-blessed here.

### File List

**Source — new:**
- `nextjs-app/components/custom/map/UserPin.tsx` — presentational amber user-location dot (design reference exact).
- `nextjs-app/components/custom/map/UserLocationLayer.tsx` — single-marker MapLibre layer, gated on `status === 'success'`.
- `nextjs-app/hooks/useServiceWorkerUpdate.ts` — `registerServiceWorkerUpdateReload` + `useServiceWorkerUpdateReload` (controllerchange → single reload, AC4c).

**Source — modified:**
- `nextjs-app/components/custom/onboarding/OnboardingGate.tsx` — `useSyncExternalStore` synchronous gate; deleted `OnboardingGatePlaceholder`; session latch + portal-after-mount; preserved forced-state + inert/aria-hidden + dismiss/flyTo/flag-write.
- `nextjs-app/components/custom/map/MapView.tsx` — mount `<UserLocationLayer status coords />`; derive + thread `locationIsApproximate` to both VenueList instances.
- `nextjs-app/components/custom/map/MapControls.tsx` — locate-button `aria-busy`/`data-locate-state`/pulse feedback; `GlassButton` gains `busy`/`dataLocateState`.
- `nextjs-app/components/custom/venue/VenueList.tsx` — `locationIsApproximate` prop threaded to `VenueCard`; new `distanceApproximate` label passed.
- `nextjs-app/components/composed/venue/VenueCard.tsx` — `distanceIsApproximate` prop + `distanceApproximate` label; honest "≈ från centrum" annotation in both layouts.
- `nextjs-app/app/ServiceWorkerProvider.tsx` — calls `useServiceWorkerUpdateReload()` (AC4c wiring).
- `nextjs-app/messages/sv/venue.json` — `list.distanceApproximate: "≈ från centrum"`.
- `nextjs-app/messages/en/venue.json` — `list.distanceApproximate: "≈ from centre"`.

**Tests — un-skipped / extended:**
- `nextjs-app/test/components/OnboardingGate.synchronous.atdd.test.tsx` — un-skipped (AC1, 7 tests).
- `nextjs-app/test/components/OnboardingGate.test.tsx` — updated stale placeholder-SSR assertion to the synchronous behaviour.
- `nextjs-app/test/components/UserLocationLayer.atdd.test.tsx` — un-skipped + static import (AC2, 7 tests).
- `nextjs-app/test/components/MapView.test.tsx` — `UserLocationLayer` mock + new AC2 gating describe (3 tests).
- `nextjs-app/test/components/VenueListApproximateDistance.atdd.test.tsx` — un-skipped (AC3, 4 tests) + tightened one assertion.
- `nextjs-app/test/components/LocateAndSwReload.atdd.test.tsx` — un-skipped + static import + jsdom stub fixes (AC4, 5 tests).
- `nextjs-app/test/e2e/onboarding.spec.ts` — un-skipped the clean-context RED block (for CI Playwright).

**Sprint tracking:**
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `9-5-location-onboarding-reliability`: ready-for-dev → in-progress → review.

## Open Questions

1. **Hydration-strategy transition flash (Task 1):** the `useSyncExternalStore` default has a theoretical returning-user hydration transition (server `false` overlay → client `true` null). It should resolve in a single full-screen-cover frame, but if it visibly flashes the map on real hardware the cookie fallback is the answer. The dev decides empirically during implementation; no human input needed unless BOTH approaches flash (they should not — the cookie path is flash-free by construction).
2. **AC4 denied-vs-fallback granularity:** `useGeolocation` collapses hard `PERMISSION_DENIED` and timeout/unavailable into a single `'fallback'` status. AC4 says "the locate button shows pending/denied feedback" — `'fallback'` is an honest "we couldn't place you" signal and is likely sufficient. If the maintainer wants distinct "permission denied — enable it in settings" copy vs "we couldn't find you — retry", that needs a small hook extension (`'denied'` status from `error.code`). Dev default: use `'fallback'` as the denied signal; flag if a distinct `'denied'` status is added. (Not a blocker.)
3. **Locate-button surface ownership vs Story 9.6:** 9.5 owns locate BEHAVIOUR (request + feedback), 9.6 owns CHROME CONSOLIDATION (removing the duplicate floating pair, enabling the top-bar gear). If the dev finds the surfaces tangle, the clean split is: 9.5 makes the EXISTING locate control(s) reliable; 9.6 decides which survive. Coordinate via Completion Notes; not a blocker.
4. **New map-with-user-location-dot reference PNG:** no baseline exists for the dot state. Capturing one is a maintainer rebaseline decision (the dev agent is forbidden from self-blessing references). Expect to route this to maintainer sign-off at QA handoff — flag it, do not block dev on it.

### Review Findings

_Thin (Tier-A, epic-mode) review — R=1, Acceptance Auditor lens + dedicated Security review. Blind/Edge Hunters intentionally NOT run in Tier A (their absence is by-design, not a failed layer). Verdict: Changes Requested. Findings: 0 Critical, 0 High, 2 Medium, 4 Low → after triage/dedup: 1 Patch, 2 Defer, 0 Decision, 3 Dismissed (noise). Security: 0._

**Patch**

- [x] **[Review][Patch][Med] RESOLVED — `shouldBlockAppShell` inerts `[data-app-shell]` while the overlay is still rendered inline inside it — a load-bearing (not cosmetic) same-commit dead-click window for an onboarding-RELIABILITY story.** The spec file-impact map (line 118) is factually wrong: `nextjs-app/app/[locale]/layout.tsx` DOES exist and wraps `{children}` in `<ResponsiveLayout>` (the `[data-app-shell]` div), so `<OnboardingGateWithSuspense />` is nested *inside* the subtree the gate makes `inert`. On the first client commit the overlay renders inline (`OnboardingGate.tsx:265`, `mounted === false`), and in that same commit's passive-effect phase the inert effect (`OnboardingGate.tsx:225-250`, keyed on `shouldBlockAppShell = shouldShow`) sets `inert` on `[data-app-shell]` BEFORE the `setMounted(true)` re-render (`OnboardingGate.tsx:141-143`) relocates the overlay to `document.body` via `createPortal`. For that one-frame window the wired "Use my location" button sits under an `inert` ancestor → pointer/focus are no-ops → the exact dead-click AC1 exists to eliminate. The escape currently rests on effect-ordering timing, not structure. **Fix:** make the escape structural — gate the shell-blocking on `mounted` so the shell is only inerted once the overlay has portalled out: change `OnboardingGate.tsx:223` to `const shouldBlockAppShell = shouldShow && mounted;` (verified: when `mounted` flips true the same re-render both portals the overlay to body and arms the inert effect, so the shell is never inert while the overlay is inline; forced-state / dismiss / cross-tab / cleanup semantics unchanged). Also correct the false "there is NO `[locale]/layout.tsx`" claim in the spec file-impact map (line 118). — **RESOLUTION:** `OnboardingGate.tsx:223` changed to `const shouldBlockAppShell = shouldShow && mounted;` (structural escape — the shell is only inerted once `mounted` flips true, which is the same re-render that portals the overlay to `document.body`). File-impact map line 118 corrected: `[locale]/layout.tsx` DOES exist and wraps `{children}` in `<ResponsiveLayout>`. New test added in `OnboardingGate.synchronous.atdd.test.tsx` ("portals the interactive overlay OUT of the inert `[data-app-shell]` subtree") locking the end-state invariant: whenever the shell carries `inert`, the interactive overlay + CTA are NOT descendants of it (portalled to `document.body`). Note: the transient same-commit inline frame the fix removes is a browser paint concern jsdom flushes away inside `act()` — it is not unit-observable; the clean-context e2e onboarding spec is the behavioural dead-click guard. Full suite re-verified green (96 files / 817 tests).

**Defer**

- **[Review][Defer][Med] AC3 honest-distance label not applied to the `VenueQuickInfo` single-venue surface** — DELIBERATE deferral. `distanceIsApproximate` reaches only `VenueList → VenueCard`; `VenueQuickInfo` still renders an unqualified distance on the Gothenburg-centrum fallback, so AC3's "distances … honest" clause is not fully closed on that secondary surface. The dev flagged it and the primary AC3 surface (list + "Närmast" sort) is honest. Story 9.9 owns the mobile quick-info rework; folding the label there avoids colliding with 9.9's anchored-mobile/desktop distance variants. *(Target: 9.9 — Venue Quick-Info Rework)*
- **[Review][Defer][Low] AC4 hard `PERMISSION_DENIED` is collapsed into `'fallback'`, so a denied user is indistinguishable from a timeout and cannot be shown an "enable it in settings" path** — `useGeolocation.tsx:108-121` maps both `PERMISSION_DENIED` and timeout/unavailable to `'fallback'`; `MapControls.tsx:135` emits identical `data-locate-state="fallback"` for both. The retry affordance (AC4's core intent — "instead of silently using the fallback") IS present and the button stays clickable, so this is a literal-vs-implemented gap, not a defect. Distinct denied-vs-fallback copy needs a hook extension (`'denied'` status from `error.code`) — already recorded as Open Question 2 and a maintainer follow-up. *(Target: None — conditional; only triggers if distinct "permission denied — enable it in settings" copy is wanted)*

**Dismissed (noise — recorded, not fixed):**

- **[Low] `data-locate-state`/`aria-busy` added to the shared `GlassButton`** — auditor confirms no functional/a11y defect today (React drops `undefined` attributes; only the locate button passes a value). Cosmetic typing/containment smell, already guarded. Dismissed.
- **[Low] SSR→client returning-user double render (server overlay → client `null`)** — correct-by-construction per the documented `useSyncExternalStore` contract (not a hydration mismatch), strictly better than the prior placeholder-then-portal. Residual "verified-by-eye not by test" risk is hypothetical future regression already acknowledged in the story and routed to maintainer visual sign-off. Dismissed.
- **[Low] Cross-tab dismissal effect elides `initialHasOnboarded`/ref deps from its dependency array** — correct today and test-covered; the elision is deliberate (latch + ref are render-stable/read-latest), tsc/eslint clean. Fragility note, not a live defect, no realistic trigger. Dismissed.
