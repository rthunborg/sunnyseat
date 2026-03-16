import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, unauthorized, internalServerError } from '@/lib/utils/api-errors';
import type { LoginRequest, AuthResponse } from '@/lib/types/api';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

// JWT configuration - should be moved to environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRATION_MINUTES = parseInt(process.env.JWT_EXPIRATION_MINUTES || '60', 10);
const REFRESH_TOKEN_EXPIRATION_DAYS = parseInt(
  process.env.REFRESH_TOKEN_EXPIRATION_DAYS || '7',
  10
);

/**
 * POST /api/auth/login
 * Authenticate admin user with username and password
 */
export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();

    // Validate request
    if (!body.username || !body.password) {
      return badRequest('Username and password are required');
    }

    // Find user by username
    const { data: user, error: userError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('username', body.username)
      .single();

    if (userError || !user) {
      return unauthorized('Invalid username or password');
    }

    // Check if user is active
    if (!user.IsActive) {
      return unauthorized('User account is not active');
    }

    // Validate password
    const isValidPassword = await bcrypt.compare(body.password, user.PasswordHash);
    if (!isValidPassword) {
      return unauthorized('Invalid username or password');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + JWT_EXPIRATION_MINUTES * 60 * 1000);

    // Update user with new refresh token and last login
    const refreshTokenExpiresAt = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
    );

    await supabaseAdmin
      .from('admin_users')
      .update({
        RefreshToken: refreshToken,
        RefreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
        LastLoginAt: new Date().toISOString(),
      })
      .eq('Id', user.Id);

    // Parse claims from JSONB
    const claims = Array.isArray(user.Claims) ? user.Claims : [];

    const response: AuthResponse = {
      accessToken,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.Id,
        username: user.Username,
        email: user.Email,
        role: user.Role,
        claims,
        lastLoginAt: user.LastLoginAt,
        createdAt: user.CreatedAt,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Login error:', error);
    return internalServerError('An error occurred during authentication');
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
  PasswordHash: string;
  IsActive: boolean;
  RefreshToken: string | null;
  RefreshTokenExpiresAt: string | null;
  LastLoginAt: string | null;
  CreatedAt: string;
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

/**
 * Generate secure refresh token
 */
function generateRefreshToken(): string {
  return randomBytes(64).toString('hex');
}
