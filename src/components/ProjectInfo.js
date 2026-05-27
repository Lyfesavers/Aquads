import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { FaRocket, FaUsers, FaChartLine, FaGlobe, FaShieldAlt, FaCog, FaCheckCircle, FaArrowRight, FaBullhorn, FaGamepad, FaHandshake, FaTrophy, FaArrowLeft, FaCreditCard, FaExchangeAlt, FaUsersCog, FaVideo, FaMicrophone, FaNewspaper, FaStar, FaFire, FaGem, FaCrown, FaGift, FaTwitter, FaLightbulb, FaCrosshairs, FaNetworkWired, FaTelegram, FaDiscord } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import CreateAdModal from './CreateAdModal';
import CreateBannerModal from './CreateBannerModal';

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
  const [preSelectedPackage, setPreSelectedPackage] = useState(null);

  // Check if user has any projects listed
  const userHasProjects = ads.some(ad => ad.owner === currentUser?.username);
  const ownerAdsForTier = currentUser ? ads.filter(ad => ad.owner === currentUser.username) : [];
  const hasOnlyStarterListings =
    Boolean(currentUser) && ownerAdsForTier.length > 0 && ownerAdsForTier.every(ad => ad.listingTier === 'starter');

  // Handle package selection from marketing packages section
  const handlePackageSelect = (packageId) => {
    if (!currentUser) {
      alert('Please log in to purchase marketing packages.');
      return;
    }
    setPreSelectedPackage(packageId);
    setShowCreateModal(true);
  };

  // Open MintFunnel platform in full-screen popup
  const openMintFunnelPlatform = () => {
    const popup = window.open(
      'https://app.mintfunnel.co?ref=KA3IIME5',
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

  const handleBumpClick = () => {
    const userAd = ads.find(ad => ad.owner === currentUser?.username);
    const bullish = userAd ? (userAd.bullishVotes || 0) : 0;
    const need = Math.max(0, 100 - bullish);
    if (!userAd) {
      alert('List a project first, then grow bullish votes to bump.');
      return;
    }
    alert(
      need === 0
        ? 'Your bubble already has 100+ bullish votes and is bumped.'
        : `Bumps are free: reach 100 bullish votes (${bullish} now, ${need} to go). Organic votes and vote boosts both count.`
    );
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
      <Helmet>
        <title>List your token free on Aquads — no-fee bubble map listings</title>
        <meta
          name="description"
          content="How to list your token or crypto project free on Aquads: Starter has no listing fee, live bubble map, community votes, bumps, AquaSwap routing, and raids. Skipper Agent on all verified accounts (pay-as-you-go). Paid Premium adds 1-hour fast-track review, a $5 Skipper AI credit, plus the full launch stack."
        />
        <link rel="canonical" href="https://www.aquads.xyz/list-token-free" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.aquads.xyz/list-token-free" />
        <meta property="og:title" content="List your token free on Aquads — bubble map listings" />
        <meta
          property="og:description"
          content="No-fee Starter listing on the interactive bubble map: votes, bumps, AquaSwap, and growth tools. Optional paid PR packages."
        />
        <meta property="og:image" content="https://www.aquads.xyz/logo712.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="List your token free on Aquads — bubble map listings" />
        <meta
          name="twitter:description"
          content="No-fee Starter listing on the interactive bubble map: votes, bumps, AquaSwap, and growth tools. Optional paid PR packages."
        />
        <meta name="twitter:image" content="https://www.aquads.xyz/logo712.png" />

        {/*
          Service schema for the free Starter listing — anchors this page as
          "Aquads token listing" so AI engines / Google connect "free crypto
          listing" queries to it. Pricing is $0 with brand context.
        */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "serviceType": "Crypto project listing",
            "name": "Aquads Starter Listing",
            "description":
              "Free token listing on the Aquads interactive bubble map. Includes community bullish/bearish votes, automatic bump at 100 votes, AquaSwap cross-chain routing, raid participation, and Skipper AI agent on verified accounts.",
            "provider": {
              "@type": "Organization",
              "name": "Aquads",
              "url": "https://www.aquads.xyz"
            },
            "areaServed": "Global",
            "url": "https://www.aquads.xyz/list-token-free",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
              "availability": "https://schema.org/InStock",
              "url": "https://www.aquads.xyz/list-token-free",
              "description": "No listing fee. Free for all crypto projects."
            }
          })}
        </script>

        {/*
          ItemList of paid Marketing & PR add-on packages (AquaSplash → AquaStorm).
          Each tier is a Product with a real Offer so price snippets can show in
          Google and AI engines can quote pricing for "Aquads PR cost" queries.
        */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Aquads Marketing & PR Add-on Packages",
            "description":
              "Press release distribution and marketing add-ons available to Aquads listings, powered by Mintfunnel.",
            "itemListOrder": "https://schema.org/ItemListOrderAscending",
            "numberOfItems": ADDON_PACKAGES.length,
            "itemListElement": ADDON_PACKAGES.map((pkg, i) => ({
              "@type": "ListItem",
              "position": i + 1,
              "item": {
                "@type": "Product",
                "name": `${pkg.name} — ${pkg.partnerName}`,
                "category": "Crypto press release distribution",
                "description": `${pkg.idealFor}. Turnaround: ${pkg.turnaround}. Includes: ${pkg.features.join(", ")}.`,
                "brand": {
                  "@type": "Brand",
                  "name": "Aquads"
                },
                "offers": {
                  "@type": "Offer",
                  "price": String(pkg.price),
                  "priceCurrency": "USD",
                  "availability": "https://schema.org/InStock",
                  "url": "https://www.aquads.xyz/list-token-free",
                  "seller": {
                    "@type": "Organization",
                    "name": "Aquads"
                  }
                }
              }
            }))
          })}
        </script>

        {/*
          Breadcrumb hint — gives Google the Home → List Token Free trail so the
          SERP card can show the breadcrumb path instead of a raw URL.
        */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.aquads.xyz/" },
              { "@type": "ListItem", "position": 2, "name": "List token free", "item": "https://www.aquads.xyz/list-token-free" }
            ]
          })}
        </script>
      </Helmet>
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
              List your token free on
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400"> Aquads</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Starter bubble map listings have no listing fee—get discovered, earn votes, bump with community support, and route trades through AquaSwap. Optional Premium and PR add-ons when you are ready to scale.
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
                to="/docs#wp-executive-summary"
                className="inline-flex items-center px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-300 border border-gray-600"
              >
                Read Our Documentation
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
              <h3 className="text-xl font-semibold text-white ml-4">Immediate Trading Integration on our BexTools</h3>
            </div>
            <p className="text-gray-300">
              Users click your bubble and instantly trade your token with live charts. Direct integration with AquaSwap and BexTools eliminates barriers and drives immediate conversions.</p>
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
              Included with <strong className="text-white">Premium</strong> listings (press release & tier‑1 distribution access). <strong className="text-white">Starter</strong> listings can add professional PR anytime via the Mintfunnel add‑on packages below.
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
              Organized Twitter/Facebook raids and Telegram/Discord coordination—daily quotas depend on your listing tier (Starter vs Premium). Bumping unlocks higher caps for Starter listings.
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
              Free AMA sessions are included with <strong className="text-white">Premium</strong> listings. Starter listings can upgrade to Premium from the dashboard anytime.
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

          {/* Advantage 14 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-amber-500/60 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-r from-amber-500 to-violet-500 p-3 rounded-lg">
                <FaFire className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">BNB & Solana Trending + Volume</h3>
            </div>
            <p className="text-gray-300">
              <strong className="text-white">Premium</strong> listings include real trending and volume exposure for BNB Chain or Solana tokens—right where degens look for momentum—alongside our Telegram bot’s trending boost and HyperSpace, votes, raids, live streams, yappers, and AquaSwap & BexTools.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Listing packages & extras
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Pick <strong className="text-green-300">Starter</strong> for a free bubble listing or <strong className="text-blue-300">Premium</strong> for the full launch stack ($99 USDC). Optional Mintfunnel PR packages are separate—add them when you list or anytime from your dashboard.
          </p>
          <div className="mt-8 max-w-4xl mx-auto rounded-xl border border-cyan-500/35 bg-gray-900/60 px-6 py-5 text-left">
            <p className="text-cyan-200/95 text-sm font-semibold uppercase tracking-wide mb-2">Included with every listing (Starter or Premium)</p>
            <ul className="text-gray-300 text-sm space-y-2 list-disc list-inside">
              <li>
                <strong className="text-white">Trading flow:</strong> your bubble opens <strong className="text-white">AquaSwap</strong> + <strong className="text-white">BexTools</strong>-style routing so degens tap through to live charts and swaps—not just a static banner.
              </li>
              <li>
                <strong className="text-white">Discovery &amp; momentum:</strong> vote rankings, homepage bubble map exposure, Telegram Bump Bot syncing, raids and boosts.
              </li>
              <li>
                <strong className="text-white">Skipper Agent:</strong> available on all <strong className="text-white">verified</strong> Aquads accounts — pay-as-you-go AI wallet (top up via AquaPay). <strong className="text-white">Paid Premium</strong> adds a <strong className="text-white">$5</strong> starter AI credit; vote bump alone does not upgrade listing tier.
              </li>
            </ul>
            <p className="text-gray-400 text-xs mt-3">
              <strong className="text-white">Paid Premium</strong> also includes the bundled <strong className="text-white">BNB/Sol trending + volume</strong> sprint, PR tier‑1 rails, AMA, ad credits, <strong className="text-white">1-hour fast-track listing review</strong>, higher pre-bump raid cap, longer homepage banner, and custom ping branding when bumped.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {/* Starter listing */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-green-500/50 ring-1 ring-green-500/20 min-w-0">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Starter listing</h3>
              <div className="text-4xl font-bold text-green-400 mb-2">$0</div>
              <div className="text-gray-400">Base listing fee · USDC</div>
            </div>
            <ul className="space-y-3 text-gray-300 text-sm">
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">Bubble on the map after admin approval</span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">AquaSwap + BexTools path from your bubble (live chart &amp; swap handoff—same funnel Premium uses for trading clicks)</span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">Bullish/bearish voting & rankings</span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">
                  <strong className="text-white">1 complimentary 24-hour</strong> homepage banner ad spot after approval (rotating placement—coordinate in your dashboard)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">
                  Bump free at <strong className="text-white">100+</strong> bullish votes (organic + boosts)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">
                  Coordinated raids: <strong className="text-white">1/day</strong> until bumped, then <strong className="text-white">up to 20/day</strong>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">
                  Telegram &amp; Discord Bump Bot — raids, voting, boosts &amp; bumps; <strong className="text-white">custom branding</strong> on notifications is <strong className="text-white">paid Premium only</strong> once bumped
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-cyan-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">
                  <strong className="text-white">Skipper Agent</strong> — verified accounts; pay-as-you-go AI wallet (top up via AquaPay)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">
                  Standard admin review — typically <strong className="text-white">24–48 hours</strong> after submission
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">Optional Mintfunnel packages paid separately at checkout</span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">Upgrade to paid Premium anytime from your dashboard</span>
              </li>
            </ul>
            <button
              onClick={handleListProjectClick}
              className="mt-6 w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
            >
              <FaRocket className="mr-2" />
              List as Starter
              <FaArrowRight className="ml-2" />
            </button>
          </div>

          {/* Premium listing */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-blue-500/60 ring-1 ring-blue-500/25 min-w-0">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Premium listing</h3>
              <div className="text-4xl font-bold text-blue-400 mb-2">$99</div>
              <div className="text-gray-400">Full launch stack · USDC</div>
            </div>
            <ul className="space-y-3 text-gray-300 text-sm">
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">Everything in Starter, plus:</span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">
                  <strong className="text-white">1-hour fast-track listing review</strong> — Premium submissions are prioritized (Starter: standard 24–48 hour review)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">
                  <strong className="text-white">1 complimentary 7-day</strong> homepage banner ad spot after approval (vs <strong className="text-white">24 hours</strong> on Starter)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">PR press release & premium distribution access</span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">Free AMA, ad campaign exposure, $50 ad credit</span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">
                  Included <strong className="text-white">BNB / Sol trending + volume</strong> program—scheduled exposure that stacks with AquaSwap/Bex/bot boosts (not organic-only)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">
                  <strong className="text-white">Custom bot branding</strong> when bumped — Premium listing required (same bot features as Starter, plus your logo/video on notifications)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">
                  Raids: <strong className="text-white">up to 5/day</strong> before bump, <strong className="text-white">up to 20/day</strong> once bumped
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-cyan-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">
                  <strong className="text-white">$5 Skipper AI wallet credit</strong> — one-time prepaid balance on paid Premium (Skipper access itself is on all verified accounts)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">
                  Referred users get <strong className="text-white">5% off</strong> the Premium base fee
                </span>
              </li>
            </ul>
            <button
              onClick={handleListProjectClick}
              className="mt-6 w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
            >
              <FaRocket className="mr-2" />
              List as Premium
              <FaArrowRight className="ml-2" />
            </button>
          </div>

          {/* Bump */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-blue-500 min-w-0">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Bubble bump</h3>
              <div className="text-4xl font-bold text-green-400 mb-2">100 votes</div>
              <div className="text-gray-400">Bullish threshold (free)</div>
            </div>
            <ul className="space-y-3 text-gray-300 text-sm">
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">
                  <strong className="text-white">100+</strong> bullish votes = bumped bubble (max size, main row)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">Organic votes and paid vote boosts both count</span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">Below 100 = unbumped (size shrinks over time)</span>
              </li>
              <li className="flex items-start gap-3">
                <FaTrophy className="text-yellow-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">Higher raid caps once bumped (see Starter vs Premium cards)</span>
              </li>
              <li className="flex items-start gap-3">
                <FaStar className="text-amber-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">Bump improves visibility &amp; raid caps — it does <strong className="text-white">not</strong> upgrade you to paid Premium features</span>
              </li>
              <li className="flex items-start gap-3">
                <FaStar className="text-amber-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed"><strong className="text-white">/setbranding</strong> (custom logo/video pings): paid Premium only when bumped; Starter bubbles use default Aquads styling</span>
              </li>
              <li className="flex items-start gap-3">
                <FaMicrophone className="text-purple-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">Live yappers &amp; visibility scale with engagement</span>
              </li>
            </ul>
            {userHasProjects && (
              <button
                onClick={handleBumpOptionsClick}
                className="mt-6 w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
              >
                <FaRocket className="mr-2" />
                How bumping works
                <FaArrowRight className="ml-2" />
              </button>
            )}
          </div>

          {/* Banner Ads */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700 min-w-0">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Banner Ads</h3>
              <div className="text-4xl font-bold text-blue-400 mb-2">$40-160</div>
              <div className="text-gray-400">USDC</div>
            </div>
            <ul className="space-y-3 text-gray-300 text-sm">
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">24 Hours: $40 USDC</span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">3 Days: $80 USDC</span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">7 Days: $160 USDC</span>
              </li>
              <li className="flex items-start gap-3">
                <FaCheckCircle className="text-green-400 mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-relaxed">Premium placement & high visibility</span>
              </li>
            </ul>
            <button
              onClick={handleBannerAdClick}
              className="mt-6 w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
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
            Amplify your project's reach with guaranteed coverage on leading crypto news platforms. Stack these <strong className="text-white">on top of</strong> your Starter or Premium listing—priced separately from the base bubble listing fee.
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
                <button
                  onClick={() => handlePackageSelect(pkg.id)}
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
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Info */}
        <div className="mt-12 text-center">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-3">Why Choose Our PR Distribution Service?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <FaLightbulb className="text-yellow-400 text-xl mx-auto mb-2" />
                <p className="text-white font-semibold">5+ Years Experience</p>
                <p className="text-gray-400 text-xs">Powered by Mintfunnel - the first and most popular PR wire built for Web3 & crypto</p>
              </div>
              <div>
                <FaNetworkWired className="text-blue-400 text-xl mx-auto mb-2" />
                <p className="text-white font-semibold">Hundreds of Publishers</p>
                <p className="text-gray-400 text-xs">Established relationships with top crypto news outlets worldwide</p>
              </div>
              <div>
                <FaHandshake className="text-green-400 text-xl mx-auto mb-2" />
                <p className="text-white font-semibold">We Handle Everything</p>
                <p className="text-gray-400 text-xs">Pay through Aquads - we manage your campaign setup and delivery with our partners</p>
              </div>
            </div>
            <button
              onClick={handleListProjectClick}
              className="inline-flex items-center mt-6 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all duration-300"
            >
              <FaRocket className="mr-2" />
              List Your Project & Select Packages
              <FaArrowRight className="ml-2" />
            </button>
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
                     {hasOnlyStarterListings ? (
           <p className="text-purple-100 text-sm mb-4 max-w-xl mx-auto">
             $50 ad-network credit and the CPC launch button are included with <strong className="text-white">Premium</strong> listings. Upgrade from your dashboard or choose Premium when listing.
           </p>
         ) : null}
                     {!hasOnlyStarterListings ? (
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
                     ) : null}
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
              href="mailto:info@aquads.xyz"
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
          onClose={() => {
            setShowCreateModal(false);
            setPreSelectedPackage(null);
          }}
          currentUser={currentUser}
          preSelectedPackage={preSelectedPackage}
          userAds={ads}
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

    </div>
  );
};

export default ProjectInfo; 