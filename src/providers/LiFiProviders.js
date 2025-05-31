import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a query client for React Query (required by LiFi)
// Following official LiFi documentation with mobile-optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes (increased for mobile)
      gcTime: 1000 * 60 * 15, // 15 minutes
      retry: 1, // Reduced retries for mobile
      refetchOnWindowFocus: false, // Prevent refetch on focus (mobile issue)
      refetchOnReconnect: false, // Prevent refetch on network reconnect
      refetchOnMount: false, // Prevent refetch on component mount
      refetchInterval: false, // Disable automatic refetching
    },
    mutations: {
      retry: 0, // No retries for mutations
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