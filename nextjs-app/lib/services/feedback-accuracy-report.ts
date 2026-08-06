import { publicSunVerdictFor } from '@/lib/utils/public-sun';
import type { FeedbackSunAccuracy, PublicSunVerdict, WeatherGateState } from '@/lib/types/api';

const GEOMETRY_INPUT_HASH_PATTERN = /^g[0-9]+:[0-9a-f]{64}$/u;

export type FeedbackAccuracyFeedbackRow = {
  venue_id: string | null;
  venue_slug: string | null;
  user_timestamp: string | null;
  predicted_state: string | null;
  sun_accuracy: string | null;
  sun_exposure_percent: number | null;
  public_sun_verdict: string | null;
  weather_gated: boolean | null;
  weather_unknown: boolean | null;
  geometry_input_hash: string | null;
};

export type FeedbackAccuracyVenueRow = {
  venue_id: string;
  venue_slug: string;
  venue_name: string;
  area: string;
  current_geometry_input_hash: string | null;
};

export type FeedbackAccuracyVenueReport = {
  venue_id: string;
  venue_slug: string;
  venue_name: string;
  area: string;
  current_geometry_input_hash: string | null;
  current_sample_count: number;
  agreement_count: number;
  disagreement_count: number;
  agreement_rate: number | null;
  disagreement_rate: number | null;
  unsure_count: number;
  legacy_unscored_count: number;
  stale_hash_count: number;
  invalid_evidence_count: number;
  latest_feedback_at: string | null;
  latest_disagreeing_feedback_at: string | null;
  representative_wrong_windows: string[];
};

export type FeedbackAccuracyAreaReport = {
  area: string;
  venue_count: number;
  current_sample_count: number;
  agreement_count: number;
  disagreement_count: number;
  agreement_rate: number | null;
  disagreement_rate: number | null;
  unsure_count: number;
  legacy_unscored_count: number;
  stale_hash_count: number;
  invalid_evidence_count: number;
  latest_feedback_at: string | null;
  latest_disagreeing_feedback_at: string | null;
  representative_wrong_windows: string[];
  venues: Array<{
    venue_id: string;
    venue_slug: string;
    venue_name: string;
    disagreement_count: number;
  }>;
};

export type FeedbackAccuracyReport = {
  generated_at: string;
  minimum_sample_count: number;
  areas: FeedbackAccuracyAreaReport[];
  venues: FeedbackAccuracyVenueReport[];
};

export function buildFeedbackAccuracyReport({
  venues,
  feedback,
  minimumSampleCount = 1,
  generatedAt = new Date().toISOString(),
}: {
  venues: readonly FeedbackAccuracyVenueRow[];
  feedback: readonly FeedbackAccuracyFeedbackRow[];
  minimumSampleCount?: number;
  generatedAt?: string;
}): FeedbackAccuracyReport {
  const feedbackByVenue = new Map<string, FeedbackAccuracyFeedbackRow[]>();
  for (const row of feedback) {
    const venueId = row.venue_id?.trim();
    if (!venueId) continue;
    const rows = feedbackByVenue.get(venueId) ?? [];
    rows.push(row);
    feedbackByVenue.set(venueId, rows);
  }

  const scoredVenues = venues.map((venue) => scoreVenue(venue, feedbackByVenue.get(venue.venue_id) ?? []));
  const reports = scoredVenues
    .filter((report) => report.current_sample_count >= minimumSampleCount)
    .sort(compareVenueReports);
  const areaReports = buildAreaReports(scoredVenues)
    .filter((report) => report.current_sample_count >= minimumSampleCount)
    .sort(compareAreaReports);

  return {
    generated_at: generatedAt,
    minimum_sample_count: minimumSampleCount,
    areas: areaReports,
    venues: reports,
  };
}

function scoreVenue(
  venue: FeedbackAccuracyVenueRow,
  rows: readonly FeedbackAccuracyFeedbackRow[],
): FeedbackAccuracyVenueReport {
  let agreementCount = 0;
  let disagreementCount = 0;
  let unsureCount = 0;
  let legacyUnscoredCount = 0;
  let staleHashCount = 0;
  let invalidEvidenceCount = 0;
  let latestFeedbackAt: string | null = null;
  let latestDisagreeingFeedbackAt: string | null = null;
  const wrongWindows = new Set<string>();

  for (const row of rows) {
    try {
      const timestamp = normalizeTimestamp(row.user_timestamp);
      if (timestamp && (!latestFeedbackAt || timestamp > latestFeedbackAt)) {
        latestFeedbackAt = timestamp;
      }

      const evidenceResult = parseEvidence(row);
      if (evidenceResult.kind === 'legacy') {
        legacyUnscoredCount += 1;
        continue;
      }
      if (evidenceResult.kind === 'invalid') {
        invalidEvidenceCount += 1;
        continue;
      }
      const { evidence } = evidenceResult;
      if (
        !venue.current_geometry_input_hash ||
        evidence.geometry_input_hash !== venue.current_geometry_input_hash
      ) {
        staleHashCount += 1;
        continue;
      }

      const sunAccuracy = normalizeSunAccuracy(row.sun_accuracy);
      if (!sunAccuracy) {
        legacyUnscoredCount += 1;
        continue;
      }
      if (sunAccuracy === 'unsure') {
        unsureCount += 1;
        continue;
      }

      const weatherGateState = weatherGateStateFromEvidence(evidence);
      const expectedVerdict = publicSunVerdictFor({
        sunExposurePercent: evidence.sun_exposure_percent,
        weatherGateState,
      });
      if (evidence.public_sun_verdict !== expectedVerdict) {
        invalidEvidenceCount += 1;
        continue;
      }

      if (doesFeedbackAgree(evidence.public_sun_verdict, sunAccuracy)) {
        agreementCount += 1;
      } else {
        disagreementCount += 1;
        if (timestamp) {
          wrongWindows.add(representativeWindow(timestamp));
          if (!latestDisagreeingFeedbackAt || timestamp > latestDisagreeingFeedbackAt) {
            latestDisagreeingFeedbackAt = timestamp;
          }
        }
      }
    } catch {
      invalidEvidenceCount += 1;
    }
  }

  const currentSampleCount = agreementCount + disagreementCount;
  const agreementRate =
    currentSampleCount === 0 ? null : roundRate(agreementCount / currentSampleCount);
  const disagreementRate =
    currentSampleCount === 0 ? null : roundRate(disagreementCount / currentSampleCount);

  return {
    venue_id: venue.venue_id,
    venue_slug: venue.venue_slug,
    venue_name: venue.venue_name,
    area: venue.area,
    current_geometry_input_hash: venue.current_geometry_input_hash,
    current_sample_count: currentSampleCount,
    agreement_count: agreementCount,
    disagreement_count: disagreementCount,
    agreement_rate: agreementRate,
    disagreement_rate: disagreementRate,
    unsure_count: unsureCount,
    legacy_unscored_count: legacyUnscoredCount,
    stale_hash_count: staleHashCount,
    invalid_evidence_count: invalidEvidenceCount,
    latest_feedback_at: latestFeedbackAt,
    latest_disagreeing_feedback_at: latestDisagreeingFeedbackAt,
    representative_wrong_windows: [...wrongWindows].sort(),
  };
}

function parseEvidence(row: FeedbackAccuracyFeedbackRow): (
  | {
      kind: 'complete';
      evidence: {
  sun_exposure_percent: number;
  public_sun_verdict: PublicSunVerdict;
  weather_gated: boolean;
  weather_unknown: boolean;
  geometry_input_hash: string;
      };
    }
  | { kind: 'legacy' }
  | { kind: 'invalid' }
) {
  const sunExposurePercent = row.sun_exposure_percent;
  const hasAnyEvidence =
    sunExposurePercent !== null ||
    row.public_sun_verdict !== null ||
    row.weather_gated !== null ||
    row.weather_unknown !== null ||
    row.geometry_input_hash !== null;

  if (!hasAnyEvidence) {
    return { kind: 'legacy' };
  }

  if (
    typeof sunExposurePercent !== 'number' ||
    !Number.isInteger(sunExposurePercent) ||
    sunExposurePercent < 0 ||
    sunExposurePercent > 100 ||
    !isPublicSunVerdict(row.public_sun_verdict) ||
    typeof row.weather_gated !== 'boolean' ||
    typeof row.weather_unknown !== 'boolean' ||
    !row.geometry_input_hash ||
    !GEOMETRY_INPUT_HASH_PATTERN.test(row.geometry_input_hash)
  ) {
    return { kind: 'invalid' };
  }
  if (row.weather_gated && row.weather_unknown) {
    return { kind: 'invalid' };
  }
  return {
    kind: 'complete',
    evidence: {
    sun_exposure_percent: sunExposurePercent,
    public_sun_verdict: row.public_sun_verdict,
    weather_gated: row.weather_gated,
    weather_unknown: row.weather_unknown,
    geometry_input_hash: row.geometry_input_hash,
    },
  };
}

function weatherGateStateFromEvidence(
  evidence: {
    weather_gated: boolean;
    weather_unknown: boolean;
  },
): WeatherGateState {
  if (evidence.weather_gated) return 'gated';
  if (evidence.weather_unknown) return 'unknown';
  return 'not_gated';
}

function normalizeSunAccuracy(value: string | null): FeedbackSunAccuracy | null {
  return value === 'sunny' || value === 'not_sunny' || value === 'unsure'
    ? value
    : null;
}

function isPublicSunVerdict(value: unknown): value is PublicSunVerdict {
  return value === 'amber' || value === 'grey';
}

function doesFeedbackAgree(
  publicSunVerdict: PublicSunVerdict,
  sunAccuracy: Exclude<FeedbackSunAccuracy, 'unsure'>,
): boolean {
  return (
    (publicSunVerdict === 'amber' && sunAccuracy === 'sunny') ||
    (publicSunVerdict === 'grey' && sunAccuracy === 'not_sunny')
  );
}

function normalizeTimestamp(value: string | null): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function representativeWindow(timestamp: string): string {
  const date = new Date(timestamp);
  const hour = date.getUTCHours().toString().padStart(2, '0');
  return `${hour}:00-${hour}:59Z`;
}

function compareVenueReports(
  left: FeedbackAccuracyVenueReport,
  right: FeedbackAccuracyVenueReport,
): number {
  const disagreementRateDelta =
    sortableRate(right.disagreement_rate) - sortableRate(left.disagreement_rate);
  if (disagreementRateDelta !== 0) return disagreementRateDelta;

  const disagreementCountDelta = right.disagreement_count - left.disagreement_count;
  if (disagreementCountDelta !== 0) return disagreementCountDelta;

  const recencyDelta =
    sortableTimestamp(right.latest_disagreeing_feedback_at) -
    sortableTimestamp(left.latest_disagreeing_feedback_at);
  if (recencyDelta !== 0) return recencyDelta;

  return `${left.venue_id}:${left.venue_slug}`.localeCompare(
    `${right.venue_id}:${right.venue_slug}`,
    'sv-SE',
  );
}

function buildAreaReports(
  venues: readonly FeedbackAccuracyVenueReport[],
): FeedbackAccuracyAreaReport[] {
  const byArea = new Map<string, FeedbackAccuracyVenueReport[]>();
  for (const venue of venues) {
    const area = venue.area.trim() || 'Okänt område';
    const entries = byArea.get(area) ?? [];
    entries.push(venue);
    byArea.set(area, entries);
  }

  return [...byArea.entries()].map(([area, areaVenues]) => {
    const currentSampleCount = sumBy(areaVenues, 'current_sample_count');
    const agreementCount = sumBy(areaVenues, 'agreement_count');
    const disagreementCount = sumBy(areaVenues, 'disagreement_count');
    return {
      area,
      venue_count: areaVenues.length,
      current_sample_count: currentSampleCount,
      agreement_count: agreementCount,
      disagreement_count: disagreementCount,
      agreement_rate:
        currentSampleCount === 0 ? null : roundRate(agreementCount / currentSampleCount),
      disagreement_rate:
        currentSampleCount === 0 ? null : roundRate(disagreementCount / currentSampleCount),
      unsure_count: sumBy(areaVenues, 'unsure_count'),
      legacy_unscored_count: sumBy(areaVenues, 'legacy_unscored_count'),
      stale_hash_count: sumBy(areaVenues, 'stale_hash_count'),
      invalid_evidence_count: sumBy(areaVenues, 'invalid_evidence_count'),
      latest_feedback_at: latestTimestamp(areaVenues.map((venue) => venue.latest_feedback_at)),
      latest_disagreeing_feedback_at: latestTimestamp(
        areaVenues.map((venue) => venue.latest_disagreeing_feedback_at),
      ),
      representative_wrong_windows: [
        ...new Set(areaVenues.flatMap((venue) => venue.representative_wrong_windows)),
      ].sort(),
      venues: areaVenues
        .filter((venue) => venue.disagreement_count > 0)
        .sort(compareVenueReports)
        .map((venue) => ({
          venue_id: venue.venue_id,
          venue_slug: venue.venue_slug,
          venue_name: venue.venue_name,
          disagreement_count: venue.disagreement_count,
        })),
    };
  });
}

function compareAreaReports(
  left: FeedbackAccuracyAreaReport,
  right: FeedbackAccuracyAreaReport,
): number {
  const disagreementRateDelta =
    sortableRate(right.disagreement_rate) - sortableRate(left.disagreement_rate);
  if (disagreementRateDelta !== 0) return disagreementRateDelta;

  const disagreementCountDelta = right.disagreement_count - left.disagreement_count;
  if (disagreementCountDelta !== 0) return disagreementCountDelta;

  const recencyDelta =
    sortableTimestamp(right.latest_disagreeing_feedback_at) -
    sortableTimestamp(left.latest_disagreeing_feedback_at);
  if (recencyDelta !== 0) return recencyDelta;

  return left.area.localeCompare(right.area, 'sv-SE');
}

function sumBy(
  venues: readonly FeedbackAccuracyVenueReport[],
  field: keyof Pick<
    FeedbackAccuracyVenueReport,
    | 'current_sample_count'
    | 'agreement_count'
    | 'disagreement_count'
    | 'unsure_count'
    | 'legacy_unscored_count'
    | 'stale_hash_count'
    | 'invalid_evidence_count'
  >,
): number {
  return venues.reduce((sum, venue) => sum + venue[field], 0);
}

function latestTimestamp(values: readonly (string | null)[]): string | null {
  return values.reduce<string | null>((latest, value) => {
    if (!value) return latest;
    return !latest || value > latest ? value : latest;
  }, null);
}

function sortableRate(value: number | null): number {
  return typeof value === 'number' ? value : -1;
}

function sortableTimestamp(value: string | null): number {
  return value ? Date.parse(value) : 0;
}

function roundRate(value: number): number {
  return Math.round(value * 10000) / 10000;
}
