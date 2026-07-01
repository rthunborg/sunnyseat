# Story 9.7: Tag Filtering — Real Data + Working Chips

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to tap a tag (Innergård, Hund ok, Wifi…) and filter venues to those that match,
so that I can quickly narrow to places that fit what I want.

## Acceptance Criteria

_(Verbatim intent from epics.md §"Story 9.7: Tag Filtering (Real Data + Working Chips)". This is **root-cause #2** of the Epic 9 triage — "fabricated venue metadata": the filter chips today are decorative and **disabled**, and the "tags" they represent come from a per-slug placeholder table (`lib/utils/venue-visual-metadata.ts`) with **no truthful source**. This story adds a real `tags` source on the venue contract and wires the chips to actually filter. The maintainer data-prerequisite note in epics.md — verified against the live DB, project ref `hhnbxrhfhlzxgllxukzj` — is authoritative and is reproduced in Dev Notes §"DATA SOURCING".)_

1. **Given** venue "tags" today are decorative per-slug placeholders with no truthful source (`venue-visual-metadata.ts`) and the live `public.venues` table has **no `tags` column**, **When** a real tag source is added to the Supabase `venues` contract (an **additive** `tags text[] not null default '{}'` column) and surfaced through the venue DTO (`VenueDataDto.tags`), **Then** each venue exposes its real tag set from the store (not from `venue-visual-metadata.ts`), and a venue with no tags returns `tags: []`.

2. **Given** the chip row is currently a hardcoded list of 8 disabled buttons in `DesktopNavBar.tsx`, **When** the chips become data-driven, **Then** the chip row is derived from the **union of the loaded venues' tags** (first-seen order, matching the reference `TopBar.jsx` `allTags` approach) rather than a hardcoded `filterChips.*` list, and the chips are **enabled** (no `disabled` / `cursor-not-allowed`).

3. **Given** a user taps one or more tag chips, **When** the filter state changes (shared via a new **context/lifted state** consumable by BOTH the nav [chip row] and the venue surfaces [desktop list, mobile list, map pins]), **Then** active chips render in the reference **"on" pill style** (dark `#1b1b1e` = `text-primary` background, white label), and the venue **list AND map pins** are filtered to venues whose tags **intersect** the active selection (multi-select = OR/union across selected chips: a venue matches if it has ANY active tag), with a **clear empty state** shown when nothing matches.

4. **Given** no chips are active (the default), **When** the surfaces render, **Then** ALL venues show (the filter is a no-op with zero active chips) — a venue with an empty `tags` array is only ever hidden when at least one chip is active and the venue matches none of them, and the "show all when nothing selected" default is never bypassed.

5. **Given** the chip labels, **When** they render, **Then** they use corrected copy (e.g. "Takterrass" not a truncated "Takt") and consistent casing across `sv`/`en` — chip text comes from the venue tag values themselves (which are localized at the data layer per §"DATA SOURCING · Localization"), so a chip never shows a truncated or wrong-cased label.

6. **Given** the tags column is added to the live store, **When** the migration + seed run, **Then** the change is **additive-only, idempotent, and reversible**: the `8-2-venues-store-contract.sql` contract file and `lib/supabase/types.ts` are updated to include `tags`, `VENUE_SELECT_COLUMNS` includes `tags`, the 7 test/fixture venues are seeded with deterministic representative tags (per §"DATA SOURCING"), and re-running the migration/seed produces the same result with no data loss (only 7 test venues exist — no production data).

## Tasks / Subtasks

- [x] **Task 1 — Read the coordination + data-sourcing context FIRST (no code)**
  - [x] Read Dev Notes §"DATA SOURCING" in full — it resolves the "how do we get truthful tags without fabricating them" question that defines this story. Do **not** invent new tag values.
  - [x] Read §"Why this exists (root cause #2)", §"Where the chips live vs where the venues live (the split)", and §"Constraints carried from Epic 9 retro-notes (binding)".
  - [x] Confirm against HEAD: the 8 chips + the `<nav aria-label={t('nav.filter')}>` wrapper are still in `DesktopNavBar.tsx:49-72` (Story 9.6 left them for this story); `DesktopNavBar.test.tsx:213-218` still asserts the `'Innergård'` chip is `disabled` (this test MUST be updated by this story).

- [x] **Task 2 — Additive `tags` column on the venue contract (migration + types + select) (AC: #1, #6)**
  - [x] Add to `_bmad-output/implementation-artifacts/8-2-venues-store-contract.sql` (the contract handoff `.sql`, manual-run-only) an **idempotent additive** column in Section 2, following the existing `alter table … add column if not exists` pattern used for `seating_area` / `seating_elevation_m` / `ground_elevation_m`:
    ```sql
    alter table public.venues add column if not exists tags text[] not null default '{}';
    comment on column public.venues.tags is
      'User-facing amenity/attribute tags for chip filtering (Story 9.7). '
      'text[] (empty array = no tags). Localized at the data layer per venue-data-load.md. '
      'Serialized into the client VenueDataDto (unlike the server-only seating_* columns).';
    ```
    Use `text[] not null default '{}'` (NOT `jsonb`) — it is the simplest array-intersection-friendly shape, matches the reference `v.tags` string-array, and Supabase maps it to `string[]` in `types.ts`. (`jsonb` is the fallback only if a reviewer objects; document the choice either way.)
  - [x] Update the **seed** (Section 4): add `tags` to the `insert into public.venues (…)` column list and give each of the 7 rows its deterministic tag array from §"DATA SOURCING · Seed values" below. Add `tags = excluded.tags` to the `on conflict (id) do update set` block so a re-seed is idempotent.
  - [x] Update Section 6 smoke checks: add a `select id, slug, tags from public.venues order by id;` expectation and note the 7 expected arrays.
  - [x] Update Section 5 rollback notes: `alter table public.venues drop column if exists tags;` is the additive rollback (the column drop is reversible; the table-drop rollback already covers it).
  - [x] Update `nextjs-app/lib/supabase/types.ts` `venues` table `Row` / `Insert` / `Update` to add `tags: string[]` (Row: `string[]`; Insert/Update: `tags?: string[]`). This file is the schema source-of-truth; the note at its top says to regenerate via the Supabase types generator after a schema change — a hand-edit that matches the generator output is acceptable here (keep the shape the generator would produce: `tags: string[]` on Row, `tags?: string[]` on Insert/Update).
  - [x] **APPLY the migration + seed to the LIVE `public.venues` store.** Applied via the IPv4 session-pooler psql path (Docker `postgis/postgis:15-3.5`, `SUPABASE_DB_POOLER_URL` from repo-root `.env.local`) in a single transaction: `alter table … add column if not exists tags text[] not null default '{}'` + 7 idempotent `update … set tags = …`. Verified: 7 rows, all tag arrays match the seed, no data loss. (Supabase MCP tools were not exposed as callable functions in this session, so the documented pooler-psql path was used per `reference_supabase_db_import_connection`.)

- [x] **Task 3 — Surface `tags` through the store adapter + DTO (AC: #1)**
  - [x] `nextjs-app/lib/types/api.ts` — added `tags: string[];` to `VenueDataDto` (required, defaults to `[]` at the mapping boundary so it is never `undefined`). Public, client-safe field, serialized into the DTO.
  - [x] `nextjs-app/lib/services/venue-store.ts`: `'tags'` in `VENUE_SELECT_COLUMNS`; `tags?: string[] | null` on `VenueRow`; `tags: coerceTags(row.tags)` in `fromVenueRow` (new `coerceTags` helper — keeps non-empty trimmed strings, de-dupes, non-array/null/garbage → `[]`, never crashes); `toVenueData` sets `tags: venue.tags ?? []` unconditionally.
  - [x] `nextjs-app/lib/services/venues-fixture.ts` — added the same `tags` arrays to all 7 `VENUE_FIXTURE` venues (byte-consistent with the live seed).
  - [x] Confirmed `normalizeVenueForResponse` passes `tags` through untouched (it spreads the venue; no allow-list). Route sort/distance logic unchanged — tag filtering is client-side.

- [x] **Task 4 — New shared tag-filter state (context) consumable by nav + venue surfaces (AC: #3, #4)**
  - [x] Created `nextjs-app/lib/contexts/TagFilterContext.tsx` (`'use client'` provider + `useTagFilter()` hook): `activeTags: ReadonlySet<string>`, API `{ activeTags, toggleTag(tag), clearTags(), isActive(tag) }`, no-op default (renders without a provider, mirrors `SettingsContext`).
  - [x] Mounted `TagFilterProvider` in `AppContextProviders.tsx` wrapping the whole tree just inside `GeolocationProvider` — so both `DesktopNavBar` (ResponsiveLayout sibling of children) and `MapView` (children) resolve the SAME instance. Order-independent sibling; provider nesting order preserved.
  - [x] Client-only ephemeral state; no URL/localStorage plumbing (avoids the Story 9.0 planner-gate surface).

- [x] **Task 5 — Data-drive + enable the chip row in `DesktopNavBar` (AC: #2, #3, #5)**
  - [x] Replaced the hardcoded 8-chip `filterChips.*` list with a data-driven row: `allTags = collectTags(venueQuery.data?.venues ?? [])` (union, first-seen order). The nav reuses the SAME `useVenueSearch` key MapView issues (no `q`, same coords/radius/planner) → TanStack de-dupes, zero new requests. Guard: the `<nav>` renders nothing until ≥1 tag is loaded (no flash).
  - [x] Each chip is an enabled `<button>` (idle classes kept; active = `bg-text-primary text-white border-text-primary`), toggled via `useTagFilter().toggleTag(tag)`, `aria-pressed={isActive(tag)}`, `transition-colors duration-fast`. `disabled`/`cursor-not-allowed` removed.
  - [x] **Copy (AC5):** chip labels come from the tag values (`localizeTag(tag, locale)` — canonical `sv`, `sv→en` display map in `lib/utils/venue-tags.ts`). Removed the now-unreferenced `nav.filterChips.*` keys from BOTH `sv`/`en` `common.json` (parity-guarded, kept green). `nav.filter` STAYS. No truncated "Takt" — seed uses full words; "Takterrass" only appears if a venue carries it (none do → correct data-driven behaviour).

- [x] **Task 6 — Apply the filter to the venue surfaces in `MapView` (AC: #3, #4)**
  - [x] Added `useTagFilter()` + a single `tagFilteredVenues = filterVenuesByTags(rawVenues, activeTags)` memo (0 active → pass-through; ≥1 → OR/union `.some()`). Rewired BOTH `listVenues` and the pin base `venueDtosForMap` off it → desktop/mobile lists AND map pins filter identically from one source. Zero new network requests. Favourites-mode rows + the selected-preview venue are still merged into pins so a selected/favourited pin doesn't vanish; the **favourites NETWORK path is left unfiltered** (scope decision — filtering is scoped to the Närmast list + pins, avoiding double-filtering).
  - [x] **Empty state (AC3):** verified `VenueList` renders `venue.list.empty` ("Inga platser hittades…") when the filtered list is empty, NOT gated on `isLoading` (the `isLoading` branch is `isFetching && length===0`; a 0-match filter with data present is not loading). Reused the existing copy (no tag-specific message).
  - [x] No change to `useVenueSearch` gating/keys/`staleTime` or the Story 9.4 planner deferral — the tag filter is a pure client `.filter()` over fetched data.

- [x] **Task 7 — Mobile chip surface decision (AC: #3 — scope) [OPEN QUESTION 1]**
  - [x] **Default taken:** wired the shared context + filter so the BEHAVIOUR works on all surfaces (mobile + desktop lists and pins filter), and added the chip UI on **desktop only** (`DesktopNavBar`, the only reference with a chip row — `src-desktop/TopBar.jsx`). Did NOT invent a mobile chip row (no reference → visual-gate/design-drift risk). Noted in Completion Notes.

- [x] **Task 8 — Tests + regression (AC: #1–#6, standard gate)**
  - [x] `DesktopNavBar.test.tsx`: flipped the disabled-chip marker test → 3 tests (chips render from the venue tag union, de-duped/first-seen; chips ENABLED, no `cursor-not-allowed`, `aria-pressed=false`; click toggles `aria-pressed=true` + active pill classes, re-click clears). Wrapped the render in a real `TagFilterProvider`; the search-selection test uses a single-venue response for determinism.
  - [x] Context + util unit coverage delivered via the un-skipped ATDD files: `TagFilterContext.atdd.test.tsx` (no-op default, toggle, clear, isActive, shared-sibling-subtree read/write) and `VenueTagsData.atdd.test.tsx` (`collectTags` union, `filterVenuesByTags` 0/1/multi/no-match, `localizeTag` sv/en casing) — no separate `TagFilterContext.test.tsx` needed.
  - [x] `venue-store.test.ts`: column list now includes `tags` (23 cols) + `toContain('tags')`; new tests: `fromVenueRow` maps a tags array; null/non-array/garbage → `[]`; drops non-string/empty/dup + trims; absent column → `[]`; `toVenueData` surfaces `tags`.
  - [x] `venues-route.test.ts`: new test asserting every DTO carries `tags` (array), the gate venue carries its seeded tags, and the route does NOT tag-filter server-side (`?tags=` no-ops).
  - [x] MapView list-filter: new `MapView.test.tsx` describe block (mocked `useTagFilter`): 0 active → all in list + pins; 1 active → only matching in BOTH; multi = OR/union; no match → empty `venue.list.empty` copy + zero pins.
  - [x] `messages-parity.test.ts` green — `nav.filterChips.*` removed from BOTH locales in the same change.
  - [x] No `shadow-caster-sql-contract`/8-2 contract-columns test asserts the venue column set beyond `venue-store.test.ts` (grepped) — updated there.
  - [x] Also un-skipped the 18 ATDD tests (`describe.skip` → `describe` in the 3 files), and added a `scrollIntoView` no-op polyfill to `test/setup/setup.ts` (jsdom gap cmdk hits when the combobox has >1 option). Gate: `tsc` 0 · `eslint` 0 · `vitest` 101 files / 861 tests all green (before: 98+3skip files / 832+18skip; +3 active ATDD files, +11 new tests, 0 skipped).

- [x] **Task 9 — Design gate: visual validation of the active-filter state (frontend gate)**
  - [x] Visual gate performed via the documented manual affordance (see Completion Notes §"Visual gate"). `VISUAL_VALIDATE_PROVIDER=none ALLOW_MANUAL_VISUAL_VALIDATION=1`. The active/idle chip styling maps to the reference `TopBar.jsx` "on" pill (`#1b1b1e`/text-primary bg + white label) and idle pill (white + divider border + body text); reference PNG rebaseline (enabled chips) routed to maintainer — dev did NOT edit reference PNGs.
  - [x] Status → `review`.

## Dev Notes

### Why this exists (root cause #2 of the Epic 9 triage — "fabricated venue metadata")

Per the Epic 9 party-mode live-app triage, root-cause #2 is **fabricated venue metadata**: `lib/utils/venue-visual-metadata.ts` is a hardcoded `BY_SLUG` table of per-venue `type`/`rating`/`reviewCount`/`tags`/`exposure`/`seats`/`price` strings with **no truthful source** — invented numbers and attributes rendered as if real. The filter chips in `DesktopNavBar` are the visible face of this: 8 hardcoded, **disabled** buttons (`nav.filterChips.*`) that represent "tags" no venue actually carries in the store. This story removes the tags portion of that fabrication by giving venues a **real, additive `tags` source on the contract** and wiring the chips to filter on it. (The rest of `venue-visual-metadata.ts` — rating/reviewCount/exposure/seats/price — is out of scope here; this story touches ONLY the `tags` path. Reviews-derived `rating`/`reviewCount` are already partly real via `reviewSummary`; the other fabricated fields are a separate concern, not reopened.)

Epic-9 retro (`_bmad-output/auto-bmad/retro-notes/epic-9.md`) confirms two binding facts for this story:
- **9.1 §Phase-3:** fabricated per-slug metadata + live-Supabase-update pattern — live venue data is edited via **idempotent live SQL** (the app is on the real data path), not just fixtures. This story's tag seed follows that pattern (Task 2's live-apply subtask).
- **9.6 §Phase-5:** "the 8 filter chips remain the decorative tag placeholders that Story 9.7 (Tag Filtering) will wire up" — 9.6 deliberately left the chips + `<nav>` wrapper untouched and KEPT the `'Innergård'`-disabled test as a marker for THIS story. That test is now this story's to flip.

### DATA SOURCING — the crux of this story (read before Task 2)

The app is LIVE on the real data path (`SUNNYSEAT_VENUE_STORE=supabase` in Production, cutover 2026-06-29). The maintainer note in epics.md (verified against the live DB, project ref `hhnbxrhfhlzxgllxukzj`) is authoritative:

> The live `public.venues` table currently has **no `tags` column** (24 columns, enumerated in epics.md — and no `orientation` column either). This story must **add the column via an additive migration** (`tags text[] not null default '{}'`, or `jsonb` — match the contract / `VENUE_SELECT_COLUMNS` convention) and update the `.sql` contract file + `lib/supabase/types.ts`. The table holds **only the 7 test/fixture venues** (Kafé Magasinet, Bryggerietsoltak, Solplats Magasinsgatan, Café Halvvägs, Brygghuset Lerum, Skuggans Hus, Bistro Bakgården) — **no production data** — so the migration is safe with **no data-loss risk**. Maintainer decision: **seed those 7 test venues with representative tags** so the chips have real data to filter on. The column add + test-data seed are **in-scope dev work for this story** — they do **not** require a separate maintainer `needs-human` step.

**This resolves the fabrication risk explicitly.** The tag VALUES are sourced **deterministically**, not judged/invented per venue:
- The 7 live rows are `id` `1`–`7`, byte-identical to `lib/services/venues-fixture.ts` (`VENUE_FIXTURE`), which mirrors the Claude Design reference `src-desktop/data.jsx` / `src-free/data.jsx`.
- The reference `data.jsx` and the current `venue-visual-metadata.ts` already carry **the exact tag arrays for these same slugs** (both localized `sv`/`en`). Those are the deterministic source-of-truth tag values. Seeding the DB with them is NOT fabrication — it is **migrating the existing (reference-defined) tag values from an ad-hoc placeholder table into the real contract**, which is precisely what "replacing the `venue-visual-metadata.ts` placeholders for tags" means in AC1.
- Because the values come from an existing documented source (the reference `data.jsx` / the placeholder table), the dev can populate them **autonomously** — there is **no needs-human boundary** for the 7 test venues. A `needs-human` stop would only apply if this story were assigning tags to **real production venues with no reference values** — which does NOT exist here (there is no production venue data). Do NOT fabricate tags for venues outside the 7; there are none.

#### Seed values (deterministic — use these exact arrays for `id` 1–7)

Sourced from `nextjs-app/lib/utils/venue-visual-metadata.ts` `BY_SLUG` (the placeholder being replaced) — which matches the reference `data.jsx`. Store the **Swedish** array on the column (the app is Swedish-default; localization handled per below):

| id | slug | `tags` (sv) |
|----|------|-------------|
| 1 | `test-venue-sunny` | `{Innergård, Hund ok, Wifi, Bakverk}` |
| 2 | `bryggeriet-soltak` | `{Morgonsol, Take-away, Surdeg}` |
| 3 | `solplats-magasinsgatan` | `{Kanal, Skaldjur}` |
| 4 | `cafe-halvvags` | `{Parasoller, Specialkaffe}` |
| 5 | `brygghuset-lerum` | `{Innergård, Hund ok}` |
| 6 | `skuggans-hus` | `{Svalt, Lunch}` |
| 7 | `bistro-bakgarden` | `{Bakgård, Kväll}` |

(These reproduce the placeholder's `tags` exactly. Note `Takterrass`/`Rooftop` is a chip label in the hardcoded `filterChips.*` list but is NOT one of the 7 venues' actual tags — after this story the chip row is the **union of real tags**, so "Takterrass" only appears if a seeded venue has it; none do, so it won't render, which is correct data-driven behaviour and resolves the "chips represent tags no venue has" fabrication. The AC5 "Takt not Takterrass" copy point is defensive — the current i18n already has the full "Takterrass"; the seed uses full words, so no truncation exists.)

#### Localization

Tags are user-facing text rendered directly as chip labels, so they must be locale-correct (`sv`/`en`). Two acceptable approaches — pick and document:
- **(A) Store the `sv` array on the column** (as above) and provide a small deterministic `sv→en` display map for the known tag set in a `lib/utils/venue-tags.ts` (e.g. `Innergård→Courtyard`, `Hund ok→Dogs ok`, `Wifi→Wi-Fi`, `Bakverk→Pastries`, `Morgonsol→Morning sun`, `Take-away→Take-away`, `Surdeg→Sourdough`, `Kanal→Canal`, `Skaldjur→Seafood`, `Parasoller→Parasols`, `Specialkaffe→Specialty coffee`, `Svalt→Cool shade`, `Lunch→Lunch`, `Bakgård→Backyard`, `Kväll→Evening`) — the `en` values are already in `venue-visual-metadata.ts`. Filter MATCHING keys off the canonical (`sv`) tag; only the DISPLAY is localized. **This keeps the DB single-source (no per-locale column) and is the recommended default** — the `en` map is deterministic from the existing placeholder.
- (B) A `jsonb` `{sv:[…], en:[…]}` column. More faithful but heavier; only if a reviewer prefers it. `text[]` + display map (A) is simpler and matches the reference's single-array shape.
Either way, tag matching uses the canonical stored value; localization affects only the rendered chip text. Do NOT let the two locales' venues match differently.

### Where the chips live vs where the venues live (the split — the AC3 crux)

The chip UI and the venue surfaces are in **separate React subtrees**, joined only high up. This is why AC3 explicitly calls for shared context:
- `DesktopNavBar` (holds the chip row, `DesktopNavBar.tsx:49-72`) is rendered by `ResponsiveLayout` (`ResponsiveLayout.tsx:19`), a **sibling of `{children}`**, inside `AppContextProviders` (`app/[locale]/layout.tsx:29-30`).
- `MapView` (holds `VenuePinLayer`, the desktop `<aside>` list, the mobile bottom-sheet list) is `{children}` — loaded via `next/dynamic` (`MapViewDynamic`), but React **context still crosses the dynamic boundary** (it flows through the tree, not through imports), so a provider in `AppContextProviders` reaches both.
- Therefore: mount `TagFilterProvider` in `AppContextProviders` (Task 4). The chip row writes (`toggleTag`); `MapView` reads (`activeTags`) and filters. Do NOT try to lift state into `MapView` and pass it up to the nav — they are not in a parent/child relationship.

The venue-surface filter seams in `MapView.tsx` (apply the tag filter at the source, feed both):
- Pins: `venueDtosForMap` (line ~394-406) → `venues` memo (line ~408-416) → `<VenuePinLayer venues={venues} />` (line ~831).
- Desktop + mobile lists: `listVenues` memo (line ~658-666) → `<VenueList venues={listVenues} …>` (mobile ~893, desktop ~937).
- Both derive from `rawVenues = venueQuery.data?.venues` (line ~308). Apply `tagFilter(rawVenues, activeTags)` once and derive both from the filtered array (or filter inside each memo with `activeTags` in the deps). Filtering `rawVenues` once is cleanest.

### Reference: the chip row pattern (`src-desktop/TopBar.jsx`)

The reference (`nextjs-app/docs/design/references/claude-design/project/src-desktop/TopBar.jsx`) is the canonical chip UI:
- `allTags` = union of `v.tags` across `VENUES`, first-seen order (`:5-12`) → **data-driven, not hardcoded** (AC2).
- `activeTags` = a `Set`; `toggleTag` add/removes (`:14-22`) → the exact context API to build (AC3).
- Idle pill: `#fff` bg, `#4d4635` text, `1px #e9e1cf` border. Active ("on") pill: `#1b1b1e` bg, `#fff` text, `1px #1b1b1e` border, slightly stronger shadow (`:140-164`). Map to tokens: idle = current `border-divider bg-white text-text-body` (KEEP); active = `bg-text-primary text-white border-text-primary` (`--color-text-primary: #1b1b1e`, confirmed in `globals.css:38`). `transition: background/color/border 0.12s` → `transition-colors duration-fast`.
- **NOTE the reference does NOT actually cross-filter its Sidebar/Pins** — in `src-desktop/App.jsx` the list/pins get raw `VENUES`, ignoring `activeTags`. So the reference is the pattern for the **chip row itself**; the **cross-surface filtering (list + pins) is net-new** wiring this story adds. Don't assume the reference proves the filtering end-to-end.
- The reference has left/right scroll arrows (`TagArrow`) for chip overflow. Story 9.6 already REMOVED the two dead pager chevrons that flanked our chip row (they were inert). Do NOT re-add chevrons; the current `<nav>` uses `overflow-hidden` — either keep simple overflow-hidden (chips clip) or use `overflow-x-auto` with the reference's edge-mask for graceful scroll. Overflow behaviour is a polish detail; the union of the 7 venues' tags is small (~13 unique), so it likely fits — default to the existing `overflow-hidden` and only add scroll if the row overflows at common desktop widths.

### DATA / MIGRATION discipline (binding — AC6)

- **Additive only.** `add column if not exists tags text[] not null default '{}'`. Never drop/rename existing columns. Existing rows get `'{}'` by the default, then the seed overwrites the 7 with real arrays.
- **Idempotent + reversible.** `add column if not exists` + `tags = excluded.tags` in the `on conflict` block. Rollback = `drop column if exists tags` (documented in Section 5).
- **Graceful empty (AC1/AC4).** A venue with no tags → `tags: []` in the DTO → never filtered out unless a chip is active and it matches none. `coerceTags` returns `[]` for null/garbage. The default (0 active chips) shows ALL venues.
- **Contract sync.** Update all three in lockstep: `8-2-venues-store-contract.sql` (schema + seed + smoke + rollback), `lib/supabase/types.ts` (`venues` Row/Insert/Update), `lib/services/venue-store.ts` (`VENUE_SELECT_COLUMNS` + `VenueRow` + `fromVenueRow` + `toVenueData`). Missing any one drifts the contract (8.2 review lesson: the `.sql`, `types.ts`, and `VENUE_SELECT_COLUMNS` are one contract).
- The existing server-only columns (`seating_area`/`seating_elevation_m`/`ground_elevation_m`) are NEVER in the DTO. `tags` is the OPPOSITE — it IS a client field. Do not copy the server-only omission pattern for `tags`.

### Constraints carried from Epic 9 retro-notes (binding)

- **Story 9.4 fetch hygiene is untouched.** Tag filtering is a pure client `.filter()` over already-fetched `rawVenues` — it must issue **zero** new network requests, must not change `useVenueSearch` gating/keys/`staleTime`, and must not touch the Story 9.4 `useDeferredValue`/`keepPreviousData` planner deferral. If `DesktopNavBar` needs the venue list for `allTags`, it reads the SAME `useVenueSearch` (already ungated typed-search per 9.4 retro — the nav's `VenueSearchShell` call site) — do not add a second/duplicate fetch; reuse the query (TanStack de-dupes identical keys, so a second `useVenueSearch` with the same args is cache-shared, not a new request — verify the key matches).
- **Story 9.0 planner-forcing gate.** Do NOT put tag state in the URL/searchParams — the `?_time=`/`?_date=`/`?_state=` params are dev-only and prod-gated; a `?tags=` param would be new surface area and risks the DCE/prod-gate assumptions. Keep tag state in-memory context.
- **Story 9.5/9.6 chrome is frozen.** Do NOT touch the locate/settings buttons, the `useGeolocation` contract, or `VenueSearchShell`'s query firing. This story touches the chip row + a new context + `MapView`'s venue-derivation memos + the store/DTO/contract only.
- **`useGeolocation` status stays 4-valued** (`idle`/`pending`/`success`/`fallback`) — irrelevant to this story, just don't drift it.

### Removal/change stories invert the visual gate (from the 9.1/9.6 retro)

This story ENABLES previously-disabled chips and adds an "on" pill state — a deliberate visual change. If the reference `map-primary`/desktop-nav PNG still depicts the disabled/decorative chips, the LLM visual gate may FAIL by design → capture the enabled/active-filter chrome for the maintainer, log it, route the rebaseline to maintainer sign-off. Do NOT force a pass; do NOT edit reference PNGs (dev is forbidden from self-blessing baselines).

### Visual gate on this host (HOST TOOLING BUG — every Epic 9 frontend story)

`.claude/scripts/visual-validate.sh` screenshots via a `mktemp /tmp/impl-XXXXXX.png` path the Windows-native Playwright binary CANNOT write, so the AUTOMATED gate always errors "Could not screenshot dev server" on this host (retro-notes 9-2, re-confirmed 9-4/9-5/9-6). Use the manual affordance: `VISUAL_VALIDATE_PROVIDER=none ALLOW_MANUAL_VISUAL_VALIDATION=1`, reproduce the claude-sonnet-4-6 comparison byte-identically (same reviewer + verbatim prompt + on-disk reference PNG vs the corrected dev render captured to a Windows-safe path), record rationale in Completion Notes. Leave the gate script UNMODIFIED. Beware the **stale Turbopack CSS cache trap**: a running `next dev` can keep serving old CSS after a globals edit — a full `.next` wipe + restart may be needed before capture; verify the served chunk first.

### Deferred-work items folded in (only overlapping — the tag/attribute data-source lineage)

- `deferred-work.md` §"Future visual/data contracts after Story 2.5" records: *"(One entry — venue attribute/tag data source — carried into Story 3.2 — Sun Accuracy Feedback on 2026-06-07 (Task 7). Removed by SM per the deferred-work convention.)"* — the "venue attribute/tag data source" question was noted long ago and partially addressed; this story is where the **tag** portion gets a real contract-backed source. No live deferred entry currently targets 9.7, so there is nothing to remove from `deferred-work.md`, but this closes the long-standing "tags have no real source" lineage for the tag chips specifically.
- No OTHER deferred-work entry overlaps tag filtering (the active entries target 9.9 [quick-info distance], 5.1 [venue-card contrast/pin], and various conditional-None items — none touch tags). Do NOT reopen unrelated defers.

### Project / file-impact map (expected touch list — confirm against HEAD during dev)

- **Edit** `_bmad-output/implementation-artifacts/8-2-venues-store-contract.sql` — additive `tags text[]` column + comment + seed (7 arrays) + `on conflict` + smoke + rollback.
- **Edit (+ apply to live DB)** the migration/seed — via Supabase MCP `apply_migration`/SQL or the IPv4 session-pooler psql path (`reference_supabase_db_import_connection`); record applied SQL + row count.
- **Edit** `nextjs-app/lib/supabase/types.ts` — `venues` Row `tags: string[]`, Insert/Update `tags?: string[]`.
- **Edit** `nextjs-app/lib/types/api.ts` — `VenueDataDto.tags: string[]`.
- **Edit** `nextjs-app/lib/services/venue-store.ts` — `VENUE_SELECT_COLUMNS` += `tags`; `VenueRow.tags`; `fromVenueRow` `coerceTags`; `toVenueData` unconditional `tags`.
- **Edit** `nextjs-app/lib/services/venues-fixture.ts` — `tags` on all 7 `VENUE_FIXTURE` rows (same arrays); confirm `normalizeVenueForResponse` passes `tags` through.
- **New** `nextjs-app/lib/contexts/TagFilterContext.tsx` — provider + `useTagFilter()` (no-op default).
- **New (option A)** `nextjs-app/lib/utils/venue-tags.ts` — canonical→`en` display map + a `localizeTag(tag, locale)` helper (values already in `venue-visual-metadata.ts`).
- **Edit** `nextjs-app/components/custom/layout/AppContextProviders.tsx` — mount `TagFilterProvider`.
- **Edit** `nextjs-app/components/custom/layout/DesktopNavBar.tsx` — data-driven, enabled, toggleable chip row (`:49-72`).
- **Edit** `nextjs-app/components/custom/map/MapView.tsx` — read `useTagFilter`, filter `rawVenues` → both `listVenues` + pin `venues`.
- **Edit (maybe)** `nextjs-app/messages/{sv,en}/common.json` — remove now-unreferenced `nav.filterChips.*` (parity-guarded) IF nothing else reads them; keep `nav.filter`.
- **Edit** tests: `DesktopNavBar.test.tsx` (flip the disabled→enabled test), new `TagFilterContext.test.tsx`, `venue-store.test.ts`, `venues-route.test.ts`, a `MapView`/list-filter test; keep `messages-parity.test.ts` green; check for an 8-2 contract-columns test.

### Technical stack (verified — do not drift)

Next.js 16.2.2 (Turbopack-default) + React 19 + Tailwind v4 (CSS-first tokens, `--color-*` in `globals.css`) + Motion 12.x (`motion/react`) + MapLibre GL JS 5.x + TanStack Query 5.x + next-intl + `lucide-react`. Supabase via `@supabase/ssr` service-role client (server-only, `lib/supabase/server.ts`). The `frontend-component` skill applies to any chip-styling touch: **design-system-first** — reuse the existing idle chip classes and the `text-primary`/`text-white`/`rounded-pill`/`divider` tokens for the active pill; do NOT invent a new token for `#1b1b1e` (it already exists as `--color-text-primary`). No new dependency is needed.

### Project Structure Notes

- Contexts live in `nextjs-app/lib/contexts/*` (`SettingsContext.tsx`, `MapSelectionContext.tsx`, `TimeContext.tsx`, `FavouritesContext.tsx`) — put `TagFilterContext.tsx` there and mount it in `AppContextProviders.tsx` alongside the others. Follow the no-op-default + `use*` hook shape.
- Tag display/util helpers live in `nextjs-app/lib/utils/*` (`venue-visual-metadata.ts`, `confidence-display.ts`) — `venue-tags.ts` belongs there.
- The venue contract is a three-file lockstep: `8-2-venues-store-contract.sql` (DB) + `lib/supabase/types.ts` (schema types) + `lib/services/venue-store.ts` (`VENUE_SELECT_COLUMNS`/mapping). Keep them consistent.
- No architectural variance expected; the context-provider nesting order (`architecture.md` §"Context Provider Nesting Order": Geolocation > MapInstance > MapSelection > Time) is unaffected by adding a sibling `TagFilter` provider (it has no ordering dependency — place it wherever it wraps both nav + children).

### Design Gate Criteria

_(Frontend story. Carried verbatim from epics.md §"Story 9.7 → Design Gate Criteria".)_

- **Visual:** Chips (idle + active) match the reference `TopBar` styling (idle = white pill w/ divider border + body text; active = `#1b1b1e`/`text-primary` pill w/ white label).
- **Behaviour:** Tapping chips filters the list + map pins; multi-select intersects (a venue matches if it has ANY active tag); a clear empty state shows when no venue matches.
- **Animation:** Chip toggle (idle↔active) + list/pin update transitions are smooth (`transition-colors duration-fast`; existing list/pin `AnimatePresence`/stagger unaffected).
- **Visual validation:** Screenshot of the active-filter state (chips "on" + filtered list) passes before QA handoff (via the manual host affordance; reference rebaseline to maintainer if the PNG still shows disabled chips).

### Test Gate

Project is past all transitional phases — the standard gate applies (run from `nextjs-app/`):
- **Typecheck:** `npx tsc --noEmit` → 0 errors. (Making `VenueDataDto.tags` required will FORCE the fixture + every DTO producer to set `tags` — a compile-time guardrail; expect tsc to flag any missed site.)
- **Lint:** `npx eslint . --quiet` → 0.
- **Unit/component:** `npx vitest run` → all green (record before/after file+test counts; the repo PostToolUse hook also runs tsc + vitest + eslint on every test-file write).
- **E2E (touched only):** the `responsive-layout` + desktop-nav specs if they assert chip state; the `a11y`/`a11y-mobile` chip surfaces (keep axe green — the active dark `#1b1b1e`-on-white pill is high-contrast, but verify).
- **Migration verification (NOT a code test — record in Debug Log):** after applying the additive `tags` migration + seed to the live DB, run the Section-6 smoke check (`select id, slug, tags from public.venues order by id;`) and confirm the 7 expected arrays + no data loss.
- **messages-parity:** stays green (18 keys); if `nav.filterChips.*` removed, remove from both locales in the same change.

## References

**Primary project sources:**
- [Source: CLAUDE.md] — root instructions (defers to `AGENTS.md` as the canonical AI-agent rulebook; venue-data-load doc pointer)
- [Source: AGENTS.md] — canonical repo rulebook (local Docker/WSL rules, test gate, conventions)
- [Source: project-context.md] — design + screen map + AI rules
- [Source: _bmad-output/planning-artifacts/architecture.md] — §"Context Provider Nesting Order" (TagFilter is an order-independent sibling), caching/data-layer contracts
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#831] — top navbar inventory (a general "filter" icon; NO dedicated tag-chip spec → the chip filter is design-REFERENCE-driven via the Claude Design `TopBar.jsx`, not UX-spec-driven — noted as a planning-drift / design-authority point)
- [Source: nextjs-app/docs/design/DESIGN.md] — tokens (text-primary #1b1b1e, radius-pill, divider, surface-cream)

**Story-specific sources:**
- Story definition + ACs + data-prerequisite: [Source: _bmad-output/planning-artifacts/epics.md#Story 9.7: Tag Filtering (Real Data + Working Chips)]
- Venue contract schema + seed + conventions: [Source: _bmad-output/implementation-artifacts/8-2-venues-store-contract.sql]
- Venue-data structure + additive-column + localization guidance: [Source: nextjs-app/docs/venue-data-load.md]
- Supabase schema types (regenerate/hand-edit target): [Source: nextjs-app/lib/supabase/types.ts#venues]
- Store adapter (VENUE_SELECT_COLUMNS / fromVenueRow / toVenueData / coerce helpers): [Source: nextjs-app/lib/services/venue-store.ts]
- Client DTO to extend with `tags`: [Source: nextjs-app/lib/types/api.ts#VenueDataDto]
- Placeholder tag source being replaced (deterministic seed values, sv+en): [Source: nextjs-app/lib/utils/venue-visual-metadata.ts]
- Reference chip-row pattern (allTags union, active pill, toggle): [Source: nextjs-app/docs/design/references/claude-design/project/src-desktop/TopBar.jsx]
- Reference tag values per slug: [Source: nextjs-app/docs/design/references/claude-design/project/src-desktop/data.jsx]
- Current disabled chip row + `<nav>` wrapper: [Source: nextjs-app/components/custom/layout/DesktopNavBar.tsx#49-72]
- Shared-provider mount point (nav + children join here): [Source: nextjs-app/components/custom/layout/AppContextProviders.tsx]
- Layout wiring (DesktopNavBar sibling of children): [Source: nextjs-app/components/custom/layout/ResponsiveLayout.tsx], [Source: nextjs-app/app/[locale]/layout.tsx]
- Venue-surface filter seams (rawVenues → listVenues + pin venues): [Source: nextjs-app/components/custom/map/MapView.tsx#308,408,658]
- Venue list + existing empty state: [Source: nextjs-app/components/custom/venue/VenueList.tsx]
- Route (client-side filter rationale; server does not tag-filter): [Source: nextjs-app/app/api/venues/route.ts]
- Design tokens (text-primary #1b1b1e, radius-pill, divider): [Source: nextjs-app/docs/design/DESIGN.md], [Source: nextjs-app/app/globals.css#38]
- Context pattern (no-op default, use* hook): [Source: nextjs-app/lib/contexts/SettingsContext.tsx]
- 9.6 handoff (chips left for 9.7; the disabled test to flip): [Source: _bmad-output/implementation-artifacts/9-6-map-chrome-consolidation-dead-control-cleanup.md], [Source: nextjs-app/test/components/DesktopNavBar.test.tsx#213]
- Epic-9 retro (fabricated metadata + live-Supabase-update patterns; 9.6 chips note): [Source: _bmad-output/auto-bmad/retro-notes/epic-9.md]
- Deferred-work (tag data-source lineage; no active 9.7 target to remove): [Source: _bmad-output/implementation-artifacts/deferred-work.md]

## Dev Agent Record

### Agent Model Used

Amelia (bmad-dev-story) — Claude Opus 4.8 (claude-opus-4-8).

### Debug Log References

- **Live migration + seed (Task 2).** Applied to the LIVE `public.venues` store (project ref `hhnbxrhfhlzxgllxukzj`) via the IPv4 session-pooler psql path (`reference_supabase_db_import_connection`): Docker `postgis/postgis:15-3.5`, `SUPABASE_DB_POOLER_URL` from repo-root `.env.local`, in a single transaction. Pre-check confirmed the maintainer note exactly: 24 columns, NO `tags`, exactly 7 venues (no production data). Applied SQL:
  ```sql
  begin;
  alter table public.venues add column if not exists tags text[] not null default '{}';
  comment on column public.venues.tags is 'User-facing amenity/attribute tags for chip filtering (Story 9.7)…';
  update public.venues set tags = '{Innergård,Hund ok,Wifi,Bakverk}', updated_at = now() where id = '1';
  update … '{Morgonsol,Take-away,Surdeg}' where id = '2';
  update … '{Kanal,Skaldjur}' where id = '3';
  update … '{Parasoller,Specialkaffe}' where id = '4';
  update … '{Innergård,Hund ok}' where id = '5';
  update … '{Svalt,Lunch}' where id = '6';
  update … '{Bakgård,Kväll}' where id = '7';
  commit;
  ```
  Verification (`select id, slug, tags from public.venues order by id::int`): all 7 arrays match the seed byte-for-byte, `count(*) = 7`, no data loss. Migration is additive + idempotent + reversible (`drop column if exists tags`). NOTE: the Supabase MCP tools were not exposed as callable functions in this session, so the documented pooler-psql path was used instead of `apply_migration`.
- **Gate.** From `nextjs-app/`: `npx tsc --noEmit` → 0; `npx eslint . --quiet` → 0; `npx vitest run` → 101 files / 861 tests, all green (0 skipped). Baseline at start: 98 passed + 3 skipped files (101), 832 passed + 18 skipped tests (850) — the 18 skipped were the 3 ATDD files, now un-skipped and passing.

### Completion Notes List

**What shipped (all 6 ACs):**
- **AC1/AC6 — real tags on the contract, additive/idempotent/reversible.** `tags text[] not null default '{}'` added to the 8-2 contract `.sql` (schema + 7-row seed + smoke + rollback), `lib/supabase/types.ts` (`venues` Row `tags: string[]`, Insert/Update `tags?: string[]`), and `lib/services/venue-store.ts` (`VENUE_SELECT_COLUMNS` += `tags`; `VenueRow.tags`; new defensive `coerceTags` → `[]` for null/garbage, de-dupes, trims; `toVenueData` emits `tags` unconditionally). Applied + verified on the live DB (Debug Log). Values sourced deterministically from `venue-visual-metadata.ts` `BY_SLUG` (the placeholder being replaced) — NOT fabricated.
- **AC1/AC3/AC4 — DTO + client filter.** `VenueDataDto.tags: string[]` (required, client-safe). New `lib/utils/venue-tags.ts`: `collectTags` (union, first-seen), `filterVenuesByTags` (0 active → all incl. tag-less; ≥1 → OR/union `.some()`), `localizeTag` (canonical sv + sv→en display map).
- **AC3 — shared context.** New `lib/contexts/TagFilterContext.tsx` (no-op default), mounted in `AppContextProviders` wrapping the whole tree just inside `GeolocationProvider` — so the chip row (`DesktopNavBar`, a `ResponsiveLayout` sibling of children) and the venue surfaces (`MapView`, children) resolve the SAME instance.
- **AC2/AC3/AC5 — chip row.** `DesktopNavBar` now derives `allTags` from the SAME `useVenueSearch` key MapView issues (TanStack de-dupes → 0 new requests), renders enabled toggleable chips (idle white pill / active `bg-text-primary text-white` dark pill), `aria-pressed`, `transition-colors duration-fast`. Labels via `localizeTag`. Removed the hardcoded `nav.filterChips.*` list.
- **AC3/AC4 — MapView.** Single `tagFilteredVenues = filterVenuesByTags(rawVenues, activeTags)` memo feeds BOTH `listVenues` and the pin base `venueDtosForMap` → list + pins filter identically. Empty result → existing `venue.list.empty` copy.

**Decisions / scope (defaults taken, per story Open Questions):**
- **OQ1 (mobile chip surface):** wired the shared filter BEHAVIOUR on all surfaces (mobile + desktop lists and pins filter); the chip UI is **desktop-only** (`DesktopNavBar` — the only reference with a chip row, `src-desktop/TopBar.jsx`). Did NOT invent a mobile chip row (no reference → design-drift risk).
- **OQ2 (localization):** approach (A) — canonical `sv` array on the column + a deterministic `sv→en` display map in `venue-tags.ts` (values from the existing placeholder). DB stays single-source; matching is on the canonical value, only the display is localized.
- **OQ3 (`nav.filterChips.*`):** DELETED from both `sv`/`en` `common.json` (grepped — no other consumer; `DesktopNavBar.tsx` no longer reads them). Parity kept green. `nav.filter` (the `<nav aria-label>`) STAYS.
- **Favourites scope:** tag filtering is scoped to the Närmast list + pins. The favourites NETWORK path is left unfiltered (avoids double-filtering); favourites-mode rows + the selected-preview venue are still merged into pins so a selected/favourited pin never vanishes on a chip toggle.
- **Seeded tags (exact, per venue id):** 1 `{Innergård,Hund ok,Wifi,Bakverk}` · 2 `{Morgonsol,Take-away,Surdeg}` · 3 `{Kanal,Skaldjur}` · 4 `{Parasoller,Specialkaffe}` · 5 `{Innergård,Hund ok}` · 6 `{Svalt,Lunch}` · 7 `{Bakgård,Kväll}`.

**Test-infra note:** added a `scrollIntoView` no-op polyfill to `test/setup/setup.ts` (jsdom does not implement it; cmdk — the venue-search combobox — calls it when >1 option is present, which the multi-venue DesktopNavBar fixture now triggers).

**Visual gate (Task 9 — manual affordance, this Windows host):** the automated `.claude/scripts/visual-validate.sh` errors on its `mktemp /tmp/impl-XXXXXX.png` path (the Windows-native Playwright binary cannot write there — the documented host tooling bug, retro-notes 9-2). Reproduced the gate comparison by hand: wiped `.next`, restarted `next dev`, captured the desktop `map-primary` **active-filter state** (route `/?_time=16:30`, viewport 1440×900, `sunnyseat_onboarded=1`) to a Windows-safe path with the first chip toggled ON, then ran the SAME `claude-sonnet-4-6` comparison against the on-disk `references/screens/desktop/map-primary.png`. Rationale recorded here; reference PNGs were NOT edited (dev is forbidden from self-blessing baselines).
  - **Capture verified the story's own surface is correct:** the active chip renders the reference "on" pill (`aria-pressed=true`, `bg-text-primary` = `#1b1b1e` bg + white label); idle chips are white pills with divider border + body text; the venue list AND map pins are both filtered to the 2 venues carrying "Innergård". Chips are data-driven from real tags (no truncated "Takt").
  - **Verdict = FAIL, but 100% scope-drift in the STALE reference (Case B), NOT a Story 9.7 defect.** The reviewer flags only: (a) the **time slider** horizontal position, (b) a **floating map location button**, (c) an **"Om" nav link** — ALL pre-existing and untouched by this story (Story 9.7 only touches the chip row, the tag context, and MapView's venue-derivation memos). Proof: the identical FAIL appears on an **idle baseline capture** (no chip toggled), which changes nothing this story owns. The reference PNG predates Epic 9 chrome work — it still shows the `<` pager chevron that **Story 9.6 removed** and the floating locate button that **9.5/9.6 consolidated**, and its chip row matches my idle styling. The chip work itself needs NO rebaseline; the reference is simply older than 9.5/9.6/9.7's chrome.
  - **Routing:** per the story + the visual-validation skill's Case-B guidance, the reference rebaseline (to depict the post-9.5/9.6 chrome + enabled/active chips) is routed to **maintainer sign-off**. Did NOT force a pass, did NOT edit the reference PNG, did NOT modify the gate script.

### File List

**New:**
- `nextjs-app/lib/contexts/TagFilterContext.tsx`
- `nextjs-app/lib/utils/venue-tags.ts`

**Modified (source):**
- `_bmad-output/implementation-artifacts/8-2-venues-store-contract.sql` — additive `tags` column + comment + 7-row seed + `on conflict` + smoke + rollback.
- `nextjs-app/lib/supabase/types.ts` — `venues` Row/Insert/Update `tags`.
- `nextjs-app/lib/types/api.ts` — `VenueDataDto.tags: string[]`.
- `nextjs-app/lib/services/venue-store.ts` — `VENUE_SELECT_COLUMNS` += `tags`; `VenueRow.tags`; `coerceTags`; `toVenueData` unconditional `tags`.
- `nextjs-app/lib/services/venues-fixture.ts` — `tags` on all 7 `VENUE_FIXTURE` venues.
- `nextjs-app/components/custom/layout/AppContextProviders.tsx` — mount `TagFilterProvider`.
- `nextjs-app/components/custom/layout/DesktopNavBar.tsx` — data-driven, enabled, toggleable chip row.
- `nextjs-app/components/custom/map/MapView.tsx` — `useTagFilter` + `tagFilteredVenues` feeding `listVenues` + pin `venueDtosForMap`; `tags: []` on the synthetic `fallbackVenueFromSlug`.
- `nextjs-app/components/custom/venue/forced-venue-detail.ts` — `tags` on the forced-visual detail venue.
- `nextjs-app/messages/sv/common.json`, `nextjs-app/messages/en/common.json` — removed `nav.filterChips.*` (both locales, lockstep).

**Modified (tests) + LIVE DB:**
- Live `public.venues` — additive `tags` column + 7-row seed applied + verified.
- `nextjs-app/test/components/{TagFilterContext,VenueTagsData,DesktopNavBarTagChips}.atdd.test.tsx` — un-skipped (18 tests now active + passing).
- `nextjs-app/test/components/DesktopNavBar.test.tsx` — flipped disabled→enabled chip tests + toggle test; multi-venue fixture; single-venue response for the search test; `TagFilterProvider` wrap.
- `nextjs-app/test/components/MapView.test.tsx` — `useTagFilter` mock + Story 9.7 tag-filter describe block (list + pins).
- `nextjs-app/test/unit/services/venue-store.test.ts` — 23-column list assertion; new `coerceTags`/`toVenueData` tag tests.
- `nextjs-app/test/unit/api/venues-route.test.ts` — DTO-carries-tags + no-server-filter test.
- `nextjs-app/test/setup/setup.ts` — `scrollIntoView` polyfill.
- Fixture `tags: []` (required-field guardrail) added to: `test/components/{ReviewFlow,VenueDetailContent,VenueDetailOverlay,VenueList,VenueSearchCombobox,FavouritesList,FeedbackFlow}.test.tsx`, `test/unit/{api/venues-route,mutations/useSubmitReview,queries/useFavouriteVenues,queries/useVenueDetail,queries/useVenueSearch,services/sun-engine,venue-planner,utils/venue-pin-mapping}.test.ts(x)`.
- `nextjs-app/test/unit/services/sun-engine-caching.atdd.test.ts` — inline snapshot updated (venue now carries `tags: []`).

### Change Log

- 2026-07-01 — Story 9.7 implemented (Amelia/Opus 4.8): real `tags` source added to the venue contract (live-DB migration + seed applied), surfaced through `VenueDataDto`, and wired to a data-driven, enabled, toggleable desktop chip row via a shared `TagFilterContext`; MapView filters both the venue list and the map pins from one tag-filtered source (OR/union multi-select, graceful-empty default). Gate green (tsc 0 / eslint 0 / vitest 101 files · 861 tests). Status → review.

## Open Questions

1. **Mobile chip surface (scope).** The chip row exists only on desktop (`DesktopNavBar`); the mobile app and the Claude Design mobile/free reference (`src-free/App.jsx`) have **no tag-chip surface**. The ACs mandate filtering the shared list + pins but do not clearly require a NEW mobile chip UI. **Default taken:** wire the shared filter behaviour on all surfaces + add the chip UI on **desktop only** (the only reference that has one); do NOT invent an unreferenced mobile chip layout. If a mobile chip surface is wanted, it needs a design reference → maintainer decision. (Non-blocking; the behaviour + desktop UI fully satisfy the ACs against the available reference.)
2. **Localization approach for tag values.** Default: store the canonical `sv` array on the column + a deterministic `sv→en` display map in `lib/utils/venue-tags.ts` (values already in `venue-visual-metadata.ts`), matching only on the canonical value. The `jsonb {sv,en}` alternative is heavier; flagged for reviewer preference. (Non-blocking; either satisfies AC5.)
3. **`nav.filterChips.*` i18n keys after chips become data-driven.** Default: remove the now-unreferenced keys from both locales (parity-guarded) if nothing else reads them (grep first). Keep `nav.filter`. (Non-blocking cleanup.)
