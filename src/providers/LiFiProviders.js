import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, polygon, arbitrum, optimism, base, bsc } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

// Create Wagmi config
const config = createConfig({
  chains: [mainnet, polygon, arbitrum, optimism, base, bsc],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'your-project-id',
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    [bsc.id]: http(),
  },
});

export const LiFiProviders = ({ children }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default LiFiProviders; 