import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';

async function handler(_request: NextRequest, user: AuthUser) {
  return NextResponse.json({
    message: 'Admin API working',
    user: {
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
}

export const GET = withAdminAuth(handler);
