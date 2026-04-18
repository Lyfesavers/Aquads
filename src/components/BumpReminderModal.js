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

  const handleLearnMore = () => {
    onBumpNow();
    onClose();
  };

  const handleLater = () => {
    onClose();
  };

  return (
    <Modal onClose={onClose} fullScreen={true}>
      <div className="text-white max-w-2xl mx-auto">
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
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Boost Your Visibility!
          </h2>
          <p className="text-base md:text-lg text-gray-300 px-2">
            <span className="text-blue-400 font-semibold break-words">{userAd.title}</span> is not on the main bump row yet. Reach <span className="text-green-400 font-semibold">100 bullish votes</span> (organic and vote boosts) to bump automatically — no payment.
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
              <div className="text-amber-400 text-sm font-medium whitespace-nowrap">Under 100 votes</div>
              <div className="text-gray-500 text-xs whitespace-nowrap">Earn bump free</div>
            </div>
          </div>
        </div>

        {/* Benefits section */}
        <div className="mb-6">
          <h4 className="text-white font-semibold mb-3 flex items-center text-sm sm:text-base">
            <FaFire className="text-orange-500 mr-2 flex-shrink-0" />
            Why votes matter
          </h4>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center text-xs sm:text-sm text-gray-300">
              <FaArrowUp className="text-green-500 mr-2 sm:mr-3 text-xs flex-shrink-0" />
              <span>100+ bullish votes = max size and main bump row</span>
            </div>
            <div className="flex items-center text-xs sm:text-sm text-gray-300">
              <FaArrowUp className="text-green-500 mr-2 sm:mr-3 text-xs flex-shrink-0" />
              <span>Share your listing so supporters can vote</span>
            </div>
            <div className="flex items-center text-xs sm:text-sm text-gray-300">
              <FaArrowUp className="text-green-500 mr-2 sm:mr-3 text-xs flex-shrink-0" />
              <span>Vote boosts count toward the same threshold</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <button
            onClick={handleLearnMore}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/30"
          >
            <div className="flex items-center justify-center">
              <FaBullhorn className="mr-2" />
              Got it
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
          No paid bump — visibility follows community bullish sentiment.
        </p>
      </div>
    </Modal>
  );
};

export default BumpReminderModal; 