import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import NotificationBell from './NotificationBell';
import MintFunnelInstructionModal from './MintFunnelInstructionModal';
import LoginModal from './LoginModal';
import CreateAccountModal from './CreateAccountModal';
import Dashboard from './Dashboard';
import CreateAdModal from './CreateAdModal';
import CreateBannerModal from './CreateBannerModal';
import ProfileModal from './ProfileModal';

const CryptoAdNetwork = ({ 
  currentUser, 
  setCurrentUser,
  showNotification,
  handleLogout 
}) => {
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  
  // Local modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [dashboardActiveTab, setDashboardActiveTab] = useState('ads');

  useEffect(() => {
    // Add class to body for page-specific styling if needed
    document.body.classList.add('crypto-ad-network-page');
    
    // Check if user has seen the MintFunnel instruction before
    const hasSeenMintFunnelInstruction = localStorage.getItem('hasSeenMintFunnelInstruction');
    
    // Show instruction modal for first-time visitors
    if (!hasSeenMintFunnelInstruction) {
      setShowInstructionModal(true);
    }
    
    // Cleanup
    return () => {
      document.body.classList.remove('crypto-ad-network-page');
    };
  }, []);

  // Handle clicking outside user dropdown
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

  const handleCloseInstructionModal = () => {
    setShowInstructionModal(false);
    // Mark that user has seen the instruction
    localStorage.setItem('hasSeenMintFunnelInstruction', 'true');
  };

  // Open MintFunnel platform in full-screen popup
  const openMintFunnelPlatform = () => {
    const popup = window.open(
      'https://mintfunnel.co/crypto-ad-network/?ref=Aquads',
      'mintfunnel-platform',
      'width=' + window.screen.width + ',height=' + window.screen.height + ',scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=yes,menubar=yes'
    );
    
    if (popup) {
      setShowAuthPopup(true);
      
      // Listen for popup closure
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setShowAuthPopup(false);
        }
      }, 1000);
    } else {
      showNotification('Popup blocked! Please allow popups for this site and try again.', 'error');
    }
  };

  return (
    <div className="h-screen overflow-y-auto text-white">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
        <div className="tech-lines"></div>
        <div className="tech-dots"></div>
      </div>

      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm z-[200000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <img 
                  src="/Aquadsnewlogo.png" 
                  alt="AQUADS" 
                  className="w-auto filter drop-shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200"
                  style={{height: '2rem', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))'}}
                />
              </Link>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-300 hover:text-white p-2"
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
                to="/marketplace"
                className="bg-indigo-500/80 hover:bg-indigo-600/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm"
              >
                Freelancer
              </Link>
              <Link
                to="/games"
                className="bg-indigo-500/80 hover:bg-indigo-600/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm"
              >
                Games
              </Link>
              <Link
                to="/crypto-ads"
                className="bg-gradient-to-r from-green-500/80 to-emerald-600/80 hover:from-green-600/80 hover:to-emerald-700/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-green-500/50 transition-all duration-300 backdrop-blur-sm"
              >
                Paid Ads
              </Link>
              <Link
                to="/how-to"
                className="bg-indigo-500/80 hover:bg-indigo-600/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm"
              >
                Learn
              </Link>
              <Link
                to="/project-info"
                className="bg-gradient-to-r from-purple-500/80 to-pink-600/80 hover:from-purple-600/80 hover:to-pink-700/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-purple-500/50 transition-all duration-300 backdrop-blur-sm"
              >
                Why List?
              </Link>


              {currentUser ? (
                <>
                  <NotificationBell currentUser={currentUser} />
                  
                  {/* User Dropdown */}
                  <div className="relative user-dropdown">
                    <button 
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center bg-blue-500/80 hover:bg-blue-600/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
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
                              setDashboardActiveTab('ads');
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
                            ➕ List Project
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
                              handleLogout();
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
                    onClick={() => setShowLoginModal(true)}
                    className="bg-blue-500/80 hover:bg-blue-600/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setShowCreateAccountModal(true)}
                    className="bg-green-500/80 hover:bg-green-600/80 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-green-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden py-2 z-[200000] relative`}>
            <div className="flex flex-col space-y-2">
              <Link
                to="/marketplace"
                className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Freelancer Hub
              </Link>
              <Link
                to="/games"
                className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                GameHub
              </Link>
              <Link
                to="/crypto-ads"
                className="bg-gradient-to-r from-green-500/80 to-emerald-600/80 hover:from-green-600/80 hover:to-emerald-700/80 px-4 py-2 rounded shadow-lg hover:shadow-green-500/50 transition-all duration-300 backdrop-blur-sm text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Paid Ads
              </Link>
              <Link
                to="/how-to"
                className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Learn
              </Link>
              <Link
                to="/project-info"
                className="bg-gradient-to-r from-purple-500/80 to-pink-600/80 hover:from-purple-600/80 hover:to-pink-700/80 px-4 py-2 rounded shadow-lg hover:shadow-purple-500/50 transition-all duration-300 backdrop-blur-sm text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Why List?
              </Link>

              {currentUser ? (
                <>
                  <div className="flex justify-center">
                    <NotificationBell currentUser={currentUser} />
                  </div>
                  <span className="text-blue-300 text-center">Welcome, {currentUser.username}!</span>
                  <button
                    onClick={() => {
                      setDashboardActiveTab('ads');
                      setShowDashboard(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-blue-500/80 hover:bg-blue-600/80 px-4 py-2 rounded shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-purple-500/80 hover:bg-purple-600/80 px-4 py-2 rounded shadow-lg hover:shadow-purple-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-purple-500/80 hover:bg-purple-600/80 px-4 py-2 rounded shadow-lg hover:shadow-purple-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    List Project
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-red-500/80 hover:bg-red-600/80 px-4 py-2 rounded shadow-lg hover:shadow-red-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShowLoginModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-blue-500/80 hover:bg-blue-600/80 px-4 py-2 rounded shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateAccountModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-green-500/80 hover:bg-green-600/80 px-4 py-2 rounded shadow-lg hover:shadow-green-500/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* MintFunnel Platform Launch Section */}
      <div className="flex flex-col items-center justify-center h-full bg-gray-900/50 backdrop-blur-sm">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-4 text-center border border-gray-700">
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="text-xl font-bold text-white mb-4">Crypto Ad Network</h3>
          <p className="text-gray-300 mb-6">
            Access the complete MintFunnel crypto advertising platform with full functionality.
          </p>
          <div className="space-y-3">
            <button
              onClick={openMintFunnelPlatform}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              {showAuthPopup ? '🔄 Opening Platform...' : '🚀 Launch MintFunnel Platform'}
            </button>
            <button
              onClick={() => window.open('https://mintfunnel.co/crypto-ad-network/?ref=Aquads', '_blank')}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              🌐 Open in New Tab
            </button>
          </div>
        </div>
      </div>

      {/* Instruction Modal for first-time visitors */}
      {showInstructionModal && (
        <MintFunnelInstructionModal
          onClose={handleCloseInstructionModal}
        />
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onLogin={setCurrentUser}
          onClose={() => setShowLoginModal(false)}
          showNotification={showNotification}
        />
      )}

      {/* Create Account Modal */}
      {showCreateAccountModal && (
        <CreateAccountModal
          onRegister={setCurrentUser}
          onClose={() => setShowCreateAccountModal(false)}
          showNotification={showNotification}
        />
      )}

              {/* Dashboard Modal */}
        {showDashboard && (
          <Dashboard
            ads={[]} // Empty ads array since we're not managing ads in this context
            currentUser={currentUser}
            onClose={() => setShowDashboard(false)}
            onDeleteAd={() => {}} // No-op function
            onBumpAd={() => {}} // No-op function
            onEditAd={() => {}} // No-op function
            onRejectBump={() => {}} // No-op function
            onApproveBump={() => {}} // No-op function
            initialBookingId={null}
            initialActiveTab={dashboardActiveTab}
          />
        )}

      {/* Create Ad Modal */}
      {showCreateModal && (
        <CreateAdModal
          onCreateAd={() => {}}
          onClose={() => setShowCreateModal(false)}
          currentUser={currentUser}
          showNotification={showNotification}
        />
      )}

      {/* Create Banner Modal */}
      {showBannerModal && (
        <CreateBannerModal
          onCreateBanner={() => {}}
          onClose={() => setShowBannerModal(false)}
          currentUser={currentUser}
          showNotification={showNotification}
        />
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <ProfileModal
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          onClose={() => setShowProfileModal(false)}
          showNotification={showNotification}
        />
      )}
    </div>
  );
};

export default CryptoAdNetwork; 