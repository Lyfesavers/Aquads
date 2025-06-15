import React, { useState } from 'react';
import { FaSearch, FaCheckCircle, FaTimesCircle, FaUser } from 'react-icons/fa';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Verify Aquads Users
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Check if a user is a verified listing agent or affiliate partner of Aquads.xyz. 
            Enter their username below to see their verification status.
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <form onSubmit={handleSearch} className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username to verify..."
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-2 rounded-md transition-colors"
              >
                {loading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <FaSearch className="h-4 w-4" />
                )}
              </button>
            </div>
            {error && (
              <p className="text-red-600 text-sm mt-2 text-center">{error}</p>
            )}
          </form>
        </div>

        {/* Verification Result */}
        {verificationResult && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              {verificationResult.isVerified ? (
                <div className="space-y-6">
                  {/* Verified Badge */}
                  <div className="flex justify-center">
                    <div className="bg-green-100 p-4 rounded-full">
                      <FaCheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                  </div>

                  {/* User Info */}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      ✓ Verified User
                    </h2>
                    <p className="text-lg text-green-600 font-semibold mb-4">
                      @{verificationResult.username} is a verified {verificationResult.role} of Aquads.xyz
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
                  <div className="bg-green-50 p-6 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">Role:</span>
                        <span className="ml-2 text-gray-600">{verificationResult.role}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Verified:</span>
                        <span className="ml-2 text-gray-600">
                          {new Date(verificationResult.verificationDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Member Since:</span>
                        <span className="ml-2 text-gray-600">
                          {new Date(verificationResult.joinDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Status:</span>
                        <span className="ml-2 text-green-600 font-semibold">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Not Verified Badge */}
                  <div className="flex justify-center">
                    <div className="bg-red-100 p-4 rounded-full">
                      <FaTimesCircle className="h-12 w-12 text-red-600" />
                    </div>
                  </div>

                  {/* User Info */}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      User Not Verified
                    </h2>
                    <p className="text-lg text-red-600 mb-4">
                      @{verificationResult.username} is not found in our verified database
                    </p>
                    <p className="text-gray-600">
                      {verificationResult.message}
                    </p>
                  </div>

                  {/* Generic User Icon */}
                  <div className="flex justify-center">
                    <div className="bg-gray-200 p-8 rounded-full">
                      <FaUser className="h-16 w-16 text-gray-400" />
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <p className="text-sm text-gray-600 text-left">
                      <strong>Note:</strong> This system only shows users who are verified listing agents 
                      or affiliate partners of Aquads.xyz. If you believe this is an error, please contact 
                      our support team.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Information Section */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            About User Verification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Verified Listing Agents</h4>
              <p>
                These are professional real estate agents who have been verified by Aquads.xyz 
                to list properties and provide real estate services on our platform.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Affiliate Partners</h4>
              <p>
                These are verified business partners who promote Aquads.xyz services and 
                have met our partnership requirements and standards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyUser; 