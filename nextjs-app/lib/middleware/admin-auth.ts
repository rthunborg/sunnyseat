import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, type AuthUser } from './auth';
import { unauthorized } from '@/lib/utils/api-errors';

type AdminRole = 'Admin' | 'SuperAdmin';

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  Admin: 1,
  SuperAdmin: 2,
};

function hasRole(userRole: string, requiredRole: AdminRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as AdminRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
  return userLevel >= requiredLevel;
}

type HandlerWithAuth = (
  request: NextRequest,
  user: AuthUser,
  ...args: unknown[]
) => Promise<NextResponse> | NextResponse;

export function withAdminAuth(
  handler: HandlerWithAuth,
  requiredRole: AdminRole = 'Admin'
) {
  return async (request: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    const user = verifyAuthToken(request);
    if (!user) {
      return unauthorized('Authentication required');
    }
    if (!hasRole(user.role, requiredRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions', statusCode: 403, code: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    return handler(request, user, ...args);
  };
}
