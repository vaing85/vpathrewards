# Setup Instructions

## Prerequisites

1. **Node.js** (v14 or higher)
2. **MongoDB** (running locally or MongoDB Atlas connection string)
3. **npm** or **yarn**

## Installation Steps

### 1. Install Dependencies

From the root directory, run:

```bash
npm run install-all
```

This will install dependencies for:
- Root package (concurrently, nodemon)
- Server (Express, MongoDB, etc.)
- Client (React, React Router, etc.)

### 2. Configure Environment Variables

Navigate to the `server` directory and create a `.env` file:

```bash
cd server
copy .env.example .env
```

Edit the `.env` file with your configuration:

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pharmacy-delivery
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CLIENT_URL=http://localhost:3000
```

**Note:** The app is configured to use MongoDB Atlas by default. Replace the connection string with your Atlas credentials.

**Important:** Change the `JWT_SECRET` to a secure random string in production!

### 3. Start MongoDB

Make sure MongoDB is running on your system:

**Windows:**
```bash
# If MongoDB is installed as a service, it should start automatically
# Or start it manually:
mongod
```

**macOS/Linux:**
```bash
sudo systemctl start mongod
# or
mongod
```

**Or use MongoDB Atlas:**
- Create a free account at https://www.mongodb.com/cloud/atlas
- Create a cluster and get your connection string
- Update `MONGODB_URI` in `.env`

### 4. Run the Application

**Development Mode (runs both server and client):**
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend React app on http://localhost:3000

**Or run separately:**

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
npm run client
```

## Creating Test Users

**Important:** Public user registration has been disabled. Only admins can create users through the Admin Dashboard.

### Option 1: Use Seed Script (Recommended)

Run the seed script to create test users automatically:

```bash
cd server
node scripts/seed.js
```

This creates:
- Customer: `customer@test.com` / `password123`
- Admin: `admin@test.com` / `admin123`
- Driver: `driver@test.com` / `driver123`

### Option 2: Create Admin via MongoDB

If you need to create an admin user manually:

```javascript
// In MongoDB shell or MongoDB Compass
use pharmacy-delivery
db.users.insertOne({
  name: "Admin User",
  email: "admin@test.com",
  password: "$2a$10$...", // Hashed password (use bcrypt)
  phone: "555-0101",
  role: "admin"
})
```

Then login as admin and create other users through the Admin Dashboard.

### Creating Users via Admin Dashboard

1. Login as admin
2. Go to Admin Dashboard → Drivers tab
3. Click "+ Add Driver"
4. Fill in driver information (name, email, password, vehicle details)
5. Click "Create Driver"

**Note:** Currently, the admin dashboard supports creating drivers. Customer creation can be added similarly if needed.

## Testing the Application

1. **As Customer:**
   - Login (registration is admin-only)
   - Browse products
   - Add items to cart
   - Place an order
   - Track order status
   - View label information in order details

2. **As Admin/Pharmacy:**
   - Login with admin account
   - View all orders
   - **Add/delete drivers** (Drivers tab)
   - **View driver locations** (real-time)
   - **Toggle driver availability**
   - Assign drivers to orders
   - Manage products
   - Update order status

3. **As Driver:**
   - Login with driver account
   - Set availability to "Online"
   - View assigned deliveries
   - **Capture label information** (manual or photo)
   - Update delivery status
   - Share location updates

## API Testing

You can test the API using tools like Postman or curl:

```bash
# Login (registration is admin-only)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# Get products (public endpoint, no token needed)
curl http://localhost:5000/api/products

# Get products (with token for admin operations)
curl http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Create driver (admin only)
curl -X POST http://localhost:5000/api/users/drivers \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Driver","email":"newdriver@test.com","password":"password123","phone":"555-0101","vehicleType":"Motorcycle","vehicleNumber":"XYZ-789","licenseNumber":"DL-99999"}'
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check the connection string in `.env`
- Verify network/firewall settings

### Port Already in Use
- Change `PORT` in `.env` for backend
- Change port in `client/package.json` scripts for frontend

### CORS Errors
- Ensure `CLIENT_URL` in `.env` matches your frontend URL
- Check that both server and client are running

### Module Not Found
- Run `npm install` in the specific directory (server or client)
- Delete `node_modules` and reinstall if needed

## Production Deployment

1. Set environment variables in your hosting platform
2. Build the React app: `cd client && npm run build`
3. Serve the built files from `client/build`
4. Use a process manager like PM2 for the Node.js server
5. Use a reverse proxy like Nginx
6. Enable HTTPS
7. Use a production MongoDB instance (MongoDB Atlas recommended)

