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
        console.log('Telegram not configured, skipping notification');
        return false;
      }

      // Construct the message text
      const message = `🚀 **New Twitter Raid Available!**

💰 **Reward:** ${raidData.points || 50} points
🎯 **Task:** Like, Retweet & Comment

🔗 **Tweet:** ${raidData.tweetUrl}
▶️ **Complete:** ${process.env.FRONTEND_URL || 'https://aquads.xyz'}

⏰ Available for 48 hours!`;

      // Get the video file path
      const videoPath = path.join(__dirname, '../../public/RAID.mp4');
      
      // Check if video exists
      if (!fs.existsSync(videoPath)) {
        console.log('RAID.mp4 not found, sending text only');
        return await telegramService.sendTextMessage(botToken, chatId, message);
      }

      // Send video with caption
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('video', fs.createReadStream(videoPath));
      formData.append('caption', message);
      formData.append('parse_mode', 'Markdown');

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
        console.log('Telegram raid notification sent successfully');
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
          parse_mode: 'Markdown',
        }
      );

      if (response.data.ok) {
        console.log('Telegram text notification sent successfully');
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

  // Bot polling functionality
  startBot: async () => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    console.log('=== TELEGRAM BOT DEBUG ===');
    console.log('Bot token configured:', botToken ? 'YES' : 'NO');
    console.log('Bot token length:', botToken ? botToken.length : 0);
    
    if (!botToken) {
      console.log('Telegram bot token not configured, skipping bot startup');
      return false;
    }

    // Test bot configuration
    try {
      const response = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`);
      if (response.data.ok) {
        console.log('Bot info:', response.data.result);
        console.log('Bot username:', response.data.result.username);
      } else {
        console.error('Bot configuration error:', response.data);
        return false;
      }
    } catch (error) {
      console.error('Bot test failed:', error.message);
      return false;
    }

    // Clear any existing webhook (webhooks interfere with polling)
    try {
      await axios.get(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
      console.log('Webhook cleared for polling');
    } catch (error) {
      console.error('Failed to clear webhook:', error.message);
    }

    console.log('Starting Telegram bot polling...');
    telegramService.pollForUpdates();
    return true;
  },

  // Poll for updates from Telegram
  pollForUpdates: async () => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) return;

    console.log('Bot polling started successfully');
    let offset = 0;
    let pollCount = 0;
    
    const poll = async () => {
      try {
        pollCount++;
        console.log(`Polling attempt #${pollCount}, offset: ${offset}`);
        
        const response = await axios.get(`https://api.telegram.org/bot${botToken}/getUpdates`, {
          params: {
            offset: offset,
            timeout: 10, // Reduced timeout for better reliability
            allowed_updates: ['message']
          },
          timeout: 15000 // 15 second axios timeout
        });

        if (response.data.ok) {
          if (response.data.result.length > 0) {
            console.log(`Received ${response.data.result.length} updates`);
            for (const update of response.data.result) {
              offset = update.update_id + 1;
              
              if (update.message && update.message.text) {
                console.log(`Processing message: ${update.message.text}`);
                try {
                  await telegramService.handleCommand(update.message);
                } catch (commandError) {
                  console.error('Command handling error:', commandError.message);
                }
              }
            }
          } else {
            console.log('No new updates');
          }
        } else {
          console.error('Telegram API error:', response.data);
        }
      } catch (error) {
        console.error('Telegram polling error:', error.message);
        // Wait longer before retrying on error
        setTimeout(poll, 5000);
        return;
      }
      
      // Continue polling with shorter interval
      setTimeout(poll, 100);
    };

    poll();
  },

  // Handle incoming commands
  handleCommand: async (message) => {
    const chatId = message.chat.id;
    const text = message.text.trim();
    const userId = message.from.id;
    const username = message.from.username;
    const chatType = message.chat.type;

    console.log(`=== COMMAND RECEIVED ===`);
    console.log(`Chat ID: ${chatId}`);
    console.log(`Chat Type: ${chatType}`);
    console.log(`User ID: ${userId}`);
    console.log(`Username: ${username}`);
    console.log(`Message: ${text}`);

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
    } else {
      // Only respond to unknown commands in private chats or if mentioned in groups
      if (chatType === 'private' || text.includes('@')) {
        await telegramService.sendBotMessage(chatId, 
          "❓ Unknown command. Use /help to see available commands.");
      }
    }
  },

  // Handle /start command
  handleStartCommand: async (chatId, userId, username) => {
    const message = `🚀 **Welcome to Aquads Bot!**

Hi ${username ? `@${username}` : 'there'}! I can help you with Twitter raids.

**Available Commands:**
/link [aquads_username] - Link your Telegram to Aquads account
/raids - View available raids
/complete [raid_id] [twitter_username] [tweet_url] - Complete a raid
/help - Show this help message

First, link your account with: /link your_aquads_username`;

    await telegramService.sendBotMessage(chatId, message);
  },

  // Handle /help command
  handleHelpCommand: async (chatId) => {
    const message = `📋 **Aquads Bot Commands:**

🔗 **/link [aquads_username]** - Link your Telegram to Aquads account
📋 **/raids** - View available Twitter raids
✅ **/complete [raid_id] [twitter_username] [tweet_url]** - Complete a raid
❓ **/help** - Show this help message

**Example Usage:**
\`/link myusername\`
\`/raids\`
\`/complete 123abc @mytwitter https://twitter.com/user/status/123\`

**💡 Tips:**
• Link your account first before using other commands
• Commands work in both private chat and groups
• Bot will send you confirmations for successful actions

**🚀 Getting Started:**
1. Link your account: \`/link your_username\`
2. View raids: \`/raids\`
3. Complete raids: \`/complete [raid_id] [twitter] [tweet_url]\``;

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
        `✅ **Account Linked!**
        
Your Telegram is now linked to Aquads account: **${aquadsUsername}**

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

      let message = "🚀 **Available Twitter Raids:**\n\n";
      
      for (const raid of activeRaids) {
        // Check if user already completed this raid
        const userCompleted = raid.completions.some(
          completion => completion.userId && completion.userId.toString() === user._id.toString()
        );

        const status = userCompleted ? "✅ Completed" : "⏳ Available";
        
        message += `**${raid.title}**\n`;
        message += `💰 Reward: ${raid.points} points\n`;
        message += `🎯 Task: ${raid.description}\n`;
        message += `🔗 Tweet: ${raid.tweetUrl}\n`;
        message += `🆔 ID: \`${raid._id}\`\n`;
        message += `📊 Status: ${status}\n\n`;
      }

      message += "💡 **To complete a raid:**\n";
      message += "`/complete [raid_id] [twitter_username] [tweet_url]`\n\n";
      message += "⏰ Raids expire after 48 hours";

      await telegramService.sendBotMessage(chatId, message);

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
        "❌ Usage: /complete [raid_id] [twitter_username] [tweet_url]");
      return;
    }

    const raidId = parts[1];
    const twitterUsername = parts[2].replace('@', ''); // Remove @ if present
    const tweetUrl = parts[3];

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
        verificationMethod: 'telegram_bot',
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
        `✅ **Raid Submitted Successfully!**

📝 **Twitter:** @${twitterUsername}
🔗 **Tweet:** ${tweetUrl}
⏳ **Status:** Pending admin approval
💰 **Reward:** ${raid.points} points (after approval)

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
          parse_mode: 'Markdown',
        }
      );

      return response.data.ok;
    } catch (error) {
      console.error('Bot message error:', error.message);
      return false;
    }
  }
};

module.exports = telegramService; 