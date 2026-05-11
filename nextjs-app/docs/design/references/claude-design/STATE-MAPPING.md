# Claude Design — State Mapping

This file maps the SunnySeat **Screen IDs** (the canonical identifiers used in
stories, in `project-context.md`'s Screen ID → Route Map, and in the visual
validation gate) to the **state-forcing recipe** that drives the matching
screen in the Claude Design HTML prototypes.

The recipes live in [`nextjs-app/scripts/capture-claude-design-refs.mjs`](../../../../scripts/capture-claude-design-refs.mjs).
This document is the human-readable counterpart — what each recipe is doing
and why.

> This file is project-curated. The `scripts/fetch-claude-design.sh` refresh
> preserves it; everything else under `claude-design/` is overwritten on each
> fetch.

## Prototypes

The bundle ships four self-contained HTML prototypes:

| Prototype                       | File                                | Persona             |
|---------------------------------|-------------------------------------|---------------------|
| Free, mobile                    | `project/SunnySeat Free.html`       | Free user, 390×844  |
| Premium, mobile                 | `project/SunnySeat Prototype.html`  | Premium, 390×844    |
| Free, desktop                   | `project/SunnySeat Desktop Free.html`    | Free user, 1440×900 |
| Premium, desktop                | `project/SunnySeat Desktop Premium.html` | Premium, 1440×900   |

Each is a single HTML file that loads React + Babel-standalone from unpkg and
its sibling `src*/`/`lib/` JSX. There is no build step.

## State-forcing primitives

The prototype source is treated as **read-only** — modifying it would diverge
from the upstream Claude Design project. Everything below works without
touching the JSX.

1. **`window.SUNNY_DEFAULTS`** — set before page load via Playwright
   `page.addInitScript`. Keys: `hour` (number, 6–21), `mapStyle`
   (`'warm'|'neutral'|'dusk'`), `variant` (`'amber'|'mono'`), `showTweaks`
   (boolean).
2. **`localStorage` seeding** — the App reads these on mount:
   - `sunny_free_screen` (`'onboarding'|'map'`) — free mobile prototype
   - `sunny_screen` (`'onboarding'|'map'`) — premium mobile prototype
   - `sunny_premium` (`'1'|'0'`) — premium toggle
   - `sunny_hour` — overrides default hour
   - `sunny_favs` — JSON array of venue IDs to mark as favourites
3. **Tweaks panel via postMessage** — dispatch `MessageEvent` on `window` with
   `{ type: '__activate_edit_mode' }`. The Tweaks panel renders bottom-right
   and exposes one-click access to: paywall, premium toggle, force-fail toggle,
   modal flows (Datum, Feedback, Recension, Tomt, Betalning fel). After
   clicking the relevant button, dispatch `__deactivate_edit_mode` so the panel
   does not appear in the screenshot.
4. **Direct UI clicks** — pins are tagged `[data-pin]`, the QuickInfo popover
   is `[data-quickinfo]`. Bottom sheet has a chevron button in its header.
5. **Desktop `flavor` prop** — set in the HTML's mount call (`<App flavor="free|premium"/>`).
   Use the matching prototype file rather than overriding.

## Screen ID coverage

All recipes below are wired and verified — running the capture script with no
arguments produces 19 PNGs.

| Screen ID                  | Mobile recipe                                                                                          | Desktop recipe                                                                                                                  |
|----------------------------|--------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| onboarding                 | `freeMobile` · no localStorage seed                                                                    | `freeDesktop` · Tweaks → "Onboarding"                                                                                          |
| map-primary                | `freeMobile` · seed `sunny_free_screen=map`                                                            | `freeDesktop` · default                                                                                                        |
| map-panel-venues           | `freeMobile` · `clickXY: [195, 485]` to advance BottomSheet to full                                    | n/a (mobile-only)                                                                                                              |
| map-with-selected-venue    | `freeMobile` · click `[data-pin]`                                                                      | n/a                                                                                                                            |
| venue-detail               | `freeMobile` · click `[data-pin]` → click "Mer info"                                                   | `freeDesktop` · same flow                                                                                                      |
| feedback                   | `freeMobile` · Tweaks → "Feedback"                                                                     | n/a (mobile inline pattern)                                                                                                    |
| review                     | `freeMobile` · Tweaks → "Recension"                                                                    | n/a                                                                                                                            |
| premium-upsell             | `freeMobile` · default LockedPlanner top panel                                                         | n/a (covered by premium-paywall on desktop)                                                                                    |
| premium-paywall            | `freeMobile` · Tweaks → "Öppna paywall"                                                                | `freeDesktop` · Tweaks → "Paywall"                                                                                             |
| premium-paywall-processing | `freeMobile` · Tweaks → "Öppna paywall" → click "Betala med Swish"                                    | `freeDesktop` · Tweaks → "Paywall" → click "Aktivera Säsongskortet"                                                            |
| payment-failed             | `freeMobile` · Tweaks → "Betalning fel"                                                                | `freeDesktop` · Tweaks → "Paywall" → "Aktivera Säsongskortet" → "Avbryt betalning"                                            |
| favourites-tab             | `premiumMobile` · seed `sunny_favs`, click "Favoriter" tab                                             | `premiumDesktop` · click "Favoriter" tab                                                                                       |
| not-found                  | **Not in prototype.** Manual copy from `legacy/mobile/not-found.png` already promoted to active.       | Same.                                                                                                                          |
| about                      | **Not in prototype.** Manual copy from `legacy/mobile/about.png` already promoted to active.           | Same.                                                                                                                          |
| premium-recovery           | **Not in prototype, no legacy reference either.** Needs first capture before visual gate can run.      | Same.                                                                                                                          |
| map-primary-offline        | **Not in prototype, no legacy reference either.** App-level offline banner + cached shell.            | Same.                                                                                                                          |

The four "Not in prototype" screens stay in
`docs/design/references/screens/legacy/{mobile|desktop}/` (or are absent
entirely). `not-found` and `about` have been copied into the active folder so
the gate can find them; `premium-recovery` and `map-primary-offline` need their
first reference capture.

## Known limitation — device-frame chrome in references

Mobile prototypes render inside a simulated iOS device frame (rounded outer
corners, dynamic island, "9:41" status bar, home indicator pill). Desktop
prototypes render inside a simulated browser window frame (window controls,
address bar, tab strip). Our actual application has none of this chrome.

The visual validation gate prompt in `.claude/scripts/visual-validate.sh` was
extended to recognise these as simulator artifacts and ignore them in the
comparison. If you ever swap to a different gate model or rewrite the prompt,
remember to keep that exception, otherwise every captured reference will
trigger a false-positive "missing chrome" failure.

## Adding a new recipe

1. Identify the prototype + how to reach the state (localStorage seed, Tweaks
   button, direct click, or combination).
2. Add an entry to `RECIPES` in
   [`scripts/capture-claude-design-refs.mjs`](../../../../scripts/capture-claude-design-refs.mjs).
   Set `skip: true` while iterating; remove once the screenshot looks right.
3. Run `node scripts/capture-claude-design-refs.mjs <screen-id>` from
   `nextjs-app/` and inspect the output PNG.
4. Update this table with the recipe summary.
