import type { Metadata, Viewport } from 'next';
import './globals.css';
import { QueryProvider } from '@/lib/providers/QueryProvider';
import { Footer } from '@/components/custom/Footer';
import { ServiceWorkerRegistration } from '@/components/composed/ServiceWorkerRegistration';
import { PwaInstallPrompt } from '@/components/composed/PwaInstallPrompt';

export const viewport: Viewport = {
  themeColor: '#0EA5E9',
};

export const metadata: Metadata = {
  title: 'SunnySeat — Hitta soliga uteplatser i Göteborg',
  description:
    'Hitta de bästa soliga uteserveringarna i Göteborg just nu. SunnySeat kombinerar soldata i realtid med väderprognos så att du alltid hittar en plats i solen.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SunnySeat',
  },
  icons: {
    apple: [{ url: '/icons/icon-180.png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'SunnySeat — Hitta soliga uteplatser i Göteborg',
    description:
      'Hitta de bästa soliga uteserveringarna i Göteborg just nu. Soldata i realtid och väderprognos.',
    url: 'https://sunnyseat.se',
    siteName: 'SunnySeat',
    type: 'website',
    locale: 'sv_SE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SunnySeat — Hitta soliga uteplatser i Göteborg',
    description:
      'Hitta de bästa soliga uteserveringarna i Göteborg just nu. Soldata i realtid och väderprognos.',
  },
};

export default function RootLayout(props: {
  children: React.ReactNode;
  modal?: React.ReactNode;
}) {
  const { children, modal } = props;
  return (
    <html lang="sv" style={{ colorScheme: 'light' }}>
      <body className="flex flex-col min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3 focus:bg-surface-primary focus:text-text-primary focus:rounded-button"
        >
          Hoppa till innehåll
        </a>
        <QueryProvider>
          <div className="flex-1">{children}</div>
          {modal}
          <Footer />
          <PwaInstallPrompt />
          <ServiceWorkerRegistration />
        </QueryProvider>
      </body>
    </html>
  );
}
