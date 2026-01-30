# Admin Dashboard Guide

## Overview

The Admin Dashboard provides full control over the cashback app, allowing you to manage merchants, offers, users, and view analytics.

## Access

1. Navigate to: `http://localhost:3000/admin/login`
2. **Default Admin Credentials:**
   - Email: `admin@cashback.com`
   - Password: `admin123`

⚠️ **Important:** Change the default password in production!

## Features

### 1. Dashboard Overview
- View key statistics (users, merchants, offers, transactions)
- See total earnings and cashback metrics
- View recent transactions
- Quick overview of app health

### 2. Merchants Management
**Location:** `/admin/merchants`

**Features:**
- View all merchants in a table
- Add new merchants
- Edit existing merchants
- Delete merchants (only if they have no active offers)
- See offer count per merchant

**Fields:**
- Name (required)
- Description
- Logo URL
- Website URL
- Category

### 3. Offers Management
**Location:** `/admin/offers`

**Features:**
- View all offers with merchant information
- Add new offers
- Edit existing offers
- Delete offers
- Toggle offer active/inactive status
- See cashback rates

**Fields:**
- Merchant (required) - Select from existing merchants
- Title (required)
- Description
- Cashback Rate % (required)
- Affiliate Link (required)
- Terms & Conditions
- Active Status (checkbox)

### 4. Users Management
**Location:** `/admin/users`

**Features:**
- View all users
- See user earnings and transaction counts
- Identify admin users
- Delete users (cannot delete admin users)
- View user join dates

**Information Displayed:**
- Name
- Email
- Total Earnings
- Transaction Count
- Role (Admin/User)
- Join Date

## API Endpoints

All admin endpoints require authentication and are prefixed with `/api/admin/`:

### Authentication
- `POST /api/admin/auth/login` - Admin login

### Dashboard
- `GET /api/admin/dashboard/stats` - Get dashboard statistics
- `GET /api/admin/dashboard/recent-transactions` - Get recent transactions

### Merchants
- `GET /api/admin/merchants` - Get all merchants
- `GET /api/admin/merchants/:id` - Get merchant by ID
- `POST /api/admin/merchants` - Create merchant
- `PUT /api/admin/merchants/:id` - Update merchant
- `DELETE /api/admin/merchants/:id` - Delete merchant

### Offers
- `GET /api/admin/offers` - Get all offers
- `GET /api/admin/offers/:id` - Get offer by ID
- `POST /api/admin/offers` - Create offer
- `PUT /api/admin/offers/:id` - Update offer
- `DELETE /api/admin/offers/:id` - Delete offer

### Users
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user by ID
- `GET /api/admin/users/:id/transactions` - Get user transactions
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

## Security

- Admin routes are protected by JWT authentication
- Only users with `is_admin = 1` can access admin endpoints
- Admin tokens are stored separately from regular user tokens
- Admin users cannot be deleted through the UI

## Database Changes

The database schema was updated to include:
- `is_admin` field in the `users` table (BOOLEAN, default 0)
- Default admin user is automatically created on first run

## Next Steps

1. **Change Default Password:** Update the admin password immediately
2. **Add More Admins:** Create additional admin users through the database or add UI for this
3. **Add Permissions:** Implement role-based permissions for different admin levels
4. **Add Audit Logging:** Track admin actions for security
5. **Add Bulk Operations:** Import merchants/offers via CSV

## Troubleshooting

### Can't Login
- Verify the admin user exists in the database
- Check that `is_admin = 1` for your user
- Ensure the backend server is running
- Check browser console for errors

### Can't Delete Merchant
- Merchants with active offers cannot be deleted
- Delete all offers first, then delete the merchant

### Can't Delete User
- Admin users cannot be deleted
- Regular users can be deleted, but their transactions will also be removed
