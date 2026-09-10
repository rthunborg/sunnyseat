import { NextRequest, NextResponse } from 'next/server';
import {
  authorizeVenueDiagnosticsOwner,
  type VenueDiagnosticsAuthorization,
} from '@/lib/services/venue-diagnostics-auth';
import { buildVenueDiagnostics } from '@/lib/services/venue-diagnostics';
import { parseVenueDiagnosticsRequest } from '@/lib/services/venue-diagnostics-request';
import {
  getVenues,
  type StoredVenue,
} from '@/lib/services/venue-store';
import {
  preparePersistedSunRouteRepositoriesForVenueDays,
  type PersistedSunRouteRepositories,
} from '@/lib/services/sun-geometry-repository';
import { stockholmDateKey } from '@/lib/utils/time-planner';

const PRIVATE_RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  Vary: 'Authorization, Cookie',
} as const;

type Authorizer = (request: Request) => Promise<VenueDiagnosticsAuthorization>;
type RepositoryPreparer = (
  venues: readonly StoredVenue[],
  stockholmDate: string,
) => Promise<PersistedSunRouteRepositories>;

let authorizerForRoute: Authorizer = authorizeVenueDiagnosticsOwner;
let venueLoaderForRoute: typeof getVenues = getVenues;
const prepareDiagnosticRepositories: RepositoryPreparer = (venues, stockholmDate) =>
  preparePersistedSunRouteRepositoriesForVenueDays(venues, stockholmDate, {
    includeDiagnostics: true,
  });
let repositoryPreparerForRoute: RepositoryPreparer = prepareDiagnosticRepositories;
let clockForRoute = (): Date => new Date();

export function __setVenueDiagnosticsRouteDependenciesForTests(overrides?: {
  authorizer?: Authorizer;
  venueLoader?: typeof getVenues;
  repositoryPreparer?: RepositoryPreparer;
  clock?: () => Date;
}): void {
  authorizerForRoute = overrides?.authorizer ?? authorizeVenueDiagnosticsOwner;
  venueLoaderForRoute = overrides?.venueLoader ?? getVenues;
  repositoryPreparerForRoute = overrides?.repositoryPreparer
    ?? prepareDiagnosticRepositories;
  clockForRoute = overrides?.clock ?? (() => new Date());
}

async function getVenueDiagnosticsHandler(request: NextRequest): Promise<NextResponse> {
  const authorization = await authorizerForRoute(request);
  if (authorization.status !== 'authorized') {
    const status = authorization.status === 'unconfigured'
      ? 503
      : authorization.status === 'forbidden'
        ? 403
        : 401;
    const code = authorization.status === 'unconfigured'
      ? 'OWNER_AUTH_NOT_CONFIGURED'
      : authorization.status === 'forbidden'
        ? 'FORBIDDEN'
        : 'UNAUTHORIZED';
    const response = privateJson({ code, status }, status);
    if (status === 401) {
      response.headers.set('WWW-Authenticate', 'Bearer realm="SunnySeat owner diagnostics"');
    }
    return response;
  }

  const generatedAt = clockForRoute();
  const parsed = parseVenueDiagnosticsRequest(request.nextUrl.searchParams, generatedAt);
  if (!parsed.ok) {
    return privateJson({ code: 'INVALID_REQUEST', detail: parsed.detail, status: 400 }, 400);
  }

  const allVenues = await venueLoaderForRoute();
  const matchingVenues = parsed.value.venueIdentifier
    ? allVenues.filter((venue) => matchesEitherIdentifier(venue, parsed.value.venueIdentifier!))
    : allVenues;
  if (parsed.value.venueIdentifier && matchingVenues.length === 0) {
    return privateJson({ code: 'VENUE_NOT_FOUND', status: 404 }, 404);
  }
  const page = matchingVenues.slice(
    parsed.value.offset,
    parsed.value.offset + parsed.value.limit,
  );
  const repositories = await repositoryPreparerForRoute(
    page,
    stockholmDateKey(parsed.value.requestedAt),
  );
  const response = await buildVenueDiagnostics({
    venues: page,
    requestedAt: parsed.value.requestedAt,
    generatedAt,
    mode: parsed.value.mode,
    offset: parsed.value.offset,
    limit: parsed.value.limit,
    totalMatched: matchingVenues.length,
    repositories,
  });
  return privateJson(response, 200);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    return await getVenueDiagnosticsHandler(request);
  } catch {
    // Do not log diagnostic payloads, credentials, or raw repository failures.
    return privateJson({ code: 'INTERNAL_SERVER_ERROR', status: 500 }, 500);
  }
}

function matchesEitherIdentifier(venue: StoredVenue, identifier: string): boolean {
  return venue.id === identifier ||
    venue.venueId === identifier ||
    venue.slug === identifier ||
    venue.venueSlug === identifier;
}

function privateJson(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: PRIVATE_RESPONSE_HEADERS });
}
