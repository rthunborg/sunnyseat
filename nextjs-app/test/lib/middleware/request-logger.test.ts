import { describe, it, expect, vi } from 'vitest';
import { withRequestLogging } from '@/lib/middleware/request-logger';
import { NextResponse } from 'next/server';

function makeRequest(url: string, method = 'GET') {
  return new Request(url, { method }) as unknown as import('next/server').NextRequest;
}

describe('withRequestLogging', () => {
  it('logs method, path, status, and duration', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const handler = withRequestLogging(async () => NextResponse.json({ ok: true }));
    const res = await handler(makeRequest('http://localhost:3000/api/test'), undefined);

    expect(res.status).toBe(200);
    expect(consoleSpy).toHaveBeenCalledOnce();
    const logLine = consoleSpy.mock.calls[0][0] as string;
    expect(logLine).toMatch(/\[API\] GET \/api\/test 200 \d+ms/);
    consoleSpy.mockRestore();
  });

  it('logs even when handler throws', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const handler = withRequestLogging(async () => {
      throw new Error('boom');
    });

    await expect(handler(makeRequest('http://localhost:3000/api/fail'), undefined)).rejects.toThrow(
      'boom',
    );
    expect(consoleSpy).toHaveBeenCalledOnce();
    const logLine = consoleSpy.mock.calls[0][0] as string;
    expect(logLine).toMatch(/\[API\] GET \/api\/fail 500 \d+ms/);
    consoleSpy.mockRestore();
  });
});
