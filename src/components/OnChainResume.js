import React, { useState, useEffect, useCallback } from 'react';
import { FaLink, FaExternalLinkAlt, FaWallet, FaSync, FaCheckCircle, FaCopy, FaTimes } from 'react-icons/fa';
import { ethers } from 'ethers';
import { API_URL } from '../services/api';

const EAS_CONTRACT_ADDRESS = '0x4200000000000000000000000000000000000021';
const SCHEMA_UID = process.env.REACT_APP_EAS_SCHEMA_UID;
const BASE_CHAIN_ID = 8453;

// EAS Contract ABI (minimal for attestation)
const EAS_ABI = [
  'function attest((bytes32 schema, (address recipient, uint64 expirationTime, bool revocable, bytes32 refUID, bytes data, uint256 value) data)) external payable returns (bytes32)',
  'function getAttestation(bytes32 uid) external view returns ((bytes32 uid, bytes32 schema, uint64 time, uint64 expirationTime, uint64 revocationTime, bytes32 refUID, address recipient, address attester, bool revocable, bytes data))'
];

// Schema types for encoding
const SCHEMA_TYPES = [
  'uint8',   // trustScore
  'uint8',   // ratingScore
  'uint8',   // completionScore
  'uint8',   // profileScore
  'uint8',   // verificationScore
  'uint8',   // badgeScore
  'uint8',   // avgRating
  'uint16',  // totalReviews
  'uint16',  // completedJobs
  'uint8',   // completionRate
  'string',  // skillBadges
  'uint8',   // badgeCount
  'bool',    // hasVerifiedCV
  'bool',    // isFreelancer
  'bool',    // isPremium
  'uint64',  // memberSince
  'uint64',  // lastUpdated
  'string',  // username
  'bytes32'  // aquadsId
];

// Wallet options for selection
const WALLET_OPTIONS = [
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '🔗',
    description: 'MetaMask, Coinbase, Rainbow & 300+ wallets'
  },
  {
    id: 'injected',
    name: 'Browser Wallet',
    icon: '🌐',
    description: 'Use detected browser extension'
  }
];

// Detect which wallets are available
const detectAvailableWallets = () => {
  const wallets = {
    metamask: false,
    coinbase: false,
    injected: false,
    detectedName: null
  };

  if (typeof window !== 'undefined' && window.ethereum) {
    wallets.injected = true;
    
    if (window.ethereum.isMetaMask) {
      wallets.metamask = true;
      wallets.detectedName = 'MetaMask';
    }
    if (window.ethereum.isCoinbaseWallet) {
      wallets.coinbase = true;
      wallets.detectedName = 'Coinbase Wallet';
    }
    if (window.ethereum.isBraveWallet) {
      wallets.detectedName = 'Brave Wallet';
    }
    if (window.ethereum.isRabby) {
      wallets.detectedName = 'Rabby';
    }
    if (window.ethereum.isTrust) {
      wallets.detectedName = 'Trust Wallet';
    }
    
    // If no specific wallet detected but ethereum exists
    if (!wallets.detectedName && wallets.injected) {
      wallets.detectedName = 'Browser Wallet';
    }
  }

  return wallets;
};

const OnChainResume = ({ currentUser, showNotification }) => {
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletProvider, setWalletProvider] = useState(null);
  const [walletType, setWalletType] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [availableWallets, setAvailableWallets] = useState({ injected: false });
  const [mintSuccess, setMintSuccess] = useState(null); // Stores success data after minting

  // Detect available wallets on mount
  useEffect(() => {
    setAvailableWallets(detectAvailableWallets());
  }, []);

  // Fetch resume preparation data
  const fetchResumeData = useCallback(async () => {
    try {
      setLoading(true);
      const token = currentUser?.token;
      if (!token) return;

      const response = await fetch(`${API_URL}/on-chain-resume/prepare`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setResumeData(data);
      }
    } catch (error) {
      console.error('Error fetching resume data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchResumeData();
  }, [fetchResumeData]);

  // Check if wallet is already connected
  useEffect(() => {
    const checkWallet = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setWalletConnected(true);
            setWalletAddress(accounts[0]);
            setWalletProvider(window.ethereum);
            setWalletType(availableWallets.detectedName || 'Browser Wallet');
          }
        } catch (err) {
          console.error('Error checking wallet:', err);
        }
      }
    };
    checkWallet();
  }, [availableWallets.detectedName]);

  // Switch to Base network
  const switchToBase = async (provider) => {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }] // 8453 in hex
      });
      return true;
    } catch (switchError) {
      // If Base not added, add it
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org']
            }]
          });
          return true;
        } catch (addError) {
          console.error('Error adding Base network:', addError);
          return false;
        }
      }
      console.error('Error switching network:', switchError);
      return false;
    }
  };

  // Connect with specific wallet
  const connectWithWallet = async (walletId) => {
    setShowWalletModal(false);
    setConnecting(true);
    
    try {
      let provider = null;
      let accounts = [];

      switch (walletId) {
        case 'walletconnect':
          try {
            // Dynamically import WalletConnect to avoid affecting other features
            const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
            
            const wcProvider = await EthereumProvider.init({
              projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'demo',
              chains: [BASE_CHAIN_ID],
              showQrModal: true,
              methods: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData'],
              events: ['chainChanged', 'accountsChanged'],
              metadata: {
                name: 'Aquads On-Chain Resume',
                description: 'Mint your verified freelancer credentials on Base',
                url: window.location.origin,
                icons: [`${window.location.origin}/logo192.png`]
              },
              qrModalOptions: {
                themeMode: 'dark'
              }
            });
            
            // Force WalletConnect modal to appear on top
            const forceModalOnTop = () => {
              // Target all possible WalletConnect modal elements
              const wcModals = document.querySelectorAll('wcm-modal, w3m-modal, [class*="walletconnect"], [id*="walletconnect"]');
              wcModals.forEach(modal => {
                modal.style.cssText = 'z-index: 2147483647 !important; position: fixed !important;';
                // Also check for shadow root
                if (modal.shadowRoot) {
                  const overlay = modal.shadowRoot.querySelector('.wcm-overlay, .w3m-overlay, [class*="overlay"]');
                  const container = modal.shadowRoot.querySelector('.wcm-container, .w3m-container, [class*="container"]');
                  if (overlay) overlay.style.cssText = 'z-index: 2147483646 !important;';
                  if (container) container.style.cssText = 'z-index: 2147483647 !important;';
                }
              });
              
              // Also force any modal-like divs at body level
              const bodyModals = document.body.querySelectorAll(':scope > div[style*="position: fixed"], :scope > div[class*="modal"]');
              bodyModals.forEach(modal => {
                if (modal.innerHTML.includes('walletconnect') || modal.innerHTML.includes('WalletConnect') || modal.querySelector('canvas')) {
                  modal.style.cssText = 'z-index: 2147483647 !important;';
                }
              });
            };
            
            // Use MutationObserver to catch modal when it's added to DOM
            const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                  if (node.nodeType === 1) { // Element node
                    const tagName = node.tagName?.toLowerCase() || '';
                    if (tagName.includes('wcm') || tagName.includes('w3m') || 
                        node.className?.includes?.('walletconnect') || 
                        node.id?.includes?.('walletconnect')) {
                      forceModalOnTop();
                    }
                  }
                });
              });
            });
            
            observer.observe(document.body, { childList: true, subtree: true });
            
            // Also run on timeouts as backup
            setTimeout(forceModalOnTop, 100);
            setTimeout(forceModalOnTop, 300);
            setTimeout(forceModalOnTop, 500);
            setTimeout(forceModalOnTop, 1000);
            
            // Cleanup observer after connection attempt
            const cleanupObserver = () => observer.disconnect();
            
            await wcProvider.connect();
            cleanupObserver(); // Cleanup MutationObserver after successful connection
            accounts = wcProvider.accounts;
            provider = wcProvider;
            
            // Listen for disconnect
            wcProvider.on('disconnect', () => {
              setWalletConnected(false);
              setWalletAddress(null);
              setWalletProvider(null);
              setWalletType(null);
              showNotification('Wallet disconnected', 'info');
            });
          } catch (wcError) {
            cleanupObserver(); // Cleanup on error too
            console.error('WalletConnect error:', wcError);
            if (wcError.message?.includes('User rejected') || wcError.message?.includes('cancelled')) {
              showNotification('Connection cancelled', 'info');
            } else {
              showNotification('WalletConnect connection failed', 'error');
            }
            setConnecting(false);
            return;
          }
          break;

        case 'injected':
        default:
          if (!window.ethereum) {
            showNotification('No wallet detected. Please install a Web3 wallet.', 'error');
            setConnecting(false);
            return;
          }
          provider = window.ethereum;
          accounts = await provider.request({ method: 'eth_requestAccounts' });
          break;
      }

      if (!accounts || accounts.length === 0) {
        showNotification('No accounts found. Please unlock your wallet.', 'error');
        setConnecting(false);
        return;
      }

      // Store provider reference
      setWalletProvider(provider);

      // Check and switch to Base network (except for WalletConnect which we set to Base already)
      if (walletId !== 'walletconnect') {
        const chainId = await provider.request({ method: 'eth_chainId' });
        if (parseInt(chainId, 16) !== BASE_CHAIN_ID) {
          const switched = await switchToBase(provider);
          if (!switched) {
            showNotification('Please switch to Base network manually', 'warning');
          }
        }
      }

      setWalletConnected(true);
      setWalletAddress(accounts[0]);
      setWalletType(
        walletId === 'walletconnect' ? 'WalletConnect' :
        availableWallets.detectedName || 'Browser Wallet'
      );

      showNotification(`Connected with ${walletId === 'walletconnect' ? 'WalletConnect' : accounts[0].slice(0, 6) + '...' + accounts[0].slice(-4)}`, 'success');

    } catch (error) {
      console.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        showNotification('Connection rejected by user', 'error');
      } else {
        showNotification('Failed to connect wallet', 'error');
      }
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = async () => {
    // If WalletConnect, disconnect properly
    if (walletProvider?.disconnect) {
      try {
        await walletProvider.disconnect();
      } catch (e) {
        console.error('Error disconnecting:', e);
      }
    }
    
    setWalletConnected(false);
    setWalletAddress(null);
    setWalletProvider(null);
    setWalletType(null);
    showNotification('Wallet disconnected', 'info');
  };

  // Mint on-chain resume
  const mintResume = async () => {
    if (!walletConnected || !resumeData) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    if (!SCHEMA_UID) {
      showNotification('Schema not configured. Please contact support.', 'error');
      return;
    }

    const provider = walletProvider || window.ethereum;
    if (!provider) {
      showNotification('Wallet not available. Please reconnect.', 'error');
      return;
    }

    setMinting(true);

    try {
      // Initialize ethers provider
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      
      // Create EAS contract instance
      const easContract = new ethers.Contract(EAS_CONTRACT_ADDRESS, EAS_ABI, signer);

      // Encode the attestation data using ethers ABI encoder
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const encodedData = abiCoder.encode(SCHEMA_TYPES, [
        resumeData.attestationData.trustScore,
        resumeData.attestationData.ratingScore,
        resumeData.attestationData.completionScore,
        resumeData.attestationData.profileScore,
        resumeData.attestationData.verificationScore,
        resumeData.attestationData.badgeScore,
        resumeData.attestationData.avgRating,
        resumeData.attestationData.totalReviews,
        resumeData.attestationData.completedJobs,
        resumeData.attestationData.completionRate,
        resumeData.attestationData.skillBadges,
        resumeData.attestationData.badgeCount,
        resumeData.attestationData.hasVerifiedCV,
        resumeData.attestationData.isFreelancer,
        resumeData.attestationData.isPremium,
        BigInt(resumeData.attestationData.memberSince),
        BigInt(resumeData.attestationData.lastUpdated),
        resumeData.attestationData.username,
        resumeData.attestationData.aquadsId
      ]);

      showNotification('Please confirm the transaction in your wallet...', 'info');

      // Create the attestation request struct
      const attestationRequest = {
        schema: SCHEMA_UID,
        data: {
          recipient: walletAddress,
          expirationTime: 0n, // No expiration
          revocable: true,
          refUID: ethers.ZeroHash, // No reference
          data: encodedData,
          value: 0n // No value
        }
      };

      // Send the attestation transaction
      const tx = await easContract.attest(attestationRequest);

      showNotification('Transaction submitted! Waiting for confirmation...', 'info');

      // Wait for the transaction
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);

      // Get the attestation UID from the event logs
      // EAS emits Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaId)
      let attestationUID = null;
      
      // Method 1: Look for Attested event
      const attestedEventSignature = ethers.id('Attested(address,address,bytes32,bytes32)');
      for (const log of receipt.logs) {
        console.log('Log:', log.topics[0]);
        if (log.topics[0] === attestedEventSignature) {
          // The UID is the 3rd topic (index 2) or in the data
          attestationUID = log.topics[2] || log.data;
          console.log('Found attestation UID from event:', attestationUID);
          break;
        }
      }
      
      // Method 2: If not found, try to decode the return value or use first log
      if (!attestationUID && receipt.logs.length > 0) {
        // The attest function returns bytes32, which might be in the first log's data
        const firstLog = receipt.logs[0];
        if (firstLog.data && firstLog.data !== '0x') {
          attestationUID = firstLog.data.slice(0, 66); // First 32 bytes
        } else if (firstLog.topics.length > 1) {
          attestationUID = firstLog.topics[1];
        }
        console.log('Fallback attestation UID:', attestationUID);
      }

      // Method 3: If still not found, construct from tx hash (less ideal but works)
      if (!attestationUID) {
        console.warn('Could not extract UID from logs, using tx hash as reference');
        attestationUID = receipt.hash;
      }

      console.log('Final attestation UID:', attestationUID);
      console.log('Transaction hash:', receipt.hash);

      // Save to backend
      const saveResponse = await fetch(`${API_URL}/on-chain-resume/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          uid: attestationUID,
          txHash: receipt.hash,
          walletAddress: walletAddress,
          score: resumeData.attestationData.trustScore,
          badgeCount: resumeData.attestationData.badgeCount
        })
      });

      console.log('Save response status:', saveResponse.status);
      const saveResult = await saveResponse.json();
      console.log('Save result:', saveResult);

      if (saveResponse.ok) {
        // Set success state with all the relevant data
        setMintSuccess({
          uid: attestationUID,
          txHash: receipt.hash,
          explorerUrl: `https://base.easscan.org/attestation/view/${attestationUID}`,
          basescanUrl: `https://basescan.org/tx/${receipt.hash}`,
          resumeUrl: `${window.location.origin}/resume/${currentUser.username}`,
          score: resumeData.attestationData.trustScore
        });
        
        showNotification('🎉 On-Chain Resume minted successfully!', 'success');
        
        // Refresh data to update the UI
        await fetchResumeData();
      } else {
        console.error('Save failed:', saveResult);
        // Still show success since the blockchain tx worked, but warn about backend
        setMintSuccess({
          uid: attestationUID,
          txHash: receipt.hash,
          explorerUrl: `https://base.easscan.org/attestation/view/${attestationUID}`,
          basescanUrl: `https://basescan.org/tx/${receipt.hash}`,
          resumeUrl: `${window.location.origin}/resume/${currentUser.username}`,
          score: resumeData.attestationData.trustScore,
          warning: 'Minted on blockchain but failed to save to Aquads. Your resume is still valid on-chain.'
        });
        showNotification(`Resume minted on-chain! Backend save issue: ${saveResult.error || 'Unknown error'}`, 'warning');
      }

    } catch (error) {
      console.error('Error minting resume:', error);
      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        showNotification('Transaction cancelled by user', 'error');
      } else {
        showNotification(`Minting failed: ${error.message || 'Unknown error'}`, 'error');
      }
    } finally {
      setMinting(false);
    }
  };

  // Copy resume link
  const copyResumeLink = () => {
    const link = `${window.location.origin}/resume/${currentUser?.username}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showNotification('Resume link copied!', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!resumeData) {
    return (
      <div className="text-center py-8 text-gray-400">
        Unable to load resume data. Please try again.
      </div>
    );
  }

  const hasExistingResume = resumeData.existing?.uid;

  return (
    <div className="space-y-6">
      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999999999] p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Select Wallet</h3>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="space-y-2">
              {WALLET_OPTIONS.map((wallet) => {
                // Determine if wallet is available
                const isAvailable = 
                  wallet.id === 'walletconnect' ? true :
                  wallet.id === 'injected' ? availableWallets.injected :
                  false;

                return (
                  <button
                    key={wallet.id}
                    onClick={() => connectWithWallet(wallet.id)}
                    disabled={connecting || (wallet.id === 'injected' && !isAvailable)}
                    className={`w-full p-4 rounded-lg border transition-all flex items-center gap-4 ${
                      isAvailable
                        ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-700/50'
                        : 'border-gray-700 opacity-50 cursor-not-allowed'
                    } ${connecting ? 'cursor-wait' : ''}`}
                  >
                    <span className="text-2xl">{wallet.icon}</span>
                    <div className="text-left flex-1">
                      <div className="font-medium">{wallet.name}</div>
                      <div className="text-xs text-gray-400">
                        {wallet.id === 'injected' && availableWallets.detectedName
                          ? `Detected: ${availableWallets.detectedName}`
                          : wallet.id === 'injected' && !isAvailable
                          ? 'No browser wallet detected'
                          : wallet.description}
                      </div>
                    </div>
                    {wallet.id === 'injected' && availableWallets.injected && (
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">Detected</span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Your wallet will be used to sign the attestation on Base network
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6 border border-blue-500/30">
        <div className="flex items-center gap-3 mb-2">
          <FaLink className="text-2xl text-blue-400" />
          <h3 className="text-xl font-bold">On-Chain Resume</h3>
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">
            Powered by Base
          </span>
        </div>
        <p className="text-gray-400 text-sm">
          Mint your verified freelancer credentials on the blockchain. Your trust score, skill badges, and work history - permanently verifiable.
        </p>
      </div>

      {/* Trust Score Preview */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          📊 Your Trust Score
          {hasExistingResume && (
            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
              <FaCheckCircle className="text-xs" /> Verified On-Chain
            </span>
          )}
        </h4>

        {/* Main Score Display */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-8 border-gray-700 flex items-center justify-center"
              style={{
                background: `conic-gradient(
                  ${resumeData.preview.trustScore >= 80 ? '#22c55e' : resumeData.preview.trustScore >= 60 ? '#eab308' : '#ef4444'} ${resumeData.preview.trustScore * 3.6}deg,
                  #374151 ${resumeData.preview.trustScore * 3.6}deg
                )`
              }}>
              <div className="w-24 h-24 rounded-full bg-gray-900 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{resumeData.preview.trustScore}</span>
                <span className="text-xs text-gray-400">/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Rating */}
          <div className="bg-gray-700/30 rounded-lg p-3 text-center">
            <div className="text-yellow-400 text-lg">⭐</div>
            <div className="text-lg font-semibold">{resumeData.preview.breakdown.rating.score}/{resumeData.preview.breakdown.rating.max}</div>
            <div className="text-xs text-gray-400">Rating</div>
            <div className="text-xs text-gray-500">{resumeData.preview.breakdown.rating.value} ({resumeData.preview.breakdown.rating.reviews})</div>
          </div>

          {/* Completion */}
          <div className="bg-gray-700/30 rounded-lg p-3 text-center">
            <div className="text-green-400 text-lg">✅</div>
            <div className="text-lg font-semibold">{resumeData.preview.breakdown.completion.score}/{resumeData.preview.breakdown.completion.max}</div>
            <div className="text-xs text-gray-400">Completion</div>
            <div className="text-xs text-gray-500">{resumeData.preview.breakdown.completion.rate}</div>
          </div>

          {/* Profile */}
          <div className="bg-gray-700/30 rounded-lg p-3 text-center">
            <div className="text-blue-400 text-lg">📋</div>
            <div className="text-lg font-semibold">{resumeData.preview.breakdown.profile.score}/{resumeData.preview.breakdown.profile.max}</div>
            <div className="text-xs text-gray-400">Profile</div>
            <div className="text-xs text-gray-500">{resumeData.preview.breakdown.profile.status}</div>
          </div>

          {/* Verification */}
          <div className="bg-gray-700/30 rounded-lg p-3 text-center">
            <div className="text-purple-400 text-lg">✓</div>
            <div className="text-lg font-semibold">{resumeData.preview.breakdown.verification.score}/{resumeData.preview.breakdown.verification.max}</div>
            <div className="text-xs text-gray-400">Verified</div>
            <div className="text-xs text-gray-500">{resumeData.preview.breakdown.verification.type}</div>
          </div>

          {/* Badges */}
          <div className="bg-gray-700/30 rounded-lg p-3 text-center">
            <div className="text-orange-400 text-lg">🎖️</div>
            <div className="text-lg font-semibold">{resumeData.preview.breakdown.badges.score}/{resumeData.preview.breakdown.badges.max}</div>
            <div className="text-xs text-gray-400">Badges</div>
            <div className="text-xs text-gray-500">{resumeData.preview.breakdown.badges.count} earned</div>
          </div>
        </div>

        {/* Skill Badges */}
        {resumeData.preview.breakdown.badges.names.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <div className="text-sm text-gray-400 mb-2">Skill Badges:</div>
            <div className="flex flex-wrap gap-2">
              {resumeData.preview.breakdown.badges.names.map((badge, idx) => (
                <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 pt-4 border-t border-gray-700/50 flex gap-4 text-sm text-gray-400">
          <span>📈 {resumeData.preview.stats.completedJobs} jobs completed</span>
          <span>👤 Member since {resumeData.preview.stats.memberSince}</span>
        </div>
      </div>

      {/* Mint Success - Shows immediately after minting */}
      {mintSuccess && (
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl p-6 border border-green-500/50 animate-pulse-once">
          <div className="text-center mb-4">
            <div className="text-5xl mb-2">🎉</div>
            <h4 className="text-xl font-bold text-green-400">Resume Minted Successfully!</h4>
            <p className="text-gray-400 mt-1">Your credentials are now permanently verified on Base blockchain</p>
            {mintSuccess.warning && (
              <p className="text-yellow-400 text-sm mt-2">{mintSuccess.warning}</p>
            )}
          </div>
          
          {/* Share Links */}
          <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">📤 Share Your Resume</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={mintSuccess.resumeUrl}
                  className="flex-1 bg-gray-800 rounded px-3 py-2 text-sm text-white border border-gray-700"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(mintSuccess.resumeUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    showNotification('Resume link copied!', 'success');
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 pt-2">
              <a
                href={mintSuccess.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-center font-medium transition-colors flex items-center justify-center gap-2"
              >
                <FaExternalLinkAlt className="text-sm" /> View Resume Page
              </a>
              <a
                href={mintSuccess.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-center font-medium transition-colors flex items-center justify-center gap-2"
              >
                <FaLink className="text-sm" /> View on EAS
              </a>
              <a
                href={mintSuccess.basescanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-center font-medium transition-colors flex items-center justify-center gap-2"
              >
                <FaExternalLinkAlt className="text-sm" /> View TX
              </a>
            </div>
          </div>
          
          <button
            onClick={() => setMintSuccess(null)}
            className="w-full mt-4 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Existing Resume Info */}
      {hasExistingResume && !mintSuccess && (
        <div className="bg-green-900/20 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-green-400 flex items-center gap-2">
                <FaCheckCircle /> On-Chain Resume Active
              </h4>
              <p className="text-sm text-gray-400 mt-1">
                Last minted: {new Date(resumeData.existing.mintedAt).toLocaleDateString()}
                {' '}• Verified score: {resumeData.existing.score}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyResumeLink}
                className="p-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                title="Copy resume link"
              >
                {copied ? <FaCheckCircle className="text-green-400" /> : <FaCopy />}
              </button>
              <a
                href={`https://base.easscan.org/attestation/view/${resumeData.existing.uid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                title="View on EAS Explorer"
              >
                <FaExternalLinkAlt />
              </a>
            </div>
          </div>

          {/* Update Prompt */}
          {resumeData.shouldUpdate && (
            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-300">
                ⚡ Your score has changed by {Math.abs(resumeData.scoreDifference)} points since last mint.
                Consider updating your on-chain resume!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Wallet Connection & Mint */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        {!walletConnected ? (
          <div className="text-center">
            <FaWallet className="text-4xl text-gray-600 mx-auto mb-4" />
            <h4 className="font-semibold mb-2">Connect Your Wallet</h4>
            <p className="text-sm text-gray-400 mb-4">
              Connect a Web3 wallet to mint your on-chain resume on Base.
            </p>
            <button
              onClick={() => setShowWalletModal(true)}
              disabled={connecting}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-semibold transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <FaSync className="animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <FaWallet /> Connect Wallet
                </>
              )}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-400">
                  {walletType}: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                  Base Network
                </span>
                <button
                  onClick={disconnectWallet}
                  className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>

            <button
              onClick={mintResume}
              disabled={minting}
              className={`w-full py-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                minting
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
              }`}
            >
              {minting ? (
                <>
                  <FaSync className="animate-spin" />
                  Minting...
                </>
              ) : hasExistingResume ? (
                <>
                  <FaSync /> Update On-Chain Resume
                </>
              ) : (
                <>
                  <FaLink /> Mint On-Chain Resume
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-3">
              Estimated cost: ~$0.01 on Base • Takes ~10 seconds
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-gray-800/30 rounded-lg p-4 text-sm text-gray-400">
        <h5 className="font-semibold text-gray-300 mb-2">ℹ️ What is an On-Chain Resume?</h5>
        <ul className="list-disc list-inside space-y-1">
          <li>Your verified credentials stored permanently on Base blockchain</li>
          <li>Tamper-proof - no one can fake your trust score</li>
          <li>Portable - share with anyone, works across platforms</li>
          <li>You own it - not controlled by any company</li>
        </ul>
      </div>
    </div>
  );
};

export default OnChainResume;
