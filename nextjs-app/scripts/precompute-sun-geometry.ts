import { appendFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import {
  buildSunGeometryPrecomputeWindow,
  collectSunGeometryPrecomputeTargets,
  runSunGeometryPrecompute,
} from '../lib/services/sun-geometry-precompute';
import type { Database } from '../lib/supabase/types';

const enabled = process.env.SUN_GEOMETRY_PRECOMPUTE_ENABLED === 'true';
const now = new Date();
process.env.NEXT_PUBLIC_SUPABASE_URL ??= process.env.SUPABASE_URL;

if (!enabled) {
  await writeSummary([
    '## SunnySeat sun geometry precompute',
    '',
    '- Status: disabled by SUN_GEOMETRY_PRECOMPUTE_ENABLED',
  ]);
  console.log('Sun geometry precompute disabled');
  process.exit(0);
}

const runId = [
  'sun-geometry',
  process.env.GITHUB_RUN_ID ?? randomUUID(),
  process.env.GITHUB_RUN_ATTEMPT ?? '1',
].join('-');

const supabase = createClient<Database>(
  requiredEnv('SUPABASE_URL'),
  requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const window = buildSunGeometryPrecomputeWindow(now);
const targets = await collectSunGeometryPrecomputeTargets({ includeHidden: true });
const expectedVenueDays = targets.length * window.length;

const { data: claimed, error: claimError } = await supabase.rpc('claim_geometry_precompute_run', {
  p_run_id: runId,
  p_trigger_type: process.env.GITHUB_ACTIONS === 'true' ? 'scheduled' : 'local',
  p_window_start: window[0],
  p_window_end: window.at(-1) ?? window[0],
  p_geometry_input_hash: null,
  p_expected_venue_days: expectedVenueDays,
  p_lease_seconds: 900,
} as never);
if (claimError) throw new Error(`Geometry precompute claim failed: ${claimError.message}`);
if (!claimed) {
  await writeSummary([
    '## SunnySeat sun geometry precompute',
    '',
    '- Status: skipped',
    `- Run ID: ${runId}`,
    '- Reason: another geometry precompute run is active',
  ]);
  process.exit(0);
}

const result = await runSunGeometryPrecompute({
  now,
  targets,
  repository: {
    publishGeometryGeneration: async (target, geometryInputHash, inputPayload, seriesByDate) => {
      const { error: heartbeatError } = await supabase.rpc('heartbeat_geometry_precompute_run', {
        p_run_id: runId,
      } as never);
      if (heartbeatError) throw new Error(`Geometry heartbeat failed: ${heartbeatError.message}`);

      const { data: published, error: publishError } = await supabase.rpc(
        'publish_venue_geometry_generation',
        {
          p_run_id: runId,
          p_venue_id: target.id,
          p_geometry_input_hash: geometryInputHash,
          p_input_payload: inputPayload,
          p_series_by_date: seriesByDate,
        } as never,
      );
      if (publishError) throw new Error(`Geometry publish failed for ${target.id}: ${publishError.message}`);
      if (!published) throw new Error(`Geometry publish rejected for ${target.id}`);
    },
  },
});

const failureDetails = Array.isArray(result.failures) ? result.failures.slice(0, 100) : [];
const { error: finishError } = await supabase.rpc('finish_geometry_precompute_run', {
  p_run_id: runId,
  p_written_venue_days: Number(result.writtenVenueDays ?? 0),
  p_reused_venue_days: Number(result.reusedVenueDays ?? 0),
  p_missing_venue_days: Number(result.missingVenueDays ?? 0),
  p_stale_hash_venue_days: Number(result.staleHashVenueDays ?? 0),
  p_failed_venue_days: Number(result.failedVenueDays ?? 0),
  p_failure_details: failureDetails,
} as never);
if (finishError) throw new Error(`Geometry precompute finish failed: ${finishError.message}`);

await writeSummary([
  '## SunnySeat sun geometry precompute',
  '',
  `- Status: ${String(result.status)}`,
  `- Run ID: ${runId}`,
  `- Window: ${window[0]} through ${window.at(-1)}`,
  `- Expected venue-days: ${String(result.totalVenueDays)}`,
  `- Completed venue-days: ${String(result.completedVenueDays)}`,
  `- Failed venue-days: ${String(result.failedVenueDays)}`,
]);

if (result.status !== 'completed') {
  process.exitCode = 1;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function writeSummary(lines: string[]): Promise<void> {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  await appendFile(summaryPath, `${lines.join('\n')}\n`);
}
