# Project: SunnySeat

A sun-prediction PWA for Gothenburg that answers "which venue's outdoor seating is in direct sun right now?" It combines 2.5D building shadow geometry (NREL SPA + Turf.js), Met.no weather, and a venue database into confidence-scored per-venue sunlight predictions. Backend engine (Epics 1–7 of the original plan) is complete; this phase is a full front-end rebuild on top of the existing APIs.

## Stack

> **Working directory:** The project root (`C:\Users\Rasmus\sunnyseat\`) is **not** the Next.js root. The application lives inside `nextjs-app/` — that's where `package.json`, `tsconfig.json`, `eslint.config.mjs`, and all source code live. Planning artifacts (`_bmad-output/`), the root `project-context.md`, building geodata, and this `CLAUDE.md` live at the project root. **When running test/lint/typecheck commands or any `npm`/`npx` invocation, always `cd nextjs-app/` first.** Git operations and reads of planning docs happen from the root.

- Frontend: Next.js 16.2.2 (App Router, Turbopack) · TypeScript strict · Tailwind CSS v4 (CSS-first `@theme`) · shadcn/ui v4 · MapLibre GL JS 5.x · TanStack Query 5.x · Motion 12.x (`motion/react`) · @use-gesture/react · cmdk · next-intl · Serwist (PWA) · date-fns-tz
- Backend: Supabase (PostgreSQL 15 + PostGIS) · Next.js API routes (REST) · Zod v4 validation · JWT admin auth (bcryptjs + jsonwebtoken) · Swish Merchant API (Season Pass payments) · Met.no Locationforecast 2.0
- Deployment: Vercel (Fluid Compute, Cron, CDN)

### Commands (post-scaffold — available from Story 1.1 completion onward)
- Test runner: `cd nextjs-app && npx vitest run` (unit + component)
- E2E tests: `cd nextjs-app && npx playwright test`
- Lint command: `cd nextjs-app && npx eslint . --quiet`
- Type check command: `cd nextjs-app && npx tsc --noEmit`

> **⚠️ Pre-scaffold state — Epic 1 Story 1.1 in progress.** `package.json` currently ships only `@playwright/test`. Vitest, ESLint deps, shadcn/ui, MapLibre, TanStack Query, Motion, next-intl, Serwist, and the rest are **installed BY Story 1.1 itself** — that story's entire job is to scaffold this tooling.
>
> **While implementing Story 1.1**, the only test-gate commands that work are:
> - `cd nextjs-app && npx tsc --noEmit` (TypeScript is already configured in `tsconfig.json`)
> - `cd nextjs-app && npx playwright test` (Playwright is the only installed dep)
>
> The `vitest run` and `eslint . --quiet` commands **will fail** until Story 1.1 has installed their dependencies. Story 1.1's test gate therefore relies on typecheck + a minimal Playwright smoke test only. Once Story 1.1 is merged, all four commands above become the standard test-gate inputs for every subsequent story.
>
> **Scaffolding commands are expected and not constrained by this note.** `npm install`, `npx create-next-app` (or its equivalent config merges), `npx shadcn@latest init`, and other installer/config generators are exactly what Story 1.1 runs to install the missing dependencies — they are the story, not a violation of this rule.
>
> **TODO (remove after Story 1.1 merges):** delete this warning block once Vitest + ESLint are installed and the scaffold is complete.

## Repository layout

```
/                                          — project root
  project-context.md                        — design/project awareness injection (read first for any UI work)
  CLAUDE.md                                 — this file
  _bmad/                                    — BMAD method source (installed, do not edit)
  _bmad-output/
    planning-artifacts/                     — PRD (v3.0), architecture, epics, UX design spec, design mirror (READ FOR CONTEXT)
    implementation-artifacts/               — sprint-status.yaml, stories/
  building_geodata/                         — Lantmäteriet GeoPackage source files

  nextjs-app/                               — the application (all code lives here)
    app/                                    — Next.js App Router: pages, layouts, /api routes (scaffolded in Story 1.1)
    components/
      ui/                                   — LAYER 1: shadcn/ui primitives (Button, Card, Sheet, Slider, Badge, …)
      composed/                             — LAYER 2: multi-primitive compositions (VenueCard, SunTimeline, TimeSlider, SearchCombobox, FeedbackPrompt, SwishQRCode, …)
      custom/                               — LAYER 3: feature components — map/, venue/, sheets/, premium/, onboarding/, feedback/, social/, layout/
    hooks/
      queries/                              — TanStack Query wrappers (useVenueSearch, useVenueDetail, useSunExposure, …)
      mutations/                            — TanStack mutations (useSubmitFeedback, useCreatePayment, useRecoverPremium, …)
      (useMapContext, useTimeContext, usePremiumStatus, useMediaQuery, useGeolocation, useDragSheet, useFavourites, …)
    lib/
      solar/                                — EXISTING — NREL SPA + Turf.js sun/shadow engine (do not modify)
      weather/                              — EXISTING — Met.no Locationforecast 2.0 adapter
      supabase/                             — EXISTING — Supabase client/server/health/types
      middleware/                           — EXISTING — auth, admin-auth, request-logger
      buildings/                            — EXISTING — GeoJSON building import
      types/                                — api.ts, venue.ts, payment.ts, location.ts, design-tokens.ts (+ new: map.ts, premium.ts, review.ts)
      utils/                                — api-errors, validation, venue-mapping
      utils.ts                              — shadcn `cn()` helper
      validation/                           — Zod schemas (existing)
      contexts/                             — MapContext, TimeContext, PremiumContext, LanguageContext (added during scaffold)
      services/                             — pure functions: premium-token, swish-client, share, push-subscription, favourites-storage
      dev/                                  — dev-only helpers incl. use-forced-state.ts
      query-keys.ts                         — centralized TanStack Query key factory (single source of truth)
    messages/                               — next-intl translation files: sv/ (primary) + en/, scoped by feature (common, map, venue, premium, feedback, about)
    public/                                 — static assets, PWA icons, MapLibre pin sprites, og-image.png
    test/
      unit/                                 — mirrors lib/ structure
      components/                           — Vitest + Testing Library component tests
      e2e/                                  — Playwright journey tests (sun-discovery, premium-purchase, returning-user, partner-visibility)
      setup/                                — test-utils.tsx (render with providers, mock query client)
    docs/
      design/
        DESIGN.md                           — canonical design token system (READ BEFORE ANY FRONTEND WORK)
        references/screens/mobile/          — 13 Figma screen PNGs (designed at 390px)
        references/screens/desktop/         — 8 Figma screen PNGs (designed at 1280px)
        references/components/              — 41 component PNGs
      dev/
        state-forcing.md                    — dev-only `_state` query param convention
      background-jobs-inventory.md · environment-variables.md · vercel-deployment.md · github-actions-scheduled-jobs.md
    eslint.config.mjs · next.config.ts · tsconfig.json · vercel.json · package.json
```

The backend engine (`nextjs-app/lib/solar`, `lib/weather`, `lib/supabase`, `lib/middleware`, `lib/buildings`) is complete and must NOT be modified by front-end work. All data access from components flows through `app/api/*` routes.

> **Gitignored by design — don't try to `git log` or `git blame` these.** `_bmad-output/`, `_bmad/`, and the bulk of `.claude/` (except `.claude/scripts/`) are gitignored. Planning artifacts (PRD, architecture, epics, UX spec, design mirror), sprint-status.yaml, story files, and BMAD-installed skill definitions are **local-only and regenerate from BMAD workflows** — committing them would fight BMAD updates on reinstall. A fresh clone will not have them; `project-context.md` at the root is the durable tracked entry point that references everything else by path. The test-gate scripts at `.claude/scripts/sprint-status-gate.sh` and `.claude/scripts/visual-validate.sh` are the exception — they are project-specific tooling and travel with the repo.

## Critical rules
- **Design tokens are binding.** All frontend work must reference `nextjs-app/docs/design/DESIGN.md` and use Tailwind v4 `@theme` utilities. Never introduce raw hex values, ad-hoc px spacing, or custom shadows. If a value isn't in `@theme`, it doesn't belong in the code.
- **Match the visual outcome, not the Figma layer tree.** Figma frames define what the screen should *look like*, not the component architecture. Use sensible React decomposition and the nearest design token; do not clone layer trees or arbitrary pixel values.
- **UX spec defines behaviour.** Animation timings, state transitions, loading/empty/error patterns, and interaction mechanics come from `_bmad-output/planning-artifacts/ux-design-specification.md` — not from agent intuition.
- **API boundary is hard.** Front-end components (anything marked `'use client'`) must never import from `lib/solar`, `lib/weather`, `lib/supabase`, `lib/middleware`, or `lib/buildings`. All data access goes through `app/api/*` routes and is wrapped by hooks in `hooks/queries/` or `hooks/mutations/` using TanStack Query. Query keys come from `lib/query-keys.ts` — never constructed inline.
- **Three-layer component architecture.** `components/custom/` → `components/composed/` → `components/ui/`. Direction of dependency is one-way. Never skip layers.
- **Swedish copy is default.** Button labels, empty states, errors, tab labels — all Swedish. English only via next-intl for dev/debug surfaces. Use `useTranslations('venue')`-style scoped keys, never `t('venue.sunTimeline')`.
- **Accessibility is non-negotiable.** WCAG 2.1 AA minimum. Every interactive element has a 44×44 px minimum touch target, visible focus indicator, semantic role, and respects `prefers-reduced-motion`. Map pins differentiated by icon shape, not colour alone.
- **Performance budget.** ≤400 KB gzipped JS total. MapLibre is loaded async. Map tile failures fall back to `color-surface-sand`. Use shadcn `Skeleton` for loading — never full-page spinners.
- **Tests must pass before a story is marked complete.** Typecheck, lint, unit, component, and the visual validation gate all gate story completion.
- **No secrets or API keys in committed files.** `.env.local` is git-ignored; Vercel env vars hold production secrets.

## Dev-only conventions
- **State forcing via `?_state=<screen-id>`.** Components with multiple state variants (overlays, modals, sheets, error states) consume the `useForcedState()` hook from `nextjs-app/lib/dev/use-forced-state.ts`. The hook returns `null` when `process.env.NODE_ENV === 'production'`, so dead-code elimination strips every `_state` branch from production bundles. **Zero production footprint.** See `nextjs-app/docs/dev/state-forcing.md`. The canonical screen-ID → route map lives in `project-context.md` and is the source consumed by the visual validation gate.
- **Seeded dev venue slug.** Any screen ID that requires a venue (`map-with-selected-venue`, `venue-detail`, `feedback`, `review`) uses the fixed dev-seeded slug `test-venue-sunny`. This slug must exist in the development Supabase database; production data never uses it.
- **Story 1.2 gate.** The state-forcing mechanism is established as Epic 1 Story 1.2 and must ship before any state-variant screen story can be implemented.

## Custom skills (loaded contextually — always consult when relevant)
- **frontend-component** — READ BEFORE any frontend work. Design token rules, Figma reference discipline, visual-outcome-not-implementation-spec principle, UX behaviour spec requirements, accessibility checklist.
- **visual-validation** — How the screenshot comparison gate works. Reads the Screen ID → Route map in `project-context.md` to navigate to each state. Consult when the gate fails or when debugging screenshot comparison issues.
- **test-gate** — What must pass (typecheck, lint, unit, component, visual validation) before a story may transition to `review`, and how the sprint-status gate enforces story completion.
- **bmad-story-brief** — BMAD story format, acceptance criteria structure, and definition of done. Every front-end story needs four design gate criteria (Visual, Behaviour, Animation, Visual validation).

## Git workflow
- **One commit per completed story.** Commit message format: `feat(<epic-number>): <story title>` — e.g. `feat(1): Project Scaffold & Design System Foundation`, `feat(4): Swish Payment Flow`.
- **One branch per epic.** Branch name format: `epic/<epic-number>-<epic-slug>` — e.g. `epic/1-see-the-sun`, `epic/4-plan-ahead`. The seven front-end epics (v3.0 epics.md):
  1. See the Sun — Project Foundation & Core Map Discovery
  2. Explore & Compare — Venue List, Detail & Sun Intelligence
  3. Go & Confirm — Routing, Feedback & Reviews
  4. Plan Ahead — Premium Features & Swish Payment
  5. Partner Spotlight — B2B Venue Features
  6. Make It Personal — Favourites, History, Notifications & Sharing
  7. Polish & Platform — About, 404, PWA & Offline
- **Merge to `main`** after the epic passes manual review.
- **Start a fresh Claude Code session** for each new story so context stays scoped and token usage stays predictable.
