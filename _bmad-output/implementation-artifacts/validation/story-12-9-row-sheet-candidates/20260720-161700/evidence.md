> REVIEW NOTE 2026-07-20: mobile Story 12.9 row-sheet captures passed the hardened DOM assertions. The desktop canonical regression target remains `assertion-failed` only because of the inherited OnboardingGate hydration pageError on `/?_time=16:30`; this is Story 12.4 console/hydration cleanup scope and requires explicit human accept-with-rationale if these mobile candidates are reviewed before Story 12.4 lands.

# Story 12.9 non-authoritative row-sheet candidate captures

Captured 2026-07-20T14:16:37.983Z from the running SunnySeat implementation. These files are **candidate review evidence only**. They do not replace or bless any authoritative reference PNG.

## Capture environment

- Application command: `npm run dev` from `C:\Users\Rasmus\sunnyseat\nextjs-app` when no reusable server was already answering.
- Capture origin and port: `http://localhost:3000`
- Dev server: started by this script (pid 54780; logs `dev-server.stdout.log`, `dev-server.stderr.log`)
- Browser: Windows-native Playwright Chromium, headless
- Locale: `sv-SE`; `Accept-Language: sv-SE,sv;q=0.9`; `html[lang]` recorded per page
- Time zone: `Europe/Stockholm`
- Motion/color: reduced motion, light color scheme, screenshot animations disabled
- Viewports: mobile `390x844`, desktop `1440x900`, both at device scale factor 2.
- Onboarding: no preseeded localStorage; if the first-visit overlay appears, the script dismisses it through the product skip CTA after hydration and records any hydration pageError as a product observation.
- Data seam: Playwright `page.route('**/api/venues?**')` fulfills a deterministic 7-venue DTO response, matching the existing Epic 10/11 E2E convention and avoiding the transient hydration-seed `2026-05-20` API request during screenshot capture.
- Readiness: `domcontentloaded`, best-effort `networkidle`, font readiness, explicit product selectors, and a 1s settle before screenshot. The Next development portal was hidden as non-product chrome.
- Scope: Story 12.9 row-count bottom sheet and slim mobile time slider evidence. No canonical reference PNG was overwritten.

## Candidate inventory and reference comparison

| Viewport | Screen ID | Variant | Route | Candidate | PNG dimensions | Bytes | Candidate SHA-256 | Reference exists | Candidate vs reference SHA | Reference SHA-256 | Status |
|---|---|---|---|---|---:|---:|---|---|---|---|---|
| mobile | `map-primary` | `slim-slider-rows-0` | `/?_state=map-primary&_time=14:00` | `mobile-map-primary-slim-slider-rows-0.png` | 780x1688 | 824435 | `7ecf1c78271e3358e756b26595fb5889c5d4c5f66550a3cdc1142f560f94d6b5` | yes | different | `74b6685f267b9d4e578b99be7dfded6d3973d9bbf071fc7beeb54c2fdaca6c97` | captured |
| mobile | `map-panel-venues` | `rows-0` | `/?_state=map-panel-venues&_time=14:00&_sheetRows=0` | `mobile-map-panel-venues-rows-0.png` | 780x1688 | 824435 | `7ecf1c78271e3358e756b26595fb5889c5d4c5f66550a3cdc1142f560f94d6b5` | yes | different | `5b168fac021deb8e0b3e9567fa9fa8d4adf4837fee772cceb1f26ade3e98d3c6` | captured |
| mobile | `map-panel-venues` | `rows-1` | `/?_state=map-panel-venues&_time=14:00&_sheetRows=1` | `mobile-map-panel-venues-rows-1.png` | 780x1688 | 593733 | `f49ef7482899271767426e5fa848cf8ef15c754f7312fa0a0328c88264320b7d` | yes | different | `5b168fac021deb8e0b3e9567fa9fa8d4adf4837fee772cceb1f26ade3e98d3c6` | captured |
| mobile | `map-panel-venues` | `rows-3` | `/?_state=map-panel-venues&_time=14:00&_sheetRows=3` | `mobile-map-panel-venues-rows-3.png` | 780x1688 | 437330 | `28aca74a875106b7555aa59de1d450d7c93fa61a137eee8ae3c585bb41f2c8ff` | yes | different | `5b168fac021deb8e0b3e9567fa9fa8d4adf4837fee772cceb1f26ade3e98d3c6` | captured |
| mobile | `map-panel-venues` | `rows-max` | `/?_state=map-panel-venues&_time=14:00&_sheetRows=max` | `mobile-map-panel-venues-rows-max.png` | 780x1688 | 380241 | `0d3899106db6ca615bf6fdfb3ca1a9cee7d6cfc5537c25fe663deef26efbf188` | yes | different | `5b168fac021deb8e0b3e9567fa9fa8d4adf4837fee772cceb1f26ade3e98d3c6` | captured |
| mobile | `map-panel-venues` | `mid-drag` | `/?_state=map-panel-venues&_time=14:00&_sheetDrag=mid` | `mobile-map-panel-venues-mid-drag.png` | 780x1688 | 411863 | `5e7151c6d743da9ed59c3c29554811ae7e2e04008c124319c2437c983a4e12b1` | yes | different | `5b168fac021deb8e0b3e9567fa9fa8d4adf4837fee772cceb1f26ade3e98d3c6` | captured |
| desktop | `map-primary` | `desktop-regression` | `/?_time=16:30` | `desktop-map-primary-desktop-regression.png` | 2880x1800 | 2735575 | `2f71144aa527689eceaeb8068c1083fc360c3e54b4886264ad35980a74a60cc4` | yes | different | `073294af904d6f65163eceeefd6be492b5308333bf874f86f0cef7d0a1b36ec4` | assertion-failed |

## Result

- Captured: 6
- Failed/assertion-failed: 1
- Canonical refs promoted: 0
- Product errors observed: 0 console errors, 1 page error on the inherited desktop canonical OnboardingGate hydration path, 0 HTTP >=400 responses, 0 failed requests.
- Non-failing warnings observed may include Motion's reduced-motion diagnostic plus MapLibre/WebGL screenshot-time warnings. These are browser/library capture noise; product request/page failures are treated as capture failures.

Failures require investigation or explicit accept-with-rationale before human review:
- desktop/map-primary/desktop-regression: page errors observed: Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch

  ...
    <RedirectBoundary>
      <RedirectErrorBoundary router={{...}}>
        <InnerLayoutRouter url="/?_time=16:30" tree={[...]} params={{locale:"sv"}} cacheNode={{rsc:{...}, ...}} ...>
          <SegmentViewNode type="page" pagePath="[locale]/p...">
            <SegmentTrieNode>
            <Home>
              <MapViewDynamic>
              <OnboardingGateWithSuspense>
                <Suspense fallback={null}>
                  <OnboardingGateInner>
                    <OnboardingScreen onDismiss={function OnboardingGateInner[handleDismiss]} ...>
                      <motion.div role="dialog" aria-modal="true" aria-labelledby="onboarding..." ...>
                        <div
+                         role="dialog"
-                         role={null}
+                         aria-modal="true"
-                         aria-modal={null}
+                         aria-labelledby="onboarding-headline"
-                         aria-labelledby={null}
+                         data-testid="onboarding-screen"
-                         data-testid={null}
+                         data-phase="visible"
-                         data-phase={null}
+                         className="fixed inset-0 z-toast gradient-onboarding text-white flex flex-col px-8 py-16 ove..."
-                         className={null}
+                         style={{opacity:0}}
-                         style={{display:"contents"}}
                          ref={function useMotionRef.useCallback}
-                         data-onboarding-inline-frame=""
-                         aria-hidden="true"
-                         inert=""
                        >
                          <div
+                           aria-hidden="true"
-                           aria-hidden={null}
+                           className="absolute left-1/2 -top-10 w-[340px] h-[340px] -translate-x-1/2 rounded-full opa..."
-                           className="fixed inset-0 z-toast gradient-onboarding text-white flex flex-col px-8 py-16 o..."
-                           role="dialog"
-                           aria-modal="true"
-                           aria-labelledby="onboarding-headline"
-                           data-testid="onboarding-screen"
-                           data-phase="visible"
-                           style={{opacity:"0"}}
                          >
-                           <div
-                             aria-hidden="true"
-                             className="absolute left-1/2 -top-10 w-[340px] h-[340px] -translate-x-1/2 rounded-full o..."
-                           >
-                           <div
-                             aria-hidden="true"
-                             className="absolute -left-32 -bottom-32 w-[480px] h-[480px] rounded-full pointer-events-..."
-                           >
-                           <div
-                             className="mt-5 lg:mt-0 flex justify-center items-center gap-2 font-display font-extrabo..."
-                           >
-                           <div
-                             className="flex-1 lg:flex-none flex flex-col justify-center items-center relative z-10 t..."
-                             style={{opacity:"0",transform:"translateY..."}}
-                           >
-                           <div
-                             className="relative z-10 lg:w-full lg:max-w-md"
-                             style={{opacity:"0",transform:"translateY..."}}
-                           >
                          ...
          ...
        ...


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
  - mobile row sheet state: {"visibleRows":0,"maxRows":4,"rowHeight":96,"sheetHeight":44,"attrs":{"state":"rows-0","visibleRows":"0","maxRows":"4","rowHeight":"96","sheetHeight":"44","dragging":"false","className":"absolute inset-x-0 bottom-[calc(var(--size-mobile-nav-h)+env(safe-area-inset-bottom))] z-bottom-sheet-peek flex flex-col overflow-hidden rounded-t-panel bg-surface-cream text-text-primary shadow-sheet-peek-up lg:hidden touch-pan-y","style":"height: 44px; max-height: 554px; opacity: 1;"},"bodyAttrs":{"ariaHidden":"true","inert":true,"className":"min-h-0 flex-1 px-4 pb-4 pointer-events-none","rect":{"width":390,"height":16}},"chromeBox":{"x":16,"y":792,"width":358,"height":112},"scrollBodyBox":{"x":16,"y":904,"width":358,"height":0},"sheetBox":{"x":0,"y":748,"width":390,"height":44},"navBox":{"x":0,"y":792,"width":390,"height":52}}
  - map controls sheet-overlap state: {"overlap":"false","ariaHidden":null,"inert":false,"opacity":"1","pointerEvents":"auto","rect":{"top":200,"bottom":308,"height":108},"measuredCovered":false}

Assertion failures:
  - none

Console/page/request/HTTP observations:
  - console: 8
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"warning","text":"[.WebGL-0x601c001b7400]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels"}
    - {"type":"warning","text":"[.WebGL-0x601c001b7400]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels"}
    - {"type":"warning","text":"[.WebGL-0x601c001b7400]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels"}
    - {"type":"warning","text":"[.WebGL-0x601c001b7400]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat)"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}

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
  - mobile row sheet state: {"visibleRows":0,"maxRows":4,"rowHeight":96,"sheetHeight":44,"attrs":{"state":"rows-0","visibleRows":"0","maxRows":"4","rowHeight":"96","sheetHeight":"44","dragging":"false","className":"absolute inset-x-0 bottom-[calc(var(--size-mobile-nav-h)+env(safe-area-inset-bottom))] z-bottom-sheet-peek flex flex-col overflow-hidden rounded-t-panel bg-surface-cream text-text-primary shadow-sheet-peek-up lg:hidden touch-pan-y","style":"height: 44px; max-height: 554px; opacity: 1;"},"bodyAttrs":{"ariaHidden":"true","inert":true,"className":"min-h-0 flex-1 px-4 pb-4 pointer-events-none","rect":{"width":390,"height":16}},"chromeBox":{"x":16,"y":792,"width":358,"height":112},"scrollBodyBox":{"x":16,"y":904,"width":358,"height":0},"sheetBox":{"x":0,"y":748,"width":390,"height":44},"navBox":{"x":0,"y":792,"width":390,"height":52}}
  - map controls sheet-overlap state: {"overlap":"false","ariaHidden":null,"inert":false,"opacity":"1","pointerEvents":"auto","rect":{"top":200,"bottom":308,"height":108},"measuredCovered":false}

Assertion failures:
  - none

Console/page/request/HTTP observations:
  - console: 4
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}

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
  - mobile row sheet state: {"visibleRows":1,"maxRows":4,"rowHeight":96,"sheetHeight":268,"rowVisibility":{"fullyVisible":1,"partiallyVisible":1,"rows":[{"index":0,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":680.5,"bottom":764,"height":83.5}},{"index":1,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":776,"bottom":859.5,"height":83.5}},{"index":2,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":871.5,"bottom":955,"height":83.5}},{"index":3,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":967,"bottom":1050.5,"height":83.5}},{"index":4,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":1062.5,"bottom":1146,"height":83.5}},{"index":5,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":1158,"bottom":1241.5,"height":83.5}},{"index":6,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":1253.5,"bottom":1337,"height":83.5}},{"index":7,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":8,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":9,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":10,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":11,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":12,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":13,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}}]},"attrs":{"state":"rows-1","visibleRows":"1","maxRows":"4","rowHeight":"96","sheetHeight":"268","dragging":"false","className":"absolute inset-x-0 bottom-[calc(var(--size-mobile-nav-h)+env(safe-area-inset-bottom))] z-bottom-sheet-peek flex flex-col overflow-hidden rounded-t-panel bg-surface-cream text-text-primary shadow-sheet-peek-up lg:hidden touch-pan-y","style":"height: 267.5px; max-height: 554px; opacity: 1;"},"bodyAttrs":{"ariaHidden":"false","inert":false,"className":"min-h-0 flex-1 px-4 pb-4","rect":{"width":390,"height":223.5}},"chromeBox":{"x":16,"y":568.5,"width":358,"height":112},"scrollBodyBox":{"x":16,"y":680.5,"width":358,"height":95.5},"sheetBox":{"x":0,"y":524.5,"width":390,"height":267.5},"navBox":{"x":0,"y":792,"width":390,"height":52}}
  - map controls sheet-overlap state: {"overlap":"false","ariaHidden":null,"inert":false,"opacity":"1","pointerEvents":"auto","rect":{"top":200,"bottom":308,"height":108},"measuredCovered":false}
  - venue row visibility geometry: {"fullyVisible":1,"partiallyVisible":1,"rows":[{"index":0,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":680.5,"bottom":764,"height":83.5}},{"index":1,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":776,"bottom":859.5,"height":83.5}},{"index":2,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":871.5,"bottom":955,"height":83.5}},{"index":3,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":967,"bottom":1050.5,"height":83.5}},{"index":4,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":1062.5,"bottom":1146,"height":83.5}},{"index":5,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":1158,"bottom":1241.5,"height":83.5}},{"index":6,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":1253.5,"bottom":1337,"height":83.5}},{"index":7,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":8,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":9,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":10,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":11,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":12,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":13,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}}]}

Assertion failures:
  - none

Console/page/request/HTTP observations:
  - console: 4
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}

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
  - mobile row sheet state: {"visibleRows":3,"maxRows":4,"rowHeight":96,"sheetHeight":459,"rowVisibility":{"fullyVisible":3,"partiallyVisible":3,"rows":[{"index":0,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":489.5,"bottom":573,"height":83.5}},{"index":1,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":585,"bottom":668.5,"height":83.5}},{"index":2,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":680.5,"bottom":764,"height":83.5}},{"index":3,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":776,"bottom":859.5,"height":83.5}},{"index":4,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":871.5,"bottom":955,"height":83.5}},{"index":5,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":967,"bottom":1050.5,"height":83.5}},{"index":6,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":1062.5,"bottom":1146,"height":83.5}},{"index":7,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":8,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":9,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":10,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":11,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":12,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":13,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}}]},"attrs":{"state":"rows-3","visibleRows":"3","maxRows":"4","rowHeight":"96","sheetHeight":"459","dragging":"false","className":"absolute inset-x-0 bottom-[calc(var(--size-mobile-nav-h)+env(safe-area-inset-bottom))] z-bottom-sheet-peek flex flex-col overflow-hidden rounded-t-panel bg-surface-cream text-text-primary shadow-sheet-peek-up lg:hidden touch-pan-y","style":"height: 458.5px; max-height: 554px; opacity: 1;"},"bodyAttrs":{"ariaHidden":"false","inert":false,"className":"min-h-0 flex-1 px-4 pb-4","rect":{"width":390,"height":414.5}},"chromeBox":{"x":16,"y":377.5,"width":358,"height":112},"scrollBodyBox":{"x":16,"y":489.5,"width":358,"height":286.5},"sheetBox":{"x":0,"y":333.5,"width":390,"height":458.5},"navBox":{"x":0,"y":792,"width":390,"height":52}}
  - map controls sheet-overlap state: {"overlap":"false","ariaHidden":null,"inert":false,"opacity":"1","pointerEvents":"auto","rect":{"top":200,"bottom":308,"height":108},"measuredCovered":false}
  - venue row visibility geometry: {"fullyVisible":3,"partiallyVisible":3,"rows":[{"index":0,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":489.5,"bottom":573,"height":83.5}},{"index":1,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":585,"bottom":668.5,"height":83.5}},{"index":2,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":680.5,"bottom":764,"height":83.5}},{"index":3,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":776,"bottom":859.5,"height":83.5}},{"index":4,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":871.5,"bottom":955,"height":83.5}},{"index":5,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":967,"bottom":1050.5,"height":83.5}},{"index":6,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":1062.5,"bottom":1146,"height":83.5}},{"index":7,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":8,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":9,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":10,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":11,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":12,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":13,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}}]}

Assertion failures:
  - none

Console/page/request/HTTP observations:
  - console: 4
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}

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
  - mobile row sheet state: {"visibleRows":4,"maxRows":4,"rowHeight":96,"sheetHeight":554,"rowVisibility":{"fullyVisible":4,"partiallyVisible":4,"rows":[{"index":0,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":394,"bottom":477.5,"height":83.5}},{"index":1,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":489.5,"bottom":573,"height":83.5}},{"index":2,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":585,"bottom":668.5,"height":83.5}},{"index":3,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":680.5,"bottom":764,"height":83.5}},{"index":4,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":776,"bottom":859.5,"height":83.5}},{"index":5,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":871.5,"bottom":955,"height":83.5}},{"index":6,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":967,"bottom":1050.5,"height":83.5}},{"index":7,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":8,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":9,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":10,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":11,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":12,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":13,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}}]},"attrs":{"state":"rows-4","visibleRows":"4","maxRows":"4","rowHeight":"96","sheetHeight":"554","dragging":"false","className":"absolute inset-x-0 bottom-[calc(var(--size-mobile-nav-h)+env(safe-area-inset-bottom))] z-bottom-sheet-peek flex flex-col overflow-hidden rounded-t-panel bg-surface-cream text-text-primary shadow-sheet-peek-up lg:hidden touch-pan-y","style":"height: 554px; max-height: 554px; opacity: 1;"},"bodyAttrs":{"ariaHidden":"false","inert":false,"className":"min-h-0 flex-1 px-4 pb-4","rect":{"width":390,"height":510}},"chromeBox":{"x":16,"y":282,"width":358,"height":112},"scrollBodyBox":{"x":16,"y":394,"width":358,"height":382},"sheetBox":{"x":0,"y":238,"width":390,"height":554},"navBox":{"x":0,"y":792,"width":390,"height":52}}
  - map controls sheet-overlap state: {"overlap":"true","ariaHidden":"true","inert":true,"opacity":"0","pointerEvents":"auto","rect":{"top":200,"bottom":308,"height":108},"measuredCovered":true}
  - venue row visibility geometry: {"fullyVisible":4,"partiallyVisible":4,"rows":[{"index":0,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":394,"bottom":477.5,"height":83.5}},{"index":1,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":489.5,"bottom":573,"height":83.5}},{"index":2,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":585,"bottom":668.5,"height":83.5}},{"index":3,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":680.5,"bottom":764,"height":83.5}},{"index":4,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":776,"bottom":859.5,"height":83.5}},{"index":5,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":871.5,"bottom":955,"height":83.5}},{"index":6,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":967,"bottom":1050.5,"height":83.5}},{"index":7,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":8,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":9,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":10,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":11,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":12,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":13,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}}]}

Assertion failures:
  - none

Console/page/request/HTTP observations:
  - console: 4
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}

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
  - mobile row sheet state: {"visibleRows":3,"maxRows":4,"rowHeight":96,"sheetHeight":507,"rowVisibility":{"fullyVisible":3,"partiallyVisible":4,"rows":[{"index":0,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":441.5,"bottom":525,"height":83.5}},{"index":1,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":537,"bottom":620.5,"height":83.5}},{"index":2,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":632.5,"bottom":716,"height":83.5}},{"index":3,"visible":true,"overlaps":true,"fullyVisible":false,"rect":{"top":728,"bottom":811.5,"height":83.5}},{"index":4,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":823.5,"bottom":907,"height":83.5}},{"index":5,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":919,"bottom":1002.5,"height":83.5}},{"index":6,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":1014.5,"bottom":1098,"height":83.5}},{"index":7,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":8,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":9,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":10,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":11,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":12,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":13,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}}]},"attrs":{"state":"rows-3","visibleRows":"3","maxRows":"4","rowHeight":"96","sheetHeight":"507","dragging":"true","className":"absolute inset-x-0 bottom-[calc(var(--size-mobile-nav-h)+env(safe-area-inset-bottom))] z-bottom-sheet-peek flex flex-col overflow-hidden rounded-t-panel bg-surface-cream text-text-primary shadow-sheet-peek-up lg:hidden touch-pan-y","style":"height: 506.5px; max-height: 554px; opacity: 1;"},"bodyAttrs":{"ariaHidden":"false","inert":false,"className":"min-h-0 flex-1 px-4 pb-4","rect":{"width":390,"height":462.5}},"chromeBox":{"x":16,"y":329.5,"width":358,"height":112},"scrollBodyBox":{"x":16,"y":441.5,"width":358,"height":334.5},"sheetBox":{"x":0,"y":285.5,"width":390,"height":506.5},"navBox":{"x":0,"y":792,"width":390,"height":52}}
  - map controls sheet-overlap state: {"overlap":"true","ariaHidden":"true","inert":true,"opacity":"0","pointerEvents":"auto","rect":{"top":200,"bottom":308,"height":108},"measuredCovered":true}
  - venue row visibility geometry: {"fullyVisible":3,"partiallyVisible":4,"rows":[{"index":0,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":441.5,"bottom":525,"height":83.5}},{"index":1,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":537,"bottom":620.5,"height":83.5}},{"index":2,"visible":true,"overlaps":true,"fullyVisible":true,"rect":{"top":632.5,"bottom":716,"height":83.5}},{"index":3,"visible":true,"overlaps":true,"fullyVisible":false,"rect":{"top":728,"bottom":811.5,"height":83.5}},{"index":4,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":823.5,"bottom":907,"height":83.5}},{"index":5,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":919,"bottom":1002.5,"height":83.5}},{"index":6,"visible":true,"overlaps":false,"fullyVisible":false,"rect":{"top":1014.5,"bottom":1098,"height":83.5}},{"index":7,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":8,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":9,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":10,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":11,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":12,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}},{"index":13,"visible":false,"overlaps":false,"fullyVisible":false,"rect":{"top":0,"bottom":0,"height":0}}]}

Assertion failures:
  - none

Console/page/request/HTTP observations:
  - console: 4
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}

### desktop/map-primary/desktop-regression

- Route: `/?_time=16:30`
- URL: `http://localhost:3000/?_time=16:30`
- Candidate: `desktop-map-primary-desktop-regression.png`
- Reference compared: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\desktop\map-primary.png`
- HTML lang: `sv`
- Status: `assertion-failed`

Assertions:
  - map visible: true
  - visible pin count: 7
  - planner visible and sized: {"box":{"x":356,"y":789,"width":1068,"height":87},"className":"z-glass-panel bg-glass-slider text-text-primary backdrop-blur-heavy hidden rounded-panel px-6 py-3 shadow-card-up lg:flex lg:items-center lg:gap-5 absolute bottom-6 left-[calc(var(--size-venue-list-desktop-w)+1rem)] transition-[right] duration-200 ease-default motion-reduce:transition-none right-4"}
  - desktop venue panel visible: {"box":{"x":0,"y":84,"width":340,"height":816}}

Assertion failures:
  - page errors observed: Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch

  ...
    <RedirectBoundary>
      <RedirectErrorBoundary router={{...}}>
        <InnerLayoutRouter url="/?_time=16:30" tree={[...]} params={{locale:"sv"}} cacheNode={{rsc:{...}, ...}} ...>
          <SegmentViewNode type="page" pagePath="[locale]/p...">
            <SegmentTrieNode>
            <Home>
              <MapViewDynamic>
              <OnboardingGateWithSuspense>
                <Suspense fallback={null}>
                  <OnboardingGateInner>
                    <OnboardingScreen onDismiss={function OnboardingGateInner[handleDismiss]} ...>
                      <motion.div role="dialog" aria-modal="true" aria-labelledby="onboarding..." ...>
                        <div
+                         role="dialog"
-                         role={null}
+                         aria-modal="true"
-                         aria-modal={null}
+                         aria-labelledby="onboarding-headline"
-                         aria-labelledby={null}
+                         data-testid="onboarding-screen"
-                         data-testid={null}
+                         data-phase="visible"
-                         data-phase={null}
+                         className="fixed inset-0 z-toast gradient-onboarding text-white flex flex-col px-8 py-16 ove..."
-                         className={null}
+                         style={{opacity:0}}
-                         style={{display:"contents"}}
                          ref={function useMotionRef.useCallback}
-                         data-onboarding-inline-frame=""
-                         aria-hidden="true"
-                         inert=""
                        >
                          <div
+                           aria-hidden="true"
-                           aria-hidden={null}
+                           className="absolute left-1/2 -top-10 w-[340px] h-[340px] -translate-x-1/2 rounded-full opa..."
-                           className="fixed inset-0 z-toast gradient-onboarding text-white flex flex-col px-8 py-16 o..."
-                           role="dialog"
-                           aria-modal="true"
-                           aria-labelledby="onboarding-headline"
-                           data-testid="onboarding-screen"
-                           data-phase="visible"
-                           style={{opacity:"0"}}
                          >
-                           <div
-                             aria-hidden="true"
-                             className="absolute left-1/2 -top-10 w-[340px] h-[340px] -translate-x-1/2 rounded-full o..."
-                           >
-                           <div
-                             aria-hidden="true"
-                             className="absolute -left-32 -bottom-32 w-[480px] h-[480px] rounded-full pointer-events-..."
-                           >
-                           <div
-                             className="mt-5 lg:mt-0 flex justify-center items-center gap-2 font-display font-extrabo..."
-                           >
-                           <div
-                             className="flex-1 lg:flex-none flex flex-col justify-center items-center relative z-10 t..."
-                             style={{opacity:"0",transform:"translateY..."}}
-                           >
-                           <div
-                             className="relative z-10 lg:w-full lg:max-w-md"
-                             style={{opacity:"0",transform:"translateY..."}}
-                           >
                          ...
          ...
        ...


Console/page/request/HTTP observations:
  - console: 4
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
  - pageErrors: 1
    - Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used: - A server/client branch `if (typeof
