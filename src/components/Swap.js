import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import logger from '../utils/logger';
// Solana imports
import * as solanaWeb3 from '@solana/web3.js';
import bs58 from 'bs58';
// Import PropTypes for prop validation
import PropTypes from 'prop-types';

// Constants for Jupiter API
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';
const JUPITER_SWAP_API = 'https://quote-api.jup.ag/v6';
const JUPITER_TOKEN_LIST_API = 'https://token.jup.ag/all';
const FEE_BPS = 50; // 0.5% fee = 50 basis points
const FEE_RECIPIENT = process.env.REACT_APP_FEE_WALLET || '0x98BC1BEC892d9f74B606D478E6b45089D2faAB05'; // Converted to Solana address format when used

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
  const [walletType, setWalletType] = useState('solana'); // Default to Solana
  const [tokens, setTokens] = useState([]); // Simplified to just an array of tokens
  const [walletOptions, setWalletOptions] = useState([]);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [installingWallet, setInstallingWallet] = useState(null);
  
  // Solana-specific state
  const [solanaConnection, setSolanaConnection] = useState(null);
  const [solanaProvider, setSolanaProvider] = useState(null);
  
  const FEE_PERCENTAGE = 0.5; // 0.5% fee
  
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
  
  // Add this helper function at the beginning of the component to handle token errors
  const ensureSolanaTokensAvailable = (tokensObject) => {
    // Check if Solana tokens exist
    if (!tokensObject['SOL'] || tokensObject['SOL'].length === 0) {
      logger.warn('No Solana tokens found, adding fallback tokens');
      
      // Add fallback Solana tokens
      tokensObject['SOL'] = [
        {
          address: '11111111111111111111111111111111', // Native SOL
          chainId: 'SOL',
          name: 'Solana',
          symbol: 'SOL',
          decimals: 9,
          logoURI: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg',
          isUserToken: true
        },
        {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          chainId: 'SOL',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
          isUserToken: true
        },
        {
          address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
          chainId: 'SOL',
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
          isUserToken: true
        }
      ];
    }
    
    // Ensure no Solana tokens have 0x prefixes
    if (tokensObject['SOL'] && tokensObject['SOL'].length > 0) {
      tokensObject['SOL'] = tokensObject['SOL'].map(token => ({
        ...token,
        address: token.address.replace(/^0x/, '')
      }));
    }
    
    return tokensObject;
  };
  
  useEffect(() => {
    // Initialize Solana connection
    const initializeSolanaConnection = async () => {
      try {
        // Connect to Solana mainnet with better performance settings
        const connectionConfig = {
          commitment: 'confirmed',
          disableRetryOnRateLimit: true,
          confirmTransactionInitialTimeout: 60000
        };
        
        // Connect to Solana mainnet
        const connection = new solanaWeb3.Connection(
          'https://api.mainnet-beta.solana.com',
          connectionConfig
        );
        
        setSolanaConnection(connection);
        logger.info('Connected to Solana mainnet for Jupiter operations');
      } catch (error) {
        logger.error('Failed to initialize Solana connection:', error);
      }
    };
    
    // Call the async function
    initializeSolanaConnection();
    
    // Log environment for debugging
    logger.info('Environment check:', { 
      nodeEnv: process.env.NODE_ENV,
      hasFeeWallet: !!process.env.REACT_APP_FEE_WALLET,
      isProduction: process.env.NODE_ENV === 'production'
    });
  }, []);

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
    
    // Fetch tokens from Jupiter
    fetchJupiterTokens();
    
    return () => {
      clearInterval(intervalId);
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, []);
  
  // Fetch tokens from Jupiter API
  const fetchJupiterTokens = async () => {
    try {
      setLoading(true);
      
      // Fetch all tokens from Jupiter API
      const response = await axios.get(JUPITER_TOKEN_LIST_API);
      
      if (response.data && Array.isArray(response.data)) {
        logger.info(`Fetched ${response.data.length} tokens from Jupiter API`);
        
        // Format tokens to match our expected structure
        const formattedTokens = response.data.map(token => ({
          address: token.address, // Jupiter addresses already have no 0x prefix
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          logoURI: token.logoURI || '',
          chainId: 'SOL',
          isUserToken: false // Will mark user tokens later
        }));
        
        // Add common SOL token if not present
        const hasSol = formattedTokens.some(token => 
          token.symbol === 'SOL' || 
          token.address === '11111111111111111111111111111111'
        );
        
        if (!hasSol) {
          formattedTokens.unshift({
            address: '11111111111111111111111111111111', // Native SOL
            chainId: 'SOL',
            name: 'Solana',
            symbol: 'SOL',
            decimals: 9,
            logoURI: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg',
            isUserToken: true
          });
        }
        
        // Set tokens state
        setTokens(formattedTokens);
        
        // Find default tokens
        const solToken = formattedTokens.find(t => 
          t.symbol === 'SOL' || 
          t.address === '11111111111111111111111111111111'
        );
        
        const usdcToken = formattedTokens.find(t => 
          t.symbol === 'USDC' || 
          t.address === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
        );
        
        // Set default tokens if available
        if (solToken) {
          setFromToken(solToken.address);
          logger.info(`Set default 'from' token: ${solToken.symbol} (${solToken.address})`);
        } else if (formattedTokens.length > 0) {
          setFromToken(formattedTokens[0].address);
        }
        
        if (usdcToken) {
          setToToken(usdcToken.address);
          logger.info(`Set default 'to' token: ${usdcToken.symbol} (${usdcToken.address})`);
        } else if (formattedTokens.length > 1) {
          // Set second token as 'to' token to avoid same token
          setToToken(formattedTokens[1].address);
        }
      } else {
        setError('Failed to load tokens from Jupiter. Invalid response format.');
      }
    } catch (error) {
      logger.error('Error fetching Jupiter tokens:', error);
      setError('Failed to load tokens. Please try again later.');
      
      // Add fallback tokens if fetch fails
      const fallbackTokens = [
        {
          address: '11111111111111111111111111111111', // Native SOL
          chainId: 'SOL',
          name: 'Solana',
          symbol: 'SOL',
          decimals: 9,
          logoURI: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg',
          isUserToken: true
        },
        {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          chainId: 'SOL',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
          isUserToken: true
        },
        {
          address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
          chainId: 'SOL',
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
          isUserToken: true
        }
      ];
      
      setTokens(fallbackTokens);
      setFromToken(fallbackTokens[0].address);
      setToToken(fallbackTokens[1].address);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all tokens for multiple chains at once
  useEffect(() => {
    const fetchAllTokens = async () => {
      if (!fromChain && !toChain) return;
      
      const chainsToFetch = Array.from(new Set([fromChain, toChain])).filter(Boolean).join(',');
      
      try {
        // Check if any of the chains is Solana
        const hasSolanaChain = 
          chainsToFetch.includes('SOL') || 
          chains.some(c => 
            chainsToFetch.includes(c.id) && 
            (c.chainType === 'SVM' || c.key === 'sol')
          );
        
        // Log chain detection
        logger.info('Fetching tokens for chains:', {
          chainsToFetch,
          hasSolanaChain,
          isSolanaFromChain,
          isSolanaToChain
        });
        
        let response;
        
              if (hasSolanaChain) {
        try {
          // For Solana, include SVM chain type and request a comprehensive token list
          response = await axios.get(`https://li.quest/v1/tokens?chains=${chainsToFetch}&chainTypes=EVM,SVM&includeAllTokens=true`, {
            headers: {
              'x-lifi-api-key': LIFI_API_KEY
            }
          });
          
          // Process Solana tokens to ensure no 0x prefixes
          if (response.data.tokens && response.data.tokens['SOL']) {
            // Normalize Solana token addresses to remove any 0x prefixes
            response.data.tokens['SOL'] = response.data.tokens['SOL'].map(token => ({
              ...token,
              address: token.address.replace(/^0x/, '') // Ensure no 0x prefix for Solana
            }));
            
            // Debug sample of tokens
            logger.info('Solana token samples:', response.data.tokens['SOL'].slice(0, 3).map(t => ({
              symbol: t.symbol,
              address: t.address,
              has0xPrefix: t.address.startsWith('0x')
            })));
          }
        } catch (solanaTokenError) {
          logger.error('Error fetching Solana tokens:', solanaTokenError);
          // Create a basic response structure if none exists
          if (!response) {
            response = { data: { tokens: {} } };
          } else if (!response.data) {
            response.data = { tokens: {} };
          } else if (!response.data.tokens) {
            response.data.tokens = {};
          }
        }
        
        // Always ensure we have some Solana tokens available
        response.data.tokens = ensureSolanaTokensAvailable(response.data.tokens);
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
        
        // Handle Solana tokens specifically for correct formatting
        if (isSolanaFromChain && response.data.tokens[fromChain]) {
          const formattedTokens = response.data.tokens[fromChain].map(token => ({
            ...token,
            address: token.address.replace(/^0x/, '') // Ensure no 0x prefix for Solana
          }));
          
          setFromChainTokens(formattedTokens);
          setToChainTokens(formattedTokens); // Same chain
          
          if (formattedTokens.length > 0) {
            // Set a native SOL token if available
            const solToken = formattedTokens.find(t => 
              t.symbol.toUpperCase() === 'SOL' || 
              t.address === '11111111111111111111111111111111'
            );
            
            if (solToken) {
              setFromToken(solToken.address);
              logger.info(`Set default Solana 'from' token: SOL (${solToken.address})`);
            } else {
              setFromToken(formattedTokens[0].address);
            }
            
            // Prefer a stablecoin for "to" token
            const stablecoin = formattedTokens.find(t => 
              t.symbol.toLowerCase() === 'usdc' || 
              t.symbol.toLowerCase() === 'usdt'
            );
            
            if (stablecoin) {
              setToToken(stablecoin.address);
              logger.info(`Set default Solana 'to' token: ${stablecoin.symbol} (${stablecoin.address})`);
            } else if (formattedTokens.length > 1) {
              setToToken(formattedTokens[1].address);
            } else {
              setToToken(formattedTokens[0].address);
            }
          }
        }
        // Handle regular EVM tokens 
        else {
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
        }
      } catch (error) {
        logger.error('Error fetching tokens:', error);
        setError('Failed to load tokens. Please try again later.');
      }
    };
    
    fetchAllTokens();
  }, [fromChain, toChain, LIFI_API_KEY, chains, isSolanaFromChain, isSolanaToChain]);

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
    
    // Fetch all available tokens for the selected chain
    setTimeout(() => {
      fetchAllAvailableTokens();
    }, 500);
  };
  
  const handleToChainChange = (e) => {
    // In the simplified same-chain only approach, we always set toChain equal to fromChain
    // This function is kept for backwards compatibility but effectively does nothing
    return;
  };
  
  // Update wallet detection to focus only on Solana wallets
  const detectWallets = () => {
    const available = [];
    
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
    logger.info('Detected installed Solana wallets:', installedWallets.map(w => w.name));
    
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
          
          // Force the toChain to match fromChain (same-chain only approach)
          setToChain(matchedChain.id);
          
          // Reset the isSolana flags since we know this is EVM
          setIsSolanaFromChain(false);
          setIsSolanaToChain(false);
          
          // Trigger comprehensive token fetch for this chain
          setTimeout(() => {
            fetchAllAvailableTokens();
          }, 500);
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
            setToChain(newMatchedChain.id);
            
            // Reset tokens
            setFromToken('');
            setToToken('');
            
            // Reset Solana flags if switching to EVM chain
            setIsSolanaFromChain(false);
            setIsSolanaToChain(false);
            
            // Fetch tokens for the new chain
            setTimeout(() => {
              fetchAllAvailableTokens();
            }, 500);
          }
        });
      } 
      else if (walletType === 'solana') {
        // For Solana, we explicitly identify the Solana chain
        const solanaChain = chains.find(c => 
          c.key?.toLowerCase() === 'sol' || 
          c.name?.toLowerCase() === 'solana' ||
          c.chainType === 'SVM' ||
          c.id === 'SOL'
        );
        
        if (!solanaChain) {
          logger.error('Could not find Solana chain in available chains. Chain data:', chains);
          throw new Error('Solana chain not found in available chains');
        }
        
        logger.info(`Setting Solana chain: ${solanaChain.name} (${solanaChain.id})`);
        setFromChain(solanaChain.id);
        setToChain(solanaChain.id);
        
        // Explicitly set Solana flags to true
        setIsSolanaFromChain(true);
        setIsSolanaToChain(true);
        
        // For Solana, we need to make sure token addresses never have 0x prefixes
        // Reset tokens to avoid potential format issues
        setFromToken('');
        setToToken('');
        
        // Trigger comprehensive token fetch for Solana
        setTimeout(() => {
          fetchAllAvailableTokens();
        }, 500);
      }
    } catch (error) {
      logger.error('Error detecting chain:', error);
    }
  };

  // Simplified wallet connection for Solana wallets only
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
          
          logger.info(`Authenticated user ${currentUser.username} connected Phantom Wallet:`, walletAddr);
          
          // Refresh token list after wallet connection
          fetchJupiterTokens();
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
          
          logger.info(`Connected Solflare Wallet:`, walletAddr);
          
          // Refresh token list after wallet connection
          fetchJupiterTokens();
        } catch (error) {
          logger.error('Solflare wallet connection error:', error);
          setError('Failed to connect to Solflare wallet. Signature required to verify wallet ownership.');
          setWalletConnected(false);
        }
      }
      else {
        setError('Unsupported wallet type selected.');
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

  // Simplified getQuote function for Jupiter-only integration
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
      // Find the selected tokens to get their decimals
      const selectedFromToken = tokens.find(token => 
        token.address === fromToken
      );

      const selectedToToken = tokens.find(token => 
        token.address === toToken
      );
      
      // Validation logging
      logger.info('Token validation details:', {
        fromToken,
        toToken,
        fromTokenFound: !!selectedFromToken,
        toTokenFound: !!selectedToToken,
        tokensCount: tokens.length
      });
      
      if (!selectedFromToken) {
        setError(`'From' token (${fromToken}) not found in token list. Please try selecting a different token.`);
        setLoading(false);
        return;
      }
      
      if (!selectedToToken) {
        setError(`'To' token (${toToken}) not found in token list. Please try selecting a different token.`);
        setLoading(false);
        return;
      }
      
      const fromDecimals = selectedFromToken?.decimals || 9; // Default to 9 for Solana
      const toDecimals = selectedToToken?.decimals || 9; // Default to 9 for Solana
      
      // Convert amount to Jupiter format (Lamports/smallest unit)
      const inputAmount = Math.floor(parseFloat(fromAmount) * Math.pow(10, fromDecimals)).toString();
      
      // Calculate slippage basis points (1% = 100 basis points)
      const slippageBps = Math.floor(slippage * 100);
      
      // Clean token addresses (ensure no 0x prefix for Solana)
      const cleanFromToken = normalizeTokenAddress(fromToken);
      const cleanToToken = normalizeTokenAddress(toToken);
      
      // Fetch quote from Jupiter
      try {
        logger.info(`Fetching Jupiter quote for ${selectedFromToken.symbol} to ${selectedToToken.symbol}`);
        
        const jupiterQuote = await getJupiterQuote(
          cleanFromToken,
          cleanToToken,
          inputAmount,
          slippageBps
        );
        
        if (!jupiterQuote) {
          throw new Error('Failed to get quote from Jupiter');
        }
        
        // Calculate the output amount in user-readable format
        const outputAmount = (parseFloat(jupiterQuote.outputAmount) / Math.pow(10, toDecimals)).toString();
        
        // Store the quote details
        setToAmount(outputAmount);
        
        // Create a route object compatible with our UI
        const route = {
          id: jupiterQuote.routePlan?.map(step => step.swapInfo.label).join('-') || 'jupiter-route',
          fromToken: {
            address: cleanFromToken,
            symbol: selectedFromToken.symbol,
            decimals: fromDecimals,
            name: selectedFromToken.name,
            chainId: 'SOL'
          },
          toToken: {
            address: cleanToToken,
            symbol: selectedToToken.symbol,
            decimals: toDecimals,
            name: selectedToToken.name,
            chainId: 'SOL'
          },
          fromAmount: inputAmount,
          toAmount: jupiterQuote.outputAmount,
          gasCostUSD: '0.000001', // Solana gas is very cheap, placeholder value
          steps: [
            {
              type: 'swap',
              tool: 'Jupiter',
              toolDetails: {
                name: 'Jupiter',
                displayName: 'Jupiter',
                logoURI: 'https://jup.ag/jupiter-logo.svg'
              },
              action: {
                fromToken: {
                  address: cleanFromToken,
                  symbol: selectedFromToken.symbol,
                  decimals: fromDecimals,
                  name: selectedFromToken.name
                },
                toToken: {
                  address: cleanToToken,
                  symbol: selectedToToken.symbol,
                  decimals: toDecimals,
                  name: selectedToToken.name
                },
                fromAmount: inputAmount,
                toAmount: jupiterQuote.outputAmount,
                slippage: slippage
              },
              estimate: {
                fromAmount: inputAmount,
                toAmount: jupiterQuote.outputAmount,
                executionDuration: 20, // Estimate in seconds
                approvalAddress: null
              }
            }
          ],
          // Store the Jupiter quote response
          jupiterQuote: jupiterQuote
        };
        
        setRoutes([route]);
        setSelectedRoute(route);
        
        logger.info(`Quote received: ${fromAmount} ${selectedFromToken.symbol} → ${outputAmount} ${selectedToToken.symbol}`);
      } catch (jupiterError) {
        logger.error('Jupiter quote error:', jupiterError);
        
        // Detailed error logging
        logger.error('Jupiter quote request details:', {
          inputMint: cleanFromToken,
          outputMint: cleanToToken,
          amount: inputAmount,
          slippageBps,
          errorMessage: jupiterError.message || 'Unknown error'
        });
        
        setError(`Failed to get Jupiter quote: ${jupiterError.message || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Quote error:', error);
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

  // Execute swap using Jupiter API directly
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
      // Verify Solana wallet is connected
      if (!solanaProvider) {
        throw new Error('Solana wallet not connected');
      }
      
      // Extract necessary data from the route
      const fromMint = selectedRoute.fromToken.address;
      const toMint = selectedRoute.toToken.address;
      const amount = selectedRoute.fromAmount;
      const slippageBps = Math.floor(slippage * 100);
      
      try {
        // Execute the swap using our Jupiter wrapper function
        const result = await executeJupiterSwap(
          fromMint,
          toMint,
          amount,
          slippageBps,
          solanaProvider,
          solanaConnection
        );
        
        if (!result || !result.signature) {
          throw new Error('Failed to execute swap: No transaction signature returned');
        }
        
        setError(null);
        
        // Show success message with link to Solana Explorer
        const explorerUrl = `https://explorer.solana.com/tx/${result.signature}?cluster=mainnet-beta`;
        if (showNotification) {
          showNotification(
            `Swap completed! View on Solana Explorer: ${explorerUrl}`,
            'success'
          );
        } else {
          alert(`Swap completed successfully! Transaction: ${result.signature}`);
        }
      } catch (error) {
        logger.error('Jupiter swap execution error:', error);
        throw new Error(`Swap failed: ${error.message}`);
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

  // Remove this function as we've replaced it with a simpler version below

  // Update the scanSolanaWalletTokens function to include explicit debugging
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
          address: '11111111111111111111111111111111', // Native SOL - ENSURE NO 0x PREFIX
          chainId: solanaChain.id,
          name: 'Solana',
          symbol: 'SOL',
          decimals: 9,
          logoURI: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg',
          isUserToken: true
        },
        {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC - ENSURE NO 0x PREFIX
          chainId: solanaChain.id,
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
          isUserToken: true
        },
        {
          address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT on Solana
          chainId: 'SOL',
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
          isUserToken: true
        },
        {
          address: 'So11111111111111111111111111111111111111112', // Wrapped SOL
          chainId: 'SOL',
          name: 'Wrapped SOL',
          symbol: 'wSOL',
          decimals: 9,
          logoURI: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg',
          isUserToken: true
        },
        {
          address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL (Marinade)
          chainId: 'SOL',
          name: 'Marinade Staked SOL',
          symbol: 'mSOL',
          decimals: 9,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
          isUserToken: true
        },
        {
          address: '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj', // stSOL (Lido Staked SOL)
          chainId: 'SOL',
          name: 'Lido Staked SOL',
          symbol: 'stSOL',
          decimals: 9,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj/logo.png',
          isUserToken: true
        },
        {
          address: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', // jitoSOL
          chainId: 'SOL',
          name: 'Jito Staked SOL',
          symbol: 'jitoSOL',
          decimals: 9,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn/logo.png',
          isUserToken: true
        },
        {
          address: 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1', // bSOL (Blaze SOL)
          chainId: 'SOL',
          name: 'Blaze Staked SOL',
          symbol: 'bSOL',
          decimals: 9,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1/logo.png',
          isUserToken: true
        },
        {
          address: 'Saber2gLauYim4Mvftnrasomsv6NvAuncvMEZwcLpD1', // SBR (Saber)
          chainId: 'SOL',
          name: 'Saber Protocol Token',
          symbol: 'SBR',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Saber2gLauYim4Mvftnrasomsv6NvAuncvMEZwcLpD1/logo.svg',
          isUserToken: true
        },
        {
          address: 'RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a', // RAY (Raydium)
          chainId: 'SOL',
          name: 'Raydium',
          symbol: 'RAY',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a/logo.png',
          isUserToken: true
        },
        {
          address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', // ORCA
          chainId: 'SOL',
          name: 'Orca',
          symbol: 'ORCA',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE/logo.png',
          isUserToken: true
        },
        {
          address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
          chainId: 'SOL',
          name: 'Bonk',
          symbol: 'BONK',
          decimals: 5,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png',
          isUserToken: true
        },
        {
          address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP (Jupiter)
          chainId: 'SOL',
          name: 'Jupiter',
          symbol: 'JUP',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN/logo.png',
          isUserToken: true
        },
        {
          address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', // PYTH
          chainId: 'SOL',
          name: 'Pyth Network',
          symbol: 'PYTH',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3/logo.png',
          isUserToken: true
        },
        {
          address: 'Dq5C6Zmg37MQinAZiKRyXpHEPpnXPprEFQiPYagHisZj', // USDCet (USDC from Ethereum on Wormhole)
          chainId: 'SOL',
          name: 'USDC (Ethereum)',
          symbol: 'USDCet',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
          isUserToken: true
        },
        {
          address: 'Ea5SjE2Y6yvCeW5dYTn7PYMuW5ikXkvbGdcmSnXeaLjS', // PAI
          chainId: 'SOL',
          name: 'PAI (Parrot USD)',
          symbol: 'PAI',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Ea5SjE2Y6yvCeW5dYTn7PYMuW5ikXkvbGdcmSnXeaLjS/logo.png',
          isUserToken: true
        }
      ];
      
      // DEBUG: Log token addresses to ensure they have no 0x prefix
      logger.info('Solana token addresses (should NOT have 0x prefix):', 
        commonSolanaTokens.map(t => ({ symbol: t.symbol, address: t.address }))
      );
      
      // Add the common tokens to our list
      const updatedTokens = [...currentTokenList];
      
      // Add or update tokens - ENSURE NO TOKEN HAS 0x PREFIX
      commonSolanaTokens.forEach(token => {
        // Normalize the token address to remove any possible 0x prefix
        const normalizedAddress = normalizeTokenAddress(token.address, 'solana');
        
        const existingIndex = updatedTokens.findIndex(t => 
          normalizeTokenAddress(t.address, 'solana').toLowerCase() === normalizedAddress.toLowerCase()
        );
        
        if (existingIndex >= 0) {
          // Update existing token - ensure address has no 0x prefix
          updatedTokens[existingIndex] = {
            ...updatedTokens[existingIndex],
            address: normalizedAddress, // Ensure normalized
            isUserToken: true
          };
        } else {
          // Add new token - ensure address has no 0x prefix
          updatedTokens.push({
            ...token,
            address: normalizedAddress // Ensure normalized
          });
        }
      });
      
      // Debug: Log the first few tokens to check address format
      logger.info('Updated Solana tokens (sample):', 
        updatedTokens.slice(0, 3).map(t => ({ 
          symbol: t.symbol, 
          address: t.address,
          has0xPrefix: t.address.startsWith('0x')
        }))
      );
      
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
      // Call a comprehensive token fetch right after wallet connection
      fetchAllAvailableTokens();
    }
  }, [walletConnected, walletAddress, walletType]);

  // Add a new function to fetch all available tokens on the current chain
  const fetchAllAvailableTokens = async () => {
    if (!fromChain) return;
    
    try {
      setLoading(true);
      showNotification && showNotification('Loading all available tokens...', 'info');
      
      // For EVM chains - use Li.fi comprehensive token list
      const response = await axios.get(`https://li.quest/v1/tokens?chains=${fromChain}&includeAllTokens=true`, {
        headers: {
          'x-lifi-api-key': LIFI_API_KEY
        }
      });
      
      if (response.data && response.data.tokens && response.data.tokens[fromChain]) {
        let newTokens = response.data.tokens[fromChain];
        
        // Normalize token addresses based on chain type
        newTokens = newTokens.map(token => {
          // Check chain type to ensure addresses are normalized correctly
          const solanaChain = chains.find(c => 
            c.key?.toLowerCase() === 'sol' || 
            c.name?.toLowerCase() === 'solana' ||
            c.chainType === 'SVM' ||
            c.id === 'SOL'
          );
          
          const isSolanaChain = fromChain === 'SOL' || 
                                fromChain === solanaChain?.id || 
                                isSolanaFromChain;
                                
          // Ensure addresses are in correct format for the chain
          if (isSolanaChain) {
            // For Solana, addresses should never have 0x prefix
            return {
              ...token,
              address: token.address.replace(/^0x/, '')
            };
          } 
          // For EVM chains, ensure addresses have 0x prefix
          else if (!token.address.startsWith('0x') && token.address !== '0') {
            return {
              ...token,
              address: '0x' + token.address
            };
          }
          return token;
        });
        
        // If we have user tokens, mark them
        if (walletConnected) {
          // For simplicity, we'll just attempt to fetch balances only for the top tokens
          try {
            if (walletType === 'evm') {
              await addUserEVMTokens(newTokens);
            } else if (walletType === 'solana') {
              await scanSolanaWalletTokens();
            }
          } catch (error) {
            safeLogger.error('Error marking user tokens:', error);
          }
        }
        
        // Update the token state
        setTokens(prev => ({
          ...prev,
          [fromChain]: newTokens
        }));
        
        // Update the token lists
        setFromChainTokens(newTokens);
        setToChainTokens(newTokens);
        
        // Show success notification
        const tokenCount = newTokens.length;
        showNotification && showNotification(`Loaded ${tokenCount} tokens for ${fromChain}`, 'success');
        
        // Find suitable tokens to select by default
        if (!fromToken || fromToken === '' || !toToken || toToken === '') {
          // Find native token (usually the first one) or USDC
          let nativeToken = newTokens[0];
          
          // For EVM chains, try to find ETH/MATIC/BNB
          if (!isSolanaFromChain) {
            const nativeTokens = newTokens.filter(token => 
              token.address.toLowerCase() === '0x0000000000000000000000000000000000000000' ||
              token.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
            );
            if (nativeTokens.length > 0) {
              nativeToken = nativeTokens[0];
            }
          } else {
            // For Solana, find SOL
            const solToken = newTokens.find(token => 
              token.symbol.toUpperCase() === 'SOL' || 
              token.address === '11111111111111111111111111111111'
            );
            if (solToken) {
              nativeToken = solToken;
            }
          }
          
          const usdcToken = newTokens.find(t => 
            t.symbol.toLowerCase() === 'usdc' || 
            t.symbol.toLowerCase() === 'usdt'
          );
          
          safeLogger.info('Default token selection:', {
            nativeToken: nativeToken?.symbol,
            nativeTokenAddress: nativeToken?.address,
            usdcToken: usdcToken?.symbol,
            usdcTokenAddress: usdcToken?.address,
            totalTokens: newTokens.length
          });
          
          // Set from token
          if (nativeToken && (!fromToken || fromToken === '')) {
            setFromToken(nativeToken.address);
            safeLogger.info(`Set default 'from' token: ${nativeToken.symbol} (${nativeToken.address})`);
          }
          
          // Set to token
          if (usdcToken && (!toToken || toToken === '')) {
            setToToken(usdcToken.address);
            safeLogger.info(`Set default 'to' token: ${usdcToken.symbol} (${usdcToken.address})`);
          } else if (newTokens.length > 1 && (!toToken || toToken === '')) {
            // Make sure we don't select the same token as fromToken
            const secondToken = newTokens.find(t => t.address !== (nativeToken?.address || ''));
            if (secondToken) {
              setToToken(secondToken.address);
              safeLogger.info(`Set fallback 'to' token: ${secondToken.symbol} (${secondToken.address})`);
            }
          }
        }
      } else {
        safeLogger.error('Invalid token response format:', response.data);
        showNotification && showNotification('Failed to load tokens: Invalid response format', 'error');
      }
    } catch (error) {
      safeLogger.error('Error fetching all available tokens:', error);
      showNotification && showNotification('Failed to load all tokens. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to add user EVM tokens
  const addUserEVMTokens = async (tokenList) => {
    if (!walletConnected || walletType !== 'evm' || !window.ethereum) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenAddresses = tokenList.map(t => t.address.toLowerCase());
      
      // Only check balances for most common tokens to avoid too many RPC calls
      const topTokens = tokenList.slice(0, 50); // Check only top 50 tokens
      
      for (const token of topTokens) {
        try {
          // Skip if not ERC20
          if (token.address === '0x0000000000000000000000000000000000000000') continue;
          
          // Create contract instance
          const tokenContract = new ethers.Contract(
            token.address,
            [
              'function balanceOf(address owner) view returns (uint256)',
              'function decimals() view returns (uint8)'
            ],
            provider
          );
          
          // Check balance
          const balance = await tokenContract.balanceOf(walletAddress);
          const decimals = token.decimals || await tokenContract.decimals();
          
          // Convert to readable format
          const readableBalance = ethers.formatUnits(balance, decimals);
          
          // Mark as user token if balance > 0
          if (parseFloat(readableBalance) > 0) {
            const index = tokenList.findIndex(t => t.address.toLowerCase() === token.address.toLowerCase());
            if (index !== -1) {
              tokenList[index] = {
                ...tokenList[index],
                isUserToken: true,
                balance: readableBalance
              };
            }
          }
        } catch (e) {
          // Silently fail for individual tokens
          continue;
        }
      }
      
      // Check ETH balance
      try {
        const ethBalance = await provider.getBalance(walletAddress);
        const readableEthBalance = ethers.formatEther(ethBalance);
        
        // Find ETH/native token in the list
        const nativeTokenIndex = tokenList.findIndex(t => 
          t.address === '0x0000000000000000000000000000000000000000' || 
          t.address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
        );
        
        if (nativeTokenIndex !== -1 && parseFloat(readableEthBalance) > 0) {
          tokenList[nativeTokenIndex] = {
            ...tokenList[nativeTokenIndex],
            isUserToken: true,
            balance: readableEthBalance
          };
        }
      } catch (e) {
        // Silently fail for ETH balance
      }
      
      return tokenList;
    } catch (error) {
      logger.error('Error checking user EVM tokens:', error);
      return tokenList;
    }
  };

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

  // Add debugging function for token list validation
  const validateTokenSelection = () => {
    try {
      if (!fromChain || !fromToken || !toToken) {
        logger.info('Token validation skipped - missing required values');
        return;
      }
      
      // Check if tokens exist in their respective lists
      const fromTokenExists = fromChainTokens.some(token => 
        token.address.toLowerCase() === fromToken.toLowerCase()
      );
      
      const toTokenExists = toChainTokens.some(token => 
        token.address.toLowerCase() === toToken.toLowerCase()
      );
      
      logger.info('Token validation results:', {
        fromTokenExists,
        toTokenExists,
        fromToken,
        toToken,
        fromTokensCount: fromChainTokens.length,
        toTokensCount: toChainTokens.length,
        chainId: fromChain
      });
      
      if (!fromTokenExists) {
        logger.warn(`Selected 'from' token (${fromToken}) not found in token list!`);
      }
      
      if (!toTokenExists) {
        logger.warn(`Selected 'to' token (${toToken}) not found in token list!`);
      }
      
      // Use logger.info instead of logger.debug which might not exist
      logger.info('Sample tokens in list:', fromChainTokens.slice(0, 3).map(t => ({
        symbol: t.symbol,
        address: t.address
      })));
    } catch (error) {
      // Safely handle any errors in the validation function
      console.error('Error in token validation:', error);
    }
  };

  // Call the validation whenever tokens change with error handling
  useEffect(() => {
    try {
      if (fromToken && toToken && fromChainTokens.length > 0) {
        validateTokenSelection();
      }
    } catch (error) {
      console.error('Error calling validateTokenSelection:', error);
    }
  }, [fromToken, toToken, fromChainTokens.length]);

  // Make sure all logger calls are safe throughout the app
  const safeLogger = {
    info: (...args) => {
      try {
        if (logger && typeof logger.info === 'function') {
          logger.info(...args);
        } else {
          console.info(...args);
        }
      } catch (e) {
        console.info(...args);
      }
    },
    error: (...args) => {
      try {
        if (logger && typeof logger.error === 'function') {
          logger.error(...args);
        } else {
          console.error(...args);
        }
      } catch (e) {
        console.error(...args);
      }
    },
    warn: (...args) => {
      try {
        if (logger && typeof logger.warn === 'function') {
          logger.warn(...args);
        } else {
          console.warn(...args);
        }
      } catch (e) {
        console.warn(...args);
      }
    }
  };

  // Update the token selection handlers for Jupiter (Solana only)
  const handleFromTokenChange = (e) => {
    const tokenAddress = e.target.value;
    setFromToken(tokenAddress);
    
    // If we're selecting the same token for both, reset the toToken
    if (tokenAddress === toToken) {
      // Find an alternative token
      const alternativeToken = tokens.find(t => 
        t.address !== tokenAddress && 
        (t.symbol === 'USDC' || t.symbol === 'USDT' || t.isUserToken)
      );
      
      if (alternativeToken) {
        setToToken(alternativeToken.address);
      }
    }
  };

  const handleToTokenChange = (e) => {
    const tokenAddress = e.target.value;
    setToToken(tokenAddress);
  };

  // Normalize token addresses (remove any 0x prefix for Solana)
  const normalizeTokenAddress = (address) => {
    if (!address) return '';
    return address.replace(/^0x/, '');
  };

  // Add these Jupiter API functions
  // 1. Function to fetch a quote from Jupiter
  const getJupiterQuote = async (inputMint, outputMint, amount, slippageBps) => {
    try {
      logger.info('Fetching Jupiter quote:', { inputMint, outputMint, amount, slippageBps, feeBps: FEE_BPS });
      
      const response = await axios.get(`${JUPITER_QUOTE_API}/quote`, {
        params: {
          inputMint,               // Input token address
          outputMint,              // Output token address
          amount,                  // Amount in input token's smallest units
          slippageBps,             // Slippage in basis points (1% = 100)
          feeBps: FEE_BPS,         // Our fee in basis points (0.5% = 50)
          onlyDirectRoutes: false, // Use all available routes
          asLegacyTransaction: false, // Use versioned transactions
          restrictIntermediateTokens: false
          // feeAccount will be added in the swap execution
        }
      });
      
      logger.info('Jupiter quote received:', {
        inputAmount: response.data.inputAmount,
        outputAmount: response.data.outputAmount,
        otherAmountThreshold: response.data.otherAmountThreshold,
        routesCount: response.data.routesInfos?.length || 0
      });
      
      return response.data;
    } catch (error) {
      logger.error('Jupiter quote error:', error.response?.data || error.message || error);
      throw error;
    }
  };

  // 2. Function to get swap instructions from Jupiter
  const getJupiterSwapInstructions = async (quoteResponse, userPublicKey, feeAccount) => {
    try {
      logger.info('Getting Jupiter swap instructions');
      
      const swapRequest = {
        quoteResponse,
        userPublicKey,
        feeAccount: feeAccount || FEE_RECIPIENT,
        dynamicComputeUnitLimit: true, // Optimize compute units
        prioritizationFeeLamports: 1000 // Small fee to prioritize tx
      };
      
      const response = await axios.post(`${JUPITER_SWAP_API}/swap-instructions`, swapRequest);
      
      logger.info('Swap instructions received:', {
        computeBudgetInstructions: !!response.data.computeBudgetInstructions,
        setupInstructions: !!response.data.setupInstructions,
        swapInstruction: !!response.data.swapInstruction,
        cleanupInstruction: !!response.data.cleanupInstruction,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Jupiter swap instructions error:', error.response?.data || error.message || error);
      throw error;
    }
  };

  // 3. Function to convert Jupiter instructions to a Solana transaction
  const createSolanaTransaction = async (swapInstructions, connection) => {
    try {
      // Create a new transaction
      const transaction = new solanaWeb3.VersionedTransaction(
        new solanaWeb3.TransactionMessage({
          payerKey: new solanaWeb3.PublicKey(swapInstructions.userPublicKey),
          recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
          instructions: [
            ...swapInstructions.computeBudgetInstructions || [],
            ...swapInstructions.setupInstructions || [],
            swapInstructions.swapInstruction,
            ...swapInstructions.cleanupInstruction ? [swapInstructions.cleanupInstruction] : []
          ].map(instruction => {
            return {
              programId: new solanaWeb3.PublicKey(instruction.programId),
              keys: instruction.accounts.map(account => ({
                pubkey: new solanaWeb3.PublicKey(account.pubkey),
                isSigner: account.isSigner,
                isWritable: account.isWritable
              })),
              data: bs58.decode(instruction.data)
            };
          })
        }).compileToV0Message()
      );
      
      return transaction;
    } catch (error) {
      logger.error('Error creating Solana transaction:', error);
      throw error;
    }
  };

  // 4. Function to execute a Jupiter swap
  const executeJupiterSwap = async (fromMint, toMint, amount, slippageBps, wallet, connection) => {
    try {
      if (!wallet || !connection) {
        throw new Error('Wallet or connection not available');
      }
      
      // Convert fee recipient to Solana address format if needed
      let feeAccount = FEE_RECIPIENT;
      if (feeAccount.startsWith('0x')) {
        // This is a simplified conversion and might not be accurate
        // In a production app, you should use a properly formatted Solana address
        feeAccount = new solanaWeb3.PublicKey(
          Buffer.from(feeAccount.slice(2), 'hex')
        ).toString();
      }
      
      // 1. Get a quote
      const quoteResponse = await getJupiterQuote(
        fromMint,
        toMint,
        amount,
        slippageBps
      );
      
      // 2. Get swap instructions
      const swapInstructions = await getJupiterSwapInstructions(
        quoteResponse,
        wallet.publicKey.toString(),
        feeAccount
      );
      
      // 3. Create transaction
      const transaction = await createSolanaTransaction(swapInstructions, connection);
      
      // 4. Sign and send transaction
      const signedTx = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      
      // 5. Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature);
      
      return {
        signature,
        success: !confirmation.value.err,
        inputAmount: quoteResponse.inputAmount,
        outputAmount: quoteResponse.outputAmount
      };
    } catch (error) {
      logger.error('Error executing Jupiter swap:', error);
      throw error;
    }
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

          {/* Solana Network Info */}
          <div className="bg-gray-800/50 p-4 rounded-xl shadow-md border border-gray-700 hover:border-gray-600 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <img 
                  src="https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg" 
                  alt="Solana" 
                  className="w-6 h-6 mr-2" 
                />
                <div>
                  <div className="text-white font-medium">Solana Network</div>
                  <div className="text-xs text-gray-400">Powered by Jupiter</div>
                </div>
              </div>
              <div className="bg-blue-900/30 px-3 py-1 rounded-full text-xs text-blue-300 border border-blue-600/30">
                Same-Chain Swaps Only
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
                  onChange={handleFromTokenChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  disabled={tokens.length === 0}
                >
                  {tokens.length === 0 && <option value="">Loading tokens...</option>}
                  
                  {tokens.length > 0 && (
                    <option value="" disabled>
                      {walletConnected ? '---- Select token (includes wallet tokens) ----' : '---- Select token ----'}
                    </option>
                  )}
                  
                  {getSortedTokens(tokens).map(token => (
                    <option 
                      key={token.address} 
                      value={token.address} 
                      className={token.isUserToken ? 'text-green-400' : ''}
                    >
                      {token.symbol} {token.isUserToken ? '(in wallet)' : ''}
                    </option>
                  ))}
                </select>
                {fromToken && tokens.length > 0 && (
                  <div className="mt-2 flex items-center">
                    <img 
                      src={tokens.find(t => t.address === fromToken)?.logoURI || '/placeholder-token.png'} 
                      alt=""
                      className="w-6 h-6 mr-2 rounded-full shadow-md border border-gray-700"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder-token.png';
                      }}
                    />
                    <span className="text-sm font-medium text-white">{tokens.find(t => t.address === fromToken)?.symbol}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-gray-400 mb-2 text-xs sm:text-sm font-medium">To Token</label>
                <select 
                  value={toToken}
                  onChange={handleToTokenChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  disabled={tokens.length === 0}
                >
                  {tokens.length === 0 && <option value="">Loading tokens...</option>}
                  
                  {tokens.length > 0 && (
                    <option value="" disabled>
                      {walletConnected ? '---- Select token (includes wallet tokens) ----' : '---- Select token ----'}
                    </option>
                  )}
                  
                  {getSortedTokens(tokens).map(token => (
                    <option 
                      key={token.address} 
                      value={token.address}
                      className={token.isUserToken ? 'text-green-400' : ''}
                    >
                      {token.symbol} {token.isUserToken ? '(in wallet)' : ''}
                    </option>
                  ))}
                </select>
                {toToken && tokens.length > 0 && (
                  <div className="mt-2 flex items-center">
                    <img 
                      src={tokens.find(t => t.address === toToken)?.logoURI || '/placeholder-token.png'} 
                      alt=""
                      className="w-6 h-6 mr-2 rounded-full shadow-md border border-gray-700"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder-token.png';
                      }}
                    />
                    <span className="text-sm font-medium text-white">{tokens.find(t => t.address === toToken)?.symbol}</span>
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
