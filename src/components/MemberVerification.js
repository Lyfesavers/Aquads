import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaTimesCircle, FaCrown, FaUser, FaCalendarAlt, FaArrowLeft, FaSpinner } from 'react-icons/fa';

const MemberVerification = () => {
  const { memberId } = useParams();
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyMember = async () => {
      if (!memberId) {
        setError('Invalid member ID');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/membership/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ memberId })
        });

        const data = await response.json();

        if (response.ok) {
          setVerificationData(data);
        } else {
          setError(data.error || 'Verification failed');
        }
      } catch (err) {
        setError('Network error. Please try again.');
        console.error('Verification error:', err);
      } finally {
        setLoading(false);
      }
    };

    verifyMember();
  }, [memberId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (isValid) => {
    return isValid ? 'text-green-400' : 'text-red-400';
  };

  const getStatusIcon = (isValid) => {
    return isValid ? FaCheckCircle : FaTimesCircle;
  };

  const getStatusText = (isValid) => {
    return isValid ? 'Verified Member' : 'Invalid Membership';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20"
        >
          <FaSpinner className="text-blue-400 text-4xl animate-spin mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Verifying Membership</h2>
          <p className="text-white/70">Please wait while we verify the membership...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link 
            to="/home" 
            className="inline-flex items-center text-white/70 hover:text-white transition-colors mb-4"
          >
            <FaArrowLeft className="mr-2" />
            Back to Aquads
          </Link>
          
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-blue-600/20 rounded-xl">
              <FaCrown className="text-blue-400 text-2xl" />
            </div>
          </div>
          
          <h1 className="text-white text-2xl font-bold mb-2">Aquads Membership</h1>
          <p className="text-white/70">Partner Verification Portal</p>
        </div>

        {/* Verification Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-2xl"
        >
          {error ? (
            // Error State
            <div className="text-center">
              <FaTimesCircle className="text-red-400 text-5xl mx-auto mb-4" />
              <h2 className="text-white text-xl font-semibold mb-2">Verification Failed</h2>
              <p className="text-white/70 mb-4">{error}</p>
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-300 text-sm">
                  This membership ID is not valid or has expired. Please contact the member for a valid membership card.
                </p>
              </div>
            </div>
          ) : verificationData ? (
            // Success State
            <div>
              {/* Status Header */}
              <div className="text-center mb-6">
                {React.createElement(getStatusIcon(verificationData.valid), {
                  className: `${getStatusColor(verificationData.valid)} text-5xl mx-auto mb-4`
                })}
                <h2 className={`text-xl font-semibold mb-2 ${getStatusColor(verificationData.valid)}`}>
                  {getStatusText(verificationData.valid)}
                </h2>
                <p className="text-white/70 text-sm">
                  {verificationData.valid ? 'This member has active premium access' : 'This membership is not active'}
                </p>
              </div>

              {/* Member Details */}
              {verificationData.member && (
                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <FaUser className="text-blue-400" />
                      <span className="text-white font-medium">Member Information</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white/70">Username:</span>
                        <span className="text-white font-medium">{verificationData.member.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Member ID:</span>
                        <span className="text-white font-mono text-sm">{verificationData.member.memberId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Status:</span>
                        <span className={`font-medium ${verificationData.member.isActive ? 'text-green-400' : 'text-red-400'}`}>
                          {verificationData.member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Expires:</span>
                        <span className="text-white">{formatDate(verificationData.member.nextBillingDate)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Benefits Section */}
                  {verificationData.valid && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <h3 className="text-green-400 font-semibold mb-3 flex items-center">
                        <FaCrown className="mr-2" />
                        Premium Benefits
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-white/80">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                          Access to all partner discounts
                        </div>
                        <div className="flex items-center text-white/80">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                          Priority customer support
                        </div>
                        <div className="flex items-center text-white/80">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                          Exclusive partner offers
                        </div>
                        <div className="flex items-center text-white/80">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                          Monthly auto-renewal
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white/50 text-sm">
            Powered by <span className="text-blue-400 font-medium">Aquads</span>
          </p>
          <p className="text-white/40 text-xs mt-1">
            Secure partner verification system
          </p>
        </div>
      </div>
    </div>
  );
};

export default MemberVerification;
