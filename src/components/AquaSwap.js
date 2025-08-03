import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, Link } from 'react-router-dom';
import { LiFiWidget } from '@lifi/widget';
import logger from '../utils/logger';
import BannerDisplay from './BannerDisplay';
import EmbedCodeGenerator from './EmbedCodeGenerator';

import './AquaSwap.css';

// Constants - using the same fee structure as the current swap
const FEE_PERCENTAGE = 0.0025; // 0.25% fee
const ETH_FEE_WALLET = process.env.REACT_APP_FEE_WALLET; // Ethereum wallet address
const SOLANA_FEE_WALLET = process.env.REACT_APP_SOLANA_FEE_WALLET; // Solana wallet address
const SUI_FEE_WALLET = process.env.REACT_APP_SUI_FEE_WALLET; // SUI wallet address

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Fallback popular token examples if ads can't be loaded
const FALLBACK_TOKEN_EXAMPLES = [];

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

  const tradingViewRef = useRef(null);
  const dexScreenerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Initialize on component mount
  useEffect(() => {
    // Add class to body to enable scrolling
    document.body.classList.add('aquaswap-page');

    // Check URL parameters for token data from bubble clicks
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    const blockchainParam = urlParams.get('blockchain');
    
    if (tokenParam && blockchainParam) {
      // Set token search and chain based on URL parameters
      setTokenSearch(tokenParam);
      setSelectedChain(getChainForBlockchain(blockchainParam));
      setChartProvider('dexscreener');
      
      // Clean up URL by removing the parameters
      window.history.replaceState({}, document.title, '/aquaswap');
    }

    // Cleanup: remove class when component unmounts
    return () => {
      document.body.classList.remove('aquaswap-page');
    };
  }, []);

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
        console.error('Error fetching bubble tokens:', error);
        // Keep existing popular tokens or empty array on error
        setPopularTokens([]);
      }
    };

    fetchBubbleTokens();
  }, []);

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
          .slice(0, 10) // Limit to top 10 results
          .map(pair => ({
            id: `${pair.chainId}-${pair.pairAddress}`,
            name: pair.baseToken.name,
            symbol: pair.baseToken.symbol,
            pairAddress: pair.pairAddress,
            chainId: pair.chainId,
            dexId: pair.dexId,
            priceUsd: pair.priceUsd,
            volume24h: pair.volume?.h24 || 0,
            liquidityUsd: pair.liquidity?.usd || 0,
            priceChange24h: pair.priceChange?.h24 || 0,
            logo: pair.info?.imageUrl,
            url: pair.url
          }));

        setSearchResults(processedResults);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
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
      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": "BTCUSDT",
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
  }, [chartProvider]);



  // Load DEXScreener widget with improved reliability
  useEffect(() => {
    if (chartProvider === 'dexscreener' && dexScreenerRef.current && tokenSearch.trim()) {
      // Validate that tokenSearch looks like a valid pair address
      const isValidPairAddress = /^0x[a-fA-F0-9]{40}$/.test(tokenSearch.trim()) || 
                                /^[A-Za-z0-9]{32,44}$/.test(tokenSearch.trim());
      
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
            <button 
              className="back-to-main-button"
              onClick={() => navigate('/')}
              title="Back to Main Page"
            >
              ← Back to Main
            </button>
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
              <Link 
                to="/buy-crypto"
                className="fiat-purchase-button"
                title="Buy crypto with credit/debit card"
              >
                💳 Buy Card
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Layout (unchanged for mobile compatibility) */}
        <button 
          className="back-to-main-button"
          onClick={() => navigate('/')}
          title="Back to Main Page"
        >
          ← Back to Main
        </button>

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
            <Link 
              to="/buy-crypto"
              className="fiat-purchase-button"
              title="Buy crypto with credit/debit card"
            >
              💳 Buy with Card
            </Link>
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
                <p>✨ Cross-chain swaps • 38+ blockchains • Best rates</p>
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
                  🔍 DEXtrader
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
                  </div>
                </div>
              )}
            </div>
            
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


    </div>
  );
};

AquaSwap.propTypes = {
  currentUser: PropTypes.object,
  showNotification: PropTypes.func.isRequired
};

export default AquaSwap; 