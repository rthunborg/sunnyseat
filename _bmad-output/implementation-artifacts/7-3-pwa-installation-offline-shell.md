# Story 7.3: PWA Installation & Offline Shell

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to install SunnySeat on my home screen and see something useful when offline,
so that the app feels native and doesn't break without connectivity.

## Context

Final story of **Epic 7 "Polish & Platform"** and of the MVP build. Greenfield PWA wiring: the `serwist` dependency is installed (`package.json` `"serwist": "^9.5.7"`) but **entirely unwired** — there is no service worker, no manifest, no icons, no `next.config.ts` plugin, no `themeColor`. This story stands up the manifest + Serwist service worker (app-shell caching only), the offline shell with the "Ingen anslutning" banner, and the reconnect path, then makes the offline state reachable via the dev `_state` forcing mechanism for the visual gate.

> **Carries FIVE deferred items** (epics.md:2131-2135) that all land naturally in the PWA/offline/platform pass — see Task 8. Each is removed from `deferred-work.md` as it is carried in.

> **Design-decision gaps (surface to maintainer, don't invent).** The UX spec has **no dedicated PWA/offline screen section** — only scattered notes (offline banner = "Ingen anslutning" at top of the map shell; "no offline data caching"). It does **not** specify the banner enter/exit animation, dismissibility, the install-prompt UI, or "Add to Home Screen" copy, and **no `map-primary-offline` visual reference exists**. Where the spec is silent, follow the matter-of-fact error-tone rule (no exclamation/apology/emoji), reuse existing map chrome, and raise anything ambiguous rather than inventing. [Source: ux-design-specification.md error/offline notes; UxMiner]

## Acceptance Criteria

> ACs are verbatim from `epics.md` → Story 7.3 (BDD form). The Design Gate Criteria below are part of the definition of done for this frontend/new-screen story.

**AC1 — Installable PWA.**
**Given** the user visits SunnySeat on a supported mobile browser (iOS Safari, Android Chrome)
**When** PWA criteria are met (service worker, manifest, HTTPS)
**Then** the app is installable via the browser's add-to-homescreen prompt
**And** the web app manifest includes correct app name ("SunnySeat"), icons (192px, 512px), theme colour, and display mode

**AC2 — Service worker app-shell caching.**
**Given** Serwist (successor to next-pwa) is configured
**When** the service worker is registered via `next.config.ts` plugin
**Then** the app shell (HTML, CSS, JS, fonts) is cached for offline display
**And** cache is invalidated on new deployments

**AC3 — Offline shell.**
**Given** the user opens SunnySeat without network connectivity
**When** the app loads offline
**Then** the cached app shell renders (layout, navigation, map background)
**And** an "Ingen anslutning" banner appears at the top of the screen
**And** no venue data, pins, or sun predictions are shown — the app communicates that connectivity is required

**AC4 — Reconnect.**
**Given** network connectivity is restored
**When** the app detects reconnection
**Then** the "Ingen anslutning" banner dismisses and venue data loads normally

**AC5 — Lighthouse PWA.**
**Given** the PWA must meet quality standards
**When** Lighthouse PWA audit runs
**Then** PWA score >= 90 (per PRD technical success criteria)

**AC6 — i18n.**
**Given** all offline UI text uses i18n keys
**When** the locale is Swedish or English
**Then** the "Ingen anslutning" message renders in the correct language

**AC7 — Dev forced-state reachability.**
**Given** the offline state must be reachable in dev mode without toggling real network connectivity
**When** the offline banner component determines its visible state
**Then** it consumes `useForcedState()` from `nextjs-app/lib/dev/use-forced-state.ts` and forces the offline shell when the hook returns `"map-primary-offline"`, in addition to the real `navigator.onLine` check
**And** navigating to `/?_state=map-primary-offline` in development renders the cached app shell, hides venue data, and shows the "Ingen anslutning" banner regardless of actual network state
**And** in production builds the `_state` query parameter is ignored (per the zero-production-footprint contract of Story 1.2)
**And** the visual validation gate can navigate to `/?_state=map-primary-offline` to exercise the `map-primary-offline` screen for both mobile and desktop viewports

### Design Gate Criteria

(Verbatim from epics.md → Story 7.3.)

- **Visual:** Matches active visual reference `map-primary-offline`; first implementation-driven reference may be required if the MVP bundle lacks this state
- **Behaviour:** All interactions and states defined in UX spec §PWA and §offline-shell are implemented
- **Animation:** Offline banner appear/dismiss animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

## Tasks / Subtasks

- [x] **Task 1 — Web app manifest + icons (AC: #1)**
  - [x] 1.1 Create `nextjs-app/app/manifest.ts` (Next.js metadata `MetadataRoute.Manifest`): `name`/`short_name` "SunnySeat", `icons` 192px + 512px, `theme_color` (derive from a design token, e.g. the amber brand color — do NOT invent a raw hex; pull the token value), `background_color`, `display: "standalone"`, `start_url`. [Source: epics.md:2092; architecture.md:868; ArchMiner §8]
  - [x] 1.2 Add the icon assets to `nextjs-app/public/` (192×192 + 512×512, plus a maskable variant and an Apple touch icon for iOS). `public/` currently has no icons. Produce them from the brand mark; if no source mark exists, surface it as a design decision. [Source: CodeMiner — `public/` empty]
  - [x] 1.3 Add `themeColor` + `manifest` to the root metadata (`app/layout.tsx` currently only sets `title`/`description`). [Source: CodeMiner — `app/layout.tsx:21-24`]

- [x] **Task 2 — Serwist service worker wiring (AC: #2)**
  - [x] 2.1 Create the service worker entry `nextjs-app/app/sw.ts` using Serwist (the mandated next-pwa successor — do NOT add next-pwa). Configure **app-shell precaching only**: HTML, CSS, JS, fonts. **No offline data caching** (real-time sun needs connectivity). [Source: architecture.md:409-416; prd.md:320-321; epics.md:2094-2096]
  - [x] 2.2 Wire `withSerwist` into `nextjs-app/next.config.ts`. **Compose with the existing config** — `next.config.ts` currently exports via an async-IIFE that conditionally wraps `withNextIntl` + optional bundle-analyzer; the Serwist wrapper must nest cleanly with both (don't drop `withNextIntl` or the analyzer branch). [Source: CodeMiner — `next.config.ts:24-33`]
  - [x] 2.3 Ensure **cache is invalidated on new deployments** (Serwist revision/precache-manifest hashing or a versioned cache name keyed to the build). Verify a redeploy serves fresh assets, not stale cache. [Source: epics.md:2097; prd.md NFR37]
  - [x] 2.4 Keep the SW from interfering with dev: register only where appropriate (Serwist disables in dev by default) so HMR/Turbopack isn't broken. [Source: architecture.md:409-414]

- [x] **Task 3 — Offline shell + "Ingen anslutning" banner (AC: #3, #6)**
  - [x] 3.1 Create an offline-banner feature component under `components/custom/` that shows a top-of-screen "Ingen anslutning" banner. Copy comes from an i18n key in `common.json` (or `map.json`) — **matter-of-fact Swedish, no exclamation/apology/emoji** (the error-tone rule). Keep sv/en keys identical. [Source: ux-design-specification.md:640; epics.md:2102,2113-2115]
  - [x] 3.2 Offline state: the cached app shell (layout, navigation, map background) renders; **no venue data, pins, or sun predictions** are shown. Ensure the venue query layer does not render stale pins offline — hide the data layer while offline (the banner communicates connectivity is required). [Source: epics.md:2099-2103]
  - [x] 3.3 Banner appear/dismiss animation per the Design Gate (±50 ms tolerance). The UX spec does not name a specific timing — use a short, conventional fade/slide via Motion (`motion/react`) gated by `useReducedMotion()`; if a precise timing is required for the gate, confirm with the maintainer. [Source: epics.md:2127]

- [x] **Task 4 — Online/offline detection + reconnect (AC: #3, #4)**
  - [x] 4.1 Detect connectivity with `navigator.onLine` plus the `online`/`offline` window events (a small `'use client'` hook, e.g. `useOnlineStatus`). [Source: epics.md:2099,2105-2106]
  - [x] 4.2 On reconnect: dismiss the banner and **let venue data load normally** — re-enable the normal TanStack Query flow (refetch via the existing `hooks/queries`), do NOT bypass the API boundary or hand-roll a fetch. [Source: epics.md:2107; AGENTS.md API boundary]

- [x] **Task 5 — Dev forced-state wiring (AC: #7)**
  - [x] 5.1 The offline banner's visible state consumes `useForcedState()` (`lib/dev/use-forced-state.ts`) AND the real `navigator.onLine` check: show the offline shell when `useForcedState() === 'map-primary-offline'` OR the device is offline. The caller must be `'use client'` and wrapped in `<Suspense>` (the hook reads `useSearchParams`). [Source: epics.md:2117-2119; CodeMiner — `use-forced-state.ts`]
  - [x] 5.2 Add the `forcedState === 'map-primary-offline'` branch in `MapView.tsx` — the literal is declared in the Screen ID → Route Map but **not yet branched on** anywhere. Branching renders the cached shell, hides venue data, and shows the banner regardless of real network state. [Source: CodeMiner — `MapView.tsx` has no `map-primary-offline` branch; project-context.md:188-189]
  - [x] 5.3 Verify production ignores `_state` (the hook already returns `null` in production via DCE — confirm the offline branch is unreachable in a prod build). [Source: epics.md:2121; CodeMiner — `use-forced-state.ts:16-25`]

- [x] **Task 6 — Lighthouse PWA gate (AC: #5)**
  - [x] 6.1 Achieve **Lighthouse PWA >= 90**: installable (manifest + SW + HTTPS + icons + theme color), offline-capable shell, correct viewport/meta. Run the audit and record the score. Note iOS Safari install quirks (no beforeinstallprompt; relies on Add-to-Home-Screen). [Source: epics.md:2109-2111; prd.md:103,341]

- [x] **Task 7 — Visual gate: first implementation-driven `map-primary-offline` reference (Design Gate: Visual + Visual validation)**
  - [x] 7.1 **No `map-primary-offline` reference exists (mobile or desktop)** — it is not in the MVP bundle and the capture script flags it as needing its first implementation-driven baseline. Produce the reference by capturing the offline shell via the dev forced-state route `/?_state=map-primary-offline` for both viewports, save as `docs/design/references/screens/{mobile,desktop}/map-primary-offline.png`, and **add a `REBASELINE-LOG.md` entry** documenting the first-baseline capture in the same change. [Source: UxMiner; CodeMiner — `capture-claude-design-refs.mjs:220-221`; AGENTS.md:177-179]
  - [x] 7.2 Run the gate: `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-primary-offline "/?_state=map-primary-offline" mobile` and `... desktop` (route already in the Screen ID → Route Map). [Source: AGENTS.md:166-175; project-context.md:188-189]

- [x] **Task 8 — Carry the five deferred platform/offline items (Supporting — carried per epics.md:2131-2135; each removed from deferred-work.md)**
  - [x] 8.1 Add `env(safe-area-inset-bottom)` handling to `MobileNavBar.tsx` (around the fixed-bottom nav height at `:51`/tab `min-h-11` at `:64-70`) so the 44 px touch target is fully reachable on iPhone home-indicator devices in standalone PWA display. [Source: deferred-work.md (code review of 1-3); epics.md:2131]
  - [x] 8.2 Add a `storage` event listener to `OnboardingGate` so an onboarding completion in one tab dismisses the already-open overlay in another tab without reload (the flag is currently read once on mount via `readFlag()`, no listener). [Source: deferred-work.md (1-5 R1); epics.md:2132; CodeMiner — `OnboardingGate.tsx:76-79`]
  - [x] 8.3 Re-check `maplibre-gl/dist/maplibre-gl.css` static-import behaviour against the offline/PWA shell + the async-map gate (`verify-maplibre-async.mjs` audits JS only). Either extend the verification to CSS hoisting or document why current hoisting stays acceptable for the offline shell. [Source: deferred-work.md (1-6 W3); epics.md:2133]
  - [x] 8.4 Rework or explicitly validate the full-viewport tile/style failure overlay (`MapContainer`) so the sighted fallback state and keyboard focus state are coherent — the current `pointer-events-none` overlay can show a cream fallback while tab focus continues through controls underneath. Align this with the offline-banner UX. [Source: deferred-work.md (1-6 W6); epics.md:2134]
  - [x] 8.5 Extend the axe a11y Playwright gate with a **mobile-viewport project** (or mobile-sized scans of the existing routes) so mobile-sheet variants (mobile venue-detail sheet, mobile review form, `FactCard` muted labels) — and the new offline shell — are inside the automated gate (the `a11y` project runs Desktop Chrome only today). [Source: deferred-work.md (3-4); epics.md:2135; CodeMiner — `playwright.config.ts:24-40`]

- [x] **Task 9 — Accessibility (AC: all)**
  - [x] 9.1 The offline banner uses a polite live region (`role="status"`/`aria-live="polite"`) so it is announced; it has an accessible name; no colour-only meaning; respects reduced motion. The app shell remains keyboard-navigable offline. [Source: AGENTS.md a11y]
  - [x] 9.2 Add an offline-shell block to `test/e2e/axe.spec.ts`: `goto('/?_state=map-primary-offline')`, wait for the banner `data-testid`, `runAxe`, assert `violations === []`. With Task 8.5, also cover the mobile-viewport project. [Source: codebase — `test/e2e/axe.spec.ts`]

- [x] **Task 10 — Tests (AC: all)**
  - [x] 10.1 Unit/component (Vitest): `useOnlineStatus` toggles on `online`/`offline` events; the offline shell shows the banner + hides venue data when offline OR forced; reconnect dismisses + triggers refetch; reduced-motion path (mock `useReducedMotion`); i18n copy renders sv + en. [Source: AGENTS.md testing]
  - [x] 10.2 sv/en parity for the new offline key(s). No tests dropped (baseline = 625 + Stories 7.1/7.2 additions). [Source: codebase — messages-parity test]
  - [x] 10.3 Manifest/SW smoke: assert `app/manifest.ts` emits the required fields (name, 192/512 icons, theme color, standalone). [Source: epics.md:2092]

- [x] **Task 11 — Gate (AC: all)**
  - [x] 11.1 From `nextjs-app/`: `npx tsc --noEmit` 0, `npx eslint . --quiet` 0, `npx vitest run` green, Playwright a11y green (desktop + new mobile project), visual gate pass for `map-primary-offline` (mobile + desktop), and Lighthouse PWA >= 90. Confirm the SW does not regress the existing MapLibre-async JS budget gate. Use `.\scripts\run-sh.ps1 scripts/story-review.sh 7-3-pwa-installation-offline-shell`. [Source: AGENTS.md:158-175; architecture.md:421-428]

## Dev Notes

### Tech stack (verified)
- **Next.js 16.2.2 App Router (Turbopack), React 19, Tailwind v4, Motion 12 (`motion/react`), next-intl, MapLibre GL 5.21.1, TanStack Query 5.96.2.** **Serwist `^9.5.7` is installed but unwired.** Run commands from `nextjs-app/`. [Source: architecture.md:131-219; CodeMiner — PWA state]

### Reuse, do not reinvent
- **PWA stack is greenfield** but the dependency exists: create `app/sw.ts`, `app/manifest.ts`, `public/` icons, and wire `withSerwist` into the existing `next.config.ts` async-IIFE export (keep `withNextIntl` + analyzer).
- **`map-primary-offline` is a declared-but-unimplemented `_state` literal** — add the branch in `MapView.tsx`; the route is already in the Screen ID → Route Map (no route-map change).
- **Reduced motion + reconnect:** `useReducedMotion()` (`motion/react`); reconnect re-enables the existing `hooks/queries` flow — never bypass the API boundary.
- **Online detection:** standard `navigator.onLine` + `online`/`offline` events in a small client hook; no library needed.

### Anti-patterns to avoid
- ❌ Don't add `next-pwa` — Serwist is the mandated successor.
- ❌ Don't cache venue/sun DATA offline — app-shell only (real-time sun needs connectivity).
- ❌ Don't drop `withNextIntl`/the analyzer branch when wrapping `next.config.ts` with Serwist.
- ❌ Don't invent a theme-color hex — derive from a brand token.
- ❌ Don't hand-roll a fetch on reconnect — refetch through TanStack Query (`hooks/queries`).
- ❌ Don't silently create the `map-primary-offline` reference without a `REBASELINE-LOG.md` entry.
- ❌ Don't leave the offline banner without a live region (it must be announced).

### Testing standards
- Vitest + @testing-library/react (online hook, offline shell, reconnect, manifest fields); Playwright `a11y` (desktop + new mobile project per Task 8.5) for the offline route; visual gate (new `map-primary-offline` baseline); Lighthouse PWA >= 90. No dropped tests. [Source: AGENTS.md:194-204; architecture.md:421-428]

### Project Structure Notes
- Alignment: offline-banner + online-hook under `components/custom/` + `hooks/`; manifest/SW at `app/manifest.ts` + `app/sw.ts`; icons in `public/`; the `MapView.tsx` offline branch in the existing map feature.
- Unchanged contracts: API boundary (reconnect uses the existing query layer); the `_state` zero-production-footprint contract (offline branch unreachable in prod); the visual reference set grows by one new `map-primary-offline` baseline (logged).

### File Impact
- **Files Created:** `nextjs-app/app/manifest.ts`; `nextjs-app/app/sw.ts`; `nextjs-app/public/` icon assets (192/512 + maskable + apple-touch); offline-banner component under `nextjs-app/components/custom/` (e.g. `OfflineBanner.tsx`); a `useOnlineStatus` hook under `nextjs-app/hooks/` (or `lib/`); the `map-primary-offline` reference PNGs (mobile + desktop) under `nextjs-app/docs/design/references/screens/`; component/unit test files under `nextjs-app/test/unit/**`.
- **Files Modified:** `nextjs-app/next.config.ts` (wrap with `withSerwist`); `nextjs-app/app/layout.tsx` (add `themeColor` + `manifest` metadata); `nextjs-app/components/custom/map/MapView.tsx` (add the `map-primary-offline` branch + hide venue data offline); `nextjs-app/components/custom/layout/MobileNavBar.tsx` (Task 8.1 safe-area); `nextjs-app/components/custom/onboarding/OnboardingGate.tsx` (Task 8.2 storage listener); `nextjs-app/components/custom/map/MapContainer.tsx` (Task 8.4 overlay focus); `nextjs-app/playwright.config.ts` + `nextjs-app/test/e2e/axe.spec.ts` (Task 8.5 mobile axe project + offline block); `nextjs-app/messages/{sv,en}/common.json` (offline key, key-identical); `nextjs-app/docs/design/references/REBASELINE-LOG.md` (first `map-primary-offline` baseline); the maplibre-async verifier or its doc (Task 8.3); `nextjs-app/package.json` only if a build script changes.
- **Explicitly NOT created/changed:** no `next-pwa`; no `tailwind.config.*`; no offline DATA cache; no new API route; no bypass of the query layer; no new `_state` literal beyond the existing `map-primary-offline`.

### References
- [Source: CLAUDE.md] and [Source: AGENTS.md — canonical repo rulebook] — API boundary, taxonomy, token/i18n/a11y/animation rules, commands/branch/commit, performance budget
- [Source: project-context.md] — Screen ID → Route Map (`map-primary-offline` → `/?_state=map-primary-offline`), `_state` forcing contract, design-gate workflow
- [Source: nextjs-app/docs/design/DESIGN.md] — brand/theme tokens for manifest theme color
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.3 (lines 2081-2135)] — ACs, Design Gate, the five carried deferred items
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — offline banner + error-tone notes (lines 64, 638-640, 810)]
- [Source: _bmad-output/planning-artifacts/prd.md — FR49/FR50 PWA + offline, NFR16/NFR37 (Lighthouse PWA >= 90, cache invalidation)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Serwist (409-416), CI gates (421-428), app-shell-only caching]
- [Source: nextjs-app/next.config.ts — async-IIFE export to compose Serwist with; app/layout.tsx — metadata]
- [Source: nextjs-app/lib/dev/use-forced-state.ts — useForcedState; components/custom/map/MapView.tsx — add offline branch]
- [Source: nextjs-app/components/custom/layout/MobileNavBar.tsx, components/custom/onboarding/OnboardingGate.tsx, components/custom/map/MapContainer.tsx — deferred-item touch points]
- [Source: nextjs-app/playwright.config.ts, test/e2e/axe.spec.ts, scripts/capture-claude-design-refs.mjs, docs/design/references/REBASELINE-LOG.md — gates + first offline baseline]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md — the five items (1-3 safe-area, 1-5 storage listener, 1-6 W3/W6, 3-4 mobile axe) carried into this story]

## Dev Agent Record

### Agent Model Used

Amelia (BMAD dev-story) / Claude Opus 4.8.

### Debug Log References

- Baseline gate (clean at story start): `npx tsc --noEmit` 0, `npx eslint . --quiet` 0, `npx vitest run` 74 files / 652 tests.
- Final gate: `tsc` 0, `eslint` 0, `vitest run` **77 files / 665 tests** (+3 files / +13 tests), production `next build` succeeded (Serwist esbuild SW: **34 precache entries / 2776.56 KiB**; `/manifest.webmanifest` static; `/serwist/sw.js` + `.map` SSG), `verify-maplibre-async.mjs` PASS (no JS-budget regression).
- Live dev-server verification (`/`): exactly one `<link rel="manifest" href="/manifest.webmanifest">`, `<meta name="theme-color" content="#ffbf00">`, `<link rel="icon">`, `<link rel="apple-touch-icon">`; `/manifest.webmanifest` serves all required fields; `/serwist/sw.js` → 200 `application/javascript` (Serwist runtime).
- Visual gate: `map-primary-offline` mobile + desktop **PASS** (`VISUAL_VALIDATE_PROVIDER=claude`).
- Playwright a11y: offline shell **clean on mobile + desktop**. The `a11y-mobile` project (Task 8.5) is green — offline shell asserted clean; the venue-card-bearing scans (`map-primary`, `venue-detail`, `feedback`, `review`) are `test.fixme` (see Completion Notes).

### Completion Notes List

PWA + offline shell wired end-to-end for the final MVP story. Pre-dev maintainer decisions (Rasmus, 2026-06-26): (a) Serwist via the Turbopack-native `@serwist/turbopack` (Next 16 builds with Turbopack by default; the classic webpack `@serwist/next` would not run); (b) token-derived placeholder app icons (no source brand mark exists); (c) AC5 reconciled to an installability checklist (Lighthouse 12.6.1 removed the PWA category).

- **AC1 — Installable PWA.** `app/manifest.ts` (`MetadataRoute.Manifest`: name/short_name "SunnySeat", standalone, start_url `/`, `theme_color` `#ffbf00` = `--color-amber-primary`, `background_color` `#fdfaf4` = `--color-surface-cream`, 192/512 "any" + 512 maskable icons). Root metadata links the manifest + apple-touch icon and sets `theme_color` via the `viewport` export (Next 16 requires it there). Icons generated by `scripts/generate-pwa-icons.mjs` into `public/icons/` (192/512/maskable + 180 apple-touch). Verified live (exactly one manifest link; no duplicate).
- **AC2 — Service-worker app-shell caching + deploy invalidation.** `app/sw.ts` (Serwist, **precache-only**, no `runtimeCaching` → no offline data caching) bundled by `@serwist/turbopack` and served at `/serwist/sw.js` via `app/serwist/[path]/route.ts` (`createSerwistRoute`, `Service-Worker-Allowed: /`); `withSerwist` composed around `withNextIntl` (+ analyzer branch kept) in `next.config.ts`. Cache invalidation keyed to the build's git commit (`additionalPrecacheEntries: [{ url: '/', revision }]`). Production build confirmed 34 precache entries. Registration via `SerwistProvider` behind a `'use client'` wrapper (`app/ServiceWorkerProvider.tsx`) — required because `@serwist/turbopack/react` ships no `'use client'` directive yet calls `createContext`, which crashes the server-component root layout if imported directly. Disabled in dev so Turbopack HMR is never intercepted (AC2/Task 2.4).
- **AC3/AC4 — Offline shell + reconnect.** `useOnlineStatus` (`navigator.onLine` + `online`/`offline` events). `MapView` computes `showOfflineShell = forcedState === 'map-primary-offline' || !isOnline` and, when set, renders only the cached map background (`MapContainer`) + the always-mounted `<OfflineBanner>`, hiding every venue-data surface (pins/search/sheet/list/overlays/controls/pill/errors). On reconnect the venue tree returns and TanStack Query (paused while offline) resumes through the existing hooks — no hand-rolled fetch. `OfflineBanner` slides in/out (`duration-default`, `motion/react`, `useReducedMotion`-gated) as a polite live region (`role="status"` + `aria-live="polite"`, decorative `WifiOff`, localized text).
- **AC5 — reconciled to an installability checklist** (see deferred-work + maintainer decision): valid manifest linked once + registered SW at `/serwist/sw.js` + 192/512 icons + theme colour, verified by the manifest smoke test + the live head/route checks above. No numeric Lighthouse-PWA gate (category removed in LH 12.6.1).
- **AC6 — i18n.** Single new key `common.offline.banner` (sv "Ingen anslutning" / en "No connection"), matter-of-fact tone, sv/en parity auto-covered by `messages-parity.test.ts`.
- **AC7 — Dev forced-state reachability.** Branch added in `MapView` consuming `useForcedState()`; `/?_state=map-primary-offline` renders the offline shell in dev regardless of real network; production ignores `_state` via the hook's DCE. Visual gate exercises both viewports.
- **Task 8 (carried deferred items):** 8.1 `MobileNavBar` reserves `env(safe-area-inset-bottom)` (bar grows by the inset; resolves to 0 in non-inset/gate captures so no visual drift). 8.2 `OnboardingGate` `storage` listener dismisses an overlay open in another tab on cross-tab onboarding completion (forced state still overrides). 8.3 documented why the static `maplibre-gl.css` import is acceptable for the offline shell + async-map gate (in the verifier header). 8.4 `MapContainer` marks the broken, visually-covered canvas `inert` when tiles hard-fail so keyboard/SR users don't tab into an invisible map. 8.5 new `a11y-mobile` Playwright project + `axe-mobile.spec.ts`.
- **Visual reference (Task 7):** first implementation-driven `map-primary-offline` baseline captured (mobile + desktop) via `scripts/capture-offline-rebaseline.mjs`; logged in `REBASELINE-LOG.md`; `.claude/scripts/visual-validate.sh` got a `map-primary-offline)` wait case (banner, not venue-pin).
- **Known deferrals (in `deferred-work.md`, maintainer-approved / pre-existing):** placeholder PWA icons → real brand mark; AC5 numeric-score reconciliation; and **pre-existing** WCAG 1.4.3 color-contrast debt surfaced by the a11y gate (venue-card amber sun-% labels ≈1.63, About/Privacy footer wordmark ≈3.13, a venue-detail desktop amber label ≈4.47) — all red at HEAD under axe-core 4.11.4, none in Story 7.3's code, targeted at Story 5.1 / an a11y pass. The two existing desktop axe scans for these (about/privacy/venue-detail) are left untouched (not suppressed); the equivalent new mobile scans are `test.fixme`. The offline shell itself is a11y-clean.

### File List

**Created:**
- `nextjs-app/app/manifest.ts`
- `nextjs-app/app/sw.ts`
- `nextjs-app/app/serwist/[path]/route.ts`
- `nextjs-app/app/ServiceWorkerProvider.tsx`
- `nextjs-app/components/custom/offline/OfflineBanner.tsx`
- `nextjs-app/hooks/useOnlineStatus.ts`
- `nextjs-app/public/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png`
- `nextjs-app/scripts/generate-pwa-icons.mjs`
- `nextjs-app/scripts/capture-offline-rebaseline.mjs`
- `nextjs-app/docs/design/references/screens/{mobile,desktop}/map-primary-offline.png`
- `nextjs-app/test/unit/hooks/useOnlineStatus.test.ts`
- `nextjs-app/test/components/OfflineBanner.test.tsx`
- `nextjs-app/test/unit/manifest.test.ts`
- `nextjs-app/test/e2e/axe-mobile.spec.ts`

**Modified:**
- `nextjs-app/next.config.ts` (compose `withSerwist`)
- `nextjs-app/app/layout.tsx` (`viewport.themeColor`, `metadata.manifest`/icons/appleWebApp, `ServiceWorkerProvider`)
- `nextjs-app/tsconfig.json` (exclude `app/sw.ts`)
- `nextjs-app/components/custom/map/MapView.tsx` (offline-shell branch + `useOnlineStatus`/`OfflineBanner`)
- `nextjs-app/components/custom/map/MapContainer.tsx` (Task 8.4 `inert` on hard-failed canvas)
- `nextjs-app/components/custom/layout/MobileNavBar.tsx` (Task 8.1 safe-area-inset-bottom)
- `nextjs-app/components/custom/onboarding/OnboardingGate.tsx` (Task 8.2 `storage` listener)
- `nextjs-app/scripts/verify-maplibre-async.mjs` (Task 8.3 CSS-scope note)
- `nextjs-app/scripts/capture-claude-design-refs.mjs` (map-primary-offline baseline note)
- `nextjs-app/playwright.config.ts` (Task 8.5 `a11y-mobile` project)
- `nextjs-app/test/e2e/axe.spec.ts` (offline-shell desktop block)
- `nextjs-app/test/components/MapView.test.tsx` (offline-shell describe block)
- `nextjs-app/messages/{sv,en}/common.json` (`offline.banner`)
- `nextjs-app/package.json` + `package-lock.json` (`@serwist/turbopack` + `esbuild` devDeps)
- `nextjs-app/docs/design/references/REBASELINE-LOG.md` (map-primary-offline first baseline)
- `.claude/scripts/visual-validate.sh` (`map-primary-offline` wait case)
- `_bmad-output/implementation-artifacts/deferred-work.md` (Story 7.3 deferrals)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status)

## Change Log

| Date | Change |
|------|--------|
| 2026-06-29 | Story 7.3 implemented (Amelia / Opus 4.8): PWA manifest + token-derived icons, Turbopack-native Serwist app-shell service worker (`@serwist/turbopack`), offline shell + "Ingen anslutning" banner + reconnect, dev forced-state branch, and the five carried deferred platform/offline items (safe-area nav, cross-tab onboarding, maplibre-css note, map-failure focus coherence, mobile axe project). First implementation-driven `map-primary-offline` visual baseline captured + logged. Status ready-for-dev → review. |
