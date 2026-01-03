import { NextResponse } from 'next/server';

/**
 * GET /api/health/ready
 * Readiness check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
}
