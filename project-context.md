# SunnySeat — Project Context

> **Purpose:** This file is the BMAD dev agent's injection point for design awareness. BMAD's dev agent (Amelia) loads this as foundational reference in Step 2 of its workflow. It lives at the project root — not inside `_bmad/` — so it survives BMAD reinstalls without being overwritten.
>
> Last updated: 2026-07-03 (post Epic 10 — "Honest Sky" weather-gated two-signal sun display, stories 10.1–10.5 landed)
>
> **MVP scope correction:** planner, future date simulation, and favourites are free MVP functionality. Season Pass / Swish is Future Monetization only.
>
> **Shadow data correction:** `building_geodata/byggnad_kn1480.gpkg` is a 2D footprint source only and is not sufficient for shadow modelling by itself. MVP launch geodata is scoped to the central EPSG:3007 bbox `x=140000..150000, y=6390000..6410000` and adopts the combined open-data shadow-caster path documented in `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md`.
>
> **The app is LIVE on the real data path** (production cutover 2026-06-29: `SUNNYSEAT_VENUE_STORE=supabase`, `SUN_ENGINE=real`, feedback/review persistence = Supabase). Epic 9 landed a post-launch hardening pass and Epic 10 layered a weather-truth ("Honest Sky") gate on top of the geometric sun engine; the conventions each ratified are captured in "Epic 9 Ratified Conventions" and "Epic 10 Ratified Conventions" below.

---

## What Is SunnySeat?

A live Next.js web/PWA app that helps people in Gothenburg find outdoor venue seating in direct sunlight right now. It combines two orthogonal signals into a single honest answer: (1) **geometric sun potential** — real-time NREL SPA solar position + 2.5D building/terrain shadow modelling ("where could the sun reach this seating area?"), and (2) **weather truth** — Met.no cloud + radar-rain data that gates that potential ("but is the sun actually getting through the sky right now?"). Venue-level output carries a sun status, a sky-condition line, and confidence scoring. The MVP is feature-complete and shipped to production; the current focus is post-launch hardening and truthful data.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js `^16.2.2` (App Router, **Turbopack default**) |
| Language | TypeScript `^6.0.2` (strict) |
| React | React `^19.2.5` + **React Compiler** (`babel-plugin-react-compiler ^1.0.0`) |
| Styling | Tailwind CSS v4 (`^4.2.2`, CSS-first `@theme` tokens) |
| UI Primitives | shadcn/ui v4 (`shadcn ^4.2.0`) + `@base-ui/react ^1.4.0` |
| Map | MapLibre GL JS `^5.23.0` |
| Data Fetching | TanStack Query `^5.99.0` |
| Animation | Motion `^12.38.0` |
| Gestures | `@use-gesture/react ^10.3.1` |
| i18n | next-intl `^4.9.1` |
| Search / Command | cmdk `^1.1.1` |
| PWA | Serwist `^9.5.7` (via `@serwist/turbopack`) |
| Database | Supabase (`@supabase/supabase-js ^2.103.3`, PostgreSQL 15 + PostGIS) |
| Sun Engine | TypeScript — NREL SPA + Turf.js (`@turf/turf ^7.3.4`, `nextjs-app/lib/solar/` + `lib/services/sun-engine.ts`); two-signal geometric-potential + weather-gate (Epic 10) |
| Weather | Met.no Locationforecast 2.0 `complete` (three-layer cloud split) + Nowcast 2.0 (near-now radar rain) — `nextjs-app/lib/weather/` (`met-no-service.ts`, `nowcast-service.ts`) |
| Server Infrastructure | Supabase service-role clients for server-only backend jobs |
| Payments | Swish Merchant API (Season Pass, Future Monetization only) |
| Validation | Zod `^4.3.6` |
| Icons | `lucide-react ^1.8.0` |
| Hosting | Vercel (Fluid Compute, Cron, CDN + Edge proxy) |
| Testing | Vitest `^4.1.4` + Playwright `^1.59.1` (+ `@axe-core/playwright` a11y gate) |

> **CI / lockfile gotcha (binding):** `npm ci` requires the `overrides: { "@swc/helpers": "0.5.15" }` in `package.json` AND a Linux/npm-10-generated lockfile — a local npm-11 lock fails CI. Regenerate the lock on Linux/npm 10 if you touch `package.json`.

### Current State

- **MVP is feature-complete and LIVE in production on the real data path** (cutover 2026-06-29). The full stack — frontend, real sun/shadow engine, Met.no weather, Supabase venue store + feedback/review persistence — runs against live data. Epics 1, 2, 3, 7, 8 and 9 are done.
- **Epic 9 ("Live-App Hardening & Clean-Up", stories 9.0–9.10) has landed.** It was a post-launch remediation of a party-mode live-app triage: prod-gating the dev planner-forcing URL leak, de-bloating fabricated venue metadata, fixing the CTA gradient token, adding server caching + client query hygiene to the time→query path, hardening location/onboarding, consolidating map chrome + removing dead controls, real tag filtering, real venue sharing, and a mobile verification/regression pass. The durable conventions it ratified are in "Epic 9 Ratified Conventions" below.
- **Epic 10 ("Honest Sky", stories 10.1–10.5) has landed.** It added the weather-truth half of the two-signal model: a cloud gate that flips a geometrically-sunlit venue to a new `CloudObscured` status when the sky is (near-)total overcast or raining, layer-weighted effective cloud cover (thin high cirrus no longer reads as blocking stratus), a Met.no Nowcast 2.0 near-now radar-rain signal, the muted "Sun Behind Clouds" UI treatment, and a reality-verification / regression-guard pass. Its `CloudObscured` / `SkyCondition` union extensions, "undefined never 0" missing-weather discipline, exhaustiveness-forcing allow-lists, and deterministic weather e2e seam are ratified in "Epic 10 Ratified Conventions" below — **binding for any story that reads sun status, sky condition, or weather.**
- **Admin operations are retired from active scope.** Venue changes and geodata maintenance happen through reviewed direct database/import operations (documented at `nextjs-app/docs/venue-data-load.md`), not an admin UI/API.
- **Live DB access:** the direct host is IPv6-only; bulk psql/live-data ops go through the **IPv4 session pooler** (`aws-1-eu-west-1`) via Docker psql, creds in the gitignored `.env.local`. `public.venues` currently holds the 7 test/fixture venues (no bulk production venue data yet).
- **Deferred/future:** Epics 4/5/6 are deferred. Season Pass / Swish / paywall states are Future Monetization only and must not enter MVP stories.

---

## Key Documents

| Document | Path |
|----------|------|
| Project Context (this file) | `project-context.md` |
| PRD (v3.1) | `_bmad-output/planning-artifacts/prd.md` |
| Project Brief | `_bmad-output/planning-artifacts/brief/project-brief.md` |
| Architecture | `_bmad-output/planning-artifacts/architecture.md` |
| UX Design Specification | `_bmad-output/planning-artifacts/ux-design-specification.md` |
| Epics & Stories (v3.1) | `_bmad-output/planning-artifacts/epics.md` |
| MVP QA Addendum | `_bmad-output/qa/mvp-test-design-scope-correction-2026-05-19.md` |
| Future Monetization Archive | `_bmad-output/planning-artifacts/future-monetization-season-pass.md` |
| Design Decisions | `_bmad-output/planning-artifacts/decisions/` |
| Shadow Data ADR | `_bmad-output/planning-artifacts/decisions/shadow-data-trust-realignment.md` |
| Shadow Data Sprint Change Proposal | `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-shadow-data-trust-realignment.md` |
| Implementation Readiness Report | `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-15.md` |
| Sprint Status | `_bmad-output/implementation-artifacts/sprint-status.yaml` |
| Deferred-Work Queue | `_bmad-output/implementation-artifacts/deferred-work.md` |
| Epic-9 Retro Notes | `_bmad-output/auto-bmad/retro-notes/epic-9.md` |
| Epic-10 Retro Notes | `_bmad-output/auto-bmad/retro-notes/epic-10.md` |
| Epic-10 Epic Spec ("Honest Sky") | `_bmad-output/planning-artifacts/epics.md` (Epic 10) |
| Venue Data Load Guide | `nextjs-app/docs/venue-data-load.md` |
| Local Docker / WSL Guide | `docs/local-docker.md` |
| Repo Agent Rulebook (canonical) | `AGENTS.md` |

---

## Design Artifacts

**All frontend work must ground itself in these artifacts — no invention, no guesswork.**

| Artifact | Location | Role |
|----------|----------|------|
| Design System (canonical tokens, components, motion) | `nextjs-app/docs/design/DESIGN.md` | **Binding token system** — the single source of truth for colour, type, spacing, radius, shadow, motion. |
| Claude Design bundle (HTML prototypes + intent transcripts) | `nextjs-app/docs/design/references/claude-design/` | **Primary visual + behaviour reference.** See "Claude Design as Visual Source of Truth" below. |
| Screen Reference PNGs — Mobile | `nextjs-app/docs/design/references/screens/mobile/` | Captured from the active MVP Claude Design prototypes by `nextjs-app/scripts/capture-claude-design-refs.mjs`. Inputs to the visual validation gate. |
| Screen Reference PNGs — Desktop | `nextjs-app/docs/design/references/screens/desktop/` | Same — captured from the active MVP Claude Design desktop prototype, except explicitly curated references noted in `REBASELINE-LOG.md`. |
| Legacy Figma Exports | `nextjs-app/docs/design/references/screens/legacy/{mobile,desktop,components}/` | Historical reference. Still useful for screens the MVP prototypes do not cover (`not-found`, `premium-recovery`, `map-primary-offline`) and for font sampling / odd details. **Not the primary spec — but can be the source of an explicitly logged re-baseline; see REBASELINE-LOG.md below.** |
| Re-baseline Log | `nextjs-app/docs/design/references/REBASELINE-LOG.md` | **Durable audit trail for every reference-PNG re-baseline or capture-recipe change.** Mandatory read when a visual gate fails — explains why the active reference may diverge from the prototype. Mandatory append whenever a reference is re-baselined or `capture-claude-design-refs.mjs` changes. Discoverable from AGENTS.md, this file, and the capture script's header. |
| UX Spec (Screen Inventory + behaviour) | `_bmad-output/planning-artifacts/ux-design-specification.md` §`Screen Inventory` | Animation timings, state transitions, loading/empty/error patterns, edge cases. |

### Claude Design as Visual Source of Truth

The Claude Design bundle is a self-contained handoff produced from the Figma file via the "Share to Claude Code" button on [claude.ai/design](https://claude.ai/design). As of the 2026-05-21 refresh, MVP visual validation uses only `SunnySeat MVP Mobile Unlocked.html` and `SunnySeat MVP Desktop Unlocked.html`.

- **`README.md`** — written for coding agents. Read it first when implementing a screen.
- **`project/`** — standalone HTML prototypes split into MVP Unlocked and Post-MVP Unlocked/Locked variants, their JSX source, shared `lib/`, uploaded assets, and pre-rendered screenshots. The prototypes are React + Babel-standalone; the capture helper serves them through a local HTTP server because Babel fetches JSX files.
- **`STATE-MAPPING.md`** — project-curated mapping from Screen IDs to prototype state-forcing recipes. Read when adding a new state to the visual validation gate.

#### Refresh and capture

- **Refreshing the bundle** when the Claude Design project is updated: `scripts/fetch-claude-design.sh` (run from project root) when a remote handoff is available, or replace from the local dated handoff folder when Rasmus provides one. The script preserves `STATE-MAPPING.md` and `ESLINT-AUDIT.md` and overwrites generated bundle content.
- **Regenerating the visual gate references** after a refresh (or when adding a new state): `cd nextjs-app && node scripts/capture-claude-design-refs.mjs [screen-id ...]`. This drives each prototype to the right state via Playwright and saves PNGs into `references/screens/{mobile,desktop}/`.

#### Reading discipline (matches the bundle's own README)

> *"Read the HTML and CSS directly; a screenshot won't tell you anything they don't."*

When implementing a screen the agent should:

1. Read `references/claude-design/README.md` once per session to refresh handoff context.
2. Locate the relevant MVP prototype (`SunnySeat MVP Mobile Unlocked.html` or `SunnySeat MVP Desktop Unlocked.html`). Use Post-MVP prototypes only for explicitly future Season Pass / payment / locked-flow work.
3. Open the JSX components rendered for the screen — these are the **canonical visual spec**. Dimensions, colours, layout rules are spelled out there. Do **not** rely on the prototype rendering or screenshots for measurements.
4. Skim any bundled README or source comments if intent is unclear. The current 2026-05-21 handoff does not include chat transcripts.
5. Translate the visual outcome into the project's stack — Tailwind v4 `@theme` utilities + shadcn/ui v4 + Motion 12.x. **Do not copy CSS values, React component decomposition, or DOM structure from the prototype.** The prototype is hand-coded plain HTML/CSS for design fidelity, not architecture.
6. Tokens still come from [DESIGN.md](nextjs-app/docs/design/DESIGN.md). The prototype's `:root` CSS variables are *informational* — verify any colour or spacing you find there resolves to a DESIGN.md token before using it.

### Frontend Implementation Rules

These rules are binding for any story touching the UI. They are enforced by the `frontend-component` skill and the `scripts/story-review.sh` review gate.

1. **Read DESIGN.md before writing any UI code.** Tokens are the single source of truth for colour, type, spacing, radius, shadow, motion. Never introduce a raw hex value, ad-hoc px spacing, or custom shadow.
2. **Match the visual outcome, not the prototype's implementation.** The Claude Design prototypes define what the screen should *look like* and *behave like*. They do not define the component architecture. Use sensible React decomposition with shadcn/ui primitives — do not clone the prototype's plain-HTML structure or copy its inline-CSS values.
3. **Reference the right prototype at the right viewport.** MVP mobile work consults `SunnySeat MVP Mobile Unlocked.html`; MVP desktop work consults `SunnySeat MVP Desktop Unlocked.html`. Post-MVP Unlocked/Locked prototypes are future-only and must not introduce Season Pass, Swish, paywall, lock badge, or payment runtime into MVP stories.
4. **Read the UX spec behaviour section for the screen.** Animation timings, state transitions, loading/empty/error patterns, and interaction mechanics come from `ux-design-specification.md` — not from the agent's intuition. Use the chat transcripts in `claude-design/chats/` to disambiguate intent when the spec is silent.
5. **Swedish copy is the default.** Button labels, empty states, errors, tab labels — all Swedish as specified. English fallbacks only for dev/debug surfaces.
6. **Accessibility is not optional.** WCAG 2.1 AA minimum. Every interactive element has a 44×44 px minimum touch target, visible focus indicator, and a semantic role. `prefers-reduced-motion` must disable non-essential animation.

---

## Custom Skills

The following SunnySeat skills are maintained in `.agents/skills/` and provide domain-specific knowledge during implementation. They auto-trigger contextually when available, but are listed here so the dev agent knows to consult them:

- **frontend-component** — READ BEFORE any frontend work. Design token rules, Figma reference discipline, visual-outcome-not-implementation-spec principle, UX behaviour spec requirements, accessibility.
- **visual-validation** — How the screenshot comparison gate works. Consult when visual validation fails or when debugging PASS/FAIL results. The gate reads the Screen ID → Route Map below to know where to navigate.
- **test-gate** — Test requirements policy. What must pass (type-check, lint, unit, integration, visual validation) before a story may transition to `review`, and how `scripts/story-review.sh` enforces story completion.
- **bmad-story-brief** — BMAD story format, acceptance criteria structure, definition of done, and task brief format for sub-agent delegation.
- **story-file-audit** — MANDATORY after every story file creation. Runs a seven-point self-audit verifying ACs, task sequencing, file impact, and test gate match epics.md and AGENTS.md. Must pass before the story is marked ready-for-dev.
- **review-round-guard** — MANDATORY before invoking bmad-code-review. Caps automatic review rounds at three per story and forces human decision beyond the cap. Prevents review loop waste.

---

## Dev-Only State Forcing Convention

Many screens in SunnySeat are **state variants of the same URL** — onboarding screen, inline feedback flow, future paywall reference overlays, etc. To let the visual validation gate (and any Playwright test) reach these states by URL alone, the project uses a dev-only `_state` query parameter.

### How it works

- A single hook, `useForcedState`, lives at `nextjs-app/lib/dev/use-forced-state.ts`.
- In production (`process.env.NODE_ENV === 'production'`) the hook returns `null` unconditionally and all branching code is dead-code-eliminated from the bundle. **Zero production footprint.**
- In development (and preview builds), the hook reads the `_state` query parameter via `useSearchParams()` from `next/navigation` and returns its string value, or `null` if absent.
- Any component with state variants calls `useForcedState()` and, when the returned value matches one of its known screen IDs, overrides its internal state to render that variant.
- Valid `_state` values are exactly the Screen IDs listed in the map below — the table is the canonical list. The convention and a usage example live at `nextjs-app/docs/dev/state-forcing.md`.

### Seeded development slug

Any screen ID that requires a venue (`map-with-selected-venue`, `venue-detail`, `feedback`, `review`) uses the fixed dev-seeded slug `test-venue-sunny`. This slug must exist in the development database (seeded as part of the venue-seeding story) so the gate can navigate to a deterministic venue. Production data never uses this slug.

### Contract

This convention is established as a first-class story (Epic 1 Story 1.2 — "Dev-Only State Forcing Mechanism") and **must ship before any state-variant screen story can be implemented**. Every subsequent state-variant story will consume the hook as a matter of course.

---

## Epic 9 Ratified Conventions

Durable patterns ratified during Epic 9 ("Live-App Hardening & Clean-Up"). These are **binding** for any story touching the surfaces named — treat them like the design-token rules above. Full rationale lives in the per-story retro notes at `_bmad-output/auto-bmad/retro-notes/epic-9.md` and the deferred queue at `_bmad-output/implementation-artifacts/deferred-work.md`.

### Edge boundary — `proxy.ts`, not `middleware.ts` (Story 9.3)

- **Next 16 renamed the Edge middleware convention `middleware.ts` → `proxy.ts`. The build HARD-ERRORS if both exist.** Any "add/edit Edge middleware" work goes in `nextjs-app/proxy.ts` — never create `middleware.ts`. (Some in-code comments still say "moved to middleware.ts"; that is stale — the real file is `proxy.ts`.)
- `proxy.ts` composes two concerns by pathname: `/api/venues*` → the relocated **per-IP venue rate limiter** (`lib/utils/venue-rate-limit-middleware.ts` + `lib/utils/rate-limit.ts`); everything else → the next-intl locale middleware. The matcher explicitly includes `/api/venues` + `/api/venues/:slug*` on top of the locale-routing negative-lookahead.
- **Why the limiter moved to the Edge:** the venue GET handler read `x-forwarded-for` to key the token bucket, which made the route dynamic and defeated its `Cache-Control: public, s-maxage=30` — the header was dead. Running the limiter in the Edge proxy (ahead of the response cache) keeps the GET handler a pure, header-independent, **edge-cacheable** function. Rate-limiting is GET-scoped to the venue read routes.
- **Edge runtime forbids `node:net` (and all native Node APIs).** Code moved from a Node route handler into the Edge proxy must swap Node built-ins for pure-JS equivalents (the limiter uses a pure-JS IPv4/IPv6 regex, not `node:net`'s `isIP`). Re-audit any Node-route→Edge-proxy move for Node built-ins; verify with `next build`.
- The Edge limiter is per-isolate in-memory (`Map`); each isolate holds its own bucket (documented MVP-scale DoS tradeoff, not per-request-durable).

### Caching windows (Stories 9.3 / 9.4)

- Sun-compute cache **15 min**, buildings cache **24h**, CDN `s-maxage` **30s** (see `lib/services/sun-engine-cache.ts` + architecture.md Caching Strategy). Caching is a process-scoped TTL `Map` (deliberately NOT `unstable_cache` — lossless + fake-timer-testable). The sun-compute cache caches **SUCCESS only** — a degraded/building-RPC-failed outcome is never pinned.
- The client planner-slider step `PLANNER_STEP_MINUTES = 15` equals the server 15-min cache bucket, so a settled (debounced) client fetch lands on a warm server-cache boundary. TanStack `staleTime` stays 5 min.
- **Sun-compute refactors must be byte-identical to the pre-refactor `main` baseline** — a diff in sun output is a FAIL, not a rebaseline.

### Query hygiene / TanStack de-dupe invariant (Stories 9.4 / 9.7)

- The MapView `useVenueSearch` first-paint fetch is gated on `enabled` + `coordsSettled` (settled geolocation) and masks planner-time changes with `useDeferredValue` + `keepPreviousData`. `VenueSearchShell`'s typed-search call site is intentionally LEFT ungated (debounced/user-initiated). Distinguish the two call sites when query-gating.
- **DE-DUPE INVARIANT:** the two `useVenueSearch` call sites (nav tag-chips in `DesktopNavBar` + MapView list/pins) MUST have byte-identical query keys — same `SEARCH_RADIUS_KM`, coords/status, `useDeferredValue(plannerQuery)`, `coordsSettled` gate — or TanStack won't collapse them into one request. Any story touching either call site must assert key parity (there is a de-dupe-invariant test).

### Honest-data conventions (Stories 9.1 / 9.5 / 9.9)

- **`distanceIsApproximate` threading:** when a venue's distance is computed from the Gothenburg-centrum fallback (not a real user location), an `≈ från centrum` / `≈ from centre` qualifier must render. This threads via a `distanceIsApproximate` prop (wired from `locationIsApproximate` at both MapView call sites) into `VenueQuickInfo` / `VenueCard` / `VenueDetailContent` / `VenueList`, with a parity-guarded `quickInfo.distanceApproximate` i18n key. Do not display a real-looking distance while suppressing the qualifier.
- **De-bloat / removal stories:** grep i18n-key and label readers BEYOND the listed components — forced-state frames (`ForcedVenueDetailInitialFrame.tsx`, `lib/dev/forced-venue-detail.ts`) also consume `detail.*` labels and can keep a "removed" key alive. `venue-visual-metadata.ts` still computes fabricated `exposure`/`bestAt`/`seats`/`predictionUncertainty` for the RouteOverlay's single label word (the KEEP path) — do not over-delete; reduce only what the % still needs.

### Shared cross-subtree state — `TagFilterContext` + `retainTags` (Story 9.7)

- The tag-chip UI (`DesktopNavBar` subtree) and the venue surfaces (`MapView` subtree) live in **separate React subtrees joined only at `AppContextProviders`**. Cross-subtree filter/selection state MUST live in a shared context — lifting into `MapView` will not reach the nav.
- `TagFilterContext` (`lib/contexts/TagFilterContext.tsx`) holds `activeTags` as a `ReadonlySet<string>` of **canonical (Swedish) stored tag values** — matching is always canonical; only the rendered chip label is localized via `lib/utils/venue-tags.ts`.
- **Multi-chip semantics = OR/UNION** (a venue matches ANY active tag, `.some()`), NOT AND/intersect. Zero active tags = show all.
- The **`retainTags(availableTags)` pattern:** prune `activeTags` to the intersection with the currently-loaded venue set's tag union, so a stale active filter can't strand the list+pins to empty with no chip left to clear it. Reuse this pattern for any chip/filter set whose vocabulary can shrink.
- Tags are a real additive live contract: `tags text[] not null default '{}'` on `public.venues`. Never invent tags beyond the ratified vocabulary; values were migrated deterministically from `venue-visual-metadata.ts`.

### Share URLs from raw `window.location` (Story 9.8)

- **Build share/deep-link URLs from raw `window.location` (`origin`+`pathname`+`search`), NOT next-intl's `usePathname()`** — `usePathname()` strips the locale prefix, so an English user would otherwise share an unlocalized link. Reading raw `window.location` preserves the `localePrefix: 'as-needed'` segment (sv unprefixed `/`, en `/en`).
- Share deep-links REUSE the existing `?venue=<slug>` query param (built via `lib/utils/share.ts` `buildVenueShareUrl`) — there is NO `/v/<slug>` page route (only `app/api/venues/[slug]`). Sharing is a regression test over existing routing, not re-architecture.
- **NO-DEAD-TILES principle (the epic's raison d'être):** never ship a silently-dead control. Share targets with no real web share-intent (Instagram/Snapchat) are omitted or fall back to copy-link — never a tile that does nothing.
- The share module deliberately opens no popup and routes through no maps helper, so the `routing-boundary.test.ts` contract does not apply to it. **That test greps literal `window.open(` / `maps.apple` / `google.com/maps` / `geo:` even inside comments/prose** — scanned files must avoid those literals in comment text.

### Production planner-forcing gate (Story 9.0)

- The dev-only `_time=` / `_date=` / `_state=` planner-forcing URL params are **prod-gated**: in `NODE_ENV === 'production'` they are inert (dead-code-eliminated). 9.0 used a two-component split — `DefaultTimeProviders` (prod) + `DevSearchParamTimeProviders` (dev/test) in `AppContextProviders` — so the `useSearchParams` reads are DCE-eligible in prod with no `react-hooks/rules-of-hooks` disable. Reuse this split pattern for other `NODE_ENV`-gated provider reads.
- **CI implication:** the deterministic sun e2e specs rely on `?_time=13:00` forcing. This stays green ONLY because CI runs Playwright against `next dev` (`NODE_ENV=development`) per `playwright.config.ts` webServer — the prod-gate does not fire. **If the Playwright webServer ever switches to a production build, the prod-gate disables forcing and the deterministic sun specs break.**

### Visual gate on this host + rebaseline convention

- **HOST TOOLING BUG (affects ALL frontend stories):** `.claude/scripts/visual-validate.sh` screenshots via `mktemp /tmp/impl-XXXXXX.png` — a path the Windows-native Playwright binary CANNOT write — so the automated visual gate always errors `"Could not screenshot dev server"` on this host. Workaround: the documented manual path (`VISUAL_VALIDATE_PROVIDER=none ALLOW_MANUAL_VISUAL_VALIDATION=1`) with byte-identical reproduction. Do not modify the gate script; the maintainer must make the temp path Windows-portable.
- **Reference-PNG rebaseline convention (visual-gate inversion):** for de-bloat/removal/redesign stories the reference screenshot is the OLD design, so a *correct* implementation FAILS the LLM visual gate until the reference is re-baselined. This is expected — it routes to maintainer sign-off. **The dev agent is FORBIDDEN from editing or self-blessing reference PNGs.** Epic 9 left a rebaseline cascade pending (`map-with-selected-venue` / `venue-detail` / `map-primary` mobile refs + new share-modal & user-location-dot refs); a green visual gate cannot be truthfully claimed until the maintainer rebaselines. Every rebaseline is logged in `nextjs-app/docs/design/references/REBASELINE-LOG.md`.
- Stale-Turbopack-CSS trap: a running `next dev` can keep serving old CSS after a `globals.css` edit — a full `.next` wipe + restart may be needed before capturing. Verify the served chunk before any visual capture.

### Design-token gaps flagged by Epic 9 (token candidates, not yet added)

- `#d97706` UserPin colour has no DESIGN.md token (raw reference value used — do NOT invent a token ad-hoc; flagged as a candidate). No `--color-status-success` / green token exists — the share copy-confirmation fell back to `surface-sand` / `amber-dark` + a Check icon.
- **`DESIGN.md` can encode a defect:** it documented the buggy `--gradient-route-button`. A design-token code fix is incomplete without a same-change `DESIGN.md` sync (doc-vs-code drift).

---

## Epic 10 Ratified Conventions

Durable patterns ratified during Epic 10 ("Honest Sky" — weather-gated two-signal sun display, stories 10.1–10.5). These are **binding** for any story that reads or writes venue sun status, sky condition, or weather. Full rationale lives in `_bmad-output/auto-bmad/retro-notes/epic-10.md` and the deferred queue.

### The two-signal honest-sky model (Stories 10.1 / 10.3 / 10.4)

- SunnySeat computes sun in **two orthogonal passes**, and the second must never be discarded:
  1. **Geometric sun potential** — NREL SPA + shadow/terrain geometry produce a headline (`Sunny` / `Partial` / `Shaded` / `NoSun`) that answers "could the sun reach this seating area?" This is the ONLY thing that ranks the list — **"Mest sol" list ranking stays on geometric sunlight (solläge), never on the weather-gated status.**
  2. **Weather truth** — Met.no cloud + Nowcast radar-rain gate that geometric potential.
- **The cloud gate (`applyCloudGate` in `lib/services/sun-engine.ts`):** a geometrically-`Sunny`/`Partial` venue flips to the new **`CloudObscured`** status when `effectiveCloudCover >= CLOUD_GATE_THRESHOLD_PERCENT` (**= 80**, `sun-engine.ts:98`) OR it is raining near-now. The gate is a **one-way, additive** term: it can only turn `Sunny`/`Partial` → `CloudObscured`. Below-horizon `NoSun` and geometric `Shaded` are NEVER gated (they win — over rain too). Re-tuning the 80 threshold or the layer weights must not break this precedence; tests assert boundary *intent*, not the exact number.
- **Effective vs raw cloud cover (`lib/solar/effective-cloud-cover.ts`):** the gate and the FR12 confidence blend read **layer-weighted `effectiveCloudCover`** = `clamp(1.0*low + 1.0*medium + 0.25*high, 0, 100)` (`CLOUD_WEIGHT_LOW/MEDIUM/HIGH`). Thin high cirrus (weight 0.25) transmits direct sun, so 100%-cirrus-only lands at 25 and does NOT gate, while a 100% low deck lands at 100 and does. **`skyCondition` (the displayed sky line) reads the RAW total `cloud_area_fraction`** via `skyConditionFromCloudCover` (observable-sky honesty), NOT the effective value — do not "simplify" the two into one. Layer weighting applies ONLY when all three low/med/high bands are present; any missing band degrades to the raw total (Tier-0 behaviour).
- **Rain precedence (Story 10.4):** rain is a near-now Nowcast 2.0 radar signal (`lib/weather/nowcast-service.ts`, `NOWCAST_HORIZON_MS = 90 min`, deduped via `createDedupedNowcastFetcher`). `skyCondition` precedence is **rain > overcast** — the precedence lives at the `sun-engine` call site, not inside `skyConditionFromCloudCover` (which stays pure and rain-unaware). `applyCloudGate`'s 4th param is `isRaining` (landed optional `= false` to keep pre-10.4 3-arg pure-helper assertions byte-identical; 3-arg semantics = no rain).

### `undefined` never `0` — the missing-weather discipline (Stories 10.1 / 10.3 / 10.4)

- **A missing weather field stays `undefined`, never coerced to `0`.** `undefined` cloud cover is BOTH non-gating AND non-clear (it never fabricates a sunny sky and never gates). `undefined` `precipitation_rate` (radar coverage insufficient — Met.no OMITS the field) contributes nothing; only a strictly-positive rate fires the rain gate. **Never `?? 0` a cloud fraction or a rain rate** — `getForecast` missing `cloud_area_fraction` yields `undefined`, not `0`; this is a hard, load-bearing invariant an honesty-first app cannot regress. For a weather-missing venue, `skyCondition` is left ABSENT (never a fabricated `'clear'`).

### Exhaustiveness-forcing union consumers (Stories 10.1 / 10.2, ratified at epic review)

- `VenueSunStatus` now includes `CloudObscured`; `SkyCondition` carries `rain` / `overcast` / `unavailable` etc. **Every consumer that switches on these unions must use a `never`-exhaustive switch** so adding a future member is a compile error, not a silent fall-through.
- **The sweep must reach the API and DB validation layers, not just render sites.** The epic review found `CloudObscured` was silently rejected by the feedback-API Zod enum AND the live DB `CHECK` because the 10.1 consumer sweep covered render/compile sites only. **`as const satisfies X[]` checks membership, not exhaustiveness** — use an **exhaustiveness-forcing `Record<Union, true>` allow-list** whose keys are the union (e.g. `feedback/route.ts:33` `satisfies Record<VenueSunStatus, true>`, `venue-store.ts:372` `satisfies Record<SkyCondition, true>`) so a new member forces every allow-list to update. When extending either union, grep BOTH render consumers (`currentSunStatus` / `sunStatus` / `predictedState` / `skyCondition`) AND the API-Zod-enum + DB-CHECK validation layers.
- **Resolved inert-guard debt (Story 11.7):** the orphaned `toSunStatusToken` mapper (`lib/utils/sun-status-presentation.ts`) — advertised as the single exhaustive DTO→token predicate but consumed by no render surface (every surface branches inline) — was **deleted** in Story 11.7 rather than wired in (wiring ~7 surfaces would touch visuals). The `never`-exhaustive compile-time guard over `VenueSunStatus` survives via the sibling `windowLabelTier` switch in the same module. Obscured surfaces continue to branch inline on `isObscuredSunStatus(...)` / `sunStatus === 'CloudObscured'`.

### No live Met.no in any test — shared setup guard (Story 10.4 / 10.5)

- **A green vitest run cannot detect a masked live call** (the weather client swallows fetch errors to `undefined`). `nextjs-app/test/setup/setup.ts` installs a `beforeEach` fetch guard that **hard-rejects any outbound request whose host is `api.met.no`** with a fix-hint message. Mock `@/lib/weather/met-no-service` / `@/lib/weather/nowcast-service` (or inject an override) — never let a test reach the live host. The guard is surgical (only `api.met.no`; relative/same-origin and other absolute hosts pass through). A new weather-touching test that suddenly fails with the guard message means an un-mocked lazy-import path, not a flake.

### Mixed-EOL blob reconstruction trap (Story 10.3)

- **`nextjs-app/lib/solar/confidence-calculator.ts` is stored mixed-EOL** (~230 CRLF + ~70 LF lines) under `core.autocrlf=true` with no `.gitattributes` normalization rule. A naive Read→Edit round-trip pure-CRLF-ifies the whole file and produces ~73 lines of phantom EOL churn that pollutes the diff and code review. When editing this file (or any similarly mixed-EOL `.ts` blob), **reconstruct touched lines preserving the parent blob's per-line EOLs** — do not let the editor rewrite the whole file's line endings. (Repo-wide `* text=auto` / `*.ts text eol=lf` normalization would kill the class; flagged for a maintainer pass, not yet applied.)

### Deterministic weather e2e seam (Story 10.5)

- **E2E weather-boundary specs mock at the DTO boundary with `page.route`, NOT via `?_state` or `?venue=`.** The 10.2 `?_state` force-visual ids normalize every venue to `Sunny` (clobbering a mocked status/sky), and `?venue=<slug>` opens the detail and suppresses the quick-info card. The working seam (`test/e2e/epic-10-weather-matrix.spec.ts`) is: `page.route` the list route `**/api/venues?**` and the detail route with a hand-built DTO (setting `currentSunStatus` / `skyCondition` / `precipitationRate` per scenario), plus a `page.route('**://api.met.no/**', …)` block so no live weather leaks, then drive UI selection to reach the card. Weather-missing scenarios omit `skyCondition` entirely (never fabricate a clear sky). The pure gate/weight boundary logic is exhaustively unit-tested; e2e mocks only the presentation contract.

### Deferred durable constraints carried forward from Epic 10

- **FR12 "confidence drops with cloud" is not yet user-observable:** `applyShadowDataCoverageCap` (`lib/solar/shadow-data-coverage.ts`) clips the DISPLAYED confidence to 60 for every venue whose cluster ships `status:'unknown'` (all current venues), so both clear-sky and 100%-overcast display 60. The `cloudConfidenceFactor` term fires in `calcCloudCertainty` but is invisible downstream. This reactivates only when a venue cluster ships `status:'eligible'` (or the cap is raised). Do not treat the flat displayed-60 as a bug in new stories.
- **`applyCloudGate`'s `isRaining = false` default** silently drops the rain signal for any future caller that forgets to thread it (a false "sunny during rain" — the worst outcome for an honesty-first app, with no compile error). Only one caller exists today and it threads correctly. If you add a new `applyCloudGate` caller or refactor `computeRealSunEngineResult`, **explicitly pass `isRaining`** and consider making the param required.

---

## Screen ID → Route Map

This table is read by `scripts/story-review.sh` and `scripts/visual-validate.sh` to resolve a story's screen ID to a dev-server route. Every screen ID referenced in a story's acceptance criteria must have a row here. Rows with both mobile and desktop variants need one row per viewport — the gate reads the viewport column to pick the reference-PNG subfolder and the Playwright viewport size.

| Screen ID                  | Route                                                       | Viewport | Notes                                                                                      |
|----------------------------|-------------------------------------------------------------|----------|--------------------------------------------------------------------------------------------|
| map-primary                | `/?_state=map-primary&_time=14:00`                          | mobile   | Returning-user default visual reference — map canvas + planner/date chrome + bottom nav; `_state` scopes reference-only sunny/list normalization and `_time` pins the MVP reference time. |
| map-primary                | `/?_time=16:30`                                             | desktop  | Top navbar + map canvas + 190 px venue list overlay panel; `_time` pins the MVP reference time. |
| onboarding                 | `/?_state=onboarding`                                       | mobile   | Warm amber gradient full-screen layer (bypasses localStorage gate in dev).                  |
| onboarding                 | `/?_state=onboarding`                                       | desktop  | Same forced state on desktop viewport.                                                      |
| map-panel-venues           | `/?_state=map-panel-venues&_time=14:00`                     | mobile   | Bottom sheet expanded from peek to the partial list/mid snap; `_time` pins the MVP reference time. |
| map-with-selected-venue    | `/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00` | mobile   | Pin selected state for current MVP reference; composition comes from refreshed PNG.          |
| map-with-obscured-venue    | `/?_state=map-with-obscured-venue&_time=14:00`             | mobile   | Story 10.2 "Sun Behind Clouds": deterministic weather-gated obscured surface — pins + selected-venue quick-info normalized to `CloudObscured` + `skyCondition: 'overcast'` (muted slate pill/badge, "Sol bakom moln" + sky line, geometric % preserved as position). No live Met.no; reachable on the fixture/CI path. Auto-selects the first venue like `map-with-selected-venue`. |
| map-with-obscured-venue    | `/?_state=map-with-obscured-venue&_time=14:00`             | desktop  | Same obscured surface on desktop viewport.                                                  |
| venue-detail               | `/?venue=test-venue-sunny&_state=venue-detail&_time=14:00`  | mobile   | Venue detail state with sun timeline and planner/date sync where active.                    |
| venue-detail               | `/?venue=test-venue-sunny&_state=venue-detail&_time=16:30`  | desktop  | 390 px right-side overlay panel with close button.                                          |
| venue-detail-obscured      | `/?venue=test-venue-sunny&_state=venue-detail-obscured&_time=14:00` | mobile   | Story 10.2: the venue-detail surface with the seeded venue in the weather-gated `CloudObscured` + `overcast` state (muted hero badge/headline + sky line; the sun timeline stays as clear-sky potential). No live Met.no. |
| venue-detail-obscured      | `/?venue=test-venue-sunny&_state=venue-detail-obscured&_time=16:30` | desktop  | Same obscured detail surface on desktop viewport.                                            |
| feedback                   | `/?venue=test-venue-sunny&_state=feedback`                  | mobile   | Inline feedback prompt within venue-detail.                                                 |
| review                     | `/?venue=test-venue-sunny&_state=review`                    | mobile   | Inline review form opened via "Lämna ett omdöme" CTA.                                       |
| premium-upsell             | `/?_state=premium-upsell`                                   | mobile   | Future Monetization only — inactive in MVP; planner/date/favourites are free.               |
| premium-paywall            | `/?_state=premium-paywall`                                  | mobile   | Future Monetization only — full-screen paywall reference with Swish CTA.                    |
| premium-paywall            | `/?_state=premium-paywall`                                  | desktop  | Future Monetization only — two-column modal reference (features + QR code).                 |
| premium-paywall-processing | `/?_state=premium-paywall-processing`                       | mobile   | Future Monetization only — paywall processing reference.                                    |
| premium-paywall-processing | `/?_state=premium-paywall-processing`                       | desktop  | Future Monetization only — same modal, processing state.                                    |
| payment-failed             | `/?_state=payment-failed`                                   | mobile   | Future Monetization only — payment failure reference.                                       |
| payment-failed             | `/?_state=payment-failed`                                   | desktop  | Future Monetization only — payment failure reference.                                       |
| not-found                  | `/__sunnyseat-invalid`                                      | mobile   | Deliberately-invalid path so Next.js renders the 404 page.                                  |
| not-found                  | `/__sunnyseat-invalid`                                      | desktop  | Same content with the desktop top navbar.                                                   |
| about                      | `/about`                                                    | mobile   | Real standalone route; refreshed MVP mobile nav uses `Nära mig`/`Favoriter`, so this is not a bottom-tab entry. |
| about                      | `/about`                                                    | desktop  | Real standalone route — reached via the top navbar link.                                    |
| premium-recovery           | `/?_state=premium-recovery`                                 | mobile   | Future Monetization only — Swish transaction recovery reference.                            |
| premium-recovery           | `/?_state=premium-recovery`                                 | desktop  | Future Monetization only — same form on desktop viewport.                                   |
| favourites-tab             | `/favoriter?_state=favourites-tab&_time=14:00`             | mobile   | Real bottom-nav destination — `_state` makes the seeded saved-favourites visual gate discoverable and deterministic while storage seeding supplies venue cards; `_time` pins the reference time. |
| favourites-tab             | `/favoriter?_state=favourites-tab&_time=14:00`             | desktop  | Same seeded saved-favourites content via desktop navigation with reference time pinned.      |
| map-primary-offline        | `/?_state=map-primary-offline`                              | mobile   | Cached shell, no venue data, persistent offline banner.                                     |
| map-primary-offline        | `/?_state=map-primary-offline`                              | desktop  | Same offline state on desktop.                                                              |

---

## Gothenburg Constants

- **Latitude:** 57.7089 | **Longitude:** 11.9746 | **Elevation:** 12m
- **Timezone:** Europe/Stockholm (CET/CEST, UTC handled server-side)
- **Sun season:** March–October (useful outdoor sun hours)
- **MVP geodata bbox:** EPSG:3007 `x=140000..150000, y=6390000..6410000`
- **Building/shadow data:** 2D Lantmäteriet footprints + Göteborg Baskarta XYZ object inventory + Göteborg Höjdmodell 2022 DTM-derived ground elevation. Current runtime building casters are derived from the first validated Baskarta subset, `byggnad_l` roof/facade/shelter linework; broader Baskarta XYZ layers must be preflighted, classified, and kept inactive or low-confidence until validated. Runtime must use filtered/active shadow-caster records only; review/quarantine records are not runtime-active until spot-checked.
- **Weather source:** Met.no (primary, free, Norwegian Meteorological Institute) — Locationforecast 2.0 `complete` for the three-layer cloud split (low/medium/high) + Nowcast 2.0 for the near-now radar-rain signal. No live Met.no fetch is allowed in tests (shared setup guard).
