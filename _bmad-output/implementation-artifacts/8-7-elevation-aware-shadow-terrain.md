# Story 8.7: Terrain-Aware Ground Elevation for Hilltop Venues

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **sun-seeker**,
I want a venue on elevated terrain to account for the ground-height difference between it and the surrounding buildings,
so that a venue standing on a rise is not wrongly shadowed by buildings that sit on lower ground.

## Context

**Tier 2** of the venue-elevation follow-up (Story 8.6 is Tier 1). Story 8.6 handles a venue raised above its **own** ground (rooftop / raised terrace) via a height gate that assumes venue ground ≈ caster ground. This story handles a venue on raised **terrain** (a hilltop terrace), where the relevant comparison is the venue's **ground** elevation versus each caster's ground elevation — a building standing downhill should stop shadowing a venue uphill from it once its roof falls below the venue's seating surface.

**Grounding finding (reuse, do not reinvent):** the `shadow_casters` records **already store absolute RH2000 Z values** — `ground_z_rh2000` and `roof_z_rh2000` — and the `get_buildings_near_point` RPC already exposes them as `groundZRh2000` / `roofZRh2000` (see `3-0-2-shadow-caster-schema-rpc-contract.md:69,213-214`). So caster absolute heights are available at runtime **without** a per-caster DTM lookup. The remaining gap is the **venue's own ground elevation** (RH2000), which the `venues` table does not yet store — `seating_elevation_m` is metres above *local* ground, not an absolute Z.

This is **backend / data-accuracy only — no new screen**, on the opt-in real engine path (`SUNNYSEAT_SUN_ENGINE=real`, off in CI). Default / null-elevation venues stay byte-identical; the existing visual gates are unaffected.

> **⚠️ OPEN DECISION (resolve with maintainer/architect before/at dev start) — venue ground-elevation source.** To compare absolute heights we need the venue's RH2000 ground Z. Three options (see "Open Questions" below). The recommended path is **(A) add an additive nullable `venues.ground_elevation_m` (RH2000) column, captured offline at venue-load time** (mirrors how casters got their `ground_z_rh2000`). This story is written against Option A; confirm before implementing, as it changes the venue data contract + `venue-data-load.md`.

## Acceptance Criteria

> **No new-screen Design Gate for this story.** Backend / data-accuracy only — no new screen or visual reference; it inherits the Epic 8 overall design gate (see below). Intentional per epics.md. ACs are verbatim from `epics.md` → Story 8.7; the leading `AC1.`–`AC3.` labels are reference handles only. (The no-regression / unknown-elevation fallback is covered by AC2 + Tasks 4.2/5.3 — it is intentionally not a separate epic AC.)

**AC1.**
**Given** the Göteborg Höjdmodell 2022 DTM ground model already used by the import pipeline
**When** the engine computes the shadow for a venue on elevated terrain
**Then** a caster's effective shadow-casting height relative to the venue is measured against the venue's DTM ground elevation (not the caster's own ground), so a building standing downhill from the venue stops shadowing it once its roof falls below the venue's seating surface

**AC2.**
**Given** a venue on flat terrain with no meaningful ground delta to its nearby casters
**When** the engine computes its shadow
**Then** the result is unchanged from Story 8.6 / today (the ground delta contributes ~0)

**AC3.**
**Given** the combined Story 8.6 (height above own ground) + Story 8.7 (terrain ground delta) inputs are both present for a venue
**When** the engine computes its shadow
**Then** the effective-height test composes them coherently — caster roof *absolute* height vs. venue seating-surface *absolute* height (venue DTM ground + `seating_elevation_m`) — without double-counting the elevation

## Design Gate Criteria (Epic 8 overall)

- **Behaviour:** Identical screens; data/accuracy swap behind the API boundary.
- **Visual validation:** No new screen or visual reference; default/unknown-elevation venues keep the existing path → no rebaseline.
- **Copy:** No user-facing copy change; any uncertainty wording stays free of geodata internals (no RH2000/DTM/Z jargon per Story 3.0.6).

## Tasks / Subtasks

- [ ] **Task 0 — Resolve the venue ground-elevation decision (Supporting — blocking decision; enables AC1/AC3)** — confirm Option A/B/C (see Open Questions) with the maintainer/architect. The remaining tasks assume **Option A** (additive `venues.ground_elevation_m`). If a different option is chosen, re-scope Tasks 1 + 5.1 accordingly.

- [ ] **Task 1 — Venue ground-elevation capture (Option A) (AC: #1)**
  - [ ] 1.1 Add an additive nullable column to the venue contract (`8-2-venues-store-contract.sql` style): `ground_elevation_m double precision` (RH2000 ground Z at the venue point), with a comment that it is server-only and capture-only-derived (offline DTM lookup at venue-load time). Idempotent `alter table … add column if not exists`.
  - [ ] 1.2 Map it in `lib/services/venue-store.ts`: add to `VENUE_SELECT_COLUMNS`, `VenueRow`, `StoredVenueServerOnly` (server-only), and `fromVenueRow` via a finite-number guard (mirror `coerceSeatingArea` / the 8.6 `coerceSeatingElevation`). Never serialized by `toVenueData`.
  - [ ] 1.3 Update `nextjs-app/docs/venue-data-load.md` with the new field (what to collect, how to derive the RH2000 ground Z, and that it is optional → null falls back to the 8.6 relative gate).

- [ ] **Task 2 — Thread caster absolute Z into the runtime Building (AC: #1)**
  - [ ] 2.1 Add `roofZRh2000?: number` and `groundZRh2000?: number` to the `Building` interface in `lib/solar/types.ts` (today it only carries relative `height`).
  - [ ] 2.2 Map them from the RPC rows where `Building` records are constructed (`lib/solar/shadow-calculation-service.ts` ~line 389, alongside `height: row.Height`). Keep them optional so non-RPC / fixture casters without Z still work (fall back to the relative gate).

- [ ] **Task 3 — Thread venue ground elevation into the engine (AC: #1, #3)**
  - [ ] 3.1 In `lib/services/sun-engine.ts` `computeRealSunEngine`, read `venue.groundElevationM` and pass it alongside the 8.6 `seatingElevationM` into `calculateVenueShadowForGeometry` / `calculateVenueShadowTimelineForGeometry`.
  - [ ] 3.2 Thread both through `shadow-calculation-service.ts` into `computeShadowInfo` (extend the 8.6 params; keep all additive/defaulted).

- [ ] **Task 4 — Absolute-Z gate in `computeShadowInfo` (AC: #1, #2, #3)**
  - [ ] 4.1 Compute `venueSurfaceZ = venueGroundZ + seatingElevationM` (when `venueGroundZ` known).
  - [ ] 4.2 In the caster loop: when both `building.roofZRh2000` and `venueGroundZ` are known, `effectiveHeight = building.roofZRh2000 − venueSurfaceZ`; else **fall back to the 8.6 relative gate** (`building.height − seatingElevationM`). Gate + shadow length/geometry use `effectiveHeight` (same as 8.6 Task 4).
  - [ ] 4.3 Guard against degenerate data (NaN/Infinite Z) → fall back to the relative gate rather than emitting a degenerate polygon.
  - [ ] 4.4 Confirm composition: with `venueGroundZ ≈ casterGroundZ`, the absolute formula reduces to 8.6's relative result (AC2/AC3) — add a unit test proving this equivalence so 8.6 and 8.7 don't double-count.

- [ ] **Task 5 — Tests (AC: all)**
  - [ ] 5.1 venue-store: `ground_elevation_m` maps to `StoredVenue.groundElevationM`; null/invalid → absent; never in `toVenueData`; `VENUE_SELECT_COLUMNS` includes it (query-contract assertion).
  - [ ] 5.2 shadow-service: a caster downhill (low `roof_z_rh2000` < venue surface Z) is excluded; the same caster uphill (high roof Z) shadows the venue; flat terrain (`venueGroundZ == casterGroundZ`) matches the 8.6 result exactly (equivalence/regression test for AC2/AC3).
  - [ ] 5.3 Fallback: a caster with no `roofZRh2000` OR a venue with no `groundElevationM` → 8.6 relative behaviour (AC2 — no regression / fallback safety).
  - [ ] 5.4 Full gate: `tsc` 0, `eslint` 0, `vitest` ≥ baseline (post-8.6); no dropped tests; no new Playwright/visual specs.

- [ ] **Task 6 — Docs + deferred-work closeout (AC: all)**
  - [ ] 6.1 `nextjs-app/docs/venue-data-load.md`: mark terrain/hilltop elevation as consumed as of Story 8.7; document the optional `ground_elevation_m` field.
  - [ ] 6.2 Per the deferred-work queue convention, the residual Tier-2 terrain pointer in the "Story 8.5 follow-up — venue elevation" entry is removed once this story is drafted (it is now fully carried into 8.6 + 8.7).
  - [ ] 6.3 `sprint-status.yaml`: `8-7-elevation-aware-shadow-terrain` → `review` when dev-complete (via the story-review gate).

## Dev Notes

### What already exists (reuse, do not reinvent)
- **Caster absolute Z is already in the DB + RPC:** `shadow_casters.ground_z_rh2000` / `roof_z_rh2000`, exposed by `get_buildings_near_point` as `groundZRh2000` / `roofZRh2000` (`3-0-2-shadow-caster-schema-rpc-contract.md:69,213-214`). You only need to **carry them into the runtime `Building`** (`lib/solar/types.ts`) and the RPC→Building mapper (`shadow-calculation-service.ts` ~389). No new caster DTM lookup.
- **The 8.6 height-gate plumbing** (the `seatingElevationM` parameter threaded `venue-store → sun-engine → computeShadowInfo`, and `effectiveHeight` in the caster loop) is the foundation — 8.7 extends it from a *relative* to an *absolute* comparison. **Story 8.6 must be done first.**

### The model (absolute heights)
```
venueSurfaceZ      = venueGroundZ (DTM at venue point) + seating_elevation_m
casterRoofZ        = roof_z_rh2000
effectiveHeight    = casterRoofZ − venueSurfaceZ           # part of the caster ABOVE the venue seating surface
gate               : effectiveHeight < MIN_MEANINGFUL_HEIGHT → caster does not shadow this venue
```
Flat terrain (`venueGroundZ == casterGroundZ`) ⇒ `effectiveHeight == (casterGroundZ+height_m) − (casterGroundZ+seating_elevation_m) == height_m − seating_elevation_m` ⇒ **identical to 8.6** (no double-count). This equivalence is the key correctness property (AC3) — test it.

### Anti-patterns to avoid
- ❌ Do NOT add a runtime DTM raster lookup for casters — their absolute Z is already on the record.
- ❌ Do NOT add `seating_elevation_m` and `ground_elevation_m` separately into the gate as two subtractions in a way that double-counts; the gate is a single absolute comparison.
- ❌ Do NOT serialize any Z / elevation field into `VenueDataDto` or user copy (server-only boundary, like `seatingArea`).
- ❌ Do NOT regress the 8.6 / null-elevation path — unknown `groundElevationM` or missing caster Z MUST fall back to the relative gate (AC2).
- ❌ Do NOT model fractional/partial occlusion (still out of scope — Tier 3).

### Testing standards
- Vitest unit tests; boundary-mock `@/lib/supabase/server`; baseline = post-8.6 counts (do not drop tests). No new Playwright/visual specs (no new screen).

### Project Structure Notes
- Touch points: venue contract SQL (additive column — **needs the Task 0 decision**), `lib/services/venue-store.ts`, `lib/services/sun-engine.ts`, `lib/solar/types.ts`, `lib/solar/shadow-calculation-service.ts`, `nextjs-app/docs/venue-data-load.md`, tests under `test/unit/`.
- Depends on **Story 8.6** (height-gate plumbing) — sequence 8.7 after 8.6.

### File Impact
- **Files Modified:** `nextjs-app/lib/services/venue-store.ts`, `nextjs-app/lib/services/sun-engine.ts`, `nextjs-app/lib/solar/types.ts` (Building interface), `nextjs-app/lib/solar/shadow-calculation-service.ts`, `nextjs-app/docs/venue-data-load.md`, `_bmad-output/implementation-artifacts/deferred-work.md` (closeout), `_bmad-output/implementation-artifacts/sprint-status.yaml` (status), and the affected `nextjs-app/test/unit/**` test files.
- **Files Created (Option A):** an additive venue-contract `.sql` change adding `ground_elevation_m` (extend `8-2-venues-store-contract.sql` or a new additive contract file — confirm in Task 0). Optionally a new `test/unit/**` spec for the terrain cases.
- **Explicitly NOT changed:** no `VenueDataDto` (`lib/types/api`) change (server-only fields), no client component, no new Playwright/visual reference, no runtime DTM raster service (caster absolute Z already comes from the RPC).
- **Decision-gated:** the SQL column (Task 1) exists only under Option A; Options B/C change this list (see Open Questions).

### References
- [Source: CLAUDE.md] and [Source: AGENTS.md — canonical repo rulebook for AI agents] — API boundary, local-Docker/WSL rules, deferred-work convention
- [Source: project-context.md — project standards/conventions + screen map]
- *(N/A for this story: `nextjs-app/docs/design/DESIGN.md` and `ux-design-specification.md` — backend/no-new-screen; no UX surface touched.)*
- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.7]
- [Source: _bmad-output/planning-artifacts/prd.md#FR12a] and #Shadow Data Trust Realignment
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Shadow Caster Lookup (step 6); Derived height method (DTM ground Z)]
- [Source: _bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.md:69,213-214 — ground_z_rh2000 / roof_z_rh2000 in schema + RPC mapping]
- [Source: nextjs-app/lib/solar/types.ts:72 — Building interface (currently relative height only)]
- [Source: nextjs-app/lib/solar/shadow-calculation-service.ts:95,114,389 — computeShadowInfo gate + RPC→Building mapper]
- [Source: nextjs-app/lib/services/sun-engine.ts:254 — computeRealSunEngine]
- [Source: _bmad-output/implementation-artifacts/8-6-elevation-aware-shadow-rooftop.md — Tier 1 height-gate this story extends]

## Open Questions (resolve at dev start)

1. **Venue ground-elevation source (blocks Task 1).**
   - **(A) Recommended:** additive nullable `venues.ground_elevation_m` (RH2000), derived offline at venue-load time (same provenance as caster `ground_z_rh2000`). Clean, cheap at runtime, fits the existing capture-at-load model. Changes the venue data contract.
   - **(B)** Runtime DTM lookup at the venue point — needs a queryable runtime DTM source; heavier, more infra; avoids a new column.
   - **(C)** Approximate `venueGroundZ` from the nearest caster's `ground_z_rh2000` — zero new data, but approximate and undefined where no caster is nearby.
2. **How many launch venues actually need terrain handling?** If the answer is ~zero hilltop venues at launch (most elevated venues are rooftop = 8.6), 8.7 can stay backlog until a hilltop venue is queued — confirm priority with the PM before pulling it into a sprint.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
