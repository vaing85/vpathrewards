# 🧪 Run Critical User Flow Tests - Step by Step

## ⚡ Quick Start (3 Steps)

### Step 1: Start Backend Server

**Open a terminal and run:**
```bash
cd C:\Users\villa\cashback-app\backend
npm run dev
```

**Wait for this message:**
```
🚀 Server running on http://localhost:3001
Database connected successfully
```

**Keep this terminal open!** ⚠️ Don't close it.

---

### Step 2: Run Tests (New Terminal)

**Open a NEW terminal window and run:**

**Option A: Quick Test (Recommended First)**
```bash
cd C:\Users\villa\cashback-app\backend
npm run test:simple
```

**Option B: Full Test Suite**
```bash
cd C:\Users\villa\cashback-app\backend
npm run test:flows
```

---

### Step 3: Review Results

**You'll see:**
- ✅ Green = Test Passed
- ❌ Red = Test Failed  
- ⚠️ Yellow = Warning/Skipped

---

## 📋 What Gets Tested

### Simple Tests (`test:simple.js`)
1. ✅ Server Health Check
2. ✅ Get Merchants (with pagination)
3. ✅ Get Offers (with pagination)
4. ✅ User Registration
5. ✅ Admin Login

### Full Flow Tests (`test-flows.js`)
1. ✅ Health Check
2. ✅ Get Merchants
3. ✅ Get Offers
4. ✅ User Registration
5. ✅ User Login
6. ✅ Get Dashboard
7. ✅ Track Cashback
8. ✅ Request Withdrawal
9. ✅ Admin Login
10. ✅ Admin Dashboard

---

## 🎯 Expected Results

### First Run (Fresh Database)
```
✅ Health Check - PASSED
✅ Get Merchants - PASSED
✅ Get Offers - PASSED
✅ User Registration - PASSED
✅ Admin Login - PASSED

📊 Test Results: 5/5 passed
🎉 All tests passed!
```

### Subsequent Runs
```
✅ All tests should pass
⚠️ Some tests may skip if prerequisites not met
```

---

## 🐛 If Tests Fail

### Error: "ECONNREFUSED" or "Cannot connect"
**Problem:** Backend server is not running

**Solution:**
1. Check Terminal 1 - is `npm run dev` running?
2. Look for "Server running on http://localhost:3001"
3. If not, start it: `cd backend && npm run dev`
4. Wait for server to start
5. Run tests again

---

### Error: "401 Unauthorized"
**Problem:** Authentication issue

**Solution:**
1. Check `.env` file has `JWT_SECRET` set
2. Verify server restarted after .env changes
3. Check token is being sent correctly

---

### Error: "404 Not Found"
**Problem:** Wrong endpoint path

**Solution:**
1. All API routes start with `/api`
2. Check route exists in `server.ts`
3. Verify route is registered

---

### Error: "500 Internal Server Error"
**Problem:** Server-side error

**Solution:**
1. Check Terminal 1 (server) for error messages
2. Verify database is initialized
3. Check `.env` configuration
4. Look for missing dependencies

---

## 🧪 Manual Browser Testing

### Start Both Servers

**Terminal 1: Backend**
```bash
cd backend
npm run dev
```

**Terminal 2: Frontend**
```bash
cd frontend
npm run dev
```

### Test in Browser

1. **Open:** http://localhost:3000
2. **Test these flows:**

#### Flow 1: User Registration
- [ ] Go to Register page
- [ ] Fill form (name, email, password)
- [ ] See validation feedback
- [ ] Submit form
- [ ] Redirected to dashboard
- [ ] Can see earnings summary

#### Flow 2: Browse & Search
- [ ] Go to Home page
- [ ] See featured offers
- [ ] Use search bar
- [ ] Click on merchant
- [ ] See merchant offers
- [ ] Filter by category
- [ ] Pagination works

#### Flow 3: Track Cashback
- [ ] Login as user
- [ ] Click on an offer
- [ ] Click "Activate Offer"
- [ ] Go to Dashboard
- [ ] See transaction in history
- [ ] Check earnings updated

#### Flow 4: Withdrawal
- [ ] Login as user
- [ ] Go to Withdrawals page
- [ ] Request withdrawal (if balance > $10)
- [ ] See pending status
- [ ] Login as admin
- [ ] Approve withdrawal
- [ ] Check user balance updated

#### Flow 5: Admin Operations
- [ ] Login as admin (admin@cashback.com / admin123)
- [ ] Go to Admin Dashboard
- [ ] Create new merchant
- [ ] Create new offer
- [ ] View analytics
- [ ] Check pagination works

#### Flow 6: Form Validation
- [ ] Try to register with invalid email
- [ ] See error message
- [ ] Try short password
- [ ] See validation feedback
- [ ] Fill correct data
- [ ] See success indicators

#### Flow 7: Mobile Responsiveness
- [ ] Open browser DevTools (F12)
- [ ] Click device toolbar (Ctrl+Shift+M)
- [ ] Test on iPhone size
- [ ] Check hamburger menu works
- [ ] Test tables scroll horizontally
- [ ] Verify all features accessible

---

## 📊 Test Checklist

### Automated Tests
- [ ] `npm run test:simple` - All pass
- [ ] `npm run test:flows` - All pass
- [ ] No connection errors
- [ ] No authentication errors
- [ ] No 500 errors

### Manual Browser Tests
- [ ] User registration works
- [ ] User login works
- [ ] Browse merchants/offers works
- [ ] Search works
- [ ] Filters work
- [ ] Pagination works
- [ ] Cashback tracking works
- [ ] Dashboard loads
- [ ] Withdrawal request works
- [ ] Admin operations work
- [ ] Form validation works
- [ ] Mobile menu works
- [ ] Images lazy load
- [ ] No console errors

---

## ✅ Success Criteria

**Tests are successful if:**
- ✅ All automated tests pass
- ✅ No critical errors in browser console
- ✅ All user flows work end-to-end
- ✅ Forms validate correctly
- ✅ Pagination works
- ✅ Mobile responsive
- ✅ No 500 errors
- ✅ Authentication works
- ✅ Admin functions work

---

## 📝 Document Results

After testing, update:
- `TEST_RESULTS.md` - Record test results
- Note any issues found
- Document fixes applied

---

## 🚀 Next Steps After Testing

### If All Tests Pass ✅
1. ✅ Proceed with deployment preparation
2. ✅ Review MVP checklist
3. ✅ Test on production-like environment
4. ✅ Prepare deployment guide

### If Tests Fail ❌
1. ❌ Fix critical bugs
2. ❌ Re-run tests
3. ❌ Document fixes
4. ❌ Verify fixes work

---

**Ready to test!** 

1. Start backend: `cd backend && npm run dev`
2. Run tests: `npm run test:simple` (in new terminal)
3. Review results
4. Test in browser: http://localhost:3000

Good luck! 🍀
