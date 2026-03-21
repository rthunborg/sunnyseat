'use client';

import { useServiceWorker } from '@/lib/hooks/useServiceWorker';

export function ServiceWorkerRegistration() {
  const { updateAvailable, applyUpdate } = useServiceWorker();

  if (!updateAvailable) return null;

  return (
    <div
      role="alert"
      className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-xl bg-accent-primary p-4 text-white shadow-lg md:left-auto md:right-6 md:max-w-sm"
    >
      <p className="text-sm font-medium">En ny version finns tillgänglig</p>
      <button
        onClick={applyUpdate}
        className="min-h-[48px] shrink-0 rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/30 transition-colors"
      >
        Uppdatera
      </button>
    </div>
  );
}
