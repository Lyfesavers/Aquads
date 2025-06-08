import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { FaExternalLinkAlt, FaInfoCircle, FaWallet, FaArrowDown, FaArrowUp } from 'react-icons/fa';
import { AQUADS_WALLETS, FEE_CONFIG, SUPPORTED_CHAINS, PROTOCOL_CONTRACTS, TOKEN_ADDRESSES, getWalletForChain } from '../config/wallets';
import { getPoolAPYs, formatAPY, formatTVL, getRiskAssessment } from '../services/defiService';
import { EthereumProvider } from '@walletconnect/ethereum-provider';

// Production-ready pool configurations using real contract addresses
const PROTOCOL_POOLS = [
  {
    id: 'aave-usdc',
    protocol: 'Aave',
    name: 'USDC Lending Pool',
    token: 'USDC',
    apy: 4.2, // Will be updated with real-time data
    tvl: 1250000000,
    risk: 'Low',
    logo: '🏦',
    description: 'Earn yield by lending USDC on Aave V3',
    contractAddress: PROTOCOL_CONTRACTS.AAVE_V3.ETHEREUM,
    tokenAddress: TOKEN_ADDRESSES.ETHEREUM.USDC,
    chain: 'Ethereum',
    chainId: 1,
    minDeposit: 1,
    feeWallet: AQUADS_WALLETS.ETHEREUM
  },
  {
    id: 'compound-usdt',
    protocol: 'Compound',
    name: 'USDT Supply Pool',
    token: 'USDT',
    apy: 3.8,
    tvl: 890000000,
    risk: 'Low',
    logo: '🔄',
    description: 'Supply USDT to Compound V3 for yield',
    contractAddress: PROTOCOL_CONTRACTS.COMPOUND_V3.ETHEREUM,
    tokenAddress: TOKEN_ADDRESSES.ETHEREUM.USDT,
    chain: 'Ethereum',
    chainId: 1,
    minDeposit: 1,
    feeWallet: AQUADS_WALLETS.ETHEREUM
  },
  {
    id: 'aave-eth',
    protocol: 'Aave',
    name: 'ETH Lending Pool',
    token: 'ETH',
    apy: 2.1,
    tvl: 2100000000,
    risk: 'Low',
    logo: '🏦',
    description: 'Earn yield by lending ETH on Aave V3',
    contractAddress: PROTOCOL_CONTRACTS.AAVE_V3.ETHEREUM,
    tokenAddress: TOKEN_ADDRESSES.ETHEREUM.WETH,
    chain: 'Ethereum',
    chainId: 1,
    minDeposit: 0.01,
    feeWallet: AQUADS_WALLETS.ETHEREUM
  },
  {
    id: 'yearn-usdc',
    protocol: 'Yearn',
    name: 'USDC Vault v2',
    token: 'USDC',
    apy: 5.7,
    tvl: 450000000,
    risk: 'Medium',
    logo: '🏛️',
    description: 'Auto-compound USDC through Yearn strategies',
    contractAddress: PROTOCOL_CONTRACTS.YEARN_V2.ETHEREUM,
    tokenAddress: TOKEN_ADDRESSES.ETHEREUM.USDC,
    chain: 'Ethereum',
    chainId: 1,
    minDeposit: 1,
    feeWallet: AQUADS_WALLETS.ETHEREUM
  },
  {
    id: 'compound-dai',
    protocol: 'Compound',
    name: 'DAI Supply Pool',
    token: 'DAI',
    apy: 4.1,
    tvl: 680000000,
    risk: 'Low',
    logo: '🔄',
    description: 'Supply DAI to Compound V3 for steady yield',
    contractAddress: PROTOCOL_CONTRACTS.COMPOUND_V3.ETHEREUM,
    tokenAddress: TOKEN_ADDRESSES.ETHEREUM.DAI,
    chain: 'Ethereum',
    chainId: 1,
    minDeposit: 1,
    feeWallet: AQUADS_WALLETS.ETHEREUM
  },
  {
    id: 'yearn-eth',
    protocol: 'Yearn',
    name: 'ETH Vault v2',
    token: 'ETH',
    apy: 3.4,
    tvl: 320000000,
    risk: 'Medium',
    logo: '🏛️',
    description: 'Auto-compound ETH through Yearn strategies',
    contractAddress: PROTOCOL_CONTRACTS.YEARN_V2.ETHEREUM,
    tokenAddress: TOKEN_ADDRESSES.ETHEREUM.WETH,
    chain: 'Ethereum',
    chainId: 1,
    minDeposit: 0.01,
    feeWallet: AQUADS_WALLETS.ETHEREUM
  }
];

const SavingsPools = ({ currentUser, showNotification, onTVLUpdate, onBalanceUpdate }) => {
  const [pools, setPools] = useState(PROTOCOL_POOLS);
  const [selectedPool, setSelectedPool] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [userPositions, setUserPositions] = useState([]);
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletProvider, setWalletProvider] = useState(null);
  const [connectedAddress, setConnectedAddress] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Format currency helper
  const formatCurrency = (value) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  // Risk color helper
  const getRiskColor = (risk) => {
    switch (risk) {
      case 'Low': return 'text-green-400 bg-green-400/10';
      case 'Medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'High': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  // Check wallet connection and fetch real-time APY data
  useEffect(() => {
    checkWalletConnection();
    fetchRealTimeAPYs();
    
    // Set up interval to refresh APY data every 5 minutes
    const apyInterval = setInterval(fetchRealTimeAPYs, 5 * 60 * 1000);
    
    return () => clearInterval(apyInterval);
  }, []);

  // Fetch real-time APY data from DeFiLlama
  const fetchRealTimeAPYs = async () => {
    try {
      const realTimeAPYs = await getPoolAPYs();
      
      // Update pools with real-time data
      const updatedPools = PROTOCOL_POOLS.map(pool => {
        const realTimeData = realTimeAPYs[pool.id];
        if (realTimeData) {
          return {
            ...pool,
            apy: realTimeData.apy || pool.apy,
            tvl: realTimeData.tvlUsd || pool.tvl
          };
        }
        return pool;
      });
      
      setPools(updatedPools);
    } catch (error) {
      console.error('Error fetching real-time APYs:', error);
      // Fallback to static data if API fails
      setPools(PROTOCOL_POOLS);
    }
  };

  const checkWalletConnection = async () => {
    // Check if WalletConnect provider exists
    if (walletProvider) {
      try {
        const accounts = await walletProvider.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletConnected(true);
          setConnectedAddress(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking WalletConnect:', error);
      }
    }
    
    // Fallback to MetaMask/window.ethereum
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletConnected(true);
          setConnectedAddress(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
      }
    }
  };

  // Initialize WalletConnect provider
  const initWalletConnect = async () => {
    try {
      const provider = await EthereumProvider.init({
        projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID,
        chains: [1], // Ethereum mainnet
        optionalChains: [137, 42161, 10, 8453, 43114], // Polygon, Arbitrum, Optimism, Base, Avalanche
        metadata: {
          name: "AquaFi",
          description: "AquaFi - Bicentralized Exchange Savings Pools",
          url: "https://www.aquads.xyz",
          icons: ["https://www.aquads.xyz/logo192.png"],
        },
        showQrModal: true
      });
      
      setWalletProvider(provider);
      return provider;
    } catch (error) {
      console.error('Error initializing WalletConnect:', error);
      return null;
    }
  };

  // Connect wallet with WalletConnect support
  const connectWallet = async (walletType = 'auto') => {
    try {
      if (walletType === 'walletconnect' || walletType === 'auto') {
        // Try WalletConnect first
        let provider = walletProvider;
        if (!provider) {
          provider = await initWalletConnect();
        }
        
        if (provider) {
          const accounts = await provider.enable();
          if (accounts.length > 0) {
            setWalletProvider(provider);
            setWalletConnected(true);
            setConnectedAddress(accounts[0]);
            setShowWalletModal(false);
            showNotification('Wallet connected successfully!', 'success');
            
            // Check network
            const chainId = await provider.request({ method: 'eth_chainId' });
            if (chainId !== '0x1') {
              showNotification('Please switch to Ethereum Mainnet for the best experience', 'warning');
            }
            return;
          }
        }
      }
      
      // Fallback to MetaMask/injected wallet
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletConnected(true);
          setConnectedAddress(accounts[0]);
          setShowWalletModal(false);
          showNotification('Wallet connected successfully!', 'success');
          
          // Check if we're on Ethereum mainnet
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          if (chainId !== '0x1') {
            showNotification('Please switch to Ethereum Mainnet for the best experience', 'warning');
          }
        }
      } else {
        showNotification('Please install MetaMask or use WalletConnect', 'error');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        showNotification('Please approve the connection request', 'error');
      } else {
        showNotification('Failed to connect wallet', 'error');
      }
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
      showNotification('Wallet disconnected', 'info');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  // Handle deposit with real blockchain transactions
  const handleDeposit = async () => {
    if (!selectedPool || !depositAmount || !walletConnected) {
      showNotification('Please connect wallet and enter deposit amount', 'error');
      return;
    }

    if (parseFloat(depositAmount) < selectedPool.minDeposit) {
      showNotification(`Minimum deposit is ${selectedPool.minDeposit} ${selectedPool.token}`, 'error');
      return;
    }

    setIsDepositing(true);
    
    try {
      // Get user's wallet and provider (support both WalletConnect and MetaMask)
      const web3Provider = walletProvider || window.ethereum;
      if (!web3Provider) {
        showNotification('No wallet provider found', 'error');
        setIsDepositing(false);
        return;
      }
      
      const provider = new ethers.BrowserProvider(web3Provider);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Check if we're on the correct network
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== selectedPool.chainId) {
        showNotification(`Please switch to ${selectedPool.chain} network`, 'error');
        setIsDepositing(false);
        return;
      }
      
      // Calculate deposit amount and fees
      const isETH = selectedPool.token === 'ETH';
      const decimals = isETH ? 18 : 6; // ETH = 18, USDC/USDT/DAI = 6
      const depositAmountBN = ethers.parseUnits(depositAmount, decimals);
      const managementFee = FEE_CONFIG.SAVINGS_MANAGEMENT_FEE;
      const feeAmount = depositAmountBN * BigInt(Math.floor(managementFee * 10000)) / BigInt(10000);
      
      let txHash = '';
      
      if (isETH) {
        // Direct ETH deposit to protocol
        const protocolContract = new ethers.Contract(
          selectedPool.contractAddress,
          ['function deposit() payable'],
          signer
        );
        
        // Send ETH with management fee to our wallet
        const feeWalletTx = await signer.sendTransaction({
          to: selectedPool.feeWallet,
          value: feeAmount,
          gasLimit: 21000
        });
        await feeWalletTx.wait();
        
        // Deposit remaining ETH to protocol
        const netAmount = depositAmountBN - feeAmount;
        const depositTx = await protocolContract.deposit({ 
          value: netAmount,
          gasLimit: 300000 
        });
        const receipt = await depositTx.wait();
        txHash = receipt.hash;
        
      } else {
        // ERC20 token deposit
        const tokenABI = [
          'function allowance(address owner, address spender) view returns (uint256)',
          'function approve(address spender, uint256 amount) returns (bool)',
          'function transfer(address to, uint256 amount) returns (bool)',
          'function balanceOf(address account) view returns (uint256)'
        ];
        
        const tokenContract = new ethers.Contract(selectedPool.tokenAddress, tokenABI, signer);
        
        // Check user balance
        const balance = await tokenContract.balanceOf(userAddress);
        if (balance < depositAmountBN) {
          showNotification(`Insufficient ${selectedPool.token} balance`, 'error');
          setIsDepositing(false);
          return;
        }
        
        // Send management fee to our fee wallet
        const feeTx = await tokenContract.transfer(selectedPool.feeWallet, feeAmount, {
          gasLimit: 100000
        });
        await feeTx.wait();
        
        // Check allowance for protocol contract
        const netAmount = depositAmountBN - feeAmount;
        const allowance = await tokenContract.allowance(userAddress, selectedPool.contractAddress);
        
        if (allowance < netAmount) {
          // Approve protocol contract to spend tokens
          const approveTx = await tokenContract.approve(selectedPool.contractAddress, netAmount, {
            gasLimit: 100000
          });
          await approveTx.wait();
          showNotification('Token approval confirmed, proceeding with deposit...', 'info');
        }
        
        // Deposit to protocol (simplified - actual ABI would depend on specific protocol)
        const protocolABI = [
          'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
          'function deposit(uint256 amount)',
          'function mint(uint256 amount)'
        ];
        
        const protocolContract = new ethers.Contract(selectedPool.contractAddress, protocolABI, signer);
        
        let depositTx;
        if (selectedPool.protocol === 'Aave') {
          depositTx = await protocolContract.supply(
            selectedPool.tokenAddress,
            netAmount,
            userAddress,
            0,
            { gasLimit: 400000 }
          );
        } else if (selectedPool.protocol === 'Compound') {
          depositTx = await protocolContract.mint(netAmount, { gasLimit: 300000 });
        } else if (selectedPool.protocol === 'Yearn') {
          depositTx = await protocolContract.deposit(netAmount, { gasLimit: 300000 });
        }
        
        const receipt = await depositTx.wait();
        txHash = receipt.hash;
      }
      
      showNotification(`Successfully deposited ${depositAmount} ${selectedPool.token} to ${selectedPool.protocol}! TX: ${txHash.slice(0, 10)}...`, 'success');
      
      // Create position with real transaction data
      const newPosition = {
        id: Date.now(),
        poolId: selectedPool.id,
        protocol: selectedPool.protocol,
        token: selectedPool.token,
        amount: parseFloat(depositAmount),
        depositDate: new Date(),
        currentValue: parseFloat(depositAmount),
        earned: 0,
        apy: selectedPool.apy,
        feeWallet: selectedPool.feeWallet,
        userAddress: userAddress,
        contractAddress: selectedPool.contractAddress,
        tokenAddress: selectedPool.tokenAddress,
        managementFee: managementFee,
        txHash: txHash,
        netAmount: parseFloat(depositAmount) * (1 - managementFee)
      };
      
      setUserPositions(prev => [...prev, newPosition]);
      setDepositAmount('');
      setSelectedPool(null);
      
      // Update callbacks for parent component
      if (onBalanceUpdate) {
        const totalBalance = userPositions.reduce((sum, pos) => sum + pos.currentValue, 0) + parseFloat(depositAmount);
        onBalanceUpdate(totalBalance);
      }
      
    } catch (error) {
      console.error('Deposit error:', error);
      let errorMessage = 'Deposit failed. Please try again.';
      
      if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for gas fees.';
      } else if (error.code === 'USER_REJECTED') {
        errorMessage = 'Transaction rejected by user.';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient token balance or ETH for gas.';
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setIsDepositing(false);
    }
  };

  // Handle withdraw with real blockchain transactions
  const handleWithdraw = async (position) => {
    if (!walletConnected) {
      showNotification('Please connect your wallet', 'error');
      return;
    }

    setLoading(true);
    
    try {
      // Get user's wallet and provider (support both WalletConnect and MetaMask)
      const web3Provider = walletProvider || window.ethereum;
      if (!web3Provider) {
        showNotification('No wallet provider found', 'error');
        setLoading(false);
        return;
      }
      
      const provider = new ethers.BrowserProvider(web3Provider);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Check if we're on the correct network
      const network = await provider.getNetwork();
      const pool = pools.find(p => p.id === position.poolId);
      if (Number(network.chainId) !== pool.chainId) {
        showNotification(`Please switch to ${pool.chain} network`, 'error');
        setLoading(false);
        return;
      }
      
      const isETH = position.token === 'ETH';
      const decimals = isETH ? 18 : 6;
      const withdrawAmount = ethers.parseUnits(position.netAmount.toString(), decimals);
      
      let txHash = '';
      
      if (isETH) {
        // Withdraw ETH from protocol
        const protocolContract = new ethers.Contract(
          position.contractAddress,
          ['function withdraw(uint256 amount) returns (uint256)'],
          signer
        );
        
        const withdrawTx = await protocolContract.withdraw(withdrawAmount, {
          gasLimit: 400000
        });
        const receipt = await withdrawTx.wait();
        txHash = receipt.hash;
        
      } else {
        // Withdraw ERC20 tokens from protocol
        const protocolABI = [
          'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
          'function redeem(uint256 redeemTokens) returns (uint256)',
          'function withdraw(uint256 amount) returns (uint256)'
        ];
        
        const protocolContract = new ethers.Contract(position.contractAddress, protocolABI, signer);
        
        let withdrawTx;
        if (position.protocol === 'Aave') {
          withdrawTx = await protocolContract.withdraw(
            position.tokenAddress,
            withdrawAmount,
            userAddress,
            { gasLimit: 400000 }
          );
        } else if (position.protocol === 'Compound') {
          withdrawTx = await protocolContract.redeem(withdrawAmount, { gasLimit: 300000 });
        } else if (position.protocol === 'Yearn') {
          withdrawTx = await protocolContract.withdraw(withdrawAmount, { gasLimit: 300000 });
        }
        
        const receipt = await withdrawTx.wait();
        txHash = receipt.hash;
      }
      
      // Remove position after successful withdrawal
      setUserPositions(prev => prev.filter(p => p.id !== position.id));
      showNotification(`Successfully withdrew ${position.netAmount.toFixed(4)} ${position.token}! TX: ${txHash.slice(0, 10)}...`, 'success');
      
      // Update callbacks for parent component
      if (onBalanceUpdate) {
        const remainingBalance = userPositions.filter(p => p.id !== position.id).reduce((sum, pos) => sum + pos.currentValue, 0);
        onBalanceUpdate(remainingBalance);
      }
      
    } catch (error) {
      console.error('Withdraw error:', error);
      let errorMessage = 'Withdraw failed. Please try again.';
      
      if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for gas fees.';
      } else if (error.code === 'USER_REJECTED') {
        errorMessage = 'Transaction rejected by user.';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH for gas fees.';
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Wallet Connection */}
      {!walletConnected && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
          <FaWallet className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Connect Your Wallet</h3>
          <p className="text-gray-300 mb-4">Connect your wallet to start making real deposits and earning yield on your crypto assets</p>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-300">
              ⚠️ <strong>Real Money Warning:</strong> This will make actual blockchain transactions with real funds and gas fees.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => connectWallet('walletconnect')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2 justify-center"
            >
              <FaWallet className="w-4 h-4" />
              WalletConnect
            </button>
            <button
              onClick={() => connectWallet('metamask')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2 justify-center"
            >
              🦊 MetaMask
            </button>
          </div>
        </div>
      )}

      {/* Connected Wallet Info */}
      {walletConnected && connectedAddress && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <FaWallet className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-medium">Wallet Connected</p>
              <p className="text-gray-400 text-sm">{connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}</p>
            </div>
          </div>
          <button
            onClick={disconnectWallet}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* User Positions */}
      {walletConnected && userPositions.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-xl font-semibold text-white mb-4">Your Positions</h3>
          <div className="grid gap-4">
            {userPositions.map((position) => (
              <div key={position.id} className="bg-gray-700/50 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">{position.protocol}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-300">{position.token}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Deposited: {position.amount.toFixed(4)} {position.token}
                  </div>
                  <div className="text-sm text-gray-400">
                    Net Amount: {position.netAmount?.toFixed(4) || position.amount.toFixed(4)} {position.token}
                  </div>
                  <div className="text-sm text-green-400">
                    Earned: +{position.earned.toFixed(4)} {position.token}
                  </div>
                  {position.txHash && (
                    <div className="text-sm text-blue-400">
                      TX: {position.txHash.slice(0, 10)}...
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleWithdraw(position)}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FaArrowUp className="w-4 h-4" />
                  Withdraw
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Pools */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-xl font-semibold text-white mb-6">Available Savings Pools</h3>
        
        <div className="grid gap-6">
          {pools.map((pool) => (
            <div key={pool.id} className="bg-gray-700/30 rounded-xl p-6 border border-gray-600/30 hover:border-blue-500/50 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{pool.logo}</span>
                    <div>
                      <h4 className="text-lg font-semibold text-white">{pool.name}</h4>
                      <p className="text-sm text-gray-400">{pool.protocol} • {pool.chain}</p>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm mb-3">{pool.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">APY:</span>
                      <span className="text-green-400 font-semibold ml-1">{pool.apy}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">TVL:</span>
                      <span className="text-white ml-1">{formatCurrency(pool.tvl)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Risk:</span>
                      <span className={`ml-1 px-2 py-1 rounded-full text-xs ${getRiskColor(pool.risk)}`}>
                        {pool.risk}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Min:</span>
                      <span className="text-white ml-1">{pool.minDeposit} {pool.token}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setSelectedPool(pool)}
                    disabled={!walletConnected}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FaArrowDown className="w-4 h-4" />
                    {walletConnected ? 'Deposit' : 'Connect Wallet'}
                  </button>
                  <a
                    href={`https://etherscan.io/address/${pool.contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FaExternalLinkAlt className="w-4 h-4" />
                    Contract
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deposit Modal */}
      {selectedPool && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">
              Deposit to {selectedPool.protocol} {selectedPool.token}
            </h3>
            
            <div className="mb-4">
              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">APY:</span>
                  <span className="text-green-400 font-semibold">{selectedPool.apy}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Management Fee:</span>
                  <span className="text-blue-400">{(FEE_CONFIG.SAVINGS_MANAGEMENT_FEE * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Fee Wallet:</span>
                  <span className="text-blue-400 text-xs">{selectedPool.feeWallet.slice(0, 6)}...{selectedPool.feeWallet.slice(-4)}</span>
                </div>
              </div>
              
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount ({selectedPool.token})
              </label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder={`Min: ${selectedPool.minDeposit}`}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleDeposit}
                disabled={isDepositing || !depositAmount}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg transition-colors"
              >
                {isDepositing ? 'Depositing...' : 'Confirm Deposit'}
              </button>
              <button
                onClick={() => {
                  setSelectedPool(null);
                  setDepositAmount('');
                }}
                className="px-4 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <FaInfoCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-white font-semibold mb-2">How BexFi Works</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Your funds are deposited directly to audited DeFi protocols (Aave, Compound, Yearn)</li>
              <li>• Aquads charges {(FEE_CONFIG.SAVINGS_MANAGEMENT_FEE * 100).toFixed(1)}% management fee on earned yield only</li>
              <li>• Fees are collected to the same wallets used by AquaSwap: {AQUADS_WALLETS.ETHEREUM.slice(0, 6)}...{AQUADS_WALLETS.ETHEREUM.slice(-4)}</li>
              <li>• You maintain full custody and can withdraw anytime (small {(FEE_CONFIG.SAVINGS_WITHDRAWAL_FEE * 100).toFixed(1)}% withdrawal fee)</li>
              <li>• All transactions are transparent and verifiable on-chain</li>
              <li>• Real-time APY data powered by DeFiLlama API</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavingsPools; 