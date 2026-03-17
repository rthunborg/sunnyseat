import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeSlider } from '@/components/custom/TimeSlider';
import { PremiumProvider } from '@/lib/context/PremiumContext';
import type { TimeOffsetHours } from '@/lib/hooks/useTimeOffset';

// Mock usePremium to control premium status
const mockUsePremium = vi.fn();
vi.mock('@/lib/hooks/usePremium', () => ({
  usePremium: () => mockUsePremium(),
}));

function renderSlider(value: TimeOffsetHours = 0, onChange = vi.fn(), isLoading = false) {
  return render(
    <PremiumProvider>
      <TimeSlider value={value} onChange={onChange} isLoading={isLoading} />
    </PremiumProvider>
  );
}

describe('TimeSlider', () => {
  beforeEach(() => {
    mockUsePremium.mockReturnValue({
      isPremium: true,
      isLoading: false,
      sessionId: 'test-session',
      expiresAt: undefined,
      initiatePurchase: vi.fn(),
      refreshStatus: vi.fn(),
    });
  });

  it('renders with Swedish labels', () => {
    renderSlider();
    expect(screen.getByText('Nu')).toBeInTheDocument();
    expect(screen.getByText('+1 tim')).toBeInTheDocument();
    expect(screen.getByText('+2 tim')).toBeInTheDocument();
    expect(screen.getByText('+3 tim')).toBeInTheDocument();
  });

  it('renders a range input with correct attributes', () => {
    renderSlider(1);
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '3');
    expect(slider).toHaveAttribute('aria-valuenow', '1');
    expect(slider).toHaveAttribute('aria-valuetext', '+1 tim');
  });

  it('has accessible group label', () => {
    renderSlider();
    expect(screen.getByRole('group', { name: /tidsförskjutning/i })).toBeInTheDocument();
  });

  it('calls onChange when slider value changes (premium user)', () => {
    const onChange = vi.fn();
    renderSlider(0, onChange);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '2' } });

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('calls onChange when mark button is clicked (premium user)', () => {
    const onChange = vi.fn();
    renderSlider(0, onChange);

    fireEvent.click(screen.getByLabelText('Ställ in +2 tim'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('shows paywall for non-premium user when sliding to offset > 0', () => {
    mockUsePremium.mockReturnValue({
      isPremium: false,
      isLoading: false,
      sessionId: 'test',
      expiresAt: undefined,
      initiatePurchase: vi.fn(),
      refreshStatus: vi.fn(),
    });

    const onChange = vi.fn();
    renderSlider(0, onChange);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '1' } });

    // Should not call onChange
    expect(onChange).not.toHaveBeenCalled();
    // Should show paywall
    expect(screen.getByText('SunnySeat Premium')).toBeInTheDocument();
  });

  it('shows paywall for non-premium user when clicking mark > 0', () => {
    mockUsePremium.mockReturnValue({
      isPremium: false,
      isLoading: false,
      sessionId: 'test',
      expiresAt: undefined,
      initiatePurchase: vi.fn(),
      refreshStatus: vi.fn(),
    });

    const onChange = vi.fn();
    renderSlider(0, onChange);

    fireEvent.click(screen.getByLabelText('Ställ in +3 tim'));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('SunnySeat Premium')).toBeInTheDocument();
  });

  it('allows "Nu" to be selected even for non-premium users', () => {
    mockUsePremium.mockReturnValue({
      isPremium: false,
      isLoading: false,
      sessionId: 'test',
      expiresAt: undefined,
      initiatePurchase: vi.fn(),
      refreshStatus: vi.fn(),
    });

    const onChange = vi.fn();
    renderSlider(0, onChange);

    fireEvent.click(screen.getByLabelText('Ställ in Nu'));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('shows Premium badge under locked marks for non-premium users', () => {
    mockUsePremium.mockReturnValue({
      isPremium: false,
      isLoading: false,
      sessionId: 'test',
      expiresAt: undefined,
      initiatePurchase: vi.fn(),
      refreshStatus: vi.fn(),
    });

    renderSlider();
    const premiumBadges = screen.getAllByText('Premium');
    // 3 locked marks: +1, +2, +3
    expect(premiumBadges).toHaveLength(3);
  });

  it('shows loading spinner when isLoading is true', () => {
    renderSlider(1, vi.fn(), true);
    expect(screen.getByRole('status', { name: /laddar soldata/i })).toBeInTheDocument();
  });

  it('does not show loading spinner when isLoading is false', () => {
    renderSlider(1, vi.fn(), false);
    expect(screen.queryByRole('status', { name: /laddar soldata/i })).not.toBeInTheDocument();
  });

  it('highlights the active mark', () => {
    renderSlider(2);
    const activeButton = screen.getByLabelText('Ställ in +2 tim');
    expect(activeButton).toHaveAttribute('aria-pressed', 'true');
  });
});
