import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Manrope } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import { ServiceWorkerProvider } from './ServiceWorkerProvider';
import { Providers } from './providers';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SunnySeat',
  description: 'Hitta soliga uteserveringar i Göteborg',
  // PWA installability (Story 7.3 AC1): link the web app manifest
  // (served from `app/manifest.ts`) and the iOS add-to-home-screen icon
  // + standalone web-app hints (iOS has no `beforeinstallprompt`).
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SunnySeat',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

// `theme_color` for the browser/OS chrome. Next 16 requires the theme colour
// in the `viewport` export, not `metadata`. Matches `--color-amber-primary`.
export const viewport: Viewport = {
  themeColor: '#ffbf00',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolve the active locale from next-intl so the <html lang> attribute
  // tracks the user's locale. The nested [locale] layout cannot override
  // <html> attributes because Next.js only emits a single <html> root.
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${plusJakartaSans.variable} ${manrope.variable}`}
    >
      <body>
        {/* Register the app-shell service worker (Story 7.3 AC2) behind a
            client boundary — see ServiceWorkerProvider for why the wrapper is
            required. */}
        <ServiceWorkerProvider>
          <Providers>{children}</Providers>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
