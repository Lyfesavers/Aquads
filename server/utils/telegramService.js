const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

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
  }
};

module.exports = telegramService; 