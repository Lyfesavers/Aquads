import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TokenPurchaseModal from './TokenPurchaseModal';

const TokenBalance = ({ onBalanceUpdate, onPurchaseClick, showNotification, currentUser }) => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [tokenHistory, setTokenHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingPurchases, setPendingPurchases] = useState(0);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const token = currentUser?.token;
      if (!token) {
        console.error('No authentication token found');
        if (showNotification) {
          showNotification('Please log in to view token balance', 'error');
        }
        return;
      }
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/user-tokens/balance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setBalance(response.data.tokens);
      setTokenHistory(response.data.history);
      setPendingPurchases(response.data.pendingPurchases || 0);
      
      if (onBalanceUpdate) {
        onBalanceUpdate(response.data.tokens);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseComplete = (tokensPurchased) => {
    setBalance(prev => prev + tokensPurchased);
    fetchBalance(); // Refresh to get updated history
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getHistoryIcon = (type) => {
    switch (type) {
      case 'purchase':
        return '💰';
      case 'spend':
        return '🔓';
      case 'refund':
        return '↩️';
      case 'pending':
        return '⏳';
      default:
        return '📝';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      {/* Token Balance Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Token Balance</h2>
          <p className="text-gray-400">Use tokens to unlock leads</p>
        </div>
        <div className="text-4xl">🪙</div>
      </div>

      {/* Balance Display */}
      <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-4 mb-4">
        <div className="text-center">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-600 rounded w-20 mx-auto"></div>
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-white mb-1">{balance}</div>
              <div className="text-blue-400 text-sm">
                Available Tokens (≈ {Math.floor(balance / 2)} leads)
              </div>
              {pendingPurchases > 0 && (
                <div className="text-yellow-400 text-xs mt-1">
                  ⏳ {pendingPurchases} purchase{pendingPurchases > 1 ? 's' : ''} pending approval
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 mb-4">
        <button
          onClick={onPurchaseClick || (() => setShowPurchaseModal(true))}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          Purchase More Tokens
        </button>
        
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {showHistory ? 'Hide' : 'View'} Transaction History
        </button>
      </div>

      {/* Transaction History */}
      {showHistory && (
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-white font-semibold mb-3">Recent Transactions</h3>
          {tokenHistory.length === 0 ? (
            <p className="text-gray-400 text-sm">No transactions yet</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tokenHistory.slice(0, 10).map((transaction, index) => (
                <div key={index} className="bg-gray-700/50 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-2">{getHistoryIcon(transaction.type)}</span>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {transaction.reason}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${
                        transaction.type === 'purchase' 
                          ? 'text-green-400' 
                          : transaction.type === 'spend'
                          ? 'text-red-400'
                          : transaction.type === 'pending'
                          ? 'text-yellow-400'
                          : 'text-blue-400'
                      }`}>
                        {transaction.type === 'purchase' ? '+' : transaction.type === 'pending' ? '⏳' : '-'}{transaction.amount}
                      </span>
                      <p className="text-gray-400 text-xs">
                        Balance: {transaction.balanceAfter}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Token Info */}
      <div className="bg-gray-700/30 rounded-lg p-3 mt-4">
        <h4 className="text-white text-sm font-semibold mb-2">💡 Quick Info:</h4>
        <ul className="text-gray-300 text-xs space-y-1">
          <li>• 2 tokens unlock 1 booking lead</li>
          <li>• 1 token = $1 USDC</li>
          <li>• Tokens never expire</li>
          <li>• Volume discounts available</li>
        </ul>
      </div>

      {/* Purchase Modal */}
      <TokenPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </div>
  );
};

export default TokenBalance; 