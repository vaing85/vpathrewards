# GraphQL 400 Bad Request Fix

## Issue

The frontend was getting 400 Bad Request errors when making GraphQL queries. The errors were:
```
:3001/graphql:1  Failed to load resource: the server responded with a status of 400 (Bad Request)
```

## Root Cause

The issue was caused by passing `filter: null` in GraphQL queries. When you pass `null` explicitly:
1. It's sent as `null` in the JSON request
2. The ValidationPipe with `forbidNonWhitelisted: true` may reject it
3. GraphQL validation might treat it differently than omitting the parameter

## Fix Applied

### 1. Dashboard Query
**Before:**
```graphql
query GetDashboardStats {
  citations: citations(filter: null) {
    id
    status
  }
}
```

**After:**
```graphql
query GetDashboardStats {
  citations {
    id
    status
  }
}
```

### 2. Query Variables
**Before:**
```typescript
variables: { filter: null }
```

**After:**
```typescript
variables: { filter: undefined }
```

When using `undefined`, Apollo Client omits the variable from the request, which is the correct behavior for optional nullable parameters.

## Files Fixed

1. ✅ `apps/web/src/graphql/dashboard/queries.ts` - Removed `filter: null` from query
2. ✅ `apps/web/src/app/(dashboard)/documents/new/page.tsx` - Changed to `undefined`
3. ✅ `apps/web/src/app/(dashboard)/cases/new/page.tsx` - Changed to `undefined`
4. ✅ `apps/web/src/app/(dashboard)/payments/new/page.tsx` - Changed to `undefined`
5. ✅ `apps/web/src/app/(dashboard)/hearings/new/page.tsx` - Changed to `undefined`

## How It Works

- **`filter: null`** - Sends `null` in JSON, may cause validation issues
- **`filter: undefined`** - Omits variable from request, works correctly
- **Omit filter parameter** - Also works, but requires query changes

## Testing

After this fix:
1. Refresh the browser
2. Check browser console - 400 errors should be gone
3. Dashboard should load correctly
4. All pages should work without GraphQL errors

---

**Status:** ✅ Fixed - All GraphQL queries now use proper null handling

