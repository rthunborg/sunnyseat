'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AMBER_CTA_BUTTON_CLASSNAME =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-pill gradient-cta-amber px-5 py-2 text-label-lg text-amber-cta-text shadow-cta outline-none transition-opacity duration-fast ease-default focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-40';

export type AmberCTAButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  loadingLabel?: string;
};

export function AmberCTAButton({
  children,
  className,
  disabled,
  isLoading = false,
  loadingLabel,
  ...props
}: AmberCTAButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        AMBER_CTA_BUTTON_CLASSNAME,
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
          <span>{loadingLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
