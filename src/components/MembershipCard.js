import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCopy, FaCheck, FaQrcode, FaCrown, FaCalendarAlt, FaIdCard } from 'react-icons/fa';
import QRCode from 'qrcode';

const MembershipCard = ({ membership, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState('');

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(membership.memberId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const generateQRCode = async () => {
    try {
      // Create a clean, user-friendly message for the QR code
      const qrMessage = `👑 AQUADS MEMBER\n\n${membership.memberId}\n\nActive Member\nPremium Partner Access\n\nScan verified at: ${new Date().toLocaleDateString()}`;
      
      const dataURL = await QRCode.toDataURL(qrMessage, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataURL(dataURL);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  useEffect(() => {
    if (membership?.memberId) {
      generateQRCode();
    }
  }, [membership?.memberId]);

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gradient-to-br from-blue-900/90 to-purple-900/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 max-w-md w-full mx-4 border border-blue-500/30 my-8"
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
        <div className="relative mb-4 sm:mb-6">
          {/* Card Shadow */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl transform rotate-1"></div>
          
          {/* Main Card */}
          <div className="relative bg-gradient-to-br from-gray-900/90 via-black/80 to-gray-800/90 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl overflow-hidden">
            {/* Glass Effect Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 rounded-2xl"></div>
            
            {/* Shine Effect */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-4 right-4 w-20 h-20 border-2 border-white/30 rounded-full"></div>
              <div className="absolute bottom-4 left-4 w-16 h-16 border-2 border-white/30 rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/20 rounded-full"></div>
            </div>
          
          {/* Card Content */}
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 rounded-lg border border-yellow-400/30">
                  <FaCrown className="text-yellow-400 text-xl" />
                </div>
                <div>
                  <span className="text-white text-lg font-bold">Premium Member</span>
                  <div className="text-white/60 text-xs">Aquads Membership</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 border border-white/20"
                  title="Copy Member ID"
                >
                  {copied ? <FaCheck className="text-green-400" /> : <FaCopy className="text-white/80" />}
                </button>
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 border border-white/20"
                  title="Show QR Code"
                >
                  <FaQrcode className="text-white/80" />
                </button>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-white/60 text-xs mb-1">Member ID</div>
                <div className="text-white text-xl sm:text-2xl font-mono font-bold tracking-wider break-all">
                  {membership.memberId}
                </div>
                <div className="flex items-center mt-2">
                  <div className={`w-2 h-2 rounded-full mr-2 ${membership.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-white/70 text-sm">
                    {membership.isActive ? 'Active Membership' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-2 text-white/80">
                  <FaCalendarAlt className="text-sm" />
                  <span className="text-xs sm:text-sm">
                    Expires: {formatDate(membership.nextBillingDate)}
                  </span>
                </div>
                {isExpiringSoon() && (
                  <div className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-xs self-start sm:self-auto border border-yellow-500/30">
                    Expires Soon
                  </div>
                )}
              </div>
            </div>
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
                {qrCodeDataURL ? (
                  <img 
                    src={qrCodeDataURL} 
                    alt="Membership QR Code" 
                    className="w-24 h-24 sm:w-32 sm:h-32"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-200 rounded flex items-center justify-center">
                    <div className="text-gray-500 text-xs">Generating...</div>
                  </div>
                )}
              </div>
              <div className="text-white/60 text-xs mt-2">
                Partners will see your membership status when they scan this code
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
