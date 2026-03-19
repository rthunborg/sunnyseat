import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CandidateCard } from '@/components/custom/CandidateCard';
import { LanguageProvider } from '@/lib/i18n';

function renderWithProviders(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe('CandidateCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders venue name and unverified badge', () => {
    renderWithProviders(
      <CandidateCard venueId="v1" venueName="Test Café" neighborhood="Haga" />
    );

    expect(screen.getByText('Test Café')).toBeInTheDocument();
    expect(screen.getByText('Obekräftad')).toBeInTheDocument();
    expect(screen.getByText('Haga')).toBeInTheDocument();
  });

  it('renders confirm button with correct text', () => {
    renderWithProviders(
      <CandidateCard venueId="v1" venueName="Test Café" neighborhood="Haga" />
    );

    const button = screen.getByRole('button', { name: /bekräfta/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Bekräfta restaurang');
  });

  it('submits confirmation on button click', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ confirmed: true, totalConfirmations: 1, isVerified: false }),
    });

    renderWithProviders(
      <CandidateCard venueId="v1" venueName="Test Café" neighborhood="Haga" />
    );

    const button = screen.getByRole('button', { name: /bekräfta/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/tack/i)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/venues/v1/confirm', { method: 'POST' });
  });

  it('shows confirmation count after successful submission', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ confirmed: true, totalConfirmations: 2, isVerified: false }),
    });

    renderWithProviders(
      <CandidateCard venueId="v1" venueName="Test Café" neighborhood="Haga" />
    );

    await user.click(screen.getByRole('button', { name: /bekräfta/i }));

    await waitFor(() => {
      expect(screen.getByText('2/3 bekräftelser')).toBeInTheDocument();
    });
  });

  it('hides confirm button after successful submission', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ confirmed: true, totalConfirmations: 1, isVerified: false }),
    });

    renderWithProviders(
      <CandidateCard venueId="v1" venueName="Test Café" neighborhood="Haga" />
    );

    await user.click(screen.getByRole('button', { name: /bekräfta/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /bekräfta/i })).not.toBeInTheDocument();
    });
  });

  it('shows error message on network failure', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    renderWithProviders(
      <CandidateCard venueId="v1" venueName="Test Café" neighborhood="Haga" />
    );

    await user.click(screen.getByRole('button', { name: /bekräfta/i }));

    await waitFor(() => {
      expect(screen.getByText(/nätverksfel/i)).toBeInTheDocument();
    });

    // Button should still be visible for retry
    expect(screen.getByRole('button', { name: /bekräfta/i })).toBeInTheDocument();
  });

  it('shows error on non-ok response', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    renderWithProviders(
      <CandidateCard venueId="v1" venueName="Test Café" neighborhood="Haga" />
    );

    await user.click(screen.getByRole('button', { name: /bekräfta/i }));

    await waitFor(() => {
      expect(screen.getByText(/gick fel/i)).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', () => {
    renderWithProviders(
      <CandidateCard venueId="v1" venueName="Test Café" neighborhood="Haga" />
    );

    const article = screen.getByRole('article');
    expect(article).toHaveAttribute('aria-label', expect.stringContaining('Test Café'));
  });
});
