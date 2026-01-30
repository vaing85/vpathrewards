const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false,
    unique: false,
    sparse: true // Allows multiple null values
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['assigned', 'picked-up', 'in-transit', 'delivered', 'failed'],
    default: 'assigned'
  },
  // Delivery address (for driver-created routes without orders)
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'USA' }
  },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    timestamp: Date
  },
  estimatedArrival: Date,
  actualDeliveryTime: Date,
  deliveryNotes: String,
  recipientName: String,
  recipientPhone: String,
  signature: String,
  labelInfo: {
    labelImage: String, // URL to uploaded label image
    trackingNumber: String,
    carrier: String, // e.g., "UPS", "FedEx", "USPS", "DHL"
    packageWeight: String,
    packageDimensions: String,
    specialInstructions: String,
    capturedAt: Date,
    captureMethod: {
      type: String,
      enum: ['manual', 'photo'],
      default: 'manual'
    }
  }
}, {
  timestamps: true
});

// Index for driver queries
deliverySchema.index({ driver: 1, status: 1 });
deliverySchema.index({ order: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);

