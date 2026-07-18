import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderWithProviders, screen, waitFor, within } from '../setup/test-utils';
import { FeedbackFlow } from '@/components/custom/feedback/FeedbackFlow';
import {
  FEEDBACK_VISIT_MIN_ELAPSED_MS,
  markVenueFeedbackSubmitted,
  readVenueDetailView,
  recordVenueDetailView,
} from '@/lib/services/feedback-session';
import feedbackMessages from '@/messages/sv/feedback.json';
import type { VenueDetailDto } from '@/lib/types/api';

let forcedState: string | null = null;

const geolocationMock = vi.hoisted(() => ({
  state: {
    status: 'idle' as 'idle' | 'pending' | 'success' | 'fallback',
    coords: { lat: 57.7089, lng: 11.9746 },
    requestLocation: vi.fn(),
    useCentrum: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === '_state' ? forcedState : null),
  }),
}));

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => geolocationMock.state,
  GeolocationProvider: ({ children }: { children: React.ReactNode }) => children,
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
  weatherGateState: 'not_gated',
  isPartner: true,
  confidence: 92,
  distanceMeters: 0,
  sunExposurePercent: 95,
  tags: [],
  sunWindow: { start: '13:00', end: '18:30' },
  description: 'Stor uteservering med eftermiddagssol.',
  address: 'Tredje Långgatan 9, Göteborg',
  openingHours: { '1': { open: '11:00', close: '22:00' } }, // Story 11.9 (AC2)
  timeline: {
    timezone: 'Europe/Stockholm',
    range: { start: '06:00', end: '21:00' },
    windows: [{ start: '13:00', end: '18:30', status: 'Sunny' }],
  },
};

const OTHER_VENUE: VenueDetailDto = {
  ...VENUE,
  id: '2',
  venueId: '2',
  venueName: 'Bryggerietsoltak',
  venueSlug: 'bryggeriet-soltak',
  slug: 'bryggeriet-soltak',
  address: 'Andra Långgatan 20, Göteborg',
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

describe('FeedbackFlow', () => {
  beforeEach(() => {
    forcedState = null;
    geolocationMock.state = {
      status: 'idle',
      coords: { lat: 57.7089, lng: 11.9746 },
      requestLocation: vi.fn(),
      useCentrum: vi.fn(),
    };
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders for forced feedback state regardless of normal eligibility', () => {
    forcedState = 'feedback';
    renderWithProviders(
      <FeedbackFlow
        venue={VENUE}
        plannerTimestamp="2026-06-07T12:00:00.000Z"
        isLivePlannerTime={false}
      />,
      { messages },
    );

    expect(screen.getByTestId('feedback-prompt')).toBeInTheDocument();
    expect(screen.getByText('Kafé Magasinet')).toBeInTheDocument();
  });

  it('suppresses normal feedback when the planner is not live/current', () => {
    recordVenueDetailView(
      VENUE,
      '2026-06-07T12:00:00.000Z',
      Date.now() - FEEDBACK_VISIT_MIN_ELAPSED_MS - 1,
    );
    geolocationMock.state = {
      ...geolocationMock.state,
      status: 'success',
      coords: VENUE.location,
    };

    renderWithProviders(
      <FeedbackFlow
        venue={VENUE}
        plannerTimestamp="2026-06-07T12:00:00.000Z"
        isLivePlannerTime={false}
      />,
      { messages },
    );

    expect(screen.queryByTestId('feedback-prompt')).not.toBeInTheDocument();
  });

  it('shows the forced prompt even after same-session submission', () => {
    forcedState = 'feedback';
    markVenueFeedbackSubmitted(VENUE.id);
    renderWithProviders(
      <FeedbackFlow venue={VENUE} plannerTimestamp="2026-06-07T12:00:00.000Z" />,
      { messages },
    );

    expect(screen.getByTestId('feedback-prompt')).toBeInTheDocument();
  });

  it('submits the current prediction payload and shows confirmation without closing detail', async () => {
    forcedState = 'feedback';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        id: 'feedback_1',
        venueId: '1',
        venueSlug: 'test-venue-sunny',
        userTimestamp: '2026-06-07T12:00:00.000Z',
        predictedState: 'Sunny',
        wasSunny: true,
        createdAt: '2026-06-07T12:01:00.000Z',
      }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(
      <FeedbackFlow venue={VENUE} plannerTimestamp="2026-06-07T12:00:00.000Z" />,
      { messages },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Var det soligt när du kom? Ja' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skicka' }));

    await waitFor(() => expect(screen.getByText('Tack för din feedback.')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/venues/test-venue-sunny/feedback', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"predictedState":"Sunny"'),
    }));
    expect(fetchMock).toHaveBeenCalledWith('/api/venues/test-venue-sunny/feedback', expect.objectContaining({
      body: expect.stringContaining('"sunAccuracy":"sunny"'),
    }));
  });

  it('submits the prediction snapshot from the qualifying detail view', async () => {
    forcedState = 'feedback';
    recordVenueDetailView(
      VENUE,
      '2026-06-07T12:00:00.000Z',
      Date.now() - FEEDBACK_VISIT_MIN_ELAPSED_MS - 1,
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        id: 'feedback_1',
        venueId: '1',
        venueSlug: 'test-venue-sunny',
        userTimestamp: '2026-06-07T12:00:00.000Z',
        predictedState: 'Sunny',
        wasSunny: true,
        createdAt: '2026-06-07T12:01:00.000Z',
      }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(
      <FeedbackFlow
        venue={{ ...VENUE, currentSunStatus: 'Shaded', confidence: 44 }}
        plannerTimestamp="2026-06-07T12:10:00.000Z"
      />,
      { messages },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Var det soligt när du kom? Ja' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skicka' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      userTimestamp: string;
      predictedState: string;
      confidenceAtPrediction: number;
    };
    expect(body).toMatchObject({
      userTimestamp: '2026-06-07T12:00:00.000Z',
      predictedState: 'Sunny',
      confidenceAtPrediction: 92,
    });
  });

  it('keeps the form visible on submit failure for retry', async () => {
    forcedState = 'feedback';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'bad' }), { status: 500 })));
    renderWithProviders(
      <FeedbackFlow venue={VENUE} plannerTimestamp="2026-06-07T12:00:00.000Z" />,
      { messages },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Var det soligt när du kom? Nej' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skicka' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Kunde inte skicka. Försök igen.'));
    expect(screen.getByRole('button', { name: 'Var det soligt när du kom? Nej' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not render before normal likely-visited eligibility is met', () => {
    recordVenueDetailView(VENUE, '2026-06-07T12:00:00.000Z');
    renderWithProviders(
      <FeedbackFlow venue={VENUE} plannerTimestamp="2026-06-07T12:00:00.000Z" />,
      { messages },
    );

    expect(screen.queryByTestId('feedback-prompt')).not.toBeInTheDocument();
  });

  it('preserves the prior qualifying detail view before evaluating eligibility', async () => {
    const oldViewedAt = Date.now() - FEEDBACK_VISIT_MIN_ELAPSED_MS - 1;
    recordVenueDetailView(VENUE, '2026-06-07T12:00:00.000Z', oldViewedAt);
    geolocationMock.state = {
      ...geolocationMock.state,
      status: 'success',
      coords: VENUE.location,
    };

    renderWithProviders(
      <FeedbackFlow venue={VENUE} plannerTimestamp="2026-06-07T12:10:00.000Z" />,
      { messages },
    );

    await waitFor(() => expect(screen.getByTestId('feedback-prompt')).toBeInTheDocument());
    expect(readVenueDetailView(VENUE.id)?.viewedAt).toBe(oldViewedAt);
  });

  it('rechecks eligibility when the visit threshold elapses', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T12:00:00.000Z'));
    recordVenueDetailView(VENUE, '2026-06-07T12:00:00.000Z');
    geolocationMock.state = {
      ...geolocationMock.state,
      status: 'success',
      coords: VENUE.location,
    };

    renderWithProviders(
      <FeedbackFlow venue={VENUE} plannerTimestamp="2026-06-07T12:00:00.000Z" />,
      { messages },
    );

    expect(screen.queryByTestId('feedback-prompt')).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(FEEDBACK_VISIT_MIN_ELAPSED_MS + 1);
    });

    expect(screen.getByTestId('feedback-prompt')).toBeInTheDocument();
  });

  it('does not add an extra visit threshold when geolocation resolves late', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T12:00:00.000Z'));
    recordVenueDetailView(VENUE, '2026-06-07T12:00:00.000Z');

    const { rerender } = renderWithProviders(
      <FeedbackFlow venue={VENUE} plannerTimestamp="2026-06-07T12:00:00.000Z" />,
      { messages },
    );

    await act(async () => {
      vi.advanceTimersByTime(FEEDBACK_VISIT_MIN_ELAPSED_MS + 1);
    });
    geolocationMock.state = {
      ...geolocationMock.state,
      status: 'success',
      coords: VENUE.location,
    };
    rerender(<FeedbackFlow venue={VENUE} plannerTimestamp="2026-06-07T12:00:00.000Z" />);

    await act(async () => {});
    expect(screen.getByTestId('feedback-prompt')).toBeInTheDocument();
  });

  it('resets local dismissal state when the venue changes', async () => {
    forcedState = 'feedback';
    vi.useFakeTimers();
    const { rerender } = renderWithProviders(
      <FeedbackFlow venue={VENUE} plannerTimestamp="2026-06-07T12:00:00.000Z" />,
      { messages },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Stäng' }));
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByTestId('feedback-prompt')).not.toBeInTheDocument();

    rerender(<FeedbackFlow venue={OTHER_VENUE} plannerTimestamp="2026-06-07T12:00:00.000Z" />);

    await act(async () => {});
    expect(screen.getByText('Bryggerietsoltak')).toBeInTheDocument();
  });

  it('hides a sibling responsive prompt after same-session submission', async () => {
    recordVenueDetailView(
      VENUE,
      '2026-06-07T12:00:00.000Z',
      Date.now() - FEEDBACK_VISIT_MIN_ELAPSED_MS - 1,
    );
    geolocationMock.state = {
      ...geolocationMock.state,
      status: 'success',
      coords: VENUE.location,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        id: 'feedback_1',
        venueId: '1',
        venueSlug: 'test-venue-sunny',
        userTimestamp: '2026-06-07T12:00:00.000Z',
        predictedState: 'Sunny',
        wasSunny: true,
        createdAt: '2026-06-07T12:01:00.000Z',
      }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    ));

    renderWithProviders(
      <>
        <FeedbackFlow venue={VENUE} plannerTimestamp="2026-06-07T12:00:00.000Z" />
        <FeedbackFlow venue={VENUE} plannerTimestamp="2026-06-07T12:00:00.000Z" />
      </>,
      { messages },
    );

    expect(screen.getAllByTestId('feedback-prompt')).toHaveLength(2);
    const firstPrompt = screen.getAllByTestId('feedback-prompt')[0];
    fireEvent.click(within(firstPrompt).getByRole('button', { name: 'Var det soligt när du kom? Ja' }));
    fireEvent.click(within(firstPrompt).getByRole('button', { name: 'Skicka' }));

    await waitFor(() => expect(screen.getByText('Tack för din feedback.')).toBeInTheDocument());
    expect(screen.getAllByTestId('feedback-prompt')).toHaveLength(1);
  });
});
