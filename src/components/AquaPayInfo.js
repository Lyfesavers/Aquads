import React, { useState } from 'react';
import { FaArrowLeft, FaWallet, FaLink, FaShieldAlt, FaCoins, FaGlobe, FaChartLine, FaBell, FaQrcode, FaPalette, FaCheckCircle, FaUsers, FaHandshake, FaCreditCard, FaMobileAlt, FaRocket, FaLock, FaUnlock, FaEthereum, FaBitcoin } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const AquaPayInfo = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const features = [
    {
      icon: FaGlobe,
      title: 'Multi-Chain Support',
      description: 'Receive payments across 8+ blockchain networks including Ethereum, Base, Polygon, Arbitrum, BNB, Solana, Bitcoin, and TRON.',
      color: 'from-blue-500 to-cyan-600',
      details: ['8+ blockchain networks', 'Native tokens & USDC', 'One payment link for all chains']
    },
    {
      icon: FaShieldAlt,
      title: 'Non-Custodial',
      description: 'All payments go directly to your wallet. We never hold, control, or have access to your funds. Complete financial sovereignty.',
      color: 'from-green-500 to-emerald-600',
      details: ['Direct wallet-to-wallet', 'No custody risk', 'You control your keys']
    },
    {
      icon: FaLink,
      title: 'Personalized Payment Links',
      description: 'Create custom payment pages with your username or custom slug. Share one link that works across all your supported chains.',
      color: 'from-purple-500 to-violet-600',
      details: ['Custom payment slugs', 'Branded payment pages', 'Easy to share']
    },
    {
      icon: FaChartLine,
      title: 'Payment Tracking',
      description: 'Complete payment history with transaction details, statistics, and real-time notifications. Track all your crypto payments in one place.',
      color: 'from-orange-500 to-amber-600',
      details: ['Payment history', 'Real-time stats', 'Email notifications']
    },
    {
      icon: FaQrcode,
      title: 'QR Code Generation',
      description: 'Automatic QR codes for Bitcoin and TRON addresses. Easy mobile scanning for quick payments.',
      color: 'from-pink-500 to-rose-600',
      details: ['Instant QR codes', 'Mobile-friendly', 'Copy or scan']
    },
    {
      icon: FaPalette,
      title: 'Customizable Themes',
      description: 'Choose from multiple visual themes to match your brand. Default, dark, light, gradient, and neon options available.',
      color: 'from-indigo-500 to-purple-600',
      details: ['5 theme options', 'Brand customization', 'Professional appearance']
    },
    {
      icon: FaBell,
      title: 'Real-Time Notifications',
      description: 'Get instant notifications when payments are received via WebSocket and optional email alerts with transaction details.',
      color: 'from-cyan-500 to-blue-600',
      details: ['WebSocket notifications', 'Email alerts', 'Transaction details']
    },
    {
      icon: FaWallet,
      title: 'Wallet Integration',
      description: 'Supports all major wallets including MetaMask, WalletConnect, Phantom, Solflare, and 300+ more wallet options.',
      color: 'from-teal-500 to-green-600',
      details: ['300+ wallet options', 'One-click connection', 'Multi-wallet support']
    }
  ];

  const useCases = [
    {
      icon: FaUsers,
      title: 'For Freelancers',
      description: 'Receive payments from clients worldwide without high transaction fees eating into your earnings.',
      benefits: ['Low 0.5% transaction fees', 'Multi-chain flexibility', 'Professional payment pages', 'Payment history for accounting']
    },
    {
      icon: FaHandshake,
      title: 'For Content Creators',
      description: 'Accept tips and donations from fans. Share your payment link on social media and track supporter contributions.',
      benefits: ['Easy donation links', 'Social media sharing', 'Track contributions', 'Maximize donation value']
    },
    {
      icon: FaCreditCard,
      title: 'For Businesses',
      description: 'Accept crypto payments for products and services with custom branding and multi-chain support for customer convenience.',
      benefits: ['Custom branding', 'Multi-chain support', 'Payment analytics', 'Professional appearance']
    },
    {
      icon: FaMobileAlt,
      title: 'For Individuals',
      description: 'Split bills, receive payments for services, or accept gifts. Simple, shareable payment links with no technical knowledge required.',
      benefits: ['Simple setup', 'Shareable links', 'No technical knowledge', 'Mobile-friendly']
    }
  ];

  const chains = [
    { name: 'Ethereum', icon: FaEthereum, tokens: ['ETH', 'USDC'], color: 'from-blue-500 to-indigo-600' },
    { name: 'Base', icon: FaEthereum, tokens: ['ETH', 'USDC'], color: 'from-blue-400 to-blue-600' },
    { name: 'Polygon', icon: FaEthereum, tokens: ['MATIC', 'USDC'], color: 'from-purple-400 to-violet-600' },
    { name: 'Arbitrum', icon: FaEthereum, tokens: ['ETH', 'USDC'], color: 'from-cyan-500 to-blue-600' },
    { name: 'BNB Chain', icon: FaCoins, tokens: ['BNB', 'USDC'], color: 'from-yellow-400 to-amber-500' },
    { name: 'Solana', icon: FaCoins, tokens: ['SOL', 'USDC'], color: 'from-purple-500 to-violet-600' },
    { name: 'Bitcoin', icon: FaBitcoin, tokens: ['BTC'], color: 'from-orange-400 to-amber-500' },
    { name: 'TRON', icon: FaCoins, tokens: ['TRX'], color: 'from-red-400 to-rose-500' }
  ];

  const benefits = [
    {
      icon: FaLock,
      title: 'Secure & Non-Custodial',
      description: 'Your funds never leave your wallet. We never have access to your private keys or funds.',
      highlight: 'Complete control'
    },
    {
      icon: FaCoins,
      title: 'Low 0.5% Transaction Fee',
      description: 'Competitive 0.5% transaction fee compared to traditional payment processors charging 2-5%.',
      highlight: 'Save on fees'
    },
    {
      icon: FaGlobe,
      title: 'Multi-Chain in One Link',
      description: 'One payment link supports all your configured chains. Recipients choose their preferred network.',
      highlight: 'Maximum flexibility'
    },
    {
      icon: FaRocket,
      title: 'Easy Setup',
      description: 'Get started in minutes. Add your wallet addresses, customize your page, and start receiving payments.',
      highlight: 'Quick onboarding'
    },
    {
      icon: FaChartLine,
      title: 'Payment Analytics',
      description: 'Track all payments with detailed history, statistics, and transaction explorer links.',
      highlight: 'Full transparency'
    },
    {
      icon: FaBell,
      title: 'Real-Time Alerts',
      description: 'Get instant notifications when payments arrive via WebSocket and optional email alerts.',
      highlight: 'Stay informed'
    }
  ];

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
                <FaWallet className="text-cyan-400" />
                <span className="text-cyan-400 text-sm font-medium">AquaPay — Non-Custodial Payments</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Receive Crypto Payments
                <br />
                <span className="text-white">Directly to Your Wallet</span>
              </h1>
              
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto lg:mx-0">
                Create personalized payment links and receive cryptocurrency payments across 8+ blockchain networks. 
                Non-custodial, low fees, and complete control over your funds.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/dashboard/aquapay"
                  className="group inline-flex items-center justify-center px-8 py-4 font-bold text-lg rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/25"
                >
                  <FaWallet className="mr-2 text-xl" />
                  Get Started
                  <FaRocket className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                </Link>
                
                <a
                  href="#features"
                  className="inline-flex items-center justify-center px-8 py-4 font-semibold text-gray-300 rounded-xl border border-gray-600 hover:border-gray-500 hover:text-white transition-all duration-300 bg-gray-800/50"
                >
                  Learn More
                </a>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="flex-1 relative">
              <div className="relative bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-3xl p-8 border border-cyan-500/30 backdrop-blur-xl">
                <div className="space-y-4">
                  <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500"></div>
                      <div>
                        <div className="text-white font-semibold">Your Payment Page</div>
                        <div className="text-cyan-400 text-sm">aquads.xyz/pay/username</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {['ETH', 'SOL', 'BTC'].map((token, i) => (
                        <div key={i} className="bg-gray-800 rounded-lg p-2 text-center text-xs border border-gray-700">
                          {token}
                        </div>
                      ))}
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                      <div className="text-emerald-400 text-sm font-semibold">0.5% Transaction Fee</div>
                      <div className="text-gray-400 text-xs">+ Network Gas Fees</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 z-10">
        <div className="flex flex-wrap gap-2 justify-center lg:justify-start border-b border-gray-800">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'features', label: 'Features' },
            { id: 'chains', label: 'Supported Chains' },
            { id: 'usecases', label: 'Use Cases' },
            { id: 'benefits', label: 'Benefits' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'features') {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className={`px-6 py-3 font-medium transition-all duration-300 border-b-2 ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Sections */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 z-10">
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-12">
            <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-2xl p-8">
              <h2 className="text-3xl font-bold mb-4">What is AquaPay?</h2>
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                AquaPay is a revolutionary non-custodial payment link system that enables users to receive cryptocurrency payments 
                directly to their wallets across multiple blockchain networks. Unlike traditional payment processors, AquaPay never 
                holds your funds—all payments go directly to your wallet address.
              </p>
              <div className="grid md:grid-cols-3 gap-6 mt-8">
                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                  <FaShieldAlt className="text-cyan-400 text-3xl mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Non-Custodial</h3>
                  <p className="text-gray-400">We never hold your funds. All payments go directly to your wallet.</p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                  <FaCoins className="text-green-400 text-3xl mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Low Fees</h3>
                  <p className="text-gray-400">Only 0.5% transaction fee + network gas fees. No hidden charges.</p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                  <FaGlobe className="text-purple-400 text-3xl mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Multi-Chain</h3>
                  <p className="text-gray-400">Support for 8+ blockchain networks in one payment link.</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
              <h2 className="text-3xl font-bold mb-6">How It Works</h2>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { step: '1', title: 'Set Up', desc: 'Add your wallet addresses for supported chains' },
                  { step: '2', title: 'Customize', desc: 'Create your payment page with custom slug and branding' },
                  { step: '3', title: 'Share', desc: 'Share your payment link: aquads.xyz/pay/username' },
                  { step: '4', title: 'Receive', desc: 'Get paid directly to your wallet with real-time notifications' }
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-2xl font-bold mb-4 mx-auto">
                      {item.step}
                    </div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Features Tab */}
        {activeTab === 'features' && (
          <div id="features" className="space-y-8">
            <h2 className="text-4xl font-bold mb-8">Key Features</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-xl p-6 border border-gray-800 hover:border-cyan-500/50 transition-all duration-300"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="text-2xl text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400 mb-4">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.details.map((detail, j) => (
                      <li key={j} className="flex items-center text-sm text-gray-300">
                        <FaCheckCircle className="text-cyan-400 mr-2 flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Supported Chains Tab */}
        {activeTab === 'chains' && (
          <div className="space-y-8">
            <h2 className="text-4xl font-bold mb-8">Supported Blockchain Networks</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {chains.map((chain, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-xl p-6 border border-gray-800 hover:border-cyan-500/50 transition-all duration-300 text-center"
                >
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${chain.color} flex items-center justify-center mx-auto mb-4`}>
                    <chain.icon className="text-3xl text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{chain.name}</h3>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {chain.tokens.map((token, j) => (
                      <span key={j} className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">
                        {token}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Use Cases Tab */}
        {activeTab === 'usecases' && (
          <div className="space-y-8">
            <h2 className="text-4xl font-bold mb-8">Who Uses AquaPay?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {useCases.map((useCase, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-xl p-6 border border-gray-800"
                >
                  <useCase.icon className="text-4xl text-cyan-400 mb-4" />
                  <h3 className="text-2xl font-semibold mb-2">{useCase.title}</h3>
                  <p className="text-gray-400 mb-4">{useCase.description}</p>
                  <ul className="space-y-2">
                    {useCase.benefits.map((benefit, j) => (
                      <li key={j} className="flex items-center text-sm text-gray-300">
                        <FaCheckCircle className="text-green-400 mr-2 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Benefits Tab */}
        {activeTab === 'benefits' && (
          <div className="space-y-8">
            <h2 className="text-4xl font-bold mb-8">Why Choose AquaPay?</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-xl p-6 border border-gray-800 hover:border-cyan-500/50 transition-all duration-300"
                >
                  <benefit.icon className="text-4xl text-cyan-400 mb-4" />
                  <div className="inline-block px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-400 mb-3">
                    {benefit.highlight}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-gray-400">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-20 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-2xl p-12 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Start Receiving Payments?</h2>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Set up your AquaPay payment page in minutes and start accepting cryptocurrency payments across multiple blockchain networks.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard/aquapay"
              className="group inline-flex items-center justify-center px-8 py-4 font-bold text-lg rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/25"
            >
              <FaWallet className="mr-2 text-xl" />
              Get Started with AquaPay
              <FaRocket className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
            </Link>
            
            <Link
              to="/docs#wp-aquapay"
              className="inline-flex items-center justify-center px-8 py-4 font-semibold text-gray-300 rounded-xl border border-gray-600 hover:border-gray-500 hover:text-white transition-all duration-300 bg-gray-800/50"
            >
              Read Documentation
            </Link>
          </div>
        </div>
      </div>

      {/* Footer spacing */}
      <div className="h-8"></div>
    </div>
  );
};

export default AquaPayInfo;

