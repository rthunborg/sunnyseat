'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronRight, Info, Map, MessageSquare, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/custom/layout/LanguageSwitcher';
import {
  DURATION_FAST_S,
  DURATION_SLOW_S,
  EASE_ENTER,
  EASE_EXIT,
} from '@/lib/constants/animation';
import { focusableElements, trapFocus } from '@/lib/utils/focus-trap';

const ROW_CLASS =
  'flex w-full items-center gap-3.5 border-b border-divider px-3 py-3.5 text-left outline-none transition-colors hover:bg-surface-sand/60 focus-visible:bg-surface-sand/60 focus-visible:ring-2 focus-visible:ring-amber-primary';

/**
 * Settings modal (Claude Design "Inställningar"): feedback + about rows, and —
 * on mobile only — the language switcher (desktop has it in the top nav). Opened
 * from the desktop nav and the mobile map settings buttons. Shell matches
 * DatePickerDialog (overlay, focus trap, Esc, responsive bottom-sheet/centred).
 */
export function SettingsModal({
  open,
  onClose,
  onOpenFeedback,
  onOpenGuide,
}: {
  open: boolean;
  onClose: () => void;
  onOpenFeedback: () => void;
  onOpenGuide: (restoreFocusElement?: HTMLElement | null) => void;
}) {
  const t = useTranslations('common.settings');
  const shouldReduceMotion = useReducedMotion() ?? false;
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    focusableElements(dialogRef.current)[0]?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-modal flex items-end justify-center bg-text-primary/30 backdrop-blur-standard lg:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : DURATION_FAST_S, ease: EASE_ENTER }}
          onPointerDown={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('title')}
            data-testid="settings-modal"
            tabIndex={-1}
            className="relative max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-t-panel bg-surface-cream p-6 text-text-primary shadow-sheet-full-up outline-none lg:max-w-[28.75rem] lg:rounded-panel"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
            transition={{ duration: shouldReduceMotion ? 0 : DURATION_SLOW_S, ease: EASE_EXIT }}
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
              aria-label={t('closeAria')}
              onClick={onClose}
              data-testid="settings-close"
              className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-pill bg-surface-muted text-text-body outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
            >
              <X aria-hidden="true" className="size-4" />
            </button>

            <h2 className="text-center text-heading-md text-text-primary">{t('title')}</h2>
            <p className="mb-5 text-center text-body-sm text-text-muted">{t('subtitle')}</p>

            <button
              type="button"
              onClick={onOpenFeedback}
              data-testid="settings-row-feedback"
              className={ROW_CLASS}
            >
              <RowIcon>
                <MessageSquare aria-hidden="true" className="size-[18px]" />
              </RowIcon>
              <RowText title={t('feedbackTitle')} sub={t('feedbackSubtitle')} />
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-text-muted" />
            </button>

            <button
              type="button"
              onClick={(event) => onOpenGuide(event.currentTarget)}
              data-testid="settings-row-guide"
              className={ROW_CLASS}
            >
              <RowIcon>
                <Map aria-hidden="true" className="size-[18px]" />
              </RowIcon>
              <RowText title={t('guideTitle')} sub={t('guideSubtitle')} />
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-text-muted" />
            </button>

            <Link
              href="/about"
              onClick={onClose}
              data-testid="settings-row-about"
              className={ROW_CLASS}
            >
              <RowIcon>
                <Info aria-hidden="true" className="size-[18px]" />
              </RowIcon>
              <RowText title={t('aboutTitle')} sub={t('aboutSubtitle')} />
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-text-muted" />
            </Link>

            {/* Mobile-only language switch — desktop exposes it in the top nav. */}
            <div className="mt-5 flex items-center justify-between gap-3 lg:hidden">
              <span className="text-label-lg text-text-body">{t('language')}</span>
              <LanguageSwitcher />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-5 min-h-11 w-full rounded-pill text-center text-label-lg text-text-body outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
            >
              {t('close')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RowIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-card bg-amber-primary/15 text-amber-dark">
      {children}
    </span>
  );
}

function RowText({ title, sub }: { title: string; sub: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-label-lg text-text-primary">{title}</span>
      <span className="block text-body-sm text-text-muted">{sub}</span>
    </span>
  );
}
