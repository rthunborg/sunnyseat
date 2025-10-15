import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { 
  LoginRequest, 
  LoginResponse, 
  AdminUser,
  SunExposureTimeline,
  SunWindow,
  TimelineComparison,
  RecommendedTime,
  TimelineQualityAssessment,
  TimelinePerformanceMetrics,
  BatchTimelineRequest,
  TimelineViewOptions
} from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // Increased timeout for timeline operations
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // For JWT cookies
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken);
              localStorage.setItem('accessToken', response.accessToken);
              originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await this.api.post('/api/auth/login', credentials);
    const data = response.data;
    
    // Store tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    
    return data;
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
    const response = await this.api.post('/api/auth/refresh', { refreshToken });
    return response.data;
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await this.api.post('/api/auth/logout', { refreshToken });
      } catch (error) {
        console.warn('Logout request failed:', error);
      }
    }
    this.clearTokens();
  }

  async getCurrentUser(): Promise<AdminUser> {
    const response: AxiosResponse<AdminUser> = await this.api.get('/api/auth/me');
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.api.post('/api/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  // Timeline API Methods (Story 2.5)
  
  /**
   * Get custom timeline for a patio
   */
  async getPatioTimeline(
    patioId: number, 
    options: {
      start?: string; // ISO string
      end?: string; // ISO string
      resolutionMinutes?: number;
    } = {}
  ): Promise<SunExposureTimeline> {
    const params = new URLSearchParams();
    if (options.start) params.append('start', options.start);
    if (options.end) params.append('end', options.end);
    if (options.resolutionMinutes) params.append('resolutionMinutes', options.resolutionMinutes.toString());
    
    const response: AxiosResponse<SunExposureTimeline> = await this.api.get(
      `/api/timeline/patio/${patioId}?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get today's timeline for a patio
   */
  async getTodayTimeline(patioId: number): Promise<SunExposureTimeline> {
    const response: AxiosResponse<SunExposureTimeline> = await this.api.get(
      `/api/timeline/patio/${patioId}/today`
    );
    return response.data;
  }

  /**
   * Get tomorrow's timeline for a patio
   */
  async getTomorrowTimeline(patioId: number): Promise<SunExposureTimeline> {
    const response: AxiosResponse<SunExposureTimeline> = await this.api.get(
      `/api/timeline/patio/${patioId}/tomorrow`
    );
    return response.data;
  }

  /**
   * Get next 12 hours timeline for a patio
   */
  async getNext12HoursTimeline(patioId: number): Promise<SunExposureTimeline> {
    const response: AxiosResponse<SunExposureTimeline> = await this.api.get(
      `/api/timeline/patio/${patioId}/next12h`
    );
    return response.data;
  }

  /**
   * Get best sun windows for a patio
   */
  async getBestSunWindows(
    patioId: number,
    options: {
      start?: string;
      end?: string;
      maxWindows?: number;
    } = {}
  ): Promise<SunWindow[]> {
    const params = new URLSearchParams();
    if (options.start) params.append('start', options.start);
    if (options.end) params.append('end', options.end);
    if (options.maxWindows) params.append('maxWindows', options.maxWindows.toString());
    
    const response: AxiosResponse<SunWindow[]> = await this.api.get(
      `/api/timeline/patio/${patioId}/windows?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get today's recommendations for a patio
   */
  async getTodayRecommendations(patioId: number): Promise<SunWindow[]> {
    const response: AxiosResponse<SunWindow[]> = await this.api.get(
      `/api/timeline/patio/${patioId}/recommendations`
    );
    return response.data;
  }

  /**
   * Generate batch timelines for multiple patios
   */
  async getBatchTimelines(request: BatchTimelineRequest): Promise<SunExposureTimeline[]> {
    const response: AxiosResponse<SunExposureTimeline[]> = await this.api.post(
      '/api/timeline/batch',
      request
    );
    return response.data;
  }

  /**
   * Compare timelines between multiple patios
   */
  async compareTimelines(
    patioIds: number[],
    startTime: string,
    endTime: string
  ): Promise<TimelineComparison> {
    const params = new URLSearchParams({
      patioIds: patioIds.join(','),
      start: startTime,
      end: endTime
    });
    
    const response: AxiosResponse<TimelineComparison> = await this.api.get(
      `/api/timeline/compare?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Find the best patio among multiple options
   */
  async findBestPatio(
    patioIds: number[],
    startTime: string,
    endTime: string
  ): Promise<RecommendedTime> {
    const params = new URLSearchParams({
      patioIds: patioIds.join(','),
      start: startTime,
      end: endTime
    });
    
    const response: AxiosResponse<RecommendedTime> = await this.api.get(
      `/api/timeline/best?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get timeline summary statistics
   */
  async getTimelineSummary(
    patioId: number,
    startTime: string,
    endTime: string
  ): Promise<any> {
    const params = new URLSearchParams({
      start: startTime,
      end: endTime
    });
    
    const response = await this.api.get(
      `/api/timeline/patio/${patioId}/summary?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Validate timeline data quality
   */
  async validateTimelineQuality(
    patioId: number,
    startTime: string,
    endTime: string
  ): Promise<TimelineQualityAssessment> {
    const params = new URLSearchParams({
      start: startTime,
      end: endTime
    });
    
    const response: AxiosResponse<TimelineQualityAssessment> = await this.api.get(
      `/api/timeline/patio/${patioId}/quality?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get timeline performance metrics
   */
  async getTimelinePerformanceMetrics(): Promise<TimelinePerformanceMetrics> {
    const response: AxiosResponse<TimelinePerformanceMetrics> = await this.api.get(
      '/api/timeline/metrics'
    );
    return response.data;
  }

  /**
   * Helper method to get timeline based on view options
   */
  async getTimelineByOptions(patioId: number, options: TimelineViewOptions): Promise<SunExposureTimeline> {
    switch (options.timeRange) {
      case 'today':
        return this.getTodayTimeline(patioId);
      case 'tomorrow':
        return this.getTomorrowTimeline(patioId);
      case 'next12h':
        return this.getNext12HoursTimeline(patioId);
      case 'custom':
        if (!options.customStart || !options.customEnd) {
          throw new Error('Custom time range requires start and end times');
        }
        return this.getPatioTimeline(patioId, {
          start: options.customStart,
          end: options.customEnd,
          resolutionMinutes: options.resolution
        });
      default:
        return this.getTodayTimeline(patioId);
    }
  }

  // Token management
  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  // Generic API methods
  async get<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.api.get(url);
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.api.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.api.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.api.delete(url);
    return response.data;
  }

  // File upload
  async uploadFile<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const response: AxiosResponse<T> = await this.api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }
}

export const apiService = new ApiService();