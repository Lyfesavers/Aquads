/**
 * Known third-party LP locker contracts / programs (public on-chain).
 * Used to verify lock creation txs without paid APIs.
 */

const UNCRYPT_LP_LOCKER = '0x663A5C229c09B049E36dCc11A0123486EcCd6341';
const TEAM_FINANCE_LP_LOCKER = '0xC9882dF237647C772777A2EEF602fE91AA12d339';
const PINK_LOCK_LP_LOCKER = '0x40799357520FA8327d74A163D32474021b9A3780';

/** @type {Record<string, string[]>} */
const EVM_LP_LOCKERS_BY_CHAIN = {
  ethereum: [UNCRYPT_LP_LOCKER, TEAM_FINANCE_LP_LOCKER, PINK_LOCK_LP_LOCKER],
  bsc: [PINK_LOCK_LP_LOCKER, TEAM_FINANCE_LP_LOCKER, UNCRYPT_LP_LOCKER],
  base: [TEAM_FINANCE_LP_LOCKER, UNCRYPT_LP_LOCKER],
  polygon: [UNCRYPT_LP_LOCKER, TEAM_FINANCE_LP_LOCKER, PINK_LOCK_LP_LOCKER],
  arbitrum: [UNCRYPT_LP_LOCKER, TEAM_FINANCE_LP_LOCKER],
  avalanche: [UNCRYPT_LP_LOCKER, TEAM_FINANCE_LP_LOCKER],
  optimism: [UNCRYPT_LP_LOCKER, TEAM_FINANCE_LP_LOCKER],
  fantom: [UNCRYPT_LP_LOCKER],
  cronos: [UNCRYPT_LP_LOCKER],
  pulsechain: [PINK_LOCK_LP_LOCKER],
};

/** Maps ad blockchain slug → EVM RPC key in server/config/rpc.js */
const EVM_CHAIN_RPC_KEYS = {
  ethereum: 'ethereum',
  ethereumpow: 'ethereum',
  bsc: 'bnb',
  opbnb: 'bnb',
  base: 'base',
  polygon: 'polygon',
  arbitrum: 'arbitrum',
};

const STREAMFLOW_PROGRAM_ID = 'strmRqUCoQUgGUan5YzcUZb2EQhHu6qN2F2ZWF1pQmK';
const STAKEPOINT_PROGRAM_ID = 'gLHaGJsZ6G7AXZxoDL9EsSWkRbKAWhFHi73gVfNXuzK';
const RAYDIUM_LP_LOCK_PROGRAM_ID = 'LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE';

/** @type {Record<string, { provider: string, permanent?: boolean }>} */
const SOLANA_LOCK_PROGRAM_META = {
  [STREAMFLOW_PROGRAM_ID]: { provider: 'streamflow', permanent: false },
  [STAKEPOINT_PROGRAM_ID]: { provider: 'stakepoint', permanent: false },
  [RAYDIUM_LP_LOCK_PROGRAM_ID]: { provider: 'raydium', permanent: true },
};

const SOLANA_LOCK_PROGRAMS = Object.keys(SOLANA_LOCK_PROGRAM_META);

const SUPPORTED_LOCKER_NAMES =
  'Team Finance, Unicrypt, PinkLock, Streamflow, StakePoint, or Raydium Burn & Earn';

const EVM_VERIFY_CHAINS = new Set(Object.keys(EVM_LP_LOCKERS_BY_CHAIN));

function isEvmChain(blockchain) {
  const chain = String(blockchain || '').toLowerCase();
  return EVM_VERIFY_CHAINS.has(chain) || Boolean(EVM_CHAIN_RPC_KEYS[chain]);
}

function getEvmLockers(blockchain) {
  const chain = String(blockchain || '').toLowerCase();
  return EVM_LP_LOCKERS_BY_CHAIN[chain] || [UNCRYPT_LP_LOCKER, TEAM_FINANCE_LP_LOCKER, PINK_LOCK_LP_LOCKER];
}

function getEvmRpcKey(blockchain) {
  const chain = String(blockchain || '').toLowerCase();
  return EVM_CHAIN_RPC_KEYS[chain] || null;
}

module.exports = {
  EVM_LP_LOCKERS_BY_CHAIN,
  EVM_CHAIN_RPC_KEYS,
  STREAMFLOW_PROGRAM_ID,
  STAKEPOINT_PROGRAM_ID,
  RAYDIUM_LP_LOCK_PROGRAM_ID,
  SOLANA_LOCK_PROGRAM_META,
  SOLANA_LOCK_PROGRAMS,
  SUPPORTED_LOCKER_NAMES,
  EVM_VERIFY_CHAINS,
  isEvmChain,
  getEvmLockers,
  getEvmRpcKey,
};
