import React, { useState } from 'react';
import { FaRocket, FaUsers, FaChartLine, FaGlobe, FaShieldAlt, FaCog, FaCheckCircle, FaArrowRight, FaBullhorn, FaGamepad, FaHandshake, FaTrophy, FaArrowLeft, FaCreditCard, FaExchangeAlt, FaUsersCog, FaVideo, FaMicrophone, FaNewspaper, FaStar, FaFire, FaGem, FaCrown, FaGift, FaTwitter, FaLightbulb, FaCrosshairs, FaNetworkWired, FaTelegram } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import CreateAdModal from './CreateAdModal';
import CreateBannerModal from './CreateBannerModal';
import BumpStore from './BumpStore';

// Aquads-branded marketing add-on packages - Powered by Mintfunnel (Coinbound)
// All information sourced directly from https://mintfunnel.co/crypto-press-release-distribution/
const ADDON_PACKAGES = [
  {
    id: 'aqua_splash',
    name: 'AquaSplash',
    partnerName: 'On-Demand Media',
    originalPrice: 99,
    price: 99,
    icon: FaNewspaper,
    color: 'from-green-500 to-emerald-500',
    tier: 'starter',
    idealFor: 'Projects seeking targeted distribution with flexibility in media selection',
    turnaround: 'Same Day Available',
    features: [
      'Pick Your Own Media Outlets',
      'Create Custom Campaigns',
      'Mintfunnel Newsroom Inclusion',
      'Same Day Distribution Available'
    ],
    highlights: [
      { label: 'Flexibility', value: 'Choose Your Outlets' },
      { label: 'Speed', value: 'Same Day' },
      { label: 'Support', value: 'Standard' }
    ],
    platforms: []
  },
  {
    id: 'aqua_ripple',
    name: 'AquaRipple',
    partnerName: 'Basic Package',
    originalPrice: 299,
    price: 284,
    icon: FaStar,
    color: 'from-blue-500 to-cyan-500',
    tier: 'basic',
    idealFor: 'Startups and projects looking for foundational media coverage to establish presence',
    turnaround: '24-48 Hours',
    features: [
      '4+ Media Pickups Guaranteed',
      'Mintfunnel Newsroom & Additional Platforms',
      'Basic Support Services',
      'Professional Distribution Network'
    ],
    highlights: [
      { label: 'Media Pickups', value: '4+ Guaranteed' },
      { label: 'Distribution', value: '24-48 Hours' },
      { label: 'Support', value: 'Basic' }
    ],
    platforms: ['Mintfunnel Newsroom']
  },
  {
    id: 'aqua_wave',
    name: 'AquaWave',
    partnerName: 'Starter Package',
    originalPrice: 1399,
    price: 1329,
    icon: FaRocket,
    color: 'from-green-500 to-teal-500',
    tier: 'growth',
    idealFor: 'Projects aiming for broader coverage with added support and SEO benefits',
    turnaround: '24-72 Hours',
    features: [
      '9+ Media Pickups Guaranteed',
      'Mintfunnel Newsroom & More',
      'Telegram Chat Support',
      'FREE SEO Optimizations'
    ],
    highlights: [
      { label: 'Media Pickups', value: '9+ Guaranteed' },
      { label: 'SEO', value: 'Included Free' },
      { label: 'Support', value: 'Telegram Chat' }
    ],
    platforms: ['Mintfunnel Newsroom', 'Multiple Crypto Outlets'],
    popular: false
  },
  {
    id: 'aqua_flow',
    name: 'AquaFlow',
    partnerName: 'Growth Package',
    originalPrice: 2899,
    price: 2754,
    icon: FaChartLine,
    color: 'from-purple-500 to-indigo-500',
    tier: 'professional',
    idealFor: 'Established projects seeking coverage on well-known crypto news platforms',
    turnaround: '24-72 Hours',
    features: [
      'Coverage from Cryptopolitan',
      'Coverage from BraveNewCoin',
      'Coverage from CoinCodex',
      'Coverage from Bitcolumnist',
      'Mintfunnel Newsroom & More',
      'Telegram Chat Support',
      'FREE SEO Optimizations'
    ],
    highlights: [
      { label: 'Platforms', value: 'Tier-1 Crypto Sites' },
      { label: 'SEO', value: 'Included Free' },
      { label: 'Support', value: 'Telegram Chat' }
    ],
    platforms: ['Cryptopolitan', 'BraveNewCoin', 'CoinCodex', 'Bitcolumnist'],
    popular: true
  },
  {
    id: 'aqua_storm',
    name: 'AquaStorm',
    partnerName: 'Launch Package',
    originalPrice: 6499,
    price: 6174,
    icon: FaFire,
    color: 'from-orange-500 to-red-500',
    tier: 'enterprise',
    idealFor: 'Projects preparing for major announcements or product launches requiring widespread media coverage',
    turnaround: '24-72 Hours',
    features: [
      'Everything from Starter Package, plus:',
      '75+ Media Pickups Guaranteed',
      'Mintfunnel Newsroom Inclusion',
      'Site Audience of 75M+',
      'Telegram Chat Support',
      'FREE SEO Optimizations'
    ],
    highlights: [
      { label: 'Media Pickups', value: '75+ Guaranteed' },
      { label: 'Audience Reach', value: '75M+' },
      { label: 'Support', value: 'Telegram Chat' }
    ],
    platforms: ['75+ Media Outlets', 'Mintfunnel Newsroom'],
    audienceReach: '75M+'
  },
  {
    id: 'aqua_tidal',
    name: 'AquaTidal',
    partnerName: 'Hypergrowth Package',
    originalPrice: 12999,
    price: 12349,
    icon: FaGem,
    color: 'from-indigo-500 to-purple-500',
    tier: 'premium',
    idealFor: 'Projects aiming for maximum exposure and credibility within the crypto community',
    turnaround: '24-72 Hours',
    features: [
      'Everything from Launch Package, plus:',
      '125+ Media Pickups Guaranteed',
      'Video Chat Support',
      'GUARANTEED Coverage: CoinTelegraph',
      'GUARANTEED Coverage: CoinMarketCap',
      'GUARANTEED Coverage: Cryptopolitan'
    ],
    highlights: [
      { label: 'Media Pickups', value: '125+ Guaranteed' },
      { label: 'Top Platforms', value: 'CoinTelegraph & CMC' },
      { label: 'Support', value: 'Video Chat' }
    ],
    platforms: ['CoinTelegraph', 'CoinMarketCap', 'Cryptopolitan'],
    guaranteedPlatforms: ['CoinTelegraph', 'CoinMarketCap', 'Cryptopolitan'],
    audienceReach: '300M+'
  },
  {
    id: 'aqua_legend',
    name: 'AquaLegend',
    partnerName: 'Epic Package',
    originalPrice: 21999,
    price: 20899,
    icon: FaCrown,
    color: 'from-yellow-500 to-amber-500',
    tier: 'legendary',
    idealFor: 'High-profile projects seeking unparalleled media coverage across the most influential crypto news platforms',
    turnaround: '24-72 Hours',
    features: [
      'GUARANTEED Coverage from ALL Top Publications:',
      '• CoinTelegraph',
      '• CoinMarketCap',
      '• Bitcoin.com',
      '• AMB Crypto',
      '• CoinCodex',
      '• Cryptopolitan',
      '• CoinGape',
      '• CryptoNews',
      'Video Chat Support',
      'Mintfunnel Newsroom Inclusion'
    ],
    highlights: [
      { label: 'Coverage', value: 'ALL Top Platforms' },
      { label: 'Publications', value: '8+ Tier-1 Sites' },
      { label: 'Support', value: 'Video Chat' }
    ],
    platforms: ['CoinTelegraph', 'CoinMarketCap', 'Bitcoin.com', 'AMB Crypto', 'CoinCodex', 'Cryptopolitan', 'CoinGape', 'CryptoNews'],
    guaranteedPlatforms: ['CoinTelegraph', 'CoinMarketCap', 'Bitcoin.com', 'AMB Crypto', 'CoinCodex', 'Cryptopolitan', 'CoinGape', 'CryptoNews'],
    audienceReach: '500M+'
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

  // Authentication check functions
  const checkAuthAndOpenModal = (modalType) => {
    if (!currentUser) {
      alert('Please log in to access this feature.');
      return false;
    }
    return true;
  };

  const handleListProjectClick = () => {
    if (checkAuthAndOpenModal('create')) {
      setShowCreateModal(true);
    }
  };

  const handleBannerAdClick = () => {
    if (checkAuthAndOpenModal('banner')) {
      setShowBannerModal(true);
    }
  };

  const handleBumpOptionsClick = () => {
    if (checkAuthAndOpenModal('bump')) {
      handleBumpClick();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          to="/home"
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
                 onClick={handleListProjectClick}
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

          {/* Advantage 13 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-lg">
                <FaMicrophone className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Live Yappers Promote Your Project</h3>
            </div>
            <p className="text-gray-300">
              Get your bumped bubble promoted live on X Spaces, YouTube, Twitch, Kick, and more! Community yappers host and pitch your project to active audiences across all major streaming platforms - free organic exposure that drives real engagement.
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
                <FaTelegram className="text-blue-400 mr-3" />
                <span>
                  Free Custom Telegram Bot
                  <span className="ml-2 bg-green-500 text-white px-2 py-0.5 rounded text-xs">NEW!</span>
                </span>
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Paid ad campaign exposure
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                $50 ad credit to run paid ads
              </li>
              <li className="flex items-center">
                <FaMicrophone className="text-purple-400 mr-3" />
                <span>
                  Live yappers promote your project on streams & spaces
                  <span className="ml-2 bg-purple-500 text-white px-2 py-0.5 rounded text-xs">HOT!</span>
                </span>
              </li>
            </ul>
                         <button
               onClick={handleListProjectClick}
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
              <div className="text-4xl font-bold text-blue-400 mb-2">$150</div>
              <div className="text-gray-400">USDC</div>
            </div>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Lifetime: $150 USDC
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Maximum size bubble on main page
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-400 mr-3" />
                Priority positioning & enhanced visibility
              </li>
              <li className="flex items-center">
                <FaTrophy className="text-yellow-400 mr-3" />
                Vote ranking & trending across ecosystem
              </li>
              <li className="flex items-center">
                <FaTwitter className="text-blue-400 mr-3" />
                Free daily community raids
              </li>
              <li className="flex items-center">
                <FaTelegram className="text-blue-400 mr-3" />
                Free custom Telegram bot
              </li>
              <li className="flex items-center">
                <FaMicrophone className="text-purple-400 mr-3" />
                <span className="font-semibold">Live yappers promote your project on streams!</span>
              </li>
              <li className="flex items-center text-sm text-blue-300">
                <FaStar className="text-yellow-400 mr-3" />
                <span className="italic">All Base Listing perks included when bumped to max size!</span>
              </li>
            </ul>
                         {userHasProjects && (
               <button
                 onClick={handleBumpOptionsClick}
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
               onClick={handleBannerAdClick}
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
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-4 py-2 rounded-full mb-4">
            <span className="text-cyan-400 text-sm font-medium">Powered by Mintfunnel (Coinbound)</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            PR & Marketing Add-on Packages
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-6">
            Amplify your project's reach with guaranteed coverage on the world's leading crypto news platforms.
          </p>
          <div className="mt-4 p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl max-w-2xl mx-auto">
            <p className="text-white font-semibold text-lg">🎉 Exclusive 5% Discount Through Aquads Partnership</p>
            <p className="text-green-100 text-sm mt-1">All packages include same pricing as direct - but with Aquads support!</p>
          </div>
        </div>

        {/* Key Benefits Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700">
            <FaShieldAlt className="text-green-400 text-2xl mx-auto mb-2" />
            <p className="text-white font-semibold text-sm">Guaranteed Coverage</p>
            <p className="text-gray-400 text-xs">No empty promises</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700">
            <FaGlobe className="text-blue-400 text-2xl mx-auto mb-2" />
            <p className="text-white font-semibold text-sm">500M+ Reach</p>
            <p className="text-gray-400 text-xs">Top-tier packages</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700">
            <FaRocket className="text-purple-400 text-2xl mx-auto mb-2" />
            <p className="text-white font-semibold text-sm">Same Day Delivery</p>
            <p className="text-gray-400 text-xs">Fast distribution</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700">
            <FaChartLine className="text-cyan-400 text-2xl mx-auto mb-2" />
            <p className="text-white font-semibold text-sm">SEO Optimized</p>
            <p className="text-gray-400 text-xs">Boost visibility</p>
          </div>
        </div>

        {/* Package Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {ADDON_PACKAGES.map((pkg) => (
            <div 
              key={pkg.id} 
              className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border transition-all duration-300 hover:transform hover:scale-[1.02] flex flex-col ${
                pkg.popular 
                  ? 'border-cyan-500 ring-2 ring-cyan-500/30' 
                  : pkg.tier === 'legendary' 
                    ? 'border-yellow-500/50 ring-2 ring-yellow-500/20' 
                    : 'border-gray-700 hover:border-blue-500'
              }`}
            >
              {/* Popular Badge */}
              {pkg.popular && (
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold py-1 px-3 rounded-t-xl text-center">
                  MOST POPULAR
                </div>
              )}
              {pkg.tier === 'legendary' && (
                <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-xs font-bold py-1 px-3 rounded-t-xl text-center">
                  👑 ULTIMATE COVERAGE
                </div>
              )}

              <div className="p-6 flex-1 flex flex-col">
                {/* Header */}
                <div className="text-center mb-4">
                  <div className={`bg-gradient-to-r ${pkg.color} p-3 rounded-lg mb-3 inline-block`}>
                    <pkg.icon className="text-white text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                  <p className="text-gray-500 text-xs">{pkg.partnerName}</p>
                </div>

                {/* Price */}
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-bold text-white">${pkg.price.toLocaleString()}</span>
                    {pkg.originalPrice !== pkg.price && (
                      <span className="text-gray-500 line-through text-sm">${pkg.originalPrice.toLocaleString()}</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs">USDC • {pkg.turnaround}</p>
                </div>

                {/* Highlights */}
                <div className="grid grid-cols-3 gap-1 mb-4 bg-gray-900/50 rounded-lg p-2">
                  {pkg.highlights.map((highlight, idx) => (
                    <div key={idx} className="text-center">
                      <p className="text-[10px] text-gray-500 uppercase">{highlight.label}</p>
                      <p className="text-xs text-cyan-400 font-semibold">{highlight.value}</p>
                    </div>
                  ))}
                </div>

                {/* Guaranteed Platforms */}
                {pkg.guaranteedPlatforms && pkg.guaranteedPlatforms.length > 0 && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-lg border border-green-500/30">
                    <p className="text-green-400 text-xs font-bold mb-2 flex items-center">
                      <FaCheckCircle className="mr-1" /> GUARANTEED COVERAGE:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {pkg.guaranteedPlatforms.map((platform, idx) => (
                        <span key={idx} className="bg-green-500/20 text-green-300 text-[10px] px-2 py-0.5 rounded-full">
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features */}
                <ul className="space-y-2 text-gray-300 text-sm flex-1">
                  {pkg.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      {feature.startsWith('•') || feature.startsWith('GUARANTEED') ? (
                        <>
                          <FaStar className="text-yellow-400 mr-2 mt-0.5 flex-shrink-0 text-xs" />
                          <span className={feature.startsWith('GUARANTEED') ? 'text-green-400 font-semibold text-xs' : 'text-xs'}>{feature}</span>
                        </>
                      ) : feature.includes('Everything from') ? (
                        <>
                          <FaArrowRight className="text-blue-400 mr-2 mt-0.5 flex-shrink-0 text-xs" />
                          <span className="text-blue-300 text-xs italic">{feature}</span>
                        </>
                      ) : (
                        <>
                          <FaCheckCircle className="text-green-400 mr-2 mt-0.5 flex-shrink-0 text-xs" />
                          <span className="text-xs">{feature}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Ideal For */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-gray-500 text-[10px] uppercase font-semibold mb-1">Ideal For:</p>
                  <p className="text-gray-400 text-xs leading-relaxed">{pkg.idealFor}</p>
                </div>

                {/* CTA Button */}
                <a
                  href="https://mintfunnel.co/crypto-press-release-distribution/?ref=Aquads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-4 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
                    pkg.tier === 'legendary'
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black'
                      : pkg.popular
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  Get Started
                  <FaArrowRight className="ml-2 text-xs" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Info */}
        <div className="mt-12 text-center">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-3">Why Choose Mintfunnel PR Distribution?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <FaLightbulb className="text-yellow-400 text-xl mx-auto mb-2" />
                <p className="text-white font-semibold">5+ Years Experience</p>
                <p className="text-gray-400 text-xs">The first and most popular PR wire built specifically for Web3 & crypto</p>
              </div>
              <div>
                <FaNetworkWired className="text-blue-400 text-xl mx-auto mb-2" />
                <p className="text-white font-semibold">Hundreds of Publishers</p>
                <p className="text-gray-400 text-xs">Established relationships with top crypto news outlets worldwide</p>
              </div>
              <div>
                <FaHandshake className="text-green-400 text-xl mx-auto mb-2" />
                <p className="text-white font-semibold">Aquads Partnership</p>
                <p className="text-gray-400 text-xs">Direct support from our team plus exclusive partner benefits</p>
              </div>
            </div>
            <a
              href="https://mintfunnel.co/crypto-press-release-distribution/?ref=Aquads"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mt-6 text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              View Full Package Details on Mintfunnel
              <FaArrowRight className="ml-2" />
            </a>
          </div>
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
             onClick={() => {
               if (checkAuthAndOpenModal('cpc')) {
                 openMintFunnelPlatform();
               }
             }}
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
               onClick={handleListProjectClick}
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