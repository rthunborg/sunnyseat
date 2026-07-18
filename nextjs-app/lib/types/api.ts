// API Request and Response Types

// ============================================================================
// Venue Types
// ============================================================================

// STORY 10.1 (AC1): `CloudObscured` is the weather-gated headline state. It is
// applied ONLY on the opt-in real-engine path when a venue is geometrically
// sunlit (`Sunny`/`Partial`) but effective cloud cover meets the gate threshold.
// The geometric layer (`sunExposurePercent`, `sunWindow`, `peakTime`) keeps its
// clear-sky meaning; this union value is an ADDITIVE second signal, not a
// geometric tier. Story 10.2 owns the muted UI rendering of this value.
export type VenueSunStatus = 'Sunny' | 'Partial' | 'Shaded' | 'NoSun' | 'CloudObscured';

// STORY 11.1 (AC1): one gated per-planner-step entry of the client-side
// day-series. `minutes` is the planner minutes-of-day (06:00 → 360 … 21:00 →
// 1260, at PLANNER_STEP_MINUTES resolution). `sunExposurePercent` keeps its ONE
// geometric clear-sky meaning; `currentSunStatus` is the ALREADY weather-gated
// (Epic-10 cloud/rain gate applied per step) headline the client renders
// directly — the client NEVER re-gates. Populated ONLY on the real-engine list
// path; the client derives marker %, pin state, quick-info, list ordering and
// the obscured presentation for ANY planner time from this cached series, so a
// settled time change issues zero network requests.
export interface VenueDaySeriesEntry {
  minutes: number;
  sunExposurePercent: number;
  currentSunStatus: VenueSunStatus;
  /**
   * STORY 11 (review): the per-step gated sky condition (same values as the
   * top-level `VenueDataDto.skyCondition`). Carried so a time scrub can override
   * the obscured sub-line to track the scrubbed step, instead of freezing at the
   * server single-instant sky phrase (a clear→obscured self-contradiction — the
   * Epic-10 honesty class). Optional so the DTO stays byte-compatible with
   * consumers that predate this field.
   */
  skyCondition?: string;
}

// STORY 11.9 (AC2): a single weekday's opening interval. `close < open` ⇒ the
// venue closes PAST MIDNIGHT (opens 18:00 closes 02:00). Times are HH:MM strings.
export interface OpeningInterval {
  open: string;
  close: string;
}

// STORY 11.9 (AC2): venue opening hours as a PER-WEEKDAY structure, keyed by
// numeric ISO weekday as a string (`"1"`=Mon .. `"7"`=Sun). A MISSING key OR a
// `null` value = CLOSED that day. This is the shape stored in
// `public.venues.opening_hours` (jsonb) and carried on the list + detail DTOs; the
// render layer DERIVES the "Öppet till HH:MM" line + the ÖPPET badge's close from
// it via `lib/utils/opening-hours.ts#formatOpeningHours`. The old pre-localized
// `{ display, closesAt }` string is GONE (never store a fabricated display).
export type WeeklyOpeningHours = Partial<Record<string, OpeningInterval | null>>;

export type SunDataSource = 'weather' | 'geometry-only';

export type PredictionUncertaintyLevel = 'low' | 'medium' | 'high';

export type PredictionUncertaintyReason =
  | 'building_shadow_coverage'
  | 'vegetation'
  | 'awning'
  | 'umbrella'
  | 'bridge'
  | 'temporary_structure'
  | 'seasonal_furniture'
  | 'weather'
  | 'other';

export interface PredictionUncertaintyDto {
  level: PredictionUncertaintyLevel;
  reasons: PredictionUncertaintyReason[];
}

export interface SunFreshnessMeta {
  weatherUpdatedAt?: string;
  sunDataSource?: SunDataSource;
}

export interface VenuesMeta extends SunFreshnessMeta {
  count: number;
  radiusKm: number;
  weatherUpdatedAt?: string;
}

export interface GetVenuesResponse {
  venues: VenueDataDto[];
  meta: VenuesMeta;
  timestamp: string;
  totalCount: number;
}

export interface GetVenueDetailResponse {
  venue: VenueDetailDto;
  meta?: SunFreshnessMeta;
  timestamp: string;
}

export interface VenueDataDto {
  id: string; // venueId
  venueId: string;
  venueName: string;
  venueSlug: string;
  slug: string;
  neighborhood: string;
  location: CoordinatesDto;
  currentSunStatus: VenueSunStatus;
  skyCondition?: string; // 'clear' | 'partly-cloudy' | 'overcast' | 'rain' | 'unavailable'
  isPartner: boolean;
  /**
   * Prediction certainty, 0..100. This is not the amount of direct sun.
   * Weather freshness/source metadata decides whether the value is exact,
   * approximate, or hidden in the UI.
   */
  confidence: number;
  distanceMeters: number;
  /**
   * Direct-sun amount, 0..100. This powers pins, hero badges, and "X% sol"
   * surfaces, while confidence remains a trust/certainty metric.
   */
  sunExposurePercent: number;
  /**
   * User-facing amenity/attribute tags (Story 9.7 tag filtering). Sourced from
   * the real `public.venues.tags` column, NOT the fabricated
   * `venue-visual-metadata.ts` placeholder. Canonical Swedish values; the chip
   * UI localizes the DISPLAY via `localizeTag`, but filter matching always uses
   * the canonical stored value. Required + always an array: `[]` means "no tags"
   * (a venue with `[]` is only ever hidden when a chip is active and it matches
   * none — the graceful-empty / show-all-when-nothing-selected default).
   */
  tags: string[];
  /**
   * Public, user-safe uncertainty metadata. Values intentionally describe
   * user-facing uncertainty causes and must not expose source/geodata internals.
   */
  predictionUncertainty?: PredictionUncertaintyDto;
  sunWindow?: {
    start: string;
    end: string;
  };
  /**
   * STORY 11.1 (AC1): the per-planner-step gated day-series, one entry per
   * PLANNER_STEP_MINUTES across the planner range (06:00–21:00). OPTIONAL and
   * populated ONLY on the real-engine list path (`/api/venues`, `useRealEngine`
   * branch) — the default seed/fixture path and the `[slug]` detail DTO stay
   * byte-identical (no `sunDaySeries`). The client derives all time-dependent UI
   * from this series so a settled time scrub fetches nothing.
   */
  sunDaySeries?: VenueDaySeriesEntry[];
  /**
   * STORY 11.9 (AC2): the venue's real opening hours as a PER-WEEKDAY structure
   * (numeric ISO weekday keys `"1"`=Mon .. `"7"`=Sun; a missing key or `null`
   * value = CLOSED that day; `close < open` = a PAST-MIDNIGHT close). Surfaced on
   * the LIST DTO (Story 11.4) so the quick-info card can DERIVE a single honest
   * "Öppet till HH:MM" line for the current Stockholm weekday via
   * `lib/utils/opening-hours.ts#formatOpeningHours`. OPTIONAL + present ONLY where
   * the store carries `venues.opening_hours` — a venue without opening hours OMITS
   * this field, and the card renders nothing (NEVER a fabricated value). The
   * pre-localized `{ display, closesAt }` STRING that used to live here is GONE —
   * the render layer derives the display + today's close at render time.
   * Detail uses the same optional contract so whole-field unknown remains
   * distinguishable from seven explicitly closed weekdays.
   */
  openingHours?: WeeklyOpeningHours;
  thumbnail?: {
    alt: string;
    initials: string;
    url?: string;
  };
  reviewSummary?: ReviewSummaryDto;
}

export interface VenueDetailDto extends VenueDataDto {
  description: string;
  address: string;
  // STORY 12.1 (AC6): optional on detail as well as list. Whole-field unknown
  // omits the field; a present per-weekday structure remains unchanged. The
  // detail render derives the ÖPPET badge + Öppettider row from the CURRENT
  // Stockholm weekday. STORY 11.9 (AC4): `shadowWarningMinutes` is REMOVED — it was
  // carried store→DTO but rendered nowhere (its only readers were tests).
  openingHours?: WeeklyOpeningHours;
  timeline: VenueSunTimelineDto;
}

export interface VenueSunTimelineDto {
  timezone: 'Europe/Stockholm';
  range: {
    start: string;
    end: string;
  };
  windows: VenueSunTimelineWindowDto[];
  peakTime?: string;
}

export interface VenueSunTimelineWindowDto {
  start: string;
  end: string;
  status: VenueDataDto['currentSunStatus'];
}

export interface CoordinatesDto {
  lat: number;
  lng: number;
}

// ============================================================================
// Review Types
// ============================================================================

export interface ReviewPhotoAttachmentDto {
  name: string;
  type: string;
  size: number;
  lastModified?: number;
}

export interface ReviewDto {
  id: string;
  venueId: string;
  venueSlug: string;
  text: string;
  rating?: number;
  photo?: ReviewPhotoAttachmentDto;
  createdAt: string;
}

export interface ReviewSummaryDto {
  averageRating: number | null;
  reviewCount: number;
}

export interface GetReviewsResponse {
  reviews: ReviewDto[];
  summary: ReviewSummaryDto;
  timestamp: string;
}

export interface SubmitReviewRequest {
  venueId?: string;
  venueSlug?: string;
  text: string;
  rating?: number;
  photo?: ReviewPhotoAttachmentDto;
}

export interface SubmitReviewResponse {
  review: ReviewDto;
  summary: ReviewSummaryDto;
  timestamp: string;
}

// ============================================================================
// Feedback Types
// ============================================================================

export interface SubmitFeedbackRequest {
  venueId?: string;
  venueSlug?: string;
  userTimestamp: string; // ISO 8601
  predictedState: VenueSunStatus;
  sunAccuracy?: FeedbackSunAccuracy;
  wasSunny?: boolean;
  outdoorSeatingConfirmed?: boolean;
  confidenceAtPrediction?: number; // 0-100
  note?: string;
}

export type FeedbackSunAccuracy = 'sunny' | 'not_sunny' | 'unsure';

export interface FeedbackResponse {
  id: string;
  venueId: string;
  venueSlug: string;
  userTimestamp: string;
  predictedState: VenueSunStatus;
  sunAccuracy?: FeedbackSunAccuracy;
  wasSunny?: boolean;
  outdoorSeatingConfirmed?: boolean;
  confidenceAtPrediction?: number;
  note?: string;
  createdAt: string;
}

// General app-experience feedback (star rating + optional comment), distinct
// from the per-venue sun-accuracy feedback above. Submitted from the settings
// modal; persisted to the write-only `app_feedback` sink.
export interface SubmitAppFeedbackRequest {
  rating: number; // 1-5 stars
  comment?: string;
  locale?: string;
}

export interface AppFeedbackResponse {
  id: string;
  rating: number;
  comment?: string;
  locale?: string;
  createdAt: string;
}

export interface QueryFeedbackRequest {
  venueId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AccuracyMetricsResponse {
  totalFeedback: number;
  accuratePredictions: number;
  accuracyPercentage: number;
  averageConfidence: number;
  startDate: string;
  endDate: string;
}

export interface AccuracyTrendResponse {
  dailyMetrics: Array<{
    date: string;
    accuracyPercentage: number;
    totalFeedback: number;
  }>;
}

export interface ProblematicVenueResponse {
  venueId: number;
  venueName: string;
  accuracyPercentage: number;
  feedbackCount: number;
}

// ============================================================================
// Sun Exposure Types
// ============================================================================

export interface VenueSunExposureResponse {
  venueId: number;
  timestamp: string;
  state: VenueSunStatus;
  sunExposurePercent: number;
  confidence: number;
  solarElevation: number;
  solarAzimuth: number;
  weatherData?: WeatherDataDto;
}

export interface WeatherDataDto {
  cloudCover: number;
  temperature: number;
  precipitationProbability: number;
  visibility?: number;
  source: string;
  isForecast: boolean;
}

export interface SunExposureReliabilityInfo {
  timestamp: string;
  isReliable: boolean;
  reliabilityScore: number;
  reliabilityCategory: 'High' | 'Medium' | 'Low';
  notes: string;
}

// ============================================================================
// Error Response Types
// ============================================================================

export interface ErrorResponse {
  error: string;
  code?: string;
  detail?: string;
  statusCode: number;
}

export interface ValidationErrorResponse {
  title: string;
  detail: string;
  status: number;
  errors?: Record<string, string[]>;
}
