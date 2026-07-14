function getHunterAquaPayReadiness(aquaPay) {
  const missing = [];

  if (!aquaPay?.isEnabled) {
    missing.push('AquaPay activation');
  }

  if (!aquaPay?.wallets?.solana?.trim()) {
    missing.push('Solana wallet address');
  }

  if (!aquaPay?.wallets?.ethereum?.trim()) {
    missing.push('EVM wallet address');
  }

  return {
    ready: missing.length === 0,
    missing
  };
}

function bountyAquaPayReadinessError(missing) {
  return `Set up AquaPay before participating in bounties. Required: ${missing.join(', ')}.`;
}

module.exports = {
  getHunterAquaPayReadiness,
  bountyAquaPayReadinessError
};
