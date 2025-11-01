const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const User = require('../models/User');
const TwitterRaid = require('../models/TwitterRaid');
const FacebookRaid = require('../models/FacebookRaid');
const Ad = require('../models/Ad');
const BotSettings = require('../models/BotSettings');

const telegramService = {
  // Store group IDs where bot is active
  activeGroups: new Set(),
  
  // Trending channel ID for all vote notifications and daily bubble updates
  TRENDING_CHANNEL_ID: '-1003255823970',
  
  // Store message IDs for cleanup
  lastTrendingMessages: [],
  lastVoteMessages: [], // Store vote notification message IDs for cleanup

  // Load active groups from database
  loadActiveGroups: async () => {
    try {
      const settings = await BotSettings.findOne({ key: 'activeGroups' });
      if (settings && settings.value) {
        telegramService.activeGroups = new Set(settings.value);
        console.log(`Loaded ${telegramService.activeGroups.size} active groups from database`);
      }
    } catch (error) {
      console.error('Error loading active groups:', error);
    }
  },

  // Save active groups to database
  saveActiveGroups: async () => {
    try {
      const groupsArray = Array.from(telegramService.activeGroups);
      await BotSettings.findOneAndUpdate(
        { key: 'activeGroups' },
        { value: groupsArray, updatedAt: new Date() },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error saving active groups:', error);
    }
  },

  // Pin a message in a chat
  pinMessage: async (chatId, messageId) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) return false;

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/pinChatMessage`,
        {
          chat_id: chatId,
          message_id: messageId,
          disable_notification: false // Show notification about pinning
        }
      );

      if (response.data.ok) {
        console.log(`✅ Pinned message ${messageId} in chat ${chatId}`);
        return true;
      } else {
        console.log(`❌ Failed to pin message ${messageId} in chat ${chatId}: ${response.data.description}`);
        return false;
      }
    } catch (error) {
      // Don't log as error since pinning might fail due to permissions
      console.log(`⚠️ Could not pin message ${messageId} in chat ${chatId}: ${error.message}`);
      return false;
    }
  },

  sendRaidNotification: async (raidData) => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!botToken) {
        return false;
      }

      // Delete old raid messages first
      await telegramService.deleteOldRaidMessages();

      // Get all active groups (including the default chat ID)
      const groupsToNotify = new Set(telegramService.activeGroups);
      const defaultChatId = process.env.TELEGRAM_CHAT_ID;
      if (defaultChatId) {
        groupsToNotify.add(defaultChatId);
      }

      // Determine platform and construct appropriate message
      const isFacebook = raidData.platform === 'Facebook';
      const platformName = isFacebook ? 'Facebook Raid' : 'Twitter Raid';
      const postUrl = isFacebook ? raidData.postUrl : raidData.tweetUrl;
      const taskDescription = isFacebook ? 'Like, Share & Comment' : 'Like, Retweet & Comment';
      const actionDescription = isFacebook ? 'Like, Share & Comment on the Facebook raid above' : 'Like, Retweet & Comment on the tweet above';

      // Construct the message text
      const message = `🚀 New ${platformName} Available!

💰 Reward: ${raidData.points || 50} points
🎯 Task: ${taskDescription}

🔗 ${isFacebook ? 'Facebook Raid' : 'Tweet'}: ${postUrl}
🤖 Complete: @aquadsbumpbot

📋 Requirements:
• You MUST have an Aquads account to participate
• Link your account: /link your_aquads_username

💡 How to complete:
1. ${actionDescription}
2. Start a chat with @aquadsbumpbot
3. Use /raids to see available raids
4. Click "Complete" button or use /complete command

🌐 Track points & claim rewards on: https://aquads.xyz

⏰ Available for 48 hours!`;

      // Get the video file path
      const videoPath = path.join(__dirname, '../../public/RAIDNEW.mp4');
      const videoExists = fs.existsSync(videoPath);
      
      // Send to all groups
      let successCount = 0;
      for (const chatId of groupsToNotify) {
        try {
          if (videoExists) {
            // Send video with caption
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('video', fs.createReadStream(videoPath));
            formData.append('caption', message);

            const response = await axios.post(
              `https://api.telegram.org/bot${botToken}/sendVideo`,
              formData,
              {
                headers: {
                  ...formData.getHeaders(),
                },
                timeout: 30000, // 30 second timeout for video upload
              }
            );

            if (response.data.ok) {
              successCount++;
              const messageId = response.data.result.message_id;
              // Store message ID for cleanup
              await telegramService.storeRaidMessageId(chatId, messageId);
              // Pin the message
              await telegramService.pinMessage(chatId, messageId);
            }
          } else {
            // Send text message
            const result = await telegramService.sendTextMessage(botToken, chatId, message);
            if (result.success) {
              successCount++;
              // Store message ID for cleanup
              await telegramService.storeRaidMessageId(chatId, result.messageId);
              // Pin the message
              await telegramService.pinMessage(chatId, result.messageId);
            }
          }
        } catch (error) {
          console.error(`Failed to send to group ${chatId}:`, error.message);
          // Remove failed group from active groups
          telegramService.activeGroups.delete(chatId);
          // Save to database when removing group
          telegramService.saveActiveGroups();
        }
      }

      return successCount > 0;

    } catch (error) {
      console.error('Telegram notification failed:', error.message);
      return false;
    }
  },

  // Fallback method for text-only messages
  sendTextMessage: async (botToken, chatId, message) => {
    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
        }
      );

      if (response.data.ok) {
        return { success: true, messageId: response.data.result.message_id };
      } else {
        console.error('Telegram API error:', response.data);
        return { success: false };
      }
    } catch (error) {
      console.error('Telegram text notification failed:', error.message);
      return { success: false };
    }
  },

  startBot: async () => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const botDisabled = process.env.TELEGRAM_BOT_DISABLED === 'true';
    
    if (!botToken || botDisabled) {
      return false;
    }

    // Load active groups from database
    await telegramService.loadActiveGroups();

    // Test bot configuration
    try {
      const response = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`);
      if (!response.data.ok) {
        console.error('Bot configuration error:', response.data);
        return false;
      }
    } catch (error) {
      console.error('Bot test failed:', error.message);
      return false;
    }

    // Clear any existing webhook and set up new one
    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
        drop_pending_updates: true
      });
      
      // Set up webhook
      const webhookUrl = `${process.env.FRONTEND_URL || 'https://aquads.onrender.com'}/api/twitter-raids/telegram-webhook`;
      
      const setWebhookResult = await axios.post(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        url: webhookUrl,
        drop_pending_updates: true,
        allowed_updates: ['message', 'callback_query']
      });
      
      if (setWebhookResult.data.ok) {
        console.log('Telegram bot webhook configured successfully');
      } else {
        console.error('Failed to set webhook:', setWebhookResult.data.description);
      }
      
    } catch (error) {
      console.error('Failed to configure webhook:', error.message);
    }
    
    return true;
  },



  // Handle incoming commands
  handleCommand: async (message) => {
    const chatId = message.chat.id;
    const text = message.text.trim();
    const userId = message.from.id;
    const username = message.from.username;
    const chatType = message.chat.type;

    // Track group chats for notifications
    if (chatType === 'group' || chatType === 'supergroup') {
      telegramService.activeGroups.add(chatId.toString());
      // Save to database when adding new group
      telegramService.saveActiveGroups();
    }

    // Check if user is in conversation state
    const conversationState = telegramService.getConversationState(userId);
    
    if (conversationState && conversationState.action === 'waiting_username' && !text.startsWith('/')) {
      // User is providing Twitter username
      await telegramService.handleUsernameInput(chatId, userId, text, conversationState);
      return;
    }

    // Handle commands - redirect group commands to private chat (except /bubbles)
    if (chatType === 'group' || chatType === 'supergroup') {
      // In group chats, redirect most commands to private chat, but allow /bubbles
      if (text.startsWith('/start') || text.startsWith('/raids') || text.startsWith('/complete') || 
          text.startsWith('/link') || text.startsWith('/help') || text.startsWith('/cancel')) {
        
        await telegramService.sendBotMessage(chatId, 
          `💬 Please use bot commands in private chat to keep group conversations clean.\n\n🤖 Start a chat with @aquadsbumpbot and use: ${text}\n\n💡 This keeps group chats focused and gives you a better bot experience!\n\n🌐 Track points & claim rewards on: https://aquads.xyz`);
        return;
      }
    }

    // Handle commands in private chats (or if somehow we get here)
    if (text.startsWith('/start')) {
      await telegramService.handleStartCommand(chatId, userId, username, text);
    } else if (text.startsWith('/raids')) {
      await telegramService.handleRaidsCommand(chatId, userId);
    } else if (text.startsWith('/complete')) {
      await telegramService.handleCompleteCommand(chatId, userId, text);
    } else if (text.startsWith('/link')) {
      await telegramService.handleLinkCommand(chatId, userId, text);
    } else if (text.startsWith('/twitter')) {
      await telegramService.handleTwitterCommand(chatId, userId, text);
    } else if (text.startsWith('/facebook')) {
      await telegramService.handleFacebookCommand(chatId, userId, text);
    } else if (text.startsWith('/help')) {
      await telegramService.handleHelpCommand(chatId);
    } else if (text.startsWith('/bubbles')) {
      await telegramService.handleBubblesCommand(chatId);
    } else if (text.startsWith('/mybubble')) {
      await telegramService.handleMyBubbleCommand(chatId, userId);
    } else if (text.startsWith('/createraid')) {
      await telegramService.handleCreateRaidCommand(chatId, userId, text);
    } else if (text.startsWith('/cancel')) {
      // Cancel any ongoing conversation
      if (conversationState) {
        telegramService.clearConversationState(userId);
        await telegramService.sendBotMessage(chatId, "❌ Operation cancelled.");
      } else {
        await telegramService.sendBotMessage(chatId, "No active operation to cancel.");
      }
    } else {
      // Only respond if user is in conversation state (waiting for username input)
      if (conversationState) {
        const platform = conversationState.platform || 'Twitter';
        await telegramService.sendBotMessage(chatId, 
          `📝 Please provide your ${platform} username, or type /cancel to abort.`);
      }
      // No response for unknown commands to avoid interfering with group interactions
    }
  },

  // Handle /start command
  handleStartCommand: async (chatId, userId, username, text) => {
    // Check if this is a raid start command (from group chat redirect)
    const startMatch = text.match(/\/start raid_([a-f0-9]{24})/);
    
    if (startMatch) {
      const raidId = startMatch[1];
      await telegramService.startRaidCompletion(chatId, userId, raidId);
      return;
    }

    const message = `🚀 Welcome to Aquads Bot!

Hi ${username ? `@${username}` : 'there'}! I help you complete Twitter and Facebook raids and earn points.

📋 Requirements:
• You MUST have an Aquads account to participate
• Create account at: https://aquads.xyz

📋 Quick Start:
1. Link your account: /link your_aquads_username
2. Set your usernames: /twitter your_twitter_username and /facebook your_facebook_username
3. View raids: /raids
4. Complete raids: Use the "Complete in Private Chat" buttons

🔗 Available Commands:
• /link USERNAME - Link your Telegram to Aquads account
• /twitter [USERNAME] - Set or view your Twitter username for raids
• /facebook [USERNAME] - Set or view your Facebook username for raids
• /raids - View available Twitter and Facebook raids
• /createraid TWEET_URL - Create a new Twitter raid (2000 points)
• /mybubble - View your projects
• /help - Show detailed command guide

🌐 Track points & claim rewards on: https://aquads.xyz

💡 First step: Link your account with /link your_aquads_username, then set your usernames with /twitter your_twitter_username and /facebook your_facebook_username`;

    await telegramService.sendBotMessage(chatId, message);
  },

  // Handle /twitter command
  handleTwitterCommand: async (chatId, telegramUserId, text) => {
    try {
      // Check if user is linked
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      
      if (!user) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Please link your account first: /link your_username\n\n🌐 Create account at: https://aquads.xyz");
        return;
      }

      const parts = text.split(' ');
      
      if (parts.length === 1) {
        // Show current Twitter username
        if (user.twitterUsername) {
          await telegramService.sendBotMessage(chatId, 
            `📱 Your Twitter username: @${user.twitterUsername}\n\n💡 To change it: /twitter new_username`);
        } else {
          await telegramService.sendBotMessage(chatId, 
            `📱 No Twitter username set.\n\n💡 Set it: /twitter your_username\n\n💡 This will be used for all future raids!`);
        }
        return;
      }

      // Set new Twitter username
      const newUsername = parts[1].replace('@', '').trim();
      
      // Validate Twitter username format
      const usernameRegex = /^[a-zA-Z0-9_]{1,15}$/;
      if (!usernameRegex.test(newUsername)) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Invalid Twitter username. Use letters, numbers, underscores only (max 15 characters).");
        return;
      }

      // Update user's Twitter username
      user.twitterUsername = newUsername;
      await user.save();

      await telegramService.sendBotMessage(chatId, 
        `✅ Twitter username set: @${newUsername}\n\n💡 This will be used automatically for all future raids!`);

    } catch (error) {
      console.error('Twitter command error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error setting Twitter username. Please try again.");
    }
  },

  // Handle /facebook command
  handleFacebookCommand: async (chatId, telegramUserId, text) => {
    try {
      // Check if user is linked
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      
      if (!user) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Please link your account first: /link your_username\n\n🌐 Create account at: https://aquads.xyz");
        return;
      }

      const parts = text.split(' ');
      
      if (parts.length === 1) {
        // Show current Facebook username
        if (user.facebookUsername) {
          await telegramService.sendBotMessage(chatId, 
            `📱 Your Facebook username: @${user.facebookUsername}\n\n💡 To change it: /facebook new_username`);
        } else {
          await telegramService.sendBotMessage(chatId, 
            `📱 No Facebook username set.\n\n💡 Set it: /facebook your_username\n\n💡 This will be used for all future Facebook raids!`);
        }
        return;
      }

      // Set new Facebook username
      const newUsername = parts[1].replace('@', '').trim();
      
      // Validate Facebook username format
      const usernameRegex = /^[a-zA-Z0-9_]{1,15}$/;
      if (!usernameRegex.test(newUsername)) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Invalid Facebook username. Use letters, numbers, underscores only (max 15 characters).");
        return;
      }

      // Update user's Facebook username
      user.facebookUsername = newUsername;
      await user.save();

      await telegramService.sendBotMessage(chatId, 
        `✅ Facebook username set: @${newUsername}\n\n💡 This will be used automatically for all future Facebook raids!`);

    } catch (error) {
      console.error('Facebook command error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error setting Facebook username. Please try again.");
    }
  },

  // Handle /help command
  handleHelpCommand: async (chatId) => {
    const message = `📋 Aquads Bot - Complete Command Guide

📋 Requirements:
• You MUST have an Aquads account to participate
• Create account at: https://aquads.xyz

🔗 Account Commands:
• /link USERNAME - Link your Telegram to Aquads account (case sensitive)
• /twitter [USERNAME] - Set or view your Twitter username for raids
• /facebook [USERNAME] - Set or view your Facebook username for raids
• /help - Show this help message

📋 Raid Commands:
• /raids - View all available Twitter and Facebook raids
• /createraid TWEET_URL - Create a new Twitter raid (2000 points)

📋 Bubble Commands:
• /bubbles - View top 10 bubbles with most bullish votes
• /mybubble - View your projects with voting buttons

📝 Example Usage:
/link myusername
/twitter mytwitter
/facebook myfacebook
/raids
/bubbles
/mybubble
/createraid https://twitter.com/user/status/123456789

💡 How Raids Work:
1. Like, Retweet & Comment on Twitter posts OR Like, Share & Comment on Facebook posts
2. Use /raids to see available raids
3. Click "Complete in Private Chat" button (easiest way!)
4. Provide your username when prompted (or set it once with /twitter or /facebook)
5. Wait for admin approval to receive points

🚀 Getting Started:
1. Link your account: /link your_aquads_username
2. Set your usernames: /twitter your_twitter_username and /facebook your_facebook_username
3. View available raids: /raids
4. Complete raids using the "Complete in Private Chat" buttons
5. Create your own raids: /createraid (requires 2000 points)
6. View your projects: /mybubble

🌐 Track points & claim rewards on: https://aquads.xyz

⚠️ Important Notes:
• Username is case sensitive when linking
• You must manually interact with tweets before completing
• Raids expire after 48 hours
• Points are awarded after admin approval
• You can redeem points for gift cards and rewards on the website

💬 Need help? Contact support through the Aquads website.`;

    await telegramService.sendBotMessage(chatId, message);
  },

  // Handle /bubbles command
  handleBubblesCommand: async (chatId) => {
    try {
      await telegramService.sendTopBubblesNotification(chatId);
    } catch (error) {
      console.error('Bubbles command error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error fetching top bubbles. Please try again later.");
    }
  },

  // Handle /link command
  handleLinkCommand: async (chatId, telegramUserId, text) => {
    const parts = text.split(' ');
    
    if (parts.length < 2) {
      await telegramService.sendBotMessage(chatId, 
        "❌ Please provide your Aquads username.\n\n📝 Usage: /link your_aquads_username\n\n💡 Example: /link myusername");
      return;
    }

    const aquadsUsername = parts[1];

    try {
      // Check if this Telegram account is already linked to another user
      const existingLinkedUser = await User.findOne({ telegramId: telegramUserId.toString() });
      if (existingLinkedUser) {
        await telegramService.sendBotMessage(chatId, 
          `❌ Your Telegram is already linked to account: ${existingLinkedUser.username}\n\nTo link a different account, please contact support.`);
        return;
      }

      // Check if the username is already linked to another Telegram account
      const user = await User.findOne({ username: aquadsUsername });
      if (!user) {
        await telegramService.sendBotMessage(chatId, 
          `❌ User '${aquadsUsername}' not found. Please check your username.`);
        return;
      }

      if (user.telegramId) {
        await telegramService.sendBotMessage(chatId, 
          `❌ Account '${aquadsUsername}' is already linked to another Telegram account.\n\nIf this is your account, please contact support to unlink it.`);
        return;
      }

      // Link Telegram ID to user account
      user.telegramId = telegramUserId.toString();
      await user.save();

      await telegramService.sendBotMessage(chatId, 
        `✅ Account Successfully Linked!

🔗 Your Telegram is now linked to Aquads account: ${aquadsUsername}

🚀 You can now:
• /twitter your_username - Set your Twitter username for raids
• /raids - View available Twitter raids
• Complete raids using buttons or /complete command
• Earn points for completing raids

🌐 Track points & claim rewards on: https://aquads.xyz

💡 Next step: Set your Twitter username with /twitter your_twitter_username, then use /raids to see available raids!`);

    } catch (error) {
      console.error('Link command error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error linking account. Please try again later.");
    }
  },

  // Handle /raids command
  handleRaidsCommand: async (chatId, telegramUserId) => {
    try {
      // Check if user is linked
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      
      if (!user) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Please link your account first.\n\n📝 Use: /link your_aquads_username\n\n💡 You need to link your Aquads account before viewing raids.\n\n🌐 Create account at: https://aquads.xyz");
        return;
      }

      // Get active Twitter raids
      const twitterRaids = await TwitterRaid.find({ active: true })
        .sort({ createdAt: -1 })
        .limit(10);

      // Get active Facebook raids
      const facebookRaids = await FacebookRaid.find({ active: true })
        .sort({ createdAt: -1 })
        .limit(10);

      // Combine and sort all raids by creation date
      const allRaids = [
        ...twitterRaids.map(raid => ({ ...raid.toObject(), platform: 'Twitter' })),
        ...facebookRaids.map(raid => ({ ...raid.toObject(), platform: 'Facebook' }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      if (allRaids.length === 0) {
        await telegramService.sendBotMessage(chatId, 
          "📭 No active raids available right now.\n\n⏰ Check back later for new raids!\n\n💡 Raids are posted regularly throughout the day.\n\n🌐 Track your points on: https://aquads.xyz");
        return;
      }

      // Filter raids older than 2 days
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
      const activeRaids = allRaids.filter(raid => new Date(raid.createdAt) > twoDaysAgo);

      if (activeRaids.length === 0) {
        await telegramService.sendBotMessage(chatId, 
          "📭 No active raids available right now. Check back later!\n\n🌐 Track your points on: https://aquads.xyz");
        return;
      }

      // Filter out raids that the user has already completed
      const availableRaids = activeRaids.filter(raid => {
        const userCompleted = raid.completions.some(
          completion => completion.userId && completion.userId.toString() === user._id.toString()
        );
        return !userCompleted;
      });

      if (availableRaids.length === 0) {
        await telegramService.sendBotMessage(chatId, 
          "📭 No new raids available for you right now.\n\n⏰ Check back later for new raids!\n\n💡 You've completed all available raids.\n\n🌐 Track your points on: https://aquads.xyz");
        return;
      }

      // Send each available raid as separate message with button
      for (const raid of availableRaids) {
        const platform = raid.platform;
        const postUrl = platform === 'Facebook' ? raid.postUrl : raid.tweetUrl;
        const interactionNote = platform === 'Facebook' 
          ? '⚠️ IMPORTANT: You must manually LIKE, SHARE, COMMENT on the Facebook post before completing!'
          : '⚠️ IMPORTANT: You must manually LIKE, RETWEET, COMMENT & BOOKMARK the tweet before completing!';
        
        let message = `🚀 ${raid.title}\n\n`;
        message += `📱 Platform: ${platform}\n`;
        message += `💰 Reward: ${raid.points} points\n`;
        message += `🎯 Task: ${raid.description}\n`;
        message += `🔗 ${platform === 'Facebook' ? 'Facebook Post' : 'Tweet'}: ${postUrl}\n\n`;
        message += `${interactionNote}`;

        // Add button for completion
        const keyboard = {
          inline_keyboard: [[
            {
              text: "💬 Complete in Private Chat",
              url: `https://t.me/aquadsbumpbot?start=raid_${raid._id}`
            }
          ]]
        };

        await telegramService.sendBotMessageWithKeyboard(chatId, message, keyboard);
      }

      // Send summary
      const twitterCount = availableRaids.filter(raid => raid.platform === 'Twitter').length;
      const facebookCount = availableRaids.filter(raid => raid.platform === 'Facebook').length;
      
      await telegramService.sendBotMessage(chatId, 
        `📊 ${availableRaids.length} raids available for you (${twitterCount} Twitter, ${facebookCount} Facebook)\n\n💡 How to complete:\n• Click "Complete in Private Chat" button (easiest way!)\n\n⏰ Raids expire after 48 hours\n💡 Make sure to interact with posts before completing!\n\n🌐 Track points & claim rewards on: https://aquads.xyz`);

    } catch (error) {
      console.error('Raids command error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error fetching raids. Please try again later.");
    }
  },

  // Handle /complete command
  handleCompleteCommand: async (chatId, telegramUserId, text) => {
    const parts = text.split(' ');
    
    if (parts.length < 4) {
      await telegramService.sendBotMessage(chatId, 
        "❌ Incorrect usage.\n\n📝 Usage: /complete RAID_ID @username POST_URL\n\n💡 Example: /complete 507f1f77bcf86cd799439011 @mytwitter https://twitter.com/user/status/123456789\n💡 Example: /complete 507f1f77bcf86cd799439011 @myfacebook https://facebook.com/user/posts/123456789\n\n💡 Tip: Use /raids to get the correct raid ID and post URL.");
      return;
    }

    const raidId = parts[1].replace(/[\[\]]/g, ''); // Remove square brackets if present
    const username = parts[2].replace('@', ''); // Remove @ if present
    const postUrl = parts[3];

    // Validate ObjectId format
    if (!raidId || !/^[0-9a-fA-F]{24}$/.test(raidId)) {
      await telegramService.sendBotMessage(chatId, 
        "❌ Invalid raid ID format. Use /raids to get the correct raid ID.");
      return;
    }

    try {
      // Check if user is linked
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      
      if (!user) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Please link your account first: /link your_username\n\n🌐 Create account at: https://aquads.xyz");
        return;
      }

      // Try to find the raid in both Twitter and Facebook raids
      let raid = await TwitterRaid.findById(raidId);
      let platform = 'Twitter';
      let usernameField = 'twitterUsername';
      let postUrlField = 'tweetUrl';
      let postIdField = 'tweetId';
      
      if (!raid) {
        raid = await FacebookRaid.findById(raidId);
        platform = 'Facebook';
        usernameField = 'facebookUsername';
        postUrlField = 'postUrl';
        postIdField = 'postId';
      }
      
      if (!raid) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Raid not found. Use /raids to see available raids.");
        return;
      }

      if (!raid.active) {
        await telegramService.sendBotMessage(chatId, 
          "❌ This raid is no longer active.");
        return;
      }

      // Check if user already completed this raid
      const userCompleted = raid.completions.some(
        completion => completion.userId && completion.userId.toString() === user._id.toString()
      );

      if (userCompleted) {
        await telegramService.sendBotMessage(chatId, 
          "❌ You have already completed this raid!");
        return;
      }

      // Validate username
      const usernameRegex = /^[a-zA-Z0-9_]{1,15}$/;
      if (!usernameRegex.test(username)) {
        await telegramService.sendBotMessage(chatId, 
          `❌ Invalid ${platform} username. Please use letters, numbers, and underscores only (max 15 characters).`);
        return;
      }

      // Extract post ID from URL based on platform
      let postId = null;
      if (platform === 'Twitter') {
        const tweetIdMatch = postUrl.match(/\/status\/(\d+)/);
        if (!tweetIdMatch || !tweetIdMatch[1]) {
          await telegramService.sendBotMessage(chatId, 
            "❌ Invalid Twitter URL. Please provide a valid tweet URL.");
          return;
        }
        postId = tweetIdMatch[1];
      } else if (platform === 'Facebook') {
        const postIdMatch = postUrl.match(/\/posts\/(\d+)/);
        if (!postIdMatch || !postIdMatch[1]) {
          await telegramService.sendBotMessage(chatId, 
            "❌ Invalid Facebook URL. Please provide a valid Facebook post URL.");
          return;
        }
        postId = postIdMatch[1];
      }

      // Create completion record (similar to existing API)
      const completion = {
        userId: user._id,
        [usernameField]: username,
        [postUrlField]: postUrl,
        [postIdField]: postId,
        verificationCode: 'aquads.xyz',
        verificationMethod: 'manual',
        verified: true,
        approvalStatus: 'pending',
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        pointsAwarded: false,
        ipAddress: 'telegram',
        verificationNote: 'Submitted via Telegram bot',
        iframeVerified: false,
        iframeInteractions: 0,
        completedAt: new Date()
      };

      // Add completion to raid
      raid.completions.push(completion);
      await raid.save();

      // Update user's last activity
      await User.findByIdAndUpdate(user._id, {
        lastActivity: new Date()
      });

      await telegramService.sendBotMessage(chatId, 
        `✅ ${platform} Raid Submitted Successfully!

📝 ${platform}: @${username}
🔗 ${platform === 'Facebook' ? 'Facebook Post' : 'Tweet'}: ${postUrl}
⏳ Status: Pending admin approval
💰 Reward: ${raid.points} points (after approval)

📋 What happens next:
• Admin will review your submission
• Points will be awarded after verification
• You'll be notified when approved

🌐 Track points & claim rewards on: https://aquads.xyz

💡 Use /raids to see more available raids!`);

    } catch (error) {
      console.error('Complete command error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error completing raid. Please try again later.");
    }
  },

  // Send message to user
  sendBotMessage: async (chatId, message) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) return { success: false };

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
        }
      );

      if (response.data.ok) {
        return { success: true, messageId: response.data.result.message_id };
      } else {
        return { success: false };
      }
    } catch (error) {
      console.error('Bot message error:', error.message);
      return { success: false };
    }
  },

  // Convert blockchain names to chain format (same as website)
  getChainForBlockchain: (blockchain) => {
    const chainMap = {
      // Main blockchains from your BLOCKCHAIN_OPTIONS
      'ethereum': 'ether',
      'bsc': 'bnb',
      'polygon': 'polygon',
      'solana': 'solana',
      'avalanche': 'avalanche',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism',
      'base': 'base',
      'sui': 'sui',
      'near': 'near',
      'fantom': 'fantom',
      'tron': 'tron',
      'cronos': 'cronos',
      'celo': 'celo',
      'harmony': 'harmony',
      'polkadot': 'polkadot',
      'cosmos': 'cosmos',
      'aptos': 'aptos',
      'flow': 'flow',
      'cardano': 'cardano',
      'kaspa': 'kaspa',
      
      // Alternative naming variations
      'binance smart chain': 'bnb',
      'bnb chain': 'bnb',
      'binance': 'bnb',
      'eth': 'ether',
      'ethereum mainnet': 'ether',
      'matic': 'polygon',
      'polygon matic': 'polygon',
      'avax': 'avalanche',
      'ftm': 'fantom',
      'arb': 'arbitrum',
      'op': 'optimism'
    };
    
    const normalizedBlockchain = blockchain.toLowerCase().trim();
    const mappedChain = chainMap[normalizedBlockchain] || 'ether';
    
    return mappedChain;
  },

  // Send message with markdown support
  sendBotMessageWithMarkdown: async (chatId, message) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) return { success: false };

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }
      );

      if (response.data.ok) {
        return { success: true, messageId: response.data.result.message_id };
      } else {
        return { success: false };
      }
    } catch (error) {
      console.error('Bot markdown message error:', error.message);
      return { success: false };
    }
  },

  // Store raid message ID for cleanup
  storeRaidMessageId: async (chatId, messageId) => {
    try {
      const chatIdStr = chatId.toString();
      
      // Get existing message IDs from database
      const settings = await BotSettings.findOne({ key: 'raidMessageIds' });
      const existingData = settings?.value || {};
      
      // Add new message ID
      if (!existingData[chatIdStr]) {
        existingData[chatIdStr] = [];
      }
      existingData[chatIdStr].push(messageId);
      
      // Save back to database
      await BotSettings.findOneAndUpdate(
        { key: 'raidMessageIds' },
        { value: existingData, updatedAt: new Date() },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error storing raid message ID:', error);
    }
  },

  // Store bubble message ID for cleanup
  storeBubbleMessageId: async (chatId, messageId) => {
    try {
      const chatIdStr = chatId.toString();
      console.log(`💾 Storing bubble message ID ${messageId} for chat ${chatIdStr}`);
      
      // Get existing message IDs from database
      const settings = await BotSettings.findOne({ key: 'bubbleMessageIds' });
      const existingData = settings?.value || {};
      
      // Add new message ID
      if (!existingData[chatIdStr]) {
        existingData[chatIdStr] = [];
      }
      existingData[chatIdStr].push(messageId);
      
      // Save back to database
      await BotSettings.findOneAndUpdate(
        { key: 'bubbleMessageIds' },
        { value: existingData, updatedAt: new Date() },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error storing bubble message ID:', error);
    }
  },

  // Delete old raid messages
  deleteOldRaidMessages: async () => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return;

    try {
      // Load message IDs from database
      const settings = await BotSettings.findOne({ key: 'raidMessageIds' });
      const raidMessageIds = settings?.value || {};
      
      const chatCount = Object.keys(raidMessageIds).length;
      const totalMessages = Object.values(raidMessageIds).flat().length;
      
      console.log(`🗑️ Deleting old raid messages from ${chatCount} chats (${totalMessages} total messages)`);
      
      if (chatCount === 0) {
        console.log(`ℹ️ No stored raid messages found to delete`);
        return;
      }

      for (const [chatId, messageIds] of Object.entries(raidMessageIds)) {
        for (const messageId of messageIds) {
          try {
            await axios.post(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
              chat_id: chatId,
              message_id: messageId
            });
            console.log(`✅ Deleted old raid message ${messageId} from chat ${chatId}`);
          } catch (error) {
            // Message might already be deleted or bot doesn't have permission
            console.log(`❌ Could not delete message ${messageId} from chat ${chatId}: ${error.message}`);
          }
        }
      }
      
      // Clear the stored message IDs from database
      await BotSettings.findOneAndUpdate(
        { key: 'raidMessageIds' },
        { value: {}, updatedAt: new Date() },
        { upsert: true }
      );
      console.log(`🧹 Cleared all stored raid message IDs from database`);
    } catch (error) {
      console.error('Error deleting old raid messages:', error.message);
    }
  },

  // Delete old bubble rank messages from a specific chat
  deleteOldBubbleMessages: async (chatId) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return;

    try {
      const chatIdStr = chatId.toString();
      
      // Load message IDs from database
      const settings = await BotSettings.findOne({ key: 'bubbleMessageIds' });
      const bubbleMessageIds = settings?.value || {};
      const messageIds = bubbleMessageIds[chatIdStr] || [];
      
      console.log(`Attempting to delete old bubble messages for chat ${chatIdStr}, found ${messageIds.length} messages`);
      
      if (messageIds.length > 0) {
        for (const messageId of messageIds) {
          try {
            await axios.post(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
              chat_id: chatId,
              message_id: messageId
            });
            console.log(`✅ Deleted old bubble message ${messageId} from chat ${chatIdStr}`);
          } catch (error) {
            // Message might already be deleted or bot doesn't have permission
            console.log(`❌ Could not delete message ${messageId} from chat ${chatIdStr}: ${error.message}`);
          }
        }
        
        // Clear only the message IDs for this specific chat from database
        delete bubbleMessageIds[chatIdStr];
        await BotSettings.findOneAndUpdate(
          { key: 'bubbleMessageIds' },
          { value: bubbleMessageIds, updatedAt: new Date() },
          { upsert: true }
        );
        console.log(`🧹 Cleared stored message IDs for chat ${chatIdStr} from database`);
      } else {
        console.log(`ℹ️ No stored bubble messages found for chat ${chatIdStr}`);
      }
    } catch (error) {
      console.error('Error deleting old bubble messages:', error.message);
    }
  },

  // Send message with inline keyboard
  sendBotMessageWithKeyboard: async (chatId, message, keyboard) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) return false;

    try {
      const payload = {
        chat_id: chatId,
        text: message,
      };

      if (keyboard) {
        payload.reply_markup = keyboard;
      }

      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        payload
      );

      return response.data.ok;
    } catch (error) {
      console.error('Bot keyboard message error:', error.message);
      return false;
    }
  },

  // Simple conversation state
  conversationStates: new Map(),

  setConversationState: (userId, state) => {
    telegramService.conversationStates.set(userId.toString(), state);
  },

  getConversationState: (userId) => {
    return telegramService.conversationStates.get(userId.toString());
  },

  clearConversationState: (userId) => {
    telegramService.conversationStates.delete(userId.toString());
  },

  // Handle callback queries from buttons
  handleCallbackQuery: async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const queryId = callbackQuery.id;

    try {
      // Answer the callback query
      await telegramService.answerCallbackQuery(queryId);

      // Check if it's a vote callback first
      if (callbackQuery.data.startsWith('vote_')) {
        // Handle simplified vote callbacks
        const voteData = callbackQuery.data.split('_');
        const voteType = voteData[1]; // 'bullish' or 'bearish'
        const projectId = voteData[2];
        await telegramService.processVote(chatId, userId, projectId, voteType);
      } else {
        // Parse callback data for other actions (like raids)
        const callbackData = JSON.parse(callbackQuery.data);
        
        if (callbackData.action === 'complete') {
          await telegramService.startRaidCompletion(chatId, userId, callbackData.raidId);
        }
      }

    } catch (error) {
      console.error('Callback query error:', error);
      await telegramService.answerCallbackQuery(queryId, "❌ Error processing request");
    }
  },

  // Answer callback query
  answerCallbackQuery: async (queryId, text = '') => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) return false;

    try {
      await axios.post(
        `https://api.telegram.org/bot${botToken}/answerCallbackQuery`,
        {
          callback_query_id: queryId,
          text: text,
        }
      );
      return true;
    } catch (error) {
      console.error('Answer callback query error:', error.message);
      return false;
    }
  },

  // Start raid completion flow
  startRaidCompletion: async (chatId, telegramUserId, raidId) => {
    try {
      // Check if user is linked
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      
      if (!user) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Please link your account first: /link your_username\n\n🌐 Create account at: https://aquads.xyz");
        return;
      }

      // Try to find the raid in both Twitter and Facebook raids
      let raid = await TwitterRaid.findById(raidId);
      let platform = 'Twitter';
      let usernameField = 'twitterUsername';
      let postUrlField = 'tweetUrl';
      let storedUsername = user.twitterUsername;
      let interactionInstructions = '✅ LIKED the tweet\n✅ RETWEETED the tweet\n✅ COMMENTED on the tweet\n✅ BOOKMARKED the tweet';
      let usernamePrompt = 'Twitter username';
      let usernameCommand = '/twitter';
      
      if (!raid) {
        raid = await FacebookRaid.findById(raidId);
        if (raid) {
          platform = 'Facebook';
          usernameField = 'facebookUsername';
          postUrlField = 'postUrl';
          storedUsername = user.facebookUsername;
          interactionInstructions = '✅ LIKED the Facebook post\n✅ SHARED the Facebook post\n✅ COMMENTED on the Facebook post';
          usernamePrompt = 'Facebook username';
          usernameCommand = '/facebook';
        }
      }
      
      if (!raid || !raid.active) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Raid not found or no longer active.");
        return;
      }

      // Check if already completed
      const userCompleted = raid.completions.some(
        completion => completion.userId && completion.userId.toString() === user._id.toString()
      );

      if (userCompleted) {
        await telegramService.sendBotMessage(chatId, 
          "❌ You have already completed this raid!");
        return;
      }

      // Check if user has username set for the platform
      if (storedUsername) {
        // Use stored username automatically
        await telegramService.completeRaidWithStoredUsername(chatId, telegramUserId, raidId, storedUsername, platform);
      } else {
        // Set conversation state to ask for username
        telegramService.setConversationState(telegramUserId, {
          action: 'waiting_username',
          raidId: raidId,
          platform: platform,
          postUrl: raid[postUrlField],
          raidTitle: raid.title,
          raidPoints: raid.points
        });

        // Ask for username
        await telegramService.sendBotMessage(chatId, 
          `🚀 Completing: ${raid.title}\n\n⚠️ BEFORE CONTINUING: Make sure you have already:\n${interactionInstructions}\n\n📝 Now enter your ${usernamePrompt} (without @):\n\n💡 Example: myusername\n\n💡 Tip: Set your ${usernamePrompt} with ${usernameCommand} your_username to avoid entering it every time!\n\n💡 EASIEST WAY: Use the "Complete in Private Chat" button from /raids command!`);
      }

    } catch (error) {
      console.error('Start completion error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error starting completion. Please try again later.");
    }
  },

  // Complete raid with stored username
  completeRaidWithStoredUsername: async (chatId, telegramUserId, raidId, username, platform = 'Twitter') => {
    try {
      // Get user and raid
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      let raid = await TwitterRaid.findById(raidId);
      let usernameField = 'twitterUsername';
      let postUrlField = 'tweetUrl';
      let postIdField = 'tweetId';
      
      if (!raid) {
        raid = await FacebookRaid.findById(raidId);
        if (raid) {
          usernameField = 'facebookUsername';
          postUrlField = 'postUrl';
          postIdField = 'postId';
        }
      }
      
      if (!user || !raid) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Error finding user or raid. Please try again.");
        return;
      }

      // Extract post ID based on platform
      let postId = null;
      if (platform === 'Twitter') {
        const tweetIdMatch = raid[postUrlField].match(/\/status\/(\d+)/);
        if (!tweetIdMatch) {
          await telegramService.sendBotMessage(chatId, 
            "❌ Invalid tweet URL. Please contact support.");
          return;
        }
        postId = tweetIdMatch[1];
      } else if (platform === 'Facebook') {
        // Try multiple Facebook URL patterns
        let postIdMatch = raid[postUrlField].match(/\/posts\/(\d+)/);
        if (!postIdMatch) {
          // Try alternative Facebook URL patterns
          postIdMatch = raid[postUrlField].match(/\/permalink\/(\d+)/);
        }
        if (!postIdMatch) {
          // Try share pattern (like https://www.facebook.com/share/p/16kFXY8yMC/)
          postIdMatch = raid[postUrlField].match(/\/share\/p\/([a-zA-Z0-9]+)/);
        }
        if (!postIdMatch) {
          // Try video share pattern (like https://www.facebook.com/share/v/1EycYSjoew/)
          postIdMatch = raid[postUrlField].match(/\/share\/v\/([a-zA-Z0-9]+)/);
        }
        if (!postIdMatch) {
          // Try another pattern
          postIdMatch = raid[postUrlField].match(/\/story\.php\?story_fbid=(\d+)/);
        }
        if (!postIdMatch) {
          // Try one more pattern
          postIdMatch = raid[postUrlField].match(/\/photo\.php\?fbid=(\d+)/);
        }
        
        if (!postIdMatch) {
          await telegramService.sendBotMessage(chatId, 
            "❌ Invalid Facebook URL. Please contact support.");
          return;
        }
        postId = postIdMatch[1];
      }

      // Create completion record
      const completion = {
        userId: user._id,
        [usernameField]: username,
        [postUrlField]: raid[postUrlField],
        [postIdField]: postId,
        verificationCode: 'aquads.xyz',
        verificationMethod: 'manual',
        verified: true,
        approvalStatus: 'pending',
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        pointsAwarded: false,
        ipAddress: 'telegram_auto',
        verificationNote: 'Submitted via Telegram bot with stored username',
        iframeVerified: false,
        iframeInteractions: 0,
        completedAt: new Date()
      };

      // Save completion
      raid.completions.push(completion);
      await raid.save();

      // Update user activity
      await User.findByIdAndUpdate(user._id, { lastActivity: new Date() });

      // Success message
      await telegramService.sendBotMessage(chatId, 
        `✅ ${platform} Raid submitted successfully!\n\n📝 ${platform}: @${username}\n💰 Reward: ${raid.points} points\n⏳ Status: Pending admin approval\n\n📋 What happens next:\n• Admin will review your submission\n• Points will be awarded after verification\n\n🌐 Track points & claim rewards on: https://aquads.xyz\n\n💡 Use /raids to see more available raids!`);

    } catch (error) {
      console.error('Complete raid with stored username error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error processing submission. Please try again.");
    }
  },

  // Handle username input
  handleUsernameInput: async (chatId, telegramUserId, username, state) => {
    try {
      // Clear state
      telegramService.clearConversationState(telegramUserId);

      // Clean username
      const cleanUsername = username.trim().replace('@', '');
      const usernameRegex = /^[a-zA-Z0-9_]{1,15}$/;
      
      if (!usernameRegex.test(cleanUsername)) {
        const platform = state.platform || 'Twitter';
        await telegramService.sendBotMessage(chatId, 
          `❌ Invalid ${platform} username. Use /raids to try again.`);
        return;
      }

      // Get user and raid
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      let raid = await TwitterRaid.findById(state.raidId);
      let platform = 'Twitter';
      let usernameField = 'twitterUsername';
      let postUrlField = 'tweetUrl';
      let postIdField = 'tweetId';
      
      if (!raid) {
        raid = await FacebookRaid.findById(state.raidId);
        platform = 'Facebook';
        usernameField = 'facebookUsername';
        postUrlField = 'postUrl';
        postIdField = 'postId';
      }
      
      if (!user || !raid) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Error finding user or raid. Please try again.");
        return;
      }

      // Store username if not already set
      if (!user[usernameField]) {
        user[usernameField] = cleanUsername;
        await user.save();
      }

      // Extract post ID based on platform
      let postId = null;
      if (platform === 'Twitter') {
        const tweetIdMatch = state.postUrl.match(/\/status\/(\d+)/);
        if (!tweetIdMatch) {
          await telegramService.sendBotMessage(chatId, 
            "❌ Invalid tweet URL. Please contact support.");
          return;
        }
        postId = tweetIdMatch[1];
      } else if (platform === 'Facebook') {
        const postIdMatch = state.postUrl.match(/\/posts\/(\d+)/);
        if (!postIdMatch) {
          await telegramService.sendBotMessage(chatId, 
            "❌ Invalid Facebook URL. Please contact support.");
          return;
        }
        postId = postIdMatch[1];
      }

      // Create completion record
      const completion = {
        userId: user._id,
        [usernameField]: cleanUsername,
        [postUrlField]: state.postUrl,
        [postIdField]: postId,
        verificationCode: 'aquads.xyz',
        verificationMethod: 'manual',
        verified: true,
        approvalStatus: 'pending',
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        pointsAwarded: false,
        ipAddress: 'telegram_button',
        verificationNote: 'Submitted via Telegram bot',
        iframeVerified: false,
        iframeInteractions: 0,
        completedAt: new Date()
      };

      // Save completion
      raid.completions.push(completion);
      await raid.save();

      // Update user activity
      await User.findByIdAndUpdate(user._id, { lastActivity: new Date() });

      // Success message
      await telegramService.sendBotMessage(chatId, 
        `✅ ${platform} Raid submitted successfully!\n\n📝 ${platform}: @${cleanUsername}\n💰 Reward: ${state.raidPoints} points\n⏳ Status: Pending admin approval\n\n📋 What happens next:\n• Admin will review your submission\n• Points will be awarded after verification\n\n🌐 Track points & claim rewards on: https://aquads.xyz\n\n💡 Use /raids to see more available raids!`);

    } catch (error) {
      console.error('Username input error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error processing submission. Please try again.");
    }
  },

  // Send top 10 bubbles with most bullish votes to specific group
  sendTopBubblesNotification: async (chatId) => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!botToken) {
        return false;
      }

      // Delete old bubble messages first
      await telegramService.deleteOldBubbleMessages(chatId);

      // Get only bumped bubbles that are active or approved (same as website)
      const bumpedBubbles = await Ad.find({ 
        isBumped: true,
        status: { $in: ['active', 'approved'] }
      })
      .select('title logo url bullishVotes bearishVotes owner isBumped status pairAddress contractAddress blockchain')
      .sort({ bullishVotes: -1 }) // Sort by bullish votes descending
      .limit(10); // Get top 10

      if (bumpedBubbles.length === 0) {
        const noBubblesResult = await telegramService.sendBotMessage(chatId, 
          "📭 No bumped bubbles found right now.\n\n🌐 Check back later at: https://aquads.xyz");
        if (noBubblesResult.success) {
          // Store message ID for cleanup
          await telegramService.storeBubbleMessageId(chatId, noBubblesResult.messageId);
          // Pin the message
          await telegramService.pinMessage(chatId, noBubblesResult.messageId);
        }
        return true;
      }

      // Construct the message with clickable links
      let message = `🔥 Top 10 Bubbles - Most Bullish Votes\n\n`;
      message += `📊 Ranking based on bullish votes (bumped bubbles only)\n\n`;

      bumpedBubbles.forEach((bubble, index) => {
        const rank = index + 1;
        const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🔸';
        
        // Check if bubble has token address for chart link
        const tokenAddress = bubble.pairAddress || bubble.contractAddress;
        const blockchain = bubble.blockchain || 'ethereum';
        
        if (tokenAddress && tokenAddress.trim()) {
          // Use the same blockchain mapping as the website
          const mappedChain = telegramService.getChainForBlockchain(blockchain);
          // Create clickable link to AquaSwap chart
          const chartUrl = `https://aquads.xyz/aquaswap?token=${encodeURIComponent(tokenAddress.trim())}&blockchain=${encodeURIComponent(blockchain)}`;
          message += `${emoji} #${rank}: 🚀 [${bubble.title}](${chartUrl})\n`;
        } else {
          // No token address available, just show title
          message += `${emoji} #${rank}: 🚀 ${bubble.title}\n`;
        }
        
        message += `📈 Bullish: ${bubble.bullishVotes} | 📉 Bearish: ${bubble.bearishVotes}\n\n`;
      });

      message += `🌐 View all bubbles at: https://aquads.xyz\n`;
      message += `💡 Vote on bubbles to earn points!`;

      // Get the video file path
      const videoPath = path.join(__dirname, '../../public/trend.mp4');
      const videoExists = fs.existsSync(videoPath);

      // Send to the specific group
      let result = false;
      
      if (videoExists) {
        // Send video with caption
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('video', fs.createReadStream(videoPath));
        formData.append('caption', message);
        formData.append('parse_mode', 'Markdown'); // Enable markdown parsing for links

        try {
          const response = await axios.post(
            `https://api.telegram.org/bot${botToken}/sendVideo`,
            formData,
            {
              headers: {
                ...formData.getHeaders(),
              },
              timeout: 30000, // 30 second timeout for video upload
            }
          );

          if (response.data.ok) {
            result = true;
            const messageId = response.data.result.message_id;
            // Store message ID for cleanup
            await telegramService.storeBubbleMessageId(chatId, messageId);
            // Pin the message
            await telegramService.pinMessage(chatId, messageId);
          }
        } catch (error) {
          console.error('Failed to send video, falling back to text message:', error.message);
          // Fallback to text message if video fails
          const textResult = await telegramService.sendBotMessageWithMarkdown(chatId, message);
          if (textResult.success) {
            result = true;
            const messageId = textResult.messageId;
            // Store message ID for cleanup
            await telegramService.storeBubbleMessageId(chatId, messageId);
            // Pin the message
            await telegramService.pinMessage(chatId, messageId);
          }
        }
      } else {
        // Send text message if video doesn't exist
        const textResult = await telegramService.sendBotMessageWithMarkdown(chatId, message);
        if (textResult.success) {
          result = true;
          const messageId = textResult.messageId;
          // Store message ID for cleanup
          await telegramService.storeBubbleMessageId(chatId, messageId);
          // Pin the message
          await telegramService.pinMessage(chatId, messageId);
        }
      }
      
      if (result) {
        console.log(`Top bubbles notification sent to chat ${chatId}`);
        return true;
      } else {
        console.error(`Failed to send top bubbles to chat ${chatId}`);
        return false;
      }

    } catch (error) {
      console.error('Top bubbles notification failed:', error.message);
      return false;
    }
  },



  // Handle /mybubble command
  handleMyBubbleCommand: async (chatId, telegramUserId) => {
    try {
      // Check if user is linked
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      
      if (!user) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Please link your account first: /link your_username\n\n🌐 Create account at: https://aquads.xyz");
        return;
      }

      // Find user's projects (bubbles)
      const userProjects = await Ad.find({ 
        owner: user.username,
        status: { $in: ['active', 'approved'] }
      })
      .sort({ createdAt: -1 })
      .limit(5); // Show up to 5 most recent projects

      if (userProjects.length === 0) {
        await telegramService.sendBotMessage(chatId, 
          `📭 No projects found for ${user.username}.\n\n🌐 Create projects on: https://aquads.xyz`);
        return;
      }

      // Send each project with voting buttons
      for (const project of userProjects) {
        // Store the group ID if this is a group chat (negative chat IDs are groups)
        if (chatId < 0 && (!project.telegramGroupId || project.telegramGroupId !== chatId.toString())) {
          project.telegramGroupId = chatId.toString();
          await project.save();
        }
        // Get project rank based on bullish votes
        const allBubbles = await Ad.find({ 
          isBumped: true,
          status: { $in: ['active', 'approved'] }
        })
        .sort({ bullishVotes: -1 })
        .select('_id bullishVotes');
        
        const projectRank = allBubbles.findIndex(bubble => bubble._id.toString() === project._id.toString()) + 1;
        const rankEmoji = projectRank === 1 ? '🥇' : projectRank === 2 ? '🥈' : projectRank === 3 ? '🥉' : '🔸';
        
        let message = `🚀 Your Project: ${project.title}\n\n`;
        message += `🏆 Rank: ${rankEmoji} #${projectRank}\n`;
        message += `📊 Votes: 👍 ${project.bullishVotes || 0} | 👎 ${project.bearishVotes || 0}\n`;
        message += `🔗 URL: ${project.url}\n`;
        message += `⛓️ Blockchain: ${project.blockchain || 'Ethereum'}\n\n`;
        message += `💡 Share this message to get votes on your project!`;

        // Create voting keyboard (simplified)
        const keyboard = {
          inline_keyboard: [
            [
              { text: "👍 Bullish", callback_data: "vote_bullish_" + project._id.toString() },
              { text: "👎 Bearish", callback_data: "vote_bearish_" + project._id.toString() }
            ],
            [
              { text: "🔗 View on Aquads", url: "https://aquads.xyz" }
            ]
          ]
        };

        // Debug: Log the keyboard structure
        console.log('Keyboard structure:', JSON.stringify(keyboard, null, 2));

        // Send with video if available
        const videoPath = path.join(__dirname, '../../public/vote now .mp4');
        const videoExists = fs.existsSync(videoPath);
        
        if (videoExists) {
          try {
            // Send video with caption and keyboard
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('video', fs.createReadStream(videoPath));
            formData.append('caption', message);
            formData.append('reply_markup', JSON.stringify(keyboard));

            const response = await axios.post(
              `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendVideo`,
              formData,
              {
                headers: {
                  ...formData.getHeaders(),
                },
                timeout: 30000, // 30 second timeout for video upload
              }
            );

            if (!response.data.ok) {
              // Fallback to text message if video fails
              await telegramService.sendBotMessageWithKeyboard(chatId, message, keyboard);
            }
          } catch (error) {
            console.error('Failed to send video, falling back to text:', error.message);
            // Fallback to text message
            await telegramService.sendBotMessageWithKeyboard(chatId, message, keyboard);
          }
        } else {
          // Send text message without video
          await telegramService.sendBotMessageWithKeyboard(chatId, message, keyboard);
        }
      }



    } catch (error) {
      console.error('MyBubble command error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error fetching your projects. Please try again later.");
    }
  },

  // Handle /createraid command
  handleCreateRaidCommand: async (chatId, telegramUserId, text) => {
    try {
      // Check if user is linked
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      
      if (!user) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Please link your account first: /link your_username\n\n🌐 Create account at: https://aquads.xyz");
        return;
      }

      // Parse command format: /createraid TWEET_URL
      const tweetUrl = text.substring('/createraid'.length).trim();
      
      if (!tweetUrl) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Please provide a tweet URL.\n\n📝 Usage: /createraid TWEET_URL\n\n💡 Example: /createraid https://twitter.com/user/status/123456789\n\n💰 Cost: 2000 points");
        return;
      }

      // Validate Twitter URL
      const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
      if (!tweetIdMatch || !tweetIdMatch[1]) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Invalid Twitter URL. Please provide a valid tweet URL.\n\n💡 Example: https://twitter.com/user/status/123456789");
        return;
      }

      const tweetId = tweetIdMatch[1];
      const POINTS_REQUIRED = 2000;

      // Check if user has enough points
      if (user.points < POINTS_REQUIRED) {
        await telegramService.sendBotMessage(chatId, 
          `❌ Not enough points. You have ${user.points} points but need ${POINTS_REQUIRED} points to create a raid.\n\n💡 Earn points by completing raids: /raids`);
        return;
      }

      // Create the raid using the same logic as the website
      const TwitterRaid = require('../models/TwitterRaid');
      
      // Generate default title and description
      const title = `Twitter Raid by @${user.username}`;
      const description = `Help boost this tweet! Like, retweet, and comment to earn 50 points.`;
      
      const raid = new TwitterRaid({
        tweetId,
        tweetUrl,
        title,
        description,
        points: 50, // Fixed points for raids
        createdBy: user._id,
        isPaid: false, // Not a paid raid (it's a points raid)
        paymentStatus: 'approved', // Automatically approved since we're deducting points
        active: true,
        paidWithPoints: true, // Track point-based raids
        pointsSpent: POINTS_REQUIRED // Track how many points were spent
      });

      // Deduct points from user
      user.points -= POINTS_REQUIRED;
      user.pointsHistory.push({
        amount: -POINTS_REQUIRED,
        reason: 'Created Twitter raid via Telegram',
        socialRaidId: raid._id.toString(),
        createdAt: new Date()
      });

      // Save both the raid and updated user
      await Promise.all([
        raid.save(),
        user.save()
      ]);

      // Send success message
      await telegramService.sendBotMessage(chatId, 
        `✅ Raid Created Successfully!\n\n🔗 Tweet: ${tweetUrl}\n💰 Points Deducted: ${POINTS_REQUIRED}\n💎 Points Remaining: ${user.points}\n\n🚀 Your raid is now live on https://aquads.xyz and will be sent to all users!\n\n💡 Users who complete your raid will earn 50 points.`);

      // Send Telegram notification to all users about the new raid
      await telegramService.sendRaidNotification({
        tweetUrl: raid.tweetUrl,
        points: raid.points,
        title: raid.title,
        description: raid.description
      });

    } catch (error) {
      console.error('CreateRaid command error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error creating raid. Please try again later.");
    }
  },

  // Delete a message
  deleteMessage: async (chatId, messageId) => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) return;

      await axios.post(
        `https://api.telegram.org/bot${botToken}/deleteMessage`,
        {
          chat_id: chatId,
          message_id: messageId
        }
      );
    } catch (error) {
      // Silently fail - message might already be deleted
    }
  },

  // Send video to a chat
  sendVideoToChat: async (chatId, videoPath, caption) => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.error('TELEGRAM_BOT_TOKEN not configured');
        return null;
      }

      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('video', fs.createReadStream(videoPath));
      formData.append('caption', caption);

      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendVideo`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 30000,
        }
      );

      if (response.data.ok) {
        return response.data.result.message_id;
      }
      return null;
    } catch (error) {
      console.error('Error sending video:', error.message);
      return null;
    }
  },

  // Send vote notification to registered group AND trending channel
  sendVoteNotificationToGroup: async (project) => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (!botToken) {
        console.error('TELEGRAM_BOT_TOKEN not configured');
        return;
      }

      // Calculate project rank
      const allBubbles = await Ad.find({ 
        isBumped: true,
        status: { $in: ['active', 'approved'] }
      })
      .sort({ bullishVotes: -1 })
      .select('_id bullishVotes');
      
      const projectRank = allBubbles.findIndex(bubble => bubble._id.toString() === project._id.toString()) + 1;
      const rankEmoji = projectRank === 1 ? '🥇' : projectRank === 2 ? '🥈' : projectRank === 3 ? '🥉' : '🔸';

      // Create notification message
      let message = `🎉 New Vote for ${project.title}!\n\n`;
      message += `📊 Votes: 👍 ${project.bullishVotes || 0} | 👎 ${project.bearishVotes || 0}\n`;
      message += `🏆 Rank: ${rankEmoji} #${projectRank}`;

      // Path to the new vote video
      const videoPath = path.join(__dirname, '../../public/new vote.mp4');
      const videoExists = fs.existsSync(videoPath);

      // Send to registered group (if exists)
      if (project.telegramGroupId) {
        const groupChatId = project.telegramGroupId;
        
        if (videoExists) {
          try {
            await telegramService.sendVideoToChat(groupChatId, videoPath, message);
          } catch (error) {
            console.error('Error sending to registered group:', error.message);
            // Fallback to text
            try {
              await telegramService.sendTextMessage(botToken, groupChatId, message);
            } catch (textError) {
              console.error('Failed to send text fallback:', textError.message);
            }
          }
        } else {
          await telegramService.sendTextMessage(botToken, groupChatId, message);
        }
      }

      // Also send to trending channel
      // First, clean up ALL old vote messages
      for (const msgId of telegramService.lastVoteMessages) {
        await telegramService.deleteMessage(telegramService.TRENDING_CHANNEL_ID, msgId);
      }
      telegramService.lastVoteMessages = [];

      let trendingMessageId = null;
      if (videoExists) {
        try {
          trendingMessageId = await telegramService.sendVideoToChat(telegramService.TRENDING_CHANNEL_ID, videoPath, message);
        } catch (error) {
          console.error('Error sending to trending channel:', error.message);
          // Fallback to text
          try {
            const result = await telegramService.sendTextMessage(botToken, telegramService.TRENDING_CHANNEL_ID, message);
            if (result.success) {
              trendingMessageId = result.messageId;
            }
          } catch (textError) {
            console.error('Failed to send text to trending channel:', textError.message);
          }
        }
      } else {
        const result = await telegramService.sendTextMessage(botToken, telegramService.TRENDING_CHANNEL_ID, message);
        if (result.success) {
          trendingMessageId = result.messageId;
        }
      }

      // Store the message ID for future cleanup
      if (trendingMessageId) {
        telegramService.lastVoteMessages.push(trendingMessageId);
      }

    } catch (error) {
      console.error('Error sending vote notification to group:', error);
    }
  },

  // Send daily bubble summary to trending channel
  sendDailyBubbleSummary: async () => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.error('TELEGRAM_BOT_TOKEN not configured');
        return;
      }

      // Delete old messages first
      for (const messageId of telegramService.lastTrendingMessages) {
        await telegramService.deleteMessage(telegramService.TRENDING_CHANNEL_ID, messageId);
      }
      telegramService.lastTrendingMessages = [];

      // Get top 10 bumped bubbles by votes
      const topBubbles = await Ad.find({ 
        isBumped: true,
        status: { $in: ['active', 'approved'] }
      })
      .sort({ bullishVotes: -1 })
      .limit(10);

      if (topBubbles.length === 0) {
        return;
      }

      // Create summary message
      let message = `🔥 AQUADS TRENDING BUBBLES 🔥\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

      topBubbles.forEach((bubble, index) => {
        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔸';
        message += `${rankEmoji} #${index + 1} ${bubble.title}\n`;
        message += `📊 👍 ${bubble.bullishVotes || 0} | 👎 ${bubble.bearishVotes || 0}\n`;
        message += `🔗 ${bubble.url}\n`;
        message += `⛓️ ${bubble.blockchain || 'Ethereum'}\n\n`;
      });

      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `💎 Vote on your favorites at aquads.xyz`;

      // Send with video
      const videoPath = path.join(__dirname, '../../public/trend.mp4');
      const videoExists = fs.existsSync(videoPath);

      let messageId = null;
      if (videoExists) {
        messageId = await telegramService.sendVideoToChat(telegramService.TRENDING_CHANNEL_ID, videoPath, message);
      }

      if (!messageId) {
        // Fallback to text
        const result = await telegramService.sendTextMessage(botToken, telegramService.TRENDING_CHANNEL_ID, message);
        if (result.success) {
          messageId = result.messageId;
        }
      }

      // Store message ID for next cleanup
      if (messageId) {
        telegramService.lastTrendingMessages.push(messageId);
        
        // Pin the message to the channel
        try {
          await telegramService.pinMessage(telegramService.TRENDING_CHANNEL_ID, messageId);
        } catch (pinError) {
          console.error('Error pinning bubble summary:', pinError.message);
        }
      }

    } catch (error) {
      console.error('Error sending daily bubble summary:', error);
    }
  },

  // Process vote on project
  processVote: async (chatId, telegramUserId, projectId, voteType) => {
    try {
      // Check if user is linked
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      
      if (!user) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Please link your account first: /link your_username\n\n🌐 Create account at: https://aquads.xyz");
        return;
      }

      // Find the project
      const project = await Ad.findById(projectId);
      
      if (!project) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Project not found.");
        return;
      }

      // Check if user already voted
      const existingVote = project.voterData?.find(
        vote => vote.userId && vote.userId.toString() === user._id.toString()
      );

      if (existingVote) {
        if (existingVote.voteType === voteType) {
          await telegramService.sendBotMessage(chatId, 
            `❌ You already voted ${voteType} on this project.`);
        } else {
          // Update existing vote
          existingVote.voteType = voteType;
          
          // Update vote counts
          if (voteType === 'bullish') {
            project.bullishVotes = (project.bullishVotes || 0) + 1;
            project.bearishVotes = Math.max(0, (project.bearishVotes || 0) - 1);
          } else {
            project.bearishVotes = (project.bearishVotes || 0) + 1;
            project.bullishVotes = Math.max(0, (project.bullishVotes || 0) - 1);
          }
          
          await project.save();

        await telegramService.sendBotMessage(chatId, 
          `✅ Vote updated to ${voteType}!\n\n📊 ${project.title}: 👍 ${project.bullishVotes} | 👎 ${project.bearishVotes}`);
        
        // Send notification to registered group about vote update
        await telegramService.sendVoteNotificationToGroup(project);
        }
      } else {
        // New vote - only award points for first vote on this project
        if (!project.voterData) project.voterData = [];
        
        project.voterData.push({
          userId: user._id,
          voteType: voteType
        });

        // Update vote counts
        if (voteType === 'bullish') {
          project.bullishVotes = (project.bullishVotes || 0) + 1;
        } else {
          project.bearishVotes = (project.bearishVotes || 0) + 1;
        }
        
        await project.save();
        
        // Award points only for first vote on this project
        await User.findByIdAndUpdate(user._id, {
          $inc: { points: 20 },
          $push: {
            pointsHistory: {
              amount: 20,
              reason: `Voted on project: ${project.title}`,
              createdAt: new Date()
            }
          }
        });

        await telegramService.sendBotMessage(chatId, 
          `✅ Voted ${voteType} on ${project.title}!\n\n💰 +20 points awarded\n\n📊 ${project.title}: 👍 ${project.bullishVotes} | 👎 ${project.bearishVotes}`);
        
        // Send notification to registered group about new vote
        await telegramService.sendVoteNotificationToGroup(project);
      }

    } catch (error) {
      console.error('Process vote error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error processing vote. Please try again later.");
    }
  }


};

module.exports = telegramService; 