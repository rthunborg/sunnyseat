---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04-generate-tests'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-07-06'
inputDocuments:
  - '_bmad-output/implementation-artifacts/11-9-venue-data-model-cleanup.md'
  - 'nextjs-app/lib/types/api.ts (VenueDataDto/VenueDetailDto openingHours + shadowWarningMinutes + timeline.peakTime)'
  - 'nextjs-app/lib/services/venue-store.ts (VENUE_SELECT_COLUMNS, openingHours/peakTime/shadowWarningMinutes flow, coerce* precedent, fromVenueRow)'
  - 'nextjs-app/lib/services/venues-fixture.ts (11.4 seed-path openingHours entries)'
  - 'nextjs-app/lib/utils/time-planner.ts (STOCKHOLM_TIME_ZONE / Intl.DateTimeFormat precedent the new formatter reuses)'
  - 'nextjs-app/components/composed/venue/VenueDetailContent.tsx (ÖPPET badge + Öppettider row + 11.6 same-box Skeleton swap)'
  - 'nextjs-app/components/composed/venue/VenueQuickInfo.tsx (11.4 opening-hours line, quick-info-opening-hours testid)'
  - 'nextjs-app/app/api/venues/[slug]/route.ts (buildDetailDto peakTime/openingHours/shadowWarningMinutes wiring)'
  - 'nextjs-app/test/unit/time-planner.today-window.atdd.test.ts (house-style ATDD precedent)'
  - 'nextjs-app/test/unit/services/venue-store.test.ts + test/unit/api/venue-detail-route.test.ts + test/components/VenueDetailContent.test.tsx (sibling suites to extend, not duplicate)'
---

# ATDD Checklist: Story 11.9 — Venue Data Model Cleanup (IDs, Per-Weekday Hours, Dead-Field Removal)

## TDD Red Phase (Current)

All acceptance scaffolds below are authored in the **red phase**: every `describe`/`it` block is
`.skip`-ed and asserts the EXPECTED post-implementation behaviour. They compile & collect against the
current tree (`tsc --noEmit` clean — enforced by the repo's PostToolUse tsc gate on every write;
`vitest run` collects all four files as **25 skipped**) and stay green-because-skipped in CI until the
dev un-skips them task-by-task as each goes green. No wall-clock reads: the acceptance signal is
**derived-string / today's-close / undefined-when-closed / column-membership / serialized-shape / render
presence** — all deterministic against an INJECTED `now` (formatter) or a fake-timer clock (route) or
props (component). New API the scaffolds reference ahead of its existence (`formatOpeningHours`,
`coerceOpeningHours`, the per-weekday `openingHours` type, the converted fixture entries) is accessed via
dynamic-require shims / `unknown`-cast typed shims so the `.skip`-ed files type-check NOW and go red at
runtime only when un-skipped.

### Step 1 — Preflight & Context

- **Detected stack:** `fullstack` (Next.js app + API routes under `nextjs-app/`; `playwright.config.ts`
  + `vitest.config.ts` both present; Supabase Postgres backend the migration targets).
- **Prerequisites:** Story approved (`ready-for-dev`) with clear ACs (AC1–AC6 + Design Gate). Playwright +
  Vitest configured. ✅ Satisfied.
- **Framework & patterns loaded:** Vitest for unit/component; Playwright for e2e. Reused house-style
  precedents: `time-planner.today-window.atdd.test.ts` (pure boundary asserts with an injected `now`,
  dynamic-import shim for not-yet-existing exports), `venue-store.test.ts` (hoisted service-role mock +
  `VENUE_SELECT_COLUMNS` structural asserts), `venue-detail-route.test.ts` (real `GET` route + fake-timer
  clock + serialized-body asserts), `VenueDetailContent.test.tsx` (Testing Library render, prop-fed,
  testid-driven, never-fabricate negatives).
- **TEA config flags:** `test_stack_type: auto` → fullstack; `tea_use_playwright_utils: true`;
  `tea_execution_mode: auto` → resolved **sequential** (single-thread runtime; scaffolds authored inline,
  no subagent fan-out — matching the established Epic-10/11 ATDD checklists).

### Step 2 — Generation Mode

- **Mode:** AI generation (ACs are clear; scenarios are pure-formatter math + store-adapter coercion + DTO
  serialization + prop-fed component render — no live-browser interaction seam). No recording: the data-model
  cleanup has no new gesture/selector to capture; the render invariants are asserted through props, not a
  recorded DOM.

### Step 3 — Test Strategy (AC → level → priority)

| AC | Scenario | Level | Priority | Scaffold file |
| -- | -------- | ----- | -------- | ------------- |
| AC2 | `formatOpeningHours(hours, now, locale)` derives display + today's close for the CURRENT Stockholm weekday; closed-today (`null`) → `{}`; no-hours → `{}`; past-midnight (18→02) → "till 02:00"; malformed → `{}` no throw; locale-aware; **test-venue-sunny gate parity** (new shape derives "Öppet till 22:00"/`22:00`) | Unit (pure) | P0 | `test/unit/utils/opening-hours.atdd.test.ts` |
| AC3, AC4 | `VENUE_SELECT_COLUMNS` drops `peak_time` + `shadow_warning_minutes`, keeps `opening_hours` | Unit | P0 | `test/unit/services/venue-store.opening-hours-shape.atdd.test.ts` |
| AC2 | `coerceOpeningHours` maps the new per-weekday jsonb through (structured, no `display` key); `null`/malformed → `undefined` never a throw | Unit | P0 | `test/unit/services/venue-store.opening-hours-shape.atdd.test.ts` |
| AC2 (11.4 seam) | Converted `VENUE_FIXTURE`: ≥1 present (structured) + ≥1 absent so BOTH formatter branches are reachable on the SEED path (flag OFF, what CI runs); no `peakTime`/`shadowWarningMinutes` on fixtures | Unit | P1 | `test/unit/services/venue-store.opening-hours-shape.atdd.test.ts` |
| AC4 | Serialized detail DTO has NO `shadowWarningMinutes` | Unit (API route) | P0 | `test/unit/api/venue-detail-route.data-cleanup.atdd.test.ts` |
| AC3 | Serialized `timeline.peakTime` (engine, timeline-derived) SURVIVES the stored-column removal (regression guard — must keep passing) | Unit (API route) | P0 | `test/unit/api/venue-detail-route.data-cleanup.atdd.test.ts` |
| AC2 | Serialized `openingHours` is the per-weekday shape (no `display` string); absent-hours serializes honestly (no `"Öppettider saknas"` fabrication) | Unit (API route) | P0 | `test/unit/api/venue-detail-route.data-cleanup.atdd.test.ts` |
| AC2 | Detail render: open-today → ÖPPET·{derived close} badge + derived "till HH:MM" row; closed-today → NO badge/no fabricated time; loading → same-box Skeleton swap preserved (11.6) | Component | P0 | `test/components/VenueDetailContent.opening-hours-derived.atdd.test.tsx` |

- **Red-phase requirement confirmed:** every block designed to FAIL before implementation —
  `formatOpeningHours`/`coerceOpeningHours` do not exist; `VENUE_SELECT_COLUMNS` still contains both dead
  columns; `body.venue.shadowWarningMinutes` is still `45`; `openingHours` still serializes a `display`
  string; the fixtures still carry `{display, closesAt}` + `peakTime` + `shadowWarningMinutes`; the detail
  render still reads a stored `closesAt`/`display`. All `.skip`-ed.
- **Dedup discipline:** weekday/closed/past-midnight MATH at UNIT (formatter) only; column-membership +
  coercion + fixture-shape at UNIT (store) only; end-to-end serialization (shadowWarningMinutes gone,
  peakTime kept, openingHours shape) at the API-route level only; render presence/absence + same-box swap at
  COMPONENT only. The engine `timeline.peakTime` is asserted ONCE (route) as a keep-guard so AC3's "no
  surface loses a real value" is provable without duplicating engine coverage.

### Coverage note — AC1, AC5, AC6 (deliberately not runtime-test scaffolds)

- **AC1 (auto-assigning `text` PK) + AC6 (idempotent live migration; RLS/server-only cols/gate venue
  preserved):** these are **DB-DDL + live-apply** acceptance criteria whose proof is the migration's
  end-of-file SMOKE CHECKS (7 rows; gate venue resolves; deny-by-default grants; single `venues_service_read`
  policy; next auto-id = `"8"`; `reviews.venue_id`/`feedback.venue_id` still join), run by the dev against
  the live DB per Task 1.6/1.7 and recorded in the Dev Agent Record. There is no runtime app seam to red-phase
  here — a Vitest/Playwright scaffold cannot exercise a Supabase DDL sequence, and the store adapter is mocked
  in unit tests. **Covered by the migration's own smoke checks + the store/route scaffolds above**, not by a
  separate failing test. (Flagged so the trace matrix does not read AC1/AC6 as un-tested.)
- **AC5 (rewrite `venue-data-load.md`):** a documentation deliverable — verified by review that the `id` row,
  the per-weekday `opening_hours` example, and the removal of `peak_time`/`shadow_warning_minutes` land, and
  the JSON example is copy-pasteable/valid. No automated scaffold.

## Acceptance Criteria Coverage

- **AC1 (auto-assigning text PK; joins/gate preserved):** ⚠ covered by the migration smoke checks
  (DB-level; no runtime scaffold — see coverage note).
- **AC2 (per-weekday hours; derive display + ÖPPET badge at render):** ✅ covered — formatter unit
  (weekday/closed/no-hours/past-midnight/malformed/locale/gate-parity) + store coercion + fixture shape +
  DTO serialization + detail render (present/absent/loading).
- **AC3 (remove stored `peak_time`; engine `peakTime` unchanged):** ✅ covered — `VENUE_SELECT_COLUMNS`
  drop + serialized `timeline.peakTime` keep-guard.
- **AC4 (remove `shadow_warning_minutes` end-to-end):** ✅ covered — column drop + no-fixture-field +
  serialized-DTO absence.
- **AC5 (rewrite data-load doc):** ➖ doc deliverable, review-verified (no scaffold).
- **AC6 (idempotent live migration; RLS/server-only/gate preserved):** ⚠ covered by migration smoke checks
  (DB-level; see coverage note).

## Generated Files (all RED / skipped)

1. `nextjs-app/test/unit/utils/opening-hours.atdd.test.ts` — P0 AC2 formatter: open-today, current-weekday,
   past-midnight, closed-today, no-hours, malformed, locale-aware + test-venue-sunny gate parity (8 tests)
2. `nextjs-app/test/unit/services/venue-store.opening-hours-shape.atdd.test.ts` — P0 AC3/AC4 column drop +
   P0 AC2 `coerceOpeningHours` + P1 fixture-shape (10 tests)
3. `nextjs-app/test/unit/api/venue-detail-route.data-cleanup.atdd.test.ts` — P0 AC4 no-shadowWarningMinutes +
   P0 AC3 engine-peakTime keep-guard + P0 AC2 openingHours-shape/absent-honest (4 tests)
4. `nextjs-app/test/components/VenueDetailContent.opening-hours-derived.atdd.test.tsx` — P0 AC2 derived
   badge + derived row + closed-today omission + loading same-box swap (4 tests)

> **Quick-info line note:** AC2's quick-info "Öppet till HH:MM" line (`quick-info-opening-hours` testid,
> `VenueQuickInfo.tsx`) is DERIVED by the SAME formatter proven exhaustively in scaffold #1, and Dev Notes
> 3.3 prefers computing it in the caller (`MapView`) so `VenueQuickInfo` stays presentational. Rather than a
> 5th scaffold that re-asserts the same derivation through a second component, its acceptance is the formatter
> unit proof (#1) + the detail render proof (#4). If the dev keeps derivation inside `VenueQuickInfo`, add a
> mirror of scaffold #4's present/absent rows to `VenueQuickInfo.test.tsx` in the green phase.

## Next Steps (TDD Green Phase)

After implementing Story 11.9 (per its Tasks 1–6):

1. Un-skip each scaffold block as the corresponding task goes green — Task 2 (store) → scaffold #2; Task 3.2
   (formatter) → scaffold #1; Task 3.4/3.6 (render + route) → scaffolds #4 + #3 — NOT all at once.
2. Replace the red-phase shims with the real API as each lands: the dynamic `require('.../opening-hours')`
   → a static `import { formatOpeningHours }`; the `require('.../venue-store').coerceOpeningHours` → the real
   export (or fold into a `fromVenueRow` output assertion if the coercer stays private); the
   `buildDetail(hours as unknown)` cast → the typed per-weekday `VenueDetailDto['openingHours']`.
3. Run `npx vitest run` (unit/component) → verify the 4 files flip from skipped to PASS (green phase). Record
   the baseline→final vitest count in the Dev Agent Record (count must increase, none dropped).
4. If the AC2 "closed-today renders nothing" block fails because the derived layer emitted a stand-in time,
   that is a NEVER-FABRICATE regression — FIX the formatter/render, do NOT relax the negative assertion.
5. The derived badge/line SHOULD be byte-identical to the current treatment (Design Gate goal → no
   rebaseline). If it visibly shifts, note a maintainer visual-validation follow-up in Completion Notes — dev
   is FORBIDDEN from self-blessing / creating / editing reference PNGs (project-wide inversion rule).
6. Record the AC1/AC6 migration smoke-check output in the Dev Agent Record (these ACs are proven there, not by
   a scaffold — see coverage note).

## Validation (Step 5)

- [x] Prerequisites satisfied (approved ACs, Playwright + Vitest configured).
- [x] Test files created correctly (4 files; each header explains scope, red-phase status, shim boundary, and
      which task un-skips it).
- [x] Checklist maps every AC to a level + priority + scaffold (or an explicit DB-smoke-check / doc-review
      coverage note for AC1/AC5/AC6).
- [x] All tests designed to FAIL before implementation (all `.skip`-ed; assert EXPECTED post-change behaviour;
      no placeholder `expect(true)`; new API accessed via type-safe dynamic-require / `unknown`-cast shims so
      the `.skip`-ed files compile now and go red on un-skip).
- [x] `tsc --noEmit` clean for all 4 scaffolds (PostToolUse tsc gate passed on each write; two type slips —
      `VenueDetailDto`→`Record` needing a via-`unknown` cast, and `loading`→`isLoading` — were caught by the
      gate and fixed). `vitest run` collects all 4 files as **25 skipped**; sibling suites untouched.
- [x] No CLI browser sessions opened (AI generation only — no recording).
- [x] Temp artifacts stored under `{test_artifacts}` (this checklist) + `nextjs-app/test/**` (the scaffolds).

## Key Risks / Assumptions

- **New-API names are the dev's call:** the scaffolds probe `formatOpeningHours` / `coerceOpeningHours` (the
  Dev-Notes names) tolerantly (dynamic require + regex-on-time, not exact copy) — the acceptance signal is the
  VALUE/behaviour (derived close, undefined-when-closed, shape without `display`), not a name/signature the dev
  has not chosen. If the dev returns two functions instead of one `{display?, closesAt?}`, or picks a
  `"mon".."sun"` key convention, adjust the fixture/probe; the assertions stand.
- **Per-weekday KEY convention:** the scaffolds assume the Dev-Notes numeric-ISO shape (`"1".."7"`, `null` =
  closed, `close < open` = past-midnight). If the architect blesses named-weekday keys, update `WEEKLY_HOURS`
  and the `'1'..'7'` membership probe in scaffold #3 — no assertion logic changes.
- **AC1/AC6 are DB-DDL, not a runtime seam:** proven by the migration's own smoke checks against the live DB
  (recorded in the Dev Agent Record), NOT a failing Vitest/Playwright test — a scaffold cannot exercise a
  Supabase DDL + RLS + seq-default sequence, and unit tests mock the service-role client. This is deliberate,
  not a coverage gap (flagged so `*trace` reads AC1/AC6 as smoke-check-covered).
- **Badge open-guard stays out of scope:** per the Dev-Notes decision, the badge derives from TODAY's close
  (weekday-correct) — the scaffolds do NOT assert a minute-precise is-open-now guard; they assert the badge
  reflects today's derived close and VANISHES when today has no hours. If the dev adds the trivial guard, the
  closed-today assertion still holds; a before-open/after-close case can be added in the green phase.
- **Gate parity is byte-stable on the ASSERTED value:** scaffold #1's gate-parity block pins that the new
  per-weekday shape for `test-venue-sunny` derives "Öppet till 22:00" / `closesAt "22:00"` (the 8-2 smoke
  value), using Monday as the reference 22:00 weekday — the dev must ensure the seed weekday the store/route
  tests fix is a 22:00 day.
- **SEED-path determinism (11.4):** the fixture-shape scaffold guards the CI seam — on flag OFF `getVenues()`
  returns raw `VENUE_FIXTURE`, so the converted entries must keep ≥1 present + ≥1 absent for both formatter
  branches without live Supabase.

**Next recommended workflow:** implement Story 11.9 (`dev-story`), un-skipping each scaffold as its task goes
green (Task 2 → store; Task 3.2 → formatter; Task 3.4/3.6 → render + route) and swapping the shims for the
real API; apply + smoke-check the migration for AC1/AC6; then `*automate` for broader coverage and `*trace` at
the Epic-11 boundary (feeding the AC1/AC5/AC6 coverage notes above into the matrix).
