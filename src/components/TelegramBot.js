import React, { useState } from 'react';
import { FaArrowLeft, FaTelegram, FaRocket, FaUsers, FaChartLine, FaTwitter, FaFacebook, FaPalette, FaTrophy, FaBolt, FaShieldAlt, FaCheckCircle, FaCoins, FaBullhorn, FaLink, FaGlobe, FaStar, FaCrown, FaGem, FaFire, FaEye, FaNetworkWired, FaHandshake, FaBell, FaLock, FaUnlock, FaCheck, FaTimes, FaThumbsUp, FaThumbsDown, FaUserPlus, FaImage, FaListAlt, FaComments, FaRetweet, FaHeart } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const TelegramBot = () => {
  const [activeTab, setActiveTab] = useState('features');

  // Real features from the actual bot
  const features = [
    {
      icon: FaTwitter,
      title: 'Twitter Raids',
      description: 'Boost your meme coin visibility! Create raids for your tweets — get 5 FREE raid posts daily, then use 2000 points for more. Community earns 20 points per completion.',
      command: '/raids • /createraid URL',
      color: 'from-sky-500 to-blue-600',
      details: ['5 FREE raids per day', '2000 pts after free raids', 'Auto-expires in 48hrs']
    },
    {
      icon: FaFacebook,
      title: 'Facebook Raids',
      description: 'Engage with Facebook content through coordinated raids. Like, share, and comment on posts to earn points and grow your community.',
      command: '/facebook username',
      color: 'from-blue-600 to-indigo-700',
      details: ['Like, Share & Comment', 'Cross-platform campaigns', 'Verified completions']
    },
    {
      icon: FaChartLine,
      title: 'Bubble Ranking & Trending',
      description: 'View top 10 bubbles ranked by bullish votes. Bumped projects trend across Aquads homepage, BEX trending section, and bubble leaderboards.',
      command: '/bubbles • /mybubble',
      color: 'from-emerald-500 to-green-600',
      details: ['Aquads platform trending', 'BEX trending section', 'Bubble leaderboard']
    },
    {
      icon: FaThumbsUp,
      title: 'Voting System',
      description: 'Vote Bullish or Bearish on any project. Earn 20 points for your first vote on each project. Help projects climb the rankings!',
      command: 'Click 👍 or 👎 buttons',
      color: 'from-purple-500 to-violet-600',
      details: ['20 points per first vote', 'Bullish/Bearish options', 'Affects rankings']
    },
    {
      icon: FaPalette,
      title: 'Custom Branding',
      description: 'Upload your own branding image for vote notifications sent to our 5K+ trending channel. Your logo seen by thousands of active traders.',
      command: '/setbranding • /removebranding',
      color: 'from-pink-500 to-rose-600',
      details: ['5K+ trending channel reach', 'Max 500KB (JPG/PNG)', 'Exclusive for bumped projects'],
      premium: true
    },
    {
      icon: FaCoins,
      title: 'Points System',
      description: 'Earn points by completing raids and voting. Use your accumulated points to create additional raids beyond your 5 free daily posts (2000 pts each).',
      command: 'Check in /help menu',
      color: 'from-amber-500 to-orange-600',
      details: ['20 pts per raid completion', '20 pts per first vote', 'Spend 2000 pts for extra raids']
    },
    {
      icon: FaNetworkWired,
      title: 'Community Raids',
      description: 'Opt your group into the community raid network. When opted-in, raids are shared across all participating groups for maximum reach.',
      command: '/raidin • /raidout',
      color: 'from-violet-500 to-purple-600',
      details: ['Cross-group sharing', 'Opt-in/out anytime', 'Expand your reach']
    },
    {
      icon: FaRocket,
      title: 'Vote & Member Boost',
      description: 'Skyrocket your meme coin\'s ranking! Get guaranteed bullish votes PLUS real Telegram group members delivered to your community.',
      command: '/boostvote',
      color: 'from-rose-500 to-red-600',
      details: ['Votes + TG Members combo', '100-1000 packages', 'Up to 25% discounts'],
      premium: true
    }
  ];

  // Free vs Premium comparison
  const accessTiers = {
    free: {
      title: 'Free Access',
      icon: FaLock,
      color: 'from-gray-600 to-gray-700',
      features: [
        { name: 'Account Linking', included: true },
        { name: 'Complete Raids & Earn Points', included: true },
        { name: 'Vote on Projects (Earn 20 pts)', included: true },
        { name: 'View Top 10 Bubble Rankings', included: true },
        { name: '5 FREE Raid Posts Daily', included: true },
        { name: 'Create Extra Raids (2000 pts each)', included: true },
        { name: 'Trending Across Aquads Platform', included: false },
        { name: 'BEX Trending Section', included: false },
        { name: 'Bubble Ranking Visibility', included: false },
        { name: '5K+ Trending Channel Exposure', included: false },
        { name: 'Custom Branding on Notifications', included: false },
        { name: 'Vote + Member Boost Packages', included: false }
      ]
    },
    premium: {
      title: 'Full Access',
      subtitle: 'List & Bump Your Meme Coin',
      icon: FaUnlock,
      color: 'from-cyan-500 to-blue-600',
      features: [
        { name: 'Account Linking', included: true },
        { name: 'Complete Raids & Earn Points', included: true },
        { name: 'Vote on Projects (Earn 20 pts)', included: true },
        { name: 'View Top 10 Bubble Rankings', included: true },
        { name: '5 FREE Raid Posts Daily', included: true },
        { name: 'Create Extra Raids (2000 pts each)', included: true },
        { name: 'Trending Across Aquads Platform', included: true, highlight: true },
        { name: 'BEX Trending Section', included: true, highlight: true },
        { name: 'Bubble Ranking Visibility', included: true, highlight: true },
        { name: '5K+ Trending Channel Exposure', included: true, highlight: true },
        { name: 'Custom Branding on Notifications', included: true, highlight: true },
        { name: 'Vote + Member Boost Packages', included: true, highlight: true }
      ]
    }
  };

  // Real commands from the bot
  const commands = [
    { cmd: '/start', desc: 'Begin onboarding and link your account', category: 'Account' },
    { cmd: '/link username', desc: 'Connect your Telegram to Aquads account', category: 'Account' },
    { cmd: '/twitter handle', desc: 'Set your Twitter username for raids', category: 'Account' },
    { cmd: '/facebook handle', desc: 'Set your Facebook username for raids', category: 'Account' },
    { cmd: '/help', desc: 'View interactive menu with all features', category: 'General' },
    { cmd: '/cancel', desc: 'Cancel any ongoing operation', category: 'General' },
    { cmd: '/raids', desc: 'View all available Twitter & Facebook raids', category: 'Raids' },
    { cmd: '/createraid URL', desc: 'Create a Twitter raid (5 FREE daily, then 2000 pts each)', category: 'Raids' },
    { cmd: '/cancelraid URL', desc: 'Cancel a raid you created', category: 'Raids' },
    { cmd: '/bubbles', desc: 'View top 10 bubbles by bullish votes', category: 'Bubbles' },
    { cmd: '/mybubble', desc: 'View YOUR projects with voting buttons', category: 'Bubbles' },
    { cmd: '/boostvote', desc: 'Purchase vote boost packages for your bubble', category: 'Bubbles' },
    { cmd: '/setbranding', desc: 'Upload custom branding image (bumped projects only)', category: 'Branding' },
    { cmd: '/removebranding', desc: 'Remove custom branding', category: 'Branding' },
    { cmd: '/raidin', desc: 'Opt-in your group to community raid sharing', category: 'Groups' },
    { cmd: '/raidout', desc: 'Opt-out your group from community raids', category: 'Groups' }
  ];

  // Vote + Member boost packages (real data)
  const boostPackages = [
    { name: 'Starter', votes: 100, price: 20, discount: null, desc: 'Votes + Members' },
    { name: 'Basic', votes: 250, price: 40, discount: '20% OFF', desc: 'Votes + Members' },
    { name: 'Growth', votes: 500, price: 80, discount: '20% OFF', desc: 'Votes + Members' },
    { name: 'Pro', votes: 1000, price: 150, discount: '25% OFF', desc: 'Votes + Members' }
  ];

  const benefits = [
    {
      icon: FaBolt,
      title: '5 Free Raids Daily',
      description: 'Launch 5 FREE raid posts every day to pump your meme coin. After that, use 2000 points for unlimited additional raids.',
      highlight: 'FREE daily raids'
    },
    {
      icon: FaUsers,
      title: 'Votes + Real Members',
      description: 'Our boost packages deliver both bullish votes AND real Telegram members to your group. Grow your holder community.',
      highlight: 'Double the value'
    },
    {
      icon: FaTrophy,
      title: 'Trending Everywhere',
      description: 'Get featured in bubble rankings, BEX trending, Aquads platform, AND our 5,000+ member trending channel. Maximum visibility.',
      highlight: 'Multi-platform + 5K channel'
    },
    {
      icon: FaShieldAlt,
      title: 'Real Engagement',
      description: 'All raid completions are admin-verified. No bots, no fake engagement — only real crypto degens.',
      highlight: 'Quality assurance'
    },
    {
      icon: FaImage,
      title: '5K+ Trending Channel',
      description: 'Your custom branding and vote notifications appear in our trending channel with 5,000+ active crypto degens watching.',
      highlight: '5,000+ eyes on your coin'
    },
    {
      icon: FaGlobe,
      title: 'Twitter & Facebook',
      description: 'Coordinate shill campaigns across both platforms. Like, RT, comment raids that actually move the needle.',
      highlight: 'Multi-platform'
    },
    {
      icon: FaComments,
      title: 'Direct to Your Group',
      description: 'Add the bot to your TG group. Raid notifications land directly where your community lives.',
      highlight: 'Instant delivery'
    },
    {
      icon: FaHandshake,
      title: 'Cross-Community Raids',
      description: 'Opt-in to share raids with other meme coin communities. Expand reach beyond your own holders.',
      highlight: 'Network effect'
    },
    {
      icon: FaCoins,
      title: '$100 Per 10K Points',
      description: 'We pay your community REAL CASH. Participants earn 20 points per raid/vote and can redeem 10,000 points for $100 CAD.',
      highlight: 'Real cash payouts'
    }
  ];

  const commandCategories = ['All', 'Account', 'Raids', 'Bubbles', 'Branding', 'Groups', 'General'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredCommands = selectedCategory === 'All' 
    ? commands 
    : commands.filter(c => c.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-full blur-3xl"></div>
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        ></div>
      </div>

      {/* Back Button */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 z-10">
        <Link
          to="/home"
          className="inline-flex items-center text-gray-400 hover:text-cyan-400 transition-all duration-300 group"
        >
          <FaArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Hero Content */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
                <FaTelegram className="text-cyan-400" />
                <span className="text-cyan-400 text-sm font-medium">Aquads Bot — Free to Start</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Pump Your Meme Coin
                <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
                  With Real Engagement
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                The ultimate Telegram bot for meme coin projects. Get <span className="text-green-400 font-semibold">5 FREE raid posts daily</span>, 
                boost with <span className="text-cyan-400 font-semibold">votes + TG members</span>, and get exposure to our <span className="text-purple-400 font-semibold">5,000+ member trending channel</span>.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a
                  href="https://t.me/aquadsbumpbot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-lg rounded-xl overflow-hidden transition-all duration-300 transform hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative flex items-center gap-2 text-white">
                    <FaTelegram className="text-xl" />
                    Start Free Now
                    <FaRocket className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                  </span>
                </a>
                
                <Link
                  to="/?modal=createAd"
                  className="inline-flex items-center justify-center px-8 py-4 font-semibold rounded-xl border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 transition-all duration-300"
                >
                  <FaCrown className="mr-2" />
                  List & Bump Project
                </Link>
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-6 mt-8 justify-center lg:justify-start">
                <div className="flex items-center gap-2 text-gray-400">
                  <FaCheckCircle className="text-green-500" />
                  <span>5 FREE raids/day</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <FaCheckCircle className="text-green-500" />
                  <span>Votes + Members</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <FaCheckCircle className="text-green-500" />
                  <span>5K+ Trending Channel</span>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="flex-1 relative">
              <div className="relative w-full max-w-md mx-auto">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-3xl blur-2xl scale-110"></div>
                
                {/* Bot preview card */}
                <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 border border-gray-700/50 shadow-2xl">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                      <FaTelegram className="text-2xl text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Aquads Bot</h3>
                      <p className="text-cyan-400 text-sm">@aquadsbumpbot</p>
                    </div>
                  </div>
                  
                  {/* Mock chat messages */}
                  <div className="space-y-3">
                    <div className="bg-gray-800/80 rounded-2xl rounded-tl-sm p-3">
                      <p className="text-gray-300 text-sm">🤖 <b>Aquads Bot</b></p>
                      <p className="text-gray-400 text-xs mt-1">👤 User123 | 💰 450 pts</p>
                      <p className="text-gray-400 text-xs">🐦 Twitter: ✅ | 🎨 Branding: ✅</p>
                    </div>
                    <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-2xl rounded-tr-sm p-3 max-w-[80%] ml-auto">
                      <p className="text-cyan-300 text-sm">/raids</p>
                    </div>
                    <div className="bg-gray-800/80 rounded-2xl rounded-tl-sm p-3">
                      <p className="text-gray-300 text-sm">🚀 <b>Twitter Raid Available!</b></p>
                      <p className="text-gray-400 text-xs mt-1">💰 Reward: 20 points</p>
                      <div className="flex gap-2 mt-2">
                        <span className="flex items-center gap-1 text-xs text-pink-400 bg-pink-500/20 px-2 py-1 rounded">
                          <FaHeart className="text-[10px]" /> Like
                        </span>
                        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
                          <FaRetweet className="text-[10px]" /> RT
                        </span>
                        <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded">
                          <FaComments className="text-[10px]" /> Comment
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating elements */}
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg animate-bounce">
                    <span className="text-white text-sm font-bold">+20</span>
                  </div>
                  <div className="absolute -bottom-3 -left-3 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                    <FaCrown className="text-white text-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Free vs Premium Comparison */}
      <div className="relative py-16 border-t border-gray-800/50 bg-gradient-to-b from-gray-900/30 to-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              5 Free Raids Daily,
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"> Trend Everywhere When Listed</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Every meme coin project gets 5 FREE raid posts per day. List & bump to trend across <span className="text-cyan-400">Aquads homepage</span>, <span className="text-purple-400">BEX trending</span>, and <span className="text-green-400">bubble rankings</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="relative bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accessTiers.free.color} flex items-center justify-center`}>
                  <accessTiers.free.icon className="text-xl text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{accessTiers.free.title}</h3>
                  <p className="text-gray-400 text-sm">No project listing required</p>
                </div>
              </div>
              
              <ul className="space-y-3">
                {accessTiers.free.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    {feature.included ? (
                      <FaCheck className="text-green-500 flex-shrink-0" />
                    ) : (
                      <FaTimes className="text-gray-600 flex-shrink-0" />
                    )}
                    <span className={feature.included ? 'text-gray-300' : 'text-gray-600'}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href="https://t.me/aquadsbumpbot"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full mt-6 py-3 text-center rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors"
              >
                Start Free
              </a>
            </div>

            {/* Premium Tier */}
            <div className="relative bg-gradient-to-br from-cyan-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl p-6 border border-cyan-500/30">
              {/* Popular badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full text-xs font-bold text-white">
                UNLOCK FULL POWER
              </div>
              
              <div className="flex items-center gap-3 mb-6 mt-2">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accessTiers.premium.color} flex items-center justify-center`}>
                  <accessTiers.premium.icon className="text-xl text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{accessTiers.premium.title}</h3>
                  <p className="text-cyan-400 text-sm">{accessTiers.premium.subtitle}</p>
                </div>
              </div>
              
              <ul className="space-y-3">
                {accessTiers.premium.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <FaCheck className={feature.highlight ? 'text-cyan-400' : 'text-green-500'} />
                    <span className={feature.highlight ? 'text-cyan-300 font-medium' : 'text-gray-300'}>
                      {feature.name}
                      {feature.highlight && <span className="ml-2 text-xs bg-cyan-500/20 px-2 py-0.5 rounded text-cyan-400">Premium</span>}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to="/home"
                className="block w-full mt-6 py-3 text-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold transition-all"
              >
                List & Bump Your Project
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div id="features" className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1 bg-gray-900/80 rounded-2xl border border-gray-800 backdrop-blur-sm">
            {['features', 'benefits', 'commands', 'boost'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 capitalize ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'boost' ? 'Vote Boost' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      {activeTab === 'features' && (
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need to
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"> Grow</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Real features, real engagement. Here's exactly what the bot can do.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800 hover:border-cyan-500/50 transition-all duration-500 hover:transform hover:-translate-y-2"
              >
                {feature.premium && (
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full text-xs text-purple-400 font-medium">
                      Premium
                    </span>
                  </div>
                )}
                
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="text-2xl text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors duration-300">
                  {feature.title}
                </h3>
                
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                  {feature.description}
                </p>

                <div className="space-y-2 mb-4">
                  {feature.details.map((detail, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                      <FaCheck className="text-cyan-500" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
                
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 rounded-lg text-xs font-mono text-cyan-400">
                  <span className="opacity-50">$</span>
                  {feature.command}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Benefits Section */}
      {activeTab === 'benefits' && (
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Projects Choose
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"> Aquads Bot</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Real benefits that translate to real growth for your project.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="group relative bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 hover:border-cyan-500/30 transition-all duration-500"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/20 group-hover:border-cyan-500/50 transition-colors duration-300">
                    <benefit.icon className="text-xl text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{benefit.title}</h3>
                    <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                      {benefit.highlight}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-400 text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commands Section */}
      {activeTab === 'commands' && (
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Complete
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"> Command Reference</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              All {commands.length} commands at your fingertips.
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {commandCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  selectedCategory === category
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-800 overflow-hidden">
            <div className="divide-y divide-gray-800/50">
              {filteredCommands.map((item, index) => (
                <div
                  key={index}
                  className="p-4 hover:bg-gray-800/30 transition-colors duration-300 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <code className="text-cyan-400 font-mono text-sm bg-cyan-500/10 px-3 py-1.5 rounded-lg whitespace-nowrap">
                      {item.cmd}
                    </code>
                    <span className="hidden sm:inline text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm flex-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Vote Boost Section */}
      {activeTab === 'boost' && (
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              🚀 Vote + Member
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"> Boost Packages</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Pump your meme coin's ranking with guaranteed bullish votes <span className="text-cyan-400 font-semibold">AND</span> real Telegram group members delivered to your community.
            </p>
          </div>

          {/* Package Benefits */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl p-6 border border-cyan-500/20 mb-8">
            <h3 className="text-lg font-bold text-white mb-4 text-center">🎁 Every Package Includes BOTH:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 justify-center">
                <FaThumbsUp className="text-green-500" />
                <span className="text-gray-300 font-medium">Guaranteed Bullish Votes</span>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <FaUserPlus className="text-blue-500" />
                <span className="text-gray-300 font-medium">Real TG Group Members</span>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <FaBell className="text-purple-500" />
                <span className="text-gray-300 font-medium">Vote Notifications</span>
              </div>
            </div>
          </div>

          {/* Packages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {boostPackages.map((pkg, index) => (
              <div
                key={index}
                className={`relative bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border transition-all duration-500 hover:transform hover:-translate-y-2 ${
                  index === 3 ? 'border-cyan-500/50 bg-gradient-to-br from-cyan-500/10 to-purple-500/10' : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                {pkg.discount && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full text-xs font-bold text-white">
                    {pkg.discount}
                  </div>
                )}
                
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
                  <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-1">
                    {pkg.votes.toLocaleString()}
                  </div>
                  <p className="text-cyan-400 text-sm font-semibold mb-4">Votes + Members</p>
                  
                  <div className="text-2xl font-bold text-white mb-2">
                    ${pkg.price}
                    <span className="text-sm text-gray-500 font-normal ml-1">USDC</span>
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-2">
                    ${(pkg.price / pkg.votes).toFixed(2)} per vote/member
                  </div>

                  <div className="flex flex-wrap gap-1 justify-center">
                    <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded">👍 Votes</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">👥 Members</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-400 mb-4">Use <code className="text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">/boostvote</code> in the bot to purchase</p>
            <a
              href="https://t.me/aquadsbumpbot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-xl transition-all duration-300"
            >
              <FaTelegram />
              Open Bot & Use /boostvote
            </a>
          </div>
        </div>
      )}

      {/* How It Works Section */}
      <div className="relative py-20 border-t border-gray-800/50 bg-gradient-to-b from-transparent to-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Get Started in
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"> 5 Easy Steps</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            {[
              {
                step: '01',
                title: 'Start the Bot',
                description: 'Open @aquadsbumpbot on Telegram and hit start to begin the onboarding.',
                icon: FaTelegram
              },
              {
                step: '02',
                title: 'Link Account',
                description: 'Use /link with your Aquads username. Create an account at aquads.xyz first.',
                icon: FaLink
              },
              {
                step: '03',
                title: 'Create Raids',
                description: 'Use /createraid with your tweet URL. 5 FREE daily, then 2000 points each!',
                icon: FaCoins
              },
              {
                step: '04',
                title: 'Boost Votes + Members',
                description: 'Use /boostvote to pump your bubble ranking.',
                icon: FaUsers
              },
              {
                step: '05',
                title: 'Trend Everywhere',
                description: 'List & bump to trend on Aquads homepage, BEX, bubble rankings + custom branding.',
                icon: FaCrown
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                {index < 4 && (
                  <div className="hidden lg:block absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-8 h-0.5 bg-gradient-to-r from-cyan-500/50 to-transparent z-10"></div>
                )}
                <div className="group bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800 hover:border-cyan-500/30 transition-all duration-500 text-center h-full">
                  <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 mb-5 group-hover:scale-110 transition-transform duration-300">
                    <item.icon className="text-2xl text-cyan-400" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="relative py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-10 border border-gray-700/50 overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10"></div>
            
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 mb-6 shadow-lg shadow-cyan-500/25">
                <FaTelegram className="text-4xl text-white" />
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Pump Your Meme Coin?
              </h2>
              
              <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
                Start with 5 FREE raid posts daily. Boost with votes + members, and list & bump to trend across Aquads, BEX, and bubble rankings with your custom branding.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://t.me/aquadsbumpbot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-center px-8 py-4 font-bold text-lg rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/25"
                >
                  <FaTelegram className="mr-2 text-xl" />
                  Launch Telegram Bot
                  <FaRocket className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                </a>
                
                <Link
                  to="/home"
                  className="inline-flex items-center justify-center px-8 py-4 font-semibold text-gray-300 rounded-xl border border-gray-600 hover:border-gray-500 hover:text-white transition-all duration-300 bg-gray-800/50"
                >
                  Back to Aquads
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer spacing */}
      <div className="h-8"></div>
    </div>
  );
};

export default TelegramBot;
