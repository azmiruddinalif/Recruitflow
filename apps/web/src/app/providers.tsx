'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecruitFlowProvider } from '@/stores/recruitflow-store';
import { PwaRegister } from '@/components/pwa-register';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RecruitFlowProvider>
        <PwaRegister />
        {children}
      </RecruitFlowProvider>
    </QueryClientProvider>
  );
}
