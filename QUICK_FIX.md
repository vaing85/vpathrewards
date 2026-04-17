# Quick Fix Guide - Common Test Failures

## 🚨 Test Failed? Try These in Order:

### 1. Server Not Running? (Most Common)
```bash
# Terminal 1: Start server
cd backend
npm run dev

# Wait for: "🚀 Server running on http://localhost:3001"
```

### 2. Dependencies Missing?
```bash
cd backend
npm install
```

### 3. Environment Not Configured?
```bash
cd backend
# Copy example if .env doesn't exist
cp .env.example .env

# Edit .env and set:
# JWT_SECRET=your-secret-key
# FRONTEND_URL=http://localhost:3000
```

### 4. Port Already in Use?
```bash
# Windows: Find process using port 3001
netstat -ano | findstr :3001

# Kill the process or change PORT in .env
```

### 5. Database Issues?
```bash
cd backend
# Delete and let it recreate
rm cashback.db  # or del cashback.db on Windows
npm run dev
```

### 6. Build Errors?
```bash
cd backend
npm run build
# Check for TypeScript errors
```

---

## 🔍 Run Diagnostics First

```bash
cd backend
npm run diagnose
```

This will tell you exactly what's wrong!

---

## 📋 Test Failure Checklist

When a test fails, check:

- [ ] Is server running? (`npm run dev`)
- [ ] Is port 3001 available?
- [ ] Are dependencies installed? (`npm install`)
- [ ] Is .env configured?
- [ ] Is database file writable?
- [ ] Are there errors in server logs?
- [ ] Is Node.js version 18+?

---

## 🎯 Most Common Issues

### "ECONNREFUSED"
→ **Server not running** - Start with `npm run dev`

### "404 Not Found"
→ **Wrong URL** - Should be `/api/health` not `/health`

### "401 Unauthorized"
→ **JWT_SECRET not set** - Check `.env` file

### "500 Internal Server Error"
→ **Check server logs** - Look for error messages

### "Module not found"
→ **Dependencies missing** - Run `npm install`

---

## 💡 Pro Tips

1. **Always check server logs first**
   - Errors show exactly what's wrong
   - Look for stack traces

2. **Run diagnostics before testing**
   ```bash
   npm run diagnose
   ```

3. **Test one thing at a time**
   - Start with health check
   - Then test individual endpoints

4. **Use browser DevTools**
   - Network tab shows API calls
   - Console shows errors

5. **Check both terminals**
   - Server terminal (backend)
   - Test terminal (frontend/tests)

---

## 🆘 Still Stuck?

1. Run diagnostics: `npm run diagnose`
2. Check TROUBLESHOOTING_GUIDE.md
3. Review server logs
4. Check error messages carefully
5. Verify environment setup

---

**Remember: 90% of issues are solved by:**
1. Starting the server
2. Installing dependencies  
3. Configuring .env
