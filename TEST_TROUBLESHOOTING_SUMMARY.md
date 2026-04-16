# Test Troubleshooting - Quick Reference

## 🎯 When Tests Fail

### Step 1: Run Diagnostics
```bash
cd backend
npm run diagnose
```

### Step 2: Check Server
```bash
# Is it running?
curl http://localhost:3001/api/health

# If not, start it:
npm run dev
```

### Step 3: Review Error Message

| Error | Solution |
|-------|----------|
| `ECONNREFUSED` | Start server: `npm run dev` |
| `404 Not Found` | Check API path (should be `/api/...`) |
| `401 Unauthorized` | Check JWT_SECRET in .env |
| `500 Internal Server Error` | Check server logs |
| `Module not found` | Run `npm install` |
| `Database locked` | Stop other server instances |

---

## 🔧 Quick Fixes

### Fix 1: Server Not Running
```bash
cd backend
npm run dev
# Wait for: "🚀 Server running"
```

### Fix 2: Dependencies Missing
```bash
cd backend
npm install
```

### Fix 3: Environment Not Set
```bash
cd backend
# Create .env from example
cp .env.example .env
# Edit .env and set JWT_SECRET
```

### Fix 4: Port in Use
```bash
# Find process
netstat -ano | findstr :3001
# Kill process or change PORT in .env
```

### Fix 5: Database Issues
```bash
cd backend
# Delete and recreate
del cashback.db  # Windows
npm run dev
```

---

## 📊 Test Output Guide

### ✅ Green = Passed
Test completed successfully

### ❌ Red = Failed
Test failed - check error message

### ⚠️ Yellow = Warning
Test skipped or non-critical issue

---

## 🐛 Common Error Messages

### "Cannot connect to server"
- Server not running
- Wrong port
- Firewall blocking

**Fix:** Start server with `npm run dev`

### "Unauthorized"
- JWT_SECRET not set
- Token invalid/expired
- Token not sent

**Fix:** Check .env, get new token

### "Not Found"
- Wrong endpoint path
- Route not registered
- API base URL wrong

**Fix:** Check route paths, verify `/api` prefix

### "Internal Server Error"
- Database error
- Code bug
- Missing dependency

**Fix:** Check server logs, verify dependencies

---

## 📝 Testing Workflow

1. **Start Server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Run Diagnostics** (optional)
   ```bash
   npm run diagnose
   ```

3. **Run Tests**
   ```bash
   npm run test:simple
   # OR
   npm run test:flows
   ```

4. **Review Results**
   - Green = Good
   - Red = Fix issue
   - Yellow = Warning (may be ok)

5. **Fix Issues**
   - Check error message
   - Review troubleshooting guide
   - Fix and retest

---

## 🆘 Need More Help?

1. **Check TROUBLESHOOTING_GUIDE.md** - Detailed solutions
2. **Run diagnostics** - `npm run diagnose`
3. **Check server logs** - Look for error messages
4. **Review error details** - Tests show specific errors

---

## ✅ Success Checklist

Before considering tests "passed":

- [ ] All automated tests pass
- [ ] Server runs without errors
- [ ] No console errors
- [ ] Database operations work
- [ ] Authentication works
- [ ] API endpoints respond

---

**Most issues are solved by starting the server and installing dependencies!**
