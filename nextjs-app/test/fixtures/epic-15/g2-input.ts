// Synthetic identity vector. Versions describe this fixture, not a deployed g2 engine.
export const g2Input = {
  seating: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
  engineCoordinate: { lng: 0.5, lat: 0.5 },
  seatingElevationM: 0,
  groundElevationM: 10,
  casters: [{
    id: '1', geometry: { type: 'Polygon', coordinates: [[[2, 0], [3, 0], [3, 1], [2, 0]]] },
    effectiveHeightM: 15, groundElevationM: 10, roofElevationM: 25,
    importGeneration: 'synthetic-1', heightSource: 'ManualOverride',
    source: 'synthetic', qualityScore: 1, sourcePriority: 1,
    tier: 'primary', filterDecision: 'include', casterClass: 'building', active: true, sourceFlags: [],
  }],
  manifest: {
    canonicalization: 'g2-jcs-rings-v1', coordinateDerivation: 'centroid-v1',
    selectionAlgorithm: 'eligible-casters-v1', solarAlgorithm: 'nrel-spa-v1',
    refractionAlgorithm: 'spa-refraction-v1', shadowAlgorithm: 'terrain-shadow-v1',
    horizonVersion: 'solar-centre-refracted-5deg-v1',
    samplingVersion: 'utc-adaptive-5m-1m-v1', decoderVersion: 'f64-v1',
    searchRadiusM: 200, maxShadowDistanceM: 200, minimumHeightM: 3,
    supportedElevationDegrees: 5, baseStepMs: 300000, probeStepMs: 60000,
    proximityPercent: 5, thresholdPercent: 50, crossingBracketMs: 100,
    horizonRootMs: 10000, minimumWindowMs: 300000, maxEvaluations: 20000,
    solarConstants: { pressureHpa: 1013.25, temperatureC: 15 },
    shadowConstants: { earthRadiusM: 6371008.8 },
    numericalDependencies: { turf: '7.3.5', polyclip: '0.16.8', node: '22.23.2', 'robust-predicates': '2.0.4' },
  },
};
