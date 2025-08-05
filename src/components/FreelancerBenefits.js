import React from 'react';
import { FaArrowLeft, FaRocket, FaUsers, FaChartLine, FaGlobe, FaShieldAlt, FaCheckCircle, FaArrowRight, FaBullhorn, FaHandshake, FaTrophy, FaCreditCard, FaExchangeAlt, FaUsersCog, FaVideo, FaMicrophone, FaBriefcase, FaMoneyBillWave, FaClock, FaStar, FaGlobeAmericas, FaLock, FaHeadset, FaTools, FaNetworkWired, FaCertificate, FaGift } from 'react-icons/fa';
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
                to="/marketplace"
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
              Set your own rates and earn what you're worth. Our platform supports both crypto and fiat payments with secure escrow protection.
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
              Get paid securely with our escrow system. Funds are held safely until project completion, protecting both you and your clients.
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
        </div>
      </div>

      {/* Success Stories Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Success Stories
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Hear from freelancers who have transformed their careers on Aquads.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaUsers className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Sarah M.</h3>
              <p className="text-indigo-400 text-sm">Smart Contract Developer</p>
            </div>
            <p className="text-gray-300 text-center">
              "Aquads helped me connect with amazing Web3 projects. I've increased my income by 300% in just 6 months!"
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaChartLine className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Mike R.</h3>
              <p className="text-green-400 text-sm">Marketing Specialist</p>
            </div>
            <p className="text-gray-300 text-center">
              "The global client base is incredible. I've worked with projects from 15 different countries this year alone."
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaTrophy className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Alex K.</h3>
              <p className="text-purple-400 text-sm">UI/UX Designer</p>
            </div>
            <p className="text-gray-300 text-center">
              "The reputation system is game-changing. My portfolio now speaks for itself and clients come to me!"
            </p>
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
            <p className="text-gray-400 text-sm">Escrow protection and multiple payment options</p>
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
              to="/marketplace"
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