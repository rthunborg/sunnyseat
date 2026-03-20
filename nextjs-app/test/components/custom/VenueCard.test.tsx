import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VenueCard } from '@/components/custom/VenueCard';
import { LanguageProvider } from '@/lib/i18n';
import type { VenueCardProps } from '@/lib/types/card-states';

// Mock next/navigation
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Mock useReducedMotion
vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

function makeProps(overrides: Partial<VenueCardProps> = {}): VenueCardProps {
  return {
    venueId: 'v1',
    venueName: 'Café Husaren',
    neighborhood: 'Haga',
    variant: 'sunny',
    sunExposurePercent: 85,
    distanceMeters: 350,
    skyCondition: 'clear',
    confidence: 0.9,
    sunWindowStart: '2026-03-14T10:00:00Z',
    sunWindowEnd: '2026-03-14T17:00:00Z',
    slug: 'cafe-husaren',
    lat: 57.699,
    lng: 11.953,
    highlighted: false,
    sunWindows: [
      {
        start: '2026-03-14T10:00:00Z',
        end: '2026-03-14T17:00:00Z',
        sun_status: 'sunny',
        sky_condition: 'clear',
      },
    ],
    ...overrides,
  };
}

function renderCard(props: Partial<VenueCardProps> = {}) {
  return render(
    <LanguageProvider>
      <VenueCard {...makeProps(props)} />
    </LanguageProvider>
  );
}

beforeEach(() => {
  pushMock.mockReset();
});

describe('VenueCard', () => {
  describe('variant rendering', () => {
    it('renders sunny variant with correct background', () => {
      renderCard({ variant: 'sunny' });
      const card = screen.getByRole('article');
      expect(card.className).toContain('bg-sun-sunny-bg');
    });

    it('renders partial variant with correct background', () => {
      renderCard({ variant: 'partial' });
      const card = screen.getByRole('article');
      expect(card.className).toContain('bg-sun-partial-bg');
    });

    it('renders shaded variant with correct background', () => {
      renderCard({ variant: 'shaded' });
      const card = screen.getByRole('article');
      expect(card.className).toContain('bg-sun-shaded-bg');
    });

    it('renders upcoming variant with correct background', () => {
      renderCard({ variant: 'upcoming' });
      const card = screen.getByRole('article');
      expect(card.className).toContain('bg-sun-upcoming-bg');
    });
  });

  describe('status dot', () => {
    it('renders sunny dot color', () => {
      renderCard({ variant: 'sunny' });
      const card = screen.getByRole('article');
      const dot = card.querySelector('.rounded-full');
      expect(dot?.className).toContain('bg-sun-sunny');
    });

    it('renders shaded dot color', () => {
      renderCard({ variant: 'shaded' });
      const card = screen.getByRole('article');
      const dot = card.querySelector('.rounded-full');
      expect(dot?.className).toContain('bg-sun-shaded');
    });
  });

  describe('accessibility', () => {
    it('has role="article"', () => {
      renderCard();
      expect(screen.getByRole('article')).toBeTruthy();
    });

    it('has computed aria-label with venue info', () => {
      renderCard();
      const card = screen.getByRole('article');
      const label = card.getAttribute('aria-label') ?? '';
      expect(label).toContain('Café Husaren');
      expect(label).toContain('Soligt');
      expect(label).toContain('400 m');
    });

    it('"Gå dit" button has directionsTo aria-label', () => {
      renderCard();
      const button = screen.getByRole('button', { name: /Vägbeskrivning till/i });
      expect(button).toBeTruthy();
      expect(button.getAttribute('aria-label')).toContain('Café Husaren');
    });
  });

  describe('card interaction', () => {
    it('navigates to /v/[slug] on card click', () => {
      renderCard({ slug: 'cafe-husaren' });
      const card = screen.getByRole('article');
      fireEvent.click(card);
      expect(pushMock).toHaveBeenCalledWith('/v/cafe-husaren');
    });

    it('"Gå dit" button calls stopPropagation and does not trigger card navigation', () => {
      renderCard();
      const button = screen.getByRole('button', { name: /Vägbeskrivning till/i });

      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      fireEvent.click(button);

      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining('google.com/maps/dir'),
        '_blank',
        'noopener'
      );

      // stopPropagation should prevent card onClick from firing
      expect(pushMock).not.toHaveBeenCalled();

      openSpy.mockRestore();
    });
  });

  describe('i18n', () => {
    it('renders Swedish status labels by default', () => {
      renderCard({ variant: 'sunny' });
      expect(screen.getByText('Soligt')).toBeTruthy();
    });

    it('renders Swedish distance format', () => {
      renderCard({ distanceMeters: 200 });
      expect(screen.getByText('200 m')).toBeTruthy();
    });

    it('renders "Gå dit" button text in Swedish', () => {
      renderCard();
      expect(screen.getByText('Gå dit')).toBeTruthy();
    });
  });

  describe('venue name', () => {
    it('displays venue name as-is (Swedish, from data)', () => {
      renderCard({ venueName: 'Ölstugan Tullen' });
      expect(screen.getByText('Ölstugan Tullen')).toBeTruthy();
    });
  });

  describe('partner badge', () => {
    it('shows Partner badge when isPartner is true', () => {
      renderCard({ isPartner: true });
      expect(screen.getByText('Partner')).toBeTruthy();
    });

    it('applies gold ring when isPartner is true', () => {
      renderCard({ isPartner: true });
      const card = screen.getByRole('article');
      expect(card.className).toContain('ring-2');
      expect(card.className).toContain('ring-[var(--color-partner-gold)]');
    });

    it('does not show Partner badge when isPartner is false', () => {
      renderCard({ isPartner: false });
      expect(screen.queryByText('Partner')).toBeNull();
    });

    it('does not apply gold ring when isPartner is not set', () => {
      renderCard();
      const card = screen.getByRole('article');
      expect(card.className).not.toContain('ring-[var(--color-partner-gold)]');
    });
  });

  describe('highlighted state', () => {
    it('applies left border and fade animation when highlighted', () => {
      renderCard({ variant: 'sunny', highlighted: true });
      const card = screen.getByRole('article');
      expect(card.className).toContain('border-l-[3px]');
      expect(card.className).toContain('border-l-sun-sunny');
      expect(card.className).toContain('animate-highlight-fade');
    });

    it('does not apply left border when not highlighted', () => {
      renderCard({ highlighted: false });
      const card = screen.getByRole('article');
      expect(card.className).not.toContain('border-l-[3px]');
      expect(card.className).not.toContain('animate-highlight-fade');
    });
  });
});
