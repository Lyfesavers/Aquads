import React, { useState } from 'react';
import { FaSearch, FaCheckCircle, FaTimesCircle, FaUser, FaArrowLeft } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { verifyUserStatus } from '../services/api';

const VerifyUser = () => {
  const [username, setUsername] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');
    setVerificationResult(null);

    try {
      const result = await verifyUserStatus(username.trim());
      setVerificationResult(result);
    } catch (err) {
      setError('Failed to verify user. Please try again.');
      console.error('Verification error:', err);
    } finally {
      setLoading(false);
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
      <nav className="sticky top-0 bg-gray-800/80 backdrop-blur-sm shadow-lg shadow-blue-500/20 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 glow-text">
                AQUADS
              </Link>
            </div>
            <Link 
              to="/"
              className="flex items-center px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Back to Main
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Verify Aquads Users
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Check if a user is a verified member of Aquads.xyz. 
            Enter their username below to see their verification status and VIP level.
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/30 rounded-xl shadow-lg p-8 mb-8">
          <form onSubmit={handleSearch} className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username to verify..."
                className="w-full px-4 py-3 pr-12 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-gray-400"
                disabled={loading}
              />
              <button
                type="submit"
                onClick={handleSearch}
                disabled={loading || !username.trim()}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white p-2 rounded-md transition-colors z-10"
              >
                {loading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <FaSearch className="h-4 w-4" />
                )}
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
            )}
          </form>
        </div>

                {/* Verification Result */}
        {verificationResult && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/30 rounded-xl shadow-lg p-8">
            <div className="text-center">
              {verificationResult.isVerified ? (
                <div className="space-y-6">
                  {/* Verified Badge */}
                  <div className="flex justify-center">
                    <div className="bg-green-900/30 border border-green-500/50 p-4 rounded-full">
                      <FaCheckCircle className="h-12 w-12 text-green-400" />
                    </div>
                  </div>

                  {/* User Info */}
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      ✓ Verified User
                    </h2>
                    <p className="text-lg text-green-400 font-semibold mb-4">
                      @{verificationResult.username} is a verified {verificationResult.role} of Aquads.xyz
                      {verificationResult.hasVipStatus && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/30 border border-yellow-500/50 text-yellow-400">
                          ⭐ VIP Status
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Profile Image */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <img
                        src={verificationResult.profileImage}
                        alt={`${verificationResult.username}'s profile`}
                        className="w-32 h-32 rounded-full border-4 border-green-500 object-cover"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik03NSA3MEMxMC40ODUgNzAgMTggNjIuNTE1IDE4IDUzLjVTMjUuNDg1IDM3IDM0IDM3IDUwIDQ0LjQ4NSA1MCA1My41UzQyLjUxNSA3MCAzNCA3MFoiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTI0IDEyMEMyNCA5NC4xIDQ4LjQgNzMgNzggNzNTMTMyIDk0LjEgMTMyIDEyMEgxMzJWMTUwSDI0VjEyMFoiIGZpbGw9IiNEMUQ1REIiLz4KPC9zdmc+';
                        }}
                      />
                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1">
                        <FaCheckCircle className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                                    {/* Additional Info */}
                  <div className="bg-green-900/20 border border-green-500/30 p-6 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-blue-400">Role:</span>
                        <span className="ml-2 text-gray-300">{verificationResult.role}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-blue-400">Verified:</span>
                        <span className="ml-2 text-gray-300">
                          {new Date(verificationResult.verificationDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-blue-400">Member Since:</span>
                        <span className="ml-2 text-gray-300">
                          {new Date(verificationResult.joinDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-blue-400">Status:</span>
                        <span className="ml-2 text-green-400 font-semibold">
                          Active {verificationResult.hasVipStatus && '⭐ VIP'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                            ) : (
                <div className="space-y-6">
                  {/* Not Verified Badge */}
                  <div className="flex justify-center">
                    <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-full">
                      <FaTimesCircle className="h-12 w-12 text-red-400" />
                    </div>
                  </div>

                  {/* User Info */}
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      User Not Found
                    </h2>
                    <p className="text-lg text-red-400 mb-4">
                      @{verificationResult.username} is not found in our database
                    </p>
                    <p className="text-gray-300">
                      {verificationResult.message}
                    </p>
                  </div>

                  {/* Generic User Icon */}
                  <div className="flex justify-center">
                    <div className="bg-gray-700/50 border border-gray-600 p-8 rounded-full">
                      <FaUser className="h-16 w-16 text-gray-400" />
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-gray-700/50 border border-gray-600 p-6 rounded-lg">
                    <p className="text-sm text-gray-300 text-left">
                      <strong>Note:</strong> This system shows all registered users of Aquads.xyz. 
                      If you believe this is an error, please contact our support team.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Information Section */}
        <div className="mt-12 bg-gray-800/50 backdrop-blur-sm border border-blue-500/30 rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-blue-400 mb-4">
            About User Verification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
            <div>
              <h4 className="font-semibold text-white mb-2">Verified Users</h4>
              <p>
                All registered users on Aquads.xyz are verified members of our platform. 
                You can trust that they are legitimate users who have completed our registration process.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">VIP Status</h4>
              <p>
                Some users have special VIP status, indicating they are premium members, 
                top affiliates, or have special privileges on the Aquads.xyz platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyUser; 