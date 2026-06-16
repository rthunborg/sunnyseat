---
baseline_commit: 3e8eb66
drafted_at: 2026-06-15
drafted_by: Amelia/Claude (dev course-correction); pending SM story-file-audit
---

# Story 8.1.1: Activate Height-Uncertain Shadow Casters & Re-validate Coverage

Status: ready-for-dev

<!-- Course-correction follow-up to Story 8.1. See 8-1-course-correction-2026-06-15.md. -->

> **Sequencing:** Runs immediately after Story 8.1, **before 8.2/8.3** (8.3 computes real
> shadows and must sit on trustworthy data). Same epic branch `epic/8-wire-real-data`.
>
> **Why this exists:** Story 8.1's spot-check validation (AC2) found that the conservative
> 3.0.3/3.0.4 filter marks ~1,569 real ≥10 m buildings `review`/inactive purely because their
> *height estimate* is uncertain (`large-z-spread`, `single-line-tall`, `limited-line-support`).
> Their footprints are certain (Lantmäteriet). Deactivating them entirely means the engine casts
> **no shadow** there → systematic **false "sunny"** in the dense central clusters. A local
> prototype (review buildings activated at a conservative ~15 m height) resolved 7 of ~8
> confirmed false-sunny errors, flipping only sunny→shadowed. This story makes that fix real.
>
> **Scope:** This is a **filtering-contract revision + re-derive + re-import + re-validation**.
> It DOES change `scripts/geodata` filter logic and the shadow-data-trust ADR — unlike 8.1 it is
> not data-only. It does NOT change the 3.0.2 schema/RPC, the 3.0.5 runtime confidence math, RLS
> (8.5), venues/feedback/reviews, or any frontend.
>
> **DB-constraint note (important):** the live schema enforces `active ⇒ filter_decision='include'
> ⇒ height_m ≥ 3 ⇒ byggnad_l ⇒ source_geom_3007 not null`. So activated buildings must be
> **reclassified to `include`** (not left `review` with `active=true`, which violates
> `shadow_casters_active_requires_include`). They already satisfy byggnad_l + source_geom.

## Story

As a **maintainer**,
I want real buildings with uncertain height to still cast a **conservative** shadow (instead of
being dropped),
So that the central launch clusters stop predicting false "sunny" and can pass the spot-check gate.

## Acceptance Criteria

1. **Filter revised: footprint-certain / height-uncertain buildings become active conservative casters.**
   **Given** the Story 3.0.3 filter currently sends `large-z-spread` / `single-line-tall` /
   `limited-line-support` (and similar height-uncertainty) `byggnad_l` buildings to `review`/inactive
   **When** the filter is revised
   **Then** those buildings are emitted `filter_decision = include` / `active = true` with a conservative
   height (agreed rule — e.g. z-range lower bound or a conservative cap) and a lowered `quality_score`
   plus a `source_flag`/reason marking them height-uncertain; genuinely non-building, sub-3 m, or
   no-footprint records remain `review`/`exclude`; pipeline unit tests are updated to pin the new behaviour

2. **Re-derived artifacts validate and re-import cleanly into the live DB.**
   **Given** the revised filter
   **When** `run-all` regenerates artifacts and the handoff is re-run against the live project
   **Then** `validate-artifacts` passes, the old batch (`open-goteborg-central-e91dd7302b7c`) rows are
   replaced (delete-old + import-new batch), all Story 3.0.2 active-row invariants still hold
   (active ⇒ include ⇒ ≥3 m ⇒ byggnad_l ⇒ source_geom_3007), and the active-caster count rises by the activated set

3. **Spot-check gate passes; confidence stays honest.**
   **Given** the re-imported data
   **When** the Story 3.0.4 spot-check gate is re-run (independent cross-check + maintainer-verified sampling)
   **Then** every required launch cluster is `eligible` (≥10/cluster, ≥70 central, all 3 sun buckets,
   ≥85% agreement), the previously false-sunny central spots now read shadowed, and the Story 3.0.5
   fail-closed confidence behaviour is unchanged (lowered `quality_score` down-weights rather than the filter omitting the building)

> **No Design Gate Criteria for this story.** It is a backend/data-only change to the geodata filter plus
> a live re-import — no mapped Screen ID and no consumer UI change. This is intentional per epics.md
> (Epic 8 overall design-gate note); visual validation is skipped, matching Stories 8.1 / 3.0.2 / 3.0.4.

## Tasks / Subtasks

- [ ] **Task 1: Agree the height + quality rule (architect/ADR)** (AC: #1)
  - [ ] 1.1 Decide the conservative height rule for activated review buildings (z-range lower bound vs
        conservative cap ~15 m vs per-reason) and the `quality_score` reduction factor. Record in the
        shadow-data-trust ADR ("existence certain, height uncertain → cast a conservative shadow, don't omit").
- [ ] **Task 2: Revise the filter + tests** (AC: #1)
  - [ ] 2.1 In `scripts/geodata/shadow_caster_pipeline.py`, reclassify qualifying height-uncertain
        `byggnad_l` review records to `include`/active with the agreed conservative height + lowered
        `quality_score` + a height-uncertain `source_flag`/reason. Keep non-buildings / sub-3 m / no-footprint
        as review/exclude.
  - [ ] 2.2 Update `scripts/geodata/tests/test_shadow_caster_pipeline.py` to pin the reclassification and
        the conservative-height/quality rule.
- [ ] **Task 3: Re-derive + validate** (AC: #1, #2)
  - [ ] 3.1 `run-all`; confirm `validate-artifacts` passes; record the new batch id/checksums.
  - [ ] 3.2 `py_compile` + `unittest discover` green.
- [ ] **Task 4: Local-PostGIS dry-run** (AC: #2)
  - [ ] 4.1 Re-run the handoff against local PostGIS; confirm smoke checks + meter-correct RPC.
- [ ] **Task 5: Live re-import** (AC: #2)
  - [ ] 5.1 Delete the old batch rows + import the new batch via the IPv4 session pooler (see 8.1 run record
        for the connection method); idempotent; smoke checks clean.
  - [ ] 5.2 Read-only MCP verification: active/include count rose by the activated set; invariants 0; RPC ok.
- [ ] **Task 6: Re-validate spot-check gate** (AC: #3)
  - [ ] 6.1 Regenerate the cross-check (OSM ShadeMap-equivalent) + re-run the prototype/aerial workflow on the
        new active set; confirm the previously false-sunny central spots now read shadowed.
  - [ ] 6.2 Maintainer verifies remaining divergences / sample; run `evaluate-spot-checks`; all required
        clusters `eligible`.
- [ ] **Task 7: Confidence regression + finalize** (AC: #3)
  - [ ] 7.1 `cd nextjs-app && npx.cmd vitest run` (3.0.5 confidence specs green; data-only at runtime).
  - [ ] 7.2 Update the run record + ADR; `story-review.sh` gate; then 8.1.1 → review.

## Dev Notes

### Evidence (from 8.1 spot-check validation, 2026-06-15)
- Inactive `review` buildings: 1,975 total; 1,213 ≥20 m, ~1,569 ≥10 m. Reasons dominated by
  height-uncertainty (`large-z-spread` 1,296, `limited-line-support` 672, `single-line-tall` 392).
- Of 11 "ours=sunny / OSM=shadowed" central divergences: ~8 had a real 24–69 m building present in our
  data but `review`/inactive adjacent to the spot; 1 coverage gap (lilla-bommen-06); 2 had an active
  building (our verdict likely right).
- Prototype: activating review at conservative height flips only sunny→shadowed; ~15 m cap resolves 7/8
  false-sunnies with ~3 over-shadow candidates (measured vs incomplete OSM). Safer error direction for a sun app.

### Reuse / approach
- Change is in the **filter/classification** step of `scripts/geodata/shadow_caster_pipeline.py`; reuse
  the existing derive/emit/handoff/validate machinery. New batch id (derived content changes).
- Conservative height + lowered `quality_score` lets the **existing 3.0.5 engine** down-weight confidence
  for these buildings rather than the data omitting them — aligns with fail-closed.
- Connection method, psql-via-Docker, pooler details: see `8-1-shadow-caster-import-run-2026-06-15.md`.

### What NOT to do
- Don't change the 3.0.2 schema/RPC, 3.0.5 runtime math, RLS (8.5), or any `nextjs-app` runtime code.
- Don't leave buildings `review` with `active=true` (violates `shadow_casters_active_requires_include`).
- Don't fabricate spot-check observations; the gate still needs independent evidence + maintainer sign-off.

### File impact
- **Modified (tracked):** `scripts/geodata/shadow_caster_pipeline.py` (filter reclassification +
  conservative-height/quality rule); `scripts/geodata/tests/test_shadow_caster_pipeline.py`
  (regression tests for the new rule); `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`
  (ADR update); `_bmad-output/implementation-artifacts/sprint-status.yaml` (status + note).
- **Created (tracked):** `_bmad-output/implementation-artifacts/8-1-1-shadow-caster-reimport-run-<date>.md`
  (re-import run record: new batch id/checksums, row counts, smoke checks, passing spot-check gate summary).
- **Local/gitignored (regenerated, NOT committed):** `building_geodata/goteborg-open/derived/*`
  (new-batch artifacts), `shadow_caster_spot_checks.results.jsonl` + `…cluster_validation.*`.
- **Database writes (not files):** re-import into live `public.shadow_casters` — delete the old batch
  (`open-goteborg-central-e91dd7302b7c`) + insert the new batch with the activated set.
- **Explicitly NOT created/modified:** no 3.0.2 schema/RPC migration; no `nextjs-app/**` changes; no
  3.0.5 runtime confidence/shadow math; no RLS policies (Story 8.5 owns those).

### Test gate (project is past the transitional phase → standard gates)
Before marking review:
- `cd nextjs-app && npx.cmd tsc --noEmit` (0) · `npx.cmd eslint . --quiet` (0) · `npx.cmd vitest run`
  (baseline 64 files / 527 tests — unchanged; this story adds no `nextjs-app` code).
- `python -m py_compile scripts/geodata/shadow_caster_pipeline.py` · `python -m unittest discover -s
  scripts/geodata/tests` (green; +new filter-reclassification tests).
- `evaluate-spot-checks` → every required cluster `eligible` (the AC3 gate).
- `.\scripts\run-sh.ps1 scripts/story-review.sh 8-1-1-activate-height-uncertain-shadow-casters`
  (visual validation skipped — no mapped screen ID).
- E2E (`playwright test`) not required (no runtime/UI change). DESIGN.md / ux-design-specification are
  N/A (backend/data story, no UI).

### References
- [Source: CLAUDE.md] (root shim → `AGENTS.md` is the canonical agent rulebook)
- [Source: project-context.md#Gothenburg Constants / Building-shadow data]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.1.1: Activate Height-Uncertain Shadow Casters]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Shadow Caster Lookup (Backend)]
- [Source: _bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md]
- [Source: _bmad-output/implementation-artifacts/8-1-course-correction-2026-06-15.md]
- [Source: _bmad-output/implementation-artifacts/8-1-shadow-caster-import-run-2026-06-15.md]
- [Source: _bmad-output/implementation-artifacts/3-0-3-open-geodata-import-pipeline.md] / [3-0-4-…] / [3-0-5-…]
- [Source: scripts/geodata/README.md] / [scripts/geodata/shadow_caster_pipeline.py]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
