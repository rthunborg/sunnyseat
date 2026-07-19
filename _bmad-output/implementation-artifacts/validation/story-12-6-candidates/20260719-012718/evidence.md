# Story 12.6 non-authoritative candidate captures

Captured 2026-07-19 from the running SunnySeat implementation. These files are **candidate review evidence only**. They do not replace or bless any authoritative reference PNG.

## Capture environment

- Application command: `npm run dev` from `C:\Users\Rasmus\sunnyseat\nextjs-app`
- Capture origin and port: `http://localhost:3000`
- Owned server process trees: initial batch root PID `49220`; fixed-state recapture root PID `23548`. Each was stopped through its exact `taskkill /PID <pid> /T /F` tree after capture. Roots and descendants were confirmed gone, and ports `3000` and `50922` were confirmed free.
- Browser: Windows-native Playwright Chromium, headless
- Locale: `sv-SE`; `Accept-Language: sv-SE,sv;q=0.9`; `html[lang="sv"]` asserted
- Time zone: `Europe/Stockholm`
- Motion/color: reduced motion, light color scheme, screenshot animations disabled
- Viewports: mobile `390x844`, desktop `1440x900`, both at device scale factor 2. Written PNG dimensions are therefore `780x1688` and `2880x1800`.
- Storage before each navigation: `sunnyseat_onboarded=1`; favourites screens additionally used `sunnyseat_favourite_ids=["1","2"]`.
- Readiness: bounded `domcontentloaded`, `networkidle`, font, map-tile-cover, and stable-selector waits. The Next development portal was hidden as non-product chrome.

An initial attempt used an available high port (`50922`). On that origin the locale middleware returned a self-redirecting `307` (`x-middleware-rewrite: http://localhost:50922/sv?...`, `location: /?...`) and Playwright stopped with `ERR_TOO_MANY_REDIRECTS`. No screenshot was written from that attempt. Restarting the exact repository Playwright/web-server command on its established `localhost:3000` environment returned HTTP 200 and resolved the loop.

## Capture results

| Viewport | Screen ID | Canonical route | Pre-capture assertions | Candidate | Console/page errors |
|---|---|---|---|---|---|
| Mobile `390x844` | `map-primary` | `/?_state=map-primary&_time=14:00` | Map visible; tile cover absent; 7 pins visible; sheet forced to resting `data-state="peek"`; tag-chip row absent | `mobile-map-primary.png` | None |
| Mobile `390x844` | `map-panel-venues` | `/?_state=map-panel-venues&_time=14:00` | Map visible; 7 pins visible; sheet `mid`; venue cards and tag chips visible | `mobile-map-panel-venues.png` | Venue API HTTP 400 noted below |
| Mobile `390x844` | `map-with-selected-venue` | `/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00` | Map visible; 7 pins visible; one selected sunny pin retains its tail/data shape; non-obscured QuickInfo visible | `mobile-map-with-selected-venue.png` | Venue API HTTP 400 noted below |
| Mobile `390x844` | `map-with-obscured-venue` | `/?_state=map-with-obscured-venue&_time=14:00` | Map and obscured QuickInfo visible; bounded reconciliation wait; all 7 visible pins `shaded`, cloud-icon, percentage-free in text and ARIA, Swedish `inte soligt vid vald tid`; selected pin included | `mobile-map-with-obscured-venue.png` | Venue API HTTP 400 noted below |
| Mobile `390x844` | `favourites-tab` | `/favoriter?_state=favourites-tab&_time=14:00` | Map and pins visible; favourites nav active; sheet `mid`; 2 seeded venue cards visible | `mobile-favourites-tab.png` | Venue API HTTP 400 noted below |
| Desktop `1440x900` | `map-primary` | `/?_time=16:30` | Map visible; tile cover absent; 7 pins visible; desktop venue-list panel and card visible | `desktop-map-primary.png` | Venue API HTTP 400 and React hydration page error noted below |
| Desktop `1440x900` | `map-with-obscured-venue` | `/?_state=map-with-obscured-venue&_time=14:00` | Map and obscured QuickInfo visible; bounded reconciliation wait; all 7 visible pins `shaded`, cloud-icon, percentage-free in text and ARIA, Swedish `inte soligt vid vald tid`; selected pin included | `desktop-map-with-obscured-venue.png` | Venue API HTTP 400 noted below |
| Desktop `1440x900` | `favourites-tab` | `/favoriter?_state=favourites-tab&_time=14:00` | Map and pins visible; desktop favourites panel contains 2 seeded venue cards | `desktop-favourites-tab.png` | Venue API HTTP 400 noted below |
| Desktop `1440x900` | `venue-detail` | `/?venue=test-venue-sunny&_state=venue-detail&_time=16:30` | Map and pins visible; desktop list panel visible; 390 px detail panel visible; detail skeleton absent; obscured diagnostic absent | `desktop-venue-detail.png` | Venue API HTTP 400 noted below |
| Desktop `1440x900` | `venue-detail-obscured` | `/?venue=test-venue-sunny&_state=venue-detail-obscured&_time=16:30` | Map visible; tile cover absent; 7 pins visible; 390 px detail panel and `venue-detail-obscured` diagnostic visible; skeleton absent; selected Kafé Magasinet pin `shaded`, cloud-only, percentage-free in text and ARIA, Swedish `inte soligt vid vald tid`; unrelated pins retained 3 expected sunny and 3 expected grey states | `desktop-venue-detail-obscured.png` | None on fixed-state recapture |

The two obscured-map screenshots were taken only after polling the marker reconciliation condition. An earlier immediate assertion saw only the selected marker updated; a bounded diagnostic then proved all seven markers converge to the expected grey/cloud/percentage-free state, after which both screenshots were recaptured.

The first `venue-detail-obscured` attempt was intentionally not written because the selected marker remained amber `92%`. After the implementation fix, the single-screen recapture passed the selected-marker contract and proved the unrelated markers remained unchanged: sunny `Bryggerietsoltak` (`85%`), `Solplats Magasinsgatan` (`70%`), and `Café Halvvägs` (`57%`); grey percentage-free `Brygghuset Lerum`, `Skuggans Hus`, and `Bistro Bakgården`. The final candidate was then written.

## Browser errors observed

Most non-`map-primary` mobile captures and the original desktop batch logged one failed venue request:

`HTTP 400 http://localhost:3000/api/venues?lat=57.7089&lng=11.9746&radiusKm=1.5&date=2026-05-20&time=16%3A30`

The exact time parameter varied with the canonical route. Forced/seeded UI semantics still settled and passed the assertions listed above. No candidate suppresses or hides this observation.

`desktop-map-primary` also emitted a React hydration page error beginning: `Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client.` The stable map, pins, list panel, and card assertions subsequently passed before the screenshot was written. No other captured page emitted a page error.

The fixed-state `desktop-venue-detail-obscured` recapture emitted no console errors, page errors, failed requests, or HTTP responses with status 400 or above.

## Candidate inventory

| File | PNG dimensions | Bytes | SHA-256 |
|---|---:|---:|---|
| `desktop-favourites-tab.png` | `2880x1800` | 2,557,247 | `4f98f31c4ef9e178b0364dbbaeae8fa0c4443680f204d81698b5cbbc3554aac2` |
| `desktop-map-primary.png` | `2880x1800` | 2,871,680 | `073294af904d6f65163eceeefd6be492b5308333bf874f86f0cef7d0a1b36ec4` |
| `desktop-map-with-obscured-venue.png` | `2880x1800` | 2,683,081 | `6b1e14731a7729472f89752b011cf52c4fc3aab9b6401759b7523df64d293049` |
| `desktop-venue-detail.png` | `2880x1800` | 2,389,545 | `05f3321ce879b0b52710dc2b6b973a21f3270bea16b3640653e96fde830f723e` |
| `desktop-venue-detail-obscured.png` | `2880x1800` | 2,364,049 | `7c510fb51fa542c4e57ad12630ac739e60f5408680503b5c0d5ed1ca6b18f802` |
| `mobile-favourites-tab.png` | `780x1688` | 570,933 | `1d12b31c8fcb4a2f116f2341c008d66896ff48760bb5f5597e5c1d8019b74c92` |
| `mobile-map-panel-venues.png` | `780x1688` | 535,299 | `5b168fac021deb8e0b3e9567fa9fa8d4adf4837fee772cceb1f26ade3e98d3c6` |
| `mobile-map-primary.png` | `780x1688` | 754,264 | `74b6685f267b9d4e578b99be7dfded6d3973d9bbf071fc7beeb54c2fdaca6c97` |
| `mobile-map-with-obscured-venue.png` | `780x1688` | 700,193 | `b5ed4b6061fbfef167c29ea76db70d85ff640169f1e892cf1503aad1929f219a` |
| `mobile-map-with-selected-venue.png` | `780x1688` | 720,292 | `d3f65d7ed9fa76267d481799bce725f5d8f0ab8fc0ef8e77066a8115c92144ba` |

Absolute candidate directory:

`C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\validation\story-12-6-candidates\20260719-012718`

No application code, story/sprint state, authoritative reference PNG, capture recipe, design document, route map, or rebaseline log was changed.
