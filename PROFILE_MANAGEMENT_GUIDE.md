# User Profile Management Guide

## Overview

The User Profile Management system allows users to manage their account settings, update their information, change passwords, and control notification preferences.

## Features Implemented

### 1. Profile Information
- **Edit Name**: Update display name
- **Edit Email**: Change email address (with validation)
- **View Account Info**: See member since date and total earnings
- **Real-time Updates**: Changes reflect immediately in navbar and throughout app

### 2. Password Management
- **Change Password**: Secure password update
- **Current Password Verification**: Must enter current password
- **Password Validation**: Minimum 6 characters required
- **Password Confirmation**: Must confirm new password

### 3. Notification Preferences
- **Email Notifications**: Toggle general email notifications
- **Cashback Notifications**: Get notified when cashback is confirmed
- **Withdrawal Notifications**: Get notified about withdrawal status updates
- **Toggle Switches**: Easy on/off controls
- **Auto-save**: Preferences save automatically when toggled

### 4. Referral Code Integration
- **Referral Code Display**: Shows user's unique referral code
- **Referral Link**: Shareable link for referrals
- **Copy Functionality**: Easy copy-to-clipboard

## Database Schema Updates

### Users Table (New Fields)
- `notification_email`: INTEGER (0 or 1) - General email notifications
- `notification_cashback`: INTEGER (0 or 1) - Cashback confirmations
- `notification_withdrawal`: INTEGER (0 or 1) - Withdrawal updates

All notification fields default to 1 (enabled).

## API Endpoints

### Profile Endpoints (Protected)
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile (name, email)
- `PUT /api/profile/password` - Change password
- `PUT /api/profile/notifications` - Update notification preferences

### Request/Response Examples

**Get Profile:**
```json
GET /api/profile
Response: {
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "total_earnings": 150.50,
  "created_at": "2024-01-01T00:00:00.000Z",
  "notification_email": 1,
  "notification_cashback": 1,
  "notification_withdrawal": 1
}
```

**Update Profile:**
```json
PUT /api/profile
Body: {
  "name": "John Smith",
  "email": "newemail@example.com"
}
```

**Change Password:**
```json
PUT /api/profile/password
Body: {
  "current_password": "oldpass123",
  "new_password": "newpass123"
}
```

**Update Notifications:**
```json
PUT /api/profile/notifications
Body: {
  "notification_email": true,
  "notification_cashback": false,
  "notification_withdrawal": true
}
```

## User Interface

### Profile Page (`/profile`)
- **Tabbed Interface**: Three tabs for different settings
  - Profile: Edit name and email
  - Password: Change password
  - Notifications: Manage notification preferences
- **Success/Error Messages**: Clear feedback for all actions
- **Form Validation**: Client and server-side validation
- **Referral Code Section**: Integrated referral code display

### Navigation
- **Profile Link**: Added to navbar for easy access
- **Protected Route**: Requires authentication
- **Auto-redirect**: Redirects to login if not authenticated

## Security Features

- **Password Verification**: Current password required to change password
- **Email Uniqueness**: Prevents duplicate emails
- **Password Hashing**: All passwords stored as bcrypt hashes
- **Authentication Required**: All endpoints protected
- **Input Validation**: Server-side validation for all inputs

## User Flow

1. **Access Profile**
   - Click "Profile" in navbar
   - Or navigate to `/profile`

2. **Edit Profile**
   - Go to "Profile" tab
   - Update name and/or email
   - Click "Save Changes"
   - See success message
   - Changes reflect in navbar immediately

3. **Change Password**
   - Go to "Password" tab
   - Enter current password
   - Enter new password (min 6 chars)
   - Confirm new password
   - Click "Change Password"
   - See success message

4. **Manage Notifications**
   - Go to "Notifications" tab
   - Toggle switches for each notification type
   - Preferences save automatically
   - See success message

5. **View Referral Code**
   - Scroll to bottom of profile page
   - See referral code and link
   - Copy code or link to share

## Integration with Auth Context

The profile system integrates with the authentication context:
- Profile updates automatically update the user object in context
- Navbar reflects changes immediately
- No need to re-login after profile changes

## Future Enhancements

Potential improvements:
- **Profile Picture Upload**: Add avatar/profile photo
- **Two-Factor Authentication**: Enhanced security
- **Account Deletion**: Allow users to delete accounts
- **Email Verification**: Verify email changes
- **Password Strength Meter**: Visual password strength indicator
- **Activity Log**: Show recent account activity
- **Connected Accounts**: Link social media accounts
- **Privacy Settings**: More granular privacy controls

## Testing

To test the profile system:

1. **Edit Profile:**
   - Login as user
   - Go to `/profile`
   - Change name and email
   - Verify changes in navbar

2. **Change Password:**
   - Go to Password tab
   - Enter current password
   - Enter new password
   - Logout and login with new password

3. **Notifications:**
   - Go to Notifications tab
   - Toggle switches
   - Verify preferences save

4. **Referral Code:**
   - View referral code at bottom
   - Copy and test referral link
