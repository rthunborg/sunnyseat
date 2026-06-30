## Story epic-9
- [Phase 2 — epic test design] sun-engine.ts has a FALSE comment 'one buildings fetch reused internally' (lines 51/317) — code actually fires TWO get_buildings_near_point RPCs per venue. Stale comment masked the perf bug; Story 9.3 must correct it and reviewers must not trust it as evidence the fetch is shared.
- [Phase 2 — epic test design] Open Q (R-to-plan): if CI e2e builds run with NODE_ENV=production, Story 9.0's prod-gate disables ?_time=/?_date= forcing and breaks the deterministic sun e2e specs. Confirm CI build mode BEFORE merging 9.0.
