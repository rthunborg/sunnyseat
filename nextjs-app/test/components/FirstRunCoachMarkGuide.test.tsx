import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { renderWithProviders } from '@/test/setup/test-utils';
import {
  FirstRunCoachMarkGuide,
  getCoachTourSteps,
  resolveAvailableCoachStepIndex,
} from '@/components/custom/coach-tour/FirstRunCoachMarkGuide';
import { FirstRunGuideProvider, useFirstRunGuide, useFirstRunGuideSeen, writeFirstRunGuideSeen } from '@/lib/contexts/FirstRunGuideContext';
import { COACH_TOUR_STEP_IDS, type CoachTourStepId } from '@/lib/constants/coach-tour';
import {
  FIRST_RUN_GUIDE_SEEN_KEY,
  ONBOARDED_FLAG_KEY,
} from '@/lib/constants/onboarding';
import commonMessages from '@/messages/sv/common.json';
import mapMessages from '@/messages/sv/map.json';

const motionState = vi.hoisted(() => ({ reducedMotion: false }));

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return {
    ...actual,
    useReducedMotion: () => motionState.reducedMotion,
  };
});

const messages = {
  common: commonMessages,
  map: mapMessages,
  onboarding: {},
  venue: {},
  feedback: {},
  about: {},
  favourites: {},
};

type TestRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const defaultRects = new Map<string, TestRect>([
  ['map-surface', { x: 0, y: 0, width: 390, height: 844 }],
  ['time-slider', { x: 16, y: 128, width: 358, height: 72 }],
  ['date-planner', { x: 292, y: 142, width: 72, height: 44 }],
  ['tag-chips', { x: 16, y: 600, width: 358, height: 48 }],
  ['venue-list', { x: 0, y: 520, width: 390, height: 272 }],
  ['favourites', { x: 240, y: 792, width: 120, height: 52 }],
]);

const rectOverrides = new Map<string, TestRect | null>();

function rect({ x, y, width, height }: TestRect): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  } as DOMRect;
}

function zeroRect(): DOMRect {
  return rect({ x: 0, y: 0, width: 0, height: 0 });
}

function installRectMock() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getRect(this: HTMLElement) {
    const anchor = this.getAttribute('data-tour-anchor');
    if (!anchor) return rect({ x: 16, y: 16, width: 320, height: 240 });
    if (rectOverrides.has(anchor)) {
      const override = rectOverrides.get(anchor);
      return override ? rect(override) : zeroRect();
    }
    const fallback = defaultRects.get(anchor);
    return fallback ? rect(fallback) : zeroRect();
  });
}

function AnchorSet({
  anchors = ['map-surface', 'time-slider', 'date-planner', 'tag-chips', 'venue-list', 'favourites'],
  mapDescription,
}: {
  anchors?: string[];
  mapDescription?: string;
}) {
  return (
    <>
      {anchors.map((anchor) => (
        <div
          key={anchor}
          tabIndex={anchor === 'map-surface' ? -1 : undefined}
          aria-describedby={anchor === 'map-surface' ? mapDescription : undefined}
          data-testid={`anchor-${anchor}`}
          data-tour-anchor={anchor}
        >
          {anchor}
        </div>
      ))}
    </>
  );
}

function renderGuide({
  forcedStepId,
  autoStartEnabled = false,
  anchors,
  mapDescription,
}: {
  forcedStepId?: CoachTourStepId | null;
  autoStartEnabled?: boolean;
  anchors?: string[];
  mapDescription?: string;
} = {}) {
  return renderWithProviders(
    <FirstRunGuideProvider>
      <AnchorSet anchors={anchors} mapDescription={mapDescription} />
      <FirstRunCoachMarkGuide
        forcedStepId={forcedStepId ?? null}
        autoStartEnabled={autoStartEnabled}
      />
    </FirstRunGuideProvider>,
    { messages },
  );
}

function ManualLaunch({
  initialStepId,
  children,
}: {
  initialStepId: CoachTourStepId;
  children?: ReactNode;
}) {
  const { startGuide } = useFirstRunGuide();
  useEffect(() => {
    startGuide({
      source: 'settings',
      initialStepId,
      persistOnDismiss: false,
    });
  }, [initialStepId, startGuide]);
  return <>{children}</>;
}

function renderManualGuide(initialStepId: CoachTourStepId) {
  return renderWithProviders(
    <FirstRunGuideProvider>
      <AnchorSet />
      <ManualLaunch initialStepId={initialStepId} />
      <FirstRunCoachMarkGuide autoStartEnabled={false} />
    </FirstRunGuideProvider>,
    { messages },
  );
}

function SeenProbe() {
  const hasSeen = useFirstRunGuideSeen();
  return <span data-testid="seen-probe">{String(hasSeen)}</span>;
}

function renderSeenProbe() {
  return renderWithProviders(<SeenProbe />, { messages });
}

describe('<FirstRunCoachMarkGuide />', () => {
  beforeEach(() => {
    motionState.reducedMotion = false;
    rectOverrides.clear();
    installRectMock();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('defines the locked step registry without a feedback target', () => {
    expect(getCoachTourSteps().map((step) => step.id)).toEqual([
      ...COACH_TOUR_STEP_IDS,
    ]);
    expect(getCoachTourSteps().map((step) => step.anchor)).not.toContain('feedback');
  });

  it('skips absent optional anchors when resolving the next step', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div data-tour-anchor="time-slider"></div>
      <div data-tour-anchor="date-planner"></div>
    `;
    rectOverrides.set('time-slider', null);
    const steps = getCoachTourSteps();
    const index = resolveAvailableCoachStepIndex(steps, 1, 1, root);
    expect(index).toBe(2);
    expect(steps[index ?? -1]?.id).toBe('date-planner');
  });

  it('does not auto-start or write the seen flag when the core map anchor is unavailable', () => {
    vi.useFakeTimers();
    window.localStorage.setItem(ONBOARDED_FLAG_KEY, '1');
    rectOverrides.set('map-surface', null);

    const view = renderGuide({ autoStartEnabled: true });

    act(() => {
      vi.advanceTimersByTime(3_500);
    });

    expect(screen.queryByTestId('coach-tour-dialog')).toBeNull();
    expect(window.localStorage.getItem(FIRST_RUN_GUIDE_SEEN_KEY)).toBeNull();
    view.unmount();
  });

  it('skips a zero-size requested step target before rendering the guide card', async () => {
    rectOverrides.set('time-slider', null);

    renderManualGuide('time-slider');

    expect(await screen.findByTestId('coach-tour-step-date-planner')).toBeInTheDocument();
    expect(screen.queryByTestId('coach-tour-step-time-slider')).toBeNull();
    await waitFor(() =>
      expect(screen.getByTestId('anchor-date-planner')).toHaveAttribute(
        'aria-describedby',
        expect.stringContaining('coach-tour-target-description'),
      ),
    );
    expect(screen.getByTestId('anchor-time-slider')).not.toHaveAttribute(
      'aria-describedby',
    );
  });

  it('renders the forced first step with public pin swatches and no persistence write', async () => {
    renderGuide({ forcedStepId: 'pin-legend' });

    const dialog = await screen.findByRole('dialog', { name: 'Kartnålarna' });
    expect(dialog).toHaveAttribute('data-tour-source', 'forced');
    expect(screen.getByTestId('coach-tour-pin-legend')).toHaveTextContent('Soligt');
    expect(screen.getByTestId('coach-tour-pin-legend')).toHaveTextContent('Skuggat');
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(document.querySelector('[data-tour-anchor="feedback"]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Hoppa över' }));
    await waitFor(() => expect(screen.queryByTestId('coach-tour-dialog')).toBeNull());
    expect(window.localStorage.getItem(FIRST_RUN_GUIDE_SEEN_KEY)).toBeNull();
  });

  it('keeps the card inside the viewport when the map surface fills the screen', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });

    renderGuide({ forcedStepId: 'pin-legend' });

    const dialog = await screen.findByTestId('coach-tour-dialog');
    const top = Number.parseFloat(dialog.style.top);
    const maxHeight = Number.parseFloat(dialog.style.maxHeight);
    expect(dialog).toHaveAttribute('data-tour-placement', 'inline');
    expect(top).toBeGreaterThanOrEqual(16);
    expect(top).toBeLessThan(300);
    expect(top + maxHeight).toBeLessThanOrEqual(844 - 16);
  });

  it.each(COACH_TOUR_STEP_IDS)('can be skipped from step %s', async (stepId) => {
    renderManualGuide(stepId);
    await screen.findByTestId(`coach-tour-step-${stepId}`);
    fireEvent.click(screen.getByRole('button', { name: 'Hoppa över' }));
    await waitFor(() => expect(screen.queryByTestId('coach-tour-dialog')).toBeNull());
  });

  it('auto-shows once after onboarding and writes the seen flag on skip', async () => {
    window.localStorage.setItem(ONBOARDED_FLAG_KEY, '1');
    const view = renderGuide({ autoStartEnabled: true });

    await screen.findByRole('dialog', { name: 'Kartnålarna' });
    fireEvent.click(screen.getByRole('button', { name: 'Hoppa över' }));
    await waitFor(() =>
      expect(window.localStorage.getItem(FIRST_RUN_GUIDE_SEEN_KEY)).toBe('1'),
    );

    view.unmount();
    renderGuide({ autoStartEnabled: true });
    await waitFor(() => expect(screen.queryByTestId('coach-tour-dialog')).toBeNull());
  });

  it('updates same-tab, cross-tab, and clear() seen-state subscribers', async () => {
    renderSeenProbe();
    expect(screen.getByTestId('seen-probe')).toHaveTextContent('false');

    act(() => writeFirstRunGuideSeen());
    await waitFor(() => expect(screen.getByTestId('seen-probe')).toHaveTextContent('true'));

    act(() => {
      window.localStorage.clear();
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
    });
    await waitFor(() => expect(screen.getByTestId('seen-probe')).toHaveTextContent('false'));

    act(() => {
      window.localStorage.setItem(FIRST_RUN_GUIDE_SEEN_KEY, '1');
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: FIRST_RUN_GUIDE_SEEN_KEY,
          newValue: '1',
        }),
      );
    });
    await waitFor(() => expect(screen.getByTestId('seen-probe')).toHaveTextContent('true'));
  });

  it('does not throw when the seen flag cannot be written', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      writable: true,
      value: {
        getItem: () => null,
        setItem: () => {
          throw new DOMException('blocked', 'SecurityError');
        },
      },
    });

    expect(() => writeFirstRunGuideSeen()).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });

  it('focuses the heading, traps focus, closes with Escape, and restores target description', async () => {
    renderGuide({ forcedStepId: 'pin-legend', mapDescription: 'existing-id' });

    const dialog = await screen.findByRole('dialog', { name: 'Kartnålarna' });
    const heading = screen.getByRole('heading', { name: 'Kartnålarna' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByTestId('anchor-map-surface')).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('coach-tour-target-description'),
    );

    const next = screen.getByRole('button', { name: 'Nästa' });
    next.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Stäng guide' })).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('coach-tour-dialog')).toBeNull());
    expect(screen.getByTestId('anchor-map-surface')).toHaveAttribute(
      'aria-describedby',
      'existing-id',
    );
  });

  it('marks reduced-motion state on the dialog when requested by the user', async () => {
    motionState.reducedMotion = true;
    renderGuide({ forcedStepId: 'pin-legend' });

    expect(await screen.findByTestId('coach-tour-dialog')).toHaveAttribute(
      'data-reduced-motion',
      'true',
    );
  });
});
