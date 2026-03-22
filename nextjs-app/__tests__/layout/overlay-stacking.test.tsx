import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';


vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

let mockIsDesktop = false;
vi.mock('@/lib/hooks/useIsDesktop', () => ({
  useIsDesktop: () => mockIsDesktop,
}));

vi.mock('@/components/custom/VenueCard', () => ({
  VenueCard: () => <div data-testid="venue-card" />,
}));

vi.mock('@/components/custom/CandidateCard', () => ({
  CandidateCard: () => <div data-testid="candidate-card" />,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import { BottomCardTray } from '@/components/custom/BottomCardTray';
import { CardTrayProvider } from '@/lib/context/CardTrayContext';
import { LanguageProvider } from '@/lib/i18n';

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <CardTrayProvider>
        {children}
      </CardTrayProvider>
    </LanguageProvider>
  );
}

describe('Overlay z-index stacking order', () => {
  beforeEach(() => {
    mockIsDesktop = false;
  });

  it('card tray uses z-40 (above time controls z-20, below modals z-50)', () => {
    render(
      <TestWrapper>
        <BottomCardTray />
      </TestWrapper>
    );
    const tray = screen.getByLabelText('Venue card tray');
    expect(tray.className).toContain('z-40');
    // Should NOT contain old z-20
    expect(tray.className).not.toContain('z-20');
  });
});
