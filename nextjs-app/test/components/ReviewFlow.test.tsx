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
  tags: [],
  description: 'Stor uteservering med eftermiddagssol.',
  address: 'Tredje Långgatan 9, Göteborg',
  openingHours: { '1': { open: '11:00', close: '22:00' } }, // Story 11.9 (AC2)
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

function emptyReviewsResponse() {
  return {
    reviews: [],
    summary: { averageRating: null, reviewCount: 0 },
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

  it('shows exactly ONE "Inga omdömen" empty message and centers the section (Story 11.6 AC3)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(emptyReviewsResponse()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));

    renderWithProviders(<ReviewFlow venue={VENUE} />, { messages });

    // The single canonical empty message is the body `labels.empty` ("Inga
    // omdömen än."). The old `=0` summary line ("Inga omdömen") is suppressed so
    // the substring "Inga omdömen" appears EXACTLY once (was 2 before the fix).
    const emptyBody = await screen.findByText('Inga omdömen än.');
    expect(emptyBody).toBeInTheDocument();
    const occurrences = screen.getAllByText(/Inga omdömen/);
    expect(occurrences).toHaveLength(1);
    // AC3: the empty message is centered.
    expect(emptyBody).toHaveClass('text-center');
    // AC3: the section header (heading "Omdömen") is centered.
    expect(screen.getByRole('heading', { name: 'Omdömen' })).toBeInTheDocument();
    const header = screen.getByRole('heading', { name: 'Omdömen' }).closest('header');
    expect(header).toHaveClass('items-center', 'text-center');
  });

  it('keeps the count summary for non-empty reviews (Story 11.6 AC3 — >0 branch unchanged)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(reviewsResponse()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));

    renderWithProviders(<ReviewFlow venue={VENUE} />, { messages });

    // The >0 count summary still renders; no empty message leaks in.
    expect(await screen.findByText('1 omdöme')).toBeInTheDocument();
    expect(screen.queryByText(/Inga omdömen/)).toBeNull();
  });

  it('does not leak an "Inga omdömen" message while reviews are still loading (Story 11.6 AC3 — loading boundary)', async () => {
    // A pending fetch keeps `reviewsQuery.data` undefined: the summary shows the
    // loading label and the skeletons render. Neither the `=0` summary branch nor
    // the empty body must appear before the count is known — otherwise the empty
    // state flashes during load (the pre-fix double-message class of bug).
    let resolveFetch: ((response: Response) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    renderWithProviders(<ReviewFlow venue={VENUE} />, { messages });

    // Loading label present; no empty message of either flavour has leaked in.
    expect(await screen.findByText('Laddar omdömen')).toBeInTheDocument();
    expect(screen.queryByText(/Inga omdömen/)).toBeNull();
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Resolve to the empty response so the pending promise/act warning is flushed.
    resolveFetch?.(
      new Response(JSON.stringify(emptyReviewsResponse()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await screen.findByText('Inga omdömen än.');
  });

  it('shows a single load-error message and no empty message when the reviews fetch fails (Story 11.6 AC3 — error boundary)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('boom', { status: 500 })),
    );

    renderWithProviders(<ReviewFlow venue={VENUE} />, { messages });

    // The error alert renders exactly once; the empty "Inga omdömen" message must
    // NOT co-render (error and empty are mutually exclusive branches).
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Kunde inte ladda omdömen.');
    expect(screen.getAllByText('Kunde inte ladda omdömen.')).toHaveLength(1);
    expect(screen.queryByText(/Inga omdömen/)).toBeNull();
    // The retry affordance is present (single error surface, actionable).
    expect(screen.getByRole('button', { name: 'Försök igen' })).toBeInTheDocument();
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
