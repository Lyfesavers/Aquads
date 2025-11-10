# 🧪 Quick Testing Guide

## Step-by-Step Testing Instructions

### **1. Load Extension (2 minutes)**

```
1. Open Chrome browser
2. Type in address bar: chrome://extensions/
3. Click "Developer mode" toggle (top right) → Turn ON
4. Click "Load unpacked" button
5. Navigate to: C:\Users\Pharaoh\Desktop\Aquads\extension
6. Click "Select Folder"
```

✅ **Result:** AquaSwap icon should appear in your toolbar!

---

### **2. Basic Functionality Test (3 minutes)**

**Test 1: Popup Opens**
- Click the AquaSwap icon in toolbar
- ✅ Popup should open (400x600px)
- ✅ Should show loading screen briefly
- ✅ Should load swap interface

**Test 2: UI Check**
- ✅ Aquads logo visible in header
- ✅ Swap interface loads correctly
- ✅ Footer shows "Powered by Aquads"
- ✅ No visual glitches

**Test 3: External Link**
- Click the "↗" icon (open full site)
- ✅ Should open aquads.xyz in new tab

---

### **3. Wallet Connection Test (2 minutes)**

- In the popup, click "Connect Wallet"
- Select MetaMask (or your wallet)
- ✅ Wallet connection popup appears
- ✅ Can approve connection
- ✅ Wallet address shows in interface

---

### **4. Swap Functionality Test (5 minutes)**

**Important:** Test with small amounts first!

1. Select FROM token (e.g., ETH)
2. Enter small amount (e.g., 0.001 ETH)
3. Select TO token (e.g., USDC)
4. ✅ Swap preview should show
5. ✅ Gas estimate appears
6. ✅ 0.5% fee shown
7. Click "Swap"
8. ✅ Transaction popup appears
9. Approve transaction
10. ✅ Transaction processes
11. ✅ Success message shows

---

### **5. Error Handling Test (2 minutes)**

**Test 1: Network Error**
- Disconnect internet
- Open extension popup
- ✅ Should show error screen
- ✅ "Retry" button should appear
- Reconnect internet
- Click "Retry"
- ✅ Should reload successfully

**Test 2: Inspect Console**
- Right-click extension icon → "Inspect popup"
- Check console tab
- ✅ Should see: "🌊 AquaSwap Extension loaded"
- ✅ Should see: "✅ Iframe loaded successfully"
- ❌ Should NOT see any errors

---

### **6. Context Menu Test (1 minute)**

- Navigate to any website (e.g., google.com)
- Right-click anywhere on page
- ✅ Should see "Swap with AquaSwap" in menu
- Click it
- ✅ Extension popup should open

---

### **7. Cross-Site Test (2 minutes)**

Test that extension works on different sites:

1. Open https://twitter.com
   - Click extension → ✅ Works
   
2. Open https://coingecko.com
   - Click extension → ✅ Works
   
3. Open https://google.com
   - Click extension → ✅ Works

---

### **8. Reload Test (1 minute)**

After making any code changes:

1. Edit any file in `/extension` folder
2. Save the file
3. Go to `chrome://extensions/`
4. Find AquaSwap extension
5. Click ↻ (reload button)
6. Test again
7. ✅ Changes should be reflected

---

## 🐛 Troubleshooting

### **Problem: Popup is Blank**

**Solution:**
1. Right-click extension → "Inspect popup"
2. Check Console for errors
3. Verify iframe src URL is correct in popup.html
4. Check if aquads.xyz is accessible

### **Problem: Can't Load Extension**

**Solution:**
1. Verify you selected the `/extension` folder (not parent folder)
2. Check that manifest.json exists
3. Check manifest.json for syntax errors
4. Ensure Developer mode is ON

### **Problem: Icons Not Showing**

**Solution:**
1. Check that `/extension/icons/` folder exists
2. Verify icon files: icon16.png, icon48.png, icon128.png
3. Reload extension

### **Problem: Can't Connect Wallet**

**Solution:**
1. Check that MetaMask is installed
2. Verify permissions in manifest.json
3. Check Content Security Policy settings
4. Try different wallet (WalletConnect)

### **Problem: Iframe Won't Load**

**Solution:**
1. Check internet connection
2. Verify aquads.xyz/embed/aquaswap is accessible
3. Check browser console for CSP errors
4. Verify host_permissions in manifest.json

---

## ✅ Pre-Submission Checklist

Before uploading to Chrome Web Store:

**Functionality:**
- [ ] Extension loads without errors
- [ ] Popup opens correctly
- [ ] Wallet connects successfully
- [ ] Can perform test swap
- [ ] Error handling works
- [ ] Context menu appears
- [ ] External links work

**Visual:**
- [ ] Logo displays correctly
- [ ] UI is responsive
- [ ] No layout issues
- [ ] Loading animation works
- [ ] Colors match brand

**Technical:**
- [ ] No console errors
- [ ] No manifest warnings
- [ ] Icons are correct sizes
- [ ] Version number correct
- [ ] All files present

**Testing:**
- [ ] Tested on Chrome
- [ ] Tested on Edge (optional)
- [ ] Tested on 3+ websites
- [ ] Tested with real swap
- [ ] Tested error scenarios
- [ ] Had someone else test

**Documentation:**
- [ ] README.md complete
- [ ] Screenshots prepared
- [ ] Store description written
- [ ] GitHub updated (optional)

---

## 📸 Screenshots for Chrome Web Store

**Required: At least 1 screenshot (1280x800 or 640x400)**

### How to Take Screenshots:

1. Load extension
2. Click icon to open popup
3. Press `Win + Shift + S` (Windows Snipping Tool)
4. Select area
5. Save screenshot

### Recommended Screenshots:

1. **Main Interface**
   - Open popup
   - Show swap interface with tokens
   
2. **Wallet Connected**
   - Show connected wallet address
   - Show account balance
   
3. **Swap in Progress**
   - Show swap preview
   - Show gas estimates
   
4. **Success State**
   - Show successful swap message
   - Show transaction hash

---

## 🚀 Ready to Deploy?

Once all tests pass:

```powershell
# Create ZIP file
cd C:\Users\Pharaoh\Desktop\Aquads\extension
Compress-Archive -Path * -DestinationPath ..\aquaswap-extension.zip -Force
```

Then upload `aquaswap-extension.zip` to Chrome Web Store!

---

## 📊 Test Results Template

Copy this and fill out as you test:

```
AQUASWAP EXTENSION TEST RESULTS
Date: _______________
Tester: _______________

✅ Extension loads
✅ Popup opens
✅ Wallet connects
✅ Swap works
✅ Error handling
✅ Context menu
✅ Cross-site testing
✅ No console errors

ISSUES FOUND:
1. _______________
2. _______________
3. _______________

NOTES:
_______________
_______________
_______________

READY FOR DEPLOYMENT: YES / NO
```

---

Good luck! 🌊🚀

