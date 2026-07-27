/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.5
 * Dev-only venue editor guard and production-impossibility boundary.
 *
 * These tests are intentionally skipped until Story 12.5 implementation lands.
 * Replace loadPlannedEditorGuard() with the real guard import when the route is built.
 */

import { describe, expect, test, vi } from 'vitest';

type GuardInput = {
  nodeEnv: 'development' | 'test' | 'production';
  adminFlag?: string;
  host?: string;
  origin?: string;
  forwardedHost?: string;
  forwardedProto?: string;
  readBody?: () => unknown;
  touchSupabase?: () => unknown;
};

type GuardDecision = {
  allowed: boolean;
  status: 200 | 400 | 403 | 404;
  body: Record<string, unknown>;
  headers: Headers;
};

type PlannedEditorGuardModule = {
  evaluateDevVenueEditorGuard: (input: GuardInput) => Promise<GuardDecision>;
};

async function loadPlannedEditorGuard(): Promise<PlannedEditorGuardModule> {
  throw new Error(
    'RED: implement a server-only dev venue editor guard and import it in this ATDD scaffold.',
  );
}

describe.skip('Story 12.5 ATDD - dev venue editor guard', () => {
  test('[P0] production denies before flags, request body parsing, or Supabase access', async () => {
    const guard = await loadPlannedEditorGuard();
    const readBody = vi.fn();
    const touchSupabase = vi.fn();

    const decision = await guard.evaluateDevVenueEditorGuard({
      nodeEnv: 'production',
      adminFlag: 'dev',
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      readBody,
      touchSupabase,
    });

    expect(decision).toMatchObject({ allowed: false, status: 404 });
    expect(decision.headers.get('cache-control')).toBe('no-store');
    expect(JSON.stringify(decision.body)).not.toMatch(/dev|admin|supabase|service/i);
    expect(readBody).not.toHaveBeenCalled();
    expect(touchSupabase).not.toHaveBeenCalled();
  });

  test('[P0] non-production still requires SUNNYSEAT_ADMIN=dev and loopback host plus origin', async () => {
    const guard = await loadPlannedEditorGuard();

    await expect(
      guard.evaluateDevVenueEditorGuard({
        nodeEnv: 'development',
        adminFlag: undefined,
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      }),
    ).resolves.toMatchObject({ allowed: false, status: 404 });

    await expect(
      guard.evaluateDevVenueEditorGuard({
        nodeEnv: 'development',
        adminFlag: 'dev',
        host: 'sunnyseat.example',
        origin: 'https://sunnyseat.example',
      }),
    ).resolves.toMatchObject({ allowed: false, status: 404 });

    await expect(
      guard.evaluateDevVenueEditorGuard({
        nodeEnv: 'development',
        adminFlag: 'dev',
        host: '127.0.0.1:3000',
        origin: 'http://127.0.0.1:3000',
      }),
    ).resolves.toMatchObject({ allowed: true, status: 200 });
  });

  test('[P0] ambiguous forwarded host or origin fails closed before body parsing', async () => {
    const guard = await loadPlannedEditorGuard();
    const readBody = vi.fn();

    const decision = await guard.evaluateDevVenueEditorGuard({
      nodeEnv: 'development',
      adminFlag: 'dev',
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      forwardedHost: 'sunnyseat.example',
      forwardedProto: 'https',
      readBody,
    });

    expect(decision).toMatchObject({ allowed: false, status: 404 });
    expect(readBody).not.toHaveBeenCalled();
  });

  test('[P0] denied guard responses never expose service-role configuration to clients', async () => {
    const guard = await loadPlannedEditorGuard();

    const decision = await guard.evaluateDevVenueEditorGuard({
      nodeEnv: 'test',
      adminFlag: 'wrong',
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
    });

    expect(decision).toMatchObject({ allowed: false });
    expect(JSON.stringify(decision.body)).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|service-role/i);
    expect(decision.headers.get('cache-control')).toBe('no-store');
  });
});
