# Debugging 400 Bad Request Errors

## Common Causes of 400 Errors

### 1. **Missing or Invalid Token**
- **Symptom**: Authorization header contains "Bearer null" or "Bearer undefined"
- **Solution**: Ensure you're logged in and token is stored correctly
- **Check**: Open browser console and check `localStorage.getItem('accessToken')`

### 2. **Validation Errors**
Common validation failures that return 400:
- **Bet validation**: Bet amount missing, not a number, or outside min/max range
- **Amount validation**: Amount missing, invalid format, or outside limits
- **Missing required fields**: Request body missing required parameters

### 3. **Request Format Issues**
- Invalid JSON in request body
- Missing Content-Type header
- Incorrect data types

## How to Debug

### Step 1: Check Browser Console
Open browser DevTools (F12) and check:
1. **Console tab**: Look for error messages
2. **Network tab**: 
   - Find the failed request (red status)
   - Check the **Request** payload
   - Check the **Response** for error message

### Step 2: Check Server Logs
The server should log errors. Check the terminal where the server is running for:
```
Server error: { message: ..., url: ..., method: ... }
```

### Step 3: Verify Token
In browser console, run:
```javascript
localStorage.getItem('accessToken') || localStorage.getItem('token')
```
Should return a JWT token string, not null.

### Step 4: Check Request Details
In Network tab, click on the failed request and check:
- **Headers**: Is Authorization header present and valid?
- **Payload**: Is the request body correct?
- **Response**: What's the error message?

## Common Fixes

### If Token is Missing:
1. Log out and log back in
2. Clear localStorage: `localStorage.clear()`
3. Refresh the page

### If Validation Error:
Check the error message in the response:
- "Bet amount is required" → Ensure `bet` is in request body
- "Amount must be a number" → Check data type
- "Minimum bet is $5" → Increase bet amount

### If Request Format Error:
- Ensure request body is valid JSON
- Check that all required fields are present
- Verify data types match expected format

## Enhanced Error Logging

The axios interceptor now logs detailed information for 400 errors:
- URL and method
- Request data
- Response error message
- Full response data

Check the browser console for these details when a 400 error occurs.

