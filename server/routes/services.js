const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get all services with optional filtering
router.get('/', async (req, res) => {
  try {
    const { category, sort, limit = 20, page = 1 } = req.query;
    const query = {};
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
        default:
          sortOptions.createdAt = -1;
      }
    }

    const services = await Service.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('seller', 'username image rating reviews');

    const total = await Service.countDocuments(query);

    res.json({
      services,
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
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .populate('seller', 'username image rating reviews');

    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Error searching services', error: error.message });
  }
});

// Get services by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const services = await Service.find({ category: req.params.categoryId })
      .sort({ createdAt: -1 })
      .populate('seller', 'username image rating reviews');
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching services by category', error: error.message });
  }
});

// Create a new service
router.post('/', auth, async (req, res) => {
  try {
    console.log('Service creation request received');
    console.log('Request body:', req.body);
    
    const { title, description, category, price, deliveryTime, requirements, image, telegramUsername } = req.body;

    // Validate required fields
    if (!title || !description || !category || !price || !deliveryTime || !image || !telegramUsername) {
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
      deliveryTime,
      requirements: requirements || '',
      image,
      telegramUsername: telegramUsername.replace('@', ''), // Remove @ if present
      seller: req.user.userId
    });

    console.log('Service object created:', service);

    await service.save();
    console.log('Service saved successfully');
    
    await service.populate('seller', 'username image rating reviews');
    console.log('Service populated with seller info');

    res.status(201).json(service);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ message: 'Error creating service', error: error.message });
  }
});

// Update a service
router.put('/:id', auth, upload.single('image'), async (req, res) => {
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

    // Handle Telegram username update
    if (updates.telegramUsername) {
      updates.telegramUsername = updates.telegramUsername.replace('@', '');
    }

    Object.keys(updates).forEach(key => {
      service[key] = updates[key];
    });

    await service.save();
    await service.populate('seller', 'username image rating reviews');

    res.json(service);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ message: 'Error updating service', error: error.message });
  }
});

// Delete a service
router.delete('/:id', auth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (service.seller.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this service' });
    }

    await service.deleteOne();
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ message: 'Error deleting service', error: error.message });
  }
});

module.exports = router; 