import type { APIRequestContext } from '@playwright/test';

/**
 * Authenticate as admin via /api/auth/login and return the access token.
 * Uses ADMIN_USERNAME / ADMIN_PASSWORD env vars, falling back to test defaults.
 */
export async function loginAsAdmin(request: APIRequestContext): Promise<string> {
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const password = process.env.ADMIN_PASSWORD ?? 'test-password';

  const response = await request.post('/api/auth/login', {
    data: { username, password },
  });

  if (!response.ok()) {
    throw new Error(`Admin login failed: ${response.status()} ${await response.text()}`);
  }

  const body = await response.json();
  return body.accessToken;
}
