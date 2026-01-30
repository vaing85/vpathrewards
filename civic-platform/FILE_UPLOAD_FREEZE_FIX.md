# File Upload Freeze Fix

## Issue

File uploads are freezing or not completing. The UI shows "uploading" but never finishes.

## Potential Causes

1. **Error not being caught properly** - Generic Error instead of HttpException
2. **File path issues** - Path generation or directory creation failing
3. **Missing error handling** - Frontend not receiving error responses
4. **Timeout issues** - Request timing out without proper error

## Fixes Applied

### 1. Improved Error Handling in Controller

**File:** `apps/api/src/modules/documents/documents.controller.ts`

- Added try-catch block around entire upload process
- Added console logging for debugging
- Better error messages
- Proper exception types

### 2. Improved Error Handling in Storage Service

**File:** `apps/api/src/common/storage/local-storage.service.ts`

- Better error message extraction
- Stack trace logging
- More descriptive error messages

### 3. Improved Frontend Error Handling

**File:** `apps/web/src/app/(dashboard)/documents/new/page.tsx`

- Added console logging for debugging
- Better error message extraction
- Handles non-JSON error responses
- Removed Content-Type header (browser sets it for FormData)

## Debugging Steps

### Check Backend Logs

When uploading, check the backend terminal for:
- `[Upload] Starting upload for file: ...`
- `[Upload] File stored at: ...`
- `[Upload] Document record created: ...`
- Any error messages

### Check Browser Console

Open browser console (F12) and look for:
- `[Upload] Starting file upload...`
- `[Upload] Response status: ...`
- `[Upload] Upload successful: ...`
- Any error messages

### Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try uploading a file
4. Look for the `/documents/upload` request
5. Check:
   - Request status (200, 400, 500, etc.)
   - Response body
   - Request/Response headers

## Common Issues

### Issue: "No file provided"
- **Cause:** File not being sent in FormData
- **Fix:** Check file input is working

### Issue: "entityType and entityId are required"
- **Cause:** Form data not being parsed correctly
- **Fix:** Check FormData is being sent correctly

### Issue: "File upload failed: ..."
- **Cause:** Storage service error
- **Fix:** Check file permissions, disk space, directory creation

### Issue: Request hangs/timeout
- **Cause:** Error not being thrown properly
- **Fix:** Check backend logs for actual error

## Testing

1. **Try uploading a small text file** (< 1KB)
2. **Check backend terminal** for logs
3. **Check browser console** for logs
4. **Check Network tab** for request/response

## Next Steps

If still freezing:
1. Check backend terminal for errors
2. Check browser console for errors
3. Check Network tab for request details
4. Verify file permissions on uploads directory
5. Check disk space

---

**Status:** Improved error handling and logging added. Check logs to identify the actual issue.

