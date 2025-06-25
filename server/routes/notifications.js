const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// Get all notifications for current user
router.get('/', auth, async (req, res) => {
  try {
  
    const notifications = await Notification.find({ 
      userId: req.user.userId 
    })
    .sort({ createdAt: -1 })
    .limit(50); // Limit to latest 50 notifications
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.userId);
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Mark a notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.userId, isRead: false },
      { isRead: true }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
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

// Export both the router and the createNotification function
module.exports = router;
module.exports.createNotification = createNotification; 