# Epic 9 — Live-App Hardening & Clean-Up: Single-Session Manual UAT Checklist

_Consolidated from 107 per-story UAT items → 89 steps across 15 grouped flows, reconciled against the final assembled epic (deduplicated, obsolete/superseded items dropped, re-scoped to the final interface). One human-run walk-through, setup-first, with production-only checks grouped separately (§N)._

## A. Setup / preconditions
1. `cd nextjs-app && npm run dev` → dev server up at http://localhost:3000 (dev honours `?_time=`/`?_date=`/`?_state=` forcing). If any gold/amber gradient still looks olive, delete `.next` and restart (Turbopack caches stale CSS).
2. Open DevTools; keep the **Network** tab (filter `venues`), **Console** (unfiltered), **Elements**, and **Sensors** (geolocation override) panels handy. Use the device-toolbar to switch between a **mobile viewport (360–430px, e.g. iPhone-14)** and **desktop (≥1024px)** as each step calls out.
3. Confirm the real data path is active (`SUNNYSEAT_VENUE_STORE=supabase`, `SUNNYSEAT_SUN_ENGINE=real` + service-role in `.env.local`) for the tag-data, caching, and warm-cache checks → real DB tags/engine engage. Flag-off falls back to the 7 seeded fixture venues (same tag arrays), so every step still exercises.

## B. Clean-app content sweep — venue detail & cards (9.1)
4. Open venue detail (`/?venue=test-venue-sunny&_state=venue-detail&_time=14:00`), mobile **and** desktop → the **EXPONERING** block, **BÄST KL.**, **Platser ute ~N**, the "Vi räknar…" paragraph, the uncertainty-reason middot line, and "Blir skuggigt om X min" are **all absent**.
5. Same detail → preserved real signals still render: **% SOL** badge, a single full-width **Avstånd** card (no empty 2nd cell), **Säkerhet**/confidence, **Solprognos** timeline, **Öppettider**/**Adress**/**Visa Rutt**.
6. Same detail, both breakpoints → no orphaned middot, empty row, or dangling label where the removed tiles were.
7. Venue-list cards (`/?_state=map-panel-venues` mobile + `/?_time=16:30` desktop) → no uncertainty text; distance + sun% + amber **Säkerhet** chip present; clean separators (no dangling trailing middot).
8. A list card's select-button accessible name (inspect in Elements) reads essentials only — name, sun %, **Säkerhet announced once** (no "Säkerhet: 60% Säkerhet 60%" dup), distance — with no embedded "Vi räknar…" paragraph.
9. Shaded/low-sun list card still shows a confidence figure (no empty placeholder row); toggling the favourite heart on a card works after the aria refactor; list fade/stagger animation is unbroken.

## C. CTA gradient token + copy (9.2)
10. **VISA RUTT** route-overlay button (`/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00`, mobile) → **gold→bright-amber** gradient (gold top, bright amber bottom), **no olive/dark-green** start; tapping opens native maps.
11. **/about** "Tillbaka till kartan" CTA, mobile (~390px) **and** desktop (~1280px) → same gold→bright-amber ramp, no olive; navigates back to the map.
12. **404 CTA** on a bogus route (`/__sunnyseat-invalid`), mobile + desktop → gold→bright-amber ramp, no olive; returns to map.
13. On a CTA: hover dims (`hover:opacity-90`), Tab shows a focus ring, active state works; pill/padding/icon/shadow unchanged — only the gradient colour shifted.
14. Amber-surface audit: venue-detail **sun-% badge** = clean gold flat fill; **ÖPPET** status badge = clean bright-amber; neither reads olive.
15. Swedish (default) rooftop filter chip reads **"Takterrass"** (not "Takt"); switch to English → same chip reads **"Rooftop"**.

## D. Server-caching freshness & rate limit (9.3)
16. `curl -sD - http://localhost:3000/api/venues -o /dev/null` → response carries `Cache-Control: public, max-age=30, s-maxage=30, must-revalidate` **and** an `ETag`.
17. Re-request with `-H 'If-None-Match: <etag>'` → **HTTP 304**, same ETag + Cache-Control echoed, empty body.
18. Both `/api/venues` and `/api/venues/<slug>` carry `X-Sun-Data-Source` + `X-Weather-Updated-At`; the detail route also has `Cache-Control … s-maxage=30`.
19. Request `/api/venues` plain and with `-H 'X-Forwarded-For: 9.9.9.9'` → **identical ETag + body** (the GET handler no longer reads the request IP; rate-limiting moved to the Edge `proxy.ts`). (Whether the CDN actually serves the s-maxage copy is Vercel-edge behaviour, not observable on `next dev`.)
20. Rate limit (relocated to `proxy.ts`, **GET-scoped**, 120 req/60s per IP): loop ~130 GETs with `-H 'X-Forwarded-For: 8.8.8.8'` → first ~120 = `200`, rest = `429` within the minute; a malformed XFF (`not-an-ip`) → `400`. A non-GET request to the same path is **not** throttled here.
21. Warm-vs-cold (real engine): warm the server, open the venue list, reload it, open "Mer info" then reopen without changing the time → 2nd list load + reopened detail feel materially snappier (buildings 24h + sun 15min caches). Subjective; exact ms is a maintainer preview run.
22. Sun-output integrity: for the same venue + same time-of-day, `currentSunStatus` / sun-window / peak-time (UI **and** `/api/venues/<slug>` JSON) read correct and unchanged from before the perf fix — caching only makes it faster.

## E. Client query hygiene & time-change debounce (9.4)
23. Hard-reload with Network filtered to `venues` → exactly **one** `GET /api/venues` fires, and only **after** location settles (no earlier fallback-coords request that re-fires at GPS = no double-fetch).
24. During the geolocation-pending window → **no** `/api/venues` request while location is still resolving; the first-and-only request appears once status = success/fallback.
25. Drag the time slider rapidly across many 15-min steps in one motion and release → Network shows **at most one** new `/api/venues` after release (not one per snapped step).
26. Throughout that drag → the slider thumb + time badge update continuously and smoothly (decoupled from the deferred query), never freezing on the network.
27. After the drag settles → the venue list/sun data updates to the new settled time (not stale pre-drag data) once the single request resolves.
28. Drag away from the current time then back onto it → reads as an intentional **"live now"** state (any request carries no planner params), not a silent no-op.
29. Favoriter from cache: with Närmast loaded (≥1 favourite visible), clear Network and switch to **Favoriter** → **no** new `/api/venues?ids=` fires, favourites appear instantly; toggling Närmast↔Favoriter issues no further `/api/venues`.

## F. Location & onboarding reliability — desktop + mobile (9.5)
30. Fresh **Incognito** (empty localStorage), reload → the amber welcome overlay covers the whole screen on the **first frame**; the map must **not** briefly show through before it. (Zero map-behind-overlay flash.)
31. On the fresh first-paint overlay, click **"Use my location"** immediately as the very first interaction → the geolocation permission prompt fires **every time** (repeat over a few reloads; never a dead first click).
32. DevTools Sensors set a Gothenburg lat/lng → click Use my location → **Allow** → overlay fades, map recenters, **one** amber dot (18px, white ring, halo) at your coords; change coords + re-trigger → the same dot repositions without flicker.
33. Fresh Incognito → **Block** the prompt (or click skip) → map centres on Gothenburg centrum, **no** amber user-location dot.
34. Mobile viewport (locate button is `lg:hidden` on desktop): click the floating/top-bar locate button → `aria-busy` + pulsing icon (`data-locate-state=pending`); on deny/fallback it **stays clickable** (`data-locate-state=fallback`) and re-requests on re-click.
35. Returning user: after completing a grant/deny once in a normal window, reload (onboarded flag now set) → the map appears **directly** with no welcome overlay and no overlay-then-null flash.

## G. Honest distance labelling — with the integration fix (9.5 / 9.9)
36. **Fallback (deny/skip):** DevTools Sensors "unavailable" (or dismiss the prompt), reload, select a venue → the distance shows the real number annotated **"≈ från centrum"** (sv) / **"≈ from centre"** (en).
37. **Granted:** set a custom geolocation fix in DevTools Sensors, reload, select a venue → the distance shows the number **without** the "≈ från centrum" qualifier.
38. **Parity across all four surfaces (integration fix):** with fallback active, confirm the centrum-relative qualifier appears consistently on the **list card**, the **mobile quick-info card**, the **Favoriter list**, **and** the **venue-detail Avstånd card** — all four agree it's centrum-relative; all drop the qualifier under a real granted fix.

## H. Map chrome consolidation & dead-control cleanup (9.6)
39. Mobile (<1024px): over the map, **only** the vertical zoom +/− stack floats — the previously-floating locate + settings buttons are **gone**.
40. Mobile top search row: click the **settings gear** → it now **opens the settings modal** (previously greyed/`cursor-not-allowed`, did nothing); the gear is not greyed.
41. Mobile top-bar **locate** button (Navigation icon, left of the gear) + watch Elements → `aria-busy=true` + `data-locate-state=pending` + pulse while resolving; recentres on success; on deny/unavailable → `data-locate-state=fallback` and **stays clickable** (no dead-click regression).
42. Desktop (≥1024px): top-nav **"My location"** (crosshair) → map recentres/flies to your location on success (shared fly-to). Confirm both this and the mobile top-bar locate recentre on success.
43. Desktop: the filter-chip row has **no pager chevron `</>` arrows** flanking it — the dead nav-pager chevrons are gone.
44. Mobile venue-list sort/controls row: only the working **Sol** (sun) + **Nära** (distance) sort buttons remain — the disabled **Café** + **Öppet nu** category buttons are gone.
45. Either viewport: click the search box, type a query that returns results, press **Enter without arrowing down** → the first result is selected and the map pans to it (bare-Enter no longer does nothing).

## I. Tag filtering (real data + working chips) — desktop ≥1024px (9.7)
46. Chips enabled + real labels: the top-nav filter-chip row is interactive (not greyed) and shows **real DB tags** (e.g. Innergård, Hund ok, Wifi, Kanal, Kväll — the first-seen union of the 7 venues), not the fabricated placeholders and not a truncated "Takt".
47. Click one chip (e.g. **Innergård**) → the venue **list and the map pins both narrow together**, simultaneously, to only venues carrying that tag.
48. The clicked chip flips to the **on** state (dark `#1b1b1e` bg, white label, `aria-pressed=true`); click again → deactivates and the full set returns.
49. With one chip active, click a **disjoint** second chip (e.g. **Kanal**) → the result set **grows** to venues matching **either** tag (OR/union), it does not shrink to the intersection.
50. A venue with no matching tag is **excluded** while a chip is active and **reappears** once all chips are cleared (clear by toggling each active chip off — there is no "clear all"); a zero-match combination shows the **"Inga platser hittades"** empty state (not a blank list or a stuck skeleton).
51. Switch language → chip labels read with consistent **full casing** (sv Innergård/Kväll ↔ en Courtyard/Evening; never a truncated "Takt"); filtering still matches on the canonical sv value so results are locale-independent.
52. Network hygiene (with a chip active): drag the time slider back and forth → **no burst** of `/api/venues` per step (nav + map queries de-dupe; the tag filter is pure client-side `.filter()`).

## J. Venue sharing — desktop (9.8)
53. Desktop: open a venue detail (right-side panel) → the top-right cluster shows **Heart, Share (arrow), Close**; the Share button is **enabled** (not greyed), frosted-pill styled.
54. Click **Share** → a centered modal opens **above** the detail panel with title **"Dela {venue}"**, a subtitle, a row of **5** brand-colored target tiles, and a copy-link row showing the URL.
55. The copy-link URL reads `http://localhost:3000/?venue=<slug>` (sv default = no locale prefix) with **no** `_state`/`_time`/`_date`/`tags` params, even if the address bar had them.
56. Click **"Kopiera länk"** → flips to **"Kopierad"** + check icon for ~1.8s then reverts; `Ctrl+V` elsewhere pastes exactly the `?venue=<slug>` URL shown.
57. Click a **WhatsApp / Facebook / X / Telegram** tile → a new tab opens the service's share-intent URL prefilled with the venue link/text; click **"E-post"** → the OS mail composer opens with the venue URL in the body.
58. Press **Escape** → modal closes, detail panel stays; re-open + click the dark scrim outside the card → also closes; the modal's **x** button closes only the modal.
59. Desktop browser without `navigator.share` → clicking Share falls back to opening this ShareModal (the button is never dead).
60. Switch to English, open a venue, click Share → title/subtitle/"Copy link"/"Copied"/target labels all render in English ("Share {name}").
61. Reduced motion: enable OS "reduce motion", open the share modal → appears/dismisses opacity-only (no slide/scale spring); all buttons still function.

## K. Venue sharing — mobile + deep-links (9.8)
62. Mobile viewport: open a venue detail (bottom sheet) → the top-right cluster now shows **Heart, Share, Close**; the Share button **exists and is enabled** (mobile previously had none).
63. Mobile with `navigator.share` (mobile Safari/Chrome over HTTPS/localhost): tap Share → the OS native share sheet appears with the venue name as title + the `?venue=<slug>` URL; cancel → nothing else happens (no error, no modal).
64. Deep-link: open `http://localhost:3000/?venue=<real-slug>` in a fresh/incognito tab → the correct venue's detail resolves (recipient lands directly on the shared venue).
65. Deep-link locale: open `http://localhost:3000/en/?venue=<slug>` → resolves the same venue with English UI (the `/en` prefix is preserved).
66. _Known/expected:_ target tiles render text glyphs (Wa/f/X/Tg/@) not brand logos; the clipboard silently no-ops only off HTTPS/localhost.

## L. Mobile quick-info card rework (9.9) — mobile 360–430px
67. Open `http://localhost:3000/?_state=map-with-selected-venue` (390px) → the compact quick-info card renders anchored above a map pin (~230px wide) with a downward triangle tail.
68. Header strip: **% SOL** badge is a small pill top-**left** of the ~72px photo strip, the favourite heart top-**right**; they don't overlap or crowd.
69. The **Close (X)** button is a floating dark pill just **above** the card's top-right corner; clicking it dismisses the card.
70. Card body shows **only**: centered venue name, an amber sun-window line, a confidence % figure, and the distance — **no** EXPONERING block, **no** uncertainty/Osäker reason, **no** "Blir skuggigt om X min", **no** explanatory paragraph (9.1 removals applied here).
71. Bottom row: a full-width-ish **VISA RUTT** gold→amber gradient button (left) + an outlined **MER INFO** button (right); both enabled, not greyed.
72. Tap **VISA RUTT** → the route action fires (route overlay / maps affordance opens) — wired, not dead.
73. Tap **MER INFO** (or the centered venue name) → the full venue detail view opens.
74. Tap the favourite **heart** on the strip → toggles filled/unfilled.
75. Full-sun (`&_time=13:00`) → high **% SOL** badge + populated sun window; layout holds, no overflow/clipping at 360px.
76. Shaded/partial (`&_time=21:00`) → the sun line shows the **"Soltid saknas"** fallback (not a range); card still renders cleanly, no overflow at 360–430px.
77. Repeat at 360px and 430px → name, sun line, distance, and both CTAs fit without horizontal overflow or truncation.
78. Planner-collision: with the **"Planera soltid"** time-slider panel visible, select a pin near the **top** of the map → the card is pushed down so its top edge / **% SOL** badge sits clearly **below** the planner panel with a visible gap (no overlap).
79. Animation: select a venue then a different pin → content crossfades to the new venue; dismissing slides/fades out; with OS "reduce motion" on, transitions are opacity-only (no slide/scale).

## M. Mobile verification pass — the rework holds on mobile (9.10)
80. Mobile (iPhone-14 emulation), clear localStorage, load `/` → the welcome overlay gates the map, the shell behind is inert/`aria-hidden`, no map flash-through.
81. Grant a Gothenburg geolocation override + reload with the onboarded flag set → one amber user-location pin at your coords; absent on fallback. (DevTools emulation doesn't faithfully fire the onboarding-CTA `getCurrentPosition`; use this returning-user auto-acquire path — the CTA-prompt-on-real-GPS is a real-device check, see §P.)
82. Mobile `/` → a **single** control set: top-bar locate + settings enabled, the gear opens the Settings modal, the duplicate floating locate/settings over the map are gone, zoom +/− remain.
83. Mobile `/?venue=test-venue-sunny&_state=venue-detail` → the detail sheet shows an enabled **"Dela plats"** share button (tapping invokes native share where supported).
84. Mobile `/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=13:00` → the reworked quick-info card renders without overflow and sits clear below the "Planera soltid" planner panel (badge not jammed under the slider).
85. Mobile venue detail → no EXPONERING / uncertainty-reason / "Blir skuggigt om X min" / fabricated "BÄST KL."/"Platser ute ~N" cards / orphaned separators; the real **% Säkerhet** + **Avstånd** cards remain; the VISA RUTT CTA is the gold→bright-amber ramp with no olive start.
86. Normal map path unbroken: `/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=13:00` → the quick-info card anchors to the pin (a well-formed venue still projects/positions), with **no** repeated MapLibre "Expected value to be of type number, but found null" warning in the Console while panning/zooming.

## N. PRODUCTION-ONLY checks (run against a deployed/prod build — `npm run build && npm run start`)
87. **PRODUCTION-ONLY (9.0 planner-gate):** open `/?_time=21:00&_date=2026-07-01` → forcing is **ignored**: live current Stockholm time/date shown, clock advances. Open `/?_time=13:00` (time only) → still ignored. Open plain `/` → identical live-clock behaviour. (For contrast, on `npm run dev` the same `/?_time=21:00&_date=2026-07-01` **does** pin 21:00 and does not advance — forcing honoured in dev only.)
88. **PRODUCTION-ONLY (9.5 SW-update reload):** on a deployed build, activate a new service worker over an already-open tab → exactly **one** auto-reload, no reload loop. (Not testable on `npm run dev` — SW is disabled in dev.)

## O. Optional automated regression sanity (not manual UAT, run if desired)
89. `npx tsc --noEmit` (0 errors), `npx eslint . --quiet` (0), `npx vitest run` (all green). The Epic 9 behavioural guards live in `test/components/AppContextProviders.test.tsx`, `test/unit/queries/deferred-planner-query.test.tsx`, `test/unit/queries/clean-url-date-selection.test.tsx`, `test/components/MapView.test.tsx`, `test/components/UserLocationLayer.atdd.test.tsx`, `test/components/UserPin.test.tsx`, and `test/e2e/epic-9-mobile-regression.spec.ts`.

## P. Real-device-only (cannot be exercised in dev/emulation — maintainer)
- Physical native `navigator.share()` on a real phone (the OS share sheet).
- The real-GPS onboarding-CTA permission prompt (DevTools emulation does not faithfully fire `getCurrentPosition` from the CTA).
- The stale mobile reference-PNG rebaseline for the automated visual gate is a maintainer follow-up (out of scope for manual UAT).
