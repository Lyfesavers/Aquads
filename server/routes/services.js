const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const ServiceReview = require('../models/ServiceReview');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const upload = require('../middleware/upload');
const { awardListingPoints } = require('./points');
const { createNotification } = require('./notifications');
const { emitServiceApproved, emitServiceRejected, emitNewServicePending } = require('../socket');

// Get all services with optional filtering
router.get('/', async (req, res) => {
  try {
    const { category, sort, limit = 20, page = 1 } = req.query;
    const query = { status: 'active' }; // Only show active services to regular users
    const sortOptions = {};

    if (category) {
      query.category = category;
    }

    if (sort) {
      switch (sort) {
        case 'price-low':
          sortOptions.price = 1;
          break;
        case 'price-high':
          sortOptions.price = -1;
          break;
        case 'rating':
          sortOptions.rating = -1;
          break;
        case 'newest':
          sortOptions.createdAt = -1;
          break;
        default:
          sortOptions.rating = -1;
      }
    } else {
      // Default sort when no sort parameter is provided
      sortOptions.rating = -1;
    }

    const services = await Service.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('seller', 'username image rating reviews country isOnline lastSeen lastActivity skillBadges cv userType');

    // Get service IDs for batch review query
    const serviceIds = services.map(service => service._id);

    // Fetch all reviews for these services in a single query (fixes N+1 problem)
    const reviewAggregation = await ServiceReview.aggregate([
      {
        $match: { serviceId: { $in: serviceIds } }
      },
      {
        $group: {
          _id: '$serviceId',
          avgRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      }
    ]);

    // Create a map for quick lookup
    const reviewMap = {};
    reviewAggregation.forEach(review => {
      reviewMap[review._id.toString()] = {
        rating: Math.round(review.avgRating * 10) / 10, // Round to 1 decimal
        reviews: review.reviewCount
      };
    });

    // Add review data and completion rate to each service efficiently
    const servicesWithReviews = await Promise.all(services.map(async (service) => {
      const reviewData = reviewMap[service._id.toString()] || { rating: 0, reviews: 0 };
      
      // Calculate completion rate for each service
      const contactCount = await Booking.countDocuments({ serviceId: service._id });
      const bookingCount = await Booking.countDocuments({ 
        serviceId: service._id, 
        status: { $in: ['completed', 'confirmed'] } 
      });
      const completionRate = contactCount > 0 ? Math.round((bookingCount / contactCount) * 100) : 0;

      return {
        ...service.toObject(),
        rating: reviewData.rating,
        reviews: reviewData.reviews,
        completionRate: completionRate
      };
    }));

    const total = await Service.countDocuments(query);

    res.json({
      services: servicesWithReviews,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ message: 'Error fetching services', error: error.message });
  }
});

// Search services
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const services = await Service.find(
      { 
        $text: { $search: q },
        status: 'active' // Only show active services in search
      },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .populate('seller', 'username image rating reviews country isOnline lastSeen lastActivity skillBadges');

    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Error searching services', error: error.message });
  }
});

// Get services by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const services = await Service.find({ 
      category: req.params.categoryId,
      status: 'active' // Only show active services in category view
    })
      .sort({ rating: -1 })
      .populate('seller', 'username image rating reviews country isOnline lastSeen lastActivity skillBadges cv userType');
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching services by category', error: error.message });
  }
});

// Create a new service
router.post('/', auth, requireEmailVerification, async (req, res) => {
  try {
    const { title, description, category, price, hourlyRate, deliveryTime, requirements, image, videoUrl } = req.body;

    // Validate required fields
    if (!title || !description || !category || !price || !deliveryTime || !image) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already has a service in this category
    const existingService = await Service.findOne({
      seller: req.user.userId,
      category: category
    });

    if (existingService) {
      return res.status(400).json({ 
        message: 'You can only have one service listing per category. Please edit your existing service or choose a different category.' 
      });
    }

    const service = new Service({
      title,
      description,
      category,
      price: parseFloat(price),
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      deliveryTime,
      requirements: requirements || '',
      image,
      videoUrl: videoUrl || '',

      seller: req.user.userId
    });

    await service.save();
    
    // Award points for creating a listing
    try {
      await awardListingPoints(req.user.userId);
    } catch (pointsError) {
      console.error('Error awarding points:', pointsError);
      // Don't fail the service creation if points awarding fails
    }
    
    await service.populate('seller', 'username image rating reviews country isOnline lastSeen lastActivity skillBadges cv userType');

    // Emit real-time socket update for new service pending approval
    try {
      emitNewServicePending({
        _id: service._id,
        title: service.title,
        description: service.description,
        category: service.category,
        price: service.price,
        seller: service.seller,
        status: service.status,
        createdAt: service.createdAt
      });
    } catch (socketError) {
      console.error('Error emitting new service pending:', socketError);
      // Don't fail the service creation if socket emission fails
    }

    res.status(201).json(service);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ message: 'Error creating service', error: error.message });
  }
});

// Update a service
router.put('/:id', auth, requireEmailVerification, upload.single('image'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (service.seller.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this service' });
    }

    const updates = { ...req.body };
    if (req.file) {
      updates.image = req.file.location;
    }



    Object.keys(updates).forEach(key => {
      service[key] = updates[key];
    });

    await service.save();
    await service.populate('seller', 'username image rating reviews country isOnline lastSeen lastActivity skillBadges cv userType');

    res.json(service);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ message: 'Error updating service', error: error.message });
  }
});

// Delete a service
router.delete('/:id', auth, requireEmailVerification, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (service.seller.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this service' });
    }

    await service.deleteOne();
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ message: 'Error deleting service', error: error.message });
  }
});

// Request premium status
router.post('/:id/premium-request', auth, async (req, res) => {
  try {
    const { paymentId } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const service = await Service.findOne({ 
      _id: req.params.id,
      seller: req.user.userId 
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (service.isPremium) {
      return res.status(400).json({ error: 'Service is already premium' });
    }

    service.premiumPaymentId = paymentId;
    service.premiumStatus = 'pending';
    service.premiumRequestedAt = new Date();
    
    await service.save();

    res.json(service);
  } catch (error) {
    console.error('Error requesting premium status:', error);
    res.status(500).json({ error: 'Failed to request premium status' });
  }
});

// Approve premium status (admin only)
router.post('/:id/premium-approve', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can approve premium status' });
    }

    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    service.isPremium = true;
    service.premiumStatus = 'active';
    service.premiumApprovedAt = new Date();
    
    await service.save();

    res.json(service);
  } catch (error) {
    console.error('Error approving premium status:', error);
    res.status(500).json({ error: 'Failed to approve premium status' });
  }
});

// Reject premium status (admin only)
router.post('/:id/premium-reject', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can reject premium status' });
    }

    const { reason } = req.body;
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Clear premium request data
    service.premiumStatus = 'inactive';
    service.premiumPaymentId = null;
    service.premiumRequestedAt = null;
    
    await service.save();

    res.json({ 
      message: 'Premium request rejected successfully',
      service
    });
  } catch (error) {
    console.error('Error rejecting premium status:', error);
    res.status(500).json({ error: 'Failed to reject premium status' });
  }
});

// Get pending premium requests (admin only)
router.get('/premium-requests', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can view premium requests' });
    }

    const requests = await Service.find({
      premiumStatus: 'pending',
      premiumPaymentId: { $ne: null }
    }).populate('seller', 'username');

    res.json(requests);
  } catch (error) {
    console.error('Error fetching premium requests:', error);
    res.status(500).json({ error: 'Failed to fetch premium requests' });
  }
});

// Get pending services (admin only)
router.get('/pending', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can view pending services' });
    }

    const services = await Service.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('seller', 'username image rating reviews country isOnline lastSeen lastActivity skillBadges cv userType');

    res.json(services);
  } catch (error) {
    console.error('Error fetching pending services:', error);
    res.status(500).json({ error: 'Failed to fetch pending services' });
  }
});

// Approve a service (admin only)
router.post('/:id/approve', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can approve services' });
    }

    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (service.status !== 'pending') {
      return res.status(400).json({ error: `Service is already ${service.status}` });
    }

    service.status = 'active';
    await service.save();
    
    await service.populate('seller', 'username image rating reviews country isOnline lastSeen lastActivity skillBadges cv userType');

    // Create notification for the seller
    try {
      await createNotification(
        service.seller._id,
        'service_approved',
        `Your service "${service.title}" has been approved and is now live!`,
        '/marketplace',
        {
          relatedId: service._id,
          relatedModel: 'Service'
        }
      );
    } catch (notificationError) {
      console.error('Error creating approval notification:', notificationError);
      // Don't fail the approval if notification fails
    }

    // Emit real-time socket update for service approval
    try {
      emitServiceApproved({
        serviceId: service._id,
        title: service.title,
        seller: service.seller,
        approvedBy: req.user.id,
        approvedAt: new Date()
      });
    } catch (socketError) {
      console.error('Error emitting service approval:', socketError);
      // Don't fail the approval if socket emission fails
    }

    res.json({ 
      message: 'Service approved successfully',
      service
    });
  } catch (error) {
    console.error('Error approving service:', error);
    res.status(500).json({ error: 'Failed to approve service' });
  }
});

// Reject a service (admin only)
router.post('/:id/reject', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can reject services' });
    }

    const { reason } = req.body;
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (service.status !== 'pending') {
      return res.status(400).json({ error: `Service is already ${service.status}` });
    }

    service.status = 'inactive';
    await service.save();
    
    await service.populate('seller', 'username image rating reviews country isOnline lastSeen lastActivity skillBadges cv userType');

    // Create notification for the seller
    try {
      const rejectionMessage = reason 
        ? `Your service "${service.title}" was rejected. Reason: ${reason}`
        : `Your service "${service.title}" was rejected. Please contact support for more information.`;
        
      await createNotification(
        service.seller._id,
        'service_rejected',
        rejectionMessage,
        '/marketplace',
        {
          relatedId: service._id,
          relatedModel: 'Service'
        }
      );
    } catch (notificationError) {
      console.error('Error creating rejection notification:', notificationError);
      // Don't fail the rejection if notification fails
    }

    // Emit real-time socket update for service rejection
    try {
      emitServiceRejected({
        serviceId: service._id,
        title: service.title,
        seller: service.seller,
        reason: reason || 'No reason provided',
        rejectedBy: req.user.id,
        rejectedAt: new Date()
      });
    } catch (socketError) {
      console.error('Error emitting service rejection:', socketError);
      // Don't fail the rejection if socket emission fails
    }

    res.json({ 
      message: 'Service rejected successfully',
      service
    });
  } catch (error) {
    console.error('Error rejecting service:', error);
    res.status(500).json({ error: 'Failed to reject service' });
  }
});

// Get service details with analytics
router.get('/:id/details', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('seller', 'username image country isOnline lastSeen lastActivity skillBadges createdAt cv userType');
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Increment view count
    await Service.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    // Calculate real analytics from database
    const contactCount = await Booking.countDocuments({ serviceId: req.params.id });
    const bookingCount = await Booking.countDocuments({ 
      serviceId: req.params.id, 
      status: { $in: ['completed', 'confirmed'] } 
    });
    const completionRate = contactCount > 0 ? Math.round((bookingCount / contactCount) * 100) : 0;

    // Add analytics to service object
    const serviceWithAnalytics = {
      ...service.toObject(),
      analytics: {
        views: service.views + 1, // Include the current view
        contacts: contactCount,
        bookings: bookingCount,
        completionRate: completionRate
      }
    };

    res.json(serviceWithAnalytics);
  } catch (error) {
    console.error('Error fetching service details:', error);
    res.status(500).json({ message: 'Error fetching service details', error: error.message });
  }
});

// Create a new booking
router.post('/:id/book', auth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (service.seller.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to book this service' });
    }

    const booking = new Booking({
      service: req.params.id,
      buyer: req.user.userId,
      // Add other booking fields here
    });

    await booking.save();

    // Add notification for the seller about the new booking
    const bookingLink = `/dashboard?tab=bookings&booking=${booking._id}`;
    const notificationMessage = `New booking received: ${service.title}`;

    await createNotification(
      service.seller,
      'booking',
      notificationMessage,
      bookingLink,
      {
        relatedId: booking._id,
        relatedModel: 'Booking'
      }
    );

    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Error creating booking', error: error.message });
  }
});

module.exports = router; 