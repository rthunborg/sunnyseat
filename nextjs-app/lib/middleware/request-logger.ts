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

export function withRequestLogging<TArguments extends RouteHandlerArguments>(
  handler: (...args: TArguments) => Promise<NextResponse | Response>,
): (...args: TArguments) => Promise<NextResponse | Response> {
  return async (...args: TArguments): Promise<NextResponse | Response> => {
    const [req] = args;
    const route = req.nextUrl.pathname;
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
        response.headers.set(SUNNYSEAT_REQUEST_ID_HEADER, requestId);
        response.headers.set(SUNNYSEAT_DEPLOYMENT_ID_HEADER, deploymentId);
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
