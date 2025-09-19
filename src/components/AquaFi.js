import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BannerDisplay from './BannerDisplay';
import SavingsPools from './SavingsPools';
import { FaCoins, FaChartLine, FaShieldAlt } from 'react-icons/fa';
import NotificationBell from './NotificationBell';
import LoginModal from './LoginModal';
import CreateAccountModal from './CreateAccountModal';
import Dashboard from './Dashboard';
import CreateServiceModal from './CreateServiceModal';
import CreateBannerModal from './CreateBannerModal';
import ProfileModal from './ProfileModal';
import './AquaFi.css';

const AquaFi = ({ currentUser, showNotification, onLogin, onLogout, onCreateAccount, openMintFunnelPlatform }) => {
  const navigate = useNavigate();
  const [totalTVL, setTotalTVL] = useState(0);
  const [userBalance, setUserBalance] = useState(0);

  // Header state variables
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Header event handlers
  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  const handleCreateAccountClick = () => {
    setShowCreateAccountModal(true);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-dropdown')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  useEffect(() => {
    // Add class to body for page-specific styling
    document.body.classList.add('aquafi-page');
    
    // Cleanup
    return () => {
      document.body.classList.remove('aquafi-page');
    };
  }, []);

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-gray-900 to-black text-white">
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
              <Link to="/" className="flex items-center">
                <img 
                  src="/Aquadsnewlogo.png" 
                  alt="AQUADS" 
                  className="w-auto filter drop-shadow-lg"
                  style={{height: '2rem', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))'}}
                />
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-300 hover:text-white p-3 rounded-md"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Main Navigation - Smaller buttons */}
              <Link
                to="/"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Home
              </Link>
              <Link
                to="/games"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Games
              </Link>
              <button
                onClick={openMintFunnelPlatform}
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Paid Ads
              </button>
              <Link
                to="/learn"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Learn
              </Link>
              <Link
                to="/freelancer-benefits"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
              >
                Benefits
              </Link>

              {currentUser ? (
                <>
                  <NotificationBell currentUser={currentUser} />
                  
                  {/* User Dropdown */}
                  <div className="relative user-dropdown">
                    <button 
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                    >
                      <span className="mr-1">{currentUser.username}</span>
                      <svg className={`w-4 h-4 ml-1 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Dropdown Menu */}
                    {showUserDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700/50 z-50">
                        <div className="py-2">
                          <button
                            onClick={() => {
                              setShowDashboard(true);
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-600/50 transition-colors"
                          >
                            📊 Dashboard
                          </button>
                          <button
                            onClick={() => {
                              setShowCreateModal(true);
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-600/50 transition-colors"
                          >
                            ➕ List Service
                          </button>
                          <button
                            onClick={() => {
                              setShowBannerModal(true);
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-600/50 transition-colors"
                          >
                            🎨 Create Banner Ad
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileModal(true);
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-600/50 transition-colors"
                          >
                            ⚙️ Edit Profile
                          </button>
                          <hr className="my-2 border-gray-700" />
          <button 
                            onClick={() => {
                              onLogout();
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-600/50 transition-colors"
                          >
                            🚪 Logout
          </button>
        </div>
      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={handleLoginClick}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    Login
                  </button>
                  <button
                    onClick={handleCreateAccountClick}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.2 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden py-2 z-[200000] relative bg-black`}>
            <div className="flex flex-col space-y-2">
              <Link
                to="/"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
              >
                Home
              </Link>
              <Link
                to="/games"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
              >
                GameHub
              </Link>
              <button
                onClick={openMintFunnelPlatform}
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
              >
                Paid Ads
              </button>
              <Link
                to="/learn"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
              >
                Learn
              </Link>
              <Link
                to="/freelancer-benefits"
                className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-center text-yellow-400"
              >
                Benefits
              </Link>
              {currentUser ? (
                <>
                  <div className="flex justify-center">
                    <NotificationBell currentUser={currentUser} />
                  </div>
                  <span className="text-blue-300 text-center">Welcome, {currentUser.username}!</span>
                  <button
                    onClick={() => {
                      setShowDashboard(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    📊 Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    ➕ List Service
                  </button>
                  <button
                    onClick={() => {
                      setShowBannerModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    🎨 Create Banner Ad
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    ⚙️ Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    🚪 Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      handleLoginClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      handleCreateAccountClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

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
              AquaFi
            </h1>
          </div>
          <p className="text-xl text-gray-300 mb-6 max-w-3xl mx-auto">
            Let your money work for you - earn passive income on your crypto through professional yield optimization
          </p>
          
          {/* Key Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <FaShieldAlt className="w-8 h-8 text-blue-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Stable & Secure</h3>
              <p className="text-gray-400 text-sm">Battle-tested DeFi protocols with institutional-grade security and audited smart contracts</p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <FaChartLine className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Pays Every 5 Minutes</h3>
              <p className="text-gray-400 text-sm">Continuous yield accrual with earnings updated every block - watch your money grow in real-time</p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <FaCoins className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Withdraw Anytime</h3>
              <p className="text-gray-400 text-sm">Complete liquidity control - access your funds instantly without lock-up periods or penalties</p>
            </div>
          </div>
        </div>


        {/* Direct to Savings Pools - No Tabs Needed */}
        <SavingsPools 
          currentUser={currentUser} 
          showNotification={showNotification}
          onTVLUpdate={setTotalTVL}
          onBalanceUpdate={setUserBalance}
        />
      </div>

      {/* Modals */}
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLogin={onLogin}
        />
      )}

      {showCreateAccountModal && (
        <CreateAccountModal
          isOpen={showCreateAccountModal}
          onClose={() => setShowCreateAccountModal(false)}
          onCreateAccount={onCreateAccount}
        />
      )}

      {showDashboard && (
        <Dashboard
          ads={[]} // Pass empty array or fetch ads if needed
          currentUser={currentUser}
          onClose={() => setShowDashboard(false)}
          onDeleteAd={() => {}} // Add handler if needed
          onBumpAd={() => {}} // Add handler if needed
          onEditAd={() => {}} // Add handler if needed
          onRejectBump={() => {}} // Add handler if needed
          onApproveBump={() => {}} // Add handler if needed
        />
      )}

      {showCreateModal && (
        <CreateServiceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          currentUser={currentUser}
          onServiceCreated={() => {
            setShowCreateModal(false);
            showNotification('Service created successfully!', 'success');
          }}
        />
      )}

      {showBannerModal && (
        <CreateBannerModal
          isOpen={showBannerModal}
          onClose={() => setShowBannerModal(false)}
          currentUser={currentUser}
          onBannerSubmit={() => {
            setShowBannerModal(false);
            showNotification('Banner created successfully!', 'success');
          }}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          currentUser={currentUser}
          onUpdate={() => {
            showNotification('Profile updated successfully!', 'success');
          }}
        />
      )}
    </div>
  );
};

export default AquaFi; 