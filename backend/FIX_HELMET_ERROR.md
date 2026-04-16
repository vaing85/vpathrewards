# Fix: "Cannot find module 'helmet'" Error

## 🔧 Quick Fix

The error means dependencies aren't installed. Here's how to fix it:

### Step 1: Install All Dependencies

```bash
cd C:\Users\villa\cashback-app\backend
npm install
```

**Wait for it to complete** (takes 1-2 minutes)

### Step 2: Verify Installation

```bash
# Check if helmet is installed
npm list helmet

# Should show: helmet@7.1.0
```

### Step 3: Restart Server

```bash
npm run dev
```

---

## 🐛 If npm install Doesn't Work

### Option 1: Clean Install
```bash
cd backend
Remove-Item package-lock.json -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
```

### Option 2: Install Specific Packages
```bash
cd backend
npm install helmet express-rate-limit express-validator nodemailer
npm install --save-dev @types/helmet @types/express-validator @types/nodemailer
```

### Option 3: Check npm Configuration
```bash
# Check npm version
npm --version

# Clear npm cache
npm cache clean --force

# Then install
npm install
```

---

## ✅ Verification

After installing, verify:

```bash
# Check if node_modules/helmet exists
Test-Path node_modules\helmet

# Should return: True
```

---

## 🚀 Then Start Server

```bash
npm run dev
```

Should now start without the helmet error!

---

## 📝 What Happened?

The `package.json` has helmet listed, but `node_modules` doesn't have it installed. Running `npm install` downloads and installs all packages listed in `package.json`.

---

## 💡 Prevention

Always run `npm install` after:
- Cloning the repository
- Pulling new changes
- Adding new dependencies to package.json
