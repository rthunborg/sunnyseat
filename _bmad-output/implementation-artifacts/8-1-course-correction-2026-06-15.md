# Course Correction — Story 8.1 → 8.1.1 (2026-06-15)

**Type:** Significant change during sprint execution (Epic 8).
**Raised by:** Amelia/Claude (dev) during Story 8.1 spot-check validation (AC2).
**Decision owner:** Rasmus (maintainer). **Status:** approved 2026-06-15.

## What happened

Story 8.1 executed the shadow-caster import (AC1) and verified the RPC + Story 3.0.5
confidence contract (AC3) — both pass. While doing the Story 3.0.4 spot-check validation
(AC2), a cross-check of the imported data against an independent model (OpenStreetMap
buildings, "ShadeMap-equivalent") plus maintainer sampling surfaced a **systemic data
issue**, not a measurement error.

## Finding

The conservative filter (Stories 3.0.3/3.0.4) sends height-uncertain buildings to
`filter_decision = review` and marks them **inactive**, so the engine casts **no shadow**
from them. But these are **real buildings** — their footprints come from Lantmäteriet; only
the *height estimate* is uncertain.

Evidence:
- **1,975** review (inactive) buildings; **1,213 are ≥20 m**, ~**1,569 are ≥10 m**. Dominant
  reasons: `large-z-spread` (1,296), `limited-line-support` (672), `single-line-tall` (392) —
  all *height-uncertainty* flags, not "building absent".
- Investigating the 11 "our-data=sunny / OSM=shadowed" spot-check divergences: **~8 had a real
  24–69 m building in our data, sitting in `review`/inactive** right next to the spot (1 was a
  genuine coverage gap; 2 had an active building and our verdict was likely right).
- Net effect: the active data **under-shadows** the dense central clusters (Avenyn, Vasastan,
  Inom Vallgraven, Lilla Bommen) → **false "sunny"** predictions exactly where it matters most.
  The 3.0.5 fail-closed contract prevents *high-confidence* false-sunny, but it also means these
  central clusters can never become launch-eligible with the current active set.

## Prototype (local, no production/contract change)

Recomputed our per-point shadow verdicts with the `review` buildings **activated** at a
conservative height:

| review-height cap | false-sunny resolved | new over-shadowed | agreement vs OSM |
|---|---|---|---|
| 10 m | 6 | 3 | 53 |
| **15 m** | **7** | **3** | **54** |
| 20 m | 7 | 4 | 53 |
| 30 m | 7 | 4 | 53 |

Activation flips only sunny→shadowed (never the reverse) and resolves 7 of ~8 confirmed
false-sunnies at a ~15 m cap, with a small over-shadow cost (measured against OSM, itself
incomplete). Erring toward shadow is the safer direction for a sun app. **The fix direction is
validated; the exact height rule + confidence policy need deliberate design.**

## Decision

1. **Re-scope Story 8.1** to its import + verification deliverables: **AC1 (import) and AC3
   (RPC/confidence) — done & verified.** The AC2 spot-check gate carries to 8.1.1 (it cannot
   pass until the filter is revised).
2. **Create Story 8.1.1 — "Activate height-uncertain shadow casters & re-validate coverage."**
   Revise the 3.0.3 filter so footprint-certain / height-uncertain buildings stay **active** as
   shadow-casters with a **conservative height** + **lowered `quality_score`** (so 3.0.5
   down-weights, rather than the filter dropping them); re-derive → re-import (idempotent) →
   re-run the spot-check gate. Update the shadow-data-trust ADR.
3. **Sequence 8.1.1 immediately next, before 8.2/8.3** (8.3 computes real shadows and must sit on
   trustworthy data).
4. **Leave the current conservative import in the live DB**; 3.0.5 fail-closed protects users
   until 8.1.1 replaces it.

## Open design choice for 8.1.1 (architect/ADR)

The exact height rule for activated review buildings: conservative flat cap (~15 m), z-range
lower bound, or per-reason rule; plus the `quality_score` reduction factor. The prototype favors
a conservative cap or z-range lower bound. Worth a brief architect (Winston) / ADR call before
implementation.

## Artifacts

- Import run record: `8-1-shadow-caster-import-run-2026-06-15.md`
- Story 8.1.1: `8-1-1-activate-height-uncertain-shadow-casters.md`
- Prototype + analysis scripts (gitignored): `building_geodata/_spotcheck_*.py`
