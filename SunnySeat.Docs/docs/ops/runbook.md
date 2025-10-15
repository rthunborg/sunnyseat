# Runbook — Sunny Seat (Gothenburg)

Envs: dev, beta.  
Secrets/config: `DB_CONN`, `WEATHER_API_KEY`, `WEATHER_PROVIDER=metno`, `TZ=Europe/Stockholm`, `RATE_LIMIT_RPM=60`.

Deploy: Azure Container Apps (API/workers), Azure Storage Static Web + Front Door (web).  
Rollback: redeploy previous image; restore prior bundles; purge Front Door cache.

Backups: daily Postgres; PITR ≥7 days; quarterly restore drill.

Monitoring: Dashboards (traffic, p50/90/95, cache hit, accuracy, coverage). Alerts (p95>800 ms, cache<50%, accuracy<75%).

Synthetic probes: hourly GET `/api/patios` and `/`; page on two consecutive failures (06:00–22:00 local).

Ops tasks: cache purge; trigger precompute; feature flags (geometry‑only mode; confidence weights).  
On‑call: playbooks for weather outage, DB down, API hotfix, rollback.

Retention: weather 14d; feedback 1y; respect ToS/attribution.
