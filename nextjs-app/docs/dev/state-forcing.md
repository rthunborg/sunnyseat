# Dev-Only State Forcing (`?_state=<screen-id>`)

## What it is

Many SunnySeat screens are **state variants of the same URL** — onboarding overlay, premium paywall, inline feedback, offline shell, etc. The `_state` query parameter is a dev-only URL override that forces a component into a specific UI state so the visual-validation gate (and any Playwright test) can screenshot that state deterministically, without clicking through the app to reach it.

It is strictly a development/preview convenience. It never affects production builds.

## Production guarantee

`useForcedState()` returns `null` unconditionally when `process.env.NODE_ENV === 'production'`. The literal `=== 'production'` check at the top of the hook allows the Next.js bundler to dead-code-eliminate the `useSearchParams` call below it, so `_state`, the hook body, and any caller's `_state` branches are all stripped from the production bundle. **Zero bundle footprint.**

The **same production guarantee covers the planner-forcing `?_time=` / `?_date=` parameters** (Story 9.0). `SearchParamTimeProviders` in `nextjs-app/components/custom/layout/AppContextProviders.tsx` branches on the same literal `process.env.NODE_ENV === 'production'` check *before* reading the URL: in production it renders the un-forced `DefaultTimeProviders` (live-clock interval + normal time/date selection), so no production URL can pin the planner to a fixed moment. Outside production (dev/preview/test) the `_time`/`_date` reads stay active for tooling and the deterministic-sun e2e specs. Because the dev branch lives in a separate child component (`DevSearchParamTimeProviders`) whose entire body — including its `useSearchParams` call — is unreachable in production, the bundler DCEs it just like the `_state` hook. **Keep these two mechanisms gated identically; do not reintroduce an un-gated `_time`/`_date` read.**

## Usage

Mark your component `'use client'`, call `useForcedState()` once, and branch on the return value. The canonical reference implementation is the onboarding gate at `nextjs-app/components/custom/onboarding/OnboardingGate.tsx` — it shows the full pattern (state-forcing override, Suspense boundary, side-effect gating). The minimal shape:

```tsx
'use client';

import { useForcedState } from '@/lib/dev/use-forced-state';

export function SomeComponent() {
  const forced = useForcedState();

  if (forced === 'premium-paywall') {
    return <PaywallOverlay />;
  }
  return <DefaultView />;
}
```

When the forced state must override real production logic (e.g. `OnboardingGate` skipping the localStorage flag check), branch on the forced value FIRST and gate any side-effects (localStorage writes, analytics) on the non-forced path so the dev experience stays repeatable.

## Suspense reminder

Any page rendering a component that uses `useForcedState` must wrap that subtree in a `<Suspense>` boundary, otherwise Next.js will bail out of prerendering (`useSearchParams` is a client hook that requires a Suspense parent in the App Router).

## Valid screen IDs

The canonical list of screen IDs and their routes lives in `project-context.md` under **"Screen ID → Route Map"** at the project root. Do not duplicate that table here — point at it. `_state` values must equal a Screen ID from that map exactly; no aliases, no abbreviations.

### Mobile venue-sheet capture variants

Story 12.9 adds dev/test-only row-state parameters for the mobile `map-panel-venues`
screen:

- `_sheetRows=0|1|3|max` forces the row-quantized venue sheet to a visible-row
  count. `max` resolves to the measured maximum for the current viewport and
  venue count.
- `_sheetDrag=mid` captures a deterministic in-between drag frame for the
  row-height sheet.

These parameters are capture/test helpers only. They are production-gated with
the same dev-only state-forcing path as `_state`, `_time`, and `_date`.

## Seeded venue slug

Screens that require a venue (`map-with-selected-venue`, `venue-detail`, `feedback`, `review`) use the fixed dev-seeded slug `test-venue-sunny`. The slug exists in the development Supabase database and is never used in production data. See `project-context.md` §"Seeded development slug" for the full contract.
