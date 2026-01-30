# Quick Start: MongoDB Atlas Setup (5 Minutes)

## Step-by-Step Guide

### 1. Create Free Atlas Account
- Visit: https://www.mongodb.com/cloud/atlas/register
- Sign up (no credit card needed for free tier)

### 2. Create Cluster (3-5 minutes)
- Click "Build a Database"
- Select **FREE (M0) Shared** tier
- Choose region closest to you
- Click "Create Cluster"

### 3. Create Database User
- Go to "Database Access" → "Add New Database User"
- Username: `casino-admin` (or any name)
- Password: Create a strong password (SAVE THIS!)
- Privileges: "Atlas admin"
- Click "Add User"

### 4. Whitelist IP Address
- Go to "Network Access" → "Add IP Address"
- Click "Allow Access from Anywhere" (adds `0.0.0.0/0`)
- Click "Confirm"
- ⚠️ **Note:** This allows access from anywhere. For production, use specific IPs.

### 5. Get Connection String
- Go to "Database" → Click "Connect" on your cluster
- Choose "Connect your application"
- Copy the connection string
- It looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

### 6. Update server/.env File

Create or edit `server/.env`:

```env
MONGODB_URI=mongodb+srv://casino-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/casino?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-change-this-in-production
PORT=5000
```

**Important:** 
- Replace `YOUR_PASSWORD` with the password you created in step 3
- Replace `cluster0.xxxxx` with your actual cluster address
- The `/casino` part is your database name

### 7. Test It!

Run your server:
```powershell
npm run server
```

You should see: `MongoDB connected` ✅

---

## Why Atlas is Better for Testing

✅ **No Installation** - Works immediately  
✅ **Free Forever** - 512MB storage (plenty for testing)  
✅ **Access Anywhere** - Test from any device  
✅ **Easy Reset** - Just delete and recreate cluster  
✅ **No Local Setup** - No Windows services or configuration  

---

## Troubleshooting

**"Authentication failed"**
- Check username/password in connection string
- Make sure you URL-encoded special characters in password

**"IP not whitelisted"**
- Go to Network Access and add `0.0.0.0/0` for testing

**"Connection timeout"**
- Check if cluster is running (not paused)
- Verify connection string format

---

## That's It!

Your casino game platform is now ready to use with MongoDB Atlas! 🎰

