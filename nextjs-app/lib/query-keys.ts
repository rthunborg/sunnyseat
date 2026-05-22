/**
 * Centralized TanStack Query key factory.
 * Single source of truth for all query keys — never construct keys inline.
 */
export const queryKeys = {
  venues: {
    all: ['venues'] as const,
    list: (filters?: Record<string, unknown>) => {
      const normalized = normalizeQueryFilters(filters);
      return normalized === undefined
        ? [...queryKeys.venues.all, 'list'] as const
        : [...queryKeys.venues.all, 'list', normalized] as const;
    },
    detail: (slug: string) =>
      [...queryKeys.venues.all, 'detail', slug] as const,
    detailAt: (slug: string, planner?: Record<string, unknown>) => {
      const normalized = normalizeQueryFilters(planner);
      return normalized === undefined
        ? queryKeys.venues.detail(slug)
        : [...queryKeys.venues.all, 'detail', slug, normalized] as const;
    },
    planner: (filters: Record<string, unknown>) =>
      [...queryKeys.venues.all, 'planner', normalizeQueryFilters(filters)] as const,
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
} as const;

function normalizeQueryFilters(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeQueryFilters(item))
      .filter((item) => item !== undefined);
  }
  if (!isPlainObject(value)) return value;

  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    const child = normalizeQueryFilters(value[key]);
    if (child !== undefined) normalized[key] = child;
  }
  return normalized;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
