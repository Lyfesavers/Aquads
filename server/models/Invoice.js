const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  // Add payment link field
  paymentLink: {
    type: String,
    required: true
  },
  items: [{
    description: String,
    quantity: Number,
    price: Number,
    amount: Number
  }],
  notes: {
    type: String,
    default: ''
  },
  templateId: {
    type: String,
    default: 'default'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  paidAt: {
    type: Date
  }
});

// Update the updatedAt timestamp before saving
invoiceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema); 