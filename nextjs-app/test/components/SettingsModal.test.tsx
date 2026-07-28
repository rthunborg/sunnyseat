import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEffect, type ReactNode } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/setup/test-utils';
import { FirstRunCoachMarkGuide } from '@/components/custom/coach-tour/FirstRunCoachMarkGuide';
import { SettingsModal } from '@/components/custom/settings/SettingsModal';
import { SettingsModalRoot } from '@/components/custom/settings/SettingsModalRoot';
import { FirstRunGuideProvider } from '@/lib/contexts/FirstRunGuideContext';
import { SettingsProvider, useSettings } from '@/lib/contexts/SettingsContext';
import commonMessagesEn from '@/messages/en/common.json';
import commonMessages from '@/messages/sv/common.json';
import mapMessages from '@/messages/sv/map.json';

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
  map: mapMessages,
  onboarding: {},
  venue: {},
  feedback: {},
  about: {},
  favourites: {},
};
const messagesEn = {
  ...messages,
  common: commonMessagesEn,
};

function renderSettings(options: { locale?: 'sv' | 'en' } = {}) {
  const onClose = vi.fn();
  const onOpenFeedback = vi.fn();
  const onOpenGuide = vi.fn();
  renderWithProviders(
    <SettingsModal
      open
      onClose={onClose}
      onOpenFeedback={onOpenFeedback}
      onOpenGuide={onOpenGuide}
    />,
    {
      locale: options.locale,
      messages: options.locale === 'en' ? messagesEn : messages,
    },
  );
  return { onClose, onOpenFeedback, onOpenGuide };
}

function OpenSettingsOnMount() {
  const { openSettings } = useSettings();
  useEffect(() => {
    openSettings();
  }, [openSettings]);
  return null;
}

function renderSettingsGuideHarness() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getRect(this: HTMLElement) {
    const anchor = this.getAttribute('data-tour-anchor');
    const width = anchor === 'map-surface' ? 390 : 320;
    const height = anchor === 'map-surface' ? 844 : 240;
    return {
      x: 0,
      y: 0,
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      toJSON: () => ({}),
    } as DOMRect;
  });
  renderWithProviders(
    <SettingsProvider>
      <FirstRunGuideProvider>
        <OpenSettingsOnMount />
        <div tabIndex={-1} data-testid="anchor-map-surface" data-tour-anchor="map-surface" />
        <SettingsModalRoot />
        <FirstRunCoachMarkGuide autoStartEnabled={false} />
      </FirstRunGuideProvider>
    </SettingsProvider>,
    { messages },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('<SettingsModal />', () => {
  it('renders the title, subtitle and settings rows', () => {
    renderSettings();
    expect(screen.getByRole('dialog', { name: 'Inställningar' })).toBeInTheDocument();
    expect(screen.getByText('SunnySeat · version 1.0')).toBeInTheDocument();
    expect(screen.getByTestId('settings-row-feedback')).toHaveTextContent('Skicka feedback');
    expect(screen.getByTestId('settings-row-guide')).toHaveTextContent('Visa guide igen');
    expect(screen.getByTestId('settings-row-about')).toHaveTextContent('Om SunnySeat');
  });

  it('opens feedback from the feedback row', () => {
    const { onOpenFeedback } = renderSettings();
    fireEvent.click(screen.getByTestId('settings-row-feedback'));
    expect(onOpenFeedback).toHaveBeenCalledTimes(1);
  });

  it('relaunches the coach guide from the guide row', () => {
    const { onOpenGuide } = renderSettings();
    const row = screen.getByTestId('settings-row-guide');
    fireEvent.click(row);
    expect(onOpenGuide).toHaveBeenCalledWith(row);
  });

  it('recreates Settings after guide close and restores focus to the guide row', async () => {
    renderSettingsGuideHarness();

    const row = await screen.findByTestId('settings-row-guide');
    fireEvent.click(row);

    const dialog = await screen.findByRole('dialog', { name: 'Kartnålarna' });
    expect(dialog).toHaveAttribute('data-tour-source', 'settings');
    fireEvent.click(screen.getByRole('button', { name: 'Hoppa över' }));

    const restoredRow = await screen.findByTestId('settings-row-guide');
    await waitFor(() => expect(restoredRow).toHaveFocus());
  });

  it('renders the English guide relaunch copy from message keys', () => {
    renderSettings({ locale: 'en' });
    expect(screen.getByTestId('settings-row-guide')).toHaveTextContent(
      'Show guide again',
    );
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
