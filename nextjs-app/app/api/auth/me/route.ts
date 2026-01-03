import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { unauthorized, notFound, internalServerError } from '@/lib/utils/api-errors';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * GET /api/auth/me
 * Get current authenticated admin user information
 */
export async function GET(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    // Verify and decode JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return unauthorized('Invalid or expired token');
    }

    const userId = parseInt(decoded.sub, 10);
    if (isNaN(userId)) {
      return unauthorized('Invalid user ID in token');
    }

    // Get user from database
    const { data: user, error: userError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('Id', userId)
      .single();

    if (userError || !user) {
      return notFound('User');
    }

    // Parse claims from JSONB
    const claims = Array.isArray(user.Claims) ? user.Claims : [];

    return NextResponse.json({
      id: user.Id,
      username: user.Username,
      email: user.Email,
      role: user.Role,
      claims,
      lastLoginAt: user.LastLoginAt,
      createdAt: user.CreatedAt,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return internalServerError('An error occurred retrieving user information');
  }
}
