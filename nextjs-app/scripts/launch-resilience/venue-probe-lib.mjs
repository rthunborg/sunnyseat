import { createHash } from 'node:crypto';

const EXPECTED_VENUE_COUNT = 42;
const EXPECTED_SERIES_COUNT = 61;
const FIRST_SERIES_MINUTE = 360;
const SERIES_INTERVAL_MINUTES = 15;
export const PROVIDER_JOIN_CLOCK_SKEW_MS = 2_000;
export const VERCEL_CLI_VERSION = '59.1.3';

const REQUEST_ROUTE = '/api/venues';
const CANONICAL_SESSION_ID = /^lr-\d{8}t\d{6}z-[0-9a-f]{8}$/u;
const CANONICAL_PROBE_ID = /^(lr-\d{8}t\d{6}z-[0-9a-f]{8})-(origin|edge-prime|edge)-(\d{3})$/u;
const CANONICAL_DEPLOYMENT_ID = /^dpl_[A-Za-z0-9_-]{1,128}$/u;
const VERCEL_ENVIRONMENTS = new Set(['production', 'preview']);
const REQUEST_COHORTS = new Set(['origin', 'edge-prime', 'edge-repeat']);
const CLIENT_TIMING_TOLERANCE_MS = 250;
const CLIENT_SAMPLE_FIELDS = new Set([
  'schema_version',
  'sequence',
  'probe_id',
  'deployment_id',
  'environment',
  'requested_cohort',
  'request_route',
  'started_at_utc',
  'ended_at_utc',
  'http_status',
  'cache_status',
  'response_request_id',
  'response_deployment_id',
  'vercel_id',
  'edge_region_hint',
  'function_region_hint',
  'ttfb_ms',
  'total_ms',
  'content_encoding',
  'response_body_bytes',
  'response_body_sha256',
  'parse_error',
  'validation',
]);
const VALIDATION_FIELDS = new Set([
  'passed',
  'venue_count',
  'unique_id_count',
  'unique_slug_count',
  'series_count_min',
  'series_count_max',
  'exact_series_steps',
  'exact_series_values',
]);
const LAUNCH_PROBE_USER_AGENT =
  /^SunnySeatLaunchProbe\/2 (lr-\d{8}t\d{6}z-[0-9a-f]{8}-(?:origin|edge-prime|edge)-\d{3})$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const INVOCATION_METRIC = 'vercel.function_invocation.count';
const DURATION_METRIC = 'vercel.function_invocation.function_duration_ms';
const EXTERNAL_METRIC = 'vercel.external_api_request.count';
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
const METRIC_EXPORT_LIMIT = 500;

const EXPECTED_DEPENDENCIES = new Map([
  ['venue_list', { path: '/rest/v1/venues', method: 'GET' }],
  [
    'sun_geometry_batch',
    {
      path: '/rest/v1/rpc/read_current_venue_sun_geometry_batch',
      method: 'POST',
    },
  ],
  [
    'weather_batch',
    { path: '/rest/v1/weather_bucket_snapshots', method: 'GET' },
  ],
]);

const PROVIDER_START_TYPES = new Set(['cold', 'prewarmed', 'hot']);
const VENUE_SUN_STATUSES = new Set([
  'Sunny', 'Partial', 'Shaded', 'NoSun', 'CloudObscured',
]);
const WEATHER_GATE_STATES = new Set([
  'gated', 'not_gated', 'unknown',
]);
const RUNTIME_EVENT_TYPES = new Set([
  'api_request_complete',
  'external_dependency',
  'external_dependency_unattributed',
]);
const REQUEST_LOG_CAPTURE_LIMIT = 10;
const REQUEST_LOG_SOURCES = new Set(['serverless', 'serverless-middleware']);

/**
 * @typedef {Object} MetricDocumentEvidence
 * @property {Record<string, unknown>} document
 * @property {string} source_sha256
 * @property {number} [source_line]
 */

export function isCanonicalSessionId(value) {
  return typeof value === 'string' && CANONICAL_SESSION_ID.test(value);
}

export function isCanonicalProbeId(value) {
  return typeof value === 'string' && CANONICAL_PROBE_ID.test(value);
}

function isCanonicalDeploymentId(value) {
  return typeof value === 'string' && CANONICAL_DEPLOYMENT_ID.test(value);
}

function metricExport({
  id,
  outputFile,
  metric,
  aggregation,
  routeDimension,
  groupBy,
  deploymentId,
  measurementWindow,
  environment,
}) {
  const argv = [
    'npx',
    '--yes',
    `vercel@${VERCEL_CLI_VERSION}`,
    'metrics',
    metric,
    '--aggregation',
    aggregation,
  ];
  if (environment === 'production') argv.push('--prod');
  argv.push(
    '--filter',
    `deployment_id eq '${deploymentId}'`,
    '--filter',
    `${routeDimension} eq '${REQUEST_ROUTE}'`,
    '--filter',
    `environment eq '${environment}'`,
  );
  for (const dimension of groupBy) {
    argv.push('--group-by', dimension);
  }
  argv.push(
    '--since',
    measurementWindow.started_at_utc,
    '--until',
    measurementWindow.ended_at_utc,
    '--granularity',
    '5m',
    '--limit',
    String(METRIC_EXPORT_LIMIT),
    '--order-by',
    'count',
    '--order',
    'desc',
    '--json',
  );
  return { id, stdout_file: outputFile, argv };
}

function vercelRequestIdSuffix(value) {
  if (typeof value !== 'string') return null;
  const suffix = value.split('::').filter(Boolean).at(-1);
  return suffix && /^[A-Za-z0-9_-]{1,256}$/u.test(suffix) ? suffix : null;
}

function requestLogExports(clientSamples, deploymentId, environment) {
  if (!Array.isArray(clientSamples) || clientSamples.length === 0) {
    throw new Error(
      'Cannot build a provider evidence plan without the collected client samples.',
    );
  }
  const seenProbeIds = new Set();
  const seenRequestIds = new Set();
  return clientSamples.map((sample, index) => {
    const probeId = typeof sample?.probe_id === 'string' ? sample.probe_id : '';
    const requestId = vercelRequestIdSuffix(sample?.vercel_id);
    if (
      !isCanonicalProbeId(probeId) ||
      seenProbeIds.has(probeId) ||
      !requestId ||
      seenRequestIds.has(requestId)
    ) {
      throw new Error(
        'Every client sample must have one unique canonical probe id and x-vercel-id request suffix.',
      );
    }
    seenProbeIds.add(probeId);
    seenRequestIds.add(requestId);
    const ordinal = String(index + 1).padStart(3, '0');
    return {
      id: `request_log_${ordinal}`,
      stdout_file: `request-log-${ordinal}.jsonl`,
      probe_id: probeId,
      request_id_suffix: requestId,
      expected_cache_status: String(sample.cache_status).toUpperCase(),
      expected_envelope_count: 1,
      capture_limit: REQUEST_LOG_CAPTURE_LIMIT,
      argv: [
        'npx', '--yes', `vercel@${VERCEL_CLI_VERSION}`,
        'logs', deploymentId,
        '--environment', environment,
        '--request-id', requestId,
        '--limit', String(REQUEST_LOG_CAPTURE_LIMIT),
        '--json',
      ],
    };
  });
}

export function buildVercelEvidencePlan({
  deploymentId,
  measurementWindow,
  clientSamples,
  environment = 'production',
}) {
  const startedAt = normalizedUtcTimestamp(
    measurementWindow?.started_at_utc,
  );
  const endedAt = normalizedUtcTimestamp(measurementWindow?.ended_at_utc);
  if (
    !isCanonicalDeploymentId(deploymentId) ||
    !startedAt ||
    !endedAt ||
    Date.parse(startedAt) > Date.parse(endedAt) ||
    !VERCEL_ENVIRONMENTS.has(environment)
  ) {
    throw new Error('Cannot build a provider evidence plan without a canonical deployment id, environment, and UTC window.');
  }
  const exactWindow = {
    started_at_utc: startedAt,
    ended_at_utc: endedAt,
  };
  return {
    schema_version: 1,
    provider: 'vercel',
    cli: { package: 'vercel', version: VERCEL_CLI_VERSION },
    deployment_id: deploymentId,
    environment,
    measurement_window: exactWindow,
    integrity_scope:
      'SHA-256 hashes recorded by this lane are local tamper evidence for the captured byte streams. This local hash record does not authenticate provider origin or prove that a provider export is complete.',
    capture_instructions:
      'Run every argv array exactly from the linked SunnySeat Vercel project and capture stdout byte-for-byte in its stdout_file beside this plan. Each request_log export is the request-id-scoped capture for exactly one client sample. Do not hand-edit provider output.',
    exports: [
      metricExport({
        id: 'provider_count',
        outputFile: 'function-invocation-count.json',
        metric: INVOCATION_METRIC,
        aggregation: 'sum',
        routeDimension: 'route',
        groupBy: PROVIDER_GROUP_BY,
        deploymentId,
        measurementWindow: exactWindow,
        environment,
      }),
      metricExport({
        id: 'provider_duration',
        outputFile: 'function-duration.json',
        metric: DURATION_METRIC,
        aggregation: 'avg',
        routeDimension: 'route',
        groupBy: PROVIDER_GROUP_BY,
        deploymentId,
        measurementWindow: exactWindow,
        environment,
      }),
      metricExport({
        id: 'provider_external',
        outputFile: 'external-api-request-count.json',
        metric: EXTERNAL_METRIC,
        aggregation: 'sum',
        routeDimension: 'origin_route',
        groupBy: EXTERNAL_GROUP_BY,
        deploymentId,
        measurementWindow: exactWindow,
        environment,
      }),
      ...requestLogExports(clientSamples, deploymentId, environment),
    ],
  };
}

export function validateVercelEvidencePlan(plan, options) {
  let expected;
  try {
    expected = buildVercelEvidencePlan(options);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
  return sha256Canonical(plan) === sha256Canonical(expected)
    ? []
    : [
        `Provider evidence plan does not match the sanctioned Vercel CLI ${VERCEL_CLI_VERSION} commands.`,
      ];
}
export function parseJsonLines(text, sourceName = 'input') {
  const rows = [];
  const lines = text.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    try {
      rows.push(JSON.parse(line));
    } catch {
      throw new Error(
        `${sourceName} line ${index + 1} is not valid JSON.`,
      );
    }
  }
  return rows;
}

export function requestLogEvidenceFromJsonLines(
  text,
  sourceName = 'request-log.jsonl',
) {
  const envelopes = parseJsonLines(text, sourceName);
  const sourceSha256 = createHash('sha256').update(text).digest('hex');
  return {
    evidence: envelopes.map((envelope, index) => ({
      envelope,
      source_sha256: sourceSha256,
      source_record: index + 1,
    })),
    source: {
      sha256: sourceSha256,
      bytes: Buffer.byteLength(text),
      envelope_count: envelopes.length,
      capture_limit: REQUEST_LOG_CAPTURE_LIMIT,
    },
  };
}

function normalizedUtcTimestamp(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const milliseconds = new Date(value).getTime();
  if (!Number.isFinite(milliseconds)) return undefined;
  return new Date(milliseconds).toISOString();
}

export function normalizeRuntimeEvents(entries, { environment = 'production' } = {}) {
  const events = [];
  if (!VERCEL_ENVIRONMENTS.has(environment)) return events;
  for (const entry of entries) {
    const envelope =
      entry &&
      typeof entry === 'object' &&
      entry.envelope &&
      typeof entry.envelope === 'object'
        ? entry.envelope
        : null;
    const sourceSha256 =
      entry && typeof entry === 'object' ? entry.source_sha256 : undefined;
    const sourceRecord =
      entry && typeof entry === 'object' ? entry.source_record : undefined;
    const timestampUtc = normalizedUtcTimestamp(envelope?.timestamp);
    if (
      !envelope ||
      typeof envelope.id !== 'string' ||
      envelope.id.length === 0 ||
      typeof envelope.deploymentId !== 'string' ||
      envelope.deploymentId.length === 0 ||
      envelope.environment !== environment ||
      !REQUEST_LOG_SOURCES.has(envelope.source) ||
      envelope.requestMethod !== 'GET' ||
      envelope.requestPath !== REQUEST_ROUTE ||
      envelope.responseStatusCode !== 200 ||
      !timestampUtc ||
      !SHA256.test(String(sourceSha256 ?? '')) ||
      !Number.isInteger(sourceRecord) ||
      sourceRecord < 1 ||
      !Array.isArray(envelope.logs)
    ) {
      continue;
    }

    for (const [logIndex, log] of envelope.logs.entries()) {
      if (
        !log ||
        typeof log !== 'object' ||
        typeof log.message !== 'string' ||
        log.messageTruncated === true
      ) {
        continue;
      }
      let candidate;
      try {
        candidate = JSON.parse(log.message);
      } catch {
        continue;
      }
      if (
        !candidate ||
        typeof candidate !== 'object' ||
        !RUNTIME_EVENT_TYPES.has(candidate.event) ||
        typeof candidate.request_id !== 'string'
      ) {
        continue;
      }
      events.push({
        ...candidate,
        deployment_id: envelope.deploymentId,
        environment: envelope.environment,
        provider_request_id: envelope.id,
        timestamp_utc: timestampUtc,
        runtime_provenance: {
          adapter: 'vercel-cli-request-logs-v1',
          source_sha256: sourceSha256,
          source_record: sourceRecord,
          log_index: logIndex + 1,
          ...(typeof entry.capture_id === 'string'
            ? { capture_id: entry.capture_id }
            : {}),
        },
      });
    }
  }
  return events;
}

/** @param {unknown} value @returns {string} */
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  const record = /** @type {Record<string, unknown>} */ (value);
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`;
}

function sha256Canonical(value) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function normalizedQueryFilter(value) {
  return typeof value === 'string'
    ? value.replace(/\s+/gu, ' ').trim().toLowerCase()
    : '';
}

function hasExactFilterClauses(value, requiredClauses) {
  const clauses = normalizedQueryFilter(value)
    .split(/\s+and\s+/u)
    .map((clause) =>
      clause.startsWith('(') && clause.endsWith(')')
        ? clause.slice(1, -1).trim()
        : clause,
    );
  const expected = requiredClauses.map((clause) =>
    normalizedQueryFilter(clause),
  );
  return (
    clauses.length === expected.length &&
    new Set(clauses).size === clauses.length &&
    expected.every((clause) => clauses.includes(clause))
  );
}
function queryWindow(query) {
  const startedAt = normalizedUtcTimestamp(
    query.startTime ?? query.start_time ?? query.since,
  );
  const endedAt = normalizedUtcTimestamp(
    query.endTime ?? query.end_time ?? query.until,
  );
  return startedAt && endedAt
    ? { started_at_utc: startedAt, ended_at_utc: endedAt }
    : null;
}

function dimensionValue(row, name) {
  if (row[name] !== undefined) return row[name];
  const dimensions = row.dimensions;
  return dimensions && typeof dimensions === 'object'
    ? dimensions[name]
    : undefined;
}

function numericMetricValue(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (finiteNumber(value)) return value;
  }
  return null;
}

function metricRows({
  evidence,
  expectedMetric,
  expectedAggregation,
  requiredGroupBy,
  measurementWindow,
  requiredFilterClauses,
  evidenceLabel,
}) {
  const rows = [];
  const errors = [];
  let rawDocuments = 0;
  let rawSummaryRows = 0;

  for (const entry of evidence) {
    rawDocuments += 1;
    const document = entry?.document;
    const sourceSha256 = entry?.source_sha256;
    if (
      !document ||
      typeof document !== 'object' ||
      !SHA256.test(String(sourceSha256 ?? ''))
    ) {
      errors.push(`${evidenceLabel} has an invalid raw-document provenance wrapper.`);
      continue;
    }
    const query = document.query;
    const summary = document.summary;
    const granularity = query?.granularity;
    const groupBy = Array.isArray(query?.groupBy) ? query.groupBy : [];
    const queryLimit = Number(query?.limit);
    const queryIsExact =
      query &&
      typeof query === 'object' &&
      query.metric === expectedMetric &&
      query.aggregation === expectedAggregation &&
      hasExactFilterClauses(query.filter, requiredFilterClauses) &&
      granularity &&
      typeof granularity === 'object' &&
      granularity.minutes === 5 &&
      queryLimit === METRIC_EXPORT_LIMIT &&
      query.orderBy === 'count' &&
      query.orderDirection === 'desc' &&
      groupBy.length === requiredGroupBy.length &&
      requiredGroupBy.every((dimension) => groupBy.includes(dimension));
    if (
      !queryIsExact ||
      !Array.isArray(summary) ||
      !Array.isArray(document.data)
    ) {
      errors.push(
        `${evidenceLabel} is not an official production ${expectedMetric} query document.`,
      );
      continue;
    }
    if (
      summary.length >= METRIC_EXPORT_LIMIT &&
      !metricDocumentDeclaresComplete(document)
    ) {
      errors.push(
        `${evidenceLabel} reached the ${METRIC_EXPORT_LIMIT}-row export limit without explicit non-truncated pagination metadata.`,
      );
      continue;
    }
    const window = queryWindow(query);
    if (
      measurementWindow &&
      (window?.started_at_utc !== measurementWindow.started_at_utc ||
        window?.ended_at_utc !== measurementWindow.ended_at_utc)
    ) {
      errors.push(`${evidenceLabel} does not cover the exact client measurement window.`);
      continue;
    }
    const documentSha256 = sha256Canonical(document);
    for (const row of summary) {
      rawSummaryRows += 1;
      if (!row || typeof row !== 'object') {
        errors.push(`${evidenceLabel} contains a non-object summary row.`);
        continue;
      }
      rows.push({
        row,
        provenance: {
          source_sha256: sourceSha256,
          raw_document_sha256: documentSha256,
          ...(Number.isSafeInteger(entry.source_line)
            ? { source_line: entry.source_line }
            : {}),
        },
      });
    }
  }

  if (evidence.length === 0) errors.push(`${evidenceLabel} is missing.`);
  return { rows, errors, rawDocuments, rawSummaryRows };
}

function metricDocumentDeclaresComplete(document) {
  const pagination = document.pagination;
  if (pagination && typeof pagination === 'object') {
    const next =
      pagination.next ??
      pagination.nextCursor ??
      pagination.nextPage ??
      pagination.cursor;
    const hasMore =
      pagination.hasMore ??
      pagination.has_more ??
      pagination.more;
    return (
      (hasMore === false || hasMore === 0) &&
      (next === null || next === undefined || next === '')
    );
  }
  const meta = document.meta ?? document.metadata;
  if (meta && typeof meta === 'object') {
    if (meta.truncated === false || meta.is_truncated === false) return true;
  }
  if (document.truncated === false || document.is_truncated === false) return true;
  return false;
}

function validRuntimeProvenance(value) {
  return (
    value &&
    typeof value === 'object' &&
    value.adapter === 'vercel-cli-request-logs-v1' &&
    SHA256.test(String(value.source_sha256 ?? '')) &&
    Number.isSafeInteger(value.source_record) &&
    value.source_record >= 1 &&
    Number.isSafeInteger(value.log_index) &&
    value.log_index >= 1
  );
}
function providerDimensionKey(row) {
  return PROVIDER_GROUP_BY
    .map((dimension) => String(dimensionValue(row, dimension) ?? ''))
    .join('\u001f');
}

/**
 * Deterministically derives per-invocation provider samples from paired raw
 * Vercel metric exports. A unique probe user-agent with invocation count one
 * makes the matching duration average an exact sample, never an estimate.
 *
 * @param {{
 *   invocationEvidence: MetricDocumentEvidence[],
 *   durationEvidence: MetricDocumentEvidence[],
 *   expectedDeploymentId: string,
 *   expectedEnvironment?: 'production' | 'preview',
 *   runtimeEvents: Array<Record<string, unknown>>,
 *   measurementWindow?: {
 *     started_at_utc: string,
 *     ended_at_utc: string,
 *   } | null,
 * }} options
 */
export function deriveVercelProviderSamples({
  invocationEvidence,
  expectedDeploymentId,
  expectedEnvironment = 'production',
  durationEvidence,
  runtimeEvents,
  measurementWindow = null,
}) {
  if (!VERCEL_ENVIRONMENTS.has(expectedEnvironment)) {
    return {
      samples: [],
      errors: [`Unsupported Vercel environment: ${expectedEnvironment}.`],
      raw_counts: {
        provider_invocation_documents: 0,
        provider_invocation_summary_rows: 0,
        provider_duration_documents: 0,
        provider_duration_summary_rows: 0,
      },
    };
  }
  const requiredFilterClauses = [
    `environment eq '${expectedEnvironment}'`,
    `deployment_id eq '${expectedDeploymentId}'`,
    `route eq '${REQUEST_ROUTE}'`,
  ];
  const invocation = metricRows({
    evidence: invocationEvidence,
    expectedMetric: INVOCATION_METRIC,
    expectedAggregation: 'sum',
    requiredGroupBy: PROVIDER_GROUP_BY,
    measurementWindow,
    requiredFilterClauses,
    evidenceLabel: 'Provider invocation evidence',
  });
  const duration = metricRows({
    evidence: durationEvidence,
    expectedMetric: DURATION_METRIC,
    expectedAggregation: 'avg',
    requiredGroupBy: PROVIDER_GROUP_BY,
    measurementWindow,
    requiredFilterClauses,
    evidenceLabel: 'Provider duration evidence',
  });
  const errors = [...invocation.errors, ...duration.errors];
  const samples = [];
  const durationByKey = new Map();
  const usedDurationRows = new Set();

  for (const candidate of duration.rows) {
    const key = providerDimensionKey(candidate.row);
    const list = durationByKey.get(key) ?? [];
    list.push(candidate);
    durationByKey.set(key, list);
  }

  const seenProbeIds = new Set();
  for (const candidate of invocation.rows) {
    const row = candidate.row;
    const userAgent = String(dimensionValue(row, 'client_user_agent') ?? '');
    const probeMatch = LAUNCH_PROBE_USER_AGENT.exec(userAgent);
    if (!probeMatch) continue;
    const probeId = probeMatch[1];
    const invocationCount = numericMetricValue(row, [
      'vercel_function_invocation_count_sum',
    ]);
    const startType = String(
      dimensionValue(row, 'function_start_type') ?? '',
    ).toLowerCase();
    const region = String(dimensionValue(row, 'function_region') ?? '');
    const deploymentId = String(dimensionValue(row, 'deployment_id') ?? '');
    const route = String(dimensionValue(row, 'route') ?? '');
    const status = Number(dimensionValue(row, 'http_status'));

    if (seenProbeIds.has(probeId)) {
      errors.push(`Duplicate provider probe id: ${probeId}.`);
      continue;
    }
    seenProbeIds.add(probeId);
    if (
      invocationCount !== 1 ||
      !PROVIDER_START_TYPES.has(startType) ||
      !region ||
      !deploymentId ||
      route !== REQUEST_ROUTE ||
      status !== 200
    ) {
      errors.push(`${probeId} has invalid raw provider invocation data.`);
      continue;
    }

    const matchingDurations = durationByKey.get(providerDimensionKey(row)) ?? [];
    if (matchingDurations.length !== 1) {
      errors.push(
        `${probeId} expected one matching provider duration row; received ${matchingDurations.length}.`,
      );
      continue;
    }
    const durationCandidate = matchingDurations[0];
    usedDurationRows.add(durationCandidate);
    const functionDurationMs = numericMetricValue(durationCandidate.row, [
      'vercel_function_invocation_function_duration_ms_avg',
    ]);
    if (!nonNegativeNumber(functionDurationMs)) {
      errors.push(`${probeId} has an invalid provider function duration.`);
      continue;
    }

    const completionEvents = runtimeEvents.filter(
      (event) =>
        event.event === 'api_request_complete' &&
        event.request_id === probeId,
    );
    if (completionEvents.length !== 1) {
      errors.push(
        `${probeId} expected one raw Vercel-correlated completion event; received ${completionEvents.length}.`,
      );
      continue;
    }
    const completion = completionEvents[0];
    const providerRequestId = typeof completion.provider_request_id === 'string'
      ? completion.provider_request_id
      : '';
    const timestampUtc = normalizedUtcTimestamp(completion.timestamp_utc);
    if (
      !providerRequestId ||
      !timestampUtc ||
      !validRuntimeProvenance(completion.runtime_provenance)
    ) {
      errors.push(`${probeId} lacks raw Vercel request provenance.`);
      continue;
    }

    samples.push({
      probe_id: probeId,
      provider_request_id: providerRequestId,
      start_type: startType,
      deployment_id: deploymentId,
      environment: expectedEnvironment,
      route,
      timestamp_utc: timestampUtc,
      region,
      status,
      function_duration_ms: functionDurationMs,
      provider_provenance: {
        adapter: 'vercel-function-metrics-v1',
        invocation_source_sha256: candidate.provenance.source_sha256,
        invocation_raw_document_sha256:
          candidate.provenance.raw_document_sha256,
        duration_source_sha256: durationCandidate.provenance.source_sha256,
        duration_raw_document_sha256:
          durationCandidate.provenance.raw_document_sha256,
        runtime_source_sha256:
          completion.runtime_provenance.source_sha256,
        runtime_source_record: completion.runtime_provenance.source_record,
        runtime_log_index: completion.runtime_provenance.log_index,
      },
    });
  }

  for (const candidate of duration.rows) {
    const userAgent = String(
      dimensionValue(candidate.row, 'client_user_agent') ?? '',
    );
    if (LAUNCH_PROBE_USER_AGENT.test(userAgent) && !usedDurationRows.has(candidate)) {
      errors.push(`Unpaired provider duration row for ${userAgent}.`);
    }
  }

  return {
    samples,
    errors,
    raw_counts: {
      invocation_documents: invocation.rawDocuments,
      invocation_summary_rows: invocation.rawSummaryRows,
      duration_documents: duration.rawDocuments,
      duration_summary_rows: duration.rawSummaryRows,
    },
  };
}
function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function nonNegativeNumber(value) {
  return finiteNumber(value) && value >= 0;
}

function exactVenueValidationSummary(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  return (
    keys.length === VALIDATION_FIELDS.size &&
    keys.every((key) => VALIDATION_FIELDS.has(key)) &&
    value.passed === true &&
    value.venue_count === EXPECTED_VENUE_COUNT &&
    value.unique_id_count === EXPECTED_VENUE_COUNT &&
    value.unique_slug_count === EXPECTED_VENUE_COUNT &&
    value.series_count_min === EXPECTED_SERIES_COUNT &&
    value.series_count_max === EXPECTED_SERIES_COUNT &&
    value.exact_series_steps === true &&
    value.exact_series_values === true
  );
}

function utcMilliseconds(value) {
  if (typeof value !== 'string') return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function nearestRank(values, percentile) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(percentile * sorted.length) - 1);
  return sorted[index];
}

function metricSummary(samples, field) {
  const values = samples
    .map((sample) => sample[field])
    .filter(finiteNumber);
  return {
    p50: nearestRank(values, 0.5),
    p95: nearestRank(values, 0.95),
  };
}

function cohortSummary(providerSamples, clientByProbeId) {
  const clientSamples = providerSamples
    .map((sample) => clientByProbeId.get(sample.probe_id))
    .filter(Boolean);
  return {
    n: providerSamples.length,
    client_ttfb_ms: metricSummary(clientSamples, 'ttfb_ms'),
    client_total_ms: metricSummary(clientSamples, 'total_ms'),
    function_duration_ms: metricSummary(
      providerSamples,
      'function_duration_ms',
    ),
  };
}

function edgeCohortSummary(clientSamples) {
  return {
    n: clientSamples.length,
    client_ttfb_ms: metricSummary(clientSamples, 'ttfb_ms'),
    client_total_ms: metricSummary(clientSamples, 'total_ms'),
    function_duration_ms: { p50: null, p95: null },
  };
}

export function validateVenuePayload(payload) {
  const venues =
    payload && typeof payload === 'object' && Array.isArray(payload.venues)
      ? payload.venues
      : [];
  const ids = new Set();
  const slugs = new Set();
  const seriesCounts = [];
  let identifiersValid = true;
  let exactSeriesSteps = true;
  let exactSeriesValues = true;

  for (const venue of venues) {
    const id =
      venue && typeof venue === 'object' && typeof venue.id === 'string'
        ? venue.id
        : '';
    const slug =
      venue && typeof venue === 'object' && typeof venue.slug === 'string'
        ? venue.slug
        : '';
    if (!id || !slug) identifiersValid = false;
    if (id) ids.add(id);
    if (slug) slugs.add(slug);

    const series =
      venue &&
      typeof venue === 'object' &&
      Array.isArray(venue.sunDaySeries)
        ? venue.sunDaySeries
        : [];
    seriesCounts.push(series.length);
    if (series.length !== EXPECTED_SERIES_COUNT) {
      exactSeriesSteps = false;
      continue;
    }
    for (let index = 0; index < EXPECTED_SERIES_COUNT; index += 1) {
      const step = series[index];
      const expectedMinute =
        FIRST_SERIES_MINUTE + index * SERIES_INTERVAL_MINUTES;
      if (
        !step ||
        typeof step !== 'object'
      ) {
        exactSeriesSteps = false;
        exactSeriesValues = false;
        break;
      }
      if (step.minutes !== expectedMinute) exactSeriesSteps = false;
      if (
        !finiteNumber(step.sunExposurePercent) ||
        step.sunExposurePercent < 0 ||
        step.sunExposurePercent > 100 ||
        !VENUE_SUN_STATUSES.has(step.currentSunStatus) ||
        !WEATHER_GATE_STATES.has(step.weatherGateState)
      ) {
        exactSeriesValues = false;
      }
    }
  }

  const venueCount = venues.length;
  const seriesCountMin =
    seriesCounts.length > 0 ? Math.min(...seriesCounts) : 0;
  const seriesCountMax =
    seriesCounts.length > 0 ? Math.max(...seriesCounts) : 0;
  const passed =
    venueCount === EXPECTED_VENUE_COUNT &&
    identifiersValid &&
    ids.size === EXPECTED_VENUE_COUNT &&
    slugs.size === EXPECTED_VENUE_COUNT &&
    exactSeriesSteps &&
    exactSeriesValues;

  return {
    passed,
    venue_count: venueCount,
    unique_id_count: ids.size,
    unique_slug_count: slugs.size,
    series_count_min: seriesCountMin,
    series_count_max: seriesCountMax,
    exact_series_steps: exactSeriesSteps,
    exact_series_values: exactSeriesValues,
  };
}

function validateExternalProviderEvidence({
  evidence,
  acceptedProviderSamples,
  measurementWindow,
  expectedDeploymentId,
  expectedSupabaseHostname,
  expectedEnvironment,
}) {
  const metric = metricRows({
    evidence,
    expectedMetric: EXTERNAL_METRIC,
    expectedAggregation: 'sum',
    requiredGroupBy: EXTERNAL_GROUP_BY,
    measurementWindow,
    evidenceLabel: 'Provider external evidence',
    requiredFilterClauses: [
      `environment eq '${expectedEnvironment}'`,
      `deployment_id eq '${expectedDeploymentId}'`,
      `origin_route eq '${REQUEST_ROUTE}'`,
    ],
  });
  const errors = [...metric.errors];
  let complete = metric.errors.length === 0;
  const acceptedByRegion = new Map();
  for (const sample of acceptedProviderSamples) {
    acceptedByRegion.set(
      sample.region,
      (acceptedByRegion.get(sample.region) ?? 0) + 1,
    );
  }

  const expectedPathMethods = new Map(
    [...EXPECTED_DEPENDENCIES.values()].map(({ path, method }) => [path, method]),
  );
  const pathCountsByRegion = new Map();
  const seenGroups = new Set();
  let requestCount = 0;
  for (const candidate of metric.rows) {
    const row = candidate.row;
    const deploymentId = String(dimensionValue(row, 'deployment_id') ?? '');
    const region = String(dimensionValue(row, 'function_region') ?? '');
    const status = Number(dimensionValue(row, 'http_status'));
    const originRoute = String(dimensionValue(row, 'origin_route') ?? '');
    const requestHostname = String(
      dimensionValue(row, 'request_hostname') ?? '',
    );
    const requestMethod = String(
      dimensionValue(row, 'request_method') ?? '',
    ).toUpperCase();
    const requestPath = String(
      dimensionValue(row, 'request_path') ?? '',
    );
    const count = numericMetricValue(row, [
      'vercel_external_api_request_count_sum',
    ]);
    const groupKey = EXTERNAL_GROUP_BY
      .map((dimension) => String(dimensionValue(row, dimension) ?? ''))
      .join('\u001f');
    if (seenGroups.has(groupKey)) {
      complete = false;
      errors.push(
        `Provider external evidence contains a duplicate provider group for region ${region || 'unknown'}.`,
      );
      continue;
    }
    seenGroups.add(groupKey);
    const expectedMethod = expectedPathMethods.get(requestPath);
    const rowValid =
      deploymentId === expectedDeploymentId &&
      region.length > 0 &&
      status === 200 &&
      originRoute === REQUEST_ROUTE &&
      requestHostname === expectedSupabaseHostname &&
      expectedMethod === requestMethod &&
      Number.isSafeInteger(count) &&
      count >= 0;
    if (!rowValid) {
      complete = false;
      errors.push(
        'Provider external evidence contains an unexpected host, path, method, status, region, route, or deployment.',
      );
      continue;
    }
    if (!acceptedByRegion.has(region)) {
      complete = false;
      errors.push(
        `Provider external evidence contains function region ${region} with no accepted provider sample.`,
      );
      continue;
    }
    const regionPaths = pathCountsByRegion.get(region) ?? new Map();
    if (regionPaths.has(requestPath)) {
      complete = false;
      errors.push(
        `Provider external evidence contains duplicate region ${region} path ${requestPath}.`,
      );
      continue;
    }
    regionPaths.set(requestPath, count);
    pathCountsByRegion.set(region, regionPaths);
    requestCount += count;
  }

  for (const [region, acceptedCount] of acceptedByRegion) {
    const regionPaths = pathCountsByRegion.get(region);
    if (!regionPaths) {
      complete = false;
      errors.push(`Provider external evidence is missing accepted region ${region}.`);
      continue;
    }
    for (const [requestPath, requestMethod] of expectedPathMethods) {
      const observedCount = regionPaths.get(requestPath) ?? 0;
      if (observedCount !== acceptedCount) {
        complete = false;
        errors.push(
          `Provider external evidence for ${region} expected exactly ${acceptedCount} ${requestMethod} ${requestPath} calls for correlated probes; received ${observedCount}.`,
        );
      }
    }
  }

  if (acceptedByRegion.size === 0 || metric.rows.length === 0) complete = false;
  return {
    complete,
    errors,
    requestCount,
    rawDocuments: metric.rawDocuments,
    rawSummaryRows: metric.rawSummaryRows,
  };
}
function withinClientInterval(timestampMs, clientSample) {
  const startedAtMs = utcMilliseconds(clientSample.started_at_utc);
  const endedAtMs = utcMilliseconds(clientSample.ended_at_utc);
  return (
    timestampMs !== null &&
    startedAtMs !== null &&
    endedAtMs !== null &&
    timestampMs >= startedAtMs - PROVIDER_JOIN_CLOCK_SKEW_MS &&
    timestampMs <= endedAtMs + PROVIDER_JOIN_CLOCK_SKEW_MS
  );
}

function validateProviderRequestEvidence({
  evidence,
  captureSources,
  clientSamples,
  expectedDeploymentId,
  expectedEnvironment,
}) {
  const errors = [];
  const acceptedByProbeId = new Map();
  const sourceBySha256 = new Map();
  let complete = true;

  if (captureSources.length !== clientSamples.length) {
    complete = false;
    errors.push(
      `Provider request evidence expected ${clientSamples.length} request-id captures; received ${captureSources.length}.`,
    );
  }
  for (const source of captureSources) {
    const sourceSha256 = String(source?.sha256 ?? '');
    if (!SHA256.test(sourceSha256) || sourceBySha256.has(sourceSha256)) {
      complete = false;
      errors.push('Provider request evidence has invalid or duplicate capture provenance.');
      continue;
    }
    sourceBySha256.set(sourceSha256, source);
    if (
      source.capture_limit !== REQUEST_LOG_CAPTURE_LIMIT ||
      !Number.isSafeInteger(source.envelope_count) ||
      source.envelope_count < 0
    ) {
      complete = false;
      errors.push('Provider request evidence has invalid capture-count provenance.');
      continue;
    }
    if (source.envelope_count >= source.capture_limit) {
      complete = false;
      errors.push(
        `Provider request evidence capture ${sourceSha256} hit its ${source.capture_limit}-record limit.`,
      );
    }
    if (source.envelope_count !== 1) {
      complete = false;
      errors.push(
        `Provider request evidence capture ${sourceSha256} expected one envelope; received ${source.envelope_count}.`,
      );
    }
  }

  if (evidence.length !== clientSamples.length) {
    complete = false;
    errors.push(
      `Provider request evidence expected ${clientSamples.length} envelopes; received ${evidence.length}.`,
    );
  }
  const evidenceByRequestId = new Map();
  const referencedSources = new Map();
  for (const entry of evidence) {
    const envelope = entry?.envelope;
    const sourceSha256 = String(entry?.source_sha256 ?? '');
    const providerRequestId =
      envelope && typeof envelope === 'object' && typeof envelope.id === 'string'
        ? envelope.id
        : '';
    if (
      !SHA256.test(sourceSha256) ||
      !sourceBySha256.has(sourceSha256) ||
      entry?.source_record !== 1 ||
      !providerRequestId
    ) {
      complete = false;
      errors.push('Provider request evidence contains an envelope without capture provenance.');
      continue;
    }
    referencedSources.set(
      sourceSha256,
      (referencedSources.get(sourceSha256) ?? 0) + 1,
    );
    const matches = evidenceByRequestId.get(providerRequestId) ?? [];
    matches.push(entry);
    evidenceByRequestId.set(providerRequestId, matches);
  }

  for (const [sourceSha256] of sourceBySha256) {
    if (referencedSources.get(sourceSha256) !== 1) {
      complete = false;
      errors.push(
        `Provider request evidence capture ${sourceSha256} is not linked to exactly one envelope.`,
      );
    }
  }

  const expectedRequestIds = new Set();
  for (const clientSample of clientSamples) {
    const probeId = typeof clientSample?.probe_id === 'string'
      ? clientSample.probe_id
      : '';
    const expectedRequestId = vercelRequestIdSuffix(clientSample?.vercel_id);
    if (!probeId || !expectedRequestId) {
      complete = false;
      errors.push(`${probeId || 'Unknown client'} lacks a usable x-vercel-id suffix.`);
      continue;
    }
    expectedRequestIds.add(expectedRequestId);
    const matches = evidenceByRequestId.get(expectedRequestId) ?? [];
    if (matches.length !== 1) {
      complete = false;
      errors.push(
        `${probeId} expected one request-id-scoped Vercel envelope; received ${matches.length}.`,
      );
      continue;
    }
    const entry = matches[0];
    const envelope = entry.envelope;
    const timestampMs = utcMilliseconds(
      normalizedUtcTimestamp(envelope.timestamp),
    );
    const expectedCache = String(clientSample.cache_status).toUpperCase();
    const observedCache = String(envelope.cache ?? '').toUpperCase();
    const source = sourceBySha256.get(entry.source_sha256);
    const optionalCaptureMetadataMatches =
      (source.probe_id === undefined || source.probe_id === probeId) &&
      (source.request_id_suffix === undefined ||
        source.request_id_suffix === expectedRequestId) &&
      (entry.capture_id === undefined ||
        source.capture_id === undefined ||
        entry.capture_id === source.capture_id);
    const envelopeMatches =
      envelope.deploymentId === expectedDeploymentId &&
      envelope.environment === expectedEnvironment &&
      REQUEST_LOG_SOURCES.has(envelope.source) &&
      envelope.requestMethod === 'GET' &&
      envelope.requestPath === REQUEST_ROUTE &&
      envelope.responseStatusCode === 200 &&
      (observedCache === 'HIT' || observedCache === 'MISS') &&
      observedCache === expectedCache &&
      Array.isArray(envelope.logs) &&
      withinClientInterval(timestampMs, clientSample) &&
      optionalCaptureMetadataMatches;
    if (!envelopeMatches) {
      complete = false;
      errors.push(`${probeId} has a mismatched request-id-scoped Vercel envelope.`);
      continue;
    }
    acceptedByProbeId.set(probeId, {
      provider_request_id: expectedRequestId,
      source_sha256: entry.source_sha256,
    });
  }

  for (const requestId of evidenceByRequestId.keys()) {
    if (!expectedRequestIds.has(requestId)) {
      complete = false;
      errors.push(`Provider request evidence contains an extra envelope ${requestId}.`);
    }
  }

  return { complete, errors, acceptedByProbeId };
}

export function buildLaunchReport({
  clientSamples,
  providerInvocationEvidence = /** @type {MetricDocumentEvidence[]} */ ([]),
  providerDurationEvidence = /** @type {MetricDocumentEvidence[]} */ ([]),
  providerSamples: handAuthoredProviderSamples = /** @type {Array<Record<string, unknown>>} */ ([]),
  runtimeEvents,
  providerRequestEvidence = /** @type {Array<Record<string, unknown>>} */ ([]),
  providerRequestCaptureSources = /** @type {Array<Record<string, unknown>>} */ ([]),
  expectedDeploymentId,
  expectedSupabaseHostname,
  providerExternalEvidence = /** @type {MetricDocumentEvidence[]} */ ([]),
  minColdSamples = 20,
  uncachedThresholdMs = 5_000,
  expectedEnvironment = 'production',
}) {
  const errors = [];
  if (!VERCEL_ENVIRONMENTS.has(expectedEnvironment)) {
    return {
      schema_version: 3,
      generated_at: new Date().toISOString(),
      deployment_id: expectedDeploymentId,
      environment: expectedEnvironment,
      measurement_window: null,
      raw_counts: {},
      cohorts: {},
      acceptance: { passed: false },
      errors: [`Unsupported Vercel environment: ${expectedEnvironment}.`],
    };
  }
  let correctness = clientSamples.length > 0;
  let providerJoinComplete = true;
  let dependencyAttributionComplete = true;

  const clientByProbeId = new Map();
  const seenClientProbeIds = new Set();
  const acceptedClientSamples = [];
  let rejectedClientSamples = 0;
  let windowStartMs = Number.POSITIVE_INFINITY;
  let windowEndMs = Number.NEGATIVE_INFINITY;
  for (const sample of clientSamples) {
    const probeId = typeof sample.probe_id === 'string' ? sample.probe_id : '';
    if (!probeId || seenClientProbeIds.has(probeId)) {
      correctness = false;
      rejectedClientSamples += 1;
      errors.push(probeId ? `Duplicate client probe id: ${probeId}.` : 'Invalid client probe id.');
      continue;
    }
    seenClientProbeIds.add(probeId);
    const probeMatch = CANONICAL_PROBE_ID.exec(probeId);
    const cacheStatus = String(sample.cache_status).toUpperCase();
    const startedAtMs = utcMilliseconds(sample.started_at_utc);
    const endedAtMs = utcMilliseconds(sample.ended_at_utc);
    let accepted = true;
    if (!probeMatch) {
      accepted = false;
      errors.push(`${probeId} does not match the canonical opaque probe grammar.`);
    }
    const utcElapsedMs =
      startedAtMs !== null && endedAtMs !== null
        ? endedAtMs - startedAtMs
        : null;
    if (sample.http_status !== 200 || !exactVenueValidationSummary(sample.validation)) {
      accepted = false;
      errors.push(`${probeId} failed HTTP or payload correctness.`);
    }
    if (
      sample.schema_version !== 3 ||
      !Number.isSafeInteger(sample.sequence) ||
      sample.sequence < 1 ||
      !Number.isSafeInteger(sample.response_body_bytes) ||
      sample.response_body_bytes <= 0 ||
      !SHA256.test(String(sample.response_body_sha256 ?? '')) ||
      sample.parse_error !== null ||
      (sample.content_encoding !== null &&
        typeof sample.content_encoding !== 'string')
    ) {
      accepted = false;
      errors.push(`${probeId} lacks complete raw response evidence.`);
    }
    if (cacheStatus !== 'MISS' && cacheStatus !== 'HIT') {
      accepted = false;
      errors.push(`${probeId} has unsupported cache status ${cacheStatus}.`);
    }
    if (
      !nonNegativeNumber(sample.ttfb_ms) ||
      !nonNegativeNumber(sample.total_ms) ||
      sample.ttfb_ms > sample.total_ms ||
      startedAtMs === null ||
      endedAtMs === null ||
      startedAtMs > endedAtMs ||
      utcElapsedMs === null ||
      sample.total_ms + CLIENT_TIMING_TOLERANCE_MS < utcElapsedMs
    ) {
      accepted = false;
      errors.push(`${probeId} has invalid client timing or UTC bounds.`);
    }
    if (
      sample.deployment_id !== expectedDeploymentId ||
      sample.response_deployment_id !== expectedDeploymentId ||
      sample.environment !== expectedEnvironment
    ) {
      accepted = false;
      errors.push(`${probeId} is not bound to the expected production deployment.`);
    }
    if (
      cacheStatus === 'MISS' &&
      sample.response_request_id !== null &&
      sample.response_request_id !== probeId
    ) {
      accepted = false;
      errors.push(`${probeId} did not echo its origin request id.`);
    }
    if (typeof sample.vercel_id !== 'string' || sample.vercel_id.length === 0) {
      accepted = false;
      errors.push(`${probeId} lacks a Vercel request correlation id.`);
    }
    const requestedCohort = sample.requested_cohort;
    const idCohort = probeMatch?.[2];
    const cohortMatchesCache =
      (requestedCohort === 'origin' && cacheStatus === 'MISS') ||
      (requestedCohort === 'edge-prime' && cacheStatus === 'MISS') ||
      (requestedCohort === 'edge-repeat' && cacheStatus === 'HIT');
    const cohortMatchesId =
      (requestedCohort === 'origin' && idCohort === 'origin') ||
      (requestedCohort === 'edge-prime' && idCohort === 'edge-prime') ||
      (requestedCohort === 'edge-repeat' && idCohort === 'edge');
    if (
      sample.request_route !== REQUEST_ROUTE ||
      !REQUEST_COHORTS.has(requestedCohort) ||
      !cohortMatchesCache ||
      !cohortMatchesId ||
      Object.keys(sample).some((field) => !CLIENT_SAMPLE_FIELDS.has(field))
    ) {
      accepted = false;
      errors.push(
        `${probeId} has an invalid cohort/cache mapping or non-allowlisted client field.`,
      );
    }
    if (!accepted) {
      correctness = false;
      rejectedClientSamples += 1;
      continue;
    }
    windowStartMs = Math.min(windowStartMs, startedAtMs);
    windowEndMs = Math.max(windowEndMs, endedAtMs);
    clientByProbeId.set(probeId, sample);
    acceptedClientSamples.push(sample);
  }
  if (clientSamples.length === 0) {
    errors.push('No client samples were supplied.');
  }

  const requestEvidence = validateProviderRequestEvidence({
    evidence: providerRequestEvidence,
    captureSources: providerRequestCaptureSources,
    clientSamples,
    expectedDeploymentId,
    expectedEnvironment,
  });
  errors.push(...requestEvidence.errors);
  if (!requestEvidence.complete) providerJoinComplete = false;

  const correlatedRuntimeEvents = [];
  for (const event of runtimeEvents) {
    const capture = requestEvidence.acceptedByProbeId.get(event.request_id);
    if (
      !capture ||
      event.provider_request_id !== capture.provider_request_id ||
      event.runtime_provenance?.source_sha256 !== capture.source_sha256 ||
      !validRuntimeProvenance(event.runtime_provenance)
    ) {
      providerJoinComplete = false;
      dependencyAttributionComplete = false;
      errors.push('Runtime event is not provenance-linked to its exact request-id capture.');
      continue;
    }
    correlatedRuntimeEvents.push(event);
  }

  const edgeSamples = acceptedClientSamples.filter(
    (sample) => String(sample.cache_status).toUpperCase() === 'HIT',
  );
  const originSamples = acceptedClientSamples.filter(
    (sample) =>
      sample.requested_cohort === 'origin' &&
      String(sample.cache_status).toUpperCase() === 'MISS',
  );
  const edgePrimeSamples = acceptedClientSamples.filter(
    (sample) => sample.requested_cohort === 'edge-prime',
  );
  const edgeRepeatSamples = acceptedClientSamples.filter(
    (sample) => sample.requested_cohort === 'edge-repeat',
  );
  const edgePrime = edgePrimeSamples[0];
  const edgeSession = edgePrime
    ? CANONICAL_PROBE_ID.exec(edgePrime.probe_id)?.[1]
    : undefined;
  const edgeCacheLaneComplete =
    edgePrimeSamples.length === 1 &&
    edgeRepeatSamples.length >= 1 &&
    edgeSession !== undefined &&
    edgeRepeatSamples.every((sample) => {
      const match = CANONICAL_PROBE_ID.exec(sample.probe_id);
      return (
        match?.[1] === edgeSession &&
        Number.isSafeInteger(sample.sequence) &&
        sample.sequence > edgePrime.sequence
      );
    });
  if (!edgeCacheLaneComplete) {
    errors.push(
      'Edge cache lane requires exactly one prime MISS followed by at least one repeat HIT for the same session.',
    );
  }
  const measurementWindow =
    Number.isFinite(windowStartMs) && Number.isFinite(windowEndMs)
      ? {
          started_at_utc: new Date(windowStartMs).toISOString(),
          ended_at_utc: new Date(windowEndMs).toISOString(),
        }
      : null;
  if (handAuthoredProviderSamples.length > 0) {
    providerJoinComplete = false;
    errors.push(
      'Hand-authored provider classification rows are forbidden; supply raw Vercel records.',
    );
  }
  const derivation = deriveVercelProviderSamples({
    invocationEvidence: providerInvocationEvidence,
    expectedDeploymentId,
    durationEvidence: providerDurationEvidence,
    runtimeEvents: correlatedRuntimeEvents,
    measurementWindow,
    expectedEnvironment,
  });
  if (derivation.errors.length > 0) providerJoinComplete = false;
  errors.push(...derivation.errors);
  const providerSamples = derivation.samples;

  const providerByProbeId = new Map();
  const seenProviderProbeIds = new Set();
  const seenProviderRequestIds = new Set();
  const acceptedProviderSamples = [];
  let rejectedProviderSamples = 0;
  for (const sample of providerSamples) {
    const probeId = typeof sample.probe_id === 'string' ? sample.probe_id : '';
    const providerRequestId = typeof sample.provider_request_id === 'string'
      ? sample.provider_request_id
      : '';
    let accepted = true;
    if (!probeId || seenProviderProbeIds.has(probeId)) {
      accepted = false;
      providerJoinComplete = false;
      errors.push(probeId ? `Duplicate provider probe id: ${probeId}.` : 'Invalid provider probe id.');
    } else {
      seenProviderProbeIds.add(probeId);
    }
    if (!providerRequestId || seenProviderRequestIds.has(providerRequestId)) {
      accepted = false;
      providerJoinComplete = false;
      errors.push(providerRequestId ? `Duplicate provider request id: ${providerRequestId}.` : `${probeId} lacks a provider request id.`);
    } else {
      seenProviderRequestIds.add(providerRequestId);
    }
    if (
      !PROVIDER_START_TYPES.has(sample.start_type) ||
      !nonNegativeNumber(sample.function_duration_ms) ||
      sample.status !== 200 ||
      typeof sample.region !== 'string' ||
      sample.region.length === 0 ||
      sample.route !== REQUEST_ROUTE ||
      sample.environment !== expectedEnvironment ||
      sample.deployment_id !== expectedDeploymentId
    ) {
      accepted = false;
      providerJoinComplete = false;
      errors.push(`${probeId} has invalid provider classification data.`);
    }
    const providerTimestampMs = utcMilliseconds(sample.timestamp_utc);
    const clientSample = clientByProbeId.get(probeId);
    if (!clientSample || String(clientSample.cache_status).toUpperCase() !== 'MISS') {
      accepted = false;
      providerJoinComplete = false;
      errors.push(`${probeId} has no matching accepted function-running client sample.`);
    } else if (!withinClientInterval(providerTimestampMs, clientSample)) {
      accepted = false;
      providerJoinComplete = false;
      errors.push(
        `${probeId} is outside its matching client interval (±${PROVIDER_JOIN_CLOCK_SKEW_MS} ms).`,
      );
    }
    if (!accepted) {
      rejectedProviderSamples += 1;
      continue;
    }
    providerByProbeId.set(probeId, sample);
    acceptedProviderSamples.push(sample);
  }
  const acceptedOriginProviderSamples = acceptedProviderSamples.filter(
    (sample) => clientByProbeId.get(sample.probe_id)?.requested_cohort === 'origin',
  );
  const functionRunningSamples = acceptedClientSamples.filter(
    (sample) => String(sample.cache_status).toUpperCase() === 'MISS',
  );
  const acceptedFunctionProviderSamples = acceptedProviderSamples.filter(
    (sample) => {
      const clientSample = clientByProbeId.get(sample.probe_id);
      return clientSample && String(clientSample.cache_status).toUpperCase() === 'MISS';
    },
  );

  for (const sample of functionRunningSamples) {
    if (!providerByProbeId.has(sample.probe_id)) {
      providerJoinComplete = false;
      errors.push(`${sample.probe_id} has no provider classification.`);
    }
  }

  for (const providerSample of acceptedFunctionProviderSamples) {
    const clientSample = clientByProbeId.get(providerSample.probe_id);
    const probeEvents = correlatedRuntimeEvents.filter(
      (event) => event.request_id === providerSample.probe_id,
    );
    const eventMatchesProvider = (event) => {
      const eventTimestampMs = utcMilliseconds(event.timestamp_utc);
      return (
        event.deployment_id === expectedDeploymentId &&
        event.environment === expectedEnvironment &&
        event.provider_request_id === providerSample.provider_request_id &&
        validRuntimeProvenance(event.runtime_provenance) &&
        withinClientInterval(eventTimestampMs, clientSample) &&
        event.region === providerSample.region &&
        nonNegativeNumber(event.duration_ms)
      );
    };
    const unattributed = probeEvents.filter(
      (event) => event.event === 'external_dependency_unattributed',
    );
    if (unattributed.length > 0) {
      dependencyAttributionComplete = false;
      errors.push(
        `${providerSample.probe_id} emitted an unattributed external dependency.`,
      );
    }

    const completionEvents = probeEvents.filter(
      (event) => event.event === 'api_request_complete',
    );
    if (
      completionEvents.length !== 1 ||
      !eventMatchesProvider(completionEvents[0]) ||
      completionEvents[0].route !== REQUEST_ROUTE ||
      completionEvents[0].method !== 'GET' ||
      completionEvents[0].status !== 200 ||
      completionEvents[0].region !== providerSample.region
    ) {
      dependencyAttributionComplete = false;
      errors.push(
        `${providerSample.probe_id} lacks one matching route completion event.`,
      );
    }

    const dependencyEvents = probeEvents.filter(
      (event) => event.event === 'external_dependency',
    );
    for (const [operation, expectation] of EXPECTED_DEPENDENCIES) {
      const matches = dependencyEvents.filter(
        (event) =>
          event.operation === operation &&
          event.destination_path === expectation.path &&
          event.method === expectation.method &&
          eventMatchesProvider(event) &&
          event.status === 200,
      );
      if (matches.length !== 1) {
        dependencyAttributionComplete = false;
        errors.push(
          `${providerSample.probe_id} expected one ${operation} dependency; received ${matches.length}.`,
        );
      }
    }
    if (dependencyEvents.length !== EXPECTED_DEPENDENCIES.size) {
      dependencyAttributionComplete = false;
      errors.push(
        `${providerSample.probe_id} expected exactly ${EXPECTED_DEPENDENCIES.size} attributed dependencies; received ${dependencyEvents.length}.`,
      );
    }
  }


  const external = validateExternalProviderEvidence({
    evidence: providerExternalEvidence,
    acceptedProviderSamples,
    measurementWindow,
    expectedDeploymentId,
    expectedSupabaseHostname,
    expectedEnvironment,
  });
  errors.push(...external.errors);
  const coldSamples = acceptedOriginProviderSamples.filter(
    (sample) => sample.start_type === 'cold',
  );
  const prewarmedSamples = acceptedOriginProviderSamples.filter(
    (sample) => sample.start_type === 'prewarmed',
  );
  const hotSamples = acceptedOriginProviderSamples.filter(
    (sample) => sample.start_type === 'hot',
  );
  const correlatedOriginSamples = originSamples.filter((sample) =>
    requestEvidence.acceptedByProbeId.has(sample.probe_id),
  );
  const correlatedEdgeSamples = edgeSamples.filter((sample) =>
    requestEvidence.acceptedByProbeId.has(sample.probe_id),
  );
  const edgeProviderCorrelationComplete =
    edgeSamples.length > 0 && correlatedEdgeSamples.length === edgeSamples.length;
  const cohorts = {
    cold: cohortSummary(coldSamples, clientByProbeId),
    prewarmed: cohortSummary(prewarmedSamples, clientByProbeId),
    hot: cohortSummary(hotSamples, clientByProbeId),
    origin_uncached: edgeCohortSummary(correlatedOriginSamples),
    edge_hit: edgeCohortSummary(correlatedEdgeSamples),
  };

  if (coldSamples.length < minColdSamples) {
    errors.push(
      `Need at least ${minColdSamples} provider-classified cold samples; received ${coldSamples.length}.`,
    );
  }
  const uncachedRouteP95 = cohorts.origin_uncached.client_total_ms.p95;
  if (uncachedRouteP95 !== null && uncachedRouteP95 > uncachedThresholdMs) {
    errors.push(
      `Uncached origin client total p95 ${uncachedRouteP95} ms exceeds ${uncachedThresholdMs} ms.`,
    );
  }

  const acceptance = {
    passed:
      correctness &&
      edgeCacheLaneComplete &&
      edgeProviderCorrelationComplete &&
      requestEvidence.complete &&
      providerJoinComplete &&
      dependencyAttributionComplete &&
      external.complete &&
      coldSamples.length >= minColdSamples &&
      uncachedRouteP95 !== null &&
      uncachedRouteP95 <= uncachedThresholdMs,
    correctness,
    provider_join_complete: providerJoinComplete,
    provider_request_evidence_complete: requestEvidence.complete,
    edge_cache_lane_complete: edgeCacheLaneComplete,
    edge_provider_correlation_complete: edgeProviderCorrelationComplete,
    dependency_attribution_complete: dependencyAttributionComplete,
    external_provider_complete: external.complete,
    cold_sample_count: coldSamples.length,
    uncached_route_threshold_ms: uncachedThresholdMs,
    provider_join_clock_skew_ms: PROVIDER_JOIN_CLOCK_SKEW_MS,
  };

  return {
    schema_version: 3,
    generated_at: new Date().toISOString(),
    deployment_id: expectedDeploymentId,
    environment: expectedEnvironment,
    measurement_window: measurementWindow,
    raw_counts: {
      client_samples: clientSamples.length,
      rejected_client_samples: rejectedClientSamples,
      origin_samples: originSamples.length,
      provider_samples: providerSamples.length,
      accepted_provider_samples: acceptedProviderSamples.length,
      rejected_provider_samples: rejectedProviderSamples,
      runtime_events: runtimeEvents.length,
      provider_request_envelopes: providerRequestEvidence.length,
      provider_request_captures: providerRequestCaptureSources.length,
      ...derivation.raw_counts,
      provider_external_documents: external.rawDocuments,
      provider_external_summary_rows: external.rawSummaryRows,
      provider_external_requests: external.requestCount,
    },
    cohorts,
    acceptance,
    errors,
  };
}
