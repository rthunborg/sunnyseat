# Story 12.9 Slider Date Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the already-implemented Story 12.9 mobile planner chrome so the 390x844 mobile panel is 68-72 CSS px tall, uses the token slider thumb with a 44px hit target, and replaces the mobile next-day shortcut with one accessible Calendar+date trigger while preserving row-sheet behavior and request-count invariants.

**Architecture:** Keep production scope surgical: `TimeSlider` owns slider geometry, `TimeSliderPanel` owns the mobile date trigger, open state, and focus restoration, and `DatePickerDialog` remains unchanged because every current close path already funnels through `onOpenChange(false)`. Request-count specs migrate from the removed mobile next-day shortcut to the existing calendar selection path. Existing Story 12.9 row-sheet production files stay regression-only surfaces; visual evidence reuses the implementation-derived candidate-capture infrastructure rather than the retired Claude prototype recipe.

**Tech Stack:** Next.js 16.2.2 App Router, React 19, TypeScript strict, Tailwind CSS v4 `@theme` tokens, lucide-react icons, next-intl, Motion 12, Vitest + Testing Library, Playwright mobile/desktop/touch/a11y projects.

## Global Constraints

- Scope is mobile-only planner refinement; desktop planner layout, desktop dimensions, desktop controls, date-dialog design, row-snap model, onboarding, hydration cleanup, and unrelated visual references are out of scope.
- Mobile top planner panel height at the 390x844 validation viewport must be `<= 72` CSS px, with expected measured height `68-72` CSS px.
- Use existing spacing tokens/utilities; do not introduce raw hex colors, raw shadows, or ad-hoc pixel nudges.
- The mobile slider keeps the tokenized `size-slider-track-h` 6px track.
- The mobile slider visible thumb uses the existing `size-slider-thumb` token, approximately 14.1px.
- The semantic/invisible slider input or hit layer must still provide at least a 44x44 CSS px touch target.
- The live `HH:MM` badge continues to follow the thumb horizontally.
- Badge and thumb/track must occupy distinct vertical lanes with positive clearance: geometry tests must prove `badge.bottom < thumb.top` and at least one small tokenized gap between them.
- Remove the mobile next-day `>` shortcut. The desktop next-day control remains unchanged.
- Replace the mobile date area with one clickable 44px-min trigger containing the Calendar icon and selected-date pill text.
- The mobile date trigger must not include a chevron or disclosure icon.
- The mobile date trigger uses existing tokenized surface, border, shadow, radius, and text treatments and needs visible hover, pressed, and `focus-visible` states.
- The mobile date trigger must expose `aria-haspopup="dialog"` and live `aria-expanded`.
- When the dialog closes by date selection, Escape, backdrop, or close button, focus returns to the date trigger.
- Existing dialog keyboard behavior, focus trap, disabled-day semantics, and selectable today-to-today+3 window remain unchanged.
- Data flow remains through `TimeContext` and the existing `DatePickerDialog`/planner helpers.
- Selecting a valid new date calls the existing date-selection path once.
- Closing without a date change leaves selected date, query key, and request count unchanged.
- Disabled/unavailable dates stay disabled with existing localized accessibility copy; invalid forced dates continue to clamp through the existing planner state rules.
- No new API route, Supabase access, solar/weather import, premium state, or runtime dependency is added.
- Existing row-sheet Story 12.9 behavior remains binding: row-count state, handle-only `N=0`, `N=3`, `N=max`, mid-drag, keyboard ladder, no map gap, and internal scroll past max stay green.
- New candidate visual evidence is non-authoritative and must embed inline images in Markdown. No canonical PNG is promoted until Rasmus explicitly approves the candidate set.
- The inherited OnboardingGate/desktop hydration work is Story 12.4 and must not be touched.
- This is already an Auto-BMAD epic run. Execution choice is resolved as subagent-driven implementation by `ab-*` workers. Implementers never run git; the root orchestrator owns the story checkpoint commit under the repo workflow after review gates and human visual approval.

---

## File Responsibilities

- Modify: `nextjs-app/components/composed/time/TimeSlider.tsx`
  - Owns `TimeSliderProps`, `TimeSlider`, top-panel slider geometry, `time-slider-value-badge`, `time-slider-track`, native `input[type="range"]`, `time-slider-thumb`, and tick rendering.
  - This file must make the top-panel visible thumb `size-slider-thumb`, keep the invisible slider input `h-11`, keep the track `h-[var(--size-slider-track-h)]`, and remove the mobile/top-panel tick-label row to meet the 68-72px panel budget.

- Modify: `nextjs-app/components/custom/time/TimeSliderPanel.tsx`
  - Owns `TimeSliderPanelProps`, mobile-vs-desktop layout branches, `calendarOpen`, `CalendarButton`, `NextDayButton`, `planner-date-label`, and `DatePickerDialog` wiring.
  - This file removes `NextDayButton` from the mobile branch only, keeps desktop `NextDayButton` and its `planner-date-next` test id unchanged, adds `planner-date-trigger`, `aria-haspopup="dialog"`, live `aria-expanded`, tokenized interactive states, and trigger-owned focus restoration.

- Do not modify by default: `nextjs-app/components/composed/time/DatePickerDialog.tsx`
  - The dialog already closes through `onOpenChange(false)` for Escape, backdrop, close button, and date selection. Focus restoration should be owned by the trigger in `TimeSliderPanel`.
  - Only edit this file if a real implementation run proves one of those close paths bypasses `onOpenChange(false)`. The expected implementation does not require that fallback.

- Modify: `nextjs-app/test/components/TimeSlider.test.tsx`
  - Owns component assertions for top-panel slider thumb sizing, track sizing, 44px hit target, badge/thumb lane separation, and standard desktop/detail slider non-regression.

- Modify: `nextjs-app/test/components/TimeSliderPanel.test.tsx`
  - Owns component assertions for mobile Calendar+date trigger, no mobile next-day shortcut, live dialog semantics, focus restoration for all close paths, desktop layout and desktop next-day non-regression, and mocked mobile panel height.

- Modify: `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts`
  - Owns the standing Epic 11 request-count invariant: same-date time scrub adds zero `/api/venues` requests; a date change adds exactly one request; no `api.met.no` request leaks; markers persist.
  - Migrate the date-change interaction from `planner-date-next` to calendar-dialog date selection.

- Modify: `nextjs-app/test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts`
  - Owns the persisted-geometry request-count invariant and provider fanout guard.
  - Migrate the date-change interaction from `planner-date-next` to calendar-dialog date selection.

- Modify: `nextjs-app/test/e2e/map-primary.spec.ts`
  - Owns browser geometry assertions for mobile planner panel height, slider track/thumb/hit target, badge/thumb clearance, mobile date trigger, no mobile next-day shortcut, `N=3` row-sheet geometry, `N=max` controls hidden/inert, mid-drag partial next row, and desktop planner non-regression.

- Create: `nextjs-app/test/unit/story-12-9-slider-date-refinement-source-contract.test.ts`
  - Owns a fast source contract that prevents request-count specs from regressing back to `planner-date-next` and prevents this refinement from editing OnboardingGate as part of Story 12.9.

- Create: `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/capture-story-12-9-slider-date-candidates.mjs`
  - A new timestamped candidate-capture helper derived from the existing Story 12.9 script at `_bmad-output/implementation-artifacts/validation/story-12-9-row-sheet-candidates/20260720-151908/capture-story-12-9-candidates.mjs`.
  - It tightens planner assertions from `<=88` to `68-72`, asserts the date-pill/slider geometry, captures `N=3`, `N=max`, mid-drag, and slim slider/date pill targets, and writes Markdown evidence with inline image embeds.

- Create: `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/evidence.md`
  - Generated by the capture helper. It must embed `![...](...)` images inline and clearly state `Canonical refs promoted: 0`.

- Do not modify during Tasks 1-5: `project-context.md`, `nextjs-app/docs/design/references/REBASELINE-LOG.md`, and `nextjs-app/docs/design/references/screens/**`.

- Do not modify in this refinement: `nextjs-app/components/custom/sheets/MobileBottomSheet.tsx`, `nextjs-app/components/custom/map/MapView.tsx`, `nextjs-app/components/custom/map/MapControls.tsx`, `nextjs-app/components/custom/onboarding/OnboardingGate.tsx`, API routes, Supabase, weather, solar, premium/payment code, and BMAD state/status files.

## Interfaces

- Existing `TimeSliderProps` consumed by `TimeSliderPanel`:

```ts
export type TimeSliderProps = {
  ariaLabel: string;
  selectedMinutes: number;
  ticks: PlannerTick[];
  onMinutesChange: (minutes: number) => void;
  onSnap: () => void;
  minMinutes?: number;
  reducedMotion?: boolean;
  variant?: 'standard' | 'topPanel';
  className?: string;
};
```

- Existing `TimeSliderPanelProps`, narrowed by this story by removing the unused `showDateLabel` escape:

```ts
export type TimeSliderPanelProps = {
  variant: 'mobile' | 'desktop';
  reducedMotion?: boolean;
  className?: string;
  panelRef?: Ref<HTMLElement>;
};
```

- New `CalendarButton` interface inside `TimeSliderPanel.tsx`:

```ts
function CalendarButton({
  ref,
  label,
  dateLabel,
  onClick,
  layoutPart,
  compact = false,
  open = false,
}: {
  ref?: Ref<HTMLButtonElement>;
  label: string;
  dateLabel: string;
  onClick: () => void;
  layoutPart?: string;
  compact?: boolean;
  open?: boolean;
}) {
  // returns button with data-testid="planner-date-trigger"
}
```

- Existing `DatePickerDialogProps` remains unchanged:

```ts
export type DatePickerDialogProps = {
  open: boolean;
  selectedDate: string;
  now: Date;
  locale: string;
  labels: DatePickerDialogLabels;
  onOpenChange: (open: boolean) => void;
  onSelectDate: (date: string) => void;
  reducedMotion?: boolean;
};
```

- E2E date-selection helper used by request-count specs:

```ts
async function selectDifferentDateFromCalendar(page: Page): Promise<string> {
  const targetDate = addDaysToDateKey(stockholmDateKey(), 1);
  const planner = page.locator('[data-testid="time-slider-panel"]:visible').first();
  await planner.getByTestId('planner-date-trigger').click();
  await page.getByRole('button', { name: swedishSelectDateLabel(targetDate) }).click();
  return targetDate;
}
```

### Task 1: TimeSlider Top-Panel Geometry

**Files:**
- Modify: `nextjs-app/components/composed/time/TimeSlider.tsx:70-236`
- Modify: `nextjs-app/test/components/TimeSlider.test.tsx:1-84`

**Interfaces:**
- Consumes: `TimeSliderProps.variant?: 'standard' | 'topPanel'`, existing test ids `time-slider-value-badge`, `time-slider-track`, `time-slider-thumb`, native slider role.
- Produces: Top-panel slider with `size-slider-thumb` visible thumb, `h-[var(--size-slider-track-h)]` track, `h-11` native hit target, no top-panel tick row height, and a measurable badge/thumb lane gap.

- [ ] **Step 1: Write the failing TimeSlider geometry test**

Add these helpers and replace the current top-panel test in `nextjs-app/test/components/TimeSlider.test.tsx`.

```tsx
function withElementRects(rectFor: (element: HTMLElement) => DOMRectInit, run: () => void) {
  const original = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
    const rect = rectFor(this as HTMLElement);
    if (rect.width !== undefined || rect.height !== undefined) {
      return DOMRect.fromRect(rect);
    }
    return original.call(this);
  };
  try {
    run();
  } finally {
    HTMLElement.prototype.getBoundingClientRect = original;
  }
}

it('renders the compact top-panel slider with token geometry and separate badge/thumb lanes', () => {
  withElementRects((element) => {
    const testId = element.getAttribute('data-testid');
    if (testId === 'time-slider-value-badge') return { x: 132, y: 0, width: 48, height: 18 };
    if (testId === 'time-slider-thumb') return { x: 149, y: 26, width: 14.1, height: 14.1 };
    if (testId === 'time-slider-track') return { x: 0, y: 32, width: 300, height: 6 };
    if (element instanceof HTMLInputElement && element.type === 'range') {
      return { x: 0, y: 0, width: 300, height: 44 };
    }
    return {};
  }, () => {
    render(
      <TimeSlider
        ariaLabel="Välj tid"
        selectedMinutes={14 * 60}
        ticks={generatePlannerTicks()}
        variant="topPanel"
        onMinutesChange={() => {}}
        onSnap={() => {}}
      />,
    );

    const slider = screen.getByRole('slider', { name: 'Välj tid' });
    const badge = screen.getByTestId('time-slider-value-badge');
    const track = screen.getByTestId('time-slider-track');
    const thumb = screen.getByTestId('time-slider-thumb');
    const badgeBox = badge.getBoundingClientRect();
    const thumbBox = thumb.getBoundingClientRect();
    const trackBox = track.getBoundingClientRect();
    const inputBox = slider.getBoundingClientRect();

    expect(badge).toHaveTextContent('14:00');
    expect(track).toHaveClass('h-slider-track-h', 'h-[var(--size-slider-track-h)]');
    expect(trackBox.height).toBe(6);
    expect(thumb).toHaveClass('size-slider-thumb', 'bg-white', 'border-amber-primary');
    expect(thumb).not.toHaveClass('size-6');
    expect(thumbBox.width).toBeCloseTo(14.1, 1);
    expect(thumbBox.height).toBeCloseTo(14.1, 1);
    expect(inputBox.width).toBeGreaterThanOrEqual(44);
    expect(inputBox.height).toBeGreaterThanOrEqual(44);
    expect(badgeBox.bottom).toBeLessThan(thumbBox.top);
    expect(thumbBox.top - badgeBox.bottom).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText('06')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the focused TimeSlider test and verify it fails**

Run from `nextjs-app/`:

```powershell
npx vitest run test/components/TimeSlider.test.tsx
```

Expected: FAIL because `time-slider-thumb` still has `size-6`, the top-panel tick label `06` still renders, and the mocked geometry contract is not represented in component structure.

- [ ] **Step 3: Implement the top-panel slider geometry**

In `nextjs-app/components/composed/time/TimeSlider.tsx`, make these targeted changes inside `TimeSlider`:

```tsx
const isTopPanel = variant === 'topPanel';
const visibleTicks = ticks;
const topPanelTrackPosition = 'top-8 -translate-y-1/2';
const standardTrackPosition = 'top-1/2 -translate-y-1/2';
```

Change the slider body so top-panel uses one 44px geometry lane and no tick row:

```tsx
<div className={cn('relative flex items-center min-h-11')}>
  {isTopPanel && (
    <div
      data-testid="time-slider-value-badge"
      aria-hidden="true"
      className={`pointer-events-none absolute top-0 z-base min-w-12 -translate-x-1/2 rounded-pill bg-text-primary px-2 py-0.5 text-center text-label-xs text-white shadow-subtle ${badgeFollowClass}`}
      style={{ left: `${percent}%` }}
    >
      {valueText}
    </div>
  )}
  <div
    data-testid="time-slider-track"
    aria-hidden="true"
    className={cn(
      'pointer-events-none absolute inset-x-0 h-slider-track-h h-[var(--size-slider-track-h)] overflow-hidden rounded-pill bg-surface-slider-track bg-gradient-to-r from-surface-slider-track via-amber-pale/60 to-amber-dark/40',
      isTopPanel ? topPanelTrackPosition : standardTrackPosition,
    )}
  >
    ...
  </div>
  <input
    ...
    className="absolute inset-0 z-base h-11 w-full cursor-grab opacity-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary active:cursor-grabbing"
  />
  <div
    data-testid="time-slider-thumb"
    data-reduced-motion={String(reducedMotion)}
    aria-hidden="true"
    className={[
      'pointer-events-none absolute -translate-x-1/2 rounded-pill shadow-subtle',
      isTopPanel ? 'top-8 -translate-y-1/2' : 'top-1/2 -translate-y-1/2',
      followClass,
      isTopPanel
        ? 'flex size-slider-thumb items-center justify-center border-slider-thumb border-amber-primary bg-white shadow-button-sm'
        : 'size-slider-thumb border-slider-thumb border-white bg-amber-dark',
    ].join(' ')}
    style={{ left: `${percent}%` }}
  >
    {isTopPanel && <span className="size-1.5 rounded-pill bg-amber-primary" />}
  </div>
</div>
{!isTopPanel && (
  <div className="mt-1 flex justify-between text-text-muted">
    {visibleTicks.map((tick) => (
      <span
        key={tick.label}
        className={[
          'text-label-xs-medium',
          tick.label === activeTick.label ? 'text-amber-dark' : 'text-tab-inactive',
        ].join(' ')}
      >
        {tick.label}
      </span>
    ))}
  </div>
)}
```

Keep existing `onPointerDown`, `onPointerUp`, `onPointerCancel`, keyboard, min-floor, and snap logic unchanged.

- [ ] **Step 4: Run focused TimeSlider tests and verify they pass**

Run from `nextjs-app/`:

```powershell
npx vitest run test/components/TimeSlider.test.tsx
```

Expected: PASS. The existing standard slider test still proves non-top-panel ticks and `size-slider-thumb` behavior; the new top-panel test proves the mobile visual geometry contract.

### Task 2: TimeSliderPanel Date Trigger And Focus Restoration

**Files:**
- Modify: `nextjs-app/components/custom/time/TimeSliderPanel.tsx:1-232`
- Modify: `nextjs-app/test/components/TimeSliderPanel.test.tsx:1-124`

**Interfaces:**
- Consumes: `TimeContext` values `selectedDate`, `currentTime`, `selectedMinutes`, `minMinutes`, `selectDate`, `shiftSelectedDate`, `setSelectedMinutes`, `snapSelectedMinutes`, `ticks`, existing `DatePickerDialog`.
- Produces: Mobile `planner-date-trigger` button with Calendar icon plus `planner-date-label`, no mobile `planner-date-next`, live `aria-expanded`, `aria-haspopup="dialog"`, tokenized states, and focus restoration after every close path. Desktop `planner-date-next` remains unchanged.

- [ ] **Step 1: Write failing TimeSliderPanel component tests**

Update imports in `nextjs-app/test/components/TimeSliderPanel.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
```

Add this geometry helper near `forcedDateWrapper`:

```tsx
function withPanelRect(height: number, run: () => void) {
  const original = HTMLElement.prototype.getBoundingClientRect;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
  HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
    if ((this as HTMLElement).getAttribute('data-testid') === 'time-slider-panel') {
      return DOMRect.fromRect({ x: 16, y: 72, width: 358, height });
    }
    return original.call(this);
  };
  try {
    run();
  } finally {
    HTMLElement.prototype.getBoundingClientRect = original;
  }
}
```

Replace the current mobile planner test with:

```tsx
it('renders mobile planner as <=72px slider/date chrome with one calendar trigger and no next-day shortcut', () => {
  withPanelRect(70, () => {
    render(<TimeSliderPanel variant="mobile" />, { wrapper: Wrapper });

    const panel = screen.getByTestId('time-slider-panel');
    const trigger = screen.getByTestId('planner-date-trigger');
    const panelBox = panel.getBoundingClientRect();

    expect(panel).toHaveClass('bg-glass-slider', 'rounded-panel', 'py-3', 'shadow-card-up');
    expect(panel).not.toHaveClass('pt-3', 'pb-2', 'pt-5');
    expect(panelBox.height).toBeGreaterThanOrEqual(68);
    expect(panelBox.height).toBeLessThanOrEqual(72);
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveClass(
      'min-h-11',
      'border',
      'border-divider',
      'bg-surface-cream/70',
      'shadow-subtle',
      'hover:bg-surface-sand',
      'active:bg-amber-pale/40',
      'focus-visible:ring-2',
      'focus-visible:ring-text-primary',
    );
    expect(within(trigger).getByTestId('planner-date-label')).toHaveTextContent('Idag');
    expect(trigger.querySelectorAll('svg')).toHaveLength(1);
    expect(screen.queryByTestId('planner-date-next')).not.toBeInTheDocument();
    expect(screen.queryByText(/Säsongskortet|Swish|Premium/i)).not.toBeInTheDocument();
  });
});
```

Add close-path focus restoration tests:

```tsx
async function openCalendar() {
  const trigger = screen.getByTestId('planner-date-trigger');
  trigger.focus();
  fireEvent.click(trigger);
  await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));
  expect(screen.getByRole('dialog', { name: 'Välj datum' })).toBeInTheDocument();
  return trigger;
}

it('restores focus to the mobile date trigger after selecting a date', async () => {
  render(<TimeSliderPanel variant="mobile" />, { wrapper: Wrapper });
  const trigger = await openCalendar();

  fireEvent.click(screen.getByRole('button', { name: 'Välj 21 maj 2026' }));

  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Välj datum' })).not.toBeInTheDocument());
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

it('restores focus to the mobile date trigger after Escape, close button, and backdrop close', async () => {
  render(<TimeSliderPanel variant="mobile" />, { wrapper: Wrapper });

  let trigger = await openCalendar();
  fireEvent.keyDown(screen.getByRole('dialog', { name: 'Välj datum' }), { key: 'Escape' });
  await waitFor(() => expect(trigger).toHaveFocus());

  trigger = await openCalendar();
  fireEvent.click(screen.getByRole('button', { name: 'Stäng kalender' }));
  await waitFor(() => expect(trigger).toHaveFocus());

  trigger = await openCalendar();
  const dialog = screen.getByRole('dialog', { name: 'Välj datum' });
  fireEvent.pointerDown(dialog.parentElement as HTMLElement);
  await waitFor(() => expect(trigger).toHaveFocus());
});
```

Replace the mobile next-day boundary tests with desktop-only assertions:

```tsx
describe('desktop planner-date-next window boundary remains unchanged', () => {
  it('stays ENABLED from today on desktop', () => {
    render(<TimeSliderPanel variant="desktop" />, { wrapper: Wrapper });
    const nextDay = screen.getByTestId('planner-date-next');
    expect(nextDay).toBeEnabled();
    expect(nextDay).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('is DISABLED + aria-disabled at the today+3 window end on desktop', () => {
    const windowEnd = addDaysToDateKey(stockholmDateKey(new Date(FIXED_NOW)), 3);
    render(<TimeSliderPanel variant="desktop" />, { wrapper: forcedDateWrapper(windowEnd) });
    const nextDay = screen.getByTestId('planner-date-next');
    expect(nextDay).toBeDisabled();
    expect(nextDay).toHaveAttribute('aria-disabled', 'true');
  });
});
```

- [ ] **Step 2: Run focused TimeSliderPanel tests and verify they fail**

Run from `nextjs-app/`:

```powershell
npx vitest run test/components/TimeSliderPanel.test.tsx
```

Expected: FAIL because `planner-date-trigger` does not exist, the mobile branch still renders `planner-date-next`, `CalendarButton` lacks `aria-haspopup`/`aria-expanded`, focus is not restored to the trigger, and the mobile panel still uses `pt-3 pb-2` instead of `py-3`.

- [ ] **Step 3: Implement trigger-owned focus restoration and mobile layout**

In `nextjs-app/components/custom/time/TimeSliderPanel.tsx`, update imports:

```tsx
import { useCallback, useRef, useState, type Ref } from 'react';
```

Remove `showDateLabel` from `TimeSliderPanelProps` and from the function parameters. Add the trigger ref and close handler:

```tsx
const [calendarOpen, setCalendarOpen] = useState(false);
const calendarTriggerRef = useRef<HTMLButtonElement>(null);
const handleCalendarOpenChange = useCallback((open: boolean) => {
  setCalendarOpen(open);
  if (!open) {
    window.requestAnimationFrame(() => {
      calendarTriggerRef.current?.focus();
    });
  }
}, []);
```

Change the mobile panel class and mobile branch:

```tsx
className={cn(
  'z-glass-panel bg-glass-slider text-text-primary backdrop-blur-heavy',
  desktop
    ? 'hidden rounded-panel px-6 py-3 shadow-card-up lg:flex lg:items-center lg:gap-5'
    : 'rounded-panel px-4 py-3 shadow-card-up lg:hidden',
  className,
)}
```

```tsx
) : (
  <div className="flex items-center gap-2">
    <TimeSlider
      ariaLabel={t('sliderLabel')}
      selectedMinutes={time.selectedMinutes}
      minMinutes={time.minMinutes}
      ticks={time.ticks}
      onMinutesChange={time.setSelectedMinutes}
      onSnap={time.snapSelectedMinutes}
      reducedMotion={shouldReduceMotion}
      variant="topPanel"
      className="min-w-0 flex-1"
    />
    <CalendarButton
      ref={calendarTriggerRef}
      label={t('openCalendar')}
      dateLabel={dateLabel}
      onClick={() => setCalendarOpen(true)}
      compact
      open={calendarOpen}
    />
  </div>
)}
```

Change dialog wiring:

```tsx
<DatePickerDialog
  open={calendarOpen}
  ...
  onOpenChange={handleCalendarOpenChange}
  onSelectDate={time.selectDate}
/>
```

Change `CalendarButton`:

```tsx
function CalendarButton({
  ref,
  label,
  dateLabel,
  onClick,
  layoutPart,
  compact = false,
  open = false,
}: {
  ref?: Ref<HTMLButtonElement>;
  label: string;
  dateLabel: string;
  onClick: () => void;
  layoutPart?: string;
  compact?: boolean;
  open?: boolean;
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={`${label}: ${dateLabel}`}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onClick}
      data-testid="planner-date-trigger"
      data-planner-layout-part={layoutPart}
      className={cn(
        'flex min-h-11 items-center justify-center rounded-pill text-amber-dark outline-none transition-colors duration-fast ease-default focus-visible:ring-2 focus-visible:ring-text-primary',
        compact
          ? 'min-w-11 shrink-0 gap-1.5 border border-divider bg-surface-cream/70 px-3 shadow-subtle hover:bg-surface-sand active:bg-amber-pale/40'
          : 'min-w-32 gap-2 bg-surface-cream/70 px-3 shadow-subtle hover:bg-surface-sand active:bg-amber-pale/40',
      )}
    >
      <Calendar aria-hidden="true" className="size-4 shrink-0 text-amber-dark" />
      <span
        data-testid="planner-date-label"
        className={cn('max-w-28 truncate text-date text-text-body', compact && 'max-w-20')}
      >
        {dateLabel}
      </span>
    </button>
  );
}
```

Do not alter `NextDayButton`; leave its `planner-date-next` test id and disabled semantics intact for desktop.

- [ ] **Step 4: Run focused component tests and verify they pass**

Run from `nextjs-app/`:

```powershell
npx vitest run test/components/TimeSlider.test.tsx test/components/TimeSliderPanel.test.tsx test/components/DatePickerDialog.test.tsx test/components/DatePickerDialog.today-window.atdd.test.tsx
```

Expected: PASS. `DatePickerDialog` tests should stay unchanged and green, proving dialog keyboard/selectability behavior was not weakened.

### Task 3: Request-Count E2E Calendar Migration

**Files:**
- Create: `nextjs-app/test/unit/story-12-9-slider-date-refinement-source-contract.test.ts`
- Modify: `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts:1-231`
- Modify: `nextjs-app/test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts:1-152`

**Interfaces:**
- Consumes: new visible `planner-date-trigger`, existing `DatePickerDialog` button labels generated by `selectDate: 'Välj {date}'`, existing helper-compatible `stockholmDateKey` and `addDaysToDateKey` implementations in the E2E files.
- Produces: Request-count specs that open the calendar and select tomorrow instead of clicking `planner-date-next`, while preserving exactly-one date-change request, zero-extra same-date scrub request, marker persistence, overlay, and no provider fanout.

- [ ] **Step 1: Write the failing source contract**

Create `nextjs-app/test/unit/story-12-9-slider-date-refinement-source-contract.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const appRoot = process.cwd();
const repoRoot = join(appRoot, '..');

function readApp(relativePath: string): string {
  return readFileSync(join(appRoot, relativePath), 'utf8');
}

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

describe('Story 12.9 slider/date refinement source contract', () => {
  it('keeps request-count E2E specs off the removed mobile planner-date-next shortcut', () => {
    for (const file of [
      'test/e2e/epic-11-scrub-zero-fetch.spec.ts',
      'test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts',
    ]) {
      const source = readApp(file);
      expect(source, file).not.toContain('planner-date-next');
      expect(source, file).toContain('planner-date-trigger');
      expect(source, file).toContain('selectDifferentDateFromCalendar');
    }
  });

  it('does not absorb the inherited Story 12.4 OnboardingGate hydration work', () => {
    const story = readRepo('_bmad-output/implementation-artifacts/12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider.md');
    expect(story).toContain('OnboardingGate hydration pageError remains deferred to Story 12.4');
  });
});
```

- [ ] **Step 2: Run the source contract and verify it fails**

Run from `nextjs-app/`:

```powershell
npx vitest run test/unit/story-12-9-slider-date-refinement-source-contract.test.ts
```

Expected: FAIL because both request-count specs still contain `planner-date-next` and do not yet contain `planner-date-trigger` or `selectDifferentDateFromCalendar`.

- [ ] **Step 3: Add calendar-selection helper to `epic-11-scrub-zero-fetch.spec.ts`**

In `nextjs-app/test/e2e/epic-11-scrub-zero-fetch.spec.ts`, keep existing `stockholmDateKey` logic by adding these helpers near the existing test helpers:

```ts
function stockholmDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const [year = '1970', month = '01', day = '01'] = dateKey.split('-');
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function swedishSelectDateLabel(dateKey: string): string {
  const [year = '1970', month = '01', day = '01'] = dateKey.split('-');
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const label = new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  return `Välj ${label}`;
}

async function selectDifferentDateFromCalendar(page: Page): Promise<string> {
  const targetDate = addDaysToDateKey(stockholmDateKey(), 1);
  const planner = page.locator('[data-testid="time-slider-panel"]:visible').first();
  const trigger = planner.getByTestId('planner-date-trigger');
  await expect(trigger).toBeVisible({ timeout: APP_SETTLE_TIMEOUT_MS });
  await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: swedishSelectDateLabel(targetDate) }).click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  return targetDate;
}
```

Replace the date-change click:

```ts
const expectedDate = await selectDifferentDateFromCalendar(page);
expect(expectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
```

Keep the overlay, marker persistence, `venues.count() === afterLoad + 1`, and `metnoHits` assertions exactly as they are.

- [ ] **Step 4: Add the same helper to `story-12-3-persisted-geometry-request-count.atdd.spec.ts`**

Use the same helper code, but keep the existing `forbidProviderFanout` guard. Replace:

```ts
await page.getByTestId('planner-date-next').filter({ visible: true }).click();
```

with:

```ts
const expectedDate = await selectDifferentDateFromCalendar(page);
expect(expectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
```

Keep `expect(venues.count()).toBe(afterLoad + 1)` and `expect(providerHits).toEqual([])` unchanged.

- [ ] **Step 5: Run focused request-count tests**

Run from `nextjs-app/`:

```powershell
npx vitest run test/unit/story-12-9-slider-date-refinement-source-contract.test.ts
npx playwright test test/e2e/epic-11-scrub-zero-fetch.spec.ts --project=mobile --project=desktop
npx playwright test test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts --project=mobile --project=desktop
```

Expected: source contract PASS; both Playwright specs PASS on mobile and desktop. The same-date scrub tests must keep `venues.count() === afterLoad`; date-change tests must keep `venues.count() === afterLoad + 1`; Met.no/provider hit arrays must remain empty.

### Task 4: Browser Geometry And Row-Sheet Regression Assertions

**Files:**
- Modify: `nextjs-app/test/e2e/map-primary.spec.ts:90-690`
- Read only: `nextjs-app/test/e2e/epic-11-sheet-touch-gestures.spec.ts`
- Read only: `nextjs-app/components/custom/sheets/MobileBottomSheet.tsx`

**Interfaces:**
- Consumes: `visiblePlanner(page)`, `visibleTestId(page, testId)`, `expectSheetRowsClamped(page, requestedRows)`, `getSheetRows(page)`, `getSheetMaxRows(page)`, row-sheet test ids and attributes.
- Produces: Deterministic browser assertions for 390x844 planner geometry, one mobile date trigger, no mobile next-day shortcut, `N=3` whole rows, `N=max` map controls hidden/inert, and mid-drag partial next row. Row-sheet production behavior remains unchanged.

- [ ] **Step 1: Add browser geometry helpers to `map-primary.spec.ts`**

Add these helpers after `expectSheetRowsClamped`:

```ts
async function visibleVenueRowCounts(page: Page): Promise<{
  fullyVisible: number;
  partiallyVisible: number;
}> {
  const scrollBody = page.locator('[data-bottom-sheet-scroll-body="true"]').first();
  const bodyBox = await scrollBody.boundingBox();
  expect(bodyBox).not.toBeNull();
  if (!bodyBox) return { fullyVisible: 0, partiallyVisible: 0 };

  return page.locator('[data-testid="venue-card"]').evaluateAll((nodes, box) => {
    const bodyTop = box.y;
    const bodyBottom = box.y + box.height;
    let fullyVisible = 0;
    let partiallyVisible = 0;
    for (const node of nodes) {
      const element = node as HTMLElement;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const visible =
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        rect.width > 0 &&
        rect.height > 0;
      const overlaps = visible && rect.bottom > bodyTop + 1 && rect.top < bodyBottom - 1;
      const fully = visible && rect.top >= bodyTop - 1 && rect.bottom <= bodyBottom + 1;
      if (overlaps) partiallyVisible += 1;
      if (fully) fullyVisible += 1;
    }
    return { fullyVisible, partiallyVisible };
  }, bodyBox);
}
```

- [ ] **Step 2: Write failing mobile planner browser geometry test**

Add this mobile-only test near the existing mobile planner tests:

```ts
test('mobile: planner chrome meets the 12.9 slider/date geometry contract at 390x844', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'mobile',
    'Mobile planner geometry runs only in the mobile Playwright project',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await bypassOnboarding(page);
  await page.goto('/?_state=map-primary&_time=14:00');
  await page.waitForSelector('[data-testid="venue-pin"]', { timeout: APP_SETTLE_TIMEOUT_MS });

  const planner = await expectFreePlannerChrome(page);
  const panelBox = await planner.boundingBox();
  expect(panelBox).not.toBeNull();
  if (!panelBox) return;
  expect(panelBox.height).toBeGreaterThanOrEqual(68);
  expect(panelBox.height).toBeLessThanOrEqual(72);

  const trackBox = await planner.getByTestId('time-slider-track').boundingBox();
  const thumbBox = await planner.getByTestId('time-slider-thumb').boundingBox();
  const badgeBox = await planner.getByTestId('time-slider-value-badge').boundingBox();
  const hitBox = await planner.getByRole('slider', { name: 'Välj tid' }).boundingBox();
  const trigger = planner.getByTestId('planner-date-trigger');
  const triggerBox = await trigger.boundingBox();
  expect(trackBox).not.toBeNull();
  expect(thumbBox).not.toBeNull();
  expect(badgeBox).not.toBeNull();
  expect(hitBox).not.toBeNull();
  expect(triggerBox).not.toBeNull();
  if (!trackBox || !thumbBox || !badgeBox || !hitBox || !triggerBox) return;

  expect(trackBox.height).toBeCloseTo(6, 0);
  expect(thumbBox.width).toBeCloseTo(14.1, 0);
  expect(thumbBox.height).toBeCloseTo(14.1, 0);
  expect(hitBox.width).toBeGreaterThanOrEqual(44);
  expect(hitBox.height).toBeGreaterThanOrEqual(44);
  expect(badgeBox.y + badgeBox.height).toBeLessThan(thumbBox.y);
  expect(thumbBox.y - (badgeBox.y + badgeBox.height)).toBeGreaterThanOrEqual(4);
  expect(triggerBox.width).toBeGreaterThanOrEqual(44);
  expect(triggerBox.height).toBeGreaterThanOrEqual(44);
  await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(await trigger.locator('svg').count()).toBe(1);
  await expect(planner.getByTestId('planner-date-next')).toHaveCount(0);
});
```

- [ ] **Step 3: Write row-sheet browser regression assertions**

Keep the existing `mobile: max-row venue panel removes sheet-covered zoom controls from interaction` test, because it already asserts `data-mobile-sheet-overlap="true"`, `aria-hidden="true"`, `inert`, and opacity `0`.

Add these tests near the existing row-sheet mobile tests:

```ts
test('mobile: forced N=3 venue panel shows exactly three complete rows at rest', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Row-sheet geometry runs only on mobile');

  await page.setViewportSize({ width: 390, height: 844 });
  await bypassOnboarding(page);
  await page.goto('/?_state=map-panel-venues&_time=14:00&_sheetRows=3');
  const resolvedRows = await expectSheetRowsClamped(page, 3);
  expect(resolvedRows).toBe(3);

  const counts = await visibleVenueRowCounts(page);
  expect(counts.fullyVisible).toBe(3);
  expect(counts.partiallyVisible).toBe(3);
});

test('mobile: forced mid-drag venue panel keeps three full rows plus a partial next row', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mid-drag geometry runs only on mobile');

  await page.setViewportSize({ width: 390, height: 844 });
  await bypassOnboarding(page);
  await page.goto('/?_state=map-panel-venues&_time=14:00&_sheetDrag=mid');
  const sheet = page.getByTestId('mobile-bottom-sheet');
  await expect(sheet).toHaveAttribute('data-visible-rows', '3', { timeout: APP_SETTLE_TIMEOUT_MS });
  await expect(sheet).toHaveAttribute('data-dragging', 'true');

  const counts = await visibleVenueRowCounts(page);
  expect(counts.fullyVisible).toBeGreaterThanOrEqual(3);
  expect(counts.partiallyVisible).toBeGreaterThan(3);
});
```

- [ ] **Step 4: Run browser geometry tests and verify initial failures**

Run from `nextjs-app/` after writing tests but before Tasks 1-2 implementation if executing strictly test-first:

```powershell
npx playwright test test/e2e/map-primary.spec.ts --project=mobile --grep "planner chrome meets|forced N=3|forced mid-drag|max-row venue panel"
```

Expected before implementation: planner geometry test FAILS with current measured mobile panel around 83px, `size-6` thumb around 24px, and visible `planner-date-next`. Row-sheet tests should PASS; if they fail, stop because this refinement must not rewrite row-sheet behavior.

- [ ] **Step 5: Run browser geometry tests after Tasks 1-2**

Run from `nextjs-app/`:

```powershell
npx playwright test test/e2e/map-primary.spec.ts --project=mobile --grep "planner chrome meets|forced N=3|forced mid-drag|max-row venue panel"
```

Expected: PASS. Planner panel measures 68-72px at 390x844; row-sheet `N=3`, `N=max`, and mid-drag assertions remain green.

### Task 5: Candidate Visual Evidence

**Files:**
- Create: `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/capture-story-12-9-slider-date-candidates.mjs`
- Create: `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/evidence.md`
- Create on capture: `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/mobile-map-primary-slim-slider-date-pill.png`
- Create on capture: `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/mobile-map-panel-venues-rows-3.png`
- Create on capture: `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/mobile-map-panel-venues-rows-max.png`
- Create on capture: `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/mobile-map-panel-venues-mid-drag.png`

**Interfaces:**
- Consumes: existing Story 12.9 candidate-capture script shape, dev-only routes `/?_state=map-primary&_time=14:00`, `/?_state=map-panel-venues&_time=14:00&_sheetRows=3`, `&_sheetRows=max`, and `&_sheetDrag=mid`.
- Produces: Non-authoritative evidence Markdown with inline images, tightened planner/date assertions, row-sheet evidence for required variants, and no canonical reference promotion.

- [ ] **Step 1: Create the candidate capture helper from the existing script**

Create the new directory:

```powershell
New-Item -ItemType Directory -Force '_bmad-output\implementation-artifacts\validation\story-12-9-slider-date-candidates\20260724-slider-date-refinement'
```

Copy the existing script as a starting point:

```powershell
Copy-Item '_bmad-output\implementation-artifacts\validation\story-12-9-row-sheet-candidates\20260720-151908\capture-story-12-9-candidates.mjs' '_bmad-output\implementation-artifacts\validation\story-12-9-slider-date-candidates\20260724-slider-date-refinement\capture-story-12-9-slider-date-candidates.mjs'
```

- [ ] **Step 2: Tighten targets to the refinement evidence set**

In the new script, set:

```js
const defaultOutDir = path.join(
  repoRoot,
  '_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement',
);
```

Replace `targets` with:

```js
const targets = [
  {
    viewport: 'mobile',
    screenId: 'map-primary',
    variant: 'slim-slider-date-pill',
    route: '/?_state=map-primary&_time=14:00',
    reference: 'mobile/map-primary.png',
    expectedRows: 0,
    expectedDragging: false,
    assertions: ['map', 'pins', 'mobileSheet', 'planner', 'dateTrigger', 'sliderGeometry', 'mapControls', 'bodyHidden', 'chromeHidden'],
  },
  {
    viewport: 'mobile',
    screenId: 'map-panel-venues',
    variant: 'rows-3',
    route: '/?_state=map-panel-venues&_time=14:00&_sheetRows=3',
    reference: 'mobile/map-panel-venues.png',
    expectedRows: 3,
    expectedDragging: false,
    assertions: ['map', 'pins', 'mobileSheet', 'planner', 'dateTrigger', 'sliderGeometry', 'mapControls', 'bodyShown', 'chromeShown', 'venueCards'],
  },
  {
    viewport: 'mobile',
    screenId: 'map-panel-venues',
    variant: 'rows-max',
    route: '/?_state=map-panel-venues&_time=14:00&_sheetRows=max',
    reference: 'mobile/map-panel-venues.png',
    expectedRows: 'max',
    expectedDragging: false,
    assertions: ['map', 'pins', 'mobileSheet', 'planner', 'dateTrigger', 'sliderGeometry', 'mapControls', 'bodyShown', 'chromeShown', 'venueCards'],
  },
  {
    viewport: 'mobile',
    screenId: 'map-panel-venues',
    variant: 'mid-drag',
    route: '/?_state=map-panel-venues&_time=14:00&_sheetDrag=mid',
    reference: 'mobile/map-panel-venues.png',
    expectedRows: 3,
    expectedDragging: true,
    assertions: ['map', 'pins', 'mobileSheet', 'planner', 'dateTrigger', 'sliderGeometry', 'mapControls', 'bodyShown', 'chromeShown', 'venueCards'],
  },
];
```

- [ ] **Step 3: Tighten planner/date assertions**

In `runAssertions`, replace the current mobile planner height threshold with 68-72 and add date/slider assertions:

```js
if (target.assertions.includes('planner')) {
  await add('planner visible and sized', async () => {
    const panel = page.locator('[data-testid="time-slider-panel"]:visible').first();
    const box = await visibleBox(panel);
    const classes = await panel.getAttribute('class');
    const slider = panel.getByRole('slider', { name: 'Välj tid' });
    await slider.waitFor({ state: 'visible', timeout: 10_000 });
    if (target.viewport === 'mobile' && (box.height < 68 || box.height > 72)) {
      throw new Error(`expected mobile planner height 68-72px, saw ${box.height}`);
    }
    return { box, className: classes };
  });
}
if (target.assertions.includes('dateTrigger')) {
  await add('mobile date trigger', async () => {
    const panel = page.locator('[data-testid="time-slider-panel"]:visible').first();
    const trigger = panel.locator('[data-testid="planner-date-trigger"]').first();
    const box = await visibleBox(trigger);
    const svgCount = await trigger.locator('svg').count();
    const nextVisible = await panel.locator('[data-testid="planner-date-next"]:visible').count();
    const dateText = await trigger.locator('[data-testid="planner-date-label"]').innerText();
    if (box.width < 44 || box.height < 44) {
      throw new Error(`expected date trigger >=44x44, saw ${JSON.stringify(box)}`);
    }
    if (svgCount !== 1) throw new Error(`expected exactly one Calendar icon svg, saw ${svgCount}`);
    if (nextVisible !== 0) throw new Error(`expected no visible mobile planner-date-next, saw ${nextVisible}`);
    const hasPopup = await trigger.getAttribute('aria-haspopup');
    const expanded = await trigger.getAttribute('aria-expanded');
    if (hasPopup !== 'dialog') throw new Error(`expected aria-haspopup=dialog, saw ${hasPopup}`);
    if (expanded !== 'false') throw new Error(`expected aria-expanded=false at rest, saw ${expanded}`);
    return { box, svgCount, nextVisible, dateText, ariaHaspopup: hasPopup, ariaExpanded: expanded };
  });
}
if (target.assertions.includes('sliderGeometry')) {
  await add('mobile slider geometry', async () => {
    const panel = page.locator('[data-testid="time-slider-panel"]:visible').first();
    const track = await panel.locator('[data-testid="time-slider-track"]').first().boundingBox();
    const thumb = await panel.locator('[data-testid="time-slider-thumb"]').first().boundingBox();
    const badge = await panel.locator('[data-testid="time-slider-value-badge"]').first().boundingBox();
    const hit = await panel.getByRole('slider', { name: 'Välj tid' }).boundingBox();
    if (!track || !thumb || !badge || !hit) throw new Error('missing slider geometry box');
    if (Math.abs(track.height - 6) > 1) throw new Error(`expected 6px track, saw ${track.height}`);
    if (Math.abs(thumb.width - 14.1) > 2 || Math.abs(thumb.height - 14.1) > 2) {
      throw new Error(`expected size-slider-thumb visual thumb, saw ${thumb.width}x${thumb.height}`);
    }
    if (hit.width < 44 || hit.height < 44) throw new Error(`expected >=44px hit target, saw ${hit.width}x${hit.height}`);
    const clearance = thumb.y - (badge.y + badge.height);
    if (clearance < 4) throw new Error(`expected badge.bottom < thumb.top with >=4px gap, saw ${clearance}`);
    return { track, thumb, badge, hit, clearance };
  });
}
```

- [ ] **Step 4: Embed inline images in `evidence.md`**

In `writeManifest`, add one image embed to each per-target section:

```js
const imageMarkdown = result.fileName
  ? `\n![${result.viewport} ${result.screenId} ${result.variant}](${result.fileName})\n`
  : '';
return `### ${result.viewport}/${result.screenId}/${result.variant}
${imageMarkdown}
- Route: \`${result.route}\`
- URL: \`${result.url}\`
- Candidate: \`${result.fileName}\`
...
`;
```

Keep `Canonical refs promoted: 0` in the result block. Do not copy any PNG into `nextjs-app/docs/design/references/screens/**` in this task.

- [ ] **Step 5: Run the capture helper**

Run from the repository root:

```powershell
node '_bmad-output\implementation-artifacts\validation\story-12-9-slider-date-candidates\20260724-slider-date-refinement\capture-story-12-9-slider-date-candidates.mjs'
```

Expected: `Captured 4, failed 0` and an evidence file at `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/evidence.md`. The Markdown must contain inline image embeds for all four PNGs. If the desktop OnboardingGate hydration pageError appears during an optional desktop sanity capture, record it as inherited Story 12.4 scope and do not edit `OnboardingGate.tsx`.

### Task 6: Full Verification, Human Visual Gate, And Review Transition

**Files:**
- Read/verify: all files changed by Tasks 1-5
- Conditional after explicit human approval only: `nextjs-app/docs/design/references/screens/mobile/map-panel-venues.png`
- Conditional after explicit human approval only: `nextjs-app/docs/design/references/screens/mobile/map-primary.png` if Rasmus approves the slim top chrome reference update
- Conditional after explicit human approval only: `nextjs-app/docs/design/references/REBASELINE-LOG.md`
- Do not modify: `_bmad-output/implementation-artifacts/sprint-status.yaml`

**Interfaces:**
- Consumes: component tests, E2E tests, touch project, axe projects, candidate evidence, visual validation wrapper.
- Produces: Verified implementation ready for human visual approval. `story-review.sh` runs only after human visual approval/rebaseline is complete.

- [ ] **Step 1: Run focused component/unit checks**

Run from `nextjs-app/`:

```powershell
npx vitest run test/components/TimeSlider.test.tsx test/components/TimeSliderPanel.test.tsx test/components/DatePickerDialog.test.tsx test/components/DatePickerDialog.today-window.atdd.test.tsx test/unit/story-12-9-slider-date-refinement-source-contract.test.ts
```

Expected: PASS. Failures in `DatePickerDialog` mean the trigger-owned focus restoration accidentally changed dialog behavior and must be corrected without weakening date disabled semantics.

- [ ] **Step 2: Run focused Playwright checks**

Run from `nextjs-app/`:

```powershell
npx playwright test test/e2e/map-primary.spec.ts --project=mobile --project=desktop
npx playwright test test/e2e/epic-11-scrub-zero-fetch.spec.ts --project=mobile --project=desktop
npx playwright test test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts --project=mobile --project=desktop
npx playwright test test/e2e/epic-11-slider-touch-drag.spec.ts --project=touch
npx playwright test test/e2e/epic-11-sheet-touch-gestures.spec.ts --project=touch
npx playwright test test/e2e/axe.spec.ts --project=a11y
npx playwright test test/e2e/axe-mobile.spec.ts --project=a11y-mobile
```

Expected: PASS. The request-count specs must report zero extra venue requests for same-date scrubs and exactly one new venue request for date selection. The touch specs must remain green because the visible thumb changed size but the native input hit target remains at least 44x44. Row-sheet touch behavior must stay unchanged.

- [ ] **Step 3: Run repository-required full checks**

Run from `nextjs-app/`:

```powershell
npx tsc --noEmit
npx eslint . --quiet
$env:VITEST_MAX_WORKERS='4'; npx vitest run
```

Expected: PASS. If `npx eslint . --quiet` reports warnings only, that still exits zero; any error must be fixed without `eslint-disable`, `@ts-ignore`, ignore globs, or unrelated shims.

- [ ] **Step 4: Present candidate evidence for human approval**

Provide Rasmus the evidence path:

```text
_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/evidence.md
```

Expected evidence contents:

```md
![mobile map-primary slim-slider-date-pill](mobile-map-primary-slim-slider-date-pill.png)
![mobile map-panel-venues rows-3](mobile-map-panel-venues-rows-3.png)
![mobile map-panel-venues rows-max](mobile-map-panel-venues-rows-max.png)
![mobile map-panel-venues mid-drag](mobile-map-panel-venues-mid-drag.png)
```

No canonical PNG is promoted before Rasmus approves the candidate set. A short drag clip may be added beside this evidence only if the helper is deliberately extended, but the static `mid-drag` PNG remains mandatory and cannot be replaced by a clip.

- [ ] **Step 5: Rebaseline only after explicit human approval**

After explicit approval, promote only the approved PNGs. If Rasmus approves `map-panel-venues` only, update that PNG and one `REBASELINE-LOG.md` entry. If Rasmus also approves `map-primary` because the top chrome changed, update that PNG and include it in the same log entry.

The log entry must include:

```md
### 2026-07-24 - Story 12.9 slider/date refinement approved mobile references

**Trigger:** Mobile planner chrome was intentionally slimmed to 68-72 CSS px at 390x844, the top-panel thumb was changed to `size-slider-thumb`, and the mobile next-day shortcut was replaced with one Calendar+date trigger.

**Approval:** Rasmus explicitly approved the non-authoritative candidate set from `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/`.

**Promoted references:**
- `nextjs-app/docs/design/references/screens/mobile/map-panel-venues.png` from `mobile-map-panel-venues-rows-3.png`, when that candidate is explicitly approved.
- `nextjs-app/docs/design/references/screens/mobile/map-primary.png` from `mobile-map-primary-slim-slider-date-pill.png`, when that candidate is explicitly approved.

**Source of new PNG:** `_bmad-output/implementation-artifacts/validation/story-12-9-slider-date-candidates/20260724-slider-date-refinement/`.

**Verification:** Component, unit, Playwright mobile/desktop/touch/a11y/a11y-mobile, full typecheck/lint/Vitest, and visual validation after promotion.

**Reason / spec link:** `docs/superpowers/specs/2026-07-24-story-12-9-slider-date-refinement-design.md`.
```

Remove any bullet for a candidate that was not explicitly approved. Do not update the log if no canonical PNG is promoted.

- [ ] **Step 6: Run visual validation after approval/rebaseline**

Run from the repository root with the Windows wrapper:

```powershell
.\scripts\run-sh.ps1 scripts/visual-validate.sh map-panel-venues '/?_state=map-panel-venues&_time=14:00' mobile
```

Expected after approved rebaseline: PASS or a documented provider/tooling blocker. If the provider fails because of the known Windows `mktemp /tmp/impl-XXXXXX.png` issue, record the exact failure and use the documented manual path only if the environment explicitly allows it. Do not alter the visual validation shell scripts in this refinement.

- [ ] **Step 7: Run the canonical story review gate only after human visual approval**

Run from the repository root only after Steps 1-6 are complete:

```powershell
.\scripts\run-sh.ps1 scripts/story-review.sh 12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider
```

Expected: PASS and story transition through the canonical gate. If visual approval has not happened, do not run this command.

## Self-Review Checklist

- Spec coverage: covered by Tasks 1-2 for mobile panel height, track/thumb/hit target, badge/thumb lanes, mobile date trigger, no mobile next-day, aria semantics, focus restoration, desktop non-regression, and existing dialog semantics; Task 3 covers request-count migration and provider fanout; Task 4 covers deterministic browser geometry and row-sheet regression; Task 5 covers inline visual evidence; Task 6 covers full verification, human approval, rebaseline, and story gate sequencing.
- Scope guard: production edits are limited to `TimeSlider.tsx` and `TimeSliderPanel.tsx`; `DatePickerDialog.tsx` is not edited in the expected path; row-sheet, MapView, MapControls, OnboardingGate, API, Supabase, weather, solar, premium/payment, and BMAD state are out of scope.
- Red-flag scan: the plan contains no open-ended markers, vague test-writing steps, or unnamed paths.
- Type consistency: `planner-date-trigger`, `planner-date-label`, `time-slider-value-badge`, `time-slider-track`, `time-slider-thumb`, `planner-date-next`, `selectDifferentDateFromCalendar`, `swedishSelectDateLabel`, and `TimeSliderPanelProps` signatures are consistent across tasks.
- Execution choice: resolved to Auto-BMAD subagent-driven `ab-*` execution. Implementers do not run git; the root orchestrator owns the eventual story checkpoint commit after gates.
