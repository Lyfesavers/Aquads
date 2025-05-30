import { createAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks';

// Get project ID from environment variables
export const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || "2f5a2c8b8f4e6d3a1b9c7e5f8a2d4c6b";

if (!projectId) {
  console.warn('WalletConnect Project ID not found. Solana wallet support may be limited.');
}

// Setup Solana adapter with popular wallets
const solanaAdapter = new SolanaAdapter({
  wallets: [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ]
});

// App metadata for WalletConnect
const metadata = {
  name: 'Aquads',
  description: 'Aquads - Web3 Crypto Hub & Freelancer Marketplace',
  url: 'https://aquads.xyz',
  icons: ['https://aquads.xyz/logo192.png']
};

// Create AppKit modal for Solana wallet support
// This runs independently of the LiFi widget
let modal;

try {
  modal = createAppKit({
    adapters: [solanaAdapter],
    networks: [solana, solanaTestnet, solanaDevnet],
    metadata,
    projectId,
    themeMode: 'dark',
    features: {
      analytics: true,
      email: false, // Keep it simple for now
      socials: [], // Keep it simple for now
      emailShowWallets: true
    }
  });
} catch (error) {
  console.warn('Failed to initialize Reown AppKit for Solana:', error);
}

export { modal }; 