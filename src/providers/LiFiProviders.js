import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SolanaWalletProvider } from './SolanaWalletProvider';

// Create a query client for React Query (required by LiFi)
// Updated configuration for better mobile wallet compatibility
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (updated from cacheTime)
      retry: 2, // Reduced retries for faster mobile response
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Enable for mobile network changes
    },
    mutations: {
      retry: 1, // Reduced retries for mobile wallet operations
    },
  },
});

export const LiFiProviders = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <SolanaWalletProvider>
        {children}
      </SolanaWalletProvider>
    </QueryClientProvider>
  );
};

export default LiFiProviders; 