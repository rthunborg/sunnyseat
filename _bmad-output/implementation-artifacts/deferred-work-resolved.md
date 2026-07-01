# Deferred Work — Resolved

## Deferred from: code review of 9-5-location-onboarding-reliability (2026-06-30)

- *(CLOSED by Story 9.9 Task 3, 2026-07-01 — the honest `≈ från centrum` / `≈ from centre` label now threads into `VenueQuickInfo` via a `distanceIsApproximate` prop + a parity-guarded `quickInfo.distanceApproximate` key, wired from `locationIsApproximate` at both MapView call sites; the real path was `composed/venue/VenueQuickInfo.tsx`, not the stale `custom/venue/` path in the original note.)*

## Deferred from: code review Round 2 of 1-3-responsive-layout-shell-navigation (2026-04-20)

- ~~**`MapContext` value change re-renders every consumer on any `selectedVenueId` change**~~ **RESOLVED 2026-05-02 by Story 1.4** — the split into `MapInstanceContext` + `MapSelectionContext` (Story 1.4 Task 2) addressed this exactly. `MapInstanceContext` value is now `useMemo`'d (Round 1 patch P14). No further action.

## Deferred from: code review Round 2 of 1-4-maplibre-integration-venue-pin-layer (2026-05-03)

- ~~**`/api/map-style` no concurrent-request dedup**~~ **RESOLVED 2026-06-04 by deferred-work audit** — the MapTiler proxy route no longer exists in `nextjs-app/app/api/`; `MapContainer` uses OpenFreeMap directly. Any future provider/proxy decision remains covered by the OpenFreeMap availability fallback item above.
*(Two entries — `useVenueSearch.test.ts` confidence fixture coverage and `VenuePinData.sunStatus` literal drift — carried into Story 2.6 — Confidence Display & Auto-Refresh on 2026-05-22 (Tasks 2 and 7). Removed by SM per the deferred-work convention.)*

## Deferred from: code review of 1-6-ci-cd-quality-gates (2026-05-07)

- ~~**W9: PRD NFR3 (`INP <=200ms`) vs architecture NFR table (`INP <=100ms`) inconsistency**~~ **RESOLVED 2026-06-04 by planning-artifact audit** — PRD, architecture, and epics now agree on INP <=200ms. No active action remains.
