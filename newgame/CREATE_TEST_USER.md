# Create Test User

## Issue
The database has no users, so login will fail. You need to create a user first.

## Option 1: Register via Web Interface (Recommended)
1. Go to http://localhost:3000
2. Click "Register" 
3. Create an account with:
   - Username: `player` (or any username)
   - Email: `player@test.com`
   - Password: `player123`
4. You'll automatically get $1000 starting balance

## Option 2: Create User via Script
Run this command to create a test user:

```powershell
cd server
node -e "require('dotenv').config(); const mongoose = require('mongoose'); const User = require('./models/User'); (async () => { await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/casino'); const user = new User({ username: 'player', email: 'player@test.com', password: 'player123', balance: 1000, role: 'player' }); await user.save(); console.log('✅ User created:', user.email); process.exit(0); })();"
```

## Option 3: Use MongoDB Shell
If you have MongoDB shell access:

```javascript
use casino
db.users.insertOne({
  username: "player",
  email: "player@test.com",
  password: "$2a$10$...", // You'll need to hash the password
  balance: 1000,
  role: "player"
})
```

**Note:** Option 1 (Register) is easiest as it handles password hashing automatically.

## After Creating User
Once you have a user, you can log in with:
- Email: `player@test.com`
- Password: `player123`

## Status Code Fix
✅ Fixed: Login now returns **401 Unauthorized** instead of 400 Bad Request for invalid credentials (security best practice).

