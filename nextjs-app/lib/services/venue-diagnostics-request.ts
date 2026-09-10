import { parseVenuePlannerParams } from '@/lib/services/venue-planner';
import { resolveRequestedAt } from '@/lib/services/sun-engine';
import { isSafePublicVenueIdentifier } from '@/lib/services/venue-store';

const ALLOWED_PARAMETERS = new Set(['venue', 'date', 'time', 'offset', 'limit']);
const MAX_IDENTIFIER_LENGTH = 80;
export const VENUE_DIAGNOSTICS_MAX_LIMIT = 100;

export type VenueDiagnosticsRequest = {
  venueIdentifier?: string;
  requestedAt: Date;
  mode: 'current' | 'selected';
  offset: number;
  limit: number;
};

export type VenueDiagnosticsRequestResult =
  | { ok: true; value: VenueDiagnosticsRequest }
  | { ok: false; detail: string };

export function parseVenueDiagnosticsRequest(
  params: URLSearchParams,
  now: Date,
): VenueDiagnosticsRequestResult {
  for (const key of params.keys()) {
    if (!ALLOWED_PARAMETERS.has(key)) {
      return { ok: false, detail: `Unknown query parameter: ${key}` };
    }
  }

  const venueValues = params.getAll('venue');
  if (venueValues.length > 1) {
    return { ok: false, detail: 'Use a single venue parameter' };
  }
  const venueIdentifier = venueValues[0]?.trim();
  if (
    venueIdentifier !== undefined &&
    (!venueIdentifier ||
      Array.from(venueIdentifier).length > MAX_IDENTIFIER_LENGTH ||
      !isSafePublicVenueIdentifier(venueIdentifier))
  ) {
    return { ok: false, detail: 'Invalid venue identifier' };
  }

  const planner = parseVenuePlannerParams(params, now);
  if (!planner.ok) return { ok: false, detail: planner.detail };
  const offset = parseBoundedInteger(params, 'offset', 0, 10_000, 0);
  if (!offset.ok) return offset;
  const limit = parseBoundedInteger(
    params,
    'limit',
    1,
    VENUE_DIAGNOSTICS_MAX_LIMIT,
    VENUE_DIAGNOSTICS_MAX_LIMIT,
  );
  if (!limit.ok) return limit;

  return {
    ok: true,
    value: {
      ...(venueIdentifier ? { venueIdentifier } : {}),
      requestedAt: resolveRequestedAt(planner.selection, now),
      mode: planner.selection ? 'selected' : 'current',
      offset: offset.value,
      limit: limit.value,
    },
  };
}

function parseBoundedInteger(
  params: URLSearchParams,
  name: string,
  minimum: number,
  maximum: number,
  fallback: number,
): { ok: true; value: number } | { ok: false; detail: string } {
  const values = params.getAll(name);
  if (values.length === 0) return { ok: true, value: fallback };
  if (values.length !== 1 || !/^\d+$/u.test(values[0] ?? '')) {
    return { ok: false, detail: `${name} must be a single integer` };
  }
  const value = Number(values[0]);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    return { ok: false, detail: `${name} must be between ${minimum} and ${maximum}` };
  }
  return { ok: true, value };
}
