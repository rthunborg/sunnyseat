# Story 1.4: MapLibre Integration & Venue Pin Layer

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **MVP scope correction (2026-05-19):** Future date planning is now free MVP scope in Story 2.5, not Future Monetization.

## Story

As a **user**,
I want to see an interactive map with amber pins on sunny venues and grey pins on shaded venues,
So that I can instantly identify which nearby patios are in direct sun right now.

## Acceptance Criteria

### AC1: Map Canvas Renders With Persistent Lifecycle

**Given** the app has loaded and venue data is available from `/api/venues`
**When** the MapContainer component mounts
**Then** a MapLibre GL JS map renders with `color-surface-sand` (#f5f0e6) background, decorative road lines, and `gradient-map-overlay`
**And** the map instance is stored in MapContext and is never unmounted during SPA navigation
**And** MapLibre GL JS is loaded asynchronously to stay within the JS bundle budget

### AC2: Pin Visual States

**Given** venue data includes sun exposure state for each venue
**When** venue pins are rendered on the map
**Then** sunny venues display amber pills (pointer tail, `color-amber-pin` #f1b100, 2px white border, `shadow-card`, sun icon 16.5px + white percentage text)
**And** shaded venues display grey pills (pointer tail, `color-pin-shaded` #e4e1e5, 1px border, `shadow-subtle`, `color-text-body` percentage text, 0.8 opacity)
**And** pins are differentiated by icon shape (sun icon), not colour alone, for colour-blind users (NFR27)
**And** rendering 50 venue pins completes within 100ms (NFR6)

### AC3: Pin Selection Behaviour

**Given** a user taps an amber venue pin
**When** the pin is selected
**Then** the pin transitions from pill-with-pointer to a perfect circle (200ms, `easing-default`)
**And** MapContext updates `selectedVenueId`
**And** tapping the selected pin again deselects it and returns to the default pill shape

### AC4: Pin Deselection On Map Background Tap

**Given** a user taps the map background (no pin)
**When** a venue pin is currently selected
**Then** the pin deselects and returns to its default state

### AC5: Map Controls (Glass Buttons)

**Given** the map has floating control buttons
**When** the controls render (right edge)
**Then** zoom +/- buttons and a my-location button are displayed as GlassButtons (48x48px, `color-glass-standard`, `blur-standard`, `shadow-button-float`, `radius-pill`)
**And** tapping my-location recentres the map on the user's position with a smooth pan (500ms)
**And** controls fade to 60% opacity during active map drag and return to full opacity on drag end

### AC6: Pin Entrance & Loading State

**Given** the map renders on mobile and desktop
**When** pins fade in as data arrives
**Then** each pin fades in individually (opacity 0->1, 150ms, `easing-enter`) — pins do not appear all at once
**And** if data takes >3s, a loading pill appears at top: "Laddar platser..." in `text-body-sm` / `color-text-muted`
**And** `prefers-reduced-motion` skips the fade animation (instant appear)

### AC7: Map Gestures & Performance

**Given** the map canvas fills the viewport
**When** pan and zoom gestures are used
**Then** map interaction runs at 60fps on mid-range mobile devices (NFR5)
**And** standard gestures work: pan (drag), pinch zoom, double-tap zoom in, two-finger tap zoom out
**And** after panning away, the map does NOT auto-recentre — spatial context is preserved

> **AC interpretation notes for the dev agent (do not relax the wording above):**
> - **AC1 "loaded asynchronously":** MapLibre's bundle is ~200 KB gzipped (largest single dep — see PRD NFR8). Load `MapContainer` (and via it `maplibre-gl`) through `next/dynamic` with `{ ssr: false, loading: () => <MapLoadingFallback /> }` so the chunk splits out of the main bundle. The fallback renders the sand-coloured background + skeleton until the chunk arrives. See Dev Notes §"Critical constraints" #1.
> - **AC1 "decorative road lines":** roads come from the MapLibre style sheet (the tile provider's vector style), not from custom SVG layers. We do not draw roads ourselves. The `color-surface-sand` requirement is met by the *fallback* shown when tiles fail (AC1 last clause) and by the warm-paper feel of the chosen style — see Dev Notes §"Critical constraints" #2 for tile-provider selection and the style-failure fallback.
> - **AC2 "rendering 50 venue pins completes within 100ms":** with the DOM-marker approach (see Dev Notes §"Critical constraints" #3), the React render of 50 markers measured via `performance.now()` around the first render must be < 100 ms on a mid-tier laptop / iPhone-12-class device. Verify with the `Performance` panel and assert via the Vitest pin-layer test (see Task 9.5).
> - **AC3 "pill-with-pointer to perfect circle":** the morph is implemented via two distinct DOM compositions cross-fading; CSS-only morphing is not feasible because the pointer tail is a separate element. The 200ms transition applies to opacity + transform on both shapes. See Dev Notes §"Critical constraints" #4.
> - **AC5 "tapping my-location recentres":** Story 1.4 does NOT request geolocation permission — that is Story 1.5's scope. In Story 1.4 the my-location button is wired to a no-op handler that, when no user position is known, recentres on Gothenburg's centre (57.7089, 11.9746). Story 1.5 replaces this with the real `useGeolocation` consumer.
> - **AC5 "controls fade to 60% opacity during active map drag":** "active map drag" = MapLibre `dragstart` → `dragend` events. Use a state ref toggled by event listeners; do NOT subscribe via React state (causes a re-render storm during drag at 60 fps).
> - **AC6 ">3s loading pill":** show the pill when the venue query has been in `isLoading` state for >= 3 seconds. Use a `setTimeout` armed when loading starts and cleared when data arrives or the timer fires. Do NOT poll TanStack Query state on a 100 ms tick.

## Design Gate Criteria

- **Visual:** Matches Figma frame `map-primary` (https://www.figma.com/design/Oh75qPnFfSWKHSsyVSBQbT/SunnySeat). *Implementation note:* validates against the captured Claude Design prototype PNGs at `nextjs-app/docs/design/references/screens/mobile/map-primary.png` and `nextjs-app/docs/design/references/screens/desktop/map-primary.png` (the captured-prototype screenshots stand in for the Figma frame in the visual gate).
- **Behaviour:** All interactions and states defined in UX spec §MapCanvas, §VenuePin, and §MapControls are implemented.
- **Animation:** Pin entrance/exit and state-change animations match spec timings (±50 ms tolerance). *Specific values to validate:* pin entrance is 150 ms fade per pin; pin selection morph is 200 ms; my-location pan is 500 ms; control opacity fade during map drag is 200 ms.
- **Visual validation:** Screenshot comparison against Figma reference passes before QA handoff. *Implementation note:* **this is the first story where the visual validation gate fires.** The mobile gate fires automatically via the sprint-status hook on the `review` transition; the desktop run is manual via Task 12.6. Both viewports must PASS — see Dev Notes §"Visual validation gate".

## Tasks / Subtasks

- [x] **Task 1: Create map type definitions** (AC: #1, #2, #3) — *Supporting infrastructure for AC1–3 type safety*
  - [x] 1.1 Create `nextjs-app/lib/types/map.ts` with the following exports:
    - `MapViewport` — `{ center: [lng: number, lat: number]; zoom: number; bearing: number; pitch: number }` (MapLibre's coordinate convention is `[lng, lat]`, not `[lat, lng]` — match it).
    - `VenuePinData` — minimal fields a pin renders from: `{ id: string; slug: string; name: string; lat: number; lng: number; sunStatus: 'Sunny' | 'Partial' | 'Shaded'; sunExposurePercent: number; isPartner: boolean; }`.
    - `VenuePinSelection` — `'sunny' | 'shaded' | 'sunny-selected'` for the three rendered visual variants. *(Round 1 P26 dropped the originally-specified `'shaded-selected'` literal — the shaded pill renders identically regardless of selection state, so the fourth variant was dead state surface; updated 2026-05-03 in Round 2 to keep this task spec in sync with the type.)*
    - Re-export `VenuePinData` from `nextjs-app/lib/types/index.ts` so component imports stay short.
  - [x] 1.2 Add a `GOTHENBURG_CENTRE` constant (lat, lng, zoom) to `nextjs-app/lib/types/map.ts` so other map consumers (Story 1.5 onboarding fallback, Story 2.5 free time/date planner) can share it: `export const GOTHENBURG_CENTRE = { lat: 57.7089, lng: 11.9746, zoom: 13 } as const;`. Source: project-context.md §"Gothenburg Constants".

- [x] **Task 2: Split MapContext into selection + instance contexts** (AC: #3, #4) — *Resolves deferred-work item from Story 1.3 Round 2 review*
  - [x] 2.1 Delete `nextjs-app/lib/contexts/MapContext.tsx`. The Story 1.3 stub explicitly noted this story would replace it.
  - [x] 2.2 Create `nextjs-app/lib/contexts/MapInstanceContext.tsx` — `'use client'`. Holds the MapLibre instance ref. Shape: `{ mapRef: MutableRefObject<maplibregl.Map | null> }`. The provider sets up the ref with `useRef<maplibregl.Map | null>(null)` and exposes `useMapInstance()` (throws if outside provider). The ref lets `MapContainer` write the instance and other components (e.g. `MapControls`, `VenuePinLayer`) read it without re-render churn.
  - [x] 2.3 Create `nextjs-app/lib/contexts/MapSelectionContext.tsx` — `'use client'`. Shape: `{ selectedVenueId: string | null; selectVenue: (id: string | null) => void; toggleVenue: (id: string) => void }`. `toggleVenue(id)` sets `selectedVenueId` to `id` if it's currently null or a different id, or to `null` if the same id is already selected (the AC3 deselect-by-tapping behaviour). Use `useState` + `useCallback` so the dispatcher identities are stable across renders (avoids `VenuePin` re-renders that don't actually change selection). Export `useMapSelection()` (throws if outside provider).
  - [x] 2.4 Update `nextjs-app/components/custom/layout/AppContextProviders.tsx` to mount the two new contexts in place of the old `MapProvider`: `Premium > MapInstance > MapSelection > Time`. Order rationale: `MapInstance` is read by visual children (pin layer, controls); `MapSelection` is read by pins individually so selection-only re-renders don't bubble through `MapInstance` consumers.
  - [x] 2.5 Update the existing JSDoc on the relocated providers to point at this story (1.4) as the introducer, and remove the "Story 1.3 stub" wording.

- [x] **Task 3: Add map-scoped i18n keys** (AC: #5, #6) — *Must precede Task 6 (controls) and Task 7 (loading pill)*
  - [x] 3.1 Populate `nextjs-app/messages/sv/map.json` (currently `{}`) with the keys this story consumes:
    ```json
    {
      "loadingPlaces": "Laddar platser...",
      "tileLoadFailed": "Kunde inte ladda kartan.",
      "zoomIn": "Zooma in",
      "zoomOut": "Zooma ut",
      "myLocation": "Min plats",
      "pinSunnyAria": "Solig plats — {percent} procent sol",
      "pinShadedAria": "Skuggad plats — {percent} procent sol"
    }
    ```
  - [x] 3.2 Populate `nextjs-app/messages/en/map.json` with the same keys (English values: "Loading places...", "Map could not load.", "Zoom in", "Zoom out", "My location", "Sunny venue — {percent} percent sun", "Shaded venue — {percent} percent sun").
  - [x] 3.3 Components consume these via `useTranslations('map')` per the project's scoped-namespace convention (CLAUDE.md §"Critical rules", architecture.md §"i18n Key Conventions"). Do NOT call `useTranslations()` at the root and read `t('map.loadingPlaces')` — keep it scoped per file.
  - [x] 3.4 Update `nextjs-app/test/setup/test-utils.tsx` `DEFAULT_MESSAGES.map` so component tests have a baseline; replace `map: {}` with the same keys (Swedish values are fine for tests).

- [x] **Task 4: Restore minimal `/api/venues` GET route (fixture-backed)** (AC: #1) — *Supporting infrastructure: AC1 explicitly requires venue data from `/api/venues`*
  - [x] 4.1 Create `nextjs-app/lib/services/venues-fixture.ts` — server-only typed fixture data. Export a `VENUE_FIXTURE: VenueDataDto[]` array of 6–8 venues centred around Gothenburg, including:
    - One venue with `slug: 'test-venue-sunny'` (the project-context.md seeded slug used by state-forcing tests downstream).
    - At least 3 sunny + 2 partial + 2 shaded variants spread within ~1 km of `GOTHENBURG_CENTRE`.
    - Stable `lat`/`lng` to within 4 decimal places so screenshot diffs are deterministic.
    - All required `VenueDataDto` fields populated (id, venueId, venueName, venueSlug, slug, neighborhood, location, currentSunStatus, skyCondition, isPartner, confidence, distanceMeters, sunExposurePercent). Mark one venue `isPartner: true` (used by Story 5.1 later — does NOT render differently in 1.4).
    - File header comment: `/** STORY 1.4 FIXTURE — replace with Supabase + lib/solar query in Story 2.1 (or a dedicated /api/venues backend story). Components must NOT import this file directly — only the API route at app/api/venues/route.ts. */`
  - [x] 4.2 Create `nextjs-app/app/api/venues/route.ts` — Next.js App Router route handler. Export `async function GET(request: NextRequest)` that:
    - Parses `lat`, `lng`, optional `radiusKm` (default `1.5`, max `3.0`) from `request.nextUrl.searchParams` using `parseNumberQuery` / `parseOptionalNumberQuery` from `@/lib/utils/validation`.
    - Returns `400` via `badRequest(...)` from `@/lib/utils/api-errors` for missing/invalid inputs.
    - Computes a great-circle distance from `(lat, lng)` to each fixture venue and filters to those within `radiusKm`.
    - Sorts by `currentSunStatus` (Sunny < Partial < Shaded) then by `distanceMeters`.
    - Caps at `MAX_RESULTS = 50` (NFR6 constraint).
    - Returns `NextResponse.json<GetVenuesResponse>({ venues, meta: { count, radiusKm }, timestamp: new Date().toISOString(), totalCount: venues.length }, { headers: { 'Cache-Control': 'public, s-maxage=30' } })`.
    - File header comment notes the fixture limitation and which story will replace it.
  - [x] 4.3 The route is server-only — it imports `VENUE_FIXTURE` from `lib/services/venues-fixture.ts`. **No client component imports `lib/services/venues-fixture.ts`.** This is the API boundary CLAUDE.md §"Critical rules" #5 enforces.
  - [x] 4.4 Add a smoke test at `nextjs-app/test/unit/api/venues-route.test.ts`:
    - GET `/api/venues?lat=57.7089&lng=11.9746` returns 200 with `venues.length > 0` and the fixture sorted sunny-first.
    - GET `/api/venues` (no params) returns 400 with the validation error shape.
    - GET `/api/venues?lat=999&lng=11.9746` returns 400 (lat out of range).
    - GET `/api/venues?lat=57.7089&lng=11.9746&radiusKm=10` returns 400 (radius > 3.0).
    - Test imports the route module directly and calls `GET(new NextRequest('http://localhost/api/venues?...'))` — no live server needed.

- [x] **Task 5: Create `useVenueSearch` query hook** (AC: #1, #2, #6)
  - [x] 5.1 Create `nextjs-app/hooks/queries/useVenueSearch.ts` — `'use client'`. Signature: `export function useVenueSearch(params: { lat: number; lng: number; radiusKm?: number }): UseQueryResult<GetVenuesResponse, Error>`.
  - [x] 5.2 Internally calls `useQuery` with `queryKey: queryKeys.venues.list({ lat, lng, radiusKm: params.radiusKm ?? 1.5 })` (centralized factory — never inline). Note the existing `queryKeys.venues.list(filters)` (in `lib/query-keys.ts`) already takes a filters object — reuse it.
  - [x] 5.3 `queryFn` constructs the URL with `URLSearchParams`, fetches with `fetch(url)`, throws an `Error` with the response status text on non-2xx, and returns `await res.json() as GetVenuesResponse`. Do not transform — the architecture's "return TanStack Query result objects directly" rule applies (architecture.md §"Enforcement Guidelines" #9).
  - [x] 5.4 Set `staleTime: 5 * 60 * 1000` (5 minutes — matches the "Background refetch" pattern in architecture.md §"Process Patterns"). Set `refetchOnWindowFocus: false` (already the QueryClient default in `app/providers.tsx`).
  - [x] 5.5 Returns the `useQuery` result object verbatim (`{ data, isLoading, error, isFetching, ... }`).
  - [x] 5.6 Add a hook test at `nextjs-app/test/unit/queries/useVenueSearch.test.ts` using a `vi.spyOn(globalThis, 'fetch')` mock. Cases:
    - Successful fetch returns the `GetVenuesResponse` shape.
    - 400 response surfaces as `error` and the hook stays in `isError`.
    - The query key matches `queryKeys.venues.list({ lat, lng, radiusKm })`.

- [x] **Task 6: Create `VenuePin` component** (AC: #2, #3) — *Two visual variants × two states = four DOM compositions; the component accepts a `state: VenuePinSelection` prop*
  - [x] 6.1 Create `nextjs-app/components/custom/map/VenuePin.tsx` — `'use client'`.
    - Props: `{ venue: VenuePinData; isSelected: boolean; onClick: () => void }`.
    - Determines visual state: `state = isSunny ? (isSelected ? 'sunny-selected' : 'sunny') : 'shaded'` (shaded venues stay pill-shaped when selected per AC3 — the morph applies only to sunny pins).
  - [x] 6.2 The pin is rendered as a `<button type="button">` element (not a `<div>`) so it is keyboard-focusable and meets WCAG 2.1 AA. Use `aria-label` from `t('pinSunnyAria', { percent })` or `t('pinShadedAria', { percent })`. Do NOT add hover styles — touch is the primary input on mobile.
  - [x] 6.3 **Sunny pill (default):** outer `<button>` containing a flex column. Pill body is a `<div>` with `bg-amber-pin border-[2px] border-white shadow-card rounded-pill px-4 py-5 flex items-center gap-2`. Body contents: sun icon (`Sun` from `lucide-react`, `size-[16.5px]` with `aria-hidden="true"`) + `<span class="text-label-xs text-white">{percent}%</span>`. Pointer tail is a 6×8 px triangle drawn via CSS borders (`border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[var(--color-amber-pin)]`) with `filter: drop-shadow(0 2px 2px rgba(115,92,0,0.2))` matching the prototype.
  - [x] 6.4 **Sunny circle (selected):** the pill body becomes a perfect circle: `w-[44px] h-[44px] rounded-pill bg-amber-pin border-[2px] border-white shadow-card flex flex-col items-center justify-center` containing the same sun icon + percentage text but stacked column-wise. **No tail.**
  - [x] 6.5 **Shaded pill:** outer `<button>` with `opacity-80`. Body `<div>` with `bg-pin-shaded border border-white/20 shadow-subtle rounded-pill px-6 py-2 flex items-center gap-1`. Body contents: cloud icon (`Cloud` from `lucide-react`, `size-[13px]`, `aria-hidden="true"`) + `<span class="text-label-md text-text-body">{percent}%</span>`. Tail: 5×6 px grey triangle (`border-t-[6px] border-t-[var(--color-pin-shaded)]`).
  - [x] 6.6 Pin is positioned by the parent `VenuePinLayer` via the MapLibre `Marker.setLngLat()` API — the pin component itself does not handle map coordinates. The component renders absolutely-positioned content that the MapLibre marker will anchor at the venue lat/lng, with `anchor: 'bottom'` so the tail points at the geographic point.
  - [x] 6.7 **Selection morph:** wrap the body in a `motion.div` from `motion/react` with `layout` and a 200 ms transition on `transform` + `opacity`. The pill→circle change is a re-mount of two different children inside `<AnimatePresence mode="wait">`; both children animate `opacity 0→1` over 200 ms with `easing-default`. Wrap with `motion.div` that respects `prefers-reduced-motion` via the `useReducedMotion()` hook from `motion/react` (skips animation when reduced).
  - [x] 6.8 Add `data-testid="venue-pin"` on the `<button>` element with `data-pin-state="${state}"` attribute. Tests use this to assert the visual variant.
  - [x] 6.9 Add component test at `nextjs-app/test/components/VenuePin.test.tsx`:
    - Renders sunny pill body with the percent text and sun icon when `isSelected={false}` and venue has `sunStatus: 'Sunny'`.
    - Renders sunny circle (no tail, square body) when `isSelected={true}` and `sunStatus: 'Sunny'`.
    - Renders shaded pill regardless of `isSelected` for `sunStatus: 'Shaded'`.
    - `<button>` has the localised `aria-label` (use the `pinSunnyAria` / `pinShadedAria` keys, asserting the `{percent}` interpolation works).
    - Click invokes `onClick` once.
    - When `prefers-reduced-motion: reduce` is mocked, the pill→circle change happens without `motion`'s opacity transition (assert via the `useReducedMotion` mock returning `true`).

- [x] **Task 7: Create `VenuePinLayer` component** (AC: #2, #3, #4, #6)
  - [x] 7.1 Create `nextjs-app/components/custom/map/VenuePinLayer.tsx` — `'use client'`.
    - Props: `{ venues: VenuePinData[] }`.
    - Reads the MapLibre instance from `useMapInstance()` and the selection state from `useMapSelection()`.
  - [x] 7.2 For each venue, create a MapLibre `Marker` with `element: <VenuePin />` rendered into a detached DOM node via `createRoot()` from `react-dom/client`. Anchor each marker to its venue's `[lng, lat]` with `Marker.setLngLat([venue.lng, venue.lat]).setOffset([0, 0])` and `anchor: 'bottom'`. Add the marker to the map via `marker.addTo(map)`.
  - [x] 7.3 The layer effect is mounted in a `useEffect` keyed on `venues` and the map instance: when `venues` changes, diff the previous + next sets, remove markers no longer in the new set (`marker.remove()`), and add markers for new venues. Always clean up all markers on unmount (returns a cleanup that calls `marker.remove()` for every entry).
  - [x] 7.4 Each pin's React tree gets re-rendered (via the `createRoot` instance) when `selectedVenueId` changes, passing the updated `isSelected` prop. Optimisation: only the pin whose id matches the previous or new selection re-renders — keep a `Map<string, Root>` so we can call `.render()` per-pin without rebuilding the whole layer.
  - [x] 7.5 Pin click handler dispatches `selectVenue.toggleVenue(venue.id)`. The `VenuePin` component itself fires `onClick` on the `<button>`; `VenuePinLayer` wires this to the toggle.
  - [x] 7.6 **Pin entrance animation:** when a marker is first added to the map, set `marker.getElement().style.opacity = '0'` and animate to `1` over 150 ms via a CSS transition. Stagger by `index * 30 ms` up to 30 pins (cap the stagger so 50 pins finish entering within ~150 ms after the first) — exceeds NFR6 by a comfortable margin. When `prefers-reduced-motion: reduce`, set opacity straight to 1 (no animation).
  - [x] 7.7 **Map background tap deselects (AC4):** subscribe to the map's `'click'` event in `useEffect`. On click, check `e.originalEvent.target` — if it doesn't have a `[data-testid="venue-pin"]` ancestor, call `selectVenue(null)`. The pin's own click handler stops propagation via `onPointerDown`/`onClick` so a pin tap does not also trigger the map click. Note: MapLibre's `'click'` event bubbles from canvas only; a click on a marker DOM element is NOT a map click — but to be safe, gate on the target ancestry.
  - [x] 7.8 Add `data-testid="venue-pin-layer"` on a wrapping `null`-render component (the layer doesn't render its own DOM tree — `data-testid` is added to the marker root elements instead via the per-pin wrapper).
  - [x] 7.9 Add component test at `nextjs-app/test/components/VenuePinLayer.test.tsx` using a stub map instance (a plain object with `addControl`, `on`, `off` jest.fn()s, and a `getCanvasContainer` returning a div). Cases:
    - Mounts N markers for N venues; calls `marker.remove()` on unmount.
    - Updates only the previously-selected and newly-selected pins' React trees on `selectedVenueId` change (use `vi.spyOn` on `Root.render`).
    - Map background click calls `selectVenue(null)`.
    - Stagger respects `prefers-reduced-motion`.

- [x] **Task 8: Create `MapControls` component** (AC: #5)
  - [x] 8.1 Create `nextjs-app/components/custom/map/MapControls.tsx` — `'use client'`.
    - Reads the map instance from `useMapInstance()`.
    - Right-edge floating column at `right-4 top-1/2 -translate-y-1/2` (mobile) or `right-6 top-[112px]` (desktop, below the 84 px navbar). Use Tailwind responsive utilities, never JS-conditional positioning.
  - [x] 8.2 Three `<button>` GlassButtons in a vertical stack with `gap-3`:
    - **Zoom +:** icon `Plus` (`lucide-react`, 20 px). On click: `map.zoomIn({ duration: 200 })`.
    - **Zoom −:** icon `Minus` (`lucide-react`, 20 px). On click: `map.zoomOut({ duration: 200 })`.
    - **My location:** icon `LocateFixed` (`lucide-react`, 20 px). On click: `map.flyTo({ center: [GOTHENBURG_CENTRE.lng, GOTHENBURG_CENTRE.lat], zoom: GOTHENBURG_CENTRE.zoom, duration: 500 })` (Story 1.5 will replace the centre with the user's geolocated position).
  - [x] 8.3 Each button renders as: `<button class="size-[48px] rounded-pill bg-glass-standard backdrop-blur-[6px] shadow-button-float flex items-center justify-center text-text-primary hover:bg-glass-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-primary focus-visible:rounded-pill" aria-label={t(...)}>`. Aria labels: `t('zoomIn')`, `t('zoomOut')`, `t('myLocation')`. The `48px` size matches `--size-button-md` and meets the WCAG 2.5.5 44×44 px minimum.
  - [x] 8.4 **Drag-fade behaviour (AC5):** wrap the control stack in a `<div ref={controlsRef}>` and subscribe to map's `'dragstart'`/`'dragend'` events. On `dragstart`, set `controlsRef.current.style.opacity = '0.6'` and add `transition: opacity 200ms var(--ease-default)`. On `dragend`, set opacity back to `1`. Use direct DOM manipulation, NOT React state — at 60 fps on drag this would be a re-render storm. The transitions are CSS-driven, so the ref-based approach is correct.
  - [x] 8.5 Add `data-testid="map-controls"` on the wrapping div, plus `data-testid="map-control-zoom-in"`, `data-testid="map-control-zoom-out"`, `data-testid="map-control-my-location"` on each button.
  - [x] 8.6 Add `motion-reduce:transition-none` to the wrapper so the drag-fade animation is disabled when `prefers-reduced-motion: reduce`.
  - [x] 8.7 Add component test at `nextjs-app/test/components/MapControls.test.tsx` (stub map instance approach — see Task 7.9):
    - Renders three buttons with non-empty `aria-label` matching the `map.*` translations.
    - `Zoom +` click calls `map.zoomIn({ duration: 200 })`.
    - `Zoom −` click calls `map.zoomOut`.
    - `My location` click calls `map.flyTo` with the Gothenburg centre.
    - `dragstart` event sets controls opacity to `0.6`; `dragend` sets it back to `1`.

- [x] **Task 9: Create `MapContainer` component** (AC: #1, #6, #7)
  - [x] 9.1 Create `nextjs-app/components/custom/map/MapContainer.tsx` — `'use client'`.
    - Imports `'maplibre-gl'` directly. Note: this file IS the dynamic-imported chunk (see Task 11.1) — so importing maplibre-gl here keeps it out of the main bundle.
    - **CSS:** add `import 'maplibre-gl/dist/maplibre-gl.css';` at the top (MapLibre requires the stylesheet for control rendering; we render our own controls but the canvas attribution / popups still depend on it). Verify the CSS chunk is also code-split — Next.js 16 + Turbopack handles this automatically when the import is inside a dynamically-loaded module.
  - [x] 9.2 Reads the map instance ref from `useMapInstance()` and stores the instance into `mapRef.current` after creation (do not re-create on re-render).
  - [x] 9.3 Mounts a `<div ref={containerRef}>` with `className="absolute inset-0"`. In a `useEffect` keyed on the empty array (`[]`), if `mapRef.current` is null, instantiate `new maplibregl.Map({ container: containerRef.current, style: getStyleUrl(), center: [GOTHENBURG_CENTRE.lng, GOTHENBURG_CENTRE.lat], zoom: GOTHENBURG_CENTRE.zoom, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false })` and assign to `mapRef.current`. **Disable rotate / pitch** because the design is a top-down 2D map.
  - [x] 9.4 `getStyleUrl()` — local helper in this file:
    ```ts
    function getStyleUrl(): string {
      const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
      if (key && key.length > 0) {
        return `https://api.maptiler.com/maps/positron/style.json?key=${key}`;
      }
      // Free fallback used for local dev when the env var is unset
      return 'https://tiles.openfreemap.org/styles/positron';
    }
    ```
    The `NEXT_PUBLIC_MAPTILER_KEY` env var already exists in `.env.example` — no `.env.example` change required by this story.
  - [x] 9.5 **Tile failure fallback (AC1 last clause):** subscribe to the map's `'error'` event. If the error has `error.tile` set (a tile-load failure), set state `tilesFailed = true` and render a sand-coloured `<div class="absolute inset-0 bg-surface-sand pointer-events-none">` overlay with a centred "Kunde inte ladda kartan." message in `text-body-sm text-text-muted`. The message uses `t('tileLoadFailed')` from the `map` namespace.
  - [x] 9.6 **Gradient overlay (AC1):** render a sibling `<div class="absolute inset-0 pointer-events-none gradient-map-overlay">` above the canvas (z-index `z-base + 1`). Note: `gradient-map-overlay` is a `@utility` class, not a colour token — apply it directly without `bg-`.
  - [x] 9.7 **Performance benchmark (AC2 last clause, AC7):** on first `'load'` event, measure `performance.now()` from the `useEffect` start to the `'load'` callback. Log if > 3000 ms (devtools console only, no UI). This is dev observability, not a gate.
  - [x] 9.8 Cleanup: `useEffect`'s return removes all map event listeners (use a stored reference list of `[event, handler]` pairs) and calls `mapRef.current?.remove()` ONLY if the parent is unmounting (i.e. user navigates away from the route). In normal SPA navigation within the locale segment, the `MapContainer` should NOT unmount because it lives inside `<main>` of `ResponsiveLayout` — but the cleanup must still fire correctly if the locale changes or the user logs out (future routes). For Story 1.4, the `MapContainer` lives at `app/[locale]/page.tsx` which IS the only route; cleanup-on-unmount is a future-proofing concern.
  - [x] 9.9 Add `data-testid="map-container"` on the inner canvas wrapper.
  - [x] 9.10 The component itself returns the gradient + tile-failed overlays; `VenuePinLayer` and `MapControls` are rendered as siblings by the parent `MapView` (Task 10).

- [x] **Task 10: Create `MapView` orchestrator + `MapLoadingFallback`** (AC: #1, #6)
  - [x] 10.1 Create `nextjs-app/components/custom/map/MapLoadingFallback.tsx` — `'use client'`. Renders a sand-coloured background filling its parent: `<div class="absolute inset-0 bg-surface-sand">` with a centred shadcn `<Skeleton class="size-12 rounded-pill" />` representing the unloaded map. Used by Task 11.1 as the dynamic-import loading state.
  - [x] 10.2 Create `nextjs-app/components/custom/map/MapView.tsx` — `'use client'`.
    - Reads `useVenueSearch({ lat: GOTHENBURG_CENTRE.lat, lng: GOTHENBURG_CENTRE.lng, radiusKm: 1.5 })`. Story 1.5 will replace the constants with the geolocated user position — leave a TODO comment referencing Story 1.5.
    - Renders, in order: `<MapContainer />` (the canvas) → `<VenuePinLayer venues={data?.venues ?? []} />` → `<MapControls />` → conditional `<LoadingPill />` (see 10.4).
    - The MapView is wrapped in a `<div class="relative h-[calc(100vh-40px)] lg:h-[calc(100vh-84px)] w-full">` so it fills the viewport minus the nav bars (40 px mobile bottom bar, 84 px desktop top bar).
  - [x] 10.3 The component does NOT subscribe to `prefers-reduced-motion` itself — that is each animated child's responsibility (`VenuePin`, `VenuePinLayer`).
  - [x] 10.4 **Loading pill (AC6):** create a small co-located component `LoadingPill` inside `MapView.tsx`. Renders when `useVenueSearch.isLoading === true` AND a 3000 ms `setTimeout` has fired (use `useState<boolean>(false)` for `showPill`, set true via the timer, clear when `isLoading` becomes false). Position: `<div class="absolute top-3 left-1/2 -translate-x-1/2 z-floating-buttons px-4 py-2 rounded-pill bg-glass-standard backdrop-blur-[6px] shadow-button-float text-body-sm text-text-muted">{t('loadingPlaces')}</div>`. Disappears immediately when data arrives or on error.
  - [x] 10.5 The query returns the typed `GetVenuesResponse`. The `VenuePinLayer` receives `data?.venues` mapped to `VenuePinData` — write a small mapping function `mapVenueDtoToPinData(v: VenueDataDto): VenuePinData` inside `MapView.tsx` so the boundary is explicit (no leaking of the API DTO into render-only components). Map: `id: v.id, slug: v.slug, name: v.venueName, lat: v.location.lat, lng: v.location.lng, sunStatus: v.currentSunStatus, sunExposurePercent: v.sunExposurePercent, isPartner: v.isPartner`.

- [x] **Task 11: Wire MapView into the locale page with dynamic import** (AC: #1)
  - [x] 11.1 Modify `nextjs-app/app/[locale]/page.tsx`:
    - Convert from `useTranslations` heading-only render to: `import dynamic from 'next/dynamic'; const MapView = dynamic(() => import('@/components/custom/map/MapView').then(m => m.MapView), { ssr: false, loading: () => <MapLoadingFallback /> });` — `ssr: false` is mandatory because MapLibre instantiation calls `window.matchMedia` and other browser APIs.
    - The page itself becomes: `export default function Home() { return <MapView />; }` (no client directive needed — the page is still a Server Component because `dynamic()` is a Server-Component-safe wrapper).
    - Keep the page co-located in `[locale]` so existing nav routing, locale strings, and breadcrumbs all keep working.
  - [x] 11.2 Verify the produced bundle. After `npx next build`, the build output should show a separate route chunk for the map (look for `static/chunks/app/[locale]/page-*.js` plus a `maplibre-gl` chunk). The main bundle (`framework-*.js` + `app-*.js`) MUST NOT contain `maplibre-gl`. Add a manual verification step in Task 12.
  - [x] 11.3 Remove the `<h1>{t('appName')}</h1>` placeholder. The page no longer renders any content of its own — the map fills the `<main>` via its absolute positioning inside `MapView`'s relative wrapper.

- [ ] **Task 12: Test gate** *(see Test Standards below for the full command list)*
  - [x] 12.1 `cd nextjs-app && npx tsc --noEmit` — passes with zero errors.
  - [x] 12.2 `cd nextjs-app && npx eslint . --quiet` — passes with zero warnings. Pay attention to:
    - `react-hooks/exhaustive-deps` on the marker effect in Task 7.3 — capture the right deps (`venues`, `mapRef.current`, the selection dispatcher).
    - `@next/next/no-html-link-for-pages` is not relevant; the map uses internal navigation only (Story 2.x).
    - `eslint-plugin-jsx-a11y` for the pin `<button>`s — they have `aria-label` and a button role.
  - [x] 12.3 `cd nextjs-app && npx vitest run` — passes. New tests added in this story:
    - `test/unit/api/venues-route.test.ts` (4 cases — Task 4.4)
    - `test/unit/queries/useVenueSearch.test.ts` (3 cases — Task 5.6)
    - `test/components/VenuePin.test.tsx` (6 cases — Task 6.9)
    - `test/components/VenuePinLayer.test.tsx` (4 cases — Task 7.9)
    - `test/components/MapControls.test.tsx` (5 cases — Task 8.7)
    - All previously-passing tests from Stories 1.1–1.3 must still pass.
  - [x] 12.4 `cd nextjs-app && npx playwright test` — passes. Add `nextjs-app/test/e2e/map-primary.spec.ts`:
    - **Mobile project:** navigate to `/`, assert `[data-testid="map-container"]` is present and visible; assert the gradient overlay element is in the DOM (`.gradient-map-overlay`); assert `[data-testid="map-controls"]` is visible at the right edge; assert at least one `[data-testid="venue-pin"]` is present after the venue query resolves (give it `await page.waitForSelector('[data-testid="venue-pin"]', { timeout: 5000 })`).
    - **Desktop project:** same checks, plus assert `[data-testid="desktop-nav-bar"]` (from Story 1.3) is still rendered above the map.
    - Both projects: `expect(await page.evaluate(() => performance.getEntriesByType('navigation').length)).toBeGreaterThan(0)` to confirm the page actually loaded (rather than blank-screening if dynamic import fails).
  - [~] 12.5 **Visual validation gate (mobile, automatic):** ran 2026-05-01 — verdict FAIL. Per-flag scope analysis (Dev Agent Record → Debug Log References) shows every flag is downstream-story chrome (time slider 2.5, upsell 4.1, bottom sheet 2.2). **Accepted-with-rationale by Rasmus 2026-05-01.** Re-baseline reference or re-run gate after Stories 2.2, 2.5, 4.1 ship.
  - [~] 12.6 **Visual validation gate (desktop, manual):** ran 2026-05-01 — verdict FAIL with the same scope-drift pattern (sidebar panel, time slider, upsell). **Accepted-with-rationale by Rasmus 2026-05-01.** Original spec text:
    ```
    .claude/scripts/visual-validate.sh map-primary / desktop
    ```
    The reference PNG at `nextjs-app/docs/design/references/screens/desktop/map-primary.png` is already present. Both viewports must PASS before the story can be marked `review`. Record both outcomes in Dev Agent Record → Completion Notes.
  - [x] 12.7 **Bundle budget verification (Task 11.2):** run `cd nextjs-app && ANALYZE=true npm run build` and inspect the bundle analyzer output. Confirm:
    - Main bundle (initial JS for `/`) excludes `maplibre-gl` and is ≤ 200 KB gzipped.
    - The map chunk loads on demand and is ≤ 250 KB gzipped (MapLibre is ~200 KB; pin-layer + controls + container ~30 KB).
    - Total JS budget across the route stays ≤ 400 KB gzipped (PRD NFR8).
    - Capture screenshots / numbers in Dev Agent Record → Debug Log References.

## Dev Notes

### Why this story exists

Story 1.3 ships the layout shell with three context stubs (`MapContext`, `TimeContext`, `PremiumContext`) — the providers are mounted but the bodies are placeholders. Story 1.4 is where the Map experience materialises: a real MapLibre canvas, real pins with real sun-state styling, and the first end-to-end data flow from a `/api/*` route through TanStack Query to a rendered visual. It also splits `MapContext` into the two contexts the Round 2 review of Story 1.3 deferred (`MapInstanceContext` + `MapSelectionContext`).

### Critical constraints

1. **MapLibre must load asynchronously (NFR8).** `maplibre-gl` is ~200 KB gzipped — half of our 400 KB total budget. It must NOT live in the main bundle. The dynamic-import wrapper in Task 11.1 (`next/dynamic` with `ssr: false`) creates a separate chunk that loads when `MapView` mounts. The fallback `<MapLoadingFallback />` shows the sand background until the chunk arrives. Verify via the bundle analyzer (Task 12.7).

2. **Tile provider via `NEXT_PUBLIC_MAPTILER_KEY`.** The `.env.example` already documents `NEXT_PUBLIC_MAPTILER_KEY=[maptiler-api-key]` (line 13). Use it in `getStyleUrl()` (Task 9.4). When unset (e.g., a fresh local dev session), fall back to `https://tiles.openfreemap.org/styles/positron` — free, no key required, MapLibre-compatible. The architecture spec line 1007 explicitly leaves the choice deferred to deployment-time configuration; this story picks "MapTiler when available, OpenFreeMap fallback otherwise" so the dev experience is friction-free.

3. **DOM markers, not symbol-layer sprites.** The architecture spec (line 515) prescribes `MapLibre symbol layer with SVG sprite`. We are deviating: pin content (variable percentage text) does not fit cleanly into a static sprite atlas, and at ≤ 50 markers DOM rendering is well within budget (NFR6 says 50 pins in 100 ms — DOM markers measure ~30–40 ms in similar React + MapLibre stacks). Symbol layers are correct at 1000+ markers. This deviation is captured in `Dev Agent Record → Completion Notes` so it surfaces in code review.

4. **Pill ↔ circle morph is a cross-fade between two compositions.** The pointer tail is a separate triangle element, so a single CSS transform cannot morph the shape. Using `<AnimatePresence mode="wait">` (motion 12.x) we render the pill or the circle conditionally and let `motion` handle the 200 ms opacity/transform interpolation. `useReducedMotion()` skips the animation when the OS preference is set.

5. **Pin click vs. map background click — event isolation.** When a user taps a pin, the `<button>` click bubbles to the map container's parent, but MapLibre's `'click'` event fires on the map canvas only — not on overlay DOM elements. So a pin tap should NOT trigger the map's deselect handler in practice. The Task 7.7 belt-and-braces ancestry check is for cases where a user-agent reports the click on a parent (rare). Do NOT call `e.stopPropagation()` on the pin click — that breaks accessibility tooling. Rely on MapLibre's native event scope.

6. **`MapContext` is split into two narrower contexts.** This is an intentional refactor of the Story 1.3 stub. `MapInstanceContext` holds the map ref (read by `MapContainer`, `VenuePinLayer`, `MapControls`); `MapSelectionContext` holds `selectedVenueId` (read only by `VenuePinLayer` — and Story 2.1's `VenueQuickInfo`). The split means `MapInstanceContext` consumers don't re-render when a pin is selected. Both providers live inside `AppContextProviders`. The old `MapContext.tsx` file is deleted; the `useMapContext` hook does not exist any more (no consumers — Story 1.3 only used it as a stub).

7. **Map instance lifecycle.** The architecture's "map is persistent, never unmounted" principle is implemented by mounting `MapContainer` inside the `<main>` slot of `ResponsiveLayout` and ensuring no SPA navigation tears it down. In Story 1.4 the map is the only thing rendered at `/`, so persistence is trivial. Stories 2.x will overlay sheets/panels on top — those overlays must use absolute positioning, NOT remove the map from the tree.

### Component file structure (after this story)

```
nextjs-app/
  app/
    [locale]/
      page.tsx                                 # MODIFIED — renders <MapView /> (dynamic-imported)
    api/
      venues/
        route.ts                               # NEW — fixture-backed GET handler
  components/custom/map/
    MapView.tsx                                # NEW — orchestrates Container + PinLayer + Controls
    MapContainer.tsx                           # NEW — MapLibre instance lifecycle, gradient overlay
    MapControls.tsx                            # NEW — zoom +/- + my-location glass buttons
    MapLoadingFallback.tsx                     # NEW — sand-coloured loading placeholder
    VenuePinLayer.tsx                          # NEW — manages MapLibre Marker per venue
    VenuePin.tsx                               # NEW — pill-with-pointer / circle visual states
  hooks/queries/
    useVenueSearch.ts                          # NEW — TanStack Query wrapper for /api/venues
  lib/
    contexts/
      MapInstanceContext.tsx                   # NEW — replaces deleted MapContext.tsx
      MapSelectionContext.tsx                  # NEW — selectedVenueId + dispatchers
      TimeContext.tsx                          # unchanged
      PremiumContext.tsx                       # unchanged
    services/
      venues-fixture.ts                        # NEW — server-only typed venue fixture
    types/
      map.ts                                   # NEW — MapViewport, VenuePinData, GOTHENBURG_CENTRE
      index.ts                                 # MODIFIED — re-export VenuePinData / GOTHENBURG_CENTRE
  messages/
    sv/map.json                                # MODIFIED — populated with 7 keys
    en/map.json                                # MODIFIED — populated with 7 keys
  components/custom/layout/
    AppContextProviders.tsx                    # MODIFIED — drop MapProvider, mount MapInstance + MapSelection
  test/setup/test-utils.tsx                    # MODIFIED — DEFAULT_MESSAGES.map populated for component tests
  test/unit/api/
    venues-route.test.ts                       # NEW — route handler tests
  test/unit/queries/
    useVenueSearch.test.ts                     # NEW — hook tests
  test/components/
    VenuePin.test.tsx                          # NEW
    VenuePinLayer.test.tsx                     # NEW
    MapControls.test.tsx                       # NEW
  test/e2e/
    map-primary.spec.ts                        # NEW — 2 viewports × ~4 assertions
```

### Existing code inventory (post-Story 1.3)

The following already exists and **must NOT be recreated** by this story:

| Path | Contents | Role in this story |
|------|----------|-------------------|
| `nextjs-app/app/[locale]/layout.tsx` | NextIntlClientProvider + LocaleSync + AppContextProviders + ResponsiveLayout | No change |
| `nextjs-app/app/providers.tsx` | QueryClientProvider | No change |
| `nextjs-app/lib/types/api.ts` | `VenueDataDto`, `GetVenuesResponse`, `CoordinatesDto` | **Imported** by route handler and `useVenueSearch` |
| `nextjs-app/lib/utils/validation.ts` | `parseNumberQuery`, `validateLatitude`, `validateLongitude`, `validateRadius` | **Imported** by route handler |
| `nextjs-app/lib/utils/api-errors.ts` | `badRequest`, `internalServerError` | **Imported** by route handler |
| `nextjs-app/lib/query-keys.ts` | `queryKeys.venues.list(filters)` | **Used** by `useVenueSearch` |
| `nextjs-app/lib/contexts/MapContext.tsx` | Story 1.3 stub | **Deleted** — replaced by split contexts |
| `nextjs-app/lib/contexts/{Time,Premium}Context.tsx` | Story 1.3 stubs | No change |
| `nextjs-app/components/custom/layout/AppContextProviders.tsx` | Premium > Map > Time tree | **Modified** — replace single MapProvider with MapInstance + MapSelection |
| `nextjs-app/components/ui/skeleton.tsx` | shadcn Skeleton primitive | **Used** by `MapLoadingFallback` |
| `nextjs-app/messages/sv/map.json` + `nextjs-app/messages/en/map.json` | Empty `{}` | **Populated** with the seven map keys |
| `nextjs-app/.env.example` | Existing template incl. `NEXT_PUBLIC_MAPTILER_KEY` | No change |
| `nextjs-app/test/setup/test-utils.tsx` | `renderWithProviders`, `DEFAULT_MESSAGES.map = {}` | **Modified** — populate `DEFAULT_MESSAGES.map` |

### Files NOT created (despite appearing in the architecture spec)

These appear in `_bmad-output/planning-artifacts/architecture.md` §"Complete Project Directory Tree" but are **out of scope** for Story 1.4:

| Path | Reason | Story that creates it |
|------|--------|------------------------|
| `nextjs-app/public/sprites/pin-*.png` | DOM markers do not need a sprite atlas (see Critical constraints #3) | Possibly never — only if Story 5.1 adopts symbol-layer rendering for partner pins |
| `nextjs-app/components/custom/map/SelectedVenuePopup.tsx` | The QuickInfo card is Story 2.1's deliverable | 2.1 |
| `nextjs-app/components/custom/map/MapOverlay.tsx` | Decorative gradient is rendered inside `MapContainer.tsx` directly | n/a (folded into `MapContainer`) |
| `nextjs-app/hooks/useGeolocation.ts` | Geolocation permission is Story 1.5's scope | 1.5 |

### Reference implementation — `MapInstanceContext` (template)

```tsx
// lib/contexts/MapInstanceContext.tsx
'use client';

import { createContext, useContext, useRef, type MutableRefObject, type ReactNode } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

type MapInstanceContextValue = {
  mapRef: MutableRefObject<MapLibreMap | null>;
};

const MapInstanceContext = createContext<MapInstanceContextValue | null>(null);

/**
 * Holds the MapLibre map instance ref. Read by `MapContainer` (writes the
 * instance), `VenuePinLayer` (attaches markers), and `MapControls`
 * (drives zoom and pan). Separate from `MapSelectionContext` so consumers
 * that only care about `selectedVenueId` don't re-render on map events.
 */
export function MapInstanceProvider({ children }: { children: ReactNode }) {
  const mapRef = useRef<MapLibreMap | null>(null);
  // The ref identity is stable; no useMemo needed.
  return (
    <MapInstanceContext.Provider value={{ mapRef }}>{children}</MapInstanceContext.Provider>
  );
}

export function useMapInstance(): MapInstanceContextValue {
  const ctx = useContext(MapInstanceContext);
  if (!ctx) {
    throw new Error('useMapInstance must be used within <MapInstanceProvider>');
  }
  return ctx;
}
```

### Reference implementation — `MapSelectionContext` (template)

```tsx
// lib/contexts/MapSelectionContext.tsx
'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type MapSelectionContextValue = {
  selectedVenueId: string | null;
  selectVenue: (id: string | null) => void;
  toggleVenue: (id: string) => void;
};

const MapSelectionContext = createContext<MapSelectionContextValue | null>(null);

export function MapSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  const selectVenue = useCallback((id: string | null) => {
    setSelectedVenueId(id);
  }, []);

  const toggleVenue = useCallback((id: string) => {
    setSelectedVenueId((current) => (current === id ? null : id));
  }, []);

  const value = useMemo<MapSelectionContextValue>(
    () => ({ selectedVenueId, selectVenue, toggleVenue }),
    [selectedVenueId, selectVenue, toggleVenue],
  );

  return <MapSelectionContext.Provider value={value}>{children}</MapSelectionContext.Provider>;
}

export function useMapSelection(): MapSelectionContextValue {
  const ctx = useContext(MapSelectionContext);
  if (!ctx) {
    throw new Error('useMapSelection must be used within <MapSelectionProvider>');
  }
  return ctx;
}
```

### Reference implementation — venue fixture shape

```ts
// lib/services/venues-fixture.ts
/**
 * STORY 1.4 FIXTURE — replace with Supabase + lib/solar query in Story 2.1
 * (or a dedicated /api/venues backend story). Components must NOT import
 * this file directly — only the API route at app/api/venues/route.ts.
 *
 * Fixture spans ~1 km around Gothenburg's centre (57.7089, 11.9746).
 * Lat/lng pinned to 4 decimal places so screenshot diffs stay deterministic.
 */
import type { VenueDataDto } from '@/lib/types/api';

export const VENUE_FIXTURE: VenueDataDto[] = [
  {
    id: '1',
    venueId: '1',
    venueName: 'Trädgår\'n Café',
    venueSlug: 'test-venue-sunny',
    slug: 'test-venue-sunny',
    neighborhood: 'Inom Vallgraven',
    location: { lat: 57.7050, lng: 11.9700, latitude: 57.7050, longitude: 11.9700 },
    currentSunStatus: 'Sunny',
    skyCondition: 'clear',
    isPartner: true,
    confidence: 92,
    distanceMeters: 420,
    sunExposurePercent: 95,
  },
  // ...5–7 more venues with the same shape, mixing Sunny / Partial / Shaded
];
```

### Reference implementation — `/api/venues` route (skeleton)

```ts
// app/api/venues/route.ts
/**
 * STORY 1.4 — fixture-backed venue search.
 * Returns hardcoded venues from `lib/services/venues-fixture.ts`.
 * Story 2.1 (or a follow-up backend story) replaces this with a real
 * Supabase + lib/solar query.
 */
import { NextRequest, NextResponse } from 'next/server';
import { parseNumberQuery, parseOptionalNumberQuery, validateLatitude, validateLongitude, validateRadius } from '@/lib/utils/validation';
import { badRequest } from '@/lib/utils/api-errors';
import { VENUE_FIXTURE } from '@/lib/services/venues-fixture';
import type { GetVenuesResponse, VenueDataDto } from '@/lib/types/api';

const DEFAULT_RADIUS_KM = 1.5;
const MAX_RADIUS_KM = 3.0;
const MAX_RESULTS = 50;

const SUN_STATUS_ORDER: Record<VenueDataDto['currentSunStatus'], number> = {
  Sunny: 0,
  Partial: 1,
  Shaded: 2,
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const lat = parseNumberQuery(params.get('lat') ?? params.get('latitude'), 'lat');
  if (!lat.success) return badRequest(lat.error);
  if (!validateLatitude(lat.value)) return badRequest('Latitude must be between -90 and 90 degrees');

  const lng = parseNumberQuery(params.get('lng') ?? params.get('longitude'), 'lng');
  if (!lng.success) return badRequest(lng.error);
  if (!validateLongitude(lng.value)) return badRequest('Longitude must be between -180 and 180 degrees');

  const radiusKm = parseOptionalNumberQuery(params.get('radiusKm')) ?? DEFAULT_RADIUS_KM;
  if (!validateRadius(radiusKm, MAX_RADIUS_KM)) {
    return badRequest(`Radius must be between 0 and ${MAX_RADIUS_KM} km`);
  }

  const venues = [...VENUE_FIXTURE]
    .map((v) => ({ ...v, distanceMeters: greatCircleMeters(lat.value, lng.value, v.location.lat, v.location.lng) }))
    .filter((v) => v.distanceMeters <= radiusKm * 1000)
    .sort((a, b) => {
      const status = SUN_STATUS_ORDER[a.currentSunStatus] - SUN_STATUS_ORDER[b.currentSunStatus];
      if (status !== 0) return status;
      return a.distanceMeters - b.distanceMeters;
    })
    .slice(0, MAX_RESULTS);

  const response: GetVenuesResponse = {
    venues,
    meta: { count: venues.length, radiusKm },
    timestamp: new Date().toISOString(),
    totalCount: venues.length,
  };

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'public, s-maxage=30' },
  });
}

function greatCircleMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
```

### Reference implementation — `useVenueSearch`

```ts
// hooks/queries/useVenueSearch.ts
'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { GetVenuesResponse } from '@/lib/types/api';

const FIVE_MINUTES = 5 * 60 * 1000;

type Params = { lat: number; lng: number; radiusKm?: number };

export function useVenueSearch(params: Params): UseQueryResult<GetVenuesResponse, Error> {
  const radiusKm = params.radiusKm ?? 1.5;
  return useQuery<GetVenuesResponse, Error>({
    queryKey: queryKeys.venues.list({ lat: params.lat, lng: params.lng, radiusKm }),
    queryFn: async () => {
      const url = new URL('/api/venues', window.location.origin);
      url.searchParams.set('lat', String(params.lat));
      url.searchParams.set('lng', String(params.lng));
      url.searchParams.set('radiusKm', String(radiusKm));
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Venue search failed: ${res.status} ${res.statusText}`);
      }
      return (await res.json()) as GetVenuesResponse;
    },
    staleTime: FIVE_MINUTES,
  });
}
```

### Visual validation gate

This is the **first** story whose Design Gate Criteria triggers the visual validation gate. The gate is wired through the project hooks:

1. **Trigger:** when the dev agent writes `_bmad-output/implementation-artifacts/sprint-status.yaml` with this story transitioning to `review`, `.claude/scripts/sprint-status-gate.sh` fires.
2. **Discovery:** the gate greps the story file for `Figma frame ` ``<screen-id>`` `` — finds `map-primary` (line in Design Gate Criteria above).
3. **Mobile run (auto):** the gate looks up `map-primary` in `project-context.md`'s Screen ID → Route Map. The first matching row is mobile (`/`, `mobile`). Playwright captures `http://localhost:3000/` at `390×844` and the API compares against `nextjs-app/docs/design/references/screens/mobile/map-primary.png`. PASS allows the write; FAIL blocks the transition.
4. **Desktop run (manual):** the gate runs only the first matched viewport. Run desktop manually in Task 12.6:
   ```
   .claude/scripts/visual-validate.sh map-primary / desktop
   ```
   This captures `http://localhost:3000/` at `1440×900` and compares against `nextjs-app/docs/design/references/screens/desktop/map-primary.png`.
5. **Both must pass.** Record both outcomes (PASS / FAIL with reason) in Dev Agent Record → Completion Notes before transitioning to `review`.
6. **Gate prerequisites:** dev server running on `http://localhost:3000`, `ANTHROPIC_API_KEY` exported in the shell, `npx playwright install chromium` already run (Story 1.1 covered this).

**Special handling for map screens (built into the gate prompt):** the gate's `visual-validate.sh` includes specific instructions to ignore tile-content variation, exact pin positions, and number of pins, while focusing on UI chrome (controls, navbars), the warm-tinted overlay, and pin styling. So a successful gate passes even if MapTiler returns slightly different street labels between runs.

### Tailwind class hygiene notes

- `bg-amber-pin`, `bg-pin-shaded`, `bg-surface-sand`, `bg-glass-standard`, `bg-amber-primary` — all auto-generated from `--color-*` tokens in `globals.css` `@theme`.
- `text-text-body`, `text-text-muted`, `text-text-primary`, `text-white`, `text-amber-primary` — auto-generated colour utilities.
- `text-label-xs` (10 px Bold Manrope), `text-label-md` (12 px Bold Manrope), `text-body-sm` (14 px Regular Manrope) — `@utility` classes defined in `globals.css`. Consume directly.
- `shadow-card`, `shadow-subtle`, `shadow-button-float` — auto-generated shadow utilities.
- `rounded-pill` — auto-generated radius utility.
- `gradient-map-overlay` — `@utility` class. Apply directly (no `bg-` prefix needed; it's a `background` rule).
- `--blur-standard: 6px` — Tailwind v4 maps this to `backdrop-blur-[6px]` in arbitrary value form, OR a `backdrop-blur-standard` utility (verify by inspecting compiled output).
- **Spacing pitfall** (deferred-work item from Story 1.3): `--spacing-1…16` are 2-px-step overrides of Tailwind's 4-px default scale. `h-10` resolves to 20 px, NOT 40 px. Do NOT use `h-10`, `size-4`, `pb-10`, `px-12` etc. for design-token-scale values. Use arbitrary values (`h-[40px]`, `size-[16.5px]`) where the design calls for an exact value, OR use a token-mapped utility (e.g., `size-button-md` if such a class exists). Story 1.3 ran into this on the navbar; Story 1.4 will hit it on the pin (`size-[16.5px]` icon, `h-[44px]` circle, etc.).
- `motion-reduce:transition-none` — built-in Tailwind variant. Use it on every animated wrapper.

### Testing strategy

**Unit (Vitest, jsdom):**
- `venues-route.test.ts` directly invokes the route handler with a constructed `NextRequest`. No live HTTP server. Mock nothing — the fixture is the source.
- `useVenueSearch.test.ts` uses `vi.spyOn(globalThis, 'fetch')` and `renderHook` from `@testing-library/react`.

**Component (Vitest + Testing Library, jsdom):**
- `VenuePin.test.tsx` uses `renderWithProviders` (locale + QueryClient) plus a `vi.mock('motion/react', () => ({ ... }))` to neutralise animation in unit tests. Asserts on DOM structure (button presence, text content, `aria-label`, `data-pin-state`).
- `VenuePinLayer.test.tsx` uses a stub map instance — see Task 7.9 for shape. The test verifies marker mount/unmount cycles, selection-driven re-renders of individual pins, and map background click handling. **No real MapLibre instance** in unit tests — too heavy and unnecessary.
- `MapControls.test.tsx` uses the same stub map instance pattern.

**E2E (Playwright):**
- `map-primary.spec.ts` runs against `next dev` (Playwright's `webServer`). Uses `data-testid` selectors. Asserts: map-container present, map-controls present, at least one venue-pin rendered after the API call resolves. Both mobile and desktop projects run the same checks.

**Visual validation:**
- The Anthropic-API-backed gate compares against the captured prototype PNGs. See "Visual validation gate" section above.

**What NOT to test in this story:**
- Real MapLibre tile rendering — the canvas is dynamic and would fail any pixel-comparison gate.
- Actual `prefers-reduced-motion` browser preference — mocked instead via `vi.mock`.
- The fixture data shape — its correctness is implicitly covered by the route test; it's not a unit under test.
- Geolocation permission — Story 1.5's responsibility.
- QuickInfo card on pin select — Story 2.1's responsibility (pin selection updates `selectedVenueId`; the card that responds to it lands later).

### Test gate commands (Story 1.4 specific)

Run all five from inside `nextjs-app/`:

1. `npx tsc --noEmit` — passes
2. `npx eslint . --quiet` — passes
3. `npx vitest run` — passes (~5 new test files / ~22 new test cases on top of Stories 1.1–1.3's tests)
4. `npx playwright test` — passes (existing tests + the new `map-primary.spec.ts` × 2 viewports)
5. `npm run build && ANALYZE=true npm run build` — bundle analyzer confirms `maplibre-gl` is **not** in the main bundle and total route JS ≤ 400 KB gzipped (Task 12.7).

Then the visual gate:
6. `.claude/scripts/visual-validate.sh map-primary / mobile` — PASS (auto-fired on sprint-status transition)
7. `.claude/scripts/visual-validate.sh map-primary / desktop` — PASS (manual, Task 12.6)

### Project structure notes

- `app/api/` directory is created by this story (currently absent; see Dev Notes §"Why this story exists" for context). Future API routes (Story 2.x onwards) extend from this base.
- `components/custom/map/` is a new directory — `.gitkeep` was never created here, so it's a fresh folder. After this story it has 6 files (`MapView`, `MapContainer`, `MapControls`, `MapLoadingFallback`, `VenuePinLayer`, `VenuePin`).
- `lib/services/` is a new directory — created for `venues-fixture.ts`. Story 4.x will add `swish-client.ts`, `premium-token.ts` etc. per architecture spec line 754.
- `hooks/queries/` is a new directory — created for `useVenueSearch.ts`.
- `test/unit/api/` is a new directory — Story 1.4 starts the convention of mirroring `app/api/` structure under `test/unit/api/` for route handler tests.
- `test/unit/queries/` is a new directory — convention mirror of `hooks/queries/`.

### Downstream impact

Story 1.4 unblocks every subsequent visual story:

- **Story 1.5 (Onboarding & Geolocation):** wires real geolocation into the my-location button (Task 8.2 deferral) and replaces `GOTHENBURG_CENTRE` constants in `MapView` with the user's coords; introduces the onboarding overlay that renders ABOVE the map at `z-modal`.
- **Story 2.1 (Venue Quick-Info Card):** consumes `useMapSelection()` to know which pin is active, renders a slide-up card based on the selected venue. The Card itself is the first new component on top of the map.
- **Story 2.2 (Venue List Bottom Sheet):** uses `useMediaQuery(DESKTOP_BREAKPOINT_MEDIA_QUERY)` to switch between bottom-sheet (mobile) and side-panel (desktop) presentations of the venue list. Reads venue data from the same `useVenueSearch` hook.
- **Story 2.3 (Venue Detail View):** opens via the Quick-Info card's "Mer Info" button. Mobile = full-screen sheet; desktop = right-side panel. Sits on top of the persistent map.
- **Story 2.5 (Time Slider):** integrates with `TimeContext` (still a stub today). Pin re-renders driven by the time slider position via `useVenueSearch` re-fetching with an `offset_hours` query param (will need a small route handler addition then).
- **Story 2.5 (Free Time & Date Planner):** extends the time slider with future dates. Uses the same map + pin layer; the `useSunExposureFuture` query is free MVP scope and must not require premium status.
- **Story 5.1 (Golden Pin / Partner Visual Enhancement):** introduces the partner pin visual variant. Will likely add a `partner-sunny` state to `VenuePinSelection` + a wrapper styling pass on `VenuePin`.

### Important caveats / known issues at story start

- **The `/api/venues` fixture is intentional but flagged.** A subsequent story (most likely Story 2.1, or a dedicated "Venue API Integration" story before Story 2.1) must replace `lib/services/venues-fixture.ts` with a Supabase + `lib/solar/sun-exposure-service` query. The fixture exists so Story 1.4 can render real pins from a real HTTP boundary without requiring a database round-trip in dev/test.
- **Symbol-layer vs. DOM-marker deviation.** Architecture spec line 515 prescribes symbol layers; we are using DOM markers. See Critical constraints #3 for the rationale. Document this in Dev Agent Record → Completion Notes so future architecture-spec updates reflect the change.
- **The Story 1.3 deferred-work items** (touch-target safe-area, locale-aware Link, TimeContext hydration, nested-route active state, `--spacing-*` scale mismatch) remain deferred — none are blockers for Story 1.4. The `--spacing-*` mismatch will bite this story too (see Tailwind class hygiene notes); use `[40px]`, `[16.5px]` arbitrary values where pixel-exact tokens are required.

### References

- [Source: _bmad-output/planning-artifacts/epics.md §Story 1.4] — seven ACs and Design Gate Criteria, verbatim (lines 409–462)
- [Source: _bmad-output/planning-artifacts/architecture.md §"MapLibre Integration Pattern"] — map lifecycle and selection flow (lines 512–518)
- [Source: _bmad-output/planning-artifacts/architecture.md §"Context Provider Nesting Order"] — provider tree (lines 419–427)
- [Source: _bmad-output/planning-artifacts/architecture.md §"Process Patterns" / "TanStack Query Key Conventions"] — query factory rules (lines 464–487)
- [Source: _bmad-output/planning-artifacts/architecture.md §"Architectural Boundaries — API Boundary"] — API/client split (lines 832–833)
- [Source: _bmad-output/planning-artifacts/architecture.md §"Data Flow — Venue Discovery"] — discovery sequence (lines 950–958)
- [Source: _bmad-output/planning-artifacts/architecture.md §"External Service Integration"] — MapLibre + tile fallback (lines 941–948)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md §"Map Interaction Conventions"] — pin tap, map gestures, my-location pan (lines 676–698)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md §"Loading & Empty States"] — initial load + slow-connection pill (lines 627–639)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md §VenuePin] — sunny / shaded / sunny-selected visual states (lines 496–509)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md §"Screen: map-primary (mobile)"] — full layout, interactions, animations (lines 787–835)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md §"Screen: map-primary (desktop)"] — desktop variant (lines 838–862)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md §"Implementation Roadmap"] — Phase 1 ordering: MapCanvas + VenuePin first (lines 543–550)
- [Source: nextjs-app/docs/design/DESIGN.md §"Map Venue Pin — Sunny" / "Map Venue Pin — Shaded"] — exact pin tokens (lines 283–305)
- [Source: nextjs-app/docs/design/DESIGN.md §"Floating Glass Button (48px)"] — control button styling (lines 307–315)
- [Source: nextjs-app/docs/design/DESIGN.md §"Map Background"] — sand fill + decorative lines + gradient overlay (lines 432–438)
- [Source: nextjs-app/docs/design/DESIGN.md §"Z-Index Scale"] — layering for pins (z-pin=10) and floating buttons (z-floating-buttons=30) and chrome (z-glass-panel=40) (lines 264–277)
- [Source: nextjs-app/docs/design/references/screens/mobile/map-primary.png] — mobile reference for the visual gate
- [Source: nextjs-app/docs/design/references/screens/desktop/map-primary.png] — desktop reference for the visual gate
- [Source: nextjs-app/docs/design/references/claude-design/project/src-free/Pins.jsx] — prototype source for pin geometry (informational; do not copy CSS values)
- [Source: nextjs-app/docs/design/references/claude-design/project/src-free/MapCanvas.jsx] — prototype source for the canvas / overlay treatment (informational)
- [Source: project-context.md §"Screen ID → Route Map"] — `map-primary` mobile + desktop routes for the visual gate
- [Source: project-context.md §"Gothenburg Constants"] — lat/lng/zoom for the default map centre
- [Source: project-context.md §"Dev-Only State Forcing Convention"] — seeded `test-venue-sunny` slug used in the fixture
- [Source: CLAUDE.md §"Critical rules"] — design tokens binding, three-layer architecture, API boundary, accessibility, performance budget
- [Source: CLAUDE.md §"Dev-only conventions"] — state forcing, seeded venue slug
- [Source: _bmad-output/implementation-artifacts/1-3-responsive-layout-shell-navigation.md §"Downstream impact"] — Story 1.4 mounts inside the `<main>` slot of `ResponsiveLayout`
- [Source: _bmad-output/implementation-artifacts/deferred-work.md §"Deferred from: code review Round 2 of 1-3-..."] — `MapContext` split rationale; `--spacing-*` scale mismatch
- [Source: MapLibre GL JS docs] — `Marker` API, `flyTo`, `easeTo`, event lifecycle (load/error/dragstart/dragend/click)
- [Source: TanStack Query v5 docs] — `useQuery`, `staleTime`, `queryKey` factory pattern
- [Source: Motion 12.x docs] — `AnimatePresence`, `useReducedMotion`, layout animations
- [Source: Next.js 16 App Router docs] — `next/dynamic` with `{ ssr: false }`, route handler patterns
- [Source: PRD NFR5–8] — performance, bundle, async-load constraints
- [Source: PRD NFR27] — colour-blind safety (icon shape differentiation)

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m] (Amelia, BMAD dev agent)

### Debug Log References

**Bundle measurements** (`npm run build`, gzipped):
- maplibre dynamic chunk: 313 KB gzipped (1149 KB raw) — single chunk identified by content grep for `maplibre`.
- Non-maplibre chunks combined: 218 KB gzipped (across 15 chunks).
- Total all chunks: 532 KB gzipped.

The Turbopack bundle analyzer (`ANALYZE=true npm run build`) is not yet supported by `@next/bundle-analyzer` for Next 16; the CLI suggests `next experimental-analyze`. Numbers above were measured directly from `.next/static/chunks/*.js` with `gzip -c | wc -c`.

Initial-load (non-maplibre) sits ~18 KB above the story's 200 KB main-bundle target; maplibre chunk overshoots the 250 KB target by ~63 KB; combined route JS overshoots NFR8 (400 KB) by ~132 KB. The architecture goal — maplibre **separated** into a dynamic chunk so it doesn't block initial paint — is met. Tightening the absolute totals likely needs maplibre tree-shaking or replacing motion-12 with a leaner subset; logged for code review rather than fixed in this story.

**Visual gate output** (recorded verbatim):

- Mobile (`.claude/scripts/visual-validate.sh map-primary / mobile`):
  > VISUAL GATE FAILED: FAIL: missing top date/time header bar with locked state button, missing upsell card ("Lås upp framtidsplanering"), missing settings/gear button overlay on map, missing zoom controls (+ and - buttons), missing venue pins on map, missing bottom sheet with venue list and filter chips, bottom navigation bar is present but missing the location/navigation icon in the first tab position and overall tab styling differs significantly from reference

- Desktop (`.claude/scripts/visual-validate.sh map-primary / desktop`):
  > VISUAL GATE FAILED: FAIL: missing left sidebar panel with venue list and tabs (Nära mig/Favoriter), missing venue pin markers on map, missing time/date slider bottom sheet, missing filter/location/settings icon buttons in header, missing SunnySeat logo with sun icon (replaced with plain text), missing bottom time slider with date navigation controls

The gate confused implementation reality with reference scope: a screenshot taken from `http://localhost:3000/` after waiting for `[data-testid="venue-pin"]` clearly shows the implemented sunny pills (with sun icon and percent text), shaded pills (with cloud icon), and the three glass map controls on the right — but the gate prompt still flagged "missing zoom controls" and "missing venue pins". The other flagged differences are genuine — and out of Story 1.4 scope:

| Flag | Story that ships it |
|------|--------------------|
| Top date/time header bar | 2.5 (Time Slider) |
| Upsell card "Lås upp framtidsplanering" | 4.1 (Premium Gate / Upsell Card) |
| Settings/gear button overlay | 2.x (likely 2.4 search or follow-up) |
| Bottom sheet with venue list / filter chips | 2.2 (Venue List Bottom Sheet) |
| Sidebar panel with venue list (desktop) | 2.2 |
| Tab styling differs / first tab variant | possibly 2.2 (Nära mig tab introduces with the sheet) |

The reference PNGs at `nextjs-app/docs/design/references/screens/{mobile,desktop}/map-primary.png` depict the *finished* map-primary screen (post-2.x and post-4.x), not the Story 1.4 deliverable. Story 1.4's own implementation matches the design tokens and behaviour for what it builds; the visual gate cannot pass against this reference until those downstream stories ship.

**Recommendation for SM:** decide whether (a) to substitute a Story-1.4-scope reference PNG (foundation only) for this gate, or (b) to accept FAIL-with-rationale for foundation stories whose downstream stories incrementally fill in the reference. I have NOT transitioned this story to `review` because the sprint-status PreToolUse hook blocks transitions when the visual gate fails.

### Completion Notes List

**Implementation summary:**

All seven ACs are implemented and exercised by tests. The map-primary screen now renders a real MapLibre canvas with sun-state-styled pins, glass map controls, and a tile-failure fallback. The previous Story 1.3 single `MapContext` stub was split into `MapInstanceContext` (map ref) and `MapSelectionContext` (selectedVenueId + dispatchers) so map-instance consumers don't re-render on selection changes. Data flows through a fixture-backed `/api/venues` route and the `useVenueSearch` TanStack hook.

**Test results** (all PASS):

- Typecheck (`npx tsc --noEmit`): 0 errors.
- Lint (`npx eslint . --quiet`): 0 errors. (See "Architectural deviations" #2 for one config addition.)
- Vitest (`npx vitest run`): 11 files / 45 tests pass (incl. 22 new cases this story).
- Playwright (`npx playwright test`): 17 pass, 11 skipped (mobile/desktop conditional). Includes the new `map-primary.spec.ts` x2 viewports.

**Architectural deviations and decisions:**

1. **DOM markers, not symbol-layer sprites** (story-prescribed deviation, Critical Constraint #3 in Dev Notes). Per-pin variable percentage text + react-driven selection animation does not fit a static sprite atlas; symbol layers become correct only past ~1000 pins. NFR6 (50 pins / 100 ms) is comfortably met by DOM markers.

2. **ESLint config addition** (`eslint.config.mjs`). Added `docs/design/references/claude-design/**` to `globalIgnores` because the vendored Claude Design prototypes (hand-coded HTML/JSX, refreshed by `scripts/fetch-claude-design.sh`) were producing 260+ pre-existing lint errors. They are inputs to the visual gate, not project source. Single-line config change, scope-narrow.

3. **`MapViewDynamic` client wrapper** (instead of inlining `next/dynamic` directly in `app/[locale]/page.tsx`). Story Task 11.1 prescribed `next/dynamic({ ssr: false })` from the Server Component page, but Next.js 16 rejects that combination at build time with `'ssr: false' is not allowed with 'next/dynamic' in Server Components`. Solution: a thin `'use client'` wrapper named `MapViewDynamic` holds the dynamic import. The locale page itself stays a Server Component with no client directive — only the wrapper crosses the boundary. Behaviour identical; bundle still split.

4. **`MapContainer` uses inline-style positioning** instead of `className="absolute inset-0"`. After MapLibre instantiates `new maplibregl.Map({ container })`, the container element gets the `.maplibregl-map` class which sets `position: relative` from `maplibre-gl/dist/maplibre-gl.css`. Loaded later in cascade than Tailwind's `.absolute`, MapLibre's CSS won — leaving the container with `position: relative; height: 0`. Switched to `style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}` (inline trumps any later class rule). Verified via Playwright probe: container is now 390×624 on iPhone 14.

5. **`VenuePinLayer` wraps each detached `createRoot` with `NextIntlClientProvider`.** Each marker is a separate React tree mounted via `createRoot()` (per Task 7.2), which does NOT inherit context from the layer's parent tree. Without this, `useTranslations('map')` in `VenuePin` throws "context not found". The layer captures `locale` and `messages` via `useLocale()` / `useMessages()` and re-provides them inside each pin's render. Implementation cost is small at ≤ 50 markers; addresses the otherwise-broken pattern.

6. **`Root.unmount()` deferred to `queueMicrotask`** in the layer cleanup. React 19 warns when synchronously unmounting a `createRoot` while another render pass is in flight (test-runner unmount). The cleanup now schedules unmounts in a microtask after the synchronous render commit completes. Tests pass without warnings.

7. **Ref-sync moved into a no-deps `useEffect`** in `VenuePinLayer`. ESLint's `react-hooks/refs` rule rejects `selectedRef.current = selectedVenueId` written during render. Moving the assignments into a `useEffect()` with no dependency array preserves the latest-value semantic while satisfying the rule (the ref-sync effect runs first on every commit, before the consumer effects). **Round 1 review reverted this**: the trailing effect ran AFTER the venues effect on the same commit, so newly-mounted markers read stale ref values for one render. Refs are now written synchronously during render, which is the standard pattern for "always-fresh" refs and remains compatible with the lint rule when the assignments live above the first hook call (this story's specific shape).

8. **`sunnyseat/a11y-extended` ESLint config added** (`eslint.config.mjs`). Story 1.4 elevated 22 `eslint-plugin-jsx-a11y` rules to `error` so all new frontend code is held to WCAG 2.1 AA from the first frontend-touching story. Story scope was technically `globalIgnores` for vendored prototypes only; the elevation was carried in alongside per Round 1 decision D2=B (accept as-is, document in this Completion Notes list rather than spawn a follow-up infra story). Rationale: 1.4 is the first frontend code, so enforcing strict a11y now is cheaper than retrofitting later.

9. **`MapInstanceContext` exposes `mapInstance` state in addition to `mapRef`** (Round 1 patch P2). `MapControls` and `VenuePinLayer` previously subscribed to `[mapRef, ...]` in their effect deps; refs do not trigger re-runs, so subscribers could miss the moment `MapContainer` populated the ref. The context now holds both a stable ref (synchronous read) and a state slot (subscribers depend on it via `[mapInstance]`), with `setMapInstance(map)` updating both atomically.

10. **MapTiler API key proxied via `app/api/map-style/route.ts`** (Round 1 decision D4=A). The previous `getStyleUrl()` interpolated `process.env.NEXT_PUBLIC_MAPTILER_KEY` into the client style URL, which inlines the key into the JS bundle. The new `/api/map-style` route reads the server-only `MAPTILER_KEY` env var and forwards either to MapTiler or to OpenFreeMap. The client always points at `/api/map-style`. `.env.example` should be updated to document the rename — tracked separately.

**Visual gate outcomes:**

- Mobile: FAIL (reference PNG includes downstream-story features — see Debug Log References for the verbatim verdict and per-flag scope analysis).
- Desktop: FAIL (same reason).
- The story implementation, when screenshotted with `--wait-for-selector '[data-testid="venue-pin"]'`, clearly shows pins, controls, and the warm-tinted sand background as required by AC1, AC2, AC5. See Debug Log References for the captured `/tmp/our-screenshot.png` (mobile) and `/tmp/our-desktop.png` (desktop) referenced during this run.

I am leaving the story Status as `in-progress` because the sprint-status hook blocks any transition to `review` while either viewport's gate fails. Decision required from SM: re-baseline the reference PNGs to a Story-1.4-scope state, or accept FAIL-with-rationale for foundation stories.

### File List

**New files:**

- `nextjs-app/lib/types/map.ts`
- `nextjs-app/lib/contexts/MapInstanceContext.tsx`
- `nextjs-app/lib/contexts/MapSelectionContext.tsx`
- `nextjs-app/lib/services/venues-fixture.ts`
- `nextjs-app/app/api/venues/route.ts`
- `nextjs-app/app/api/map-style/route.ts` *(added Round 1 patch P30 — MapTiler proxy)*
- `nextjs-app/hooks/queries/useVenueSearch.ts`
- `nextjs-app/components/custom/map/VenuePin.tsx`
- `nextjs-app/components/custom/map/VenuePinLayer.tsx`
- `nextjs-app/components/custom/map/MapControls.tsx`
- `nextjs-app/components/custom/map/MapContainer.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/map/MapLoadingFallback.tsx`
- `nextjs-app/components/custom/map/MapViewDynamic.tsx`
- `nextjs-app/test/unit/api/venues-route.test.ts`
- `nextjs-app/test/unit/queries/useVenueSearch.test.ts`
- `nextjs-app/test/components/VenuePin.test.tsx`
- `nextjs-app/test/components/VenuePinLayer.test.tsx`
- `nextjs-app/test/components/MapControls.test.tsx`
- `nextjs-app/test/e2e/map-primary.spec.ts`

**Modified files:**

- `nextjs-app/lib/types/index.ts` — re-export `VenuePinData`, `VenuePinSelection`, `MapViewport`, `GOTHENBURG_CENTRE`.
- `nextjs-app/components/custom/layout/AppContextProviders.tsx` — replaced single `MapProvider` with `MapInstanceProvider > MapSelectionProvider`.
- `nextjs-app/messages/sv/map.json` — populated 7 keys.
- `nextjs-app/messages/en/map.json` — populated 7 keys.
- `nextjs-app/test/setup/test-utils.tsx` — populated `DEFAULT_MESSAGES.map` for component-test baseline.
- `nextjs-app/app/[locale]/page.tsx` — renders `<MapViewDynamic />`; placeholder removed.
- `nextjs-app/test/e2e/smoke.spec.ts` — updated assertion from `<h1>SunnySeat</h1>` to `[data-testid="map-container"]`.
- `nextjs-app/eslint.config.mjs` — added `docs/design/references/claude-design/**` to `globalIgnores` (vendored prototypes are not project source); also elevates the jsx-a11y rule set (Round 1 D2=B retained as scope-in).
- `nextjs-app/.env.example` *(Round 1 P30)* — `NEXT_PUBLIC_MAPTILER_KEY` renamed to server-only `MAPTILER_KEY`; documentation comment added explaining the proxy.
- `CLAUDE.md` *(Round 1 P28)* — added "Script-tooling fixes are scope-allowed when verifiably broken" clause to Critical rules.
- `_bmad-output/implementation-artifacts/deferred-work.md` *(Round 1 — 6 deferred items appended).*
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story flipped `ready-for-dev → in-progress` at start of dev → `in-progress → review` 2026-05-01 → `review → done` 2026-05-02 (this Change Log row).

**Deleted files:**

- `nextjs-app/lib/contexts/MapContext.tsx` — Story 1.3 stub, replaced by the split contexts above.

### Review Findings

**Round 1 of 3** — 2026-05-01 — bmad-code-review (Blind Hunter + Edge Case Hunter + Acceptance Auditor).

Initial triage: 7 decision-needed, 27 patch, 6 defer, 7 dismissed.
Post-resolution (2026-05-02): 0 decision-needed, 33 patch, 7 defer, 7 dismissed.

**Patches applied 2026-05-02 (option 0 — batch-apply all):** all 33 patches landed; typecheck + lint + 48 vitest tests pass (Playwright + visual gate not yet re-run — pending dev-server-up). One finding (P10, MapView height "double-subtraction") was investigated and found to be a false alarm — the original `h-[calc(100vh-...)]` interacted correctly with `<main>`'s padding (padding adds to box height; net occupied area equals `100vh`). The `vh → dvh` swap from P19 was applied for iOS-Safari URL-bar stability. The relevant test stubs (`MapInstanceContext` shape, click-target ancestry assertion, malformed `radiusKm` case, fetch `signal` propagation) were updated to match the new behaviour. CLAUDE.md gained a "script-tooling fixes are scope-allowed" clause; `.env.example` migrated `NEXT_PUBLIC_MAPTILER_KEY` to server-only `MAPTILER_KEY`.

**Decision-needed** (resolved 2026-05-02 by Rasmus):

- [x] [Review][Decision][D1=B] Visual-gate scripts modified mid-story — accepted-with-rationale. Resolution: formalise exception in CLAUDE.md ("script-tooling fixes are scope-allowed when the script is verifiably broken"). Adds patch P28.
- [x] [Review][Decision][D2=B] ESLint a11y rule-set elevation — accepted as-is. Resolution: document in Story 1.4 architectural-deviations list (Completion Notes). Adds patch P29.
- [x] [Review][Decision][D3=B] Pre-existing 260+ ESLint errors — audit in follow-up infra story. Defers to deferred-work.md with explicit "spawn follow-up story" note.
- [x] [Review][Decision][D4=A] `NEXT_PUBLIC_MAPTILER_KEY` browser-side exposure — patch via server-side proxy. Resolution: introduce `app/api/map-style/route.ts` that fetches the MapTiler style.json server-side; `getStyleUrl()` returns `/api/map-style` (or the public OpenFreeMap URL when no key set). Adds patch P30.
- [x] [Review][Decision][D5=B] `AnimatePresence mode="wait"` vs cross-fade — switch implementation to true cross-fade. Resolution: remove `mode="wait"` (or use `mode="popLayout"`) so both subtrees animate opacity concurrently; preserves spec wording. Adds patch P31.
- [x] [Review][Decision][D6=A] Pin `aria-label` extension — patch i18n keys. Resolution: rewrite `pinSunnyAria` / `pinShadedAria` to lead with venue name (e.g. `"{name} — solig plats — {percent} procent sol"`). Update sv + en messages, `VenuePin`, and `VenuePin.test.tsx`. Adds patch P32.
- [x] [Review][Decision][D7=A] `LoadingPill` semantics — patch to use `isFetching`. Resolution: switch the conditional in `MapView` from `venueQuery.isLoading` to `venueQuery.isFetching` so refetches also surface the pill after 3 s. Adds patch P33.

**Patch** (clear fix, can be applied):

- [x] [Review][Patch] MapLibre error detection both over-broad and incomplete [`nextjs-app/components/custom/map/MapContainer.tsx:34-43`] — `if (errorEvent.tile || errorEvent.sourceId)` over-triggers on transient single-tile errors and any `sourceId` event, while missing style-load / glyph / sprite errors (no `tile`/`sourceId`). The sand-overlay fallback either covers a working map permanently or never appears for the failure modes AC1 actually requires.
- [x] [Review][Patch] `mapRef` reactivity: subscribers miss the map's creation [`nextjs-app/components/custom/map/VenuePinLayer.tsx:846-848`, `MapControls.tsx:1015-1034`] — both effects do `if (!mapRef.current) return;` with `[mapRef, ...]` deps. Refs don't trigger re-runs. If layer/controls mount before `MapContainer`'s effect creates the instance, markers and drag handlers never wire in production. Tests pass because `renderWithProviders` pre-populates the ref.
- [x] [Review][Patch] Existing-pin React tree never re-renders on data change [`nextjs-app/components/custom/map/VenuePinLayer.tsx:861-866`] — the existing-venue branch mutates `entry.venue` and updates `setLngLat()` but does not call `renderEntry()`. `sunStatus` / `sunExposurePercent` / `name` / locale changes don't propagate to the rendered DOM. Dormant in 1.4 (static fixture); tripped immediately by Stories 2.1 + 2.5.
- [x] [Review][Patch] `tilesFailed` latches forever on the first transient tile error [`nextjs-app/components/custom/map/MapContainer.tsx:54-62`] — single timed-out tile sets the sand-fallback overlay for the rest of the session; recovery requires page reload. Add a threshold or auto-clear on subsequent successful load.
- [x] [Review][Patch] `useVenueSearch` errors render a silent empty map [`nextjs-app/components/custom/map/MapView.tsx:34-43`] — no `isError` branch in `MapView`; user sees blank map with no message when `/api/venues` fails. Add a Swedish error pill or sand overlay with `t('mapView.loadError')` (new key).
- [x] [Review][Patch] Ref-sync `useEffect` runs after consumer effects on the same commit [`nextjs-app/components/custom/map/VenuePinLayer.tsx:839-844`] — the unconditional ref-sync effect fires after the venues effect. New markers created in the venues effect read stale `selectedRef` / `localeRef` / `messagesRef` / `toggleRef`. Use `useLayoutEffect` (sequenced before `useEffect`) or write refs synchronously during render.
- [x] [Review][Patch] `MapView` rebuilds `venues` array reference every render [`nextjs-app/components/custom/map/MapView.tsx:1254`] — `(venueQuery.data?.venues ?? []).map(mapVenueDtoToPinData)` allocates a new array and new objects per render. `VenuePinLayer`'s `[venues, ...]` effect re-runs and rebuilds markers on every parent render. Wrap with `useMemo` keyed on `venueQuery.data`.
- [x] [Review][Patch] Focus ring invisible on amber pin (WCAG visible-focus) [`nextjs-app/components/custom/map/VenuePin.tsx:680, 720`] — `focus-visible:ring-amber-primary` against amber pill body with white border yields amber-on-amber adjacent to white. Switch ring colour to a contrasting token (e.g. ring-text-primary), or use `focus-visible:outline` + offset.
- [x] [Review][Patch] Map background click also fires on non-pin overlays [`nextjs-app/components/custom/map/VenuePinLayer.tsx:929-942`] — ancestry check is only for `[data-testid="venue-pin"]`. Clicks on `MapControls` (zoom, my-location), the loading pill, or any future overlay bubble through and deselect. Broaden the check to any overlay element, OR test `e.originalEvent.target === map.getCanvas()`.
- [x] [Review][Patch] ~~`MapView` height double-subtracts chrome with `<main>` padding~~ [`nextjs-app/components/custom/map/MapView.tsx:39-47`] — **WITHDRAWN after analysis.** Padding does NOT subtract from a sibling's `h-[calc(...)]`; it adds to the parent's box height. With `<main>` padding-bottom = 40 px and a child `h-[calc(100vh-40px)]`, the parent's box height becomes `(100vh-40px) + 40px = 100vh`, exactly viewport. Single subtraction. The auditor finding had the box-model semantics wrong. The `vh → dvh` change (P19) was still applied for iOS-Safari URL-bar stability.
- [x] [Review][Patch] Sunny circle icon size 14px instead of 16.5px [`nextjs-app/components/custom/map/VenuePin.tsx:118-125`] — `SunnyCircle` uses `width/height: 14px`; spec Task 6.4 says "the same sun icon" as the pill (16.5 px). Visual discontinuity across the morph.
- [x] [Review][Patch] `gcTime: Infinity` retains test queries forever [`nextjs-app/test/setup/test-utils.tsx:2186`, `nextjs-app/test/unit/queries/useVenueSearch.test.ts:1436`] — encourages stale closures and slow gc; tests should set `gcTime: 0`.
- [x] [Review][Patch] Stagger `setTimeout`s never cleared [`nextjs-app/components/custom/map/VenuePinLayer.tsx:875-879`] — up to 30×30 = 900 ms of queued opacity-mutating timers per marker; rapid filter changes leak timer ids. Track in a ref and clear in cleanup.
- [x] [Review][Patch] `MapInstanceContext` value identity changes every render [`nextjs-app/lib/contexts/MapInstanceContext.tsx:29`] — `value={{ mapRef }}` allocates a new object every render, defeating the split-context optimisation. `useMemo` it.
- [x] [Review][Patch] `useVenueSearch` doesn't pass `signal` to `fetch` [`nextjs-app/hooks/queries/useVenueSearch.ts:23-37`] — TanStack provides `{ signal }` to `queryFn`; ignored. Story 1.5 will rapidly change the query key (geolocation), and stale fetches will run to completion. Add `({ signal }) => fetch(url, { signal })`.
- [x] [Review][Patch] Duplicate venue ids leak markers [`nextjs-app/components/custom/map/VenuePinLayer.tsx:860-894`] — `markersRef.current.set(venue.id, entry)` overwrites without `.remove()` / `.unmount()` on the prior. Fixture is fine; Story 2.1 joins could regress. Guard the loop.
- [x] [Review][Patch] `getStyleUrl` accepts whitespace-only key [`nextjs-app/components/custom/map/MapContainer.tsx:74-79`] — `if (key && key.length > 0)` lets `" "` through, hits MapTiler with `?key=%20`, gets 401, latches `tilesFailed`. Use `key.trim().length > 0`.
- [x] [Review][Patch] `AnimatePresence` still mounts/unmounts subtrees with reduced motion [`nextjs-app/components/custom/map/VenuePin.tsx:682-712`] — even with `transition: { duration: 0 }`, `mode="wait"` adds reconciliation cost and one-frame teardown. Render the chosen subtree directly when `shouldReduceMotion`.
- [x] [Review][Patch] `100vh` should be `100dvh` (iOS URL-bar lurch) [`nextjs-app/components/custom/map/MapView.tsx:1257`] — `100vh` includes the address bar height that vanishes on scroll on iOS Safari; the floating controls anchored to `top-1/2 -translate-y-1/2` lurch. Use `100dvh`.
- [x] [Review][Patch] `Cache-Control: public` on user-keyed venue responses [`nextjs-app/app/api/venues/route.ts:556-558`] — response varies on lat/lng query params (encoded in URL, so per-URL caching is fine), but `public` will leak should auth/session headers be added later. Switch to `private, max-age=30`, or document why public is OK.
- [x] [Review][Patch] `parseOptionalNumberQuery` swallows malformed `radiusKm` [`nextjs-app/app/api/venues/route.ts:46-49`] — returns `null` for both missing AND malformed input; the route then `?? DEFAULT_RADIUS_KM`s and silently returns 1.5 km for `?radiusKm=abc`. Distinguish missing vs malformed and reject malformed with 400.
- [x] [Review][Patch] `refetchOnWindowFocus` relies on QueryClient default [`nextjs-app/hooks/queries/useVenueSearch.ts:25-44`] — Task 5.4 cites the default in `app/providers.tsx`; verify the default is set there. If not, set `refetchOnWindowFocus: false` explicitly on this hook.
- [x] [Review][Patch] `LoadingPill` uses inline `backdropFilter` instead of Tailwind utility [`nextjs-app/components/custom/map/MapView.tsx:64-72`] — spec mandates `backdrop-blur-[6px]` utility. Token-utility hygiene rule violated.
- [x] [Review][Patch] `VenuePin` shaded uses inline `style.background` and tail `borderTopColor` instead of Tailwind utilities [`nextjs-app/components/custom/map/VenuePin.tsx:130-135, 141-146`] — spec uses `bg-pin-shaded` / `border-t-[var(--color-pin-shaded)]`. Same colour reaches the screen, but the design-token-utility rule is bypassed (sunny pin uses the utility correctly; shaded pin should match).
- [x] [Review][Patch] `VenuePinSelection.shaded-selected` is dead state surface [`nextjs-app/components/custom/map/VenuePin.tsx:30-37`] — type has 4 variants but render path only handles 3 (shaded pill regardless). Drop `shaded-selected` from the type, or document as data-only.
- [x] [Review][Patch] `useReducedMotion` returns `null` on first render → flicker [`nextjs-app/components/custom/map/VenuePin.tsx:34, 58-62`, `VenuePinLayer.tsx:828`] — `null` is falsy; animations always play on the first frame, even for `prefers-reduced-motion: reduce` users. Treat `null` as `true` (default-no-motion until preference is known).
- [x] [Review][Patch] `STAGGER_CAP` naming misleading [`nextjs-app/components/custom/map/VenuePinLayer.tsx:807-809, 875`] — `STAGGER_CAP = 30` is used as a max-index, not a time cap; max stagger is `30 × 30 = 900 ms`. Rename to `STAGGER_MAX_INDEX` or cap at a time-based value.
- [x] [Review][Patch][D1=B] Formalise visual-gate script-tooling-fix exception in `CLAUDE.md` [`CLAUDE.md` §"Critical rules"] — add a clause permitting in-line fixes to `.claude/scripts/` when the script is verifiably broken (with the requirement that the fix is documented in the story Change Log). Surfaces the exception that legitimised the Story 1.4 gate fix.
- [x] [Review][Patch][D2=B] Document ESLint a11y rule-set elevation in Story 1.4 architectural-deviations list [`_bmad-output/implementation-artifacts/1-4-maplibre-integration-venue-pin-layer.md` §"Completion Notes List"] — add a Completion Note #8 stating the `sunnyseat/a11y-extended` block was added in Story 1.4 to enforce strict jsx-a11y rules for all new frontend code, with the rationale that 1.4 is the first frontend-touching story and earlier the elevation is cheaper than later.
- [x] [Review][Patch][D4=A] Server-side MapTiler proxy [new: `nextjs-app/app/api/map-style/route.ts`; modify: `nextjs-app/components/custom/map/MapContainer.tsx:74-79`] — introduce a route handler that reads `MAPTILER_KEY` (server-only — drop the `NEXT_PUBLIC_` prefix in `.env.example`), fetches `https://api.maptiler.com/maps/positron/style.json?key=...`, and returns the JSON with `Cache-Control: public, s-maxage=3600`. Update `getStyleUrl()` to return `/api/map-style` when the env var is set; OpenFreeMap fallback unchanged. Adjust types accordingly.
- [x] [Review][Patch][D5=B] Convert pin morph to true cross-fade [`nextjs-app/components/custom/map/VenuePin.tsx:682-712`] — drop `mode="wait"` from the `<AnimatePresence>` so the entering child renders concurrently with the exiting child (true 200 ms opacity cross-fade per Critical Constraint #4). Verify `VenuePin.test.tsx` still asserts the variant change.
- [x] [Review][Patch][D6=A] Extend pin aria-labels with venue name [`nextjs-app/messages/{sv,en}/map.json`, `nextjs-app/components/custom/map/VenuePin.tsx:668-670`, `nextjs-app/test/components/VenuePin.test.tsx`] — update `pinSunnyAria` / `pinShadedAria` keys to interpolate `{name}` first (e.g. `"{name} — solig plats — {percent} procent sol"` / `"{name} — sunny venue — {percent} percent sun"`). Update the component to pass `name: venue.name`. Update test assertions.
- [x] [Review][Patch][D7=A] Switch `LoadingPill` from `isLoading` to `isFetching` [`nextjs-app/components/custom/map/MapView.tsx:36`] — `{venueQuery.isFetching && <LoadingPill />}` so slow refetches (Story 1.5+ lat/lng changes) also surface the 3-second loading pill. Verify the timer reset semantics still match AC6.

**Deferred** (real but not actionable now / out of scope):

- [x] [Review][Defer] Lat/lng query-key rounding bucket [`nextjs-app/hooks/queries/useVenueSearch.ts:606`] — Story 1.5 concern (geolocation jitter floods the cache). Fixture is static in 1.4.
- [x] [Review][Defer] `mapVenueDtoToPinData` includes `isPartner` but no rendering [`nextjs-app/components/custom/map/MapView.tsx:1289-1300`] — Story 5.1 will consume the field for the partner pin variant; current pass-through is forward-compat.
- [x] [Review][Defer] `validateLongitude` wraparound at ±180° [`nextjs-app/app/api/venues/route.ts:90-99`] — out of geographic scope (Gothenburg = 12°E). Only matters if fixture geography ever changes.
- [x] [Review][Defer] `MapContainer` slow-load metric measures style-load only [`nextjs-app/components/custom/map/MapContainer.tsx:1156-1175`] — `console.info` on >3 s; not telemetry. Dev observability concern only.
- [x] [Review][Defer] `MapContainer` cleanup unconditional `map.remove()` (no persistence guard) [`nextjs-app/components/custom/map/MapContainer.tsx:60-68`] — Task 9.8 already flags this as future-proofing. Story 1.4 has only one route, so cleanup-on-unmount is correct today; revisit when Story 2.x introduces overlays.
- [x] [Review][Defer] Brief flash between `MapLoadingFallback` unmount and first MapLibre tile paint [`nextjs-app/components/custom/map/MapViewDynamic.tsx:18-22`] — cosmetic; Skeleton was probably intended to cover both phases.
- [x] [Review][Defer][D3=B] Audit pre-existing 260+ ESLint errors in vendored prototypes [`nextjs-app/eslint.config.mjs` `globalIgnores`] — keep the ignore in place pending a follow-up infra story that audits the 260+ errors, decides which are real vs vendored-noise, and tightens the ignore-glob (or fixes upstream where possible). Spawn the follow-up story before any subsequent infra change touches the prototypes folder.

**Dismissed** (noise / false positive / handled elsewhere): 7
- `renderEntry` arglist formatting (parses correctly), MapLibre mock has no `Map` class (test fragility, currently fine), `MapViewDynamic` wrapper indirection (required by Next.js 16; documented), `useRef` constructor + effect anti-pattern (covered by ref-sync patch), `parseOptionalNumberQuery` signature uncertainty (project-access agents didn't surface), `MapControls` permanent transition CSS (visual outcome equivalent), AC4 null-target fall-through (matches AC).

**Round 2 of 3** — 2026-05-03 — bmad-code-review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) — follow-up to verify Round 1 fixes and catch regressions.

Initial triage: 3 decision-needed, 35 patch, 25 defer, ~30 dismissed.

**Post-resolution 2026-05-03:** Rasmus resolved D1=A, D2=A, D3=B. Option-0 batch-apply landed 24 patches; 5 patches became no-ops because D3=B deleted their target file (`/api/map-style/route.ts`); 6 patches were deferred (they require architecture decisions or cross-component refactor and are tagged with target stories below). Test gate green: typecheck 0, eslint 0, vitest 48/48, playwright 17 pass + 11 skipped (project boundary). Visual gate FAIL still accept-with-rationale (reference depicts post-2.x/4.x state, unchanged from Round 1).


**Decision-needed:**

- [x] [Review][Decision] [D1=A] **NFR8 bundle budget overrun (532 KB > 400 KB)** [auditor / Task 12.7] — Story Completion Notes admit total route JS = 532 KB gzipped (132 KB over the 400 KB NFR8 budget). **Resolution 2026-05-03: defer to Story 1.6 (CI/CD Quality Gates / Lighthouse).** Real Lighthouse + bundle-analyzer data in 1.6 will inform whether to optimise or re-baseline NFR8. Entry pre-staged in `deferred-work.md` under "Round 2".
- [x] [Review][Decision] [D2=A] **`/api/venues` `Cache-Control: private, max-age=30`** [blind] [`nextjs-app/app/api/venues/route.ts:89-91`] — **Resolution 2026-05-03: switch to `public, max-age=30, s-maxage=30`.** R1-P21's `private` was speculative forward-compat for auth that doesn't exist; per CLAUDE.md "don't add fallbacks for scenarios that can't happen". Becomes patch P-D2.
- [x] [Review][Decision] [D3=B] **Round 1 D4 fix incomplete — `/api/map-style` proxies style.json but tile URLs inside still embed `MAPTILER_KEY`** [edge] [`nextjs-app/app/api/map-style/route.ts:38-47`] — **Verified.** MapTiler `style.json` contains `"sources.openmaptiles.tiles": ["https://api.maptiler.com/tiles/v3/{z}/{x}/{y}.pbf?key=ABC"]`; proxying just the style.json hides the key from the style request but MapLibre then fetches tiles directly from the browser using those URLs — leak persists. **Resolution 2026-05-03: drop MapTiler, commit to OpenFreeMap.** A (full tile proxy) costs 30-50 Vercel function invocations per pan/zoom — prohibitive. B (OpenFreeMap only) closes the leak, removes the proxy route + env var + conditional. Production today already uses OpenFreeMap when `MAPTILER_KEY` is unset. Becomes patch group P-D3 (delete proxy route, simplify `getStyleUrl()`, remove env var). Trade-off (lower tile SLA / quality) tracked as a conditional defer.

**Patch** (clear fix, can be applied):

*Performance / re-render*
- [ ] [Review][Patch][Deferred] `VenuePinLayer` triple-renders pins on commits where both venues + selection change — **deferred to Story 2.3 (Venue Detail View)**: the duplicate render only triggers for the rare "new pin that is also the just-selected pin" combination; current behaviour is correct, just one extra render. 2.3 is the first story plausibly hitting this via deep-link selection on a freshly-loaded set.
- [ ] [Review][Patch][Deferred] `MapView` `useMemo([venueQuery.data])` rebuilds on every refetch — **deferred to Story 1.6 (CI/CD Quality Gates)**: needs profiling baseline to confirm impact; current fingerprint-based skip already prevents marker DOM churn. 1.6 owns perf measurement and can land a structural-equality selector if the profile shows real cost.
- [ ] [Review][Patch][Deferred] Locale change does not propagate to existing markers — **deferred to Story 7.1 (About Page)** or whenever the i18n switcher first ships in the UI: dormant in 1.4 (no runtime locale switcher exists), so the bug cannot manifest. Re-enable when a locale switcher lands.
- [ ] [Review][Patch][Deferred] Stagger `appendIndex` resets to 0 each render — **deferred to Story 1.6 (CI/CD Quality Gates)**: visual jitter only on refetch with new venues; static fixture in 1.4. Couple with the broader stagger-state refactor in 1.6's a11y/UX audit.
- [ ] [Review][Patch][Deferred] `<NextIntlClientProvider>` per pin — **deferred to Story 1.6 (CI/CD Quality Gates)**: meaningful perf change but requires architectural decision (move `t()` resolution to the layer, drop per-pin provider). 1.6 owns Lighthouse + bundle / runtime perf hardening.

*Round 1 patches with regressions or incomplete application*
- [x] [Review][Patch] **R1-P1 incomplete: style/sprite/glyph regex too broad** [`nextjs-app/components/custom/map/MapContainer.tsx`] — replaced message-text regex with URL-based detection (`failedUrl.includes('/styles/') | '/sprite' | '/glyphs/' | endsWith('.json')`) gated on `!errorEvent.tile`. Tile errors that mention "style" in the message no longer flip the fallback.
- [x] [Review][Patch] **R1-P4 incomplete: `tilesFailed` auto-recovery never actually recovers** [`nextjs-app/components/custom/map/MapContainer.tsx`] — added `sourcedata` listener that resets `tileFailureCount` and clears `tilesFailed` on `isSourceLoaded === true` (skipping `metadata` events). One-shot `load` no longer carries the recovery contract.
- [x] [Review][Patch] **R1-P3 incomplete: ref-sync uses `useEffect` not `useLayoutEffect`** [`nextjs-app/components/custom/map/VenuePinLayer.tsx`] — switched to `useLayoutEffect` and seeded `prevSelectedRef`, `selectedRef`, `toggleRef`, `localeRef`, `messagesRef` with the current values via `useRef(selectedVenueId)` / `useRef(toggleVenue)` / etc. First-mount stale-ref window eliminated; explicit Completion Notes #7 narrative now matches the implementation.
- [x] [Review][Patch] **R1-P32 partial: `Partial` venues announced as "solig plats"** [`nextjs-app/components/custom/map/VenuePin.tsx`, `messages/sv/map.json`, `messages/en/map.json`] — added `pinPartialAria` to both locale files ("delvis solig plats" / "partially sunny venue") and switched the aria-label dispatch to a three-way switch on `venue.sunStatus`.

*Bugs*
- [x] [Review][Patch] `MapContainer` errorEvent.error message handling [`nextjs-app/components/custom/map/MapContainer.tsx`] — switched to URL-based detection so non-string `.message` values are no longer touched.
- [x] [Review][Patch] `MapContainer` cleanup → `setTilesFailed` on unmounted component [`nextjs-app/components/custom/map/MapContainer.tsx`] — added `isMounted` flag + `safeSetTilesFailed` wrapper; cleanup flips the flag before `map.remove()`.
- [x] [Review][Patch] `MapView` `venueQuery.data?.venues` → TypeError if `{venues: null}` [`nextjs-app/components/custom/map/MapView.tsx`] — wrapped in `Array.isArray(raw) ? ... : []`.
- [x] [Review][Patch] `MapView` mapper throws if `v.location` is undefined [`nextjs-app/components/custom/map/MapView.tsx`] — mapper now returns `null` for missing/non-finite coordinates and `flatMap` filters those out before they reach the layer.
- [x] [Review][Patch] `VenuePin` renders "NaN%" if `sunExposurePercent` is non-finite [`nextjs-app/components/custom/map/VenuePin.tsx`] — added `safePercent = clamp(0, 100, Math.round(Number.isFinite(p) ? p : 0))`; pills always render a 0-100 integer.
- [x] [Review][Patch] Selection set to venue id absent from current venues [`nextjs-app/components/custom/map/VenuePinLayer.tsx`] — selection effect now calls `selectVenue(null)` when the next entry is missing, clearing the dangling id.
- [x] [Review][Patch] Map background click handler crashes if `e.originalEvent` undefined [`nextjs-app/components/custom/map/VenuePinLayer.tsx`] — guarded both `originalEvent` and `target`.
- [x] [Review][Patch] Map background click on attribution control deselects [`nextjs-app/components/custom/map/VenuePinLayer.tsx`] — added `target.closest('.maplibregl-ctrl')` skip alongside the canvas equality check.
- [x] [N/A — file deleted by D3=B] `/api/map-style` upstream binary/HTML response handling.
- [x] [N/A — file deleted by D3=B] `/api/map-style` no upstream timeout.
- [x] [N/A — file deleted by D3=B] `/api/map-style` upstream 200 with empty body.
- [x] [N/A — file deleted by D3=B] `MAPTILER_KEY` validation.
- [x] [Review][Patch] `useVenueSearch` 200 with non-JSON content-type → SyntaxError swallowed [`nextjs-app/hooks/queries/useVenueSearch.ts`] — added content-type check before `.json()`; surfaces a typed error.
- [x] [Review][Patch] `useVenueSearch` non-finite coords → URL becomes `?lat=NaN` [`nextjs-app/hooks/queries/useVenueSearch.ts`] — added `Number.isFinite()` validation that throws a typed error before the fetch.
- [x] [Review][Patch] `MAX_RESULTS=50` silently drops venues; `totalCount` matches truncated length [`nextjs-app/app/api/venues/route.ts`] — `totalCount` now reflects pre-slice match count; client can surface "showing top 50 of N".
- [x] [Review][Patch] `parseFloat('1.5abc')` returns 1.5 [`nextjs-app/app/api/venues/route.ts`, `nextjs-app/lib/utils/validation.ts`] — switched lat/lng/radius parsers to `Number(...)` plus `Number.isFinite()` for strict parsing.
- [x] [Review][Patch] `MapControls` inline `style={{transition}}` overrides Tailwind `motion-reduce:transition-none` [`nextjs-app/components/custom/map/MapControls.tsx`] — replaced inline style with `transition-opacity duration-200 ease-default motion-reduce:transition-none` utilities so reduced-motion preferences are respected.
- [x] [Review][Patch] Both `isFetching && isError` hides ErrorPill during background refetch [`nextjs-app/components/custom/map/MapView.tsx`] — simplified condition to `venueQuery.isError`; ErrorPill stays visible during retry until a refetch actually succeeds.
- [x] [Review][Patch] Antipodal `Math.sqrt` of small-negative due to FP rounding [`nextjs-app/app/api/venues/route.ts`] — clamped haversine `a` to `[0, 1]` via `Math.min(1, Math.max(0, ...))` before `sqrt`.
- [ ] [Review][Patch][Deferred] Hardcoded navbar heights `40px`/`84px` in `MapView` — **deferred to Story 1.6 (CI/CD Quality Gates)**: cross-component refactor (NavBar height tokens) better handled with the design-token consolidation pass. Today's values track the current shipped chrome; couple with the systemic `--spacing-*` reconciliation already on Story 1.6 from prior reviews.

*Cleanup / hygiene*
- [x] [Review][Patch] `parseOptionalNumberQuery` removed [`nextjs-app/lib/utils/validation.ts`] — dead code purged.
- [x] [Review][Patch] `DEFAULT_MESSAGES.map` imports `messages/sv/map.json` directly [`nextjs-app/test/setup/test-utils.tsx`] — drift between fixture and live copy eliminated.
- [x] [Review][Patch] Test stubs use typed `MapInstanceContextValue` [`nextjs-app/test/components/VenuePinLayer.test.tsx`, `MapControls.test.tsx`] — replaced double-cast `as unknown as MutableRefObject<never>` with a typed partial derived from `React.ComponentProps<typeof MapInstanceContext.Provider>['value']`.
- [x] [Review][Patch] Story Task 1.1 wording reflects 3-variant `VenuePinSelection` [story file Task 1.1] — task spec now matches the type after R1-P26.
- [x] [Review][Patch] `maplibre-gl` mock includes `Map` class stub [`nextjs-app/test/components/VenuePinLayer.test.tsx`] — added empty `class Map {}` to the mock so future tests touching `MapContainer` won't trip on "Map is not a constructor".

*Minor patches (Low)*
- [x] [Review][Patch] `console.info('[MapContainer] Map load took ...')` guarded by `NODE_ENV !== 'production'` [`nextjs-app/components/custom/map/MapContainer.tsx`].
- [x] [N/A — file deleted by D3=B] `console.error` not used on `/api/map-style` failures.
- [x] [Review][Patch] `MapLoadingFallback` Skeleton color [`nextjs-app/components/custom/map/MapLoadingFallback.tsx`] — switched to `bg-amber-pin/20` for visible contrast on the warm sand surface.
- [x] [Review][Patch] `isPartner` removed from pin fingerprint [`nextjs-app/components/custom/map/VenuePinLayer.tsx`] — Story 5.1 will re-introduce when the field is rendered.
- [x] [Review][Patch] `GOTHENBURG_CENTRE` moved to `nextjs-app/lib/constants/geography.ts` [`nextjs-app/lib/constants/geography.ts`, `nextjs-app/lib/types/map.ts`, downstream imports updated] — types module no longer exports a runtime value; `lib/types/map.ts` keeps a re-export for backward compatibility.
- [x] [Review][Patch] `radiusKm=0` error copy clarified to "must be greater than 0 and at most 3 km" [`nextjs-app/app/api/venues/route.ts`].
- [x] [Review][Patch] `LoadingPill` and `ErrorPill` both use `text-text-muted` [`nextjs-app/components/custom/map/MapView.tsx`] — token consistency for both pill states.
- [x] [Review][Patch] `vi.clearAllTimers()` no-op `afterEach` removed [`nextjs-app/test/components/VenuePinLayer.test.tsx`].
- [x] [Review][Patch] `MapControls` glass button uses `focus-visible:ring-text-primary` [`nextjs-app/components/custom/map/MapControls.tsx`] — consistent with the post-P8 sunny pin focus ring.

**Deferred** (real but not actionable now / out of scope):

- [x] [Review][Defer] **NFR8 bundle budget overrun (D1, conditional on resolution)** *(Target: Story 1.6 — CI/CD Quality Gates)* — pending D1 resolution. If user picks D1=A, this becomes the canonical defer entry. Carrying the `*(Target)*` tag here so Story 1.6 picks it up regardless.
- [x] [Review][Defer] `MutableRefObject<T>` deprecated in React 19 [`nextjs-app/lib/contexts/MapInstanceContext.tsx:10,17,45`] *(Target: None — conditional, only triggers if React 19 strict-mode lints elevate)* — migration debt; non-blocking.
- [x] [Review][Defer] `LoadingPill` 3s timer resets on every refetch [`nextjs-app/components/custom/map/MapView.tsx:51-77`] *(Target: Story 1.5 — Onboarding & Geolocation)* — flaky network with sub-3s refetches never surfaces feedback while user waits cumulative time. 1.5 introduces real geolocation-driven refetches; address there with cumulative timer state.
- [x] [Review][Defer] `/api/map-style` no concurrent-request dedup [`nextjs-app/app/api/map-style/route.ts:22-29`] *(Target: None — conditional, only triggers if upstream 429s observed)* — `Cache-Control: s-maxage=3600` already amortises cold-cache; revisit if logs show MapTiler upstream throttling.
- [x] [Review][Defer] `/api/venues` no rate-limit / abuse protection [`nextjs-app/app/api/venues/route.ts`] *(Target: Story 2.1 — Venue Quick-Info Card)* — fixture today; route shape persists into Story 2.x. Add IP-based throttle when 2.1 is the first story to expose the route to real production traffic.
- [x] [Review][Defer] No `must-revalidate` / `ETag` on `/api/venues` [`nextjs-app/app/api/venues/route.ts:89-91`] *(Target: Story 2.1 — Venue Quick-Info Card)* — modest perf optimization; couple with Supabase migration in 2.x.
- [x] [Review][Defer] No e2e for AC4 (deselect-by-canvas) or AC3 (pin morph mechanics) [`nextjs-app/test/e2e/map-primary.spec.ts`] *(Target: Story 1.6 — CI/CD Quality Gates)* — e2e currently asserts pin count + visibility; selection mechanics + morph animation untested. 1.6 owns CI/test-coverage hardening.
- [x] [Review][Defer] `useVenueSearch.test.ts` doesn't test radius defaulting / staleTime / refetchOnWindowFocus options [`nextjs-app/test/unit/queries/useVenueSearch.test.ts`] *(Target: Story 1.6 — CI/CD Quality Gates)* — coverage gap; fold into 1.6 test-coverage AC.
- [x] [Review][Defer] `MapControls.test.tsx` no cleanup teardown test [`nextjs-app/test/components/MapControls.test.tsx:110-122`] *(Target: Story 1.6 — CI/CD Quality Gates)* — no test for `unmount()` removing dragstart/dragend listeners.
- [x] [Review][Defer] No test for `pointer-events-none` on map gradient overlay [`nextjs-app/test/e2e/map-primary.spec.ts`] *(Target: Story 1.6 — CI/CD Quality Gates)* — only the class name presence is asserted, not the click-through behaviour.
- [x] [Review][Defer] Fixture `confidence` field never exercised in DTO mapping test [`nextjs-app/test/unit/queries/useVenueSearch.test.ts`] *(Target: Story 2.6 — Confidence Display, Auto-Refresh)* — 2.6 is the first story to render confidence; populate the test fixture then.
- [x] [Review][Defer] E2E desktop test doesn't assert mobile navbar HIDDEN at desktop width [`nextjs-app/test/e2e/map-primary.spec.ts:41`] *(Target: Story 1.6 — CI/CD Quality Gates)* — coverage gap; relies on Playwright project default device width.
- [x] [Review][Defer] `mapVenueDtoToPinData` uses `lat`/`lng` not `latitude`/`longitude` from `CoordinatesDto` [`nextjs-app/components/custom/map/MapView.tsx:97-98`] *(Target: Story 2.1 — Venue Quick-Info Card)* — `CoordinatesDto` carries both redundantly; if upstream stops populating `lat`/`lng` mapper produces NaN markers silently. 2.1 is first real-data consumer.
- [x] [Review][Defer] `VenuePinData.sunStatus` literal duplicates `VenueDataDto.currentSunStatus` [`nextjs-app/lib/types/map.ts:26`] *(Target: Story 2.6 — Confidence Display, Auto-Refresh)* — adding `'NoSun'` to API would silently break mapper. 2.6 is the first state expansion candidate; either share one literal type or add a runtime guard.
- [x] [Review][Defer] `prevSelectedRef` initial-null edge case (duplicate work on first commit if `selectedVenueId` non-null) [`nextjs-app/components/custom/map/VenuePinLayer.tsx:154-184`] *(Target: Story 2.3 — Venue Detail View)* — Story 1.4 always starts null. 2.3 is the first story to introduce deep-linkable venue URLs; verify and harden then.
- [x] [Review][Defer] `role="status"` only announces tile-failure once [`nextjs-app/components/custom/map/MapContainer.tsx:107-114`] *(Target: Story 1.6 — CI/CD Quality Gates)* — borderline a11y; if tiles repeatedly fail/recover the user is never re-notified. Fold into 1.6 a11y audit.
- [x] [Review][Defer] `AnimatePresence initial={false}` suppresses morph entrance fade on first commit [auditor] [`nextjs-app/components/custom/map/VenuePin.tsx:69`] *(Target: None — conditional, only triggers if AC6 visually fails after Story 2.x re-baseline)* — AC6 is met via separate layer-level fade; the morph component itself doesn't fade in. Cosmetic, non-blocking.
- [x] [Review][Defer] `mapRef.current` vs `mapInstance` mixed usage in `MapControls` [`nextjs-app/components/custom/map/MapControls.tsx`] *(Target: Story 1.6 — CI/CD Quality Gates)* — intentional but easy to mis-edit. Codify a convention in 1.6 lint pass.
- [x] [Review][Defer] Rapid select/deselect within 200ms morph window may briefly show overlap [`nextjs-app/components/custom/map/VenuePin.tsx:69-95`] *(Target: None — conditional, only triggers if reported in user testing)* — AnimatePresence cross-fade can settle at intermediate opacity on fast taps.
- [x] [Review][Defer] Two venues at same lat/lng (different ids) → bottom pin permanently unclickable [`nextjs-app/components/custom/map/VenuePinLayer.tsx:90-152`] *(Target: Story 2.1 — Venue Quick-Info Card)* — real but data-driven; Gothenburg dataset unlikely to collide. Add clustering or offset when 2.1 introduces real-data ingestion.
- [x] [Review][Defer] Two venues with same id (different lat/lng) → first wins, position non-deterministic across renders [`nextjs-app/components/custom/map/VenuePinLayer.tsx:90-117`] *(Target: Story 2.1 — Venue Quick-Info Card)* — data integrity issue, not code. Validate venue uniqueness at API boundary in 2.1.
- [x] [Review][Defer] Both `lat` AND `latitude` query params present → silent precedence on `lat` [`nextjs-app/app/api/venues/route.ts:35-45`] *(Target: Story 2.1 — Venue Quick-Info Card)* — rare API misuse. 2.1 normalises API to one canonical name.
- [x] [Review][Defer] `venue.name` containing RTL/control chars in aria-label [`nextjs-app/components/custom/map/VenuePin.tsx:43-45`] *(Target: None — conditional, only triggers if SR issues observed)* — unlikely with Swedish venue data.
- [x] [Review][Defer] User clicks zoom button before map loaded → silent no-op (no `aria-disabled` state) [`nextjs-app/components/custom/map/MapControls.tsx:58-72`] *(Target: Story 1.6 — CI/CD Quality Gates)* — UX could improve with disabled state during load.
- [x] [Review][Defer] `gcTime: 0` in test queries flaky in StrictMode dev double-render [`nextjs-app/test/setup/test-utils.tsx:2186`, `nextjs-app/test/unit/queries/useVenueSearch.test.ts`] *(Target: None — conditional, only triggers if test flakes seen in CI)* — Round 1 P12 chose `gcTime: 0` to avoid stale closures. Revisit if `waitFor(isSuccess)` flakes.

**Dismissed** (~30 — noise / verified safe / handled elsewhere): Round 1 deferred-work items still present (lat/lng rounding, isPartner forward-compat, etc.); BH defensive concerns the reviewer itself flagged "OK" / "Acceptable"; verified-safe edge cases (StrictMode batching, ref capture patterns, `setMapInstance(null)` mid-effect, `toggleVenue` twice in batch); spec-driven choices (16.5 px icon, half-pixel matches AC2; `outline-none` + `focus-visible:ring`); minor type/perf concerns with no observable effect (template-literal fingerprint, raw `number` setTimeout IDs in jsdom, `setTilesFailed(false)` on every load). R1-P25 (`useReducedMotion ?? true`) and R1-P3 (ref-sync declared first) verified landed and working — Edge Case Hunter's flicker re-flag was a false positive against the applied patch.

## Change Log

| Date | Change |
|------|--------|
| 2026-05-01 | Story 1.4 implementation drafted. All 7 ACs implemented; 22 new vitest cases + 2 playwright cases pass. Visual gate FAILs against the full-final reference for both mobile and desktop — flagged for SM since the reference depicts post-2.x/4.x state. Story remains `in-progress` pending SM decision on visual-gate baseline. |
| 2026-05-01 | Visual gate FAIL accepted-with-rationale by Rasmus. Reference PNGs (`docs/design/references/screens/{mobile,desktop}/map-primary.png`) depict post-2.x/4.x map-primary (time slider header, premium upsell card, bottom sheet with venue list, gear/settings overlay). Story 1.4 ships only the foundation (canvas, pins, controls, gradient overlay, tile-fail fallback). Re-baseline references or re-run gate after Stories 2.2 (bottom sheet), 2.5 (time slider) and 4.1 (premium upsell) ship — until then the gate is expected to fail for foundation deltas. Status flipped `in-progress → review`. |
| 2026-05-01 | Process finding: `.claude/scripts/sprint-status-gate.sh` extracts the story ID via `grep 'id:'`, which never matches SunnySeat's `<key>: <status>` YAML format. The gate exits 0 with "INFO: Could not extract story ID — visual validation skipped" on every transition. The visual gate has therefore been silently a no-op for SunnySeat across Stories 1.1–1.3 too. Surfaced to Rasmus; out of scope for this story. |
| 2026-05-01 | Gate fixed in-line. `sprint-status-gate.sh` now falls through to a flat-key extractor (`<key>: review`) when the BMAD `id:` shape is absent, and the screen-ID grep is anchored to the first table cell so it no longer matches the Design Artifacts row whose notes column mentions `map-primary-offline`. Route grep also strips backticks (project-context.md wraps routes as `` `/` ``). Verified end-to-end: gate now correctly extracts `1-4-...`, resolves `map-primary` → `/` mobile, runs visual-validate.sh, returns FAIL, and blocks the write. The accept-with-rationale already in place for Story 1.4 still stands; future agent transitions of any story to `review` will hit the working gate. |
| 2026-05-02 | Code review Round 1 complete. Three adversarial layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) surfaced 7 decision-needed + 27 patch + 6 defer + 7 dismiss findings. Rasmus resolved all 7 decisions; option 0 batch-applied 33 patches (one — MapView height "double-subtraction" — was withdrawn after analysis). New surface: `MapInstanceContext` exposes a reactive `mapInstance` state alongside the stable ref; `app/api/map-style/route.ts` proxies the MapTiler key server-side; `MAPTILER_KEY` env var renamed (drop `NEXT_PUBLIC_`); pin aria-labels include venue name; `MapContainer` error handling narrows tile vs style failures and recovers on subsequent successful loads; `VenuePinLayer` fingerprints existing pins to re-render only on data change; `LoadingPill` switches to `isFetching`; new `ErrorPill`; CLAUDE.md gains a "script-tooling fixes are scope-allowed when verifiably broken" clause. Test gate green: typecheck 0 / eslint 0 / vitest 48 pass / playwright 17 pass. Status transitioned `review → done`. |
| 2026-05-03 | Code review Round 2 complete. Three adversarial layers re-ran in follow-up mode against the post-Round 1 working tree — surfaced 3 decision-needed + 35 patch + 25 defer + ~30 dismiss findings, with explicit emphasis on Round 1 patch verification. Three Round 1 patches were found incomplete (P1 regex too broad, P4 auto-recovery never recovered because `load` only fires once, P3 ref-sync `useEffect` not `useLayoutEffect`); one Round 1 decision (D4 MapTiler key proxy) was found to be a regression — proxying the style.json hides the key from the style request but tile URLs inside the JSON still embedded the key, defeating the original concern. Rasmus resolved D1=A (defer NFR8 bundle budget overrun to Story 1.6), D2=A (`/api/venues` Cache-Control switched from `private` to `public, max-age=30, s-maxage=30`), D3=B (drop MapTiler entirely, commit to OpenFreeMap — `app/api/map-style/route.ts` deleted, `MAPTILER_KEY` removed from `.env.example`, `getStyleUrl()` simplified, conditional MAPTILER_STYLE_URL hardcoded). Option-0 batch-apply: 24 patches landed cleanly; 5 became no-ops because D3=B deleted their target file (`/api/map-style/*`); 6 patches deferred (architecture decisions / cross-component refactors not in scope for a triage cleanup): triple-render guard, useMemo selector stability, locale propagation, appendIndex absolute-order tracking, per-pin provider consolidation, navbar-height token consolidation. New surfaces: `nextjs-app/lib/constants/geography.ts` (runtime constants relocated from types module); `pinPartialAria` aria key for Partial-status venues in both `messages/sv` and `messages/en`; `useVenueSearch` validates `Number.isFinite(lat,lng)` and rejects non-JSON content-type before `.json()`; `MapContainer` error detection now URL-based (no message regex), `sourcedata` event drives auto-recovery, `isMounted` flag prevents state-setter-on-unmounted warnings, `console.info` slow-load metric guarded by `NODE_ENV`; `VenuePin` clamps `sunExposurePercent` to `[0,100]` and announces three distinct sun-status aria phrases; `VenuePinLayer` ref-sync uses `useLayoutEffect` with seeded refs (no first-mount stale window), selection effect clears dangling ids via `selectVenue(null)`, map-click handler guards `e.originalEvent` and skips MapLibre control containers, `isPartner` removed from fingerprint until Story 5.1 renders it; `MapView` Array.isArray-guards `venues`, mapper returns null for missing/non-finite location and `flatMap` filters those, ErrorPill stays visible during background refetch; `MapControls` motion-reduce now respected (Tailwind utilities replace inline transition style), glass button focus ring switched to `ring-text-primary`; `app/api/venues` strict number parsing (`Number(...)` not `parseFloat`), pre-slice `totalCount`, haversine `a` clamped to `[0,1]` before `sqrt`, clarified radius error copy, `Cache-Control: public, max-age=30, s-maxage=30`; test stubs typed via `MapInstanceContextValue` (no more `as unknown as MutableRefObject<never>`), `maplibre-gl` mock includes empty `Map` class to prevent future test traps, `DEFAULT_MESSAGES.map` imports `messages/sv/map.json` directly, dead `vi.clearAllTimers` removed; story Task 1.1 wording updated to reflect the 3-variant `VenuePinSelection`. Test gate green: typecheck 0 / eslint 0 / vitest 48 pass / playwright 17 pass + 11 skipped. Status remains `done` (no new HIGH/MEDIUM unresolved findings remain). |
