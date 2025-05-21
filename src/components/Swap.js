import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import logger from '../utils/logger';
import * as solanaWeb3 from '@solana/web3.js';
import PropTypes from 'prop-types';
import { PublicKey } from '@solana/web3.js';
import './Swap.css';

// Constants
const JUPITER_API_BASE_URL = 'https://quote-api.jup.ag/v6';
const FEE_PERCENTAGE = 0.5; // 0.5% fee
const FEE_RECIPIENT = process.env.REACT_APP_FEE_WALLET || '6MtTEBWBXPTwbrVCqiHp4iTe84J8CfXHPspYYWTfBPG9'; // Default fee wallet
// Use more reliable RPC endpoints with fallbacks
const SOLANA_RPC_ENDPOINTS = [
  'https://solana-mainnet.rpc.extrnode.com',
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
  'https://solana-api.projectserum.com'
];

// Style to hide unwanted UI elements
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
  // Basic state
  const [fromToken, setFromToken] = useState('');
  const [toToken, setToToken] = useState('');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [swapLoading, setSwapLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  
  // Wallet state
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletType, setWalletType] = useState('');
  const [userTokens, setUserTokens] = useState([]);
  
  // UI state
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [selectingToken, setSelectingToken] = useState('from'); // 'from' or 'to'
  const [tokenSearch, setTokenSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Initialize on component mount
  useEffect(() => {
    // Style injection to hide unwanted UI elements
    const styleEl = document.createElement('div');
    styleEl.innerHTML = hideDuckHuntStyle;
    document.head.appendChild(styleEl);
    
    // Hide duck hunt buttons
    const intervalId = setInterval(() => {
      const hideSelectors = [
        '#duck-hunt-button',
        '#start-duck-hunt',
        '.duck-hunt-button',
        '.start-duck-hunt',
        '[data-testid="duck-hunt-button"]'
      ];
      
      hideSelectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(el => {
            if (el) {
              el.style.display = 'none';
              el.style.visibility = 'hidden';
              el.style.opacity = '0';
              el.style.pointerEvents = 'none';
            }
          });
        } catch (e) {
          // Ignore errors
        }
      });
    }, 2000);
    
    // Initialize everything
    fetchSolanaTokens();
    checkWalletConnection();
    
    // Cleanup
    return () => {
      clearInterval(intervalId);
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, []);
  
  // Check wallet connection on mount and set up listeners
  const checkWalletConnection = useCallback(async () => {
    try {
      // Check for Phantom wallet
      const isPhantomInstalled = window.phantom?.solana?.isPhantom;
      // Check for Solflare wallet
      const isSolflareInstalled = window.solflare?.isSolflare;
      // Check for Backpack wallet
      const isBackpackInstalled = window.backpack?.isBackpack;
      
      let provider = null;
      let walletName = '';
      
      if (isPhantomInstalled) {
        provider = window.phantom.solana;
        walletName = 'Phantom';
      } else if (isSolflareInstalled) {
        provider = window.solflare;
        walletName = 'Solflare';
      } else if (isBackpackInstalled) {
        provider = window.backpack;
        walletName = 'Backpack';
      }
      
      if (provider) {
        // Try to connect if autoConnect is enabled
        try {
          // Check if the wallet is already connected
          if (provider.isConnected) {
            const publicKey = provider.publicKey?.toString();
            
            if (publicKey) {
              setWalletAddress(publicKey);
              setWalletConnected(true);
              setWalletType(walletName);
              
              // Detect user tokens once wallet is connected - wrap in try/catch to prevent app freezing
              try {
                await detectUserTokens(publicKey);
              } catch (error) {
                logger.error('Failed to detect user tokens:', error);
              }
              
              logger.info(`Connected to ${walletName} wallet: ${publicKey}`);
              showNotification(`Connected to ${walletName} wallet`, 'success');
            }
          }
          
          // Set up wallet change listener
          provider.on('connect', (publicKey) => {
            setWalletAddress(publicKey.toString());
            setWalletConnected(true);
            try {
              detectUserTokens(publicKey.toString());
            } catch (error) {
              logger.error('Failed to detect user tokens:', error);
            }
            showNotification(`Connected to ${walletName} wallet`, 'success');
          });
          
          provider.on('disconnect', () => {
            setWalletAddress('');
            setWalletConnected(false);
            setUserTokens([]);
            showNotification(`Disconnected from ${walletName} wallet`, 'info');
          });
          
          provider.on('accountChanged', (publicKey) => {
            if (publicKey) {
              setWalletAddress(publicKey.toString());
              try {
                detectUserTokens(publicKey.toString());
              } catch (error) {
                logger.error('Failed to detect user tokens:', error);
              }
              showNotification('Wallet account changed', 'info');
            } else {
              setWalletAddress('');
              setWalletConnected(false);
              setUserTokens([]);
            }
          });
        } catch (error) {
          logger.error(`Error connecting to ${walletName} wallet:`, error);
        }
      }
    } catch (error) {
      logger.error('Error checking wallet connection:', error);
    }
  }, [showNotification]);
  
  // Connect wallet
  const connectWallet = async () => {
    try {
      // Check for Phantom wallet
      const isPhantomInstalled = window.phantom?.solana?.isPhantom;
      // Check for Solflare wallet
      const isSolflareInstalled = window.solflare?.isSolflare;
      // Check for Backpack wallet
      const isBackpackInstalled = window.backpack?.isBackpack;
      
      let provider = null;
      let walletName = '';
      
      if (isPhantomInstalled) {
        provider = window.phantom.solana;
        walletName = 'Phantom';
      } else if (isSolflareInstalled) {
        provider = window.solflare;
        walletName = 'Solflare';
      } else if (isBackpackInstalled) {
        provider = window.backpack;
        walletName = 'Backpack';
      }
      
      if (provider) {
        try {
          // Connect to the wallet
          const resp = await provider.connect();
          const publicKey = resp.publicKey.toString();
          
          setWalletAddress(publicKey);
          setWalletConnected(true);
          setWalletType(walletName);
          
          // Detect user tokens once wallet is connected
          try {
            await detectUserTokens(publicKey);
          } catch (error) {
            logger.error('Failed to detect user tokens:', error);
            // Don't let token detection failure break the app
            showNotification('Connected, but could not fetch wallet tokens', 'warning');
          }
          
          logger.info(`Connected to ${walletName} wallet: ${publicKey}`);
          showNotification(`Connected to ${walletName} wallet`, 'success');
        } catch (error) {
          logger.error(`Error connecting to ${walletName} wallet:`, error);
          showNotification(`Failed to connect to ${walletName} wallet`, 'error');
        }
      } else {
        // No wallet installed
        showNotification('Please install a Solana wallet like Phantom, Solflare, or Backpack', 'info');
        
        // Open wallet installation page
        window.open('https://phantom.app/', '_blank');
      }
    } catch (error) {
      logger.error('Error connecting wallet:', error);
      showNotification('Failed to connect wallet', 'error');
    }
  };
  
  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      // Check which wallet is connected
      if (window.phantom?.solana?.isConnected && walletType === 'Phantom') {
        await window.phantom.solana.disconnect();
      } else if (window.solflare?.isConnected && walletType === 'Solflare') {
        await window.solflare.disconnect();
      } else if (window.backpack?.isConnected && walletType === 'Backpack') {
        await window.backpack.disconnect();
      }
      
      setWalletAddress('');
      setWalletConnected(false);
      setWalletType('');
      setUserTokens([]);
      
      showNotification('Wallet disconnected', 'info');
    } catch (error) {
      logger.error('Error disconnecting wallet:', error);
      showNotification('Failed to disconnect wallet', 'error');
    }
  };
  
  // Detect user tokens in connected wallet
  const detectUserTokens = async (walletAddress) => {
    try {
      if (!walletAddress) return;
      
      // Try each RPC endpoint until one works
      let connection = null;
      let tokenAccounts = null;
      let error = null;
      
      // Try each endpoint until one works
      for (const endpoint of SOLANA_RPC_ENDPOINTS) {
        try {
          connection = new solanaWeb3.Connection(endpoint, { commitment: 'confirmed' });
          
          // Test connection first with a simple request
          await connection.getSlot();
          
          // Get token accounts with a timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('RPC request timeout')), 10000)
          );
          
          tokenAccounts = await Promise.race([
            connection.getParsedTokenAccountsByOwner(
              new PublicKey(walletAddress),
              { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
            ),
            timeoutPromise
          ]);
          
          // If we get here, it worked, so break the loop
          break;
        } catch (err) {
          logger.warn(`RPC endpoint ${endpoint} failed: ${err.message}`);
          error = err;
          // Continue to next endpoint
        }
      }
      
      // If all endpoints failed
      if (!tokenAccounts) {
        throw error || new Error('All RPC endpoints failed');
      }
      
      // Filter for tokens with non-zero balance
      const userTokenAddresses = tokenAccounts.value
        .filter(account => {
          const tokenAmount = account.account.data.parsed.info.tokenAmount;
          return parseInt(tokenAmount.amount) > 0;
        })
        .map(account => account.account.data.parsed.info.mint);
      
      // Mark tokens in the main token list as user tokens
      const updatedTokens = tokens.map(token => ({
        ...token,
        isUserToken: userTokenAddresses.includes(token.address)
      }));
      
      // Update the token list
      setTokens(updatedTokens);
      
      // Extract user tokens
      const userTokensList = updatedTokens.filter(token => 
        userTokenAddresses.includes(token.address)
      );
      
      setUserTokens(userTokensList);
      
      logger.info(`Found ${userTokensList.length} tokens in user wallet`);
      
      // If from token not set and user has SOL, default to SOL
      if (!fromToken && userTokensList.length > 0) {
        const solToken = userTokensList.find(t => t.symbol === 'SOL' || t.symbol === 'WSOL');
        if (solToken) {
          setFromToken(solToken.address);
        } else if (userTokensList.length > 0) {
          // Or use the first user token
          setFromToken(userTokensList[0].address);
        }
      }
    } catch (error) {
      logger.error('Error detecting user tokens:', error);
      // Don't let token detection failure break the app
      showNotification('Could not fetch wallet tokens, but you can still trade', 'warning');
    }
  };
  
  // Fetch tokens from Jupiter API
  const fetchSolanaTokens = async () => {
    try {
      setLoading(true);
      
      // Check localStorage for cached tokens first
      const cachedTokensString = localStorage.getItem('jupiterTokens');
      const cachedTimestamp = localStorage.getItem('jupiterTokensTimestamp');
      const now = Date.now();
      const CACHE_DURATION = 3600000; // 1 hour
      
      // Use cached tokens if they exist and are less than 1 hour old
      let jupiterTokens = [];
      if (cachedTokensString && cachedTimestamp && (now - parseInt(cachedTimestamp) < CACHE_DURATION)) {
        try {
          jupiterTokens = JSON.parse(cachedTokensString);
          logger.info(`Using ${jupiterTokens.length} cached Solana tokens`);
          
          if (jupiterTokens.length > 0) {
            processTokens(jupiterTokens);
            setLoading(false);
            
            // Fetch fresh tokens in the background
            fetchFreshTokens().catch(err => 
              logger.warn('Background token refresh failed:', err)
            );
            return;
          }
        } catch (err) {
          logger.warn('Error parsing cached tokens:', err);
          // Continue to fetch tokens from API
        }
      }
      
      // Fetch fresh tokens (either because cache was invalid or to update UI immediately)
      await fetchFreshTokens();
      
    } catch (error) {
      logger.error('Failed to fetch Solana tokens:', error);
      handleTokenError();
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to fetch fresh tokens from Jupiter API
  const fetchFreshTokens = async () => {
    try {
      // Set a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Token fetch timeout')), 15000)
      );
      
      const response = await Promise.race([
        axios.get('https://token.jup.ag/all'),
        timeoutPromise
      ]);
      
      if (response.data && Array.isArray(response.data)) {
        // Format tokens to our structure
        const jupiterTokens = response.data.map(token => ({
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          logoURI: token.logoURI || '',
          tags: token.tags || []
        }));
        
        // Cache tokens in localStorage
        localStorage.setItem('jupiterTokens', JSON.stringify(jupiterTokens));
        localStorage.setItem('jupiterTokensTimestamp', Date.now().toString());
        
        // Process the tokens
        processTokens(jupiterTokens);
        
        logger.info(`Loaded ${jupiterTokens.length} Solana tokens from Jupiter API`);
      }
    } catch (error) {
      logger.error('Error fetching fresh tokens:', error);
      throw error;
    }
  };
  
  // Process tokens (mark common, sort, set default)
  const processTokens = (jupiterTokens) => {
    // Prioritize common tokens
    const commonSymbols = ['SOL', 'USDC', 'USDT', 'BTC', 'ETH', 'BONK', 'JUP', 'RAY', 'ORCA'];
    jupiterTokens.forEach(token => {
      token.isCommon = commonSymbols.includes(token.symbol);
    });
    
    // Sort tokens: common tokens first, then alphabetically
    jupiterTokens.sort((a, b) => {
      if (a.isCommon && !b.isCommon) return -1;
      if (!a.isCommon && b.isCommon) return 1;
      return a.symbol.localeCompare(b.symbol);
    });
    
    // Set tokens
    setTokens(jupiterTokens);
    
    // Default to SOL and USDC
    const solToken = jupiterTokens.find(t => t.symbol === 'SOL' || t.symbol === 'WSOL');
    const usdcToken = jupiterTokens.find(t => t.symbol === 'USDC');
    
    if (solToken && !fromToken) setFromToken(solToken.address);
    if (usdcToken && !toToken) setToToken(usdcToken.address);
  };
  
  // Handle token error (set default tokens)
  const handleTokenError = () => {
    setError('Failed to load Solana tokens. Using default list.');
    
    // Set some default tokens as fallback
    const defaultTokens = [
      {
        address: 'So11111111111111111111111111111111111111112',
        name: 'Wrapped SOL',
        symbol: 'SOL',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        isCommon: true
      },
      {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        isCommon: true
      },
      {
        address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        name: 'USDT',
        symbol: 'USDT',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
        isCommon: true
      },
      {
        address: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
        name: 'MNGO',
        symbol: 'MNGO',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac/logo.png',
        isCommon: true
      }
    ];
    
    setTokens(defaultTokens);
    if (!fromToken) setFromToken(defaultTokens[0].address);
    if (!toToken) setToToken(defaultTokens[1].address);
  };
  
  // Get quote from Jupiter API
  const getQuote = async () => {
    try {
      if (!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0) {
        return;
      }
      
      setQuoteLoading(true);
      setError(null);
      
      // Find token info
      const fromTokenInfo = tokens.find(t => t.address === fromToken);
      const toTokenInfo = tokens.find(t => t.address === toToken);
      
      if (!fromTokenInfo || !toTokenInfo) {
        setError('Token information not found');
        return;
      }
      
      // Convert input amount to proper decimals
      const inputAmount = Math.floor(parseFloat(fromAmount) * 10 ** fromTokenInfo.decimals);
      
      // Calculate fee amount (0.5% of input)
      const feePercentage = FEE_PERCENTAGE / 100;
      const feeAmount = Math.floor(inputAmount * feePercentage);
      const platformFeeBps = Math.floor(feePercentage * 10000); // Convert to basis points
      
      // Get quote from Jupiter API
      const quoteParams = {
        inputMint: fromToken,
        outputMint: toToken,
        amount: inputAmount,
        slippageBps: Math.floor(slippage * 100),
        platformFeeBps: platformFeeBps > 0 ? platformFeeBps : undefined,
        onlyDirectRoutes: false,
      };
      
      // Add fee recipient if fee is enabled
      if (platformFeeBps > 0) {
        quoteParams.feeBps = platformFeeBps;
        quoteParams.feeAccount = FEE_RECIPIENT;
      }
      
      // Set a timeout to avoid hanging if the API is slow
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Quote request timeout')), 15000)
      );
      
      const response = await Promise.race([
        axios.get(`${JUPITER_API_BASE_URL}/quote`, {
          params: quoteParams
        }),
        timeoutPromise
      ]);
      
      if (response.data) {
        // Set the quote data
        setSelectedRoute(response.data);
        
        // Update the output amount
        const outputAmount = response.data.outAmount / (10 ** toTokenInfo.decimals);
        setToAmount(outputAmount.toString());
        
        logger.info('Received quote from Jupiter API:', response.data);
      }
    } catch (error) {
      logger.error('Error getting quote:', error);
      setError('Failed to get quote. Please try again or adjust your inputs.');
      setToAmount('');
      setSelectedRoute(null);
    } finally {
      setQuoteLoading(false);
    }
  };
  
  // Execute the swap
  const executeSwap = async () => {
    try {
      if (!walletConnected) {
        showNotification('Please connect your wallet first', 'info');
        return;
      }
      
      if (!selectedRoute) {
        showNotification('Please get a quote first', 'info');
        return;
      }
      
      setSwapLoading(true);
      setError(null);
      
      // Determine which wallet provider to use
      let walletProvider;
      if (walletType === 'Phantom') {
        walletProvider = window.phantom.solana;
      } else if (walletType === 'Solflare') {
        walletProvider = window.solflare;
      } else if (walletType === 'Backpack') {
        walletProvider = window.backpack;
      } else {
        throw new Error('Unsupported wallet type');
      }
      
      // Get the serialized transactions from Jupiter
      const swapParams = {
        quoteResponse: selectedRoute,
        userPublicKey: walletAddress,
        wrapUnwrapSOL: true // Automatically wrap/unwrap SOL if needed
      };
      
      // Set a timeout to avoid hanging if the API is slow
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Swap transaction request timeout')), 20000)
      );
      
      const swapResponse = await Promise.race([
        axios.post(`${JUPITER_API_BASE_URL}/swap`, swapParams),
        timeoutPromise
      ]);
      
      if (!swapResponse.data || !swapResponse.data.swapTransaction) {
        throw new Error('Invalid swap response from Jupiter API');
      }
      
      // Deserialize the transaction
      const swapTransactionBuf = Buffer.from(swapResponse.data.swapTransaction, 'base64');
      
      // Sign and send the transaction with a timeout
      const signTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Wallet signature timeout')), 60000)
      );
      
      const signature = await Promise.race([
        walletProvider.signAndSendTransaction(swapTransactionBuf),
        signTimeoutPromise
      ]);
      
      logger.info('Swap transaction sent with signature:', signature);
      
      // Show success notification
      showNotification('Swap transaction sent! Check your wallet for confirmation.', 'success');
      
      // Clear form after successful swap
      setFromAmount('');
      setToAmount('');
      setSelectedRoute(null);
      
      // Reset quote after a short delay
      setTimeout(() => {
        setSelectedRoute(null);
      }, 3000);
    } catch (error) {
      logger.error('Error executing swap:', error);
      
      // More user-friendly error messages based on common failure cases
      let errorMessage = 'Failed to execute swap. Please try again.';
      
      if (error.message.includes('timeout')) {
        errorMessage = 'Operation timed out. Please try again or check your internet connection.';
      } else if (error.message.includes('User rejected')) {
        errorMessage = 'Transaction was rejected in your wallet.';
      } else if (error.message.includes('insufficient funds') || error.message.includes('insufficient balance')) {
        errorMessage = 'Insufficient funds for this transaction.';
      }
      
      setError(errorMessage);
      showNotification('Swap failed: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setSwapLoading(false);
    }
  };
  
  // Get token info by address
  const getTokenInfo = (address) => {
    return tokens.find(t => t.address === address) || null;
  };
  
  // Handle from amount change - get quote when amount changes
  const handleFromAmountChange = (e) => {
    const value = e.target.value;
    setFromAmount(value);
    
    // Debounce quote request
    const timer = setTimeout(() => {
      if (value && parseFloat(value) > 0) {
        getQuote();
      } else {
        setToAmount('');
        setSelectedRoute(null);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  };
  
  // Switch tokens (from → to and to → from)
  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
    setSelectedRoute(null);
    
    // Get new quote after a short delay
    setTimeout(() => {
      if (toAmount && parseFloat(toAmount) > 0) {
        getQuote();
      }
    }, 500);
  };
  
  // Open token selector
  const openTokenSelector = (type) => {
    setSelectingToken(type);
    setShowTokenSelector(true);
    setTokenSearch('');
  };
  
  // Select token and close selector
  const selectToken = (address) => {
    if (selectingToken === 'from') {
      if (address === toToken) {
        // If selecting the same token as "to", switch them
        setToToken(fromToken);
      }
      setFromToken(address);
    } else {
      if (address === fromToken) {
        // If selecting the same token as "from", switch them
        setFromToken(toToken);
      }
      setToToken(address);
    }
    
    setShowTokenSelector(false);
    
    // Get new quote if we have an amount
    if (fromAmount && parseFloat(fromAmount) > 0) {
      // Short delay to allow state to update
      setTimeout(() => {
        getQuote();
      }, 500);
    }
  };
  
  // Filter tokens for selector
  const getFilteredTokens = () => {
    if (!tokenSearch) {
      // Show user tokens first, then common tokens, then all tokens
      return [
        ...tokens.filter(t => t.isUserToken),
        ...tokens.filter(t => t.isCommon && !t.isUserToken),
        ...tokens.filter(t => !t.isCommon && !t.isUserToken)
      ];
    }
    
    const search = tokenSearch.toLowerCase();
    return tokens.filter(t => 
      t.symbol.toLowerCase().includes(search) || 
      t.name.toLowerCase().includes(search) ||
      t.address.toLowerCase() === search
    );
  };
  
  // Format display amount with appropriate decimals
  const formatDisplayAmount = (amount, decimals = 6) => {
    if (!amount) return '';
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return '';
    
    // For very small numbers, show more decimals
    if (parsedAmount < 0.000001) {
      return parsedAmount.toFixed(9);
    }
    
    return parsedAmount.toFixed(decimals);
  };
  
  // Render token selector
  const renderTokenSelector = () => {
    const filteredTokens = getFilteredTokens();
    
    return (
      <div className="token-selector">
        <div className="token-selector-header">
          <h3>Select Token</h3>
          <button 
            onClick={() => setShowTokenSelector(false)}
            className="close-button"
          >
            ✕
          </button>
        </div>
        
        <div className="token-search">
          <input
            type="text"
            placeholder="Search by name or address"
            value={tokenSearch}
            onChange={(e) => setTokenSearch(e.target.value)}
          />
        </div>
        
        <div className="token-list">
          {filteredTokens.length === 0 ? (
            <div className="no-tokens">No tokens found</div>
          ) : (
            filteredTokens.map(token => (
              <div 
                key={token.address}
                className={`token-item ${token.isUserToken ? 'user-token' : ''}`}
                onClick={() => selectToken(token.address)}
              >
                <div className="token-icon">
                  {token.logoURI ? (
                    <img 
                      src={token.logoURI} 
                      alt={token.symbol}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${token.symbol}&size=35&background=random`;
                      }}
                    />
                  ) : (
                    <div className="token-icon-placeholder">
                      {token.symbol.slice(0, 2)}
                    </div>
                  )}
                </div>
                
                <div className="token-info">
                  <div className="token-name">
                    {token.symbol}
                    {token.isUserToken && (
                      <span className="token-badge">In Wallet</span>
                    )}
                  </div>
                  <div className="token-full-name">{token.name}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };
  
  // Render settings panel
  const renderSettings = () => {
    return (
      <div className="settings-panel">
        <div className="settings-header">
          <h3>Swap Settings</h3>
          <button 
            onClick={() => setShowSettings(false)}
            className="close-button"
          >
            ✕
          </button>
        </div>
        
        <div className="settings-content">
          <div className="setting-item">
            <label>Slippage Tolerance</label>
            <div className="slippage-options">
              <button 
                className={slippage === 0.1 ? 'active' : ''}
                onClick={() => setSlippage(0.1)}
              >
                0.1%
              </button>
              <button 
                className={slippage === 0.5 ? 'active' : ''}
                onClick={() => setSlippage(0.5)}
              >
                0.5%
              </button>
              <button 
                className={slippage === 1.0 ? 'active' : ''}
                onClick={() => setSlippage(1.0)}
              >
                1.0%
              </button>
              <div className="custom-slippage">
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={slippage}
                  onChange={(e) => setSlippage(parseFloat(e.target.value))}
                />
                <span>%</span>
              </div>
            </div>
          </div>
          
          <div className="setting-info">
            <div className="fee-info">
              <span>Platform Fee:</span>
              <span>{FEE_PERCENTAGE}%</span>
            </div>
            <div className="version-info">
              <span>Jupiter API Version:</span>
              <span>v6</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="swap-container">
      <div className="swap-card">
        <div className="swap-header">
          <h2>AquaSwap</h2>
          <div className="swap-actions">
            <button 
              className="settings-button"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
        
        <div className="swap-body">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="swap-form">
            {/* From Token */}
            <div className="token-input-container">
              <div className="token-input-label">From</div>
              <div className="token-input-wrapper">
                <button 
                  className="token-selector-button"
                  onClick={() => openTokenSelector('from')}
                >
                  {fromToken ? (
                    <>
                      <div className="token-icon">
                        {getTokenInfo(fromToken)?.logoURI ? (
                          <img 
                            src={getTokenInfo(fromToken)?.logoURI} 
                            alt={getTokenInfo(fromToken)?.symbol}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${getTokenInfo(fromToken)?.symbol}&size=35&background=random`;
                            }}
                          />
                        ) : (
                          <div className="token-icon-placeholder">
                            {getTokenInfo(fromToken)?.symbol.slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <span>{getTokenInfo(fromToken)?.symbol}</span>
                    </>
                  ) : (
                    'Select Token'
                  )}
                  <span className="dropdown-arrow">▼</span>
                </button>
                
                <input
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={handleFromAmountChange}
                  disabled={!fromToken || loading}
                />
              </div>
              
              {walletConnected && fromToken && getTokenInfo(fromToken)?.isUserToken && (
                <div className="balance-info">
                  {/* Balance would be shown here when implemented */}
                  {/* <button className="max-button">MAX</button> */}
                </div>
              )}
            </div>
            
            {/* Swap Button */}
            <div className="swap-direction-button">
              <button onClick={switchTokens} disabled={!fromToken || !toToken}>
                ↑↓
              </button>
            </div>
            
            {/* To Token */}
            <div className="token-input-container">
              <div className="token-input-label">To</div>
              <div className="token-input-wrapper">
                <button 
                  className="token-selector-button"
                  onClick={() => openTokenSelector('to')}
                >
                  {toToken ? (
                    <>
                      <div className="token-icon">
                        {getTokenInfo(toToken)?.logoURI ? (
                          <img 
                            src={getTokenInfo(toToken)?.logoURI} 
                            alt={getTokenInfo(toToken)?.symbol}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${getTokenInfo(toToken)?.symbol}&size=35&background=random`;
                            }}
                          />
                        ) : (
                          <div className="token-icon-placeholder">
                            {getTokenInfo(toToken)?.symbol.slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <span>{getTokenInfo(toToken)?.symbol}</span>
                    </>
                  ) : (
                    'Select Token'
                  )}
                  <span className="dropdown-arrow">▼</span>
                </button>
                
                <input
                  type="number"
                  placeholder="0.0"
                  value={toAmount}
                  readOnly
                  disabled
                />
              </div>
            </div>
            
            {/* Swap Rate */}
            {selectedRoute && fromToken && toToken && fromAmount && toAmount && (
              <div className="swap-rate">
                <div className="rate-info">
                  <span>Rate:</span>
                  <span>
                    1 {getTokenInfo(fromToken)?.symbol} ≈ {' '}
                    {formatDisplayAmount(parseFloat(toAmount) / parseFloat(fromAmount))} {getTokenInfo(toToken)?.symbol}
                  </span>
                </div>
                <div className="fee-info">
                  <span>Platform Fee:</span>
                  <span>{FEE_PERCENTAGE}%</span>
                </div>
              </div>
            )}
            
            {/* Connect Wallet / Swap Button */}
            {!walletConnected ? (
              <button 
                className="connect-wallet-button"
                onClick={connectWallet}
                disabled={loading}
              >
                Connect Wallet
              </button>
            ) : (
              <button 
                className="swap-button"
                onClick={executeSwap}
                disabled={
                  !fromToken || 
                  !toToken || 
                  !fromAmount || 
                  !toAmount || 
                  !selectedRoute ||
                  quoteLoading ||
                  swapLoading
                }
              >
                {swapLoading ? 'Swapping...' : 
                 quoteLoading ? 'Getting Quote...' : 
                 'Swap'}
              </button>
            )}
          </div>
        </div>
        
        {walletConnected && (
          <div className="wallet-info">
            <div className="wallet-address">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </div>
            <button 
              className="disconnect-wallet-button"
              onClick={disconnectWallet}
            >
              Disconnect
            </button>
          </div>
        )}
        
        <div className="powered-by">
          <div>Powered by <a href="https://jup.ag" target="_blank" rel="noopener noreferrer">Jupiter</a></div>
          <div className="fee-disclaimer">All swaps include a {FEE_PERCENTAGE}% platform fee</div>
        </div>
      </div>
      
      {/* Token Selector Modal */}
      {showTokenSelector && renderTokenSelector()}
      
      {/* Settings Modal */}
      {showSettings && renderSettings()}
    </div>
  );
};

Swap.propTypes = {
  currentUser: PropTypes.object,
  showNotification: PropTypes.func.isRequired
};

export default Swap;
