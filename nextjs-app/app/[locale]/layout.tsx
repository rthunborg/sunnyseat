import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { LocaleSync } from '@/components/custom/layout/locale-sync';
import { AppContextProviders } from '@/components/custom/layout/AppContextProviders';
import { ResponsiveLayout } from '@/components/custom/layout/ResponsiveLayout';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <NextIntlClientProvider locale={locale}>
      <LocaleSync />
      <AppContextProviders>
        <ResponsiveLayout>{children}</ResponsiveLayout>
      </AppContextProviders>
    </NextIntlClientProvider>
  );
}
