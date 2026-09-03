import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import commonMessages from '@/messages/sv/common.json';
import commonMessagesEn from '@/messages/en/common.json';

// Control reduced-motion deterministically without depending on matchMedia.
let reducedMotion: boolean | null = false;
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return { ...actual, useReducedMotion: () => reducedMotion };
});

vi.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => reducedMotion,
}));

import { OfflineBanner } from '@/components/custom/offline/OfflineBanner';

function renderBanner(visible: boolean, locale: 'sv' | 'en' = 'sv') {
  const messages = locale === 'sv' ? { common: commonMessages } : { common: commonMessagesEn };
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <OfflineBanner visible={visible} />
    </NextIntlClientProvider>,
  );
}

describe('<OfflineBanner />', () => {
  beforeEach(() => {
    reducedMotion = false;
  });

  it('renders the matter-of-fact Swedish copy in a polite live region', () => {
    renderBanner(true);
    const banner = screen.getByTestId('offline-banner');
    expect(banner).toHaveTextContent('Ingen anslutning');
    expect(banner).toHaveAttribute('role', 'status');
    expect(banner).toHaveAttribute('aria-live', 'polite');
    // Matter-of-fact error tone: no exclamation/apology punctuation.
    expect(banner.textContent).not.toContain('!');
  });

  it('renders the English copy under the en locale (AC6)', () => {
    renderBanner(true, 'en');
    expect(screen.getByTestId('offline-banner')).toHaveTextContent('No connection');
  });

  it('renders nothing when not visible (so reconnect can animate it out)', () => {
    renderBanner(false);
    expect(screen.queryByTestId('offline-banner')).toBeNull();
  });

  it('still renders the message when reduced motion is preferred', () => {
    reducedMotion = true;
    renderBanner(true);
    expect(screen.getByTestId('offline-banner')).toHaveTextContent('Ingen anslutning');
  });
});
