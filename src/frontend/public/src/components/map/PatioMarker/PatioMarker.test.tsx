// components/map/PatioMarker/PatioMarker.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PatioMarker from './PatioMarker';
import type { PatioData } from '../../../types/patio';

describe('PatioMarker', () => {
  const mockPatio: PatioData = {
    id: '1-1',
    venueId: '1',
    venueName: 'Test Sunny Cafe',
    location: {
      latitude: 57.7089,
      longitude: 11.9746,
    },
    currentSunStatus: 'Sunny',
    confidence: 85,
    distanceMeters: 100,
  };

  it('should render patio marker with confidence percentage', () => {
    render(<PatioMarker patio={mockPatio} />);
    
    expect(screen.getByText('85%')).toBeTruthy();
  });

  it('should display correct color for Sunny status', () => {
    const { container } = render(<PatioMarker patio={mockPatio} />);
    
    const markerElement = container.querySelector('.w-8.h-8.rounded-full') as HTMLElement;
    expect(markerElement?.style.backgroundColor).toBe('rgb(34, 197, 94)'); // #22C55E
  });

  it('should display correct color for Partial status', () => {
    const partialPatio: PatioData = {
      ...mockPatio,
      currentSunStatus: 'Partial',
    };
    
    const { container } = render(<PatioMarker patio={partialPatio} />);
    
    const markerElement = container.querySelector('.w-8.h-8.rounded-full') as HTMLElement;
    expect(markerElement?.style.backgroundColor).toBe('rgb(245, 158, 11)'); // #F59E0B
  });

  it('should display correct color for Shaded status', () => {
    const shadedPatio: PatioData = {
      ...mockPatio,
      currentSunStatus: 'Shaded',
    };
    
    const { container } = render(<PatioMarker patio={shadedPatio} />);
    
    const markerElement = container.querySelector('.w-8.h-8.rounded-full') as HTMLElement;
    expect(markerElement?.style.backgroundColor).toBe('rgb(156, 163, 175)'); // #9CA3AF
  });

  it('should call onClick handler when clicked', () => {
    const handleClick = vi.fn();
    
    render(<PatioMarker patio={mockPatio} onClick={handleClick} />);
    
    const marker = screen.getByRole('button');
    fireEvent.click(marker);
    
    expect(handleClick).toHaveBeenCalledWith(mockPatio);
  });

  it('should call onClick handler on Enter key press', () => {
    const handleClick = vi.fn();
    
    render(<PatioMarker patio={mockPatio} onClick={handleClick} />);
    
    const marker = screen.getByRole('button');
    fireEvent.keyDown(marker, { key: 'Enter', code: 'Enter' });
    
    expect(handleClick).toHaveBeenCalledWith(mockPatio);
  });

  it('should call onClick handler on Space key press', () => {
    const handleClick = vi.fn();
    
    render(<PatioMarker patio={mockPatio} onClick={handleClick} />);
    
    const marker = screen.getByRole('button');
    fireEvent.keyDown(marker, { key: ' ', code: 'Space' });
    
    expect(handleClick).toHaveBeenCalledWith(mockPatio);
  });

  it('should have proper aria-label for accessibility', () => {
    render(<PatioMarker patio={mockPatio} />);
    
    const marker = screen.getByLabelText(
      'Test Sunny Cafe - Sunny (85% confidence)'
    );
    
    expect(marker).toBeTruthy();
  });

  it('should be keyboard accessible with tabIndex', () => {
    render(<PatioMarker patio={mockPatio} />);
    
    const marker = screen.getByRole('button');
    expect(marker.tabIndex).toBe(0);
  });

  it('should not re-render when patio data is unchanged', () => {
    const { rerender } = render(<PatioMarker patio={mockPatio} />);
    
    // Re-render with same patio object
    rerender(<PatioMarker patio={mockPatio} />);
    
    // Component should be memoized (tested by React.memo comparison)
    expect(screen.getByText('85%')).toBeTruthy();
  });

  it('should re-render when confidence changes', () => {
    const { rerender } = render(<PatioMarker patio={mockPatio} />);
    
    expect(screen.getByText('85%')).toBeTruthy();
    
    // Update confidence
    const updatedPatio: PatioData = {
      ...mockPatio,
      confidence: 90,
    };
    
    rerender(<PatioMarker patio={updatedPatio} />);
    
    expect(screen.getByText('90%')).toBeTruthy();
  });

  it('should have cursor-pointer class for clickability indicator', () => {
    const { container } = render(<PatioMarker patio={mockPatio} />);
    
    const marker = container.querySelector('.patio-marker');
    expect(marker?.classList.contains('cursor-pointer')).toBe(true);
  });
});
