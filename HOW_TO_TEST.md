# How to Run Tests - Step by Step Guide

## 🚀 Quick Start

### Step 1: Start Backend Server

Open Terminal 1:
```bash
cd C:\Users\villa\cashback-app\backend
npm run dev
```

**Wait for this message:**
```
🚀 Server running on http://localhost:3001
Database connected successfully
Database initialized successfully
```

**Keep this terminal open!**

---

### Step 2: Run Tests

Open Terminal 2 (new terminal):
```bash
cd C:\Users\villa\cashback-app\backend
node test-simple.js
```

**OR for full tests:**
```bash
npm run test:flows
```

---

### Step 3: Review Results

The test will show:
- ✅ Green = Test Passed
- ❌ Red = Test Failed
- ⚠️ Yellow = Warning/Skipped

---

## 📋 What Tests Check

### Basic Tests (test-simple.js)
1. ✅ Server is running
2. ✅ Health endpoint works
3. ✅ Get merchants
4. ✅ Get offers
5. ✅ User registration
6. ✅ Admin login

### Full Tests (test-flows.js)
1. ✅ Health check
2. ✅ Get merchants
3. ✅ Get offers
4. ✅ User registration
5. ✅ User login
6. ✅ Get dashboard
7. ✅ Track cashback
8. ✅ Request withdrawal
9. ✅ Admin login
10. ✅ Admin dashboard

---

## 🐛 Troubleshooting

### Issue: "ECONNREFUSED" or "Cannot connect"
**Solution**: Backend server is not running
- Make sure you started `npm run dev` in Terminal 1
- Check if port 3001 is available
- Look for errors in the server terminal

### Issue: "404 Not Found"
**Solution**: Check endpoint paths
- Health: `/api/health` (not `/health`)
- All API routes start with `/api`

### Issue: "401 Unauthorized"
**Solution**: Authentication issue
- Check if token is being sent
- Verify JWT_SECRET is set in .env
- Check token expiration

### Issue: "500 Internal Server Error"
**Solution**: Server-side error
- Check server terminal for error messages
- Verify database is initialized
- Check .env configuration

---

## 🧪 Manual Testing Alternative

If automated tests don't work, use manual testing:

1. **Start both servers:**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

2. **Open browser:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api/health

3. **Follow MANUAL_TEST_CHECKLIST.md**

---

## ✅ Expected Test Results

### First Run (Fresh Database)
- ✅ Health Check: PASS
- ✅ Get Merchants: PASS (may be 0 merchants)
- ✅ Get Offers: PASS (may be 0 offers)
- ✅ User Registration: PASS
- ⚠️ User Login: SKIP (user just created)
- ✅ Admin Login: PASS

### Subsequent Runs
- ✅ All tests should pass
- ⚠️ Withdrawal test may skip if balance < $10

---

## 📝 Test Results Template

After running tests, document results:

```
Date: ___________
Tester: ___________

Test Results:
- Health Check: [ ] PASS [ ] FAIL
- Get Merchants: [ ] PASS [ ] FAIL
- Get Offers: [ ] PASS [ ] FAIL
- User Registration: [ ] PASS [ ] FAIL
- Admin Login: [ ] PASS [ ] FAIL

Issues Found:
1. ___________
2. ___________

Notes:
___________
```

---

## 🎯 Next Steps After Testing

1. **If all tests pass:**
   - ✅ Proceed with manual UI testing
   - ✅ Test in browser
   - ✅ Check mobile responsiveness

2. **If tests fail:**
   - ❌ Check error messages
   - ❌ Fix issues found
   - ❌ Re-run tests
   - ❌ Document fixes

3. **After testing:**
   - 📝 Document any issues
   - 🔧 Fix critical bugs
   - ✅ Retest fixed issues
   - 🚀 Prepare for deployment

---

## 💡 Tips

- **Always start server first** before running tests
- **Keep server running** while testing
- **Check server logs** for detailed error messages
- **Test one flow at a time** if debugging
- **Use browser DevTools** for frontend testing

---

**Ready to test? Start the server and run the tests!** 🚀
