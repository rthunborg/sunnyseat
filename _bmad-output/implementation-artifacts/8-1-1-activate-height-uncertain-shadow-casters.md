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
   **Then** those buildings are emitted `filter_decision = include`, `active = true`, with a
   **conservative height** (agreed rule — e.g. z-range lower bound or a conservative cap) and a
   **lowered `quality_score`** plus a `source_flag`/reason marking them height-uncertain; genuinely
   non-building or sub-3 m / no-footprint records remain `review`/`exclude`. Pipeline unit tests
   updated to pin the new behavior.

2. **Re-derived artifacts validate and re-import cleanly into the live DB.**
   **Given** the revised filter
   **When** `run-all` regenerates artifacts and the handoff is re-run against the live project
   **Then** `validate-artifacts` passes, the **old batch** (`open-goteborg-central-e91dd7302b7c`)
   rows are replaced (delete-old + import-new batch), all 3.0.2 active-row invariants still hold
   (active ⇒ include ⇒ ≥3 m ⇒ byggnad_l ⇒ source_geom), and the active count rises by the activated set.

3. **Spot-check gate passes; confidence stays honest.**
   **Given** the re-imported data
   **When** the Story 3.0.4 gate is re-run (independent cross-check + maintainer-verified sampling)
   **Then** every required launch cluster is `eligible` (≥10/cluster, ≥70 central, all 3 buckets,
   ≥85% agreement), the previously false-sunny central spots now read shadowed, and the Story 3.0.5
   fail-closed confidence behavior is unchanged (lowered `quality_score` down-weights, not omits).

**Design Gate Criteria:** Backend/data story — no mapped Screen ID; Visual/Behaviour/Animation N/A;
visual validation skipped (matches 8.1 / 3.0.2 / 3.0.4).

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

### References
- [Source: _bmad-output/implementation-artifacts/8-1-course-correction-2026-06-15.md]
- [Source: _bmad-output/implementation-artifacts/8-1-shadow-caster-import-run-2026-06-15.md]
- [Source: _bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md]
- [Source: _bmad-output/implementation-artifacts/3-0-3-open-geodata-import-pipeline.md] / [3-0-4-…] / [3-0-5-…]
- [Source: scripts/geodata/README.md] / [scripts/geodata/shadow_caster_pipeline.py]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
