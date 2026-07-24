# Story 12.9 Mobile Slider/Date Refinement Design

Date: 2026-07-24
Decision: Option 1, mobile-only planner refinement

## Scope

Refine only the mobile top planner chrome for Story 12.9. Desktop planner layout, desktop dimensions, desktop controls, the date-dialog design, row-snap model, onboarding, hydration cleanup, and unrelated visual references are out of scope.

Story 12.9 row-sheet behavior remains binding: the mobile bottom sheet stays bottom-anchored, row-quantized, keyboard accessible, and visually gap-free. This refinement must not weaken existing row-sheet tests or evidence.

## Requirements

1. Mobile top planner panel height at the 390x844 validation viewport must be `<= 72` CSS px, with expected measured height `68-72` CSS px. Use existing spacing tokens/utilities; do not introduce raw hex colors, raw shadows, or ad-hoc pixel nudges.
2. The mobile slider keeps the tokenized `size-slider-track-h` 6px track.
3. The mobile slider visible thumb uses the existing `size-slider-thumb` token, approximately 14.1px. The semantic/invisible slider input or hit layer must still provide at least a 44x44 CSS px touch target.
4. The live `HH:MM` badge continues to follow the thumb horizontally. Badge and thumb/track must occupy distinct vertical lanes with positive clearance: component geometry tests must prove `badge.bottom < thumb.top` and at least one small tokenized gap between them.
5. Remove the mobile next-day `>` shortcut. The desktop next-day control remains unchanged.
6. Replace the mobile date area with one clickable 44px-min trigger containing the Calendar icon and selected-date pill text. The trigger must not include a chevron or disclosure icon.
7. The mobile date trigger uses existing tokenized surface, border, shadow, radius, and text treatments so it reads as clickable. It needs visible hover, pressed, and `focus-visible` states.
8. The mobile date trigger must expose `aria-haspopup="dialog"` and live `aria-expanded`. When the dialog closes by date selection, Escape, backdrop, or close button, focus returns to the date trigger. Existing dialog keyboard behavior, focus trap, disabled-day semantics, and selectable today-to-today+3 window remain unchanged.
9. Data flow remains through `TimeContext` and the existing `DatePickerDialog`/planner helpers. Selecting a valid new date calls the existing date-selection path once. Closing without a date change leaves selected date, query key, and request count unchanged.
10. Error behavior remains fail-closed and non-surprising: disabled/unavailable dates stay disabled with existing localized accessibility copy; invalid forced dates continue to clamp through the existing planner state rules; no new API route, Supabase access, solar/weather import, premium state, or runtime dependency is added.

## Test Requirements

- Component geometry tests prove mobile panel height `<= 72` at a mocked 390x844 viewport, 6px track height, `size-slider-thumb` visible thumb sizing, 44x44 slider hit target, and `badge.bottom < thumb.top` with a tokenized gap.
- Component accessibility tests prove the mobile date trigger has Calendar plus selected-date text, no chevron/disclosure icon, `aria-haspopup="dialog"`, correct `aria-expanded`, visible focus state, and focus restoration after every close path.
- Component tests prove desktop planner layout and desktop next-day control are unchanged.
- E2E request-count test migration: the test currently clicking `planner-date-next` must select a different date by opening the calendar dialog and choosing an in-window different date. Preserve the invariants exactly: changing date triggers exactly one `**/api/venues?**` request; settled same-date slider scrubbing triggers zero extra venue requests; no `api.met.no` request leaks.
- Existing row-sheet tests and E2E behavior must remain green: row-count state, handle-only `N=0`, `N=3`, `N=max`, mid-drag, keyboard ladder, no map gap, and internal scroll past max.

## Visual Evidence Required Next

Capture new non-authoritative candidate evidence before review. The evidence Markdown must embed inline images, not only link file paths:

- Mobile ordinary `N=3` with three full rows.
- Mobile `N=max` with zoom controls hidden or inert when covered by the sheet.
- Mobile mid-drag showing three full rows plus part of the next row.
- Mobile slim slider/date pill in the top planner chrome.
- Prefer a short drag clip if the capture helper supports it; static mid-drag evidence is still mandatory.

No canonical PNG is promoted until a human approves the candidate set. The inherited desktop OnboardingGate hydration issue remains deferred to Story 12.4 and must not be absorbed into this refinement.

## Acceptance Checklist

- [ ] Mobile planner panel measures `68-72` CSS px at 390x844 and never exceeds 72px.
- [ ] Desktop planner visual/layout/controls are unchanged.
- [ ] Visible mobile thumb uses `size-slider-thumb`; slider touch target remains at least 44x44.
- [ ] Badge follows thumb horizontally and clears the thumb vertically with `badge.bottom < thumb.top`.
- [ ] Mobile next-day shortcut is removed; desktop next-day remains.
- [ ] Mobile date trigger is a 44px-min Calendar + selected-date pill with no chevron/disclosure icon.
- [ ] Date trigger exposes dialog semantics, live expanded state, and focus restoration.
- [ ] Date-change E2E uses the calendar dialog and preserves exactly-one request.
- [ ] Same-date scrub E2E preserves zero extra requests.
- [ ] Row-sheet Story 12.9 behavior and evidence requirements remain intact.
