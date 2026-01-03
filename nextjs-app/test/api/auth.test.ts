// Authentication API Tests
// Integration tests for authentication endpoints

import { describe, it, expect, beforeAll } from 'vitest';

describe('Authentication Endpoints', () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  it('should reject login with missing credentials', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
  });

  it('should reject login with invalid credentials', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'invalid',
        password: 'invalid',
      }),
    });
    expect(response.status).toBe(401);
  });

  // Note: These tests require actual admin user in database
  // Uncomment and configure once database is set up
  it.skip('should login with valid credentials', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test-admin',
        password: 'test-password',
      }),
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.accessToken).toBeDefined();
    expect(data.refreshToken).toBeDefined();
    expect(data.user).toBeDefined();
  });

  it('should reject refresh with missing token', async () => {
    const response = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
  });

  it('should reject refresh with invalid token', async () => {
    const response = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: 'invalid-token',
      }),
    });
    expect(response.status).toBe(401);
  });

  it('should reject /me without authentication', async () => {
    const response = await fetch(`${baseUrl}/api/auth/me`);
    expect(response.status).toBe(401);
  });
});
