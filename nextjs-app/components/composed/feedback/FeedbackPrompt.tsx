'use client';

import { useState } from 'react';
import { Clock3, ExternalLink } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react';
import { AmberCTAButton } from '@/components/composed/shared/AmberCTAButton';
import { DURATION_DEFAULT_S, DURATION_FAST_S, DURATION_SLOW_S, EASE_DEFAULT, EASE_EXIT } from '@/lib/constants/animation';
import { cn } from '@/lib/utils';
import type { FeedbackSunAccuracy } from '@/lib/types/api';

const NOTE_MAX_LENGTH = 500;

export type FeedbackPromptLabels = {
  title: string;
  venueAddressLabel: string;
  mapLink: string;
  outdoorQuestion: string;
  sunnyQuestion: string;
  yes: string;
  no: string;
  later: string;
  noteLabel: string;
  notePlaceholder: string;
  submit: string;
  submitting: string;
  close: string;
  success: string;
  error: string;
  retry: string;
};

export type FeedbackPromptSubmit = {
  sunAccuracy?: FeedbackSunAccuracy;
  wasSunny?: boolean;
  outdoorSeatingConfirmed?: boolean;
  note?: string;
};

export function FeedbackPrompt({
  venueName,
  address,
  mapHref,
  labels,
  submitState = 'idle',
  isSubmitting = false,
  isExiting = false,
  onSubmit,
  onClose,
  onRetry,
}: {
  venueName: string;
  address: string;
  mapHref?: string;
  labels: FeedbackPromptLabels;
  submitState?: 'idle' | 'success' | 'error';
  isSubmitting?: boolean;
  isExiting?: boolean;
  onSubmit: (payload: FeedbackPromptSubmit) => void;
  onClose: () => void;
  onRetry?: (payload: FeedbackPromptSubmit) => void;
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const [outdoor, setOutdoor] = useState<boolean | undefined>();
  const [sunAccuracy, setSunAccuracy] = useState<FeedbackSunAccuracy | undefined>();
  const [note, setNote] = useState('');
  const hasQuestionAnswer = outdoor !== undefined || sunAccuracy !== undefined;
  const disabled = isSubmitting || submitState === 'success' || isExiting;
  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: DURATION_FAST_S, ease: EASE_DEFAULT };
  const replacementTransition = reducedMotion
    ? { duration: 0 }
    : { duration: DURATION_DEFAULT_S, ease: EASE_DEFAULT };
  const currentPayload = () => ({
    sunAccuracy,
    wasSunny: sunAccuracy === 'sunny'
      ? true
      : sunAccuracy === 'not_sunny'
        ? false
        : undefined,
    outdoorSeatingConfirmed: outdoor,
    note: note.trim() || undefined,
  } satisfies FeedbackPromptSubmit);

  return (
    <section
      data-testid="feedback-prompt"
      className="rounded-card bg-surface-muted p-5 text-text-primary shadow-card"
    >
      <div className="grid">
      <AnimatePresence>
        {submitState === 'success' ? (
          <motion.p
            key="success"
            role="status"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? { opacity: 1 } : { opacity: 0, transition: { duration: DURATION_SLOW_S, ease: EASE_EXIT } }}
            transition={replacementTransition}
            className="col-start-1 row-start-1 py-8 text-center text-heading-lg text-text-primary"
          >
            {labels.success}
          </motion.p>
        ) : (
          <motion.div
            key="form"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? { opacity: 1 } : { opacity: 0, transition: replacementTransition }}
            transition={replacementTransition}
            className="col-start-1 row-start-1 space-y-5"
          >
            <header className="space-y-1">
              <p className="text-heading-lg text-text-primary">{labels.title}</p>
              <h2 className="text-display-sm text-text-primary">{venueName}</h2>
              <p className="text-body-sm text-text-body">
                <span className="sr-only">{labels.venueAddressLabel}: </span>
                {address}
              </p>
              {mapHref && (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 rounded-pill text-label-md text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
                >
                  {labels.mapLink}
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              )}
            </header>

            <Question label={labels.outdoorQuestion}>
              <ChoiceButton label={labels.yes} groupLabel={labels.outdoorQuestion} selected={outdoor === true} dimmed={outdoor === false} disabled={disabled} onClick={() => setOutdoor(true)} transition={transition} />
              <ChoiceButton label={labels.no} groupLabel={labels.outdoorQuestion} selected={outdoor === false} dimmed={outdoor === true} disabled={disabled} onClick={() => setOutdoor(false)} transition={transition} />
            </Question>

            <Question label={labels.sunnyQuestion}>
              <ChoiceButton
                label={labels.yes}
                groupLabel={labels.sunnyQuestion}
                selected={sunAccuracy === 'sunny'}
                dimmed={sunAccuracy !== undefined && sunAccuracy !== 'sunny'}
                disabled={disabled}
                onClick={() => setSunAccuracy('sunny')}
                transition={transition}
              />
              <ChoiceButton
                label={labels.no}
                groupLabel={labels.sunnyQuestion}
                selected={sunAccuracy === 'not_sunny'}
                dimmed={sunAccuracy !== undefined && sunAccuracy !== 'not_sunny'}
                disabled={disabled}
                onClick={() => setSunAccuracy('not_sunny')}
                transition={transition}
              />
              <ChoiceButton
                label={labels.later}
                groupLabel={labels.sunnyQuestion}
                selected={sunAccuracy === 'unsure'}
                dimmed={sunAccuracy !== undefined && sunAccuracy !== 'unsure'}
                disabled={disabled}
                onClick={() => setSunAccuracy('unsure')}
                transition={transition}
                icon={<Clock3 aria-hidden="true" className="size-4" />}
              />
            </Question>

            <label className="block space-y-2 text-label-lg text-text-primary">
              <span>{labels.noteLabel}</span>
              <textarea
                value={note}
                disabled={disabled}
                maxLength={NOTE_MAX_LENGTH}
                onChange={(event) => setNote(event.target.value)}
                placeholder={labels.notePlaceholder}
                className="min-h-24 w-full resize-none rounded-card border border-divider bg-white px-4 py-3 text-body-sm text-text-body outline-none transition-colors duration-fast ease-default placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none disabled:opacity-60"
              />
            </label>

            {submitState === 'error' && (
              <div role="alert" className="rounded-card bg-surface-cream px-3 py-2 text-body-sm text-error">
                <span>{labels.error}</span>
                <button
                  type="button"
                  disabled={!onRetry || !hasQuestionAnswer || disabled}
                  onClick={() => onRetry?.(currentPayload())}
                  className="ml-2 min-h-11 rounded-pill px-2 text-label-lg text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
                >
                  {labels.retry}
                </button>
              </div>
            )}

            <div className="space-y-2">
              <AmberCTAButton
                className="w-full"
                disabled={!hasQuestionAnswer || disabled}
                isLoading={isSubmitting}
                loadingLabel={labels.submitting}
                aria-label={isSubmitting ? labels.submitting : labels.submit}
                onClick={() => {
                  onSubmit(currentPayload());
                }}
              >
                {labels.submit}
              </AmberCTAButton>
              <button
                type="button"
                disabled={isSubmitting || isExiting}
                onClick={onClose}
                className="mx-auto flex min-h-11 items-center rounded-pill px-4 text-label-lg text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:opacity-60"
              >
                {labels.close}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </section>
  );
}

function Question({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-label-lg text-text-primary">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function ChoiceButton({
  label,
  groupLabel,
  selected,
  dimmed,
  disabled,
  onClick,
  transition,
  icon,
}: {
  label: string;
  groupLabel: string;
  selected: boolean;
  dimmed: boolean;
  disabled: boolean;
  onClick: () => void;
  transition: Transition;
  icon?: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={`${groupLabel} ${label}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      animate={{ opacity: dimmed ? 0.55 : 1 }}
      transition={transition}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-divider px-4 py-2 text-label-lg outline-none transition-colors duration-fast ease-default focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none disabled:opacity-60',
        selected
          ? 'border-amber-primary bg-amber-primary text-amber-cta-text'
          : 'bg-white text-text-body',
      )}
    >
      {icon}
      {label}
    </motion.button>
  );
}
