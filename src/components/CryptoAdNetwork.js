import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaExternalLinkAlt, FaRocket, FaChartLine, FaDollarSign } from 'react-icons/fa';

const CryptoAdNetwork = () => {
  useEffect(() => {
    // Add class to body for page-specific styling if needed
    document.body.classList.add('crypto-ad-network-page');
    
    // Cleanup
    return () => {
      document.body.classList.remove('crypto-ad-network-page');
    };
  }, []);

  return (
    <div className="h-screen overflow-y-auto text-white">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
        <div className="tech-lines"></div>
        <div className="tech-dots"></div>
      </div>

      {/* Fixed Navigation */}
      <nav className="sticky top-0 bg-gray-800/80 backdrop-blur-sm shadow-lg shadow-blue-500/20 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 glow-text">
                AQUADS
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center bg-blue-500/80 hover:bg-blue-600/80 px-4 py-2 rounded shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
              >
                <FaArrowLeft className="mr-2" />
                Back to Main
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 backdrop-blur-sm border-b border-gray-700/50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Crypto Ad Network
            </h1>
            <p className="text-xl text-gray-300 mb-6 max-w-3xl mx-auto">
              Premium advertising solutions for crypto projects. Connect with your target audience through our partner network.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center bg-green-500/20 px-4 py-2 rounded-full">
                <FaRocket className="mr-2 text-green-400" />
                <span>High-Converting Ads</span>
              </div>
              <div className="flex items-center bg-blue-500/20 px-4 py-2 rounded-full">
                <FaChartLine className="mr-2 text-blue-400" />
                <span>Real-Time Analytics</span>
              </div>
              <div className="flex items-center bg-purple-500/20 px-4 py-2 rounded-full">
                <FaDollarSign className="mr-2 text-purple-400" />
                <span>Premium Placements</span>
              </div>
            </div>
          </div>
        </div>

        {/* Embedded Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
            {/* Info Bar */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">MintFunnel Crypto Ad Network</h3>
                  <p className="text-gray-300 text-sm">Powered by our advertising partners</p>
                </div>
                <a
                  href="https://mintfunnel.co/crypto-ad-network/?ref=Aquads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
                >
                  <FaExternalLinkAlt className="mr-2" />
                  Open in New Tab
                </a>
              </div>
            </div>

            {/* Iframe Container */}
            <div className="relative" style={{ minHeight: '800px' }}>
              <iframe
                src="https://mintfunnel.co/crypto-ad-network/?ref=Aquads"
                className="w-full h-full border-0"
                style={{ minHeight: '800px' }}
                title="Crypto Ad Network"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                loading="lazy"
              />
            </div>
          </div>

          {/* Additional Info Section */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center mb-4">
                <FaRocket className="text-2xl text-blue-400 mr-3" />
                <h3 className="text-lg font-semibold">Premium Reach</h3>
              </div>
              <p className="text-gray-300 text-sm">
                Access to high-quality advertising placements across crypto-focused websites and platforms.
              </p>
            </div>
            
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center mb-4">
                <FaChartLine className="text-2xl text-green-400 mr-3" />
                <h3 className="text-lg font-semibold">Analytics & Tracking</h3>
              </div>
              <p className="text-gray-300 text-sm">
                Comprehensive reporting and analytics to track your campaign performance and ROI.
              </p>
            </div>
            
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center mb-4">
                <FaDollarSign className="text-2xl text-purple-400 mr-3" />
                <h3 className="text-lg font-semibold">Competitive Rates</h3>
              </div>
              <p className="text-gray-300 text-sm">
                Cost-effective advertising solutions tailored for crypto projects of all sizes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoAdNetwork; 