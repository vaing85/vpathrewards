# How to Change User Role in MongoDB

There are **3 ways** to change a user's role. Choose the method that's easiest for you:

---

## Method 1: Using the Helper Script (Easiest) ⭐

I've created a script that makes it super easy!

### Step 1: List all users to find the email
```powershell
cd server
node scripts/listUsers.js
```

This will show you all users with their emails.

### Step 2: Change the role
```powershell
node scripts/changeUserRole.js <email> <role>
```

**Examples:**
```powershell
# Make a user an admin
node scripts/changeUserRole.js user@example.com admin

# Change admin back to player
node scripts/changeUserRole.js user@example.com player
```

That's it! The script will connect to your MongoDB and update the role.

---

## Method 2: Using MongoDB Atlas Web Interface

### Step 1: Go to MongoDB Atlas
1. Log in to https://cloud.mongodb.com
2. Click on your cluster
3. Click "Browse Collections"

### Step 2: Find your database
1. Click on the `casino` database
2. Click on the `users` collection

### Step 3: Find and edit the user
1. Find the user document by their email
2. Click on the document to edit it
3. Find the `role` field
4. Change it from `"player"` to `"admin"` (or vice versa)
5. Click "Update" to save

**Important:** Make sure the role value is exactly `"admin"` or `"player"` (with quotes in JSON).

---

## Method 3: Using Admin Dashboard (After you're already admin)

If you're already an admin, you can use the admin dashboard to change roles. I'll add this feature to the admin dashboard UI.

---

## Quick Start: Make Yourself Admin

1. **First, register/login** to create your account
2. **Note your email** from the registration
3. **Run the script:**
   ```powershell
   cd server
   node scripts/changeUserRole.js your-email@example.com admin
   ```
4. **Logout and login again** - you'll now see the admin dashboard!

---

## Troubleshooting

### "User not found"
- Make sure you're using the exact email address (case-sensitive)
- Run `node scripts/listUsers.js` to see all users

### "Connection error"
- Make sure your `.env` file has the correct MongoDB URI
- Make sure MongoDB Atlas IP whitelist includes your IP

### "Invalid role"
- Role must be exactly `admin` or `player` (lowercase)

---

## Need Help?

If you're still having trouble, you can:
1. Check the script output for error messages
2. Verify your MongoDB connection string in `server/.env`
3. Make sure you're using the correct email address

