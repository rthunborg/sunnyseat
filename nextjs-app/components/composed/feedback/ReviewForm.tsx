'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Star } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { AmberCTAButton } from '@/components/composed/shared/AmberCTAButton';
import {
  DURATION_DEFAULT_S,
  DURATION_FAST_S,
  DURATION_SLOW_S,
  EASE_DEFAULT,
  EASE_EXIT,
} from '@/lib/constants/animation';
import { cn } from '@/lib/utils';
import type { ReviewPhotoAttachmentDto } from '@/lib/types/api';

const REVIEW_MAX_LENGTH = 1000;
const PHOTO_NAME_MAX_LENGTH = 120;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export type ReviewFormLabels = {
  venueSubtitle: string;
  heading: string;
  textLabel: string;
  experiencePrompt: string;
  textPlaceholder: string;
  ratingLabel: string;
  ratingValue: string;
  photo: string;
  photoSelected: string;
  photoRejected: string;
  submit: string;
  submitting: string;
  close: string;
  success: string;
  error: string;
  retry: string;
};

export type ReviewFormSubmit = {
  text: string;
  rating?: number;
  photo?: ReviewPhotoAttachmentDto;
};

export function ReviewForm({
  testId = 'review-form',
  venueName,
  labels,
  isSubmitting = false,
  submitState = 'idle',
  onSubmit,
  onClose,
  onRetry,
}: {
  testId?: string;
  venueName: string;
  labels: ReviewFormLabels;
  isSubmitting?: boolean;
  submitState?: 'idle' | 'success' | 'error';
  onSubmit: (payload: ReviewFormSubmit) => void;
  onClose: () => void;
  onRetry?: (payload: ReviewFormSubmit) => void;
}) {
  const reducedMotion = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  const [rating, setRating] = useState<number | undefined>();
  const [photo, setPhoto] = useState<ReviewPhotoAttachmentDto | undefined>();
  const [photoRejected, setPhotoRejected] = useState(false);
  const disabled = isSubmitting || submitState === 'success';
  const canSubmit = text.trim().length > 0 && !disabled;
  const replacementTransition = reducedMotion
    ? { duration: 0 }
    : { duration: DURATION_DEFAULT_S, ease: EASE_DEFAULT };
  const exitTransition = reducedMotion
    ? { duration: 0 }
    : { duration: DURATION_SLOW_S, ease: EASE_EXIT };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [text]);

  return (
    <section
      data-testid={testId}
      className="rounded-card bg-surface-muted p-5 text-text-primary shadow-card"
    >
      <div className="grid">
        <AnimatePresence>
          {submitState === 'success' ? (
            <m.div
              key="success"
              role="status"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? { opacity: 1 } : { opacity: 0, transition: exitTransition }}
              transition={replacementTransition}
              className="col-start-1 row-start-1 space-y-5 py-5 text-center"
            >
              <p className="text-heading-lg text-text-primary">{labels.success}</p>
              <button
                type="button"
                onClick={onClose}
                className="mx-auto inline-flex min-h-11 items-center justify-center rounded-pill px-4 text-label-lg text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
              >
                {labels.close}
              </button>
            </m.div>
          ) : (
            <m.form
              key="form"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? { opacity: 1 } : { opacity: 0, transition: exitTransition }}
              transition={replacementTransition}
              className="col-start-1 row-start-1 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                if (!canSubmit) return;
                onSubmit(currentPayload());
              }}
            >
              <header className="space-y-1">
                <p className="text-body-sm text-text-body">{labels.venueSubtitle}</p>
                <h2 className="text-display-sm text-text-primary">{venueName}</h2>
                <p className="text-heading-lg text-text-primary">{labels.heading}</p>
                <p className="text-body-sm text-text-body">
                  {formatTemplate(labels.experiencePrompt, { name: venueName })}
                </p>
              </header>

              <label className="block space-y-2 text-label-lg text-text-primary">
                <span>{labels.textLabel}</span>
                <textarea
                  ref={textareaRef}
                  value={text}
                  disabled={disabled}
                  maxLength={REVIEW_MAX_LENGTH}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={labels.textPlaceholder}
                  className="min-h-32 w-full resize-y overflow-hidden rounded-card border border-divider bg-surface-muted px-4 py-3 text-body-sm text-text-body outline-none transition-colors duration-fast ease-default placeholder:text-text-muted focus:border-amber-dark focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none disabled:opacity-60"
                />
              </label>

              <fieldset className="space-y-2">
                <legend className="text-label-lg text-text-primary">{labels.ratingLabel}</legend>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }, (_, index) => {
                    const value = index + 1;
                    const selected = rating !== undefined && value <= rating;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-label={formatTemplate(labels.ratingValue, {
                          rating: String(value),
                        })}
                        aria-pressed={rating === value}
                        disabled={disabled}
                        onClick={() => setRating(rating === value ? undefined : value)}
                        className={cn(
                          'flex size-11 items-center justify-center rounded-pill border border-divider bg-white text-text-muted outline-none transition-colors duration-fast ease-default focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none disabled:opacity-60',
                          selected && 'border-amber-primary bg-amber-primary text-amber-cta-text',
                        )}
                      >
                        <Star
                          aria-hidden="true"
                          className={cn('size-5', selected && 'fill-current')}
                        />
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  disabled={disabled}
                  aria-hidden="true"
                  tabIndex={-1}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      setPhoto(undefined);
                      setPhotoRejected(false);
                      return;
                    }
                    if (!isSafeOptionalPhoto(file)) {
                      setPhoto(undefined);
                      setPhotoRejected(true);
                      event.currentTarget.value = '';
                      return;
                    }
                    setPhoto({
                      name: file.name,
                      type: file.type,
                      size: file.size,
                      lastModified: file.lastModified,
                    });
                    setPhotoRejected(false);
                  }}
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-pill text-label-lg text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:opacity-60"
                >
                  <Camera aria-hidden="true" className="size-4" />
                  {labels.photo}
                </button>
                {/* Always mounted: a live region inserted together with its
                    content is not reliably announced, so the region exists
                    before a photo is picked and only its text changes.
                    `sr-only` keeps the empty state out of the layout. It
                    announces either the selected photo or a rejection message
                    (R2-D1) so a refused photo is never silently dropped. */}
                <p
                  role="status"
                  className={cn(
                    'break-words text-body-sm',
                    photoRejected ? 'text-error' : 'text-text-body',
                    !photo && !photoRejected && 'sr-only',
                  )}
                >
                  {photo
                    ? formatTemplate(labels.photoSelected, { name: photo.name })
                    : photoRejected
                      ? labels.photoRejected
                      : null}
                </p>
              </div>

              {submitState === 'error' && (
                <div role="alert" className="rounded-card bg-surface-cream px-3 py-2 text-body-sm text-error">
                  <span>{labels.error}</span>
                  <button
                    type="button"
                    disabled={!onRetry || !canSubmit}
                    onClick={() => onRetry?.(currentPayload())}
                    className="ml-2 min-h-11 rounded-pill px-2 text-label-lg text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:opacity-60"
                  >
                    {labels.retry}
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <AmberCTAButton
                  type="submit"
                  className="w-full"
                  disabled={!canSubmit}
                  isLoading={isSubmitting}
                  loadingLabel={labels.submitting}
                  aria-label={isSubmitting ? labels.submitting : labels.submit}
                >
                  {labels.submit}
                </AmberCTAButton>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onClose}
                  className="mx-auto flex min-h-11 items-center rounded-pill px-4 text-label-lg text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:opacity-60"
                >
                  {labels.close}
                </button>
              </div>
            </m.form>
          )}
        </AnimatePresence>
      </div>
    </section>
  );

  function currentPayload(): ReviewFormSubmit {
    return {
      text: text.trim(),
      ...(rating !== undefined ? { rating } : {}),
      ...(photo ? { photo } : {}),
    };
  }
}

function isSafeOptionalPhoto(file: File): boolean {
  return file.name.trim().length > 0 &&
    file.name.length <= PHOTO_NAME_MAX_LENGTH &&
    file.type.toLowerCase().startsWith('image/') &&
    file.size > 0 &&
    file.size <= PHOTO_MAX_BYTES;
}

function formatTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (label, [key, value]) => label.replaceAll(`{${key}}`, value),
    template,
  );
}
