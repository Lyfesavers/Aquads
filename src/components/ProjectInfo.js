import React, { useState } from 'react';
import { FaRocket, FaUsers, FaChartLine, FaGlobe, FaShieldAlt, FaCog, FaCheckCircle, FaArrowRight, FaBullhorn, FaGamepad, FaHandshake, FaTrophy, FaArrowLeft, FaCreditCard, FaExchangeAlt, FaUsersCog, FaVideo, FaMicrophone, FaNewspaper, FaStar, FaFire, FaGem, FaCrown, FaGift, FaTwitter, FaLightbulb, FaCrosshairs, FaNetworkWired } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import CreateAdModal from './CreateAdModal';
import CreateBannerModal from './CreateBannerModal';
import BumpStore from './BumpStore';

// Aquads-branded marketing add-on packages
const ADDON_PACKAGES = [
  {
    id: 'aqua_splash',
    name: 'AquaSplash',
    originalPrice: 99,
    price: 99,
    icon: FaNewspaper,
    color: 'from-green-500 to-emerald-500',
    features: [
      'Newsroom Press Release',
      'Leading Web3 Press Release Site',
      'Approx. Monthly Visitors: 15000',
      'Includes Social Media Posting',
      'Domain Authority: 43'
    ]
  },
  {
    id: 'aqua_ripple',
    name: 'AquaRipple',
    originalPrice: 299,
    price: 284,
    icon: FaStar,
    color: 'from-blue-500 to-cyan-500',
    features: [
      '4+ Media Pickups Guaranteed',
      'Estimated Reach: 5k-15k',
      '<24 Hour Distribution',
    ]
  },
  {
    id: 'aqua_wave',
    name: 'AquaWave',
    originalPrice: 1399,
    price: 1329,
    icon: FaRocket,
    color: 'from-green-500 to-teal-500',
    features: [
      '9+ Media Pickups Guaranteed',
      'Estimated Reach: 75k-250k',
      '24-72 Hour Distribution'
    ]
  },
  {
    id: 'aqua_flow',
    name: 'AquaFlow',
    originalPrice: 2899,
    price: 2754,
    icon: FaChartLine,
    color: 'from-purple-500 to-indigo-500',
    features: [
      'CoinMarketCap (Community Section)',
      'CryptoPolitan',
      'CoinCodex',
      'BraveNewCoin',
      'Bitcolumnist',
      '24-72 Hour Distribution',
      'SEO Optimizations'
    ]
  },
  {
    id: 'aqua_storm',
    name: 'AquaStorm',
    originalPrice: 6499,
    price: 6174,
    icon: FaFire,
    color: 'from-orange-500 to-red-500',
    features: [
      'Everything from AquaWave, plus:',
      '75+ Media Pickups Guaranteed',
      'Site Audience of 75M+',
      'Guaranteed coverage from Yahoo Finance and MarketWatch',
      'Requirements: 500-word maximum'
    ]
  },
  {
    id: 'aqua_tidal',
    name: 'AquaTidal',
    originalPrice: 12999,
    price: 12349,
    icon: FaGem,
    color: 'from-indigo-500 to-purple-500',
    features: [
      'Everything from AquaStorm plus:',
      '125+ Media Pickups Guaranteed',
      'Site Audience of 300M+',
      'Coverage from: Cointelegraph',
      'CoinMarketCap (Community Section)',
      'Requirements: 500-word maximum'
    ]
  },
  {
    id: 'aqua_legend',
    name: 'AquaLegend',
    originalPrice: 21999,
    price: 20899,
    icon: FaCrown,
    color: 'from-pink-500 to-rose-500',
    features: [
      'Coverage from top crypto publications:',
      'Cointelegraph • CoinMarketCap',
      'Bitcoin.com • AMB Crypto',
      'Coinspeaker • Coincodex',
      'Cryptopolitan • Bitcolumnist',
      'CoinGape • CryptoNews',
      'Yahoo Finance',
      '6-72 Hour Distribution',
      'Requirements: 500-word maximum'
    ]
  }
];

const ProjectInfo = ({ currentUser, ads = [] }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showBumpStore, setShowBumpStore] = useState(false);
  const [selectedAdForBump, setSelectedAdForBump] = useState(null);

  // Check if user has any projects listed
  const userHasProjects = ads.some(ad => ad.owner === currentUser?.username);

  // Open MintFunnel platform in full-screen popup
  const openMintFunnelPlatform = () => {
    const popup = window.open(
      'https://mintfunnel.co/crypto-ad-network/?ref=Aquads',
      'mintfunnel-platform',
      'width=' + window.screen.width + ',height=' + window.screen.height + ',scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no,directories=no'
    );

    if (!popup) {
      alert('Popup blocked! Please allow popups for this site and try again.');
    }
  };

  const handleCreateAd = async (adData) => {
    try {
      // This will be handled by the CreateAdModal component
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating ad:', error);
    }
  };

  const handleBannerSubmit = async (bannerData) => {
    try {
      // This will be handled by the CreateBannerModal component
      setShowBannerModal(false);
    } catch (error) {
      console.error('Error creating banner:', error);
    }
  };

  const handleBumpPurchase = async (adId, txSignature, duration) => {
    try {
      // This will be handled by the BumpStore component
      setShowBumpStore(false);
      setSelectedAdForBump(null);
    } catch (error) {
      console.error('Error purchasing bump:', error);
    }
  };

  const handleBumpClick = () => {
    // Get the user's first project for bumping
    const userAd = ads.find(ad => ad.owner === currentUser?.username);
    if (userAd) {
      setSelectedAdForBump(userAd);
      setShowBumpStore(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          to="/"
          className="inline-flex items-center text-gray-300 hover:text-white transition-colors duration-300"
        >
          <FaArrowLeft className="mr-2" />
          Back to Home
        </Link>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Why List Your Project on
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400"> Aquads</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Join the world's first BEX (Bicentralized Exchange) and tap into a thriving Web3 ecosystem designed specifically for crypto projects.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <FaRocket className="mr-2" />
                List Your Project Now
                <FaArrowRight className="ml-2" />
              </button>
              <Link
                to="/whitepaper"
                className="inline-flex items-center px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-300 border border-gray-600"
              >
                Read Our Whitepaper
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Aquads Advantages Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            The Aquads Advantage
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Discover why leading crypto projects choose Aquads for their marketing and community building needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Advantage 1 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-blue-500 p-3 rounded-lg">
                <FaChartLine className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Immediate Trading Integration on our BEX</h3>
            </div>
            <p className="text-gray-300">
              Users click your bubble and instantly trade your token with live charts. Direct integration with AquaSwap Bex eliminates barriers and drives immediate conversions.</p>
          </div>

          {/* Advantage 2 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <FaUsers className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Community Validation</h3>
            </div>
            <p className="text-gray-300">
              Real user votes build trust through our bullish/bearish voting system. Community-driven success based on merit, not just budget.
            </p>
          </div>

          {/* Advantage 3 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-purple-500 p-3 rounded-lg">
                <FaBullhorn className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Professional PR</h3>
            </div>
            <p className="text-gray-300">
              Included press release and distribution to premium platforms. Access to CoinDesk, CoinMarketCap, and other tier-1 publications.
            </p>
          </div>

          {/* Advantage 4 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-indigo-500 p-3 rounded-lg">
                <FaGlobe className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Multi-Chain Support</h3>
            </div>
            <p className="text-gray-300">
              Reach users across all major blockchains. Support for 20+ chains including Ethereum, BSC, Polygon, Solana, and more.
            </p>
          </div>

          {/* Advantage 5 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-yellow-500 p-3 rounded-lg">
                <FaTrophy className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Proven ROI</h3>
            </div>
            <p className="text-gray-300">
              Measurable results and conversion tracking. Real-time analytics to monitor performance and optimize your campaign.
            </p>
          </div>

          {/* Advantage 6 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-pink-500 p-3 rounded-lg">
                <FaHandshake className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Ecosystem Access</h3>
            </div>
            <p className="text-gray-300">
              Freelancers, gaming, content marketing, and more. Access to our complete Web3 ecosystem for comprehensive growth.
            </p>
          </div>

          {/* Advantage 7 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <FaCreditCard className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Paid Ad Campaigns</h3>
            </div>
            <p className="text-gray-300">
              Targeted banner ads and premium placement options. Reach specific audiences with customizable campaigns that drive traffic and conversions to your project.
            </p>
          </div>

          {/* Advantage 8 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-orange-500 p-3 rounded-lg">
                <FaExchangeAlt className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">On-Ramp & Off-Ramp</h3>
            </div>
            <p className="text-gray-300">
              Seamless fiat-to-crypto and crypto-to-fiat conversion services. Users can easily buy and sell your tokens with multiple payment methods and instant processing.
            </p>
          </div>

          {/* Advantage 9 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-purple-500 p-3 rounded-lg">
                <FaUsersCog className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Community Raids</h3>
            </div>
            <p className="text-gray-300">
              Organized community engagement campaigns and social media raids. Build momentum and create viral moments that boost your project's visibility and community growth.
            </p>
          </div>

          {/* Advantage 10 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-red-500 p-3 rounded-lg">
                <FaVideo className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">24/7 Live Streams</h3>
            </div>
            <p className="text-gray-300">
              Continuous live streaming of bubble ads and trending tokens across X, Kick, YouTube, and more platforms. Maximum exposure and engagement for your project.
            </p>
          </div>

          {/* Advantage 11 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-yellow-500 p-3 rounded-lg">
                <FaMicrophone className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Free AMA Services</h3>
            </div>
            <p className="text-gray-300">
              Access to our network of providers for free AMA (Ask Me Anything) sessions. Connect directly with your community and build trust through transparent communication.
            </p>
          </div>

          {/* Advantage 12 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-purple-500 p-3 rounded-lg">
                <FaCrosshairs className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">CPC Ads Across 1500+ Platforms</h3>
            </div>
            <p className="text-gray-300">
              Launch targeted CPC campaigns across 1500+ crypto and mainstream platforms. Reach millions of potential investors with precision targeting and real-time analytics.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Competitive Pricing
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Transparent pricing with flexible options to fit any budget and campaign goals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Base Listing */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Base Listing</h3>
              <div className="text-4xl font-bold text-blue-400 mb-2">$199</div>
              <div className="text-gray-400">USDC</div>
            </div>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Professional review & approval
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Interactive bubble display
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Community voting system
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Multi-chain support
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Trading integration
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                3 months free bubble bumping
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                PR press release publication
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Premium platform access
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Free AMA services
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Community Twitter raids
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Paid ad campaign exposure
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                $50 ad credit to run paid ads
              </li>
            </ul>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <FaRocket className="mr-2" />
              List Your Project
              <FaArrowRight className="ml-2" />
            </button>
          </div>

          {/* Bump Options */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-blue-500">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Bump Options</h3>
              <div className="text-4xl font-bold text-blue-400 mb-2">$99-300</div>
              <div className="text-gray-400">USDC</div>
            </div>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                3 Months: $99 USDC
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                6 Months: $150 USDC
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Lifetime: $300 USDC
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Priority positioning
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Enhanced visibility
              </li>
            </ul>
            {userHasProjects && (
              <button
                onClick={handleBumpClick}
                className="mt-6 w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <FaRocket className="mr-2" />
                Purchase Bump
                <FaArrowRight className="ml-2" />
              </button>
            )}
          </div>

          {/* Banner Ads */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Banner Ads</h3>
              <div className="text-4xl font-bold text-blue-400 mb-2">$40-160</div>
              <div className="text-gray-400">USDC</div>
            </div>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                24 Hours: $40 USDC
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                3 Days: $80 USDC
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                7 Days: $160 USDC
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Premium placement
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                High visibility
              </li>
            </ul>
            <button
              onClick={() => setShowBannerModal(true)}
              className="mt-6 w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <FaRocket className="mr-2" />
              Create Banner Ad
              <FaArrowRight className="ml-2" />
            </button>
          </div>
        </div>
      </div>

      {/* Marketing Add-on Packages Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Marketing Add-on Packages
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Amplify your project's reach with our comprehensive marketing solutions.
          </p>
          <div className="mt-4 p-4 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg">
            <p className="text-white font-semibold">🎉 5% Discount Promotion Banner</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ADDON_PACKAGES.map((pkg) => (
            <div key={pkg.id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
              <div className="text-center mb-6">
                <div className={`bg-gradient-to-r ${pkg.color} p-4 rounded-lg mb-4 inline-block`}>
                  <pkg.icon className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl font-bold text-blue-400">${pkg.price}</span>
                  {pkg.originalPrice !== pkg.price && (
                    <span className="text-gray-400 line-through">${pkg.originalPrice}</span>
                  )}
                </div>
                <div className="text-gray-400 text-sm">USDC</div>
              </div>
              <ul className="space-y-2 text-gray-300 text-sm">
                {pkg.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <FaCheckCircle className="text-green-400 mr-2 mt-1 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* CPC Ads Service Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-12 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white/20 p-4 rounded-lg mr-4">
              <FaCrosshairs className="text-white text-3xl" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              CPC Ads Across 1500+ Platforms
            </h2>
          </div>
          <p className="text-xl text-purple-100 mb-8 max-w-3xl mx-auto">
            Launch targeted CPC campaigns across 1500+ crypto and mainstream platforms. 
            Reach millions of potential investors with precision targeting and real-time analytics.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 rounded-lg p-6">
              <FaNetworkWired className="text-white text-2xl mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">1500+ Platforms</h3>
              <p className="text-purple-100 text-sm">Crypto exchanges, news sites, social media, and more</p>
            </div>
            <div className="bg-white/10 rounded-lg p-6">
              <FaCrosshairs className="text-white text-2xl mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Precision Targeting</h3>
              <p className="text-purple-100 text-sm">Target by demographics, interests, and behavior</p>
            </div>
            <div className="bg-white/10 rounded-lg p-6">
              <FaChartLine className="text-white text-2xl mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Real-time Analytics</h3>
              <p className="text-purple-100 text-sm">Track performance and optimize campaigns live</p>
            </div>
          </div>
          <button
            onClick={openMintFunnelPlatform}
            className="inline-flex items-center px-8 py-4 bg-white text-purple-600 hover:bg-gray-100 font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <FaRocket className="mr-2" />
            Launch CPC Campaign
            <FaArrowRight className="ml-2" />
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Platform Features
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Comprehensive tools and services designed to maximize your project's success.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-blue-500/20 p-6 rounded-xl mb-4">
              <FaGamepad className="text-blue-400 text-3xl mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Game Hub</h3>
            <p className="text-gray-400 text-sm">Gaming project promotion and community building</p>
          </div>

          <div className="text-center">
            <div className="bg-green-500/20 p-6 rounded-xl mb-4">
              <FaUsers className="text-green-400 text-3xl mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Freelancer Hub</h3>
            <p className="text-gray-400 text-sm">Connect with developers, marketers, and designers</p>
          </div>

          <div className="text-center">
            <div className="bg-purple-500/20 p-6 rounded-xl mb-4">
              <FaCog className="text-purple-400 text-3xl mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">AquaSwap</h3>
            <p className="text-gray-400 text-sm">Cross-chain trading and bridging services</p>
          </div>

          <div className="text-center">
            <div className="bg-yellow-500/20 p-6 rounded-xl mb-4">
              <FaShieldAlt className="text-yellow-400 text-3xl mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Security</h3>
            <p className="text-gray-400 text-sm">Professional moderation and quality control</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Launch Your Project?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of successful projects that have already discovered the Aquads advantage. Start building your community today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <FaRocket className="mr-2" />
              List Your Project Now
              <FaArrowRight className="ml-2" />
            </button>
            <a
              href="mailto:aquads.info@gmail.com"
              className="inline-flex items-center px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-all duration-300"
            >
              Contact Our Team
            </a>
          </div>
        </div>
      </div>

      {/* Create Ad Modal */}
      {showCreateModal && (
        <CreateAdModal
          onCreateAd={handleCreateAd}
          onClose={() => setShowCreateModal(false)}
          currentUser={currentUser}
        />
      )}

      {/* Create Banner Modal */}
      {showBannerModal && (
        <CreateBannerModal
          onClose={() => setShowBannerModal(false)}
          onSubmit={handleBannerSubmit}
          currentUser={currentUser}
        />
      )}

             {/* Bump Store Modal */}
       {showBumpStore && selectedAdForBump && (
         <BumpStore
           ad={selectedAdForBump}
           onClose={() => setShowBumpStore(false)}
           onSubmitPayment={handleBumpPurchase}
           currentUser={currentUser}
         />
       )}
    </div>
  );
};

export default ProjectInfo; 