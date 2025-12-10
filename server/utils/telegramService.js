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
  
  // Queue system for vote notifications to prevent race conditions
  voteNotificationQueue: [],
  isProcessingVoteQueue: false,

  // Queue system for raid completion notifications to prevent race conditions
  raidCompletionQueue: [],
  isProcessingRaidCompletionQueue: false,

  // Cache video file IDs to avoid re-uploading (Telegram best practice)
  cachedVideoFileIds: {
    trend: null,
    vote: null,
    raid: null
  },

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

💰 Reward: ${raidData.points || 20} points
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
            
            // Add "Hire an Expert" button
            const keyboard = {
              inline_keyboard: [
                [
                  {
                    text: '👨‍💼 Hire an Expert',
                    url: 'https://aquads.xyz/marketplace'
                  }
                ]
              ]
            };
            formData.append('reply_markup', JSON.stringify(keyboard));

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
      // Add "Hire an Expert" button
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '👨‍💼 Hire an Expert',
              url: 'https://aquads.xyz/marketplace'
            }
          ]
        ]
      };

      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
          reply_markup: keyboard
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
    
    if (conversationState && !text.startsWith('/')) {
      // Check for onboarding-related states
      if (conversationState.action.startsWith('onboarding_') || 
          conversationState.action.startsWith('settings_')) {
        await telegramService.handleOnboardingUsernameInput(chatId, userId, text, conversationState);
        return;
      }
      
      // Check for raid completion state (existing functionality)
      if (conversationState.action === 'waiting_username') {
        await telegramService.handleUsernameInput(chatId, userId, text, conversationState);
        return;
      }
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
      await telegramService.handleHelpCommand(chatId, userId);
    } else if (text.startsWith('/bubbles')) {
      await telegramService.handleBubblesCommand(chatId, userId);
    } else if (text.startsWith('/mybubble')) {
      await telegramService.handleMyBubbleCommand(chatId, userId);
    } else if (text.startsWith('/createraid')) {
      await telegramService.handleCreateRaidCommand(chatId, userId, text);
    } else if (text.startsWith('/setbranding')) {
      await telegramService.handleSetBrandingCommand(chatId, userId);
    } else if (text.startsWith('/removebranding')) {
      await telegramService.handleRemoveBrandingCommand(chatId, userId);
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

    // Check if user is already linked
    const existingUser = await User.findOne({ telegramId: userId.toString() });
    
    if (existingUser) {
      // Already linked - show help menu (same as /help command)
      await telegramService.handleHelpCommand(chatId, userId);
      return;
    }

    // New user - show guided welcome screen
    await telegramService.showWelcomeScreen(chatId, username);
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

  // Handle /help command - Show main menu
  handleHelpCommand: async (chatId, telegramUserId = null) => {
    // Check if user is linked and get their profile info
    let profileSection = '';
    
    if (telegramUserId) {
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      
      if (user) {
        const twitter = user.twitterUsername ? `✅ @${user.twitterUsername}` : '❌ Not set';
        const facebook = user.facebookUsername ? `✅ @${user.facebookUsername}` : '❌ Not set';
        
        // Check if user has a bumped project with branding
        const bumpedProject = await Ad.findOne({
          owner: user.username,
          isBumped: true,
          status: { $in: ['active', 'approved'] }
        }).select('customBrandingImage');
        
        const branding = bumpedProject?.customBrandingImage ? '✅ Set' : '❌ Not set';
        
        profileSection = `👤 <b>${user.username}</b> | 💰 ${user.points || 0} pts
🐦 Twitter: ${twitter}
📘 Facebook: ${facebook}
🎨 Branding: ${branding}

━━━━━━━━━━━━━━━━━━━━

`;
      }
    }
    
    const message = `🤖 <b>Aquads Bot</b>

${profileSection}Select a category below:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🔗 Account Setup", callback_data: "help_account" },
          { text: "💰 Raids", callback_data: "help_raids" }
        ],
        [
          { text: "📊 Bubbles", callback_data: "help_bubbles" },
          { text: "🎨 Branding", callback_data: "help_branding" }
        ],
        [
          { text: "🚀 Quick Start", callback_data: "help_quickstart" },
          { text: "📋 All Commands", callback_data: "help_all" }
        ],
        [
          { text: "🌐 Visit Website", url: "https://aquads.xyz" }
        ]
      ]
    };

    await telegramService.sendMessageWithKeyboard(chatId, message, keyboard);
  },

  // Edit help menu - Main Menu (with user profile if available)
  editHelpMenu: async (chatId, messageId, telegramUserId = null) => {
    // Check if user is linked and get their profile info
    let profileSection = '';
    
    if (telegramUserId) {
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      
      if (user) {
        const twitter = user.twitterUsername ? `✅ @${user.twitterUsername}` : '❌ Not set';
        const facebook = user.facebookUsername ? `✅ @${user.facebookUsername}` : '❌ Not set';
        
        // Check if user has a bumped project with branding
        const bumpedProject = await Ad.findOne({
          owner: user.username,
          isBumped: true,
          status: { $in: ['active', 'approved'] }
        }).select('customBrandingImage');
        
        const branding = bumpedProject?.customBrandingImage ? '✅ Set' : '❌ Not set';
        
        profileSection = `👤 <b>${user.username}</b> | 💰 ${user.points || 0} pts
🐦 Twitter: ${twitter}
📘 Facebook: ${facebook}
🎨 Branding: ${branding}

━━━━━━━━━━━━━━━━━━━━

`;
      }
    }
    
    const message = `🤖 <b>Aquads Bot</b>

${profileSection}Select a category below:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🔗 Account Setup", callback_data: "help_account" },
          { text: "💰 Raids", callback_data: "help_raids" }
        ],
        [
          { text: "📊 Bubbles", callback_data: "help_bubbles" },
          { text: "🎨 Branding", callback_data: "help_branding" }
        ],
        [
          { text: "🚀 Quick Start", callback_data: "help_quickstart" },
          { text: "📋 All Commands", callback_data: "help_all" }
        ],
        [
          { text: "🌐 Visit Website", url: "https://aquads.xyz" }
        ]
      ]
    };

    await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
  },

  // Edit help section: Account Setup
  editHelpAccount: async (chatId, messageId) => {
    const message = `🔗 Account Setup

Link your Aquads account to use the bot:

• /link USERNAME
  Connect your Telegram to Aquads account
  (Username is case sensitive!)

• /twitter USERNAME
  Set your Twitter username for raids

• /facebook USERNAME
  Set your Facebook username for raids

📱 Example:
/link myusername
/twitter mytwitter
/facebook myfacebook

💡 You must have an Aquads account first!
Create one at: https://aquads.xyz`;

    const keyboard = {
      inline_keyboard: [[
        { text: "◀️ Back to Menu", callback_data: "help_menu" }
      ]]
    };

    await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
  },

  // Edit help section: Raids
  editHelpRaids: async (chatId, messageId) => {
    const message = `💰 Raid Commands

Earn points by completing Twitter & Facebook raids!

• /raids
  View all available raids

• /createraid TWEET_URL
  Create your own raid (free raids used first if available, otherwise 2000 points)

💡 How it works:
1. Like, Retweet & Comment on posts
2. Use /raids to see available raids
3. Click "Complete in Private Chat" button
4. Earn points after admin approval

⏰ Raids expire after 48 hours

🌐 Track points at: https://aquads.xyz`;

    const keyboard = {
      inline_keyboard: [[
        { text: "◀️ Back to Menu", callback_data: "help_menu" }
      ]]
    };

    await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
  },

  // Edit help section: Bubbles
  editHelpBubbles: async (chatId, messageId) => {
    const message = `📊 Bubble Commands

Vote on projects and view trending bubbles!

• /bubbles
  View top 10 bubbles (most bullish votes)

• /mybubble
  View YOUR projects with voting buttons

💡 How voting works:
• Click 👍 Bullish or 👎 Bearish on any project
• Earn 20 points for your first vote on each project
• Help projects climb the rankings!

🌐 Vote on website: https://aquads.xyz`;

    const keyboard = {
      inline_keyboard: [[
        { text: "◀️ Back to Menu", callback_data: "help_menu" }
      ]]
    };

    await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
  },

  // Edit help section: Branding
  editHelpBranding: async (chatId, messageId) => {
    const message = `🎨 Custom Branding

FREE for all bumped projects!

• /setbranding
  Upload your custom branding image

• /removebranding
  Remove custom branding

📋 Requirements:
• Max size: 500KB
• Format: JPG or PNG
• Recommended: 1920×1080

✨ Your image appears in:
• Vote notifications for your project
• /mybubble showcase
• /bubbles when you use it

🚀 Bump your project at: https://aquads.xyz`;

    const keyboard = {
      inline_keyboard: [[
        { text: "◀️ Back to Menu", callback_data: "help_menu" }
      ]]
    };

    await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
  },

  // Edit help section: Quick Start
  editHelpQuickStart: async (chatId, messageId) => {
    const message = `🚀 Quick Start Guide

Get started in 3 easy steps:

1️⃣ Link Your Account
   /link your_aquads_username
   (Create account at aquads.xyz first)

2️⃣ Set Social Usernames
   /twitter your_twitter
   /facebook your_facebook

3️⃣ Start Earning!
   /raids - Complete raids for points
   /mybubble - Share your project
   /bubbles - Vote on projects

💰 Redeem points for rewards at:
https://aquads.xyz`;

    const keyboard = {
      inline_keyboard: [[
        { text: "◀️ Back to Menu", callback_data: "help_menu" }
      ]]
    };

    await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
  },

  // Edit help section: All Commands
  editHelpAll: async (chatId, messageId) => {
    const message = `📋 All Commands

🔗 Account:
/link /twitter /facebook

💰 Raids:
/raids /createraid

📊 Bubbles:
/bubbles /mybubble

🎨 Branding:
/setbranding /removebranding

🔧 Other:
/help /cancel

🌐 Full details & rewards:
https://aquads.xyz`;

    const keyboard = {
      inline_keyboard: [[
        { text: "◀️ Back to Menu", callback_data: "help_menu" }
      ]]
    };

    await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
  },

  // Handle /bubbles command
  handleBubblesCommand: async (chatId, telegramUserId) => {
    try {
      await telegramService.sendTopBubblesNotification(chatId, telegramUserId);
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

      // Send Telegram notification to all groups
      telegramService.sendRaidCompletionNotification({
        userId: user._id.toString(),
        raidId: raid._id.toString(),
        raidTitle: raid.title,
        platform: platform,
        points: raid.points || 20
      }).catch(err => {
        console.error('Error sending raid completion notification:', err);
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
      // Add "Hire an Expert" button to all messages
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '👨‍💼 Hire an Expert',
              url: 'https://aquads.xyz/marketplace'
            }
          ]
        ]
      };

      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
          reply_markup: keyboard
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

  // Delete old raid completion messages
  deleteOldRaidCompletionMessages: async () => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return;

    try {
      // Load message IDs from database
      const settings = await BotSettings.findOne({ key: 'raidCompletionMessageIds' });
      const completionMessageIds = settings?.value || {};
      
      const chatCount = Object.keys(completionMessageIds).length;
      const totalMessages = Object.values(completionMessageIds).flat().length;
      
      console.log(`🗑️ Deleting old raid completion messages from ${chatCount} chats (${totalMessages} total messages)`);
      
      if (chatCount === 0) {
        console.log(`ℹ️ No stored raid completion messages found to delete`);
        return;
      }

      for (const [chatId, messageIds] of Object.entries(completionMessageIds)) {
        for (const messageId of messageIds) {
          try {
            await axios.post(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
              chat_id: chatId,
              message_id: messageId
            });
            console.log(`✅ Deleted old raid completion message ${messageId} from chat ${chatId}`);
          } catch (error) {
            // Message might already be deleted or bot doesn't have permission
            console.log(`❌ Could not delete message ${messageId} from chat ${chatId}: ${error.message}`);
          }
        }
      }
      
      // Clear the stored message IDs from database
      await BotSettings.findOneAndUpdate(
        { key: 'raidCompletionMessageIds' },
        { value: {}, updatedAt: new Date() },
        { upsert: true }
      );
      console.log(`🧹 Cleared all stored raid completion message IDs from database`);
    } catch (error) {
      console.error('Error deleting old raid completion messages:', error.message);
    }
  },

  // Store raid completion message ID for cleanup
  storeRaidCompletionMessageId: async (chatId, messageId) => {
    try {
      const chatIdStr = chatId.toString();
      
      // Get existing message IDs from database
      const settings = await BotSettings.findOne({ key: 'raidCompletionMessageIds' });
      const existingData = settings?.value || {};
      
      // Add new message ID
      if (!existingData[chatIdStr]) {
        existingData[chatIdStr] = [];
      }
      existingData[chatIdStr].push(messageId);
      
      // Save back to database
      await BotSettings.findOneAndUpdate(
        { key: 'raidCompletionMessageIds' },
        { value: existingData, updatedAt: new Date() },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error storing raid completion message ID:', error);
    }
  },

  // Process the raid completion notification queue
  processRaidCompletionQueue: async () => {
    if (telegramService.isProcessingRaidCompletionQueue || telegramService.raidCompletionQueue.length === 0) {
      return;
    }

    telegramService.isProcessingRaidCompletionQueue = true;

    while (telegramService.raidCompletionQueue.length > 0) {
      const completionData = telegramService.raidCompletionQueue.shift();
      
      try {
        await telegramService.sendRaidCompletionNotificationInternal(completionData);
      } catch (error) {
        console.error('Error processing raid completion notification from queue:', error);
      }
      
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    telegramService.isProcessingRaidCompletionQueue = false;
  },

  // Send raid completion notification to all groups (add to queue)
  sendRaidCompletionNotification: async (completionData) => {
    // Add to queue instead of processing immediately
    telegramService.raidCompletionQueue.push(completionData);
    
    // Start processing the queue
    telegramService.processRaidCompletionQueue().catch(err => {
      console.error('Error in raid completion queue processor:', err);
    });
  },

  // Internal function that actually sends the completion notification
  sendRaidCompletionNotificationInternal: async (completionData) => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (!botToken) {
        console.error('TELEGRAM_BOT_TOKEN not configured');
        return;
      }

      // Delete old completion messages first
      await telegramService.deleteOldRaidCompletionMessages();

      // Get all active groups (including the default chat ID)
      const groupsToNotify = new Set(telegramService.activeGroups);
      const defaultChatId = process.env.TELEGRAM_CHAT_ID;
      if (defaultChatId) {
        groupsToNotify.add(defaultChatId);
      }

      if (groupsToNotify.size === 0) {
        console.log('No active groups to send raid completion notification to');
        return;
      }

      // Get user info
      const user = await User.findById(completionData.userId).select('username telegramUsername');
      const username = user?.username || 'User';
      const telegramUsername = user?.telegramUsername ? `@${user.telegramUsername}` : '';

      // Determine platform
      const isFacebook = completionData.platform === 'Facebook';
      const platformName = isFacebook ? 'Facebook' : 'Twitter';
      const platformEmoji = isFacebook ? '📘' : '🐦';

      // Construct the message
      const message = `🎉 Someone Just Raided!

${platformEmoji} ${platformName} Raid
👤 ${username}${telegramUsername ? ` ${telegramUsername}` : ''} just completed a raid
💰 Reward: ${completionData.points} points

🌐 Track all raids: [@aquadsbumpbot](https://t.me/aquadsbumpbot)
💡 Complete more raids to earn points!`;

      // Send to all groups
      let successCount = 0;
      for (const chatId of groupsToNotify) {
        try {
          const result = await telegramService.sendBotMessageWithMarkdown(chatId, message);
          if (result.success) {
            successCount++;
            // Store message ID for cleanup
            await telegramService.storeRaidCompletionMessageId(chatId, result.messageId);
          }
        } catch (error) {
          console.error(`Failed to send completion notification to group ${chatId}:`, error.message);
          // Remove failed group from active groups
          telegramService.activeGroups.delete(chatId);
          await telegramService.saveActiveGroups();
        }
      }

      console.log(`📨 Raid completion notification sent to ${successCount}/${groupsToNotify.size} groups`);
      return successCount > 0;

    } catch (error) {
      console.error('Raid completion notification failed:', error.message);
      return false;
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

      // Add "Hire an Expert" button to the keyboard
      if (keyboard) {
        // Clone the keyboard to avoid modifying the original
        const enhancedKeyboard = {
          inline_keyboard: [
            ...keyboard.inline_keyboard,
            [
              {
                text: '👨‍💼 Hire an Expert',
                url: 'https://aquads.xyz/marketplace'
              }
            ]
          ]
        };
        payload.reply_markup = enhancedKeyboard;
      } else {
        // If no keyboard provided, just add the "Hire an Expert" button
        payload.reply_markup = {
          inline_keyboard: [
            [
              {
                text: '👨‍💼 Hire an Expert',
                url: 'https://aquads.xyz/marketplace'
              }
            ]
          ]
        };
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
    const messageId = callbackQuery.message.message_id;

    try {
      // Answer the callback query
      await telegramService.answerCallbackQuery(queryId);

      // Check if it's an onboarding, action, or settings callback
      if (callbackQuery.data.startsWith('onboard_') || 
          callbackQuery.data.startsWith('action_') || 
          callbackQuery.data.startsWith('settings_')) {
        await telegramService.handleOnboardingCallback(chatId, userId, messageId, callbackQuery.data);
        return;
      }

      // Check if it's a help menu callback
      if (callbackQuery.data.startsWith('help_')) {
        const helpSection = callbackQuery.data.replace('help_', '');
        
        switch (helpSection) {
          case 'menu':
            await telegramService.editHelpMenu(chatId, messageId, userId);
            break;
          case 'account':
            await telegramService.editHelpAccount(chatId, messageId);
            break;
          case 'raids':
            await telegramService.editHelpRaids(chatId, messageId);
            break;
          case 'bubbles':
            await telegramService.editHelpBubbles(chatId, messageId);
            break;
          case 'branding':
            await telegramService.editHelpBranding(chatId, messageId);
            break;
          case 'quickstart':
            await telegramService.editHelpQuickStart(chatId, messageId);
            break;
          case 'all':
            await telegramService.editHelpAll(chatId, messageId);
            break;
        }
      }
      // Check if it's a vote callback
      else if (callbackQuery.data.startsWith('vote_')) {
        // Handle simplified vote callbacks
        const voteData = callbackQuery.data.split('_');
        const voteType = voteData[1]; // 'bullish' or 'bearish'
        const projectId = voteData[2];
        await telegramService.processVote(chatId, userId, projectId, voteType);
      } else {
        // Parse callback data for other actions (like raids)
        try {
          const callbackData = JSON.parse(callbackQuery.data);
          
          if (callbackData.action === 'complete') {
            await telegramService.startRaidCompletion(chatId, userId, callbackData.raidId);
          }
        } catch (parseError) {
          // Not JSON, might be a simple callback - ignore
          console.log('Unknown callback data:', callbackQuery.data);
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

  // Edit message with inline keyboard
  editMessageWithKeyboard: async (chatId, messageId, text, keyboard) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) return false;

    try {
      await axios.post(
        `https://api.telegram.org/bot${botToken}/editMessageText`,
        {
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'HTML',
          reply_markup: keyboard
        }
      );
      return true;
    } catch (error) {
      console.error('Edit message error:', error.message);
      return false;
    }
  },

  // Send message with inline keyboard (clean version without auto-added buttons)
  sendMessageWithKeyboard: async (chatId, text, keyboard) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) return null;

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: text,
          reply_markup: keyboard,
          parse_mode: 'HTML'
        }
      );
      
      if (response.data.ok) {
        return response.data.result.message_id;
      }
      return null;
    } catch (error) {
      console.error('Send message with keyboard error:', error.message);
      return null;
    }
  },

  // ==========================================
  // ONBOARDING WIZARD FUNCTIONS
  // ==========================================

  // Show welcome screen for new users
  showWelcomeScreen: async (chatId, username) => {
    const message = `🚀 <b>Welcome to Aquads Bot!</b>

Hey${username ? ` @${username}` : ''}! 👋

Earn points by:
• 🎯 Completing Twitter & Facebook raids
• 🗳️ Voting on projects (bullish/bearish)
• 📈 Getting your project trending

Let's get you set up in <b>30 seconds!</b> 👇`;

    const keyboard = {
      inline_keyboard: [
        [{ text: "✨ Start Quick Setup", callback_data: "onboard_start" }],
        [
          { text: "📖 Just Browsing", callback_data: "onboard_browse" },
          { text: "❓ Help", callback_data: "help_menu" }
        ]
      ]
    };

    await telegramService.sendMessageWithKeyboard(chatId, message, keyboard);
  },

  // Step 1: Ask if they have an account
  showOnboardingStep1: async (chatId, messageId = null) => {
    const message = `📝 <b>Step 1 of 3: Link Your Account</b>

Do you have an Aquads account?

💡 If you registered on aquads.xyz, tap "Yes"`;

    const keyboard = {
      inline_keyboard: [
        [{ text: "✅ Yes, I have an account", callback_data: "onboard_has_account" }],
        [{ text: "🆕 No, I need to create one", callback_data: "onboard_no_account" }],
        [{ text: "⏭️ Skip for now", callback_data: "onboard_skip_all" }]
      ]
    };

    if (messageId) {
      await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
    } else {
      await telegramService.sendMessageWithKeyboard(chatId, message, keyboard);
    }
  },

  // Show create account redirect
  showCreateAccountRedirect: async (chatId, messageId) => {
    const message = `🌐 <b>Create Your Account</b>

Tap below to register on Aquads (takes ~1 minute).

✅ Secure email verification
✅ Full account features
✅ Track your points & rewards

After creating your account, come back and tap
"I've Created My Account" to continue! 👇`;

    const keyboard = {
      inline_keyboard: [
        [{ text: "🌐 Create Account on Aquads.xyz", url: "https://aquads.xyz?action=register&from=telegram" }],
        [{ text: "✅ I've Created My Account", callback_data: "onboard_has_account" }],
        [{ text: "⬅️ Back", callback_data: "onboard_back_step1" }]
      ]
    };

    await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
  },

  // Ask for Aquads username
  showUsernamePrompt: async (chatId, messageId) => {
    const message = `📝 <b>What's your Aquads username?</b>

Type the username you use to login on aquads.xyz 👇

(Just type it below, no command needed)`;

    const keyboard = {
      inline_keyboard: [
        [{ text: "⬅️ Back", callback_data: "onboard_back_step1" }]
      ]
    };

    await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
  },

  // Step 2: Twitter setup (edits existing message)
  showOnboardingStep2_Twitter: async (chatId, messageId, username) => {
    const message = `✅ <b>Account Linked: ${username}</b>

📱 <b>Step 2 of 3: Twitter/X Username</b>

This is used for Twitter raids.
Just type your handle below 👇 (without the @)`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "⏭️ Skip", callback_data: "onboard_skip_twitter" },
          { text: "⬅️ Back", callback_data: "onboard_back_step1" }
        ]
      ]
    };

    if (messageId) {
      await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
    } else {
      await telegramService.sendMessageWithKeyboard(chatId, message, keyboard);
    }
  },

  // Step 3: Facebook setup (edits existing message)
  showOnboardingStep3_Facebook: async (chatId, messageId, twitterSet) => {
    const twitterMsg = twitterSet ? `✅ Twitter: @${twitterSet}\n\n` : '';
    
    const message = `${twitterMsg}📘 <b>Step 3 of 3: Facebook Username (Optional)</b>

Used for Facebook raids.
Type your name below or skip 👇`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "⏭️ Skip", callback_data: "onboard_skip_facebook" },
          { text: "⬅️ Back", callback_data: "onboard_back_step2" }
        ]
      ]
    };

    if (messageId) {
      await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
    } else {
      await telegramService.sendMessageWithKeyboard(chatId, message, keyboard);
    }
  },

  // Ask what brings them here (user type selection) - edits existing message
  showUserTypeSelection: async (chatId, messageId) => {
    const message = `🎯 <b>Almost done! What brings you to Aquads?</b>

This helps us show you the right features:`;

    const keyboard = {
      inline_keyboard: [
        [{ text: "🎯 I want to complete raids & earn points", callback_data: "onboard_type_raider" }],
        [{ text: "🚀 I have a project to promote", callback_data: "onboard_type_project" }],
        [{ text: "🔄 Both - I raid AND have a project", callback_data: "onboard_type_both" }]
      ]
    };

    if (messageId) {
      await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
    } else {
      await telegramService.sendMessageWithKeyboard(chatId, message, keyboard);
    }
  },

  // Show raider tips (edits existing message)
  showRaiderTips: async (chatId, messageId, showProjectSetupNext = false) => {
    const message = `🎯 <b>Raiding Quick Tips</b>

How to earn points:

1️⃣ Tap "🎯 Raids" to see available raids
2️⃣ Like, RT, Comment on the post
3️⃣ Submit your completion
4️⃣ Earn points after admin approval!

💰 Points can be redeemed at aquads.xyz`;

    const keyboard = {
      inline_keyboard: showProjectSetupNext 
        ? [[{ text: "✅ Got it! Next: My Project →", callback_data: "onboard_project_setup" }]]
        : [[{ text: "✅ Done! Show me commands", callback_data: "onboard_complete" }]]
    };

    if (messageId) {
      await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
    } else {
      await telegramService.sendMessageWithKeyboard(chatId, message, keyboard);
    }
  },

  // Project owner: Add bot to group (edits existing message)
  showProjectSetup_AddBot: async (chatId, messageId) => {
    const message = `🚀 <b>Project Setup: Step 1</b>

To maximize your project's exposure:

📱 <b>Add the bot to your project's group:</b>

1. Open your project's Telegram group
2. Add @aquadsbumpbot to the group
3. Go to group settings → Administrators
4. Add @aquadsbumpbot as admin with <b>FULL rights</b>

⚠️ <b>Important:</b> The bot needs full admin rights to:
• Send vote notifications
• Pin trending messages
• Post project updates`;

    const keyboard = {
      inline_keyboard: [
        [{ text: "✅ I've Added the Bot", callback_data: "onboard_bot_added" }],
        [{ text: "⏭️ I'll Do This Later", callback_data: "onboard_complete" }]
      ]
    };

    if (messageId) {
      await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
    } else {
      await telegramService.sendMessageWithKeyboard(chatId, message, keyboard);
    }
  },

  // Project owner: Use /mybubble (edits existing message)
  showProjectSetup_MyBubble: async (chatId, messageId) => {
    const message = `📢 <b>Project Setup: Step 2</b>

Go to your group and type:

<code>/mybubble</code>

This will:
✅ Register your group for vote notifications
✅ Post your project with voting buttons
✅ Let your community vote directly`;

    const keyboard = {
      inline_keyboard: [
        [{ text: "✅ Done! What's Next? →", callback_data: "onboard_mybubble_done" }],
        [{ text: "⏭️ Skip for Now", callback_data: "onboard_complete" }]
      ]
    };

    if (messageId) {
      await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
    } else {
      await telegramService.sendMessageWithKeyboard(chatId, message, keyboard);
    }
  },

  // Project owner: Branding setup (edits existing message)
  showProjectSetup_Branding: async (chatId, messageId) => {
    const message = `🎨 <b>Project Setup: Step 3 (Optional)</b>

Make your project stand out! Add a custom image that shows in all vote notifications.

📋 Requirements:
• JPEG or PNG format
• Recommended: 1920×1080

Your branding appears in:
• Vote notifications
• /mybubble showcase
• Trending updates`;

    const keyboard = {
      inline_keyboard: [
        [{ text: "🎨 Set Branding Now", callback_data: "onboard_set_branding" }],
        [{ text: "✅ Done! Show me commands", callback_data: "onboard_complete" }]
      ]
    };

    if (messageId) {
      await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
    } else {
      await telegramService.sendMessageWithKeyboard(chatId, message, keyboard);
    }
  },

  // Show browse menu (for users who skip setup) - edits existing message
  showBrowseMenu: async (chatId, messageId) => {
    const message = `📖 <b>Browse Mode</b>

You can explore without linking an account, but you'll need to link to:
• Complete raids & earn points
• Vote on projects
• Create raids

🔗 Link anytime with: /link your_username`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🔥 View Trending", callback_data: "action_bubbles" },
          { text: "❓ Help", callback_data: "help_menu" }
        ],
        [
          { text: "✨ Start Setup", callback_data: "onboard_start" }
        ],
        [
          { text: "🌐 Create Account", url: "https://aquads.xyz?action=register&from=telegram" }
        ]
      ]
    };

    if (messageId) {
      await telegramService.editMessageWithKeyboard(chatId, messageId, message, keyboard);
    } else {
      await telegramService.sendMessageWithKeyboard(chatId, message, keyboard);
    }
  },

  // Show settings menu
  showSettingsMenu: async (chatId, user) => {
    const twitter = user.twitterUsername ? `@${user.twitterUsername}` : 'Not set';
    const facebook = user.facebookUsername ? `@${user.facebookUsername}` : 'Not set';

    const message = `⚙️ <b>Settings</b>

👤 Account: ${user.username}
🐦 Twitter: ${twitter}
📘 Facebook: ${facebook}
💰 Points: ${user.points || 0}

Tap to update:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🐦 Update Twitter", callback_data: "settings_twitter" },
          { text: "📘 Update Facebook", callback_data: "settings_facebook" }
        ],
        [
          { text: "🎨 Set Branding", callback_data: "action_branding" },
          { text: "🗑️ Remove Branding", callback_data: "settings_remove_branding" }
        ],
        [
          { text: "⬅️ Back to Menu", callback_data: "action_menu" }
        ]
      ]
    };

    await telegramService.sendMessageWithKeyboard(chatId, message, keyboard);
  },

  // Handle onboarding username input
  handleOnboardingUsernameInput: async (chatId, telegramUserId, text, state) => {
    try {
      const inputText = text.trim();
      const messageId = state.messageId; // Get stored messageId for editing

      if (state.action === 'onboarding_aquads_username') {
        // Verify Aquads username exists
        const user = await User.findOne({ 
          username: { $regex: new RegExp(`^${inputText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });

        if (!user) {
          await telegramService.sendBotMessage(chatId, 
            `❌ Username "${inputText}" not found.\n\nPlease check your username and try again, or create an account at aquads.xyz`);
          return;
        }

        // Check if already linked to another Telegram
        if (user.telegramId && user.telegramId !== telegramUserId.toString()) {
          await telegramService.sendBotMessage(chatId, 
            `❌ This account is already linked to another Telegram.\n\nIf this is your account, please contact support.`);
          telegramService.clearConversationState(telegramUserId);
          return;
        }

        // Check if this Telegram is already linked to another account
        const existingLink = await User.findOne({ telegramId: telegramUserId.toString() });
        if (existingLink && existingLink._id.toString() !== user._id.toString()) {
          await telegramService.sendBotMessage(chatId, 
            `❌ Your Telegram is already linked to: ${existingLink.username}\n\nContact support to change this.`);
          telegramService.clearConversationState(telegramUserId);
          return;
        }

        // Link the account
        user.telegramId = telegramUserId.toString();
        await user.save();

        // Update state and show Twitter step
        telegramService.setConversationState(telegramUserId, {
          ...state,
          action: 'onboarding_twitter',
          userId: user._id.toString(),
          username: user.username
        });

        await telegramService.showOnboardingStep2_Twitter(chatId, messageId, user.username);
      }
      else if (state.action === 'onboarding_twitter') {
        // Validate and save Twitter username
        const cleanUsername = inputText.replace('@', '').trim();
        const usernameRegex = /^[a-zA-Z0-9_]{1,15}$/;

        if (!usernameRegex.test(cleanUsername)) {
          await telegramService.sendBotMessage(chatId, 
            "❌ Invalid username. Use letters, numbers, underscores only (max 15 chars).\n\nTry again:");
          return;
        }

        const user = await User.findById(state.userId);
        if (user) {
          user.twitterUsername = cleanUsername;
          await user.save();
        }

        // Move to Facebook step
        telegramService.setConversationState(telegramUserId, {
          ...state,
          action: 'onboarding_facebook',
          twitterUsername: cleanUsername
        });

        await telegramService.showOnboardingStep3_Facebook(chatId, messageId, cleanUsername);
      }
      else if (state.action === 'onboarding_facebook') {
        // Save Facebook username (more lenient validation)
        const cleanUsername = inputText.replace('@', '').trim();

        if (cleanUsername.length < 1 || cleanUsername.length > 50) {
          await telegramService.sendBotMessage(chatId, 
            "❌ Invalid username. Please try again:");
          return;
        }

        const user = await User.findById(state.userId);
        if (user) {
          user.facebookUsername = cleanUsername;
          await user.save();
        }

        // Move to user type selection
        telegramService.setConversationState(telegramUserId, {
          ...state,
          action: 'onboarding_user_type',
          facebookUsername: cleanUsername
        });

        await telegramService.showUserTypeSelection(chatId, messageId);
      }
      else if (state.action === 'settings_twitter') {
        // Update Twitter from settings
        const cleanUsername = inputText.replace('@', '').trim();
        const usernameRegex = /^[a-zA-Z0-9_]{1,15}$/;

        if (!usernameRegex.test(cleanUsername)) {
          await telegramService.sendBotMessage(chatId, 
            "❌ Invalid username. Use letters, numbers, underscores only (max 15 chars).");
          telegramService.clearConversationState(telegramUserId);
          return;
        }

        const user = await User.findOne({ telegramId: telegramUserId.toString() });
        if (user) {
          user.twitterUsername = cleanUsername;
          await user.save();
          await telegramService.sendBotMessage(chatId, `✅ Twitter updated: @${cleanUsername}`);
          await telegramService.showSettingsMenu(chatId, user);
        }
        telegramService.clearConversationState(telegramUserId);
      }
      else if (state.action === 'settings_facebook') {
        // Update Facebook from settings
        const cleanUsername = inputText.replace('@', '').trim();

        const user = await User.findOne({ telegramId: telegramUserId.toString() });
        if (user) {
          user.facebookUsername = cleanUsername;
          await user.save();
          await telegramService.sendBotMessage(chatId, `✅ Facebook updated: @${cleanUsername}`);
          await telegramService.showSettingsMenu(chatId, user);
        }
        telegramService.clearConversationState(telegramUserId);
      }

    } catch (error) {
      console.error('Onboarding username input error:', error);
      await telegramService.sendBotMessage(chatId, "❌ Error processing input. Please try again.");
    }
  },

  // Handle onboarding callback queries
  handleOnboardingCallback: async (chatId, userId, messageId, callbackData) => {
    try {
      const state = telegramService.getConversationState(userId) || {};
      // Store messageId in state for use by text input handlers
      const stateWithMessageId = { ...state, messageId };

      switch (callbackData) {
        case 'onboard_start':
          telegramService.setConversationState(userId, { ...stateWithMessageId, action: 'onboarding_start' });
          await telegramService.showOnboardingStep1(chatId, messageId);
          break;

        case 'onboard_browse':
          telegramService.clearConversationState(userId);
          await telegramService.showBrowseMenu(chatId, messageId);
          break;

        case 'onboard_has_account':
          telegramService.setConversationState(userId, {
            ...stateWithMessageId,
            action: 'onboarding_aquads_username'
          });
          await telegramService.showUsernamePrompt(chatId, messageId);
          break;

        case 'onboard_no_account':
          await telegramService.showCreateAccountRedirect(chatId, messageId);
          break;

        case 'onboard_back_step1':
          telegramService.setConversationState(userId, { ...stateWithMessageId, action: 'onboarding_start' });
          await telegramService.showOnboardingStep1(chatId, messageId);
          break;

        case 'onboard_skip_all':
          telegramService.clearConversationState(userId);
          await telegramService.showBrowseMenu(chatId, messageId);
          break;

        case 'onboard_skip_twitter': {
          telegramService.setConversationState(userId, {
            ...stateWithMessageId,
            action: 'onboarding_facebook',
            twitterUsername: null
          });
          await telegramService.showOnboardingStep3_Facebook(chatId, messageId, null);
          break;
        }

        case 'onboard_back_step2': {
          const user = await User.findById(state.userId);
          if (user) {
            telegramService.setConversationState(userId, {
              ...stateWithMessageId,
              action: 'onboarding_twitter',
              userId: state.userId,
              username: user.username
            });
            await telegramService.showOnboardingStep2_Twitter(chatId, messageId, user.username);
          }
          break;
        }

        case 'onboard_skip_facebook': {
          telegramService.setConversationState(userId, {
            ...stateWithMessageId,
            action: 'onboarding_user_type'
          });
          await telegramService.showUserTypeSelection(chatId, messageId);
          break;
        }

        case 'onboard_type_raider': {
          telegramService.setConversationState(userId, { ...stateWithMessageId, action: 'onboarding_raider_tips' });
          await telegramService.showRaiderTips(chatId, messageId, false);
          break;
        }

        case 'onboard_type_project': {
          telegramService.setConversationState(userId, {
            ...stateWithMessageId,
            action: 'onboarding_project_setup',
            userType: 'project'
          });
          await telegramService.showProjectSetup_AddBot(chatId, messageId);
          break;
        }

        case 'onboard_type_both': {
          telegramService.setConversationState(userId, {
            ...stateWithMessageId,
            action: 'onboarding_project_setup',
            userType: 'both'
          });
          await telegramService.showRaiderTips(chatId, messageId, true);
          break;
        }

        case 'onboard_project_setup': {
          telegramService.setConversationState(userId, { ...stateWithMessageId, action: 'onboarding_project_setup' });
          await telegramService.showProjectSetup_AddBot(chatId, messageId);
          break;
        }

        case 'onboard_bot_added': {
          await telegramService.showProjectSetup_MyBubble(chatId, messageId);
          break;
        }

        case 'onboard_mybubble_done': {
          telegramService.setConversationState(userId, {
            ...stateWithMessageId,
            groupRegistered: true
          });
          await telegramService.showProjectSetup_Branding(chatId, messageId);
          break;
        }

        case 'onboard_set_branding': {
          telegramService.clearConversationState(userId);
          // Trigger branding flow (this sends a new message, which is fine)
          await telegramService.handleSetBrandingCommand(chatId, userId);
          break;
        }

        case 'onboard_complete': {
          // Show help menu at completion - uses existing help menu which edits the message
          telegramService.clearConversationState(userId);
          await telegramService.editHelpMenu(chatId, messageId, userId);
          break;
        }

        // Action callbacks
        case 'action_raids':
          await telegramService.handleRaidsCommand(chatId, userId);
          break;

        case 'action_bubbles':
        case 'action_vote':
          await telegramService.handleBubblesCommand(chatId, userId);
          break;

        case 'action_mybubble':
          await telegramService.handleMyBubbleCommand(chatId, userId);
          break;

        case 'action_createraid':
          await telegramService.sendBotMessage(chatId, 
            "📝 To create a raid, use:\n\n/createraid TWEET_URL\n\nExample:\n/createraid https://twitter.com/user/status/123456");
          break;

        case 'action_branding':
          await telegramService.handleSetBrandingCommand(chatId, userId);
          break;

        case 'action_settings': {
          const user = await User.findOne({ telegramId: userId.toString() });
          if (user) {
            await telegramService.showSettingsMenu(chatId, user);
          } else {
            await telegramService.sendBotMessage(chatId, "❌ Please link your account first: /link your_username");
          }
          break;
        }

        case 'action_menu': {
          // Show help menu (edits the current message)
          await telegramService.editHelpMenu(chatId, messageId, userId);
          break;
        }

        case 'settings_twitter': {
          telegramService.setConversationState(userId, { action: 'settings_twitter' });
          await telegramService.sendBotMessage(chatId, "🐦 Type your new Twitter username (without @):");
          break;
        }

        case 'settings_facebook': {
          telegramService.setConversationState(userId, { action: 'settings_facebook' });
          await telegramService.sendBotMessage(chatId, "📘 Type your new Facebook username:");
          break;
        }

        case 'settings_remove_branding': {
          await telegramService.handleRemoveBrandingCommand(chatId, userId);
          break;
        }

        default:
          console.log('Unknown onboarding callback:', callbackData);
      }
    } catch (error) {
      console.error('Onboarding callback error:', error);
      await telegramService.sendBotMessage(chatId, "❌ Error processing request. Please try again.");
    }
  },

  // ==========================================
  // END ONBOARDING WIZARD FUNCTIONS
  // ==========================================

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

      // Send Telegram notification to all groups
      telegramService.sendRaidCompletionNotification({
        userId: user._id.toString(),
        raidId: raid._id.toString(),
        raidTitle: raid.title,
        platform: platform,
        points: raid.points || 20
      }).catch(err => {
        console.error('Error sending raid completion notification:', err);
      });

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

      // Send Telegram notification to all groups
      telegramService.sendRaidCompletionNotification({
        userId: user._id.toString(),
        raidId: raid._id.toString(),
        raidTitle: raid.title,
        platform: platform,
        points: state.raidPoints || raid.points || 20
      }).catch(err => {
        console.error('Error sending raid completion notification:', err);
      });

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
  sendTopBubblesNotification: async (chatId, telegramUserId = null) => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!botToken) {
        return false;
      }

      // Delete old bubble messages first
      await telegramService.deleteOldBubbleMessages(chatId);
      
      // Try to find the user's project with custom branding
      let userCustomBranding = null;
      if (telegramUserId) {
        const user = await User.findOne({ telegramId: telegramUserId.toString() });
        if (user) {
          const userProject = await Ad.findOne({ 
            owner: user.username,
            isBumped: true,
            status: { $in: ['active', 'approved'] },
            customBrandingImage: { $ne: null }
          }).select('customBrandingImage');
          
          if (userProject && userProject.customBrandingImage) {
            userCustomBranding = userProject.customBrandingImage;
          }
        }
      }

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
      message += `💡 Vote on bubbles to earn points!\n\n`;
      message += `📢 Follow our trending channel for AMA updates from your trending projects - https://t.me/aquadstrending`;

      // Get the video file path
      const videoPath = path.join(__dirname, '../../public/trend.mp4');
      const videoExists = fs.existsSync(videoPath);

      // Send to the specific group
      let result = false;
      
      try {
        if (userCustomBranding) {
          // Send user's custom branding image
          const base64Data = userCustomBranding.split(',')[1];
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          const formData = new FormData();
          formData.append('chat_id', chatId);
          formData.append('photo', imageBuffer, { filename: 'branding.jpg' });
          formData.append('caption', message);
          formData.append('parse_mode', 'Markdown');
          
          // Add "Hire an Expert" button
          const keyboard = {
            inline_keyboard: [
              [
                {
                  text: '👨‍💼 Hire an Expert',
                  url: 'https://aquads.xyz/marketplace'
                }
              ]
            ]
          };
          formData.append('reply_markup', JSON.stringify(keyboard));

          const response = await axios.post(
            `https://api.telegram.org/bot${botToken}/sendPhoto`,
            formData,
            {
              headers: {
                ...formData.getHeaders(),
              },
              timeout: 30000,
            }
          );

          if (response.data.ok) {
            result = true;
            const messageId = response.data.result.message_id;
            await telegramService.storeBubbleMessageId(chatId, messageId);
            await telegramService.pinMessage(chatId, messageId);
          }
        } else if (videoExists || telegramService.cachedVideoFileIds.trend) {
          // Send default video with caption (use cached file_id if available)
          const keyboard = {
            inline_keyboard: [
              [
                {
                  text: '👨‍💼 Hire an Expert',
                  url: 'https://aquads.xyz/marketplace'
                }
              ]
            ]
          };

          let response;
          
          if (telegramService.cachedVideoFileIds.trend) {
            // Use cached file_id (much faster, no re-upload needed)
            response = await axios.post(
              `https://api.telegram.org/bot${botToken}/sendVideo`,
              {
                chat_id: chatId,
                video: telegramService.cachedVideoFileIds.trend,
                caption: message,
                parse_mode: 'Markdown',
                reply_markup: keyboard
              },
              { timeout: 15000 }
            );
          } else {
            // First time - upload the video file
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('video', fs.createReadStream(videoPath));
            formData.append('caption', message);
            formData.append('parse_mode', 'Markdown');
            formData.append('reply_markup', JSON.stringify(keyboard));

            response = await axios.post(
              `https://api.telegram.org/bot${botToken}/sendVideo`,
              formData,
              {
                headers: {
                  ...formData.getHeaders(),
                },
                timeout: 60000, // Increased timeout for first upload
              }
            );
            
            // Cache the file_id for future use
            if (response.data.ok && response.data.result.video) {
              telegramService.cachedVideoFileIds.trend = response.data.result.video.file_id;
              console.log('📹 Cached trend video file_id for faster future sends');
            }
          }

          if (response.data.ok) {
            result = true;
            const messageId = response.data.result.message_id;
            await telegramService.storeBubbleMessageId(chatId, messageId);
            await telegramService.pinMessage(chatId, messageId);
          }
        } else {
          // Send text message if no media available
          const textResult = await telegramService.sendBotMessageWithMarkdown(chatId, message);
          if (textResult.success) {
            result = true;
            const messageId = textResult.messageId;
            await telegramService.storeBubbleMessageId(chatId, messageId);
            await telegramService.pinMessage(chatId, messageId);
          }
        }
      } catch (error) {
        console.error('Failed to send media, falling back to text:', error.message);
        // Fallback to text message
        const textResult = await telegramService.sendBotMessageWithMarkdown(chatId, message);
        if (textResult.success) {
          result = true;
          const messageId = textResult.messageId;
          await telegramService.storeBubbleMessageId(chatId, messageId);
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
        message += `💡 Share this message to get votes on your project!\n\n`;
        message += `📢 Follow our trending channel for AMA updates from your trending projects - https://t.me/aquadstrending`;

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

        // Check if project has custom branding
        const hasCustomBranding = project.customBrandingImage && project.customBrandingImage.length > 0;
        
        // Send with custom branding or default video
        const videoPath = path.join(__dirname, '../../public/vote now .mp4');
        const videoExists = fs.existsSync(videoPath);
        
        try {
          if (hasCustomBranding) {
            // Send custom branding image
            const base64Data = project.customBrandingImage.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('photo', imageBuffer, { filename: 'branding.jpg' });
            formData.append('caption', message);
            formData.append('reply_markup', JSON.stringify(keyboard));

            const response = await axios.post(
              `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
              formData,
              {
                headers: {
                  ...formData.getHeaders(),
                },
                timeout: 30000,
              }
            );

            if (!response.data.ok) {
              // Fallback to text message if image fails
              await telegramService.sendBotMessageWithKeyboard(chatId, message, keyboard);
            }
          } else if (videoExists || telegramService.cachedVideoFileIds.vote) {
            // Send default video with caption and keyboard (use cached file_id if available)
            let response;
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            
            if (telegramService.cachedVideoFileIds.vote) {
              // Use cached file_id (much faster)
              response = await axios.post(
                `https://api.telegram.org/bot${botToken}/sendVideo`,
                {
                  chat_id: chatId,
                  video: telegramService.cachedVideoFileIds.vote,
                  caption: message,
                  reply_markup: keyboard
                },
                { timeout: 15000 }
              );
            } else {
              // First time - upload the video file
              const formData = new FormData();
              formData.append('chat_id', chatId);
              formData.append('video', fs.createReadStream(videoPath));
              formData.append('caption', message);
              formData.append('reply_markup', JSON.stringify(keyboard));

              response = await axios.post(
                `https://api.telegram.org/bot${botToken}/sendVideo`,
                formData,
                {
                  headers: {
                    ...formData.getHeaders(),
                  },
                  timeout: 60000, // Increased timeout for first upload
                }
              );
              
              // Cache the file_id for future use
              if (response.data.ok && response.data.result.video) {
                telegramService.cachedVideoFileIds.vote = response.data.result.video.file_id;
                console.log('📹 Cached vote video file_id for faster future sends');
              }
            }

            if (!response.data.ok) {
              // Fallback to text message if video fails
              await telegramService.sendBotMessageWithKeyboard(chatId, message, keyboard);
            }
          } else {
            // Send text message without video
            await telegramService.sendBotMessageWithKeyboard(chatId, message, keyboard);
          }
        } catch (error) {
          console.error('Failed to send media, falling back to text:', error.message);
          // Fallback to text message
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
          "❌ Please provide a tweet URL.\n\n📝 Usage: /createraid TWEET_URL\n\n💡 Example: /createraid https://twitter.com/user/status/123456789\n\n🆓 Free raids are used first if available, otherwise costs 2000 points");
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

      // Create the raid using the same logic as the website
      const TwitterRaid = require('../models/TwitterRaid');
      
      // Generate default title and description
      const title = `Twitter Raid by @${user.username}`;
      const description = `Help boost this tweet! Like, retweet, and comment to earn 20 points.`;
      
      // Check if user has free raids available
      const eligibility = user.checkFreeRaidEligibility();

      if (eligibility.eligible) {
        // Use free raid
        const usage = await user.useFreeRaid();
        
        const raid = new TwitterRaid({
          tweetId,
          tweetUrl,
          title,
          description,
          points: 20, // Fixed points for raids
          createdBy: user._id,
          isPaid: false,
          paymentStatus: 'approved', // Free raids are automatically approved
          active: true,
          paidWithPoints: false, // Not paid with points (it's a free raid)
          pointsSpent: 0 // No points spent
        });

        await raid.save();

        // Send success message for free raid (to user's private chat)
        await telegramService.sendBotMessage(telegramUserId, 
          `✅ Free Raid Created Successfully!\n\n🔗 Tweet: ${tweetUrl}\n🆓 Used Free Raid (${usage.raidsRemaining} remaining today)\n\n🚀 Your raid is now live on https://aquads.xyz and will be sent to all users!\n\n💡 Users who complete your raid will earn 20 points.`);

        // Send Telegram notification to all users about the new raid
        await telegramService.sendRaidNotification({
          tweetUrl: raid.tweetUrl,
          points: raid.points,
          title: raid.title,
          description: raid.description
        });

        return;
      }

      // No free raids available, use points
      // Check if user has enough points
      if (user.points < POINTS_REQUIRED) {
        await telegramService.sendBotMessage(chatId, 
          `❌ Not enough points. You have ${user.points} points but need ${POINTS_REQUIRED} points to create a raid.\n\n💡 Earn points by completing raids: /raids`);
        return;
      }
      
      const raid = new TwitterRaid({
        tweetId,
        tweetUrl,
        title,
        description,
        points: 20, // Fixed points for raids
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

      // Send success message (to user's private chat)
      await telegramService.sendBotMessage(telegramUserId, 
        `✅ Raid Created Successfully!\n\n🔗 Tweet: ${tweetUrl}\n💰 Points Deducted: ${POINTS_REQUIRED}\n💎 Points Remaining: ${user.points}\n\n🚀 Your raid is now live on https://aquads.xyz and will be sent to all users!\n\n💡 Users who complete your raid will earn 20 points.`);

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
      
      // Add "Hire an Expert" button
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '👨‍💼 Hire an Expert',
              url: 'https://aquads.xyz/marketplace'
            }
          ]
        ]
      };
      formData.append('reply_markup', JSON.stringify(keyboard));

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

  // Process the vote notification queue
  processVoteNotificationQueue: async () => {
    if (telegramService.isProcessingVoteQueue || telegramService.voteNotificationQueue.length === 0) {
      return;
    }

    telegramService.isProcessingVoteQueue = true;

    while (telegramService.voteNotificationQueue.length > 0) {
      const project = telegramService.voteNotificationQueue.shift();
      
      try {
        await telegramService.sendVoteNotificationToGroupInternal(project);
      } catch (error) {
        console.error('Error processing vote notification from queue:', error);
      }
      
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    telegramService.isProcessingVoteQueue = false;
  },

  // Send vote notification to registered group AND trending channel (add to queue)
  sendVoteNotificationToGroup: async (project) => {
    // Add to queue instead of processing immediately
    telegramService.voteNotificationQueue.push(project);
    
    // Start processing the queue
    telegramService.processVoteNotificationQueue().catch(err => {
      console.error('Error in vote notification queue processor:', err);
    });
  },

  // Internal function that actually sends the notification
  sendVoteNotificationToGroupInternal: async (project) => {
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
      message += `🏆 Rank: ${rankEmoji} #${projectRank}\n\n`;
      message += `📢 Follow our trending channel for AMA updates from your trending projects - https://t.me/aquadstrending`;

      // Create voting keyboard
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

      // Check if project has custom branding
      const hasCustomBranding = project.customBrandingImage && project.customBrandingImage.length > 0;
      
      // Path to the new vote video (fallback)
      const videoPath = path.join(__dirname, '../../public/new vote.mp4');
      const videoExists = fs.existsSync(videoPath);

      // Send to registered group (if exists)
      if (project.telegramGroupId) {
        const groupChatId = project.telegramGroupId;
        
        try {
          if (hasCustomBranding) {
            // Send custom branding image
            const base64Data = project.customBrandingImage.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            const formData = new FormData();
            formData.append('chat_id', groupChatId);
            formData.append('photo', imageBuffer, { filename: 'branding.jpg' });
            formData.append('caption', message);
            formData.append('reply_markup', JSON.stringify(keyboard));

            await axios.post(
              `https://api.telegram.org/bot${botToken}/sendPhoto`,
              formData,
              {
                headers: {
                  ...formData.getHeaders(),
                },
                timeout: 30000,
              }
            );
          } else if (videoExists || telegramService.cachedVideoFileIds.vote) {
            // Send default video (use cached file_id if available)
            let response;
            
            if (telegramService.cachedVideoFileIds.vote) {
              // Use cached file_id (much faster)
              response = await axios.post(
                `https://api.telegram.org/bot${botToken}/sendVideo`,
                {
                  chat_id: groupChatId,
                  video: telegramService.cachedVideoFileIds.vote,
                  caption: message,
                  reply_markup: keyboard
                },
                { timeout: 15000 }
              );
            } else {
              // First time - upload the video file
              const formData = new FormData();
              formData.append('chat_id', groupChatId);
              formData.append('video', fs.createReadStream(videoPath));
              formData.append('caption', message);
              formData.append('reply_markup', JSON.stringify(keyboard));

              response = await axios.post(
                `https://api.telegram.org/bot${botToken}/sendVideo`,
                formData,
                {
                  headers: {
                    ...formData.getHeaders(),
                  },
                  timeout: 60000, // Increased timeout for first upload
                }
              );
              
              // Cache the file_id for future use
              if (response.data.ok && response.data.result.video) {
                telegramService.cachedVideoFileIds.vote = response.data.result.video.file_id;
                console.log('📹 Cached vote video file_id for faster future sends');
              }
            }
          }
        } catch (error) {
          console.error('Error sending to registered group:', error.message);
        }
      }

      // Also send to trending channel
      // First, clean up ALL old vote messages - snapshot them to avoid race conditions
      const messagesToDelete = [...telegramService.lastVoteMessages];
      telegramService.lastVoteMessages = [];
      
      // Delete old messages in parallel for faster cleanup
      await Promise.all(
        messagesToDelete.map(msgId => 
          telegramService.deleteMessage(telegramService.TRENDING_CHANNEL_ID, msgId)
            .catch(err => console.error(`Failed to delete message ${msgId}:`, err))
        )
      );

      let trendingMessageId = null;
      
      try {
        if (hasCustomBranding) {
          // Send custom branding image to trending channel
          const base64Data = project.customBrandingImage.split(',')[1];
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          const formData = new FormData();
          formData.append('chat_id', telegramService.TRENDING_CHANNEL_ID);
          formData.append('photo', imageBuffer, { filename: 'branding.jpg' });
          formData.append('caption', message);
          formData.append('reply_markup', JSON.stringify(keyboard));

          const response = await axios.post(
            `https://api.telegram.org/bot${botToken}/sendPhoto`,
            formData,
            {
              headers: {
                ...formData.getHeaders(),
              },
              timeout: 30000,
            }
          );

          if (response.data.ok) {
            trendingMessageId = response.data.result.message_id;
          }
        } else if (videoExists || telegramService.cachedVideoFileIds.vote) {
          // Send default video to trending channel (use cached file_id if available)
          let response;
          
          if (telegramService.cachedVideoFileIds.vote) {
            // Use cached file_id (much faster)
            response = await axios.post(
              `https://api.telegram.org/bot${botToken}/sendVideo`,
              {
                chat_id: telegramService.TRENDING_CHANNEL_ID,
                video: telegramService.cachedVideoFileIds.vote,
                caption: message,
                reply_markup: keyboard
              },
              { timeout: 15000 }
            );
          } else {
            // First time - upload the video file
            const formData = new FormData();
            formData.append('chat_id', telegramService.TRENDING_CHANNEL_ID);
            formData.append('video', fs.createReadStream(videoPath));
            formData.append('caption', message);
            formData.append('reply_markup', JSON.stringify(keyboard));

            response = await axios.post(
              `https://api.telegram.org/bot${botToken}/sendVideo`,
              formData,
              {
                headers: {
                  ...formData.getHeaders(),
                },
                timeout: 60000, // Increased timeout for first upload
              }
            );
            
            // Cache the file_id for future use
            if (response.data.ok && response.data.result.video) {
              telegramService.cachedVideoFileIds.vote = response.data.result.video.file_id;
              console.log('📹 Cached vote video file_id for faster future sends');
            }
          }

          if (response && response.data.ok) {
            trendingMessageId = response.data.result.message_id;
          }
        }
      } catch (error) {
        console.error('Error sending to trending channel:', error.message);
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
        const buyLink = `https://aquads.xyz/aquaswap?token=${bubble.pairAddress}&blockchain=${bubble.blockchain || 'ethereum'}`;
        
        message += `${rankEmoji} #${index + 1} ${bubble.title}\n`;
        message += `📊 👍 ${bubble.bullishVotes || 0} | 👎 ${bubble.bearishVotes || 0}\n`;
        message += `🔗 <a href="${buyLink}">Buy Now</a>\n`;
        message += `⛓️ ${bubble.blockchain || 'Ethereum'}\n\n`;
      });

      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `💎 Vote on your favorites at aquads.xyz`;

      // Send with video
      const videoPath = path.join(__dirname, '../../public/trend.mp4');
      const videoExists = fs.existsSync(videoPath);

      // Add "Hire an Expert" button
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '👨‍💼 Hire an Expert',
              url: 'https://aquads.xyz/marketplace'
            }
          ]
        ]
      };

      let messageId = null;
      if (videoExists || telegramService.cachedVideoFileIds.trend) {
        try {
          let response;
          
          if (telegramService.cachedVideoFileIds.trend) {
            // Use cached file_id (much faster)
            response = await axios.post(
              `https://api.telegram.org/bot${botToken}/sendVideo`,
              {
                chat_id: telegramService.TRENDING_CHANNEL_ID,
                video: telegramService.cachedVideoFileIds.trend,
                caption: message,
                parse_mode: 'HTML',
                reply_markup: keyboard
              },
              { timeout: 15000 }
            );
          } else {
            // First time - upload the video file
            const formData = new FormData();
            formData.append('chat_id', telegramService.TRENDING_CHANNEL_ID);
            formData.append('video', fs.createReadStream(videoPath));
            formData.append('caption', message);
            formData.append('parse_mode', 'HTML');
            formData.append('reply_markup', JSON.stringify(keyboard));

            response = await axios.post(
              `https://api.telegram.org/bot${botToken}/sendVideo`,
              formData,
              {
                headers: {
                  ...formData.getHeaders(),
                },
                timeout: 60000, // Increased timeout for first upload
              }
            );
            
            // Cache the file_id for future use
            if (response.data.ok && response.data.result.video) {
              telegramService.cachedVideoFileIds.trend = response.data.result.video.file_id;
              console.log('📹 Cached trend video file_id for faster future sends');
            }
          }

          if (response.data.ok) {
            messageId = response.data.result.message_id;
          }
        } catch (error) {
          console.error('Error sending bubble summary video:', error.message);
        }
      }

      if (!messageId) {
        // Fallback to text
        try {
          const response = await axios.post(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
              chat_id: telegramService.TRENDING_CHANNEL_ID,
              text: message,
              parse_mode: 'HTML'
            }
          );
          if (response.data.ok) {
            messageId = response.data.result.message_id;
          }
        } catch (error) {
          console.error('Error sending bubble summary text:', error.message);
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
          // Only send error message in private chats
          if (chatId > 0) {
            await telegramService.sendBotMessage(chatId, 
              `❌ You already voted ${voteType} on this project.`);
          }
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

        // Only send confirmation message in private chats, not in channels/groups
        if (chatId > 0) {
          await telegramService.sendBotMessage(chatId, 
            `✅ Vote updated to ${voteType}!\n\n📊 ${project.title}: 👍 ${project.bullishVotes} | 👎 ${project.bearishVotes}`);
        }
        
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

        // Only send confirmation message in private chats, not in channels/groups
        if (chatId > 0) {
          await telegramService.sendBotMessage(chatId, 
            `✅ Voted ${voteType} on ${project.title}!\n\n💰 +20 points awarded\n\n📊 ${project.title}: 👍 ${project.bullishVotes} | 👎 ${project.bearishVotes}`);
        }
        
        // Send notification to registered group about new vote
        await telegramService.sendVoteNotificationToGroup(project);
      }

    } catch (error) {
      console.error('Process vote error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error processing vote. Please try again later.");
    }
  },

  // Handle /setbranding command
  handleSetBrandingCommand: async (chatId, telegramUserId) => {
    try {
      // Check if user is linked
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      
      if (!user) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Please link your account first: /link your_username\n\n🌐 Create account at: https://aquads.xyz");
        return;
      }

      // Find their bumped project
      const bumpedProject = await Ad.findOne({ 
        owner: user.username,
        isBumped: true,
        status: { $in: ['active', 'approved'] }
      });
      
      if (!bumpedProject) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Custom branding is only available for bumped projects.\n\n🚀 Bump your project at: https://aquads.xyz");
        return;
      }

      // Set conversation state to wait for image upload
      telegramService.setConversationState(telegramUserId, {
        action: 'waiting_branding_image',
        projectId: bumpedProject._id.toString()
      });

      await telegramService.sendBotMessage(chatId, 
        `🎨 Upload your custom branding image!\n\n📋 Requirements:\n• Max size: 500KB\n• Format: JPG or PNG\n• Recommended: 1920×1080 or 1080×1080\n\nThis will appear in:\n✅ Vote notifications for your project\n✅ /mybubble command (your project showcase)\n✅ /bubbles command (when you use it in your group)\n\n📤 Send your image now:`);

    } catch (error) {
      console.error('SetBranding command error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error setting branding. Please try again later.");
    }
  },

  // Handle /removebranding command
  handleRemoveBrandingCommand: async (chatId, telegramUserId) => {
    try {
      // Check if user is linked
      const user = await User.findOne({ telegramId: telegramUserId.toString() });
      
      if (!user) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Please link your account first: /link your_username");
        return;
      }

      // Find their bumped project with branding
      const project = await Ad.findOne({ 
        owner: user.username,
        isBumped: true,
        status: { $in: ['active', 'approved'] },
        customBrandingImage: { $ne: null }
      });
      
      if (!project) {
        await telegramService.sendBotMessage(chatId, 
          "❌ You don't have any custom branding set.");
        return;
      }

      // Remove branding
      project.customBrandingImage = null;
      project.customBrandingImageSize = 0;
      project.customBrandingUploadedAt = null;
      await project.save();

      await telegramService.sendBotMessage(chatId, 
        "✅ Custom branding removed! Default branding will be used for your project.");

    } catch (error) {
      console.error('RemoveBranding command error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error removing branding. Please try again later.");
    }
  },

  // Handle photo uploads for branding
  handleBrandingImageUpload: async (chatId, telegramUserId, photo) => {
    try {
      const conversationState = telegramService.getConversationState(telegramUserId);
      
      if (!conversationState || conversationState.action !== 'waiting_branding_image') {
        return false; // Not in branding upload state
      }

      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      
      // Get the largest photo size
      const largestPhoto = photo[photo.length - 1];
      const fileId = largestPhoto.file_id;
      
      // Get file info to check size
      const fileInfoResponse = await axios.get(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
      );
      
      const fileInfo = fileInfoResponse.data.result;
      const fileSize = fileInfo.file_size;
      
      // Check file size (500KB limit)
      if (fileSize > 500000) {
        await telegramService.sendBotMessage(chatId, 
          "❌ Image too large! Please upload an image under 500KB.\n\n💡 Tip: Compress your image at tinypng.com or similar service.");
        return true;
      }
      
      // Download the file
      const filePath = fileInfo.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
      
      const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data);
      const base64Image = imageBuffer.toString('base64');
      
      // Determine mime type from file extension
      const ext = filePath.split('.').pop().toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const base64WithPrefix = `data:${mimeType};base64,${base64Image}`;
      
      // Update project with branding image
      const project = await Ad.findById(conversationState.projectId);
      
      if (!project) {
        await telegramService.sendBotMessage(chatId, "❌ Project not found.");
        telegramService.clearConversationState(telegramUserId);
        return true;
      }
      
      project.customBrandingImage = base64WithPrefix;
      project.customBrandingImageSize = fileSize;
      project.customBrandingUploadedAt = new Date();
      await project.save();
      
      // Clear conversation state
      telegramService.clearConversationState(telegramUserId);
      
      await telegramService.sendBotMessage(chatId, 
        `✅ Custom branding saved successfully!\n\n🎨 Your image will now appear in:\n• Vote notifications for your project\n• /mybubble command (your project showcase)\n• /bubbles command (when you use it in your group)\n\n📏 Image size: ${(fileSize / 1024).toFixed(1)}KB\n\n💡 Use /removebranding to remove it anytime.`);
      
      return true;
      
    } catch (error) {
      console.error('Branding image upload error:', error);
      await telegramService.sendBotMessage(chatId, 
        "❌ Error uploading image. Please try again.");
      return true;
    }
  },

  // Send daily GM GM message to all linked groups
  sendDailyGMMessage: async () => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!botToken) {
        console.error('TELEGRAM_BOT_TOKEN not configured');
        return;
      }

      // Get all active groups (including the default chat ID)
      const groupsToNotify = new Set(telegramService.activeGroups);
      const defaultChatId = process.env.TELEGRAM_CHAT_ID;
      if (defaultChatId) {
        groupsToNotify.add(defaultChatId);
      }

      if (groupsToNotify.size === 0) {
        console.log('No active groups to send GM message to');
        return;
      }

      // Construct the GM message
      const message = `🌅 GM GM everyone! ☀️

Wishing you all a blessed day from Aquads.xyz! 💙

Let's make today amazing! 🚀`;

      // Send to all groups
      let successCount = 0;
      for (const chatId of groupsToNotify) {
        try {
          const result = await telegramService.sendBotMessage(chatId, message);
          if (result.success) {
            successCount++;
            console.log(`✅ GM message sent to chat ${chatId}`);
          }
        } catch (error) {
          console.error(`Failed to send GM message to group ${chatId}:`, error.message);
          // Remove failed group from active groups
          telegramService.activeGroups.delete(chatId);
          await telegramService.saveActiveGroups();
        }
      }

      console.log(`📨 Daily GM message sent to ${successCount}/${groupsToNotify.size} groups`);
      return successCount > 0;

    } catch (error) {
      console.error('Daily GM message failed:', error.message);
      return false;
    }
  },

  // Private engagement group ID
  ENGAGEMENT_GROUP_ID: '-1002412665250',

  // Handle messages in engagement group
  handleEngagementMessage: async (message) => {
    try {
      const chatId = message.chat.id.toString();
      const telegramUserId = message.from.id.toString();
      const isBot = message.from.is_bot;

      // Only process messages in the engagement group
      if (chatId !== telegramService.ENGAGEMENT_GROUP_ID) {
        return;
      }

      // Ignore bot messages
      if (isBot) {
        return;
      }

      // Award points for daily message
      await telegramService.awardDailyMessagePoints(telegramUserId, chatId);

    } catch (error) {
      console.error('Error handling engagement message:', error);
    }
  },

  // Handle reactions in engagement group
  handleEngagementReaction: async (reactionUpdate) => {
    try {
      const chatId = reactionUpdate.chat.id.toString();
      const telegramUserId = reactionUpdate.user.id.toString();
      const newReactions = reactionUpdate.new_reaction || [];
      const oldReactions = reactionUpdate.old_reaction || [];

      // Only process reactions in the engagement group
      if (chatId !== telegramService.ENGAGEMENT_GROUP_ID) {
        return;
      }

      // Only process NEW reactions (not changes/removals)
      if (newReactions.length <= oldReactions.length) {
        return;
      }

      // Award points for daily reaction
      await telegramService.awardDailyReactionPoints(telegramUserId, chatId);

    } catch (error) {
      console.error('Error handling engagement reaction:', error);
    }
  },

  // Award points for daily message (2.5 points, once per day)
  awardDailyMessagePoints: async (telegramUserId, groupId) => {
    try {
      const TelegramDailyEngagement = require('../models/TelegramDailyEngagement');
      
      // Find user by telegram ID
      const user = await User.findOne({ telegramId: telegramUserId });
      
      if (!user) {
        console.log(`User not linked for telegram ID: ${telegramUserId}`);
        return;
      }

      // Get today's date string (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];

      // Check if user already messaged today
      let engagement = await TelegramDailyEngagement.findOne({
        userId: user._id,
        groupId: groupId,
        date: today
      });

      // If already messaged today, don't award points
      if (engagement && engagement.hasMessagedToday) {
        console.log(`User ${user.username} already earned message points today`);
        return;
      }

      // Award 2.5 points
      const POINTS = 2.5;
      user.points += POINTS;
      user.pointsHistory.push({
        amount: POINTS,
        reason: 'Daily message in Aquads group',
        createdAt: new Date()
      });
      await user.save();

      // Create or update engagement record
      if (!engagement) {
        engagement = await TelegramDailyEngagement.create({
          userId: user._id,
          telegramUserId: telegramUserId,
          groupId: groupId,
          date: today,
          hasMessagedToday: true,
          messagePoints: POINTS,
          firstMessageAt: new Date()
        });
      } else {
        engagement.hasMessagedToday = true;
        engagement.messagePoints = POINTS;
        engagement.firstMessageAt = new Date();
        await engagement.save();
      }

      console.log(`✅ Awarded ${POINTS} points to ${user.username} for daily message`);

      // Send confirmation DM
      try {
        const reactionStatus = engagement.hasReactedToday ? '✅' : '⏳';
        const totalToday = engagement.messagePoints + engagement.reactionPoints;
        
        await telegramService.sendBotMessage(telegramUserId, 
          `✅ +${POINTS} points for daily message!\n\n📊 Today's Progress:\n✅ Message: Done\n${reactionStatus} Reaction: ${engagement.hasReactedToday ? 'Done' : 'Pending'}\n\n💰 Earned today: ${totalToday} points\n💎 Total points: ${user.points}`
        );
      } catch (dmError) {
        console.log(`Could not send DM to user ${telegramUserId}: ${dmError.message}`);
      }

    } catch (error) {
      // Handle duplicate key error silently (race condition)
      if (error.code === 11000) {
        console.log(`Race condition: User already earned message points today`);
        return;
      }
      console.error('Error awarding daily message points:', error);
    }
  },

  // Award points for daily reaction (2.5 points, once per day)
  awardDailyReactionPoints: async (telegramUserId, groupId) => {
    try {
      const TelegramDailyEngagement = require('../models/TelegramDailyEngagement');
      
      // Find user by telegram ID
      const user = await User.findOne({ telegramId: telegramUserId });
      
      if (!user) {
        console.log(`User not linked for telegram ID: ${telegramUserId}`);
        return;
      }

      // Get today's date string (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];

      // Check if user already reacted today
      let engagement = await TelegramDailyEngagement.findOne({
        userId: user._id,
        groupId: groupId,
        date: today
      });

      // If already reacted today, don't award points
      if (engagement && engagement.hasReactedToday) {
        console.log(`User ${user.username} already earned reaction points today`);
        return;
      }

      // Award 2.5 points
      const POINTS = 2.5;
      user.points += POINTS;
      user.pointsHistory.push({
        amount: POINTS,
        reason: 'Daily reaction in Aquads group',
        createdAt: new Date()
      });
      await user.save();

      // Create or update engagement record
      if (!engagement) {
        engagement = await TelegramDailyEngagement.create({
          userId: user._id,
          telegramUserId: telegramUserId,
          groupId: groupId,
          date: today,
          hasReactedToday: true,
          reactionPoints: POINTS,
          firstReactionAt: new Date()
        });
      } else {
        engagement.hasReactedToday = true;
        engagement.reactionPoints = POINTS;
        engagement.firstReactionAt = new Date();
        await engagement.save();
      }

      console.log(`✅ Awarded ${POINTS} points to ${user.username} for daily reaction`);

      // Send confirmation DM
      try {
        const messageStatus = engagement.hasMessagedToday ? '✅' : '⏳';
        const totalToday = engagement.messagePoints + engagement.reactionPoints;
        
        await telegramService.sendBotMessage(telegramUserId, 
          `✅ +${POINTS} points for daily reaction!\n\n📊 Today's Progress:\n${messageStatus} Message: ${engagement.hasMessagedToday ? 'Done' : 'Pending'}\n✅ Reaction: Done\n\n💰 Earned today: ${totalToday} points\n💎 Total points: ${user.points}`
        );
      } catch (dmError) {
        console.log(`Could not send DM to user ${telegramUserId}: ${dmError.message}`);
      }

    } catch (error) {
      // Handle duplicate key error silently (race condition)
      if (error.code === 11000) {
        console.log(`Race condition: User already earned reaction points today`);
        return;
      }
      console.error('Error awarding daily reaction points:', error);
    }
  }


};

module.exports = telegramService; 