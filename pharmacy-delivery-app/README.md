# Pharmacy Delivery App

A comprehensive last-mile delivery application for pharmacies, built with Node.js, Express, MongoDB, and React.

## Features

- **Customer Features:**
  - Browse pharmacy products
  - Add items to cart
  - Place orders with delivery address
  - Track orders in real-time
  - View order history and label information

- **Admin/Pharmacy Features:**
  - Manage product catalog
  - View and manage all orders
  - **Add and delete drivers** (full driver management)
  - **View driver locations in real-time**
  - **Toggle driver availability**
  - Assign drivers to orders
  - Monitor delivery status
  - Manage inventory

- **Driver Features (FOCUS):**
  - View assigned deliveries
  - **Capture label information** (manual entry or photo)
  - **Upload label images**
  - Update delivery status
  - Share real-time location
  - Mark deliveries as complete

## Tech Stack

### Backend
- Node.js & Express.js
- MongoDB with Mongoose
- JWT Authentication
- Socket.io for real-time updates
- bcryptjs for password hashing

### Frontend
- React.js
- React Router
- Axios for API calls
- Socket.io-client for real-time updates

## Installation

1. **Install dependencies**
```bash
npm run install-all
```

2. **Set up environment variables**
```bash
cd server
cp .env.example .env
# Edit .env with your configuration
```

3. **Start MongoDB**
Make sure MongoDB is running on your system.

4. **Run the application**
```bash
# Development mode (runs both server and client)
npm run dev

# Or run separately:
npm run server  # Backend on port 5000
npm run client  # Frontend on port 3000
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- **Note:** User registration is admin-only. Admins create users through the dashboard.

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get orders (filtered by role)
- `GET /api/orders/:id` - Get single order
- `PUT /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id/assign-driver` - Assign driver (Admin only)

### Deliveries
- `GET /api/deliveries` - Get deliveries
- `GET /api/deliveries/:id` - Get single delivery
- `PUT /api/deliveries/:id/location` - Update driver location
- `PUT /api/deliveries/:id/status` - Update delivery status
- `POST /api/deliveries/:id/label-image` - Upload label image (Driver only)
- `PUT /api/deliveries/:id/label-info` - Update label information (Driver only)

### Users
- `GET /api/users/drivers` - Get all drivers (Admin only, with `availableOnly` query param)
- `GET /api/users/drivers/:id/location` - Get driver's current location (Admin only)
- `POST /api/users/drivers` - Create new driver (Admin only)
- `DELETE /api/users/drivers/:id` - Delete driver (Admin only)
- `PUT /api/users/:id/availability` - Update driver availability
- `PUT /api/users/:id` - Update user profile

## User Roles

1. **Customer** - Can browse products, place orders, and track deliveries
2. **Admin/Pharmacy** - Full access to manage products, orders, drivers, and view driver locations
3. **Driver** - Can view assigned deliveries, capture label information, update delivery status, and share location

## Database Models

- **User** - Stores customer, admin, and driver information (with driver vehicle details)
- **Product** - Pharmacy products with inventory management
- **Order** - Customer orders with items and delivery information
- **Delivery** - Delivery tracking with location updates and label information

## Real-time Features

The app uses Socket.io for real-time updates:
- Order status changes
- Driver location tracking
- Delivery updates
- Label information updates

## Security

- JWT-based authentication
- Password hashing with bcryptjs
- Role-based access control
- Input validation with express-validator

## License

MIT

