import { ethers } from 'ethers';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import { AQUADS_WALLETS } from '../config/wallets';
import logger from '../utils/logger';

// Flash Loan Contract ABI (generated from our smart contract)
const FLASH_LOAN_ABI = [
  "function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external",
  "function simpleFlashLoan(address asset, uint256 amount) external",
  "function getPlatformFee(uint256 amount) external view returns (uint256)",
  "function getTotalFees(uint256 amount) external view returns (uint256 platformFee, uint256 aaveFee)",
  "function platformFeeRate() external view returns (uint256)",
  "function feeWallet() external view returns (address)",
  "function owner() external view returns (address)",
  "event FlashLoanExecuted(address indexed user, address indexed asset, uint256 amount, uint256 platformFee, uint256 premium)"
];

// ERC20 ABI for token interactions
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

// Supported assets (same as before)
const SUPPORTED_ASSETS = {
  USDC: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    decimals: 6,
    maxAmount: 1000000,
    icon: '💵'
  },
  USDT: {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    decimals: 6,
    maxAmount: 1000000,
    icon: '🏦'
  },
  DAI: {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    symbol: 'DAI',
    decimals: 18,
    maxAmount: 1000000,
    icon: '🪙'
  },
  WETH: {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH',
    decimals: 18,
    maxAmount: 1000,
    icon: '⚡'
  }
};

class RealFlashLoanService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.userAddress = null;
    this.contractAddress = null;
    this.contract = null;
    this.isReady = false;
  }

  /**
   * Initialize the service with wallet provider
   */
  async initialize(walletProvider, connectedAddress) {
    try {
      // Get contract address from environment variable
      this.contractAddress = process.env.REACT_APP_FLASH_LOAN_CONTRACT;
      
      if (!this.contractAddress) {
        throw new Error('Flash loan contract not deployed. Please deploy the contract first.');
      }

      this.provider = new ethers.BrowserProvider(walletProvider);
      this.signer = await this.provider.getSigner();
      this.userAddress = connectedAddress;

      // Initialize contract
      this.contract = new ethers.Contract(this.contractAddress, FLASH_LOAN_ABI, this.signer);

      // Verify contract is working
      const feeRate = await this.contract.platformFeeRate();
      logger.info('Flash loan service initialized:', {
        contractAddress: this.contractAddress,
        userAddress: this.userAddress,
        platformFeeRate: feeRate.toString()
      });

      this.isReady = true;
      return true;
    } catch (error) {
      logger.error('Failed to initialize real flash loan service:', error);
      this.isReady = false;
      return false;
    }
  }

  /**
   * Get platform fee rate from contract
   */
  async getPlatformFeeRate() {
    if (!this.isReady) return 0.2; // Default 0.2%
    
    try {
      const feeRate = await this.contract.platformFeeRate();
      return Number(feeRate) / 100; // Convert basis points to percentage
    } catch (error) {
      logger.error('Error getting platform fee rate:', error);
      return 0.2;
    }
  }

  /**
   * Calculate fees using smart contract
   */
  async calculateFees(amount, decimals) {
    try {
      const amountWei = ethers.parseUnits(amount.toString(), decimals);
      const [platformFee, aaveFee] = await this.contract.getTotalFees(amountWei);
      
      return {
        platformFee: ethers.formatUnits(platformFee, decimals),
        aaveFee: ethers.formatUnits(aaveFee, decimals),
        totalFees: ethers.formatUnits(platformFee + aaveFee, decimals),
        platformFeeWei: platformFee,
        aaveFeeWei: aaveFee
      };
    } catch (error) {
      logger.error('Error calculating fees:', error);
      // Fallback calculation
      const amountFloat = parseFloat(amount);
      const platformFee = amountFloat * 0.002; // 0.2%
      const aaveFee = amountFloat * 0.0009; // 0.09%
      
      return {
        platformFee: platformFee.toFixed(decimals === 18 ? 6 : 2),
        aaveFee: aaveFee.toFixed(decimals === 18 ? 6 : 2),
        totalFees: (platformFee + aaveFee).toFixed(decimals === 18 ? 6 : 2),
        platformFeeWei: ethers.parseUnits(platformFee.toString(), decimals),
        aaveFeeWei: ethers.parseUnits(aaveFee.toString(), decimals)
      };
    }
  }

  /**
   * Check user balance and allowance
   */
  async checkUserBalance(assetAddress, amount) {
    try {
      const tokenContract = new ethers.Contract(assetAddress, ERC20_ABI, this.provider);
      const balance = await tokenContract.balanceOf(this.userAddress);
      const allowance = await tokenContract.allowance(this.userAddress, this.contractAddress);
      const decimals = await tokenContract.decimals();
      
      const fees = await this.calculateFees(amount, decimals);
      const requiredAmount = fees.platformFeeWei + fees.aaveFeeWei;
      
      return {
        hasBalance: balance >= requiredAmount,
        hasAllowance: allowance >= requiredAmount,
        balance: ethers.formatUnits(balance, decimals),
        allowance: ethers.formatUnits(allowance, decimals),
        requiredFee: fees.platformFee
      };
    } catch (error) {
      logger.error('Error checking user balance:', error);
      return { 
        hasBalance: false, 
        hasAllowance: false,
        balance: '0', 
        allowance: '0',
        requiredFee: '0' 
      };
    }
  }

  /**
   * Approve token spending
   */
  async approveToken(assetAddress, amount) {
    try {
      const tokenContract = new ethers.Contract(assetAddress, ERC20_ABI, this.signer);
      const decimals = await tokenContract.decimals();
      const fees = await this.calculateFees(amount, decimals);
      const approveAmount = fees.platformFeeWei + fees.aaveFeeWei;
      
      const tx = await tokenContract.approve(this.contractAddress, approveAmount);
      await tx.wait();
      
      return {
        success: true,
        transactionHash: tx.hash
      };
    } catch (error) {
      logger.error('Error approving token:', error);
      throw error;
    }
  }

  /**
   * Execute real flash loan using smart contract
   */
  async executeRealFlashLoan(assetAddress, amount, options = {}) {
    if (!this.isReady) throw new Error('Service not initialized');
    
    const asset = this.getAssetInfo(assetAddress);
    if (!asset) throw new Error('Unsupported asset');
    
    try {
      if (options.onStart) options.onStart();
      
      // Step 1: Check balance and allowance
      if (options.onProgress) options.onProgress('Checking balance and allowance...');
      const balanceCheck = await this.checkUserBalance(assetAddress, amount);
      
      if (!balanceCheck.hasBalance) {
        throw new Error(`Insufficient balance. Need ${balanceCheck.requiredFee} ${asset.symbol} for fees`);
      }

      // Step 2: Approve token if needed
      if (!balanceCheck.hasAllowance) {
        if (options.onProgress) options.onProgress('Approving token spending...');
        await this.approveToken(assetAddress, amount);
      }

      // Step 3: Execute flash loan through smart contract
      if (options.onProgress) options.onProgress('Executing flash loan...');
      
      const amountWei = ethers.parseUnits(amount.toString(), asset.decimals);
      const params = "0x"; // Empty params for simple flash loan
      
      // Use simpleFlashLoan for easier implementation
      const tx = await this.contract.simpleFlashLoan(assetAddress, amountWei);
      
      if (options.onProgress) options.onProgress('Waiting for confirmation...');
      const receipt = await tx.wait();
      
      // Parse events to get fee information
      const fees = await this.calculateFees(amount, asset.decimals);
      
      return {
        success: true,
        transactionHash: tx.hash,
        mode: 'real_aave',
        fees: fees,
        message: `Real flash loan executed! Borrowed ${amount} ${asset.symbol} from Aave.`,
        collectedFee: fees.platformFee,
        gasUsed: receipt.gasUsed.toString()
      };
      
    } catch (error) {
      logger.error('Real flash loan execution failed:', error);
      throw error;
    }
  }

  /**
   * Demo mode for testing
   */
  async executeDemoFlashLoan(assetAddress, amount, options = {}) {
    const asset = this.getAssetInfo(assetAddress);
    if (!asset) throw new Error('Unsupported asset');

    const fees = await this.calculateFees(amount, asset.decimals);

    // Simulate the process
    if (options.onStart) options.onStart();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (options.onProgress) options.onProgress('Checking smart contract...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (options.onProgress) options.onProgress('Simulating Aave flash loan...');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (options.onProgress) options.onProgress('Demo completed!');
    
    const fakeHash = '0x' + Math.random().toString(16).substr(2, 64);
    
    return {
      success: true,
      transactionHash: fakeHash,
      mode: 'demo',
      fees: fees,
      message: `Demo: Would borrow ${amount} ${asset.symbol} from Aave via smart contract`
    };
  }

  /**
   * Get asset information
   */
  getAssetInfo(assetAddress) {
    return Object.values(SUPPORTED_ASSETS).find(a => 
      a.address.toLowerCase() === assetAddress.toLowerCase()
    );
  }

  /**
   * Get contract information
   */
  async getContractInfo() {
    if (!this.isReady) return null;
    
    try {
      const feeWallet = await this.contract.feeWallet();
      const platformFeeRate = await this.contract.platformFeeRate();
      const owner = await this.contract.owner();
      
      return {
        contractAddress: this.contractAddress,
        feeWallet,
        platformFeeRate: platformFeeRate.toString(),
        owner
      };
    } catch (error) {
      logger.error('Error getting contract info:', error);
      return null;
    }
  }

  /**
   * Check if contract is deployed and working
   */
  async isContractDeployed() {
    try {
      const contractAddress = process.env.REACT_APP_FLASH_LOAN_CONTRACT;
      if (!contractAddress) return false;
      
      const provider = new ethers.JsonRpcProvider('https://eth-mainnet.public.blastapi.io');
      const code = await provider.getCode(contractAddress);
      return code !== '0x';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get supported assets
   */
  getSupportedAssets() {
    return SUPPORTED_ASSETS;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    this.provider = null;
    this.signer = null;
    this.userAddress = null;
    this.contract = null;
    this.isReady = false;
  }
}

// Export singleton instance
const realFlashLoanService = new RealFlashLoanService();
export default realFlashLoanService; 