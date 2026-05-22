# SunnySeat — Project Context

> **Purpose:** This file is the BMAD dev agent's injection point for design awareness. BMAD's dev agent (Amelia) loads this as foundational reference in Step 2 of its workflow. It lives at the project root — not inside `_bmad/` — so it survives BMAD reinstalls without being overwritten.
>
> Last updated: 2026-05-21
>
> **MVP scope correction:** planner, future date simulation, and favourites are free MVP functionality. Season Pass / Swish is Future Monetization only.

---

## What Is SunnySeat?

A backend API application that helps people in Gothenburg find outdoor venue seating in direct sunlight right now. Combines real-time solar position calculations, 2.5D building shadow modeling, and Met.no weather data into venue-level sunlight predictions with confidence scoring. The front-end is being rebuilt from scratch in Epic 1 of the current plan.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.2 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (CSS-first tokens) |
| UI Primitives | shadcn/ui v4 |
| Map | MapLibre GL JS 5.x |
| Data Fetching | TanStack Query 5.x |
| Animation | Motion 12.x |
| i18n | next-intl |
| Search / Command | cmdk |
| PWA | Serwist |
| Database | Supabase (PostgreSQL 15 + PostGIS) |
| Sun Engine | TypeScript — NREL SPA + Turf.js (`nextjs-app/lib/solar/`) |
| Weather | Met.no Locationforecast 2.0 (`nextjs-app/lib/weather/`) |
| Auth (Admin) | JWT (bcryptjs + jsonwebtoken) |
| Payments | Swish Merchant API (Season Pass, Future Monetization only) |
| Validation | Zod v4 |
| Hosting | Vercel (Fluid Compute, Cron, CDN) |
| Testing | Vitest + Playwright |

### Current State

- **Epics 1–3, 6, 6R, 7: Complete.** Backend foundation, sun/shadow engine, weather integration, platform migration from .NET/Azure to Next.js/Vercel/Supabase, admin operations platform.
- **Front-end: Fully removed (2026-03-25).** Clean slate for the fresh rebuild.
- **Front-end rebuild — in Epic 2.** Epic 1 is complete, Story 2.4 is done, and Story 2.5 is in correction under the 2026-05-19 MVP scope correction plus the 2026-05-21 Claude Design split. PRD v3.1 and `epics.md` make planner/date/favourites free and preserve Season Pass / Swish as Future Monetization. Active MVP QA planning uses `_bmad-output/qa/mvp-test-design-scope-correction-2026-05-19.md`; older TEA QA docs are historical/Future Monetization input where they mention premium/payment scope.

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
| Implementation Readiness Report | `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-15.md` |
| Sprint Status | `_bmad-output/implementation-artifacts/sprint-status.yaml` |

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

## Screen ID → Route Map

This table is read by `scripts/story-review.sh` and `scripts/visual-validate.sh` to resolve a story's screen ID to a dev-server route. Every screen ID referenced in a story's acceptance criteria must have a row here. Rows with both mobile and desktop variants need one row per viewport — the gate reads the viewport column to pick the reference-PNG subfolder and the Playwright viewport size.

| Screen ID                  | Route                                                       | Viewport | Notes                                                                                      |
|----------------------------|-------------------------------------------------------------|----------|--------------------------------------------------------------------------------------------|
| map-primary                | `/?_time=14:00`                                             | mobile   | Returning-user default — map canvas + planner/date chrome + bottom nav; `_time` pins the MVP reference time. |
| map-primary                | `/?_time=16:30`                                             | desktop  | Top navbar + map canvas + 190 px venue list overlay panel; `_time` pins the MVP reference time. |
| onboarding                 | `/?_state=onboarding`                                       | mobile   | Warm amber gradient full-screen layer (bypasses localStorage gate in dev).                  |
| onboarding                 | `/?_state=onboarding`                                       | desktop  | Same forced state on desktop viewport.                                                      |
| map-panel-venues           | `/?_state=map-panel-venues&_time=14:00`                     | mobile   | Bottom sheet expanded from peek (force the full snap point); `_time` pins the MVP reference time. |
| map-with-selected-venue    | `/?venue=test-venue-sunny&_state=map-with-selected-venue&_time=14:00` | mobile   | Pin selected state for current MVP reference; composition comes from refreshed PNG.          |
| venue-detail               | `/?venue=test-venue-sunny&_state=venue-detail&_time=14:00`  | mobile   | Venue detail state with sun timeline and planner/date sync where active.                    |
| venue-detail               | `/?venue=test-venue-sunny&_state=venue-detail&_time=16:30`  | desktop  | 390 px right-side overlay panel with close button.                                          |
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
| favourites-tab             | `/favoriter`                                                | mobile   | Real bottom-nav destination — list of favourited venues with empty state.                   |
| favourites-tab             | `/favoriter`                                                | desktop  | Same content via desktop navigation.                                                        |
| map-primary-offline        | `/?_state=map-primary-offline`                              | mobile   | Cached shell, no venue data, persistent offline banner.                                     |
| map-primary-offline        | `/?_state=map-primary-offline`                              | desktop  | Same offline state on desktop.                                                              |

---

## Gothenburg Constants

- **Latitude:** 57.7089 | **Longitude:** 11.9746 | **Elevation:** 12m
- **Timezone:** Europe/Stockholm (CET/CEST, UTC handled server-side)
- **Sun season:** March–October (useful outdoor sun hours)
- **Building data:** Lantmäteriet GeoPackage (.gpkg)
- **Weather source:** Met.no (primary, free, Norwegian Meteorological Institute)
