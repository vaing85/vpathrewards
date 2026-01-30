const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/labels');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `label-${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// @route   GET /api/deliveries
// @desc    Get deliveries (filtered by role)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'driver') {
      query.driver = req.user._id;
    }
    // Admin can see all deliveries

    const deliveries = await Delivery.find(query)
      .populate({
        path: 'order',
        populate: {
          path: 'customer',
          select: 'name email phone address'
        }
      })
      .populate('driver', 'name phone driverInfo')
      .sort({ createdAt: -1 });

    res.json(deliveries);
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/deliveries/:id
// @desc    Get single delivery
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('order')
      .populate('driver', 'name phone driverInfo');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Check access permissions
    if (req.user.role === 'driver' && delivery.driver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(delivery);
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/deliveries/:id/location
// @desc    Update driver location
// @access  Private (Driver only)
router.put(
  '/:id/location',
  auth,
  authorize('driver'),
  [
    body('latitude').isFloat().withMessage('Valid latitude is required'),
    body('longitude').isFloat().withMessage('Valid longitude is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const delivery = await Delivery.findById(req.params.id);
      if (!delivery) {
        return res.status(404).json({ message: 'Delivery not found' });
      }

      if (delivery.driver.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }

      delivery.currentLocation = {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        timestamp: new Date()
      };

      await delivery.save();
      if (delivery.order) {
        await delivery.populate('order');
      }

      // Emit location update
      const io = req.app.get('io');
      if (delivery.order) {
        io.to(`order-${delivery.order._id}`).emit('location-updated', {
          deliveryId: delivery._id,
          location: delivery.currentLocation,
          orderId: delivery.order._id
        });
      }
      io.emit('location-updated', {
        deliveryId: delivery._id,
        location: delivery.currentLocation
      });

      res.json(delivery);
    } catch (error) {
      console.error('Update location error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/deliveries/:id/status
// @desc    Update delivery status
// @access  Private (Driver only)
router.put(
  '/:id/status',
  auth,
  authorize('driver'),
  [
    body('status').isIn(['assigned', 'picked-up', 'in-transit', 'delivered', 'failed'])
      .withMessage('Invalid status')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const delivery = await Delivery.findById(req.params.id);
      if (!delivery) {
        return res.status(404).json({ message: 'Delivery not found' });
      }

      if (delivery.driver.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }

      delivery.status = req.body.status;

      if (req.body.status === 'delivered') {
        delivery.actualDeliveryTime = new Date();
        
        // Update order status if order exists
        if (delivery.order) {
          const order = await Order.findById(delivery.order);
          if (order) {
            order.status = 'delivered';
            await order.save();
          }
        }
      }

      if (req.body.deliveryNotes) {
        delivery.deliveryNotes = req.body.deliveryNotes;
      }

      await delivery.save();
      if (delivery.order) {
        await delivery.populate('order');
      }
      await delivery.populate('driver', 'name phone');

      // Emit status update
      const io = req.app.get('io');
      if (delivery.order) {
        io.to(`order-${delivery.order._id}`).emit('delivery-status-updated', delivery);
      }
      io.emit('delivery-updated', delivery);

      res.json(delivery);
    } catch (error) {
      console.error('Update delivery status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/deliveries/:id/label-image
// @desc    Upload label image
// @access  Private (Driver only)
router.post(
  '/:id/label-image',
  auth,
  authorize('driver'),
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      const delivery = await Delivery.findById(req.params.id);
      if (!delivery) {
        // Delete uploaded file if delivery not found
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'Delivery not found' });
      }

      if (delivery.driver.toString() !== req.user._id.toString()) {
        // Delete uploaded file if unauthorized
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: 'Access denied' });
      }

      // Delete old image if exists
      if (delivery.labelInfo && delivery.labelInfo.labelImage) {
        const oldImagePath = path.join(__dirname, '../uploads/labels', path.basename(delivery.labelInfo.labelImage));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Return the image URL (full URL for frontend)
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const imageUrl = `${baseUrl}/uploads/labels/${req.file.filename}`;
      
      res.json({ imageUrl, message: 'Image uploaded successfully' });
    } catch (error) {
      console.error('Upload label image error:', error);
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/deliveries/create-route
// @desc    Create a new route/delivery from label information
// @access  Private (Driver only)
router.post(
  '/create-route',
  auth,
  authorize('driver'),
  [
    body('trackingNumber').notEmpty().withMessage('Tracking number is required'),
    body('carrier').notEmpty().withMessage('Carrier is required'),
    body('deliveryAddress.street').notEmpty().withMessage('Street address is required'),
    body('deliveryAddress.city').notEmpty().withMessage('City is required'),
    body('deliveryAddress.state').notEmpty().withMessage('State is required'),
    body('deliveryAddress.zipCode').notEmpty().withMessage('Zip code is required'),
    body('recipientName').notEmpty().withMessage('Recipient name is required'),
    body('recipientPhone').notEmpty().withMessage('Recipient phone is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      // Create new delivery/route
      const delivery = new Delivery({
        driver: req.user._id,
        status: 'assigned',
        deliveryAddress: req.body.deliveryAddress,
        recipientName: req.body.recipientName,
        recipientPhone: req.body.recipientPhone,
        labelInfo: {
          trackingNumber: req.body.trackingNumber,
          carrier: req.body.carrier,
          packageWeight: req.body.packageWeight || '',
          packageDimensions: req.body.packageDimensions || '',
          specialInstructions: req.body.specialInstructions || '',
          labelImage: req.body.labelImage || '',
          capturedAt: new Date(),
          captureMethod: req.body.captureMethod || 'manual'
        }
      });

      await delivery.save();
      await delivery.populate('driver', 'name phone');

      // Emit route creation event
      const io = req.app.get('io');
      io.emit('route-created', delivery);
      io.emit('delivery-updated', delivery);

      res.status(201).json(delivery);
    } catch (error) {
      console.error('Create route error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/deliveries/create-route/label-image
// @desc    Upload label image for route creation
// @access  Private (Driver only)
const uploadForRoute = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../uploads/labels');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `route-label-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

router.post(
  '/create-route/label-image',
  auth,
  authorize('driver'),
  uploadForRoute.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      // Return the image URL
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const imageUrl = `${baseUrl}/uploads/labels/${req.file.filename}`;
      
      res.json({ imageUrl, message: 'Image uploaded successfully' });
    } catch (error) {
      console.error('Upload route label image error:', error);
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/deliveries/:id/label-info
// @desc    Update label information
// @access  Private (Driver only)
router.put(
  '/:id/label-info',
  auth,
  authorize('driver'),
  [
    body('trackingNumber').notEmpty().withMessage('Tracking number is required'),
    body('carrier').notEmpty().withMessage('Carrier is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const delivery = await Delivery.findById(req.params.id);
      if (!delivery) {
        return res.status(404).json({ message: 'Delivery not found' });
      }

      if (delivery.driver.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Update label info
      delivery.labelInfo = {
        trackingNumber: req.body.trackingNumber,
        carrier: req.body.carrier,
        packageWeight: req.body.packageWeight || '',
        packageDimensions: req.body.packageDimensions || '',
        specialInstructions: req.body.specialInstructions || '',
        labelImage: req.body.labelImage || delivery.labelInfo?.labelImage || '',
        capturedAt: new Date(),
        captureMethod: req.body.captureMethod || 'manual'
      };

      await delivery.save();
      await delivery.populate('order');
      await delivery.populate('driver', 'name phone');

      // Emit label update
      const io = req.app.get('io');
      if (delivery.order) {
        io.to(`order-${delivery.order._id}`).emit('label-info-updated', delivery);
      }
      io.emit('delivery-updated', delivery);

      res.json(delivery);
    } catch (error) {
      console.error('Update label info error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;

