'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { AuthProvider } from '../components/providers/AuthProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime:            60 * 1000,  // 1 minute
            gcTime:               10 * 60 * 1000, // 10 minutes
            retry:                1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: '12px',
                fontFamily:   'var(--font-body)',
                fontSize:     '14px',
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
      {process.env['NODE_ENV'] === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
