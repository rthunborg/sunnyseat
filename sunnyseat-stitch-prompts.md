# SunnySeat — Stitch-Ready Screen Prompts

Design language reference for all screens:
- **Primary:** #D4AF37 (muted gold) — badges, active pins, CTA buttons
- **Secondary:** #F1B200 (warm amber) — accents, highlights
- **Neutral dark:** #27272A — body text, dark backgrounds
- **Map background:** warm sand/beige (#F5EDD8 range) — custom map tile
- **Cards/panels:** warm off-white (#FDFAF4) — never pure white
- **Font feel:** serif or humanist display for headlines; clean sans-serif for body; never Inter
- **Shaded state:** greyscale photo + muted label to signal no current sun
- **Tap targets:** minimum 48px height for all interactive elements

---

## Core Flow

---

### `onboarding-first-visit`

**Onboarding / First Visit Screen** for SunnySeat.

Full-screen welcome moment with a warm, sun-soaked atmosphere — like stepping into a late-afternoon Gothenburg summer. The screen is generous and calm, with a single strong visual anchor and one clear action. It earns trust before it asks for anything.

- **Background:** full-bleed ambient photo of a sunny outdoor café terrace in Gothenburg — warm golden-hour light, stone or wood surfaces, no people required. Slight warm overlay (#D4AF37 at 15% opacity) to tie it to the brand palette.
- **Top:** SunnySeat wordmark in warm off-white, centred, positioned in the upper third. Clean, confident, not oversized.
- **Middle:** one-line value proposition in large display type — *"Hitta uteplatser i solen — just nu."* Warm white, centred. Below it in smaller body text: *"Platsen sparas aldrig."* in muted semi-transparent white.
- **Bottom third:** primary CTA button — *"Använd min plats"* — full-width, rounded corners (12px), filled in #D4AF37 with dark #27272A text. Below it, a secondary text link: *"Använd Göteborgs centrum"* in warm off-white with no underline.
- **Spacing:** generous vertical breathing room between wordmark, value prop, and CTAs. Nothing feels cramped.

---

### `map-primary`

**Map / Home Screen** for SunnySeat.

The defining screen — an open, sun-drenched map with minimal chrome so the city breathes. Every UI element feels like it's floating lightly over the map, not bolted onto it.

**Desktop layout:**
- **Map:** fills the right ~65% of the viewport. Warm sand/beige map tiles — muted roads, minimal colour, no default Google blue. Two venue pins visible: one active gold (#D4AF37, circular badge with sun % label), one grey (shaded venue, smaller). A floating venue popup card near the active pin (see `venue-quickinfo`).
- **Sidebar (left, ~360px):** warm off-white (#FDFAF4) background. Top: SunnySeat wordmark left-aligned + search bar (rounded, subtle border, placeholder *"Sök plats eller område i Göteborg…"*). Below: *"Toppval nära dig"* section header in small caps or spaced label style. Three venue cards (see card spec below). Filter/settings icons top-right of sidebar (subtle, #27272A).
- **Venue card spec:** warm off-white card, venue photo left (64×64px, rounded 8px), sun % amber badge top-right of photo. Venue name in headline weight. Sun window + distance in smaller muted text. *"Visa rutt"* as a small amber text link right-aligned. Shaded venue (Da Matteo) shown in full greyscale with a *"Skuggig"* label in muted grey.
- **Map controls:** floating zoom +/− and locate-me button, bottom-right corner, rounded pill style in warm white with shadow.

**Mobile layout:**
- **Map:** fills the full viewport. Same warm sand tile style as desktop.
- **Top bar:** floating search bar across the top, warm white, rounded, *"Hitta din plats i solen"* placeholder. Filter icon right end.
- **Bottom peek:** 72px-tall draggable handle bar in warm off-white, resting at bottom. Shows currently nearest or selected venue: thumbnail left, name + sun % amber text, two icon actions (*"Härdig"* navigate + *"Favoriter"* star) right-aligned.
- **Pins:** gold filled circles with sun % label for sunny venues, smaller grey circles for shaded.

---

### `map-panel-venues`

**Map Panel — Venues List** for SunnySeat.

A warm card list that slides in alongside the map — it narrows the map but never replaces it. The panel feels like a café menu board: structured, scannable, full of character.

**Desktop layout (sidebar open state):**
- Sidebar (~360px) with warm off-white background. Top row: *"Platser i närheten"* label left + close/collapse chevron icon right.
- Venue cards stacked vertically with 8px gap. Each card:
  - Venue photo left, 64×64px, rounded 8px corners
  - Sun % amber badge (#D4AF37) overlaid top-right corner of photo — circular, 28px, dark text
  - Venue name in headline weight, one line, truncated
  - Sun window below name: e.g. *"Sol 13:00–18:30"* in small muted text with a small sun icon
  - Walking distance below: *"300 m bort"* in muted smaller text
  - *"Visa rutt"* amber text link, right-aligned
  - Shaded venue: full greyscale photo, *"Skuggig just nu"* label in grey replacing the sun badge
- Active/selected card has a subtle warm amber left border (3px, #D4AF37) and slightly elevated shadow.
- Scrollable list, no visible scrollbar on desktop.

**Mobile layout (bottom sheet, expanded ~70%):**
- Bottom sheet with 12px rounded top corners, warm off-white background, dark drag handle notch at top.
- Same card spec as desktop but full-width. Photo 72×72px. Content right of photo.
- At 10% peek height: drag handle only + *"4 platser i solen nära dig"* single line label centred.

---

### `venue-quickinfo`

**Venue Selected / Quick Info State** for SunnySeat.

A compact floating card anchored just above the selected map pin — enough to make a decision, not enough to cover the surrounding map. Warm and confident, like a well-designed café menu card.

- **Card:** ~320px wide, warm off-white (#FDFAF4) background, 12px rounded corners, soft drop shadow (no hard edges). Positioned above the selected pin with a small downward pointer/tail.
- **Top:** venue photo spans full card width, ~120px tall, rounded top corners. Amber sun % badge overlaid top-left: *"82% Sol"* in a filled rounded chip (#D4AF37, dark text).
- **Below photo:** venue name in headline weight (~16px), full-width. On the same row to the right: small amber *"Sol nu"* status chip or grey *"Skuggig"* chip.
- **Sun window row:** small sun icon + *"Sol 13:00–18:30"* in muted body text.
- **Timeline bar:** thin horizontal bar (~8px tall), full card width, warm grey track, amber fill showing current sun coverage proportion. Current time marker: small vertical tick above the bar. No interactive scrubbing shown.
- **Button row:** two buttons spanning card width. Left: primary — *"Visa rutt"* filled amber (#D4AF37), dark text, rounded, full half-width. Right: secondary — *"Mer info"* outlined, dark border, warm white fill, same height.
- **Dismiss:** small ✕ icon top-right corner of card, 32px tap target.

---

### `venue-detail`

**Venue Detail / Profile Screen** for SunnySeat.

The full picture on a venue — sun schedule, location, and how to get there. Warm, editorial, unhurried. The sun timeline is the hero data element; everything else supports it.

**Desktop layout (right panel ~480px, map visible left):**
- Panel slides in from right, warm off-white background, subtle left border shadow separating from map.
- **Hero photo:** full panel width, ~240px tall, rounded bottom corners only. Amber sun % badge top-left.
- **Venue name:** large headline weight below photo. *"Sol nu"* amber chip beside it.
- **Sun timeline section:** labelled *"Soltider idag"* in small caps. Full-width amber timeline bar (~12px tall), warm grey track. Current position marker (small amber dot + vertical line above). Hour labels below bar (e.g. *06 — 09 — 12 — 15 — 18 — 21*). Sun window text below: *"Direkt sol: 13:00 – 18:30"*.
- **Info rows:** opening hours with clock icon, address with pin icon + *"Öppna i Kartor"* text link amber, directions button full-width primary amber.
- **Footer:** small text link *"Var det soligt när du kom? Berätta"* → triggers feedback modal.
- **Close:** ✕ top-right of panel.

**Mobile layout (full-screen bottom sheet):**
- Same content order. Hero photo full width, ~200px tall. Timeline section prominent. Buttons full-width.
- Drag handle at top. Scroll down for info rows.

---

## Premium Flow

---

### `premium-paywall`

**Premium Paywall / Season Pass Screen — Mobile** for SunnySeat.

A confident, single-focus purchase moment — not a sales pitch, just a clear offer. Centred modal over a blurred map background, warm and trustworthy. One price, one button, no pressure.

- **Background:** blurred/dimmed map underneath (70% warm dark overlay), giving context without distraction.
- **Modal card:** centred, ~340px wide, warm off-white (#FDFAF4), 16px rounded corners, prominent shadow.
- **Top of modal:** small lock-to-sun icon or Season Pass badge illustration — warm gold tones, not generic.
- **Headline:** *"Säsongskortet"* in large headline weight. Subheading: *"Planera solstunder i förväg."*
- **Feature preview:** two rows showing what unlocks — date picker row (icon + label) and time slider row (icon + label), both shown as greyed-out/locked with a small padlock icon overlay.
- **Price block:** *"39 kr"* in very large display type, warm gold. Below: *"Engångskostnad · Ingen prenumeration · Inget konto"* in small muted text.
- **Primary CTA:** full-width Swish button — Swish brand green or neutral dark, Swish logo left, *"Betala med Swish"* label.
- **Trust line:** *"Din betalning sköts av Swish. Vi sparar inga kortuppgifter."* small muted text below button.
- **Dismiss:** *"Inte nu"* text link centred below, always visible.

---

### `premium-paywall-desktop`

**Premium Paywall / Season Pass Screen — Desktop** for SunnySeat.

Same purchase intent as the mobile paywall but adapted for a wider viewport — the Swish QR code needs to be large enough to physically scan, so it earns its own column.

- **Modal:** wider card (~680px), 16px rounded corners, warm off-white, two-column layout with an 8px divider line between columns.
- **Left column:** Season Pass badge/icon at top. Headline *"Säsongskortet"* + subheading. Feature preview rows (greyed-out date picker + time slider). Price block: *"39 kr"* large display type. Trust signals in small muted text.
- **Right column:** centred heading *"Scanna med Swish"*. Large QR code placeholder (~200×200px), clean white border around it. Instruction text: *"Öppna Swish på din telefon och scanna."* Below QR: small text link *"Generera ny QR-kod"* (refresh option).
- **Dismiss:** ✕ top-right corner of modal.

---

### `premium-paywall-processing`

**Premium Paywall — Swish Payment Processing** for SunnySeat.

The waiting state after Swish is opened on the phone. Calm and reassuring — the visual should reduce anxiety, not heighten it with a frantic spinner.

- **Modal:** same size and warm off-white style as `premium-paywall`. Centred over blurred map.
- **Icon/illustration:** a gentle pulsing sun or Swish-aware animation placeholder — warm amber, slow pulse, nothing aggressive. Not a generic loading ring.
- **Headline:** *"Väntar på Swish…"* in headline weight.
- **Body text:** *"Öppna Swish på din telefon och godkänn betalningen på 39 kr."* in readable body size, centred.
- **Amount confirmation chip:** small rounded chip — *"39 kr"* in amber, centred below body text.
- **Secondary link (greyed out initially):** *"Skicka Swish-förfrågan igen"* — appears after ~30s, shown here as visible but muted.
- **Cancel:** *"Avbryt betalning"* small text link below, always visible.

---

### `premium-paywall-error`

**Premium Paywall — Payment Failed** for SunnySeat.

The payment didn't go through — clear, plain, not alarming. One retry tap gets the user back on track.

- **Modal:** same warm off-white style. Centred.
- **Icon:** a muted, non-aggressive error indicator — e.g. a small grey cloud or sun-behind-cloud illustration. No harsh red X.
- **Headline:** *"Betalningen gick inte igenom"* in headline weight.
- **Body text:** plain-language reason below — *"Swish-betalningen avbröts eller tog för lång tid."* Muted body text.
- **Retry CTA:** full-width primary amber button — *"Försök igen"*.
- **Secondary actions:** two text links below — *"Försök senare"* (dismiss) and *"Kontakta oss"* (support).

---

### `premium-planner`

**Premium: Future Sun Planner — Unlocked State** for SunnySeat.

The map, but with time travel. Date and time controls sit at the bottom of the viewport, fully active, while the map shows predicted shadow coverage for the chosen moment. Feels like the same product — just with a new dimension.

**Desktop layout:**
- Map fills viewport as in `map-primary`, same warm tile style.
- **Date bar (top of map):** floating pill bar centred at top — left/right chevrons flank the current date, e.g. *"Lördag 14 juni"*. Clicking opens a compact calendar overlay (warm off-white, amber selected day).
- **Time slider (bottom of map):** floating bar across the full map bottom — warm off-white pill, ~56px tall. Slider track amber with thumb (circular, white + amber border). Hour labels below track: *06 — 09 — 12 — 15 — 18 — 21*. *"Nu"* shortcut button left of slider. Current time shown right of slider.
- **Map overlay:** semi-transparent shadow coverage layer on map (muted grey-blue, 30% opacity) showing predicted shaded areas. Sunny spots remain warm/clear.
- **Premium badge:** small *"Säsongskortet"* chip top-right of map in amber — subtle, not intrusive.
- **Confidence indicator:** small label near the time slider: *"Prognos: hög säkerhet"* with a coloured dot.

**Mobile layout:**
- Map fills viewport. Date pill floats top-centre. Time slider floats at bottom (~72px), above the map's bottom edge. Same controls, touch-friendly thumb.

---

### `premium-planner-locked`

**Premium: Future Sun Planner — Locked / Upsell State** for SunnySeat.

Same map, same controls — but everything is visibly frozen. The feature is shown, not hidden, so the user understands exactly what they'd be unlocking.

- **Map:** identical to `map-primary`. No shadow overlay.
- **Date bar:** visible at top but greyed out (50% opacity). Padlock icon right of the date label.
- **Time slider:** visible at bottom, greyed out, thumb non-interactive. Padlock icon overlaid on the thumb.
- **Inline nudge:** a small warm card floats just above the time slider, centred — *"Lås upp framtidsplanering"* headline, *"39 kr · en säsong · inget konto"* body. Single amber CTA: *"Visa Säsongskortet"*. Card has warm off-white background, 8px rounded corners, soft shadow. Dismissible with small ✕.

---

## Feedback & Verification

---

### `feedback-modal`

**Feedback Modal** for SunnySeat.

A frictionless one-question check-in from inside the venue detail — the user has just been at the venue and can confirm whether the sun prediction was right. Two taps maximum, never navigates away.

- **Mobile (bottom sheet):** slides up over `venue-detail`. Warm off-white, 12px rounded top corners, drag handle.
  - Top: venue name in headline weight, muted district/address below.
  - Large question: *"Var det soligt när du kom?"* in readable display size.
  - Two large answer buttons side by side — *"Ja ☀️"* and *"Nej ☁️"* — each ~48px tall, full half-width. *"Ja"* button in amber fill, *"Nej"* in outlined/neutral.
  - Below buttons: optional shade level row — three smaller pill chips: *"Full skugga"*, *"Delvis"*, *"Korta moln"*. Muted, not required.
  - Submit CTA: *"Skicka"* full-width amber button.
  - Skip link: *"Hoppa över"* small text link below.

- **Desktop (centred modal):** same content, ~380px wide card, warm off-white, 16px rounded corners. Same button layout.

---

### `verification-modal`

**Venue Seating Verification Modal** for SunnySeat.

A quick community check for unverified venues — does this place actually have outdoor seating? Same modal treatment as the feedback modal but slightly more structured.

- **Mobile (bottom sheet):** warm off-white, 12px rounded top corners.
  - Venue name headline + address in muted text below.
  - Community count chip: *"2 bekräftelser hittills"* in small amber chip.
  - Large question: *"Har det här stället uteservering?"*
  - Three answer buttons full-width stacked — *"Ja"*, *"Nej"*, *"Vet inte"* — each 48px tall. *"Ja"* in amber fill, *"Nej"* outlined red-tinted, *"Vet inte"* outlined neutral.
  - Optional photo upload row: dashed border area, camera icon, *"Lägg till foto (valfritt)"* label.
  - Submit CTA: *"Skicka"* full-width amber. Skip link below.

- **Desktop:** centred modal, ~400px wide, same content.

---

## Utility Screens

---

### `about`

**About Page** for SunnySeat.

A calm, editorial long-form screen — no map chrome, no interactive elements beyond a back link. Feels like a well-designed magazine article page: warm, readable, honest.

- **Layout:** centred content column (~640px max-width on desktop), warm off-white page background. Top: SunnySeat wordmark left-aligned + *"← Tillbaka till kartan"* right-aligned text link.
- **Headline:** *"Hur fungerar SunnySeat?"* in large display type.
- **Section 1 — Algorithm:** plain-language explanation block. Section heading in small caps label style, body text in comfortable reading size, warm dark (#27272A). No bullet points — flowing prose paragraphs.
- **Section 2 — Data sources:** same heading style. Three attribution rows with subtle left amber border accent — Lantmäteriet, Met.no, OpenStreetMap. Each row: source name bold, short description below in muted text.
- **Section 3 — Accuracy disclaimer:** accuracy target (≥85%) shown as a large amber number callout, then prose explanation.
- **Footer row:** contact/feedback text link + *"Tillbaka till kartan"* amber button. Warm off-white, no heavy footer chrome.

---

### `not-found`

**404 / Not Found Page** for SunnySeat.

A friendly dead-end that still feels like SunnySeat — warm, a little self-aware, one clear escape route. No navigation clutter.

- **Layout:** centred, vertically centred in viewport. Warm off-white or warm sand page background.
- **Illustration:** a simple sun-behind-cloud or lost-map-pin illustration in warm amber/gold tones — hand-drawn feel, not a generic icon.
- **Headline:** *"Den här platsen hittades inte"* in large display type.
- **Body text:** *"Länken kanske är gammal eller adressen är felaktig."* in readable muted body text below.
- **Single CTA:** *"Hitta soliga platser nu"* — amber filled button, rounded, centred. No other navigation.
- **SunnySeat wordmark:** small, top-left, links back to home.

---

---

## Admin App — `admin.sunnyseat.se`

Admin screens use a deliberately different aesthetic from the consumer app — cool, neutral, data-focused. No warm sand, no amber cards. Think internal tool: functional, dense, unambiguous.

**Admin design tokens:**
- Background: #F8F9FA (cool light grey)
- Sidebar: #1E1E2E (deep navy)
- Accent: #3B82F6 (blue) for CTAs and status indicators
- Status badges: standard semantic colours (green verified, yellow unverified, red flagged)
- Font: clean, neutral sans-serif — not the consumer serif/humanist choice
- Density: tighter spacing, more rows per screen

---

### `admin-login`

**Admin Login Screen** for SunnySeat.

Minimal, utilitarian — clearly not the consumer app. Single centred form on a cool grey background, no personality beyond function.

- **Background:** flat cool grey (#F8F9FA). No imagery, no warmth.
- **Card:** centred, ~380px wide, white background, 8px rounded corners, subtle shadow.
- **Top:** small *"SunnySeat Admin"* wordmark — text only, no consumer brand styling.
- **Form:** Email field + Password field, each full-width with clear labels above. Standard input styling, blue focus ring.
- **Session expiry notice:** if shown, a muted amber/yellow banner above the form: *"Din session har gått ut. Logga in igen."*
- **CTA:** *"Logga in"* full-width blue (#3B82F6) button.

---

### `admin-venue-list`

**Admin Venue List / Dashboard** for SunnySeat.

Dense, information-rich data table — the working home screen for content management. Scannable, action-oriented, nothing decorative.

- **Layout:** full-width. Left sidebar (~220px, deep navy #1E1E2E) with navigation links — *Platser*, *Byggnader*, *Noggrannhet* — current item highlighted in blue. Top header bar: *"Platser"* title left, *"Lägg till plats"* blue CTA button right.
- **Filter bar:** below header — search input left (*"Sök på namn eller stadsdel…"*), filter dropdowns for *Status* and *Stadsdel* right.
- **Table:** white background, horizontal dividers. Column headers: *Namn*, *Stadsdel*, *Status*, *Polygonkvalitet*, *Åtgärder*. Each row: venue name (bold), district (muted), status badge (pill: green *"Verifierad"*, yellow *"Overifierad"*, red *"Flaggad"*), quality score (number, colour-coded), action icons (edit pencil, delete trash).
- **Pagination:** bottom of table, centred. Page count + prev/next.

---

### `admin-venue-editor-new`

**Admin Venue Editor — New Venue** for SunnySeat.

Split-screen layout — form on the left, map with polygon draw tool on the right. Functional and precise, designed for accuracy.

- **Layout:** 50/50 split. Left: form panel (white, padded). Right: map (standard street tiles — not the consumer warm style, readable for editing). Header bar above both: *"Ny plats"* title left, *"Spara"* blue button (disabled state) and *"Avbryt"* text link right.
- **Form fields (left):** labelled inputs stacked — *Namn*, *Adress*, *Öppettider*, *Stadsdel* (dropdown), *Byggnadshöjd (m)* (number input), *Partnerstatus* (toggle). Standard form styling, no decoration.
- **Map (right):** centred on Gothenburg. Polygon draw tool active — cursor indicates draw mode. Instruction text overlay: *"Klicka för att rita uteserveringens yta."* in a small floating label.

---

### `admin-venue-editor-edit`

**Admin Venue Editor — Edit Existing Venue** for SunnySeat.

Same split layout as new venue editor, but pre-populated — existing polygon visible and editable on the map.

- Identical layout to `admin-venue-editor-new` but all fields pre-filled.
- **Map:** existing polygon shown as blue outlined shape with draggable corner handles.
- **Header bar:** *"Redigera: [Venue Name]"* title. Buttons: *"Spara"* blue (active), *"Avbryt"* text link, *"Radera"* red text link with trash icon (right-aligned, destructive).
- **Below form:** two read-only meta rows — *"Senast ändrad: 2024-06-12 14:30"* and *"Polygonkvalitet: 94 / 100"* in muted text.

---

### `admin-building-import`

**Admin Building Import Tool** for SunnySeat.

Utilitarian drag-and-drop interface for uploading building geometry files. The drop zone is the primary element; import history provides context below.

- **Header:** *"Byggnadsinläsning"* title left, nav sidebar left as in other admin screens.
- **Drop zone:** large dashed-border rectangle (~400px wide, centred), white background. Upload icon centred, *"Dra och släpp en fil hit"* label, *"GeoPackage (.gpkg) eller GeoJSON (.geojson)"* in smaller muted text below. *"Välj fil"* blue outlined button below label. File size limit notice: *"Max 500 MB."*
- **Import history table:** below drop zone. *"Senaste importer"* heading. Five rows max: date, filename, result (*"Lyckades"* green / *"Misslyckades"* red), row count. No actions per row (read-only history).
- **Reprocessing button:** *"Kör om skuggberäkning"* blue outlined button below history table.

---

### `admin-building-import-processing`

**Admin Building Import Tool — Import In Progress** for SunnySeat.

The drop zone is replaced by a progress view — clear stage labels replace the upload UI while the file processes.

- Drop zone area replaced by:
  - Progress bar (blue fill, grey track, full width of the former drop zone area). Percentage label right of bar.
  - Stage label below bar: e.g. *"Tolkar geometri…"* in muted body text.
  - *"Avbryt"* red text link below stage label.
  - *"Lämna inte sidan under importen."* warning notice in a muted yellow banner above the progress bar.
- Import history table remains visible below, unchanged.

---

### `admin-building-import-error`

**Admin Building Import Tool — Import Failed or Partial Errors** for SunnySeat.

Partial success is acknowledged before errors — not a full-page failure, just a structured result view with actionable recovery options.

- **Result summary banner:** above table, amber/yellow background — *"302 byggnader importerades. 14 fel påträffades."* with a warning icon left.
- **Error log table:** *"Fellogg"* heading. Columns: *Rad*, *Geometri-ID*, *Beskrivning*. Muted row styling. Max height with scroll.
- **Action row:** *"Ladda ner felrapport"* blue outlined button left. *"Försök importera felrader igen"* blue filled button right.

---

### `admin-accuracy-dashboard`

**Admin Accuracy Dashboard** for SunnySeat.

A data-dense analytical view — 14-day rolling accuracy tracking with one headline number and two supporting data views (chart + table). Actionable, not decorative.

- **Headline metric:** large number centred at top of content area — e.g. *"89%"* in large display type. Colour-coded: green ≥85%, amber 75–84%, red <75%. Label below: *"Systemövergripande noggrannhet (14 dagar)"*.
- **Feedback volume chart:** line or bar chart, full content width, 14-day x-axis. Blue bars/line, clean grid lines. *"Feedbackvolym per dag"* label above.
- **Per-venue table:** *"Noggrannhet per plats"* heading. Sortable columns: *Plats*, *Noggrannhet %*, *Antal svar*, *Trend* (small sparkline). Flagged rows (below 85%) have a subtle red left border.
- **Flagged venues section:** below the table, collapsible. *"Platser under tröskelvärdet"* heading. Same table rows filtered to flagged venues only. *"Exportera CSV"* text link top-right.
