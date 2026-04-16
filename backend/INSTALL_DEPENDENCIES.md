# Install Dependencies - Step by Step

## 🚨 Error: "Cannot find module 'helmet'"

This means the dependencies aren't installed in `node_modules`. Here's how to fix it:

---

## ✅ Solution: Install Dependencies

### Step 1: Open Terminal

Navigate to the backend directory:
```bash
cd C:\Users\villa\cashback-app\backend
```

### Step 2: Install All Dependencies

```bash
npm install
```

**This will:**
- Read `package.json`
- Download all packages listed
- Install them in `node_modules` folder
- Takes 1-2 minutes

**What you should see:**
```
added 250 packages in 30s
```

### Step 3: Verify Installation

```bash
node verify-install.js
```

**Should show:**
```
✅ helmet - INSTALLED
✅ express-rate-limit - INSTALLED
✅ express-validator - INSTALLED
✅ nodemailer - INSTALLED
...
✅ All required packages are installed!
```

### Step 4: Start Server

```bash
npm run dev
```

**Should now work without errors!**

---

## 🐛 If npm install Fails

### Try These Solutions:

#### Solution 1: Clear Cache and Reinstall
```bash
npm cache clean --force
npm install
```

#### Solution 2: Delete and Reinstall
```bash
# Delete node_modules and package-lock.json
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# Reinstall
npm install
```

#### Solution 3: Install Specific Packages
```bash
npm install helmet express-rate-limit express-validator nodemailer
```

#### Solution 4: Check npm Version
```bash
npm --version
# Should be 8+ or 9+

# If old, update npm:
npm install -g npm@latest
```

---

## ✅ Verification Checklist

After running `npm install`, verify:

- [ ] `node_modules` folder exists
- [ ] `node_modules/helmet` folder exists
- [ ] `node_modules/express` folder exists
- [ ] No errors during installation
- [ ] `package-lock.json` was created/updated

---

## 🚀 Quick Command Reference

```bash
# Install all dependencies
npm install

# Verify installation
node verify-install.js

# Start server
npm run dev

# If still errors, clean install:
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

## 💡 Why This Happens

- `package.json` lists what packages you NEED
- `node_modules` contains what packages you HAVE
- `npm install` downloads missing packages
- If `node_modules` is missing or incomplete, you get "module not found" errors

---

## 🎯 Expected Result

After `npm install`:
- ✅ `node_modules` folder created
- ✅ All packages from `package.json` installed
- ✅ Server starts without "module not found" errors
- ✅ Tests can run

---

**Run `npm install` now and let me know if you see any errors!**
