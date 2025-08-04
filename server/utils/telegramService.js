const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const User = require('../models/User');
const TwitterRaid = require('../models/TwitterRaid');
const Ad = require('../models/Ad');
const BotSettings = require('../models/BotSettings');

const telegramService = {
  // Store group IDs where bot is active
  activeGroups: new Set(),

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

      // Construct the message text
      const message = `🚀 New Twitter Raid Available!

💰 Reward: ${raidData.points || 50} points
🎯 Task: Like, Retweet & Comment

🔗 Tweet: ${raidData.tweetUrl}
🤖 Complete: @aquadsbumpbot

📋 Requirements:
• You MUST have an Aquads account to participate
• Link your account: /link your_aquads_username

💡 How to complete:
1. Like, Retweet & Comment on the tweet above
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
              // Store message ID for cleanup
              await telegramService.storeRaidMessageId(chatId, response.data.result.message_id);
            }
          } else {
            // Send text message
            const result = await telegramService.sendTextMessage(botToken, chatId, message);
            if (result.success) {
              successCount++;
              // Store message ID for cleanup
              await telegramService.storeRaidMessageId(chatId, result.messageId);
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
    } else if (text.startsWith('/help')) {
      await telegramService.handleHelpCommand(chatId);
    } else if (text.startsWith('/bubbles')) {
      await telegramService.handleBubblesCommand(chatId);
    } else if (text.startsWith('/register')) {
      await telegramService.handleRegisterCommand(chatId, userId, text);
    } else if (text.startsWith('/mybubble')) {
      await telegramService.handleMyBubbleCommand(chatId, userId);
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
        await telegramService.sendBotMessage(chatId, 
          "📝 Please provide your Twitter username, or type /cancel to abort.");
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

Hi ${username ? `@${username}` : 'there'}! I help you complete Twitter raids and earn points.

📋 Requirements:
• You MUST have an Aquads account to participate
• Create account at: https://aquads.xyz

📋 Quick Start:
1. Link your account: /link your_aquads_username
2. Set your Twitter username: /twitter your_twitter_username
3. View raids: /raids
4. Complete raids: Use buttons or /complete command

🔗 Available Commands:
• /link USERNAME - Link your Telegram to Aquads account
• /twitter [USERNAME] - Set or view your Twitter username for raids
• /raids - View available Twitter raids
• /complete RAID_ID @twitter_username TWEET_URL - Complete a raid manually
• /register PROJECT_NAME - Register an existing project as yours
• /mybubble - View your registered projects
• /help - Show detailed command guide

🌐 Track points & claim rewards on: https://aquads.xyz

💡 First step: Link your account with /link your_aquads_username, then set your Twitter username with /twitter your_twitter_username`;

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

  // Handle /help command
  handleHelpCommand: async (chatId) => {
    const message = `📋 Aquads Bot - Complete Command Guide

📋 Requirements:
• You MUST have an Aquads account to participate
• Create account at: https://aquads.xyz

🔗 Account Commands:
• /link USERNAME - Link your Telegram to Aquads account (case sensitive)
• /twitter [USERNAME] - Set or view your Twitter username for raids
• /help - Show this help message

📋 Raid Commands:
• /raids - View all available Twitter raids
• /complete RAID_ID [@twitter_username] TWEET_URL - Complete a raid manually (Twitter username optional if set)

📋 Bubble Commands:
• /bubbles - View top 10 bubbles with most bullish votes
• /mybubble - View your registered projects with voting buttons
• /register PROJECT_NAME - Register an existing project as yours

📝 Example Usage:
/link myusername
/twitter mytwitter
/raids
/bubbles
/register MyProject
/mybubble
/complete 507f1f77bcf86cd799439011 https://twitter.com/user/status/123456789
/complete 507f1f77bcf86cd799439011 @mytwitter https://twitter.com/user/status/123456789

💡 How Raids Work:
1. Like, Retweet & Comment on the target tweet
2. Use /raids to see available raids
3. Click "Complete in Private Chat" button OR use /complete command
4. Provide your Twitter username when prompted (or set it once with /twitter)
5. Wait for admin approval to receive points

🚀 Getting Started:
1. Link your account: /link your_aquads_username
2. Set your Twitter username: /twitter your_twitter_username
3. View available raids: /raids
4. Complete raids using buttons or /complete command
5. Register your project: /register PROJECT_NAME
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

      // Get active raids
      const raids = await TwitterRaid.find({ active: true })
        .sort({ createdAt: -1 })
        .limit(10);

      if (raids.length === 0) {
        await telegramService.sendBotMessage(chatId, 
          "📭 No active raids available right now.\n\n⏰ Check back later for new Twitter raids!\n\n💡 Raids are posted regularly throughout the day.\n\n🌐 Track your points on: https://aquads.xyz");
        return;
      }

      // Filter raids older than 2 days
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
      const activeRaids = raids.filter(raid => new Date(raid.createdAt) > twoDaysAgo);

      if (activeRaids.length === 0) {
        await telegramService.sendBotMessage(chatId, 
          "📭 No active raids available right now. Check back later!\n\n🌐 Track your points on: https://aquads.xyz");
        return;
      }

      // Send each raid as separate message with button
      for (const raid of activeRaids) {
        // Check if user already completed this raid
        const userCompleted = raid.completions.some(
          completion => completion.userId && completion.userId.toString() === user._id.toString()
        );

        const status = userCompleted ? "✅ Completed" : "⏳ Available";
        
        let message = `🚀 ${raid.title}\n\n`;
        message += `💰 Reward: ${raid.points} points\n`;
        message += `🎯 Task: ${raid.description}\n`;
        message += `🔗 Tweet: ${raid.tweetUrl}\n`;
        message += `📊 Status: ${status}\n\n`;
        message += `⚠️ IMPORTANT: You must manually LIKE, RETWEET, COMMENT & BOOKMARK the tweet before completing!`;

        // Add button if not completed
        let keyboard = null;
        if (!userCompleted) {
          keyboard = {
            inline_keyboard: [[
              {
                text: "💬 Complete in Private Chat",
                url: `https://t.me/aquadsbumpbot?start=raid_${raid._id}`
              }
            ]]
          };
        }

        await telegramService.sendBotMessageWithKeyboard(chatId, message, keyboard);
      }

      // Send summary
      await telegramService.sendBotMessage(chatId, 
        `📊 ${activeRaids.length} raids shown above\n\n💡 How to complete:\n• Click "Complete in Private Chat" button (easiest)\n• Or use: /complete RAID_ID @twitter_username TWEET_URL\n\n⏰ Raids expire after 48 hours\n💡 Make sure to interact with tweets before completing!\n\n🌐 Track points & claim rewards on: https://aquads.xyz`);

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
        "❌ Incorrect usage.\n\n📝 Usage: /complete RAID_ID @twitter_username TWEET_URL\n\n💡 Example: /complete 507f1f77bcf86cd799439011 @mytwitter https://twitter.com/user/status/123456789\n\n💡 Tip: Use /raids to get the correct raid ID and tweet URL.");
      return;
    }

    const raidId = parts[1].replace(/[\[\]]/g, ''); // Remove square brackets if present
    const twitterUsername = parts[2].replace('@', ''); // Remove @ if present
    const tweetUrl = parts[3];

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

      // Find the raid
      const raid = await TwitterRaid.findById(raidId);
      
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

      // Validate Twitter username
      const usernameRegex = /^[a-zA-Z0-9_]{1,15}$/;
      if (!usernameRegex.test(twitterUsername)) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Invalid Twitter username. Please use letters, numbers, and underscores only (max 15 characters).");
        return;
      }

      // Extract tweet ID from URL
      const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
      if (!tweetIdMatch || !tweetIdMatch[1]) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Invalid Twitter URL. Please provide a valid tweet URL.");
        return;
      }

      const tweetId = tweetIdMatch[1];

      // Create completion record (similar to existing API)
      const completion = {
        userId: user._id,
        twitterUsername: twitterUsername,
        tweetUrl: tweetUrl,
        tweetId: tweetId,
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
        `✅ Raid Submitted Successfully!

📝 Twitter: @${twitterUsername}
🔗 Tweet: ${tweetUrl}
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
      // Parse callback data
      const callbackData = JSON.parse(callbackQuery.data);
      
      // Answer the callback query
      await telegramService.answerCallbackQuery(queryId);

      if (callbackData.action === 'complete') {
        await telegramService.startRaidCompletion(chatId, userId, callbackData.raidId);
      } else if (callbackData.action === 'vote') {
        await telegramService.processVote(chatId, userId, callbackData.projectId, callbackData.voteType);
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

      // Find the raid
      const raid = await TwitterRaid.findById(raidId);
      
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

      // Check if user has Twitter username set
      if (user.twitterUsername) {
        // Use stored Twitter username automatically
        await telegramService.completeRaidWithStoredUsername(chatId, telegramUserId, raidId, user.twitterUsername);
      } else {
        // Set conversation state to ask for username
        telegramService.setConversationState(telegramUserId, {
          action: 'waiting_username',
          raidId: raidId,
          tweetUrl: raid.tweetUrl,
          raidTitle: raid.title,
          raidPoints: raid.points
        });

        // Ask for username
        await telegramService.sendBotMessage(chatId, 
          `🚀 Completing: ${raid.title}\n\n⚠️ BEFORE CONTINUING: Make sure you have already:\n✅ LIKED the tweet\n✅ RETWEETED the tweet\n✅ COMMENTED on the tweet\n✅ BOOKMARKED the tweet\n\n📝 Now enter your Twitter username (without @):\n\n💡 Example: myusername\n\n💡 Tip: Set your Twitter username with /twitter your_username to avoid entering it every time!`);
      }

    } catch (error) {
      console.error('Start completion error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error starting completion. Please try again later.");
    }
  },

  // Complete raid with stored Twitter username
  completeRaidWithStoredUsername: async (chatId, telegramUserId, raidId, twitterUsername) => {
    try {
      // Get user and raid
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      const raid = await TwitterRaid.findById(raidId);
      
      if (!user || !raid) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Error finding user or raid. Please try again.");
        return;
      }

      // Extract tweet ID
      const tweetIdMatch = raid.tweetUrl.match(/\/status\/(\d+)/);
      if (!tweetIdMatch) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Invalid tweet URL. Please contact support.");
        return;
      }

      // Create completion record
      const completion = {
        userId: user._id,
        twitterUsername: twitterUsername,
        tweetUrl: raid.tweetUrl,
        tweetId: tweetIdMatch[1],
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
        `✅ Raid submitted successfully!\n\n📝 Twitter: @${twitterUsername}\n💰 Reward: ${raid.points} points\n⏳ Status: Pending admin approval\n\n📋 What happens next:\n• Admin will review your submission\n• Points will be awarded after verification\n\n🌐 Track points & claim rewards on: https://aquads.xyz\n\n💡 Use /raids to see more available raids!`);

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
      const twitterUsername = username.trim().replace('@', '');
      const usernameRegex = /^[a-zA-Z0-9_]{1,15}$/;
      
      if (!usernameRegex.test(twitterUsername)) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Invalid Twitter username. Use /raids to try again.");
        return;
      }

      // Get user and raid
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      const raid = await TwitterRaid.findById(state.raidId);
      
      if (!user || !raid) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Error finding user or raid. Please try again.");
        return;
      }

      // Store Twitter username if not already set
      if (!user.twitterUsername) {
        user.twitterUsername = twitterUsername;
        await user.save();
      }
      
      if (!user || !raid) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Error finding user or raid. Please try again.");
        return;
      }

      // Extract tweet ID
      const tweetIdMatch = state.tweetUrl.match(/\/status\/(\d+)/);
      if (!tweetIdMatch) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Invalid tweet URL. Please contact support.");
        return;
      }

      // Create completion record
      const completion = {
        userId: user._id,
        twitterUsername: twitterUsername,
        tweetUrl: state.tweetUrl,
        tweetId: tweetIdMatch[1],
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
        `✅ Raid submitted successfully!\n\n📝 Twitter: @${twitterUsername}\n💰 Reward: ${state.raidPoints} points\n⏳ Status: Pending admin approval\n\n📋 What happens next:\n• Admin will review your submission\n• Points will be awarded after verification\n\n🌐 Track points & claim rewards on: https://aquads.xyz\n\n💡 Use /raids to see more available raids!`);

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
            // Store message ID for cleanup
            await telegramService.storeBubbleMessageId(chatId, response.data.result.message_id);
          }
        } catch (error) {
          console.error('Failed to send video, falling back to text message:', error.message);
          // Fallback to text message if video fails
          const textResult = await telegramService.sendBotMessageWithMarkdown(chatId, message);
          if (textResult.success) {
            result = true;
            // Store message ID for cleanup
            await telegramService.storeBubbleMessageId(chatId, textResult.messageId);
          }
        }
      } else {
        // Send text message if video doesn't exist
        const textResult = await telegramService.sendBotMessageWithMarkdown(chatId, message);
        if (textResult.success) {
          result = true;
          // Store message ID for cleanup
          await telegramService.storeBubbleMessageId(chatId, textResult.messageId);
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

  // Handle /register command for project registration
  handleRegisterCommand: async (chatId, telegramUserId, text) => {
    const parts = text.split(' ');
    
    if (parts.length < 2) {
      await telegramService.sendBotMessage(chatId, 
        "❌ Please provide your project name/title.\n\n📝 Usage: /register PROJECT_NAME\n\n💡 Example: /register MyAwesomeProject\n\n⚠️ Note: You must have an Aquads account and be logged in to register projects.");
      return;
    }

    // Get project name (everything after /register)
    const projectName = parts.slice(1).join(' ').trim();
    
    if (projectName.length < 3) {
      await telegramService.sendBotMessage(chatId, 
        "❌ Project name must be at least 3 characters long.");
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

      // Find existing project by title (case-insensitive)
      const existingProject = await Ad.findOne({ 
        title: { $regex: new RegExp(`^${projectName}$`, 'i') }
      });
      
      if (!existingProject) {
        await telegramService.sendBotMessage(chatId, 
          `❌ Project "${projectName}" not found in our database.\n\n💡 Make sure the project name matches exactly.\n\n💡 You can view available projects on: https://aquads.xyz`);
        return;
      }

      // Check if user already owns this project
      if (existingProject.owner === user.username) {
        await telegramService.sendBotMessage(chatId, 
          `✅ You already own project "${projectName}"!\n\n💡 Use /mybubble to view your projects.`);
        return;
      }

      // Check if project is already owned by someone else
      if (existingProject.owner && existingProject.owner !== user.username) {
        await telegramService.sendBotMessage(chatId, 
          `❌ Project "${projectName}" is already owned by another user.\n\n💡 Please contact support if this is your project.`);
        return;
      }

      // Assign project to user
      existingProject.owner = user.username;
      await existingProject.save();

      await telegramService.sendBotMessage(chatId, 
        `✅ Project Registration Complete!\n\n🏷️ Project: ${existingProject.title}\n🔗 URL: ${existingProject.url}\n⛓️ Blockchain: ${existingProject.blockchain || 'Ethereum'}\n\n💡 Use /mybubble to view your projects!`);

    } catch (error) {
      console.error('Register command error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error registering project. Please try again later.");
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
          `📭 No projects found for ${user.username}.\n\n💡 Register your project with: /register PROJECT_NAME\n\n🌐 Or create projects on: https://aquads.xyz`);
        return;
      }

      // Send each project with voting buttons
      for (const project of userProjects) {
        let message = `🚀 Your Project: ${project.title}\n\n`;
        message += `📊 Votes: 👍 ${project.bullishVotes || 0} | 👎 ${project.bearishVotes || 0}\n`;
        message += `🔗 URL: ${project.url}\n`;
        message += `⛓️ Blockchain: ${project.blockchain || 'Ethereum'}\n\n`;
        message += `💡 Share this message to get votes on your project!`;

        // Create voting keyboard
        const keyboard = {
          inline_keyboard: [
            [
              { text: "👍 Bullish", callback_data: JSON.stringify({ action: 'vote', projectId: project._id.toString(), voteType: 'bullish' }) },
              { text: "👎 Bearish", callback_data: JSON.stringify({ action: 'vote', projectId: project._id.toString(), voteType: 'bearish' }) }
            ],
            [
              { text: "🔗 View on Aquads", url: `https://aquads.xyz` }
            ]
          ]
        };

        // Send with logo if available
        if (project.logo) {
          try {
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('photo', project.logo);
            formData.append('caption', message);

            const response = await axios.post(
              `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
              formData,
              {
                headers: {
                  ...formData.getHeaders(),
                },
                timeout: 10000,
              }
            );

            if (response.data.ok) {
              // Add keyboard to the sent message
              await axios.post(
                `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`,
                {
                  chat_id: chatId,
                  message_id: response.data.result.message_id,
                  reply_markup: keyboard
                }
              );
            } else {
              // Fallback to text message if photo fails
              await telegramService.sendBotMessageWithKeyboard(chatId, message, keyboard);
            }
          } catch (error) {
            console.error('Failed to send photo, falling back to text:', error.message);
            // Fallback to text message
            await telegramService.sendBotMessageWithKeyboard(chatId, message, keyboard);
          }
        } else {
          // Send text message without photo
          await telegramService.sendBotMessageWithKeyboard(chatId, message, keyboard);
        }
      }



    } catch (error) {
      console.error('MyBubble command error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error fetching your projects. Please try again later.");
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
          
          // Award points for voting
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
            `✅ Vote updated to ${voteType}!\n\n💰 +20 points awarded\n\n📊 ${project.title}: 👍 ${project.bullishVotes} | 👎 ${project.bearishVotes}`);
        }
      } else {
        // New vote
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
        
        // Award points for voting
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
      }

    } catch (error) {
      console.error('Process vote error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error processing vote. Please try again later.");
    }
  }


};

module.exports = telegramService; 