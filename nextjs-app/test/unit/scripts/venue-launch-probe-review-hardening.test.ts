import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import {
  buildVercelEvidencePlan,
  buildLaunchReport,
  deriveVercelProviderSamples,
  isCanonicalProbeId,
  PROVIDER_JOIN_CLOCK_SKEW_MS,
  validateVercelEvidencePlan,
} from '../../../scripts/launch-resilience/venue-probe-lib.mjs';

const DEPLOYMENT_ID = 'dpl_test_launch_resilience';
const SUPABASE_HOSTNAME = 'project-ref.supabase.co';
const INVOCATION_SOURCE_SHA256 = 'a'.repeat(64);
const DURATION_SOURCE_SHA256 = 'b'.repeat(64);
const EXTERNAL_SOURCE_SHA256 = 'c'.repeat(64);
const WINDOW_START = '2026-08-18T09:00:00.000Z';
const WINDOW_END = '2026-08-18T09:00:00.125Z';
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

type StartType = 'cold' | 'prewarmed' | 'hot';

function requestSourceSha(probeId: string) {
  return createHash('sha256').update(`request-log:${probeId}`).digest('hex');
}

function canonicalProbeId(
  label: string,
  cohort: 'origin' | 'edge-prime' | 'edge' = 'origin',
  sequence = 1,
) {
  let hash = 0x811c9dc5;
  for (const character of label) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  const token = (hash >>> 0).toString(16).padStart(8, '0');
  return `lr-20260818t090000z-${token}-${cohort}-${String(sequence).padStart(3, '0')}`;
}

function clientSample(
  probeId: string,
  startedAt = WINDOW_START,
  endedAt = WINDOW_END,
) {
  return {
    schema_version: 3,
    probe_id: probeId,
    sequence: 1,
    deployment_id: DEPLOYMENT_ID,
    environment: 'production',
    requested_cohort: 'origin',
    request_route: '/api/venues',
    started_at_utc: startedAt,
    ended_at_utc: endedAt,
    response_request_id: probeId,
    response_deployment_id: DEPLOYMENT_ID,
    vercel_id: `arn1::dub1::provider-${probeId}`,
    http_status: 200,
    cache_status: 'MISS',
    ttfb_ms: 100,
    total_ms: Date.parse(endedAt) - Date.parse(startedAt),
    content_encoding: 'br',
    response_body_bytes: 1_024,
    response_body_sha256: 'd'.repeat(64),
    parse_error: null,
    validation: {
      passed: true,
      venue_count: 42,
      unique_id_count: 42,
      unique_slug_count: 42,
      series_count_min: 61,
      series_count_max: 61,
      exact_series_steps: true,
      exact_series_values: true,
    },
  };
}

function edgeLaneClients(label: string) {
  const primeId = canonicalProbeId(label, 'edge-prime');
  const repeatId = canonicalProbeId(label, 'edge');
  const prime = {
    ...clientSample(primeId),
    sequence: 2,
    requested_cohort: 'edge-prime',
  };
  const repeat = {
    ...clientSample(repeatId),
    sequence: 3,
    requested_cohort: 'edge-repeat',
    cache_status: 'HIT',
    response_request_id: primeId,
  };
  return { prime, repeat };
}
function providerSpec(
  probeId: string,
  startType: StartType = 'cold',
  region = 'dub1',
  durationMs = 750,
) {
  return {
    probe_id: probeId,
    start_type: startType,
    region,
    deployment_id: DEPLOYMENT_ID,
    route: '/api/venues',
    status: 200,
    function_duration_ms: durationMs,
  };
}

function runtimeEvents(
  probeId: string,
  region = 'dub1',
  timestamp = '2026-08-18T09:00:00.100Z',
  providerRequestId = `provider-${probeId}`,
) {
  const common = {
    request_id: probeId,
    deployment_id: DEPLOYMENT_ID,
    environment: 'production',
    provider_request_id: providerRequestId,
    runtime_provenance: {
      adapter: 'vercel-cli-request-logs-v1',
      source_sha256: requestSourceSha(probeId),
      source_record: 1,
      log_index: 1,
    },
    timestamp_utc: timestamp,
    region,
  };
  return [
    {
      ...common,
      event: 'api_request_complete',
      route: '/api/venues',
      method: 'GET',
      status: 200,
      duration_ms: 100,
    },
    {
      ...common,
      event: 'external_dependency',
      operation: 'venue_list',
      destination_path: '/rest/v1/venues',
      method: 'GET',
      status: 200,
      duration_ms: 10,
    },
    {
      ...common,
      event: 'external_dependency',
      operation: 'sun_geometry_batch',
      destination_path: '/rest/v1/rpc/read_current_venue_sun_geometry_batch',
      method: 'POST',
      status: 200,
      duration_ms: 20,
    },
    {
      ...common,
      event: 'external_dependency',
      operation: 'weather_batch',
      destination_path: '/rest/v1/weather_bucket_snapshots',
      method: 'GET',
      status: 200,
      duration_ms: 15,
    },
  ];
}

function rawMetricEvidence(
  metric: string,
  aggregation: 'sum' | 'avg',
  groupBy: string[],
  summary: Array<Record<string, string | number>>,
  sourceSha256: string,
  windowStart = WINDOW_START,
  windowEnd = WINDOW_END,
) {
  return [{
    source_sha256: sourceSha256,
    source_line: 1,
    document: {
      query: {
        metric,
        aggregation,
        groupBy: [...groupBy],
        filter: `(deployment_id eq '${DEPLOYMENT_ID}') and (${
          metric === 'vercel.external_api_request.count' ? 'origin_route' : 'route'
        } eq '/api/venues') and (environment eq 'production')`,
        startTime: windowStart,
        endTime: windowEnd,
        granularity: { minutes: 5 },
        orderBy: 'count',
        orderDirection: 'desc',
      },
      summary,
      data: [{ timestamp: windowStart }],
    },
  }];
}

function providerMetricEvidence(
  samples: ReturnType<typeof providerSpec>[],
  windowStart = WINDOW_START,
  windowEnd = WINDOW_END,
) {
  const dimensions = (sample: ReturnType<typeof providerSpec>) => ({
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
      INVOCATION_SOURCE_SHA256,
      windowStart,
      windowEnd,
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
      DURATION_SOURCE_SHA256,
      windowStart,
      windowEnd,
    ),
  };
}

function externalMetricEvidence(
  samples: ReturnType<typeof providerSpec>[],
  windowStart = WINDOW_START,
  windowEnd = WINDOW_END,
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
      deployment_id: DEPLOYMENT_ID,
      function_region: region,
      http_status: '200',
      origin_route: '/api/venues',
      request_hostname: SUPABASE_HOSTNAME,
      request_method: 'GET',
      request_path: '/rest/v1/venues',
      vercel_external_api_request_count_sum: count,
    },
    {
      deployment_id: DEPLOYMENT_ID,
      function_region: region,
      http_status: '200',
      origin_route: '/api/venues',
      request_hostname: SUPABASE_HOSTNAME,
      request_method: 'GET',
      request_path: '/rest/v1/weather_bucket_snapshots',
      vercel_external_api_request_count_sum: count,
    },
    {
      deployment_id: DEPLOYMENT_ID,
      function_region: region,
      http_status: '200',
      origin_route: '/api/venues',
      request_hostname: SUPABASE_HOSTNAME,
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
    EXTERNAL_SOURCE_SHA256,
    windowStart,
    windowEnd,
  );
}

function providerRequestEvidence(
  clients: ReturnType<typeof clientSample>[],
  source: 'serverless' | 'serverless-middleware' = 'serverless-middleware',
) {
  const evidence = clients.map((client) => ({
    envelope: {
      id: String(client.vercel_id).split('::').at(-1),
      timestamp: Date.parse(client.started_at_utc) + 100,
      deploymentId: DEPLOYMENT_ID,
      environment: 'production',
      source,
      requestMethod: 'GET',
      requestPath: '/api/venues',
      responseStatusCode: 200,
      cache: client.cache_status,
      logs: [],
    },
    source_sha256: requestSourceSha(client.probe_id),
    source_record: 1,
  }));
  return {
    evidence,
    sources: evidence.map((entry) => ({
      sha256: entry.source_sha256,
      envelope_count: 1,
      capture_limit: 10,
    })),
  };
}

function buildEvidenceReport({
  clients,
  samples,
  events,
  external,
  requestEvidence,
  minCold = samples.length,
  windowStart,
  windowEnd,
}: {
  clients: ReturnType<typeof clientSample>[];
  samples: ReturnType<typeof providerSpec>[];
  events: ReturnType<typeof runtimeEvents>;
  external?: ReturnType<typeof externalMetricEvidence>;
  requestEvidence?: ReturnType<typeof providerRequestEvidence>;
  minCold?: number;
  windowStart?: string;
  windowEnd?: string;
}) {
  const derivedWindowStart = windowStart ?? new Date(Math.min(
    ...clients.map((sample) => Date.parse(sample.started_at_utc)),
  )).toISOString();
  const derivedWindowEnd = windowEnd ?? new Date(Math.max(
    ...clients.map((sample) => Date.parse(sample.ended_at_utc)),
  )).toISOString();
  const externalEvidence = external ??
    externalMetricEvidence(samples, derivedWindowStart, derivedWindowEnd);
  const exactRequestEvidence = requestEvidence ?? providerRequestEvidence(clients);
  return buildLaunchReport({
    clientSamples: clients,
    runtimeEvents: events,
    providerRequestEvidence: exactRequestEvidence.evidence,
    providerRequestCaptureSources: exactRequestEvidence.sources,
    expectedDeploymentId: DEPLOYMENT_ID,
    expectedSupabaseHostname: SUPABASE_HOSTNAME,
    ...providerMetricEvidence(
      samples,
      derivedWindowStart,
      derivedWindowEnd,
    ),
    providerExternalEvidence: externalEvidence,
    minColdSamples: minCold,
    uncachedThresholdMs: 5_000,
  });
}

describe('venue probe final observability hardening', () => {
  test('requires one exact provenance-linked request envelope per client', () => {
    const origin = clientSample(canonicalProbeId('request-envelope-origin'));
    const edge = edgeLaneClients('request-envelope-edge');
    const clients = [origin, edge.prime, edge.repeat];
    const samples = [
      providerSpec(origin.probe_id, 'cold'),
      providerSpec(edge.prime.probe_id, 'hot'),
    ];
    const events = [
      ...runtimeEvents(origin.probe_id),
      ...runtimeEvents(edge.prime.probe_id),
    ];
    const exact = providerRequestEvidence(clients, 'serverless');
    (exact.evidence[0]!.envelope as Record<string, unknown>)
      .requestLogRegion = 'not-authoritative';
    const complete = buildEvidenceReport({
      clients,
      samples,
      events,
      requestEvidence: exact,
      minCold: 1,
    });
    expect(complete.acceptance).toMatchObject({
      passed: true,
      provider_request_evidence_complete: true,
      edge_provider_correlation_complete: true,
    });
    expect(complete.cohorts.edge_hit.n).toBe(1);

    const missing = structuredClone(exact);
    missing.evidence.pop();
    missing.sources.pop();
    const missingReport = buildEvidenceReport({
      clients,
      samples,
      events,
      requestEvidence: missing,
      minCold: 1,
    });
    expect(missingReport.acceptance).toMatchObject({
      passed: false,
      provider_request_evidence_complete: false,
      edge_provider_correlation_complete: false,
    });
    expect(missingReport.cohorts.edge_hit.n).toBe(0);
    expect(missingReport.errors).toContain(
      `${edge.repeat.probe_id} expected one request-id-scoped Vercel envelope; received 0.`,
    );

    const duplicate = structuredClone(exact);
    duplicate.evidence.push(structuredClone(duplicate.evidence[0]!));
    expect(buildEvidenceReport({
      clients,
      samples,
      events,
      requestEvidence: duplicate,
      minCold: 1,
    }).acceptance.provider_request_evidence_complete).toBe(false);

    const cacheMismatch = structuredClone(exact);
    cacheMismatch.evidence[0]!.envelope.cache = 'HIT';
    expect(buildEvidenceReport({
      clients,
      samples,
      events,
      requestEvidence: cacheMismatch,
      minCold: 1,
    }).errors).toContain(
      `${origin.probe_id} has a mismatched request-id-scoped Vercel envelope.`,
    );

    const timestampMismatch = structuredClone(exact);
    timestampMismatch.evidence[0]!.envelope.timestamp =
      Date.parse(origin.ended_at_utc) + PROVIDER_JOIN_CLOCK_SKEW_MS + 1;
    expect(buildEvidenceReport({
      clients,
      samples,
      events,
      requestEvidence: timestampMismatch,
      minCold: 1,
    }).errors).toContain(
      `${origin.probe_id} has a mismatched request-id-scoped Vercel envelope.`,
    );

    const truncated = structuredClone(exact);
    truncated.sources[0]!.envelope_count = 10;
    expect(buildEvidenceReport({
      clients,
      samples,
      events,
      requestEvidence: truncated,
      minCold: 1,
    }).errors).toContain(
      `Provider request evidence capture ${truncated.sources[0]!.sha256} hit its 10-record limit.`,
    );

    const extra = structuredClone(exact);
    const extraSha = 'f'.repeat(64);
    extra.evidence.push({
      envelope: {
        ...structuredClone(extra.evidence[0]!.envelope),
        id: 'unexpected-request-id',
      },
      source_sha256: extraSha,
      source_record: 1,
    });
    extra.sources.push({
      sha256: extraSha,
      envelope_count: 1,
      capture_limit: 10,
    });
    expect(buildEvidenceReport({
      clients,
      samples,
      events,
      requestEvidence: extra,
      minCold: 1,
    }).errors).toContain(
      'Provider request evidence contains an extra envelope unexpected-request-id.',
    );
  });

  test('deterministically derives provider samples from paired official metric documents', () => {
    const probeId = canonicalProbeId('raw-cold');
    const samples = [providerSpec(probeId)];
    const metrics = providerMetricEvidence(samples);
    const options = {
      invocationEvidence: metrics.providerInvocationEvidence,
      durationEvidence: metrics.providerDurationEvidence,
      expectedDeploymentId: DEPLOYMENT_ID,
      runtimeEvents: runtimeEvents(probeId),
      measurementWindow: {
        started_at_utc: WINDOW_START,
        ended_at_utc: WINDOW_END,
      },
    };

    const first = deriveVercelProviderSamples(options);
    const second = deriveVercelProviderSamples(options);

    expect(first).toEqual(second);
    expect(first.errors).toEqual([]);
    expect(first.samples).toHaveLength(1);
    expect(first.samples[0]).toMatchObject({
      probe_id: probeId,
      provider_request_id: `provider-${probeId}`,
      start_type: 'cold',
      region: 'dub1',
      function_duration_ms: 750,
      provider_provenance: {
        adapter: 'vercel-function-metrics-v1',
        invocation_source_sha256: INVOCATION_SOURCE_SHA256,
        duration_source_sha256: DURATION_SOURCE_SHA256,
      },
    });
    const provenance = first.samples[0]!.provider_provenance;
    expect(provenance.invocation_raw_document_sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(provenance.duration_raw_document_sha256).toMatch(/^[0-9a-f]{64}$/u);

    const changedMetrics = providerMetricEvidence(samples);
    changedMetrics.providerInvocationEvidence[0]!.document.data.push({
      timestamp: WINDOW_END,
    });
    const changed = deriveVercelProviderSamples({
      ...options,
      invocationEvidence: changedMetrics.providerInvocationEvidence,
    });
    expect(
      changed.samples[0]!.provider_provenance.invocation_raw_document_sha256,
    ).not.toBe(provenance.invocation_raw_document_sha256);
  });

  test('rejects metric documents with dimensions outside the sanctioned command', () => {
    const probeId = canonicalProbeId('extra-group');
    const samples = [providerSpec(probeId)];
    const metrics = providerMetricEvidence(samples);
    metrics.providerInvocationEvidence[0]!.document.query.groupBy.push(
      'request_path',
    );

    const result = deriveVercelProviderSamples({
      invocationEvidence: metrics.providerInvocationEvidence,
      durationEvidence: metrics.providerDurationEvidence,
      runtimeEvents: runtimeEvents(probeId),
      expectedDeploymentId: DEPLOYMENT_ID,
      measurementWindow: {
        started_at_utc: WINDOW_START,
        ended_at_utc: WINDOW_END,
      },
    });

    expect(result.samples).toEqual([]);
    expect(result.errors).toContain(
      'Provider invocation evidence is not an official production vercel.function_invocation.count query document.',
    );
  });

  test('rejects hand-authored start types that have no raw metric provenance', () => {
    const probeId = canonicalProbeId('hand-authored');
    const report = buildLaunchReport({
      clientSamples: [clientSample(probeId)],
      providerSamples: [{
        probe_id: probeId,
        provider_request_id: `provider-${probeId}`,
        start_type: 'cold',
      }],
      runtimeEvents: runtimeEvents(probeId),
      expectedDeploymentId: DEPLOYMENT_ID,
      expectedSupabaseHostname: SUPABASE_HOSTNAME,
      minColdSamples: 1,
      uncachedThresholdMs: 5_000,
    });

    expect(report.acceptance.provider_join_complete).toBe(false);
    expect(report.errors).toContain(
      'Hand-authored provider classification rows are forbidden; supply raw Vercel records.',
    );
  });

  test('allows organic same-route counts but requires every exact path per region', () => {
    const dubId = canonicalProbeId('dub-cold');
    const iadId = canonicalProbeId('iad-cold');
    const samples = [
      providerSpec(dubId, 'cold', 'dub1'),
      providerSpec(iadId, 'cold', 'iad1'),
    ];
    const clients = [clientSample(dubId), clientSample(iadId)];
    const events = [
      ...runtimeEvents(dubId, 'dub1'),
      ...runtimeEvents(iadId, 'iad1'),
    ];

    const complete = buildEvidenceReport({ clients, samples, events });
    expect(complete.acceptance.external_provider_complete).toBe(true);
    expect(complete.raw_counts.provider_external_requests).toBe(6);

    const missing = buildEvidenceReport({
      clients,
      samples,
      events,
      external: externalMetricEvidence([samples[0]!]),
    });
    expect(missing.acceptance.external_provider_complete).toBe(false);
    expect(missing.errors).toContain(
      'Provider external evidence is missing accepted region iad1.',
    );

    const organicTraffic = externalMetricEvidence(samples);
    organicTraffic[0]!.document.summary[0]!
      .vercel_external_api_request_count_sum = 3;
    const organicReport = buildEvidenceReport({
      clients,
      samples,
      events,
      external: organicTraffic,
    });
    expect(organicReport.acceptance.external_provider_complete).toBe(true);
    expect(organicReport.raw_counts.provider_external_requests).toBe(8);

    const insufficient = externalMetricEvidence(samples);
    insufficient[0]!.document.summary[0]!
      .vercel_external_api_request_count_sum = 0;
    const insufficientReport = buildEvidenceReport({
      clients,
      samples,
      events,
      external: insufficient,
    });
    expect(insufficientReport.acceptance.external_provider_complete).toBe(false);
    expect(insufficientReport.errors).toContain(
      'Provider external evidence for dub1 expected at least 1 GET /rest/v1/venues calls; received 0.',
    );
  });

  test('rejects duplicate logical region rows and self-declared completeness', () => {
    const probeId = canonicalProbeId('external-duplicate');
    const samples = [providerSpec(probeId)];
    const clients = [clientSample(probeId)];
    const events = runtimeEvents(probeId);
    const duplicate = externalMetricEvidence(samples);
    duplicate[0]!.document.summary.push({
      ...duplicate[0]!.document.summary[0]!,
      request_method: 'get',
    });

    const duplicateReport = buildEvidenceReport({
      clients,
      samples,
      events,
      external: duplicate,
    });
    expect(duplicateReport.acceptance.external_provider_complete).toBe(false);
    expect(duplicateReport.errors).toContain(
      'Provider external evidence contains duplicate region dub1 path /rest/v1/venues.',
    );

    const selfDeclared = [{
      deployment_id: DEPLOYMENT_ID,
      region: 'dub1',
      hostname: SUPABASE_HOSTNAME,
      request_count: 3,
      complete_export: true,
    }] as unknown as ReturnType<typeof externalMetricEvidence>;
    const selfDeclaredReport = buildEvidenceReport({
      clients,
      samples,
      events,
      external: selfDeclared,
    });
    expect(selfDeclaredReport.acceptance.external_provider_complete).toBe(false);
    expect(selfDeclaredReport.errors).toContain(
      'Provider external evidence has an invalid raw-document provenance wrapper.',
    );
  });

  test('joins each provider classification only to its matching client interval', () => {
    const firstId = canonicalProbeId('interval-first');
    const secondId = canonicalProbeId('interval-second');
    const firstClient = clientSample(
      firstId,
      WINDOW_START,
      '2026-08-18T09:00:01.000Z',
    );
    const secondClient = clientSample(
      secondId,
      '2026-08-18T09:04:00.000Z',
      '2026-08-18T09:05:00.000Z',
    );
    const samples = [providerSpec(firstId), providerSpec(secondId)];
    const outsideFirstInterval = '2026-08-18T09:03:00.000Z';
    const events = [
      ...runtimeEvents(firstId, 'dub1', outsideFirstInterval),
      ...runtimeEvents(secondId, 'dub1', '2026-08-18T09:04:30.000Z'),
    ];

    const report = buildEvidenceReport({
      clients: [firstClient, secondClient],
      samples,
      events,
      external: externalMetricEvidence(
        [samples[1]!],
        WINDOW_START,
        '2026-08-18T09:05:00.000Z',
      ),
      minCold: 1,
    });

    expect(report.acceptance.provider_join_complete).toBe(false);
    expect(report.cohorts.cold.n).toBe(1);
    expect(report.errors).toContain(
      `${firstId} is outside its matching client interval (±2000 ms).`,
    );
  });

  test('joins each runtime dependency only to its matching client interval', () => {
    const firstId = canonicalProbeId('runtime-first');
    const secondId = canonicalProbeId('runtime-second');
    const firstClient = clientSample(
      firstId,
      WINDOW_START,
      '2026-08-18T09:00:01.000Z',
    );
    const secondClient = clientSample(
      secondId,
      '2026-08-18T09:04:00.000Z',
      '2026-08-18T09:05:00.000Z',
    );
    const samples = [providerSpec(firstId), providerSpec(secondId)];
    const firstEvents = runtimeEvents(
      firstId,
      'dub1',
      '2026-08-18T09:00:00.500Z',
    );
    for (const event of firstEvents) {
      if (event.event === 'external_dependency') {
        event.timestamp_utc = '2026-08-18T09:03:00.000Z';
      }
    }
    const events = [
      ...firstEvents,
      ...runtimeEvents(secondId, 'dub1', '2026-08-18T09:04:30.000Z'),
    ];

    const report = buildEvidenceReport({
      clients: [firstClient, secondClient],
      samples,
      events,
      minCold: 2,
    });

    expect(report.acceptance.provider_join_complete).toBe(true);
    expect(report.acceptance.dependency_attribution_complete).toBe(false);
    expect(report.cohorts.cold.n).toBe(2);
    expect(report.errors).toContain(
      `${firstId} expected one venue_list dependency; received 0.`,
    );
  });
  test('allows two seconds of clock skew and rejects client URL/query leakage', () => {
    const probeId = canonicalProbeId('skew-allowed');
    const startedAt = WINDOW_START;
    const endedAt = '2026-08-18T09:00:01.000Z';
    const withinSkew = '2026-08-18T08:59:58.500Z';
    const client = clientSample(probeId, startedAt, endedAt);
    const edge = edgeLaneClients('skew-edge');
    const samples = [
      providerSpec(probeId),
      providerSpec(edge.prime.probe_id, 'hot'),
    ];
    const events = [
      ...runtimeEvents(probeId, 'dub1', withinSkew),
      ...runtimeEvents(edge.prime.probe_id),
    ];
    const safe = buildEvidenceReport({
      clients: [client, edge.prime, edge.repeat],
      samples,
      events,
      external: externalMetricEvidence(samples, startedAt, endedAt),
      minCold: 1,
      windowStart: startedAt,
      windowEnd: endedAt,
    });

    expect(PROVIDER_JOIN_CLOCK_SKEW_MS).toBe(2_000);
    expect(safe.acceptance).toMatchObject({
      passed: true,
      provider_join_clock_skew_ms: 2_000,
    });

    const leakyClient = {
      ...client,
      request_path: '/api/venues?lat=57.7089&lng=11.9746&radiusKm=3',
      headers: { authorization: 'must-never-be-recorded' },
    };
    const rejected = buildEvidenceReport({
      clients: [leakyClient, edge.prime, edge.repeat],
      samples,
      events,
      external: externalMetricEvidence(samples, startedAt, endedAt),
      minCold: 1,
      windowStart: startedAt,
      windowEnd: endedAt,
    });
    expect(rejected.acceptance.correctness).toBe(false);
    expect(rejected.errors).toContain(
      `${probeId} has an invalid cohort/cache mapping or non-allowlisted client field.`,
    );
  });

  test('rejects self-asserted correctness, incomplete response evidence, and understated time', () => {
    const probeId = canonicalProbeId('client-proof');
    const client = clientSample(probeId);
    const samples = [providerSpec(probeId)];
    const events = runtimeEvents(probeId);

    const selfAsserted = {
      ...client,
      validation: { passed: true },
    } as unknown as ReturnType<typeof clientSample>;
    const selfAssertedReport = buildEvidenceReport({
      clients: [selfAsserted],
      samples,
      events,
    });
    expect(selfAssertedReport.errors).toContain(
      `${probeId} failed HTTP or payload correctness.`,
    );

    const incomplete = {
      ...client,
      response_body_sha256: null,
    } as unknown as ReturnType<typeof clientSample>;
    const incompleteReport = buildEvidenceReport({
      clients: [incomplete],
      samples,
      events,
    });
    expect(incompleteReport.errors).toContain(
      `${probeId} lacks complete raw response evidence.`,
    );

    const understated = {
      ...client,
      ended_at_utc: '2026-08-18T09:00:01.000Z',
      total_ms: 125,
    };
    const understatedReport = buildEvidenceReport({
      clients: [understated],
      samples,
      events,
    });
    expect(understatedReport.errors).toContain(
      `${probeId} has invalid client timing or UTC bounds.`,
    );
  });

  test('rejects aggregate invocation rows that cannot prove one unique probe', () => {
    const probeId = canonicalProbeId('aggregate-cold');
    const samples = [providerSpec(probeId)];
    const metrics = providerMetricEvidence(samples);
    metrics.providerInvocationEvidence[0]!.document.summary[0]!
      .vercel_function_invocation_count_sum = 2;

    const result = deriveVercelProviderSamples({
      invocationEvidence: metrics.providerInvocationEvidence,
      durationEvidence: metrics.providerDurationEvidence,
      runtimeEvents: runtimeEvents(probeId),
      expectedDeploymentId: DEPLOYMENT_ID,
      measurementWindow: {
        started_at_utc: WINDOW_START,
        ended_at_utc: WINDOW_END,
      },
    });

    expect(result.samples).toEqual([]);
    expect(result.errors).toContain(
      `${probeId} has invalid raw provider invocation data.`,
    );
  });
  test('defines a fixed opaque probe grammar', () => {
    const canonical = canonicalProbeId('grammar');
    expect(isCanonicalProbeId(canonical)).toBe(true);
    expect(isCanonicalProbeId('lr-readable-session-origin-001')).toBe(false);
    expect(isCanonicalProbeId(`${canonical}?lat=57.7`)).toBe(false);
  });

  test('pins exact Vercel CLI 59.1.3 evidence commands and rejects plan drift', () => {
    const measurementWindow = {
      started_at_utc: WINDOW_START,
      ended_at_utc: WINDOW_END,
    };
    const edge = edgeLaneClients('plan-edge');
    const clients = [clientSample(canonicalProbeId('plan-origin')), edge.prime, edge.repeat];
    const plan = buildVercelEvidencePlan({
      deploymentId: DEPLOYMENT_ID,
      measurementWindow,
      clientSamples: clients,
    });

    expect(plan).toMatchObject({
      schema_version: 1,
      provider: 'vercel',
      cli: { package: 'vercel', version: '59.1.3' },
      deployment_id: DEPLOYMENT_ID,
      environment: 'production',
      measurement_window: measurementWindow,
    });
    expect(plan.integrity_scope).toMatch(/tamper evidence/iu);
    expect(plan.integrity_scope).toMatch(/does not authenticate/iu);

    const byId = new Map(
      plan.exports.map((entry) => [entry.id, entry] as const),
    );
    for (const id of [
      'provider_count',
      'provider_duration',
      'provider_external',
    ]) {
      const argv = byId.get(id)!.argv;
      expect(argv.slice(0, 3)).toEqual(['npx', '--yes', 'vercel@59.1.3']);
      expect(argv).toContain('--limit');
      expect(argv[argv.indexOf('--limit') + 1]).toBe('500');
      expect(argv).toContain('--granularity');
      expect(argv[argv.indexOf('--granularity') + 1]).toBe('5m');
      expect(argv).toContain('--since');
      expect(argv[argv.indexOf('--since') + 1]).toBe(WINDOW_START);
      expect(argv).toContain('--until');
      expect(argv[argv.indexOf('--until') + 1]).toBe(WINDOW_END);
      expect(argv).toContain(`deployment_id eq '${DEPLOYMENT_ID}'`);
    }
    expect(byId.get('provider_count')!.argv).toContain(
      "route eq '/api/venues'",
    );
    expect(byId.get('provider_external')!.argv).toContain(
      "origin_route eq '/api/venues'",
    );
    expect(byId.get('provider_external')!.argv).toContain('request_path');

    const requestExports = plan.exports.filter((entry) =>
      entry.id.startsWith('request_log_'),
    );
    expect(requestExports).toHaveLength(clients.length);
    for (const [index, entry] of requestExports.entries()) {
      expect(entry.argv.slice(0, 3)).toEqual([
        'npx', '--yes', 'vercel@59.1.3',
      ]);
      expect(entry.argv).toContain(DEPLOYMENT_ID);
      expect(entry.argv).toContain('--request-id');
      expect(entry.argv[entry.argv.indexOf('--request-id') + 1]).toBe(
        String(clients[index]!.vercel_id).split('::').at(-1),
      );
      expect(entry.argv[entry.argv.indexOf('--limit') + 1]).toBe('10');
      expect(entry.argv).not.toContain('--source');
      expect(entry).toMatchObject({
        probe_id: clients[index]!.probe_id,
        expected_envelope_count: 1,
      });
    }
    expect(byId.has('runtime')).toBe(false);

    expect(validateVercelEvidencePlan(plan, {
      deploymentId: DEPLOYMENT_ID,
      measurementWindow,
      clientSamples: clients,
    })).toEqual([]);
    const drifted = structuredClone(plan);
    const countArgv = drifted.exports[0]!.argv;
    countArgv[countArgv.indexOf('--limit') + 1] = '10';
    expect(validateVercelEvidencePlan(drifted, {
      deploymentId: DEPLOYMENT_ID,
      measurementWindow,
      clientSamples: clients,
    })).toContain(
      'Provider evidence plan does not match the sanctioned Vercel CLI 59.1.3 commands.',
    );
  });
  test('requires one edge prime MISS followed by at least one repeat HIT', () => {
    const originId = canonicalProbeId('edge-lane-origin');
    const edge = edgeLaneClients('edge-lane');
    const samples = [
      providerSpec(originId, 'cold'),
      providerSpec(edge.prime.probe_id, 'hot'),
    ];
    const events = [
      ...runtimeEvents(originId),
      ...runtimeEvents(edge.prime.probe_id),
    ];
    const complete = buildEvidenceReport({
      clients: [clientSample(originId), edge.prime, edge.repeat],
      samples,
      events,
      minCold: 1,
    });
    expect(complete.acceptance).toMatchObject({
      passed: true,
      edge_cache_lane_complete: true,
    });

    const missingRepeat = buildEvidenceReport({
      clients: [clientSample(originId), edge.prime],
      samples,
      events,
      minCold: 1,
    });
    expect(missingRepeat.acceptance.edge_cache_lane_complete).toBe(false);
    expect(missingRepeat.errors).toContain(
      'Edge cache lane requires exactly one prime MISS followed by at least one repeat HIT for the same session.',
    );
  });

  test('rejects extra provider metric filters outside the sanctioned command', () => {
    const probeId = canonicalProbeId('extra-filter');
    const samples = [providerSpec(probeId)];
    const metrics = providerMetricEvidence(samples);
    metrics.providerInvocationEvidence[0]!.document.query.filter +=
      " and (request_path eq '/api/venues')";

    const result = deriveVercelProviderSamples({
      invocationEvidence: metrics.providerInvocationEvidence,
      durationEvidence: metrics.providerDurationEvidence,
      runtimeEvents: runtimeEvents(probeId),
      expectedDeploymentId: DEPLOYMENT_ID,
      measurementWindow: {
        started_at_utc: WINDOW_START,
        ended_at_utc: WINDOW_END,
      },
    });
    expect(result.samples).toEqual([]);
    expect(result.errors).toContain(
      'Provider invocation evidence is not an official production vercel.function_invocation.count query document.',
    );
  });

  test('rejects readable or malformed client probe IDs', () => {
    const readableId = 'lr-readable-session-origin-001';
    const samples = [providerSpec(readableId)];
    const report = buildEvidenceReport({
      clients: [clientSample(readableId)],
      samples,
      events: runtimeEvents(readableId),
      minCold: 1,
    });
    expect(report.acceptance.correctness).toBe(false);
    expect(report.errors).toContain(
      `${readableId} does not match the canonical opaque probe grammar.`,
    );
  });
});
