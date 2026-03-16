import { NextResponse } from 'next/server';
import { withRequestLogging } from '@/lib/middleware/request-logger';
import { createHealthClient } from '@/lib/supabase/health';

/**
 * GET /api/health/ready
 * Readiness probe — returns 503 if Supabase is unreachable.
 */
export const GET = withRequestLogging(async () => {
  try {
    const supabase = createHealthClient();

    if (!supabase) {
      return NextResponse.json(
        { status: 'not_ready', reason: 'missing_env_vars', timestamp: new Date().toISOString() },
        { status: 503 },
      );
    }

    const { error } = await supabase.from('venues').select('"Id"').limit(1);

    if (error) {
      return NextResponse.json(
        { status: 'not_ready', reason: 'supabase_error', timestamp: new Date().toISOString() },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: 'not_ready', reason: 'connection_failed', timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
});
