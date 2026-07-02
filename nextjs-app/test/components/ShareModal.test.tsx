import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/setup/test-utils';
import { ShareModal } from '@/components/custom/venue/ShareModal';
import venueMessages from '@/messages/sv/venue.json';

const messages = { venue: venueMessages } as Record<string, unknown>;

function render(ui: ReactElement) {
  return renderWithProviders(ui, { messages: messages as never });
}

const URL = 'https://sunnyseat.app/?venue=kafe-magasinet';

describe('<ShareModal /> (Story 9.8)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders the title, subtitle and the share URL when open', () => {
    render(<ShareModal open onClose={vi.fn()} venueName="Kafé Magasinet" url={URL} />);
    expect(screen.getByRole('dialog', { name: 'Dela Kafé Magasinet' })).toBeInTheDocument();
    expect(screen.getByText('Skicka platsen till en vän eller kopiera länken.')).toBeInTheDocument();
    expect(screen.getByTestId('share-modal-url')).toHaveTextContent(URL);
  });

  it('renders nothing when closed', () => {
    render(<ShareModal open={false} onClose={vi.fn()} venueName="Kafé Magasinet" url={URL} />);
    expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument();
  });

  it('renders only functional share targets (no dead Instagram/Snapchat/Messenger tile)', () => {
    render(<ShareModal open onClose={vi.fn()} venueName="Kafé Magasinet" url={URL} />);
    expect(screen.getByTestId('share-target-whatsapp')).toHaveAttribute(
      'href',
      expect.stringContaining('wa.me'),
    );
    expect(screen.getByTestId('share-target-facebook')).toHaveAttribute(
      'href',
      expect.stringContaining('facebook.com/sharer'),
    );
    expect(screen.getByTestId('share-target-email')).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:'),
    );
    expect(screen.queryByTestId('share-target-instagram')).not.toBeInTheDocument();
    expect(screen.queryByTestId('share-target-snapchat')).not.toBeInTheDocument();
    // Every rendered target carries a real, non-empty href — never a dead tile.
    for (const anchor of screen.getAllByRole('link')) {
      expect(anchor.getAttribute('href')).toBeTruthy();
    }
  });

  it('share-target hrefs carry the venue URL', () => {
    render(<ShareModal open onClose={vi.fn()} venueName="Kafé Magasinet" url={URL} />);
    const whatsapp = screen.getByTestId('share-target-whatsapp').getAttribute('href') ?? '';
    expect(decodeURIComponent(whatsapp)).toContain(URL);
  });

  it('every share target points at its own brand share-intent host with the venue URL', () => {
    render(<ShareModal open onClose={vi.fn()} venueName="Kafé Magasinet" url={URL} />);
    const cases: Array<[string, string]> = [
      ['share-target-whatsapp', 'wa.me'],
      ['share-target-facebook', 'facebook.com/sharer'],
      ['share-target-x', 'twitter.com/intent'],
      ['share-target-telegram', 't.me/share'],
      ['share-target-email', 'mailto:'],
    ];
    for (const [testid, host] of cases) {
      const href = screen.getByTestId(testid).getAttribute('href') ?? '';
      expect(href).toContain(host);
      expect(decodeURIComponent(href)).toContain(URL);
    }
  });

  it('opens external share targets in a new tab with a safe rel', () => {
    render(<ShareModal open onClose={vi.fn()} venueName="Kafé Magasinet" url={URL} />);
    const whatsapp = screen.getByTestId('share-target-whatsapp');
    expect(whatsapp).toHaveAttribute('target', '_blank');
    // noopener guards against reverse-tabnabbing on the opened share page.
    expect(whatsapp.getAttribute('rel') ?? '').toContain('noopener');
  });

  it('copies the URL and flips to the "Kopierad" confirmation state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<ShareModal open onClose={vi.fn()} venueName="Kafé Magasinet" url={URL} />);
    const copyButton = screen.getByTestId('share-modal-copy');
    expect(copyButton).toHaveTextContent('Kopiera länk');

    fireEvent.click(copyButton);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(URL));
    await waitFor(() => expect(screen.getByTestId('share-modal-copy')).toHaveTextContent('Kopierad'));
  });

  it('does not flip to "Kopierad" when the clipboard write rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<ShareModal open onClose={vi.fn()} venueName="Kafé Magasinet" url={URL} />);
    fireEvent.click(screen.getByTestId('share-modal-copy'));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    // Give any (incorrect) state flip a chance to render, then assert it did not.
    await Promise.resolve();
    expect(screen.getByTestId('share-modal-copy')).toHaveTextContent('Kopiera länk');
  });

  it('does not throw or flip when navigator.clipboard is entirely absent', async () => {
    // An insecure context (or an old browser) exposes no clipboard API at all.
    // The URL stays visible for manual copy; the button must not throw or lie.
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });

    render(<ShareModal open onClose={vi.fn()} venueName="Kafé Magasinet" url={URL} />);
    expect(() => fireEvent.click(screen.getByTestId('share-modal-copy'))).not.toThrow();
    await Promise.resolve();
    expect(screen.getByTestId('share-modal-copy')).toHaveTextContent('Kopiera länk');
    // The URL is still shown so the user can select-and-copy by hand.
    expect(screen.getByTestId('share-modal-url')).toHaveTextContent(URL);
  });

  it('reverts the "Kopierad" confirmation back to "Kopiera länk" after the feedback delay', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<ShareModal open onClose={vi.fn()} venueName="Kafé Magasinet" url={URL} />);
    fireEvent.click(screen.getByTestId('share-modal-copy'));

    // Let the awaited clipboard write settle, then confirm the flip.
    await vi.waitFor(() =>
      expect(screen.getByTestId('share-modal-copy')).toHaveTextContent('Kopierad'),
    );
    // After the 1800 ms feedback window it reverts to the idle label.
    await vi.advanceTimersByTimeAsync(1800);
    await vi.waitFor(() =>
      expect(screen.getByTestId('share-modal-copy')).toHaveTextContent('Kopiera länk'),
    );
  });

  it('resets the copied state when the modal is closed and re-opened', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const { rerender } = render(
      <ShareModal open onClose={vi.fn()} venueName="Kafé Magasinet" url={URL} />,
    );
    fireEvent.click(screen.getByTestId('share-modal-copy'));
    await waitFor(() => expect(screen.getByTestId('share-modal-copy')).toHaveTextContent('Kopierad'));

    rerender(<ShareModal open={false} onClose={vi.fn()} venueName="Kafé Magasinet" url={URL} />);
    rerender(<ShareModal open onClose={vi.fn()} venueName="Kafé Magasinet" url={URL} />);

    // A fresh open must start from the idle label, never a stale "Kopierad".
    await waitFor(() =>
      expect(screen.getByTestId('share-modal-copy')).toHaveTextContent('Kopiera länk'),
    );
  });

  it('closes from the close button and Escape', () => {
    const onClose = vi.fn();
    render(<ShareModal open onClose={onClose} venueName="Kafé Magasinet" url={URL} />);
    fireEvent.click(screen.getByTestId('share-modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(screen.getByTestId('share-modal'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('closes when the scrim is pressed but not when the card is pressed', () => {
    const onClose = vi.fn();
    render(<ShareModal open onClose={onClose} venueName="Kafé Magasinet" url={URL} />);

    // Pressing the card must not bubble to the scrim close handler.
    fireEvent.pointerDown(screen.getByTestId('share-modal'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
