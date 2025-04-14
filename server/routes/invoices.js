const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
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
router.post('/', auth, async (req, res) => {
  try {
    console.log('Received invoice creation request:', JSON.stringify(req.body));
    
    const { 
      bookingId, 
      dueDate, 
      items, 
      description, 
      notes, 
      templateId,
      paymentLink 
    } = req.body;

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

    console.log('Booking found:', booking._id);
    console.log('Request user:', req.user.userId);
    console.log('Booking seller:', booking.sellerId.toString());

    // Check if seller is the one creating the invoice
    if (booking.sellerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only the seller can create invoices' });
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
    let totalAmount = booking.price || 0;
    if (processedItems.length > 0) {
      totalAmount = processedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    }

    const invoiceNumber = await generateInvoiceNumber();
    console.log('Generated invoice number:', invoiceNumber);

    const newInvoice = new Invoice({
      bookingId,
      sellerId: booking.sellerId,
      buyerId: booking.buyerId,
      invoiceNumber,
      amount: totalAmount,
      currency: booking.currency || 'USD',
      dueDate: new Date(dueDate),
      description: description || `Invoice for ${booking.serviceId}`,
      paymentLink,
      items: processedItems,
      notes: notes || '',
      templateId: templateId || 'default',
    });

    console.log('Saving new invoice:', JSON.stringify(newInvoice.toObject()));

    await newInvoice.save();
    console.log('Invoice saved successfully with ID:', newInvoice._id);

    // Create notification for the buyer
    const notification = new Notification({
      userId: booking.buyerId,
      type: 'invoice',
      message: `You have received an invoice for booking #${bookingId.substring(0, 6)}`,
      link: `/dashboard?tab=bookings&booking=${bookingId}&invoice=${newInvoice._id}`,
      relatedId: newInvoice._id,
      relatedModel: 'Invoice'
    });
    
    await notification.save();
    console.log('Notification created for buyer');

    res.status(201).json(newInvoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    
    // Provide more specific error messages based on error type
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validationErrors,
        message: validationErrors.join(', ')
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        error: 'Invalid data format', 
        field: error.path, 
        value: error.value 
      });
    }
    
    res.status(500).json({ error: error.message || 'Internal server error' });
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
router.put('/:id/status', auth, async (req, res) => {
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
      type: 'invoice_status',
      message: `Invoice #${invoice.invoiceNumber} has been marked as ${status}`,
      link: `/dashboard?tab=bookings&booking=${invoice.bookingId}&invoice=${invoice._id}`,
      relatedId: invoice._id,
      relatedModel: 'Invoice'
    });
    
    await notification.save();

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