import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, Link } from 'react-router-dom';
import { LiFiWidget, useWidgetEvents, WidgetEvent } from '@lifi/widget';
import { FaShareAlt } from 'react-icons/fa';
import logger from '../utils/logger';
import BannerDisplay from './BannerDisplay';
import EmbedCodeGenerator from './EmbedCodeGenerator';
import BuyCryptoModal from './BuyCryptoModal';
import ShillTemplatesModal from './ShillTemplatesModal';
import TradingSignals, { SIGNAL_TYPES } from './TradingSignals';
import CurrencyConverter from './CurrencyConverter';
import { getGasPrice, formatGasPrice, getGasPriceLevel, getGasPriceLevelText } from '../services/gasPriceService';

import './AquaSwap.css';

// Constants - using the same fee structure as the current swap
const FEE_PERCENTAGE = 0.005; // 0.5% fee
const ETH_FEE_WALLET = process.env.REACT_APP_FEE_WALLET; // Ethereum wallet address
const SOLANA_FEE_WALLET = process.env.REACT_APP_SOLANA_FEE_WALLET; // Solana wallet address
const SUI_FEE_WALLET = process.env.REACT_APP_SUI_FEE_WALLET; // SUI wallet address

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Fallback popular token examples if ads can't be loaded
const FALLBACK_TOKEN_EXAMPLES = [];

const CHAIN_TO_BLOCKCHAIN_PARAM = {
  'ether': 'ethereum',
  'eth': 'ethereum',
  'ethereum': 'ethereum',
  'bnb': 'bsc',
  'bsc': 'bsc',
  'polygon': 'polygon',
  'matic': 'polygon',
  'solana': 'solana',
  'sol': 'solana',
  'avalanche': 'avalanche',
  'avax': 'avalanche',
  'arbitrum': 'arbitrum',
  'arb': 'arbitrum',
  'optimism': 'optimism',
  'op': 'optimism',
  'base': 'base',
  'fantom': 'fantom',
  'ftm': 'fantom',
  'cronos': 'cronos',
  'celo': 'celo',
  'harmony': 'harmony',
  'near': 'near',
  'sui': 'sui',
  'aptos': 'aptos',
  'ton': 'ton',
  'stellar': 'stellar',
  'algorand': 'algorand',
  'hedera': 'hedera',
  'icp': 'icp',
  'elrond': 'elrond',
  'multiversx': 'elrond',
  'terra': 'terra',
  'xrp': 'xrp',
  'litecoin': 'litecoin',
  'bitcoin': 'bitcoin',
  'tron': 'tron',
  'tezos': 'tezos',
  'zilliqa': 'zilliqa',
  'oasis': 'oasis',
  'stacks': 'stacks',
  'kadena': 'kadena',
  'injective': 'injective',
  'kava': 'kava',
  'moonriver': 'moonriver',
  'moonbeam': 'moonbeam',
  'flow': 'flow',
  'cardano': 'cardano',
  'polkadot': 'polkadot',
  'cosmos': 'cosmos',
  'kaspa': 'kaspa'
};

const AquaSwap = ({ currentUser, showNotification }) => {
  const navigate = useNavigate();
  const [chartProvider, setChartProvider] = useState('tradingview');
  const [tokenSearch, setTokenSearch] = useState('');
  const [selectedChain, setSelectedChain] = useState('ether');
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const [popularTokens, setPopularTokens] = useState(FALLBACK_TOKEN_EXAMPLES);
  const [isSwapCollapsed, setIsSwapCollapsed] = useState(false);
  
  // New state for enhanced search functionality
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [searchInput, setSearchInput] = useState(''); // Separate state for search input

  // Token pairs navigation state
  const [tokenPairs, setTokenPairs] = useState([]); // Store all pairs for selected token
  const [activeTokenName, setActiveTokenName] = useState(''); // Track which token's pairs we're showing
  const [activeTokenSymbol, setActiveTokenSymbol] = useState(''); // Track the token ticker symbol

  // Arbitrage opportunities state
  const [arbitrageByQuote, setArbitrageByQuote] = useState([]); // Best quote tokens for arbitrage
  const [suggestedPairs, setSuggestedPairs] = useState([]); // Suggested pairs to create for arb potential

  // Gas price state
  const [gasPrice, setGasPrice] = useState(null);
  const [loadingGasPrice, setLoadingGasPrice] = useState(false);
  
  // Points earned popup state
  const [showPointsPopup, setShowPointsPopup] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  // Buy Crypto Modal state
  const [showBuyCryptoModal, setShowBuyCryptoModal] = useState(false);

  // Shill Templates Modal state
  const [showShillModal, setShowShillModal] = useState(false);

  // Trading Signals state
  const [showSignalsPanel, setShowSignalsPanel] = useState(false);
  const [currentSignal, setCurrentSignal] = useState(null);
  const signalButtonRef = useRef(null);

  // Clear signal when switching chart providers or token changes
  useEffect(() => {
    if (chartProvider !== 'dexscreener' || !tokenSearch) {
      setCurrentSignal(null);
      setShowSignalsPanel(false);
    }
  }, [chartProvider, tokenSearch]);

  // Clear arbitrage data when token changes (prevents stale data from previous token)
  useEffect(() => {
    // Clear arbitrage and suggestions immediately when tokenSearch changes
    setArbitrageByQuote([]);
    setSuggestedPairs([]);
    setTokenPairs([]);
  }, [tokenSearch]);

  // Calculate arbitrage opportunities by quote token when pairs change
  useEffect(() => {
    // Popular quote tokens for pairing (ranked by volume/liquidity potential)
    const popularQuoteTokens = [
      { symbol: 'WETH', name: 'Wrapped Ether', chains: ['ethereum', 'arbitrum', 'optimism', 'base'], dexes: ['uniswap', 'sushiswap', 'pancakeswap'] },
      { symbol: 'ETH', name: 'Ether', chains: ['ethereum', 'arbitrum', 'optimism', 'base'], dexes: ['uniswap', 'sushiswap'] },
      { symbol: 'USDC', name: 'USD Coin', chains: ['ethereum', 'solana', 'bsc', 'polygon', 'arbitrum', 'base'], dexes: ['uniswap', 'raydium', 'pancakeswap'] },
      { symbol: 'USDT', name: 'Tether', chains: ['ethereum', 'bsc', 'tron', 'polygon'], dexes: ['uniswap', 'pancakeswap', 'curve'] },
      { symbol: 'WBNB', name: 'Wrapped BNB', chains: ['bsc'], dexes: ['pancakeswap', 'biswap', 'apeswap'] },
      { symbol: 'SOL', name: 'Solana', chains: ['solana'], dexes: ['raydium', 'orca', 'jupiter'] },
      { symbol: 'WSOL', name: 'Wrapped SOL', chains: ['solana'], dexes: ['raydium', 'orca', 'jupiter'] },
      { symbol: 'WMATIC', name: 'Wrapped Matic', chains: ['polygon'], dexes: ['quickswap', 'sushiswap', 'uniswap'] },
      { symbol: 'WBTC', name: 'Wrapped Bitcoin', chains: ['ethereum', 'polygon', 'arbitrum'], dexes: ['uniswap', 'sushiswap', 'curve'] },
      { symbol: 'DAI', name: 'Dai Stablecoin', chains: ['ethereum', 'polygon', 'arbitrum'], dexes: ['uniswap', 'curve', 'sushiswap'] },
    ];

    // Popular DEXes for creating pairs
    const popularDexes = [
      { id: 'uniswap', name: 'Uniswap', chains: ['ethereum', 'arbitrum', 'optimism', 'base', 'polygon'] },
      { id: 'pancakeswap', name: 'PancakeSwap', chains: ['bsc', 'ethereum', 'arbitrum'] },
      { id: 'sushiswap', name: 'SushiSwap', chains: ['ethereum', 'arbitrum', 'polygon', 'avalanche'] },
      { id: 'raydium', name: 'Raydium', chains: ['solana'] },
      { id: 'orca', name: 'Orca', chains: ['solana'] },
      { id: 'quickswap', name: 'QuickSwap', chains: ['polygon'] },
      { id: 'traderjoe', name: 'Trader Joe', chains: ['avalanche', 'arbitrum'] },
      { id: 'camelot', name: 'Camelot', chains: ['arbitrum'] },
      { id: 'aerodrome', name: 'Aerodrome', chains: ['base'] },
    ];

    if (tokenPairs.length === 0) {
      setArbitrageByQuote([]);
      setSuggestedPairs([]);
      return;
    }

    // Group pairs by quote token (ETH, USDC, WBTC, etc.)
    const pairsByQuote = {};
    const existingQuoteTokens = new Set();
    const existingDexes = new Set();
    const existingChains = new Set();
    
    tokenPairs.forEach(pair => {
      const quoteSymbol = pair.quoteToken?.symbol || 'Unknown';
      existingQuoteTokens.add(quoteSymbol.toUpperCase());
      existingDexes.add(pair.dexId?.toLowerCase());
      existingChains.add(pair.chainId?.toLowerCase());
      
      if (!pairsByQuote[quoteSymbol]) {
        pairsByQuote[quoteSymbol] = [];
      }
      pairsByQuote[quoteSymbol].push(pair);
    });

    // Calculate arbitrage opportunity for each quote token
    const opportunities = [];
    
    Object.entries(pairsByQuote).forEach(([quoteSymbol, pairs]) => {
      if (pairs.length < 2) return; // Need at least 2 DEXes to arbitrage
      
      // Find min and max prices across DEXes for this quote token
      const validPairs = pairs.filter(p => parseFloat(p.priceUsd) > 0);
      if (validPairs.length < 2) return;
      
      const prices = validPairs.map(p => ({
        price: parseFloat(p.priceUsd),
        dex: p.dexId,
        chain: p.chainId,
        liquidity: p.liquidityUsd || 0,
        pair: p
      }));
      
      const minPrice = prices.reduce((min, p) => p.price < min.price ? p : min, prices[0]);
      const maxPrice = prices.reduce((max, p) => p.price > max.price ? p : max, prices[0]);
      
      // Calculate spread percentage
      const spread = ((maxPrice.price - minPrice.price) / minPrice.price) * 100;
      
      // Estimate fees (0.3% per DEX swap × 2 = 0.6%)
      const feePercentage = 0.6;
      const netSpread = spread - feePercentage;
      
      // Calculate effective liquidity (min of buy/sell pools)
      const effectiveLiquidity = Math.min(minPrice.liquidity, maxPrice.liquidity);
      
      // Determine risk tier based on liquidity and spread
      let riskTier = 'noarb';
      let riskLabel = '❌';
      let riskText = 'No Arb';
      
      if (netSpread > 0) {
        if (effectiveLiquidity >= 50000) {
          riskTier = 'hot';
          riskLabel = '🔥';
          riskText = 'HOT';
        } else if (effectiveLiquidity >= 10000) {
          riskTier = 'gem';
          riskLabel = '💎';
          riskText = 'GEM';
        } else if (effectiveLiquidity >= 1000) {
          riskTier = 'degen';
          riskLabel = '🎲';
          riskText = 'DEGEN';
        } else if (effectiveLiquidity >= 100) {
          riskTier = 'micro';
          riskLabel = '⚠️';
          riskText = 'MICRO';
        } else {
          riskTier = 'dust';
          riskLabel = '💀';
          riskText = 'DUST';
        }
      } else if (spread > 0.1) {
        riskTier = 'noarb';
        riskLabel = '📊';
        riskText = 'LOW';
      }
      
      if (spread > 0.05) {
        opportunities.push({
          quoteSymbol,
          spread: spread.toFixed(2),
          netSpread: netSpread.toFixed(2),
          buyDex: minPrice.dex,
          buyChain: minPrice.chain,
          buyPrice: minPrice.price,
          sellDex: maxPrice.dex,
          sellChain: maxPrice.chain,
          sellPrice: maxPrice.price,
          effectiveLiquidity,
          pairCount: validPairs.length,
          isCrossChain: minPrice.chain !== maxPrice.chain,
          riskTier,
          riskLabel,
          riskText,
          isProfitable: netSpread > 0
        });
      }
    });
    
    // Sort opportunities
    opportunities.sort((a, b) => {
      if (a.isProfitable && !b.isProfitable) return -1;
      if (!a.isProfitable && b.isProfitable) return 1;
      return parseFloat(b.netSpread) - parseFloat(a.netSpread);
    });
    
    setArbitrageByQuote(opportunities);

    // Generate suggested pairs if no/few arbitrage opportunities
    const suggestions = [];
    
    // Find quote tokens that only have 1 DEX (could add another for arb)
    Object.entries(pairsByQuote).forEach(([quoteSymbol, pairs]) => {
      if (pairs.length === 1) {
        const existingPair = pairs[0];
        const existingDex = existingPair.dexId?.toLowerCase();
        const existingChain = existingPair.chainId?.toLowerCase();
        
        // Suggest other DEXes on the same chain
        const suggestedDexes = popularDexes
          .filter(dex => 
            dex.chains.includes(existingChain) && 
            dex.id !== existingDex
          )
          .slice(0, 2);
        
        if (suggestedDexes.length > 0) {
          suggestions.push({
            type: 'add_dex',
            quoteSymbol,
            existingDex: existingPair.dexId,
            existingChain: existingPair.chainId,
            suggestedDexes: suggestedDexes.map(d => d.name),
            reason: `Add ${quoteSymbol} pair on another DEX to enable arbitrage`,
            priority: 'high',
            icon: '🎯'
          });
        }
      }
    });
    
    // Suggest popular quote tokens not yet paired
    const tokenChain = tokenPairs[0]?.chainId?.toLowerCase() || 'ethereum';
    
    popularQuoteTokens.forEach(quoteToken => {
      const isExisting = existingQuoteTokens.has(quoteToken.symbol);
      const isOnSameChain = quoteToken.chains.includes(tokenChain);
      
      if (!isExisting && isOnSameChain) {
        const relevantDexes = popularDexes
          .filter(dex => dex.chains.includes(tokenChain))
          .slice(0, 2)
          .map(d => d.name);
        
        suggestions.push({
          type: 'new_quote',
          quoteSymbol: quoteToken.symbol,
          quoteName: quoteToken.name,
          suggestedDexes: relevantDexes,
          chain: tokenChain,
          reason: `Popular trading pair with high volume potential`,
          priority: quoteToken.symbol === 'WETH' || quoteToken.symbol === 'USDC' ? 'high' : 'medium',
          icon: quoteToken.symbol === 'WETH' || quoteToken.symbol === 'ETH' ? '💎' : 
                quoteToken.symbol === 'USDC' || quoteToken.symbol === 'USDT' ? '💵' : '🔷'
        });
      }
    });
    
    // Sort suggestions: high priority first, then add_dex before new_quote
    suggestions.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      if (a.type === 'add_dex' && b.type !== 'add_dex') return -1;
      if (a.type !== 'add_dex' && b.type === 'add_dex') return 1;
      return 0;
    });
    
    setSuggestedPairs(suggestions.slice(0, 6)); // Limit to 6 suggestions
  }, [tokenPairs]);

  // Fetch all pairs for a token when tokenSearch changes (works for trending, bubbles, and search)
  useEffect(() => {
    const fetchPairsForToken = async () => {
      if (!tokenSearch || chartProvider !== 'dexscreener') {
        return;
      }
      
      // Check if it's a valid address format
      const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(tokenSearch) || 
                             /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenSearch) ||
                             /^[A-Za-z0-9]{32,50}$/.test(tokenSearch);
      
      if (!isValidAddress) {
        return;
      }

      try {
        let allPairs = [];
        let tokenAddress = tokenSearch;
        
        // First, try the tokens endpoint (works if tokenSearch is a token contract address)
        // This works regardless of chain
        const tokensResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenSearch}`);
        
        if (tokensResponse.ok) {
          const tokensData = await tokensResponse.json();
          if (tokensData.pairs && Array.isArray(tokensData.pairs) && tokensData.pairs.length > 0) {
            allPairs = tokensData.pairs;
          }
        }
        
        // If no pairs found, tokenSearch might be a PAIR address (from bubbles/trending)
        // Try the pairs endpoint with multiple chain formats
        if (allPairs.length === 0) {
          // Build list of chains to try
          const chainsToTry = [];
          
          if (selectedChain) {
            // Add the mapped chain first
            const mappedChain = CHAIN_TO_BLOCKCHAIN_PARAM[selectedChain];
            if (mappedChain) chainsToTry.push(mappedChain);
            if (selectedChain !== mappedChain) chainsToTry.push(selectedChain);
          }
          
          // Add common chains as fallback (most meme coins are on these)
          const commonChains = ['ethereum', 'bsc', 'solana', 'base', 'arbitrum', 'polygon', 'avalanche', 'optimism'];
          commonChains.forEach(chain => {
            if (!chainsToTry.includes(chain)) chainsToTry.push(chain);
          });
          
          // Try each chain until we find the pair
          for (const chainForApi of chainsToTry) {
            try {
              const pairsResponse = await fetch(`https://api.dexscreener.com/latest/dex/pairs/${chainForApi}/${tokenSearch}`);
              
              if (pairsResponse.ok) {
                const pairsData = await pairsResponse.json();
                const pairInfo = pairsData.pair || (pairsData.pairs && pairsData.pairs[0]);
                
                if (pairInfo && pairInfo.baseToken && pairInfo.baseToken.address) {
                  // Got the actual token address from the pair, now fetch ALL pairs for this token
                  tokenAddress = pairInfo.baseToken.address;
                  
                  const allPairsResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
                  if (allPairsResponse.ok) {
                    const allPairsData = await allPairsResponse.json();
                    if (allPairsData.pairs && Array.isArray(allPairsData.pairs) && allPairsData.pairs.length > 0) {
                      allPairs = allPairsData.pairs;
                      break; // Found pairs, stop trying other chains
                    }
                  }
                  
                  // If tokens endpoint didn't work, at least use the single pair we found
                  if (allPairs.length === 0 && pairInfo) {
                    allPairs = [pairInfo];
                    break;
                  }
                }
              }
            } catch (chainError) {
              // Continue to next chain
              continue;
            }
          }
        }
        
        // Also try the search endpoint as a last resort (searches by address)
        if (allPairs.length === 0) {
          try {
            const searchResponse = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${tokenSearch}`);
            if (searchResponse.ok) {
              const searchData = await searchResponse.json();
              if (searchData.pairs && Array.isArray(searchData.pairs) && searchData.pairs.length > 0) {
                // Filter to pairs that match our address (either as pair or token)
                const matchingPairs = searchData.pairs.filter(p => 
                  p.pairAddress?.toLowerCase() === tokenSearch.toLowerCase() ||
                  p.baseToken?.address?.toLowerCase() === tokenSearch.toLowerCase()
                );
                
                if (matchingPairs.length > 0) {
                  // If we found matching pairs, get the token address and fetch all pairs
                  const firstMatch = matchingPairs[0];
                  if (firstMatch.baseToken?.address) {
                    const allPairsResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${firstMatch.baseToken.address}`);
                    if (allPairsResponse.ok) {
                      const allPairsData = await allPairsResponse.json();
                      if (allPairsData.pairs && Array.isArray(allPairsData.pairs)) {
                        allPairs = allPairsData.pairs;
                      }
                    }
                  }
                  
                  // Fallback to search results if tokens endpoint failed
                  if (allPairs.length === 0) {
                    allPairs = matchingPairs;
                  }
                }
              }
            }
          } catch (searchError) {
            // Search failed, continue with whatever we have
          }
        }
        
        if (allPairs.length > 0) {
          // Process pairs similar to search results
          const processedPairs = allPairs
            .filter(pair => pair.pairAddress && pair.baseToken && pair.quoteToken)
            .map(pair => ({
              id: `${pair.chainId}-${pair.pairAddress}`,
              name: pair.baseToken.name,
              symbol: pair.baseToken.symbol,
              baseTokenAddress: pair.baseToken.address,
              pairAddress: pair.pairAddress,
              chainId: pair.chainId,
              dexId: pair.dexId,
              priceUsd: pair.priceUsd,
              volume24h: pair.volume?.h24 || 0,
              liquidityUsd: pair.liquidity?.usd || 0,
              priceChange24h: pair.priceChange?.h24 || 0,
              logo: pair.info?.imageUrl,
              url: pair.url,
              quoteToken: {
                name: pair.quoteToken.name,
                symbol: pair.quoteToken.symbol,
                address: pair.quoteToken.address
              },
              tradingPair: `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`
            }));

          // Only update if we got pairs and they're for a different token than currently stored
          if (processedPairs.length > 0) {
            const newTokenAddr = processedPairs[0]?.baseTokenAddress?.toLowerCase();
            const currentTokenAddr = tokenPairs[0]?.baseTokenAddress?.toLowerCase();
            
            if (tokenPairs.length === 0 || newTokenAddr !== currentTokenAddr) {
              setTokenPairs(processedPairs);
              
              // Also set token name/symbol
              if (processedPairs[0]) {
                setActiveTokenName(processedPairs[0].name);
                setActiveTokenSymbol(processedPairs[0].symbol);
              }
            }
          }
        }
      } catch (error) {
        logger.error('Error fetching pairs for token:', error);
      }
    };

    // Debounce the fetch to avoid too many API calls
    const timeoutId = setTimeout(fetchPairsForToken, 500);
    
    return () => clearTimeout(timeoutId);
  }, [tokenSearch, chartProvider, selectedChain, tokenPairs]);

  // Featured services state
  const [featuredServices, setFeaturedServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const tradingViewRef = useRef(null);
  const dexScreenerRef = useRef(null);
  const searchInputRef = useRef(null);

  // LiFi Widget Events Hook - THE CORRECT WAY to listen to widget events
  const widgetEvents = useWidgetEvents();

  // Listen for swap completion using the proper event hook
  useEffect(() => {
    const handleSwapComplete = (route) => {
      logger.info('Swap completed via widget event', { route });
      
      // Award 5 points if user is logged in
      if (currentUser) {
        // Get token from localStorage currentUser object (not a separate 'token' key)
        let token = null;
        try {
          const storedUser = localStorage.getItem('currentUser');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            token = userData.token;
          }
        } catch (error) {
          logger.error('Error parsing currentUser from localStorage:', error);
        }
        
        if (token) {
          fetch(`${API_URL}/api/points/swap-completed`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          .then(async response => {
            const data = await response.json().catch(() => ({}));
            
            // Check if response is ok before processing (same as extension)
            if (response.ok) {
              // Show custom popup modal for points earned
              if (data.success) {
                setPointsEarned(5);
                setShowPointsPopup(true);
                // Auto-dismiss after 4 seconds
                setTimeout(() => {
                  setShowPointsPopup(false);
                }, 4000);
                logger.info('✅ Points awarded successfully!');
              }
            } else if (response.status === 401) {
              // Token expired - user needs to log in again
              logger.warn('🔒 Session expired, cannot award points. User may need to log in again.');
              logger.error('Swap points API error:', {
                status: response.status,
                statusText: response.statusText,
                error: data.error || data.message || 'Unknown error'
              });
            } else {
              logger.error('❌ Swap points award failed:', {
                status: response.status,
                statusText: response.statusText,
                error: data.error || data.message || 'Unknown error',
                data: data
              });
            }
          })
          .catch(error => {
            logger.error('Error awarding swap points:', error);
            // Still show success notification for the swap itself
            if (showNotification) {
              showNotification('✅ Swap completed successfully!', 'success');
            }
          });
        } else {
          if (showNotification) {
            showNotification('✅ Swap completed successfully!', 'success');
          }
        }
      } else {
        // User not logged in, just show swap success
        if (showNotification) {
          showNotification('✅ Swap completed successfully!', 'success');
        }
      }
    };

    // Subscribe to the RouteExecutionCompleted event
    if (widgetEvents) {
      widgetEvents.on(WidgetEvent.RouteExecutionCompleted, handleSwapComplete);
    }

    // Cleanup: unsubscribe when component unmounts
    return () => {
      if (widgetEvents) {
        widgetEvents.off(WidgetEvent.RouteExecutionCompleted, handleSwapComplete);
      }
    };
  }, [widgetEvents, currentUser, showNotification]);

  // Initialize on component mount
  useEffect(() => {
    // Add class to body to enable scrolling
    document.body.classList.add('aquaswap-page');

    // Check URL parameters for token data from bubble clicks
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    const blockchainParam = urlParams.get('blockchain');
    const symbolParam = urlParams.get('symbol');
    
    if (symbolParam) {
      // If a trading symbol was provided, switch to TradingView and set the symbol directly
      setChartProvider('tradingview');
      setTokenSearch(symbolParam.toUpperCase());
      // Keep URL parameters for shareability
      // window.history.replaceState({}, document.title, '/aquaswap');
    } else if (tokenParam && blockchainParam) {
      // Set token search and chain based on URL parameters
      setTokenSearch(tokenParam);
      setSearchInput(tokenParam); // Also update the search input to show the selected address
      setSelectedChain(getChainForBlockchain(blockchainParam));
      setChartProvider('dexscreener');
      
      // Check for token name parameter (from bubble clicks)
      const nameParam = urlParams.get('name');
      if (nameParam) {
        setActiveTokenName(nameParam);
        setActiveTokenSymbol(nameParam); // Use name as symbol for bubbles
      }
      
      // Keep URL parameters for shareability - do not clean up
      // window.history.replaceState({}, document.title, '/aquaswap');
    }

    // Fetch featured services on mount
    const fetchFeaturedServices = async () => {
      setLoadingServices(true);
      try {
        const response = await fetch(`${API_URL}/api/services/featured-random?limit=3`);
        if (!response.ok) {
          throw new Error('Failed to fetch services');
        }
        const data = await response.json();
        logger.info('Featured services loaded:', data.services?.length || 0);
        setFeaturedServices(data.services || []);
      } catch (error) {
        logger.error('Error fetching featured services:', error);
        setFeaturedServices([]);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchFeaturedServices();

    // Cleanup: remove class when component unmounts
    return () => {
      document.body.classList.remove('aquaswap-page');
    };
  }, []);

  useEffect(() => {
    if (chartProvider !== 'dexscreener') {
      return;
    }
    const trimmedToken = (tokenSearch || '').trim();
    const isValidPairAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmedToken) || /^[A-Za-z0-9\-_]{15,100}$/.test(trimmedToken) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmedToken);
    if (!isValidPairAddress) {
      return;
    }
    updateAquaswapUrl(trimmedToken, selectedChain);
  }, [tokenSearch, selectedChain, chartProvider]);

  // Fetch bubble ads and convert to popular tokens
  useEffect(() => {
    const fetchBubbleTokens = async () => {
      try {
        const response = await fetch(`${API_URL}/api/ads`);
        if (!response.ok) {
          throw new Error('Failed to fetch ads');
        }
        
        const ads = await response.json();
        
        // Filter out pending and rejected ads, then sort by bumped status and bullish votes
        const validAds = ads.filter(ad => 
          ad.status !== 'pending' && 
          ad.status !== 'rejected' &&
          (ad.pairAddress || ad.contractAddress) && 
          (ad.pairAddress || ad.contractAddress).trim() !== '' &&
          ad.isBumped === true  // Only include bumped tokens in trending
        );
        
        // Sort bumped tokens by bullish votes (highest first)
        const sortedAds = validAds.sort((a, b) => {
          return (b.bullishVotes || 0) - (a.bullishVotes || 0);
        });
        
        const topAds = sortedAds.slice(0, 10);
        
        // Convert ads to popular token format
        const bubbleTokens = topAds.map(ad => ({
          name: ad.title,
          address: ad.pairAddress || ad.contractAddress, // Handle both old and new field names
          chain: getChainForBlockchain(ad.blockchain || 'ethereum'),
          logo: ad.logo,
          blockchain: ad.blockchain,
          bullishVotes: ad.bullishVotes || 0,
          isBumped: ad.isBumped || false
        }));
        
        // Update popular tokens if we have any bubble tokens
        if (bubbleTokens.length > 0) {
          setPopularTokens(bubbleTokens);
        }
        
      } catch (error) {
        logger.error('Error fetching bubble tokens:', error);
        // Keep existing popular tokens or empty array on error
        setPopularTokens([]);
      }
    };

    fetchBubbleTokens();
  }, []);

  // Fetch gas prices when chain changes
  useEffect(() => {
    const fetchGasPriceForChain = async () => {
      if (chartProvider !== 'dexscreener' || !selectedChain) {
        return;
      }

      setLoadingGasPrice(true);
      try {
        const gasPriceData = await getGasPrice(selectedChain);
        setGasPrice(gasPriceData);
      } catch (error) {
        logger.error('Error fetching gas price:', error);
        setGasPrice(null);
      } finally {
        setLoadingGasPrice(false);
      }
    };

    fetchGasPriceForChain();

    // Set up interval to refresh gas prices every 15 seconds
    const interval = setInterval(fetchGasPriceForChain, 15000);

    return () => clearInterval(interval);
  }, [selectedChain, chartProvider]);

  // Convert blockchain names to chain format
  const getChainForBlockchain = (blockchain) => {
    const chainMap = {
      // Main blockchains from your BLOCKCHAIN_OPTIONS
      'ethereum': 'ether',
      'bsc': 'bnb',
      'polygon': 'polygon',
      'solana': 'solana',
      'avalanche': 'avalanche',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism',
      'base': 'base',
      'sui': 'sui',
      'near': 'near',
      'fantom': 'fantom',
      'tron': 'tron',
      'cronos': 'cronos',
      'celo': 'celo',
      'harmony': 'harmony',
      'polkadot': 'polkadot',
      'cosmos': 'cosmos',
      'aptos': 'aptos',
      'flow': 'flow',
      'cardano': 'cardano',
      'kaspa': 'kaspa',
      'ton': 'ton', // DEXScreener supports TON
      'stellar': 'stellar',
      'algorand': 'algorand',
      'hedera': 'hedera',
      'icp': 'icp',
      'elrond': 'elrond',
      'terra': 'terra',
      'xrp': 'xrp',
      'litecoin': 'litecoin',
      'bitcoin': 'bitcoin',
      'multiversx': 'elrond',
      'tezos': 'tezos',
      'zilliqa': 'zilliqa',
      'oasis': 'oasis',
      'stacks': 'stacks',
      'kadena': 'kadena',
      'injective': 'injective',
      'kava': 'kava',
      'moonriver': 'moonriver',
      'moonbeam': 'moonbeam',
      
      // Alternative naming variations
      'binance smart chain': 'bnb',
      'bnb chain': 'bnb',
      'binance': 'bnb',
      'eth': 'ether',
      'ethereum mainnet': 'ether',
      'matic': 'polygon',
      'polygon matic': 'polygon',
      'avax': 'avalanche',
      'ftm': 'fantom',
      'arb': 'arbitrum',
      'op': 'optimism'
    };
    
    const normalizedBlockchain = blockchain.toLowerCase().trim();
    const mappedChain = chainMap[normalizedBlockchain] || 'ether';
    
    return mappedChain;
  };

  const getBlockchainParamForChain = (chain) => {
    if (!chain) {
      return 'ethereum';
    }
    const normalizedChain = chain.toLowerCase().trim();
    return CHAIN_TO_BLOCKCHAIN_PARAM[normalizedChain] || normalizedChain || 'ethereum';
  };

  const updateAquaswapUrl = (tokenValue, chainValue) => {
    if (typeof window === 'undefined' || !tokenValue) {
      return;
    }
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('token', tokenValue);
    if (chainValue) {
      searchParams.set('blockchain', getBlockchainParamForChain(chainValue));
    }
    const newSearch = searchParams.toString();
    const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash || ''}`;
    window.history.replaceState({}, '', newUrl);
  };

  // Enhanced search functionality
  const searchTokens = async (searchTerm) => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      // Check if it's a valid pair address (starts with 0x or is a valid format)
      const isPairAddress = /^0x[a-fA-F0-9]{40}$/.test(searchTerm) || 
                           /^[A-Za-z0-9]{32,44}$/.test(searchTerm);

      if (isPairAddress) {
        // If it's a pair address, just set it directly
        setTokenSearch(searchTerm);
        setSearchInput(searchTerm);
        setShowSearchResults(false);
        setIsSearching(false);
        return;
      }

      // Search by token name using DEXScreener API
      const response = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      if (data.pairs && Array.isArray(data.pairs)) {
        // Process and filter results
        const processedResults = data.pairs
          .filter(pair => pair.pairAddress && pair.baseToken && pair.quoteToken)
          .map(pair => ({
            id: `${pair.chainId}-${pair.pairAddress}`,
            name: pair.baseToken.name,
            symbol: pair.baseToken.symbol,
            baseTokenAddress: pair.baseToken.address,
            pairAddress: pair.pairAddress,
            chainId: pair.chainId,
            dexId: pair.dexId,
            priceUsd: pair.priceUsd,
            volume24h: pair.volume?.h24 || 0,
            liquidityUsd: pair.liquidity?.usd || 0,
            priceChange24h: pair.priceChange?.h24 || 0,
            logo: pair.info?.imageUrl,
            url: pair.url,
            // Add paired token information
            quoteToken: {
              name: pair.quoteToken.name,
              symbol: pair.quoteToken.symbol,
              address: pair.quoteToken.address
            },
            // Create trading pair display string
            tradingPair: `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`
          }));

        setSearchResults(processedResults);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      logger.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input changes with debouncing
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value); // Use separate search input state
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      searchTokens(value);
    }, 300); // 300ms delay
    
    setSearchTimeout(timeout);
  };

  // Handle search result selection
  const handleSearchResultSelect = (result) => {
    // Map DEXScreener chainId to our internal chain format
    const chainMapping = {
      'ethereum': 'ether',
      'bsc': 'bnb',
      'polygon': 'polygon',
      'solana': 'solana',
      'avalanche': 'avalanche',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism',
      'base': 'base',
      'fantom': 'fantom',
      'cronos': 'cronos',
      'celo': 'celo',
      'harmony': 'harmony',
      'near': 'near',
      'sui': 'sui',
      'aptos': 'aptos',
      'ton': 'ton',
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
      'tezos': 'tezos',
      'zilliqa': 'zilliqa',
      'oasis': 'oasis',
      'stacks': 'stacks',
      'kadena': 'kadena',
      'injective': 'injective',
      'kava': 'kava',
      'moonriver': 'moonriver',
      'moonbeam': 'moonbeam',
      'flow': 'flow',
      'cardano': 'cardano',
      'polkadot': 'polkadot',
      'cosmos': 'cosmos',
      'kaspa': 'kaspa'
    };
    
    const mappedChain = chainMapping[result.chainId] || 'ether';
    
    // Store all pairs for the selected token for quick navigation
    const samePairs = searchResults.filter(r => 
      r.baseTokenAddress && result.baseTokenAddress &&
      r.baseTokenAddress.toLowerCase() === result.baseTokenAddress.toLowerCase()
    );
    setTokenPairs(samePairs);
    setActiveTokenName(result.name);
    setActiveTokenSymbol(result.symbol || result.name); // Store the ticker symbol
    
    // Set all required state for chart loading
    setTokenSearch(result.pairAddress);
    setSearchInput(result.pairAddress); // Also update the search input to show the selected address
    setSelectedChain(mappedChain);
    setChartProvider('dexscreener'); // Ensure DEXScreener is selected
    setShowSearchResults(false);
    setSearchResults([]);
    
    // Force chart to load by ensuring the ref exists and triggering a re-render
    setTimeout(() => {
      if (dexScreenerRef.current && result.pairAddress) {
        // Force the useEffect to run by triggering a state change
        setTokenSearch(prev => {
          if (prev !== result.pairAddress) {
            return result.pairAddress;
          }
          return prev;
        });
      }
    }, 100);
    
    // Focus back to input
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Handle pair selection from quick navigation buttons
  const handlePairSelect = (pair) => {
    // Map DEXScreener chainId to our internal chain format
    const chainMapping = {
      'ethereum': 'ether',
      'bsc': 'bnb',
      'polygon': 'polygon',
      'solana': 'solana',
      'avalanche': 'avalanche',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism',
      'base': 'base',
      'fantom': 'fantom',
      'cronos': 'cronos',
      'celo': 'celo',
      'harmony': 'harmony',
      'near': 'near',
      'sui': 'sui',
      'aptos': 'aptos',
      'ton': 'ton',
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
      'tezos': 'tezos',
      'zilliqa': 'zilliqa',
      'oasis': 'oasis',
      'stacks': 'stacks',
      'kadena': 'kadena',
      'injective': 'injective',
      'kava': 'kava',
      'moonriver': 'moonriver',
      'moonbeam': 'moonbeam',
      'flow': 'flow',
      'cardano': 'cardano',
      'polkadot': 'polkadot',
      'cosmos': 'cosmos',
      'kaspa': 'kaspa'
    };

    const mappedChain = chainMapping[pair.chainId] || 'ether';
    
    setTokenSearch(pair.pairAddress);
    setSearchInput(pair.pairAddress);
    setSelectedChain(mappedChain);
    setChartProvider('dexscreener');
  };

  // Handle click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click is on a search result button
      const isSearchResultClick = event.target.closest('.search-result-item');
      if (isSearchResultClick) {
        return; // Don't close if clicking on search result
      }
      
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        // Add a small delay to ensure button clicks are processed first
        setTimeout(() => {
          setShowSearchResults(false);
        }, 10);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load TradingView Professional Trading Widget with Maximum Features
  useEffect(() => {
    if (chartProvider === 'tradingview' && tradingViewRef.current) {
      // Clear previous widget
      tradingViewRef.current.innerHTML = '';
      
      // Create TradingView Advanced Chart with maximum professional trading features
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.async = true;
      // Build exchange symbol: use tokenSearch if available, otherwise default to BTC
      const tvSymbol = tokenSearch && /^[A-Z0-9]{2,15}$/.test(tokenSearch.toUpperCase())
        ? `BINANCE:${tokenSearch.toUpperCase()}USDT`
        : 'BINANCE:BTCUSDT';

      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": tvSymbol,
        "interval": "15", // 15-minute for active trading
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": true,
        "backgroundColor": "rgba(17, 24, 39, 1)",
        "gridColor": "rgba(255, 255, 255, 0.1)",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "hide_side_toolbar": false,
        "save_image": true,
        "container_id": "aquaswap_tradingview_pro",
        "toolbar_bg": "#1f2937",
        "withdateranges": true,
        "allow_symbol_change": true,
        "details": true,
        "hotlist": true,
        "calendar": true,
        // Clean chart - only essential volume indicator
        "studies": [
          "Volume@tv-basicstudies"
        ],
        "show_popup_button": true,
        "popup_width": "1600",
        "popup_height": "1000",
        "no_referral_id": false,
        // Professional Crypto Watchlist
        "watchlist": [
          "BTCUSDT", "ETHUSDT", "ADAUSDT", "SOLUSDT", "MATICUSDT",
          "DOGEUSDT", "AVAXUSDT", "ATOMUSDT", "LINKUSDT", "UNIUSDT",
          "LTCUSDT", "BCHUSDT", "XLMUSDT", "DOTUSDT", "FILUSDT",
          "BNBUSDT", "XRPUSDT", "TRXUSDT", "NEARUSDT", "APTUSDT",
          "OPUSDT", "ARBUSDT", "INJUSDT", "SUIUSDT", "WLDUSDT"
        ],
        // News and Social Sentiment
        "news": ["stocktwits", "twitter"],
        "customer": "tradingview",
        "support_host": "https://www.tradingview.com",
        // Professional Drawing Tools
        "drawings_access": {
          "type": "black",
          "tools": [
            { "name": "Regression Trend" },
            { "name": "Trend Line" },
            { "name": "Horizontal Line" },
            { "name": "Vertical Line" },
            { "name": "Rectangle" },
            { "name": "Ellipse" },
            { "name": "Triangle" },
            { "name": "Pitchfork" },
            { "name": "Fib Retracement" },
            { "name": "Fib Extension" },
            { "name": "Fib Time Zone" },
            { "name": "Gann Box" },
            { "name": "Gann Square" },
            { "name": "Elliott Wave" },
            { "name": "Brush" },
            { "name": "Arrow" }
          ]
        },
        // Maximum Professional Features + Enhanced Persistence
        "enabled_features": [
          // User Settings Persistence - Core Features
          "study_templates",
          "use_localstorage_for_settings", 
          "save_chart_properties_to_local_storage",
          "chart_property_page_style",
          "header_saveload",
          "create_volume_indicator_by_default_once",
          
          // Chart Customization Persistence
          "popup_hints",
          "show_chart_property_page", 
          "chart_crosshair_menu",
          "header_chart_type",
          "header_compare",
          "header_undo_redo",
          "header_screenshot",
          "header_widget_dom_node",
          "study_on_study",
          "side_toolbar_in_fullscreen_mode",
          "header_layouttoggle",
          "legend_context_menu",
          "show_logo_on_all_charts",
          "caption_buttons_text_if_possible",
          "volume_force_overlay",
          "right_bar_stays_on_scroll",
          "constraint_dialogs_movement",
          "show_dialog_on_snapshot_ready",
          "study_market_minimized",
          "study_dialog_search_control",
          
          // Enhanced User Experience
          "header_fullscreen_button",
          "header_symbol_search",
          "symbol_search_hot_key",
          "compare_symbol",
          "display_market_status",
          "remove_library_container_border",
          "chart_style_hilo",
          "support_multicharts",
          "header_indicators",
          "header_settings",
          "header_chart_type",
          "header_screenshot",
          "header_widget_dom_node",
          
          // Additional Persistence Features
          "items_favoriting"
        ],
        "disabled_features": [],
        // Professional Chart Styling and Overrides
        "overrides": {
          "mainSeriesProperties.style": 1,
          "mainSeriesProperties.showCountdown": true,
          "symbolWatermarkProperties.transparency": 90,
          "volumePaneSize": "medium",
          "scalesProperties.showLeftScale": false,
          "scalesProperties.showRightScale": true,
          "scalesProperties.backgroundColor": "rgba(17, 24, 39, 0.8)",
          "paneProperties.background": "rgba(17, 24, 39, 1)",
          "paneProperties.backgroundType": "solid",
          // Professional Candlestick Styling
          "mainSeriesProperties.candleStyle.upColor": "#26a69a",
          "mainSeriesProperties.candleStyle.downColor": "#ef5350",
          "mainSeriesProperties.candleStyle.drawWick": true,
          "mainSeriesProperties.candleStyle.drawBorder": true,
          "mainSeriesProperties.candleStyle.borderColor": "#378658",
          "mainSeriesProperties.candleStyle.borderUpColor": "#26a69a",
          "mainSeriesProperties.candleStyle.borderDownColor": "#ef5350",
          "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
          "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350",
          // Volume Styling
          "volume.volume.color.0": "#ef5350",
          "volume.volume.color.1": "#26a69a",
          "volume.volume.transparency": 50,
          // Grid and Scale Styling
          "paneProperties.vertGridProperties.color": "rgba(255, 255, 255, 0.1)",
          "paneProperties.horzGridProperties.color": "rgba(255, 255, 255, 0.1)",
          "scalesProperties.textColor": "#d1d5db"
        }
      });
      
      tradingViewRef.current.appendChild(script);
    }
  }, [chartProvider, tokenSearch]);



  // Load DEXScreener widget with improved reliability
  useEffect(() => {
    if (chartProvider === 'dexscreener' && dexScreenerRef.current && tokenSearch.trim()) {
      // Validate that tokenSearch looks like a valid pair address
      const isValidPairAddress = /^0x[a-fA-F0-9]{40}$/.test(tokenSearch.trim()) || 
                                /^[A-Za-z0-9\-_]{15,70}$/.test(tokenSearch.trim());
      
      if (!isValidPairAddress) {
        dexScreenerRef.current.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: rgba(0, 0, 0, 0.2); border-radius: 8px; color: #9ca3af;">
            <div style="font-size: 2rem; margin-bottom: 16px;">⚠️</div>
            <h3 style="color: #ffffff; margin: 0 0 8px 0;">Invalid Pair Address</h3>
            <p style="margin: 0; text-align: center; line-height: 1.5;">Please enter a valid pair address or search for a token by name.</p>
          </div>
        `;
        return;
      }
      // Clear previous widget
      dexScreenerRef.current.innerHTML = '';
      
      // Create loading indicator
      dexScreenerRef.current.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: rgba(0, 0, 0, 0.2); border-radius: 8px; color: #9ca3af;">
          <div style="font-size: 2rem; margin-bottom: 16px;">📊</div>
          <h3 style="color: #ffffff; margin: 0 0 8px 0;">Loading Chart...</h3>
          <p style="margin: 0; text-align: center; line-height: 1.5;">Connecting to DEXScreener</p>
        </div>
      `;
      
      // Create DEXScreener iframe
      const iframe = document.createElement('iframe');
      iframe.id = 'dexscreener-widget';
      iframe.title = 'DEXScreener Trading Chart';
      
      // Calculate actual available width and set iframe accordingly
      const screenWidth = window.innerWidth;
      let swapWidth, iframeWidth;
      
      if (screenWidth >= 2560) {
        swapWidth = 380;
        iframeWidth = '1200'; // Large monitors - works perfectly
      } else if (screenWidth >= 1920) {
        swapWidth = 320;
        iframeWidth = Math.max(1200, screenWidth - swapWidth - 50).toString(); // Full HD
      } else if (screenWidth >= 1600) {
        swapWidth = 300;
        iframeWidth = Math.max(1200, screenWidth - swapWidth - 50).toString(); // Large laptops
      } else if (screenWidth >= 1440) {
        swapWidth = 290;
        iframeWidth = Math.max(1200, screenWidth - swapWidth - 50).toString(); // Standard laptops
      } else if (screenWidth >= 1366) {
        swapWidth = 320;
        iframeWidth = Math.max(1200, screenWidth - swapWidth - 50).toString(); // HD laptops
      } else {
        swapWidth = 320;
        iframeWidth = Math.max(1200, screenWidth - swapWidth - 50).toString(); // Small laptops
      }
      
      iframe.width = iframeWidth;
      iframe.height = '100%';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '0px';
      iframe.style.minHeight = '700px';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.flex = '1';
      iframe.style.display = 'block';
      iframe.frameBorder = '0';
      iframe.scrolling = 'no';
      
      // Convert chain names to DEXScreener format
      const dexScreenerChainMap = {
        'ether': 'ethereum',
        'bnb': 'bsc', 
        'polygon': 'polygon',
        'solana': 'solana',
        'avalanche': 'avalanche',
        'arbitrum': 'arbitrum',
        'optimism': 'optimism',
        'base': 'base',
        'fantom': 'fantom',
        'cronos': 'cronos',
        'celo': 'celo',
        'harmony': 'harmony',
        'near': 'near',
        'sui': 'sui',
        'aptos': 'aptos',
        'ton': 'ton', // DEXScreener supports TON
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
        'tezos': 'tezos',
        'zilliqa': 'zilliqa',
        'oasis': 'oasis',
        'stacks': 'stacks',
        'kadena': 'kadena',
        'injective': 'injective',
        'kava': 'kava',
        'moonriver': 'moonriver',
        'moonbeam': 'moonbeam',
        'flow': 'flow',
        'cardano': 'cardano',
        'polkadot': 'polkadot',
        'cosmos': 'cosmos',
        'kaspa': 'kaspa',
        'multiversx': 'elrond'
      };
      
      const dexScreenerChain = dexScreenerChainMap[selectedChain] || 'ethereum';
      
      // Build DEXScreener embed URL with dark theme and embed mode
      const widgetUrl = `https://dexscreener.com/${dexScreenerChain}/${tokenSearch.trim()}?theme=dark&embed=1`;
      
      // Add error handling for iframe loading
      iframe.onload = () => {
        // Chart loaded successfully
        if (dexScreenerRef.current) {
          const loadingDiv = dexScreenerRef.current.querySelector('div');
          if (loadingDiv) {
            loadingDiv.remove();
          }
        }
      };
      
      iframe.onerror = () => {
        // Handle iframe loading error
        if (dexScreenerRef.current) {
          dexScreenerRef.current.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: rgba(0, 0, 0, 0.2); border-radius: 8px; color: #9ca3af;">
              <div style="font-size: 2rem; margin-bottom: 16px;">⚠️</div>
              <h3 style="color: #ffffff; margin: 0 0 8px 0;">Chart Loading Error</h3>
              <p style="margin: 0; text-align: center; line-height: 1.5;">Unable to load DEXScreener chart. Please try a different token or refresh the page.</p>
            </div>
          `;
        }
      };
      
      iframe.src = widgetUrl;
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('allow', 'fullscreen');
      
      // Clear loading indicator and add iframe
      if (dexScreenerRef.current) {
        dexScreenerRef.current.innerHTML = '';
        dexScreenerRef.current.appendChild(iframe);
      }
      
    } else if (chartProvider === 'dexscreener' && dexScreenerRef.current && !tokenSearch.trim()) {
      // Show placeholder when no search term
      dexScreenerRef.current.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: rgba(0, 0, 0, 0.2); border-radius: 8px; color: #9ca3af;">
          <div style="font-size: 3rem; margin-bottom: 16px;">🔍</div>
          <h3 style="color: #ffffff; margin: 0 0 8px 0;">Search Any Token</h3>
          <p style="margin: 0; text-align: center; line-height: 1.5;">Enter a Pair address above to view any token's chart</p>
        </div>
      `;
    }
  }, [chartProvider, tokenSearch, selectedChain]);

  // Handle popular token selection
  const handlePopularTokenClick = (token) => {
    setTokenSearch(token.address);
    setSelectedChain(token.chain);
    setActiveTokenName(token.name || '');
    setActiveTokenSymbol(token.name || ''); // For trending tokens, name is usually the ticker
    setChartProvider('dexscreener'); // Ensure DEX Screener is selected for signals
  };

  // LI.FI Widget configuration following official documentation
  const widgetConfig = {
    integrator: "aquaswap",
    fee: FEE_PERCENTAGE,
    feeConfig: {
      fee: FEE_PERCENTAGE,
      feeRecipient: ETH_FEE_WALLET || "0x0000000000000000000000000000000000000000",
      solanaFeeRecipient: SOLANA_FEE_WALLET,
      suiFeeRecipient: SUI_FEE_WALLET,
    },
    
    // ============ EVENT HANDLERS FOR WALLET CONNECTION & SWAP FEEDBACK ============
    
    // Wallet connection events
    onWalletConnect: (wallet) => {
      logger.info('Wallet connected to AquaSwap', { 
        address: wallet?.address, 
        chainId: wallet?.chainId 
      });
      
      if (showNotification) {
        showNotification('🎉 Wallet connected successfully!', 'success');
      }
    },
    
    onWalletDisconnect: () => {
      logger.info('Wallet disconnected from AquaSwap');
      
      if (showNotification) {
        showNotification('Wallet disconnected', 'info');
      }
    },
    
    // Swap lifecycle events
    onRouteExecutionStarted: (route) => {
      logger.info('Swap execution started', { route });
      
      if (showNotification) {
        showNotification('🔄 Starting your swap...', 'info');
      }
    },
    
    onRouteExecutionCompleted: (route) => {
      logger.info('Swap execution completed', { route });
      
      if (showNotification) {
        showNotification('✅ Swap completed successfully!', 'success');
      }
    },
    
    onRouteExecutionFailed: (route, error) => {
      logger.error('Swap execution failed', { route, error });
      
      if (showNotification) {
        const errorMessage = error?.message || 'Swap failed. Please try again.';
        showNotification(`❌ ${errorMessage}`, 'error');
      }
    },
    
    // Route update events for user feedback
    onRouteExecutionUpdated: (route) => {
      logger.info('Swap execution updated', { route });
      // Optional: Show progress updates
    },
    
    // ============ END OF EVENT HANDLERS ============
    
    // Hide branding
    hiddenUI: ["poweredBy"],
    // Use compact variant
    variant: "compact",
    // Dark appearance
    appearance: "dark",
    // Minimize widget size
    containerStyle: {
      maxWidth: "100%",
      padding: "8px",
    },
    // Compact design settings
    design: {
      compact: true,
    },
    // Enable URL building for mobile deep linking
    buildUrl: true,
    // Wallet configuration - using partial management for mobile Solana support
    walletConfig: {
      // Enable partial wallet management to handle mobile Solana limitations
      usePartialWalletManagement: true,
      // Provide WalletConnect for EVM chains while LiFi handles Solana
      walletConnect: {
        projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID,
        metadata: {
          name: "Aquads",
          description: "Aquads - Web3 Crypto Hub & Freelancer Marketplace",
          url: "https://www.aquads.xyz",
          icons: ["https://www.aquads.xyz/logo192.png"],
        },
      },
    },
    // SDK configuration for better performance
    sdkConfig: {
      // Improved route options for better performance and user experience
      routeOptions: {
        // Prioritize speed and success rate
        order: 'FASTEST',
        // Allow partial routes for better UX
        allowPartialRoutes: true,
        // Maximum number of routes to fetch for better performance
        maxPriceImpact: 0.5, // 50% max price impact
      },
      rpcUrls: {
        // Add your RPC URLs here if you have custom ones
        // [ChainId.ETH]: ['https://your-ethereum-rpc.com/'],
        // [ChainId.SOL]: ['https://your-solana-rpc.com/'],
      },
    },
    // Enhanced theme configuration
    theme: {
      palette: {
        mode: 'dark',
      },
      // Improved container styling
      container: {
        // Better border radius for modern look
        borderRadius: '16px',
        // Improved shadow for better depth
        boxShadow: '0 8px 32px 0 rgba(0, 212, 255, 0.1)',
      },
    },
  };

  // Main AquaSwap interface
  return (
    <div className="aquaswap-page">
      {/* Header Section */}
      <div className="header-section">
        {/* Desktop Navigation (hidden on mobile via CSS) */}
        <div className="header-nav">
          {/* Left Section */}
          <div className="header-left">
            <img 
              src="/Aquadsnewlogo.png" 
              alt="Aquads" 
              className="aquads-logo-clickable"
              width="72" 
              height="72"
              onClick={() => navigate('/home')}
              title="Back to Main Page"
            />
          </div>

          {/* Center Section - Logo & Title */}
          <div className="header-center">
            <div className="header-brand">
              <img 
                src="/AquaSwap.svg" 
                alt="AquaSwap" 
                className="aquaswap-logo" 
                width="28" 
                height="28"
              />
              <div className="header-title">
                <h1>AquaSwap</h1>
                <p className="header-subtitle">Cross-Chain BEX</p>
              </div>
            </div>
          </div>

          {/* Right Section - Action Buttons */}
          <div className="header-right">
            <div className="header-actions">
              <button 
                className="embed-toggle-button"
                onClick={() => setShowEmbedCode(!showEmbedCode)}
                title="Get embed code to add AquaSwap to your website"
              >
                {showEmbedCode ? '❌ Close' : '🔗 Embed'}
              </button>
              <button 
                onClick={() => setShowBuyCryptoModal(true)}
                className="fiat-purchase-button"
                title="Buy crypto with fiat currency"
              >
                💳 Fiat to Crypto
              </button>
              <button 
                onClick={() => navigate('/wallet-analyzer')}
                className="wallet-analyzer-button"
                title="Deep analyze any wallet - Whale, Jeet & Bot detection"
              >
                🔬 Wallet Analyzer
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Layout (unchanged for mobile compatibility) */}
        <img 
          src="/Aquadsnewlogo.png" 
          alt="Aquads" 
          className="aquads-logo-clickable"
          width="60" 
          height="60"
          onClick={() => navigate('/home')}
          title="Back to Main Page"
        />

        {/* Banner Display - only show on mobile */}
        <div className="banner-mobile-only">
          <BannerDisplay />
        </div>

        {/* Mobile Title */}
        <div className="page-title">
          <h1>
            <img 
              src="/AquaSwap.svg" 
              alt="AquaSwap" 
              className="aquaswap-logo" 
              width="32" 
              height="32"
            />
            AquaSwap
          </h1>
          <p>The Ultimate Cross-Chain BEX</p>
          
          {/* Mobile Action Buttons */}
          <div className="header-buttons">
            <button 
              className="embed-toggle-button"
              onClick={() => setShowEmbedCode(!showEmbedCode)}
              title="Get embed code to add AquaSwap to your website"
            >
              {showEmbedCode ? '❌ Close Embed Code' : '🔗 Embed on Your Site'}
            </button>
            <button 
              onClick={() => setShowBuyCryptoModal(true)}
              className="fiat-purchase-button"
              title="Buy crypto with fiat currency"
            >
              💳 Fiat to Crypto
            </button>
          </div>
        </div>
      </div>
      
      {/* Embed Code Generator Section */}
      {showEmbedCode && (
        <div className="embed-section">
          <EmbedCodeGenerator />
        </div>
      )}


    
      {/* Main Trading Interface - Original Setup */}
      <div className="trading-interface with-charts">
        {/* Left Side - Swap Widget */}
        <div className={`swap-section ${isSwapCollapsed ? 'collapsed' : ''}`}>
          {/* Collapse Toggle Button */}
          <button 
            className="swap-collapse-toggle"
            onClick={() => setIsSwapCollapsed(!isSwapCollapsed)}
            title={isSwapCollapsed ? 'Expand Swap Widget' : 'Collapse Swap Widget'}
          >
            {isSwapCollapsed ? '→' : '←'}
            <span className="collapse-label">
              {isSwapCollapsed ? 'Expand Swap' : 'Collapse'}
            </span>
          </button>

          {/* Collapsed View - Minimal Interface */}
          {isSwapCollapsed && (
            <div className="swap-collapsed-content">
              <img 
                src="/AquaSwap.svg" 
                alt="AquaSwap" 
                className="collapsed-logo" 
                width="36" 
                height="36"
              />
              <div className="collapsed-title">
                <span className="vertical-letter">S</span>
                <span className="vertical-letter">W</span>
                <span className="vertical-letter">A</span>
                <span className="vertical-letter">P</span>
              </div>
            </div>
          )}

          {/* Expanded View - Full Interface */}
          {!isSwapCollapsed && (
            <>
              <div className="lifi-widget">
                <LiFiWidget integrator="aquaswap" config={widgetConfig} />
              </div>
              <div className="swap-footer">
                <p>✨ Cross-chain swaps • 50+ blockchains • Best rates</p>
                <p className="swap-points-note">🎯 Earn 5 points for every swap!</p>
              </div>
              
              {/* Banner Display - smaller version below swap for desktop/tablet only */}
              <div className="banner-below-swap">
                <BannerDisplay />
              </div>
            </>
          )}
        </div>

        {/* Right Side - Charts */}
        <div className="chart-section">
          <div className="chart-header">
                        
            {/* Compact controls row */}
            <div className="chart-controls-row">
              <div className="chart-provider-selector">
                <button 
                  className={`provider-btn ${chartProvider === 'tradingview' ? 'active' : ''}`}
                  onClick={() => setChartProvider('tradingview')}
                >
                  📊 TradingView
                  <span className="provider-desc">Analysis</span>
                </button>
                <button 
                  className={`provider-btn ${chartProvider === 'dexscreener' ? 'active' : ''}`}
                  onClick={() => setChartProvider('dexscreener')}
                >
                  🔍 DEX Charts
                  <span className="provider-desc">Charts</span>
                </button>
              </div>
              
              {/* DEXScreener search interface - inline */}
              {chartProvider === 'dexscreener' && (
                <div className="search-controls">
                  <div className="chain-selector">
                    <label className="search-label">Chain:</label>
                    <select 
                      value={selectedChain}
                      onChange={(e) => setSelectedChain(e.target.value)}
                      className="chain-select"
                    >
                      {/* Major Layer 1 Blockchains */}
                      <option value="ether">Ethereum</option>
                      <option value="bitcoin">Bitcoin</option>
                      <option value="bnb">BNB Chain (BSC)</option>
                      <option value="solana">Solana</option>
                      <option value="cardano">Cardano</option>
                      <option value="avalanche">Avalanche</option>
                      <option value="polygon">Polygon</option>
                      <option value="tron">TRON</option>
                      <option value="near">NEAR Protocol</option>
                      <option value="aptos">Aptos</option>
                      <option value="sui">Sui</option>
                      <option value="ton">TON</option>
                      <option value="cosmos">Cosmos</option>
                      <option value="polkadot">Polkadot</option>
                      <option value="kusama">Kusama</option>
                      <option value="chainlink">Chainlink</option>
                      <option value="stellar">Stellar</option>
                      <option value="algorand">Algorand</option>
                      <option value="hedera">Hedera</option>
                      <option value="icp">Internet Computer</option>
                      <option value="flow">Flow</option>
                      <option value="elrond">MultiversX (Elrond)</option>
                      <option value="terra">Terra</option>
                      <option value="xrp">XRP Ledger</option>
                      <option value="litecoin">Litecoin</option>
                      <option value="monero">Monero</option>
                      <option value="zcash">Zcash</option>
                      <option value="dash">Dash</option>
                      
                      {/* Layer 2 & Scaling Solutions */}
                      <option value="arbitrum">Arbitrum One</option>
                      <option value="arbitrumnova">Arbitrum Nova</option>
                      <option value="optimism">Optimism</option>
                      <option value="base">Base</option>
                      <option value="linea">Linea</option>
                      <option value="scroll">Scroll</option>
                      <option value="zksync">zkSync Era</option>
                      <option value="polygonzkevm">Polygon zkEVM</option>
                      <option value="starknet">Starknet</option>
                      <option value="immutablex">Immutable X</option>
                      <option value="loopring">Loopring</option>
                      <option value="metis">Metis</option>
                      <option value="boba">Boba Network</option>
                      <option value="mantle">Mantle</option>
                      <option value="mode">Mode</option>
                      <option value="blast">Blast</option>
                      <option value="manta">Manta Pacific</option>
                      
                      {/* EVM Compatible Chains */}
                      <option value="fantom">Fantom</option>
                      <option value="cronos">Cronos</option>
                      <option value="moonbeam">Moonbeam</option>
                      <option value="moonriver">Moonriver</option>
                      <option value="celo">Celo</option>
                      <option value="aurora">Aurora (NEAR)</option>
                      <option value="harmony">Harmony</option>
                      <option value="klaytn">Klaytn</option>
                      <option value="evmos">Evmos</option>
                      <option value="kava">Kava</option>
                      <option value="canto">Canto</option>
                      <option value="gnosis">Gnosis Chain</option>
                      <option value="oasis">Oasis Network</option>
                      <option value="fuse">Fuse</option>
                      <option value="velas">Velas</option>
                      <option value="syscoin">Syscoin</option>
                      <option value="telos">Telos</option>
                      <option value="wanchain">Wanchain</option>
                      <option value="thundercore">ThunderCore</option>
                      <option value="iotex">IoTeX</option>
                      <option value="conflux">Conflux eSpace</option>
                      <option value="meter">Meter</option>
                      <option value="elastos">Elastos Smart Chain</option>
                      <option value="energi">Energi</option>
                      <option value="neon">Neon EVM</option>
                      <option value="milkomeda">Milkomeda</option>
                      
                      {/* Other Major Chains */}
                      <option value="astar">Astar</option>
                      <option value="shiden">Shiden</option>
                      <option value="acala">Acala</option>
                      <option value="karura">Karura</option>
                      <option value="bifrost">Bifrost</option>
                      <option value="centrifuge">Centrifuge</option>
                      <option value="unique">Unique Network</option>
                      <option value="zeitgeist">Zeitgeist</option>
                      <option value="parallel">Parallel</option>
                      <option value="clover">Clover</option>
                      <option value="composable">Composable</option>
                      
                      {/* Exchange Chains */}
                      <option value="kucoin">KuCoin Community Chain</option>
                      <option value="heco">Huobi ECO Chain</option>
                      <option value="okx">OKX Chain</option>
                      <option value="gate">Gate Chain</option>
                      <option value="bitgert">Bitgert</option>
                      
                      {/* Gaming & NFT Chains */}
                      <option value="ronin">Ronin</option>
                      <option value="wax">WAX</option>
                      <option value="enjin">Enjin</option>
                      <option value="xai">Xai</option>
                      <option value="gala">Gala</option>
                      <option value="immutable">Immutable zkEVM</option>
                      <option value="beam">Beam</option>
                      <option value="treasure">Treasure</option>
                      
                      {/* Meme & Community Chains */}
                      <option value="dogechain">Dogechain</option>
                      <option value="shib">Shibarium</option>
                      <option value="floki">FlokiFi</option>
                      <option value="babydoge">Baby Doge Chain</option>
                      <option value="pulse">PulseChain</option>
                      
                      {/* Enterprise & Institutional */}
                      <option value="quorum">Quorum</option>
                      <option value="hyperledger">Hyperledger Besu</option>
                      <option value="rsk">RSK (Rootstock)</option>
                      <option value="liquid">Liquid Network</option>
                      <option value="elements">Elements</option>
                      
                      {/* Privacy Chains */}
                      <option value="secret">Secret Network</option>
                      <option value="oasis-privacy">Oasis Privacy</option>
                      <option value="aztec">Aztec</option>
                      <option value="railgun">Railgun</option>
                      
                      {/* Cross-Chain & Interoperability */}
                      <option value="thorchain">THORChain</option>
                      <option value="anyswap">Multichain</option>
                      <option value="router">Router Protocol</option>
                      <option value="axelar">Axelar</option>
                      <option value="wormhole">Wormhole</option>
                      
                      {/* DeFi Specialized */}
                      <option value="osmosis">Osmosis</option>
                      <option value="juno">Juno</option>
                      <option value="terra2">Terra 2.0</option>
                      <option value="kujira">Kujira</option>
                      <option value="injective">Injective</option>
                      <option value="dydx">dYdX</option>
                      <option value="degen">Degen Chain</option>
                      
                      {/* Emerging & New Chains */}
                      <option value="sei">Sei</option>
                      <option value="celestia">Celestia</option>
                      <option value="berachain">Berachain</option>
                      <option value="monad">Monad</option>
                      <option value="fuel">Fuel</option>
                      <option value="eclipse">Eclipse</option>
                      <option value="zeta">ZetaChain</option>
                      <option value="taiko">Taiko</option>
                      <option value="polygon2">Polygon 2.0</option>
                      <option value="ethereum2">Ethereum 2.0</option>
                      
                      {/* Testnets & Development */}
                      <option value="goerli">Goerli Testnet</option>
                      <option value="sepolia">Sepolia Testnet</option>
                      <option value="mumbai">Mumbai Testnet</option>
                      <option value="fuji">Fuji Testnet</option>
                      <option value="fantom-testnet">Fantom Testnet</option>
                      <option value="bsc-testnet">BSC Testnet</option>
                      
                      {/* Additional Chains */}
                      <option value="etc">Ethereum Classic</option>
                      <option value="ethw">Ethereum PoW</option>
                      <option value="ethf">Ethereum Fair</option>
                      <option value="nova">Nova Network</option>
                      <option value="cube">Cube Network</option>
                      <option value="step">Step Network</option>
                      <option value="hoo">Hoo Smart Chain</option>
                      <option value="smartbch">SmartBCH</option>
                      <option value="kardia">KardiaChain</option>
                      <option value="tomb">Tomb Chain</option>
                      <option value="redlight">Redlight Chain</option>
                      <option value="alvey">Alvey Chain</option>
                      <option value="echelon">Echelon</option>
                      <option value="kek">KEK Chain</option>
                      <option value="tomo">TomoChain</option>
                      <option value="muu">MUU Chain</option>
                      <option value="sx">SX Network</option>
                      <option value="dis">DIS Chain</option>
                      <option value="pom">Proof of Memes</option>
                      <option value="exosama">Exosama</option>
                      <option value="dfk">DeFi Kingdoms</option>
                      <option value="swimmer">Swimmer Network</option>
                      <option value="godwoken">Godwoken</option>
                      <option value="bittorrent">BitTorrent Chain</option>
                      <option value="coredao">Core DAO</option>
                      <option value="opbnb">opBNB</option>
                      <option value="xlayer">X Layer</option>
                      <option value="shimmer">ShimmerEVM</option>
                      <option value="flare">Flare Network</option>
                      <option value="songbird">Songbird</option>
                      <option value="zilliqa">Zilliqa</option>
                      <option value="neo">NEO</option>
                      <option value="ontology">Ontology</option>
                      <option value="qtum">Qtum</option>
                      <option value="waves">Waves</option>
                      <option value="lisk">Lisk</option>
                      <option value="stratis">Stratis</option>
                      <option value="ark">ARK</option>
                      <option value="icon">ICON</option>
                      <option value="aelf">aelf</option>
                      <option value="ardor">Ardor</option>
                      <option value="nxt">NXT</option>
                      <option value="nem">NEM</option>
                      <option value="symbol">Symbol</option>
                      <option value="xdc">XDC Network</option>
                      <option value="vechain">VeChain</option>
                      <option value="chia">Chia</option>
                      <option value="filecoin">Filecoin</option>
                      <option value="arweave">Arweave</option>
                      <option value="storj">Storj</option>
                      <option value="siacoin">Siacoin</option>
                    </select>

                    {/* Gas Price Indicator - Keep showing existing value during refresh to prevent layout shift */}
                    {gasPrice && (
                      <div className={`gas-price-indicator gas-level-${getGasPriceLevel(gasPrice)}`} title={`Fast: ${formatGasPrice({ ...gasPrice, price: gasPrice.fast })} | Standard: ${formatGasPrice(gasPrice)} | Slow: ${formatGasPrice({ ...gasPrice, price: gasPrice.slow })}`}>
                        <span className="gas-icon">⛽</span>
                        <span className="gas-value">{formatGasPrice(gasPrice)}</span>
                        <span className="gas-level-text">({getGasPriceLevelText(gasPrice)})</span>
                      </div>
                    )}
                    
                    {/* Only show loading spinner on initial load when there's no gas data yet */}
                    {loadingGasPrice && !gasPrice && (
                      <div className="gas-price-loading">
                        <span className="gas-icon">⛽</span>
                        <span className="gas-loading-spinner"></span>
                      </div>
                    )}
                  </div>
                  
                  <div className="token-search">
                    <label className="search-label">Search Tokens:</label>
                    <div className="search-input-container">
                      <input
                        type="text"
                        value={searchInput}
                        onChange={handleSearchChange}
                        placeholder="Search by token name (e.g., bitcoin, pepe) or pair address"
                        className="token-search-input"
                        ref={searchInputRef}
                      />
                      
                      {/* Search Results Dropdown */}
                      {showSearchResults && (
                        <div className="search-results-dropdown">
                          {/* Close button for mobile full screen */}
                          <button 
                            className="search-close-button"
                            onClick={() => setShowSearchResults(false)}
                            aria-label="Close search results"
                          >
                            ×
                          </button>
                          
                          {isSearching ? (
                            <div className="search-loading">
                              <div className="loading-spinner"></div>
                              <span>Searching...</span>
                            </div>
                          ) : searchResults.length > 0 ? (
                            <div className="search-results-list">
                              {searchResults.map((result) => (
                                <button
                                  key={result.id}
                                  className="search-result-item"
                                  onClick={() => handleSearchResultSelect(result)}
                                >
                                  <div className="result-token-info">
                                    {result.logo && (
                                      <img 
                                        src={result.logo} 
                                        alt={result.name}
                                        className="result-token-logo"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    )}
                                    <div className="result-token-details">
                                      <div className="result-token-name">
                                        {result.name} ({result.symbol})
                                      </div>
                                      <div className="result-token-pair">
                                        {result.tradingPair}
                                      </div>
                                      <div className="result-token-chain">
                                        {result.dexId} on {result.chainId}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="result-token-price">
                                    <div className="price-usd">
                                      ${parseFloat(result.priceUsd || 0).toFixed(6)}
                                    </div>
                                    <div className={`price-change ${parseFloat(result.priceChange24h || 0) >= 0 ? 'positive' : 'negative'}`}>
                                      {parseFloat(result.priceChange24h || 0).toFixed(2)}%
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : searchInput.length >= 2 ? (
                            <div className="search-no-results">
                              <span>No tokens found for "{searchInput}"</span>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                    
                    {/* Shill Token Button - Shows when token is loaded */}
                    {tokenSearch && (
                      <button
                        className="aquaswap-share-btn"
                        onClick={() => setShowShillModal(true)}
                        title="Shill this token on social media"
                      >
                        <FaShareAlt />
                        <span>Shill it</span>
                      </button>
                    )}

                    {/* Trading Signals Button - Shows when token is loaded */}
                    {tokenSearch && chartProvider === 'dexscreener' && (
                      <div className="signal-algo-container">
                        <button
                          ref={signalButtonRef}
                          className={`signal-algo-btn ${showSignalsPanel ? 'active' : ''} ${currentSignal ? 'has-signal' : ''} ${currentSignal ? `signal-${currentSignal.signal.label.toLowerCase().replace(/\s+/g, '-')}` : ''}`}
                          onClick={() => setShowSignalsPanel(!showSignalsPanel)}
                          title={currentSignal ? `${currentSignal.signal.label} - ${currentSignal.confidence}% confidence` : "View trading signals for this token"}
                          style={currentSignal ? {
                            '--signal-color': currentSignal.signal.color,
                            background: `linear-gradient(135deg, ${currentSignal.signal.color}15 0%, ${currentSignal.signal.color}25 100%)`,
                            borderColor: `${currentSignal.signal.color}60`,
                            color: currentSignal.signal.color
                          } : {}}
                        >
                          <span className="btn-icon">{currentSignal ? currentSignal.signal.icon : '🎯'}</span>
                          <span>{currentSignal ? currentSignal.signal.label : 'Signals'}</span>
                        </button>
                        {/* Always render TradingSignals (even when panel closed) so it can fetch data */}
                        <TradingSignals
                          tokenAddress={tokenSearch}
                          chain={selectedChain}
                          tokenSymbol={activeTokenSymbol || activeTokenName}
                          isVisible={showSignalsPanel}
                          onClose={() => setShowSignalsPanel(false)}
                          buttonRef={signalButtonRef}
                          onSignalUpdate={setCurrentSignal}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Arbitrage Opportunities Banner - shows best quote tokens to pair with */}
            {chartProvider === 'dexscreener' && arbitrageByQuote.length > 0 && (
              <div className="chart-search-section arbitrage-section">
                <div className="arbitrage-banner">
                  <span className="arbitrage-label">💰 Arb Pairs:</span>
                  <div className="arbitrage-container">
                    <div className="arbitrage-scroll">
                      {arbitrageByQuote.map((opp, index) => (
                        <div 
                          key={`${opp.quoteSymbol}-${index}`}
                          className={`arbitrage-item ${opp.riskTier} ${!opp.isProfitable ? 'not-profitable' : ''}`}
                          title={`${activeTokenSymbol || 'Token'}/${opp.quoteSymbol} - ${opp.riskText}\n\nBuy on ${opp.buyDex} ($${opp.buyPrice.toFixed(8)})\nSell on ${opp.sellDex} ($${opp.sellPrice.toFixed(8)})\n\nGross Spread: ${opp.spread}%\nNet (after 0.6% fees): ${opp.netSpread}%\nLiquidity: $${opp.effectiveLiquidity.toLocaleString()}\n${opp.pairCount} DEXes available${opp.isCrossChain ? '\n⚠️ Cross-chain (needs bridge)' : ''}${!opp.isProfitable ? '\n\n❌ Spread does not cover fees' : ''}`}
                        >
                          <span className={`arb-risk-badge ${opp.riskTier}`}>{opp.riskLabel}</span>
                          <span className="arb-quote">{opp.quoteSymbol}</span>
                          <span className={`arb-spread-badge ${opp.isProfitable ? 'profitable' : 'unprofitable'}`}>
                            {opp.isProfitable ? '+' : ''}{opp.netSpread}%
                          </span>
                          <span className="arb-liq-badge" title={`Liquidity: $${opp.effectiveLiquidity.toLocaleString()}`}>
                            ${opp.effectiveLiquidity >= 1000 ? (opp.effectiveLiquidity / 1000).toFixed(0) + 'K' : opp.effectiveLiquidity.toFixed(0)}
                          </span>
                          <span className="arb-route-mini">
                            {opp.buyDex} → {opp.sellDex}
                          </span>
                          {opp.isCrossChain && <span className="arb-cross-chain">🔗</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Suggested Pairs Banner - shows when no/few arb opportunities exist */}
            {chartProvider === 'dexscreener' && tokenPairs.length > 0 && suggestedPairs.length > 0 && (
              <div className="chart-search-section suggested-section">
                <div className="suggested-banner">
                  <span className="suggested-label">
                    {arbitrageByQuote.length === 0 ? '💡 Create Pairs:' : '💡 More Pairs:'}
                  </span>
                  <div className="suggested-container">
                    <div className="suggested-scroll">
                      {suggestedPairs.map((suggestion, index) => (
                        <div 
                          key={`suggestion-${index}`}
                          className={`suggested-item ${suggestion.type} ${suggestion.priority}`}
                          title={`${suggestion.reason}\n\n${suggestion.type === 'add_dex' 
                            ? `Current: ${activeTokenSymbol || 'Token'}/${suggestion.quoteSymbol} on ${suggestion.existingDex}\nSuggested DEXes: ${suggestion.suggestedDexes.join(', ')}\n\nAdding this pair on another DEX enables arbitrage trading!`
                            : `Create ${activeTokenSymbol || 'Token'}/${suggestion.quoteSymbol} pair\nSuggested DEXes: ${suggestion.suggestedDexes.join(', ')}\nChain: ${suggestion.chain}\n\n${suggestion.quoteName} is a high-volume quote token that attracts traders.`
                          }`}
                        >
                          <span className="suggested-icon">{suggestion.icon}</span>
                          <span className="suggested-quote">{suggestion.quoteSymbol}</span>
                          {suggestion.type === 'add_dex' ? (
                            <span className="suggested-action">+DEX</span>
                          ) : (
                            <span className="suggested-action">NEW</span>
                          )}
                          <span className="suggested-dexes">
                            {suggestion.suggestedDexes[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Trending tokens - show for DEXScreener */}
            {chartProvider === 'dexscreener' && popularTokens.length > 0 && (
              <div className="chart-search-section">
                <div className="popular-tokens">
                  <span className="popular-label">Trending:</span>
                  <div className="popular-tokens-container">
                    <div className="popular-tokens-scroll">
                      {/* Duplicate tokens for seamless scrolling */}
                      {popularTokens.concat(popularTokens).map((token, index) => {
                        // Calculate the original rank (1-10) for display
                        const rank = (index % popularTokens.length) + 1;
                        return (
                          <button
                            key={`${token.address}-${index}`}
                            onClick={() => handlePopularTokenClick(token)}
                            className={`popular-token-btn ${token.isBumped ? 'bumped' : ''}`}
                            title={`#${rank} ${token.name} on ${token.blockchain || 'Ethereum'}${token.isBumped ? ' - BUMPED' : ''} - ${token.bullishVotes} votes - Address: ${token.address}`}
                            style={{ flexShrink: 0 }}
                          >
                            <span className="token-rank">#{rank}</span>
                            {token.logo && (
                              <img 
                                src={token.logo} 
                                alt={token.name}
                                className="token-logo"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            <span>{token.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Token Pairs Quick Navigation - show after selection */}
            {chartProvider === 'dexscreener' && tokenPairs.length > 1 && (
              <div className="chart-search-section token-pairs-section">
                <div className="token-pairs">
                  <span className="pairs-label">
                    <span className="pairs-token-name">{activeTokenName}</span> Pairs:
                  </span>
                  <div className="token-pairs-container">
                    <div className="token-pairs-scroll">
                      {tokenPairs.map((pair) => (
                        <button
                          key={pair.id}
                          onClick={() => handlePairSelect(pair)}
                          className={`pair-btn ${tokenSearch === pair.pairAddress ? 'active' : ''}`}
                          title={`${pair.dexId} on ${pair.chainId} - $${parseFloat(pair.priceUsd || 0).toFixed(8)} - Vol: $${(pair.volume24h || 0).toLocaleString()} - Liq: $${(pair.liquidityUsd || 0).toLocaleString()}`}
                        >
                          <span className="pair-name">{pair.tradingPair}</span>
                          <span className="pair-dex">{pair.dexId}</span>
                          <span className={`pair-change ${parseFloat(pair.priceChange24h || 0) >= 0 ? 'positive' : 'negative'}`}>
                            {parseFloat(pair.priceChange24h || 0) >= 0 ? '↑' : '↓'}
                            {Math.abs(parseFloat(pair.priceChange24h || 0)).toFixed(2)}%
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="chart-container">
            {chartProvider === 'tradingview' && (
              <div 
                ref={tradingViewRef}
                id="aquaswap_tradingview_pro" 
                style={{ height: '100%', width: '100%' }}
              />
            )}
            
            {chartProvider === 'dexscreener' && (
              <div 
                ref={dexScreenerRef}
                style={{ height: '100%', width: '100%' }}
              />
            )}
          </div>
          

        </div>
      </div>

      {/* Currency Converter Bar */}
      <div className="currency-converter-wrapper">
        <CurrencyConverter />
      </div>

      {/* Hire Expert Section */}
      {featuredServices.length > 0 && (
        <div className="hire-expert-section">
          <div className="hire-expert-container">
            <div className="hire-expert-header">
              <div className="hire-expert-icon">💼</div>
              <div className="hire-expert-title-group">
                <h2 className="hire-expert-title">Need Expert Help?</h2>
                <p className="hire-expert-subtitle">Professional services from verified freelancers</p>
              </div>
            </div>

            <div className="hire-expert-cards">
              {featuredServices.map((service) => (
                <div key={service._id} className="hire-expert-card">
                  <div className="hire-expert-card-inner">
                    <div className="hire-expert-avatar-section">
                      {service.seller?.image ? (
                        <img 
                          src={service.seller.image} 
                          alt={service.seller.username}
                          className="hire-expert-avatar"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="hire-expert-avatar-placeholder"
                        style={{ display: service.seller?.image ? 'none' : 'flex' }}
                      >
                        {service.seller?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                      {service.seller?.isOnline && (
                        <div className="hire-expert-online-badge" title="Online now"></div>
                      )}
                    </div>

                    <div className="hire-expert-content">
                      <h3 className="hire-expert-service-title" title={service.title}>
                        {service.title}
                      </h3>
                      
                      <div className="hire-expert-seller-name">
                        by {service.seller?.username || 'Unknown'}
                      </div>

                      {service.category && (
                        <div className="hire-expert-category">
                          {service.category}
                        </div>
                      )}

                      <div className="hire-expert-stats">
                        <div className="hire-expert-rating">
                          <span className="hire-expert-stars">
                            {'⭐'.repeat(Math.round(service.rating || 0))}
                          </span>
                          <span className="hire-expert-rating-text">
                            {(service.rating || 0).toFixed(1)} ({service.reviews || 0})
                          </span>
                        </div>
                        
                        <div className="hire-expert-price">
                          From ${service.price || 0}
                        </div>
                      </div>

                      {service.completionRate > 0 && (
                        <div className="hire-expert-completion">
                          {service.completionRate}% completion rate
                        </div>
                      )}
                    </div>

                    <Link 
                      to={`/service/${service.title.replace(/\s+/g, '-').replace(/\//g, '-').toLowerCase()}-${service._id}`}
                      className="hire-expert-cta"
                    >
                      View Service →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="hire-expert-footer">
              <Link to="/marketplace" className="hire-expert-view-all">
                Browse All Services →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Points Earned Popup Modal */}
      {showPointsPopup && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2147483647,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            animation: 'fadeIn 0.3s ease-out'
          }}
          onClick={() => setShowPointsPopup(false)}
        >
          <div 
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '20px',
              padding: '40px 60px',
              boxShadow: '0 20px 60px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.2)',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              textAlign: 'center',
              animation: 'bounceIn 0.5s ease-out',
              transform: 'scale(1)',
              maxWidth: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '80px', marginBottom: '20px', animation: 'rotate 1s ease-in-out' }}>
              🎉
            </div>
            <h2 style={{ 
              color: 'white', 
              fontSize: '32px', 
              fontWeight: 'bold', 
              marginBottom: '15px',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
            }}>
              Swap Successful!
            </h2>
            <p style={{ 
              color: 'white', 
              fontSize: '24px', 
              fontWeight: '600',
              marginBottom: '10px',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}>
              +{pointsEarned} Points Earned! 🌟
            </p>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.9)', 
              fontSize: '16px',
              marginTop: '15px',
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
            }}>
              Keep swapping to earn more rewards!
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
          }
        }
        
        @keyframes rotate {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-10deg);
          }
          75% {
            transform: rotate(10deg);
          }
        }
      `}</style>

      {/* Buy Crypto Modal */}
      <BuyCryptoModal
        isOpen={showBuyCryptoModal}
        onClose={() => setShowBuyCryptoModal(false)}
      />

      {/* Shill Templates Modal */}
      <ShillTemplatesModal
        isOpen={showShillModal}
        onClose={() => setShowShillModal(false)}
        tokenData={{
          name: activeTokenName || 'Token',
          symbol: activeTokenSymbol || activeTokenName || 'TOKEN',
          pairAddress: tokenSearch,
          chainId: selectedChain,
          blockchain: CHAIN_TO_BLOCKCHAIN_PARAM[selectedChain] || selectedChain
        }}
        currentUser={currentUser}
      />
    </div>
  );
};

AquaSwap.propTypes = {
  currentUser: PropTypes.object,
  showNotification: PropTypes.func.isRequired
};

export default AquaSwap; 