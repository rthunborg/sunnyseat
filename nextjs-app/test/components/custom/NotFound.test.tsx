import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFound from '@/app/not-found';

describe('NotFound page', () => {
  it('renders Swedish 404 heading', () => {
    render(<NotFound />);
    expect(screen.getByText('Sidan hittades inte')).toBeDefined();
  });

  it('renders explanatory text in Swedish', () => {
    render(<NotFound />);
    expect(screen.getByText(/Sidan du letar efter finns inte/)).toBeDefined();
  });

  it('has a link back to home', () => {
    render(<NotFound />);
    const link = screen.getByRole('link', { name: 'Gå till startsidan' });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/');
  });

  it('has min-h-[48px] touch target on home link', () => {
    render(<NotFound />);
    const link = screen.getByRole('link', { name: 'Gå till startsidan' });
    expect(link.className).toContain('min-h-[48px]');
  });
});
