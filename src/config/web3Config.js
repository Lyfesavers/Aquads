import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { base } from '@reown/appkit/networks';

// Get project ID from environment or use a placeholder
const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

// Configure metadata for wallet connections
const metadata = {
  name: 'Aquads',
  description: 'Mint your verified freelancer credentials on Base',
  url: 'https://aquads.xyz',
  icons: ['https://aquads.xyz/logo192.png']
};

// Configure wagmi adapter for Base chain
const wagmiAdapter = new WagmiAdapter({
  networks: [base],
  projectId,
  ssr: false
});

// Create the AppKit instance
createAppKit({
  adapters: [wagmiAdapter],
  networks: [base],
  projectId,
  metadata,
  features: {
    analytics: false,
    email: false,
    socials: false
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#3b82f6',
    '--w3m-border-radius-master': '8px'
  }
});

// Export the wagmi config for use in providers
export const wagmiConfig = wagmiAdapter.wagmiConfig;

