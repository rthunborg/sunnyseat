'use client';

import { useEffect, useRef } from 'react';
import { Bike, Compass, ExternalLink, Footprints, Sun, X } from 'lucide-react';
import * as m from 'motion/react-m';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  DURATION_FAST_S,
  DURATION_SLOW_S,
  EASE_EXIT,
  EASE_SPRING,
} from '@/lib/constants/animation';
import { cn } from '@/lib/utils';

export type RouteOverlayUncertainty = {
  visible: string;
  accessible: string;
};

export type RouteOverlayLabels = {
  title: string;
  walk: string | null;
  bike: string | null;
  direction: string | null;
  /** Public prediction uncertainty context. Null means the row is omitted. */
  uncertainty?: RouteOverlayUncertainty | null;
  close: string;
  fallback: string;
  unavailable: string;
};

export type RouteOverlayProps = {
  labels: RouteOverlayLabels;
  fallbackHref: string;
  onDismiss: () => void;
  className?: string;
};

export function RouteOverlay({
  labels,
  fallbackHref,
  onDismiss,
  className,
}: RouteOverlayProps) {
  const shouldReduceMotion = useReducedMotion();
  const hasRouteText = Boolean(labels.walk || labels.bike || labels.direction || labels.uncertainty);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousActiveElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    closeButtonRef.current?.focus();

    return () => {
      if (previousActiveElement && document.contains(previousActiveElement)) {
        previousActiveElement.focus();
      }
    };
  }, []);

  return (
    <m.aside
      role="dialog"
      aria-label={labels.title}
      data-testid="route-overlay"
      className={cn(
        'absolute bottom-[calc(var(--size-mobile-nav-h)+var(--spacing)*18)] left-4 right-4 z-modal rounded-card bg-surface-cream p-4 text-text-primary shadow-card lg:bottom-6 lg:left-auto lg:right-6 lg:w-venue-list-desktop',
        className,
      )}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{
        opacity: 1,
        y: shouldReduceMotion ? undefined : 0,
        transition: {
          duration: shouldReduceMotion ? DURATION_FAST_S : DURATION_SLOW_S,
          ease: shouldReduceMotion ? EASE_EXIT : EASE_SPRING,
        },
      }}
      exit={{
        opacity: 0,
        y: shouldReduceMotion ? undefined : 12,
        transition: { duration: DURATION_FAST_S, ease: EASE_EXIT },
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onDismiss();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-heading-md text-text-primary">{labels.title}</h2>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label={labels.close}
          onClick={onDismiss}
          className="flex size-11 shrink-0 items-center justify-center rounded-pill text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-body-sm text-text-body">
        {labels.walk && (
          <RouteOverlayRow icon={<Footprints aria-hidden="true" className="size-4" />}>
            {labels.walk}
          </RouteOverlayRow>
        )}
        {labels.bike && (
          <RouteOverlayRow icon={<Bike aria-hidden="true" className="size-4" />}>
            {labels.bike}
          </RouteOverlayRow>
        )}
        {labels.direction && (
          <RouteOverlayRow icon={<Compass aria-hidden="true" className="size-4" />}>
            {labels.direction}
          </RouteOverlayRow>
        )}
        {labels.uncertainty && (
          <RouteOverlayRow icon={<Sun aria-hidden="true" className="size-4" />}>
            <span aria-hidden="true">{labels.uncertainty.visible}</span>
            <span className="sr-only">{labels.uncertainty.accessible}</span>
          </RouteOverlayRow>
        )}
        {!hasRouteText && (
          <p className="rounded-card bg-surface-muted px-3 py-2 text-body-sm-medium text-text-body">
            {labels.unavailable}
          </p>
        )}
      </div>
      <a
        href={fallbackHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-11 items-center gap-1 rounded-pill text-label-md text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
      >
        {labels.fallback}
        <ExternalLink aria-hidden="true" className="size-3.5" />
      </a>
    </m.aside>
  );
}

function RouteOverlayRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p className="flex min-h-11 items-center gap-2 rounded-card bg-surface-muted px-3 py-2">
      <span className="text-amber-dark">{icon}</span>
      <span>{children}</span>
    </p>
  );
}
