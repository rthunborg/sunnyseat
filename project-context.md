# SunnySeat — Project Context

> **Purpose:** This file is the BMAD dev agent's injection point for design awareness. BMAD's dev agent (Amelia) loads this as foundational reference in Step 2 of its workflow. It lives at the project root — not inside `_bmad/` — so it survives BMAD reinstalls without being overwritten.
>
> Last updated: 2026-04-15

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
| Payments | Swish Merchant API (Season Pass) |
| Validation | Zod v4 |
| Hosting | Vercel (Fluid Compute, Cron, CDN) |
| Testing | Vitest + Playwright |

### Current State

- **Epics 1–3, 6, 6R, 7: Complete.** Backend foundation, sun/shadow engine, weather integration, platform migration from .NET/Azure to Next.js/Vercel/Supabase, admin operations platform.
- **Front-end: Fully removed (2026-03-25).** Clean slate for the fresh rebuild.
- **Epic 1 (front-end rebuild) — Ready for implementation.** PRD v3.0, frontend architecture, UX design specification, and design system all complete. 7 front-end epics / 32 stories defined in `epics.md` v3.0. Start point: Story 1.1 — Project Scaffold & Design System Foundation.

---

## Key Documents

| Document | Path |
|----------|------|
| Project Context (this file) | `project-context.md` |
| PRD (v3.0) | `_bmad-output/planning-artifacts/prd.md` |
| Project Brief | `_bmad-output/planning-artifacts/brief/project-brief.md` |
| Architecture | `_bmad-output/planning-artifacts/architecture.md` |
| UX Design Specification | `_bmad-output/planning-artifacts/ux-design-specification.md` |
| Epics & Stories (v3.0) | `_bmad-output/planning-artifacts/epics.md` |
| Design Decisions | `_bmad-output/planning-artifacts/decisions/` |
| Implementation Readiness Report | `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-15.md` |
| Sprint Status | `_bmad-output/implementation-artifacts/sprint-status.yaml` |

---

## Design Artifacts

**All frontend work must ground itself in these artifacts — no invention, no guesswork.**

| Artifact | Location |
|----------|----------|
| Design System (canonical tokens, components, motion) | `nextjs-app/docs/design/DESIGN.md` |
| Figma File | [SunnySeat on Figma](https://www.figma.com/design/Oh75qPnFfSWKHSsyVSBQbT/SunnySeat) (key: `Oh75qPnFfSWKHSsyVSBQbT`) |
| Screen References — Mobile | `nextjs-app/docs/design/references/screens/mobile/` (13 PNGs) |
| Screen References — Desktop | `nextjs-app/docs/design/references/screens/desktop/` (8 PNGs) |
| Component References | `nextjs-app/docs/design/references/components/` (41 PNGs) |
| UX Spec (Screen Inventory + behaviour) | `_bmad-output/planning-artifacts/ux-design-specification.md` §`Screen Inventory` |

### Frontend Implementation Rules

These rules are binding for any story touching the UI. They are enforced by the `frontend-component` skill and the sprint-status gate.

1. **Read DESIGN.md before writing any UI code.** Tokens are the single source of truth for colour, type, spacing, radius, shadow, motion. Never introduce a raw hex value, ad-hoc px spacing, or custom shadow.
2. **Match the visual outcome, not the Figma implementation.** Figma frames define what the screen should *look like*, not the component architecture. Use sensible React decomposition and the nearest design token — do not clone layer trees or arbitrary pixel values.
3. **Reference the correct screen PNG at the correct viewport.** Mobile work reads from `references/screens/mobile/`, desktop from `references/screens/desktop/`. If both viewports exist, both must be implemented and both must pass visual validation.
4. **Read the UX spec behaviour section for the screen.** Animation timings, state transitions, loading/empty/error patterns, and interaction mechanics come from `ux-design-specification.md` — not from the agent's intuition.
5. **Swedish copy is the default.** Button labels, empty states, errors, tab labels — all Swedish as specified. English fallbacks only for dev/debug surfaces.
6. **Accessibility is not optional.** WCAG 2.1 AA minimum. Every interactive element has a 44×44 px minimum touch target, visible focus indicator, and a semantic role. `prefers-reduced-motion` must disable non-essential animation.

---

## Custom Skills

The following skills are installed in `.claude/skills/` and provide domain-specific knowledge during implementation. They auto-trigger contextually, but are listed here so the dev agent knows to consult them:

- **frontend-component** — READ BEFORE any frontend work. Design token rules, Figma reference discipline, visual-outcome-not-implementation-spec principle, UX behaviour spec requirements, accessibility.
- **visual-validation** — How the screenshot comparison gate works. Consult when visual validation fails or when debugging PASS/FAIL results. The gate reads the Screen ID → Route Map below to know where to navigate.
- **test-gate** — Test requirements policy. What must pass (type-check, lint, unit, integration, visual validation) before a story may transition to `review`, and how the sprint-status gate enforces story completion.
- **bmad-story-brief** — BMAD story format, acceptance criteria structure, definition of done, and task brief format for sub-agent delegation.
- **story-file-audit** — MANDATORY after every story file creation. Runs a seven-point self-audit verifying ACs, task sequencing, file impact, and test gate match epics.md and CLAUDE.md. Must pass before the story is marked ready-for-dev.
- **review-round-guard** — MANDATORY before invoking bmad-code-review. Caps automatic review rounds at three per story and forces human decision beyond the cap. Prevents review loop waste.

---

## Dev-Only State Forcing Convention

Many screens in SunnySeat are **state variants of the same URL** — the paywall overlay, onboarding screen, inline feedback flow, etc. To let the visual validation gate (and any Playwright test) reach these states by URL alone, the project uses a dev-only `_state` query parameter.

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

This table is read by `scripts/sprint-status-gate.sh` (via `visual-validate.sh`) to resolve a story's screen ID to a dev-server route. Every screen ID referenced in a story's acceptance criteria must have a row here. Rows with both mobile and desktop variants need one row per viewport — the gate reads the viewport column to pick the reference-PNG subfolder and the Playwright viewport size.

| Screen ID                  | Route                                                       | Viewport | Notes                                                                                      |
|----------------------------|-------------------------------------------------------------|----------|--------------------------------------------------------------------------------------------|
| map-primary                | `/`                                                         | mobile   | Returning-user default — map canvas + glass header + time slider + bottom nav.              |
| map-primary                | `/`                                                         | desktop  | Top navbar + map canvas + 190 px venue list overlay panel.                                  |
| onboarding                 | `/?_state=onboarding`                                       | mobile   | Warm amber gradient full-screen layer (bypasses localStorage gate in dev).                  |
| onboarding                 | `/?_state=onboarding`                                       | desktop  | Same forced state on desktop viewport.                                                      |
| map-panel-venues           | `/?_state=map-panel-venues`                                 | mobile   | Bottom sheet expanded from peek (force the full snap point).                                |
| map-with-selected-venue    | `/?venue=test-venue-sunny&_state=map-with-selected-venue`   | mobile   | Pin selected → quick-info card visible above bottom nav.                                    |
| venue-detail               | `/?venue=test-venue-sunny&_state=venue-detail`              | mobile   | Full-screen bottom sheet: hero image, SunTimeline, RouteButton.                             |
| venue-detail               | `/?venue=test-venue-sunny&_state=venue-detail`              | desktop  | 390 px right-side overlay panel with close button.                                          |
| feedback                   | `/?venue=test-venue-sunny&_state=feedback`                  | mobile   | Inline feedback prompt within venue-detail.                                                 |
| review                     | `/?venue=test-venue-sunny&_state=review`                    | mobile   | Inline review form opened via "Lämna ett omdöme" CTA.                                       |
| premium-upsell             | `/?_state=premium-upsell`                                   | mobile   | Upsell card overlay triggered from the planner / future-date slider.                        |
| premium-paywall            | `/?_state=premium-paywall`                                  | mobile   | Full-screen paywall overlay with feature list, price, Swish CTA.                            |
| premium-paywall            | `/?_state=premium-paywall`                                  | desktop  | Two-column modal overlay (features + QR code).                                              |
| premium-paywall-processing | `/?_state=premium-paywall-processing`                       | mobile   | Paywall internal state after Swish deep-link is triggered.                                  |
| premium-paywall-processing | `/?_state=premium-paywall-processing`                       | desktop  | Same modal, processing state.                                                               |
| payment-failed             | `/?_state=payment-failed`                                   | mobile   | Fade-in overlay after processing fails. Replaces the paywall-processing state.              |
| payment-failed             | `/?_state=payment-failed`                                   | desktop  | Same fade-in overlay on desktop viewport.                                                   |
| not-found                  | `/__sunnyseat-invalid`                                      | mobile   | Deliberately-invalid path so Next.js renders the 404 page.                                  |
| not-found                  | `/__sunnyseat-invalid`                                      | desktop  | Same content with the desktop top navbar.                                                   |
| about                      | `/about`                                                    | mobile   | Real standalone route — reached via the "Om" bottom nav tab.                                |
| about                      | `/about`                                                    | desktop  | Real standalone route — reached via the top navbar link.                                    |
| premium-recovery           | `/?_state=premium-recovery`                                 | mobile   | Swish transaction recovery form — distinct state from paywall/processing.                   |
| premium-recovery           | `/?_state=premium-recovery`                                 | desktop  | Same form on desktop viewport.                                                              |
| favourites-tab             | `/favoriter`                                                | mobile   | Real bottom-nav destination — list of favourited venues with empty state.                   |
| favourites-tab             | `/favoriter`                                                | desktop  | Same content via desktop navigation.                                                        |
| map-primary-offline        | `/?_state=offline`                                          | mobile   | Cached shell, no venue data, persistent offline banner.                                     |
| map-primary-offline        | `/?_state=offline`                                          | desktop  | Same offline state on desktop.                                                              |

---

## Gothenburg Constants

- **Latitude:** 57.7089 | **Longitude:** 11.9746 | **Elevation:** 12m
- **Timezone:** Europe/Stockholm (CET/CEST, UTC handled server-side)
- **Sun season:** March–October (useful outdoor sun hours)
- **Building data:** Lantmäteriet GeoPackage (.gpkg)
- **Weather source:** Met.no (primary, free, Norwegian Meteorological Institute)
