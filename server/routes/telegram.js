const express = require('express');
const router = express.Router();
const telegramService = require('../utils/telegramService');

// Telegram webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;

    // Always respond 200 OK quickly to Telegram
    res.sendStatus(200);

    // Process update asynchronously
    if (update.message) {
      // Handle regular messages and commands
      await telegramService.handleCommand(update.message);
    } else if (update.callback_query) {
      // Handle button clicks (existing functionality)
      await telegramService.processVote(update.callback_query);
    } else if (update.message_reaction) {
      // Handle reactions - NEW FEATURE
      await telegramService.handleReaction(update.message_reaction);
    }

  } catch (error) {
    console.error('Error handling Telegram webhook:', error);
  }
});

// Endpoint to set/update webhook URL
router.post('/set-webhook', async (req, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL; // e.g., https://yourserver.com/api/telegram/webhook

    if (!botToken || !webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_URL must be configured'
      });
    }

    const axios = require('axios');
    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        url: webhookUrl,
        allowed_updates: [
          'message',
          'callback_query',
          'message_reaction'  // Enable reaction updates
        ]
      }
    );

    if (response.data.ok) {
      return res.json({
        success: true,
        message: 'Webhook configured successfully',
        webhookUrl: webhookUrl
      });
    } else {
      return res.status(500).json({
        success: false,
        error: response.data.description
      });
    }
  } catch (error) {
    console.error('Error setting webhook:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint to check webhook status
router.get('/webhook-info', async (req, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return res.status(400).json({
        success: false,
        error: 'TELEGRAM_BOT_TOKEN not configured'
      });
    }

    const axios = require('axios');
    const response = await axios.get(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`
    );

    return res.json({
      success: true,
      webhookInfo: response.data.result
    });
  } catch (error) {
    console.error('Error getting webhook info:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

