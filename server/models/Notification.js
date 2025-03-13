const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['message', 'booking', 'status', 'review', 'system'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  link: {
    type: String,
    default: null
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedModel',
    default: null
  },
  relatedModel: {
    type: String,
    enum: ['Booking', 'BookingMessage', 'Service', 'ServiceReview', null],
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Static method to create a notification
notificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = new this(data);
    await notification.save();
    console.log('Notification created:', notification);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = async function(userId) {
  try {
    const count = await this.countDocuments({ 
      userId: userId,
      isRead: false
    });
    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

module.exports = mongoose.model('Notification', notificationSchema); 