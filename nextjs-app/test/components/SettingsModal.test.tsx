import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/setup/test-utils';
import { SettingsModal } from '@/components/custom/settings/SettingsModal';
import commonMessages from '@/messages/sv/common.json';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
  usePathname: () => '/',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const messages = {
  common: commonMessages,
  map: {},
  onboarding: {},
  venue: {},
  feedback: {},
  about: {},
  favourites: {},
};

function renderSettings() {
  const onClose = vi.fn();
  const onOpenFeedback = vi.fn();
  renderWithProviders(
    <SettingsModal open onClose={onClose} onOpenFeedback={onOpenFeedback} />,
    { messages },
  );
  return { onClose, onOpenFeedback };
}

describe('<SettingsModal />', () => {
  it('renders the title, subtitle and both rows', () => {
    renderSettings();
    expect(screen.getByRole('dialog', { name: 'Inställningar' })).toBeInTheDocument();
    expect(screen.getByText('SunnySeat · version 1.0')).toBeInTheDocument();
    expect(screen.getByTestId('settings-row-feedback')).toHaveTextContent('Skicka feedback');
    expect(screen.getByTestId('settings-row-about')).toHaveTextContent('Om SunnySeat');
  });

  it('opens feedback from the feedback row', () => {
    const { onOpenFeedback } = renderSettings();
    fireEvent.click(screen.getByTestId('settings-row-feedback'));
    expect(onOpenFeedback).toHaveBeenCalledTimes(1);
  });

  it('links the about row to /about and closes on navigate', () => {
    const { onClose } = renderSettings();
    const about = screen.getByTestId('settings-row-about');
    expect(about.tagName).toBe('A');
    expect(about).toHaveAttribute('href', '/about');
    fireEvent.click(about);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the close button', () => {
    const { onClose } = renderSettings();
    fireEvent.click(screen.getByTestId('settings-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('includes the language switcher for the mobile layout', () => {
    renderSettings();
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
  });
});
