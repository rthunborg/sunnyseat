# SunnySeat Design System

Extracted from Figma file: `SunnySeat` (key: `Oh75qPnFfSWKHSsyVSBQbT`)
Source frames: all frames on Page 1 (20+ screens including mobile and desktop variants)
Last audited: 2026-04-06

---

## Colour Palette

### Backgrounds & Surfaces

| Token | Hex | Usage |
|---|---|---|
| `color-surface-cream` | `#fdfaf4` | Primary surface — bottom sheets, cards, nav bars, page backgrounds |
| `color-surface-root` | `#fbf8fc` | Root app frame background. Covered by the map sand layer in map views, but shows through glass/frosted elements as the source of `color-glass-lavender`. Verified: this is the actual fill on `map-primary-mobile` and `premium-planner-uppsell` frames, not a canvas artefact. |
| `color-surface-sand` | `#f5f0e6` | Map background (warm sand), sits above `color-surface-root` |
| `color-surface-muted` | `#f5f3f6` | Section backgrounds, search bar fill (light purple-grey) |
| `color-surface-icon-bg` | `#eae7eb` | Icon circle backgrounds in detail rows |
| `color-surface-slider-track` | `#f0edf1` | Time slider track background |

### Amber / Sun Palette (Primary Brand)

| Token | Hex | Usage |
|---|---|---|
| `color-amber-pin` | `#f1b100` | Sunny venue map pin background |
| `color-amber-primary` | `#ffbf00` | **Fill use only** — sun badge backgrounds, CTA button fills, sun badge overlay, timeline bar gradient |
| `color-amber-text` | `#fbbc00` | **Text use only** — sun exposure percentage label on venue cards ("95%", "82%", "65%"). Appears across all venue list and detail card frames. Note: only 4 RGB units from `color-amber-primary` (#ffbf00 = rgb 255,191,0 vs #fbbc00 = rgb 251,188,0) but consistently distinct in Figma — do not consolidate. |
| `color-amber-pale` | `#ffe088` | Premium "Säsongskortet" label tag background |
| `color-amber-gold` | `#d4af37` | Gradient start on timeline bar, route button gradient |
| `color-amber-dark` | `#735c00` | Interactive/functional amber text: sun time ranges ("Sol 13:00–18:30"), time indicators, active slider tick, "ÖPPNA I KARTOR" links, back navigation, pricing display. The primary amber for readable functional text. |
| `color-amber-cta-text` | `#554300` | All amber CTA button labels: "Lämna ett omdöme", "Ge oss feedback", "Visa Säsongskortet", "Skicka", "Använd min plats", "Hitta soliga platser nu". Also the sun badge percentage text ("85%", "95% SOL") and the 6.65px "Säsongskortet" micro-label. Note: Figma uses `#574500` (rgb 87,69,0) on the micro-label vs `#554300` (rgb 85,67,0) on buttons — a 2-unit difference that is a rounding artefact; use `#554300` for all. |
| `color-amber-badge-text` | `#5c4300` | Badge label text — "ÖPPET · {time}" sun badge on the venue detail header. Darkened from `#6d5000` in Story 11.6: axe read the old value at 4.47:1 on `color-amber-primary` (#ffbf00), a boundary flake below the 4.5:1 AA threshold; `#5c4300` (~5.6:1) clears AA with headroom. |
| `color-amber-overlay` | `rgba(255, 191, 0, 0.3)` | Amber tint overlay (upsell icon background circle) |
| `color-amber-location-dot` | `#d97706` | User-location "you-are-here" dot fill (`UserPin`). Tailwind amber-600, the byte-for-byte `Pins.jsx` reference value; tokenized in Story 11.5 (was a raw literal — the Story-9.5 token gap). Decorative non-text mark (`aria-hidden`), so no AA text-contrast bump applies. |

> **Removed:** `color-amber-deeper` (#574500) — consolidated into `color-amber-cta-text` (#554300). The 2-unit RGB difference was a Figma rounding artefact, not an intentional design distinction.

### Text

| Token | Value | Usage |
|---|---|---|
| `color-text-primary` | `#1b1b1e` | Primary headings, venue names, key labels |
| `color-text-logo` | `#1c1917` | Logo wordmark |
| `color-text-body` | `#4d4635` | Body text, descriptions, secondary labels |
| `color-text-muted` | `rgba(77, 70, 53, 0.6)` | Slider tick labels, inactive helper text |
| `color-text-faint` | `rgba(77, 70, 53, 0.4)` | Bullet separators, decorative text |

### UI & Interactive

| Token | Hex | Usage |
|---|---|---|
| `color-tab-active` | `#b45309` | Active bottom-nav tab label (AA-passing on `surface-cream`; bumped from `#d97706` in Story 1.6 Task 5) |
| `color-tab-inactive` | `#57534e` | Inactive bottom-nav tab label (AA-passing on `surface-cream`; bumped from `#a8a29e` in Story 1.6 Task 5) |
| `color-pin-shaded` | `#e4e1e5` | Single not-sunny map pin background for <=50% sunlit seating and weather-gated venues |
| `color-pin-obscured` | `#5e6a7a` | "Sol bakom moln" obscured venue badge/fill for non-pin explanatory surfaces. Story 12.6 removed the separate obscured map-pin state; weather-gated map pins use `color-pin-shaded`. White text on it = 5.50:1 (AA). |
| `color-obscured-text` | `#41505f` | Obscured-state label/body text ("Sol bakom moln", muted status labels). AA on white/cream/sand (8.28:1 / 7.94:1 / 7.29:1). |
| `color-drag-handle` | `#d6d3d1` | Venue detail drag handle pill |
| `color-drag-handle-map` | `#d0c5af` | Map bottom sheet drag handle (rendered at 40% opacity) |
| `color-divider` | `#e7e5e4` | Vertical/horizontal dividers |
| `color-border-nav` | `#f5f5f4` | Bottom nav bar top border |
| `color-map-line` | `#e8e2d5` | Decorative map road lines (rendered at 40% opacity) |
| `color-error` | `#ba1a1a` | Warning/error text (e.g. "Blir skuggigt om 45 min") |

### White & Glass Overlays

| Token | Value | Usage |
|---|---|---|
| `color-white` | `#ffffff` | Pin borders, slider thumb border |
| `color-glass-standard` | `rgba(255, 255, 255, 0.8)` | Standard frosted-glass buttons (map controls, search bar) |
| `color-glass-slider` | `rgba(255, 255, 255, 0.9)` | Time slider panel glass background |
| `color-glass-lavender` | `rgba(251, 248, 252, 0.8)` | Favourite/bookmark button glass — tint derived from `color-surface-root` (#fbf8fc) at 80% opacity |

### Gradients

| Token | Value | Usage |
|---|---|---|
| `gradient-route-button` | `linear-gradient(169deg, #d4af37 0%, #ffbf00 100%)` | "Visa Rutt" primary route button |
| `gradient-cta-amber` | `linear-gradient(171deg, #d4af37 0%, #ffbf00 100%)` | Feedback/validation CTA buttons |
| `gradient-premium-button` | `linear-gradient(174deg, #d4af37 0%, #ffbf00 100%)` | Premium upsell "Visa Säsongskortet" button |
| `gradient-map-overlay` | `linear-gradient(66deg, rgba(245,158,11,0.0125) 0%, rgba(245,158,11,0) 50%, rgba(249,115,22,0.025) 100%)` | Subtle warm map tint overlay (Story 11.5: thinned to ~¼ strength so the basemap reads clearly; the companion `bg-surface-sand` wash also dropped from /80 → /20 in `MapContainer.tsx`) |
| `gradient-onboarding` | `linear-gradient(180deg, #ffb347 0%, #d4af37 42%, #735c00 100%)` | First-visit onboarding screen full-bleed background |
| `gradient-timeline-bar` | `linear-gradient(90deg, rgba(115,92,0,0.2), #d4af37 50%, rgba(115,92,0,0.2))` | Sun exposure timeline gradient bar |
| `gradient-sun-burst-warm` | `radial-gradient(circle, rgba(255,240,180,0.55) 0%, rgba(255,240,180,0) 60%)` | Onboarding decorative top sun burst |
| `gradient-sun-burst-amber` | `radial-gradient(circle, rgba(255,191,0,0.5) 0%, rgba(255,191,0,0) 65%)` | Onboarding decorative bottom amber burst |
| `gradient-wordmark-sun` | `radial-gradient(circle, #fff6d6 0%, #ffbf00 100%)` | Sun glyph filling beside the onboarding wordmark |

---

## Typography

### Font Families

| Family | Role |
|---|---|
| **Plus Jakarta Sans** | Display text — headings, logo, badges, slider timestamps |
| **Manrope** | UI text — labels, body copy, tab labels, CTA text, helper text |

Both fonts must be loaded via `next/font` or equivalent. No fallback system fonts should be used in rendered UI.

### Type Scale

| Token | Size | Weight | Family | Line Height | Usage |
|---|---|---|---|---|---|
| `text-display-xl` | 28px | ExtraBold (800) | Plus Jakarta Sans | 36px | Venue name on detail screen (mobile h1) |
| `text-display-lg` | 24px | ExtraBold (800) | Plus Jakarta Sans | 32px | Logo wordmark, desktop section headings |
| `text-display-sm` | 16px | ExtraBold (800) | Plus Jakarta Sans | 24px | Sun badge percentage overlay ("85%", "95%") — verified from Figma node 56:48 |
| `text-heading-xl` | 24px | Bold (700) | Plus Jakarta Sans | 30px | Card section headline |
| `text-heading-lg` | 20px | Bold (700) | Plus Jakarta Sans | 25px | Feedback card heading |
| `text-heading-md` | 18px | Bold (700) | Plus Jakarta Sans | 22.5px | Card title in list |
| `text-heading-sm` | 14px | Bold (700) | Plus Jakarta Sans | 20px | Sub-section labels (uppercase) |
| `text-body-lg` | 16px | Medium (500) | Manrope | 26px | Venue description body |
| `text-body-md` | 15px | Regular (400) | Manrope | 24.4px | Feedback copy, community text |
| `text-body-sm` | 14px | Regular (400) | Manrope | 20px | Detail list body (address, hours) |
| `text-body-sm-medium` | 14px | Medium (500) | Manrope | 20px | Semi-emphasis body text |
| `text-label-lg` | 14px | Bold (700) | Manrope | 20px | Sun time range, sun percentage labels |
| `text-label-md` | 12px | Bold (700) | Manrope | 16px | Badge text, "SOL NU", map link text |
| `text-label-sm` | 11px | SemiBold (600) | Manrope | 16.5px | Bottom nav tab labels (uppercase) |
| `text-label-xs` | 10px | Bold (700) | Manrope | 15px | Map pin percentage text |
| `text-label-xs-medium` | 10px | Medium (500) | Manrope | 15px | Slider tick marks |
| `text-date` | ~12px (11.97px in Figma) | Regular (400) | Plus Jakarta Sans | 18.6px | Date display in time slider |
| `text-time` | 14px | ExtraBold (800) | Plus Jakarta Sans | 21px | Current time indicator on slider |

### Letter Spacing

| Context | Tracking |
|---|---|
| Venue name h1 (large) | `-0.75px` |
| Logo, section headings | `-0.6px` |
| Medium headings | `-0.5px` |
| Tab labels (uppercase) | `+0.55px` |
| Badge text (uppercase) | `+0.6px` |
| Timeline labels (uppercase) | `+1px` |
| Section sub-labels (uppercase) | `+1.4px` |

### Text Transform

Uppercase applied to: bottom nav tab labels, badge labels (SOL NU, SOL IDAG), section sub-labels, timeline time markers, premium upsell micro-label.

---

## Spacing Scale

The design uses an 8px base grid with 4px half-steps for tight compositions.

| Token | Value | Usage |
|---|---|---|
| `space-1` | 2px | Tight gap between label sub-lines |
| `space-2` | 4px | Icon-to-badge offset, small padding |
| `space-3` | 6px | Drag handle top inset, icon-label gaps |
| `space-4` | 8px | Pin horizontal padding, standard small padding |
| `space-5` | 10px | Pin vertical padding |
| `space-6` | 12px | Drag handle bottom, badge pill padding, gap between cards |
| `space-8` | 16px | Standard section gap, horizontal screen padding, button padding |
| `space-10` | 20px | Card section padding, slider panel vertical |
| `space-12` | 24px | Section-to-section gap, screen top inset, card padding |
| `space-16` | 32px | Large section spacing |

### Component Sizes

| Token | Value | Usage |
|---|---|---|
| `size-badge-sm` | 28px × 28px | Amber sun badge overlay on card image |
| `size-button-xs` | 32px × 32px | Filter/icon button (desktop nav) |
| `size-button-sm` | 40px × 40px | Secondary floating buttons (share, favourite) |
| `size-button-md` | 48px × 48px | Primary floating buttons (map controls, route) |
| `size-drag-pill-w` | 40px | Drag handle pill width (map bottom sheet) |
| `size-drag-pill-w-lg` | 48px | Drag handle pill width (venue detail sheet) |
| `size-drag-pill-h` | 6px | Drag handle pill height |
| `size-bottom-sheet-peek-h` | 120px | Venue-list mobile peek sheet height |
| `size-bottom-sheet-mid-h` | 320px | Venue-list mobile default/mid sheet height |
| `size-bottom-sheet-full-h` | 560px | Venue-list mobile full snap height; capped by viewport in CSS so it remains distinct from the 320px mid snap |
| `size-bottom-sheet-full-top` | 22dvh | Legacy full-sheet top offset retained only for migration notes; active mobile venue list uses `size-bottom-sheet-full-h` |
| `size-quick-info-mobile-w` | 230px | Mobile selected-venue map callout width |
| `size-venue-list-desktop-w` | 340px | Desktop venue-list overlay width in refreshed MVP references |
| `size-venue-detail-panel-w` | 390px | Desktop venue-detail overlay width |
| `size-search-desktop-w` | 384px | Desktop search bar width |
| `size-venue-card` | 76px | Minimum standard venue-list row height |
| `size-venue-card-skeleton` | 88px | Venue-list loading skeleton row height |
| `size-venue-card-thumb` | 60px × 60px | Standard venue-list thumbnail |
| `size-venue-card-thumb-compact` | 64px × 64px | Compact venue-list thumbnail |
| `size-venue-card-skeleton-image` | 87px × 72px | Venue-list loading skeleton image placeholder |
| `size-venue-detail-hero-mobile` | 220px height | Venue detail mobile hero placeholder/image area |
| `size-venue-detail-hero-desktop` | 200px height | Venue detail desktop panel hero placeholder/image area |
| `size-slider-thumb` | 14.1px × 14.1px | Time slider thumb |
| `size-slider-track-h` | 6px | Time slider / timeline bar height |
| `size-timeline-h` | 12px | Venue detail timeline bar height |

---

## Border Radii

| Token | Value | Usage |
|---|---|---|
| `radius-pill` | `9999px` | All pill shapes — buttons, pins, badges, nav tabs, search bar |
| `radius-sheet-full` | `40px` | Bottom sheet top corners (fully expanded) |
| `radius-panel` | `32px` | Bottom sheet peek state corners, time slider panel |
| `radius-badge` | `24px` | Sun badge overlay, icon background circles |
| `radius-card` | `16px` | Info section cards (soltider, details) |
| `radius-venue-image` | `12px` | Venue image thumbnail, review/feedback cards, upsell card |
| `radius-premium-tag` | `4px` | Inline premium label tag background |

---

## Shadow Values

### Warm Amber Shadows (brand-tinted)

| Token | Value | Usage |
|---|---|---|
| `shadow-card` | `0px 12px 32px 0px rgba(115, 92, 0, 0.08)` | Cards, map pins, desktop navbar |
| `shadow-card-up` | `0px -12px 32px 0px rgba(115, 92, 0, 0.08)` | Time slider panel (casts upward) |
| `shadow-sheet-full-up` | `0px -12px 48px 0px rgba(0, 0, 0, 0.1)` | Venue detail full-screen sheet (upward) |
| `shadow-route-button` | `0px 15.3px 19.2px -3.8px rgba(115, 92, 0, 0.2), 0px 6.1px 7.7px -4.6px rgba(115, 92, 0, 0.2)` | Route/CTA primary button warm glow |
| `shadow-wordmark-sun` | `0 0 16px rgba(255, 240, 180, 0.7)` | Decorative glow on the onboarding wordmark sun glyph |

### Neutral Shadows

| Token | Value | Usage |
|---|---|---|
| `shadow-sheet-peek-up` | `0px -8px 24px 0px rgba(0, 0, 0, 0.06)` | Bottom sheet in peek state |
| `shadow-nav-up` | `0px -4px 12px 0px rgba(0, 0, 0, 0.03)` | Bottom navigation bar |
| `shadow-button-float` | `0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.1)` | Floating icon buttons (map controls) |
| `shadow-button-sm` | `0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)` | Small floating buttons (share, favourite) |
| `shadow-cta` | `0px 4px 8px 0px rgba(51, 65, 85, 0.13)` | Amber CTA buttons |
| `shadow-subtle` | `0px 1px 2px 0px rgba(0, 0, 0, 0.05)` | Subtle — shaded pin, small badges |

---

## Backdrop Blur

| Token | Value | Usage |
|---|---|---|
| `blur-standard` | `6px` | Standard glass overlay — search bar, map control buttons |
| `blur-heavy` | `12px` | Premium glass — time slider panel, favourite buttons, bottom sheet |
| `blur-subtle` | `1.5px` | Background layer decorative blur |

---

## Transitions & Motion

These are the **default** transition values for micro-interactions and state changes. Screen-specific animation timings (entrance/exit of sheets, map pan, slider drag) are defined in the UX behaviour spec and override these defaults.

| Token | Value | Usage |
|---|---|---|
| `duration-fast` | `150ms` | Icon state changes, tab switches, badge updates |
| `duration-default` | `200ms` | Button hover/press, opacity fades, colour transitions |
| `duration-slow` | `300ms` | Panel reveals, card expansions, sheet peek-to-rest |
| `duration-detail-exit` | `250ms` | Venue detail sheet/panel dismissal. JS reads `DURATION_DETAIL_EXIT_S` from `lib/constants/animation.ts`; CSS reads `--duration-detail-exit`. |
| `ease-default` | `ease-in-out` | Standard interactive transitions |
| `ease-enter` | `ease-out` | Elements entering the screen (decelerate into place) |
| `ease-exit` | `ease-in` | Elements leaving the screen (accelerate out) |
| `ease-spring` | `cubic-bezier(0.22, 1, 0.36, 1)` | Smooth deceleration for drag-release and sheet settle. No overshoot — appropriate for a precise map UI. The previously noted `cubic-bezier(0.34, 1.56, 0.64, 1)` had a noticeable bounce (value 1.56 > 1) which is too playful for this context; replaced with a clean fast-in/slow-out curve consistent with iOS Maps / Material sheet behaviour. |
| `duration-fly` | `500ms` | MapLibre `flyTo()` (locate-me, recentre). JS reads `DURATION_FLY_MS` from `lib/constants/animation.ts`; CSS reads `--duration-fly`. |

> Screen-specific timings in the UX spec (e.g. bottom sheet drag, map pin transitions, slider thumb) always take precedence. Use `prefers-reduced-motion` to disable or reduce non-essential animations.

---

## Breakpoints

The Figma file contains both mobile (390px) and desktop (1280px) frame variants. The type scale and spacing are **uniform across breakpoints** — no separate scale per viewport. Responsive adaptation is primarily structural (layout reflow) not typographic.

| Breakpoint | Width | Notes |
|---|---|---|
| `bp-mobile` | `375px` | Minimum supported width. All mobile frames designed at 390px. |
| `bp-tablet` | `768px` | No dedicated Figma frames — use mobile layout up to desktop breakpoint. |
| `bp-desktop` | `1024px` | Desktop frames start at 1280px; this is the minimum desktop trigger. |
| `bp-wide` | `1440px` | Wide desktop. Nav and panel widths cap out at ~1280px content area. |

### Per-breakpoint differences observed in Figma

| Token / Component | Mobile | Desktop |
|---|---|---|
| Screen padding (horizontal) | `space-8` (16px) | `space-12` (24px) |
| Bottom navigation | Fixed 52px bar with `Nära mig` + `Favoriter` | Not present — replaced by top navbar |
| Top navbar | Top floating glass time/date chrome | Fixed top bar with logo + search (84px) |
| Time slider panel | Top overlay within page padding | Bottom overlay above map canvas |
| Venue list | Bottom sheet (peek/mid/full) | Overlay side panel — **340px wide** in the refreshed MVP Desktop Unlocked reference; the panel overlays the map canvas, it is not a sidebar that reduces canvas width |
| Venue detail | Full-screen bottom sheet | Desktop overlay component — 390px wide (`venue-detail-component-desktop` frame) |
| Search bar width | Full width minus `space-8` margins | Fixed 384px |

The **type scale does not change** at desktop. `text-display-xl` (28px) stays 28px regardless of viewport.

---

## Z-Index Scale

Layering is significant in SunnySeat — map pins, bottom sheets, glass overlays, and floating buttons must stack correctly.

| Token | Value | Layer |
|---|---|---|
| `z-base` | `0` | Map canvas, flat content areas |
| `z-pin` | `10` | Venue map pins (sunny and shaded) |
| `z-bottom-sheet-peek` | `20` | Bottom sheet in peek state, side panel |
| `z-floating-buttons` | `30` | Map control buttons (zoom, location), floating action buttons |
| `z-glass-panel` | `40` | Time slider glass panel, search overlay, bottom navigation bar |
| `z-bottom-sheet-full` | `50` | Venue detail sheet fully expanded |
| `z-modal` | `50` | Modals, overlays (same level as full sheet — only one active at a time) |
| `z-toast` | `60` | Toast/snackbar notifications — always above all content |

> The bottom navigation bar (`z-glass-panel`, 40) sits above the floating map buttons (30) because it is fixed chrome. The time slider panel is part of the header bar and shares this level.

---

## Component Patterns

### Map Venue Pin — Sunny

Public sunny is exactly `sunExposurePercent > 50 && weatherGateState !== 'gated'`.
Selection, hover, partner, and focus treatments may add emphasis, but must not create
another data shape.

```
Background: color-amber-pin (#f1b100)
Border: 2px solid color-white (#ffffff)
Border-radius: radius-pill (9999px)
Shadow: shadow-card
Padding: space-5 (10px) vertical, space-4 (8px) horizontal
Text: text-label-xs / color-amber-cta-text (#554300) seating-share percentage
Icon: decorative sun
```

### Map Venue Pin — Not Sunny

Not-sunny pins are the only grey map-pin presentation. They cover `Shaded`, `NoSun`,
low `Partial`, exactly 50%, and weather-gated `CloudObscured` venues. The pin exposes
the cloud icon and no visible percentage or text.

```
Background: color-pin-shaded (#e4e1e5)
Border: 1px solid rgba(255,255,255,0.2)
Border-radius: radius-pill
Shadow: shadow-subtle
Opacity: 0.8 on the wrapper
Padding: space-2 (4px) vertical, space-6 (12px) horizontal + space-1 (2px) icon gap
Icon: decorative cloud / color-text-body (#4d4635)
```

### Floating Glass Button (48px)

```
Background: color-glass-standard (rgba(255,255,255,0.8))
Backdrop-blur: blur-standard (6px)
Border-radius: radius-pill
Shadow (separate layer): shadow-button-float
Size: size-button-md (48px × 48px)
```

### Bottom Sheet — Peek State

```
Background: color-surface-cream (#fdfaf4)
Border-radius: radius-panel (32px) on top corners only
Shadow: shadow-sheet-peek-up
Height: 100px above the nav bar
Drag handle: size-drag-pill-w (40px) wide × size-drag-pill-h (6px) tall
             color-drag-handle-map (#d0c5af) at 40% opacity, radius-pill
             Padding above pill: space-6 (12px), below: space-4 (8px)
```

### Bottom Sheet — Venue Detail Full

```
Background: color-surface-cream (#fdfaf4)
Border-radius: radius-sheet-full (40px) on top corners only
Shadow: shadow-sheet-full-up
Drag handle: size-drag-pill-w-lg (48px) wide × size-drag-pill-h (6px) tall
             color-drag-handle (#d6d3d1), radius-pill
             Padding above pill: space-8 (16px), below: space-4 (8px)
```

### Time Slider Panel

```
Background: color-glass-slider (rgba(255,255,255,0.9))
Backdrop-blur: blur-heavy (12px)
Border-radius: radius-panel (32px)
Shadow: shadow-card-up
Padding: space-10 (20px) vertical, space-12 (24px) horizontal
Track height: size-slider-track-h (6px), background: color-surface-slider-track (#f0edf1), radius-pill
Thumb: size-slider-thumb (14.1px), background: color-amber-dark (#735c00), border: 2.35px color-white, radius-pill
```

### Sun Badge (venue image overlay)

```
Background: rgba(212, 175, 55, 0.9) [color-amber-gold at 90% opacity]
Backdrop-blur: blur-standard (6px)
Border-radius: radius-badge (24px)
Padding: space-3 (6px) vertical, space-6 (12px) horizontal
Gap between icon and text: space-3 (6px)
Text: text-display-sm (16px / ExtraBold / Plus Jakarta Sans / lh 24px) / color-amber-cta-text (#554300)
Icon: 16.5px sun SVG
```

### Amber CTA Button (primary gradient)

```
Background: gradient-cta-amber
Border-radius: radius-pill
Shadow: shadow-cta
Padding: space-2 (4px) vertical, space-6 (12px) horizontal (small), or space-3/space-8 (large)
Text: text-label-lg (14px / Bold / Manrope) / color-amber-cta-text (#554300)
Height: 36–48px (context-dependent — see component size tokens)
```

### Route Button (gold-to-bright-amber gradient)

```
Background: gradient-route-button (gold #d4af37 → bright-amber #ffbf00, same family as gradient-cta-amber)
Border-radius: radius-pill
Shadow: shadow-route-button
Padding: space-4 (8px) vertical, space-5 (10px) horizontal approx.
Gap: space-2 (4px) between icon and label
Text: ~12px / Bold / Manrope / color-amber-cta-text (#554300)
Width: 278px (mobile)
```

### Bottom Navigation Bar

```
Background: color-surface-cream (#fdfaf4)
Border-top: 1px solid color-border-nav (#f5f5f4)
Shadow: shadow-nav-up
Height: 52px (mandatory for current MVP mobile references)
Padding: space-1 (2px) top, space-8 (16px) horizontal
Tabs: Nära mig, Favoriter
Active tab label: text-label-sm / color-tab-active / uppercase
Inactive tab label: text-label-sm / color-tab-inactive / uppercase
```

### Search Bar (desktop)

```
Background: color-surface-muted (#f5f3f6)
Border-radius: radius-pill
Padding: space-4 (8px) vertical, space-8 (16px) horizontal
Text: text-body-sm / color-text-body (#4d4635)
Width: 384px (desktop)
```

### Info Section Card (e.g. Soltider idag)

```
Background: color-surface-muted (#f5f3f6)
Border-radius: radius-card (16px)
Padding: space-10 (20px)
Gap between rows: space-8 (16px)
Section label: text-heading-sm (14px / ExtraBold / Plus Jakarta Sans) / color-text-body / uppercase / tracking-[1.4px]
```

### Venue Card Image Thumbnail

```
Width: 87px, Height: 72px
Border-radius: radius-venue-image (12px)
Sun badge overlay: size-badge-sm (28px × 28px) circle
                   Background: color-amber-primary (#ffbf00)
                   Border: 2px solid color-surface-cream (#fdfaf4)
                   Shadow: shadow-subtle
                   Position: top -space-2 (-4px), right -space-2 (-4px)
```

### Map Background

```
Base fill: color-surface-sand (#f5f0e6)
Decorative lines: color-map-line (#e8e2d5) at 40% opacity
Warm gradient overlay: gradient-map-overlay
```

**Basemap layer recolour (MapLibre paint, not CSS).** The OpenFreeMap "positron" basemap ships a near-grey water/green palette that reads flat and depressing under our tint. A maintainer design review (2026-07-06) asked for bluer water and greener greens while keeping the warm brand overlay. Because the map is a MapLibre canvas (not a DOM surface), these colours cannot live as CSS tokens — they are applied to the loaded style via `map.setPaintProperty` and tokenized as a single named constants block in `lib/constants/map-basemap-colors.ts` (applied by `lib/utils/apply-basemap-colors.ts`, wired in `MapContainer.tsx`). Roads, buildings, boundaries and labels stay at the positron defaults (neutral), so pin/label contrast is unaffected.

| Basemap token (constants) | Value | Usage |
|---|---|---|
| `BASEMAP_WATER_BLUE` | `#7cc0e8` | `water` fill (was grey `rgb(194,200,202)`) — friendly clear blue (chosen a touch deeper than the on-screen target so it survives the warm sand/amber overlay) |
| `BASEMAP_WATERWAY_BLUE` | `#5fb0df` | `waterway` line — slightly stronger blue so thin rivers/canals read through the warm tint |
| `BASEMAP_PARK_GREEN` | `#b6e0a6` | `park` (+ `grass`/`landcover_grass`) fill (was grey-green `rgb(230,233,229)`) — fresh green |
| `BASEMAP_WOOD_GREEN` | `#a6d691` | `landcover_wood` (+ `wood`/`forest`) fill (was grey-green `rgb(220,224,220)`) — a touch deeper green so woods stay distinct from parks |

---

## Elevation Model

Elevation uses a **warm amber shadow system** for interactive elements and a **neutral shadow system** for structural chrome (nav, sheets). Higher elevation = larger spread + stronger warm tint.

| Level | Token | Typical Use |
|---|---|---|
| 0 | (none) | Flat surfaces — section fill areas |
| 1 | `shadow-subtle` | Small badges, shaded pins |
| 2 | `shadow-nav-up` | Bottom nav bar |
| 3 | `shadow-sheet-peek-up` | Bottom sheet peek |
| 4 | `shadow-card` | Cards, desktop navbar, sunny pins |
| 5 | `shadow-button-float` | Floating action buttons |
| 6 | `shadow-cta` | Primary CTA buttons |
| 7 | `shadow-sheet-full-up` | Full venue detail sheet |
| 8 | `shadow-route-button` | Route button (highest — main action) |
