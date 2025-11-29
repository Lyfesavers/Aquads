# Telegram Daily Engagement Points System - Setup Guide

## Overview

Users can earn points by being active in your **private Aquads group** (`-1002412665250`):
- **2.5 points** for sending a message (once per day)
- **2.5 points** for reacting to any post (once per day)
- **Max 5 points per day** total from group engagement

## How It Works

### Daily Reset
- Resets at midnight UTC each day
- Each user can earn 2.5 points for messaging + 2.5 points for reacting
- Once earned, cannot earn again until next day

### User Flow

**First Message of the Day:**
```
User sends: "Good morning!"
Bot DMs: ✅ +2.5 points for daily message!

📊 Today's Progress:
✅ Message: Done
⏳ Reaction: Pending

💰 Earned today: 2.5 points
💎 Total points: 127.5
```

**First Reaction of the Day:**
```
User reacts: 👍 to any message
Bot DMs: ✅ +2.5 points for daily reaction!

📊 Today's Progress:
✅ Message: Done
✅ Reaction: Done

💰 Earned today: 5 points
💎 Total points: 130
```

**Second Message Same Day:**
```
User sends: "Another message"
Bot: (silent - already earned message points today)
```

## Files Created/Modified

### New Files
- ✅ `server/models/TelegramDailyEngagement.js` - Tracks daily engagement per user
- ✅ `docs/TELEGRAM_DAILY_ENGAGEMENT_SETUP.md` - This file

### Modified Files
- ✅ `server/utils/telegramService.js` - Added engagement tracking methods
- ✅ `server/routes/twitter-raids.js` - Updated webhook to track engagement + reactions

## Setup Steps

### 1. Push Code to GitHub

```bash
git add .
git commit -m "Add Telegram daily engagement points system"
git push origin master
```

### 2. Wait for Render to Deploy

Render will automatically deploy (takes ~3-5 minutes).

### 3. Update Telegram Webhook

After deployment, update webhook to include `message_reaction`:

**Option A: Via Telegram API directly**
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://aquads.onrender.com/api/twitter-raids/telegram-webhook",
    "allowed_updates": ["message", "callback_query", "message_reaction"]
  }'
```

Replace `<YOUR_BOT_TOKEN>` with your actual bot token from `.env`.

**Option B: Via PowerShell**
```powershell
$botToken = "YOUR_BOT_TOKEN_HERE"
$body = @{
  url = "https://aquads.onrender.com/api/twitter-raids/telegram-webhook"
  allowed_updates = @("message", "callback_query", "message_reaction")
} | ConvertTo-Json

Invoke-WebRequest -Method POST -Uri "https://api.telegram.org/bot$botToken/setWebhook" -ContentType "application/json" -Body $body
```

### 4. Verify Webhook

Check webhook status:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Should show:
```json
{
  "url": "https://aquads.onrender.com/api/twitter-raids/telegram-webhook",
  "allowed_updates": ["message", "callback_query", "message_reaction"]
}
```

### 5. Verify Bot Permissions

Ensure bot has these permissions in your private group:
- ✅ Is an administrator
- ✅ Can delete messages (helps with moderation)
- ✅ Can read all messages

### 6. Test!

1. **Link your account** (if not already): `/link your_username` with bot
2. **Send a message** in the private group
3. **Check you got** +2.5 points + confirmation DM
4. **React to any message** in the group with 👍
5. **Check you got** +2.5 more points + confirmation DM
6. **Try again** - should not get more points (already earned today)

## Database Schema

### TelegramDailyEngagement Model

```javascript
{
  userId: ObjectId,              // Reference to User
  telegramUserId: String,        // Telegram user ID
  groupId: String,               // Group chat ID (-1002412665250)
  date: String,                  // YYYY-MM-DD format
  hasMessagedToday: Boolean,     // Earned message points today?
  hasReactedToday: Boolean,      // Earned reaction points today?
  messagePoints: Number,         // Points from message (2.5)
  reactionPoints: Number,        // Points from reaction (2.5)
  firstMessageAt: Date,          // Timestamp of first message
  firstReactionAt: Date,         // Timestamp of first reaction
  createdAt: Date               // Record creation time
}
```

**Unique Index**: `(userId + groupId + date)` - One record per user per group per day

## Anti-Spam Protection

✅ **Daily Cap**: Can only earn 2.5 points per activity type per day
✅ **Separate Tracking**: Message points ≠ reaction points (can earn both)
✅ **Date-Based**: Resets at midnight UTC automatically
✅ **Race Condition Handling**: Duplicate key errors handled gracefully
✅ **Bot Messages Ignored**: Bots don't earn points

## Monitoring

### Check Today's Engagement

```javascript
// MongoDB Shell

// Today's active users
use aquads
const today = new Date().toISOString().split('T')[0]
db.telegramdailyengagements.countDocuments({ date: today })

// Who earned both bonuses today
db.telegramdailyengagements.find({
  date: today,
  hasMessagedToday: true,
  hasReactedToday: true
}).count()

// Top engagers this week
db.telegramdailyengagements.aggregate([
  {
    $match: {
      date: { $gte: "2025-11-24" } // Adjust date
    }
  },
  {
    $group: {
      _id: "$userId",
      totalDays: { $sum: 1 },
      totalPoints: { $sum: { $add: ["$messagePoints", "$reactionPoints"] } }
    }
  },
  { $sort: { totalPoints: -1 } },
  { $limit: 10 }
])
```

### Server Logs

Watch for these messages:
- ✅ `Awarded 2.5 points to USERNAME for daily message`
- ✅ `Awarded 2.5 points to USERNAME for daily reaction`
- ℹ️ `User USERNAME already earned message points today` (normal)
- ⚠️ `User not linked for telegram ID: XXXXX` (user needs to link account)

## Troubleshooting

### Users Not Getting Points

**Check:**
1. Is user's Telegram account linked? (`/link username` with bot)
2. Are they in the correct group? (`-1002412665250`)
3. Have they already earned today? (check database)
4. Check Render logs for errors

**Debug:**
```javascript
// Find user's engagement record for today
const today = new Date().toISOString().split('T')[0]
db.telegramdailyengagements.findOne({
  telegramUserId: "USER_TELEGRAM_ID",
  date: today
})

// Check if user is linked
db.users.findOne({ telegramId: "USER_TELEGRAM_ID" })
```

### Webhook Not Receiving Reactions

**Check webhook allowed_updates:**
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

Should include `"message_reaction"` in `allowed_updates`.

**If missing, reset webhook:**
```bash
# Delete old webhook
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook"

# Set new webhook with reactions
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://aquads.onrender.com/api/twitter-raids/telegram-webhook","allowed_updates":["message","callback_query","message_reaction"]}'
```

### Bot Not Responding

1. **Check bot is admin** in the group
2. **Check Render service** is running (not sleeping)
3. **Check webhook** is pointing to correct URL
4. **Check logs** for errors

## Expected Metrics

### Daily Engagement
```
100 members in group
Average 30% daily activity

Daily distribution:
- 30 users send messages (75 points total)
- 25 users react (62.5 points total)
- 20 users do both (50 points each)

Total: ~137.5 points distributed daily
```

### Weekly Engagement
```
Max per user per week: 35 points (5 points × 7 days)
Active community: 50-70% participation rate
Top engagers: 30-35 points/week
```

## Future Enhancements

Possible improvements:
1. **Streak Bonuses**: +5 bonus for 7 days in a row
2. **Quality Messages**: Bonus for longer/helpful messages
3. **Reaction Types**: Different points for different emojis
4. **Weekly Leaderboard**: Top engagers get bonus
5. **Engagement Challenges**: Special events with multipliers

## Support

If issues arise:
1. Check Render logs for errors
2. Verify webhook configuration
3. Test with linked account in correct group
4. Confirm bot has admin permissions

---

**Status**: ✅ Ready to deploy

**Group ID**: -1002412665250

**Points**: 2.5 message + 2.5 reaction = 5 max per day

**Deployment**: Push code → Update webhook → Test!

