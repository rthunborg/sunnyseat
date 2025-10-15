// services/api/client.ts
import { APP_CONFIG } from '../../constants/config';
import { ApiError } from '../../types/api';

class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = APP_CONFIG.apiBaseUrl;
    this.timeout = APP_CONFIG.apiTimeout;
  }

  async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
    const url = new URL(endpoint, window.location.origin + this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          code: 'UNKNOWN_ERROR',
          message: 'An unknown error occurred',
        }));
        throw new Error(error.message);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error('An unknown error occurred');
    }
  }
}

export const apiClient = new ApiClient();
