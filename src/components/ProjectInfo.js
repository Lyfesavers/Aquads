import React, { useState, useEffect } from 'react';
import { requestOwnerBump } from '../services/api';
import { Helmet } from 'react-helmet';
import { FaRocket, FaUsers, FaChartLine, FaGlobe, FaShieldAlt, FaCog, FaCheckCircle, FaArrowRight, FaBullhorn, FaGamepad, FaHandshake, FaTrophy, FaArrowLeft, FaCreditCard, FaExchangeAlt, FaUsersCog, FaVideo, FaMicrophone, FaStar, FaFire, FaGem, FaCrown, FaGift, FaTwitter, FaLightbulb, FaCrosshairs, FaNetworkWired, FaTelegram, FaDiscord, FaRobot } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import CreateAdModal from './CreateAdModal';
import { LISTING_GUIDE_POSTS, blogPath } from '../utils/blogRelatedPosts';
import { PAGE_SEO } from '../utils/pageSeoCore';

const AQUADS_X_HANDLE = '@_Aquads_';
const AQUADS_X_URL = 'https://x.com/_Aquads_';
const AQUADS_TELEGRAM_URL = 'https://t.me/+6rJbDLqdMxA3ZTUx';
const LISTING_TWEET_INTENT = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Listing our project on @_Aquads_ — excited to join the bubble map! 🚀')}`;

// Mintfunnel (Coinbound) PR add-on packages. In-house blog + press release is included with Premium, not sold separately.
const ADDON_PACKAGES = [
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

const ProjectInfo = ({ currentUser, ads = [], onAdPatched }) => {
  const location = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [preSelectedPackage, setPreSelectedPackage] = useState(null);
  const [bumpLoading, setBumpLoading] = useState(false);

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (!hash) return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

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

  const handleCreateAd = async () => {
    // Listing persistence for Starter/AquaPay is handled inside CreateAdModal.
    // Do not unmount here — CreateAdModal shows the post-submit verification screen.
  };

  const handleBumpClick = async () => {
    const userAd = ads.find(
      (ad) =>
        ad.owner === currentUser?.username &&
        ['active', 'approved'].includes(ad.status)
    );
    if (!userAd) {
      alert('List a project first, then grow bullish votes and maintain $10k+ liquidity to bump.');
      return;
    }
    if (bumpLoading) return;

    setBumpLoading(true);
    try {
      const result = await requestOwnerBump(userAd.id);
      if (result.ad && onAdPatched) {
        onAdPatched(result.ad);
      }
      const notify = window.showNotification;
      if (notify) {
        notify(result.message, result.notificationType || (result.success ? 'success' : 'info'));
      } else {
        alert(result.message);
      }
    } catch (error) {
      const message = error.message || 'Failed to check bump eligibility';
      if (window.showNotification) {
        window.showNotification(message, 'error');
      } else {
        alert(message);
      }
    } finally {
      setBumpLoading(false);
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

  const handleBumpOptionsClick = () => {
    if (checkAuthAndOpenModal('bump')) {
      handleBumpClick();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Head metadata is shared with the page-seo edge function so the tags in
          the first HTML response match the ones Helmet writes after mount. The
          JSON-LD below stays client-side. */}
      <Helmet>
        <title>{PAGE_SEO['/list-token-free'].title}</title>
        <meta name="description" content={PAGE_SEO['/list-token-free'].description} />
        <link rel="canonical" href={PAGE_SEO['/list-token-free'].canonical} />
        <meta property="og:type" content={PAGE_SEO['/list-token-free'].ogType} />
        <meta property="og:url" content={PAGE_SEO['/list-token-free'].canonical} />
        <meta property="og:title" content={PAGE_SEO['/list-token-free'].ogTitle} />
        <meta property="og:description" content={PAGE_SEO['/list-token-free'].ogDescription} />
        <meta property="og:image" content={PAGE_SEO['/list-token-free'].ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={PAGE_SEO['/list-token-free'].ogTitle} />
        <meta name="twitter:description" content={PAGE_SEO['/list-token-free'].ogDescription} />
        <meta name="twitter:image" content={PAGE_SEO['/list-token-free'].ogImage} />

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
          ItemList of paid Mintfunnel Marketing & PR add-on packages (AquaRipple → AquaLegend).
          Each tier is a partner-delivered Service with a real Offer so price
          snippets can show in Google without Product review/rating expectations.
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
                "@type": "Service",
                "serviceType": "Crypto press release distribution",
                "name": `${pkg.name} — ${pkg.partnerName}`,
                "description": `${pkg.idealFor}. Turnaround: ${pkg.turnaround}. Includes: ${pkg.features.join(", ")}.`,
                "provider": {
                  "@type": "Organization",
                  "name": "Aquads",
                  "url": "https://www.aquads.xyz"
                },
                "areaServed": "Global",
                "url": "https://www.aquads.xyz/list-token-free",
                "image": "https://www.aquads.xyz/metalogo.png",
                "offers": {
                  "@type": "Offer",
                  "price": String(pkg.originalPrice),
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
              <a
                href="#listing-plans"
                className="inline-flex items-center px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-300 border border-gray-600"
              >
                Starter vs Premium
              </a>
            </div>

          </div>
        </div>
      </div>

      {/* How to List — plan first, then process */}
      <div id="how-to-list" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            How to List Your Token
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Pick Starter or Premium first, then submit, verify, and go live.
          </p>
        </div>

        {/* Step 1: Choose plan — purchase decision before process */}
        <div id="listing-plans" className="scroll-mt-24 mb-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
              1
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white">Choose Starter or Premium</h3>
              <p className="text-gray-400 text-sm sm:text-base">Starter puts you on the map. Premium is the launch stack we announce — $99 USDC.</p>
            </div>
          </div>

          <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80 mb-6">Included with every listing</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <FaExchangeAlt className="text-cyan-300 mb-3" />
                <p className="text-white text-sm font-semibold mb-1">AquaSwap trading</p>
                <p className="text-gray-400 text-xs leading-relaxed">Bubble opens live charts and swaps via AquaSwap + BexTools-style routing.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <FaGlobe className="text-cyan-300 mb-3" />
                <p className="text-white text-sm font-semibold mb-1">Map &amp; votes</p>
                <p className="text-gray-400 text-xs leading-relaxed">Homepage bubble, bullish/bearish rankings, raids, boosts, and Bump Bot access.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <FaRobot className="text-cyan-300 mb-3" />
                <p className="text-white text-sm font-semibold mb-1">Skipper Agent</p>
                <p className="text-gray-400 text-xs leading-relaxed">On verified accounts, pay-as-you-go. Premium adds a $5 AI credit.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <FaTrophy className="text-cyan-300 mb-3" />
                <p className="text-white text-sm font-semibold mb-1">Bubble bump</p>
                <p className="text-gray-400 text-xs leading-relaxed">Same rules on both plans: 100+ bullish votes and $10k+ liquidity for max size and main-row placement.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <div className="relative flex flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-black/20 p-8 min-w-0">
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-3">On the map</p>
                <h3 className="text-2xl font-semibold text-white">Starter</h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-semibold tracking-tight text-white">$0</span>
                  <span className="text-gray-400 text-sm">USDC · base listing</span>
                </div>
                <p className="mt-3 text-sm text-gray-400 leading-relaxed">Live after approval. Aquads does not announce Starter listings.</p>
              </div>
              <ul className="space-y-3 text-sm text-gray-300 flex-1">
                <li className="flex items-start gap-3"><FaCheckCircle className="text-white/50 mt-0.5 shrink-0 text-xs" /><span>Bubble on the map after admin approval</span></li>
                <li className="flex items-start gap-3"><FaCheckCircle className="text-white/50 mt-0.5 shrink-0 text-xs" /><span>Standard review — typically <strong className="text-white">24–48 hours</strong></span></li>
                <li className="flex items-start gap-3"><FaCheckCircle className="text-white/50 mt-0.5 shrink-0 text-xs" /><span>Coordinated raids: <strong className="text-white">1/day</strong> even after bump</span></li>
                <li className="flex items-start gap-3"><FaCheckCircle className="text-amber-300/90 mt-0.5 shrink-0 text-xs" /><span><strong className="text-white">No listing announcement</strong> — no social or email campaign from Aquads</span></li>
                <li className="flex items-start gap-3"><FaCheckCircle className="text-white/50 mt-0.5 shrink-0 text-xs" /><span>Mintfunnel PR at the <strong className="text-white">full partner rate</strong></span></li>
                <li className="flex items-start gap-3"><FaCheckCircle className="text-white/50 mt-0.5 shrink-0 text-xs" /><span>Upgrade to Premium anytime from your dashboard</span></li>
              </ul>
              <button
                onClick={handleListProjectClick}
                className="mt-8 w-full inline-flex items-center justify-center px-6 py-3.5 bg-white/8 hover:bg-white/12 border border-white/15 text-white font-medium rounded-xl transition-colors"
              >
                List as Starter
                <FaArrowRight className="ml-2 text-xs" />
              </button>
            </div>

            <div className="relative flex flex-col rounded-2xl border border-cyan-400/25 bg-gradient-to-b from-cyan-500/[0.12] to-black/30 p-8 min-w-0 shadow-[0_24px_80px_rgba(8,145,178,0.12)]">
              <div className="absolute top-5 right-5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100 bg-cyan-500/20 border border-cyan-400/30 px-2.5 py-1 rounded-full">Launch stack</span>
              </div>
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80 mb-3">We announce you</p>
                <h3 className="text-2xl font-semibold text-white">Premium</h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-semibold tracking-tight text-white">$99</span>
                  <span className="text-gray-400 text-sm">USDC · one-time</span>
                </div>
                <p className="mt-3 text-sm text-gray-300 leading-relaxed">Everything in Starter, plus the campaigns that put your listing in front of our audience.</p>
              </div>
              <ul className="space-y-3 text-sm text-gray-200 flex-1">
                <li className="flex items-start gap-3"><FaCheckCircle className="text-cyan-300 mt-0.5 shrink-0 text-xs" /><span><strong className="text-white">Social &amp; email campaigns</strong> to announce your project, including the newsletter to all users</span></li>
                <li className="flex items-start gap-3"><FaCheckCircle className="text-cyan-300 mt-0.5 shrink-0 text-xs" /><span>In-house blog written for you, published as a press release on Aquads</span></li>
                <li className="flex items-start gap-3"><FaCheckCircle className="text-cyan-300 mt-0.5 shrink-0 text-xs" /><span><strong className="text-white">5% off</strong> Mintfunnel PR campaigns (AquaRipple and up)</span></li>
                <li className="flex items-start gap-3"><FaCheckCircle className="text-cyan-300 mt-0.5 shrink-0 text-xs" /><span><strong className="text-white">1-hour fast-track</strong> listing review after payment</span></li>
                <li className="flex items-start gap-3"><FaCheckCircle className="text-cyan-300 mt-0.5 shrink-0 text-xs" /><span><strong className="text-white">7-day</strong> complimentary homepage banner</span></li>
                <li className="flex items-start gap-3"><FaCheckCircle className="text-cyan-300 mt-0.5 shrink-0 text-xs" /><span>Free AMA, ad campaign exposure, and $50 ad credit</span></li>
                <li className="flex items-start gap-3"><FaCheckCircle className="text-cyan-300 mt-0.5 shrink-0 text-xs" /><span>Raids <strong className="text-white">5/day</strong>, then <strong className="text-white">10/day</strong> once bumped · custom branding when bumped</span></li>
                <li className="flex items-start gap-3"><FaCheckCircle className="text-cyan-300 mt-0.5 shrink-0 text-xs" /><span><strong className="text-white">$5 Skipper</strong> AI wallet credit</span></li>
              </ul>
              <button
                onClick={handleListProjectClick}
                className="mt-8 w-full inline-flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-xl transition-colors shadow-[0_8px_24px_rgba(6,182,212,0.25)]"
              >
                List as Premium
                <FaArrowRight className="ml-2 text-xs" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {/* Step 2 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 sm:p-8 border border-gray-700 hover:border-blue-500/50 transition-all duration-300">
            <div className="flex gap-5 sm:gap-6">
              <div className="shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                  2
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-white mb-2">Submit your listing</h3>
                <p className="text-gray-300 mb-5 leading-relaxed">
                  Fill out the <strong className="text-white">List Project</strong> form, or use <strong className="text-white">Skipper Agent</strong> (~10 seconds) with your contract address, logo URL, and optional website.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleListProjectClick}
                    className="inline-flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm font-semibold rounded-lg transition-all duration-300"
                  >
                    <FaRocket className="mr-2 shrink-0" />
                    Open listing form
                  </button>
                  <Link
                    to="/project-agent"
                    className="inline-flex items-center justify-center px-5 py-2.5 bg-gray-700/80 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg border border-gray-600 transition-all duration-300"
                  >
                    <FaRobot className="mr-2 shrink-0" />
                    List with Skipper
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 sm:p-8 border border-gray-700 hover:border-blue-500/50 transition-all duration-300">
            <div className="flex gap-5 sm:gap-6 mb-6">
              <div className="shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                  3
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-white mb-2">Verify ownership</h3>
                <p className="text-gray-300 leading-relaxed">
                  Choose <strong className="text-white">one</strong> method below so we can match your submission. Telegram verification must come from the <strong className="text-white">owner of your project&apos;s Telegram group</strong> — anyone else joining our chat does not count.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-0 sm:ml-[4.5rem]">
              <div className="rounded-xl border border-gray-600 bg-gray-900/40 p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-sky-500/20 p-2.5 rounded-lg">
                    <FaTwitter className="text-sky-400 text-lg" />
                  </div>
                  <h4 className="text-white font-semibold">Via X</h4>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed flex-1 mb-4">
                  From your project&apos;s official X account, DM <strong className="text-white">{AQUADS_X_HANDLE}</strong>, then tag us in a public post. Include your <strong className="text-white">project name</strong> and <strong className="text-white">contract / pair address</strong>.
                </p>
                <div className="flex flex-col gap-2">
                  <a
                    href={AQUADS_X_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg border border-gray-600 transition-all duration-300"
                  >
                    Message {AQUADS_X_HANDLE}
                  </a>
                  <a
                    href={LISTING_TWEET_INTENT}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 text-gray-300 hover:text-white text-sm transition-colors duration-300"
                  >
                    Draft public post →
                  </a>
                </div>
              </div>
              <div className="rounded-xl border border-gray-600 bg-gray-900/40 p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-sky-500/20 p-2.5 rounded-lg">
                    <FaTelegram className="text-sky-400 text-lg" />
                  </div>
                  <h4 className="text-white font-semibold">Via Telegram</h4>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">
                  The <strong className="text-white">owner</strong> of your project&apos;s Telegram group must join Aquads Telegram and post that your listing was just submitted. A random member joining our group is <strong className="text-white">not</strong> verification.
                </p>
                <p className="text-gray-400 text-xs leading-relaxed mb-4 rounded-lg border border-gray-600/80 bg-gray-800/60 px-3 py-2">
                  Example message:{' '}
                  <span className="text-sky-300 font-medium">Application for [TOKEN] just submitted — check it</span>
                </p>
                <a
                  href={AQUADS_TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg border border-gray-600 transition-all duration-300 mt-auto"
                >
                  Join Aquads Telegram
                </a>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 sm:p-8 border border-green-500/40 hover:border-green-500/60 transition-all duration-300">
            <div className="flex gap-5 sm:gap-6">
              <div className="shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                  4
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 mb-2">
                  <FaCheckCircle className="text-green-400 text-xl shrink-0 mt-0.5" />
                  <h3 className="text-xl font-semibold text-white">We review &amp; go live</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  After ownership is verified, we review your listing. <strong className="text-white">Starter:</strong> typically 24–48 hours.{' '}
                  <strong className="text-white">Premium:</strong> ~1 hour fast-track after payment. Your bubble appears on the map once approved.
                </p>
                <p className="text-gray-400 text-sm border-t border-gray-700 pt-4">
                  Requirements: pair live 12+ hours, valid logo URL, and ownership proof via X or Telegram (Telegram: group owner joins Aquads TG and posts the application message).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shared bump + optional banners — after the listing decision */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12">
        <div className="mb-6 rounded-2xl border border-white/10 bg-black/25 overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-stretch">
            <div className="lg:w-[280px] shrink-0 px-6 py-6 lg:py-8 border-b lg:border-b-0 lg:border-r border-white/10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/80 mb-2">Shared mechanic</p>
              <h3 className="text-xl font-semibold text-white mb-1">Bubble bump</h3>
              <p className="text-2xl font-semibold text-white tracking-tight">100 votes + $10k</p>
              <p className="text-gray-400 text-sm mt-1">Free on Starter and Premium when both are met.</p>
              {userHasProjects && (
                <button
                  onClick={handleBumpOptionsClick}
                  disabled={bumpLoading}
                  className="mt-5 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 disabled:opacity-60 disabled:cursor-wait transition-colors"
                >
                  {bumpLoading ? 'Checking…' : 'Check bump status'}
                  <FaArrowRight className="ml-2 text-xs" />
                </button>
              )}
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 px-6 py-6 lg:py-8 text-sm text-gray-300">
              <p className="flex items-start gap-2.5"><FaCheckCircle className="text-cyan-400 mt-0.5 shrink-0 text-xs" /><span>Organic votes and paid vote boosts both count</span></p>
              <p className="flex items-start gap-2.5"><FaCheckCircle className="text-cyan-400 mt-0.5 shrink-0 text-xs" /><span>Liquidity is re-checked every 2 days — restore the pool and tap Bump to re-qualify</span></p>
              <p className="flex items-start gap-2.5"><FaCheckCircle className="text-cyan-400 mt-0.5 shrink-0 text-xs" /><span>Below 100 votes or $10k liquidity, size shrinks over time</span></p>
              <p className="flex items-start gap-2.5"><FaCheckCircle className="text-cyan-400 mt-0.5 shrink-0 text-xs" /><span>Premium raid caps rise once bumped; Starter stays at 1/day</span></p>
              <p className="flex items-start gap-2.5 sm:col-span-2"><FaStar className="text-amber-300 mt-0.5 shrink-0 text-xs" /><span>Bump does not upgrade listing tier. Custom <strong className="text-white">/setbranding</strong> is Premium-only when bumped; Starter keeps default Aquads styling.</span></p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-transparent px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-1">Optional extra</p>
            <h3 className="text-lg font-semibold text-white">Homepage banner ads</h3>
            <p className="text-sm text-gray-400 mt-1">Rotating high-visibility placement. Premium listings include one complimentary 7-day spot; additional inventory is paid.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-gray-200">24h · $10</span>
            <span className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-gray-200">3 days · $20</span>
            <span className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-gray-200">7 days · $40</span>
            <Link
              to="/advertise"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
            >
              Advertise
              <FaArrowRight className="ml-2 text-xs" />
            </Link>
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
              Included with <strong className="text-white">Premium</strong> listings (in-house blog &amp; press release on Aquads). <strong className="text-white">Starter</strong> listings can add Mintfunnel distribution packages below, or upgrade to Premium from the dashboard.
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
              Organized Twitter/Facebook raids and Telegram/Discord coordination—daily quotas depend on your listing tier. Starter stays at 1 raid/day; Premium scales to 5/day, then 10/day once bumped.
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
        </div>
      </div>

      {/* Marketing Add-on Packages Section */}
      <div id="pr-campaigns" className="max-w-7xl mx-auto scroll-mt-24 px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-4 py-2 rounded-full mb-4">
            <span className="text-cyan-400 text-sm font-medium">Powered by Mintfunnel (Coinbound)</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            PR & Marketing Add-on Packages
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-6">
            Amplify reach after you pick a listing plan. These Mintfunnel campaigns stack <strong className="text-white">on top of</strong> Starter or Premium — priced separately from the base listing fee.
          </p>
          <div className="mt-4 p-4 bg-gray-800/80 border border-cyan-500/30 rounded-xl max-w-2xl mx-auto">
            <p className="text-white font-semibold text-lg">Prices below are the full partner rate</p>
            <p className="text-gray-300 text-sm mt-1">
              <strong className="text-white">Paid Premium listings</strong> get 5% off these PR campaigns at checkout.
              The separate <strong className="text-white">affiliate 5%</strong> applies only to the $99 Premium listing fee — not to these packages.
            </p>
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

                {/* Price — list/Starter rate. Premium 5% is applied at checkout only. */}
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-bold text-white">${pkg.originalPrice.toLocaleString()}</span>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">USDC • {pkg.turnaround}</p>
                  <p className="text-cyan-300/80 text-[11px] mt-1">Premium listings save 5% at checkout</p>
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

      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8"
        aria-label="Listing guides from the Aquads blog"
      >
        <div className="max-w-3xl mx-auto text-left">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 backdrop-blur-sm p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-emerald-300 mb-1">
              New to listing?
            </h2>
            <p className="text-gray-300 text-sm mb-4">
              Step-by-step guides from the Aquads blog — free listing, post-launch growth, and DexScreener trending.
            </p>
            <ul className="space-y-2.5">
              {LISTING_GUIDE_POSTS.map((guide) => (
                <li key={guide._id}>
                  <Link
                    to={blogPath(guide)}
                    className="text-sm sm:text-base text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline transition-colors leading-snug"
                  >
                    {guide.title}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-500">
              More articles on{' '}
              <Link to="/learn" className="text-emerald-500/80 hover:text-emerald-400 underline">
                Aquads Learn
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Grow Your Project?
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

    </div>
  );
};

export default ProjectInfo; 