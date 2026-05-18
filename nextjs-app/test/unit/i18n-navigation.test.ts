import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';

vi.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: 'a',
    redirect: vi.fn(),
    usePathname: vi.fn(),
    useRouter: vi.fn(),
    getPathname: vi.fn(),
  }),
}));

import {
  Link,
  getPathname,
  redirect,
  usePathname,
  useRouter,
} from '@/i18n/navigation';

describe('i18n navigation wrappers', () => {
  it('exports the locale-aware next-intl navigation helpers', () => {
    expect(Link).toBeDefined();
    expect(redirect).toBeDefined();
    expect(usePathname).toBeDefined();
    expect(useRouter).toBeDefined();
    expect(getPathname).toBeDefined();
  });
});
