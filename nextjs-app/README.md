# SunnySeat

Find outdoor seating in direct sunlight in Gothenburg.

SunnySeat combines venue patio geometry with real-time solar position, 2.5D building shadow modeling, and Met.no weather data to show you which patios are sunny right now — and when they will be.

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19, TypeScript)
- **Styling:** Tailwind CSS v4, shadcn/ui, Framer Motion
- **Maps:** MapLibre GL JS with MapTiler tiles
- **Database:** Supabase (PostgreSQL + PostGIS)
- **Hosting:** Vercel (serverless functions, edge CDN)
- **Weather:** Met.no Locationforecast API
- **Testing:** Vitest, Playwright, Testing Library

## Prerequisites

- Node.js 20+
- npm
- Supabase project with PostGIS enabled
- MapTiler API key

## Quick Start

```bash
cd nextjs-app
cp .env.example .env.local
# Fill in Supabase URL/keys, MapTiler key, and Met.no user agent
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run type-check` | TypeScript type checking |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |

## Project Structure

```
nextjs-app/
├── app/                        # Next.js App Router
│   ├── api/                    # API routes (serverless functions)
│   │   ├── auth/               # Authentication endpoints
│   │   ├── patios/             # Patio search endpoints
│   │   ├── sun-exposure/       # Sun exposure calculations
│   │   ├── feedback/           # User feedback endpoints
│   │   ├── health/             # Health checks (health, ready, live)
│   │   └── cron/               # Vercel Cron jobs
│   ├── v/[slug]/               # Venue detail pages
│   ├── about/                  # About page
│   ├── layout.tsx              # Root layout (Server Component)
│   └── page.tsx                # Home page (Server Component)
│
├── components/                 # Three-layer component system
│   ├── ui/                     # Primitives (buttons, inputs, badges)
│   ├── composed/               # Compositions (cards, dialogs, panels)
│   ├── custom/                 # Domain-specific (SunBadge, VenueCard)
│   ├── client/                 # Client-side interactive components
│   └── server/                 # Server components
│
├── lib/                        # Business logic and utilities
│   ├── solar/                  # Solar position & shadow calculations
│   ├── weather/                # Met.no weather integration
│   ├── services/               # Business logic services
│   ├── hooks/                  # React hooks
│   ├── i18n/                   # Swedish-first internationalization
│   ├── supabase/               # Supabase client & generated types
│   ├── types/                  # TypeScript type definitions
│   ├── providers/              # React context providers
│   ├── middleware/              # API middleware (auth, rate limiting)
│   ├── constants/              # App constants
│   ├── context/                # React contexts
│   └── utils/                  # Utility functions
│
├── infrastructure/             # Database setup
│   └── supabase/               # Migrations and seeds
│
├── docs/                       # Application documentation
└── test/                       # Test utilities and setup
```

### Three-Layer Component System

Components follow a strict layering:

1. **`ui/`** — Design-system primitives. No business logic. Tailwind tokens only.
2. **`composed/`** — Combine multiple `ui/` components into reusable patterns.
3. **`custom/`** — Domain-specific components that use `composed/` and `ui/`.

Server Components are the default. `'use client'` is pushed as low in the tree as possible.

### Core Library Modules

- **`lib/solar/`** — SPA solar position algorithm, shadow geometry, sun exposure timeline calculations.
- **`lib/weather/`** — Met.no Locationforecast client, cloud cover processing, confidence scoring.
- **`lib/services/`** — Venue search, patio queries, precomputation orchestration.
- **`lib/i18n/`** — Swedish-first translations. 24-hour time format. Venue names always in Swedish.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side) |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `CRON_SECRET` | Yes | Secret for Vercel Cron endpoints |
| `NEXT_PUBLIC_MAPTILER_KEY` | Yes | MapTiler API key for map tiles |
| `MET_NO_USER_AGENT` | Yes | Met.no API User-Agent (per TOS) |
| `NEXT_PUBLIC_APP_URL` | No | App URL (defaults to localhost:3000) |

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Basic health check |
| `/api/health/ready` | GET | Readiness probe |
| `/api/patios` | GET | Search patios by location |
| `/api/sun-exposure/patio/[id]` | GET | Sun exposure for a patio |
| `/api/feedback` | POST | Submit sun accuracy feedback |
| `/api/feedback` | GET | Query feedback (admin) |
| `/api/feedback/metrics` | GET | Accuracy metrics |
| `/api/auth/login` | POST | Admin login |
| `/api/auth/refresh` | POST | Refresh JWT token |
| `/api/auth/me` | GET | Current user info |

## Deployment

Deployed to Vercel with automatic deploys from the `main` branch.

1. Connect the GitHub repo to Vercel
2. Set root directory to `nextjs-app`
3. Configure environment variables in the Vercel dashboard
4. Push to `main` to deploy

See [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md) for a complete launch checklist.

## Testing

```bash
# Unit tests
npm test

# E2E tests (requires Playwright browsers installed)
npm run test:e2e

# Type checking
npm run type-check
```

## Key Constraints

- **Performance:** ≤400 KB gzipped JS total
- **Accessibility:** WCAG 2.1 AA, 48px touch targets, axe-core clean
- **Language:** Swedish-first UI, 24-hour time format
- **Mobile-first:** Base styles are mobile, enhanced via `md:` and `lg:` breakpoints
