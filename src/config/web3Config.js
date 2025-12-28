import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { base } from '@reown/appkit/networks';

// Get project ID from environment
const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID;

console.log('Web3Config: Project ID available:', !!projectId, projectId?.substring(0, 8) + '...');

// Configure metadata for wallet connections - use current origin to avoid mismatch
const metadata = {
  name: 'Aquads',
  description: 'Mint your verified freelancer credentials on Base',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://www.aquads.xyz',
  icons: ['https://www.aquads.xyz/logo192.png']
};

// Configure wagmi adapter for Base chain
const wagmiAdapter = new WagmiAdapter({
  networks: [base],
  projectId: projectId || 'demo',
  ssr: false
});

// Always create AppKit - it will show a warning if project ID is missing
try {
  createAppKit({
    adapters: [wagmiAdapter],
    networks: [base],
    projectId: projectId || 'demo',
    metadata,
    features: {
      analytics: false,
      email: false,
      socials: false,
      allWallets: true
    },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#3b82f6',
      '--w3m-border-radius-master': '8px',
      '--w3m-z-index': '999999'
    }
  });
  console.log('Web3Config: AppKit created successfully');
} catch (error) {
  console.error('Web3Config: Failed to create AppKit:', error);
}

// Export the wagmi config for use in providers
export const wagmiConfig = wagmiAdapter.wagmiConfig;
export { projectId };

