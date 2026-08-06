import { greatCircleMeters } from '@/lib/utils/geo';
import { publicSunVerdictFor } from '@/lib/utils/public-sun';
import type {
  CoordinatesDto,
  PublicSunVerdict,
  VenueDataDto,
  VenueSunStatus,
} from '@/lib/types/api';

const DETAIL_VIEW_PREFIX = 'sunnyseat:feedback:view:';
const SUBMITTED_PREFIX = 'sunnyseat:feedback:submitted:';
const FEEDBACK_SUBMITTED_EVENT = 'sunnyseat:feedback-submitted';
const fallbackSessionMemory = new Map<string, string>();

// Conservative visit signal: the user must have opened detail, waited at
// least ten minutes, then be physically within 150 m of the venue. The
// Gothenburg fallback is intentionally excluded by requiring status=success.
export const FEEDBACK_VISIT_RADIUS_METERS = 150;
export const FEEDBACK_VISIT_MIN_ELAPSED_MS = 10 * 60 * 1000;

export type FeedbackDetailViewRecord = {
  venueId: string;
  venueSlug: string;
  viewedAt: number;
  plannerTimestamp: string;
  predictedState?: VenueSunStatus;
  sunExposurePercent: number;
  publicSunVerdict: PublicSunVerdict;
  weatherGated: boolean;
  weatherUnknown: boolean;
  geometryInputHash?: string;
  confidenceAtPrediction?: number;
};

export type FeedbackGeolocationStatus = 'idle' | 'pending' | 'success' | 'fallback';

type VenueIdentity = Pick<
  VenueDataDto,
  | 'id'
  | 'slug'
  | 'venueSlug'
  | 'location'
  | 'currentSunStatus'
  | 'confidence'
  | 'sunExposurePercent'
  | 'weatherGateState'
  | 'predictionEvidence'
>;

export function recordVenueDetailView(
  venue: VenueIdentity,
  plannerTimestamp: string,
  now = Date.now(),
): FeedbackDetailViewRecord {
  const record = {
    venueId: venue.id,
    venueSlug: venue.slug || venue.venueSlug,
    viewedAt: now,
    plannerTimestamp,
    predictedState: venue.currentSunStatus,
    sunExposurePercent: venue.sunExposurePercent,
    publicSunVerdict: publicSunVerdictFor(venue),
    weatherGated: venue.weatherGateState === 'gated',
    weatherUnknown: venue.weatherGateState === 'unknown',
    ...(venue.predictionEvidence?.geometryInputHash
      ? { geometryInputHash: venue.predictionEvidence.geometryInputHash }
      : {}),
    // Story 12.13 transition: the public UI no longer renders confidence, but
    // feedback still needs the model's internal value until Story 12.2 replaces
    // this client-side evidence stamp.
    confidenceAtPrediction: venue.confidence,
  } satisfies FeedbackDetailViewRecord;
  safeSessionSet(detailKey(venue.id), JSON.stringify(record));
  return record;
}

export function readVenueDetailView(venueId: string): FeedbackDetailViewRecord | null {
  const raw = safeSessionGet(detailKey(venueId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<FeedbackDetailViewRecord>;
    if (
      typeof parsed.venueId !== 'string' ||
      typeof parsed.venueSlug !== 'string' ||
      typeof parsed.viewedAt !== 'number' ||
      typeof parsed.plannerTimestamp !== 'string' ||
      typeof parsed.sunExposurePercent !== 'number' ||
      !isPublicSunVerdict(parsed.publicSunVerdict) ||
      typeof parsed.weatherGated !== 'boolean' ||
      typeof parsed.weatherUnknown !== 'boolean'
    ) {
      return null;
    }
    return parsed as FeedbackDetailViewRecord;
  } catch {
    return null;
  }
}

function isPublicSunVerdict(value: unknown): value is PublicSunVerdict {
  return value === 'amber' || value === 'grey';
}

export function markVenueFeedbackSubmitted(venueId: string) {
  safeSessionSet(submittedKey(venueId), '1');
  dispatchFeedbackSubmitted(venueId);
}

export function hasSubmittedVenueFeedback(venueId: string): boolean {
  return safeSessionGet(submittedKey(venueId)) === '1';
}

export function clearFeedbackSessionMemoryForTests() {
  fallbackSessionMemory.clear();
}

export function subscribeToFeedbackSubmitted(
  listener: (venueId: string) => void,
): () => void {
  const handler = (event: Event) => {
    if (!(event instanceof CustomEvent)) return;
    const venueId = (event.detail as { venueId?: unknown }).venueId;
    if (typeof venueId === 'string') listener(venueId);
  };

  window.addEventListener(FEEDBACK_SUBMITTED_EVENT, handler);
  return () => window.removeEventListener(FEEDBACK_SUBMITTED_EVENT, handler);
}

export function isLikelyVisited({
  venue,
  geolocationStatus,
  coords,
  detailView,
  now = Date.now(),
}: {
  venue: VenueIdentity;
  geolocationStatus: FeedbackGeolocationStatus;
  coords: CoordinatesDto;
  detailView?: FeedbackDetailViewRecord | null;
  now?: number;
}): boolean {
  if (geolocationStatus !== 'success') return false;
  const visitRecord = detailView ?? readVenueDetailView(venue.id);
  if (!visitRecord) return false;
  if (now - visitRecord.viewedAt < FEEDBACK_VISIT_MIN_ELAPSED_MS) return false;
  const meters = greatCircleMeters(coords.lat, coords.lng, venue.location.lat, venue.location.lng);
  return meters <= FEEDBACK_VISIT_RADIUS_METERS;
}

function detailKey(venueId: string) {
  return `${DETAIL_VIEW_PREFIX}${venueId}`;
}

function submittedKey(venueId: string) {
  return `${SUBMITTED_PREFIX}${venueId}`;
}

function safeSessionGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key) ?? fallbackSessionMemory.get(key) ?? null;
  } catch {
    return fallbackSessionMemory.get(key) ?? null;
  }
}

function safeSessionSet(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    fallbackSessionMemory.set(key, value);
    // Disabled sessionStorage should not break the detail screen.
  }
}

function dispatchFeedbackSubmitted(venueId: string) {
  window.dispatchEvent(new CustomEvent(FEEDBACK_SUBMITTED_EVENT, {
    detail: { venueId },
  }));
}
