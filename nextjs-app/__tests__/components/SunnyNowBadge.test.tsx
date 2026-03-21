import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SunnyNowBadge } from '@/components/composed/SunnyNowBadge';

describe('SunnyNowBadge', () => {
  it('renders with "Sol nu" text', () => {
    render(<SunnyNowBadge />);
    expect(screen.getByText('Sol nu')).toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    render(<SunnyNowBadge />);
    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-label', 'Sol nu');
  });

  it('renders with pulse animation class', () => {
    render(<SunnyNowBadge />);
    const badge = screen.getByRole('status');
    expect(badge.className).toContain('animate-sunny-now-pulse');
  });

  it('renders in small size by default', () => {
    render(<SunnyNowBadge />);
    const badge = screen.getByRole('status');
    expect(badge.className).toContain('text-[10px]');
  });

  it('renders in medium size when specified', () => {
    render(<SunnyNowBadge size="md" />);
    const badge = screen.getByRole('status');
    expect(badge.className).toContain('text-xs');
  });

  it('uses partner gold background color', () => {
    render(<SunnyNowBadge />);
    const badge = screen.getByRole('status');
    expect(badge.className).toContain('bg-[var(--color-partner-gold)]');
  });

  it('includes sun icon SVG', () => {
    render(<SunnyNowBadge />);
    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
