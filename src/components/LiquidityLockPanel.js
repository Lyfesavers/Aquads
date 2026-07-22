import React, { useState } from 'react';
import { FaLock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { verifyAdLiquidityLock } from '../services/api';

const SUPPORTED_EVM_LOCKERS = 'Team Finance, Unicrypt, PinkLock';
const SUPPORTED_SOLANA_LOCKERS = 'Streamflow, StakePoint, Raydium Burn & Earn';

const PROVIDER_LABELS = {
  team_finance: 'Team Finance',
  unicrypt: 'Unicrypt',
  pinklock: 'PinkLock',
  streamflow: 'Streamflow',
  stakepoint: 'StakePoint',
  raydium: 'Raydium Burn & Earn',
  unknown_locker: 'Known locker',
};

function formatUnlockDate(unlockAt) {
  if (!unlockAt) return null;
  const date = new Date(unlockAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const LiquidityLockPanel = ({ ad, onAdPatched, showNotification }) => {
  const lock = ad?.projectProfile?.liquidityLock || {};
  const [proofInput, setProofInput] = useState(lock.proofInput || lock.txHash || '');
  const [verifying, setVerifying] = useState(false);

  const isVerified = lock.status === 'verified';
  const isFailed = lock.status === 'failed';

  const handleVerify = async () => {
    const trimmed = proofInput.trim();
    if (!trimmed) {
      showNotification?.('Paste the lock creation transaction hash or URL.', 'error');
      return;
    }

    setVerifying(true);
    try {
      const updatedAd = await verifyAdLiquidityLock(ad.id, trimmed);
      onAdPatched?.(updatedAd);
      showNotification?.('Liquidity lock verified on-chain.', 'success');
    } catch (error) {
      if (error.ad) {
        onAdPatched?.(error.ad);
      }
      showNotification?.(error.message || 'Could not verify liquidity lock.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const providerLabel = PROVIDER_LABELS[lock.provider] || lock.provider;
  const unlockLabel = formatUnlockDate(lock.unlockAt);

  return (
    <div className="mt-4 rounded-xl border border-gray-600/50 bg-gray-800/40 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-lg ${isVerified ? 'bg-emerald-500/20' : 'bg-cyan-500/15'}`}>
          <FaLock className={isVerified ? 'text-emerald-400' : 'text-cyan-400'} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-white font-semibold text-sm">Liquidity lock verification</h4>
          <p className="text-gray-400 text-xs mt-1 leading-relaxed">
            Submit the <strong className="text-gray-300">lock creation transaction</strong> — the tx from when
            you locked LP on a supported platform (not a swap, transfer, or unrelated tx).
          </p>
          <ul className="text-gray-500 text-xs mt-2 space-y-1 list-disc list-inside leading-relaxed">
            <li>
              <span className="text-gray-400">EVM:</span> {SUPPORTED_EVM_LOCKERS}
            </li>
            <li>
              <span className="text-gray-400">Solana:</span> {SUPPORTED_SOLANA_LOCKERS}
            </li>
            <li>
              Paste the <strong className="text-gray-400">tx hash</strong> or a{' '}
              <strong className="text-gray-400">lock URL / explorer link</strong> that contains that same
              lock-creation transaction.
            </li>
          </ul>
        </div>
      </div>

      {isVerified && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-200">
          <FaCheckCircle className="text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-emerald-100">LP lock verified</p>
            <p className="text-emerald-200/90 mt-0.5">
              {providerLabel ? `${providerLabel} · ` : ''}
              {lock.lockPermanent
                ? 'Permanent lock (liquidity cannot be withdrawn)'
                : unlockLabel
                  ? `Unlocks ${unlockLabel}`
                  : 'Active lock detected'}
            </p>
          </div>
        </div>
      )}

      {isFailed && lock.verifyError && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-200">
          <FaExclamationTriangle className="text-red-400 mt-0.5 shrink-0" />
          <p>{lock.verifyError}</p>
        </div>
      )}

      <label className="block text-gray-400 text-xs mb-1.5" htmlFor={`lp-lock-proof-${ad.id}`}>
        Lock creation tx hash or URL
      </label>
      <input
        id={`lp-lock-proof-${ad.id}`}
        type="text"
        value={proofInput}
        onChange={(e) => setProofInput(e.target.value)}
        placeholder="Lock creation tx hash, or Solscan / Team Finance / StakePoint / Raydium lock page URL"
        className="w-full bg-gray-900/70 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60"
        disabled={verifying}
      />

      <button
        type="button"
        onClick={handleVerify}
        disabled={verifying || !proofInput.trim()}
        className="mt-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        {verifying ? 'Verifying on-chain…' : isVerified ? 'Re-verify lock' : 'Verify liquidity lock'}
      </button>
    </div>
  );
};

export default LiquidityLockPanel;
