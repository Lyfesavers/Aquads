const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const User = require('../models/User');
const TwitterRaid = require('../models/TwitterRaid');

const telegramService = {
  sendRaidNotification: async (raidData) => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      if (!botToken || !chatId) {
        return false;
      }

      // Construct the message text
      const message = `🚀 New Twitter Raid Available!

💰 Reward: ${raidData.points || 50} points
🎯 Task: Like, Retweet & Comment

🔗 Tweet: ${raidData.tweetUrl}
▶️ Complete: ${process.env.FRONTEND_URL || 'https://aquads.xyz'}

⏰ Available for 48 hours!`;

      // Get the video file path
      const videoPath = path.join(__dirname, '../../public/RAID.mp4');
      
      // Check if video exists
      if (!fs.existsSync(videoPath)) {
        return await telegramService.sendTextMessage(botToken, chatId, message);
      }

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
        return true;
      } else {
        console.error('Telegram API error:', response.data);
        return false;
      }

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
        return true;
      } else {
        console.error('Telegram API error:', response.data);
        return false;
      }
    } catch (error) {
      console.error('Telegram text notification failed:', error.message);
      return false;
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
              `🤖 Bot Commands Active!\n\nTry these commands:\n• /help - Show commands\n• /start - Get started\n• /raids - View raids`);
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

    // Check if user is in conversation state
    const conversationState = telegramService.getConversationState(userId);
    
    if (conversationState && conversationState.action === 'waiting_username' && !text.startsWith('/')) {
      // User is providing Twitter username
      await telegramService.handleUsernameInput(chatId, userId, text, conversationState);
      return;
    }

    // Handle commands in both private and group chats
    if (text.startsWith('/start')) {
      await telegramService.handleStartCommand(chatId, userId, username);
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
  handleStartCommand: async (chatId, userId, username) => {
    const message = `🚀 Welcome to Aquads Bot!

Hi ${username ? `@${username}` : 'there'}! I can help you with Twitter raids.

Available Commands:
/link USERNAME - Link your Telegram to Aquads account
/raids - View available raids
/complete RAID_ID @twitter_username TWEET_URL - Complete a raid
/help - Show this help message

First, link your account with: /link your_aquads_username`;

    await telegramService.sendBotMessage(chatId, message);
  },

  // Handle /help command
  handleHelpCommand: async (chatId) => {
    const message = `📋 Aquads Bot Commands:

🔗 /link Aquads USERNAME - Link your Telegram to Aquads account (case sensitive)
📋 /raids - View available Twitter raids
✅ /complete RAID_ID @twitter_username TWEET_URL - Complete a raid
❓ /help - Show this help message

Example Usage:
/link myusername
/raids
/complete 123abc @mytwitter https://twitter.com/user/status/123

💡 Tips:
• Link your account first before using other commands
• Commands work in both private chat and groups
• Bot will send you confirmations for successful actions

🚀 Getting Started:
1. Link your account: /link your_username
2. View raids: /raids
3. Complete raids: /complete RAID_ID @twitter TWEET_URL`;

    await telegramService.sendBotMessage(chatId, message);
  },

  // Handle /link command
  handleLinkCommand: async (chatId, telegramUserId, text) => {
    const parts = text.split(' ');
    
    if (parts.length < 2) {
      await telegramService.sendBotMessage(chatId, 
        "❌ Please provide your Aquads username: /link your_username");
      return;
    }

    const aquadsUsername = parts[1];

    try {
      // Find the user by username
      const user = await User.findOne({ username: aquadsUsername });
      
      if (!user) {
        await telegramService.sendBotMessage(chatId, 
          `❌ User '${aquadsUsername}' not found. Please check your username.`);
        return;
      }

      // Link Telegram ID to user account
      user.telegramId = telegramUserId.toString();
      await user.save();

      await telegramService.sendBotMessage(chatId, 
        `✅ Account Linked!
        
Your Telegram is now linked to Aquads account: ${aquadsUsername}

You can now use:
• /raids - View available raids
• /complete - Complete raids directly in Telegram`);

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
          "❌ Please link your account first: /link your_username");
        return;
      }

      // Get active raids
      const raids = await TwitterRaid.find({ active: true })
        .sort({ createdAt: -1 })
        .limit(10);

      if (raids.length === 0) {
        await telegramService.sendBotMessage(chatId, 
          "📭 No active raids available right now. Check back later!");
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
                text: "🚀 Complete Raid",
                callback_data: JSON.stringify({
                  action: "complete",
                  raidId: raid._id.toString()
                })
              }
            ]]
          };
        }

        await telegramService.sendBotMessageWithKeyboard(chatId, message, keyboard);
      }

      // Send summary
      await telegramService.sendBotMessage(chatId, 
        `📊 ${activeRaids.length} raids shown above\n💡 Click "🚀 Complete Raid" or use:\n/complete RAID_ID @twitter_username TWEET_URL\n⏰ Raids expire after 48 hours`);

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
        "❌ Usage: /complete RAID_ID @twitter_username TWEET_URL\n\nExample: /complete 123abc @mytwitter https://twitter.com/user/status/123");
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

Your submission has been recorded and will be reviewed by our team. Points will be awarded after verification.`);

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
        `🚀 Completing: ${raid.title}\n\n⚠️ BEFORE CONTINUING: Make sure you have already:\n✅ LIKED the tweet\n✅ RETWEETED the tweet\n✅ COMMENTED on the tweet\n✅ BOOKMARKED the tweet\n\n📝 Now enter your Twitter username (without @):\n\nExample: myusername`);

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
        `✅ Raid submitted successfully!\n\n📝 Twitter: @${twitterUsername}\n💰 Reward: ${state.raidPoints} points\n⏳ Status: Pending admin approval\n\nUse /raids to see more!`);

    } catch (error) {
      console.error('Username input error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error processing submission. Please try again.");
    }
  }


};

module.exports = telegramService; 