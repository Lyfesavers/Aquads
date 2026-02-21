const FreelancerEscrow = require('../models/FreelancerEscrow');
const Booking = require('../models/Booking');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const axios = require('axios');

function decodeBase58(str) {
  try {
    const bs58 = require('bs58');
    if (typeof bs58.decode === 'function') return bs58.decode(str);
    if (bs58.default && typeof bs58.default.decode === 'function') return bs58.default.decode(str);
  } catch {}
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const bytes = [0];
  for (const char of str) {
    const idx = ALPHABET.indexOf(char);
    if (idx === -1) throw new Error('Invalid base58 character');
    let carry = idx;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  for (const char of str) { if (char === '1') bytes.push(0); else break; }
  return new Uint8Array(bytes.reverse());
}

function loadSolanaKeypair(privateKeyStr) {
  const { Keypair } = require('@solana/web3.js');
  try {
    const decoded = decodeBase58(privateKeyStr);
    return Keypair.fromSecretKey(decoded);
  } catch {
    const keyArray = JSON.parse(privateKeyStr);
    return Keypair.fromSecretKey(new Uint8Array(keyArray));
  }
}

const ESCROW_MODE = process.env.ESCROW_MODE || 'testnet';

const SOLANA_RPCS_MAINNET = [
  'https://solana-rpc.publicnode.com',
  'https://solana-mainnet.rpc.extrnode.com',
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana'
];

const SOLANA_RPCS_TESTNET = [
  'https://api.devnet.solana.com',
  'https://rpc.ankr.com/solana_devnet'
];

const EVM_RPCS = {
  mainnet: {
    ethereum: 'https://ethereum.publicnode.com',
    base: 'https://mainnet.base.org',
    polygon: 'https://polygon-rpc.com',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    bnb: 'https://bsc-dataseed.binance.org'
  },
  testnet: {
    ethereum: 'https://rpc.sepolia.org',
    base: 'https://sepolia.base.org',
    polygon: 'https://rpc-amoy.polygon.technology',
    arbitrum: 'https://sepolia-rollup.arbitrum.io/rpc',
    bnb: 'https://data-seed-prebsc-1-s1.binance.org:8545'
  }
};

const USDC_ADDRESSES = {
  mainnet: {
    ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    bnb: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
  },
  testnet: {
    ethereum: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    base: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    polygon: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    arbitrum: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    bnb: '0x64544969ed7EBf5f083679233325356EbE738930'
  }
};

const SOLANA_USDC_MINT = {
  mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  testnet: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'
};

function getSolanaRpcs() {
  return ESCROW_MODE === 'mainnet' ? SOLANA_RPCS_MAINNET : SOLANA_RPCS_TESTNET;
}

function getEvmRpc(chain) {
  const mode = ESCROW_MODE === 'mainnet' ? 'mainnet' : 'testnet';
  return EVM_RPCS[mode][chain] || EVM_RPCS[mode].ethereum;
}

function getUsdcAddress(chain) {
  const mode = ESCROW_MODE === 'mainnet' ? 'mainnet' : 'testnet';
  return USDC_ADDRESSES[mode][chain];
}

function getSolanaUsdcMint() {
  return ESCROW_MODE === 'mainnet' ? SOLANA_USDC_MINT.mainnet : SOLANA_USDC_MINT.testnet;
}

async function solanaRpcCall(method, params) {
  const rpcs = getSolanaRpcs();
  const timeout = ESCROW_MODE === 'mainnet' ? 15000 : 30000;
  let lastError = null;
  
  for (const rpcUrl of rpcs) {
    try {
      const response = await axios.post(rpcUrl, {
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params: params || []
      }, { headers: { 'Content-Type': 'application/json' }, timeout });
      
      if (response.data?.error) {
        lastError = response.data.error.message;
        continue;
      }
      return response.data.result;
    } catch (err) {
      lastError = err.message;
      continue;
    }
  }
  throw new Error(`Solana RPC failed: ${lastError}`);
}

async function verifyDeposit(escrowId) {
  const escrow = await FreelancerEscrow.findById(escrowId);
  if (!escrow || !escrow.depositTxHash) {
    throw new Error('Escrow or deposit tx hash not found');
  }

  if (escrow.status === 'funded' || escrow.status === 'pending_release' || escrow.status === 'released') {
    return { verified: true };
  }

  if (escrow.chain === 'solana') {
    return await verifySolanaDeposit(escrow);
  } else {
    return await verifyEvmDeposit(escrow);
  }
}

async function verifySolanaDeposit(escrow) {
  const maxAttempts = 8;
  const delays = [2000, 3000, 4000, 5000, 5000, 5000, 5000, 5000];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Solana deposit verification attempt ${attempt + 1}/${maxAttempts} for ${escrow.depositTxHash}`);
        await new Promise(r => setTimeout(r, delays[attempt - 1]));
      }

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

      escrow.depositVerified = true;
      escrow.status = 'funded';
      escrow.fundedAt = new Date();
      await escrow.save();

      await Booking.findByIdAndUpdate(escrow.bookingId, { escrowId: escrow._id });
      await Invoice.findByIdAndUpdate(escrow.invoiceId, { status: 'paid' });

      console.log(`Solana deposit verified on attempt ${attempt + 1} for escrow ${escrow._id}`);
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
      if (attempt > 0) {
        console.log(`EVM deposit verification attempt ${attempt + 1}/${maxAttempts} for ${escrow.depositTxHash}`);
        await new Promise(r => setTimeout(r, delays[attempt - 1]));
      }

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

      escrow.depositVerified = true;
      escrow.status = 'funded';
      escrow.fundedAt = new Date();
      await escrow.save();

      await Booking.findByIdAndUpdate(escrow.bookingId, { escrowId: escrow._id });
      await Invoice.findByIdAndUpdate(escrow.invoiceId, { status: 'paid' });

      console.log(`EVM deposit verified on attempt ${attempt + 1} for escrow ${escrow._id}`);
      return { verified: true };
    } catch (err) {
      if (attempt < maxAttempts - 1) continue;
      return { verified: false, reason: err.message };
    }
  }
  return { verified: false, reason: 'Verification exhausted all attempts' };
}

async function releaseToSeller(escrowId) {
  let escrow = await FreelancerEscrow.findOneAndUpdate(
    { _id: escrowId, status: 'funded' },
    { status: 'pending_release' },
    { new: true }
  );

  // If not funded yet, re-attempt verification for deposit_pending escrows
  if (!escrow) {
    const pendingEscrow = await FreelancerEscrow.findOne({ _id: escrowId, status: 'deposit_pending' });
    if (pendingEscrow && pendingEscrow.depositTxHash) {
      console.log('Escrow in deposit_pending — re-attempting verification before release...');
      try {
        const verification = await verifyDeposit(escrowId);
        if (verification.verified) {
          escrow = await FreelancerEscrow.findOneAndUpdate(
            { _id: escrowId, status: 'funded' },
            { status: 'pending_release' },
            { new: true }
          );
        }
      } catch (verifyErr) {
        console.error('Re-verification failed:', verifyErr.message);
      }
    }
  }

  if (!escrow) {
    const actual = await FreelancerEscrow.findById(escrowId);
    const actualStatus = actual ? actual.status : 'not found';
    throw new Error(`Escrow cannot be released (current status: ${actualStatus})`);
  }

  const seller = await User.findById(escrow.sellerId).select('aquaPay');
  if (!seller?.aquaPay?.wallets) {
    escrow.status = 'funded';
    await escrow.save();
    throw new Error('Seller has no wallet configured');
  }

  try {
    let txHash;
    const feeAmount = escrow.depositAmount * escrow.feePercentage;
    const releaseAmount = escrow.depositAmount - feeAmount;

    if (escrow.chain === 'solana') {
      txHash = await releaseSolana(escrow, seller, releaseAmount, feeAmount);
    } else {
      txHash = await releaseEvm(escrow, seller, releaseAmount, feeAmount);
    }

    escrow.status = 'released';
    escrow.releaseTxHash = txHash;
    escrow.releaseAmount = releaseAmount;
    escrow.platformFee = feeAmount;
    escrow.releasedAt = new Date();
    escrow.sellerWalletAddress = escrow.chain === 'solana'
      ? seller.aquaPay.wallets.solana
      : seller.aquaPay.wallets.ethereum;
    await escrow.save();

    await Invoice.findByIdAndUpdate(escrow.invoiceId, { status: 'paid' });

    return { success: true, txHash, releaseAmount, platformFee: feeAmount };
  } catch (err) {
    escrow.status = 'funded';
    await escrow.save();
    throw err;
  }
}

async function releaseSolana(escrow, seller, releaseAmount, feeAmount) {
  const { Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');

  const privateKeyStr = process.env.ESCROW_SOLANA_PRIVATE_KEY;
  if (!privateKeyStr) throw new Error('Escrow Solana private key not configured');

  const sellerWallet = seller.aquaPay.wallets.solana;
  if (!sellerWallet) throw new Error('Seller has no Solana wallet');

  const escrowKeypair = loadSolanaKeypair(privateKeyStr);

  const sellerPubkey = new PublicKey(sellerWallet);
  const { blockhash } = await solanaRpcCall('getLatestBlockhash', [{ commitment: 'confirmed' }])
    .then(r => r.value || r);

  const transaction = new Transaction();

  if (escrow.token === 'USDC') {
    const { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');
    const mint = new PublicKey(getSolanaUsdcMint());
    const fromATA = await getAssociatedTokenAddress(mint, escrowKeypair.publicKey);
    const toATA = await getAssociatedTokenAddress(mint, sellerPubkey);

    const acctInfo = await solanaRpcCall('getAccountInfo', [toATA.toString(), { encoding: 'base64' }]);
    if (!acctInfo?.value) {
      transaction.add(createAssociatedTokenAccountInstruction(escrowKeypair.publicKey, toATA, sellerPubkey, mint));
    }

    const amountUnits = Math.floor(releaseAmount * 1e6);
    transaction.add(createTransferInstruction(fromATA, toATA, escrowKeypair.publicKey, amountUnits));
  } else {
    const lamports = Math.floor(releaseAmount * LAMPORTS_PER_SOL);
    transaction.add(SystemProgram.transfer({
      fromPubkey: escrowKeypair.publicKey,
      toPubkey: sellerPubkey,
      lamports
    }));
  }

  transaction.recentBlockhash = blockhash;
  transaction.feePayer = escrowKeypair.publicKey;
  transaction.sign(escrowKeypair);

  const serialized = transaction.serialize();
  const base64Tx = serialized.toString('base64');

  const signature = await solanaRpcCall('sendTransaction', [base64Tx, { encoding: 'base64', preflightCommitment: 'confirmed' }]);

  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    const statusResult = await solanaRpcCall('getSignatureStatuses', [[signature]]);
    const status = statusResult?.value?.[0];
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
      return signature;
    }
    if (status?.err) throw new Error('Release transaction failed: ' + JSON.stringify(status.err));
    await new Promise(r => setTimeout(r, 2000));
  }

  throw new Error('Release transaction confirmation timeout');
}

async function releaseEvm(escrow, seller, releaseAmount, feeAmount) {
  const { ethers } = require('ethers');

  const privateKey = process.env.ESCROW_EVM_PRIVATE_KEY;
  if (!privateKey) throw new Error('Escrow EVM private key not configured');

  const sellerWallet = seller.aquaPay.wallets.ethereum;
  if (!sellerWallet) throw new Error('Seller has no EVM wallet');

  const rpcUrl = getEvmRpc(escrow.chain);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  if (escrow.token === 'USDC') {
    const usdcAddress = getUsdcAddress(escrow.chain);
    if (!usdcAddress) throw new Error('USDC not supported on this chain');

    const abi = ['function transfer(address to, uint256 amount) returns (bool)', 'function decimals() view returns (uint8)'];
    const contract = new ethers.Contract(usdcAddress, abi, wallet);
    const decimals = await contract.decimals();
    const amountUnits = ethers.parseUnits(releaseAmount.toFixed(6), decimals);

    const tx = await contract.transfer(sellerWallet, amountUnits);
    const receipt = await tx.wait();

    if (receipt.status !== 1) throw new Error('EVM release transaction failed');
    return tx.hash;
  } else {
    const amountWei = ethers.parseEther(releaseAmount.toString());
    const tx = await wallet.sendTransaction({ to: sellerWallet, value: amountWei });
    const receipt = await tx.wait();

    if (receipt.status !== 1) throw new Error('EVM release transaction failed');
    return tx.hash;
  }
}

async function adminRefund(escrowId, adminUserId, notes) {
  const escrow = await FreelancerEscrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');
  if (!['funded', 'disputed'].includes(escrow.status)) {
    throw new Error('Escrow cannot be refunded in current status: ' + escrow.status);
  }

  const buyer = await User.findById(escrow.buyerId).select('username');
  const feeAmount = escrow.depositAmount * escrow.feePercentage;
  const refundAmount = escrow.depositAmount - feeAmount;

  let txHash;
  if (escrow.chain === 'solana') {
    txHash = await refundSolana(escrow, refundAmount);
  } else {
    txHash = await refundEvm(escrow, refundAmount);
  }

  escrow.status = escrow.status === 'disputed' ? 'resolved_buyer' : 'resolved_buyer';
  escrow.refundTxHash = txHash;
  escrow.refundAmount = refundAmount;
  escrow.refundedAt = new Date();
  escrow.disputeResolvedBy = adminUserId;
  escrow.disputeNotes = notes || 'Admin refund';
  escrow.disputeResolvedAt = new Date();
  await escrow.save();

  return { success: true, txHash, refundAmount };
}

async function refundSolana(escrow, refundAmount) {
  const { Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');

  const privateKeyStr = process.env.ESCROW_SOLANA_PRIVATE_KEY;
  if (!privateKeyStr) throw new Error('Escrow Solana private key not configured');
  if (!escrow.buyerWalletAddress) throw new Error('Buyer wallet address not stored');

  const escrowKeypair = loadSolanaKeypair(privateKeyStr);

  const buyerPubkey = new PublicKey(escrow.buyerWalletAddress);
  const { blockhash } = await solanaRpcCall('getLatestBlockhash', [{ commitment: 'confirmed' }])
    .then(r => r.value || r);

  const transaction = new Transaction();

  if (escrow.token === 'USDC') {
    const { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');
    const mint = new PublicKey(getSolanaUsdcMint());
    const fromATA = await getAssociatedTokenAddress(mint, escrowKeypair.publicKey);
    const toATA = await getAssociatedTokenAddress(mint, buyerPubkey);

    const acctInfo = await solanaRpcCall('getAccountInfo', [toATA.toString(), { encoding: 'base64' }]);
    if (!acctInfo?.value) {
      transaction.add(createAssociatedTokenAccountInstruction(escrowKeypair.publicKey, toATA, buyerPubkey, mint));
    }

    const amountUnits = Math.floor(refundAmount * 1e6);
    transaction.add(createTransferInstruction(fromATA, toATA, escrowKeypair.publicKey, amountUnits));
  } else {
    const lamports = Math.floor(refundAmount * LAMPORTS_PER_SOL);
    transaction.add(SystemProgram.transfer({
      fromPubkey: escrowKeypair.publicKey,
      toPubkey: buyerPubkey,
      lamports
    }));
  }

  transaction.recentBlockhash = blockhash;
  transaction.feePayer = escrowKeypair.publicKey;
  transaction.sign(escrowKeypair);

  const serialized = transaction.serialize();
  const base64Tx = serialized.toString('base64');

  const signature = await solanaRpcCall('sendTransaction', [base64Tx, { encoding: 'base64', preflightCommitment: 'confirmed' }]);

  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    const statusResult = await solanaRpcCall('getSignatureStatuses', [[signature]]);
    const status = statusResult?.value?.[0];
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
      return signature;
    }
    if (status?.err) throw new Error('Refund transaction failed: ' + JSON.stringify(status.err));
    await new Promise(r => setTimeout(r, 2000));
  }

  throw new Error('Refund transaction confirmation timeout');
}

async function refundEvm(escrow, refundAmount) {
  const { ethers } = require('ethers');

  const privateKey = process.env.ESCROW_EVM_PRIVATE_KEY;
  if (!privateKey) throw new Error('Escrow EVM private key not configured');
  if (!escrow.buyerWalletAddress) throw new Error('Buyer wallet address not stored');

  const rpcUrl = getEvmRpc(escrow.chain);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  if (escrow.token === 'USDC') {
    const usdcAddress = getUsdcAddress(escrow.chain);
    const abi = ['function transfer(address to, uint256 amount) returns (bool)', 'function decimals() view returns (uint8)'];
    const contract = new ethers.Contract(usdcAddress, abi, wallet);
    const decimals = await contract.decimals();
    const amountUnits = ethers.parseUnits(refundAmount.toFixed(6), decimals);

    const tx = await contract.transfer(escrow.buyerWalletAddress, amountUnits);
    const receipt = await tx.wait();
    if (receipt.status !== 1) throw new Error('EVM refund transaction failed');
    return tx.hash;
  } else {
    const amountWei = ethers.parseEther(refundAmount.toString());
    const tx = await wallet.sendTransaction({ to: escrow.buyerWalletAddress, value: amountWei });
    const receipt = await tx.wait();
    if (receipt.status !== 1) throw new Error('EVM refund transaction failed');
    return tx.hash;
  }
}

async function adminResolveForSeller(escrowId, adminUserId, notes) {
  return await releaseToSellerWithAdmin(escrowId, adminUserId, notes);
}

async function releaseToSellerWithAdmin(escrowId, adminUserId, notes) {
  const escrow = await FreelancerEscrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');
  if (!['funded', 'disputed'].includes(escrow.status)) {
    throw new Error('Escrow cannot be released in current status: ' + escrow.status);
  }

  // Transition disputed → funded so releaseToSeller can process it
  if (escrow.status === 'disputed') {
    escrow.status = 'funded';
    await escrow.save();
  }

  const result = await releaseToSeller(escrowId);

  // Re-fetch from DB since releaseToSeller modified the document
  const updatedEscrow = await FreelancerEscrow.findById(escrowId);
  updatedEscrow.status = 'resolved_seller';
  updatedEscrow.disputeResolvedBy = adminUserId;
  updatedEscrow.disputeNotes = notes || 'Admin resolved in favor of seller';
  updatedEscrow.disputeResolvedAt = new Date();
  await updatedEscrow.save();

  return result;
}

module.exports = {
  verifyDeposit,
  releaseToSeller,
  adminRefund,
  adminResolveForSeller,
  getEvmRpc,
  getUsdcAddress,
  getSolanaUsdcMint,
  ESCROW_MODE
};
