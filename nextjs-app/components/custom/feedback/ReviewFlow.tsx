'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MessageSquare } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ReviewCard, type ReviewCardLabels } from '@/components/composed/feedback/ReviewCard';
import { ReviewForm, type ReviewFormLabels, type ReviewFormSubmit } from '@/components/composed/feedback/ReviewForm';
import { AmberCTAButton } from '@/components/composed/shared/AmberCTAButton';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubmitReview } from '@/hooks/mutations/useSubmitReview';
import { useVenueReviews } from '@/hooks/queries/useVenueReviews';
import { DURATION_DEFAULT_S, EASE_DEFAULT } from '@/lib/constants/animation';
import { useForcedState } from '@/lib/dev/use-forced-state';
import type { VenueDataDto, VenueDetailDto } from '@/lib/types/api';

export function ReviewFlow({
  venue,
  instanceId,
}: {
  venue: VenueDetailDto | VenueDataDto;
  instanceId?: string;
}) {
  const locale = useLocale();
  const t = useTranslations('feedback.review');
  const forcedState = useForcedState();
  const sectionRef = useRef<HTMLElement>(null);
  const successTimerRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const identifier = venue.slug || venue.venueSlug || venue.id;
  const reviewsQuery = useVenueReviews(identifier);
  const mutation = useSubmitReview(identifier);
  const resetMutation = mutation.reset;
  const [formOpen, setFormOpen] = useState(() => forcedState === 'review');
  const [showSuccess, setShowSuccess] = useState(false);
  const labels = useMemo(() => reviewLabels(t), [t]);
  const cardLabels = useMemo(() => reviewCardLabels(t), [t]);
  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: DURATION_DEFAULT_S, ease: EASE_DEFAULT };
  const reviews = reviewsQuery.data?.reviews ?? [];
  const sectionId = instanceId ? `reviews-${venue.id}-${instanceId}` : `reviews-${venue.id}`;
  const flowTestId = instanceId ? `review-flow-${instanceId}` : 'review-flow';
  const formTestId = instanceId ? `review-form-${instanceId}` : 'review-form';

  useEffect(() => {
    if (forcedState === 'review') setFormOpen(true);
  }, [forcedState]);

  useEffect(() => {
    if (forcedState !== 'review') return;
    sectionRef.current?.scrollIntoView?.({
      block: 'start',
      inline: 'nearest',
      behavior: 'auto',
    });
  }, [forcedState, formOpen]);

  useEffect(() => {
    setFormOpen(forcedState === 'review');
    setShowSuccess(false);
    clearSuccessTimer();
    resetMutation();
  }, [forcedState, resetMutation, venue.id]);

  useEffect(() => {
    return () => clearSuccessTimer();
  }, []);

  return (
    <section
      aria-labelledby={sectionId}
      data-testid={flowTestId}
      ref={sectionRef}
      className="space-y-4"
    >
      <header className="space-y-3">
        <div>
          <h2 id={sectionId} className="text-heading-lg text-text-primary">
            {labels.sectionTitle}
          </h2>
          <p className="text-body-sm text-text-body">
            {reviewsQuery.data
              ? t('summary', { count: reviewsQuery.data.summary.reviewCount })
              : labels.loading}
          </p>
        </div>
        {!formOpen && (
          <AmberCTAButton
            className="w-full px-4"
            aria-label={labels.open}
            onClick={() => {
              setShowSuccess(false);
              mutation.reset();
              setFormOpen(true);
            }}
          >
            <MessageSquare aria-hidden="true" className="size-4" />
            <span>{labels.open}</span>
          </AmberCTAButton>
        )}
      </header>

      <AnimatePresence initial={false}>
        {formOpen && (
          <motion.div
            key="review-form-shell"
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
            transition={transition}
          >
            <ReviewForm
              testId={formTestId}
              venueName={venue.venueName}
              labels={labels.form}
              isSubmitting={mutation.isPending}
              submitState={showSuccess ? 'success' : mutation.isError ? 'error' : 'idle'}
              onClose={() => {
                setFormOpen(false);
                setShowSuccess(false);
                clearSuccessTimer();
                mutation.reset();
              }}
              onSubmit={submitReview}
              onRetry={submitReview}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {reviewsQuery.isLoading ? (
        <ReviewSkeletons label={labels.loading} />
      ) : reviewsQuery.isError ? (
        <div role="alert" className="rounded-card bg-surface-cream px-4 py-3 text-body-sm text-error">
          <span>{labels.loadError}</span>
          <button
            type="button"
            onClick={() => {
              void reviewsQuery.refetch();
            }}
            className="ml-2 min-h-11 rounded-pill px-2 text-label-lg text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          >
            {labels.retry}
          </button>
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              labels={cardLabels}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-card bg-surface-muted px-4 py-3 text-body-sm text-text-body">
          {labels.empty}
        </p>
      )}
    </section>
  );

  function submitReview(payload: ReviewFormSubmit) {
    mutation.mutate(
      {
        venueId: venue.id,
        venueSlug: venue.slug,
        ...payload,
      },
      {
        onSuccess: () => {
          setShowSuccess(true);
          startSuccessDismissTimer();
          void reviewsQuery.refetch();
        },
      },
    );
  }

  function startSuccessDismissTimer() {
    clearSuccessTimer();
    successTimerRef.current = window.setTimeout(() => {
      setFormOpen(false);
      setShowSuccess(false);
      mutation.reset();
      successTimerRef.current = null;
    }, 3000);
  }

  function clearSuccessTimer() {
    if (successTimerRef.current === null) return;
    window.clearTimeout(successTimerRef.current);
    successTimerRef.current = null;
  }
}

function ReviewSkeletons({ label }: { label: string }) {
  return (
    <div aria-label={label} className="space-y-3" role="status">
      <Skeleton className="h-28 w-full rounded-card bg-surface-muted" />
      <Skeleton className="h-24 w-full rounded-card bg-surface-muted" />
    </div>
  );
}

function reviewLabels(t: ReturnType<typeof useTranslations<'feedback.review'>>) {
  return {
    sectionTitle: t('sectionTitle'),
    loading: t('loading'),
    loadError: t('loadError'),
    retry: t('retry'),
    empty: t('empty'),
    open: t('open'),
    form: {
      venueSubtitle: t('form.venueSubtitle'),
      heading: t('form.heading'),
      textLabel: t('form.textLabel'),
      experiencePrompt: t('form.experiencePrompt', { name: '{name}' }),
      textPlaceholder: t('form.textPlaceholder'),
      ratingLabel: t('form.ratingLabel'),
      ratingValue: t('form.ratingValue', { rating: '{rating}' }),
      photo: t('form.photo'),
      photoSelected: t('form.photoSelected', { name: '{name}' }),
      submit: t('form.submit'),
      submitting: t('form.submitting'),
      close: t('form.close'),
      success: t('form.success'),
      error: t('form.error'),
      retry: t('form.retry'),
    } satisfies ReviewFormLabels,
  };
}

function reviewCardLabels(t: ReturnType<typeof useTranslations<'feedback.review'>>): ReviewCardLabels {
  return {
    rating: t('card.rating', { rating: '{rating}' }),
    noRating: t('card.noRating'),
    photoAttached: t('card.photoAttached'),
  };
}

function formatTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (label, [key, value]) => label.replaceAll(`{${key}}`, value),
    template,
  );
}
