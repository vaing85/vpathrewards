const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy-delivery';

// Sample products
const sampleProducts = [
  {
    name: 'Aspirin 100mg',
    description: 'Pain reliever and fever reducer. Take with food to reduce stomach upset.',
    price: 5.99,
    stock: 100,
    category: 'over-the-counter',
    requiresPrescription: false,
    manufacturer: 'Bayer',
    sku: 'ASP-100-001'
  },
  {
    name: 'Ibuprofen 200mg',
    description: 'Non-steroidal anti-inflammatory drug for pain and inflammation.',
    price: 7.49,
    stock: 150,
    category: 'over-the-counter',
    requiresPrescription: false,
    manufacturer: 'Advil',
    sku: 'IBU-200-001'
  },
  {
    name: 'Paracetamol 500mg',
    description: 'Effective pain reliever and fever reducer. Safe for most adults.',
    price: 4.99,
    stock: 200,
    category: 'over-the-counter',
    requiresPrescription: false,
    manufacturer: 'Tylenol',
    sku: 'PAR-500-001'
  },
  {
    name: 'Vitamin D3 1000IU',
    description: 'Supports bone health and immune function. Take with a meal for better absorption.',
    price: 12.99,
    stock: 80,
    category: 'vitamins',
    requiresPrescription: false,
    manufacturer: 'Nature Made',
    sku: 'VIT-D3-001'
  },
  {
    name: 'Multivitamin Daily',
    description: 'Complete daily multivitamin with essential vitamins and minerals.',
    price: 15.99,
    stock: 60,
    category: 'vitamins',
    requiresPrescription: false,
    manufacturer: 'Centrum',
    sku: 'VIT-MULTI-001'
  },
  {
    name: 'Amoxicillin 500mg',
    description: 'Antibiotic for bacterial infections. Prescription required.',
    price: 25.99,
    stock: 50,
    category: 'prescription',
    requiresPrescription: true,
    manufacturer: 'Generic',
    sku: 'AMX-500-001'
  },
  {
    name: 'Blood Pressure Monitor',
    description: 'Digital automatic blood pressure monitor with large display.',
    price: 45.99,
    stock: 30,
    category: 'medical-devices',
    requiresPrescription: false,
    manufacturer: 'Omron',
    sku: 'DEV-BP-001'
  },
  {
    name: 'Thermometer Digital',
    description: 'Fast and accurate digital thermometer. Waterproof design.',
    price: 12.99,
    stock: 40,
    category: 'medical-devices',
    requiresPrescription: false,
    manufacturer: 'Vicks',
    sku: 'DEV-THERM-001'
  },
  {
    name: 'Hand Sanitizer 500ml',
    description: 'Alcohol-based hand sanitizer. Kills 99.9% of germs.',
    price: 8.99,
    stock: 100,
    category: 'personal-care',
    requiresPrescription: false,
    manufacturer: 'Purell',
    sku: 'PC-SANIT-001'
  },
  {
    name: 'Bandages Assorted',
    description: 'Assorted sizes of adhesive bandages for wound care.',
    price: 6.99,
    stock: 75,
    category: 'personal-care',
    requiresPrescription: false,
    manufacturer: 'Band-Aid',
    sku: 'PC-BAND-001'
  }
];

// Sample users
const sampleUsers = [
  {
    name: 'John Customer',
    email: 'customer@test.com',
    password: 'password123',
    phone: '555-0101',
    role: 'customer',
    address: {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    }
  },
  {
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'admin123',
    phone: '555-0202',
    role: 'admin',
    address: {
      street: '456 Admin Avenue',
      city: 'New York',
      state: 'NY',
      zipCode: '10002',
      country: 'USA'
    }
  },
  {
    name: 'Driver Smith',
    email: 'driver@test.com',
    password: 'driver123',
    phone: '555-0303',
    role: 'driver',
    driverInfo: {
      isAvailable: true,
      vehicleType: 'Motorcycle',
      vehicleNumber: 'ABC-123',
      licenseNumber: 'DL-12345'
    },
    address: {
      street: '789 Driver Road',
      city: 'New York',
      state: 'NY',
      zipCode: '10003',
      country: 'USA'
    }
  }
];

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to MongoDB Atlas');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('\nClearing existing data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    console.log('✓ Cleared existing data');

    // Create products
    console.log('\nCreating products...');
    const createdProducts = await Product.insertMany(sampleProducts);
    console.log(`✓ Created ${createdProducts.length} products`);

    // Create users
    console.log('\nCreating users...');
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`  ✓ Created ${user.role}: ${user.email}`);
    }
    console.log(`✓ Created ${createdUsers.length} users`);

    // Create a sample order (optional)
    const customer = createdUsers.find(u => u.role === 'customer');
    if (customer && createdProducts.length >= 2) {
      console.log('\nCreating sample order...');
      const order = new Order({
        customer: customer._id,
        items: [
          {
            product: createdProducts[0]._id,
            quantity: 2,
            price: createdProducts[0].price
          },
          {
            product: createdProducts[1]._id,
            quantity: 1,
            price: createdProducts[1].price
          }
        ],
        deliveryAddress: {
          street: customer.address.street,
          city: customer.address.city,
          state: customer.address.state,
          zipCode: customer.address.zipCode,
          country: customer.address.country || 'USA'
        },
        status: 'pending',
        subtotal: (createdProducts[0].price * 2) + createdProducts[1].price,
        deliveryFee: 5.00,
        tax: ((createdProducts[0].price * 2) + createdProducts[1].price) * 0.08,
        total: ((createdProducts[0].price * 2) + createdProducts[1].price) + 5.00 + (((createdProducts[0].price * 2) + createdProducts[1].price) * 0.08)
      });
      await order.save();
      console.log(`✓ Created sample order: ${order._id}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✓ Database seeding completed successfully!');
    console.log('='.repeat(50));
    console.log('\nTest Accounts:');
    console.log('  Customer: customer@test.com / password123');
    console.log('  Admin:    admin@test.com / admin123');
    console.log('  Driver:   driver@test.com / driver123');
    console.log('\nProducts: ' + createdProducts.length);
    console.log('Users: ' + createdUsers.length);
    console.log('\nYou can now test the application!');

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the seed function
seedDatabase();

