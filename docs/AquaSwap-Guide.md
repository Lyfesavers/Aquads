# AquaSwap Implementation Guide

## Overview

AquaSwap is a custom DEX integration that uses the li.fi API to provide cross-chain swaps with a 0.5% fee that goes to the platform. This document explains how to set up and maintain the AquaSwap feature.

## Setup

1. **Create an API key:**
   - Sign up at [li.fi](https://li.fi) and create an API key
   - Add it to your environment variables as `REACT_APP_LIFI_API_KEY`

2. **Set Fee Recipient:**
   - Configure the fee recipient wallet address as `REACT_APP_FEE_WALLET`
   - The default is set to `0x98BC1BEC892d9f74B606D478E6b45089D2faAB05`

3. **Logo Files:**
   - The AquaSwap logo is available as an SVG at `/public/AquaSwap.svg`
   - You may want to create a PNG fallback at `/public/AquaSwap.png`

## How It Works

### Fee Mechanism

The 0.5% fee is implemented at the API request level by including the `fee` parameter:

```javascript
const feeAmount = parseFloat(fromAmount) * (FEE_PERCENTAGE / 100);

// Request quote from li.fi with fee
const response = await axios.get('https://li.quest/v1/quote', {
  headers: {
    'x-lifi-api-key': LIFI_API_KEY
  },
  params: {
    // ... other params
    fee: feeAmount.toString(),
    integrator: 'AquaSwap',
    referrer: FEE_RECIPIENT
  }
});
```

### Integration Points

1. **DEX Options Array** (TokenList.js):
   - Added as an option in the `DEX_OPTIONS` array
   - Has a `custom: true` flag to trigger redirect

2. **Swap Component** (Swap.js):
   - Standalone component handling li.fi integration
   - Allows token selection and cross-chain swaps

3. **Router** (App.js):
   - Route at `/swap` renders the Swap component

## Maintenance

### API Version Updates

Li.fi may update their API. Key endpoints used:
- `https://li.quest/v1/chains` - Get supported chains
- `https://li.quest/v1/tokens` - Get supported tokens
- `https://li.quest/v1/quote` - Get swap quotes

### Fee Adjustments

To change the fee percentage, update the `FEE_PERCENTAGE` constant in `src/components/Swap.js`. The current value is `0.5` (for 0.5%).

## Troubleshooting

- **No chains or tokens loading:** Check API key and network connectivity
- **Quotation errors:** Verify input amounts and token availability
- **Transaction errors:** Check wallet connection and approval status

## Security Considerations

- The `REACT_APP_` prefix makes the API key visible in client-side code. Consider implementing server-side proxying for production
- Regular monitoring of the fee recipient wallet is recommended

## Resources

- [Li.fi Documentation](https://docs.li.fi/)
- [Li.fi API Reference](https://apidocs.li.fi/) 