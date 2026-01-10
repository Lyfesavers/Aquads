import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ethers } from 'ethers';

const API_URL = process.env.REACT_APP_API_URL || 'https://aquads.onrender.com';

// Wallet options for EVM chains
const EVM_WALLET_OPTIONS = [
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '🔗',
    description: 'MetaMask, Trust, Rainbow & 300+ wallets',
    recommended: true
  },
  {
    id: 'injected',
    name: 'Browser Wallet',
    icon: '🦊',
    description: 'MetaMask, Rabby, Coinbase extension'
  }
];

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
    gradient: 'from-purple-500 via-violet-600 to-purple-800',
    explorerUrl: 'https://solscan.io/tx/',
    walletField: 'solana',
    isEVM: false
  },
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'Ξ',
    color: '#627EEA',
    gradient: 'from-blue-500 via-indigo-600 to-blue-800',
    explorerUrl: 'https://etherscan.io/tx/',
    walletField: 'ethereum',
    isEVM: true
  },
  base: {
    name: 'Base',
    symbol: 'ETH',
    icon: '🔵',
    color: '#0052FF',
    gradient: 'from-blue-400 via-blue-600 to-indigo-700',
    explorerUrl: 'https://basescan.org/tx/',
    walletField: 'ethereum',
    isEVM: true
  },
  polygon: {
    name: 'Polygon',
    symbol: 'MATIC',
    icon: '⬡',
    color: '#8247E5',
    gradient: 'from-purple-400 via-violet-600 to-purple-800',
    explorerUrl: 'https://polygonscan.com/tx/',
    walletField: 'ethereum',
    isEVM: true
  },
  arbitrum: {
    name: 'Arbitrum',
    symbol: 'ETH',
    icon: '🔷',
    color: '#28A0F0',
    gradient: 'from-cyan-500 via-blue-600 to-blue-800',
    explorerUrl: 'https://arbiscan.io/tx/',
    walletField: 'ethereum',
    isEVM: true
  },
  bnb: {
    name: 'BNB Chain',
    symbol: 'BNB',
    icon: '🟡',
    color: '#F0B90B',
    gradient: 'from-yellow-400 via-amber-500 to-orange-600',
    explorerUrl: 'https://bscscan.com/tx/',
    walletField: 'ethereum',
    isEVM: true
  },
  bitcoin: {
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: '₿',
    color: '#F7931A',
    gradient: 'from-orange-400 via-amber-500 to-orange-700',
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
    gradient: 'from-red-400 via-rose-500 to-red-700',
    explorerUrl: 'https://tronscan.org/#/transaction/',
    walletField: 'tron',
    isEVM: false,
    isManual: true
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
  const [txStatus, setTxStatus] = useState(null);
  const [txError, setTxError] = useState(null);
  
  // UI state
  const [copied, setCopied] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [wcProvider, setWcProvider] = useState(null);

  // Fetch payment page data
  useEffect(() => {
    const fetchPaymentPage = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/aquapay/page/${slug}`);
        if (response.data.success) {
          setPaymentPage(response.data.paymentPage);
          if (response.data.paymentPage.preferredChain) {
            setSelectedChain(response.data.paymentPage.preferredChain);
          } else {
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
      if (wcProvider) {
        wcProvider.disconnect().catch(() => {});
        setWcProvider(null);
      }
      setWalletConnected(false);
      setWalletAddress(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChain]);

  // Get wallet address for selected chain
  const getRecipientAddress = useCallback(() => {
    if (!paymentPage || !selectedChain) return null;
    const chainConfig = CHAINS[selectedChain];
    if (!chainConfig) return null;
    return paymentPage.wallets[chainConfig.walletField];
  }, [paymentPage, selectedChain]);

  const isManualChain = selectedChain && CHAINS[selectedChain]?.isManual;

  // Show wallet selection modal for EVM
  const connectEVMWallet = () => {
    setShowWalletModal(true);
  };

  // Connect with specific wallet type
  const connectWithWallet = async (walletId) => {
    setShowWalletModal(false);
    setConnecting(true);
    setTxError(null);

    try {
      let accounts = [];
      const chainConfig = EVM_CHAINS[selectedChain];
      const chainIdNum = parseInt(chainConfig.chainId, 16);

      if (walletId === 'walletconnect') {
        try {
          const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
          
          const provider = await EthereumProvider.init({
            projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'demo',
            chains: [chainIdNum],
            showQrModal: true,
            methods: ['eth_sendTransaction', 'personal_sign'],
            events: ['chainChanged', 'accountsChanged'],
            metadata: {
              name: 'AquaPay',
              description: 'Send crypto payments via AquaPay',
              url: window.location.origin,
              icons: [`${window.location.origin}/logo192.png`]
            },
            qrModalOptions: {
              themeMode: 'dark'
            }
          });

          await provider.connect();
          accounts = provider.accounts;
          setWcProvider(provider);

          provider.on('disconnect', () => {
            setWalletConnected(false);
            setWalletAddress(null);
            setWcProvider(null);
          });

        } catch (wcError) {
          console.error('WalletConnect error:', wcError);
          throw new Error('Failed to connect via WalletConnect');
        }
      } else {
        if (!window.ethereum) {
          throw new Error('No Web3 wallet detected. Please install MetaMask.');
        }

        accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });

        if (accounts.length === 0) {
          throw new Error('No accounts found');
        }

        if (chainConfig) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: chainConfig.chainId }]
            });
          } catch (switchError) {
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
      }

      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setWalletConnected(true);
      }
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
      setTxError('Please install Phantom wallet for Solana');
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
      const ethProvider = wcProvider || window.ethereum;
      const provider = new ethers.BrowserProvider(ethProvider);
      const signer = await provider.getSigner();
      const amountWei = ethers.parseEther(amount);

      const tx = await signer.sendTransaction({
        to: recipientAddress,
        value: amountWei
      });

      setTxHash(tx.hash);
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        setTxStatus('success');
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
      const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      
      const fromPubkey = new PublicKey(walletAddress);
      const toPubkey = new PublicKey(recipientAddress);
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const signed = await solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      
      setTxHash(signature);
      await connection.confirmTransaction(signature);
      
      setTxStatus('success');
      await recordPayment(signature);
    } catch (err) {
      console.error('Error sending Solana payment:', err);
      setTxStatus('error');
      setTxError(err.message || 'Transaction failed');
    } finally {
      setSending(false);
    }
  };

  const sendPayment = async () => {
    if (!selectedChain) return;
    const chainConfig = CHAINS[selectedChain];
    
    if (chainConfig.isEVM) {
      await sendEVMPayment();
    } else if (selectedChain === 'solana') {
      await sendSolanaPayment();
    }
  };

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

  const copyAddress = () => {
    const address = getRecipientAddress();
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  const resetPayment = () => {
    setTxHash(null);
    setTxStatus(null);
    setTxError(null);
    setAmount('');
    setMessage('');
    setWalletConnected(false);
    setWalletAddress(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin"></div>
            <div className="absolute inset-3 border-4 border-transparent border-t-purple-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="text-gray-300 font-medium">Loading payment page...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="text-center bg-gradient-to-b from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-3xl p-10 max-w-md border border-gray-700/50">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
            <span className="text-4xl">🔍</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Page Not Found</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/25"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (txStatus === 'success') {
    const chainConfig = CHAINS[selectedChain];
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        {/* Success background effect */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative text-center bg-gradient-to-b from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl p-10 max-w-md w-full border border-green-500/30">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/40">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">Payment Sent!</h1>
          <p className="text-gray-300 mb-6">
            You sent <span className="text-green-400 font-bold">{amount} {chainConfig?.symbol}</span> to {paymentPage?.displayName}
          </p>
          
          {txHash && (
            <a
              href={`${chainConfig?.explorerUrl}${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-gray-700/50 hover:bg-gray-700 text-cyan-400 rounded-xl text-sm mb-8 transition-all border border-gray-600"
            >
              <span>View on {chainConfig?.name}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          
          <button
            onClick={resetPayment}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg"
          >
            Send Another Payment
          </button>
        </div>
      </div>
    );
  }

  const availableChains = getAvailableChains();
  const recipientAddress = getRecipientAddress();
  const chainConfig = selectedChain ? CHAINS[selectedChain] : null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-8 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-600/5 to-cyan-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-lg mx-auto relative z-10">
        {/* Header Card */}
        <div className="bg-gradient-to-b from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl p-8 mb-6 text-center border border-gray-700/50 shadow-2xl">
          {/* Profile Image with glow */}
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur-md opacity-50"></div>
            <img
              src={paymentPage?.image || 'https://i.imgur.com/6VBx3io.png'}
              alt={paymentPage?.displayName}
              className="relative w-28 h-28 rounded-full border-4 border-gray-700 object-cover"
            />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-gray-800 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            {paymentPage?.displayName}
          </h1>
          <p className="text-cyan-400 font-medium mb-4">@{paymentPage?.username}</p>
          
          {paymentPage?.bio && (
            <p className="text-gray-300 text-sm leading-relaxed max-w-sm mx-auto">{paymentPage.bio}</p>
          )}
          
          {/* Stats */}
          {paymentPage?.stats?.totalTransactions > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700/50">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700/30 rounded-full">
                <span className="text-green-400">✓</span>
                <span className="text-gray-300 text-sm">{paymentPage.stats.totalTransactions} payments received</span>
              </div>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <button
          onClick={() => setShowInfoModal(true)}
          className="w-full mb-6 p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-2xl flex items-center gap-4 hover:from-cyan-500/20 hover:to-purple-500/20 transition-all group"
        >
          <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
            <span className="text-xl">ℹ️</span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-white font-medium">New to crypto payments?</p>
            <p className="text-gray-400 text-sm">Tap here to learn how it works</p>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Chain Selection */}
        <div className="bg-gradient-to-b from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl p-6 mb-6 border border-gray-700/50">
          <h2 className="text-lg font-bold text-white mb-2">Select Network</h2>
          <p className="text-gray-400 text-sm mb-4">Choose which blockchain to send payment on</p>
          
          <div className="grid grid-cols-2 gap-3">
            {availableChains.map(chain => (
              <button
                key={chain.id}
                onClick={() => setSelectedChain(chain.id)}
                className={`p-4 rounded-2xl border-2 transition-all relative overflow-hidden group ${
                  selectedChain === chain.id
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-gray-700 hover:border-gray-600 bg-gray-800/30'
                }`}
              >
                {selectedChain === chain.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <span className="text-3xl block mb-2">{chain.icon}</span>
                <span className="text-white font-semibold block">{chain.name}</span>
                <span className="text-gray-400 text-sm">{chain.symbol}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Section */}
        {selectedChain && recipientAddress && (
          <div className="bg-gradient-to-b from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl p-6 border border-gray-700/50">
            
            {/* Manual Payment (Bitcoin, TRON) */}
            {isManualChain ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${chainConfig?.gradient} flex items-center justify-center`}>
                    <span className="text-2xl">{chainConfig?.icon}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Send {chainConfig?.symbol}</h2>
                    <p className="text-gray-400 text-sm">Manual transfer required</p>
                  </div>
                </div>
                
                {/* Warning for manual */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <p className="text-amber-200 font-medium text-sm">Manual Transfer</p>
                      <p className="text-amber-200/70 text-xs mt-1">Copy the address below and send from your {chainConfig?.name} wallet. Double-check the address before sending!</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-900/70 rounded-xl p-4 mb-4 border border-gray-700">
                  <p className="text-gray-400 text-xs mb-2 font-medium">RECIPIENT ADDRESS</p>
                  <p className="text-white font-mono text-sm break-all mb-4 leading-relaxed">
                    {recipientAddress}
                  </p>
                  <button
                    onClick={copyAddress}
                    className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Address
                      </>
                    )}
                  </button>
                </div>

                {/* QR Code */}
                <div className="bg-white rounded-xl p-6 flex flex-col items-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(recipientAddress)}&bgcolor=ffffff&color=000000`}
                    alt="QR Code"
                    className="w-48 h-48 mb-3"
                  />
                  <p className="text-gray-600 text-sm font-medium">Scan with your wallet</p>
                </div>
              </div>
            ) : (
              /* Wallet Connect Payment (EVM & Solana) */
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${chainConfig?.gradient} flex items-center justify-center`}>
                    <span className="text-2xl">{chainConfig?.icon}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {walletConnected ? 'Send Payment' : 'Connect Wallet'}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      {walletConnected ? `Connected to ${chainConfig?.name}` : `Pay with ${chainConfig?.symbol}`}
                    </p>
                  </div>
                </div>

                {!walletConnected ? (
                  <div>
                    {/* Security tip */}
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">🔒</span>
                        <div>
                          <p className="text-emerald-200 font-medium text-sm">Direct & Secure</p>
                          <p className="text-emerald-200/70 text-xs mt-1">Funds go directly to the recipient. We never hold your crypto.</p>
                        </div>
                      </div>
                    </div>
                    
                    {txError && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                        <p className="text-red-300 text-sm">{txError}</p>
                      </div>
                    )}

                    <button
                      onClick={connectWallet}
                      disabled={connecting}
                      className={`w-full py-4 bg-gradient-to-r ${chainConfig?.gradient} text-white font-bold rounded-xl transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg`}
                    >
                      {connecting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Connecting...
                        </>
                      ) : (
                        <>
                          <span className="text-2xl">{chainConfig?.icon}</span>
                          Connect {selectedChain === 'solana' ? 'Phantom' : 'Wallet'}
                        </>
                      )}
                    </button>

                    {selectedChain !== 'solana' && (
                      <p className="text-gray-500 text-xs text-center mt-4">
                        Supports MetaMask, Coinbase Wallet, WalletConnect & more
                      </p>
                    )}
                  </div>
                ) : (
                  /* Payment Form */
                  <div>
                    {/* Connected Wallet */}
                    <div className="bg-gray-900/70 rounded-xl p-4 mb-4 flex items-center justify-between border border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <div>
                          <p className="text-gray-400 text-xs">Connected Wallet</p>
                          <p className="text-white font-mono text-sm">
                            {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (wcProvider) wcProvider.disconnect().catch(() => {});
                          setWalletConnected(false);
                          setWalletAddress(null);
                          setWcProvider(null);
                        }}
                        className="text-gray-400 hover:text-red-400 text-sm font-medium transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>

                    {/* Amount Input */}
                    <div className="mb-4">
                      <label className="block text-gray-300 text-sm font-medium mb-2">Amount to Send</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          step="0.0001"
                          min="0"
                          className="w-full px-4 py-4 pr-20 bg-gray-900/70 border-2 border-gray-700 focus:border-cyan-500 rounded-xl text-white text-2xl font-bold focus:outline-none transition-colors"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                          {chainConfig?.symbol}
                        </span>
                      </div>
                    </div>

                    {/* Quick Amounts */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[0.01, 0.05, 0.1, 0.5].map(val => (
                        <button
                          key={val}
                          onClick={() => setAmount(val.toString())}
                          className="py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors border border-gray-700"
                        >
                          {val}
                        </button>
                      ))}
                    </div>

                    {/* Message */}
                    <div className="mb-6">
                      <label className="block text-gray-300 text-sm font-medium mb-2">Message (optional)</label>
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Add a note to your payment..."
                        maxLength={200}
                        className="w-full px-4 py-3 bg-gray-900/70 border border-gray-700 focus:border-cyan-500 rounded-xl text-white focus:outline-none transition-colors"
                      />
                    </div>

                    {txError && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                        <p className="text-red-300 text-sm">{txError}</p>
                      </div>
                    )}

                    {/* Recipient */}
                    <div className="bg-gray-900/50 rounded-xl p-4 mb-4 border border-gray-700/50">
                      <p className="text-gray-500 text-xs font-medium mb-1">SENDING TO</p>
                      <p className="text-white font-mono text-sm break-all">
                        {recipientAddress}
                      </p>
                    </div>

                    {/* Send Button */}
                    <button
                      onClick={sendPayment}
                      disabled={sending || !amount || parseFloat(amount) <= 0}
                      className={`w-full py-4 bg-gradient-to-r ${chainConfig?.gradient} text-white font-bold rounded-xl transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg`}
                    >
                      {sending ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          {txStatus === 'pending' ? 'Confirming...' : 'Sending...'}
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
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
            <a href="https://aquads.xyz" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              AquaPay
            </a>
          </p>
          <p className="text-gray-600 text-xs mt-2">Secure, non-custodial crypto payments</p>
        </div>
      </div>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl p-6 max-w-sm w-full border border-gray-700 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Connect Wallet</h3>
              <button
                onClick={() => setShowWalletModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-400 text-sm mb-5">
              Choose how to connect your {chainConfig?.name} wallet
            </p>
            
            <div className="space-y-3">
              {EVM_WALLET_OPTIONS.map(option => (
                <button
                  key={option.id}
                  onClick={() => connectWithWallet(option.id)}
                  className="w-full p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all flex items-center gap-4 border border-gray-700 hover:border-gray-600 group relative"
                >
                  {option.recommended && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-cyan-500 text-white text-xs font-bold rounded-full">
                      Popular
                    </span>
                  )}
                  <span className="text-3xl">{option.icon}</span>
                  <div className="text-left">
                    <p className="text-white font-semibold">{option.name}</p>
                    <p className="text-gray-400 text-sm">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
            
            <p className="text-gray-600 text-xs mt-5 text-center">
              🔒 Your wallet, your keys. We never have access to your funds.
            </p>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl p-6 max-w-md w-full border border-gray-700 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">How AquaPay Works</h3>
              <button
                onClick={() => setShowInfoModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Steps */}
            <div className="space-y-4 mb-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-400 font-bold">1</span>
                </div>
                <div>
                  <p className="text-white font-medium">Select Network</p>
                  <p className="text-gray-400 text-sm">Choose which blockchain you want to send payment on (Ethereum, Solana, etc.)</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-400 font-bold">2</span>
                </div>
                <div>
                  <p className="text-white font-medium">Connect Wallet</p>
                  <p className="text-gray-400 text-sm">Connect your crypto wallet (MetaMask, Phantom, etc.) to send the payment</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-400 font-bold">3</span>
                </div>
                <div>
                  <p className="text-white font-medium">Enter Amount & Send</p>
                  <p className="text-gray-400 text-sm">Enter how much you want to send and confirm the transaction in your wallet</p>
                </div>
              </div>
            </div>
            
            {/* Do's */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
              <p className="text-emerald-300 font-semibold mb-2 flex items-center gap-2">
                <span>✅</span> Do's
              </p>
              <ul className="text-emerald-200/80 text-sm space-y-1.5">
                <li>• Double-check the recipient's username</li>
                <li>• Verify you have enough balance + gas fees</li>
                <li>• Use the same network the recipient accepts</li>
                <li>• Keep your transaction hash for records</li>
              </ul>
            </div>
            
            {/* Don'ts */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-red-300 font-semibold mb-2 flex items-center gap-2">
                <span>❌</span> Don'ts
              </p>
              <ul className="text-red-200/80 text-sm space-y-1.5">
                <li>• Never share your wallet seed phrase</li>
                <li>• Don't send to wrong network (funds may be lost)</li>
                <li>• Don't approve suspicious transactions</li>
                <li>• Avoid sending all your funds (keep gas money)</li>
              </ul>
            </div>
            
            {/* Security Note */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <p className="text-white font-medium mb-1 flex items-center gap-2">
                <span>🔒</span> Non-Custodial & Secure
              </p>
              <p className="text-gray-400 text-sm">
                AquaPay never holds your funds. Payments go directly from your wallet to the recipient's wallet on the blockchain.
              </p>
            </div>
            
            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full mt-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AquaPayPage;
