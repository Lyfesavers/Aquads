const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const BookingMessage = require('../models/BookingMessage');
const Service = require('../models/Service');
const FreelancerEscrow = require('../models/FreelancerEscrow');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createNotification } = require('./notifications');
const mongoose = require('mongoose');
const contentFilter = require('../utils/contentFilter');

// Require sharp module directly (make it mandatory, not optional)
const sharp = require('sharp');


// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, '../uploads/bookings');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });

    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'booking-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to only allow certain file types
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar|webm|mp3|wav|m4a|ogg/;
  const allowedMimeTypes = /image\/|application\/|text\/|audio\//;
  
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimeTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image, document, archive, and audio files are allowed!'));
  }
};

// Set up multer upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  fileFilter: fileFilter
});

// Create a booking
router.post('/', auth, requireEmailVerification, async (req, res) => {
  try {
    const { serviceId, requirements } = req.body;

    // Find the service
    const service = await Service.findById(serviceId).populate('seller');
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Check if buyer is not the seller
    if (service.seller._id.toString() === req.user.userId) {
      return res.status(400).json({ error: 'You cannot book your own service' });
    }

    // Content filtering - check for blocked content in requirements
    if (requirements && requirements.trim()) {
      const filterResult = contentFilter.containsBlockedContent(requirements);
      if (filterResult.blocked) {
        const errorMessage = contentFilter.getBlockedContentMessage(filterResult.reasons);
        return res.status(400).json({ 
          error: errorMessage,
          blockedContent: true,
          reasons: filterResult.reasons
        });
      }
    }

    const booking = new Booking({
      serviceId,
      sellerId: service.seller._id,
      buyerId: req.user.userId,
      buyerName: req.user.username,
      price: service.price,
      currency: service.currency,
      requirements: requirements || ''
    });

    await booking.save();
    
    // Create notification for the seller about the new booking
    const bookingLink = `/dashboard?tab=bookings&booking=${booking._id}`;
    const notificationMessage = `New booking request for "${service.title}" from ${req.user.username}`;

    await createNotification(
      service.seller._id,
      'booking',
      notificationMessage,
      bookingLink,
      {
        relatedId: booking._id,
        relatedModel: 'Booking'
      }
    );
    
    const populatedBooking = await Booking.findById(booking._id)
      .populate('serviceId')
      .populate('sellerId', 'username email cv aquaPay')
      .populate('buyerId', 'username email cv');

    // Emit socket event for real-time updates
    const { getIO } = require('../socket');
    const io = getIO();
    if (io) {
      // Emit to the seller's room
      io.to(`user_${booking.sellerId}`).emit('bookingUpdated', {
        type: 'created',
        booking: populatedBooking
      });
      
      // Emit to the buyer's room
      io.to(`user_${booking.buyerId}`).emit('bookingUpdated', {
        type: 'created',
        booking: populatedBooking
      });
    }

    res.status(201).json(populatedBooking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bookings for a user (both as buyer and seller)
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({
      $or: [
        { buyerId: req.user.userId },
        { sellerId: req.user.userId }
      ]
    })
    .populate('serviceId')
    .populate('sellerId', 'username email cv aquaPay')
    .populate('buyerId', 'username email cv')
    .populate('escrowId')
    .sort({ createdAt: -1 });

    // Attach escrow status to booking objects for frontend use
    const bookingsWithEscrow = bookings.map(b => {
      const obj = b.toObject();
      if (obj.escrowId && typeof obj.escrowId === 'object') {
        obj.escrowStatus = obj.escrowId.status;
        obj.depositTxHash = obj.escrowId.depositTxHash;
        obj.releaseTxHash = obj.escrowId.releaseTxHash;
        obj.disputeReason = obj.escrowId.disputeReason;
        obj.escrowId = obj.escrowId._id;
      }
      return obj;
    });

    res.json(bookingsWithEscrow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific booking by ID (for new window view)
router.get('/:bookingId', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    // Validate bookingId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }
    
    const booking = await Booking.findById(bookingId)
      .populate('serviceId')
      .populate('sellerId', 'username email cv aquaPay')
      .populate('buyerId', 'username email cv')
      .populate('escrowId');
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Attach escrow status for frontend use
    if (booking.escrowId && typeof booking.escrowId === 'object') {
      const bookingObj = booking.toObject();
      bookingObj.escrowStatus = bookingObj.escrowId.status;
      bookingObj.depositTxHash = bookingObj.escrowId.depositTxHash;
      bookingObj.releaseTxHash = bookingObj.escrowId.releaseTxHash;
      bookingObj.disputeReason = bookingObj.escrowId.disputeReason;
      bookingObj.escrowId = bookingObj.escrowId._id;
    }
    
    // Verify user is either buyer or seller
    if (booking.buyerId._id.toString() !== req.user.userId && 
        booking.sellerId._id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to view this booking' });
    }
    
    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle OPTIONS request for the status update endpoint
router.options('/:id/status', (req, res) => {
  res.header('Access-Control-Allow-Methods', 'PUT');
  res.status(204).end();
});

// Update booking status
router.put('/:id/status', auth, requireEmailVerification, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id).populate('serviceId');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify user is either buyer or seller
    if (booking.buyerId.toString() !== req.user.userId && 
        booking.sellerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Handle different status updates
    switch (status) {
      case 'cancelled':
        if (booking.buyerId.toString() !== req.user.userId) {
          return res.status(403).json({ error: 'Only the buyer can cancel' });
        }
        break;
      
      case 'declined':
        if (booking.sellerId.toString() !== req.user.userId) {
          return res.status(403).json({ error: 'Only the seller can decline' });
        }
        
        // Refund tokens if the booking was unlocked
        if (booking.isUnlocked && booking.tokensSpent > 0) {
          const User = require('../models/User');
          const seller = await User.findById(booking.sellerId);
          
          if (seller) {
            // Refund the tokens
            const balanceBefore = seller.tokens;
            seller.tokens += booking.tokensSpent;
            
            // Add to token history
            seller.tokenHistory.push({
              type: 'refund',
              amount: booking.tokensSpent,
              reason: `Refund for declined booking lead: "${booking.serviceId?.title || 'Service'}"`,
              relatedId: booking._id,
              balanceBefore,
              balanceAfter: seller.tokens
            });
            
            await seller.save();
            
            // Create notification about token refund
            await createNotification(
              booking.sellerId,
              'token_refund',
              `${booking.tokensSpent} tokens refunded for declining booking: "${booking.serviceId?.title || 'Service'}"`,
              '/dashboard?tab=bookings',
              {
                relatedId: booking._id,
                relatedModel: 'Booking'
              }
            );
          }
        }
        break;
      
      case 'completed':
        if (booking.sellerId.toString() !== req.user.userId) {
          return res.status(403).json({ error: 'Only the seller can mark as completed' });
        }
        if (booking.status !== 'confirmed') {
          return res.status(400).json({ error: 'Booking must be confirmed before completion' });
        }

        // Gate: if escrow is active, buyer must have approved work first
        if (booking.escrowId && !booking.buyerWorkApproved) {
          return res.status(400).json({ error: 'Buyer must approve work before marking as completed' });
        }

        booking.completedAt = new Date();

        // If escrow is active, release funds to seller
        if (booking.escrowId) {
          try {
            const escrowService = require('../services/escrowService');
            console.log('Attempting escrow release for booking:', booking._id, 'escrowId:', booking.escrowId);
            const releaseResult = await escrowService.releaseToSeller(booking.escrowId);
            console.log('Escrow released:', releaseResult);

            try {
              const { getIO } = require('../socket');
              const io = getIO();
              if (io) {
                io.to(`user_${booking.sellerId}`).emit('escrowUpdated', { type: 'released', bookingId: booking._id });
                io.to(`user_${booking.buyerId}`).emit('escrowUpdated', { type: 'released', bookingId: booking._id });
              }
            } catch (socketErr) { console.error('Socket emit error:', socketErr); }
          } catch (escrowErr) {
            console.error('Error releasing escrow:', escrowErr);
            return res.status(500).json({ error: 'Failed to release escrow payment: ' + escrowErr.message });
          }
        }
        
        try {
          const BookingMessage = require('../models/BookingMessage');
          await BookingMessage.updateMany(
            { 
              bookingId: booking._id, 
              isWatermarked: true 
            },
            { 
              $set: { isWatermarked: false } 
            }
          );
        } catch (watermarkUpdateError) {
          console.error('Error updating watermark flags:', watermarkUpdateError);
        }
        break;

      case 'accepted_by_seller':
        if (booking.sellerId.toString() !== req.user.userId) {
          return res.status(403).json({ error: 'Only the seller can accept' });
        }
        break;

      case 'accepted_by_buyer':
        if (booking.buyerId.toString() !== req.user.userId) {
          return res.status(403).json({ error: 'Only the buyer can accept' });
        }
        break;
    }

    // If both parties have accepted, update to confirmed
    if ((status === 'accepted_by_seller' && booking.status === 'accepted_by_buyer') ||
        (status === 'accepted_by_buyer' && booking.status === 'accepted_by_seller')) {
      booking.status = 'confirmed';
    } else {
      booking.status = status;
    }

    await booking.save();

    // Create notification for status change
    const recipientUserId = req.user.userId === booking.sellerId.toString() 
      ? booking.buyerId 
      : booking.sellerId;

    const statusLink = `/dashboard?tab=bookings&booking=${req.params.id}`;
    let statusMessage;

    switch (status) {
      case 'accepted':
        statusMessage = `Your booking #${req.params.id.substring(0, 6)} has been accepted`;
        break;
      case 'completed':
        statusMessage = `Your booking #${req.params.id.substring(0, 6)} has been marked as completed`;
        break;
      case 'canceled':
        statusMessage = `Your booking #${req.params.id.substring(0, 6)} has been canceled`;
        break;
      case 'in_progress':
        statusMessage = `Your booking #${req.params.id.substring(0, 6)} is now in progress`;
        break;
      default:
        statusMessage = `Your booking #${req.params.id.substring(0, 6)} status has been updated to ${status}`;
    }

    await createNotification(
      recipientUserId,
      'status',
      statusMessage,
      statusLink,
      {
        relatedId: booking._id,
        relatedModel: 'Booking'
      }
    );

    const updatedBooking = await Booking.findById(booking._id)
      .populate('serviceId')
      .populate('sellerId', 'username email cv aquaPay')
      .populate('buyerId', 'username email cv');

    // Emit socket event for real-time updates
    const { getIO } = require('../socket');
    const io = getIO();
    if (io) {
      // Emit to the seller's room
      io.to(`user_${booking.sellerId}`).emit('bookingUpdated', {
        type: 'status_change',
        booking: updatedBooking
      });
      
      // Emit to the buyer's room
      io.to(`user_${booking.buyerId}`).emit('bookingUpdated', {
        type: 'status_change',
        booking: updatedBooking
      });
    }

    res.json(updatedBooking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buyer approves work (escrow gate for Mark Completed)
router.post('/:id/approve-work', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.buyerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only the buyer can approve work' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Booking must be in confirmed status' });
    }

    if (!booking.escrowId) {
      return res.status(400).json({ error: 'This booking does not have an active escrow' });
    }

    if (booking.buyerWorkApproved) {
      return res.status(400).json({ error: 'Work already approved' });
    }

    booking.buyerWorkApproved = true;
    booking.buyerWorkApprovedAt = new Date();
    await booking.save();

    // Remove watermark flags as soon as buyer approves delivered work.
    // Keep completion-time unwatermarking as a fallback safety net.
    try {
      await BookingMessage.updateMany(
        {
          bookingId: booking._id,
          isWatermarked: true
        },
        {
          $set: { isWatermarked: false }
        }
      );
    } catch (watermarkUpdateError) {
      console.error('Error updating watermark flags on approve-work:', watermarkUpdateError);
    }

    // Re-fetch with populated fields so socket/response have full data
    const populatedBooking = await Booking.findById(booking._id)
      .populate('serviceId')
      .populate('sellerId', 'username email cv aquaPay')
      .populate('buyerId', 'username email cv')
      .populate('escrowId');

    const bookingObj = populatedBooking.toObject();
    if (bookingObj.escrowId && typeof bookingObj.escrowId === 'object') {
      bookingObj.escrowStatus = bookingObj.escrowId.status;
      bookingObj.escrowId = bookingObj.escrowId._id;
    }

    // Notify seller that buyer approved
    const { createNotification: createNotif } = require('./notifications');
    await createNotif(
      booking.sellerId,
      'booking',
      `Buyer approved work for booking #${booking._id.toString().substring(0, 6)}! You can now mark it as completed.`,
      `/dashboard?tab=bookings`,
      { relatedId: booking._id, relatedModel: 'Booking' }
    );

    // Socket notification with full booking data
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      if (io) {
        io.to(`user_${booking.sellerId}`).emit('bookingUpdated', { type: 'work_approved', booking: bookingObj });
        io.to(`user_${booking.buyerId}`).emit('bookingUpdated', { type: 'work_approved', booking: bookingObj });
      }
    } catch (socketErr) { console.error('Socket emit error:', socketErr); }

    res.json({ success: true, message: 'Work approved', booking: bookingObj });
  } catch (error) {
    console.error('Error approving work:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW ROUTES FOR MESSAGING FUNCTIONALITY

// Get messages for a booking
router.get('/:bookingId/messages', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    // Verify the booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify user is either buyer or seller
    if (booking.buyerId.toString() !== req.user.userId && 
        booking.sellerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to view these messages' });
    }

    // Get messages, sorted by creation time
    const messages = await BookingMessage.find({ bookingId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'username image')
      .lean();

    // Mark messages as read if the current user is the recipient
    const unreadMessages = messages.filter(msg => 
      !msg.isRead && msg.senderId._id.toString() !== req.user.userId
    );

    if (unreadMessages.length > 0) {
      await BookingMessage.updateMany(
        { 
          _id: { $in: unreadMessages.map(msg => msg._id) }
        },
        { $set: { isRead: true } }
      );
      
      // Emit socket event for read receipts (so sender sees double check)
      try {
        const socketModule = require('../socket');
        socketModule.emitBookingMessagesRead({
          bookingId: bookingId,
          messageIds: unreadMessages.map(msg => msg._id),
          readBy: req.user.userId
        });
      } catch (socketError) {
        console.error('Error emitting read receipt socket event:', socketError);
      }
    }

    // Include initial requirements as first message if it exists
    let allMessages = [];
    if (booking.requirements && booking.requirements.trim() !== '') {
      allMessages.push({
        _id: 'initial-requirements',
        bookingId: booking._id,
        senderId: {
          _id: booking.buyerId,
          username: booking.buyerName
        },
        message: booking.requirements,
        createdAt: booking.createdAt,
        isRead: true,
        isInitialRequirements: true
      });
    }

    allMessages = [...allMessages, ...messages];
    
    res.json(allMessages);
  } catch (error) {
    console.error('Error fetching booking messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Watermark function to add overlay text to images
async function addWatermark(inputPath, outputPath, watermarkText) {
  try {
    // Create a small watermark SVG with text - small size ensures dense tiling
    const svgBuffer = Buffer.from(`
      <svg width="120" height="60" xmlns="http://www.w3.org/2000/svg">
        <style>
          .watermark {
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            fill: rgba(255, 255, 255, 0.7);
            transform: rotate(-30deg);
          }
        </style>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="watermark">${watermarkText}</text>
      </svg>
    `);

    // Apply the watermark with dense tiling
    await sharp(inputPath)
      // Add a subtle blur to make text more readable over varied backgrounds
      .modulate({ brightness: 0.95 }) // Slightly darken image to make watermark stand out
      .composite([
        {
          input: svgBuffer,
          blend: 'over',
          tile: true,
          // No gravity ensures the pattern starts from the top-left
        }
      ])
      .toFile(outputPath);
    
    
    return true;
  } catch (error) {
    console.error('Error adding watermark:', error);
    // Do not provide a fallback that would allow unwatermarked images
    // Instead, propagate the error so the message isn't sent without watermark
    return false;
  }
}

// Watermark function that returns a buffer (for dynamic watermarking)
async function addWatermarkToBuffer(inputPath, watermarkText) {
  try {
    // Create a small watermark SVG with text
    const svgBuffer = Buffer.from(`
      <svg width="120" height="60" xmlns="http://www.w3.org/2000/svg">
        <style>
          .watermark {
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            fill: rgba(255, 255, 255, 0.7);
            transform: rotate(-30deg);
          }
        </style>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="watermark">${watermarkText}</text>
      </svg>
    `);

    // Apply the watermark and return as buffer
    const watermarkedBuffer = await sharp(inputPath)
      .modulate({ brightness: 0.95 })
      .composite([
        {
          input: svgBuffer,
          blend: 'over',
          tile: true,
        }
      ])
      .png()
      .toBuffer();
    
    return watermarkedBuffer;
  } catch (error) {
    console.error('Error adding watermark to buffer:', error);
    throw error;
  }
}

// Send a new message with optional file attachment
router.post('/:bookingId/messages', auth, requireEmailVerification, upload.single('attachment'), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { message } = req.body;
    
    // Processing booking message
    
    // Validate message if there's no file attachment
    if (!req.file && (!message || message.trim() === '')) {
      return res.status(400).json({ error: 'Message or attachment is required' });
    }

    // Content filtering - check for blocked content in messages
    if (message && message.trim()) {
      const filterResult = contentFilter.containsBlockedContent(message);
      if (filterResult.blocked) {
        const errorMessage = contentFilter.getBlockedContentMessage(filterResult.reasons);
        return res.status(400).json({ 
          error: errorMessage,
          blockedContent: true,
          reasons: filterResult.reasons
        });
      }
    }

    // Verify the booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify user is either buyer or seller
    if (booking.buyerId.toString() !== req.user.userId && 
        booking.sellerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to send messages for this booking' });
    }

    // Check if sender is the seller
    const isSeller = booking.sellerId.toString() === req.user.userId;

    // Handle the file attachment
    let attachment = null;
    let attachmentType = null;
    let attachmentName = null;
    let dataUrl = null;
    let originalFilePath = null;
    let isWatermarked = false;

    if (req.file) {
      
      // Save attachment as relative URL path
      const filename = req.file.filename;
      const ext = path.extname(req.file.originalname).toLowerCase();
      const isImage = /\.(jpg|jpeg|png|gif)$/i.test(ext);
      const isAudio = /\.(webm|mp3|wav|m4a|ogg)$/i.test(ext) || req.file.mimetype.startsWith('audio/');
      
      if (isImage) {
        attachmentType = 'image';
      } else if (isAudio) {
        attachmentType = 'audio';
      } else {
        attachmentType = 'file';
      }
      
      attachmentName = req.file.originalname;
      
      // SIMPLE APPROACH: Always save original file, mark as watermarked if needed
      attachment = `/uploads/bookings/${filename}`;
      originalFilePath = path.join(__dirname, '../uploads/bookings', filename);
      
      // Mark as watermarked only before buyer approval/completion.
      if (isImage && isSeller && booking.status !== 'completed' && !booking.buyerWorkApproved) {
        isWatermarked = true;
      } else {
        isWatermarked = false;
      }
      

      
      // Check if the file exists
      const savedFilePath = originalFilePath || path.join(__dirname, '../uploads/bookings', filename);


      
      // If it's an image, create a data URL as fallback
      if (attachmentType === 'image' && fs.existsSync(savedFilePath)) {
        try {
          // Read the file as a buffer
          const fileBuffer = fs.readFileSync(savedFilePath);
          
          // Convert to base64 and create data URL
          const base64 = fileBuffer.toString('base64');
          const mimeType = req.file.mimetype || 'image/png';
          dataUrl = `data:${mimeType};base64,${base64}`;
          

        } catch (error) {
          console.error('Error creating data URL:', error);
        }
      }
    }

    // Create and save the new message

    
    // Create appropriate default message based on attachment type
    let defaultMessage = '';
    if (req.file && !message) {
      if (attachmentType === 'audio') {
        defaultMessage = 'Sent a voice message';
      } else if (attachmentType === 'image') {
        defaultMessage = 'Sent an image';
      } else {
        defaultMessage = 'Sent an attachment';
      }
    }
    
    const newMessage = new BookingMessage({
      bookingId,
      senderId: req.user.userId,
      message: message ? message.trim() : defaultMessage,
      attachment,
      attachmentType,
      attachmentName,
      dataUrl,  // Store the data URL in the database
      createdAt: new Date(),
      // Store whether this is a watermarked image
      isWatermarked
    });

    await newMessage.save();

    // Populate sender info
    const populatedMessage = await BookingMessage.findById(newMessage._id)
      .populate('senderId', 'username image');

    // Add notification for new message 
    // Find the other user (recipient) who should get the notification
    const recipientId = req.user.userId === booking.buyerId.toString() 
      ? booking.sellerId 
      : booking.buyerId;

    // Create link to the conversation
    const conversationLink = `/dashboard?tab=bookings&booking=${bookingId}`;

    // Create notification message
    let notificationMessage;
    if (req.file) {
      if (attachmentType === 'audio') {
        notificationMessage = `${req.user.username} sent a voice message in booking #${bookingId.substring(0, 6)}`;
      } else if (attachmentType === 'image') {
        notificationMessage = `${req.user.username} sent an image in booking #${bookingId.substring(0, 6)}`;
      } else {
        notificationMessage = `${req.user.username} sent an attachment in booking #${bookingId.substring(0, 6)}`;
      }
    } else {
      // Truncate the message if too long
      const messagePreview = message.length > 30 ? message.substring(0, 30) + '...' : message;
      notificationMessage = `${req.user.username}: ${messagePreview}`;
    }

    // Create the notification
    await createNotification(
      recipientId,
      'message',
      notificationMessage,
      conversationLink,
      {
        relatedId: booking._id,
        relatedModel: 'Booking',
        messageId: newMessage._id
      }
    );

    // Emit socket event for real-time message delivery
    try {
      const socketModule = require('../socket');
      socketModule.emitNewBookingMessage({
        ...populatedMessage.toObject(),
        bookingId: bookingId,
        recipientId: recipientId
      });
    } catch (socketError) {
      console.error('Error emitting socket event for new message:', socketError);
      // Don't fail the request if socket emission fails
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Add a new route to serve static files from uploads folder with dynamic watermarking
router.get('/uploads/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.resolve(__dirname, '../uploads/bookings', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      return res.status(404).send('File not found');
    }
    
    // Check if this file should be watermarked
    let shouldWatermark = false;
    try {
      const message = await BookingMessage.findOne({ 
        attachment: `/uploads/bookings/${filename}`,
        isWatermarked: true 
      }).lean();
      
      if (message) {
        const booking = await Booking.findById(message.bookingId);
        if (booking && booking.status !== 'completed') {
          shouldWatermark = true;
        }
      }
    } catch (err) {
      console.error('Error checking watermark status:', err);
    }
    
    // If should watermark, apply watermark dynamically
    if (shouldWatermark) {
      try {
        const watermarkedBuffer = await addWatermarkToBuffer(filePath, 'Aquads');
        
        // Set correct content type
        const ext = path.extname(filename).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg') {
          res.set('Content-Type', 'image/jpeg');
        } else if (ext === '.png') {
          res.set('Content-Type', 'image/png');
        } else if (ext === '.gif') {
          res.set('Content-Type', 'image/gif');
        }
        
        res.send(watermarkedBuffer);
        return;
      } catch (watermarkError) {
        console.error('Error applying watermark:', watermarkError);
        // Fall through to serve original file
      }
    }
    
    // Serve original file
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
      res.set('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.set('Content-Type', 'image/png');
    } else if (ext === '.gif') {
      res.set('Content-Type', 'image/gif');
    } else if (ext === '.pdf') {
      res.set('Content-Type', 'application/pdf');
    }
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).send('Error serving file');
  }
});

// Add a healthcheck route for file uploads
router.get('/uploads-healthcheck', (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../uploads');
    const bookingsDir = path.join(__dirname, '../uploads/bookings');
    
    const stats = {
      uploadsExists: fs.existsSync(uploadsDir),
      bookingsExists: fs.existsSync(bookingsDir),
      uploadsReadable: false,
      bookingsReadable: false,
      uploadsWritable: false,
      bookingsWritable: false,
      timestamp: new Date().toISOString()
    };
    
    // Check if directories are readable and writable
    try {
      fs.accessSync(uploadsDir, fs.constants.R_OK);
      stats.uploadsReadable = true;
    } catch (e) {
      console.error('Uploads dir not readable:', e.message);
    }
    
    try {
      fs.accessSync(bookingsDir, fs.constants.R_OK);
      stats.bookingsReadable = true;
    } catch (e) {
      console.error('Bookings dir not readable:', e.message);
    }
    
    try {
      fs.accessSync(uploadsDir, fs.constants.W_OK);
      stats.uploadsWritable = true;
    } catch (e) {
      console.error('Uploads dir not writable:', e.message);
    }
    
    try {
      fs.accessSync(bookingsDir, fs.constants.W_OK);
      stats.bookingsWritable = true;
    } catch (e) {
      console.error('Bookings dir not writable:', e.message);
    }
    
    // Get list of files in the bookings directory
    if (stats.bookingsExists && stats.bookingsReadable) {
      stats.bookingsFiles = fs.readdirSync(bookingsDir).slice(0, 10); // List up to 10 files
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Error in uploads healthcheck:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Add a file diagnostic endpoint
router.get('/file-diagnostic/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const possiblePaths = [
      path.join(__dirname, '../uploads/bookings', filename),
      path.join(__dirname, '../uploads', filename),
      path.resolve(__dirname, '../uploads/bookings', filename),
      path.resolve(__dirname, '../uploads', filename)
    ];
    
    const results = {};
    
    // Check each possible path
    possiblePaths.forEach((filePath, index) => {
      try {
        const exists = fs.existsSync(filePath);
        let stats = null;
        
        if (exists) {
          stats = fs.statSync(filePath);
        }
        
        results[`path${index+1}`] = {
          path: filePath,
          exists,
          stats: exists ? {
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            permissions: stats.mode.toString(8)
          } : null
        };
      } catch (error) {
        results[`path${index+1}`] = {
          path: filePath,
          exists: false,
          error: error.message
        };
      }
    });
    
    // Add server information
    results.serverInfo = {
      workingDirectory: process.cwd(),
      platform: process.platform,
      env: process.env.NODE_ENV,
      dirname: __dirname,
      timestamp: new Date().toISOString()
    };
    
    // Return all the results
    res.json(results);
  } catch (error) {
    console.error('Error in file diagnostic:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a direct file serving route with query parameter support
router.get('/file', async (req, res) => {
  try {
    const { filename, bookingId } = req.query;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    
    // Sanitize the filename to prevent directory traversal attacks
    const sanitizedFilename = path.basename(filename);
    
    // Check if this is a watermarked file
    const isWatermarked = sanitizedFilename.startsWith('watermarked-');
    
    // If watermarked and bookingId is provided, check if the booking is completed
    let useOriginalFile = false;
    
    if (isWatermarked && bookingId) {
      try {
        // Find the booking
        const booking = await Booking.findById(bookingId);
        if (booking && booking.status === 'completed') {
          useOriginalFile = true;
      
        }
      } catch (err) {
        console.error('Error checking booking status:', err);
        // If error, continue with watermarked file
      }
    }
    
    // Construct path to the file
    let filePath;
    
    if (useOriginalFile) {
      // If booking is completed, serve the original file
      const originalFilename = 'original-' + sanitizedFilename.replace('watermarked-', '');
      filePath = path.join(__dirname, '../uploads/bookings/originals', originalFilename);
  
    } else {
      // Otherwise serve the requested file (watermarked or regular)
      filePath = path.join(__dirname, '../uploads/bookings', sanitizedFilename);
    
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      return res.status(404).send('File not found');
    }
    
    // Set content type based on file extension
    const ext = path.extname(sanitizedFilename).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
      res.set('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.set('Content-Type', 'image/png');
    } else if (ext === '.gif') {
      res.set('Content-Type', 'image/gif');
    } else if (ext === '.pdf') {
      res.set('Content-Type', 'application/pdf');
    }
    
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cache-Control', 'public, max-age=3600');
    
    // Stream the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving file through query param:', error);
    res.status(500).send('Error serving file');
  }
});

// Test route to verify the notification creation is working
router.get('/test-notification', auth, async (req, res) => {
  try {

    
    // Create a test notification
    const notification = await createNotification(
      req.user.userId,
      'system',
      'This is a test notification',
      '/dashboard',
      {
        relatedModel: 'Test', 
        relatedId: 'test-id-123'
      }
    );
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({ error: 'Failed to create test notification' });
  }
});

// Add after the test-notification route
// Alternative route to get user notifications
router.get('/user-notifications', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
  
    
    // Import the Notification model directly here to avoid circular dependencies
    let Notification;
    
    try {
      Notification = mongoose.model('Notification');
    } catch (error) {
      // If model doesn't exist, define it here (exact same as main model)
      const notificationSchema = new mongoose.Schema({
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        type: {
          type: String,
          enum: ['message', 'booking', 'status', 'review', 'system', 'affiliate', 'token_refund', 'service_approved', 'service_rejected'],
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
          default: Date.now
        }
      });
      
      Notification = mongoose.model('Notification', notificationSchema);
    }
    
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
  
    res.json(notifications);
  } catch (error) {
    console.error('Error in /bookings/user-notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

// Add mark-all-read endpoint
router.patch('/user-notifications/mark-all-read', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
  
    
    // Import the Notification model
    let Notification;
    
    try {
      Notification = mongoose.model('Notification');
    } catch (error) {
      // If model doesn't exist, define it here (same schema as above)
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
      
      Notification = mongoose.model('Notification', notificationSchema);
    }
    
    // Update all unread notifications for this user
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );
    
  
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Error marking notifications as read', error: error.message });
  }
});

// Add route to mark individual notification as read
router.patch('/user-notifications/:id', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const notificationId = req.params.id;
  
    
    // Import the Notification model
    let Notification;
    
    try {
      Notification = mongoose.model('Notification');
    } catch (error) {
      // If model doesn't exist, handle the error
      return res.status(404).json({ message: 'Notification model not found' });
    }
    
    // Find and update the notification
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { isRead: true } },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or not owned by user' });
    }
    

    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read', error: error.message });
  }
});

// Add endpoint to handle booking notifications redirection
router.get('/notification/:id', auth, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.userId;
    
  
    
    // Find the notification
    const Notification = mongoose.model('Notification');
    const notification = await Notification.findOne({ 
      _id: notificationId,
      userId: userId
    });
    
    if (!notification) {
  
      return res.redirect('/dashboard');
    }
    
    // Processing notification
    
    // Mark it as read
    notification.isRead = true;
    await notification.save();
    
    // Determine the redirect URL
    let redirectUrl = '/dashboard';
    
    // If it's a booking notification, redirect to dashboard with the booking parameter
    if (notification.relatedModel === 'Booking' && notification.relatedId) {
      redirectUrl = `/dashboard?openBooking=${notification.relatedId}`;
    } else if (notification.link) {
      // Use the link field if available
      redirectUrl = notification.link;
    }
    
  
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error handling notification redirect:', error);
    res.redirect('/dashboard');
  }
});

module.exports = router; 