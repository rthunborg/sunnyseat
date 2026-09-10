import type {
  DirectSunReason,
  DirectSunState,
  PublicSunVerdict,
  VenueSunStatus,
  WeatherGateState,
} from '@/lib/types/api';
import type { DirectSunDecisionRuleTrace } from '@/lib/services/direct-sun-classifier';
import type { WeatherSnapshotNormalizationIssue } from '@/lib/services/weather-snapshots';

export const VENUE_DIAGNOSTICS_CONTRACT_VERSION = 'venue-diagnostics.v1' as const;

export type DiagnosticValue<T> =
  | { availability: 'available'; value: T; unit?: string; timestampConvention?: string }
  | { availability: 'unavailable'; reason: string };

export type VenueDiagnosticDataQualityIssue = {
  source: 'venue' | 'geometry' | 'weather' | 'matching' | 'decision';
  code: string;
  severity: 'info' | 'warning' | 'error';
  detail: string;
};

export type VenueDiagnosticEntry = {
  venue: {
    id: string;
    slug: string;
    name: string;
  };
  finalResult: {
    directSunState: DirectSunState;
    reasons: DirectSunReason[];
    sunExposurePercent: number;
    sunExposureUnit: '% of seating polygon under clear-sky geometry';
    publicVerdict: PublicSunVerdict;
    publicStatus: VenueSunStatus;
    weatherGateState: WeatherGateState;
    skyCondition: string;
  };
  geometry: {
    source: 'persisted';
    selectedResult: {
      minutes: number;
      localTime: string;
      sunExposurePercent: number;
      unit: '% of seating polygon under clear-sky geometry';
    };
    sunAboveHorizon: {
      value: boolean;
      solarElevationDegrees: number;
      solarAzimuthDegrees: number;
      evaluatedAtUtc: string;
    };
    inputHash: string;
    inputVersion: string;
    coverage: {
      stockholmDate: string;
      status: string;
      availableStepCount: number;
      expectedStepCount: number;
    };
    canonicalInputs: {
      engineCoordinate: { lat: number; lng: number; role: 'calculation-and-weather' };
      displayPinCoordinate: { lat: number; lng: number; role: 'display-only' };
      seatingPolygon: { availability: 'available'; outerRingPositionCount: number }
        | { availability: 'unavailable'; reason: string };
      seatingElevationMeters: DiagnosticValue<number>;
      groundElevationRh2000Meters: DiagnosticValue<number>;
      fullPersistedInputPayload: DiagnosticValue<never>;
    };
  };
  weather: {
    snapshot: {
      status: string;
      bucket: DiagnosticValue<string>;
      refreshedAtUtc: DiagnosticValue<string>;
      expiresAtUtc: DiagnosticValue<string>;
      ageMinutesAtGeneration: DiagnosticValue<number>;
      ttlMinutes: 120;
      sliceCount: number;
      normalizationIssues: WeatherSnapshotNormalizationIssue[];
    };
    matching: {
      matched: boolean;
      providerValidAtUtc: DiagnosticValue<string>;
      signedDifferenceMinutes: DiagnosticValue<number>;
      absoluteDifferenceMinutes: DiagnosticValue<number>;
      matchingLimitMinutes: 90;
      rejected: boolean;
      rejectionReason: DiagnosticValue<string>;
    };
    selectedSlice: {
      totalCloudCoverPercent: DiagnosticValue<number>;
      lowCloudCoverPercent: DiagnosticValue<number>;
      middleCloudCoverPercent: DiagnosticValue<number>;
      highCloudCoverPercent: DiagnosticValue<number>;
      weightedCloudObstructionPercent: DiagnosticValue<number>;
      fogAreaFractionPercent: DiagnosticValue<number>;
      precipitationAmountNextHourMm: DiagnosticValue<number>;
      conditionSymbol: DiagnosticValue<string>;
      nowcastValidAtUtc: DiagnosticValue<string>;
      nowcastPrecipitationRateMmPerHour: DiagnosticValue<number>;
      isRaining: DiagnosticValue<boolean>;
      weatherUnknown: DiagnosticValue<boolean>;
    };
  };
  decision: {
    classifier: 'direct-sun-classifier';
    rules: DirectSunDecisionRuleTrace[];
    decisiveRuleIds: string[];
    earlyExit: boolean;
  };
  dataQuality: {
    issues: VenueDiagnosticDataQualityIssue[];
  };
  provenance: {
    generatedFromCurrentSavedEvidence: true;
    reconstructsEarlierBrowserResponse: false;
    explanation: string;
  };
};

export type VenueDiagnosticFailure = {
  venue: { id: string; slug: string; name: string };
  error: { code: string; detail: string };
};

export type VenueDiagnosticsResponse = {
  contractVersion: typeof VENUE_DIAGNOSTICS_CONTRACT_VERSION;
  request: {
    generatedAtUtc: string;
    requestedAtUtc: string;
    timezone: 'Europe/Stockholm';
    stockholmDate: string;
    stockholmLocalTime: string;
    mode: 'current' | 'selected';
    selectedPredictionStep: {
      minutes: number;
      localTime: string;
      instantUtc: string;
      signedDifferenceFromRequestedMinutes: number;
      selectionMethod: 'nearest-persisted-15-minute-step';
    };
  };
  pagination: {
    offset: number;
    limit: number;
    totalMatched: number;
    returned: number;
    complete: boolean;
  };
  venues: VenueDiagnosticEntry[];
  failures: VenueDiagnosticFailure[];
};
