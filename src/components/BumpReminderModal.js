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
      <div className="bg-gray-900 rounded-lg p-6 max-w-lg w-full mx-4 border-2 border-purple-500 shadow-2xl">
        {/* Header with animated icon */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="bg-purple-500 p-4 rounded-full animate-pulse">
                <FaBullhorn className="text-white text-3xl" />
              </div>
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-bounce">
                !
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Boost Your Visibility!
          </h2>
          <p className="text-gray-300">
            Your bubble ad "<span className="text-blue-400 font-semibold">{userAd.title}</span>" needs a bump to stay at the top!
          </p>
        </div>

        {/* Ad preview */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center space-x-3">
            {userAd.logo ? (
              <img 
                src={userAd.logo} 
                alt={userAd.title}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                {userAd.title.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-white font-semibold">{userAd.title}</h3>
              <p className="text-gray-400 text-sm">
                {userAd.blockchain ? userAd.blockchain.charAt(0).toUpperCase() + userAd.blockchain.slice(1) : 'Ethereum'} Project
              </p>
            </div>
            <div className="text-center">
              <div className="text-red-400 text-sm font-medium">Not Bumped</div>
              <div className="text-gray-500 text-xs">Lower visibility</div>
            </div>
          </div>
        </div>

        {/* Benefits section */}
        <div className="mb-6">
          <h4 className="text-white font-semibold mb-3 flex items-center">
            <FaFire className="text-orange-500 mr-2" />
            Why Bump Your Bubble?
          </h4>
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-300">
              <FaArrowUp className="text-green-500 mr-2 text-xs" />
              Larger size and maximum visibility
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <FaArrowUp className="text-green-500 mr-2 text-xs" />
              Stay at the top of the bubble display
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <FaArrowUp className="text-green-500 mr-2 text-xs" />
              More clicks and user engagement
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3">
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