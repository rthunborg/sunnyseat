/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.3
 * SQL, scheduled jobs, and lease/state-machine contract.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

function rootPath(path: string): string {
  return join(process.cwd(), '..', path);
}

function readOptional(path: string): string {
  const full = rootPath(path);
  return existsSync(full) ? readFileSync(full, 'utf8') : '';
}

function migrationSource(): string {
  const dir = rootPath('supabase/migrations');
  if (!existsSync(dir)) return '';
  return readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(join(dir, file), 'utf8'))
    .join('\n\n');
}

function workflowSource(): string {
  const dir = rootPath('.github/workflows');
  if (!existsSync(dir)) return '';
  return readdirSync(dir)
    .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
    .sort()
    .map((file) => readFileSync(join(dir, file), 'utf8'))
    .join('\n\n');
}

describe('Story 12.3 AC2/AC3/AC5/AC7 - persisted geometry SQL and scheduled operations', () => {
  test.skip('migrations create service-only persisted geometry and run coverage tables with RLS enabled', () => {
    const sql = migrationSource();

    expect(sql).toMatch(/create table[^;]+sun_geometry/i);
    expect(sql).toMatch(/create table[^;]+sun_geometry_precompute_runs/i);
    expect(sql).toMatch(/geometry_input_hash/i);
    expect(sql).toMatch(/stockholm_date/i);
    expect(sql).toMatch(/enable row level security/i);
    expect(sql).toMatch(/revoke all on/i);
    expect(sql).not.toMatch(/grant\s+(select|insert|update|delete)[^;]+to\s+(anon|authenticated)/i);
  });

  test.skip('lease functions support claim, heartbeat, finish, fail, and expired lease recovery', () => {
    const sql = migrationSource();

    expect(sql).toMatch(/claim[^;]+sun_geometry/i);
    expect(sql).toMatch(/heartbeat/i);
    expect(sql).toMatch(/finish[^;]+sun_geometry/i);
    expect(sql).toMatch(/fail[^;]+sun_geometry/i);
    expect(sql).toMatch(/lease_expires_at/i);
    expect(sql).toMatch(/now\(\)|clock_timestamp\(\)/i);
  });

  test.skip('state machine has dirty/current/pending hash states and atomic promotion semantics', () => {
    const sql = migrationSource();

    expect(sql).toMatch(/dirty/i);
    expect(sql).toMatch(/pending/i);
    expect(sql).toMatch(/current/i);
    expect(sql).toMatch(/atomic|transaction|for update|advisory/i);
    expect(sql).toMatch(/unique[^;]+venue_id[^;]+stockholm_date[^;]+geometry_input_hash/i);
  });

  test.skip('GitHub Actions run direct Supabase jobs for geometry and weather, not a Vercel HTTP warmer', () => {
    const workflows = workflowSource();

    expect(workflows).toMatch(/workflow_dispatch/i);
    expect(workflows).toMatch(/schedule:/i);
    expect(workflows).toMatch(/SUN_GEOMETRY_PRECOMPUTE_ENABLED/i);
    expect(workflows).toMatch(/SUN_WEATHER_REFRESH_ENABLED/i);
    expect(workflows).toMatch(/environment:\s*Production/i);
    expect(workflows).toMatch(/concurrency:/i);
    expect(workflows).not.toMatch(/vercel\.app\/api\/.*warm|keep-alive|quarter-hour/i);
  });

  test.skip('precompute scripts are unignored and documented with safe env toggles', () => {
    const appGitignore = readOptional('nextjs-app/.gitignore');
    const envExample = readOptional('nextjs-app/.env.example') + '\n' + readOptional('.env.example');
    const docs =
      readOptional('nextjs-app/docs/github-actions-scheduled-jobs.md') +
      '\n' +
      readOptional('nextjs-app/docs/environment-variables.md') +
      '\n' +
      readOptional('nextjs-app/docs/venue-data-load.md');

    expect(appGitignore).toMatch(/!scripts\/precompute-sun-geometry\.ts/);
    expect(appGitignore).toMatch(/!scripts\/refresh-weather-snapshots\.ts/);
    expect(envExample).toMatch(/SUN_GEOMETRY_PRECOMPUTE_ENABLED/);
    expect(envExample).toMatch(/SUN_WEATHER_REFRESH_ENABLED/);
    expect(docs).toMatch(/SUN_GEOMETRY_PRECOMPUTE_ENABLED/);
    expect(docs).toMatch(/geometry_input_hash/);
  });

  test.skip('external quarter-hour warmer and keep-alive contract are retired from docs and workflows', () => {
    const combined =
      workflowSource() +
      '\n' +
      readOptional('nextjs-app/docs/github-actions-scheduled-jobs.md') +
      '\n' +
      readOptional('nextjs-app/docs/vercel-deployment.md');

    expect(combined).not.toMatch(/quarter-hour warmer|keep-alive|warm.*\/api\/venues/i);
    expect(combined).not.toMatch(/CRON_SECRET.*venues/i);
  });
});
