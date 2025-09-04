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


// Note: invoiceNumber already has unique index from schema

// Add performance indexes for common queries
invoiceSchema.index({ sellerId: 1 }); // For seller's invoices
invoiceSchema.index({ buyerId: 1 }); // For buyer's invoices
invoiceSchema.index({ status: 1 }); // For status filtering
invoiceSchema.index({ dueDate: 1 }); // For due date queries
invoiceSchema.index({ createdAt: -1 }); // For creation date sorting
invoiceSchema.index({ updatedAt: -1 }); // For update date sorting
invoiceSchema.index({ status: 1, dueDate: 1 }); // For status + due date queries
invoiceSchema.index({ sellerId: 1, status: 1 }); // For seller + status queries
invoiceSchema.index({ buyerId: 1, status: 1 }); // For buyer + status queries

module.exports = mongoose.model('Invoice', invoiceSchema); 