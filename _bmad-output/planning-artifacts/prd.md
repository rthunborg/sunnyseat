---
title: 'PRD — SunnySeat (Gothenburg)'
version: 'v3.1'
status: Complete
owner: Rasmus
date: '2026-04-07'
stepsCompleted:
  - 'step-01-init'
  - 'step-02-discovery'
  - 'step-02b-vision'
  - 'step-02c-executive-summary'
  - 'step-03-success'
  - 'step-04-journeys'
  - 'step-05-domain-skipped'
  - 'step-06-innovation'
  - 'step-07-project-type'
  - 'step-08-scoping'
  - 'step-09-functional'
  - 'step-10-nonfunctional'
  - 'step-11-polish'
  - 'step-12-complete'
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: brownfield
inputDocuments:
  - '_bmad-output/planning-artifacts/brief/project-brief.md'
  - '_bmad-output/planning-artifacts/prd.md (v2.0 — superseded)'
  - '_bmad-output/planning-artifacts/architecture.md'
  - 'project-context.md'
  - 'nextjs-app/docs/design/DESIGN.md'
  - 'nextjs-app/docs/design/references/screens/ (21 screen images — 13 mobile, 8 desktop)'
  - 'nextjs-app/docs/design/references/components/ (41 component images)'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
documentCounts:
  briefs: 1
  research: 0
  projectDocs: 4
  design: 2
workflowType: 'prd'
---

# PRD — SunnySeat (Gothenburg) · v3.1

> Owner: Rasmus · Status: **Complete** · Last updated: 2026-05-19
> Supersedes PRD v2.0 (backend-only). This version covers the customer-facing MVP front-end and preserves growth/monetization work as post-MVP planning.
>
> **MVP scope correction (2026-05-19):** time planner, future date picker, future sun simulation, and favourites are free MVP functionality. Season Pass, Swish payments, premium activation, premium recovery, and payment-failure flows are deferred to Future Monetization. Preserved details live in `future-monetization-season-pass.md`.
>
> **Visual source refresh (2026-05-21):** MVP visual validation uses only the refreshed Claude Design MVP Unlocked pages: `SunnySeat MVP Mobile Unlocked.html` and `SunnySeat MVP Desktop Unlocked.html`. Post-MVP Unlocked/Locked pages are future-only references for payment, paywall, Season Pass, and locked-state work.

## Executive Summary

SunnySeat is a sun prediction engine for Gothenburg that answers a question no existing tool can: "which venue's outdoor seating is in direct sun right now?" It combines 2.5D building shadow geometry with real-time solar position calculations and Met.no weather data to produce venue-level, minute-granularity sunlight predictions with confidence scoring. The backend engine (sun/shadow calculations, weather integration, venue APIs, admin operations) is built and deployed. This PRD defines the customer-facing MVP front-end — a responsive PWA with a map-centric UI, free planning tools, and favourites. Consumer monetization through Season Pass and Swish is preserved for a future version after usage has grown.

Target users are locals and visitors in Gothenburg seeking a sunny outdoor seat now or later today. The product solves the ephemeral, time-sensitive hunt for sun in a Nordic city where sunshine is precious and building shadows shift constantly. Users currently waste time wandering between venues or guessing from generic weather apps that answer "is it sunny in Gothenburg?" but never "is it sunny on *this* patio?"

### What Makes This Special

The core IP is the sun prediction engine: NREL Solar Position Algorithm + Turf.js 2.5D shadow geometry + Met.no cloud cover, blended into a single confidence-scored sunlight state per venue. No competitor offers patio-level sun prediction at any granularity. The venue database is the delivery mechanism, not the product — the prediction engine is the moat.

Two "aha" moments define the user experience: (1) opening the map and instantly seeing amber pins on venues that are sunny right now, and (2) arriving at a venue with no available seats and immediately discovering a sunny alternative nearby. The second moment — recovery from disappointment — transforms a frustrating dead-end into a delightful redirect.

The design reinforces this emotionally. A warm amber/sand palette, frosted glass overlays, and sun-tinted shadows make the interface itself feel sunny. The UI doesn't just list data — it sells the feeling of finding sun.

## Project Classification

- **Project Type:** Web application (PWA, map-centric SPA, responsive mobile + desktop)
- **Domain:** General — consumer lifestyle/location app with geospatial and solar-science domain specifics
- **Complexity:** Medium — the 2.5D shadow geometry and solar calculations add technical depth beyond a standard web app, but no regulatory or compliance constraints apply
- **Project Context:** Brownfield — backend APIs (Epics 1–7) are complete and deployed on Vercel/Supabase. This phase builds the customer-facing front-end and growth features on top of existing infrastructure

## Success Criteria

### User Success

- **First "aha" moment:** ≥70% of new users see a map with sunny venue pins within 10 seconds of granting location (onboarding → map load). Measured via performance timing + analytics event.
- **Decision time:** Median time from map load to tapping a venue detail ≤60 seconds.
- **Redirect discovery:** ≥30% of users who view a venue detail also view at least one other venue in the same session — indicating the "nearby sunny alternative" flow is working.
- **Accuracy trust:** ≥80% of feedback submissions confirm the prediction was correct ("Was this sunny? Yes"). Rolling 14-day average.
- **Return usage:** D7 retention ≥20%. D30 retention ≥10%. Seasonal re-activation (users returning the following sun season) ≥15%.

### Business Success

- **Venue database:** 50 verified outdoor seating venues at launch. 100 within 3 months via OSM ingestion + crowdsource verification.
- **B2B partners:** 3 paid partner venues within 3 months of launch. 10 within 12 months.
- **Planner adoption:** ≥25% of monthly active users interact with the free time/date planner within the first sun season.
- **Favourites adoption:** ≥15% of monthly active users save at least one venue within the first sun season.
- **Monthly active users:** 500 MAU within first month of sun season. 2,000 MAU by end of first full sun season.
- **Operational cost:** ≤$100/month at ≤10,000 MAU.

### Technical Success

- **Core Web Vitals (mobile):** LCP ≤4.5s (re-baselined 2026-05-06 in Story 1.6 Task 6 — see NFR2 below), INP ≤200ms, CLS ≤0.1.
- **Map interaction:** Map pan/zoom at 60fps. Pin rendering for 50 venues ≤100ms.
- **API response:** <200ms p95 for venue search and sun exposure endpoints.
- **Availability:** 99.5% uptime monthly.
- **PWA:** Lighthouse PWA score ≥90. Installable on iOS Safari and Android Chrome.
- **Accessibility:** WCAG 2.1 AA compliance on all customer-facing screens.

### Measurable Outcomes

| Metric | Target | Timeframe | Signal |
|--------|--------|-----------|--------|
| Venues at launch | 50 verified | Launch day | Database count |
| First-session engagement | ≥3 venue detail views per session | Month 1 | Analytics |
| Prediction accuracy | ≥85% confirmed correct | Rolling 14-day | Feedback API |
| Planner adoption | ≥25% of MAU | First sun season | Planner/date interactions |
| Favourites adoption | ≥15% of MAU | First sun season | Local favourite saves |
| MAU | 2,000 | End of first sun season | Unique sessions |
| Partner revenue | 3 paid partners | 3 months post-launch | Contracts |

## Product Scope

### Strategy

**Approach:** MVP launch focused on adoption and trust before consumer monetization. The backend engine is validated (22 passing test suites). The open question is "do users find, trust, and return to it?" — best answered by making planner, date picker, and favourites free while preserving monetization work for a later version.

**Resource:** Solo developer (Rasmus) with AI-assisted development. Full-stack TypeScript.

### Phase 1 — Customer-Facing Front-End

| Capability | Journey | Priority |
|-----------|---------|----------|
| Onboarding with geolocation | Lina, Erik, Sara | Critical |
| Map with sun-state venue pins (amber/grey) | All consumer journeys | Critical |
| Venue list — bottom sheet (mobile) / side panel (desktop) | Lina, Erik | Critical |
| Venue detail — bottom sheet (mobile) / overlay panel (desktop) | Lina, Erik, Sara | Critical |
| Time slider (today, free tier) | Lina, Erik | Critical |
| Feedback flow ("Was this sunny?" + outdoor seating confirmation) | Lina, Erik | Critical |
| Routing/ETA to venue | Lina, Erik | High |
| Future date picker + future time simulation (free MVP) | Sara | High |
| B2B Golden Pin + SOL NU badge + partner deep-links | Marcus | High |
| Favourites | Lina, Erik | High |
| Recent history | Erik (returning) | Medium |
| User-submitted venue reviews | Erik | Medium |
| Push notifications (sun state change on favourites) | Favourites users | Medium |
| Social sharing via native share API | Lina | Medium |
| Partner analytics dashboard (views, routes by sun state) | Marcus | Medium |
| OSM ingestion + crowdsource verification | Data moat | Medium |
| About page (how it works, data sources, accuracy) | All | Low |
| 404 page (friendly redirect to map) | All | Low |
| Responsive: mobile-first (375px+), tablet, desktop (1024px+) | All | — |
| PWA: installable, offline shell, app-like experience | All | — |
| WCAG 2.1 AA accessibility | All | — |

### Future Monetization — Season Pass & Swish (post-MVP)

- Season Pass positioning, pricing, and feature boundaries
- Premium upsell/paywall UX
- Swish mobile deep-link and desktop QR payment flows
- Payment processing, failure, retry, and recovery states
- Premium activation persistence without accounts

### Phase 2 — Admin UI Rebuild (after Phase 1)

- Admin front-end for venue CRUD with geometry editing
- Building data import and management UI
- Accuracy dashboard with per-venue trends
- Data quality tools and venue validation UI
- UX design happens when Phase 1 is complete — no resources yet

### Contingency: Minimal Launchable Slice

If circumstances require an early ship, the core sun discovery loop can launch independently:
- Onboarding + map + pins + venue list + venue detail + time slider (today) + feedback
- Covers Lina's and Erik's journeys completely
- Excludes: Season Pass/Swish, B2B, reviews, push, routing, social, analytics
- **Not the plan** — documented as fallback only

### Out of Scope

- **Multi-city expansion** — engine is city-agnostic by design but Gothenburg-only for this PRD
- **ML-based patio detection** — manual + OSM + crowdsource for venue discovery
- **Consumer monetization in MVP** — Season Pass, Swish payments, premium activation, recovery, and payment failure flows are future work
- **User accounts** — no registration or account system for MVP
- **Bookings/loyalty programs**

## User Journeys

### Journey 1: "Sun Right Now" — Lina, 26, UX designer

**Opening Scene:** It's a Tuesday at 16:45. Lina's wrapping up early at her studio in Majorna. The sky broke open an hour ago after a grey morning and she can feel the sun through the window. She texts two friends: "Afterwork? Somewhere sunny?" Nobody knows where the sun is actually hitting right now.

**Rising Action:** Lina opens SunnySeat on her phone. The onboarding asks for her location — she taps "Använd min plats." Within seconds, a warm sand-coloured map appears with amber pins scattered across Linnéstaden and Långgatorna. Grey pins mark venues in shadow. She sees three amber pins within walking distance. She taps the closest — Kafé Magasinet — and a quick-info card slides up: "Sol 13:00–18:30 · 85% · 850m." She taps for details: a hero photo of the patio, a sun timeline showing solid amber through 18:30, and a "Visa Rutt" button.

**Climax:** She taps "Visa Rutt" — 11 minutes walk. She screenshots the venue detail and drops it in the group chat. "This place has sun until half six. Walking there now."

**Resolution:** They arrive, the patio is sunny exactly as predicted. Lina saves the venue to favourites. When the app asks "Var det soligt när du kom?" she taps "Ja." She tells her friends about the app.

**Requirements revealed:** Onboarding with location permission, map with sun-state pins, venue quick-info card, venue detail with sun timeline, routing/ETA, favourites, feedback prompt, social sharing (screenshot-friendly UI).

### Journey 2: "The Redirect" — Erik, 28, software developer

**Opening Scene:** It's Friday 17:30. Erik and his partner are heading to their usual spot, Bar Himmel on Andra Långgatan. The sun is out and the whole city is outside. They're walking there on autopilot.

**Rising Action:** They arrive — every table is taken. Erik pulls out his phone and opens SunnySeat. He can see Bar Himmel's pin is amber, but he also sees two other amber pins within 200 metres. He taps Restaurang Bellora — "Sol 15:00–19:15 · 92% · 180m." The confidence is even higher and it's right around the corner.

**Climax:** "There's a place 2 minutes away that's sunny until seven," Erik says. They walk there. Tables are available. The sun is on them.

**Resolution:** What could have been a frustrating 20-minute wander between venues turned into a 2-minute redirect. Erik leaves a review: "Bra uteservering, perfekt eftermiddagssol." Next Friday, he checks SunnySeat before leaving the office instead of after arriving.

**Requirements revealed:** Map with multiple visible sunny venues near each other, quick comparison between venues (distance, sun window, confidence), review submission flow, the "nearby alternatives" discovery pattern as a core UX affordance.

### Journey 3: "Planning Saturday Fika" — Sara, 24, nursing student

**Opening Scene:** It's Wednesday evening. Sara is planning a birthday gathering for Saturday — 8 friends, outdoor seating, sun required. She doesn't want to guess and hope. She opens SunnySeat and moves the time slider to Saturday 14:00.

**Rising Action:** Sara opens the time/date planner, picks Saturday, and sets the time to 14:00. There is no paywall or account step. The app updates the map to show which venues are predicted to be sunny at that future date and time.

**Climax:** She finds De Matteo — sunny from 12:00 to 17:30, 78% confidence (cloud cover factored in). She saves it to favourites, screenshots the detail card, and sends it to the birthday group chat.

**Resolution:** Saturday comes. The sun is there as predicted. Sara returns the following week to plan a study break and quickly reopens the saved venue from favourites. No account or payment was required for the MVP planning loop.

**Requirements revealed:** Free time slider, free date picker, future time simulation, weather confidence for future dates, favourites persistence, screenshot-friendly venue detail.

### Journey 4: "The Venue Owner" — Marcus, 35, owner of a wine bar in Vasastan

**Opening Scene:** Marcus has a wine bar with a small courtyard that gets gorgeous afternoon sun from 14:00–18:00 in summer. His problem: nobody knows the courtyard exists unless they walk in. On sunny days he has 6 empty tables while places on Avenyn are packed.

**Rising Action:** Marcus hears about SunnySeat from another venue owner. He contacts SunnySeat about becoming a partner. His venue gets a Golden Pin on the map — larger, more prominent, with a warm glow. When his courtyard is in direct sun, a "SOL NU" badge appears on his venue card in the list.

**Climax:** On the first sunny Thursday after partnering, Marcus watches his terrace fill up between 14:00 and 15:00. Three groups mention they found him on SunnySeat. His courtyard goes from the neighbourhood's hidden secret to a destination.

**Resolution:** Marcus can see analytics showing how many users viewed his venue, tapped for details, and requested a route — on sunny days versus cloudy days. He renews his partner subscription for the next season.

**Requirements revealed:** B2B partner onboarding flow, Golden Pin visual differentiation, "SOL NU" badge on venue cards, partner analytics dashboard, partner deep-link to venue detail.

### Journey 5: "The Admin" — Phase 2 (lighter detail)

**Opening Scene:** The SunnySeat admin needs to add 10 new venues that were submitted via OSM ingestion and crowdsource verification. Three venues have incorrect patio polygon data that's producing bad sun predictions.

**Rising Action:** The admin logs into the admin UI, reviews the queue of unverified venue candidates, approves 8, rejects 2 (no longer have outdoor seating). They then open the accuracy dashboard, see that three venues have accuracy below 70% in the last 14 days, and inspect their patio polygons.

**Climax:** The admin adjusts the patio polygon on one venue using the geometry editor — the polygon was covering a section that's now enclosed. They re-trigger precomputation for that venue. Accuracy improves to 88% within the next reporting cycle.

**Resolution:** The admin reviews the overall system accuracy: 86% across all venues. They import a new batch of building data from Lantmäteriet to improve shadow accuracy for a neighbourhood where new construction changed the skyline.

**Requirements revealed:** Admin authentication, venue candidate review queue, venue CRUD with geometry editor, accuracy dashboard with per-venue drill-down, building data import, precomputation trigger. (All Phase 2 — no UX resources yet.)

### Journey Requirements Summary

| Journey | Key Capabilities Revealed |
|---------|--------------------------|
| Lina — "Sun right now" | Onboarding, map + pins, venue cards, sun timeline, routing/ETA, favourites, feedback, sharing |
| Erik — "The redirect" | Nearby venue comparison, quick switching between venues, reviews, the discovery-over-disappointment pattern |
| Sara — "Planning Saturday" | Free planner, date picker, future time simulation, weather confidence, favourites |
| Marcus — "Venue owner" | B2B partner features, Golden Pin, SOL NU badge, partner analytics, deep-links |
| Admin — Phase 2 | Admin auth, venue queue, geometry editor, accuracy dashboard, building import |

## Innovation & Novel Patterns

### Detected Innovation Areas

**Novel data pipeline:** SunnySeat combines three existing technologies — NREL Solar Position Algorithm, Turf.js 2.5D building shadow geometry, and Met.no weather data — into a per-venue, per-minute sunlight prediction with confidence scoring. The individual components are well-established; the combination into a consumer-facing "is this patio sunny right now?" answer is genuinely new. No competitor offers patio-level sun prediction at any granularity.

**"Recovery redirect" UX pattern:** Most map/discovery apps optimize for the user's first choice. SunnySeat's design deliberately optimizes for the *second* choice — the moment a user's first pick falls through (venue full, no seats) and the app immediately surfaces a sunny alternative nearby. This "recovery from disappointment" interaction is an unusual and intentional design pattern that transforms dead-ends into delightful redirects.

**Confidence as a first-class UI element:** Rather than hiding prediction uncertainty, SunnySeat foregrounds it as a percentage blending geometric certainty with real-time cloud cover. Making this number trustworthy enough to act on — "85% means I should go" — is a novel product challenge that most apps sidestep.

### Market Context & Competitive Landscape

No direct competitor offers venue-level sunlight prediction in any city. Indirect alternatives (Google Maps, weather apps, social media) answer adjacent questions but not "is this patio sunny right now?" The closest analogue is ski resort snow-condition apps, which combine terrain data with weather to predict conditions — but applied to urban outdoor seating, this combination is uncontested.

### Validation Approach

The accuracy feedback loop ("Var det soligt när du kom?") serves double duty: it's both a user feature (improving predictions) and the primary innovation validator. The rolling 14-day accuracy metric (target: ≥85%) directly measures whether the novel data pipeline produces trustworthy predictions. If accuracy drops, the feedback data pinpoints which venues or time windows are failing.

### Risk Mitigation

The primary innovation risk is shadow accuracy with LOD1 building data (estimated heights rather than surveyed). If predictions feel wrong even once, user trust erodes. Mitigations already in the design:
- Admin polygon overrides for known inaccuracies
- User feedback loop to surface problem venues
- Transparent confidence scoring that sets expectations rather than overpromising
- Height hints and manual corrections for venues where LOD1 heights are insufficient

## Web App Specific Requirements

### Project-Type Overview

SunnySeat is a single-page application built on Next.js App Router, where the map is the persistent canvas and all interactions (venue discovery, detail views, planning, favourites, feedback) layer on top as bottom sheets, side panels, and modals. The app is mobile-first, installable as a PWA, and optimized for spontaneous outdoor use on mobile networks.

### Browser Support Matrix

| Browser | Priority | Minimum Version | Notes |
|---------|----------|-----------------|-------|
| Chrome (Android + Desktop) | Primary | Last 2 major versions | Primary mobile + desktop target |
| Safari (iOS + macOS) | Primary | iOS 16+ / Safari 16+ | PWA install, geolocation |
| Firefox (Desktop) | Supported | Last 2 major versions | Full functionality expected |
| Edge (Desktop) | Supported | Last 2 major versions | Chromium-based, minimal extra effort |

### Responsive Design

Mobile-first design with three breakpoints (from Figma design system):
- **Mobile:** 375px minimum, designed at 390px. Bottom sheet navigation, floating glass controls, 40px bottom nav bar.
- **Tablet:** 768px+. Uses mobile layout — no dedicated tablet Figma frames.
- **Desktop:** 1024px+. Designed at 1280px. Top navbar with logo + search, 190px venue side panel, 390px venue detail overlay. No bottom nav — replaced by top navigation.

Type scale and spacing are uniform across breakpoints. Responsive adaptation is structural (layout reflow), not typographic.

### SEO Strategy

Minimal. Organic search is not a user acquisition channel. No SSR venue pages needed. Basic meta tags for:
- Homepage: "SunnySeat — Hitta uteplatser i solen i Göteborg"
- Open Graph tags for social sharing link previews when users share venue screenshots/links

### PWA & Offline

- **Installable:** Service worker with app manifest. Add-to-homescreen prompt on iOS Safari and Android Chrome.
- **Offline:** App shell loads offline with a "no connection" message. Online connectivity required for all functionality.
- **No background sync or offline data caching** — acceptable given the real-time nature of sun predictions.

### Implementation Considerations

- **Map library:** MapLibre GL JS (open-source, no API key, vector tiles). Map is the root-level persistent element — never unmounted during SPA navigation.
- **State management:** Map viewport, selected venue, time slider position, selected date, and favourites as client-side state. Venue data fetched from APIs.
- **Deep-linking:** URL reflects current state (selected venue, time) for shareability — e.g., `sunnyseat.se/?venue=kafe-magasinet&t=14:30`. No server-side rendering needed, but URL parsing on load restores state.
- **Future Swish integration:** Mobile would use `swish://` deep-link to open Swish app. Desktop would use QR code rendered in-app. Both would poll `/api/payments/status/[id]` for confirmation. This is post-MVP and inactive.
- **Push notifications:** Web Push API via service worker. Requires user opt-in. Trigger: sun state change on a favourited venue.

## Risks & Mitigations

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| MapLibre GL JS performance on low-end Android | Core experience degraded | Test on budget Android devices early. Pin clustering if >50 venues. |
| Swish merchant account approval delays | Future monetization delayed | Keep Season Pass/Swish work archived; do not block MVP planner/date/favourites. |
| Future paid-status persistence without accounts | Future paid users could lose paid status | Preserve recovery design in Future Monetization before reactivating payment integration. |
| PWA install friction on iOS Safari | Lower engagement | Clear install prompts, test Safari-specific PWA quirks early. |
| Bundle size with map library | Slow initial load | Async-load MapLibre, code-split all non-map features. |

### Market Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Shadow accuracy doesn't feel trustworthy | Users don't return | Launch with best-quality venues first (top 50). Transparent confidence %. Feedback loop. |
| Seasonality — app only useful March–October | Low off-season retention | Free date picker encourages planning. Push notifications re-engage when sun returns. |
| 50 venues too sparse for useful coverage | Users don't find nearby options | Prioritise venue density in popular areas (Linnéstaden, Långgatorna, Avenyn, Haga). Quality over quantity. |

### Resource Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Solo developer bandwidth | Slow delivery | AI-assisted development, existing backend reduces scope. Minimal slice as fallback. |
| No UX resources for Phase 2 (admin) | Phase 2 blocked | Defer admin UX until Phase 1 complete. Admin APIs functional via direct API calls. |

## Functional Requirements

### Venue Discovery

- **FR1:** Users can view venues with outdoor seating on an interactive map, visually distinguished by current sun exposure state (sunny vs. shaded).
- **FR2:** Users can view a list of nearby venues ranked by sun exposure relevance, showing name, sun time range, confidence score, and distance.
- **FR3:** Users can search for venues by name or area within Gothenburg.
- **FR4:** Users can see their current location on the map and discover venues relative to their position.
- **FR5:** Users can view venue locations and quickly compare multiple nearby sunny venues to find alternatives.
- **FR6:** The system requests geolocation permission on first visit and offers a default location fallback (Gothenburg centrum) if denied.

### Sun Exposure Intelligence

- **FR7:** Users can view the current sun exposure state and confidence percentage for any venue.
- **FR8:** Users can view a sun timeline for a venue showing when sun exposure starts, peaks, and ends for today.
- **FR9:** Users can scrub through time to see how venue sun states change throughout the current day.
- **FR10:** Users can select a future date and simulate sun exposure states for all venues on that date.
- **FR11:** Users can scrub through time on a selected future date to see predicted sun states.
- **FR12:** The system displays confidence scores that blend geometric sun certainty with weather-based cloud cover uncertainty.
- **FR13:** The system auto-refreshes venue sun states periodically while the app is active, without requiring manual reload.

### Venue Engagement

- **FR14:** Users can view detailed venue information including photos, description, opening hours, and address.
- **FR15:** Users can navigate to a venue using in-app routing with estimated walk/bike time.
- **FR16:** Users can open a venue's location in their device's native map application.
- **FR17:** Users can submit accuracy feedback on whether a venue's sun prediction was correct when they arrived.
- **FR18:** Users can confirm that a venue has outdoor seating, contributing to the verified venue database.
- **FR19:** Users can read reviews written by other users about a venue's outdoor seating experience.
- **FR20:** Users can write and submit a review for a venue they have visited.

### Future Monetization (Post-MVP)

- **FR21:** Future users can view a soft upsell prompt if a future paid feature boundary is introduced.
- **FR22:** Future users can purchase a Season Pass ("Säsongskortet") via Swish payment for a one-time fee.
- **FR23:** The future monetization flow supports Swish payment via mobile deep-link (phone) and QR code (desktop).
- **FR24:** The future monetization flow confirms payment status and activates paid access within seconds of successful Swish transaction.
- **FR25:** Future users can recover paid status on a new device or after clearing browser data without needing a user account.
- **FR26:** The future monetization flow handles payment failures gracefully, displaying clear error states and retry options.

> FR21-FR26 are preserved for post-MVP planning only. They must not gate MVP planner, future date simulation, or favourites.

### Partner & B2B Features

- **FR27:** Partner venues are visually distinguished on the map with enhanced pin styling (Golden Pin).
- **FR28:** Partner venues display a "Sunny Now" badge when their outdoor seating is in direct sun.
- **FR29:** Partner venues can be deep-linked directly from external sources.
- **FR30:** Partners can view analytics showing venue views, detail opens, and route requests segmented by sun state.

### User Personalization

- **FR31:** Users can save venues to a favourites list for quick access.
- **FR32:** Users can view their recently viewed venues.
- **FR33:** Users can receive push notifications when a favourited venue's sun state changes to sunny.
- **FR34:** Users can opt in or out of push notifications.
- **FR35:** Users can share a venue's sun status with others via their device's native share functionality.

### Data Expansion

- **FR36:** The system can ingest venue candidates from OpenStreetMap data tagged with outdoor seating attributes.
- **FR37:** Users can verify or flag venue outdoor seating status through a crowdsource confirmation flow.
- **FR38:** Ingested and crowd-verified venues are queued for admin review before becoming fully active.

### Administration (Phase 2)

- **FR39:** Admins can authenticate via secure login to access admin functionality.
- **FR40:** Admins can create, read, update, and delete venues including their outdoor seating geometry.
- **FR41:** Admins can edit venue patio polygons using a visual geometry editor.
- **FR42:** Admins can upload and process building geometry data files for shadow calculations.
- **FR43:** Admins can view an accuracy dashboard showing prediction accuracy trends per venue and system-wide.
- **FR44:** Admins can review and approve or reject venue candidates from OSM ingestion and crowdsource submissions.
- **FR45:** Admins can trigger precomputation recalculation for specific venues after data corrections.

### Platform & Onboarding

- **FR46:** The app presents a branded onboarding screen on first visit explaining the product and prompting location access.
- **FR47:** Users can view an "About" page explaining how SunnySeat works, its data sources, and accuracy statistics.
- **FR48:** The app displays a friendly 404 page with navigation back to the main map when a non-existent route is accessed.
- **FR49:** The app is installable as a PWA on supported mobile browsers.
- **FR50:** The app displays a "no connection" message when offline, with the app shell remaining functional.

## Non-Functional Requirements

### Performance

- **NFR1:** API response time <200ms at p95 for venue search and sun exposure endpoints under normal load.
- **NFR2:** Largest Contentful Paint (LCP) ≤4.5s on mobile 4G connections (re-baselined 2026-05-06 in Story 1.6 Task 6 from the original ≤2.5s target after Lighthouse mobile + 4× CPU throttling measured 4.3s on the map-primary route; LCP is structurally pinned by MapLibre tile fetch + canvas paint and cannot reach 2.5s without removing the map). Measured via Lighthouse CI `categories:performance` ≥ 0.55 (re-baselined from 0.90; 3-run local median is 0.59–0.61, so 0.55 leaves ~0.05 headroom for CI variance).
- **NFR3:** Interaction to Next Paint (INP) ≤200ms for all interactive elements.
- **NFR4:** Cumulative Layout Shift (CLS) ≤0.1 across all pages.
- **NFR5:** Map pan and zoom at 60fps on mid-range mobile devices (2022+ Android, iPhone 11+).
- **NFR6:** Venue pin rendering for 50 venues completes within 100ms.
- **NFR7:** App shell renders within 2s on 4G. Map tiles and venue data loaded within 4s.
- **NFR8:** Initial route JS ≤ 280 KB gzipped (excluding the MapLibre dynamic chunk). MapLibre dynamic chunk ≤ 320 KB gzipped. Total ≤ 600 KB gzipped. MapLibre GL JS loaded asynchronously (verified by `nextjs-app/scripts/verify-maplibre-async.mjs`). *Re-baselined 2026-05-05 in Story 1.6 Task 4 from the original "<200 KB" target after Plan A tree-shaking + per-pin provider removal could not close the gap with MapLibre + react-dom + motion + next-intl all required at runtime; current architecture keeps motion (Framer integrations), TanStack Query, and next-intl as load-bearing dependencies.*
- **NFR9:** Venue sun states auto-refresh every 5 minutes while the tab/app is active.

### Security & Privacy

- **NFR10:** Zero personally identifiable information (PII) stored in the database. No user accounts, no email addresses, no names.
- **NFR11:** IP addresses hashed (SHA-256 + salt) before storage for rate limiting and duplicate detection.
- **NFR12:** All API endpoints rate-limited: 100 req/min per IP (public), 1,000 req/min (admin).
- **NFR13:** Admin authentication via JWT with token expiry ≤24 hours.
- **NFR14:** All traffic served over HTTPS. No mixed content.
- **NFR15:** Future Swish payment data must be handled per Swish Merchant API security requirements. Transaction IDs stored; no card/bank details persisted.
- **NFR16:** GDPR compliance: no cookies requiring consent beyond session. Privacy policy accessible from About page.
- **NFR17:** Future paid-status recovery mechanism must not expose one user's purchase to another.

### Scalability

- **NFR18:** System supports ≤10,000 MAU within $100/month operational budget (Vercel + Supabase).
- **NFR19:** System handles "sunny day spikes" — 5x normal concurrent traffic — without degraded response times, by leveraging Vercel's auto-scaling serverless functions and Supabase connection pooling.
- **NFR20:** Precomputed sun exposure data used for high-traffic venue queries to avoid on-demand calculation bottlenecks during spikes.
- **NFR21:** Map tile serving offloaded to external tile provider CDN, not SunnySeat infrastructure.

### Accessibility

- **NFR22:** WCAG 2.1 AA compliance on all customer-facing screens.
- **NFR23:** All interactive elements keyboard-navigable with visible focus indicators.
- **NFR24:** Screen reader support for venue list, venue detail, and map controls (ARIA labels, roles, live regions for dynamic updates).
- **NFR25:** Colour contrast ratios meet AA minimums (4.5:1 for body text, 3:1 for large text). Amber palette verified against cream backgrounds.
- **NFR26:** `prefers-reduced-motion` respected: non-essential animations disabled, sheet transitions simplified.
- **NFR27:** Map pins differentiated by icon shape (sun icon), not colour alone, for colour-blind users.

### Integration

- **NFR28:** Met.no Locationforecast 2.0 API: User-Agent attribution header included per terms of service. Graceful degradation if API is unavailable (sun predictions served without weather confidence).
- **NFR29:** Future Swish Merchant API integration supports test environment for development. Webhook handler idempotent — duplicate callbacks produce no side effects.
- **NFR30:** MapLibre GL JS: Vector tile source must support Gothenburg coverage at zoom levels 10–18. Tile loading failures display fallback map background.
- **NFR31:** Web Push API: Push subscription management handles browser permission revocation gracefully. Failed deliveries do not retry indefinitely.
- **NFR32:** OpenStreetMap data ingestion: Overpass API queries respect rate limits. Ingestion failures are logged and retryable without data corruption.

### Reliability

- **NFR33:** 99.5% uptime measured monthly, excluding planned maintenance communicated ≥24 hours in advance.
- **NFR34:** Weather data staleness: if Met.no data is older than 2 hours, confidence scores are capped and a freshness indicator is shown.
- **NFR35:** Precomputed sun exposure data regenerated daily. If precomputation fails, previous day's data served with reduced confidence.
- **NFR36:** Future Swish payment status polling times out after 5 minutes with a clear "payment not confirmed" message and retry option.
- **NFR37:** Service worker caches app shell for offline display. Cache invalidation on new deployment.

## Design Artifacts

### Visual source of truth

All UI screens are designed in Figma (refined from Stitch). The Figma designs are the authoritative visual reference for all frontend implementation. The dev agent reads design context live from Figma via the Figma MCP.

- **Figma file:** `SunnySeat` — key `Oh75qPnFfSWKHSsyVSBQbT` ([open in Figma](https://www.figma.com/design/Oh75qPnFfSWKHSsyVSBQbT/SunnySeat))

### Screen inventory

#### Mobile (13 screens — designed at 390px)

| Screen ID | File | Description |
|-----------|------|-------------|
| map-primary | `map-primary-mobile.png` | Main map view with sun-state venue pins |
| map-selected-venue | `map-with-selected-venue-mobile.png` | Map with selected venue quick-info card |
| venue-list | `map-panel-venues-mobile.png` | Venue list bottom sheet |
| venue-detail | `venue-detail-mobile.png` | Venue detail bottom sheet |
| onboarding | `onboarding-mobile.png` | Welcome screen with location permission |
| premium-upsell | `premium-planner-uppsell.png` | Future Monetization reference only — inactive in MVP |
| premium-paywall | `premium-paywall-mobile.png` | Future Monetization reference only — inactive in MVP |
| premium-processing | `premium-paywall-processing-mobile.png` | Future Monetization reference only — inactive in MVP |
| payment-failed | `payment-failed-mobile.png` | Future Monetization reference only — inactive in MVP |
| review | `review-mobile.png` | Write review flow |
| feedback | `feedback-mobile.png` | Accuracy feedback prompt |
| about | `about-mobile.png` | About page |
| not-found | `notfound_mobile.png` | 404 page |

#### Desktop (8 screens — designed at 1280px)

| Screen ID | File | Description |
|-----------|------|-------------|
| map-primary | `map-primary-desktop.png` | Main map with venue side panel |
| venue-detail | `venue-detail-desktop.png` | Venue detail overlay panel |
| onboarding | `onboarding-desktop.png` | Welcome screen |
| premium-paywall | `premium-paywall-desktop.png` | Future Monetization reference only — inactive in MVP |
| premium-processing | `premium-paywall-processing-desktop.png` | Future Monetization reference only — inactive in MVP |
| premium-processing-alt | `premium-paywall-processing-desktop-1.png` | Future Monetization reference only — inactive in MVP |
| about | `about_desktop.png` | About page |
| not-found | `notfound_desktop.png` | 404 page |

### Files

| Document | Path | Description |
|----------|------|-------------|
| Design System | `nextjs-app/docs/design/DESIGN.md` | Design tokens — colours, typography, spacing, radii, shadows, glass effects |
| UX Design Specification | `_bmad-output/planning-artifacts/ux-design-specification.md` | Core experience, emotional design, user flows, component strategy, UX patterns |
| Screen references (mobile) | `nextjs-app/docs/design/references/screens/mobile/` | 13 PNG reference exports from Figma |
| Screen references (desktop) | `nextjs-app/docs/design/references/screens/desktop/` | 8 PNG reference exports from Figma |
| Component references | `nextjs-app/docs/design/references/components/` | 41 PNG component exports from Figma |
| Design mirror (BMAD) | `_bmad-output/planning-artifacts/design/` | Mirror of DESIGN.md + all references for BMAD workflow context |

## Open Questions

_No open questions remain._

### Resolved

- **Future paid-status persistence without accounts (preserved 2026-05-19):** If Season Pass returns after MVP, the preserved recovery model is: user enters their Swish transaction ID (found in the Swish app's history), the server looks up the transaction in the `purchases` table, and re-issues a signed JWT. Zero PII required. Fully specified in `future-monetization-season-pass.md`.
