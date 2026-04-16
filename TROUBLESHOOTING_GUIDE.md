# Troubleshooting Guide - Test Failures

## 🔍 Quick Diagnostic

Before troubleshooting, run diagnostics:
```bash
cd backend
npm run diagnose
```

This will check:
- ✅ Node.js version
- ✅ Dependencies installed
- ✅ Environment variables
- ✅ Database file
- ✅ Port availability
- ✅ Build files

---

## 🐛 Common Test Failures & Solutions

### Issue 1: "ECONNREFUSED" or "Cannot connect to server"

**Symptoms:**
- Tests fail immediately
- Error: `ECONNREFUSED` or `connect ECONNREFUSED`

**Causes:**
1. Backend server is not running
2. Wrong port number
3. Firewall blocking connection

**Solutions:**

1. **Check if server is running:**
   ```bash
   # Check if port 3001 is in use
   netstat -ano | findstr :3001
   
   # Or on Linux/Mac
   lsof -i :3001
   ```

2. **Start the server:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Verify server started:**
   - Look for: `🚀 Server running on http://localhost:3001`
   - Check for errors in terminal

4. **Check port in .env:**
   ```env
   PORT=3001
   ```

5. **Test manually:**
   ```bash
   curl http://localhost:3001/api/health
   # Or open in browser
   ```

---

### Issue 2: "404 Not Found"

**Symptoms:**
- Tests fail with 404 errors
- Endpoint not found

**Causes:**
1. Wrong API path
2. Route not registered
3. Server routes not loaded

**Solutions:**

1. **Check API base URL:**
   - Should be: `http://localhost:3001/api`
   - Not: `http://localhost:3001`

2. **Verify routes in server.ts:**
   ```typescript
   app.use('/api/health', ...)
   app.use('/api/auth', authRoutes)
   ```

3. **Check server logs:**
   - Look for route registration messages
   - Check for errors during startup

4. **Test endpoint directly:**
   ```bash
   curl http://localhost:3001/api/health
   ```

---

### Issue 3: "401 Unauthorized" or "Token invalid"

**Symptoms:**
- Authentication tests fail
- "Unauthorized" errors

**Causes:**
1. JWT_SECRET not set
2. Token not being sent
3. Token expired
4. Wrong token format

**Solutions:**

1. **Check JWT_SECRET in .env:**
   ```env
   JWT_SECRET=your-secret-key-change-in-production
   ```
   - Must be set
   - Should be a long random string

2. **Verify token in request:**
   ```javascript
   headers: { 
     Authorization: `Bearer ${token}` 
   }
   ```

3. **Check token format:**
   - Should start with "Bearer "
   - Token should be valid JWT

4. **Regenerate token:**
   - Try registering/login again
   - Get fresh token

---

### Issue 4: "500 Internal Server Error"

**Symptoms:**
- Server returns 500 errors
- Tests fail with server errors

**Causes:**
1. Database errors
2. Missing environment variables
3. Code errors
4. Missing dependencies

**Solutions:**

1. **Check server logs:**
   - Look for error messages
   - Check stack traces

2. **Verify database:**
   ```bash
   # Check if database file exists
   ls backend/cashback.db
   
   # Check file permissions
   ```

3. **Check environment variables:**
   ```bash
   # Verify .env file
   cat backend/.env
   ```

4. **Check dependencies:**
   ```bash
   cd backend
   npm install
   ```

5. **Rebuild:**
   ```bash
   npm run build
   ```

---

### Issue 5: "Database locked" or SQLite errors

**Symptoms:**
- Database operation errors
- "SQLITE_BUSY" errors

**Causes:**
1. Database file locked
2. Multiple processes accessing DB
3. File permissions

**Solutions:**

1. **Close other connections:**
   - Stop other server instances
   - Close database viewers

2. **Check file permissions:**
   ```bash
   # Make sure file is writable
   chmod 664 cashback.db
   ```

3. **Restart server:**
   - Stop server (Ctrl+C)
   - Wait a few seconds
   - Start again

4. **Check database path:**
   - Verify path in database.ts
   - Check if directory exists

---

### Issue 6: "Email not sending"

**Symptoms:**
- Email tests fail
- No emails received

**Causes:**
1. SMTP not configured
2. Wrong SMTP credentials
3. Email service blocking

**Solutions:**

1. **Check SMTP config in .env:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

2. **For development (Ethereal Email):**
   - Leave SMTP_HOST empty
   - Server will use Ethereal Email automatically
   - Check console for test account credentials

3. **For Gmail:**
   - Enable 2-factor authentication
   - Generate App Password
   - Use App Password (not regular password)

4. **Test email service:**
   - Check server logs for email errors
   - Verify SMTP connection

---

### Issue 7: "Module not found" errors

**Symptoms:**
- Import errors
- "Cannot find module"

**Causes:**
1. Dependencies not installed
2. Wrong import path
3. Missing package

**Solutions:**

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Check package.json:**
   - Verify package is listed
   - Check version

3. **Clear and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Check import paths:**
   - Verify file exists
   - Check case sensitivity
   - Verify extension (.ts vs .js)

---

### Issue 8: Tests pass but functionality doesn't work

**Symptoms:**
- Tests show green
- But app doesn't work in browser

**Causes:**
1. Frontend not connected
2. CORS issues
3. API URL mismatch

**Solutions:**

1. **Check CORS configuration:**
   ```typescript
   // In server.ts
   app.use(cors({
     origin: process.env.FRONTEND_URL || 'http://localhost:3000'
   }));
   ```

2. **Verify FRONTEND_URL:**
   ```env
   FRONTEND_URL=http://localhost:3000
   ```

3. **Check frontend API client:**
   - Verify API base URL
   - Check if pointing to correct backend

4. **Test in browser:**
   - Open DevTools
   - Check Network tab
   - Look for CORS errors

---

## 🔧 Step-by-Step Troubleshooting

### Step 1: Run Diagnostics
```bash
cd backend
npm run diagnose
```

### Step 2: Check Server Status
```bash
# Is server running?
curl http://localhost:3001/api/health

# Check server logs for errors
```

### Step 3: Verify Environment
```bash
# Check .env file
cat .env

# Verify required variables
```

### Step 4: Test Individual Endpoints
```bash
# Health check
curl http://localhost:3001/api/health

# Get merchants
curl http://localhost:3001/api/merchants

# Test with authentication
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/cashback/summary
```

### Step 5: Check Database
```bash
# Verify database exists
ls cashback.db

# Check if writable
touch cashback.db
```

### Step 6: Review Logs
- Check server terminal for errors
- Look for stack traces
- Check for missing modules

---

## 🆘 Still Having Issues?

### Check These:

1. **Node.js version:**
   ```bash
   node --version  # Should be 18+
   ```

2. **Dependencies:**
   ```bash
   npm list --depth=0
   ```

3. **Server startup:**
   - Any errors during startup?
   - Database initialized?
   - Routes registered?

4. **Network:**
   - Firewall blocking?
   - Port available?
   - Another service using port?

5. **Files:**
   - All files present?
   - Permissions correct?
   - Paths correct?

---

## 📝 Reporting Issues

When reporting issues, include:

1. **Error message** (full text)
2. **Server logs** (relevant lines)
3. **Test output** (what failed)
4. **Environment:**
   - Node.js version
   - OS
   - Port number
5. **Steps to reproduce**
6. **What you tried**

---

## ✅ Quick Fixes Checklist

- [ ] Server is running
- [ ] Port 3001 is available
- [ ] .env file exists and configured
- [ ] Dependencies installed (`npm install`)
- [ ] Database file exists and writable
- [ ] JWT_SECRET is set
- [ ] FRONTEND_URL is correct
- [ ] No firewall blocking
- [ ] Node.js version 18+
- [ ] No other process using port

---

## 🎯 Common Solutions

### "Server won't start"
```bash
# Check port
netstat -ano | findstr :3001

# Check .env
cat .env

# Reinstall dependencies
rm -rf node_modules
npm install
```

### "Tests fail immediately"
```bash
# Start server first
npm run dev

# Then in another terminal
npm run test:simple
```

### "Database errors"
```bash
# Delete and recreate
rm cashback.db
npm run dev  # Will recreate
```

### "Module not found"
```bash
# Reinstall
npm install

# Check package.json
cat package.json
```

---

**Remember: Most issues are solved by:**
1. ✅ Starting the server
2. ✅ Installing dependencies
3. ✅ Configuring .env
4. ✅ Checking logs
