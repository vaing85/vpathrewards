# How to Start the Servers

## Quick Start

### 1. Start Backend Server

Open a terminal and run:
```bash
cd apps/api
npm run dev
```

**Expected Output:**
```
[10:51:24 PM] Starting compilation in watch mode...
[10:51:26 PM] Found 0 errors. Watching for file changes.
🚀 Application is running on: http://localhost:3001
📊 GraphQL Playground: http://localhost:3001/graphql
```

**If you see errors:**
- Check that `.env` file exists in `apps/api/`
- Verify `DATABASE_URL` is set correctly
- Make sure Prisma client is generated: `npm run prisma:generate`

### 2. Start Frontend Server

Open a **new terminal** and run:
```bash
cd apps/web
npm run dev
```

**Expected Output:**
```
  ▲ Next.js 14.0.4
  - Local:        http://localhost:3000
  - ready started server on 0.0.0.0:3000
```

### 3. Test the Connection

1. Open browser to `http://localhost:3000`
2. Should redirect to `/login`
3. Try logging in with:
   - Email: `admin@example.com`
   - Password: `admin123`

---

## Troubleshooting

### Backend won't start

**Error: "Cannot find module 'dist/main'"**
- Solution: This is normal in watch mode. The server should still start.
- If it doesn't, try: `npm run start:dev` instead

**Error: "Port 3001 already in use"**
- Solution: Find and kill the process using port 3001:
  ```powershell
  netstat -ano | findstr :3001
  taskkill /PID <PID> /F
  ```

**Error: Database connection issues**
- Solution: Make sure database is set up:
  ```bash
  cd apps/api
  npm run prisma:generate
  npm run prisma:migrate
  npm run prisma:seed
  ```

### Frontend can't connect to backend

**Error: "ERR_CONNECTION_REFUSED"**
- ✅ Make sure backend is running on port 3001
- ✅ Check `http://localhost:3001/graphql` loads in browser
- ✅ Verify `.env.local` in `apps/web/` has correct `NEXT_PUBLIC_API_URL` (optional, defaults to localhost:3001)

**Error: CORS errors**
- ✅ Backend CORS is configured for `http://localhost:3000`
- ✅ Check backend logs for CORS errors

---

## Verify Everything is Working

1. **Backend Health Check:**
   - Open `http://localhost:3001/graphql` in browser
   - Should see GraphQL Playground
   - Try running: `{ __typename }`

2. **Frontend Health Check:**
   - Open `http://localhost:3000` in browser
   - Should see login page
   - No console errors

3. **Login Test:**
   - Enter credentials and click "Sign in"
   - Should redirect to dashboard
   - Check browser console for any errors

---

## Running Both Servers

You need **two terminal windows**:

**Terminal 1 (Backend):**
```bash
cd apps/api
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd apps/web
npm run dev
```

Keep both terminals open while developing!
