// Health Check API Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom, mockCreateHealthClient } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockCreateHealthClient = vi.fn(() => ({ from: mockFrom }));
  return { mockFrom, mockCreateHealthClient };
});

vi.mock('@/lib/supabase/health', () => ({
  createHealthClient: mockCreateHealthClient,
}));

function makeRequest(url: string, method = 'GET') {
  return new Request(url, { method }) as unknown as import('next/server').NextRequest;
}

describe('Health Check Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateHealthClient.mockReturnValue({ from: mockFrom });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'weather_slices') {
        return {
          select: () => ({
            order: () => ({
              limit: () =>
                Promise.resolve({
                  data: [{ CreatedAt: '2026-03-15T10:00:00Z' }],
                  error: null,
                }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          limit: () => Promise.resolve({ data: [{ Id: 1 }], error: null }),
        }),
      };
    });
  });

  it('GET /api/health returns ok with version and supabase status', async () => {
    const { GET } = await import('@/app/api/health/route');
    const response = await GET(makeRequest('http://localhost:3000/api/health'), undefined);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.version).toBeDefined();
    expect(data.supabase).toBe('connected');
    expect(data.timestamp).toBeDefined();
    expect(data.lastWeatherIngestion).toBe('2026-03-15T10:00:00Z');
  });

  it('GET /api/health/ready returns ready when Supabase is reachable', async () => {
    const { GET } = await import('@/app/api/health/ready/route');
    const response = await GET(makeRequest('http://localhost:3000/api/health/ready'), undefined);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ready');
    expect(data.timestamp).toBeDefined();
  });

  it('GET /api/health/ready returns 503 when Supabase returns error', async () => {
    mockFrom.mockImplementation(() => ({
      select: () => ({
        limit: () => Promise.resolve({ data: null, error: { message: 'fail' } }),
      }),
    }));
    const { GET } = await import('@/app/api/health/ready/route');
    const response = await GET(makeRequest('http://localhost:3000/api/health/ready'), undefined);
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.status).toBe('not_ready');
    expect(data.reason).toBe('supabase_error');
  });

  it('GET /api/health/ready returns 503 when client is null', async () => {
    mockCreateHealthClient.mockReturnValue(null);
    const { GET } = await import('@/app/api/health/ready/route');
    const response = await GET(makeRequest('http://localhost:3000/api/health/ready'), undefined);
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.reason).toBe('missing_env_vars');
  });
});

describe('Live Endpoint', () => {
  it('should return live status', async () => {
    const { GET } = await import('@/app/api/health/live/route');
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('live');
  });
});
