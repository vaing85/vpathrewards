# Manual Testing Instructions

Since automated tests require the server to be running, follow these steps:

## Step 1: Start Backend Server

```bash
cd backend
npm run dev
```

Wait for: `🚀 Server running on http://localhost:3001`

## Step 2: Test Health Endpoint

Open browser or use curl:
```
http://localhost:3001/api/health
```

Expected: `{"status":"ok","message":"Cashback API is running"}`

## Step 3: Test in Browser

1. Start frontend: `cd frontend && npm run dev`
2. Open: `http://localhost:3000`
3. Follow MANUAL_TEST_CHECKLIST.md

## Step 4: Test API Endpoints

Use Postman, curl, or browser:

### Public Endpoints (No Auth)
- GET `http://localhost:3001/api/health`
- GET `http://localhost:3001/api/merchants`
- GET `http://localhost:3001/api/offers`

### User Endpoints (Need Token)
1. Register: POST `http://localhost:3001/api/auth/register`
   ```json
   {
     "email": "test@example.com",
     "password": "Test123!",
     "name": "Test User"
   }
   ```

2. Login: POST `http://localhost:3001/api/auth/login`
   ```json
   {
     "email": "test@example.com",
     "password": "Test123!"
   }
   ```

3. Use token in header: `Authorization: Bearer <token>`

### Admin Endpoints
- POST `http://localhost:3001/api/admin/auth/login`
  ```json
  {
    "email": "admin@cashback.com",
    "password": "admin123"
  }
  ```

## Common Issues

### Server Won't Start
- Check if port 3001 is in use
- Verify .env file exists
- Check database file permissions

### Tests Fail
- Ensure server is running
- Check CORS settings
- Verify database initialized
