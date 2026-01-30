# When Tests Fail - Complete Troubleshooting Workflow

## 🚨 Immediate Actions

### Step 1: Don't Panic!
Most test failures are easy to fix. Follow these steps:

---

## 📋 Troubleshooting Workflow

### Step 1: Run Diagnostics (30 seconds)
```bash
cd backend
npm run diagnose
```

**What it checks:**
- ✅ Node.js version
- ✅ Dependencies installed
- ✅ Environment configured
- ✅ Database accessible
- ✅ Port available

**If diagnostics pass:** → Go to Step 2
**If diagnostics fail:** → Fix issues shown, then retry

---

### Step 2: Verify Server is Running
```bash
# Check if server is running
curl http://localhost:3001/api/health

# OR open in browser:
# http://localhost:3001/api/health
```

**Expected:** `{"status":"ok","message":"Cashback API is running"}`

**If server not running:**
```bash
cd backend
npm run dev
# Wait for: "🚀 Server running on http://localhost:3001"
```

---

### Step 3: Check the Error Message

The test output will show specific errors. Match to solution:

| Error Type | Quick Fix |
|------------|-----------|
| `ECONNREFUSED` | Start server: `npm run dev` |
| `404 Not Found` | Check API path is `/api/...` |
| `401 Unauthorized` | Check JWT_SECRET in .env |
| `500 Internal Server Error` | Check server terminal logs |
| `Module not found` | Run `npm install` |
| `Database locked` | Stop other server instances |

---

### Step 4: Check Server Logs

**Look at the server terminal** (where you ran `npm run dev`):

**Good signs:**
- ✅ "Server running on http://localhost:3001"
- ✅ "Database connected successfully"
- ✅ "Database initialized successfully"

**Bad signs:**
- ❌ Error messages
- ❌ Stack traces
- ❌ "Cannot find module"
- ❌ Database errors

**If you see errors:**
1. Copy the error message
2. Check TROUBLESHOOTING_GUIDE.md
3. Fix the issue
4. Restart server

---

### Step 5: Common Fixes

#### Fix 1: Server Not Running
```bash
cd backend
npm run dev
```

#### Fix 2: Dependencies Missing
```bash
cd backend
npm install
```

#### Fix 3: Environment Not Set
```bash
cd backend
# Create .env if missing
cp .env.example .env

# Edit .env and ensure:
# JWT_SECRET=your-secret-key
# FRONTEND_URL=http://localhost:3000
```

#### Fix 4: Port Already in Use
```bash
# Windows: Find and kill process
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# OR change PORT in .env
```

#### Fix 5: Database Issues
```bash
cd backend
# Delete database (will recreate)
del cashback.db  # Windows
# OR
rm cashback.db   # Linux/Mac

# Restart server
npm run dev
```

---

## 🔍 Detailed Error Analysis

### Error: "ECONNREFUSED"
**Meaning:** Cannot connect to server

**Causes:**
1. Server not started
2. Wrong port
3. Firewall blocking

**Solutions:**
1. Start server: `npm run dev`
2. Check port in .env: `PORT=3001`
3. Verify no firewall blocking

---

### Error: "404 Not Found"
**Meaning:** Endpoint doesn't exist

**Causes:**
1. Wrong URL path
2. Route not registered
3. API base URL wrong

**Solutions:**
1. Check URL: Should be `/api/health` not `/health`
2. Verify routes in server.ts
3. Check API_BASE in test script

---

### Error: "401 Unauthorized"
**Meaning:** Authentication failed

**Causes:**
1. JWT_SECRET not set
2. Token invalid/expired
3. Token not sent correctly

**Solutions:**
1. Check .env has `JWT_SECRET=...`
2. Get fresh token (register/login)
3. Verify token in Authorization header

---

### Error: "500 Internal Server Error"
**Meaning:** Server-side error

**Causes:**
1. Database error
2. Code bug
3. Missing dependency
4. Environment variable missing

**Solutions:**
1. **Check server logs** - Most important!
2. Look for stack trace
3. Check database connection
4. Verify all dependencies installed
5. Check environment variables

---

### Error: "Module not found"
**Meaning:** Missing dependency

**Causes:**
1. Package not installed
2. Wrong import path
3. Package.json missing dependency

**Solutions:**
1. Run `npm install`
2. Check package.json
3. Verify import path
4. Clear node_modules and reinstall

---

## 🛠️ Advanced Troubleshooting

### Check Server Startup
```bash
cd backend
npm run dev

# Watch for:
# ✅ "Database connected"
# ✅ "Database initialized"
# ✅ "Server running"
# ❌ Any errors
```

### Test Individual Endpoints
```bash
# Health check
curl http://localhost:3001/api/health

# Get merchants (no auth needed)
curl http://localhost:3001/api/merchants

# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","name":"Test"}'
```

### Check Database
```bash
# Verify database exists
ls cashback.db  # or dir cashback.db on Windows

# Check if writable
# Try to create a test file in same directory
```

### Verify Environment
```bash
# Check .env file
cat .env  # or type .env on Windows

# Verify these are set:
# PORT=3001
# JWT_SECRET=...
# NODE_ENV=development
# FRONTEND_URL=http://localhost:3000
```

---

## 📊 Test Results Interpretation

### All Tests Pass ✅
- ✅ System is working
- ✅ Proceed with manual testing
- ✅ Ready for next steps

### Some Tests Fail ⚠️
- ⚠️ Check which tests failed
- ⚠️ Review error messages
- ⚠️ Fix issues one by one
- ⚠️ Retest after fixes

### All Tests Fail ❌
- ❌ Likely server not running
- ❌ Or major configuration issue
- ❌ Run diagnostics first
- ❌ Check server logs

---

## 🎯 Success Criteria

Tests are successful when:
- ✅ Server starts without errors
- ✅ Health check passes
- ✅ At least basic endpoints work
- ✅ Authentication works
- ✅ No critical errors in logs

---

## 📝 Documentation Checklist

When reporting issues, include:

1. **Error message** (full text)
2. **Test output** (what failed)
3. **Server logs** (relevant lines)
4. **Diagnostics output** (`npm run diagnose`)
5. **Environment:**
   - Node.js version
   - OS
   - Port number
6. **What you tried**

---

## 🚀 Quick Reference

### Before Testing
```bash
# 1. Run diagnostics
npm run diagnose

# 2. Start server
npm run dev

# 3. Run tests
npm run test:simple
```

### If Tests Fail
```bash
# 1. Check diagnostics
npm run diagnose

# 2. Check server logs
# (Look at terminal where server is running)

# 3. Check TROUBLESHOOTING_GUIDE.md

# 4. Fix issues

# 5. Retest
```

---

## 💡 Pro Tips

1. **Always start server first**
   - Tests can't run without it
   - Keep server terminal open

2. **Check server logs**
   - Errors show exactly what's wrong
   - Stack traces point to issues

3. **Run diagnostics**
   - Catches 90% of issues
   - Saves time debugging

4. **Test one thing at a time**
   - Start with health check
   - Then test individual endpoints

5. **Keep both terminals open**
   - Terminal 1: Server (`npm run dev`)
   - Terminal 2: Tests (`npm run test:simple`)

---

## 🆘 Still Stuck?

1. ✅ Run `npm run diagnose`
2. ✅ Check TROUBLESHOOTING_GUIDE.md
3. ✅ Review server logs
4. ✅ Check QUICK_FIX.md
5. ✅ Verify environment setup

---

**Remember: Most issues are solved by:**
1. Starting the server (`npm run dev`)
2. Installing dependencies (`npm install`)
3. Configuring .env file
4. Checking server logs

**You've got this! 🚀**
