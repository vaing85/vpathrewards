# File Upload Freeze - Debugging Guide

## Quick Debug Steps

### 1. Check Backend Terminal

When you try to upload, you should see logs like:
```
[Upload] Starting upload for file: test.pdf, size: 1234, type: application/pdf
[Upload] File stored at: uploads/...
[Upload] Document record created: ...
```

**If you don't see these logs:**
- Request might not be reaching the backend
- Check CORS settings
- Check authentication

**If you see an error:**
- Note the error message
- Check file permissions
- Check disk space

### 2. Check Browser Console (F12)

You should see:
```
[Upload] Starting file upload...
[Upload] Response status: 200
[Upload] Upload successful: {...}
```

**If you see an error:**
- Note the error message
- Check the Network tab for details

### 3. Check Network Tab (F12 → Network)

1. Open DevTools → Network tab
2. Try uploading a file
3. Find the `/documents/upload` request
4. Check:
   - **Status:** Should be 200 (success) or 4xx/5xx (error)
   - **Response:** Click to see response body
   - **Headers:** Check request/response headers

**Common Status Codes:**
- **200:** Success
- **400:** Bad Request (validation error)
- **401:** Unauthorized (not logged in)
- **500:** Server Error (check backend logs)

### 4. Check File Permissions

```powershell
# Check if uploads directory exists and is writable
cd apps/api
Test-Path uploads
Get-ChildItem uploads -ErrorAction SilentlyContinue
```

### 5. Test with Small File First

Try uploading a very small text file (< 1KB) to rule out:
- File size issues
- Timeout issues
- Network issues

## Common Issues & Fixes

### Issue: Request Hangs Forever

**Possible Causes:**
1. Error not being thrown properly
2. Async operation not completing
3. Database connection issue

**Fix:**
- Check backend terminal for errors
- Check if database is accessible
- Try restarting backend server

### Issue: "No file provided"

**Possible Causes:**
1. File input not working
2. FormData not being created correctly

**Fix:**
- Check file input element
- Verify file is selected
- Check browser console for errors

### Issue: "entityType and entityId are required"

**Possible Causes:**
1. Form data not being sent
2. Body parser not working

**Fix:**
- Check form data is being appended
- Verify entity is selected
- Check Network tab for request body

### Issue: "File upload failed: ..."

**Possible Causes:**
1. Directory creation failed
2. File write permission denied
3. Disk space full

**Fix:**
- Check file permissions
- Check disk space
- Check uploads directory exists

## Testing Checklist

- [ ] Backend server is running
- [ ] Frontend server is running
- [ ] You are logged in
- [ ] File is selected
- [ ] Entity (Citation/Case) is selected
- [ ] Backend terminal shows logs
- [ ] Browser console shows logs
- [ ] Network tab shows request

## Next Steps

1. **Try uploading again** with the improved error handling
2. **Check backend terminal** for detailed logs
3. **Check browser console** for detailed logs
4. **Check Network tab** for request/response
5. **Share the error messages** you see

---

**The improved error handling should now show exactly where the issue is!**

