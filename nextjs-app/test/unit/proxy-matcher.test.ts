import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';

vi.mock('next-intl/middleware', () => ({
  default: () => () => new Response(null, { status: 204 }),
}));

import { config } from '@/proxy';

// Story 9.3: the matcher is now an array (locale pattern + the venue read routes,
// so the relocated per-IP limiter runs on /api/venues). The first entry is the
// original locale pattern that still drives the asset-exclusion contract.
function localePattern(): RegExp {
  const matcher = config.matcher;
  const localeMatcher = Array.isArray(matcher) ? matcher[0] : matcher;
  if (typeof localeMatcher !== 'string') throw new Error('Expected string matcher');
  return new RegExp(`^${localeMatcher}$`);
}

describe('proxy matcher', () => {
  it('keeps dotted venue slugs middleware-routed while excluding static assets', () => {
    const matcher = localePattern();

    expect('/venue/foo.bar'.match(matcher)).not.toBeNull();
    expect('/foo.bar/baz'.match(matcher)).not.toBeNull();
    expect('/icon.png'.match(matcher)).toBeNull();
    expect('/manual.pdf'.match(matcher)).toBeNull();
    expect('/worker.wasm'.match(matcher)).toBeNull();
    expect('/_next/static/app.js'.match(matcher)).toBeNull();
    // The locale pattern still EXCLUDES /api/* (the negative lookahead) — the
    // venue routes are matched by their own explicit entries instead.
    expect('/api/venues'.match(matcher)).toBeNull();
  });

  it('explicitly routes the venue read routes through the proxy (Story 9.3 AC3 limiter)', () => {
    const matcher = config.matcher;
    expect(Array.isArray(matcher)).toBe(true);
    const entries = Array.isArray(matcher) ? matcher : [matcher];
    expect(entries).toContain('/api/venues');
    expect(entries).toContain('/api/venues/:slug*');
  });
});
