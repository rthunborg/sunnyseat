# SunnySeat

**Find the perfect sunny spot for your outdoor dining experience.**

SunnySeat is a full-stack web application that helps users find patios with optimal sun exposure based on real-time sun position calculations, weather data, and spatial analysis.

## 🏗️ Architecture Overview

SunnySeat is built on a modern serverless architecture:

```
[Vercel Edge/CDN] → Next.js Full-Stack App (React+MapLibre) → Supabase (PostgreSQL+PostGIS)
```

### Key Components

- **Frontend**: Next.js 16+ with App Router, React 19, TypeScript, Tailwind CSS, MapLibre GL JS
- **Backend**: Next.js API Routes (serverless functions on Vercel)
- **Database**: Supabase (PostgreSQL with PostGIS for spatial data)
- **Hosting**: Vercel (serverless functions, edge network, CDN)
- **Background Jobs**: Vercel Cron for scheduled tasks (sun precomputation, weather ingestion)

### Architecture Highlights

- **Serverless**: Automatic scaling, zero-config deployment
- **Spatial-First**: PostGIS for efficient geographic queries
- **Real-Time**: Live sun calculations with weather integration
- **Edge-Optimized**: Global CDN for fast content delivery
- **Type-Safe**: Full TypeScript coverage across frontend and backend

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm
- Supabase account and project
- Vercel account (for deployment)
- OpenWeatherMap API key (optional, for weather features)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sunnyseat
   ```

2. **Install dependencies**
   ```bash
   cd nextjs-app
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # JWT (for admin auth)
   JWT_SECRET=your-secret-key-min-32-chars
   JWT_EXPIRATION_MINUTES=60
   
   # Optional: Weather API
   OPENWEATHERMAP_API_KEY=your-api-key
   ```

4. **Run database migrations**
   ```bash
   # Apply Supabase migrations
   # See nextjs-app/infrastructure/supabase/migrations/README.md
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
sunnyseat/
├── nextjs-app/              # Next.js application (main app)
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # API routes (serverless functions)
│   │   └── page.tsx         # Home page
│   ├── components/          # React components
│   │   └── client/          # Client components
│   ├── lib/                 # Shared libraries
│   │   ├── supabase/        # Supabase client & types
│   │   ├── services/        # Business logic services
│   │   └── utils/           # Utility functions
│   ├── infrastructure/      # Infrastructure as code
│   │   └── supabase/        # Database migrations
│   ├── docs/                # Application documentation
│   └── test/                # Test files
├── SunnySeat.Docs/          # Project documentation
│   └── docs/
│       ├── architecture/    # Architecture documentation
│       ├── stories/         # User stories & implementation
│       └── epics/           # Epic documentation
├── DeploymentDocs/          # Legacy Azure deployment docs (archived)
└── archive/                 # Archived old infrastructure code
```

## 🛠️ Technology Stack

### Frontend
- **Next.js 16+** - Full-stack React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **MapLibre GL JS** - Interactive map rendering
- **TanStack Query** - Server state management

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Supabase** - Managed PostgreSQL with PostGIS
- **Vercel Cron** - Scheduled background jobs

### Infrastructure
- **Vercel** - Hosting, CDN, and serverless functions
- **Supabase** - Database hosting and management
- **GitHub Actions** - CI/CD pipeline

## 📚 Documentation

### Architecture Documentation
- [High-Level Architecture](SunnySeat.Docs/docs/architecture/highlevel-architecture.md)
- [Tech Stack](SunnySeat.Docs/docs/architecture/tech-stack.md)
- [Runtime Components](SunnySeat.Docs/docs/architecture/runtime-components.md)
- [API Design](SunnySeat.Docs/docs/architecture/api-design.md)

### Setup & Deployment
- [Local Development Setup](DeploymentDocs/01-Local-Development-Setup.md)
- [Vercel Deployment Guide](nextjs-app/docs/vercel-deployment.md)
- [Environment Variables](nextjs-app/docs/environment-variables.md)

### Development
- [Coding Standards](SunnySeat.Docs/docs/architecture/coding-standards.md)
- [API Routes Documentation](nextjs-app/app/api/README.md)
- [Database Migrations](nextjs-app/infrastructure/supabase/migrations/README.md)

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run type checking
npm run type-check

# Run linting
npm run lint
```

## 🚢 Deployment

### Vercel Deployment

1. **Connect repository to Vercel**
   - Import project from GitHub
   - Set root directory to `nextjs-app`
   - Configure environment variables

2. **Deploy**
   - Automatic deployments on push to `main` branch
   - Preview deployments for pull requests

See [Vercel Deployment Guide](nextjs-app/docs/vercel-deployment.md) for detailed instructions.

## 🔐 Environment Variables

Required environment variables for production:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)
- `JWT_SECRET` - JWT signing secret (min 32 characters)
- `JWT_EXPIRATION_MINUTES` - JWT token expiration time
- `OPENWEATHERMAP_API_KEY` - OpenWeatherMap API key (optional)

See [Environment Variables Documentation](nextjs-app/docs/environment-variables.md) for complete list.

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests
4. Ensure all tests pass
5. Submit a pull request

## 📝 License

[Add your license information here]

## 🆘 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with ❤️ using Next.js, Supabase, and Vercel**
