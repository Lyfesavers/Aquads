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
// Use more reliable RPC endpoints with fallbacks - prefer public endpoints not requiring auth
const SOLANA_RPC_ENDPOINTS = [
  'https://api.devnet.solana.com', // Devnet is often more permissive with CORS
  'https://solana-mainnet.rpc.extrnode.com',
  'https://mainnet.helius-rpc.com/?api-key=15319b0f-9379-4c57-81e5-79d8519ab768', // Helius RPC with free tier
  'https://solana.getblock.io/mainnet/?api_key=3a7a1442-04ac-404c-811e-ef57241e429f', // GetBlock free tier
  'https://rpc.hellomoon.io/3ddfbd2e-c973-414b-b4c6-10eb6bc7ec2a', // HelloMoon free tier
  'https://sparkling-wild-river.solana-mainnet.quiknode.pro/', // QuickNode free tier
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
  const [tokenBalances, setTokenBalances] = useState({}); // Store token balances
  
  // UI state
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [selectingToken, setSelectingToken] = useState('from'); // 'from' or 'to'
  const [tokenSearch, setTokenSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [displayTokens, setDisplayTokens] = useState([]);
  const [showMoreTokens, setShowMoreTokens] = useState(false);
  const [hasMoreTokens, setHasMoreTokens] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false); // New state for wallet selector modal

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
  
  // Show wallet selection modal
  const showWalletOptions = () => {
    setShowWalletSelector(true);
  };
  
  // Connect to specific wallet type
  const connectToWallet = async (walletType) => {
    try {
      setLoading(true);
      setShowWalletSelector(false);
      
      let provider = null;
      
      if (walletType === 'Phantom' && window.phantom?.solana?.isPhantom) {
        provider = window.phantom.solana;
      } else if (walletType === 'Solflare' && window.solflare?.isSolflare) {
        provider = window.solflare;
      } else if (walletType === 'Backpack' && window.backpack?.isBackpack) {
        provider = window.backpack;
      } else {
        // Wallet not installed
        showNotification(`${walletType} wallet not found. Please install it first.`, 'warning');
        
        // Open wallet installation page based on selected type
        if (walletType === 'Phantom') {
          window.open('https://phantom.app/', '_blank');
        } else if (walletType === 'Solflare') {
          window.open('https://solflare.com/', '_blank');
        } else if (walletType === 'Backpack') {
          window.open('https://backpack.app/', '_blank');
        }
        
        setLoading(false);
        return;
      }
      
      try {
        logger.info(`Requesting connection to ${walletType} wallet...`);
        
        // Force disconnect first
        try {
          await provider.disconnect();
          logger.info('Forced disconnect before connecting');
        } catch (err) {
          // Ignore errors during disconnect
          logger.warn('Error during wallet disconnect:', err.message);
        }
        
        // Clear any cached auto-connect permissions
        if (typeof localStorage !== 'undefined') {
          try {
            // Try to clear any stored permissions in localStorage
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (
                key.includes('wallet') || 
                key.includes('phantom') || 
                key.includes('solflare') ||
                key.includes('backpack') ||
                key.includes('connect') ||
                key.includes('authorize')
              )) {
                keysToRemove.push(key);
              }
            }
            
            // Remove identified keys
            keysToRemove.forEach(key => {
              localStorage.removeItem(key);
            });
            
            logger.info('Cleared potential wallet auth caches');
          } catch (e) {
            logger.warn('Error clearing localStorage:', e);
          }
        }
        
        // Request a fresh connection with explicit approval
        showNotification(`Please approve the connection in your ${walletType} wallet`, 'info');
        
        // Connect with explicit user permission required
        const resp = await provider.connect({ onlyIfTrusted: false });
        
        if (!resp || !resp.publicKey) {
          throw new Error('Wallet connection failed: No public key received');
        }
        
        const publicKey = resp.publicKey.toString();
        logger.info(`Wallet initially connected: ${publicKey}`);
        
        // Now require a signature to ensure the user has to explicitly approve
        showNotification(`Please sign the message in your ${walletType} wallet to confirm access`, 'info');
        
        // Create a UTF-8 encoded message for signing
        const message = `Welcome to AquaSwap!\n\nThis signature is required for secure connection to AquaSwap.\n\nThis signature will not trigger any blockchain transactions or incur any fees.\n\nTimestamp: ${Date.now()}`;
        const encodedMessage = new TextEncoder().encode(message);
        
        // Request signature
        try {
          const signatureResponse = await provider.signMessage(encodedMessage, 'utf8');
          
          if (!signatureResponse || !signatureResponse.signature) {
            throw new Error('Signature verification failed');
          }
          
          logger.info('Signature verified successfully');
        } catch (signError) {
          // If user rejected signature, disconnect and abort
          logger.error('Signature error:', signError);
          try {
            await provider.disconnect();
          } catch (e) {
            // Ignore
          }
          throw new Error('Connection cancelled: Message signing declined');
        }
        
        // All checks passed, set connection state
        setWalletAddress(publicKey);
        setWalletConnected(true);
        setWalletType(walletType);
        showNotification(`Successfully connected to ${walletType} wallet`, 'success');
        
        // Set some timeout to ensure UI updates before attempting RPC calls
        setTimeout(async () => {
          try {
            // Detect user tokens once wallet is connected
            await detectUserTokens(publicKey);
          } catch (e) {
            logger.error("Error detecting tokens:", e);
            showNotification("Connected to wallet, but couldn't fetch tokens", 'warning');
          }
        }, 500);
        
      } catch (error) {
        logger.error(`Error connecting to ${walletType} wallet:`, error);
        
        // Provide more specific error messages for common wallet errors
        let errorMessage = 'Connection error';
        
        if (error.message.includes('User rejected')) {
          errorMessage = 'Connection rejected by user';
        } else if (error.message.includes('declined') || error.message.includes('signature')) {
          errorMessage = 'Signature declined by user';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Connection timed out';
        } else {
          errorMessage = error.message;
        }
        
        showNotification(`Wallet connection issue: ${errorMessage}`, 'error');
      }
    } catch (error) {
      logger.error('Error connecting wallet:', error);
      showNotification('Failed to connect wallet: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Connect wallet - show wallet selection modal
  const connectWallet = () => {
    showWalletOptions();
  };
  
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
        // Don't auto-connect, but set up listeners for wallet events
        
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
      }
    } catch (error) {
      logger.error('Error checking wallet connection:', error);
    }
  }, [showNotification]);
  
  // Disconnect wallet with improved error handling
  const disconnectWallet = async () => {
    try {
      setLoading(true);
      
      // Check which wallet is connected
      let provider = null;
      
      if (window.phantom?.solana?.isConnected && walletType === 'Phantom') {
        provider = window.phantom.solana;
      } else if (window.solflare?.isConnected && walletType === 'Solflare') {
        provider = window.solflare;
      } else if (window.backpack?.isConnected && walletType === 'Backpack') {
        provider = window.backpack;
      }
      
      if (provider) {
        logger.info(`Disconnecting from ${walletType} wallet...`);
        
        try {
          // Set a timeout to prevent hanging
          const disconnectPromise = provider.disconnect();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Wallet disconnect timed out')), 10000)
          );
          
          await Promise.race([disconnectPromise, timeoutPromise]);
          logger.info('Wallet disconnected successfully');
        } catch (err) {
          // Even if the disconnect fails, we'll still reset the UI state
          logger.warn(`Error during wallet disconnect: ${err.message}`);
        }
      }
      
      // Clean up state regardless of disconnect success
      setWalletAddress('');
      setWalletConnected(false);
      setWalletType('');
      setUserTokens([]);
      setTokenBalances({});
      
      showNotification('Wallet disconnected', 'info');
    } catch (error) {
      logger.error('Error disconnecting wallet:', error);
      showNotification('Failed to disconnect wallet: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Detect user tokens in connected wallet
  const detectUserTokens = async (walletAddress) => {
    try {
      if (!walletAddress) return;
      
      // Show notification that we're fetching balances
      showNotification('Fetching wallet balances...', 'info');
      
      // Try each RPC endpoint until one works
      let connection = null;
      let tokenAccounts = null;
      let error = null;
      
      // Set loading indicator but don't block UI
      const loadingId = setTimeout(() => setLoading(true), 300);
      
      // Wrapper function to safely execute an RPC call with a timeout
      const safeRpcCall = async (endpoint, operation) => {
        try {
          logger.info(`Trying RPC endpoint: ${endpoint}`);
          const conn = new solanaWeb3.Connection(endpoint, { commitment: 'confirmed' });
          
          // First test with a simple call
          await Promise.race([
            conn.getSlot(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Connection test timeout')), 3000))
          ]);
          
          // If we get here, the basic connection works, so try the actual operation
          const result = await Promise.race([
            operation(conn),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), 8000))
          ]);
          
          return { success: true, result, connection: conn };
        } catch (err) {
          logger.warn(`RPC endpoint ${endpoint} failed: ${err.message}`);
          return { success: false, error: err };
        }
      };
      
      // Try to get token accounts from any working endpoint
      let successfulConnection = null;
      for (const endpoint of SOLANA_RPC_ENDPOINTS) {
        const result = await safeRpcCall(endpoint, async (conn) => {
          return await conn.getParsedTokenAccountsByOwner(
            new PublicKey(walletAddress),
            { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
          );
        });
        
        if (result.success) {
          tokenAccounts = result.result;
          successfulConnection = result.connection;
          logger.info(`Successfully connected to ${endpoint}`);
          break;
        }
      }
      
      // Clear loading timeout and state
      clearTimeout(loadingId);
      setLoading(false);
      
      // Handle case where all endpoints failed for token accounts
      if (!tokenAccounts) {
        logger.warn('All RPC endpoints failed when fetching token accounts');
        // Fall back to basic functionality without token account data
        showNotification('Could not fetch token details, but swap functionality still available', 'warning');
        return;
      }
      
      // Store token balances
      const balances = {};
      const userTokenAddresses = [];
      
      // Process token accounts
      for (const account of tokenAccounts.value) {
        try {
          const tokenAmount = account.account.data.parsed.info.tokenAmount;
          const amount = parseInt(tokenAmount.amount);
          const tokenAddress = account.account.data.parsed.info.mint;
          
          if (amount > 0) {
            // Store balance information
            balances[tokenAddress] = {
              amount: amount,
              decimals: tokenAmount.decimals,
              uiAmount: tokenAmount.uiAmount
            };
            userTokenAddresses.push(tokenAddress);
            logger.info(`Found token: ${tokenAddress} with balance: ${tokenAmount.uiAmount}`);
          }
        } catch (err) {
          logger.warn(`Error processing token account: ${err.message}`);
        }
      }
      
      // If we have a successful connection, use it to get SOL balance
      if (successfulConnection) {
        try {
          const solBalance = await successfulConnection.getBalance(new PublicKey(walletAddress));
          if (solBalance > 0) {
            const solUiAmount = solBalance / 1000000000;
            balances['SOL'] = {
              amount: solBalance,
              decimals: 9,
              uiAmount: solUiAmount
            };
            const wrappedSolAddress = 'So11111111111111111111111111111111111111112';
            balances[wrappedSolAddress] = {
              amount: solBalance,
              decimals: 9,
              uiAmount: solUiAmount
            };
            userTokenAddresses.push(wrappedSolAddress);
            logger.info(`Added SOL balance: ${solUiAmount} SOL`);
          }
        } catch (err) {
          logger.warn(`Error getting SOL balance: ${err.message}`);
        }
      }
      
      // Save balances
      setTokenBalances(balances);
            
      // Mark tokens in the main token list as user tokens
      const updatedTokens = tokens.map(token => ({
        ...token,
        isUserToken: userTokenAddresses.includes(token.address) || 
                    (token.symbol === 'SOL' && balances['SOL']) ||
                    balances[token.address] != null
      }));
      
      // Update the token list
      setTokens(updatedTokens);
      
      // Extract user tokens
      const userTokensList = updatedTokens.filter(token => 
        userTokenAddresses.includes(token.address) || 
        (token.symbol === 'SOL' && balances['SOL']) ||
        balances[token.address] != null
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
      
      showNotification('Wallet balances updated', 'success');
    } catch (error) {
      logger.error('Error detecting user tokens:', error);
      // Don't let token detection failure break the app
      showNotification('Could not fetch wallet tokens, but you can still trade', 'warning');
      setLoading(false);
    }
  };
  
  // Get the user's balance for a specific token
  const getTokenBalance = (tokenAddress) => {
    if (!tokenAddress) {
      logger.info('getTokenBalance called with null tokenAddress');
      return null;
    }
    
    // Check for SOL special case - many tools use both direct SOL and wrapped SOL
    if (tokenAddress === 'SOL' || tokenAddress === 'So11111111111111111111111111111111111111112') {
      const solBalance = tokenBalances['SOL'] || tokenBalances['So11111111111111111111111111111111111111112'];
      
      if (solBalance) {
        logger.info(`Found SOL balance: ${solBalance.uiAmount}`);
        return solBalance;
      } else {
        logger.info('SOL balance not found in tokenBalances');
        // If wallet is connected but no SOL balance is found, log the available balances
        if (walletConnected) {
          logger.info('Available token balances:', Object.keys(tokenBalances));
        }
        return null;
      }
    }
    
    // Check regular token
    const balance = tokenBalances[tokenAddress];
    if (balance) {
      logger.info(`Found balance for ${tokenAddress}: ${balance.uiAmount}`);
      return balance;
    } else {
      logger.info(`No balance found for ${tokenAddress}`);
      return null;
    }
  };
  
  // Get formatted balance string
  const getFormattedBalance = (tokenAddress) => {
    const balance = getTokenBalance(tokenAddress);
    if (!balance) return '0';
    
    return balance.uiAmount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    });
  };
  
  // Set max amount from balance
  const setMaxAmount = () => {
    if (!fromToken) return;
    
    const balance = getTokenBalance(fromToken);
    if (!balance) return;
    
    // For SOL, leave some for gas fees (0.01 SOL minimum)
    let maxAmount;
    if (fromToken === 'So11111111111111111111111111111111111111112' || 
        getTokenInfo(fromToken)?.symbol === 'SOL') {
      // Keep 0.01 SOL (or more if it's a larger amount) for transaction fees
      const reserveAmount = Math.max(0.01, balance.uiAmount * 0.01);
      maxAmount = Math.max(0, balance.uiAmount - reserveAmount);
    } else {
      // For other tokens, use 99.5% of balance to account for fees
      maxAmount = balance.uiAmount * 0.995;
    }
    
    // Format with appropriate precision based on balance size
    const formattedAmount = maxAmount.toFixed(
      maxAmount < 0.01 ? 6 : 
      maxAmount < 1 ? 4 : 2
    );
    
    // Set the amount and update the form
    setFromAmount(formattedAmount);
    
    // Trigger quote after a short delay to ensure state updates
    setTimeout(() => getQuote(formattedAmount), 100);
  };
  
  // Handle from amount change - get quote when amount changes
  const handleFromAmountChange = (e) => {
    const value = e.target.value;
    setFromAmount(value);
    
    // Debounce quote request
    const timer = setTimeout(() => {
      if (value && parseFloat(value) > 0) {
        getQuote(value);
      } else {
        setToAmount('');
        setSelectedRoute(null);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  };
  
  // Get quote from Jupiter API
  const getQuote = async (amount = null) => {
    try {
      // Use provided amount or state amount
      const inputAmount = amount || fromAmount;
      
      if (!fromToken || !toToken || !inputAmount || parseFloat(inputAmount) <= 0) {
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
      
      // Check if user has enough balance (if connected to wallet)
      if (walletConnected) {
        const balance = getTokenBalance(fromToken);
        
        // Only check if we have balance info
        if (balance) {
          const amountInSmallestUnit = parseFloat(inputAmount) * (10 ** fromTokenInfo.decimals);
          
          if (amountInSmallestUnit > balance.amount) {
            setError(`Insufficient balance. You have ${getFormattedBalance(fromToken)} ${fromTokenInfo.symbol}`);
            setToAmount('');
            setSelectedRoute(null);
            setQuoteLoading(false);
            return;
          }
        }
      }
      
      // Convert input amount to proper decimals
      const inputAmountInSmallestUnit = Math.floor(parseFloat(inputAmount) * 10 ** fromTokenInfo.decimals);
      
      // Calculate fee amount (0.5% of input)
      const feePercentage = FEE_PERCENTAGE / 100;
      const feeAmount = Math.floor(inputAmountInSmallestUnit * feePercentage);
      const platformFeeBps = Math.floor(feePercentage * 10000); // Convert to basis points
      
      // Get quote from Jupiter API
      const quoteParams = {
        inputMint: fromToken,
        outputMint: toToken,
        amount: inputAmountInSmallestUnit,
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
  
  // Open token selector with optimized loading
  const openTokenSelector = (type) => {
    setSelectingToken(type);
    setTokenSearch('');
    setShowMoreTokens(false);
    
    // Pre-filter just the common tokens first before showing the modal
    // to prevent UI freezing when opening the selector
    const commonTokens = tokens.filter(t => t.isCommon || t.isUserToken);
    // Initially just show top tokens for immediate response
    setDisplayTokens(commonTokens.slice(0, 10));
    setShowTokenSelector(true);
    
    // Then load the rest with a slight delay
    setTimeout(() => {
      const filteredTokens = getFilteredTokens();
      const INITIAL_TOKEN_LIMIT = 20;
      
      // Show full initial set after short delay
      setDisplayTokens(filteredTokens.slice(0, INITIAL_TOKEN_LIMIT));
      setHasMoreTokens(filteredTokens.length > INITIAL_TOKEN_LIMIT);
    }, 100);
  };
  
  // Select token and close selector
  const selectToken = (address) => {
    // Close immediately to prevent freezing
    setShowTokenSelector(false);
    
    // Process selection after UI update
    setTimeout(() => {
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
      
      // Get new quote if we have an amount
      if (fromAmount && parseFloat(fromAmount) > 0) {
        // Delay to allow state to update
        setTimeout(() => {
          getQuote();
        }, 300);
      }
    }, 50);
  };
  
  // Filter tokens for selector
  const getFilteredTokens = () => {
    // First apply search filter if any
    let filtered = tokens;
    
    if (tokenSearch) {
      const search = tokenSearch.toLowerCase();
      filtered = tokens.filter(t => 
        t.symbol.toLowerCase().includes(search) || 
        t.name.toLowerCase().includes(search) ||
        t.address.toLowerCase() === search
      );
    }
    
    // Then organize by priority
    const userTokens = filtered.filter(t => t.isUserToken);
    const commonTokens = filtered.filter(t => t.isCommon && !t.isUserToken);
    const otherTokens = filtered.filter(t => !t.isCommon && !t.isUserToken);
    
    // Return prioritized list
    return [...userTokens, ...commonTokens, ...otherTokens];
  };
  
  // Effect to handle token pagination - with performance optimizations
  useEffect(() => {
    if (!showTokenSelector) return;
    
    // Throttle the filtering operation
    const timeoutId = setTimeout(() => {
      const filteredTokens = getFilteredTokens();
      const INITIAL_TOKEN_LIMIT = 20; // Reduced from potentially larger value
      const LOAD_MORE_INCREMENT = 30; // Reduced from 50 for better performance
      
      if (tokenSearch) {
        // When searching, limit maximum results to prevent UI freezing
        const limitedResults = filteredTokens.slice(0, 100); // Cap at 100 search results
        setDisplayTokens(limitedResults);
        setHasMoreTokens(filteredTokens.length > 100);
      } else {
        // Without search, paginate with smaller chunks
        if (showMoreTokens) {
          // Show more tokens
          setDisplayTokens(filteredTokens.slice(0, INITIAL_TOKEN_LIMIT + LOAD_MORE_INCREMENT));
        } else {
          // Show initial number of tokens
          setDisplayTokens(filteredTokens.slice(0, INITIAL_TOKEN_LIMIT)); 
        }
        // Check if there are more tokens to show
        setHasMoreTokens(filteredTokens.length > (showMoreTokens ? 
          INITIAL_TOKEN_LIMIT + LOAD_MORE_INCREMENT : INITIAL_TOKEN_LIMIT));
      }
    }, 100); // Small delay for better performance
    
    return () => clearTimeout(timeoutId);
  }, [tokenSearch, showTokenSelector, showMoreTokens, tokens]);
  
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
  
    // Render token list items efficiently
    const renderTokenItems = () => {
      if (displayTokens.length === 0) {
        return <div className="no-tokens">No tokens found</div>;
      }

      return (
        <>
          {displayTokens.map(token => (
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
                    loading="lazy" // Add lazy loading for images
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
                  {token.isCommon && !token.isUserToken && (
                    <span className="token-badge common">Popular</span>
                  )}
                </div>
                <div className="token-full-name">{token.name}</div>
              </div>
            </div>
          ))}
          
          {hasMoreTokens && (
            <div className="load-more-container">
              <button 
                className="load-more-button"
                onClick={() => setShowMoreTokens(true)}
              >
                Load more tokens
              </button>
            </div>
          )}
        </>
      );
    };

    return (
      <div className="token-selector">
        <div className="token-selector-header">
          <h3>Select Token</h3>
          <button 
            onClick={() => {
              setShowTokenSelector(false);
              setTokenSearch('');
              setShowMoreTokens(false);
            }}
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
            autoFocus
          />
        </div>
        
        <div className="token-list">
          {renderTokenItems()}
        </div>
        
        <div className="token-selector-footer">
          <div className="token-count-info">
            Showing {displayTokens.length} of {filteredTokens.length} tokens
          </div>
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

  // Helper function to fetch fresh tokens from Jupiter API
  const fetchFreshTokens = async () => {
    try {
      // Set loading state
      setLoading(true);
      setError(null);
      
      // Use multiple token list sources for redundancy
      const tokenSources = [
        'https://token.jup.ag/all',
        'https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json',
        'https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json'
      ];
      
      let tokenData = null;
      let error = null;
      
      // Try each source until one works
      for (const source of tokenSources) {
        try {
          logger.info(`Attempting to fetch tokens from ${source}`);
          
          // Set a timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Token fetch timeout from ${source}`)), 15000)
          );
          
          const response = await Promise.race([
            axios.get(source),
            timeoutPromise
          ]);
          
          if (response.data) {
            // Check if we need to extract from a tokens array (for solana token list format)
            if (response.data.tokens && Array.isArray(response.data.tokens)) {
              tokenData = response.data.tokens;
            } else if (Array.isArray(response.data)) {
              tokenData = response.data;
            }
            
            if (tokenData && tokenData.length > 0) {
              logger.info(`Successfully fetched ${tokenData.length} tokens from ${source}`);
              break; // Exit the loop if we have valid data
            }
          }
        } catch (err) {
          error = err;
          logger.warn(`Failed to fetch tokens from ${source}:`, err.message);
          // Continue to next source
        }
      }
      
      if (!tokenData || tokenData.length === 0) {
        throw error || new Error('All token sources failed');
      }
      
      // Format tokens to our structure (handling both Jupiter and Solana token list formats)
      const formattedTokens = tokenData.map(token => ({
        address: token.address || token.mintAddress || token.mint,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        logoURI: token.logoURI || token.icon || '',
        tags: token.tags || []
      }));
      
      // Cache tokens in localStorage
      try {
        localStorage.setItem('jupiterTokens', JSON.stringify(formattedTokens));
        localStorage.setItem('jupiterTokensTimestamp', Date.now().toString());
      } catch (err) {
        logger.warn('Failed to cache tokens to localStorage:', err.message);
      }
      
      // Process the tokens
      processTokens(formattedTokens);
      
      logger.info(`Loaded ${formattedTokens.length} Solana tokens`);
      return formattedTokens;
    } catch (error) {
      logger.error('Error fetching tokens:', error);
      handleTokenError();
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Handle token error (set default tokens)
  const handleTokenError = () => {
    setError('Failed to load Solana tokens. Using default list.');
    
    // Set some default tokens as fallback - more extensive list
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
      },
      {
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        name: 'BONK',
        symbol: 'BONK',
        decimals: 5,
        logoURI: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
        isCommon: true
      },
      {
        address: '7i5KKsX2weiTkry7jA4ZwSuXGhs5eJBEjY8vVxR4pfRx',
        name: 'Raydium',
        symbol: 'RAY',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7i5KKsX2weiTkry7jA4ZwSuXGhs5eJBEjY8vVxR4pfRx/logo.png',
        isCommon: true
      },
      {
        address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
        name: 'Orca',
        symbol: 'ORCA',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE/logo.png',
        isCommon: true
      },
      {
        address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
        name: 'Jupiter',
        symbol: 'JUP',
        decimals: 6,
        logoURI: 'https://static.jup.ag/jup/jup-logo.svg',
        isCommon: true
      },
      {
        address: 'kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6',
        name: 'KIN',
        symbol: 'KIN',
        decimals: 5,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6/logo.png',
        isCommon: true
      },
      {
        address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
        name: 'Marinade staked SOL',
        symbol: 'mSOL',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
        isCommon: true
      }
    ];
    
    // Process the default tokens
    processTokens(defaultTokens);
  };
  
  // Fetch tokens from Jupiter API with better error handling
  const fetchSolanaTokens = async () => {
    try {
      // Check localStorage for cached tokens first
      const cachedTokensString = localStorage.getItem('jupiterTokens');
      const cachedTimestamp = localStorage.getItem('jupiterTokensTimestamp');
      const now = Date.now();
      const CACHE_DURATION = 3600000; // 1 hour
      
      // Use cached tokens if they exist and are less than 1 hour old
      let cachedTokens = [];
      
      if (cachedTokensString && cachedTimestamp && (now - parseInt(cachedTimestamp) < CACHE_DURATION)) {
        try {
          cachedTokens = JSON.parse(cachedTokensString);
          logger.info(`Using ${cachedTokens.length} cached Solana tokens`);
          
          if (cachedTokens.length > 0) {
            // Process cached tokens
            processTokens(cachedTokens);
            
            // Fetch fresh tokens in the background with a delay
            setTimeout(() => {
              fetchFreshTokens().catch(err => 
                logger.warn('Background token refresh failed:', err)
              );
            }, 5000);
            
            return true;
          }
        } catch (err) {
          logger.warn('Error parsing cached tokens:', err);
          // Continue to fetch tokens from API
        }
      }
      
      // If we don't have valid cached tokens, fetch fresh ones
      const result = await fetchFreshTokens();
      return !!result;
      
    } catch (error) {
      logger.error('Failed to fetch Solana tokens:', error);
      handleTokenError();
      return false;
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

  // Render wallet selector
  const renderWalletSelector = () => {
    const walletOptions = [
      { type: 'Phantom', icon: 'https://phantom.app/img/phantom-logo.svg' },
      { type: 'Solflare', icon: 'https://solflare.com/assets/logo.svg' },
      { type: 'Backpack', icon: 'https://backpack.app/assets/backpack-logo.svg' }
    ];
    
    return (
      <div className="wallet-selector">
        <div className="wallet-selector-header">
          <h3>Select Wallet</h3>
          <button 
            onClick={() => setShowWalletSelector(false)}
            className="close-button"
          >
            ✕
          </button>
        </div>
        
        <div className="wallet-options">
          {walletOptions.map(wallet => (
            <button
              key={wallet.type}
              className="wallet-option-button"
              onClick={() => connectToWallet(wallet.type)}
            >
              <div className="wallet-option-icon">
                <img 
                  src={wallet.icon} 
                  alt={wallet.type}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${wallet.type}&size=35&background=random`;
                  }}
                />
              </div>
              <span>{wallet.type}</span>
            </button>
          ))}
        </div>
        
        <div className="wallet-selector-footer">
          <p>Don't have a wallet?{' '}
            <a 
              href="https://phantom.app/" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Get one here
            </a>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="swap-container">
      <div className="swap-card">
        <div className="swap-header">
          <h2>
            <img 
              src="/AquaSwap.svg" 
              alt="AquaSwap" 
              className="aquaswap-logo" 
              width="24" 
              height="24"
            />
            AquaSwap (UNDER CONSTRUCTION)
          </h2>
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
              
              {/* Always show balance when wallet is connected and token is selected */}
              {walletConnected && fromToken && (
                <div className="balance-info">
                  <span>
                    Balance: {getFormattedBalance(fromToken)} {getTokenInfo(fromToken)?.symbol}
                    <button
                      className="refresh-balance-button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        detectUserTokens(walletAddress);
                      }}
                      title="Refresh balance"
                    >
                      🔄
                    </button>
                  </span>
                  <button 
                    className="max-button"
                    onClick={setMaxAmount}
                  >
                    MAX
                  </button>
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
              
              {/* Always show to-token balance when wallet is connected */}
              {walletConnected && toToken && (
                <div className="balance-info-no-max">
                  <span>
                    Balance: {getFormattedBalance(toToken)} {getTokenInfo(toToken)?.symbol}
                    <button
                      className="refresh-balance-button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        detectUserTokens(walletAddress);
                      }}
                      title="Refresh balance"
                    >
                      🔄
                    </button>
                  </span>
                </div>
              )}
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
            <div className="wallet-buttons">
              <button 
                className="refresh-wallet-button"
                onClick={() => detectUserTokens(walletAddress)}
                title="Refresh wallet balances"
              >
                🔄
              </button>
              <button 
                className="disconnect-wallet-button"
                onClick={disconnectWallet}
              >
                Disconnect
              </button>
            </div>
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
      
      {/* Wallet Selector Modal */}
      {showWalletSelector && renderWalletSelector()}
    </div>
  );
};

Swap.propTypes = {
  currentUser: PropTypes.object,
  showNotification: PropTypes.func.isRequired
};

export default Swap;
