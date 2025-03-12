const mongoose = require('mongoose');

const bookingMessageSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  attachment: {
    type: String,
    trim: true
  },
  attachmentType: {
    type: String,
    enum: ['image', 'file', null],
    default: null
  },
  attachmentName: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  }
});

// Index for faster queries
bookingMessageSchema.index({ bookingId: 1, createdAt: 1 });

module.exports = mongoose.model('BookingMessage', bookingMessageSchema); 