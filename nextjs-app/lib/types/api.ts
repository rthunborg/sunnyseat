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

export interface VenuesMeta {
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

export interface VenueDataDto {
  id: string; // venueId
  venueId: string;
  venueName: string;
  venueSlug: string;
  slug: string;
  neighborhood: string;
  location: CoordinatesDto;
  currentSunStatus: 'Sunny' | 'Partial' | 'Shaded';
  skyCondition?: string; // 'clear' | 'partly-cloudy' | 'overcast' | 'unavailable'
  isPartner: boolean;
  confidence: number; // 0-100
  distanceMeters: number;
  sunExposurePercent: number;
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
  state: 'Sunny' | 'Partial' | 'Shaded' | 'NoSun';
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
