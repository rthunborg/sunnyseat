import { NextResponse } from 'next/server';

/**
 * GET /api/health/live
 * Liveness check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'live',
    timestamp: new Date().toISOString(),
  });
}
