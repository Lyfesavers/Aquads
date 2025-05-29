import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { createAppKit } from '@reown/appkit/react';
import { mainnet, polygon, arbitrum, optimism, base, bsc, avalanche } from '@reown/appkit/networks';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

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

// Get projectId from environment variable
const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'your-project-id';

// Create metadata object
const metadata = {
  name: 'AquaSwap',
  description: 'The Ultimate Cross-Chain DEX',
  url: 'https://www.aquads.xyz',
  icons: ['https://www.aquads.xyz/AquaSwap.svg']
};

// Set the networks - using more comprehensive chain support
const networks = [mainnet, polygon, arbitrum, optimism, base, bsc, avalanche];

// Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false // Disable SSR for client-side only
});

// Create AppKit modal
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: true // Optional - defaults to your Cloud configuration
  }
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
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
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