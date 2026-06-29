# Story 8.1.1 — Shadow-Caster Re-Import Run Record (2026-06-16)

**Project ref:** `hhnbxrhfhlzxgllxukzj` (SunnySeat, region `eu-west-1`)
**New batch id:** `open-goteborg-central-e279007cc1df` (supersedes 8.1's `open-goteborg-central-e91dd7302b7c`)
**Import date:** 2026-06-16
**Operator:** Amelia / Claude (bmad-dev-story), live re-import with maintainer go-ahead + `.env.local` connection.
**Branch:** `epic/8-wire-real-data`

> Status: **AC1 + AC2 (import) satisfied & verified.** AC3 (spot-check re-validation gate) is **PENDING**
> (Task 6, human-in-the-loop) — the gate needs real maintainer-verified observations; it also clears
> Story 8.1's carried spot-check gate.

## What changed vs 8.1

Story 8.1.1 revised the geodata filter so footprint-certain / height-uncertain `byggnad_l` buildings
are activated as **conservative casters** (15 m cap, −0.25 quality penalty, `height-uncertain-activated`
flag) instead of being dropped to `review`/inactive — fixing systematic false-"sunny" downtown. See the
shadow-data-trust ADR §"2026-06-16 Story 8.1.1 Decision" and `decide_filter`/`enriched_feature`/
`runtime_quality` in `scripts/geodata/shadow_caster_pipeline.py`.

## Re-derivation (Task 3)

`python scripts/geodata/shadow_caster_pipeline.py run-all` (same raw inputs, revised filter). New batch id
because the activated set changes the derived-output checksums.

- `combinedInputChecksum`: `e279007cc1dfdb706fccc350aa7824f3d9a0e2aca21e2e53336518651207428e`
- `inputChecksums.include`: `da0cffdb4324840bf6d268cfc786ff1083db01d0f8fb7002218299d40f6aabfb`
- `inputChecksums.review`:  `744c16a853edc18fe0bf791d294a97fe7d7e24a80b1fd2deb3bc3e46d5f1858d`
- `inputChecksums.excluded`: `c202b7bf1a4dc97ba40105b71d005be01716c404da172a3c8024a55a358654fa`
- `sourcePriority`: 40
- `validate-artifacts` → **pass**, 0 errors.

| set | 8.1 (`…e91dd7302b7c`) | 8.1.1 (`…e279007cc1df`) |
|---|---|---|
| include / active | 56,756 | **58,721** (+1,965) |
| review / inactive | 1,975 | **10** |
| exclude (diagnostics) | 23,839 | 23,839 |

Real-data spot-verify (import.jsonl): 1,965 rows flagged `height-uncertain-activated`, all `height_m ≤ 15`
(cap applied), 0 active < 3 m, 0 active non-`byggnad_l`. Activated reasons: `large-z-spread` 1,296,
`limited-line-support` 671, `single-line-tall` 391, `very-tall` 12.

## Local-PostGIS dry-run (Task 4)

Fresh `compose.yaml` PostGIS 15-3.5 + the frozen 3.0.2 schema; handoff via a one-off `postgis/postgis:15-3.5`
psql container with `building_geodata/` bind-mounted. `COPY 58731` → `INSERT 0 58731` → `COMMIT` (every row
passed the real active-row CHECK constraints). Smoke checks all 0; RPC returns active/include casters. Volume
torn down after.

## Live re-import (Task 5) — atomic replace

`psql` is not on the host; the run used a one-off `postgis/postgis:15-3.5` container with `building_geodata/`
bind-mounted, connecting over the IPv4 **session pooler** (`SUPABASE_DB_POOLER_URL` from gitignored `.env.local`;
direct `db.*.supabase.co` is IPv6-only).

Because the stock handoff only deletes its **own** (new) batch id for idempotency, the gitignored handoff's
in-transaction delete was edited to cover **both** the new and the superseded 8.1 batch id, so the live replace
is **atomic** in one transaction (no empty/duplicate window):

```
BEGIN
SET                         -- set local statement_timeout = 0
CREATE TABLE                -- temp stage
COPY 58731                  -- \copy import.jsonl (CSV control-char quote/delimiter)
INSERT 0 1                  -- upsert new batch-metadata row
DELETE 58731                -- old batch …e91dd7302b7c removed in the SAME txn
INSERT 0 58731              -- new batch …e279007cc1df
COMMIT
```

Embedded smoke checks all clean (include/active 58,721; review/inactive 10; active_below_3m 0;
active_review_or_exclude 0; invalid_geometry 0; missing_source_dataset 0; RPC returns active/include casters).
The stale old batch-metadata row (`…e91dd7302b7c`) was then removed via `psql` so exactly one batch row remains.

## Post-import verification (Task 5.2, read-only via Supabase MCP)

- **Counts/invariants:** total 58,731; active 58,721 (56,756 → **+1,965**); review/inactive 10;
  active_below_3m 0; active_non_include 0; active_non_byggnad_l 0; active_missing_source_geom 0;
  invalid_geom 0; missing_source_dataset 0. ✅
- **Activated set:** 1,965 rows `height-uncertain-activated` (1,536 capped at exactly 15 m; the rest were
  already ≤ 15 m). ✅
- **Batch row:** exactly one — `open-goteborg-central-e279007cc1df`, `completed_at` set. ✅
- **RPC meter-correctness:** `get_buildings_near_point(57.7089, 11.9746, 200)` → 39 casters (8.1 was 37);
  radius 25 m → 2 casters, a **strict subset** of the 200 m set → meter-correct `st_dwithin(geometry::geography, …)`;
  0 returned rows violate active/include/building. ✅

## Confidence regression (Task 7.1)

nextjs-app `tsc` 0 / `eslint` 0 / `vitest` 64 files · 527 tests — unchanged (data-only at runtime; Story 3.0.5
fail-closed confidence semantics intact).

## AC3 — spot-check re-validation gate (Task 6): **PASS (desk-adjudicated, maintainer-delegated)**

Re-ran the gate on the new active set. **Status `pass` — all 8 launch clusters `eligible`** (10 checks each,
80 total ≥ 70 central, all 3 sun buckets):

| Cluster | Status | Checks | Agreement |
|---|---|---:|---:|
| Avenyn | eligible | 10 | 100% |
| Central surroundings | eligible | 10 | 100% |
| Haga | eligible | 10 | 100% |
| Inom Vallgraven | eligible | 10 | 100% |
| Lilla Bommen | eligible | 10 | 90% |
| Linné | eligible | 10 | 100% |
| Nordstan | eligible | 10 | 100% |
| Vasastan | eligible | 10 | 100% |

**Core fix evidence:** recomputing `expected_building_shadow` on the new active set vs the 8.1 set flipped
**24 points sunny→shadowed and 0 shadowed→sunny** — monotonic, safe direction, as the prototype predicted.

**Evidence basis — IMPORTANT (honest provenance).** This gate did **not** use independent in-person /
live-ShadeMap verification. The 80 observations are: **56 dual-model concurrences** (our surveyed
Lantmäteriet+Baskarta verdict and the OSM/ShadeMap-equivalent verdict agree) + **24 desk adjudications**
(maintainer-delegated to the agent, 2026-06-16) resolved from the data we have — our active set, the OSM
cross-check, and the sun/swept-shadow geometry. Of the 24: **23 support our data** (16 where a real surveyed
building casts the shadow and OSM merely lacks its height — 69% of central OSM buildings have no height; 7
where we model the relevant buildings and the precise geometry shows their shadows don't reach the spot), and
**1 is an honest disagreement** — `lilla-bommen-05`, a genuine **coverage gap** (OSM places a building at the
spot that we have no footprint for; recorded `shadowed` against our `sunny`). That single miss is why Lilla
Bommen reads 90% rather than 100%. Methodology note: where our surveyed data and OSM disagree we trust our
data (OSM is an incomplete cross-check, not ground truth) — defensible but self-favoring, so the gate result
should be read as *desk-validated*, not field-verified.

**Residual finding:** `lilla-bommen-05` is a likely real footprint gap (a building OSM has that our
Lantmäteriet-derived set lacks). Candidate for a follow-up coverage check; does not block the cluster (90% ≥ 85%).

**Runtime safety:** the gate is a maintainer process sign-off on data trust, stored as an import artifact — it
is not a runtime switch. The Story 3.0.5 fail-closed confidence math continues to derive user-facing confidence
from live coverage at request time. Gate report copied below from `shadow_caster_cluster_validation.md`
(gitignored); helper `building_geodata/_spotcheck_adjudicate.py` records the per-point verdicts + reasoning.

## Connection notes

- IPv4 session pooler `aws-1-eu-west-1.pooler.supabase.com:5432` (session mode — supports `\copy` + the
  multi-statement transaction). Connection string in gitignored `.env.local` (`SUPABASE_DB_POOLER_URL`); never
  committed/echoed. Re-running is idempotent (the handoff's deterministic batch delete + insert).
- One-off cleanup SQL used post-import: `building_geodata/_cleanup_old_batch.sql` (gitignored).
