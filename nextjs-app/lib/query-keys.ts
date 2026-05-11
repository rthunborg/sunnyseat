/**
 * Centralized TanStack Query key factory.
 * Single source of truth for all query keys — never construct keys inline.
 */
export const queryKeys = {
  venues: {
    all: ['venues'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.venues.all, 'list', filters] as const,
    detail: (slug: string) =>
      [...queryKeys.venues.all, 'detail', slug] as const,
    search: (query: string) =>
      [...queryKeys.venues.all, 'search', query] as const,
  },
  sun: {
    all: ['sun'] as const,
    exposure: (venueId: string, time?: string) =>
      [...queryKeys.sun.all, 'exposure', venueId, time] as const,
  },
  weather: {
    all: ['weather'] as const,
    current: () => [...queryKeys.weather.all, 'current'] as const,
  },
  premium: {
    all: ['premium'] as const,
    status: () => [...queryKeys.premium.all, 'status'] as const,
  },
} as const;
