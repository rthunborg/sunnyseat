# SunnySeat

Find outdoor seating in direct sunlight in Gothenburg.

SunnySeat combines venue patio geometry with real-time solar position, 2.5D building shadow modeling, and Met.no weather data to show you which restaurant patios are sunny — right now and soon.

## Active Codebase

The production application lives in **[`nextjs-app/`](nextjs-app/)**.

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui |
| Maps | MapLibre GL JS + MapTiler |
| Database | Supabase (PostgreSQL + PostGIS) |
| Hosting | Vercel |
| Weather | Met.no Locationforecast API |
| Testing | Vitest, Playwright |

See [`nextjs-app/README.md`](nextjs-app/README.md) for setup instructions, project structure, and API docs.

## Quick Start

```bash
cd nextjs-app
cp .env.example .env.local
# Fill in Supabase, MapTiler, and Met.no credentials
npm install
npm run dev
```

## Repository Structure

```
sunnyseat/
├── nextjs-app/              # Production app (Next.js 16)
├── _bmad-output/            # Planning & implementation artifacts (BMAD)
├── scripts/                 # Tooling scripts
├── tools/                   # Data import scripts (GeoPackage, validation)
├── docs/                    # Project documentation
└── src/                     # [ARCHIVED] Legacy .NET backend (Epics 1–6)
```

### Archived Code

The `src/` directory contains the legacy .NET/C# backend and React admin panel from Epics 1–6. This code is **no longer active** and has been fully replaced by the Next.js application. It is retained for reference only.

The following are also archived and not used in the current stack:
- `Dockerfile`, `docker-compose.dev.yml` — legacy Docker setup
- `infrastructure/bicep/` — legacy Azure Bicep templates
- `DeploymentDocs/` — legacy Azure deployment documentation
- `SunnySeat.Docs/` — legacy .NET-era project documentation

## Documentation

- **App README:** [`nextjs-app/README.md`](nextjs-app/README.md)
- **Launch Checklist:** [`nextjs-app/docs/LAUNCH-CHECKLIST.md`](nextjs-app/docs/LAUNCH-CHECKLIST.md)
- **Environment Variables:** [`nextjs-app/docs/environment-variables.md`](nextjs-app/docs/environment-variables.md)
- **Architecture:** [`_bmad-output/planning-artifacts/architecture.md`](_bmad-output/planning-artifacts/architecture.md)

## License

[Add license information here]
