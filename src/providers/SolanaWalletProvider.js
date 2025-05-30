import React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

// Minimal Solana wallet provider for LiFi widget compatibility
export const SolanaWalletProvider = ({ children }) => {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = clusterApiUrl(network);

  // Empty wallets array - let the LiFi widget handle wallet detection
  const wallets = [];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}; 