'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { domMin, LazyMotion } from 'motion/react';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domMin} strict>
        {children}
      </LazyMotion>
    </QueryClientProvider>
  );
}
