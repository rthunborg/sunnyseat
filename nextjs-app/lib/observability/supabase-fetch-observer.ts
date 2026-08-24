import { getRequestContext } from '@/lib/observability/request-context';

type SupabaseOperation =
  | 'venue_list'
  | 'sun_geometry_batch'
  | 'weather_batch';

const SUPABASE_OPERATIONS = new Map<string, SupabaseOperation>([
  ['/rest/v1/venues', 'venue_list'],
  [
    '/rest/v1/rpc/read_current_venue_sun_geometry_batch',
    'sun_geometry_batch',
  ],
  ['/rest/v1/weather_bucket_snapshots', 'weather_batch'],
]);

type ExternalDependencyBase = {
  request_id: string;
  method: string;
  status: number;
  duration_ms: number;
  region: string;
  deployment_id: string;
  environment: string;
  timestamp_utc: string;
};

type ExternalDependencyEvent =
  | (ExternalDependencyBase & {
      event: 'external_dependency';
      operation: SupabaseOperation;
      destination_path: string;
    })
  | (ExternalDependencyBase & {
      event: 'external_dependency_unattributed';
      operation: 'unattributed_supabase';
    });

function requestUrl(input: Parameters<typeof fetch>[0]): URL {
  const value =
    input instanceof Request
      ? input.url
      : input instanceof URL
        ? input.toString()
        : input;
  return new URL(value);
}

function requestMethod(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1],
): string {
  return (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
}

export function createObservedSupabaseFetch(
  supabaseUrl: string,
  upstreamFetch: typeof fetch = globalThis.fetch.bind(globalThis),
): typeof fetch {
  const configuredOrigin = new URL(supabaseUrl).origin;

  return async (input, init) => {
    const url = requestUrl(input);
    const operation =
      url.origin === configuredOrigin
        ? SUPABASE_OPERATIONS.get(url.pathname)
        : undefined;
    const context = getRequestContext();
    const start = performance.now();
    let status = 0;

    try {
      const response = await upstreamFetch(input, init);
      status = response.status;
      return response;
    } finally {
      if (context) {
        const base: ExternalDependencyBase = {
          request_id: context.requestId,
          method: requestMethod(input, init),
          status,
          duration_ms: Math.round(performance.now() - start),
          region: context.region,
          deployment_id: context.deploymentId,
          environment: context.environment,
          timestamp_utc: new Date().toISOString(),
        };
        const event: ExternalDependencyEvent = operation
          ? {
              ...base,
              event: 'external_dependency',
              operation,
              destination_path: url.pathname,
            }
          : {
              ...base,
              event: 'external_dependency_unattributed',
              operation: 'unattributed_supabase',
            };
        console.info(JSON.stringify(event));
      }
    }
  };
}
