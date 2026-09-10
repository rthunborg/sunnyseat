import { fromZonedTime } from 'date-fns-tz';
import {
  classifyDirectSunWithTrace,
  type DirectSunWeatherEvidence,
} from '@/lib/services/direct-sun-classifier';
import {
  buildPersistedSunOutcome,
  SunGeometryCoverageMissingError,
  type PersistedSunRouteRepositories,
} from '@/lib/services/sun-geometry-repository';
import { venueEngineCoordinate } from '@/lib/services/sun-geometry-coordinates';
import type { StoredVenue } from '@/lib/services/venue-store';
import {
  hasUsableWeatherSnapshotEvidenceForStep,
  selectSnapshotSliceForStepWithDiagnostics,
  type WeatherSnapshotRecord,
  type WeatherSnapshotSlice,
} from '@/lib/services/weather-snapshots';
import { calculateSolarPosition } from '@/lib/solar/solar-calculation-service';
import {
  PLANNER_END_MINUTES,
  PLANNER_START_MINUTES,
  PLANNER_STEP_MINUTES,
  STOCKHOLM_TIME_ZONE,
  formatPlannerTime,
  formatTimeInStockholm,
  stockholmDateKey,
} from '@/lib/utils/time-planner';
import { publicSunVerdictFor } from '@/lib/utils/public-sun';
import {
  VENUE_DIAGNOSTICS_CONTRACT_VERSION,
  type DiagnosticValue,
  type VenueDiagnosticDataQualityIssue,
  type VenueDiagnosticEntry,
  type VenueDiagnosticsResponse,
} from '@/lib/types/venue-diagnostics';

export type BuildVenueDiagnosticsInput = {
  venues: readonly StoredVenue[];
  requestedAt: Date;
  generatedAt: Date;
  mode: 'current' | 'selected';
  offset: number;
  limit: number;
  totalMatched: number;
  repositories: PersistedSunRouteRepositories;
};

export async function buildVenueDiagnostics(
  input: BuildVenueDiagnosticsInput,
): Promise<VenueDiagnosticsResponse> {
  const stockholmDate = stockholmDateKey(input.requestedAt);
  const requestedMinutes = stockholmMinutes(input.requestedAt);
  const selectedMinutes = nearestPlannerMinutes(requestedMinutes);
  const selectedStepInstant = fromZonedTime(
    `${stockholmDate}T${formatPlannerTime(selectedMinutes)}:00`,
    STOCKHOLM_TIME_ZONE,
  );
  const venues: VenueDiagnosticEntry[] = [];
  const failures: VenueDiagnosticsResponse['failures'] = [];

  for (const venue of input.venues) {
    try {
      venues.push(await buildVenueDiagnosticEntry({
        venue,
        requestedAt: input.requestedAt,
        generatedAt: input.generatedAt,
        selectedMinutes,
        selectedStepInstant,
        repositories: input.repositories,
      }));
    } catch (error) {
      failures.push({
        venue: venueIdentity(venue),
        error: error instanceof SunGeometryCoverageMissingError
          ? {
              code: 'SUN_GEOMETRY_COVERAGE_MISSING',
              detail: error.detail.reason,
            }
          : {
              code: 'VENUE_DIAGNOSTIC_FAILED',
              detail: error instanceof Error ? error.message : 'Unknown diagnostic failure',
            },
      });
    }
  }

  return {
    contractVersion: VENUE_DIAGNOSTICS_CONTRACT_VERSION,
    request: {
      generatedAtUtc: input.generatedAt.toISOString(),
      requestedAtUtc: input.requestedAt.toISOString(),
      timezone: STOCKHOLM_TIME_ZONE,
      stockholmDate,
      stockholmLocalTime: formatTimeInStockholm(input.requestedAt),
      mode: input.mode,
      selectedPredictionStep: {
        minutes: selectedMinutes,
        localTime: formatPlannerTime(selectedMinutes),
        instantUtc: selectedStepInstant.toISOString(),
        signedDifferenceFromRequestedMinutes:
          (selectedStepInstant.getTime() - input.requestedAt.getTime()) / 60_000,
        selectionMethod: 'nearest-persisted-15-minute-step',
      },
    },
    pagination: {
      offset: input.offset,
      limit: input.limit,
      totalMatched: input.totalMatched,
      returned: venues.length + failures.length,
      complete: input.offset + input.venues.length >= input.totalMatched,
    },
    venues,
    failures,
  };
}

async function buildVenueDiagnosticEntry(input: {
  venue: StoredVenue;
  requestedAt: Date;
  generatedAt: Date;
  selectedMinutes: number;
  selectedStepInstant: Date;
  repositories: PersistedSunRouteRepositories;
}): Promise<VenueDiagnosticEntry> {
  const stockholmDate = stockholmDateKey(input.requestedAt);
  const geometryInput = await input.repositories.sunGeometryRepository.readCurrentGeometryInput?.(
    input.venue.id,
    stockholmDate,
    input.venue,
  );
  if (!geometryInput?.geometryInputHash || geometryInput.status !== 'ready') {
    throw new SunGeometryCoverageMissingError({
      venueId: input.venue.id,
      stockholmDate,
      geometryInputHash: geometryInput?.geometryInputHash ?? 'unavailable',
      reason: geometryInput?.status ?? 'missing-current-input',
    });
  }
  const coverage = await input.repositories.sunGeometryRepository.readCurrentCoverageForVenueDay(
    input.venue.id,
    stockholmDate,
    geometryInput.geometryInputHash,
    input.venue,
  );
  if (!coverage || coverage.series.length === 0) {
    throw new SunGeometryCoverageMissingError({
      venueId: input.venue.id,
      stockholmDate,
      geometryInputHash: geometryInput.geometryInputHash,
      reason: coverage?.status ?? 'missing',
    });
  }

  const snapshot = await input.repositories.weatherSnapshotRepository.readSnapshotForVenueDay(
    input.venue,
    undefined,
    stockholmDate,
  );
  const outcome = await buildPersistedSunOutcome(
    input.venue,
    input.requestedAt,
    input.generatedAt,
    { repositories: input.repositories },
  );
  const persistedStep = nearestStep(coverage.series, input.selectedMinutes);
  const selectedStepInstant = fromZonedTime(
    `${stockholmDate}T${formatPlannerTime(persistedStep.minutes)}:00`,
    STOCKHOLM_TIME_ZONE,
  );
  // Public provenance first admits the snapshot against the captured request
  // instant, then each persisted prediction step performs its own provider-time
  // match. Preserve both boundaries so diagnostics cannot promote evidence that
  // the public outcome rejected before gating its series.
  const admittedSnapshot = isSnapshotAdmitted(snapshot, input.requestedAt);
  const match = selectSnapshotSliceForStepWithDiagnostics({
    requestedAt: selectedStepInstant,
    slices: snapshot?.slices ?? [],
    maxStalenessMinutes: 90,
  });
  const weather: WeatherSnapshotSlice = admittedSnapshot && match.matched
    ? match.slice
    : { weatherUnknown: true };
  const engineCoordinate = venueEngineCoordinate(input.venue);
  const solar = calculateSolarPosition(
    selectedStepInstant,
    engineCoordinate.lat,
    engineCoordinate.lng,
  );
  const trace = classifyDirectSunWithTrace({
    geometryPotentialPercent: outcome.venue.sunExposurePercent,
    isSunVisible: solar.isSunVisible,
    weather: outcome.venue.sunExposurePercent > 50 ? weather : undefined,
  });
  const admissionFailure = admittedSnapshot
    ? undefined
    : snapshotAdmissionFailure(snapshot, input.requestedAt);
  const evidenceRejected = !admittedSnapshot || match.rejected;
  const rejectionReason = match.rejected ? match.rejectionReason : admissionFailure;
  const issues = collectDataQualityIssues(
    snapshot,
    evidenceRejected,
    rejectionReason,
    trace.state,
    trace.reasons,
  );
  const weightedCloud = trace.effectiveCloudCover;

  return {
    venue: venueIdentity(input.venue),
    finalResult: {
      directSunState: outcome.venue.directSunState ?? 'unknown',
      reasons: outcome.venue.directSunReasons ?? ['weather-unavailable'],
      sunExposurePercent: outcome.venue.sunExposurePercent,
      sunExposureUnit: '% of seating polygon under clear-sky geometry',
      publicVerdict: publicSunVerdictFor(outcome.venue),
      publicStatus: outcome.venue.currentSunStatus,
      weatherGateState: outcome.venue.weatherGateState,
      skyCondition: outcome.venue.skyCondition ?? 'unavailable',
    },
    geometry: {
      source: 'persisted',
      selectedResult: {
        minutes: persistedStep.minutes,
        localTime: formatPlannerTime(persistedStep.minutes),
        sunExposurePercent: persistedStep.sunExposurePercent,
        unit: '% of seating polygon under clear-sky geometry',
      },
      sunAboveHorizon: {
        value: solar.isSunVisible,
        solarElevationDegrees: solar.elevation,
        solarAzimuthDegrees: solar.azimuth,
        evaluatedAtUtc: selectedStepInstant.toISOString(),
      },
      inputHash: geometryInput.geometryInputHash,
      inputVersion: geometryInput.geometryInputHash.split(':', 1)[0] || 'unknown',
      coverage: {
        stockholmDate: coverage.stockholmDate,
        status: coverage.status ?? 'ready',
        availableStepCount: coverage.series.length,
        expectedStepCount:
          Math.floor((PLANNER_END_MINUTES - PLANNER_START_MINUTES) / PLANNER_STEP_MINUTES) + 1,
      },
      canonicalInputs: {
        engineCoordinate: { ...engineCoordinate, role: 'calculation-and-weather' },
        displayPinCoordinate: { ...input.venue.location, role: 'display-only' },
        seatingPolygon: input.venue.seatingArea
          ? {
              availability: 'available',
              outerRingPositionCount: input.venue.seatingArea.coordinates[0]?.length ?? 0,
            }
          : {
              availability: 'unavailable',
              reason: 'No seating polygon was available to this read path.',
            },
        seatingElevationMeters: optionalNumber(input.venue.seatingElevationM, 'm'),
        groundElevationRh2000Meters: optionalNumber(input.venue.groundElevationM, 'm RH2000'),
        fullPersistedInputPayload: {
          availability: 'unavailable',
          reason: 'The current read model persists the input hash, not the historical full input payload.',
        },
      },
    },
    weather: {
      snapshot: snapshotContract(snapshot, input.generatedAt),
      matching: {
        matched: match.matched,
        providerValidAtUtc: optionalString(match.providerValidAt, 'UTC ISO 8601'),
        signedDifferenceMinutes: optionalNumber(match.signedDifferenceMinutes, 'min'),
        absoluteDifferenceMinutes: optionalNumber(match.absoluteDifferenceMinutes, 'min'),
        matchingLimitMinutes: 90,
        rejected: evidenceRejected,
        rejectionReason: optionalString(rejectionReason),
      },
      selectedSlice: weatherSliceContract(
        match.matched ? match.slice : undefined,
        weightedCloud,
      ),
    },
    decision: {
      classifier: 'direct-sun-classifier',
      rules: trace.trace,
      decisiveRuleIds: trace.decisiveRuleIds,
      earlyExit: trace.earlyExit,
    },
    dataQuality: { issues },
    provenance: {
      generatedFromCurrentSavedEvidence: true,
      reconstructsEarlierBrowserResponse: false,
      explanation:
        'This response evaluates the saved geometry generation and weather snapshot available now. Compare hashes, refresh/expiry times, and provider valid time before relating it to an older browser response.',
    },
  };
}

function isSnapshotAdmitted(snapshot: WeatherSnapshotRecord | null, requestedAt: Date): boolean {
  return snapshot?.status === 'ready' &&
    typeof snapshot.weatherUpdatedAt === 'string' &&
    Number.isFinite(new Date(snapshot.weatherUpdatedAt).getTime()) &&
    hasUsableWeatherSnapshotEvidenceForStep({ requestedAt, slices: snapshot.slices });
}

function snapshotAdmissionFailure(
  snapshot: WeatherSnapshotRecord | null,
  requestedAt: Date,
): string | undefined {
  if (!snapshot) return 'snapshot-missing';
  if (snapshot.status !== 'ready') return `snapshot-${snapshot.status ?? 'missing'}`;
  if (!snapshot.weatherUpdatedAt || !Number.isFinite(new Date(snapshot.weatherUpdatedAt).getTime())) {
    return 'invalid-refresh-time';
  }
  if (!hasUsableWeatherSnapshotEvidenceForStep({ requestedAt, slices: snapshot.slices })) {
    return 'request-instant-unmatched';
  }
  return undefined;
}

function snapshotContract(snapshot: WeatherSnapshotRecord | null, generatedAt: Date) {
  const updatedAtMs = snapshot?.weatherUpdatedAt
    ? new Date(snapshot.weatherUpdatedAt).getTime()
    : Number.NaN;
  return {
    status: snapshot?.status ?? 'missing',
    bucket: optionalString(snapshot?.bucket),
    refreshedAtUtc: optionalString(snapshot?.weatherUpdatedAt, 'UTC ISO 8601'),
    expiresAtUtc: optionalString(snapshot?.expiresAt, 'UTC ISO 8601'),
    ageMinutesAtGeneration: Number.isFinite(updatedAtMs)
      ? available((generatedAt.getTime() - updatedAtMs) / 60_000, 'min')
      : unavailable<number>('No valid weather refresh timestamp was stored.'),
    ttlMinutes: 120 as const,
    sliceCount: snapshot?.slices.length ?? 0,
    normalizationIssues: snapshot?.normalizationIssues ?? [],
  };
}

function weatherSliceContract(slice: WeatherSnapshotSlice | undefined, weightedCloud: number | undefined) {
  return {
    totalCloudCoverPercent: optionalNumber(slice?.cloudCover, '%'),
    lowCloudCoverPercent: optionalNumber(slice?.cloudCoverLow, '%'),
    middleCloudCoverPercent: optionalNumber(slice?.cloudCoverMedium, '%'),
    highCloudCoverPercent: optionalNumber(slice?.cloudCoverHigh, '%'),
    weightedCloudObstructionPercent: optionalNumber(weightedCloud, '%'),
    fogAreaFractionPercent: optionalNumber(slice?.fogAreaFraction, '%'),
    precipitationAmountNextHourMm: optionalNumber(slice?.precipitationAmount, 'mm'),
    conditionSymbol: optionalString(slice?.symbolCode),
    nowcastValidAtUtc: optionalString(slice?.nowcastValidAt, 'UTC ISO 8601'),
    nowcastPrecipitationRateMmPerHour: optionalNumber(slice?.nowcastPrecipitationRate, 'mm/h'),
    isRaining: optionalBoolean(slice?.isRaining),
    weatherUnknown: optionalBoolean(slice?.weatherUnknown),
  };
}

function collectDataQualityIssues(
  snapshot: WeatherSnapshotRecord | null,
  evidenceRejected: boolean,
  rejectionReason: string | undefined,
  state: string,
  reasons: readonly string[],
): VenueDiagnosticDataQualityIssue[] {
  const issues: VenueDiagnosticDataQualityIssue[] = [];
  if (!snapshot) {
    issues.push(issue('weather', 'snapshot-missing', 'error', 'No saved weather snapshot row was found.'));
  } else if (snapshot.status !== 'ready') {
    issues.push(issue('weather', `snapshot-${snapshot.status ?? 'missing'}`, 'error', 'The saved snapshot was rejected before classification.'));
  }
  for (const normalizationIssue of snapshot?.normalizationIssues ?? []) {
    issues.push(issue(
      'weather',
      normalizationIssue.code,
      'warning',
      `Snapshot slice ${normalizationIssue.index} rejected or normalized fields: ${normalizationIssue.fields.join(', ') || 'slice'}.`,
    ));
  }
  if (evidenceRejected) {
    issues.push(issue(
      'matching',
      rejectionReason ?? 'unmatched',
      'error',
      'The saved weather evidence was rejected by snapshot admission or provider-time matching.',
    ));
  }
  for (const reason of reasons) {
    if (reason.includes('incomplete') || reason.includes('unavailable') || reason.includes('contradictory')) {
      issues.push(issue('decision', reason, state === 'unknown' ? 'warning' : 'info', `Classifier reported ${reason}.`));
    }
  }
  return issues;
}

function issue(
  source: VenueDiagnosticDataQualityIssue['source'],
  code: string,
  severity: VenueDiagnosticDataQualityIssue['severity'],
  detail: string,
): VenueDiagnosticDataQualityIssue {
  return { source, code, severity, detail };
}

function venueIdentity(venue: StoredVenue) {
  return { id: venue.id, slug: venue.slug, name: venue.venueName };
}

function nearestStep<T extends { minutes: number }>(series: readonly T[], minutes: number): T {
  return series.reduce((best, candidate) =>
    Math.abs(candidate.minutes - minutes) < Math.abs(best.minutes - minutes) ? candidate : best,
  );
}

function nearestPlannerMinutes(minutes: number): number {
  const clamped = Math.min(PLANNER_END_MINUTES, Math.max(PLANNER_START_MINUTES, minutes));
  return Math.min(
    PLANNER_END_MINUTES,
    Math.max(PLANNER_START_MINUTES, Math.round(clamped / PLANNER_STEP_MINUTES) * PLANNER_STEP_MINUTES),
  );
}

function stockholmMinutes(date: Date): number {
  const [hours, minutes] = formatTimeInStockholm(date).split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function optionalNumber(value: number | undefined, unit: string): DiagnosticValue<number> {
  return typeof value === 'number' && Number.isFinite(value)
    ? available(value, unit)
    : unavailable('Value was absent or invalid in the consumed evidence.');
}

function optionalString(value: string | undefined, timestampConvention?: string): DiagnosticValue<string> {
  return typeof value === 'string' && value.length > 0
    ? {
        availability: 'available',
        value,
        ...(timestampConvention ? { timestampConvention } : {}),
      }
    : unavailable('Value was absent from the consumed evidence.');
}

function optionalBoolean(value: boolean | undefined): DiagnosticValue<boolean> {
  return typeof value === 'boolean'
    ? available(value)
    : unavailable('Value was absent from the consumed evidence.');
}

function available<T>(value: T, unit?: string): DiagnosticValue<T> {
  return { availability: 'available', value, ...(unit ? { unit } : {}) };
}

function unavailable<T>(reason: string): DiagnosticValue<T> {
  return { availability: 'unavailable', reason };
}
