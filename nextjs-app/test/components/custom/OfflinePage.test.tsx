import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OfflinePage from '@/app/offline/page';

describe('Offline page', () => {
  it('renders Swedish offline heading', () => {
    render(<OfflinePage />);
    expect(screen.getByText('Du är offline')).toBeDefined();
  });

  it('renders explanation text in Swedish', () => {
    render(<OfflinePage />);
    expect(
      screen.getByText(/SunnySeat behöver en internetanslutning/)
    ).toBeDefined();
  });

  it('has main landmark with id main-content', () => {
    render(<OfflinePage />);
    const main = screen.getByRole('main');
    expect(main.getAttribute('id')).toBe('main-content');
  });
});
