# 🧪 Start Testing Critical User Flows

## 🚀 Step-by-Step Instructions

### Step 1: Start Backend Server

**Open Terminal/PowerShell and run:**
```bash
cd C:\Users\villa\cashback-app\backend
npm run dev
```

**You should see:**
```
🚀 Server running on http://localhost:3001
Database connected successfully
Database initialized successfully
Creating database indexes...
```

**⚠️ IMPORTANT:** Keep this terminal open! The server must stay running.

---

### Step 2: Run Automated Tests

**Open a NEW Terminal/PowerShell window** (keep the first one running) and run:

**Quick Test (Recommended First):**
```bash
cd C:\Users\villa\cashback-app\backend
npm run test:simple
```

**Full Test Suite:**
```bash
cd C:\Users\villa\cashback-app\backend
npm run test:flows
```

---

### Step 3: Review Test Results

**You'll see output like:**
```
🧪 Testing Backend API...

✅ Health Check - PASSED
✅ Get Merchants - PASSED
✅ Get Offers - PASSED
✅ User Registration - PASSED
✅ Admin Login - PASSED

📊 Test Results: 5/5 passed
🎉 All tests passed!
```

---

## 📋 What Each Test Does

### test-simple.js Tests:
1. **Health Check** - Verifies server is running
2. **Get Merchants** - Tests merchants endpoint with pagination
3. **Get Offers** - Tests offers endpoint with pagination
4. **User Registration** - Creates a test user
5. **Admin Login** - Tests admin authentication

### test-flows.js Tests (Full Suite):
1. All simple tests above
2. **User Login** - Tests user authentication
3. **Get Dashboard** - Tests authenticated dashboard access
4. **Track Cashback** - Tests cashback tracking
5. **Request Withdrawal** - Tests withdrawal request
6. **Admin Dashboard** - Tests admin analytics

---

## 🎯 Expected Results

### ✅ Success (All Tests Pass)
```
📊 Test Results: 10/10 passed
🎉 All tests passed!
```

### ⚠️ Partial Success (Some Skipped)
```
⚠️ Skipping Track Cashback - no offers available
⚠️ Skipping Request Withdrawal - insufficient balance
📊 Test Results: 8/10 passed
```

### ❌ Failure (Tests Failed)
```
❌ User Registration - FAILED
Error: Email already exists
📊 Test Results: 4/10 passed
⚠️ 6 test(s) failed
```

---

## 🐛 Troubleshooting

### Problem: "ECONNREFUSED" Error
**Cause:** Backend server is not running

**Fix:**
1. Check Terminal 1 - is `npm run dev` running?
2. Look for "Server running on http://localhost:3001"
3. If not running, start it: `cd backend && npm run dev`
4. Wait 5-10 seconds for server to start
5. Run tests again

---

### Problem: "Cannot find module 'axios'"
**Cause:** Missing test dependency

**Fix:**
```bash
cd backend
npm install
```

---

### Problem: "401 Unauthorized"
**Cause:** JWT token issue

**Fix:**
1. Check `.env` file has `JWT_SECRET` set
2. Restart server after .env changes
3. Verify token format in test script

---

### Problem: "500 Internal Server Error"
**Cause:** Server-side error

**Fix:**
1. Check Terminal 1 (server) for error messages
2. Look for red error text
3. Verify database is initialized
4. Check `.env` configuration

---

## 🧪 Manual Browser Testing

After automated tests pass, test in browser:

### Start Frontend Server

**Open Terminal 3:**
```bash
cd C:\Users\villa\cashback-app\frontend
npm run dev
```

### Test These Flows

1. **Open Browser:** http://localhost:3000

2. **Test Registration:**
   - Go to Register page
   - Fill form with validation
   - Submit and verify redirect

3. **Test Login:**
   - Login with credentials
   - Verify dashboard loads
   - Check earnings display

4. **Test Browse:**
   - View homepage
   - Search for merchants
   - Filter by category
   - Test pagination

5. **Test Cashback:**
   - Click on offer
   - Track transaction
   - View in dashboard

6. **Test Admin:**
   - Login as admin
   - Create merchant
   - Create offer
   - View analytics

7. **Test Mobile:**
   - Open DevTools (F12)
   - Device toolbar (Ctrl+Shift+M)
   - Test hamburger menu
   - Verify responsive design

---

## ✅ Test Checklist

### Automated Tests
- [ ] `npm run test:simple` - All pass
- [ ] `npm run test:flows` - All pass
- [ ] No connection errors
- [ ] No authentication errors

### Browser Tests
- [ ] Registration works
- [ ] Login works
- [ ] Browse works
- [ ] Search works
- [ ] Pagination works
- [ ] Cashback tracking works
- [ ] Dashboard loads
- [ ] Admin works
- [ ] Forms validate
- [ ] Mobile responsive
- [ ] No console errors

---

## 📝 Record Results

After testing, document results in `TEST_RESULTS.md`:

```
Date: ___________
Tester: ___________

Automated Tests:
- test:simple: [ ] PASS [ ] FAIL
- test:flows: [ ] PASS [ ] FAIL

Browser Tests:
- Registration: [ ] PASS [ ] FAIL
- Login: [ ] PASS [ ] FAIL
- Browse: [ ] PASS [ ] FAIL
- Admin: [ ] PASS [ ] FAIL

Issues Found:
1. ___________
2. ___________

Overall Status: [ ] Ready [ ] Needs Fixes
```

---

## 🎯 Success Criteria

**Tests are successful if:**
- ✅ All automated tests pass
- ✅ No critical errors
- ✅ All user flows work
- ✅ Forms validate
- ✅ Mobile works
- ✅ No console errors

---

**Ready? Start the server and run the tests!** 🚀

1. Terminal 1: `cd backend && npm run dev`
2. Terminal 2: `cd backend && npm run test:simple`
3. Review results
4. Test in browser if all pass
