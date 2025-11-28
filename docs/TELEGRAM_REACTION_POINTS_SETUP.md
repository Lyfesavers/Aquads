# Telegram Reaction Points System - Setup Guide

## Overview

This system awards 1 point to users who react to posts in the Aquads Trending Channel (`-1003255823970`). Users can earn points by reacting to:
- Daily bubble summaries
- Vote notifications
- Any other messages posted to the trending channel

## How It Works

1. **One Point Per Post**: Each user can earn 1 point per message by reacting (only once per message)
2. **Any Reaction Counts**: 👍, ❤️, 🔥, or any other emoji reaction
3. **Must Be Linked**: Users must have their Telegram account linked to their Aquads account
4. **Natural Rate Limiting**: Posting frequency determines max points (e.g., 1 post/day = max 1 point/day per user)

## Files Created/Modified

### New Files
- ✅ `server/models/TelegramReaction.js` - Tracks reactions and prevents duplicates
- ✅ `server/routes/telegram.js` - Webhook handler for Telegram updates
- ✅ `docs/TELEGRAM_REACTION_POINTS_SETUP.md` - This file

### Modified Files
- ✅ `server/utils/telegramService.js` - Added reaction handling methods
- ✅ `server/index.js` - Registered telegram routes
- ✅ Daily bubble summary messages - Now include "React for 1 point!"
- ✅ Vote notification messages - Now include "React for 1 point!"

## Setup Steps

### 1. Configure Environment Variables

Add to your `.env` file (if not already present):

```bash
# Telegram Bot Token (should already exist)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Webhook URL (NEW - add this)
TELEGRAM_WEBHOOK_URL=https://your-server.onrender.com/api/telegram/webhook
```

Replace `your-server.onrender.com` with your actual server domain.

### 2. Set Up Telegram Webhook

After deploying the code, configure the webhook by making a POST request:

**Option A: Using curl**
```bash
curl -X POST https://your-server.com/api/telegram/set-webhook
```

**Option B: Using browser**
Visit: `https://your-server.com/api/telegram/set-webhook` (will need to make POST request via tool like Postman)

**Option C: Manually via Telegram API**
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/api/telegram/webhook",
    "allowed_updates": ["message", "callback_query", "message_reaction"]
  }'
```

### 3. Verify Webhook Status

Check if webhook is configured correctly:

```bash
curl https://your-server.com/api/telegram/webhook-info
```

You should see:
```json
{
  "success": true,
  "webhookInfo": {
    "url": "https://your-server.com/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "allowed_updates": ["message", "callback_query", "message_reaction"]
  }
}
```

### 4. Bot Permissions

Ensure your bot has these permissions in the Trending Channel:
- ✅ Can post messages (should already have)
- ✅ Can pin messages (should already have)
- ✅ Can read message reactions (automatic with `message_reaction` update)

### 5. Test the System

1. **Post a test message** to the trending channel (or wait for automatic daily bubble summary)
2. **React to the message** with your Telegram account (must be linked to Aquads)
3. **Check your points** on https://aquads.xyz - you should see +1 point
4. **Try reacting again** - you won't get additional points (protected by database unique constraint)

## How Users Link Their Accounts

Users must link their Telegram to Aquads account:

1. Start chat with `@aquadsbumpbot`
2. Use command: `/link their_aquads_username`
3. System saves their `telegramId` in the User model

## Database Schema

### TelegramReaction Model

```javascript
{
  userId: ObjectId,           // Reference to User model
  telegramUserId: String,     // Telegram user ID
  messageId: String,          // Telegram message ID
  chatId: String,             // Trending channel ID
  points: Number,             // Points awarded (always 1)
  reactedAt: Date            // Timestamp
}
```

**Unique Index**: `(userId + messageId)` - Prevents duplicate point awards

## API Endpoints

### POST /api/telegram/webhook
- Receives updates from Telegram
- Handles messages, button clicks, and reactions
- Returns 200 OK immediately

### POST /api/telegram/set-webhook
- Configures Telegram webhook
- Sets allowed update types
- Returns configuration status

### GET /api/telegram/webhook-info
- Gets current webhook configuration
- Shows pending updates count
- Useful for debugging

## Troubleshooting

### Users Not Getting Points

**Check:**
1. Is user's Telegram account linked? (Check `User.telegramId` in database)
2. Is webhook receiving updates? (Check server logs for "handleReaction" messages)
3. Did user already react to this message? (Check `TelegramReaction` collection)

**Debug Steps:**
```bash
# 1. Check webhook status
curl https://your-server.com/api/telegram/webhook-info

# 2. Check server logs
# Look for: "✅ Awarded 1 point to USERNAME for reaction to message MESSAGEID"
# Or: "User not linked for telegram ID: XXXXXX"

# 3. Verify user is linked
# In MongoDB:
db.users.findOne({ telegramId: "USER_TELEGRAM_ID" })

# 4. Check reaction records
db.telegramreactions.find({ messageId: "MESSAGE_ID" })
```

### Webhook Not Working

**Common Issues:**
1. **HTTPS Required**: Telegram webhooks only work with HTTPS (Render provides this automatically)
2. **Wrong URL**: Make sure `TELEGRAM_WEBHOOK_URL` matches your deployed server
3. **Firewall/Blocking**: Ensure your server accepts POST requests from Telegram IPs

**Reset Webhook:**
```bash
# Delete existing webhook
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook"

# Set new webhook
curl -X POST https://your-server.com/api/telegram/set-webhook
```

### Database Errors

**Duplicate Key Error:**
- This is NORMAL - it means user tried to react twice to same message
- System prevents duplicate points automatically
- No action needed

**User Not Found:**
- User hasn't linked Telegram account
- Tell them to use `/link username` with bot

## Monitoring

### Track Reaction Activity

```javascript
// MongoDB queries

// Total reactions today
db.telegramreactions.countDocuments({
  reactedAt: { $gte: new Date(new Date().setHours(0,0,0,0)) }
})

// Top reactors
db.telegramreactions.aggregate([
  { $group: { _id: "$userId", count: { $sum: 1 }, points: { $sum: "$points" } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
])

// Reactions per message
db.telegramreactions.aggregate([
  { $group: { _id: "$messageId", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

### Server Logs

Look for these log messages:
- ✅ `Awarded 1 point to USERNAME for reaction to message MESSAGEID` - Success!
- ⚠️ `User not linked for telegram ID: XXXXX` - User needs to link account
- ℹ️ `User USERNAME already reacted to message MESSAGEID` - Duplicate attempt (normal)

## Future Enhancements

Possible improvements:
1. **Daily/Weekly Caps**: Limit max points per user per period
2. **Multipliers**: Special events with 2x or 3x points
3. **Streaks**: Bonus for reacting X days in a row
4. **Leaderboard**: Show top reactors
5. **Admin Dashboard**: View reaction analytics
6. **Specific Emoji Rewards**: Different points for different reactions (👍=1, 🔥=2, etc.)

## Support

If you encounter issues:
1. Check server logs for error messages
2. Verify webhook configuration with `/webhook-info`
3. Test with a simple message in trending channel
4. Ensure bot has all necessary permissions

---

**Status**: ✅ Fully implemented and ready to deploy

**Testing**: Test in trending channel after deployment

**Deployment**: Deploy to Render and run `/set-webhook` endpoint

