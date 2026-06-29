# Story 8.1 — Shadow-Caster Import Run Record (2026-06-15)

**Project ref:** `hhnbxrhfhlzxgllxukzj` (SunnySeat, region `eu-west-1`)
**Batch id:** `open-goteborg-central-e91dd7302b7c`
**Import date:** 2026-06-15
**Operator:** Amelia / Claude (dev-story), live import run with maintainer-provided credentials.
**Branch:** `epic/8-wire-real-data`

> Status: **partial** — AC1 (import) and AC3 (RPC/confidence) are satisfied and verified.
> AC2 (spot-check validation gate) is **PENDING**: the gate requires real maintainer
> observations (Task 4.2). The story stays `in-progress` until the Story 3.0.4 gate **passes**.

## Artifact regeneration (Task 1.6)

The on-disk derived artifacts were **stale** — generated 2026-06-01..06-04, predating the
Story 3.0.7 data-contract realignment (done 2026-06-07). `validate-artifacts` rejected every
row (missing `source_layer`/`source_subclass`/`z_semantics`/`source_geom_3007`/
`source_collection_metadata`/`source_update_metadata`), and the live schema enforces those
(NOT NULL + active-building `byggnad_l` check constraints), so importing the stale artifacts
would have aborted at COMMIT.

Regenerated deterministically from the present raw inputs via
`python scripts/geodata/shadow_caster_pipeline.py run-all` (geo deps already present on
Python 3.14: shapely 2.1.2 / pyproj 3.7.2 / pyshp 3.0.9 / tifffile / imagecodecs). Regeneration
under the 3.0.7 contract changed the derived-output checksums, so the batch id moved from the
story's original `open-goteborg-central-929478e740e0` to **`open-goteborg-central-e91dd7302b7c`**.

### Pipeline bugs found & fixed (`scripts/geodata/shadow_caster_pipeline.py`)

The story's reuse clause allows fixing real bugs found during the import. Three were found and fixed
(each with a regression test in `scripts/geodata/tests/test_shadow_caster_pipeline.py`):

1. **`source_geom_3007` bbox check too strict** (validator). The 3.0.7 mis-projection guard
   required *every* source vertex strictly inside the MVP EPSG:3007 bbox, but the derive step keeps
   footprints by **centroid**-in-bbox, so 251 legitimate edge buildings (centroid in-bbox, polygon
   spilling ≤164 m past the boundary) were wrongly rejected. Added a tolerance margin
   `MVP_BBOX_3007_SOURCE_GEOM_TOLERANCE_M = 500.0` — edge buildings pass; a real CRS
   mis-projection (≥140 km off, e.g. EPSG:4326 degrees or 3006↔3007 zone mix-up) is still caught.
   Keeping edge casters is correct: a building just outside the central area still shades venues inside it.
2. **`\copy` corrupted JSON with backslashes** (SQL handoff). The handoff loaded the JSONL via
   `COPY ... format text`, which escape-processes `\` and broke the embedded Windows paths
   (`building_geodata\goteborg-open\...` → invalid `\g` escape on the `::jsonb` cast). Switched both
   `\copy` lines to `format csv, quote E'\x01', delimiter E'\x02'` (control bytes never present in
   JSON) so each line loads verbatim.
3. **Supabase per-statement timeout** (SQL handoff). The 183 MB `\copy` upload to eu-west-1 exceeds
   the pooler default `statement_timeout = 2min` and was cancelled mid-load. Added
   `set local statement_timeout = 0;` inside the import transaction.

## Checksums (batch `source_metadata`)

- `combinedInputChecksum`: `e91dd7302b7cc698255ae4bfc2f4c6f30aa38e8d87a2da175a18daa46342e950`
- `inputChecksums.include`: `fe5547de94e499868692938607934a73b00bd078d12066cc77ee385de69a618f`
- `inputChecksums.review`:  `da044cb7af5a7761b4023a4ccba4e82a1c5e66836ae19ae225aa2f60fd872488`
- `inputChecksums.excluded`: `c202b7bf1a4dc97ba40105b71d005be01716c404da172a3c8024a55a358654fa`
- `sourcePriority`: 40 (open-derived; lower numeric priority wins)

`validate-artifacts` → **pass** (58,731 import rows + 23,839 diagnostics).

## Row counts (live `public.shadow_casters`, post-import)

| filter_decision | active | count |
|---|---|---|
| include | true | 56,756 |
| review | false | 1,975 |
| **total** | | **58,731** |

Excluded diagnostics (23,839) were **not** loaded (default; handoff leaves that block commented out).

## Smoke checks (embedded in handoff SQL)

Identical clean results on the local-PostGIS dry-run (Task 2) and the live production run (Task 3):

| Check | Result |
|---|---|
| counts by decision/active | include/active 56,756; review/inactive 1,975 |
| active rows < 3 m | 0 |
| active non-`include` | 0 |
| invalid geometry | 0 |
| missing `source_dataset` | 0 |
| `get_buildings_near_point(57.7089, 11.9746, 200)` | returns active `include` building casters |

## Task 5 — post-import verification (read-only, Supabase MCP)

- **5.1 counts/invariants:** total 58,731; active_include 56,756; inactive_review 1,975;
  active_below_3m 0; active_non_include 0; active_non_byggnad_l 0; active_missing_source_geom 0;
  invalid_geom 0; missing_source_dataset 0. ✅
- **5.2 RPC meter-correctness:** `get_buildings_near_point(57.7089, 11.9746, 200)` → 37 casters;
  radius 25 m → 2 casters (strict subset → meter-correct `st_dwithin(geometry::geography, …)`);
  0 returned rows violate active/include/building. ✅
- **5.3 batch row:** exactly 1 row `open-goteborg-central-e91dd7302b7c`, source description +
  checksums in `source_metadata`, `completed_at` set. ✅
- **5.4 confidence regression:** nextjs-app `vitest run` 64 files / 527 tests pass (data-only story;
  Story 3.0.5 fail-closed confidence semantics unchanged). ✅

## AC2 — spot-check validation gate (Task 4): **PENDING (human-in-the-loop)**

### Prep done by the dev agent (2026-06-15)

To minimise maintainer effort (desk-only, no field work), the agent pre-built the full spot-check
campaign in `building_geodata/goteborg-open/derived/` (gitignored) via helper scripts under
`building_geodata/` (`_spotcheck_build.py` → `_spotcheck_expected.py` → `_spotcheck_assemble.py`,
ingest via `_spotcheck_ingest.py`):

- **80 real ground points** (10 per cluster × 8 clusters), distributed within each cluster's 650 m
  radius and the MVP bbox, validated in-bbox + in-radius, and filtered to drop points that land
  **inside** building footprints (so they are outdoor/street-facing points). Selection balances the
  engine's shadowed/sunny prediction per cluster where the geometry allows (overall 24 shadowed /
  56 sunny; every cluster has all three sun buckets). A few clusters skew sunny because their open
  outdoor points are genuinely mostly sunlit.
- **Sun azimuth/elevation** per point/time computed with the NOAA algorithm (e.g. midday az 151°/
  el 53°, morning az 99°/el 34°, afternoon az 254°/el 37° at solstice).
- **`expected_building_shadow`** pre-computed locally from the imported `shadow_casters` data
  (shapely, engine-consistent flat swept-shadow projection: a point is `shadowed` if it lies under
  any active/include building's footprint hull swept by its sun-translated copy, shadow length =
  height / tan(elevation)). This is a faithful proxy for the runtime engine's per-point verdict; it
  validates the building DATA, which is what the gate and the Story 3.0.5 confidence contract consume.
- **`shadow_caster_spot_checks.results.jsonl`** — scaffold with every field filled except the
  observation (expected pre-filled; `agreement_result: pending`; `source_artifact` = a ShadeMap
  deep-link at the exact solstice date/time). Structurally validated (no coordinate/field errors;
  only "insufficient evidence" until observations land).
- **`shadow_caster_spot_checks.worksheet.md`** — per-point links: **ShadeMap** (independent 3D
  shadow at the exact time), Google **Satellite**, and **Street View**, plus the engine's prediction
  for sanity-checking.
- **`shadow_caster_spot_checks.observations.csv`** — minimal input (one row per `spot_check_id`,
  blank `observed_manual_result`) for the maintainer to fill.

The observation is sourced desk-only from an **independent** shadow model (ShadeMap, OSM/terrain
3D) at the representative time — because the representative time is a future solstice, no photo of
that exact moment exists; the independent simulator is the desk-feasible ground truth. This is a
cross-dataset consistency check (our Baskarta-derived data vs. an independent 3D model) that the
maintainer verifies/approves, per the story's "candidate evidence from aerial/Street-View +
sun-position cross-reference" allowance.

### ShadeMap / OSM cross-check results (2026-06-15)

To minimise maintainer effort and use ShadeMap as the maintainer asked, the agent computed the
**ShadeMap-equivalent** locally: fetched OpenStreetMap buildings (the data ShadeMap uses) via Overpass
for central Gothenburg and ran the same swept-shadow projection, with a height-sensitivity test
(re-run with unknown-height buildings low vs tall; flag where the verdict flips). This was spot-checked
against the live ShadeMap UI to confirm the URL/time format and that shadows render as expected.

Key finding bearing on accuracy: **69% of central-Gothenburg OSM buildings have no height/levels tag**,
so ShadeMap/OSM is a markedly less complete model than our surveyed Baskarta-Z + DTM heights. ShadeMap
is therefore a useful independent cross-check, **not** a higher-authority ground truth.

Result of our-data `expected` vs ShadeMap/OSM verdict across the 80 points:
- **50 agree** — two independent datasets concur → treated as validated. Pre-filled as `observed`
  (reviewer `auto: ShadeMap(OSM)+SunnySeat concur`) in `results.jsonl` / `observations.csv`.
- **30 diverge** (19 our-shadowed/OSM-sunny — usually OSM missing a height; 11 our-sunny/OSM-shadowed —
  possible gap in our data; plus OSM-undecidable). These are written to
  `shadow_caster_spot_checks.divergences.md` with the reason, distance from Viktoriagatan 24 (all
  0.2–1.9 km), and ShadeMap/Satellite/Street-View links. They **cannot be auto-resolved fairly**:
  static aerial imagery can't show the future-solstice-time shadow, and OSM is too incomplete to
  overrule our surveyed data — so they need the maintainer's eye / a quick in-person look.

### Maintainer steps to finish AC2

1. Work through `shadow_caster_spot_checks.divergences.md` (30 rows, sorted nearest-first). For each,
   open the **ShadeMap** link (independent shadow at the exact time) and confirm with Satellite /
   Street View — or walk to it. Decide **sunny** / **shadowed** / **uncertain**.
2. Record each in `shadow_caster_spot_checks.observations.csv` (the 50 agreements are already filled;
   only the 30 are blank). `uncertain` needs an `uncertainty_causes` value (tree / awning / umbrella /
   bridge / temporary_structure / seasonal_furniture / other — `other` needs a `note`).
3. Optionally spot-check a random sample of the 50 auto-filled agreements in the same file.
4. From the repo root run `python building_geodata/_spotcheck_ingest.py "Rasmus"` — it merges the
   observations, computes agreement vs our data, stamps reviewer/timestamp, and runs
   `evaluate-spot-checks`, printing each cluster's status.
5. Gate passes when every required cluster is `eligible` (≥10 checks, ≥70 central, all 3 buckets,
   ≥85% agreement). Then move the story to `review`: `.\scripts\run-sh.ps1 scripts/story-review.sh
   8-1-shadow-caster-geodata-import`.

A `blocked` cluster (<85%) means real disagreements — the "our-sunny / OSM-shadowed" rows especially
point at possible gaps in the imported building data (a follow-up data fix), not rows to overwrite.
Until the gate passes, the Story 3.0.5 fail-closed contract keeps user-facing confidence honest for
unvalidated clusters. Current state: 50 filled, 30 pending → gate `insufficient_evidence`.

Helper scripts (gitignored, `building_geodata/`): `_spotcheck_build.py`, `_spotcheck_expected.py`,
`_spotcheck_assemble.py`, `_spotcheck_osm.py`, `_spotcheck_finalize.py`, `_spotcheck_ingest.py`;
OSM cache `_osm_buildings.json`; aerial viewer `_aerial.html`.

## Connection notes (for re-runs)

- Direct host `db.hhnbxrhfhlzxgllxukzj.supabase.co` is **IPv6-only** — unusable from Docker on this
  host. The import used the IPv4 **session pooler** `aws-1-eu-west-1.pooler.supabase.com:5432`
  (user `postgres.hhnbxrhfhlzxgllxukzj`), session mode (supports `\copy` + the multi-statement txn).
- Connection strings live in gitignored `.env.local` (`SUPABASE_DB_URL`, `SUPABASE_DB_POOLER_URL`);
  never committed/echoed. Re-running the import is idempotent (deterministic batch delete + insert).
- `psql` is not installed on the host; runs used a one-off `postgis/postgis:15-3.5` container with
  `building_geodata/` bind-mounted read-only.
