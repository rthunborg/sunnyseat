### `onboarding-first-visit`
**Onboarding / First Visit Screen** for SunnySeat.
Explain what SunnySeat does and request location permission — the very first thing a new user sees.
Warm, sunny, confident — full-screen welcome moment that earns trust before asking for location.
- SunnySeat wordmark + one-line value proposition ("Find outdoor spots in direct sun, right now")
- Single illustration or ambient photo (sunny outdoor café in Gothenburg)
- Location permission CTA: "Use my location"
- Secondary: "Use Gothenburg City Centre" (no permission needed)
- Privacy micro-copy: "Location is never stored"

---

### `map-primary`
**Map / Home Screen** for SunnySeat.
Find nearby venues with outdoor seating in direct sun right now.
Warm, earthy, sun-drenched — muted gold and amber venue pins on a clean street map, minimal chrome so the map breathes.
- Interactive map with venue pins (sunny = gold/active, shaded = grey)
- Search bar (venue name or area)
- Desktop: collapsible venues sidebar visible by default
- Mobile: bottom sheet peek bar at ~10% height, draggable up
- Sun confidence badge on each pin

---

### `map-panel-venues`
**Map Panel — Venues List** for SunnySeat.
Browse all venues currently visible on the map viewport, ordered by distance from the user.
Same warm card-style as the map — panel slides in over the map, never replaces it.
- Venue cards (name, sun window, walking distance, sun % badge)
- Auto-updates as user pans/zooms the map
- Tap a card → selects pin and opens `venue-quickinfo`
- Desktop: sidebar with close/collapse toggle
- Mobile: draggable bottom sheet, 10% peek to ~70% screen height

---

### `venue-quickinfo`
**Venue Selected / Quick Info State** for SunnySeat.
Get a fast read on a venue before committing to the full detail view.
Lightweight popup anchored to the selected pin — card-style, doesn't obscure the surrounding map.
- Venue name + sun status icon (sunny / shaded)
- Direct sun window ("14:00 – 19:30")
- Compact sun timeline scrubber
- Venue photo thumbnail
- "See Full Details" CTA → opens `venue-detail`
- Dismiss / deselect closes back to `map-primary`

---

### `venue-detail`
**Venue Detail / Profile Screen** for SunnySeat.
Understand the full sun schedule for a venue and decide whether to go.
Desktop: slide-in right panel over the map. Mobile: full-screen bottom sheet. Warm whites, golden sun timeline bar.
- Hero photo of the outdoor seating area
- Full sun timeline bar with current position marker
- Opening hours
- Address + "Open in Maps" external link
- Directions CTA
- "Was this right?" feedback trigger → opens `feedback-modal`
- Close → returns to `venue-quickinfo` or `map-primary`

---

### `premium-paywall`
**Premium Paywall / Season Pass Screen** for SunnySeat.
Purchase a Season Pass via Swish to unlock future-date sun predictions.
Clean, trust-building — centred modal, price prominent, single primary action, no dark patterns.
- Value proposition summary (what unlocks: date picker, time slider)
- Price display: 39 SEK, one-time, no account required
- Swish payment CTA (mobile: app redirect)
- Trust signals (one-time, no subscription, no PII stored)
- Preview of locked features (time slider + date picker, visually greyed out)
- Close / "Not now" always visible

---

### `premium-paywall-desktop`
**Premium Paywall / Season Pass Screen — Desktop** for SunnySeat.
Same paywall intent as `premium-paywall` but desktop layout shows a Swish QR code to scan with phone.
Two-column layout — value prop left, Swish QR code right. Wider viewport means QR can be large enough to scan comfortably.
- Value proposition and price (left column)
- Generated Swish QR code (right column, large, scannable)
- "Open Swish on your phone and scan" instruction
- QR refresh / regenerate option (QR codes can expire)
- Trust signals and close option

---

### `premium-paywall-processing`
**Premium Paywall — Swish Payment Processing** for SunnySeat.
Swish payment has been initiated — waiting for confirmation from the user's phone.
Calm, reassuring — clear instruction, no spinner anxiety.
- "Open Swish on your phone to confirm" instruction
- Animated waiting indicator (warm, not a generic spinner)
- Payment amount confirmation (39 SEK)
- "Resend Swish request" link after ~30s timeout
- Cancel payment option

---

### `premium-paywall-error`
**Premium Paywall — Payment Failed** for SunnySeat.
Swish payment was declined, timed out, or cancelled.
Clear, non-alarming — error stated plainly, retry is one tap.
- "Payment didn't go through" plain-language message
- Reason if known (cancelled, timed out)
- Retry CTA
- "Try again later" dismissal
- Contact/support link

---

### `premium-planner`
**Premium: Future Sun Planner State** for SunnySeat.
Scrub through any time or date to see predicted shadow coverage across the map.
Same map UI as `map-primary` with date picker and time slider unlocked — subtle premium badge in corner.
- Date picker overlay (calendar)
- Time slider (scrub through hours of chosen day)
- Map shadow overlay updates live as slider moves
- Confidence indicator for selected time
- "Now" shortcut to snap back to real-time
- Premium badge (small, not intrusive)

---

### `premium-planner-locked`
**Premium: Future Sun Planner — Locked / Upsell State** for SunnySeat.
Non-premium user interacts with the time slider or date picker — locked state teases the feature.
Same map, controls visible but clearly locked — not hidden, not obnoxious.
- Date picker and time slider visible, disabled/greyed
- Lock icon on disabled controls
- Inline nudge: "Unlock future planning — 39 SEK, one season"
- Tap on locked control → opens `premium-paywall` (or `premium-paywall-desktop` on desktop)

---

### `feedback-modal`
**Feedback Modal** for SunnySeat.
Report whether the sun prediction was accurate — one-tap contribution from inside the venue detail.
Frictionless bottom sheet (mobile) or centred modal (desktop) — 2 taps, never navigates away.
- Venue name confirmation at top
- "Was it sunny when you arrived?" — Yes / No (large, thumb-friendly)
- Optional: shade level (full shade, partial, brief cloud)
- Submit CTA
- Skip / Close always visible

---

### `verification-modal`
**Venue Seating Verification Modal** for SunnySeat.
Confirm or deny outdoor seating at a candidate venue — triggered from an unverified venue pin.
Minimal, task-focused — same modal treatment as feedback, mobile-first feel.
- Venue name + address
- "Does this place have outdoor seating?" — Yes / No / Not sure
- Optional photo upload
- Community confirmation count
- Submit CTA + Skip / Close

---

### `about`
**About Page** for SunnySeat.
Explain how the sun algorithm works, credit data sources, and set accuracy expectations.
Clean, editorial — light background, long-form readable, no map chrome.
- How sun predictions work (plain-language algorithm explanation)
- Data attributions (Lantmäteriet buildings, Met.no weather, OpenStreetMap)
- Accuracy disclaimer (≥85% target, confidence % explained)
- Contact / feedback link
- Link back to the map

---

### `not-found`
**404 / Not Found Page** for SunnySeat.
User has hit an invalid venue slug or broken URL.
Friendly, on-brand — not a generic browser error, still feels like SunnySeat.
- "We couldn't find that spot" message (venue-specific if slug is present)
- Sun or map illustration
- CTA: "Find sunny spots now" → back to `map-primary`
- No navigation clutter — single clear escape route

---

## Moved to UX Behaviour Spec (not separate Stitch screens)

The following visual states should be documented in the UX behaviour spec with explicit descriptions of what appears and when, rather than generated as standalone Stitch screens:

**Map states:** `map-locating` (pulsing location indicator), `map-empty` (no sunny venues in viewport — message in panel), `map-error` (API/location error — banner with retry CTA), `map-panel-venues-empty` (no venues mapped in area — empty state in panel).

**Venue detail variants:** `venue-detail-partner` (additive golden pin badge + optional promo line on standard `venue-detail` layout), `venue-detail-no-photo` (neutral placeholder in hero photo slot, all other elements unchanged).

**Success confirmations:** `feedback-modal-success` (thank-you text + sun animation, auto-dismiss 2s), `verification-modal-success` (thank-you text, auto-dismiss 2s).

**Payment states:** Already covered as screens (`premium-paywall-processing`, `premium-paywall-error`) since they have distinct layouts.

## Deferred to Later Phase

**Admin app** (12 screens): `admin-login`, `admin-venue-list`, `admin-venue-editor-new`, `admin-venue-editor-edit`, `admin-building-import` (+ processing/complete/error states), `admin-accuracy-dashboard`.

**Partner badge** (3 screens): `partner-sunny-badge-active`, `partner-sunny-badge-inactive`, `partner-sunny-badge-error`.



---- 


## Admin App Screens — `admin.sunnyseat.se`

---

### `admin-login`
**Admin Login Screen** for SunnySeat.
Authenticate to access the management platform.
Minimal, neutral — clearly distinct from the consumer UI. No map, no warmth.
- Email + password fields
- Login CTA
- Session expiry notice if redirected due to timeout
- Small internal wordmark only, no consumer branding

---

### `admin-venue-list`
**Admin Venue List / Dashboard** for SunnySeat.
Browse, search, filter and manage all venues in the database.
Dense, information-rich — data table, light admin aesthetic, action-oriented.
- Searchable/filterable table (name, district, verification status, polygon quality score)
- Status badges (verified, unverified, flagged)
- Quick-action buttons per row (edit, delete)
- Pagination
- "Add Venue" CTA

---

### `admin-venue-editor-new`
**Admin Venue Editor — New Venue** for SunnySeat.
Create a new venue with outdoor seating geometry.
Split layout: form fields left, map with polygon draw tool right.
- Empty form fields (name, address, opening hours, district, partner toggle)
- Map centred on Gothenburg with draw tool active
- Building height input
- Save (disabled until required fields valid) / Cancel

---

### `admin-venue-editor-edit`
**Admin Venue Editor — Edit Existing Venue** for SunnySeat.
Modify an existing venue's data or adjust its outdoor seating polygon.
Same layout as `admin-venue-editor-new`, pre-populated.
- Pre-filled form fields
- Existing polygon shown on map, editable
- Last modified timestamp
- Save / Cancel / Delete (with confirm dialog)
- Polygon quality score (read-only)

---

### `admin-building-import`
**Admin Building Import Tool** for SunnySeat.
Upload building geometry files for the shadow engine.
Utilitarian — drag-and-drop zone prominent, import history below.
- File drop zone (GeoPackage, GeoJSON)
- Previous import history (last 5: date, file name, result)
- "Trigger Reprocessing" button
- File size limit notice

---

### `admin-building-import-processing`
**Admin Building Import Tool — Import In Progress** for SunnySeat.
File uploaded, processing into the building database.
Progress replaces the drop zone — clear stage labelling.
- Progress bar with %
- Stage label ("Parsing geometry…", "Inserting buildings…", "Running shadow calc…")
- Cancel button
- Do not navigate away warning

---

### `admin-building-import-error`
**Admin Building Import Tool — Import Failed or Partial Errors** for SunnySeat.
Import completed with errors, or failed entirely.
Partial successes acknowledged, errors actionable — not a full-page failure.
- Summary: X imported, Y errors
- Error log table (row, geometry ID, description)
- Download error report CTA
- Retry failed rows option

---

### `admin-accuracy-dashboard`
**Admin Accuracy Dashboard** for SunnySeat.
Monitor prediction accuracy and surface venues needing data fixes.
Data-dense, analytical — 14-day rolling view, charts and sortable table.
- System-wide accuracy score (large, green/amber/red by threshold)
- 14-day feedback volume chart
- Per-venue accuracy table (sortable)
- Flagged venues section (below 85% threshold)
- Export data (CSV)