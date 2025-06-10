import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BannerDisplay from './BannerDisplay';
import SavingsPools from './SavingsPools';
import FlashLoans from './FlashLoans';
import { FaArrowLeft, FaCoins, FaChartLine, FaShieldAlt, FaBolt, FaPiggyBank } from 'react-icons/fa';
import './AquaFi.css';

const AquaFi = ({ currentUser, showNotification }) => {
  const navigate = useNavigate();
  const [totalTVL, setTotalTVL] = useState(0);
  const [userBalance, setUserBalance] = useState(0);
  const [activeTab, setActiveTab] = useState('savings');

  useEffect(() => {
    // Add class to body for page-specific styling
    document.body.classList.add('aquafi-page');
    
    // Cleanup
    return () => {
      document.body.classList.remove('aquafi-page');
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
        <div className="tech-lines"></div>
        <div className="tech-dots"></div>
      </div>

      {/* Header with back button */}
      <div className="relative z-10 pt-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <button 
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 text-white px-4 py-2 rounded-lg transition-all duration-300 border border-gray-600/30 hover:border-blue-500/50"
          >
            <FaArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>

      {/* Banner Display */}
      <div className="relative z-10">
        <BannerDisplay />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <FaCoins className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              AquaFi - STILL UNDER CONSTRUCTION
            </h1>
          </div>
          <p className="text-xl text-gray-300 mb-6 max-w-3xl mx-auto">
            Earn yield on your crypto assets through our bicentralized savings pools powered by industry-leading DeFi protocols
          </p>
          
          {/* Key Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <FaShieldAlt className="w-8 h-8 text-blue-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Secure Protocols</h3>
              <p className="text-gray-400 text-sm">Powered by battle-tested protocols: Aave, Compound, and Yearn Finance</p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <FaChartLine className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Competitive Yields</h3>
              <p className="text-gray-400 text-sm">Earn attractive APY on your holdings with auto-compounding features</p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <FaCoins className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Multi-Chain Support</h3>
              <p className="text-gray-400 text-sm">Access savings pools across Ethereum, Polygon, and other major chains</p>
            </div>
          </div>
        </div>

        {/* BEX Callout */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-6 mb-8">
          <h3 className="text-xl font-bold text-yellow-400 mb-2">🚀 World's First BEX (Bicentralized Exchange) DeFi Hub</h3>
          <p className="text-gray-200">
            Experience the perfect blend of centralized convenience and decentralized security. Access savings pools and flash loans - all in one platform.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-2 border border-gray-700/50">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('savings')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'savings'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <FaPiggyBank className="w-4 h-4" />
                Savings Pools
              </button>
              <button
                onClick={() => setActiveTab('flash-loans')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'flash-loans'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
                             >
                 <FaBolt className="w-4 h-4" />
                 Flash Loans
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'savings' ? (
          <SavingsPools 
            currentUser={currentUser} 
            showNotification={showNotification}
            onTVLUpdate={setTotalTVL}
            onBalanceUpdate={setUserBalance}
          />
        ) : (
          <FlashLoans 
            currentUser={currentUser} 
            showNotification={showNotification}
          />
        )}
      </div>
    </div>
  );
};

export default AquaFi; 