# SunnySeat Design System

Extracted from Figma file: `SunnySeat` (key: `Oh75qPnFfSWKHSsyVSBQbT`)
Source frames: `map-primary-mobile`, `venue-detail-component-mobile`, `premium-planner-uppsell`, `header-navbar-component-desktop`

---

## Colour Palette

### Backgrounds & Surfaces

| Token | Hex | Usage |
|---|---|---|
| `color-surface-cream` | `#fdfaf4` | Primary surface — bottom sheets, cards, nav bars, page backgrounds |
| `color-surface-root` | `#fbf8fc` | Page root background (pale lavender-white) |
| `color-surface-sand` | `#f5f0e6` | Map background (warm sand) |
| `color-surface-muted` | `#f5f3f6` | Section backgrounds, search bar fill (light purple-grey) |
| `color-surface-icon-bg` | `#eae7eb` | Icon circle backgrounds in detail rows |
| `color-surface-slider-track` | `#f0edf1` | Time slider track background |

### Amber / Sun Palette (Primary Brand)

| Token | Hex | Usage |
|---|---|---|
| `color-amber-pin` | `#f1b100` | Sunny venue map pin background |
| `color-amber-primary` | `#ffbf00` | Sun badges, CTA button fills, amber sun badge |
| `color-amber-bright` | `#fbbc00` | Sun percentage text on card list |
| `color-amber-pale` | `#ffe088` | Premium label tag background |
| `color-amber-gold` | `#d4af37` | Gradient start on timeline bar, route button gradient |
| `color-amber-dark` | `#735c00` | Text on amber backgrounds, slider thumb, interactive link colour |
| `color-amber-deeper` | `#574500` | Very small text on light amber labels |
| `color-amber-cta-text` | `#554300` | Button text on amber CTA buttons |
| `color-amber-badge-text` | `#6d5000` | Badge label text (e.g. "SOL NU") |
| `color-amber-overlay` | `rgba(255, 191, 0, 0.3)` | Amber tint overlay (upsell icon background) |

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
| `color-tab-active` | `#d97706` | Active bottom-nav tab label |
| `color-tab-inactive` | `#a8a29e` | Inactive bottom-nav tab label |
| `color-pin-shaded` | `#e4e1e5` | Shaded/low-sun venue pin background |
| `color-drag-handle` | `#d6d3d1` | Venue detail drag handle pill |
| `color-drag-handle-map` | `#d0c5af` | Map bottom sheet drag handle (40% opacity) |
| `color-divider` | `#e7e5e4` | Vertical/horizontal dividers |
| `color-border-nav` | `#f5f5f4` | Bottom nav bar top border |
| `color-map-line` | `#e8e2d5` | Decorative map road lines |
| `color-error` | `#ba1a1a` | Warning/error text (e.g. "Blir skuggigt om 45 min") |

### White & Glass Overlays

| Token | Value | Usage |
|---|---|---|
| `color-white` | `#ffffff` | Pin borders, slider thumb border |
| `color-glass-standard` | `rgba(255, 255, 255, 0.8)` | Standard frosted-glass buttons (map controls) |
| `color-glass-slider` | `rgba(255, 255, 255, 0.9)` | Time slider panel glass background |
| `color-glass-lavender` | `rgba(251, 248, 252, 0.8)` | Favourite/bookmark button glass (lavender tint) |

### Gradients

| Token | Value | Usage |
|---|---|---|
| `gradient-route-button` | `linear-gradient(169deg, #735c00 0%, #d4af37 100%)` | "Visa Rutt" primary route button |
| `gradient-cta-amber` | `linear-gradient(171deg, #d4af37 0%, #ffbf00 100%)` | Feedback/validation CTA buttons |
| `gradient-premium-button` | `linear-gradient(174deg, #d4af37 0%, #ffbf00 100%)` | Premium upsell "Visa Säsongskortet" button |
| `gradient-map-overlay` | `linear-gradient(66deg, rgba(245,158,11,0.05) 0%, rgba(245,158,11,0) 50%, rgba(249,115,22,0.1) 100%)` | Subtle warm map tint overlay |
| `gradient-timeline-bar` | `linear-gradient(90deg, rgba(115,92,0,0.2), #d4af37 50%, rgba(115,92,0,0.2))` | Sun exposure timeline gradient bar |

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
| `text-date` | 12px (scaled ~11.97px) | Regular (400) | Plus Jakarta Sans | 18.6px | Date display in time slider |
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

## Component Patterns

### Map Venue Pin — Sunny

```
Background: color-amber-pin (#f1b100)
Border: 2px solid #ffffff
Border-radius: radius-pill (9999px)
Shadow: shadow-card
Padding: 10px vertical, 8px horizontal
Text: 10px / Bold / Manrope / white
Icon: 16.5px sun SVG
```

### Map Venue Pin — Shaded

```
Background: color-pin-shaded (#e4e1e5)
Border: 1px solid rgba(255,255,255,0.2)
Border-radius: radius-pill
Shadow: shadow-subtle
Opacity: 0.8 on the wrapper
Text: 12px / Bold / Manrope / color-text-body (#4d4635)
```

### Floating Glass Button (48px)

```
Background: color-glass-standard (rgba(255,255,255,0.8))
Backdrop-blur: blur-standard (6px)
Border-radius: radius-pill
Shadow (separate layer): shadow-button-float
Size: 48px × 48px
```

### Bottom Sheet — Peek State

```
Background: color-surface-cream (#fdfaf4)
Border-radius: radius-panel (32px) on top corners only
Shadow: shadow-sheet-peek-up
Drag handle: 40px wide × 6px tall, color-drag-handle-map (#d0c5af) at 40% opacity, radius-pill
```

### Bottom Sheet — Venue Detail Full

```
Background: color-surface-cream (#fdfaf4)
Border-radius: radius-sheet-full (40px) on top corners only
Shadow: shadow-sheet-full-up
Drag handle: 48px wide × 6px tall, color-drag-handle (#d6d3d1), radius-pill
```

### Time Slider Panel

```
Background: color-glass-slider (rgba(255,255,255,0.9))
Backdrop-blur: blur-heavy (12px)
Border-radius: radius-panel (32px)
Shadow: shadow-card-up
Padding: 20px vertical, 24px horizontal
Track height: 6px, background: color-surface-slider-track (#f0edf1), radius-pill
Thumb: 14.1px, background: color-amber-dark (#735c00), border: 2.35px white, radius-pill
```

### Sun Badge (venue image overlay)

```
Background: rgba(212, 175, 55, 0.9) [color-amber-gold at 90% opacity]
Backdrop-blur: blur-standard (6px)
Border-radius: 24px (radius-badge)
Padding: 6px vertical, 12px horizontal
Text: 16px / ExtraBold / Plus Jakarta Sans / #554300
Icon: 16.5px sun
```

### Amber CTA Button (primary gradient)

```
Background: gradient-cta-amber
Border-radius: radius-pill
Shadow: shadow-cta
Text: 14px / Bold / Manrope / color-amber-cta-text (#554300)
Height: 36–48px (context-dependent)
```

### Route Button (gold-to-dark gradient)

```
Background: gradient-route-button
Border-radius: radius-pill
Shadow: shadow-route-button
Text: ~12px / Bold / Manrope / #27272a
Width: 278px (mobile)
```

### Bottom Navigation Bar

```
Background: color-surface-cream (#fdfaf4)
Border-top: 1px solid color-border-nav (#f5f5f4)
Shadow: shadow-nav-up
Height: 40px (mandatory)
Active tab label: 11px / SemiBold / Manrope / color-tab-active (#d97706) / uppercase / tracking-[0.55px]
Inactive tab label: 11px / SemiBold / Manrope / color-tab-inactive (#a8a29e) / uppercase / tracking-[0.55px]
```

### Search Bar (desktop)

```
Background: color-surface-muted (#f5f3f6)
Border-radius: radius-pill
Padding: 8px vertical, 16px horizontal
Text: 14px / Regular / Manrope / color-text-body (#4d4635)
Width: 384px (desktop)
```

### Info Section Card (e.g. Soltider idag)

```
Background: color-surface-muted (#f5f3f6)
Border-radius: radius-card (16px)
Padding: 20px
Section label: 14px / ExtraBold / Plus Jakarta Sans / color-text-body / uppercase / tracking-[1.4px]
```

### Venue Card Image Thumbnail

```
Width: 87px, Height: 72px
Border-radius: radius-venue-image (12px)
Sun badge overlay: 28px × 28px circle, color-amber-primary (#ffbf00), border: 2px solid color-surface-cream, shadow-subtle
Badge position: top-[-4px] right-[-4px]
```

### Map Background

```
Base fill: color-surface-sand (#f5f0e6)
Decorative lines: color-map-line (#e8e2d5) at 40% opacity
Warm gradient overlay: gradient-map-overlay
```

---

## Elevation Model

Elevation in SunnySeat uses a **warm amber shadow system** for interactive elements and a **neutral shadow system** for structural chrome (nav, sheets). Higher elevation = larger spread + stronger warm tint.

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
