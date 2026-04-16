# Quick Start Guide

## Installation & Setup

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

## Running the Application

### Option 1: Run Both Servers Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend will run on: http://localhost:3001

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will run on: http://localhost:3000

### Option 2: Use PowerShell to Run Both

Open PowerShell in the project root and run:

```powershell
# Start backend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# Start frontend
cd frontend
npm run dev
```

## First Steps

1. **Open your browser** and navigate to `http://localhost:3000`
2. **Register a new account** or use the login page
3. **Browse merchants and offers** on the homepage
4. **View your dashboard** to see earnings (after logging in)
5. **Click on offers** to see details and activate them

## Sample Data

The app comes pre-loaded with:
- 5 sample merchants (Amazon, Target, Best Buy, Walmart, Nike)
- Multiple cashback offers for each merchant
- Sample cashback rates ranging from 2.5% to 6%

## Testing Cashback Tracking

To simulate a cashback transaction (after logging in), you can use the API directly:

```bash
# Replace YOUR_TOKEN with the JWT token from login
# Replace OFFER_ID with an actual offer ID (1-5)
curl -X POST http://localhost:3001/api/cashback/track \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"offer_id": 1, "amount": 100}'
```

Or use the browser console on the dashboard page:
```javascript
fetch('/api/cashback/track', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ offer_id: 1, amount: 100 })
})
.then(r => r.json())
.then(console.log);
```

## Troubleshooting

### Database Issues
- If you see database errors, delete `cashback.db` in the backend folder and restart the server
- The database will be automatically recreated with sample data

### Port Already in Use
- Change the PORT in `backend/.env` if 3001 is taken
- Update `frontend/vite.config.ts` proxy target if you change the backend port

### CORS Errors
- Make sure the backend is running before starting the frontend
- Check that the proxy configuration in `vite.config.ts` matches your backend port

## Next Steps

- Integrate with real affiliate networks (Rakuten, Commission Junction, etc.)
- Add payment processing for withdrawals
- Implement email notifications
- Build an admin dashboard for managing merchants/offers
