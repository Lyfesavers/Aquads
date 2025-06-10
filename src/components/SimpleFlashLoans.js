import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { FaBolt, FaInfoCircle, FaWallet, FaExternalLinkAlt, FaExclamationTriangle, FaSpinner, FaCheckCircle, FaDollarSign } from 'react-icons/fa';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import simpleFlashLoanService from '../services/simpleFlashLoanService';
import realFlashLoanService from '../services/realFlashLoanService';
import { AQUADS_WALLETS } from '../config/wallets';
import logger from '../utils/logger';

// Flash loan supported assets with real addresses (same as in other components)
const FLASH_LOAN_ASSETS = [
  {
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    maxAmount: 1000000, // 1M USDC
    icon: '💵'
  },
  {
    symbol: 'USDT', 
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    maxAmount: 1000000, // 1M USDT
    icon: '🏦'
  },
  {
    symbol: 'DAI',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    decimals: 18,
    maxAmount: 1000000, // 1M DAI
    icon: '🪙'
  },
  {
    symbol: 'WETH',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    decimals: 18,
    maxAmount: 1000, // 1K ETH
    icon: '⚡'
  }
];

const SimpleFlashLoans = ({ currentUser, showNotification }) => {
  const [selectedAsset, setSelectedAsset] = useState(FLASH_LOAN_ASSETS[0]);
  const [loanAmount, setLoanAmount] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState(null);
  const [walletProvider, setWalletProvider] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [serviceReady, setServiceReady] = useState(false);
  const [executionProgress, setExecutionProgress] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [userBalance, setUserBalance] = useState('0');
  const [fees, setFees] = useState({ platformFee: '0', aaveFee: '0', totalFees: '0' });
  const [isRealContract, setIsRealContract] = useState(false);
  const [contractInfo, setContractInfo] = useState(null);

  const formatNumber = (num) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  // Use real service if contract is deployed, otherwise use simple service
  const activeService = isRealContract ? realFlashLoanService : simpleFlashLoanService;
  const platformFeeRate = isRealContract ? 0.2 : simpleFlashLoanService.getPlatformFeeRate();

  // Calculate fees when amount changes
  useEffect(() => {
    const calculateFees = async () => {
      if (loanAmount && parseFloat(loanAmount) > 0) {
        try {
          let newFees;
          if (isRealContract && serviceReady) {
            newFees = await activeService.calculateFees(loanAmount, selectedAsset.decimals);
          } else {
            newFees = simpleFlashLoanService.calculateFees(loanAmount, selectedAsset.decimals);
          }
          setFees(newFees);
        } catch (error) {
          // Fallback to simple calculation
          const newFees = simpleFlashLoanService.calculateFees(loanAmount, selectedAsset.decimals);
          setFees(newFees);
        }
      } else {
        setFees({ platformFee: '0', aaveFee: '0', totalFees: '0' });
      }
    };
    
    calculateFees();
  }, [loanAmount, selectedAsset, isRealContract, serviceReady, activeService]);

  // Check user balance when asset or amount changes
  useEffect(() => {
    const checkBalance = async () => {
      if (serviceReady && walletConnected && loanAmount) {
        try {
          const balanceInfo = await activeService.checkUserBalance(selectedAsset.address, loanAmount);
          setUserBalance(balanceInfo.balance);
        } catch (error) {
          logger.error('Error checking balance:', error);
        }
      }
    };
    
    checkBalance();
  }, [serviceReady, walletConnected, selectedAsset, loanAmount, activeService]);

  // Initialize WalletConnect provider - same pattern as savings pools
  const initWalletConnect = async () => {
    try {
      const provider = await EthereumProvider.init({
        projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID,
        chains: [1], // Ethereum mainnet
        optionalChains: [137, 42161, 10, 8453, 43114],
        metadata: {
          name: "AquaFi",
          description: "AquaFi - Simple Flash Loans",
          url: "https://www.aquads.xyz",
          icons: ["https://www.aquads.xyz/logo192.png"],
        },
        showQrModal: true
      });
      
      setWalletProvider(provider);
      return provider;
    } catch (error) {
      logger.error('Error initializing WalletConnect:', error);
      return null;
    }
  };

  // Connect wallet via WalletConnect
  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      let provider = walletProvider;
      if (!provider) {
        provider = await initWalletConnect();
      }
      
      if (provider) {
        const accounts = await provider.enable();
        if (accounts && accounts.length > 0) {
          setWalletProvider(provider);
          setWalletConnected(true);
          setConnectedAddress(accounts[0]);
          showNotification('Wallet connected successfully!', 'success');
          
          // Check network
          const chainId = await provider.request({ method: 'eth_chainId' });
          if (chainId !== '0x1') {
            showNotification('Please switch to Ethereum Mainnet for flash loans', 'warning');
          }
        } else {
          showNotification('No accounts found. Please try connecting again.', 'error');
        }
      } else {
        showNotification('Failed to initialize WalletConnect. Please try again.', 'error');
      }
    } catch (error) {
      logger.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        showNotification('Please approve the connection request', 'error');
      } else {
        showNotification('Failed to connect wallet. Please try again.', 'error');
      }
      setWalletConnected(false);
      setConnectedAddress(null);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      if (walletProvider) {
        await walletProvider.disconnect();
        setWalletProvider(null);
      }
      setWalletConnected(false);
      setConnectedAddress(null);
      setServiceReady(false);
      showNotification('Wallet disconnected', 'info');
    } catch (error) {
      logger.error('Error disconnecting wallet:', error);
    }
  };

  // Execute simple flash loan
  const executeFlashLoan = async (isDemo = false) => {
    if (!loanAmount || parseFloat(loanAmount) <= 0) {
      showNotification('Please enter a valid loan amount', 'error');
      return;
    }

    if (!walletConnected) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    setIsExecuting(true);
    setExecutionProgress('');
    setLastResult(null);

    try {
      const options = {
        onStart: () => setExecutionProgress('Starting...'),
        onProgress: (message) => setExecutionProgress(message)
      };

      let result;
      if (isDemo) {
        showNotification('🚀 Starting demo flash loan...', 'info');
        result = await activeService.executeDemoFlashLoan(
          selectedAsset.address,
          loanAmount,
          options
        );
        showNotification(`✅ ${result.message}`, 'success');
      } else {
        if (isRealContract) {
          showNotification('🚀 Executing real Aave flash loan...', 'info');
          result = await activeService.executeRealFlashLoan(
            selectedAsset.address,
            loanAmount,
            options
          );
          showNotification(`✅ Real flash loan executed! ${result.collectedFee} ${selectedAsset.symbol} fee collected`, 'success');
        } else {
          showNotification('🚀 Collecting platform fee and preparing flash loan...', 'info');
          result = await activeService.executeRealFlashLoan(
            selectedAsset.address,
            loanAmount,
            options
          );
          showNotification(`✅ Platform fee collected! ${result.collectedFee} ${selectedAsset.symbol}`, 'success');
        }
      }

      setLastResult(result);
      setLoanAmount('');
      
    } catch (error) {
      showNotification(`❌ ${error.message}`, 'error');
      logger.error('Flash loan execution error:', error);
    } finally {
      setIsExecuting(false);
      setExecutionProgress('');
    }
  };

  // Check if real contract is deployed
  useEffect(() => {
    const checkContract = async () => {
      const isDeployed = await realFlashLoanService.isContractDeployed();
      setIsRealContract(isDeployed);
      
      if (isDeployed) {
        logger.info('Real flash loan contract detected!');
      } else {
        logger.info('Using simple flash loan service (no contract deployed)');
      }
    };
    
    checkContract();
  }, []);

  // Initialize service when wallet connects
  useEffect(() => {
    const initializeService = async () => {
      if (walletProvider && walletConnected && connectedAddress) {
        try {
          let isReady = false;
          
          if (isRealContract) {
            // Try to initialize real service first
            isReady = await realFlashLoanService.initialize(walletProvider, connectedAddress);
            if (isReady) {
              const info = await realFlashLoanService.getContractInfo();
              setContractInfo(info);
              showNotification('✅ Real Aave flash loans ready!', 'success');
            }
          }
          
          if (!isReady) {
            // Fallback to simple service
            isReady = await simpleFlashLoanService.initialize(walletProvider, connectedAddress);
            if (isReady) {
              showNotification('✅ Flash loan service ready!', 'success');
            }
          }
          
          setServiceReady(isReady);
        } catch (error) {
          logger.error('Failed to initialize flash loan service:', error);
          setServiceReady(false);
        }
      }
    };

    if (walletConnected && walletProvider) {
      initializeService();
    }
  }, [walletConnected, walletProvider, connectedAddress, isRealContract]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <FaBolt className="w-8 h-8 text-yellow-400" />
          <h2 className="text-3xl font-bold text-white">Simple Flash Loans</h2>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto">
          {isRealContract 
            ? "Real Aave flash loans with automatic fee collection. Production ready!" 
            : "Instant flash loans with automatic fee collection. Zero setup required - production ready!"
          }
        </p>
        {isRealContract && contractInfo && (
          <p className="text-sm text-green-400 mt-2">
            🔗 Contract: {contractInfo.contractAddress.slice(0, 10)}...{contractInfo.contractAddress.slice(-6)}
          </p>
        )}
      </div>





      {/* Flash Loan Interface */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        
        {/* Wallet Connection */}
        {!walletConnected ? (
          <div className="text-center py-8">
            <FaWallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
            <p className="text-gray-400 mb-6">Connect to access production flash loans</p>
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2 mx-auto"
            >
              {isConnecting ? (
                <>
                  <FaSpinner className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <FaWallet className="w-4 h-4" />
                  Connect Wallet
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Connected Wallet Info */}
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-white font-medium">
                  {connectedAddress?.slice(0, 6)}...{connectedAddress?.slice(-4)}
                </span>
                {serviceReady && <span className="text-green-400 text-sm">• Service Ready</span>}
              </div>
              <button
                onClick={disconnectWallet}
                className="text-gray-400 hover:text-white text-sm"
              >
                Disconnect
              </button>
            </div>

            {/* Asset Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Select Asset</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FLASH_LOAN_ASSETS.map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => setSelectedAsset(asset)}
                    className={`p-4 rounded-lg border transition-all ${
                      selectedAsset.symbol === asset.symbol
                        ? 'border-yellow-500 bg-yellow-500/10'
                        : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-2xl mb-2">{asset.icon}</div>
                    <div className="font-medium text-white">{asset.symbol}</div>
                    <div className="text-xs text-gray-400">Max: {formatNumber(asset.maxAmount)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Loan Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Loan Amount ({selectedAsset.symbol})
              </label>
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                placeholder={`Enter amount (max: ${formatNumber(selectedAsset.maxAmount)})`}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              
              {/* User Balance & Fees */}
              {loanAmount && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Your Balance:</span>
                    <span className="text-white">{userBalance} {selectedAsset.symbol}</span>
                  </div>
                  <div className="border-t border-gray-600 pt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400">Platform Fee ({platformFeeRate}%):</span>
                      <span className="text-green-400">{fees.platformFee} {selectedAsset.symbol}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Aave Fee (0.09%):</span>
                      <span className="text-gray-400">{fees.aaveFee} {selectedAsset.symbol}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-yellow-400">Total Fees:</span>
                      <span className="text-yellow-400">{fees.totalFees} {selectedAsset.symbol}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Execution Progress */}
            {executionProgress && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FaSpinner className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-blue-300 text-sm">{executionProgress}</span>
                </div>
              </div>
            )}

            {/* Execute Button - PRODUCTION ONLY */}
            <button
              onClick={() => executeFlashLoan(false)}
              disabled={isExecuting || !loanAmount || !serviceReady}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-4 px-6 rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              {isExecuting ? (
                <>
                  <FaSpinner className="w-5 h-5 animate-spin" />
                  Processing Flash Loan...
                </>
              ) : (
                <>
                  <FaBolt className="w-5 h-5" />
                  Execute Flash Loan (Pay {fees.platformFee} {selectedAsset.symbol} Fee)
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Benefits Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <FaCheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="font-semibold text-white">Production Ready</h3>
          </div>
          <p className="text-gray-400 text-sm">
            Live flash loans with real fee collection. No setup required - start generating revenue immediately.
          </p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <FaDollarSign className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="font-semibold text-white">Instant Revenue</h3>
          </div>
          <p className="text-gray-400 text-sm">
            Collect {platformFeeRate}% platform fees immediately. Fees go directly to your existing fee wallet.
          </p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <FaExternalLinkAlt className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="font-semibold text-white">Same Infrastructure</h3>
          </div>
          <p className="text-gray-400 text-sm">
            Uses your existing WalletConnect setup and fee wallet. Perfect integration with current system.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimpleFlashLoans; 