import React from 'react';
import { FaInfoCircle, FaTimes, FaExternalLinkAlt, FaExclamationTriangle, FaRedo } from 'react-icons/fa';

const MintFunnelInstructionModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[999999] p-4" style={{ zIndex: 999999 }}>
      <div className="bg-gray-800 rounded-lg max-w-md w-full relative border border-blue-500/30 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <FaTimes size={20} />
        </button>

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <FaInfoCircle className="text-blue-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">
              Welcome to Aquads Crypto Ads Network!
            </h2>
          </div>
          
          <p className="text-gray-300 mb-4">
            First time here? Here's what you need to know to get started with crypto advertising.
          </p>
        </div>

        {/* Instructions */}
        <div className="px-6 pb-6">
          <div className="mb-4">
            <h3 className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
              <FaExternalLinkAlt size={14} />
              Quick Setup Guide:
            </h3>
            <ol className="list-decimal list-inside text-sm text-gray-300 space-y-2">
              <li>When you sign up on MintFunnel below, you'll see two role options</li>
              <li>
                <span className="font-medium text-white">Important:</span> Select 
                <span className="mx-1 px-2 py-0.5 bg-green-600 text-white rounded text-xs font-mono">
                  Advertiser
                </span> 
                as your role
              </li>
              <li>Complete your MintFunnel account registration</li>
              <li>You will get $50 ad credit to start</li>
              <li>Start creating and running your crypto ad campaigns!</li>
            </ol>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 mb-4">
            <p className="text-yellow-200 text-sm">
              <strong>Why "Advertiser"?</strong> This role gives you access to create and manage ad campaigns on the MintFunnel platform.
            </p>
          </div>

          {/* Troubleshooting section */}
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <FaExclamationTriangle className="text-red-400 mt-0.5 flex-shrink-0" size={14} />
              <div>
                <h4 className="font-semibold text-red-300 text-sm mb-1">Troubleshooting Tips:</h4>
                <ul className="text-xs text-red-200 space-y-1">
                  <li>• If you see a "419" or "Page Expired" error, click the <FaRedo className="inline" size={10} /> Refresh button</li>
                  <li>• If issues persist, try opening MintFunnel in a new tab</li>
                  <li>• Clear your browser cache if problems continue</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Got it, let's go!
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-3 text-center">
            This popup won't show again after you close it.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MintFunnelInstructionModal; 