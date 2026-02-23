import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ethers } from 'ethers';
import { ESCROW_WALLETS, ESCROW_MODE, FEE_CONFIG } from '../../config/wallets';
import emailService from '../../services/emailService';

const API_URL = process.env.REACT_APP_API_URL || 'https://aquads.onrender.com';

const SOLANA_ESCROW_WALLET = ESCROW_WALLETS.SOLANA;
const EVM_ESCROW_WALLET = ESCROW_WALLETS.ETHEREUM;

const EVM_WALLET_OPTIONS = [
  { id: 'walletconnect', name: 'WalletConnect', icon: '🔗', description: 'Mobile & 300+ wallets', recommended: true },
  { id: 'injected', name: 'Browser Wallet', icon: '🦊', description: 'MetaMask, Rabby, etc.' }
];
const SOLANA_WALLET_OPTIONS = [
  { id: 'phantom', name: 'Phantom', icon: '👻', description: 'Popular Solana wallet', recommended: true },
  { id: 'solflare', name: 'Solflare', icon: '🔥', description: 'Secure wallet' },
  { id: 'backpack', name: 'Backpack', icon: '🎒', description: 'Multi-chain' }
];

const EVM_CHAINS = {
  ethereum: { chainId: '0x1', chainName: 'Ethereum Mainnet', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://ethereum.publicnode.com'], blockExplorerUrls: ['https://etherscan.io'] },
  base: { chainId: '0x2105', chainName: 'Base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://mainnet.base.org'], blockExplorerUrls: ['https://basescan.org'] },
  polygon: { chainId: '0x89', chainName: 'Polygon', nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }, rpcUrls: ['https://polygon-rpc.com'], blockExplorerUrls: ['https://polygonscan.com'] },
  arbitrum: { chainId: '0xa4b1', chainName: 'Arbitrum One', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://arb1.arbitrum.io/rpc'], blockExplorerUrls: ['https://arbiscan.io'] },
  bnb: { chainId: '0x38', chainName: 'BNB Smart Chain', nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: ['https://bsc-dataseed.binance.org'], blockExplorerUrls: ['https://bscscan.com'] }
};

const EVM_CHAINS_TESTNET = {
  ethereum: { chainId: '0xaa36a7', chainName: 'Sepolia', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://rpc.sepolia.org'], blockExplorerUrls: ['https://sepolia.etherscan.io'] },
  base: { chainId: '0x14a34', chainName: 'Base Sepolia', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://sepolia.base.org'], blockExplorerUrls: ['https://sepolia.basescan.org'] },
  polygon: { chainId: '0x13882', chainName: 'Polygon Amoy', nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }, rpcUrls: ['https://rpc-amoy.polygon.technology'], blockExplorerUrls: ['https://amoy.polygonscan.com'] },
  arbitrum: { chainId: '0x66eee', chainName: 'Arbitrum Sepolia', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'], blockExplorerUrls: ['https://sepolia.arbiscan.io'] },
  bnb: { chainId: '0x61', chainName: 'BSC Testnet', nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'], blockExplorerUrls: ['https://testnet.bscscan.com'] }
};

const USDC_ADDRESSES = {
  mainnet: {
    ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    bnb: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
  },
  testnet: {
    ethereum: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', base: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    polygon: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', arbitrum: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    bnb: '0x64544969ed7EBf5f083679233325356EbE738930'
  }
};

const SOLANA_USDC_MINT = ESCROW_MODE === 'mainnet'
  ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  : 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';

const ERC20_ABI = ['function transfer(address to, uint256 amount) returns (bool)', 'function decimals() view returns (uint8)'];

class ProxiedConnection {
  constructor(apiUrl) { this.apiUrl = apiUrl; }
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
  async getLatestBlockhash() { const r = await this._call('getLatestBlockhash', [{ commitment: 'confirmed' }]); return r.value; }
  async sendRawTransaction(serializedTx) {
    const base64Tx = typeof serializedTx === 'string' ? serializedTx : btoa(String.fromCharCode.apply(null, new Uint8Array(serializedTx)));
    return await this._call('sendTransaction', [base64Tx, { encoding: 'base64', preflightCommitment: 'confirmed' }]);
  }
  async confirmTransaction(signature) {
    for (let i = 0; i < 35; i++) {
      try {
        const result = await this._call('getSignatureStatuses', [[signature]]);
        const status = result?.value?.[0];
        if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') return { value: status };
        if (status?.err) throw new Error('Transaction failed: ' + JSON.stringify(status.err));
      } catch (e) { if (e.message.includes('Transaction failed')) throw e; }
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error('Transaction confirmation timeout - check explorer');
  }
  async getAccountInfo(pubkey) { return await this._call('getAccountInfo', [pubkey.toString(), { encoding: 'base64' }]); }
}

async function getEscrowSolanaConnection() {
  if (ESCROW_MODE === 'testnet') {
    const { Connection, clusterApiUrl } = await import('@solana/web3.js');
    return new Connection(clusterApiUrl('devnet'), 'confirmed');
  }
  return new ProxiedConnection(API_URL);
}

const CHAINS = {
  solana: { name: 'Solana', symbol: 'SOL', icon: '◎', gradient: 'from-purple-500 to-violet-600', explorerUrl: ESCROW_MODE === 'mainnet' ? 'https://solscan.io/tx/' : 'https://explorer.solana.com/tx/', walletField: 'solana', isEVM: false },
  ethereum: { name: 'Ethereum', symbol: 'ETH', icon: 'Ξ', gradient: 'from-blue-500 to-indigo-600', explorerUrl: ESCROW_MODE === 'mainnet' ? 'https://etherscan.io/tx/' : 'https://sepolia.etherscan.io/tx/', walletField: 'ethereum', isEVM: true },
  base: { name: 'Base', symbol: 'ETH', icon: '🔵', gradient: 'from-blue-400 to-blue-600', explorerUrl: ESCROW_MODE === 'mainnet' ? 'https://basescan.org/tx/' : 'https://sepolia.basescan.org/tx/', walletField: 'ethereum', isEVM: true },
  polygon: { name: 'Polygon', symbol: 'MATIC', icon: '⬡', gradient: 'from-purple-400 to-violet-600', explorerUrl: ESCROW_MODE === 'mainnet' ? 'https://polygonscan.com/tx/' : 'https://amoy.polygonscan.com/tx/', walletField: 'ethereum', isEVM: true },
  arbitrum: { name: 'Arbitrum', symbol: 'ETH', icon: '🔷', gradient: 'from-cyan-500 to-blue-600', explorerUrl: ESCROW_MODE === 'mainnet' ? 'https://arbiscan.io/tx/' : 'https://sepolia.arbiscan.io/tx/', walletField: 'ethereum', isEVM: true },
  bnb: { name: 'BNB', symbol: 'BNB', icon: '🟡', gradient: 'from-yellow-400 to-amber-500', explorerUrl: ESCROW_MODE === 'mainnet' ? 'https://bscscan.com/tx/' : 'https://testnet.bscscan.com/tx/', walletField: 'ethereum', isEVM: true }
};

function getEvmChains() { return ESCROW_MODE === 'mainnet' ? EVM_CHAINS : EVM_CHAINS_TESTNET; }
function getUsdcAddress(chain) { return (ESCROW_MODE === 'mainnet' ? USDC_ADDRESSES.mainnet : USDC_ADDRESSES.testnet)[chain]; }

const SuccessScreen = ({ escrow, feeDetails, txHash, chainConfig, selectedChain, navigate }) => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    const timer = setTimeout(() => {
      navigate('/dashboard/bookings');
    }, 5000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 max-w-md w-full border border-emerald-500/20 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Escrow Funded</h1>
        <p className="text-slate-400 mb-6">Your payment is securely held in escrow until the work is completed.</p>
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 text-left space-y-3">
          <div className="flex justify-between"><span className="text-slate-500 text-sm">Amount</span><span className="text-white font-semibold">{escrow?.amount} USDC</span></div>
          <div className="flex justify-between"><span className="text-slate-500 text-sm">Escrow Fee ({feeDetails?.feePercentageDisplay}%)</span><span className="text-amber-400">{feeDetails?.feeAmount?.toFixed(6)} USDC</span></div>
          <div className="flex justify-between"><span className="text-slate-500 text-sm">Total Paid</span><span className="text-cyan-400 font-semibold">{feeDetails?.totalAmount?.toFixed(6)} USDC</span></div>
          <div className="flex justify-between"><span className="text-slate-500 text-sm">Network</span><span className="text-white">{chainConfig?.name}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 text-sm">Seller</span><span className="text-white">{escrow?.sellerId?.username}</span></div>
        </div>
        {txHash && <a href={`${chainConfig?.explorerUrl}${txHash}${selectedChain === 'solana' && ESCROW_MODE === 'testnet' ? '?cluster=devnet' : ''}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm mb-6">View on Explorer <span>↗</span></a>}
        <button onClick={() => navigate('/dashboard/bookings')} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium rounded-xl transition-all">Back to Bookings</button>
        <p className="text-slate-500 text-xs mt-3">Redirecting in {countdown}s...</p>
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-center gap-2">
          <img src="/Aquadsnewlogo.png" alt="Aquads logo" className="h-4 w-auto opacity-60" />
          <span className="text-slate-600 text-xs">Secured by Aquads Escrow</span>
        </div>
      </div>
    </div>
  );
};

const CustodialPayment = ({ currentUser, showNotification }) => {
  const { escrowId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [escrow, setEscrow] = useState(null);
  const [selectedChain, setSelectedChain] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [txStatus, setTxStatus] = useState(null);
  const [txError, setTxError] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSolanaWalletModal, setShowSolanaWalletModal] = useState(false);
  const [wcProvider, setWcProvider] = useState(null);
  const [payerEmail, setPayerEmail] = useState('');

  const feePercentage = FEE_CONFIG.ESCROW_FEE_PERCENTAGE;

  const feeDetails = useMemo(() => {
    if (!escrow || !selectedChain) return null;
    const amountNum = escrow.amount || 0;
    if (amountNum <= 0) return null;
    const feeAmount = amountNum * feePercentage;
    const totalAmount = amountNum + feeAmount;
    return {
      recipientAmount: amountNum,
      feeAmount: parseFloat(feeAmount.toFixed(6)),
      totalAmount: parseFloat(totalAmount.toFixed(6)),
      feePercentageDisplay: (feePercentage * 100).toFixed(2),
      isEVM: CHAINS[selectedChain]?.isEVM || false
    };
  }, [escrow, selectedChain, feePercentage]);

  useEffect(() => {
    const fetchEscrow = async () => {
      if (!currentUser?.token) { setError('Please log in to make a payment'); setLoading(false); return; }
      try {
        const response = await axios.get(`${API_URL}/api/freelancer-escrow/${escrowId}`, {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        });
        if (response.data.success) {
          setEscrow(response.data.escrow);
          if (response.data.escrow.status !== 'awaiting_deposit') {
            setError('This escrow has already been funded or is no longer active');
          }
        }
      } catch (err) { setError(err.response?.data?.error || 'Escrow not found'); }
      finally { setLoading(false); }
    };
    if (escrowId) fetchEscrow();
  }, [escrowId, currentUser]);

  useEffect(() => {
    if (walletConnected) {
      if (wcProvider) { wcProvider.disconnect().catch(() => {}); setWcProvider(null); }
      setWalletConnected(false); setWalletAddress(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChain]);

  const chainConfig = selectedChain ? CHAINS[selectedChain] : null;
  const escrowWalletAddress = selectedChain === 'solana' ? SOLANA_ESCROW_WALLET : EVM_ESCROW_WALLET;

  const connectWithWallet = async (walletId) => {
    setShowWalletModal(false); setConnecting(true); setTxError(null);
    try {
      let accounts = [];
      const evmConfig = getEvmChains()[selectedChain];
      if (walletId === 'walletconnect') {
        const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
        const baseChainId = parseInt(evmConfig.chainId, 16);
        const provider = await EthereumProvider.init({
          projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'demo',
          chains: [baseChainId], showQrModal: true,
          methods: ['eth_sendTransaction', 'personal_sign'],
          events: ['chainChanged', 'accountsChanged'],
          metadata: { name: 'Aquads Escrow', description: 'Secure escrow payments', url: window.location.origin, icons: [`${window.location.origin}/logo192.png`] }
        });
        await provider.connect();
        accounts = provider.accounts; setWcProvider(provider);
        provider.on('disconnect', () => { setWalletConnected(false); setWalletAddress(null); setWcProvider(null); });
      } else {
        if (!window.ethereum) throw new Error('No browser wallet detected. Please install MetaMask or another Web3 wallet.');
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) throw new Error('No accounts found.');
        try { await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: evmConfig.chainId }] }); }
        catch (e) { if (e.code === 4902) await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [evmConfig] }); }
      }
      if (accounts.length > 0) { setWalletAddress(accounts[0]); setWalletConnected(true); }
    } catch (err) {
      const errMsg = err.message || '';
      if (err.code === 4001 || errMsg.includes('User rejected')) setTxError('Connection rejected. Please approve in your wallet.');
      else setTxError(err.message);
    } finally { setConnecting(false); }
  };

  const connectWithSolanaWallet = async (walletId) => {
    setShowSolanaWalletModal(false); setConnecting(true); setTxError(null);
    try {
      let provider = walletId === 'phantom' ? (window.phantom?.solana || window.solana) :
                     walletId === 'solflare' ? window.solflare : window.backpack;
      if (!provider) throw new Error(`${walletId} wallet not found. Please install it.`);
      const response = await provider.connect();
      setWalletAddress(response.publicKey.toString()); setWalletConnected(true);
    } catch (err) {
      if (err.message?.includes('User rejected')) setTxError('Connection rejected.');
      else setTxError(err.message);
    } finally { setConnecting(false); }
  };

  const connectWallet = () => {
    if (CHAINS[selectedChain]?.isEVM) setShowWalletModal(true);
    else if (selectedChain === 'solana') setShowSolanaWalletModal(true);
  };

  const sendDeposit = async () => {
    if (!escrow || !escrowWalletAddress) { setTxError('Escrow configuration error'); return; }
    setSending(true); setTxError(null); setTxStatus('pending');

    const amount = feeDetails.totalAmount;
    const token = 'USDC';

    try {
      if (CHAINS[selectedChain]?.isEVM) {
        const evmConfig = getEvmChains()[selectedChain];
        const ethProvider = wcProvider || window.ethereum;

        if (ethProvider && evmConfig) {
          try {
            const currentChainId = await ethProvider.request({ method: 'eth_chainId' });
            if (currentChainId !== evmConfig.chainId) {
              try { await ethProvider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: evmConfig.chainId }] }); }
              catch (switchError) { if (switchError.code === 4902) await ethProvider.request({ method: 'wallet_addEthereumChain', params: [evmConfig] }); }
            }
          } catch { /* user may manually switch */ }
        }

        const provider = new ethers.BrowserProvider(ethProvider);
        const signer = await provider.getSigner();
        const usdcAddr = getUsdcAddress(selectedChain);
        if (!usdcAddr) throw new Error('USDC not supported on this chain');

        const contract = new ethers.Contract(usdcAddr, ERC20_ABI, signer);
        const decimals = await contract.decimals();
        const amountUnits = ethers.parseUnits(amount.toFixed(6), decimals);

        setTxStatus('Signing deposit...');
        const tx = await contract.transfer(escrowWalletAddress, amountUnits);
        const hash = tx.hash;
        setTxHash(hash);
        setTxStatus('Confirming on blockchain...');
        const receipt = await tx.wait();

        if (receipt.status === 1) {
          setTxStatus('success');
          await recordDeposit(hash, token);
        } else {
          throw new Error('Deposit transaction failed');
        }
      } else if (selectedChain === 'solana') {
        const solana = window.phantom?.solana || window.solflare || window.solana;
        const { PublicKey, Transaction } = await import('@solana/web3.js');
        const connection = await getEscrowSolanaConnection();
        const { blockhash } = await connection.getLatestBlockhash();
        const fromPubkey = new PublicKey(walletAddress);
        const toPubkey = new PublicKey(escrowWalletAddress);

        let transaction = new Transaction();

        const { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
        const mint = new PublicKey(SOLANA_USDC_MINT);
        const fromATA = await getAssociatedTokenAddress(mint, fromPubkey);
        const toATA = await getAssociatedTokenAddress(mint, toPubkey);

        try {
          const acctInfo = await connection.getAccountInfo(toATA);
          if (!acctInfo) {
            transaction.add(createAssociatedTokenAccountInstruction(fromPubkey, toATA, toPubkey, mint));
          }
        } catch { transaction.add(createAssociatedTokenAccountInstruction(fromPubkey, toATA, toPubkey, mint)); }

        const amountUnits = Math.floor(amount * 1e6);
        transaction.add(createTransferInstruction(fromATA, toATA, fromPubkey, amountUnits));

        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;
        const signed = await solana.signTransaction(transaction);

        let sig;
        if (connection.sendRawTransaction) {
          sig = await connection.sendRawTransaction(signed.serialize());
        } else {
          sig = await connection.sendTransaction(signed, { skipPreflight: false, preflightCommitment: 'confirmed' });
        }
        setTxHash(sig);
        setTxStatus('Confirming on blockchain...');
        await connection.confirmTransaction(sig);
        setTxStatus('success');
        await recordDeposit(sig, token);
      }
    } catch (err) {
      setTxStatus('error');
      const errMsg = err.reason || err.message || '';
      if (errMsg.includes('User rejected') || err.code === 4001) setTxError('Transaction cancelled.');
      else if (errMsg.includes('insufficient')) setTxError('Insufficient balance. Check your wallet has enough funds.');
      else setTxError(errMsg);
    } finally { setSending(false); }
  };

  const recordDeposit = async (hash, token) => {
    try {
      const res = await axios.post(`${API_URL}/api/freelancer-escrow/deposit`, {
        escrowId: escrow._id,
        txHash: hash,
        chain: selectedChain,
        token,
        amount: feeDetails.totalAmount,
        senderAddress: walletAddress
      }, { headers: { Authorization: `Bearer ${currentUser.token}` } });

      // Fire receipt emails in background — never block payment flow
      const emailPayload = {
        recipientName: escrow?.sellerId?.username || 'Seller',
        amount: escrow?.amount,
        token: 'USDC',
        chain: selectedChain,
        senderAddress: walletAddress,
        txHash: hash,
        message: `Escrow payment for Invoice #${escrow?.invoiceId?.invoiceNumber || ''}`
      };

      if (escrow?.sellerId?.email) {
        emailService.sendAquaPayPaymentNotification(escrow.sellerId.email, emailPayload).catch(() => {});
      }
      if (payerEmail && payerEmail.trim()) {
        emailService.sendAquaPayReceipt(payerEmail.trim(), emailPayload).catch(() => {});
      }

      if (res.data?.verification && !res.data.verification.verified) {
        setTxStatus('success');
        setTxError('Deposit sent! Verification is pending — it may take a moment to confirm on-chain. You can retry from this page.');
      }
    } catch {
      setTxError('Deposit sent on-chain but server recording failed. The escrow will be verified when you proceed.');
    }
  };

  const availableChains = Object.entries(CHAINS).map(([id, c]) => ({ id, ...c }));

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <img src="/Aquadsnewlogo.png" alt="AQUADS" className="h-10 w-auto mx-auto mb-4" style={{ filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))' }} />
        <div className="w-8 h-8 mx-auto mb-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading escrow payment...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 max-w-sm w-full border border-slate-800 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center"><span className="text-3xl">🔍</span></div>
        <h1 className="text-xl font-semibold text-white mb-2">Payment Unavailable</h1>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <button onClick={() => navigate('/home')} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors">Go Home</button>
      </div>
    </div>
  );

  if (txStatus === 'success') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border border-emerald-500/20 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Escrow Funded</h1>
        <p className="text-slate-400 mb-6">Your payment is securely held in escrow until the work is completed.</p>
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 text-left space-y-3">
          <div className="flex justify-between"><span className="text-slate-500 text-sm">Amount</span><span className="text-white font-semibold">{escrow.amount} USDC</span></div>
          <div className="flex justify-between"><span className="text-slate-500 text-sm">Escrow Fee ({feeDetails?.feePercentageDisplay}%)</span><span className="text-amber-400">{feeDetails?.feeAmount?.toFixed(6)} USDC</span></div>
          <div className="flex justify-between"><span className="text-slate-500 text-sm">Total Paid</span><span className="text-cyan-400 font-semibold">{feeDetails?.totalAmount?.toFixed(6)} USDC</span></div>
          <div className="flex justify-between"><span className="text-slate-500 text-sm">Network</span><span className="text-white">{chainConfig?.name}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 text-sm">Seller</span><span className="text-white">{escrow.sellerId?.username}</span></div>
        </div>
        {txHash && <a href={`${chainConfig?.explorerUrl}${txHash}${selectedChain === 'solana' && ESCROW_MODE === 'testnet' ? '?cluster=devnet' : ''}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm mb-6">View on Explorer <span>↗</span></a>}
        <button onClick={() => navigate('/dashboard/bookings')} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium rounded-xl transition-all">Back to Bookings</button>
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center gap-2">
          <img src="/Aquadsnewlogo.png" alt="Aquads logo" className="h-4 w-auto opacity-60" />
          <span className="text-slate-600 text-xs">Secured by Aquads Escrow</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="https://aquads.xyz" className="flex items-center gap-2">
            <img src="/Aquadsnewlogo.png" alt="AQUADS" className="h-7 w-auto" style={{ filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' }} />
            <span className="text-slate-400 text-sm font-medium">Escrow Pay</span>
          </a>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-xs font-medium">Protected</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-full">
              <span className="text-slate-400 text-xs">🛡️ Escrow</span>
            </div>
            {ESCROW_MODE === 'testnet' && <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full"><span className="text-amber-400 text-xs font-bold">TESTNET</span></div>}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800/50 p-6">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-4">Escrow Payment</p>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={escrow?.sellerId?.image || 'https://i.imgur.com/6VBx3io.png'} alt="Seller" className="w-14 h-14 rounded-xl object-cover border-2 border-slate-700" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                </div>
                <div>
                  <h2 className="text-white font-semibold text-lg">{escrow?.sellerId?.username}</h2>
                  <p className="text-cyan-400 text-sm">Invoice #{escrow?.invoiceId?.invoiceNumber}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/50 space-y-2">
                <div className="flex justify-between"><span className="text-slate-500 text-sm">Amount</span><span className="text-white font-bold text-lg">{escrow?.amount} USDC</span></div>
              </div>
            </div>
            <div className="bg-slate-900/40 rounded-xl border border-slate-800/30 p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><div className="text-lg mb-1">🛡️</div><p className="text-slate-500 text-xs">Escrow<br/>protected</p></div>
                <div><div className="text-lg mb-1">⚡</div><p className="text-slate-500 text-xs">On-chain<br/>verified</p></div>
                <div><div className="text-lg mb-1">💎</div><p className="text-slate-500 text-xs">{(feePercentage * 100).toFixed(2)}%<br/>fee</p></div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800/50 overflow-hidden">
              <div className="p-6 border-b border-slate-800/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center"><span className="text-cyan-400 text-sm font-bold">1</span></div>
                  <h3 className="text-white font-medium">Select Network</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableChains.map(chain => (
                    <button key={chain.id} onClick={() => setSelectedChain(chain.id)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${selectedChain === chain.id ? 'bg-gradient-to-r ' + chain.gradient + ' text-white shadow-lg' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 border border-slate-700/50'}`}>
                      <span>{chain.icon}</span><span>{chain.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedChain && (
                <>
                  <div className="p-6 border-b border-slate-800/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center"><span className="text-cyan-400 text-sm font-bold">2</span></div>
                      <h3 className="text-white font-medium">Connect & Pay</h3>
                    </div>

                    {!walletConnected ? (
                      <div>
                        {txError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4"><p className="text-red-400 text-sm">{txError}</p></div>}
                        <button onClick={connectWallet} disabled={connecting}
                          className={`w-full py-4 bg-gradient-to-r ${chainConfig?.gradient} text-white font-semibold rounded-xl transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2`}>
                          {connecting ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connecting...</> : <><span className="text-xl">{chainConfig?.icon}</span> Connect Wallet</>}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-slate-300 text-sm font-mono">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
                          </div>
                          <button onClick={() => { setWalletConnected(false); setWalletAddress(null); }} className="text-slate-500 hover:text-red-400 text-xs">Disconnect</button>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                          <span className="text-slate-300 font-medium">💵 USDC</span>
                          <p className="text-slate-500 text-xs mt-1">Escrow deposits are in USDC</p>
                        </div>

                        {txError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3"><p className="text-red-400 text-sm">{txError}</p></div>}
                      </div>
                    )}
                  </div>

                  {walletConnected && feeDetails && (
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center"><span className="text-cyan-400 text-sm font-bold">3</span></div>
                        <h3 className="text-white font-medium">Review & Deposit</h3>
                      </div>

                      <div className="bg-slate-800/30 rounded-xl p-4 mb-4 space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Escrow Amount</span><span className="text-white font-semibold">{escrow.amount} USDC</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Network</span><span className="text-white">{chainConfig?.name}</span></div>
                        <div className="border-t border-slate-700/50 pt-2 mt-2 space-y-2">
                          <div className="flex justify-between text-sm"><span className="text-slate-500">Platform Fee ({feeDetails.feePercentageDisplay}%)</span><span className="text-amber-400">{feeDetails.feeAmount.toFixed(6)} USDC</span></div>
                          <div className="flex justify-between text-sm font-semibold"><span className="text-slate-400">You Pay</span><span className="text-cyan-400">{feeDetails.totalAmount.toFixed(6)} USDC</span></div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-slate-400 text-sm mb-2">Email for receipt (optional)</label>
                        <input type="email" value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} placeholder="your@email.com"
                          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 focus:border-cyan-500 rounded-xl text-white text-sm focus:outline-none transition-colors" />
                      </div>

                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4">
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-400 text-sm">🛡️</span>
                          <div>
                            <p className="text-emerald-300 text-sm font-medium">Escrow Protected</p>
                            <p className="text-emerald-400/70 text-xs mt-1">Funds are held securely until you approve the completed work. Seller cannot access funds without your approval.</p>
                          </div>
                        </div>
                      </div>

                      {sending && (
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="relative"><div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-4 h-4 bg-cyan-400 rounded-full animate-pulse" /></div></div>
                            <div className="flex-1">
                              <p className="text-white font-medium">{typeof txStatus === 'string' && txStatus !== 'pending' ? txStatus : 'Processing deposit...'}</p>
                              <p className="text-slate-400 text-xs mt-0.5">Please approve in your wallet</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <button onClick={sendDeposit} disabled={sending}
                        className={`w-full py-4 bg-gradient-to-r ${chainConfig?.gradient} text-white font-bold rounded-xl transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg`}>
                        {sending ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</> : <>🛡️ Deposit {feeDetails.totalAmount.toFixed(6)} USDC to Escrow</>}
                      </button>
                      <p className="text-slate-600 text-xs text-center mt-3">{sending ? 'Do not close this page while transaction is processing.' : 'Funds are held in escrow until you approve the completed work.'}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/50 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src="/Aquadsnewlogo.png" alt="Aquads logo" className="h-5 w-auto opacity-50" />
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <a href="https://aquads.xyz" className="hover:text-cyan-400 transition-colors">Aquads.xyz</a>
                <span>•</span>
                <a href="https://aquads.xyz/marketplace" className="hover:text-cyan-400 transition-colors">Marketplace</a>
              </div>
            </div>
            <p className="text-slate-700 text-xs">© {new Date().getFullYear()} Aquads • Escrow Protected</p>
          </div>
        </div>
      </footer>

      {showWalletModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-800">
            <div className="flex justify-between items-center mb-5"><h3 className="text-lg font-semibold text-white">Connect Wallet</h3><button onClick={() => setShowWalletModal(false)} className="text-slate-500 hover:text-white">✕</button></div>
            <div className="space-y-2">
              {EVM_WALLET_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => connectWithWallet(opt.id)} className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl flex items-center gap-3 border border-slate-700/50 transition-colors relative">
                  {opt.recommended && <span className="absolute -top-2 right-2 px-2 py-0.5 bg-cyan-500 text-white text-xs rounded-full">Popular</span>}
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="text-left"><p className="text-white font-medium">{opt.name}</p><p className="text-slate-500 text-xs">{opt.description}</p></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSolanaWalletModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-800">
            <div className="flex justify-between items-center mb-5"><h3 className="text-lg font-semibold text-white">Connect Solana</h3><button onClick={() => setShowSolanaWalletModal(false)} className="text-slate-500 hover:text-white">✕</button></div>
            <div className="space-y-2">
              {SOLANA_WALLET_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => connectWithSolanaWallet(opt.id)} className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl flex items-center gap-3 border border-slate-700/50 transition-colors relative">
                  {opt.recommended && <span className="absolute -top-2 right-2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">Popular</span>}
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="text-left"><p className="text-white font-medium">{opt.name}</p><p className="text-slate-500 text-xs">{opt.description}</p></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustodialPayment;
