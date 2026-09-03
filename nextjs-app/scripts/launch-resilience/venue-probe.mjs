#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  open,
  readFile,
} from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import {
  buildVercelEvidencePlan,
  buildLaunchReport,
  isCanonicalSessionId,
  normalizeRuntimeEvents,
  parseJsonLines,
  requestLogEvidenceFromJsonLines,
  validateVercelEvidencePlan,
  validateVenuePayload,
  VERCEL_CLI_VERSION,
} from './venue-probe-lib.mjs';

const REQUEST_ID_HEADER = 'x-sunnyseat-request-id';
const DEPLOYMENT_ID_HEADER = 'x-sunnyseat-deployment-id';
const DEFAULT_BASE_URL = 'https://sunnyseat.vercel.app';
const VERCEL_ENVIRONMENTS = new Set(['production', 'preview']);
const MIN_REPLAN_ORIGIN_ATTEMPTS = 20;
export const REQUEST_TIMEOUT_MS = 10_000;

const HELP = `
SunnySeat launch-resilience venue probe

Collect raw client samples and an exact provider export plan:
  node scripts/launch-resilience/venue-probe.mjs collect \\
    --deployment-id <exact-vercel-deployment-id> \\
    --output-dir <new-evidence-directory> \\
    [--base-url ${DEFAULT_BASE_URL}] [--environment production|preview] [--origin-count 30] \\
    [--edge-count 20] [--concurrency 4] \\
    [--session-id lr-YYYYMMDDtHHMMSSz-8hex]

Merge client samples from repeated controlled windows into a new exact provider
export plan:
  node scripts/launch-resilience/venue-probe.mjs replan \\
    --deployment-id <exact-vercel-deployment-id> \\
    --client <client-samples.jsonl[,more.jsonl]> \\
    --output-dir <new-evidence-directory> \\
    [--environment production|preview]

For multi-window cold-start aggregation, run the edge lane exactly once across
all client evidence. Use the first collection window with --edge-count > 0, then
additional origin-only windows with --edge-count 0 until the report can prove at
least 20 provider-classified cold starts. Replan refuses multiple edge-prime
samples and refuses fewer than 20 origin client attempts.

The collector writes provider-evidence-plan.json. Execute each argv array exactly
with Vercel CLI ${VERCEL_CLI_VERSION} from the linked SunnySeat project and save
stdout byte-for-byte in the named file. The pinned commands are equivalent to:

  npx --yes vercel@${VERCEL_CLI_VERSION} metrics vercel.function_invocation.count --aggregation sum --prod --filter "deployment_id eq '<DEPLOYMENT>'" --filter "route eq '/api/venues'" --filter "environment eq 'production'" --group-by function_start_type --group-by client_user_agent --group-by function_region --group-by deployment_id --group-by http_status --group-by route --since <START_UTC> --until <END_UTC> --granularity 5m --limit 500 --order-by count --order desc --json

  npx --yes vercel@${VERCEL_CLI_VERSION} metrics vercel.function_invocation.function_duration_ms --aggregation avg --prod --filter "deployment_id eq '<DEPLOYMENT>'" --filter "route eq '/api/venues'" --filter "environment eq 'production'" --group-by function_start_type --group-by client_user_agent --group-by function_region --group-by deployment_id --group-by http_status --group-by route --since <START_UTC> --until <END_UTC> --granularity 5m --limit 500 --order-by count --order desc --json

  npx --yes vercel@${VERCEL_CLI_VERSION} metrics vercel.external_api_request.count --aggregation sum --prod --filter "deployment_id eq '<DEPLOYMENT>'" --filter "origin_route eq '/api/venues'" --filter "environment eq 'production'" --group-by deployment_id --group-by function_region --group-by http_status --group-by origin_route --group-by request_hostname --group-by request_method --group-by request_path --since <START_UTC> --until <END_UTC> --granularity 5m --limit 500 --order-by count --order desc --json

  # Repeat once per client sample, using the request_log entries in the plan:
  npx --yes vercel@${VERCEL_CLI_VERSION} logs <DEPLOYMENT> --environment production --request-id <X-VERCEL-ID-SUFFIX> --limit 10 --json

For preview plans, the metric commands omit --prod and every environment filter
or logs command uses preview. Do not edit generated argv by hand.

Build the acceptance report from those unmodified exports:
  node scripts/launch-resilience/venue-probe.mjs report \\
    --deployment-id <exact-vercel-deployment-id> \\
    --supabase-host <project-ref.supabase.co> \\
    --client <client-samples.jsonl[,more.jsonl]> \\
    --plan <provider-evidence-plan.json> \\
    --provider-count <function-invocation-count.json[,more.json]> \\
    --provider-duration <function-duration.json[,more.json]> \\
    --request-log <request-log-001.jsonl[,request-log-002.jsonl,...]> \\
    --external <external-api-request-count.json[,more.json]> \\
    --output-dir <new-report-directory> \\
    [--environment production|preview] [--min-cold 20] [--threshold-ms 5000]

At least 20 provider-classified cold starts and a threshold no greater than 5000
ms are non-loosenable CLI gates. x-vercel-cache is never a start-type authority.
The external export is grouped by each exact allowed destination path. Every
client sample requires one request-id-scoped Vercel envelope (serverless or
serverless-middleware) matching its deployment, route, status, cache result,
request-id suffix, and timestamp. Broad runtime-log exports are not accepted.

SHA-256 values are local tamper evidence for captured bytes only. They do not
authenticate Vercel origin or prove export completeness. Output files are
created exclusively and are never overwritten.
`;

function integerOption(value, fallback, name, minimum, maximum) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    throw new Error(
      `--${name} must be an integer from ${minimum} through ${maximum}.`,
    );
  }
  return parsed;
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, milliseconds);
  });
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function defaultSessionId() {
  const timestamp = new Date()
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace(/\.\d{3}Z$/u, 'Z')
    .toLowerCase();
  return `lr-${timestamp}-${randomUUID().slice(0, 8)}`;
}

function sessionIdOption(value) {
  const sessionId = value ?? defaultSessionId();
  if (!isCanonicalSessionId(sessionId)) {
    throw new Error(
      '--session-id must match lr-YYYYMMDDtHHMMSSz-8hex.',
    );
  }
  return sessionId;
}

function environmentOption(value) {
  const environment = value ?? 'production';
  if (!VERCEL_ENVIRONMENTS.has(environment)) {
    throw new Error('--environment must be production or preview.');
  }
  return environment;
}

function probeId(sessionId, cohort, sequence) {
  const value = `${sessionId}-${cohort}-${String(sequence).padStart(3, '0')}`;
  if (value.length > 64) {
    throw new Error('Generated probe id exceeds the 64-character request-tag limit.');
  }
  return value;
}

function endpointUrl(baseUrl) {
  const url = new URL('/api/venues', baseUrl);
  if (
    url.protocol !== 'https:' &&
    !['localhost', '127.0.0.1'].includes(url.hostname)
  ) {
    throw new Error('--base-url must use HTTPS unless it targets localhost.');
  }
  url.searchParams.set('lat', '57.7089');
  url.searchParams.set('lng', '11.9746');
  url.searchParams.set('radiusKm', '3');
  return url;
}

function vercelRegions(vercelId) {
  const parts = String(vercelId ?? '')
    .split('::')
    .filter(Boolean);
  return {
    edge_region_hint: parts[0] ?? null,
    function_region_hint: parts[1] ?? null,
  };
}

async function writeExclusive(path, content) {
  const handle = await open(path, 'wx');
  try {
    await handle.writeFile(content, 'utf8');
  } finally {
    await handle.close();
  }
}

export async function sampleVenueRequest({
  url,
  probeId: requestProbeId,
  requestedCohort,
  sequence,
  deploymentId,
  environment = 'production',
}) {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        [REQUEST_ID_HEADER]: requestProbeId,
        'user-agent': `SunnySeatLaunchProbe/2 ${requestProbeId}`,
        accept: 'application/json',
      },
    });
    const headersAt = performance.now();
    const responseText = await response.text();
    const endedAt = new Date().toISOString();
    let payload;
    let parseError = null;
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = {};
      parseError = 'response_was_not_json';
    }
    const vercelId = response.headers.get('x-vercel-id');

    return {
      schema_version: 3,
      sequence,
      probe_id: requestProbeId,
      deployment_id: deploymentId,
      environment,
      requested_cohort: requestedCohort,
      request_route: '/api/venues',
      started_at_utc: startedAt,
      ended_at_utc: endedAt,
      http_status: response.status,
      cache_status: response.headers.get('x-vercel-cache') ?? 'UNKNOWN',
      response_request_id: response.headers.get(REQUEST_ID_HEADER),
      response_deployment_id: response.headers.get(DEPLOYMENT_ID_HEADER),
      vercel_id: vercelId,
      ...vercelRegions(vercelId),
      ttfb_ms: Number((headersAt - start).toFixed(3)),
      total_ms: Number((performance.now() - start).toFixed(3)),
      content_encoding: response.headers.get('content-encoding'),
      response_body_bytes: Buffer.byteLength(responseText),
      response_body_sha256: sha256(responseText),
      parse_error: parseError,
      validation: validateVenuePayload(payload),
    };
  } catch (error) {
    return {
      schema_version: 3,
      sequence,
      probe_id: requestProbeId,
      deployment_id: deploymentId,
      environment,
      requested_cohort: requestedCohort,
      request_route: '/api/venues',
      started_at_utc: startedAt,
      ended_at_utc: new Date().toISOString(),
      http_status: 0,
      cache_status: 'FETCH_ERROR',
      response_request_id: null,
      response_deployment_id: null,
      vercel_id: null,
      edge_region_hint: null,
      function_region_hint: null,
      ttfb_ms: null,
      total_ms: Number((performance.now() - start).toFixed(3)),
      content_encoding: null,
      response_body_bytes: 0,
      response_body_sha256: null,
      parse_error:
        error instanceof Error ? error.name : 'unknown_fetch_error',
      validation: validateVenuePayload({}),
    };
  }
}

function exactClientMeasurementWindow(samples) {
  const starts = samples.map((sample) => Date.parse(sample.started_at_utc));
  const ends = samples.map((sample) => Date.parse(sample.ended_at_utc));
  if (
    samples.length === 0 ||
    starts.some((value) => !Number.isFinite(value)) ||
    ends.some((value) => !Number.isFinite(value))
  ) {
    throw new Error('Client evidence does not define one exact UTC measurement window.');
  }
  return {
    started_at_utc: new Date(Math.min(...starts)).toISOString(),
    ended_at_utc: new Date(Math.max(...ends)).toISOString(),
  };
}

function clientSampleCorrectness(sample, deploymentId, environment) {
  const cacheStatus = String(sample?.cache_status ?? '').toUpperCase();
  const timingOk =
    Number.isFinite(sample?.ttfb_ms) &&
    Number.isFinite(sample?.total_ms) &&
    sample.ttfb_ms >= 0 &&
    sample.total_ms >= sample.ttfb_ms;
  const cacheOk = cacheStatus === 'MISS' || cacheStatus === 'HIT';
  const deploymentOk =
    sample?.deployment_id === deploymentId &&
    sample?.response_deployment_id === deploymentId &&
    sample?.environment === environment;
  const originEchoOk =
    cacheStatus !== 'MISS' ||
    sample?.response_request_id === null ||
    sample?.response_request_id === sample?.probe_id;
  return {
    http_200: sample?.http_status === 200,
    payload_valid: sample?.validation?.passed === true,
    timing_valid: timingOk,
    deployment_matched: deploymentOk,
    cache_usable: cacheOk,
    origin_echoed: originEchoOk,
    passed:
      sample?.http_status === 200 &&
      sample?.validation?.passed === true &&
      timingOk &&
      deploymentOk &&
      cacheOk &&
      originEchoOk,
  };
}

function clientCorrectnessSummary(samples, deploymentId, environment) {
  const counts = {
    raw_samples: samples.length,
    passed_samples: 0,
    failed_samples: 0,
    http_200: 0,
    payload_valid: 0,
    timing_valid: 0,
    deployment_matched: 0,
    cache_usable: 0,
    origin_echoed: 0,
  };
  for (const sample of samples) {
    const correctness = clientSampleCorrectness(sample, deploymentId, environment);
    if (correctness.passed) counts.passed_samples += 1;
    if (correctness.http_200) counts.http_200 += 1;
    if (correctness.payload_valid) counts.payload_valid += 1;
    if (correctness.timing_valid) counts.timing_valid += 1;
    if (correctness.deployment_matched) counts.deployment_matched += 1;
    if (correctness.cache_usable) counts.cache_usable += 1;
    if (correctness.origin_echoed) counts.origin_echoed += 1;
  }
  counts.failed_samples = samples.length - counts.passed_samples;
  return counts;
}

function cacheCounts(samples) {
  return Object.fromEntries(
    [...new Set(samples.map((sample) => sample.cache_status))].map(
      (cacheStatus) => [
        cacheStatus,
        samples.filter((sample) => sample.cache_status === cacheStatus).length,
      ],
    ),
  );
}

function replanAggregationPolicy(samples) {
  const counts = {
    origin: 0,
    edge_prime: 0,
    edge_repeat: 0,
  };
  for (const sample of samples) {
    if (sample?.requested_cohort === 'origin') counts.origin += 1;
    if (sample?.requested_cohort === 'edge-prime') counts.edge_prime += 1;
    if (sample?.requested_cohort === 'edge-repeat') counts.edge_repeat += 1;
  }
  if (counts.origin < MIN_REPLAN_ORIGIN_ATTEMPTS) {
    throw new Error(
      `Replan requires at least ${MIN_REPLAN_ORIGIN_ATTEMPTS} origin client attempts before provider cold classification; received ${counts.origin}.`,
    );
  }
  if (counts.edge_prime !== 1) {
    throw new Error(
      `Replan requires exactly one edge-prime client sample across all aggregated windows; received ${counts.edge_prime}.`,
    );
  }
  if (counts.edge_repeat < 1) {
    throw new Error(
      'Replan requires at least one edge-repeat client sample after the single edge-prime.',
    );
  }
  return counts;
}

async function collectCommand(values) {
  if (!values['deployment-id']) {
    throw new Error('--deployment-id is required for an exact deployment lane.');
  }
  if (!values['output-dir']) {
    throw new Error('--output-dir is required.');
  }

  const baseUrl = values['base-url'] ?? DEFAULT_BASE_URL;
  const deploymentId = values['deployment-id'];
  const environment = environmentOption(values.environment);
  const outputDirectory = resolve(values['output-dir']);
  const sessionId = sessionIdOption(values['session-id']);
  const originCount = integerOption(
    values['origin-count'],
    30,
    'origin-count',
    1,
    200,
  );
  const edgeCount = integerOption(
    values['edge-count'],
    20,
    'edge-count',
    0,
    100,
  );
  const concurrency = integerOption(
    values.concurrency,
    4,
    'concurrency',
    1,
    10,
  );
  const batchPauseMs = integerOption(
    values['batch-pause-ms'],
    500,
    'batch-pause-ms',
    0,
    60_000,
  );
  const edgePrimePauseMs = integerOption(
    values['edge-prime-pause-ms'],
    1_000,
    'edge-prime-pause-ms',
    0,
    60_000,
  );
  const endpoint = endpointUrl(baseUrl);
  const startedAt = new Date().toISOString();

  await mkdir(outputDirectory, { recursive: true });
  const clientPath = resolve(outputDirectory, 'client-samples.jsonl');
  const clientHandle = await open(clientPath, 'wx');
  const samples = [];
  let sequence = 0;
  let clientWriteQueue = Promise.resolve();

  async function capture(url, requestedCohort, requestProbeId) {
    sequence += 1;
    const sample = await sampleVenueRequest({
      url,
      probeId: requestProbeId,
      requestedCohort,
      sequence,
      deploymentId,
      environment,
    });
    samples.push(sample);
    clientWriteQueue = clientWriteQueue.then(() => clientHandle.write(`${JSON.stringify(sample)}\n`));
    await clientWriteQueue;
    process.stdout.write(
      `${sample.probe_id} status=${sample.http_status} cache=${sample.cache_status} total_ms=${sample.total_ms}\n`,
    );
  }

  try {
    for (let offset = 0; offset < originCount; offset += concurrency) {
      const batchSize = Math.min(concurrency, originCount - offset);
      await Promise.all(
        Array.from({ length: batchSize }, (_, batchIndex) => {
          const index = offset + batchIndex + 1;
          const requestProbeId = probeId(sessionId, 'origin', index);
          const url = new URL(endpoint);
          url.searchParams.set('_probe', requestProbeId);
          return capture(url, 'origin', requestProbeId);
        }),
      );
      if (offset + batchSize < originCount && batchPauseMs > 0) {
        await delay(batchPauseMs);
      }
    }

    if (edgeCount > 0) {
      const stableEdgeUrl = new URL(endpoint);
      stableEdgeUrl.searchParams.set('_probe', `${sessionId}-edge-cache`);
      const primeId = probeId(sessionId, 'edge-prime', 1);
      await capture(stableEdgeUrl, 'edge-prime', primeId);
      if (edgePrimePauseMs > 0) await delay(edgePrimePauseMs);
      for (let index = 1; index <= edgeCount; index += 1) {
        const requestProbeId = probeId(sessionId, 'edge', index);
        await capture(stableEdgeUrl, 'edge-repeat', requestProbeId);
      }
    }
  } finally {
    try {
      await clientWriteQueue;
    } finally {
      await clientHandle.close();
    }
  }

  const endedAt = new Date().toISOString();
  const measurementWindow = exactClientMeasurementWindow(samples);
  const correctnessSummary = clientCorrectnessSummary(
    samples,
    deploymentId,
    environment,
  );
  const evidencePlan = buildVercelEvidencePlan({
    deploymentId,
    measurementWindow,
    clientSamples: samples,
    environment,
  });
  const evidencePlanContent = `${JSON.stringify(evidencePlan, null, 2)}\n`;
  const evidencePlanPath = resolve(
    outputDirectory,
    'provider-evidence-plan.json',
  );
  await writeExclusive(evidencePlanPath, evidencePlanContent);
  const manifest = {
    schema_version: 3,
    session_id: sessionId,
    deployment_id: deploymentId,
    environment,
    base_url: new URL(baseUrl).origin,
    endpoint_path: '/api/venues',
    measurement_cohort: 'gothenburg-centre-radius-3km',
    started_at_utc: startedAt,
    ended_at_utc: endedAt,
    measurement_window: measurementWindow,
    origin_count_requested: originCount,
    edge_count_requested: edgeCount,
    concurrency,
    request_timeout_ms: REQUEST_TIMEOUT_MS,
    provider_evidence_plan: 'provider-evidence-plan.json',
    provider_evidence_plan_sha256: sha256(evidencePlanContent),
    client_samples: samples.length,
    client_samples_sha256: sha256(
      await readFile(clientPath, 'utf8'),
    ),
    correctness_passed: correctnessSummary.failed_samples === 0,
    client_correctness_summary: correctnessSummary,
    cache_counts: cacheCounts(samples),
    classification_note:
      'cache_status is recorded but never used as function start classification',
    integrity_scope:
      evidencePlan.integrity_scope,
  };
  await writeExclusive(
    resolve(outputDirectory, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  process.stdout.write(
    `Raw client evidence: ${clientPath}\nProvider export plan: ${evidencePlanPath}\nManifest: ${resolve(outputDirectory, 'manifest.json')}\n`,
  );
  if (!manifest.correctness_passed) process.exitCode = 2;
}

function splitPaths(value, optionName) {
  if (!value) throw new Error(`--${optionName} is required.`);
  return value
    .split(',')
    .map((path) => path.trim())
    .filter(Boolean)
    .map((path) => resolve(path));
}

async function readJsonLineFiles(paths) {
  const rows = [];
  const sources = [];
  for (const path of paths) {
    const content = await readFile(path, 'utf8');
    const parsedRows = parseJsonLines(content, path);
    rows.push(...parsedRows);
    sources.push({
      path,
      sha256: sha256(content),
      bytes: Buffer.byteLength(content),
      row_count: parsedRows.length,
    });
  }
  return { rows, sources };
}

export async function replanCommand(values) {
  if (!values['deployment-id']) {
    throw new Error('--deployment-id is required for an exact deployment lane.');
  }
  if (!values['output-dir']) {
    throw new Error('--output-dir is required.');
  }
  const clientPaths = splitPaths(values.client, 'client');
  const environment = environmentOption(values.environment);
  const client = await readJsonLineFiles(clientPaths);
  const seenProbeIds = new Set();
  for (const sample of client.rows) {
    const probeId = typeof sample?.probe_id === 'string' ? sample.probe_id : '';
    if (!probeId || seenProbeIds.has(probeId)) {
      throw new Error('Client samples must contain unique probe IDs before replanning.');
    }
    seenProbeIds.add(probeId);
    if (
      sample.deployment_id !== values['deployment-id'] ||
      sample.environment !== environment
    ) {
      throw new Error(
        'Client samples must all match the requested deployment and environment before replanning.',
      );
    }
  }
  const aggregation = replanAggregationPolicy(client.rows);
  const correctnessSummary = clientCorrectnessSummary(
    client.rows,
    values['deployment-id'],
    environment,
  );

  const outputDirectory = resolve(values['output-dir']);
  await mkdir(outputDirectory, { recursive: true });
  const measurementWindow = exactClientMeasurementWindow(client.rows);
  const evidencePlan = buildVercelEvidencePlan({
    deploymentId: values['deployment-id'],
    measurementWindow,
    clientSamples: client.rows,
    environment,
  });
  const evidencePlanContent = `${JSON.stringify(evidencePlan, null, 2)}\n`;
  const evidencePlanPath = resolve(outputDirectory, 'provider-evidence-plan.json');
  await writeExclusive(evidencePlanPath, evidencePlanContent);
  await writeExclusive(
    resolve(outputDirectory, 'manifest.json'),
    `${JSON.stringify({
      schema_version: 1,
      command: 'replan',
      deployment_id: values['deployment-id'],
      environment,
      measurement_window: measurementWindow,
      client_samples: client.rows.length,
      client_samples_by_requested_cohort: aggregation,
      correctness_passed: correctnessSummary.failed_samples === 0,
      client_correctness_summary: correctnessSummary,
      cache_counts: cacheCounts(client.rows),
      minimum_provider_cold_samples_required: MIN_REPLAN_ORIGIN_ATTEMPTS,
      edge_prime_policy: 'exactly_one_across_aggregated_windows',
      client_sources: client.sources,
      provider_evidence_plan: 'provider-evidence-plan.json',
      provider_evidence_plan_sha256: sha256(evidencePlanContent),
      classification_note:
        'cache_status is recorded but never used as function start classification',
      integrity_scope: evidencePlan.integrity_scope,
    }, null, 2)}\n`,
  );
  process.stdout.write(
    `Provider export plan: ${evidencePlanPath}\nManifest: ${resolve(outputDirectory, 'manifest.json')}\n`,
  );
}

async function readRequestLogFiles(paths, plan) {
  const evidence = [];
  const sources = [];
  const requestExports = plan.exports.filter(
    (entry) =>
      typeof entry?.id === 'string' && entry.id.startsWith('request_log_'),
  );
  const pathByBasename = new Map();
  for (const path of paths) {
    const name = basename(path);
    if (pathByBasename.has(name)) {
      throw new Error(`--request-log contains duplicate filename ${name}.`);
    }
    pathByBasename.set(name, path);
  }
  if (requestExports.length !== paths.length) {
    throw new Error(
      `--request-log must supply all ${requestExports.length} request-id captures from the provider evidence plan.`,
    );
  }
  for (const entry of requestExports) {
    const path = pathByBasename.get(entry.stdout_file);
    if (!path) {
      throw new Error(
        `--request-log is missing planned capture ${entry.stdout_file}.`,
      );
    }
    const content = await readFile(path, 'utf8');
    const adapted = requestLogEvidenceFromJsonLines(content, path);
    evidence.push(
      ...adapted.evidence.map((item) => ({
        ...item,
        capture_id: entry.id,
      })),
    );
    sources.push({
      path,
      ...adapted.source,
      capture_id: entry.id,
      probe_id: entry.probe_id,
      request_id_suffix: entry.request_id_suffix,
    });
  }
  return { evidence, sources };
}


async function readJsonObjectFile(path, label) {
  const content = await readFile(path, 'utf8');
  let document;
  try {
    document = JSON.parse(content);
  } catch {
    throw new Error(`${path} is not valid ${label} JSON.`);
  }
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error(`${path} must contain one ${label} JSON object.`);
  }
  return {
    document,
    source: {
      path,
      sha256: sha256(content),
      bytes: Buffer.byteLength(content),
    },
  };
}
async function readJsonDocumentFiles(paths) {
  const evidence = [];
  const sources = [];
  for (const path of paths) {
    const content = await readFile(path, 'utf8');
    let document;
    try {
      document = JSON.parse(content);
    } catch {
      throw new Error(`${path} is not a valid raw Vercel JSON document.`);
    }
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      throw new Error(`${path} must contain one raw Vercel query document.`);
    }
    const sourceSha256 = sha256(content);
    evidence.push({
      document,
      source_sha256: sourceSha256,
      source_line: 1,
    });
    sources.push({
      path,
      sha256: sourceSha256,
      bytes: Buffer.byteLength(content),
    });
  }
  return { evidence, sources };
}
function formatMetric(metric) {
  if (!metric || metric.p50 === null) return 'n/a / n/a';
  return `${metric.p50} / ${metric.p95}`;
}

function markdownReport(report) {
  const cohortRows = [
    ['Cold', report.cohorts.cold],
    ['Prewarmed', report.cohorts.prewarmed],
    ['Hot', report.cohorts.hot],
    ['Origin uncached aggregate', report.cohorts.origin_uncached],
    ['Edge HIT', report.cohorts.edge_hit],
  ]
    .map(
      ([label, cohort]) =>
        `| ${label} | ${cohort.n} | ${formatMetric(cohort.client_ttfb_ms)} | ${formatMetric(cohort.client_total_ms)} | ${formatMetric(cohort.function_duration_ms)} |`,
    )
    .join('\n');
  const errors =
    report.errors.length === 0
      ? '- None.'
      : report.errors.map((error) => `- ${error}`).join('\n');

  return `# SunnySeat ${report.environment} venue measurement

Generated: ${report.generated_at}
Deployment: ${report.deployment_id} (${report.environment})
UTC window: ${report.measurement_window?.started_at_utc ?? 'n/a'} — ${report.measurement_window?.ended_at_utc ?? 'n/a'}


Acceptance: **${report.acceptance.passed ? 'PASS' : 'FAIL'}**

| Cohort | n | Client TTFB p50 / p95 (ms) | Client total p50 / p95 (ms) | Provider function p50 / p95 (ms) |
| --- | ---: | ---: | ---: | ---: |
${cohortRows}

- Correctness: ${report.acceptance.correctness}
- Edge prime/repeat lane complete: ${report.acceptance.edge_cache_lane_complete}
- Exact request-ID evidence complete: ${report.acceptance.provider_request_evidence_complete}
- Edge samples provider-correlated: ${report.acceptance.edge_provider_correlation_complete}
- Provider join complete: ${report.acceptance.provider_join_complete}
- Provider/runtime join clock skew: ±${report.acceptance.provider_join_clock_skew_ms} ms
- Direct dependency attribution complete: ${report.acceptance.dependency_attribution_complete}
- Provider-classified cold samples: ${report.acceptance.cold_sample_count}
- Provider external-host export complete: ${report.acceptance.external_provider_complete}
- Provider external requests: ${report.raw_counts.provider_external_requests}
- Request-ID captures/envelopes: ${report.raw_counts.provider_request_captures} / ${report.raw_counts.provider_request_envelopes}
- Uncached client-total route threshold: ${report.acceptance.uncached_route_threshold_ms} ms
- Cache MISS is not used as a cold-start classification.
- Evidence CLI: Vercel ${report.provider_evidence_plan?.cli?.version ?? 'n/a'}
- Integrity scope: ${report.evidence_integrity_scope ?? 'n/a'}

## Errors

${errors}
`;
}

export async function reportCommand(values) {
  if (!values['output-dir']) {
    throw new Error('--output-dir is required.');
  }
  if (!values['deployment-id']) {
    throw new Error('--deployment-id is required for an exact deployment report.');
  }
  if (!values['supabase-host']) {
    throw new Error('--supabase-host is required for provider-host validation.');
  }
  const clientPaths = splitPaths(values.client, 'client');
  const planPaths = splitPaths(values.plan, 'plan');
  if (planPaths.length !== 1) {
    throw new Error('--plan must name exactly one provider-evidence-plan.json file.');
  }
  const providerCountPaths = splitPaths(
    values['provider-count'],
    'provider-count',
  );
  const providerDurationPaths = splitPaths(
    values['provider-duration'],
    'provider-duration',
  );
  const requestLogPaths = splitPaths(values['request-log'], 'request-log');
  const externalPaths = splitPaths(values.external, 'external');
  const outputDirectory = resolve(values['output-dir']);
  const minColdSamples = integerOption(
    values['min-cold'],
    20,
    'min-cold',
    20,
    10_000,
  );
  const uncachedThresholdMs = integerOption(
    values['threshold-ms'],
    5_000,
    'threshold-ms',
    1,
    5_000,
  );
  const environment = environmentOption(values.environment);

  const client = await readJsonLineFiles(clientPaths);
  const plan = await readJsonObjectFile(planPaths[0], 'provider evidence plan');
  const measurementWindow = exactClientMeasurementWindow(client.rows);
  const planErrors = validateVercelEvidencePlan(plan.document, {
    deploymentId: values['deployment-id'],
    measurementWindow,
    clientSamples: client.rows,
    environment,
  });
  if (planErrors.length > 0) {
    throw new Error(planErrors.join(' '));
  }
  const providerCount = await readJsonDocumentFiles(providerCountPaths);
  const providerDuration = await readJsonDocumentFiles(providerDurationPaths);
  const requestLogs = await readRequestLogFiles(
    requestLogPaths,
    plan.document,
  );
  const external = await readJsonDocumentFiles(externalPaths);
  const report = buildLaunchReport({
    clientSamples: client.rows,
    providerInvocationEvidence: providerCount.evidence,
    providerDurationEvidence: providerDuration.evidence,
    runtimeEvents: normalizeRuntimeEvents(requestLogs.evidence, { environment }),
    providerRequestEvidence: requestLogs.evidence,
    providerRequestCaptureSources: requestLogs.sources,
    expectedDeploymentId: values['deployment-id'],
    expectedEnvironment: environment,
    expectedSupabaseHostname: values['supabase-host'],
    providerExternalEvidence: external.evidence,
    minColdSamples,
    uncachedThresholdMs,
  });
  report.evidence_integrity_scope = plan.document.integrity_scope;
  report.provider_evidence_plan = {
    cli: plan.document.cli,
    source_sha256: plan.source.sha256,
  };
  report.sources = {
    client: client.sources,
    plan: [plan.source],
    provider_count: providerCount.sources,
    provider_duration: providerDuration.sources,
    request_log: requestLogs.sources,
    external: external.sources,
  };

  await mkdir(outputDirectory, { recursive: true });
  const jsonPath = resolve(outputDirectory, 'report.json');
  const markdownPath = resolve(outputDirectory, 'report.md');
  await writeExclusive(
    jsonPath,
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await writeExclusive(markdownPath, markdownReport(report));

  process.stdout.write(
    `Acceptance: ${report.acceptance.passed ? 'PASS' : 'FAIL'}\nJSON: ${jsonPath}\nMarkdown: ${markdownPath}\n`,
  );
  if (!report.acceptance.passed) process.exitCode = 2;
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    strict: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      'base-url': { type: 'string' },
      'deployment-id': { type: 'string' },
      'output-dir': { type: 'string' },
      'origin-count': { type: 'string' },
      'edge-count': { type: 'string' },
      concurrency: { type: 'string' },
      'batch-pause-ms': { type: 'string' },
      'edge-prime-pause-ms': { type: 'string' },
      'session-id': { type: 'string' },
      environment: { type: 'string' },
      client: { type: 'string' },
      plan: { type: 'string' },
      'provider-count': { type: 'string' },
      'provider-duration': { type: 'string' },
      'request-log': { type: 'string' },
      external: { type: 'string' },
      'supabase-host': { type: 'string' },
      'min-cold': { type: 'string' },
      'threshold-ms': { type: 'string' },
    },
  });

  if (values.help || positionals.length === 0) {
    process.stdout.write(HELP);
    return;
  }
  if (positionals.length !== 1) {
    throw new Error('Supply exactly one command: collect, replan, or report.');
  }

  if (positionals[0] === 'collect') {
    await collectCommand(values);
    return;
  }
  if (positionals[0] === 'replan') {
    await replanCommand(values);
    return;
  }
  if (positionals[0] === 'report') {
    await reportCommand(values);
    return;
  }
  throw new Error(`Unknown command: ${positionals[0]}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
