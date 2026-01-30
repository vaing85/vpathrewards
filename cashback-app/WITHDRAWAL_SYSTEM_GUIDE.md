# Withdrawal System Guide

## Overview

The withdrawal system allows users to request payouts of their earned cashback and enables admins to manage and process these requests.

## Features Implemented

### User Features
1. **Balance Overview**
   - Total earnings
   - Pending withdrawals
   - Available balance (earnings minus pending)
   - Minimum withdrawal threshold ($10)

2. **Withdrawal Request**
   - Request form with amount validation
   - Payment method selection (PayPal, Bank Transfer, Venmo, Zelle, Other)
   - Payment details input (email, account info, etc.)
   - Real-time balance checking

3. **Withdrawal History**
   - View all past withdrawal requests
   - Status tracking (pending, approved, processing, completed, rejected)
   - Payment details and admin notes
   - Processing dates and admin information

### Admin Features
1. **Withdrawal Management Dashboard**
   - Statistics overview (total, pending, approved, processing, completed, rejected)
   - Filter by status
   - View all withdrawal requests

2. **Process Withdrawals**
   - Update withdrawal status
   - Add admin notes
   - Track who processed each withdrawal
   - Automatic balance deduction when completed

3. **Status Workflow**
   - **Pending**: Initial request
   - **Approved**: Admin approved, ready for processing
   - **Processing**: Payment being processed
   - **Completed**: Payment sent, balance deducted
   - **Rejected**: Request denied

## Database Schema

### Withdrawals Table
- `id`: Primary key
- `user_id`: Foreign key to users
- `amount`: Withdrawal amount
- `payment_method`: PayPal, bank_transfer, venmo, zelle, other
- `payment_details`: User's payment information
- `status`: pending, approved, processing, completed, rejected
- `admin_notes`: Admin comments
- `processed_by`: Admin user ID who processed it
- `requested_at`: When user requested
- `processed_at`: When admin processed it

## API Endpoints

### User Endpoints (Protected)
- `GET /api/withdrawals/balance/available` - Get available balance
- `GET /api/withdrawals/history` - Get withdrawal history
- `GET /api/withdrawals/:id` - Get specific withdrawal
- `POST /api/withdrawals/request` - Create withdrawal request

### Admin Endpoints (Protected)
- `GET /api/admin/withdrawals` - Get all withdrawals (with optional status filter)
- `GET /api/admin/withdrawals/:id` - Get specific withdrawal
- `PUT /api/admin/withdrawals/:id/status` - Update withdrawal status
- `GET /api/admin/withdrawals/stats/summary` - Get withdrawal statistics

## User Flow

1. **User checks balance**
   - Navigate to `/withdrawals` or click "Withdraw Earnings" on dashboard
   - See total earnings, pending withdrawals, and available balance

2. **User requests withdrawal**
   - Click "Request Withdrawal" button
   - Enter amount (minimum $10)
   - Select payment method
   - Enter payment details (PayPal email, bank account, etc.)
   - Submit request

3. **Request is pending**
   - Request appears in user's withdrawal history with "Pending" status
   - Available balance is reduced by requested amount
   - Admin receives notification (via admin panel)

4. **Admin processes request**
   - Admin views withdrawal in admin panel
   - Updates status (approve → processing → completed)
   - Adds notes if needed
   - When marked "completed", user's total earnings are deducted

5. **User sees completion**
   - Status updates to "Completed" in user's history
   - Admin notes visible if provided

## Admin Flow

1. **View withdrawals**
   - Navigate to `/admin/withdrawals`
   - See statistics and all withdrawal requests
   - Filter by status if needed

2. **Process withdrawal**
   - Click "Manage" on a withdrawal
   - Review user and payment details
   - Update status through workflow:
     - Pending → Approved → Processing → Completed
   - Add admin notes
   - Save changes

3. **Balance management**
   - When status changes to "completed", user's total_earnings is automatically deducted
   - System prevents over-withdrawal by checking available balance

## Security Features

- **Balance Validation**: Users cannot withdraw more than available balance
- **Minimum Threshold**: $10 minimum withdrawal amount
- **Pending Protection**: Pending withdrawals reduce available balance
- **Admin Only**: Only admins can process withdrawals
- **Audit Trail**: Tracks who processed each withdrawal and when

## Payment Methods Supported

1. **PayPal**: Email address required
2. **Bank Transfer**: Account details required
3. **Venmo**: Username required
4. **Zelle**: Email or phone required
5. **Other**: Custom payment details

## Future Enhancements

Potential improvements:
- Integration with Stripe/PayPal APIs for automatic processing
- Email notifications for status changes
- Bulk processing for admins
- Withdrawal limits per time period
- Payment method verification
- Automated fraud detection
- Export withdrawal reports
- Payment receipts

## Testing

To test the withdrawal system:

1. **As a user:**
   - Earn some cashback (use the track endpoint or admin panel)
   - Navigate to `/withdrawals`
   - Request a withdrawal
   - Check withdrawal history

2. **As an admin:**
   - Login to admin panel
   - Go to Withdrawals section
   - View pending requests
   - Process a withdrawal through the status workflow

## Notes

- The system uses a minimum withdrawal of $10 (configurable in backend)
- When a withdrawal is completed, the user's `total_earnings` is reduced
- Pending withdrawals are subtracted from available balance to prevent double-withdrawal
- Admin notes are visible to users for transparency
