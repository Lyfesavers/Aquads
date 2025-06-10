import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { FaLightning, FaInfoCircle, FaWallet, FaExternalLinkAlt, FaExclamationTriangle } from 'react-icons/fa';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import logger from '../utils/logger';

// Use the same fee wallet as your AquaSwap and SavingsPools
const ETH_FEE_WALLET = process.env.REACT_APP_FEE_WALLET;
const FLASH_LOAN_FEE = 0.0009; // 0.09% Aave V3 fee

// Aave V3 Pool contract - same as in SavingsPools
const AAVE_V3_POOL = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';

// Flash loan supported assets with real addresses
const FLASH_LOAN_ASSETS = [
  {
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    maxAmount: 500000000, // 500M USDC
    icon: '💵'
  },
  {
    symbol: 'USDT', 
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    maxAmount: 400000000, // 400M USDT
    icon: '🏦'
  },
  {
    symbol: 'DAI',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    decimals: 18,
    maxAmount: 300000000, // 300M DAI
    icon: '🪙'
  },
  {
    symbol: 'WETH',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    decimals: 18,
    maxAmount: 500000, // 500K ETH
    icon: '⚡'
  }
];

// Flash loan use cases for UI
const USE_CASES = [
  {
    title: 'Arbitrage Trading',
    description: 'Profit from price differences across DEXs without capital',
    icon: '🔄',
    complexity: 'Advanced',
    profitPotential: 'High'
  },
  {
    title: 'Collateral Swap',
    description: 'Switch collateral types without repaying loans',
    icon: '🔀',
    complexity: 'Medium', 
    profitPotential: 'Medium'
  },
  {
    title: 'Liquidation Protection',
    description: 'Save positions from liquidation by adding collateral',
    icon: '🛡️',
    complexity: 'Medium',
    profitPotential: 'High'
  },
  {
    title: 'Debt Refinancing',
    description: 'Move debt to lower interest protocols',
    icon: '📊',
    complexity: 'Medium',
    profitPotential: 'Medium'
  }
];

const FlashLoans = ({ currentUser, showNotification }) => {
  const [selectedAsset, setSelectedAsset] = useState(FLASH_LOAN_ASSETS[0]);
  const [loanAmount, setLoanAmount] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const formatNumber = (num) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const calculateFee = () => {
    if (!loanAmount) return '0';
    const fee = parseFloat(loanAmount) * FLASH_LOAN_FEE;
    return fee.toFixed(selectedAsset.decimals === 18 ? 6 : 2);
  };

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setConnectedAddress(accounts[0]);
          setWalletConnected(true);
          showNotification('Wallet connected successfully!', 'success');
        }
      }
    } catch (error) {
      showNotification('Failed to connect wallet', 'error');
    }
  };

  const executeFlashLoan = async () => {
    if (!walletConnected) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }
    if (!loanAmount || parseFloat(loanAmount) <= 0) {
      showNotification('Please enter a valid loan amount', 'error');
      return;
    }

    setIsExecuting(true);
    try {
      showNotification('⚠️ Demo Mode: Flash loan simulation started', 'info');
      await new Promise(resolve => setTimeout(resolve, 3000));
      const fee = calculateFee();
      showNotification(`Demo completed! Would borrow ${loanAmount} ${selectedAsset.symbol} with ${fee} ${selectedAsset.symbol} fee`, 'success');
      setLoanAmount('');
    } catch (error) {
      showNotification('Flash loan execution failed', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
        if (accounts.length > 0) {
          setConnectedAddress(accounts[0]);
          setWalletConnected(true);
        }
      });
    }
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
            <FaLightning className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            Flash Loans
          </h2>
        </div>
        <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
          Borrow millions instantly with zero collateral. Execute complex DeFi strategies in a single transaction.
        </p>
      </div>

      {/* Use Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {USE_CASES.map((useCase, index) => (
          <div key={index} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-yellow-500/50 transition-all">
            <div className="text-2xl mb-2">{useCase.icon}</div>
            <h4 className="text-white font-semibold mb-2">{useCase.title}</h4>
            <p className="text-gray-400 text-sm mb-3">{useCase.description}</p>
            <div className="flex justify-between text-xs">
              <span className={`px-2 py-1 rounded ${
                useCase.complexity === 'Advanced' ? 'bg-red-500/20 text-red-400' :
                useCase.complexity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {useCase.complexity}
              </span>
              <span className={`px-2 py-1 rounded ${
                useCase.profitPotential === 'High' ? 'bg-green-500/20 text-green-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {useCase.profitPotential}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Warning Notice */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <FaExclamationTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-orange-400 font-semibold mb-1">⚠️ Advanced Feature Warning</h4>
            <p className="text-orange-300 text-sm">
              Flash loans must be repaid in the same transaction or they will revert. This requires smart contract development knowledge. 
              Practice on testnets first. You pay gas fees even if the transaction fails.
            </p>
          </div>
        </div>
      </div>

      {/* Flash Loan Interface */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <FaLightning className="text-yellow-400" />
          Execute Flash Loan
        </h3>

        {/* Asset Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">Select Asset</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {FLASH_LOAN_ASSETS.map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedAsset.symbol === asset.symbol
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                }`}
              >
                <div className="text-2xl mb-1">{asset.icon}</div>
                <div className="text-white font-semibold">{asset.symbol}</div>
                <div className="text-xs text-gray-400">Max: {formatNumber(asset.maxAmount)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Loan Amount */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Loan Amount ({selectedAsset.symbol})
          </label>
          <div className="relative">
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              placeholder={`Enter amount (max: ${formatNumber(selectedAsset.maxAmount)})`}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
            <div className="absolute right-3 top-3 text-gray-400 text-sm">
              {selectedAsset.symbol}
            </div>
          </div>
          {loanAmount && (
            <div className="mt-2 text-sm text-gray-400">
              Flash loan fee: {calculateFee()} {selectedAsset.symbol} (0.09%)
            </div>
          )}
        </div>

        {/* Advanced Section */}
        <div className="mb-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            <FaInfoCircle />
            Advanced Options {showAdvanced ? '▼' : '▶'}
          </button>
          
          {showAdvanced && (
            <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-600">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Custom Logic (Smart Contract Address or Description)
              </label>
              <textarea
                value={customLogic}
                onChange={(e) => setCustomLogic(e.target.value)}
                placeholder="Describe your arbitrage strategy or provide smart contract address for execution..."
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 h-20"
              />
              <p className="text-xs text-gray-400 mt-2">
                In production, this would be your smart contract that executes the arbitrage logic.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {!walletConnected ? (
            <button
              onClick={connectWallet}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <FaWallet />
              Connect Wallet
            </button>
          ) : (
            <>
              <button
                onClick={executeFlashLoan}
                disabled={isExecuting || !loanAmount}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {isExecuting ? (
                  'Executing...'
                ) : (
                  <>
                    <FaLightning />
                    Execute Flash Loan
                  </>
                )}
              </button>
              <a
                href={`https://etherscan.io/address/${AAVE_V3_POOL}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
              >
                <FaExternalLinkAlt />
                Contract
              </a>
            </>
          )}
        </div>

        {/* Connected Wallet Info */}
        {walletConnected && connectedAddress && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-300">
              Connected: {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
            </p>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/30">
        <h4 className="text-lg font-semibold text-white mb-4">How Flash Loans Work</h4>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-300">
          <div>
            <div className="font-semibold text-yellow-400 mb-2">1. Borrow</div>
            <p>Instantly borrow up to hundreds of millions with zero collateral from Aave V3 pools.</p>
          </div>
          <div>
            <div className="font-semibold text-yellow-400 mb-2">2. Execute</div>
            <p>Use borrowed funds for arbitrage, collateral swaps, or other DeFi strategies in the same transaction.</p>
          </div>
          <div>
            <div className="font-semibold text-yellow-400 mb-2">3. Repay</div>
            <p>Repay the loan + 0.09% fee before transaction ends, or everything reverts.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashLoans; 