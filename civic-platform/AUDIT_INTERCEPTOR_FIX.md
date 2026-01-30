# Audit Interceptor Fix

## Issue

Error in audit interceptor:
```
TypeError: Cannot read properties of undefined (reading 'operation')
at audit.interceptor.ts:53:39
```

## Root Cause

The audit interceptor was trying to access `info.operation.operation` without checking if `info` or `info.operation` exists. This can happen when:
1. REST endpoints are called (no GraphQL info)
2. Errors occur before GraphQL context is fully set up
3. Info object is not available in certain error scenarios

## Fix Applied

**File:** `apps/api/src/common/interceptors/audit.interceptor.ts`

### Changes:
1. **Added null check for info** - Skip audit logging if info is not available
2. **Added null check for operation** - Check if `info.operation` exists before accessing
3. **Extracted operationType** - Store operation type in variable to avoid repeated access
4. **Safe error handling** - Only log audit events if info is available

### Code Changes:
```typescript
// Skip audit logging if info is not available (e.g., REST endpoints)
if (!info) {
  return next.handle();
}

// Extract operation type safely
const operationType = info?.operation?.operation || 'UNKNOWN';

// Only log in catchError if info and operation exist
if (info && info.operation) {
  // ... log audit event
}
```

## Result

- ✅ No more crashes when info is undefined
- ✅ REST endpoints work without errors
- ✅ GraphQL errors are handled gracefully
- ✅ Audit logging still works for valid GraphQL operations

---

**Status:** ✅ Fixed - Audit interceptor now handles undefined info gracefully

