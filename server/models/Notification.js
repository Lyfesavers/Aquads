const mongoose = require('mongoose');

// Check if the model already exists to prevent duplicate model errors
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['message', 'booking', 'status', 'review', 'system', 'affiliate'],
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
    enum: ['Booking', 'BookingMessage', 'Service', 'ServiceReview', 'TwitterRaid', 'FacebookRaid', null],
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  emailTrigger: {
    type: {
      type: String,
      enum: ['buyer_acceptance']
    },
    buyerEmail: String,
    bookingDetails: {
      buyerUsername: String,
      serviceTitle: String,
      bookingId: String,
      price: Number,
      currency: String,
      sellerUsername: String,
      requirements: String
    }
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

// Check if model exists before creating a new one
const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

// Add additional indexes for better query performance
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 }); // For user's unread notifications
notificationSchema.index({ type: 1, createdAt: -1 }); // For type-based queries
notificationSchema.index({ relatedModel: 1, relatedId: 1 }); // For related object queries

module.exports = Notification; 