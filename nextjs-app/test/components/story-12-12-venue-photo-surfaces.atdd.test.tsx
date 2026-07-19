import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VenueCard } from '@/components/composed/venue/VenueCard';
import { VenueDetailContent } from '@/components/composed/venue/VenueDetailContent';
import { VenueQuickInfo } from '@/components/composed/venue/VenueQuickInfo';
import type { VenueDataDto, VenueDetailDto } from '@/lib/types/api';

const CARD_URL =
  'https://sunnyseat.supabase.co/storage/v1/object/public/venue-media/test-venue-sunny/v2026-07/card.webp';
const HERO_URL =
  'https://sunnyseat.supabase.co/storage/v1/object/public/venue-media/test-venue-sunny/v2026-07/hero.webp';
const LEGACY_URL = 'https://example.com/legacy.jpg';
const BROKEN_CARD_URL = 'https://sunnyseat.supabase.co/storage/v1/object/public/venue-media/test-venue-sunny/v2026-07/broken-card.webp';
const BROKEN_HERO_URL = 'https://sunnyseat.supabase.co/storage/v1/object/public/venue-media/test-venue-sunny/v2026-07/broken-hero.webp';
const PHOTO_ALT = 'Uteservering hos Kafe Magasinet';

const cardLabels = {
  select: 'Valj Kafe Magasinet',
  favourite: 'Spara {name}',
  sun: 'Sol',
  photoPlaceholder: 'Platshallarbild',
  distance: 'Avstand',
  sunUnavailable: 'Soltid saknas',
};

const quickInfoLabels = {
  route: 'Visa Rutt',
  moreInfo: 'Mer Info',
  close: 'Stang platskort',
  photoPlaceholder: 'Platshallarbild',
  distance: 'Avstand',
  loadingSun: 'Laddar soldata',
  routeLoading: 'Oppnar kartor',
  favouriteAdd: 'Spara som favorit',
  favouriteRemove: 'Ta bort favorit',
};

const detailLabels = {
  openMaps: 'OPPNA I KARTOR',
  route: 'Visa Rutt',
  routeLoading: 'Oppnar kartor',
  photoPlaceholder: 'Platshallarbild for platsen',
  loading: 'Laddar platsdetaljer',
  detailsUnavailable: 'Detaljer saknas',
  openingHours: 'Oppettider',
  address: 'Adress',
  sunBadge: '{percent}% sol',
  city: 'Goteborg',
  openUntil: 'OPPET · {time}',
  openUntilLine: 'Oppet till {time}',
  placeholderImageShort: 'Platshallarbild',
  facts: {
    distance: 'AVSTAND',
  },
};

const mediaThumbnail = {
  alt: PHOTO_ALT,
  initials: 'KM',
  cardUrl: CARD_URL,
  heroUrl: HERO_URL,
  url: LEGACY_URL,
};

type StoryThumbnail = {
  alt: string;
  initials: string;
  cardUrl?: string;
  heroUrl?: string;
  url?: string;
};

const baseVenue: VenueDataDto = {
  id: '1',
  venueId: '1',
  venueName: 'Kafe Magasinet',
  venueSlug: 'test-venue-sunny',
  slug: 'test-venue-sunny',
  neighborhood: 'Linne',
  location: { lat: 57.705, lng: 11.97 },
  currentSunStatus: 'Sunny',
  weatherGateState: 'not_gated',
  skyCondition: 'clear',
  isPartner: false,
  confidence: 92,
  distanceMeters: 420,
  sunExposurePercent: 95,
  tags: [],
  sunWindow: { start: '11:00', end: '15:00' },
  thumbnail: mediaThumbnail,
};

const detailVenue: VenueDetailDto = {
  ...baseVenue,
  description: 'Stor uteservering med eftermiddagssol.',
  address: 'Tredje Langgatan 9, Goteborg',
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
    windows: [{ start: '11:00', end: '15:00', status: 'Sunny' }],
    peakTime: '14:00',
  },
};

function renderCard(thumbnail: StoryThumbnail = mediaThumbnail) {
  return render(
    <VenueCard
      name="Kafe Magasinet"
      sunTimeRange="Sol 11:00-15:00"
      distanceMeters={420}
      sunExposurePercent={95}
      thumbnail={thumbnail}
      isSunny
      labels={cardLabels}
      onSelect={vi.fn()}
    />,
  );
}

function renderQuickInfo(
  mode: 'mobile' | 'desktop',
  thumbnail: StoryThumbnail = mediaThumbnail,
  position = mode === 'desktop' ? { x: 200, y: 200 } : undefined,
) {
  return render(
    <VenueQuickInfo
      mode={mode}
      name="Kafe Magasinet"
      sunExposurePercent={95}
      thumbnail={thumbnail}
      distanceMeters={420}
      position={position}
      isLoadingSunData={false}
      onDismiss={vi.fn()}
      onOpenDetails={vi.fn()}
      onRoute={vi.fn()}
      labels={quickInfoLabels}
    />,
  );
}

function renderDetail(thumbnail: StoryThumbnail = mediaThumbnail) {
  const venue = { ...baseVenue, thumbnail };
  const detail = { ...detailVenue, thumbnail };
  return render(
    <VenueDetailContent
      fallbackVenue={venue}
      detail={detail}
      currentTime="14:00"
      labels={detailLabels}
      onRoute={vi.fn()}
    />,
  );
}

describe('Story 12.12 ATDD - venue photo surfaces (RED scaffolds)', () => {
  it.skip('[P0] VenueCard selects thumbnail.cardUrl over legacy thumbnail.url', () => {
    renderCard();

    const image = screen.getByRole('img', { name: PHOTO_ALT });
    expect(image).toHaveAttribute('src', CARD_URL);
    expect(image).not.toHaveAttribute('src', LEGACY_URL);
  });

  it.skip('[P0] VenueCard keeps the legacy thumbnail.url read fallback', () => {
    renderCard({ alt: PHOTO_ALT, initials: 'KM', url: LEGACY_URL });

    expect(screen.getByRole('img', { name: PHOTO_ALT })).toHaveAttribute(
      'src',
      LEGACY_URL,
    );
  });

  it.skip('[P0] VenueCard falls back to accessible initials on an actual image error event', () => {
    const { container } = renderCard({
      ...mediaThumbnail,
      cardUrl: BROKEN_CARD_URL,
    });

    fireEvent.error(screen.getByRole('img', { name: PHOTO_ALT }));

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: PHOTO_ALT })).toHaveTextContent('K');
  });

  it.skip('[P0] desktop VenueQuickInfo selects thumbnail.cardUrl over legacy thumbnail.url', () => {
    renderQuickInfo('desktop');

    const image = screen.getByRole('img', { name: PHOTO_ALT });
    expect(image).toHaveAttribute('src', CARD_URL);
    expect(image).not.toHaveAttribute('src', LEGACY_URL);
  });

  it.skip('[P0] desktop VenueQuickInfo falls back to initials and removes the failed image from the accessibility tree', () => {
    const { container } = renderQuickInfo('desktop', {
      ...mediaThumbnail,
      cardUrl: BROKEN_CARD_URL,
    });

    fireEvent.error(screen.getByRole('img', { name: PHOTO_ALT }));

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: PHOTO_ALT })).toHaveTextContent('KM');
  });

  it.skip('[P1] desktop VenueQuickInfo resets the failed-image state when the selected URL changes', () => {
    const first = { ...mediaThumbnail, cardUrl: BROKEN_CARD_URL };
    const second = {
      ...mediaThumbnail,
      cardUrl:
        'https://sunnyseat.supabase.co/storage/v1/object/public/venue-media/test-venue-sunny/v2026-08/card.webp',
    };
    const { rerender } = renderQuickInfo('desktop', first);

    fireEvent.error(screen.getByRole('img', { name: PHOTO_ALT }));
    rerender(
      <VenueQuickInfo
        mode="desktop"
        name="Kafe Magasinet"
        sunExposurePercent={95}
        thumbnail={second}
        distanceMeters={420}
        position={{ x: 200, y: 200 }}
        isLoadingSunData={false}
        onDismiss={vi.fn()}
        onOpenDetails={vi.fn()}
        onRoute={vi.fn()}
        labels={quickInfoLabels}
      />,
    );

    expect(screen.getByRole('img', { name: PHOTO_ALT })).toHaveAttribute(
      'src',
      second.cardUrl,
    );
  });

  it.skip('[P1] anchored mobile VenueQuickInfo keeps its placeholder treatment even when cardUrl and heroUrl exist', () => {
    const { container } = renderQuickInfo('mobile', mediaThumbnail, { x: 180, y: 260 });

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: PHOTO_ALT })).toBeInTheDocument();
    expect(screen.getByTestId('venue-quick-info')).not.toHaveTextContent(CARD_URL);
  });

  it.skip('[P0] VenueDetailContent renders thumbnail.heroUrl as an object-cover hero image', () => {
    renderDetail();

    const image = screen.getByRole('img', { name: PHOTO_ALT });
    expect(image.tagName).toBe('IMG');
    expect(image).toHaveAttribute('src', HERO_URL);
    expect(image).toHaveClass('object-cover');
    expect(image).not.toHaveAttribute('src', CARD_URL);
  });

  it.skip('[P0] VenueDetailContent falls back to the branded placeholder when the hero image errors', () => {
    const { container } = renderDetail({
      ...mediaThumbnail,
      heroUrl: BROKEN_HERO_URL,
    });

    fireEvent.error(screen.getByRole('img', { name: PHOTO_ALT }));

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: PHOTO_ALT })).toHaveTextContent(
      detailLabels.placeholderImageShort,
    );
  });

  it.skip('[P1] VenueDetailContent treats a decoded zero-width hero image as failed without duplicate announcements', () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    const naturalWidth = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0);

    const { container } = renderDetail({
      ...mediaThumbnail,
      heroUrl: BROKEN_HERO_URL,
    });

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getAllByRole('img', { name: PHOTO_ALT })).toHaveLength(1);

    complete.mockRestore();
    naturalWidth.mockRestore();
  });
});
