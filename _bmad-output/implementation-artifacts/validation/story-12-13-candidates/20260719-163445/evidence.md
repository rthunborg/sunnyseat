# Story 12.13 non-authoritative candidate captures

Captured 2026-07-19T14:37:08.603Z from the running SunnySeat implementation. These files are **candidate review evidence only**. They do not replace or bless any authoritative reference PNG.

## Capture environment

- Application command: `npm run dev` from `C:\Users\Rasmus\sunnyseat\nextjs-app`
- Capture origin and port: `http://localhost:3000`
- Browser: Windows-native Playwright Chromium, headless
- Locale: `sv-SE`; `Accept-Language: sv-SE,sv;q=0.9`; `html[lang]` recorded per page
- Time zone: `Europe/Stockholm`
- Motion/color: reduced motion, light color scheme, screenshot animations disabled
- Viewports: mobile `390x844`, desktop `1440x900`, both at device scale factor 2. Written PNG dimensions should be `780x1688` and `2880x1800`.
- Storage before each navigation: `sunnyseat_onboarded=1`; favourites screens additionally used `sunnyseat_favourite_ids=["1","2"]`.
- Readiness: `domcontentloaded`, best-effort `networkidle`, font readiness, explicit product selectors, and a 1s settle before screenshot. The Next development portal was hidden as non-product chrome.
- Scope: Story 12.13 design gate targets only. No route-overlay screenshot was invented; route overlay remains covered by component/E2E evidence.

## Candidate inventory and reference comparison

| Viewport | Screen ID | Canonical route | Candidate | PNG dimensions | Bytes | Candidate SHA-256 | Reference exists | Candidate vs reference SHA | Reference SHA-256 | Status |
|---|---|---|---|---:|---:|---|---|---|---|---|
| mobile | `map-panel-venues` | `/?_state=map-panel-venues&_time=14:00` | `mobile-map-panel-venues.png` | 780x1688 | 535299 | `5b168fac021deb8e0b3e9567fa9fa8d4adf4837fee772cceb1f26ade3e98d3c6` | yes | same | `5b168fac021deb8e0b3e9567fa9fa8d4adf4837fee772cceb1f26ade3e98d3c6` | captured |
| mobile | `map-with-selected-venue` | `/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00` | `mobile-map-with-selected-venue.png` | 780x1688 | 720291 | `004d7fc41a55d37b50d9944d8d113bf1860e8ae97bcdd9f052f8164b3f591580` | yes | different | `d3f65d7ed9fa76267d481799bce725f5d8f0ab8fc0ef8e77066a8115c92144ba` | captured |
| mobile | `favourites-tab` | `/favoriter?_state=favourites-tab&_time=14:00` | `mobile-favourites-tab.png` | 780x1688 | 568276 | `eee2df4ddc89948bcedcf8f82d8aaa8481e0081b339d84411b137a1582425ba4` | yes | different | `1d12b31c8fcb4a2f116f2341c008d66896ff48760bb5f5597e5c1d8019b74c92` | captured |
| mobile | `venue-detail` | `/?venue=test-venue-sunny&_state=venue-detail&_time=14:00` | `mobile-venue-detail.png` | 780x1688 | 276034 | `77730bda52d0161675fdeef649658c0b44f6795022c77faed0664e6dc801a7f9` | yes | different | `5ba211f13af3e4e5927f4b0cc5100be36fd8210d7a1e30e034f600314c08cc42` | captured |
| mobile | `venue-detail-obscured` | `/?venue=test-venue-sunny&_state=venue-detail-obscured&_time=14:00` | `mobile-venue-detail-obscured.png` | 780x1688 | 265204 | `58a62f69a652991b70ab40a71f1fd94f742cae56c336bae042200404f1eee028` | yes | different | `ac25a55c467977207bf2420ef15af37ae3866bbef3ce5fc92f4cd2c2378a1a50` | captured |
| desktop | `map-primary` | `/?_time=16:30` | `desktop-map-primary.png` | 2880x1800 | 2871680 | `073294af904d6f65163eceeefd6be492b5308333bf874f86f0cef7d0a1b36ec4` | yes | same | `073294af904d6f65163eceeefd6be492b5308333bf874f86f0cef7d0a1b36ec4` | captured |
| desktop | `favourites-tab` | `/favoriter?_state=favourites-tab&_time=14:00` | `desktop-favourites-tab.png` | 2880x1800 | 2557247 | `4f98f31c4ef9e178b0364dbbaeae8fa0c4443680f204d81698b5cbbc3554aac2` | yes | same | `4f98f31c4ef9e178b0364dbbaeae8fa0c4443680f204d81698b5cbbc3554aac2` | captured |
| desktop | `venue-detail` | `/?venue=test-venue-sunny&_state=venue-detail&_time=16:30` | `desktop-venue-detail.png` | 2880x1800 | 2389545 | `05f3321ce879b0b52710dc2b6b973a21f3270bea16b3640653e96fde830f723e` | yes | same | `05f3321ce879b0b52710dc2b6b973a21f3270bea16b3640653e96fde830f723e` | captured |
| desktop | `venue-detail-obscured` | `/?venue=test-venue-sunny&_state=venue-detail-obscured&_time=16:30` | `desktop-venue-detail-obscured.png` | 2880x1800 | 2365810 | `f17a896333dd594099f9053179cf7e4884371bb60bfe72dc0a54a1b844c2895b` | yes | different | `7c510fb51fa542c4e57ad12630ac739e60f5408680503b5c0d5ed1ca6b18f802` | captured |

## Result summary

- Complete expected set captured: yes
- Screens captured: 9/9
- Screens with assertion failures or capture errors: none
- Rebaseline implication: `different` candidate/reference SHA values are not automatically promotion candidates. Treat them as requiring human review only when the user-visible result intentionally changes for Story 12.13: secondary confidence removed while primary sun exposure remains, or obscured detail made percentage-free. Hash-only noise with the same visible result should not be promoted.

## Per-screen evidence

### mobile/map-panel-venues

- Route: `/?_state=map-panel-venues&_time=14:00`
- URL: `http://localhost:3000/?_state=map-panel-venues&_time=14:00`
- Candidate: `mobile-map-panel-venues.png`
- Reference: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\mobile\map-panel-venues.png`
- HTML lang: `sv`
- Status: `captured`

Assertions:
  - map visible: true
  - visible pin count: 7
  - visible venue-card count: 7
  - favourites/list retain primary sun-exposure value: true
  - mobile bottom sheet state: "mid"
  - confidence absent from visible/sr/aria/title text: true
  - sun exposure retained somewhere when applicable: true

Assertion failures:
  - none

Forbidden confidence matches:
  - none

Console/page/request/HTTP observations:
  - console: 8
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"warning","text":"[.WebGL-0x48e40351ec00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels"}
    - {"type":"warning","text":"[.WebGL-0x48e40351ec00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels"}
    - {"type":"warning","text":"[.WebGL-0x48e40351ec00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels"}
    - {"type":"warning","text":"[.WebGL-0x48e40351ec00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat)"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
  - requestFailed: 1
    - {"method":"GET","url":"http://localhost:3000/api/venues?lat=57.7089&lng=11.9746&radiusKm=1.5&date=2026-05-20&time=14%3A00","failure":"net::ERR_ABORTED"}

### mobile/map-with-selected-venue

- Route: `/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00`
- URL: `http://localhost:3000/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00`
- Candidate: `mobile-map-with-selected-venue.png`
- Reference: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\mobile\map-with-selected-venue.png`
- HTML lang: `sv`
- Status: `captured`

Assertions:
  - map visible: true
  - visible pin count: 7
  - quick info visible: true
  - quick info retains sunny sun-exposure figure: true
  - confidence absent from visible/sr/aria/title text: true
  - sun exposure retained somewhere when applicable: true

Assertion failures:
  - none

Forbidden confidence matches:
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

### mobile/favourites-tab

- Route: `/favoriter?_state=favourites-tab&_time=14:00`
- URL: `http://localhost:3000/favoriter?_state=favourites-tab&_time=14:00`
- Candidate: `mobile-favourites-tab.png`
- Reference: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\mobile\favourites-tab.png`
- HTML lang: `sv`
- Status: `captured`

Assertions:
  - map visible: true
  - visible pin count: 7
  - visible venue-card count: 2
  - favourites/list retain primary sun-exposure value: true
  - confidence absent from visible/sr/aria/title text: true
  - sun exposure retained somewhere when applicable: true

Assertion failures:
  - none

Forbidden confidence matches:
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

### mobile/venue-detail

- Route: `/?venue=test-venue-sunny&_state=venue-detail&_time=14:00`
- URL: `http://localhost:3000/?venue=test-venue-sunny&_state=venue-detail&_time=14:00`
- Candidate: `mobile-venue-detail.png`
- Reference: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\mobile\venue-detail.png`
- HTML lang: `sv`
- Status: `captured`

Assertions:
  - map visible: true
  - visible pin count: 7
  - mobile detail visible: true
  - sunny detail retains sun-exposure figure: true
  - detail skeleton absent: true
  - confidence absent from visible/sr/aria/title text: true
  - sun exposure retained somewhere when applicable: true

Assertion failures:
  - none

Forbidden confidence matches:
  - none

Console/page/request/HTTP observations:
  - console: 5
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"error","text":"Failed to load resource: the server responded with a status of 400 (Bad Request)"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
  - requestFailed: 2
    - {"method":"GET","url":"http://localhost:3000/api/venues/test-venue-sunny?date=2026-07-19&time=14%3A00&lat=57.7089&lng=11.9746","failure":"net::ERR_ABORTED"}
    - {"method":"GET","url":"http://localhost:3000/api/reviews?venueId=test-venue-sunny","failure":"net::ERR_ABORTED"}
  - httpErrors: 1
    - {"status":400,"url":"http://localhost:3000/api/venues?lat=57.7089&lng=11.9746&radiusKm=1.5&date=2026-05-20&time=14%3A00"}

### mobile/venue-detail-obscured

- Route: `/?venue=test-venue-sunny&_state=venue-detail-obscured&_time=14:00`
- URL: `http://localhost:3000/?venue=test-venue-sunny&_state=venue-detail-obscured&_time=14:00`
- Candidate: `mobile-venue-detail-obscured.png`
- Reference: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\mobile\venue-detail-obscured.png`
- HTML lang: `sv`
- Status: `captured`

Assertions:
  - map visible: true
  - visible pin count: 7
  - mobile detail visible: true
  - obscured sky copy visible: true
  - obscured detail percentage-free: true
  - detail skeleton absent: true
  - confidence absent from visible/sr/aria/title text: true
  - sun exposure retained somewhere when applicable: true

Assertion failures:
  - none

Forbidden confidence matches:
  - none

Console/page/request/HTTP observations:
  - console: 5
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"error","text":"Failed to load resource: the server responded with a status of 400 (Bad Request)"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
  - requestFailed: 2
    - {"method":"GET","url":"http://localhost:3000/api/venues/test-venue-sunny?date=2026-07-19&time=14%3A00&lat=57.7089&lng=11.9746","failure":"net::ERR_ABORTED"}
    - {"method":"GET","url":"http://localhost:3000/api/reviews?venueId=test-venue-sunny","failure":"net::ERR_ABORTED"}
  - httpErrors: 1
    - {"status":400,"url":"http://localhost:3000/api/venues?lat=57.7089&lng=11.9746&radiusKm=1.5&date=2026-05-20&time=14%3A00"}

### desktop/map-primary

- Route: `/?_time=16:30`
- URL: `http://localhost:3000/?_time=16:30`
- Candidate: `desktop-map-primary.png`
- Reference: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\desktop\map-primary.png`
- HTML lang: `sv`
- Status: `captured`

Assertions:
  - map visible: true
  - visible pin count: 7
  - venue list text visible: true
  - desktop venue panel visible: true
  - confidence absent from visible/sr/aria/title text: true
  - sun exposure retained somewhere when applicable: false

Assertion failures:
  - none

Forbidden confidence matches:
  - none

Console/page/request/HTTP observations:
  - console: 4
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
  - pageErrors: 1
    - Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used: - A server/client branch `if (typeof 
  - requestFailed: 1
    - {"method":"GET","url":"http://localhost:3000/api/venues?lat=57.7089&lng=11.9746&radiusKm=1.5&date=2026-05-20&time=16%3A30","failure":"net::ERR_ABORTED"}

### desktop/favourites-tab

- Route: `/favoriter?_state=favourites-tab&_time=14:00`
- URL: `http://localhost:3000/favoriter?_state=favourites-tab&_time=14:00`
- Candidate: `desktop-favourites-tab.png`
- Reference: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\desktop\favourites-tab.png`
- HTML lang: `sv`
- Status: `captured`

Assertions:
  - map visible: true
  - visible pin count: 7
  - favourites/list retain primary sun-exposure value: true
  - venue list text visible: true
  - confidence absent from visible/sr/aria/title text: true
  - sun exposure retained somewhere when applicable: false

Assertion failures:
  - none

Forbidden confidence matches:
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

### desktop/venue-detail

- Route: `/?venue=test-venue-sunny&_state=venue-detail&_time=16:30`
- URL: `http://localhost:3000/?venue=test-venue-sunny&_state=venue-detail&_time=16:30`
- Candidate: `desktop-venue-detail.png`
- Reference: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\desktop\venue-detail.png`
- HTML lang: `sv`
- Status: `captured`

Assertions:
  - map visible: true
  - visible pin count: 7
  - desktop detail visible: true
  - sunny detail retains sun-exposure figure: true
  - detail skeleton absent: true
  - confidence absent from visible/sr/aria/title text: true
  - sun exposure retained somewhere when applicable: false

Assertion failures:
  - none

Forbidden confidence matches:
  - none

Console/page/request/HTTP observations:
  - console: 5
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"error","text":"Failed to load resource: the server responded with a status of 400 (Bad Request)"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
  - requestFailed: 2
    - {"method":"GET","url":"http://localhost:3000/api/venues/test-venue-sunny?date=2026-07-19&time=16%3A30&lat=57.7089&lng=11.9746","failure":"net::ERR_ABORTED"}
    - {"method":"GET","url":"http://localhost:3000/api/reviews?venueId=test-venue-sunny","failure":"net::ERR_ABORTED"}
  - httpErrors: 1
    - {"status":400,"url":"http://localhost:3000/api/venues?lat=57.7089&lng=11.9746&radiusKm=1.5&date=2026-05-20&time=16%3A30"}

### desktop/venue-detail-obscured

- Route: `/?venue=test-venue-sunny&_state=venue-detail-obscured&_time=16:30`
- URL: `http://localhost:3000/?venue=test-venue-sunny&_state=venue-detail-obscured&_time=16:30`
- Candidate: `desktop-venue-detail-obscured.png`
- Reference: `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\desktop\venue-detail-obscured.png`
- HTML lang: `sv`
- Status: `captured`

Assertions:
  - map visible: true
  - visible pin count: 7
  - desktop detail visible: true
  - obscured sky copy visible: true
  - obscured detail percentage-free: true
  - detail skeleton absent: true
  - confidence absent from visible/sr/aria/title text: true
  - sun exposure retained somewhere when applicable: true

Assertion failures:
  - none

Forbidden confidence matches:
  - none

Console/page/request/HTTP observations:
  - console: 5
    - {"type":"warning","text":"You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled"}
    - {"type":"error","text":"Failed to load resource: the server responded with a status of 400 (Bad Request)"}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
    - {"type":"warning","text":"Expected value to be of type number, but found null instead."}
  - requestFailed: 2
    - {"method":"GET","url":"http://localhost:3000/api/venues/test-venue-sunny?date=2026-07-19&time=16%3A30&lat=57.7089&lng=11.9746","failure":"net::ERR_ABORTED"}
    - {"method":"GET","url":"http://localhost:3000/api/reviews?venueId=test-venue-sunny","failure":"net::ERR_ABORTED"}
  - httpErrors: 1
    - {"status":400,"url":"http://localhost:3000/api/venues?lat=57.7089&lng=11.9746&radiusKm=1.5&date=2026-05-20&time=16%3A30"}

## Files intentionally not changed

- No application source files were modified by this capture pass.
- No authoritative PNG under `nextjs-app/docs/design/references/screens/` was modified.
- `nextjs-app/docs/design/references/REBASELINE-LOG.md` was not modified.
- Auto-BMAD state, story files, and sprint status were not modified by this capture pass.
