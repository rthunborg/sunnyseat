import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { LanguageProvider } from '@/lib/i18n';
import { VenueCardSkeleton } from '@/components/custom/VenueCardSkeleton';

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Track reduced motion mock value
let mockReducedMotion = false;
vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}));

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

describe('VenueCardSkeleton', () => {
  beforeEach(() => {
    mockReducedMotion = false;
  });

  it('renders the skeleton container with test id', () => {
    render(
      <TestWrapper>
        <VenueCardSkeleton />
      </TestWrapper>
    );
    expect(screen.getByTestId('venue-card-skeleton')).toBeInTheDocument();
  });

  it('renders loading text with role="status"', () => {
    render(
      <TestWrapper>
        <VenueCardSkeleton />
      </TestWrapper>
    );
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    // Swedish-first: default language is sv
    expect(status.textContent).toBe('Letar efter soliga platser...');
  });

  it('uses warm ambient background color', () => {
    render(
      <TestWrapper>
        <VenueCardSkeleton />
      </TestWrapper>
    );
    const skeleton = screen.getByTestId('venue-card-skeleton');
    const card = skeleton.querySelector('[aria-hidden="true"]');
    expect(card).toBeTruthy();
    expect(card!.className).toContain('bg-[var(--color-ambient-sunny)]');
  });

  it('has 120px height and rounded-card shadow-card classes', () => {
    render(
      <TestWrapper>
        <VenueCardSkeleton />
      </TestWrapper>
    );
    const card = screen.getByTestId('venue-card-skeleton').querySelector('[aria-hidden="true"]');
    expect(card!.className).toContain('h-[120px]');
    expect(card!.className).toContain('rounded-card');
    expect(card!.className).toContain('shadow-card');
  });

  it('applies animate-warm-pulse when reduced motion is off', () => {
    render(
      <TestWrapper>
        <VenueCardSkeleton />
      </TestWrapper>
    );
    const card = screen.getByTestId('venue-card-skeleton').querySelector('[aria-hidden="true"]');
    expect(card!.className).toContain('animate-warm-pulse');
  });

  it('does not apply animate-warm-pulse when reduced motion is on', () => {
    mockReducedMotion = true;
    render(
      <TestWrapper>
        <VenueCardSkeleton />
      </TestWrapper>
    );
    const card = screen.getByTestId('venue-card-skeleton').querySelector('[aria-hidden="true"]');
    expect(card!.className).not.toContain('animate-warm-pulse');
  });

  it('renders 4 skeleton rows mimicking VenueCard layout', () => {
    render(
      <TestWrapper>
        <VenueCardSkeleton />
      </TestWrapper>
    );
    const card = screen.getByTestId('venue-card-skeleton').querySelector('[aria-hidden="true"]');
    // Row 1: circle dot (w-3 h-3 rounded-full) + two short bars
    expect(card!.querySelector('.rounded-full')).toBeTruthy();
    // Row 4: has a button-shaped element (rounded-button)
    expect(card!.querySelector('.rounded-button')).toBeTruthy();
  });

  it('marks skeleton card as aria-hidden', () => {
    render(
      <TestWrapper>
        <VenueCardSkeleton />
      </TestWrapper>
    );
    const card = screen.getByTestId('venue-card-skeleton').querySelector('[aria-hidden="true"]');
    expect(card).toBeTruthy();
  });

  it('uses text-muted and caption size for loading text', () => {
    render(
      <TestWrapper>
        <VenueCardSkeleton />
      </TestWrapper>
    );
    const status = screen.getByRole('status');
    expect(status.className).toContain('text-text-muted');
    expect(status.className).toContain('text-[length:var(--font-size-caption)]');
  });
});
