# ECONNRESET Error Fix

## Issue

File uploads are failing with `ECONNRESET` error:
```
TypeError: fetch failed
[cause]: Error: read ECONNRESET
```

## Root Cause

The connection is being reset during file upload. This can happen due to:
1. **Missing Multer file size limits** - Multer might be rejecting large files
2. **Backend server crash** - Unhandled error causing server to crash
3. **Request timeout** - Upload taking too long
4. **File stream issue** - Problem reading file stream

## Fix Applied

### 1. Added Multer Configuration

**File:** `apps/api/src/modules/documents/documents.controller.ts`

Added explicit file size limit to FileInterceptor:
```typescript
@UseInterceptors(
  FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  })
)
```

This ensures Multer properly handles file size limits and provides better error messages.

## Additional Checks

### Check Backend Server

1. **Is the server running?**
   ```powershell
   # Check if port 3001 is in use
   netstat -ano | findstr :3001
   ```

2. **Check backend logs** for errors:
   - Look for crash messages
   - Look for file upload errors
   - Check for database connection issues

### Check File Size

The test file should be small (< 1KB for text files). If testing with larger files:
- Ensure file is < 10MB
- Check disk space
- Check file permissions

### Test with UI Instead

If the script continues to fail, try uploading via the UI:
1. Go to: http://localhost:3000/documents/new
2. Select file
3. Upload
4. Check browser console and Network tab

## Next Steps

1. **Restart backend server** to apply Multer configuration
2. **Try upload again** via script or UI
3. **Check backend terminal** for detailed error messages
4. **Check browser console** if using UI

---

**Status:** Added Multer file size limits. Restart backend and try again.

