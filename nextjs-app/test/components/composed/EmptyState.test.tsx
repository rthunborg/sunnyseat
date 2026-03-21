import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LanguageProvider } from '@/lib/i18n';
import { EmptyState, type EmptyStateVariant } from '@/components/composed/EmptyState';

function renderEmptyState(variant: EmptyStateVariant, onCta?: () => void) {
  return render(
    <LanguageProvider>
      <EmptyState variant={variant} onCta={onCta} />
    </LanguageProvider>
  );
}

describe('EmptyState', () => {
  describe('weather variant', () => {
    it('renders weather illustration and Swedish copy', () => {
      renderEmptyState('weather');
      expect(screen.getByTestId('empty-state-weather')).toBeInTheDocument();
      expect(screen.getByText('Solen gömmer sig just nu')).toBeInTheDocument();
      expect(screen.getByText(/kolla tillbaka snart/i)).toBeInTheDocument();
    });

    it('renders CTA button when onCta provided', () => {
      const onCta = vi.fn();
      renderEmptyState('weather', onCta);
      const btn = screen.getByRole('button', { name: /tidskontroll/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(onCta).toHaveBeenCalledOnce();
    });

    it('CTA meets 48px touch target', () => {
      renderEmptyState('weather', vi.fn());
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('min-h-[var(--spacing-touch-min)]');
    });

    it('contains inline SVG illustration', () => {
      renderEmptyState('weather');
      const container = screen.getByTestId('empty-state-weather');
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('area variant', () => {
    it('renders area illustration and Swedish copy', () => {
      renderEmptyState('area');
      expect(screen.getByTestId('empty-state-area')).toBeInTheDocument();
      expect(screen.getByText('Inga uteplatser hittade här')).toBeInTheDocument();
      expect(screen.getByText(/flytta kartan/i)).toBeInTheDocument();
    });

    it('renders CTA button with correct label', () => {
      const onCta = vi.fn();
      renderEmptyState('area', onCta);
      const btn = screen.getByRole('button', { name: /centrum/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(onCta).toHaveBeenCalledOnce();
    });

    it('contains map pin SVG with question mark', () => {
      renderEmptyState('area');
      const container = screen.getByTestId('empty-state-area');
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      const text = svg?.querySelector('text');
      expect(text?.textContent).toBe('?');
    });
  });

  describe('location variant', () => {
    it('renders location illustration and Swedish copy', () => {
      renderEmptyState('location');
      expect(screen.getByTestId('empty-state-location')).toBeInTheDocument();
      expect(screen.getByText('Vi behöver din plats')).toBeInTheDocument();
      expect(screen.getByText(/tillåt platsåtkomst/i)).toBeInTheDocument();
    });

    it('renders CTA button for choosing on map', () => {
      const onCta = vi.fn();
      renderEmptyState('location', onCta);
      const btn = screen.getByRole('button', { name: /kartan/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(onCta).toHaveBeenCalledOnce();
    });

    it('contains location pin with X SVG', () => {
      renderEmptyState('location');
      const container = screen.getByTestId('empty-state-location');
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      const lines = svg?.querySelectorAll('line');
      expect(lines?.length).toBe(2);
    });
  });

  describe('offline variant', () => {
    it('renders offline illustration and Swedish copy', () => {
      renderEmptyState('offline');
      expect(screen.getByTestId('empty-state-offline')).toBeInTheDocument();
      expect(screen.getByText('Ingen anslutning')).toBeInTheDocument();
      expect(screen.getByText(/internetanslutning/i)).toBeInTheDocument();
    });

    it('renders retry CTA button', () => {
      const onCta = vi.fn();
      renderEmptyState('offline', onCta);
      const btn = screen.getByRole('button', { name: /försök igen/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(onCta).toHaveBeenCalledOnce();
    });

    it('contains cloud disconnect SVG', () => {
      renderEmptyState('offline');
      const container = screen.getByTestId('empty-state-offline');
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  describe('common behavior', () => {
    it('does not render CTA button when onCta is not provided', () => {
      renderEmptyState('weather');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('is centered with flex layout', () => {
      renderEmptyState('area');
      const container = screen.getByTestId('empty-state-area');
      expect(container.className).toContain('items-center');
      expect(container.className).toContain('justify-center');
      expect(container.className).toContain('text-center');
    });

    it('all SVGs are aria-hidden', () => {
      const variants: EmptyStateVariant[] = ['weather', 'area', 'location', 'offline'];
      for (const variant of variants) {
        const { unmount } = renderEmptyState(variant);
        const container = screen.getByTestId(`empty-state-${variant}`);
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('aria-hidden')).toBe('true');
        unmount();
      }
    });
  });
});
