/**
 * ATDD acceptance scaffolds - Story 12.3
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
    .filter((file) => file.endsWith('.sql') && file.includes('persist_sun_geometry'))
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

type RunStatus = 'running' | 'completed' | 'failed' | 'expired';
type GeometryInputStatus = 'dirty' | 'building' | 'ready';

class GeometryPrecomputeStateMachine {
  private readonly runs = new Map<
    string,
    {
      status: RunStatus;
      expectedVenueDays: number;
      writtenVenueDays: number;
      reusedVenueDays: number;
      missingVenueDays: number;
      staleHashVenueDays: number;
      failedVenueDays: number;
      leaseExpiresAt: number;
    }
  >();
  private readonly inputs = new Map<
    string,
    {
      status: GeometryInputStatus;
      currentHash?: string;
      pendingHash?: string;
    }
  >();
  private readonly series = new Set<string>();
  nowMs = 1_000;

  claim(runId: string, expectedVenueDays: number, leaseMs = 900_000): boolean {
    this.expireLeases();
    if ([...this.runs.values()].some((run) => run.status === 'running')) return false;
    this.runs.set(runId, {
      status: 'running',
      expectedVenueDays,
      writtenVenueDays: 0,
      reusedVenueDays: 0,
      missingVenueDays: 0,
      staleHashVenueDays: 0,
      failedVenueDays: 0,
      leaseExpiresAt: this.nowMs + leaseMs,
    });
    return true;
  }

  heartbeat(runId: string, leaseMs = 900_000): boolean {
    const run = this.runs.get(runId);
    if (!run || run.status !== 'running' || run.leaseExpiresAt <= this.nowMs) return false;
    run.leaseExpiresAt = this.nowMs + leaseMs;
    return true;
  }

  publish(runId: string, venueId: string, hash: string, dates: string[]): boolean {
    const run = this.runs.get(runId);
    if (!run || run.status !== 'running' || run.leaseExpiresAt <= this.nowMs) return false;
    const previous = this.inputs.get(venueId);
    this.inputs.set(venueId, { status: 'building', currentHash: previous?.currentHash, pendingHash: hash });
    for (const date of dates) this.series.add(`${venueId}|${date}|${hash}`);
    this.inputs.set(venueId, { status: 'ready', currentHash: hash });
    return true;
  }

  publishInvalid(runId: string, venueId: string, hash: string): boolean {
    const previous = this.inputs.get(venueId);
    this.inputs.set(venueId, { status: 'building', currentHash: previous?.currentHash, pendingHash: hash });
    this.inputs.set(venueId, previous ?? { status: 'dirty' });
    return this.runs.get(runId)?.status === 'running';
  }

  markDirty(venueId: string): void {
    const previous = this.inputs.get(venueId);
    this.inputs.set(venueId, { status: 'dirty', currentHash: previous?.currentHash });
  }

  finish(
    runId: string,
    counts: {
      writtenVenueDays: number;
      reusedVenueDays: number;
      missingVenueDays: number;
      staleHashVenueDays: number;
      failedVenueDays: number;
    },
  ): boolean {
    const run = this.runs.get(runId);
    if (!run || run.status !== 'running') return false;
    Object.assign(run, counts);
    run.status =
      counts.failedVenueDays === 0 &&
      counts.missingVenueDays === 0 &&
      counts.staleHashVenueDays === 0 &&
      counts.writtenVenueDays + counts.reusedVenueDays === run.expectedVenueDays
        ? 'completed'
        : 'failed';
    return true;
  }

  fail(runId: string): boolean {
    const run = this.runs.get(runId);
    if (!run || run.status !== 'running') return false;
    run.status = 'failed';
    return true;
  }

  statusOfRun(runId: string): RunStatus | undefined {
    return this.runs.get(runId)?.status;
  }

  inputStatus(venueId: string): GeometryInputStatus | undefined {
    return this.inputs.get(venueId)?.status;
  }

  hasCurrentCoverage(venueId: string, stockholmDate: string, hash: string): boolean {
    const input = this.inputs.get(venueId);
    return input?.status === 'ready' && input.currentHash === hash && this.series.has(`${venueId}|${stockholmDate}|${hash}`);
  }

  private expireLeases(): void {
    for (const run of this.runs.values()) {
      if (run.status === 'running' && run.leaseExpiresAt <= this.nowMs) {
        run.status = 'expired';
      }
    }
  }
}

describe('Story 12.3 AC2/AC3/AC5/AC7 - persisted geometry SQL and scheduled operations', () => {
  test('migrations create service-only persisted geometry and run coverage tables with RLS enabled', () => {
    const sql = migrationSource();

    expect(sql).toMatch(/create table[^;]+sun_geometry/i);
    expect(sql).toMatch(/create table[^;]+geometry_precompute_runs/i);
    expect(sql).toMatch(/geometry_input_hash/i);
    expect(sql).toMatch(/stockholm_date/i);
    expect(sql).toMatch(/enable row level security/i);
    expect(sql).toMatch(/revoke all on/i);
    expect(sql).not.toMatch(/grant\s+(select|insert|update|delete)[^;]+to\s+(anon|authenticated)/i);
  });

  test('lease functions support claim, heartbeat, finish, fail, and expired lease recovery', () => {
    const sql = migrationSource();

    expect(sql).toMatch(/claim[^;]+geometry/i);
    expect(sql).toMatch(/heartbeat/i);
    expect(sql).toMatch(/finish[^;]+geometry/i);
    expect(sql).toMatch(/fail[^;]+geometry/i);
    expect(sql).toMatch(/lease_expires_at/i);
    expect(sql).toMatch(/now\(\)|clock_timestamp\(\)/i);
  });

  test('state machine has dirty/current/pending hash states and atomic promotion semantics', () => {
    const sql = migrationSource();

    expect(sql).toMatch(/dirty/i);
    expect(sql).toMatch(/pending/i);
    expect(sql).toMatch(/current/i);
    expect(sql).toMatch(/atomic|transaction|for update|advisory/i);
    expect(sql).toMatch(/(?:primary key|unique)[^;]+venue_id[^;]+stockholm_date[^;]+geometry_input_hash/i);
  });

  test('GitHub Actions run direct Supabase jobs for geometry and weather, not a Vercel HTTP warmer', () => {
    const workflows = workflowSource();

    expect(workflows).toMatch(/workflow_dispatch/i);
    expect(workflows).toMatch(/schedule:/i);
    expect(workflows).toMatch(/SUN_GEOMETRY_PRECOMPUTE_ENABLED/i);
    expect(workflows).toMatch(/SUN_WEATHER_REFRESH_ENABLED/i);
    expect(workflows).toMatch(/environment:\s*Production/i);
    expect(workflows).toMatch(/concurrency:/i);
    expect(workflows).not.toMatch(/vercel\.app\/api\/.*warm|keep-alive|quarter-hour/i);
  });

  test('precompute scripts are unignored and documented with safe env toggles', () => {
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

  test('external request warmer and keep-alive contract are retired from docs and workflows', () => {
    const combined =
      workflowSource() +
      '\n' +
      readOptional('nextjs-app/docs/github-actions-scheduled-jobs.md') +
      '\n' +
      readOptional('nextjs-app/docs/vercel-deployment.md');

    expect(combined).not.toMatch(/quarter-hour warmer|keep-alive|warm.*\/api\/venues/i);
    expect(combined).not.toMatch(/CRON_SECRET.*venues/i);
  });

  test('executable lease model rejects concurrent runs, recovers expired leases, and records terminal coverage status', () => {
    const machine = new GeometryPrecomputeStateMachine();

    expect(machine.claim('run-a', 2)).toBe(true);
    expect(machine.claim('run-b', 2)).toBe(false);
    expect(machine.heartbeat('run-a')).toBe(true);
    expect(machine.publish('run-a', 'venue-a', 'g1:a', ['2026-07-18', '2026-07-19'])).toBe(true);
    expect(machine.hasCurrentCoverage('venue-a', '2026-07-18', 'g1:a')).toBe(true);

    expect(machine.finish('run-a', {
      writtenVenueDays: 2,
      reusedVenueDays: 0,
      missingVenueDays: 0,
      staleHashVenueDays: 0,
      failedVenueDays: 0,
    })).toBe(true);
    expect(machine.statusOfRun('run-a')).toBe('completed');

    expect(machine.claim('run-c', 1, 100)).toBe(true);
    machine.nowMs += 101;
    expect(machine.claim('run-d', 1)).toBe(true);
    expect(machine.statusOfRun('run-c')).toBe('expired');
    expect(machine.fail('run-d')).toBe(true);
    expect(machine.statusOfRun('run-d')).toBe('failed');
  });

  test('executable publish model preserves old ready coverage until a valid generation commits', () => {
    const machine = new GeometryPrecomputeStateMachine();

    expect(machine.claim('run-a', 1)).toBe(true);
    expect(machine.publish('run-a', 'venue-a', 'g1:old', ['2026-07-18'])).toBe(true);
    expect(machine.finish('run-a', {
      writtenVenueDays: 1,
      reusedVenueDays: 0,
      missingVenueDays: 0,
      staleHashVenueDays: 0,
      failedVenueDays: 0,
    })).toBe(true);

    expect(machine.claim('run-b', 1)).toBe(true);
    expect(machine.publishInvalid('run-b', 'venue-a', 'g1:new')).toBe(true);
    expect(machine.hasCurrentCoverage('venue-a', '2026-07-18', 'g1:old')).toBe(true);
    expect(machine.hasCurrentCoverage('venue-a', '2026-07-18', 'g1:new')).toBe(false);

    machine.markDirty('venue-a');
    expect(machine.inputStatus('venue-a')).toBe('dirty');
    expect(machine.hasCurrentCoverage('venue-a', '2026-07-18', 'g1:old')).toBe(false);
  });
});
