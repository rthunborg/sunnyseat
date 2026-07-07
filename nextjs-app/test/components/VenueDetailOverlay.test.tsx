import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/setup/test-utils';
import { VenueDetailOverlay } from '@/components/custom/venue/VenueDetailOverlay';
import venueMessages from '@/messages/sv/venue.json';
import type { VenueDataDto, VenueDetailDto } from '@/lib/types/api';

// The overlay now mounts <ShareModal>, an intl consumer, so tests render
// through the shared provider stack with the real Swedish venue messages.
const messages = { venue: venueMessages } as Record<string, unknown>;

function render(ui: React.ReactElement) {
  return renderWithProviders(ui, { messages: messages as never });
}

const FALLBACK: VenueDataDto = {
  id: '1',
  venueId: '1',
  venueName: 'Kafé Magasinet',
  venueSlug: 'test-venue-sunny',
  slug: 'test-venue-sunny',
  neighborhood: 'Inom Vallgraven',
  location: { lat: 57.705, lng: 11.97 },
  currentSunStatus: 'Sunny',
  isPartner: true,
  confidence: 92,
  distanceMeters: 0,
  sunExposurePercent: 95,
  tags: [],
  sunWindow: { start: '13:00', end: '18:30' },
  thumbnail: { alt: 'Uteservering hos Kafé Magasinet', initials: 'KM' },
};

const DETAIL: VenueDetailDto = {
  ...FALLBACK,
  description: 'Stor uteservering med eftermiddagssol.',
  address: 'Tredje Långgatan 9, Göteborg',
  // Story 11.9 (AC2): per-weekday hours (closes 22:00 every day).
  openingHours: {
    '1': { open: '11:00', close: '22:00' },
    '2': { open: '11:00', close: '22:00' },
    '3': { open: '11:00', close: '22:00' },
    '4': { open: '11:00', close: '22:00' },
    '5': { open: '11:00', close: '22:00' },
    '6': { open: '11:00', close: '22:00' },
    '7': { open: '11:00', close: '22:00' },
  },
  timeline: {
    timezone: 'Europe/Stockholm',
    range: { start: '06:00', end: '21:00' },
    windows: [{ start: '13:00', end: '18:30', status: 'Sunny' }],
    peakTime: '15:30',
  },
};

const labels = {
  close: 'Stäng platsdetaljer',
  favourite: 'Spara plats',
  favouriteAdd: 'Spara som favorit',
  favouriteRemove: 'Ta bort favorit',
  share: 'Dela plats',
  shareText: 'Kolla in soltiden på {name}',
  openMaps: 'ÖPPNA I KARTOR',
  route: 'Visa Rutt',
  routeLoading: 'Öppnar kartor',
  photoPlaceholder: 'Platshållarbild för platsen',
  loading: 'Laddar platsdetaljer',
  detailsUnavailable: 'Detaljer saknas',
  openingHours: 'Öppettider',
  address: 'Adress',
  sunBadge: '{percent}% sol',
  confidence: 'Säkerhet',
  confidenceApproximate: 'cirka',
  confidenceUnavailable: 'Säkerhet saknas',
  city: 'Göteborg',
  openUntil: 'ÖPPET · {time}',
  openUntilLine: 'Öppet till {time}',
  placeholderImageShort: 'Platshållarbild',
  facts: {
    distance: 'AVSTÅND',
  },
};

describe('VenueDetailOverlay mobile', () => {
  it('renders a full mobile detail sheet with token-backed shell classes', () => {
    render(
      <VenueDetailOverlay
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    const sheet = screen.getByTestId('mobile-venue-detail-sheet');
    expect(sheet).toHaveAttribute('role', 'dialog');
    expect(sheet).toHaveClass('rounded-t-sheet-full', 'shadow-sheet-full-up');
    expect(screen.getByRole('heading', { name: 'Kafé Magasinet' })).toBeInTheDocument();
  });

  it('keeps the venue name visible while detail data is loading', () => {
    render(
      <VenueDetailOverlay
        fallbackVenue={FALLBACK}
        detail={undefined}
        isLoading
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Kafé Magasinet' })).toBeInTheDocument();
    expect(screen.getByLabelText('Laddar platsdetaljer')).toBeInTheDocument();
  });

  it('dismisses from the keyboard-operable drag handle', () => {
    const onDismiss = vi.fn();
    render(
      <VenueDetailOverlay
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={onDismiss}
        onRoute={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByTestId('mobile-venue-detail-handle'), {
      key: 'ArrowDown',
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses when the close handle is activated like a normal button', () => {
    const onDismiss = vi.fn();
    render(
      <VenueDetailOverlay
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={onDismiss}
        onRoute={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Stäng platsdetaljer' })[1]);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('toggles favourite state and does not expose close as a pressed toggle', () => {
    const onFavouriteToggle = vi.fn();
    const { rerender } = render(
      <VenueDetailOverlay
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
        onFavouriteToggle={onFavouriteToggle}
      />,
    );

    const addButton = screen.getByRole('button', { name: 'Spara som favorit' });
    expect(addButton).toHaveAttribute('aria-pressed', 'false');
    expect(addButton).toHaveClass('focus-visible:ring-2');
    fireEvent.click(addButton);
    expect(onFavouriteToggle).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('button', { name: 'Stäng platsdetaljer' })[1]).not.toHaveAttribute('aria-pressed');

    rerender(
      <VenueDetailOverlay
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        isFavourite
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
        onFavouriteToggle={onFavouriteToggle}
      />,
    );

    const removeButton = screen.getByRole('button', { name: 'Ta bort favorit' });
    expect(removeButton).toHaveAttribute('aria-pressed', 'true');
    expect(removeButton.querySelector('svg')).toHaveClass('fill-current');
  });

  it('uses opacity-only motion when reduced motion is requested', () => {
    render(
      <VenueDetailOverlay
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        reducedMotion
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    expect(screen.getByTestId('mobile-venue-detail-sheet')).toHaveAttribute(
      'data-reduced-motion',
      'true',
    );
  });
});

describe('VenueDetailOverlay desktop', () => {
  it('renders a 390px right-side panel with utility chrome controls', () => {
    render(
      <VenueDetailOverlay
        mode="desktop"
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    const panel = screen.getByTestId('desktop-venue-detail-panel');
    expect(panel).toHaveClass('right-0', 'w-venue-detail-panel');
    expect(screen.getByRole('button', { name: 'Stäng platsdetaljer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spara som favorit' })).toBeDisabled();
    // Story 9.8: the share button is now enabled + wired (was a disabled stub).
    expect(screen.getByRole('button', { name: 'Dela plats' })).toBeEnabled();
  });

  it('desktop close button dismisses the panel', () => {
    const onDismiss = vi.fn();
    render(
      <VenueDetailOverlay
        mode="desktop"
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={onDismiss}
        onRoute={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Stäng platsdetaljer' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls the route handler from the enabled detail route CTA', () => {
    const onRoute = vi.fn();
    render(
      <VenueDetailOverlay
        mode="desktop"
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={onRoute}
        routeEstimateLabel="ca 11 min promenad"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Visa Rutt, ca 11 min promenad' }));
    expect(onRoute).toHaveBeenCalledTimes(1);
    expect(screen.getByText('ca 11 min promenad')).toBeInTheDocument();
  });
});

describe('VenueDetailOverlay sharing (Story 9.8)', () => {
  const originalShare = Object.getOwnPropertyDescriptor(navigator, 'share');
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        origin: 'https://sunnyseat.app',
        pathname: '/',
        search: '',
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    if (originalShare) {
      Object.defineProperty(navigator, 'share', originalShare);
    } else if ('share' in navigator) {
      // @ts-expect-error — test cleanup: remove the mocked capability.
      delete navigator.share;
    }
    vi.restoreAllMocks();
  });

  function stubShare(impl: (data: ShareData) => Promise<void>) {
    const share = vi.fn(impl);
    Object.defineProperty(navigator, 'share', { configurable: true, writable: true, value: share });
    return share;
  }

  function removeShare() {
    if ('share' in navigator) {
      // @ts-expect-error — simulate a browser without the Web Share API.
      delete navigator.share;
    }
  }

  it('exposes an enabled share button in BOTH mobile and desktop overlays (AC2)', () => {
    const { unmount } = render(
      <VenueDetailOverlay
        mode="mobile"
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );
    const mobileShare = screen.getByRole('button', { name: 'Dela plats' });
    expect(mobileShare).toBeEnabled();
    expect(screen.getByTestId('mobile-venue-detail-sheet')).toContainElement(mobileShare);
    unmount();

    render(
      <VenueDetailOverlay
        mode="desktop"
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );
    const desktopShare = screen.getByRole('button', { name: 'Dela plats' });
    expect(desktopShare).toBeEnabled();
    expect(screen.getByTestId('desktop-venue-detail-panel')).toContainElement(desktopShare);
  });

  it('invokes native share with the venue title + deep-link URL when available (AC1)', async () => {
    const share = stubShare(() => Promise.resolve());
    render(
      <VenueDetailOverlay
        mode="mobile"
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dela plats' }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share).toHaveBeenCalledWith({
      title: 'Kafé Magasinet',
      text: 'Kolla in soltiden på Kafé Magasinet',
      url: 'https://sunnyseat.app/?venue=test-venue-sunny',
    });
    // Native share handled it — the fallback modal must NOT open.
    expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument();
  });

  it('does not surface an error or open the modal when the user cancels (AbortError)', async () => {
    const share = stubShare(() => Promise.reject(new DOMException('cancelled', 'AbortError')));
    render(
      <VenueDetailOverlay
        mode="mobile"
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dela plats' }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument();
  });

  it('opens the desktop share modal when native share is unavailable (graceful degradation)', async () => {
    removeShare();
    render(
      <VenueDetailOverlay
        mode="desktop"
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dela plats' }));

    await waitFor(() => expect(screen.getByTestId('share-modal')).toBeInTheDocument());
    expect(screen.getByTestId('share-modal-url')).toHaveTextContent(
      'https://sunnyseat.app/?venue=test-venue-sunny',
    );
  });

  it('falls back to the modal when native share fails for a non-abort reason', async () => {
    stubShare(() => Promise.reject(new DOMException('denied', 'NotAllowedError')));
    render(
      <VenueDetailOverlay
        mode="desktop"
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dela plats' }));
    await waitFor(() => expect(screen.getByTestId('share-modal')).toBeInTheDocument());
  });

  it('does nothing (no modal, no throw) when the venue has no shareable slug', async () => {
    // currentVenueShareUrl returns null without a slug, so handleShare bails out
    // before touching navigator.share — the button is inert but never errors.
    const share = stubShare(() => Promise.resolve());
    // Force both slug sources absent — a real DTO always carries one, but the
    // early-return guard must hold if a malformed one ever reaches the overlay.
    const noSlug = { ...FALLBACK, slug: undefined, venueSlug: undefined } as unknown as VenueDataDto;
    const noSlugDetail = { ...DETAIL, slug: undefined, venueSlug: undefined } as unknown as VenueDetailDto;
    render(
      <VenueDetailOverlay
        mode="desktop"
        fallbackVenue={noSlug}
        detail={noSlugDetail}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Dela plats' }))).not.toThrow();
    await Promise.resolve();
    expect(share).not.toHaveBeenCalled();
    expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument();
  });

  it('the desktop fallback modal supports the full copy-link round-trip and closes', async () => {
    // End-to-end: no native share → modal opens with the deep-link URL → copy
    // writes that exact URL → the modal closes. Guards the wired path, not just
    // the ShareModal unit in isolation.
    removeShare();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    render(
      <VenueDetailOverlay
        mode="desktop"
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dela plats' }));
    await waitFor(() => expect(screen.getByTestId('share-modal')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('share-modal-copy'));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('https://sunnyseat.app/?venue=test-venue-sunny'),
    );

    fireEvent.click(screen.getByTestId('share-modal-close'));
    await waitFor(() => expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument());
  });

  it('inserts a venue name containing $-patterns verbatim into the share text (no regex corruption)', async () => {
    // `String.prototype.replace(str, str)` treats `$&`/`$1`/`` $` ``/`$'` in the
    // replacement (the venue name) as special patterns. A replacer FUNCTION keeps
    // the name literal, so "Bar $1 $& Grill" is NOT mangled.
    const share = stubShare(() => Promise.resolve());
    const trickyName = 'Bar $1 $& Grill';
    render(
      <VenueDetailOverlay
        mode="mobile"
        fallbackVenue={{ ...FALLBACK, venueName: trickyName }}
        detail={{ ...DETAIL, venueName: trickyName }}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dela plats' }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ text: `Kolla in soltiden på ${trickyName}` }),
    );
  });

  it('prefers detail.slug over the fallback venueSlug for the share URL', async () => {
    // The slug source is `detail?.slug ?? fallbackVenue.slug ?? fallbackVenue.venueSlug`.
    // A loaded detail with its own canonical slug must win over the skeleton.
    const share = stubShare(() => Promise.resolve());
    render(
      <VenueDetailOverlay
        mode="mobile"
        fallbackVenue={{ ...FALLBACK, slug: 'skeleton-slug', venueSlug: 'skeleton-slug' }}
        detail={{ ...DETAIL, slug: 'canonical-slug' }}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dela plats' }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://sunnyseat.app/?venue=canonical-slug' }),
    );
  });
});
