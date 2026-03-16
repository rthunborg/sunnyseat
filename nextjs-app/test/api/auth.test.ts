// Authentication API Tests
// Unit tests for authentication route handlers

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock supabase before importing routes
vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: { message: 'not found' } })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ data: null, error: null })),
      })),
    })),
  },
}));

import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as refreshPOST } from '@/app/api/auth/refresh/route';
import { GET as meGET } from '@/app/api/auth/me/route';

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('Authentication Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject login with missing credentials', async () => {
    const request = createRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await loginPOST(request);
    expect(response.status).toBe(400);
  });

  it('should reject login with invalid credentials', async () => {
    const request = createRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'invalid',
        password: 'invalid',
      }),
    });
    const response = await loginPOST(request);
    expect(response.status).toBe(401);
  });

  it('should reject refresh with missing token', async () => {
    const request = createRequest('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await refreshPOST(request);
    expect(response.status).toBe(400);
  });

  it('should reject refresh with invalid token', async () => {
    const request = createRequest('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: 'invalid-token',
      }),
    });
    const response = await refreshPOST(request);
    expect(response.status).toBe(401);
  });

  it('should reject /me without authentication', async () => {
    const request = createRequest('/api/auth/me');
    const response = await meGET(request);
    expect(response.status).toBe(401);
  });
});
