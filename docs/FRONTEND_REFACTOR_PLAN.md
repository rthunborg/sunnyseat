# SunnySeat Frontend Refactor Plan

**Date:** 2026-03-21
**Based on:** UX concept images in `docs/stitch/`
**Scope:** Major UI/UX overhaul of the front-end while preserving all existing business logic, hooks, API routes, and data layer.

---

## Overview of Changes

This refactor transforms SunnySeat from a **data-forward, list-driven** interface into a **visual, image-forward** experience. The five concept screens introduce:

1. A **horizontal photo-card carousel** replacing the vertical bottom tray on mobile
2. **Floating map popups** replacing side-panel selection on desktop
3. A **rich venue profile page** with hero photos, structured info sections, and weather-augmented timelines
4. **Building shadow rendering** visible on the map at close zoom
5. Responsive desktop layouts with **side-panel detail views** instead of modal sheets

---

## Screen-by-Screen Delta Analysis

### Screen 1: Landing View (Mobile)
**Concept:** `sunnyseat_landing_view_concept/screen.png`

| Element | Current | Target |
|---------|---------|--------|
| Venue list | Vertical draggable BottomCardTray with snap points | Horizontal scrollable card carousel pinned to bottom |
| Card design | Text-driven: status dot, name, mini-timeline, 120px tall | Image-forward: venue photo as main element, name overlay, compact info |
| Card interaction | Tap → navigate to detail page | Tap → select on map + expand card, second tap → detail |
| Map markers | Green/amber/gray/purple dots (7px) | Similar dot markers (keep) |
| Search bar | Top-left overlay | Top-left overlay (keep, minor styling tweaks) |
| Time controls | Floating above tray | Reposition above carousel |

### Screen 2: Selected Venue (Mobile)
**Concept:** `selected_venue_mobile/screen.png`

| Element | Current | Target |
|---------|---------|--------|
| Map zoom | Stays at current zoom | Zooms into venue, shows building footprints/shadows |
| Selected card | Highlighted in list, scroll-to | Expanded bottom card: venue name (e.g. "Hagabion"), address, hours |
| Sun timeline | MiniTimeline inside card (small) | Prominent timeline bar at card bottom with weather condition icons (sun/cloud) |
| Building shadows | Not rendered | 2.5D shadow polygons visible at close zoom levels |
| Card height | Same 120px card highlighted | Taller expanded card (~200px) with structured layout |

### Screen 3: Venue Detail Profile (Mobile)
**Concept:** `venue_detail_profile_view_concept_mobile/screen.png`

| Element | Current | Target |
|---------|---------|--------|
| Navigation | Direct link to /v/[slug] page | Slide-up panel from selected state |
| Hero image | No venue photo | Large venue photo at top of detail panel |
| Info sections | Minimal (name, status, timeline) | Structured: name, address, opening hours, sun forecast, directions |
| Sun forecast | MiniTimeline only | Full timeline section with hour labels and weather condition icons per hour |
| Actions | Directions button (expanded only) | Prominent "Directions" CTA button, possibly "Share" |
| Transition | Page navigation (full reload feel) | Smooth slide-up animation from selected card state |

### Screen 4: Venue Detail Profile (Desktop)
**Concept:** `venue_detail_profile_view_desktop/screen.png`

| Element | Current | Target |
|---------|---------|--------|
| Layout | VenueDetailSheet as modal overlay or side panel | Right-side panel (~400-480px) alongside map |
| Hero image | No venue photo | Large venue photo at panel top |
| Info layout | Basic info in sheet | Structured sections: photo → name/address → opening hours → sun forecast → actions |
| Sun timeline | Same MiniTimeline | Full-width timeline with hour markers and weather icons |
| Map interaction | Sheet obscures map on mobile | Map remains fully interactive, panel is beside it |

### Screen 5: Selected Venue (Desktop)
**Concept:** `venue_selected_desktop/screen.png`

| Element | Current | Target |
|---------|---------|--------|
| Selection UI | Side panel list with highlighted card | Floating popup card over the map at venue location |
| Popup content | N/A (uses side panel) | Venue photo thumbnail + name + basic info in compact popup |
| Map view | Standard tile map | Full-width map, venue popup floats at marker position |
| Side panel | Always visible with venue list | Hidden or minimized when a venue is selected; popup takes over |
| Transition | Click card → highlight + scroll | Click marker → popup appears at marker position → click popup → detail panel |

---

## Implementation Plan

### Phase 0: Preparation & Data Layer (no visual changes)
**Goal:** Ensure the data layer supports venue photos and any new fields needed.

**Tasks:**

1. **Venue photo URLs** — Check if the Supabase `patios`/`venues` table has an `image_url` or `photo_url` column. If not, add a migration to include it. The concept images prominently feature venue photos, so this is a hard prerequisite.
2. **Opening hours data** — The selected-venue concept shows opening hours ("Öppet Sun 14:00 - 19:30"). Verify this field exists in the data model or add it.
3. **Photo fallback strategy** — Design a fallback for venues without photos (colored gradient with venue initial, or a default illustration).
4. **Type updates** — Extend `SunExposureResult` and related TypeScript types to include `imageUrl`, `openingHours`, etc.

**Files touched:**
- `infrastructure/supabase/migrations/` (new migration if needed)
- `lib/types/` (type definitions)
- `lib/services/` (ensure queries return new fields)
- `app/api/patios/` and `app/api/sun-exposure/` (API returns new data)

---

### Phase 1: New VenuePhotoCard Component
**Goal:** Build the image-forward card used in the mobile carousel and desktop popups.

**Tasks:**
1. **Create `components/custom/VenuePhotoCard.tsx`** — New card component with:
   - Venue photo as background/hero (with lazy loading + blur placeholder)
   - Name overlay at bottom (white text on gradient scrim)
   - Status indicator badge (sunny/partial/shaded dot or icon)
   - Compact info line (neighborhood, distance)
   - Two variants: `carousel` (square-ish, ~160x200px) and `popup` (wider, landscape)
2. **Photo component** — Create `components/ui/VenuePhoto.tsx` for consistent image handling:
   - Next.js `<Image>` with blur placeholder
   - Fallback to colored gradient with venue initial
   - Aspect ratio container (4:3 for cards, 16:9 for detail hero)
3. **Preserve existing VenueCard.tsx** — Keep it for now as the list-view card. It can be deprecated later.

**Files touched:**
- `components/custom/VenuePhotoCard.tsx` (new)
- `components/ui/VenuePhoto.tsx` (new)

---

### Phase 2: Horizontal Carousel (Mobile Landing — Screen 1)
**Goal:** Replace the vertical BottomCardTray on mobile with a horizontal photo-card carousel.

**Tasks:**
1. **Create `components/custom/VenueCarousel.tsx`**:
   - Horizontal scroll container (CSS `overflow-x: auto`, `scroll-snap-type: x mandatory`)
   - Renders `VenuePhotoCard` in `carousel` variant
   - Grouped by status (sunny first, then partial, upcoming, shaded)
   - Scroll-snap alignment per card
   - Active card (selected) scales up slightly or gets a border highlight
   - Pinned to bottom of screen above safe area
2. **Update `HomeScreen.tsx`**:
   - Mobile layout: replace `<BottomCardTray>` with `<VenueCarousel>`
   - Keep desktop layout as-is for now (addressed in Phase 4)
   - Reposition `TimeSlider` + `DatePicker` above the carousel
   - Wire `onVenueSelect` from carousel card tap → map fly-to + selection state
3. **Carousel ↔ Map sync**:
   - Tapping a carousel card → map flies to venue, selects marker
   - Tapping a map marker → carousel scrolls to that card
   - Use `useCardTray` context or create a new `useCarouselSync` hook
4. **Preserve BottomCardTray.tsx** — Keep for potential desktop use or A/B testing.

**Files touched:**
- `components/custom/VenueCarousel.tsx` (new)
- `components/custom/HomeScreen.tsx` (modify mobile layout)
- `lib/hooks/` (new `useCarouselSync.ts` if needed)
- `lib/context/CardTrayContext.tsx` (adapt or replace)

---

### Phase 3: Selected Venue Expansion (Mobile — Screen 2)
**Goal:** When a venue is tapped, show an expanded info card at the bottom instead of navigating away.

**Tasks:**
1. **Create `components/custom/SelectedVenueCard.tsx`**:
   - Slides up from bottom when a venue is selected (Framer Motion `animate`)
   - Shows: venue name, address, opening hours, status badge
   - Prominent sun timeline bar at bottom with weather condition icons per hour
   - Tap anywhere on the card → opens full detail (Phase 5)
   - Swipe down → deselect venue, return to carousel
2. **Enhanced Timeline component**:
   - Create `components/custom/SunTimeline.tsx` (or refactor existing `MiniTimeline`)
   - Hour labels along x-axis
   - Weather condition icons (sun, partly-cloudy, overcast, rain) at each hour mark
   - Current-time indicator line
   - Color-coded segments matching sun exposure windows
3. **Map behavior on selection**:
   - Fly to venue at higher zoom level
   - Show building shadow polygons (if shadow geometry data exists in `lib/solar/`)
   - Dim non-selected markers (existing behavior, keep)
4. **State management**:
   - Three mobile states: `browsing` (carousel), `selected` (expanded card), `detail` (full profile)
   - Add to existing context or create `useVenueSelectionFlow` hook

**Files touched:**
- `components/custom/SelectedVenueCard.tsx` (new)
- `components/custom/SunTimeline.tsx` (new or refactored from MiniTimeline)
- `components/custom/HomeScreen.tsx` (add selection flow state)
- `lib/hooks/useVenueSelectionFlow.ts` (new)
- `components/custom/MapContainer.tsx` (zoom-on-select behavior)

---

### Phase 4: Desktop Map Popup & Layout (Screens 4 & 5)
**Goal:** Replace the desktop side-panel list with floating map popups for selected venues, and a right-side detail panel.

**Tasks:**
1. **Create `components/custom/MapPopup.tsx`**:
   - MapLibre GL popup positioned at venue marker coordinates
   - Contains: venue photo thumbnail, name, status badge, neighborhood
   - Click popup → opens right-side detail panel
   - Dismiss by clicking elsewhere on map
   - Styled with card shadow, rounded corners, max-width ~280px
2. **Update `MapContainer.tsx`** for popup support:
   - On venue select (desktop): create MapLibre `Popup` at marker coords with React portal
   - Remove/reduce the side-panel venue list on desktop
   - Alternatively: keep a minimized venue list as a toggle-able overlay
3. **Create `components/custom/VenueDetailPanel.tsx`** (desktop detail — Screen 4):
   - Right-side panel (~400-480px wide) that slides in when a venue is opened
   - Hero photo (16:9 aspect ratio) at top
   - Structured sections: name + address, opening hours, sun forecast (SunTimeline), action buttons
   - Close button returns to map-only view
   - Replaces current `VenueDetailSheet.tsx` on desktop
4. **Update `HomeScreen.tsx`** desktop layout:
   - Remove or condense the always-visible side panel venue list
   - Map takes full width by default
   - Detail panel slides in from right when a venue is opened
   - Search bar stays top-left over the map

**Files touched:**
- `components/custom/MapPopup.tsx` (new)
- `components/custom/VenueDetailPanel.tsx` (new)
- `components/custom/MapContainer.tsx` (add popup rendering)
- `components/custom/HomeScreen.tsx` (restructure desktop layout)
- `components/custom/VenueDetailSheet.tsx` (deprecate or adapt)

---

### Phase 5: Venue Detail Profile (Mobile — Screen 3)
**Goal:** Build the full venue profile view as a slide-up panel on mobile.

**Tasks:**
1. **Create `components/custom/VenueDetailProfile.tsx`**:
   - Full-height slide-up panel (from SelectedVenueCard state)
   - Hero venue photo (full-width, ~40vh)
   - Below photo: venue name (large), address, neighborhood
   - Opening hours section with current-day highlight
   - Sun forecast section using `SunTimeline` (full-width, detailed)
   - Action bar: "Directions" primary CTA, optional "Share" secondary
   - Scroll-to-dismiss or back-button to return to selected state
2. **Transition animation**:
   - SelectedVenueCard → VenueDetailProfile: shared element transition (card expands to fill screen)
   - Or simpler: slide up with Framer Motion `layoutId` for the venue name/photo
3. **Reuse on desktop**:
   - `VenueDetailPanel.tsx` (Phase 4) shares the same content sections
   - Extract shared content into `components/composed/VenueProfileContent.tsx`
   - Mobile wraps it in a slide-up sheet, desktop wraps it in the side panel
4. **Route integration**:
   - Keep `/v/[slug]` route working for direct links / SEO
   - In-app navigation uses the slide-up panel instead of full page navigation
   - Use Next.js parallel routes (`@modal`) or client-side state

**Files touched:**
- `components/custom/VenueDetailProfile.tsx` (new)
- `components/composed/VenueProfileContent.tsx` (new, shared content)
- `components/custom/VenueDetailPanel.tsx` (use shared content)
- `app/@modal/` (potentially update parallel route)

---

### Phase 6: Building Shadow Rendering on Map
**Goal:** Show 2.5D building shadow polygons on the map at close zoom levels (visible in Screen 2).

**Tasks:**
1. **Assess existing shadow geometry** — The codebase has `lib/solar/` with SPA algorithm and shadow geometry calculations, plus `lib/buildings/` for building geometry import. Determine if shadow polygons are already computed and just need rendering, or if additional computation is needed.
2. **Add shadow polygon layer to MapContainer**:
   - New MapLibre fill layer for shadow polygons
   - Semi-transparent dark fill (e.g. `rgba(0,0,0,0.15)`)
   - Only visible at zoom levels ≥ 15 (close zoom when buildings are distinguishable)
   - Updates based on current time / time offset selection
3. **Performance considerations**:
   - Shadow polygons can be expensive — only compute for visible map bounds
   - Debounce recalculation on time slider change
   - Consider web worker for shadow geometry computation
4. **Building footprint outlines** — Add subtle building outlines at close zoom for visual context.

**Files touched:**
- `components/custom/MapContainer.tsx` (add shadow layer)
- `lib/solar/` (ensure shadow polygons are exposed for rendering)
- `lib/buildings/` (building geometry data access)

---

### Phase 7: Visual Polish & Design Token Updates
**Goal:** Align all visual details with the concept aesthetic.

**Tasks:**
1. **Typography updates in `globals.css`**:
   - Venue name in selected/detail views uses larger weight (concept shows bolder headlines)
   - Address and hours use lighter secondary text
   - Ensure the type scale works for the new card and panel layouts
2. **Card styling**:
   - Photo cards need gradient scrim (linear-gradient transparent → black/60) for text readability
   - Selected card needs subtle elevation change (shadow-elevated)
   - Border radius consistency: 16px for cards, 12px for buttons (matches existing tokens)
3. **Timeline visual upgrade**:
   - Weather condition icons (Lucide: `Sun`, `CloudSun`, `Cloud`, `CloudRain`) integrated into timeline
   - Hour markers with readable labels
   - Current-time vertical indicator line
4. **Map popup styling**:
   - Custom MapLibre popup CSS (override default `.maplibregl-popup` styles)
   - Match card shadow and border-radius tokens
   - Arrow/pointer from popup to marker
5. **Animation refinements**:
   - Carousel scroll: momentum + snap (CSS scroll-snap)
   - Selected card slide-up: 300ms ease-out
   - Detail panel slide-in: 350ms spring (Framer Motion)
   - All respecting `prefers-reduced-motion` (existing pattern)
6. **Responsive breakpoints** — Verify all new components work at:
   - Mobile: 320px–767px
   - Tablet: 768px–1023px (decide: carousel or popup behavior?)
   - Desktop: 1024px+

---

## Component Architecture Summary

```
HomeScreen.tsx (orchestrator)
├── Mobile (< lg)
│   ├── MapContainer.tsx (full screen)
│   ├── SearchBar.tsx (top-left overlay)
│   ├── TimeSlider.tsx + DatePicker.tsx (above carousel)
│   ├── VenueCarousel.tsx (bottom, horizontal scroll)     ← NEW
│   │   └── VenuePhotoCard.tsx (carousel variant)          ← NEW
│   ├── SelectedVenueCard.tsx (replaces carousel on select) ← NEW
│   │   └── SunTimeline.tsx                                 ← NEW
│   └── VenueDetailProfile.tsx (slide-up from selected)     ← NEW
│       └── VenueProfileContent.tsx (shared)                ← NEW
│
├── Desktop (≥ lg)
│   ├── MapContainer.tsx (full width)
│   │   └── MapPopup.tsx (at marker coords on select)      ← NEW
│   ├── SearchBar.tsx (top-left overlay)
│   ├── TimeSlider.tsx + DatePicker.tsx (top or bottom overlay)
│   └── VenueDetailPanel.tsx (right side, on venue open)    ← NEW
│       └── VenueProfileContent.tsx (shared)                ← NEW
│
└── Shared / Reusable
    ├── VenuePhoto.tsx (image with fallback)                ← NEW
    ├── SunTimeline.tsx (weather-augmented timeline)         ← NEW
    └── VenueProfileContent.tsx (detail sections)           ← NEW
```

---

## Mobile State Machine

```
┌─────────────┐   tap card    ┌──────────────┐   tap card    ┌─────────────────┐
│  BROWSING    │ ───────────→  │  SELECTED     │ ───────────→  │  DETAIL          │
│  (carousel)  │               │  (expanded    │               │  (full profile   │
│              │  ← ────────── │   bottom card)│  ← ────────── │   slide-up)      │
└─────────────┘   tap map bg   └──────────────┘   swipe down   └─────────────────┘
       ↑               │
       └───────────────┘
         deselect / tap map bg
```

---

## Desktop State Machine

```
┌─────────────┐  click marker  ┌──────────────┐  click popup  ┌─────────────────┐
│  MAP ONLY    │ ───────────→   │  MAP + POPUP  │ ───────────→  │  MAP + DETAIL    │
│  (full map)  │                │  (floating    │               │  PANEL           │
│              │  ← ──────────  │   card)       │  ← ────────── │  (right side)    │
└─────────────┘  click map bg   └──────────────┘  close panel   └─────────────────┘
```

---

## New Files Summary

| File | Type | Phase |
|------|------|-------|
| `components/ui/VenuePhoto.tsx` | UI primitive | 1 |
| `components/custom/VenuePhotoCard.tsx` | Domain component | 1 |
| `components/custom/VenueCarousel.tsx` | Domain component | 2 |
| `components/custom/SelectedVenueCard.tsx` | Domain component | 3 |
| `components/custom/SunTimeline.tsx` | Domain component | 3 |
| `components/custom/MapPopup.tsx` | Domain component | 4 |
| `components/custom/VenueDetailPanel.tsx` | Domain component | 4 |
| `components/custom/VenueDetailProfile.tsx` | Domain component | 5 |
| `components/composed/VenueProfileContent.tsx` | Composed component | 5 |
| `lib/hooks/useCarouselSync.ts` | Hook | 2 |
| `lib/hooks/useVenueSelectionFlow.ts` | Hook | 3 |

## Modified Files Summary

| File | Changes | Phase |
|------|---------|-------|
| `components/custom/HomeScreen.tsx` | Replace mobile tray with carousel; restructure desktop layout | 2, 4 |
| `components/custom/MapContainer.tsx` | Add popup support (desktop); shadow layer; zoom-on-select | 3, 4, 6 |
| `app/globals.css` | Typography tweaks, popup styles, carousel snap styles | 7 |
| `lib/types/` | Add imageUrl, openingHours to venue types | 0 |
| `lib/services/` | Return new fields from queries | 0 |
| `lib/context/CardTrayContext.tsx` | Adapt for carousel sync or deprecate | 2 |

## Deprecated / Replaced Files

| File | Replacement | When |
|------|-------------|------|
| `components/custom/BottomCardTray.tsx` | `VenueCarousel.tsx` (mobile) | Phase 2 |
| `components/custom/VenueDetailSheet.tsx` | `VenueDetailProfile.tsx` (mobile) + `VenueDetailPanel.tsx` (desktop) | Phase 4-5 |
| `components/custom/VenueCard.tsx` | `VenuePhotoCard.tsx` | Phase 1 (gradual) |

---

## Execution Order & Dependencies

```
Phase 0 (Data) ──→ Phase 1 (PhotoCard) ──→ Phase 2 (Carousel) ──→ Phase 3 (Selected Card)
                                                                          │
                                                                          ↓
                                                                    Phase 5 (Detail Mobile)
                                                                          │
Phase 6 (Shadows) can run in parallel ←──────────────────────────────────┘
Phase 4 (Desktop Popup + Panel) depends on Phase 1 only
Phase 7 (Polish) runs last
```

**Recommended sprint breakdown:**
- **Sprint 1:** Phase 0 + Phase 1 (foundation: data + photo card component)
- **Sprint 2:** Phase 2 + Phase 3 (mobile landing + selection flow)
- **Sprint 3:** Phase 4 + Phase 5 (desktop layout + detail profiles)
- **Sprint 4:** Phase 6 + Phase 7 (shadows + polish)

---

## Risk Areas & Considerations

1. **Venue photos** — The entire new UX depends on venue photos existing. If most venues lack photos, the carousel will look empty. Prioritize the fallback strategy in Phase 0.
2. **MapLibre popups + React** — MapLibre GL popups use DOM injection, not React. You'll need a React portal pattern or `createRoot` inside the popup DOM element for interactivity.
3. **Carousel performance** — With 50+ venue cards each containing an image, the carousel needs virtualization or lazy loading to avoid memory issues on mobile.
4. **Shadow computation cost** — Building shadow polygons for all visible buildings at the current sun angle could be expensive. Profile and optimize early.
5. **State complexity** — The mobile state machine (browsing → selected → detail) adds complexity. Consider using `useReducer` or a small state machine library (like XState) to keep transitions predictable.
6. **SEO preservation** — The `/v/[slug]` pages are important for SEO. Ensure the in-app slide-up panels don't break direct URL access or server-side rendering of venue pages.
7. **Accessibility** — The carousel needs proper ARIA roles (`role="listbox"` or `role="tablist"`), keyboard navigation (arrow keys), and screen reader announcements for selection changes.


---

## Detailed: Map Visual & Icon Overhaul

### Current Map Markers (what we have now)
The current `MapContainer.tsx` uses **plain colored circles** rendered as MapLibre circle layers:

- **Regular venues:** 7px radius circles, white 2px stroke, colored by sun status (green/amber/gray/purple)
- **Partner venues:** 10px radius golden circles with 14px golden glow aura
- **Candidate venues:** 6px radius blue circles
- **Selection:** Selected marker scales up (7→11px), gets a 3px white ring + colored outer ring, non-selected dim to 0.6 opacity, pulse animation on select
- **Hit targets:** Invisible 22px radius layer for touch
- **"Sol nu" badge:** Text overlay on partner venues showing "☀ Sol nu"

### Target Map Markers (from concept images)
The concept images show **pin-drop style venue icons** instead of flat circles:

- **Landing view:** Green location-pin markers (~20px tall) scattered on the map — more recognizable as "places" than abstract dots
- **Selected state:** The selected venue marker should be visually distinct (larger, highlighted, possibly with a venue-photo thumbnail in the pin)
- **Desktop selected:** A golden highlight/glow radiates outward from the selected area on the map (visible in `venue_selected_desktop` concept)

### Map Marker Implementation Changes

**Task 1: Replace circle layers with icon/symbol layers**
- Switch from MapLibre `circle` layer type to `symbol` layer type
- Create SVG pin icons in 4 sun-status colors (sunny/green, partial/amber, shaded/gray, upcoming/purple) + gold for partner
- Use `icon-image` property with status-based expressions
- Size: ~24px normal, ~32px selected (using `icon-size` expressions)
- Keep the 22px invisible hit-test layer for touch targets

**Task 2: Selected marker visual**
- Selected pin scales up and gets a subtle bounce animation
- Add a radial glow/highlight effect beneath the selected pin (MapLibre `circle` layer behind the icon)
- Consider showing a mini venue-photo thumbnail inside the selected pin (requires HTML marker overlay via `maplibregl.Marker` with custom DOM)

**Task 3: Map style/mood**
- Landing view: Standard light map tile (current, keep)
- Desktop selected view (concept): Shows a darker, more atmospheric map with a golden sun-exposure glow overlay — this appears to be a visual highlight of sunny areas
- Consider adding a semi-transparent golden fill layer showing sun-exposed areas when a venue is selected on desktop

**Task 4: Building footprints at close zoom**
- At zoom ≥ 15: Show building outlines (visible in the mobile selected-venue concept)
- Use MapTiler 3D building data or the existing `lib/buildings/` geometry
- Light gray fill with darker stroke for building footprints
- Shadow polygons overlay (from `lib/solar/`) in semi-transparent dark fill

**Files touched:**
- `components/custom/MapContainer.tsx` (major refactor of layers)
- `public/icons/` (new SVG pin icons per status)
- `app/globals.css` (map popup and overlay styles)

---

## Detailed: Click Flow & Zoom Behavior

### Mobile Click Flow

```
User taps venue icon on map
  │
  ├─ 1. Map animates: flyTo(venue coords, zoom: max(current+2, 16))
  │     Store previous zoom level in state
  │
  ├─ 2. Venue carousel hides (animated slide-down)
  │
  ├─ 3. SelectedVenueCard slides up from bottom (Framer Motion)
  │     Shows: venue name, address, opening hours, SunTimeline
  │     Has "Mer info" button
  │
  ├─ User taps "Mer info" on SelectedVenueCard
  │   └─ 4. VenueDetailProfile slides up (full height, covers map)
  │         Hero photo, full info, directions CTA
  │         Back/swipe-down → returns to SelectedVenueCard state
  │
  └─ User taps map background (outside any marker/card)
      ├─ 5. SelectedVenueCard slides down (dismiss)
      ├─ 6. Map animates: flyTo(previous center, previous zoom level)
      └─ 7. VenueCarousel slides back up
```

### Desktop Click Flow

```
User clicks venue icon on map
  │
  ├─ 1. Map animates: flyTo(venue coords, zoom: max(current+2, 16))
  │     Store previous zoom level + center in state
  │
  ├─ 2. MapPopup appears at venue marker position
  │     Floating card: venue photo thumbnail, name, status, "Mer info" link
  │     Popup is a MapLibre Popup with React portal content
  │
  ├─ User clicks "Mer info" on MapPopup
  │   ├─ 3. MapPopup dismissed
  │   └─ 4. VenueDetailPanel slides in from right (~400-480px)
  │         Hero photo, full venue info, directions CTA
  │         Map resizes to fill remaining width (animated)
  │         Close button → returns to map-only state
  │
  └─ User clicks map background (outside marker/popup)
      ├─ 5. MapPopup dismissed
      ├─ 6. Map animates: flyTo(previous center, previous zoom level)
      └─ 7. If detail panel is open, it slides out too
```

### Zoom Behavior — Detailed Specification

**On venue select (both mobile & desktop):**
1. Store `previousZoom` and `previousCenter` in a ref/state
2. Calculate target zoom: `Math.max(currentZoom + 2, 16)` (minimum zoom 16 for close-up view)
3. Cap at max zoom 18 (existing constraint)
4. `map.flyTo({ center: [venue.lng, venue.lat], zoom: targetZoom, duration: 800 })`
5. If `prefers-reduced-motion`: use `map.jumpTo()` instead (instant, no animation)

**On venue deselect (tap/click map background):**
1. `map.flyTo({ center: previousCenter, zoom: previousZoom, duration: 600 })`
2. Clear `previousZoom` and `previousCenter`
3. If `prefers-reduced-motion`: use `map.jumpTo()` instead

**Edge cases:**
- If user manually pans/zooms while a venue is selected, update `previousCenter`/`previousZoom` to the new values (so deselect returns to where the user panned to, not the original pre-select position) — OR keep original and always return to pre-select view. **Decision needed.**
- If user selects a different venue while one is already selected: fly to new venue at same zoom level, don't reset to previous zoom first
- If user is already zoomed in past 16: don't zoom further in, just pan to center on the venue

**State to add (in `useVenueSelectionFlow` hook or `MapContainer` ref):**
```typescript
const mapViewBeforeSelect = useRef<{
  center: [number, number];
  zoom: number;
} | null>(null);
```

---

## Detailed: "Mer info" Button & Overlay Behavior

### Mobile: "Mer info" → Full-screen slide-up
- **Trigger:** User taps "Mer info" button on `SelectedVenueCard`
- **Animation:** `VenueDetailProfile` slides up from the bottom to cover ~95% of the screen
- **Content:** Hero photo (full-width, ~35-40vh), venue name, address, opening hours, `SunTimeline` (full detail variant), "Vägbeskrivning" (Directions) CTA, optional "Dela" (Share)
- **Dismiss:** Swipe down, tap back arrow, or press Escape → slides back down to `SelectedVenueCard` state
- **Map behind:** Map is still visible but dimmed; does NOT zoom back out
- **Route:** Does NOT navigate to `/v/[slug]` — stays on home page with overlay state. The `/v/[slug]` route still works for direct links/SEO but in-app flow uses the overlay.

### Desktop: "Mer info" → Right-side detail panel
- **Trigger:** User clicks "Mer info" link on `MapPopup`
- **Animation:** `MapPopup` fades out; `VenueDetailPanel` slides in from the right (400-480px wide, 350ms spring animation)
- **Map resizing:** Map container shrinks by the panel width (CSS transition, 300ms). Map re-centers on the venue after resize.
- **Content:** Same as mobile but in panel layout — hero photo (full panel width), structured info sections
- **Dismiss:** Close button (X) or press Escape → panel slides out, map re-expands to full width, flies back to `previousZoom`/`previousCenter`
- **Route:** Same as mobile — no URL change for in-app flow

### Shared content extraction
Both mobile `VenueDetailProfile` and desktop `VenueDetailPanel` render the same venue information. Extract into `VenueProfileContent.tsx`:

```typescript
// components/composed/VenueProfileContent.tsx
interface VenueProfileContentProps {
  venue: VenueDetail;
  layout: 'mobile' | 'desktop';
  onDirections: () => void;
  onShare?: () => void;
  onClose?: () => void;
}
```

Mobile wrapper adds: slide-up animation, drag-to-dismiss, full-screen overlay.
Desktop wrapper adds: side panel positioning, close button, map resize coordination.


---

## Comprehensive Test Plan

### Guiding Principles
- Every new component gets both **Vitest unit tests** and **Playwright E2E tests**
- Tests run across 3 viewports: Mobile (375×667), Tablet (768×1024), Desktop (1280×720)
- Follow existing patterns: Page Object Model for E2E, Testing Library for unit tests
- All new components must pass WCAG 2.1 AA accessibility audit (axe-core)
- No changes to `/admin` routes or their tests
- Existing tests for deprecated components (`BottomCardTray`, `VenueCard`, `VenueDetailSheet`) remain until those components are fully removed

### New Page Objects Needed

```
e2e/pages/
├── HomePage.ts                    ← UPDATE (add carousel, selected-card, detail selectors)
├── VenueCarouselSection.ts        ← NEW
├── SelectedVenueCardSection.ts    ← NEW
├── VenueDetailProfilePage.ts      ← NEW (mobile overlay)
├── VenueDetailPanelSection.ts     ← NEW (desktop panel)
└── MapPopupSection.ts             ← NEW (desktop popup)
```

### E2E Test Specifications (Playwright)

#### `e2e/tests/venue-carousel.spec.ts` — Mobile Carousel
```
describe('VenueCarousel (Mobile)')
  ✓ renders horizontal carousel with venue photo cards at bottom of screen
  ✓ cards display venue photo, name overlay, and status indicator
  ✓ cards are grouped by sun status (sunny first, then partial, upcoming, shaded)
  ✓ carousel is horizontally scrollable with scroll-snap behavior
  ✓ tapping a card selects the venue (card gets highlight)
  ✓ tapping a card causes map to fly-to and zoom into the venue
  ✓ tapping a map marker scrolls the carousel to the corresponding card
  ✓ carousel hides when a venue is selected (SelectedVenueCard takes over)
  ✓ carousel reappears when venue is deselected
  ✓ cards without photos show fallback (gradient + initial)
  ✓ carousel handles empty state gracefully (no venues)
  ✓ carousel handles loading state (skeleton cards)
  ✓ carousel is not visible on desktop viewport
  ✓ keyboard navigation: arrow keys scroll between cards
  ✓ passes axe accessibility audit
```

#### `e2e/tests/venue-select-mobile.spec.ts` — Mobile Selection Flow
```
describe('Venue Selection Flow (Mobile)')
  ✓ tapping venue marker shows SelectedVenueCard at bottom
  ✓ SelectedVenueCard shows venue name, address, and opening hours
  ✓ SelectedVenueCard shows SunTimeline with weather icons
  ✓ SelectedVenueCard has "Mer info" button
  ✓ map zooms into selected venue (zoom level ≥ 16)
  ✓ tapping map background dismisses SelectedVenueCard
  ✓ map zooms back to previous zoom level on deselect
  ✓ carousel reappears after deselecting venue
  ✓ selecting a different venue updates the card without zooming out first
  ✓ SelectedVenueCard can be swiped down to dismiss
  ✓ Escape key dismisses SelectedVenueCard
  ✓ non-selected markers are dimmed (0.6 opacity)
  ✓ selected marker has scale-up and glow effect
  ✓ passes axe accessibility audit
```

#### `e2e/tests/venue-detail-mobile.spec.ts` — Mobile Detail Profile
```
describe('Venue Detail Profile (Mobile)')
  ✓ tapping "Mer info" on SelectedVenueCard opens VenueDetailProfile overlay
  ✓ overlay slides up from bottom with animation
  ✓ hero venue photo is displayed at top (full width)
  ✓ venue name, address, and neighborhood are shown
  ✓ opening hours section displays correctly with today highlighted
  ✓ SunTimeline shows full detail variant with hour labels and weather icons
  ✓ "Vägbeskrivning" (Directions) button is visible and clickable
  ✓ directions button opens Google Maps link
  ✓ "Dela" (Share) button triggers share/copy
  ✓ swiping down dismisses overlay, returns to SelectedVenueCard
  ✓ pressing Escape dismisses overlay
  ✓ tapping back arrow dismisses overlay
  ✓ map remains visible (dimmed) behind overlay
  ✓ map does NOT zoom back out while overlay is open
  ✓ overlay does not navigate to /v/[slug] (stays on home page)
  ✓ direct URL /v/[slug] still works as standalone page
  ✓ passes axe accessibility audit
```

#### `e2e/tests/venue-select-desktop.spec.ts` — Desktop Selection Flow
```
describe('Venue Selection Flow (Desktop)')
  ✓ clicking venue marker shows MapPopup at marker position
  ✓ MapPopup displays venue photo thumbnail, name, and status
  ✓ MapPopup has "Mer info" link
  ✓ map zooms into selected venue (zoom level ≥ 16)
  ✓ clicking map background dismisses MapPopup
  ✓ map zooms back to previous zoom level on deselect
  ✓ clicking a different marker moves popup to new venue
  ✓ non-selected markers are dimmed
  ✓ selected marker has scale-up and glow effect
  ✓ popup is positioned near the marker (not off-screen)
  ✓ Escape key dismisses MapPopup
  ✓ carousel is NOT visible on desktop (only on mobile)
  ✓ passes axe accessibility audit
```

#### `e2e/tests/venue-detail-desktop.spec.ts` — Desktop Detail Panel
```
describe('Venue Detail Panel (Desktop)')
  ✓ clicking "Mer info" on MapPopup opens VenueDetailPanel from the right
  ✓ MapPopup is dismissed when panel opens
  ✓ panel slides in with animation (350ms)
  ✓ map resizes to accommodate panel width (~400-480px)
  ✓ map re-centers on selected venue after resize
  ✓ hero venue photo is displayed at panel top
  ✓ venue name, address, and neighborhood are shown
  ✓ opening hours section "Öppettider idag" displays correctly
  ✓ SunTimeline shows full detail with hour labels and weather icons
  ✓ "Vägbeskrivning" (Directions) button works
  ✓ close button (X) dismisses panel
  ✓ Escape key dismisses panel
  ✓ map re-expands to full width after panel closes
  ✓ map flies back to previous zoom/center after panel closes
  ✓ panel does not navigate to /v/[slug]
  ✓ passes axe accessibility audit
```

#### `e2e/tests/map-markers.spec.ts` — Map Icon & Visual Tests
```
describe('Map Markers & Icons')
  ✓ venue markers render as pin icons (not circles)
  ✓ markers are color-coded by sun status (green/amber/gray/purple)
  ✓ partner venues have gold pin markers
  ✓ selected marker scales up and shows glow effect
  ✓ non-selected markers dim to reduced opacity on selection
  ✓ markers have adequate touch target size (≥ 44px)
  ✓ building footprints appear at zoom ≥ 15
  ✓ building shadows render at close zoom levels
  ✓ shadow polygons update when time slider changes
  ✓ "Sol nu" badge appears on sunny partner venues
  ✓ map uses correct tile style at all zoom levels
```

#### `e2e/tests/sun-timeline.spec.ts` — SunTimeline Component
```
describe('SunTimeline')
  ✓ renders hour labels along x-axis
  ✓ shows weather condition icons (sun, cloud-sun, cloud, cloud-rain) per hour
  ✓ displays current-time indicator line at correct position
  ✓ color-coded segments match sun exposure windows
  ✓ timeline updates when time slider offset changes
  ✓ timeline is readable on both mobile and desktop viewports
  ✓ has appropriate aria-label describing sun conditions
  ✓ passes axe accessibility audit
```

#### `e2e/tests/zoom-behavior.spec.ts` — Map Zoom & Fly-to
```
describe('Map Zoom Behavior')
  ✓ selecting venue zooms map to at least level 16
  ✓ zoom animation is smooth (800ms flyTo)
  ✓ deselecting venue returns to previous zoom level
  ✓ deselecting venue returns to previous map center
  ✓ selecting a second venue pans without zooming back out first
  ✓ manual pan/zoom during selection is preserved on deselect
  ✓ zoom respects max zoom 18 cap
  ✓ reduced-motion users get instant jumpTo instead of flyTo
```

#### `e2e/tests/responsive-layout-new.spec.ts` — Cross-Viewport Layout
```
describe('Responsive Layout')
  Mobile:
    ✓ shows VenueCarousel at bottom (not side panel)
    ✓ venue selection shows SelectedVenueCard (not MapPopup)
    ✓ "Mer info" opens full-screen overlay (not side panel)
    ✓ search bar is at top of screen
    ✓ time controls are above the carousel
  
  Tablet:
    ✓ follows mobile layout pattern (carousel + overlays)
  
  Desktop:
    ✓ no carousel visible
    ✓ venue selection shows MapPopup (not SelectedVenueCard)
    ✓ "Mer info" opens right-side panel (not overlay)
    ✓ search bar is top-left over the map
    ✓ map takes full width when no panel is open
```

### Vitest Unit Test Specifications

#### `test/components/custom/VenuePhotoCard.test.tsx`
```
describe('VenuePhotoCard')
  ✓ renders venue photo as background image
  ✓ shows venue name as overlay text
  ✓ displays sun status indicator badge
  ✓ shows fallback gradient when no photo URL
  ✓ carousel variant renders at correct dimensions (~160x200px)
  ✓ popup variant renders in landscape orientation
  ✓ applies correct status-based styling (sunny/partial/shaded/upcoming)
  ✓ calls onSelect when clicked
  ✓ is focusable and responds to Enter/Space keys
  ✓ has correct ARIA attributes (role, label)
  ✓ lazy-loads images (loading="lazy")
```

#### `test/components/custom/VenueCarousel.test.tsx`
```
describe('VenueCarousel')
  ✓ renders a horizontal scrollable container
  ✓ renders VenuePhotoCard for each venue
  ✓ venues are ordered by status (sunny → partial → upcoming → shaded)
  ✓ applies scroll-snap-type: x mandatory
  ✓ selected card has highlight styling
  ✓ calls onVenueSelect when a card is tapped
  ✓ scrolls to selected card when selectedVenueId changes
  ✓ shows skeleton cards during loading
  ✓ shows empty state when no venues
  ✓ hides when isHidden prop is true
  ✓ has correct ARIA role and attributes
  ✓ arrow keys navigate between cards
```

#### `test/components/custom/SelectedVenueCard.test.tsx`
```
describe('SelectedVenueCard')
  ✓ renders venue name prominently
  ✓ shows venue address
  ✓ shows opening hours
  ✓ includes SunTimeline component
  ✓ has "Mer info" button
  ✓ calls onMoreInfo when "Mer info" is clicked
  ✓ calls onDismiss when swiped down (Framer Motion drag)
  ✓ Escape key triggers onDismiss
  ✓ has role="dialog" and aria-label
  ✓ animates in from bottom (initial y: 100%)
```

#### `test/components/custom/SunTimeline.test.tsx`
```
describe('SunTimeline')
  ✓ renders hour labels from start to end of day range
  ✓ shows weather icons at each hour position
  ✓ current-time indicator positioned correctly
  ✓ color-coded segments match sun window data
  ✓ updates when currentTime prop changes
  ✓ generates descriptive aria-label
  ✓ handles empty sun windows (fully shaded)
  ✓ handles edge case: all-day sunny
```

#### `test/components/custom/MapPopup.test.tsx`
```
describe('MapPopup')
  ✓ renders venue photo thumbnail
  ✓ shows venue name and status badge
  ✓ shows neighborhood text
  ✓ has "Mer info" link
  ✓ calls onMoreInfo when link is clicked
  ✓ has appropriate max-width (~280px)
  ✓ has role and aria attributes
```

#### `test/components/custom/VenueDetailPanel.test.tsx`
```
describe('VenueDetailPanel')
  ✓ renders hero photo at top
  ✓ shows venue name, address, neighborhood
  ✓ shows opening hours section
  ✓ includes SunTimeline in detail mode
  ✓ has Directions CTA button
  ✓ has close button
  ✓ calls onClose when close button clicked
  ✓ Escape key triggers onClose
  ✓ has role="complementary" and aria-label
```

#### `test/components/custom/VenueDetailProfile.test.tsx`
```
describe('VenueDetailProfile')
  ✓ renders hero photo full-width
  ✓ shows venue name, address, neighborhood
  ✓ shows opening hours with today highlighted
  ✓ includes SunTimeline in detail mode
  ✓ has Directions CTA button
  ✓ has Share button
  ✓ calls onClose when back arrow tapped
  ✓ calls onClose on swipe down
  ✓ Escape key triggers onClose
  ✓ has role="dialog" and aria-modal="true"
```

#### `test/components/composed/VenueProfileContent.test.tsx`
```
describe('VenueProfileContent')
  ✓ renders all sections: photo, name, address, hours, timeline, actions
  ✓ mobile layout renders full-width photo
  ✓ desktop layout renders panel-width photo
  ✓ Directions button links to Google Maps with correct coordinates
  ✓ Share button uses Web Share API when available
  ✓ Share button falls back to clipboard copy
  ✓ handles venue without photo gracefully
  ✓ handles venue without opening hours gracefully
```

#### `test/components/ui/VenuePhoto.test.tsx`
```
describe('VenuePhoto')
  ✓ renders Next.js Image with provided URL
  ✓ shows fallback gradient when imageUrl is null/undefined
  ✓ fallback shows venue initial letter
  ✓ applies 4:3 aspect ratio for card variant
  ✓ applies 16:9 aspect ratio for hero variant
  ✓ has alt text with venue name
  ✓ image loads lazily
```

#### `test/lib/hooks/useVenueSelectionFlow.test.ts`
```
describe('useVenueSelectionFlow')
  ✓ initial state is "browsing"
  ✓ selectVenue transitions from "browsing" to "selected"
  ✓ openDetail transitions from "selected" to "detail"
  ✓ dismiss from "detail" returns to "selected"
  ✓ dismiss from "selected" returns to "browsing"
  ✓ stores previous zoom level on select
  ✓ returns previous zoom level on deselect
  ✓ selecting new venue while selected updates venueId without resetting flow
```

#### `test/lib/hooks/useCarouselSync.test.ts`
```
describe('useCarouselSync')
  ✓ scrolls carousel to selected venue when map marker clicked
  ✓ selects map marker when carousel card tapped
  ✓ clears selection when deselected from either source
  ✓ handles venue not found in carousel gracefully
```

### Existing Tests to Update

These existing test files need modifications to work with the new component structure:

| Existing Test File | Changes Needed |
|-------------------|----------------|
| `e2e/tests/home.spec.ts` | Update selectors: replace BottomCardTray with VenueCarousel (mobile), remove side panel list references (desktop) |
| `e2e/tests/card-tray-states.spec.ts` | Replace with carousel state tests or retire |
| `e2e/tests/map-card-sync.spec.ts` | Update to test carousel↔map sync instead of tray↔map sync |
| `e2e/tests/venue-detail.spec.ts` | Update to test new overlay/panel detail views |
| `e2e/tests/responsive-layout.spec.ts` | Update layout expectations for new mobile/desktop patterns |
| `e2e/tests/visual-regression.spec.ts` | Update baseline screenshots |
| `e2e/pages/HomePage.ts` | Add selectors for carousel, selected-card, detail overlay, popup |
| `e2e/pages/VenueDetailPage.ts` | Update for new overlay/panel structure |
| `test/components/custom/BottomCardTray.test.tsx` | Keep until BottomCardTray is fully removed, then delete |
| `test/components/custom/VenueCard.test.tsx` | Keep until VenueCard is fully removed, then delete |
| `test/components/custom/VenueDetailSheet.test.tsx` | Keep until VenueDetailSheet is removed, then delete |
| `test/components/custom/MiniTimeline.test.tsx` | Keep alongside new SunTimeline tests; retire when MiniTimeline is deprecated |
| `test/components/custom/MapContainerSelection.test.ts` | Update selection assertions (pin icons instead of circles, new zoom behavior) |

### Test Infrastructure Updates

**New E2E Page Objects:**
```typescript
// e2e/pages/VenueCarouselSection.ts
class VenueCarouselSection {
  readonly container: Locator;       // [data-testid="venue-carousel"]
  readonly cards: Locator;           // [data-testid="venue-photo-card"]
  readonly skeletonCards: Locator;   // [data-testid="venue-card-skeleton"]
  
  async scrollToCard(index: number): Promise<void>;
  async tapCard(index: number): Promise<void>;
  async getSelectedCardIndex(): Promise<number>;
  async isVisible(): Promise<boolean>;
}

// e2e/pages/SelectedVenueCardSection.ts
class SelectedVenueCardSection {
  readonly container: Locator;       // [data-testid="selected-venue-card"]
  readonly venueName: Locator;       // [data-testid="venue-name"]
  readonly address: Locator;         // [data-testid="venue-address"]
  readonly openingHours: Locator;    // [data-testid="opening-hours"]
  readonly merInfoButton: Locator;   // [data-testid="mer-info-button"]
  readonly timeline: Locator;        // [data-testid="sun-timeline"]
  
  async isVisible(): Promise<boolean>;
  async tapMerInfo(): Promise<void>;
  async swipeDown(): Promise<void>;
}
```

```typescript
// e2e/pages/VenueDetailProfilePage.ts (mobile overlay)
class VenueDetailProfilePage {
  readonly overlay: Locator;          // [data-testid="venue-detail-profile"]
  readonly heroPhoto: Locator;        // [data-testid="venue-hero-photo"]
  readonly venueName: Locator;
  readonly address: Locator;
  readonly openingHours: Locator;
  readonly timeline: Locator;
  readonly directionsButton: Locator; // [data-testid="directions-cta"]
  readonly shareButton: Locator;
  readonly backButton: Locator;
  
  async isVisible(): Promise<boolean>;
  async tapDirections(): Promise<void>;
  async tapBack(): Promise<void>;
  async swipeDown(): Promise<void>;
}

// e2e/pages/VenueDetailPanelSection.ts (desktop panel)
class VenueDetailPanelSection {
  readonly panel: Locator;            // [data-testid="venue-detail-panel"]
  readonly heroPhoto: Locator;
  readonly venueName: Locator;
  readonly closeButton: Locator;      // [data-testid="panel-close"]
  readonly directionsButton: Locator;
  readonly timeline: Locator;
  
  async isVisible(): Promise<boolean>;
  async tapClose(): Promise<void>;
  async getPanelWidth(): Promise<number>;
}
```

```typescript
// e2e/pages/MapPopupSection.ts (desktop popup)
class MapPopupSection {
  readonly popup: Locator;            // .maplibregl-popup [data-testid="map-popup"]
  readonly venuePhoto: Locator;
  readonly venueName: Locator;
  readonly merInfoLink: Locator;
  
  async isVisible(): Promise<boolean>;
  async tapMerInfo(): Promise<void>;
}
```

**New E2E helper — map zoom assertions:**
```typescript
// e2e/helpers/map.ts
async function getMapZoom(page: Page): Promise<number>;
async function getMapCenter(page: Page): Promise<[number, number]>;
async function waitForFlyToComplete(page: Page): Promise<void>;
async function clickMapBackground(page: Page): Promise<void>;
async function clickMapMarker(page: Page, venueId: string): Promise<void>;
```

**Required `data-testid` attributes on new components:**
- `venue-carousel` — carousel container
- `venue-photo-card` — individual card in carousel
- `selected-venue-card` — mobile selected card
- `venue-name`, `venue-address`, `opening-hours` — venue info fields
- `mer-info-button` — "Mer info" CTA on mobile
- `sun-timeline` — timeline component
- `venue-detail-profile` — mobile detail overlay
- `venue-detail-panel` — desktop detail panel
- `venue-hero-photo` — hero photo in detail views
- `directions-cta` — directions button
- `panel-close` — desktop panel close button
- `map-popup` — desktop floating popup

### Test Phasing — When to Write Each Test

| Phase | New E2E Tests | New Unit Tests | Existing Tests to Update |
|-------|--------------|----------------|--------------------------|
| Phase 0 (Data) | — | Type assertion tests for new fields | — |
| Phase 1 (PhotoCard) | — | `VenuePhotoCard.test.tsx`, `VenuePhoto.test.tsx` | — |
| Phase 2 (Carousel) | `venue-carousel.spec.ts` | `VenueCarousel.test.tsx`, `useCarouselSync.test.ts` | `home.spec.ts`, `HomePage.ts` |
| Phase 3 (Selected) | `venue-select-mobile.spec.ts`, `zoom-behavior.spec.ts`, `sun-timeline.spec.ts` | `SelectedVenueCard.test.tsx`, `SunTimeline.test.tsx`, `useVenueSelectionFlow.test.ts` | `map-card-sync.spec.ts`, `MapContainerSelection.test.ts` |
| Phase 4 (Desktop) | `venue-select-desktop.spec.ts`, `venue-detail-desktop.spec.ts` | `MapPopup.test.tsx`, `VenueDetailPanel.test.tsx` | `responsive-layout.spec.ts`, `HomePage.ts` |
| Phase 5 (Detail Mobile) | `venue-detail-mobile.spec.ts` | `VenueDetailProfile.test.tsx`, `VenueProfileContent.test.tsx` | `venue-detail.spec.ts`, `VenueDetailPage.ts` |
| Phase 6 (Shadows) | `map-markers.spec.ts` (shadow subset) | — | `visual-regression.spec.ts` |
| Phase 7 (Polish) | `responsive-layout-new.spec.ts`, `map-markers.spec.ts` (full) | — | `card-tray-states.spec.ts` (retire), `visual-regression.spec.ts` (new baselines) |

### Tests NOT to Modify

All `/admin` route tests remain untouched:
- `e2e/tests/admin-auth.spec.ts`
- `e2e/tests/admin-dashboard.spec.ts`
- `e2e/tests/admin-venue-crud.spec.ts`
- `e2e/tests/admin-venue-filtering.spec.ts`
- `e2e/pages/AdminLoginPage.ts`
- `e2e/pages/AdminDashboardPage.ts`
- `e2e/pages/AdminVenueEditPage.ts`
- `e2e/pages/AdminVenueNewPage.ts`
- `e2e/pages/AdminVenueFilteringPage.ts`
- `e2e/pages/AdminAccuracyDetailPage.ts`
- All `__tests__/api/admin/` unit tests


---

## Scope Exclusions

The following are explicitly **out of scope** for this refactor:
- `/admin` routes, components, and tests — no changes
- Backend API routes (`app/api/`) — no changes beyond adding new fields to response (Phase 0)
- Solar calculation engine (`lib/solar/`) — no changes to algorithms
- Weather integration (`lib/weather/`) — no changes
- Authentication flow (`lib/hooks/useAuth`, `lib/context/AuthContext`) — no changes
- PWA/Service worker (`public/sw.js`) — no changes
- SEO routes (`app/robots.ts`, `app/sitemap.ts`) — no changes
- i18n translations — additions only (new UI strings), no changes to existing keys

---

## Final Checklist

Before marking the refactor complete, verify:

- [ ] All 5 concept screens are implemented and match the visual designs
- [ ] Mobile click flow works: tap marker → zoom + card → "Mer info" → overlay → dismiss → zoom out
- [ ] Desktop click flow works: click marker → zoom + popup → "Mer info" → panel → close → zoom out
- [ ] Map markers are pin icons (not circles), color-coded by status
- [ ] Building shadows render at close zoom
- [ ] Venue photos display on all cards, popups, and detail views (with fallback)
- [ ] SunTimeline shows weather icons and hour labels
- [ ] All new Playwright E2E tests pass across 3 viewports (mobile, tablet, desktop)
- [ ] All new Vitest unit tests pass
- [ ] All existing admin tests still pass (unmodified)
- [ ] WCAG 2.1 AA accessibility audit passes on all new components
- [ ] `/v/[slug]` direct URL still works for SEO
- [ ] `prefers-reduced-motion` respected everywhere (jumpTo instead of flyTo, no animations)
- [ ] Performance: carousel lazy-loads images, shadow computation is debounced
