// constants/config.ts
export const APP_CONFIG = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  apiTimeout: 10000, // 10 seconds
  cacheStaleTime: 5 * 60 * 1000, // 5 minutes
  requestDebounceMs: 300,
} as const;
