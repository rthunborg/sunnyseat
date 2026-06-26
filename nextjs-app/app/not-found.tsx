import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { NotFoundPage } from '@/components/custom/NotFoundPage';

/**
 * Global unmatched-route 404 (Story 7.2).
 *
 * This file sits at the app root, OUTSIDE the `[locale]` segment, so it renders
 * OUTSIDE the `NextIntlClientProvider` opened in `app/[locale]/layout.tsx`.
 * Next.js also routes here when `[locale]/layout.tsx` rejects an unknown locale
 * via `notFound()` (e.g. the deliberately-invalid `/__sunnyseat-invalid` gate
 * route), so this is the single 404 boundary for the whole app.
 *
 * To let the client `NotFoundPage` read copy from `next-intl` (AC6) we resolve
 * the active locale + messages on the server — next-intl reads the same request
 * config that already powers `<html lang>` in the root layout — and open our own
 * provider here. Unmatched/default requests resolve to `defaultLocale` (sv);
 * an `/en/...` invalid path resolves to `en`.
 */
export default async function NotFound() {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <NotFoundPage />
    </NextIntlClientProvider>
  );
}
