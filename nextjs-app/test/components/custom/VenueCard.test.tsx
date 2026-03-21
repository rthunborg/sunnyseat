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

    it('compact card has no directions button (moved to detail page)', () => {
      renderCard();
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.queryByTestId('venue-directions-btn')).toBeNull();
    });
  });

  describe('card interaction', () => {
    it('navigates to /v/[slug] on card click', () => {
      renderCard({ slug: 'cafe-husaren' });
      const card = screen.getByRole('article');
      fireEvent.click(card);
      expect(pushMock).toHaveBeenCalledWith('/v/cafe-husaren');
    });

    it('entire compact card is a single tap zone (no competing buttons)', () => {
      renderCard({ slug: 'cafe-husaren' });
      const card = screen.getByRole('article');
      // No buttons within the card — entire surface navigates to detail
      expect(card.querySelectorAll('button').length).toBe(0);
      fireEvent.click(card);
      expect(pushMock).toHaveBeenCalledWith('/v/cafe-husaren');
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

    it('does not render "Gå dit" button on compact card (directions on detail page only)', () => {
      renderCard();
      expect(screen.queryByText('Gå dit')).toBeNull();
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

  describe('enhanced card differentiation', () => {
    it('sunny cards get elevated shadow and left border', () => {
      renderCard({ variant: 'sunny' });
      const card = screen.getByRole('article');
      expect(card.className).toContain('shadow-elevated');
      expect(card.className).toContain('border-l-[3px]');
      expect(card.className).toContain('border-l-sun-sunny');
    });

    it('shaded cards get reduced opacity and lighter shadow', () => {
      renderCard({ variant: 'shaded' });
      const card = screen.getByRole('article');
      expect(card.className).toContain('opacity-85');
      expect(card.className).toContain('shadow-sm');
    });

    it('partner sunny cards get gold ring and gradient', () => {
      renderCard({ variant: 'sunny', isPartner: true });
      const card = screen.getByRole('article');
      expect(card.className).toContain('ring-2');
      expect(card.className).toContain('ring-[var(--color-partner-gold)]');
      expect(card.className).toContain('bg-gradient-to-r');
    });

    it('non-sunny partner cards get gold ring without gradient', () => {
      renderCard({ variant: 'shaded', isPartner: true });
      const card = screen.getByRole('article');
      expect(card.className).toContain('ring-2');
      expect(card.className).toContain('ring-[var(--color-partner-gold)]');
      expect(card.className).not.toContain('bg-gradient-to-r');
    });
  });

  describe('best choice badge', () => {
    it('renders "Bästa valet" badge when isBestChoice is true', () => {
      render(
        <LanguageProvider>
          <VenueCard {...makeProps({ variant: 'sunny' })} isBestChoice={true} />
        </LanguageProvider>
      );
      expect(screen.getByTestId('best-choice-badge')).toBeInTheDocument();
      expect(screen.getByText('Bästa valet')).toBeInTheDocument();
    });

    it('does not render badge when isBestChoice is false', () => {
      renderCard({ variant: 'sunny' });
      expect(screen.queryByTestId('best-choice-badge')).not.toBeInTheDocument();
    });
  });

  describe('highlighted state', () => {
    it('applies fade animation when highlighted', () => {
      renderCard({ variant: 'sunny', highlighted: true });
      const card = screen.getByRole('article');
      expect(card.className).toContain('animate-highlight-fade');
    });

    it('does not apply fade animation when not highlighted', () => {
      renderCard({ highlighted: false });
      const card = screen.getByRole('article');
      expect(card.className).not.toContain('animate-highlight-fade');
    });
  });

  describe('expanded layout (desktop)', () => {
    it('renders taller card with h-[160px]', () => {
      renderCard({ layout: 'expanded' });
      const card = screen.getByRole('article');
      expect(card.className).toContain('h-[160px]');
      expect(card.className).not.toContain('h-[120px]');
    });

    it('shows neighborhood as secondary line below venue name', () => {
      renderCard({ layout: 'expanded', neighborhood: 'Linné' });
      expect(screen.getByTestId('expanded-neighborhood')).toBeInTheDocument();
      expect(screen.getByTestId('expanded-neighborhood').textContent).toBe('Linné');
    });

    it('hides inline neighborhood in status bar when expanded', () => {
      renderCard({ layout: 'expanded', neighborhood: 'Linné' });
      // Neighborhood should appear only in the expanded secondary line, not in status bar
      const card = screen.getByRole('article');
      const statusBar = card.querySelector('.flex.items-center.gap-2');
      // The inline neighborhood span should not be present in expanded layout
      const spans = statusBar?.querySelectorAll('span') ?? [];
      const inlineNeighborhood = Array.from(spans).find(
        (s) => s.textContent === 'Linné' && s.className.includes('text-text-secondary')
      );
      expect(inlineNeighborhood).toBeUndefined();
    });

    it('shows directions button in expanded layout', () => {
      renderCard({ layout: 'expanded' });
      expect(screen.getByTestId('venue-directions-btn')).toBeInTheDocument();
      expect(screen.getByText('Gå dit')).toBeInTheDocument();
    });

    it('directions button opens Google Maps', () => {
      const openMock = vi.spyOn(window, 'open').mockImplementation(() => null);
      renderCard({ layout: 'expanded', lat: 57.699, lng: 11.953 });
      fireEvent.click(screen.getByTestId('venue-directions-btn'));
      expect(openMock).toHaveBeenCalledWith(
        'https://www.google.com/maps/dir/?api=1&destination=57.699,11.953',
        '_blank',
        'noopener,noreferrer'
      );
      openMock.mockRestore();
    });

    it('directions button click does not navigate to venue detail', () => {
      vi.spyOn(window, 'open').mockImplementation(() => null);
      renderCard({ layout: 'expanded', slug: 'cafe-husaren' });
      fireEvent.click(screen.getByTestId('venue-directions-btn'));
      expect(pushMock).not.toHaveBeenCalled();
    });

    it('has hover:shadow-elevated class in expanded layout', () => {
      renderCard({ layout: 'expanded' });
      const card = screen.getByRole('article');
      expect(card.className).toContain('hover:shadow-elevated');
    });

    it('sets data-layout="expanded"', () => {
      renderCard({ layout: 'expanded' });
      const card = screen.getByRole('article');
      expect(card.getAttribute('data-layout')).toBe('expanded');
    });

    it('calls onMouseEnter/onMouseLeave', () => {
      const onEnter = vi.fn();
      const onLeave = vi.fn();
      renderCard({ layout: 'expanded', onMouseEnter: onEnter, onMouseLeave: onLeave });
      const card = screen.getByRole('article');
      fireEvent.mouseEnter(card);
      expect(onEnter).toHaveBeenCalledTimes(1);
      fireEvent.mouseLeave(card);
      expect(onLeave).toHaveBeenCalledTimes(1);
    });
  });

  describe('compact layout (default)', () => {
    it('renders default card height h-[120px]', () => {
      renderCard();
      const card = screen.getByRole('article');
      expect(card.className).toContain('h-[120px]');
    });

    it('does not show expanded neighborhood line', () => {
      renderCard({ neighborhood: 'Haga' });
      expect(screen.queryByTestId('expanded-neighborhood')).not.toBeInTheDocument();
    });

    it('does not show directions button', () => {
      renderCard();
      expect(screen.queryByTestId('venue-directions-btn')).not.toBeInTheDocument();
    });

    it('does not have hover:shadow-elevated class', () => {
      renderCard();
      const card = screen.getByRole('article');
      expect(card.className).not.toContain('hover:shadow-elevated');
    });

    it('sets data-layout="compact"', () => {
      renderCard();
      const card = screen.getByRole('article');
      expect(card.getAttribute('data-layout')).toBe('compact');
    });
  });

  describe('keyboard navigation', () => {
    it('navigates on Enter key', () => {
      renderCard({ slug: 'test-venue' });
      const card = screen.getByRole('article');
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(pushMock).toHaveBeenCalledWith('/v/test-venue');
    });

    it('navigates on Space key', () => {
      renderCard({ slug: 'test-venue' });
      const card = screen.getByRole('article');
      fireEvent.keyDown(card, { key: ' ' });
      expect(pushMock).toHaveBeenCalledWith('/v/test-venue');
    });

    it('has tabIndex=0 for keyboard focus', () => {
      renderCard();
      const card = screen.getByRole('article');
      expect(card.getAttribute('tabindex')).toBe('0');
    });
  });
});
