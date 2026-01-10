import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ethers } from 'ethers';

const API_URL = process.env.REACT_APP_API_URL || 'https://aquads.onrender.com';

// EVM Chain configurations
const EVM_CHAINS = {
  ethereum: {
    chainId: '0x1',
    chainName: 'Ethereum Mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://ethereum.publicnode.com'],
    blockExplorerUrls: ['https://etherscan.io']
  },
  base: {
    chainId: '0x2105',
    chainName: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org']
  },
  polygon: {
    chainId: '0x89',
    chainName: 'Polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com']
  },
  arbitrum: {
    chainId: '0xa4b1',
    chainName: 'Arbitrum One',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io']
  },
  bnb: {
    chainId: '0x38',
    chainName: 'BNB Smart Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://bsc-dataseed.binance.org'],
    blockExplorerUrls: ['https://bscscan.com']
  }
};

// Chain configurations with full details
const CHAINS = {
  solana: {
    name: 'Solana',
    symbol: 'SOL',
    icon: '◎',
    color: '#9945FF',
    bgColor: 'from-purple-600 to-purple-900',
    explorerUrl: 'https://solscan.io/tx/',
    walletField: 'solana',
    isEVM: false
  },
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'Ξ',
    color: '#627EEA',
    bgColor: 'from-blue-600 to-indigo-900',
    explorerUrl: 'https://etherscan.io/tx/',
    walletField: 'ethereum',
    isEVM: true
  },
  base: {
    name: 'Base',
    symbol: 'ETH',
    icon: '🔵',
    color: '#0052FF',
    bgColor: 'from-blue-500 to-blue-800',
    explorerUrl: 'https://basescan.org/tx/',
    walletField: 'ethereum',
    isEVM: true
  },
  polygon: {
    name: 'Polygon',
    symbol: 'MATIC',
    icon: '⬡',
    color: '#8247E5',
    bgColor: 'from-purple-500 to-purple-800',
    explorerUrl: 'https://polygonscan.com/tx/',
    walletField: 'ethereum',
    isEVM: true
  },
  arbitrum: {
    name: 'Arbitrum',
    symbol: 'ETH',
    icon: '🔷',
    color: '#28A0F0',
    bgColor: 'from-cyan-600 to-blue-900',
    explorerUrl: 'https://arbiscan.io/tx/',
    walletField: 'ethereum',
    isEVM: true
  },
  bnb: {
    name: 'BNB Chain',
    symbol: 'BNB',
    icon: '🟡',
    color: '#F0B90B',
    bgColor: 'from-yellow-500 to-yellow-700',
    explorerUrl: 'https://bscscan.com/tx/',
    walletField: 'ethereum',
    isEVM: true
  },
  bitcoin: {
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: '₿',
    color: '#F7931A',
    bgColor: 'from-orange-500 to-orange-800',
    explorerUrl: 'https://mempool.space/tx/',
    walletField: 'bitcoin',
    isEVM: false,
    isManual: true
  },
  tron: {
    name: 'TRON',
    symbol: 'TRX',
    icon: '🔺',
    color: '#FF0013',
    bgColor: 'from-red-500 to-red-800',
    explorerUrl: 'https://tronscan.org/#/transaction/',
    walletField: 'tron',
    isEVM: false,
    isManual: true
  }
};

// Theme configurations
const THEMES = {
  default: {
    bg: 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900',
    card: 'bg-gray-800/80 backdrop-blur-xl',
    accent: 'blue'
  },
  dark: {
    bg: 'bg-black',
    card: 'bg-gray-900/90 backdrop-blur-xl',
    accent: 'purple'
  },
  gradient: {
    bg: 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
    card: 'bg-white/10 backdrop-blur-xl',
    accent: 'cyan'
  },
  neon: {
    bg: 'bg-gray-950',
    card: 'bg-gray-900/80 backdrop-blur-xl border border-green-500/30',
    accent: 'green'
  }
};

const AquaPayPage = ({ currentUser }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentPage, setPaymentPage] = useState(null);
  const [selectedChain, setSelectedChain] = useState(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  
  // Wallet connection state
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [txStatus, setTxStatus] = useState(null); // 'pending', 'success', 'error'
  const [txError, setTxError] = useState(null);
  
  // Manual payment state (for Bitcoin, TRON)
  const [showManualPayment, setShowManualPayment] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch payment page data
  useEffect(() => {
    const fetchPaymentPage = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/aquapay/page/${slug}`);
        if (response.data.success) {
          setPaymentPage(response.data.paymentPage);
          // Set default selected chain
          if (response.data.paymentPage.preferredChain) {
            setSelectedChain(response.data.paymentPage.preferredChain);
          } else {
            // Find first available chain
            const wallets = response.data.paymentPage.wallets;
            if (wallets.ethereum) setSelectedChain('ethereum');
            else if (wallets.solana) setSelectedChain('solana');
            else if (wallets.bitcoin) setSelectedChain('bitcoin');
            else if (wallets.tron) setSelectedChain('tron');
          }
        }
      } catch (err) {
        console.error('Error fetching payment page:', err);
        setError(err.response?.data?.error || 'Payment page not found');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPaymentPage();
    }
  }, [slug]);

  // Disconnect wallet when chain changes
  useEffect(() => {
    if (walletConnected) {
      setWalletConnected(false);
      setWalletAddress(null);
    }
  }, [selectedChain]);

  // Get wallet address for selected chain
  const getRecipientAddress = useCallback(() => {
    if (!paymentPage || !selectedChain) return null;
    const chainConfig = CHAINS[selectedChain];
    if (!chainConfig) return null;
    return paymentPage.wallets[chainConfig.walletField];
  }, [paymentPage, selectedChain]);

  // Check if chain requires manual payment
  const isManualChain = selectedChain && CHAINS[selectedChain]?.isManual;

  // Connect EVM wallet
  const connectEVMWallet = async () => {
    if (!window.ethereum) {
      setTxError('Please install MetaMask or another Web3 wallet');
      return;
    }

    setConnecting(true);
    setTxError(null);

    try {
      // Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Switch to correct chain
      const chainConfig = EVM_CHAINS[selectedChain];
      if (chainConfig) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainConfig.chainId }]
          });
        } catch (switchError) {
          // Chain not added, try to add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [chainConfig]
            });
          } else {
            throw switchError;
          }
        }
      }

      setWalletAddress(accounts[0]);
      setWalletConnected(true);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setTxError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  // Connect Solana wallet
  const connectSolanaWallet = async () => {
    const solana = window.solana || window.phantom?.solana;
    
    if (!solana) {
      setTxError('Please install Phantom or another Solana wallet');
      return;
    }

    setConnecting(true);
    setTxError(null);

    try {
      const response = await solana.connect();
      setWalletAddress(response.publicKey.toString());
      setWalletConnected(true);
    } catch (err) {
      console.error('Error connecting Solana wallet:', err);
      setTxError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  // Connect wallet based on chain
  const connectWallet = async () => {
    if (!selectedChain) return;

    const chainConfig = CHAINS[selectedChain];
    
    if (chainConfig.isEVM) {
      await connectEVMWallet();
    } else if (selectedChain === 'solana') {
      await connectSolanaWallet();
    } else {
      // Manual chains - show copy address UI
      setShowManualPayment(true);
    }
  };

  // Send EVM payment
  const sendEVMPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setTxError('Please enter a valid amount');
      return;
    }

    const recipientAddress = getRecipientAddress();
    if (!recipientAddress) {
      setTxError('Recipient address not found');
      return;
    }

    setSending(true);
    setTxError(null);
    setTxStatus('pending');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Convert amount to wei
      const amountWei = ethers.parseEther(amount);

      // Send transaction
      const tx = await signer.sendTransaction({
        to: recipientAddress,
        value: amountWei
      });

      setTxHash(tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        setTxStatus('success');
        // Record payment
        await recordPayment(tx.hash);
      } else {
        setTxStatus('error');
        setTxError('Transaction failed');
      }
    } catch (err) {
      console.error('Error sending payment:', err);
      setTxStatus('error');
      setTxError(err.message || 'Transaction failed');
    } finally {
      setSending(false);
    }
  };

  // Send Solana payment
  const sendSolanaPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setTxError('Please enter a valid amount');
      return;
    }

    const recipientAddress = getRecipientAddress();
    if (!recipientAddress) {
      setTxError('Recipient address not found');
      return;
    }

    const solana = window.solana || window.phantom?.solana;
    if (!solana) {
      setTxError('Solana wallet not found');
      return;
    }

    setSending(true);
    setTxError(null);
    setTxStatus('pending');

    try {
      // Dynamically import Solana web3
      const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
      
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      
      const fromPubkey = new PublicKey(walletAddress);
      const toPubkey = new PublicKey(recipientAddress);
      
      // Convert SOL to lamports
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      // Sign and send
      const signed = await solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      
      setTxHash(signature);

      // Wait for confirmation
      await connection.confirmTransaction(signature);
      
      setTxStatus('success');
      // Record payment
      await recordPayment(signature);
    } catch (err) {
      console.error('Error sending Solana payment:', err);
      setTxStatus('error');
      setTxError(err.message || 'Transaction failed');
    } finally {
      setSending(false);
    }
  };

  // Send payment based on chain
  const sendPayment = async () => {
    if (!selectedChain) return;

    const chainConfig = CHAINS[selectedChain];
    
    if (chainConfig.isEVM) {
      await sendEVMPayment();
    } else if (selectedChain === 'solana') {
      await sendSolanaPayment();
    }
  };

  // Record payment to backend
  const recordPayment = async (hash) => {
    try {
      await axios.post(`${API_URL}/api/aquapay/payment`, {
        recipientSlug: slug,
        txHash: hash,
        chain: selectedChain,
        token: CHAINS[selectedChain]?.symbol || 'UNKNOWN',
        amount: parseFloat(amount) || 0,
        senderAddress: walletAddress,
        senderUsername: currentUser?.username || null,
        message: message || null
      });
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  // Copy address (for manual payment)
  const copyAddress = () => {
    const address = getRecipientAddress();
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get available chains based on user's wallets
  const getAvailableChains = useCallback(() => {
    if (!paymentPage) return [];
    
    const available = [];
    const wallets = paymentPage.wallets;

    Object.entries(CHAINS).forEach(([chainId, config]) => {
      const walletAddress = wallets[config.walletField];
      if (walletAddress) {
        available.push({ id: chainId, ...config });
      }
    });

    return available;
  }, [paymentPage]);

  // Reset payment state
  const resetPayment = () => {
    setTxHash(null);
    setTxStatus(null);
    setTxError(null);
    setAmount('');
    setMessage('');
    setWalletConnected(false);
    setWalletAddress(null);
    setShowManualPayment(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading payment page...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center bg-gray-800 rounded-2xl p-8 max-w-md">
          <p className="text-6xl mb-4">😕</p>
          <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (txStatus === 'success') {
    const chainConfig = CHAINS[selectedChain];
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-gray-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center bg-gray-800/80 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Payment Sent!</h1>
          <p className="text-gray-400 mb-4">
            You sent {amount} {chainConfig?.symbol} to {paymentPage?.displayName}
          </p>
          {txHash && (
            <a
              href={`${chainConfig?.explorerUrl}${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 text-blue-400 rounded-lg text-sm mb-6 transition-colors"
            >
              View Transaction →
            </a>
          )}
          <button
            onClick={resetPayment}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Send Another Payment
          </button>
        </div>
      </div>
    );
  }

  const theme = THEMES[paymentPage?.theme] || THEMES.default;
  const availableChains = getAvailableChains();
  const recipientAddress = getRecipientAddress();
  const chainConfig = selectedChain ? CHAINS[selectedChain] : null;

  return (
    <div className={`min-h-screen ${theme.bg} py-8 px-4`}>
      <div className="max-w-lg mx-auto">
        {/* Header Card */}
        <div className={`${theme.card} rounded-2xl p-6 mb-6 text-center`}>
          <img
            src={paymentPage?.image || 'https://i.imgur.com/6VBx3io.png'}
            alt={paymentPage?.displayName}
            className="w-24 h-24 rounded-full mx-auto border-4 border-gray-700 object-cover mb-4"
          />
          <h1 className="text-2xl font-bold text-white mb-1">
            {paymentPage?.displayName}
          </h1>
          <p className="text-gray-400 text-sm mb-2">@{paymentPage?.username}</p>
          {paymentPage?.bio && (
            <p className="text-gray-300 mt-3 text-sm">{paymentPage.bio}</p>
          )}
        </div>

        {/* Chain Selection */}
        <div className={`${theme.card} rounded-2xl p-6 mb-6`}>
          <h2 className="text-lg font-semibold text-white mb-4">Select Network</h2>
          <div className="grid grid-cols-2 gap-3">
            {availableChains.map(chain => (
              <button
                key={chain.id}
                onClick={() => setSelectedChain(chain.id)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedChain === chain.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <span className="text-2xl block mb-1">{chain.icon}</span>
                <span className="text-white font-medium block">{chain.name}</span>
                <span className="text-gray-400 text-xs">{chain.symbol}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Section */}
        {selectedChain && recipientAddress && (
          <div className={`${theme.card} rounded-2xl p-6`}>
            
            {/* Manual Payment (Bitcoin, TRON) */}
            {isManualChain ? (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                  Send {chainConfig?.symbol}
                </h2>
                <p className="text-gray-400 text-sm mb-4">
                  Copy the address below and send from your {chainConfig?.name} wallet
                </p>
                
                <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                  <p className="text-white font-mono text-sm break-all mb-3">
                    {recipientAddress}
                  </p>
                  <button
                    onClick={copyAddress}
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {copied ? '✓ Copied!' : '📋 Copy Address'}
                  </button>
                </div>

                {/* QR Code */}
                <div className="bg-white rounded-lg p-4 flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(recipientAddress)}`}
                    alt="QR Code"
                    className="w-44 h-44"
                  />
                </div>
              </div>
            ) : (
              /* Wallet Connect Payment (EVM & Solana) */
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                  {walletConnected ? 'Send Payment' : 'Connect Wallet'}
                </h2>

                {!walletConnected ? (
                  /* Connect Wallet Button */
                  <div>
                    <p className="text-gray-400 text-sm mb-4">
                      Connect your {chainConfig?.name} wallet to send payment
                    </p>
                    
                    {txError && (
                      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                        <p className="text-red-400 text-sm">{txError}</p>
                      </div>
                    )}

                    <button
                      onClick={connectWallet}
                      disabled={connecting}
                      className={`w-full py-4 bg-gradient-to-r ${chainConfig?.bgColor} text-white font-bold rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                    >
                      {connecting ? (
                        <>
                          <span className="animate-spin">⟳</span>
                          Connecting...
                        </>
                      ) : (
                        <>
                          <span className="text-xl">{chainConfig?.icon}</span>
                          Connect {selectedChain === 'solana' ? 'Phantom' : 'Wallet'}
                        </>
                      )}
                    </button>

                    {selectedChain !== 'solana' && (
                      <p className="text-gray-500 text-xs text-center mt-3">
                        Works with MetaMask, Coinbase Wallet, and other Web3 wallets
                      </p>
                    )}
                  </div>
                ) : (
                  /* Payment Form */
                  <div>
                    {/* Connected Wallet Display */}
                    <div className="bg-gray-900/50 rounded-lg p-3 mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-gray-400 text-sm">
                          {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setWalletConnected(false);
                          setWalletAddress(null);
                        }}
                        className="text-gray-500 hover:text-gray-300 text-sm"
                      >
                        Disconnect
                      </button>
                    </div>

                    {/* Amount Input */}
                    <div className="mb-4">
                      <label className="block text-gray-400 text-sm mb-2">Amount</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          step="0.0001"
                          min="0"
                          className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700 rounded-xl text-white text-2xl font-bold focus:outline-none focus:border-blue-500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                          {chainConfig?.symbol}
                        </span>
                      </div>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[0.01, 0.05, 0.1, 0.5].map(val => (
                        <button
                          key={val}
                          onClick={() => setAmount(val.toString())}
                          className="py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                        >
                          {val}
                        </button>
                      ))}
                    </div>

                    {/* Message Input */}
                    <div className="mb-6">
                      <label className="block text-gray-400 text-sm mb-2">Message (optional)</label>
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Add a note..."
                        maxLength={200}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Error Display */}
                    {txError && (
                      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                        <p className="text-red-400 text-sm">{txError}</p>
                      </div>
                    )}

                    {/* Recipient Info */}
                    <div className="bg-gray-900/30 rounded-lg p-3 mb-4">
                      <p className="text-gray-500 text-xs mb-1">Sending to</p>
                      <p className="text-gray-300 font-mono text-sm break-all">
                        {recipientAddress}
                      </p>
                    </div>

                    {/* Send Button */}
                    <button
                      onClick={sendPayment}
                      disabled={sending || !amount || parseFloat(amount) <= 0}
                      className={`w-full py-4 bg-gradient-to-r ${chainConfig?.bgColor} text-white font-bold rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                    >
                      {sending ? (
                        <>
                          <span className="animate-spin">⟳</span>
                          {txStatus === 'pending' ? 'Confirming...' : 'Sending...'}
                        </>
                      ) : (
                        <>
                          Send {amount || '0'} {chainConfig?.symbol}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            Powered by{' '}
            <a href="https://aquads.xyz" className="text-blue-400 hover:text-blue-300">
              AquaPay
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AquaPayPage;
