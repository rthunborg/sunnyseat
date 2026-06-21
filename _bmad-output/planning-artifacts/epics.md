---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/design/DESIGN.md'
  - '_bmad-output/planning-artifacts/design/references/screens/mobile/ (13 screen images)'
  - '_bmad-output/planning-artifacts/design/references/screens/desktop/ (8 screen images)'
  - '_bmad-output/planning-artifacts/design/references/components/ (41 component images)'
  - 'project-context.md'
  - '_bmad-output/qa/assessments/qa-test-strategy.md'
  - '_bmad-output/qa/assessments/1.6-nfr-20251009.md'
  - '_bmad-output/qa/assessments/1.6-risk-20251009.md'
  - '_bmad-output/qa/assessments/3.2-nfr-20251007.md'
  - '_bmad-output/qa/assessments/3.2-risk-20251007.md'
  - '_bmad-output/qa/assessments/4.2-risk-20251008.md'
  - '_bmad-output/qa/test-design-progress.md'
  - '_bmad-output/qa/test-design-architecture.md'
  - '_bmad-output/qa/test-design-qa.md'
  - '_bmad-output/qa/test-design/sunnyseat-handoff.md'
---

# SunnySeat - Epic Breakdown

> **MVP scope correction (2026-05-19):** time planner, future date picker, future sun simulation, and favourites are free MVP functionality. Season Pass, Swish payments, premium activation, premium recovery, and payment failure flows are deferred to Future Monetization and preserved in `future-monetization-season-pass.md`.
>
> **Visual source refresh (2026-05-21):** MVP story drafting and visual gates must use only the refreshed Claude Design MVP Unlocked pages: `SunnySeat MVP Mobile Unlocked.html` and `SunnySeat MVP Desktop Unlocked.html`. Post-MVP Unlocked/Locked pages remain future-only references for payment, paywall, Season Pass, and locked-state work.
>
> **Admin removal correction (2026-05-30):** SunnySeat will not have an admin page, admin venue configuration UI, admin venue CRUD API, admin authentication surface, venue candidate review queue, or admin-operated building upload surface. New and changed venues are managed by direct database insert/update queries only. Story 3.0 is the first Epic 3 implementation story and removes the remaining admin artifacts from the codebase, docs, tests, and database cleanup plan before routing, feedback, and reviews proceed.
>
> **Shadow data trust correction (2026-06-02, clarified 2026-06-05):** Epic 3 feature work is paused after Story 3.0. Stories 3.0.1-3.0.7 form the "Epic 3 Prelude: Shadow Data Trust Realignment" block and must complete before Story 3.1 proceeds. The old assumption that `building_geodata/byggnad_kn1480.gpkg` alone supports shadows is retired; MVP shadow casters use filtered central records derived from 2D Lantmäteriet footprints + Göteborg Baskarta XYZ object inventory + Göteborg Höjdmodell 2022 DTM-derived ground elevation. The active building subset remains Baskarta `byggnad_l` until broader Z-aware Baskarta layers are preflighted, classified, and validated.
>
> **Story drafting guardrail:** Stories 2.5, 2.6, and 2.7 must be drafted as free MVP functionality. Their story files must include explicit review tasks proving active MVP code does not depend on `PremiumContext`, `usePremiumStatus`, `queryKeys.premium`, `/api/payments/*`, Swish helpers, paywall components, lock badges, Season Pass copy, or premium JSON messages. If dormant monetization code is worth saving, move it out of live runtime paths and preserve the contract in `future-monetization-season-pass.md` or an inactive `future-premium` archive; do not leave unused premium/payment providers, hooks, or route stubs wired into the MVP app.

## Overview

This document provides the complete epic and story breakdown for SunnySeat, decomposing the requirements from the PRD, UX Design Specification, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Users can view venues with outdoor seating on an interactive map, visually distinguished by current sun exposure state (sunny vs. shaded).
FR2: Users can view a list of nearby venues ranked by sun exposure relevance, showing name, sun time range, confidence score, and distance.
FR3: Users can search for venues by name or area within Gothenburg.
FR4: Users can see their current location on the map and discover venues relative to their position.
FR5: Users can view venue locations and quickly compare multiple nearby sunny venues to find alternatives.
FR6: The system requests geolocation permission on first visit and offers a default location fallback (Gothenburg centrum) if denied.
FR7: Users can view the current sun exposure state and confidence percentage for any venue.
FR8: Users can view a sun timeline for a venue showing when sun exposure starts, peaks, and ends for today.
FR9: Users can scrub through time to see how venue sun states change throughout the current day.
FR10: Users can select a future date and simulate sun exposure states for all venues on that date.
FR11: Users can scrub through time on a selected future date to see predicted sun states.
FR12: The system displays confidence scores that blend geometric sun certainty with weather-based cloud cover uncertainty.
FR13: The system auto-refreshes venue sun states periodically while the app is active, without requiring manual reload.
FR14: Users can view detailed venue information including photos, description, opening hours, and address.
FR15: Users can navigate to a venue using in-app routing with estimated walk/bike time.
FR16: Users can open a venue's location in their device's native map application.
FR17: Users can submit accuracy feedback on whether a venue's sun prediction was correct when they arrived.
FR18: Users can confirm that a venue has outdoor seating, contributing to the verified venue database.
FR19: Users can read reviews written by other users about a venue's outdoor seating experience.
FR20: Users can write and submit a review for a venue they have visited.
FR21: Future users can view a soft upsell prompt if a future paid feature boundary is introduced. (Post-MVP)
FR22: Future users can purchase a Season Pass ("Sasongskortet") via Swish payment for a one-time fee. (Post-MVP)
FR23: The future monetization flow supports Swish payment via mobile deep-link (phone) and QR code (desktop). (Post-MVP)
FR24: The future monetization flow confirms payment status and activates paid access within seconds of successful Swish transaction. (Post-MVP)
FR25: Future users can recover paid status on a new device or after clearing browser data without needing a user account. (Post-MVP)
FR26: The future monetization flow handles payment failures gracefully, displaying clear error states and retry options. (Post-MVP)
FR27: Partner venues are visually distinguished on the map with enhanced pin styling (Golden Pin).
FR28: Partner venues display a "Sunny Now" badge when their outdoor seating is in direct sun.
FR29: Partner venues can be deep-linked directly from external sources.
FR30: Partners can view analytics showing venue views, detail opens, and route requests segmented by sun state.
FR31: Users can save venues to a favourites list for quick access.
FR32: Users can view their recently viewed venues.
FR33: Users can receive push notifications when a favourited venue's sun state changes to sunny.
FR34: Users can opt in or out of push notifications.
FR35: Users can share a venue's sun status with others via their device's native share functionality.
FR36: Retired. New venue ingestion is handled outside the app through direct database insert/update queries.
FR37: Users can verify or flag outdoor seating status for existing venues through a consumer confirmation flow.
FR38: Retired. SunnySeat does not maintain a venue candidate approval queue.
FR39: Retired. SunnySeat does not provide admin authentication.
FR40: Retired. SunnySeat does not provide venue CRUD/configuration APIs.
FR41: Retired. Patio polygon edits are direct database maintenance work, not an app geometry editor.
FR42: Retired. Building geometry file changes are direct database/backend maintenance work, not an app upload surface.
FR43: Retired. SunnySeat does not provide an admin accuracy dashboard.
FR44: Retired. SunnySeat does not provide venue candidate review/approval tooling.
FR45: Retired. SunnySeat does not provide app-level precomputation controls for maintainers.
FR46: The app presents a branded onboarding screen on first visit explaining the product and prompting location access.
FR47: Users can view an "About" page explaining how SunnySeat works, its data sources, and accuracy statistics.
FR48: The app displays a friendly 404 page with navigation back to the main map when a non-existent route is accessed.
FR49: The app is installable as a PWA on supported mobile browsers.
FR50: The app displays a "no connection" message when offline, with the app shell remaining functional.

### NonFunctional Requirements

NFR1: API response time <200ms at p95 for venue search and sun exposure endpoints under normal load.
NFR2: Largest Contentful Paint (LCP) <=4.5s on mobile 4G connections (Plan B re-baselined 2026-05-06 in Story 1.6 from <=2.5s; see PRD NFR2 for rationale — LCP structurally pinned by MapLibre tile fetch + canvas paint).
NFR3: Interaction to Next Paint (INP) <=200ms for all interactive elements.
NFR4: Cumulative Layout Shift (CLS) <=0.1 across all pages.
NFR5: Map pan and zoom at 60fps on mid-range mobile devices (2022+ Android, iPhone 11+).
NFR6: Venue pin rendering for 50 venues completes within 100ms.
NFR7: App shell renders within 2s on 4G. Map tiles and venue data loaded within 4s.
NFR8: Initial route JS <=280KB gzipped (excluding map library). MapLibre dynamic chunk <=320KB. Total <=600KB. MapLibre GL JS loaded asynchronously (Plan B re-baselined 2026-05-06 in Story 1.6 from <200KB; see PRD NFR8 for breakdown).
NFR9: Venue sun states auto-refresh every 5 minutes while the tab/app is active.
NFR10: Zero personally identifiable information (PII) stored in the database. No user accounts, no email addresses, no names.
NFR11: IP addresses hashed (SHA-256 + salt) before storage for rate limiting and duplicate detection.
NFR12: Public API endpoints are rate-limited at 100 req/min per IP unless a route-specific stricter limit is documented.
NFR13: Retired with the admin surface. Future paid-status tokens, if reintroduced post-MVP, remain separate Future Monetization scope.
NFR14: All traffic served over HTTPS. No mixed content.
NFR15: Future Swish payment data handled per Swish Merchant API security requirements. Transaction IDs stored; no card/bank details persisted.
NFR16: GDPR compliance: no cookies requiring consent beyond session. Privacy policy accessible from About page.
NFR17: Future paid-status recovery mechanism must not expose one user's purchase to another.
NFR18: System supports <=10,000 MAU within $100/month operational budget (Vercel + Supabase).
NFR19: System handles "sunny day spikes" — 5x normal concurrent traffic — without degraded response times.
NFR20: Precomputed sun exposure data used for high-traffic venue queries to avoid on-demand calculation bottlenecks.
NFR21: Map tile serving offloaded to external tile provider CDN, not SunnySeat infrastructure.
NFR22: WCAG 2.1 AA compliance on all customer-facing screens.
NFR23: All interactive elements keyboard-navigable with visible focus indicators.
NFR24: Screen reader support for venue list, venue detail, and map controls (ARIA labels, roles, live regions for dynamic updates).
NFR25: Colour contrast ratios meet AA minimums (4.5:1 for body text, 3:1 for large text). Amber palette verified against cream backgrounds.
NFR26: prefers-reduced-motion respected: non-essential animations disabled, sheet transitions simplified.
NFR27: Map pins differentiated by icon shape (sun icon), not colour alone, for colour-blind users.
NFR28: Met.no Locationforecast 2.0 API: User-Agent attribution header included per terms of service. Graceful degradation if unavailable.
NFR29: Future Swish Merchant API integration supports test environment for development. Webhook handler idempotent.
NFR30: MapLibre GL JS: Vector tile source must support Gothenburg coverage at zoom levels 10-18. Tile loading failures display fallback map background.
NFR31: Web Push API: Push subscription management handles browser permission revocation gracefully.
NFR32: OpenStreetMap data ingestion: Overpass API queries respect rate limits.
NFR33: 99.5% uptime measured monthly.
NFR34: Weather data staleness: if Met.no data is older than 2 hours, confidence scores are capped and a freshness indicator is shown.
NFR35: Precomputed sun exposure data regenerated daily. If precomputation fails, previous day's data served with reduced confidence.
NFR36: Future Swish payment status polling times out after 5 minutes with a clear "payment not confirmed" message and retry option.
NFR37: Service worker caches app shell for offline display. Cache invalidation on new deployment.

### Additional Requirements

- **Starter template**: create-next-app (Next.js 16.2.2) + shadcn/ui init + MapLibre GL JS + TanStack Query + Motion + @use-gesture/react + date-fns-tz + cmdk. Project initialization is the first implementation story.
- **Font strategy**: Custom fonts via next/font (Plus Jakarta Sans for display, Manrope for UI text). Both loaded with display: 'swap', preloaded, self-hosted.
- **State management**: TanStack Query for server state (5-min stale time, background refetch). React Context for client state: MapContext (viewport, selected venue, map ref), TimeContext (slider position, selected date), Favourites/localStorage state, LanguageContext (SV/EN). Premium/payment state is future-only.
- **Search combobox**: cmdk for accessible venue search with keyboard navigation.
- **Internationalization**: next-intl. Swedish-first, English supported. Locale files by feature area. Venue names always Swedish. 24-hour time format.
- **Dual viewport architecture**: Mobile (<1024px) uses bottom sheets with drag physics. Desktop (>=1024px) uses fixed top navbar (84px), 190px venue side panel, 390px venue detail overlay. Shared component logic, viewport-specific layout wrappers.
- **PWA**: Serwist (successor to next-pwa). App shell caching, web app manifest, install prompts, cache invalidation on deploy.
- **CI/CD merge gates**: All tests pass (Vitest + Playwright), axe-core zero critical/serious violations, Lighthouse Performance >= 0.55 (Plan B re-baselined 2026-05-06 — see architecture line 339), Lighthouse Accessibility >= 0.95, Total JS bundle <= 600KB gzipped (Plan B re-baselined — see PRD NFR8), eslint-plugin-jsx-a11y zero errors.
- **Map lifecycle**: MapLibre canvas is persistent (never unmounted). All UI overlays the map. Pin click -> MapContext updates -> detail fetch + sheet/panel open.
- **Component architecture**: Three layers: components/ui/ (shadcn/ui), components/composed/ (multi-primitive compositions), components/custom/ (feature-specific by domain).
- **Design tokens**: All DESIGN.md tokens mapped to Tailwind v4 @theme in globals.css. Agents must use Tailwind classes — never raw hex, px, or inline styles.
- **URL state management**: Deep-linkable URLs reflecting app state (venue slug, time, viewport). history.replaceState for updates.
- **Future premium persistence**: Server-signed JWT in localStorage containing Swish transaction ID, activation timestamp, season expiry. Server verifies JWT on future paid-only API calls.
- **Future premium recovery**: User enters Swish transaction ID from Swish app history -> server looks up in purchases table -> re-issues signed JWT. Zero PII required.
- **Data freshness headers**: API responses include X-Weather-Updated-At and X-Sun-Data-Source for staleness indicators.
- **Progressive data loading**: Sun status loads first (precomputed), weather qualifier arrives second. UI renders progressively.
- **Context provider nesting**: QueryClientProvider > LanguageProvider > GeolocationProvider > MapProvider > TimeProvider > {children}. PremiumProvider is dormant/future unless Season Pass is reactivated.
- **Query key factory**: Centralized lib/query-keys.ts. All query hooks must use keys from this file.
- **Loading patterns**: Skeleton components for loading states. No full-page spinners. Map pins fade in individually.
- **Error handling**: React error boundary around map + UI layer. Network errors: TanStack Query retry (3 attempts, exponential backoff). Map tile errors: fallback to sand background. Payment errors: dedicated PaymentFailed screen.
- **Server vs Client boundary**: Push 'use client' as low as possible. layouts/pages as Server Components. components/* as Client Components.
- **Test organization**: test/unit/ (mirrors lib/), test/components/ (one per component), test/e2e/ (Playwright journey tests).

### UX Design Requirements

UX-DR1: Design token-to-Tailwind CSS @theme mapping — all DESIGN.md colour, typography, spacing, shadow, radius, transition, z-index, gradient, blur, and component size tokens mapped to Tailwind v4 @theme in globals.css as the single source of truth.
UX-DR2: Warm amber/sand/cream palette implementation — the colour system is emotional infrastructure ("it feels sunny"), not decoration. Amber pin (#f1b100), cream surfaces (#fdfaf4), sand map background (#f5f0e6), frosted glass overlays.
UX-DR3: VenuePin component with 4 states — sunny (pill with pointer, amber), sunny+selected (perfect circle, amber), shaded (pill with pointer, grey at 0.8 opacity), partner sunny (larger pill with warm glow). Shape transition animated at 200ms.
UX-DR4: BottomSheet component with drag physics — snap points at peek (~100px above nav), full (full screen minus status bar), and dismissed. Spring easing (cubic-bezier(0.22,1,0.36,1)). Drag handle pill (40px peek / 48px full). Map visible and interactive behind peek, dimmed behind full.
UX-DR5: VenueQuickInfo quick-info card — slides up on pin tap (200ms easing-enter), dismisses on tap-away (150ms easing-exit), swaps content on new pin tap (crossfade 150ms). Shows venue name, sun window, confidence %, distance, "Visa Rutt" CTA. Desktop: floating popover near pin instead of bottom card.
UX-DR6: TimeSliderPanel with frosted glass effect — color-glass-slider (rgba(255,255,255,0.9)), blur-heavy (12px), radius-panel (32px). Contains free time scrubber + free date picker. Date/time changes update map pins, QuickInfo, venue list, and venue detail without premium gates.
UX-DR7: SunTimeline horizontal gradient bar — gradient-timeline-bar, 12px height, time markers at sunrise/current/sunset. Gradient fill animates from left to current-time on first render (400ms). Current time indicated with text-time styling.
UX-DR8: Three-tier button hierarchy — Primary: RouteButton (gradient-route-button, gold-to-dark, one per screen). Secondary: AmberCTAButton (gradient-cta-amber, multiple per screen). Tertiary: GlassButton (frosted white 80%, circular/pill). All radius-pill. Disabled = 40% opacity. Min 44x44px touch target.
UX-DR9: Sheet & overlay stacking rules — only one sheet visible at a time (except QuickInfo + peek coexist). Dismiss patterns: drag down, tap outside (QuickInfo), swipe down, back gesture. Transition timings: peek-to-full 300ms spring, full-to-dismissed 250ms ease-in, QuickInfo appear 200ms, dismiss 150ms.
UX-DR10: Loading & empty states — map renders immediately with sand background, pins fade in individually (150ms each) as data arrives. Slow connection (>3s): "Laddar platser..." pill. Venue detail: sheet opens with shimmer skeleton. No full-page spinners ever.
UX-DR11: Error & degradation patterns — silent degrade by default. Weather stale >2h: tilde prefix on confidence ("~85%"). Weather API down: hide confidence. Venue API failure: inline map message + retry. Network offline: app shell + "Ingen anslutning" banner. Error tone: matter-of-fact Swedish, no exclamation marks or emoji.
UX-DR12: Feedback prompt ("Var det soligt?") — inline card in venue detail (not modal), contextually triggered after likely visit. Binary first (Ja/Nej), optional outdoor seating follow-up. Dismissible. Success: inline "Tack for din feedback" replacing form, fades after 3s.
UX-DR13: Review submission form — intentional user-initiated action via "Lamna ett omdome" CTA. Text area + optional photo. Submit: inline confirmation replacing form. Failure: inline error + retry. Text area focus: border transitions to amber-dark.
UX-DR14: Map interaction conventions — tap pin: select + QuickInfo. Tap selected pin: deselect. Tap map: deselect + dismiss QuickInfo. Tap different pin: swap (crossfade content). Map controls fade to 60% opacity during drag. My-location: smooth pan (500ms). After panning: no auto-recentre, preserve spatial context.
UX-DR15: Navigation — Mobile: BottomNavBar 40px with Karta/Favoriter/Om tabs, uppercase labels, active amber (#d97706). Desktop: DesktopNavBar 84px fixed top with logo + search (384px). No bottom nav on desktop. Tab labels: text-label-sm.
UX-DR16: Typography consistency — venue names: text-heading-md in lists, text-display-xl in detail. Sun data: text-label-lg / color-amber-dark. Body: text-body-lg / color-text-body. CTA labels: text-label-lg / color-amber-cta-text. Badges: uppercase text-label-md. Numbers: Manrope Bold.
UX-DR17: Onboarding screen — full-screen warm amber gradient, single CTA "Anvand min plats" + secondary "Hoppa till Goteborgs centrum" skip link. Stagger entrance (headline 200ms, CTA 400ms). Appears once per device (localStorage flag). Location pending: CTA pulse animation.
UX-DR18: Future Monetization upsell card — preserved post-MVP reference only; not active in MVP planner/date/favourites flows.
UX-DR19: Future Monetization paywall — preserved post-MVP reference only; not active in MVP.
UX-DR20: Future Monetization payment processing state — preserved post-MVP reference only; not active in MVP.
UX-DR21: Future Monetization payment failed screen — preserved post-MVP reference only; not active in MVP.
UX-DR22: Venue detail — mobile: full bottom sheet with drag handle, hero image + sun badge overlay, venue name, description, "SOLTIDER IDAG" InfoCard with SunTimeline, opening hours with shadow warning (color-error), address with "OPPNA I KARTOR" link, full-width RouteButton. Desktop: 390px right panel with close button, map interactive behind.
UX-DR23: Venue list — mobile: bottom sheet expandable from peek, "Hitta solen nu" header, venue cards (87x72px thumbnail, sun badge, name, sun range, confidence, distance), sorted sunny-first then closest-first. Desktop: 190px left side panel overlaying map, "TOPPVAL NARA DIG" header, compact scrollable cards.
UX-DR24: About page — scrollable, sections: "Hur fungerar SunnySeat?", "ALGORITMEN", "DATAKALLOR" (Lantmateriet, Met.no, OSM), "TRAFFSAKERHET" with 85% stat count-up animation (800ms on scroll-into-view), contact section. Desktop: max-width 720px centred, two-column data sources.
UX-DR25: 404 page — amber pin icon with "?" inside, "Den har platsen hittades inte" heading, "Hitta soliga platser nu" RouteButton CTA. Icon float animation (translateY +/-4px, 2s loop). Desktop: DesktopNavBar visible.
UX-DR26: prefers-reduced-motion respect — all Motion animations wrapped in motion-safe check. CSS transitions simplified to instant. Sheet transitions: opacity only. No stagger animations. No pin fade. No timeline gradient animation. No count-up animation. No icon bounce or float.
UX-DR27: Desktop QuickInfo as floating popover — fade-in + scale 0.95->1.0 (200ms easing-enter) near the selected pin. Side panels slide-in from edges (300ms easing-spring).
UX-DR28: Responsive dual viewport layout — mobile (<1024px): bottom sheets, floating glass controls, 40px bottom nav. Desktop (>=1024px): fixed top navbar 84px, 190px venue list panel, 390px venue detail panel. Time slider: mobile floating panel, desktop integrated in header bar. Shared component logic, viewport-specific layout wrappers via useMediaQuery hook.
UX-DR29: Component file structure by feature domain — map/ (MapCanvas, VenuePin, MapControls, MapOverlay), venue/ (VenueQuickInfo, VenueDetail, VenueList, VenueCard, SunTimeline, SunBadge), time/ (TimeSlider, DatePicker, TimeSliderPanel), favourites/ (FavouritesList, FavouriteButton), feedback/ (FeedbackPrompt, OutdoorSeatingConfirm, ReviewForm, ReviewCard), future-premium/ (archived UpsellCard, PaywallScreen, SwishPayment, PaymentProcessing, PaymentFailed), navigation/ (BottomNavBar, DesktopNavBar, SearchBar), routing/ (RouteOverlay), shared/ (GlassButton, AmberCTAButton, RouteButton, BottomSheet, DragHandle, InfoCard), pages/ (OnboardingScreen, AboutPage, NotFoundPage).
UX-DR30: Animation strategy split — Motion (successor to framer-motion, motion/react imports) for gesture-driven and complex state transitions (sheet drag, card slide-up/down, AnimatePresence mount/unmount). CSS transitions (Tailwind utilities) for micro-interactions (hover/press, pin colour, tab switches, opacity fades, badge changes).

### FR Coverage Map

FR1: Epic 1 — View venues on interactive map with sun-state pins
FR2: Epic 2 — View ranked venue list with sun info and distance
FR3: Epic 2 — Search venues by name or area
FR4: Epic 1 — See current location on map, discover nearby venues
FR5: Epic 1 — Compare multiple nearby sunny venues visually
FR6: Epic 1 — Geolocation permission with Gothenburg centrum fallback
FR7: Epic 2 — View current sun exposure state and confidence %
FR8: Epic 2 — View sun timeline (start, peak, end) for today
FR9: Epic 2 — Scrub through time for today's sun states
FR10: Epic 2 — Free future date selection for sun simulation
FR11: Epic 2 — Free time scrubbing on selected future date
FR12: Epic 2 — Confidence scores blending geometry + weather
FR13: Epic 2 — Auto-refresh venue sun states (5-min interval)
FR14: Epic 2 — View venue detail (photos, description, hours, address)
FR15: Epic 3 — Navigate to venue with walk/bike routing + ETA
FR16: Epic 3 — Open venue in native map application
FR17: Epic 3 — Submit sun accuracy feedback
FR18: Epic 3 — Confirm venue outdoor seating status
FR19: Epic 3 — Read reviews from other users
FR20: Epic 3 — Write and submit a venue review
FR21: Future Monetization — Soft upsell prompt for future paid features
FR22: Future Monetization — Purchase Season Pass via Swish
FR23: Future Monetization — Swish mobile deep-link + desktop QR code
FR24: Future Monetization — Payment confirmation and paid-status activation
FR25: Future Monetization — Paid-status recovery without user account
FR26: Future Monetization — Graceful payment failure handling + retry
FR27: Epic 5 — Partner Golden Pin styling on map
FR28: Epic 5 — Partner "SOL NU" badge when sunny
FR29: Epic 5 — Partner deep-link access from external sources
FR30: Epic 5 — Partner analytics (views, routes by sun state)
FR31: Epic 2 — Save venues to favourites
FR32: Epic 6 — View recently viewed venues
FR33: Epic 6 — Push notifications for sun state changes on favourites
FR34: Epic 6 — Opt in/out of push notifications
FR35: Epic 6 — Share venue sun status via native share
FR36: Retired — direct database insert/update queries outside the app
FR37: Epic 3 — Consumer outdoor seating verification for existing venues
FR38: Retired — no venue candidate approval queue
FR39: Retired — no admin authentication surface
FR40: Retired — no venue CRUD/configuration API
FR41: Retired — no app geometry editor
FR42: Retired — no app building upload surface
FR43: Retired — no admin accuracy dashboard
FR44: Retired — no venue candidate review queue
FR45: Retired — no app precomputation controls
FR46: Epic 1 — Branded onboarding screen with location prompt
FR47: Epic 7 — About page (how it works, data sources, accuracy)
FR48: Epic 7 — Friendly 404 page with map redirect
FR49: Epic 7 — PWA installable on mobile browsers
FR50: Epic 7 — Offline "no connection" message with app shell

## Epic List

### Epic 1: "See the Sun" — Project Foundation & Core Map Discovery
Users open SunnySeat, grant location, and see a warm sand map with amber/grey venue pins showing which venues are sunny right now. This is the "amber moment" — the defining experience. Includes project scaffold, design token mapping, custom fonts, MapLibre integration, venue pin rendering, onboarding with geolocation, responsive layout foundation, i18n setup, and CI/CD quality gates.
**FRs covered:** FR1, FR4, FR5, FR6, FR46

### Epic 2: "Explore & Compare" — Venue List, Detail, Planner & Favourites
Users can browse a ranked venue list, search by name/area, view rich venue detail (photo, hours, address, sun timeline), see confidence percentages, scrub through time, select future dates for planning, save favourite venues, and have data auto-refresh in the background.
**FRs covered:** FR2, FR3, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR31

### Epic 3 Prelude: "Shadow Data Trust Realignment"
Maintainers correct the building/shadow data architecture before routing, feedback, and reviews continue. This prelude adopts the MVP central open-data shadow-caster path, defines the schema/RPC contract, productionizes the import pipeline, adds validation and spot-check gates, recalibrates confidence semantics, realigns Baskarta XYZ inventory handling, and updates user-facing uncertainty copy.
**FRs supported:** FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR17, FR47

### Epic 3: "Go & Confirm" — Routing, Feedback & Reviews
Users can get walking/biking directions to a venue, open it in their native maps app, submit sun accuracy feedback, confirm outdoor seating status, and read/write venue reviews. Completes the full venue visit loop.
**FRs covered:** FR15, FR16, FR17, FR18, FR19, FR20

### Epic 4: "Future Monetization" — Season Pass & Swish Payment (Post-MVP)
Future users can unlock a paid Season Pass if SunnySeat later reintroduces consumer monetization. Includes preserved upsell, paywall, Swish payment flows (mobile deep-link + desktop QR), payment processing/failure states, paid-status JWT persistence without accounts, and recovery via Swish transaction ID. This epic is not required for MVP launch.
**FRs covered:** FR21, FR22, FR23, FR24, FR25, FR26

### Epic 5: "Partner Spotlight" — B2B Venue Features
Partner venues get enhanced visibility: Golden Pin styling on the map, "SOL NU" badge on venue cards when sunny, deep-link access from external sources, and partner analytics showing views/routes segmented by sun state.
**FRs covered:** FR27, FR28, FR29, FR30

### Epic 6: "Make It Personal" — History, Notifications & Sharing
After favourites ship in Epic 2, users can view recently visited venues, opt into push notifications for sun state changes on favourited venues, and share venue sun status via native share API.
**FRs covered:** FR32, FR33, FR34, FR35

### Epic 7: "Polish & Platform" — About, 404, PWA & Offline
Users can learn how SunnySeat works (about page with accuracy stats and data sources), encounter a friendly 404 with redirect to map, install the app as a PWA, and see a graceful offline state with cached app shell.
**FRs covered:** FR47, FR48, FR49, FR50

### Retired Admin/Data Expansion Scope
Admin UI rebuild, admin venue CRUD/configuration, admin authentication, venue candidate review queues, and admin-operated data expansion are retired by the 2026-05-30 product decision. New and changed venues are managed by direct database insert/update queries only.
**FRs retired or superseded by manual database operations:** FR36, FR38, FR39, FR40, FR41, FR42, FR43, FR44, FR45
**FR retained with consumer-only interpretation:** FR37, limited to user feedback about existing venue outdoor seating and not a new-venue candidate queue.

---

## Epic 1: "See the Sun" — Project Foundation & Core Map Discovery

Users open SunnySeat, grant location, and see a warm sand map with amber/grey venue pins showing which venues are sunny right now. This is the "amber moment" — the defining experience.

### Story 1.1: Project Scaffold & Design System Foundation

As a **developer**,
I want a fully configured Next.js project with design tokens, custom fonts, and i18n infrastructure,
So that all subsequent feature development builds on a consistent, performant foundation.

**Acceptance Criteria:**

**Given** the repository has existing backend code in `lib/`
**When** the project is scaffolded with `create-next-app` (Next.js 16.2.2, TypeScript, Tailwind CSS v4, ESLint, App Router, Turbopack)
**Then** the app starts with `npm run dev` and renders a placeholder page without errors
**And** existing `lib/` backend code (solar, weather, supabase, middleware, types, utils, validation, buildings) is accessible via `@/` path alias

**Given** DESIGN.md defines colour, typography, spacing, shadow, radius, transition, z-index, gradient, blur, and component size tokens
**When** the Tailwind v4 `@theme` block in `globals.css` is configured
**Then** all DESIGN.md tokens are mapped to Tailwind utility classes (e.g., `bg-surface-cream`, `text-amber-dark`, `shadow-card`, `rounded-pill`)
**And** no raw hex values, pixel sizes, or inline styles are needed for design system values

**Given** the design specifies Plus Jakarta Sans (display) and Manrope (UI text)
**When** fonts are loaded via `next/font/google`
**Then** both fonts render with `display: 'swap'`, are preloaded and self-hosted from the same origin
**And** CSS custom properties are exposed for Tailwind v4 `@theme` integration
**And** `size-adjust` is applied automatically by Next.js to minimize CLS

**Given** the app supports Swedish (primary) and English
**When** next-intl is configured with locale files structured by feature area (`messages/sv/*.json`, `messages/en/*.json`)
**Then** the locale resolution chain works: URL param → sessionStorage → navigator.language → default SV
**And** the App Router `[locale]` segment is set up with `NextIntlClientProvider`

**Given** shadcn/ui is initialized
**When** commodity components are needed (Button, Card, Skeleton, Slider, Badge, Input, Sheet, etc.)
**Then** they are available in `components/ui/` with the project's design token theme applied

**Given** the architecture specifies a three-layer component structure
**When** the directory structure is created
**Then** `components/ui/`, `components/composed/`, and `components/custom/` directories exist with the feature-domain subdirectories defined in the architecture

### Story 1.2: Dev-Only State Forcing Mechanism

As a **developer**,
I want a dev-only query-parameter convention that forces a component into a specific UI state,
So that the visual validation gate can screenshot any screen or state variant without clicking through the app to reach it.

**Acceptance Criteria:**

**Given** the application has multiple screens that are state variants of the same URL (onboarding overlay, future premium paywall reference, inline feedback, etc.)
**When** the `useForcedState` hook is introduced at `nextjs-app/lib/dev/use-forced-state.ts`
**Then** the hook returns `null` unconditionally when `process.env.NODE_ENV === 'production'`
**And** the production-guard check lets dead-code elimination strip every `_state` branch from the production bundle
**And** in development the hook reads the `_state` query parameter via `useSearchParams()` from `next/navigation`
**And** the hook returns the raw string value of `_state`, or `null` if the parameter is absent

**Given** the convention must be discoverable by any developer or agent
**When** the hook is created
**Then** a short guide exists at `nextjs-app/docs/dev/state-forcing.md` documenting the `_state` parameter, production-guard behaviour, usage example, and the full list of valid screen IDs copied from `project-context.md`
**And** the guide explicitly notes that `project-context.md` is the canonical list — the docs page points at it rather than duplicating it

**Given** the pattern needs a reference implementation to copy, and no real state-variant component exists yet at this point in the epic
**When** a throwaway placeholder component is shipped at `nextjs-app/lib/dev/demo/dev-state-forcing-demo.tsx`
**Then** the component is named `DevStateForcingDemo` and the `demo/` subdirectory signals explicitly that this is scaffolding, not a production component
**And** the top of the file carries the exact comment `// TODO(story-1.5): Delete this file once onboarding overlay consumes useForcedState directly.`
**And** the component reads `useForcedState()` and renders a `"default"` panel when the hook returns `null` or a `"forced"` panel when it returns the string `"demo-active"` — proving the round-trip
**And** the pattern used in `DevStateForcingDemo` is identical to what every subsequent state-variant story will copy

**Given** the demo component must never appear in production and must not pollute the main app tree
**When** it is mounted in the Next.js app
**Then** it is reachable only via the route `/dev/state-forcing-demo`
**And** the route is gated by `process.env.NODE_ENV !== 'production'` — in production builds the route returns Next.js's 404
**And** the demo component is NOT imported, linked, or referenced anywhere in the main app tree (map, layout, navigation, etc.)

**Given** the pattern must be verifiable end-to-end
**When** a Playwright test runs in development mode
**Then** navigating to `/dev/state-forcing-demo?_state=demo-active` renders the `DevStateForcingDemo` "forced" panel within a deterministic timeout
**And** navigating to `/dev/state-forcing-demo` (no query parameter) renders the "default" panel
**And** a separate unit test verifies the hook returns `null` when `NODE_ENV === 'production'` — using `vi.stubEnv` or equivalent
**And** a build-time check or test verifies the `/dev/state-forcing-demo` route returns 404 in a production build
**And** all three tests are wired into the CI pipeline created in Story 1.6

**Given** `project-context.md` contains the Screen ID → Route Map
**When** the hook and the reference implementation are merged
**Then** the Screen ID → Route Map in `project-context.md` already matches the `_state` convention (updated in the same PR if any drift exists)
**And** the development-only seeded venue slug `test-venue-sunny` is documented in `project-context.md` under the State Forcing Convention section

**Design Gate Criteria:**
- **Visual:** No standalone visual deliverable. The reference component this story ships is dev-only scaffolding — visual validation for real state-variant screens begins with Story 1.5 (onboarding) and onward.
- **Behaviour:** `useForcedState` returns `null` in production and the `_state` query value in development; the reference component correctly switches state when forced; the convention matches the guide in `docs/dev/state-forcing.md`.
- **Animation:** No new animation introduced by this story.
- **Visual validation:** Running `scripts/visual-validate.sh <screen-id> <route>` against the first real state-variant screen (delivered by a later story) produces a PASS against the current visual reference — this story only establishes the mechanism that makes that validation possible.

### Story 1.3: Responsive Layout Shell & Navigation

As a **user**,
I want a responsive layout that adapts between mobile and desktop,
So that I have the right navigation and interaction model for my device.

**Acceptance Criteria:**

**Given** a user opens SunnySeat on a mobile device (viewport < 1024px)
**When** the layout renders
**Then** a BottomNavBar (40px height) is fixed at the bottom with three tabs: Karta, Favoriter, Om
**And** tab labels are uppercase `text-label-sm`, active tab uses `color-tab-active` (#d97706), inactive uses `color-tab-inactive` (#a8a29e)
**And** the nav bar has `color-surface-cream` background, 1px `color-border-nav` top border, and `shadow-nav-up`

**Given** a user opens SunnySeat on a desktop (viewport >= 1024px)
**When** the layout renders
**Then** a DesktopNavBar (84px height) is fixed at the top with the SunnySeat logo (left) and search bar placeholder (384px, centre-left)
**And** no bottom nav bar is rendered
**And** the navbar has `color-surface-cream` background and `shadow-card`

**Given** the app needs cross-cutting client state
**When** the providers are initialized in `app/providers.tsx`
**Then** context providers are nested in the correct order: QueryClientProvider > LanguageProvider > GeolocationProvider > MapProvider > TimeProvider
**And** `app/providers.tsx` is marked `'use client'` while `app/layout.tsx` remains a Server Component

**Given** the layout needs to respond to viewport changes
**When** the `useMediaQuery` hook detects a breakpoint change
**Then** the layout switches between mobile and desktop navigation without a page reload
**And** the breakpoint threshold is 1024px

**Given** all interactive elements need accessibility
**When** navigation tabs are rendered
**Then** each tab has an `aria-label`, keyboard navigation works between tabs, and visible focus indicators are present
**And** `prefers-reduced-motion` is respected for any tab switch transitions

**Design Gate Criteria:**
- **Behaviour:** All interactions and states defined in UX spec §BottomNavBar and §DesktopNavBar are implemented
- **Animation:** Tab switch and layout transitions match spec timings (±50 ms tolerance)
- **Visual validation:** No standalone screenshot gate. This component is validated as part of the parent screen(s) that render it (`map-primary`, `venue-detail`, `about`), plus component-level unit tests and the UX behaviour spec.

### Story 1.4: MapLibre Integration & Venue Pin Layer

As a **user**,
I want to see an interactive map with amber pins on sunny venues and grey pins on shaded venues,
So that I can instantly identify which nearby patios are in direct sun right now.

**Acceptance Criteria:**

**Given** the app has loaded and venue data is available from `/api/venues`
**When** the MapContainer component mounts
**Then** a MapLibre GL JS map renders with `color-surface-sand` (#f5f0e6) background, decorative road lines, and `gradient-map-overlay`
**And** the map instance is stored in MapContext and is never unmounted during SPA navigation
**And** MapLibre GL JS is loaded asynchronously to stay within the JS bundle budget

**Given** venue data includes sun exposure state for each venue
**When** venue pins are rendered on the map
**Then** sunny venues display amber pills (pointer tail, `color-amber-pin` #f1b100, 2px white border, `shadow-card`, sun icon 16.5px + white percentage text)
**And** shaded venues display grey pills (pointer tail, `color-pin-shaded` #e4e1e5, 1px border, `shadow-subtle`, `color-text-body` percentage text, 0.8 opacity)
**And** pins are differentiated by icon shape (sun icon), not colour alone, for colour-blind users (NFR27)
**And** rendering 50 venue pins completes within 100ms (NFR6)

**Given** a user taps an amber venue pin
**When** the pin is selected
**Then** the pin transitions from pill-with-pointer to a perfect circle (200ms, `easing-default`)
**And** MapContext updates `selectedVenueId`
**And** tapping the selected pin again deselects it and returns to the default pill shape

**Given** a user taps the map background (no pin)
**When** a venue pin is currently selected
**Then** the pin deselects and returns to its default state

**Given** the map has floating control buttons
**When** the controls render (right edge)
**Then** zoom +/- buttons and a my-location button are displayed as GlassButtons (48x48px, `color-glass-standard`, `blur-standard`, `shadow-button-float`, `radius-pill`)
**And** tapping my-location recentres the map on the user's position with a smooth pan (500ms)
**And** controls fade to 60% opacity during active map drag and return to full opacity on drag end

**Given** the map renders on mobile and desktop
**When** pins fade in as data arrives
**Then** each pin fades in individually (opacity 0->1, 150ms, `easing-enter`) — pins do not appear all at once
**And** if data takes >3s, a loading pill appears at top: "Laddar platser..." in `text-body-sm` / `color-text-muted`
**And** `prefers-reduced-motion` skips the fade animation (instant appear)

**Given** the map canvas fills the viewport
**When** pan and zoom gestures are used
**Then** map interaction runs at 60fps on mid-range mobile devices (NFR5)
**And** standard gestures work: pan (drag), pinch zoom, double-tap zoom in, two-finger tap zoom out
**And** after panning away, the map does NOT auto-recentre — spatial context is preserved

**Design Gate Criteria:**
- **Visual:** Matches active visual reference `map-primary` from the current source-of-truth bundle
- **Behaviour:** All interactions and states defined in UX spec §MapCanvas, §VenuePin, and §MapControls are implemented
- **Animation:** Pin entrance/exit and state-change animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

### Story 1.5: Onboarding & Geolocation

As a **first-time user**,
I want a welcoming onboarding screen that explains SunnySeat and requests my location,
So that I can immediately see sunny venues near me.

**Acceptance Criteria:**

**Given** a user visits SunnySeat for the first time (no localStorage flag set)
**When** the app loads
**Then** a full-screen onboarding screen displays with warm amber gradient background
**And** "SunnySeat" logo text is centred at top
**And** headline: "Hitta uteplatser i solen — just nu." in `text-display-xl` / white
**And** subtitle: "Platsen sparas aldrig." in `text-body-md` / white at 70% opacity
**And** primary CTA: "Använd min plats" (AmberCTAButton with location pin icon)
**And** secondary link: "Hoppa till Göteborgs centrum" in `text-body-sm` / white / underline

**Given** the user taps "Använd min plats"
**When** the browser geolocation permission dialog appears
**Then** the CTA shows a subtle pulse animation (opacity 0.8->1.0, 1s loop) while the dialog is open
**And** on permission granted: the onboarding screen fades out (250ms, `easing-exit`), the map loads centred on the user's location
**And** on permission denied: the same fade transition occurs, the map loads centred on Gothenburg centrum (approx. 57.7089, 11.9746)

**Given** the user taps "Hoppa till Göteborgs centrum"
**When** the secondary link is clicked
**Then** the onboarding screen fades out and the map loads centred on Gothenburg centrum
**And** no geolocation permission is requested

**Given** the user has visited before (localStorage flag exists)
**When** the app loads
**Then** the onboarding screen is NOT shown — the app opens directly to the map
**And** the map centres on the user's last known or current location (if permission was previously granted) or Gothenburg centrum (if denied)

**Given** `prefers-reduced-motion` is enabled
**When** the onboarding screen renders
**Then** no stagger animation on entrance (headline and CTA appear instantly)
**And** exit transition uses opacity-only (no fade timing)
**And** no CTA pulse animation during location pending

**Given** all onboarding text uses i18n keys
**When** the locale is Swedish or English
**Then** all strings render in the correct language via next-intl

**Given** the onboarding overlay is the first real state-variant screen in the app (replacing the Story 1.2 placeholder)
**When** the onboarding component is implemented
**Then** it consumes `useForcedState()` from `nextjs-app/lib/dev/use-forced-state.ts` and renders the onboarding overlay when the hook returns `"onboarding"` — bypassing the localStorage first-visit gate in dev/preview builds
**And** navigating to `/?_state=onboarding` in development renders the onboarding screen over the map regardless of whether the localStorage flag is set
**And** the Playwright test created in Story 1.2 that targets `/dev/state-forcing-demo?_state=demo-active` is replaced by a test that targets `/?_state=onboarding` and verifies the real onboarding overlay renders
**And** the scaffolding file `nextjs-app/lib/dev/demo/dev-state-forcing-demo.tsx` is deleted in the same commit
**And** the dev-only route `/dev/state-forcing-demo` is removed in the same commit
**And** no remaining references to `DevStateForcingDemo`, `dev-state-forcing-demo`, or `/dev/state-forcing-demo` exist anywhere in the repository (verified via grep as part of this AC)

**Design Gate Criteria:**
- **Visual:** Matches active visual reference `onboarding` from the current source-of-truth bundle
- **Behaviour:** All interactions and states defined in UX spec §OnboardingScreen are implemented; `useForcedState()` correctly bypasses the localStorage gate in development.
- **Animation:** Entrance stagger and exit fade animations match spec timings (±50 ms tolerance).
- **Visual validation:** `scripts/visual-validate.sh onboarding /?_state=onboarding` produces PASS for both mobile and desktop viewports, and the scaffolding route `/dev/state-forcing-demo` no longer exists.

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Expand the state-forcing demo deletion scope: AC-514 above already calls out `dev-state-forcing-demo.tsx` and the `/dev/state-forcing-demo` route, but the same Story-1.5 commit must also delete `nextjs-app/test/unit/dev-state-forcing-page.test.tsx` and `nextjs-app/test/e2e/dev-state-forcing.spec.ts`. *(Source: code review of 1-2-dev-only-state-forcing-mechanism, 2026-04-19.)*
> - Add lat/lng query-key bucketing inside `useVenueSearch` (round to 4 decimal places ≈ 10 m) so geolocation jitter does not flood TanStack's cache once the hook starts receiving real GPS coordinates. *(Source: code review Round 1 of 1-4-maplibre-integration-venue-pin-layer, 2026-05-01.)*
> - Cover the gap between `MapLoadingFallback` unmount and the first MapLibre tile paint: the onboarding overlay introduced in this story sits above the map and naturally masks the gap, but if onboarding is dismissed before tiles paint the Skeleton must extend to cover both phases. *(Source: code review Round 1 of 1-4-maplibre-integration-venue-pin-layer, 2026-05-01.)*

### Story 1.6: CI/CD Quality Gates

As a **developer**,
I want automated quality gates on every PR,
So that code quality, performance, and accessibility standards are enforced before merge.

**Acceptance Criteria:**

**Given** a PR is opened against the main branch
**When** the CI pipeline runs
**Then** Vitest unit tests execute and must all pass
**And** Playwright E2E test infrastructure is configured (tests can be added by future stories)
**And** the pipeline fails if any test fails

**Given** the CI pipeline includes accessibility checks
**When** axe-core runs against rendered pages
**Then** zero critical or serious accessibility violations are allowed
**And** eslint-plugin-jsx-a11y reports zero errors

**Given** the CI pipeline includes performance checks
**When** Lighthouse runs against the built app
**Then** Performance score must be >= 90
**And** Accessibility score must be >= 95

**Given** the CI pipeline includes bundle analysis
**When** @next/bundle-analyzer runs
**Then** total JS bundle must be <= 400KB gzipped
**And** MapLibre GL JS is confirmed to load asynchronously (not in the main bundle)

**Given** a developer needs to verify these gates locally
**When** they run the appropriate npm scripts
**Then** the same checks can be executed in the local development environment before pushing

**Given** the vendored Claude Design prototypes are currently masked via `eslint.config.mjs` `globalIgnores` (added in Story 1.4)
**When** Story 1.6 audits CI/CD coverage
**Then** the 260+ pre-existing ESLint errors in `nextjs-app/docs/design/references/claude-design/**` are walked, classified (vendored noise vs. accidentally-included real code), and the ignore-glob is tightened accordingly
**And** any prototype errors that can be cleaned upstream (in `scripts/fetch-claude-design.sh` post-processing) are fixed at the fetch stage rather than ignored
**And** the ignore retains a code comment linking back to the audit results so future agents understand which errors are intentionally suppressed

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Audit pre-existing 260+ ESLint errors in vendored Claude Design prototypes — covered by the AC immediately above. *(Source: code review Round 1 of 1-4, 2026-05-01, decision D3=B.)*
> - Wrap `i18n/request.ts` dynamic-import in a try/catch so a malformed message JSON file does not crash SSR — surface a Swedish/English fallback message instead. *(Source: code review of 1-1, 2026-04-17.)*
> - Add `, system-ui, sans-serif` generic-family fallback to font CSS variables in `nextjs-app/app/globals.css:14-15` to remove FOUT-flash on slow networks; verify Lighthouse CLS measurement does not regress. *(Source: code review of 1-1, 2026-04-17.)*
> - Move build-only deps (`shadcn`, `tailwindcss`, `@tailwindcss/postcss`, `tw-animate-css`) from `dependencies` to `devDependencies` in `nextjs-app/package.json`; verify the bundle-analysis AC passes after the move. *(Source: code review of 1-1, 2026-04-17.)*
> - Reconcile `--ease-*` (in `globals.css`) vs `easing-*` (in `DESIGN.md`) naming — pick one and update the other plus all consumers. *(Source: code review of 1-1, 2026-04-17.)*
> - Audit and fix the systemic `--spacing-*` scale mismatch in `nextjs-app/app/globals.css:61-70` (discrete `--spacing-1…16` overrides halve every numeric Tailwind utility — `h-10` resolves to 20 px, not 40). Pick a consistent scale convention, audit existing usages, and migrate the codebase. **Must land BEFORE 1.6's bundle/Lighthouse gates** so the gates measure the corrected output. *(Source: code review of 1-3, 2026-04-20.)*
> - Replace `MapContainer`'s `console.info` slow-load metric (which measures style-load, not tile-paint) with proper telemetry — Lighthouse Performance ≥ 90 in this story covers tile-paint timing more directly, so the existing metric can be removed or reworked into a real telemetry hook. *(Source: code review Round 1 of 1-4, 2026-05-01.)*
> - Reconcile the Tailwind v4 `--z-*` namespace alongside the `--spacing-*` reconciliation already on this story. The current `@theme` tokens (`--z-base`, `--z-pin`, `--z-bottom-sheet-peek`, `--z-floating-buttons`, `--z-glass-panel`, `--z-bottom-sheet-full`, `--z-modal`, `--z-toast`) silently fail to generate `.z-<name>` utilities — only raw numeric `.z-{N}` rules compile. Tailwind v4 expects the namespace `--z-index-*` for z-index utilities. Either rename the @theme tokens to `--z-index-*` and re-verify the same set of class names continues to compile, OR introduce explicit `@utility z-modal { z-index: var(--z-modal); }` blocks for each token. Audit every `z-<name>` class across the codebase to confirm no silent breakage; Story 1.5 already worked around this in the onboarding overlay with `z-[60]`. *(Source: Story 1.5 implementation, 2026-05-04.)*
> - Investigate why `Accept-Language` is not honoured by `localePrefix: 'as-needed'` at the root path. Story 1.5 e2e tests had to drop the Swedish-text assertions because Playwright's `Accept-Language: sv-SE,sv` header in `extraHTTPHeaders` did not flip the dev server's locale negotiation off `en-US`. Investigate during 1.6 CI hardening; if a fix is found, restore the Swedish-text assertions in `nextjs-app/test/e2e/onboarding.spec.ts` and any other locale-aware e2e specs. *(Source: Story 1.5 implementation, 2026-05-04.)*

---

## Epic 2: "Explore & Compare" — Venue List, Detail & Sun Intelligence

Users can browse a ranked venue list, search by name/area, view rich venue detail with sun timelines, see confidence percentages, scrub through today's time, and have data auto-refresh in the background.

### Story 2.1: Venue Quick-Info Card

As a **user**,
I want a compact venue summary to appear when I tap a map pin,
So that I can quickly compare venues without leaving the map view.

**Acceptance Criteria:**

**Given** a user taps an amber or grey venue pin on the map
**When** the pin is selected
**Then** a VenueQuickInfo card slides up from the bottom (200ms, `easing-enter`) showing: venue name, sun time range ("Sol 13:00–18:30"), confidence %, distance, and a "Visa Rutt" button (placeholder action for Epic 3)
**And** the card appears above the time slider area on mobile, or as a floating popover near the pin on desktop

**Given** a VenueQuickInfo card is visible
**When** the user taps on the venue name
**Then** the app navigates to the full venue detail view (Story 2.3)

**Given** a VenueQuickInfo card is visible
**When** the user taps the map background (outside the card and any pin)
**Then** the card dismisses (150ms, `easing-exit`) and the selected pin deselects

**Given** a VenueQuickInfo card is visible for venue A
**When** the user taps a different pin (venue B)
**Then** the card content crossfades (150ms) to venue B's data — the card stays in position, no dismiss-then-reappear
**And** the previous pin deselects and the new pin enters selected state

**Given** the QuickInfo card renders on desktop (viewport >= 1024px)
**When** the card appears
**Then** it renders as a floating popover near the selected pin with fade-in + scale from 0.95 to 1.0 (200ms, `easing-enter`)
**And** includes venue thumbnail photo and a "Mer Info" button in addition to mobile content

**Given** venue data is still loading when a pin is tapped
**When** the QuickInfo card opens
**Then** the venue name appears immediately and sun data shows a shimmer placeholder until loaded

**Given** `prefers-reduced-motion` is enabled
**When** the QuickInfo card appears or dismisses
**Then** transitions use opacity only (no slide or scale animation)

**Given** sun data text is displayed
**When** the card renders
**Then** sun time ranges use `text-label-lg` / `color-amber-dark`, venue name uses `text-heading-md`, and distance uses `text-body-sm`

**Design Gate Criteria:**
- **Visual:** Matches active visual reference `map-with-selected-venue` from the current source-of-truth bundle
- **Behaviour:** All interactions and states defined in UX spec §VenueQuickInfo are implemented
- **Animation:** Slide-up, dismiss, and crossfade animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Verify map persistence holds when the QuickInfo card mounts above the map — `MapContainer`'s cleanup unconditionally calls `map.remove()`, which is fine while `/` is the only route but can tear down the map if a parent re-renders trigger an unmount. Add a persistence guard (e.g. compare a "lifecycle id" on cleanup) if a re-mount is observed during 2.1 testing. *(Source: code review Round 1 of 1-4, 2026-05-01.)*
> - Promote `useGeolocation` to a context-backed singleton (`GeolocationProvider` in `AppContextProviders`). Story 1.5 ships the hook as a per-instance hook per its reference implementation; each call site (`OnboardingScreen`, `OnboardingGate`, `MapView`, `MapControls`) gets independent state. For first-visit users post-grant, only `OnboardingScreen` knows the user's coords — `MapView`'s venue search stays on Gothenburg-centrum fallback until refresh, so the QuickInfo card displays the wrong "closest venues". 2.1 is the first UX visibly affected. Promote without breaking the public hook API, and add a unit test asserting one `getCurrentPosition` call across multiple sibling consumers. *(Source: Story 1.5 implementation, 2026-05-04.)*
> - Add IP-based throttle and `X-Forwarded-For` validation to `/api/venues` — fixture-backed today, but route shape persists into 2.x with real Supabase data. 2.1 is the first story to expose the route to real production traffic. *(Source: code review Round 2 of 1-4, 2026-05-03.)*
> - Add `must-revalidate` and `ETag` to `/api/venues` cache headers — clients revalidating after 30s `max-age` get a fresh JSON every time. Couple ETag rollout with the Supabase migration in 2.x. *(Source: code review Round 2 of 1-4, 2026-05-03.)*
> - Validate venue uniqueness at the `/api/venues` boundary — the fixture-driven 1.4 implementation has a `seenIds.has(venue.id) return` skip and an unhandled "two venues at same lat/lng" overlap. With real data in 2.1, normalise both `id` and `(lat, lng)` collisions. *(Source: code review Round 2 of 1-4, 2026-05-03.)*
> - Normalise the API to a single canonical coordinate name (`lat`/`lng` OR `latitude`/`longitude`, not both) — current `??` precedence silently ignores the secondary name. *(Source: code review Round 2 of 1-4, 2026-05-03.)*
> - Validate at the DTO boundary that `mapVenueDtoToPinData` reads the same coordinate fields the API contract publishes — currently the mapper uses `lat`/`lng` but `CoordinatesDto` carries both `lat`/`lng` and `latitude`/`longitude` redundantly; if upstream stops populating `lat`/`lng`, mapper produces NaN markers silently. *(Source: code review Round 2 of 1-4, 2026-05-03.)*

### Story 2.2: Venue List & Bottom Sheet

As a **user**,
I want to browse a list of nearby venues ranked by sun exposure,
So that I can compare options linearly when I prefer a list over scanning map pins.

**Acceptance Criteria:**

**Given** the user is on the map screen (mobile)
**When** the venue list bottom sheet is in peek state
**Then** the sheet shows ~100px above the bottom nav bar with `radius-panel` (32px) top corners, `shadow-sheet-peek-up`, `color-surface-cream` background
**And** a drag handle pill (40px wide, `color-drag-handle-map` at 40% opacity) is visible at the top
**And** the map remains visible and interactive behind the sheet

**Given** the bottom sheet is in peek state
**When** the user drags the handle upward
**Then** the sheet expands to full state (300ms, `easing-spring`) with `radius-sheet-full` (40px), `shadow-sheet-full-up`
**And** the drag handle changes to 48px wide, `color-drag-handle`
**And** a "Hitta solen nu" header appears with venue cards below
**And** the map is dimmed but visible behind the full sheet

**Given** the sheet is in full state
**When** the user drags down
**Then** the sheet transitions back to peek (300ms, `easing-spring`) or dismisses off-screen depending on velocity/position

**Given** venue data is loaded
**When** the venue list renders
**Then** venues are sorted sunny-first, then closest-first within sunny
**And** each VenueCard shows: thumbnail (87x72px, `radius-venue-image`), sun badge overlay (28x28px circle, `color-amber-primary`), venue name (`text-heading-md`), sun time range + confidence in `color-amber-dark`, and distance
**And** cards stagger fade-in on sheet expand (50ms delay between cards, 150ms fade each)

**Given** the user taps a venue card in the list
**When** the card is selected
**Then** the sheet dismisses to peek, the map centres on that venue, its pin enters selected state, and the VenueQuickInfo card appears

**Given** the user is on desktop (viewport >= 1024px)
**When** the venue list renders
**Then** it appears as a 190px side panel overlaying the left edge of the map with "TOPPVAL NÄRA DIG" header
**And** the panel contains compact scrollable venue cards
**And** the map canvas is not reduced — the panel overlays it

**Given** there are no venues in the visible area
**When** the venue list renders
**Then** it shows "Inga platser hittades i det här området." with no illustration

**Given** `prefers-reduced-motion` is enabled
**When** cards appear or the sheet transitions
**Then** no stagger animation (instant card appear), sheet uses opacity transition only

**Design Gate Criteria:**
- **Visual:** Matches active visual reference `map-panel-venues` from the current source-of-truth bundle
- **Behaviour:** All interactions and states defined in UX spec §VenueList and §BottomSheet are implemented
- **Animation:** Sheet drag, snap, and card stagger animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Pre-emptively replace `useMediaQuery`'s `useState(false)` default with a lazy initializer (`() => typeof window === 'undefined' ? false : window.matchMedia(query).matches`) while this story is touching the hook. Story 2.2 itself uses a static `DESKTOP_BREAKPOINT_MEDIA_QUERY` so the bug is dormant, but a future caller passing a dynamic query would otherwise see a one-render flash of `false`. *(Source: code review Round 2 of 1-3, 2026-04-20.)*
> - Add a final visual-regression verification for the Story 2.1 accepted scope drift: with `/?venue=test-venue-sunny&_state=map-with-selected-venue` on mobile, the venue-list peek sheet ("4 soliga platser nära dig") must render under/coexist with the selected QuickInfo card, the map must remain visible behind both layers, and `scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue" mobile` must no longer fail for the missing list sheet. *(Source: Story 2.1 Anthropic visual gate accepted by Rasmus on 2026-05-13.)*

### Story 2.3: Venue Detail View

As a **user**,
I want to see full venue information including a sun timeline,
So that I can make a confident decision about where to go.

**Acceptance Criteria:**

**Given** the user navigates to venue detail (via QuickInfo tap or "Mer Info")
**When** the venue detail renders on mobile
**Then** a full bottom sheet slides up (300ms, `easing-spring`) containing:
- Drag handle (48px, `color-drag-handle`)
- Hero image (full-width) with sun badge overlay (28x28px, "85%" + sun icon, `color-amber-gold` at 90% opacity, `blur-standard`)
- Venue name in `text-display-xl` (28px/ExtraBold/Plus Jakarta Sans, tracking -0.75px)
- Description in `text-body-lg` / `color-text-body`
- "SOLTIDER IDAG" InfoCard (`color-surface-muted`, `radius-card`) with section label in `text-heading-sm` / uppercase / tracking +1.4px
- SunTimeline gradient bar (`gradient-timeline-bar`, 12px height) with current time marker
- Opening hours row with clock icon
- Address row with pin icon + "ÖPPNA I KARTOR" link in `color-amber-dark`
- Full-width "Visa Rutt" RouteButton (`gradient-route-button`, `shadow-route-button`) — placeholder action for Epic 3
**And** the URL updates to `/?venue=[slug]` for deep-linking

**Given** the venue detail renders on desktop
**When** the panel appears
**Then** it renders as a 390px right-side panel sliding in from the right edge (300ms, `easing-spring`)
**And** includes a close button (top-right) and favourite/share button placeholders
**And** the map remains interactive behind the panel (not dimmed)
**And** the left venue list panel remains visible

**Given** the venue has a sun timeline for today
**When** the SunTimeline component renders
**Then** it displays a gradient bar showing solid amber segments for sun windows and transparent for shaded periods
**And** the gradient fill animates from left to current-time position (400ms, `easing-enter`) on first render
**And** current time is indicated with `text-time` styling (14px/ExtraBold/Plus Jakarta Sans)

**Given** the venue will lose sun soon
**When** shadow is imminent (within configurable threshold)
**Then** a warning text "Blir skuggigt om X min" appears in `color-error` (#ba1a1a) below opening hours

**Given** venue data is loading
**When** the detail sheet/panel opens
**Then** venue name appears immediately, with shimmer skeleton placeholders for hero image, timeline, and detail rows

**Given** the user drags down on the sheet handle (mobile)
**When** the sheet dismisses
**Then** it slides down (250ms, `easing-exit`) and returns to the map with the venue pin still selected

**Given** `prefers-reduced-motion` is enabled
**When** the venue detail renders
**Then** no SunTimeline gradient animation (instant fill), sheet uses opacity-only transition

**Design Gate Criteria:**
- **Visual:** Matches active visual reference `venue-detail` from the current source-of-truth bundle
- **Behaviour:** All interactions and states defined in UX spec §VenueDetail and §SunTimeline are implemented
- **Animation:** Sheet slide-up, timeline gradient fill, and dismiss animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Narrow `nextjs-app/proxy.ts`'s middleware matcher away from the blanket `.*\\..*` regex toward an explicit list of static-asset extensions, so legitimate dynamic routes like `/venue/cafe-4.9-stars` (the first such URL family lands in this story) are not accidentally excluded from middleware. *(Source: code review of 1-1, 2026-04-17.)*
> - Introduce `nextjs-app/i18n/navigation.ts` via next-intl's `createNavigation` and migrate all `<Link>` usages to the locale-aware variant. With `localePrefix: 'as-needed'`, `href="/"` from a non-default-locale page currently triggers a middleware redirect round-trip; the new internal route family added by 2.3 is the right moment to land the refactor. *(Source: code review of 1-3, 2026-04-20.)*
> - Add final visual-regression verification for the Story 2.1 manual review gate: Story 2.1 only implemented the QuickInfo-to-detail handoff, so the 2.1 gate manually accepted the `venue-detail` mobile and desktop checks. This story must make `scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" mobile` and the desktop variant pass with the real detail sheet/panel. *(Source: Story 2.1 manual visual acceptance artifact `2-1-venue-quick-info-card-review-20260513-112742.log`.)*

### Story 2.4: Venue Search

As a **user**,
I want to search for venues by name or area,
So that I can find a specific place or explore a neighbourhood.

**Acceptance Criteria:**

**Given** the search bar is visible (mobile: floating glass bar at top of map, desktop: 384px search bar in navbar)
**When** the user taps/clicks the search bar
**Then** the input focuses and the keyboard opens (mobile)
**And** the search bar has `color-surface-muted` background, `radius-pill`, placeholder text "Sök plats eller område i Göteborg..."

**Given** the user types a search query
**When** text is entered
**Then** a cmdk combobox dropdown appears inline below the input with matching venue results
**And** results are filterable by venue name and area within Gothenburg
**And** the combobox supports full keyboard navigation (`role="combobox"`, arrow keys, enter to select)

**Given** the user selects a venue from search results
**When** a result is tapped/clicked or selected via keyboard
**Then** the map centres on the selected venue, its pin enters selected state, and VenueQuickInfo appears
**And** the search dropdown closes and the input blurs

**Given** the search returns no results
**When** the query doesn't match any venue
**Then** "Inga resultat för '[query]'" appears inline below the input
**And** the map view remains unchanged

**Given** the user clears the search or taps away
**When** the search is dismissed
**Then** the dropdown closes and the map returns to its previous state

**Given** all search UI text uses i18n keys
**When** the locale is Swedish or English
**Then** placeholder text, "no results" message, and any labels render in the correct language

**Design Gate Criteria:**
- **Behaviour:** All interactions and states defined in UX spec §SearchBar are implemented
- **Animation:** Dropdown appear/dismiss animations match spec timings (±50 ms tolerance)
- **Visual validation:** No standalone screenshot gate. This component is validated as part of the parent screen(s) that render it (`map-primary`), plus component-level unit tests and the UX behaviour spec.

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Normalise filter objects passed to `queryKeys.list(filters)` so cache lookups stay stable across consumers that build filters in different key orders or with `undefined` values. 2.4 introduces the first non-trivial filter shape (text query, area chips); fix the factory at the same time. *(Source: code review of 1-1, 2026-04-17.)*
> - Add a final visual-regression verification for the Story 2.1 accepted scope drift: the mobile floating search/header chrome must be present on the map, must not overlap selected QuickInfo or map controls, and `scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue" mobile` must no longer fail for missing top search/header chrome. *(Source: Story 2.1 Anthropic visual gate accepted by Rasmus on 2026-05-13.)*
> - Add final visual-regression verification for the Story 2.2 accepted scope drift: if search/filter chips are still part of the accepted design, the mobile search/header and venue-list filter chip row (`Mest sol`, `Nära mig`, `Kafé`, `Öppet nu`) must be implemented and `scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues" mobile` must no longer fail for missing top search/header/filter-chip chrome. If those chips are intentionally removed from product scope, rebaseline the reference with rationale and update `REBASELINE-LOG.md`. *(Source: Story 2.2 Anthropic visual gate accepted by Rasmus on 2026-05-14.)*
> - Add final visual-regression verification for the Story 2.2 Round 1 accepted selected-venue drift: decide whether the settings/gear button is part of the accepted map top chrome. If yes, implement it and verify `scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue" mobile` no longer fails for missing settings/gear UI; if no, rebaseline the reference with rationale and update `REBASELINE-LOG.md`. *(Source: Story 2.2 code review Round 1 visual regression accepted by Rasmus on 2026-05-14.)*
> - Add final visual-regression verification for the Story 2.3 accepted venue-detail drift: decide and implement the venue-list `Nära mig` / `Favoriter` tabs and `Mest sol` / `Närmast` sort/filter controls if they remain in the accepted desktop detail design, then verify `scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" desktop` no longer fails for missing left-panel tabs/sort chrome. If these controls are removed from product scope, rebaseline with rationale and update `REBASELINE-LOG.md`. *(Source: Story 2.3 visual gate accepted by Rasmus on 2026-05-16.)*

### Story 2.5: Free Time & Date Planner

As a **user**,
I want to scrub through time and select a future date for sun predictions,
So that I can plan when to visit a venue for optimal sun exposure without a paywall.

**Acceptance Criteria:**

**Given** the planner is visible on the map screen
**When** it renders on mobile
**Then** a TimeSliderPanel appears as a floating glass panel: `color-glass-slider` (rgba(255,255,255,0.9)), `blur-heavy` (12px), `radius-panel` (32px), `shadow-card-up`
**And** contains a time scrubber track (`size-slider-track-h` 6px, `color-surface-slider-track`, `radius-pill`) with a thumb (`size-slider-thumb` 14.1px, `color-amber-dark` background, 2.35px white border)
**And** the current time is displayed in `text-time` styling
**And** the selected date is visible as an interactive date control

**Given** the planner renders on desktop
**When** the layout is desktop (>= 1024px)
**Then** the planner is integrated into the bottom bar spanning full width
**And** includes selected date on the left and selected time on the right

**Given** the user drags the slider thumb for today
**When** the thumb moves to a new time position
**Then** all venue pins on the map update their sun state (amber/grey) to reflect the selected time
**And** VenueQuickInfo and venue list cards update their sun data to match
**And** the thumb snaps to tick marks on release with spring easing (`easing-spring`, 200ms)

**Given** the time slider tick marks are displayed
**When** the slider renders
**Then** tick labels show at key time intervals in `text-label-xs-medium` / `color-text-muted`
**And** the active/current tick uses `color-amber-dark`

**Given** the user opens the date picker
**When** they select any future date within the current sun season
**Then** no premium gate, lock badge, Season Pass prompt, or payment UI appears
**And** all venue pins update to show predicted sun exposure states for the selected date
**And** the time slider allows scrubbing through the selected future date's hours

**Given** the user scrubs time on a selected future date
**When** the slider moves to a new time position
**Then** venue pins, VenueQuickInfo, venue list cards, and venue detail all update to reflect the predicted sun states for that date+time combination

**Given** future date predictions include weather confidence
**When** confidence scores are displayed
**Then** they reflect weather forecast uncertainty for the future date
**And** the same staleness/tilde rules apply from Story 2.6

**Given** the user returns to today's date
**When** "Idag" or the current date is selected
**Then** the map reverts to real-time sun states with auto-refresh
**And** the time slider returns to the current time position

**Given** the user releases the slider at a new time
**When** the map data needs to update
**Then** venue sun states are fetched for the selected date/time via the existing sun exposure API
**And** if the response is slow, current pin states remain visible (no loading spinner on the map)

**Given** all planner UI uses i18n keys
**When** the locale is Swedish or English
**Then** date formatting follows 24-hour Swedish convention and month/day names are localised

**Given** Story 2.5 is ready for review
**When** the implementation is scanned for active monetization dependencies
**Then** planner/date code paths do not import or call `PremiumContext`, `usePremiumStatus`, `queryKeys.premium`, `/api/payments/*`, Swish helpers, paywall components, lock-badge components, Season Pass copy, or premium JSON messages
**And** any reusable Future Monetization snippets discovered during implementation are moved out of live runtime paths and preserved in the Future Monetization archive instead of being left as unused app code

**Given** `prefers-reduced-motion` is enabled
**When** the slider thumb snaps on release
**Then** the snap is instant (no spring animation)

**Design Gate Criteria:**
- **Behaviour:** All interactions and states defined in UX spec §TimeSliderPanel are implemented
- **Animation:** Thumb snap, calendar open/close, pin update, and panel entrance animations match spec timings (±50 ms tolerance)
- **Visual validation:** No standalone screenshot gate. This component is validated as part of the parent screen(s) that render it (`map-primary`), plus component-level unit tests and the UX behaviour spec.

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Replace `TimeProvider`'s `new Date()` initial value (currently a non-deterministic lazy initializer) with either a `useEffect`-driven client-only value or a server-provided ISO string prop, before this story renders `currentTime` for the first time. The current shape causes an SSR/CSR hydration mismatch the moment a consumer reads `currentTime`. *(Source: code review of 1-3, 2026-04-20.)*
> - Add a final visual-regression verification for the Story 2.1 accepted scope drift: the time slider/date navigation panel must render with selected QuickInfo, preserve the QuickInfo spacing contract above the slider area, update selected venue sun text when scrubbed, and `scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue" mobile` must no longer fail for missing time/date chrome. *(Source: Story 2.1 Anthropic visual gate accepted by Rasmus on 2026-05-13.)*
> - Add final visual-regression verification for the Story 2.2 accepted scope drift: the time slider/date navigation panel must render behind/around the venue-list sheet without overlap, and `scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues" mobile` must no longer fail for missing time/date chrome. *(Source: Story 2.2 Anthropic visual gate accepted by Rasmus on 2026-05-14.)*
> - Add final visual-regression verification for the Story 2.2 Round 1 selected-venue rerun: after implementing the time/date panel, `scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue" mobile` must no longer fail for missing date header, arrow navigation, calendar icon, or time slider ticks; it also must not show a locked-planning prompt, Season Pass prompt, or paywall affordance. The venue-list peek sheet must remain visible under selected QuickInfo. *(Source: Story 2.2 code review Round 1 visual regression accepted by Rasmus on 2026-05-14; MVP scope correction 2026-05-19.)*
> - Add final visual-regression verification for the Story 2.3 accepted venue-detail drift: the global time/date slider chrome must render with the open venue-detail sheet/panel and selected-time changes must update map pins, list cards, QuickInfo, and venue detail consistently. Verify `scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" mobile` and `desktop` no longer fail for missing bottom time/date slider chrome. *(Source: Story 2.3 visual gate accepted by Rasmus on 2026-05-16.)*
> - Add final visual-regression verification for the Story 2.4 accepted search/list composite drift: after global time/date chrome lands, rerun `scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue" mobile`, `scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues" mobile`, and `scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" desktop`; none should fail for missing date navigation, time bubble, scrubber track, hour markers, or desktop bottom time/date controls, and none should show locked-planning/paywall chrome. The Story 2.4 search/header + venue-list sort/filter controls must remain visible and non-overlapping. *(Source: Story 2.4 visual gates accepted by Rasmus on 2026-05-18; MVP scope correction 2026-05-19.)*
> - Add a final MVP monetization quarantine scan before review: `rg -n "PremiumContext|usePremiumStatus|queryKeys\\.premium|/api/payments|Swish|swish|paywall|premium gate|lock badge|Season Pass|Säsongskortet" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib nextjs-app/messages`. Any match in active planner/date runtime paths must be removed, moved to an inactive future archive, or documented as a non-runtime preserved reference. *(Source: MVP scope correction follow-up, 2026-05-19.)*

### Story 2.6: Confidence Display & Auto-Refresh

As a **user**,
I want to see how confident the sun prediction is and have data stay current,
So that I can trust the information and make decisions based on up-to-date data.

**Acceptance Criteria:**

**Given** venue sun data includes both geometric certainty and weather-based cloud cover
**When** confidence scores are displayed (pins, QuickInfo, venue detail, venue list cards)
**Then** the blended confidence percentage is shown (e.g., "85%") using `text-amber-text` (#fbbc00) on venue cards and `color-amber-dark` in detail views
**And** the percentage reflects the combined geometric + weather confidence per the existing API response

**Given** weather data from Met.no is older than 2 hours
**When** confidence scores are displayed
**Then** a tilde prefix is added ("~85%" instead of "85%") to signal reduced certainty
**And** the sun data is still displayed — it does not block the UI

**Given** the Met.no weather API is completely down
**When** venue data is displayed
**Then** confidence percentages are hidden on affected venues
**And** sun predictions are served based on geometry only (without weather qualifier)
**And** no error message is shown to the user (silent degradation)

**Given** the app is active (tab/window is focused)
**When** 5 minutes have elapsed since the last data fetch
**Then** venue sun states auto-refresh via TanStack Query background refetch (NFR9)
**And** no visible loading indicator during background refetch — current data remains displayed
**And** pin states and list/detail data update silently when fresh data arrives

**Given** API responses include freshness headers
**When** the response contains `X-Weather-Updated-At` and `X-Sun-Data-Source` headers
**Then** the front-end uses these to determine staleness and apply the tilde prefix or hide confidence accordingly

**Given** the venue API fails entirely
**When** TanStack Query retries (3 attempts, exponential backoff) are exhausted
**Then** an inline message appears on the map: "Kunde inte ladda platser. Försök igen." with a retry button
**And** the error message tone is matter-of-fact Swedish, no exclamation marks or emoji

**Given** TanStack Query manages all server state
**When** query hooks are used for venue search, sun exposure, and weather data
**Then** all hooks use keys from the centralized `lib/query-keys.ts` factory
**And** stale time is set to 5 minutes for venue/sun data

**Given** confidence is displayed for both today's real-time state and Story 2.5's selected future date/time
**When** the front-end computes freshness, tilde display, hidden confidence, and background refresh behaviour
**Then** it treats selected date/time as normal free MVP app state
**And** it does not read premium status, payment state, Season Pass state, or any Future Monetization provider/hook to decide whether confidence is visible

**Design Gate Criteria:**
- **Behaviour:** All staleness, degradation, and error states defined in UX spec §error-degradation are implemented
- **Animation:** Inline error/retry and background-refresh transitions match spec timings (±50 ms tolerance)
- **Visual validation:** No standalone screenshot gate. This component is validated as part of the parent screen(s) that render it (`map-primary`, `venue-detail`), plus component-level unit tests and the UX behaviour spec.

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Add final visual-regression verification for the Story 2.2 accepted scope drift: venue-list cards must expose the agreed confidence/sun-percentage display format, and `scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues" mobile` must no longer fail for percentage/sun metadata formatting. If the Story 2.2 sun range + confidence + distance format remains the product decision, rebaseline the reference with rationale and update `REBASELINE-LOG.md`. *(Source: Story 2.2 Anthropic visual gate accepted by Rasmus on 2026-05-14.)*
> - Add final visual-regression verification for the Story 2.3 accepted venue-detail drift: percentage-labelled map pins and confidence/sun-percentage formatting must be implemented across map pins, left-list cards, QuickInfo, and venue detail, then `scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" desktop` must no longer fail for missing percentage pin styling or confidence/sun formatting. If the agreed display format differs from the reference, rebaseline with rationale and update `REBASELINE-LOG.md`. *(Source: Story 2.3 visual gate accepted by Rasmus on 2026-05-16.)*
> - Add final visual-regression verification for the Story 2.4 accepted visual drift: decide the final percentage/status presentation for venue list cards and venue detail headers, including whether `FULL SOL` / `MEST SKUGGA` labels are part of the accepted design. Verify `map-panel-venues` and desktop `venue-detail` no longer fail for missing sun-percentage/status formatting, or rebaseline with rationale if the current sun-window + confidence copy remains the product decision. *(Source: Story 2.4 visual gates accepted by Rasmus on 2026-05-18.)*
> - Add the MVP monetization quarantine scan before review and confirm any hits are inactive references only. Story 2.6 is not a monetization story; confidence display and auto-refresh must work for free current-time and future-date planner states without premium/payment branches. *(Source: MVP scope correction follow-up, 2026-05-19.)*

### Story 2.7: Save & View Favourites

As a **user**,
I want to save my favourite venues for quick access,
So that I can return to venues I like without searching again.

**Acceptance Criteria:**

**Given** the user is viewing a venue detail or VenueQuickInfo card
**When** they tap the favourite/heart button
**Then** the venue is saved to their favourites list in localStorage
**And** the heart button fills to indicate favourited state (GlassButton with `color-glass-lavender` background)
**And** tapping again removes the venue from favourites (toggle behaviour)
**And** no premium gate, lock badge, Season Pass prompt, or payment UI appears

**Given** the user navigates to the Favoriter tab (mobile bottom nav) or favourites section
**When** the favourites list renders
**Then** it shows all saved venues as VenueCards with current sun state data
**And** venues are sorted by sun exposure relevance (sunny first, then closest)
**And** each card shows the same information as the venue list (thumbnail, name, sun range, confidence, distance)

**Given** the user has no saved favourites
**When** the favourites section renders
**Then** an empty state message appears: "Du har inga sparade platser än."

**Given** favourites are stored in localStorage
**When** the user returns to the app in a later session
**Then** their favourites persist (no account needed)
**And** no PII is stored — only venue IDs

**Given** the favourite button needs accessibility
**When** the button renders
**Then** it has an `aria-label` ("Spara som favorit" / "Ta bort favorit") and visible focus indicator

**Given** Story 2.7 is ready for review
**When** the implementation is scanned for active monetization dependencies
**Then** favourites code paths do not import or call `PremiumContext`, `usePremiumStatus`, `queryKeys.premium`, `/api/payments/*`, Swish helpers, paywall components, lock-badge components, Season Pass copy, or premium JSON messages
**And** saved favourite state is available to every user without account, payment, premium flag, or recovery flow

**Design Gate Criteria:**
- **Visual:** Matches active visual reference `favourites-tab` after MVP rebaseline removes any lock-badge/paywall expectations.
- **Behaviour:** All interactions and states defined in UX spec §favourites are implemented as free MVP functionality.
- **Animation:** Heart toggle fill and favourites list entrance animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against `favourites-tab` passes before QA handoff.

> **Moved from former Story 6.1 by MVP scope correction (2026-05-19):** favourites are MVP functionality and are implemented before the later history/notification/sharing work in Epic 6.
>
> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Broaden the active-state predicate in `MobileNavBar.tsx:49` (and `DesktopNavBar.tsx` if applicable) from strict `normalizedPath === href` equality to a startsWith / pathname-prefix match (with explicit root handling so `/` doesn't match every page). Story 2.7 introduces the real `/favoriter` route and may later add nested URL structure (e.g. `/favoriter/<slug>`); fix the predicate before the regression manifests. *(Source: code review of 1-3, 2026-04-20.)*
> - Add final visual-regression verification for the Story 2.2 accepted scope drift: favourite/heart affordances and favourite states must render consistently in QuickInfo, venue detail, and any venue-list card context where the accepted MVP design includes them. If the venue-list reference still includes favourite affordances, `scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues" mobile` must no longer fail for missing favourite/heart UI after this story. *(Source: Story 2.2 Anthropic visual gate accepted by Rasmus on 2026-05-14.)*
> - Add final visual-regression verification for the Story 2.2 Round 1 accepted selected-venue drift: the `Favoriter` bottom-nav lock badge is intentionally removed by the MVP scope correction. Verify `scripts/visual-validate.sh map-with-selected-venue "/?venue=test-venue-sunny&_state=map-with-selected-venue" mobile` no longer fails for missing favourite affordances, and rebaseline with rationale if the old lock badge remains in the reference. *(Source: Story 2.2 code review Round 1 visual regression accepted by Rasmus on 2026-05-14; MVP scope correction 2026-05-19.)*
> - Add final visual-regression verification for the Story 2.3 accepted venue-detail drift: implement mobile and desktop favourite/heart affordances in venue detail where the accepted design requires them, persist/toggle state, and verify `scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" mobile` and `desktop` no longer fail for missing favourite/heart chrome. Also verify favourite state remains consistent in QuickInfo and venue-list card contexts. *(Source: Story 2.3 visual gate accepted by Rasmus on 2026-05-16.)*
> - Add final visual-regression verification for the Story 2.4 accepted search/list drift: favourite-oriented navigation must remain compatible with the canonical Story 1.3 `Karta` / `Favoriter` / `Om` navigation and must not show lock badges. Verify `map-with-selected-venue`, `map-panel-venues`, and `venue-detail` no longer fail for favourite/nav chrome, or rebaseline with rationale. *(Source: Story 2.4 visual gates accepted by Rasmus on 2026-05-18; MVP scope correction 2026-05-19.)*
> - Add the final MVP monetization quarantine scan before review: `rg -n "PremiumContext|usePremiumStatus|queryKeys\\.premium|/api/payments|Swish|swish|paywall|premium gate|lock badge|Season Pass|Säsongskortet" nextjs-app/app nextjs-app/components nextjs-app/hooks nextjs-app/lib nextjs-app/messages`. Any match in active favourites runtime paths must be removed, moved to an inactive future archive, or documented as a non-runtime preserved reference. *(Source: MVP scope correction follow-up, 2026-05-19.)*

---

## Epic 3: "Go & Confirm" — Routing, Feedback & Reviews

Users can get walking/biking directions to a venue, open it in their native maps app, submit sun accuracy feedback, confirm outdoor seating status, and read/write venue reviews. Completes the full venue visit loop.

> **Epic 3 sequencing note (2026-05-30):** Story 3.0 must be implemented before Stories 3.1-3.4 so routing, feedback, reviews, and visit-loop hardening do not build on admin/auth/candidate-review code that is no longer product scope.
>
> **Epic 3 pause note (updated 2026-06-05):** Story 3.0 is done, but Story 3.1 is paused. Complete Stories 3.0.1-3.0.7 first so routing, feedback, reviews, and confidence-heavy user flows do not build on the retired GeoPackage-only building data assumption or the narrower "Baskarta equals only `byggnad_l`" assumption.

### Story 3.0: Remove Admin Surface & Adopt Manual Venue Operations

As a **product owner and maintainer**,
I want all admin-related runtime code, tests, and documentation removed,
So that SunnySeat only supports consumer MVP flows and venue changes happen through direct database insert/update queries.

**Acceptance Criteria:**

**Given** the project no longer supports an admin page or admin venue configuration
**When** the active Next.js app is audited
**Then** no `/admin` page, `/api/admin` route, admin venue CRUD route, admin login route, admin authentication middleware, admin-specific provider, or admin-only component remains in live runtime paths
**And** no replacement admin UI/API is introduced in this story

**Given** venues will be added or changed only by direct database insert/update queries
**When** project documentation and planning artifacts are updated
**Then** they clearly state that venue onboarding/configuration is manual database work
**And** they no longer describe admin venue CRUD, admin geometry editing, admin building upload, admin candidate approval queues, or admin dashboards as planned SunnySeat product scope

**Given** admin authentication is no longer product scope
**When** dependencies, environment examples, types, and middleware are audited
**Then** unused admin-auth packages, JWT admin environment variables, admin user DTOs, role/claim helpers, and admin-only validation helpers are removed
**And** any server-only Supabase service-role code that remains is named and documented as backend infrastructure, not admin functionality

**Given** previous code may include venue candidate, verification, review-needed, or admin override concepts
**When** venue/domain types, mappers, fixtures, solar/building helpers, and public API responses are cleaned up
**Then** admin/candidate-review fields are removed from active contracts unless they are still required for public consumer functionality
**And** any retained manually-managed data concept uses neutral terminology such as manual or service-role rather than admin

**Given** tests may still cover removed admin behavior
**When** unit, component, E2E, and helper tests are audited
**Then** every test whose purpose is admin login, admin auth, admin venue CRUD, admin review queues, admin dashboard, admin building upload, or admin-only validation is removed
**And** remaining tests are updated so they assert the consumer/public behavior that still exists

**Given** the live database may contain admin-only schema or data
**When** the cleanup audit identifies database objects that should be dropped, renamed, or converted
**Then** the dev agent does not run destructive database changes automatically
**And** it creates `_bmad-output/implementation-artifacts/3-0-admin-db-cleanup.sql` containing the exact manual SQL for Rasmus to review and run
**And** if no database cleanup is required, the story completion notes explicitly say so with the audit basis

**Given** the admin cleanup is complete
**When** the regression gate runs
**Then** typecheck, lint, Vitest, Playwright, and an app build pass
**And** consumer functionality for map discovery, venue list, venue detail, search, planner/date simulation, confidence/refresh, and favourites remains unbroken
**And** scoped scans show no remaining admin runtime/test artifacts except approved historical planning references or this story's own cleanup notes

**Design Gate Criteria:**
- **Visual:** No standalone visual reference. This is a cleanup/infrastructure story with no intended consumer UI change.
- **Behaviour:** Existing consumer flows must continue to behave as they did before the admin cleanup.
- **Visual validation:** Run visual validation only if public consumer UI files are changed; otherwise document that no visual gate applies because no consumer UI was intentionally changed.

### Story 3.0.1: Shadow Data ADR & Planning Realignment

As a **maintainer**,
I want the shadow-data course correction captured in durable planning artifacts,
So that every future story uses the real MVP data assumptions instead of the retired GeoPackage-only assumption.

**Acceptance Criteria:**

**Given** `building_geodata/byggnad_kn1480.gpkg` has no Z geometry, building-height attribute, roof geometry, or DSM data
**When** the ADR and planning docs are updated
**Then** they state that the GeoPackage is a 2D footprint and metadata source only
**And** they adopt the MVP open-data path: 2D footprints + Göteborg Baskarta XYZ object inventory + Göteborg Höjdmodell 2022 DTM-derived ground elevation
**And** they define the MVP launch bbox as EPSG:3007 `x=140000..150000, y=6390000..6410000`

**Given** future paid DSM/LOD2/LOD3 data may become available
**When** source precedence is documented
**Then** manual verified overrides outrank paid LOD2/LOD3, paid classified DSM/LAS, current open-derived heights, and OSM/heuristic fallback
**And** provenance and rollback requirements are preserved for every source.

**Design Gate Criteria:**
- **Visual:** No standalone visual reference. Planning-only story.
- **Behaviour:** No runtime behaviour change.
- **Visual validation:** Not applicable.

### Story 3.0.2: Shadow Caster Schema & RPC Contract

As a **backend maintainer**,
I want a provenance-rich shadow-caster schema and runtime RPC contract,
So that the shadow engine consumes only filtered active casters with explicit quality and source metadata.

**Acceptance Criteria:**

**Given** derived shadow casters need more metadata than the existing `Geometry`/`Height` compatibility shape
**When** the database migration or manual SQL plan is created
**Then** it defines `shadow_casters` fields for geometry, height, RH2000 ground/roof Z, height method/source, source dataset/external ID, source object metadata, quality score, tier, filter decision/reasons, CRS/provenance metadata, caster class, source priority, active flag, import batch, and timestamps.

**Given** `nextjs-app/lib/solar/shadow-calculation-service.ts` currently calls `get_buildings_near_point`
**When** the RPC contract is updated
**Then** `get_buildings_near_point` remains as a compatibility RPC or view-backed adapter until the TypeScript engine is renamed
**And** it returns only runtime-active records: `active = true`, `filter_decision = 'include'`, `height_m >= 3`, and MVP-approved caster classes.

**Given** review and excluded records exist
**When** they are imported or stored
**Then** review/quarantine records are inactive until spot-checked
**And** excluded records are omitted from runtime or retained only as diagnostics.

**Design Gate Criteria:**
- **Visual:** No standalone visual reference. Backend/data-contract story.
- **Behaviour:** Public APIs should preserve existing response shape unless an explicit API contract update is part of the story.
- **Visual validation:** Not applicable unless consumer UI files change.

### Story 3.0.3: Open Geodata Import Pipeline

As a **backend maintainer**,
I want the local open-geodata prototype promoted into a repeatable import pipeline,
So that central MVP shadow-caster records can be regenerated, validated, and imported without ad hoc scripts.

**Acceptance Criteria:**

**Given** the current prototype scripts live under `building_geodata/goteborg-open/tools/`
**When** the production import pipeline is created
**Then** it derives height candidates from the existing GeoPackage, Baskarta `byggnad_l`, and Höjdmodell 2022 DTM tiles
**And** it emits WGS84 polygon runtime geometry plus source/provenance metadata
**And** it preserves the EPSG:3007 bbox and CRS transformations explicitly.

**Given** runtime should start conservatively
**When** filtering runs
**Then** it splits candidates into include, review, and exclude sets
**And** MVP defaults exclude tiny/tall suspicious records, records below the 3 m meaningful-height threshold, and low-quality small `Komplementbyggnad` records.

**Given** future source refreshes are expected
**When** the pipeline runs
**Then** it produces deterministic summaries and validation artifacts suitable for review before import.

**Design Gate Criteria:**
- **Visual:** No standalone visual reference. Backend/import story.
- **Behaviour:** No direct consumer UI change.
- **Visual validation:** Not applicable.

### Story 3.0.4: Geodata Validation & Spot-Check Gates

As a **QA maintainer**,
I want deterministic geodata validation and central spot-check gates,
So that high building-shadow confidence is earned per launch cluster instead of assumed globally.

**Acceptance Criteria:**

**Given** MVP launch is central/south-central Gothenburg
**When** validation gates are defined
**Then** they cover Inom Vallgraven, Nordstan, Lilla Bommen, Avenyn, Vasastan, Haga, Linné, and surrounding central areas inside the MVP bbox
**And** high confidence is disabled for a cluster until at least 10 venue or street-facing test points are checked in that cluster.

**Given** shadow behaviour changes by sun angle
**When** spot checks are executed
**Then** each cluster includes morning/low-angle, midday/high-sun, and afternoon/evening directional-shadow conditions
**And** the central validation set includes at least 70 total checks.

**Given** the target is trustworthy building-shadow modelling
**When** results are evaluated
**Then** a cluster needs about 85-90% obvious building-shadow agreement before high building-shadow confidence is allowed
**And** trees, awnings, umbrellas, bridges, and temporary structures are recorded as uncertainty causes rather than silently counted as building-data failures.

**Design Gate Criteria:**
- **Visual:** No standalone visual reference. QA/data validation story.
- **Behaviour:** No direct consumer UI change unless validation status is surfaced through confidence metadata.
- **Visual validation:** Not applicable unless consumer UI files change.

### Story 3.0.5: Confidence Engine Data Coverage

As a **user**,
I want confidence scores to reflect building-data coverage and known modelling gaps,
So that SunnySeat does not overstate certainty when shadows are missing, low-quality, or affected by unmodelled obstructions.

**Acceptance Criteria:**

**Given** no nearby casting shadows can mean either a sunny venue or incomplete caster coverage
**When** confidence is calculated
**Then** empty casting-shadow results are not automatically treated as perfect building-data quality unless the surrounding data coverage is validated for the relevant cluster.

**Given** runtime casters have source and quality metadata
**When** shadow confidence is calculated
**Then** source priority, quality score, caster tier, filter decision, cluster validation status, sun elevation, and weather state contribute to confidence.

**Given** vegetation, awnings, umbrellas, bridges, and temporary structures are not fully modelled in MVP
**When** a venue is near known or manually tagged obstruction risks
**Then** confidence is capped or marked uncertain according to the configured obstruction class.

**Design Gate Criteria:**
- **Visual:** No standalone visual reference unless confidence UI copy changes in the same story.
- **Behaviour:** Existing confidence displays remain available but become more conservative when data quality is lower.
- **Visual validation:** Run only if visible confidence UI changes.

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Preserve the Story 3.0.2 Round 3 deferred finding: an empty successful `get_buildings_near_point` response can still mean "no active caster coverage yet", not "fully sunny with high confidence". Story 3.0.5 must distinguish empty validated coverage from unknown/missing caster coverage and cap or mark confidence accordingly. *(Source: Story 3.0.2 code review Round 3, 2026-06-04; deferred-work audit 2026-06-04.)*

### Story 3.0.7: Baskarta XYZ Inventory & Data Contract Realignment

As a **maintainer**,
I want Baskarta treated as a full XYZ object inventory with explicit preflight and source-geometry preservation,
So that SunnySeat does not silently discard height-coded non-building objects or depend on a flattened export.

**Acceptance Criteria:**

**Given** Göteborgs Stad confirmed that the open Höjdmodell is DTM and that Baskarta contains XYZ object data
**When** durable planning docs and geodata runbooks are updated
**Then** they describe the MVP open-data path as 2D Lantmäteriet footprints + Göteborg Baskarta XYZ object inventory + Göteborg Höjdmodell 2022 DTM-derived ground elevation
**And** they state that `byggnad_l` is the first validated runtime building subset, not the complete Baskarta height strategy.

**Given** Baskarta downloads may include multiple Z-aware point, line, and polygon layers
**When** the preflight command runs against a Baskarta ZIP or extracted SHP directory
**Then** it outputs layer inventory, geometry types, record counts, type distributions, Z ranges, missing-Z counts, and anomaly warnings
**And** it fails loudly when expected Z-aware layers are flattened or missing Z values.

**Given** future structure, vegetation, bridge, wall/fence, and obstruction-risk candidates may come from non-`byggnad_l` layers
**When** the schema/import contract is extended
**Then** source 3D geometry, source layer, source class/subclass, Z semantics notes, and collection/update metadata are preserved separately from the WGS84 runtime polygon geometry
**And** non-building candidates remain inactive, diagnostics-only, or obstruction-risk-only until explicitly validated.

**Design Gate Criteria:**
- **Visual:** No standalone visual reference. Backend/data-contract story.
- **Behaviour:** No consumer UI change and no runtime activation of new non-building caster classes.
- **Visual validation:** Not applicable unless consumer UI files change.

### Story 3.0.6: UX Content for Sun Prediction Uncertainty

As a **user**,
I want concise Swedish copy that explains prediction uncertainty,
So that I understand confidence without needing geodata details.

**Acceptance Criteria:**

**Given** SunnySeat models building shadows but not every obstruction
**When** confidence help text, about-page copy, venue detail microcopy, or uncertainty labels are shown
**Then** Swedish copy clearly communicates that building shadows are modelled while trees, awnings, umbrellas, bridges, and temporary structures can affect real conditions.

**Given** a venue has low building-data confidence or known obstruction uncertainty
**When** the venue appears in the map/list/detail surfaces
**Then** the UI communicates uncertainty without implying the prediction is broken
**And** it avoids exposing implementation details such as CRS, Baskarta, DTM, or import batch IDs in normal user copy.

**Given** the app is Swedish-first
**When** copy is added
**Then** strings are added through scoped `next-intl` keys and English fallback copy is kept in sync.

**Design Gate Criteria:**
- **Visual:** Use existing confidence and about-page surfaces; no new standalone screen unless explicitly scoped.
- **Behaviour:** Copy must be accessible, concise, and not color-only.
- **Visual validation:** Required for any changed screen reference.

### Story 3.1: Routing & Navigation to Venue

As a **user**,
I want to get directions to a sunny venue and see how long it takes to walk or bike there,
So that I can navigate there confidently.

**Acceptance Criteria:**

**Given** the user is viewing a VenueQuickInfo card or venue detail
**When** they tap the "Visa Rutt" RouteButton
**Then** a route overlay appears showing walk/bike time and direction to the venue
**And** the RouteButton uses `gradient-route-button` (gold-to-dark), `shadow-route-button`, `radius-pill` — the primary action on the screen

**Given** the "Visa Rutt" button is tapped on mobile
**When** routing is initiated
**Then** the device's native map application opens with directions to the venue coordinates (via geo: URI or platform-specific intent)
**And** estimated walk time is displayed before the user leaves the app

**Given** the venue detail shows an address row
**When** the "ÖPPNA I KARTOR" link is displayed
**Then** the link text uses `color-amber-dark` with an external link icon
**And** tapping it opens the venue location in the device's native map application (Google Maps, Apple Maps, etc.)

**Given** the "Visa Rutt" button is loading route data
**When** the route calculation is in progress
**Then** the button shows a spinner replacing the icon (`duration-default`) — the button remains interactive once complete

**Given** routing is accessed via VenueQuickInfo
**When** the user taps "Visa Rutt" on the quick-info card
**Then** the same routing behaviour occurs without requiring the user to open the full venue detail first

**Given** all routing UI text uses i18n keys
**When** the locale is Swedish or English
**Then** button labels, time estimates, and link text render in the correct language

**Design Gate Criteria:**
- **Behaviour:** All interactions and states defined in UX spec §RouteOverlay and §RouteButton are implemented
- **Animation:** Button spinner and route overlay entrance animations match spec timings (±50 ms tolerance)
- **Visual validation:** No standalone screenshot gate. This component is validated as part of the parent screen(s) that render it (`map-primary`, `venue-detail`), plus component-level unit tests and the UX behaviour spec.

### Story 3.2: Sun Accuracy Feedback

As a **user**,
I want to report whether the sun prediction was correct when I arrived at a venue,
So that I can help improve prediction accuracy for everyone.

**Acceptance Criteria:**

**Given** the user is viewing a venue detail that they have likely visited (based on proximity + time since last view)
**When** the feedback section renders
**Then** an inline FeedbackPrompt card appears within the venue detail scroll area (not as a modal)
**And** the card shows: venue name + address, "Har det här stället uteservering?" with "Ja"/"Nej" buttons, "Var det soligt när du kom?" with "Ja"/"Nej"/clock buttons

**Given** the feedback prompt is displayed
**When** the user taps "Ja" or "Nej" for any question
**Then** the tapped button fills to selected state (amber background, 150ms `easing-default`), the other button dims
**And** selection is single-choice per question

**Given** at least one question is answered
**When** the "Skicka" button state is evaluated
**Then** the button becomes enabled (full opacity, AmberCTAButton styling)
**And** when no questions are answered, the button is disabled at 40% opacity

**Given** the user has answered questions and optionally typed in the text area
**When** they tap "Skicka"
**Then** feedback is submitted to `POST /api/venues/[id]/feedback`
**And** during submission the button shows a subtle spinner and inputs are disabled
**And** on success: inline confirmation "Tack för din feedback." replaces the form, fades after 3 seconds (300ms `easing-exit`)
**And** on failure: inline error "Kunde inte skicka. Försök igen." appears below the form with a retry option

**Given** the feedback prompt is dismissible
**When** the user taps "Stäng"
**Then** the feedback section collapses and the user returns to the venue detail scroll position

**Given** the user has already submitted feedback for this venue in the current session
**When** they revisit the venue detail
**Then** the feedback prompt is not shown again (tracked via sessionStorage to prevent duplicates, per NFR11)

**Given** `prefers-reduced-motion` is enabled
**When** feedback animations occur
**Then** button selection is instant (no fill transition), form-to-confirmation is instant (no crossfade)

**Design Gate Criteria:**
- **Visual:** Matches active visual reference `feedback` from the current source-of-truth bundle
- **Behaviour:** All interactions and states defined in UX spec §FeedbackPrompt are implemented
- **Animation:** Button fill, form-to-confirmation crossfade, and dismiss animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Lift the onboarding-local Amber CTA implementation into `components/composed/` when the FeedbackPrompt `Skicka` button becomes the second real consumer. Preserve token-based styling, 44 px touch target, disabled 40% opacity, and reduced-motion behaviour. *(Source: Story 1.5 code review Round 1, 2026-05-05; deferred-work audit 2026-06-04.)*
> - Add final visual-regression verification for the Story 2.3 accepted venue-detail drift if this story becomes the first source of user-confirmed venue attributes: decide the source of truth for detail amenity/tag chips such as `Innergård`, `Hund ok`, `Wifi`, and `Bakverk`, implement them in the venue detail DTO/UI if they remain in the accepted design, and verify `scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" mobile` and `desktop` no longer fail for missing tags. If tags are removed from product scope or assigned to a later venue-attribute story, rebaseline or retarget with rationale. *(Source: Story 2.3 visual gate accepted by Rasmus on 2026-05-16.)*
> - Add final visual-regression verification for the Story 2.4 accepted desktop detail drift if this story becomes the first source of venue attributes: implement or explicitly reject amenity/tag chips such as `Innergård`, `Hund ok`, `Wifi`, and `Bakverk`, then verify `scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" desktop` no longer fails for missing tags, or rebaseline/retarget with rationale. *(Source: Story 2.4 visual gate accepted by Rasmus on 2026-05-18.)*

### Story 3.3: Venue Reviews

As a **user**,
I want to read reviews from other visitors and write my own review,
So that I can learn from others' experiences and share mine.

**Acceptance Criteria:**

**Given** a venue has reviews submitted by other users
**When** the venue detail renders
**Then** a reviews section appears below the main venue information
**And** each ReviewCard displays: review text, optional rating, and relative timestamp
**And** reviews are fetched from `GET /api/reviews?venueId=[id]`

**Given** the user wants to write a review
**When** they tap the "Lämna ett omdöme" CTA button (AmberCTAButton styling) in the venue detail
**Then** a ReviewForm opens with: venue name header + "Plats inom SunnySeat" subtitle, "Skriv ett omdöme" heading (`text-heading-lg`), a multi-line text area (`color-surface-muted` background, `radius-card`), optional "Lägg till foto" link with camera icon, and a "Skicka" CTA button

**Given** the review text area is empty
**When** the form state is evaluated
**Then** the "Skicka" button is disabled at 40% opacity

**Given** the user has entered text in the review field
**When** the text area has content
**Then** the "Skicka" button becomes enabled
**And** the text area border transitions to `color-amber-dark` on focus (150ms)

**Given** the user taps "Skicka" with valid review text
**When** the review is submitted to `POST /api/reviews`
**Then** the button shows a spinner and input is disabled during submission
**And** on success: inline confirmation "Tack för ditt omdöme." replaces the form
**And** on failure: inline error "Kunde inte skicka. Försök igen." appears below the form with retry

**Given** the user taps "Stäng" on the review form
**When** the form is dismissed
**Then** the form closes and returns to the venue detail scroll position without submitting

**Given** the user taps "Lägg till foto"
**When** the photo picker opens
**Then** the device's native camera or photo library picker opens
**And** the selected photo attaches to the review (optional, not required for submission)

**Given** `prefers-reduced-motion` is enabled
**When** review form animations occur
**Then** all state changes are instant (no crossfade transitions)

**Design Gate Criteria:**
- **Visual:** Matches active visual reference `review` from the current source-of-truth bundle
- **Behaviour:** All interactions and states defined in UX spec §ReviewForm and §ReviewCard are implemented
- **Animation:** Form open/close, text-area focus, and submission confirmation animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Add final visual-regression verification for the Story 2.2 accepted scope drift: decide whether aggregate venue star ratings surface in venue-list cards once reviews exist. If ratings surface in lists, wire the data/API and verify `scripts/visual-validate.sh map-panel-venues "/?_state=map-panel-venues" mobile` no longer fails for missing star/rating metadata. If ratings remain detail-only, rebaseline the venue-list reference with rationale and update `REBASELINE-LOG.md`. *(Source: Story 2.2 Anthropic visual gate accepted by Rasmus on 2026-05-14.)*
> - Add final visual-regression verification for the Story 2.3 accepted venue-detail drift: decide whether aggregate ratings/review counts surface in the venue detail header and desktop left-list cards once reviews exist. If yes, wire the data/API and verify `scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" mobile` and `desktop` no longer fail for missing rating/review metadata. If ratings remain review-section-only, rebaseline the affected references with rationale and update `REBASELINE-LOG.md`. *(Source: Story 2.3 visual gate accepted by Rasmus on 2026-05-16.)*
> - Add final visual-regression verification for the Story 2.4 accepted drift: decide whether rating, review-count, and price-level metadata surface in mobile venue-list cards and desktop venue-detail headers once reviews exist. If yes, wire the data/API and verify `map-panel-venues` and desktop `venue-detail` no longer fail for missing star/rating/price metadata. If these remain outside V1, rebaseline affected references with rationale. *(Source: Story 2.4 visual gates accepted by Rasmus on 2026-05-18.)*

### Story 3.4: Routing & Visit Loop Hardening

As a **user**,
I want routing, feedback, and review flows to preserve my venue context across the full visit loop,
So that I can move from finding a sunny venue to getting there and confirming it without losing state or trust.

**Acceptance Criteria:**

**Given** Stories 3.1, 3.2, and 3.3 have landed
**When** route actions are audited across VenueQuickInfo, venue detail, venue list/favourite entry points, and feedback/review-adjacent surfaces
**Then** all route actions use the shared routing helper/orchestrator contract
**And** no duplicate hand-rolled native-map URL builders or direct `window.open` calls remain outside the approved routing boundary

**Given** a user opens a venue from the map, list, favourite view, or a deep link
**When** they dismiss the route overlay, close feedback/review forms, or use browser Back
**Then** the app preserves selected venue, planner/date/time state, map/list context, and venue-detail scroll position where applicable
**And** invalid venue slugs, loading states, and API errors render localized not-found or retry/error states instead of blank panels

**Given** a mobile user taps "Visa Rutt"
**When** the native-map handoff is initiated
**Then** the route overlay shows the destination, confidence context, and estimated walk time before the app attempts to leave
**And** if the handoff is blocked, the overlay remains visible with a localized retry/open-directions action

**Given** route, feedback, and review controls are keyboard or screen-reader operated
**When** the user navigates through the Epic 3 visit loop
**Then** every interactive element has an accessible name, visible focus state, semantic role, and at least a 44x44 px target
**And** `prefers-reduced-motion` users get instant or opacity-only state changes

**Given** all Epic 3 user-facing copy is rendered
**When** Swedish or English locale is active
**Then** route, feedback, review, error, retry, and confirmation text uses scoped `next-intl` keys
**And** no English hardcoded copy appears in Swedish UI

**Given** the Epic 3 hardening pass is complete
**When** the final regression gate runs
**Then** `tsc`, `eslint`, `vitest`, and required Playwright coverage pass
**And** visual validation covers `map-with-selected-venue`, `venue-detail` mobile/desktop, `feedback`, and `review` states, with any approved rebaseline documented in `REBASELINE-LOG.md`

**Given** MVP scope excludes active monetization
**When** Epic 3 runtime paths are scanned
**Then** no Season Pass, Swish, premium, payment, paywall, or lock-badge dependency is wired into routing, feedback, or reviews
**And** client components still respect the API boundary by avoiding direct imports from backend engine modules

**Design Gate Criteria:**
- **Behaviour:** Final Epic 3 route, feedback, review, Back, dismiss, blocked-handoff, loading, error, and deep-link flows preserve user context as specified above
- **Accessibility:** Keyboard, screen-reader, reduced-motion, focus, and touch-target checks are included in the story test gate
- **Visual validation:** Parent screen/state visual validation passes for `map-with-selected-venue`, `venue-detail` mobile/desktop, `feedback`, and `review`; reference changes require explicit rationale and `REBASELINE-LOG.md` update

---

## Epic 4: "Future Monetization" — Season Pass & Swish Payment

Future users can purchase a Season Pass if consumer monetization is reintroduced after MVP adoption. Includes the full Swish purchase flow, paid-status persistence without accounts, and recovery via transaction ID. This epic is preserved for post-MVP work only; no MVP planner/date/favourites functionality may depend on it.

### Story 4.1: Premium Gate & Upsell Card

As a **future free user**,
I want a clear, non-aggressive prompt when I try to access a future paid feature,
So that I understand what's available and can decide whether to purchase.

**Acceptance Criteria:**

**Given** a future product version introduces a paid feature boundary
**When** a future paid-feature boundary triggers
**Then** it fires immediately before any API call is made — no teaser data, no partial access

**Given** a future paid-feature boundary triggers
**When** the UpsellCard appears
**Then** it slides down from the top of the screen (250ms, `easing-enter`) over the map
**And** the map remains visible behind (not dimmed)
**And** any visible QuickInfo card remains at the bottom
**And** the card shows: close button (X) top-right, "Lås upp Framtidsplanering" heading, feature description "Välj datum, simulera klockslag, hitta sol i framtiden." in `text-body-sm`
**And** the card uses `color-surface-cream` background, `radius-panel`, `shadow-card`

**Given** the UpsellCard is visible
**When** the user taps the card body or "Visa Säsongskortet" link
**Then** the app navigates to the PaywallScreen (Story 4.2)

**Given** the UpsellCard is visible
**When** the user taps the close button (X), taps the map behind the card, or taps outside the card
**Then** the card dismisses (200ms slide-up + fade, `easing-exit`)
**And** the user returns to the map with the future paid feature still locked
**And** the upsell card is not shown again for the current session (re-triggers on next session if still non-premium)

**Given** `prefers-reduced-motion` is enabled
**When** the UpsellCard appears or dismisses
**Then** transitions use opacity only (no slide)

**Design Gate Criteria:**
- **Visual:** Matches Post-MVP visual reference `premium-upsell` when Future Monetization is reactivated
- **Behaviour:** All interactions and states defined in UX spec §UpsellCard are implemented
- **Animation:** Slide-down entrance and dismiss animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

### Story 4.2: Paywall Screen & Swish Payment

As a **future user**,
I want to purchase the Season Pass via Swish with a clear, simple payment flow,
So that I can unlock future paid functionality quickly.

**Acceptance Criteria:**

**Given** the user navigates to the paywall screen (mobile)
**When** the screen renders
**Then** a full-screen card slides up (300ms, `easing-spring`) over the map showing:
- "SunnySeat" logo at top
- "SEASON PASS" tag (`color-amber-pale` background, `radius-premium-tag`)
- "Säsongskortet" heading (`text-display-lg`)
- "Planera solstunder i förväg." subtitle
- Feature list with lock icons in `color-amber-dark`: "Välj datum" + "Simulera klockslag"
- Price: "39 kr" large display + "ENGÅNGSKÖP" label
- Fine print: "INGEN PRENUMERATION · INGET KONTO KRÄVS · GILTIGT FÖR INNEVARANDE ÅR"
- "Betala med Swish" CTA (AmberCTAButton with Swish icon)
**And** lock icons show a subtle bounce on screen enter (one-time, 300ms)

**Given** the user taps "Betala med Swish" on mobile
**When** the payment is initiated
**Then** the Swish app opens via `swish://` deep-link with the amount (39 SEK) pre-filled
**And** a payment session is created via `POST /api/payments/create`
**And** the screen transitions to the processing state (Story 4.2 processing)

**Given** the paywall renders on desktop (viewport >= 1024px)
**When** the screen appears
**Then** a dark overlay (rgba(0,0,0,0.6)) covers the map (map not interactive)
**And** a centred modal card (`color-surface-cream`, `radius-panel`, `shadow-sheet-full-up`) shows two columns:
- Left: feature list, price, fine print (same as mobile)
- Right: "Scanna med Swish" heading, QR code rendered in-app, instruction text, "GENERERA NY QR-KOD" link
**And** close button (X) top-right of modal
**And** clicking outside the modal dismisses it

**Given** the QR code has expired on desktop
**When** the expiry is detected
**Then** the QR code dims to 40% opacity and "GENERERA NY QR-KOD" link pulses subtly
**And** tapping "GENERERA NY QR-KOD" creates a new payment session and swaps the QR image (crossfade 200ms)

**Given** payment has been initiated (mobile or desktop)
**When** the app enters processing state
**Then** the "Betala med Swish" button is replaced by a Swish icon + indeterminate progress bar animation
**And** the app polls `GET /api/payments/status/[id]` for confirmation
**And** no user interaction is available during processing

**Given** the user attempts to go back during processing
**When** back gesture or button is used
**Then** a confirmation prompt "Avbryt betalning?" appears before cancelling

**Given** payment polling reaches the 5-minute timeout (NFR36)
**When** no confirmation is received
**Then** the app auto-transitions to the payment-failed screen (Story 4.3)

**Given** payment is confirmed by the Swish webhook
**When** the polling detects success
**Then** the app transitions to a confirmation screen with checkmark and "Premium aktiverat" message
**And** auto-returns to the map after 2 seconds or on tap

**Given** the user swipes down or uses back gesture on the paywall (before initiating payment)
**When** the dismiss gesture is detected
**Then** the paywall dismisses and the user returns to the map with no payment initiated

**Given** `prefers-reduced-motion` is enabled
**When** the paywall renders
**Then** no lock icon bounce, opacity-only transitions, progress bar uses pulsing opacity instead of sweep

**Design Gate Criteria:**
- **Visual:** Matches Post-MVP visual reference `premium-paywall` when Future Monetization is reactivated
- **Visual:** Matches Post-MVP visual reference `premium-paywall-processing` when Future Monetization is reactivated
- **Behaviour:** All interactions and states defined in UX spec §PaywallScreen and §SwishPayment are implemented
- **Animation:** Card slide-up, lock-icon bounce, progress bar, and QR crossfade animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

### Story 4.3: Payment Failure & Retry

As a **user**,
I want clear information when a payment fails and an easy way to try again,
So that I'm not stuck or confused.

**Acceptance Criteria:**

**Given** a Swish payment fails or times out
**When** the payment-failed screen renders
**Then** it shows:
- "SunnySeat" logo at top
- "Betalningen gick inte igenom" heading (`text-heading-xl`)
- Explanation: "Swish-betalningen kunde inte slutföras. Vänligen försök igen." (`text-body-md` / `color-text-body`)
- "Försök igen" primary CTA (AmberCTAButton, full-width)
- "Kontakta oss" text link below
**And** the screen fades in (200ms, `easing-enter`) — no slide, immediate feel for error state

**Given** the user taps "Försök igen"
**When** retry is initiated
**Then** the screen fades out (200ms) and the paywall returns to its default state with a new payment session

**Given** the user taps "Kontakta oss"
**When** the link is tapped
**Then** the device's email client opens or a contact form is presented

**Given** the user uses back gesture on the failure screen
**When** the gesture is detected
**Then** the screen dismisses and the user returns to the map with no retry

**Given** `prefers-reduced-motion` is enabled
**When** the failure screen renders
**Then** transitions are instant

**Design Gate Criteria:**
- **Visual:** Matches Post-MVP visual reference `payment-failed` when Future Monetization is reactivated
- **Behaviour:** All interactions and states defined in UX spec §PaymentFailed are implemented
- **Animation:** Fade-in entrance (no slide — error state) matches spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

### Story 4.4: Premium Activation & Persistence

As a **future user who has paid**,
I want my paid status to persist across sessions without creating an account,
So that I don't lose access after closing the app.

**Acceptance Criteria:**

**Given** the Swish payment is confirmed via the webhook
**When** the server processes the successful payment
**Then** a signed JWT is issued containing: Swish transaction ID, activation timestamp, and season expiry date
**And** the JWT is returned to the client and stored in localStorage

**Given** a premium JWT exists in localStorage
**When** the app loads on any subsequent visit
**Then** PremiumContext reads the JWT and sets premium status to active
**And** future paid-only functionality is unlocked (no premium gate)

**Given** a future paid user accesses a future paid-only API endpoint
**When** the request is made to that endpoint
**Then** the JWT is included in the request
**And** the server verifies the JWT signature — requests with invalid, expired, or missing JWTs are rejected with 401

**Given** the premium JWT has expired (past season end)
**When** the user opens the app
**Then** PremiumContext detects the expired token and reverts to free tier
**And** the premium gate re-activates for future paid-only functionality

**Given** the premium status must not expose one user's purchase to another (NFR17)
**When** the JWT is stored and transmitted
**Then** it contains only the transaction ID, timestamps, and expiry — no PII
**And** the JWT signature prevents client-side tampering

**Design Gate Criteria:**
- **Behaviour:** All premium activation and PremiumContext state transitions defined in UX spec §premium-activation are implemented
- **Animation:** Premium unlock transition for future paid-only functionality matches spec timings (±50 ms tolerance)
- **Visual validation:** No standalone screenshot gate. This component is validated as part of the parent screen(s) that render it (`map-primary`), plus component-level unit tests and the UX behaviour spec.

> **Moved out of Epic 4 by MVP scope correction (2026-05-19):** Former Story 4.5 "Future Date Picker & Time Simulation" is now free MVP scope in Story 2.5. Do not restore future date simulation as premium-only unless a later approved product decision reverses the MVP correction.

### Story 4.5: Premium Recovery

As a **future user who lost paid status** (cleared browser data or switched device),
I want to recover my Season Pass using my Swish transaction ID,
So that I don't have to pay again.

**Acceptance Criteria:**

**Given** a non-premium user wants to recover their Season Pass
**When** they access the premium recovery flow (link in paywall or settings)
**Then** a form displays requesting the Swish transaction ID
**And** instructions explain: "Hitta ditt transaktions-ID i Swish-appens historik"

**Given** the user enters a valid Swish transaction ID
**When** they submit the recovery form
**Then** the request is sent to `POST /api/payments/recover`
**And** the server looks up the transaction ID in the `purchases` table
**And** if valid and within the current season: a new signed premium JWT is issued and returned
**And** PremiumContext updates to active, premium features unlock immediately

**Given** the user enters an invalid or expired transaction ID
**When** the server cannot find the transaction or it's from a previous season
**Then** an inline error message appears: "Transaktions-ID:t hittades inte eller har gått ut."
**And** the user can try again with a different ID

**Given** the recovery mechanism handles security (NFR17)
**When** a transaction ID is submitted
**Then** the server verifies the ID exists in the purchases table before issuing a JWT
**And** no PII is required or exposed — only the Swish transaction reference the user already has

**Given** all recovery UI uses i18n keys
**When** the locale is Swedish or English
**Then** all instructions, error messages, and labels render in the correct language

**Design Gate Criteria:**
- **Visual:** Matches Post-MVP visual reference `premium-recovery` when Future Monetization is reactivated
- **Behaviour:** All interactions and states defined in UX spec §premium-recovery are implemented
- **Animation:** Form submission, success/error inline transitions match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

---

## Epic 5: "Partner Spotlight" — B2B Venue Features

Partner venues get enhanced visibility: Golden Pin styling on the map, "SOL NU" badge on venue cards when sunny, deep-link access from external sources, and partner analytics showing views/routes segmented by sun state.

### Story 5.1: Golden Pin & Partner Visual Enhancement

As a **user**,
I want partner venues to stand out on the map with enhanced styling,
So that I can discover promoted venues with high-quality outdoor seating.

**Acceptance Criteria:**

**Given** a venue is marked as a partner (`is_partner: true`) in the venue data
**When** the venue pin renders on the map in a sunny state
**Then** it displays as a larger pill with a warm glow effect — visually elevated above standard sunny pins
**And** the pin uses `color-amber-pin` background, 2px white border, `shadow-card` plus an additional warm glow layer
**And** it contains the sun icon + percentage text like standard sunny pins, but at a larger scale

**Given** a partner venue is in a shaded state
**When** the pin renders
**Then** it uses the same size as a partner sunny pin but with shaded styling (`color-pin-shaded`)
**And** the warm glow is not present in shaded state

**Given** a partner venue pin is tapped
**When** it enters selected state
**Then** it transitions to a larger perfect circle (matching the partner pin scale) with the same 200ms animation as standard pins

**Given** the map shows both standard and partner pins
**When** pins render together
**Then** partner pins are visually prominent without breaking the map's readability
**And** no "Sponsored" or "Partner" label is shown — the visual enhancement speaks for itself

**Design Gate Criteria:**
- **Behaviour:** All interactions and states defined in UX spec §VenuePin (partner variant) are implemented
- **Animation:** Partner pin state-change and selection animations match spec timings (±50 ms tolerance)
- **Visual validation:** No standalone screenshot gate. This component is validated as part of the parent screen(s) that render it (`map-primary`), plus component-level unit tests and the UX behaviour spec.

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Consume the `isPartner` field that `VenuePinData` already carries (Story 1.4 plumbed it through `mapVenueDtoToPinData` as forward-compat). The new partner-styled pin variant is the planned consumer; the field has been waiting for this story since 1.4. *(Source: code review Round 1 of 1-4, 2026-05-01.)*
> - Re-evaluate per-pin React root overhead before partner-pin styling increases marker complexity. `VenuePinLayer` still creates one `createRoot` subtree per pin; if partner variants keep that architecture, verify pin-render timing for 50+ venues remains within the architecture NFR or refactor the marker rendering strategy. *(Source: Story 1.6 code review W1, 2026-05-07; deferred-work audit 2026-06-04.)*
> - Preserve MapLibre dynamic-chunk discipline when partner-pin work touches `MapContainer` or `VenuePinLayer`. Top-level `maplibre-gl` imports still exist in both files; Story 1.6's async-map verification catches current behaviour, but the code shape remains easy to regress if `MapView` is imported statically. *(Source: Story 1.6 code review W2, 2026-05-07; deferred-work audit 2026-06-04.)*
> - Remove the hardcoded Swedish sun-label fallbacks in `VenueCard.tsx` (`?? 'MEST SKUGGA'` / `?? 'FULL SOL'` / `?? 'DELVIS SOL'`) and make the labels required props, mirroring the Story 3.4 Task 6.4 `VenueQuickInfo` fix. Non-violating today (Swedish is the source language and `VenueList.tsx` always passes localized labels), but it is the same defect class and this story touches the venue card/pin surfaces. *(Source: Story 3.4 code review Round 1 defer D2, 2026-06-11.)*

### Story 5.2: "SOL NU" Badge & Partner Deep-Links

As a **user**,
I want to see when partner venues are sunny right now and access them from external links,
So that I can quickly find promoted sunny venues from any source.

**Acceptance Criteria:**

**Given** a partner venue's patio is in direct sun
**When** the venue card renders in the venue list or venue detail
**Then** a "SOL NU" badge appears next to the venue name
**And** the badge uses uppercase `text-label-md` (12px/Bold/Manrope), `color-amber-badge-text` (#6d5000)

**Given** a partner venue is not currently in direct sun
**When** the venue card or detail renders
**Then** the "SOL NU" badge is not shown — only appears when the partner patio is actively sunny

**Given** an external URL contains a partner venue deep-link
**When** a user navigates to `sunnyseat.se/?venue=[partner-slug]`
**Then** the app loads, the map centres on the partner venue, its pin enters selected state, and the venue detail opens
**And** the deep-link works regardless of whether the user has visited before (onboarding is skipped if a venue param is present, geolocation can be prompted after)

**Given** the deep-link URL contains an invalid or non-existent venue slug
**When** the app loads
**Then** the map loads at default position (Gothenburg centrum) and no error is shown — the user can browse normally

**Given** partner venue data is fetched
**When** the sunny-now API is queried
**Then** partner sunny status is fetched from `GET /api/partners/sunny-now` using the centralized query key factory

**Design Gate Criteria:**
- **Behaviour:** All interactions and states defined in UX spec §SunBadge and §deep-link are implemented
- **Animation:** Badge appear/disappear and deep-link landing animations match spec timings (±50 ms tolerance)
- **Visual validation:** No standalone screenshot gate. This component is validated as part of the parent screen(s) that render it (`map-primary`, `venue-detail`), plus component-level unit tests and the UX behaviour spec.

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Add final visual-regression verification for the Story 2.3 accepted venue-detail drift: if the accepted design includes a `SOL NU` badge next to the venue title, configure the seeded visual venue as a qualifying partner/sunny case or add an appropriate forced-state fixture, then verify `scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" mobile` and `desktop` no longer fail for missing title badge. If the badge is intentionally partner-only and not present on the 2.3 seeded venue, rebaseline with rationale and update `REBASELINE-LOG.md`. *(Source: Story 2.3 visual gate accepted by Rasmus on 2026-05-16.)*
> - Add final visual-regression verification for the Story 2.4 accepted desktop detail drift: when partner sunny-now badges land, verify `scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" desktop` no longer fails for the missing `SOL NU` title badge if the seeded visual venue qualifies, or rebaseline with rationale if the badge is intentionally not present for that fixture. *(Source: Story 2.4 visual gate accepted by Rasmus on 2026-05-18.)*

### Story 5.3: Partner Analytics Dashboard

As a **partner venue owner**,
I want to see how many users viewed my venue, opened details, and requested routes,
So that I can measure the value of my SunnySeat partnership.

**Acceptance Criteria:**

**Given** a partner has an analytics view
**When** analytics data is displayed
**Then** it shows: total venue views (pin taps), detail opens, and route requests
**And** all metrics are segmented by sun state (sunny vs. shaded) to show the sun exposure uplift

**Given** analytics data spans multiple time periods
**When** the partner reviews their dashboard
**Then** data can be viewed for different date ranges (this week, this month, this season)

**Given** the analytics data is fetched from the backend
**When** the analytics API is queried
**Then** data is returned from the existing partner analytics endpoint
**And** no PII is included in analytics — only aggregate counts

**Given** the partner analytics is a lightweight view for launch
**When** the feature scope is evaluated
**Then** this is a read-only display of server-side aggregated data — not a full admin panel
**And** the view can be accessed via a partner-specific URL or section

**Design Gate Criteria:**
- **Behaviour:** All interactions and states defined in UX spec §partner-analytics are implemented
- **Animation:** Data load and date-range switch transitions match spec timings (±50 ms tolerance)
- **Visual validation:** No standalone screenshot gate. Design pending — visual validation will be added when the design lands in a future story.

---

## Epic 6: "Make It Personal" — History, Notifications & Sharing

After favourites ship in Epic 2, users can view recently visited venues, opt into push notifications for sun state changes on favourited venues, and share venue sun status via native share API.

> **Moved out of Epic 6 by MVP scope correction (2026-05-19):** former Story 6.1 "Save & View Favourites" is now Story 2.7 and part of MVP sequencing.

### Story 6.1: Recently Viewed Venues

As a **user**,
I want to see my recently viewed venues,
So that I can quickly return to a venue I looked at earlier.

**Acceptance Criteria:**

**Given** the user has viewed venue details in the current or recent sessions
**When** the recently viewed section renders (within Favoriter tab or a sub-section)
**Then** it shows the last N venues viewed as compact cards with current sun state
**And** venues are ordered most-recent first

**Given** the user views a venue detail
**When** the detail opens
**Then** the venue ID and timestamp are recorded in localStorage recent history
**And** duplicate entries are updated (most recent view time) rather than duplicated

**Given** the user has no recent history
**When** the section renders
**Then** it is either hidden or shows a minimal empty state

**Given** recently viewed venues are stored in localStorage
**When** the data is persisted
**Then** no PII is stored — only venue IDs and timestamps
**And** the history has a reasonable cap (e.g., last 20 venues) with oldest entries pruned

**Design Gate Criteria:**
- **Behaviour:** All interactions and states defined in UX spec §recently-viewed are implemented
- **Animation:** Card list entrance animations match spec timings (±50 ms tolerance)
- **Visual validation:** No standalone screenshot gate. This component is validated as part of the parent screen(s) that render it (`favourites-tab`), plus component-level unit tests and the UX behaviour spec.

### Story 6.2: Push Notifications for Favourites

As a **user**,
I want to receive a notification when a favourited venue becomes sunny,
So that I don't miss the sun at my favourite spots.

**Acceptance Criteria:**

**Given** the user has favourited venues and the browser supports Web Push API
**When** a favourited venue's sun state changes to sunny
**Then** a push notification is delivered to the user's device with the venue name and sun status

**Given** the user has not opted in to push notifications
**When** a sun state change occurs on a favourited venue
**Then** no notification is sent — opt-in is required first (Story 6.3)

**Given** the user receives a push notification
**When** they tap the notification
**Then** the app opens (or focuses) and navigates to the venue detail for the notified venue

**Given** the push notification system uses service worker
**When** push subscription is managed
**Then** browser permission revocation is handled gracefully (NFR31) — failed deliveries do not retry indefinitely

**Given** the notification is delivered
**When** the content renders
**Then** it shows the venue name and a brief sun status message (e.g., "Kafé Magasinet har sol just nu!")

**Design Gate Criteria:**
- **Behaviour:** All interactions and states defined in UX spec §push-notification are implemented
- **Animation:** Notification delivery and tap-to-open transitions match spec timings (±50 ms tolerance)
- **Visual validation:** No standalone screenshot gate. OS-rendered content outside our UI layer, validated via component-level unit tests and the UX behaviour spec.

### Story 6.3: Push Notification Opt-In/Out

As a **user**,
I want to control whether I receive push notifications,
So that I'm not interrupted unless I want to be.

**Acceptance Criteria:**

**Given** the user has favourited at least one venue
**When** a contextually appropriate moment occurs (e.g., after saving a favourite)
**Then** a gentle opt-in prompt appears asking if they'd like sun alerts for their favourites

**Given** the user taps to opt in
**When** the Web Push permission dialog appears
**Then** granting permission subscribes the user to sun state notifications for their favourited venues
**And** the subscription is managed via `lib/services/push-subscription.ts`

**Given** the user denies push permission or wants to opt out later
**When** they visit notification settings (within the app)
**Then** they can toggle push notifications off
**And** the push subscription is unregistered

**Given** the browser revokes push permission externally
**When** the app detects the revocation
**Then** the opt-in state is updated and no further push attempts are made

**Design Gate Criteria:**
- **Behaviour:** All interactions and states defined in UX spec §push-opt-in are implemented
- **Animation:** Opt-in prompt entrance and dismiss animations match spec timings (±50 ms tolerance)
- **Visual validation:** No standalone screenshot gate. This component is validated as part of the parent screen(s) that render it (`map-primary`), plus component-level unit tests and the UX behaviour spec.

### Story 6.4: Share Venue Sun Status

As a **user**,
I want to share a venue's sun status with friends,
So that I can coordinate plans by sending them the venue info.

**Acceptance Criteria:**

**Given** the user is viewing a venue detail
**When** they tap the share button (GlassButton styling, `shadow-button-sm`)
**Then** the device's native Share API is invoked with: venue name, sun status summary, and a deep-link URL (`sunnyseat.se/?venue=[slug]&t=[time]`)

**Given** the Native Share API is not supported by the browser
**When** the share button is tapped
**Then** the deep-link URL is copied to the clipboard with a brief inline confirmation ("Länk kopierad")

**Given** the shared URL is opened by another user
**When** they navigate to the deep-link
**Then** the app loads and opens the shared venue at the specified time (if provided)

**Given** the venue detail is designed to be screenshot-friendly
**When** a user takes a screenshot of the venue detail
**Then** the card is visually complete and scannable as an image — hero photo, venue name, sun timeline, and key details are visible without scrolling (on mobile)

**Given** the share button needs accessibility
**When** the button renders
**Then** it has an `aria-label` ("Dela") and visible focus indicator

**Design Gate Criteria:**
- **Behaviour:** All interactions and states defined in UX spec §share-venue are implemented
- **Animation:** Share sheet open and "Länk kopierad" confirmation animations match spec timings (±50 ms tolerance)
- **Visual validation:** No standalone screenshot gate. System share sheet outside our UI layer, validated via component-level unit tests and the UX behaviour spec.

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Add final visual-regression verification for the Story 2.3 accepted venue-detail drift: implement share/action chrome needed for the mobile detail screenshot to be visually complete without scrolling, then verify `scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" mobile` no longer fails for missing action chrome. If the accepted design keeps share system UI outside screenshot scope, rebaseline with rationale and update `REBASELINE-LOG.md`. *(Source: Story 2.3 visual gate accepted by Rasmus on 2026-05-16.)*

---

## Epic 7: "Polish & Platform" — About, 404, PWA & Offline

Users can learn how SunnySeat works, encounter a friendly 404, install the app as a PWA, and see a graceful offline state.

> **Epic 3 alignment note (2026-06-12):** Three corrections from Epic 3 must be honoured when these stories are drafted:
> 1. **Data sources / accuracy framing (7.1).** The shadow-data trust prelude (Stories 3.0.1–3.0.7) corrected the data-source model and the confidence semantics. The About page's data-source list and "träffsäkerhet" claim must reflect the real model (Lantmäteriet footprints + Göteborgs Stad Baskarta 3D `byggnad_l` + Göteborgs Stad Höjdmodell DTM + Met.no weather + OpenStreetMap fallback), use the conservative, coverage-gated confidence wording from Stories 3.0.5/3.0.6, and reconcile with the existing uncertainty copy in `messages/{sv,en}/about.json`. Public copy must not leak geodata internals (EPSG, Baskarta layer names, DTM, RPC/SQL names) per the Story 3.0.6 contract.
> 2. **Shared CTA components (7.2).** "RouteButton" in the 404 AC predates Story 3.1, which made `components/composed/routing/RouteButton.tsx` the **native-maps directions** CTA. The 404 "Hitta soliga platser nu →" control is an in-app navigation to the map, so it must use a plain navigation CTA/link styled with `gradient-route-button`, **not** the routing `RouteButton` (which builds maps-directions URLs and opens the native-map handoff).
> 3. **Real-data dependency.** The app is still fixture-backed. The About accuracy stat being truthful, and the offline shell's "venue data loads normally on reconnect" meaning real data, both depend on the new "Wire Real Data" epic landing first. Treat that epic as a prerequisite for 7.1's accuracy claim and sequence accordingly.

### Story 7.1: About Page

As a **user**,
I want to learn how SunnySeat works and where the data comes from,
So that I can understand and trust the sun predictions.

**Acceptance Criteria:**

**Given** the user navigates to the About page (via "Om" tab on mobile or `/about` route)
**When** the page renders on mobile
**Then** a scrollable page displays with:
- "← Tillbaka" back link at top
- "Hur fungerar SunnySeat?" heading
- Hero photo (sunset/outdoor scene)
- "ALGORITMEN" section explaining sun position calculations, shadow modeling, weather integration
- "DATAKÄLLOR" section listing the open data sources — Lantmäteriet (byggnadsfotavtryck), Göteborgs Stad öppna data (3D-byggnader och höjdmodell), Met.no (väder), OpenStreetMap — each as a list item with icon (user-safe source names only; no EPSG/layer/DTM/RPC internals per Story 3.0.6)
- "TRÄFFSÄKERHET" section on warm gradient background with explanation text; the headline figure must come from the validated, coverage-gated confidence model (Stories 3.0.5/3.0.6), framed consistently with the app's uncertainty copy rather than a hardcoded marketing "85%" (use a placeholder until the real validated figure is available)
- "Kontakt & feedback" section at bottom
- "Tillbaka till kartan" CTA link

**Given** the about page renders on desktop
**When** viewport >= 1024px
**Then** DesktopNavBar is visible at top, content max-width ~720px centred
**And** data sources section uses two-column layout
**And** footer shows "sunnyseat" wordmark + "KONTAKT" link + "Tillbaka till kartan ↗" CTA
**And** no "← Tillbaka" link — navigation via navbar

**Given** the "TRÄFFSÄKERHET" section scrolls into view
**When** the accuracy stat becomes visible for the first time
**Then** the number counts up from 0 to the validated figure (800ms, `easing-enter`) — one-time animation

**Given** the user taps "← Tillbaka" (mobile) or "Tillbaka till kartan" (either)
**When** the navigation is triggered
**Then** the app returns to the map view

**Given** `prefers-reduced-motion` is enabled
**When** the stat animation would trigger
**Then** the number displays instantly at 85% with no count-up

**Given** the privacy policy must be accessible (NFR16)
**When** the about page renders
**Then** a link to the privacy policy is included in the contact/footer section

**Given** all about page text uses i18n keys
**When** the locale is Swedish or English
**Then** all section headings, body text, and data source descriptions render in the correct language

**Design Gate Criteria:**
- **Visual:** Matches active visual reference `about` from the current source-of-truth bundle
- **Behaviour:** All interactions and states defined in UX spec §AboutPage are implemented
- **Animation:** Accuracy stat count-up (800 ms) and scroll-trigger animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - If this story introduces the first runtime locale switcher, make existing MapLibre marker roots update their accessible names and localized copy on locale changes instead of waiting for venue selection or venue data changes. If Story 7.1 does not introduce a switcher, keep this item targeted to the first i18n-switcher story. *(Source: Story 1.4 Round 2 batch-apply, 2026-05-03; deferred-work audit 2026-06-04.)*

### Story 7.2: 404 Page

As a **user**,
I want a friendly dead-end page that redirects me back to the map,
So that I'm never stuck on an invalid URL.

**Acceptance Criteria:**

**Given** a user navigates to a non-existent route
**When** the 404 page renders on mobile
**Then** it displays:
- "SunnySeat" logo top-left
- Centred content: amber pin icon with "?" inside (rounded square background, `color-amber-gold`)
- "Den här platsen hittades inte" heading (`text-display-xl`, centred)
- "Hitta soliga platser nu →" in-app navigation CTA to the map (full-width, `gradient-route-button` styling — a plain navigation link/button, **not** the Story 3.1 routing `RouteButton`, which builds native-maps directions URLs)

**Given** the 404 page renders on desktop
**When** viewport >= 1024px
**Then** DesktopNavBar is visible at top and content is centred in viewport
**And** CTA button is auto-width (not full-width)

**Given** the amber pin icon is displayed
**When** the page renders
**Then** the icon has a subtle float animation (translateY ±4px, 2s loop, ease-in-out) adding life to the static page

**Given** the user taps the CTA
**When** "Hitta soliga platser nu →" is clicked
**Then** the app navigates to the map (300ms fade transition)

**Given** `prefers-reduced-motion` is enabled
**When** the page renders
**Then** no float animation on the icon

**Given** all 404 text uses i18n keys
**When** the locale is Swedish or English
**Then** heading and CTA text render in the correct language

**Design Gate Criteria:**
- **Visual:** Matches active visual reference `not-found`; if the MVP bundle lacks this state, use the logged curated reference
- **Behaviour:** All interactions and states defined in UX spec §NotFoundPage are implemented
- **Animation:** Icon float (±4 px, 2 s loop) and page-exit fade (300 ms) animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Replace `app/not-found.tsx`'s hardcoded Swedish strings with `next-intl` keys, and ensure the page renders inside `NextIntlClientProvider`. Story 1.1 shipped the file as a Swedish stub explicitly deferring full i18n to this story. *(Source: code review of 1-1, 2026-04-17.)*

### Story 7.3: PWA Installation & Offline Shell

As a **user**,
I want to install SunnySeat on my home screen and see something useful when offline,
So that the app feels native and doesn't break without connectivity.

**Acceptance Criteria:**

**Given** the user visits SunnySeat on a supported mobile browser (iOS Safari, Android Chrome)
**When** PWA criteria are met (service worker, manifest, HTTPS)
**Then** the app is installable via the browser's add-to-homescreen prompt
**And** the web app manifest includes correct app name ("SunnySeat"), icons (192px, 512px), theme colour, and display mode

**Given** Serwist (successor to next-pwa) is configured
**When** the service worker is registered via `next.config.ts` plugin
**Then** the app shell (HTML, CSS, JS, fonts) is cached for offline display
**And** cache is invalidated on new deployments

**Given** the user opens SunnySeat without network connectivity
**When** the app loads offline
**Then** the cached app shell renders (layout, navigation, map background)
**And** an "Ingen anslutning" banner appears at the top of the screen
**And** no venue data, pins, or sun predictions are shown — the app communicates that connectivity is required

**Given** network connectivity is restored
**When** the app detects reconnection
**Then** the "Ingen anslutning" banner dismisses and venue data loads normally

**Given** the PWA must meet quality standards
**When** Lighthouse PWA audit runs
**Then** PWA score >= 90 (per PRD technical success criteria)

**Given** all offline UI text uses i18n keys
**When** the locale is Swedish or English
**Then** the "Ingen anslutning" message renders in the correct language

**Given** the offline state must be reachable in dev mode without toggling real network connectivity
**When** the offline banner component determines its visible state
**Then** it consumes `useForcedState()` from `nextjs-app/lib/dev/use-forced-state.ts` and forces the offline shell when the hook returns `"map-primary-offline"`, in addition to the real `navigator.onLine` check
**And** navigating to `/?_state=map-primary-offline` in development renders the cached app shell, hides venue data, and shows the "Ingen anslutning" banner regardless of actual network state
**And** in production builds the `_state` query parameter is ignored (per the zero-production-footprint contract of Story 1.2)
**And** the visual validation gate can navigate to `/?_state=map-primary-offline` to exercise the `map-primary-offline` screen for both mobile and desktop viewports

**Design Gate Criteria:**
- **Visual:** Matches active visual reference `map-primary-offline`; first implementation-driven reference may be required if the MVP bundle lacks this state
- **Behaviour:** All interactions and states defined in UX spec §PWA and §offline-shell are implemented
- **Animation:** Offline banner appear/dismiss animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Add `env(safe-area-inset-bottom)` handling to `MobileNavBar.tsx:46,59` so the 44 px touch target is fully reachable on iPhone home-indicator devices. The fixed-bottom nav currently leaves 2 px of the touch box behind the safe-area boundary on those devices; the PWA standalone-display fix is the right place to land it. *(Source: code review of 1-3, 2026-04-20.)*
> - Add a `storage` event listener to `OnboardingGate` so an onboarding completion in one tab dismisses the already-open onboarding overlay in another tab without reload. *(Source: Story 1.5 code review Round 1, 2026-05-05; deferred-work audit 2026-06-04.)*
> - Re-check `maplibre-gl/dist/maplibre-gl.css` static import behaviour against the offline/PWA shell and async-map gate. The current JS verifier does not audit CSS hoisting, so this story should either extend the verification or document why the current hoisting remains acceptable. *(Source: Story 1.6 code review W3, 2026-05-07; deferred-work audit 2026-06-04.)*
> - Rework or explicitly validate the full-viewport tile/style failure overlay so sighted fallback state and keyboard focus state are coherent. The current `pointer-events-none` overlay can show a cream fallback while tab focus continues through controls underneath. *(Source: Story 1.6 code review W6, 2026-05-07; deferred-work audit 2026-06-04.)*
> - Extend the axe a11y Playwright gate with a mobile-viewport project (or mobile-sized scans of the existing routes) so mobile-sheet variants — mobile venue-detail sheet, mobile review form, `FactCard` muted labels — are inside the automated gate instead of relying solely on approved mobile visual references. The current `a11y` project runs Desktop Chrome only. *(Source: Story 3.4 Completion Notes known limitation + code review Round 1 defer D1, 2026-06-11.)*

---

## Epic 8: "Wire Real Data" — From Fixtures to the Live Supabase + Sun Engine

The MVP frontend (Epics 1–3) is entirely fixture-backed: `/api/venues`, venue detail, feedback, and reviews all serve hardcoded or in-memory data. This epic replaces those fixtures with the real Supabase-backed data pipeline and the `lib/solar` sun/shadow engine, on top of the trustworthy data contracts the Epic 3.0.x shadow-data prelude established. When this epic completes, the app shows real Gothenburg venues with real, coverage-gated sun predictions, and feedback/reviews persist to Supabase.

> **Sequencing (added 2026-06-12, Epic 3 retrospective):** This epic runs **next**, ahead of the deferred Epics 4 (Monetization), 5 (Partner Spotlight), and 6 (History/Notifications/Sharing). It is a **prerequisite for Epic 7 Story 7.1** (the About "träffsäkerhet" claim cannot be truthful until the real confidence model is live) and for any future push-notification work (Stories 6.2/6.3 need a real sun-state-over-time pipeline). The epic number is higher than 4–7 only because those were defined earlier; do not infer execution order from the number.
>
> **Foundation already in place (Epic 3, 2026-06-12):** the Supabase project (`hhnbxrhfhlzxgllxukzj`) was reset to a clean Epic-3-aligned slate — `shadow_casters` + `shadow_caster_import_batches` + the `get_buildings_near_point` RPC (Story 3.0.2 contract), `reviews` (Story 3.3), and `feedback` (Story 3.2 contract) all exist with RLS enabled; all old-backend tables/functions were removed. `shadow_casters` is empty pending Story 8.1's import.
>
> **Scope guardrails:** Respect the existing API boundary (client components never import `lib/solar`/`lib/weather`/`lib/supabase`/`lib/buildings`; all access via `app/api/*` + `hooks/queries`/`hooks/mutations`). Do not reintroduce admin/auth/moderation surfaces, monetization, or geodata internals in user copy (no EPSG/Baskarta/DTM/RPC names per Story 3.0.6). Do not change the URL/state-forcing contracts or the visual references; existing screens must keep passing their visual gates with real data swapped behind them.

### Story 8.1: Shadow-Caster Geodata Import

As a **maintainer**,
I want the derived Gothenburg shadow-caster geodata loaded into `shadow_casters`,
So that the sun/shadow engine has real building obstructions to compute against.

**Acceptance Criteria:**

**Given** the Story 3.0.3 import handoff (`building_geodata/goteborg-open/derived/shadow_casters.import.jsonl` + `shadow_casters.import_handoff.sql`)
**When** the import is executed against the live Supabase project
**Then** `shadow_casters` is populated with the `include`/`review`/`exclude` records per the Story 3.0.2 contract (active/include rows ≥ 3 m height, source geometry preserved), and an `shadow_caster_import_batches` row records the batch metadata and checksums

**Given** the Story 3.0.4 validation/spot-check gates
**When** the import completes
**Then** the launch-cluster and central-area coverage thresholds pass and any unmodelled-obstruction uncertainty is recorded, with the gate report stored as an import artifact

**Given** the `get_buildings_near_point` RPC
**When** it is called for a central Gothenburg point after import
**Then** it returns only active/include casters with meter-correct radius filtering (no empty-coverage-as-high-confidence regression — Story 3.0.5 contract holds)

### Story 8.1.1: Activate Height-Uncertain Shadow Casters & Re-validate Coverage

> **Added 2026-06-15 via course correction** (see `_bmad-output/implementation-artifacts/8-1-course-correction-2026-06-15.md`). Story 8.1's spot-check validation found the conservative Story 3.0.3/3.0.4 filter deactivates ~1,569 real height-uncertain buildings (footprints certain, only the height estimate is uncertain), so the engine casts no shadow there → systematic false-sunny in the dense central clusters. This story makes them conservative shadow-casters and re-validates coverage. Sequenced immediately after 8.1, before 8.2/8.3.

As a **maintainer**,
I want real buildings with uncertain height to still cast a conservative shadow (instead of being dropped),
So that the central launch clusters stop predicting false "sunny" and can pass the spot-check gate.

**Acceptance Criteria:**

**Given** the Story 3.0.3 filter currently sends `large-z-spread` / `single-line-tall` / `limited-line-support` (and similar height-uncertainty) `byggnad_l` buildings to `review`/inactive
**When** the filter is revised
**Then** those buildings are emitted `filter_decision = include` / `active = true` with a conservative height (agreed rule — e.g. z-range lower bound or a conservative cap) and a lowered `quality_score` plus a `source_flag`/reason marking them height-uncertain; genuinely non-building, sub-3 m, or no-footprint records remain `review`/`exclude`; pipeline unit tests are updated to pin the new behaviour

**Given** the revised filter
**When** `run-all` regenerates artifacts and the handoff is re-run against the live project
**Then** `validate-artifacts` passes, the old batch (`open-goteborg-central-e91dd7302b7c`) rows are replaced (delete-old + import-new batch), all Story 3.0.2 active-row invariants still hold (active ⇒ include ⇒ ≥3 m ⇒ byggnad_l ⇒ source_geom_3007), and the active-caster count rises by the activated set

**Given** the re-imported data
**When** the Story 3.0.4 spot-check gate is re-run (independent cross-check + maintainer-verified sampling)
**Then** every required launch cluster is `eligible` (≥10/cluster, ≥70 central, all 3 sun buckets, ≥85% agreement), the previously false-sunny central spots now read shadowed, and the Story 3.0.5 fail-closed confidence behaviour is unchanged (lowered `quality_score` down-weights rather than the filter omitting the building)

### Story 8.2: Real Venue Store & API

As a **user**,
I want the map and lists to show real Gothenburg venues,
So that I'm looking at places I can actually visit.

**Acceptance Criteria:**

**Given** a Supabase `venues` table contract (defined in this story) seeded with the initial Gothenburg launch venues
**When** `/api/venues` and the venue-detail route are requested
**Then** they return real venues from Supabase (replacing `lib/services/venues-fixture.ts`), preserving the existing `VenueDataDto`/detail response shapes and the planner/time query contract so no frontend component changes are required

**Given** the seeded `test-venue-sunny` slug used by visual/E2E gates
**When** the real data source is wired
**Then** that slug still resolves to a stable, gate-compatible venue so the five visual references and the Playwright suite keep passing

**Given** the API boundary
**When** the route reads venues
**Then** access stays server-side via `lib/supabase` service-role infrastructure; no client component imports backend modules and query keys still come from `lib/query-keys.ts`

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Make `isVenueNotFoundError` robust against error-message format changes — carry a numeric `status` on the thrown venue error and detect 404 against it instead of matching `/failed:\s404\b/i` on the human-readable message (Story 3.4 code review Round 2, R2-D2). [`nextjs-app/hooks/queries/venue-query-options.ts:427`]

### Story 8.3: Real Sun/Shadow/Weather Computation

As a **user**,
I want sun status, sun windows, confidence, and uncertainty to be computed from the real engine,
So that the predictions I see are trustworthy.

**Acceptance Criteria:**

**Given** `lib/solar` (sun position + shadow casting via `get_buildings_near_point`) and `lib/weather` (Met.no Locationforecast)
**When** a venue's sun data is computed for the requested time
**Then** `currentSunStatus`, `sunExposurePercent`, `sunWindow`, `confidence`, and `predictionUncertainty` are produced from the real engine and serialized through the existing DTO fields

**Given** the Story 3.0.5/3.0.6 confidence contract
**When** shadow-caster coverage is empty or below threshold for a venue
**Then** confidence is capped/marked rather than reported as confidently sunny, and the public uncertainty copy renders via the existing `next-intl` keys without leaking geodata internals

**Given** the sun-freshness metadata contract (Story 2.6)
**When** the response is built
**Then** `sunDataSource`/`weatherUpdatedAt` reflect real weather freshness so the confidence display's exact/approximate/hidden states behave correctly

### Story 8.4: Feedback & Review Persistence Enablement

As a **product owner**,
I want feedback and reviews to persist to Supabase,
So that real user input is captured durably.

**Acceptance Criteria:**

**Given** the `feedback` (Story 3.2) and `reviews` (Story 3.3) contract tables exist with RLS enabled
**When** `SUNNYSEAT_FEEDBACK_PERSISTENCE=supabase` and `SUNNYSEAT_REVIEW_PERSISTENCE=supabase` are set
**Then** the existing server-only persistence adapters write to and read from Supabase, and the in-memory fallback remains the default for tests

**Given** RLS policies must match the access model
**When** policies are authored
**Then** `reviews` gets a public read policy (anonymous public content) with writes restricted to the server `service_role`, and `feedback` writes stay server-only (no public/anon write policy); policies follow the Supabase security checklist (no `USING (true)` write policies, explicit `TO` clauses)

**Given** the existing review/feedback E2E and unit suites
**When** persistence is enabled
**Then** the suites pass against intercepted/fixture data with no live Supabase dependency in CI, and a separate integration check verifies the real round-trip

> **Deferred items to incorporate from `_bmad-output/implementation-artifacts/deferred-work.md`** (the SM removes each entry from that file once carried into the drafted story):
> - Surface a localized rejection message when a review photo is refused — when `isSafeOptionalPhoto` rejects a pick (oversized, non-image, 0-byte, over-long name) the `role="status"` region must announce the refusal instead of silently clearing, so no user is left with a Camera button that appears to do nothing (Story 3.4 code review Round 2, R2-D1). [`nextjs-app/components/composed/feedback/ReviewForm.tsx:193-197,219-229`]

### Story 8.5: Production Config & Security Hardening

As a **maintainer**,
I want the live data path configured and secured for deployment,
So that SunnySeat can go live safely.

**Acceptance Criteria:**

**Given** the Vercel deployment and Supabase project
**When** environment is configured
**Then** server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, Met.no config, persistence flags) are set per environment and never exposed to the client (no `NEXT_PUBLIC_` leakage of secrets)

**Given** the Supabase security advisor
**When** it is run after wiring
**Then** application tables have appropriate RLS policies and remaining findings are limited to accepted PostGIS platform exceptions (`spatial_ref_sys`, `postgis`-in-public, `st_estimatedextent`), each documented as accepted

**Given** generated DB types
**When** the schema is stable
**Then** `lib/supabase/types.ts` is regenerated from the live schema (replacing the placeholder) and the typecheck/lint/test gates pass

> **Carried-in from Story 8.2 code review Round 2 (2026-06-18) — opt-in Supabase venue-store path, pre-cutover verification:** when this story enables the live read (`SUNNYSEAT_VENUE_STORE=supabase`), verify (a) **uniqueness-key alignment** — `validateVenueUniqueness` (`app/api/venues/route.ts`) dedupes on `id` + rounded coordinates while the `venues` contract enforces unique `id` + `slug`; two live venues sharing rounded coordinates would 500 the list route and a duplicate slug is caught only by the DB index, so align the assumptions (or relax the coord check) and confirm live venue-data integrity; and (b) **query-contract coverage** — the mocked `venue-store` tests don't assert the args to `.select(VENUE_SELECT_COLUMNS)` / `.eq('slug', …)`, so add query-contract assertions or a live round-trip so a snake_case column/filter typo is caught before production.

> **Carried-in from Story 8.3 code review Round 1 (2026-06-21) — opt-in real sun-engine path, pre-cutover hardening:** when this story enables the live engine (`SUNNYSEAT_SUN_ENGINE=real`), address (a) **fan-out & third-party load** — the real list path issues 2 Supabase RPCs + 1 Met.no forecast per venue via an uncapped `Promise.all` and nearby venues fetch near-duplicate forecasts; add a concurrency cap and/or dedupe forecasts by rounded coordinates (and revisit the DECISION D precompute/Cron follow-up) to respect Met.no's usage policy and avoid connection exhaustion under load; and (b) **"never 500" invariant** — the per-venue degrade currently rests solely on `applyRealSunEngine`'s internal try/catch behind `Promise.all`; switch to `Promise.allSettled` (or a defensive wrapper) so a future refactor that lets the adapter throw cannot 500 the whole endpoint; and (c) **AC #3 weather-freshness fidelity** — `getForecast` stamps `createdAt: new Date()` on every slice (incl. forecasts) and the adapter reports it as `weatherUpdatedAt`, so the confidence-display "approximate" state (weather >2h old) never fires and future-planner slices are advertised as fresh "now"; at cutover extend `WeatherSlice` with a `validAt`/slice-time field (used for both `weatherUpdatedAt` and staleness) or derive the approximate/stale signal from `isForecast`. (See `deferred-work.md` → "code review Round 1 of 8-3-…" for the full list.)

**Design Gate Criteria (Epic 8 overall):**
- **Behaviour:** Every existing screen behaves identically with real data swapped behind the API boundary; loading/empty/error states already built in Epics 1–3 handle real latency and failures.
- **Visual validation:** The five existing gate states (`map-with-selected-venue`, `venue-detail` mobile/desktop, `feedback`, `review`) plus map-primary continue to pass against their references with real (or gate-seeded) data; any genuine visual change requires explicit rationale + `REBASELINE-LOG.md`.
- **No new screens or visual references are introduced by this epic** — it is a data/infrastructure swap behind the existing UI.
