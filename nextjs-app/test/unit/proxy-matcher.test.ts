import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';

vi.mock('next-intl/middleware', () => ({
  default: () => () => new Response(null, { status: 204 }),
}));

import { config } from '@/proxy';

function matcherPattern(): RegExp {
  const matcher = config.matcher;
  if (typeof matcher !== 'string') throw new Error('Expected string matcher');
  return new RegExp(`^${matcher}$`);
}

describe('proxy matcher', () => {
  it('keeps dotted venue slugs middleware-routed while excluding static assets', () => {
    const matcher = matcherPattern();

    expect('/venue/foo.bar'.match(matcher)).not.toBeNull();
    expect('/foo.bar/baz'.match(matcher)).not.toBeNull();
    expect('/icon.png'.match(matcher)).toBeNull();
    expect('/manual.pdf'.match(matcher)).toBeNull();
    expect('/worker.wasm'.match(matcher)).toBeNull();
    expect('/_next/static/app.js'.match(matcher)).toBeNull();
  });
});
