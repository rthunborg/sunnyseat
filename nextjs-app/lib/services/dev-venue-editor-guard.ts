import { NextResponse } from 'next/server';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function devVenueEditorDeniedResponse(request: Request): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return guardedJson('Not found', 404);
  }
  if (process.env.SUNNYSEAT_ADMIN !== 'dev') {
    return guardedJson('Dev venue editor unavailable', 403);
  }
  if (hasForwardedHostAmbiguity(request.headers)) {
    return guardedJson('Dev venue editor unavailable', 403);
  }
  if (!isLoopbackRequest(request)) {
    return guardedJson('Dev venue editor unavailable', 403);
  }
  return null;
}

export function guardedJson(detail: string, status: number): NextResponse {
  return NextResponse.json(
    { detail, status },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

function hasForwardedHostAmbiguity(headers: Headers): boolean {
  return Boolean(
    headers.get('x-forwarded-host') ||
    headers.get('x-forwarded-proto') ||
    headers.get('x-forwarded-for') ||
    headers.get('x-real-ip') ||
    headers.get('forwarded'),
  );
}

function isLoopbackRequest(request: Request): boolean {
  const url = new URL(request.url);
  const requestHost = hostnameFromHostHeader(url.host);
  if (!requestHost || !LOOPBACK_HOSTS.has(requestHost)) return false;

  const hostHeader = request.headers.get('host') ?? url.host;
  const normalizedHost = normalizedUrlHost(url.protocol, hostHeader);
  const host = normalizedHost ? hostnameFromHostHeader(normalizedHost) : null;
  if (!host || !LOOPBACK_HOSTS.has(host)) return false;

  const origin = request.headers.get('origin');
  if (!origin) return request.method === 'GET' || request.method === 'HEAD';
  try {
    const originUrl = new URL(origin);
    const originHost = hostnameFromHostHeader(originUrl.host);
    return (
      originHost !== null &&
      LOOPBACK_HOSTS.has(originHost) &&
      originHost === host &&
      originUrl.protocol === url.protocol &&
      originUrl.host === normalizedHost
    );
  } catch {
    return false;
  }
}

function normalizedUrlHost(protocol: string, hostHeader: string): string | null {
  try {
    return new URL(`${protocol}//${hostHeader}`).host.toLowerCase();
  } catch {
    return null;
  }
}

function hostnameFromHostHeader(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.startsWith('[')) {
    const end = trimmed.indexOf(']');
    if (end === -1) return null;
    return trimmed.slice(0, end + 1);
  }
  const firstColon = trimmed.indexOf(':');
  const lastColon = trimmed.lastIndexOf(':');
  if (firstColon !== -1 && firstColon === lastColon) {
    return trimmed.slice(0, firstColon);
  }
  return trimmed;
}
