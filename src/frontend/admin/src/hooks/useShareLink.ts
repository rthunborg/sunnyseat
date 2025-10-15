import { useCallback } from 'react';
import type { VenueDetails } from '../types';
import { generateSlug } from '../services/api/venueService';

/**
 * Custom hook for generating and sharing deep links to venue pages
 * Supports Web Share API with clipboard fallback
 * 
 * @param venue - Venue details for link generation
 * @param date - Optional date to include in link
 * @returns Object with shareUrl and share function
 */
export const useShareLink = (venue: VenueDetails | null | undefined, date?: Date) => {
  const shareUrl = venue
    ? `${window.location.origin}/v/${generateSlug(venue.name, venue.id)}${
        date ? `?date=${formatDate(date)}` : ''
      }`
    : '';

  const share = useCallback(async () => {
    if (!venue) return;

    const shareData = {
      title: `${venue.name} - SunnySeat`,
      text: `Check out the sun forecast for ${venue.name}!`,
      url: shareUrl,
    };

    try {
      // Try Web Share API (mobile)
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      // Fallback to clipboard (desktop)
      await navigator.clipboard.writeText(shareUrl);
      
      // Show success notification (could be enhanced with toast library)
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Error sharing:', error);
      // Show error notification
      alert('Failed to share link. Please try again.');
    }
  }, [venue, shareUrl]);

  return { shareUrl, share };
};

/**
 * Format date to YYYY-MM-DD string
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
