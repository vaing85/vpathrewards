# 🔄 Restart Server - Port 3001 Issue Fixed

## ✅ Port Cleared

I've killed any Node processes that might have been holding port 3001.

---

## 🚀 Now Start the Server

**Run this command:**
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

---

## 🧪 Then Run Tests

**In a NEW terminal, run:**
```bash
cd C:\Users\villa\cashback-app\backend
npm run test:flows
```

**Expected Result:**
```
✅ Admin Dashboard - PASSED
📊 Test Results: 8/8 passed
🎉 All tests passed!
```

---

## 🐛 If Port Still in Use

**If you still get the error, try:**

1. **Check what's using the port:**
   ```powershell
   netstat -ano | findstr ":3001"
   ```

2. **Kill specific process:**
   ```powershell
   # Replace PID with the number from above
   taskkill /PID <PID> /F
   ```

3. **Or kill all Node processes:**
   ```powershell
   Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
   ```

4. **Wait 2-3 seconds, then start server again**

---

## ✅ Success Indicators

**Server started successfully if you see:**
- ✅ `🚀 Server running on http://localhost:3001`
- ✅ `Database connected successfully`
- ✅ No error messages

**Then you can run the tests!**

---

**The port should be free now. Start the server and run the tests!** 🚀
