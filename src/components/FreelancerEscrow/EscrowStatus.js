import React from 'react';

const STATUS_CONFIG = {
  awaiting_deposit: { label: 'Awaiting Payment', color: 'yellow', icon: '⏳', description: 'Buyer needs to deposit funds into escrow' },
  deposit_pending: { label: 'Verifying Deposit', color: 'blue', icon: '🔄', description: 'Deposit is being verified on-chain' },
  funded: { label: 'Escrow Funded', color: 'green', icon: '🛡️', description: 'Funds are securely held in escrow' },
  pending_release: { label: 'Releasing Payment', color: 'blue', icon: '🔄', description: 'Payment is being released to seller' },
  released: { label: 'Payment Released', color: 'emerald', icon: '✅', description: 'Funds have been released to the seller' },
  disputed: { label: 'Disputed', color: 'red', icon: '⚠️', description: 'A dispute has been opened. Admin will review.' },
  resolved_seller: { label: 'Resolved (Seller)', color: 'emerald', icon: '✅', description: 'Dispute resolved in favor of the seller' },
  resolved_buyer: { label: 'Resolved (Buyer)', color: 'emerald', icon: '↩️', description: 'Dispute resolved in favor of the buyer' },
  cancelled: { label: 'Cancelled', color: 'gray', icon: '❌', description: 'Escrow was cancelled' }
};

const COLOR_CLASSES = {
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  green: 'bg-green-500/20 text-green-400 border-green-500/40',
  emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  red: 'bg-red-500/20 text-red-400 border-red-500/40',
  gray: 'bg-gray-500/20 text-gray-400 border-gray-500/40'
};

const EscrowStatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.awaiting_deposit;
  const colorClass = COLOR_CLASSES[config.color] || COLOR_CLASSES.gray;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};

const EscrowStatusWidget = ({ escrow, compact = false }) => {
  if (!escrow) return null;

  const config = STATUS_CONFIG[escrow.status] || STATUS_CONFIG.awaiting_deposit;

  if (compact) {
    return <EscrowStatusBadge status={escrow.status} />;
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className="text-white font-medium text-sm">{config.label}</span>
        </div>
        <span className="text-slate-500 text-xs">{escrow.amount} {escrow.currency || 'USDC'}</span>
      </div>
      <p className="text-slate-400 text-xs">{config.description}</p>

      {escrow.depositTxHash && (
        <div className="mt-2 pt-2 border-t border-slate-700/50">
          <p className="text-slate-500 text-xs">Deposit TX: <span className="text-cyan-400 font-mono">{escrow.depositTxHash.slice(0, 8)}...{escrow.depositTxHash.slice(-6)}</span></p>
        </div>
      )}

      {escrow.releaseTxHash && (
        <div className="mt-1">
          <p className="text-slate-500 text-xs">Release TX: <span className="text-emerald-400 font-mono">{escrow.releaseTxHash.slice(0, 8)}...{escrow.releaseTxHash.slice(-6)}</span></p>
        </div>
      )}

      {escrow.refundTxHash && (
        <div className="mt-1">
          <p className="text-slate-500 text-xs">Refund TX: <span className="text-amber-400 font-mono">{escrow.refundTxHash.slice(0, 8)}...{escrow.refundTxHash.slice(-6)}</span></p>
        </div>
      )}

      {escrow.status === 'disputed' && escrow.disputeReason && (
        <div className="mt-2 pt-2 border-t border-red-500/20">
          <p className="text-red-400 text-xs">Reason: {escrow.disputeReason}</p>
        </div>
      )}
    </div>
  );
};

export { EscrowStatusBadge, EscrowStatusWidget };
export default EscrowStatusWidget;
