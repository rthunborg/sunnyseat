# Story 1.1: Project Scaffold & Design System Foundation

Status: done

## Story

As a **developer**,
I want a fully configured Next.js project with design tokens, custom fonts, and i18n infrastructure,
So that all subsequent feature development builds on a consistent, performant foundation.

## Acceptance Criteria

### AC1: Next.js Project Initialization

- **Given** the repository has existing backend code in `lib/`
- **When** the project is scaffolded with `create-next-app` (Next.js 16.2.2, TypeScript, Tailwind CSS v4, ESLint, App Router, Turbopack)
- **Then** the app starts with `npm run dev` and renders a placeholder page without errors
- **And** existing `lib/` backend code (solar, weather, supabase, middleware, types, utils, validation, buildings) is accessible via `@/` path alias

### AC2: Tailwind v4 Design Token Integration

- **Given** DESIGN.md defines colour, typography, spacing, shadow, radius, transition, z-index, gradient, blur, and component size tokens
- **When** the Tailwind v4 `@theme` block in `globals.css` is configured
- **Then** all DESIGN.md tokens are mapped to Tailwind utility classes (e.g., `bg-surface-cream`, `text-amber-dark`, `shadow-card`, `rounded-pill`)
- **And** no raw hex values, pixel sizes, or inline styles are needed for design system values

### AC3: Custom Font Configuration

- **Given** the design specifies Plus Jakarta Sans (display) and Manrope (UI text)
- **When** fonts are loaded via `next/font/google`
- **Then** both fonts render with `display: 'swap'`, are preloaded and self-hosted from the same origin
- **And** CSS custom properties are exposed for Tailwind v4 `@theme` integration
- **And** `size-adjust` is applied automatically by Next.js to minimize CLS

### AC4: Internationalization (i18n) Setup

- **Given** the app supports Swedish (primary) and English
- **When** next-intl is configured with locale files structured by feature area (`messages/sv/*.json`, `messages/en/*.json`)
- **Then** the locale resolution chain works: URL param → sessionStorage → navigator.language → default SV
- **And** the App Router `[locale]` segment is set up with `NextIntlClientProvider`

### AC5: shadcn/ui Component Library

- **Given** shadcn/ui is initialized
- **When** commodity components are needed (Button, Card, Skeleton, Slider, Badge, Input, Sheet, etc.)
- **Then** they are available in `components/ui/` with the project's design token theme applied

### AC6: Component Directory Architecture

- **Given** the architecture specifies a three-layer component structure
- **When** the directory structure is created
- **Then** `components/ui/`, `components/composed/`, and `components/custom/` directories exist with the feature-domain subdirectories defined in the architecture

> **No Design Gate Criteria for Story 1.1.** This story is infrastructure/scaffolding only. Visual validation first applies from Story 1.2 onward. This is intentional and documented in epics.md.

## Tasks / Subtasks

- [x] **Task 1: Scaffold Next.js app and install dependencies** (AC: #1)
  - [x] 1.1 Run `create-next-app` with flags: Next.js 16.2.2, TypeScript, Tailwind CSS v4, ESLint, App Router, Turbopack, `@/*` import alias
  - [x] 1.2 Reconcile generated config with existing files (`tsconfig.json`, `next.config.ts`, `eslint.config.mjs`) — extend, do not replace
  - [x] 1.3 Install additional production deps: next-intl, @tanstack/react-query 5.x, motion 12.x, @use-gesture/react, cmdk, date-fns-tz, maplibre-gl 5.x, serwist, bcryptjs, jsonwebtoken, zod
  - [x] 1.4 Install dev deps: vitest, @testing-library/react, @testing-library/jest-dom, eslint-plugin-jsx-a11y, @next/bundle-analyzer, @types/bcryptjs, @types/jsonwebtoken
  - [x] 1.5 Verify `clsx` and `tailwind-merge` are installed (required by existing `lib/utils.ts` cn helper)
  - [x] 1.6 Verify baseline: `npm run dev` starts, `npx tsc --noEmit` passes

- [x] **Task 2: Create app shell and providers** (AC: #1)
  - [x] 2.1 Create `app/layout.tsx` (Server Component — metadata, `<html lang>`, imports `<Providers>`)
  - [x] 2.2 Create `app/page.tsx` (placeholder page rendering "SunnySeat" to prove scaffold works)
  - [x] 2.3 Create `app/providers.tsx` (`'use client'` — QueryClientProvider wrapping children)
  - [x] 2.4 Create `app/not-found.tsx` (stub — detailed 404 is Story 7.2)
  - [x] 2.5 Extend `next.config.ts` for bundle analyzer and next-intl plugin
  - [x] 2.6 Add `package.json` scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`
  - [x] 2.7 Verify `npm run dev` renders the placeholder page without errors

- [x] **Task 3: Configure custom fonts** (AC: #3)
  - [x] 3.1 Import Plus Jakarta Sans (weights: 400, 500, 700, 800) via `next/font/google` in `app/layout.tsx`
  - [x] 3.2 Import Manrope (weights: 400, 500, 600, 700) via `next/font/google` in `app/layout.tsx`
  - [x] 3.3 Expose both as CSS custom properties (`--font-display`, `--font-ui`) via className/variable on `<html>`
  - [x] 3.4 Verify both fonts render with `display: 'swap'` and are self-hosted from the same origin

- [x] **Task 4: Configure Tailwind v4 design tokens** (AC: #2)
  - [x] 4.1 Create `app/globals.css` with `@import "tailwindcss"` and full `@theme` block
  - [x] 4.2 Reference font CSS vars from Task 3 in `@theme` (`--font-display: var(--font-plus-jakarta-sans)`, `--font-ui: var(--font-manrope)`)
  - [x] 4.3 Map ALL colour tokens from DESIGN.md (surfaces, amber palette, text, UI, glass, white)
  - [x] 4.4 Map ALL gradient tokens as `@utility` classes (route-button, cta-amber, premium-button, map-overlay, timeline-bar) — gradients cannot go in `@theme`
  - [x] 4.5 Map ALL typography tokens as composite `@utility` classes (size + weight + family + line-height + tracking)
  - [x] 4.6 Map spacing scale (space-1 through space-16)
  - [x] 4.7 Map shadow tokens (card, card-up, sheet-full-up, route-button, sheet-peek-up, nav-up, button-float, button-sm, cta, subtle)
  - [x] 4.8 Map radius tokens (pill, sheet-full, panel, badge, card, venue-image, premium-tag)
  - [x] 4.9 Map backdrop blur tokens (standard, heavy, subtle)
  - [x] 4.10 Map transition tokens (duration-fast/default/slow, easing-default/enter/exit/spring)
  - [x] 4.11 Map z-index scale (base through toast)
  - [x] 4.12 Map component size tokens (badge-sm, button-xs/sm/md, drag-pill, slider-thumb, etc.)
  - [x] 4.13 Map breakpoints (bp-mobile 375px, bp-tablet 768px, bp-desktop 1024px, bp-wide 1440px)
  - [x] 4.14 Verify a sample element renders correctly with token classes (e.g., `bg-surface-cream text-amber-dark shadow-card rounded-pill`)

- [x] **Task 5: Initialize shadcn/ui** (AC: #5)
  - [x] 5.1 Run `npx shadcn@latest init` (New York style, CSS variables, `@/components/ui` path)
  - [x] 5.2 Verify `components.json` references project's CSS path (`app/globals.css`)
  - [x] 5.3 Install initial components: `npx shadcn@latest add button card skeleton slider badge input sheet separator toggle tooltip`
  - [x] 5.4 Verify shadcn components use project's design token theme (not default shadcn colours)
  - [x] 5.5 Confirm existing `lib/utils.ts` (cn helper) works with installed shadcn components

- [x] **Task 6: Set up next-intl i18n** (AC: #4)
  - [x] 6.1 Create `i18n/request.ts` (next-intl server config)
  - [x] 6.2 Create `i18n/routing.ts` (locale definitions: sv default, en supported)
  - [x] 6.3 Create `middleware.ts` at nextjs-app root for locale routing
  - [x] 6.4 Create `app/[locale]/layout.tsx` wrapping children with `NextIntlClientProvider`
  - [x] 6.5 Move `app/page.tsx` to `app/[locale]/page.tsx`
  - [x] 6.6 Create initial message files: `messages/sv/common.json`, `messages/en/common.json` (with basic keys: appName, loading, error, retry)
  - [x] 6.7 Create empty scoped message stubs: `messages/{sv,en}/{map,venue,premium,feedback,about}.json`
  - [x] 6.8 Verify `useTranslations('common')` works in placeholder page

- [x] **Task 7: Create component directory architecture** (AC: #6)
  - [x] 7.1 Create `components/composed/` with `.gitkeep`
  - [x] 7.2 Create `components/custom/` subdirectories: `map/`, `venue/`, `sheets/`, `premium/`, `onboarding/`, `feedback/`, `social/`, `layout/`
  - [x] 7.3 Create `hooks/queries/`, `hooks/mutations/` directories
  - [x] 7.4 Create `lib/contexts/` directory
  - [x] 7.5 Create `lib/services/` directory
  - [x] 7.6 Create `lib/dev/` directory (for Story 1.2 state-forcing hook)
  - [x] 7.7 Create `lib/query-keys.ts` with empty query key factory skeleton

- [x] **Task 8: Extend ESLint configuration** (supporting infrastructure)
  - [x] 8.1 Add `eslint-plugin-jsx-a11y` to `eslint.config.mjs` with recommended rules
  - [x] 8.2 Verify `npx eslint . --quiet` passes with the extended config

- [x] **Task 9: Configure test infrastructure** (supporting infrastructure — not a direct AC, required for all subsequent stories' test gates)
  - [x] 9.1 Create `vitest.config.ts` (jsdom environment, `@/` alias, setup files, exclude e2e)
  - [x] 9.2 Create `test/setup/test-utils.tsx` (render helper with QueryClient + providers)
  - [x] 9.3 Create `test/unit/`, `test/components/`, `test/e2e/`, `test/setup/` directories
  - [x] 9.4 Create `playwright.config.ts` (baseURL localhost:3000, mobile + desktop viewport projects)
  - [x] 9.5 Write one smoke unit test: `test/unit/utils.test.ts` testing `cn()` helper
  - [x] 9.6 Write one smoke E2E test: `test/e2e/smoke.spec.ts` verifying placeholder page loads

- [x] **Task 10: Final verification** (all tasks complete)
  - [x] 10.1 `cd nextjs-app && npx tsc --noEmit` passes
  - [x] 10.2 `cd nextjs-app && npx eslint . --quiet` passes
  - [x] 10.3 `cd nextjs-app && npx vitest run` passes
  - [x] 10.4 `cd nextjs-app && npx playwright test` passes (smoke test)

## Dev Notes

### Critical Constraints

1. **Design tokens are binding.** Every colour, spacing, shadow, radius, and typography value must come from `@theme` in `globals.css`. Zero raw hex values, ad-hoc pixel sizes, or custom shadows in component code. Source of truth: `nextjs-app/docs/design/DESIGN.md`.

2. **API boundary is hard.** Front-end components (`'use client'`) must NEVER import from `lib/solar/`, `lib/weather/`, `lib/supabase/`, `lib/middleware/`, or `lib/buildings/`. Those modules are server-only and accessed via `app/api/*` routes. The `@/` path alias is for shared types/utils only.

3. **Tailwind CSS v4 is CSS-first.** There is NO `tailwind.config.js` file. All token configuration lives in `@theme { }` block inside `app/globals.css`. Content detection is automatic (no `content` array). Use `@import "tailwindcss"` not `@tailwind base/components/utilities`.

4. **Performance budget: 400 KB gzipped JS total.** MapLibre alone is ~200 KB. Every dependency counts. Do not install unnecessary packages.

5. **Three-layer component architecture.** Dependency flows one way: `custom/ -> composed/ -> ui/`. Never skip layers, never import upward. Layer 1 (ui/) has no business logic, no API calls, no context consumption. Layer 2 (composed/) combines ui/ primitives. Layer 3 (custom/) orchestrates everything.

6. **Swedish copy is default.** All user-facing strings in Swedish. Use `useTranslations('scope')` with scoped keys. Never `t('scope.key')` — always scoped hook first.

### Existing Code Inventory

The following already exists in `nextjs-app/` and must NOT be modified:

| Module | Path | Contents |
|--------|------|----------|
| Solar engine | `lib/solar/` | 10 files — NREL SPA + Turf.js shadow calculations |
| Weather | `lib/weather/met-no-service.ts` | Met.no Locationforecast 2.0 adapter |
| Supabase | `lib/supabase/` | client.ts, server.ts, health.ts, types.ts |
| Middleware | `lib/middleware/` | auth.ts, admin-auth.ts, request-logger.ts |
| Types | `lib/types/` | api.ts, venue.ts, payment.ts, location.ts, design-tokens.ts, index.ts |
| Utils | `lib/utils/` | api-errors.ts, validation.ts, venue-mapping.ts |
| Validation | `lib/validation/venue.ts` | Zod schemas |
| Buildings | `lib/buildings/import-geojson.ts` | GeoJSON import |
| cn helper | `lib/utils.ts` | `cn()` — clsx + tailwind-merge |
| DESIGN.md | `docs/design/DESIGN.md` | 456-line design token specification |

**Existing config files to EXTEND (not replace):**
- `tsconfig.json` — strict mode, `@/*` alias, Next.js plugin already configured
- `next.config.ts` — has `reactCompiler: true`, extend for i18n + bundle analyzer
- `eslint.config.mjs` — flat config with Core Web Vitals + TS rules, extend for jsx-a11y
- `.prettierrc.cjs` — single quotes, 100 chars, 2 spaces (do not change)
- `vercel.json` — deployment config (do not change)

**Existing env files:**
- `.env.example` — template with Supabase, JWT, MapTiler, Met.no vars
- `.env` / `.env.local` / `.env.test` — local dev vars (gitignored except .env.example)

### What Must Be Created

**New files (Story 1.1 scope):**

```
app/
  globals.css               # Tailwind v4 @import + @theme tokens
  layout.tsx                # Root Server Component (fonts, metadata, Providers)
  providers.tsx             # 'use client' — QueryClientProvider wrapper
  [locale]/
    layout.tsx              # NextIntlClientProvider wrapper
    page.tsx                # Placeholder page (proves scaffold works)
  not-found.tsx             # Stub (detailed 404 is Story 7.2)

components/
  ui/                       # shadcn/ui components (installed via CLI)
  composed/                 # .gitkeep (populated in later stories)
  custom/
    map/                    # .gitkeep
    venue/                  # .gitkeep
    sheets/                 # .gitkeep
    premium/                # .gitkeep
    onboarding/             # .gitkeep
    feedback/               # .gitkeep
    social/                 # .gitkeep
    layout/                 # .gitkeep

hooks/
  queries/                  # .gitkeep
  mutations/                # .gitkeep

lib/
  contexts/                 # .gitkeep (populated in later stories)
  services/                 # .gitkeep (populated in later stories)
  dev/                      # .gitkeep (Story 1.2 adds useForcedState here)
  query-keys.ts             # Empty skeleton with queryKeys factory

messages/
  sv/
    common.json             # { "appName": "SunnySeat", "loading": "Laddar...", "error": "Kunde inte ladda", "retry": "Forsok igen" }
    map.json                # {} stub
    venue.json              # {} stub
    premium.json            # {} stub
    feedback.json           # {} stub
    about.json              # {} stub
  en/
    common.json             # { "appName": "SunnySeat", "loading": "Loading...", "error": "Could not load", "retry": "Try again" }
    map.json venue.json premium.json feedback.json about.json   # {} stubs

i18n/
  request.ts                # next-intl server-side config
  routing.ts                # locale definitions (sv default, en)

middleware.ts               # next-intl locale routing middleware
vitest.config.ts            # Vitest config (jsdom, aliases, setup)
playwright.config.ts        # Playwright config (mobile + desktop)

test/
  setup/
    test-utils.tsx          # Render helper with providers + mock QueryClient
  unit/
    utils.test.ts           # Smoke test for cn() helper
  components/               # .gitkeep
  e2e/
    smoke.spec.ts           # Page loads and renders app name
```

### Modified Files (Existing — Extend, Do Not Replace)

| File | Changes |
|------|---------|
| `package.json` | Add 15+ production deps, 8+ dev deps, and scripts (dev, build, start, lint, typecheck, test, test:e2e) |
| `next.config.ts` | Extend with next-intl plugin, @next/bundle-analyzer conditional wrapping |
| `eslint.config.mjs` | Add eslint-plugin-jsx-a11y with recommended rules |
| `tsconfig.json` | Verify Vitest compatibility (may need minor adjustments to `exclude` or `types`) |

### Auto-Generated Files (Created by Tooling)

| File | Generated By | Notes |
|------|-------------|-------|
| `components.json` | `npx shadcn@latest init` | shadcn/ui configuration (paths, style, CSS vars) |
| `postcss.config.mjs` | Tailwind v4 setup | PostCSS plugin config for `@tailwindcss/postcss` |
| `package-lock.json` | `npm install` | Lockfile updated with all new deps |
| `next-env.d.ts` | Next.js | Auto-regenerated TypeScript declarations (already exists) |

> **`tailwind.config.ts` is NOT created.** Tailwind v4 uses CSS-first `@theme` configuration in `app/globals.css`. There is no JavaScript/TypeScript config file.

### Dependency Versions (Pin These)

**Production:**
| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.2.2 | Framework |
| react / react-dom | 19.x | UI library (peer dep of Next 16) |
| tailwindcss | 4.x | CSS-first styling |
| @tailwindcss/postcss | 4.x | PostCSS plugin for Tailwind v4 |
| next-intl | latest | i18n (Swedish primary) |
| @tanstack/react-query | 5.x | Server state management |
| motion | 12.x | Animation (import from `motion/react`) |
| @use-gesture/react | latest | Touch/mouse gesture handling |
| cmdk | latest | Accessible command palette |
| date-fns-tz | latest | Timezone-aware date formatting |
| maplibre-gl | 5.x | Map rendering (async loaded) |
| serwist | latest | PWA service worker |
| zod | latest | Validation (already used by backend) |
| bcryptjs | latest | Password hashing (backend, already in use) |
| jsonwebtoken | latest | JWT (backend, already in use) |

**Dev:**
| Package | Version | Purpose |
|---------|---------|---------|
| vitest | latest | Unit + component tests |
| @testing-library/react | latest | Component test utilities |
| @testing-library/jest-dom | latest | DOM assertions |
| @playwright/test | ^1.59.1 | E2E tests (already installed) |
| eslint-plugin-jsx-a11y | latest | Accessibility linting |
| @next/bundle-analyzer | latest | Bundle size monitoring |
| @types/bcryptjs | latest | TS types |
| @types/jsonwebtoken | latest | TS types |

### Tailwind v4 Token Mapping Reference

The `@theme` block in `globals.css` must map EVERY token from DESIGN.md. Key structure:

```css
@import "tailwindcss";

@theme {
  /* Fonts — reference CSS vars from next/font */
  --font-display: var(--font-plus-jakarta-sans);
  --font-ui: var(--font-manrope);

  /* Surfaces */
  --color-surface-cream: #fdfaf4;
  --color-surface-root: #fbf8fc;
  --color-surface-sand: #f5f0e6;
  --color-surface-muted: #f5f3f6;
  --color-surface-icon-bg: #eae7eb;
  --color-surface-slider-track: #f0edf1;

  /* Amber brand */
  --color-amber-pin: #f1b100;
  --color-amber-primary: #ffbf00;
  --color-amber-text: #fbbc00;
  --color-amber-pale: #ffe088;
  --color-amber-gold: #d4af37;
  --color-amber-dark: #735c00;
  --color-amber-cta-text: #554300;
  --color-amber-badge-text: #6d5000;
  --color-amber-overlay: rgba(255, 191, 0, 0.3);

  /* Text */
  --color-text-primary: #1b1b1e;
  --color-text-logo: #1c1917;
  --color-text-body: #4d4635;
  --color-text-muted: rgba(77, 70, 53, 0.6);
  --color-text-faint: rgba(77, 70, 53, 0.4);

  /* UI / Interactive */
  --color-tab-active: #d97706;
  --color-tab-inactive: #a8a29e;
  --color-pin-shaded: #e4e1e5;
  --color-drag-handle: #d6d3d1;
  --color-drag-handle-map: #d0c5af;
  --color-divider: #e7e5e4;
  --color-border-nav: #f5f5f4;
  --color-map-line: #e8e2d5;
  --color-error: #ba1a1a;

  /* White & Glass */
  --color-white: #ffffff;
  --color-glass-standard: rgba(255, 255, 255, 0.8);
  --color-glass-slider: rgba(255, 255, 255, 0.9);
  --color-glass-lavender: rgba(251, 248, 252, 0.8);

  /* Spacing (8px base, 4px half-steps) */
  --spacing-1: 2px;
  --spacing-2: 4px;
  --spacing-3: 6px;
  --spacing-4: 8px;
  --spacing-5: 10px;
  --spacing-6: 12px;
  --spacing-8: 16px;
  --spacing-10: 20px;
  --spacing-12: 24px;
  --spacing-16: 32px;

  /* Shadows */
  --shadow-card: 0px 12px 32px 0px rgba(115, 92, 0, 0.08);
  --shadow-card-up: 0px -12px 32px 0px rgba(115, 92, 0, 0.08);
  --shadow-sheet-full-up: 0px -12px 48px 0px rgba(0, 0, 0, 0.1);
  --shadow-route-button: 0px 15.3px 19.2px -3.8px rgba(115, 92, 0, 0.2), 0px 6.1px 7.7px -4.6px rgba(115, 92, 0, 0.2);
  --shadow-sheet-peek-up: 0px -8px 24px 0px rgba(0, 0, 0, 0.06);
  --shadow-nav-up: 0px -4px 12px 0px rgba(0, 0, 0, 0.03);
  --shadow-button-float: 0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.1);
  --shadow-button-sm: 0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-cta: 0px 4px 8px 0px rgba(51, 65, 85, 0.13);
  --shadow-subtle: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);

  /* Radii */
  --radius-pill: 9999px;
  --radius-sheet-full: 40px;
  --radius-panel: 32px;
  --radius-badge: 24px;
  --radius-card: 16px;
  --radius-venue-image: 12px;
  --radius-premium-tag: 4px;

  /* Blur */
  --blur-standard: 6px;
  --blur-heavy: 12px;
  --blur-subtle: 1.5px;

  /* Transitions */
  --duration-fast: 150ms;
  --duration-default: 200ms;
  --duration-slow: 300ms;
  --ease-default: ease-in-out;
  --ease-enter: ease-out;
  --ease-exit: ease-in;
  --ease-spring: cubic-bezier(0.22, 1, 0.36, 1);

  /* Z-Index */
  --z-base: 0;
  --z-pin: 10;
  --z-bottom-sheet-peek: 20;
  --z-floating-buttons: 30;
  --z-glass-panel: 40;
  --z-bottom-sheet-full: 50;
  --z-modal: 50;
  --z-toast: 60;

  /* Component sizes */
  --size-badge-sm: 28px;
  --size-button-xs: 32px;
  --size-button-sm: 40px;
  --size-button-md: 48px;
  --size-drag-pill-w: 40px;
  --size-drag-pill-w-lg: 48px;
  --size-drag-pill-h: 6px;
  --size-slider-thumb: 14.1px;
  --size-slider-track-h: 6px;
  --size-timeline-h: 12px;

  /* Breakpoints */
  --breakpoint-mobile: 375px;
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1024px;
  --breakpoint-wide: 1440px;
}
```

**Gradients** must be defined as CSS utility classes (Tailwind v4 does not support gradients in `@theme`). Add them as custom utilities or use `@utility` directive.

**Typography composites** (e.g., `text-display-xl` = 28px/36px ExtraBold Plus Jakarta Sans) — implement as Tailwind plugin or `@utility` classes that bundle font-size + line-height + font-weight + font-family + letter-spacing.

### Provider Nesting Order

```
QueryClientProvider
  -> NextIntlClientProvider (or via [locale]/layout.tsx)
       -> {children}
```

Note: MapContext, TimeContext, PremiumContext, LanguageContext are NOT created in Story 1.1. They are added in their respective stories (1.3, 2.5, 4.1). Story 1.1 only sets up QueryClientProvider.

### next-intl Configuration Pattern

Use **next-intl v4 App Router integration** (not Pages Router):

- `i18n/routing.ts` — define locales and defaultLocale
- `i18n/request.ts` — server-side getRequestConfig
- `middleware.ts` — createMiddleware from next-intl
- `app/[locale]/layout.tsx` — NextIntlClientProvider with messages
- Scoped translations: `useTranslations('common')` not `useTranslations()` with dot paths

### Server Component Boundary

- `app/layout.tsx` — **Server Component** (loads fonts, sets `<html lang>`, wraps with metadata)
- `app/[locale]/layout.tsx` — **Server Component** (loads messages, wraps with NextIntlClientProvider)
- `app/providers.tsx` — **`'use client'`** (QueryClientProvider)
- `app/[locale]/page.tsx` — Can be Server Component for initial render

Push `'use client'` as low as possible. Never mark layout.tsx or page.tsx as client unless they directly use hooks.

### Test Gate (Story 1.1 Specific)

Story 1.1 is unique: it **installs the test infrastructure itself**. The test gate has two temporal phases.

**During implementation (dependencies being installed):**
- `cd nextjs-app && npx tsc --noEmit` is the only reliable gate command
- Do NOT attempt `vitest` or `eslint` until their dependencies are installed
- Scaffolding commands (`npm install`, `npx create-next-app`, `npx shadcn@latest init`, and other installer/config generators) are **expected and freely allowed** — they are the story, not a violation of test-gate rules

**Final verification (all dependencies installed, before marking story as review):**
1. `cd nextjs-app && npx tsc --noEmit` — passes
2. `cd nextjs-app && npx eslint . --quiet` — passes
3. `cd nextjs-app && npx vitest run` — passes (smoke test executes successfully)

For the final Playwright smoke test at the end of Story 1.1, you'll
need the dev server running. Start it in a separate terminal before
running `npx playwright test`.

4. `cd nextjs-app && npx playwright test` — passes (smoke test on placeholder page)

All four must pass before transitioning to review. No visual validation gate for this story.

### Project Structure Notes

- `@/*` path alias maps to `nextjs-app/*` root (already configured in tsconfig.json)
- All new directories use `.gitkeep` to ensure they're tracked in git
- `lib/utils.ts` (cn helper) already exists — do NOT recreate. It imports `clsx` and `tailwind-merge` which must be added to dependencies.
- `app/api/` routes are NOT created in Story 1.1 — they already exist or will be created in later stories
- The `public/` directory for static assets, PWA icons, and sprites is created but populated in later stories

### References

- [Source: CLAUDE.md] — Primary instruction file: stack, commands, critical rules, git workflow, pre-scaffold state notes
- [Source: nextjs-app/docs/design/DESIGN.md] — All design token values
- [Source: _bmad-output/planning-artifacts/epics.md] — Epic 1 stories and AC definitions
- [Source: _bmad-output/planning-artifacts/architecture.md] — Three-layer components, tech stack, folder structure
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Typography, motion, navigation, accessibility
- [Source: _bmad-output/planning-artifacts/prd.md] — Performance budgets, Core Web Vitals, PWA, WCAG, browser support
- [Source: project-context.md] — Screen ID route map, dev conventions, state forcing

### Downstream Impact

Story 1.1 enables ALL subsequent stories in Epic 1:
- **Story 1.2** (State Forcing) — depends on providers.tsx, component directories, lib/dev/
- **Story 1.3** (Layout Shell) — depends on design tokens, i18n, component architecture
- **Story 1.4** (MapLibre) — depends on design tokens (color-surface-sand, color-amber-pin), contexts dir
- **Story 1.5** (Onboarding) — depends on fonts, tokens, i18n, Story 1.2's useForcedState
- **Story 1.6** (CI/CD) — depends on test infrastructure, lint config, build passing

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Completion Notes List

- **Task 1:** Installed all production + dev deps (Next.js 16.2.2, React 19, Tailwind v4, TanStack Query 5, Motion 12, next-intl, MapLibre GL 5, shadcn/ui, Vitest, Playwright, etc.). Reconciled tsconfig.json (Next.js auto-set jsx to react-jsx, added .next/types). Created PostCSS config for Tailwind v4. Also installed missing backend deps (@supabase/supabase-js, @turf/turf, @types/geojson) to fix typecheck errors.
- **Task 2:** Created app/layout.tsx (Server Component), app/providers.tsx (use client, QueryClientProvider), app/not-found.tsx (stub). Extended next.config.ts with next-intl plugin + conditional bundle analyzer. Added all package.json scripts.
- **Task 3:** Configured Plus Jakarta Sans (400/500/700/800) and Manrope (400/500/600/700) via next/font/google with display: swap. Exposed as CSS vars (--font-plus-jakarta-sans, --font-manrope) on <html>.
- **Task 4:** Created full @theme block in globals.css mapping ALL DESIGN.md tokens: 6 surfaces, 9 amber colours, 5 text, 10 UI/interactive, 4 glass, 10 spacing, 10 shadows, 7 radii, 3 blurs, 7 transitions, 8 z-indices, 11 component sizes, 4 breakpoints. Created 5 gradient @utility classes and 17 typography composite @utility classes.
- **Task 5:** Initialized shadcn/ui (base-nova style). Installed 10 components: button, card, skeleton, slider, badge, input, sheet, separator, toggle, tooltip. Cleaned up shadcn's Geist font injection — remapped --font-sans to our Manrope and --font-heading to Plus Jakarta Sans.
- **Task 6:** Created i18n/routing.ts (sv default, en), i18n/request.ts (scoped message loading), proxy.ts (locale routing — renamed from middleware.ts per Next.js 16 deprecation). Created app/[locale]/layout.tsx with NextIntlClientProvider and app/[locale]/page.tsx with useTranslations('common'). Created 12 message files (sv+en × 6 scopes).
- **Task 7:** Created full three-layer component architecture: composed/, custom/{map,venue,sheets,premium,onboarding,feedback,social,layout}, hooks/{queries,mutations}, lib/{contexts,services,dev}. Created query-keys.ts factory.
- **Task 8:** Extended ESLint with jsx-a11y recommended rules elevated to error severity. Extracted plugin reference from eslint-config-next to avoid re-registration conflict.
- **Task 9:** Created vitest.config.ts (jsdom, @/ alias), test-utils.tsx (cleanup + jest-dom), playwright.config.ts (mobile+desktop, auto webServer). Wrote cn() smoke unit test (4 passing) and E2E smoke test (2 passing).
- **Task 10:** All 4 gates pass: tsc --noEmit, eslint --quiet, vitest run (4/4), playwright test (2/2).

**Key decision:** Installed babel-plugin-react-compiler (devDep) because next.config.ts has `reactCompiler: true` which requires it at build time.

**Key decision:** Renamed middleware.ts → proxy.ts per Next.js 16 deprecation warning. next-intl createMiddleware works identically in proxy.ts.

### Change Log

- 2026-04-16: Story 1.1 implemented — full project scaffold, design tokens, fonts, i18n, shadcn/ui, test infrastructure
- 2026-04-17: Code review Round 1 — 1 decision, 11 patches, 7 deferred, 12 dismissed (see Review Findings)
- 2026-04-17: All 12 patches (decision-resolved + 11 original) applied; all four gates pass (tsc, eslint, vitest 4/4, playwright 2/2). Story transitioned to `done`.

### Review Findings

**Round 1 of 3** (2026-04-17)

Reviewed by three parallel layers: Blind Hunter (diff-only adversarial), Edge Case Hunter (boundary/config interactions), Acceptance Auditor (AC + spec compliance).

**Summary:** Gates pass (tsc, eslint, vitest). Scaffold is functionally correct but has several real deviations from spec and a11y / i18n correctness issues that should be fixed before marking `done`.

#### Patches (all applied in Round 1)

- [x] [Review][Patch] **AC4 locale resolution chain — implement the literal "URL → sessionStorage → navigator.language → default SV" sequence** [`hooks/use-locale-sync.ts`, `components/custom/layout/locale-sync.tsx`, mounted in `app/[locale]/layout.tsx`] — new `useLocaleSync()` hook reads `sessionStorage.getItem('sunnyseat:locale')`, falls back to `navigator.language` first subtag, else `routing.defaultLocale`; when the preference differs from the URL-active locale it `router.replace()`s to the prefixed URL and writes the choice back to sessionStorage. The hook is mounted via a `<LocaleSync />` client shim inside `NextIntlClientProvider`. Storage failures (private mode / sandboxed iframes) are swallowed silently.
- [x] [Review][Patch] `<html lang="sv">` hardcoded in root layout [`app/layout.tsx`] — root layout is now `async` and reads `getLocale()` from `next-intl/server`, so `<html lang={locale}>` tracks the active request locale. English users now get `lang="en"`.
- [x] [Review][Patch] Shadcn semantic-colour tokens were greyscale OKLCH neutrals [`app/globals.css:348-430`] — fully remapped `:root` and `.dark` to the project palette: `--primary: #ffbf00` (amber-primary), `--primary-foreground: #554300` (amber-cta-text), `--secondary: #f5f0e6` (surface-sand), `--muted: #f5f3f6`, `--accent: #ffe088` (amber-pale), `--destructive: #ba1a1a`, `--border: #e7e5e4` (divider), `--ring: #ffbf00`, etc. Chart and sidebar tokens use amber-family placeholders pending proper data-viz design.
- [x] [Review][Patch] `tsconfig.json` excluded `test/`, `__tests__`, `e2e` [`tsconfig.json:39-43`] — removed; only `node_modules`, `.next`, and `vitest.config.ts` are now excluded. Test files are typechecked by `tsc --noEmit`. Verified passing.
- [x] [Review][Patch] `test/setup/test-utils.tsx` was only a Vitest setup file [`test/setup/setup.ts` (new), `test/setup/test-utils.tsx` (rewritten), `vitest.config.ts`] — `setup.ts` now owns `@testing-library/jest-dom/vitest` + `afterEach(cleanup)` and is the `vitest.config.ts` setupFiles entry. `test-utils.tsx` exports `TestProviders`, `renderWithProviders`, `createTestQueryClient`, and re-exports `@testing-library/react`. Component tests from Story 1.2+ can `import { renderWithProviders } from '@/test/setup/test-utils'`.
- [x] [Review][Patch] `SheetContent` close button sr-only "Close" → "Stäng" [`components/ui/sheet.tsx:75`].
- [x] [Review][Patch] `getRequestConfig` had no fallback for missing message keys [`i18n/request.ts`] — each scope now loads through `loadScope()` which try/catches the dynamic import and falls back to the default-locale file before returning `{}`. `getMessageFallback` returns the fully-qualified key path so missing keys surface visibly in dev instead of crashing the page.
- [x] [Review][Patch] `app/[locale]/layout.tsx` missing `generateStaticParams` and `locale` prop [`app/[locale]/layout.tsx`] — added `generateStaticParams()` exporting `routing.locales`, and pass `locale={locale}` to `NextIntlClientProvider`. Also mounts `<LocaleSync />`.
- [x] [Review][Patch] `test/components/.gitkeep` missing — created.
- [x] [Review][Patch] `public/.gitkeep` missing — directory created with `.gitkeep` so Story 1.4 (MapLibre sprites) and Story 7.3 (PWA icons) have a landing place.
- [x] [Review][Patch] ESLint a11y plugin extraction was silent on failure [`eslint.config.mjs`] — installed `eslint-plugin-jsx-a11y` as a direct devDependency to pin the version. Kept the extraction-from-`nextVitals` pattern (required because ESLint rejects re-registering the plugin under a different module instance), but added a `throw new Error(...)` when the extraction returns `undefined` so future `eslint-config-next` shape changes fail loudly with a clear pointer instead of silent "rule not found" noise.
- [x] [Review][Patch] Playwright `reuseExistingServer: true` unconditional → `reuseExistingServer: !process.env.CI` [`playwright.config.ts:24`].

#### Deferred

- [x] [Review][Defer] `proxy.ts` matcher `.*\\..*` excludes legitimate dynamic routes containing dots (e.g., venue slug `cafe-4.9-stars`) — narrow to specific static-asset extensions [`proxy.ts:7`] — defer until venue routing lands (Story 2.x); dot-containing slugs are theoretical now.
- [x] [Review][Defer] `i18n/request.ts` has no try/catch around dynamic imports — any malformed message JSON crashes SSR globally [`i18n/request.ts:9-15`] — revisit alongside `getMessageFallback` work (P6) if broader i18n-robustness is prioritized.
- [x] [Review][Defer] Font CSS custom properties lack generic-family fallback — `var(--font-plus-jakarta-sans)` without `, system-ui, sans-serif` causes FOUT-flash before font loads [`app/globals.css:14-15`] — low visual cost; revisit if CLS budget is hit.
- [x] [Review][Defer] `queryKeys.list(filters)` does not normalize filter object key order / `undefined` handling — cache instability when consumers vary object shape [`lib/query-keys.ts:8-9`] — no callers exist yet; fix when the first consuming hook lands in Epic 2.
- [x] [Review][Defer] `app/not-found.tsx` hardcoded Swedish and outside `NextIntlClientProvider` — spec explicitly says "stub — detailed 404 is Story 7.2" [`app/not-found.tsx`]; acceptable stub for Story 1.1.
- [x] [Review][Defer] `shadcn`, `tailwindcss`, `@tailwindcss/postcss`, `tw-animate-css` placed under `dependencies` not `devDependencies` — install-footprint concern [`package.json`] — Vercel installs all deps at build time; functional impact is minor. Defer cleanup.
- [x] [Review][Defer] `--ease-*` CSS var names in `globals.css` vs DESIGN.md's `easing-*` naming — spec's own reference block uses `--ease-*`; an internal DESIGN.md contradiction [`docs/design/DESIGN.md` vs `app/globals.css:102-105`] — reconcile in a docs pass; Tailwind utilities work from `--ease-*`.

#### Dismissed (not written as checklist items)

- `lib/utils.ts` "missing" — false positive, file pre-exists (`nextjs-app/lib/utils.ts`, Mar 14).
- `skeleton.tsx` uses `React.ComponentProps` without importing React — typecheck passes under this TS 6 / React 19 configuration.
- Suspect version numbers (`typescript@^6.0.2`, `lucide-react@^1.8.0`, `jsdom@^29.0.2`, `@types/node@^25`) — all installed and working (2026 timeline; Blind Hunter reasoned from stale knowledge).
- `next.config.ts` sync vs async export mix — Next.js 16 supports both default-export forms.
- `QueryClient.staleTime: 60s` too aggressive — design choice, not a defect.
- `queryKeys` object referencing itself during construction — lazy closures; works as intended.
- `globalIgnores([...])` "replaces vs extends" — flat config additional-ignore blocks append; behavior is additive.
- Root `app/page.tsx` absent risks `/` 404 — Playwright smoke passes, proving next-intl middleware rewrites `/` → `/sv` correctly.
- `messages/sv/common.json` uses "Försök igen" vs spec sample "Forsok igen" — implementation is correct Swedish; spec sample was ASCII-only.
- `proxy.ts` rename (vs spec's `middleware.ts`) — Dev Agent Record justifies this as Next.js 16 deprecation; next-intl's `createMiddleware` works identically in `proxy.ts`.
- Dev-server Turbopack vs prod-build divergence — CI/CD concern deferred to Story 1.6.
- `SheetPrimitive.Close` `render` prop + children interaction — unverified; gates pass; downstream stories exercise sheet usage.

### File List

**New files:**
- nextjs-app/app/globals.css
- nextjs-app/app/layout.tsx
- nextjs-app/app/providers.tsx
- nextjs-app/app/not-found.tsx
- nextjs-app/app/[locale]/layout.tsx
- nextjs-app/app/[locale]/page.tsx
- nextjs-app/postcss.config.mjs
- nextjs-app/proxy.ts
- nextjs-app/i18n/request.ts
- nextjs-app/i18n/routing.ts
- nextjs-app/messages/sv/common.json
- nextjs-app/messages/sv/map.json
- nextjs-app/messages/sv/venue.json
- nextjs-app/messages/sv/premium.json
- nextjs-app/messages/sv/feedback.json
- nextjs-app/messages/sv/about.json
- nextjs-app/messages/en/common.json
- nextjs-app/messages/en/map.json
- nextjs-app/messages/en/venue.json
- nextjs-app/messages/en/premium.json
- nextjs-app/messages/en/feedback.json
- nextjs-app/messages/en/about.json
- nextjs-app/vitest.config.ts
- nextjs-app/playwright.config.ts
- nextjs-app/test/setup/test-utils.tsx
- nextjs-app/test/unit/utils.test.ts
- nextjs-app/test/e2e/smoke.spec.ts
- nextjs-app/lib/query-keys.ts
- nextjs-app/components/composed/.gitkeep
- nextjs-app/components/custom/map/.gitkeep
- nextjs-app/components/custom/venue/.gitkeep
- nextjs-app/components/custom/sheets/.gitkeep
- nextjs-app/components/custom/premium/.gitkeep
- nextjs-app/components/custom/onboarding/.gitkeep
- nextjs-app/components/custom/feedback/.gitkeep
- nextjs-app/components/custom/social/.gitkeep
- nextjs-app/components/custom/layout/.gitkeep
- nextjs-app/hooks/queries/.gitkeep
- nextjs-app/hooks/mutations/.gitkeep
- nextjs-app/lib/contexts/.gitkeep
- nextjs-app/lib/services/.gitkeep
- nextjs-app/lib/dev/.gitkeep
- nextjs-app/components.json
- nextjs-app/components/ui/button.tsx
- nextjs-app/components/ui/card.tsx
- nextjs-app/components/ui/skeleton.tsx
- nextjs-app/components/ui/slider.tsx
- nextjs-app/components/ui/badge.tsx
- nextjs-app/components/ui/input.tsx
- nextjs-app/components/ui/sheet.tsx
- nextjs-app/components/ui/separator.tsx
- nextjs-app/components/ui/toggle.tsx
- nextjs-app/components/ui/tooltip.tsx

**Modified files:**
- nextjs-app/package.json (added all deps + scripts)
- nextjs-app/tsconfig.json (jsx: react-jsx auto-set by Next.js, added .next/types includes)
- nextjs-app/next.config.ts (added next-intl plugin + bundle analyzer)
- nextjs-app/eslint.config.mjs (added jsx-a11y recommended rules at error level)
- nextjs-app/package-lock.json (updated)
