import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, unauthorized, internalServerError } from '@/lib/utils/api-errors';
import type { RefreshRequest, RefreshResponse } from '@/lib/types/api';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRATION_MINUTES = parseInt(process.env.JWT_EXPIRATION_MINUTES || '60', 10);

/**
 * POST /api/auth/refresh
 * Refresh expired access token using refresh token
 */
export async function POST(request: NextRequest) {
  try {
    const body: RefreshRequest = await request.json();

    if (!body.refreshToken) {
      return badRequest('Refresh token is required');
    }

    // Find user by refresh token
    const { data: user, error: userError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('RefreshToken', body.refreshToken)
      .single();

    if (userError || !user) {
      return unauthorized('Invalid or expired refresh token');
    }

    // Check if refresh token is expired
    if (user.RefreshTokenExpiresAt) {
      const expiresAt = new Date(user.RefreshTokenExpiresAt);
      if (expiresAt < new Date()) {
        return unauthorized('Refresh token has expired');
      }
    }

    // Check if user is still active
    if (!user.IsActive) {
      return unauthorized('User account is not active');
    }

    // Generate new access token
    const accessToken = generateAccessToken(user);
    const expiresAt = new Date(Date.now() + JWT_EXPIRATION_MINUTES * 60 * 1000);

    const response: RefreshResponse = {
      accessToken,
      expiresAt: expiresAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Refresh token error:', error);
    return internalServerError('An error occurred during token refresh');
  }
}

/**
 * Generate JWT access token
 */
interface AdminUserRow {
  Id: number;
  Username: string;
  Email: string;
  Role: string;
  Claims: string[] | null;
  IsActive: boolean;
  RefreshTokenExpiresAt: string | null;
}

function generateAccessToken(user: AdminUserRow): string {
  const payload = {
    sub: user.Id.toString(),
    username: user.Username,
    email: user.Email,
    role: user.Role,
    claims: user.Claims || [],
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: `${JWT_EXPIRATION_MINUTES}m`,
  });
}
