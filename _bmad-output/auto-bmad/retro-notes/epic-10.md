## Story epic-10
- [Phase 2 â€” test-design] E2E has no deterministic weather-boundary mock today â€” specs hit real /api/venues and ?_time= only pins wall clock, not sky; story 10.5's weather matrix will be sky-flaky unless a mock (page.route on /api/venues* or dev-only weather-forcing param) lands FIRST (risk R-005, entry criterion).
- [Phase 2 â€” test-design] design-tokens.ts SkyCondition already carries 'rain'/'unavailable' but SunStatus has no cloud/obscured value â€” the union extension (R-003) is the real sweep surface (43 files read currentSunStatus/sunStatus/predictedState); use a never-exhaustive switch so a missed consumer is a compile error.
- [Phase 2 â€” test-design] Four thresholds deliberately UNKNOWN in test design (cloud-gate â‰¥80 proposed, layer weighting, rain-rate, nowcast horizon) â€” resolve during story drafting; tests assert relative boundary behaviour so they survive re-tuning.

## Story 10-1-cloud-gated-sun-state-weather-truth-fixes
- [Phase 3 â€” create-story] Open question handed to 10.2: SUN_STATUS_ORDER rank for CloudObscured + VenueList.getVenueSunRankForList placeholder ranking â€” 10.2 must keep 'Mest sol' list ranking by geometric sollÃ¤ge.
- [Phase 4 â€” atdd] tsc gate ignores .skip â€” red scaffolds referencing not-yet-existent exports/union members hard-break tsc; reusable workaround: loosely-typed loadEngine() dynamic-import accessor + cast-through-current-union status helper for union-extension ATDD.
- [Phase 4 â€” atdd] test/unit/services/sun-engine.test.ts flakily times out under full-suite load (jsdom navigation error), passes in isolation â€” pre-existing; hardening candidate if CI starts failing. Vitest baseline at 10.1 start: 107 files / 953 tests.
