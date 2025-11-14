const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// Generate a unique invoice number
const generateInvoiceNumber = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `INV-${year}${month}`;
  
  // Find the highest existing invoice number with this prefix
  const latestInvoice = await Invoice.findOne(
    { invoiceNumber: new RegExp(`^${prefix}`) },
    {},
    { sort: { invoiceNumber: -1 } }
  );
  
  let nextNumber = 1;
  if (latestInvoice) {
    const latestNumber = parseInt(latestInvoice.invoiceNumber.split('-')[2]);
    if (!isNaN(latestNumber)) {
      nextNumber = latestNumber + 1;
    }
  }
  
  return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
};

// Create a new invoice
router.post('/', auth, requireEmailVerification, async (req, res) => {
  try {
  
    
    const { 
      bookingId, 
      dueDate, 
      items, 
      description, 
      notes, 
      templateId,
      paymentLink,
      amount,
      currency
    } = req.body;

    // Processing invoice creation

    // Validate required fields
    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    // Validate bookingId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: 'Invalid bookingId format' });
    }

    // Check if payment link is provided
    if (!paymentLink) {
      return res.status(400).json({ error: 'Payment link is required' });
    }

    // Validate payment link format (simple validation)
    if (!paymentLink.startsWith('http://') && !paymentLink.startsWith('https://')) {
      return res.status(400).json({ error: 'Payment link must be a valid URL starting with http:// or https://' });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if sellerId is a string or ObjectId and convert as needed
    const sellerIdString = booking.sellerId.toString ? booking.sellerId.toString() : booking.sellerId;
    const userIdString = req.user.userId.toString ? req.user.userId.toString() : req.user.userId;

    // Check if seller is the one creating the invoice
    if (sellerIdString !== userIdString) {
      return res.status(403).json({ 
        error: 'Only the seller can create invoices',
        details: { 
          sellerIdString, 
          userIdString, 
          sellerId: booking.sellerId, 
          userId: req.user.userId
        }
      });
    }

    // Process items to ensure numeric values
    let processedItems = [];
    if (items && items.length > 0) {
      processedItems = items.map(item => ({
        description: item.description || 'Item',
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        amount: Number(item.amount) || Number(item.quantity) * Number(item.price) || 0
      }));
    } else {
      // Default to a single item using booking price
      processedItems = [{
        description: 'Service',
        quantity: 1,
        price: booking.price || 0,
        amount: booking.price || 0
      }];
    }

    // Calculate total amount from items or use booking price as default
    let totalAmount = amount || booking.price || 0;
    if (!amount && processedItems.length > 0) {
      totalAmount = processedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    }

    const invoiceNumber = await generateInvoiceNumber();
  

    // Create invoice document data
    const invoiceData = {
      bookingId,
      sellerId: booking.sellerId,
      buyerId: booking.buyerId,
      invoiceNumber,
      amount: totalAmount,
      currency: currency || booking.currency || 'USD',
      dueDate: new Date(dueDate),
      description: description || `Invoice for service`,
      paymentLink,
      items: processedItems,
      notes: notes || '',
      templateId: templateId || 'default',
    };

  

    // Create and save the new invoice
    const newInvoice = new Invoice(invoiceData);
  

    await newInvoice.save();
  

    // Create notification for the buyer
    const notification = new Notification({
      userId: booking.buyerId,
      type: 'booking',
      message: `You have received an invoice for booking #${bookingId.substring(0, 6)}`,
      link: `/dashboard?tab=bookings&booking=${bookingId}&invoice=${newInvoice._id}`,
      relatedId: booking._id,
      relatedModel: 'Booking'
    });
    
    try {
      await notification.save();
  
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the invoice creation if notification fails
    }

    res.status(201).json(newInvoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    
    // Provide more specific error messages based on error type
    if (error.name === 'ValidationError') {
      // Extract validation error details
      const errorDetails = {};
      if (error.errors) {
        Object.keys(error.errors).forEach(key => {
          errorDetails[key] = error.errors[key].message;
        });
      }
      
      const validationErrors = Object.values(error.errors || {}).map(err => err.message);
      const errorMessage = validationErrors.length > 0 
        ? validationErrors.join(', ') 
        : 'Validation failed, please check all required fields';
      
      console.error('Validation error details:', errorDetails);
      
      return res.status(400).json({ 
        error: 'Validation error', 
        details: errorDetails,
        message: errorMessage
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        error: 'Invalid data format', 
        field: error.path, 
        value: error.value,
        message: `Invalid format for field: ${error.path}`
      });
    }
    
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({
        error: 'Duplicate key error',
        message: 'An invoice with this number already exists',
        details: error.keyValue
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Failed to create invoice',
      details: error.toString()
    });
  }
});

// Get all invoices for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const invoices = await Invoice.find({
      $or: [
        { sellerId: req.user.userId },
        { buyerId: req.user.userId }
      ]
    })
    .populate('bookingId')
    .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific invoice
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate({
        path: 'bookingId',
        populate: { path: 'serviceId' }
      });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check if user is buyer or seller
    if (invoice.sellerId.toString() !== req.user.userId && 
        invoice.buyerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to view this invoice' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update invoice status (mark as paid)
router.put('/:id/status', auth, requireEmailVerification, async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Only allow certain status updates based on user role
    if (status === 'paid') {
      // Both buyer and seller can mark as paid
      if (invoice.buyerId.toString() !== req.user.userId && invoice.sellerId.toString() !== req.user.userId) {
        return res.status(403).json({ error: 'Only the buyer or seller can mark invoice as paid' });
      }
      invoice.status = 'paid';
      invoice.paidAt = new Date();
    } else if (status === 'cancelled') {
      if (invoice.sellerId.toString() !== req.user.userId) {
        return res.status(403).json({ error: 'Only the seller can cancel an invoice' });
      }
      invoice.status = 'cancelled';
    } else {
      return res.status(400).json({ error: 'Invalid status update' });
    }

    await invoice.save();

    // Create notification for the other party
    const recipientUserId = req.user.userId === invoice.sellerId.toString() 
      ? invoice.buyerId 
      : invoice.sellerId;

    const notification = new Notification({
      userId: recipientUserId,
      type: 'status',
      message: `Invoice #${invoice.invoiceNumber} has been marked as ${status}`,
      link: `/dashboard?tab=bookings&booking=${invoice.bookingId}&invoice=${invoice._id}`,
      relatedId: invoice.bookingId,
      relatedModel: 'Booking'
    });
    
    try {
      await notification.save();
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the status update if notification fails
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoices for a specific booking
router.get('/booking/:bookingId', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Ensure the user is either the buyer or seller of the booking
    if (booking.sellerId.toString() !== req.user.userId && 
        booking.buyerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to view these invoices' });
    }

    const invoices = await Invoice.find({ bookingId: req.params.bookingId })
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 