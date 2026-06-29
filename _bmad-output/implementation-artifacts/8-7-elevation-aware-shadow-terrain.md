# Story 8.7: Terrain-Aware Ground Elevation for Hilltop Venues

Status: done

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

- [x] **Task 0 — Resolve the venue ground-elevation decision (Supporting — blocking decision; enables AC1/AC3)** — confirm Option A/B/C (see Open Questions) with the maintainer/architect. The remaining tasks assume **Option A** (additive `venues.ground_elevation_m`). If a different option is chosen, re-scope Tasks 1 + 5.1 accordingly. → **RESOLVED (Rasmus, 2026-06-22): Option A** (additive `venues.ground_elevation_m`), AND — see the two findings in Completion Notes — the absolute-Z model ALSO required extending the `get_buildings_near_point` RPC (the story's "RPC already exposes Z" grounding was inaccurate); approved approach = **full model, applied live now** (mirrors 8.5/8.6).

- [x] **Task 1 — Venue ground-elevation capture (Option A) (AC: #1)**
  - [x] 1.1 Add an additive nullable column to the venue contract (`8-2-venues-store-contract.sql` style): `ground_elevation_m double precision` (RH2000 ground Z at the venue point), server-only. → Added to `8-2-venues-store-contract.sql` (idempotent `add column if not exists`) AND applied live via the Supabase MCP. **NO `>= 0` check** (absolute Z may be negative — live caster ground Z ranges ~ −6..101 m), unlike `seating_elevation_m`.
  - [x] 1.2 Map it in `lib/services/venue-store.ts`: add to `VENUE_SELECT_COLUMNS` (now 22 cols), `VenueRow`, `StoredVenueServerOnly` (server-only), and `fromVenueRow` via a finite-number guard (`coerceGroundElevation`, negatives kept). Never serialized by `toVenueData` (asserted).
  - [x] 1.3 Update `nextjs-app/docs/venue-data-load.md` with the new field (what to collect, Höjdmodell 2022 DTM derivation, optional → null falls back to the 8.6 relative gate).

- [x] **Task 2 — Thread caster absolute Z into the runtime Building (AC: #1)**
  - [x] 2.1 Add `roofZRh2000?: number` and `groundZRh2000?: number` to the `Building` interface in `lib/solar/types.ts`.
  - [x] 2.2 Map them in the RPC→Building mapper (`mapBuildingRow`) via `readNumber('GroundZRh2000'|'RoofZRh2000', …)` (finite-or-undefined; fixture casters without Z fall back to the relative gate). **Required extending the RPC** (see Finding 1) — `get_buildings_near_point` now returns `GroundZRh2000`/`RoofZRh2000`; applied live + reflected in `3-0-2-shadow-caster-schema-rpc-contract.sql` + `lib/supabase/types.ts`.

- [x] **Task 3 — Thread venue ground elevation into the engine (AC: #1, #3)**
  - [x] 3.1 In `lib/services/sun-engine.ts` `computeRealSunEngine`, read `venue.groundElevationM` and pass `venueGroundZ` alongside the 8.6 `seatingElevationM` into both `calculateVenueShadowForGeometry` and `calculateVenueShadowTimelineForGeometry`.
  - [x] 3.2 Thread both through `shadow-calculation-service.ts` into `computeShadowInfo` (additive `venueGroundZ?` on `CalculateVenueShadowOptions` + a defaulted positional param; all additive).

- [x] **Task 4 — Absolute-Z gate in `computeShadowInfo` (AC: #1, #2, #3)**
  - [x] 4.1 `venueSurfaceZ = venueGroundZ + seatingElevationM` (when `venueGroundZ` known).
  - [x] 4.2 In the caster loop: when both `venueGroundZ` and `building.groundZRh2000` are known, add the **ground delta**: `effectiveHeight = building.height − seatingElevationM + (casterGroundZ − venueGroundZ)`; else **fall back to the 8.6 relative gate**. Gate + shadow length/geometry use `effectiveHeight` (same as 8.6). → **Deviation from the literal task (Finding 2):** uses the caster's **conservative runtime `height` + the ground delta**, NOT `roofZRh2000` as the casting height — because `roof_z − ground_z ≠ height_m` for the ~1.2k height-uncertain casters Story 8.1.1 capped; using raw roof_z would regress that safety cap and break AC2. Mathematically equal to the story's model whenever `roof_z = casterGroundZ + height_m`.
  - [x] 4.3 Guard against degenerate data (NaN/Infinite Z) → both inputs pass `Number.isFinite` before the delta is applied; otherwise fall back to the relative gate (no degenerate polygon).
  - [x] 4.4 Composition: with `casterGroundZ == venueGroundZ` the ground delta is 0 → reduces EXACTLY to 8.6 (AC2/AC3). Proven by the flat-terrain equivalence test + the compose-with-seating-elevation test (no double-count).

- [x] **Task 5 — Tests (AC: all)**
  - [x] 5.1 venue-store: `ground_elevation_m` → `StoredVenue.groundElevationM`; **negative kept** (absolute Z); null/NaN → absent; never in `toVenueData`; `VENUE_SELECT_COLUMNS` 22-column contract assertion. (+3 tests)
  - [x] 5.2 shadow-service: a caster downhill (low `groundZRh2000`) is excluded; the SAME caster uphill (high ground Z) shadows; flat terrain matches the 8.6 result exactly; roof_z is NOT used as casting height (inflated roof_z still matches 8.6). (+6 tests incl. compose-with-seating-elevation)
  - [x] 5.3 Fallback: a caster with no Z OR a venue with no `groundElevationM` → 8.6 relative behaviour (covered in the 8.7 shadow-service block + a sun-engine end-to-end threading test). (+1 sun-engine test)
  - [x] 5.4 Full gate: `tsc` 0, `eslint` 0, `vitest` 70 files / **625 tests** (+10 from the 615 post-8.6 baseline; none dropped); no new Playwright/visual specs.

- [x] **Task 6 — Docs + deferred-work closeout (AC: all)**
  - [x] 6.1 `nextjs-app/docs/venue-data-load.md`: terrain/hilltop elevation marked **consumed as of Story 8.7**; documented the optional `ground_elevation_m` field + the absolute-Z model (conservative-height note).
  - [x] 6.2 Per the deferred-work queue convention, the residual "Story 8.5 follow-up — venue elevation" entry is fully resolved (8.6 done + 8.7 implemented) and removed (replaced with a closeout breadcrumb comment).
  - [x] 6.3 `sprint-status.yaml`: `8-7-elevation-aware-shadow-terrain` → `review` (via the story-review gate).

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

1. **Venue ground-elevation source (blocks Task 1).** → **RESOLVED (Rasmus, 2026-06-22): Option A** — additive nullable `venues.ground_elevation_m` (RH2000), derived offline at venue-load time. Applied live now.
   - **(A) Chosen:** additive nullable `venues.ground_elevation_m` (RH2000), derived offline at venue-load time (same provenance as caster `ground_z_rh2000`). Clean, cheap at runtime, fits the existing capture-at-load model. Changes the venue data contract.
   - (B) Runtime DTM lookup at the venue point — heavier, more infra; rejected.
   - (C) Approximate `venueGroundZ` from the nearest caster's `ground_z_rh2000` — approximate / undefined where no caster is nearby; rejected.
2. **How many launch venues actually need terrain handling?** → **RESOLVED (Rasmus, 2026-06-22): proceed now** (full model, applied live) rather than defer to backlog. No live hilltop venue is queued yet, so the feature is **dormant** until a venue is loaded with a non-null `ground_elevation_m`; the default/seed/rooftop paths stay byte-identical.

## Dev Agent Record

### Agent Model Used

Amelia (BMAD dev-story) / Claude Opus 4.8.

### Debug Log References

- Baseline gate (pre-change): `tsc --noEmit` 0, `eslint .` 0 errors (12 pre-existing warnings), `vitest run` 70 files / 615 tests — clean, matching the post-8.6 baseline.
- Live DB applies (Supabase MCP, project `sunnyseat`, out-of-band per the 8.5 ledger-empty convention): (1) `alter table public.venues add column if not exists ground_elevation_m double precision`; (2) drop + recreate `get_buildings_near_point` appending `GroundZRh2000`/`RoofZRh2000` + re-asserted the server-only grants (revoke public/anon/authenticated, grant execute to service_role). Verified: RPC returns the two Z columns with real values; only `service_role`/`postgres` can execute.
- Data checks that drove the design: all 58,721 active/include casters have non-null `ground_z_rh2000` (−6.2..100.7 m) / `roof_z_rh2000` (0.5..122.6 m); but `roof_z − ground_z ≈ height_m` for only 57,233 — **1,488 diverge (1,212 by >5 m)**, the height-uncertain casters Story 8.1.1 capped at 15 m.
- Final gate: `tsc` 0, `eslint` 0 errors, `vitest` 70 files / 625 tests (+10). `lib/supabase/types.ts` hand-edited then verified **byte-identical to a fresh `generate_typescript_types`** (future regen = no-op).

### Completion Notes List

**Two material findings corrected the story's "grounding" mid-dev (both confirmed against the live DB):**

1. **The RPC did NOT expose caster absolute Z.** The story assumed `get_buildings_near_point` already returned `groundZRh2000`/`roofZRh2000` (Task 2 = "just map them"). It did not — it returned 15 columns, none of them the Z values (the story cited the `shadow_casters` schema lines, not the RPC `returns table`). The Z columns existed on the table but were never selected. Fix: extended the RPC to append `GroundZRh2000`/`RoofZRh2000` (live apply + `3-0-2-…-rpc-contract.sql` + `lib/supabase/types.ts`), preserving the server-only grants.

2. **`roof_z_rh2000` ≠ `casterGroundZ + height_m`, so the story's literal gate formula would regress safety + break AC2.** For the ~1,212 height-uncertain casters Story 8.1.1 deliberately capped at a conservative 15 m, the raw `roof_z − ground_z` is much taller. The story's `effectiveHeight = roofZRh2000 − venueSurfaceZ` would resurrect those raw heights (re-introducing the over-shadowing 8.1.1 fixed) AND make flat terrain diverge from 8.6 (breaking AC2). Implemented the AC-faithful **ground-delta** form instead: `effectiveHeight = height − seatingElevationM + (casterGroundZ − venueGroundZ)`, keeping the conservative runtime `height` and taking only the GROUND delta from absolute Z. This is mathematically identical to the story's model whenever `roof_z = casterGroundZ + height_m` (the 97.5% normal case) and is the only form that satisfies AC2/AC3 + preserves the 8.1.1 cap.

- **AC1** (terrain delta): proven by the shadow-service tests — a height-12 caster at ground Z 10 is excluded when the venue ground is 40 m (its 22 m roof is below the 40 m seating surface); the SAME caster at ground Z 70 shadows the venue. The sun-engine end-to-end test flips an otherwise-shadowed venue to 100 % sunlit when it sits on a 40 m rise above a downhill caster.
- **AC2** (flat / no-regression / byte-identical): the ground delta is 0 when `casterGroundZ == venueGroundZ` → reduces exactly to 8.6; a missing venue `groundElevationM` OR a caster missing Z falls back to the relative gate. Proven by the flat-terrain equivalence test (incl. an inflated roof_z to prove it is ignored) + the two fallback tests + the unchanged 615 prior tests. Every fixture/launch venue leaves `ground_elevation_m` null, so the default seed path is untouched and no visual rebaseline is needed.
- **AC3** (composition without double-count): `venueSurfaceZ = venueGroundZ + seatingElevationM` is a single absolute comparison; the seating elevation is subtracted once. Proven by the compose-with-seating-elevation test (`venueGroundZ 20 + seatingElevationM 10` gates out a height-12 caster on ground 20).
- **Server-only boundary preserved**: `ground_elevation_m`/`groundElevationM` is never copied by `toVenueData` (asserted); no `VenueDataDto` change; the two caster Z fields are server-side only (RPC → `Building`, never serialized).
- **Live cutover posture**: the additive column + RPC change are applied live now (additive, non-disruptive; default seed path never calls the RPC). The feature is **dormant** until a venue is loaded with a non-null `ground_elevation_m`. Production `SUNNYSEAT_SUN_ENGINE=real` flip remains the maintainer cutover step (Story 8.5 runbook).

### File List

- `nextjs-app/lib/solar/types.ts` — added `groundZRh2000?`/`roofZRh2000?` to the `Building` interface (with the conservative-height caveat).
- `nextjs-app/lib/solar/shadow-calculation-service.ts` — `mapBuildingRow` maps the two Z fields; `venueGroundZ?` added to `CalculateVenueShadowOptions`; threaded into `computeShadowInfo` (defaulted positional param) at both call sites; terrain ground-delta gate (`effectiveHeight = height − seatingElevationM + (casterGroundZ − venueGroundZ)`, relative-gate fallback).
- `nextjs-app/lib/services/sun-engine.ts` — `computeRealSunEngine` reads `venue.groundElevationM` and threads `venueGroundZ` into the single-shot + timeline shadow calls.
- `nextjs-app/lib/services/venue-store.ts` — `groundElevationM` added to `StoredVenueServerOnly`; `ground_elevation_m` in `VENUE_SELECT_COLUMNS` (22) + `VenueRow`; `coerceGroundElevation` (finite, **negatives kept**) + conditional spread in `fromVenueRow`.
- `nextjs-app/lib/supabase/types.ts` — `venues.ground_elevation_m` (Row/Insert/Update) + `get_buildings_near_point` Returns `GroundZRh2000`/`RoofZRh2000` (hand-edited; verified identical to a fresh typegen).
- `nextjs-app/test/unit/services/venue-store.test.ts` — 22-column contract; +3 ground-elevation tests (map / negative-kept / null-NaN-dropped).
- `nextjs-app/test/unit/shadow-calculation-service.test.ts` — +6 "Story 8.7 terrain ground-elevation gate" tests (downhill-excluded / uphill-shadows / flat-equivalence / two fallbacks / compose-with-seating-elevation).
- `nextjs-app/test/unit/services/sun-engine.test.ts` — +1 end-to-end threading test (hilltop venue flips to sunlit).
- `nextjs-app/docs/venue-data-load.md` — `ground_elevation_m` field row + Elevation section terrain model (consumed as of 8.7) + JSON example + server-only note.
- `_bmad-output/implementation-artifacts/8-2-venues-store-contract.sql` — additive `ground_elevation_m` column (no `>= 0` check) + comment.
- `_bmad-output/implementation-artifacts/3-0-2-shadow-caster-schema-rpc-contract.sql` — RPC `returns table` + select list append `GroundZRh2000`/`RoofZRh2000`; updated function comment.
- `_bmad-output/implementation-artifacts/deferred-work.md` — "Story 8.5 follow-up — venue elevation" closeout (8.6 + 8.7 both shipped).
- `_bmad-output/implementation-artifacts/8-7-elevation-aware-shadow-terrain.md` — task checkboxes, decision resolution, Dev Agent Record, Status.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `8-7-elevation-aware-shadow-terrain`: ready-for-dev → in-progress → review.
- Live DB (not git-tracked): `public.venues.ground_elevation_m` column + extended `get_buildings_near_point` RPC.
- `_bmad-output/implementation-artifacts/validation/8-7-elevation-aware-shadow-terrain-review-20260622-172527.log` — story-review gate artifact (lint 0, typecheck 0, vitest 70 files / 625 tests; visual auto-skipped).

## Change Log

- 2026-06-22 — Story 8.7 implemented (Tier-2 terrain-aware ground-elevation shadow gate). Added server-only `venues.ground_elevation_m` + extended `get_buildings_near_point` to expose `GroundZRh2000`/`RoofZRh2000` (live + contracts + types), threaded both through venue-store → sun-engine → `computeShadowInfo`, and added an absolute-Z **ground-delta** gate (conservative `height` + ground delta; relative-gate fallback). Default/flat/rooftop paths byte-identical. Tests +10 (615 → 625). Two story-grounding inaccuracies corrected (RPC didn't expose Z; `roof_z ≠ ground_z + height_m`). Status ready-for-dev → in-progress → review.

### Review Findings

**Round 1 of 3** — bmad-code-review (Blind Hunter + Edge Case Hunter + Acceptance Auditor), 2026-06-25. Reviewed the uncommitted working-tree delta (which bundles the Story 8.6 + 8.7 elevation work). **Acceptance Auditor: all ACs (AC1 terrain delta / AC2 flat byte-identity / AC3 composition) and every stated anti-pattern satisfied — no violations.** Triage: 1 patch, 1 deferred, 6 dismissed as verified non-issues. No HIGH/MEDIUM blockers.

- [x] [Review][Patch] Exported `calculateVenueShadow{ForGeometry,TimelineForGeometry}` does not floor a negative `seatingElevationM` [nextjs-app/lib/solar/shadow-calculation-service.ts:100,351] — `options.seatingElevationM ?? 0` has no `>= 0` clamp, so a negative would inflate `effectiveHeight = building.height − seatingElevationM + groundDelta` and oversize shadows. **Latent only:** `coerceSeatingElevation` drops negatives at the data boundary and the only callers (sun-engine real path + the legacy `calculateVenueShadow`) never pass a negative. Cheap, unambiguous hardening that matches the documented "Defaults to 0 (ground level)" invariant: `Math.max(0, options.seatingElevationM ?? 0)` at both call sites. (Source: blind+edge; low severity.) → **FIXED 2026-06-25:** both call sites now wrap `Math.max(0, …)`; the `seatingElevationM` option JSDoc documents the ground-level-minimum invariant. Gate re-run green: `tsc` 0, `vitest` 70 files / 625 tests.

- [x] [Review][Defer] Confidence/coverage caps still include casters the elevation/terrain gate excludes [nextjs-app/lib/solar/shadow-calculation-service.ts:141-149,233-240] — deferred, pre-existing. `obstructionRisks` and `shadowDataCoverage` are computed over **all** nearby buildings *before* the height/terrain gate loop, so a caster the 8.6/8.7 gate drops (downhill / below an elevated seating surface) still feeds `getObstructionRiskConfidenceCap` and the coverage cap and can lower the confidence of a venue it does not actually shadow. The pattern is verbatim-pre-existing (sub-3 m casters already behaved this way before 8.6); the elevation work only **widens** which casters get gated out, and the effect is **dormant** until a venue sets `seating_elevation_m`/`ground_elevation_m` (every launch venue leaves both null → flat path byte-identical, so AC2 is not regressed). Whether the obstruction-risk/coverage set should track the geometric gate is a design decision out of scope for 8.7. (Source: blind+edge.)
