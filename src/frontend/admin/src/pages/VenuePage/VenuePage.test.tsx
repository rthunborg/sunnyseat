import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { VenuePage } from './VenuePage';

// Mock the hooks
vi.mock('../../hooks/useVenueDetails', () => ({
  useVenueDetails: vi.fn(),
}));

vi.mock('../../hooks/useAutoRefresh', () => ({
  useAutoRefresh: vi.fn(() => ({ lastRefresh: new Date('2025-10-08T12:00:00Z') })),
}));

vi.mock('../../hooks/useShareLink', () => ({
  useShareLink: vi.fn(() => ({
    shareUrl: 'http://localhost/v/test-venue-1',
    share: vi.fn(),
  })),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ slug: 'test-venue-1' }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    useNavigate: () => vi.fn(),
  };
});

// Mock components
vi.mock('../../components/patio/SunWindowsTable', () => ({
  SunWindowsTable: () => <div>Sun Windows Table</div>,
}));

vi.mock('../../components/patio/NoSunExpected', () => ({
  NoSunExpected: () => <div>No Sun Expected</div>,
}));

describe('VenuePage', () => {
  const mockVenue = {
    id: 1,
    slug: 'test-venue-1',
    name: 'Test Venue',
    address: '123 Test St',
    location: {
      latitude: 57.7089,
      longitude: 11.9746,
    },
    patios: [],
    sunForecast: {
      today: {
        date: '2025-10-08',
        sunWindows: [
          {
            id: 1,
            patioId: 1,
            date: '2025-10-08',
            startTime: '2025-10-08T08:00:00Z',
            endTime: '2025-10-08T10:00:00Z',
            localStartTime: '2025-10-08T10:00:00',
            localEndTime: '2025-10-08T12:00:00',
            duration: '02:00:00',
            peakExposure: 85,
            minExposurePercent: 70,
            maxExposurePercent: 95,
            averageExposurePercent: 85,
            peakExposureTime: '2025-10-08T09:00:00Z',
            localPeakExposureTime: '2025-10-08T11:00:00',
            quality: 'Good' as const,
            confidence: 80,
            description: 'Good sun exposure',
            isRecommended: true,
            recommendationReason: 'High sun exposure',
            priorityScore: 0,
            dataPointCount: 0,
            calculatedAt: '2025-10-08T00:00:00Z',
          },
        ],
        noSunReason: undefined,
      },
      tomorrow: {
        date: '2025-10-09',
        sunWindows: [],
        noSunReason: 'Cloud' as const,
      },
      generatedAt: '2025-10-08T00:00:00Z',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', async () => {
    const { useVenueDetails } = await import('../../hooks/useVenueDetails');
    vi.mocked(useVenueDetails).mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <VenuePage />
      </BrowserRouter>
    );

    // Check for skeleton loader animation class
    expect(screen.getByTestId('venue-skeleton') || screen.getByText(/loading/i) || document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('should display venue details when loaded', async () => {
    const { useVenueDetails } = await import('../../hooks/useVenueDetails');
    vi.mocked(useVenueDetails).mockReturnValue({
      data: mockVenue,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <VenuePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Venue')).toBeTruthy();
      expect(screen.getByText('123 Test St')).toBeTruthy();
    });
  });

  it('should display error state when venue not found', async () => {
    const { useVenueDetails } = await import('../../hooks/useVenueDetails');
    vi.mocked(useVenueDetails).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('Venue not found'),
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <VenuePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/venue not found/i)).toBeTruthy();
    });
  });
});


