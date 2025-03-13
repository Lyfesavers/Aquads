const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const BookingMessage = require('../models/BookingMessage');
const Service = require('../models/Service');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, '../uploads/bookings');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('Created upload directory:', dir);
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
  const allowedFileTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar/;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image, document, and archive files are allowed!'));
  }
};

// Set up multer upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  fileFilter: fileFilter
});

// Create a booking
router.post('/', auth, async (req, res) => {
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
    
    // Populate the saved booking with service and user details
    const populatedBooking = await Booking.findById(booking._id)
      .populate('serviceId')
      .populate('sellerId', 'username email')
      .populate('buyerId', 'username email');

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
    .populate('sellerId', 'username email')
    .populate('buyerId', 'username email')
    .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle OPTIONS request for the status update endpoint
router.options('/:id/status', (req, res) => {
  res.header('Access-Control-Allow-Methods', 'PUT');
  res.status(204).end();
});

// Update booking status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

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
        break;
      
      case 'completed':
        if (booking.sellerId.toString() !== req.user.userId) {
          return res.status(403).json({ error: 'Only the seller can mark as completed' });
        }
        if (booking.status !== 'confirmed') {
          return res.status(400).json({ error: 'Booking must be confirmed before completion' });
        }
        booking.completedAt = new Date();
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

    const updatedBooking = await Booking.findById(booking._id)
      .populate('serviceId')
      .populate('sellerId', 'username email')
      .populate('buyerId', 'username email');

    res.json(updatedBooking);
  } catch (error) {
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
      .populate('senderId', 'username image');

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

// Send a new message with optional file attachment
router.post('/:bookingId/messages', auth, upload.single('attachment'), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { message } = req.body;
    
    console.log('Received message request with data:', { 
      bookingId, 
      hasMessage: !!message, 
      hasFile: !!req.file 
    });
    
    // Validate message if there's no file attachment
    if (!req.file && (!message || message.trim() === '')) {
      return res.status(400).json({ error: 'Message or attachment is required' });
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

    // Handle the file attachment
    let attachment = null;
    let attachmentType = null;
    let attachmentName = null;

    if (req.file) {
      console.log('File uploaded successfully:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        filename: req.file.filename
      });
      
      // IMPORTANT: Save attachment as relative URL path
      // This makes it much more portable across environments
      // Let the front-end construct the full URL with the API domain
      const filename = req.file.filename;
      attachment = `/uploads/bookings/${filename}`;
      console.log('Generated file URL (relative path):', attachment);
      
      // Store the filename separately to enable direct access if needed
      const savedFilePath = path.join(__dirname, '../uploads/bookings', filename);
      console.log('Checking if file exists at:', savedFilePath);
      console.log('File exists:', fs.existsSync(savedFilePath));
      
      // Determine attachment type
      const ext = path.extname(req.file.originalname).toLowerCase();
      attachmentType = /\.(jpg|jpeg|png|gif)$/i.test(ext) ? 'image' : 'file';
      attachmentName = req.file.originalname;
    }

    // Create and save the new message
    const newMessage = new BookingMessage({
      bookingId,
      senderId: req.user.userId,
      message: message ? message.trim() : req.file ? 'Sent an attachment' : '',
      attachment,
      attachmentType,
      attachmentName,
      createdAt: new Date()
    });

    await newMessage.save();

    // Populate sender info
    const populatedMessage = await BookingMessage.findById(newMessage._id)
      .populate('senderId', 'username image');

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Add a new route to serve static files from uploads folder
router.get('/uploads/:filename', (req, res) => {
  try {
    // Use absolute path for file access
    const filePath = path.resolve(__dirname, '../uploads/bookings', req.params.filename);
    console.log('Serving file from (route handler):', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      return res.status(404).send('File not found');
    }
    
    // Set correct content type based on file extension
    const ext = path.extname(req.params.filename).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
      res.set('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.set('Content-Type', 'image/png');
    } else if (ext === '.gif') {
      res.set('Content-Type', 'image/gif');
    } else if (ext === '.pdf') {
      res.set('Content-Type', 'application/pdf');
    }
    
    // Send the file with proper headers
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

module.exports = router; 