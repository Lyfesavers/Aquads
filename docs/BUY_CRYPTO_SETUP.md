# Buy Crypto Modal Setup Guide

## Current Implementation

The Buy Crypto feature uses a **modal popup** (like a Chrome extension) that opens on top of any page. Users can purchase cryptocurrency with fiat currency through trusted third-party providers **without leaving your platform**.

## How It Works

### User Experience:
1. User is on AquaSwap (or any page)
2. Clicks "💳 Buy with Card" button
3. **Modal pops up instantly** with embedded widget
4. User selects provider (MoonPay or Mercuryo)
5. Completes purchase in the embedded widget
6. Clicks outside modal or close button to dismiss
7. Returns to AquaSwap seamlessly

### Technical Flow:
- Modal is rendered globally in `App.js`
- State managed via `showBuyCryptoModal`
- Triggered by `onOpenBuyCrypto` callback
- Widget embedded via iframe
- No page navigation required

## Current Providers

### 1. MoonPay (Default)
- **URL**: Embedded widget
- **Coverage**: 160+ countries
- **Fees**: ~3.5-4.5%
- **Best For**: Widest coverage, most trusted
- **Features**: Credit/debit cards, bank transfers, Apple Pay, Google Pay

### 2. Mercuryo
- **URL**: Embedded widget  
- **Coverage**: 180+ countries
- **Fees**: ~3.95%
- **Best For**: Good rates, multiple payment methods
- **Features**: Credit/debit cards, SEPA, Faster Payments, Apple Pay

**Note**: Ramp Network removed as it doesn't work for this use case

## Features

### Modal Design
- **Chrome extension-like behavior** - Pops up over current page
- **Smooth animations** - Fade in overlay, slide up modal
- **Provider tabs** - Switch between MoonPay and Mercuryo
- **Responsive** - Works on mobile, tablet, desktop
- **ESC to close** - Keyboard shortcut support
- **Click outside to close** - Standard modal behavior

### User Benefits
- ✅ **Stay on platform** - No navigation away
- ✅ **Fast access** - Instant popup
- ✅ **Better context** - Can see AquaSwap in background
- ✅ **Smooth UX** - Like MetaMask or WalletConnect
- ✅ **Two providers** - Compare options quickly

## Technical Details

### Files
- `src/components/BuyCryptoModal.js` - Main modal component
- `src/components/BuyCryptoModal.css` - Modal styling
- `src/App.js` - Modal state and integration
- `src/components/AquaSwap.js` - Trigger buttons

### Integration
```javascript
// In App.js
const [showBuyCryptoModal, setShowBuyCryptoModal] = useState(false);

// Pass to components
<AquaSwap onOpenBuyCrypto={() => setShowBuyCryptoModal(true)} />

// Render modal globally
<BuyCryptoModal
  isOpen={showBuyCryptoModal}
  onClose={() => setShowBuyCryptoModal(false)}
/>
```

### No API Keys Required
- All providers work via direct iframe embeds
- No SDK integration needed
- No merchant accounts required
- No verification for you

### Security (CSP Headers)
Updated to allow:
- `https://*.moonpay.com`
- `https://buy.moonpay.com`
- `https://*.mercuryo.io`
- `https://exchange.mercuryo.io`

## Adding More Providers (Optional)

To add a new provider, update `src/components/BuyCryptoModal.js`:

```javascript
const providers = {
  // ... existing providers
  newprovider: {
    name: 'New Provider',
    embedUrl: 'https://provider.com/widget?params',
    color: '#FF0000'
  }
};
```

Then add a tab button:
```javascript
<button 
  className={`provider-tab ${selectedProvider === 'newprovider' ? 'active' : ''}`}
  onClick={() => setSelectedProvider('newprovider')}
  style={{ '--provider-color': providers.newprovider.color }}
>
  New Provider
</button>
```

Update CSP headers in:
- `server/index.js`
- `public/index.html`

## Usage Examples

### From AquaSwap
```javascript
// Button in AquaSwap component
<button onClick={onOpenBuyCrypto}>
  💳 Buy with Card
</button>
```

### From Other Components
1. Pass `onOpenBuyCrypto` prop from App.js
2. Call the function on button click
3. Modal opens automatically

### Direct State Access
```javascript
// If you have access to state
setShowBuyCryptoModal(true);
```

## Styling

### Modal Features
- **Dark gradient background** - Matches Web3 aesthetic
- **Glowing border** - Animated cyan/purple gradient
- **Provider tabs** - Color-coded by provider
- **Smooth animations** - Fade in, slide up effects
- **Responsive sizing** - Adapts to screen size
- **Z-index**: 9999 - Appears above everything

### Customization
Edit `src/components/BuyCryptoModal.css`:
- Colors: Search for `#00d4ff` (cyan) and `#7b61ff` (purple)
- Sizes: Adjust `.buy-crypto-modal` max-width
- Animations: Modify `@keyframes` rules
- Border radius: Change `border-radius` values

## Testing

1. Navigate to AquaSwap page
2. Click "💳 Buy with Card" button
3. Verify modal pops up smoothly
4. Test provider switching (MoonPay ↔ Mercuryo)
5. Test closing (ESC key, close button, click outside)
6. Test on mobile, tablet, desktop
7. Verify iframe loads widget correctly

## Benefits of Modal Approach

✅ **No Page Navigation** - Users stay on current page  
✅ **Instant Access** - No loading new page  
✅ **Better UX** - Like Chrome extension behavior  
✅ **Context Preservation** - Can see AquaSwap behind modal  
✅ **Faster** - No route changes or page reloads  
✅ **Modern** - Standard Web3 pattern (like wallet popups)  
✅ **Flexible** - Can be triggered from any component  

## Removed

- ❌ `/buy-crypto` route - No longer needed
- ❌ `BuyCryptoPage` component - Replaced with modal
- ❌ Page navigation approach - Modal-only now

## Support

Each provider has their own support:
- **MoonPay**: https://support.moonpay.com
- **Mercuryo**: https://help.mercuryo.io

Users should contact the provider directly if they have issues with their purchase.

## Future Enhancements

Potential improvements:
1. Add wallet address pre-fill if user is connected
2. Add transaction history in modal
3. Add more providers (Wyre, Simplex, etc.)
4. Add fiat currency selector
5. Add crypto amount presets
6. Add recent transactions section
