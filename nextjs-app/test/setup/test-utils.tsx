import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { render, type RenderOptions } from '@testing-library/react';
import { routing } from '@/i18n/routing';
import { GeolocationProvider } from '@/hooks/useGeolocation';
import mapMessages from '@/messages/sv/map.json';
import onboardingMessages from '@/messages/sv/onboarding.json';

type SupportedLocale = (typeof routing.locales)[number];

type MessageValue = string | { [key: string]: MessageValue };
type Messages = Record<string, Record<string, MessageValue>>;

// `map` is sourced from the real Swedish JSON so component tests stay
// in sync with shipped copy without duplicate maintenance.
const DEFAULT_MESSAGES: Messages = {
  common: {
    appName: 'SunnySeat',
    loading: 'Laddar...',
    error: 'Kunde inte ladda',
    retry: 'Försök igen',
  },
  map: mapMessages as Record<string, MessageValue>,
  onboarding: onboardingMessages as Record<string, MessageValue>,
  venue: {},
  premium: {},
  feedback: {},
  about: {},
};

/**
 * Build a QueryClient configured for deterministic test runs:
 * no retries, fresh data per test (no inter-test cache leakage), no
 * window-focus refetches.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}

export type TestProviderOptions = {
  locale?: SupportedLocale;
  messages?: Messages;
  queryClient?: QueryClient;
};

type TestProvidersProps = TestProviderOptions & { children: ReactNode };

export function TestProviders({
  children,
  locale = routing.defaultLocale,
  messages = DEFAULT_MESSAGES,
  queryClient,
}: TestProvidersProps) {
  const client = queryClient ?? createTestQueryClient();
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <GeolocationProvider>{children}</GeolocationProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

/**
 * Drop-in replacement for @testing-library/react's `render` that wraps the UI
 * in the same provider stack used by the app (QueryClient + next-intl).
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    locale,
    messages,
    queryClient,
    ...options
  }: TestProviderOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders locale={locale} messages={messages} queryClient={queryClient}>
        {children}
      </TestProviders>
    ),
    ...options,
  });
}

// Re-export everything from testing-library so tests only need one import.
export * from '@testing-library/react';
