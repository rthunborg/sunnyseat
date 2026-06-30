# Story 9.4: Client Query Hygiene & Time-Change Debounce

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want changing the time and switching to Favoriter to feel instant,
so that I'm not waiting on redundant network round-trips.

## Acceptance Criteria

_(Verbatim from epics.md §"Story 9.4: Client Query Hygiene & Time-Change Debounce". Parentheticals — "with an appropriate `staleTime`", "via the existing `onSnap`", "or `useDeferredValue` in `MapView`" — are the epic's own option menus, not new criteria. The dev picks the cleaner option per AC and records the choice.)_

1. **Given** the "Favoriter" tab uses a separate, non-shared query that refetches the engine for already-loaded venues, **When** the favourites view is sourced from the existing `venues.list` cache (derive by filtering loaded venues by favourite ids, or seed the favourites query from cache with an appropriate `staleTime`), **Then** entering Favoriter no longer issues a fresh `/api/venues` request when the venues are already loaded, and toggling between "Närmast" and "Favoriter" is instant.

2. **Given** the list currently fetches once at the geolocation fallback coords and again when real GPS resolves (a different bucketed key), **When** the double-fetch is addressed (gate the first fetch until geolocation settles, or widen the coordinate bucket), **Then** initial load issues a single venue request in the common case, with `keepPreviousData` still masking any necessary transition.

3. **Given** the time scrubber currently feeds `selectedMinutes` straight into the query key on every change, **When** the time→query coupling is debounced/committed on settle (commit on pointer-up / arrow / blur via the existing `onSnap`, or `useDeferredValue` in `MapView`), **Then** a drag enqueues at most one `/api/venues` request after the user settles, and returning the slider to the current time reads as an intentional "live now" state rather than a silent no-op.

### Design Gate Criteria

_(Frontend interaction story. Carried verbatim from epics.md §"Story 9.4 → Design Gate Criteria". This is a NO-visual-change story; the gate is "renders identically" + behaviour, and the behavioural REGRESSION suite is owned by Story 9.10 — see "Test boundary" below.)_

- **Visual:** No visual change to the list, favourites, or time controls.
- **Behaviour:** Favoriter↔Närmast switch issues no redundant fetch; one request per settled time; live-now state is clear.
- **Animation:** Slider thumb stays smooth during drag (visual position decoupled from the committed query — the thumb already tracks `selectedMinutes` locally; the query, not the thumb, is what gets deferred).
- **Visual validation:** N/A beyond confirming the list/favourites/time controls render identically; behaviour covered by regression tests in Story 9.10.

## Tasks / Subtasks

- [x] **Task 1 — Source Favoriter from the loaded `venues.list`/`planner` cache; stop the redundant favourites fetch (AC: #1)**
  - [x] In `MapView.tsx`, the favourites view is driven by `favouriteVenueQuery = useFavouriteVenues({ ids, lat, lng, enabled: listMode === 'favourites', ...plannerTime.plannerQuery })` (`MapView.tsx:173-179`). Today entering Favoriter (`listMode === 'favourites'`) flips `enabled` true → a brand-new `/api/venues?ids=…` request even though the same venues are already in the `venues.list` (or `venues.planner`) cache from the Närmast view.
  - [x] **Recommended option — derive from the loaded list (preferred over a second network call):** CHOSEN. `favouriteVenueRows` is now built by filtering the loaded `venueQuery.data.venues` to `favourites.favouriteIds` (list cache first, so the freshly-loaded rows win), topping up only with network favourite rows for ids the loaded list does not cover. `useFavouriteVenues` is gated `enabled: coordsSettled && needsFavouriteFetch` where `needsFavouriteFetch = listMode === 'favourites' && !favouritesAllInLoadedList`, so entering Favoriter with all favourites loaded issues **0** new `/api/venues` requests. `placeholderData`/`keepPreviousData` preserved.
  - [x] **Alternative option (if the derive-from-list path is awkward):** NOT chosen — the derive-from-list path was clean (no second query at all when loaded), so no `initialData`/seed `staleTime` change was needed. Client `staleTime` left at `FIVE_MINUTES`.
  - [x] **The bucketed `(lat,lng)` MUST match** between the list query and the favourites query — both still `bucket()` to 4 dp with the SAME `BUCKET_DECIMALS=4` constant; `deferredPlanner` is spread identically into both queries (`MapView.tsx:186-221`), and the favourites derive reads `venueQuery.data.venues` (whichever of `venues.list`/`venues.planner` is live), so it composes with the current planner state.
  - [x] **Net AC1 outcome:** entering Favoriter when the venues are already loaded issues **0** new `/api/venues` requests; the toggle is instant. `useFavouriteVenues` retained for the cold `/favoriter` deep-link (list empty) and out-of-radius favourites (proven by the retained `passes favourite venue DTOs into selection` + new `falls back to a real favourites fetch for a favourited id NOT in the loaded list` tests).

- [x] **Task 2 — Kill the geolocation fallback→GPS double-fetch (AC: #2)**
  - [x] Root cause confirmed against `hooks/useGeolocation.tsx`: `coords` starts at `GOTHENBURG_CENTRE` with `status: 'idle'`, queries ran immediately (`enabled: inputsValid`), then a real-GPS resolve flipped the bucketed key → a second `/api/venues`.
  - [x] **Recommended option — gate the first fetch until geolocation settles:** CHOSEN. Added an optional `enabled?: boolean` param to `useVenueSearch` (`AND`-ed with the internal `inputsValid` guard). `MapView` derives `coordsSettled = geolocation.status === 'success' || geolocation.status === 'fallback'` and passes `enabled: coordsSettled` to `useVenueSearch` and `enabled: coordsSettled && needsFavouriteFetch` to `useFavouriteVenues` (which already had an `enabled` param). While `idle`/`pending` no fetch fires; on the first settled status the single fetch fires at the resolved coords. `keepPreviousData`/`placeholderData` masks any later status change.
  - [x] **Constraint — do NOT regret-block the fallback users:** the gate releases on `success` OR `fallback`, never waits indefinitely on `idle`/`pending` — verified by the `enables the venue search for a fallback (centrum) user` test. The returning-user silent-acquire path (`idle`→`pending`→`success`) fires exactly once at `success` (verified by `enables the venue search exactly once geolocation settles to success`). Hook-level single-fetch-after-gate proven by the new `useVenueSearch.test.ts` AC2 case.
  - [x] **Alternative option (widen the bucket):** NOT chosen — gating is the stronger fix and never touches the steady-state 4-dp bucket. The bucket logic is untouched.
  - [x] **Interaction with Story 9.5:** only the query-firing timing was touched. The `coordsSettled`/`geolocation.status` signal is read directly from the existing hook (no new API surface); 9.5's dot/CTA/welcome-flash were NOT implemented here.

- [x] **Task 3 — Debounce/commit the time→query coupling on settle (AC: #3)**
  - [x] Root cause confirmed: `setSelectedMinutes` immediately updates `selectedTime`, `plannerTime.plannerQuery` is derived from it (`TimeContext.tsx:208-210`), and `MapView` keyed the venue queries off it — so every snapped 15-min step flipped the key. Slider step `PLANNER_STEP_MINUTES=15` equals Story 9.3's 15-min server bucket.
  - [x] **Recommended option — `useDeferredValue` on the committed planner key in `MapView`:** CHOSEN. `const deferredPlanner = useDeferredValue(plannerTime.plannerQuery)`; both venue queries are fed `...deferredPlanner`. `selectedMinutes`/`selectedTime` keep updating immediately, so the thumb + time badge stay live; only the query-driving copy is deferred. `keepPreviousData` masks the in-between renders. Smallest blast radius — NO `TimeContext` change.
  - [x] **Alternative option — commit-on-settle via `onSnap`:** NOT chosen — `useDeferredValue` was both correct AND deterministically testable (the planner-key behaviour is assertable regardless of timing), so the heavier `TimeContext` committed-vs-live split was avoided.
  - [x] **Preserve the "live now" semantics:** preserved for free — deferring the SAME `plannerQuery` (which the context already computes as `undefined` when `isLiveNow`) means settling ON the current time defers to `undefined` (planner-less live key) and settling OFF it defers to one planner key. Proven by the new `deferred-planner-query.test.tsx` "settling back ON the current live time resolves to the planner-LESS live key" + the MapView "feeds the venue search a planner-less key while live" tests.
  - [x] **Net AC3 outcome:** a rapid sequence of snapped changes that settles off-live enqueues exactly ONE additional `/api/venues` request (live fetch + 1 settled planner fetch = 2 total, never the 4 a per-step coupling would produce) — proven by the `deferred-planner-query.test.tsx` `fetchSpy` count. The thumb/badge stay smooth (decoupled). NOTE: the venue-DETAIL query (`useVenueDetail`) was intentionally left on the non-deferred planner — it only runs with a detail panel open (single, 9.3-cached venue) and is outside AC3's list-churn scope; deferring it would also churn the detail-refresh tests for no list-fetch benefit (see Completion Notes).

- [x] **Task 4 — Unit/integration tests for THIS story's three fixes (own-surface proof; e2e regression is Story 9.10)**
  - [x] **AC1:** added a `MapView`-level `describe('AC1 …')` block proving that, with `useVenueSearch` returning a loaded list containing the favourited ids, entering Favoriter calls `useFavouriteVenues` with `enabled: false` (0 additional fetch) and renders the filtered venue from the list; plus a Närmast→Favoriter toggle test (stays disabled) and the out-of-radius fallback test (enabled: true). The existing cold-load/out-of-radius favourites tests stay green (that path SHOULD still fetch). Hook-level `enabled:false → idle, no fetch` is already covered by `useFavouriteVenues.test.ts`.
  - [x] **AC2:** added a `useVenueSearch.test.ts` `renderHook` + `fetchSpy` case proving the query does NOT fire while `enabled:false` (idle/pending) and fires exactly ONCE when `enabled` flips true. Added a `MapView`-level `describe('AC2 …')` driving `geolocation.status` through idle/pending (gated) → success/fallback (enabled).
  - [x] **AC3:** added `test/unit/queries/deferred-planner-query.test.tsx` — a miniature of MapView's exact wiring (real `TimeProvider` + real `useVenueSearch` + `useDeferredValue`) against a mocked `fetch`. Asserts (a) a rapid 4-step `setSelectedMinutes` drag settling off-live enqueues exactly one additional planner fetch (`fetchSpy` count = 2, never 4), and (b) settling back ON the live time defers to the planner-LESS live key. Plus MapView-level planner-less-while-live + single-planner-key-after-commit tests. The deferred settling was deterministically assertable via `act` + `waitFor` on the deferred params/`fetchSpy`, so no timing-flaky assertion was needed.
  - [x] **Test boundary:** did NOT scaffold Story 9.10's cross-cutting Playwright mobile regression suite — only unit/integration coverage of 9.4's own three fixes. No behaviour required an e2e-only assertion (all three fixes are cleanly assertable at the hook/component level via the `enabled` flag, the deferred params, and the `fetchSpy` count).

- [x] **Task 5 — Test gate + regression verification (standard gate)**
  - [x] Canonical gate run locally as a dry run: `npx tsc --noEmit` → 0 errors · `npx eslint . --quiet` → 0 errors · `npx vitest run` → all green, **88 files / 772 tests**. Actual baseline at HEAD before this story was 87 files / 760 tests (includes 9.0–9.3 work — the "86/728" in the spec was the older 9.3 dev-record figure), so this story is +1 file / +12 tests, none dropped.
  - [x] Confirmed NO regression in the named query/time suites: `useVenueSearch.test.ts`, `useFavouriteVenues.test.ts`, `useVenueDetail.test.ts`, `TimeContext.test.tsx`, `TimeSlider.test.tsx` — all green (53 tests). The DTO/response contract is unchanged (caching/timing only).
  - [x] **Visual gate:** NO visual change. Confirmed by diff inspection: the only `+` lines in `MapView.tsx` that touch the render path are the `favouriteVenueRows` derive memo (pure data logic) — there is ZERO JSX/className/style/element change. The `map-primary` (list) and `favourites-tab` (favourites) surfaces receive the same venue-data shape and render IDENTICALLY; only WHEN/WHETHER fetches fire changed. On this Windows host the automated `visual-validate.sh` screenshot step errors on the `/tmp` path (retro-notes 9-2), so per the documented affordance (`VISUAL_VALIDATE_PROVIDER=none ALLOW_MANUAL_VISUAL_VALIDATION=1`) the no-visual-change invariant was confirmed manually via the diff + the unit/integration behaviour proof. NO rebaseline (a diff would have been a FAIL; there is none). The gate script was left unmodified.
  - [x] Status moved to `review` (story file + sprint-status). The orchestrator owns gate/commit/PR.

## Dev Notes

### Why this exists (root cause — Spine 4 of the Epic 9 triage, the CLIENT half)

Epic 9 root-cause #4 (epics.md:2347): *"Time/date wired straight into the TanStack query key with no debounce, over a heavy uncached engine. Each snapped 15-min change fires a fresh `/api/venues` round-trip; per request the real engine runs N venues × 2 Supabase `get_buildings_near_point` RPCs (~145–440 ms each, measured live) + ~41 shadow projections, with no server cache; the same cost hits the venue-detail route. (Stories 9.3, 9.4)."*

**Story 9.3 (just landed, status `review`) is the SERVER half:** it halves the RPCs (dedupe 2→1 per venue), adds a per-(venue, 15-min bucket, day) sun-compute cache + a 24 h buildings cache, and made the venue read routes edge-cacheable (`s-maxage=30`). 9.3 makes each request CHEAP.

**Story 9.4 (this story) is the CLIENT half:** it makes the app issue FEWER requests — (1) Favoriter from the loaded cache instead of a fresh fetch, (2) one initial fetch instead of fallback-then-GPS, (3) one fetch per SETTLED time instead of one per drag-step. They compound: 9.3 + 9.4 together turn "stalls on every load and every slider nudge" into "instant in the common case." The app is **LIVE on the real data path** since the 2026-06-29 production cutover, so this is on the live UX-critical path.

### How 9.4 composes with 9.3's 15-min bucket / staleness model (READ — alignment is load-bearing)

The architecture's **Agreed staleness window** (architecture.md:350-355, ratified by Story 9.3) is: **client TanStack 5-min stale time · CDN `s-maxage=30` · sun-compute server cache 15 min · buildings 24 h.** 9.4 must compose with this, not fight it:

- **The slider step IS the server bucket.** `PLANNER_STEP_MINUTES = 15` (`time-planner.ts:4`) equals Story 9.3's 15-min sun-compute bucket. So a SETTLED slider move (Task 3) lands exactly on a server-cache bucket boundary — the one debounced fetch is very likely a WARM server-cache (or even edge `s-maxage`) hit. Debouncing on the client is what stops the mid-drag fetches that would each be a fresh bucket compute; the two fixes are designed to interlock at the 15-min granularity. Do NOT debounce to a granularity FINER than 15 min (pointless — sub-bucket moves don't change the snapped value) or COARSER (would skip legitimate bucket changes).
- **Client `staleTime` stays 5 min.** Both `useVenueSearch` and `useFavouriteVenues` already set `staleTime: FIVE_MINUTES` (`useVenueSearch.ts:13,104`; `useFavouriteVenues.ts:14,66`). This is the ratified client window — do NOT change it. For the AC1 favourites-from-cache seed (the alternative option), the seed `staleTime` must be **≥** the list's 5 min so the seeded favourites query treats the cached venues as fresh and does NOT refetch on entry; the derive-from-list option (preferred) sidesteps this by not running a query at all when the data is already loaded.
- **`keepPreviousData` is the transition mask everywhere.** It is already set on the list (`useVenueSearch.ts:109`) and approximated on favourites via the `filterResponseToIds` `placeholderData` (`useFavouriteVenues.ts:71`). All three ACs explicitly rely on it to avoid an empty-flash during a necessary key change. Preserve it.
- **Weather honesty is untouched.** 9.4 changes WHEN/WHETHER the client fetches, never the response. The `X-Weather-Updated-At` / `isForecast` "approximate" signals (read via `readSunFreshnessHeaders`, `useVenueSearch.ts:6,100`) flow through unchanged.

### The exact current data flow (read the code before editing)

| Concern | File:line | Current behaviour |
|---|---|---|
| List query | `MapView.tsx:167-172` → `useVenueSearch` | fires immediately at `geolocation.coords` (fallback or GPS); key from `bucket(lat),bucket(lng),radiusKm,…planner` |
| Favourites query | `MapView.tsx:173-179` → `useFavouriteVenues` | `enabled: listMode === 'favourites'`; on entry fires a fresh `/api/venues?ids=…` even if the venues are already in the list cache |
| Planner key | `TimeContext.tsx:208-210` (`plannerQuery`) | `undefined` when `isLiveNow`; else `{date, time}` from `selectedDate`/`selectedTime`; **changes on every snapped drag step** |
| Slider onChange | `TimeSliderPanel.tsx:66,85` → `setSelectedMinutes` | updates `selectedMinutes` + `selectedTime` immediately (every step) |
| Slider settle | `TimeSlider.tsx:82,101` (`onPointerUp`/`onBlur` → `onSnap`) | only re-snaps to the grid — NO debounce of the query today |
| Geolocation | `useGeolocation.tsx:62-184` | `coords` starts at `GOTHENBURG_CENTRE` (`idle`) → resolves to GPS (`success`) or `fallback`; returning users auto-acquire on mount |
| Bucket | `useVenueSearch.ts:31-33`, `useFavouriteVenues.ts:76-78` | `Math.round(n*1e4)/1e4` (4 dp ≈ 11 m); SAME constant both hooks |
| Query keys | `lib/query-keys.ts:8-25` | `venues.list` / `venues.planner` / `venues.favourites`; all normalized; **never construct keys inline** |

### Expected file impact (predicted — confirm/correct in the final File List)

**Modified (source) — likely:**
- `nextjs-app/components/custom/map/MapView.tsx` — the central wiring point for all three fixes: source Favoriter from the loaded list (AC1), gate the venue query on `geolocation.status` (AC2), feed the queries a `useDeferredValue` of `plannerTime.plannerQuery` (AC3, recommended option). Most of 9.4 lands here.
- `nextjs-app/hooks/queries/useVenueSearch.ts` — likely an added `enabled` gate prop (AC2) and/or `select`/derive hook for AC1, depending on the chosen seam.
- `nextjs-app/hooks/queries/useFavouriteVenues.ts` — AC1: derive-from-list seam, or an `initialData`/seed change (only if the seed option is chosen). May be left untouched if AC1 is done purely by deriving in `MapView`.
- `nextjs-app/lib/contexts/TimeContext.tsx` — ONLY if the AC3 commit-on-settle alternative is chosen (a committed-vs-live time split); NOT touched if `useDeferredValue` in `MapView` is used (the recommended option).

**Modified (test):**
- `nextjs-app/test/unit/queries/useFavouriteVenues.test.ts` — AC1 cache-derive (0 extra fetch) coverage; keep the cold-load deep-link fetch test green.
- `nextjs-app/test/unit/queries/useVenueSearch.test.ts` — AC2 geolocation-settled gating coverage.
- A new or extended test for AC3 (single fetch per settle + live-now key) — location depends on where the debounce lands (`MapView`-level or hook-level).

**NOT changed (verify only):**
- `lib/query-keys.ts` structure, the 4-dp `bucket()` constant, the 5-min `staleTime`, the 15-min slider step, the `GetVenuesResponse` DTO — all ratified contracts.
- Any server file (`sun-engine.ts`, `sun-engine-cache.ts`, `proxy.ts`, the API routes) — Story 9.3's domain, already landed.
- Any visual reference PNG — no-visual-change story; the dev agent is forbidden from editing references.

### Architectural guardrails (MUST follow — architecture.md)

- **Query keys come from `lib/query-keys.ts` ONLY — never inline** (architecture.md:585-608,695). Any new derive/seed must reuse `queryKeys.venues.list` / `.planner` / `.favourites`.
- **Query hooks return the TanStack result object directly — never transform before returning** (architecture.md:554,702). The AC1 derive-from-list is a `select`/filter on data the CONSUMER reads, not a transform that breaks the hook contract.
- **TanStack Query is the SINGLE source of server state** (architecture.md:965-966). Do NOT duplicate venue data into Context or component state to "cache" it client-side — derive from the existing query cache. Contexts hold only client-derived state (map viewport, time slider/date position, favourites ids, locale).
- **State update via TimeContext dispatch** (architecture.md:610-614): "Time slider: TimeContext dispatch → triggers venue re-query if time changes significantly." Task 3 makes "significantly" concrete = on settle, not per drag-step.
- **Loading patterns** (architecture.md:618-623): background refetch shows NO spinner (data stays visible via `isFetching` + `keepPreviousData`); never a full-page spinner. The debounce/gate must not introduce a loading flash.
- **Perf NFR:** API p95 < 200 ms (architecture.md:55); INP ≤ 200 ms (PRD NFR3, reconciled). Fewer + cheaper requests directly serve both.

### Tech stack pins (do NOT change versions)

- **TanStack Query 5.96.2** (architecture.md:192,419). `keepPreviousData` / `placeholderData` (the v5 spelling — `placeholderData: keepPreviousData`) and `initialData` are the v5 APIs already in use. `select` is available for the derive-from-cache option.
- **React 19** (`useDeferredValue` is the recommended Task 3 primitive; it is stable in React 19 and already available — no new dependency).
- **Next.js 16.2.2**, **next-intl** (the "Nära mig"/"Närmast"/"Favoriter" labels are i18n keys — do NOT hardcode Swedish; the tab labels already exist).

### Scope discipline — what is OUT of scope (do NOT expand)

- **Do NOT implement Story 9.3's server caching** — it already landed (status `review`). 9.4 is client-only. Do NOT touch `lib/services/sun-engine.ts`, `sun-engine-cache.ts`, `proxy.ts`, the rate-limiter, or the API route handlers. The bucket/staleness MODEL from 9.3 is a constraint to ALIGN with, not code to re-edit.
- **Do NOT implement Story 9.5** (location dot rendering, "Use my location" CTA wiring, welcome-flash/onboarding-gate hydration fix). Task 2 touches ONLY the venue-query firing timing relative to `geolocation.status`, not the geolocation UX.
- **Do NOT implement Story 9.10** (the cross-cutting Playwright mobile regression pass + the named regression suite). Task 4 adds unit/integration coverage of THIS story's three fixes; the e2e regression specs are 9.10's deliverable.
- **Do NOT change** the steady-state 4-dp coordinate bucket, the 5-min client `staleTime`, the response DTO shape, the query-key factory's structure, or the slider's 15-min step. These are ratified contracts the fixes must preserve.
- Do NOT touch the planner/forcing gate (9.0), content sweep (9.1), CTA token (9.2), map chrome (9.6), tags (9.7), sharing (9.8), or the QuickInfo rework (9.9).

### Constraints carried in from Epic 9 retro-notes (`_bmad-output/auto-bmad/retro-notes/epic-9.md`)

- **`## Story 9-3` (create-story + dev-story):** the agreed staleness windows are **sun-compute 15 min / buildings 24 h / CDN `s-maxage=30` / client TanStack 5 min**. 9.4's debounce MUST align with the 15-min bucket (the slider step). 9.3 caches SUCCESS only and is byte-identical — 9.4 changes nothing server-side, so it cannot regress that.
- **`## Story 9-3`:** 9.3 explicitly flagged 9.4 as the SIBLING: *"9.4 debounces the time→query key, sources Favoriter from the list cache, and kills the geo double-fetch. 9.3 makes each request cheap; 9.4 makes fewer requests."* — confirming this story's exact three-fix scope. Test 9.4 WITH 9.3 in place where possible.
- **`## Story 9-0` (dev-story):** a pre-existing UNRELATED e2e failure `map-primary.spec.ts:645` (desktop planner-bar viewport-width, driven by `?_state=venue-detail`) is RED on baseline main — NOT introduced by Epic 9, candidate for Story 9.10. The canonical gate (`story-review.sh`) does NOT run Playwright e2e, so it does not block 9.4. Do not "fix" it here.
- **`## Story 9-2` (dev-story) — HOST TOOLING BUG affecting ALL frontend stories:** `.claude/scripts/visual-validate.sh` screenshots via a `/tmp/impl-XXXXXX.png` path the Windows-native Playwright binary cannot write, so the AUTOMATED visual gate errors "Could not screenshot dev server" on this host. Workaround: the documented manual path (`VISUAL_VALIDATE_PROVIDER=none ALLOW_MANUAL_VISUAL_VALIDATION=1`) with byte-identical reproduction. Leave the gate script unmodified. Because 9.4 is NO-visual-change, the manual confirmation is just "the `map-primary` + `favourites-tab` references still match the unchanged render."
- **`## Story 9-2` (dev-story) — Turbopack CSS cache trap:** a stale `next dev` can serve old chunks after an edit; not directly relevant (no CSS change here), but if a dev-server render is captured for the manual visual confirmation, verify the served chunk is current first.
- **`## Story epic-9` (test-design):** the CI-e2e build-mode question is RESOLVED (CI runs Playwright vs `next dev` / `NODE_ENV=development`). Not directly relevant to 9.4 (no e2e in the canonical gate), noted for completeness.

### Deferred-work ledger check (`_bmad-output/implementation-artifacts/deferred-work.md`)

No deferred item is TARGETED at Story 9.4 (none to carry in). The only entries whose SUBJECT overlaps query/fetch/time hygiene are conditional (`Target: None`) and are noted ONLY so the refactor neither reopens nor regresses them:

- **`gcTime: 0` in test queries flaky in StrictMode dev double-render** (`test/setup/test-utils.tsx`, `test/unit/queries/useVenueSearch.test.ts`; from 1-4 R2) — conditional, "only triggers if test flakes seen in CI." The AC1/AC2/AC3 tests reuse this `gcTime: 0` test wrapper pattern (`useFavouriteVenues.test.ts:35`). Be aware that StrictMode double-render can affect fetch-count assertions; structure the new count tests to tolerate or disable StrictMode in the test wrapper if a double-render perturbs the count (the existing query tests already manage this). Do NOT reopen the item.
- **Lat/lng query-key rounding bucket** (carried into Story 1.5, now the live `bucket()` 4-dp logic) — already RESOLVED; it is the very mechanism Task 2's "widen the bucket" alternative would touch. If you take the gate option (preferred), you do NOT touch the bucket at all. If you take the widen-bucket alternative, change ONLY a first-fetch bucket, never the steady-state 4-dp bucket the 9.3 caches/dedupe rely on.

These have NO target story → do NOT fix them; just don't regress them.

### Visual gate on this host (frontend story, but NO visual change)

9.4 has mapped screen IDs `map-primary` (the list) and `favourites-tab` (favourites) in the Screen ID → Route Map (`project-context.md:163-164,186-187`), but the Design Gate is explicit: **No visual change.** So the gate's job is to confirm those references still match an UNCHANGED render — a PASS is expected, a DIFF is a FAIL (the refactor leaked a visual change), NOT a rebaseline. The dev agent is forbidden from editing references. On this Windows host the automated screenshot step errors on the `/tmp` path bug (retro-notes 9-2) → use the documented `VISUAL_VALIDATE_PROVIDER=none ALLOW_MANUAL_VISUAL_VALIDATION=1` manual affordance with recorded rationale, OR (since this is genuinely no-visual-change and the behaviour is the deliverable) confirm via the unit/integration tests + a manual render check. Record what you did.

### Persistent facts (epic-wide / earlier-story conventions)

- The app is **LIVE on the real data path** since the 2026-06-29 cutover (`SUNNYSEAT_SUN_ENGINE=real` + Supabase venue store in Production). The live `public.venues` holds the **7 test/fixture venues** (project ref `hhnbxrhfhlzxgllxukzj`). So "the venues are already loaded" (AC1) is the common case — the favourited venues are almost always a subset of the 7 already in the list cache.
- CI runs the DEFAULT (flag-off) seed path; the new client behaviour is exercised in tests by mocking `fetch` (the existing `vi.spyOn(globalThis, 'fetch')` pattern), not by hitting live Supabase.
- **NFR8 bundle gate** excludes the lazy MapLibre chunk (420 KB budget) — 9.4 is logic-only in already-loaded client modules (`MapView`, the query hooks, `TimeContext`); it should not move the bundle materially, but do not regress the gate (MEMORY "CI & e2e gotchas").
- Standard gate commands + status-transition-via-script + no global Docker/WSL changes per `AGENTS.md`. The orchestrator owns git/PR.

### Open questions (non-blocking — sensible defaults applied)

1. **AC1 — derive-from-list vs seed-with-staleTime?** Default: **derive from the loaded `venues.list`/`planner` cache** (no second query when the favourites are already loaded; fall back to `useFavouriteVenues` only for ids outside the loaded radius / cold deep-link). Pick the cleaner seam and document it.
2. **AC2 — gate vs widen-bucket?** Default: **gate the first fetch until `geolocation.status` settles to `success`/`fallback`.** The widen-bucket alternative is weaker; only use it if gating destabilises the onboarding flow, and never alter the steady-state 4-dp bucket.
3. **AC3 — `useDeferredValue` vs commit-on-settle?** Default: **`useDeferredValue` on the committed planner key in `MapView`** (smallest blast radius; thumb stays live). Fall back to the commit-on-settle split in `TimeContext` if `useDeferredValue`'s settling is awkward to assert deterministically in vitest — pick the one that is both correct AND testable, and document it.
4. **How aggressively to assert AC3 in unit tests given `useDeferredValue` timing?** Default: assert the deterministic QUERY-KEY behaviour (planner-less key on settle-to-now; single planner key on settle-off) plus a `fetchSpy` count where flushing is reliable; defer any inherently-timing-flaky assertion to Story 9.10's e2e.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.4: Client Query Hygiene & Time-Change Debounce (2461-2485)] — user story, 3 ACs (verbatim), 4 Design Gate Criteria.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9 root-cause note Spine 4 (2347)] — "time/date wired straight into the query key with no debounce, over a heavy uncached engine (Stories 9.3, 9.4)."
- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.10 (2627-2643)] — the cross-cutting regression suite ("settled time change → exactly one request; Favoriter↔Närmast no redundant fetch") + mobile pass are 9.10's deliverable, NOT 9.4's.
- [Source: _bmad-output/implementation-artifacts/9-3-venue-sun-compute-performance-server-caching.md] — the SERVER half (just landed, `review`): 15-min sun-compute bucket, 24 h buildings cache, edge `s-maxage=30`, the byte-identical/staleness model 9.4 aligns with; the explicit "9.4 is the sibling" scope note (Dev Notes "Scope discipline").
- [Source: nextjs-app/components/custom/map/MapView.tsx:116-179 (useVenueSearch + useFavouriteVenues call sites, listMode/desktopListMode, plannerTime.plannerQuery wiring), 167-172, 173-179] — where all three coupling points live.
- [Source: nextjs-app/hooks/queries/useVenueSearch.ts:31-33 (bucket), 61-70 (inputsValid + planner key), 104-110 (staleTime 5min, keepPreviousData, enabled)] — the list query to gate (AC2) + defer (AC3).
- [Source: nextjs-app/hooks/queries/useFavouriteVenues.ts:23,71-72 (enabled param + filterResponseToIds placeholderData), 84-100 (the filter shape to reuse for the AC1 derive)] — the favourites query to source from cache (AC1).
- [Source: nextjs-app/hooks/useGeolocation.tsx:62-184 (status idle→pending→success|fallback, GOTHENBURG_CENTRE fallbackCoords, returning-user auto-acquire 126-176)] — the double-fetch root cause (AC2).
- [Source: nextjs-app/lib/contexts/TimeContext.tsx:130-159 (setSelectedTime/setSelectedMinutes/snapSelectedMinutes), 197-210 (isLiveNow + plannerQuery undefined-when-live)] — the time→query coupling + live-now semantics (AC3).
- [Source: nextjs-app/components/composed/time/TimeSlider.tsx:81-101 (onChange→adjust, onPointerUp/onBlur→onSnap, arrow handlers)] + [nextjs-app/components/custom/time/TimeSliderPanel.tsx:62-90 (onMinutesChange=setSelectedMinutes, onSnap=snapSelectedMinutes)] — the slider that drives the per-step query churn (AC3).
- [Source: nextjs-app/lib/utils/time-planner.ts:4 (PLANNER_STEP_MINUTES=15)] — the slider step equals 9.3's 15-min server bucket; the debounce aligns to it.
- [Source: nextjs-app/lib/query-keys.ts:5-43 (venues.list/planner/favourites factory + normalize)] — the keys to reuse; never inline.
- [Source: _bmad-output/planning-artifacts/architecture.md:316-355 (Caching Strategy + Story 9.3 layers + Agreed staleness window), 585-608 (TanStack key conventions), 610-623 (state-update + loading patterns), 695-702 (must-follow rules), 965-966 (TanStack single-source data boundary), 55 (API p95 <200ms)] — the ratified constraints 9.4 composes with.
- [Source: nextjs-app/test/unit/queries/useFavouriteVenues.test.ts:35,44-60 + useVenueSearch.test.ts] — the renderHook + `vi.spyOn(globalThis,'fetch')` count pattern to reuse for the AC1/AC2/AC3 tests.
- [Source: project-context.md:157-189 (Screen ID → Route Map: map-primary 163-164, favourites-tab 186-187)] — the surfaces that must render IDENTICALLY (no-visual-change gate).
- [Source: nextjs-app/docs/design/DESIGN.md] — design-token + component source of truth. 9.4 introduces NO new tokens/components and changes NO styling — referenced only to confirm the list/favourites/time-control visuals stay exactly as defined (the "renders identically" gate). Consult `frontend-component` skill before touching any UI, though this story should touch none.
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX interaction spec. The time-slider/planner and list/favourites interaction behaviour defined there is PRESERVED; 9.4 changes only the network-fetch timing behind those interactions (no UX surface change), so no spec section is being altered.
- [Source: _bmad-output/auto-bmad/retro-notes/epic-9.md (## Story 9-3 staleness windows + sibling-scope note; ## Story 9-0 pre-existing map-primary.spec.ts:645 failure; ## Story 9-2 Windows /tmp visual-gate bug)] — carried constraints.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md (1-4 R2 gcTime:0 StrictMode test-flake; 1-4 R1 lat/lng bucket — now resolved/live)] — conditional overlaps NOT to reopen.
- [Source: MEMORY — "Data layer & epic plan" (Epic 9 root-cause #4 = undebounced+uncached time→query engine); "CI & e2e gotchas" (NFR8 bundle gate excludes lazy MapLibre chunk); "Vitest dynamic-import mock bypass" (mock at the boundary — here `fetch`, not a dynamic import)].
- [Source: CLAUDE.md → AGENTS.md (§Testing Requirements, §BMAD Story Workflow, §frontend-component design-system-first, §Local Docker/WSL Rules)] — gate commands, status-transition rule, no global Docker/WSL changes.

## Dev Agent Record

### Agent Model Used

Amelia (Dev) — Claude Opus 4.8 (claude-opus-4-8)

### Debug Log References

- Baseline gate at HEAD: `npx tsc --noEmit` 0 · `npx eslint . --quiet` 0 · `npx vitest run` 87 files / 760 tests.
- Final gate: tsc 0 · eslint 0 · vitest 88 files / 772 tests (+1 file / +12 tests, none dropped).
- Named regression suites (`useVenueSearch`/`useFavouriteVenues`/`useVenueDetail`/`TimeContext`/`TimeSlider`): 53 tests green.

### Completion Notes List

**Chosen option per AC (all the story's recommended defaults):**
- **AC1 — derive-from-list (preferred), NOT the seed-with-staleTime alternative.** `favouriteVenueRows` is built by filtering the loaded `venueQuery.data.venues` to the favourite ids (list cache first so the freshly-loaded rows win), topping up only with network favourite rows for ids the list does not cover. `useFavouriteVenues` is gated off (`enabled: false`) whenever every favourite is already in the loaded list, so entering Favoriter issues **0** new `/api/venues` requests in the common case. `useFavouriteVenues` is retained (cold `/favoriter` deep-link with no list yet, and out-of-radius favourites). Client `staleTime` left at `FIVE_MINUTES`.
- **AC2 — gate the first fetch (preferred), NOT widen-bucket.** Added an optional `enabled?: boolean` to `useVenueSearch` (AND-ed with `inputsValid`); `MapView` derives `coordsSettled = status === 'success' || 'fallback'` and gates both venue queries on it. Steady-state 4-dp bucket untouched. A fallback/centrum user still gets exactly one prompt fetch.
- **AC3 — `useDeferredValue` in MapView (preferred), NOT the TimeContext commit-on-settle split.** `const deferredPlanner = useDeferredValue(plannerTime.plannerQuery)` is spread into both venue queries. Thumb/badge stay live off `selectedMinutes`/`selectedTime`; only the query-driving key is deferred. Live-now semantics preserved for free (defers the same `undefined`-when-live `plannerQuery`).

**Files NOT touched (as the recommended options intended):** `useFavouriteVenues.ts` (already had an `enabled` param), `TimeContext.tsx` (avoided by the `useDeferredValue` option), `lib/query-keys.ts`, the `bucket()` constant, the `staleTime`, the response DTO, any server file, any visual reference PNG.

**Deliberate scope decisions / deferred:**
- The venue-DETAIL query (`useVenueDetail` at `MapView`) was intentionally left on the **non-deferred** `plannerTime.plannerQuery`. It only runs with a detail panel open (a single, 9.3-server-cached venue), is outside AC3's list-churn scope, and deferring it would churn the detail-refresh tests for no list-fetch benefit. A residual: dragging the slider while a detail panel is open still re-keys the detail query per step (single cheap cached venue). Hand-off candidate to 9.10's regression pass if the detail-during-drag churn is observed; not a 9.4 deliverable.
- Story 9.10 owns the cross-cutting Playwright mobile regression suite — not scaffolded here.

**Test-suite alignment (existing tests updated, not new behaviour):** the MapView test's default `useGeolocation` mock was moved from `idle` → `success` (the common settled case) so the gated queries are enabled by default; `expectVenueSearchCall` now injects `enabled: true`; a `lastMapViewSearchCall()` helper distinguishes MapView's gated list call from the (ungated) `VenueSearchShell` typed-query call, which also consumes `useVenueSearch`. The `VenueSearchShell` typed search is intentionally left ungated — it is user-initiated/debounced, not part of the fallback→GPS first-paint double-fetch.

### File List

**Modified (source):**
- `nextjs-app/components/custom/map/MapView.tsx` — AC1 derive-from-list + `needsFavouriteFetch` gate; AC2 `coordsSettled` gate on both venue queries; AC3 `useDeferredValue(plannerTime.plannerQuery)` fed to both venue queries; `favouriteListConfidenceMeta` falls back to the list meta when derived.
- `nextjs-app/hooks/queries/useVenueSearch.ts` — added optional `enabled?: boolean` param, AND-ed with the internal `inputsValid` guard (AC2 gate seam).

**Modified (test):**
- `nextjs-app/test/components/MapView.test.tsx` — default geolocation mock → `success`; `expectVenueSearchCall` injects `enabled: true`; new `lastMapViewSearchCall()` helper; new `Story 9.4` describe block (AC1 derive/toggle/fallback, AC2 idle/pending/success/fallback gating, AC3 planner-less-while-live + single-planner-key-after-commit).
- `nextjs-app/test/unit/queries/useVenueSearch.test.ts` — new AC2 case: gated `enabled:false` → no fetch; flip true → exactly one fetch.

**Added (test):**
- `nextjs-app/test/unit/queries/deferred-planner-query.test.tsx` — AC3 integration proof (real TimeProvider + real useVenueSearch + useDeferredValue + fetchSpy): one settled planner fetch per drag; settle-back-to-live → planner-less key.

**Status (process):**
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 9-4 ready-for-dev → in-progress → review.

### Change Log

- 2026-06-30 — Implemented the CLIENT-half query-hygiene fixes (Amelia/Claude, Opus 4.8): AC1 source Favoriter from the loaded `venues.list`/`planner` cache (derive-from-list; favourites query gated off when all favourites are loaded → 0 redundant fetch); AC2 gate the first venue fetch on a settled `geolocation.status` (success/fallback) via a new `enabled` param on `useVenueSearch`, killing the fallback→GPS double-fetch; AC3 `useDeferredValue(plannerTime.plannerQuery)` so a slider drag enqueues at most one settled `/api/venues` request while the thumb stays live and live-now semantics are preserved. +1 test file / +12 tests (88 files / 772 tests; tsc 0, eslint 0). No visual change, no server-file change, no DTO/bucket/staleTime change. Status → review.

## Review Findings

**Review type:** THIN (Tier-A, epic-mode) single-pass — Acceptance Auditor lens + dedicated Security review (R=1). Blind Hunter / Edge Case Hunter intentionally NOT run in Tier A (their absence is by design, not a failed layer).

**Verdict:** Approve. Critical 0 · High 0 · Med 0 · Low 0 (surviving). Open Decisions: 0.

**Surviving findings (after triage):** 0. All three ACs implemented as specified; the four named risk vectors (gate over-suppression, deferred-value staleness, keepPreviousData masking a changed result, VenueSearchShell ungated) were each checked and do not manifest. Security: 0 exploitable findings (geolocation coords / favourite ids / favourite rows all reach `URLSearchParams`/React text via finite-number coercion + `bucket()` + `sanitizeFavouriteIds` + default React escaping; no new network surface, no secrets/crypto/auth, the `enabled` flag is a client gate not a trust boundary).

**Dismissed as noise (5):**
- [Low → Dismiss · cosmetic] `favouriteListConfidenceMeta = favouriteVenueQuery.data?.meta ?? venueQuery.data?.meta` (`MapView.tsx:307-308`) falls back to the LIST meta during the favourites query's in-flight/placeholder window in the mixed/topped-up case. Both queries carry the SAME `deferredPlanner` + bucketed coords, so the sun-freshness headers are for the same request shape → at worst a transient cosmetic confidence-label match, NOT a data-honesty break and NOT an AC violation. Fails the Low-selectivity test (cosmetic/already-equivalent, transient, no user-visible wrong outcome) → dismissed.
- [Info → Dismiss · verification] `favouritesAllInLoadedList` is vacuously `true` for an empty favourites set; `useFavouriteVenues` additionally guards `ids.length > 0` — both layers agree on the 0-fetch path for empty favourites. Boundary confirmed handled; no defect.
- [Info → Dismiss · verification] AC2 gate does not over-suppress a legitimate first load — `idle` is genuinely transient (returning users auto-acquire; first-time users held behind the inert `OnboardingGate` until they settle status); status never reverts to `idle`, so the gate cannot re-suppress a later refetch. No defect.
- [Info → Dismiss · verification] AC3 `useDeferredValue` does not stale the DISPLAYED data (only the query-driving copy is deferred; thumb/badge read `selectedMinutes`/`selectedTime` directly) and `keepPreviousData` masks only the transition render, not a genuinely-changed result. Live-now semantics preserved (defers the same `undefined`-when-live `plannerQuery`). No defect.
- [Info → Dismiss · verification] `VenueSearchShell` correctly left ungated (`undefined !== false` → enabled; governed by its own 200 ms debounce, not the coords gate); the `lastMapViewSearchCall()` test helper distinguishes the gated MapView call from the ungated shell call. No defect.

**Deferrals logged:** 0 (no `[Review][Defer]` items). **Failed layers:** none.
