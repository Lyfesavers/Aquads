import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, polygon, arbitrum, optimism, base, bsc, avalanche } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// Sui wallet imports
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';

// Create a query client for React Query
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

// Create Wagmi config with more comprehensive chain support
const config = createConfig({
  chains: [mainnet, polygon, arbitrum, optimism, base, bsc, avalanche],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'your-project-id',
      metadata: {
        name: 'AquaSwap',
        description: 'The Ultimate Cross-Chain DEX',
        url: 'https://aquaswap.com',
        icons: ['https://aquaswap.com/favicon.ico']
      }
    }),
    coinbaseWallet({
      appName: 'AquaSwap',
      appLogoUrl: 'https://aquaswap.com/favicon.ico'
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    [bsc.id]: http(),
    [avalanche.id]: http(),
  },
  ssr: false, // Disable SSR for client-side only
});

// Sui network configuration
const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl('localnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
  testnet: { url: getFullnodeUrl('testnet') },
});

export const LiFiProviders = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
          <WalletProvider>
            {children}
          </WalletProvider>
        </SuiClientProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
};

export default LiFiProviders; 