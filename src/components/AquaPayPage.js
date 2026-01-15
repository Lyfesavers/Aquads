import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ethers } from 'ethers';
import emailService from '../services/emailService';

const API_URL = process.env.REACT_APP_API_URL || 'https://aquads.onrender.com';

// CoinGecko IDs for price fetching
const COINGECKO_IDS = {
  solana: 'solana', ethereum: 'ethereum', base: 'ethereum', polygon: 'matic-network',
  arbitrum: 'ethereum', bnb: 'binancecoin', bitcoin: 'bitcoin', tron: 'tron'
};

// Wallet options
const EVM_WALLET_OPTIONS = [
  { id: 'walletconnect', name: 'WalletConnect', icon: '🔗', description: 'Mobile & 300+ wallets', recommended: true },
  { id: 'injected', name: 'Browser Wallet', icon: '🦊', description: 'MetaMask, Rabby, etc.' }
];
const SOLANA_WALLET_OPTIONS = [
  { id: 'phantom', name: 'Phantom', icon: '👻', description: 'Popular Solana wallet', recommended: true },
  { id: 'solflare', name: 'Solflare', icon: '🔥', description: 'Secure wallet' },
  { id: 'backpack', name: 'Backpack', icon: '🎒', description: 'Multi-chain' }
];

// Chain configs
const EVM_CHAINS = {
  ethereum: { chainId: '0x1', chainName: 'Ethereum Mainnet', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://ethereum.publicnode.com'], blockExplorerUrls: ['https://etherscan.io'] },
  base: { chainId: '0x2105', chainName: 'Base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://mainnet.base.org'], blockExplorerUrls: ['https://basescan.org'] },
  polygon: { chainId: '0x89', chainName: 'Polygon', nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }, rpcUrls: ['https://polygon-rpc.com'], blockExplorerUrls: ['https://polygonscan.com'] },
  arbitrum: { chainId: '0xa4b1', chainName: 'Arbitrum One', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://arb1.arbitrum.io/rpc'], blockExplorerUrls: ['https://arbiscan.io'] },
  bnb: { chainId: '0x38', chainName: 'BNB Smart Chain', nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: ['https://bsc-dataseed.binance.org'], blockExplorerUrls: ['https://bscscan.com'] }
};

const USDC_ADDRESSES = {
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  bnb: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
};
const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const ERC20_ABI = ['function transfer(address to, uint256 amount) returns (bool)', 'function decimals() view returns (uint8)'];

// Custom Solana connection class using backend proxy to avoid CORS/rate limits
class ProxiedConnection {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }
  
  async _call(method, params) {
    try {
      const res = await axios.post(`${this.apiUrl}/api/aquapay/solana-rpc`, { method, params }, { timeout: 30000 });
      if (res.data.error) throw new Error(res.data.error.message || res.data.error);
      return res.data.result;
    } catch (err) {
      if (err.response?.data?.error) throw new Error(err.response.data.error);
      throw err;
    }
  }
  
  async getLatestBlockhash() {
    const result = await this._call('getLatestBlockhash', [{ commitment: 'confirmed' }]);
    return result.value;
  }
  
  async sendRawTransaction(serializedTx) {
    // Convert Uint8Array to base64
    const base64Tx = typeof serializedTx === 'string' ? serializedTx : 
      btoa(String.fromCharCode.apply(null, new Uint8Array(serializedTx)));
    return await this._call('sendTransaction', [base64Tx, { encoding: 'base64', preflightCommitment: 'confirmed' }]);
  }
  
  async confirmTransaction(signature) {
    // Poll for confirmation (up to 60 seconds)
    for (let i = 0; i < 60; i++) {
      try {
        const result = await this._call('getSignatureStatuses', [[signature]]);
        const status = result?.value?.[0];
        if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
          return { value: status };
        }
        if (status?.err) throw new Error('Transaction failed: ' + JSON.stringify(status.err));
      } catch (e) {
        if (e.message.includes('Transaction failed')) throw e;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error('Transaction confirmation timeout - check explorer');
  }
  
  async getAccountInfo(pubkey) {
    return await this._call('getAccountInfo', [pubkey.toString(), { encoding: 'base64' }]);
  }
}

const CHAINS = {
  solana: { name: 'Solana', symbol: 'SOL', icon: '◎', gradient: 'from-purple-500 to-violet-600', explorerUrl: 'https://solscan.io/tx/', walletField: 'solana', isEVM: false },
  ethereum: { name: 'Ethereum', symbol: 'ETH', icon: 'Ξ', gradient: 'from-blue-500 to-indigo-600', explorerUrl: 'https://etherscan.io/tx/', walletField: 'ethereum', isEVM: true },
  base: { name: 'Base', symbol: 'ETH', icon: '🔵', gradient: 'from-blue-400 to-blue-600', explorerUrl: 'https://basescan.org/tx/', walletField: 'ethereum', isEVM: true },
  polygon: { name: 'Polygon', symbol: 'MATIC', icon: '⬡', gradient: 'from-purple-400 to-violet-600', explorerUrl: 'https://polygonscan.com/tx/', walletField: 'ethereum', isEVM: true },
  arbitrum: { name: 'Arbitrum', symbol: 'ETH', icon: '🔷', gradient: 'from-cyan-500 to-blue-600', explorerUrl: 'https://arbiscan.io/tx/', walletField: 'ethereum', isEVM: true },
  bnb: { name: 'BNB', symbol: 'BNB', icon: '🟡', gradient: 'from-yellow-400 to-amber-500', explorerUrl: 'https://bscscan.com/tx/', walletField: 'ethereum', isEVM: true },
  bitcoin: { name: 'Bitcoin', symbol: 'BTC', icon: '₿', gradient: 'from-orange-400 to-amber-500', explorerUrl: 'https://mempool.space/tx/', walletField: 'bitcoin', isEVM: false, isManual: true },
  tron: { name: 'TRON', symbol: 'TRX', icon: '🔺', gradient: 'from-red-400 to-rose-500', explorerUrl: 'https://tronscan.org/#/transaction/', walletField: 'tron', isEVM: false, isManual: true }
};

const AquaPayPage = ({ currentUser }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentPage, setPaymentPage] = useState(null);
  const [selectedChain, setSelectedChain] = useState(null);
  const [selectedToken, setSelectedToken] = useState('native');
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
  const [wcProvider, setWcProvider] = useState(null);
  const [tokenPrice, setTokenPrice] = useState(null);

  useEffect(() => {
    const fetchPaymentPage = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/aquapay/page/${slug}`);
        if (response.data.success) {
          setPaymentPage(response.data.paymentPage);
          const wallets = response.data.paymentPage.wallets;
          const preferred = response.data.paymentPage.preferredChain;
          if (preferred && wallets[CHAINS[preferred]?.walletField]) setSelectedChain(preferred);
          else if (wallets.ethereum) setSelectedChain('ethereum');
          else if (wallets.solana) setSelectedChain('solana');
          else if (wallets.bitcoin) setSelectedChain('bitcoin');
          else if (wallets.tron) setSelectedChain('tron');
        }
      } catch (err) { setError(err.response?.data?.error || 'Payment page not found'); }
      finally { setLoading(false); }
    };
    if (slug) fetchPaymentPage();
  }, [slug]);

  useEffect(() => {
    if (walletConnected) {
      if (wcProvider) { wcProvider.disconnect().catch(() => {}); setWcProvider(null); }
      setWalletConnected(false); setWalletAddress(null);
    }
    setSelectedToken('native'); setTokenPrice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChain]);

  useEffect(() => {
    const fetchPrice = async () => {
      if (!selectedChain || !COINGECKO_IDS[selectedChain]) return;
      try {
        const coinId = COINGECKO_IDS[selectedChain];
        // Use CoinGecko proxy or alternative API to avoid CORS
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`, {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data[coinId]?.usd) setTokenPrice(data[coinId].usd);
        }
      } catch (e) {
        // Fallback: Try fetching from our backend proxy
        try {
          const res = await axios.get(`${API_URL}/api/tokens/price/${COINGECKO_IDS[selectedChain]}`);
          if (res.data?.price) setTokenPrice(res.data.price);
        } catch {
          // Price fetch failed, continue without price display
          console.log('Price unavailable');
        }
      }
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 60000); // Less frequent to avoid rate limits
    return () => clearInterval(interval);
  }, [selectedChain]);

  const getRecipientAddress = useCallback(() => {
    if (!paymentPage || !selectedChain) return null;
    return paymentPage.wallets[CHAINS[selectedChain]?.walletField] || null;
  }, [paymentPage, selectedChain]);

  const isManualChain = selectedChain && CHAINS[selectedChain]?.isManual;
  const chainConfig = selectedChain ? CHAINS[selectedChain] : null;
  const recipientAddress = getRecipientAddress();

  // Wallet connection handlers
  const connectWithWallet = async (walletId) => {
    setShowWalletModal(false); setConnecting(true); setTxError(null);
    try {
      let accounts = [];
      const evmConfig = EVM_CHAINS[selectedChain];
      if (walletId === 'walletconnect') {
        const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
        const provider = await EthereumProvider.init({
          projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'demo',
          chains: [parseInt(evmConfig.chainId, 16)], showQrModal: true,
          methods: ['eth_sendTransaction', 'personal_sign'], events: ['chainChanged', 'accountsChanged'],
          metadata: { name: 'AquaPay', description: 'Crypto payments', url: window.location.origin, icons: [`${window.location.origin}/logo192.png`] }
        });
        await provider.connect();
        accounts = provider.accounts; setWcProvider(provider);
        provider.on('disconnect', () => { setWalletConnected(false); setWalletAddress(null); setWcProvider(null); });
      } else {
        if (!window.ethereum) throw new Error('No wallet detected');
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        try { await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: evmConfig.chainId }] }); }
        catch (e) { if (e.code === 4902) await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [evmConfig] }); }
      }
      if (accounts.length > 0) { setWalletAddress(accounts[0]); setWalletConnected(true); }
    } catch (err) { setTxError(err.message); }
    finally { setConnecting(false); }
  };

  const connectWithSolanaWallet = async (walletId) => {
    setShowSolanaWalletModal(false); setConnecting(true); setTxError(null);
    try {
      let provider = walletId === 'phantom' ? (window.phantom?.solana || window.solana) :
                     walletId === 'solflare' ? window.solflare : window.backpack;
      if (!provider) throw new Error(`${walletId} wallet not found`);
      const response = await provider.connect();
      setWalletAddress(response.publicKey.toString()); setWalletConnected(true);
    } catch (err) { setTxError(err.message); }
    finally { setConnecting(false); }
  };

  const connectWallet = () => {
    if (CHAINS[selectedChain]?.isEVM) setShowWalletModal(true);
    else if (selectedChain === 'solana') setShowSolanaWalletModal(true);
  };

  // Payment handlers
  const sendPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) { setTxError('Enter a valid amount'); return; }
    if (!recipientAddress) { setTxError('Recipient not found'); return; }
    setSending(true); setTxError(null); setTxStatus('pending');
    
    try {
      if (CHAINS[selectedChain]?.isEVM) {
        const evmConfig = EVM_CHAINS[selectedChain];
        const ethProvider = wcProvider || window.ethereum;
        
        // Ensure wallet is on the correct chain before sending
        if (ethProvider && evmConfig) {
          try {
            const currentChainId = await ethProvider.request({ method: 'eth_chainId' });
            if (currentChainId !== evmConfig.chainId) {
              try {
                await ethProvider.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: evmConfig.chainId }]
                });
              } catch (switchError) {
                if (switchError.code === 4902) {
                  // Chain not added, add it
                  await ethProvider.request({
                    method: 'wallet_addEthereumChain',
                    params: [evmConfig]
                  });
                } else if (switchError.code !== 4001) {
                  // 4001 = user rejected, which is fine - they can manually switch
                  throw switchError;
                }
              }
            }
          } catch (chainError) {
            // Log but don't fail - user might manually switch
            console.warn('Chain switch issue:', chainError);
          }
        }
        
        // Try ethers.js first, fallback to direct RPC if it fails (for Trust Wallet compatibility)
        let txHash;
        try {
          const provider = new ethers.BrowserProvider(ethProvider);
          const signer = await provider.getSigner();
          let tx;
          if (selectedToken === 'usdc' && USDC_ADDRESSES[selectedChain]) {
            const contract = new ethers.Contract(USDC_ADDRESSES[selectedChain], ERC20_ABI, signer);
            const decimals = await contract.decimals();
            tx = await contract.transfer(recipientAddress, ethers.parseUnits(amount, decimals));
          } else {
            tx = await signer.sendTransaction({ to: recipientAddress, value: ethers.parseEther(amount) });
          }
          txHash = tx.hash;
          setTxHash(txHash);
          const receipt = await tx.wait();
          if (receipt.status === 1) { setTxStatus('success'); await recordPayment(txHash); }
          else throw new Error('Transaction failed');
        } catch (ethersError) {
          // If ethers.js fails with "Unknown method" error, use sign + sendRawTransaction (for Trust Wallet)
          if (ethersError.message?.includes('Unknown method') || 
              ethersError.message?.includes('5201') || 
              ethersError.code === 'UNKNOWN_ERROR' ||
              ethersError.message?.includes('could not coalesce')) {
            console.warn('Ethers.js failed, using sign + sendRawTransaction:', ethersError);
            
            try {
              const provider = new ethers.BrowserProvider(ethProvider);
              const signer = await provider.getSigner();
              const fromAddress = await signer.getAddress();
              
              // Build transaction parameters
              let txParams;
              if (selectedToken === 'usdc' && USDC_ADDRESSES[selectedChain]) {
                // For ERC20, encode the transfer function
                const contract = new ethers.Contract(USDC_ADDRESSES[selectedChain], ERC20_ABI, provider);
                const decimals = await contract.decimals();
                const iface = new ethers.Interface(ERC20_ABI);
                const data = iface.encodeFunctionData('transfer', [
                  recipientAddress,
                  ethers.parseUnits(amount, decimals)
                ]);
                
                txParams = {
                  from: fromAddress,
                  to: USDC_ADDRESSES[selectedChain],
                  data: data,
                  value: '0x0'
                };
              } else {
                // Native token transfer - convert to hex with 0x prefix
                const valueBigInt = ethers.parseEther(amount);
                // Ensure hex format with 0x prefix (ethers format)
                const valueHex = ethers.hexlify(valueBigInt);
                txParams = {
                  from: fromAddress,
                  to: recipientAddress,
                  value: valueHex
                };
              }
              
              // Get gas estimate and nonce
              const [gasEstimate, nonce, gasPrice] = await Promise.all([
                ethProvider.request({ method: 'eth_estimateGas', params: [txParams] }),
                ethProvider.request({ method: 'eth_getTransactionCount', params: [fromAddress, 'pending'] }),
                ethProvider.request({ method: 'eth_gasPrice' })
              ]);
              
              // Add gas and nonce to transaction
              txParams.gas = gasEstimate;
              txParams.nonce = nonce;
              txParams.gasPrice = gasPrice;
              txParams.chainId = evmConfig.chainId;
              
              // Use eth_signTransaction if available, otherwise try eth_sendTransaction
              try {
                // Try eth_signTransaction first (wallet signs but doesn't send)
                const signedTx = await ethProvider.request({
                  method: 'eth_signTransaction',
                  params: [txParams]
                });
                
                // Send the signed raw transaction
                txHash = await ethProvider.request({
                  method: 'eth_sendRawTransaction',
                  params: [signedTx.raw]
                });
              } catch (signError) {
                // If eth_signTransaction not supported, try direct send (some wallets support this)
                txHash = await ethProvider.request({
                  method: 'eth_sendTransaction',
                  params: [txParams]
                });
              }
              
              setTxHash(txHash);
              setTxStatus('pending');
              
              // Wait for transaction using provider
              const receipt = await provider.waitForTransaction(txHash);
              if (receipt.status === 1) {
                setTxStatus('success');
                await recordPayment(txHash);
              } else {
                throw new Error('Transaction failed');
              }
            } catch (rawTxError) {
              console.error('Raw transaction also failed:', rawTxError);
              throw new Error('Transaction failed: ' + (rawTxError.message || 'Unknown error. Please try using a different wallet or ensure your wallet supports Base network.'));
            }
          } else {
            // Re-throw if it's a different error
            throw ethersError;
          }
        }
      } else if (selectedChain === 'solana') {
        const solana = window.phantom?.solana || window.solflare || window.solana;
        const { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
        
        // Use backend proxy to avoid CORS/rate limits
        const connection = new ProxiedConnection(API_URL);
        const { blockhash } = await connection.getLatestBlockhash();
        
        const fromPubkey = new PublicKey(walletAddress);
        const toPubkey = new PublicKey(recipientAddress);
        let transaction;
        if (selectedToken === 'usdc') {
          const { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
          const mint = new PublicKey(SOLANA_USDC_MINT);
          const fromATA = await getAssociatedTokenAddress(mint, fromPubkey);
          const toATA = await getAssociatedTokenAddress(mint, toPubkey);
          transaction = new Transaction();
          // Check if recipient ATA exists via proxy
          try {
            const acctInfo = await connection.getAccountInfo(toATA);
            if (!acctInfo?.value) {
              transaction.add(createAssociatedTokenAccountInstruction(fromPubkey, toATA, toPubkey, mint));
            }
          } catch { 
            transaction.add(createAssociatedTokenAccountInstruction(fromPubkey, toATA, toPubkey, mint)); 
          }
          transaction.add(createTransferInstruction(fromATA, toATA, fromPubkey, Math.floor(parseFloat(amount) * 1e6)));
        } else {
          transaction = new Transaction().add(SystemProgram.transfer({ fromPubkey, toPubkey, lamports: Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL) }));
        }
        transaction.recentBlockhash = blockhash; transaction.feePayer = fromPubkey;
        const signed = await solana.signTransaction(transaction);
        const sig = await connection.sendRawTransaction(signed.serialize());
        setTxHash(sig);
        setTxStatus('pending');
        await connection.confirmTransaction(sig);
        setTxStatus('success'); await recordPayment(sig);
      }
    } catch (err) { setTxStatus('error'); setTxError(err.reason || err.message); }
    finally { setSending(false); }
  };

  const recordPayment = async (hash) => {
    try {
      const response = await axios.post(`${API_URL}/api/aquapay/payment`, {
        recipientSlug: slug, txHash: hash, chain: selectedChain,
        token: selectedToken === 'usdc' ? 'USDC' : chainConfig?.symbol,
        amount: parseFloat(amount), senderAddress: walletAddress,
        senderUsername: currentUser?.username, message
      });
      
      // Send email notification to recipient if they have an email
      if (response.data.recipientEmail) {
        try {
          await emailService.sendAquaPayPaymentNotification(response.data.recipientEmail, {
            recipientName: response.data.recipientName,
            amount: parseFloat(amount),
            token: selectedToken === 'usdc' ? 'USDC' : chainConfig?.symbol,
            chain: selectedChain,
            senderAddress: walletAddress,
            txHash: hash,
            message: message || null
          });
        } catch (emailError) {
          console.error('Email notification error:', emailError);
          // Don't fail the payment if email fails
        }
      }
    } catch (e) { console.error('Record error:', e); }
  };

  const copyAddress = () => { navigator.clipboard.writeText(recipientAddress); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const resetPayment = () => { setTxHash(null); setTxStatus(null); setTxError(null); setAmount(''); setMessage(''); setWalletConnected(false); setWalletAddress(null); setSelectedToken('native'); };
  
  const getAvailableChains = useCallback(() => {
    if (!paymentPage) return [];
    return Object.entries(CHAINS).filter(([, c]) => paymentPage.wallets[c.walletField]).map(([id, c]) => ({ id, ...c }));
  }, [paymentPage]);

  const availableChains = getAvailableChains();
  const displaySymbol = selectedToken === 'usdc' ? 'USDC' : chainConfig?.symbol;
  const usdValue = selectedToken === 'native' && tokenPrice && amount ? (parseFloat(amount) * tokenPrice).toFixed(2) : null;

  // Loading
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <img src="/Aquadsnewlogo.png" alt="AQUADS" className="h-10 w-auto mx-auto mb-4" style={{ filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))' }} />
        <div className="w-8 h-8 mx-auto mb-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading payment...</p>
      </div>
    </div>
  );

  // Error
  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 max-w-sm w-full border border-slate-800 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <span className="text-3xl">🔍</span>
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">Page Not Found</h1>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors">
          Go Home
        </button>
      </div>
    </div>
  );

  // Success
  if (txStatus === 'success') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border border-emerald-500/20 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Payment Successful</h1>
        <p className="text-slate-400 mb-6">Your payment has been sent successfully</p>
        
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 text-left space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-500 text-sm">Amount</span>
            <span className="text-white font-semibold">{amount} {displaySymbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 text-sm">Recipient</span>
            <span className="text-white">{paymentPage?.displayName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 text-sm">Network</span>
            <span className="text-white">{chainConfig?.name}</span>
          </div>
        </div>
        
        {txHash && (
          <a href={`${chainConfig?.explorerUrl}${txHash}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm mb-6">
            View on Explorer <span>↗</span>
          </a>
        )}
        
        <button onClick={resetPayment} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium rounded-xl transition-all">
          Make Another Payment
        </button>
        
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center gap-2">
          <img src="/Aquadsnewlogo.png" alt="" className="h-4 w-auto opacity-60" />
          <span className="text-slate-600 text-xs">Secured by AquaPay</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="https://aquads.xyz" className="flex items-center gap-2">
            <img src="/Aquadsnewlogo.png" alt="AQUADS" className="h-7 w-auto" style={{ filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' }} />
            <span className="text-slate-400 text-sm font-medium">Pay</span>
          </a>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-xs font-medium">Secure</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-full">
              <span className="text-slate-400 text-xs">🔒 Non-custodial</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          
          {/* Left - Recipient Info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Recipient Card */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800/50 p-6">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-4">Paying to</p>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={paymentPage?.image || 'https://i.imgur.com/6VBx3io.png'} alt="" className="w-14 h-14 rounded-xl object-cover border-2 border-slate-700" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h2 className="text-white font-semibold text-lg">{paymentPage?.displayName}</h2>
                  <p className="text-cyan-400 text-sm">@{paymentPage?.username}</p>
                </div>
              </div>
              {paymentPage?.bio && <p className="text-slate-400 text-sm mt-4 leading-relaxed">{paymentPage.bio}</p>}
              {paymentPage?.stats?.totalTransactions > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-slate-500 text-sm">{paymentPage.stats.totalTransactions} successful payments</span>
                </div>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="bg-slate-900/40 rounded-xl border border-slate-800/30 p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg mb-1">🔐</div>
                  <p className="text-slate-500 text-xs">End-to-end<br/>encrypted</p>
                </div>
                <div>
                  <div className="text-lg mb-1">⚡</div>
                  <p className="text-slate-500 text-xs">Instant<br/>transfers</p>
                </div>
                <div>
                  <div className="text-lg mb-1">🛡️</div>
                  <p className="text-slate-500 text-xs">No fees<br/>from us</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Payment Form */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800/50 overflow-hidden">
              
              {/* Step 1: Select Network */}
              <div className="p-6 border-b border-slate-800/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <span className="text-cyan-400 text-sm font-bold">1</span>
                  </div>
                  <h3 className="text-white font-medium">Select Network</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableChains.map(chain => (
                    <button key={chain.id} onClick={() => setSelectedChain(chain.id)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                        selectedChain === chain.id
                          ? 'bg-gradient-to-r ' + chain.gradient + ' text-white shadow-lg'
                          : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
                      }`}>
                      <span>{chain.icon}</span>
                      <span>{chain.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedChain && recipientAddress && (
                <>
                  {/* Step 2: Payment Details */}
                  <div className="p-6 border-b border-slate-800/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <span className="text-cyan-400 text-sm font-bold">2</span>
                      </div>
                      <h3 className="text-white font-medium">Payment Details</h3>
                    </div>

                    {isManualChain ? (
                      /* Manual Payment */
                      <div>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
                          <p className="text-amber-300 text-sm">⚠️ Manual transfer required for {chainConfig?.name}</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                          <p className="text-slate-500 text-xs mb-2">Recipient Address</p>
                          <p className="text-white font-mono text-sm break-all mb-3">{recipientAddress}</p>
                          <button onClick={copyAddress}
                            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
                            {copied ? '✓ Copied!' : 'Copy Address'}
                          </button>
                        </div>
                        <div className="bg-white rounded-xl p-4 flex justify-center">
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(recipientAddress)}`} alt="QR" className="w-40 h-40" />
                        </div>
                      </div>
                    ) : !walletConnected ? (
                      /* Connect Wallet */
                      <div>
                        {txError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4"><p className="text-red-400 text-sm">{txError}</p></div>}
                        <button onClick={connectWallet} disabled={connecting}
                          className={`w-full py-4 bg-gradient-to-r ${chainConfig?.gradient} text-white font-semibold rounded-xl transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2`}>
                          {connecting ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connecting...</> : 
                            <><span className="text-xl">{chainConfig?.icon}</span> Connect Wallet</>}
                        </button>
                        <p className="text-slate-500 text-xs text-center mt-3">
                          {selectedChain === 'solana' ? 'Phantom, Solflare, Backpack' : 'MetaMask, WalletConnect & more'}
                        </p>
                      </div>
                    ) : (
                      /* Payment Form */
                      <div className="space-y-4">
                        {/* Connected Wallet */}
                        <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-slate-300 text-sm font-mono">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
                          </div>
                          <button onClick={() => { setWalletConnected(false); setWalletAddress(null); }} className="text-slate-500 hover:text-red-400 text-xs">Disconnect</button>
                        </div>

                        {/* Token Selector */}
                        {(chainConfig?.isEVM || selectedChain === 'solana') && (
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setSelectedToken('native')}
                              className={`py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${selectedToken === 'native' ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-300' : 'bg-slate-800/50 border border-slate-700 text-slate-400'}`}>
                              {chainConfig?.icon} {chainConfig?.symbol}
                            </button>
                            <button onClick={() => setSelectedToken('usdc')}
                              className={`py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${selectedToken === 'usdc' ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-300' : 'bg-slate-800/50 border border-slate-700 text-slate-400'}`}>
                              💵 USDC
                            </button>
                          </div>
                        )}

                        {/* Amount */}
                        <div>
                          <label className="block text-slate-400 text-sm mb-2">Amount</label>
                          <div className="relative">
                            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                              className="w-full px-4 py-4 pr-20 bg-slate-800/50 border border-slate-700 focus:border-cyan-500 rounded-xl text-white text-2xl font-bold focus:outline-none transition-colors" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{displaySymbol}</span>
                          </div>
                          {usdValue && <p className="text-slate-500 text-sm mt-2">≈ ${usdValue} USD</p>}
                        </div>

                        {/* Quick Amounts */}
                        <div className="flex gap-2">
                          {(selectedToken === 'usdc' ? [5, 10, 25, 50] : [0.01, 0.05, 0.1, 0.5]).map(val => (
                            <button key={val} onClick={() => setAmount(val.toString())}
                              className="flex-1 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg text-sm font-medium border border-slate-700/50 transition-colors">
                              {selectedToken === 'usdc' ? `$${val}` : val}
                            </button>
                          ))}
                        </div>

                        {/* Note */}
                        <div>
                          <label className="block text-slate-400 text-sm mb-2">Note (optional)</label>
                          <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What's this for?"
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 focus:border-cyan-500 rounded-xl text-white text-sm focus:outline-none transition-colors" />
                        </div>

                        {txError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3"><p className="text-red-400 text-sm">{txError}</p></div>}
                      </div>
                    )}
                  </div>

                  {/* Step 3: Review & Pay */}
                  {walletConnected && !isManualChain && (
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center">
                          <span className="text-cyan-400 text-sm font-bold">3</span>
                        </div>
                        <h3 className="text-white font-medium">Review & Pay</h3>
                      </div>

                      {/* Summary */}
                      <div className="bg-slate-800/30 rounded-xl p-4 mb-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">To</span>
                          <span className="text-white">{paymentPage?.displayName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Amount</span>
                          <span className="text-white font-semibold">{amount || '0'} {displaySymbol}</span>
                        </div>
                        {usdValue && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">USD Value</span>
                            <span className="text-slate-400">${usdValue}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Network</span>
                          <span className="text-white">{chainConfig?.name}</span>
                        </div>
                        <div className="border-t border-slate-700/50 pt-2 mt-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Network Fee</span>
                            <span className="text-slate-400">Paid by you</span>
                          </div>
                        </div>
                      </div>

                      <button onClick={sendPayment} disabled={sending || !amount || parseFloat(amount) <= 0}
                        className={`w-full py-4 bg-gradient-to-r ${chainConfig?.gradient} text-white font-bold rounded-xl transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg`}>
                        {sending ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {txStatus === 'pending' ? 'Confirming...' : 'Processing...'}</> :
                          <>Pay {amount || '0'} {displaySymbol}</>}
                      </button>

                      <p className="text-slate-600 text-xs text-center mt-3">
                        By continuing, you agree to send this payment directly to the recipient's wallet.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src="/Aquadsnewlogo.png" alt="" className="h-5 w-auto opacity-50" />
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <a href="https://aquads.xyz" className="hover:text-cyan-400 transition-colors">Aquads.xyz</a>
                <span>•</span>
                <a href="https://aquads.xyz/marketplace" className="hover:text-cyan-400 transition-colors">Marketplace</a>
                <span>•</span>
                <a href="https://aquads.xyz/aquaswap" className="hover:text-cyan-400 transition-colors">AquaSwap</a>
              </div>
            </div>
            <p className="text-slate-700 text-xs">© {new Date().getFullYear()} Aquads • Web3 Crypto Hub</p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-800">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
              <button onClick={() => setShowWalletModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <div className="space-y-2">
              {EVM_WALLET_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => connectWithWallet(opt.id)}
                  className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl flex items-center gap-3 border border-slate-700/50 transition-colors relative">
                  {opt.recommended && <span className="absolute -top-2 right-2 px-2 py-0.5 bg-cyan-500 text-white text-xs rounded-full">Popular</span>}
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="text-left">
                    <p className="text-white font-medium">{opt.name}</p>
                    <p className="text-slate-500 text-xs">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSolanaWalletModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-800">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-white">Connect Solana</h3>
              <button onClick={() => setShowSolanaWalletModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <div className="space-y-2">
              {SOLANA_WALLET_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => connectWithSolanaWallet(opt.id)}
                  className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl flex items-center gap-3 border border-slate-700/50 transition-colors relative">
                  {opt.recommended && <span className="absolute -top-2 right-2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">Popular</span>}
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="text-left">
                    <p className="text-white font-medium">{opt.name}</p>
                    <p className="text-slate-500 text-xs">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AquaPayPage;
