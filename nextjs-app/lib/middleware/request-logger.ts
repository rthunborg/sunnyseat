import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  resolveRequestId,
  runWithRequestContext,
  SUNNYSEAT_REQUEST_ID_HEADER,
  SUNNYSEAT_DEPLOYMENT_ID_HEADER,
} from '@/lib/observability/request-context';

type ApiRequestCompleteEvent = {
  event: 'api_request_complete';
  request_id: string;
  method: string;
  route: string;
  status: number;
  duration_ms: number;
  region: string;
  deployment_id: string;
  environment: string;
  timestamp_utc: string;
};

type RouteHandlerArguments = [request: NextRequest, ...context: unknown[]];

const ROUTE_PATTERNS = [
  {
    pattern: /^\/api\/venues\/[^/]+\/feedback$/u,
    route: '/api/venues/[slug]/feedback',
  },
  {
    pattern: /^\/api\/venues\/[^/]+$/u,
    route: '/api/venues/[slug]',
  },
  {
    pattern: /^\/api\/venues$/u,
    route: '/api/venues',
  },
  {
    pattern: /^\/api\/reviews$/u,
    route: '/api/reviews',
  },
  {
    pattern: /^\/api\/feedback$/u,
    route: '/api/feedback',
  },
] as const;

function isPublicCacheableGetResponse(request: NextRequest, response: Response): boolean {
  if (request.method.toUpperCase() !== 'GET') return false;
  const cacheControl = response.headers.get('Cache-Control')?.toLowerCase() ?? '';
  if (!cacheControl.includes('public')) return false;
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) return false;
  return /(?:^|,)\s*(?:s-maxage|max-age)\s*=/u.test(cacheControl);
}

function attachCorrelationHeaders(
  request: NextRequest,
  response: Response,
  requestId: string,
  deploymentId: string,
): void {
  if (isPublicCacheableGetResponse(request, response)) {
    response.headers.delete(SUNNYSEAT_REQUEST_ID_HEADER);
  } else {
    response.headers.set(SUNNYSEAT_REQUEST_ID_HEADER, requestId);
  }
  response.headers.set(SUNNYSEAT_DEPLOYMENT_ID_HEADER, deploymentId);
}

export function withRequestLogging<TArguments extends RouteHandlerArguments>(
  handler: (...args: TArguments) => Promise<NextResponse | Response>,
): (...args: TArguments) => Promise<NextResponse | Response> {
  return async (...args: TArguments): Promise<NextResponse | Response> => {
    const [req] = args;
    const route = publicRouteIdentity(req.nextUrl.pathname);
    const requestId = resolveRequestId(req.headers.get(SUNNYSEAT_REQUEST_ID_HEADER));
    const region = process.env.VERCEL_REGION ?? 'local';

    const deploymentId = process.env.VERCEL_DEPLOYMENT_ID ?? 'local';
    const environment = process.env.VERCEL_ENV ?? 'local';
    return runWithRequestContext({ requestId, route, region, deploymentId, environment }, async () => {
      const start = performance.now();
      let status = 500;
      try {
        const response = await handler(...args);
        status = response.status;
        attachCorrelationHeaders(req, response, requestId, deploymentId);
        return response;
      } catch {
        const response = NextResponse.json(
          { code: 'INTERNAL_SERVER_ERROR' },
          { status: 500 },
        );
        attachCorrelationHeaders(req, response, requestId, deploymentId);
        return response;
      } finally {
        const event: ApiRequestCompleteEvent = {
          event: 'api_request_complete',
          request_id: requestId,
          method: req.method,
          route,
          status,
          duration_ms: Math.round(performance.now() - start),
          region,
          deployment_id: deploymentId,
          environment,
          timestamp_utc: new Date().toISOString(),
        };
        console.info(JSON.stringify(event));
      }
    });
  };
}

export function publicRouteIdentity(pathname: string): string {
  const normalizedPath = pathname.replace(/\/+$/u, '') || '/';
  return ROUTE_PATTERNS.find(({ pattern }) => pattern.test(normalizedPath))?.route
    ?? '/api/[unclassified]';
}
