# Story 8.6: Elevation-Aware Shadow Gate for Rooftop / Raised Venues

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **sun-seeker**,
I want a venue whose outdoor seating sits above street level (rooftop bar, raised terrace, balcony) to be predicted from the height of its seating surface,
so that a venue sitting above its neighbouring buildings is not wrongly reported as shaded.

## Context

The shadow engine is currently **2D / ground-level for the target venue**. `computeShadowInfo` (`nextjs-app/lib/solar/shadow-calculation-service.ts:95`) projects each nearby caster's shadow as a flat polygon and tests 2D overlap against the seating polygon with **no venue-elevation input**, so a rooftop bar or raised terrace that physically sits above its neighbours is computed as if at street level and is wrongly reported as shaded (high confidence, wrong answer — the worst failure mode, on the most obviously-sunny venues).

The nullable column `public.venues.seating_elevation_m` (Story 8.2 contract — metres of the seating surface above local ground) already records this data; it is **capture-only** today (see `nextjs-app/docs/venue-data-load.md`). This story makes the engine **consume** it via a lightweight, all-or-nothing **height gate** (Tier 1 — the flat-city rooftop case): a caster only shadows the venue by its height *above* the seating surface, so a caster at or below the seating surface stops mattering.

Terrain / DTM ground-elevation handling for hilltop venues (where the venue's *ground* is higher than the casters' ground) is the sibling **Story 8.7** — do **not** implement DTM ground lookup here.

This is **backend / data-accuracy only — no new screen**. It rides on the **opt-in real engine path** (`SUNNYSEAT_SUN_ENGINE=real`, off in CI); the default seed path is untouched, and every current fixture / launch venue leaves `seating_elevation_m` null, so the engine output stays byte-identical and the existing visual gates pass with no rebaseline.

## Acceptance Criteria

> **No new-screen Design Gate for this story.** Backend / data-accuracy only — no new screen or visual reference; it inherits the Epic 8 overall design gate (see below). Intentional per epics.md. ACs are verbatim from `epics.md` → Story 8.6; the leading `AC1.`–`AC4.` labels are reference handles only.

**AC1.**
**Given** a venue with `seating_elevation_m` set (> 0) and nearby active shadow casters
**When** the sun engine computes the venue's shadow
**Then** a caster only shadows the venue by its height *above* the seating surface — its effective casting height is reduced by `seating_elevation_m` before the meaningful-height gate, so a caster at or below the seating surface no longer contributes a shadow to that venue

**AC2.**
**Given** a venue with `seating_elevation_m` null or 0 (every current fixture / launch venue)
**When** the engine computes the venue's shadow
**Then** behaviour is byte-identical to today's ground-level 2D overlap — no regression, and the existing visual gates pass with no rebaseline

**AC3.**
**Given** the server-only venue store (`lib/services/venue-store.ts`)
**When** a Supabase venue row carries `seating_elevation_m`
**Then** it is selected via `VENUE_SELECT_COLUMNS`, mapped through `StoredVenue` as a **server-only** field (never serialized into `VenueDataDto`, mirroring `seatingArea`), and threaded into `lib/services/sun-engine.ts` → the `computeShadowInfo` call chain (list + detail + timeline paths)

**AC4.**
**Given** the height gate is all-or-nothing (a caster taller than the seating surface still casts a full-coverage shadow; sub-shadow partial occlusion is not modelled)
**When** predictions are produced for elevated venues
**Then** this approximation is documented as a known MVP limitation, consistent with the engine's existing "coarse for MVP" treatment, rather than presented as a silently over-confident result

## Design Gate Criteria (Epic 8 overall)

- **Behaviour:** Every existing screen behaves identically; this is a data/accuracy swap behind the API boundary. No new interaction.
- **Visual validation:** No new screen or visual reference. The five existing gate states + map-primary continue to pass; launch venues keep `seating_elevation_m` null → existing ground-level path → no rebaseline. Any genuine visual change requires explicit rationale + `REBASELINE-LOG.md`.
- **Copy:** No user-facing copy change; if confidence/uncertainty wording is touched it stays free of geodata internals (no elevation-in-metres jargon per Story 3.0.6).

## Tasks / Subtasks

- [ ] **Task 1 — Baseline gate (Supporting — pre-work, not a direct AC)**
  - [ ] 1.1 Run the baseline gate clean at the current tree: `cd nextjs-app && npx tsc --noEmit && npx eslint . && npx vitest run` (expect ≥ 70 files / ≥ 606 tests, matching the post-8.5 baseline). Record counts.
  - [ ] 1.2 Confirm the default path is flag-off: `SUNNYSEAT_SUN_ENGINE` unset → `shouldUseRealSunEngine()` false → adapter never called.

- [ ] **Task 2 — Thread `seating_elevation_m` through the venue store (AC: #3)**
  - [ ] 2.1 Add `seatingElevationM?: number` to `StoredVenueServerOnly` in `lib/services/venue-store.ts` (server-only, alongside `seatingArea`). Document it is NEVER surfaced by `toVenueData`.
  - [ ] 2.2 Add `'seating_elevation_m'` to `VENUE_SELECT_COLUMNS` and `seating_elevation_m?: number | null` to the `VenueRow` type.
  - [ ] 2.3 In `fromVenueRow`, map it via a `coerceSeatingElevation(row.seating_elevation_m)` guard (mirror `coerceSeatingArea`): keep only a finite number `>= 0`; drop null / negative / NaN → field absent (treated as ground level). Spread it conditionally like `...(seatingArea ? { seatingArea } : {})`.
  - [ ] 2.4 Verify `toVenueData` does NOT copy `seatingElevationM` into the base DTO (server-only boundary — same as `seatingArea`).

- [ ] **Task 3 — Thread elevation into the engine call chain (AC: #1, #3)**
  - [ ] 3.1 In `lib/services/sun-engine.ts` `computeRealSunEngine`, read `venue.seatingElevationM` (default 0) and pass it to both `calculateVenueShadowForGeometry(geometry, requestedAt, …)` and `calculateVenueShadowTimelineForGeometry(geometry, …)`.
  - [ ] 3.2 In `lib/solar/shadow-calculation-service.ts`, add an optional `seatingElevationM = 0` parameter to `calculateVenueShadowForGeometry`, `calculateVenueShadowTimelineForGeometry`, and the internal `computeShadowInfo`, threaded through unchanged where it is not yet used. Keep the existing `calculateVenueShadow` (id-based) signature additive/back-compatible (default 0).
  - [ ] 3.3 Update the `lib/solar` barrel (`lib/solar/index.ts`) only if the exported signatures change in a way that needs re-export (they are additive, so likely no change).

- [ ] **Task 4 — Apply the height gate in `computeShadowInfo` (AC: #1, #4)**
  - [ ] 4.1 In the caster loop (`shadow-calculation-service.ts:114`), compute `effectiveHeight = building.height - seatingElevationM`. Replace the gate `if (building.height < SG.MIN_MEANINGFUL_HEIGHT) continue;` with `if (effectiveHeight < SG.MIN_MEANINGFUL_HEIGHT) continue;` so a caster at/below the seating surface is excluded.
  - [ ] 4.2 Use `effectiveHeight` (not `building.height`) for the shadow geometry + length so the part *above* the terrace casts the shadow: `SG.projectBuildingShadow(building.geometry, effectiveHeight, solarPosition)` and `SG.calculateShadowLength(effectiveHeight, …)`. Keep `buildingHeight: building.height` in the `ShadowProjection` record for provenance (the gate/length use effective height; the record keeps the true caster height).
  - [ ] 4.3 Add a short code comment marking the **all-or-nothing MVP approximation** (a caster slightly taller than the terrace still casts a full-coverage shadow; sub-shadow partial occlusion is Tier-3 future work) — satisfies AC4.
  - [ ] 4.4 Confirm `seatingElevationM = 0` makes `effectiveHeight === building.height` so the math is **identical** to today (AC2).

- [ ] **Task 5 — Tests (AC: all)**
  - [ ] 5.1 `test/unit/services/venue-store.test.ts` (or the existing venue-store test): a row with `seating_elevation_m` maps to `StoredVenue.seatingElevationM`; null/negative/NaN → field absent; `toVenueData` output never contains it (boundary assertion); `VENUE_SELECT_COLUMNS` includes `seating_elevation_m` (query-contract assertion, mirroring the 8.5 contract tests).
  - [ ] 5.2 `lib/solar` shadow-service unit test: a caster shorter than `seatingElevationM` is excluded (venue reported sunlit); the SAME caster with `seatingElevationM = 0` shadows the venue (proves the gate). A caster much taller than the terrace still shadows it.
  - [ ] 5.3 Regression: `seatingElevationM` unset/0 yields byte-identical `shadowedAreaPercent` / `sunlitAreaPercent` to the pre-change result for a fixture geometry (AC2).
  - [ ] 5.4 Run the full gate: `tsc` 0, `eslint` 0, `vitest` ≥ baseline (no dropped tests; new tests added). No new Playwright/visual specs (no new screen).

- [ ] **Task 6 — Docs + deferred-work closeout (AC: all)**
  - [ ] 6.1 Update `nextjs-app/docs/venue-data-load.md`: change the `seating_elevation_m` "Elevation" note from "planned" to "consumed (rooftop/raised height gate) as of Story 8.6; terrain/hilltop DTM delta is Story 8.7."
  - [ ] 6.2 Per the deferred-work queue convention, the SM removes the "Story 8.5 follow-up — venue elevation" entry from `deferred-work.md` when this story is drafted (the height-gate AC is now carried here); leave the residual Tier-2 terrain scope pointing at Story 8.7.
  - [ ] 6.3 Update `sprint-status.yaml`: `8-6-elevation-aware-shadow-rooftop` → `review` when dev-complete (via the story-review gate), not before.

## Dev Notes

### Exact call chain (do not reinvent)
```
app/api/venues/route.ts  (list)        app/api/venues/[slug]/route.ts (detail)
        │                                       │
        └── getVenues() ─┐         ┌── getVenueBySlug() ──┘   [venue-store.ts]
                         ▼         ▼
        applyRealSunEngine(venue, requestedAt, …)            [sun-engine.ts:221]
                         │  (gated by shouldUseRealSunEngine)
                         ▼
        computeRealSunEngine(...)                            [sun-engine.ts:254]
          ├── calculateVenueShadowForGeometry(geometry, requestedAt[, seatingElevationM])
          └── calculateVenueShadowTimelineForGeometry(geometry, …[, seatingElevationM])
                         │                                   [shadow-calculation-service.ts]
                         ▼
        computeShadowInfo(geometry, …, [seatingElevationM])  ← THE GATE (line 95/114)
```

### The minimal change (Tier 1)
- The gate today: `shadow-calculation-service.ts:115` → `if (building.height < SG.MIN_MEANINGFUL_HEIGHT) continue;`
- The change: `effectiveHeight = building.height - seatingElevationM`, then gate + shadow length/geometry use `effectiveHeight`. That is the whole behavioural change; everything else is plumbing the value down.
- `seatingElevationM` is **metres of the seating surface above its own local ground** (the flat-city rooftop model). This story assumes venue ground ≈ caster ground (true for central Gothenburg rooftop bars). The **terrain** case (venue ground ≠ caster ground) is Story 8.7's DTM delta — explicitly out of scope here.

### Server-only boundary (critical — do not leak)
- `seating_elevation_m` / `seatingElevationM` is **server-only**, exactly like `seatingArea`. It must NEVER appear in `VenueDataDto` (`lib/types/api`) or any client response. `toVenueData` (`venue-store.ts:201`) is the boundary — it copies an explicit allow-list of fields; do not add elevation to it. Mirror the `coerceSeatingArea` guard pattern (`venue-store.ts:351`) for `coerceSeatingElevation`.

### Why the default path stays byte-identical (AC2)
- Default path: `SUNNYSEAT_SUN_ENGINE` unset → `shouldUseRealSunEngine()` false → `applyRealSunEngine` never called → seed values. Even on the real path, every fixture / launch venue has no `seating_elevation_m`, so `seatingElevationM` defaults to 0 → `effectiveHeight === building.height` → identical math. The dev-visual-gate slug `test-venue-sunny` is unaffected.

### Anti-patterns to avoid
- ❌ Do NOT add DTM / ground-elevation lookup — that is Story 8.7.
- ❌ Do NOT model fractional / partial occlusion (a caster slightly above the terrace casting a *reduced* shadow). All-or-nothing is the intended MVP approximation; document it (AC4), don't build it.
- ❌ Do NOT serialize elevation into the DTO or any user-facing copy.
- ❌ Do NOT change the `calculateVenueShadow` (id-based) public signature in a breaking way — add an optional, defaulted param.
- ❌ Do NOT break the `lib/solar` dynamic-import boundary or the API boundary (client never imports `lib/solar`/`lib/services/*`).

### Testing standards
- Vitest unit tests; boundary-mock `@/lib/supabase/server` per the venue-store test precedent (one dynamic-import per mock — see the `reference_vitest_dynamic_import_mock_bypass` rule: mock the adapter boundary, not concurrent `await import()`).
- Baseline to beat: post-8.5 = **70 files / 606 tests**, `tsc` 0, `eslint` 0. Add tests; drop none.
- No new Playwright/visual specs (no new screen). Default-path Playwright specs must stay green.

### Project Structure Notes
- Touch points: `lib/services/venue-store.ts`, `lib/services/sun-engine.ts`, `lib/solar/shadow-calculation-service.ts` (+ `lib/solar/index.ts` only if a signature re-export needs it), `nextjs-app/docs/venue-data-load.md`, tests under `test/unit/`.
- The DB column already exists (`_bmad-output/implementation-artifacts/8-2-venues-store-contract.sql`) — **no migration / SQL change** in this story.

### File Impact
- **Files Modified:** `nextjs-app/lib/services/venue-store.ts`, `nextjs-app/lib/services/sun-engine.ts`, `nextjs-app/lib/solar/shadow-calculation-service.ts`, `nextjs-app/lib/solar/index.ts` (only if a re-export changes), `nextjs-app/docs/venue-data-load.md`, `_bmad-output/implementation-artifacts/deferred-work.md` (closeout), `_bmad-output/implementation-artifacts/sprint-status.yaml` (status), and the affected `nextjs-app/test/unit/**` test files.
- **Files Created:** none required; a new `test/unit/**` spec file may be added for the elevation cases (optional — may extend existing `sun-engine.test.ts` / shadow-service tests).
- **Explicitly NOT changed:** no SQL/migration (the `seating_elevation_m` column already exists), no `VenueDataDto` (`lib/types/api`) change (server-only field), no client component, no new Playwright/visual reference.

### References
- [Source: CLAUDE.md] and [Source: AGENTS.md — canonical repo rulebook for AI agents] — API boundary, local-Docker/WSL rules, deferred-work convention
- [Source: project-context.md — project standards/conventions + screen map]
- *(N/A for this story: `nextjs-app/docs/design/DESIGN.md` and `ux-design-specification.md` — backend/no-new-screen; no UX surface touched.)*
- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.6]
- [Source: _bmad-output/planning-artifacts/prd.md#FR12a] and #Shadow Data Trust Realignment
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Shadow Caster Lookup (step 6)]
- [Source: nextjs-app/lib/solar/shadow-calculation-service.ts:95,114-124 — computeShadowInfo + the caster gate]
- [Source: nextjs-app/lib/services/sun-engine.ts:254,275,306,340 — computeRealSunEngine + geometry/timeline calls]
- [Source: nextjs-app/lib/services/venue-store.ts:48,111,303,351 — StoredVenueServerOnly, VENUE_SELECT_COLUMNS, fromVenueRow, coerceSeatingArea]
- [Source: nextjs-app/docs/venue-data-load.md#Elevation — capture structure + current limitation]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md — "Story 8.5 follow-up — venue elevation" (retargeted → 8.6/8.7)]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
