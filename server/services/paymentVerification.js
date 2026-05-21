const { ethers } = require('ethers');
const {
  solanaRpc,
  EVM_RPC_URLS,
  USDC_CONTRACTS,
  SOLANA_USDC_MINT,
  PLATFORM_WALLETS,
  AQUAPAY_FEE_PERCENTAGE
} = require('../config/rpc');

const MANUAL_CHAINS = new Set(['bitcoin', 'tron']);
const EVM_CHAINS = new Set(['ethereum', 'base', 'polygon', 'arbitrum', 'bnb']);
const USDC_DECIMALS = { ethereum: 6, base: 6, polygon: 6, arbitrum: 6, bnb: 18 };

const TRANSFER_IFACE = new ethers.Interface([
  'event Transfer(address indexed from, address indexed to, uint256 value)'
]);

function amountsClose(actual, expected, tolerance = 0.03) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  return Math.abs(actual - expected) <= tolerance;
}

function normalizeAddress(chain, address) {
  if (!address) return '';
  if (EVM_CHAINS.has(chain)) return address.toLowerCase();
  return address;
}

/**
 * @param {string} txHash
 * @param {string} chain
 */
async function verifyTransactionSucceeded(txHash, chain) {
  if (chain === 'solana') {
    const result = await solanaRpc('getSignatureStatuses', [[txHash]]);
    const status = result?.value?.[0];
    return Boolean(
      status &&
        !status.err &&
        (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized')
    );
  }

  if (EVM_CHAINS.has(chain)) {
    const provider = new ethers.JsonRpcProvider(EVM_RPC_URLS[chain] || EVM_RPC_URLS.ethereum);
    const receipt = await provider.getTransactionReceipt(txHash);
    return Boolean(receipt && receipt.status === 1);
  }

  return false;
}

/**
 * @param {object} tx
 * @param {string} mint
 */
function parseSolanaUsdcCredits(tx, mint = SOLANA_USDC_MINT) {
  const pre = tx.meta?.preTokenBalances || [];
  const post = tx.meta?.postTokenBalances || [];
  const preByIndex = new Map();

  for (const entry of pre) {
    if (entry.mint !== mint) continue;
    preByIndex.set(entry.accountIndex, parseFloat(entry.uiTokenAmount?.uiAmountString || '0'));
  }

  const credits = [];
  for (const entry of post) {
    if (entry.mint !== mint) continue;
    const before = preByIndex.get(entry.accountIndex) || 0;
    const after = parseFloat(entry.uiTokenAmount?.uiAmountString || '0');
    const delta = after - before;
    if (delta > 0 && entry.owner) {
      credits.push({ owner: entry.owner, amount: delta });
    }
  }
  return credits;
}

/**
 * @param {object} tx
 */
function parseSolanaNativeCredits(tx) {
  const accountKeys = tx.transaction?.message?.accountKeys || [];
  const preBalances = tx.meta?.preBalances || [];
  const postBalances = tx.meta?.postBalances || [];
  const credits = [];

  for (let i = 0; i < accountKeys.length; i++) {
    const key = accountKeys[i];
    const pubkey = typeof key === 'string' ? key : key.pubkey?.toString?.() || key.toString();
    const deltaLamports = (postBalances[i] || 0) - (preBalances[i] || 0);
    if (deltaLamports > 0) {
      credits.push({ owner: pubkey, amount: deltaLamports / 1e9 });
    }
  }
  return credits;
}

/**
 * @param {object} params
 */
async function verifySolanaPayment({ txHash, token, expectedAmount, recipientAddress, requireFee }) {
  const tx = await solanaRpc('getTransaction', [
    txHash,
    { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }
  ]);

  if (!tx || tx.meta?.err) {
    return { verified: false, reason: 'Transaction not found or failed on Solana' };
  }

  const isUsdc = token === 'USDC';
  const credits = isUsdc ? parseSolanaUsdcCredits(tx) : parseSolanaNativeCredits(tx);
  const recipient = normalizeAddress('solana', recipientAddress);
  const platform = normalizeAddress('solana', PLATFORM_WALLETS.solana);

  const toRecipient = credits
    .filter((c) => normalizeAddress('solana', c.owner) === recipient)
    .reduce((sum, c) => sum + c.amount, 0);

  if (!amountsClose(toRecipient, expectedAmount, isUsdc ? 0.05 : 0.0001)) {
    return {
      verified: false,
      reason: `Recipient received ${toRecipient}, expected ${expectedAmount} ${token}`
    };
  }

  if (requireFee && platform) {
    const expectedFee = expectedAmount * AQUAPAY_FEE_PERCENTAGE;
    const toPlatform = credits
      .filter((c) => normalizeAddress('solana', c.owner) === platform)
      .reduce((sum, c) => sum + c.amount, 0);

    if (expectedFee > 0.000001 && !amountsClose(toPlatform, expectedFee, isUsdc ? 0.05 : 0.0001)) {
      return {
        verified: false,
        reason: `Platform fee mismatch (got ${toPlatform}, expected ~${expectedFee})`
      };
    }
  }

  return { verified: true };
}

/**
 * @param {object} params
 */
async function verifyEvmPayment({ txHash, chain, token, expectedAmount, recipientAddress, requireFee }) {
  if (token !== 'USDC') {
    return { verified: false, reason: 'Only USDC is supported for EVM AquaPay verification' };
  }

  const contractAddress = USDC_CONTRACTS[chain];
  if (!contractAddress) {
    return { verified: false, reason: `USDC not configured for chain ${chain}` };
  }

  const provider = new ethers.JsonRpcProvider(EVM_RPC_URLS[chain] || EVM_RPC_URLS.ethereum);
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) {
    return { verified: false, reason: 'EVM transaction not successful' };
  }

  const decimals = USDC_DECIMALS[chain] || 6;
  const recipient = normalizeAddress(chain, recipientAddress);
  const platform = normalizeAddress(chain, PLATFORM_WALLETS.ethereum);
  let toRecipient = 0;
  let toPlatform = 0;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue;
    try {
      const parsed = TRANSFER_IFACE.parseLog(log);
      if (parsed.name !== 'Transfer') continue;
      const to = parsed.args.to.toLowerCase();
      const value = Number(ethers.formatUnits(parsed.args.value, decimals));
      if (to === recipient) toRecipient += value;
      if (platform && to === platform) toPlatform += value;
    } catch {
      // skip non-transfer logs
    }
  }

  if (!amountsClose(toRecipient, expectedAmount, 0.05)) {
    return {
      verified: false,
      reason: `Recipient received ${toRecipient} USDC, expected ${expectedAmount}`
    };
  }

  if (requireFee && platform) {
    const expectedFee = expectedAmount * AQUAPAY_FEE_PERCENTAGE;
    if (expectedFee > 0.001 && !amountsClose(toPlatform, expectedFee, 0.05)) {
      // EVM uses a separate fee transaction; fee may not be in this receipt — only warn if we see a shortfall when platform got something
      if (toPlatform > 0 && !amountsClose(toPlatform, expectedFee, 0.05)) {
        return {
          verified: false,
          reason: `Platform fee in this tx (${toPlatform}) does not match expected ~${expectedFee}`
        };
      }
    }
  }

  return { verified: true };
}

/**
 * Verify an AquaPay payment on-chain (recipient amount + optional platform fee on Solana).
 * @param {object} params
 * @param {string} params.txHash
 * @param {string} params.chain
 * @param {string} params.token
 * @param {number|string} params.amount - amount recipient should receive (pre-fee line item)
 * @param {string} params.recipientAddress - wallet on selected chain
 * @param {boolean} [params.requireFee=true]
 */
async function verifyAquaPayPayment({
  txHash,
  chain,
  token,
  amount,
  recipientAddress,
  requireFee = true
}) {
  if (!txHash || !chain || !recipientAddress) {
    return { verified: false, reason: 'Missing verification parameters' };
  }

  if (MANUAL_CHAINS.has(chain)) {
    return {
      verified: false,
      reason: 'Bitcoin and TRON payments must be confirmed manually',
      manual: true
    };
  }

  const succeeded = await verifyTransactionSucceeded(txHash, chain);
  if (!succeeded) {
    return { verified: false, reason: 'Transaction not confirmed on chain' };
  }

  const expectedAmount = parseFloat(amount);
  if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
    return { verified: false, reason: 'Invalid payment amount' };
  }

  const normalizedToken = (token || 'USDC').toUpperCase();

  try {
    if (chain === 'solana') {
      return verifySolanaPayment({
        txHash,
        token: normalizedToken,
        expectedAmount,
        recipientAddress,
        requireFee
      });
    }

    if (EVM_CHAINS.has(chain)) {
      return verifyEvmPayment({
        txHash,
        chain,
        token: normalizedToken,
        expectedAmount,
        recipientAddress,
        requireFee
      });
    }

    return { verified: false, reason: `Unsupported chain: ${chain}` };
  } catch (error) {
    console.error('[paymentVerification]', txHash, chain, error.message);
    return { verified: false, reason: 'Verification failed: ' + error.message };
  }
}

module.exports = {
  verifyTransactionSucceeded,
  verifyAquaPayPayment,
  MANUAL_CHAINS,
  EVM_CHAINS,
  amountsClose
};
