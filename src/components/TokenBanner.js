import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import logger from '../utils/logger';
import Modal from './Modal';

// Move formatting functions outside component to prevent recreation on each render
const formatVolume = (volume) => {
  if (volume >= 1000000000) {
    return `$${(volume / 1000000000).toFixed(2)}B`;
  } else if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(2)}M`;
  } else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(2)}K`;
  }
  return `$${volume.toFixed(2)}`;
};

const formatPrice = (price) => {
  const numPrice = Number(price);
  if (isNaN(numPrice)) return '$0.00';

  try {
    if (numPrice < 0.0001) {
      return `$${numPrice.toExponential(2)}`;
    } else if (numPrice < 1) {
      return `$${numPrice.toFixed(4)}`;
    } else if (numPrice > 1000) {
      return `$${numPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
    return `$${numPrice.toFixed(2)}`;
  } catch (error) {
    return '$0.00';
  }
};

const formatPercentage = (percentage) => {
  const value = parseFloat(percentage);
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

// Map GeckoTerminal network IDs to blockchain names for AquaSwap
const mapNetworkToBlockchain = (networkId) => {
  const networkMap = {
    // Main blockchains - map to DEXScreener expected values
    'eth': 'ethereum',
    'ethereum': 'ethereum',
    'solana': 'solana',
    'bsc': 'bsc',
    'polygon_pos': 'polygon',
    'arbitrum': 'arbitrum',
    'avalanche': 'avalanche',
    'base': 'base',
    'optimism': 'optimism',
    'fantom': 'fantom',
    'sui': 'sui',
    'ton': 'ton', // DEXScreener supports TON
    'cronos': 'cronos',
    'moonbeam': 'moonbeam',
    'celo': 'celo',
    'kava': 'kava',
    'aurora': 'aurora',
    'harmony': 'harmony',
    'near': 'near',
    'cosmos': 'cosmos',
    'aptos': 'aptos',
    'flow': 'flow',
    'cardano': 'cardano',
    'polkadot': 'polkadot',
    'stellar': 'stellar',
    'algorand': 'algorand',
    'hedera': 'hedera',
    'icp': 'icp',
    'elrond': 'elrond',
    'terra': 'terra',
    'xrp': 'xrp',
    'litecoin': 'litecoin',
    'bitcoin': 'bitcoin',
    'tron': 'tron',
    'multiversx': 'elrond',
    'kaspa': 'kaspa',
    'tezos': 'tezos',
    'zilliqa': 'zilliqa',
    'oasis': 'oasis',
    'stacks': 'stacks',
    'kadena': 'kadena',
    'injective': 'injective',
    'moonriver': 'moonriver',
    'acala': 'acala',
    'astar': 'astar',
    'shiden': 'shiden',
    'karura': 'karura',
    'bifrost': 'bifrost',
    'calamari': 'calamari',
    'altair': 'altair',
    'heiko': 'heiko',
    'parallel': 'parallel',
    'robonomics': 'robonomics',
    'darwinia': 'darwinia',
    'crust': 'crust',
    'phala': 'phala',
    'khala': 'khala',
    'kilt': 'kilt',
    'sora': 'sora',
    'zeitgeist': 'zeitgeist',
    'subsocial': 'subsocial',
    'substrate': 'substrate',
    'edgeware': 'edgeware',
    'polymesh': 'polymesh',
    'centrifuge': 'centrifuge',
    'equilibrium': 'equilibrium'
    // Exclude Ronin since DEXScreener doesn't support it
    // 'roni': 'ronin',
    // 'ronin': 'ronin'
  };
  return networkMap[networkId] || networkId;
};

const TokenBanner = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedChain, setSelectedChain] = useState('all');

  // Memoize fetchTokens to prevent recreation
  const fetchTokens = useCallback(async () => {
    try {
      let allTokens = [];
      
      // Fetch multiple pages from GeckoTerminal to get 50+ trending tokens
      for (let page = 1; page <= 3; page++) {
        const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/trending_pools?page=${page}`);
        
        if (!response.ok) {
          logger.warn(`Failed to fetch page ${page}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        logger.info(`GeckoTerminal Page ${page} Response:`, data);

        if (!data.data || data.data.length === 0) {
          logger.warn(`No data on page ${page}`);
          break;
        }

        // Process tokens from this page
        const pageTokens = data.data.map((pool, index) => {
          const attrs = pool.attributes || {};
          
          // Extract token symbol from pool name (e.g., "PENGU / SOL" -> "PENGU")
          const poolName = attrs.name || '';
          const tokenSymbol = poolName.split(' / ')[0] || poolName.split('/')[0] || 'TOKEN';
          const tokenName = tokenSymbol; // Use symbol as name since we don't have full token data
          const networkId = pool.relationships?.network?.data?.id || 'unknown';
          
          // Format chain name for display
          const formatChain = (chain) => {
            const chainMap = {
              'eth': 'ETH',
              'ethereum': 'ETH',
              'solana': 'SOL',
              'bsc': 'BSC',
              'polygon_pos': 'POLY',
              'arbitrum': 'ARB',
              'avalanche': 'AVAX',
              'base': 'BASE',
              'optimism': 'OP',
              'fantom': 'FTM',
              'sui': 'SUI',
              'ton': 'TON',
              'cronos': 'CRO',
              'moonbeam': 'MOON',
              'celo': 'CELO',
              'kava': 'KAVA',
              'aurora': 'AURORA',
              'harmony': 'HARMONY',
              'near': 'NEAR',
              'cosmos': 'COSMOS',
              'aptos': 'APTOS',
              'flow': 'FLOW',
              'cardano': 'ADA',
              'polkadot': 'DOT',
              'stellar': 'XLM',
              'algorand': 'ALGO',
              'hedera': 'HBAR',
              'icp': 'ICP',
              'elrond': 'EGLD',
              'terra': 'LUNA',
              'xrp': 'XRP',
              'litecoin': 'LTC',
              'bitcoin': 'BTC',
              'tron': 'TRX',
              'multiversx': 'EGLD',
              'kaspa': 'KAS',
              'tezos': 'XTZ',
              'zilliqa': 'ZIL',
              'oasis': 'ROSE',
              'stacks': 'STX',
              'kadena': 'KDA',
              'injective': 'INJ',
              'moonriver': 'MOVR',
              'acala': 'ACA',
              'astar': 'ASTR',
              'shiden': 'SDN',
              'karura': 'KAR',
              'bifrost': 'BFC',
              'calamari': 'KMA',
              'altair': 'AIR',
              'heiko': 'HKO',
              'parallel': 'PARA',
              'robonomics': 'XRT',
              'darwinia': 'RING',
              'crust': 'CRU',
              'phala': 'PHA',
              'khala': 'KHA',
              'kilt': 'KILT',
              'sora': 'XOR',
              'zeitgeist': 'ZTG',
              'subsocial': 'SUB',
              'substrate': 'SUB',
              'edgeware': 'EDG',
              'polymesh': 'POLYX',
              'centrifuge': 'CFG',
              'equilibrium': 'EQ'
            };
            return chainMap[chain] || chain.toUpperCase().slice(0, 4);
          };
          
          return {
            id: pool.id,
            symbol: tokenSymbol.trim().toUpperCase(),
            name: tokenName,
            price: parseFloat(attrs.base_token_price_usd) || 0,
            priceChange24h: parseFloat(attrs.price_change_percentage?.h24) || 0,
            marketCap: parseFloat(attrs.fdv_usd) || parseFloat(attrs.market_cap_usd) || 0,
            chain: formatChain(networkId), // Show chain instead of logo
            rank: (page - 1) * 20 + index + 1,
            chainId: networkId,
            volume24h: parseFloat(attrs.volume_usd?.h24) || 0,
            poolAddress: attrs.address
          };
        });

        // Filter valid tokens and add to our collection
        const validTokens = pageTokens.filter(token => 
          token.symbol && 
          token.symbol !== 'TOKEN' && 
          token.symbol.length > 0 && 
          token.symbol.length <= 15 && // Allow longer symbols for some tokens
          /^[A-Za-z0-9$_-]+$/.test(token.symbol) && // Allow common token symbol characters
          token.price > 0 && // Must have a valid price
          token.chainId !== 'roni' && // Exclude Ronin tokens since DEXScreener doesn't support them
          token.chainId !== 'ronin' // Exclude Ronin tokens since DEXScreener doesn't support them
        );

        allTokens = allTokens.concat(validTokens);
        
        // Add delay between pages to respect rate limits
        if (page < 3) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Take top 50 tokens in original trending order
      const finalTokens = allTokens.slice(0, 50);
      logger.info(`Fetched ${finalTokens.length} trending tokens from GeckoTerminal`);
      setTokens(finalTokens);

    } catch (error) {
      logger.error('Error fetching GeckoTerminal trending tokens:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
    // Reduce polling frequency to reduce JS execution
    const interval = setInterval(fetchTokens, 120000); // Fetch every 2 minutes instead of every minute
    return () => clearInterval(interval);
  }, [fetchTokens]);

  // Get unique chains for filter dropdown
  const uniqueChains = useMemo(() => {
    const chains = [...new Set(tokens.map(token => token.chain))];
    return chains.sort();
  }, [tokens]);

  // Filter tokens based on selected chain
  const filteredTokens = useMemo(() => {
    if (selectedChain === 'all') {
      return tokens;
    }
    return tokens.filter(token => token.chain === selectedChain);
  }, [tokens, selectedChain]);

  if (loading) {
    return (
      <div className="h-12 bg-gray-800 border-y border-blue-500/20">
        <div className="flex items-center justify-center h-full">
          <span className="text-blue-400">Loading trending DEX tokens (click to view in AquaSwap)...</span>
        </div>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="h-12 bg-gray-800 border-y border-blue-500/20">
        <div className="flex items-center justify-center h-full">
          <span className="text-gray-400">No trending tokens available</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative h-12 bg-gray-800">
        {/* View All Tokens Button */}
        <button
          onClick={() => setShowTokenModal(true)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-blue-600/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-full p-1.5 transition-colors duration-200"
          title="View all trending tokens"
        >
          <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
        
        <div className="flex items-center h-full overflow-hidden relative z-0 pr-12">
          <div className="flex animate-scroll whitespace-nowrap">
            {tokens.concat(tokens).map((token, index) => (
              <Link
                key={`${token.symbol}-${index}`}
                to={`/aquaswap?token=${token.poolAddress}&blockchain=${mapNetworkToBlockchain(token.chainId)}`}
                className="inline-flex items-center space-x-2 px-6 h-full hover:bg-blue-500/10 transition-colors"
              >
                <span className="inline-flex items-center justify-center w-[30px] h-[27px] bg-green-600/20 border border-green-500/30 rounded text-xs font-bold text-green-300">
                  #{token.rank}
                </span>
                <span className="inline-flex items-center justify-center w-[50px] h-[27px] bg-blue-600/20 border border-blue-500/30 rounded text-xs font-bold text-blue-300">
                  {token.chain}
                </span>
                <span className="font-medium text-white">{token.symbol}</span>
                <span className="text-gray-300">{formatPrice(token.price)}</span>
                <span className={`${
                  token.priceChange24h >= 0 
                    ? 'text-green-400' 
                    : 'text-red-400'
                }`}>
                  {formatPercentage(token.priceChange24h)}
                </span>
                <span className="text-gray-400 text-sm">
                  MCap: {formatVolume(token.marketCap)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Full Screen Token Modal */}
      {showTokenModal && (
        <Modal onClose={() => setShowTokenModal(false)} fullScreen={true}>
          <div className="w-full h-full bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto p-4 sm:p-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-blue-400 mb-2">
                  Trending Tokens
                </h1>
                <p className="text-gray-400 text-lg">
                  All trending tokens from DEX platforms
                </p>
              </div>

              {/* Chain Filter */}
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <select
                    value={selectedChain}
                    onChange={(e) => setSelectedChain(e.target.value)}
                    className="bg-gray-800/50 border border-gray-600/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  >
                    <option value="all" className="bg-gray-800 text-white">
                      All Chains ({tokens.length})
                    </option>
                    {uniqueChains.map(chain => (
                      <option key={chain} value={chain} className="bg-gray-800 text-white">
                        {chain} ({tokens.filter(token => token.chain === chain).length})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTokens.map((token, index) => (
                  <Link
                    key={`modal-${token.symbol}-${index}`}
                    to={`/aquaswap?token=${token.poolAddress}&blockchain=${mapNetworkToBlockchain(token.chainId)}`}
                    className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 rounded-lg p-4 transition-all duration-200 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-green-600/20 border border-green-500/30 rounded text-sm font-bold text-green-300">
                          #{token.rank}
                        </span>
                        <span className="inline-flex items-center justify-center w-12 h-8 bg-blue-600/20 border border-blue-500/30 rounded text-sm font-bold text-blue-300">
                          {token.chain}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-lg text-white">{token.symbol}</span>
                        <span className="text-gray-300 text-sm">{formatPrice(token.price)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className={`${
                          token.priceChange24h >= 0 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        } font-medium`}>
                          {formatPercentage(token.priceChange24h)}
                        </span>
                        <span className="text-gray-400">
                          MCap: {formatVolume(token.marketCap)}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Volume: {formatVolume(token.volume24h)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {filteredTokens.length === 0 && (
                <div className="text-center mt-8 text-gray-400">
                  <p>No tokens found for the selected chain.</p>
                </div>
              )}

              <div className="text-center mt-8 text-gray-400">
                <p>Click any token to view it in AquaSwap</p>
                {selectedChain !== 'all' && (
                  <button
                    onClick={() => setSelectedChain('all')}
                    className="mt-2 text-blue-400 hover:text-blue-300 underline"
                  >
                    Show all chains
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

// Export as memoized component
export default memo(TokenBanner); 