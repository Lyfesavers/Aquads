const axios = require('axios');
const BountyEscrow = require('../models/BountyEscrow');
const Bounty = require('../models/Bounty');
const User = require('../models/User');
const escrowService = require('./escrowService');

// Reuse the proven on-chain transfer primitives from the freelancer escrow service.
const { solanaRpcCall, getEvmRpc, releaseSolana, releaseEvm, refundSolana, refundEvm } = escrowService;

// Verify the poster's deposit landed on-chain, then mark the escrow funded and open the bounty.
async function verifyDeposit(escrowId) {
  const escrow = await BountyEscrow.findById(escrowId);
  if (!escrow || !escrow.depositTxHash) {
    throw new Error('Bounty escrow or deposit tx hash not found');
  }

  if (['funded', 'pending_release', 'released'].includes(escrow.status)) {
    return { verified: true };
  }

  if (escrow.chain === 'solana') {
    return await verifySolanaDeposit(escrow);
  }
  return await verifyEvmDeposit(escrow);
}

async function markFunded(escrow) {
  escrow.depositVerified = true;
  escrow.status = 'funded';
  escrow.fundedAt = new Date();
  await escrow.save();

  // Open the bounty for submissions once the reward is secured.
  await Bounty.findByIdAndUpdate(escrow.bountyId, {
    status: 'open',
    fundedAt: new Date(),
    updatedAt: new Date()
  });
}

async function verifySolanaDeposit(escrow) {
  const maxAttempts = 8;
  const delays = [2000, 3000, 4000, 5000, 5000, 5000, 5000, 5000];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, delays[attempt - 1]));

      const result = await solanaRpcCall('getTransaction', [
        escrow.depositTxHash,
        { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }
      ]);

      if (!result) {
        if (attempt < maxAttempts - 1) continue;
        return { verified: false, reason: 'Transaction not found after retries' };
      }
      if (result.meta?.err) {
        return { verified: false, reason: 'Transaction failed on-chain' };
      }

      await markFunded(escrow);
      return { verified: true };
    } catch (err) {
      if (attempt < maxAttempts - 1) continue;
      return { verified: false, reason: err.message };
    }
  }
  return { verified: false, reason: 'Verification exhausted all attempts' };
}

async function verifyEvmDeposit(escrow) {
  const maxAttempts = 8;
  const delays = [2000, 3000, 4000, 5000, 5000, 5000, 5000, 5000];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, delays[attempt - 1]));

      const rpcUrl = getEvmRpc(escrow.chain);
      const response = await axios.post(rpcUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [escrow.depositTxHash]
      }, { timeout: 15000 });

      const receipt = response.data?.result;
      if (!receipt) {
        if (attempt < maxAttempts - 1) continue;
        return { verified: false, reason: 'Transaction receipt not found after retries' };
      }
      if (receipt.status !== '0x1') {
        return { verified: false, reason: 'Transaction failed on-chain' };
      }

      await markFunded(escrow);
      return { verified: true };
    } catch (err) {
      if (attempt < maxAttempts - 1) continue;
      return { verified: false, reason: err.message };
    }
  }
  return { verified: false, reason: 'Verification exhausted all attempts' };
}

// Release the escrowed reward to the winning hunter (escrow.sellerId must be set).
async function releaseToWinner(escrowId) {
  let escrow = await BountyEscrow.findOneAndUpdate(
    { _id: escrowId, status: 'funded' },
    { status: 'pending_release' },
    { new: true }
  );

  if (!escrow) {
    const actual = await BountyEscrow.findById(escrowId).lean();
    const actualStatus = actual ? actual.status : 'not found';
    throw new Error(`Bounty escrow cannot be released (current status: ${actualStatus})`);
  }

  if (!escrow.sellerId) {
    escrow.status = 'funded';
    await escrow.save();
    throw new Error('No winner set for this bounty escrow');
  }

  const winner = await User.findById(escrow.sellerId).select('aquaPay').lean();
  if (!winner?.aquaPay?.wallets) {
    escrow.status = 'funded';
    await escrow.save();
    throw new Error('Winner has no wallet configured');
  }

  try {
    let txHash;
    const feeAmount = escrow.depositAmount * escrow.feePercentage;
    const releaseAmount = escrow.depositAmount - feeAmount;

    if (escrow.chain === 'solana') {
      txHash = await releaseSolana(escrow, winner, releaseAmount, feeAmount);
    } else {
      txHash = await releaseEvm(escrow, winner, releaseAmount, feeAmount);
    }

    escrow.status = 'released';
    escrow.releaseTxHash = txHash;
    escrow.releaseAmount = releaseAmount;
    escrow.platformFee = feeAmount;
    escrow.releasedAt = new Date();
    escrow.sellerWalletAddress = escrow.chain === 'solana'
      ? winner.aquaPay.wallets.solana
      : winner.aquaPay.wallets.ethereum;
    await escrow.save();

    return { success: true, txHash, releaseAmount, platformFee: feeAmount };
  } catch (err) {
    escrow.status = 'funded';
    await escrow.save();
    throw err;
  }
}

// Admin: resolve a dispute in the winner's favor (or force-release).
async function adminResolveForWinner(escrowId, adminUserId, notes) {
  const escrow = await BountyEscrow.findById(escrowId);
  if (!escrow) throw new Error('Bounty escrow not found');
  if (!['funded', 'disputed'].includes(escrow.status)) {
    throw new Error('Bounty escrow cannot be released in current status: ' + escrow.status);
  }

  if (escrow.status === 'disputed') {
    escrow.status = 'funded';
    await escrow.save();
  }

  const result = await releaseToWinner(escrowId);

  const updated = await BountyEscrow.findById(escrowId);
  updated.status = 'resolved_seller';
  updated.disputeResolvedBy = adminUserId;
  updated.disputeNotes = notes || 'Admin resolved in favor of winner';
  updated.disputeResolvedAt = new Date();
  await updated.save();

  return result;
}

// Refund the poster (admin dispute resolution or cancellation of a funded bounty).
async function refundToPoster(escrowId, adminUserId, notes) {
  const escrow = await BountyEscrow.findById(escrowId);
  if (!escrow) throw new Error('Bounty escrow not found');
  if (!['funded', 'disputed'].includes(escrow.status)) {
    throw new Error('Bounty escrow cannot be refunded in current status: ' + escrow.status);
  }

  const feeAmount = escrow.depositAmount * escrow.feePercentage;
  const refundAmount = escrow.depositAmount - feeAmount;

  let txHash;
  if (escrow.chain === 'solana') {
    txHash = await refundSolana(escrow, refundAmount);
  } else {
    txHash = await refundEvm(escrow, refundAmount);
  }

  escrow.status = 'resolved_buyer';
  escrow.refundTxHash = txHash;
  escrow.refundAmount = refundAmount;
  escrow.refundedAt = new Date();
  if (adminUserId) escrow.disputeResolvedBy = adminUserId;
  escrow.disputeNotes = notes || 'Refund to poster';
  escrow.disputeResolvedAt = new Date();
  await escrow.save();

  return { success: true, txHash, refundAmount };
}

module.exports = {
  verifyDeposit,
  releaseToWinner,
  adminResolveForWinner,
  refundToPoster
};
