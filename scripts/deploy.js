const hre = require("hardhat");
const { ethers } = require("hardhat");

// Aave V3 addresses on Ethereum mainnet
const AAVE_V3_POOL_ADDRESSES_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";

// Your fee wallet address (from environment variables only)
const FEE_WALLET = process.env.REACT_APP_FEE_WALLET;

async function main() {
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  
  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  
  if (balance < ethers.parseEther("0.1")) {
    throw new Error("Insufficient balance for deployment. Need at least 0.1 ETH for gas fees.");
  }
  
  // Deploy the contract
  const AquadsFlashLoan = await ethers.getContractFactory("AquadsFlashLoan");
  const flashLoan = await AquadsFlashLoan.deploy(
    AAVE_V3_POOL_ADDRESSES_PROVIDER,
    FEE_WALLET
  );
  
  await flashLoan.waitForDeployment();
  
  const contractAddress = await flashLoan.getAddress();
  
  // Verify contract configuration
  const feeWallet = await flashLoan.feeWallet();
  const platformFeeRate = await flashLoan.platformFeeRate();
  const owner = await flashLoan.owner();
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress: contractAddress,
    network: hre.network.name,
    deployer: deployer.address,
    feeWallet: feeWallet,
    platformFeeRate: platformFeeRate.toString(),
    deploymentTime: new Date().toISOString(),
    aaveProvider: AAVE_V3_POOL_ADDRESSES_PROVIDER,
    abi: flashLoan.interface.formatJson()
  };
  
  const fs = require('fs');
  fs.writeFileSync('flash-loan-deployment.json', JSON.stringify(deploymentInfo, null, 2));
  
  return deploymentInfo;
}

// Error handling
main()
  .then((info) => {
    process.exit(0);
  })
  .catch((error) => {
    throw error;
  });