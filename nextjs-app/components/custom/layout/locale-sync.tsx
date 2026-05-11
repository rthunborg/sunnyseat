'use client';

import { useLocaleSync } from '@/hooks/use-locale-sync';

/**
 * Mounts the AC4 locale-sync effect inside the NextIntlClientProvider tree.
 * Renders nothing; its only job is to run the hook once per navigation so the
 * active URL locale stays aligned with the user's stored / browser preference.
 */
export function LocaleSync(): null {
  useLocaleSync();
  return null;
}
