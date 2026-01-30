const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/drivers
// @desc    Get drivers (all drivers for admin, available only for order assignment)
// @access  Private (Admin only)
router.get('/drivers', auth, authorize('admin'), async (req, res) => {
  try {
    const { availableOnly } = req.query;
    const query = { role: 'driver' };
    
    if (availableOnly === 'true') {
      query['driverInfo.isAvailable'] = true;
    }

    const drivers = await User.find(query)
      .select('name email phone driverInfo address createdAt')
      .sort({ createdAt: -1 });

    res.json(drivers);
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/drivers/:id/location
// @desc    Get driver's current location from active deliveries
// @access  Private (Admin only)
router.get('/drivers/:id/location', auth, authorize('admin'), async (req, res) => {
  try {
    const Delivery = require('../models/Delivery');
    const deliveries = await Delivery.find({
      driver: req.params.id,
      status: { $in: ['picked-up', 'in-transit'] },
      'currentLocation.latitude': { $exists: true }
    })
    .sort({ 'currentLocation.timestamp': -1 })
    .limit(1);

    if (deliveries.length > 0 && deliveries[0].currentLocation) {
      res.json({
        location: deliveries[0].currentLocation,
        deliveryId: deliveries[0]._id,
        orderId: deliveries[0].order
      });
    } else {
      res.json({ location: null, message: 'No active location data' });
    }
  } catch (error) {
    console.error('Get driver location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/drivers
// @desc    Create a new driver
// @access  Private (Admin only)
router.post(
  '/drivers',
  auth,
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('vehicleType').notEmpty().withMessage('Vehicle type is required'),
    body('vehicleNumber').notEmpty().withMessage('Vehicle number is required'),
    body('licenseNumber').notEmpty().withMessage('License number is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { name, email, password, phone, vehicleType, vehicleNumber, licenseNumber, address } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Create new driver
      const driver = new User({
        name,
        email,
        password,
        phone,
        role: 'driver',
        address,
        driverInfo: {
          isAvailable: true,
          vehicleType,
          vehicleNumber,
          licenseNumber
        }
      });

      await driver.save();

      res.status(201).json(driver);
    } catch (error) {
      console.error('Create driver error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   DELETE /api/users/drivers/:id
// @desc    Delete a driver
// @access  Private (Admin only)
router.delete('/drivers/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const driver = await User.findById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (driver.role !== 'driver') {
      return res.status(400).json({ message: 'User is not a driver' });
    }

    // Check if driver has active deliveries
    const Delivery = require('../models/Delivery');
    const activeDeliveries = await Delivery.find({
      driver: driver._id,
      status: { $in: ['assigned', 'picked-up', 'in-transit'] }
    });

    if (activeDeliveries.length > 0) {
      return res.status(400).json({ 
        message: `Cannot delete driver. They have ${activeDeliveries.length} active delivery/ies. Please reassign deliveries first.` 
      });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id/availability
// @desc    Update driver availability
// @access  Private (Driver only)
router.put(
  '/:id/availability',
  auth,
  authorize('driver'),
  [body('isAvailable').isBoolean().withMessage('isAvailable must be a boolean')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      if (req.params.id !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.driverInfo.isAvailable = req.body.isAvailable;
      await user.save();

      res.json(user);
    } catch (error) {
      console.error('Update availability error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/users/:id
// @desc    Update user profile
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.params.id !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update basic fields
    if (req.body.name) user.name = req.body.name;
    if (req.body.phone) user.phone = req.body.phone;
    if (req.body.address) user.address = req.body.address;
    
    // Update password if provided
    if (req.body.password) {
      user.password = req.body.password; // Will be hashed by pre-save hook
    }

    // Update driverInfo if provided (for drivers)
    if (req.body.driverInfo && user.role === 'driver') {
      if (user.driverInfo) {
        // Merge with existing driverInfo
        user.driverInfo = {
          ...user.driverInfo.toObject(),
          ...req.body.driverInfo
        };
      } else {
        user.driverInfo = req.body.driverInfo;
      }
    }

    await user.save();
    
    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

