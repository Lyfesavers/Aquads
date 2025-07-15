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
              `🤖 Bot Commands Active!\n\nTry these commands:\n• /help - Show commands\n• /start - Get started\n• /raids - View raids with submission buttons\n\n📝 New: Streamlined completion flow - do Twitter actions manually, then submit!`);
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

    // Check if user is in a conversation state (waiting for input)
    const conversationState = telegramService.getConversationState(userId);
    
    if (conversationState && conversationState.action === 'waiting_for_username' && !text.startsWith('/')) {
      // User is providing Twitter username for raid completion
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
      // Allow users to cancel ongoing conversations
      if (conversationState) {
        telegramService.clearConversationState(userId);
        await telegramService.sendBotMessage(chatId, "❌ Raid completion cancelled.");
      } else {
        await telegramService.sendBotMessage(chatId, "No active operation to cancel.");
      }
    } else {
      // Only respond to unknown commands in private chats or if mentioned in groups
      if (chatType === 'private' || text.includes('@')) {
        if (conversationState) {
          await telegramService.sendBotMessage(chatId, 
            "📝 Please provide your Twitter username, or type /cancel to abort.");
        } else {
          await telegramService.sendBotMessage(chatId, 
            "❓ Unknown command. Use /help to see available commands.");
        }
      }
    }
  },

  // Handle /start command
  handleStartCommand: async (chatId, userId, username) => {
    const message = `🚀 Welcome to Aquads Bot!

Hi ${username ? `@${username}` : 'there'}! I can help you with Twitter raids.

Available Commands:
/link USERNAME - Link your Telegram to Aquads account
/raids - View available raids with quick complete buttons
/help - Show this help message

💡 Quick Start:
1. Link your account: /link your_aquads_username
2. Use /raids to see available Twitter raids
3. Do Twitter actions manually (like, retweet, comment, bookmark)
4. Click "📝 Submit Completion" to report you did them

⚠️ Important: Buttons don't do Twitter actions for you - you must do them manually first!`;

    await telegramService.sendBotMessage(chatId, message);
  },

  // Handle /help command
  handleHelpCommand: async (chatId) => {
    const message = `📋 Aquads Bot Commands:

🔗 /link USERNAME - Link your Telegram to Aquads account (case sensitive)
📋 /raids - View available Twitter raids with quick complete buttons
✅ /complete RAID_ID @twitter_username TWEET_URL - Complete a raid (legacy method)
❌ /cancel - Cancel ongoing raid completion
❓ /help - Show this help message

💡 How to Complete Raids:
1. Use /raids to see available raids
2. Click the tweet link and do Twitter actions manually:
   • Like, Retweet, Comment & Bookmark the tweet
3. Click "📝 Submit Completion" button 
4. Enter your Twitter username for verification
5. Admins verify your Twitter activity and award points

Example Usage:
/link myusername
/raids
(Do Twitter actions: like, retweet, comment, bookmark)
(Click "📝 Submit Completion" button)
myusername

💡 Tips:
• Link your account first before completing raids
• Do ALL Twitter actions before submitting completion
• Commands work in both private chat and groups
• Type /cancel to abort any ongoing operation
• Admins verify your actual Twitter activity

🚀 Getting Started:
1. Link your account: /link your_username
2. View raids: /raids
3. Do Twitter actions manually, then submit completion!`;

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

      // Send raids with inline buttons
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
        message += `📊 Status: ${status}\n`;
        message += `⏰ Expires: ${new Date(new Date(raid.createdAt).getTime() + (2 * 24 * 60 * 60 * 1000)).toLocaleDateString()}\n\n`;
        
        if (!userCompleted) {
          message += `📋 TO COMPLETE:\n`;
          message += `1. Click the tweet link above\n`;
          message += `2. Like, Retweet, Comment & Bookmark\n`;
          message += `3. Click "Submit Completion" below\n`;
          message += `4. Enter your Twitter username\n\n`;
          message += `⚠️ You must do the Twitter actions manually first!`;
        }

        // Create inline keyboard with Complete button (only if not completed)
        let keyboard = null;
        if (!userCompleted) {
          keyboard = {
            inline_keyboard: [[
              {
                text: "📝 Submit Completion",
                callback_data: JSON.stringify({
                  action: "start_completion",
                  raidId: raid._id.toString()
                })
              }
            ]]
          };
        }

        await telegramService.sendBotMessageWithKeyboard(chatId, message, keyboard);
      }

      // Send summary message
      const availableCount = activeRaids.filter(raid => 
        !raid.completions.some(completion => 
          completion.userId && completion.userId.toString() === user._id.toString()
        )
      ).length;

      await telegramService.sendBotMessage(chatId, 
        `📊 Summary: ${activeRaids.length} total raids, ${availableCount} available for you\n\n💡 Instructions:\n1. Click tweet links to open Twitter\n2. Like, Retweet, Comment & Bookmark manually\n3. Click "📝 Submit Completion" to report completion\n4. Enter your Twitter username for verification\n\n⚠️ The button doesn't do Twitter actions for you!\n⏰ Raids expire after 48 hours`);

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
        "❌ Usage: /complete RAID_ID @twitter_username TWEET_URL\n\nExample: /complete 123abc @mytwitter https://twitter.com/user/status/123\n\n💡 Tip: Use /raids for easier completion with buttons!\n\n⚠️ Remember: Do the Twitter actions (like, retweet, comment, bookmark) manually first!");
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
        `✅ Completion Submitted Successfully!

📝 Twitter: @${twitterUsername}
🔗 Tweet: ${tweetUrl}
⏳ Status: Pending admin verification
💰 Reward: ${raid.points} points (after approval)

🔍 What happens next:
• Admins will check your Twitter profile
• They'll verify you liked, retweeted, commented & bookmarked
• Points awarded only after confirmation

⚠️ If you haven't done the Twitter actions yet, do them now before admin review!`);

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

  // Conversation state management
  conversationStates: new Map(),

  // Set conversation state for a user
  setConversationState: (userId, state) => {
    telegramService.conversationStates.set(userId.toString(), state);
  },

  // Get conversation state for a user
  getConversationState: (userId) => {
    return telegramService.conversationStates.get(userId.toString());
  },

  // Clear conversation state for a user
  clearConversationState: (userId) => {
    telegramService.conversationStates.delete(userId.toString());
  },

  // Handle callback queries from inline buttons
  handleCallbackQuery: async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const queryId = callbackQuery.id;

    try {
      // Parse callback data
      const callbackData = JSON.parse(callbackQuery.data);
      
      // Answer the callback query first to remove loading state
      await telegramService.answerCallbackQuery(queryId);

      if (callbackData.action === 'start_completion') {
        await telegramService.handleStartCompletion(chatId, userId, callbackData.raidId);
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

  // Handle start completion from button click
  handleStartCompletion: async (chatId, telegramUserId, raidId) => {
    try {
      // Check if user is linked
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      
      if (!user) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Please link your account first: /link your_username");
        return;
      }

      // Validate raid ID format
      if (!raidId || !/^[0-9a-fA-F]{24}$/.test(raidId)) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Invalid raid ID. Please use /raids to see available raids.");
        return;
      }

      // Find the raid
      const raid = await TwitterRaid.findById(raidId);
      
      if (!raid) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Raid not found. Please use /raids to see available raids.");
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

      // Set conversation state to wait for Twitter username
      telegramService.setConversationState(telegramUserId, {
        action: 'waiting_for_username',
        raidId: raidId,
        raidTitle: raid.title,
        raidPoints: raid.points,
        tweetUrl: raid.tweetUrl
      });

      // Ask for Twitter username
      await telegramService.sendBotMessage(chatId, 
        `📝 Submitting completion for: ${raid.title}\n\n💰 Reward: ${raid.points} points\n🔗 Tweet: ${raid.tweetUrl}\n\n⚠️ IMPORTANT: Make sure you have already:\n✅ Liked the tweet\n✅ Retweeted it\n✅ Left a comment\n✅ Bookmarked it\n\nAdmins will verify your Twitter activity!\n\n📝 Please enter your Twitter username (without @):\n\nExample: myusername`);

    } catch (error) {
      console.error('Start completion error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error starting raid completion. Please try again later.");
    }
  },

  // Handle Twitter username input during raid completion
  handleUsernameInput: async (chatId, telegramUserId, text, conversationState) => {
    try {
      // Clear conversation state first
      telegramService.clearConversationState(telegramUserId);

      // Clean and validate username
      const twitterUsername = text.trim().replace('@', ''); // Remove @ if present
      const usernameRegex = /^[a-zA-Z0-9_]{1,15}$/;
      
      if (!usernameRegex.test(twitterUsername)) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Invalid Twitter username. Please use letters, numbers, and underscores only (max 15 characters).\n\nUse /raids to try again.");
        return;
      }

      // Get user and raid data
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      if (!user) {
        await telegramService.sendBotMessage(chatId, 
          "❌ User account not found. Please link your account first: /link your_username");
        return;
      }

      const raid = await TwitterRaid.findById(conversationState.raidId);
      if (!raid) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Raid no longer exists. Please use /raids to see current raids.");
        return;
      }

      // Check if user already completed this raid (double-check)
      const userCompleted = raid.completions.some(
        completion => completion.userId && completion.userId.toString() === user._id.toString()
      );

      if (userCompleted) {
        await telegramService.sendBotMessage(chatId, 
          "❌ You have already completed this raid!");
        return;
      }

      // Extract tweet ID from URL
      const tweetIdMatch = conversationState.tweetUrl.match(/\/status\/(\d+)/);
      if (!tweetIdMatch || !tweetIdMatch[1]) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Invalid tweet URL in raid data. Please contact support.");
        return;
      }

      const tweetId = tweetIdMatch[1];

      // Create completion record
      const completion = {
        userId: user._id,
        twitterUsername: twitterUsername,
        tweetUrl: conversationState.tweetUrl,
        tweetId: tweetId,
        verificationCode: 'aquads.xyz',
        verificationMethod: 'manual',
        verified: true,
        approvalStatus: 'pending',
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        pointsAwarded: false,
        ipAddress: 'telegram_button',
        verificationNote: 'Submitted via Telegram bot button interface',
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

      // Send success message
      await telegramService.sendBotMessage(chatId, 
        `✅ Completion Submitted Successfully!\n\n🚀 Raid: ${conversationState.raidTitle}\n📝 Twitter: @${twitterUsername}\n🔗 Tweet: ${conversationState.tweetUrl}\n⏳ Status: Pending admin verification\n💰 Reward: ${conversationState.raidPoints} points (after approval)\n\n🔍 What happens next:\n• Admins will check your Twitter profile\n• They'll verify you liked, retweeted, commented & bookmarked\n• Points awarded only after confirmation\n\n⚠️ If you haven't done the Twitter actions yet, do them now before admin review!\n\nUse /raids to see more available raids!`);

    } catch (error) {
      console.error('Username input error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error processing your submission. Please try again later or use /raids to start over.");
    }
  },


};

module.exports = telegramService; 