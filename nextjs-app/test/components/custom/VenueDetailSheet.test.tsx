import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VenueDetailSheet } from '@/components/custom/VenueDetailSheet';
import { LanguageProvider } from '@/lib/i18n';
import type { SunWindow } from '@/lib/types/venue';
import type { SkyCondition, SunStatus } from '@/lib/types/design-tokens';

// Mock next/navigation
const backMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: backMock }),
}));

// Mock useReducedMotion
let mockReducedMotion = false;
vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}));

// Mock framer-motion to simplify testing
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      onClick,
      onKeyDown,
      className,
      'data-testid': testId,
      role,
      'aria-modal': ariaModal,
      'aria-label': ariaLabel,
      drag,
      onDragEnd,
      ...rest
    }: Record<string, unknown>) => {
      const props: Record<string, unknown> = {
        className,
        'data-testid': testId,
        role,
        'aria-modal': ariaModal,
        'aria-label': ariaLabel,
      };
      if (onClick) props.onClick = onClick;
      if (onKeyDown) props.onKeyDown = onKeyDown;
      // Only mark as draggable when drag is truthy (e.g. 'y'), not when false
      if (drag && onDragEnd) props['data-drag-end'] = 'true';
      return <div {...props}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function makeVenue(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  neighborhood: string;
  lat: number;
  lng: number;
  todayWindows: SunWindow[];
  tomorrowWindows: SunWindow[];
  currentSkyCondition: SkyCondition;
  currentSunStatus: SunStatus;
  is_partner: boolean;
  booking_url: string | null;
  website_url: string | null;
}> = {}) {
  return {
    id: 'v1',
    name: 'Test Café',
    slug: 'test-cafe',
    neighborhood: 'Linné',
    lat: 57.6969,
    lng: 11.9573,
    todayWindows: [
      {
        start: '2026-03-15T08:00:00Z',
        end: '2026-03-15T12:30:00Z',
        sun_status: 'sunny' as SunStatus,
        sky_condition: 'clear' as SkyCondition,
      },
    ],
    tomorrowWindows: [
      {
        start: '2026-03-16T09:00:00Z',
        end: '2026-03-16T14:00:00Z',
        sun_status: 'sunny' as SunStatus,
        sky_condition: 'clear' as SkyCondition,
      },
    ],
    currentSkyCondition: 'clear' as SkyCondition,
    currentSunStatus: 'sunny' as SunStatus,
    ...overrides,
  };
}

function renderSheet(venueOverrides = {}) {
  return render(
    <LanguageProvider>
      <VenueDetailSheet venue={makeVenue(venueOverrides)} />
    </LanguageProvider>
  );
}

describe('VenueDetailSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReducedMotion = false;
  });

  it('renders backdrop with dialog role', () => {
    renderSheet();
    const backdrop = screen.getByTestId('venue-detail-sheet-backdrop');
    expect(backdrop).toBeVisible();
    expect(backdrop).toHaveAttribute('role', 'dialog');
    expect(backdrop).toHaveAttribute('aria-modal', 'true');
  });

  it('renders sheet container', () => {
    renderSheet();
    const sheet = screen.getByTestId('venue-detail-sheet');
    expect(sheet).toBeVisible();
  });

  it('renders venue name in aria-label on dialog', () => {
    renderSheet({ name: 'Solkatten' });
    const backdrop = screen.getByTestId('venue-detail-sheet-backdrop');
    expect(backdrop).toHaveAttribute('aria-label', 'Solkatten');
  });

  it('renders venue detail content inside sheet', () => {
    renderSheet({ name: 'Solkatten' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Solkatten');
  });

  it('renders back button that calls router.back()', () => {
    renderSheet();
    const btn = screen.getByTestId('back-button');
    fireEvent.click(btn);
    expect(backMock).toHaveBeenCalledOnce();
  });

  it('renders drag handle on mobile', () => {
    renderSheet();
    const sheet = screen.getByTestId('venue-detail-sheet');
    // Sheet has drag capability
    expect(sheet).toHaveAttribute('data-drag-end', 'true');
  });

  it('clicking backdrop closes the sheet', () => {
    renderSheet();
    const backdrop = screen.getByTestId('venue-detail-sheet-backdrop');
    // Click the backdrop itself (not a child)
    fireEvent.click(backdrop);
    expect(backMock).toHaveBeenCalledOnce();
  });

  it('sheet has max-height constraint on mobile', () => {
    renderSheet();
    const sheet = screen.getByTestId('venue-detail-sheet');
    expect(sheet.className).toContain('max-h-[85vh]');
  });

  it('sheet has desktop side panel styles', () => {
    renderSheet();
    const sheet = screen.getByTestId('venue-detail-sheet');
    expect(sheet.className).toContain('lg:w-[480px]');
  });

  it('renders backdrop blur for mobile', () => {
    const { container } = renderSheet();
    const blurOverlay = container.querySelector('[aria-hidden="true"]');
    expect(blurOverlay?.className).toContain('backdrop-blur-[4px]');
  });

  it('disables drag when reduced motion is preferred', () => {
    mockReducedMotion = true;
    renderSheet();
    const sheet = screen.getByTestId('venue-detail-sheet');
    // When reduced motion, drag is disabled (no data-drag-end attribute)
    expect(sheet).not.toHaveAttribute('data-drag-end');
  });
});
