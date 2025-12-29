import React from 'react';
import { FaArrowLeft, FaRocket, FaUsers, FaChartLine, FaGlobe, FaShieldAlt, FaCheckCircle, FaArrowRight, FaBullhorn, FaHandshake, FaTrophy, FaCreditCard, FaExchangeAlt, FaUsersCog, FaVideo, FaMicrophone, FaBriefcase, FaMoneyBillWave, FaClock, FaStar, FaGlobeAmericas, FaLock, FaHeadset, FaTools, FaNetworkWired, FaCertificate, FaGift, FaClipboardCheck, FaLink, FaWallet, FaExternalLinkAlt, FaFingerprint, FaShareAlt, FaMedal } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const FreelancerBenefits = ({ currentUser }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          to="/marketplace"
          className="inline-flex items-center text-gray-300 hover:text-white transition-colors duration-300"
        >
          <FaArrowLeft className="mr-2" />
          Back to Freelancer Hub
        </Link>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Why List Your Services on
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500"> Aquads</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Join the premier Web3 freelancer marketplace and connect with clients worldwide. Build your reputation, grow your business, and earn more with our comprehensive platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/marketplace?modal=list-service"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <FaRocket className="mr-2" />
                Start Freelancing Now
                <FaArrowRight className="ml-2" />
              </Link>
              <a
                href="mailto:aquads.info@gmail.com"
                className="inline-flex items-center px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-300 border border-gray-600"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Freelancer Advantages Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            The Aquads Freelancer Advantage
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Discover why top freelancers choose Aquads to grow their business and connect with quality clients.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Advantage 1 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-indigo-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-indigo-500 p-3 rounded-lg">
                <FaGlobeAmericas className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Global Client Base</h3>
            </div>
            <p className="text-gray-300">
              Access clients from around the world in the Web3 ecosystem. Connect with crypto projects, startups, and established companies seeking your expertise.
            </p>
          </div>

          {/* Advantage 2 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-indigo-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <FaMoneyBillWave className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Competitive Earnings</h3>
            </div>
            <p className="text-gray-300">
              Set your own rates and earn what you're worth. Our platform supports both crypto and fiat payments with secure payment processing.
            </p>
          </div>

          {/* Advantage 3 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-indigo-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-purple-500 p-3 rounded-lg">
                <FaStar className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Reputation Building</h3>
            </div>
            <p className="text-gray-300">
              Build your professional reputation through our review system. Showcase your skills and past work to attract better clients and higher rates.
            </p>
          </div>

          {/* Advantage 4 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-indigo-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-blue-500 p-3 rounded-lg">
                <FaTools className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Professional Tools</h3>
            </div>
            <p className="text-gray-300">
              Access built-in project management, secure messaging, and payment systems. Focus on your work while we handle the logistics.
            </p>
          </div>

          {/* Advantage 5 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-indigo-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-yellow-500 p-3 rounded-lg">
                <FaNetworkWired className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Web3 Network</h3>
            </div>
            <p className="text-gray-300">
              Connect with other Web3 professionals and stay ahead of industry trends. Join a community of innovators and thought leaders.
            </p>
          </div>

          {/* Advantage 6 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-indigo-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-pink-500 p-3 rounded-lg">
                <FaShieldAlt className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Secure Payments</h3>
            </div>
            <p className="text-gray-300">
              Get paid securely with Stripe and PayPal for invoicing, plus NowPayments for crypto payments. Our booking system ensures safe transactions for both parties through our approval-based invoicing process.
            </p>
          </div>

          {/* Advantage 7 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-indigo-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <FaClock className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Flexible Scheduling</h3>
            </div>
            <p className="text-gray-300">
              Work on your own terms with flexible project timelines. Choose projects that fit your schedule and availability.
            </p>
          </div>

          {/* Advantage 8 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-indigo-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-orange-500 p-3 rounded-lg">
                <FaHeadset className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">24/7 Support</h3>
            </div>
            <p className="text-gray-300">
              Get help whenever you need it with our dedicated support team. We're here to ensure your success on the platform.
            </p>
          </div>

          {/* Advantage 9 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-indigo-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-purple-500 p-3 rounded-lg">
                <FaCertificate className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Skill Verification</h3>
            </div>
            <p className="text-gray-300">
              Showcase your verified skills and certifications. Stand out from the competition with our skill verification system.
            </p>
          </div>

          {/* Advantage 10 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-indigo-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-red-500 p-3 rounded-lg">
                <FaGift className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Rewards Program</h3>
            </div>
            <p className="text-gray-300">
              Earn additional rewards through our loyalty program. Complete projects, get positive reviews, and unlock exclusive benefits.
            </p>
          </div>

          {/* Advantage 11 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-indigo-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-indigo-500 p-3 rounded-lg">
                <FaBriefcase className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Portfolio Showcase</h3>
            </div>
            <p className="text-gray-300">
              Create a professional portfolio to showcase your best work. Attract high-quality clients with compelling project presentations.
            </p>
          </div>

          {/* Advantage 12 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-indigo-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <FaLock className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Privacy Protection</h3>
            </div>
            <p className="text-gray-300">
              Keep your personal information secure while building your professional network. We prioritize your privacy and data protection.
            </p>
          </div>

          {/* Advantage 13 - NEW: Safe Booking System */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-indigo-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-teal-500 p-3 rounded-lg">
                <FaClipboardCheck className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white ml-4">Safe Booking System</h3>
            </div>
            <p className="text-gray-300">
              Our booking system encourages a safe process for both parties. While we don't currently offer escrow, invoicing is only allowed once work is approved and ready for delivery, ensuring quality and satisfaction.
            </p>
          </div>
        </div>
      </div>

      {/* On-Chain Resume - Featured Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900/40 via-purple-900/40 to-indigo-900/40 border border-blue-500/30">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10 p-8 md:p-12 lg:p-16">
            {/* Section Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full mb-6">
                <FaLink className="text-blue-400" />
                <span className="text-blue-300 text-sm font-medium">NEW: Blockchain-Powered Credentials</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                On-Chain Resume
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Mint your verified freelancer credentials on the blockchain. Your trust score, skill badges, and work history — permanently verifiable, tamper-proof, and truly yours.
              </p>
            </div>

            {/* Main Feature Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* Left: Trust Score Visualization */}
              <div className="bg-gray-900/60 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                  <FaChartLine className="text-blue-400" />
                  Trust Score System
                </h3>
                
                {/* Score Circle Preview */}
                <div className="flex items-center justify-center mb-8">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full border-8 border-gray-700 flex items-center justify-center"
                      style={{
                        background: `conic-gradient(#22c55e 288deg, #374151 288deg)`
                      }}>
                      <div className="w-24 h-24 rounded-full bg-gray-900 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-green-400">80</span>
                        <span className="text-xs text-gray-400">/100</span>
                      </div>
                    </div>
                    <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-2">
                      <FaCheckCircle className="text-white text-sm" />
                    </div>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-2">
                      <FaStar className="text-yellow-400" /> Rating
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-700 rounded-full h-2">
                        <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '90%' }}></div>
                      </div>
                      <span className="text-white text-sm w-12 text-right">45/50</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-2">
                      <FaCheckCircle className="text-green-400" /> Completion
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-700 rounded-full h-2">
                        <div className="bg-green-400 h-2 rounded-full" style={{ width: '80%' }}></div>
                      </div>
                      <span className="text-white text-sm w-12 text-right">24/30</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-2">
                      <FaBriefcase className="text-blue-400" /> Profile
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-400 h-2 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                      <span className="text-white text-sm w-12 text-right">10/10</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-2">
                      <FaShieldAlt className="text-purple-400" /> Verification
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-700 rounded-full h-2">
                        <div className="bg-purple-400 h-2 rounded-full" style={{ width: '50%' }}></div>
                      </div>
                      <span className="text-white text-sm w-12 text-right">2.5/5</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-2">
                      <FaMedal className="text-orange-400" /> Badges
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-700 rounded-full h-2">
                        <div className="bg-orange-400 h-2 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                      <span className="text-white text-sm w-12 text-right">5/5</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Key Features */}
              <div className="space-y-4">
                {/* Feature 1 */}
                <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3 rounded-lg shrink-0">
                      <FaFingerprint className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-1">Tamper-Proof Credentials</h4>
                      <p className="text-gray-400 text-sm">Your trust score and work history are stored on Base blockchain using EAS (Ethereum Attestation Service). No one can fake or modify your credentials.</p>
                    </div>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-lg shrink-0">
                      <FaShareAlt className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-1">Portable & Shareable</h4>
                      <p className="text-gray-400 text-sm">Get a unique public resume URL you can share anywhere. Works across platforms — your credentials follow you, not the platform.</p>
                    </div>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-3 rounded-lg shrink-0">
                      <FaWallet className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-1">Self-Sovereign Ownership</h4>
                      <p className="text-gray-400 text-sm">You mint it, you own it. Your on-chain resume is tied to your wallet, not controlled by any company. True Web3 identity.</p>
                    </div>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50 hover:border-yellow-500/50 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-3 rounded-lg shrink-0">
                      <FaExternalLinkAlt className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-1">Publicly Verifiable</h4>
                      <p className="text-gray-400 text-sm">Anyone can verify your credentials on the blockchain explorer. Direct links to EAS and Basescan prove your authenticity.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* What Gets Minted */}
            <div className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 mb-12">
              <h3 className="text-xl font-semibold text-white mb-6 text-center">What Gets Minted On-Chain</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="text-center p-4 bg-gray-800/50 rounded-xl">
                  <div className="text-2xl mb-2">📊</div>
                  <div className="text-sm text-white font-medium">Trust Score</div>
                  <div className="text-xs text-gray-400">0-100 points</div>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-xl">
                  <div className="text-2xl mb-2">⭐</div>
                  <div className="text-sm text-white font-medium">Avg Rating</div>
                  <div className="text-xs text-gray-400">Client reviews</div>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-xl">
                  <div className="text-2xl mb-2">✅</div>
                  <div className="text-sm text-white font-medium">Jobs Done</div>
                  <div className="text-xs text-gray-400">Completed count</div>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-xl">
                  <div className="text-2xl mb-2">📈</div>
                  <div className="text-sm text-white font-medium">Success Rate</div>
                  <div className="text-xs text-gray-400">Completion %</div>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-xl">
                  <div className="text-2xl mb-2">🎖️</div>
                  <div className="text-sm text-white font-medium">Skill Badges</div>
                  <div className="text-xs text-gray-400">Verified skills</div>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-xl">
                  <div className="text-2xl mb-2">📅</div>
                  <div className="text-sm text-white font-medium">Member Since</div>
                  <div className="text-xs text-gray-400">Account age</div>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-white mb-6 text-center">How It Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-blue-400 font-bold text-xl">1</span>
                  </div>
                  <h4 className="text-white font-medium mb-2">Connect Wallet</h4>
                  <p className="text-gray-400 text-sm">Use WalletConnect or any browser wallet (MetaMask, Coinbase, etc.)</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-purple-400 font-bold text-xl">2</span>
                  </div>
                  <h4 className="text-white font-medium mb-2">Preview Score</h4>
                  <p className="text-gray-400 text-sm">See your complete trust score breakdown before minting</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-green-400 font-bold text-xl">3</span>
                  </div>
                  <h4 className="text-white font-medium mb-2">Mint on Base</h4>
                  <p className="text-gray-400 text-sm">One transaction (~$0.01) creates your permanent attestation</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-yellow-400 font-bold text-xl">4</span>
                  </div>
                  <h4 className="text-white font-medium mb-2">Share & Verify</h4>
                  <p className="text-gray-400 text-sm">Get your public resume link and share with potential clients</p>
                </div>
              </div>
            </div>

            {/* Tech Stack & CTA */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-gray-900/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <span className="px-3 py-1.5 bg-blue-500/20 text-blue-300 text-sm rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  Base Network
                </span>
                <span className="px-3 py-1.5 bg-purple-500/20 text-purple-300 text-sm rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                  EAS Protocol
                </span>
                <span className="px-3 py-1.5 bg-green-500/20 text-green-300 text-sm rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  ~$0.01 per mint
                </span>
                <span className="px-3 py-1.5 bg-yellow-500/20 text-yellow-300 text-sm rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  ~10 seconds
                </span>
              </div>
              <Link
                to="/marketplace?tab=on-chain-resume"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg whitespace-nowrap"
              >
                <FaLink className="mr-2" />
                Mint Your On-Chain Resume
                <FaArrowRight className="ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Platform Features
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Everything you need to succeed as a freelancer in the Web3 ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-indigo-500/20 p-6 rounded-xl mb-4">
              <FaBriefcase className="text-indigo-400 text-3xl mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Service Listings</h3>
            <p className="text-gray-400 text-sm">Create detailed service offerings with pricing and portfolio</p>
          </div>

          <div className="text-center">
            <div className="bg-green-500/20 p-6 rounded-xl mb-4">
              <FaUsers className="text-green-400 text-3xl mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Client Matching</h3>
            <p className="text-gray-400 text-sm">Smart algorithms connect you with ideal clients</p>
          </div>

          <div className="text-center">
            <div className="bg-purple-500/20 p-6 rounded-xl mb-4">
              <FaCreditCard className="text-purple-400 text-3xl mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Secure Payments</h3>
            <p className="text-gray-400 text-sm">Safe payment processing with multiple options</p>
          </div>

          <div className="text-center">
            <div className="bg-yellow-500/20 p-6 rounded-xl mb-4">
              <FaStar className="text-yellow-400 text-3xl mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Reviews & Ratings</h3>
            <p className="text-gray-400 text-sm">Build your reputation through client feedback</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Start Your Freelancing Journey?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Join thousands of successful freelancers who have found their dream clients on Aquads. Start building your professional reputation today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/marketplace?modal=list-service"
              className="inline-flex items-center px-8 py-4 bg-white text-indigo-600 font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <FaRocket className="mr-2" />
              Start Freelancing Now
              <FaArrowRight className="ml-2" />
            </Link>
            <a
              href="mailto:aquads.info@gmail.com"
              className="inline-flex items-center px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-indigo-600 transition-all duration-300"
            >
              Contact Our Team
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreelancerBenefits; 