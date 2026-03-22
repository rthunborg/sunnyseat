import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VenuePhotoCard } from '@/components/custom/VenuePhotoCard';
import { LanguageProvider } from '@/lib/i18n';

// Mock next/image to a plain <img> for testing
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, onError, ...rest } = props;
    return <img {...rest} onError={onError as React.ReactEventHandler<HTMLImageElement>} />;
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

const defaultProps = {
  venueId: 'v-42',
  venueName: 'Café Husaren',
  neighborhood: 'Haga',
  sunStatus: 'sunny' as const,
  distanceMeters: 350,
};

describe('VenuePhotoCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Basic rendering
  // -----------------------------------------------------------------------

  it('renders the venue name', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} />);

    expect(screen.getByTestId('venue-name')).toHaveTextContent('Café Husaren');
  });

  it('renders the neighborhood', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} />);

    expect(screen.getByTestId('venue-info-line')).toHaveTextContent('Haga');
  });

  it('renders formatted distance', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} />);

    // 350m rounds to 400 m (nearest 100)
    expect(screen.getByTestId('venue-info-line')).toHaveTextContent('400 m');
  });

  it('renders distance in km for far venues', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} distanceMeters={1250} />);

    // 1250m → 1,3 km (Swedish locale)
    expect(screen.getByTestId('venue-info-line')).toHaveTextContent('1,3 km');
  });

  it('renders status dot with correct status class', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} sunStatus="partial" />);

    const dot = screen.getByTestId('status-dot');
    expect(dot.className).toContain('bg-sun-partial');
  });

  it('has correct data attributes', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} />);

    const card = screen.getByTestId('venue-photo-card');
    expect(card).toHaveAttribute('data-venue-id', 'v-42');
    expect(card).toHaveAttribute('data-variant', 'carousel');
  });

  // -----------------------------------------------------------------------
  // Variants
  // -----------------------------------------------------------------------

  it('renders carousel variant by default', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} />);

    const card = screen.getByTestId('venue-photo-card');
    expect(card).toHaveAttribute('data-variant', 'carousel');
    expect(card.className).toContain('w-40');
  });

  it('renders popup variant with wider width', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} variant="popup" />);

    const card = screen.getByTestId('venue-photo-card');
    expect(card).toHaveAttribute('data-variant', 'popup');
    expect(card.className).toContain('w-[280px]');
  });

  // -----------------------------------------------------------------------
  // Photo and fallback
  // -----------------------------------------------------------------------

  it('shows venue photo when imageUrl is provided', () => {
    renderWithProviders(
      <VenuePhotoCard {...defaultProps} imageUrl="https://example.com/husaren.jpg" />,
    );

    const img = screen.getByRole('img', { name: 'Café Husaren' });
    expect(img).toHaveAttribute('src', 'https://example.com/husaren.jpg');
    expect(screen.queryByTestId('venue-photo-fallback')).not.toBeInTheDocument();
  });

  it('shows fallback when imageUrl is null', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} imageUrl={null} />);

    expect(screen.getByTestId('venue-photo-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('venue-photo-fallback')).toHaveTextContent('C');
  });

  it('shows fallback when imageUrl is not provided', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} />);

    expect(screen.getByTestId('venue-photo-fallback')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Partner badge
  // -----------------------------------------------------------------------

  it('shows partner badge when isPartner is true', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} isPartner />);

    expect(screen.getByTestId('partner-badge')).toHaveTextContent('Partner');
  });

  it('does not show partner badge by default', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} />);

    expect(screen.queryByTestId('partner-badge')).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Highlighted state
  // -----------------------------------------------------------------------

  it('applies highlight ring when highlighted', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} highlighted />);

    const card = screen.getByTestId('venue-photo-card');
    expect(card.className).toContain('ring-2');
    expect(card.className).toContain('scale-[1.03]');
  });

  it('does not apply highlight ring by default', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} />);

    const card = screen.getByTestId('venue-photo-card');
    expect(card.className).not.toContain('ring-2');
  });

  // -----------------------------------------------------------------------
  // Click and keyboard interaction
  // -----------------------------------------------------------------------

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    renderWithProviders(<VenuePhotoCard {...defaultProps} onClick={onClick} />);

    await user.click(screen.getByTestId('venue-photo-card'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick on Enter key', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    renderWithProviders(<VenuePhotoCard {...defaultProps} onClick={onClick} />);

    const card = screen.getByTestId('venue-photo-card');
    card.focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick on Space key', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    renderWithProviders(<VenuePhotoCard {...defaultProps} onClick={onClick} />);

    const card = screen.getByTestId('venue-photo-card');
    card.focus();
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is focusable (tabIndex=0)', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} />);

    const card = screen.getByTestId('venue-photo-card');
    expect(card).toHaveAttribute('tabindex', '0');
  });

  // -----------------------------------------------------------------------
  // Accessibility
  // -----------------------------------------------------------------------

  it('has role="button" for interactive semantics', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has an aria-label combining name and status', () => {
    renderWithProviders(<VenuePhotoCard {...defaultProps} sunStatus="sunny" />);

    const card = screen.getByRole('button');
    const label = card.getAttribute('aria-label') ?? '';
    expect(label).toContain('Café Husaren');
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it('handles missing neighborhood gracefully', () => {
    renderWithProviders(
      <VenuePhotoCard {...defaultProps} neighborhood="" />,
    );

    const infoLine = screen.getByTestId('venue-info-line');
    // Should just show distance, no separator dot
    expect(infoLine).toHaveTextContent('400 m');
    expect(infoLine.textContent).not.toContain('·');
  });

  it('handles missing distance gracefully', () => {
    renderWithProviders(
      <VenuePhotoCard {...defaultProps} distanceMeters={undefined} />,
    );

    const infoLine = screen.getByTestId('venue-info-line');
    expect(infoLine).toHaveTextContent('Haga');
    expect(infoLine.textContent).not.toContain('·');
  });

  it('renders all four sun statuses without errors', () => {
    const statuses = ['sunny', 'partial', 'shaded', 'upcoming'] as const;
    for (const status of statuses) {
      const { unmount } = renderWithProviders(
        <VenuePhotoCard {...defaultProps} sunStatus={status} />,
      );
      expect(screen.getByTestId('status-dot')).toBeInTheDocument();
      unmount();
    }
  });
});
