import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { LiFiWidget } from '@lifi/widget';
import logger from '../utils/logger';
import BannerDisplay from './BannerDisplay';
import './AquaSwap.css';

// Constants - using the same fee structure as the current swap
const FEE_PERCENTAGE = 0.02; // 2% fee
const ETH_FEE_WALLET = process.env.REACT_APP_FEE_WALLET; // Ethereum wallet address
const SOLANA_FEE_WALLET = process.env.REACT_APP_SOLANA_FEE_WALLET; // Solana wallet address
const SUI_FEE_WALLET = process.env.REACT_APP_SUI_FEE_WALLET; // SUI wallet address

// Popular token examples for quick access
const POPULAR_TOKEN_EXAMPLES = [
  { name: 'PEPE', address: '0xa43fe16908251ee70ef74718545e4fe6c5ccec9f', chain: 'ether' },
  { name: 'SHIB', address: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', chain: 'ether' },
  { name: 'FLOKI', address: '0xcf0c122c6b73ff809c693db761e7baebe62b6a2e', chain: 'ether' },
  { name: 'DOGE', address: '0x4206931337dc273a630d328da6441786bfad668f', chain: 'ether' }
];

// Chain detection utility function
const detectChainFromAddress = (address) => {
  if (!address || typeof address !== 'string') return null;
  
  const cleanAddress = address.trim();
  
  // Bitcoin and Bitcoin-like addresses
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(cleanAddress) || // Legacy (P2PKH/P2SH)
      /^bc1[a-z0-9]{39,59}$/.test(cleanAddress)) { // Bech32
    return 'bitcoin';
  }
  
  // Litecoin addresses
  if (/^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(cleanAddress) || // Legacy
      /^ltc1[a-z0-9]{39,59}$/.test(cleanAddress)) { // Bech32
    return 'litecoin';
  }
  
  // Dogecoin addresses
  if (/^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$/.test(cleanAddress)) {
    return 'dogechain';
  }
  
  // Dash addresses
  if (/^X[1-9A-HJ-NP-Za-km-z]{33}$/.test(cleanAddress)) {
    return 'dash';
  }
  
  // Zcash addresses
  if (/^t1[a-zA-Z0-9]{33}$/.test(cleanAddress) || // Transparent
      /^zc[a-zA-Z0-9]{93}$/.test(cleanAddress) || // Sprout shielded
      /^zs1[a-z0-9]{75}$/.test(cleanAddress)) { // Sapling shielded
    return 'zcash';
  }
  
  // Monero addresses (integrated addresses are longer)
  if (/^4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/.test(cleanAddress) || // Standard
      /^8[0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/.test(cleanAddress)) { // Integrated
    return 'monero';
  }
  
  // XRP addresses
  if (/^r[rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz]{27,34}$/.test(cleanAddress)) {
    return 'xrp';
  }
  
  // Stellar addresses
  if (/^G[A-Z2-7]{55}$/.test(cleanAddress)) {
    return 'stellar';
  }
  
  // Algorand addresses
  if (/^[A-Z2-7]{58}$/.test(cleanAddress)) {
    return 'algorand';
  }
  
  // Hedera addresses (0.0.xxxx format)
  if (/^0\.0\.\d+$/.test(cleanAddress)) {
    return 'hedera';
  }
  
  // TRON addresses (Base58, starts with T)
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(cleanAddress)) {
    return 'tron';
  }
  
  // Near Protocol addresses (typically end with .near or are hex)
  if (cleanAddress.endsWith('.near') || 
      (/^[a-f0-9]{64}$/.test(cleanAddress) && cleanAddress.length === 64)) {
    return 'near';
  }
  
  // Solana addresses (Base58, typically 32-44 characters, no 0x prefix)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleanAddress) && !cleanAddress.startsWith('0x')) {
    return 'solana';
  }
  
  // Cosmos ecosystem addresses (bech32 format with specific prefixes)
  if (/^cosmos[a-z0-9]{39}$/.test(cleanAddress)) return 'cosmos';
  if (/^osmo[a-z0-9]{39}$/.test(cleanAddress)) return 'osmosis';
  if (/^juno[a-z0-9]{39}$/.test(cleanAddress)) return 'juno';
  if (/^kujira[a-z0-9]{39}$/.test(cleanAddress)) return 'kujira';
  if (/^terra[a-z0-9]{39}$/.test(cleanAddress)) return 'terra';
  if (/^secret[a-z0-9]{39}$/.test(cleanAddress)) return 'secret';
  if (/^injective[a-z0-9]{39}$/.test(cleanAddress)) return 'injective';
  if (/^sei[a-z0-9]{39}$/.test(cleanAddress)) return 'sei';
  
  // Polkadot addresses (SS58 format, typically 47-48 characters)
  if (/^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(cleanAddress) && 
      (cleanAddress.startsWith('1') || cleanAddress.startsWith('5'))) {
    return 'polkadot';
  }
  
  // Kusama addresses (SS58 format, different prefixes)
  if (/^[C-J][1-9A-HJ-NP-Za-km-z]{46,47}$/.test(cleanAddress)) {
    return 'kusama';
  }
  
  // Cardano addresses (Bech32 format starting with addr)
  if (/^addr[a-z0-9]{98,}$/.test(cleanAddress)) {
    return 'cardano';
  }
  
  // Flow addresses (0x + 16 hex characters)
  if (/^0x[a-fA-F0-9]{16}$/.test(cleanAddress)) {
    return 'flow';
  }
  
  // Aptos addresses (0x + up to 64 hex characters, typically shorter than EVM)
  if (/^0x[a-fA-F0-9]{1,64}$/.test(cleanAddress) && cleanAddress.length <= 66) {
    // Could be Aptos, Sui, or EVM - need more sophisticated detection
    if (cleanAddress.length <= 34) { // Aptos addresses are typically shorter
      return 'aptos';
    }
  }
  
  // SUI addresses (0x + up to 64 hex characters, typically very short)
  if (/^0x[a-fA-F0-9]{1,64}$/.test(cleanAddress) && cleanAddress.length <= 20) {
    return 'sui';
  }
  
  // TON addresses (various formats)
  if (/^[a-zA-Z0-9_-]{48}$/.test(cleanAddress) || 
      /^[0-9]+:[a-fA-F0-9]{64}$/.test(cleanAddress) ||
      /^EQ[A-Za-z0-9_-]{46}$/.test(cleanAddress)) {
    return 'ton';
  }
  
  // Filecoin addresses
  if (/^f[014][a-z2-7]{38,86}$/.test(cleanAddress)) {
    return 'filecoin';
  }
  
  // Arweave addresses (43 characters, alphanumeric + - and _)
  if (/^[a-zA-Z0-9_-]{43}$/.test(cleanAddress)) {
    return 'arweave';
  }
  
  // VeChain addresses (0x + 40 hex, but we can differentiate by known patterns)
  // For now, we'll let it fall through to EVM detection
  
  // Chia addresses (xch format)
  if (/^xch1[a-z0-9]{58}$/.test(cleanAddress)) {
    return 'chia';
  }
  
  // Internet Computer (ICP) addresses
  if (/^[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}$/.test(cleanAddress)) {
    return 'icp';
  }
  
  // Zilliqa addresses (0x + 40 hex, but starts with specific pattern)
  if (/^0x[a-fA-F0-9]{40}$/.test(cleanAddress) && cleanAddress.toLowerCase().startsWith('0x1')) {
    return 'zilliqa';
  }
  
  // NEO addresses (34 characters, starts with A)
  if (/^A[a-zA-Z0-9]{33}$/.test(cleanAddress)) {
    return 'neo';
  }
  
  // Ontology addresses (34 characters, starts with A)
  if (/^A[a-zA-Z0-9]{33}$/.test(cleanAddress)) {
    return 'ontology'; // Note: Same format as NEO, hard to distinguish
  }
  
  // Waves addresses (35 characters, starts with 3P)
  if (/^3P[a-zA-Z0-9]{33}$/.test(cleanAddress)) {
    return 'waves';
  }
  
  // QTUM addresses (similar to Bitcoin)
  if (/^Q[a-km-zA-HJ-NP-Z1-9]{33}$/.test(cleanAddress)) {
    return 'qtum';
  }
  
  // ICON addresses (hx + 40 hex characters)
  if (/^hx[a-fA-F0-9]{40}$/.test(cleanAddress)) {
    return 'icon';
  }
  
  // NEM/Symbol addresses (39 characters, starts with N for NEM, T for Symbol)
  if (/^N[A-Z2-7]{38}$/.test(cleanAddress)) {
    return 'nem';
  }
  if (/^T[A-Z2-7]{38}$/.test(cleanAddress)) {
    return 'symbol';
  }
  
  // XDC Network addresses (xdc + 40 hex characters)
  if (/^xdc[a-fA-F0-9]{40}$/.test(cleanAddress)) {
    return 'xdc';
  }
  
  // EVM-based chains (Ethereum format: 0x + 40 hex characters)
  // This covers: Ethereum, BSC, Polygon, Avalanche, Arbitrum, Optimism, Base, etc.
  if (/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
    // For EVM addresses, we could enhance this by checking against known contract addresses
    // or by analyzing the first few bytes, but for now default to Ethereum
    // Most EVM chains share the same address format
    return 'ether'; // Default to Ethereum for standard EVM addresses
  }
  
  // Return null if no pattern matches
  return null;
};

const AquaSwap = ({ currentUser, showNotification }) => {
  const navigate = useNavigate();
  const [chartProvider, setChartProvider] = useState('tradingview');
  const [tokenSearch, setTokenSearch] = useState('');
  const [selectedChain, setSelectedChain] = useState('ether');
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

  // Load DexTools widget using official implementation
  useEffect(() => {
    if (chartProvider === 'dextools' && dexToolsRef.current && tokenSearch.trim()) {
      // Clear previous widget
      dexToolsRef.current.innerHTML = '';
      
      // Create DexTools iframe using official widget format with mobile optimizations
      const iframe = document.createElement('iframe');
      iframe.id = 'dextools-widget';
      iframe.title = 'DexTools Trading Chart';
      iframe.width = '100%';
      iframe.height = '100%';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      iframe.style.minHeight = '400px'; // Ensure minimum height for mobile
      iframe.frameBorder = '0';
      iframe.scrolling = 'no';
      
      // Build DexTools widget URL according to their documentation with mobile-friendly parameters
      const widgetUrl = `https://www.dextools.io/widget-chart/en/${selectedChain}/pe-light/${tokenSearch.trim()}?theme=dark&chartType=1&chartResolution=15&drawingToolbars=false&tvPlatformColor=111827&tvPaneColor=1f2937&headerColor=111827`;
      
      iframe.src = widgetUrl;
      iframe.allow = 'fullscreen';
      
      // Add mobile-specific attributes
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('webkitallowfullscreen', 'true');
      iframe.setAttribute('mozallowfullscreen', 'true');
      
      dexToolsRef.current.appendChild(iframe);
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

  // Handle token search input with automatic chain detection
  const handleTokenSearchChange = (e) => {
    const newAddress = e.target.value;
    setTokenSearch(newAddress);
    
    // Auto-detect chain if address looks valid
    if (newAddress.trim().length > 10) { // Only detect for reasonably long addresses
      const detectedChain = detectChainFromAddress(newAddress);
      if (detectedChain && detectedChain !== selectedChain) {
        setSelectedChain(detectedChain);
        // Show notification about auto-detection
        if (showNotification) {
          const chainName = getChainDisplayName(detectedChain);
          showNotification(`Auto-detected ${chainName} chain for this address`, 'info');
        }
      }
    }
  };

  // Helper function to get display name for chain
  const getChainDisplayName = (chainId) => {
    const chainNames = {
      'ether': 'Ethereum',
      'bitcoin': 'Bitcoin',
      'litecoin': 'Litecoin',
      'dogechain': 'Dogechain',
      'dash': 'Dash',
      'zcash': 'Zcash',
      'monero': 'Monero',
      'xrp': 'XRP Ledger',
      'stellar': 'Stellar',
      'algorand': 'Algorand',
      'hedera': 'Hedera',
      'tron': 'TRON',
      'near': 'NEAR Protocol',
      'solana': 'Solana',
      'cosmos': 'Cosmos',
      'osmosis': 'Osmosis',
      'juno': 'Juno',
      'kujira': 'Kujira',
      'terra': 'Terra',
      'secret': 'Secret Network',
      'injective': 'Injective',
      'sei': 'Sei',
      'polkadot': 'Polkadot',
      'kusama': 'Kusama',
      'cardano': 'Cardano',
      'flow': 'Flow',
      'aptos': 'Aptos',
      'sui': 'Sui',
      'ton': 'TON',
      'filecoin': 'Filecoin',
      'arweave': 'Arweave',
      'chia': 'Chia',
      'icp': 'Internet Computer',
      'zilliqa': 'Zilliqa',
      'neo': 'NEO',
      'ontology': 'Ontology',
      'waves': 'Waves',
      'qtum': 'Qtum',
      'icon': 'ICON',
      'nem': 'NEM',
      'symbol': 'Symbol',
      'xdc': 'XDC Network',
      'bnb': 'BNB Chain (BSC)',
      'polygon': 'Polygon',
      'avalanche': 'Avalanche',
      'arbitrum': 'Arbitrum',
      'optimism': 'Optimism',
      'base': 'Base',
      'fantom': 'Fantom',
      'cronos': 'Cronos',
      'moonbeam': 'Moonbeam',
      'celo': 'Celo',
      'aurora': 'Aurora',
      'harmony': 'Harmony',
      'klaytn': 'Klaytn',
      'evmos': 'Evmos',
      'kava': 'Kava',
      'canto': 'Canto',
      'gnosis': 'Gnosis Chain',
      'oasis': 'Oasis Network',
      'fuse': 'Fuse',
      'velas': 'Velas',
      'syscoin': 'Syscoin',
      'telos': 'Telos',
      'metis': 'Metis',
      'boba': 'Boba Network',
      'mantle': 'Mantle',
      'mode': 'Mode',
      'blast': 'Blast',
      'manta': 'Manta Pacific',
      'linea': 'Linea',
      'scroll': 'Scroll',
      'zksync': 'zkSync Era',
      'polygonzkevm': 'Polygon zkEVM',
      'starknet': 'Starknet',
      'ronin': 'Ronin',
      'shib': 'Shibarium',
      'pulse': 'PulseChain',
      'vechain': 'VeChain'
    };
    return chainNames[chainId] || chainId;
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
        </div>
      </div>
    
      {/* Main Trading Interface */}
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
                      <option value="wax">WAX</option>
                      <option value="enjin">Enjin</option>
                      <option value="xai">Xai</option>
                      <option value="gala">Gala</option>
                      <option value="immutable">Immutable zkEVM</option>
                      <option value="beam">Beam</option>
                      <option value="treasure">Treasure</option>
                      
                      {/* Meme & Community Chains */}
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
                      <option value="terra2">Terra 2.0</option>
                      <option value="kujira">Kujira</option>
                      <option value="injective">Injective</option>
                      <option value="dydx">dYdX</option>
                      <option value="degen">Degen Chain</option>
                      
                      {/* Emerging & New Chains */}
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
                      <option value="lisk">Lisk</option>
                      <option value="stratis">Stratis</option>
                      <option value="ark">ARK</option>
                      <option value="aelf">aelf</option>
                      <option value="ardor">Ardor</option>
                      <option value="nxt">NXT</option>
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
                      onChange={handleTokenSearchChange}
                      placeholder="Contract address (auto-detects chain)"
                      className="token-search-input"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Popular tokens - only show for DexTools */}
            {chartProvider === 'dextools' && (
              <div className="dextools-search-section">
                <div className="popular-tokens">
                  <span className="popular-label">Popular:</span>
                  {POPULAR_TOKEN_EXAMPLES.map((token, index) => (
                    <button
                      key={index}
                      onClick={() => handlePopularTokenClick(token)}
                      className="popular-token-btn"
                      title={`${token.name}: ${token.address}`}
                    >
                      {token.name}
                    </button>
                  ))}
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
                  📈 Contract addresses are auto-detected for chain selection. Find addresses on CoinGecko, Etherscan, or token websites
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