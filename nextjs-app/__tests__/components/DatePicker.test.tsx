import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DatePicker } from '@/components/custom/DatePicker';
import { PremiumProvider } from '@/lib/context/PremiumContext';
import { LanguageProvider } from '@/lib/i18n';

const mockUsePremium = vi.fn();
vi.mock('@/lib/hooks/usePremium', () => ({
  usePremium: () => mockUsePremium(),
}));

function renderDatePicker(
  selectedDate: Date | null = null,
  onDateSelect = vi.fn(),
  isLoading = false
) {
  return {
    onDateSelect,
    ...render(
      <LanguageProvider>
        <PremiumProvider>
          <DatePicker
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            isLoading={isLoading}
          />
        </PremiumProvider>
      </LanguageProvider>
    ),
  };
}

function premiumUser() {
  mockUsePremium.mockReturnValue({
    isPremium: true,
    isLoading: false,
    sessionId: 'test-session',
    expiresAt: undefined,
    initiatePurchase: vi.fn(),
    refreshStatus: vi.fn(),
  });
}

function freeUser() {
  mockUsePremium.mockReturnValue({
    isPremium: false,
    isLoading: false,
    sessionId: 'test-session',
    expiresAt: undefined,
    initiatePurchase: vi.fn(),
    refreshStatus: vi.fn(),
  });
}

describe('DatePicker', () => {
  beforeEach(() => {
    premiumUser();
  });

  it('renders a button with "Datum" label when no date selected', () => {
    renderDatePicker();
    expect(screen.getByRole('button', { name: /välj datum/i })).toBeInTheDocument();
    expect(screen.getByText('Datum')).toBeInTheDocument();
  });

  it('opens calendar on click for premium users', () => {
    renderDatePicker();
    fireEvent.click(screen.getByRole('button', { name: /välj datum/i }));
    expect(screen.getByRole('dialog', { name: /välj datum/i })).toBeInTheDocument();
  });

  it('shows Swedish day headers', () => {
    renderDatePicker();
    fireEvent.click(screen.getByRole('button', { name: /välj datum/i }));
    expect(screen.getByText('Mån')).toBeInTheDocument();
    expect(screen.getByText('Tis')).toBeInTheDocument();
    expect(screen.getByText('Ons')).toBeInTheDocument();
    expect(screen.getByText('Tor')).toBeInTheDocument();
    expect(screen.getByText('Fre')).toBeInTheDocument();
    expect(screen.getByText('Lör')).toBeInTheDocument();
    expect(screen.getByText('Sön')).toBeInTheDocument();
  });

  it('shows Swedish month name in header', () => {
    renderDatePicker();
    fireEvent.click(screen.getByRole('button', { name: /välj datum/i }));
    const today = new Date();
    const swedishMonths = [
      'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
      'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
    ];
    expect(
      screen.getByText(`${swedishMonths[today.getMonth()]} ${today.getFullYear()}`)
    ).toBeInTheDocument();
  });

  it('highlights today with aria-current="date"', () => {
    renderDatePicker();
    fireEvent.click(screen.getByRole('button', { name: /välj datum/i }));
    const today = new Date();
    const todayCells = screen.getAllByRole('gridcell').filter(
      (cell) => cell.getAttribute('aria-current') === 'date'
    );
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0]).toHaveTextContent(String(today.getDate()));
  });

  it('disables past dates', () => {
    renderDatePicker();
    fireEvent.click(screen.getByRole('button', { name: /välj datum/i }));
    const today = new Date();
    if (today.getDate() > 1) {
      // The 1st of the month should be disabled if today is after the 1st
      const swedishMonths = [
        'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
        'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
      ];
      const firstButton = screen.getByRole('gridcell', {
        name: `1 ${swedishMonths[today.getMonth()]}`,
      });
      expect(firstButton).toBeDisabled();
    }
  });

  it('calls onDateSelect with the selected date and closes calendar', () => {
    const onDateSelect = vi.fn();
    renderDatePicker(null, onDateSelect);
    fireEvent.click(screen.getByRole('button', { name: /välj datum/i }));

    // Click a future date (last day of month should be future if today is early)
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const swedishMonths = [
      'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
      'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
    ];

    if (today.getDate() < daysInMonth) {
      const futureDay = today.getDate() + 1;
      const futureButton = screen.getByRole('gridcell', {
        name: `${futureDay} ${swedishMonths[today.getMonth()]}`,
      });
      fireEvent.click(futureButton);
      expect(onDateSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          getDate: expect.any(Function),
        })
      );
      // Calendar should close
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }
  });

  it('shows paywall for non-premium user on toggle', () => {
    freeUser();
    renderDatePicker();
    fireEvent.click(screen.getByRole('button', { name: /välj datum/i }));
    expect(screen.getByText('SunnySeat Premium')).toBeInTheDocument();
    // Calendar should NOT open
    expect(screen.queryByRole('dialog', { name: /välj datum/i })).not.toBeInTheDocument();
  });

  it('shows "Premium" badge for non-premium users', () => {
    freeUser();
    renderDatePicker();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('shows selected date in button label', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    renderDatePicker(futureDate);
    const swedishMonths = [
      'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
      'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
    ];
    const expectedLabel = `${futureDate.getDate()} ${swedishMonths[futureDate.getMonth()].slice(0, 3)}`;
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it('navigates to next month', () => {
    renderDatePicker();
    fireEvent.click(screen.getByRole('button', { name: /välj datum/i }));
    fireEvent.click(screen.getByRole('button', { name: /nästa månad/i }));
    const today = new Date();
    const nextMonth = (today.getMonth() + 1) % 12;
    const swedishMonths = [
      'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
      'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
    ];
    const nextYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
    expect(screen.getByText(`${swedishMonths[nextMonth]} ${nextYear}`)).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    renderDatePicker(null, vi.fn(), true);
    expect(screen.getByRole('status', { name: /laddar datumdata/i })).toBeInTheDocument();
  });

  it('shows "Visa idag" reset button when date is selected', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    renderDatePicker(futureDate);
    fireEvent.click(screen.getByRole('button', { name: /valt datum/i }));
    expect(screen.getByText('Visa idag')).toBeInTheDocument();
  });

  it('calls onDateSelect(null) when "Visa idag" is clicked', () => {
    const onDateSelect = vi.fn();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    renderDatePicker(futureDate, onDateSelect);
    fireEvent.click(screen.getByRole('button', { name: /valt datum/i }));
    fireEvent.click(screen.getByText('Visa idag'));
    expect(onDateSelect).toHaveBeenCalledWith(null);
  });

  it('has minimum touch targets on navigation buttons via design tokens', () => {
    renderDatePicker();
    fireEvent.click(screen.getByRole('button', { name: /välj datum/i }));
    const prevButton = screen.getByRole('button', { name: /föregående månad/i });
    const nextButton = screen.getByRole('button', { name: /nästa månad/i });
    expect(prevButton.className).toContain('min-h-[var(--spacing-touch-min)]');
    expect(prevButton.className).toContain('min-w-[var(--spacing-touch-min)]');
    expect(nextButton.className).toContain('min-h-[var(--spacing-touch-min)]');
    expect(nextButton.className).toContain('min-w-[var(--spacing-touch-min)]');
  });

  it('trigger button meets touch target via design token', () => {
    renderDatePicker();
    const trigger = screen.getByRole('button', { name: /välj datum/i });
    expect(trigger.className).toContain('min-h-[var(--spacing-touch-min)]');
    expect(trigger.className).toContain('min-w-[var(--spacing-touch-min)]');
  });

  describe('popup containment', () => {
    it('calendar popup uses right-0 alignment to prevent viewport clipping', () => {
      renderDatePicker();
      fireEvent.click(screen.getByRole('button', { name: /välj datum/i }));
      const dialog = screen.getByRole('dialog', { name: /välj datum/i });
      expect(dialog.className).toContain('right-0');
    });

    it('calendar popup uses max-width to stay within viewport', () => {
      renderDatePicker();
      fireEvent.click(screen.getByRole('button', { name: /välj datum/i }));
      const dialog = screen.getByRole('dialog', { name: /välj datum/i });
      expect(dialog.className).toContain('max-w-[calc(100vw-2rem)]');
    });

    it('calendar popup has z-50 to appear above card tray', () => {
      renderDatePicker();
      fireEvent.click(screen.getByRole('button', { name: /välj datum/i }));
      const dialog = screen.getByRole('dialog', { name: /välj datum/i });
      expect(dialog.className).toContain('z-50');
    });
  });
});
