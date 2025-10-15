import axios from 'axios';
import type { AccuracyMetrics, ProblematicVenue } from './accuracyMetricsHub';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface AccuracyTrendDataPoint {
  date: string;
  accuracyRate: number;
  feedbackCount: number;
}

export interface FeedbackSubmission {
  patioId: number;
  timestamp: string;
  actualSunny: boolean;
  predictedSunExposure?: number;
  predictedConfidence?: number;
}

export const accuracyApi = {
  /**
   * Submit user feedback for accuracy tracking
   */
  async submitFeedback(feedback: FeedbackSubmission): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/feedback`, feedback);
  },

  /**
   * Get accuracy metrics for a date range
   */
  async getAccuracyMetrics(
    startDate?: string,
    endDate?: string,
    venueId?: number
  ): Promise<AccuracyMetrics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (venueId) params.append('venueId', venueId.toString());

    const response = await axios.get<AccuracyMetrics>(
      `${API_BASE_URL}/api/feedback/metrics?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get accuracy trend over time
   */
  async getAccuracyTrend(
    startDate?: string,
    endDate?: string,
    venueId?: number
  ): Promise<AccuracyTrendDataPoint[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (venueId) params.append('venueId', venueId.toString());

    const response = await axios.get<AccuracyTrendDataPoint[]>(
      `${API_BASE_URL}/api/feedback/metrics/trend?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get list of problematic venues with low accuracy
   */
  async getProblematicVenues(
    threshold: number = 80.0,
    minFeedbackCount: number = 10
  ): Promise<ProblematicVenue[]> {
    const response = await axios.get<ProblematicVenue[]>(
      `${API_BASE_URL}/api/feedback/metrics/problematic-venues`,
      {
        params: { threshold, minFeedbackCount },
      }
    );
    return response.data;
  },

  /**
   * Check if accuracy alerts should be triggered
   */
  async getAlertStatus(
    threshold: number = 80.0,
    consecutiveDays: number = 3
  ): Promise<boolean> {
    const response = await axios.get<boolean>(
      `${API_BASE_URL}/api/feedback/alerts/status`,
      {
        params: { threshold, consecutiveDays },
      }
    );
    return response.data;
  },
};
