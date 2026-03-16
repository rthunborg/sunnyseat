'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface CandidateCardProps {
  venueId: string;
  venueName: string;
  neighborhood: string;
}

export function CandidateCard({ venueId, venueName, neighborhood }: CandidateCardProps) {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [totalConfirmations, setTotalConfirmations] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/venues/${venueId}/confirm`, {
        method: 'POST',
      });

      if (!res.ok) {
        setError(t('errors.generic'));
        return;
      }

      const data = await res.json();
      setConfirmed(true);
      setTotalConfirmations(data.totalConfirmations);
    } catch {
      setError(t('errors.networkError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [venueId, t]);

  return (
    <div
      role="article"
      aria-label={`${venueName}, ${t('candidate.unverified')}`}
      className={cn(
        'relative flex flex-col gap-2 p-4 rounded-card shadow-card',
        'bg-blue-50 border border-blue-200'
      )}
    >
      {/* Venue name + badge */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-3 h-3 rounded-full shrink-0 bg-blue-500"
          aria-hidden="true"
        />
        <span className="text-[length:var(--font-size-headline)] leading-[var(--line-height-headline)] font-semibold text-text-primary truncate">
          {venueName}
        </span>
      </div>

      {/* Neighborhood */}
      <span className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary">
        {neighborhood}
      </span>

      {/* Unverified badge */}
      <span className="inline-flex items-center self-start px-2 py-0.5 rounded-full text-[length:var(--font-size-caption)] leading-[var(--line-height-caption)] font-medium bg-blue-100 text-blue-800">
        {t('candidate.unverified')}
      </span>

      {/* Confirmation count */}
      {totalConfirmations !== null && (
        <p className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary">
          {t('candidate.confirmationCount', { current: totalConfirmations, required: 3 })}
        </p>
      )}

      {/* Success message */}
      {confirmed && (
        <p className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-green-700 font-medium">
          {t('candidate.thankYou')}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-red-600">
          {error}
        </p>
      )}

      {/* Confirm button */}
      {!confirmed && (
        <Button
          onClick={handleConfirm}
          disabled={isSubmitting}
          aria-label={t('candidate.confirmAria', { name: venueName })}
          className="h-[var(--spacing-touch-comfortable)] rounded-button bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 mt-1"
        >
          {isSubmitting ? t('common.loading') : t('candidate.confirmButton')}
        </Button>
      )}
    </div>
  );
}
