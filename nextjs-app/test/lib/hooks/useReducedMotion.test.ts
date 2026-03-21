import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// We need to test the hook with controlled matchMedia
// The setup.ts already mocks matchMedia to return false by default

describe('useReducedMotion', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns false by default (no reduced motion preference)', async () => {
    // Default matchMedia mock in setup.ts returns matches: false
    const { useReducedMotion } = await import('@/lib/hooks/useReducedMotion');
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when matchMedia matches reduced motion', async () => {
    // Override matchMedia to return matches: true
    const listeners: (() => void)[] = [];
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_: string, cb: () => void) => { listeners.push(cb); },
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    const { useReducedMotion } = await import('@/lib/hooks/useReducedMotion');
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);

    // Restore default mock
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });
});
