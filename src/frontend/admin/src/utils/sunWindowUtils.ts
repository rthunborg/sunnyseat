// Utility functions for sun window and ETA calculations
// Story 4.2: Patio Information Cards & Results

import type { PatioData, ConfidenceLevel } from '../types/timeline';

/**
 * Calculate ETA to next sun window across all patios
 * @param patios Array of patio data
 * @returns Human-readable ETA string
 */
export function calculateNextSunETA(patios: PatioData[]): string {
  const allNextWindows = patios
    .filter((p) => p.nextSunWindow)
    .map((p) => p.nextSunWindow!.startTime)
    .sort((a, b) => a.getTime() - b.getTime());

  if (allNextWindows.length === 0) {
    return 'No sun expected in the next 4 hours';
  }

  const nextTime = allNextWindows[0];
  const minutesUntil = Math.floor((nextTime.getTime() - Date.now()) / 60000);

  if (minutesUntil < 0) {
    return 'Sun available now';
  }

  if (minutesUntil < 60) {
    return `Sun expected in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(minutesUntil / 60);
    const remainingMinutes = minutesUntil % 60;
    
    if (remainingMinutes === 0) {
      return `Sun expected in ${hours} hour${hours > 1 ? 's' : ''}`;
    }
    
    return `Sun expected in ${hours}h ${remainingMinutes}m`;
  }
}

/**
 * Get confidence level based on percentage
 * @param confidence Confidence percentage (0-100)
 * @param isEstimated Whether the value is estimated (caps at 60%)
 * @returns Confidence level classification
 */
export function getConfidenceLevel(
  confidence: number,
  isEstimated: boolean = false
): ConfidenceLevel {
  // Cap estimated values at 60%
  const cappedConfidence = isEstimated ? Math.min(confidence, 60) : confidence;

  if (cappedConfidence >= 70) {
    return 'High';
  } else if (cappedConfidence >= 40) {
    return 'Medium';
  } else {
    return 'Low';
  }
}

/**
 * Get confidence badge color based on level
 * @param level Confidence level
 * @returns Tailwind color class
 */
export function getConfidenceBadgeColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'High':
      return 'bg-green-500 text-white';
    case 'Medium':
      return 'bg-amber-500 text-white';
    case 'Low':
      return 'bg-gray-400 text-white';
  }
}

/**
 * Get confidence level description
 * @param level Confidence level
 * @returns Human-readable description
 */
export function getConfidenceDescription(level: ConfidenceLevel): string {
  switch (level) {
    case 'High':
      return 'Great prediction accuracy';
    case 'Medium':
      return 'Moderate confidence';
    case 'Low':
      return 'Lower confidence, check conditions';
  }
}

/**
 * Format distance in meters to human-readable string
 * @param meters Distance in meters
 * @returns Formatted distance string
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
}

/**
 * Get sun status color for visualizations
 * @param status Sun exposure status
 * @returns Tailwind color class
 */
export function getSunStatusColor(status: 'Sunny' | 'Partial' | 'Shaded'): string {
  switch (status) {
    case 'Sunny':
      return 'bg-green-500'; // #22C55E
    case 'Partial':
      return 'bg-amber-500'; // #F59E0B
    case 'Shaded':
      return 'bg-gray-400'; // #9CA3AF
  }
}

/**
 * Get sun status text color
 * @param status Sun exposure status
 * @returns Tailwind text color class
 */
export function getSunStatusTextColor(status: 'Sunny' | 'Partial' | 'Shaded'): string {
  switch (status) {
    case 'Sunny':
      return 'text-green-600';
    case 'Partial':
      return 'text-amber-600';
    case 'Shaded':
      return 'text-gray-600';
  }
}

/**
 * Sort patios by distance and sun status
 * @param patios Array of patio data
 * @returns Sorted array with sunny patios first, then by distance
 */
export function sortPatiosByPriority(patios: PatioData[]): PatioData[] {
  return [...patios].sort((a, b) => {
    // Prioritize sunny patios
    const sunStatusPriority = {
      'Sunny': 0,
      'Partial': 1,
      'Shaded': 2,
    };

    const aSunPriority = sunStatusPriority[a.currentSunStatus];
    const bSunPriority = sunStatusPriority[b.currentSunStatus];

    if (aSunPriority !== bSunPriority) {
      return aSunPriority - bSunPriority;
    }

    // Then sort by distance
    return a.distanceMeters - b.distanceMeters;
  });
}

/**
 * Check if there are enough sunny patios (3 or more)
 * @param patios Array of patio data
 * @returns True if 3 or more patios are currently sunny
 */
export function hasEnoughSunnyPatios(patios: PatioData[]): boolean {
  const sunnyCount = patios.filter((p) => p.currentSunStatus === 'Sunny').length;
  return sunnyCount >= 3;
}
