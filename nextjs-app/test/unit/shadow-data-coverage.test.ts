import { describe, expect, it } from 'vitest';
import {
  CONSERVATIVE_CLUSTER_COVERAGE,
  LAUNCH_CLUSTER_IDS,
  buildCoverageMapFromValidationArtifact,
  getShadowDataCoverage,
} from '@/lib/solar/shadow-data-coverage';

const inomVallgravenPolygon: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [[
    [11.9638, 57.7052],
    [11.9640, 57.7052],
    [11.9640, 57.7054],
    [11.9638, 57.7054],
    [11.9638, 57.7052],
  ]],
};

const outsideLaunchPolygon: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [[
    [11.50, 57.90],
    [11.51, 57.90],
    [11.51, 57.91],
    [11.50, 57.91],
    [11.50, 57.90],
  ]],
};

const malformedPolygon = {
  type: 'Polygon',
  coordinates: [],
} as unknown as GeoJSON.Polygon;

function fullLaunchArtifact(overrides: Record<string, Record<string, unknown>> = {}) {
  const clusters = Object.fromEntries(
    LAUNCH_CLUSTER_IDS.map((clusterId) => [
      clusterId,
      {
        cluster_id: clusterId,
        status: 'blocked',
        checkedCount: 10,
        agreementRate: 0.5,
        missingConditions: [],
        uncertaintyCounts: {},
        evidenceFiles: ['fixture'],
        ...overrides[clusterId],
      },
    ])
  );

  return {
    scope: 'full_launch_clusters',
    status: 'pass',
    clusters,
  };
}

describe('shadow data coverage contract', () => {
  it('ships a conservative default coverage map for every launch cluster', () => {
    expect(Object.keys(CONSERVATIVE_CLUSTER_COVERAGE).sort()).toEqual(
      [...LAUNCH_CLUSTER_IDS].sort()
    );

    for (const clusterId of LAUNCH_CLUSTER_IDS) {
      expect(CONSERVATIVE_CLUSTER_COVERAGE[clusterId]).toEqual(
        expect.objectContaining({
          clusterId,
          status: 'unknown',
          allowsHighConfidence: false,
        })
      );
    }
  });

  it('maps venue centroids to the matching launch cluster and fails outside coverage closed', () => {
    expect(getShadowDataCoverage(inomVallgravenPolygon, {
      ...CONSERVATIVE_CLUSTER_COVERAGE,
      'inom-vallgraven': {
        ...CONSERVATIVE_CLUSTER_COVERAGE['inom-vallgraven'],
        status: 'eligible',
        checkedCount: 70,
        agreementRate: 0.9,
        allowsHighConfidence: true,
      },
    })).toEqual(
      expect.objectContaining({
        clusterId: 'inom-vallgraven',
        status: 'eligible',
        allowsHighConfidence: true,
      })
    );

    expect(getShadowDataCoverage(outsideLaunchPolygon)).toEqual(
      expect.objectContaining({
        clusterId: null,
        status: 'unknown',
        allowsHighConfidence: false,
      })
    );

    expect(getShadowDataCoverage(malformedPolygon)).toEqual(
      expect.objectContaining({
        clusterId: null,
        status: 'unknown',
        allowsHighConfidence: false,
      })
    );
  });

  it('parses full launch validation artifacts but rejects partial or malformed artifacts', () => {
    const validMap = buildCoverageMapFromValidationArtifact(fullLaunchArtifact({
        'inom-vallgraven': {
          cluster_id: 'inom-vallgraven',
          status: 'eligible',
          checkedCount: 10,
          agreementRate: 0.9,
          missingConditions: [],
          uncertaintyCounts: { awning: 1 },
          evidenceFiles: ['fixture'],
        },
      }));

    expect(validMap['inom-vallgraven']).toEqual(
      expect.objectContaining({
        status: 'eligible',
        checkedCount: 10,
        agreementRate: 0.9,
        allowsHighConfidence: true,
      })
    );

    const partialMap = buildCoverageMapFromValidationArtifact({
      scope: 'partial_cluster_set',
      status: 'fail',
      clusters: {
        'inom-vallgraven': {
          status: 'eligible',
          checkedCount: 10,
          agreementRate: 1,
          missingConditions: [],
          uncertaintyCounts: {},
          evidenceFiles: ['fixture'],
        },
      },
    });

    expect(partialMap['inom-vallgraven']).toEqual(
      expect.objectContaining({
        status: 'unknown',
        allowsHighConfidence: false,
      })
    );

    const malformedMap = buildCoverageMapFromValidationArtifact({ clusters: null });
    expect(malformedMap['inom-vallgraven'].allowsHighConfidence).toBe(false);

    const missingClusterArtifact = fullLaunchArtifact();
    delete (missingClusterArtifact.clusters as Record<string, unknown>).linne;
    const missingClusterMap = buildCoverageMapFromValidationArtifact(missingClusterArtifact);
    expect(missingClusterMap['inom-vallgraven'].allowsHighConfidence).toBe(false);

    const mismatchedClusterMap = buildCoverageMapFromValidationArtifact(fullLaunchArtifact({
      'inom-vallgraven': {
        cluster_id: 'haga',
        status: 'eligible',
        checkedCount: 10,
        agreementRate: 0.9,
        missingConditions: [],
        uncertaintyCounts: {},
        evidenceFiles: ['fixture'],
      },
    }));
    expect(mismatchedClusterMap['inom-vallgraven'].allowsHighConfidence).toBe(false);

    const weakEligibleMap = buildCoverageMapFromValidationArtifact(fullLaunchArtifact({
      'inom-vallgraven': {
        cluster_id: 'inom-vallgraven',
        status: 'eligible',
      },
    }));
    expect(weakEligibleMap['inom-vallgraven'].allowsHighConfidence).toBe(false);
  });
});
