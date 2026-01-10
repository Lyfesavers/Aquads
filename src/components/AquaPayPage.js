import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ethers } from 'ethers';

const API_URL = process.env.REACT_APP_API_URL || 'https://aquads.onrender.com';

// CoinGecko IDs for price fetching
const COINGECKO_IDS = {
  solana: 'solana',
  ethereum: 'ethereum',
  base: 'ethereum', // Base uses ETH
  polygon: 'matic-network',
  arbitrum: 'ethereum', // Arbitrum uses ETH
  bnb: 'binancecoin',
  bitcoin: 'bitcoin',
  tron: 'tron'
};

// Wallet options for EVM chains
const EVM_WALLET_OPTIONS = [
  { id: 'walletconnect', name: 'WalletConnect', icon: '🔗', description: 'MetaMask, Trust, Rainbow & 300+', recommended: true },
  { id: 'injected', name: 'Browser Wallet', icon: '🦊', description: 'MetaMask, Rabby, Coinbase' }
];

// Wallet options for Solana
const SOLANA_WALLET_OPTIONS = [
  { id: 'phantom', name: 'Phantom', icon: '👻', description: 'Most popular Solana wallet', recommended: true },
  { id: 'solflare', name: 'Solflare', icon: '🔥', description: 'Secure Solana wallet' },
  { id: 'backpack', name: 'Backpack', icon: '🎒', description: 'xNFT & multi-chain wallet' }
];

// EVM Chain configurations
const EVM_CHAINS = {
  ethereum: { chainId: '0x1', chainName: 'Ethereum Mainnet', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://ethereum.publicnode.com'], blockExplorerUrls: ['https://etherscan.io'] },
  base: { chainId: '0x2105', chainName: 'Base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://mainnet.base.org'], blockExplorerUrls: ['https://basescan.org'] },
  polygon: { chainId: '0x89', chainName: 'Polygon', nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }, rpcUrls: ['https://polygon-rpc.com'], blockExplorerUrls: ['https://polygonscan.com'] },
  arbitrum: { chainId: '0xa4b1', chainName: 'Arbitrum One', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://arb1.arbitrum.io/rpc'], blockExplorerUrls: ['https://arbiscan.io'] },
  bnb: { chainId: '0x38', chainName: 'BNB Smart Chain', nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: ['https://bsc-dataseed.binance.org'], blockExplorerUrls: ['https://bscscan.com'] }
};

// USDC Contract Addresses per chain
const USDC_ADDRESSES = {
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  bnb: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
};

// Solana USDC mint address
const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// ERC20 ABI for transfer
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// Chain configurations
const CHAINS = {
  solana: { name: 'Solana', symbol: 'SOL', icon: '◎', gradient: 'from-purple-500 via-violet-600 to-purple-800', explorerUrl: 'https://solscan.io/tx/', walletField: 'solana', isEVM: false },
  ethereum: { name: 'Ethereum', symbol: 'ETH', icon: 'Ξ', gradient: 'from-blue-500 via-indigo-600 to-blue-800', explorerUrl: 'https://etherscan.io/tx/', walletField: 'ethereum', isEVM: true },
  base: { name: 'Base', symbol: 'ETH', icon: '🔵', gradient: 'from-blue-400 via-blue-600 to-indigo-700', explorerUrl: 'https://basescan.org/tx/', walletField: 'ethereum', isEVM: true },
  polygon: { name: 'Polygon', symbol: 'MATIC', icon: '⬡', gradient: 'from-purple-400 via-violet-600 to-purple-800', explorerUrl: 'https://polygonscan.com/tx/', walletField: 'ethereum', isEVM: true },
  arbitrum: { name: 'Arbitrum', symbol: 'ETH', icon: '🔷', gradient: 'from-cyan-500 via-blue-600 to-blue-800', explorerUrl: 'https://arbiscan.io/tx/', walletField: 'ethereum', isEVM: true },
  bnb: { name: 'BNB Chain', symbol: 'BNB', icon: '🟡', gradient: 'from-yellow-400 via-amber-500 to-orange-600', explorerUrl: 'https://bscscan.com/tx/', walletField: 'ethereum', isEVM: true },
  bitcoin: { name: 'Bitcoin', symbol: 'BTC', icon: '₿', gradient: 'from-orange-400 via-amber-500 to-orange-700', explorerUrl: 'https://mempool.space/tx/', walletField: 'bitcoin', isEVM: false, isManual: true },
  tron: { name: 'TRON', symbol: 'TRX', icon: '🔺', gradient: 'from-red-400 via-rose-500 to-red-700', explorerUrl: 'https://tronscan.org/#/transaction/', walletField: 'tron', isEVM: false, isManual: true }
};

const AquaPayPage = ({ currentUser }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentPage, setPaymentPage] = useState(null);
  const [selectedChain, setSelectedChain] = useState(null);
  const [selectedToken, setSelectedToken] = useState('native'); // 'native' or 'usdc'
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [txStatus, setTxStatus] = useState(null);
  const [txError, setTxError] = useState(null);
  
  const [copied, setCopied] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSolanaWalletModal, setShowSolanaWalletModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [wcProvider, setWcProvider] = useState(null);
  const [tokenPrice, setTokenPrice] = useState(null);

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
        setError(err.response?.data?.error || 'Payment page not found');
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchPaymentPage();
  }, [slug]);

  useEffect(() => {
    if (walletConnected) {
      if (wcProvider) { wcProvider.disconnect().catch(() => {}); setWcProvider(null); }
      setWalletConnected(false);
      setWalletAddress(null);
    }
    // Reset token to native when switching chains
    setSelectedToken('native');
    setTokenPrice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChain]);

  // Fetch token price from CoinGecko
  useEffect(() => {
    const fetchPrice = async () => {
      if (!selectedChain || !COINGECKO_IDS[selectedChain]) return;
      try {
        const coinId = COINGECKO_IDS[selectedChain];
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
        const data = await response.json();
        if (data[coinId]?.usd) {
          setTokenPrice(data[coinId].usd);
        }
      } catch (err) {
        console.error('Error fetching price:', err);
      }
    };
    fetchPrice();
    // Refresh price every 30 seconds
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, [selectedChain]);

  const getRecipientAddress = useCallback(() => {
    if (!paymentPage || !selectedChain) return null;
    const chainConfig = CHAINS[selectedChain];
    return chainConfig ? paymentPage.wallets[chainConfig.walletField] : null;
  }, [paymentPage, selectedChain]);

  const isManualChain = selectedChain && CHAINS[selectedChain]?.isManual;

  const connectEVMWallet = () => setShowWalletModal(true);

  const connectWithWallet = async (walletId) => {
    setShowWalletModal(false);
    setConnecting(true);
    setTxError(null);
    try {
      let accounts = [];
      const chainConfig = EVM_CHAINS[selectedChain];
      const chainIdNum = parseInt(chainConfig.chainId, 16);

      if (walletId === 'walletconnect') {
        const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
        const provider = await EthereumProvider.init({
          projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'demo',
          chains: [chainIdNum], showQrModal: true,
          methods: ['eth_sendTransaction', 'personal_sign'],
          events: ['chainChanged', 'accountsChanged'],
          metadata: { name: 'AquaPay', description: 'Send crypto payments', url: window.location.origin, icons: [`${window.location.origin}/logo192.png`] },
          qrModalOptions: { themeMode: 'dark' }
        });
        await provider.connect();
        accounts = provider.accounts;
        setWcProvider(provider);
        provider.on('disconnect', () => { setWalletConnected(false); setWalletAddress(null); setWcProvider(null); });
      } else {
        if (!window.ethereum) throw new Error('No Web3 wallet detected');
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (chainConfig) {
          try { await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainConfig.chainId }] }); }
          catch (e) { if (e.code === 4902) await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [chainConfig] }); else throw e; }
        }
      }
      if (accounts.length > 0) { setWalletAddress(accounts[0]); setWalletConnected(true); }
    } catch (err) { setTxError(err.message || 'Failed to connect'); }
    finally { setConnecting(false); }
  };

  const connectSolanaWallet = () => setShowSolanaWalletModal(true);

  const connectWithSolanaWallet = async (walletId) => {
    setShowSolanaWalletModal(false);
    setConnecting(true);
    setTxError(null);
    try {
      let provider = null;
      if (walletId === 'phantom') { provider = window.phantom?.solana || window.solana; if (!provider?.isPhantom) throw new Error('Phantom not found - install from phantom.app'); }
      else if (walletId === 'solflare') { provider = window.solflare; if (!provider?.isSolflare) throw new Error('Solflare not found - install from solflare.com'); }
      else if (walletId === 'backpack') { provider = window.backpack; if (!provider) throw new Error('Backpack not found - install from backpack.app'); }
      else { provider = window.phantom?.solana || window.solflare || window.solana; }
      if (!provider) throw new Error('No Solana wallet found');
      const response = await provider.connect();
      setWalletAddress(response.publicKey.toString());
      setWalletConnected(true);
    } catch (err) { setTxError(err.message || 'Failed to connect'); }
    finally { setConnecting(false); }
  };

  const connectWallet = async () => {
    if (!selectedChain) return;
    const chainConfig = CHAINS[selectedChain];
    if (chainConfig.isEVM) connectEVMWallet();
    else if (selectedChain === 'solana') connectSolanaWallet();
  };

  const sendEVMPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) { setTxError('Enter a valid amount'); return; }
    const recipientAddress = getRecipientAddress();
    if (!recipientAddress) { setTxError('Recipient not found'); return; }
    setSending(true); setTxError(null); setTxStatus('pending');
    try {
      const ethProvider = wcProvider || window.ethereum;
      const provider = new ethers.BrowserProvider(ethProvider);
      const signer = await provider.getSigner();
      
      let tx;
      if (selectedToken === 'usdc' && USDC_ADDRESSES[selectedChain]) {
        // Send USDC (ERC-20 transfer)
        const usdcContract = new ethers.Contract(USDC_ADDRESSES[selectedChain], ERC20_ABI, signer);
        const decimals = await usdcContract.decimals();
        const amountInUnits = ethers.parseUnits(amount, decimals);
        tx = await usdcContract.transfer(recipientAddress, amountInUnits);
      } else {
        // Send native token (ETH, MATIC, BNB)
        tx = await signer.sendTransaction({ to: recipientAddress, value: ethers.parseEther(amount) });
      }
      
      setTxHash(tx.hash);
      const receipt = await tx.wait();
      if (receipt.status === 1) { setTxStatus('success'); await recordPayment(tx.hash); }
      else { setTxStatus('error'); setTxError('Transaction failed'); }
    } catch (err) { 
      console.error('Payment error:', err);
      setTxStatus('error'); 
      setTxError(err.reason || err.message || 'Transaction failed'); 
    }
    finally { setSending(false); }
  };

  const sendSolanaPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) { setTxError('Enter a valid amount'); return; }
    const recipientAddress = getRecipientAddress();
    if (!recipientAddress) { setTxError('Recipient not found'); return; }
    const solana = window.phantom?.solana || window.solflare || window.solana;
    if (!solana) { setTxError('Solana wallet not found'); return; }
    setSending(true); setTxError(null); setTxStatus('pending');
    try {
      const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      const fromPubkey = new PublicKey(walletAddress);
      const toPubkey = new PublicKey(recipientAddress);
      
      let transaction;
      
      if (selectedToken === 'usdc') {
        // Send USDC (SPL Token)
        const { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, getAccount } = await import('@solana/spl-token');
        const usdcMint = new PublicKey(SOLANA_USDC_MINT);
        
        // Get token accounts
        const fromTokenAccount = await getAssociatedTokenAddress(usdcMint, fromPubkey);
        const toTokenAccount = await getAssociatedTokenAddress(usdcMint, toPubkey);
        
        transaction = new Transaction();
        
        // Check if recipient has a token account, create if not
        try {
          await getAccount(connection, toTokenAccount);
        } catch (e) {
          // Account doesn't exist, add instruction to create it
          transaction.add(
            createAssociatedTokenAccountInstruction(fromPubkey, toTokenAccount, toPubkey, usdcMint)
          );
        }
        
        // USDC has 6 decimals
        const amountInUnits = Math.floor(parseFloat(amount) * 1_000_000);
        transaction.add(
          createTransferInstruction(fromTokenAccount, toTokenAccount, fromPubkey, amountInUnits)
        );
      } else {
        // Send native SOL
        transaction = new Transaction().add(
          SystemProgram.transfer({ fromPubkey, toPubkey, lamports: Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL) })
        );
      }
      
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
      console.error('Solana payment error:', err);
      setTxStatus('error'); 
      setTxError(err.message || 'Transaction failed'); 
    }
    finally { setSending(false); }
  };

  const sendPayment = async () => {
    if (!selectedChain) return;
    if (CHAINS[selectedChain].isEVM) await sendEVMPayment();
    else if (selectedChain === 'solana') await sendSolanaPayment();
  };

  const recordPayment = async (hash) => {
    try {
      const tokenSymbol = selectedToken === 'usdc' ? 'USDC' : (CHAINS[selectedChain]?.symbol || 'UNKNOWN');
      await axios.post(`${API_URL}/api/aquapay/payment`, {
        recipientSlug: slug, txHash: hash, chain: selectedChain,
        token: tokenSymbol, amount: parseFloat(amount) || 0,
        senderAddress: walletAddress, senderUsername: currentUser?.username || null, message: message || null
      });
    } catch (e) { console.error('Error recording payment:', e); }
  };

  const copyAddress = () => {
    const address = getRecipientAddress();
    if (address) { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const getAvailableChains = useCallback(() => {
    if (!paymentPage) return [];
    const available = [];
    Object.entries(CHAINS).forEach(([chainId, config]) => {
      if (paymentPage.wallets[config.walletField]) available.push({ id: chainId, ...config });
    });
    return available;
  }, [paymentPage]);

  const resetPayment = () => {
    setTxHash(null); setTxStatus(null); setTxError(null); setAmount(''); setMessage('');
    setWalletConnected(false); setWalletAddress(null); setSelectedToken('native');
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="text-center bg-gray-800/50 rounded-2xl p-8 max-w-sm border border-gray-700">
          <span className="text-5xl mb-4 block">🔍</span>
          <h1 className="text-xl font-bold text-white mb-2">Not Found</h1>
          <p className="text-gray-400 mb-6 text-sm">{error}</p>
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Success
  if (txStatus === 'success') {
    const chainConfig = CHAINS[selectedChain];
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="text-center bg-gray-800/50 rounded-2xl p-8 max-w-sm w-full border border-green-500/30">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Sent!</h1>
          <p className="text-gray-300 mb-4">{amount} {selectedToken === 'usdc' ? 'USDC' : chainConfig?.symbol} → {paymentPage?.displayName}</p>
          {txHash && (
            <a href={`${chainConfig?.explorerUrl}${txHash}`} target="_blank" rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 text-cyan-400 rounded-lg text-sm mb-4">
              View Transaction →
            </a>
          )}
          <button onClick={resetPayment} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg">
            Send Another
          </button>
        </div>
      </div>
    );
  }

  const availableChains = getAvailableChains();
  const recipientAddress = getRecipientAddress();
  const chainConfig = selectedChain ? CHAINS[selectedChain] : null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-3 md:p-6 flex items-center justify-center">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-5xl relative z-10">
        {/* Main Grid - Side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          
          {/* Left Column - Profile & Chains */}
          <div className="space-y-4">
            {/* Profile Card - Compact */}
            <div className="bg-gray-800/60 backdrop-blur rounded-2xl p-4 md:p-5 border border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <img src={paymentPage?.image || 'https://i.imgur.com/6VBx3io.png'} alt=""
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-gray-600 object-cover" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-800 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold text-white truncate">{paymentPage?.displayName}</h1>
                  <p className="text-cyan-400 text-sm">@{paymentPage?.username}</p>
                  {paymentPage?.bio && <p className="text-gray-400 text-sm mt-1 line-clamp-2">{paymentPage.bio}</p>}
                </div>
              </div>
              {paymentPage?.stats?.totalTransactions > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center gap-2">
                  <span className="text-green-400 text-sm">✓</span>
                  <span className="text-gray-400 text-sm">{paymentPage.stats.totalTransactions} payments received</span>
                </div>
              )}
            </div>

            {/* Chain Selection - Horizontal scroll on mobile, grid on desktop */}
            <div className="bg-gray-800/60 backdrop-blur rounded-2xl p-4 border border-gray-700/50">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-semibold">Select Network</h2>
                <button onClick={() => setShowInfoModal(true)} className="text-gray-400 hover:text-cyan-400 text-sm flex items-center gap-1">
                  <span>ℹ️</span> How it works
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible scrollbar-hide">
                {availableChains.map(chain => (
                  <button key={chain.id} onClick={() => setSelectedChain(chain.id)}
                    className={`flex-shrink-0 p-3 rounded-xl border-2 transition-all min-w-[80px] md:min-w-0 ${
                      selectedChain === chain.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
                    }`}>
                    <span className="text-2xl block text-center">{chain.icon}</span>
                    <span className="text-white text-xs font-medium block text-center mt-1">{chain.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Security Note - Desktop only */}
            <div className="hidden lg:block bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">🔒</span>
                <div>
                  <p className="text-emerald-300 text-sm font-medium">Direct & Secure</p>
                  <p className="text-emerald-300/70 text-xs">Non-custodial. Funds go directly to recipient.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Payment */}
          <div className="bg-gray-800/60 backdrop-blur rounded-2xl p-4 md:p-5 border border-gray-700/50">
            {!selectedChain || !recipientAddress ? (
              <div className="h-full flex items-center justify-center py-8">
                <div className="text-center">
                  <span className="text-4xl mb-3 block">👈</span>
                  <p className="text-gray-400">Select a network to continue</p>
                </div>
              </div>
            ) : isManualChain ? (
              /* Manual Payment */
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${chainConfig?.gradient} flex items-center justify-center`}>
                    <span className="text-xl">{chainConfig?.icon}</span>
                  </div>
                  <div>
                    <h2 className="text-white font-bold">Send {chainConfig?.symbol}</h2>
                    <p className="text-gray-400 text-xs">Manual transfer</p>
                  </div>
                </div>
                
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                  <p className="text-amber-200 text-xs">⚠️ Copy address and send from your {chainConfig?.name} wallet</p>
                </div>
                
                <div className="bg-gray-900/70 rounded-lg p-3 mb-4 border border-gray-700">
                  <p className="text-gray-500 text-xs mb-1">ADDRESS</p>
                  <p className="text-white font-mono text-xs break-all mb-3">{recipientAddress}</p>
                  <button onClick={copyAddress}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${copied ? 'bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                    {copied ? '✓ Copied!' : '📋 Copy Address'}
                  </button>
                </div>

                <div className="bg-white rounded-lg p-4 flex justify-center">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(recipientAddress)}`}
                    alt="QR" className="w-32 h-32" />
                </div>
              </div>
            ) : !walletConnected ? (
              /* Connect Wallet */
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${chainConfig?.gradient} flex items-center justify-center`}>
                    <span className="text-xl">{chainConfig?.icon}</span>
                  </div>
                  <div>
                    <h2 className="text-white font-bold">Connect Wallet</h2>
                    <p className="text-gray-400 text-xs">Pay with {chainConfig?.symbol}</p>
                  </div>
                </div>

                {/* Mobile security note */}
                <div className="lg:hidden bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
                  <p className="text-emerald-300 text-xs">🔒 Direct & secure. Funds go straight to recipient.</p>
                </div>

                {txError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                    <p className="text-red-300 text-xs">{txError}</p>
                  </div>
                )}

                <button onClick={connectWallet} disabled={connecting}
                  className={`w-full py-4 bg-gradient-to-r ${chainConfig?.gradient} text-white font-bold rounded-xl transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2`}>
                  {connecting ? (
                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Connecting...</>
                  ) : (
                    <><span className="text-xl">{chainConfig?.icon}</span> Connect {selectedChain === 'solana' ? 'Solana' : ''} Wallet</>
                  )}
                </button>
                <p className="text-gray-500 text-xs text-center mt-3">
                  {selectedChain === 'solana' ? 'Phantom, Solflare, Backpack' : 'MetaMask, WalletConnect, Coinbase'}
                </p>
              </div>
            ) : (
              /* Payment Form */
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${chainConfig?.gradient} flex items-center justify-center`}>
                      <span className="text-xl">{chainConfig?.icon}</span>
                    </div>
                    <div>
                      <h2 className="text-white font-bold">Send Payment</h2>
                      <p className="text-gray-400 text-xs">{chainConfig?.name}</p>
                    </div>
                  </div>
                  <button onClick={() => { if (wcProvider) wcProvider.disconnect().catch(() => {}); setWalletConnected(false); setWalletAddress(null); setWcProvider(null); }}
                    className="text-gray-400 hover:text-red-400 text-xs">Disconnect</button>
                </div>

                {/* Connected */}
                <div className="bg-gray-900/70 rounded-lg p-2 px-3 mb-4 flex items-center gap-2 border border-gray-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-300 text-xs font-mono">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
                </div>

                {/* Token Selector */}
                {(chainConfig?.isEVM || selectedChain === 'solana') && (
                  <div className="mb-3">
                    <label className="block text-gray-400 text-xs mb-1">Currency</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedToken('native')}
                        className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          selectedToken === 'native' 
                            ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-300' 
                            : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <span>{chainConfig?.icon}</span>
                        <span>{chainConfig?.symbol}</span>
                      </button>
                      <button
                        onClick={() => setSelectedToken('usdc')}
                        className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          selectedToken === 'usdc' 
                            ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-300' 
                            : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <span>💵</span>
                        <span>USDC</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Amount */}
                <div className="mb-3">
                  <label className="block text-gray-400 text-xs mb-1">Amount</label>
                  <div className="relative">
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00" step={selectedToken === 'usdc' ? '0.01' : '0.0001'} min="0"
                      className="w-full px-3 py-3 pr-16 bg-gray-900/70 border border-gray-700 focus:border-cyan-500 rounded-lg text-white text-xl font-bold focus:outline-none" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">
                      {selectedToken === 'usdc' ? 'USDC' : chainConfig?.symbol}
                    </span>
                  </div>
                  {/* USD Conversion */}
                  {selectedToken === 'native' && tokenPrice && amount && parseFloat(amount) > 0 && (
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-gray-500">≈ ${(parseFloat(amount) * tokenPrice).toFixed(2)} USD</span>
                      <span className="text-gray-600">1 {chainConfig?.symbol} = ${tokenPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>

                {/* Quick amounts */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {(selectedToken === 'usdc' ? [5, 10, 25, 50] : [0.01, 0.05, 0.1, 0.5]).map(val => (
                    <button key={val} onClick={() => setAmount(val.toString())}
                      className="py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-medium border border-gray-700">
                      {selectedToken === 'usdc' ? `$${val}` : val}
                    </button>
                  ))}
                </div>

                {/* Message */}
                <div className="mb-4">
                  <label className="block text-gray-400 text-xs mb-1">Note (optional)</label>
                  <input type="text" value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add a message..." maxLength={200}
                    className="w-full px-3 py-2 bg-gray-900/70 border border-gray-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none" />
                </div>

                {txError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                    <p className="text-red-300 text-xs">{txError}</p>
                  </div>
                )}

                {/* To */}
                <div className="bg-gray-900/50 rounded-lg p-2 px-3 mb-4 border border-gray-700/50">
                  <p className="text-gray-500 text-xs">TO: <span className="text-gray-300 font-mono">{recipientAddress?.slice(0, 12)}...{recipientAddress?.slice(-8)}</span></p>
                </div>

                {/* Send */}
                <button onClick={sendPayment} disabled={sending || !amount || parseFloat(amount) <= 0}
                  className={`w-full py-4 bg-gradient-to-r ${chainConfig?.gradient} text-white font-bold rounded-xl transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2`}>
                  {sending ? (
                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> {txStatus === 'pending' ? 'Confirming...' : 'Sending...'}</>
                  ) : (
                    <>Send {amount || '0'} {selectedToken === 'usdc' ? 'USDC' : chainConfig?.symbol}</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-gray-600 text-xs">
            Powered by <a href="https://aquads.xyz" className="text-cyan-500 hover:text-cyan-400">AquaPay</a> • Non-custodial payments
          </p>
        </div>
      </div>

      {/* EVM Wallet Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl p-5 max-w-xs w-full border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Connect Wallet</h3>
              <button onClick={() => setShowWalletModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-2">
              {EVM_WALLET_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => connectWithWallet(opt.id)}
                  className="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center gap-3 border border-gray-700 relative">
                  {opt.recommended && <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-cyan-500 text-white text-xs rounded-full">Popular</span>}
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="text-left">
                    <p className="text-white font-medium text-sm">{opt.name}</p>
                    <p className="text-gray-400 text-xs">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Solana Wallet Modal */}
      {showSolanaWalletModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl p-5 max-w-xs w-full border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Connect Solana</h3>
              <button onClick={() => setShowSolanaWalletModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-2">
              {SOLANA_WALLET_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => connectWithSolanaWallet(opt.id)}
                  className="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center gap-3 border border-gray-700 relative">
                  {opt.recommended && <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">Popular</span>}
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="text-left">
                    <p className="text-white font-medium text-sm">{opt.name}</p>
                    <p className="text-gray-400 text-xs">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-gray-600 text-xs mt-3 text-center">
              Need a wallet? <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="text-purple-400">Get Phantom</a>
            </p>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-gray-900 rounded-2xl p-5 max-w-sm w-full border border-gray-700 my-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">How AquaPay Works</h3>
              <button onClick={() => setShowInfoModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="space-y-3 mb-4">
              {[
                { n: '1', t: 'Select Network', d: 'Choose blockchain (ETH, SOL, etc.)' },
                { n: '2', t: 'Connect Wallet', d: 'Connect your crypto wallet' },
                { n: '3', t: 'Send', d: 'Enter amount and confirm' }
              ].map(s => (
                <div key={s.n} className="flex gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-cyan-400 font-bold text-sm">{s.n}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{s.t}</p>
                    <p className="text-gray-400 text-xs">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-3">
              <p className="text-emerald-300 text-xs font-medium mb-1">✅ Do's</p>
              <ul className="text-emerald-200/70 text-xs space-y-0.5">
                <li>• Verify recipient username</li>
                <li>• Check you have enough balance + gas</li>
                <li>• Keep transaction hash</li>
              </ul>
            </div>
            
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-300 text-xs font-medium mb-1">❌ Don'ts</p>
              <ul className="text-red-200/70 text-xs space-y-0.5">
                <li>• Never share seed phrase</li>
                <li>• Don't send to wrong network</li>
                <li>• Don't send all funds (keep gas)</li>
              </ul>
            </div>
            
            <button onClick={() => setShowInfoModal(false)}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl text-sm">
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AquaPayPage;
