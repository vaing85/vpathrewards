# Enhanced Affiliate Link Tracking Guide

## Overview

The affiliate tracking system enables comprehensive tracking of user clicks, conversions, and revenue from affiliate links. This is critical for integrating with real affiliate networks and generating revenue.

## Features Implemented

### 1. Click Tracking
- **Automatic tracking** when users click affiliate links
- **Session-based tracking** using unique session IDs
- **User attribution** (if logged in or using referral code)
- **IP address and user agent** logging for analytics
- **Referrer tracking** to see where clicks come from

### 2. Conversion Tracking
- **Webhook-ready** conversion endpoint
- **Order tracking** with order IDs and amounts
- **Commission calculation** (automatic or manual)
- **Status management** (pending, confirmed, rejected)
- **Automatic cashback** creation when conversions occur

### 3. Referral Code System
- **Unique referral codes** for each user
- **Referral links** that can be shared
- **User attribution** when someone signs up via referral
- **Dashboard display** of referral codes

### 4. Analytics Dashboards

#### User Analytics (`/analytics`)
- Total clicks and conversions
- Conversion rate calculation
- Total earnings from conversions
- Click history with status
- Conversion history with details

#### Admin Analytics (`/admin/analytics`)
- Overall platform statistics
- Top performing offers
- Top performing merchants
- Revenue and commission totals
- Conversion rates

## Database Schema

### User Referral Codes
- `user_id`: Links to user
- `referral_code`: Unique code (e.g., REF123456)
- `created_at`: When code was created

### Affiliate Clicks
- `id`: Primary key
- `user_id`: User who clicked (if logged in)
- `offer_id`: Which offer was clicked
- `session_id`: Unique session identifier
- `ip_address`: User's IP
- `user_agent`: Browser/device info
- `referrer`: Where they came from
- `clicked_at`: Timestamp
- `converted`: Boolean (1 if converted)
- `conversion_id`: Link to conversion record

### Conversions
- `id`: Primary key
- `click_id`: Link to original click
- `user_id`: User who made purchase
- `offer_id`: Which offer converted
- `session_id`: Session identifier
- `order_id`: Merchant order ID
- `order_amount`: Purchase amount
- `commission_amount`: Cashback earned
- `status`: pending, confirmed, rejected
- `conversion_date`: When conversion occurred

## API Endpoints

### User Endpoints (Protected)
- `GET /api/tracking/referral-code` - Get user's referral code
- `GET /api/tracking/analytics/clicks` - Get user's click history
- `GET /api/tracking/analytics/conversions` - Get user's conversion history

### Public Endpoints
- `POST /api/tracking/click` - Track affiliate link click
  - Body: `{ offer_id, session_id?, referral_code? }`
  - Returns: `{ click_id, session_id, tracking_url }`

- `POST /api/tracking/conversion` - Record conversion
  - Body: `{ session_id, click_id?, order_id, order_amount, commission_amount? }`
  - Returns: `{ conversion_id }`

### Admin Endpoints (Protected)
- `GET /api/admin/analytics/overview` - Get overall analytics
- `GET /api/admin/analytics/clicks` - Get all clicks (with filters)
- `GET /api/admin/analytics/conversions` - Get all conversions (with filters)

## How It Works

### Click Flow
1. User clicks "Activate Offer" on an offer page
2. Frontend calls `/api/tracking/click` with offer_id
3. Backend creates click record with session_id
4. Returns tracking_url with session_id parameter
5. User is redirected to merchant with tracking

### Conversion Flow
1. User makes purchase on merchant site
2. Merchant/affiliate network calls webhook: `/api/tracking/conversion`
3. Backend finds click by session_id
4. Creates conversion record
5. If user was logged in, creates cashback transaction
6. Updates user's total earnings

### Session Tracking
- Session IDs are stored in localStorage
- Valid for 30 days (configurable)
- Links clicks to conversions even if user isn't logged in
- Can be attributed to user later if they sign up

## Integration with Affiliate Networks

### Webhook Setup
To integrate with affiliate networks (Rakuten, Commission Junction, etc.):

1. **Configure webhook URL** in affiliate network dashboard:
   ```
   https://yourdomain.com/api/tracking/conversion
   ```

2. **Webhook payload** should include:
   ```json
   {
     "session_id": "sess_1234567890_abc123",
     "order_id": "ORDER123",
     "order_amount": 100.00,
     "commission_amount": 5.00
   }
   ```

3. **Session ID** should be passed in affiliate link:
   ```
   https://merchant.com?ref=sess_1234567890_abc123&click_id=456
   ```

### Manual Conversion Entry
Admins can also manually record conversions via the API if needed.

## Frontend Integration

### Tracking Clicks
The `OfferDetail` component automatically tracks clicks:
```typescript
const response = await apiClient.post('/tracking/click', {
  offer_id: offer.id,
  session_id: getOrCreateSessionId()
});
window.open(response.data.tracking_url, '_blank');
```

### Displaying Analytics
- User analytics page shows personal click/conversion stats
- Admin analytics shows platform-wide statistics
- Both update in real-time as data comes in

## Referral System

### How Referrals Work
1. User gets unique referral code (e.g., `REF123456`)
2. User shares referral link: `yoursite.com/ref/REF123456`
3. New user signs up via referral link
4. System attributes signup to referrer
5. Both users can earn rewards (future feature)

### Current Implementation
- Referral codes are generated automatically
- Displayed on user dashboard
- Can be copied and shared
- Attribution happens when referral code is used in click tracking

## Analytics Metrics

### User Metrics
- **Total Clicks**: How many offers clicked
- **Conversions**: How many purchases made
- **Conversion Rate**: (Conversions / Clicks) × 100
- **Total Earnings**: Sum of all commissions

### Admin Metrics
- **Total Clicks**: Platform-wide click count
- **Unique Users**: How many users clicked
- **Total Conversions**: Platform-wide conversions
- **Total Revenue**: Sum of all order amounts
- **Total Commissions**: Sum of all cashback paid
- **Top Offers**: Best performing offers by clicks/conversions
- **Top Merchants**: Best performing merchants

## Testing

### Test Click Tracking
1. Login as a user
2. Click on an offer
3. Check `/analytics` page - should see the click
4. Check admin analytics - should see the click

### Test Conversion Tracking
```bash
curl -X POST http://localhost:3001/api/tracking/conversion \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "sess_1234567890_abc123",
    "order_id": "TEST123",
    "order_amount": 100.00,
    "commission_amount": 5.00
  }'
```

### Test Referral Code
1. Login as user
2. Go to dashboard
3. See referral code section
4. Copy and test referral link

## Future Enhancements

Potential improvements:
- **Cookie-based tracking** (30-day cookies)
- **Pixel tracking** for better conversion detection
- **Real-time webhooks** from affiliate networks
- **Referral rewards** system
- **A/B testing** for offers
- **Geographic analytics**
- **Device/browser analytics**
- **Conversion attribution** models
- **Fraud detection**

## Security Considerations

- Session IDs are randomly generated
- IP addresses logged for fraud prevention
- User agent logged for analytics
- Conversions require valid session_id
- Admin-only access to full analytics
- Rate limiting recommended for production
