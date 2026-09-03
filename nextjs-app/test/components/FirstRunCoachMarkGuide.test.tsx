import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { renderWithProviders } from '@/test/setup/test-utils';
import {
  FirstRunCoachMarkGuide,
  getCoachTourSteps,
  resolveAvailableCoachStepIndex,
  resolveAvailableCoachStepIndexes,
} from '@/components/custom/coach-tour/FirstRunCoachMarkGuide';
import { FirstRunGuideProvider, useFirstRunGuide, useFirstRunGuideSeen, writeFirstRunGuideSeen } from '@/lib/contexts/FirstRunGuideContext';
import { COACH_TOUR_STEP_IDS, type CoachTourStepId } from '@/lib/constants/coach-tour';
import {
  FIRST_RUN_GUIDE_SEEN_KEY,
  ONBOARDED_FLAG_KEY,
} from '@/lib/constants/onboarding';
import commonMessages from '@/messages/sv/common.json';
import mapMessagesEn from '@/messages/en/map.json';
import mapMessages from '@/messages/sv/map.json';

const motionState = vi.hoisted(() => ({ reducedMotion: false }));

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return {
    ...actual,
    useReducedMotion: () => motionState.reducedMotion,
  };
});

vi.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => motionState.reducedMotion,
}));

const messages = {
  common: commonMessages,
  map: mapMessages,
  onboarding: {},
  venue: {},
  feedback: {},
  about: {},
  favourites: {},
};

const messagesEn = {
  ...messages,
  map: mapMessagesEn,
};

const EXPECTED_SV_PIN_COPY =
  'Procenten visar hur stor andel av uteserveringens platser vi tror är i direkt sol vid den valda tiden.';
const EXPECTED_SV_PLANNER_COPY =
  'Du behöver inte ändra något – kartan visar läget just nu. Vill du planera framåt kan du välja datum och tid. Ju längre fram du tittar, desto osäkrare blir prognosen.';
const EXPECTED_EN_PIN_COPY =
  'The percentage shows the share of outdoor seats we think are in direct sun at the selected time.';
const EXPECTED_EN_PLANNER_COPY =
  'You do not need to change anything — the map shows what is happening right now. To plan ahead, choose a date and time. The farther ahead you look, the less certain the forecast becomes.';

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
  locale = 'sv',
  renderMessages = messages,
}: {
  forcedStepId?: CoachTourStepId | null;
  autoStartEnabled?: boolean;
  anchors?: string[];
  mapDescription?: string;
  locale?: 'sv' | 'en';
  renderMessages?: typeof messages;
} = {}) {
  return renderWithProviders(
    <FirstRunGuideProvider>
      <AnchorSet anchors={anchors} mapDescription={mapDescription} />
      <FirstRunCoachMarkGuide
        forcedStepId={forcedStepId ?? null}
        autoStartEnabled={autoStartEnabled}
      />
    </FirstRunGuideProvider>,
    { locale, messages: renderMessages },
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

function expectCenteredSkipSplitFooterLayout(
  skipLabel: string,
  backLabel: string,
  nextLabel: string,
) {
  const actions = screen.getByTestId('coach-tour-actions');
  const skipRow = screen.getByTestId('coach-tour-skip-row');
  const navigation = screen.getByTestId('coach-tour-navigation');
  const skip = screen.getByRole('button', { name: skipLabel });
  const skipPill = screen.getByTestId('coach-tour-skip-pill');
  const back = screen.getByRole('button', { name: backLabel });
  const next = screen.getByRole('button', { name: nextLabel });

  expect(skip).toBe(screen.getByTestId('coach-tour-skip'));
  expect(actions).toHaveClass('flex', 'flex-col', 'gap-3', 'pt-1', 'desktop:gap-2');
  expect(actions.firstElementChild).toBe(skipRow);
  expect(actions.lastElementChild).toBe(navigation);
  expect(skipRow).toHaveClass('flex', 'w-full', 'justify-center');
  expect(skipRow).not.toHaveClass('justify-end');
  expect(navigation).toHaveClass('flex', 'w-full', 'justify-between', 'gap-2');
  expect(navigation).not.toHaveClass('justify-end');
  expect(skipRow).toContainElement(skip);
  expect(navigation).not.toContainElement(skip);
  expect(navigation).toContainElement(back);
  expect(navigation).toContainElement(next);
  expect(
    skipRow.compareDocumentPosition(navigation) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(
    skip.compareDocumentPosition(back) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(
    back.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(back).toBeDisabled();
  expect(back).toHaveClass('cursor-not-allowed', 'text-text-muted', 'opacity-60');
  expect(skip).toHaveClass(
    'group',
    'inline-flex',
    'min-h-11',
    'min-w-11',
    'rounded-pill',
    'p-0',
    'text-text-primary',
    'focus-visible:ring-text-primary',
  );
  expect(skipPill).toHaveClass(
    'inline-flex',
    'min-h-10',
    'border',
    'border-error/10',
    'bg-error/5',
    'px-3',
    'text-label-md',
    'group-hover:border-error/20',
    'group-hover:bg-error/10',
    'desktop:min-h-11',
    'desktop:px-4',
    'desktop:text-label-lg',
  );
  expect(skip).toContainElement(skipPill);
  expect(skip).not.toHaveClass('border-divider');
  expect(skip).not.toHaveClass('bg-surface-cream');
  expect(skip).not.toHaveClass('text-text-body');
  expect(skipPill).not.toHaveClass('px-4');
  expect(skipPill).not.toHaveClass('text-label-lg');
  expect(next).toHaveClass(
    'bg-action-progress',
    'hover:bg-action-progress-hover',
    'text-surface-cream',
    'focus-visible:ring-text-primary',
  );
  expect(next).not.toHaveClass('bg-text-primary');
  expect(next).not.toHaveClass('hover:bg-amber-dark');
  expect(skip).not.toHaveClass('justify-self-end');
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

  it('counts only visible anchors in coach progress text', async () => {
    rectOverrides.set('time-slider', null);
    rectOverrides.set('tag-chips', null);
    rectOverrides.set('favourites', null);

    renderGuide({ forcedStepId: 'pin-legend' });

    expect(await screen.findByRole('dialog', { name: 'Kartnålarna' })).toHaveTextContent(
      'Steg 1 av 3',
    );
    expect(resolveAvailableCoachStepIndexes(getCoachTourSteps())).toEqual([0, 2, 4]);
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

  it('keeps polling until onboarding finishes instead of expiring before the map is eligible', async () => {
    vi.useFakeTimers();

    const view = renderGuide({ autoStartEnabled: true });
    await act(async () => {});

    await act(async () => {
      vi.advanceTimersByTime(3_500);
    });
    expect(screen.queryByTestId('coach-tour-dialog')).toBeNull();

    await act(async () => {
      window.localStorage.setItem(ONBOARDED_FLAG_KEY, '1');
      vi.advanceTimersByTime(100);
    });
    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByRole('dialog', { name: 'Kartnålarna' })).toHaveAttribute(
      'data-tour-source',
      'auto',
    );
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
    expect(dialog).toHaveTextContent(EXPECTED_SV_PIN_COPY);
    expect(screen.getByTestId('coach-tour-pin-legend')).toHaveTextContent('Soligt');
    expect(screen.getByTestId('coach-tour-pin-legend')).toHaveTextContent('Skuggat');
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByTestId('coach-tour-pin-legend').querySelector('[data-pin-icon="sun"]'))
      .toBeInTheDocument();
    expect(screen.getByTestId('coach-tour-pin-legend').querySelector('[data-pin-icon="cloud"]'))
      .toBeInTheDocument();
    expect(screen.getAllByTestId('coach-tour-pin-legend')[0].querySelectorAll('[data-pin-tail]'))
      .toHaveLength(2);
    expect(document.querySelector('[data-tour-anchor="feedback"]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Hoppa över guide' }));
    await waitFor(() => expect(screen.queryByTestId('coach-tour-dialog')).toBeNull());
    expect(window.localStorage.getItem(FIRST_RUN_GUIDE_SEEN_KEY)).toBeNull();
  });

  it('renders the middle planner step as optional now/default guidance with forecast uncertainty', async () => {
    renderGuide({ forcedStepId: 'time-slider' });

    const dialog = await screen.findByRole('dialog', { name: 'Välj tid' });
    expect(dialog).toHaveTextContent(EXPECTED_SV_PLANNER_COPY);
  });

  it('keeps Swedish and English coach copy aligned with the no-confidence semantics', () => {
    expect(mapMessages.coachTour.steps.pinLegend.body).toBe(EXPECTED_SV_PIN_COPY);
    expect(mapMessages.coachTour.steps.timeSlider.body).toBe(EXPECTED_SV_PLANNER_COPY);
    expect(mapMessagesEn.coachTour.steps.pinLegend.body).toBe(EXPECTED_EN_PIN_COPY);
    expect(mapMessagesEn.coachTour.steps.timeSlider.body).toBe(EXPECTED_EN_PLANNER_COPY);

    const publicCopy = [
      mapMessages.coachTour.steps.pinLegend.body,
      mapMessages.coachTour.steps.timeSlider.body,
      mapMessagesEn.coachTour.steps.pinLegend.body,
      mapMessagesEn.coachTour.steps.timeSlider.body,
    ].join(' ');
    expect(publicCopy).not.toMatch(/\b\d+\s*%\s*(?:säker|säkra|säkerhet|confidence)/i);
    expect(publicCopy).not.toMatch(/\b(?:säkerhet|confidence)\s*\d+\s*%/i);
    expect(mapMessages.coachTour.skip).toBe('Hoppa över guide');
    expect(mapMessagesEn.coachTour.skip).toBe('Skip guide');
  });

  it('centers skip in a separate row above split Back and Next navigation', async () => {
    renderGuide({ forcedStepId: 'pin-legend' });

    await screen.findByRole('dialog', { name: 'Kartnålarna' });
    expectCenteredSkipSplitFooterLayout('Hoppa över guide', 'Tillbaka', 'Nästa');
  });

  it('uses the same centered split footer layout and token classes for English copy', async () => {
    renderGuide({
      forcedStepId: 'pin-legend',
      locale: 'en',
      renderMessages: messagesEn,
    });

    await screen.findByRole('dialog', { name: 'Map pins' });
    expectCenteredSkipSplitFooterLayout('Skip guide', 'Back', 'Next');
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
    fireEvent.click(screen.getByRole('button', { name: 'Hoppa över guide' }));
    await waitFor(() => expect(screen.queryByTestId('coach-tour-dialog')).toBeNull());
  });

  it('auto-shows once after onboarding and writes the seen flag on skip', async () => {
    window.localStorage.setItem(ONBOARDED_FLAG_KEY, '1');
    const view = renderGuide({ autoStartEnabled: true });

    await screen.findByRole('dialog', { name: 'Kartnålarna' });
    fireEvent.click(screen.getByRole('button', { name: 'Hoppa över guide' }));
    await waitFor(() =>
      expect(window.localStorage.getItem(FIRST_RUN_GUIDE_SEEN_KEY)).toBe('1'),
    );

    view.unmount();
    renderGuide({ autoStartEnabled: true });
    await waitFor(() => expect(screen.queryByTestId('coach-tour-dialog')).toBeNull());
  });

  it('does not write the seen flag when the active target disappears before an explicit action', async () => {
    window.localStorage.setItem(ONBOARDED_FLAG_KEY, '1');
    renderGuide({ autoStartEnabled: true });

    await screen.findByRole('dialog', { name: 'Kartnålarna' });
    for (const anchor of defaultRects.keys()) {
      rectOverrides.set(anchor, null);
    }
    fireEvent(window, new Event('resize'));

    await waitFor(() => expect(screen.queryByTestId('coach-tour-dialog')).toBeNull());
    expect(window.localStorage.getItem(FIRST_RUN_GUIDE_SEEN_KEY)).toBeNull();
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

  it('hides and inerts sibling app content while the coach dialog is modal', async () => {
    renderGuide({ forcedStepId: 'pin-legend' });

    await screen.findByRole('dialog', { name: 'Kartnålarna' });
    const anchor = screen.getByTestId('anchor-map-surface');
    expect(anchor).toHaveAttribute('aria-hidden', 'true');
    expect(anchor).toHaveAttribute('inert');

    fireEvent.click(screen.getByRole('button', { name: 'Hoppa över guide' }));
    await waitFor(() => expect(screen.queryByTestId('coach-tour-dialog')).toBeNull());
    expect(anchor).not.toHaveAttribute('aria-hidden');
    expect(anchor).not.toHaveAttribute('inert');
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
