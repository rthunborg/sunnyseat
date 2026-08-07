# Claude Design — State Mapping

This file maps SunnySeat **Screen IDs** to the state-forcing recipe used to
capture the active visual-validation PNGs.

The recipes live in
[`nextjs-app/scripts/capture-claude-design-refs.mjs`](../../../../scripts/capture-claude-design-refs.mjs).
This document is the human-readable counterpart: which Claude Design prototype
is authoritative for each MVP reference and which states are deliberately
future-only.

> This file is project-curated. `scripts/fetch-claude-design.sh` preserves it;
> generated Claude Design files under `claude-design/project/` are refreshed
> from the handoff bundle.

## Active Prototypes

The 2026-05-21 handoff bundle splits MVP and Post-MVP designs. MVP visual
validation uses only the two MVP Unlocked files:

| Status | Prototype | File |
|---|---|---|
| Active MVP mobile | MVP base functionality, no paywalls | `project/SunnySeat MVP Mobile Unlocked.html` |
| Active MVP desktop | MVP base functionality, no paywalls | `project/SunnySeat MVP Desktop Unlocked.html` |
| Future only | Post-MVP mobile unlocked | `project/SunnySeat Post-MVP Mobile Unlocked.html` |
| Future only | Post-MVP mobile locked/paywall | `project/SunnySeat Post-MVP Mobile Locked.html` |
| Future only | Post-MVP desktop unlocked | `project/SunnySeat Post-MVP Desktop Unlocked.html` |
| Future only | Post-MVP desktop locked/paywall | `project/SunnySeat Post-MVP Desktop Locked.html` |

Post-MVP files are retained for future Season Pass, Swish, locked, payment, and
recovery work. They must not drive MVP reference regeneration.

## State-Forcing Primitives

The prototype source is treated as read-only. Capture recipes drive state from
Playwright without editing the JSX.

1. `window.SUNNY_DEFAULTS` is set before page load when a recipe needs default
   overrides such as hour or map style.
2. `localStorage` seeding is used for MVP screen state:
   - `sunny_screen='map'` opens the MVP mobile map instead of onboarding.
   - `sunny_hour` controls prototype hour when needed.
   - `sunny_favs` seeds favourite venue IDs.
3. Tweaks panel activation uses a synthetic `MessageEvent` with
   `__activate_edit_mode`. Active MVP buttons currently used by recipes are:
   - Mobile: `Datum`, `Feedback`, `Recension`, `Tomt`.
   - Desktop: `Onboarding`, `Planner`.
4. Direct UI clicks are used for pins, `Mer info`, bottom-sheet expansion,
   settings, and tabs. Pins expose `[data-pin]`.

Do not use old `sunny_free_screen` recipes for active MVP capture; that key
belongs to the legacy/Post-MVP mobile source split and is not the current MVP
source of truth.

## Screen ID Coverage

Running `node scripts/capture-claude-design-refs.mjs` from `nextjs-app/`
regenerates the MVP-covered active references below.

| Screen ID | Mobile recipe | Desktop recipe |
|---|---|---|
| `onboarding` | MVP Mobile Unlocked, no localStorage seed | Preserved curated implementation-derived baseline; not recaptured from MVP desktop by default |
| `map-primary` | MVP Mobile Unlocked, `sunny_screen=map` | MVP Desktop Unlocked default |
| `map-panel-venues` | Approved Story 12.9 implementation-derived reference from `/?_state=map-panel-venues&_time=14:00` with a row-count sheet (`N=3` normally). Prototype recipe remains retired; `_sheetRows=max` and `_sheetDrag=mid` are retained as supporting proof only. | n/a |
| `map-with-selected-venue` | MVP Mobile Unlocked, `sunny_screen=map`, click first `[data-pin]` | n/a |
| `map-selected-time-open` | Story 12.14 implementation-derived route `/?_state=map-selected-time-open&_time=14:00`; active PNG pending maintainer approval before promotion | Story 12.14 implementation-derived route `/?_state=map-selected-time-open&_time=16:30`; active PNG pending maintainer approval before promotion |
| `map-selected-time-closed` | Story 12.14 implementation-derived route `/?_state=map-selected-time-closed&_time=09:00&_search=Kaf%C3%A9%20Magasinet`; dev forcing seeds an exact closed search result while discovery rows/counts/pins exclude the closed venue; active PNG pending maintainer approval before promotion | Story 12.14 implementation-derived route `/?_state=map-selected-time-closed&_time=09:00&_search=Kaf%C3%A9%20Magasinet`; dev forcing seeds an exact closed search result while discovery rows/counts/pins exclude the closed venue; active PNG pending maintainer approval before promotion |
| `venue-detail` | MVP Mobile Unlocked, `sunny_screen=map`, click first pin, click `Mer info` | MVP Desktop Unlocked, click first pin, click `Mer info` |
| `venue-photo-loaded` | Approved implementation-derived reference from `/?venue=test-venue-sunny&_state=venue-photo-loaded&_time=14:00`; not captured from the Claude prototype because the handoff bundle has placeholder media only | Approved implementation-derived reference from `/?venue=test-venue-sunny&_state=venue-photo-loaded&_time=16:30`; not captured from the Claude prototype because the handoff bundle has placeholder media only |
| `venue-photo-fallback` | Approved implementation-derived reference from `/?venue=test-venue-sunny&_state=venue-photo-fallback&_time=14:00`; not captured from the Claude prototype because the handoff bundle has placeholder media only | Approved implementation-derived reference from `/?venue=test-venue-sunny&_state=venue-photo-fallback&_time=16:30`; not captured from the Claude prototype because the handoff bundle has placeholder media only |
| `feedback` | Implementation-derived active PNG from `/?venue=test-venue-sunny&_state=feedback`; MVP Mobile Unlocked Tweaks -> `Feedback` is obsolete general app-feedback modal and is skipped by the default prototype capture | n/a |
| `review` | Implementation-derived active PNG from `/?venue=test-venue-sunny&_state=review`; MVP Mobile Unlocked Tweaks -> `Recension` is obsolete required-rating/tag modal and is skipped by the default prototype capture | n/a |
| `about` | MVP Mobile Unlocked, `sunny_screen=map`, settings -> `Om SunnySeat` | MVP Desktop Unlocked, settings -> `Om SunnySeat` |
| `favourites-tab` | MVP Mobile Unlocked, `sunny_screen=map`, seed `sunny_favs`, click `Favoriter` | MVP Desktop Unlocked, click `Favoriter` |

## Screens Not Regenerated By MVP Capture

| Screen ID | Reason | Current handling |
|---|---|---|
| `onboarding` desktop | The earlier desktop onboarding baseline is curated and implementation-derived until Rasmus accepts a new desktop-specific onboarding reference. | Keep existing active PNG; see `REBASELINE-LOG.md` 2026-05-04 entries. |
| `not-found` | The MVP prototypes do not contain the routed app 404 page. | Keep legacy/active routed reference until a design exists. |
| `map-primary-offline` | Offline shell has no Claude Design state yet. | First implementation-driven reference belongs to the offline story. |
| `venue-photo-loaded`, `venue-photo-fallback` | The MVP prototypes intentionally render designed placeholders, not production Supabase Storage photos or broken-object fallback. | Use the approved Story 12.12 implementation-derived active PNGs; regenerate only with explicit maintainer approval plus a new `REBASELINE-LOG.md` entry. |
| `map-panel-venues` | Story 12.9 replaced the fixed prototype sheet snaps with a row-quantized implementation contract. | Use the approved Story 12.9 implementation-derived active PNG from `/?_state=map-panel-venues&_time=14:00`; keep the prototype recipe skipped and regenerate/promote only with explicit maintainer approval plus a new `REBASELINE-LOG.md` entry. |
| `map-selected-time-open`, `map-selected-time-closed` | Selected-instant availability depends on live fixture opening-hours filtering and the retained closed favourite/search policy from Story 12.14; the MVP prototypes do not contain these states. | Routes are defined in `project-context.md`; active PNG promotion is deferred until explicit maintainer approval. Until then, use documented manual visual acceptance on the Windows host. |
| `premium-upsell`, `premium-paywall`, `premium-paywall-processing`, `payment-failed`, `premium-recovery` | Season Pass, Swish, payment, locked, and recovery flows are Post-MVP only. | Retain existing/future references as archived future assets. Do not use for MVP review gates. |

## Known Limitation — Prototype Chrome

Mobile prototypes render inside simulated iOS device chrome and desktop
prototypes render inside browser-window chrome. The app does not render this
chrome. The visual gate prompt must continue to treat the device/browser frame
as a prototype artifact, not an implementation requirement.

## Adding Or Changing A Recipe

1. Identify whether the state belongs to MVP Unlocked or Post-MVP.
2. Add or edit the recipe in
   [`scripts/capture-claude-design-refs.mjs`](../../../../scripts/capture-claude-design-refs.mjs).
3. Capture only the affected screen first:
   `cd nextjs-app && node scripts/capture-claude-design-refs.mjs <screen-id>`.
4. Inspect the PNG.
5. Update `nextjs-app/docs/design/references/REBASELINE-LOG.md` in the same
   operation.
