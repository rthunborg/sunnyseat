import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccuracyCountUp } from '@/components/custom/about/AccuracyCountUp';

// Story 7.1 AC #3 (count-up) + AC #5 (reduced motion). The repo has no
// count-up primitive; this stubs `motion/react` so the scroll trigger
// (useInView), the reduced-motion query, and the value tween (animate) are
// deterministic.
const reducedMotionMock = vi.fn<() => boolean>(() => false);
const inViewMock = vi.fn<() => boolean>(() => true);
const animateMock = vi.fn(
  (
    _from: number,
    to: number,
    opts?: { onUpdate?: (v: number) => void; onComplete?: () => void },
  ) => {
    opts?.onUpdate?.(to);
    opts?.onComplete?.();
    return { stop: vi.fn() };
  },
);

vi.mock('motion/react', () => ({
  useReducedMotion: () => reducedMotionMock(),
  useInView: () => inViewMock(),
  animate: (...args: Parameters<typeof animateMock>) => animateMock(...args),
}));

describe('<AccuracyCountUp />', () => {
  beforeEach(() => {
    reducedMotionMock.mockReturnValue(false);
    inViewMock.mockReturnValue(true);
    animateMock.mockClear();
  });

  it('counts up to the final figure when scrolled into view (AC #3)', () => {
    render(<AccuracyCountUp value={85} suffix="%" ariaLabel="Träffsäkerhet: 85 procent" />);
    expect(animateMock).toHaveBeenCalledWith(0, 85, expect.anything());
    expect(screen.getByTestId('about-accuracy-stat')).toHaveTextContent('85%');
  });

  it('announces the final figure once via an sr-only label (a11y)', () => {
    render(<AccuracyCountUp value={85} suffix="%" ariaLabel="Träffsäkerhet: 85 procent" />);
    expect(screen.getByText('Träffsäkerhet: 85 procent')).toBeInTheDocument();
  });

  it('renders the figure instantly with no count-up under reduced motion (AC #5)', () => {
    reducedMotionMock.mockReturnValue(true);
    render(<AccuracyCountUp value={85} suffix="%" ariaLabel="Träffsäkerhet: 85 procent" />);
    expect(animateMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('about-accuracy-stat')).toHaveTextContent('85%');
  });

  it('does not start the count-up before scrolling into view', () => {
    inViewMock.mockReturnValue(false);
    render(<AccuracyCountUp value={85} suffix="%" ariaLabel="x" />);
    expect(animateMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('about-accuracy-stat')).toHaveTextContent('0%');
  });

  it('does not replay the count-up if reduced motion is toggled off after the figure is shown (AC #3 one-time)', () => {
    // Shown instantly under reduced motion.
    reducedMotionMock.mockReturnValue(true);
    const { rerender } = render(<AccuracyCountUp value={85} suffix="%" ariaLabel="x" />);
    expect(animateMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('about-accuracy-stat')).toHaveTextContent('85%');

    // User disables prefers-reduced-motion while the stat is still in view: the
    // figure must stay at 85 — no reset to 0, no tween replay.
    reducedMotionMock.mockReturnValue(false);
    rerender(<AccuracyCountUp value={85} suffix="%" ariaLabel="x" />);
    expect(animateMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('about-accuracy-stat')).toHaveTextContent('85%');
  });
});
