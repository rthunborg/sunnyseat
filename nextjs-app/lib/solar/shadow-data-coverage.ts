import type { ShadowDataCoverage, ShadowDataCoverageStatus } from './types';

export const LAUNCH_CLUSTER_IDS = [
  'inom-vallgraven',
  'nordstan',
  'lilla-bommen',
  'avenyn',
  'vasastan',
  'haga',
  'linne',
  'central-surroundings',
] as const;

export type LaunchClusterId = (typeof LAUNCH_CLUSTER_IDS)[number];

interface LaunchCluster {
  id: LaunchClusterId;
  name: string;
  lon: number;
  lat: number;
}

const CLUSTER_RADIUS_M = 650;
const LAUNCH_BBOX_WGS84 = {
  minLon: 11.831784883951089,
  maxLon: 12.0,
  minLat: 57.62922342349018,
  maxLat: 57.80891144378977,
};

const LAUNCH_CLUSTERS: readonly LaunchCluster[] = [
  { id: 'inom-vallgraven', name: 'Inom Vallgraven', lon: 11.9639, lat: 57.7053 },
  { id: 'nordstan', name: 'Nordstan', lon: 11.9690, lat: 57.7086 },
  { id: 'lilla-bommen', name: 'Lilla Bommen', lon: 11.9669, lat: 57.7115 },
  { id: 'avenyn', name: 'Avenyn', lon: 11.9746, lat: 57.6996 },
  { id: 'vasastan', name: 'Vasastan', lon: 11.9672, lat: 57.6976 },
  { id: 'haga', name: 'Haga', lon: 11.9573, lat: 57.6983 },
  { id: 'linne', name: 'Linné', lon: 11.9517, lat: 57.6933 },
  { id: 'central-surroundings', name: 'Surrounding central areas', lon: 11.9840, lat: 57.7040 },
];

export type ShadowDataCoverageMap = Partial<Record<string, ShadowDataCoverage>>;

// Runtime source for Story 3.0.5: a checked-in conservative seed that marks
// every launch cluster unknown. A future validated JSON adapter can call
// buildCoverageMapFromValidationArtifact(); malformed, partial, or failing
// artifacts return this same fail-closed map.
export const CONSERVATIVE_CLUSTER_COVERAGE: Record<LaunchClusterId, ShadowDataCoverage> =
  Object.fromEntries(
    LAUNCH_CLUSTERS.map((cluster) => [
      cluster.id,
      createCoverageRecord(cluster.id, cluster.name, 'unknown'),
    ])
  ) as Record<LaunchClusterId, ShadowDataCoverage>;

export function getShadowDataCoverage(
  polygon: GeoJSON.Polygon,
  coverageMap: ShadowDataCoverageMap = CONSERVATIVE_CLUSTER_COVERAGE
): ShadowDataCoverage {
  const centroid = getPolygonCentroid(polygon);
  if (!centroid || !isWithinLaunchBbox(centroid)) return createUnknownCoverage(null, null);

  const cluster = getNearestLaunchCluster(centroid);
  if (!cluster) return createUnknownCoverage(null, null);

  return normalizeCoverageRecord(
    coverageMap[cluster.id],
    cluster.id,
    cluster.name
  );
}

export function buildCoverageMapFromValidationArtifact(
  artifact: unknown
): Record<LaunchClusterId, ShadowDataCoverage> {
  if (!isRecord(artifact)) return { ...CONSERVATIVE_CLUSTER_COVERAGE };
  if (artifact.scope !== 'full_launch_clusters' || artifact.status !== 'pass') {
    return { ...CONSERVATIVE_CLUSTER_COVERAGE };
  }
  if (!isRecord(artifact.clusters)) return { ...CONSERVATIVE_CLUSTER_COVERAGE };
  const clusters = artifact.clusters;

  const map: Record<LaunchClusterId, ShadowDataCoverage> = {
    ...CONSERVATIVE_CLUSTER_COVERAGE,
  };

  if (LAUNCH_CLUSTERS.some((cluster) => !isRecord(clusters[cluster.id]))) {
    return { ...CONSERVATIVE_CLUSTER_COVERAGE };
  }

  for (const cluster of LAUNCH_CLUSTERS) {
    const raw = clusters[cluster.id];
    if (!isRecord(raw) || !matchesClusterId(raw, cluster.id)) {
      return { ...CONSERVATIVE_CLUSTER_COVERAGE };
    }

    const status = normalizeValidatedStatus(raw);
    map[cluster.id] = createCoverageRecord(cluster.id, cluster.name, status, {
      checkedCount: asNumber(raw.checkedCount, 0),
      agreementRate: asNullableNumber(raw.agreementRate),
      missingConditions: asStringArray(raw.missingConditions),
      uncertaintyCounts: asNumberRecord(raw.uncertaintyCounts),
      evidenceFiles: asStringArray(raw.evidenceFiles),
    });
  }

  return map;
}

export function applyShadowDataCoverageCap(
  confidence: number,
  coverage: ShadowDataCoverage | undefined
): number {
  if (isCoverageCapDisabled()) return confidence;
  if (!coverage) return Math.min(confidence, 0.6);
  return Math.min(confidence, coverage.confidenceCap);
}

/**
 * Pre-launch verification escape hatch: `SUNNYSEAT_COVERAGE_CAP=off` lifts ONLY
 * this coverage clamp so the maintainer can field-verify the RAW engine
 * confidence against reality (the walking spot-check phase that will produce the
 * validation artifact — Story 12.2). Everything else stays honest: the other
 * confidence caps (no-weather, forecast, low-sun-elevation, obstruction risk) in
 * `applyConfidenceCaps` still apply, and the coverage RECORD (status/uncertainty
 * surfaces) keeps flowing — only the numeric clamp lifts. Fail-closed: any value
 * other than the exact string `off` (or unset) keeps the capped path, so CI/dev
 * and a forgotten-flag deploy stay conservative. Read per call (not at module
 * load) so tests can stub the env; this module sits behind the lib/solar API
 * boundary, so the read is server-only and never reaches a client bundle.
 * LAUNCH CHECKLIST (Story 12.2): remove `SUNNYSEAT_COVERAGE_CAP` from Vercel
 * Production when the validation artifact is wired in.
 */
function isCoverageCapDisabled(): boolean {
  return process.env.SUNNYSEAT_COVERAGE_CAP === 'off';
}

export function createUnknownCoverage(
  clusterId: string | null,
  clusterName: string | null
): ShadowDataCoverage {
  return {
    clusterId,
    clusterName,
    status: 'unknown',
    checkedCount: 0,
    agreementRate: null,
    missingConditions: [],
    uncertaintyCounts: {},
    evidenceFiles: [],
    allowsHighConfidence: false,
    confidenceCap: coverageCapForStatus('unknown'),
  };
}

function normalizeCoverageRecord(
  coverage: ShadowDataCoverage | undefined,
  clusterId: LaunchClusterId,
  clusterName: string
): ShadowDataCoverage {
  if (!coverage) return createCoverageRecord(clusterId, clusterName, 'unknown');
  const status = normalizeStatus(coverage.status);
  return createCoverageRecord(clusterId, clusterName, status, {
    checkedCount: coverage.checkedCount,
    agreementRate: coverage.agreementRate,
    missingConditions: coverage.missingConditions,
    uncertaintyCounts: coverage.uncertaintyCounts,
    evidenceFiles: coverage.evidenceFiles,
  });
}

function createCoverageRecord(
  clusterId: string,
  clusterName: string,
  status: ShadowDataCoverageStatus,
  fields: Partial<ShadowDataCoverage> = {}
): ShadowDataCoverage {
  const confidenceCap = coverageCapForStatus(status);
  return {
    clusterId,
    clusterName,
    status,
    checkedCount: fields.checkedCount ?? 0,
    agreementRate: fields.agreementRate ?? null,
    missingConditions: fields.missingConditions ?? [],
    uncertaintyCounts: fields.uncertaintyCounts ?? {},
    evidenceFiles: fields.evidenceFiles ?? [],
    allowsHighConfidence: status === 'eligible',
    confidenceCap,
  };
}

function coverageCapForStatus(status: ShadowDataCoverageStatus): number {
  switch (status) {
    case 'eligible':
      return 1;
    case 'blocked':
      return 0.55;
    case 'insufficient_evidence':
      return 0.65;
    case 'unknown':
      return 0.6;
  }
}

function normalizeStatus(value: unknown): ShadowDataCoverageStatus {
  if (
    value === 'eligible' ||
    value === 'blocked' ||
    value === 'insufficient_evidence' ||
    value === 'unknown'
  ) {
    return value;
  }
  return 'unknown';
}

function normalizeValidatedStatus(raw: Record<string, unknown>): ShadowDataCoverageStatus {
  const status = normalizeStatus(raw.status);
  if (status !== 'eligible') return status;
  return hasEligibleEvidence(raw) ? 'eligible' : 'unknown';
}

function hasEligibleEvidence(raw: Record<string, unknown>): boolean {
  const checkedCount = asNumber(raw.checkedCount, 0);
  const agreementRate = asNullableNumber(raw.agreementRate);
  const missingConditions = asStringArray(raw.missingConditions);
  const evidenceFiles = asStringArray(raw.evidenceFiles);
  return (
    checkedCount >= 10 &&
    agreementRate !== null &&
    agreementRate >= 0.85 &&
    missingConditions.length === 0 &&
    evidenceFiles.length > 0
  );
}

function matchesClusterId(raw: Record<string, unknown>, expected: LaunchClusterId): boolean {
  const explicitId = raw.cluster_id ?? raw.clusterId;
  return explicitId === undefined || explicitId === expected;
}

function getNearestLaunchCluster(
  point: { lon: number; lat: number }
): LaunchCluster | null {
  let nearest: { cluster: LaunchCluster; distanceM: number } | null = null;
  for (const cluster of LAUNCH_CLUSTERS) {
    const distanceM = distanceMeters(point, cluster);
    if (!nearest || distanceM < nearest.distanceM) {
      nearest = { cluster, distanceM };
    }
  }
  return nearest && nearest.distanceM <= CLUSTER_RADIUS_M ? nearest.cluster : null;
}

function getPolygonCentroid(polygon: GeoJSON.Polygon): { lon: number; lat: number } | null {
  const ring = polygon.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 4) return null;
  const n = ring.length - 1;
  if (n <= 0) return null;
  let lon = 0;
  let lat = 0;
  for (let i = 0; i < n; i++) {
    const point = ring[i];
    if (
      !Array.isArray(point) ||
      typeof point[0] !== 'number' ||
      typeof point[1] !== 'number' ||
      !Number.isFinite(point[0]) ||
      !Number.isFinite(point[1])
    ) {
      return null;
    }
    lon += point[0];
    lat += point[1];
  }
  return { lon: lon / n, lat: lat / n };
}

function isWithinLaunchBbox(point: { lon: number; lat: number }): boolean {
  return (
    point.lon >= LAUNCH_BBOX_WGS84.minLon &&
    point.lon <= LAUNCH_BBOX_WGS84.maxLon &&
    point.lat >= LAUNCH_BBOX_WGS84.minLat &&
    point.lat <= LAUNCH_BBOX_WGS84.maxLat
  );
}

function distanceMeters(
  a: { lon: number; lat: number },
  b: { lon: number; lat: number }
): number {
  const earthRadiusM = 6371000;
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLon = toRadians(b.lon - a.lon);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * earthRadiusM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRadians(value: number): number {
  return value * (Math.PI / 180);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function asNumberRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] => (
      typeof entry[1] === 'number' && Number.isFinite(entry[1])
    ))
  );
}
