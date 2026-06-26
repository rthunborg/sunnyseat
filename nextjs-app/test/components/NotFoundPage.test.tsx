import type { AnchorHTMLAttributes } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/setup/test-utils';
import { NotFoundPage } from '@/components/custom/NotFoundPage';
import commonSv from '@/messages/sv/common.json';
import commonEn from '@/messages/en/common.json';

const pushMock = vi.fn();

// next-intl's locale-aware Link/useRouter pull in `next/navigation`, which
// vitest can't resolve; stub the factory (same pattern as AboutPage.test.tsx)
// and expose a push spy so the CTA fade-then-navigate (AC4) is observable.
vi.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a href={String(href)} {...props}>
        {children}
      </a>
    ),
    useRouter: () => ({ push: pushMock }),
  }),
}));

const reducedMotionMock = vi.fn<() => boolean>(() => false);
const animateMock = vi.fn(() => ({ finished: Promise.resolve() }));

// Stub Motion: `motion.div` records whether a float `animate` prop was passed
// (so AC3/AC5 gating is assertable), and the imperative `animate` used by the
// CTA exit fade resolves synchronously.
vi.mock('motion/react', async () => {
  const React = await import('react');
  type DivProps = React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
  const passthrough = ({ animate: animateProp, transition: _transition, ...rest }: DivProps) =>
    React.createElement('div', { ...rest, 'data-has-float': animateProp ? 'true' : 'false' });
  return {
    motion: { div: passthrough },
    useReducedMotion: () => reducedMotionMock(),
    animate: (..._args: unknown[]) => animateMock(),
  };
});

const svMessages = { common: commonSv };
const enMessages = { common: commonEn };

describe('<NotFoundPage />', () => {
  beforeEach(() => {
    reducedMotionMock.mockReturnValue(false);
    animateMock.mockClear();
    pushMock.mockClear();
  });

  it('renders the wordmark, pin, heading and CTA (AC1)', () => {
    renderWithProviders(<NotFoundPage />, { messages: svMessages });

    // Wordmark appears as a locale-aware logo link (mobile + desktop chrome).
    expect(screen.getAllByLabelText('SunnySeat — gå till kartan').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('not-found-pin')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Den här platsen hittades inte',
    );
    expect(screen.getByTestId('not-found-cta')).toHaveTextContent('Hitta soliga platser nu →');
  });

  it('shows the desktop navbar chrome (AC2)', () => {
    renderWithProviders(<NotFoundPage />, { messages: svMessages });
    expect(screen.getByTestId('not-found-desktop-nav')).toBeInTheDocument();
  });

  it('points the CTA at the map (/) — a plain in-app link, not a routing handoff (AC1/AC4)', () => {
    renderWithProviders(<NotFoundPage />, { messages: svMessages });
    expect(screen.getByTestId('not-found-cta')).toHaveAttribute('href', '/');
  });

  it('floats the pin when motion is allowed (AC3)', () => {
    renderWithProviders(<NotFoundPage />, { messages: svMessages });
    expect(screen.getByTestId('not-found-pin')).toHaveAttribute('data-has-float', 'true');
  });

  it('does not float the pin under reduced motion (AC5)', () => {
    reducedMotionMock.mockReturnValue(true);
    renderWithProviders(<NotFoundPage />, { messages: svMessages });
    expect(screen.getByTestId('not-found-pin')).toHaveAttribute('data-has-float', 'false');
  });

  it('fades out then navigates to the map on CTA click when motion is allowed (AC4)', async () => {
    renderWithProviders(<NotFoundPage />, { messages: svMessages });
    fireEvent.click(screen.getByTestId('not-found-cta'));
    expect(animateMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
  });

  it('skips the exit fade under reduced motion and lets the link navigate (AC5)', () => {
    reducedMotionMock.mockReturnValue(true);
    renderWithProviders(<NotFoundPage />, { messages: svMessages });
    fireEvent.click(screen.getByTestId('not-found-cta'));
    expect(animateMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('renders English copy when the locale is en (AC6)', () => {
    renderWithProviders(<NotFoundPage />, { messages: enMessages, locale: 'en' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'This page could not be found',
    );
    expect(screen.getByTestId('not-found-cta')).toHaveTextContent('Find sunny spots now →');
  });
});
