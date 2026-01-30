# Debugging 400 Error

## Current Status

User is getting 400 Bad Request error when uploading files.

## Added Debugging

**File:** `apps/api/src/modules/documents/documents.controller.ts`

### Changes:
1. **Added detailed logging** - Log all parameters at the start
2. **Disabled ValidationPipe transform** - Prevents validation conflicts with multipart/form-data
3. **Better error messages** - Show what values were received

### Logs Added:
- Request received
- File info (name, size)
- entityType value
- entityId value
- tenantId value
- user info

## Next Steps

1. **Restart backend server** to apply changes
2. **Try uploading again** (via UI or script)
3. **Check backend terminal** for the detailed logs
4. **Share the error message** from:
   - Backend terminal logs
   - Browser console (if using UI)
   - Network tab response body

## What to Look For

The logs will show:
- Is the file being received?
- Are entityType and entityId being parsed correctly?
- Is tenantId being extracted?
- Is user authenticated?

This will help identify exactly where the 400 error is coming from.

---

**Status:** Added debugging. Restart server and check logs for details.

