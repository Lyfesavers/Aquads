import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import logger from '../utils/logger';

// Add CSS to hide the Duck Hunt button
const hideDuckHuntStyle = `
  <style>
    /* Hide Duck Hunt button */
    [class*="duck-hunt"], 
    [id*="duck-hunt"],
    [class*="duckhunt"], 
    [id*="duckhunt"],
    .crisp-client,
    .intercom-lightweight-app,
    [class*="intercom"],
    [id*="intercom"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  </style>
`;

const Swap = () => {
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
  
  const LIFI_API_KEY = process.env.REACT_APP_LIFI_API_KEY;
  const FEE_PERCENTAGE = 0.5; // 0.5% fee
  const FEE_RECIPIENT = process.env.REACT_APP_FEE_WALLET || '0x98BC1BEC892d9f74B606D478E6b45089D2faAB05'; // Default to a wallet if not set

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
  }, [LIFI_API_KEY]);

  useEffect(() => {
    // Inject CSS to hide Duck Hunt button and other third-party elements
    const styleEl = document.createElement('div');
    styleEl.innerHTML = hideDuckHuntStyle;
    document.head.appendChild(styleEl);
    
    // Listen for messages from parent iframe
    const handleMessage = (event) => {
      // Check if it's a wallet connect message
      if (event.data && event.data.type === 'CONNECT_WALLET') {
        connectWallet();
      }
    };
    window.addEventListener('message', handleMessage);
    
    // Set up a mutation observer to catch dynamically added Duck Hunt elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            // Check if the node is an element
            if (node.nodeType === 1) {
              // Check if it contains duck hunt related elements
              if (node.id && (node.id.includes('duck') || node.id.includes('hunt'))) {
                node.style.display = 'none';
              }
              if (node.className && typeof node.className === 'string' && 
                  (node.className.includes('duck') || node.className.includes('hunt'))) {
                node.style.display = 'none';
              }
            }
          }
        }
      });
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Fetch available chains
    const fetchChains = async () => {
      try {
        const response = await axios.get('https://li.quest/v1/chains', {
          headers: {
            'x-lifi-api-key': LIFI_API_KEY
          }
        });
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
      window.removeEventListener('message', handleMessage);
      observer.disconnect();
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
        const response = await axios.get(`https://li.quest/v1/tokens?chains=${chainsToFetch}`, {
          headers: {
            'x-lifi-api-key': LIFI_API_KEY
          }
        });
        
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
  }, [fromChain, toChain, LIFI_API_KEY]);

  // Handle chain changes
  const handleFromChainChange = (e) => {
    const newChain = e.target.value;
    setFromChain(newChain);
    setFromToken(''); // Reset token when chain changes
    
    // If tokens for this chain are already loaded
    if (tokens[newChain]) {
      setFromChainTokens(tokens[newChain]);
      if (tokens[newChain].length > 0) {
        setFromToken(tokens[newChain][0].address);
      }
    }
  };
  
  const handleToChainChange = (e) => {
    const newChain = e.target.value;
    setToChain(newChain);
    setToToken(''); // Reset token when chain changes
    
    // If tokens for this chain are already loaded
    if (tokens[newChain]) {
      setToChainTokens(tokens[newChain]);
      if (tokens[newChain].length > 0) {
        // Try to find a stablecoin
        const stablecoin = tokens[newChain].find(t => 
          t.symbol.toLowerCase() === 'usdc' || 
          t.symbol.toLowerCase() === 'usdt' ||
          t.symbol.toLowerCase() === 'dai'
        );
        
        if (stablecoin) {
          setToToken(stablecoin.address);
        } else if (tokens[newChain].length > 1) {
          setToToken(tokens[newChain][1].address);
        } else {
          setToToken(tokens[newChain][0].address);
        }
      }
    }
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
    
    setWalletOptions(available);
    const installedWallets = available.filter(w => w.installed);
    logger.info('Detected installed wallets:', installedWallets.map(w => w.name));
    
    return installedWallets.length > 0;
  };

  // Fix wallet connection logic for MetaMask with stronger verification
  const connectWallet = async (walletId) => {
    try {
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
          
          // Only then request accounts
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
            
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
            setWalletType('evm');
            setShowWalletModal(false);
            logger.info(`Connected MetaMask:`, accounts[0]);
          } else {
            throw new Error('Invalid account data from MetaMask');
          }
        } catch (error) {
          logger.error('MetaMask connection error:', error);
          setError(`Failed to connect to MetaMask: ${error.message || 'Unknown error'}`);
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
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
            setWalletType('evm');
            setShowWalletModal(false);
            logger.info(`Connected Coinbase Wallet:`, accounts[0]);
          } else {
            throw new Error('Invalid account response from Coinbase Wallet');
          }
        } catch (error) {
          logger.error('Coinbase Wallet connection error:', error);
          setError('Failed to connect to Coinbase Wallet.');
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
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
            setWalletType('evm');
            setShowWalletModal(false);
            logger.info(`Connected Trust Wallet:`, accounts[0]);
          } else {
            throw new Error('Invalid account response from Trust Wallet');
          }
        } catch (error) {
          logger.error('Trust Wallet connection error:', error);
          setError('Failed to connect to Trust Wallet.');
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
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
            setWalletType('evm');
            setShowWalletModal(false);
            logger.info(`Connected Brave Wallet:`, accounts[0]);
          } else {
            throw new Error('Invalid account response from Brave Wallet');
          }
        } catch (error) {
          logger.error('Brave Wallet connection error:', error);
          setError('Failed to connect to Brave Wallet.');
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
      setError('Failed to connect wallet. Please try again.');
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
            <span className="text-blue-300">{`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}</span>
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

  // Fix the "You Receive" amount display issue
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

    // Check if from and to tokens are the same and on the same chain
    if (fromToken === toToken && fromChain === toChain) {
      setError('Source and destination tokens cannot be the same on the same chain');
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
      const decimals = selectedFromToken?.decimals || 18;
      
      // Fee as a decimal fraction (0.005 for 0.5%)
      const feeDecimal = FEE_PERCENTAGE / 100;
      
      // Parse amount with proper decimals
      let fromAmountInWei;
      try {
        fromAmountInWei = ethers.parseUnits(fromAmount, decimals).toString();
      } catch (e) {
        logger.error('Error parsing amount:', e);
        setError('Invalid amount format. Please check your input.');
        setLoading(false);
        return;
      }
      
      const requestParams = {
        fromChain,
        toChain,
        fromToken,
        toToken,
        fromAmount: fromAmountInWei,
        fromAddress: walletAddress,
        slippage: slippage.toString(),
        fee: feeDecimal.toString(), // Pass fee as decimal fraction (e.g., "0.005")
        integrator: 'AquaSwap',
        referrer: FEE_RECIPIENT
      };
      
      logger.info('Request params:', requestParams);
      
      // Request quote from li.fi
      const response = await axios.get('https://li.quest/v1/quote', {
        headers: {
          'x-lifi-api-key': LIFI_API_KEY
        },
        params: requestParams
      });

      // Check if routes exist
      if (!response.data.routes || response.data.routes.length === 0) {
        // Suggest alternative tokens or chains
        await suggestAlternatives(fromChain, toChain, fromToken, toToken);
        setLoading(false);
        return;
      }

      setRoutes(response.data.routes || []);
      if (response.data.routes?.length > 0) {
        // Get the best route from the response
        const bestRoute = response.data.routes[0];
        
        // Get the token decimals for output token
        const selectedToToken = tokens[toChain]?.find(token => token.address === toToken);
        const toDecimals = selectedToToken?.decimals || 18;
        
        // Ensure toAmount is properly formatted with decimals
        let formattedToAmount;
        try {
          formattedToAmount = ethers.formatUnits(bestRoute.toAmount, toDecimals);
          setToAmount(formattedToAmount);
          logger.info(`Quote received: ${fromAmount} → ${formattedToAmount}`);
        } catch (error) {
          logger.error('Error formatting toAmount:', error);
          setToAmount('Error');
        }

        // For display, calculate the actual fee amount in tokens
        const feeDisplayAmount = parseFloat(fromAmount) * feeDecimal;
        
        // Update the selectedRoute state with the route and fee information
        setSelectedRoute({
          ...bestRoute,
          feeDisplayAmount
        });
      } else {
        setError('No routes found for this swap');
      }
    } catch (error) {
      logger.error('Quote error:', error.response?.data || error.message || error);
      if (error.response?.status === 404 || 
          (error.response?.data?.message && error.response.data.message.includes("No available quotes"))) {
        await suggestAlternatives(fromChain, toChain, fromToken, toToken);
      } else if (error.response?.data?.message) {
        setError(`API Error: ${error.response.data.message}`);
      } else {
        setError('Failed to get quote. Please try different tokens or amount.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to suggest alternatives when no quotes are available
  const suggestAlternatives = async (fromChainId, toChainId, fromTokenAddr, toTokenAddr) => {
    try {
      // Get token details
      const sourceToken = tokens[fromChainId]?.find(t => t.address === fromTokenAddr);
      const destToken = tokens[toChainId]?.find(t => t.address === toTokenAddr);
      
      // Get chain details
      const sourceChain = chains.find(c => c.id.toString() === fromChainId.toString());
      const destChain = chains.find(c => c.id.toString() === toChainId.toString());
      
      let errorMsg = `No routes available from ${sourceChain?.name || fromChainId} to ${destChain?.name || toChainId}`;
      
      if (sourceToken && destToken) {
        errorMsg += ` for ${sourceToken.symbol} → ${destToken.symbol}`;
      }
      
      errorMsg += ". Try one of these alternatives:";
      
      // Suggest popular chains with good bridge support
      let suggestions = [];
      
      // Suggestion 1: Try a stablecoin if not already using one
      const stablecoins = {
        "USDC": true,
        "USDT": true,
        "DAI": true,
        "BUSD": true
      };
      
      const isFromStable = sourceToken && stablecoins[sourceToken.symbol];
      const isToStable = destToken && stablecoins[destToken.symbol];
      
      if (!isFromStable && !isToStable) {
        const fromStable = tokens[fromChainId]?.find(t => 
          stablecoins[t.symbol] && t.symbol === "USDC"
        );
        const toStable = tokens[toChainId]?.find(t => 
          stablecoins[t.symbol] && t.symbol === "USDC"
        );
        
        if (fromStable && toStable) {
          suggestions.push(`Try USDC → USDC between these chains`);
        }
      }
      
      // Suggestion 2: Try popular chains
      if (fromChainId !== "1" && toChainId !== "1") {
        suggestions.push(`Try routing through Ethereum (ETH) mainnet`);
      }
      
      if (fromChainId !== "137" && toChainId !== "137") {
        suggestions.push(`Try routing through Polygon (MATIC)`);
      }
      
      if (fromChainId !== "56" && toChainId !== "56") {
        suggestions.push(`Try routing through BNB Chain (BSC)`);
      }
      
      // Suggestion 3: Try a different amount
      suggestions.push(`Try a different amount (e.g., try 0.1 or 0.01 of your token)`);
      
      // Suggestion 4: Try higher slippage
      if (slippage < 1) {
        suggestions.push(`Increase slippage tolerance to 1% or higher`);
      }
      
      // Build the full error message
      let fullErrorMsg = errorMsg;
      suggestions.forEach((suggestion, index) => {
        fullErrorMsg += `\n• ${suggestion}`;
      });
      
      setError(fullErrorMsg);
    } catch (err) {
      // Fallback to simpler message if suggestion generation fails
      setError('No routes available for this swap. Try different tokens, chains, or amounts.');
      logger.error('Error generating suggestions:', err);
    }
  };

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
      alert('Swap completed successfully!');
    } catch (error) {
      logger.error('Swap execution error:', error);
      setError('Failed to execute swap. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg shadow-lg w-full h-full text-white overflow-y-auto" style={{
      height: '100%',
      minHeight: '720px', // Increased from 580px for more content space
      maxHeight: '100%',
      overflow: 'auto !important',
      WebkitOverflowScrolling: 'touch', // For better iOS scrolling
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Wallet Modal */}
      <WalletModal />
      
      <h2 className="text-2xl font-bold mb-4 text-center text-blue-400 flex-shrink-0 flex items-center justify-center">
        <img 
          src="/AquaSwap.svg" 
          alt="" 
          className="h-6 w-6 mr-2 inline-block"
          style={{ verticalAlign: 'middle', marginTop: '-2px' }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/AquaSwap.png";
          }}
        />
        AquaSwap <span className="text-sm font-normal text-gray-400">(Powered by li.fi)</span>
      </h2>
      
      {/* Security Notice */}
      <div className="bg-blue-500/20 border border-blue-500 text-blue-300 p-2 rounded-lg mb-3 text-sm flex-shrink-0">
        <p>⚠️ <strong>Security:</strong> Always verify transaction details before confirming in your wallet.</p>
      </div>
      
      {/* API Key Status */}
      {apiKeyStatus === 'missing' && (
        <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-300 p-2 rounded-lg mb-3 text-sm flex-shrink-0">
          ⚠️ API key not configured. Some features may not work correctly.
        </div>
      )}
      
      {/* Error message with max height and scrolling if needed */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 p-2 rounded-lg mb-3 text-sm max-h-[100px] overflow-y-auto whitespace-pre-line flex-shrink-0">
          {error}
        </div>
      )}
      
      <div className="space-y-4 flex-1 overflow-auto">
        {/* Wallet Connection - more compact */}
        <div className="flex justify-center mb-3 flex-shrink-0">
          {renderWalletOptions()}
        </div>
        
        {/* The rest of your UI components with reduced spacing */}
        {/* Network Selection */}
        <div className="grid grid-cols-2 gap-3 flex-shrink-0">
          {/* Same content with reduced padding */}
          <div>
            <label className="block text-gray-400 mb-1 text-sm">From Chain</label>
            <select 
              value={fromChain}
              onChange={handleFromChainChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm"
            >
              <option value="">Select Chain</option>
              {chains.map(chain => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 mb-1 text-sm">To Chain</label>
            <select 
              value={toChain}
              onChange={handleToChainChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm"
            >
              <option value="">Select Chain</option>
              {chains.map(chain => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Token Selection */}
        <div className="grid grid-cols-2 gap-3 flex-shrink-0">
          <div>
            <label className="block text-gray-400 mb-1 text-sm">From Token</label>
            <select 
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm"
              disabled={!fromChain || fromChainTokens.length === 0}
            >
              {!fromChain && <option value="">Select chain first</option>}
              {fromChain && fromChainTokens.length === 0 && <option value="">Loading tokens...</option>}
              {fromChainTokens.map(token => (
                <option key={token.address} value={token.address} className="flex items-center">
                  {token.symbol}
                </option>
              ))}
            </select>
            {/* Custom token display with icons */}
            {fromToken && fromChainTokens.length > 0 && (
              <div className="mt-1 flex items-center">
                <img 
                  src={fromChainTokens.find(t => t.address === fromToken)?.logoURI || '/placeholder-token.png'} 
                  alt=""
                  className="w-4 h-4 mr-1 rounded-full"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder-token.png';
                  }}
                />
                <span className="text-xs">{fromChainTokens.find(t => t.address === fromToken)?.symbol}</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-gray-400 mb-1 text-sm">To Token</label>
            <select 
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm"
              disabled={!toChain || toChainTokens.length === 0}
            >
              {!toChain && <option value="">Select chain first</option>}
              {toChain && toChainTokens.length === 0 && <option value="">Loading tokens...</option>}
              {toChainTokens.map(token => (
                <option key={token.address} value={token.address}>
                  {token.symbol}
                </option>
              ))}
            </select>
            {/* Custom token display with icons */}
            {toToken && toChainTokens.length > 0 && (
              <div className="mt-1 flex items-center">
                <img 
                  src={toChainTokens.find(t => t.address === toToken)?.logoURI || '/placeholder-token.png'} 
                  alt=""
                  className="w-4 h-4 mr-1 rounded-full"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder-token.png';
                  }}
                />
                <span className="text-xs">{toChainTokens.find(t => t.address === toToken)?.symbol}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Amount Inputs */}
        <div className="grid grid-cols-2 gap-3 flex-shrink-0">
          <div>
            <label className="block text-gray-400 mb-1 text-sm">You Pay</label>
            <div className="relative">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.0"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm"
              />
              <div className="absolute right-2 top-2 text-gray-400 text-xs">
                + 0.5% fee
              </div>
            </div>
          </div>
          <div>
            <label className="block text-gray-400 mb-1 text-sm">You Receive</label>
            <input
              type="text"
              value={toAmount}
              readOnly
              placeholder="0.0"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm"
            />
          </div>
        </div>
        
        {/* Slippage Setting with Quick Values */}
        <div className="flex-shrink-0">
          <label className="block text-gray-400 mb-1 text-sm">Slippage Tolerance (%)</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              min="0.1"
              max="5"
              step="0.1"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm"
            />
            <div className="flex gap-1">
              <button 
                onClick={() => setSlippage(0.5)}
                className={`px-2 py-1 rounded text-xs ${slippage === 0.5 ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                0.5%
              </button>
              <button 
                onClick={() => setSlippage(1.0)}
                className={`px-2 py-1 rounded text-xs ${slippage === 1.0 ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                1%
              </button>
              <button 
                onClick={() => setSlippage(2.0)}
                className={`px-2 py-1 rounded text-xs ${slippage === 2.0 ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                2%
              </button>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 flex-shrink-0">
          <button
            onClick={getQuote}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 text-sm"
          >
            {loading ? 'Loading...' : 'Get Quote'}
          </button>
          <button
            onClick={executeSwap}
            disabled={loading || !selectedRoute || !walletConnected}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 text-sm"
          >
            {loading ? 'Processing...' : 'Execute Swap'}
          </button>
        </div>
        
        {/* Route Information */}
        {selectedRoute && (
          <div className="bg-gray-800 p-3 rounded-lg flex-shrink-0">
            <h3 className="text-sm font-semibold mb-1">Selected Route</h3>
            <div className="text-xs text-gray-300 space-y-1">
              <div>Provider: {selectedRoute.steps[0].tool}</div>
              <div>Estimated Gas: {parseFloat(selectedRoute.gasUSD).toFixed(2)} USD</div>
              <div>Execution Time: ~{selectedRoute.steps[0].estimate.executionDuration}s</div>
              <div className="text-yellow-400">Fee: {FEE_PERCENTAGE}% ({selectedRoute.feeDisplayAmount?.toFixed(6) || parseFloat(fromAmount) * (FEE_PERCENTAGE / 100)} tokens)</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Swap; 