import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import the config (this also initializes AppKit)
import { wagmiConfig } from '../config/web3Config';

// Create a query client for wagmi
const queryClient = new QueryClient();

/**
 * Web3Provider wraps children with wagmi and react-query providers
 * for Reown AppKit wallet connectivity
 */
const Web3Provider = ({ children }) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default Web3Provider;

