# Email Notification System Guide

## Overview

The email notification system sends automated emails to users for important events like welcome messages, cashback confirmations, and withdrawal updates. All emails respect user notification preferences.

## Features

### 1. Welcome Email
- **Trigger**: Sent automatically when a new user registers
- **Template**: Beautiful HTML email with welcome message and getting started guide
- **Preference**: Respects `notification_email` setting

### 2. Cashback Confirmation Email
- **Trigger**: Sent when an admin confirms a cashback transaction
- **Template**: Shows cashback amount, merchant name, and offer details
- **Preference**: Respects `notification_cashback` setting
- **Endpoint**: `PUT /api/admin/cashback/:id/confirm`

### 3. Withdrawal Notification Emails
- **Trigger**: Sent when:
  - User requests a withdrawal (pending status)
  - Admin updates withdrawal status (approved, processing, completed, rejected)
- **Template**: Status-specific email with amount and admin notes (if any)
- **Preference**: Respects `notification_withdrawal` setting

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="CashBack Rewards" <noreply@cashbackrewards.com>
FRONTEND_URL=http://localhost:3000
```

### Gmail Setup

For Gmail, you need to:

1. Enable 2-factor authentication on your Google account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Use the generated App Password (not your regular password) in `SMTP_PASS`

### Other Email Providers

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

#### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-aws-access-key
SMTP_PASS=your-aws-secret-key
```

## Development Mode

In development mode without SMTP configured:
- Emails are logged to console
- No actual emails are sent
- Use Ethereal Email (https://ethereal.email) for testing

## User Preferences

Users can control email notifications in their profile settings:
- **Email Notifications**: Master toggle for all emails
- **Cashback Notifications**: Specific toggle for cashback confirmations
- **Withdrawal Notifications**: Specific toggle for withdrawal updates

All email sending functions check these preferences before sending.

## API Endpoints

### Admin Cashback Management

#### Confirm Cashback Transaction
```http
PUT /api/admin/cashback/:id/confirm
Authorization: Bearer <admin-token>
```

This will:
1. Update transaction status to 'confirmed'
2. Send confirmation email to user (if preferences allow)

#### Get All Cashback Transactions
```http
GET /api/admin/cashback?status=pending&userId=1
Authorization: Bearer <admin-token>
```

#### Get Cashback Transaction by ID
```http
GET /api/admin/cashback/:id
Authorization: Bearer <admin-token>
```

#### Reject Cashback Transaction
```http
PUT /api/admin/cashback/:id/reject
Authorization: Bearer <admin-token>
Body: { "reason": "Invalid purchase" }
```

## Email Templates

All email templates are HTML-based with:
- Responsive design
- Brand colors and styling
- Plain text fallback
- Clear call-to-action buttons

### Template Structure

1. **Welcome Email**
   - Header with brand colors
   - Welcome message
   - Feature highlights
   - CTA button to start earning

2. **Cashback Confirmation**
   - Amount prominently displayed
   - Merchant and offer details
   - Status confirmation
   - Link to dashboard

3. **Withdrawal Notifications**
   - Status-specific styling
   - Amount and status
   - Admin notes (if provided)
   - Link to withdrawal details

## Testing

### Test Email Sending

1. **Welcome Email**: Register a new user
2. **Cashback Confirmation**: 
   - Create a cashback transaction
   - Confirm it via admin endpoint
3. **Withdrawal Notifications**:
   - Request a withdrawal
   - Update status via admin endpoint

### Development Testing

In development, check console logs for:
- Email sending status
- Ethereal Email preview URLs (if using Ethereal)

### Production Testing

1. Configure SMTP settings
2. Test with a real email address
3. Verify emails are received
4. Check spam folder if needed

## Error Handling

- Email sending failures are logged but don't block the main operation
- All email sending is async and non-blocking
- User preferences are checked before sending
- Invalid SMTP configuration logs warnings

## Future Enhancements

Potential improvements:
- Email queue system (Bull, RabbitMQ)
- Retry logic for failed emails
- Email templates customization
- Batch email sending
- Email analytics and tracking
- Unsubscribe functionality
- New offer alerts (opt-in)

## Troubleshooting

### Emails Not Sending

1. **Check SMTP Configuration**
   - Verify all environment variables are set
   - Test SMTP credentials

2. **Check User Preferences**
   - User may have disabled notifications
   - Check `notification_email`, `notification_cashback`, `notification_withdrawal` fields

3. **Check Logs**
   - Look for error messages in console
   - Check for SMTP connection errors

4. **Gmail Issues**
   - Make sure you're using App Password, not regular password
   - Check if "Less secure app access" is enabled (if not using App Password)

### Email in Spam Folder

- Configure SPF, DKIM, and DMARC records
- Use a proper "From" address
- Avoid spam trigger words
- Use a reputable email service (SendGrid, Mailgun, AWS SES)

## Security Considerations

- Never commit SMTP credentials to version control
- Use environment variables for all sensitive data
- Use App Passwords instead of main passwords
- Consider using email service APIs (SendGrid, Mailgun) for better security
- Implement rate limiting for email sending endpoints
