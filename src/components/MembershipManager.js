import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCrown, FaCreditCard, FaTimes, FaCheck, FaExclamationTriangle, FaCalendarAlt, FaIdCard } from 'react-icons/fa';
import MembershipCard from './MembershipCard';

const MembershipManager = ({ currentUser, onPointsUpdate, userPoints = 0, membershipInfo, socket }) => {
  const [membership, setMembership] = useState(membershipInfo);
  const [loading, setLoading] = useState(!membershipInfo);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [message, setMessage] = useState('');

  // Update membership when props change (socket updates)
  useEffect(() => {
    setMembership(membershipInfo);
    if (membershipInfo) {
      setLoading(false);
    }
  }, [membershipInfo]);


  const handleSubscribe = async () => {
    setActionLoading(true);
    setMessage('');

    try {
      if (!socket) {
        setMessage('Connection error. Please refresh the page.');
        setActionLoading(false);
        return;
      }

      // Emit socket event for membership subscription
      socket.emit('subscribeToMembership', {
        userId: currentUser.userId || currentUser.id || currentUser._id
      });

      setMessage('Processing membership subscription...');
      
      // The actual response will come through socket events handled in Dashboard
      // We'll show a temporary message and let the socket update handle the real response
      setTimeout(() => {
        setActionLoading(false);
        setMessage('');
      }, 2000);
      
    } catch (error) {
      console.error('Error subscribing to membership:', error);
      setMessage('Failed to subscribe to membership');
      setTimeout(() => setMessage(''), 5000);
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your membership? You will lose access to partner discounts.')) {
      return;
    }

    setActionLoading(true);
    setMessage('');

    try {
      if (!socket) {
        setMessage('Connection error. Please refresh the page.');
        setActionLoading(false);
        return;
      }

      // Emit socket event for membership cancellation
      socket.emit('cancelMembership', {
        userId: currentUser.userId || currentUser.id || currentUser._id
      });

      setMessage('Processing membership cancellation...');
      
      // The actual response will come through socket events handled in Dashboard
      // We'll show a temporary message and let the socket update handle the real response
      setTimeout(() => {
        setActionLoading(false);
        setMessage('');
      }, 2000);
      
    } catch (error) {
      console.error('Error cancelling membership:', error);
      setMessage('Failed to cancel membership');
      setTimeout(() => setMessage(''), 5000);
      setActionLoading(false);
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
    if (!membership?.nextBillingDate) return false;
    const nextBilling = new Date(membership.nextBillingDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((nextBilling - now) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full">
            <FaCrown className="text-white text-xl sm:text-2xl" />
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Aquads Membership</h2>
            <p className="text-gray-400 text-sm sm:text-base">Premium Partner Access Program</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            message.includes('success') 
              ? 'bg-green-500/20 border border-green-500/30 text-green-300'
              : 'bg-red-500/20 border border-red-500/30 text-red-300'
          }`}
        >
          {message}
        </motion.div>
      )}

      {/* Current Points */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div>
            <div className="text-gray-400 text-sm">Current Points</div>
            <div className="text-white text-xl sm:text-2xl font-bold">{userPoints.toLocaleString()}</div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-gray-400 text-sm">Monthly Cost</div>
            <div className="text-blue-400 text-lg sm:text-xl font-bold">1,000 points</div>
          </div>
        </div>
      </div>

      {/* Membership Status */}
      {membership?.isActive ? (
        <div className="space-y-4">
          {/* Active Membership */}
          <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <FaCheck className="text-green-400 text-xl" />
              <div>
                <h3 className="text-white text-lg font-semibold">Active Membership</h3>
                <p className="text-green-300 text-sm">You have access to all partner discounts</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-gray-400 text-sm">Member ID</div>
                <div className="text-white font-mono text-sm sm:text-base break-all">{membership.memberId}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Next Billing</div>
                <div className="text-white text-sm sm:text-base">{formatDate(membership.nextBillingDate)}</div>
              </div>
            </div>

            {isExpiringSoon() && (
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <FaExclamationTriangle className="text-yellow-400" />
                  <span className="text-yellow-300 text-sm">
                    Your membership expires soon. Make sure you have enough points for auto-renewal.
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => setShowCard(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <FaIdCard />
                <span className="text-sm sm:text-base">View Membership Card</span>
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 px-4 py-2 rounded-lg transition-colors border border-red-500/30 flex items-center justify-center space-x-2"
              >
                <FaTimes />
                <span className="text-sm sm:text-base">{actionLoading ? 'Cancelling...' : 'Cancel Membership'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Inactive Membership */
        <div className="space-y-4">
          <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <FaCreditCard className="text-gray-400 text-xl" />
              <div>
                <h3 className="text-white text-lg font-semibold">No Active Membership</h3>
                <p className="text-gray-400 text-sm">Subscribe to access partner discounts</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-gray-400 text-sm mb-2">Membership Benefits:</div>
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

            <button
              onClick={handleSubscribe}
              disabled={actionLoading || userPoints < 1000}
              className={`w-full px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                userPoints >= 1000
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <FaCrown />
              <span className="text-sm sm:text-base">
                {actionLoading 
                  ? 'Subscribing...' 
                  : userPoints >= 1000 
                    ? 'Subscribe to Membership (1,000 points)' 
                    : `Need ${1000 - userPoints} more points`
                }
              </span>
            </button>

            {userPoints < 1000 && (
              <div className="mt-3 text-center">
                <p className="text-gray-400 text-sm">
                  You need {1000 - userPoints} more points to subscribe
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Membership Card Modal */}
      {showCard && membership && (
        <MembershipCard
          membership={membership}
          onClose={() => setShowCard(false)}
        />
      )}
    </div>
  );
};

export default MembershipManager;
