# TenantId Decorator REST Fix

## Issue

File uploads were timing out with "Headers Timeout Error" because the `@TenantId()` decorator was failing on REST endpoints.

## Root Cause

The `@TenantId()` decorator was using `GqlExecutionContext.create(context)`, which only works for GraphQL endpoints. For REST endpoints, this throws an error, causing the request to hang.

## Fix Applied

**Files:**
- `apps/api/src/common/decorators/tenant.decorator.ts`
- `apps/api/src/common/decorators/current-user.decorator.ts`

### Changes:

1. **Added try-catch for GraphQL context** - Try GraphQL context first, catch if it fails
2. **Added REST context fallback** - Use `context.switchToHttp().getRequest()` for REST endpoints
3. **Applied same fix to CurrentUser decorator** - Ensures consistency

### Code Pattern:
```typescript
// Try GraphQL context first
try {
  const ctx = GqlExecutionContext.create(context);
  const req = ctx.getContext().req;
  // ... get tenantId from GraphQL context
} catch (e) {
  // Not a GraphQL context, try REST context
}

// For REST endpoints, get request directly
const request = context.switchToHttp().getRequest();
// ... get tenantId from REST context
```

## Result

- ✅ Works with GraphQL endpoints
- ✅ Works with REST endpoints
- ✅ File uploads should no longer timeout
- ✅ Both decorators now support both context types

---

**Status:** ✅ Fixed - TenantId and CurrentUser decorators now work with both GraphQL and REST endpoints

