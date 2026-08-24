'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { ChevronLeft, ChevronRight, Cloud, Sun, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  COACH_TOUR_ANCHOR_ATTRIBUTE,
  COACH_TOUR_STEP_ANCHORS,
  type CoachTourStepId,
} from '@/lib/constants/coach-tour';
import { DURATION_FAST_S, DURATION_SLOW_S, EASE_ENTER, EASE_EXIT } from '@/lib/constants/animation';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';
import {
  useFirstRunGuide,
  type FirstRunGuideLaunch,
  type FirstRunGuideSource,
} from '@/lib/contexts/FirstRunGuideContext';
import { trapFocus } from '@/lib/utils/focus-trap';
import { cn } from '@/lib/utils';

type CoachTourTranslationKey =
  | 'pinLegend'
  | 'timeSlider'
  | 'datePlanner'
  | 'tagChips'
  | 'venueList'
  | 'favourites';

export type CoachTourStep = {
  id: CoachTourStepId;
  anchor: string;
  translationKey: CoachTourTranslationKey;
};

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

type ActiveGuide = {
  id: number;
  source: FirstRunGuideSource;
  persistOnDismiss: boolean;
  restoreFocusElement: HTMLElement | null;
  restoreFocusFallback: (() => boolean) | null;
};

type CardPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: 'above' | 'below' | 'inline';
};

const COACH_TOUR_STEPS: readonly CoachTourStep[] = [
  {
    id: 'pin-legend',
    anchor: COACH_TOUR_STEP_ANCHORS['pin-legend'],
    translationKey: 'pinLegend',
  },
  {
    id: 'time-slider',
    anchor: COACH_TOUR_STEP_ANCHORS['time-slider'],
    translationKey: 'timeSlider',
  },
  {
    id: 'date-planner',
    anchor: COACH_TOUR_STEP_ANCHORS['date-planner'],
    translationKey: 'datePlanner',
  },
  {
    id: 'tags',
    anchor: COACH_TOUR_STEP_ANCHORS.tags,
    translationKey: 'tagChips',
  },
  {
    id: 'venue-list',
    anchor: COACH_TOUR_STEP_ANCHORS['venue-list'],
    translationKey: 'venueList',
  },
  {
    id: 'favourites',
    anchor: COACH_TOUR_STEP_ANCHORS.favourites,
    translationKey: 'favourites',
  },
] as const;

const TARGET_DESCRIPTION_ID = 'coach-tour-target-description';
const HEADING_ID = 'coach-tour-heading';
const AUTO_START_POLL_MS = 100;
const HIGHLIGHT_EXPAND_PX = 6;
const CARD_GUTTER_PX = 16;
const CARD_GAP_PX = 12;
const CARD_WIDTH_PX = 352;
const CARD_HEIGHT_ESTIMATE_PX = 360;
const CARD_MIN_HEIGHT_PX = 240;

export function getCoachTourSteps(): readonly CoachTourStep[] {
  return COACH_TOUR_STEPS;
}

export function hasVisibleTourTarget(element: Element | null): element is HTMLElement {
  if (typeof HTMLElement === 'undefined') return false;
  if (!(element instanceof HTMLElement)) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function resolveAvailableCoachStepIndex(
  steps: readonly CoachTourStep[],
  startIndex: number,
  direction: 1 | -1 = 1,
  root: Pick<Document, 'querySelectorAll'> = document,
): number | null {
  for (
    let index = startIndex;
    index >= 0 && index < steps.length;
    index += direction
  ) {
    const step = steps[index];
    if (findVisibleTourTarget(step.anchor, root)) return index;
  }
  return null;
}

export function resolveAvailableCoachStepIndexes(
  steps: readonly CoachTourStep[],
  root: Pick<Document, 'querySelectorAll'> = document,
): number[] {
  return steps.flatMap((step, index) =>
    findVisibleTourTarget(step.anchor, root) ? [index] : [],
  );
}

export function FirstRunCoachMarkGuide({
  forcedStepId = null,
  autoStartEnabled = true,
}: {
  forcedStepId?: CoachTourStepId | null;
  autoStartEnabled?: boolean;
}) {
  const t = useTranslations('map.coachTour');
  const shouldReduceMotion = useReducedMotion() ?? false;
  const {
    launch,
    startGuide,
    endGuide,
    hasSeenGuide,
    markGuideSeen,
  } = useFirstRunGuide();
  const [activeGuide, setActiveGuide] = useState<ActiveGuide | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const previousDescribedByRef = useRef<string | null>(null);
  const autoStartedRef = useRef(false);
  const lastForcedStepRef = useRef<CoachTourStepId | null>(null);

  useEffect(() => {
    if (!forcedStepId) {
      lastForcedStepRef.current = null;
      return;
    }
    if (lastForcedStepRef.current === forcedStepId) return;
    lastForcedStepRef.current = forcedStepId;
    startGuide({
      source: 'forced',
      initialStepId: forcedStepId,
      persistOnDismiss: false,
    });
  }, [forcedStepId, startGuide]);

  useEffect(() => {
    if (!autoStartEnabled || forcedStepId || activeGuide || launch || hasSeenGuide) {
      return undefined;
    }
    const tryStart = () => {
      if (autoStartedRef.current || hasSeenGuide) return true;
      if (!hasOnboarded() || isBlockingSurfaceOpen()) return false;
      const firstStepIndex = resolveAvailableCoachStepIndex(COACH_TOUR_STEPS, 0);
      if (firstStepIndex === null || COACH_TOUR_STEPS[firstStepIndex].id !== 'pin-legend') {
        return false;
      }
      autoStartedRef.current = true;
      startGuide({
        source: 'auto',
        initialStepId: 'pin-legend',
        persistOnDismiss: true,
        restoreFocusElement: findVisibleTourTarget(COACH_TOUR_STEP_ANCHORS['pin-legend']),
      });
      return true;
    };

    if (tryStart()) return undefined;
    const interval = window.setInterval(() => {
      if (tryStart()) {
        window.clearInterval(interval);
      }
    }, AUTO_START_POLL_MS);
    return () => window.clearInterval(interval);
  }, [
    activeGuide,
    autoStartEnabled,
    forcedStepId,
    hasSeenGuide,
    launch,
    startGuide,
  ]);

  useEffect(() => {
    if (!launch) return undefined;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      const startIndex = stepIndexForLaunch(launch);
      const index = resolveAvailableCoachStepIndex(COACH_TOUR_STEPS, startIndex);
      if (index === null) {
        endGuide();
        return;
      }
      setActiveGuide({
        id: launch.id,
        source: launch.source,
        persistOnDismiss: launch.persistOnDismiss,
        restoreFocusElement: launch.restoreFocusElement,
        restoreFocusFallback: launch.restoreFocusFallback,
      });
      setCurrentIndex(index);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [endGuide, launch]);

  const closeGuide = useCallback((writeSeen = true) => {
    const restoreFocusElement = activeGuide?.restoreFocusElement;
    const restoreFocusFallback = activeGuide?.restoreFocusFallback;
    if (activeGuide?.persistOnDismiss && writeSeen) {
      markGuideSeen();
    }
    setActiveGuide(null);
    setCurrentIndex(null);
    setTargetRect(null);
    endGuide();
    window.requestAnimationFrame(() => {
      if (activeGuide?.source === 'settings' && restoreFocusFallback?.()) return;
      if (restoreFocusElement?.isConnected) {
        restoreFocusElement.focus({ preventScroll: true });
        return;
      }
      if (restoreFocusFallback?.()) return;
      document
        .querySelector<HTMLElement>(tourAnchorSelector(COACH_TOUR_STEP_ANCHORS['pin-legend']))
        ?.focus({ preventScroll: true });
    });
  }, [activeGuide, endGuide, markGuideSeen]);

  useEffect(() => {
    if (!activeGuide?.persistOnDismiss) return;
    if (!hasSeenGuide) return;
    closeGuide(false);
  }, [activeGuide, closeGuide, hasSeenGuide]);

  useLayoutEffect(() => {
    if (!activeGuide || currentIndex === null) return undefined;
    let frame: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const step = COACH_TOUR_STEPS[currentIndex];

    const updateTarget = () => {
      const target = findVisibleTourTarget(step.anchor);
      if (!hasVisibleTourTarget(target)) {
        const nextIndex = resolveAvailableCoachStepIndex(COACH_TOUR_STEPS, currentIndex + 1);
        if (nextIndex !== null) {
          setCurrentIndex(nextIndex);
        } else {
          closeGuide(false);
        }
        return;
      }
      targetRef.current = target;
      setTargetRect(rectFromTarget(target));
    };

    updateTarget();
    const target = targetRef.current;
    if (target && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateTarget);
      resizeObserver.observe(target);
    }
    const onWindowChange = () => updateTarget();
    window.addEventListener('resize', onWindowChange);
    window.addEventListener('scroll', onWindowChange, true);
    frame = window.requestAnimationFrame(updateTarget);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', onWindowChange);
      window.removeEventListener('scroll', onWindowChange, true);
    };
  }, [activeGuide, closeGuide, currentIndex]);

  useEffect(() => {
    if (!activeGuide || currentIndex === null) return undefined;
    const step = COACH_TOUR_STEPS[currentIndex];
    const target = findVisibleTourTarget(step.anchor);
    if (!target) return undefined;
    targetRef.current = target;
    previousDescribedByRef.current = target.getAttribute('aria-describedby');
    const current = previousDescribedByRef.current;
    const values = current ? current.split(/\s+/u) : [];
    if (!values.includes(TARGET_DESCRIPTION_ID)) {
      target.setAttribute(
        'aria-describedby',
        [...values, TARGET_DESCRIPTION_ID].filter(Boolean).join(' '),
      );
    }
    return () => {
      const previous = previousDescribedByRef.current;
      if (previous) {
        target.setAttribute('aria-describedby', previous);
      } else {
        target.removeAttribute('aria-describedby');
      }
      previousDescribedByRef.current = null;
    };
  }, [activeGuide, currentIndex]);

  useEffect(() => {
    if (!activeGuide || currentIndex === null || !targetRect) return undefined;
    headingRef.current?.focus({ preventScroll: true });
    const frame = window.requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeGuide, currentIndex, targetRect]);

  useEffect(() => {
    if (!activeGuide || !targetRect) return undefined;
    return inertSiblingsWhileModal(overlayRef.current);
  }, [activeGuide, targetRect]);

  const activeIndex = currentIndex;
  const currentStep = activeIndex === null ? null : COACH_TOUR_STEPS[activeIndex];
  const availableStepIndexes = useMemo(
    () => (activeIndex === null ? [] : resolveAvailableCoachStepIndexes(COACH_TOUR_STEPS)),
    [activeIndex, targetRect],
  );
  const progressIndex =
    activeIndex === null ? -1 : availableStepIndexes.indexOf(activeIndex);
  const progressCurrent = progressIndex >= 0 ? progressIndex + 1 : 1;
  const progressTotal = Math.max(availableStepIndexes.length, progressCurrent);
  const cardPosition = useMemo(
    () => (targetRect ? resolveCardPosition(targetRect) : null),
    [targetRect],
  );

  const goToNext = () => {
    if (currentIndex === null) return;
    const nextIndex = resolveAvailableCoachStepIndex(COACH_TOUR_STEPS, currentIndex + 1);
    if (nextIndex === null) {
      closeGuide();
      return;
    }
    setCurrentIndex(nextIndex);
  };

  const goToPrevious = () => {
    if (currentIndex === null) return;
    const previousIndex = resolveAvailableCoachStepIndex(
      COACH_TOUR_STEPS,
      currentIndex - 1,
      -1,
    );
    if (previousIndex === null) return;
    setCurrentIndex(previousIndex);
  };

  const hasPrevious =
    activeIndex !== null &&
    resolveAvailableCoachStepIndex(COACH_TOUR_STEPS, activeIndex - 1, -1) !== null;
  const hasNext =
    activeIndex !== null &&
    resolveAvailableCoachStepIndex(COACH_TOUR_STEPS, activeIndex + 1) !== null;

  if (!activeGuide || activeIndex === null || !currentStep || !targetRect || !cardPosition) {
    return null;
  }

  const stepTitle = t(`steps.${currentStep.translationKey}.title`);
  const stepBody = t(`steps.${currentStep.translationKey}.body`);
  const stepTarget = t(`steps.${currentStep.translationKey}.target`);

  return (
    <AnimatePresence>
      <m.div
        ref={overlayRef}
        key={`coach-tour-${activeGuide.id}`}
        className="fixed inset-0 z-modal"
        data-testid="coach-tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : DURATION_FAST_S, ease: EASE_ENTER }}
      >
        <div className="absolute inset-0 bg-text-primary/30 backdrop-blur-standard" />
        <div
          aria-hidden="true"
          data-testid="coach-tour-highlight"
          className="pointer-events-none fixed rounded-panel border-2 border-amber-primary shadow-card"
          style={highlightStyle(targetRect)}
        />
        <m.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={HEADING_ID}
          data-testid="coach-tour-dialog"
          data-reduced-motion={String(shouldReduceMotion)}
          data-tour-source={activeGuide.source}
          data-tour-placement={cardPosition.placement}
          className="fixed overflow-y-auto rounded-panel bg-surface-cream p-5 text-text-primary shadow-card outline-none"
          style={cardStyle(cardPosition)}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: shouldReduceMotion ? 0 : DURATION_SLOW_S, ease: EASE_EXIT }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closeGuide();
            }
            if (event.key === 'Tab') {
              trapFocus(event, dialogRef.current);
            }
          }}
        >
          <div
            data-testid={`coach-tour-step-${currentStep.id}`}
            className="space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-label-md text-amber-dark">
                  {t('progress', {
                    current: progressCurrent,
                    total: progressTotal,
                  })}
                </p>
                <h2
                  ref={headingRef}
                  id={HEADING_ID}
                  tabIndex={-1}
                  className="mt-1 text-heading-sm text-text-primary outline-none"
                >
                  {stepTitle}
                </h2>
              </div>
              <button
                type="button"
                aria-label={t('close')}
                onClick={() => closeGuide()}
                className="flex size-11 shrink-0 items-center justify-center rounded-pill text-text-body outline-none transition-colors duration-fast ease-default hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-text-primary"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <p className="text-body-md text-text-body">{stepBody}</p>
            <p id={TARGET_DESCRIPTION_ID} className="sr-only">
              {t('targetDescription', { target: stepTarget })}
            </p>
            {currentStep.id === 'pin-legend' && <PinLegend />}
            <div
              data-testid="coach-tour-actions"
              className="flex flex-col gap-3 pt-1 desktop:gap-2"
            >
              <div data-testid="coach-tour-skip-row" className="flex w-full justify-center">
                <button
                  type="button"
                  data-testid="coach-tour-skip"
                  onClick={() => closeGuide()}
                  className="group inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill p-0 text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2"
                >
                  <span
                    data-testid="coach-tour-skip-pill"
                    className="inline-flex min-h-10 items-center justify-center rounded-pill border border-error/10 bg-error/5 px-3 text-label-md transition-colors duration-fast ease-default group-hover:border-error/20 group-hover:bg-error/10 desktop:min-h-11 desktop:px-4 desktop:text-label-lg"
                  >
                    {t('skip')}
                  </span>
                </button>
              </div>
              <div
                data-testid="coach-tour-navigation"
                className="flex w-full min-w-0 items-center justify-between gap-2"
              >
                <button
                  type="button"
                  disabled={!hasPrevious}
                  onClick={goToPrevious}
                  className={cn(
                    'flex min-h-11 items-center gap-1 rounded-pill px-3 text-label-lg outline-none transition-colors duration-fast ease-default focus-visible:ring-2 focus-visible:ring-text-primary',
                    hasPrevious
                      ? 'text-text-body hover:bg-surface-muted'
                      : 'cursor-not-allowed text-text-muted opacity-60',
                  )}
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                  {t('back')}
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="flex min-h-11 items-center gap-1 rounded-pill bg-action-progress px-4 text-label-lg text-surface-cream outline-none transition-colors duration-fast ease-default hover:bg-action-progress-hover focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2"
                >
                  {hasNext ? t('next') : t('done')}
                  <ChevronRight aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}

function PinLegend() {
  const t = useTranslations('map.coachTour.pinLegend');

  return (
    <div className="grid gap-2" data-testid="coach-tour-pin-legend">
      <LegendItem
        label={t('sunnyLabel')}
        description={t('sunnyDescription')}
        swatch={(
          <span className="flex flex-col items-center">
            <span className="flex h-[50px] w-11 flex-col items-center justify-center gap-0.5 rounded-pill border-[2.5px] border-white bg-amber-pin py-1 shadow-card">
              <span className="text-label-xs leading-none text-text-primary">95%</span>
              <Sun
                aria-hidden="true"
                data-pin-icon="sun"
                className="size-3.5 text-text-primary"
              />
            </span>
            <span
              data-pin-tail
              className="-mt-0.5 block h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-amber-pin shadow-subtle"
            />
          </span>
        )}
      />
      <LegendItem
        label={t('shadedLabel')}
        description={t('shadedDescription')}
        swatch={(
          <span className="flex flex-col items-center opacity-80">
            <span className="flex min-h-11 min-w-11 items-center justify-center rounded-pill border border-white/20 bg-pin-shaded px-4 py-2 shadow-subtle">
              <Cloud
                aria-hidden="true"
                data-pin-icon="cloud"
                className="text-text-body"
                style={{ width: '13px', height: '13px' }}
              />
            </span>
            <span
              data-pin-tail
              className="block h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-pin-shaded"
            />
          </span>
        )}
      />
    </div>
  );
}

function LegendItem({
  label,
  description,
  swatch,
}: {
  label: string;
  description: string;
  swatch: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface-muted p-3">
      <span aria-hidden="true" className="flex min-w-14 justify-center">
        {swatch}
      </span>
      <span className="min-w-0">
        <span className="block text-label-lg text-text-primary">{label}</span>
        <span className="block text-body-sm text-text-body">{description}</span>
      </span>
    </div>
  );
}

function stepIndexForLaunch(launch: FirstRunGuideLaunch): number {
  const index = COACH_TOUR_STEPS.findIndex((step) => step.id === launch.initialStepId);
  return index >= 0 ? index : 0;
}

function tourAnchorSelector(anchor: string): string {
  return `[${COACH_TOUR_ANCHOR_ATTRIBUTE}="${anchor}"]`;
}

function findVisibleTourTarget(
  anchor: string,
  root: Pick<Document, 'querySelectorAll'> = document,
): HTMLElement | null {
  const targets = Array.from(root.querySelectorAll<HTMLElement>(tourAnchorSelector(anchor)));
  return targets.find(hasVisibleTourTarget) ?? null;
}

function rectFromTarget(target: HTMLElement): TargetRect {
  const rect = target.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
  };
}

function highlightStyle(rect: TargetRect): CSSProperties {
  return {
    top: rect.top - HIGHLIGHT_EXPAND_PX,
    left: rect.left - HIGHLIGHT_EXPAND_PX,
    width: rect.width + HIGHLIGHT_EXPAND_PX * 2,
    height: rect.height + HIGHLIGHT_EXPAND_PX * 2,
  };
}

function cardStyle(position: CardPosition): CSSProperties {
  return {
    top: position.top,
    left: position.left,
    width: position.width,
    maxHeight: position.maxHeight,
  };
}

function resolveCardPosition(rect: TargetRect): CardPosition {
  const viewportWidth = typeof window === 'undefined' ? 390 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 844 : window.innerHeight;
  const width = Math.min(CARD_WIDTH_PX, Math.max(280, viewportWidth - CARD_GUTTER_PX * 2));
  const left = clamp(
    rect.left + rect.width / 2 - width / 2,
    CARD_GUTTER_PX,
    Math.max(CARD_GUTTER_PX, viewportWidth - width - CARD_GUTTER_PX),
  );
  const belowTop = rect.bottom + CARD_GAP_PX;
  const aboveTop = rect.top - CARD_GAP_PX - CARD_HEIGHT_ESTIMATE_PX;
  const belowSpace = viewportHeight - belowTop - CARD_GUTTER_PX;
  const aboveSpace = rect.top - CARD_GAP_PX - CARD_GUTTER_PX;

  if (belowSpace >= CARD_HEIGHT_ESTIMATE_PX) {
    return {
      top: belowTop,
      left,
      width,
      maxHeight: Math.max(CARD_MIN_HEIGHT_PX, belowSpace),
      placement: 'below',
    };
  }
  if (aboveSpace >= CARD_HEIGHT_ESTIMATE_PX) {
    return {
      top: aboveTop,
      left,
      width,
      maxHeight: Math.max(CARD_MIN_HEIGHT_PX, aboveSpace),
      placement: 'above',
    };
  }
  const centeredTop = rect.top + rect.height / 2 - CARD_HEIGHT_ESTIMATE_PX / 2;
  const top = clamp(
    centeredTop,
    CARD_GUTTER_PX,
    Math.max(CARD_GUTTER_PX, viewportHeight - CARD_HEIGHT_ESTIMATE_PX - CARD_GUTTER_PX),
  );
  return {
    top,
    left,
    width,
    maxHeight: Math.max(CARD_MIN_HEIGHT_PX, viewportHeight - top - CARD_GUTTER_PX),
    placement: 'inline',
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hasOnboarded(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(ONBOARDED_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

function isBlockingSurfaceOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.querySelector('[role="dialog"]:not([data-testid="coach-tour-dialog"])'),
  );
}

function inertSiblingsWhileModal(overlay: HTMLElement | null): () => void {
  const parent = overlay?.parentElement;
  if (!overlay || !parent) return () => undefined;
  const siblings = Array.from(parent.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child !== overlay,
  );
  const previous = siblings.map((element) => ({
    element,
    ariaHidden: element.getAttribute('aria-hidden'),
    inert: element.hasAttribute('inert'),
  }));
  for (const element of siblings) {
    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('inert', '');
  }
  return () => {
    for (const { element, ariaHidden, inert } of previous) {
      if (ariaHidden === null) {
        element.removeAttribute('aria-hidden');
      } else {
        element.setAttribute('aria-hidden', ariaHidden);
      }
      if (inert) {
        element.setAttribute('inert', '');
      } else {
        element.removeAttribute('inert');
      }
    }
  };
}
