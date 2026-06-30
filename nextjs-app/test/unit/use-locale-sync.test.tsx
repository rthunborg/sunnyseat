import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

// Mutable state the next-intl / navigation mocks read, so each test can pose a
// different (active locale, pathname) without re-mocking.
const state = vi.hoisted(() => ({ locale: 'sv', pathname: '/', replace: vi.fn() }));

vi.mock('next-intl', () => ({ useLocale: () => state.locale }));
vi.mock('@/i18n/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: state.replace }) }));

import { useLocaleSync, LOCALE_PREFERENCE_STORAGE_KEY } from '@/hooks/use-locale-sync';

function Probe() {
  useLocaleSync();
  return null;
}

describe('useLocaleSync', () => {
  beforeEach(() => {
    state.locale = 'sv';
    state.pathname = '/';
    state.replace.mockClear();
    window.sessionStorage.clear();
    // Pose an English-configured browser to prove it no longer drives redirects.
    Object.defineProperty(window.navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });
  });

  it('does NOT bounce a fresh /sv visit to /en on an English browser (no stored preference)', () => {
    // The original bug: navigator.language === 'en' redirected the Swedish
    // default page to /en. With no explicit stored choice, the client must
    // leave the server-resolved locale alone.
    render(<Probe />);
    expect(state.replace).not.toHaveBeenCalled();
  });

  it('honors an explicit stored preference by redirecting to it', () => {
    window.sessionStorage.setItem(LOCALE_PREFERENCE_STORAGE_KEY, 'en');
    render(<Probe />);
    expect(state.replace).toHaveBeenCalledWith('/en');
  });

  it('does nothing when the stored preference already matches the active locale', () => {
    window.sessionStorage.setItem(LOCALE_PREFERENCE_STORAGE_KEY, 'sv');
    render(<Probe />);
    expect(state.replace).not.toHaveBeenCalled();
  });
});
