---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-07-06'
workflowType: 'testarch-trace'
gateType: 'epic'
decisionMode: 'deterministic'
regate: true
regateReason: 'Story 11.9 (venue-data-model-cleanup) adopted into Epic 11 after the 2026-07-05 epic-end trace; re-gate incorporates 11.9 ACs + checks its data-model change for regression against 11.1/11.4/11.6 coverage.'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (§Epic 11, Story 11.9 lines 3023-3128)'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-11.md'
  - '_bmad-output/implementation-artifacts/11-1..11-9-*.md'
  - '_bmad-output/implementation-artifacts/11-9-venue-data-model-cleanup.sql (live migration + smoke checks)'
  - '_bmad-output/test-artifacts/atdd-checklist-11-9.md'
  - '_bmad-output/test-artifacts/traceability/traceability-report-11-1.md'
  - '_bmad-output/test-artifacts/traceability/traceability-report-11-2.md'
---

# Traceability Matrix & Gate Decision — Epic 11 (RE-GATE incl. Story 11.9)

**Epic:** "Feels Instant, Reads Clear" — Time-Scrub Performance, Mobile Interaction & Surface Polish + Venue Data-Model Cleanup (stories 11.1–11.9)
**Date:** 2026-07-06 (re-gate; supersedes the 2026-07-05 8-story gate)
**Evaluator:** TEA Agent (Master Test Architect)
**Gate Type:** epic
**Decision Mode:** deterministic
**Story status at trace time:** all 9 stories (11.1–11.9) at `review` on the epic branch `epic/11-feels-instant-reads-clear`.

---

> **Re-gate scope.** Story 11.9 (venue-data-model cleanup) was adopted into Epic 11 AFTER the 2026-07-05
> epic-end trace (which covered 11.1–11.8 and passed). This re-gate: (a) traces 11.9's six ACs, and (b)
> re-verifies that 11.9's data-model change (per-weekday `opening_hours`, dropped `peak_time` +
> `shadow_warning_minutes`, auto-assign text PK) did **not** regress the earlier-story coverage it shares
> surfaces with (11.1 list DTO, 11.4 quick-info opening-hours line, 11.6 detail ÖPPET badge). The 11.1–11.8
> conclusions from the prior gate are re-verified green against the current tree and folded in unchanged.

Note: This workflow does not generate tests. If gaps exist, run `*atdd` or `*automate` to create coverage.

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

Epic 11 now decomposes into **34 acceptance criteria** across 9 stories (11.1: 4, 11.2: 4, 11.3: 4,
11.4: 4, 11.5: 3, 11.6: 3, 11.7: 3, 11.8: 3, **11.9: 6**). Priority for 11.1–11.8 is inherited from
`test-design-epic-11.md` (unchanged). Story 11.9's priorities are inherited from its ATDD checklist
(`atdd-checklist-11-9.md`): the honest-render + data-integrity ACs (AC2 per-weekday hours derived,
AC3 drop `peak_time` w/ engine `peakTime` kept, AC4 drop `shadow_warning_minutes` end-to-end) are **P0**;
the live idempotent migration (AC1 auto-assign PK, AC6 RLS/gate-preserving migration) are **P0 by risk**
proven by the migration's own smoke checks (DB-DDL, no runtime seam — per the ATDD coverage note); the
data-load doc rewrite (AC5) is a **P2** doc deliverable (review-verified, no scaffold).

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status  |
| --------- | -------------- | ------------- | ---------- | ------- |
| P0        | 18             | 18            | 100%       | ✅ PASS |
| P1        | 8              | 8             | 100%       | ✅ PASS |
| P2        | 4              | 4             | 100%       | ✅ PASS |
| P3        | 3              | 0             | 0%         | ℹ️ INFO (manual by design — R-014/015 + PNG blessing) |
| **Total** | **34**         | **30**        | **88%**    | ✅ PASS |

**Legend:** ✅ PASS · ⚠️ WARN · ❌ FAIL

> Overall = FULL / total = 30/34 = **88%** (≥80% minimum). **P0 = 100%** (18/18), **P1 = 100%** (8/8).
> The three non-FULL items are unchanged from the prior gate — all in the P3 manual-by-design tier (live
> date-change p95 wall-clock; physical-device gesture sweep; maintainer reference-PNG blessing). No P0 or
> P1 gap exists. **11.9 added 5 P0 criteria + 1 P2, all FULL** (AC1/AC6 via migration smoke checks recorded
> in the Dev Agent Record; AC2/AC3/AC4 via un-skipped ATDD scaffolds + regression-adjusted sibling suites;
> AC5 via review-verified doc rewrite).

---

### Story 11.9 — Detailed Mapping (NEW)

> **Independently re-verified this re-gate:** full `npx vitest run` = **152 files / 1440 tests, 0 fail**
> (up from the story-recorded 1416 — the tree grew and stays fully green); `npx tsc --noEmit` exit 0.
> A repo-wide grep confirms `shadow_warning_minutes` / `shadowWarningMinutes` now appear ONLY in
> removal-comments and **negative test assertions** (`not.toContain` / `not.toHaveProperty` / `not present`)
> — i.e. proven-gone, zero live readers (AC4 grep condition satisfied). The engine `peakTime`
> (`sun-engine.ts#peakTimeFromTimeline` + `timeline.peakTime`) is untouched (AC3 keep-guard). Both the 11.4
> quick-info line (`MapView`→`formatOpeningHours`→`VenueQuickInfo`) and the 11.6 detail badge
> (`VenueDetailContent`→`formatOpeningHours`, same-box swap preserved) consume the new per-weekday shape —
> the cross-story render seams are re-wired, not regressed.

#### 11.9-AC1: Auto-assigning `text` PK (keep text PK, no serial/identity migration); review/feedback joins + gate venue preserved (P0, DB-DDL)

- **Coverage:** FULL ✅ (via live-migration smoke checks recorded in the Dev Agent Record — no runtime seam to red-phase; per the ATDD coverage note)
- **Evidence:**
  - `11-9-venue-data-model-cleanup.sql` §Section 6 smoke checks (applied live, output recorded in the story Dev Agent Record): `id` default → `(nextval('venues_id_seq'::regclass))::text`; `select nextval` → **8** (next auto id; reset back to 7); `count(*)` = 7 rows; rows `"1".."7"` preserved; `reviews.venue_id`/`feedback.venue_id` free-text joins intact (no PK-type change, no FK added).
  - Store-side proof that the new insert path is legal: `lib/supabase/types.ts` regenerated so `Insert.id` became optional (reflects the DB default). `venue-store.test.ts` green on the new column set.
- **Recommendation:** None. AC1 is a DB-DDL criterion; the migration's own smoke checks (recorded) are the correct proof — a Vitest/Playwright scaffold cannot exercise a Supabase `sequence`+`default` DDL, and the store is mocked in unit tests. **Not an un-tested AC.**

#### 11.9-AC2: Per-weekday `opening_hours`; "Öppet till HH:MM" line + "ÖPPET · {time}" badge DERIVED at render; no-hours-today renders NOTHING (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `test/unit/utils/opening-hours.atdd.test.ts` (8 tests, live/un-skipped) — pure `formatOpeningHours(hours, now, locale)`: open-today display+`closesAt`, current-Stockholm-weekday selection, past-midnight (18→02 → "till 02:00"), closed-today (`null`) → `{}`, no-hours → `{}`, malformed → `{}` no-throw, locale-aware, and the **test-venue-sunny gate parity** ("Öppet till 22:00" / `closesAt "22:00"`, byte-stable every weekday).
  - `test/unit/utils/opening-hours.coverage.test.ts` — **NEVER-FABRICATE hardening (Round-1 Patch resolved):** `stockholmIsoWeekday` returns `number | undefined` (dropped the `?? 1` Monday default); an out-of-range `Intl` token → `undefined` → formatter short-circuits to `{}` (renders nothing) instead of fabricating Monday's hours.
  - `test/unit/services/venue-store.opening-hours-shape.atdd.test.ts` (live) — `coerceOpeningHours` maps the new per-weekday jsonb through (no `display` key); `null`/malformed → `undefined` never a throw; converted `VENUE_FIXTURE` keeps ≥1 present + ≥1 absent so BOTH formatter branches are reachable on the SEED path (flag OFF, what CI runs).
  - `test/unit/api/venue-detail-route.data-cleanup.atdd.test.ts` (live) — serialized `openingHours` is the per-weekday shape (`'display' in hours === false`; ≥1 numeric-weekday key present); absent-hours serializes honestly (no `"Öppettider saknas"` fabrication).
  - `test/components/VenueDetailContent.opening-hours-derived.atdd.test.tsx` (live) — open-today → ÖPPET·{derived close} badge + derived "till HH:MM" row; closed-today → NO badge / no fabricated time; loading → the 11.6 same-box `Skeleton`→badge swap preserved.
- **Recommendation:** None. The quick-info line derivation (computed in `MapView`, `VenueQuickInfo` stays presentational) is proven by the exhaustive formatter unit (#1) + the detail render proof (#4) — the same formatter feeds both surfaces (dedup discipline, per the ATDD checklist). The never-fabricate rule (11.4/11.6 constraint) is preserved and unit-guarded.

#### 11.9-AC3: Remove stored `peak_time`; engine `peakTime` (timeline-derived) unchanged — no surface loses a real value (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `venue-store.opening-hours-shape.atdd.test.ts` — `VENUE_SELECT_COLUMNS` drops `'peak_time'` (asserted absent); no fixture carries `peakTime`.
  - `venue-detail-route.data-cleanup.atdd.test.ts` — the ENGINE `timeline.peakTime` keep-guard: with a planner selection the derived `timeline.peakTime` still serializes as `HH:MM`.
  - `venues-route-real-engine.test.ts` / `venue-store.test.ts` / `useVenueDetail.test.ts` re-anchored to the post-removal shape (green).
- **Gaps:** (advisory, review-recorded — Round-1 `[Defer][Low]`) The AC3 `timeline.peakTime` keep-guard is wrapped in `if (body.venue.timeline.windows.length > 0)`, so an empty-window response would pass with zero assertions. Recorded as a deferred test-adequacy item (not a runtime defect this diff introduced). Does NOT reduce the AC below FULL — the column-drop + engine-untouched facts are independently pinned (grep + `sun-engine.ts` 5 refs intact).
- **Recommendation:** LOW (advisory) — pin the peakTime keep-guard against a fixed known-windowed date so the `if` cannot no-op. Backlog.

#### 11.9-AC4: Remove `shadow_warning_minutes` end-to-end (column, store field, `VenueDetailDto.shadowWarningMinutes`, asserting tests); no reader remains (P0)

- **Coverage:** FULL ✅
- **Tests / evidence:**
  - `venue-store.opening-hours-shape.atdd.test.ts` — `VENUE_SELECT_COLUMNS` `.not.toContain('shadow_warning_minutes')`; no fixture carries `shadowWarningMinutes`.
  - `venue-detail-route.data-cleanup.atdd.test.ts` — `'shadowWarningMinutes' in body.venue === false` (serialized DTO absence).
  - `venue-store.test.ts` — column count 23 − peak_time − shadow_warning_minutes = **21**; `not.toHaveProperty('shadowWarningMinutes')` at every DTO seam.
  - Migration §Section 6: `information_schema` shows 0 rows for both dropped columns (recorded).
  - **AC4 grep condition (re-verified this re-gate):** every `shadow_warning_minutes`/`shadowWarningMinutes` hit is a removal-comment or a negative assertion — **zero live readers**.
  - Original intent documented in Completion Notes ("minutes-until-shadow" hint, never rendered → removed not surfaced).
- **Recommendation:** None.

#### 11.9-AC5: Rewrite `nextjs-app/docs/venue-data-load.md` to the new model (P2, doc deliverable)

- **Coverage:** FULL ✅ (review-verified doc deliverable — no runtime scaffold, per the ATDD coverage note)
- **Evidence:** `id` row now auto-assigned (author omits it); the `opening_hours` row + the "What to send (one venue)" JSON example use the new per-weekday shape (with a worked past-midnight + Sunday-closed example); `peak_time`/`shadow_warning_minutes` rows removed; the `seating_*`/`ground_*` guidance kept verbatim; JSON validated copy-pasteable.
- **Gaps:** (advisory, review-recorded — Round-2 `[Defer][Low]`) The closed-day (`null`) + past-midnight shapes the doc demonstrates are exercised only in unit tests + the doc example, never against a live/seeded row (all 7 seed rows open 11:00 / close ≥19:00 every weekday, no `null`, no past-midnight). Not an AC violation — the seed's job is byte-identical gate-parity; the edge shapes are unit-covered. Does NOT reduce the AC below FULL.
- **Recommendation:** None (doc). Optional backlog: seed one demo venue with a closed-day/past-midnight row to exercise the edge shapes against a live render.

#### 11.9-AC6: Idempotent live migration preserving RLS + server-only columns + gate venue (P0, DB-DDL)

- **Coverage:** FULL ✅ (via live-migration smoke checks recorded in the Dev Agent Record)
- **Evidence:** `11-9-...sql` is idempotent (`create sequence if not exists`, `drop column if exists`, `add column if not exists`, `on conflict (id) do update` seed — re-run once, still 7 rows, next auto id 8, no error). §Section 6 smoke checks (applied live, recorded): RLS enabled (`relrowsecurity = t`); single `venues_service_read` (SELECT, `{service_role}`) policy; deny-by-default grants (only `postgres` + `service_role`); server-only `seating_area`/`seating_elevation_m`/`ground_elevation_m` present + untouched; gate venue `test-venue-sunny` byte-compatible on gate-asserted values (`opening_hours->'1'->>'close'` = `22:00`, no `display` key on any row).
- **Recommendation:** None. AC6 is a DB-DDL criterion proven by the migration's own smoke checks (the correct proof — no runtime seam).

---

### 11.1–11.8 — folded in unchanged (re-verified green)

The 8-story detailed mapping from the 2026-07-05 gate stands unchanged and is re-verified against the
current tree (all 28 earlier ACs FULL / 3 P3 manual-by-design). The full mapping is preserved in the git
history of this file (prior revision) and in `traceability-report-11-1.md` / `-11-2.md`. The headline
earlier-story guards remain green in the 1440-test run: 11.1 scrub=0/date-change=1 + client day-series
byte-parity; 11.2 real-touch thumb-drag + planner range rules; 11.3 mobile/desktop chip parity + four
sheet snaps; **11.4 quick-info honest opening-hours line** (now fed by 11.9's per-weekday shape via the
formatter — re-verified, not regressed); 11.5 de-dulled map axe-AA + living dot; **11.6 detail clean
first-paint + ÖPPET badge same-box swap** (now derived from 11.9's structured hours — re-verified, swap
preserved); 11.7 build-fail/EOL hygiene + mapper resolution; 11.8 standing regression net + CI-wiring
contract guard.

**Cross-story regression check (11.9 → 11.1/11.4/11.6) — result: NO regression.**
- 11.1 list DTO: `openingHours` still surfaced on `VenueDataDto` (now structured per-weekday, not a display string); the `sunDaySeries` day-series and scrub-zero-fetch guards are untouched and green.
- 11.4 quick-info: the "Öppet till HH:MM" line is now DERIVED (locale-aware) instead of reading a stored string — behaviourally identical at the sv-default gate ("Öppet till 22:00"), byte-stable, no reference-PNG rebaseline triggered. `VenueQuickInfo.test.tsx` re-anchored + green.
- 11.6 detail: the ÖPPET badge + Öppettider row derive via the formatter; the `loading ? <Skeleton> : closesAt ? <badge> : null` same-box swap is preserved and asserted. `VenueDetailContent.test.tsx` re-anchored + green.

---

### Gap Analysis

#### Critical Gaps (BLOCKER) ❌
**0 gaps.** All 18 P0 acceptance criteria are FULL (14 earlier + 4 new 11.9 P0: AC1/AC2/AC3/AC4; AC6 folds into the P0-by-risk migration set). No release blocker.

#### High Priority Gaps (PR BLOCKER) ⚠️
**0 gaps.** All 8 P1 acceptance criteria are FULL.

#### Medium Priority Gaps (Nightly) ⚠️
**0 gaps.** All 4 P2 acceptance criteria (11.7 AC1 build-fail/EOL, 11.7 AC2 mapper, the 11.4-AC4 i18n-prune facet, **11.9 AC5 data-load doc rewrite**) are FULL.

#### Low Priority Gaps (Optional) ℹ️
**3 P3 manual-by-design items — NOT coverage gaps** (unchanged from the prior gate; each is the CI-un-automatable half of an AC whose CI half is FULL + green, recorded as `needs-human` in the Story-11.8 Post-Merge Verification Protocol):
1. **Live date-change p95 < 3 s wall-clock** (11.1 AC4 / 11.8 AC3 live half, R-014).
2. **Physical-device (real phone) gesture sweep** (11.8 AC1 device half, R-015).
3. **Maintainer blessing of the 11.7-staged consolidated reference-PNG rebaseline** (11.7 AC3 blessing half). *(11.9 triggered NO new rebaseline — the derived opening-hours treatment is byte-identical at the sv-default gate, so no new PNG enters the blessing set.)*

#### Advisory (non-blocking test-hardening — surfaced, none reduce an AC below FULL)
- **11.9 AC3** (`[Defer][Low]`): the `timeline.peakTime` keep-guard is `if (windows.length>0)`-wrapped (no-op risk on an empty window array) — pin against a fixed known-windowed date. Backlog.
- **11.9 AC2/badge** (`[Defer][Med]`, pre-existing deferred item): the ÖPPET badge/line has no is-open-now guard (renders "ÖPPET·22:00" at 09:00 for an 18:00-open venue; a past-midnight session reads today's row) — the story solved the weekday-correctness half by design; the intra-day/past-midnight open-guard is explicitly out of scope and recorded. Narrow or re-scope the deferred item.
- **11.9 AC2** (`[Defer][Low]`): `MapView` `quickInfoOpeningHours` memo can go stale across a local-midnight boundary on a quick-info card held open uninteracted — value stays honest for the weekday it computed on; negligible trigger.
- 11.1/11.3/11.5 advisory items from the prior gate (date-change overlay component test; desktop-chip real-overflow e2e; grant-flyTo viewport-awareness) — unchanged, all FULL at the AC level.

---

### Coverage Heuristics Findings

#### Endpoint Coverage Gaps
- **0.** The only endpoint changes are the additive `/api/venues` list DTO (`sunDaySeries` 11.1, `openingHours` 11.4/reshaped 11.9) and the `[slug]` detail DTO (11.9 dropped `shadowWarningMinutes`, reshaped `openingHours`, kept engine `timeline.peakTime`). Both list + detail are pinned at the API/route level (`venue-detail-route.data-cleanup.atdd.test.ts`, `venues-route-real-engine.test.ts`, `venue-store.opening-hours-shape.atdd.test.ts`) on the real-engine + seed paths.

#### Auth/Authz Negative-Path Gaps
- **0 (N/A for the app surface).** The 11.9 migration DOES touch the auth-adjacent RLS posture — but AC6's smoke checks explicitly re-assert RLS-enabled + the single service-role-only `venues_service_read` policy + deny-by-default grants survived the DDL (recorded). No anon/authenticated read path was opened.

#### Happy-Path-Only Criteria
- **0.** 11.9's error/edge paths are strong: closed-today (`null`) → `{}`, no-hours → `{}`, malformed/garbage jsonb → `undefined` no-throw (`coerceOpeningHours` defensive boundary), past-midnight close, out-of-range `Intl` weekday token → undefined/renders-nothing (never-fabricate hardening), absent-hours serializes honestly. Plus the epic-wide error paths from the prior gate.

---

### Coverage by Test Level (with 11.9)

| Test Level | 11.9 role | Coverage |
| ---------- | --------- | -------- |
| E2E (Playwright) | `epic-10-weather-matrix` (10) + `map-primary` (21) re-run green post data-model change (no wiring regression); the epic-wide interaction sweep unchanged | FULL |
| API / Contract | detail DTO: `openingHours` per-weekday shape, no `display`, engine `peakTime` kept, `shadowWarningMinutes` gone; absent-hours honest | FULL |
| Component | detail derived badge + row + closed-today omission + 11.6 same-box swap; quick-info line via formatter (proven at formatter+detail level) | FULL |
| Unit | `formatOpeningHours` weekday/closed/past-midnight/malformed/locale/gate-parity + never-fabricate token hardening; `coerceOpeningHours` defensive shape; `VENUE_SELECT_COLUMNS` drop; fixture-shape both-branches | FULL |
| Manual (DB-DDL / doc) | AC1 auto-assign PK + AC6 idempotent RLS/gate-preserving migration → live smoke checks recorded in the Dev Agent Record; AC5 doc rewrite review-verified | FULL (correct-by-design proof) |

---

### Test Execution Evidence (independently re-run this re-gate — current tree)

- **Vitest:** **152 files / 1440 tests, ALL PASS, 0 fail** (independently re-run 2026-07-06; up from the story-recorded 1416 baseline — none dropped, tree grew and stays green). The stderr `MISSING_MESSAGE` lines are the pre-existing intentional epic-10 `obscuredPosition`/`statusObscured` dead-key fallback tests (explicitly out of 11.9 scope) + benign jsdom unmount-race warnings — NOT failures.
- **Typecheck:** `npx tsc --noEmit` exit **0**.
- **Playwright (story-recorded, prior gate re-verified):** `mobile` 52 / `desktop` 35 / `touch` 3 / `a11y` 12 — all green; 0 fail. 11.9 additionally re-ran `epic-10-weather-matrix` (10) + `map-primary` (21) green.
- **11.9 live migration:** applied to project `hhnbxrhfhlzxgllxukzj` via Docker `psql` on the IPv4 session pooler; re-run idempotent; §Section 6 smoke checks all green (recorded in the story Dev Agent Record).
- **AC4 grep re-verified:** zero live `shadow_warning_minutes`/`shadowWarningMinutes` readers (removal-comments + negative assertions only).

---

## PHASE 2: QUALITY GATE DECISION

**Gate Type:** epic · **Decision Mode:** deterministic

### Decision Criteria Evaluation

#### P0 Criteria (Must ALL Pass)

| Criterion | Threshold | Actual | Status |
| --------- | --------- | ------ | ------ |
| P0 Coverage | 100% | 18/18 = 100% | ✅ PASS |
| P0 Test Pass Rate | 100% | 100% (vitest 1440/1440; Playwright mobile/desktop/touch/a11y all green) | ✅ PASS |
| Security Issues | 0 | 0 (11.9 migration re-asserts RLS + service-role-only policy + deny-by-default grants preserved) | ✅ PASS |
| Critical NFR Failures | 0 | 0 (axe AA green; request-count invariant green; day-series payload measured 1955 B bounded) | ✅ PASS |
| Flaky Tests (unmitigated) | 0 | 0 | ✅ PASS |

**P0 Evaluation:** ✅ ALL PASS

#### P1 Criteria (Required for PASS)

| Criterion | Threshold | Actual | Status |
| --------- | --------- | ------ | ------ |
| P1 Coverage | ≥90% (PASS) / ≥80% (min) | 8/8 = 100% | ✅ PASS |
| Overall Coverage | ≥80% | 30/34 = 88% | ✅ PASS |
| Overall Test Pass Rate | ≥95% | 100% | ✅ PASS |

**P1 Evaluation:** ✅ ALL PASS

#### P2/P3 (Informational)

| Criterion | Actual | Notes |
| --------- | ------ | ----- |
| P2 Coverage | 4/4 = 100% | Hygiene (build-fail/EOL, mapper, i18n prune) + **11.9 AC5 doc rewrite** all FULL |
| P3 Coverage | 0/3 = 0% | Manual-by-design (live p95, physical-device, PNG blessing) — recorded needs-human, do NOT block. 11.9 triggered NO new PNG. |

---

### GATE DECISION: PASS ✅

---

### Rationale

**Deterministic rule outcome:** P0 coverage 100% (Rule 1 satisfied) → overall coverage 88% ≥ 80% (Rule 2
satisfied) → P1 coverage 100% ≥ 90% (Rule 4 satisfied) ⇒ **PASS**.

The re-gate confirms Story 11.9 lands cleanly on top of the already-passing 11.1–11.8 epic. All 6 of 11.9's
ACs are FULL: the honest-render + data-integrity trio (AC2 per-weekday hours derived at render with the
never-fabricate rule preserved and unit-hardened against an out-of-range weekday token; AC3 stored
`peak_time` dropped while the engine-computed `timeline.peakTime` is untouched and keep-guarded; AC4
`shadow_warning_minutes` removed end-to-end with a re-verified zero-live-reader grep) are covered by the
four un-skipped ATDD scaffolds plus the regression-adjusted sibling suites, all green in a 1440-test run.
The two DB-DDL criteria (AC1 auto-assign text PK preserving the free-text review/feedback joins + gate
venue; AC6 idempotent RLS/server-column/gate-preserving live migration) are proven — correctly by design —
by the migration's own end-of-file smoke checks, applied live and recorded in the Dev Agent Record; there
is no runtime seam a Vitest/Playwright test could exercise, so these are smoke-check-covered, NOT un-tested.
AC5 (the data-load doc rewrite) is a review-verified doc deliverable.

**No regression to earlier-story coverage.** 11.9's data-model change re-wires — rather than breaks — the
shared surfaces: the 11.1 list DTO still carries `openingHours` (now structured), the 11.4 quick-info line
and the 11.6 detail ÖPPET badge now derive their display from the per-weekday shape via a single pure
formatter, with the 11.6 loading same-box swap preserved and byte-identical output at the sv-default gate
("Öppet till 22:00") — so no reference-PNG rebaseline was triggered and no earlier guard went red. Security
posture is intact: the migration explicitly re-asserted RLS-enabled + the single service-role-only policy +
deny-by-default grants survived the DDL.

The 3 non-FULL items are unchanged from the prior gate and remain the P3 manual-by-design halves (live
wall-clock p95, physical-device sweep, maintainer PNG blessing) — recorded `needs-human` post-merge
handoffs, not coverage gaps.

**Caveats (do not affect the gate):**
- 11.9 AC3's `timeline.peakTime` keep-guard is `if (windows.length>0)`-wrapped (no-op risk) — a recorded
  `[Defer][Low]` test-adequacy item; the column-drop + engine-untouched facts are independently pinned.
- The ÖPPET badge has no intra-day/past-midnight is-open-now guard — an explicitly-scoped-out, recorded
  deferred item; the weekday-correctness half AC2 requires IS solved and the never-fabricate rule holds.
- The seed rows exercise neither the closed-day nor the past-midnight shape live (unit + doc only) — a
  recorded `[Defer][Low]` verification-coverage note, not an AC violation.
- The prior gate's caveats (live p95 + device sweep are maintainer post-merge; PNG blessing at PR) stand.

---

### Residual Risks (tracked, non-blocking)

| Risk | Priority | Prob | Impact | Score | Mitigation / Remediation |
| ---- | -------- | ---- | ------ | ----- | ------------------------ |
| Live date-change p95 misses < 3 s | P3 | Low | Med | 2 | CI request-count invariant is the durable gate; p95 recorded warm/cold ≥10 trials (R-014). |
| Physical-device gesture differs from emulated | P3 | Low | Med | 2 | Real-touch CDP Pixel-5 profile covers the automatable half; device checklist recorded (R-015). |
| Maintainer blesses a mislabeled reference PNG | P3 | Low | Low | 1 | Byte-identical mobile pair re-captured to distinct DOM-asserted states (11.7 review resolved); 11.9 added no new PNG. |
| AC3 peakTime keep-guard no-ops on empty windows | Advisory | Low | Low | 1 | Recorded `[Defer][Low]`; column-drop + engine grep independently prove the fact. |
| ÖPPET badge shows before open / after close intra-day | Advisory | Low | Low | 1 | Explicitly-scoped-out deferred item; weekday-correct + never-fabricate; narrow/re-scope the deferred entry. |

**Overall Residual Risk:** LOW.

---

### Next Steps

**Immediate (before/at PR merge):** none blocking. P0/P1 at 100%; vitest 1440/1440 green; tsc clean;
11.9 live migration applied + smoke-checked.

**Post-merge (maintainer, consolidated in the Story-11.8 Post-Merge Verification Protocol — unchanged):**
1. LIVE date-change p95 (≥10 trials, warm/cold) + confirm time-scrub = 0 requests + record gzipped `sunDaySeries` payload; triage any p95 miss.
2. Physical-device checklist over every Epic 11 surface; triage any device-only gap before epic close.
3. Bless the 11.7-staged consolidated reference-PNG rebaseline (12 pairs) at PR review. *(11.9 adds nothing to this set.)*

**Backlog (advisory test-hardening):** 11.9 — pin the AC3 `timeline.peakTime` keep-guard against a fixed
windowed date; narrow/re-scope the ÖPPET is-open-now deferred item; optional live closed-day/past-midnight
demo-seed row. Plus the prior gate's advisory backlog (date-change overlay component test; desktop-chip
real-overflow e2e; grant-flyTo viewport-awareness; dead-export cleanup).

---

## Integrated YAML Snippet (CI/CD)

```yaml
traceability_and_gate:
  traceability:
    epic_id: "11"
    date: "2026-07-06"
    regate: true
    regate_reason: "Story 11.9 adopted post-2026-07-05 gate; re-gate incl. 11.9 + regression check on 11.1/11.4/11.6"
    stories: ["11.1","11.2","11.3","11.4","11.5","11.6","11.7","11.8","11.9"]
    total_criteria: 34
    coverage:
      overall: 88
      p0: 100
      p1: 100
      p2: 100
      p3: 0   # manual-by-design (live p95 + physical-device + PNG blessing) — needs-human, not a gap
    gaps:
      critical: 0
      high: 0
      medium: 0
      low: 3   # all P3 manual-by-design needs-human handoffs (unchanged)
    story_11_9:
      ac1_autoassign_pk: "FULL (migration smoke check: nextval->8, joins+gate preserved)"
      ac2_per_weekday_hours: "FULL (formatter+coercer+DTO+render, never-fabricate hardened)"
      ac3_drop_peak_time: "FULL (column dropped; engine timeline.peakTime kept + keep-guard)"
      ac4_drop_shadow_warning_minutes: "FULL (end-to-end; zero live readers grep-verified)"
      ac5_doc_rewrite: "FULL (review-verified doc deliverable)"
      ac6_idempotent_migration: "FULL (migration smoke check: RLS+policy+seating cols+gate preserved)"
    quality:
      vitest_tests: 1440
      vitest_files: 152
      tsc: 0
      playwright: "mobile 52 / desktop 35 / touch 3 / a11y 12 — all green"
      security_findings: 0
      unmitigated_flaky: 0
  gate_decision:
    decision: "PASS"
    gate_type: "epic"
    decision_mode: "deterministic"
    criteria:
      p0_coverage: 100
      p0_pass_rate: 100
      p1_coverage: 100
      overall_coverage: 88
      overall_pass_rate: 100
      security_issues: 0
      critical_nfrs_fail: 0
      flaky_tests: 0
    thresholds:
      min_p0_coverage: 100
      min_p0_pass_rate: 100
      min_p1_coverage: 90
      min_overall_pass_rate: 95
      min_coverage: 80
    needs_human_post_merge:
      - "LIVE date-change p95 < 3 s + time-scrub = 0 requests (R-014)"
      - "physical-device gesture sweep over every Epic 11 surface (R-015)"
      - "maintainer blessing of the 11.7-staged consolidated reference-PNG rebaseline (11.9 adds none)"
    next_steps: "PASS — merge unblocked; run the 3 consolidated post-merge needs-human items; triage any p95 miss before epic close."
```

---

## Related Artifacts

- **Epic:** `_bmad-output/planning-artifacts/epics.md` §"Epic 11" (11.9 lines 3023–3128)
- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-11.md`
- **Story files:** `_bmad-output/implementation-artifacts/11-1..11-9-*.md`
- **11.9 ATDD checklist:** `_bmad-output/test-artifacts/atdd-checklist-11-9.md`
- **11.9 live migration + smoke checks:** `_bmad-output/implementation-artifacts/11-9-venue-data-model-cleanup.sql`
- **Per-story traceability (folded in):** `traceability-report-11-1.md`, `traceability-report-11-2.md`
- **CI:** `nextjs-app/.github/workflows/build-and-test-nextjs.yml` (L110 mobile+desktop, L120 touch, L123 a11y)

---

## Sign-Off

**Phase 1 — Traceability Assessment:**
- Overall Coverage: 88% (30/34 FULL)
- P0 Coverage: 100% (18/18) ✅
- P1 Coverage: 100% (8/8) ✅
- Critical Gaps: 0 · High Priority Gaps: 0

**Phase 2 — Gate Decision:**
- **Decision:** PASS ✅
- **P0 Evaluation:** ✅ ALL PASS · **P1 Evaluation:** ✅ ALL PASS

**Overall Status:** PASS ✅ — Epic 11 (incl. Story 11.9) release approved; coverage meets standards. Story
11.9's six ACs are FULL (AC1/AC6 via recorded live-migration smoke checks; AC2/AC3/AC4 via un-skipped ATDD
+ regression-adjusted suites; AC5 via review-verified doc) and its data-model change caused NO regression
to earlier-story coverage. The 3 P3 manual-by-design items (live p95, physical-device, PNG blessing) remain
recorded post-merge needs-human handoffs, not coverage gaps.

**Generated:** 2026-07-06 (re-gate)
**Workflow:** testarch-trace v4.0 (Enhanced with Gate Decision) — Epic-Level mode

---

<!-- Powered by BMAD-CORE™ -->
