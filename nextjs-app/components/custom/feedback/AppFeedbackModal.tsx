'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Send, Sparkles, Star, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useSubmitAppFeedback } from '@/hooks/mutations/useSubmitAppFeedback';
import {
  DURATION_FAST_S,
  DURATION_SLOW_S,
  EASE_ENTER,
  EASE_EXIT,
} from '@/lib/constants/animation';
import { focusableElements, trapFocus } from '@/lib/utils/focus-trap';
import { cn } from '@/lib/utils';

const MAX_RATING = 5;
const COMMENT_MAX_LENGTH = 500;

/**
 * General app-experience feedback modal (star rating + optional comment),
 * mirroring the Claude Design "Kontakt & feedback" flow. Opened from the
 * settings modal; submits to `/api/feedback` via {@link useSubmitAppFeedback}.
 * Shell (overlay, focus trap, Esc, responsive bottom-sheet/centred) matches
 * DatePickerDialog for consistency.
 */
export function AppFeedbackModal({
  open,
  onClose,
  reducedMotion,
}: {
  open: boolean;
  onClose: () => void;
  reducedMotion?: boolean;
}) {
  const t = useTranslations('common.appFeedback');
  const locale = useLocale();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const shouldReduceMotion = reducedMotion ?? prefersReducedMotion;
  const dialogRef = useRef<HTMLDivElement>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [succeeded, setSucceeded] = useState(false);
  const mutation = useSubmitAppFeedback();
  const { reset: resetMutation } = mutation;

  useEffect(() => {
    if (!open) return;
    setRating(0);
    setComment('');
    setSucceeded(false);
    resetMutation();
  }, [open, resetMutation]);

  useEffect(() => {
    if (!open) return;
    focusableElements(dialogRef.current)[0]?.focus();
  }, [open, succeeded]);

  const handleSubmit = () => {
    if (rating < 1 || mutation.isPending) return;
    const trimmed = comment.trim();
    mutation.mutate(
      { rating, ...(trimmed ? { comment: trimmed } : {}), locale },
      { onSuccess: () => setSucceeded(true) },
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-modal flex items-end justify-center bg-text-primary/30 backdrop-blur-standard lg:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : DURATION_FAST_S, ease: EASE_ENTER }}
          onPointerDown={onClose}
        >
          <m.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('title')}
            data-testid="app-feedback-modal"
            tabIndex={-1}
            className="relative max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-t-panel bg-surface-cream p-6 text-text-primary shadow-sheet-full-up outline-none lg:max-w-[30rem] lg:rounded-panel"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
            transition={{ duration: shouldReduceMotion ? 0 : DURATION_SLOW_S, ease: EASE_EXIT }}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
              }
              if (event.key === 'Tab') {
                trapFocus(event, dialogRef.current);
              }
            }}
          >
            <button
              type="button"
              aria-label={t('closeAria')}
              onClick={onClose}
              data-testid="app-feedback-close"
              className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-pill bg-surface-muted text-text-body outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
            >
              <X aria-hidden="true" className="size-4" />
            </button>

            {succeeded ? (
              <div className="px-1 pt-6 text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-pill bg-amber-primary/15 text-amber-dark">
                  <Check aria-hidden="true" className="size-7" />
                </div>
                <h2 className="mb-1 text-heading-md text-text-primary">{t('successTitle')}</h2>
                <p className="mb-5 text-pretty text-body-sm text-text-muted">{t('successBody')}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 w-full rounded-pill bg-text-primary px-4 text-label-lg text-surface-cream outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
                >
                  {t('close')}
                </button>
              </div>
            ) : (
              <>
                <div className="mx-auto mb-3 mt-1 flex size-12 items-center justify-center rounded-card bg-amber-primary/15 text-amber-dark">
                  <Sparkles aria-hidden="true" className="size-5" />
                </div>
                <h2 className="text-center text-heading-md text-text-primary">{t('title')}</h2>
                <p className="mb-4 text-pretty text-center text-body-sm text-text-muted">
                  {t('subtitle')}
                </p>

                <div role="radiogroup" aria-label={t('ratingLabel')} className="flex justify-center gap-2">
                  {Array.from({ length: MAX_RATING }, (_, index) => index + 1).map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={rating === value}
                      aria-label={t('ratingStar', { rating: value })}
                      data-testid={`app-feedback-star-${value}`}
                      onClick={() => setRating(value)}
                      className="flex size-11 items-center justify-center rounded-pill outline-none focus-visible:ring-2 focus-visible:ring-amber-primary"
                    >
                      <Star
                        aria-hidden="true"
                        className={cn(
                          'size-8',
                          value <= rating
                            ? 'fill-amber-primary text-amber-primary'
                            : 'fill-none text-divider',
                        )}
                      />
                    </button>
                  ))}
                </div>

                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  maxLength={COMMENT_MAX_LENGTH}
                  placeholder={t('commentPlaceholder')}
                  data-testid="app-feedback-comment"
                  className="mt-4 min-h-24 w-full resize-none rounded-card border border-divider bg-surface-cream p-3.5 text-body-md text-text-primary outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-amber-primary"
                />

                {mutation.isError && (
                  <p role="alert" className="mt-2 text-body-sm text-error">
                    {t('error')}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={rating < 1 || mutation.isPending}
                  data-testid="app-feedback-submit"
                  className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-pill bg-text-primary px-4 text-label-lg text-surface-cream outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send aria-hidden="true" className="size-4" />
                  {mutation.isPending ? t('submitting') : t('submit')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 min-h-11 w-full rounded-pill text-label-lg text-text-muted outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
                >
                  {t('cancel')}
                </button>
              </>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
