// useFeedbackPrompt Hook - Determine when to show feedback prompt

import { useState, useEffect, useCallback } from 'react';
import { geolocationService } from '../services/geolocationService';
import type { SunWindow } from '../types';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface UseFeedbackPromptOptions {
  venueLocation: Coordinates;
  currentSunWindow?: SunWindow;
  pageOpenedAt: Date;
  predictedConfidence: number;
  hasSubmittedToday: boolean;
}

interface UseFeedbackPromptReturn {
  showPrompt: boolean;
  isUserAtVenue: boolean | null; // null = unknown (no permission)
  timeOnPage: number; // milliseconds
}

const MIN_TIME_AT_VENUE = 600000; // 10 minutes
const MIN_TIME_NOT_AT_VENUE = 900000; // 15 minutes
const MIN_CONFIDENCE = 40; // Don't prompt for low-confidence predictions
const PROXIMITY_THRESHOLD_METERS = 100; // User within 100m of venue

function isWithinSunWindowTimeframe(currentSunWindow?: SunWindow): boolean {
  if (!currentSunWindow) return false;

  const now = new Date();
  const windowStart = new Date(currentSunWindow.localStartTime || currentSunWindow.startTime);
  const windowEnd = new Date(currentSunWindow.localEndTime || currentSunWindow.endTime);
  const oneHourAfter = new Date(windowEnd.getTime() + 3600000);

  return now >= windowStart && now <= oneHourAfter;
}

export function useFeedbackPrompt({
  venueLocation,
  currentSunWindow,
  pageOpenedAt,
  predictedConfidence,
  hasSubmittedToday,
}: UseFeedbackPromptOptions): UseFeedbackPromptReturn {
  const [timeOnPage, setTimeOnPage] = useState(0);
  const [isUserAtVenue, setIsUserAtVenue] = useState<boolean | null>(null);

  // Update time on page every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOnPage(Date.now() - pageOpenedAt.getTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [pageOpenedAt]);

  // Request geolocation and check proximity using geolocation service
  const checkProximity = useCallback(async () => {
    const isNear = await geolocationService.isNearVenue(
      venueLocation,
      PROXIMITY_THRESHOLD_METERS
    );
    setIsUserAtVenue(isNear);
  }, [venueLocation]);

  // Check proximity after minimum time threshold
  useEffect(() => {
    if (timeOnPage >= MIN_TIME_AT_VENUE && isUserAtVenue === null) {
      checkProximity();
    }
  }, [timeOnPage, isUserAtVenue, checkProximity]);

  // Determine if prompt should be shown
  const showPrompt = (() => {
    // Never show if already submitted today
    if (hasSubmittedToday) return false;

    // Don't prompt for low-confidence predictions
    if (predictedConfidence < MIN_CONFIDENCE) return false;

    // Check time threshold based on proximity
    const minTime = isUserAtVenue ? MIN_TIME_AT_VENUE : MIN_TIME_NOT_AT_VENUE;
    if (timeOnPage < minTime) return false;

    // Only show during or shortly after sun window
    if (!isWithinSunWindowTimeframe(currentSunWindow)) return false;

    return true;
  })();

  return {
    showPrompt,
    isUserAtVenue,
    timeOnPage,
  };
}
