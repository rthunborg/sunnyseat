# Story 9.0: Production-Gate the Dev Planner-Forcing URL Leak

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **maintainer**,
I want the `?_time=`/`?_date=` planner-forcing parameters to be honoured only outside production,
so that no production URL can silently pin the planner and disable the live clock.

## Acceptance Criteria

1. **Given** `nextjs-app/components/custom/layout/AppContextProviders.tsx` reads `_time`/`_date` from the URL, **When** the app runs in production (`process.env.NODE_ENV === 'production'`), **Then** `forcedTime`/`forcedDate` are always `undefined` (mirroring the existing gate in `lib/dev/use-forced-state.ts`), so the live-clock interval and normal time/date selection operate, while dev/preview keep the forcing behaviour for tooling and e2e.

2. **Given** the e2e suite that appends `?_time=` for deterministic sun assertions, **When** it runs against a non-production build, **Then** the forcing still applies and the existing time-dependent specs remain stable.

3. **Given** a regression guard is needed, **When** the gate is added, **Then** a unit/integration test asserts that `_time`/`_date` are ignored under a simulated production env and honoured otherwise.

## Tasks / Subtasks

- [ ] **Task 1 — Gate `_time`/`_date` reads behind `NODE_ENV !== 'production'` in `AppContextProviders.tsx` (AC: #1)**
  - [ ] In `nextjs-app/components/custom/layout/AppContextProviders.tsx`, make `SearchParamTimeProviders` return the un-forced provider tree when `process.env.NODE_ENV === 'production'` — i.e. `forcedTime`/`forcedDate` resolve to `undefined` so `TimeProvider` runs its live-clock + normal selection path (see Dev Notes "Implementation approach").
  - [ ] Mirror the exact contract of the sibling gate in `lib/dev/use-forced-state.ts:16-25`: a literal `process.env.NODE_ENV === 'production'` early branch placed BEFORE `useSearchParams()` so the Next.js bundler dead-code-eliminates the `useSearchParams` call (and the `_time`/`_date` branch) from the production bundle. Use a separate non-hook gate function or branch component to avoid a real rules-of-hooks violation — DO NOT add a bare `if (prod) return` above `useSearchParams()` inside the same component without the `eslint-disable-next-line react-hooks/rules-of-hooks` justification the hook uses (see Dev Notes).
  - [ ] Preserve the existing `<Suspense fallback={<DefaultTimeProviders>…}>` boundary — `useSearchParams()` still requires a Suspense parent in App Router for non-prod renders. The production path must NOT call `useSearchParams()` at all.
  - [ ] Do NOT touch `TimeProvider` (`lib/contexts/TimeContext.tsx`); the gate lives entirely at the `AppContextProviders` read site. When `forcedTime` is `undefined`, `TimeProvider` already runs the live-clock interval and default time/date selection — verified at `TimeContext.tsx:88-117` (the `if (forcedTime)` guards short-circuit to the live path).

- [ ] **Task 2 — Regression test: `_time`/`_date` ignored in prod, honoured otherwise (AC: #3)**
  - [ ] Add a test that mirrors `nextjs-app/test/unit/use-forced-state.test.ts` (the canonical pattern): mock `next/navigation`'s `useSearchParams`, drive `process.env.NODE_ENV` with `vi.stubEnv`, and assert that under `'production'` the forced time/date are NOT applied (and `useSearchParams` is NOT called), while under `'development'` they ARE applied.
  - [ ] Test placement: prefer `nextjs-app/test/components/AppContextProviders.test.tsx` (component test, since the gate lives in a component) OR a focused unit test alongside `test/unit/use-forced-state.test.ts` if the gate logic is extracted into a small testable helper. Match whichever the implementation shape makes cleanly assertable — see Dev Notes "Test design".
  - [ ] If assertion is via `TimeProvider` behaviour, render `AppContextProviders` (or the gated sub-tree) with `?_time=13:00`/`?_date=YYYY-MM-DD` mocked and read the resulting `useTimeContext()` `selectedTime`/`selectedDate`: prod ⇒ live/default values, non-prod ⇒ forced `13:00` / forced date.
  - [ ] Use `vi.unstubAllEnvs()` / `vi.resetModules()` in teardown (mirror `use-forced-state.test.ts:9-16`), because the `NODE_ENV === 'production'` branch is module-load-time-sensitive when DCE is involved — reset modules between env-stub variations.

- [ ] **Task 3 — Verify e2e determinism is preserved; confirm CI e2e build mode (AC: #2)**
  - [ ] Run the time-dependent e2e specs locally (`nextjs-app/test/e2e/map-primary.spec.ts` is the canonical one that injects `?_time=13:00` in `beforeEach`) and confirm they still pass — the dev server (`next dev`, `NODE_ENV=development`) keeps the forcing active. Other specs that append `?_time=`/`?_date=`: `onboarding.spec.ts`, `favourites.spec.ts`, `axe.spec.ts`, `axe-mobile.spec.ts`, `review.spec.ts`, `visit-loop.spec.ts`, `feedback.spec.ts`.
  - [ ] CONFIRMED PREREQUISITE (resolves the epic-9 retro open question): CI runs Playwright via `playwright.config.ts` `webServer.command = 'npm run dev'` → `next dev --turbopack` → `NODE_ENV=development`; the CI workflow `.github/workflows/build-and-test-nextjs.yml` runs `npx playwright test --project=mobile --project=desktop` / `--project=a11y` against that dev server. There is NO `next build` / `next start` in the e2e path. Therefore the new production gate does NOT fire in CI e2e and the deterministic sun specs stay green. **DO NOT introduce a production e2e build mode without re-evaluating this gate** (the gate would silently disable `?_time=` and break those specs).
  - [ ] Verify the whole vitest suite still passes (`npm run test:unit` or equivalent) and the new test is included.

- [ ] **Task 4 — Documentation touch-up (low effort, keeps the convention truthful)**
  - [ ] Extend `nextjs-app/docs/dev/state-forcing.md` (or its "Production guarantee" section) to note that `?_time=`/`?_date=` planner-forcing is now gated identically to `?_state=` — production returns no forcing, dev/preview keep it for tooling and e2e. The doc currently documents only `_state`; keep the two mechanisms' production guarantee described together so the next reader doesn't reintroduce the leak.

## Dev Notes

### Why this exists (root cause)
This is item 5-adjacent hygiene from the Epic 9 party-mode triage (epics.md §"Verified NOT broken"): "The latent `?_time=`/`?_date=` production planner-pin leak is still fixed as hygiene (Story 9.0)." Today `AppContextProviders.SearchParamTimeProviders` reads `_time`/`_date` from the URL with NO environment gate, so a production URL like `https://<prod>/?_time=21:00&_date=2026-07-01` silently pins the planner to a fixed moment and disables the live-clock interval for that visitor. The sibling dev mechanism (`?_state=`) is already correctly gated — this story brings `_time`/`_date` to parity.

### Exact current code (the leak)
`nextjs-app/components/custom/layout/AppContextProviders.tsx:49-59` — `SearchParamTimeProviders` ungated:
```tsx
function SearchParamTimeProviders({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const forcedDate = searchParams.get('_date') ?? undefined;
  const forcedTime = searchParams.get('_time') ?? undefined;
  return (
    <TimeProvider forcedDate={forcedDate} forcedTime={forcedTime}>
      <FavouritesProvider>{children}</FavouritesProvider>
    </TimeProvider>
  );
}
```
There is already a `DefaultTimeProviders` component (lines 61-67) that mounts `TimeProvider` with NO `forcedDate`/`forcedTime` — it is currently only the Suspense fallback. **Reuse it for the production path** rather than inventing a new branch.

### Canonical sibling gate to mirror (`AC #1` says "mirroring")
`nextjs-app/lib/dev/use-forced-state.ts:15-26`:
```ts
export function useForcedState(): string | null {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  // The rules-of-hooks violation is intentional: process.env.NODE_ENV is a
  // build-time constant, so the early-return branch is statically determined
  // per build. Next.js bundler DCE strips the useSearchParams call entirely
  // from production bundles ...
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useSearchParams().get('_state');
}
```
The literal `=== 'production'` string + early return is what lets the bundler DCE the `useSearchParams` call. Match this literal exactly — do NOT compute the env into a variable first (that can defeat DCE).

### Implementation approach (recommended)
`SearchParamTimeProviders` is a **component**, not a hook, so you have a cleaner option than `useForcedState`'s deliberate rules-of-hooks bend: branch at the call site so the production path renders a component that never calls `useSearchParams`. Recommended shape:
```tsx
function SearchParamTimeProviders({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    return <DefaultTimeProviders>{children}</DefaultTimeProviders>;
  }
  return <DevSearchParamTimeProviders>{children}</DevSearchParamTimeProviders>;
}

function DevSearchParamTimeProviders({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const forcedDate = searchParams.get('_date') ?? undefined;
  const forcedTime = searchParams.get('_time') ?? undefined;
  return (
    <TimeProvider forcedDate={forcedDate} forcedTime={forcedTime}>
      <FavouritesProvider>{children}</FavouritesProvider>
    </TimeProvider>
  );
}
```
This keeps `useSearchParams` inside a single component whose entire body is unreachable in production (DCE-eliminable), avoids an early-return-before-a-hook in the same component, and reuses the existing `DefaultTimeProviders`. The conditional component selection here is on a build-time constant so it does not violate rules-of-hooks. If you instead keep one component with an early `return` before `useSearchParams()`, you MUST replicate the `// eslint-disable-next-line react-hooks/rules-of-hooks` + rationale comment exactly as `use-forced-state.ts` does — the linter will otherwise flag it. The two-component split is preferred precisely because it needs no disable.

### Why `TimeProvider` needs no change
`lib/contexts/TimeContext.tsx` already does the right thing when `forcedTime`/`forcedDate` are `undefined`: the initial-state effect (lines 88-99) and the live-clock interval effect (lines 101-117) both gate on `if (forcedTime)` and fall through to `stateFromNow(clock())` + the 60s `setInterval` when it is absent. Leaving the props `undefined` (the production path) restores the live clock and normal selection with zero changes to `TimeContext`. Do not move the gate into `TimeProvider`; the AC pins it to the `AppContextProviders` read site and a `TimeProvider`-level gate would also break the test seam where tests pass `forcedTime` directly.

### Test design
- Mirror `nextjs-app/test/unit/use-forced-state.test.ts` exactly for structure: `vi.mock('next/navigation', () => ({ useSearchParams: vi.fn() }))`, `beforeEach` → `vi.resetModules()`, `afterEach` → `vi.unstubAllEnvs()` + `vi.clearAllMocks()`, drive env with `vi.stubEnv('NODE_ENV', 'production' | 'development')`, dynamically `await import(...)` the module under test AFTER stubbing env so the env-conditional branch is freshly evaluated.
- Two assertion styles are acceptable; pick the one the chosen implementation makes cleanest:
  1. **Behavioural** — render `AppContextProviders` (or the gated sub-tree) wrapped in the test providers, with `useSearchParams` returning `new URLSearchParams('_time=13:00&_date=2026-07-01')`, then read `useTimeContext().selectedTime`/`selectedDate` via a probe component: prod ⇒ live/default (not `13:00`), dev ⇒ `13:00` + forced date.
  2. **Call-tracking** — assert `useSearchParams` is NOT called in production (matching `use-forced-state.test.ts:55` `expect(useSearchParams).not.toHaveBeenCalled()`) and IS called in development. This is the lowest-friction guard and directly proves DCE-eligibility intent.
- Place at `nextjs-app/test/components/AppContextProviders.test.tsx` (component lives in `components/`, and `test/components/` mirrors that per architecture.md §"Test Organization"). A unit-test placement next to `use-forced-state.test.ts` is acceptable only if you extract a tiny pure helper; do not over-engineer an extraction just for placement.

### Scope discipline (do NOT expand)
- This is a backend/hygiene gate — **no visual change, no new screen, no UX work.** No design-gate criteria apply.
- Touch only: `AppContextProviders.tsx`, a new/updated test file, and `docs/dev/state-forcing.md`. Do NOT refactor `TimeContext`, the planner, the query layer, or the e2e specs.
- Do NOT change how e2e specs inject `?_time=` — they must keep working unchanged against the dev server.

### Project Structure Notes
- Files in play (all under `nextjs-app/`):
  - `components/custom/layout/AppContextProviders.tsx` — the gate site (component, `'use client'`).
  - `lib/dev/use-forced-state.ts` — the canonical sibling gate to mirror (read-only reference; do not modify).
  - `lib/contexts/TimeContext.tsx` — consumer of `forcedTime`/`forcedDate` (read-only reference; do not modify).
  - `test/components/AppContextProviders.test.tsx` (new) OR `test/unit/...` — the regression guard.
  - `docs/dev/state-forcing.md` — convention doc to extend.
- Test organisation per architecture.md §"Test Organization": `test/unit/` mirrors `lib/`, `test/components/` one file per component, `test/e2e/` Playwright journeys. Naming `[Name].test.ts(x)`.
- No conflicts with the unified structure; this is an in-place gate on an existing component.

### Constraints carried in from Epic 9 retro-notes (`_bmad-output/auto-bmad/retro-notes/epic-9.md`)
- **[RESOLVED for this story] CI e2e build mode open question.** The retro flagged: "if CI e2e builds run with NODE_ENV=production, Story 9.0's prod-gate disables `?_time=`/`?_date=` forcing and breaks the deterministic sun e2e specs. Confirm CI build mode BEFORE merging 9.0." Investigation result (recorded in Task 3): CI e2e boots `npm run dev` (`next dev --turbopack`, `NODE_ENV=development`) via `playwright.config.ts` `webServer`; there is no production build in the e2e path. The gate therefore does NOT fire in CI e2e — specs stay green. The risk reactivates ONLY if a future change switches the e2e webServer to `next build`/`next start`; flag that in any such change.
- The other epic-9 retro bullet (sun-engine.ts false "one buildings fetch reused internally" comment / double RPC) belongs to Stories 9.3/9.4, NOT this story — out of scope here.

### Deferred-work ledger check (`_bmad-output/implementation-artifacts/deferred-work.md`)
No active deferred-work entry overlaps this story's area. The original dev-only-state-forcing review items were all carried into Story 1.5 and removed from the ledger (ledger note 2026-05-04). Nothing to address or work around.

### Persistent facts (epic-wide, ratified by earlier stories)
- The `?_state=` dev mechanism (Story 1.2 → hardened in 1.5) is THE precedent for env-gated URL overrides: literal `process.env.NODE_ENV === 'production'` early branch → DCE strips `useSearchParams` from prod bundle ("zero bundle footprint"). Story 9.0 extends the identical contract to `_time`/`_date`.
- The deterministic sun e2e pattern (e.g. `map-primary.spec.ts` `beforeEach` injecting `?_time=13:00`) exists because server-computed sun state is wall-clock-flaky (MEMORY: CI & e2e gotchas — "e2e sun-specs force `?_time=13:00`"). This story must NOT regress that pattern.
- e2e runs against `next dev` (development), so `?_time=`/`?_date=` forcing remains active for tests after this gate lands.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.0: Production-Gate the Dev Planner-Forcing URL Leak] — user story + 3 acceptance criteria.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9 — "Verified NOT broken (no story needed)"] — "latent `?_time=`/`?_date=` production planner-pin leak is still fixed as hygiene (Story 9.0)."
- [Source: nextjs-app/components/custom/layout/AppContextProviders.tsx#SearchParamTimeProviders (lines 49-67)] — the ungated read site + existing `DefaultTimeProviders`.
- [Source: nextjs-app/lib/dev/use-forced-state.ts (lines 15-26)] — canonical env gate + DCE rationale to mirror.
- [Source: nextjs-app/lib/contexts/TimeContext.tsx (lines 88-117, 255-273)] — live-clock + forced-state effects; why no change needed when forcing is undefined.
- [Source: nextjs-app/test/unit/use-forced-state.test.ts] — canonical regression-test pattern (env stub + mocked `useSearchParams`).
- [Source: nextjs-app/test/e2e/map-primary.spec.ts (lines 201-217)] — `beforeEach` injecting `?_time=13:00`; the determinism contract to preserve.
- [Source: nextjs-app/playwright.config.ts (lines 58-62)] — `webServer.command = 'npm run dev'` (resolves the CI build-mode question).
- [Source: .github/workflows/build-and-test-nextjs.yml (lines 109-113)] — `npx playwright test --project=...` against the dev server.
- [Source: nextjs-app/docs/dev/state-forcing.md (§"Production guarantee")] — the convention this story extends to `_time`/`_date`.
- [Source: _bmad-output/auto-bmad/retro-notes/epic-9.md] — CI e2e build-mode open question (resolved here).
- [Source: _bmad-output/planning-artifacts/architecture.md (§"Context Provider Nesting Order", §"Test Organization")] — provider tree + test layout conventions.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
