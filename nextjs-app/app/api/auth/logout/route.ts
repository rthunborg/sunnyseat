import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, internalServerError } from '@/lib/utils/api-errors';
import type { LogoutRequest } from '@/lib/types/api';

/**
 * POST /api/auth/logout
 * Logout admin user and revoke refresh token
 * Note: In production, this should verify the JWT token from Authorization header
 */
export async function POST(request: NextRequest) {
  try {
    const body: LogoutRequest = await request.json();

    if (!body.refreshToken) {
      return badRequest('Refresh token is required');
    }

    // Revoke refresh token by clearing it
    const { error } = await supabaseAdmin
      .from('admin_users')
      .update({
        RefreshToken: null,
        RefreshTokenExpiresAt: null,
      })
      .eq('RefreshToken', body.refreshToken);

    if (error) {
      console.error('Logout error:', error);
      return badRequest('Failed to logout');
    }

    return NextResponse.json({ message: 'Successfully logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    return internalServerError('An error occurred during logout');
  }
}
