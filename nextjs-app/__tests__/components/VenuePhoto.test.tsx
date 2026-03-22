import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VenuePhoto } from '@/components/ui/VenuePhoto';

// Mock next/image to a plain <img> for testing
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // next/image uses fill + onError; map to standard img attrs
    const { _fill, onError, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...rest} onError={onError as React.ReactEventHandler<HTMLImageElement>} />;
  },
}));

describe('VenuePhoto', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Rendering with a valid image
  // -----------------------------------------------------------------------

  it('renders an <img> when src is provided', () => {
    render(<VenuePhoto src="https://example.com/photo.jpg" venueName="Café Husaren" />);

    const img = screen.getByRole('img', { name: 'Café Husaren' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('does not show fallback when src is provided', () => {
    render(<VenuePhoto src="https://example.com/photo.jpg" venueName="Café Husaren" />);

    expect(screen.queryByTestId('venue-photo-fallback')).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Fallback behavior
  // -----------------------------------------------------------------------

  it('shows fallback gradient with initial when src is null', () => {
    render(<VenuePhoto src={null} venueName="Hagabion" />);

    const fallback = screen.getByTestId('venue-photo-fallback');
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveTextContent('H');
  });

  it('shows fallback gradient with initial when src is undefined', () => {
    render(<VenuePhoto venueName="Trattoria" />);

    const fallback = screen.getByTestId('venue-photo-fallback');
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveTextContent('T');
  });

  it('shows fallback when image fails to load', () => {
    render(<VenuePhoto src="https://broken.url/nope.jpg" venueName="Kafé Magasinet" />);

    // Image should be present initially
    const img = screen.getByRole('img', { name: 'Kafé Magasinet' });
    expect(img).toBeInTheDocument();

    // Simulate image load error
    fireEvent.error(img);

    // Now fallback should show
    const fallback = screen.getByTestId('venue-photo-fallback');
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveTextContent('K');
  });

  it('shows "?" as initial for empty venue name', () => {
    render(<VenuePhoto src={null} venueName="" />);

    const fallback = screen.getByTestId('venue-photo-fallback');
    expect(fallback).toHaveTextContent('?');
  });

  // -----------------------------------------------------------------------
  // Aspect ratio
  // -----------------------------------------------------------------------

  it('applies 4:3 aspect ratio by default', () => {
    render(<VenuePhoto src={null} venueName="Test" />);

    const container = screen.getByTestId('venue-photo');
    expect(container.className).toContain('aspect-[4/3]');
  });

  it('applies 16:9 aspect ratio when specified', () => {
    render(<VenuePhoto src={null} venueName="Test" aspectRatio="16:9" />);

    const container = screen.getByTestId('venue-photo');
    expect(container.className).toContain('aspect-video');
  });

  it('applies square aspect ratio when specified', () => {
    render(<VenuePhoto src={null} venueName="Test" aspectRatio="square" />);

    const container = screen.getByTestId('venue-photo');
    expect(container.className).toContain('aspect-square');
  });

  // -----------------------------------------------------------------------
  // Deterministic fallback colors
  // -----------------------------------------------------------------------

  it('produces the same fallback color for the same venue name', () => {
    const { unmount } = render(<VenuePhoto src={null} venueName="Hagabion" />);
    const fallback1 = screen.getByTestId('venue-photo-fallback').className;
    unmount();

    render(<VenuePhoto src={null} venueName="Hagabion" />);
    const fallback2 = screen.getByTestId('venue-photo-fallback').className;

    expect(fallback1).toEqual(fallback2);
  });

  it('produces different fallback colors for different venue names', () => {
    const { unmount } = render(<VenuePhoto src={null} venueName="AAAA" />);
    const color1 = screen.getByTestId('venue-photo-fallback').className;
    unmount();

    render(<VenuePhoto src={null} venueName="ZZZZ" />);
    const color2 = screen.getByTestId('venue-photo-fallback').className;

    // They could theoretically collide, but "AAAA" and "ZZZZ" hash to different buckets
    expect(color1).not.toEqual(color2);
  });

  // -----------------------------------------------------------------------
  // Custom className passthrough
  // -----------------------------------------------------------------------

  it('applies custom className to the container', () => {
    render(<VenuePhoto src={null} venueName="Test" className="my-custom-class" />);

    const container = screen.getByTestId('venue-photo');
    expect(container.className).toContain('my-custom-class');
  });
});
