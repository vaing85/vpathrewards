# MongoDB Setup Guide

## Option 1: MongoDB Atlas (Recommended for Testing) ⭐

MongoDB Atlas is a cloud-hosted MongoDB service with a free tier - perfect for testing and development!

### Step 1: Create Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up for a free account (no credit card required for free tier)

### Step 2: Create a Free Cluster
1. After logging in, click "Build a Database"
2. Choose the **FREE (M0) Shared** tier
3. Select a cloud provider and region (choose closest to you)
4. Click "Create" (takes 3-5 minutes)

### Step 3: Create Database User
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Enter a username and password (save these!)
5. Set privileges to "Atlas admin" or "Read and write to any database"
6. Click "Add User"

### Step 4: Whitelist Your IP Address
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. For testing, you can click "Allow Access from Anywhere" (adds 0.0.0.0/0)
   - **Note:** For production, only add specific IPs
4. Click "Confirm"

### Step 5: Get Connection String
1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string (looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)

### Step 6: Update Your .env File
1. Open `server/.env`
2. Replace the connection string:
```
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/casino?retryWrites=true&w=majority
```
   - Replace `your-username` with your database username
   - Replace `your-password` with your database password
   - Replace `cluster0.xxxxx` with your actual cluster address
   - The `/casino` part is the database name (you can change it)

### Step 7: Test Connection
Run your server and check if it connects successfully!

---

## Option 2: Local MongoDB Installation

### Windows Installation

1. **Download MongoDB Community Server**
   - Go to https://www.mongodb.com/try/download/community
   - Select Windows, MSI package
   - Download and run the installer

2. **Installation Options**
   - Choose "Complete" installation
   - Install as a Windows Service (recommended)
   - Install MongoDB Compass (GUI tool - optional but helpful)

3. **Verify Installation**
   ```powershell
   mongod --version
   ```

4. **Start MongoDB Service**
   - MongoDB should start automatically as a Windows service
   - Or manually start: Open Services, find "MongoDB", and start it

5. **Test Connection**
   - Your `.env` file should have: `MONGODB_URI=mongodb://localhost:27017/casino`
   - This should work out of the box!

### Alternative: MongoDB via Docker (If you have Docker)

```powershell
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

Then use: `MONGODB_URI=mongodb://localhost:27017/casino`

---

## Comparison for Testing

| Feature | Atlas (Cloud) | Local MongoDB |
|---------|---------------|---------------|
| **Setup Time** | 10-15 minutes | 30-60 minutes |
| **Installation** | None needed | Requires download/install |
| **Free Tier** | ✅ 512MB free | ✅ Free forever |
| **Internet Required** | ✅ Yes | ❌ No |
| **Easy to Reset** | ✅ Just delete cluster | ⚠️ Need to drop database |
| **Multiple Devices** | ✅ Works anywhere | ❌ Only on one machine |
| **Best For** | Testing, Development | Production, Offline |

---

## Recommendation for Testing

**Use MongoDB Atlas** because:
- ✅ No installation needed
- ✅ Free tier is perfect for testing
- ✅ Easy to share with team members
- ✅ Can access from any device
- ✅ Easy to reset/clean up data
- ✅ No local configuration issues

---

## Quick Atlas Setup Checklist

- [ ] Create Atlas account
- [ ] Create free M0 cluster
- [ ] Create database user (save credentials!)
- [ ] Whitelist IP (0.0.0.0/0 for testing)
- [ ] Get connection string
- [ ] Update `server/.env` with connection string
- [ ] Test connection by running server

---

## Troubleshooting

### Atlas Connection Issues
- Make sure IP is whitelisted (0.0.0.0/0 for testing)
- Check username/password in connection string
- Verify cluster is running (not paused)

### Local MongoDB Issues
- Check if MongoDB service is running
- Verify port 27017 is not blocked by firewall
- Check MongoDB logs for errors

### Connection String Format
**Atlas:**
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

**Local:**
```
mongodb://localhost:27017/database
```

---

## Need Help?

If you run into issues, check:
1. MongoDB Atlas status page
2. Connection string format
3. Network/firewall settings
4. Server logs for specific error messages

