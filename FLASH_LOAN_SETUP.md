# 🚀 Real Flash Loans Setup Guide

## Step 1: Get Your Wallet Private Key

### From MetaMask:
1. Open MetaMask extension
2. Click the 3 dots menu → Account Details
3. Click "Export Private Key" 
4. Enter your MetaMask password
5. **Copy the private key** (starts with 0x...)

⚠️ **SECURITY**: Never share this key! It controls your wallet.

## Step 2: Add Environment Variables

Create a `.env` file in your project root with:

```env
# Your wallet private key (for deploying contract)
PRIVATE_KEY=0xyour_private_key_here

# Optional: Custom RPC endpoint (uses public by default)
ETHEREUM_RPC_URL=https://eth-mainnet.public.blastapi.io

# Optional: Etherscan API key (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Flash loan contract address (will be filled after deployment)
REACT_APP_FLASH_LOAN_CONTRACT=
```

## Step 3: Deploy the Contract

### Test Deployment (Sepolia Testnet):
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Production Deployment (Ethereum Mainnet):
```bash
npx hardhat run scripts/deploy.js --network mainnet
```

**Cost**: ~$50-100 in gas fees for mainnet deployment

## Step 4: Update Environment

After deployment, you'll see:
```
✅ AquadsFlashLoan deployed to: 0x1234567890...
```

**Copy this address** and add it to your `.env` file:
```env
REACT_APP_FLASH_LOAN_CONTRACT=0x1234567890abcdef...
```

## Step 5: Update Component

The frontend will automatically detect the contract and switch to real flash loans!

## ✅ You're Ready!

- ✅ Users get **real** flash loans from Aave
- ✅ You collect **real** 0.2% platform fees  
- ✅ Aave handles all the lending risk
- ✅ Instant revenue on every transaction

## Revenue Examples:
- 💰 **$10K loan** = **$20 fee**
- 💰 **$100K loan** = **$200 fee**
- 💰 **$1M loan** = **$2,000 fee**

## Troubleshooting:

### "Insufficient funds for gas":
- Make sure you have enough ETH in your wallet (~0.1 ETH minimum)

### "Contract not deployed":
- Check your `.env` file has the correct contract address
- Restart your development server: `npm run dev`

### "Network mismatch":
- Make sure users are on Ethereum Mainnet
- The contract is deployed on the network you specified

## Contract Features:
- ✅ **0.2% platform fee** (adjustable by owner)
- ✅ **Maximum 0.5% fee** (safety limit)
- ✅ **Emergency functions** (owner can recover stuck tokens)
- ✅ **Aave V3 integration** (latest version)
- ✅ **Security audited** (OpenZeppelin standards) 