import React, { useState, useEffect, useCallback } from 'react';
import { FaLink, FaExternalLinkAlt, FaWallet, FaSync, FaCheckCircle, FaCopy, FaQrcode } from 'react-icons/fa';
import { EAS, SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';
import { BrowserProvider } from 'ethers';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const EAS_CONTRACT_ADDRESS = '0x4200000000000000000000000000000000000021';
const SCHEMA_UID = process.env.REACT_APP_EAS_SCHEMA_UID;
const BASE_CHAIN_ID = 8453;

// Schema encoder for Aquads Resume
const SCHEMA_STRING = 'uint8 trustScore,uint8 ratingScore,uint8 completionScore,uint8 profileScore,uint8 verificationScore,uint8 badgeScore,uint8 avgRating,uint16 totalReviews,uint16 completedJobs,uint8 completionRate,string skillBadges,uint8 badgeCount,bool hasVerifiedCV,bool isFreelancer,bool isPremium,uint64 memberSince,uint64 lastUpdated,string username,bytes32 aquadsId';

const OnChainResume = ({ currentUser, showNotification }) => {
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

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
          }
        } catch (err) {
          console.error('Error checking wallet:', err);
        }
      }
    };
    checkWallet();
  }, []);

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      showNotification('Please install MetaMask or another Web3 wallet', 'error');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletConnected(true);
      setWalletAddress(accounts[0]);

      // Check if on Base network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (parseInt(chainId, 16) !== BASE_CHAIN_ID) {
        // Try to switch to Base
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }] // 8453 in hex
          });
        } catch (switchError) {
          // If Base not added, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x2105',
                chainName: 'Base',
                nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://mainnet.base.org'],
                blockExplorerUrls: ['https://basescan.org']
              }]
            });
          }
        }
      }

      showNotification('Wallet connected successfully!', 'success');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      showNotification('Failed to connect wallet', 'error');
    }
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

    setMinting(true);

    try {
      // Initialize provider and EAS
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const eas = new EAS(EAS_CONTRACT_ADDRESS);
      eas.connect(signer);

      // Encode the attestation data
      const schemaEncoder = new SchemaEncoder(SCHEMA_STRING);
      const encodedData = schemaEncoder.encodeData([
        { name: 'trustScore', value: resumeData.attestationData.trustScore, type: 'uint8' },
        { name: 'ratingScore', value: resumeData.attestationData.ratingScore, type: 'uint8' },
        { name: 'completionScore', value: resumeData.attestationData.completionScore, type: 'uint8' },
        { name: 'profileScore', value: resumeData.attestationData.profileScore, type: 'uint8' },
        { name: 'verificationScore', value: resumeData.attestationData.verificationScore, type: 'uint8' },
        { name: 'badgeScore', value: resumeData.attestationData.badgeScore, type: 'uint8' },
        { name: 'avgRating', value: resumeData.attestationData.avgRating, type: 'uint8' },
        { name: 'totalReviews', value: resumeData.attestationData.totalReviews, type: 'uint16' },
        { name: 'completedJobs', value: resumeData.attestationData.completedJobs, type: 'uint16' },
        { name: 'completionRate', value: resumeData.attestationData.completionRate, type: 'uint8' },
        { name: 'skillBadges', value: resumeData.attestationData.skillBadges, type: 'string' },
        { name: 'badgeCount', value: resumeData.attestationData.badgeCount, type: 'uint8' },
        { name: 'hasVerifiedCV', value: resumeData.attestationData.hasVerifiedCV, type: 'bool' },
        { name: 'isFreelancer', value: resumeData.attestationData.isFreelancer, type: 'bool' },
        { name: 'isPremium', value: resumeData.attestationData.isPremium, type: 'bool' },
        { name: 'memberSince', value: BigInt(resumeData.attestationData.memberSince), type: 'uint64' },
        { name: 'lastUpdated', value: BigInt(resumeData.attestationData.lastUpdated), type: 'uint64' },
        { name: 'username', value: resumeData.attestationData.username, type: 'string' },
        { name: 'aquadsId', value: resumeData.attestationData.aquadsId, type: 'bytes32' }
      ]);

      showNotification('Please confirm the transaction in your wallet...', 'info');

      // Create the attestation
      const tx = await eas.attest({
        schema: SCHEMA_UID,
        data: {
          recipient: walletAddress,
          expirationTime: 0n, // No expiration
          revocable: true,
          data: encodedData
        }
      });

      showNotification('Transaction submitted! Waiting for confirmation...', 'info');

      // Wait for the transaction
      const attestationUID = await tx.wait();

      // Get transaction hash
      const receipt = await provider.getTransactionReceipt(tx.tx.hash);

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

      if (saveResponse.ok) {
        showNotification('🎉 On-Chain Resume minted successfully!', 'success');
        // Refresh data
        fetchResumeData();
      } else {
        showNotification('Resume minted but failed to save record. Please contact support.', 'warning');
      }

    } catch (error) {
      console.error('Error minting resume:', error);
      if (error.code === 4001) {
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
    const link = `${window.location.origin}/resume/${resumeData?.existing?.walletAddress || currentUser?.username}`;
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

      {/* Existing Resume Info */}
      {hasExistingResume && (
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
              onClick={connectWallet}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-semibold transition-all flex items-center gap-2 mx-auto"
            >
              <FaWallet /> Connect Wallet
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-400">
                  Connected: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </span>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                Base Network
              </span>
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

