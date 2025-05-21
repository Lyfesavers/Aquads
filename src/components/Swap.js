import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import logger from '../utils/logger';
// Add Solana imports
import * as solanaWeb3 from '@solana/web3.js';
import bs58 from 'bs58';
// Import PropTypes for prop validation
import PropTypes from 'prop-types';

// Replace the hideDuckHuntStyle with a simpler, more compatible version
const hideDuckHuntStyle = `
  <style>
    /* Basic targeting for duck hunt buttons */
    div[style*="position: fixed"][style*="bottom"][style*="right"],
    div[data-testid="duck-hunt-button"],
    [id*="duck-hunt"],
    [id*="start-duck"],
    [class*="duck-hunt"],
    .start-duck-hunt,
    #start-duck-hunt,
    #duck-hunt-button,
    .duck-hunt-button {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
    
    /* Notification button fix */
    .notification-button {
      z-index: 5 !important;
    }
  </style>
`;

const Swap = ({ currentUser, showNotification }) => {
  const [fromToken, setFromToken] = useState('');
  const [toToken, setToToken] = useState('');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletType, setWalletType] = useState(''); // Wallet connection type
  const [chains, setChains] = useState([]);
  const [tokens, setTokens] = useState({});  // Changed to object to store tokens per chain
  const [fromChain, setFromChain] = useState('');
  const [toChain, setToChain] = useState('');
  const [fromChainTokens, setFromChainTokens] = useState([]);
  const [toChainTokens, setToChainTokens] = useState([]);
  const [apiKeyStatus, setApiKeyStatus] = useState('unknown');
  const [walletOptions, setWalletOptions] = useState([]);
  // New state for wallet connection modal
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [installingWallet, setInstallingWallet] = useState(null);
  
  // Add Solana-specific state
  const [solanaConnection, setSolanaConnection] = useState(null);
  const [isSolanaFromChain, setIsSolanaFromChain] = useState(false);
  const [isSolanaToChain, setIsSolanaToChain] = useState(false);
  const [solanaWallets, setSolanaWallets] = useState([]);
  const [solanaProvider, setSolanaProvider] = useState(null);
  
  const LIFI_API_KEY = process.env.REACT_APP_LIFI_API_KEY;
  const FEE_PERCENTAGE = 0.5; // 0.5% fee
  const FEE_RECIPIENT = process.env.REACT_APP_FEE_WALLET || '0x98BC1BEC892d9f74B606D478E6b45089D2faAB05'; // Default to a wallet if not set
  
  // Add a state to track if we're showing user tokens first
  const [showUserTokensFirst, setShowUserTokensFirst] = useState(true);
  
  // Function to sort tokens with user tokens first if enabled
  const getSortedTokens = (tokenList) => {
    if (!showUserTokensFirst) return tokenList;
    
    return [...tokenList].sort((a, b) => {
      // Put user tokens first
      if (a.isUserToken && !b.isUserToken) return -1;
      if (!a.isUserToken && b.isUserToken) return 1;
      
      // Then sort by name
      return a.symbol.localeCompare(b.symbol);
    });
  };
  
  useEffect(() => {
    if (!LIFI_API_KEY) {
      logger.error('LIFI_API_KEY is not set in environment variables');
      setApiKeyStatus('missing');
      setError('API key not found. Please check your environment variables.');
    } else {
      // Don't log the full API key for security reasons
      const keyLength = LIFI_API_KEY.length;
      const maskedKey = keyLength > 6 
        ? `${LIFI_API_KEY.substring(0, 3)}...${LIFI_API_KEY.substring(keyLength - 3)}` 
        : '***';
      
      logger.info(`LIFI_API_KEY is set (${maskedKey}) with length: ${keyLength}`);
      setApiKeyStatus('available');
    }
    
    // Log environment for debugging
    logger.info('Environment check:', { 
      nodeEnv: process.env.NODE_ENV,
      hasApiKey: !!process.env.REACT_APP_LIFI_API_KEY,
      hasFeeWallet: !!process.env.REACT_APP_FEE_WALLET,
      isProduction: process.env.NODE_ENV === 'production'
    });
    
    // Initialize Solana connection
    const initializeSolanaConnection = async () => {
      try {
        // Connect to Solana mainnet with better performance settings
        const connectionConfig = {
          commitment: 'confirmed',
          disableRetryOnRateLimit: true,
          confirmTransactionInitialTimeout: 60000
        };
        
        // Instead of trying multiple endpoints that have CORS issues,
        // we'll just set up a minimal connection that won't be used for direct RPC calls
        // and rely on the Li.fi API for token data and swaps
        const connection = new solanaWeb3.Connection(
          'https://api.mainnet-beta.solana.com',
          connectionConfig
        );
        
        setSolanaConnection(connection);
        logger.info('Using Li.fi API for Solana operations to avoid CORS issues');
        
        // Set a flag to use Li.fi exclusively for Solana operations
        window.useLifiForSolana = true;
      } catch (error) {
        logger.error('Failed to initialize Solana connection:', error);
        window.useLifiForSolana = true;
      }
    };
    
    // Call the async function
    initializeSolanaConnection();
  }, [LIFI_API_KEY]);

  useEffect(() => {
    // Inject CSS to hide Duck Hunt button and other third-party elements
    const styleEl = document.createElement('div');
    styleEl.innerHTML = hideDuckHuntStyle;
    document.head.appendChild(styleEl);
    
    // Simple interval to check for and remove duck hunt buttons
    const intervalId = setInterval(() => {
      // Hide by matching ID patterns
      const hideSelectors = [
        '#duck-hunt-button',
        '#start-duck-hunt',
        '.duck-hunt-button',
        '.start-duck-hunt',
        '[data-testid="duck-hunt-button"]'
      ];
      
      // Apply each selector
      hideSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el) {
              el.style.display = 'none';
              el.style.visibility = 'hidden';
              el.style.opacity = '0';
              el.style.pointerEvents = 'none';
            }
          });
        } catch (e) {
          // Ignore errors from selector matching
        }
      });
      
      // Try to find by text content in a more browser-compatible way
      try {
        document.querySelectorAll('div, button, span').forEach(el => {
          if (el.textContent && 
              el.textContent.includes('Duck Hunt') &&
              el.getBoundingClientRect().bottom > window.innerHeight - 100) {
            el.style.display = 'none';
          }
        });
      } catch (e) {
        // Ignore errors in text content matching
      }
    }, 2000);
    
    // Fetch available chains
    const fetchChains = async () => {
      try {
        const response = await axios.get('https://li.quest/v1/chains', {
          headers: {
            'x-lifi-api-key': LIFI_API_KEY
          }
        });
        
        // Check if Solana is included in the chains
        const solanaChain = response.data.chains.find(chain => 
          chain.key?.toLowerCase() === 'sol' || 
          chain.name?.toLowerCase() === 'solana' ||
          chain.chainType === 'SVM'
        );
        
        // If Solana is not included in the response but we know it's supported,
        // add it manually to ensure it always appears
        if (!solanaChain) {
          response.data.chains.push({
            key: 'sol',
            chainType: 'SVM',
            name: 'Solana',
            coin: 'SOL',
            id: 'SOL', // Solana uses string IDs in li.fi
            mainnet: true,
            logoURI: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg'
          });
        }
        
        setChains(response.data.chains);
        
        if (response.data.chains.length > 0) {
          // Default to Ethereum
          const ethereumChain = response.data.chains.find(chain => chain.name.toLowerCase().includes('ethereum')) || response.data.chains[0];
          setFromChain(ethereumChain.id);
          
          // Default to a different chain for "to" (like Polygon)
          const polygonChain = response.data.chains.find(chain => chain.name.toLowerCase().includes('polygon'));
          if (polygonChain && polygonChain.id !== ethereumChain.id) {
            setToChain(polygonChain.id);
          } else {
            setToChain(response.data.chains[0].id);
          }
        }
      } catch (error) {
        logger.error('Error fetching chains:', error);
        setError('Failed to load blockchain networks. Please try again later.');
      }
    };
    fetchChains();
    
    return () => {
      clearInterval(intervalId);
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, [LIFI_API_KEY]);

  // Fetch all tokens for multiple chains at once
  useEffect(() => {
    const fetchAllTokens = async () => {
      if (!fromChain && !toChain) return;
      
      const chainsToFetch = Array.from(new Set([fromChain, toChain])).filter(Boolean).join(',');
      
      try {
        // Handle special case for Solana tokens
        const hasSolanaChain = chainsToFetch.includes('SOL') || 
                               chains.some(c => 
                                 chainsToFetch.includes(c.id) && 
                                 (c.chainType === 'SVM' || c.key === 'sol')
                               );
        
        let response;
        if (hasSolanaChain) {
          // Add SVM to chainTypes parameter for Solana (Single Value Machine)
          response = await axios.get(`https://li.quest/v1/tokens?chains=${chainsToFetch}&chainTypes=EVM,SVM&includeAllTokens=true`, {
            headers: {
              'x-lifi-api-key': LIFI_API_KEY
            }
          });
          
          // If there are no Solana tokens, manually add some common ones
          if (!response.data.tokens['SOL'] || response.data.tokens['SOL'].length === 0) {
            response.data.tokens['SOL'] = [
              {
                address: '11111111111111111111111111111111', // System program address for native SOL
                chainId: 'SOL',
                name: 'Solana',
                symbol: 'SOL',
                decimals: 9,
                logoURI: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg'
              },
              {
                address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana
                chainId: 'SOL',
                name: 'USD Coin',
                symbol: 'USDC',
                decimals: 6,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png'
              },
              {
                address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT on Solana
                chainId: 'SOL',
                name: 'Tether USD',
                symbol: 'USDT',
                decimals: 6,
                logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png'
              },
              {
                address: 'So11111111111111111111111111111111111111112', // Wrapped SOL
                chainId: 'SOL',
                name: 'Wrapped SOL',
                symbol: 'wSOL',
                decimals: 9,
                logoURI: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg'
              }
            ];
          }
        } else {
          // Regular EVM token request
          response = await axios.get(`https://li.quest/v1/tokens?chains=${chainsToFetch}&includeAllTokens=true`, {
            headers: {
              'x-lifi-api-key': LIFI_API_KEY
            }
          });
        }
        
        // Store tokens by chain
        setTokens(response.data.tokens || {});
        
        // Set tokens for from chain
        if (fromChain && response.data.tokens[fromChain]) {
          setFromChainTokens(response.data.tokens[fromChain]);
          if (response.data.tokens[fromChain].length > 0) {
            // Native token (ETH, MATIC, etc) is usually first
            setFromToken(response.data.tokens[fromChain][0].address);
          }
        }
        
        // Set tokens for to chain
        if (toChain && response.data.tokens[toChain]) {
          setToChainTokens(response.data.tokens[toChain]);
          if (response.data.tokens[toChain].length > 0) {
            // Prefer a stablecoin like USDC/USDT for the "to" token if available
            const stablecoin = response.data.tokens[toChain].find(t => 
              t.symbol.toLowerCase() === 'usdc' || 
              t.symbol.toLowerCase() === 'usdt' ||
              t.symbol.toLowerCase() === 'dai'
            );
            
            if (stablecoin) {
              setToToken(stablecoin.address);
            } else if (response.data.tokens[toChain].length > 1) {
              // Use second token if available to avoid same token
              setToToken(response.data.tokens[toChain][1].address);
            } else {
              // Fallback to first token
              setToToken(response.data.tokens[toChain][0].address);
            }
          }
        }
      } catch (error) {
        logger.error('Error fetching tokens:', error);
        setError('Failed to load tokens. Please try again later.');
      }
    };
    
    fetchAllTokens();
  }, [fromChain, toChain, LIFI_API_KEY, chains]);

  // Handle chain changes
  const handleFromChainChange = (e) => {
    const newChain = e.target.value;
    setFromChain(newChain);
    setFromToken(''); // Reset token when chain changes
    
    // Force the toChain to match fromChain (same-chain only approach)
    setToChain(newChain);
    setToToken(''); // Reset to token as well
    
    // Check if this is a Solana chain
    const chain = chains.find(c => c.id === newChain);
    const isSolana = chain?.chainType === 'SVM' || chain?.key === 'sol' || newChain === 'SOL';
    setIsSolanaFromChain(isSolana);
    setIsSolanaToChain(isSolana); // Set both to same value since we're forcing same chain
    
    // If tokens for this chain are already loaded
    if (tokens[newChain]) {
      setFromChainTokens(tokens[newChain]);
      setToChainTokens(tokens[newChain]); // Set both to same chain's tokens
      if (tokens[newChain].length > 0) {
        setFromToken(tokens[newChain][0].address);
        
        // Try to set a different token for "to" if available
        if (tokens[newChain].length > 1) {
          // Prefer a stablecoin for the "to" token if available
          const stablecoin = tokens[newChain].find(t => 
            t.symbol.toLowerCase() === 'usdc' || 
            t.symbol.toLowerCase() === 'usdt' ||
            t.symbol.toLowerCase() === 'dai'
          );
          
          if (stablecoin) {
            setToToken(stablecoin.address);
          } else {
            // Otherwise use the second token in the list
            setToToken(tokens[newChain][1].address);
          }
        } else {
          // If only one token, use it (though this swap wouldn't make sense)
          setToToken(tokens[newChain][0].address);
        }
      }
    }
  };
  
  const handleToChainChange = (e) => {
    // In the simplified same-chain only approach, we always set toChain equal to fromChain
    // This function is kept for backwards compatibility but effectively does nothing
    return;
  };
  
  // Fix MetaMask detection with much stronger verification
  const detectWallets = () => {
    const available = [];
    
    // Check if window.ethereum exists at all
    const hasEthereumProvider = typeof window.ethereum !== 'undefined';
    
    // CRITICAL: Add function to test if provider is actually accessible
    const testProviderAccess = async (provider) => {
      try {
        // Try to call a safe, read-only method to verify provider works
        await provider.request({ method: 'eth_chainId' });
        return true;
      } catch (error) {
        logger.error('Provider test failed:', error);
        return false;
      }
    };
    
    // MetaMask detection with thorough verification
    let isMetaMaskInstalled = false;
    if (hasEthereumProvider && window.ethereum?.isMetaMask) {
      // Verify it's not another wallet pretending to be MetaMask
      isMetaMaskInstalled = !window.ethereum.isCoinbaseWallet && 
                           !window.ethereum.isBraveWallet && 
                           !window.ethereum.isTrust && 
                           !window.ethereum.isTrustWallet;
    }
    
    available.push({ 
      type: 'evm',
      id: 'metamask', 
      name: 'MetaMask',
      icon: '🦊',
      installed: isMetaMaskInstalled,
      downloadUrl: 'https://metamask.io/download/'
    });
    
    // Detect Coinbase Wallet
    if (hasEthereumProvider && (window.ethereum?.isCoinbaseWallet || 
        (window.ethereum?.providers && window.ethereum.providers.find(p => p.isCoinbaseWallet)))) {
      available.push({ 
        type: 'evm', 
        id: 'coinbase',
        name: 'Coinbase Wallet',
        icon: '🔵',
        installed: true,
        downloadUrl: 'https://www.coinbase.com/wallet/downloads'
      });
    } else {
      available.push({ 
        type: 'evm', 
        id: 'coinbase',
        name: 'Coinbase Wallet',
        icon: '🔵',
        installed: false,
        downloadUrl: 'https://www.coinbase.com/wallet/downloads'
      });
    }
    
    // Detect Trust Wallet
    if (hasEthereumProvider && (window.ethereum?.isTrust || window.ethereum?.isTrustWallet)) {
      available.push({ 
        type: 'evm', 
        id: 'trust',
        name: 'Trust Wallet',
        icon: '🔒',
        installed: true,
        downloadUrl: 'https://trustwallet.com/download'
      });
    } else {
      available.push({ 
        type: 'evm', 
        id: 'trust',
        name: 'Trust Wallet',
        icon: '🔒',
        installed: false,
        downloadUrl: 'https://trustwallet.com/download'
      });
    }
    
    // Detect Brave Wallet
    if (hasEthereumProvider && window.ethereum?.isBraveWallet) {
      available.push({
        id: 'brave',
        name: 'Brave Wallet',
        icon: '🦁',
        type: 'evm',
        installed: true,
        downloadUrl: 'https://brave.com/wallet/'
      });
    } else {
      available.push({
        id: 'brave',
        name: 'Brave Wallet',
        icon: '🦁',
        type: 'evm',
        installed: false,
        downloadUrl: 'https://brave.com/wallet/'
      });
    }
    
    // WalletConnect is always available as an option
    available.push({
      type: 'evm',
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      installed: true, // Always available
      downloadUrl: 'https://walletconnect.com/'
    });
    
    // Detect Phantom Wallet (Solana)
    const hasPhantom = window.phantom?.solana || 
                       (typeof window.solana !== 'undefined' && window.solana.isPhantom);
    
    available.push({
      type: 'solana',
      id: 'phantom',
      name: 'Phantom',
      icon: '👻',
      installed: hasPhantom,
      downloadUrl: 'https://phantom.app/download'
    });
    
    // Detect Solflare Wallet (Solana)
    const hasSolflare = window.solflare?.isSolflare;
    
    available.push({
      type: 'solana',
      id: 'solflare',
      name: 'Solflare',
      icon: '🔆',
      installed: hasSolflare,
      downloadUrl: 'https://solflare.com/download'
    });
    
    setWalletOptions(available);
    const installedWallets = available.filter(w => w.installed);
    logger.info('Detected installed wallets:', installedWallets.map(w => w.name));
    
    return installedWallets.length > 0;
  };

  // Store wallet addresses by type for cross-chain swaps
  const storeWalletAddress = (type, address) => {
    if (type === 'evm' && address) {
      localStorage.setItem('lastEVMAddress', address);
      logger.info('Stored EVM address for cross-chain swaps:', address);
    } else if (type === 'solana' && address) {
      localStorage.setItem('lastSolanaAddress', address);
      logger.info('Stored Solana address for cross-chain swaps:', address);
    }
  };

  // Add a function to detect and set the current chain from the wallet
  const detectAndSetChain = async (walletType, provider) => {
    try {
      if (walletType === 'evm') {
        // Get the current chain ID from EVM wallet
        const chainId = await provider.request({ method: 'eth_chainId' });
        // Convert hex chainId to decimal if needed
        const decimalChainId = parseInt(chainId, 16).toString();
        
        // Find matching chain in our list
        const matchedChain = chains.find(c => c.id.toString() === decimalChainId);
        if (matchedChain) {
          logger.info(`Auto-detected chain: ${matchedChain.name} (${matchedChain.id})`);
          // Set both from and to chain to the detected chain
          setFromChain(matchedChain.id);
          
          // If tokens for this chain are already loaded, set them
          if (tokens[matchedChain.id]) {
            setFromChainTokens(tokens[matchedChain.id]);
            setToChainTokens(tokens[matchedChain.id]);
            
            // Set default tokens
            if (tokens[matchedChain.id].length > 0) {
              setFromToken(tokens[matchedChain.id][0].address);
              
              // Try to set a different token for "to" if available
              if (tokens[matchedChain.id].length > 1) {
                // Prefer a stablecoin for the "to" token if available
                const stablecoin = tokens[matchedChain.id].find(t => 
                  t.symbol.toLowerCase() === 'usdc' || 
                  t.symbol.toLowerCase() === 'usdt' ||
                  t.symbol.toLowerCase() === 'dai'
                );
                
                if (stablecoin) {
                  setToToken(stablecoin.address);
                } else {
                  // Otherwise use the second token in the list
                  setToToken(tokens[matchedChain.id][1].address);
                }
              }
            }
          }
        }
        
        // Set up listener for chain changes
        window.ethereum.on('chainChanged', (newChainId) => {
          logger.info('EVM wallet chain changed:', newChainId);
          // Convert hex chainId to decimal
          const decimalNewChainId = parseInt(newChainId, 16).toString();
          const newMatchedChain = chains.find(c => c.id.toString() === decimalNewChainId);
          
          if (newMatchedChain) {
            // Update chain selection in the UI
            setFromChain(newMatchedChain.id);
            
            // Reset tokens
            setFromToken('');
            setToToken('');
            
            // Load tokens for the new chain
            if (tokens[newMatchedChain.id]) {
              setFromChainTokens(tokens[newMatchedChain.id]);
              setToChainTokens(tokens[newMatchedChain.id]);
            }
          }
        });
      } 
      else if (walletType === 'solana') {
        // For Solana, we already know it's the Solana chain
        const solanaChain = chains.find(c => 
          c.key?.toLowerCase() === 'sol' || 
          c.name?.toLowerCase() === 'solana' ||
          c.chainType === 'SVM'
        );
        
        if (solanaChain) {
          logger.info(`Auto-detected Solana chain: ${solanaChain.name} (${solanaChain.id})`);
          setFromChain(solanaChain.id);
          
          // If tokens for Solana are already loaded, set them
          if (tokens[solanaChain.id]) {
            setFromChainTokens(tokens[solanaChain.id]);
            setToChainTokens(tokens[solanaChain.id]);
            
            // Set default tokens
            if (tokens[solanaChain.id].length > 0) {
              setFromToken(tokens[solanaChain.id][0].address);
              
              // Try to set a different token for "to" if available
              if (tokens[solanaChain.id].length > 1) {
                // Prefer a stablecoin for the "to" token if available
                const stablecoin = tokens[solanaChain.id].find(t => 
                  t.symbol.toLowerCase() === 'usdc' || 
                  t.symbol.toLowerCase() === 'usdt'
                );
                
                if (stablecoin) {
                  setToToken(stablecoin.address);
                } else {
                  // Otherwise use the second token in the list
                  setToToken(tokens[solanaChain.id][1].address);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error detecting chain:', error);
    }
  };

  // Fix wallet connection logic for MetaMask with stronger verification
  const connectWallet = async (walletId) => {
    try {
      // First check if user is authenticated to the website
      if (!currentUser) {
        setError('Please log in to securely connect your wallet');
        // Notify parent component that user needs to authenticate
        if (showNotification) {
          showNotification('Authentication required before connecting wallet', 'warning');
        }
        // Dispatch event to trigger login modal in parent component
        window.dispatchEvent(new CustomEvent('requestAuthentication'));
        return;
      }
      
      // Find the selected wallet
      const selectedWallet = walletOptions.find(w => w.id === walletId);
      
      if (!selectedWallet) {
        setError('Invalid wallet selection');
        return;
      }
      
      // Absolutely ensure wallet is installed
      if (!selectedWallet.installed) {
        setInstallingWallet(selectedWallet);
        return;
      }
      
      setLoading(true);
      
      // Handle Solana wallets
      if (selectedWallet.type === 'solana') {
        if (walletId === 'phantom') {
          try {
            // Get the provider from window.solana (Phantom) or window.phantom.solana
            const provider = window.phantom?.solana ?? window.solana;
            
            if (!provider) {
              throw new Error('Phantom wallet not found');
            }
            
            // Connect to the wallet
            const response = await provider.connect();
            const walletAddr = response.publicKey.toString();
            
            // Request signature to verify ownership
            const message = `Verify wallet ownership for ${currentUser.username} on AquaSwap - ${new Date().toISOString()}`;
            const encodedMessage = new TextEncoder().encode(message);
            const signatureResponse = await provider.signMessage(encodedMessage, 'utf8');
            
            if (!signatureResponse || !signatureResponse.signature) {
              throw new Error('Wallet signature verification failed');
            }
            
            // Save the provider and public key
            setSolanaProvider(provider);
            setWalletAddress(walletAddr);
            setWalletConnected(true);
            setWalletType('solana');
            setShowWalletModal(false);
            
            // Detect and set the chain automatically
            await detectAndSetChain('solana', provider);
            
            logger.info(`Authenticated user ${currentUser.username} connected Phantom Wallet:`, walletAddr);
            
            // Store wallet address
            storeWalletAddress('solana', walletAddr);
          } catch (error) {
            logger.error('Phantom wallet connection error:', error);
            setError('Failed to connect to Phantom wallet. Signature required to verify wallet ownership.');
            setWalletConnected(false);
          }
        }
        else if (walletId === 'solflare') {
          try {
            // Get the provider from window.solflare
            const provider = window.solflare;
            
            if (!provider) {
              throw new Error('Solflare wallet not found');
            }
            
            // Connect to the wallet
            const response = await provider.connect();
            const walletAddr = response.publicKey.toString();
            
            // Request signature to verify ownership
            const message = `Verify wallet ownership for ${currentUser.username} on AquaSwap - ${new Date().toISOString()}`;
            const encodedMessage = new TextEncoder().encode(message);
            const signatureResponse = await provider.signMessage(encodedMessage, 'utf8');
            
            if (!signatureResponse || !signatureResponse.signature) {
              throw new Error('Wallet signature verification failed');
            }
            
            // Save the provider and public key
            setSolanaProvider(provider);
            setWalletAddress(walletAddr);
            setWalletConnected(true);
            setWalletType('solana');
            setShowWalletModal(false);
            
            // Detect and set the chain automatically
            await detectAndSetChain('solana', provider);
            
            logger.info(`Connected Solflare Wallet:`, walletAddr);
            
            // Store wallet address
            storeWalletAddress('solana', walletAddr);
          } catch (error) {
            logger.error('Solflare wallet connection error:', error);
            setError('Failed to connect to Solflare wallet. Signature required to verify wallet ownership.');
            setWalletConnected(false);
          }
        }
        
        setLoading(false);
        return;
      }
      
      // MetaMask specific verification and connection
      if (walletId === 'metamask') {
        // Triple-check that MetaMask is really installed and accessible
        if (!window.ethereum || 
            !window.ethereum.isMetaMask || 
            window.ethereum.isCoinbaseWallet || 
            window.ethereum.isBraveWallet) {
          setError('MetaMask is not installed or not accessible');
          setLoading(false);
          setWalletConnected(false);
          return;
        }
        
        // Test that provider is actually working
        try {
          // First try a read-only method to check provider is working
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          
          if (!chainId) {
            throw new Error('Invalid chainId response');
          }
          
          // Request accounts
          const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts'
          });
          
          // Strict validation of returned accounts
          if (accounts && 
              Array.isArray(accounts) && 
              accounts.length > 0 && 
              accounts[0] && 
              typeof accounts[0] === 'string' && 
              accounts[0].startsWith('0x')) {
            
            // Require signature to verify wallet ownership
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // Create a unique message to sign
            const message = `Verify wallet ownership for ${currentUser.username} on AquaSwap - ${new Date().toISOString()}`;
            
            // Request personal signature
            const signature = await signer.signMessage(message);
            
            if (!signature) {
              throw new Error('Wallet signature verification failed');
            }
            
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
            setWalletType('evm');
            setShowWalletModal(false);
            
            // Detect and set the chain automatically
            await detectAndSetChain('evm', window.ethereum);
            
            logger.info(`Connected and verified MetaMask:`, accounts[0]);
            
            // Store wallet address
            storeWalletAddress('evm', accounts[0]);
          } else {
            throw new Error('Invalid account data from MetaMask');
          }
        } catch (error) {
          logger.error('MetaMask connection error:', error);
          setError(`Failed to connect to MetaMask: ${error.message || 'Signature required to verify wallet ownership'}`);
          setWalletConnected(false);
          setLoading(false);
          return;
        }
      }
      
      // Coinbase Wallet
      else if (walletId === 'coinbase') {
        if (!window.ethereum?.isCoinbaseWallet && 
            !(window.ethereum?.providers && window.ethereum.providers.find(p => p.isCoinbaseWallet))) {
          setError('Coinbase Wallet is not installed or not accessible');
          setLoading(false);
          return;
        }
        
        let provider = window.ethereum;
        // Use specific provider if multiple are available
        if (window.ethereum.providers) {
          const coinbaseProvider = window.ethereum.providers.find(p => p.isCoinbaseWallet);
          if (coinbaseProvider) provider = coinbaseProvider;
        }
        
        try {
          const accounts = await provider.request({ method: 'eth_requestAccounts' });
          if (accounts && accounts.length > 0 && accounts[0]) {
            // Require signature to verify wallet ownership
            const ethersProvider = new ethers.BrowserProvider(provider);
            const signer = await ethersProvider.getSigner();
            
            // Create a unique message to sign
            const message = `Verify wallet ownership for ${currentUser.username} on AquaSwap - ${new Date().toISOString()}`;
            
            // Request personal signature
            const signature = await signer.signMessage(message);
            
            if (!signature) {
              throw new Error('Wallet signature verification failed');
            }
            
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
            setWalletType('evm');
            setShowWalletModal(false);
            
            // Detect and set the chain automatically
            await detectAndSetChain('evm', provider);
            
            logger.info(`Connected and verified Coinbase Wallet:`, accounts[0]);
            
            // Store wallet address
            storeWalletAddress('evm', accounts[0]);
          } else {
            throw new Error('Invalid account response from Coinbase Wallet');
          }
        } catch (error) {
          logger.error('Coinbase Wallet connection error:', error);
          setError('Failed to connect to Coinbase Wallet. Signature required to verify wallet ownership.');
          setWalletConnected(false);
        }
      }
      // Trust Wallet
      else if (walletId === 'trust') {
        if (!window.ethereum?.isTrust && !window.ethereum?.isTrustWallet) {
          setError('Trust Wallet is not installed or not accessible');
          setLoading(false);
          return;
        }
        
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts && accounts.length > 0 && accounts[0]) {
            // Require signature to verify wallet ownership
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // Create a unique message to sign
            const message = `Verify wallet ownership for ${currentUser.username} on AquaSwap - ${new Date().toISOString()}`;
            
            // Request personal signature
            const signature = await signer.signMessage(message);
            
            if (!signature) {
              throw new Error('Wallet signature verification failed');
            }
            
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
            setWalletType('evm');
            setShowWalletModal(false);
            
            // Detect and set the chain automatically
            await detectAndSetChain('evm', provider);
            
            logger.info(`Connected and verified Trust Wallet:`, accounts[0]);
            
            // Store wallet address
            storeWalletAddress('evm', accounts[0]);
          } else {
            throw new Error('Invalid account response from Trust Wallet');
          }
        } catch (error) {
          logger.error('Trust Wallet connection error:', error);
          setError('Failed to connect to Trust Wallet. Signature required to verify wallet ownership.');
          setWalletConnected(false);
        }
      }
      // Brave Wallet
      else if (walletId === 'brave') {
        if (!window.ethereum?.isBraveWallet) {
          setError('Brave Wallet is not installed or not accessible');
          setLoading(false);
          return;
        }
        
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts && accounts.length > 0 && accounts[0]) {
            // Require signature to verify wallet ownership
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // Create a unique message to sign
            const message = `Verify wallet ownership for ${currentUser.username} on AquaSwap - ${new Date().toISOString()}`;
            
            // Request personal signature
            const signature = await signer.signMessage(message);
            
            if (!signature) {
              throw new Error('Wallet signature verification failed');
            }
            
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
            setWalletType('evm');
            setShowWalletModal(false);
            
            // Detect and set the chain automatically
            await detectAndSetChain('evm', provider);
            
            logger.info(`Connected and verified Brave Wallet:`, accounts[0]);
            
            // Store wallet address
            storeWalletAddress('evm', accounts[0]);
          } else {
            throw new Error('Invalid account response from Brave Wallet');
          }
        } catch (error) {
          logger.error('Brave Wallet connection error:', error);
          setError('Failed to connect to Brave Wallet. Signature required to verify wallet ownership.');
          setWalletConnected(false);
        }
      }
      // WalletConnect - placeholder for future implementation
      else if (walletId === 'walletconnect') {
        // For now, show message that we'd need to implement WalletConnect sdk
        setError('WalletConnect requires additional SDK implementation. Please select another wallet.');
        setLoading(false);
      }
      // Generic fallback for other wallet types
      else {
        setError('Unsupported wallet type selected.');
        setLoading(false);
        setWalletConnected(false);
      }
      
      setLoading(false);
    } catch (error) {
      logger.error('Wallet connection error:', error);
      setError('Failed to connect wallet. Signature required to verify wallet ownership.');
      setLoading(false);
      setWalletConnected(false);
    }
  };

  // Wallet selection modal
  const WalletModal = () => {
    if (!showWalletModal) return null;
    
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 backdrop-blur-sm px-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6 relative">
          {/* Close button - fixed position with increased hit area */}
          <button 
            onClick={() => {
              setShowWalletModal(false);
              setInstallingWallet(null);
            }} 
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white bg-gray-700 rounded-full z-10"
            style={{
              position: 'absolute',
              transform: 'none',
              transition: 'none',
              animation: 'none'
            }}
          >
            ✕
          </button>
          
          {installingWallet ? (
            <>
              <h3 className="text-xl font-bold text-white mb-6">Install {installingWallet.name}</h3>
              <p className="text-gray-300 mb-6">
                You don't have {installingWallet.name} installed. Please install it to continue.
              </p>
              <div className="flex flex-col gap-3">
                <a 
                  href={installingWallet.downloadUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg text-center"
                >
                  Download {installingWallet.name}
                </a>
                <button
                  onClick={() => setInstallingWallet(null)}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg"
                >
                  Back to Wallet Selection
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-white mb-6">Connect your wallet</h3>
              <div className="grid grid-cols-2 gap-3">
                {walletOptions.map(wallet => (
                  <button
                    key={wallet.id}
                    onClick={() => connectWallet(wallet.id)}
                    disabled={loading}
                    className="flex flex-col items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-4 px-3 rounded-lg transition duration-200 border border-gray-600 hover:border-blue-500 disabled:opacity-50 disabled:hover:border-gray-600 disabled:cursor-not-allowed"
                  >
                    <span className="text-2xl">{wallet.icon}</span>
                    <span>{wallet.name}</span>
                    {!wallet.installed && <span className="text-xs text-yellow-400">Not installed</span>}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-6 text-center">
                By connecting your wallet, you agree to the Terms of Service
              </p>
            </>
          )}
        </div>
      </div>
    );
  };

  // Update wallet button UI
  const renderWalletOptions = () => {
    // If wallet is already connected
    if (walletConnected) {
      return (
        <div className="text-center">
          <div className="bg-gray-800 rounded-lg px-4 py-2 inline-block">
            <span className="text-gray-400 mr-2">Connected:</span>
            {walletType === 'solana' ? (
              <span className="text-blue-300 flex items-center">
                <img 
                  src="https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg" 
                  alt="SOL" 
                  className="w-3 h-3 mr-1" 
                />
                {`${walletAddress.substring(0, 4)}...${walletAddress.substring(walletAddress.length - 4)}`}
              </span>
            ) : (
              <span className="text-blue-300">{`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}</span>
            )}
          </div>
        </div>
      );
    }
    
    // Wallet connect button
    return (
      <div className="flex justify-center">
        <button 
          onClick={() => setShowWalletModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 flex items-center gap-2"
        >
          <span>Connect Wallet</span>
          <span>→</span>
        </button>
      </div>
    );
  };

  // Update useEffect to initialize wallet detection
  useEffect(() => {
    detectWallets();
  }, []);

  // Remove Jupiter-specific code and use Li.fi for all chains
  const getQuote = async () => {
    if (!fromToken || !toToken || !fromAmount || fromAmount <= 0) {
      setError('Please fill in all fields correctly');
      return;
    }

    if (!walletConnected) {
      setError('Please connect your wallet first to get a quote');
      setShowWalletModal(true);
      return;
    }

    // Check if API key is available
    if (apiKeyStatus === 'missing') {
      setError('Cannot get quote: API key not configured. Please contact support.');
      return;
    }

    // Check if from and to tokens are the same
    if (fromToken === toToken) {
      setError('Source and destination tokens cannot be the same');
      return;
    }

    setLoading(true);
    setError(null);
    setRoutes([]);
    setSelectedRoute(null);
    setToAmount('');  // Clear the to amount

    try {
      // Find the selected token to get its decimals
      const selectedFromToken = tokens[fromChain]?.find(token => token.address === fromToken);
      const selectedToToken = tokens[fromChain]?.find(token => token.address === toToken);
      
      if (!selectedFromToken || !selectedToToken) {
        setError('Selected tokens not found in token list. Please try different tokens.');
        setLoading(false);
        return;
      }
      
      const fromDecimals = selectedFromToken?.decimals || 18;
      const toDecimals = selectedToToken?.decimals || 18;
      
      // Fee as a decimal fraction (0.005 for 0.5%)
      const feeDecimal = FEE_PERCENTAGE / 100;
      
      // Parse amount with proper decimals
      let fromAmountInWei;
      try {
        // Special handling for Solana vs EVM chains
        if (isSolanaFromChain) {
          // Solana uses regular decimal string representation with the token's specific decimals
          fromAmountInWei = (parseFloat(fromAmount) * Math.pow(10, fromDecimals)).toString();
        } else {
          // EVM chains use ethers.js to parse
          fromAmountInWei = ethers.parseUnits(fromAmount, fromDecimals).toString();
        }
      } catch (e) {
        logger.error('Error parsing amount:', e);
        setError('Invalid amount format. Please check your input.');
        setLoading(false);
        return;
      }
      
      // Make sure Solana addresses don't have 0x prefix
      const cleanFromToken = isSolanaFromChain ? fromToken.replace(/^0x/, '') : fromToken;
      const cleanToToken = isSolanaFromChain ? toToken.replace(/^0x/, '') : toToken;
      
      // Set up parameters according to Li.fi documentation
      const requestParams = {
        fromChain,
        toChain: fromChain, // For same-chain swaps
        fromToken: cleanFromToken,
        toToken: cleanToToken,
        fromAmount: fromAmountInWei,
        fromAddress: walletAddress,
        toAddress: walletAddress, // Same address for same-chain swaps
        slippage: slippage.toString(),
        // Apply fee according to Li.fi documentation
        fee: feeDecimal.toString(), // Pass fee as decimal fraction (e.g., "0.005")
        integrator: 'AquaSwap', // Your integration name
        referrer: FEE_RECIPIENT, // Your fee recipient wallet
      };
      
      logger.info(`Quote request for ${selectedFromToken.symbol} to ${selectedToToken.symbol} on ${isSolanaFromChain ? 'Solana' : 'EVM chain'}`);
      
      // For Solana, always use the dedicated endpoint directly
      if (isSolanaFromChain) {
        logger.info('Using Solana-specific endpoint with params:', {
          ...requestParams,
          fromToken: selectedFromToken.symbol,
          toToken: selectedToToken.symbol
        });
        
        try {
          // Use the Solana-specific endpoint directly for Solana chains
          const solanaResponse = await axios.get('https://li.quest/v1/solana/quote', {
            headers: {
              'x-lifi-api-key': LIFI_API_KEY
            },
            params: requestParams
          });
          
          if (solanaResponse.data && solanaResponse.data.routes && solanaResponse.data.routes.length > 0) {
            setRoutes(solanaResponse.data.routes);
            processRoutes(solanaResponse.data.routes, selectedToToken, toDecimals);
            setLoading(false);
            return;
          } else {
            throw new Error('No routes found for Solana swap');
          }
        } catch (solanaError) {
          logger.error('Solana quote error:', solanaError);
          
          if (solanaError.response?.status === 404) {
            setError(`The requested swap (${selectedFromToken.symbol} to ${selectedToToken.symbol}) is not available on Solana. Please try different tokens.`);
          } else if (solanaError.response?.data?.message) {
            setError(`Solana API Error: ${solanaError.response.data.message}`);
          } else {
            setError('Failed to get Solana quote. Please try different tokens or amount.');
          }
          setLoading(false);
          return;
        }
      } else {
        // For non-Solana chains, use the standard endpoint
        try {
          // Request quote from li.fi standard endpoint for EVM chains
          const response = await axios.get('https://li.quest/v1/quote', {
            headers: {
              'x-lifi-api-key': LIFI_API_KEY
            },
            params: requestParams
          });

          if (!response.data.routes || response.data.routes.length === 0) {
            setError('No routes found for this swap. Please try different tokens or amount.');
            setLoading(false);
            return;
          }

          setRoutes(response.data.routes || []);
          processRoutes(response.data.routes, selectedToToken, toDecimals);
        } catch (error) {
          logger.error('Quote error:', error);
          
          if (error.response?.data?.message) {
            const errorMessage = error.response.data.message;
            setError(`API Error: ${errorMessage}`);
          } else {
            setError('Failed to get quote. Please try different tokens or amount.');
          }
        }
      }
    } catch (error) {
      logger.error('Quote error:', error.response?.data || error.message || error);
      setError('Failed to get quote. Please try different tokens or amount.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to process routes - update to handle Solana decimal formatting correctly
  const processRoutes = (routes, selectedToToken, toDecimals) => {
    if (routes?.length > 0) {
      // Get the best route from the response
      const bestRoute = routes[0];
      
      // Ensure toAmount is properly formatted with decimals
      let formattedToAmount;
      try {
        if (isSolanaFromChain) {
          // For Solana, manually format the amount with the specific token decimals
          formattedToAmount = (parseFloat(bestRoute.toAmount) / Math.pow(10, toDecimals)).toString();
        } else {
          // For EVM chains, use ethers.js
          formattedToAmount = ethers.formatUnits(bestRoute.toAmount, toDecimals);
        }
        setToAmount(formattedToAmount);
        logger.info(`Quote received: ${fromAmount} → ${formattedToAmount}`);
      } catch (error) {
        logger.error('Error formatting toAmount:', error);
        setToAmount('Error');
      }

      // For display, calculate the actual fee amount in tokens
      const feeDisplayAmount = parseFloat(fromAmount) * (FEE_PERCENTAGE / 100);
      
      // Update the selectedRoute state with the route and fee information
      setSelectedRoute({
        ...bestRoute,
        feeDisplayAmount
      });
    } else {
      setError('No routes found for this swap');
    }
  };

  // Swap execution function using Li.fi API
  const executeSwap = async () => {
    if (!selectedRoute || !walletConnected) {
      setError('Please connect your wallet and select a route first');
      if (!walletConnected) {
        setShowWalletModal(true); // Show wallet modal when user tries to execute without connecting
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if this is a Solana transaction
      const isSolanaTransaction = walletType === 'solana' || 
        selectedRoute.fromChainId === 'SOL' || 
        selectedRoute.toChainId === 'SOL' ||
        isSolanaFromChain || 
        isSolanaToChain;
      
      if (isSolanaTransaction) {
        // Handle Solana transaction using Li.fi
        if (!solanaProvider) {
          throw new Error('Solana wallet not connected');
        }
        
        // Extract the transaction data from the selected route
        const txData = selectedRoute.steps?.[0]?.transaction?.data;
        
        if (!txData) {
          throw new Error('No transaction data found for Solana swap');
        }
        
        try {
          // Decode the base64 transaction data
          const decodedTx = Buffer.from(txData, 'base64');
          
          // Solana transaction handling depends on the format
          // Try different approach based on the format we received
          let signature;
          
          try {
            // First try as a versioned transaction
            const deserializedTx = solanaWeb3.VersionedTransaction.deserialize(decodedTx);
            signature = await solanaProvider.signAndSendTransaction(deserializedTx);
          } catch (versionedError) {
            logger.warn('Not a versioned transaction, trying regular format:', versionedError);
            
            // If not versioned, try as a regular transaction
            const transaction = solanaWeb3.Transaction.from(decodedTx);
            signature = await solanaProvider.signAndSendTransaction(transaction);
          }
          
          // Wait for confirmation
          if (solanaConnection) {
            await solanaConnection.confirmTransaction(signature);
          }
          
          setError(null);
          
          // Show success message with link to Solana Explorer
          const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=mainnet-beta`;
          if (showNotification) {
            showNotification(
              `Swap completed! View on Solana Explorer: ${explorerUrl}`,
              'success'
            );
          } else {
            alert(`Solana swap completed successfully! Transaction: ${signature}`);
          }
        } catch (error) {
          logger.error('Solana transaction error:', error);
          throw new Error(`Solana transaction failed: ${error.message}`);
        }
      } else {
        // Regular EVM transaction
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Get the transaction request
        const txRequest = {
          ...selectedRoute.steps[0].transaction,
          from: walletAddress
        };

        // Send the transaction
        const tx = await signer.sendTransaction(txRequest);
        
        // Wait for transaction to be mined
        await tx.wait();
        
        setError(null);
        // Show success message
        if (showNotification) {
          showNotification('Swap completed successfully!', 'success');
        } else {
          alert('Swap completed successfully!');
        }
      }
    } catch (error) {
      logger.error('Swap execution error:', error);
      setError(`Failed to execute swap: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Add a useEffect to adjust container height in iframe environments
  useEffect(() => {
    // Check if we're in an iframe
    const isInIframe = () => {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true; // If access to parent window is denied, we're likely in an iframe
      }
    };

    if (isInIframe()) {
      // SIMPLIFIED APPROACH: Focus on making buttons visible and eliminating side scroll
      
      // 1. Add basic styles to container to prevent horizontal scroll
      const container = document.querySelector('.swap-container');
      if (container) {
        container.style.width = '100%';
        container.style.maxWidth = '100%';
        container.style.overflowX = 'hidden';
        container.style.overflowY = 'auto';
        container.style.paddingBottom = '120px'; // Space for buttons
        
        // 2. Create a simple fixed button container at the bottom with basic styling
        let buttonContainer = document.querySelector('.swap-button-container');
        if (!buttonContainer) {
          buttonContainer = document.createElement('div');
          buttonContainer.className = 'swap-button-container';
          document.body.appendChild(buttonContainer);
          
          // Copy buttons from the original container
          const originalButtons = document.querySelectorAll('.bottom-action-buttons button');
          if (originalButtons && originalButtons.length > 0) {
            // Create a simple 2-column grid
            buttonContainer.style.display = 'grid';
            buttonContainer.style.gridTemplateColumns = '1fr 1fr';
            buttonContainer.style.gap = '10px';
            buttonContainer.style.padding = '15px';
            
            originalButtons.forEach(button => {
              const newButton = button.cloneNode(true);
              // Copy event listeners
              const clickEvent = button.onclick;
              if (clickEvent) {
                newButton.onclick = clickEvent;
              }
              buttonContainer.appendChild(newButton);
            });
          }
        }
        
        // Style the button container to ensure it's visible
        buttonContainer.style.position = 'fixed';
        buttonContainer.style.bottom = '0';
        buttonContainer.style.left = '0';
        buttonContainer.style.right = '0';
        buttonContainer.style.width = '100%';
        buttonContainer.style.zIndex = '99999'; // Very high z-index
        buttonContainer.style.backgroundColor = '#111827';
        buttonContainer.style.borderTop = '1px solid #374151';
        buttonContainer.style.boxShadow = '0 -4px 6px -1px rgba(0, 0, 0, 0.1)';
      }
    }
  }, []);

  // Add a function to fetch Solana token metadata
  const getSolanaTokenMetadata = async (mintAddress) => {
    try {
      // Try multiple sources in parallel for better odds of finding the token
      const [solanaLabsResponse, jupiterResponse] = await Promise.allSettled([
        // 1. Try the official Solana token list first
        axios.get('https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json'),
        
        // 2. Try Jupiter token list as a good fallback
        axios.get('https://token.jup.ag/all')
      ]);
      
      // Check Solana Labs token list
      if (solanaLabsResponse.status === 'fulfilled' && solanaLabsResponse.value?.data?.tokens) {
        const token = solanaLabsResponse.value.data.tokens.find(t => t.address === mintAddress);
        if (token) {
          return {
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            logoURI: token.logoURI || ''
          };
        }
      }
      
      // Check Jupiter token list
      if (jupiterResponse.status === 'fulfilled' && jupiterResponse.value?.data) {
        const jupToken = jupiterResponse.value.data.find(t => t.address === mintAddress);
        if (jupToken) {
          return {
            name: jupToken.name,
            symbol: jupToken.symbol,
            decimals: jupToken.decimals,
            logoURI: jupToken.logoURI || ''
          };
        }
      }
      
      // If still not found, try querying the Solana Program Library (SPL) directly
      // This will at least get us a symbol for known tokens
      try {
        // Look for token metadata program on-chain
        const connection = solanaConnection;
        const metaplexProgramId = new solanaWeb3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
        const mintKey = new solanaWeb3.PublicKey(mintAddress);
        
        // Try to get on-chain metadata
        const [metadata] = await solanaWeb3.PublicKey.findProgramAddress(
          [Buffer.from('metadata'), metaplexProgramId.toBuffer(), mintKey.toBuffer()],
          metaplexProgramId
        );
        
        const accountInfo = await connection.getAccountInfo(metadata);
        if (accountInfo) {
          // Very simplified metadata parsing - in a real app you'd use a proper decoder
          const name = Buffer.from(accountInfo.data.slice(1, 33)).toString().replace(/\0/g, '');
          const symbol = Buffer.from(accountInfo.data.slice(33, 65)).toString().replace(/\0/g, '');
          
          if (name || symbol) {
            return {
              name: name || `Token ${mintAddress.slice(0, 6)}...`,
              symbol: symbol || `TKN-${mintAddress.slice(0, 4)}`,
              decimals: 9, // Assuming 9 decimals which is common for SPL tokens
              logoURI: ''
            };
          }
        }
      } catch (onChainErr) {
        logger.debug('Error fetching on-chain metadata:', onChainErr);
        // This is expected to fail for many tokens, so we just continue
      }
    } catch (error) {
      logger.error('Error fetching Solana token metadata:', error);
    }
    
    // Default metadata if not found
    return {
      name: `Token ${mintAddress.slice(0, 6)}...`,
      symbol: `TKN-${mintAddress.slice(0, 4)}`,
      decimals: 9, // Default for most Solana tokens
      logoURI: ''
    };
  };

  // Add a function to check balances of common Solana tokens
  const checkCommonSolanaTokens = async (publicKey, solanaChain) => {
    if (!solanaConnection || !publicKey) return [];
    
    const commonTokens = [
      // Major stablecoins
      {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png'
      },
      {
        address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png'
      },
      {
        address: 'So11111111111111111111111111111111111111112', // Wrapped SOL
        symbol: 'wSOL',
        name: 'Wrapped SOL',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg'
      },
      // Liquid staking tokens
      {
        address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL (Marinade Staked SOL)
        symbol: 'mSOL',
        name: 'Marinade Staked SOL',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png'
      },
      {
        address: '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj', // stSOL (Lido Staked SOL)
        symbol: 'stSOL',
        name: 'Lido Staked SOL',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj/logo.png'
      },
      {
        address: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', // jitoSOL
        symbol: 'jitoSOL',
        name: 'Jito Staked SOL',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn/logo.png'
      },
      {
        address: 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1', // bSOL (Blaze SOL)
        symbol: 'bSOL',
        name: 'Blaze Staked SOL',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1/logo.png'
      },
      // Popular Solana tokens
      {
        address: 'Saber2gLauYim4Mvftnrasomsv6NvAuncvMEZwcLpD1', // SBR (Saber)
        symbol: 'SBR',
        name: 'Saber Protocol Token',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Saber2gLauYim4Mvftnrasomsv6NvAuncvMEZwcLpD1/logo.svg'
      },
      {
        address: 'RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a', // RAY (Raydium)
        symbol: 'RAY',
        name: 'Raydium',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a/logo.png'
      },
      {
        address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', // ORCA
        symbol: 'ORCA',
        name: 'Orca',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE/logo.png'
      },
      {
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
        symbol: 'BONK',
        name: 'Bonk',
        decimals: 5,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png'
      },
      {
        address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP (Jupiter)
        symbol: 'JUP',
        name: 'Jupiter',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN/logo.png'
      },
      {
        address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', // PYTH
        symbol: 'PYTH',
        name: 'Pyth Network',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3/logo.png'
      },
      // Additional stablecoins
      {
        address: 'Dq5C6Zmg37MQinAZiKRyXpHEPpnXPprEFQiPYagHisZj', // USDCet (USDC from Ethereum on Wormhole)
        symbol: 'USDCet',
        name: 'USDC (Ethereum)',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
      },
      {
        address: 'Ea5SjE2Y6yvCeW5dYTn7PYMuW5ikXkvbGdcmSnXeaLjS', // PAI
        symbol: 'PAI',
        name: 'PAI (Parrot USD)',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Ea5SjE2Y6yvCeW5dYTn7PYMuW5ikXkvbGdcmSnXeaLjS/logo.png'
      }
    ];
    
    const userTokens = [];
    
    // Check each token manually
    for (const token of commonTokens) {
      try {
        // Create a token account address for this user and mint
        const tokenMint = new solanaWeb3.PublicKey(token.address);
        const tokenAccounts = await solanaConnection.getTokenAccountsByOwner(
          publicKey,
          { mint: tokenMint }
        );
        
        // If user has this token
        if (tokenAccounts.value.length > 0) {
          // Get the most recent account
          const tokenAccount = tokenAccounts.value[0];
          const accountInfo = await solanaConnection.getTokenAccountBalance(tokenAccount.pubkey);
          
          if (accountInfo && accountInfo.value && parseFloat(accountInfo.value.uiAmount) > 0) {
            userTokens.push({
              ...token,
              chainId: solanaChain.id,
              isUserToken: true,
              balance: accountInfo.value.uiAmount
            });
            
            logger.info(`Found ${token.symbol} with balance: ${accountInfo.value.uiAmount}`);
          }
        }
      } catch (err) {
        logger.error(`Error checking balance for ${token.symbol}:`, err);
      }
    }
    
    return userTokens;
  };

  // Improved function for scanning Solana wallet tokens
  const scanSolanaWalletTokens = async () => {
    if (!walletConnected || !walletAddress || walletType !== 'solana') {
      return;
    }
    
    try {
      logger.info('Setting up Solana tokens for wallet:', walletAddress);
      
      // Get the Solana chain ID
      const solanaChain = chains.find(c => 
        c.key?.toLowerCase() === 'sol' || 
        c.name?.toLowerCase() === 'solana' ||
        c.chainType === 'SVM'
      );
      
      if (!solanaChain) {
        logger.error('Solana chain not found in available chains');
        return;
      }
      
      // Get current token list
      const currentTokenList = tokens[solanaChain.id] || [];
      
      // Use predefined list of common Solana tokens to avoid RPC calls
      const commonSolanaTokens = [
        {
          address: '11111111111111111111111111111111', // Native SOL
          chainId: solanaChain.id,
          name: 'Solana',
          symbol: 'SOL',
          decimals: 9,
          logoURI: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg',
          isUserToken: true
        },
        {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          chainId: solanaChain.id,
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
          isUserToken: true
        },
        {
          address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
          chainId: solanaChain.id,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
          isUserToken: true
        },
        {
          address: 'So11111111111111111111111111111111111111112', // Wrapped SOL
          chainId: solanaChain.id,
          name: 'Wrapped SOL',
          symbol: 'wSOL',
          decimals: 9,
          logoURI: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg',
          isUserToken: true
        },
        {
          address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL (Marinade)
          chainId: solanaChain.id,
          name: 'Marinade Staked SOL',
          symbol: 'mSOL',
          decimals: 9,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
          isUserToken: true
        },
        {
          address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
          chainId: solanaChain.id,
          name: 'Bonk',
          symbol: 'BONK',
          decimals: 5,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png',
          isUserToken: true
        },
        {
          address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP
          chainId: solanaChain.id,
          name: 'Jupiter',
          symbol: 'JUP',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN/logo.png',
          isUserToken: true
        }
      ];
      
      // Add the common tokens to our list
      const updatedTokens = [...currentTokenList];
      
      // Add or update tokens
      commonSolanaTokens.forEach(token => {
        const existingIndex = updatedTokens.findIndex(t => 
          t.address.toLowerCase() === token.address.toLowerCase()
        );
        
        if (existingIndex >= 0) {
          // Update existing token
          updatedTokens[existingIndex] = {
            ...updatedTokens[existingIndex],
            isUserToken: true
          };
        } else {
          // Add new token
          updatedTokens.push(token);
        }
      });
      
      // Update tokens state
      setTokens(prev => ({
        ...prev,
        [solanaChain.id]: updatedTokens
      }));
      
      // Update active token lists
      if (fromChain === solanaChain.id) {
        setFromChainTokens(updatedTokens);
        setToChainTokens(updatedTokens);
      }
      
      logger.info(`Added ${commonSolanaTokens.length} common Solana tokens to the list`);
      
      if (showNotification) {
        showNotification('Common Solana tokens added to swap selection', 'info');
      }
    } catch (error) {
      logger.error('Error setting up Solana tokens:', error);
      
      if (showNotification) {
        showNotification('Could not load Solana tokens. Please try again later.', 'error');
      }
    }
  };

  // Function to get tokens from the user's wallet and add them to the token list
  const getWalletTokens = async () => {
    if (!walletConnected || !walletAddress) return;
    
    try {
      if (walletType === 'evm') {
        // For EVM wallets (Ethereum, BSC, etc.)
        if (!window.ethereum) return;
        
        // Get the current chain ID
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const decimalChainId = parseInt(chainId, 16).toString();
        
        logger.info(`Scanning for tokens in wallet on chain ${decimalChainId}`);
        
        // Use the indexed token list for this chain from Li.fi API as a base
        const currentTokenList = tokens[decimalChainId] || [];
        const existingTokenAddresses = new Set(currentTokenList.map(t => t.address.toLowerCase()));
        
        // Check if the chain explorer API endpoint is known for this chain
        // Only supporting major chains with well-known endpoints for simplicity
        let explorerApiUrl;
        let explorerApiKey = '';
        
        if (decimalChainId === '1') { // Ethereum Mainnet
          explorerApiUrl = `https://api.etherscan.io/api?module=account&action=tokentx&address=${walletAddress}&sort=desc&apikey=${explorerApiKey}`;
        } else if (decimalChainId === '56') { // BSC
          explorerApiUrl = `https://api.bscscan.com/api?module=account&action=tokentx&address=${walletAddress}&sort=desc&apikey=${explorerApiKey}`;
        } else if (decimalChainId === '137') { // Polygon
          explorerApiUrl = `https://api.polygonscan.com/api?module=account&action=tokentx&address=${walletAddress}&sort=desc&apikey=${explorerApiKey}`;
        } else if (decimalChainId === '43114') { // Avalanche
          explorerApiUrl = `https://api.snowtrace.io/api?module=account&action=tokentx&address=${walletAddress}&sort=desc&apikey=${explorerApiKey}`;
        } else if (decimalChainId === '42161') { // Arbitrum
          explorerApiUrl = `https://api.arbiscan.io/api?module=account&action=tokentx&address=${walletAddress}&sort=desc&apikey=${explorerApiKey}`;
        } else if (decimalChainId === '10') { // Optimism
          explorerApiUrl = `https://api-optimistic.etherscan.io/api?module=account&action=tokentx&address=${walletAddress}&sort=desc&apikey=${explorerApiKey}`;
        }
        
        // Try to get user's tokens from explorer API if available
        if (explorerApiUrl) {
          try {
            const response = await axios.get(explorerApiUrl);
            if (response.data?.result && Array.isArray(response.data.result)) {
              // Create a map to deduplicate tokens
              const userTokens = new Map();
              
              // Process token transactions to build a list of tokens
              response.data.result.forEach(tx => {
                const tokenAddress = tx.contractAddress.toLowerCase();
                if (!existingTokenAddresses.has(tokenAddress) && !userTokens.has(tokenAddress)) {
                  userTokens.set(tokenAddress, {
                    address: tx.contractAddress,
                    chainId: decimalChainId,
                    name: tx.tokenName,
                    symbol: tx.tokenSymbol,
                    decimals: parseInt(tx.tokenDecimal),
                    logoURI: '', // We don't have logos from the explorer API
                    isUserToken: true // Mark as a user token
                  });
                }
              });
              
              // Add user tokens to the token list
              if (userTokens.size > 0) {
                logger.info(`Found ${userTokens.size} additional tokens in wallet`);
                const updatedTokens = [...currentTokenList, ...userTokens.values()];
                
                // Update tokens state
                setTokens(prev => ({
                  ...prev,
                  [decimalChainId]: updatedTokens
                }));
                
                // Update token lists if this is the current chain
                if (fromChain === decimalChainId) {
                  setFromChainTokens(updatedTokens);
                  setToChainTokens(updatedTokens);
                }
                
                // Show notification if showNotification is available
                if (showNotification) {
                  showNotification(`Found ${userTokens.size} tokens in your wallet. They are now available for swapping.`, 'info');
                }
              }
            }
          } catch (error) {
            logger.error('Error fetching user tokens from explorer:', error);
          }
        }
      } 
      else if (walletType === 'solana') {
        // Call the improved Solana wallet scanner
        await scanSolanaWalletTokens();
      }
    } catch (error) {
      logger.error('Error scanning wallet tokens:', error);
    }
  };

  // Update useEffect to scan for wallet tokens after wallet connection
  useEffect(() => {
    if (walletConnected && walletAddress) {
      getWalletTokens();
    }
  }, [walletConnected, walletAddress, walletType]);

  // Add a refresh function for wallet tokens
  const refreshWalletTokens = async () => {
    if (!walletConnected) {
      if (showNotification) {
        showNotification('Please connect your wallet first', 'warning');
      }
      return;
    }
    
    if (showNotification) {
      showNotification('Scanning for tokens in your wallet...', 'info');
    }
    
    await getWalletTokens();
  };

  return (
    <div className="bg-gray-900 p-4 sm:p-6 rounded-lg shadow-lg w-full text-white overflow-y-auto swap-container" style={{
      height: '100%',
      maxHeight: '850px',
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: '120px', // Space for buttons
      position: 'relative',
      background: 'linear-gradient(135deg, #111827 0%, #1E293B 100%)',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 10px rgba(59, 130, 246, 0.1)'
    }}>
      {/* Wallet Modal */}
      <WalletModal />
      
      {/* Header with wallet connection moved to top right */}
      <div className="relative flex flex-col sm:flex-row items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-blue-400 flex items-center justify-center sm:justify-start">
          <img 
            src="/AquaSwap.svg" 
            alt="" 
            className="h-5 w-5 sm:h-6 sm:w-6 mr-2 inline-block"
            style={{ 
              verticalAlign: 'middle', 
              marginTop: '-2px', 
              filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' 
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/AquaSwap.png";
            }}
          />
          <span className="bg-gradient-to-r from-blue-400 to-blue-600 text-transparent bg-clip-text">
            AquaSwap
          </span>
          {isSolanaFromChain && (
            <span className="text-xs sm:text-sm font-normal text-blue-300 ml-2">powered by Jupiter</span>
          )}
        </h2>
        
        {/* Wallet connection - moved to top right on desktop */}
        <div className="mt-3 sm:mt-0 sm:absolute sm:right-0 sm:top-0">
          {walletConnected ? (
            <div className="bg-gray-800 rounded-lg px-4 py-2 inline-block shadow-md border border-gray-700 hover:border-blue-500/50 transition-all">
              <span className="text-gray-400 mr-2">Connected:</span>
              {walletType === 'solana' ? (
                <span className="text-blue-300 flex items-center">
                  <img 
                    src="https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg" 
                    alt="SOL" 
                    className="w-3 h-3 mr-1" 
                  />
                  {`${walletAddress.substring(0, 4)}...${walletAddress.substring(walletAddress.length - 4)}`}
                </span>
              ) : (
                <span className="text-blue-300">{`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}</span>
              )}
            </div>
          ) : (
            <button 
              onClick={() => setShowWalletModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 flex items-center gap-2 shadow-lg border border-blue-500/50"
            >
              <span>Connect Wallet</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Main swap interface - centered with max-width for desktop */}
      <div className="mx-auto w-full max-w-2xl">
        <div className="space-y-6">
          {/* Collapsible notices - improved styling */}
          <div className="mb-4 space-y-2 flex-shrink-0">
            {/* Security Notice - always show */}
            <div className="bg-blue-500/20 border border-blue-500/40 text-blue-300 p-3 rounded-lg text-xs sm:text-sm shadow-inner">
              <p className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
                </svg>
                <strong>Security:</strong> Always verify transaction details before confirming in your wallet.
              </p>
            </div>
            
            {/* Error message with max height and scrolling if needed */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-300 p-3 rounded-lg text-xs sm:text-sm max-h-[100px] overflow-y-auto whitespace-pre-line shadow-inner">
                <div className="flex">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>

          {/* Network Selection - improved for desktop with better card styling */}
          <div className="bg-gray-800/50 p-4 rounded-xl shadow-md border border-gray-700 hover:border-gray-600 transition-all">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 mb-2 text-xs sm:text-sm font-medium">Chain {walletConnected && <span className="text-green-400 text-xs">(Auto-detected)</span>}</label>
                <select 
                  value={fromChain}
                  onChange={handleFromChainChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  disabled={walletConnected}
                >
                  <option value="">Select Chain</option>
                  {chains.map(chain => (
                    <option key={chain.id} value={chain.id}>
                      {chain.name} {chain.chainType === 'SVM' || chain.key === 'sol' ? '(Solana)' : ''}
                    </option>
                  ))}
                </select>
                {walletConnected && fromChain && (
                  <div className="mt-1 text-xs text-blue-400 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {chains.find(c => c.id === fromChain)?.name || fromChain} auto-detected
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center items-center">
                <div className="text-center text-base sm:text-lg text-blue-400 font-bold mb-1 sm:mb-2">
                  Same-Chain Swaps Only
                </div>
                <div className="text-center text-xs text-gray-400">
                  {walletConnected ? 'Chain auto-detected from wallet' : 'Connect wallet to auto-detect chain'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Token Selection - improved layout for desktop */}
          <div className="bg-gray-800/50 p-4 rounded-xl shadow-md border border-gray-700 hover:border-gray-600 transition-all">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 mb-2 text-xs sm:text-sm font-medium">From Token</label>
                <select 
                  value={fromToken}
                  onChange={(e) => {
                    let tokenAddress = e.target.value;
                    if (isSolanaFromChain && tokenAddress.startsWith('0x')) {
                      tokenAddress = tokenAddress.substring(2);
                    }
                    setFromToken(tokenAddress);
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  disabled={!fromChain || fromChainTokens.length === 0}
                >
                  {!fromChain && <option value="">Select chain first</option>}
                  {fromChain && fromChainTokens.length === 0 && <option value="">Loading tokens...</option>}
                  
                  {fromChainTokens.length > 0 && (
                    <option value="" disabled>
                      {walletConnected ? '---- Select token (includes wallet tokens) ----' : '---- Select token ----'}
                    </option>
                  )}
                  
                  {getSortedTokens(fromChainTokens).map(token => (
                    <option 
                      key={token.address} 
                      value={token.address} 
                      className={token.isUserToken ? 'text-green-400' : ''}
                    >
                      {token.symbol} {token.isUserToken ? '(in wallet)' : ''}
                    </option>
                  ))}
                </select>
                {fromToken && fromChainTokens.length > 0 && (
                  <div className="mt-2 flex items-center">
                    <img 
                      src={fromChainTokens.find(t => t.address === fromToken)?.logoURI || '/placeholder-token.png'} 
                      alt=""
                      className="w-6 h-6 mr-2 rounded-full shadow-md border border-gray-700"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder-token.png';
                      }}
                    />
                    <span className="text-sm font-medium text-white">{fromChainTokens.find(t => t.address === fromToken)?.symbol}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-gray-400 mb-2 text-xs sm:text-sm font-medium">To Token</label>
                <select 
                  value={toToken}
                  onChange={(e) => {
                    let tokenAddress = e.target.value;
                    if (isSolanaToChain && tokenAddress.startsWith('0x')) {
                      tokenAddress = tokenAddress.substring(2);
                    }
                    setToToken(tokenAddress);
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  disabled={!toChain || toChainTokens.length === 0}
                >
                  {!toChain && <option value="">Select chain first</option>}
                  {toChain && toChainTokens.length === 0 && <option value="">Loading tokens...</option>}
                  
                  {toChainTokens.length > 0 && (
                    <option value="" disabled>
                      {walletConnected ? '---- Select token (includes wallet tokens) ----' : '---- Select token ----'}
                    </option>
                  )}
                  
                  {getSortedTokens(toChainTokens).map(token => (
                    <option 
                      key={token.address} 
                      value={token.address}
                      className={token.isUserToken ? 'text-green-400' : ''}
                    >
                      {token.symbol} {token.isUserToken ? '(in wallet)' : ''}
                    </option>
                  ))}
                </select>
                {toToken && toChainTokens.length > 0 && (
                  <div className="mt-2 flex items-center">
                    <img 
                      src={toChainTokens.find(t => t.address === toToken)?.logoURI || '/placeholder-token.png'} 
                      alt=""
                      className="w-6 h-6 mr-2 rounded-full shadow-md border border-gray-700"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder-token.png';
                      }}
                    />
                    <span className="text-sm font-medium text-white">{toChainTokens.find(t => t.address === toToken)?.symbol}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Amount Inputs - improved layout for desktop */}
          <div className="bg-gray-800/50 p-4 rounded-xl shadow-md border border-gray-700 hover:border-gray-600 transition-all">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 mb-2 text-xs sm:text-sm font-medium">You Pay</label>
                <div className="relative mb-1">
                  <input
                    type="number"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs py-1 px-2 bg-gray-800 rounded-full">
                    + 0.5% fee
                  </div>
                </div>
                {fromToken && fromChainTokens.length > 0 && (
                  <div className="mt-1 text-xs text-gray-400">
                    Selected: {fromChainTokens.find(t => t.address === fromToken)?.symbol}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-gray-400 mb-2 text-xs sm:text-sm font-medium">You Receive</label>
                <input
                  type="text"
                  value={toAmount}
                  readOnly
                  placeholder="0.0"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white text-sm mb-1"
                />
                {toToken && toChainTokens.length > 0 && (
                  <div className="mt-1 text-xs text-gray-400">
                    Selected: {toChainTokens.find(t => t.address === toToken)?.symbol}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Slippage Setting - improved layout for desktop */}
          <div className="bg-gray-800/50 p-4 rounded-xl shadow-md border border-gray-700 hover:border-gray-600 transition-all">
            <label className="block text-gray-400 mb-2 text-xs sm:text-sm font-medium">Slippage Tolerance (%)</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                min="0.1"
                max="5"
                step="0.1"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <div className="flex gap-1">
                <button 
                  onClick={() => setSlippage(0.5)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${slippage === 0.5 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} transition-all`}
                >
                  0.5%
                </button>
                <button 
                  onClick={() => setSlippage(1.0)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${slippage === 1.0 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} transition-all`}
                >
                  1%
                </button>
                <button 
                  onClick={() => setSlippage(2.0)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${slippage === 2.0 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} transition-all`}
                >
                  2%
                </button>
              </div>
            </div>
          </div>

          {/* Route Information - improved styling */}
          {selectedRoute && (
            <div className="bg-gray-800/50 p-4 rounded-xl shadow-md border border-blue-600/30 hover:border-blue-500/50 transition-all">
              <h3 className="text-sm font-medium mb-2 text-blue-400">Selected Route</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">Provider:</span>
                  <span className="text-white font-medium">{selectedRoute.steps[0].tool}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">Estimated Gas:</span>
                  <span className="text-white font-medium">${parseFloat(selectedRoute.gasUSD).toFixed(2)} USD</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">Execution Time:</span>
                  <span className="text-white font-medium">~{selectedRoute.steps[0].estimate.executionDuration}s</span>
                </div>
                <div className="flex items-center text-yellow-400">
                  <span className="text-yellow-500 mr-2">Fee:</span>
                  <span className="font-medium">{FEE_PERCENTAGE}% ({selectedRoute.feeDisplayAmount?.toFixed(6) || parseFloat(fromAmount) * (FEE_PERCENTAGE / 100)} tokens)</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons on Desktop - not fixed, but in-flow */}
          <div className="sm:flex sm:gap-4 hidden">
            <button
              onClick={getQuote}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 text-sm shadow-lg"
            >
              {loading ? 'Loading...' : 'Get Quote'}
            </button>
            <button
              onClick={executeSwap}
              disabled={loading || !selectedRoute || !walletConnected}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 text-sm shadow-lg"
            >
              {loading ? 'Processing...' : 'Execute Swap'}
            </button>
          </div>
        </div>
      </div>

      {/* Fixed position action buttons - only on mobile */}
      <div className="grid grid-cols-2 gap-3 flex-shrink-0 bottom-action-buttons fixed left-0 right-0 bottom-0 px-4 py-4 bg-gray-900 border-t border-gray-700 z-50 sm:hidden">
        <button
          onClick={getQuote}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 text-sm shadow-lg"
        >
          {loading ? 'Loading...' : 'Get Quote'}
        </button>
        <button
          onClick={executeSwap}
          disabled={loading || !selectedRoute || !walletConnected}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 text-sm shadow-lg"
        >
          {loading ? 'Processing...' : 'Execute Swap'}
        </button>
      </div>
    </div>
  );
};

Swap.propTypes = {
  currentUser: PropTypes.object.isRequired,
  showNotification: PropTypes.func.isRequired
};

export default Swap;
