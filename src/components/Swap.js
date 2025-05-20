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
  const [chains, setChains] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [fromChain, setFromChain] = useState('');
  const [toChain, setToChain] = useState('');
  
  const LIFI_API_KEY = process.env.REACT_APP_LIFI_API_KEY;
  const FEE_PERCENTAGE = 0.5; // 0.5% fee
  const FEE_RECIPIENT = process.env.REACT_APP_FEE_WALLET || '0x98BC1BEC892d9f74B606D478E6b45089D2faAB05'; // Default to a wallet if not set

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
          setFromChain(response.data.chains[0].id);
          setToChain(response.data.chains[0].id);
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

  // Fetch tokens when chains change
  useEffect(() => {
    if (fromChain) {
      fetchTokens(fromChain);
    }
  }, [fromChain, LIFI_API_KEY]);

  const fetchTokens = async (chainId) => {
    try {
      const response = await axios.get(`https://li.quest/v1/tokens?chains=${chainId}`, {
        headers: {
          'x-lifi-api-key': LIFI_API_KEY
        }
      });
      setTokens(response.data.tokens[chainId] || []);
      if (response.data.tokens[chainId]?.length > 0) {
        // Set default tokens
        setFromToken(response.data.tokens[chainId][0].address);
        setToToken(response.data.tokens[chainId][1]?.address || response.data.tokens[chainId][0].address);
      }
    } catch (error) {
      logger.error('Error fetching tokens:', error);
      setError('Failed to load tokens. Please try again later.');
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
        setWalletConnected(true);
      } catch (error) {
        logger.error('Wallet connection error:', error);
        setError('Failed to connect wallet. Please try again.');
      }
    } else {
      setError('MetaMask is not installed. Please install it to use this feature.');
    }
  };

  const getQuote = async () => {
    if (!fromToken || !toToken || !fromAmount || fromAmount <= 0) {
      setError('Please fill in all fields correctly');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Find the selected token to get its decimals
      const selectedFromToken = tokens.find(token => token.address === fromToken);
      const decimals = selectedFromToken?.decimals || 18;
      
      // Calculate fee amount (0.5% of fromAmount)
      const feeAmount = parseFloat(fromAmount) * (FEE_PERCENTAGE / 100);
      
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
      
      logger.info('Request params:', {
        fromChain,
        toChain,
        fromToken,
        toToken,
        fromAmount: fromAmountInWei,
        slippage: slippage.toString(),
        fee: ethers.parseUnits((feeAmount).toFixed(decimals > 6 ? 6 : decimals), decimals).toString(),
        integrator: 'AquaSwap',
        referrer: FEE_RECIPIENT
      });
      
      // Request quote from li.fi
      const response = await axios.get('https://li.quest/v1/quote', {
        headers: {
          'x-lifi-api-key': LIFI_API_KEY
        },
        params: {
          fromChain,
          toChain,
          fromToken,
          toToken,
          fromAmount: fromAmountInWei,
          slippage: slippage.toString(),
          fee: ethers.parseUnits((feeAmount).toFixed(decimals > 6 ? 6 : decimals), decimals).toString(),
          integrator: 'AquaSwap',
          referrer: FEE_RECIPIENT
        }
      });

      // Check if routes exist
      if (!response.data.routes || response.data.routes.length === 0) {
        setError('No routes found for this swap. Try different tokens or amounts.');
        setLoading(false);
        return;
      }

      setRoutes(response.data.routes || []);
      if (response.data.routes?.length > 0) {
        setSelectedRoute(response.data.routes[0]);
        // Get the token decimals for output token
        const selectedToToken = tokens.find(token => token.address === toToken);
        const toDecimals = selectedToToken?.decimals || 18;
        // Update the toAmount with the expected output
        setToAmount(ethers.formatUnits(response.data.routes[0].toAmount, toDecimals));
      } else {
        setError('No routes found for this swap');
      }
    } catch (error) {
      logger.error('Quote error:', error.response?.data || error.message || error);
      if (error.response?.data?.message) {
        setError(`API Error: ${error.response.data.message}`);
      } else {
        setError('Failed to get quote. Please try different tokens or amount.');
      }
    } finally {
      setLoading(false);
    }
  };

  const executeSwap = async () => {
    if (!selectedRoute || !walletConnected) {
      setError('Please connect your wallet and select a route first');
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
    <div className="bg-gray-900 p-6 rounded-lg shadow-lg w-full h-full text-white" style={{minHeight: '580px'}}>
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-400">
        <span className="mr-2">💧</span>
        AquaSwap <span className="text-sm font-normal text-gray-400">(Powered by li.fi)</span>
      </h2>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      <div className="space-y-6">
        {/* Wallet Connection */}
        <div className="flex justify-center">
          {!walletConnected ? (
            <button 
              onClick={connectWallet}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="text-center">
              <div className="bg-gray-800 rounded-lg px-4 py-2 inline-block">
                <span className="text-gray-400 mr-2">Connected:</span>
                <span className="text-blue-300">{`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Network Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 mb-2">From Chain</label>
            <select 
              value={fromChain}
              onChange={(e) => setFromChain(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
            >
              {chains.map(chain => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 mb-2">To Chain</label>
            <select 
              value={toChain}
              onChange={(e) => setToChain(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
            >
              {chains.map(chain => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Token Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 mb-2">From Token</label>
            <select 
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
            >
              {tokens.map(token => (
                <option key={token.address} value={token.address}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 mb-2">To Token</label>
            <select 
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
            >
              {tokens.map(token => (
                <option key={token.address} value={token.address}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Amount Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 mb-2">You Pay</label>
            <div className="relative">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.0"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
              />
              <div className="absolute right-3 top-3 text-gray-400">
                + 0.5% fee
              </div>
            </div>
          </div>
          <div>
            <label className="block text-gray-400 mb-2">You Receive</label>
            <input
              type="text"
              value={toAmount}
              readOnly
              placeholder="0.0"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
            />
          </div>
        </div>
        
        {/* Slippage Setting */}
        <div>
          <label className="block text-gray-400 mb-2">Slippage Tolerance (%)</label>
          <input
            type="number"
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            min="0.1"
            max="5"
            step="0.1"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
          />
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={getQuote}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Get Quote'}
          </button>
          <button
            onClick={executeSwap}
            disabled={loading || !selectedRoute || !walletConnected}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Execute Swap'}
          </button>
        </div>
        
        {/* Route Information */}
        {selectedRoute && (
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Selected Route</h3>
            <div className="text-sm text-gray-300 space-y-2">
              <div>Provider: {selectedRoute.steps[0].tool}</div>
              <div>Estimated Gas: {parseFloat(selectedRoute.gasUSD).toFixed(2)} USD</div>
              <div>Execution Time: ~{selectedRoute.steps[0].estimate.executionDuration}s</div>
              <div className="text-yellow-400">Fee: 0.5% ({parseFloat(fromAmount) * 0.005} tokens)</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Swap; 