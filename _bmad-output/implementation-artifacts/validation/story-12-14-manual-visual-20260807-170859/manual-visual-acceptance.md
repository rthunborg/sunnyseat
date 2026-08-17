# Story 12.14 Manual Visual Acceptance

Date: 2026-08-07

Manual mode was explicitly authorized for this resumed Story 12.14 step. The provider-neutral wrapper was run with `VISUAL_VALIDATE_PROVIDER=none` and `ALLOW_MANUAL_VISUAL_VALIDATION=1` for every mapped selected-time visual route. No canonical reference PNG was promoted or replaced.

## Captures

| Screen ID | Viewport | Route | Screenshot | SHA-256 | Notes |
| --- | --- | --- | --- | --- | --- |
| `map-selected-time-open` | mobile | `/?_state=map-selected-time-open&_time=14:00` | `C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\validation\story-12-14-manual-visual-20260807-170859\map-selected-time-open-mobile.png` | `8C384F257D67540DA8933A0F46B67E3D7696D7C5BEBDEA729D0C59F9A95423E5` | Open selected-time discovery renders normal ranked rows, pins, filters, and bottom navigation. No closed-state label or public confidence copy appears. |
| `map-selected-time-open` | desktop | `/?_state=map-selected-time-open&_time=16:30` | `C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\validation\story-12-14-manual-visual-20260807-170859\map-selected-time-open-desktop.png` | `1BE588EE7E96F96C336E88834CFBB799D35DE88B8ABA8E7C80EE0A6F3F83CB4D` | Desktop selected-time open state keeps the ranked list, tags, pins, and bottom planner coherent. No confidence copy appears. |
| `map-selected-time-closed` | mobile | `/favoriter?_state=map-selected-time-closed&_time=09:00` | `C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\validation\story-12-14-manual-visual-20260807-170859\map-selected-time-closed-mobile.png` | `377FF38DEB23628C92088C511454D27AC89DB069C8C13689AFF7A72E83D73460` | Saved closed favourite remains visible and actionable, with visible `Stängt vid vald tid` label. The retained row's 95% card value does not appear as a 95% map pin at 09:00. |
| `map-selected-time-closed` | desktop | `/favoriter?_state=map-selected-time-closed&_time=09:00` | `C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\validation\story-12-14-manual-visual-20260807-170859\map-selected-time-closed-desktop.png` | `30E31F0EF02D7D04AFE5FC5886828319A01F9E64CCC41D8963E28A2E1811A9D8` | Desktop retained favourite row is labelled `Stängt vid vald tid`, remains button-like/actionable, and the map shows only non-closed pin percentages. |

## Wrapper Results

Passed in explicit manual mode:

- `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-selected-time-open "/?_state=map-selected-time-open&_time=14:00" mobile`
- `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-selected-time-open "/?_state=map-selected-time-open&_time=16:30" desktop`
- `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-selected-time-closed "/favoriter?_state=map-selected-time-closed&_time=09:00" mobile`
- `.\scripts\run-sh.ps1 scripts/visual-validate.sh map-selected-time-closed "/favoriter?_state=map-selected-time-closed&_time=09:00" desktop`

## Coverage Boundary

The mapped visual gate covers Story 12.14's two selected-time screen IDs on mobile and desktop. Exact closed by-name search retention has no separate `project-context.md` visual route; it is covered by `nextjs-app/test/e2e/story-12-14-selected-time-availability.atdd.spec.ts` plus `VenueSearchShell` and `VenueSearchCombobox` component tests.

## Decision

Manual visual acceptance: PASS for the four mapped selected-time captures. No additional human approval is required for this story transition because the resumed step explicitly authorized provider-neutral/manual validation and the screenshots were inspected after capture.
