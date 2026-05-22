# Sprint Change Proposal — MVP Free Planner, Date Picker, and Favourites

**Date:** 2026-05-19
**Project:** SunnySeat
**Change scope:** Moderate course correction
**Status:** Approved for planning-artifact implementation by Rasmus

## 1. Issue Summary

During Epic 2 development, Rasmus decided that SunnySeat's MVP should not monetize consumer planning features before the user base has grown. The original plan placed future-date planning behind a Season Pass and Swish payment flow. That creates friction before the product has validated adoption and weakens the core retention loop.

The MVP scope now makes these features free:

- Time planner / time slider
- Future date picker and future sun simulation
- Favourites

Season Pass, paywalls, Swish payments, premium activation, premium recovery, and payment failure flows are deferred to a preserved Future Monetization track.

## 2. Impact Analysis

**Epic impact**

- Epic 2 expands from today-only sun intelligence to include the free planner, future date picker, and favourites as MVP functionality.
- Epic 4 is no longer part of the MVP. It becomes a post-MVP Future Monetization epic for Season Pass and Swish.
- Epic 6 keeps personalization beyond favourites: recently viewed venues, notifications, and sharing. The original favourites story moves forward into Epic 2.

**Story impact**

- Story 2.5 is rewritten from "Time Slider (Today, Free Tier)" to "Free Time & Date Planner".
- Former Story 4.5 "Future Date Picker & Time Simulation" is merged into Story 2.5 and removed from active Epic 4 scope.
- A new MVP Story 2.7 "Save & View Favourites" is added, carrying the former Story 6.1 functionality forward.
- Future Epic 4 retains payment, premium activation, recovery, and upsell work for later pickup.

**Artifact impact**

- `prd.md` must stop treating premium conversion and Swish payments as MVP success criteria.
- `epics.md` must move FR10/FR11 into Epic 2 and mark FR21-FR26 as post-MVP future monetization.
- `ux-design-specification.md` must make planner/date/favourites free and mark paywall/payment screens inactive for MVP.
- `architecture.md` must remove active premium gating from the MVP data flow and keep payment architecture as future/dormant.
- `sprint-status.yaml` must add the new Epic 2 story and move Epic 4 payment stories to future backlog.
- `deferred-work.md` must retarget favourites entries from former Story 6.1 to new Story 2.7 and remove lock-badge assumptions.

## 3. Recommended Approach

Use a hybrid of **Direct Adjustment** and **MVP Review**:

- Directly adjust upcoming stories before Story 2.5 is drafted.
- Keep all completed Epic 1 and Epic 2 work intact.
- Preserve Season Pass/Swish work in `future-monetization-season-pass.md` instead of deleting it.
- Rebaseline or retarget current visual expectations that still show lock badges or paywall prompts.

This avoids rollback, keeps Epic 2 momentum, and preserves the monetization design and technical thinking for later.

## 4. Detailed Change Proposals

**PRD**

- Replace premium conversion success metric with free planner/favourites adoption metrics.
- Update Sara's journey from "Premium Conversion" to free planning.
- Change FR10/FR11 from premium-user requirements to general-user requirements.
- Mark FR21-FR26 as Future Monetization requirements outside MVP.

**Epics**

- Update Epic 2 coverage to include FR10, FR11, and FR31.
- Rewrite Story 2.5 as the free planner and date picker story.
- Add Story 2.7 "Save & View Favourites".
- Reframe Epic 4 as Future Monetization: Season Pass & Swish, with no active dependency for MVP.
- Reframe Epic 6 as history, notifications, and sharing after favourites have shipped in Epic 2.

**Architecture**

- Treat planner date/time as normal free app state in `TimeContext`.
- Remove active MVP dependence on `PremiumContext`, premium JWTs, or `/api/payments/*`.
- Keep Swish/payment architecture archived as a future subsystem.

**UX**

- Planner/date/favourites are available without paywall or lock state.
- Premium/paywall/payment/recovery screens remain documented as Future Monetization references only.
- Favourites tab and heart affordances must not show lock badges in MVP.

## 5. Implementation Handoff

**Owner routing**

- Bob / Scrum Master: sprint change proposal, story reshuffle, sprint status hygiene.
- John / PM: PRD scope and success criteria.
- Winston / Architect: architecture and API boundary updates.
- Sally / UX: UX spec and visual-reference status.
- Amelia / Dev: implements updated Story 2.5 and Story 2.7 after story files are drafted.
- Quinn / QA: validates the regression scenarios.

**Success criteria**

- Planning artifacts agree that planner/date/favourites are free in MVP.
- Future Monetization work is preserved in a dedicated artifact.
- No active MVP story still requires Season Pass, Swish, paywall, premium recovery, or lock-badge UI.
- Sprint tracker reflects the new story sequencing before Story 2.5 begins.
