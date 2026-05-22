// API Request and Response Types

// ============================================================================
// Authentication Types
// ============================================================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: AdminUserInfo;
}

export interface RefreshResponse {
  accessToken: string;
  expiresAt: string;
}

export interface AdminUserInfo {
  id: number;
  username: string;
  email: string;
  role: string;
  claims: string[];
  lastLoginAt: string;
  createdAt: string;
}

// ============================================================================
// Venue Types
// ============================================================================

export type VenueSunStatus = 'Sunny' | 'Partial' | 'Shaded' | 'NoSun';

export type SunDataSource = 'weather' | 'geometry-only';

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
  skyCondition?: string; // 'clear' | 'partly-cloudy' | 'overcast' | 'unavailable'
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
  sunWindow?: {
    start: string;
    end: string;
  };
  thumbnail?: {
    alt: string;
    initials: string;
    url?: string;
  };
}

export interface VenueDetailDto extends VenueDataDto {
  description: string;
  address: string;
  openingHours: {
    display: string;
    closesAt?: string;
  };
  timeline: VenueSunTimelineDto;
  shadowWarningMinutes?: number;
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
// Feedback Types
// ============================================================================

export interface SubmitFeedbackRequest {
  venueId: number;
  userTimestamp: string; // ISO 8601
  predictedState: 'Sunny' | 'Partial' | 'Shaded';
  wasSunny: boolean;
  confidenceAtPrediction: number; // 0-100
}

export interface FeedbackResponse {
  id: number;
  venueId: number;
  userTimestamp: string;
  predictedState: string;
  wasSunny: boolean;
  confidenceAtPrediction: number;
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
