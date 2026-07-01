# Story 9.7: Tag Filtering — Real Data + Working Chips

Status: ready-for-dev

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

- [ ] **Task 1 — Read the coordination + data-sourcing context FIRST (no code)**
  - [ ] Read Dev Notes §"DATA SOURCING" in full — it resolves the "how do we get truthful tags without fabricating them" question that defines this story. Do **not** invent new tag values.
  - [ ] Read §"Why this exists (root cause #2)", §"Where the chips live vs where the venues live (the split)", and §"Constraints carried from Epic 9 retro-notes (binding)".
  - [ ] Confirm against HEAD: the 8 chips + the `<nav aria-label={t('nav.filter')}>` wrapper are still in `DesktopNavBar.tsx:49-72` (Story 9.6 left them for this story); `DesktopNavBar.test.tsx:213-218` still asserts the `'Innergård'` chip is `disabled` (this test MUST be updated by this story).

- [ ] **Task 2 — Additive `tags` column on the venue contract (migration + types + select) (AC: #1, #6)**
  - [ ] Add to `_bmad-output/implementation-artifacts/8-2-venues-store-contract.sql` (the contract handoff `.sql`, manual-run-only) an **idempotent additive** column in Section 2, following the existing `alter table … add column if not exists` pattern used for `seating_area` / `seating_elevation_m` / `ground_elevation_m`:
    ```sql
    alter table public.venues add column if not exists tags text[] not null default '{}';
    comment on column public.venues.tags is
      'User-facing amenity/attribute tags for chip filtering (Story 9.7). '
      'text[] (empty array = no tags). Localized at the data layer per venue-data-load.md. '
      'Serialized into the client VenueDataDto (unlike the server-only seating_* columns).';
    ```
    Use `text[] not null default '{}'` (NOT `jsonb`) — it is the simplest array-intersection-friendly shape, matches the reference `v.tags` string-array, and Supabase maps it to `string[]` in `types.ts`. (`jsonb` is the fallback only if a reviewer objects; document the choice either way.)
  - [ ] Update the **seed** (Section 4): add `tags` to the `insert into public.venues (…)` column list and give each of the 7 rows its deterministic tag array from §"DATA SOURCING · Seed values" below. Add `tags = excluded.tags` to the `on conflict (id) do update set` block so a re-seed is idempotent.
  - [ ] Update Section 6 smoke checks: add a `select id, slug, tags from public.venues order by id;` expectation and note the 7 expected arrays.
  - [ ] Update Section 5 rollback notes: `alter table public.venues drop column if exists tags;` is the additive rollback (the column drop is reversible; the table-drop rollback already covers it).
  - [ ] Update `nextjs-app/lib/supabase/types.ts` `venues` table `Row` / `Insert` / `Update` to add `tags: string[]` (Row: `string[]`; Insert/Update: `tags?: string[]`). This file is the schema source-of-truth; the note at its top says to regenerate via the Supabase types generator after a schema change — a hand-edit that matches the generator output is acceptable here (keep the shape the generator would produce: `tags: string[]` on Row, `tags?: string[]` on Insert/Update).
  - [ ] **APPLY the migration + seed to the LIVE `public.venues` store.** The app is on the real data path (`SUNNYSEAT_VENUE_STORE=supabase` in Production). Per the 9.1 retro pattern ("live Supabase UPDATE"), run the additive `alter table … add column if not exists tags …` + the idempotent tag seed against the live DB (via the Supabase MCP `apply_migration`/SQL tools, or the documented IPv4 session-pooler psql path in `reference_supabase_db_import_connection`). It is safe: additive, idempotent, only 7 test venues, no production data, no data-loss risk (maintainer-confirmed in epics.md). Record the applied SQL + row-count verification in the Completion Notes / Debug Log.

- [ ] **Task 3 — Surface `tags` through the store adapter + DTO (AC: #1)**
  - [ ] `nextjs-app/lib/types/api.ts` — add `tags: string[];` to `VenueDataDto` (required, defaults to `[]` at the mapping boundary so it is never `undefined`). It is a **public, client-safe** field (unlike the server-only `seating_*`), so it IS serialized into the DTO.
  - [ ] `nextjs-app/lib/services/venue-store.ts`:
    - Add `'tags'` to `VENUE_SELECT_COLUMNS`.
    - Add `tags?: string[] | null` to the local `VenueRow` type.
    - In `fromVenueRow`, coerce defensively: `tags: coerceTags(row.tags)` where `coerceTags` returns a `string[]` — keep only non-empty trimmed strings, drop non-array / null → `[]`, de-dupe. (Mirror the defensive `coerce*` helpers already in this file. A malformed/null column must yield `[]`, never crash — AC1/AC4 graceful-empty requirement.)
    - In `toVenueData`, always set `base.tags = venue.tags ?? []` (unconditional — the field is required on the DTO, so `[]` is the honest "no tags" value; do NOT use the `if (x !== undefined)` optional-spread pattern here).
  - [ ] `nextjs-app/lib/services/venues-fixture.ts` (the in-memory seed / `VENUE_FIXTURE`) — add `tags` to each of the 7 fixture venues with the SAME §"DATA SOURCING · Seed values" arrays, so the default (non-Supabase) CI path and the live path are byte-consistent, and the DTO always has `tags`. (Verify: `VENUE_FIXTURE` is the source both `getVenues` [fixture branch] and the 8-2 seed derive from — keep them identical.)
  - [ ] Confirm `normalizeVenueForResponse` (in `venues-fixture.ts`) passes `tags` through untouched (it spreads the venue; if it allow-lists fields, add `tags`). The route's `matchesVenueQuery` / sort / distance logic does NOT need to change — tag filtering is CLIENT-side (see Task 4 rationale).

- [ ] **Task 4 — New shared tag-filter state (context) consumable by nav + venue surfaces (AC: #3, #4)**
  - [ ] Create `nextjs-app/lib/contexts/TagFilterContext.tsx` (a `'use client'` context provider + `useTagFilter()` hook), mirroring the existing lightweight context pattern (`SettingsContext.tsx` / `MapSelectionContext.tsx`): state = `activeTags: Set<string>` (or `readonly string[]`), API = `{ activeTags, toggleTag(tag), clearTags(), isActive(tag) }`. Default context value is a **no-op** object (not a throw) so components render safely in unit tests without the provider (match `SettingsContext.tsx:23-34`).
  - [ ] Mount `TagFilterProvider` in `nextjs-app/components/custom/layout/AppContextProviders.tsx` so BOTH `DesktopNavBar` (via `ResponsiveLayout`, a sibling of `children`) AND `MapView` (via `children`) are inside it. Place it at a level that wraps `{children}` and the nav — the cleanest spot is wrapping the whole tree inside `SettingsProvider` (alongside the Time/Favourites providers) OR just inside `GeolocationProvider`. Verify: `DesktopNavBar` is rendered by `ResponsiveLayout` in `app/[locale]/layout.tsx`, which is nested inside `AppContextProviders`; `MapView` is `children`. Both must resolve the SAME provider instance. (This is the crux of AC3's "shared via context consumable by both the nav and the venue surfaces" — the chip UI and the venue surfaces are in **separate component subtrees** joined only at `AppContextProviders`.)
  - [ ] The context is client-only ephemeral state (no URL/localStorage persistence required by the ACs — keep it simple; do NOT add query-param plumbing, which would collide with the Story 9.0 planner-forcing gate concerns).

- [ ] **Task 5 — Data-drive + enable the chip row in `DesktopNavBar` (AC: #2, #3, #5)**
  - [ ] Replace the hardcoded 8-chip `filterChips.*` list in `DesktopNavBar.tsx:49-72` with a data-driven row: compute `allTags` = the union of `venue.tags` across the loaded venues, first-seen order (reference `TopBar.jsx:5-12`). Source the loaded venues from the SAME `useVenueSearch(...)` call the desktop nav's `VenueSearchShell` already issues — OR, cleaner, read them from the tag-filter/venue data available in context. **Simplest correct approach:** have `DesktopNavBar` call `useVenueSearch` with the same coords/planner args the shell uses (the nav already lives under all the needed providers) and derive `allTags` from `venueQuery.data?.venues`. Guard for the loading/empty case: render nothing (or a stable skeleton) when there are no venues yet, so the row doesn't flash.
  - [ ] Each chip is an **enabled** `<button>`: idle style = existing `border border-divider bg-white text-text-body … rounded-pill h-9 px-4 shadow-subtle` (KEEP the current idle classes — they already match the reference idle pill); active style = `bg-text-primary text-white border-text-primary` (the reference "on" pill, `#1b1b1e` bg + white label; `bg-text-primary` maps to `--color-text-primary: #1b1b1e`). Toggle via `useTagFilter().toggleTag(tag)`; `aria-pressed={isActive(tag)}`. Remove `disabled` + `cursor-not-allowed`. Add a smooth `transition-colors duration-fast` for the toggle (Animation gate).
  - [ ] **Copy (AC5):** chip labels ARE the tag values now (localized data-layer strings), so the hardcoded `nav.filterChips.*` i18n block is no longer the chip source. Decide with the reviewer default: (a) DELETE the now-unreferenced `nav.filterChips.*` keys from BOTH `sv`/`en` `common.json` (parity-guarded by `messages-parity.test.ts`) if nothing else reads them, OR (b) keep them only if another surface consumes them (grep first — Task 8). The `nav.filter` key (the `<nav aria-label>`) STAYS. Verify no chip renders a truncated "Takt": the seed uses the full "Takterrass".

- [ ] **Task 6 — Apply the filter to the venue surfaces in `MapView` (AC: #3, #4)**
  - [ ] In `nextjs-app/components/custom/map/MapView.tsx`, read `useTagFilter()` and derive a single `tagFilteredVenues` from `rawVenues` (`venueQuery.data?.venues`): when `activeTags.size === 0` → pass through unchanged (AC4 no-op); otherwise keep venues where `venue.tags.some(t => activeTags.has(t))` (OR/union intersection — AC3). Apply this BEFORE the existing `listVenues` (line ~658) and `venueDtosForMap`/`venues` (pin) derivations so BOTH the desktop+mobile lists AND the map pins are filtered from the same source. (Favourites mode: apply the tag filter to the favourites rows too, OR scope tag filtering to the Närmast list only — default: apply to the currently-shown list surface consistently; document the choice. Simplest: filter `rawVenues` once and let both `listVenues` and `favouriteVenueRows`-from-list derive from the filtered set — but note favourites also has a network path. Keep the tag filter on the `listVenues` + pin derivations; leave the favourites network path untouched to avoid double-filtering complexity, and document this scope decision.)
  - [ ] **Empty state (AC3):** `VenueList` already renders the empty copy (`venue.list.empty`, "Inga platser…") when `sortedVenues.length === 0` — so a tag filter that matches nothing already shows a clear empty state via the existing path. Verify the empty state reads sensibly for the "no tag matches" case (it currently says the generic list-empty copy; that is acceptable, but confirm it is not gated on `isLoading`). If the reviewer wants a tag-specific empty message, that is an enhancement — default is to reuse the existing `venue.list.empty`.
  - [ ] Do NOT change `useVenueSearch` gating, the query keys, `staleTime`, the planner deferral (Story 9.4), or the pin/list memo dependency shapes beyond adding the tag-filter input. The tag filter is a pure client-side `.filter()` over already-fetched data — it must issue **zero** new network requests (consistent with Story 9.4's fetch-hygiene spine).

- [ ] **Task 7 — Mobile chip surface decision (AC: #3 — scope) [OPEN QUESTION 1]**
  - [ ] The chip row exists ONLY on desktop today (`DesktopNavBar`); the mobile app (`MapView` bottom sheet + `VenueSearchShell` top row) has **no chip row**, and the Claude Design **mobile/free reference (`src-free/App.jsx`) has NO tag-chip surface** (only the desktop `src-desktop/TopBar.jsx` does). The ACs say the filter must affect "the venue list and map pins" (which are shared) but do not clearly mandate a NEW mobile chip UI. **Default (autonomous):** wire the shared context + filter so the **behaviour** works on all surfaces, and add the **chip UI on desktop only** (matching the only reference that has one). Do NOT invent a mobile chip row with no reference (that would risk a visual-gate/design drift). If a mobile chip surface is genuinely wanted, it needs a design reference → surface as **Open Question 1** for the maintainer rather than fabricating a layout. Note this scope decision explicitly in Completion Notes.

- [ ] **Task 8 — Tests + regression (AC: #1–#6, standard gate)**
  - [ ] `DesktopNavBar.test.tsx`: UPDATE the `'keeps the out-of-scope filter chips disabled until Story 9.7 owns them'` test (line 213-218) — it now asserts the chips are **enabled** and data-driven. Add: chips render from the loaded venues' tag union (mock `useVenueSearch` to return venues with known tags); clicking a chip sets `aria-pressed=true` + the active pill classes; a second click clears it. Wrap the render in the `TagFilterProvider` (or rely on the no-op default + assert toggle via a spy).
  - [ ] New `TagFilterContext.test.tsx` (or fold into an existing context test): `toggleTag` adds/removes; `clearTags`; `isActive`; no-op default value renders without a provider.
  - [ ] `venue-store.test.ts`: assert the Supabase mock's `.select(VENUE_SELECT_COLUMNS)` now includes `tags`; `fromVenueRow` maps `tags` (array in → same array; `null` in → `[]`; non-array/garbage → `[]`; de-dupes; trims empties); `toVenueData` always emits `tags` (`[]` when absent).
  - [ ] `venues-route.test.ts`: the DTO now carries `tags` for each venue (fixture path) — assert presence + `[]`-default shape; assert the route does NOT tag-filter server-side (a request with no tag param returns all in-radius venues unchanged — the tag filter is client-side).
  - [ ] A `MapView`/list-filter test (component or a focused unit over the derive helper): with `activeTags` empty → all venues; with one active tag → only venues whose `tags` include it; multi-select → union; no matches → empty state (`venue.list.empty`) rendered; pins filtered identically.
  - [ ] `messages-parity.test.ts` stays green (18 keys) — if `nav.filterChips.*` is removed, remove from BOTH locales in the same change; if kept, parity is unaffected.
  - [ ] `shadow-caster-sql-contract.test.ts` / any 8-2 contract test: if a test asserts the venue contract column set, add `tags`. (Grep for a contract-columns test before assuming.)
  - [ ] Run the gate: `cd nextjs-app && npx tsc --noEmit` (0) · `npx eslint . --quiet` (0) · `npx vitest run` (all green). Record before/after counts.

- [ ] **Task 9 — Design gate: visual validation of the active-filter state (frontend gate)**
  - [ ] Capture a screenshot of the desktop **active-filter state** (one or more chips "on" in the dark pill style + the filtered venue list/pins) and compare against the reference `TopBar.jsx` chip styling. Use the **manual visual affordance on this host** (see Dev Notes §"Visual gate on this host") — the automated `visual-validate.sh` fails on this Windows host (retro-notes 9-2). `VISUAL_VALIDATE_PROVIDER=none ALLOW_MANUAL_VISUAL_VALIDATION=1`; wipe `.next` + restart dev before capture; verify the served CSS chunk. Record rationale in Completion Notes. Do NOT edit reference PNGs — if the reference `map-primary`/nav PNG does not depict enabled chips, route the rebaseline to maintainer sign-off (dev is forbidden from self-blessing references).
  - [ ] Move Status → `review` (the orchestrator owns sprint-status / gate / commit / PR).

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

### Debug Log References

### Completion Notes List

### File List

## Open Questions

1. **Mobile chip surface (scope).** The chip row exists only on desktop (`DesktopNavBar`); the mobile app and the Claude Design mobile/free reference (`src-free/App.jsx`) have **no tag-chip surface**. The ACs mandate filtering the shared list + pins but do not clearly require a NEW mobile chip UI. **Default taken:** wire the shared filter behaviour on all surfaces + add the chip UI on **desktop only** (the only reference that has one); do NOT invent an unreferenced mobile chip layout. If a mobile chip surface is wanted, it needs a design reference → maintainer decision. (Non-blocking; the behaviour + desktop UI fully satisfy the ACs against the available reference.)
2. **Localization approach for tag values.** Default: store the canonical `sv` array on the column + a deterministic `sv→en` display map in `lib/utils/venue-tags.ts` (values already in `venue-visual-metadata.ts`), matching only on the canonical value. The `jsonb {sv,en}` alternative is heavier; flagged for reviewer preference. (Non-blocking; either satisfies AC5.)
3. **`nav.filterChips.*` i18n keys after chips become data-driven.** Default: remove the now-unreferenced keys from both locales (parity-guarded) if nothing else reads them (grep first). Keep `nav.filter`. (Non-blocking cleanup.)
