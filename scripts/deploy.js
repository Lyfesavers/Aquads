const hre = require("hardhat");
const { ethers } = require("hardhat");

// Aave V3 addresses on Ethereum mainnet
const AAVE_V3_POOL_ADDRESSES_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";

// Your fee wallet address (from config)
const FEE_WALLET = process.env.REACT_APP_FEE_WALLET || "0x98BC1BEC892d9f74B606D478E6b45089D2faAB05";

async function main() {
  console.log("🚀 Deploying AquadsFlashLoan contract...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.1")) {
    console.log("⚠️  WARNING: Low balance! You might need more ETH for gas fees.");
  }
  
  console.log("📋 Configuration:");
  console.log("   - Aave V3 Pool Provider:", AAVE_V3_POOL_ADDRESSES_PROVIDER);
  console.log("   - Fee Wallet:", FEE_WALLET);
  console.log("   - Platform Fee Rate: 0.2%");
  
  // Deploy the contract
  console.log("\n⏳ Deploying contract...");
  
  const AquadsFlashLoan = await ethers.getContractFactory("AquadsFlashLoan");
  const flashLoan = await AquadsFlashLoan.deploy(
    AAVE_V3_POOL_ADDRESSES_PROVIDER,
    FEE_WALLET
  );
  
  console.log("⏳ Waiting for deployment confirmation...");
  await flashLoan.waitForDeployment();
  
  const contractAddress = await flashLoan.getAddress();
  console.log("✅ AquadsFlashLoan deployed to:", contractAddress);
  
  // Verify contract configuration
  console.log("\n🔍 Verifying contract configuration...");
  
  const feeWallet = await flashLoan.feeWallet();
  const platformFeeRate = await flashLoan.platformFeeRate();
  const owner = await flashLoan.owner();
  
  console.log("   - Fee Wallet:", feeWallet);
  console.log("   - Platform Fee Rate:", platformFeeRate.toString(), "basis points (", (Number(platformFeeRate) / 100).toFixed(1), "%)");
  console.log("   - Contract Owner:", owner);
  
  // Test fee calculation
  console.log("\n💰 Example fee calculations:");
  const testAmounts = [1000, 10000, 100000, 1000000];
  
  for (const amount of testAmounts) {
    const [platformFee, aaveFee] = await flashLoan.getTotalFees(ethers.parseUnits(amount.toString(), 6)); // USDC has 6 decimals
    console.log(`   - $${amount.toLocaleString()} USDC: Platform fee $${ethers.formatUnits(platformFee, 6)}, Aave fee $${ethers.formatUnits(aaveFee, 6)}`);
  }
  
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
  
  console.log("\n📄 Deployment info saved to: flash-loan-deployment.json");
  
  console.log("\n🎉 Deployment Complete!");
  console.log("📋 Next steps:");
  console.log("   1. Add contract address to your .env file:");
  console.log(`      REACT_APP_FLASH_LOAN_CONTRACT=${contractAddress}`);
  console.log("   2. Update your frontend to use the real contract");
  console.log("   3. Test with small amounts first");
  
  if (hre.network.name === "mainnet") {
    console.log("\n⚠️  MAINNET DEPLOYMENT - Please verify:");
    console.log("   - Contract address:", contractAddress);
    console.log("   - Fee wallet:", feeWallet);
    console.log("   - Owner address:", owner);
    console.log("   - Consider verifying on Etherscan");
  }
  
  // If on a testnet, provide some helpful info
  if (hre.network.name === "sepolia") {
    console.log("\n🧪 TESTNET DEPLOYMENT");
    console.log("   - You can test with testnet tokens");
    console.log("   - Get testnet ETH from: https://sepoliafaucet.com/");
    console.log("   - Get testnet USDC from Aave faucet");
  }
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 