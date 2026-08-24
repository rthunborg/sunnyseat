import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export const SUNNYSEAT_REQUEST_ID_HEADER = 'x-sunnyseat-request-id';
export const SUNNYSEAT_DEPLOYMENT_ID_HEADER = 'x-sunnyseat-deployment-id';

export type RequestContext = {
  requestId: string;
  route: string;
  region: string;
  deploymentId: string;
  environment: string;
};

const requestContextStorage = new AsyncLocalStorage<RequestContext>();
const LAUNCH_PROBE_REQUEST_ID =
  /^lr-[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?-(?:origin|edge-prime|edge)-\d{3}$/u;

export function resolveRequestId(candidate: string | null | undefined): string {
  return candidate && LAUNCH_PROBE_REQUEST_ID.test(candidate)
    ? candidate
    : randomUUID();
}

export function runWithRequestContext<T>(
  context: RequestContext,
  callback: () => T,
): T {
  return requestContextStorage.run(context, callback);
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}
