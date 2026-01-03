// Authentication Middleware
// Provides JWT token verification for protected routes

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { unauthorized } from '@/lib/utils/api-errors';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthUser {
  userId: number;
  username: string;
  email: string;
  role: string;
  claims: string[];
}

/**
 * Verify JWT token from Authorization header
 * Returns decoded user information or null if invalid
 */
export function verifyAuthToken(request: NextRequest): AuthUser | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      userId: parseInt(decoded.sub, 10),
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      claims: decoded.claims || [],
    };
  } catch (error) {
    return null;
  }
}

/**
 * Require authentication - returns error response if not authenticated
 */
export function requireAuth(request: NextRequest): AuthUser | NextResponse {
  const user = verifyAuthToken(request);
  if (!user) {
    return unauthorized('Authentication required');
  }
  return user;
}

/**
 * Check if user has required role
 */
export function requireRole(user: AuthUser, requiredRole: string): NextResponse | null {
  if (user.role !== requiredRole) {
    return unauthorized('Insufficient permissions');
  }
  return null;
}

/**
 * Check if user has any of the required claims
 */
export function requireAnyClaim(user: AuthUser, requiredClaims: string[]): NextResponse | null {
  const hasClaim = requiredClaims.some((claim) => user.claims.includes(claim));
  if (!hasClaim) {
    return unauthorized('Insufficient permissions');
  }
  return null;
}
