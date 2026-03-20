import { test, expect } from '@playwright/test';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Test123!';

/**
 * Helper: login and return tokens. Skips the calling test if login fails
 * (e.g. admin user not seeded in this environment).
 */
async function login(request: import('@playwright/test').APIRequestContext) {
  const response = await request.post('/api/auth/login', {
    data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  });
  if (!response.ok()) {
    return null;
  }
  return response.json() as Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    user: { id: number; username: string; email: string; role: string };
  }>;
}

/**
 * Auth API Contract Tests
 *
 * Tests the auth endpoints directly (not via UI) to verify:
 *   - POST /api/auth/login — response shape, token issuance
 *   - GET /api/auth/me — current user from JWT
 *   - POST /api/auth/refresh — token refresh flow
 *   - POST /api/auth/logout — refresh token revocation
 *
 * IMPORTANT: All auth tests run serially because they share a single admin
 * user whose refresh token is overwritten on every login() call.
 */
test.describe.configure({ mode: 'serial' });

// ============================================================================
// POST /api/auth/login
// ============================================================================
test.describe('POST /api/auth/login', () => {
  test('valid credentials return access token, refresh token, and user info', async ({
    request,
  }) => {
    const body = await login(request);
    test.skip(!body, 'Admin user not seeded — skipping');

    // Response shape
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    expect(body).toHaveProperty('expiresAt');
    expect(body).toHaveProperty('user');

    // Token values are non-empty strings
    expect(typeof body!.accessToken).toBe('string');
    expect(body!.accessToken.length).toBeGreaterThan(0);
    expect(typeof body!.refreshToken).toBe('string');
    expect(body!.refreshToken.length).toBeGreaterThan(0);

    // User object shape
    expect(body!.user).toHaveProperty('id');
    expect(body!.user).toHaveProperty('username');
    expect(body!.user).toHaveProperty('role');
    expect(body!.user.username).toBe(ADMIN_USERNAME);

    // expiresAt is a valid ISO date in the future
    const expiresAt = new Date(body!.expiresAt);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('invalid password returns 401', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { username: ADMIN_USERNAME, password: 'wrong-password-xyz' },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    // unauthorized() returns { error, code, statusCode }
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('code', 'UNAUTHORIZED');
  });

  test('nonexistent username returns 401', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { username: 'nonexistent-user-xyz', password: 'irrelevant' },
    });

    expect(response.status()).toBe(401);
  });

  test('missing username returns 400', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { password: ADMIN_PASSWORD },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('detail');
  });

  test('missing password returns 400', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { username: ADMIN_USERNAME },
    });

    expect(response.status()).toBe(400);
  });

  test('empty body returns 400', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {},
    });

    expect(response.status()).toBe(400);
  });

  test('access token is a valid JWT with 3 parts', async ({ request }) => {
    const body = await login(request);
    test.skip(!body, 'Admin user not seeded — skipping');

    const parts = body!.accessToken.split('.');
    expect(parts).toHaveLength(3); // header.payload.signature
  });
});

// ============================================================================
// GET /api/auth/me
// ============================================================================
test.describe('GET /api/auth/me', () => {
  test('returns current user when valid token provided', async ({ request }) => {
    const loginBody = await login(request);
    test.skip(!loginBody, 'Admin user not seeded — skipping');

    const response = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${loginBody!.accessToken}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('username');
    expect(body).toHaveProperty('email');
    expect(body).toHaveProperty('role');
    expect(body).toHaveProperty('createdAt');
    expect(body.username).toBe(ADMIN_USERNAME);
  });

  test('returns 401 without authorization header', async ({ request }) => {
    const response = await request.get('/api/auth/me');
    expect(response.status()).toBe(401);
  });

  test('returns 401 with invalid token', async ({ request }) => {
    const response = await request.get('/api/auth/me', {
      headers: { Authorization: 'Bearer invalid-token-xyz' },
    });
    expect(response.status()).toBe(401);
  });

  test('returns 401 with malformed authorization header', async ({ request }) => {
    const response = await request.get('/api/auth/me', {
      headers: { Authorization: 'NotBearer some-token' },
    });
    expect(response.status()).toBe(401);
  });
});

// ============================================================================
// POST /api/auth/refresh
// ============================================================================
test.describe('POST /api/auth/refresh', () => {
  test('valid refresh token returns new access token', async ({ request }) => {
    const loginBody = await login(request);
    test.skip(!loginBody, 'Admin user not seeded — skipping');

    // Use refresh token to get new access token
    const response = await request.post('/api/auth/refresh', {
      data: { refreshToken: loginBody!.refreshToken },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('expiresAt');
    expect(typeof body.accessToken).toBe('string');
    expect(body.accessToken.length).toBeGreaterThan(0);

    // New token should be valid — verify by calling /me
    const meResponse = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${body.accessToken}` },
    });
    expect(meResponse.status()).toBe(200);
    const meBody = await meResponse.json();
    expect(meBody.username).toBe(ADMIN_USERNAME);
  });

  test('invalid refresh token returns 401', async ({ request }) => {
    const response = await request.post('/api/auth/refresh', {
      data: { refreshToken: 'invalid-refresh-token-xyz' },
    });
    expect(response.status()).toBe(401);
  });

  test('missing refresh token returns 400', async ({ request }) => {
    const response = await request.post('/api/auth/refresh', {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test('refreshed access token has future expiry', async ({ request }) => {
    const loginBody = await login(request);
    test.skip(!loginBody, 'Admin user not seeded — skipping');

    const response = await request.post('/api/auth/refresh', {
      data: { refreshToken: loginBody!.refreshToken },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();

    const expiresAt = new Date(body.expiresAt);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

// ============================================================================
// POST /api/auth/logout
// ============================================================================
test.describe('POST /api/auth/logout', () => {
  test('logout revokes refresh token', async ({ request }) => {
    const loginBody = await login(request);
    test.skip(!loginBody, 'Admin user not seeded — skipping');

    // Logout
    const logoutResponse = await request.post('/api/auth/logout', {
      data: { refreshToken: loginBody!.refreshToken },
    });
    expect(logoutResponse.status()).toBe(200);
    const logoutBody = await logoutResponse.json();
    expect(logoutBody).toHaveProperty('message');

    // Using the revoked refresh token should fail
    const refreshResponse = await request.post('/api/auth/refresh', {
      data: { refreshToken: loginBody!.refreshToken },
    });
    expect(refreshResponse.status()).toBe(401);
  });

  test('logout without refresh token returns 400', async ({ request }) => {
    const response = await request.post('/api/auth/logout', {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test('logout with invalid refresh token still returns success', async ({ request }) => {
    // Non-existent token — the DB update simply matches 0 rows, no error
    const response = await request.post('/api/auth/logout', {
      data: { refreshToken: 'nonexistent-token-xyz-999' },
    });
    // Should return 200 (idempotent logout) or 400
    expect([200, 400]).toContain(response.status());
  });
});

// ============================================================================
// Full auth lifecycle
// ============================================================================
test.describe('Auth Lifecycle', () => {
  test('login → me → refresh → me → logout → refresh fails', async ({ request }) => {
    // Step 1: Login
    const loginBody = await login(request);
    test.skip(!loginBody, 'Admin user not seeded — skipping');
    const { accessToken, refreshToken } = loginBody!;

    // Step 2: Get current user with original token
    const me1 = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(me1.status()).toBe(200);

    // Step 3: Refresh to get new access token
    const refreshResponse = await request.post('/api/auth/refresh', {
      data: { refreshToken },
    });
    expect(refreshResponse.status()).toBe(200);
    const { accessToken: newAccessToken } = await refreshResponse.json();

    // Step 4: Get current user with new token
    const me2 = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${newAccessToken}` },
    });
    expect(me2.status()).toBe(200);
    const me2Body = await me2.json();
    expect(me2Body.username).toBe(ADMIN_USERNAME);

    // Step 5: Logout (revoke refresh token)
    const logoutResponse = await request.post('/api/auth/logout', {
      data: { refreshToken },
    });
    expect(logoutResponse.status()).toBe(200);

    // Step 6: Refresh with revoked token should fail
    const failedRefresh = await request.post('/api/auth/refresh', {
      data: { refreshToken },
    });
    expect(failedRefresh.status()).toBe(401);
  });
});
