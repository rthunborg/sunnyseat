'use client';

import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'sunnyseat-pwa-dismissed';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Don't show if already dismissed
    if (localStorage.getItem(DISMISS_KEY)) return;

    // Don't show if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
    setDeferredPrompt(null);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-16 left-4 right-4 z-40 flex items-center justify-between gap-3 rounded-xl bg-surface-primary p-4 shadow-lg border border-border-default md:left-auto md:right-6 md:max-w-sm"
    >
      <p className="text-sm font-medium text-text-primary">Installera SunnySeat för snabb åtkomst</p>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={handleDismiss}
          className="min-h-[48px] min-w-[48px] rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-secondary transition-colors"
          aria-label="Avvisa installationserbjudande"
        >
          Nej tack
        </button>
        <button
          onClick={handleInstall}
          className="min-h-[48px] rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:bg-accent-primary/90 transition-colors"
        >
          Installera
        </button>
      </div>
    </div>
  );
}
