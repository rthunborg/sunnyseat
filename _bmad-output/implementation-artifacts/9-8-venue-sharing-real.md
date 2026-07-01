# Story 9.8: Venue Sharing (Real)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to share a venue's sun status with a friend,
so that I can invite someone to a sunny spot.

## Acceptance Criteria

_(Verbatim from epics.md §"Story 9.8: Venue Sharing (Real)". The reference `ShareModal.jsx` and the illustrative `https://sunnyseat.app/v/<slug>` URL in the reference are design guides — SunnySeat's real deep-link is the existing `?venue=<slug>` query param, NOT a new `/v/<slug>` path route. Do NOT invent a new routing surface. See Dev Notes → "The shareable URL — reuse the EXISTING routing".)_

1. **Given** the venue-detail share (↗) button is currently a disabled stub with no handler, **When** sharing is implemented, **Then** the button is enabled and wired: on mobile it invokes the native `navigator.share()` with the venue link/title; on desktop it opens a share surface (copy-link + share targets) modeled on the reference `ShareModal.jsx`.

2. **Given** mobile currently has no share entry point in the venue header, **When** sharing ships, **Then** the share affordance is available on mobile as well as desktop, using the existing `detail.share` i18n string.

3. **Given** the share link is opened by a recipient, **When** they land on the venue, **Then** the deep-link resolves to the correct venue detail (reusing existing routing/slug handling).

### Design Gate Criteria

_(Frontend story — a new interactive control (enabled share button) + a new surface (desktop share modal). Carried verbatim from epics.md §"Story 9.8 → Design Gate Criteria". Real screenshot gate, not a no-visual-change confirm. See "Visual gate on this host" in Dev Notes for the mandatory manual affordance.)_

- **Visual:** Share button (enabled) + desktop share surface match the reference styling.
- **Behaviour:** Native share on mobile; copy-link + targets on desktop; deep-link resolves.
- **Animation:** Share surface open/close matches modal transition spec.
- **Visual validation:** Screenshot of the enabled share control + desktop share surface passes before QA handoff.

## Tasks / Subtasks

- [x] **Task 1 — Build the shareable venue deep-link + share payload from the EXISTING routing (AC: #1, #3)**
  - [x] **REUSE the existing deep-link, do NOT invent a new API surface.** The venue detail is reached by the `?venue=<slug>` query param on the current locale path (`MapView.handleOpenDetails` pushes `{ pathname, query: { …, venue: slug } }` — `MapView.tsx:651-661`). A recipient landing on `…/?venue=<slug>` already resolves to the correct detail via `venueSlugParam = searchParams.get('venue')` + `venueMatchesSlug` / `fallbackVenueFromSlug` (`MapView.tsx:143,491-515,1146-1152`). AC3 is therefore ALREADY satisfied by the existing routing — the share URL must simply point at it. Add a regression test proving a `?venue=<slug>` deep-link opens the detail (guard against a future routing change silently breaking share links). → DONE: `buildVenueShareUrl` in `lib/utils/share.ts` produces `?venue=<slug>` only; AC3 regression test added to `MapView.test.tsx`.
  - [x] **Construct the share URL at click time from `window.location`.** `` `${window.location.origin}${pathname}?venue=${encodeURIComponent(slug)}` `` where `pathname` preserves the current locale prefix (`localePrefix: 'as-needed'` → sv is unprefixed `/`, en is `/en`). Do NOT hardcode `https://sunnyseat.app` (the reference's literal URL is illustrative; the real origin is runtime). The `slug` comes from the detail venue already in scope (`detail.slug ?? fallbackVenue.slug ?? fallbackVenue.venueSlug`). Building the URL from other params is a scope choice — default: `?venue=<slug>` ONLY (drop `_state`, `_time`, `_date`, tag filters) so the recipient gets a clean venue link, not the sharer's planner state (Open Question 1). → DONE: `currentVenueShareUrl` reads live `window.location` (origin+pathname+search — NOT next-intl `usePathname()`, which strips the `/en` prefix); strips `_state/_time/_date/tags`.
  - [x] **This is a share/deep-link URL, NOT a native-maps URL — the routing-boundary contract does NOT apply.** `test/unit/routing-boundary.test.ts` pins `window.open(` to the single MapView call site and native-map URL builders to `lib/services/routing.ts`. `navigator.share` / `navigator.clipboard` are neither, so the share code does NOT need to route through `lib/services/routing.ts` and MUST NOT introduce a second `window.open(`. Verify the routing-boundary test stays green after your change. → DONE: no `window.open(`; share targets open via `<a href target="_blank">`; routing-boundary suite green (had to phrase doc comments to avoid the literal pinned patterns).
  - [x] **Provide `title` + `text` for the native-share payload.** `navigator.share({ title: <venueName>, text: <localized share text>, url })`. Reuse the venue name already in scope (`fallbackVenue.venueName`). → DONE: `title = fallbackVenue.venueName`, `text = detail.shareModal.shareText` with `{name}` interpolated, `url` from the builder.

- [x] **Task 2 — Enable + wire the share button in the venue-detail header, on BOTH mobile and desktop (AC: #1, #2)**
  - [x] **Desktop: enable the currently-disabled stub.** Removed `disabled`, added `onClick={handleShare}`; kept the `Share2` icon + `ChromeButton` frosted-pill styling.
  - [x] **Mobile: ADD the missing share button.** Added a `ChromeButton label={labels.share}` with `Share2` into the mobile top-right cluster (Heart / Share / Close — Open Question 2 default: top-right cluster, consistent with desktop + reuses the existing component).
  - [x] **Thread an `onShare` (or share-open) callback through `VenueDetailOverlayProps`.** Open Question 3 default chosen: the OVERLAY owns `shareOpen`/`shareUrl` state + renders `<ShareModal>` (mirrors the reference `VenueDetail.jsx`). MapView stays the data source via `fallbackVenue` (name/slug); no `onShare` prop needed since the overlay builds the URL from `window.location` and dispatches share itself. This is a cleaner single-owner design than an `onShare` callback.
  - [x] **Preserve all existing overlay semantics.** drag-to-dismiss, favourite toggle, close, `role="dialog"`/`aria-modal`, reduced-motion — all unchanged; the share button + modal are purely additive. Existing overlay tests still pass.

- [x] **Task 3 — Native Web Share (mobile) with graceful degradation → the copy-link + targets surface (AC: #1)**
  - [x] **Feature-detect `navigator.share` at click time, not render time.** `shareVenueNatively` checks `typeof navigator.share === 'function'`, calls `navigator.share(...)` in try/catch, returns a typed outcome (`shared`/`cancelled`/`unsupported`/`failed`). Capability-based, not a viewport check.
  - [x] **Graceful degradation is the headline reliability requirement.** `unsupported`/`failed` → open the modal; `cancelled` (AbortError) → swallowed silently, no error, no modal. SSR-safe (client-only, reads `window`/`navigator` only in the click handler).
  - [x] **Optional refinement (default: SKIP for MVP):** `navigator.canShare` pre-gate skipped — the `typeof` + try/catch is sufficient.

- [x] **Task 4 — Desktop share surface: copy-link + share targets modal, modeled on `ShareModal.jsx` (AC: #1)**
  - [x] **Build a new `ShareModal` component, NOT inline JSX.** New `components/custom/venue/ShareModal.tsx` (co-located with the overlay).
  - [x] **Model the SHELL on the existing `SettingsModal.tsx`.** `<AnimatePresence>` + `motion.div` scrim (`z-modal`, `backdrop-blur-standard`, `bg-text-primary/30`) + responsive card (bottom-sheet mobile / centered desktop via `lg:` utilities), Escape-to-close, `trapFocus`/`focusableElements`, scrim-`onPointerDown`-close + card stopPropagation. `z-modal` (60) sits above the detail overlay's `z-bottom-sheet-full` (50) — verified in the captured screenshots.
  - [x] **Copy-link row with clipboard + "Kopierad" feedback.** Monospace ellipsis-truncated URL + "Kopiera länk" button; `navigator.clipboard.writeText` guarded by a capability check + try/catch; flips to "Kopierad" for 1800 ms then reverts. Used a literal `COPIED_FEEDBACK_MS = 1800` constant (no exact `--duration-*` token — flagged as a token gap). Legacy `document.execCommand` fallback intentionally OMITTED (modern clipboard only).
  - [x] **Share targets.** Open Question 4 default (a-partial): wired the tiles with a real public web share-intent — WhatsApp (`wa.me`), Facebook sharer, X (`twitter.com/intent`), Telegram (`t.me/share`), and email (`mailto:`). OMITTED Instagram/Snapchat/Messenger (no reliable public web share-intent — a dead tile would reproduce the exact defect this epic fixes). Every rendered tile is a functional `<a href>`; the copy-link row is the guaranteed-functional primary path.
  - [x] **i18n the modal copy.** New `detail.shareModal.*` keys (title/subtitle/copyLink/copied/close/shareText/target) in BOTH `sv` and `en` `venue.json`; button aria-label reuses `detail.share`. No hardcoded Swedish in the component.

- [x] **Task 5 — Tests for THIS story's behaviour (AC: #1, #2, #3)**
  - [x] **AC1/AC3 — share URL + deep-link resolution.** `test/unit/share.test.ts` pins the builder (encodes slug, preserves `/en`, drops planner/dev params, overrides existing `venue`). `MapView.test.tsx` adds a named share-deep-link AC3 regression guard.
  - [x] **AC1 native share.** `VenueDetailOverlay.test.tsx` — `navigator.share` mocked: click calls it with `{title,text,url}` and does NOT open the modal; AbortError swallowed (no error, no modal); `navigator.share` deleted → modal opens; non-abort rejection → modal opens.
  - [x] **AC1 copy-link.** `ShareModal.test.tsx` — clicking "Kopiera länk" writes the URL and flips to "Kopierad"; a rejected write does NOT flip.
  - [x] **AC2 mobile + desktop presence.** Overlay test asserts the enabled `Dela plats` button is present in BOTH `mobile-venue-detail-sheet` and `desktop-venue-detail-panel` and is not disabled; the stale desktop `toBeDisabled()` assertion updated to `toBeEnabled()`.
  - [x] **i18n parity.** `messages-parity.test.ts` green with the new keys.
  - [x] **Host-gate survivor pattern.** Implemented-first, then tested against the real component (no red-scaffold dynamic-import dance needed).

- [x] **Task 6 — Test gate + regression verification + visual gate (standard gate)**
  - [x] `npx tsc --noEmit` → 0 · `npx eslint . --quiet` → 0 · `npx vitest run` → all green. HEAD baseline confirmed 102 files / 873 tests; after this story **104 files / 899 tests** (+2 files, +26 tests, none dropped).
  - [x] **No regression** in `VenueDetailOverlay` / `MapView` detail-render / `SettingsModal` / `messages-parity` / `routing-boundary` suites. Overlay chrome (drag-dismiss, favourite, close, dialog a11y) unchanged except the additive share button.
  - [x] **Visual gate (manual affordance — host `/tmp` bug).** The automated `visual-validate.sh` remains blocked on this host (Windows Playwright cannot write `/tmp/impl-XXXXXX.png`) — script left UNMODIFIED. Manual affordance used: wiped `.next`, ran a fresh `next dev` (port 3100), and captured Windows-safe screenshots of the enabled desktop + mobile share buttons AND the desktop + mobile share modals for maintainer review (scratchpad). DOM-level rendering verified exhaustively via tests.
  - [x] **Visual references.** Verified the share button + modal render correctly via DOM inspection + captured screenshots. The `venue-detail` reference PNGs predate the enabled/mobile-share state (Story 9.1 already left them needing rebaseline) and there is NO reference for the NEW share modal — rebaselining is a MAINTAINER decision; the dev agent did NOT edit reference PNGs. Any `venue-detail` gate FAIL here is expected drift routed to maintainer rebaseline.
  - [x] Move Status to `review` (story file + sprint-status). The orchestrator owns gate/commit/PR.

## Dev Notes

### Why this exists (root cause — Spine 3 of the Epic 9 triage)

Per the Epic 9 party-mode triage (root cause #3, "dead/unwired controls — visual shell without plumbing"): the venue-detail share (↗) button is currently a **disabled visual shell with no handler** (`VenueDetailOverlay.tsx:136-138`, `<ChromeButton label={labels.share} disabled>`). Story 9.6 consolidated map chrome and explicitly LEFT the venue-detail share button to this story (retro-notes 9-6 + the 9.6 create-story note: "LEAVE … the venue-detail share button (Story 9.8)"). This story builds sharing for real: enable + wire the button, add native Web Share on mobile, a copy-link + targets fallback on desktop, and confirm the deep-link resolves.

### The exact current state (read before touching code)

- **Desktop share button is a disabled stub** — `VenueDetailOverlay.tsx:136-138` inside the `mode === 'desktop'` chrome cluster (Heart at `:123-135` / Share at `:136-138` / Close at `:139-141`). It uses the local `ChromeButton` (`:247-277`) — a frosted `bg-glass-standard` pill with `disabled:opacity-60`. The `labels.share` string is already threaded (`VenueDetailOverlayLabels.share`, `:23`; `venueDetailLabels(tVenue)` provides it from `detail.share`).
- **Mobile has NO share button at all** — the mobile branch cluster (`VenueDetailOverlay.tsx:181-198`) is Heart (`:182-194`) + Close (`:195-197`) ONLY. AC2 requires ADDING a share button here. The `ChromeButton` component is shared, so adding one is a few lines.
- **The `detail.share` i18n key exists in both locales** — sv `"Dela plats"` (`messages/sv/venue.json:135`), en `"Share venue"` (`messages/en/venue.json:135`). AC2 mandates reusing it for the button. The MODAL copy (title, subtitle, copy-link labels, "Kopierad") is NEW and must be i18n'd (Task 4).
- **The deep-link already works** — the recipient URL shape is `…/<localePrefix>?venue=<slug>`. `MapView.handleOpenDetails` (`:651-661`) pushes exactly this; on load, `venueSlugParam = searchParams.get('venue')` (`:143`) drives the whole detail-resolution chain (`:379-515`): match against the loaded list / favourites / selected venue via `venueMatchesSlug` (`:1146-1152`, matches `slug` OR `venueSlug`), and if not yet loaded, synthesize a skeleton via `fallbackVenueFromSlug` (`:1154+`) while `useVenueDetail` fetches. **AC3 is already satisfied by existing routing** — the share URL just points at it. Add a regression test, do NOT re-architect routing.
- **No existing clipboard/share/`window.open` helper** — a repo-wide grep for `navigator.share` / `navigator.clipboard` / `window.location.origin` finds NOTHING in `app/components/hooks/lib`. This is net-new. The only `window.open(` is the maps-routing call in `MapView.tsx` (pinned by `routing-boundary.test.ts`) — the share code must NOT add a second one.

### The shareable URL — reuse the EXISTING routing (do NOT invent a new API surface)

- **URL shape:** `` `${window.location.origin}${pathname}?venue=${encodeURIComponent(slug)}` `` built at click time. `pathname` = the current locale path (from `usePathname()` via `@/i18n/navigation`, already available in MapView as `pathname`), which preserves the `localePrefix: 'as-needed'` locale segment (sv unprefixed `/`, en `/en`). This means a Swedish user shares a Swedish link and an English user an English link — correct by construction, no locale plumbing needed.
- **The reference's `https://sunnyseat.app/v/<slug>` is illustrative ONLY.** SunnySeat has NO `/v/<slug>` path route — the only venue route file is the API (`app/api/venues/[slug]/route.ts`), not a page. Do NOT create a `/v/<slug>` page; use the `?venue=<slug>` query param that already resolves.
- **Slug source:** the detail venue in scope — `detail?.slug ?? fallbackVenue.slug ?? fallbackVenue.venueSlug`. Both `slug` and `venueSlug` exist on `VenueDataDto`/`VenueDetailDto` and `venueMatchesSlug` matches either, so any of them round-trips.
- **What params to include (Open Question 1):** default = `?venue=<slug>` only. Strip `_state`/`_time`/`_date`/tag-filter params so the recipient gets a clean venue link (not the sharer's dev-forced state or planner time). If a maintainer later wants "share the sun status AT this planned time", threading `?_time=` would be a future enhancement — note it, do not build it (and `?_time=` is production-gated by Story 9.0 anyway, so it would no-op in prod).

### The desktop share surface — model on SettingsModal, not the raw reference

The reference `ShareModal.jsx` (desktop centered / mobile bottom-sheet) is the VISUAL and STRUCTURAL guide (title "Dela {name}", 5 share-target tiles in a `repeat(5,1fr)` grid, a copy-link row with a monospace URL + a dark "Kopiera länk" button that flips to green "Kopierad", close via × or scrim, Esc-to-close, scale-in/slide-up animation). But implement it with SunnySeat's stack, not the reference's raw inline styles + `document.execCommand`:

- **Shell:** copy `SettingsModal.tsx`'s `<AnimatePresence>` + `motion.div` scrim + card pattern (`:44-135`) — it already gives responsive bottom-sheet (mobile) / centered (desktop), `z-modal` (`--z-modal: 60`, above the `z-bottom-sheet-full: 50` detail overlay — verify the share modal sits ABOVE the detail sheet), `backdrop-blur-standard`, `bg-text-primary/30` scrim, `shadow-sheet-full-up`, `rounded-t-panel`/`lg:rounded-panel`, focus trap (`trapFocus` + `focusableElements` from `@/lib/utils/focus-trap`), Escape handler, scrim-`onPointerDown`-to-close.
- **Animation:** the reference uses `scale-in 0.28s cubic-bezier(0.34,1.56,0.64,1)` (desktop) / `slide-up 0.34s` (mobile). SunnySeat's tokens: `DURATION_SLOW_S = 0.3` + `EASE_SPRING = [0.22,1,0.36,1]` for the spring-y entrance (`@/lib/constants/animation`), `DURATION_FAST_S`/`EASE_EXIT` for exit — the SettingsModal already picks sensible ones (`DURATION_FAST_S` scrim, `DURATION_SLOW_S` card). Match the reference's spring feel within the Design-Gate ±50ms tolerance; honor `useReducedMotion()`.
- **Tokens (design-system-first — the `frontend-component` skill applies):** prefer DESIGN.md tokens over the reference's raw hex. The reference's brand-tile colors (Instagram gradient, `#1877f2` Facebook, `#25d366` WhatsApp, etc.) are intrinsic brand colors — those specific brand hexes are legitimately NOT tokens (a brand icon must be its brand color); use them as literal values for the tiles ONLY, and flag as expected non-token brand values in Completion Notes. Everything else (card bg, text, the dark copy button `#1b1b1e`≈`text-primary`, the cream card `#fdfaf4`≈`surface-cream`) should map to existing tokens.

### Native Web Share + graceful degradation (the reliability core)

- **Capability-gated, client-only.** On share click: `if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') { try { await navigator.share({ title, text, url }); } catch (e) { /* AbortError = user cancelled → ignore */ } } else { openShareModal(); }`. Never read `navigator` during render (SSR-safe). Never leave the button dead.
- **`navigator.share` requires a secure context + a user gesture** — both hold (HTTPS in prod; the click IS the gesture). In dev over `http://localhost` it's a secure context too. If `navigator.share` throws synchronously (not just rejects), the try/catch + the else-branch still keep it safe.
- **Desktop usually lacks `navigator.share`** → the modal is the path. Mobile Safari/Chrome have it → native sheet. This is capability-driven, so it's robust to the actual browser rather than a viewport guess.

### Deferred-work items folded in (only sharing / venue-detail / modal overlaps)

- **"Share action behaviour"** (deferred-work.md, "Future visual/data contracts after Story 2.5", *Target: Story 6.4 — Share Venue Sun Status*) — Story 2.5 preserved the screenshot-scope detail chrome but "does not implement native share/copy behaviour. Story 6.4 must define and implement share mechanics, fallback copy, and accessibility, then verify venue-detail visual gates remain passing." Epics 4/5/6 were DEFERRED at the Epic-7 retro (MEMORY: "Epics 4/5/6 deferred"), and Epic 9 reallocated the share work to Story 9.8 (this story). **This deferred item's intent is fulfilled here** — native share + fallback copy + a11y + keep the venue-detail visual gates passing are exactly this story's ACs. The SM should retarget/remove that deferred entry to 9.8 per the queue-not-archive convention once this story is drafted (it currently reads *Target: Story 6.4* — a deferred epic).
- _(Not folded in — out of subject:_ the 7.3 offline-shell, SW-update, contrast, and pin-rendering deferrals are unrelated to sharing and are NOT reopened here. The 9.5/9.7 locate/tag items do not touch the share surface.)_

### Constraints carried from Epic 9 retro-notes (binding)

- **Story 9.6 fenced the share button OUT of its scope FOR this story** (retro-notes 9-6 + 9.6 create-story note): "LEAVE … the venue-detail share button (Story 9.8)". So the disabled stub is intact on this branch — you enable it. Do NOT expect 9.6 to have touched it.
- **Story 9.7 changed `VenueDataDto`** — it now carries a required `tags: string[]`. Irrelevant to sharing (you don't need tags for a share link), but be aware the DTO the detail venue uses has that field; don't be surprised by it.
- **Story 9.1 removed venue-detail content** (uncertainty line, some fact labels) and left the mobile+desktop `venue-detail` references needing re-baseline (retro-notes 9-1). So the `venue-detail.png` references may ALREADY be stale before your change — a share-button gate FAIL could be pre-existing 9.1 drift, not your share button. Distinguish carefully in the visual gate (capture what the share button/modal look like; do not attribute unrelated content drift to this story).
- **Story 9.0 production-gates `?_time=`/`?_date=`** — relevant only if you (do NOT, per the default) thread planner params into the share URL.

### Visual gate on this host (HOST TOOLING BUG — applies to every Epic 9 frontend story)

`.claude/scripts/visual-validate.sh` screenshots via a `mktemp /tmp/impl-XXXXXX.png` path the Windows-native Playwright binary CANNOT write, so the AUTOMATED visual gate always errors "Could not screenshot dev server" on this host (retro-notes 9-2, re-confirmed 9-4/9-5/9-7). Use the documented manual affordance: `VISUAL_VALIDATE_PROVIDER=none ALLOW_MANUAL_VISUAL_VALIDATION=1`, reproduce the gate's comparison byte-identically (same claude-sonnet-4-6 reviewer + verbatim prompt + on-disk reference PNG vs the corrected dev-server render captured to a Windows-safe path), record the rationale in Completion Notes, and **leave the gate script UNMODIFIED** (maintainer makes the temp path Windows-portable — out of scope). Beware the **stale Turbopack CSS cache trap**: a running `next dev` can keep serving old CSS after an edit — a full `.next` wipe + restart may be needed before capturing; verify the served chunk before any visual capture.

This story adds a NEW interactive control (the enabled share button, mobile + desktop) and a NEW surface (the desktop share modal). The `venue-detail` references are the button-state comparison baselines but may predate the enabled/mobile-share state; there is NO reference for the share modal. Capturing/rebaselining is a MAINTAINER decision — the dev agent must NOT self-bless or edit reference PNGs (route to maintainer rebaseline sign-off).

### Project / file-impact map (expected touch list — confirm during dev)

- **Edit** `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx` — enable the desktop share `ChromeButton` (remove `disabled`, add `onClick`); ADD a share `ChromeButton` to the mobile cluster; add `onShare?`/share-open handling to props (or own a `shareOpen` state + render `<ShareModal>`); preserve drag/favourite/close/dialog semantics.
- **New** `nextjs-app/components/custom/venue/ShareModal.tsx` — the copy-link + targets modal, shell modeled on `SettingsModal.tsx`, visual on the reference `ShareModal.jsx`. (Or `components/custom/share/ShareModal.tsx` if you prefer a new dir — default: co-locate in `venue/`.)
- **Possibly new** `nextjs-app/lib/utils/share.ts` (or inline in the overlay) — the share-URL builder (`buildVenueShareUrl(origin, pathname, slug)`) + the native-share dispatch. A small pure builder is unit-testable; keep it out of the `routing.ts` maps-URL boundary.
- **Edit** `nextjs-app/components/custom/map/MapView.tsx` — pass `onShare` (or share data: slug/name/url) into BOTH `<VenueDetailOverlay>` render sites (`:980-1024`); build the URL from `window.location.origin` + `pathname` + slug. Do NOT add a second `window.open(`.
- **Edit** `nextjs-app/messages/sv/venue.json` + `nextjs-app/messages/en/venue.json` — new `detail.shareModal.*` keys (title/subtitle/copyLink/copied/close/shareText) in BOTH locales (parity-guarded). Reuse existing `detail.share` for the button aria-label.
- **Tests:** new share-URL-builder unit test; `VenueDetailOverlay` share-button presence (mobile+desktop, enabled) + native-share-mock + fallback-to-modal tests; `ShareModal` copy-link test; a `?venue=<slug>` deep-link resolution regression test; new keys auto-covered by `test/unit/messages-parity.test.ts`.

### Technical stack (verified — do not drift)

Next.js 16.2.2 (Turbopack-default) + React 19 + Tailwind v4 (CSS-first tokens) + Motion 12.x (`motion/react`, NOT `framer-motion`) + next-intl (`localePrefix: 'as-needed'`, `localeDetection: false`, locales `['sv','en']`, default `sv`) + TanStack Query 5.x + MapLibre GL JS 5.x. `navigator.share` (Web Share API Level 1) and `navigator.clipboard.writeText` (Async Clipboard API) are standard browser APIs — both require a secure context; `navigator.share` requires a user gesture and is absent on most desktop browsers (the fallback path). No new dependency needed (no `react-share` / no clipboard lib — the native APIs + a small builder suffice). The `frontend-component` skill applies to the new `ShareModal` (design-system-first: prefer DESIGN.md tokens, model the shell on `SettingsModal`, honor `useReducedMotion`). `lucide-react` `Share2` is already the button icon; `Copy`/`Check` lucide icons are available for the copy-link row if wanted.

### Project Structure Notes

- Venue-detail components live in `nextjs-app/components/custom/venue/` (`VenueDetailOverlay.tsx`) and `nextjs-app/components/composed/venue/` (`VenueDetailContent.tsx`). The new `ShareModal.tsx` belongs in `custom/venue/` (feature component by domain). Modal shells/patterns live in `custom/settings/` (`SettingsModal.tsx`) + `custom/feedback/` (`AppFeedbackModal.tsx`) — reuse the shell shape, not a new modal framework.
- i18n message files: `nextjs-app/messages/{sv,en}/venue.json` (venue-scoped copy — the share button + modal belong here, not `common.json`). Parity is enforced by `test/unit/messages-parity.test.ts` (per-key ICU argument names checked).
- The design references live in `nextjs-app/docs/design/references/claude-design/project/{src,src-desktop}/ShareModal.jsx` (mobile / desktop reference) and `.../{src,src-desktop}/VenueDetail.jsx` (how the share button wires `setShareOpen`). Screen refs: `docs/design/references/screens/{mobile,desktop}/venue-detail.png`.

### References

- [Source: CLAUDE.md] + [Source: AGENTS.md] — root agent rulebook (local Docker/WSL rules, repo conventions).
- [Source: project-context.md] — design + screen map (AI rules, screen inventory including the venue-detail screen).
- [Source: _bmad-output/planning-artifacts/architecture.md] — provider tree (`AppContextProviders`, `SettingsContext`/`SettingsModalRoot` mount pattern), component map (`custom/venue/*`, `custom/settings/*`), three-layer component model, privacy/no-consent-cookie NFR (share adds no cookie/storage).
- [Source: nextjs-app/docs/design/DESIGN.md] — design tokens (glass/frosted button family, `--z-modal`/`--z-bottom-sheet-full`, `--duration-*`/`--ease-*`, `shadow-sheet-full-up`, reduced-motion conventions).
- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.8: Venue Sharing (Real) (lines 2575-2599)] — ACs + Design Gate Criteria (verbatim).
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9 root cause #3 (dead/unwired controls — "visual shell without plumbing")] — the disabled-share-button root cause spine.
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:119,381,577,975] — the "share moment is about ease" principle; screenshots-as-a-feature; share = GlassButton (tertiary/utility); venue-detail hero "share button below heart".
- [Source: nextjs-app/components/custom/venue/VenueDetailOverlay.tsx:23,122-142,181-198,247-277] — the disabled desktop share stub, the mobile cluster missing share, the `ChromeButton` component, the `share` label prop, and the overlay semantics to preserve.
- [Source: nextjs-app/components/custom/map/MapView.tsx:143,491-515,651-666,980-1024,1146-1159] — `venueSlugParam` deep-link resolution, `handleOpenDetails` URL shape, the two `<VenueDetailOverlay>` render sites, `venueMatchesSlug`/`fallbackVenueFromSlug`.
- [Source: nextjs-app/components/custom/settings/SettingsModal.tsx:44-135] — the responsive modal shell (AnimatePresence + scrim + focus trap + Esc + scrim-close) to model `ShareModal` on.
- [Source: nextjs-app/docs/design/references/claude-design/project/src-desktop/ShareModal.jsx + .../src/ShareModal.jsx] — desktop-centered + mobile-bottom-sheet share-modal visual/structural reference (title, 5 targets, copy-link row, copied state, close/Esc).
- [Source: nextjs-app/docs/design/references/claude-design/project/src/VenueDetail.jsx:7,277-286,344 + .../src-desktop/VenueDetail.jsx:11,75,241] — how the reference wires the share button → `setShareOpen(true)` → `{shareOpen && <ShareModal … />}`.
- [Source: nextjs-app/i18n/routing.ts + nextjs-app/i18n/navigation.ts] — `localePrefix: 'as-needed'` + `usePathname` (locale-aware share URL construction).
- [Source: nextjs-app/test/unit/routing-boundary.test.ts:64-84] — the `window.open(`/native-maps-URL boundary the share code must NOT trip (share ≠ maps URL).
- [Source: nextjs-app/messages/{sv,en}/venue.json — detail.share (line 135)] — the existing "Dela plats"/"Share venue" key AC2 mandates + where the new modal keys go.
- [Source: nextjs-app/lib/constants/animation.ts] — `DURATION_SLOW_S`/`DURATION_FAST_S`/`EASE_SPRING`/`EASE_EXIT` for the modal transition.
- [Source: _bmad-output/auto-bmad/retro-notes/epic-9.md#Story 9-6 (share fenced to 9.8) + 9-2 (visual-validate /tmp host bug) + 9-1 (removal-inversion / stale venue-detail refs)] — binding cross-story + host-tooling constraints.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md#"Future visual/data contracts after Story 2.5" → "Share action behaviour"] — the folded-in deferred item (retarget from 6.4 → 9.8).
- [Source: _bmad-output/implementation-artifacts/9-6-map-chrome-consolidation-dead-control-cleanup.md + 9-7-tag-filtering-real-data-working-chips.md] — the immediately-preceding stories on this branch (share fenced out; DTO `tags` added).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (auto-bmad dev-story delegate).

### Debug Log References

- Routing-boundary test false-positive on my own doc comments: the scan test greps for the literal substrings `window.open(`, `maps.apple`, `google.com/maps`, `geo:`. My explanatory comments in `lib/utils/share.ts` originally contained those literals and tripped the pin. Fixed by rephrasing the comments (no functional change). The share code itself never uses `window.open(` — share targets open via `<a href target="_blank">`.
- Existing `VenueDetailOverlay.test.tsx` rendered the overlay without an intl provider; the overlay now always mounts `<ShareModal>` (an intl consumer via `useTranslations`) so `AnimatePresence` can play the exit animation. Fixed by rendering the overlay tests through `renderWithProviders` with the real Swedish `venue.json` messages, and updated the stale `Dela plats → toBeDisabled()` assertion to `toBeEnabled()`.

### Completion Notes List

- **Design decisions (Open Questions):**
  - OQ1 (share URL params): shipped `?venue=<slug>` ONLY — a clean venue link. Planner params (`_state/_time/_date/tags`) are stripped. Planner-time sharing (`?_time=`) is NOT built (and is prod-gated by Story 9.0 anyway) — flag if a maintainer wants it.
  - OQ2 (mobile placement): share `ChromeButton` added to the top-right chrome cluster (Heart / Share / Close), consistent with desktop and reusing the existing component.
  - OQ3 (state owner): the OVERLAY owns `shareOpen`/`shareUrl` + renders `<ShareModal>` and dispatches native share; MapView is the data source via `fallbackVenue`. No `onShare` callback threaded — the single-owner design is cleaner and mirrors the reference `VenueDetail.jsx`.
  - OQ4 (functional targets): wired WhatsApp, Facebook, X, Telegram, and email — the targets with a documented public web share-intent. Instagram/Snapchat/Messenger OMITTED (no reliable public web share-intent; a dead tile would reproduce the "dead control" defect this epic fixes). Copy-link is the guaranteed-functional primary path.
- **Locale-prefix pitfall (important):** next-intl's `usePathname()` (`@/i18n/navigation`) STRIPS the locale prefix (returns `/` for both sv and en). So the share URL is built from the RAW `window.location.origin + pathname + search` (which DOES include `/en`), not next-intl's pathname — an English user shares an English (`/en`) link by construction.
- **Token gaps / expected non-token values (flagged):**
  - The 1800 ms copied-confirmation revert has no exact `--duration-*` token (tokens are 150/200/250/300 ms) — used a literal `COPIED_FEEDBACK_MS = 1800` constant.
  - Share-target tiles use intrinsic BRAND colors (`#25d366` WhatsApp, `#1877f2` Facebook, `#1b1b1e` X, `#26a5e4` Telegram, `#735c00` email≈amber-dark) as literal values — a brand icon must be its brand color; legitimately not design tokens.
  - The design system has NO green/success token, so the "Kopierad" confirmation uses existing tokens (`bg-surface-sand text-amber-dark` + a `Check` icon) rather than the reference's one-off green (`#dcf5e3`/`#215a36`). A future `--color-status-success` token would let this match the reference's green more literally.
- **Visual gate:** automated `visual-validate.sh` stays blocked on this Windows host (`/tmp/impl-*.png` unwritable) — script left unmodified. Manual affordance: `.next` wiped + fresh `next dev`, four Windows-safe screenshots captured (desktop/mobile share button + desktop/mobile share modal) for maintainer review. Rendering verified: desktop modal = centered card, mobile modal = bottom-sheet, both above the detail overlay; share buttons enabled + present on both breakpoints. The `venue-detail` reference PNGs predate this enabled/mobile-share state (Story 9.1 drift) and there is no reference for the new modal → maintainer rebaseline decision; NO reference PNGs edited.
- **Deferred item folded in:** the deferred-work.md "Share action behaviour" entry (Target: Story 6.4 — a deferred epic) is fulfilled here (native share + fallback copy + a11y + venue-detail gates kept passing). The SM should retarget/remove that entry to 9.8.

### File List

- **New** `nextjs-app/lib/utils/share.ts` — pure `buildVenueShareUrl` / `currentVenueShareUrl` (URL builder, planner-param strip, locale-prefix preserve) + `shareVenueNatively` (capability-gated native Web Share with typed outcome).
- **New** `nextjs-app/components/custom/venue/ShareModal.tsx` — desktop/fallback share surface (copy-link + functional share targets), shell modeled on `SettingsModal.tsx`.
- **Edit** `nextjs-app/components/custom/venue/VenueDetailOverlay.tsx` — enabled the desktop share button; ADDED the mobile share button; overlay owns `shareOpen`/`shareUrl` + `handleShare` + renders `<ShareModal>`; `shareText?` added to labels type.
- **Edit** `nextjs-app/components/custom/map/MapView.tsx` — `venueDetailLabels` threads `detail.shareModal.shareText`.
- **Edit** `nextjs-app/components/custom/venue/ForcedVenueDetailInitialFrame.tsx` — `venueDetailLabels` threads `detail.shareModal.shareText`.
- **Edit** `nextjs-app/messages/sv/venue.json` + `nextjs-app/messages/en/venue.json` — new `detail.shareModal.*` keys (parity-guarded).
- **New** `nextjs-app/test/unit/share.test.ts` — share-URL builder + native-share outcome tests.
- **New** `nextjs-app/test/components/ShareModal.test.tsx` — modal render, functional targets, copy-link + "Kopierad", close/Esc/scrim.
- **Edit** `nextjs-app/test/components/VenueDetailOverlay.test.tsx` — intl-provider wrap; enabled-share assertion; new sharing behaviour suite (presence both breakpoints, native-share call, AbortError-swallow, fallback-to-modal).
- **Edit** `nextjs-app/test/components/MapView.test.tsx` — named share-deep-link AC3 regression guard.

### Change Log

- 2026-07-01 — Story 9.8 implemented: enabled + wired the venue-detail share button (desktop stub enabled, mobile button added), native Web Share with capability-gated graceful degradation, a new copy-link + functional-targets `ShareModal`, and a reused `?venue=<slug>` share deep-link. Status → review.

## Open Questions

1. **Share URL params (Task 1):** default = `?venue=<slug>` ONLY — a clean venue link, dropping the sharer's `_state`/`_time`/`_date`/tag-filter params. If the maintainer wants "share the sun status at MY planned time" (thread `?_time=`), that's a future enhancement (and `?_time=` is prod-gated by Story 9.0). Dev default: clean `?venue=<slug>`; flag if planner-time sharing is wanted. (Not a blocker.)

2. **Mobile share-button placement (Task 2):** the reference `src/VenueDetail.jsx` puts the mobile share as a round button in the action row (next to "Visa rutt"); SunnySeat's mobile overlay uses a top-right chrome cluster (Heart+Close). Default = add the share `ChromeButton` to that top-right cluster (consistent with desktop + reuses the existing component). If the maintainer wants the reference's action-row placement, that's a small relocation. Dev default: top-right cluster; confirm against the reference visual at the gate. (Not a blocker.)

3. **Share-surface state owner (Task 2):** default = `VenueDetailOverlay` owns a `shareOpen` state and renders `<ShareModal>` (mirrors the reference `VenueDetail.jsx`), with MapView supplying the slug/name/URL. Alternative = MapView owns the modal (single mount point, like `SettingsModalRoot`). Dev default: overlay-owned (co-located, simplest); flag if a single root mount is preferred. (Not a blocker.)

4. **Which share targets are FUNCTIONAL (Task 4):** the reference shows 5 brand tiles (Instagram/Facebook/WhatsApp/Messenger/Snapchat) but its own App treats them as decorative. Default = wire the tiles that have a real public web share-intent (WhatsApp `wa.me`, Facebook sharer, X/Telegram, `mailto:`) and for those WITHOUT one (Instagram/Snapchat — no web share-intent) either omit or make them copy-the-link — NEVER a silently-dead tile (that reproduces the exact defect this epic fixes). The copy-link row is the guaranteed-functional primary path. Record which targets shipped in Completion Notes. **This is the one genuine design decision — if the maintainer wants strict visual parity (all 5 tiles) vs functional-only, flag it.** (Not a blocker — the default ships a working share surface.)

## Review Findings

_(Thin Tier-A review: Acceptance Auditor lens + dedicated security review. Blind Hunter + Edge-Case Hunter intentionally not run in this pass. Security review found no exploitable vulnerabilities.)_

- [x] [Review][Defer][Med] [Auto-resolved Tier A → deferred, logged to deferred-work.md] Share-target tiles render text glyphs instead of brand icons/logos — `ShareModal.tsx:238-244` draws each target as a letter glyph (`Wa`/`f`/`X`/`Tg`/`@`) in a brand-colored square; the reference tiles show brand marks, so the visual gate will read different from the reference. Tiles are functionally correct (real share-intent hrefs, brand colors applied). Recommended: defer: text glyphs are a working, honest placeholder that avoids the dead-control defect; brand-mark fidelity is a visual-gate parity call for the maintainer at rebaseline (a design/asset task, not a code fix), so log it rather than swapping in icons blind.
- [x] [Review][Decision][Med] [Auto-resolved Tier A → dismissed (won't-fix)] Shipped share targets differ from the reference's five tiles (WhatsApp/Facebook/X/Telegram/Email vs the reference's Instagram/Facebook/WhatsApp/Messenger/Snapchat) — `ShareModal.tsx:74-117`; Instagram/Snapchat/Messenger omitted (no reliable public web share-intent). This is the story's declared Open Question 4 default — a deliberate choice to avoid a silently-dead tile, the exact defect Epic 9 fixes. Recommended: dismiss: functional-only is the correct default per OQ4 and Epic 9's anti-dead-control mandate; strict 5-tile visual parity would reintroduce dead tiles, so ship as-is (maintainer may revisit at the visual gate).
- [x] [Review][Patch][Low] Card-entrance transition uses `EASE_EXIT` (easeIn) for the modal open animation — `ShareModal.tsx:198`: the card `motion.div` applies `ease: EASE_EXIT` to its enter/animate transition, so the surface eases IN on open (wrong feel for an entrance); `EASE_SPRING` is not imported. Dev Notes (line 99) call for the spring-y entrance (`EASE_SPRING`) within the Design-Gate ±50ms tolerance. Fix: use `EASE_ENTER` (already imported) — or `EASE_SPRING` — for the card's animate transition, keeping `EASE_EXIT` only on `exit`. → RESOLVED: base `transition` now uses `EASE_ENTER` for the card's enter/animate; the `exit` prop carries its own inline `transition` with `EASE_EXIT` (reduced-motion branch preserved). The scrim already used `EASE_ENTER`.
- [x] [Review][Defer][Low] Automated visual-validation gate not satisfiable within this diff (host `/tmp` tooling bug) — `venue-detail` reference PNGs predate the enabled/mobile-share state (Story 9.1 drift) and there is NO reference for the new share modal; the dev agent correctly did not self-bless or edit reference PNGs. `_bmad-output/implementation-artifacts/9-8-venue-sharing-real.md` (Task 6 / Completion Notes) — deferred, pre-existing (maintainer rebaseline action; not a code defect).
- [x] [Review][Defer][Low] Clipboard-write silent no-op with no user-visible signal when the clipboard API is entirely absent (insecure-context/legacy browser) — `ShareModal.tsx:159-170`: when `navigator.clipboard?.writeText` is missing, `handleCopy` returns with no state change and no feedback; the button keeps showing "Kopiera länk". The URL text stays visible for manual select-copy (tested), so the path is not dead — only unacknowledged, and prod is HTTPS. Consistent with the "modern clipboard only" decision (spec line 54) — deferred, pre-existing design choice.
