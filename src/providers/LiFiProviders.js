import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a query client for React Query (required by LiFi)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (updated from cacheTime)
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

export const LiFiProviders = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export default LiFiProviders; 