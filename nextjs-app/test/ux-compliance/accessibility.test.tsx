/**
 * Story 10.9 — UX Compliance: Accessibility & Design Token Tests
 *
 * Verifies WCAG 2.1 AA compliance, touch targets, i18n, ARIA attributes,
 * and design token usage across all key components.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/lib/i18n';
import { VenueCard } from '@/components/custom/VenueCard';
import { LocationPermissionPrompt } from '@/components/custom/LocationPermissionPrompt';
import VenueDetailPage from '@/components/custom/VenueDetailPage';
import { SearchBar } from '@/components/custom/SearchBar';
import { CandidateCard } from '@/components/custom/CandidateCard';
import { TimeSlider } from '@/components/custom/TimeSlider';
import { MiniTimeline } from '@/components/custom/MiniTimeline';
import { SkyConditionBadge } from '@/components/composed/SkyConditionBadge';
import { SunWindowsTable } from '@/components/custom/SunWindowsTable';
import { DatePicker } from '@/components/custom/DatePicker';

// ─── Mocks ───────────────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/lib/context/PremiumContext', () => ({
  PremiumProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePremiumContext: () => ({ isPremium: true }),
}));

vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

vi.mock('@/lib/hooks/usePremium', () => ({
  usePremium: () => ({
    isPremium: true,
    isLoading: false,
    sessionId: 'test',
    expiresAt: undefined,
    initiatePurchase: vi.fn(),
    refreshStatus: vi.fn(),
  }),
}));

function withLanguage(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

const defaultVenueProps = {
  venueName: 'Test Café',
  neighborhood: 'Linné',
  variant: 'sunny' as const,
  distanceMeters: 200,
  skyCondition: 'clear' as const,
  slug: 'test-cafe',
  lat: 57.7,
  lng: 11.97,
  sunWindows: [],
};

const defaultDetailProps = {
  venue: {
    id: '1',
    name: 'Test',
    slug: 'test',
    neighborhood: 'Linné',
    lat: 57.7,
    lng: 11.97,
    todayWindows: [],
    tomorrowWindows: [],
    currentSkyCondition: 'clear' as const,
    currentSunStatus: 'sunny' as const,
  },
};

// ─── AC 2: Touch Target Size Tests ───────────────────────────────────
describe('AC 2: Touch Target Sizes', () => {
  it('VenueCard "Gå dit" button uses touch-comfortable height token', () => {
    withLanguage(<VenueCard {...defaultVenueProps} />);
    const btn = screen.getByTestId('venue-directions-btn');
    expect(btn.className).toContain('h-[var(--spacing-touch-comfortable)]');
  });

  it('LocationPermissionPrompt "Tillåt plats" button is 56px (primary action)', () => {
    withLanguage(
      <LocationPermissionPrompt
        permissionStatus="prompt"
        onRequestLocation={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    const btn = screen.getByText('Tillåt plats');
    expect(btn.className).toContain('h-[56px]');
  });

  it('VenueDetailPage "Tillbaka" button meets minimum touch height', () => {
    withLanguage(<VenueDetailPage {...defaultDetailProps} />);
    const backBtn = screen.getByTestId('back-button');
    expect(backBtn.className).toContain('min-h-[var(--spacing-touch-min)]');
  });

  it('VenueDetailPage "Dela" button meets minimum touch height', () => {
    withLanguage(<VenueDetailPage {...defaultDetailProps} />);
    const shareBtn = screen.getByTestId('share-button');
    expect(shareBtn.className).toContain('min-h-[var(--spacing-touch-min)]');
  });

  it('SearchBar input meets minimum touch height', () => {
    withLanguage(<SearchBar />);
    const input = screen.getByRole('searchbox');
    expect(input.className).toContain('h-[var(--spacing-touch-min)]');
  });

  it('CandidateCard confirm button uses touch-comfortable height token', () => {
    withLanguage(
      <CandidateCard venueId="1" venueName="Test Café" neighborhood="Linné" />
    );
    const btn = screen.getByRole('button', { name: /bekräfta/i });
    expect(btn.className).toContain('h-[var(--spacing-touch-comfortable)]');
  });

  it('TimeSlider range input uses touch-min token for height', () => {
    withLanguage(<TimeSlider value={0} onChange={vi.fn()} />);
    const input = screen.getByTestId('time-slider-input');
    expect(input.className).toContain('h-[var(--spacing-touch-min)]');
  });
});

// ─── AC 4: Swedish-First Language Check ──────────────────────────────
describe('AC 4: Swedish-First Language', () => {
  it('status labels are in Swedish', () => {
    withLanguage(<VenueCard {...defaultVenueProps} />);
    expect(screen.getByText('Soligt')).toBeDefined();
  });

  it('VenueCard directions button says "Gå dit" in Swedish', () => {
    withLanguage(<VenueCard {...defaultVenueProps} />);
    expect(screen.getByText('Gå dit')).toBeDefined();
  });

  it('VenueDetailPage back button says "Tillbaka"', () => {
    withLanguage(<VenueDetailPage {...defaultDetailProps} />);
    expect(screen.getByText('Tillbaka')).toBeDefined();
  });

  it('VenueDetailPage share button says "Dela"', () => {
    withLanguage(<VenueDetailPage {...defaultDetailProps} />);
    expect(screen.getByText('Dela')).toBeDefined();
  });

  it('TimeSlider uses i18n for label text', () => {
    withLanguage(<TimeSlider value={0} onChange={vi.fn()} />);
    expect(screen.getByText('Tidsprognos')).toBeDefined();
    expect(screen.getByText('Nu')).toBeDefined();
  });

  it('DatePicker uses i18n for button label', () => {
    withLanguage(
      <DatePicker selectedDate={null} onDateSelect={vi.fn()} />
    );
    expect(screen.getByText('Datum')).toBeDefined();
  });

  it('SunWindowsTable uses 24h time format (HH:MM)', () => {
    const window = {
      start: '2026-03-19T12:00:00Z',
      end: '2026-03-19T14:30:00Z',
      sun_status: 'sunny' as const,
      sky_condition: 'clear' as const,
    };
    withLanguage(
      <SunWindowsTable todayWindows={[window]} tomorrowWindows={[]} />
    );
    // Should show 24h format and NOT contain AM/PM
    const cells = screen.getAllByRole('cell');
    const timeCell = cells.find((c) => c.textContent?.includes(':'));
    expect(timeCell).toBeTruthy();
    expect(timeCell!.textContent).not.toMatch(/[AP]M/i);
    expect(timeCell!.textContent).toMatch(/\d{2}:\d{2}/);
  });

  it('distance shown in meters not miles', () => {
    withLanguage(<VenueCard {...defaultVenueProps} distanceMeters={350} />);
    expect(screen.getByText('350 m')).toBeDefined();
  });
});

// ─── AC 5: Design Token Compliance ──────────────────────────────────
describe('AC 5: Design Token Compliance', () => {
  it('VenueCard uses rounded-card border radius', () => {
    withLanguage(<VenueCard {...defaultVenueProps} />);
    const card = screen.getByRole('article');
    expect(card.className).toContain('rounded-card');
  });

  it('CandidateCard uses rounded-card border radius', () => {
    withLanguage(
      <CandidateCard venueId="1" venueName="Test" neighborhood="Linné" />
    );
    const card = screen.getByRole('article');
    expect(card.className).toContain('rounded-card');
  });

  it('CandidateCard uses shadow-card token', () => {
    withLanguage(
      <CandidateCard venueId="1" venueName="Test" neighborhood="Linné" />
    );
    const card = screen.getByRole('article');
    expect(card.className).toContain('shadow-card');
  });
});

// ─── AC 8: Screen Reader Support ─────────────────────────────────────
describe('AC 8: Screen Reader Support', () => {
  it('MiniTimeline has role="img" and descriptive aria-label', () => {
    withLanguage(
      <MiniTimeline
        sunWindows={[
          {
            start: '2026-03-19T10:00:00Z',
            end: '2026-03-19T15:00:00Z',
            sun_status: 'sunny',
            sky_condition: 'clear',
          },
        ]}
        variant="card"
        now={new Date('2026-03-19T12:00:00+01:00')}
      />
    );
    const timeline = screen.getByTestId('mini-timeline');
    expect(timeline.getAttribute('role')).toBe('img');
    expect(timeline.getAttribute('aria-label')).toBeTruthy();
    expect(timeline.getAttribute('aria-label')!.length).toBeGreaterThan(5);
  });

  it('SkyConditionBadge has role="img" and descriptive aria-label', () => {
    withLanguage(<SkyConditionBadge condition="clear" size={16} />);
    const badge = screen.getByRole('img');
    expect(badge.getAttribute('aria-label')).toBeTruthy();
    // The aria-label should contain the interpolated weather condition
    const label = badge.getAttribute('aria-label')!;
    expect(label).not.toContain('{{');
    expect(label.length).toBeGreaterThan(5);
  });

  it('SkyConditionBadge handles unavailable condition', () => {
    withLanguage(<SkyConditionBadge condition="unavailable" size={16} />);
    const badge = screen.getByRole('img');
    expect(badge.getAttribute('aria-label')).toBeTruthy();
  });

  it('VenueCard has descriptive aria-label with name, status, distance', () => {
    withLanguage(<VenueCard {...defaultVenueProps} />);
    const card = screen.getByRole('article');
    const label = card.getAttribute('aria-label')!;
    expect(label).toContain('Test Café');
    expect(label).toContain('Soligt');
    expect(label).toContain('200 meter');
  });

  it('VenueCard is keyboard accessible with tabIndex=0', () => {
    withLanguage(<VenueCard {...defaultVenueProps} />);
    const card = screen.getByRole('article');
    expect(card.getAttribute('tabIndex')).toBe('0');
  });

  it('LocationPermissionPrompt has dialog role and aria-labelledby', () => {
    withLanguage(
      <LocationPermissionPrompt
        permissionStatus="prompt"
        onRequestLocation={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBe('location-prompt-title');
  });

  it('TimeSlider has aria-label group and range attributes', () => {
    withLanguage(<TimeSlider value={1} onChange={vi.fn()} />);
    const group = screen.getByRole('group');
    expect(group.getAttribute('aria-label')).toBeTruthy();
    const range = screen.getByTestId('time-slider-input');
    expect(range.getAttribute('aria-valuemin')).toBe('0');
    expect(range.getAttribute('aria-valuemax')).toBe('3');
    expect(range.getAttribute('aria-valuenow')).toBe('1');
    expect(range.getAttribute('aria-valuetext')).toBeTruthy();
  });
});
