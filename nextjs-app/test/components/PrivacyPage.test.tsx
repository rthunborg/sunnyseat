import type { AnchorHTMLAttributes } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/setup/test-utils';
import {
  PrivacyPageView,
  type PrivacyPageCopy,
} from '@/components/custom/legal/PrivacyPage';

// next-intl's locale-aware Link pulls in `next/navigation`; stub it to a plain
// anchor (same pattern as MobileNavBar.test.tsx).
vi.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a href={String(href)} {...props}>
        {children}
      </a>
    ),
  }),
}));
import privacySv from '@/messages/sv/privacy.json';
import privacyEn from '@/messages/en/privacy.json';

describe('<PrivacyPage />', () => {
  it('renders the Swedish privacy policy with a back link to /about', () => {
    renderWithProviders(<PrivacyPageView copy={makePrivacyCopy(privacySv)} />, { messages: { privacy: privacySv } });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Integritetspolicy');
    expect(screen.getByTestId('privacy-back-link')).toHaveAttribute('href', '/about');
    expect(screen.getByText(privacySv.lastUpdated)).toHaveClass('text-text-body');
  });

  it('renders the English privacy policy when the locale is en', () => {
    renderWithProviders(<PrivacyPageView copy={makePrivacyCopy(privacyEn)} />, { messages: { privacy: privacyEn }, locale: 'en' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Privacy policy');
  });
});

function makePrivacyCopy(privacy: typeof privacySv): PrivacyPageCopy {
  return {
    title: privacy.title,
    backLink: privacy.backLink,
    intro: privacy.intro,
    body1: privacy.body1,
    body2: privacy.body2,
    lastUpdated: privacy.lastUpdated,
  };
}
