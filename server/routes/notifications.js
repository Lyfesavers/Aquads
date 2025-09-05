const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');

// Get all notifications for current user
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Import the Notification model with fallback to avoid circular dependencies
    let NotificationModel;
    
    try {
      NotificationModel = mongoose.model('Notification');
    } catch (error) {
      // If model doesn't exist, define it here (same as booking endpoint)
      const notificationSchema = new mongoose.Schema({
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, required: true },
        message: { type: String, required: true },
        link: { type: String },
        relatedId: { type: mongoose.Schema.Types.ObjectId },
        relatedModel: { type: String },
        isRead: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
      });
      
      NotificationModel = mongoose.model('Notification', notificationSchema);
    }
    
    const notifications = await NotificationModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to latest 50 notifications
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications', message: error.message });
  }
});

// Get unread count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Import the Notification model with fallback
    let NotificationModel;
    
    try {
      NotificationModel = mongoose.model('Notification');
    } catch (error) {
      // If model doesn't exist, define it here
      const notificationSchema = new mongoose.Schema({
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, required: true },
        message: { type: String, required: true },
        link: { type: String },
        relatedId: { type: mongoose.Schema.Types.ObjectId },
        relatedModel: { type: String },
        isRead: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
      });
      
      NotificationModel = mongoose.model('Notification', notificationSchema);
    }
    
    const count = await NotificationModel.countDocuments({ 
      userId: userId,
      isRead: false
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count', message: error.message });
  }
});

// Mark a notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const notificationId = req.params.id;
    
    // Import the Notification model with fallback
    let NotificationModel;
    
    try {
      NotificationModel = mongoose.model('Notification');
    } catch (error) {
      // If model doesn't exist, define it here
      const notificationSchema = new mongoose.Schema({
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, required: true },
        message: { type: String, required: true },
        link: { type: String },
        relatedId: { type: mongoose.Schema.Types.ObjectId },
        relatedModel: { type: String },
        isRead: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
      });
      
      NotificationModel = mongoose.model('Notification', notificationSchema);
    }
    
    // Find and update the notification
    const notification = await NotificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { isRead: true } },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found or not owned by user' });
    }
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read', message: error.message });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Import the Notification model with fallback
    let NotificationModel;
    
    try {
      NotificationModel = mongoose.model('Notification');
    } catch (error) {
      // If model doesn't exist, define it here
      const notificationSchema = new mongoose.Schema({
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, required: true },
        message: { type: String, required: true },
        link: { type: String },
        relatedId: { type: mongoose.Schema.Types.ObjectId },
        relatedModel: { type: String },
        isRead: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
      });
      
      NotificationModel = mongoose.model('Notification', notificationSchema);
    }
    
    // Update all unread notifications for this user
    const result = await NotificationModel.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );
    
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read', message: error.message });
  }
});

// Create a notification (internal use only, not exposed as API)
const createNotification = async (userId, type, message, link = null, relatedData = {}) => {
  try {
  
    const notification = new Notification({
      userId,
      type,
      message,
      link,
      ...relatedData
    });
    
    await notification.save();
  
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Test endpoint to verify notifications are working
router.get('/test', auth, async (req, res) => {
  try {
    res.json({ 
      message: 'Notifications endpoint is working!', 
      userId: req.user.userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ error: 'Test endpoint failed', message: error.message });
  }
});

// Export both the router and the createNotification function
module.exports = router;
module.exports.createNotification = createNotification; 