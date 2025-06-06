import React from 'react';
import Modal from './Modal';
import { FaBullhorn, FaArrowUp, FaFire } from 'react-icons/fa';

const BumpReminderModal = ({ 
  isOpen, 
  onClose, 
  onBumpNow, 
  userAd 
}) => {
  if (!isOpen || !userAd) return null;

  const handleBumpNow = () => {
    onBumpNow(userAd.id);
    onClose();
  };

  const handleLater = () => {
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="bg-gray-900 rounded-lg p-4 sm:p-6 lg:p-8 max-w-2xl w-full mx-4 sm:mx-6 md:mx-8 border-2 border-purple-500 shadow-2xl">
        {/* Header with animated icon */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="bg-purple-500 p-3 sm:p-4 rounded-full animate-pulse">
                <FaBullhorn className="text-white text-2xl sm:text-3xl" />
              </div>
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center animate-bounce">
                !
              </div>
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">
            Boost Your Visibility!
          </h2>
          <p className="text-sm sm:text-base text-gray-300 px-2">
            Your bubble ad "<span className="text-blue-400 font-semibold break-words">{userAd.title}</span>" needs a bump to stay at the top!
          </p>
        </div>

        {/* Ad preview */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center space-x-3 sm:space-x-4">
            {userAd.logo ? (
              <img 
                src={userAd.logo} 
                alt={userAd.title}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                {userAd.title.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold truncate">{userAd.title}</h3>
              <p className="text-gray-400 text-sm">
                {userAd.blockchain ? userAd.blockchain.charAt(0).toUpperCase() + userAd.blockchain.slice(1) : 'Ethereum'} Project
              </p>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="text-red-400 text-sm font-medium whitespace-nowrap">Not Bumped</div>
              <div className="text-gray-500 text-xs whitespace-nowrap">Lower visibility</div>
            </div>
          </div>
        </div>

        {/* Benefits section */}
        <div className="mb-6">
          <h4 className="text-white font-semibold mb-3 flex items-center text-sm sm:text-base">
            <FaFire className="text-orange-500 mr-2 flex-shrink-0" />
            Why Bump Your Bubble?
          </h4>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center text-xs sm:text-sm text-gray-300">
              <FaArrowUp className="text-green-500 mr-2 sm:mr-3 text-xs flex-shrink-0" />
              <span>Larger size and maximum visibility</span>
            </div>
            <div className="flex items-center text-xs sm:text-sm text-gray-300">
              <FaArrowUp className="text-green-500 mr-2 sm:mr-3 text-xs flex-shrink-0" />
              <span>Stay at the top of the bubble display</span>
            </div>
            <div className="flex items-center text-xs sm:text-sm text-gray-300">
              <FaArrowUp className="text-green-500 mr-2 sm:mr-3 text-xs flex-shrink-0" />
              <span>More clicks and user engagement</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <button
            onClick={handleBumpNow}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/30"
          >
            <div className="flex items-center justify-center">
              <FaBullhorn className="mr-2" />
              Bump Now
            </div>
          </button>
          <button
            onClick={handleLater}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300"
          >
            Maybe Later
          </button>
        </div>

        {/* Small disclaimer */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Bumping keeps your project visible and competitive in the marketplace
        </p>
      </div>
    </Modal>
  );
};

export default BumpReminderModal; 