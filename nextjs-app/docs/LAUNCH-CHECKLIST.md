# SunnySeat Launch Checklist

## Pre-Launch

### Vercel Setup
- [ ] Vercel project created and linked to GitHub repo
- [ ] Root directory set to `nextjs-app`
- [ ] Build command: `next build` (default)
- [ ] Custom domain (sunnyseat.se) configured in Vercel
- [ ] DNS records configured:
  - A record pointing to Vercel
  - CNAME `www` pointing to `cname.vercel-dns.com`
- [ ] SSL certificate provisioned (automatic with Vercel)
- [ ] Preview deployments enabled for pull requests

### Supabase Setup
- [ ] Supabase project created (production instance)
- [ ] PostGIS extension enabled
- [ ] Database schema applied (run all migrations from `infrastructure/supabase/migrations/`)
- [ ] Seed data loaded:
  - Venues with patio polygons for Gothenburg
  - Building footprints and heights
- [ ] Row Level Security policies reviewed

### Environment Variables (Vercel Dashboard)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- [ ] `JWT_SECRET` — Random secret, minimum 32 characters
- [ ] `CRON_SECRET` — Random secret for cron endpoint authentication
- [ ] `NEXT_PUBLIC_MAPTILER_KEY` — MapTiler API key
- [ ] `MET_NO_USER_AGENT` — Identifies app to Met.no per their TOS (e.g., `sunnyseat/1.0 contact@sunnyseat.se`)
- [ ] `NEXT_PUBLIC_APP_URL` — Production URL (e.g., `https://sunnyseat.se`)

### CI/CD
- [ ] GitHub Actions workflow verified (`build-and-test-nextjs.yml`)
- [ ] Build passes on `main` branch
- [ ] All unit tests pass (`vitest run`)
- [ ] All E2E tests pass (`playwright test`)
- [ ] Vercel Cron jobs configured (`vercel.json`)

## Smoke Tests

### Pages
- [ ] Homepage loads with interactive map
- [ ] Location permission prompt appears on first visit
- [ ] Venue markers appear on map for Gothenburg area
- [ ] Card tray shows venue cards with sun status
- [ ] Venue detail page loads (`/v/[slug]`)
- [ ] About page loads (`/about`)

### API Endpoints
- [ ] `GET /api/health` returns 200
- [ ] `GET /api/health/ready` returns 200
- [ ] `GET /api/patios?lat=57.7089&lng=11.9746` returns venue data
- [ ] `GET /api/sun-exposure/patio/[id]` returns sun calculations

### SEO & Crawlability
- [ ] `/sitemap.xml` returns valid XML with venue URLs
- [ ] `/robots.txt` is accessible and correct
- [ ] Open Graph metadata renders on social shares
- [ ] `<html lang="sv">` is set

### Performance
- [ ] Lighthouse Performance score >= 95
- [ ] Lighthouse Accessibility score >= 95
- [ ] Total JS bundle <= 400 KB gzipped
- [ ] First Contentful Paint < 1.5s

## Post-Launch

### Monitoring
- [ ] Vercel deployment logs accessible
- [ ] Error boundary catches reviewed (Vercel dashboard → Runtime Logs)
- [ ] Vercel Analytics enabled (if desired)

### Data & Weather
- [ ] Met.no weather data flowing (check cron job logs)
- [ ] Sun exposure precomputation running (daily cron)
- [ ] Venue data displaying correctly on map

### Cross-Device Testing
- [ ] iOS Safari — map and cards work
- [ ] Android Chrome — map and cards work
- [ ] Desktop Chrome/Firefox — full layout renders
- [ ] Touch targets are >= 48px on mobile

### Final Checks
- [ ] No console errors in production build
- [ ] No hardcoded API keys in client bundle
- [ ] `prefers-reduced-motion` animations respected
- [ ] 404 page renders for unknown routes
