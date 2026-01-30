# Manual Testing Guide - Pharmacy Delivery App

## Quick Start

1. **Backend**: http://localhost:5000
2. **Frontend**: http://localhost:3000

## Test Accounts

- **Customer**: `customer@test.com` / `password123`
- **Admin**: `admin@test.com` / `admin123`
- **Driver**: `driver@test.com` / `driver123`

---

## Testing Scenarios

### 1. Customer Testing

#### Login as Customer
1. Go to http://localhost:3000
2. Click "Login"
3. Use: `customer@test.com` / `password123`
4. Verify you see: Cart, My Orders links

#### Browse Products
1. Navigate to `/products` (Products link removed from navbar for cleaner UI)
2. Verify 10 products are displayed
3. Try searching for a product
4. Try filtering by category
5. Click on a product to see details

#### Add to Cart & Checkout
1. Add multiple products to cart
2. Go to Cart page
3. Verify items, quantities, and totals
4. Update quantities
5. Click "Proceed to Checkout"
6. Enter delivery address
7. Place order
8. Verify redirect to order details

#### View Orders
1. Click "My Orders" in navbar
2. Verify your orders are listed
3. Click on an order to see details
4. Verify order information is correct

---

### 2. Driver Testing (FOCUS AREA)

#### Login as Driver
1. Logout if logged in
2. Login with: `driver@test.com` / `driver123`
3. Verify Driver Dashboard loads

#### Driver Dashboard Features
1. **Availability Toggle**
   - Toggle between "Available" and "Unavailable"
   - Verify status updates

2. **View Deliveries**
   - Check if any deliveries are assigned
   - If none, ask admin to assign one

3. **Update Location**
   - Click "Update Location" button
   - Allow location access when prompted
   - Verify location updates successfully

4. **Label Capture (KEY FEATURE)**
   - Mark a delivery as "Picked Up" first
   - Click "📦 Capture Label" button
   - Test both methods:
     - **Manual Entry**: 
       - Select "Manual Entry" tab
       - Fill in tracking number (required)
       - Select carrier (required)
       - Optionally add weight, dimensions, special instructions
       - Click "Save Label Info"
     - **Photo Capture**: 
       - Select "Take Photo" tab
       - Click "Open Camera" or "Choose from Gallery"
       - Allow camera/gallery access when prompted
       - Capture or select a photo
       - Fill in label information (tracking, carrier, etc.)
       - Click "Save Label Info"
   - Verify label information appears in delivery card
   - Click "✏️ Edit Label" to update if needed

5. **Delivery Workflow**
   - Mark as "Picked Up"
   - Capture label information
   - Click "Start Delivery"
   - Update location while in transit
   - Mark as "Delivered"

---

### 3. Admin/Pharmacy Testing (FOCUS AREA)

#### Login as Admin
1. Logout if logged in
2. Login with: `admin@test.com` / `admin123`
3. Verify Admin Dashboard loads

#### Orders Management
1. Click "Orders" tab
2. View all orders
3. Assign a driver to an order:
   - Select driver from dropdown
   - Verify driver is assigned
4. Update order status
5. Verify status changes

#### Driver Management (NEW FEATURE)
1. Click "Drivers" tab
2. View all drivers listed

3. **Add New Driver (User Creation)**
   - Click "+ Add Driver" button
   - Fill in form:
     - **Personal Info**: Name, Email, Password, Phone
     - **Vehicle Info**: Vehicle Type, Vehicle Number, License Number (all required)
     - **Address**: Street, City, State, Zip Code (optional)
   - Click "Create Driver"
   - Verify new driver appears in list
   - **Note:** This is how all users are created - admins manage user creation

4. **View Driver Locations**
   - Check if drivers have location data
   - If driver is on active delivery, location should show
   - Click "View on Map" to open Google Maps
   - Verify coordinates are correct

5. **Toggle Driver Availability**
   - Click "Set Available" or "Set Unavailable"
   - Verify status badge updates

6. **Delete Driver**
   - Click "Delete" on a driver
   - Confirm deletion
   - Verify driver is removed
   - Try deleting driver with active deliveries (should fail)

7. **Refresh Locations**
   - Click "🔄 Refresh" button
   - Verify locations update
   - Auto-refresh happens every 30 seconds

#### Products Management
1. Click "Products" tab
2. View all products
3. (Note: Product creation UI can be added later)

---

### 4. End-to-End Flow Testing

#### Complete Delivery Flow
1. **As Customer**:
   - Place an order
   - Note the order ID

2. **As Admin**:
   - Go to Orders tab
   - Find the new order
   - Assign a driver to it
   - Verify order status changes to "assigned"

3. **As Driver**:
   - Go to Driver Dashboard
   - Verify new delivery appears
   - Mark as "Picked Up"
   - Capture label information (test both manual and photo)
   - Click "Start Delivery"
   - Update location a few times
   - Mark as "Delivered"

4. **As Customer**:
   - Go to "My Orders"
   - View the order details
   - Verify label information is visible
   - Verify order status is "delivered"

5. **As Admin**:
   - Check order status
   - View driver location during delivery
   - Verify all information is correct

---

## Testing Checklist

### Driver Features
- [ ] Login as driver
- [ ] Toggle availability
- [ ] View assigned deliveries
- [ ] Update location
- [ ] Capture label (manual entry)
- [ ] Capture label (photo)
- [ ] Edit label information
- [ ] Complete delivery workflow

### Admin Features
- [ ] Login as admin
- [ ] View all orders
- [ ] Assign drivers to orders
- [ ] View all drivers
- [ ] Add new driver
- [ ] View driver locations
- [ ] Toggle driver availability
- [ ] Delete driver
- [ ] Refresh driver locations
- [ ] View driver on map

### Customer Features
- [ ] Login as customer (no public registration)
- [ ] Browse products (via direct URL `/products`)
- [ ] Add to cart
- [ ] Checkout
- [ ] View orders
- [ ] View order details with label info

---

## Important Notes

1. **No Public Registration**: Users can only be created by admins through the Admin Dashboard
2. **Camera Access**: May need to allow camera permissions in browser for label photo capture
3. **Location Access**: May need to allow location permissions for driver location updates
4. **Image Upload**: Label images are stored in `server/uploads/labels/` directory
5. **Real-time Updates**: Socket.io connections should work automatically
6. **MongoDB Atlas**: App uses MongoDB Atlas by default (configured in `.env`)

## Known Issues to Watch For

1. **Camera Access**: May need to allow camera permissions in browser
2. **Location Access**: May need to allow location permissions
3. **Image Upload**: Check browser console for any upload errors
4. **Real-time Updates**: Socket.io connections should work automatically
5. **Driver Deletion**: Cannot delete drivers with active deliveries (safety feature)

---

## Tips

- Use multiple browser tabs/windows to test different user roles simultaneously
- Check browser console (F12) for any errors
- Test on mobile device for better camera/location testing
- Verify MongoDB Atlas connection is working

---

## Need Help?

If something doesn't work:
1. Check browser console for errors
2. Check server terminal for errors
3. Verify MongoDB connection
4. Make sure all dependencies are installed

