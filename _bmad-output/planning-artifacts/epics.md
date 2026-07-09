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
> - Fix the AA colour-contrast (WCAG 1.4.3 / NFR25 "amber palette verified against cream backgrounds") on the venue-card decorative `aria-hidden` sun-percentage label — `text-amber-text` (#fbbc00) on `surface-cream` ≈ **1.63:1**, a SERIOUS axe violation surfaced on every venue-card surface (`map-primary`, the `venue-detail` sheet, feedback/review) at the mobile viewport. This is the same amber-on-cream class as the partner-pin work and is the blocker for the four `test.fixme` mobile a11y scans. While doing the amber/cream contrast sweep, also fix the two adjacent decorative-text near-failures the same gate flagged: the desktop `venue-detail` amber label `#6e5101` ≈ **4.47:1** (borderline), and the About/Privacy footer wordmark `<span class="text-display-sm text-text-muted">sunnyseat</span>` (#938e81 on cream, 16px/800 ⇒ not "large text") ≈ **3.13:1** (non-venue-card, but the same below-AA decorative-text class — fold it into this pass since there is no other owning story). Darkening any of these will ripple the `map-primary`/`venue-detail`/`favourites-tab` (+ `about`) visual references → rebaseline + REBASELINE-LOG entry in the same change. On completion, flip the four `test.fixme` venue-card scans in `nextjs-app/test/e2e/axe-mobile.spec.ts` back to `test`, and re-confirm the existing desktop `about`/`privacy`/`venue-detail` scans in `axe.spec.ts` pass. *(Source: Story 7.3 a11y gate — pre-existing color-contrast red at HEAD under axe-core 4.11.4, 2026-06-29.)*

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

### Story 8.6: Elevation-Aware Shadow Gate for Rooftop / Raised Venues

> **Added 2026-06-22 (party-mode scoping session).** Promotes the venue-elevation follow-up deferred from Story 8.5 (`deferred-work.md` → "Story 8.5 follow-up — venue elevation"). The shadow engine is currently 2D / ground-level for the *target* venue: `lib/solar/shadow-calculation-service.ts → computeShadowInfo` does a flat 2D overlap of each caster's shadow against the seating polygon with **no venue-elevation input**, so a rooftop bar or raised terrace that physically sits above its neighbours is wrongly reported as shaded (high confidence, wrong answer). The nullable `public.venues.seating_elevation_m` column (Story 8.2 contract — metres of the seating surface above local ground) already records this, **capture-only** today. This story makes the engine *consume* it via a lightweight height gate (Tier 1 — the flat-city rooftop case). Terrain/ground-elevation handling for hilltop venues is Story 8.7. Backend/data-accuracy only — no new screen.

As a **sun-seeker**,
I want a venue whose outdoor seating sits above street level (rooftop bar, raised terrace, balcony) to be predicted from the height of its seating surface,
So that a venue sitting above its neighbouring buildings is not wrongly reported as shaded.

**Acceptance Criteria:**

**Given** a venue with `seating_elevation_m` set (> 0) and nearby active shadow casters
**When** the sun engine computes the venue's shadow
**Then** a caster only shadows the venue by its height *above* the seating surface — its effective casting height is reduced by `seating_elevation_m` before the meaningful-height gate, so a caster at or below the seating surface no longer contributes a shadow to that venue

**Given** a venue with `seating_elevation_m` null or 0 (every current fixture / launch venue)
**When** the engine computes the venue's shadow
**Then** behaviour is byte-identical to today's ground-level 2D overlap — no regression, and the existing visual gates pass with no rebaseline

**Given** the server-only venue store (`lib/services/venue-store.ts`)
**When** a Supabase venue row carries `seating_elevation_m`
**Then** it is selected via `VENUE_SELECT_COLUMNS`, mapped through `StoredVenue` as a **server-only** field (never serialized into `VenueDataDto`, mirroring `seatingArea`), and threaded into `lib/services/sun-engine.ts` → the `computeShadowInfo` call chain (list + detail + timeline paths)

**Given** the height gate is all-or-nothing (a caster taller than the seating surface still casts a full-coverage shadow; sub-shadow partial occlusion is not modelled)
**When** predictions are produced for elevated venues
**Then** this approximation is documented as a known MVP limitation, consistent with the engine's existing "coarse for MVP" treatment, rather than presented as a silently over-confident result

**Design Gate Criteria (Epic 8 overall):** Backend/data accuracy only — no new screen or visual reference. Existing gate states continue to pass unchanged (launch venues keep `seating_elevation_m` null → existing ground-level path). User-facing copy stays free of geodata internals (no elevation-in-metres jargon per Story 3.0.6).

### Story 8.7: Terrain-Aware Ground Elevation for Hilltop Venues

> **Added 2026-06-22 (party-mode scoping session).** Tier 2 of the venue-elevation follow-up (see Story 8.6 and `deferred-work.md`). Story 8.6 handles a venue raised above its *own* ground (rooftop / raised terrace). This story handles a venue on raised *terrain* (a hilltop terrace), where the relevant comparison is the venue's **ground** elevation versus each caster's ground elevation. The Göteborg Höjdmodell 2022 DTM is already in the geodata pipeline (used to derive building heights — `max roof/facade Z − DTM ground Z`), so this is a ground-elevation lookup at the venue point, **not a new data acquisition**. Backend/data-accuracy only — no new screen.

As a **sun-seeker**,
I want a venue on elevated terrain to account for the ground-height difference between it and the surrounding buildings,
So that a venue standing on a rise is not wrongly shadowed by buildings that sit on lower ground.

**Acceptance Criteria:**

**Given** the Göteborg Höjdmodell 2022 DTM ground model already used by the import pipeline
**When** the engine computes the shadow for a venue on elevated terrain
**Then** a caster's effective shadow-casting height relative to the venue is measured against the venue's DTM ground elevation (not the caster's own ground), so a building standing downhill from the venue stops shadowing it once its roof falls below the venue's seating surface

**Given** a venue on flat terrain with no meaningful ground delta to its nearby casters
**When** the engine computes its shadow
**Then** the result is unchanged from Story 8.6 / today (the ground delta contributes ~0)

**Given** the combined Story 8.6 (height above own ground) + Story 8.7 (terrain ground delta) inputs are both present for a venue
**When** the engine computes its shadow
**Then** the effective-height test composes them coherently — caster roof *absolute* height vs. venue seating-surface *absolute* height (venue DTM ground + `seating_elevation_m`) — without double-counting the elevation

**Design Gate Criteria (Epic 8 overall):** Backend/data accuracy only — no new screen or visual reference; identical gate-pass expectations as Story 8.6 (default path byte-identical).

## Epic 9: "Live-App Hardening & Clean-Up" — Post-Launch Polish, Performance & Truthful Data

After production cutover, real-world desktop testing surfaced a batch of design-drift, dead-control, performance, content-bloat, and location issues. This epic fixes them and applies a deliberate **"clean app, no information overload"** product principle throughout.

> **Added 2026-06-30 (party-mode triage session).** Source: a maintainer walkthrough of the live app with annotated screenshots, investigated by a multi-agent code triage. The findings collapsed ~16 reported symptoms into five shared root causes, captured here so stories are drafted against the real cause, not the surface symptom:
> 1. **One wrong CTA gradient token.** `nextjs-app/app/globals.css` defines `--gradient-route-button` as an olive→gold ramp (`--color-amber-dark #735c00 → --color-amber-gold`); the canonical reference and the already-correct sibling token `--gradient-cta-amber` (`#d4af37 → #ffbf00`) ramp the opposite way. Every "legacy" gold/olive button (VISA RUTT, "Tillbaka till kartan", 404 CTA) inherits this one token. (Story 9.2)
> 2. **Fabricated per-slug venue metadata.** `nextjs-app/lib/utils/venue-visual-metadata.ts` invents `exposure`, `tags`, distance, seats, price for every card and detail panel via a hardcoded `BY_SLUG` table + `DEFAULT_METADATA` fallback; only rating/reviewCount are real. The venue type's `orientation` field is never consumed. This is the upstream cause of the wrong "EXPONERING" value and the absence of any truthful field to filter tags on. (Stories 9.1, 9.7)
> 3. **"Visual shell without plumbing."** Controls rendered `disabled`/`cursor-not-allowed` with no state, handler, or consumer: top-nav tag chips, nav pager chevrons, list category buttons, the venue-detail share button, and a duplicate mobile-search settings button. (Stories 9.6, 9.7, 9.8)
> 4. **Time/date wired straight into the TanStack query key with no debounce, over a heavy uncached engine.** Each snapped 15-min change fires a fresh `/api/venues` round-trip; per request the real engine runs N venues × 2 Supabase `get_buildings_near_point` RPCs (~145–440 ms each, measured live) + ~41 shadow projections, with no server cache; the same cost hits the venue-detail route. (Stories 9.3, 9.4)
> 5. **Onboarding gate renders a non-interactive placeholder on first paint** (`OnboardingGate.tsx`), with the real screen portalled in only after client hydration of a `localStorage`-gated effect — causing both the brief "map flashes before the welcome overlay" and the intermittent "Use my location did nothing" dead-click, compounded by a service-worker stale-shell window. (Story 9.5)
>
> **Verified NOT broken (no story needed):** the date picker works (the "no effect" report was the last-day-of-month month-view edge — navigating to the next month and selecting works); the search bar is a working autocomplete dropdown (Enter-to-submit polish only); the venue-detail "SOLTIDER IDAG" strip is read-only by design, matching the reference. The latent `?_time=`/`?_date=` production planner-pin leak is still fixed as hygiene (Story 9.0).
>
> **Maintainer decisions (2026-06-30):** EXPONERING text → **remove**; uncertainty-reason text ("Osäker prognos · Byggnadsskuggor · mer osäkra") → **remove** (the % already carries the trust signal); "Blir skuggigt om X min" → **remove entirely** (never computed on the live path); "Vi räknar på solens läge…" explanatory paragraph → **remove**; tag filtering → **build for real** (requires real tag data on Supabase venues first); venue sharing → **build for real** (desktop + mobile); map chrome → keep the top-bar locate + settings buttons (enable the disabled settings gear), remove the duplicate floating ones over the map.

> **Mobile live smoke-test addendum (2026-06-30).** A Playwright pass over the live site at 390×844 (iPhone) confirmed the issues above also reproduce on mobile and surfaced additional findings, folded into the stories below:
> - **Fabricated fact cards contradict the real engine (data-integrity, not just bloat).** Beyond the EXPONERING block, the venue-detail fact grid shows "BÄST KL." and "Platser ute ~N" sourced from the hardcoded `venue-visual-metadata.ts` placeholders. On Café Halvvägs the real Solprognos reads "Bäst 08:30–14:00" while the "BÄST KL." card reads "18:00" — a visible contradiction. The per-card tag pills are the same fabricated placeholders. → Story 9.1 (remove the fabricated/contradictory fact cards alongside EXPONERING) + Story 9.7 (make tags real). **Maintainer default applied:** treat fabricated "BÄST KL." / "Platser ute" the same as EXPONERING (remove unless a truthful source exists), since a contradictory value is worse than an absent one.
> - **Accessibility: verbose + duplicated card labels.** Every venue-card button's accessible name embeds the entire uncertainty paragraph and duplicates the confidence ("Säkerhet: 60% Säkerhet 60%"). → Story 9.1 (clean the aria-labels when the visible text is removed).
> - **Mobile quick-info card collides with the time-slider panel.** When a venue is selected, the quick-info card overlaps the "Planera soltid" planner panel above it (the sun-% badge is jammed under the slider). → Story 9.9.
> - **Audit ALL amber gradient surfaces, not just the 3 known CTAs.** The detail-header sun-% badge and "ÖPPET" status badge also read as gold/olive; confirm whether they use the legacy ramp. → Story 9.2 (widen to an audit of every amber-gradient surface).
> - **Console warnings (no errors):** 3× "Expected value to be of type number, but found null" from the map blob (likely a null coordinate/expression in a MapLibre layer). → Story 9.10 (investigate + guard).
> - **Onboarding did not gate a fresh automated session** — the live site loaded straight to the map with no welcome overlay in a clean (empty-localStorage) Playwright context. Additional evidence for the Story 9.5 onboarding-gate hydration defect; the story must verify a true new user reliably sees the welcome screen.
> - **All venue photos are placeholders** ("PLATSHÅLLARBILD") on the live data path — a real-photo content gap (likely a separate data-population task, noted here for visibility, not yet a story).

### Story 9.0: Production-Gate the Dev Planner-Forcing URL Leak

As a **maintainer**,
I want the `?_time=`/`?_date=` planner-forcing parameters to be honoured only outside production,
So that no production URL can silently pin the planner and disable the live clock.

**Acceptance Criteria:**

**Given** `nextjs-app/components/custom/layout/AppContextProviders.tsx` reads `_time`/`_date` from the URL
**When** the app runs in production (`process.env.NODE_ENV === 'production'`)
**Then** `forcedTime`/`forcedDate` are always `undefined` (mirroring the existing gate in `lib/dev/use-forced-state.ts`), so the live-clock interval and normal time/date selection operate, while dev/preview keep the forcing behaviour for tooling and e2e

**Given** the e2e suite that appends `?_time=` for deterministic sun assertions
**When** it runs against a non-production build
**Then** the forcing still applies and the existing time-dependent specs remain stable

**Given** a regression guard is needed
**When** the gate is added
**Then** a unit/integration test asserts that `_time`/`_date` are ignored under a simulated production env and honoured otherwise

### Story 9.1: Clean-App Content Sweep (Venue Card & Detail De-Bloat)

As a **user**,
I want the venue card and detail to show only the essential verdict (a sun % and the basics),
So that the app feels clean and I'm not overloaded with explanatory noise.

**Acceptance Criteria:**

**Given** the venue detail panel (`VenueDetailContent.tsx`) and quick-info card (`VenueQuickInfo.tsx`) on mobile and desktop
**When** they render
**Then** the following are removed: the "EXPONERING" / exposure block, the uncertainty-reason line ("Osäker prognos · Byggnadsskuggor · mer osäkra" and its variants), the "Blir skuggigt om X min" line, and the "Vi räknar på solens läge, byggnadsskuggor och väder…" explanatory paragraph, plus the fabricated venue-detail fact cards that have no truthful source — "BÄST KL." (which contradicts the real Solprognos best-time, e.g. "BÄST KL. 18:00" vs a real "Bäst 08:30–14:00") and "Platser ute ~N" (fabricated seat count) — while the confidence/"Säkerhet %" figure and genuinely-real fact cards (e.g. "Avstånd") are preserved as the trustworthy signals

**Given** these elements are removed
**When** the layout reflows
**Then** no orphaned separators, middots ("·"), empty rows, or dangling labels remain in either breakpoint

**Given** the venue-card accessible name currently embeds the entire uncertainty paragraph and duplicates the confidence ("Säkerhet: 60% Säkerhet 60%")
**When** the visible bloat text is removed
**Then** each card's `aria-label` / accessible name is also reduced to the essentials (name, sun %, confidence once, distance) with no duplicated or orphaned phrases

**Given** the supporting code and content
**When** the sweep is complete
**Then** the now-unused i18n keys are removed from `messages/{sv,en}/venue.json`, the dead `shadowWarningMinutes` render branch + `prediction-uncertainty-display` reason logic are removed (or reduced to what the % still needs), the stale `bistro-bakgarden.shadow_warning_minutes=0` seed is nulled, and the corresponding unit test (`test/unit/prediction-uncertainty-display.test.ts`) is updated/removed accordingly

**Design Gate Criteria:**
- **Visual:** Venue card + detail match the reference `QuickInfo`/`VenueDetail` with the removed elements absent and spacing intact
- **Behaviour:** Confidence % still renders for all venue states; no empty/placeholder rows in any state
- **Animation:** No regressions to existing sun-timeline / confidence animations
- **Visual validation:** Screenshot comparison of card + detail (mobile & desktop) against references passes before QA handoff

### Story 9.2: Design-System CTA Token Fix + Copy Correction

As a **user**,
I want all primary buttons to use the current gold→amber design, not a legacy olive fill,
So that the app looks consistent and current.

**Acceptance Criteria:**

**Given** `--gradient-route-button` in `nextjs-app/app/globals.css` currently ramps olive→gold
**When** the token is corrected to the canonical gold→bright-amber ramp (matching `--gradient-cta-amber` / the reference)
**Then** all three consumers — `RouteButton.tsx` ("VISA RUTT"), `AboutPage.tsx` ("Tillbaka till kartan", mobile + desktop), and `NotFoundPage.tsx` (404 CTA) — render the corrected gradient with their existing shadow tokens intact, and the `amber-cta-text` foreground still meets contrast on the brighter end stop

**Given** the Swedish filter-chip label
**When** `messages/sv/common.json` is corrected
**Then** the `nav.filterChips.rooftop` value changes from "Takt" to "Takterrass" (EN stays "Rooftop") and the duplicated fixture string in `test/components/DesktopNavBar.test.tsx` is updated to match

**Given** the mobile smoke test found other amber-gradient surfaces that read as gold/olive (the venue-detail sun-% badge and the "ÖPPET" status badge), not just the three known CTAs
**When** the token fix lands
**Then** every amber-gradient surface is audited against the canonical ramp — any still using the legacy olive `--color-amber-dark` start is corrected, and surfaces already on the correct ramp are confirmed unchanged

**Design Gate Criteria:**
- **Visual:** Corrected CTAs match the reference button styling (gold→bright-amber); no olive start stop anywhere
- **Behaviour:** Buttons keep their existing actions and hover/active states
- **Animation:** Existing button transitions unchanged
- **Visual validation:** Screenshot comparison of the route CTA + About CTA against references passes before QA handoff

### Story 9.3: Venue Sun-Compute Performance — Server Caching

As a **user**,
I want the venue list and the "Mer info" detail panel to load fast,
So that the app feels responsive instead of stalling on every load.

**Acceptance Criteria:**

**Given** `computeRealSunEngine` (`lib/services/sun-engine.ts`) currently fetches nearby buildings twice per venue (once for current-shadow, once for the timeline)
**When** it is refactored to fetch the building set once and reuse it for both
**Then** RPC volume per request is halved (≈14→7 for the current 7 venues) with byte-identical sun outputs, and the stale "one buildings fetch reused internally" comments are corrected

**Given** building geometry changes very rarely and sun state changes slowly
**When** caching is added
**Then** the `get_buildings_near_point` result is wrapped in a server cache keyed on rounded centroid + radius (long revalidate), and the per-(venue, rounded-time-bucket, day) sun computation is cached so repeated requests within a bucket are near-free — applied to **both** `/api/venues` (list) and `/api/venues/[slug]` (detail) so "Mer info" benefits equally

**Given** the dynamic route currently defeats CDN caching (the `s-maxage` header is dead because the handler reads request headers for rate-limiting)
**When** the caching strategy lands
**Then** either rate-limiting is moved so the cacheable response can be edge-cached, or the precompute follow-up flagged in `sun-engine.ts` is adopted; the chosen approach is documented, and sun-data freshness stays within an agreed staleness window

**Design Gate Criteria (backend/perf — no new screen):** No visual change; existing gate states pass unchanged with real/cached data. Performance is the acceptance signal: warm-cache list + detail loads are materially faster than the pre-fix baseline (capture before/after timings in the story record).

### Story 9.4: Client Query Hygiene & Time-Change Debounce

As a **user**,
I want changing the time and switching to Favoriter to feel instant,
So that I'm not waiting on redundant network round-trips.

**Acceptance Criteria:**

**Given** the "Favoriter" tab uses a separate, non-shared query that refetches the engine for already-loaded venues
**When** the favourites view is sourced from the existing `venues.list` cache (derive by filtering loaded venues by favourite ids, or seed the favourites query from cache with an appropriate `staleTime`)
**Then** entering Favoriter no longer issues a fresh `/api/venues` request when the venues are already loaded, and toggling between "Närmast" and "Favoriter" is instant

**Given** the list currently fetches once at the geolocation fallback coords and again when real GPS resolves (a different bucketed key)
**When** the double-fetch is addressed (gate the first fetch until geolocation settles, or widen the coordinate bucket)
**Then** initial load issues a single venue request in the common case, with `keepPreviousData` still masking any necessary transition

**Given** the time scrubber currently feeds `selectedMinutes` straight into the query key on every change
**When** the time→query coupling is debounced/committed on settle (commit on pointer-up / arrow / blur via the existing `onSnap`, or `useDeferredValue` in `MapView`)
**Then** a drag enqueues at most one `/api/venues` request after the user settles, and returning the slider to the current time reads as an intentional "live now" state rather than a silent no-op

**Design Gate Criteria:**
- **Visual:** No visual change to the list, favourites, or time controls
- **Behaviour:** Favoriter↔Närmast switch issues no redundant fetch; one request per settled time; live-now state is clear
- **Animation:** Slider thumb stays smooth during drag (visual position decoupled from the committed query)
- **Visual validation:** N/A beyond confirming list/favourites render identically; behaviour covered by regression tests in Story 9.10

### Story 9.5: Location & Onboarding Reliability

As a **user**,
I want the welcome screen to appear cleanly and "Use my location" to reliably work and show me on the map,
So that I trust the app knows where I am.

**Acceptance Criteria:**

**Given** the onboarding gate currently renders a non-interactive placeholder on first paint and portals the real screen in after hydration
**When** the gate reads its "onboarded" state synchronously on first render (e.g. a server-readable cookie or `useSyncExternalStore`)
**Then** the correct screen (welcome or map) is shown from the first frame — eliminating the brief "map flashes before the welcome overlay" — and the real, wired "Use my location" button exists immediately so an early click always triggers the permission prompt

**Given** geolocation resolves successfully
**When** the map renders
**Then** a "you-are-here" marker (the amber `UserPin` from the design reference) is drawn at the user's coordinates via a dedicated marker layer, updates on coordinate changes, and is not shown while status is the Gothenburg fallback

**Given** the user skips/denies location (origin is the Gothenburg-centre fallback)
**When** distances and the "Närmast" sort render
**Then** the UI is honest about it — distances are labelled approximate / "≈ från centrum" (or "Närmast" is suppressed) rather than implying a real personal fix

**Given** a returning user whose permission state is "prompt", and the service-worker can serve a stale precached shell after a deploy
**When** these edge cases occur
**Then** the app surfaces a way to (re-)request location instead of silently using the fallback, the locate button shows pending/denied feedback, and an activated SW update prompts/forces a reload so the fresh shell is shown

**Design Gate Criteria:**
- **Visual:** User-location dot matches the reference `UserPin` (amber dot + halo); welcome screen covers the map with no flash
- **Behaviour:** "Use my location" reliably prompts and recenters; dot appears on success; honest distance labelling when denied
- **Animation:** No map-flash on load; dot appears without jarring jump; existing fly-to animation preserved
- **Visual validation:** Screenshot of map with the location dot + clean first paint of the welcome screen passes before QA handoff

### Story 9.6: Map Chrome Consolidation & Dead-Control Cleanup

As a **user**,
I want one clear set of map controls and no buttons that don't do anything,
So that the interface is clean and every control works.

**Acceptance Criteria:**

**Given** the mobile UI currently shows duplicate locate + settings buttons — one pair in the top search row (`VenueSearchShell.tsx`) and one pair floating over the map (`MapControls.tsx`)
**When** the chrome is consolidated
**Then** the floating mobile locate + settings buttons are removed from `MapControls` (zoom +/- remain), and the top-bar pair is kept as the single access point

**Given** the top-bar settings gear is currently hard-`disabled` (`VenueSearchShell.tsx:111-118`)
**When** it is wired
**Then** it opens the settings modal via `useSettings().openSettings` (the same call `MapControls` used), and the top-bar locate button continues to request location — both fully functional, neither greyed out

**Given** other disabled placeholder controls exist (nav pager chevrons in `DesktopNavBar.tsx`, "Café"/"Öppet nu" category buttons in `VenueListControls.tsx`)
**When** the cleanup runs
**Then** these are hidden/removed until their features are built, so no inert control reads as broken (tag chips are handled in Story 9.7; the share button in Story 9.8)

**Given** the search bar is a working autocomplete with no submit affordance
**When** a low-priority polish is applied
**Then** pressing Enter with no highlighted option selects the first visible result (pans the map), closing the "type-then-Enter does nothing" expectation gap

**Design Gate Criteria:**
- **Visual:** Single, consistent control set on mobile; no greyed/disabled controls remain on screen
- **Behaviour:** Kept locate + settings buttons both work; removed/hidden controls are gone; Enter selects first search result
- **Animation:** Control hover/press states unchanged
- **Visual validation:** Screenshot of the mobile map chrome (top bar + remaining zoom stack) passes before QA handoff

### Story 9.7: Tag Filtering (Real Data + Working Chips)

As a **user**,
I want to tap a tag (Innergård, Hund ok, Wifi…) and filter venues to those that match,
So that I can quickly narrow to places that fit what I want.

**Acceptance Criteria:**

**Given** venue "tags" today are decorative per-slug placeholders with no truthful source
**When** real tag/amenity data is added to the Supabase `venues` contract and surfaced through the venue DTO (replacing the `venue-visual-metadata.ts` placeholders for tags)
**Then** each venue exposes its real tag set, and the chip row is data-driven (derived from the union of venue tags, matching the reference approach) rather than a hardcoded list

**Given** a user taps one or more tag chips
**When** the filter state changes (shared via context/lifted state consumable by both the nav and the venue surfaces)
**Then** active chips render in the reference "on" pill style, and the venue list and map pins are filtered to venues whose tags intersect the active selection, with a clear empty state when nothing matches

**Given** the chip labels
**When** they render
**Then** they use corrected copy (e.g. "Takterrass" not "Takt") and consistent casing across locales

> **Data prerequisite (maintainer note, 2026-06-30 — verified against the live DB, project ref `hhnbxrhfhlzxgllxukzj`):** the live `public.venues` table currently has **no `tags` column** (24 columns: id, slug, venue_name, neighborhood, lat, lng, is_partner, thumbnail, description, address, opening_hours, peak_time, shadow_warning_minutes, current_sun_status, sky_condition, confidence, sun_exposure_percent, sun_window, prediction_uncertainty, created_at, updated_at, seating_area, seating_elevation_m, ground_elevation_m — and no `orientation` column either). This story must therefore **add the column via an additive migration** (e.g. `tags text[] not null default '{}'`, or `jsonb` — match the venue-data contract / `VENUE_SELECT_COLUMNS` convention) and update the `.sql` contract file + `lib/supabase/types.ts` accordingly. The table holds **only the 7 test/fixture venues** (Kafé Magasinet, Bryggerietsoltak, Solplats Magasinsgatan, Café Halvvägs, Brygghuset Lerum, Skuggans Hus, Bistro Bakgården) — **no production data**, so the migration is safe with **no data-loss risk**. Maintainer decision: **seed those 7 test venues with representative tags** (e.g. Innergård, Hund ok, Wifi, Takterrass) so the chips have real data to filter on. The column add + test-data seed are **in-scope dev work for this story** — they do **not** require a separate maintainer `needs-human` step.

**Design Gate Criteria:**
- **Visual:** Chips (idle + active) match the reference `TopBar` styling
- **Behaviour:** Tapping chips filters list + map; multi-select intersects; empty state shown when no matches
- **Animation:** Chip toggle + list/pin update transitions are smooth
- **Visual validation:** Screenshot of active-filter state (chips + filtered list) passes before QA handoff

### Story 9.8: Venue Sharing (Real)

As a **user**,
I want to share a venue's sun status with a friend,
So that I can invite someone to a sunny spot.

**Acceptance Criteria:**

**Given** the venue-detail share (↗) button is currently a disabled stub with no handler
**When** sharing is implemented
**Then** the button is enabled and wired: on mobile it invokes the native `navigator.share()` with the venue link/title; on desktop it opens a share surface (copy-link + share targets) modeled on the reference `ShareModal.jsx`

**Given** mobile currently has no share entry point in the venue header
**When** sharing ships
**Then** the share affordance is available on mobile as well as desktop, using the existing `detail.share` i18n string

**Given** the share link is opened by a recipient
**When** they land on the venue
**Then** the deep-link resolves to the correct venue detail (reusing existing routing/slug handling)

**Design Gate Criteria:**
- **Visual:** Share button (enabled) + desktop share surface match the reference styling
- **Behaviour:** Native share on mobile; copy-link + targets on desktop; deep-link resolves
- **Animation:** Share surface open/close matches modal transition spec
- **Visual validation:** Screenshot of the enabled share control + desktop share surface passes before QA handoff

### Story 9.9: Mobile Venue Quick-Info Card Rework

As a **user**,
I want the mobile quick-info card to look polished,
So that the most common surface feels well-crafted, not cramped.

**Acceptance Criteria:**

**Given** the current mobile `VenueQuickInfo` card looks cramped/off versus the reference
**When** it is reworked toward the reference `QuickInfo.jsx` (mobile)
**Then** spacing, type hierarchy, badge placement, and the CTA row (VISA RUTT with the corrected token + MER INFO) match the reference, incorporating the Story 9.1 content removals (no uncertainty-reason line)

**Given** the card renders for venues across sun states (full sun / partial / shaded)
**When** each state shows
**Then** the layout holds without overflow or truncation on common mobile widths

**Given** a venue is selected on mobile (the smoke test found the quick-info card overlapping the "Planera soltid" time-slider panel above it — the sun-% badge jammed under the slider)
**When** the quick-info card is shown
**Then** it sits clear of the planner panel with correct vertical spacing, no overlap at common mobile heights

**Design Gate Criteria:**
- **Visual:** Mobile quick-info card matches the reference `QuickInfo` layout and spacing
- **Behaviour:** Heart/close/CTA actions work; card states render correctly
- **Animation:** Card present/dismiss transitions match spec
- **Visual validation:** Screenshot comparison of the reworked mobile card against the reference passes before QA handoff

### Story 9.10: Mobile-Device Verification Pass & Regression Guards

As a **maintainer**,
I want every Epic 9 fix verified on mobile and protected by regression tests,
So that the fixes hold on the form factor most users are on and don't silently regress.

**Acceptance Criteria:**

**Given** the maintainer has so far tested primarily on desktop
**When** a mobile-viewport verification pass is run (Playwright mobile profile + manual spot-check on a real device) across all Epic 9-touched surfaces
**Then** each fix is confirmed on mobile — clean-app deletions, CTA token, performance, location dot + onboarding, chrome consolidation, tag filtering, sharing, and the reworked quick-info card — and any mobile-only gaps are logged as follow-ups

**Given** the behavioural fixes need protection
**When** regression tests are added
**Then** they cover at least: clean-URL date selection refetches with the new date; a settled time change issues exactly one venues request; Favoriter↔Närmast issues no redundant fetch; the location dot renders on geolocation success; and the planner-leak gate ignores `?_time=` in production

**Design Gate Criteria (verification story):** No new UI of its own; the gate is that all other Epic 9 stories' visual references pass at mobile breakpoints and the regression suite is green.

## Epic 10: "Honest Sky" — Weather-Gated Two-Signal Sun Display

The live app currently answers *"which terraces would be sunny if the sky were clear"* — on an overcast, rainy afternoon it shows venues at 63–100% with FULL SOL badges, contradicting what any user can see out their window. This epic makes the headline sun state weather-honest while preserving the geometric sun-position layer (the product's unique IP) as a clearly-labelled second signal: *"cloudy now — but when it clears, THIS is the terrace in sun."*

> **Added 2026-07-02 (party-mode live-app investigation).** Source: maintainer report of the live app showing 63–100% sun during rain in central Gothenburg (16:17 local), investigated against the code. Root causes, so stories are drafted against the real cause:
> 1. **The sun state is geometry-only.** `lib/services/sun-engine.ts` computes `sunExposurePercent` and `currentSunStatus` purely from sun position + building shadows (`isSunVisible` = above horizon — astronomy, not meteorology). Met.no weather IS fetched per venue but feeds only `skyCondition`, `confidence`, and `predictionUncertainty` — it never gates the displayed state.
> 2. **`calcCloudCertainty` never reads `weather.cloudCover`** (`lib/solar/confidence-calculator.ts:151-157`). It scores freshness/forecast-flag/source-reliability only, so fresh Met.no data during a downpour yields ~0.9 "cloud certainty" and a high confidence figure. FR12's promised blend ("geometric sun certainty with weather-based cloud cover uncertainty") was never implemented.
> 3. **`skyCondition` is computed and serialized but never rendered.** The engine maps cloud cover to `clear`/`partly-cloudy`/`overcast` in the DTO; no component consumes it — the one honest weather signal dies in transit.
> 4. **Missing cloud data defaults to clear sky.** `lib/weather/met-no-service.ts:85` does `cloud_area_fraction ?? 0` — the optimistic default is exactly the wrong failure mode (absent data must read as "unknown", never "sunny").
>
> **Maintainer decisions (2026-07-02):** Display model = **two-signal** (headline state gated by weather; geometric % / sun windows preserved as clearly-labelled clear-sky potential) — chosen over a hard gate (throws away the differentiator: venue ranking + "when it clears" info) and over blending cloud into the % (fabricates an undefendable number; the % must keep one physical meaning). **Tiers 0, 1, and 2 are all in-scope for this epic:** Tier 0 = gate on the `cloud_area_fraction` we already fetch + fix root causes 2 and 4; Tier 1 = Met.no `complete` endpoint for the low/medium/high cloud split (thin cirrus ≠ blocking stratus); Tier 2 = Met.no Nowcast 2.0 radar precipitation as an additional no-sun signal. **Hard constraint on Tier 2: absence of rain must NEVER imply sun** — no-rain contributes nothing positive; sun position, building shadows, and cloud cover still gate. Tier 3 (commercial satellite irradiance nowcasting, e.g. Solcast-type feeds) is explicitly OUT of this epic — backlog, revisit only if user feedback says the hourly cloud signal feels laggy.
>
> **Physics guardrail (for story drafting and copy):** per-cloud, per-patio "is THIS terrace's sun blocked by THAT cloud right now" is not achievable from any data source — cumulus shadows are ~hundreds of metres moving 30–50 km/h; Met.no's Nordic model is a ~2.5 km grid (all of central Gothenburg ≈ 1–2 cells), and even 5–15-min satellite imagery is stale on arrival. Weather is a citywide-scale signal; geometry is the per-patio signal. UI copy must never claim per-venue cloud precision, and per-venue cloud *differences* within the city should be treated as noise, not signal.
>
> **Scope guardrails:** Respect the existing API boundary (client components never import `lib/weather`/`lib/solar`/`lib/supabase`; all access via `app/api/*` + hooks). The geometric meaning of `sunExposurePercent`, `sunWindow`, and `peakTime` must NOT change (clear-sky potential); the weather gate is a separate, additive signal. Met.no TOS compliance carries over (identifying User-Agent, coordinate truncation to ≤4 decimals, request dedupe/caching — Nowcast included). Existing screens must keep passing their visual gates except where the new "sun behind clouds" state is deliberately introduced. Test determinism: sun e2e specs force `?_time=13:00` (server computes from wall clock); weather-state specs must mock the weather boundary equally deterministically or they will be sky-flaky.

### Story 10.1: Cloud-Gated Sun State & Weather-Truth Fixes (Engine)

As a **user**,
I want the app's headline sun state to reflect the actual sky, not just sun position and building shadows,
So that the app never tells me a terrace is in full sun while it is raining.

**Acceptance Criteria:**

**Given** the sun engine (`lib/services/sun-engine.ts`) currently derives `currentSunStatus` from geometry alone
**When** effective cloud cover at the requested instant meets or exceeds a single named, documented threshold (tunable constant, proposed default ≥ 80)
**Then** the venue's headline state becomes a new weather-gated status (extend `VenueSunStatus` with a `CloudObscured` value) instead of `Sunny`/`Partial`, while `sunExposurePercent`, `sunWindow`, and `peakTime` keep their geometric clear-sky meaning unchanged, and the existing below-horizon precedence is preserved (`NoSun` still wins; the cloud gate applies only when the sun is geometrically up and the venue is geometrically sunlit)

**Given** `lib/weather/met-no-service.ts:85` currently defaults a missing `cloud_area_fraction` to `0` (clear sky)
**When** a timeseries entry lacks cloud data
**Then** the slice is treated as weather-unknown for gating (no gate applied, no fabricated clear sky), the response's freshness/uncertainty signals reflect the missing weather (existing `geometry-only` / `weather` uncertainty plumbing), and a unit test proves missing cloud data can never produce a "clear" gate input

**Given** `calcCloudCertainty` (`lib/solar/confidence-calculator.ts`) currently ignores `weather.cloudCover`, violating FR12
**When** the confidence blend is fixed
**Then** cloud amount genuinely lowers displayed confidence (documented formula — e.g. certainty falls as cover rises toward total overcast), the geometry-only (no-weather) path is byte-identical to today, and a red-first unit test proves 100% cloud cover yields materially lower confidence than 0% with otherwise identical inputs

**Given** the DTO contract changes (`VenueSunStatus` union gains a value)
**When** the new status ships
**Then** every consumer of `currentSunStatus` is swept and handles the new value (API sanitizer/`normalizeVenueForResponse`, `lib/types/api.ts`, fixtures, `FeedbackFlow` predicted-state, list/pin/card switch statements — rendering may be a placeholder until Story 10.2), the venues-route contract tests cover it, and the sun-compute cache (15-min bucket) demonstrably caches the gated outcome with its weather slice so cached buckets stay internally consistent

**Design Gate Criteria (backend/engine — no new screen of its own):** No intentional visual change in this story (Story 10.2 owns the UI); existing gate states pass unchanged on the clear-sky path. The acceptance signal is the test suite: overcast → gated status, missing-cloud → no fabricated clear, cloud cover → confidence drop, all red-first.

### Story 10.2: "Sun Behind Clouds" Two-Signal UI State

As a **user**,
I want to see at a glance that the sun is behind clouds right now — while still seeing which terraces have the best sun position when it clears,
So that the app is honest about the sky and still uniquely useful on a grey day.

**Acceptance Criteria:**

**Given** a venue whose engine state is the new cloud-gated status
**When** it renders anywhere — map pin (`VenuePin`/`VenuePinLayer`), venue card (`VenueCard`), quick-info (`VenueQuickInfo`), detail (`VenueDetailContent`), list (`VenueList`)
**Then** the headline presentation is a muted/cloud state ("Sol bakom moln" / "Sun behind clouds") that is visually unmistakable from BOTH the amber sunny state AND the grey shaded state (a fourth visual state: Sunny / Partial / Shaded / Obscured), and no surface shows "FULL SOL"/"DELVIS SOL" or an amber sun badge while the gate is active

**Given** the two-signal model preserves the geometric layer
**When** a cloud-gated venue renders its details
**Then** the geometric potential remains visible and clearly labelled as position-not-weather (e.g. "Solläge 100% · sol här när det klarnar" — final copy at design discretion), the sun-window timeline keeps rendering as clear-sky potential, and list ranking ("Mest sol") continues to rank by geometric solläge so venue comparison still works under an overcast sky

**Given** the serialized-but-never-rendered `skyCondition` field
**When** the UI state ships
**Then** the current sky condition is surfaced on at least the venue detail/quick-info surface (clear / partly cloudy / overcast — plain-language copy, no geodata or meteorology internals per Story 3.0.6), with `sv`/`en` message parity and the new keys added to both locales

**Given** accessibility and honest labelling requirements (Epic 9 lessons)
**When** the new state renders
**Then** each surface's accessible name includes the obscured state exactly once (no duplicated or orphaned phrases), the muted palette meets WCAG AA contrast (the axe CI gate stays green), and the state change is covered by component tests across all four visual states

**Design Gate Criteria:**
- **Visual:** The Obscured state on pin + card + quick-info + detail is distinct from Sunny/Partial/Shaded at a glance; muted palette matches the design-token system (no ad-hoc hexes)
- **Behaviour:** Gate active → no FULL SOL/amber anywhere; geometric potential labelled as position; sorting still works; clear-sky venues unchanged
- **Animation:** Existing pin/card transitions unchanged; no flash when a venue crosses the gate on refresh
- **Visual validation:** Screenshot comparison of an overcast-state card + pin + detail (mobile & desktop, forced via mocked weather) against references passes before QA handoff

### Story 10.3: Layered Cloud Detail (Met.no `complete` Endpoint + Effective Cover)

As a **user**,
I want thin high haze treated differently from a blocking low cloud deck,
So that the app doesn't cry "no sun" under cirrus you can feel the sun through.

**Acceptance Criteria:**

**Given** `lib/weather/met-no-service.ts` currently calls the `compact` Locationforecast endpoint
**When** it switches to the `complete` endpoint (same API, same TOS posture, same coordinate truncation and caching)
**Then** `WeatherSlice` additionally carries `cloud_area_fraction_low`/`_medium`/`_high` (and the total retained), and the fetch/dedupe/revalidate behaviour is otherwise unchanged

**Given** the three-layer split is available
**When** effective cloud cover is computed for the Story 10.1 gate and the FR12 confidence blend
**Then** a documented, named-constant weighting makes low/medium cloud dominate and high cloud contribute only weakly (thin cirrus ≠ blocking stratus; exact formula is the story's design decision, recorded with rationale), and unit tests pin the formula's boundary behaviour (e.g. 100% high-only must NOT trip the gate; 100% low must)

**Given** the split fields may be absent for some timeseries entries
**When** any layer field is missing
**Then** the computation falls back to the total `cloud_area_fraction` (Tier 0 behaviour) — and per Story 10.1's rule, a missing total still means weather-unknown, never clear

**Design Gate Criteria (backend/data — no new screen):** No visual change beyond gate-input accuracy; existing overcast/clear visual states from Story 10.2 pass unchanged. Acceptance signal is the formula's unit-test matrix.

### Story 10.4: Rain-Now Signal (Met.no Nowcast 2.0)

As a **user**,
I want the app to know it is raining right now,
So that a terrace is never presented as a sun destination during active rain.

**Acceptance Criteria:**

**Given** Met.no Nowcast 2.0 provides radar-based ~5-minute precipitation for the Nordics
**When** a nowcast client is added to `lib/weather` (TOS-compliant User-Agent, ≤4-decimal coordinates, per-coordinate dedupe + short-TTL caching consistent with the 5-min product cadence, graceful `[]`/null degradation on failure — mirroring the forecast client's posture)
**Then** the engine can obtain "precipitation rate at this coordinate now" for near-now requests, and a nowcast outage degrades silently to Tier 0/1 behaviour (never a throw, never a 500, no fabricated values)

**Given** active precipitation (rate above zero) at the requested near-now instant
**When** the headline state is derived
**Then** the venue is cloud-gated regardless of the cloud-fraction value (rain wins), and the surfaced sky condition reflects rain in plain language

**Given** the hard constraint that **absence of rain must NEVER imply sun**
**When** the nowcast reports no precipitation
**Then** the no-rain result contributes NOTHING positive to the sun state — sun position, building shadows, and (effective) cloud cover still fully decide the outcome — and a dedicated red-first unit test proves a no-rain + overcast + geometrically-sunlit venue is still cloud-gated, plus a test that no-rain + clear + geometrically-shaded is still Shaded

**Given** the planner allows future date/time selection
**When** `requestedAt` is beyond the nowcast's short horizon (or on a future day)
**Then** the nowcast signal is not consulted (forecast cloud data governs, as in Tiers 0/1), so future planning never mixes in a stale "now" radar reading

**Design Gate Criteria (backend/data — no new screen):** No new UI surface (rain reuses the Story 10.2 obscured presentation + sky-condition copy). Acceptance signal: the constraint tests above + engine tests proving rain forces the gate and nowcast failure changes nothing.

### Story 10.5: Weather-Reality Verification Pass & Regression Guards

As a **maintainer**,
I want the weather-gated display verified against the real sky and protected by deterministic regression tests,
So that "the app said sunny while it rained" can never silently return.

**Acceptance Criteria:**

**Given** the full Tier 0+1+2 stack is implemented
**When** a deterministic e2e matrix runs with the weather boundary mocked (overcast ≥ threshold, clear, high-cirrus-only, active rain, weather-missing) at a forced `?_time=`
**Then** each scenario asserts the correct card + pin + detail presentation (obscured / sunny / sunny-under-cirrus / obscured-rain / ungated-with-uncertainty respectively), and the suite is wall-clock- and sky-independent (no live Met.no calls in CI)

**Given** the live app and a real grey-or-clear day
**When** a manual reality spot-check is performed against the live site and the raw Met.no responses for central Gothenburg
**Then** the displayed states match the observable sky and the fetched cloud/precipitation values, with the outcome recorded in the story record (screenshots + fetched values), and any mismatch triaged to a root cause before the epic closes

**Given** the About page explains predictions and cites accuracy
**When** the two-signal model ships
**Then** the About copy still truthfully describes the model (geometry + weather now genuinely blended per FR12) with `sv`/`en` parity, updated if any claim became stale

**Given** the historical failure mode (weather fetched but not consumed)
**When** regression guards are added
**Then** they cover at least: 100% cloud can never render FULL SOL on any surface; missing cloud data never renders as clear; confidence at 100% cloud < confidence at 0% cloud; rain forces the obscured state; no-rain changes nothing; and the geometric fields (`sunExposurePercent`, `sunWindow`) remain byte-identical across weather variations for the same geometry and instant

**Design Gate Criteria (verification story):** No new UI of its own; the gate is the mocked-weather e2e matrix green in CI, the recorded live spot-check, and all Story 10.2 visual references passing at both breakpoints.

## Epic 11: "Feels Instant, Reads Clear" — Time-Scrub Performance, Mobile Interaction & Surface Polish

Post-Epic-10 live testing (desktop + real mobile) surfaced a batch of interaction defects, a critical time-change performance gap (~9.6 s per planner change), and surface-polish drift against the design reference. This epic makes the time planner instant, makes mobile a first-class interactive citizen (slider drag, tag filtering, bottom sheet), and aligns the quick-info / detail / map surfaces with the reference — plus finally schedules the three-epics-deferred maintenance debt.

> **Added 2026-07-04 (party-mode UX workshop + code triage).** Source: maintainer live-app field test at sunnyseat.vercel.app with annotated screenshots + a network capture, investigated against the code. Root causes, so stories are drafted against the real cause, not the surface symptom:
> 1. **The slider's decorative thumb eats pointer events.** `TimeSlider.tsx` renders the visual thumb `div` (and the topPanel time badge) absolutely positioned ON TOP of the invisible `<input type="range">`, without `pointer-events-none`. Dragging from the track hits the input and works; grabbing the thumb itself (the universal instinct, and where a mobile finger always lands) hits the decoration and does nothing. This one omission explains "drag sometimes works", "only tiny drags", and "mobile never drags". (Story 11.2)
> 2. **Time is still wired into the query key per-step.** Every slider `onChange` feeds `selectedMinutes` → `TimeContext` → the TanStack query key; Story 9.4's `useDeferredValue` only dampens the storm (network capture: dozens of cancelled `venues?lat=…` per drag), and the surviving request costs ~9–14 s because the engine computes per-request per-time. (Stories 11.1, 11.2)
> 3. **The engine already walks the whole day per venue** (the detail route's `timeline`), but the list route discards everything except the requested instant — so every scrub re-buys the same computation. (Story 11.1)
> 4. **Map dullness is self-inflicted:** `MapContainer.tsx` layers a `bg-surface-sand/80` div (z-1) plus a `gradient-map-overlay` amber wash (z-2) over the basemap. (Story 11.5)
> 5. **Mobile has no tag-filter UI at all** — the data-driven chips (Story 9.7) render only in `DesktopNavBar.tsx`, and there they hard-clip when the viewport can't fit the row. (Story 11.3)
> 6. **The detail view's "malformed first paint"** is the list-DTO fallback venue rendering with detail-only fields missing before the detail DTO streams in — not a missing skeleton, a wrong-data-first render. (Story 11.6)
>
> **Maintainer decisions (2026-07-04 workshop):** Mobile tag selection = **scrollable chip row in the bottom-sheet header** under the sort toggles (over a filter-button sheet or top-bar chips). Perf approach = **client-side day-series**: the list API returns each venue's full-day sun series so time-scrubbing is a zero-network client lookup; date/location changes are the only fetches. Map treatment = **light warm tint** (~quarter of today's overlay strength), not raw basemap. Maintenance debt = **fold into one Epic 11 hygiene story** (Epic 8 A2/A3 now three epics deferred; retro A7 said stop re-deferring). Quick-info content: remove the "Säkerhet: NN%" text (accepting that confidence becomes detail-view-only — noting it is a *different* number from the thumbnail's "% SOL") and the "Sol HH:mm–HH:mm" window; show real opening hours instead; VISA RUTT loses the truncated "ca 16…" ETA text. Venue detail: remove the "Soltider idag" section entirely (the time planner is the one way to explore times). Planner rules: dates selectable only today→today+3; on "Idag" the slider cannot go earlier than the current time.
>
> **Deferred-item intake from Epic 10 close-out:** the orphaned `toSunStatusToken` mapper (wire in or remove) and Epic 8's A2 (`vercel.json` lightningcss swallow) + A3 (`.gitattributes` EOL normalization) are absorbed into Story 11.7; the consolidated reference-PNG rebaseline rides the same story as a maintainer-blessed checkpoint. The untested cirrus-vs-clear e2e presentation gap stays backlog (engine-guarded).

### Story 11.1: Client-Side Day-Series — Instant Time Scrubbing & Fast Date Switch

As a **user**,
I want changing the planner time to update the map instantly and changing the date to take a couple of seconds at most,
So that exploring "when is it sunny where" feels effortless instead of a 10-second stall.

**Acceptance Criteria:**

**Given** `/api/venues` currently returns sun state for a single requested instant
**When** the list response is extended with a per-venue day-series — one entry per planner step (`PLANNER_STEP_MINUTES`) across the planner range, each carrying at least `sunExposurePercent` and the weather-gated `currentSunStatus` (reusing the engine's existing timeline walk; the Epic 10 cloud/rain gates apply per-step, never only to "now")
**Then** the client derives marker %, pin state, quick-info figures, list ordering ("Mest sol"), and the obscured presentation for ANY planner time from the cached series — and a settled time change issues **zero** network requests

**Given** the day-series is computed server-side
**When** caching is added
**Then** the per-(venue, date, weather-refresh-bucket) series is cached in `sun-engine-cache.ts` alongside the existing weather/building caches so repeat requests within a bucket are near-free, and the response stays CDN/ETag-friendly (measure and record payload size; ~50 venues × ~64 steps must stay reasonable gzipped)

**Given** the user changes the **date** (or the origin location changes materially)
**When** the single new request is in flight
**Then** existing venue markers are NOT unmounted/reloaded — the map dims under a subtle gray hue with a clear centered loading spinner overlay until the new series arrives, then markers update in place (keyed by venue id)

**Given** the live production deployment
**When** a date change is measured end-to-end (p95 over repeated trials)
**Then** it completes in **< 3 s** (stretch target < 1.5 s warm-cache), with before/after timings recorded in the story record, and time-scrubbing is measured at 0 requests

**Design Gate Criteria:**
- **Visual:** Gray-hue + spinner overlay matches the design system (token-based scrim, standard spinner); markers visually persist through a date change
- **Behaviour:** Time scrub updates pins/list/quick-info instantly offline-from-network; date change fires exactly one request
- **Animation:** Marker % transitions during scrub are smooth (no flash/remount); overlay fades in/out per motion spec
- **Visual validation:** Screenshot of the date-change loading state (dimmed map + spinner) passes before QA handoff

### Story 11.2: Time-Slider Drag Fix & Planner Range Rules

As a **user**,
I want to grab the slider thumb and drag it smoothly on both desktop and mobile,
So that picking a time feels like using a native control instead of fighting one.

**Acceptance Criteria:**

**Given** the decorative thumb `div` and the topPanel value badge in `TimeSlider.tsx` sit above the invisible range input without `pointer-events-none`
**When** the hit-testing is fixed (decoration made `pointer-events-none`, input remains the sole pointer target with an adequate touch height)
**Then** drag initiated ON the thumb works reliably with mouse AND touch, on desktop and mobile viewports — verified by touch-gesture e2e, not just click simulation

**Given** every `onChange` currently commits to `TimeContext` (and thus toward the query key)
**When** drag state is decoupled — the slider tracks a local visual value during drag and commits on release/keyboard-settle/blur (the existing `onSnap` seam)
**Then** during a drag the thumb, progress fill, and time badge follow the pointer at full frame rate while the app-level time commits at most once per gesture (and with Story 11.1, that commit triggers zero fetches)

**Given** the date picker (`DatePickerDialog`)
**When** dates render
**Then** only today through today+3 days are selectable; later (and past) dates are visibly disabled and unpickable, with the constraint enforced in state too (a forced/URL date outside the window clamps)

**Given** the selected date is today
**When** the slider renders
**Then** its effective minimum is the current wall-clock time (snapped to the planner step): earlier positions are unreachable by drag, tap, or keyboard, the elapsed track portion reads visually inert, and the minimum advances as the live clock ticks; for future dates the full planner range is available

**Design Gate Criteria:**
- **Visual:** Slider matches the reference `TopPanel` slider (thumb, badge, track) with the disabled/elapsed segment visually distinct
- **Behaviour:** Thumb-grab drag works on mobile + desktop; one commit per gesture; date cap + today-minimum enforced
- **Animation:** Thumb follows the pointer 1:1 during drag (no spring-lag on the grabbed thumb); badge tracks smoothly
- **Visual validation:** Screenshot of the slider (idle + today-clamped state) passes before QA handoff

### Story 11.3: Mobile Tag Filtering & Bottom-Sheet Overhaul (+ Desktop Chip Overflow)

As a **mobile user**,
I want to filter venues by tag right where the list lives and tuck the venue list fully away when I want the map,
So that filtering isn't desktop-only and the sheet never fights me.

**Acceptance Criteria:**

**Given** mobile currently has no tag-filter UI
**When** a horizontally scrollable tag-chip row is added to the `MobileBottomSheet` header, directly under the "Mest sol / Nära mig" sort toggles
**Then** the chips are the same data-driven set (`collectTags`, `localizeTag`) sharing the same filter context as desktop — toggling a chip filters the list AND the map pins identically on both breakpoints, with the reference "on" pill style and a clear empty state

**Given** the sheet currently snaps to peek (120px) / mid / full
**When** a fourth **collapsed** snap is added
**Then** the sheet can be dragged (or fast-swiped) down to a handle-only state (just the drag pill + safe-area visible), dragged back up through all snaps, and the map remains fully interactive behind it

**Given** the sheet drag feel is reported as janky
**When** the `@use-gesture` thresholds/rubberband and the snap animation are tuned (and the header chip row is made drag-compatible — horizontal chip scroll must not hijack vertical sheet drags)
**Then** drags track the finger 1:1, snap decisions respect both distance and velocity, and no gesture dead-zones remain — verified by touch e2e and a real-device pass (Story 11.8)

**Given** the desktop nav chip row currently hard-clips overflowing tags mid-chip
**When** the row is made horizontally scrollable with left/right arrow buttons and edge-fade affordances
**Then** all tags are reachable at any viewport width, arrows scroll by a page and disable at the ends, and the row remains keyboard-navigable

**Design Gate Criteria:**
- **Visual:** Sheet header (toggles + chip row) and desktop scrollable chip strip match the reference chip styling; collapsed sheet shows handle only
- **Behaviour:** Chips filter list + pins on both breakpoints; all four snaps reachable; horizontal chip scroll never triggers vertical sheet movement
- **Animation:** Sheet snap transitions stay on the existing spring spec; chip scroll is momentum-smooth
- **Visual validation:** Screenshots of (a) sheet with active chips, (b) collapsed sheet, (c) desktop chip strip mid-scroll pass before QA handoff

### Story 11.4: Venue Quick-Info Rework — Reference Alignment & Truthful Content

As a **user**,
I want the venue quick-info card to look polished and show me what I actually need (open now? how far? how sunny?),
So that the most-used surface earns trust at a glance.

**Acceptance Criteria:**

**Given** the quick-info card (`VenueQuickInfo.tsx`) on mobile and desktop
**When** the content is reworked
**Then** the "Säkerhet: NN%" text is removed on both breakpoints (confidence remains available in the detail view; the sr-only accessible confidence text may remain), the "Sol HH:mm–HH:mm" window line is removed, and real opening hours render in their place (e.g. "Öppet till 22:00") — which requires surfacing `openingHours` on the list DTO (`VenueDataDto`) from the existing `venues.opening_hours` column; venues without opening-hours data show nothing (never a fabricated value)

**Given** the route CTA currently squeezes a truncated ETA ("ca 16…") inside the button
**When** `RouteButton` consumers stop passing `estimateLabel` into the compact/quick-info button (the ETA may live on in the detail/route surface if already present)
**Then** the button reads only "VISA RUTT" (+ icon) at full legibility on both breakpoints, with no truncated text at any common width

**Given** the mobile card layout drifted from the reference
**When** it is aligned to the reference `QuickInfo.jsx` (spacing, type hierarchy, badge placement, CTA row) incorporating the removals above
**Then** the layout holds without overflow across sun states (full sun / partial / shaded / obscured "Sol bakom moln") and common mobile widths, and the obscured two-signal treatment (Story 10.2) is preserved

**Given** the card's accessible name embeds the removed content
**When** the rework lands
**Then** aria output is regenerated to essentials (name, sun %, opening hours, distance) with no orphaned separators or duplicated phrases, and unused i18n keys are pruned from `messages/{sv,en}`

**Design Gate Criteria:**
- **Visual:** Card matches the reference `QuickInfo` on both breakpoints with opening hours in place of the removed lines
- **Behaviour:** Heart/close/route/details actions work; opening hours reflect real venue data; no fabricated fields
- **Animation:** Card present/dismiss transitions unchanged
- **Visual validation:** Screenshot comparison (mobile + desktop, sunny + obscured states) against references passes before QA handoff

### Story 11.5: Map Legibility, Living Location Dot & True Recenter

As a **user**,
I want to actually read the map, instantly spot where I am, and have "center on me" put me in the visible middle,
So that the map feels like a navigation tool, not a background texture.

**Acceptance Criteria:**

**Given** `MapContainer.tsx` layers `bg-surface-sand/80` + `gradient-map-overlay` over the basemap
**When** the treatment is reduced to a light warm tint (~quarter of current strength — exact values via design-gate eyeball against the live map)
**Then** streets, water, parks, and labels are clearly legible at common zooms while a subtle warm brand tone remains, and pin/label contrast still passes the axe gate

**Given** the user-location dot (`UserPin.tsx`) is a small static marker
**When** it is upgraded
**Then** it renders noticeably larger with the design-token amber + white ring and a continuous soft **pulsing halo animation** (respecting `prefers-reduced-motion` with a static halo), clearly distinguishable from venue pins at all zooms

**Given** the recenter button flies to the raw GPS coordinate, which lands off-center of the *visible* map (bottom sheet / panels cover part of the viewport)
**When** recentering is made viewport-aware
**Then** `flyTo` applies padding/offset for the currently visible obstructions (bottom-sheet snap state on mobile, side/top panels on desktop) so the dot lands in the visual center of the unobscured map area

**Design Gate Criteria:**
- **Visual:** Map reads clearly with the light tint; location dot matches the reference `UserPin` scaled up with halo
- **Behaviour:** Recenter lands the dot centered in the visible map area at every sheet snap state
- **Animation:** Halo pulse is smooth and subtle (and static under reduced motion); flyTo remains 500 ms spec
- **Visual validation:** Screenshots of (a) the de-dulled map, (b) the animated dot, (c) post-recenter framing pass before QA handoff

### Story 11.6: Venue Detail — Clean First Paint & Content Polish

As a **user**,
I want the venue detail to open smoothly into a complete, tidy view,
So that "Mer info" never flashes a broken-looking half-render.

**Acceptance Criteria:**

**Given** the detail currently renders the list-DTO fallback venue first (detail-only fields missing → malformed layout) before the detail DTO streams in
**When** the loading strategy is fixed
**Then** fields present in the fallback render immediately and every detail-only region renders a proper skeleton until real data arrives — at no frame does a malformed/empty-value layout appear, and the fallback→detail swap causes no layout jump

**Given** the "Soltider idag" section (day timeline strip)
**When** the detail renders
**Then** the section is removed entirely on both breakpoints (the time planner is the canonical way to explore times), with no orphaned spacing, and the now-unused `VenueTimeline` rendering path + i18n keys are pruned (the engine's timeline computation itself stays — Story 11.1 consumes it)

**Given** the "Omdömen" section
**When** it renders with and without reviews
**Then** the section content is centered per the reference, and the empty state shows exactly ONE "Inga omdömen" message (the duplicate is removed)

**Design Gate Criteria:**
- **Visual:** Detail view matches the reference `VenueDetail` minus the removed section; skeleton states look intentional
- **Behaviour:** No malformed pre-load frame; reviews empty state single-messaged; all remaining fields real
- **Animation:** Detail open transition unchanged; skeleton→content swap is flicker-free
- **Visual validation:** Screenshots of (a) loading skeleton state, (b) loaded detail, (c) empty-reviews state pass before QA handoff

### Story 11.7: Hygiene — Three-Epics-Deferred Debt Finally Scheduled

As a **maintainer**,
I want the repeatedly-deferred build/config debt closed and dead code resolved,
So that every future epic stops paying interest on it.

**Acceptance Criteria:**

**Given** Epic 8's A2 (`vercel.json` build command swallows lightningcss failures) and A3 (missing `.gitattributes` EOL normalization — the direct cause of Epic 10's `confidence-calculator.ts` EOL-churn review round)
**When** they are fixed
**Then** the build fails loudly on a real lightningcss error, and a `.gitattributes` enforcing LF for source files lands with a one-time renormalization commit (`git add --renormalize`) kept separate from any functional change

**Given** the orphaned `toSunStatusToken` shared mapper (dead code with a misleading "single source of truth" comment; every surface branches inline)
**When** it is resolved
**Then** either all sun-status surfaces are refactored to consume it, or it is deleted and the comment corrected — no half-state remains

**Given** the consolidated reference-PNG rebaseline (Epic 9's list + Epic 10's obscured-state screens + every surface Epic 11 touches)
**When** Epic 11's visual changes have landed
**Then** the rebaseline set is prepared and presented as a **maintainer-blessed checkpoint** (dev agents remain structurally forbidden from self-blessing references), and the blessed set is committed

**Design Gate Criteria (hygiene — no new screen):** No visual change from A2/A3/mapper work (byte-identical UI); the rebaseline checkpoint is itself the visual gate for this story.

### Story 11.8: Live Verification Pass, Touch-Gesture Coverage & Perf Regression Guards

As a **maintainer**,
I want every Epic 11 fix verified on the live deployment and on a real device, with the interaction and performance wins locked in by tests,
So that the "shipped but insufficient" pattern of Epics 9/10 (caching + debounce landed, symptoms persisted) cannot repeat.

**Acceptance Criteria:**

**Given** the historical gap — visual gates ignore sizing/spacing and emulated viewports miss real gesture physics
**When** the verification pass runs
**Then** it includes BOTH a Playwright mobile-profile sweep AND a real-device (physical phone) checklist over every Epic 11 surface — slider thumb-drag, sheet 4-snap drag + chip row, quick-info states, map tint/dot/recenter, detail first paint — with results (including screenshots) recorded in the story record and any gap triaged before the epic closes

**Given** the interaction fixes need durable protection
**When** regression tests are added
**Then** they cover at least: touch-drag ON the slider thumb changes time (real touch events); a full drag gesture commits time exactly once; time scrub issues zero venue requests and a date change exactly one; markers persist (no unmount) across a date change; the today-minimum and today+3 cap; sheet reaches all four snaps by gesture; chip toggling filters pins + list on mobile; and the quick-info renders no "Säkerhet"/sun-window text

**Given** the performance goal is the epic's headline
**When** perf is gated
**Then** a repeatable measurement against the LIVE deployment records date-change p95 < 3 s and time-scrub = 0 network requests, stored in the story record with the methodology, and a CI-runnable variant guards the request-count invariants (wall-clock perf measured live, counts guarded in CI)

**Design Gate Criteria (verification story):** No new UI of its own; the gate is all other Epic 11 stories' visual references passing at both breakpoints, the real-device checklist recorded, and the regression + request-count suites green in CI.

### Story 11.9: Venue Data Model Cleanup — IDs, Per-Weekday Hours, Dead-Field Removal

_Context (folded from the dissolved single-story Epic 12 draft, 2026-07-06):_

Authoring a real venue currently means hand-picking a text `id`, writing a
pre-localized `opening_hours.display` string, and filling `peak_time` +
`shadow_warning_minutes` — three of which are redundant, dishonest, or unused. This
story simplifies `public.venues` end-to-end (Supabase migration + store adapter + DTO
+ display + i18n + seed + the data-load template) so venue data is easy to author and
carries only fields the app actually uses truthfully. The app is LIVE on the Supabase
real-data path; the migration is manual, idempotent, reviewed, and must preserve the
RLS posture and the `test-venue-sunny` gate venue.

> **Source (2026-07-06):** maintainer review of the `nextjs-app/docs/venue-data-load.md`
> template against the live schema and code. Findings that ground the story against
> the real cause:
> 1. **`id` is a manually-assigned text PRIMARY KEY** (seed rows "1".."7"), and
>    `reviews.venue_id` / `feedback.venue_id` reference it as free-text while `slug`
>    is the real URL key — so authors shouldn't have to invent an id, but changing the
>    PK has cross-table identifier impact. **Maintainer decision (2026-07-06): keep the
>    `text` PK (no identity/serial migration) and make it auto-assigning.** (Story 11.9, AC1)
> 2. **`opening_hours` is a single `{display, closesAt}` jsonb** with a pre-localized
>    `display` string; real hours vary by weekday, and the display line + "ÖPPET"
>    badge should be *derived* at render time, not stored. (AC2)
> 3. **`peak_time` is redundant** — the real engine already computes `peakTime` live
>    from the sun timeline (`sun-engine.ts` `peakTimeFromTimeline`); the stored column
>    only feeds the legacy fixture path. (AC3)
> 4. **`shadow_warning_minutes` is dead** — carried store→DTO
>    (`VenueDetailDto.shadowWarningMinutes`) but rendered nowhere in the UI (tests
>    only). (AC4)
>
> **Scope note:** the server-only `seating_area` / `seating_elevation_m` /
> `ground_elevation_m` columns are OUT of scope and stay untouched (never serialized).

As a **maintainer adding real venues (and the user reading them)**,
I want the venue data model to auto-handle ids, carry honest per-weekday opening
hours, and drop redundant/unused fields,
So that authoring a venue is simple and the app only ever shows fields it can stand behind.

**Acceptance Criteria:**

**Given** `id` is a manually-assigned text PRIMARY KEY that `reviews.venue_id` and
`feedback.venue_id` reference as free-text (seed rows "1".."7"), while `slug` is the
real URL key
**When** the id strategy is implemented per the MAINTAINER DECISION (2026-07-06):
**keep the `text` PRIMARY KEY** — do NOT migrate to an identity/serial PK — so the
existing free-text `reviews.venue_id` / `feedback.venue_id` joins stay compatible; the
column is made auto-assigning so a data author no longer hand-picks an id (add a DB
default that generates a `text` id on insert; the story/architect picks the exact
mechanism — e.g. a sequence-backed `text` default — preserving the seed rows "1".."7")
**Then** inserting a real venue requires no manually chosen id, the `text` PK and the
review/feedback joins are preserved, the `test-venue-sunny` gate venue is unchanged,
and the chosen mechanism is reflected in the migration and the data-load template

**Given** `opening_hours` is a single `{display, closesAt}` jsonb with a pre-localized
`display` string
**When** it is replaced with a per-weekday structure carrying opens/closes for all 7
weekdays (shape proposed in the story context; closed days and past-midnight closing
handled), and the stored `display` string is removed
**Then** the "Öppet till HH:MM" quick-info line and the "ÖPPET · {time}" detail badge
are DERIVED at render time from the structured data + locale + current weekday
(Europe/Stockholm, sv default) via a new formatter + i18n keys, and a venue with no
hours for today renders nothing (never a fabricated closing time)

**Given** `peak_time` is stored but the real engine already computes `peakTime` live
from the sun timeline
**When** the `peak_time` column and its store→DTO passthrough are removed
**Then** the real-engine `peakTime` (timeline-derived) path is unchanged and no
surface loses a real value

**Given** `shadow_warning_minutes` is carried store→DTO but rendered nowhere in the UI
**When** its original intent is documented and it is dropped end-to-end (column, store
field, `VenueDetailDto.shadowWarningMinutes`, and the tests that assert it) — unless
the story surfaces a real consumer
**Then** no reader of the field remains (verified by grep across
`opening_hours`/`openingHours`/`peak_time`/`peakTime`/`shadow_warning_minutes`/
`shadowWarningMinutes` before removal)

**Given** `nextjs-app/docs/venue-data-load.md` is the canonical "add a real venue"
guide
**When** the model changes above land
**Then** the doc is rewritten to match: the `id` row reflects AC1, the `opening_hours`
row + the "What to send (one venue)" JSON example use the new per-weekday shape, and
`peak_time` + `shadow_warning_minutes` are removed — leaving a correct,
copy-pasteable template

**Given** the app is LIVE on the Supabase real-data path
**When** the migration is authored
**Then** it is idempotent, keeps RLS enabled + the `venues_service_read` service-role-
only policy, leaves the server-only `seating_*` / `ground_*` columns untouched,
updates the 7-venue seed to the new shape (byte-compatible on the values the
`test-venue-sunny` gate asserts), and is applied to the live DB as a reviewed step

**Design Gate Criteria:**
- **Visual:** The derived "Öppet till HH:MM" (quick-info) and "ÖPPET · {time}" detail
  badge match the current visual treatment on mobile + desktop; no closing time is
  shown when the venue has no hours today
- **Behaviour:** The opening-hours line reflects the CURRENT weekday; closed-today and
  past-midnight cases render honestly; venues without opening hours omit the line/badge
  entirely
- **Animation:** No regression to the fallback→detail badge swap (same footprint, no
  layout jump)
- **Visual validation:** Screenshot comparison of the venue detail (mobile + desktop)
  and the quick-info card against the current baseline passes before QA handoff — no
  proportion/centering regression in the opening-hours row or the ÖPPET badge

---

## Epic 12 (Backlog): "Real-Venue Launch Readiness" — Perf, Trust, Hours & Console Hygiene

**Status: backlog — not scheduled.** Opened 2026-07-07 during the real-venue data
load and grown 2026-07-08 as first production contact with the 42-venue set surfaced
the work that stands between "data is live" and "ready to launch publicly". Activate
via sprint-planning when prioritized. (Note: this is a NEW Epic 12 — the earlier
single-story Epic 12 draft was dissolved into Story 11.9 on 2026-07-06 and no longer
exists.)

Recommended sequence (most-blocking first): **12.3** (cold-start perf freeze — the
app is unusable cold at 42-venue scale) → **12.13 + 12.6** (drop the confidence number
and simplify pins — they change what 12.2/12.8 need to say) → **12.7** (reviews-404) →
**12.4** (console hygiene) → **12.2** (feedback-driven accuracy loop + retire the now-
pointless `SUNNYSEAT_COVERAGE_CAP` flag — NO longer a display re-cap or a hard launch
gate; see the reframed story) → **12.1** (Places hours-sync). Stories:
- **12.1** — Google Places opening-hours sync, **weekly scheduled** (consumer of the
  `place_id` / `places_api_url` columns; migration `venues_add_google_places_columns`).
- **12.2** — *reframed:* feedback→accuracy loop (find & fix wrong sun-% venues) + remove
  the coverage-cap bypass flag (confidence is internal-only after 12.13, so nothing
  user-facing depends on it).
- **12.3** — day-series compute at real-venue scale (kill the cold-start freeze).
- **12.4** — production console hygiene (React #418 hydration + MapLibre null warning).
- **12.5** — dev/localhost-only venue editor (drag pin = display-only lat/lng, paste
  polygon, persisted hide/show, inline tags/description/thumbnail-URL).
- **12.6** — simplify map pins: one grey "not sunny" pin, no number, amber >50% sunlit.
- **12.7** — reviews-404 fix (reviews route resolves live venues, not fixture-only).
- **12.8** — About page: pin legend + "how the sun figure works / feedback loop" (NO
  per-venue Säkerhet number — reframed for 12.13).
- **12.9** — mobile bottom-sheet & time-slider polish (drag-gap, collapse, slim slider).
- **12.10** — venue detail preload (instant "mer info" via ~10 km prefetch).
- **12.11** — first-run coach-mark guide (map legend + feature tour, re-open from Settings).
- **12.12** — venue photos: Supabase Storage hosting + render/fallback fixes.
- **12.13** — remove the user-facing confidence indicator (keep confidence internal-only).
- **12.14** — hide closed venues from map/list at the selected time (future planner time
  when they're open re-shows them).

**Epic 12 stays ONE epic (14 stories) — maintainer confirmed 2026-07-08.** It bundles
launch-critical work (12.3 perf, 12.7 reviews-404, 12.2 verification) and UX polish; the
maintainer explicitly wants it kept together, not split.

The 2026-07-07 load replaced the 7 fixture venues with 42 real Göteborg venues whose
`opening_hours` were hand-collected — they will silently drift as venues change
their hours. The same load captured a Google Places **place ID** for every venue
(41 in the source JSON; `cielo`'s backfilled the same day), which exposes the
authoritative `regularOpeningHours` resource via the Places API v1. Story 12.1 replaces hand-maintained hours with a periodic sync from
Places while keeping the Story 11.9 render-time derivation contract byte-compatible.

### Story 12.1: Google Places Opening-Hours Sync (Weekly Scheduled — Replace Hand-Maintained Hours)

> **Maintainer decision (2026-07-08):** this runs as a **weekly scheduled job**, NOT
> a runtime lookup. The request path (`/api/venues`) makes **zero** Google Places
> calls — it only ever reads the already-synced `venues.opening_hours` column, so the
> sync never adds latency to a user request (it is orthogonal to the Story-12.3 cold
> start; it only touches Places once a week, offline).

As a **maintainer (and a user reading venue hours)**,
I want `venues.opening_hours` refreshed automatically from each venue's Google
Places `regularOpeningHours`,
So that the ÖPPET badge and the derived "Öppet till HH:MM" line reflect the venue's
real, current hours instead of hand-collected values that drift.

**Acceptance Criteria:**

**Given** venues carry optional `place_id` / `places_api_url` (2026-07-07: all 42
set; `brasserie-voyage` + `voyage-vasaplatsen` deliberately share one place because
they are two seating areas of the same establishment)
**When** a **scheduled** sync (the PRIMARY deliverable — a weekly automatic job, e.g. a
GitHub Action per `nextjs-app/docs/github-actions-scheduled-jobs.md` or a Vercel cron
route; an on-demand maintainer trigger is an OPTIONAL extra, never the only vehicle —
hours must refresh without anyone remembering to run it) fetches Place Details with a
field mask restricted to `regularOpeningHours`, authenticated by a server-only Google
Maps Platform API key (deployment env var; never `NEXT_PUBLIC_*`, never committed)
**Then** each fetched venue's `opening_hours` jsonb is rewritten in the Story 11.9
per-weekday shape — ISO keys `"1"` (Mon) … `"7"` (Sun) mapped from Places
`periods[]` (Places `day` is 0=Sunday…6=Saturday), `"HH:MM"` 24h times, a weekday
with no period stored as `null` (closed), a past-midnight period collapsing to
`close < open` on the OPENING weekday — and venues without a `place_id` are skipped,
keeping their hand-authored hours untouched

**Given** Places can return MULTIPLE `periods[]` for one weekday (e.g. lunch 11–14 +
dinner 17–23), but the Story 11.9 `WeeklyOpeningHours` / `coerceOpeningHours` contract
accepts only ONE `{ open, close }` per weekday key
**When** a weekday has split periods
**Then** 12.1 makes **NO contract change** — split-hours venues are simply **OUT OF SCOPE
for auto-sync**. A venue with ANY split weekday is **SKIPPED WHOLESALE** for the sync and
REPORTED for manual handling (kept on its existing hand-authored hours), never written as
`null`/missing (both = closed in the contract → Story 12.14 would then HIDE a genuinely-open
venue all day) and never collapsed to an outer envelope (11–14 + 17–23 → 11–23 fabricates the
14–17 gap). To avoid a venue that was previously synced CLEANLY later going stale when a day
splits, the sync tracks per-venue sync provenance and FLAGS such a venue for manual review
rather than trusting the old single interval. Truthfully auto-syncing split venues REQUIRES
the multi-interval `WeeklyOpeningHours` extension — a real DTO/formatter/filter **contract
change that is a SEPARATE prerequisite story, explicitly NOT part of 12.1** (which is exactly
why 12.1 can claim "no contract change" below)

**Given** the Places API has quota and per-field-mask billing
**When** the sync runs
**Then** it requests ONLY the opening-hours field (field mask keeps the billed SKU
minimal), runs on a **weekly** schedule (a cron/GitHub Action — hours change rarely;
NEVER on the user request path), handles per-venue fetch failures without aborting
the batch (the venue keeps its last-known hours; never a partial or fabricated write),
validates every write against the same weekday/`HH:MM` contract the store's
`coerceOpeningHours` enforces, and produces a per-venue outcome summary the maintainer
can inspect (42 venues × 1 field, once a week ≈ negligible quota)

**Given** the app derives the ÖPPET badge + "Öppet till HH:MM" line at render time
from `venues.opening_hours` (Story 11.9) and never stores display strings
**When** the sync lands
**Then** there is NO DTO, formatter, or UI change: the per-weekday contract (missing
key/`null` = closed; `close < open` = past-midnight) is unchanged — this holds precisely
BECAUSE split-hours venues are skipped wholesale (above), not represented via a new sentinel
or multi-interval shape (that contract-changing extension is a separate prerequisite story);
and Places `specialHours` / holiday exceptions are explicitly OUT of scope (documented in the
story file; weekly `regularOpeningHours` remain the only synced source)

**Given** `nextjs-app/docs/venue-data-load.md` is the canonical venue-authoring guide
**When** the sync ships
**Then** the doc's `opening_hours` + `place_id` rows are updated to state that hours
auto-sync for venues with a `place_id` (hand-authored hours remain the
fallback/override for venues without one), including how to run and inspect the sync

**Design Gate Criteria:**
- **Visual:** No visual change — the ÖPPET badge and "Öppet till HH:MM" line keep
  their current treatment; only the underlying data freshens
- **Behaviour:** Synced closed-today (`null`) and past-midnight (`close < open`)
  shapes render exactly as their hand-authored equivalents do today
- **Animation:** None (no UI surface change)
- **Visual validation:** Screenshot comparison of venue detail + quick-info against
  the current baseline passes — a data-only story must not move pixels

### Story 12.2: Feedback-Driven Accuracy Loop + Retire the Coverage-Cap Bypass

_Context (2026-07-08, REFRAMED after the Story-12.13 decision to remove the
user-facing confidence indicator):_ this story was originally "verify predictions →
show earned high confidence to users, then re-enable the cap." **Story 12.13 removes
the confidence number from the user UI entirely**, which changes 12.2's premise:
there is no longer a displayed confidence to gate, so the whole
`SUNNYSEAT_COVERAGE_CAP` machinery has **no user-facing effect** and the "re-cap for
display" goal is moot. What REMAINS valuable is the field-verification itself — the
maintainer walking the venues and the live `feedback` table (`predicted_state`,
`sun_accuracy`, `note`, timestamp) — but repurposed toward its real payoff: **finding
and fixing wrong sun-% predictions**, and cleaning up the temporary flag. This is no
longer a hard launch gate (nothing user-facing depends on it), but it's the mechanism
that makes the sun figure trustworthy over time.

As a **maintainer improving prediction accuracy**,
I want the walk/feedback evidence aggregated into per-venue/per-area accuracy so I can
find and fix the venues whose sun figure is wrong, and I want the now-pointless cap
bypass removed,
So that the sun percentage users see keeps getting more correct, and there's no dead
verification-era flag lying around.

**Acceptance Criteria:**

**Given** the accuracy loop needs live `feedback` rows for the 42 real venues, but the
`/api/venues/[slug]/feedback` POST route resolves the path slug against `VENUE_FIXTURE`
(the SAME fixture-only bug as reviews — it imports `VENUE_FIXTURE`, no `getVenueBySlug`)
**When** this story is scheduled
**Then** it DEPENDS ON the Story-12.7 live id/slug resolver being applied to the feedback
POST route too (otherwise real-venue feedback 404s and the aggregation has zero evidence)
— this dependency is called out explicitly so 12.2 is not started before feedback can be
submitted for live venues

**Given** the live `feedback` table accumulates `predicted_state` vs observed
`sun_accuracy` (+ `note`) per venue, but the two use DIFFERENT vocabularies
(`predicted_state` ∈ Sunny/Partial/Shaded/NoSun/CloudObscured vs `sun_accuracy` ∈
sunny/not_sunny/unsure), and Story 12.6 moves "sunny" to the >50%-sunlit &
not-weather-gated boundary
**When** the aggregation (a SQL view / script) computes per-venue and per-area
**agreement rate**
**Then** it uses an EXPLICIT mapping, not a raw string compare: a prediction counts as
"sunny" iff it matches the 12.6 rule (>50% sunlit AND not gated — i.e. the amber-pin
condition, NOT "any Partial"), compared against `sun_accuracy` sunny/not_sunny; `unsure`
feedback is handled by a stated policy (excluded from the rate, or reported separately) —
so 35–50% and Partial/cloudy cases don't silently skew the ranked list

**Given** that >50% mapping is NOT recoverable from what feedback stores today — the
contract persists only `predicted_state` (Sunny/Partial/…) + `sun_accuracy` + `confidence`
(`api.ts:255-264`, `venue-feedback-persistence.ts:72-88`), so a `Partial` row can't be told
apart as a 40% grey verdict vs a 60% amber verdict (and 12.6 keeps the `predicted_state`
vocabulary)
**When** feedback is submitted (this touches the same POST flow as Story 12.7)
**Then** the feedback contract also persists the **sun-exposure percent + the amber/grey
verdict + the weather-gated flag at prediction time** (plus, per the reset AC, the
geometry-input hash), so the agreement rate can actually apply the >50% mapping — otherwise
this rate is uncomputable from stored data

**Then** the maintainer gets a ranked "these venues look wrong" list to drive corrective
data edits (seating polygon, `seating_elevation_m` / `ground_elevation_m`, or individual
`shadow_casters` heights — via direct DB edits / the Story-12.5 dev tool)

**Given** the aggregation accumulates ALL historical feedback for a venue, but a data fix
changes the model
**When** a venue's geometry inputs are corrected
**Then** the loop measures the CORRECTED model separately so old pre-fix mismatch rows
don't keep it ranked wrong forever — via a post-edit window / per-venue reset-acknowledge,
or (cleanest, and it reuses the Story-12.3 geometry-input hash) **stamp each `feedback` row
with the geometry-input hash at prediction time** so agreement can be computed over only
the rows matching the CURRENT hash. So "re-checking a fixed venue shows improved agreement"
is actually achievable (new checks aren't drowned by stale ones)

**Given** confidence is no longer shown to users (Story 12.13), so
`SUNNYSEAT_COVERAGE_CAP` clamps a value nobody sees
**When** the flag is retired
**Then** the `SUNNYSEAT_COVERAGE_CAP` env var is REMOVED from Vercel and the env-gated
bypass code (+ its test) is deleted from `shadow-data-coverage.ts`; the internal
confidence model and the coverage cap MAY stay as an internal signal (for logs / the
accuracy loop) or be simplified — the story decides

**Given** the cap is NOT purely internal even after the confidence chip is gone: numeric
confidence feeds `uncertaintyLevelFromConfidence` (`sun-engine.ts:1122`, `<50 high / <75
medium`) which renders the user-visible "Låg osäkerhet / Osäker prognos" labels — so
changing/removing the cap moves confidence (e.g. 90 vs a capped 60) and can flip that copy
**When** the cap is removed/simplified
**Then** this user-visible knock-on is handled deliberately — DECOUPLE the uncertainty tier
from the capped value (base it on the honesty signals directly), OR intentionally
re-baseline the uncertainty copy + its tests — so "no user-facing change" is actually TRUE
(the uncertainty labels don't silently shift)

**Given** the internal confidence / coverage machinery might still inform the accuracy
loop
**When** the cleanup lands
**Then** any remaining internal use of confidence is documented (what reads it and why),
so a future maintainer knows it is internal-only by design — not a dropped feature

_(Mostly backend/ops + a data-analysis deliverable; no user-facing design gate — the
confidence UI is already gone via 12.13. The FR12 "confidence drops with cloud" concern
is retired: weather truth is carried by the grey pin, not a number.)_

### Story 12.3: Day-Series Compute at Real-Venue Scale — Kill the Cold-Start Freeze

_Context (2026-07-08):_ first production contact of the Epic-11 day-series with the
42-venue real set froze the app: a cold `/api/venues` computes 42 venues × 61 steps
of CPU-bound shadow math (turf boolean ops per step) and takes **minutes** to first
byte (observed: client timeout at 120 s; the map shows "Laddar platser…" forever).
Three compounding causes, all in `lib/services/sun-engine-cache.ts` +
`sun-engine.ts` (`computeVenueDaySeries`): (1) the caches are **process-scoped**
maps — they die on every deploy AND every idle-recycled lambda, and at
zero-traffic/pre-launch scale nearly every visit hits a cold instance; (2) the
day-series cache key folds in the **15-min weather bucket**, so the whole
deterministic-per-day geometry series recomputes 4×/hour even on a warm instance;
(3) the design envelope was written for the fixture era — the cache module's own
comment says "acceptable at MVP scale (≤10K MAU, **7 venues**)" — and the real set
is 6× that. `SUN_ENGINE_LIST_CONCURRENCY=6` only helps I/O; the shadow math shares
one lambda vCPU. Verification-phase stopgap in use: an external quarter-hour
cache-warmer ping (local, uncommitted — retire it here).

As a **user opening SunnySeat (and the maintainer field-verifying it)**,
I want `/api/venues` to answer in seconds even on a cold instance or a fresh
weather bucket,
So that the app is usable at real-venue scale before (and after) launch.

**Acceptance Criteria:**

**Given** the day series marries deterministic per-day shadow GEOMETRY (valid all
day) with 15-min weather GATING in one cached artifact keyed on the weather bucket
**When** the two are split — a geometry series keyed `(venue, Stockholm day,
elevation inputs, AND a hash/version of the geometry inputs)` computed once per day, and
a cheap per-bucket gating pass (weather fetches are already deduped/batched) applied on
read. The key MUST hash the FULL shadow-projection input — not only the `seating_area`
polygon + the named `shadow_casters` `height`/`filter_decision`, but the actual
`get_buildings_near_point` **caster SET**: building geometries/ids AND the RH2000
ground/roof z-values. A correction to a building footprint, an import batch, or a caster
z-value (with no change to `seating_area` or the named fields) MUST still invalidate the
persisted day-series — via a caster-set version/hash OR an explicit invalidation path fired
on any building/caster import — because Stories 12.2/12.5 (and geodata re-imports) edit
exactly these to fix bad predictions; otherwise a corrected venue keeps serving pre-fix
geometry
**Then** a weather-bucket roll re-gates in O(steps) without re-running shadow math,
outputs stay value-identical to today's path, and the R-012 rule is preserved
(gating always uses the CURRENT bucket's weather — never a stale-gated series)

**Given** process-scoped caches die with every deployment and idle lambda recycle
**When** the geometry series is **persisted across instances** in a Supabase table (via
the existing service-role path) — so a cold `/api/venues` READS pre-computed geometry
instead of running 42×61 shadow projections
**Then** a fully cold instance serves the central viewport in ≤ ~5 s p95 (persisted
geometry + live gating), measured against prod; DECISION D's compute-on-request stance
is explicitly revised to precompute-and-persist at real-venue scale

**Given** the maintainer wants caches that are **never empty after the first load**, and
that future dates need not be minute-fresh (MAINTAINER DECISION 2026-07-08)
**When** a **scheduled job** (a GitHub Action → Supabase, NOT a short Vercel cron —
the batch exceeds a serverless timeout) precomputes+persists the **ungated GEOMETRY
series** (per the split above — NOT a weather-gated series) for ALL venues across the
**entire selectable planner window — `today + PLANNER_MAX_FUTURE_DAYS`**
(`time-planner.ts`, currently 3), NOT an arbitrary N: the precompute horizon MUST equal
the dates the planner lets a user pick (a shared constant, tested), or an uncovered future
date falls back to the exact cold shadow-compute freeze this story exists to kill;
refreshed at TIERED cadences (future days a few
times/day — deterministic geometry, so this is really just keeping the store populated;
today refreshed alongside the geometry that rarely changes)
**Then** picking any date reads the persisted GEOMETRY (≈instant, never a cold
shadow-compute) and the **gating is still applied at read** with that request's weather
(consistent with the split AC — no gated series is ever persisted, so no stale-gating
contradiction). For a FUTURE day the read-time gate may use a forecast up to a few hours
old (fine — multi-day forecasts barely move); for **today**, R-012 near-now freshness is
preserved and the **rain radar** (nowcast, next ~90 min) stays live/on-request. The job
records per-run coverage (venues × days written) so a gap is visible

**Given** extending the GEOMETRY horizon to `PLANNER_MAX_FUTURE_DAYS` is NOT enough on its
own — the weather side truncates: `getForecast` keeps only `timeseries.slice(0, 48)`
(`met-no-service.ts:93`, ~2 days) and `nearestForecastSlice` picks the closest RETAINED
slice, so a day+3 selection would gate with the ~48h-out slice, not that day's forecast
(silently breaking the "few hours old" claim)
**When** the read-time gate serves any selectable planner date
**Then** the retained/fetched Met.no window is extended to cover the SAME
`today + PLANNER_MAX_FUTURE_DAYS` horizon as the geometry (raise the `slice(0, 48)` cap or
fetch enough slices), OR gating for an instant outside the retained forecast horizon
**explicitly degrades to unknown** (non-gating) rather than trusting a far-off slice —
covered by a test at the day+3 boundary

**Given** the planner window ROLLS at Stockholm midnight — if the last scheduled run was
before midnight, at 00:00 the selectable window gains a new `+PLANNER_MAX_FUTURE_DAYS` day
the job hasn't persisted yet, re-opening the cold-fallback hole this story closes
**When** the schedule is defined
**Then** coverage is CONTINUOUS across the midnight roll — either an **immediate
post-midnight run** (Stockholm) or a **one-day lookahead buffer** (precompute
`today + PLANNER_MAX_FUTURE_DAYS + 1`) — so the newly-selectable date is always already
persisted, never cold

**Given** the per-step shadow math is CPU-bound
**When** it is profiled at real-venue scale
**Then** cheap wins are taken or explicitly rejected with numbers (memoize per-step sun
positions across venues; early-exit fully-shaded / below-horizon steps) — this also
bounds the scheduled precompute's cost — and before/after cold + bucket-roll + precompute
timings are recorded

> **Cost note (maintainer question 2026-07-08):** the precompute is cheap on the axes
> you'd worry about and expensive only on one. Weather API: Met.no `locationforecast`
> returns a MULTI-DAY forecast in ONE call per location, and co-located venues dedupe by
> 4-decimal coords, so "all future days for all venues" is ~one call per distinct
> location per refresh — a few times/day is far under Met.no's ~20 req/s TOS (near-zero
> cost). Storage: N days × ~100 venues × 61 tiny JSON steps = kilobytes (negligible).
> The real cost is **offline CPU time**: N days × venues × 61 shadow projections per
> refresh — which is exactly why it runs on a GitHub Action (no serverless timeout) on a
> schedule, off the user request path, so users never pay it. Net: many fewer moving
> parts than it sounds, and no per-user API cost.

**Given** the external quarter-hour warmer is an uncommitted verification stopgap
**When** this story ships
**Then** the warmer is retired and no external keep-alive is required for normal
latency

**Design Gate Criteria:**
- **Visual:** None — latency/values only; no UI change
- **Behaviour:** Time scrub stays zero-fetch (Epic 11 request-count gates scrub=0 /
  date-change=1 remain green)
- **Animation:** None
- **Visual validation:** Not applicable (no pixel change); the Epic-11 CI gates
  stand in as the regression net

### Story 12.4: Production Console Hygiene — Hydration Error + MapLibre Null Warning

_Context (2026-07-08, first real-venue prod session):_ the live app's console shows
two app-originated errors (separate from the extension noise —
`contentscript.js`/MaxListeners/ObjectMultiplex are the user's browser extensions,
NOT ours, and are out of scope). Both are non-blocking (the map + venues render),
but an error-free console is the baseline for trusting the prod session and for a
console-error CI guard.

1. **`Uncaught Error: Minified React error #418`** (hydration text mismatch —
   server-rendered HTML ≠ first client render). Almost certainly a wall-clock/`new
   Date()`-derived value rendered during SSR that differs by the time the client
   hydrates: candidates carry `new Date()`/`toLocale`/`Intl` in render —
   `components/custom/time/TimeSliderPanel.tsx`,
   `components/composed/venue/VenueDetailContent.tsx`, `components/custom/map/MapView.tsx`
   (`quickInfoOpeningHours` derives "Öppet till HH:MM" from `new Date()`). This is the
   same class as the pre-existing `TimeProvider` initial-`new Date()` hydration note.
   (NOT `TimeSlider.tsx` — it documents "never reads `new Date()`", `TimeSlider.tsx:26`,
   so it is the deliberately-clean controlled child, not a suspect.)
2. **`Expected value to be of type number, but found null` ×3** (MapLibre style
   validation). NOTE — the app authors NO numeric MapLibre style expression: pins are DOM
   `maplibregl.Marker`s (`VenuePinLayer.tsx:199`, not style layers), and the only app paint
   mutation, the recolour, sets exclusively `fill-color`/`line-color` COLOR STRINGS
   (`apply-basemap-colors.ts:53`, `map-basemap-colors.ts:58`) — grep finds zero
   app-authored `addLayer`/`addSource`. So the null almost certainly originates in the
   **upstream positron style**, not our code. Cosmetic (map renders), but noisy.

As a **maintainer verifying the live app**,
I want the production console free of app-originated errors,
So that a genuine runtime error is never buried and the prod session is trustworthy.

**Acceptance Criteria:**

**Given** React error #418 (hydration mismatch) fires on load of the live map
**When** the mismatching node is found (reproduce with a NON-minified/dev build to
get the readable message + component stack, then fix the root cause — render the
time-derived value only after mount, or seed server + client from one stable value,
NOT by blanket `suppressHydrationWarning`)
**Then** a cold load of `/` (map) and a venue detail produce ZERO React hydration
errors in the console, and the fix names the offending component + value in the
story record

**Given** the MapLibre `Expected value to be of type number, but found null` warning
fires ×3 at style/recolour time — and (per the context) the app authors no numeric style
expression, so the null likely comes from the UPSTREAM positron style, which "guard our
input" cannot reach
**When** the offending layer + property is identified (diff the style before/after our
`setPaintProperty` pass; confirm whether the null pre-exists in the fetched positron style)
**Then** it is resolved by the appropriate lever for its SOURCE: if it IS our input, guard
it; if it is the **upstream positron style**, either fork/patch that layer OR — per AC3's
own third-party carve-out — **document it as a known third-party positron warning** and
allow-list it in the console guard (do NOT assume an app-authored numeric expression exists
to "correct")

**Given** there is currently NO automated console-error guard (grep of `test/e2e`
finds no `console`/`pageerror` listener)
**When** the two errors are fixed
**Then** a Playwright spec (via `page.on('console')` + `pageerror`) asserts a cold map
load and a venue-detail open emit no app-origin console messages at level **error OR
warning** — catching the MapLibre "Expected value…" message even if it surfaces as a
`console.warn` (not only `console.error`), UNLESS Story-12.4 AC2 has confirmed it is an
upstream positron-style warning, in which case it is an EXPLICITLY-documented third-party
allow-list entry (a named, justified exception — never a silent blanket skip), plus React
`pageerror`s; an allowlist may exclude known third-party/extension noise, but NOT React or
our-own-code MapLibre app-origin
errors/warnings — so a future regression re-breaks the build

**Design Gate Criteria:**
- **Visual:** None — console/correctness only; the map + venues render identically
- **Behaviour:** No hydration-driven remount/flicker on first paint; time-derived
  labels ("Öppet till HH:MM") still render correctly for the current Stockholm weekday
- **Animation:** None
- **Visual validation:** Screenshot comparison of the map + venue detail against the
  current baseline passes — a console-only fix must not move pixels

### Story 12.5: Dev-Only Venue Editor — Drag Pin, Paste Polygon, Persisted Hide/Show, Inline Fields

_Context (2026-07-08, maintainer request):_ venue data edits are done today by
direct DB queries (the 2026-05-30 decision retired the in-app admin surface —
FR36/39/43/44). That stays true for USERS; this story adds a **dev/localhost-only**
convenience layer on the SAME map so the maintainer can fix a venue's display
position and a few fields visually instead of hand-writing SQL. It does NOT
reintroduce a production admin surface or admin auth — it is gated off entirely in
the prod bundle/runtime and is fail-closed. It pairs with the field-verification
walk (Story 12.2 evidence gathering): spot a mis-placed pin on-site, fix it locally
later.

**Scope (maintainer-narrowed 2026-07-08):**
- **Pin drag → display coordinate, DISPLAY ONLY.** Dragging the pin updates the venue
  point used for the marker + "distance from centrum" ONLY. The shadow GEOMETRY is
  polygon-first (`resolveVenueGeometry` → `seating_area`; all 42 live venues have a
  polygon), so the drag never moves the shadow calc. **BUT the engine still reads
  `venue.location` for the per-venue WEATHER (forecast + nowcast) gating**
  (`sun-engine.ts:522/546/712/724`), so writing a dragged point into `lat`/`lng` WOULD
  shift the cloud/rain gate and could flip the predicted state. Therefore the drag must
  NOT feed the engine's weather coordinate: either (a) persist the dragged point in a
  SEPARATE display-only column (leave `lat`/`lng` as the engine coordinate), or (b) make
  the engine derive its weather location from the seating-polygon centroid so `lat`/`lng`
  is truly display-only first. Pick one in the story — do not assume "polygon-first" alone
  makes the drag safe. (Caveat: a `null`-`seating_area` venue uses the point as the shadow
  footprint too — none today.)
- **`seating_area` editing = paste a coordinate array only.** No interactive polygon
  drawing. A textarea takes a `[[lng,lat],…]` ring (or full GeoJSON Polygon);
  server-side validation reuses the seed-load rules (Polygon, closed ring, ≥4
  positions, `[lng,lat]` in Gothenburg bounds) and rejects with a clear message.
- **Hide/show = PERSISTED for all users.** A new `hidden boolean not null default
  false` column; the `/api/venues` list route filters `hidden = false` so a hidden
  venue disappears from the public map/list; the dev editor toggles it.
- **Inline edits:** `tags` (text[]), `description`, `thumbnail` (jsonb — URL paste,
  NOT image upload; upload/hosting is explicitly out of scope).

As a **maintainer**,
I want a localhost-only editing layer on the real map to reposition a pin, replace a
polygon by pasting coordinates, hide/show venues for everyone, and edit tags/
description/thumbnail-URL,
So that routine venue fixes are visual and fast without hand-writing SQL — while
production ships no admin surface.

**Acceptance Criteria:**

**Given** the retired-admin decision (no prod admin surface, no admin auth)
**When** the editor + its write route are built
**Then** both are **dev/localhost-only and fail-closed**: the write route hard-refuses
unless an explicit non-production gate is set (e.g. `NODE_ENV !== 'production'` AND/OR
a `SUNNYSEAT_ADMIN=dev` env flag that is NEVER set in Vercel), the editor UI never
renders in the prod bundle (mirroring the `?_state=` / `use-forced-state.ts` dev-only
convention), and a test proves a prod-config request to the route is rejected

**Given** the maintainer drags a venue pin on the dev map
**When** the new position is saved
**Then** the dragged point is persisted as a **display-only coordinate** — NOT written
into the engine's `lat`/`lng` (which feeds forecast/nowcast weather gating, per the Scope
note), via a service-role write route (mirroring the `feedback`/`reviews` POST pattern;
client never touches Supabase directly — API boundary). The concrete mechanism is one of
the two Scope options (a new `display_lat`/`display_lng` column that the marker + distance
read, OR first switching the engine's weather location to the seating-polygon centroid so
`lat`/`lng` becomes display-only). The marker + distance update; the sun prediction is
provably unchanged (a route test asserts the engine's weather coordinate did not move)

**Given** the maintainer pastes a coordinate array into the polygon field
**When** it is saved
**Then** it is validated server-side (Polygon / closed ring / ≥4 positions /
`[lng,lat]` Gothenburg bounds — the seed-load ruleset) and only a valid ring is
written to `seating_area`; an invalid paste is rejected with a specific error and no
write occurs

**Given** a new persisted `hidden` column (migration: `boolean not null default
false`, idempotent, RLS posture preserved)
**When** the maintainer hides a venue
**Then** a hidden venue disappears for ALL users on EVERY public path — not just the
list: `/api/venues` (map + list) omits it AND the slug detail `/api/venues/[slug]` /
`getVenueBySlug` returns 404 for a hidden venue (so a stale link / cached UI / direct URL
can't reach it), and the **reviews route** (`/api/reviews` GET+POST — a public read/write
path that resolves venue identity independently of detail), detail-prefetch, AND the
**feedback POST** (`/api/venues/[slug]/feedback` — a public WRITE path that Story 12.7 moves
to the live resolver) all reject a hidden venue too, so a stale open detail can't read or
write reviews/feedback for an unreachable venue and pollute the accuracy loop; showing it
again restores all paths — verified by route tests for list, by-slug, **the reviews GET+POST**,
and the feedback POST

**Given** the public reads are CACHED — `/api/venues` + `/api/venues/[slug]` send
`Cache-Control: public, max-age=30, s-maxage=30` (CDN) and detail stays fresh in the client
TanStack cache for 5 min — so a hidden venue can still be served from cache for that window,
contradicting "can't reach it"
**When** a venue is hidden (or unhidden)
**Then** the toggle also busts the relevant caches — an explicit CDN/edge invalidation (or
an accepted, documented bounded staleness ≤ the 30 s edge TTL) AND client-query
invalidation — so hide takes effect promptly, not only after the cache window lapses
(state the chosen guarantee; for a dev-tool toggle a ≤30 s bound may be acceptable IF
documented)

**Given** hidden venues are gone from every PUBLIC path, but the maintainer must still see
them in the editor to toggle them back on (else unhiding needs raw SQL, contradicting
"showing it again restores all paths")
**When** the editor loads
**Then** a **dev-only include-hidden** read path (list + detail) surfaces hidden venues IN
THE EDITOR ONLY — gated by the same dev-only guard as the rest of Story 12.5 and
**fail-closed in production** (a prod request can never include-hidden) — so hide/show is a
round-trip entirely within the editor

**Given** the inline field editors (tags / description / thumbnail-URL)
**When** a field is saved
**Then** it is written through the same validated dev-only route (tags coerced to a
clean `text[]`, thumbnail as `{alt,initials,url}` jsonb with a URL — no file upload),
and the public DTO reflects the change on next load

**Given** `nextjs-app/docs/venue-data-load.md` documents venue authoring
**When** the editor ships
**Then** the doc notes the dev editor as an alternative to raw SQL for these fields
(and that it is localhost-only), and the new `hidden` column is added to the field
table

**Design Gate Criteria:**
- **Visual:** The dev editor chrome appears ONLY under the dev gate; the normal user
  map is pixel-unchanged when the gate is off
- **Behaviour:** Pin drag moves marker/distance only (not the prediction); hidden
  venues vanish for everyone; invalid polygon paste is rejected without a write
- **Animation:** None required beyond the existing pin/marker behaviour
- **Visual validation:** With the dev gate OFF, the map + venue detail match the
  current baseline (the editor must not leak into the default render)

### Story 12.6: Simplify Map Pins — One Grey "Not Sunny" Pin, No Number

_Context (2026-07-08, maintainer decision):_ today the map has THREE pin visuals
(`VenuePin.tsx`): amber (Sunny/Partial), light-grey shaded (Shaded/NoSun), and a
slate-grey "sol bakom moln" obscured pill (CloudObscured, Story 10.2) — and every
pin shows a number. The number is **sun-exposure %** (share of seating in sun), NOT
confidence. Two greys + a number on the not-sunny pins confuse users, who read the
number as a probability. Simplify to a binary the map can answer at a glance: **can I
sit in the sun here right now — yes (amber) or no (grey)?**

As a **user scanning the map**,
I want one obvious "sunny" pin and one obvious "not sunny" pin, without a confusing
number on the not-sunny ones,
So that I instantly see where the sun is without misreading the percentage.

**Acceptance Criteria:**

**Given** the amber-vs-grey decision today keys off the Sunny/Partial/Shaded
thresholds (amber at ≥30% sunlit)
**When** the pin colour rule is changed per the MAINTAINER DECISION (2026-07-08) to a
**50% cut**: a pin is **amber (sunny)** only when **more than 50%** of the seating is
in sun AND it is not weather-gated; **grey (not sunny)** when **50% or less** is sunlit
**Then** a venue at e.g. 40% sunlit (amber today) shows GREY, and the card/label copy
that says "sunny"/highlights the sun figure tracks the SAME 50% line so a grey-pinned
venue is never described as sunny (reconcile the pin, the card "% sol" emphasis, and
any "soligt" wording to one 50% boundary)

**Given** "Mest sol" ordering ranks sunny-first on BOTH sides: the SERVER `SUN_STATUS_RANK`
(`route.ts:75-84`; `Sunny=2, Partial=1, Shaded/NoSun=0`) via `sunListRank`/`venuePeakSunRank`
(`route.ts:89,110`), AND a co-equal CLIENT mirror `getVenueSunRankForList` +
`isVenueSunnyForList` (`VenueList.tsx:174-199`) that drives the VISIBLE `sortVenuesForList`
order and the card's `isSunny` — so a `Partial` venue at 40% currently sorts ABOVE not-sunny
ones on the rendered list
**When** the 50% cut lands
**Then** the ORDERING predicates are updated to the same boundary on BOTH sides — the server
rank AND the client `getVenueSunRankForList`/`isVenueSunnyForList` (they are required to stay
in lock-step) — so a grey venue (≤50% sunlit OR weather-gated) is never promoted into the
sunny-first / "Mest sol" band above genuinely sunny (>50%, not-gated) venues; the sort, the
pin, and the card copy all agree on one line (covered by a server test AND a client
list-order test)

**Given** there are two grey pin visuals (light-grey shaded + slate-grey obscured)
**When** they are merged into ONE grey "not sunny" pin (cloud icon)
**Then** `Shaded`, `NoSun`, AND `CloudObscured` all render the SAME single grey pin;
the underlying `CloudObscured` STATUS is preserved (so the card can still explain
"sol bakom moln" vs shade, feedback `predicted_state` and the DB CHECK are untouched)
— only the PIN PRESENTATION merges. The Epic-10 honesty is preserved: a cloudy-but-
geometrically-sunny venue stays grey (never falsely amber)

**Given** every pin shows a number today
**When** the grey pin is finalized
**Then** the **grey pin shows the cloud icon and NO number**; the **amber pin keeps
the sun icon + the sun-exposure %**. Colour is never the only signal (sun vs cloud
icon still differentiates — NFR27), and the accessible name drops the percentage — which
requires flipping the i18n keys + tests, NOT just the visual + screenshots: `pinShadedAria`
/ `pinObscuredAria` still interpolate `{percent}` (both locales) and `VenuePinLayer.test.tsx`
asserts the obscured aria contains the number (e.g. "88"), so the grey-pin variants are
updated to a percent-free "inte soligt" contract and those pin-aria tests are flipped (else
SR users still hear the old percentage)

**Given** this changes the shipped pin treatment (supersedes Story 10.2's three-way
pins at the PIN level only)
**When** it lands
**Then** the reference PNGs for the map (mobile + desktop, sunny + not-sunny states)
are rebaselined and `REBASELINE-LOG.md` updated in the same operation

**Design Gate Criteria:**
- **Visual:** Two pin states only — amber sun pill with % (sunny), grey cloud pill
  with no number (not sunny); matches the design-token palette (`--color-amber-pin`,
  `--color-pin-*`)
- **Behaviour:** amber ⟺ >50% sunlit and not weather-gated; grey otherwise (incl.
  cloudy/rain-gated); the card never labels a grey-pinned venue "sunny"
- **Animation:** No entrance flash when a venue crosses the gate on refresh (keep the
  existing `initial={false}` / duration-0 treatment on the grey pill)
- **Visual validation:** Screenshot comparison of the map (mobile + desktop) against
  the rebaselined reference passes — one grey pin, no number, correct 50% split

### Story 12.7: Reviews Route Resolves Live Venues (Fix the 404 on Real Venues)

_Context (2026-07-08, confirmed bug — adversarially verified):_ opening a
newly-seeded venue's detail logs a 404 fetching reviews. **Root cause is NOT "zero
reviews" — it is a venue-identity source mismatch.** `resolveReviewVenueIdentifier`
(`nextjs-app/lib/services/venue-reviews-persistence.ts:113-122`) resolves the venue
ONLY against the hardcoded 7-row `VENUE_FIXTURE`; a live venue (ids "8"–"49") is
absent, so `/api/reviews` returns `404 Venue not found` at
`app/api/reviews/route.ts:87-88` BEFORE the (correct, empty-list-returning) review
lookup is reached. The detail route (`/api/venues/[slug]`) resolves the same venue
fine because it uses `getVenueBySlug` → the live Supabase store. Both the GET and
POST review paths gate on the fixture resolver.

As a **user (and the maintainer)**,
I want reviews to load for the real venues,
So that a live venue with no reviews shows an empty reviews section (not a 404 error).

**Acceptance Criteria:**

**Given** the review route resolves venue identity against the fixture-only
`resolveReviewVenueIdentifier`, while `/api/venues/[slug]` resolves via
`getVenueBySlug` (the live store, gated on `SUNNYSEAT_VENUE_STORE=supabase`)
**When** the review route (GET + POST) is switched to a live venue-identity resolver
that accepts **id OR slug** (in supabase mode, look the venue up in the live store by
EITHER) — this is REQUIRED because POST resolves `body.venueId ?? body.venueSlug`, so a
live venue's numeric id (`"8"`–`"49"`) is tried FIRST and a slug-only lookup would still
404 on submit; fall back to the fixture only in fixture mode
**Then** a live venue with zero reviews resolves and returns **200** with
`reviews: []` / `reviewCount: 0` (the empty-list path at `route.ts:96-100` already
does this once resolution succeeds), and a genuinely unknown identifier still 404s

**Given** the client requests `GET /api/reviews?venueId=<slug>` (`useVenueReviews.ts`,
identifier = `venue.slug`)
**When** the fix lands
**Then** the two endpoints share ONE venue-identity source (no duplicated Supabase
query), and posting a review for a live venue also resolves (POST path at
`route.ts:153-154`)

**Given** the app is LIVE on `SUNNYSEAT_VENUE_STORE=supabase` +
`SUNNYSEAT_REVIEW_PERSISTENCE=supabase`
**When** the resolver change ships
**Then** a regression test seeds/mocks a live venue absent from the fixture and asserts
`GET /api/reviews` returns 200 empty (not 404), plus a fixture-mode test still passes

**Given** the **`/api/venues/[slug]/feedback` POST route has the IDENTICAL bug** — it
imports `VENUE_FIXTURE` and resolves the path slug against the fixture, so real-venue
feedback submissions 404 (this blocks the Story-12.2 accuracy loop, which needs those rows)
**When** this story ships
**Then** the feedback POST route is switched to the SAME live id/slug resolver, so
submitting feedback for a live venue (ids `"8"`–`"49"`) succeeds — covered by a route test

_(Backend-only; no design gate. Effort: small. Scope now = reviews GET/POST **and** the
feedback POST route — one shared live resolver for all three.)_

### Story 12.8: About Page — Pin Legend + "So Reads the Sun Figure"

_Context (2026-07-08, aligned with Story 12.13 — no user-facing confidence number):_
the About page (`app/[locale]/about/page.tsx` → `AboutPage.tsx`, copy in
`messages/sv/about.json`) explains the engine + honesty posture well (ALGORITMEN /
DATAKÄLLOR / TRÄFFSÄKERHET / Kontakt), but never explains what users actually see on the
map: (1) amber vs grey pin, (2) that the pin number is the **share of seating in sun**
(not a probability). Since confidence is no longer shown to users (12.13), the earlier
"Sol vs Säkerhet" section is **reframed** to focus on the sun figure + the honesty/
feedback loop instead of teaching a "Säkerhet" number users will never see.

As a **new user**,
I want the About page to explain the map legend and what the sun number means in plain
Swedish,
So that I read the pins and the number correctly.

**Acceptance Criteria:**

**Given** the About page has no pin legend and never defines the pin number
**When** a section **"Så läser du kartan"** is added (before ALGORITMEN) with two inline
pin swatches (amber sun + grey cloud)
**Then** it states in plain Swedish that an amber pin = direct sun now, a grey cloud pin =
not sunny (shade OR clouds), and that the pin number is **the share of the seating area
currently in sun** — "70% betyder att ~70% av sittytan är solig, inte att det är 70%
chans att det är soligt"

**Given** confidence is no longer a user-facing number (Story 12.13)
**When** a short **"Hur säkra är vi?"** paragraph is added (in/after TRÄFFSÄKERHET)
**Then** it explains, honestly and simply, that the app aims to get the sun figure right
and that accuracy improves as users send feedback ("stämmer det?"), WITHOUT introducing a
per-venue "Säkerhet" number (there isn't one in the UI anymore). It may note that the app
tracks its own confidence internally to prioritise improvements

**Given** the TRÄFFSÄKERHET stat is still the hard-coded `ABOUT_ACCURACY_PLACEHOLDER = 85`
(its own comment says illustrative-until-validated), and after the 12.2 reframe there is no
required source producing a measured hit-rate
**When** 12.8 ships
**Then** the page must NOT present the placeholder AS IF it were a real measured hit-rate
(that would be dishonest, on the very page that promises honesty) — either source the
number from the Story-12.2 feedback/accuracy aggregation, OR remove / clearly label it as
an estimate ("preliminär" / not-yet-measured) until a real rate exists

**Given** Swedish is the default and copy lives in `messages/`
**When** the sections ship
**Then** the keys are added to `messages/sv/about.json` (+ en mirror), rendered via the
existing section pattern in `AboutPage.tsx`, and `AboutPage.test.tsx` asserts the new keys
render

**Design Gate Criteria:**
- **Visual:** New sections match the existing About typography/section treatment; the two
  pin swatches match the real map pin styles (amber sun, grey cloud — per Story 12.6)
- **Behaviour:** Static content; no interaction beyond existing About scroll
- **Animation:** None
- **Visual validation:** About page (mobile + desktop) screenshot vs a rebaselined
  reference passes (new sections added)

### Story 12.9: Mobile Bottom-Sheet Row-Quantized Drag + Slim Time-Slider

_Context (2026-07-08, root-caused + maintainer redesign):_ two mobile issues on the
same surface, plus a redesign of the sheet's drag behaviour.

1. **Drag gap (VERIFIED).** `MobileBottomSheet.tsx` is a fixed-height, bottom-anchored
   panel moved mid-drag by a CSS **transform** (`animate y: dragY`, :181/:303). A
   transform doesn't re-anchor the box, so a drag lifts its bottom edge off the 52px
   nav anchor and a strip of bare map shows through (`bg-surface-cream` paints only
   inside the box; the sheet's sibling is `<MapContainer/>`). This is fixed for free by
   the redesign below (height-driven drag pins the box bottom to the anchor).
2. **Snap model → ROW-QUANTIZED (MAINTAINER DECISION 2026-07-08).** Replace the four
   fixed snaps (collapsed/peek/mid/full, `globals.css:207-210`) with a continuous,
   **one-row-at-a-time** model: the sheet height = the handle + **N visible venue
   rows**, and it snaps to whole-row increments. Dragging DOWN reveals one fewer row per
   interval, all the way to **0 rows (handle only)**; dragging UP reveals one more row
   per interval, up to a max. This makes the collapse-to-handle reachable by dragging
   the list itself (the current defect — collapse only fired from the 44px handle) AND
   gives granular expansion. It also inherently fixes the gap, because the box is driven
   by height from the pinned bottom anchor, never translated off it.
3. **Time-slider padding too tall.** Two top insets stack on mobile: the panel's
   `pt-5` (20px, `TimeSliderPanel.tsx:56`) + the slider row's `min-h-12 pt-4`
   (`TimeSlider.tsx:129`, 16px badge-reserve). Desktop is a separate branch, so mobile-only.

As a **mobile user**,
I want to drag the venue sheet up and down and have it settle one venue row at a time —
all the way down to just the handle — with no map gap, and a slimmer time slider,
So that I control exactly how much of the list I see and the mobile map feels tight.

**Acceptance Criteria:**

**Given** the sheet uses four fixed-height snaps and is translated by a CSS transform
(exposing bare map mid-drag)
**When** it is re-driven by **height** (or a `max-height`/`bottom` offset) so the box
bottom stays pinned to the 52px nav anchor at all times, and the height follows the
finger continuously during a drag
**Then** NO bare map ever shows between the sheet and the nav bar at any drag position
or velocity (incl. notched safe-area devices) — the gap defect is gone

**Given** the maintainer wants one-row-at-a-time control
**When** the sheet snaps to **whole venue-row increments**: height = handle **+ the
persistent chrome above the list (VenueListControls + MobileTagChips, shown once `N ≥ 1`)**
+ `N × rowHeight`, `N` from **0 (handle only)** up to `maxRows` — the header/chrome height
is a SEPARATE term in the formula (or those controls sit outside the measured row area), so
a snap that promises N rows actually shows N un-clipped rows, not chrome eating a row's space
**Then** a downward drag that crosses a row boundary settles showing one FEWER row, and
an upward drag settles showing one MORE row; a slow drag can walk the list open/closed a
row at a time, and a fling honours velocity by snapping to the nearest row boundary in
the flung direction. `rowHeight` is derived from the **actual rendered row variant** (one
source of truth, not a magic number) — NOTE the current sheet uses compact cards only in
peek (`compactCards={mobileSheetState === 'peek'}`) and taller non-compact `VenueCard`s
(extra metadata/tags) once expanded, so the row model must EITHER use compact cards
consistently in the row-count sheet OR measure the real variant that renders at N rows;
deriving from the compact height while rendering non-compact rows would under-size the snap
and still clip. So a row is never half-clipped at a resting snap

**Given** `N = 0` must be reachable by dragging the visible list, not just the handle
**When** the user drags down on a venue ROW (or the handle) past the last row
**Then** the sheet collapses to **handle-only (0 rows)** and stays put; dragging up from
there reveals rows one at a time again. (The old `bodyBind` `if (!isFull) return` no-op
is removed; the scroll-vs-drag rule becomes: drag moves the sheet while the list is at
`scrollTop === 0`, otherwise the list scrolls — standard bottom-sheet behaviour)

**Given** `maxRows` must not overflow the screen
**When** the content needs more rows than fit under the top framing (search bar / safe
area)
**Then** `maxRows` caps at the tallest height that still clears the top chrome; beyond
that the list **scrolls internally** (the sheet doesn't grow further), and the tag
chips / list controls that were gated on the discrete `'peek'` state are re-gated on the
new row-count/height model (e.g. shown once `N ≥ 1`) so nothing depends on the removed
snap enum — INCLUDING `computeRecenterPadding` (+ its tests), which today keys off
`MobileBottomSheetState` and the hard-coded snap heights to keep the locate/recenter fly-to
centered in the unobscured map; it must migrate to the row-count height or the user dot
lands behind/away from the visible map center

**Given** the mobile slider panel stacks 20px + 16px of top padding above a 6px track
**When** `TimeSliderPanel.tsx:56` `pt-5`→`pt-3` and `TimeSlider.tsx:129` `min-h-12 pt-4`
→`min-h-11 pt-3` (mobile-only branches; desktop `px-6 py-3` untouched)
**Then** ~16px is reclaimed, the value badge still clears, and the panel reads slimmer on
mobile with no desktop change

**Given** the current sheet has keyboard ArrowUp/ArrowDown control across the snap ladder
(WCAG 2.1 AA), which the snap enum removal would break
**When** the row-quantized model lands
**Then** keyboard control is PRESERVED, mapped to the new model: ArrowUp/ArrowDown expand/
collapse **one row at a time**, reaching the **0-row handle-only** state and the max, with
a visible focus state and an accessible announcement of the change — no keyboard regression
for the row model

**Design Gate Criteria:**
- **Visual:** No bare-map gap at any drag position; rows are never half-clipped at a
  rest snap; slimmer mobile slider; desktop unchanged
- **Behaviour:** Sheet settles one row at a time from 0 (handle-only) to max; drag from a
  list row works (not just the handle); internal scroll past max; drag follows the finger
- **Animation:** Drag tracks 1:1; the row-snap settle uses a gentle spring honoring
  `prefers-reduced-motion`; no entrance flash
- **Visual validation:** Mobile sheet at several row counts (0 / 1 / a few / max) + a
  mid-drag frame, and the slim slider, vs a rebaselined reference pass

> **Note:** this replaces the four-snap sheet from Story 11.3. Its touch-gesture e2e
> (`epic-11-sheet-touch-gestures.spec.ts`) must be updated from snap-name assertions to
> row-count assertions (incl. a spec that drags starting on a venue ROW, not the handle,
> AND a keyboard spec that walks the row ladder to 0-row and back).

### Story 12.10: Venue Detail Preload — Instant "Mer info"

_Context (2026-07-08, grounded in the caching-architecture map):_ opening "mer info"
is slow because the detail route (`/api/venues/[slug]`) computes the single-instant sun
engine on request; on a cold instance (dead process caches — the pre-launch norm) that
means a `get_buildings_near_point` RPC + shadow math + a Met.no fetch before first byte.
Detail is cheaper than list (one venue, one instant, NO 61-step day series) and shares
the same two server caches — but cold is still seconds. With only ~50–100 venues per
city, the list already fetches everything nearby, so we can warm detail ahead of the click.

As a **user**,
I want a venue's detail to appear instantly when I tap "mer info",
So that browsing venues feels immediate.

**Acceptance Criteria:**

**Given** detail is fetched on-click via `useVenueDetail` (`queryKeys.venues.detailAt`)
and cold-computes server-side
**When** the client PREFETCHES detail (TanStack `prefetchQuery`) in the background for a
bounded top-N of the candidate venues — which MUST include the **favourite-query rows**
(`useFavouriteVenues`), not only the main nearby list: on `/favoriter` a saved venue
outside the ~1.5 km set (or a cold favourites deep link) comes from that separate query
(`MapView.tsx:445,470`), so limiting candidates to "the list query" leaves those cards on
the COLD detail path and "Mer info" stays slow there — using the **EXACT
`queryKeys.venues.detailAt` parameters that `useVenueDetail` will mount with on the click**
(slug + the current planner date/time + the rounded user lat/lng), NOT a slug-only or
mismatched-planner key. CRITICAL: because that key includes `{date, time, lat, lng}`, the
prefetch must re-run not only after the list settles but **after the planner date/time OR the
rounded location SETTLES** (debounced) — else a detail prefetched for the live key is stale
the moment the user scrubs time / picks a date, and even a top visible card falls back to the
cold fetch. (Or explicitly exempt immediate post-scrub opens from the instant guarantee —
name which.)
**Then** tapping "mer info" for a prefetched venue **hits the client cache** (the prefetch
key matches the mounted key exactly — a slug-only/wrong-location prefetch would warm the
server but still refetch on open, defeating the story) and renders with no visible wait;
a non-prefetched venue still works (falls back to the live fetch)

**Given** each detail prefetch is a single-venue engine call, so an unbounded prefetch
could fire 50–100 background `/api/venues/[slug]` requests right after the list settles
**When** the prefetch runs
**Then** it is BOUNDED — an explicit **total budget** + a **concurrency cap** (a few in
flight at once) + it **yields to interaction** (cancel/pause in-flight prefetches when the
user acts, backoff on error). The budget is seeded in **the current VISIBLE order** — the
list defaults to `venueSortMode = 'sun'` ("Mest sol", `sortVenuesForList`), so the top
tappable cards are sun-ranked, NOT nearest-distance; prefetch the top of the visible
list/favourites order FIRST (what the user is most likely to tap), then fall back to nearest
— else a user taps a top sunny card outside a distance-only budget and its detail is still
cold. So the prefetch never turns cold-start into an idle burst that competes with the user

**Given** the maintainer's stated goal was "preload venues within ~10 km" (future-proofing
for more cities), but the current API can't return that set — the list requests
`SEARCH_RADIUS_KM = 1.5` and `/api/venues` REJECTS radius `> MAX_RADIUS_KM = 3.0`, so there
is no 10 km candidate list to prefetch from today
**When** the data source is chosen
**Then** the story picks explicitly: (a) INTERIM — scope the prefetch to the top-N of the
already-returned (~1.5 km) list, which works now with zero new endpoints; or (b) to truly
reach ~10 km, raise `MAX_RADIUS_KM` / add a lightweight discovery endpoint returning the
wider candidate set. Do NOT write an AC that prefetches "within 10 km" against an API that
400s above 3 km — name which option, and note (a) only covers the near set until (b) lands

**Given** each prefetch also warms the server's `sunComputeCache`/`buildingsCache`
**When** prefetch requests hit `/api/venues/[slug]`
**Then** subsequent real detail loads for those venues are warm too, and the prefetch
respects the same 15-min bucket / 30 s Edge cache (no extra Met.no load beyond the dedupe)

**Given** the detail route uses the single-instant engine path
(`applyRealSunEngine` → `fetchCachedVenueBuildings`) and does NOT read the list
day-series artifact — so 12.3's persisted day-SERIES does not, by itself, warm a cold
detail's `get_buildings_near_point` RPC
**When** detail warmth is made explicit
**Then** the PRIMARY warmth is this story's own prefetch (it populates the client cache
AND the server `buildingsCache` / `sunComputeCache` for the prefetched venues); AND for
12.3 to also help cold detail, 12.3 must persist/reuse the **building set** (or wire the
detail route to read the persisted geometry store) — called out as a cross-story
dependency here, not assumed. The story records the before/after "mer info" open time
against prod

**Design Gate Criteria:**
- **Visual:** None — latency only; the detail overlay is unchanged
- **Behaviour:** Prefetched detail opens instantly; the time-scrub zero-fetch invariant
  and the list request-count gates stay green (prefetch is idle/background, not on scrub)
- **Animation:** The existing detail open/close transition is unchanged
- **Visual validation:** N/A (no pixel change); request-count + open-time metrics stand in

### Story 12.11: First-Run Coach-Mark Guide (Map Legend + Feature Tour)

_Context (2026-07-08, maintainer request):_ first-time users don't know what the pins
mean or how the planner/tags/list/feedback work. A brief, skippable coach-mark guide on
first map entry teaches the essentials. Distinct from the existing `OnboardingGate`
(geolocation permission) — this is a post-onboarding feature tour, re-openable from
Settings.

As a **first-time user**,
I want a short, skippable guide that shows what a sunny vs grey pin means and how the
main features work,
So that I understand the app immediately (and can revisit it later).

**Acceptance Criteria:**

**Given** a user reaches the map for the first time (after onboarding/geolocation)
**When** a coach-mark guide appears highlighting, in a few steps: the sunny (amber) vs
not-sunny (grey/cloud) pin meaning, the time slider, the date planner, the tag chips,
the venue list/sheet, and favourites — each step a short caption anchored to a real element
**that is actually present on the initial map screen**. The "stämmer det?" feedback control
is NOT — `FeedbackFlow` only mounts inside the detail overlay (`MapView.tsx:601`, gated on
an open venue), so a feedback step must NOT anchor to a non-existent target on first entry:
either drop it from the first-run tour (mention feedback in copy only), or have the guide
deterministically open a venue's detail before any feedback-specific step (no step ever
points at a hidden/unmounted element)
**Then** it can be dismissed at ANY step via an always-visible "Hoppa över"/close (one
tap exits the whole guide), and it never auto-shows again (a persisted `localStorage`
seen-flag, cross-tab safe like the onboarding flag)

**Given** a returning user wants to see it again
**When** they open Settings
**Then** a "Visa guide igen" entry re-launches the guide on demand

**Given** the app is mobile + desktop with very different layouts
**When** the guide renders
**Then** each step's anchor/caption is positioned correctly for the current breakpoint
(mobile bottom-sheet + top slider vs desktop side panel + chip strip) — the guide is
responsive, not a fixed-coordinate overlay

**Given** WCAG 2.1 AA
**When** the guide is open
**Then** focus is trapped in the current step, ESC exits, the highlighted element has an
accessible description, copy is Swedish-first (`next-intl`), and it respects
`prefers-reduced-motion`

**Design Gate Criteria:**
- **Visual:** Coach-mark styling matches the design tokens (no raw colours/shadows);
  amber-pin and grey-pin swatches match the real pins
- **Behaviour:** Skippable at any step (one tap); shows once; re-openable from Settings;
  correct anchoring on mobile AND desktop
- **Animation:** Gentle step transitions honoring `prefers-reduced-motion`
- **Visual validation:** First-run guide (mobile + desktop, first + a middle step) vs a
  new reference passes

### Story 12.12: Venue Photos — Supabase Storage Hosting + Render/Fallback Fixes

_Context (2026-07-08, grounded):_ thumbnails are a `{ alt, initials, url? }` jsonb
rendered by plain `<img>` (not `next/image`, so no `next.config` change needed). Today:
the **list card** already degrades a broken URL to initials (`VenueCard` has an
`onError` guard); the **desktop quick-info** card does NOT (`VenueQuickInfo` has no
`onError` → a 404 shows a broken image); and the **detail hero never renders the photo
at all** — it reads `thumbnail` only for alt text and always shows the placeholder. The
fixture currently hotlinks `images.unsplash.com` (fragile, unlicensed for product use).

As a **maintainer adding real venue photos**,
I want a stable place to host them and every surface to render them (and degrade
gracefully),
So that photos actually show and never break to a broken-image icon.

**Acceptance Criteria:**

**Given** photos need hosting for ~50–100 venues
**When** they are stored in a **public Supabase Storage bucket** (the app already runs on
Supabase; stable public URLs `…/storage/v1/object/public/<bucket>/<slug>.jpg`, no
hotlink/licensing risk) and each venue's `thumbnail.url` is set to its public URL (keep
`initials` populated as the fallback)
**Then** the sanitizer accepts the URL unchanged (http/https allowed) and no
`next.config`/CSP change is required (plain `<img>`)

**Given** the app renders thumbnails via plain `<img>` (no `next/image` auto-resize), so an
original phone/camera photo would download full-size on the list card + detail hero across
50–100 venues — a real bandwidth + LCP regression against the perf budget
**When** the storage convention is defined
**Then** it MANDATES optimized renditions — explicit max dimension/byte/format limits (e.g.
a small card thumbnail + a larger hero rendition, WebP/JPEG, capped px + KB), NOT raw
uploads — so no surface ever downloads a multi-megabyte original; the doc records the exact
limits/rendition sizes to produce before uploading

**Given** the thumbnail contract is a single `{ alt, initials, url }` and VenueCard,
VenueQuickInfo, AND the detail hero all read that ONE `url` — so "a card thumbnail AND a
hero rendition" can't be selected without a contract to carry both
**When** renditions are introduced
**Then** the story defines HOW each surface picks its rendition — either add explicit fields
(e.g. `thumbnail.cardUrl` / `thumbnail.heroUrl`, back-compat with the single `url`), OR a
**deterministic URL convention** (e.g. `<slug>-card.webp` / `<slug>-hero.webp`) the surfaces
derive — with tests — so cards load the small file and the hero the large one (never a card
downloading the hero, nor a blurry hero from the card file)

**Given** the detail hero ignores `thumbnail.url` today
**When** `VenueDetailContent` HeroImage is wired to render `thumbnail.url` (object-cover)
with its OWN `onError`→placeholder
**Then** the real photo shows on the detail overlay, and a broken/missing URL degrades to
the branded placeholder (never a broken image)

**Given** `VenueQuickInfo` has no `onError`
**When** the same `onError`→initials fallback that `VenueCard` already uses is added to
`VenueQuickInfo`'s thumbnail
**Then** a 404/stale URL on the desktop quick-info card degrades to initials, not a broken
image (the list card needs no change; the mobile anchored quick-info already forces the
placeholder)

**Given** `docs/venue-data-load.md` documents the thumbnail field
**When** hosting lands
**Then** the doc explains the Supabase Storage bucket convention (upload keyed by slug,
set `thumbnail.url`, keep `initials`) as the recommended path over external hotlinks

**Design Gate Criteria:**
- **Visual:** Photos render on list card, desktop quick-info, and detail hero; broken
  URLs show initials/placeholder (never a broken-image icon)
- **Behaviour:** Missing `url` → initials everywhere; the mobile anchored quick-info is
  unchanged (still placeholder by design)
- **Animation:** None
- **Visual validation:** Card + quick-info + detail hero with a real photo AND with a
  deliberately-broken URL vs a new reference passes

### Story 12.13: Remove the User-Facing Confidence Indicator (Keep It Internal)

_Context (2026-07-08, maintainer decision):_ the per-venue confidence figure (the faded
"~84%" chip on the card, and its quick-info/detail equivalents) makes users do
unwanted meta-reasoning ("how sure are they about THIS one vs that one?"). The product
promise is simpler: **we show how much of the seating is in sun; we aim for it to be
right; where it's off, user feedback drives corrections.** So confidence is **removed
from all user-facing surfaces**, kept **internally** (still computed, still in
logs/uncertainty reasons, available to the dev tools and the maintainer), and explained
lightly on the About page. Confirmed wiring (2026-07-08 investigation): the visible chip
is `confidenceDisplay.visibleText` on `VenueCard.tsx:248-258`, mirrored on
`VenueQuickInfo` and `VenueDetailContent`; the bold "N% sol" (sun-exposure) is a
SEPARATE value and STAYS.

As a **user**,
I want the map and cards to show just how sunny a place is (and whether it's sunny at
all), without a second "confidence" number to interpret,
So that the app is simple to read and I trust the sun figure at face value.

**Acceptance Criteria:**

**Given** confidence reaches the user through MORE sites than a naive scope names
(grounding pass 2026-07-08): the visible chip `confidenceDisplay.visibleText`
(`VenueCard.tsx:255`; quick-info/detail visible chips were already removed in Story 11.4);
the card's SCREEN-READER name — which is built in **`VenueList.tsx:102-107`** via
`t('cardAria', { confidence: confidenceDisplay.accessibleText })` against the template at
**`messages/sv/venue.json:125`** (+ en), NOT in `VenueCard.tsx` (which only renders
`labels.select`); the quick-info/detail sr-only lines (`VenueQuickInfo.tsx:299`,
`VenueDetailContent.tsx:202`); and the directions handoff's `routeConfidenceLabel`, which is
BUILT in **`MapView.tsx:1624`** (via `routeOverlayLabels`) and merely RENDERED by
`RouteOverlay.tsx:132-135` (+ its `confidence` prop)
**When** the confidence indicator is removed from ALL those surfaces — the bold
sun-exposure "N% sol" is untouched
**Then** no confidence percentage appears anywhere in the user UI — **visible OR
screen-reader**: the visible chip is gone; the `cardAria` template drops its `{confidence}`
segment in BOTH locales (and `VenueList.tsx` drops the `confidence` arg +
`getConfidenceDisplayState` call/import) — `cardAriaObscured` already omits it; the
quick-info/detail sr-only lines drop it; and `routeConfidenceLabel` is removed at its
MapView builder AND the RouteOverlay render block + prop. Layouts reflow cleanly (no empty
slot / stray separator)

**Given** removing the confidence display leaves dead plumbing + tests that CURRENTLY PIN
the old behaviour (so the story is incomplete without naming them)
**When** the removal lands
**Then** the story also: (a) **flips the guard test** `removed-i18n-keys.test.ts:98-103`,
which today ASSERTS the `confidence`/`confidenceApproximate`/`confidenceUnavailable` keys
STAY — move them from "kept" to "removed" (or the dead keys are deleted and this guard is
updated in lock-step, per that file's own no-orphan-keys convention); (b) removes the now-dead
`showVisibleConfidence` prop chain (`VenueCard.tsx:79,104`, `VenueList.tsx:23,45,124`,
`MapView.tsx:1131,1176` + `VenueCard.test.tsx:391`); (c) states the disposition of the
display-only `lib/utils/confidence-display.ts` (all five UI readers removed → delete it, as
it is PRESENTATION not the internal model) and updates ALL its tests — both its direct unit
spec `test/unit/confidence-display.test.ts` (delete/reframe it, else the unit suite goes red
the moment the util is deleted) AND the confidence assertions across the suite — the
`e2e/epic-10-weather-matrix.spec.ts:112-186` visible "Säkerhet …" checks, PLUS (since this
story also removes `routeConfidenceLabel` + the RouteOverlay confidence prop)
`test/e2e/visit-loop.spec.ts` (`/Säkerhet \d+%/`) and `test/components/RouteOverlay.test.tsx`
(the confidence-row rendered/omitted assertions) — so no orphaned util / dead prop / red
test survives anywhere in the suite

**Given** confidence is still valuable internally
**When** the display is removed
**Then** confidence is STILL computed and available server-side (logs, the coverage
pipeline, `prediction_uncertainty` reasons, and any dev/maintainer tooling) — this story
removes only the user-facing NUMBER, not the internal model

**Given** the weather-honesty signal must survive
**When** confidence is gone from the UI
**Then** "it's cloudy / sun is blocked" is still communicated by the **grey pin** and
the venue-detail sky/uncertainty copy (the weather truth is carried by pin STATE, not by
a confidence number) — no honesty regression

**Given** the About page (Story 12.8) planned a "Sol vs Säkerhet" section
**When** confidence is no longer shown
**Then** that section is reframed (see 12.8) to explain the sun % + that accuracy
improves from feedback, rather than teaching a "Säkerhet" number users will never see

**Design Gate Criteria:**
- **Visual:** No confidence chip on card / quick-info / detail; the sun figure and all
  other chrome are unchanged; clean reflow
- **Behaviour:** Sun %, sunny/grey verdict, and the grey-pin weather signal are all
  unchanged; only the confidence number is gone
- **Animation:** None
- **Visual validation:** Card / quick-info / detail vs a rebaselined reference — the
  confidence chip is absent, nothing else moved

> **Knock-on effects (all handled):** (1) With confidence not displayed, the
> `SUNNYSEAT_COVERAGE_CAP` cap (which clamps the DISPLAYED confidence) no longer has any
> user-facing effect — see the reframed Story 12.2, which drops the flag as cleanup and
> repurposes the walk/feedback verification toward finding and fixing wrong sun-%
> predictions rather than gating a shown confidence. (2) Story 12.8's confidence section
> is reframed accordingly. (3) **The confidence number is NOT the only cap-driven user
> surface:** `buildPredictionUncertainty` derives the public uncertainty TIER from numeric
> confidence (`uncertaintyLevelFromConfidence`, `sun-engine.ts:1122` — `<50 high, <75
> medium`), rendered as "Låg osäkerhet / Osäker prognos" copy. So the cap still moves
> user-visible uncertainty LABELS after the chip is gone — handled in Story 12.2 (decouple
> or intentionally re-baseline that copy when the cap is removed/simplified).

### Story 12.14: Hide Closed Venues (Open-at-Selected-Time Filter)

_Context (2026-07-08, maintainer decision):_ a venue that isn't open right now is noise
on the map — you can't go sit there. So a venue that is **closed at the currently
selected time is hidden** from the map (and list). Crucially this keys off the
**selected** instant, not just "now": with the time/date planner set to a future moment
when the venue IS open, it reappears — so the planner naturally answers "where can I sit
in the sun at 18:00 on Saturday?" only among places actually open then. This builds on the
per-weekday `opening_hours` already on the DTO (Story 11.9) and the deferred is-open-now
guard (11.9 review) — the same `isWithin(now, interval)` logic, now load-bearing.

As a **user browsing the map**,
I want to see only venues that are open at the time I'm looking at,
So that every pin is somewhere I could actually go — and when I plan a future time, I see
what's open then.

**Acceptance Criteria:**

**Given** each venue carries per-weekday `opening_hours` on the list DTO, and the app has
a selected instant (now by default, or the planner's date+time), in Europe/Stockholm — but
today the quick-info/detail chrome formats hours with the CURRENT wall-clock `new Date()`
passed into `formatOpeningHours`, NOT the selected instant
**When** the map + list render (and on every time-scrub / date-change)
**And** to stay consistent, the "Öppet till HH:MM" line / ÖPPET badge must be DERIVED from
the SAME selected instant as the filter (or suppressed in planned-time mode) — otherwise a
venue that correctly reappears for Saturday 18:00 would still show today's close time (the
filter and the copy disagreeing); this closes the deferred `quickInfoOpeningHours` /
`new Date()` weekday-roll item from the 11.9 review
**Then** venues that are **CLOSED at the selected instant** are hidden from **every pin +
list source, not just the main nearby list** — MapView builds pins from the filtered list
PLUS `activeFavouriteVenueRows` PLUS `selectedVenuePreviewForMap` (`MapView.tsx:516-530`),
and `/favoriter` renders its own `favouriteVenueRows` list — so the open-at filter (and the
counts) must apply to ALL of them, and re-appear when the selected time falls inside their
hours — computed **client-side** from `opening_hours` + the selected weekday/time (zero extra
fetch; the hours are already loaded, consistent with the scrub=0 invariant)

**Given** past-midnight sessions (a venue open 18:00→02:00 is open at 01:00 as part of the
PRIOR day's session)
**When** the open/closed test runs
**Then** it uses a NEW dedicated **`isVenueOpenAt(hours, instant)`** predicate — there is
NO is-open helper today: `opening-hours.ts` only has `coerceInterval` + `formatOpeningHours`
(which formats the current day's close, with NO `open ≤ t < close` / prior-day check — this
IS the deferred is-open-now guard, never built). The helper checks the current weekday's
interval AND, when `close < open`, the PRIOR weekday's interval (so a venue open 18:00→02:00
shows at 01:00), with unit tests for both — reused everywhere the filter runs so before-open
/ after-close and the 01:00 case are correct

**Given** a precise distinction the contract already encodes (`coerceOpeningHours`,
`venue-store.ts:569-573`): the **entire `opening_hours` field absent/undefined** = hours
UNKNOWN, but a **missing weekday key or `null` entry** = explicitly CLOSED that day
**When** the filter runs
**Then** only the truly-unknown case shows: `openingHours === undefined` → **NOT hidden**
(we never assert "closed" without data — honesty-first); but `hours[selectedWeekday]`
missing/`null` → **HIDDEN** (that day IS closed). Tested both ways — a hours-less venue
stays visible, a venue closed on the selected weekday is hidden (don't over-broaden
"unknown" to swallow the closed-weekday case)

**Given** filtering changes the visible set
**When** venues are hidden
**Then** the empty state and any "N platser" counts reflect the FILTERED set, and this
filter stacks (AND) with tag filtering and the Story-12.6 sunny/grey pin logic (only open
venues get pins, then amber/grey applies)

**Given** a client-side time filter and the server's `MAX_RESULTS = 50` truncation conflict
once a city exceeds the cap: if the server returns the top-50 BEFORE the client hides
closed venues, an open venue just outside the slice can never appear; if the server filters
by the selected time FIRST, scrubbing is no longer purely client-side
**When** the data set is a single city (~50–100 venues — small and bounded)
**Then** the intended fix is stated: **return the FULL city candidate set** so the client
holds every venue and can filter by the selected time locally without ever dropping an open
one — preserving the zero-fetch scrub. CRITICAL: do NOT literally "raise/remove `MAX_RESULTS`"
— it is ALIASED to the favourites-by-id cap (`const MAX_IDS = MAX_RESULTS`, `route.ts:55`,
which also drives `MAX_IDS_QUERY_LENGTH` arithmetic at `route.ts:56/174` and the id-count
break at `route.ts:183`); touching `MAX_RESULTS` would silently uncap/break the
favourites-by-ids endpoint. Instead **introduce a separate list-cap constant** (or raise
only the `matchedVenues` slice at `route.ts:419-431`), leaving `MAX_IDS` /
`MAX_IDS_QUERY_LENGTH` untouched. (The cap was written for a scale this MVP isn't at; a
future multi-city scale would revisit it, e.g. viewport-bounded candidate sets)

**Design Gate Criteria:**
- **Visual:** Closed venues have no pin/list row at the selected time; the map declutters
  outside opening hours
- **Behaviour:** Re-filters live on time-scrub + date-change (zero fetch); past-midnight
  correct; unknown-hours venues always shown; stacks with tags + 12.6 pins
- **Animation:** Pins entering/leaving on a time change use the existing pin fade — no jarring
  flash or layout jump when the set changes
- **Visual validation:** Map + list at a time when some venues are closed vs a time when
  they're open (mobile + desktop) vs a new reference passes

> **Open questions for planning:** (1) does "hide closed" apply to **search** too, or should
> a by-name search still surface a closed venue (marked closed)? (2) should a **saved
> favourite** that's closed be hidden like the rest, or always shown with a "stängt" marker
> (a user deliberately saved it)? Default here is hide everywhere for map/list; both search
> and the favourites-when-closed treatment are maintainer calls at story creation.