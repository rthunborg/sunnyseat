# Next.js Architecture

## Overview

SunnySeat uses Next.js 16+ with the App Router for a full-stack application that combines frontend and backend in a single codebase.

## App Router Structure

```
app/
├── api/                    # API Routes (serverless functions)
│   ├── auth/              # Authentication endpoints
│   │   ├── login/         # POST - Admin login
│   │   ├── refresh/       # POST - Refresh token
│   │   ├── logout/        # POST - Logout
│   │   └── me/            # GET - Current user
│   ├── patios/            # GET - Patio search
│   ├── sun-exposure/      # Sun exposure calculations
│   │   └── patio/[id]/    # GET - Sun exposure for patio
│   ├── feedback/          # User feedback
│   │   ├── route.ts       # POST/GET - Feedback operations
│   │   ├── [id]/          # GET - Feedback by ID
│   │   └── metrics/       # GET - Accuracy metrics
│   ├── health/            # Health checks
│   │   ├── route.ts       # Basic health check
│   │   ├── ready/         # Readiness probe
│   │   ├── live/          # Liveness probe
│   │   └── database/      # Database connectivity
│   └── cron/              # Vercel Cron jobs
│       ├── precomputation-schedule/  # Sun precomputation
│       ├── weather-ingestion/        # Weather data fetch
│       ├── cache-warmup/             # Cache warming
│       └── cleanup-old-data/         # Data cleanup
├── layout.tsx             # Root layout (Server Component)
└── page.tsx               # Home page (Server Component)
```

## Component Architecture

### Server Components (Default)

Server Components are the default in Next.js App Router. They:
- Run on the server only
- Can directly access databases and APIs
- Don't send JavaScript to the client
- Used for data fetching and initial render

**Example:**
```tsx
// app/page.tsx - Server Component
import HomePage from '@/components/client/pages/HomePage';

export default function Home() {
  return <HomePage />;
}
```

### Client Components

Client Components are marked with `'use client'` and:
- Run in the browser
- Can use React hooks (useState, useEffect, etc.)
- Can handle user interactions
- Used for interactivity (maps, forms, state)

**Example:**
```tsx
// components/client/pages/HomePage.tsx
'use client';

import { useState } from 'react';
import PatioMap from '@/components/client/map/PatioMap';

export default function HomePage() {
  const [location, setLocation] = useState(null);
  return <PatioMap location={location} />;
}
```

## API Routes Architecture

### Route Handler Pattern

API routes use Next.js Route Handlers:

```typescript
// app/api/patios/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  // ... implementation
  return NextResponse.json(data);
}
```

### Authentication Middleware

Authentication is handled via middleware:

```typescript
// lib/middleware/auth.ts
export function requireAuth(request: NextRequest) {
  const token = extractToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Verify JWT token
  return null; // Authorized
}
```

### Error Handling

Consistent error handling across all routes:

```typescript
// lib/utils/api-errors.ts
export function handleApiError(error: unknown) {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  // ... other error types
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

## Data Fetching Patterns

### Server-Side Data Fetching

Server Components can directly fetch data:

```typescript
// In Server Component
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = createClient();
  const { data } = await supabase.from('patios').select('*');
  return <PatioList patios={data} />;
}
```

### Client-Side Data Fetching

Client Components use TanStack Query:

```typescript
// In Client Component
import { useQuery } from '@tanstack/react-query';
import { patioService } from '@/lib/services/patio-service';

export default function PatioList() {
  const { data } = useQuery({
    queryKey: ['patios'],
    queryFn: () => patioService.search({ lat, lng, radius: 1 }),
  });
  return <div>{/* render patios */}</div>;
}
```

## State Management

### Server State
- **TanStack Query**: For client-side server state
- **Server Components**: For initial data fetching

### Client State
- **React Context**: For global client state (location, selected patio)
- **useState/useReducer**: For component-local state

### Example Context:

```typescript
// lib/context/LocationContext.tsx
'use client';

export function LocationProvider({ children }) {
  const [location, setLocation] = useState(null);
  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}
```

## Type Safety

### TypeScript Configuration

- **Strict mode**: Enabled
- **Path aliases**: `@/` for root imports
- **Supabase types**: Auto-generated from database schema

### Type Definitions

```typescript
// lib/types/patio.ts
export interface Patio {
  id: string;
  name: string;
  geometry: GeoJSON.Polygon;
  venue_id: string;
}

// lib/supabase/types.ts (generated)
export interface Database {
  public: {
    Tables: {
      patios: {
        Row: Patio;
        // ...
      };
    };
  };
}
```

## Build & Deployment

### Build Process

1. **Type Checking**: TypeScript compilation
2. **Code Splitting**: Automatic by Next.js
3. **Optimization**: Image optimization, font optimization
4. **Bundle Analysis**: Available via `@next/bundle-analyzer`

### Deployment

- **Vercel**: Automatic deployments on git push
- **Preview Deployments**: For pull requests
- **Production**: Deployed from `main` branch

### Environment Variables

- **Public**: `NEXT_PUBLIC_*` - Available in browser
- **Private**: Server-side only (API keys, secrets)

## Performance Optimizations

### Code Splitting
- Automatic route-based code splitting
- Dynamic imports for heavy components (maps)

### Caching
- **Static Generation**: For static pages
- **ISR**: Incremental Static Regeneration
- **Edge Caching**: Via Vercel Edge Network

### Image Optimization
- Next.js Image component with automatic optimization
- WebP format with fallbacks

## Testing

### Unit Tests
- **Vitest**: Test runner
- **React Testing Library**: Component testing

### API Tests
- **Vitest**: API route testing
- **Supabase Test Client**: For database testing

### E2E Tests
- **Playwright**: End-to-end testing (if configured)

## Related Documentation

- [API Design](./api-design.md)
- [Tech Stack](./tech-stack.md)
- [Runtime Components](./runtime-components.md)
