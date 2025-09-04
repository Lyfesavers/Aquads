const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const invoiceSchema = new Schema({
  bookingId: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  sellerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
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
    default: 'USD'
  },
  dueDate: {
    type: Date,
    required: true
  },
  description: String,
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
  notes: String,
  templateId: {
    type: String,
    default: 'default'
  },
  paidAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field when document is updated
invoiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add database indexes for better query performance
invoiceSchema.index({ sellerId: 1, createdAt: -1 }); // For seller's invoices
invoiceSchema.index({ buyerId: 1, createdAt: -1 }); // For buyer's invoices
invoiceSchema.index({ status: 1, createdAt: -1 }); // For status-based queries
invoiceSchema.index({ bookingId: 1 }); // For booking-specific queries
invoiceSchema.index({ dueDate: 1, status: 1 }); // For due date queries
invoiceSchema.index({ invoiceNumber: 1 }); // For invoice number lookups

module.exports = mongoose.model('Invoice', invoiceSchema); 