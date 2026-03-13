# Epic 9: Growth & Monetization — PWA, Data Moat, B2B & Premium

**Duration:** Estimated 10–14 weeks  
**Priority:** Strategic  
**Status:** 📋 **PLANNING**

**Dependency:** Epic 7 (Public Launch) — app must be live; Epic 8 (Admin) — admin tools for data verification  
**Reference:** `docs/stories/7.1.build-to-sell-strategic-roadmap.md` — detailed story specs with tasks, schema changes, and technical notes

## Epic Goal

Transform SunnySeat from a useful free tool into a commercially viable, acquirable product. Build a proprietary data moat (verified outdoor seating database), enable B2B revenue (partner venues), add premium consumer features with Swish payment, and make the app installable via PWA.

**Strategic Vision:** Prove Product-Market Fit (willingness to pay) and build a proprietary dataset that Google/Apple Maps does not possess, positioning SunnySeat for future acquisition.

## Epic Description

This epic implements the "Build to Sell" roadmap in four sequential phases:

1. **PWA Foundation** — Make the app installable, offline-capable, app-store ready
2. **Data Moat** — Automated venue discovery (OSM) + user crowdsourcing + admin verification
3. **B2B Revenue** — Partner venue features (Golden Pins, Sunny Now badge, deep links)
4. **Premium Monetization** — Paid features (time slider, date picker) with Swish payment

**Success Metrics:**
- 500+ verified outdoor seating locations
- Technical capacity for 10 paid B2B partners
- \>2% conversion rate from free to paid (Season Pass 39 SEK)

---

## Phase 1: PWA Foundation (1–2 weeks)

### Story 9.1: PWA Configuration & App Store Readiness

**Goal:** Make the Next.js app installable as a PWA on mobile devices.

**Acceptance Criteria:**

1. Valid `manifest.json` with app name, icons, theme colors, display mode `standalone`
2. Service worker registered with offline fallback
3. App icons for iOS (180, 152, 120px) and Android (192, 512px, maskable)
4. PWA install prompt component detects installability and shows prompt
5. Cached static assets work offline (CSS, JS, map tiles)
6. iOS meta tags configured (apple-touch-icon, apple-mobile-web-app-capable)
7. Lighthouse PWA audit passes with score >= 90

**Dev Notes:**
- Use `next-pwa` package or manual service worker setup
- Port caching strategy from `src/frontend/admin/vite.config.ts` (Workbox config)
- Map tile caching for offline map viewing
- See full task breakdown in `docs/stories/7.1.build-to-sell-strategic-roadmap.md` → Phase 1

---

## Phase 2: Data Moat (4–6 weeks)

### Story 9.2: Automated OSM Ingestion Pipeline

**Goal:** Automatically discover restaurants with outdoor seating from OpenStreetMap and populate the database as "Candidate" venues.

**Acceptance Criteria:**

1. Script queries Overpass API for `amenity=restaurant` + `outdoor_seating=yes` in Gothenburg
2. Results stored as "Candidate" venues (Blue Dots on map)
3. Configurable city bounding boxes (Gothenburg first, expandable)
4. Duplicate detection by OSM node ID and coordinates
5. Idempotent — can run multiple times safely
6. API rate limit handling with retries
7. Progress logging and summary report

**Database Schema Changes:**
- Add `VerificationStatus` (0=Candidate, 1=Verified) to venues
- Add `OsmNodeId` BIGINT to venues
- See full SQL in `docs/stories/7.1.build-to-sell-strategic-roadmap.md` → Story 7.2.1

---

### Story 9.3: User Crowdsourcing Verification

**Goal:** Let users confirm that a venue has outdoor seating, building community verification.

**Acceptance Criteria:**

1. Users tap a Candidate venue (Blue Dot) on map
2. "Confirm Outdoor Seating" button shown
3. Single-tap confirmation submission
4. System tracks confirmations per venue
5. Venue auto-verifies (→ Red Dot) at 3+ confirmations
6. Visual feedback after confirmation
7. Rate limiting prevents duplicate confirmations (IP-hashed)

**Database Schema Changes:**
- `venue_confirmations` table (VenueId, IpHash, UserAgent, CreatedAt)
- See full SQL in `docs/stories/7.1.build-to-sell-strategic-roadmap.md` → Story 7.2.2

---

### Story 9.4: Admin Data Verification Tool

**Goal:** Give admins a backend interface to manually verify venues and adjust coordinates.

**Dependency:** Epic 8 (Admin platform) for admin auth and UI framework

**Acceptance Criteria:**

1. Admin can view Candidate and Verified venues with filter
2. Admin can toggle verification status manually
3. Admin can edit venue coordinates (map picker or lat/lng)
4. Confirmation count visible per venue
5. All changes logged to audit trail
6. Interface is simple and efficient

**Database Schema Changes:**
- `admin_actions` audit table
- See full SQL in `docs/stories/7.1.build-to-sell-strategic-roadmap.md` → Story 7.2.3

---

## Phase 3: B2B Revenue (2–3 weeks)

### Story 9.5: Golden Pin Styling & Partner Display

**Goal:** Visually distinguish paying partner venues on the map with premium styling.

**Acceptance Criteria:**

1. Partner venues display as "Golden Pins" (larger, gold color #FFD700)
2. Golden pins visually distinct from regular pins
3. Partner status configurable per venue via admin
4. Map performance unaffected with mixed pin types
5. Golden pins integrate with existing clustering

**Database Schema Changes:**
- Add `IsPartner` BOOLEAN to venues
- See full details in `docs/stories/7.1.build-to-sell-strategic-roadmap.md` → Story 7.3.1

---

### Story 9.6: "Sunny Now" Badge for Partners

**Goal:** Show a real-time "Sunny Now" badge on Golden Pins when the venue is currently in the sun.

**Acceptance Criteria:**

1. System calculates if partner venue is currently sunny (>50% sunlit)
2. Badge appears on Golden Pin when venue is sunny
3. Badge updates periodically (every 5–10 minutes)
4. Badge visually prominent but not intrusive
5. Performance remains good with badge calculations
6. `GET /api/partners/sunny-now` endpoint returns currently-sunny partners

---

### Story 9.7: Partner Deep-Links & Actions

**Goal:** Add "Book Table" and "Visit Website" action buttons to partner venue detail cards.

**Acceptance Criteria:**

1. Clicking Golden Pin shows venue detail with action buttons
2. "Book Table" button links to booking service (TheFork, BokaBord, etc.)
3. "Visit Website" button links to venue website
4. Links open in new tab with `rel="noopener noreferrer"`
5. Buttons only appear when URLs are configured
6. Mobile-friendly touch targets (min 44x44px)
7. Admin can set booking URL and website URL per venue

**Database Schema Changes:**
- Add `BookingUrl` VARCHAR(500) to venues

---

## Phase 4: Premium Monetization (4–6 weeks)

### Story 9.8: Swish Payment Integration

**Goal:** Enable one-time "Season Pass" purchase (39 SEK) via Swish to unlock premium features.

**Note:** Start this story first in Phase 4 — the paywall depends on it.

**Acceptance Criteria:**

1. User can initiate Swish payment from paywall prompt
2. Payment redirects to Swish app or shows QR code
3. System receives payment confirmation via webhook
4. User's premium status stored and persisted across sessions
5. Premium status survives app restart (database + localStorage)
6. Receipt validation prevents fraud
7. Payment flow handles errors gracefully (timeout, cancellation, failure)
8. Swish test environment used for development

**Database Schema Changes:**
- `purchases` table (SessionId, SwishTransactionId, Amount, Status)
- `user_premium_status` table (SessionId, IsPremium, PurchaseId, ActivatedAt, ExpiresAt)
- See full SQL in `docs/stories/7.1.build-to-sell-strategic-roadmap.md` → Story 7.4.3

**External Dependency:** Swish merchant account must be set up (apply early).

---

### Story 9.9: Premium Feature — Future Time Slider

**Goal:** Let premium users drag a slider to see shadow positions +1, +2, +3 hours ahead.

**Acceptance Criteria:**

1. Time slider component with +1, +2, +3 hour options
2. Slider updates map shadows in real-time as user drags
3. Feature locked behind paywall (requires premium status)
4. Paywall prompt appears when free user touches slider
5. UI intuitive and mobile-friendly
6. API calls debounced during drag (300ms)
7. Performance remains smooth during slider interaction

---

### Story 9.10: Premium Feature — Date Picker

**Goal:** Let premium users select any future date to see predicted sun exposure.

**Acceptance Criteria:**

1. Date picker allows selecting any future date (up to 1 year)
2. Selected date updates shadow calculations on map
3. Feature locked behind paywall
4. Paywall prompt for free users
5. Integrates with time slider (both can be used together)
6. Mobile-friendly calendar interface

---

## Phase 5: KPI & Analytics (Future)

### Story 9.11: KPI Dashboard

**Goal:** Track business metrics to demonstrate acquisition readiness.

**Acceptance Criteria:**

1. Dashboard shows CAC vs LTV metrics
2. Verification velocity: verified venues per week
3. B2B pilot engagement: clicks on "Book Table" per partner
4. Premium conversion rate displayed
5. Weekly/monthly trend charts
6. Accessible from admin dashboard

**Note:** This story can be deferred until Phases 1–4 are generating data.

---

## Story Dependency Graph

```
Phase 1:
  9.1 (PWA) ────────────────────────────────────────────────┐
                                                             │
Phase 2:                                                     │
  9.2 (OSM Ingest) ──→ 9.3 (Crowdsource) ──→ 9.4 (Admin)   │
                                                             │
Phase 3:                                                     │
  9.5 (Golden Pins) ──→ 9.6 (Sunny Badge) ──→ 9.7 (Links)  │
                                                             │
Phase 4:                                                     │
  9.8 (Swish) ──→ 9.9 (Time Slider) ──→ 9.10 (Date Picker) │
                                                             │
Phase 5:                                                     │
  9.11 (KPI Dashboard) ←────────────────────────────────────┘
```

**Parallelizable:**
- Phase 1 (PWA) can start immediately alongside Epic 7 or 8
- Phases 2 and 3 can overlap if resources allow
- Phase 4 requires Swish merchant account setup (start application in Phase 1)
- Phase 5 should wait until other phases generate data

---

## Timeline Summary

| Phase | Stories | Duration | Deliverable |
|-------|---------|----------|-------------|
| Phase 1: PWA | 9.1 | 1–2 weeks | Installable PWA |
| Phase 2: Data Moat | 9.2, 9.3, 9.4 | 4–6 weeks | 500+ verified venues |
| Phase 3: B2B | 9.5, 9.6, 9.7 | 2–3 weeks | Partner features |
| Phase 4: Premium | 9.8, 9.9, 9.10 | 4–6 weeks | Swish payments + paid features |
| Phase 5: KPI | 9.11 | 1–2 weeks | Business dashboard |
| **Total** | **11 stories** | **12–19 weeks** | **Full commercial product** |

---

## Risk Mitigation

1. **Swish account delays:** Apply for merchant account in Phase 1; use test env for dev
2. **OSM data quality:** Admin verification tool (9.4) as quality safety net
3. **Map performance with many pins:** Clustering already implemented; optimize for mixed types
4. **Payment fraud:** Receipt validation + duplicate detection + webhook idempotency
5. **User adoption:** Ship data moat before monetization — free value builds user base first

---

## Epic Definition of Done

- [ ] All 11 stories completed with acceptance criteria met
- [ ] PWA installable on iOS and Android with Lighthouse score >= 90
- [ ] 500+ venue candidates imported from OSM
- [ ] Crowdsourcing verification functional with 3-confirmation threshold
- [ ] Partner venues display Golden Pins with Sunny Now badge
- [ ] Swish payment flow tested end-to-end (test environment)
- [ ] Premium features (time slider, date picker) locked behind paywall
- [ ] KPI dashboard tracks key business metrics
- [ ] All database schema changes migrated and validated
- [ ] All new features covered by tests (unit + E2E)
