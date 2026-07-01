---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04-generate-tests'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-07-01'
workflowType: 'testarch-atdd'
inputDocuments:
  - '_bmad-output/implementation-artifacts/9-7-tag-filtering-real-data-working-chips.md'
  - 'nextjs-app/components/custom/layout/DesktopNavBar.tsx'
  - 'nextjs-app/lib/contexts/SettingsContext.tsx'
  - 'nextjs-app/lib/types/api.ts'
  - 'nextjs-app/lib/services/venue-store.ts'
  - 'nextjs-app/test/components/DesktopNavBar.test.tsx'
  - 'nextjs-app/test/components/OnboardingGateSessionLatch.test.tsx'
  - 'nextjs-app/test/components/UserLocationLayer.atdd.test.tsx'
  - 'nextjs-app/test/components/LocateAndSwReload.atdd.test.tsx'
---

# ATDD Checklist — Epic 9, Story 9.7: Tag Filtering (Real Data + Working Chips)

**Date:** 2026-07-01
**Author:** Rasmus (auto-bmad TEA delegate)
**Primary Test Level:** Component / Unit (RTL + jsdom, deterministic — no wall-clock)

---

## Story Summary

Give venues a real, DB-backed `tags` source and wire the desktop filter chips (currently
decorative + disabled placeholders sourced from the fabricated `venue-visual-metadata.ts`) to
actually filter the venue list and map pins through a shared `TagFilterContext`.

**As a** user
**I want** to tap a tag (Innergård, Hund ok, Wifi…) and filter venues to those that match
**So that** I can quickly narrow to places that fit what I want

---

## Acceptance Criteria (mapped to scaffolds)

1. Venue DTO carries a real `tags` array sourced from the DB store (not the
   `venue-visual-metadata.ts` placeholder); a venue with no tags returns `tags: []`.
2. Chip row is data-driven from the union of loaded venues' tags (first-seen order) and enabled.
3. Shared `TagFilterContext` drives BOTH the chip row (DesktopNavBar subtree) and the venue
   surfaces (MapView subtree); active chips show the "on" pill; list + pins filter to venues whose
   tags intersect the active selection (multi-select = OR/union — venue matches ANY active tag);
   clear empty state when nothing matches.
4. Zero active chips ⇒ ALL venues show (no-op default); an empty-`tags` venue is only ever hidden
   when a chip is active and it matches none.
5. Chip copy is corrected and casing-consistent across sv/en (labels come from tag values,
   localized at the data layer; never a truncated "Takt").
6. Additive/idempotent/reversible contract migration + seed (DB work — verified live, not a
   jsdom test; covered by dev Task 2 smoke check, not by these scaffolds).

---

## Generation Mode

**AI generation** (browser recording skipped). Rationale: acceptance signals are deterministic
RTL/jsdom assertions (rendered chips, context state, filtered list membership, DTO shape, copy
casing) — no live-browser interaction needed. Consistent with the Epic 9 host constraint that the
automated Playwright visual gate errors on this Windows host (retro-notes 9-2..9-6); the visual
gate is handled separately by dev Task 9 via the manual affordance.

---

## Test Strategy (levels + priorities)

| AC | Signal | Level | Priority | Scaffold |
|----|--------|-------|----------|----------|
| 1 | DTO carries real `tags` from DB adapter; null→[] graceful-empty | Unit (store, adapter-mocked) | P0 | `VenueTagsData.atdd.test.tsx` (A) |
| 1/6 | `VENUE_SELECT_COLUMNS` includes `tags` | Unit | P1 | `VenueTagsData.atdd.test.tsx` (A) |
| 2 | Chips = venue tag union, de-duped, first-seen order; enabled | Component | P0 | `DesktopNavBarTagChips.atdd.test.tsx` |
| 3 | Shared context: sibling-subtree write→read; toggle/clear/isActive; no-op default | Component | P0 | `TagFilterContext.atdd.test.tsx` |
| 3 | Chip toggle → aria-pressed + "on" pill classes | Component | P0 | `DesktopNavBarTagChips.atdd.test.tsx` |
| 3/4 | 0 active ⇒ all (incl. empty-tags venue); ≥1 active ⇒ OR/union filter; no match ⇒ [] | Unit (filter helper) | P0 | `VenueTagsData.atdd.test.tsx` (B) |
| 2 | `collectTags` union first-seen order | Unit | P1 | `VenueTagsData.atdd.test.tsx` (B) |
| 5 | `localizeTag` sv passthrough / en display map; casing consistent; no "Takt" | Unit | P1 | `VenueTagsData.atdd.test.tsx` (B) |

**Deliberately deferred to dev (not scaffolded here):**
- The end-to-end MapView list+pin cross-filter wiring (AC3 render) — story Task 6 owns it; the
  pure filter semantics are pinned by the `filterVenuesByTags` unit specs so the MapView wiring
  becomes a thin call over an already-proven helper.
- The live DB additive migration + seed smoke check (AC6) — a live-SQL/row-count verification, not
  a jsdom test (dev Task 2, recorded in the Debug Log).
- Mobile chip UI — Open Question 1: no design reference exists; scope is desktop-chip-UI + shared
  behaviour only.

---

## Failing Tests Created (RED Phase)

All three files are `describe.skip` and load not-yet-existing modules via a **runtime dynamic
specifier inside the skipped bodies**, so `tsc --noEmit`, `eslint`, and Vitest import-analysis all
stay green until the dev implements + un-skips. Verified: **3 files, 18 tests, all skipped;
tsc exit 0; eslint exit 0.**

### Component / Context Tests (18 tests)

**File:** `nextjs-app/test/components/TagFilterContext.atdd.test.tsx` (4 tests)
- RED — `@/lib/contexts/TagFilterContext` (`TagFilterProvider` / `useTagFilter`) does not exist.
- Verifies: no-op default value (renders without provider, no throw); `toggleTag` add→remove +
  `isActive`; `clearTags` removes all; **shared context** — a write in one sibling subtree is read
  by another sibling subtree (the AC3 nav↔venues join crux; local state would fail this).

**File:** `nextjs-app/test/components/VenueTagsData.atdd.test.tsx` (11 tests)
- RED — `tags` not yet on `VenueDataDto` / store mapping; `@/lib/utils/venue-tags` does not exist.
- Part A (DTO from DB, adapter-mocked at `@/lib/supabase/server`): `VENUE_SELECT_COLUMNS`
  includes `tags`; `getVenues()` surfaces the real tag array from the row; a null tags column →
  `[]` graceful-empty; every venue exposes `tags` as an array.
- Part B (filter/union util): `collectTags` union first-seen order; 0 active → pass-through all
  (incl. empty-tags venue); 1 active → membership filter (empty-tags venue hidden); multi-select
  OR/union; no match → `[]`; `localizeTag` sv passthrough / en display map / no truncated "Takt".

**File:** `nextjs-app/test/components/DesktopNavBarTagChips.atdd.test.tsx` (3 tests)
- RED — DesktopNavBar does not yet consume `useVenueSearch` tags nor `useTagFilter`;
  `TagFilterProvider` reached via runtime specifier.
- Verifies: chips render from the venue tag union (de-duped, first-seen order; a tag no venue
  carries never renders); chips are ENABLED (no `disabled` / `cursor-not-allowed`); clicking a
  chip sets `aria-pressed=true` + active pill classes (`bg-text-primary text-white`), re-click
  clears — the flip of the `DesktopNavBar.test.tsx:213` disabled-chip marker 9.6 left for 9.7.

---

## Mock Requirements

| Boundary | Mock | Why |
|----------|------|-----|
| `@/lib/supabase/server` → `getSupabaseServiceRole()` | Stub `.from().select()` → `{ data: rows, error: null }` | Mock the ADAPTER, not deep internals (vitest dynamic-import-bypass lesson). Drives `getVenues()` on the Supabase path with `SUNNYSEAT_VENUE_STORE=supabase`. |
| `@/hooks/queries/useVenueSearch` | Returns `{ data: { venues: [...with tags] } }` | Feeds the DesktopNavBar chip-union derivation deterministically (no network). |
| `@/hooks/useGeolocation`, `SettingsContext`, `MapSelectionContext`, `MapInstanceContext`, `next-intl/navigation` | Passthrough/no-op stubs | Isolate DesktopNavBar to the chip behaviour (mirrors existing `DesktopNavBar.test.tsx`). |

---

## Implementation Checklist (RED → GREEN)

- [ ] **Task 2** — additive `tags text[]` column on the venue contract (`8-2-venues-store-contract.sql`
      + `lib/supabase/types.ts`) + seed 7 rows + APPLY live; run Section-6 smoke check.
- [ ] **Task 3** — `VenueDataDto.tags: string[]`; `VENUE_SELECT_COLUMNS += 'tags'`; `coerceTags` in
      `fromVenueRow` (null/garbage→`[]`, trim, de-dupe); `toVenueData` unconditional `tags`;
      fixture 7 rows. → **un-skip `VenueTagsData.atdd.test.tsx` Part A.**
- [ ] **Task 5 (util)** — create `lib/utils/venue-tags.ts`: `collectTags`, `filterVenuesByTags`
      (OR/union), `localizeTag` (sv passthrough + en display map). → **un-skip Part B + AC5 block.**
- [ ] **Task 4** — create `lib/contexts/TagFilterContext.tsx` (no-op default, `useTagFilter` API);
      mount `TagFilterProvider` in `AppContextProviders`. → **un-skip `TagFilterContext.atdd.test.tsx`.**
- [ ] **Task 5 (chips)** — data-drive + enable + toggle the DesktopNavBar chip row via
      `useVenueSearch` union + `useTagFilter`; add `aria-pressed` + active pill classes. → **un-skip
      `DesktopNavBarTagChips.atdd.test.tsx`; UPDATE `DesktopNavBar.test.tsx:213` disabled→enabled.**
- [ ] **Task 6** — MapView reads `useTagFilter`, filters `rawVenues` once → `listVenues` + pins
      (`filterVenuesByTags`). Add a MapView/list-filter test over the wiring (helper already proven).
- [ ] After each: convert the runtime dynamic specifier back to a normal top-level import and drop
      the loose `as unknown as` casts.

---

## Running Tests

```bash
cd nextjs-app
# The three new scaffolds (currently all skipped)
npx vitest run test/components/TagFilterContext.atdd.test.tsx test/components/VenueTagsData.atdd.test.tsx test/components/DesktopNavBarTagChips.atdd.test.tsx
# Full gate
npx tsc --noEmit && npx eslint . --quiet && npx vitest run
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete)
- 18 acceptance scaffolds authored, `describe.skip`, loading not-yet-existing modules via runtime
  dynamic specifiers so the gate stays green.
- Verified skipped + gate-clean (vitest 3 files/18 skipped, tsc 0, eslint 0).

### GREEN Phase (DEV — next)
Un-skip each block as its target module lands (order above), convert the dynamic specifier to a
normal import, make the assertions pass with minimal implementation, keep the gate green.

---

## Notes / Risks / Assumptions

- **⚠ Spec discrepancy flagged (multi-chip semantics).** The delegating prompt described
  multi-chip filtering as "intersects (AND)", but story AC3 and the reference `TopBar.jsx` specify
  **OR/union** ("a venue matches if it has ANY active tag", `.some()`). The scaffolds implement the
  **OR/union** semantic to match the authoritative story spec + reference, so the red tests will
  match the intended implementation. If the maintainer genuinely wants AND (a venue must carry ALL
  active tags), the `multi-select` expectation in `VenueTagsData.atdd.test.tsx` Part B must flip —
  surfaced as an open question, non-blocking for scaffold generation.
- Adapter-boundary mock (`@/lib/supabase/server`) chosen per the vitest dynamic-import-bypass
  memory: the store `await import()`s the server module, so mocking there (not deep internals)
  reliably intercepts the read path.
- Test data uses the deterministic seed arrays from the story's DATA SOURCING table (Innergård,
  Hund ok, Wifi, Bakverk, …) so the scaffolds double as documentation of the expected seed.
- File naming `*.atdd.test.tsx` under `test/components/` matches the vitest `include` glob and the
  existing 9.5 ATDD scaffold convention.

---

## Next Recommended Workflow

`bmad-dev-story` on `9-7-tag-filtering-real-data-working-chips.md` — implement Tasks 2-6, un-skip
each scaffold block as its module lands, then the standard gate + the manual visual affordance
(Task 9).

---

**Generated by BMad TEA Agent (auto-bmad delegate)** — 2026-07-01
