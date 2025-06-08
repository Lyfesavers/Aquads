// Official Token and Protocol Contract Addresses for Ethereum Mainnet
const tokenAddresses = {
  // Base Tokens (properly checksummed)
  USDC: '0xA0b86a33E6431e5aA8560395C13C9F33e8bbA543', // Official Circle USDC
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Official Tether USDT  
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',  // Official MakerDAO DAI
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Official Wrapped ETH

  // Compound V3 - Official cUSDCv3 (Comet) Contract
  COMPOUND_V3: {
    CUSDC: '0xc3d688B66703497DAA19211EEdff47f25384cdc3', // Main cUSDCv3 proxy
    COMET: '0xc3d688B66703497DAA19211EEdff47f25384cdc3'  // Same as above
  },

  // Aave V3 - Official Pool Contract  
  AAVE_V3: {
    POOL: '0x87870Bce3F226b9aBc9294c6a9E536fCBd47c29f',        // Main Aave V3 Pool
    AUSDC: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',       // aUSDC token
    AUSDT: '0x23878914EFE38d27C4D67Ab83ed1b93A74D4086a',       // aUSDT token 
    ADAI: '0x018008bfb33d285247A21d44E50697654f754e63'        // aDAI token
  },

  // Yearn V2 - Registry contracts to find individual vaults
  YEARN_V2: {
    REGISTRY: '0xE15461B18EE31b7379019Dc523231C57d1Cbc18c',     // Vault Registry
    RELEASE_REGISTRY: '0x7cB5aBeB0De8F6F46a27329B9Ef54Ce10e47f1e2', // Release Registry
    // Example USDC vault (Note: Use registry to find current active vaults)
    USDC_VAULT: '0xa354F35829Ae975e850e23e9615b11Da1B3dC4DE'    // yvUSDC
  },

  // Protocol Helpers
  MULTICALL: '0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696',     // Multicall3
  ENS_RESOLVER: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41'    // ENS Public Resolver
};

export default tokenAddresses; 