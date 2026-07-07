import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Wraps an API route handler to log method, path, duration, and status code.
 * Usage: export const GET = withRequestLogging(async (req) => { ... });
 */
export function withRequestLogging(
  handler: (req: NextRequest, ctx: unknown) => Promise<NextResponse | Response>,
) {
  return async (req: NextRequest, ctx: unknown): Promise<NextResponse | Response> => {
    const start = performance.now();
    let status = 500;
    try {
      const res = await handler(req, ctx);
      status = res.status;
      return res;
    } finally {
      const duration = Math.round(performance.now() - start);
      const path = new URL(req.url).pathname;
      console.log(`[API] ${req.method} ${path} ${status} ${duration}ms`);
    }
  };
}
