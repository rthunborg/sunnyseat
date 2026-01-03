// Health Check API Tests
// Basic integration tests for health check endpoints

import { describe, it, expect } from 'vitest';

describe('Health Check Endpoints', () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  it('should return health status', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
  });

  it('should return ready status', async () => {
    const response = await fetch(`${baseUrl}/api/health/ready`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ready');
    expect(data.timestamp).toBeDefined();
  });

  it('should return live status', async () => {
    const response = await fetch(`${baseUrl}/api/health/live`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('live');
    expect(data.timestamp).toBeDefined();
  });

  // Note: Database health check requires Supabase connection
  // This test will pass once Supabase is configured
  it.skip('should return database health status', async () => {
    const response = await fetch(`${baseUrl}/api/health/database`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('database_healthy');
    expect(data.timestamp).toBeDefined();
  });
});
