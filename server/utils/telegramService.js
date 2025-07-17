const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const User = require('../models/User');
const TwitterRaid = require('../models/TwitterRaid');

const telegramService = {
  // Store group IDs where bot is active
  activeGroups: new Set(),
  // Store raid message IDs for cleanup
  raidMessageIds: new Map(), // groupId -> [messageIds]

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

💡 How to complete:
1. Like, Retweet & Comment on the tweet above
2. Start a chat with @aquadsbumpbot
3. Use /raids to see available raids
4. Click "Complete" button or use /complete command

⏰ Available for 48 hours!`;

      // Get the video file path
      const videoPath = path.join(__dirname, '../../public/RAID.mp4');
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
              telegramService.storeRaidMessageId(chatId, response.data.result.message_id);
            }
          } else {
            // Send text message
            const result = await telegramService.sendTextMessage(botToken, chatId, message);
            if (result.success) {
              successCount++;
              // Store message ID for cleanup
              telegramService.storeRaidMessageId(chatId, result.messageId);
            }
          }
        } catch (error) {
          console.error(`Failed to send to group ${chatId}:`, error.message);
          // Remove failed group from active groups
          telegramService.activeGroups.delete(chatId);
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
        
        // Send startup message
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (chatId) {
          try {
            await telegramService.sendBotMessage(chatId, 
              `🤖 Aquads Bot is now active!\n\n📋 Available Commands:\n• /start - Get started & see welcome message\n• /help - Show detailed command guide\n• /link USERNAME - Link your Aquads account\n• /raids - View available Twitter raids\n\n💡 Tip: Use commands in private chat for best experience!`);
          } catch (error) {
            console.error('Failed to send startup message:', error.message);
          }
        }
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
    }

    // Check if user is in conversation state
    const conversationState = telegramService.getConversationState(userId);
    
    if (conversationState && conversationState.action === 'waiting_username' && !text.startsWith('/')) {
      // User is providing Twitter username
      await telegramService.handleUsernameInput(chatId, userId, text, conversationState);
      return;
    }

    // Handle commands - redirect group commands to private chat
    if (chatType === 'group' || chatType === 'supergroup') {
      // In group chats, redirect all commands to private chat
      if (text.startsWith('/start') || text.startsWith('/raids') || text.startsWith('/complete') || 
          text.startsWith('/link') || text.startsWith('/help') || text.startsWith('/cancel')) {
        
        await telegramService.sendBotMessage(chatId, 
          `💬 Please use bot commands in private chat to keep group conversations clean.\n\n🤖 Start a chat with @aquadsbumpbot and use: ${text}\n\n💡 This keeps group chats focused and gives you a better bot experience!`);
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
    } else if (text.startsWith('/help')) {
      await telegramService.handleHelpCommand(chatId);
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

📋 Quick Start:
1. Link your account: /link your_aquads_username
2. View raids: /raids
3. Complete raids: Use buttons or /complete command

🔗 Available Commands:
• /link USERNAME - Link your Telegram to Aquads account
• /raids - View available Twitter raids
• /complete RAID_ID @twitter_username TWEET_URL - Complete a raid manually
• /help - Show detailed command guide

💡 First step: Link your account with /link your_aquads_username`;

    await telegramService.sendBotMessage(chatId, message);
  },

  // Handle /help command
  handleHelpCommand: async (chatId) => {
    const message = `📋 Aquads Bot - Complete Command Guide

🔗 Account Commands:
• /link USERNAME - Link your Telegram to Aquads account (case sensitive)
• /help - Show this help message

📋 Raid Commands:
• /raids - View all available Twitter raids
• /complete RAID_ID @twitter_username TWEET_URL - Complete a raid manually

📝 Example Usage:
/link myusername
/raids
/complete 507f1f77bcf86cd799439011 @mytwitter https://twitter.com/user/status/123456789

💡 How Raids Work:
1. Like, Retweet & Comment on the target tweet
2. Use /raids to see available raids
3. Click "Complete in Private Chat" button OR use /complete command
4. Provide your Twitter username when prompted
5. Wait for admin approval to receive points

🚀 Getting Started:
1. Link your account: /link your_aquads_username
2. View available raids: /raids
3. Complete raids using buttons or /complete command

⚠️ Important Notes:
• Username is case sensitive when linking
• You must manually interact with tweets before completing
• Raids expire after 48 hours
• Points are awarded after admin approval

💬 Need help? Contact support through the Aquads website.`;

    await telegramService.sendBotMessage(chatId, message);
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
• /raids - View available Twitter raids
• Complete raids using buttons or /complete command
• Earn points for completing raids

💡 Next step: Use /raids to see available raids!`);

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
          "❌ Please link your account first.\n\n📝 Use: /link your_aquads_username\n\n💡 You need to link your Aquads account before viewing raids.");
        return;
      }

      // Get active raids
      const raids = await TwitterRaid.find({ active: true })
        .sort({ createdAt: -1 })
        .limit(10);

      if (raids.length === 0) {
        await telegramService.sendBotMessage(chatId, 
          "📭 No active raids available right now.\n\n⏰ Check back later for new Twitter raids!\n\n💡 Raids are posted regularly throughout the day.");
        return;
      }

      // Filter raids older than 2 days
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
      const activeRaids = raids.filter(raid => new Date(raid.createdAt) > twoDaysAgo);

      if (activeRaids.length === 0) {
        await telegramService.sendBotMessage(chatId, 
          "📭 No active raids available right now. Check back later!");
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
        `📊 ${activeRaids.length} raids shown above\n\n💡 How to complete:\n• Click "Complete in Private Chat" button (easiest)\n• Or use: /complete RAID_ID @twitter_username TWEET_URL\n\n⏰ Raids expire after 48 hours\n💡 Make sure to interact with tweets before completing!`);

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
          "❌ Please link your account first: /link your_username");
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
    
    if (!botToken) return false;

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
        }
      );

      return response.data.ok;
    } catch (error) {
      console.error('Bot message error:', error.message);
      return false;
    }
  },

  // Store raid message ID for cleanup
  storeRaidMessageId: (chatId, messageId) => {
    const chatIdStr = chatId.toString();
    if (!telegramService.raidMessageIds.has(chatIdStr)) {
      telegramService.raidMessageIds.set(chatIdStr, []);
    }
    telegramService.raidMessageIds.get(chatIdStr).push(messageId);
  },

  // Delete old raid messages
  deleteOldRaidMessages: async () => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return;

    try {
      for (const [chatId, messageIds] of telegramService.raidMessageIds.entries()) {
        for (const messageId of messageIds) {
          try {
            await axios.post(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
              chat_id: chatId,
              message_id: messageId
            });
            console.log(`Deleted old raid message ${messageId} from chat ${chatId}`);
          } catch (error) {
            // Message might already be deleted or bot doesn't have permission
            console.log(`Could not delete message ${messageId} from chat ${chatId}: ${error.message}`);
          }
        }
      }
      // Clear the stored message IDs after deletion
      telegramService.raidMessageIds.clear();
    } catch (error) {
      console.error('Error deleting old raid messages:', error.message);
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
          "❌ Please link your account first: /link your_username");
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

      // Set conversation state
      telegramService.setConversationState(telegramUserId, {
        action: 'waiting_username',
        raidId: raidId,
        tweetUrl: raid.tweetUrl,
        raidTitle: raid.title,
        raidPoints: raid.points
      });

      // Ask for username
      await telegramService.sendBotMessage(chatId, 
        `🚀 Completing: ${raid.title}\n\n⚠️ BEFORE CONTINUING: Make sure you have already:\n✅ LIKED the tweet\n✅ RETWEETED the tweet\n✅ COMMENTED on the tweet\n✅ BOOKMARKED the tweet\n\n📝 Now enter your Twitter username (without @):\n\n💡 Example: myusername`);

    } catch (error) {
      console.error('Start completion error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error starting completion. Please try again later.");
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
        `✅ Raid submitted successfully!\n\n📝 Twitter: @${twitterUsername}\n💰 Reward: ${state.raidPoints} points\n⏳ Status: Pending admin approval\n\n📋 What happens next:\n• Admin will review your submission\n• Points will be awarded after verification\n\n💡 Use /raids to see more available raids!`);

    } catch (error) {
      console.error('Username input error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error processing submission. Please try again.");
    }
  }


};

module.exports = telegramService; 