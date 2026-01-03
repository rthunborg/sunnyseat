# Local Development Setup

This guide walks you through setting up the SunnySeat Next.js application for local development.

## Prerequisites

- **Node.js 20+** and npm (or yarn/pnpm)
- **Git** installed
- **Supabase account** and project (or local Supabase instance)
- **Code editor** (VS Code recommended)
- **Vercel CLI** (optional, for local Vercel development)

## Quick Start

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd sunnyseat
```

### Step 2: Install Dependencies

```bash
cd nextjs-app
npm install
```

### Step 3: Set Up Environment Variables

Create a `.env.local` file in the `nextjs-app` directory:

```bash
cp .env.example .env.local  # If .env.example exists
```

Or create `.env.local` manually with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]

# JWT Authentication
JWT_SECRET=your-secret-key-min-32-characters-change-in-production
JWT_EXPIRATION_MINUTES=60
REFRESH_TOKEN_EXPIRATION_DAYS=7

# Optional: Weather API
OPENWEATHERMAP_API_KEY=[your-api-key]

# Optional: Cron Secret (for testing cron jobs locally)
CRON_SECRET=your-cron-secret-key-min-32-characters

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Where to find Supabase credentials:**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **Project URL** and **anon/public key**
4. Copy the **service_role key** (keep this secret!)

### Step 4: Set Up Database

#### Option A: Use Supabase Cloud (Recommended for Development)

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run migrations from `nextjs-app/infrastructure/supabase/migrations/`
3. See [Database Migrations Guide](../nextjs-app/infrastructure/supabase/migrations/README.md) for details

#### Option B: Local Supabase (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase locally
supabase init

# Start local Supabase
supabase start

# Run migrations
supabase db reset
```

### Step 5: Run Database Migrations

Apply the database migrations:

```bash
# Using Supabase CLI (if using local Supabase)
supabase db reset

# Or manually via Supabase dashboard:
# 1. Go to SQL Editor in Supabase dashboard
# 2. Run each migration file in order from:
#    nextjs-app/infrastructure/supabase/migrations/
```

See [Database Migrations Guide](../nextjs-app/infrastructure/supabase/migrations/README.md) for detailed instructions.

### Step 6: Start Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Development Workflow

### Running the Application

```bash
# Start development server
npm run dev

# Build for production (local test)
npm run build
npm start

# Run type checking
npm run type-check

# Run linting
npm run lint
```

### Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run type checking
npm run type-check
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm format

# Check formatting
npm run format:check
```

## Project Structure

```
nextjs-app/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   └── client/           # Client components
├── lib/                   # Shared libraries
│   ├── supabase/         # Supabase client
│   ├── services/         # Business logic
│   └── utils/            # Utilities
├── infrastructure/       # Infrastructure as code
│   └── supabase/         # Database migrations
├── docs/                 # Documentation
└── test/                 # Test files
```

## Environment Variables

### Required Variables

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)
- `JWT_SECRET` - JWT signing secret (min 32 characters)

### Optional Variables

- `OPENWEATHERMAP_API_KEY` - Weather API key
- `CRON_SECRET` - Secret for cron job authentication
- `NEXT_PUBLIC_APP_URL` - Application URL

See [Environment Variables Documentation](../nextjs-app/docs/environment-variables.md) for complete list.

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
# Use a different port
npm run dev -- -p 3001
```

### Database Connection Issues

1. Verify Supabase credentials in `.env.local`
2. Check Supabase project is active
3. Verify network connectivity
4. Check Supabase dashboard for connection status

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Type Errors

```bash
# Regenerate Supabase types (if using Supabase CLI)
supabase gen types typescript --local > lib/supabase/types.ts

# Or manually update types from Supabase dashboard
```

## Next Steps

1. **Read the Documentation**:
   - [API Routes](../nextjs-app/app/api/README.md)
   - [Vercel Deployment](../nextjs-app/docs/vercel-deployment.md)
   - [Environment Variables](../nextjs-app/docs/environment-variables.md)

2. **Explore the Codebase**:
   - Start with `app/page.tsx` (home page)
   - Check `app/api/` for API routes
   - Review `components/` for UI components

3. **Deploy to Vercel**:
   - See [Vercel Deployment Guide](../nextjs-app/docs/vercel-deployment.md)

## Legacy Setup (Archived)

For reference, the old .NET 8 + PostgreSQL setup documentation is archived. The current platform uses:
- **Next.js** instead of .NET 8 API
- **Supabase** instead of local PostgreSQL
- **Vercel** instead of Azure

## Support

If you encounter issues:
1. Check [Common Issues](09-Common-Issues.md)
2. Review [Environment Variables Documentation](../nextjs-app/docs/environment-variables.md)
3. Check Supabase dashboard for database issues
4. Review Vercel deployment logs (if deployed)

---

**Happy coding! 🚀**
