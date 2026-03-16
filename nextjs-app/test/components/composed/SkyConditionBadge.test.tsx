import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkyConditionBadge } from '@/components/composed/SkyConditionBadge';
import { LanguageProvider } from '@/lib/i18n';

function renderBadge(props: React.ComponentProps<typeof SkyConditionBadge>) {
  return render(
    <LanguageProvider>
      <SkyConditionBadge {...props} />
    </LanguageProvider>
  );
}

describe('SkyConditionBadge', () => {
  it('renders clear condition with icon and label', () => {
    renderBadge({ condition: 'clear' });
    const badge = screen.getByRole('img');
    expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Klart'));
    expect(badge).toHaveTextContent('Klart');
  });

  it('renders partly-cloudy condition', () => {
    renderBadge({ condition: 'partly-cloudy' });
    const badge = screen.getByRole('img');
    expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Halvklart'));
    expect(badge).toHaveTextContent('Halvklart');
  });

  it('renders overcast condition', () => {
    renderBadge({ condition: 'overcast' });
    const badge = screen.getByRole('img');
    expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Mulet'));
  });

  it('renders rain condition', () => {
    renderBadge({ condition: 'rain' });
    const badge = screen.getByRole('img');
    expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Regn'));
  });

  it('renders unavailable condition with muted text and no icon', () => {
    renderBadge({ condition: 'unavailable' });
    const badge = screen.getByRole('img');
    expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Ej tillgängligt'));
    expect(badge.querySelector('svg')).toBeNull();
  });

  it('hides text label in iconOnly mode', () => {
    renderBadge({ condition: 'clear', iconOnly: true });
    const badge = screen.getByRole('img');
    expect(badge.querySelector('svg')).toBeTruthy();
    expect(badge).not.toHaveTextContent('Klart');
  });

  it('accepts custom size prop', () => {
    renderBadge({ condition: 'clear', size: 20 });
    const svg = screen.getByRole('img').querySelector('svg');
    expect(svg).toHaveAttribute('width', '20');
    expect(svg).toHaveAttribute('height', '20');
  });
});
