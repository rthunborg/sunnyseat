'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReviewDto } from '@/lib/types/api';

export type ReviewCardLabels = {
  rating: string;
  noRating: string;
  photoAttached: string;
};

export function ReviewCard({
  review,
  labels,
  locale = 'sv',
  now = new Date(),
}: {
  review: ReviewDto;
  labels: ReviewCardLabels;
  locale?: string;
  now?: Date;
}) {
  const ratingLabel = review.rating
    ? formatTemplate(labels.rating, { rating: String(review.rating) })
    : labels.noRating;
  return (
    <article className="rounded-card border border-divider bg-white p-4 text-text-primary shadow-subtle">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div
          aria-label={ratingLabel}
          className="flex min-h-6 items-center gap-0.5"
          role={review.rating ? 'img' : undefined}
        >
          {review.rating ? (
            Array.from({ length: 5 }, (_, index) => {
              const filled = index < review.rating!;
              return (
                <Star
                  key={index}
                  aria-hidden="true"
                  className={cn(
                    'size-4',
                    filled
                      ? 'fill-amber-gold text-amber-gold'
                      : 'text-text-faint',
                  )}
                />
              );
            })
          ) : (
            <span className="text-label-sm text-text-muted">{labels.noRating}</span>
          )}
        </div>
        <time
          className="shrink-0 text-label-sm text-text-muted"
          dateTime={review.createdAt}
        >
          {formatRelativeTime(review.createdAt, now, locale)}
        </time>
      </div>
      <p className="whitespace-pre-line break-words text-body-sm text-text-body">{review.text}</p>
      {review.photo && (
        <p className="mt-3 text-label-sm text-text-muted">
          {labels.photoAttached}
        </p>
      )}
    </article>
  );
}

function formatRelativeTime(createdAt: string, now: Date, locale: string): string {
  const created = new Date(createdAt);
  if (!Number.isFinite(created.getTime())) return '';
  const diffSeconds = Math.round((created.getTime() - now.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (absSeconds < 60) return formatter.format(diffSeconds, 'second');
  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return formatter.format(diffDays, 'day');
  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) return formatter.format(diffMonths, 'month');
  return formatter.format(Math.round(diffMonths / 12), 'year');
}

function formatTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (label, [key, value]) => label.replaceAll(`{${key}}`, value),
    template,
  );
}
