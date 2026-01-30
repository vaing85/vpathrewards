const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  category: {
    type: String,
    enum: ['prescription', 'over-the-counter', 'vitamins', 'personal-care', 'medical-devices', 'other'],
    default: 'other'
  },
  image: {
    type: String,
    default: ''
  },
  requiresPrescription: {
    type: Boolean,
    default: false
  },
  manufacturer: String,
  expiryDate: Date,
  sku: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Index for search
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);

