import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '../setup/test-utils';
import { ReviewFlow } from '@/components/custom/feedback/ReviewFlow';
import feedbackMessages from '@/messages/sv/feedback.json';
import type { VenueDetailDto } from '@/lib/types/api';

let forcedState: string | null = null;

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === '_state' ? forcedState : null),
  }),
}));

const VENUE: VenueDetailDto = {
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
  description: 'Stor uteservering med eftermiddagssol.',
  address: 'Tredje Långgatan 9, Göteborg',
  openingHours: { display: 'Öppet till 22:00' },
  timeline: {
    timezone: 'Europe/Stockholm',
    range: { start: '06:00', end: '21:00' },
    windows: [{ start: '13:00', end: '18:30', status: 'Sunny' }],
  },
};

const messages = {
  common: {},
  map: {},
  onboarding: {},
  venue: {},
  feedback: feedbackMessages,
  about: {},
  favourites: {},
};

function reviewsResponse() {
  return {
    reviews: [
      {
        id: 'review_1',
        venueId: '1',
        venueSlug: 'test-venue-sunny',
        text: 'Soligt från start.',
        rating: 5,
        createdAt: '2026-06-07T12:00:00.000Z',
      },
    ],
    summary: { averageRating: 5, reviewCount: 1 },
    timestamp: '2026-06-08T12:00:00.000Z',
  };
}

describe('ReviewFlow', () => {
  beforeEach(() => {
    forcedState = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('renders fetched reviews and opens the inline form intentionally', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(reviewsResponse()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));

    renderWithProviders(<ReviewFlow venue={VENUE} />, { messages });

    expect(await screen.findByText('Soligt från start.')).toBeInTheDocument();
    expect(screen.queryByTestId('review-form')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Lämna ett omdöme' }));
    expect(screen.getByTestId('review-form')).toBeInTheDocument();
  });

  it('opens the form for forced review state and submits without automatic duplicate retry', async () => {
    forcedState = 'review';
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/reviews?')) {
        return new Response(JSON.stringify(reviewsResponse()), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        review: {
          id: 'review_new',
          venueId: '1',
          venueSlug: 'test-venue-sunny',
          text: 'Ny recension.',
          createdAt: '2026-06-08T12:00:00.000Z',
        },
        summary: { averageRating: 5, reviewCount: 2 },
        timestamp: '2026-06-08T12:00:00.000Z',
      }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<ReviewFlow venue={VENUE} />, { messages });

    expect(await screen.findByTestId('review-form')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Omdöme' }), {
      target: { value: 'Ny recension.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Tack för ditt omdöme.'));
    expect(fetchMock).toHaveBeenCalledWith('/api/reviews', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"text":"Ny recension."'),
    }));
    const postCalls = fetchMock.mock.calls.filter(([input]) => String(input) === '/api/reviews');
    expect(postCalls).toHaveLength(1);

    await waitFor(() => expect(screen.queryByTestId('review-form')).toBeNull(), {
      timeout: 3500,
    });
  });

  it('uses plural-aware review summary copy', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(reviewsResponse()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));

    renderWithProviders(<ReviewFlow venue={VENUE} />, { messages });

    expect(await screen.findByText('1 omdöme')).toBeInTheDocument();
  });

  it('names repeated review-flow instances uniquely for parallel overlays', () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(reviewsResponse()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));

    renderWithProviders(
      <>
        <ReviewFlow venue={VENUE} instanceId="mobile" />
        <ReviewFlow venue={VENUE} instanceId="desktop" />
      </>,
      { messages },
    );

    expect(screen.getByTestId('review-flow-mobile')).toHaveAttribute(
      'aria-labelledby',
      'reviews-1-mobile',
    );
    expect(screen.getByTestId('review-flow-desktop')).toHaveAttribute(
      'aria-labelledby',
      'reviews-1-desktop',
    );
  });
});
