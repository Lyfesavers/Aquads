import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { LiFiWidget } from '@lifi/widget';
import logger from '../utils/logger';
import BannerDisplay from './BannerDisplay';
import EmbedCodeGenerator from './EmbedCodeGenerator';
import FiatPurchase from './FiatPurchase';
import './AquaSwap.css';

// Constants - using the same fee structure as the current swap
const FEE_PERCENTAGE = 0.02; // 2% fee
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
  const [showFiatPurchase, setShowFiatPurchase] = useState(false);
  const tradingViewRef = useRef(null);
  const dexToolsRef = useRef(null);

  // Initialize on component mount
  useEffect(() => {
    // Add class to body to enable scrolling
    document.body.classList.add('aquaswap-page');

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
          ad.pairAddress && 
          ad.pairAddress.trim() !== ''
        );
        
        // Sort using the same logic as main bubble display: bumped first, then by bullish votes
        const sortedAds = validAds.sort((a, b) => {
          // First prioritize bumped bubbles - all bumped bubbles come before unbumped ones
          if (a.isBumped && !b.isBumped) return -1;
          if (!a.isBumped && b.isBumped) return 1;
          
          // Then sort by bullish votes (highest first)
          return (b.bullishVotes || 0) - (a.bullishVotes || 0);
        });
        
        const topAds = sortedAds.slice(0, 10);
        
        // Convert ads to popular token format
        const bubbleTokens = topAds.map(ad => ({
          name: ad.title,
          address: ad.pairAddress,
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

  // Convert blockchain names to dextools chain format
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

  // Load TradingView widget
  useEffect(() => {
    if (chartProvider === 'tradingview' && tradingViewRef.current) {
      // Clear previous widget
      tradingViewRef.current.innerHTML = '';
      
      // Create TradingView widget
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": "BTCUSDT",
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "backgroundColor": "rgba(17, 24, 39, 1)",
        "gridColor": "rgba(255, 255, 255, 0.1)",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "container_id": "tradingview_widget",
        "toolbar_bg": "#1f2937",
        "withdateranges": true,
        "allow_symbol_change": true
      });
      
      tradingViewRef.current.appendChild(script);
    }
  }, [chartProvider]);

  // Load DexTools widget with improved error handling
  useEffect(() => {
    if (chartProvider === 'dextools' && dexToolsRef.current && tokenSearch.trim()) {
      // Clear previous widget
      dexToolsRef.current.innerHTML = '';
      
      // Create loading indicator
      dexToolsRef.current.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: rgba(0, 0, 0, 0.2); border-radius: 8px; color: #9ca3af;">
          <div style="font-size: 2rem; margin-bottom: 16px;">📊</div>
          <h3 style="color: #ffffff; margin: 0 0 8px 0;">Loading Chart...</h3>
          <p style="margin: 0; text-align: center; line-height: 1.5;">Connecting to DexTools</p>
        </div>
      `;
      
      // Create DexTools iframe with minimal restrictions
      const iframe = document.createElement('iframe');
      iframe.id = 'dextools-widget';
      iframe.title = 'DexTools Trading Chart';
      iframe.width = '100%';
      iframe.height = '100%';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      iframe.style.minHeight = '400px';
      iframe.frameBorder = '0';
      iframe.scrolling = 'no';
      
      // Build DexTools widget URL - minimal parameters to avoid conflicts
      const widgetUrl = `https://www.dextools.io/widget-chart/en/${selectedChain}/pe-light/${tokenSearch.trim()}?theme=dark`;
      
      // Add error handling for iframe loading
      iframe.onload = () => {
        // Chart loaded successfully
        if (dexToolsRef.current) {
          const loadingDiv = dexToolsRef.current.querySelector('.loading-indicator');
          if (loadingDiv) {
            loadingDiv.remove();
          }
        }
      };
      
      iframe.onerror = () => {
        // Handle iframe loading error
        if (dexToolsRef.current) {
          dexToolsRef.current.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: rgba(0, 0, 0, 0.2); border-radius: 8px; color: #9ca3af;">
              <div style="font-size: 2rem; margin-bottom: 16px;">⚠️</div>
              <h3 style="color: #ffffff; margin: 0 0 8px 0;">Chart Loading Error</h3>
              <p style="margin: 0; text-align: center; line-height: 1.5;">Unable to load DexTools chart. Please try a different token or refresh the page.</p>
            </div>
          `;
        }
      };
      
      iframe.src = widgetUrl;
      iframe.allow = 'fullscreen';
      
      // Add mobile-specific attributes
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('webkitallowfullscreen', 'true');
      iframe.setAttribute('mozallowfullscreen', 'true');
      
      // Clear loading indicator and add iframe
      if (dexToolsRef.current) {
        dexToolsRef.current.innerHTML = '';
        dexToolsRef.current.appendChild(iframe);
      }
      
    } else if (chartProvider === 'dextools' && dexToolsRef.current && !tokenSearch.trim()) {
      // Show placeholder when no search term
      dexToolsRef.current.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: rgba(0, 0, 0, 0.2); border-radius: 8px; color: #9ca3af;">
          <div style="font-size: 3rem; margin-bottom: 16px;">🔍</div>
          <h3 style="color: #ffffff; margin: 0 0 8px 0;">Search Any Token</h3>
          <p style="margin: 0; text-align: center; line-height: 1.5;">Enter a contract address above to view any token's chart</p>
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
        {/* Back button */}
      <button 
        className="back-to-main-button"
        onClick={() => navigate('/')}
        title="Back to Main Page"
      >
        ← Back to Main
      </button>

      {/* Banner Display */}
      <BannerDisplay />

        {/* Title */}
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
          
          {/* Action Buttons */}
          <div className="header-buttons">
            <button 
              className="embed-toggle-button"
              onClick={() => setShowEmbedCode(!showEmbedCode)}
              title="Get embed code to add AquaSwap to your website"
            >
              {showEmbedCode ? '❌ Close Embed Code' : '🔗 Embed on Your Site'}
            </button>
            <button 
              className="fiat-purchase-button"
              onClick={() => setShowFiatPurchase(!showFiatPurchase)}
              title="Buy crypto with credit/debit card"
            >
              {showFiatPurchase ? '❌ Close Card Purchase' : '💳 Buy with Card'}
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

      {/* Fiat Purchase Section - Separate from main trading interface */}
      {showFiatPurchase && (
        <div 
          className="fiat-purchase-section"
          onClick={(e) => {
            // Close modal when clicking on backdrop
            if (e.target === e.currentTarget) {
              setShowFiatPurchase(false);
            }
          }}
        >
          <div className="fiat-purchase-wrapper">
            <button 
              className="close-fiat-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowFiatPurchase(false);
              }}
              title="Close Fiat Purchase"
            >
              ❌ Close
            </button>
            <FiatPurchase 
              userWallet={currentUser?.wallet || null}
              showNotification={showNotification}
            />
          </div>
        </div>
      )}
    
      {/* Main Trading Interface - Original Setup */}
      <div className="trading-interface with-charts">
        {/* Left Side - Swap Widget */}
        <div className="swap-section">
          <div className="lifi-widget">
            <LiFiWidget integrator="aquaswap" config={widgetConfig} />
          </div>
          <div className="swap-footer">
            <p>✨ Swap and bridge across 38+ blockchains with the best rates and lowest fees.</p>
          </div>
        </div>

        {/* Right Side - Charts */}
        <div className="chart-section">
          <div className="chart-header">
            <h3 className="chart-title">Professional Trading Charts</h3>
            
            {/* Compact controls row */}
            <div className="chart-controls-row">
              <div className="chart-provider-selector">
                <button 
                  className={`provider-btn ${chartProvider === 'tradingview' ? 'active' : ''}`}
                  onClick={() => setChartProvider('tradingview')}
                >
                  📊 TradingView
                  <span className="provider-desc">Major</span>
                </button>
                <button 
                  className={`provider-btn ${chartProvider === 'dextools' ? 'active' : ''}`}
                  onClick={() => setChartProvider('dextools')}
                >
                  🚀 DexTools
                  <span className="provider-desc">Any Token</span>
                </button>
              </div>
              
              {/* DexTools search interface - inline */}
              {chartProvider === 'dextools' && (
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
                    <label className="search-label">Address:</label>
                    <input
                      type="text"
                      value={tokenSearch}
                      onChange={(e) => setTokenSearch(e.target.value)}
                      placeholder="Contract address (e.g., 0xa43fe16908251ee70ef74718545e4fe6c5ccec9f)"
                      className="token-search-input"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Trending tokens - only show for DexTools */}
            {chartProvider === 'dextools' && popularTokens.length > 0 && (
              <div className="dextools-search-section">
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
                id="tradingview_widget" 
                style={{ height: '100%', width: '100%' }}
              />
            )}
            
            {chartProvider === 'dextools' && (
              <div 
                ref={dexToolsRef}
                style={{ height: '100%', width: '100%' }}
              />
            )}
          </div>
          
          <div className="chart-info">
            <p className="chart-note">
              {chartProvider === 'tradingview' ? (
                <>
                  💡 <strong>TradingView (Major Tokens):</strong> Perfect for BTC, ETH, BNB, SOL and other established cryptocurrencies
                  <br />
                  📊 Use the search bar in the chart to find tokens like "BTCUSDT", "ETHUSDT", "SOLUSDT"
                </>
              ) : (
                <>
                  🚀 <strong>DexTools (Any Token):</strong> Enter any token's contract address to view its chart and trading data
                  <br />
                  📈 Trending tokens above are ranked first by bumped status, then by community votes from our bubble ads
                  <br />
                  ⚠️ Some tokens may not load if they lack trading pairs or liquidity on DEXs
                </>
              )}
            </p>
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