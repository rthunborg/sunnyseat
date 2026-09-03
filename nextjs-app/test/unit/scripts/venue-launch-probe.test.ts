import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import {
  buildVercelEvidencePlan,
  buildLaunchReport as buildLaunchReportUntyped,
  normalizeRuntimeEvents,
  parseJsonLines,
  requestLogEvidenceFromJsonLines,
  validateVenuePayload,
} from '../../../scripts/launch-resilience/venue-probe-lib.mjs';
import {
  reportCommand,
  replanCommand,
  REQUEST_TIMEOUT_MS,
  sampleVenueRequest,
} from '../../../scripts/launch-resilience/venue-probe.mjs';

const TEST_DEPLOYMENT_ID = 'dpl_test_launch_resilience';
const TEST_SUPABASE_HOSTNAME = 'project-ref.supabase.co';
const TEST_WINDOW_START = '2026-08-18T09:00:00.000Z';
const TEST_WINDOW_END = '2026-08-18T09:00:00.125Z';
const TEST_SOURCE_SHA256 = 'a'.repeat(64);
const TEST_EXTERNAL_SOURCE_SHA256 = 'b'.repeat(64);

type PercentileSummary = {
  p50: number | null;
  p95: number | null;
};

type CohortSummary = {
  n: number;
  client_ttfb_ms: PercentileSummary;
  client_total_ms: PercentileSummary;
  function_duration_ms: PercentileSummary;
};

type LaunchReport = {
  acceptance: {
    passed: boolean;
    correctness: boolean;
    provider_join_complete: boolean;
    provider_request_evidence_complete: boolean;
    edge_cache_lane_complete: boolean;
    edge_provider_correlation_complete: boolean;
    dependency_attribution_complete: boolean;
    external_provider_complete: boolean;
    cold_sample_count: number;
    uncached_route_threshold_ms: number;
    provider_join_clock_skew_ms: number;
  };
  cohorts: {
    cold: CohortSummary;
    prewarmed: CohortSummary;
    hot: CohortSummary;
    origin_uncached: CohortSummary;
    edge_hit: CohortSummary;
  };
  raw_counts: {
    rejected_client_samples: number;
    runtime_events: number;
    provider_external_requests: number;
    [key: string]: number | undefined;
  };
  errors: string[];
};

const buildLaunchReportRuntime = buildLaunchReportUntyped as unknown as (
  options: Record<string, unknown>,
) => unknown;

function buildLaunchReport(
  options: Record<string, unknown>,
): LaunchReport {
  return buildLaunchReportRuntime(options) as LaunchReport;
}

function validPayload() {
  return {
    venues: Array.from({ length: 42 }, (_, venueIndex) => ({
      id: `venue-${venueIndex + 1}`,
      slug: `venue-${venueIndex + 1}`,
      sunDaySeries: Array.from({ length: 61 }, (_, stepIndex) => ({
        minutes: 360 + stepIndex * 15,
        sunExposurePercent: 50,
        currentSunStatus: 'Sunny',
        weatherGateState: 'not_gated',
        skyCondition: 'clear',
      })),
    })),
  };
}

function controlledProbeId(
  value: string,
  cohort: 'origin' | 'edge-prime' | 'edge' = 'origin',
  sequence = 1,
) {
  if (/^lr-\d{8}t\d{6}z-[0-9a-f]{8}-(?:origin|edge-prime|edge)-\d{3}$/u.test(value)) {
    return value;
  }
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  const token = (hash >>> 0).toString(16).padStart(8, '0');
  return `lr-20260818t090000z-${token}-${cohort}-${String(sequence).padStart(3, '0')}`;
}

function clientSample(
  probeLabel: string,
  cacheStatus = 'MISS',
  environment = 'production',
) {
  const probeId = controlledProbeId(
    probeLabel,
    cacheStatus === 'HIT' ? 'edge' : 'origin',
  );
  return {
    sequence: 1,
    probe_id: probeId,
    deployment_id: TEST_DEPLOYMENT_ID,
    requested_cohort: cacheStatus === 'HIT' ? 'edge-repeat' : 'origin',
    request_route: '/api/venues',
    started_at_utc: TEST_WINDOW_START,
    ended_at_utc: TEST_WINDOW_END,
    response_request_id: cacheStatus === 'HIT' ? 'edge-prime' : probeId,
    response_deployment_id: TEST_DEPLOYMENT_ID,
    vercel_id: `arn1::dub1::${probeId}`,
    environment,
    schema_version: 3,
    http_status: 200,
    cache_status: cacheStatus,
    ttfb_ms: 100,
    total_ms: 125,
    content_encoding: 'br',
    response_body_bytes: 1_024,
    response_body_sha256: 'd'.repeat(64),
    parse_error: null,
    validation: validateVenuePayload(validPayload()),
  };
}

function requestSourceSha(probeId: string) {
  return createHash('sha256').update(`request-log:${probeId}`).digest('hex');
}

function providerRequestEvidence(
  clients: ReturnType<typeof clientSample>[],
  source: 'serverless' | 'serverless-middleware' = 'serverless',
) {
  const evidence = clients.map((client) => {
    const sourceSha256 = requestSourceSha(client.probe_id);
    return {
      envelope: {
        id: String(client.vercel_id).split('::').at(-1),
        timestamp: Date.parse('2026-08-18T09:00:00.100Z'),
        deploymentId: TEST_DEPLOYMENT_ID,
        environment: client.environment,
        source,
        requestMethod: 'GET',
        requestPath: '/api/venues',
        responseStatusCode: 200,
        cache: client.cache_status,
        logs: [],
      },
      source_sha256: sourceSha256,
      source_record: 1,
    };
  });
  return {
    evidence,
    sources: evidence.map((entry) => ({
      sha256: entry.source_sha256,
      envelope_count: 1,
      capture_limit: 10,
    })),
  };
}

function edgeLaneClientSamples(label: string, repeatCount = 2, environment = 'production') {
  const primeId = controlledProbeId(label, 'edge-prime');
  const prime = {
    ...clientSample(primeId, 'MISS', environment),
    sequence: 2,
    requested_cohort: 'edge-prime',
  };
  const repeats = Array.from({ length: repeatCount }, (_, index) => ({
    ...clientSample(controlledProbeId(label, 'edge', index + 1), 'HIT', environment),
    sequence: index + 3,
    response_request_id: primeId,
  }));
  return { prime, repeats };
}
function providerSample(
  probeLabel: string,
  startType: 'cold' | 'prewarmed' | 'hot',
  functionDurationMs: number,
  environment = 'production',
) {
  const probeId = controlledProbeId(probeLabel);
  return {
    probe_id: probeId,
    provider_request_id: `provider-${probeId}`,
    start_type: startType,
    deployment_id: TEST_DEPLOYMENT_ID,
    environment,
    route: '/api/venues',
    timestamp_utc: '2026-08-18T09:00:00.100Z',
    region: 'dub1',
    status: 200,
    function_duration_ms: functionDurationMs,
  };
}

function runtimeEvents(
  probeLabel: string,
  region = 'dub1',
  timestamp = '2026-08-18T09:00:00.100Z',
  providerRequestId?: string,
  environment = 'production',
) {
  const probeId = controlledProbeId(probeLabel);
  const eventMetadata = {
    deployment_id: TEST_DEPLOYMENT_ID,
    environment,
    timestamp_utc: timestamp,
    provider_request_id: providerRequestId ?? probeId,
    runtime_provenance: {
      adapter: 'vercel-cli-request-logs-v1',
      source_sha256: requestSourceSha(probeId),
      source_record: 1,
      log_index: 1,
    },
  };
  return [
    {
      event: 'api_request_complete',
      request_id: probeId,
      route: '/api/venues',
      method: 'GET',
      ...eventMetadata,
      status: 200,
      region,
      duration_ms: 100,
    },
    {
      event: 'external_dependency',
      request_id: probeId,
      operation: 'venue_list',
      ...eventMetadata,
      destination_path: '/rest/v1/venues',
      method: 'GET',
      status: 200,
      region,
      duration_ms: 10,
    },
    {
      event: 'external_dependency',
      request_id: probeId,
      operation: 'sun_geometry_batch',
      ...eventMetadata,
      destination_path:
        '/rest/v1/rpc/read_current_venue_sun_geometry_batch',
      method: 'POST',
      status: 200,
      region,
      duration_ms: 20,
    },
    {
      event: 'external_dependency',
      request_id: probeId,
      operation: 'weather_batch',
      ...eventMetadata,
      destination_path: '/rest/v1/weather_bucket_snapshots',
      method: 'GET',
      status: 200,
      region,
      duration_ms: 15,
    },
  ];
}

const PROVIDER_GROUP_BY = [
  'function_start_type',
  'client_user_agent',
  'function_region',
  'deployment_id',
  'http_status',
  'route',
];
const EXTERNAL_GROUP_BY = [
  'deployment_id',
  'function_region',
  'http_status',
  'origin_route',
  'request_hostname',
  'request_method',
  'request_path',
];

function rawMetricEvidence(
  metric: string,
  aggregation: 'sum' | 'avg',
  groupBy: string[],
  summary: Array<Record<string, string | number>>,
  sourceSha256: string,
  windowStart = TEST_WINDOW_START,
  windowEnd = TEST_WINDOW_END,
  environment = 'production',
) {
  return [{
    source_sha256: sourceSha256,
    source_line: 1,
    document: {
      query: {
        metric,
        aggregation,
        groupBy,
        filter: `(deployment_id eq '${TEST_DEPLOYMENT_ID}') and (${
          metric === 'vercel.external_api_request.count' ? 'origin_route' : 'route'
        } eq '/api/venues') and (environment eq '${environment}')`,
        startTime: windowStart,
        endTime: windowEnd,
        granularity: { minutes: 5 },
        limit: 500,
        orderBy: 'count',
        orderDirection: 'desc',
      },
      summary,
      data: [{ timestamp: windowStart }],
    },
  }];
}

function providerMetricEvidence(
  samples: ReturnType<typeof providerSample>[],
  windowStart = TEST_WINDOW_START,
  windowEnd = TEST_WINDOW_END,
) {
  const dimensions = (sample: ReturnType<typeof providerSample>) => ({
    route: sample.route,
    function_start_type: sample.start_type,
    client_user_agent: `SunnySeatLaunchProbe/2 ${sample.probe_id}`,
    function_region: sample.region,
    deployment_id: sample.deployment_id,
    http_status: String(sample.status),
  });
  return {
    providerInvocationEvidence: rawMetricEvidence(
      'vercel.function_invocation.count',
      'sum',
      PROVIDER_GROUP_BY,
      samples.map((sample) => ({
        ...dimensions(sample),
        vercel_function_invocation_count_sum: 1,
      })),
      TEST_SOURCE_SHA256,
      windowStart,
      windowEnd,
      samples[0]?.environment ?? 'production',
    ),
    providerDurationEvidence: rawMetricEvidence(
      'vercel.function_invocation.function_duration_ms',
      'avg',
      PROVIDER_GROUP_BY,
      samples.map((sample) => ({
        ...dimensions(sample),
        vercel_function_invocation_function_duration_ms_avg:
          sample.function_duration_ms,
      })),
      'd'.repeat(64),
      windowStart,
      windowEnd,
      samples[0]?.environment ?? 'production',
    ),
  };
}

function externalMetricEvidence(
  samples: ReturnType<typeof providerSample>[],
  windowStart = TEST_WINDOW_START,
  windowEnd = TEST_WINDOW_END,
) {
  const countsByRegion = new Map<string, number>();
  for (const sample of samples) {
    countsByRegion.set(
      sample.region,
      (countsByRegion.get(sample.region) ?? 0) + 1,
    );
  }
  const summary = [...countsByRegion].flatMap(([region, count]) => [
    {
      deployment_id: TEST_DEPLOYMENT_ID,
      function_region: region,
      http_status: '200',
      origin_route: '/api/venues',
      request_hostname: TEST_SUPABASE_HOSTNAME,
      request_method: 'GET',
      request_path: '/rest/v1/venues',
      vercel_external_api_request_count_sum: count,
    },
    {
      deployment_id: TEST_DEPLOYMENT_ID,
      function_region: region,
      http_status: '200',
      origin_route: '/api/venues',
      request_hostname: TEST_SUPABASE_HOSTNAME,
      request_method: 'GET',
      request_path: '/rest/v1/weather_bucket_snapshots',
      vercel_external_api_request_count_sum: count,
    },
    {
      deployment_id: TEST_DEPLOYMENT_ID,
      function_region: region,
      http_status: '200',
      origin_route: '/api/venues',
      request_hostname: TEST_SUPABASE_HOSTNAME,
      request_method: 'POST',
      request_path: '/rest/v1/rpc/read_current_venue_sun_geometry_batch',
      vercel_external_api_request_count_sum: count,
    },
  ]);
  return rawMetricEvidence(
    'vercel.external_api_request.count',
    'sum',
    EXTERNAL_GROUP_BY,
    summary,
    TEST_EXTERNAL_SOURCE_SHA256,
    windowStart,
    windowEnd,
    samples[0]?.environment ?? 'production',
  );
}

function reportEvidence(
  samples: ReturnType<typeof providerSample>[],
  clients = samples.map((sample) => clientSample(sample.probe_id)),
) {
  const requestEvidence = providerRequestEvidence(clients);
  return {
    expectedDeploymentId: TEST_DEPLOYMENT_ID,
    expectedSupabaseHostname: TEST_SUPABASE_HOSTNAME,
    ...providerMetricEvidence(samples),
    providerExternalEvidence: externalMetricEvidence(samples),
    providerRequestEvidence: requestEvidence.evidence,
    providerRequestCaptureSources: requestEvidence.sources,
  };
}
describe('venue launch probe evidence', () => {
  test('requires 42 unique venues with the exact 61-step series contract', () => {

    expect(validateVenuePayload(validPayload())).toEqual({
      passed: true,
      venue_count: 42,
      unique_id_count: 42,
      unique_slug_count: 42,
      series_count_min: 61,
      series_count_max: 61,
      exact_series_steps: true,
      exact_series_values: true,
    });

    const shortSeries = validPayload();
    shortSeries.venues[7]!.sunDaySeries.pop();
    expect(validateVenuePayload(shortSeries)).toMatchObject({
      passed: false,
      venue_count: 42,
      series_count_min: 60,
      exact_series_steps: false,
    });

    const duplicate = validPayload();
    duplicate.venues[41]!.id = duplicate.venues[0]!.id;
    expect(validateVenuePayload(duplicate)).toMatchObject({
      passed: false,
      unique_id_count: 41,
    });
  });

  test('reports provider-classified cohorts separately with raw n, p50, and p95', () => {
    const cold = Array.from({ length: 20 }, (_, index) =>
      providerSample(`cold-${index + 1}`, 'cold', 1_000 + index),
    );
    const prewarmed = [providerSample('prewarmed-1', 'prewarmed', 1_400)];
    const hot = [providerSample('hot-1', 'hot', 600)];
    const originProviderSamples = [...cold, ...prewarmed, ...hot];
    const edge = edgeLaneClientSamples('edge-cache');
    const edgePrimeProvider = providerSample(edge.prime.probe_id, 'hot', 550);
    const providerSamples = [...originProviderSamples, edgePrimeProvider];
    const originClientSamples = originProviderSamples.map((sample) =>
      clientSample(sample.probe_id),
    );
    const appEvents = providerSamples.flatMap((sample) =>
      runtimeEvents(sample.probe_id),
    );
    const clients = [
      ...originClientSamples,
      edge.prime,
      ...edge.repeats,
    ];

    const report = buildLaunchReport({
      clientSamples: clients,
      runtimeEvents: appEvents,
      ...reportEvidence(providerSamples, clients),
      minColdSamples: 20,
      uncachedThresholdMs: 5_000,
    });

    expect(report.acceptance).toMatchObject({
      passed: true,
      correctness: true,
      provider_join_complete: true,
      edge_cache_lane_complete: true,
      dependency_attribution_complete: true,
      cold_sample_count: 20,
      uncached_route_threshold_ms: 5_000,
    });
    expect(report.cohorts.cold).toMatchObject({
      n: 20,
      client_total_ms: { p50: 125, p95: 125 },
      function_duration_ms: { p50: 1_009, p95: 1_018 },
    });
    expect(report.cohorts.prewarmed.n).toBe(1);
    expect(report.cohorts.hot.n).toBe(1);
    expect(report.cohorts.origin_uncached.n).toBe(22);
    expect(report.cohorts.edge_hit.n).toBe(2);
    expect(report.errors).toEqual([]);
  });

  test('accepts preview evidence without production-only runtime joins', () => {
    const cold = Array.from({ length: 20 }, (_, index) =>
      providerSample(`preview-cold-${index + 1}`, 'cold', 1_000 + index, 'preview'),
    );
    const edge = edgeLaneClientSamples('preview-edge', 1, 'preview');
    const providers = [
      ...cold,
      providerSample(edge.prime.probe_id, 'hot', 550, 'preview'),
    ];
    const clients = [
      ...cold.map((sample) => clientSample(sample.probe_id, 'MISS', 'preview')),
      edge.prime,
      ...edge.repeats,
    ];
    const appEvents = providers.flatMap((sample) =>
      runtimeEvents(sample.probe_id, 'dub1', '2026-08-18T09:00:00.100Z', undefined, 'preview'),
    );

    const report = buildLaunchReport({
      clientSamples: clients,
      runtimeEvents: appEvents,
      ...reportEvidence(providers, clients),
      expectedEnvironment: 'preview',
      minColdSamples: 20,
      uncachedThresholdMs: 5_000,
    });

    expect(report.acceptance).toMatchObject({
      passed: true,
      dependency_attribution_complete: true,
      cold_sample_count: 20,
    });
    expect(report.errors).toEqual([]);
  });

  test('enforces the route threshold against uncached client total p95', () => {
    const probeId = 'cold-slow-client';
    const client = clientSample(probeId, 'MISS');
    client.total_ms = 5_001;

    const providerSamples = [providerSample(probeId, 'cold', 900)];
    const report = buildLaunchReport({
      clientSamples: [client],
      runtimeEvents: runtimeEvents(probeId),
      ...reportEvidence(providerSamples),
      minColdSamples: 1,
      uncachedThresholdMs: 5_000,
    });

    expect(report.cohorts.cold.function_duration_ms.p95).toBe(900);
    expect(report.cohorts.origin_uncached.client_total_ms.p95).toBe(5_001);
    expect(report.acceptance.passed).toBe(false);
    expect(report.errors).toContain(
      'Uncached origin client total p95 5001 ms exceeds 5000 ms.',
    );
  });

  test('never equates a cache MISS with a cold start', () => {
    const probeId = 'miss-but-hot';
    const providerSamples = [providerSample(probeId, 'hot', 500)];
    const report = buildLaunchReport({
      clientSamples: [clientSample(probeId, 'MISS')],
      runtimeEvents: runtimeEvents(probeId),
      ...reportEvidence(providerSamples),
      minColdSamples: 1,
      uncachedThresholdMs: 5_000,
    });

    expect(report.cohorts.cold.n).toBe(0);
    expect(report.cohorts.hot.n).toBe(1);
    expect(report.acceptance.passed).toBe(false);
    expect(report.errors).toContain(
      'Need at least 1 provider-classified cold samples; received 0.',
    );
  });

  test('rejects invalid series values and enums', () => {
    const invalid = validPayload();
    const step = invalid.venues[0]!.sunDaySeries[0]!;
    step.sunExposurePercent = 101;
    step.currentSunStatus = 'Unexpected';
    step.weatherGateState = 'invalid';

    expect(validateVenuePayload(invalid)).toMatchObject({
      passed: false,
      exact_series_values: false,
    });
  });

  test('excludes failed timing samples from latency and cold counts', () => {
    const good = clientSample('cold-good');
    const bad = clientSample('cold-bad');
    bad.total_ms = Number.NaN;
    const providerSamples = [
      providerSample(good.probe_id, 'cold', 800),
      providerSample(bad.probe_id, 'cold', 900),
    ];
    const report = buildLaunchReport({
      clientSamples: [good, bad],
      runtimeEvents: [...runtimeEvents(good.probe_id), ...runtimeEvents(bad.probe_id)],
      ...reportEvidence(providerSamples),
      minColdSamples: 1,
      uncachedThresholdMs: 5_000,
    });

    expect(report.cohorts.cold.n).toBe(1);
    expect(report.cohorts.origin_uncached.n).toBe(1);
    expect(report.raw_counts.rejected_client_samples).toBe(1);
    expect(report.acceptance.passed).toBe(false);
  });

  test('accepts missing cacheable MISS response echoes but rejects stale mismatches', () => {
    const noEcho = {
      ...clientSample('no-echo-miss', 'MISS'),
      response_request_id: null as string | null,
    };
    const providerSamples = [
      providerSample(noEcho.probe_id, 'cold', 900),
    ];
    const report = buildLaunchReport({
      clientSamples: [noEcho],
      runtimeEvents: runtimeEvents(noEcho.probe_id),
      ...reportEvidence(providerSamples),
      minColdSamples: 1,
      uncachedThresholdMs: 5_000,
    });

    expect(report.cohorts.origin_uncached.n).toBe(1);
    expect(report.cohorts.cold.n).toBe(1);
    expect(report.raw_counts.rejected_client_samples).toBe(0);
    expect(report.errors).not.toContain(
      `${noEcho.probe_id} did not echo its origin request id.`,
    );
  });

  test('rejects ambiguous cache states and stale origin echo mismatches', () => {
    const stale = clientSample('stale-client', 'STALE');
    const wrongEcho = clientSample('wrong-echo', 'MISS');
    wrongEcho.response_request_id = 'different-probe';
    const providerSamples = [
      providerSample(stale.probe_id, 'cold', 800),
      providerSample(wrongEcho.probe_id, 'cold', 900),
    ];
    const report = buildLaunchReport({
      clientSamples: [stale, wrongEcho],
      runtimeEvents: [...runtimeEvents(stale.probe_id), ...runtimeEvents(wrongEcho.probe_id)],
      ...reportEvidence(providerSamples),
      minColdSamples: 1,
      uncachedThresholdMs: 5_000,
    });

    expect(report.cohorts.origin_uncached.n).toBe(0);
    expect(report.cohorts.cold.n).toBe(0);
    expect(report.acceptance.correctness).toBe(false);
    expect(report.errors).toContain(
      `${stale.probe_id} has unsupported cache status STALE.`,
    );
    expect(report.errors).toContain(
      `${wrongEcho.probe_id} did not echo its origin request id.`,
    );
  });

  test('rejects runtime request ids that do not match exact request captures', () => {
    const first = clientSample('provider-first');
    const second = clientSample('provider-second');
    const providerSamples = [
      providerSample(first.probe_id, 'cold', 700),
      providerSample(second.probe_id, 'cold', 800),
    ];
    const sharedProviderRequestId = 'provider-shared-request';
    const report = buildLaunchReport({
      clientSamples: [first, second],
      runtimeEvents: [
        ...runtimeEvents(
          first.probe_id,
          'dub1',
          '2026-08-18T09:00:00.100Z',
          sharedProviderRequestId,
        ),
        ...runtimeEvents(
          second.probe_id,
          'dub1',
          '2026-08-18T09:00:00.100Z',
          sharedProviderRequestId,
        ),
      ],
      ...reportEvidence(providerSamples),
      minColdSamples: 1,
      uncachedThresholdMs: 5_000,
    });

    expect(report.cohorts.cold.n).toBe(0);
    expect(report.acceptance.provider_join_complete).toBe(false);
    expect(report.errors).toContain(
      'Runtime event is not provenance-linked to its exact request-id capture.',
    );
  });

  test('requires the exact dependency method, region, status, and duration', () => {
    const probeId = 'bad-dependency-fields';
    const events = runtimeEvents(probeId);
    const venueEvent = events.find(
      (event) => 'operation' in event && event.operation === 'venue_list',
    )!;
    venueEvent.method = 'DELETE';
    venueEvent.duration_ms = Number.NaN;
    venueEvent.region = 'iad1';
    const providerSamples = [providerSample(probeId, 'cold', 800)];
    const report = buildLaunchReport({
      clientSamples: [clientSample(probeId)],
      runtimeEvents: events,
      ...reportEvidence(providerSamples),
      minColdSamples: 1,
      uncachedThresholdMs: 5_000,
    });

    expect(report.acceptance.dependency_attribution_complete).toBe(false);
    expect(report.errors).toContain(
      `${controlledProbeId(probeId)} expected one venue_list dependency; received 0.`,
    );
  });

  test('fails provider-host evidence when any non-Supabase dependency appears', () => {
    const probeId = 'met-no-visible';
    const providerSamples = [providerSample(probeId, 'cold', 800)];
    const client = clientSample(probeId);
    const requestEvidence = providerRequestEvidence([client]);
    const providerExternal = externalMetricEvidence(providerSamples);
    providerExternal[0]!.document.summary[0]!.request_hostname = 'api.met.no';
    const report = buildLaunchReport({
      clientSamples: [client],
      runtimeEvents: runtimeEvents(probeId),
      providerRequestEvidence: requestEvidence.evidence,
      providerRequestCaptureSources: requestEvidence.sources,
      expectedDeploymentId: TEST_DEPLOYMENT_ID,
      expectedSupabaseHostname: TEST_SUPABASE_HOSTNAME,
      ...providerMetricEvidence(providerSamples),
      providerExternalEvidence: providerExternal,
      minColdSamples: 1,
      uncachedThresholdMs: 5_000,
    });

    expect(report.acceptance.external_provider_complete).toBe(false);
    expect(report.errors).toContain(
      'Provider external evidence contains an unexpected host, path, method, status, region, route, or deployment.',
    );
  });

  test('parses JSONL deterministically and normalizes Vercel log envelopes', () => {
    expect(
      parseJsonLines('{"probe_id":"one"}\n\n{"probe_id":"two"}\n', 'provider.jsonl'),
    ).toEqual([{ probe_id: 'one' }, { probe_id: 'two' }]);
    expect(() =>
      parseJsonLines('{"probe_id":"one"}\nnot-json', 'provider.jsonl'),
    ).toThrow('provider.jsonl line 2 is not valid JSON');

    expect(
      normalizeRuntimeEvents([
        {
          envelope: {
          deploymentId: TEST_DEPLOYMENT_ID,
          environment: 'production',
          id: 'provider-probe-one',
          timestamp: Date.parse('2026-08-18T09:02:00.000Z'),
            source: 'serverless',
            requestMethod: 'GET',
            requestPath: '/api/venues',
            responseStatusCode: 200,
          message: JSON.stringify({
            event: 'api_request_complete',
            request_id: 'probe-one',
          }),
            logs: [
              {
                level: 'info',
                message: JSON.stringify({
                  event: 'api_request_complete',
                  request_id: 'probe-one',
                }),
              },
              {
                level: 'info',
                message: JSON.stringify({
                  event: 'external_dependency',
                  request_id: 'probe-one',
                }),
              },
            ],
          },
          source_sha256: 'a'.repeat(64),
          source_record: 1,
        },
        { envelope: { message: 'display-only application log' } },
        { event: 'external_dependency', request_id: 'hand-authored' },
      ]),
    ).toEqual([
      {
        event: 'api_request_complete',
        request_id: 'probe-one',
        deployment_id: TEST_DEPLOYMENT_ID,
        environment: 'production',
        provider_request_id: 'provider-probe-one',
        timestamp_utc: '2026-08-18T09:02:00.000Z',
        runtime_provenance: {
          adapter: 'vercel-cli-request-logs-v1',
          source_sha256: 'a'.repeat(64),
          source_record: 1,
          log_index: 1,
        },
      },
      {
        event: 'external_dependency',
        request_id: 'probe-one',
        deployment_id: TEST_DEPLOYMENT_ID,
        environment: 'production',
        provider_request_id: 'provider-probe-one',
        timestamp_utc: '2026-08-18T09:02:00.000Z',
        runtime_provenance: {
          adapter: 'vercel-cli-request-logs-v1',
          source_sha256: 'a'.repeat(64),
          source_record: 1,
          log_index: 2,
        },
      },
    ]);
  });

  test('adapts raw Vercel request-log JSONL before normalization', () => {
    const raw = `${JSON.stringify({
      id: 'provider-probe-jsonl',
      deploymentId: TEST_DEPLOYMENT_ID,
      environment: 'production',
      timestamp: Date.parse('2026-08-18T09:02:00.000Z'),
      source: 'serverless',
      requestMethod: 'GET',
      requestPath: '/api/venues',
      responseStatusCode: 200,
      logs: [{
        level: 'info',
        message: JSON.stringify({
          event: 'api_request_complete',
          request_id: 'probe-jsonl',
        }),
      }],
    })}\n`;
    const adapted = requestLogEvidenceFromJsonLines(raw, 'request-log.jsonl');

    expect(adapted.source.sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(adapted.source.bytes).toBe(Buffer.byteLength(raw));
    expect(adapted.evidence).toHaveLength(1);
    expect(normalizeRuntimeEvents(adapted.evidence)).toMatchObject([
      {
        event: 'api_request_complete',
        request_id: 'probe-jsonl',
        provider_request_id: 'provider-probe-jsonl',
        runtime_provenance: {
          source_sha256: adapted.source.sha256,
          source_record: 1,
          log_index: 1,
        },
      },
    ]);
  });

  test('fails attribution when any request has an unknown dependency', () => {
    const probeId = controlledProbeId('cold-with-unknown');
    const events = runtimeEvents(probeId);
    events.push({
      ...events[0],
      event: 'external_dependency_unattributed',
      request_id: probeId,
      operation: 'unattributed_supabase',
      method: 'POST',
      status: 200,
      region: 'dub1',
      duration_ms: 8,
    } as (typeof events)[number]);

    const providerSamples = [providerSample(probeId, 'cold', 900)];
    const report = buildLaunchReport({
      clientSamples: [clientSample(probeId)],
      runtimeEvents: events,
      ...reportEvidence(providerSamples),
      minColdSamples: 1,
      uncachedThresholdMs: 5_000,
    });

    expect(report.acceptance.dependency_attribution_complete).toBe(false);
    expect(report.acceptance.passed).toBe(false);
    expect(report.errors).toContain(
      `${probeId} emitted an unattributed external dependency.`,
    );
  });
  test('attaches the fixed ten-second AbortSignal to each client request', async () => {
    const probeId = controlledProbeId('timeout');
    let capturedSignal: AbortSignal | null | undefined;
    vi.stubGlobal('fetch', async (_input: unknown, init?: RequestInit) => {
      capturedSignal = init?.signal;
      const headers = new Map<string, string>([
        ['x-vercel-cache', 'MISS'],
        ['x-sunnyseat-request-id', probeId],
        ['x-sunnyseat-deployment-id', TEST_DEPLOYMENT_ID],
        ['x-vercel-id', 'arn1::dub1::timeout'],
        ['content-encoding', 'br'],
      ]);
      return {
        status: 200,
        headers: { get: (name: string) => headers.get(name) ?? null },
        text: async () => JSON.stringify(validPayload()),
      } as unknown as Response;
    });

    try {
      const sample = await sampleVenueRequest({
        url: new URL('https://sunnyseat.vercel.app/api/venues'),
        probeId,
        requestedCohort: 'origin',
        sequence: 1,
        deploymentId: TEST_DEPLOYMENT_ID,
      });
      expect(REQUEST_TIMEOUT_MS).toBe(10_000);
      expect(capturedSignal).toBeInstanceOf(AbortSignal);
      expect(sample.http_status).toBe(200);
      expect(sample.validation.passed).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  test('wires raw Vercel JSONL through the actual report command reader', async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'sunnyseat-venue-probe-'));
    const previousExitCode = process.exitCode;
    try {
      const cold = Array.from({ length: 20 }, (_, index) =>
        providerSample(`reader-cold-${index + 1}`, 'cold', 800 + index),
      );
      const edge = edgeLaneClientSamples('reader-edge', 1);
      const providers = [
        ...cold,
        providerSample(edge.prime.probe_id, 'hot', 500),
      ];
      const clients = [
        ...cold.map((sample) => clientSample(sample.probe_id)),
        edge.prime,
        ...edge.repeats,
      ];
      const metrics = providerMetricEvidence(providers);
      const external = externalMetricEvidence(providers);
      const plan = buildVercelEvidencePlan({
        deploymentId: TEST_DEPLOYMENT_ID,
        measurementWindow: {
          started_at_utc: TEST_WINDOW_START,
          ended_at_utc: TEST_WINDOW_END,
        },
        clientSamples: clients,
      });
      const requestLogFiles = clients.map((client, index) => {
        const provider = providers.find(
          (sample) => sample.probe_id === client.probe_id,
        );
        const envelope = {
          id: String(client.vercel_id).split('::').at(-1),
          timestamp: Date.parse('2026-08-18T09:00:00.100Z'),
          deploymentId: TEST_DEPLOYMENT_ID,
          environment: 'production',
          source: provider ? 'serverless' : 'serverless-middleware',
          requestMethod: 'GET',
          requestPath: '/api/venues',
          responseStatusCode: 200,
          cache: client.cache_status,
          logs: provider
            ? runtimeEvents(provider.probe_id).map((event) => {
                const message = { ...event } as Record<string, unknown>;
                delete message.deployment_id;
                delete message.environment;
                delete message.provider_request_id;
                delete message.timestamp_utc;
                delete message.runtime_provenance;
                return { level: 'info', message: JSON.stringify(message) };
              })
            : [],
        };
        return {
          path: join(
            temporaryRoot,
            `request-log-${String(index + 1).padStart(3, '0')}.jsonl`,
          ),
          content: `${JSON.stringify(envelope)}\n`,
        };
      });

      const clientPath = join(temporaryRoot, 'client-samples.jsonl');
      const planPath = join(temporaryRoot, 'provider-evidence-plan.json');
      const countPath = join(temporaryRoot, 'function-invocation-count.json');
      const durationPath = join(temporaryRoot, 'function-duration.json');
      const externalPath = join(temporaryRoot, 'external-api-request-count.json');
      const reportDirectory = join(temporaryRoot, 'report');
      await Promise.all([
        writeFile(
          clientPath,
          `${clients.map((sample) => JSON.stringify(sample)).join('\n')}\n`,
          'utf8',
        ),
        writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8'),
        writeFile(
          countPath,
          `${JSON.stringify(metrics.providerInvocationEvidence[0]!.document)}\n`,
          'utf8',
        ),
        writeFile(
          durationPath,
          `${JSON.stringify(metrics.providerDurationEvidence[0]!.document)}\n`,
          'utf8',
        ),
        ...requestLogFiles.map((file) =>
          writeFile(file.path, file.content, 'utf8'),
        ),
        writeFile(
          externalPath,
          `${JSON.stringify(external[0]!.document)}\n`,
          'utf8',
        ),
      ]);

      await reportCommand({
        'deployment-id': TEST_DEPLOYMENT_ID,
        'supabase-host': TEST_SUPABASE_HOSTNAME,
        client: clientPath,
        plan: planPath,
        'provider-count': countPath,
        'provider-duration': durationPath,
        'request-log': requestLogFiles.map((file) => file.path).join(','),
        external: externalPath,
        'output-dir': reportDirectory,
      });

      const report = JSON.parse(
        await readFile(join(reportDirectory, 'report.json'), 'utf8'),
      );
      expect(report.acceptance).toMatchObject({
        passed: true,
        cold_sample_count: 20,
        edge_cache_lane_complete: true,
      });
      expect(report.raw_counts.runtime_events).toBe(providers.length * 4);
      expect(report.provider_evidence_plan).toMatchObject({
        cli: { version: '59.1.3' },
        source_sha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
      });
      expect(report.sources.request_log[0]).toMatchObject({
        path: requestLogFiles[0]!.path,
        sha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
        envelope_count: 1,
        capture_limit: 10,
      });
    } finally {
      process.exitCode = previousExitCode;
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test('replans preview multi-window evidence with one edge-prime and >=20 origin attempts', async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'sunnyseat-venue-replan-'));
    try {
      const origins = Array.from({ length: 20 }, (_, index) => ({
        ...clientSample(`replan-preview-origin-${index + 1}`, 'MISS', 'preview'),
        sequence: index + 1,
      }));
      const edge = edgeLaneClientSamples('replan-preview-edge', 1, 'preview');
      edge.prime.sequence = 21;
      edge.repeats[0]!.sequence = 22;
      const firstPath = join(temporaryRoot, 'client-window-a.jsonl');
      const secondPath = join(temporaryRoot, 'client-window-b.jsonl');
      const outputDirectory = join(temporaryRoot, 'replanned');
      await Promise.all([
        writeFile(
          firstPath,
          `${origins.slice(0, 12).map((sample) => JSON.stringify(sample)).join('\n')}\n`,
          'utf8',
        ),
        writeFile(
          secondPath,
          `${[...origins.slice(12), edge.prime, ...edge.repeats]
            .map((sample) => JSON.stringify(sample))
            .join('\n')}\n`,
          'utf8',
        ),
      ]);

      await replanCommand({
        'deployment-id': TEST_DEPLOYMENT_ID,
        environment: 'preview',
        client: `${firstPath},${secondPath}`,
        'output-dir': outputDirectory,
      });

      const manifest = JSON.parse(
        await readFile(join(outputDirectory, 'manifest.json'), 'utf8'),
      );
      const plan = JSON.parse(
        await readFile(join(outputDirectory, 'provider-evidence-plan.json'), 'utf8'),
      );
      expect(manifest).toMatchObject({
        command: 'replan',
        deployment_id: TEST_DEPLOYMENT_ID,
        environment: 'preview',
        client_samples: 22,
        client_samples_by_requested_cohort: {
          origin: 20,
          edge_prime: 1,
          edge_repeat: 1,
        },
        minimum_provider_cold_samples_required: 20,
        edge_prime_policy: 'exactly_one_across_aggregated_windows',
        correctness_passed: true,
        client_correctness_summary: {
          raw_samples: 22,
          passed_samples: 22,
          failed_samples: 0,
        },
        cache_counts: {
          MISS: 21,
          HIT: 1,
        },
      });
      expect(plan.environment).toBe('preview');
      const providerCount = plan.exports.find(
        (entry: { id: string }) => entry.id === 'provider_count',
      );
      expect(providerCount.argv).not.toContain('--prod');
      expect(providerCount.argv).toContain("environment eq 'preview'");
      const requestLogs = plan.exports.filter((entry: { id: string }) =>
        entry.id.startsWith('request_log_'),
      );
      expect(requestLogs).toHaveLength(22);
      expect(requestLogs[0]!.argv).toContain('--environment');
      expect(requestLogs[0]!.argv[requestLogs[0]!.argv.indexOf('--environment') + 1]).toBe(
        'preview',
      );
      expect(manifest.client_sources).toEqual([
        expect.objectContaining({ path: firstPath, row_count: 12 }),
        expect.objectContaining({ path: secondPath, row_count: 10 }),
      ]);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test('preserves failed raw client correctness when replanning aggregated windows', async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'sunnyseat-venue-replan-'));
    try {
      const origins = Array.from({ length: 20 }, (_, index) => ({
        ...clientSample(`replan-raw-origin-${index + 1}`),
        sequence: index + 1,
      }));
      origins[5]!.validation = {
        ...origins[5]!.validation,
        passed: false,
        venue_count: 41,
      };
      const edge = edgeLaneClientSamples('replan-raw-edge', 1);
      edge.prime.sequence = 21;
      edge.repeats[0]!.sequence = 22;
      const clientPath = join(temporaryRoot, 'client-window.jsonl');
      const outputDirectory = join(temporaryRoot, 'replanned');
      await writeFile(
        clientPath,
        `${[...origins, edge.prime, ...edge.repeats]
          .map((sample) => JSON.stringify(sample))
          .join('\n')}\n`,
        'utf8',
      );

      await replanCommand({
        'deployment-id': TEST_DEPLOYMENT_ID,
        client: clientPath,
        'output-dir': outputDirectory,
      });

      const manifest = JSON.parse(
        await readFile(join(outputDirectory, 'manifest.json'), 'utf8'),
      );
      const plan = JSON.parse(
        await readFile(join(outputDirectory, 'provider-evidence-plan.json'), 'utf8'),
      );

      expect(manifest).toMatchObject({
        command: 'replan',
        client_samples: 22,
        correctness_passed: false,
        client_correctness_summary: {
          raw_samples: 22,
          passed_samples: 21,
          failed_samples: 1,
          payload_valid: 21,
        },
        cache_counts: {
          MISS: 21,
          HIT: 1,
        },
      });
      expect(manifest.client_sources).toEqual([
        expect.objectContaining({ path: clientPath, row_count: 22 }),
      ]);
      expect(plan.exports.filter((entry: { id: string }) =>
        entry.id.startsWith('request_log_'),
      )).toHaveLength(22);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  test('rejects replan aggregation with multiple edge-prime samples or too few origin attempts', async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'sunnyseat-venue-replan-'));
    try {
      const origins = Array.from({ length: 20 }, (_, index) =>
        clientSample(`replan-origin-${index + 1}`),
      );
      const edgeA = edgeLaneClientSamples('replan-edge-a', 1);
      const edgeB = edgeLaneClientSamples('replan-edge-b', 1);
      const duplicatePrimePath = join(temporaryRoot, 'duplicate-prime.jsonl');
      await writeFile(
        duplicatePrimePath,
        `${[...origins, edgeA.prime, edgeA.repeats[0]!, edgeB.prime]
          .map((sample) => JSON.stringify(sample))
          .join('\n')}\n`,
        'utf8',
      );

      await expect(
        replanCommand({
          'deployment-id': TEST_DEPLOYMENT_ID,
          client: duplicatePrimePath,
          'output-dir': join(temporaryRoot, 'duplicate-output'),
        }),
      ).rejects.toThrow('exactly one edge-prime client sample');

      const tooFewOriginsPath = join(temporaryRoot, 'too-few-origins.jsonl');
      await writeFile(
        tooFewOriginsPath,
        `${[...origins.slice(0, 19), edgeA.prime, edgeA.repeats[0]!]
          .map((sample) => JSON.stringify(sample))
          .join('\n')}\n`,
        'utf8',
      );

      await expect(
        replanCommand({
          'deployment-id': TEST_DEPLOYMENT_ID,
          client: tooFewOriginsPath,
          'output-dir': join(temporaryRoot, 'too-few-output'),
        }),
      ).rejects.toThrow('at least 20 origin client attempts');
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
