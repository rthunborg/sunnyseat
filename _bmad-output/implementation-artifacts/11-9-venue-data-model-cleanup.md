# Story 11.9: Venue Data Model Cleanup — IDs, Per-Weekday Hours, Dead-Field Removal

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **maintainer adding real venues (and the user reading them)**,
I want the venue data model to auto-handle ids, carry honest per-weekday opening hours, and drop redundant/unused fields,
so that authoring a venue is simple and the app only ever shows fields it can stand behind.

## Context

Authoring a real venue today means hand-picking a text `id`, writing a pre-localized `opening_hours.display` string, and filling `peak_time` + `shadow_warning_minutes` — three of which are redundant, dishonest, or unused. This story simplifies `public.venues` end-to-end (Supabase migration + store adapter + DTO + display + i18n + seed + the data-load template) so venue data is easy to author and carries only fields the app actually uses truthfully.

**The app is LIVE on the Supabase real-data path** (`SUNNYSEAT_VENUE_STORE=supabase` / `SUNNYSEAT_SUN_ENGINE=real` in Vercel Production). The migration is manual, idempotent, reviewed, and MUST preserve the RLS posture (`venues_service_read` service-role-only policy) and the `test-venue-sunny` gate venue. **You (the dev agent) apply the live migration** as a reviewed step.

This is the 9th and final story of Epic 11 (folded from the dissolved single-story Epic 12 draft, 2026-07-06). Stories 11-1..11-8 are all at `review` on the epic branch `epic/11-feels-instant-reads-clear`; this story lands on the same branch. It has NO hard dependency on the prior stories' code but shares the opening-hours render surfaces they last touched (11.4 quick-info, 11.6 detail badge).

## Acceptance Criteria

**AC1 — Auto-assigning `text` PK; keep the `text` PK, do NOT migrate to serial/identity**

**Given** `id` is a manually-assigned text PRIMARY KEY that `reviews.venue_id` and `feedback.venue_id` reference as free-text (seed rows `"1"`.."7"`), while `slug` is the real URL key
**When** the id strategy is implemented per the **MAINTAINER DECISION (2026-07-06): keep the `text` PRIMARY KEY** — do NOT migrate to an identity/serial PK — so the existing free-text `reviews.venue_id` / `feedback.venue_id` joins stay compatible; the column is made auto-assigning so a data author no longer hand-picks an id (add a DB default that generates a `text` id on insert; the story/architect picks the exact mechanism — e.g. a sequence-backed `text` default — preserving the seed rows `"1"`.."7"`)
**Then** inserting a real venue requires no manually chosen id, the `text` PK and the review/feedback joins are preserved, the `test-venue-sunny` gate venue is unchanged, and the chosen mechanism is reflected in the migration and the data-load template

**AC2 — Per-weekday `opening_hours`; derive the display line + ÖPPET badge at render time**

**Given** `opening_hours` is a single `{display, closesAt}` jsonb with a pre-localized `display` string
**When** it is replaced with a per-weekday structure carrying opens/closes for all 7 weekdays (shape proposed below; closed days and past-midnight closing handled), and the stored `display` string is removed
**Then** the "Öppet till HH:MM" quick-info line and the "ÖPPET · {time}" detail badge are DERIVED at render time from the structured data + locale + current weekday (Europe/Stockholm, sv default) via a new formatter + i18n keys, and a venue with no hours for today renders NOTHING (never a fabricated closing time)

**AC3 — Remove `peak_time` (real engine already computes `peakTime` live)**

**Given** `peak_time` is stored but the real engine already computes `peakTime` live from the sun timeline (`sun-engine.ts` `peakTimeFromTimeline`)
**When** the `peak_time` column and its store→DTO passthrough are removed
**Then** the real-engine `peakTime` (timeline-derived) path is unchanged and no surface loses a real value

**AC4 — Remove `shadow_warning_minutes` (carried store→DTO but rendered nowhere)**

**Given** `shadow_warning_minutes` is carried store→DTO but rendered nowhere in the UI
**When** its original intent is documented and it is dropped end-to-end (column, store field, `VenueDetailDto.shadowWarningMinutes`, and the tests that assert it) — unless the story surfaces a real consumer
**Then** no reader of the field remains (verified by grep across `opening_hours`/`openingHours`/`peak_time`/`peakTime`/`shadow_warning_minutes`/`shadowWarningMinutes` before removal)

**AC5 — Rewrite `nextjs-app/docs/venue-data-load.md` to match the new model**

**Given** `nextjs-app/docs/venue-data-load.md` is the canonical "add a real venue" guide
**When** the model changes above land
**Then** the doc is rewritten to match: the `id` row reflects AC1 (auto-assigned, author no longer sends it), the `opening_hours` row + the "What to send (one venue)" JSON example use the new per-weekday shape, and `peak_time` + `shadow_warning_minutes` are removed — leaving a correct, copy-pasteable template

**AC6 — Idempotent live migration preserving RLS + server-only columns + gate venue**

**Given** the app is LIVE on the Supabase real-data path
**When** the migration is authored
**Then** it is idempotent, keeps RLS enabled + the `venues_service_read` service-role-only policy, leaves the server-only `seating_area` / `seating_elevation_m` / `ground_elevation_m` columns untouched, updates the 7-venue seed to the new shape (byte-compatible on the values the `test-venue-sunny` gate asserts), and is applied to the live DB as a reviewed step

### Design Gate Criteria

- **Visual:** The derived "Öppet till HH:MM" (quick-info) and "ÖPPET · {time}" detail badge match the CURRENT visual treatment on mobile + desktop; no closing time is shown when the venue has no hours today
- **Behaviour:** The opening-hours line reflects the CURRENT weekday; closed-today and past-midnight cases render honestly; venues without opening hours omit the line/badge entirely
- **Animation:** No regression to the fallback→detail badge swap (same footprint, no layout jump) — the 11.6 `Skeleton`→badge same-box swap must be preserved
- **Visual validation:** Screenshot comparison of the venue detail (mobile + desktop) and the quick-info card against the current baseline passes before QA handoff — no proportion/centering regression in the opening-hours row or the ÖPPET badge. **Dev is FORBIDDEN from self-blessing / creating / editing reference PNGs** (project-wide inversion rule). If the visual treatment stays byte-identical (goal), no rebaseline is needed; if it shifts, note it as a maintainer follow-up in Completion Notes — do NOT edit reference PNGs.

---

## Tasks / Subtasks

- [x] **Task 1 — Design + apply the live migration (AC1, AC2, AC3, AC4, AC6)**
  - [x] 1.1 Author an idempotent migration SQL file at `_bmad-output/implementation-artifacts/11-9-venue-data-model-cleanup.sql` (mirror the conventions in `8-2-venues-store-contract.sql`: create-if-not-exists / `add column if not exists` / `drop column if exists`, deny-by-default RLS unchanged, idempotent seed, end-of-file smoke checks). This is a MANUAL-RUN handoff artifact AND the exact SQL you apply live.
  - [x] 1.2 **AC1 id auto-assign:** keep `id text primary key`. Add a DB default that generates a `text` id on insert — a sequence-backed default is the recommended mechanism: `create sequence if not exists venues_id_seq;` then `alter table public.venues alter column id set default nextval('venues_id_seq')::text;` and advance the sequence past the seed max (`select setval('venues_id_seq', (select max(id::int) from public.venues))`) so the next auto id is `"8"`. Preserve rows `"1"`.."7"`. Verify `reviews.venue_id` / `feedback.venue_id` (both `text not null`) still join. Do NOT change the PK type or add an FK.
  - [x] 1.3 **AC2 per-weekday shape:** replace the `opening_hours jsonb` `{display, closesAt}` content with the per-weekday structure (see Dev Notes "Opening-hours shape"). Keep the column name `opening_hours` and type `jsonb` (additive-safe; no rename). Drop the stored `display` string — the render layer derives it. Update the 7-venue seed to the new shape, keeping the values the gate asserts intact.
  - [x] 1.4 **AC3 drop peak_time:** `alter table public.venues drop column if exists peak_time;` (after the grep in Task 4 confirms no non-legacy reader).
  - [x] 1.5 **AC4 drop shadow_warning_minutes:** `alter table public.venues drop column if exists shadow_warning_minutes;` (also drops its CHECK constraint) after the Task 4 grep.
  - [x] 1.6 **AC6:** confirm RLS stays enabled, `venues_service_read` policy intact, `seating_area`/`seating_elevation_m`/`ground_elevation_m` untouched. Run the smoke checks (7 rows, gate venue resolves, deny-by-default grants, single policy).
  - [x] 1.7 Apply the migration to the LIVE DB (project `hhnbxrhfhlzxgllxukzj`) via the Supabase MCP (`apply_migration` / `execute_sql`) or the documented IPv4 session-pooler Docker `psql` path (creds in gitignored `.env.local`). Record the applied output + smoke-check results in the Dev Agent Record. Regenerate `nextjs-app/lib/supabase/types.ts` (drop `peak_time`/`shadow_warning_minutes`, update `opening_hours` if the generator surfaces it) so the generated Row/Insert/Update stay truthful.

- [x] **Task 2 — Store adapter: new hours shape, drop dead fields (AC2, AC3, AC4)**
  - [x] 2.1 In `lib/services/venue-store.ts`: replace the `openingHours?: VenueDetailDto['openingHours']` typing with the new per-weekday type (define it in `lib/types/api.ts`, import here). Update `VENUE_SELECT_COLUMNS` — remove `'peak_time'` and `'shadow_warning_minutes'`; keep `'opening_hours'`.
  - [x] 2.2 Remove `peakTime?` and `shadowWarningMinutes?` from `StoredVenueDetail`, the `peak_time`/`shadow_warning_minutes` fields from `VenueRow`, the assignments in `storedVenueDetail` and `detailFromRow`.
  - [x] 2.3 Update `VENUE_DETAIL_SEED` and the in-memory seed: remove every `peakTime` / `shadowWarningMinutes`; convert each `openingHours: { display, closesAt }` to the new per-weekday shape. Keep the derived output identical for `test-venue-sunny`.
  - [x] 2.4 In `detailFromRow` / `fromVenueRow`: map `row.opening_hours` (new jsonb shape) → `detail.openingHours` with a defensive coercer (`coerceOpeningHours`) mirroring the other `coerce*` helpers — a malformed/null value → `undefined` (renders nothing), never a throw.
  - [x] 2.5 `toVenueData`: keep surfacing `openingHours` on the list DTO (11.4 behaviour) with the same optional-guard, but now the value is the structured per-weekday object (not a display string).

- [x] **Task 3 — DTO + formatter + render + i18n (AC2)**
  - [x] 3.1 `lib/types/api.ts`: replace `openingHours?: { display: string; closesAt?: string }` on `VenueDataDto` and the REQUIRED `openingHours: { display; closesAt? }` on `VenueDetailDto` with the new per-weekday type (see Dev Notes). Keep the list=optional / detail=required override legal.
  - [x] 3.2 Create a new formatter `lib/utils/opening-hours.ts` (co-locate with `time-planner.ts`) exporting a pure `formatOpeningHours(hours, now, locale) → { display?: string; closesAt?: string }`. It: picks the CURRENT weekday in `Europe/Stockholm`, returns `{}` (renders nothing) when the venue is closed today or has no hours, and otherwise returns the localized display string + `closesAt` (handling past-midnight closes). Unit-tested directly.
  - [x] 3.3 `VenueQuickInfo.tsx`: stays presentational — accepts a pre-derived `{ display?, closesAt? }` computed by the caller (`MapView` via `formatOpeningHours` from the list-DTO per-weekday hours). Renders nothing when the derived display is absent. Kept the `text-text-body` styling (axe AA) and the `data-testid="quick-info-opening-hours"` node.
  - [x] 3.4 `VenueDetailContent.tsx`: the ÖPPET badge + Öppettider row derive `closesAt` / display via the formatter from the new shape + current weekday. Preserved the `loading ? <Skeleton …> : closesAt ? <badge> : null` same-box swap. Kept the CURRENT single-line Öppettider treatment.
  - [x] 3.5 i18n: added `quickInfo.openUntilLine` + `detail.openUntilLine` ("Öppet till {time}" / "Open until {time}") to BOTH `messages/sv/venue.json` AND `messages/en/venue.json` (messages-parity green). Reused `detail.openUntil` for the badge.
  - [x] 3.6 Updated `app/api/venues/[slug]/route.ts` `buildDetailDto`: dropped the `?? fixture?.peakTime` fixture fallback (kept `timelineProjection.peakTime`), replaced `openingHours: fixture?.openingHours ?? { display: 'Öppettider saknas' }` with `?? {}` (empty per-weekday = renders nothing), removed the `shadowWarningMinutes` spread block. Updated the forced-detail fixtures (`forced-venue-detail.ts`, `ForcedVenueDetailInitialFrame.tsx` label wiring).

- [x] **Task 4 — Grep-verify no remaining reader before dropping fields (AC4)**
  - [x] 4.1 Grepped `peak_time`/`peakTime`/`shadow_warning_minutes`/`shadowWarningMinutes`/`opening_hours`/`openingHours`. Confirmed: `peakTime` survives ONLY as the ENGINE `sun-engine.ts#peakTimeFromTimeline` + `timeline.peakTime` DTO + `venue-visual-metadata.ts:228` timeline read (NOT the stored column); `shadowWarningMinutes` has ZERO non-test readers.
  - [x] 4.2 Updated/removed the tests asserting the dropped fields: `venue-detail-route.test.ts` (removed the zero-minute-shadow-warning test), `venues-route-real-engine.test.ts`, `useVenueDetail.test.ts`, `venue-store.test.ts`, `VenueDetailContent.test.tsx`, `VenueDetailOverlay.test.tsx`, `venues-route.test.ts`, `MapView.test.tsx`, `FeedbackFlow.test.tsx`, `ReviewFlow.test.tsx`, `useSubmitReview.test.tsx`, `epic-10-weather-matrix.spec.ts`, `VenueQuickInfo.test.tsx`. Kept the ENGINE `timeline.peakTime` assertions. Un-skipped + adjusted the 4 ATDD scaffolds.

- [x] **Task 5 — Rewrite the data-load doc (AC5)**
  - [x] 5.1 Rewrote `nextjs-app/docs/venue-data-load.md`: `id` row now says auto-assigned (author omits it); the `opening_hours` row + the "What to send" JSON example use the new per-weekday shape (with a past-midnight + closed-day example); removed the `peak_time` + `shadow_warning_minutes` rows. Kept the `seating_area` / `seating_elevation_m` / `ground_elevation_m` guidance verbatim. JSON example validated.

- [x] **Task 6 — Verify gates (all AC)**
  - [x] 6.1 `npx tsc --noEmit` (exit 0) + `npx eslint . --quiet` (exit 0) + `npx vitest run` (150 files / 1416 tests, all pass). The seed path stays green; the `test-venue-sunny` derived opening-hours output is byte-stable ("Öppet till 22:00" / closesAt "22:00" every weekday).
  - [x] 6.2 Ran the relevant e2e specs against the running dev server: `epic-10-weather-matrix.spec.ts` (10 passed) + `map-primary.spec.ts` (21 passed, quick-info surface). No wiring regression.

## Dev Notes

### Opening-hours shape (proposed — AC2)

Store `opening_hours` as a per-weekday jsonb keyed by ISO weekday (or a 7-slot object). Recommended shape (numeric ISO weekday 1=Mon..7=Sun; a missing key or `null` value = **closed that day**; `close` < `open` means **past-midnight** close):

```json
{
  "1": { "open": "11:00", "close": "22:00" },
  "2": { "open": "11:00", "close": "22:00" },
  "3": { "open": "11:00", "close": "22:00" },
  "4": { "open": "11:00", "close": "23:00" },
  "5": { "open": "11:00", "close": "02:00" },
  "6": { "open": "12:00", "close": "02:00" },
  "7": null
}
```

- The **stored `display` string is REMOVED** — derive "Öppet till HH:MM" from `close` + locale at render time.
- The **`closesAt`** the detail badge needs is just today's `close` (derived); no separate stored field.
- Confirm the exact key convention with the architect if a named-weekday shape (`"mon"`..`"sun"`) is preferred; keep it stable and documented in the migration + data-load doc. Whatever shape is chosen, the coercer + formatter must both use it and be unit-tested.
- **Past-midnight:** opens 18:00, closes 02:00 → the venue is "open until 02:00" for that weekday. The formatter derives the display honestly; do not fabricate.
- **Closed today:** the quick-info line and the ÖPPET badge render NOTHING (no "Stängt" fabrication unless the maintainer blesses a "Stängt idag" copy — default to omit, matching the current "never fabricate" rule from 11.4/11.6).

### Data flow (where each field lives)

- **`opening_hours` column** → `venue-store.ts` `VENUE_SELECT_COLUMNS` (kept) → `fromVenueRow`/`detailFromRow` maps `row.opening_hours` → `detail.openingHours` (`:540`) → `StoredVenue` → **list DTO** via `toVenueData` (`:272`, 11.4 surfaced it on `VenueDataDto`) AND **detail DTO** via `[slug]/route.ts buildDetailDto` (`:175`). Both quick-info (`MapView.tsx:1226,1255` → `VenueQuickInfo openingHours` prop) and detail (`VenueDetailContent.tsx:130,254`) consume it.
- **`peak_time`** → store `peakTime` (`:35,86,305,541`) → detail route `buildDetailDto` fixture fallback (`:157`). Removed. The REAL engine `peakTime` (`sun-engine.ts:786,1061 peakTimeFromTimeline`) and `timeline.peakTime` DTO (`api.ts:175`) are a DIFFERENT, live-computed value — UNTOUCHED (Story 11.6 retro-note confirms the subtitle that consumed the stored value was already removed; the engine function shares the name only). `venue-visual-metadata.ts:228` reads `venue.timeline.peakTime` (engine) — keep.
- **`shadow_warning_minutes`** → store `shadowWarningMinutes` (`:36,87,306,542`) → detail route spread (`:182`) → `VenueDetailDto.shadowWarningMinutes` (`api.ts:165`). Rendered NOWHERE (tests only). Removed end-to-end.

### Migration ground truth

- Live schema is defined by `_bmad-output/implementation-artifacts/8-2-venues-store-contract.sql` (+ Story 9.7 `tags` column). Current `id` is `text primary key` with NO default (the generated `Insert` type requires `id: string`). `reviews.venue_id` / `feedback.venue_id` are BOTH `text not null` (`3-3-reviews-contract.sql:11`, `3-2-feedback-contract.sql:14`) — this is exactly why the maintainer chose to KEEP the `text` PK: an identity/serial migration would break these free-text joins.
- **Live DB connection:** direct host is IPv6-only; use the IPv4 session pooler (`aws-1-eu-west-1`) via Docker `psql` (creds in gitignored `.env.local`), OR the Supabase MCP tools against project `hhnbxrhfhlzxgllxukzj`. Prefer `apply_migration` for the DDL. Before applying, `list_tables` / introspect `information_schema.columns` to confirm the live `id` default is null and the current `opening_hours` rows, so the seed rewrite matches reality.
- The seed rewrite must keep `test-venue-sunny` (`id "1"`) byte-compatible on the values its gate asserts (see `8-2` smoke check: `id, slug, venue_name, neighborhood, lat, lng, is_partner, current_sun_status, confidence, sun_exposure_percent, sun_window`). Its `opening_hours` was `{"display":"Öppet till 22:00","closesAt":"22:00"}`; the new shape must derive "Öppet till 22:00" / `closesAt "22:00"` for the weekday(s) the gate/tests assert.
- Idempotency: `drop column if exists`, `create sequence if not exists`, `add column if not exists`, `on conflict (id) do update` seed. Re-running must be safe on both a fresh and an already-migrated table.

### New formatter — reuse existing precedent

- `lib/utils/time-planner.ts` already exports `STOCKHOLM_TIME_ZONE`, `stockholmDateKey`, `formatTimeInStockholm`, and uses `Intl.DateTimeFormat('sv-SE', { timeZone: STOCKHOLM_TIME_ZONE, ... })`. Reuse this pattern for the weekday derivation (`{ weekday: 'long' }` or map from a stable numeric weekday) — do NOT reinvent timezone handling or pull in a new date lib. `date-fns-tz` is available (`lib/solar/timezone-utils.ts`) if a `toZonedTime` approach is cleaner, but `Intl` is the established convention for display formatting here.
- Keep the formatter PURE (inject `now: Date` and `locale`) so it is deterministically unit-testable across weekdays, closed days, and past-midnight — do NOT read `new Date()` inside it. The e2e time-determinism convention forces `?_time=` for wall-clock-sensitive specs; a pure formatter sidesteps that flake for the weekday logic.

### Constraints (epic-wide, ratified by earlier Epic 11 stories)

- **NEVER fabricate a value.** 11.4 (quick-info) and 11.6 (detail badge) both established: absent opening hours → render NOTHING, never a stand-in "Öppet"/"22:00". Preserve this for closed-today / no-hours-today. The 11.6 detail badge already omits the badge when `closesAt` is absent (`VenueDetailContent.tsx:163-172`) and uses a same-box `Skeleton` while loading — keep both.
- **Byte-identical visual = no rebaseline.** The Design Gate goal is the derived display MATCHES the current treatment. If it does, no PNG rebaseline is needed. If it visibly shifts, dev is FORBIDDEN from self-blessing references (project-wide inversion, reaffirmed across 11.4/11.6/11.7) — flag a maintainer follow-up in Completion Notes. 11.7 owned the consolidated Epic 11 rebaseline; it is already done, so avoid re-triggering it.
- **`closesAt` ÖPPET badge has no is-open guard (deferred, now RELEVANT).** Deferred item (epic-11 review): the current `closesAt` badge shows whenever `closesAt` is present, with NO "is the venue open right now?" check — it worked only because the old store populated `closesAt` for the current open interval. This story is EXACTLY the trigger: per-weekday hours are a data-layer change. The formatter now derives `closesAt` from TODAY's `close`, so the badge naturally reflects the current weekday — but it still shows "ÖPPET · {close}" even before opening / after closing within a day. **Decision for this story:** derive the badge from today's hours (weekday-correct, satisfying AC2's "reflects the CURRENT weekday"); a full minute-precise is-open-now guard (hide the badge before `open` / after `close`) is OUT of scope UNLESS trivial to add in the formatter — if you add it, gate it behind the derived open/closed state and do NOT fabricate. Note the decision in Completion Notes so the deferred item can be closed or re-scoped.
- **`obscuredPosition` orphaned i18n keys (epic-10 defer).** `quickInfo.obscuredPosition` / `detail.obscuredPosition` are dead — unrelated to this story; do NOT touch or reopen them.
- **`isDesktopViewport()` / recenter padding constants** and the slider/sheet gesture magic numbers are unrelated to this story — do NOT touch.
- **Server-only columns are OUT of scope.** `seating_area` / `seating_elevation_m` / `ground_elevation_m` are never serialized into the DTO and MUST stay untouched by the migration (only the RLS + these columns being preserved is asserted in AC6).
- **CI-determinism (11.4 seam):** on the SEED path (flag OFF — what CI runs) `getVenues()` returns raw `VENUE_FIXTURE` (`venue-store.ts:204-206`), NOT the `VENUE_DETAIL_SEED` merge. 11.4 added `openingHours` directly onto the two sunny `VENUE_FIXTURE` entries (`venues-fixture.ts:58,83`) so the "renders opening hours" branch is reachable on CI. When you convert the shape, convert those FIXTURE entries too, and keep at least one present-case + one absent-case fixture so both formatter branches (has-hours-today / no-hours-today) are covered deterministically without live Supabase.
- **EOL hygiene (11.7):** `.gitattributes` now enforces `eol=lf` on source extensions. Author the new `.ts`/`.md`/`.sql` files with LF endings; avoid CRLF churn in edited files.

### Persistent facts

- The app is LIVE on the real-data path; this migration touches production data → apply carefully, idempotently, reviewed, with smoke checks recorded.
- `test-venue-sunny` (`id "1"`) is the dev visual-gate slug; production data never uses it. Keep it byte-stable on gate-asserted values.
- RLS on `public.venues`: enabled, deny-by-default, single `venues_service_read` policy (`to service_role`, SELECT-only). Runtime reads via `getSupabaseServiceRole()` (bypasses RLS). No anon/authenticated read path.
- `messages-parity.test.ts` enforces sv/en structural identity — any new i18n key goes into BOTH locales.
- The Supabase types file `lib/supabase/types.ts` is generated — regenerate it after the DDL so the Row/Insert/Update reflect the dropped columns.

### Testing

- **Formatter unit tests (`lib/utils/opening-hours.ts`)** are the primary proof: cover open-today (display + closesAt), closed-today (→ `{}`, renders nothing), no-hours-at-all (→ `{}`), past-midnight close (opens 18:00 closes 02:00 → "Öppet till 02:00"), and each weekday selection against a fixed `now` in `Europe/Stockholm`. Inject `now` — never read wall clock.
- **Store adapter tests (`test/unit/services/venue-store.test.ts`)**: assert `fromVenueRow`/`coerceOpeningHours` maps the new jsonb shape, drops malformed → undefined, and that `peak_time`/`shadow_warning_minutes` are gone from `VENUE_SELECT_COLUMNS` and no longer mapped.
- **Detail route tests (`test/unit/api/venue-detail-route.test.ts`, `venues-route-real-engine.test.ts`)**: remove the `shadowWarningMinutes` / stored-`peakTime` assertions; keep the engine `timeline.peakTime` assertions. Confirm `openingHours` still serializes (new shape) and absent hours serialize honestly.
- **Component tests (`VenueDetailContent.test.tsx`, `VenueDetailOverlay.test.tsx`, quick-info)**: drive the derived display + badge via props for present / absent / closed-today branches; assert the same-box Skeleton→badge swap and that no closing time renders when hours are absent.
- **e2e (`epic-10-weather-matrix.spec.ts` + venue-detail/quick-info specs)**: update any assertion on the removed fields; if a spec is wall-clock-sensitive for the weekday, force a fixed instant. FULL e2e sweep recommended (11.8 retro-note: cross-epic test drift is caught only by full-suite sweeps).
- **Gate discipline:** the seed path (flag OFF) is what CI runs and must stay green; the real-engine path is opt-in. Run `typecheck` + `lint` + full `test` before handoff.

### Project Structure Notes

- New files: `lib/utils/opening-hours.ts` (+ `test/unit/utils/opening-hours.test.ts`), `_bmad-output/implementation-artifacts/11-9-venue-data-model-cleanup.sql` (migration handoff artifact — mirrors the `*.sql` sibling convention of `8-2`/`3-2`/`3-3`).
- Edited: `lib/services/venue-store.ts`, `lib/services/venues-fixture.ts`, `lib/types/api.ts`, `lib/supabase/types.ts` (regenerated), `app/api/venues/[slug]/route.ts`, `components/composed/venue/VenueQuickInfo.tsx`, `components/composed/venue/VenueDetailContent.tsx`, `components/custom/map/MapView.tsx` (label/derive wiring), `components/custom/venue/forced-venue-detail.ts`, `components/custom/venue/ForcedVenueDetailInitialFrame.tsx`, `messages/sv/venue.json`, `messages/en/venue.json`, `nextjs-app/docs/venue-data-load.md`, plus the tests listed above.
- No conflicts with the unified structure. The store remains server-only (client must never import `venue-store.ts`); the formatter is client-safe (pure, no server imports).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 11.9: Venue Data Model Cleanup] — full ACs + maintainer decision (2026-07-06)
- [Source: nextjs-app/docs/venue-data-load.md] — current data-load template (to be rewritten, AC5)
- [Source: _bmad-output/implementation-artifacts/8-2-venues-store-contract.sql] — live `public.venues` schema + seed + RLS the migration must preserve
- [Source: _bmad-output/implementation-artifacts/3-3-reviews-contract.sql#venue_id / 3-2-feedback-contract.sql#venue_id] — free-text `text` join columns that force keeping the `text` PK (AC1)
- [Source: nextjs-app/lib/services/venue-store.ts] — store adapter (openingHours/peakTime/shadowWarningMinutes flow, coerce* helpers, VENUE_SELECT_COLUMNS)
- [Source: nextjs-app/lib/types/api.ts#VenueDataDto/VenueDetailDto/VenueSunTimelineDto] — DTO shapes (openingHours list-optional/detail-required, timeline.peakTime engine value, shadowWarningMinutes)
- [Source: nextjs-app/lib/utils/time-planner.ts] — `Intl.DateTimeFormat` + `Europe/Stockholm` precedent for the new formatter
- [Source: nextjs-app/components/composed/venue/VenueDetailContent.tsx:126-172,244-256] — ÖPPET badge + Öppettider row (11.6 same-box swap; closesAt guard)
- [Source: nextjs-app/components/composed/venue/VenueQuickInfo.tsx:34-40,271-288] — opening-hours line (11.4; text-text-body AA)
- [Source: nextjs-app/app/api/venues/[slug]/route.ts:140-186] — `buildDetailDto` peakTime/openingHours/shadowWarningMinutes wiring
- [Source: _bmad-output/auto-bmad/retro-notes/epic-11.md] — epic-wide gotchas (never-fabricate, byte-identical rebaseline, full-suite e2e sweep, EOL hygiene)
- [Source: _bmad-output/implementation-artifacts/deferred-work.md — "closesAt ÖPPET badge has no is-open guard"] — the deferred item this story triggers (AC2 weekday derivation)
- [Source: CLAUDE.md + AGENTS.md] — repo-level agent rulebook: local Docker/WSL scope limits, baseline typecheck/lint before editing, test-gate commands (`npx tsc --noEmit` / `npx eslint . --quiet` / `npx vitest run` / `npx playwright test`), and the `nextjs-app/docs/venue-data-load.md` pointer for adding real venues
- [Source: project-context.md] — project design + screen map / AI rules
- [Source: _bmad-output/planning-artifacts/architecture.md] — data layer, env-gated fixture/real store, API + DTO conventions the store adapter follows
- [Source: nextjs-app/docs/design/DESIGN.md] — design tokens (the opening-hours line / ÖPPET badge styling must stay within tokens; `text-text-body` for AA)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — venue quick-info / detail UX (opening-hours treatment, honest-copy posture)

## Dev Agent Record

### Agent Model Used

Opus 4.8 (1M context) — `claude-opus-4-8[1m]` (auto-bmad dev-story delegate).

### Debug Log References

- Live migration applied via Docker `psql` on the IPv4 session pooler
  (`aws-1-eu-west-1.pooler.supabase.com:5432`, `SUPABASE_DB_POOLER_URL` in the
  gitignored root `.env.local`) using the local `public.ecr.aws/supabase/postgres:17.6.1.141`
  image. The Supabase MCP `apply_migration`/`execute_sql` tools were NOT exposed in
  this delegate session (OAuth not active), so the documented Docker-`psql` fallback
  was used. Migration re-run once → idempotent (no errors, still 7 rows, next auto id 8).
- Applied smoke-check results (all green):
  - `id` default → `(nextval('venues_id_seq'::regclass))::text`; `nextval` → 8 (reset back to 7).
  - `peak_time` / `shadow_warning_minutes` columns → 0 rows in `information_schema` (dropped).
  - Gate venue `test-venue-sunny` (id "1") resolves byte-identical core values; `opening_hours->'1'->>'close'` = `22:00`; no `display` key on any row.
  - Server-only columns `seating_area` / `seating_elevation_m` / `ground_elevation_m` present + untouched.
  - RLS enabled (`relrowsecurity = t`); single `venues_service_read` (SELECT, `{service_role}`) policy; deny-by-default grants (only `postgres` + `service_role`).
- Gates: `npx tsc --noEmit` exit 0; `npx eslint . --quiet` exit 0; `npx vitest run` → 150 files / 1416 tests all pass; e2e `epic-10-weather-matrix` (10) + `map-primary` (21) pass.

### Completion Notes List

- **AC1 (auto-assign text PK):** kept `id text primary key`; added `venues_id_seq` +
  `alter column id set default nextval('venues_id_seq')::text` and advanced the sequence
  past the seed max so the next auto id is `"8"`. No PK-type change, no FK — the free-text
  `reviews.venue_id` / `feedback.venue_id` joins are preserved. Generated `Insert.id`
  became optional in `lib/supabase/types.ts` to reflect the default.
- **AC2 (per-weekday hours):** new `WeeklyOpeningHours` type (`Partial<Record<string, OpeningInterval | null>>`,
  numeric ISO weekday keys 1=Mon..7=Sun; missing/`null` = closed; `close<open` = past-midnight)
  in `lib/types/api.ts`, consumed by the store, the DTOs, and the new pure formatter
  `lib/utils/opening-hours.ts#formatOpeningHours(hours, now, locale, template) → { display?, closesAt? }`.
  The store `coerceOpeningHours` is a defensive boundary (null/malformed → `undefined`,
  never a throw). The quick-info derive is computed in `MapView` (component stays
  presentational); the detail derive is computed inside `VenueDetailContent` (it owns the
  ÖPPET badge + Öppettider row). Seed venues open 11:00 and close at their previous
  close-time **every weekday**, so the derived "Öppet till HH:MM" is byte-stable regardless
  of run-day and the gate venue still reads "22:00".
- **AC3 (peak_time):** dropped the column + the store→DTO passthrough + the route's
  `?? fixture?.peakTime` fallback. The ENGINE `timeline.peakTime` (`sun-engine.ts#peakTimeFromTimeline`
  → `api.ts VenueSunTimelineDto.peakTime` → `venue-visual-metadata.ts:228`) is a DIFFERENT,
  live-computed value — untouched and asserted as a regression guard.
- **AC4 (shadow_warning_minutes):** dropped end-to-end — column + CHECK, `StoredVenueDetail`,
  `VenueRow`, `VenueDetailDto.shadowWarningMinutes`, the route spread, and the asserting tests
  (grep confirmed ZERO non-test readers). **Original intent (documented):** it was a
  "minutes-until-shadow" hint captured at venue-load time, but no UI surface ever rendered it
  (Story 11.6 removed the last subtitle that might have; it was carried store→DTO and read only
  by tests) — so it is removed rather than surfaced.
- **AC5:** rewrote `nextjs-app/docs/venue-data-load.md` — `id` auto-assigned (author omits it),
  the per-weekday `opening_hours` shape (with a worked past-midnight + Sunday-closed example),
  `peak_time`/`shadow_warning_minutes` rows removed; the `seating_*` guidance is verbatim.
- **AC6:** the migration is idempotent (`create sequence if not exists`, `drop column if exists`,
  `on conflict (id) do update` seed), leaves RLS + the single service-role policy + the server-only
  columns untouched, and was applied live as a reviewed step with recorded smoke checks (above).
- **Deferred item this story triggers — "`closesAt` ÖPPET badge has no is-open guard":** decided
  per Dev Notes to derive the badge from **today's** close (weekday-correct, satisfying AC2's
  "reflects the CURRENT weekday"). A full minute-precise is-open-now guard (hide before `open` /
  after `close`) was **NOT** added — it is not trivial in the shared formatter and would risk the
  byte-identical visual gate. The deferred item can therefore be narrowed to "no intra-day open/closed
  guard" (the weekday-correctness half is now solved) or re-scoped to a follow-up.
- **Behavioral improvement (not a visual regression):** the quick-info opening-hours line is now
  DERIVED via a locale-aware template, so under the English locale it reads "Open until 22:00"
  instead of the old raw stored Swedish string. At the sv-default gate the treatment is byte-identical
  ("Öppet till 22:00"), so **no reference-PNG rebaseline was triggered** (dev is forbidden from
  editing references; none needed).
- **Design Gate — Visual validation:** the derived quick-info line + ÖPPET detail badge match the
  CURRENT visual treatment byte-for-byte on the gate venue (sv default). No proportion/centering shift.
  No rebaseline needed; no maintainer follow-up flagged.

### File List

**New:**
- `nextjs-app/lib/utils/opening-hours.ts`
- `_bmad-output/implementation-artifacts/11-9-venue-data-model-cleanup.sql`

**Modified (source):**
- `nextjs-app/lib/types/api.ts`
- `nextjs-app/lib/services/venue-store.ts`
- `nextjs-app/lib/services/venues-fixture.ts`
- `nextjs-app/lib/supabase/types.ts` (regenerated to match applied schema)
- `nextjs-app/app/api/venues/[slug]/route.ts`
- `nextjs-app/components/composed/venue/VenueQuickInfo.tsx`
- `nextjs-app/components/composed/venue/VenueDetailContent.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/venue/forced-venue-detail.ts`
- `nextjs-app/components/custom/venue/ForcedVenueDetailInitialFrame.tsx`
- `nextjs-app/messages/sv/venue.json`
- `nextjs-app/messages/en/venue.json`
- `nextjs-app/docs/venue-data-load.md`

**Modified (tests):**
- `nextjs-app/test/unit/utils/opening-hours.atdd.test.ts` (un-skipped + wired to the real formatter)
- `nextjs-app/test/unit/services/venue-store.opening-hours-shape.atdd.test.ts` (un-skipped)
- `nextjs-app/test/unit/api/venue-detail-route.data-cleanup.atdd.test.ts` (un-skipped)
- `nextjs-app/test/components/VenueDetailContent.opening-hours-derived.atdd.test.tsx` (un-skipped)
- `nextjs-app/test/unit/services/venue-store.test.ts`
- `nextjs-app/test/unit/api/venue-detail-route.test.ts`
- `nextjs-app/test/unit/api/venues-route.test.ts`
- `nextjs-app/test/unit/api/venues-route-real-engine.test.ts`
- `nextjs-app/test/unit/queries/useVenueDetail.test.ts`
- `nextjs-app/test/unit/mutations/useSubmitReview.test.tsx`
- `nextjs-app/test/components/VenueDetailContent.test.tsx`
- `nextjs-app/test/components/VenueDetailOverlay.test.tsx`
- `nextjs-app/test/components/VenueQuickInfo.test.tsx`
- `nextjs-app/test/components/MapView.test.tsx`
- `nextjs-app/test/components/FeedbackFlow.test.tsx`
- `nextjs-app/test/components/ReviewFlow.test.tsx`
- `nextjs-app/test/e2e/epic-10-weather-matrix.spec.ts`

### Change Log

- 2026-07-06 — Story 11.9 implemented: venues auto-assign a text id, opening hours are
  per-weekday (display derived at render time), `peak_time` + `shadow_warning_minutes`
  removed end-to-end. Live migration applied + verified. Status → review.

### Review Findings

**Round 1 of 3**

- [x] [Review][Decision][Med] DISMISSED (won't-fix, human call 2026-07-06: engine-derived by design per AC3; seed path never fed a real projection peak; only the engine reader consumes timeline `peakTime`) — `peakTime` fixture/seed fallback dropped from `buildDetailDto` with no seed-path replacement — `route.ts` now sets `const peakTime = timelineProjection?.peakTime;`, deleting the `?? fixture?.peakTime` fallback and the per-venue seed `peakTime` values. On the seed/fixture path (flag OFF — what CI runs) and any degraded/geometry-only response where no live timeline projection produces a peak, the detail timeline now carries NO `peakTime` where the stored seed value (e.g. `15:30`) previously surfaced. The story asserts (AC3) the fallback was a stored-column echo and the real engine computes `peakTime` live from the timeline, so no *user-visible* surface loses a real value — but that hinges on whether any detail surface renders the timeline `peakTime` on the seed path. No test pins the "seed detail with no live projection still yields a peakTime" case (see the AC3 no-op test below). [`nextjs-app/app/api/venues/[slug]/route.ts:157`] Sources: blind@primary + edge@primary + edge@secondary. Recommended: dismiss: the field is engine-derived by design (AC3); the seed path never fed a real projection peak, and the removed value was a non-computed stored echo the story deliberately dropped — confirm no detail surface reads the timeline `peakTime` on the seed path (Task 4.1 grep found only the engine reader) and close.
- [x] [Review][Patch][Low] RESOLVED (2026-07-06): `stockholmIsoWeekday` now returns `number | undefined` and drops the `?? 1` Monday default — an unrecognized `Intl` token degrades to `undefined`, and `formatOpeningHours` short-circuits to `{}` on `undefined` weekday so the honest "renders nothing" fallback fires instead of fabricating Monday's hours. Added a NEVER-FABRICATE unit test stubbing `Intl.DateTimeFormat` to yield an out-of-range token → derivation returns `undefined`. [`nextjs-app/lib/utils/opening-hours.ts`, `nextjs-app/test/unit/utils/opening-hours.coverage.test.ts`] — `stockholmIsoWeekday` maps an unrecognized weekday token to Monday (`?? 1`) — if `Intl.DateTimeFormat('en-US', { weekday: 'short' })` ever returns a token outside Mon..Sun (locale-data drift / non-Gregorian / ICU quirk), the venue silently derives Monday's hours on the wrong day, fabricating an open/close state — the exact never-fabricate violation the whole story is built to avoid. Degrade to `undefined`/closed instead of a concrete weekday so the honest "renders nothing" fallback fires. [`nextjs-app/lib/utils/opening-hours.ts:795`] Sources: blind@primary + blind@secondary + edge@primary + edge@secondary.
- [x] [Review][Defer][Med] ÖPPET badge + "Öppet till HH:MM" line have no is-open-now guard (past-midnight + intra-day) — the formatter derives `closesAt`/`display` from today's weekday entry whenever it is well-formed, with NO check that `now` falls within `[open, close]`. So a venue that opens 18:00 renders "ÖPPET · 22:00" at 09:00, and a past-midnight venue (opens 18:00 closes 02:00) that is genuinely open at 01:00 reads *today's* weekday row (not yesterday's session) → can show closed. [`nextjs-app/lib/utils/opening-hours.ts:838`] — deferred, pre-existing (explicitly the "`closesAt` ÖPPET badge has no is-open guard" deferred item; Dev Notes + Completion Notes knowingly leave the intra-day/past-midnight guard out of scope — weekday-correctness half is now solved). Sources: blind@primary + blind@secondary + edge@primary + edge@secondary + auditor@primary.
- [x] [Review][Defer][Low] `MapView` `quickInfoOpeningHours` memo can go stale across a local-midnight boundary — `new Date()` is read inside a `useMemo` keyed only on `[selectedQuickInfoVenue, locale, tVenue]`, so a quick-info card held open (uninteracted) across the Stockholm weekday rollover keeps showing the prior day's derived hours until a dep changes. The detail path (`VenueDetailContent`, unmemoized) recomputes every render, so the two derivation sites also skew. Value stays honest for the weekday it was computed on. [`nextjs-app/components/custom/map/MapView.tsx:558`] — deferred, pre-existing (new code, but negligible unrealistic trigger; no fabrication). Sources: edge@primary + edge@secondary + blind@secondary + auditor@primary.
- [x] [Review][Defer][Low] AC3 `peakTime` route test is a no-op guard — the peakTime assertion in `venue-detail-route.data-cleanup.atdd.test.ts` is wrapped in `if (body.venue.timeline.windows.length > 0)`, so if the route returns an empty window array (the very regression AC3 could cause) the test passes with zero assertions; likewise the "no hours serializes honestly" test admits it only checks a negative property against a venue that HAS hours (no hours-less slug exists), so it never exercises the absent-hours branch it is named for. [`nextjs-app/test/unit/api/venue-detail-route.data-cleanup.atdd.test.ts`] — deferred, pre-existing (test-coverage adequacy tied to the peakTime Decision; not a runtime defect this diff introduced). Sources: blind@primary + blind@secondary.
