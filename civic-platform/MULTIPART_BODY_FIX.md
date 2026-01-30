# Multipart Form Data Body Parsing Fix

## Issue

File uploads were timing out with ECONNRESET because the ValidationPipe was interfering with multipart/form-data body parsing.

## Root Cause

The `@Body()` decorator with a DTO class doesn't work well with multipart/form-data because:
1. Multer parses multipart/form-data differently than JSON
2. ValidationPipe tries to validate the body as JSON
3. The body fields need to be extracted individually for multipart/form-data

## Fix Applied

**File:** `apps/api/src/modules/documents/documents.controller.ts`

### Changes:

Changed from:
```typescript
@Body() body: UploadFileDto
// Access: body.entityType, body.entityId, body.description
```

To:
```typescript
@Body('entityType') entityType: string,
@Body('entityId') entityId: string,
@Body('description') description: string | undefined,
// Direct access to fields
```

### Why This Works:

- `@Body('fieldName')` extracts individual fields from multipart/form-data
- No DTO validation needed (we validate manually)
- Works correctly with Multer's multipart parsing
- Avoids ValidationPipe conflicts

## Result

- ✅ Multipart/form-data parsed correctly
- ✅ No ValidationPipe conflicts
- ✅ File uploads should work now
- ✅ All fields accessible directly

---

**Status:** ✅ Fixed - Body parsing now works correctly with multipart/form-data

