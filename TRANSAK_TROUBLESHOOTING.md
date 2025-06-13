# Transak Integration Troubleshooting

## New Relic Script Errors (Console Warnings)

### What You Might See
If you open your browser's developer console while using the Transak buy-crypto feature, you might see errors like:
```
Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
js-agent.newrelic.com/nr-spa-1.262.0.min.js:1
ChunkLoadError: Loading chunk 478 failed.
New Relic: A problem occurred when starting up session manager.
```

### Why This Happens
- **Transak** (the third-party payment provider) uses **New Relic** for analytics and monitoring
- **Ad blockers** and browser privacy extensions often block New Relic scripts
- This is completely **normal** and **expected** behavior

### Important: This Does NOT Affect Functionality
- ✅ **Crypto purchases work perfectly** despite these console errors
- ✅ **Payment processing is unaffected**
- ✅ **Security is not compromised**
- ✅ **All Transak features remain fully functional**

### What We've Done to Handle This
1. **Double Iframe Integration**: Implemented [Transak's recommended double iframe method](https://docs.transak.com/docs/double-embed-iframe-webapp) for better isolation
2. **Enhanced Error Handling**: Multiple layers of error suppression in both outer and inner iframes
3. **Script Isolation**: Better separation prevents third-party script conflicts from affecting the main application
4. **User Messaging**: Clear notices that any remaining errors are harmless
5. **Graceful Degradation**: The Transak widget works perfectly without New Relic analytics
6. **CSP Headers**: Configured Content Security Policy to handle third-party scripts properly

### For Developers
The enhanced error handling is implemented in:
- `src/App.js` - Global error handlers for New Relic script failures
- `src/components/TransakPage.js` - Double iframe implementation with enhanced error handling
- `public/index.html` - CSP headers to manage third-party script loading
- **Outer iframe HTML** - Embedded error handling within the iframe isolation layer

### If You Want to Stop Seeing These Errors
1. **Disable your ad blocker** temporarily (not recommended for security)
2. **Whitelist New Relic domains** in your ad blocker:
   - `js-agent.newrelic.com`
   - `*.newrelic.com`
3. **Use a different browser** without ad blocking extensions

### Technical Details
- New Relic is Transak's analytics service, not ours
- The script loading failure is handled gracefully by both Transak and our application
- No user data or functionality is lost when these scripts are blocked
- This is a common occurrence across the web when ad blockers are active

### Still Having Issues?
If you're experiencing actual functionality problems (not just console errors):
1. Try disabling browser extensions temporarily
2. Clear your browser cache and cookies
3. Try a different browser or incognito mode
4. Contact support with specific details about what's not working

Remember: Console errors about blocked scripts are **cosmetic issues only** and do not indicate any real problems with the application. 