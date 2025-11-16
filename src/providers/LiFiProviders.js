import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a query client for React Query (required by LiFi)
// Following official LiFi documentation with mobile-optimized settings
// AND LI.FI best practices: Cache GET /tokens, GET /chains, and static endpoints
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

// Configure specific caching for LI.FI static endpoints (best practice)
// This ensures GET /tokens and GET /chains are cached longer to avoid rate limits
// LI.FI widget uses these query keys internally
queryClient.setQueryDefaults(['tokens'], {
  staleTime: 1000 * 60 * 30, // 30 minutes for tokens (static data, changes rarely)
  gcTime: 1000 * 60 * 60, // 1 hour garbage collection
});

queryClient.setQueryDefaults(['chains'], {
  staleTime: 1000 * 60 * 60, // 1 hour for chains (very static, changes very rarely)
  gcTime: 1000 * 60 * 120, // 2 hours garbage collection
});

export const LiFiProviders = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export default LiFiProviders;