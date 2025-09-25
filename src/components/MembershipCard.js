import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCopy, FaCheck, FaQrcode, FaCrown, FaCalendarAlt, FaIdCard } from 'react-icons/fa';

const MembershipCard = ({ membership, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(membership.memberId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isExpiringSoon = () => {
    if (!membership.nextBillingDate) return false;
    const nextBilling = new Date(membership.nextBillingDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((nextBilling - now) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gradient-to-br from-blue-900/90 to-purple-900/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 max-w-md w-full mx-4 border border-blue-500/30"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <FaCrown className="text-blue-400 text-lg sm:text-xl" />
            </div>
            <div>
              <h2 className="text-white text-lg sm:text-xl font-bold">Aquads Membership</h2>
              <p className="text-blue-300 text-xs sm:text-sm">Premium Partner Access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* Membership Card */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-20 h-20 border-2 border-white/20 rounded-full"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 border-2 border-white/20 rounded-full"></div>
          </div>
          
          {/* Card Content */}
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FaIdCard className="text-white text-lg" />
                <span className="text-white/80 text-sm">Member ID</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="p-1 text-white/60 hover:text-white transition-colors"
                  title="Copy Member ID"
                >
                  {copied ? <FaCheck className="text-green-400" /> : <FaCopy />}
                </button>
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="p-1 text-white/60 hover:text-white transition-colors"
                  title="Show QR Code"
                >
                  <FaQrcode />
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="text-white text-lg sm:text-2xl font-mono font-bold tracking-wider break-all">
                {membership.memberId}
              </div>
              <div className="text-white/70 text-xs sm:text-sm mt-1">
                {membership.isActive ? 'Active Membership' : 'Inactive'}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div className="flex items-center space-x-2 text-white/80">
                <FaCalendarAlt className="text-sm" />
                <span className="text-xs sm:text-sm">
                  Expires: {formatDate(membership.nextBillingDate)}
                </span>
              </div>
              {isExpiringSoon() && (
                <div className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs self-start sm:self-auto">
                  Expires Soon
                </div>
              )}
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        {showQR && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-800/50 rounded-lg p-3 sm:p-4 mb-4"
          >
            <div className="text-center">
              <div className="text-white/80 text-xs sm:text-sm mb-2">Scan for Partner Verification</div>
              <div className="bg-white p-3 sm:p-4 rounded-lg inline-block">
                {/* Simple QR Code representation - in production, use a proper QR library */}
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-black grid grid-cols-8 gap-1">
                  {Array.from({ length: 64 }, (_, i) => (
                    <div
                      key={i}
                      className={`${Math.random() > 0.5 ? 'bg-white' : 'bg-black'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Membership Benefits */}
        <div className="space-y-3">
          <h3 className="text-white font-semibold">Membership Benefits:</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-3 text-white/80">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-sm">Access to all partner discounts</span>
            </div>
            <div className="flex items-center space-x-3 text-white/80">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-sm">Priority customer support</span>
            </div>
            <div className="flex items-center space-x-3 text-white/80">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-sm">Exclusive partner offers</span>
            </div>
            <div className="flex items-center space-x-3 text-white/80">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-sm">Monthly auto-renewal</span>
            </div>
          </div>
        </div>

        {/* Status Warning */}
        {isExpiringSoon() && (
          <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <div className="text-yellow-300 text-sm">
              ⚠️ Your membership expires soon. Make sure you have enough points for auto-renewal.
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MembershipCard;
