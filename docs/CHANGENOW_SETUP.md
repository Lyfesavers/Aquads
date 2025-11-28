# ChangeNOW Integration Setup

## Current Status
✅ ChangeNOW widget is integrated and working WITHOUT partner ID  
⏳ Partner ID can be added later to earn commission

## How to Add Partner ID (When Ready)

### Step 1: Sign Up for Affiliate Program
1. Go to: https://changenow.io/affiliate-program
2. Fill out the form with:
   - Your name
   - Email
   - Website: aquads.com
3. Get instant access to your dashboard
4. Copy your **Partner ID** (also called Affiliate ID)

### Step 2: Update the Code

Open `src/components/BuyCryptoPage.js` and find these lines:

```javascript
// ChangeNOW widget URLs - can add partner ID later
const changeNowBuyUrl = 'https://changenow.io/embeds/exchange-widget/v2/widget.html?FAQ=false&amount=100&amountFiat=100&from=usd&horizontal=false&lang=en&link_id=&locales=true&logo=false&primaryColor=00d4ff&to=eth&toTheMoon=true';

const changeNowExchangeUrl = 'https://changenow.io/embeds/exchange-widget/v2/widget.html?FAQ=false&amount=0.1&from=btc&horizontal=false&lang=en&link_id=&locales=true&logo=false&primaryColor=00d4ff&to=eth&toTheMoon=true';
```

Replace with (add your partner ID):

```javascript
// ChangeNOW widget URLs with partner tracking
const CHANGENOW_PARTNER_ID = 'YOUR_PARTNER_ID_HERE'; // Replace with actual ID

const changeNowBuyUrl = `https://changenow.io/embeds/exchange-widget/v2/widget.html?FAQ=false&amount=100&amountFiat=100&from=usd&horizontal=false&lang=en&link_id=${CHANGENOW_PARTNER_ID}&locales=true&logo=false&primaryColor=00d4ff&to=eth&toTheMoon=true`;

const changeNowExchangeUrl = `https://changenow.io/embeds/exchange-widget/v2/widget.html?FAQ=false&amount=0.1&from=btc&horizontal=false&lang=en&link_id=${CHANGENOW_PARTNER_ID}&locales=true&logo=false&primaryColor=00d4ff&to=eth&toTheMoon=true`;
```

### Step 3: Deploy
After adding your partner ID, redeploy the site and you'll start earning commission!

## Commission Structure
- **Revenue Share**: 75% of fees
- **Payment**: Monthly via crypto or bank transfer
- **Tracking**: Dashboard shows real-time statistics

## Widget Customization

You can customize the widget by changing these URL parameters:

- `amount`: Default fiat amount
- `from`: Default source currency (e.g., 'usd', 'eur', 'btc')
- `to`: Default destination currency (e.g., 'eth', 'btc', 'usdt')
- `primaryColor`: Widget color theme (currently set to Aquads blue: 00d4ff)
- `lang`: Language (e.g., 'en', 'es', 'fr')

## Testing
1. Test the widget with small amounts first
2. Verify transactions appear in your ChangeNOW dashboard
3. Confirm commission tracking is working

## Support
- ChangeNOW Support: https://changenow.io/faq
- Dashboard Login: https://changenow.io/login (after signing up)

