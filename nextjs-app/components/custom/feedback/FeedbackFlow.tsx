'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'motion/react';
import { FeedbackPrompt, type FeedbackPromptLabels, type FeedbackPromptSubmit } from '@/components/composed/feedback/FeedbackPrompt';
import { useSubmitFeedback } from '@/hooks/mutations/useSubmitFeedback';
import { useGeolocation } from '@/hooks/useGeolocation';
import { DURATION_SLOW_S, EASE_EXIT } from '@/lib/constants/animation';
import { useForcedState } from '@/lib/dev/use-forced-state';
import {
  FEEDBACK_VISIT_MIN_ELAPSED_MS,
  type FeedbackDetailViewRecord,
  hasSubmittedVenueFeedback,
  isLikelyVisited,
  readVenueDetailView,
  recordVenueDetailView,
  subscribeToFeedbackSubmitted,
} from '@/lib/services/feedback-session';
import { buildGoogleMapsSearchUrl } from '@/lib/services/routing';
import { publicSunVerdictFor } from '@/lib/utils/public-sun';
import type { VenueDataDto, VenueDetailDto } from '@/lib/types/api';

const SUCCESS_VISIBLE_MS = 3000;
const EXIT_VISIBLE_MS = DURATION_SLOW_S * 1000;

export function FeedbackFlow({
  venue,
  plannerTimestamp,
  isLivePlannerTime = true,
}: {
  venue: VenueDetailDto | VenueDataDto;
  plannerTimestamp: string;
  isLivePlannerTime?: boolean;
}) {
  const forcedState = useForcedState();
  const geolocation = useGeolocation();
  const reducedMotion = useReducedMotion() ?? false;
  const [removed, setRemoved] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [detailView, setDetailView] = useState<FeedbackDetailViewRecord | null>(null);
  const [eligibilityNow, setEligibilityNow] = useState(() => Date.now());
  const [submittedVersion, setSubmittedVersion] = useState(0);
  const identifier = venue.slug || venue.venueSlug || venue.id;
  const venueIdentity = useMemo(() => ({
    id: venue.id,
    slug: venue.slug,
    venueSlug: venue.venueSlug,
    location: {
      lat: venue.location.lat,
      lng: venue.location.lng,
    },
    currentSunStatus: venue.currentSunStatus,
    confidence: venue.confidence,
    sunExposurePercent: venue.sunExposurePercent,
    weatherGateState: venue.weatherGateState,
    predictionEvidence: venue.predictionEvidence,
  }), [
    venue.confidence,
    venue.currentSunStatus,
    venue.id,
    venue.location.lat,
    venue.location.lng,
    venue.predictionEvidence,
    venue.slug,
    venue.sunExposurePercent,
    venue.venueSlug,
    venue.weatherGateState,
  ]);

  useEffect(() => {
    setRemoved(false);
    setIsExiting(false);
    setShowSuccess(false);
    setDetailView(null);
    setEligibilityNow(Date.now());
  }, [venue.id]);

  useEffect(() => subscribeToFeedbackSubmitted((submittedVenueId) => {
    if (submittedVenueId === venue.id || submittedVenueId === identifier) {
      setSubmittedVersion((version) => version + 1);
    }
  }), [identifier, venue.id]);

  useEffect(() => {
    if (forcedState !== 'feedback' && !isLivePlannerTime) {
      setDetailView(null);
      return;
    }
    const existing = readVenueDetailView(venueIdentity.id);
    if (existing) {
      setDetailView(existing);
      return;
    }
    setDetailView(recordVenueDetailView(venueIdentity, plannerTimestamp));
  }, [forcedState, isLivePlannerTime, plannerTimestamp, venueIdentity]);

  const shouldForce = forcedState === 'feedback';
  const submitted = useMemo(() => (
    hasSubmittedVenueFeedback(venue.id) || hasSubmittedVenueFeedback(identifier)
  ), [identifier, submittedVersion, venue.id]);
  const eligible = useMemo(() => {
    if (shouldForce) return true;
    if (!isLivePlannerTime) return false;
    return isLikelyVisited({
      venue: venueIdentity,
      geolocationStatus: geolocation.status,
      coords: geolocation.coords,
      detailView,
      now: eligibilityNow,
    });
  }, [
    detailView,
    eligibilityNow,
    geolocation.coords,
    geolocation.status,
    isLivePlannerTime,
    shouldForce,
    venueIdentity,
  ]);

  const visible = !removed && eligible && (shouldForce || !submitted || showSuccess);

  useEffect(() => {
    if (
      shouldForce ||
      removed ||
      showSuccess ||
      !isLivePlannerTime ||
      geolocation.status !== 'success' ||
      !detailView
    ) {
      return;
    }
    const thresholdAt = detailView.viewedAt + FEEDBACK_VISIT_MIN_ELAPSED_MS;
    const now = Date.now();
    if (now >= thresholdAt) {
      setEligibilityNow((previous) => (previous >= thresholdAt ? previous : now));
      return;
    }
    const remaining = thresholdAt - now;
    const timeout = window.setTimeout(() => {
      setEligibilityNow(Date.now());
    }, remaining + 1);
    return () => window.clearTimeout(timeout);
  }, [
    detailView,
    geolocation.status,
    isLivePlannerTime,
    removed,
    shouldForce,
    showSuccess,
  ]);

  const startExit = useCallback(() => {
    if (reducedMotion) {
      setRemoved(true);
      setShowSuccess(false);
      return;
    }
    setIsExiting(true);
  }, [reducedMotion]);

  useEffect(() => {
    if (!isExiting) return;
    const timeout = window.setTimeout(() => {
      setRemoved(true);
      setShowSuccess(false);
    }, EXIT_VISIBLE_MS);
    return () => window.clearTimeout(timeout);
  }, [isExiting]);

  useEffect(() => {
    if (!showSuccess) return;
    const timeout = window.setTimeout(() => {
      startExit();
    }, SUCCESS_VISIBLE_MS);
    return () => window.clearTimeout(timeout);
  }, [showSuccess, startExit]);

  if (!visible) return null;

  return (
    <motion.div
      data-testid="feedback-flow-shell"
      initial={false}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={reducedMotion ? { duration: 0 } : { duration: DURATION_SLOW_S, ease: EASE_EXIT }}
    >
      <FeedbackPromptController
        venue={venue}
        identifier={identifier}
        plannerTimestamp={plannerTimestamp}
        showSuccess={showSuccess}
        setShowSuccess={setShowSuccess}
        isExiting={isExiting}
        onClose={startExit}
      />
    </motion.div>
  );
}

function FeedbackPromptController({
  venue,
  identifier,
  plannerTimestamp,
  showSuccess,
  setShowSuccess,
  isExiting,
  onClose,
}: {
  venue: VenueDetailDto | VenueDataDto;
  identifier: string;
  plannerTimestamp: string;
  showSuccess: boolean;
  setShowSuccess: (value: boolean) => void;
  isExiting: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('feedback');
  const mutation = useSubmitFeedback(identifier);
  const labels = feedbackLabels(t);
  const detailView = readVenueDetailView(venue.id);
  const address = 'address' in venue ? venue.address : venue.neighborhood;
  const payloadTimestamp = detailView?.plannerTimestamp ?? plannerTimestamp;
  const predictedState = detailView?.predictedState ?? venue.currentSunStatus;
  const sunExposurePercent = detailView?.sunExposurePercent ?? venue.sunExposurePercent;
  const publicSunVerdict = detailView?.publicSunVerdict ?? publicSunVerdictFor(venue);
  const weatherGated = detailView?.weatherGated ?? venue.weatherGateState === 'gated';
  const weatherUnknown = detailView?.weatherUnknown ?? venue.weatherGateState === 'unknown';
  const geometryInputHash =
    detailView?.geometryInputHash ?? venue.predictionEvidence?.geometryInputHash;
  const confidenceAtPrediction = detailView?.confidenceAtPrediction ?? venue.confidence;

  if (!geometryInputHash) return null;
  const feedbackGeometryInputHash = geometryInputHash;

  return (
    <FeedbackPrompt
      venueName={venue.venueName}
      address={address}
      mapHref={buildGoogleMapsSearchUrl(venue)}
      labels={labels}
      isSubmitting={mutation.isPending}
      isExiting={isExiting}
      submitState={showSuccess ? 'success' : mutation.isError ? 'error' : 'idle'}
      onClose={onClose}
      onRetry={submitFeedback}
      onSubmit={submitFeedback}
    />
  );

  function submitFeedback(payload: FeedbackPromptSubmit) {
    mutation.mutate(
      {
        venueId: venue.id,
        userTimestamp: payloadTimestamp,
        predictedState,
        sunExposurePercent,
        publicSunVerdict,
        weatherGated,
        weatherUnknown,
        geometryInputHash: feedbackGeometryInputHash,
        confidenceAtPrediction,
        ...payload,
      },
      {
        onSuccess: () => {
          setShowSuccess(true);
        },
      },
    );
  }
}

function feedbackLabels(t: ReturnType<typeof useTranslations<'feedback'>>): FeedbackPromptLabels {
  return {
    title: t('title'),
    venueAddressLabel: t('venueAddressLabel'),
    mapLink: t('mapLink'),
    outdoorQuestion: t('outdoorQuestion'),
    sunnyQuestion: t('sunnyQuestion'),
    yes: t('yes'),
    no: t('no'),
    later: t('later'),
    noteLabel: t('noteLabel'),
    notePlaceholder: t('notePlaceholder'),
    submit: t('submit'),
    submitting: t('submitting'),
    close: t('close'),
    success: t('success'),
    error: t('error'),
    retry: t('retry'),
  };
}
