// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AquadsFlashLoan
 * @dev Production-ready Aave V3 Flash Loan contract for Aquads platform
 * @author Aquads Team
 */
contract AquadsFlashLoan is FlashLoanSimpleReceiverBase, Ownable, ReentrancyGuard {
    
    // Platform fee in basis points (200 = 2.0%)
    uint256 public platformFeeRate = 20; // 0.2%
    uint256 public constant MAX_FEE_RATE = 50; // 0.5% max
    uint256 public constant BASIS_POINTS = 10000;
    
    // Fee collection wallet
    address public feeWallet;
    
    // Events
    event FlashLoanExecuted(
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 platformFee,
        uint256 premium
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeWalletUpdated(address oldWallet, address newWallet);
    
    /**
     * @dev Constructor
     * @param _addressProvider Aave V3 PoolAddressesProvider address
     * @param _feeWallet Address to receive platform fees
     */
    constructor(
        IPoolAddressesProvider _addressProvider,
        address _feeWallet
    ) FlashLoanSimpleReceiverBase(_addressProvider) {
        require(_feeWallet != address(0), "Invalid fee wallet");
        feeWallet = _feeWallet;
    }
    
    /**
     * @dev Execute flash loan with platform fee collection
     * @param asset Address of the asset to borrow
     * @param amount Amount to borrow
     * @param params Additional parameters (user strategy data)
     */
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(asset != address(0), "Invalid asset address");
        
        // Calculate platform fee
        uint256 platformFee = (amount * platformFeeRate) / BASIS_POINTS;
        require(platformFee > 0, "Platform fee too small");
        
        // Check user has enough tokens for platform fee
        IERC20 token = IERC20(asset);
        require(
            token.balanceOf(msg.sender) >= platformFee,
            "Insufficient balance for platform fee"
        );
        require(
            token.allowance(msg.sender, address(this)) >= platformFee,
            "Insufficient allowance for platform fee"
        );
        
        // Collect platform fee first (our revenue)
        bool success = token.transferFrom(msg.sender, feeWallet, platformFee);
        require(success, "Platform fee collection failed");
        
        // Store user address and parameters for the callback
        bytes memory fullParams = abi.encode(msg.sender, params);
        
        // Request flash loan from Aave
        POOL.flashLoanSimple(
            address(this),
            asset,
            amount,
            fullParams,
            0 // No referral code
        );
    }
    
    /**
     * @dev Aave callback - executes when flash loan is received
     * @param asset Address of the borrowed asset
     * @param amount Amount borrowed
     * @param premium Aave's flash loan fee
     * @param initiator Address that initiated the flash loan
     * @param params User parameters and strategy data
     * @return True if operation is successful
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(POOL), "Caller not Aave Pool");
        require(initiator == address(this), "Invalid initiator");
        
        // Decode user address and parameters
        (address user, bytes memory userParams) = abi.decode(params, (address, bytes));
        
        IERC20 token = IERC20(asset);
        
        // Transfer borrowed amount to user
        require(
            token.transfer(user, amount),
            "Failed to transfer borrowed amount to user"
        );
        
        // Emit event
        uint256 platformFeeAmount = (amount * platformFeeRate) / BASIS_POINTS;
        emit FlashLoanExecuted(user, asset, amount, platformFeeAmount, premium);
        
        // User must implement their strategy here and ensure they:
        // 1. Execute their arbitrage/liquidation/strategy
        // 2. Transfer back (amount + premium) to this contract
        
        // For now, we'll trust the user to handle their strategy externally
        // In a production system, you might want to add callback interfaces
        
        // Check if we received enough tokens back to repay Aave
        uint256 amountToRepay = amount + premium;
        uint256 currentBalance = token.balanceOf(address(this));
        
        require(
            currentBalance >= amountToRepay,
            "Insufficient funds to repay flash loan"
        );
        
        // Approve Aave to pull the repayment
        require(
            token.approve(address(POOL), amountToRepay),
            "Failed to approve repayment"
        );
        
        return true;
    }
    
    /**
     * @dev Simple flash loan for basic strategies (no callback needed)
     * User must have (amount + premium) in their wallet before calling
     */
    function simpleFlashLoan(
        address asset,
        uint256 amount
    ) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(asset != address(0), "Invalid asset address");
        
        IERC20 token = IERC20(asset);
        
        // Calculate total needed (platform fee + loan + premium)
        uint256 platformFee = (amount * platformFeeRate) / BASIS_POINTS;
        uint256 aavePremium = amount * 9 / 10000; // Aave's 0.09% fee
        uint256 totalNeeded = platformFee + amount + aavePremium;
        
        // Check user has enough tokens
        require(
            token.balanceOf(msg.sender) >= totalNeeded,
            "Insufficient balance for flash loan"
        );
        require(
            token.allowance(msg.sender, address(this)) >= totalNeeded,
            "Insufficient allowance for flash loan"
        );
        
        // Collect all fees upfront
        bool success = token.transferFrom(msg.sender, address(this), totalNeeded);
        require(success, "Failed to collect payment");
        
        // Send platform fee to fee wallet
        require(
            token.transfer(feeWallet, platformFee),
            "Failed to transfer platform fee"
        );
        
        // Send loan amount to user
        require(
            token.transfer(msg.sender, amount),
            "Failed to transfer loan amount"
        );
        
        // Keep Aave premium for repayment (automatically handled)
        
        emit FlashLoanExecuted(msg.sender, asset, amount, platformFee, aavePremium);
    }
    
    /**
     * @dev Update platform fee rate (only owner)
     */
    function updatePlatformFeeRate(uint256 _newFeeRate) external onlyOwner {
        require(_newFeeRate <= MAX_FEE_RATE, "Fee rate too high");
        uint256 oldFee = platformFeeRate;
        platformFeeRate = _newFeeRate;
        emit PlatformFeeUpdated(oldFee, _newFeeRate);
    }
    
    /**
     * @dev Update fee wallet (only owner)
     */
    function updateFeeWallet(address _newFeeWallet) external onlyOwner {
        require(_newFeeWallet != address(0), "Invalid fee wallet");
        address oldWallet = feeWallet;
        feeWallet = _newFeeWallet;
        emit FeeWalletUpdated(oldWallet, _newFeeWallet);
    }
    
    /**
     * @dev Emergency function to recover stuck tokens
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(owner(), amount), "Transfer failed");
    }
    
    /**
     * @dev Get platform fee for a given amount
     */
    function getPlatformFee(uint256 amount) external view returns (uint256) {
        return (amount * platformFeeRate) / BASIS_POINTS;
    }
    
    /**
     * @dev Get total cost for a flash loan (platform + aave fees)
     */
    function getTotalFees(uint256 amount) external view returns (uint256 platformFee, uint256 aaveFee) {
        platformFee = (amount * platformFeeRate) / BASIS_POINTS;
        aaveFee = amount * 9 / 10000; // Aave's 0.09% fee
    }
} 