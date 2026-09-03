'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Link2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  DURATION_FAST_S,
  DURATION_SLOW_S,
  EASE_ENTER,
  EASE_EXIT,
} from '@/lib/constants/animation';
import { focusableElements, trapFocus } from '@/lib/utils/focus-trap';
import { cn } from '@/lib/utils';

/**
 * How long the "Kopierad" / "Copied" confirmation stays before reverting.
 * The reference `ShareModal.jsx` uses a literal 1800 ms — there is no exact
 * `--duration-*` token for it (tokens are 150/200/250/300 ms), so this is a
 * deliberate literal, flagged as a token-gap in the story Completion Notes.
 */
const COPIED_FEEDBACK_MS = 1800;

/**
 * A share target with a documented PUBLIC web share-intent. Each opens via a
 * plain `<a href target="_blank">` — NOT `window.open` and NOT a native-maps
 * URL — so the routing-boundary contract does not apply. Instagram / Snapchat /
 * Messenger are intentionally OMITTED: they have no reliable public web
 * share-intent, and rendering a silently-dead tile would reproduce the exact
 * "dead control" defect Epic 9 exists to fix. The copy-link row is the
 * guaranteed-functional primary path.
 */
type ShareTarget = {
  id: string;
  label: string;
  /** Brand color — intrinsic to the brand, legitimately NOT a design token. */
  bg: string;
  fg: string;
  glyph: string;
  /** Builds the share-intent href from the share URL + text. */
  href: (url: string, text: string) => string;
};

const SHARE_TARGETS: ShareTarget[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    bg: '#25d366',
    fg: '#ffffff',
    glyph: 'Wa',
    href: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    bg: '#1877f2',
    fg: '#ffffff',
    glyph: 'f',
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'x',
    label: 'X',
    bg: '#1b1b1e',
    fg: '#ffffff',
    glyph: 'X',
    href: (url, text) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    bg: '#26a5e4',
    fg: '#ffffff',
    glyph: 'Tg',
    href: (url, text) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: 'email',
    label: 'E-post',
    bg: '#735c00',
    fg: '#ffffff',
    glyph: '@',
    href: (url, text) => `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
  },
];

export type ShareModalProps = {
  open: boolean;
  onClose: () => void;
  venueName: string;
  url: string;
};

/**
 * Desktop/fallback share surface (Story 9.8): copy-link row + functional share
 * targets. Shell modeled on `SettingsModal.tsx` (responsive bottom-sheet on
 * mobile / centered card on desktop, focus trap, Esc-to-close, scrim-close),
 * visual on the reference `ShareModal.jsx`. Sits at `z-modal` (60), above the
 * venue-detail overlay at `z-bottom-sheet-full` (50).
 */
export function ShareModal({ open, onClose, venueName, url }: ShareModalProps) {
  const t = useTranslations('venue.detail.shareModal');
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);

  const shareText = t('shareText', { name: venueName });

  useEffect(() => {
    if (!open) return;
    focusableElements(dialogRef.current)[0]?.focus();
  }, [open]);

  // Reset the copied-confirmation whenever the modal closes so a re-open starts
  // in the default state, and clear any pending revert timer on unmount.
  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        return;
      }
    } catch {
      // Clipboard write can reject (permissions / insecure context). Leave the
      // URL visible for manual copy; do NOT flip to the "copied" state.
      return;
    }
    setCopied(true);
    if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
    copyResetTimerRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  };

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-modal flex items-end justify-center bg-text-primary/30 backdrop-blur-standard lg:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : DURATION_FAST_S, ease: EASE_ENTER }}
          onPointerDown={onClose}
        >
          <m.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('title', { name: venueName })}
            data-testid="share-modal"
            tabIndex={-1}
            className="relative max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-t-panel bg-surface-cream p-6 text-text-primary shadow-sheet-full-up outline-none lg:max-w-[28.75rem] lg:rounded-panel"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0, transition: { duration: 0, ease: EASE_EXIT } }
                : {
                    opacity: 0,
                    y: 32,
                    transition: { duration: DURATION_SLOW_S, ease: EASE_EXIT },
                  }
            }
            transition={{ duration: shouldReduceMotion ? 0 : DURATION_SLOW_S, ease: EASE_ENTER }}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
              }
              if (event.key === 'Tab') {
                trapFocus(event, dialogRef.current);
              }
            }}
          >
            <button
              type="button"
              aria-label={t('close')}
              onClick={onClose}
              data-testid="share-modal-close"
              className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-pill bg-surface-muted text-text-body outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
            >
              <X aria-hidden="true" className="size-4" />
            </button>

            <div className="pr-11">
              <h2 className="text-heading-md text-text-primary">{t('title', { name: venueName })}</h2>
              <p className="mt-1 text-body-sm text-text-muted">{t('subtitle')}</p>
            </div>

            {/* Share targets — each is a real, functional web share-intent. */}
            <div className="mt-5 grid grid-cols-5 gap-2">
              {SHARE_TARGETS.map((target) => (
                <a
                  key={target.id}
                  href={target.href(url, shareText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t('target', { target: target.label })}
                  aria-label={t('target', { target: target.label })}
                  data-testid={`share-target-${target.id}`}
                  className="flex flex-col items-center gap-2 rounded-card py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-14 items-center justify-center rounded-card font-display text-lg font-extrabold shadow-button-sm transition-transform duration-fast ease-default hover:-translate-y-0.5 motion-reduce:transition-none"
                    style={{ background: target.bg, color: target.fg }}
                  >
                    {target.glyph}
                  </span>
                  <span className="text-label-sm font-bold text-text-body">{target.label}</span>
                </a>
              ))}
            </div>

            {/* Copy-link row — the guaranteed-functional primary path. */}
            <div className="mt-5 flex items-center gap-3 rounded-card border border-divider bg-surface-cream p-2.5 pl-4">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-card bg-surface-sand text-amber-dark"
              >
                <Link2 className="size-4" />
              </span>
              <span
                data-testid="share-modal-url"
                className="min-w-0 flex-1 truncate font-mono text-body-sm font-semibold text-text-body"
              >
                {url}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                data-testid="share-modal-copy"
                aria-live="polite"
                className={cn(
                  'flex h-9 shrink-0 items-center gap-1.5 rounded-pill px-4 text-label-sm font-extrabold outline-none transition-colors duration-default ease-default focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none',
                  copied ? 'bg-surface-sand text-amber-dark' : 'bg-text-primary text-surface-cream',
                )}
              >
                {copied ? (
                  <>
                    <Check aria-hidden="true" className="size-3.5" />
                    {t('copied')}
                  </>
                ) : (
                  <>
                    <Copy aria-hidden="true" className="size-3.5" />
                    {t('copyLink')}
                  </>
                )}
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
