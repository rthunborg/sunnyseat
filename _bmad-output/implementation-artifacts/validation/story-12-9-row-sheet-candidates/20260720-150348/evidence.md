> INVALIDATED 2026-07-20: superseded by later hardened Story 12.9 capture work. This run used the pre-hardened capture contract, recorded candidate/reference drift before subsequent implementation fixes, and must not be used for rebaseline approval.

# Story 12.9 non-authoritative row-sheet candidate captures

Captured 2026-07-20T13:08:58.192Z from the running SunnySeat implementation. These files are **candidate review evidence only**. They do not replace or bless any authoritative reference PNG.

## Capture environment

- Application command: `npm run dev` from `C:\Users\Rasmus\sunnyseat\nextjs-app` when no reusable server was already answering.
- Capture origin and port: `http://localhost:3000`
- Dev server: started by this script (pid 52372; logs `dev-server.stdout.log`, `dev-server.stderr.log`)
- Browser: Windows-native Playwright Chromium, headless
- Locale: `sv-SE`; `Accept-Language: sv-SE,sv;q=0.9`; `html[lang]` recorded per page
- Time zone: `Europe/Stockholm`
- Motion/color: reduced motion, light color scheme, screenshot animations disabled
- Viewports: mobile `390x844`, desktop `1440x900`, both at device scale factor 2.
- Storage before each navigation: `sunnyseat_onboarded=1`.
- Readiness: `domcontentloaded`, best-effort `networkidle`, font readiness, explicit product selectors, and a 1s settle before screenshot. The Next development portal was hidden as non-product chrome.
- Scope: Story 12.9 row-count bottom sheet and slim mobile time slider evidence. No canonical reference PNG was overwritten.

## Candidate inventory and reference comparison

| Viewport | Screen ID | Variant | Route | Candidate | PNG dimensions | Bytes | Candidate SHA-256 | Reference exists | Candidate vs reference SHA | Reference SHA-256 | Status |
|---|---|---|---|---|---:|---:|---|---|---|---|---|
| mobile | `map-primary` | `slim-slider-rows-0` | `/?_state=map-primary&_time=14:00` | `mobile-map-primary-slim-slider-rows-0.png` | 780x1688 | 826250 | `f8b32f8964b0e53e216d57b310a544a9f7f3be8c7e3169ba4cda5e2ae71aa483` | yes | different | `74b6685f267b9d4e578b99be7dfded6d3973d9bbf071fc7beeb54c2fdaca6c97` | captured |
| mobile | `map-panel-venues` | `rows-0` | `/?_state=map-panel-venues&_time=14:00&_sheetRows=0` | `mobile-map-panel-venues-rows-0.png` | 780x1688 | 826250 | `f8b32f8964b0e53e216d57b310a544a9f7f3be8c7e3169ba4cda5e2ae71aa483` | yes | different | `5b168fac021deb8e0b3e9567fa9fa8d4adf4837fee772cceb1f26ade3e98d3c6` | captured |
| mobile | `map-panel-venues` | `rows-1` | `/?_state=map-panel-venues&_time=14:00&_sheetRows=1` | `mobile-map-panel-venues-rows-1.png` | 780x1688 | 600282 | `ae054e53540064259a8692aeeba0772f20900c55e36bf218cd45eb33949ecec1` | yes | different | `5b168fac021deb8e0b3e9567fa9fa8d4adf4837fee772cceb1f26ade3e98d3c6` | captured |
| mobile | `map-panel-venues` | `rows-3` | `/?_state=map-panel-venues&_time=14:00&_sheetRows=3` | `mobile-map-panel-venues-rows-3.png` | 780x1688 | 445940 | `f052cd73dbbd81c95b0490dbd9329256ee43994aee550def63e7f981973f4c6a` | yes | different | `5b168fac021deb8e0b3e9567fa9fa8d4adf4837fee772cceb1f26ade3e98d3c6` | captured |
| mobile | `map-panel-venues` | `rows-max` | `/?_state=map-panel-venues&_time=14:00&_sheetRows=max` | `mobile-map-panel-venues-rows-max.png` | 780x1688 | 395069 | `9b8c4533e038ead8f0e32b06d4f3b7893dd0cb16f71f471ad7414e4ee21ebc6a` | yes | different | `5b168fac021deb8e0b3e9567fa9fa8d4adf4837fee772cceb1f26ade3e98d3c6` | captured |
| mobile | `map-panel-venues` | `mid-drag` | `/?_state=map-panel-venues&_time=14:00&_sheetDrag=mid` | `mobile-map-panel-venues-mid-drag.png` | 780x1688 | 398305 | `b6726c5691aa2998553518400802979b716b8411bd30dceae6583ba350486e47` | yes | different | `5b168fac021deb8e0b3e9567fa9fa8d4adf4837fee772cceb1f26ade3e98d3c6` | captured |
| desktop | `map-primary` | `desktop-regression` | `/?_time=16:30` | `desktop-map-primary-desktop-regression.png` | 2880x1800 | 2754600 | `9078ea1a20929b0d26725b1a78ff8526f9c4e9a7eed1e7d0c2f6a787bd4c5c2c` | yes | different | `073294af904d6f65163eceeefd6be492b5308333bf874f86f0cef7d0a1b36ec4` | captured |

## Result

- Captured: 7
- Failed/assertion-failed: 0
- Canonical refs promoted: 0

All candidate captures satisfied their DOM assertions before screenshot write.

## Per-target evidence

### mobile/map-primary/slim-slider-rows-0

- Route: `/?_state=map-primary&_time=14:00`
- URL: `http://localhost:3000/?_state=map-primary&_time=14:00`
- Candidate: `mobile-map-primary-slim-slider-rows-0.png`
- Reference compared: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\mobile\map-primary.png`
- HTML lang: `sv`
- Status: `captured`

Assertions:
  - map visible: true
  - visible pin count: 7
  - planner visible and sized: {"box":{"x":16,"y":72,"width":358,"height":83},"className":"z-glass-panel bg-glass-slider text-text-primary backdrop-blur-heavy rounded-panel px-4 pt-3 pb-2 shadow-card-up lg:hidden absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+var(--spacing)*18)]"}
  - mobile row sheet state: {"visibleRows":0,"maxRows":4,"rowHeight":96,"sheetHeight":44,"attrs":{"state":"rows-0","visibleRows":"0","maxRows":"4","rowHeight":"96","sheetHeight":"44","dragging":"false","className":"absolute inset-x-0 bottom-[calc(var(--size-mobile-nav-h)+env(safe-area-inset-bottom))] z-bottom-sheet-peek flex flex-col overflow-hidden rounded-t-panel bg-surface-cream text-text-primary shadow-sheet-peek-up lg:hidden touch-pan-y","style":"height: 44px; max-height: 554px; opacity: 1;"},"bodyAttrs":{"ariaHidden":"true","inert":true,"className":"min-h-0 flex-1 px-4 pb-4 pointer-events-none","rect":{"width":390,"height":16}},"chromeBox":{"x":16,"y":792,"width":358,"height":112},"scrollBodyBox":{"x":16,"y":904,"width":358,"height":0}}

Assertion failures:
  - none

Console/page/request/HTTP observations:
  - console: 8
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"warning","text":"[.WebGL-0x5f1403462400]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels"}
    - {"type":"warning","text":"[.WebGL-0x5f1403462400]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels"}
    - {"type":"warning","text":"[.WebGL-0x5f1403462400]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels"}
    - {"type":"warning","text":"[.WebGL-0x5f1403462400]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat)"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
  - requestFailed: 1
    - {"method":"GET","url":"http://localhost:3000/api/venues?lat=57.7089&lng=11.9746&radiusKm=1.5&date=2026-05-20&time=14%3A00","failure":"net::ERR_ABORTED"}

### mobile/map-panel-venues/rows-0

- Route: `/?_state=map-panel-venues&_time=14:00&_sheetRows=0`
- URL: `http://localhost:3000/?_state=map-panel-venues&_time=14:00&_sheetRows=0`
- Candidate: `mobile-map-panel-venues-rows-0.png`
- Reference compared: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\mobile\map-panel-venues.png`
- HTML lang: `sv`
- Status: `captured`

Assertions:
  - map visible: true
  - visible pin count: 7
  - planner visible and sized: {"box":{"x":16,"y":72,"width":358,"height":83},"className":"z-glass-panel bg-glass-slider text-text-primary backdrop-blur-heavy rounded-panel px-4 pt-3 pb-2 shadow-card-up lg:hidden absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+var(--spacing)*18)]"}
  - mobile row sheet state: {"visibleRows":0,"maxRows":4,"rowHeight":96,"sheetHeight":44,"attrs":{"state":"rows-0","visibleRows":"0","maxRows":"4","rowHeight":"96","sheetHeight":"44","dragging":"false","className":"absolute inset-x-0 bottom-[calc(var(--size-mobile-nav-h)+env(safe-area-inset-bottom))] z-bottom-sheet-peek flex flex-col overflow-hidden rounded-t-panel bg-surface-cream text-text-primary shadow-sheet-peek-up lg:hidden touch-pan-y","style":"height: 44px; max-height: 554px; opacity: 1;"},"bodyAttrs":{"ariaHidden":"true","inert":true,"className":"min-h-0 flex-1 px-4 pb-4 pointer-events-none","rect":{"width":390,"height":16}},"chromeBox":{"x":16,"y":792,"width":358,"height":112},"scrollBodyBox":{"x":16,"y":904,"width":358,"height":0}}

Assertion failures:
  - none

Console/page/request/HTTP observations:
  - console: 5
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"error","text":"Failed to load resource: the server responded with a status of 400 (Bad Request)"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
  - httpErrors: 1
    - {"status":400,"url":"http://localhost:3000/api/venues?lat=57.7089&lng=11.9746&radiusKm=1.5&date=2026-05-20&time=14%3A00"}

### mobile/map-panel-venues/rows-1

- Route: `/?_state=map-panel-venues&_time=14:00&_sheetRows=1`
- URL: `http://localhost:3000/?_state=map-panel-venues&_time=14:00&_sheetRows=1`
- Candidate: `mobile-map-panel-venues-rows-1.png`
- Reference compared: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\mobile\map-panel-venues.png`
- HTML lang: `sv`
- Status: `captured`

Assertions:
  - map visible: true
  - visible pin count: 7
  - planner visible and sized: {"box":{"x":16,"y":72,"width":358,"height":83},"className":"z-glass-panel bg-glass-slider text-text-primary backdrop-blur-heavy rounded-panel px-4 pt-3 pb-2 shadow-card-up lg:hidden absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+var(--spacing)*18)]"}
  - mobile row sheet state: {"visibleRows":1,"maxRows":4,"rowHeight":96,"sheetHeight":268,"attrs":{"state":"rows-1","visibleRows":"1","maxRows":"4","rowHeight":"96","sheetHeight":"268","dragging":"false","className":"absolute inset-x-0 bottom-[calc(var(--size-mobile-nav-h)+env(safe-area-inset-bottom))] z-bottom-sheet-peek flex flex-col overflow-hidden rounded-t-panel bg-surface-cream text-text-primary shadow-sheet-peek-up lg:hidden touch-pan-y","style":"height: 267.5px; max-height: 554px; opacity: 1;"},"bodyAttrs":{"ariaHidden":"false","inert":false,"className":"min-h-0 flex-1 px-4 pb-4","rect":{"width":390,"height":223.5}},"chromeBox":{"x":16,"y":568.5,"width":358,"height":112},"scrollBodyBox":{"x":16,"y":680.5,"width":358,"height":95.5}}
  - venue-card count: 7

Assertion failures:
  - none

Console/page/request/HTTP observations:
  - console: 5
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"error","text":"Failed to load resource: the server responded with a status of 400 (Bad Request)"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
  - httpErrors: 1
    - {"status":400,"url":"http://localhost:3000/api/venues?lat=57.7089&lng=11.9746&radiusKm=1.5&date=2026-05-20&time=14%3A00"}

### mobile/map-panel-venues/rows-3

- Route: `/?_state=map-panel-venues&_time=14:00&_sheetRows=3`
- URL: `http://localhost:3000/?_state=map-panel-venues&_time=14:00&_sheetRows=3`
- Candidate: `mobile-map-panel-venues-rows-3.png`
- Reference compared: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\mobile\map-panel-venues.png`
- HTML lang: `sv`
- Status: `captured`

Assertions:
  - map visible: true
  - visible pin count: 7
  - planner visible and sized: {"box":{"x":16,"y":72,"width":358,"height":83},"className":"z-glass-panel bg-glass-slider text-text-primary backdrop-blur-heavy rounded-panel px-4 pt-3 pb-2 shadow-card-up lg:hidden absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+var(--spacing)*18)]"}
  - mobile row sheet state: {"visibleRows":3,"maxRows":4,"rowHeight":96,"sheetHeight":459,"attrs":{"state":"rows-3","visibleRows":"3","maxRows":"4","rowHeight":"96","sheetHeight":"459","dragging":"false","className":"absolute inset-x-0 bottom-[calc(var(--size-mobile-nav-h)+env(safe-area-inset-bottom))] z-bottom-sheet-peek flex flex-col overflow-hidden rounded-t-panel bg-surface-cream text-text-primary shadow-sheet-peek-up lg:hidden touch-pan-y","style":"height: 458.5px; max-height: 554px; opacity: 1;"},"bodyAttrs":{"ariaHidden":"false","inert":false,"className":"min-h-0 flex-1 px-4 pb-4","rect":{"width":390,"height":414.5}},"chromeBox":{"x":16,"y":377.5,"width":358,"height":112},"scrollBodyBox":{"x":16,"y":489.5,"width":358,"height":286.5}}
  - venue-card count: 7

Assertion failures:
  - none

Console/page/request/HTTP observations:
  - console: 5
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"error","text":"Failed to load resource: the server responded with a status of 400 (Bad Request)"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
  - httpErrors: 1
    - {"status":400,"url":"http://localhost:3000/api/venues?lat=57.7089&lng=11.9746&radiusKm=1.5&date=2026-05-20&time=14%3A00"}

### mobile/map-panel-venues/rows-max

- Route: `/?_state=map-panel-venues&_time=14:00&_sheetRows=max`
- URL: `http://localhost:3000/?_state=map-panel-venues&_time=14:00&_sheetRows=max`
- Candidate: `mobile-map-panel-venues-rows-max.png`
- Reference compared: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\mobile\map-panel-venues.png`
- HTML lang: `sv`
- Status: `captured`

Assertions:
  - map visible: true
  - visible pin count: 7
  - planner visible and sized: {"box":{"x":16,"y":72,"width":358,"height":83},"className":"z-glass-panel bg-glass-slider text-text-primary backdrop-blur-heavy rounded-panel px-4 pt-3 pb-2 shadow-card-up lg:hidden absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+var(--spacing)*18)]"}
  - mobile row sheet state: {"visibleRows":4,"maxRows":4,"rowHeight":96,"sheetHeight":554,"attrs":{"state":"rows-4","visibleRows":"4","maxRows":"4","rowHeight":"96","sheetHeight":"554","dragging":"false","className":"absolute inset-x-0 bottom-[calc(var(--size-mobile-nav-h)+env(safe-area-inset-bottom))] z-bottom-sheet-peek flex flex-col overflow-hidden rounded-t-panel bg-surface-cream text-text-primary shadow-sheet-peek-up lg:hidden touch-pan-y","style":"height: 554px; max-height: 554px; opacity: 1;"},"bodyAttrs":{"ariaHidden":"false","inert":false,"className":"min-h-0 flex-1 px-4 pb-4","rect":{"width":390,"height":510}},"chromeBox":{"x":16,"y":282,"width":358,"height":112},"scrollBodyBox":{"x":16,"y":394,"width":358,"height":382}}
  - venue-card count: 7

Assertion failures:
  - none

Console/page/request/HTTP observations:
  - console: 5
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"error","text":"Failed to load resource: the server responded with a status of 400 (Bad Request)"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
  - httpErrors: 1
    - {"status":400,"url":"http://localhost:3000/api/venues?lat=57.7089&lng=11.9746&radiusKm=1.5&date=2026-05-20&time=14%3A00"}

### mobile/map-panel-venues/mid-drag

- Route: `/?_state=map-panel-venues&_time=14:00&_sheetDrag=mid`
- URL: `http://localhost:3000/?_state=map-panel-venues&_time=14:00&_sheetDrag=mid`
- Candidate: `mobile-map-panel-venues-mid-drag.png`
- Reference compared: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\mobile\map-panel-venues.png`
- HTML lang: `sv`
- Status: `captured`

Assertions:
  - map visible: true
  - visible pin count: 7
  - planner visible and sized: {"box":{"x":16,"y":72,"width":358,"height":83},"className":"z-glass-panel bg-glass-slider text-text-primary backdrop-blur-heavy rounded-panel px-4 pt-3 pb-2 shadow-card-up lg:hidden absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+var(--spacing)*18)]"}
  - mobile row sheet state: {"visibleRows":3,"maxRows":4,"rowHeight":96,"sheetHeight":507,"attrs":{"state":"rows-3","visibleRows":"3","maxRows":"4","rowHeight":"96","sheetHeight":"507","dragging":"true","className":"absolute inset-x-0 bottom-[calc(var(--size-mobile-nav-h)+env(safe-area-inset-bottom))] z-bottom-sheet-peek flex flex-col overflow-hidden rounded-t-panel bg-surface-cream text-text-primary shadow-sheet-peek-up lg:hidden touch-pan-y","style":"height: 506.5px; max-height: 554px; opacity: 1;"},"bodyAttrs":{"ariaHidden":"false","inert":false,"className":"min-h-0 flex-1 px-4 pb-4","rect":{"width":390,"height":462.5}},"chromeBox":{"x":16,"y":329.5,"width":358,"height":112},"scrollBodyBox":{"x":16,"y":441.5,"width":358,"height":286.5}}
  - venue-card count: 7

Assertion failures:
  - none

Console/page/request/HTTP observations:
  - console: 5
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"error","text":"Failed to load resource: the server responded with a status of 400 (Bad Request)"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
  - httpErrors: 1
    - {"status":400,"url":"http://localhost:3000/api/venues?lat=57.7089&lng=11.9746&radiusKm=1.5&date=2026-05-20&time=14%3A00"}

### desktop/map-primary/desktop-regression

- Route: `/?_time=16:30`
- URL: `http://localhost:3000/?_time=16:30`
- Candidate: `desktop-map-primary-desktop-regression.png`
- Reference compared: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\desktop\map-primary.png`
- HTML lang: `sv`
- Status: `captured`

Assertions:
  - map visible: true
  - visible pin count: 7
  - planner visible and sized: {"box":{"x":356,"y":789,"width":1068,"height":87},"className":"z-glass-panel bg-glass-slider text-text-primary backdrop-blur-heavy hidden rounded-panel px-6 py-3 shadow-card-up lg:flex lg:items-center lg:gap-5 absolute bottom-6 left-[calc(var(--size-venue-list-desktop-w)+1rem)] transition-[right] duration-200 ease-default motion-reduce:transition-none right-4"}
  - desktop venue panel visible: {"box":{"x":0,"y":84,"width":340,"height":816}}

Assertion failures:
  - none

Console/page/request/HTTP observations:
  - console: 5
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"error","text":"Failed to load resource: the server responded with a status of 400 (Bad Request)"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
  - pageErrors: 1
    - Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used: - A server/client branch `if (typeof
  - httpErrors: 1
    - {"status":400,"url":"http://localhost:3000/api/venues?lat=57.7089&lng=11.9746&radiusKm=1.5&date=2026-05-20&time=16%3A30"}
