import React, { useState } from 'react';
import { FaRocket, FaUsers, FaChartLine, FaGlobe, FaShieldAlt, FaCog, FaCheckCircle, FaArrowRight, FaBullhorn, FaGamepad, FaHandshake, FaTrophy, FaArrowLeft, FaCreditCard, FaExchangeAlt, FaUsersCog, FaVideo, FaMicrophone } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import CreateAdModal from './CreateAdModal';

const ProjectInfo = ({ currentUser }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateAd = async (adData) => {
    try {
      // This will be handled by the CreateAdModal component
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating ad:', error);
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
            </ul>
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
    </div>
  );
};

export default ProjectInfo; 