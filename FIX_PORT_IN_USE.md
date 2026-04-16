# Fix Port 3001 Already in Use 🔧

## 🐛 Error
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Problem:** Another process is already using port 3001.

---

## ✅ Solution Options

### Option 1: Kill the Existing Process (Recommended)

**Step 1: Find the Process ID**
```powershell
netstat -ano | findstr ":3001"
```

**Step 2: Kill the Process**
```powershell
# Replace PID with the number from Step 1
taskkill /PID <PID> /F
```

**Or use this one-liner:**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
```

---

### Option 2: Find and Kill Node Processes

**Kill all Node processes:**
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

**Then restart server:**
```bash
cd backend
npm run dev
```

---

### Option 3: Use a Different Port (Temporary)

**Edit `.env` file:**
```env
PORT=3002
```

**Then restart server**

---

## 🚀 Quick Fix Command

**Run this in PowerShell:**
```powershell
# Kill process on port 3001
$process = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($process) {
    Stop-Process -Id $process.OwningProcess -Force
    Write-Host "Killed process on port 3001"
} else {
    Write-Host "No process found on port 3001"
}
```

**Then restart server:**
```bash
cd backend
npm run dev
```

---

## ✅ Verify Port is Free

**Check if port is available:**
```powershell
netstat -ano | findstr ":3001"
```

**If nothing shows, port is free!**

---

## 🔄 After Fixing

1. ✅ Port 3001 is free
2. ✅ Start server: `npm run dev`
3. ✅ Server should start successfully
4. ✅ Run tests: `npm run test:flows`

---

**Run the kill command above, then restart the server!** 🚀
