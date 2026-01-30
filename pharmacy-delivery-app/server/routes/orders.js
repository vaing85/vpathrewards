const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Delivery = require('../models/Delivery');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post(
  '/',
  auth,
  [
    body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
    body('items.*.product').notEmpty().withMessage('Product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('deliveryAddress.street').notEmpty().withMessage('Street address is required'),
    body('deliveryAddress.city').notEmpty().withMessage('City is required'),
    body('deliveryAddress.state').notEmpty().withMessage('State is required'),
    body('deliveryAddress.zipCode').notEmpty().withMessage('Zip code is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { items, deliveryAddress, prescriptionFiles, notes } = req.body;

      // Validate products and calculate totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(400).json({ message: `Product ${item.product} not found` });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({ 
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
          });
        }

        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          product: product._id,
          quantity: item.quantity,
          price: product.price
        });

        // Update product stock
        product.stock -= item.quantity;
        await product.save();
      }

      const deliveryFee = 5.00;
      const tax = subtotal * 0.08;
      const total = subtotal + deliveryFee + tax;

      // Create order
      const order = new Order({
        customer: req.user._id,
        items: orderItems,
        deliveryAddress,
        subtotal,
        deliveryFee,
        tax,
        total,
        prescriptionFiles,
        notes
      });

      await order.save();
      await order.populate('items.product', 'name price image');

      // Emit order created event
      const io = req.app.get('io');
      io.emit('order-created', order);

      res.status(201).json(order);
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/orders
// @desc    Get orders (filtered by role)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'customer') {
      query.customer = req.user._id;
    } else if (req.user.role === 'driver') {
      query.driver = req.user._id;
    }
    // Admin can see all orders

    const orders = await Order.find(query)
      .populate('customer', 'name email phone')
      .populate('driver', 'name phone')
      .populate('items.product', 'name price image')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone address')
      .populate('driver', 'name phone driverInfo')
      .populate('items.product', 'name price image description')
      .populate('delivery');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check access permissions
    if (req.user.role === 'customer' && order.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'driver' && order.driver && order.driver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Admin or Driver)
router.put(
  '/:id/status',
  auth,
  authorize('admin', 'driver'),
  [body('status').isIn(['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'out-for-delivery', 'delivered', 'cancelled'])],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      order.status = req.body.status;
      await order.save();

      await order.populate('customer', 'name email');
      await order.populate('driver', 'name phone');

      // Emit status update
      const io = req.app.get('io');
      io.to(`order-${order._id}`).emit('order-status-updated', order);
      io.emit('order-updated', order);

      res.json(order);
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/orders/:id/assign-driver
// @desc    Assign driver to order
// @access  Private (Admin only)
router.put(
  '/:id/assign-driver',
  auth,
  authorize('admin'),
  [body('driverId').notEmpty().withMessage('Driver ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      order.driver = req.body.driverId;
      order.status = 'assigned';

      // Create delivery record
      const delivery = new Delivery({
        order: order._id,
        driver: req.body.driverId,
        status: 'assigned'
      });
      await delivery.save();

      order.delivery = delivery._id;
      await order.save();

      await order.populate('customer', 'name email');
      await order.populate('driver', 'name phone');
      await order.populate('delivery');

      // Emit assignment event
      const io = req.app.get('io');
      io.to(`order-${order._id}`).emit('driver-assigned', order);
      io.emit('order-updated', order);

      res.json(order);
    } catch (error) {
      console.error('Assign driver error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;

