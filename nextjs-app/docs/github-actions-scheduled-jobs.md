# GitHub Actions scheduled jobs

SunnySeat opening-hours review runs as a protected, direct GitHub Action. It
does not call a public cron endpoint and does not fetch an hours provider.

## Hours review audit

Workflow: `.github/workflows/hours-review-audit.yml`

- Schedule: weekly, Monday at 05:17 UTC.
- Manual run: GitHub Actions → **Hours Review Audit** → `workflow_dispatch`.
- Branch: `main` only.
- Protected environment: `production`.
- Concurrency: one production hours-review run at a time.
- Timeout: 10 minutes.
- Runner: `nextjs-app/scripts/audit-opening-hours.ts`, bundled to the
  service-only `audit-opening-hours.mjs` executable during the Action.
- Public HTTP route: none. `CRON_SECRET` is not used by this direct job.

The runner reads canonical hours and provider-neutral provenance through the
Supabase service role. It writes only bounded rows to `hours_review_runs` and
`hours_review_outcomes`; it never writes `venues.opening_hours`. A single
venue classification failure is recorded and the remaining venues continue.
Run-level database/configuration failures fail the Action.

### Protected configuration

Configure these in the GitHub `production` environment:

| Name | Kind | Purpose |
|---|---|---|
| `SUPABASE_URL` | Secret | Protected project URL used only by the runner. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Server-only key; never expose it to a client or log it. |
| `SUN_HOURS_AUDIT_ENABLED` | Variable | Set exactly `true` to enable. Any other value is a fail-closed emergency stop. |

Keep `SUN_HOURS_AUDIT_ENABLED=false` until the schema migration and one-time
provenance remediation show zero unprovenanced public schedules.

### Inspecting a run

The GitHub step summary contains only status, bounded category counts, and the
run ID. It contains no source reference, provider payload, venue note, or
credential. Use the run ID to inspect service-only rows with a reviewed
service-role query:

```sql
select *
from public.hours_review_runs
where id = '[run-id]';

select venue_id, venue_slug, outcome, reason, error_class, created_at
from public.hours_review_outcomes
where run_id = '[run-id]'
order by venue_id;
```

Completed history older than 180 days is pruned after each successful audit.
Active runs are never pruned.

### Troubleshooting

- **Disabled:** set the protected environment variable
  `SUN_HOURS_AUDIT_ENABLED=true` and dispatch again.
- **Missing configuration:** verify both protected Supabase secrets exist in the
  `production` environment; do not print their values.
- **Already running:** inspect the active `hours_review_runs` row. The database
  claim and GitHub concurrency group both prevent overlap.
- **Completed with failures:** use the run ID and bounded outcome rows to locate
  failed venues. Canonical hours were not changed.
- **Schedule delay:** GitHub schedules are approximate. Use
  `workflow_dispatch` for a controlled manual run on `main`.

## Historical scheduled workflow

`.github/workflows/scheduled-cron-jobs.yml` still documents weather,
precomputation, cache, accuracy, and cleanup endpoint jobs. Those endpoint
assumptions are historical and are owned by Story 12.3 for replacement or
removal. The obsolete scheduled OSM ingestion entry has been removed by Story
12.1. Do not copy that workflow's `CRON_SECRET` pattern into the direct hours
audit.
