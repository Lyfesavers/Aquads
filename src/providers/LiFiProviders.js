import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

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

// Solana configuration for LiFi widget
const endpoint = clusterApiUrl(WalletAdapterNetwork.Mainnet);

// Empty wallets array - LiFi widget will handle wallet detection automatically
// This follows the LiFi documentation for Solana wallet integration
const wallets = [];

export const LiFiProviders = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect={false}>
          {children}
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
};

export default LiFiProviders; 