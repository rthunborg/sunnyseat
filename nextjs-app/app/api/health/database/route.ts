import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { internalServerError } from '@/lib/utils/api-errors';

/**
 * GET /api/health/database
 * Database connectivity check endpoint
 */
export async function GET() {
  try {
    // Test database connection with a simple query
    const { error } = await supabaseAdmin.from('venues').select('count').limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: 'database_unhealthy',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'database_healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database health check error:', error);
    return internalServerError('Database connectivity check failed');
  }
}
