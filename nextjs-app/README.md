# SunnySeat Next.js Application

This is the main Next.js application for SunnySeat, providing both frontend and backend functionality through Next.js App Router and API Routes.

## 🏗️ Architecture

### Next.js App Router Structure

```
app/
├── api/                    # API Routes (serverless functions)
│   ├── auth/              # Authentication endpoints
│   ├── patios/            # Patio search endpoints
│   ├── sun-exposure/      # Sun exposure calculation endpoints
│   ├── feedback/          # User feedback endpoints
│   ├── health/            # Health check endpoints
│   └── cron/              # Vercel Cron job endpoints
├── layout.tsx             # Root layout (Server Component)
└── page.tsx              # Home page (Server Component)
```

### Component Architecture

- **Server Components**: Default - used for data fetching and initial render
- **Client Components**: Marked with `'use client'` - used for interactivity (maps, forms, state)

### Key Features

- **Full-Stack**: API routes and pages in the same codebase
- **Type-Safe**: Full TypeScript coverage with Supabase-generated types
- **Spatial Queries**: PostGIS integration for geographic data
- **Real-Time**: Live sun calculations with weather integration
- **Serverless**: Deploys as Vercel serverless functions

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase project configured
- Environment variables set up

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Build

```bash
npm run build
npm start
```

## 📁 Directory Structure

```
nextjs-app/
├── app/                   # Next.js App Router
│   ├── api/              # API routes
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # React components
│   └── client/           # Client components
│       ├── common/       # Shared UI components
│       ├── location/     # Location-related components
│       ├── map/          # Map components
│       └── pages/        # Page components
├── lib/                  # Shared libraries
│   ├── supabase/         # Supabase client configuration
│   ├── services/         # Business logic services
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── infrastructure/       # Infrastructure as code
│   └── supabase/         # Database migrations
├── docs/                 # Application documentation
└── test/                 # Test files
```

## 🔧 Configuration

### Environment Variables

See [Environment Variables Documentation](docs/environment-variables.md) for complete configuration.

### Next.js Configuration

- **TypeScript**: Strict mode enabled
- **Tailwind CSS**: Configured for styling
- **ESLint**: Next.js recommended rules
- **Prettier**: Code formatting

## 📡 API Routes

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Patios
- `GET /api/patios` - Search patios by location

### Sun Exposure
- `GET /api/sun-exposure/patio/[id]` - Get sun exposure for patio

### Feedback
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback` - Query feedback (admin)
- `GET /api/feedback/metrics` - Get accuracy metrics

### Health Checks
- `GET /api/health` - Basic health check
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe
- `GET /api/health/database` - Database connectivity

See [API Routes Documentation](app/api/README.md) for detailed API documentation.

## 🔄 Background Jobs (Vercel Cron)

Scheduled jobs run via Vercel Cron:

- **Sun Precomputation**: Daily calculation of sun windows
- **Weather Ingestion**: Fetch weather data every 5-10 minutes
- **Cache Warmup**: Precompute popular locations
- **Data Cleanup**: Remove old cached data

See [Background Jobs Documentation](docs/background-jobs-migration.md) for details.

## 🗄️ Database

### Supabase Integration

- **Client**: `lib/supabase/client.ts` - Browser client
- **Server**: `lib/supabase/server.ts` - Server-side client
- **Types**: `lib/supabase/types.ts` - Generated TypeScript types

### Migrations

Database migrations are in `infrastructure/supabase/migrations/`.

See [Migrations Documentation](infrastructure/supabase/migrations/README.md) for migration guide.

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run type checking
npm run type-check

# Run linting
npm run lint
```

## 🚢 Deployment

### Vercel Deployment

This application is designed to deploy on Vercel:

1. Connect GitHub repository
2. Set root directory to `nextjs-app`
3. Configure environment variables
4. Deploy automatically on push

See [Vercel Deployment Guide](docs/vercel-deployment.md) for detailed instructions.

## 📚 Documentation

- [API Routes](app/api/README.md)
- [Environment Variables](docs/environment-variables.md)
- [Vercel Deployment](docs/vercel-deployment.md)
- [Background Jobs](docs/background-jobs-migration.md)
- [Database Migrations](infrastructure/supabase/migrations/README.md)

## 🛠️ Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm test` - Run tests

## 🔐 Security

- JWT-based authentication for admin endpoints
- Environment variables for sensitive data
- Supabase Row Level Security (if configured)
- Rate limiting on API routes

---

**Part of the SunnySeat platform**
