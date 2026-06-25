# Story 8.6: Elevation-Aware Shadow Gate for Rooftop / Raised Venues

Status: done

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

- [x] **Task 1 — Baseline gate (Supporting — pre-work, not a direct AC)**
  - [x] 1.1 Run the baseline gate clean at the current tree: `cd nextjs-app && npx tsc --noEmit && npx eslint . && npx vitest run` (expect ≥ 70 files / ≥ 606 tests, matching the post-8.5 baseline). Record counts. → **Clean: tsc 0, eslint 0, vitest 70 files / 606 tests.**
  - [x] 1.2 Confirm the default path is flag-off: `SUNNYSEAT_SUN_ENGINE` unset → `shouldUseRealSunEngine()` false → adapter never called. → Confirmed (sun-engine env-gate tests pass; default path never calls `applyRealSunEngine`).

- [x] **Task 2 — Thread `seating_elevation_m` through the venue store (AC: #3)**
  - [x] 2.1 Add `seatingElevationM?: number` to `StoredVenueServerOnly` in `lib/services/venue-store.ts` (server-only, alongside `seatingArea`). Document it is NEVER surfaced by `toVenueData`.
  - [x] 2.2 Add `'seating_elevation_m'` to `VENUE_SELECT_COLUMNS` and `seating_elevation_m?: number | null` to the `VenueRow` type.
  - [x] 2.3 In `fromVenueRow`, map it via a `coerceSeatingElevation(row.seating_elevation_m)` guard (mirror `coerceSeatingArea`): keep only a finite number `>= 0`; drop null / negative / NaN → field absent (treated as ground level). Spread it conditionally (`...(seatingElevationM !== undefined ? { seatingElevationM } : {})`, so a stored `0` is preserved as ground level).
  - [x] 2.4 Verify `toVenueData` does NOT copy `seatingElevationM` into the base DTO (server-only boundary — same as `seatingArea`). → Boundary asserted in the venue-store test.

- [x] **Task 3 — Thread elevation into the engine call chain (AC: #1, #3)**
  - [x] 3.1 In `lib/services/sun-engine.ts` `computeRealSunEngine`, read `venue.seatingElevationM` (default 0) and pass it to both `calculateVenueShadowForGeometry(geometry, requestedAt, …)` and `calculateVenueShadowTimelineForGeometry(geometry, …)`. → Passed via the `{ seatingElevationM }` options object to both.
  - [x] 3.2 In `lib/solar/shadow-calculation-service.ts`, add an optional `seatingElevationM = 0` parameter to `calculateVenueShadowForGeometry`, `calculateVenueShadowTimelineForGeometry`, and the internal `computeShadowInfo`, threaded through unchanged where it is not yet used. Keep the existing `calculateVenueShadow` (id-based) signature additive/back-compatible (default 0). → Added `seatingElevationM?` to `CalculateVenueShadowOptions` (additive; legacy `calculateVenueShadow` forwards `options` so it stays back-compatible) + a defaulted positional `seatingElevationM = 0` on the internal `computeShadowInfo`.
  - [x] 3.3 Update the `lib/solar` barrel (`lib/solar/index.ts`) only if the exported signatures change in a way that needs re-export (they are additive, so likely no change). → No change needed (signatures are additive via the options object).

- [x] **Task 4 — Apply the height gate in `computeShadowInfo` (AC: #1, #4)**
  - [x] 4.1 In the caster loop (`shadow-calculation-service.ts:114`), compute `effectiveHeight = building.height - seatingElevationM`. Replace the gate `if (building.height < SG.MIN_MEANINGFUL_HEIGHT) continue;` with `if (effectiveHeight < SG.MIN_MEANINGFUL_HEIGHT) continue;` so a caster at/below the seating surface is excluded.
  - [x] 4.2 Use `effectiveHeight` (not `building.height`) for the shadow geometry + length so the part *above* the terrace casts the shadow: `SG.projectBuildingShadow(building.geometry, effectiveHeight, solarPosition)` and `SG.calculateShadowLength(effectiveHeight, …)`. Keep `buildingHeight: building.height` in the `ShadowProjection` record for provenance (the gate/length use effective height; the record keeps the true caster height). → `buildingHeight: building.height` left untouched.
  - [x] 4.3 Add a short code comment marking the **all-or-nothing MVP approximation** (a caster slightly taller than the terrace still casts a full-coverage shadow; sub-shadow partial occlusion is Tier-3 future work) — satisfies AC4.
  - [x] 4.4 Confirm `seatingElevationM = 0` makes `effectiveHeight === building.height` so the math is **identical** to today (AC2). → Confirmed in code + the byte-identical regression test.

- [x] **Task 5 — Tests (AC: all)**
  - [x] 5.1 `test/unit/services/venue-store.test.ts` (or the existing venue-store test): a row with `seating_elevation_m` maps to `StoredVenue.seatingElevationM`; null/negative/NaN → field absent; `toVenueData` output never contains it (boundary assertion); `VENUE_SELECT_COLUMNS` includes `seating_elevation_m` (query-contract assertion, mirroring the 8.5 contract tests). → +3 tests; contract test now asserts 21 columns incl. `seating_elevation_m`.
  - [x] 5.2 `lib/solar` shadow-service unit test: a caster shorter than `seatingElevationM` is excluded (venue reported sunlit); the SAME caster with `seatingElevationM = 0` shadows the venue (proves the gate). A caster much taller than the terrace still shadows it. → +5 tests in `shadow-calculation-service.test.ts` (incl. provenance + AC2 regression). Plus +1 engine-threading test in `sun-engine.test.ts` (AC3 end-to-end).
  - [x] 5.3 Regression: `seatingElevationM` unset/0 yields byte-identical `shadowedAreaPercent` / `sunlitAreaPercent` to the pre-change result for a fixture geometry (AC2).
  - [x] 5.4 Run the full gate: `tsc` 0, `eslint` 0, `vitest` ≥ baseline (no dropped tests; new tests added). No new Playwright/visual specs (no new screen). → **Gate green: tsc 0, eslint 0, vitest 70 files / 615 tests (+9); visual validation auto-skipped (no mapped screen ID).**

- [x] **Task 6 — Docs + deferred-work closeout (AC: all)**
  - [x] 6.1 Update `nextjs-app/docs/venue-data-load.md`: change the `seating_elevation_m` "Elevation" note from "planned" to "consumed (rooftop/raised height gate) as of Story 8.6; terrain/hilltop DTM delta is Story 8.7."
  - [x] 6.2 Per the deferred-work queue convention, the SM removes the "Story 8.5 follow-up — venue elevation" entry from `deferred-work.md` when this story is drafted (the height-gate AC is now carried here); leave the residual Tier-2 terrain scope pointing at Story 8.7. → Already removed at draft time; the historical breadcrumb (deferred-work.md §"Story 8.5 follow-up — venue elevation") already points the residual Tier-2 terrain scope at Story 8.7; left intact.
  - [x] 6.3 Update `sprint-status.yaml`: `8-6-elevation-aware-shadow-rooftop` → `review` when dev-complete (via the story-review gate), not before.

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

Amelia (BMAD dev-story) / Claude Opus 4.8.

### Debug Log References

- Baseline gate (pre-change, Task 1.1): `tsc --noEmit` 0, `eslint .` 0, `vitest run` 70 files / 606 tests — clean, matching the post-8.5 baseline.
- Final gate (`scripts/story-review.sh --dry-run 8-6-elevation-aware-shadow-rooftop`): lint 0, typecheck 0, vitest **70 files / 615 tests** (+9), visual validation auto-skipped (no mapped screen ID — backend-only). Artifact: `_bmad-output/implementation-artifacts/validation/8-6-elevation-aware-shadow-rooftop-review-20260622-153358.log`.

### Completion Notes List

- **Tier-1 height gate implemented end-to-end.** The behavioural change is one line in `computeShadowInfo`: `effectiveHeight = building.height − seatingElevationM`, then the meaningful-height gate, shadow projection, and shadow length all use `effectiveHeight`. Everything else is plumbing the server-only value down the call chain.
- **AC1** (rooftop excludes low casters): proven by the shadow-service tests (a height-12 caster is excluded at `seatingElevationM = 50` → venue sunlit; the SAME caster at `seatingElevationM = 0` shadows it) and the sun-engine end-to-end threading test (a 50 m terrace flips an otherwise-shadowed venue to 100 % sunlit / `Sunny`).
- **AC2** (default byte-identical): `seatingElevationM` defaults to 0 everywhere → `effectiveHeight === building.height` → identical math. Proven by the byte-identical regression test (unset vs explicit 0) and the unchanged 606 prior tests. Every fixture/launch venue leaves `seating_elevation_m` null, so the default seed path is untouched and no visual rebaseline is needed.
- **AC3** (threading): `seating_elevation_m` → `VENUE_SELECT_COLUMNS` + `VenueRow` → `coerceSeatingElevation` (finite `>= 0`, else absent) → `StoredVenueServerOnly.seatingElevationM` → `sun-engine.computeRealSunEngine` → both `calculateVenueShadowForGeometry` and `calculateVenueShadowTimelineForGeometry` (list + detail + timeline) → `computeShadowInfo`. Server-only boundary preserved: `toVenueData` never copies it (asserted).
- **AC4** (documented MVP approximation): the all-or-nothing nature (a caster slightly taller than the terrace still casts a full-coverage shadow; sub-shadow partial occlusion is Tier-3 future work) is documented in a code comment in `computeShadowInfo` and in `docs/venue-data-load.md`.
- **No SQL/migration** (the `seating_elevation_m` column already exists from the Story 8.2 contract), **no `VenueDataDto` change** (server-only field), **no client component**, **no new Playwright/visual reference**. Default-path Playwright specs were not re-run: the change is server-only and inert on the default seed path (byte-identical, verified by the unchanged vitest suite), consistent with the gate auto-skipping visual validation for this backend-only story.
- Story 8.7 (Tier-2 terrain / hilltop DTM ground delta) remains the residual out-of-scope follow-up.

### File List

- `nextjs-app/lib/services/venue-store.ts` — added server-only `seatingElevationM` to `StoredVenueServerOnly`; `seating_elevation_m` in `VENUE_SELECT_COLUMNS` + `VenueRow`; `coerceSeatingElevation` guard + conditional spread in `fromVenueRow`.
- `nextjs-app/lib/services/sun-engine.ts` — `computeRealSunEngine` reads `venue.seatingElevationM` (default 0) and threads it into the single-shot + timeline shadow calls.
- `nextjs-app/lib/solar/shadow-calculation-service.ts` — `seatingElevationM?` added to `CalculateVenueShadowOptions`; threaded into `computeShadowInfo` (defaulted positional param); height gate uses `effectiveHeight = building.height − seatingElevationM` (gate + projection + length), keeping `buildingHeight` provenance.
- `nextjs-app/test/unit/services/venue-store.test.ts` — 21-column contract assertion; +3 mapping/boundary/drop tests for `seating_elevation_m`.
- `nextjs-app/test/unit/shadow-calculation-service.test.ts` — +5 height-gate tests (exclude/cast/tall/provenance/AC2-regression).
- `nextjs-app/test/unit/services/sun-engine.test.ts` — +1 engine-threading test (AC3 end-to-end).
- `nextjs-app/docs/venue-data-load.md` — Elevation section updated from "planned" to "consumed (Tier-1 height gate) as of Story 8.6; Tier-2 terrain is Story 8.7".
- `_bmad-output/implementation-artifacts/8-6-elevation-aware-shadow-rooftop.md` — task checkboxes, Dev Agent Record, Status → review.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `8-6-elevation-aware-shadow-rooftop`: ready-for-dev → in-progress → review.
- `_bmad-output/implementation-artifacts/validation/8-6-elevation-aware-shadow-rooftop-review-20260622-153358.log` — gate artifact (created by the review script).

## Change Log

- 2026-06-22 — Story 8.6 implemented (Tier-1 elevation-aware shadow height gate). Threaded the server-only `seating_elevation_m` through venue-store → sun-engine → `computeShadowInfo`; a caster now only shadows a venue by its height above the seating surface. Default path byte-identical (every launch venue null). Tests +9 (vitest 606 → 615); docs updated. Status ready-for-dev → review.

## Review Findings

**Round 1 of 3** — bmad-code-review, 2026-06-22 (Blind Hunter + Edge Case Hunter + Acceptance Auditor). Acceptance Auditor verdict: PASS on AC1–AC4 and all anti-patterns. 11 raw findings → 1 decision-needed, 2 patch, 0 defer, 8 dismissed.

- [x] [Review][Decision → Dismissed] Elevated venues can report equal-or-higher confidence on the coarser height-gate model — Reducing `effectiveHeight` shortens `shadowLength`, which avoids the `>50 m`/`>100 m` confidence penalties in `calculateShadowConfidence` (`lib/solar/shadow-geometry.ts:150-151`); gating out sub-terrace casters lowers `castingShadows.length`, shrinking the `complexityPenalty` in `calcShadowAccuracy` (`lib/solar/confidence-calculator.ts:134`) and, when all casters are gated, can push `calcBuildingDataQuality` toward 1.0 (`lib/solar/confidence-calculator.ts:111-113`). **Resolution (Rasmus, 2026-06-22): dismissed — the higher confidence is legitimate (fewer real casters above a rooftop = genuinely sunnier); no cap/flag added.**
- [x] [Review][Patch] Field-table blurb still labels `seating_elevation_m` "Capture-only today … engine consumption is planned … does not consume it yet", contradicting the shipped gate and the file's own updated "Elevation" section (Task 6.1 updated the prose section but missed the table row) [nextjs-app/docs/venue-data-load.md:32] — **fixed 2026-06-22: table row now reads "Consumed by the engine as of Story 8.6 … hilltop DTM remains Story 8.7".**
- [x] [Review][Patch] All-or-nothing code comment / docs describe only the "caster taller than the terrace" flip; they omit the symmetric 0–3 m dead-band — a caster genuinely 0–3 m above the seating surface is now silently dropped because `MIN_MEANINGFUL_HEIGHT` (3.0) is applied to `effectiveHeight`. Add one clause noting this for completeness [nextjs-app/lib/solar/shadow-calculation-service.ts:121] — **fixed 2026-06-22: added a clause to the gate comment documenting the 0–MIN_MEANINGFUL_HEIGHT dead-band above the seating surface.**

**Dismissed (not persisted as action items):** engine-receives-DTO-so-feature-inert (false — `computeRealSunEngine` gets `StoredVenue`; proven by the e2e test); 21-column assertion brittle (false — the test asserts the full ordered list incl. the literal `seating_elevation_m`); `MIN_MEANINGFUL_HEIGHT` might be 0 (false — it is 3.0, negatives are gated); e2e test passes for wrong reason (false — the shadow-service suite triangulates the subtraction via the elevation-5/elevation-10 casting cases); `buildingHeight` provenance mismatch (intended — Task 4.2 mandates keeping true height; never re-read for geometry); `coerceSeatingElevation` swallows bad data silently (intended — Task 2.3; DB `CHECK >= 0` makes negatives/NaN unreachable; fail-safe direction); "byte-identical" conflates query vs output (pedantic — refers to computed output); default-to-0 duplicated across call sites (intentional layered defense, not a bug).
