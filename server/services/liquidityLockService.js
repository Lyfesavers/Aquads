const { ethers } = require('ethers');
const { EVM_RPC_URLS, solanaRpc } = require('../config/rpc');
const { fetchBestDexPair } = require('../utils/dexPairLookup');
const {
  getEvmLockers,
  getEvmRpcKey,
  isEvmChain,
  SOLANA_LOCK_PROGRAM_META,
  SOLANA_LOCK_PROGRAMS,
  SUPPORTED_LOCKER_NAMES,
} = require('../constants/liquidityLockers');

const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');
const ON_DEPOSIT_TOPIC = ethers.id('onDeposit(address,uint256,uint256,uint256)');

const LOCKER_LABELS = {
  '0x663a5c229c09b049e36dcc11a0123486ecd6341': 'unicrypt',
  '0xc9882df237647c772777a2eef602fe91aa12d339': 'team_finance',
  '0x40799357520fa8327d74a163d32474021b9a3780': 'pinklock',
};

/**
 * Extract tx hash from bare hash or provider URL (Team Finance, Unicrypt, Streamflow, explorers).
 * @param {string} input
 * @param {string} blockchain
 */
function extractTxHash(input, blockchain) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;

  const chain = String(blockchain || '').toLowerCase();

  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  if (chain === 'solana' && /^[1-9A-HJ-NP-Za-km-z]{32,88}$/.test(trimmed)) {
    return trimmed;
  }

  const evmMatch = trimmed.match(/0x[a-fA-F0-9]{64}/i);
  if (evmMatch) {
    return evmMatch[0].toLowerCase();
  }

  const solPathMatch = trimmed.match(/\/(?:tx|transaction)\/([1-9A-HJ-NP-Za-km-z]{32,88})/);
  if (solPathMatch) {
    return solPathMatch[1];
  }

  const solQueryMatch = trimmed.match(/[?&](?:tx|signature)=([1-9A-HJ-NP-Za-km-z]{32,88})/);
  if (solQueryMatch) {
    return solQueryMatch[1];
  }

  return null;
}

function getEvmProvider(blockchain) {
  const rpcKey = getEvmRpcKey(blockchain);
  const url = (rpcKey && EVM_RPC_URLS[rpcKey]) || EVM_RPC_URLS.ethereum;
  return new ethers.JsonRpcProvider(url);
}

function identifyLockerAddress(address) {
  const key = String(address || '').toLowerCase();
  return LOCKER_LABELS[key] || 'unknown_locker';
}

/**
 * @param {import('ethers').TransactionReceipt} receipt
 * @param {string} lpTokenAddress
 * @param {string} blockchain
 */
function parseEvmLockFromReceipt(receipt, lpTokenAddress, blockchain) {
  const lockers = getEvmLockers(blockchain).map((a) => a.toLowerCase());
  const lockerSet = new Set(lockers);
  const lpLower = lpTokenAddress.toLowerCase();

  let lockedAmount = 0n;
  let provider = '';
  let unlockAt = null;

  for (const log of receipt.logs) {
    if (log.topics?.[0] === ON_DEPOSIT_TOPIC && lockerSet.has(log.address.toLowerCase())) {
      try {
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
          ['address', 'uint256', 'uint256', 'uint256'],
          log.data
        );
        const lpToken = decoded[0].toLowerCase();
        if (lpToken === lpLower) {
          lockedAmount += BigInt(decoded[1].toString());
          const unlockSeconds = Number(decoded[2]);
          if (unlockSeconds > 0) {
            unlockAt = new Date(unlockSeconds * 1000);
          }
          provider = identifyLockerAddress(log.address);
        }
      } catch (_) {
        // ignore malformed logs
      }
    }
  }

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== lpLower) continue;
    if (log.topics?.[0] !== TRANSFER_TOPIC || !log.topics[2]) continue;

    const to = ('0x' + log.topics[2].slice(26)).toLowerCase();
    if (!lockerSet.has(to)) continue;

    lockedAmount += BigInt(log.data || '0x0');
    if (!provider) {
      provider = identifyLockerAddress(to);
    }
  }

  if (lockedAmount <= 0n) {
    return null;
  }

  return {
    lockedAmount: lockedAmount.toString(),
    provider: provider || 'unknown_locker',
    unlockAt,
    lockPermanent: false,
  };
}

/**
 * Resolve addresses/mints that may appear in a lock tx for this listing.
 * Solana base58 is case-sensitive — do not lowercase Solana candidates.
 */
async function resolveLpTokenAddress(pairAddress, blockchain) {
  const direct = String(pairAddress || '').trim();
  if (!direct) return null;

  const chain = String(blockchain || '').toLowerCase();
  const candidates = [direct];

  try {
    const dexPair = await fetchBestDexPair(direct, chain);
    if (dexPair?.pairAddress && dexPair.pairAddress !== direct) {
      candidates.push(dexPair.pairAddress);
    }
    if (dexPair?.baseToken?.address) {
      candidates.push(dexPair.baseToken.address);
    }
    if (dexPair?.quoteToken?.address) {
      candidates.push(dexPair.quoteToken.address);
    }
  } catch (_) {
    // dex lookup optional
  }

  if (chain === 'solana') {
    return [...new Set(candidates.filter(Boolean))];
  }

  return [...new Set(candidates.map((a) => a.toLowerCase()).filter(Boolean))];
}

function txInvolvesCandidates(serialized, accountKeys, candidates, isSolana) {
  return candidates.some((candidate) => {
    if (isSolana) {
      return (
        accountKeys.some((key) => String(key) === candidate) ||
        serialized.includes(candidate)
      );
    }
    const lower = candidate.toLowerCase();
    return (
      accountKeys.some((key) => String(key).toLowerCase() === lower) ||
      serialized.toLowerCase().includes(lower)
    );
  });
}

/**
 * Best-effort unlock timestamp from Solana program logs.
 * @param {string[]} logs
 */
function parseSolanaUnlockFromLogs(logs) {
  if (!Array.isArray(logs) || !logs.length) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  const maxSec = nowSec + 60 * 60 * 24 * 365 * 20;

  for (const line of logs) {
    const explicit = line.match(/unlock(?:\s+time(?:stamp)?)?[:\s]+(\d{10,13})/i);
    if (explicit) {
      const raw = parseInt(explicit[1], 10);
      const sec = raw > 1e12 ? Math.floor(raw / 1000) : raw;
      if (sec > nowSec && sec < maxSec) {
        return new Date(sec * 1000);
      }
    }
  }

  for (const line of logs) {
    const nums = line.match(/\b(1[7-9]\d{8})\b/g) || [];
    for (const n of nums) {
      const sec = parseInt(n, 10);
      if (sec > nowSec && sec < maxSec) {
        return new Date(sec * 1000);
      }
    }
  }

  return null;
}

/**
 * @param {string[]} accountKeys
 * @param {string[]} logs
 */
function detectSolanaLockProvider(accountKeys, logs) {
  for (const key of accountKeys) {
    if (SOLANA_LOCK_PROGRAM_META[key]) {
      return SOLANA_LOCK_PROGRAM_META[key];
    }
  }

  const logText = logs.join('\n');
  if (/stakepoint/i.test(logText)) {
    return SOLANA_LOCK_PROGRAM_META.gLHaGJsZ6G7AXZxoDL9EsSWkRbKAWhFHi73gVfNXuzK;
  }
  if (/streamflow|strmRq/i.test(logText)) {
    return SOLANA_LOCK_PROGRAM_META.strmRqUCoQUgGUan5YzcUZb2EQhHu6qN2F2ZWF1pQmK;
  }
  if (/Lockr|burn.?&.?earn|raydium.*lock/i.test(logText)) {
    return SOLANA_LOCK_PROGRAM_META.LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE;
  }

  return null;
}

/**
 * @param {{ blockchain: string, pairAddress: string, proofInput: string }} params
 */
async function verifyLiquidityLock({ blockchain, pairAddress, proofInput }) {
  const chain = String(blockchain || '').toLowerCase();
  const txHash = extractTxHash(proofInput, chain);

  if (!txHash) {
    throw new Error('Enter a valid transaction hash or a lock URL that contains one.');
  }

  if (!pairAddress?.trim()) {
    throw new Error('Listing is missing a pair address.');
  }

  const lpCandidates = await resolveLpTokenAddress(pairAddress, chain);
  if (!lpCandidates?.length) {
    throw new Error('Could not resolve LP token for this listing.');
  }

  if (chain === 'solana') {
    return verifySolanaLock(txHash, lpCandidates, proofInput);
  }

  if (isEvmChain(chain)) {
    return verifyEvmLock(txHash, lpCandidates, chain, proofInput);
  }

  throw new Error(
    `Automatic LP lock verification is not supported for this chain yet. Supported lockers: ${SUPPORTED_LOCKER_NAMES}.`
  );
}

async function verifyEvmLock(txHash, lpCandidates, blockchain, proofInput) {
  const provider = getEvmProvider(blockchain);
  const receipt = await provider.getTransactionReceipt(txHash);

  if (!receipt) {
    throw new Error('Transaction not found on this chain. Confirm the hash matches your listing blockchain.');
  }

  if (receipt.status !== 1) {
    throw new Error('Transaction failed on-chain and cannot be used as lock proof.');
  }

  let match = null;
  for (const lp of lpCandidates) {
    match = parseEvmLockFromReceipt(receipt, lp, blockchain);
    if (match) break;
  }

  if (!match) {
    throw new Error(
      `No LP transfer to a known locker (${SUPPORTED_LOCKER_NAMES}) was found for this pair in that transaction.`
    );
  }

  return buildVerifiedResult({
    txHash,
    proofInput,
    provider: match.provider,
    unlockAt: match.unlockAt,
    lockedAmount: match.lockedAmount,
    lockPermanent: false,
  });
}

async function verifySolanaLock(txHash, lpCandidates, proofInput) {
  const tx = await solanaRpc('getTransaction', [
    txHash,
    { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
  ], { timeoutMs: 20000 });

  if (!tx) {
    throw new Error('Transaction not found on Solana.');
  }

  if (tx.meta?.err) {
    throw new Error('Transaction failed on-chain and cannot be used as lock proof.');
  }

  const serialized = JSON.stringify(tx);
  const accountKeys = (tx.transaction?.message?.accountKeys || []).map((k) =>
    typeof k === 'string' ? k : k.pubkey
  );
  const logs = tx.meta?.logMessages || [];

  const lockMeta = detectSolanaLockProvider(accountKeys, logs);
  const hasLockProgram =
    Boolean(lockMeta) ||
    accountKeys.some((key) => SOLANA_LOCK_PROGRAMS.includes(key));

  if (!hasLockProgram) {
    throw new Error(
      `No known Solana lock program (Streamflow, StakePoint, or Raydium Burn & Earn) was detected in that transaction.`
    );
  }

  const meta = lockMeta || { provider: 'streamflow', permanent: false };

  if (!txInvolvesCandidates(serialized, accountKeys, lpCandidates, true)) {
    throw new Error('That lock transaction does not appear to involve this listing\'s pair address.');
  }

  const unlockAt = meta.permanent ? null : parseSolanaUnlockFromLogs(logs);

  return buildVerifiedResult({
    txHash,
    proofInput,
    provider: meta.provider,
    unlockAt,
    lockedAmount: '',
    lockPermanent: Boolean(meta.permanent),
  });
}

function buildVerifiedResult({
  txHash,
  proofInput,
  provider,
  unlockAt,
  lockedAmount,
  lockPermanent,
}) {
  return {
    status: 'verified',
    txHash,
    proofInput: String(proofInput || '').trim(),
    provider,
    unlockAt,
    lockedAmount: lockedAmount || '',
    lockPermanent: Boolean(lockPermanent),
    verifiedAt: new Date(),
    verifyError: '',
  };
}

module.exports = {
  extractTxHash,
  verifyLiquidityLock,
};
