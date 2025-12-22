# High‑Level Architecture

[Vercel Edge/CDN] → Next.js Full-Stack App (React+MapLibre) → Supabase (PostgreSQL+PostGIS)
Background Jobs: **Sun/Shadow Precompute** (Vercel Cron daily + ad‑hoc), **Weather Ingest** (Vercel Cron 5–10 min).
