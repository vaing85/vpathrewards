# Authentication Flow Testing Guide

## Prerequisites

1. **Backend Server Running**
   ```bash
   cd apps/api
   npm run dev
   ```
   Should be running on `http://localhost:3001`

2. **Frontend Server Running**
   ```bash
   cd apps/web
   npm run dev
   ```
   Should be running on `http://localhost:3000`

3. **Database Seeded**
   - Default admin user should exist:
     - Email: `admin@example.com`
     - Password: `admin123`

---

## Test Scenarios

### Test 1: Initial Page Load (Not Authenticated)

**Steps:**
1. Open browser to `http://localhost:3000`
2. Clear localStorage (F12 → Application → Local Storage → Clear)

**Expected Result:**
- ✅ Should automatically redirect to `/login`
- ✅ Login page should display
- ✅ No errors in console

---

### Test 2: Login with Valid Credentials

**Steps:**
1. Navigate to `http://localhost:3000/login`
2. Enter credentials:
   - Email: `admin@example.com`
   - Password: `admin123`
3. Click "Sign in" button

**Expected Result:**
- ✅ Button shows "Signing in..." while loading
- ✅ No error messages
- ✅ Automatically redirects to `/dashboard`
- ✅ Dashboard page displays
- ✅ Sidebar shows navigation menu
- ✅ Header shows user name and email
- ✅ User roles displayed as badges

**Verify in Browser DevTools:**
- ✅ Check localStorage:
  - `auth_token` should contain JWT token
  - `auth_user` should contain user object with id, email, name, tenantId, roles
- ✅ Check Network tab:
  - Login mutation should return 200
  - Response should contain `accessToken` and `user` object

---

### Test 3: Verify Authentication State Persistence

**Steps:**
1. After successful login, refresh the page (F5)
2. Or navigate to a different route and back

**Expected Result:**
- ✅ Should stay on dashboard (not redirect to login)
- ✅ User info should still be displayed
- ✅ Token should be verified automatically
- ✅ No loading flicker (if token is valid)

---

### Test 4: Protected Route Access

**Steps:**
1. While logged in, try to access `/dashboard` directly
2. Try accessing `/citations` (should work, even if page not implemented)

**Expected Result:**
- ✅ Should allow access (not redirect to login)
- ✅ Layout with sidebar should be visible
- ✅ User should see protected content

---

### Test 5: Logout Functionality

**Steps:**
1. Click "Sign out" button in sidebar
2. Or manually clear localStorage

**Expected Result:**
- ✅ Should redirect to `/login`
- ✅ localStorage should be cleared (`auth_token` and `auth_user` removed)
- ✅ Apollo cache should be cleared
- ✅ Cannot access protected routes anymore

---

### Test 6: Login with Invalid Credentials

**Steps:**
1. Navigate to `/login`
2. Enter invalid credentials:
   - Email: `wrong@example.com`
   - Password: `wrongpassword`
3. Click "Sign in"

**Expected Result:**
- ✅ Error message should display
- ✅ Should NOT redirect to dashboard
- ✅ Should stay on login page
- ✅ Form should still be accessible

---

### Test 7: Token Expiration Handling

**Steps:**
1. Login successfully
2. Manually modify token in localStorage to be invalid
3. Try to access a protected route or make a GraphQL query

**Expected Result:**
- ✅ Should automatically redirect to `/login`
- ✅ localStorage should be cleared
- ✅ Error should be logged in console (for debugging)

---

### Test 8: Direct Navigation to Protected Route (Not Logged In)

**Steps:**
1. Clear localStorage
2. Navigate directly to `http://localhost:3000/dashboard`

**Expected Result:**
- ✅ Should automatically redirect to `/login`
- ✅ After login, should redirect back to `/dashboard`

---

## Browser DevTools Checks

### Network Tab
- ✅ Login mutation should be sent to `http://localhost:3001/graphql`
- ✅ Request headers should include `Content-Type: application/json`
- ✅ Response should contain `accessToken` and `user` object
- ✅ Subsequent requests should include `Authorization: Bearer <token>` header

### Application Tab → Local Storage
- ✅ `auth_token`: JWT token string
- ✅ `auth_user`: JSON string with user object

### Console Tab
- ✅ No errors should appear
- ✅ GraphQL errors should be logged (if any)
- ✅ Network errors should be logged (if any)

---

## Common Issues & Solutions

### Issue: "Cannot read property 'name' of null"
**Solution:** UserOutput was missing `name` field - should be fixed now

### Issue: "Unauthorized" errors
**Solution:** 
- Check token is being sent in headers
- Verify backend is running
- Check token format in localStorage

### Issue: Infinite redirect loop
**Solution:**
- Clear localStorage
- Check AuthContext is properly initialized
- Verify token verification logic

### Issue: Token not persisting
**Solution:**
- Check localStorage is enabled in browser
- Verify no browser extensions blocking localStorage
- Check for CORS issues

---

## GraphQL Playground Test

You can also test the login mutation directly in GraphQL Playground:

1. Open `http://localhost:3001/graphql`
2. Run this mutation:
```graphql
mutation {
  login(input: {
    email: "admin@example.com"
    password: "admin123"
  }) {
    accessToken
    user {
      id
      email
      name
      tenantId
      roles
    }
  }
}
```

**Expected Result:**
- ✅ Should return accessToken and user object
- ✅ User should have name, email, tenantId, and roles

---

## Success Criteria

✅ All 8 test scenarios pass
✅ No console errors
✅ Token persists across page refreshes
✅ Protected routes work correctly
✅ Logout clears all auth data
✅ Error handling works for invalid credentials

---

**Ready to test!** 🚀
