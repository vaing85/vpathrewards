# Quick Setup Guide

## Step 1: Install Dependencies

Run this command from the root directory to install all dependencies:

```powershell
npm run install-all
```

Or install manually:
```powershell
npm install
cd server
npm install
cd ../client
npm install
cd ..
```

## Step 2: Set Up Environment Variables

1. Navigate to the `server` folder
2. Create a `.env` file (or copy from `.env.example` if it exists)
3. Add the following:
```
MONGODB_URI=mongodb://localhost:27017/casino
JWT_SECRET=your-secret-key-change-this-in-production
PORT=5000
```

## Step 3: Start MongoDB

Make sure MongoDB is running on your system. If you don't have MongoDB installed:

**Option A: Install MongoDB locally**
- Download from https://www.mongodb.com/try/download/community
- Start the MongoDB service

**Option B: Use MongoDB Atlas (Cloud)**
- Sign up at https://www.mongodb.com/cloud/atlas
- Get your connection string
- Update `MONGODB_URI` in `server/.env`

## Step 4: Run the Application

### Development Mode (Recommended)
This runs both server and client simultaneously:

```powershell
npm run dev
```

### Or Run Separately

**Terminal 1 - Server:**
```powershell
npm run server
```

**Terminal 2 - Client:**
```powershell
npm run client
```

## Step 5: Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

## Step 6: Create Your First Account

1. Go to http://localhost:3000
2. Click "Register"
3. Create a player account
4. You'll start with $1000 balance

## Step 7: Create an Admin Account (Optional)

To create an admin user, you can:

1. Register a new account
2. Connect to MongoDB and update the role:
```javascript
use casino
db.users.updateOne({email: "your-email@example.com"}, {$set: {role: "admin"}})
```

Or use MongoDB Compass or any MongoDB client to update the user document.

## Troubleshooting

### Port Already in Use
If port 5000 or 3000 is already in use:
- Change `PORT` in `server/.env` for the backend
- Set `PORT=3001` in your environment for the frontend (or modify `client/package.json`)

### MongoDB Connection Error
- Make sure MongoDB is running
- Check your `MONGODB_URI` in `server/.env`
- If using MongoDB Atlas, ensure your IP is whitelisted

### Module Not Found Errors
- Make sure you've run `npm install` in all directories (root, server, client)
- Delete `node_modules` and `package-lock.json`, then reinstall

## Features to Try

1. **Video Slots** - Click on the slots game card, set your bet, and spin!
2. **Blackjack** - Play against the dealer with standard blackjack rules
3. **Bingo** - Match numbers on your card to win
4. **Player Dashboard** - View your stats, deposit/withdraw funds
5. **Admin Dashboard** - (If admin) Manage users and view platform statistics

Enjoy your casino game platform! 🎰

