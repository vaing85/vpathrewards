# Testing Critical User Flows 🧪

## 🚀 Quick Start

### Step 1: Ensure Backend Server is Running

**Check if server is running:**
```bash
curl http://localhost:3001/api/health
```

**If not running, start it:**
```bash
cd backend
npm run dev
```

Wait for: `🚀 Server running on http://localhost:3001`

---

### Step 2: Run Automated Tests

**Option A: Simple Tests (Quick Check)**
```bash
cd backend
npm run test:simple
```

**Option B: Full Flow Tests (Comprehensive)**
```bash
cd backend
npm run test:flows
```

---

## 📋 Critical User Flows to Test

### 1. **User Registration & Login** 🔐
**Flow:**
1. Register new user
2. Login with credentials
3. Access protected routes

**Test Commands:**
```bash
# Test registration
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

**Expected:**
- ✅ Registration succeeds
- ✅ Login returns JWT token
- ✅ Token works for authenticated routes

---

### 2. **Browse Merchants & Offers** 🛍️
**Flow:**
1. View all merchants
2. View all offers
3. Search/filter merchants
4. Search/filter offers

**Test Commands:**
```bash
# Get merchants
curl http://localhost:3001/api/merchants

# Get offers
curl http://localhost:3001/api/offers

# Search merchants
curl "http://localhost:3001/api/merchants?search=amazon"

# Filter by category
curl "http://localhost:3001/api/offers?category=Electronics"
```

**Expected:**
- ✅ Returns list of merchants/offers
- ✅ Pagination works
- ✅ Search/filter works
- ✅ Response includes pagination metadata

---

### 3. **Cashback Tracking** 💰
**Flow:**
1. User clicks offer
2. Track cashback transaction
3. View transaction history
4. Check earnings summary

**Test Commands:**
```bash
# Get token first (from login)
TOKEN="your-jwt-token-here"

# Track cashback
curl -X POST http://localhost:3001/api/cashback/track \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"offer_id":1,"transaction_amount":100,"transaction_date":"2024-01-15"}'

# Get transactions
curl http://localhost:3001/api/cashback/transactions \
  -H "Authorization: Bearer $TOKEN"

# Get summary
curl http://localhost:3001/api/cashback/summary \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- ✅ Transaction tracked successfully
- ✅ Appears in transaction history
- ✅ Summary updated correctly
- ✅ Status is "pending" initially

---

### 4. **Withdrawal Request** 💸
**Flow:**
1. User requests withdrawal
2. Admin views withdrawal
3. Admin approves/rejects
4. User sees updated status

**Test Commands:**
```bash
# User: Request withdrawal
curl -X POST http://localhost:3001/api/withdrawals/request \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":50,"payment_method":"paypal","payment_details":"user@example.com"}'

# Admin: Get withdrawals
curl http://localhost:3001/api/admin/withdrawals \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Admin: Approve withdrawal
curl -X PUT http://localhost:3001/api/admin/withdrawals/1/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected:**
- ✅ Withdrawal request created
- ✅ Status is "pending"
- ✅ Admin can see request
- ✅ Approval updates status and balance

---

### 5. **Admin Operations** 👨‍💼
**Flow:**
1. Admin login
2. Create merchant
3. Create offer
4. View analytics

**Test Commands:**
```bash
# Admin login
curl -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cashback.com","password":"admin123"}'

# Create merchant
curl -X POST http://localhost:3001/api/admin/merchants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Merchant","category":"Retail","website_url":"https://example.com"}'

# Create offer
curl -X POST http://localhost:3001/api/admin/offers \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"merchant_id":1,"title":"5% Cashback","cashback_rate":5,"affiliate_link":"https://example.com"}'

# Get analytics
curl http://localhost:3001/api/admin/analytics/dashboard \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected:**
- ✅ Admin login works
- ✅ Can create merchants/offers
- ✅ Analytics data loads
- ✅ Pagination works on admin tables

---

### 6. **Search & Filtering** 🔍
**Flow:**
1. Search merchants
2. Search offers
3. Filter by category
4. Filter by cashback rate
5. Sort results

**Test Commands:**
```bash
# Search
curl "http://localhost:3001/api/search?q=amazon"

# Filter by category
curl "http://localhost:3001/api/offers?category=Electronics"

# Filter by cashback
curl "http://localhost:3001/api/offers?minCashback=5"

# Sort
curl "http://localhost:3001/api/offers?sort=cashback_desc"
```

**Expected:**
- ✅ Search returns relevant results
- ✅ Filters work correctly
- ✅ Sorting works
- ✅ Pagination works with filters

---

### 7. **User Profile & Settings** ⚙️
**Flow:**
1. View profile
2. Update profile
3. Change password
4. Update notifications

**Test Commands:**
```bash
# Get profile
curl http://localhost:3001/api/profile \
  -H "Authorization: Bearer $TOKEN"

# Update profile
curl -X PUT http://localhost:3001/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","email":"newemail@example.com"}'

# Change password
curl -X PUT http://localhost:3001/api/profile/password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"current_password":"oldpass","new_password":"newpass123"}'
```

**Expected:**
- ✅ Profile loads correctly
- ✅ Updates save successfully
- ✅ Password change works
- ✅ Validation feedback works

---

## 🧪 Automated Test Scripts

### Run Simple Tests
```bash
cd backend
npm run test:simple
```

**Tests:**
- ✅ Server health
- ✅ Get merchants
- ✅ Get offers
- ✅ User registration
- ✅ Admin login

### Run Full Flow Tests
```bash
cd backend
npm run test:flows
```

**Tests:**
- ✅ All simple tests
- ✅ User login
- ✅ Get dashboard
- ✅ Track cashback
- ✅ Request withdrawal
- ✅ Admin dashboard

---

## 📊 Test Results Template

```
Date: ___________
Tester: ___________

### Automated Tests
- [ ] test:simple - PASS/FAIL
- [ ] test:flows - PASS/FAIL

### Manual Tests
- [ ] User Registration - PASS/FAIL
- [ ] User Login - PASS/FAIL
- [ ] Browse Merchants - PASS/FAIL
- [ ] Browse Offers - PASS/FAIL
- [ ] Search & Filter - PASS/FAIL
- [ ] Track Cashback - PASS/FAIL
- [ ] View Dashboard - PASS/FAIL
- [ ] Request Withdrawal - PASS/FAIL
- [ ] Admin Login - PASS/FAIL
- [ ] Admin Create Merchant - PASS/FAIL
- [ ] Admin Create Offer - PASS/FAIL
- [ ] Admin View Analytics - PASS/FAIL
- [ ] Profile Update - PASS/FAIL
- [ ] Password Change - PASS/FAIL

### Issues Found
1. ___________
2. ___________

### Notes
___________
```

---

## 🐛 Common Issues & Fixes

### Issue: Server Not Running
**Error:** `ECONNREFUSED`
**Fix:**
```bash
cd backend
npm run dev
```

### Issue: 401 Unauthorized
**Error:** `401 Unauthorized`
**Fix:**
- Check JWT token is valid
- Verify token in Authorization header
- Check JWT_SECRET in .env

### Issue: 404 Not Found
**Error:** `404 Not Found`
**Fix:**
- Check endpoint path (should start with `/api`)
- Verify route exists in server.ts

### Issue: 500 Internal Server Error
**Error:** `500 Internal Server Error`
**Fix:**
- Check server terminal for errors
- Verify database is initialized
- Check .env configuration

---

## ✅ Success Criteria

All critical flows pass if:
- ✅ User can register and login
- ✅ User can browse merchants/offers
- ✅ User can track cashback
- ✅ User can view dashboard
- ✅ User can request withdrawal
- ✅ Admin can manage merchants/offers
- ✅ Admin can view analytics
- ✅ Search and filters work
- ✅ Pagination works
- ✅ Forms validate correctly

---

**Ready to test! Start the server and run the tests.** 🚀
