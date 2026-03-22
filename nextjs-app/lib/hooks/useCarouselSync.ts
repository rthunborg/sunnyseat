'use client';

import { useRef, useCallback, useEffect } from 'react';

/**
 * useCarouselSync — keeps a horizontal carousel scroll position
 * synchronised with the currently selected venue.
 *
 * Returns:
 *  - containerRef: attach to the <div> with overflow-x scroll
 *  - cardRefs:     Map<venueId, HTMLElement> — register each card
 *  - scrollToVenue: programmatically scroll a card into view
 */
export function useCarouselSync() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  /** Register a card element for a given venue ID */
  const registerCard = useCallback((venueId: string, el: HTMLElement | null) => {
    if (el) {
      cardRefs.current.set(venueId, el);
    } else {
      cardRefs.current.delete(venueId);
    }
  }, []);

  /** Scroll the carousel so that the card for `venueId` is centred */
  const scrollToVenue = useCallback((venueId: string) => {
    const container = containerRef.current;
    const card = cardRefs.current.get(venueId);
    if (!container || !card) return;

    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    // Calculate scroll needed to centre the card
    const scrollLeft =
      card.offsetLeft - container.offsetLeft - containerRect.width / 2 + cardRect.width / 2;

    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
  }, []);

  return { containerRef, registerCard, scrollToVenue };
}

/**
 * Hook to detect which card is closest to the center of the carousel viewport.
 * Useful for "snap-centre → select" behaviour.
 */
export function useCarouselActiveCard(
  containerRef: React.RefObject<HTMLDivElement | null>,
  cardRefs: React.RefObject<Map<string, HTMLElement>>,
  onActiveChange: (venueId: string | null) => void,
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;

        let closest: string | null = null;
        let minDist = Infinity;

        cardRefs.current.forEach((el, id) => {
          const cardRect = el.getBoundingClientRect();
          const cardCenterX = cardRect.left + cardRect.width / 2;
          const dist = Math.abs(cardCenterX - centerX);
          if (dist < minDist) {
            minDist = dist;
            closest = id;
          }
        });

        onActiveChange(closest);
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [containerRef, cardRefs, onActiveChange]);
}
