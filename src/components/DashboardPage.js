import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Dashboard from './Dashboard';
import NotificationBell from './NotificationBell';
import { getDisplayName } from '../utils/nameUtils';

const DashboardPage = ({ 
  ads, 
  currentUser, 
  onDeleteAd, 
  onBumpAd, 
  onEditAd, 
  onRejectBump, 
  onApproveBump,
  activeBookingId,
  setActiveBookingId,
  onLogin,
  onLogout,
  onCreateAccount
}) => {
  const navigate = useNavigate();
  const { tab } = useParams();

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center p-8 bg-gray-800/50 rounded-2xl border border-gray-700/50 backdrop-blur-sm max-w-md mx-4">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-3">Login Required</h2>
          <p className="text-gray-400 mb-6">Please log in to access your dashboard.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onLogin}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
            >
              Login
            </button>
            <button
              onClick={onCreateAccount}
              className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Create Account
            </button>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 bg-gray-800/90 backdrop-blur-md border-b border-gray-700/50 shadow-lg shadow-black/20">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/home" className="flex items-center hover:opacity-80 transition-opacity">
              <img 
                src="/Aquadsnewlogo.png" 
                alt="AQUADS" 
                className="h-7 filter drop-shadow-lg"
                style={{ filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' }}
              />
            </Link>
            <div className="hidden sm:flex items-center text-sm">
              <svg className="w-3.5 h-3.5 mx-1.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-300 font-medium">Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell currentUser={currentUser} />
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-700/30 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-300">{getDisplayName(currentUser)}</span>
            </div>
            <button
              onClick={handleClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-700/40 hover:bg-gray-600/50 rounded-lg transition-all duration-150 border border-gray-600/30 hover:border-gray-500/40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Dashboard content - full page */}
      <Dashboard
        ads={ads}
        currentUser={currentUser}
        onClose={handleClose}
        onDeleteAd={onDeleteAd}
        onBumpAd={onBumpAd}
        onEditAd={onEditAd}
        onRejectBump={onRejectBump}
        onApproveBump={onApproveBump}
        initialBookingId={activeBookingId}
        initialActiveTab={tab || 'ads'}
        isFullPage={true}
      />
    </div>
  );
};

export default DashboardPage;
