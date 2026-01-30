# File Upload Status Check

## Current Status

✅ **Fixes Applied:**
1. GraphQL 400 errors fixed (removed `filter: undefined`)
2. Multer file size limits added
3. Improved error handling and logging
4. Citation relations added (violations, cases)

## Test File Upload

### Via UI (Recommended)
1. Go to: http://localhost:3000/documents/new
2. Select a Citation or Case
3. Choose a file (start with small text file)
4. Click Upload
5. Check:
   - Browser console (F12) for logs
   - Network tab for request/response
   - Backend terminal for logs

### Via Script
```powershell
cd apps/api
node test-single-file.js test-document.txt text/plain
```

## What to Check

### Backend Terminal Should Show:
```
[Upload] Starting upload for file: ...
[Upload] File stored at: ...
[Upload] Document record created: ...
```

### Browser Console Should Show:
```
[Upload] Starting file upload...
[Upload] Response status: 200
[Upload] Upload successful: {...}
```

### If Errors Occur:
- **400 Bad Request:** Check error message in response
- **401 Unauthorized:** Check authentication token
- **500 Server Error:** Check backend terminal for details
- **ECONNRESET:** Check if backend server is running

## Common Issues

### "No file provided"
- File not selected
- FormData not created correctly

### "entityType and entityId are required"
- Entity not selected in dropdown
- Form data not being sent

### Connection reset
- Backend server crashed
- Check backend terminal for errors
- Restart backend server

---

**The 404 for `.well-known/appspecific/com.chrome.devtools.json` is normal and can be ignored.**

Try uploading a file now and let me know what happens!

