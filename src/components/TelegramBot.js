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
      description: 'Create and participate in Twitter raids. Like, retweet, comment & bookmark tweets to earn 20 points per completion. Raids auto-expire after 48 hours.',
      command: '/raids • /createraid URL',
      color: 'from-sky-500 to-blue-600',
      details: ['Earn 20 points per raid', 'Free raids available daily', 'Admin approval for quality']
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
      title: 'Bubble Tracking',
      description: 'View the top 10 trending bubbles ranked by bullish votes. Track your own projects and see real-time rankings and vote counts.',
      command: '/bubbles • /mybubble',
      color: 'from-emerald-500 to-green-600',
      details: ['Top 10 leaderboard', 'Your project stats', 'Real-time rankings']
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
      description: 'Upload your own branding image for vote notifications and /mybubble showcases. Your image appears in all bot communications about your project.',
      command: '/setbranding • /removebranding',
      color: 'from-pink-500 to-rose-600',
      details: ['Max 500KB (JPG/PNG)', '1920×1080 recommended', 'Exclusive for bumped projects'],
      premium: true
    },
    {
      icon: FaCoins,
      title: 'Points System',
      description: 'Earn points by completing raids, voting on projects, and engaging with the community. Use points to create your own raids (2000 pts) or redeem rewards.',
      command: 'Check in /help menu',
      color: 'from-amber-500 to-orange-600',
      details: ['20 pts per raid', '20 pts per first vote', 'Redeem for rewards']
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
      title: 'Vote Boost Packages',
      description: 'Skyrocket your bubble ranking with guaranteed bullish votes. Packages include votes AND new Telegram group members for your project.',
      command: '/boostvote',
      color: 'from-rose-500 to-red-600',
      details: ['100-1000 votes available', 'TG members included', 'Up to 25% discounts'],
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
        { name: 'View Available Raids', included: true },
        { name: 'Complete Raids & Earn Points', included: true },
        { name: 'Vote on Projects', included: true },
        { name: 'View Top Bubbles', included: true },
        { name: 'Set Twitter/Facebook Username', included: true },
        { name: 'Create Raids (Limited Free Daily)', included: true },
        { name: 'Custom Branding', included: false },
        { name: 'Vote Notifications with Your Image', included: false },
        { name: '/mybubble Showcase', included: false },
        { name: 'Unlimited Raid Creation', included: false },
        { name: 'Priority Support', included: false }
      ]
    },
    premium: {
      title: 'Full Access',
      subtitle: 'List & Bump Your Project',
      icon: FaUnlock,
      color: 'from-cyan-500 to-blue-600',
      features: [
        { name: 'Account Linking', included: true },
        { name: 'View Available Raids', included: true },
        { name: 'Complete Raids & Earn Points', included: true },
        { name: 'Vote on Projects', included: true },
        { name: 'View Top Bubbles', included: true },
        { name: 'Set Twitter/Facebook Username', included: true },
        { name: 'Create Raids (Free Raids First)', included: true },
        { name: 'Custom Branding', included: true, highlight: true },
        { name: 'Vote Notifications with Your Image', included: true, highlight: true },
        { name: '/mybubble Showcase', included: true, highlight: true },
        { name: 'Unlimited Raid Creation', included: true, highlight: true },
        { name: 'Priority Support', included: true, highlight: true }
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
    { cmd: '/createraid URL', desc: 'Create a new Twitter raid (free raids first, then 2000 pts)', category: 'Raids' },
    { cmd: '/cancelraid URL', desc: 'Cancel a raid you created', category: 'Raids' },
    { cmd: '/bubbles', desc: 'View top 10 bubbles by bullish votes', category: 'Bubbles' },
    { cmd: '/mybubble', desc: 'View YOUR projects with voting buttons', category: 'Bubbles' },
    { cmd: '/boostvote', desc: 'Purchase vote boost packages for your bubble', category: 'Bubbles' },
    { cmd: '/setbranding', desc: 'Upload custom branding image (bumped projects only)', category: 'Branding' },
    { cmd: '/removebranding', desc: 'Remove custom branding', category: 'Branding' },
    { cmd: '/raidin', desc: 'Opt-in your group to community raid sharing', category: 'Groups' },
    { cmd: '/raidout', desc: 'Opt-out your group from community raids', category: 'Groups' }
  ];

  // Vote boost packages (real data)
  const boostPackages = [
    { name: 'Starter', votes: 100, price: 20, discount: null },
    { name: 'Basic', votes: 250, price: 40, discount: '20% OFF' },
    { name: 'Growth', votes: 500, price: 80, discount: '20% OFF' },
    { name: 'Pro', votes: 1000, price: 150, discount: '25% OFF' }
  ];

  const benefits = [
    {
      icon: FaBolt,
      title: 'Instant Engagement',
      description: 'Launch raids and get immediate community participation. Raids are sent to all opted-in groups for maximum exposure.',
      highlight: 'Real-time reach'
    },
    {
      icon: FaUsers,
      title: 'Community Growth',
      description: 'Grow your Telegram group with the vote boost packages. Get real members along with bullish votes.',
      highlight: 'Members + Votes'
    },
    {
      icon: FaTrophy,
      title: 'Leaderboard Rankings',
      description: 'Climb the bubble rankings with bullish votes. Top projects get featured in the /bubbles command across all groups.',
      highlight: 'Visibility boost'
    },
    {
      icon: FaShieldAlt,
      title: 'Verified Completions',
      description: 'All raid completions go through admin verification ensuring genuine engagement, not bots.',
      highlight: 'Quality assurance'
    },
    {
      icon: FaImage,
      title: 'Brand Visibility',
      description: 'Your custom branding appears in vote notifications sent to the trending channel and all groups when users vote.',
      highlight: 'Your image everywhere'
    },
    {
      icon: FaGlobe,
      title: 'Cross-Platform',
      description: 'Execute coordinated campaigns across Twitter and Facebook. Track everything through one bot.',
      highlight: 'Multi-platform'
    },
    {
      icon: FaComments,
      title: 'Group Integration',
      description: 'Add the bot to your Telegram group for direct raid notifications and community engagement.',
      highlight: 'Direct to group'
    },
    {
      icon: FaHandshake,
      title: 'Network Effects',
      description: 'Opt-in to community raids and share exposure with other projects. Rising tide lifts all boats.',
      highlight: 'Collaborative growth'
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
          to="/"
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
                <span className="text-cyan-400 text-sm font-medium">Aquads Bump Bot — Free to Start</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Supercharge Your
                <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
                  Community Engagement
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                The ultimate Telegram bot for crypto projects. Create Twitter & Facebook raids, 
                track your bubble rankings, earn points, and unlock <span className="text-cyan-400">custom branding</span> when you list & bump your project.
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
                  <span>Free to start</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <FaCheckCircle className="text-green-500" />
                  <span>Earn 20 pts/raid</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <FaCheckCircle className="text-green-500" />
                  <span>Custom branding</span>
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
                      <h3 className="text-lg font-bold text-white">Aquads Bump Bot</h3>
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
              Free to Start,
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"> Powerful When Upgraded</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Start earning points immediately. Unlock custom branding and advanced features when you list & bump your project.
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
                to="/"
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
              🚀 Vote Boost
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"> Packages</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Skyrocket your bubble ranking with guaranteed bullish votes AND Telegram group members.
            </p>
          </div>

          {/* Package Benefits */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl p-6 border border-cyan-500/20 mb-8">
            <h3 className="text-lg font-bold text-white mb-4 text-center">Every Package Includes:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 justify-center">
                <FaThumbsUp className="text-green-500" />
                <span className="text-gray-300">Guaranteed Bullish Votes</span>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <FaUserPlus className="text-blue-500" />
                <span className="text-gray-300">New TG Group Members</span>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <FaBell className="text-purple-500" />
                <span className="text-gray-300">Vote Notifications in Channel</span>
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
                  <p className="text-gray-400 text-sm mb-4">Votes + Members</p>
                  
                  <div className="text-2xl font-bold text-white mb-4">
                    ${pkg.price}
                    <span className="text-sm text-gray-500 font-normal ml-1">USDC</span>
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-4">
                    ${(pkg.price / pkg.votes).toFixed(2)} per vote
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
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"> 4 Easy Steps</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                title: 'Earn Points',
                description: 'Complete raids (/raids) and vote on projects. Earn 20 points each!',
                icon: FaCoins
              },
              {
                step: '04',
                title: 'Unlock Premium',
                description: 'List & bump your project to unlock custom branding and full features.',
                icon: FaCrown
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                {index < 3 && (
                  <div className="hidden lg:block absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-12 h-0.5 bg-gradient-to-r from-cyan-500/50 to-transparent z-10"></div>
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
                Ready to Grow Your Community?
              </h2>
              
              <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
                Start free today. Complete raids, earn points, and when you're ready — list & bump your project to unlock the full power of custom branding.
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
                  to="/"
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
