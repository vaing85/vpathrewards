# Testing Guide - Critical User Flows

## 🎯 Testing Overview

This guide covers testing all critical user flows to ensure the app is ready for production.

---

## 📋 Pre-Testing Setup

### 1. Start Services
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 2. Test Accounts
- **Admin**: admin@cashback.com / admin123
- **Test User**: Create via registration flow

### 3. Test Data
- Ensure sample merchants and offers exist
- Check database is initialized

---

## 🔍 Critical User Flows

### Flow 1: User Registration & Login ✅

#### Test Steps:
1. **Registration**
   - [ ] Navigate to `/register`
   - [ ] Fill in email, password, name
   - [ ] Submit form
   - [ ] Verify redirect to login or dashboard
   - [ ] Check welcome email received (if SMTP configured)
   - [ ] Verify user appears in admin panel

2. **Login**
   - [ ] Navigate to `/login`
   - [ ] Enter credentials
   - [ ] Submit form
   - [ ] Verify redirect to dashboard
   - [ ] Check JWT token stored
   - [ ] Verify user data loaded

3. **Logout**
   - [ ] Click logout
   - [ ] Verify token cleared
   - [ ] Verify redirect to home

#### Expected Results:
- ✅ User can register successfully
- ✅ User can login with correct credentials
- ✅ User cannot login with wrong credentials
- ✅ JWT token works for authenticated requests
- ✅ Logout clears session

#### Common Issues:
- Email validation not working
- Password requirements not enforced
- Token not persisting
- Redirect not working

---

### Flow 2: Browse & Search Merchants/Offers ✅

#### Test Steps:
1. **Homepage**
   - [ ] Navigate to `/`
   - [ ] Verify featured offers display
   - [ ] Verify trending merchants display
   - [ ] Verify recent offers display
   - [ ] Check all images load

2. **Search**
   - [ ] Use search bar
   - [ ] Search for merchant name
   - [ ] Search for category
   - [ ] Verify results display
   - [ ] Test filters (category, cashback rate)
   - [ ] Test sorting options

3. **Category Browsing**
   - [ ] Click category from navbar
   - [ ] Verify category page loads
   - [ ] Verify offers filtered by category
   - [ ] Test sorting within category

4. **Merchant Detail**
   - [ ] Click on merchant
   - [ ] Verify merchant details page
   - [ ] Verify offers for merchant
   - [ ] Test favorite button
   - [ ] Test share button

5. **Offer Detail**
   - [ ] Click on offer
   - [ ] Verify offer details
   - [ ] Verify affiliate link present
   - [ ] Test favorite button
   - [ ] Test share button

#### Expected Results:
- ✅ All pages load without errors
- ✅ Search returns relevant results
- ✅ Filters work correctly
- ✅ Images load properly
- ✅ Navigation works smoothly

---

### Flow 3: Cashback Tracking (Click & Conversion) ✅

#### Test Steps:
1. **Click Tracking**
   - [ ] Login as user
   - [ ] Click on an offer's affiliate link
   - [ ] Verify click tracked in database
   - [ ] Check `affiliate_clicks` table
   - [ ] Verify session_id stored
   - [ ] Verify user_id associated

2. **Manual Cashback Tracking**
   - [ ] Use `/api/cashback/track` endpoint
   - [ ] Send offer_id and amount
   - [ ] Verify transaction created
   - [ ] Check status is 'pending'
   - [ ] Verify user earnings updated
   - [ ] Check email notification sent

3. **Conversion Tracking**
   - [ ] Use `/api/tracking/conversion` endpoint
   - [ ] Send conversion data
   - [ ] Verify conversion recorded
   - [ ] Check click marked as converted
   - [ ] Verify commission calculated

4. **Admin Confirmation**
   - [ ] Login as admin
   - [ ] Navigate to cashback transactions
   - [ ] Confirm a pending transaction
   - [ ] Verify status changed to 'confirmed'
   - [ ] Check email sent to user
   - [ ] Verify referral earnings created (if applicable)

#### Expected Results:
- ✅ Clicks are tracked accurately
- ✅ Transactions created correctly
- ✅ Cashback amounts calculated correctly
- ✅ Status updates work
- ✅ Email notifications sent
- ✅ Referral earnings created

---

### Flow 4: Withdrawal System ✅

#### Test Steps:
1. **Request Withdrawal**
   - [ ] Login as user
   - [ ] Navigate to `/withdrawals`
   - [ ] Check available balance
   - [ ] Request withdrawal (minimum $10)
   - [ ] Verify request created
   - [ ] Check status is 'pending'
   - [ ] Verify email notification sent

2. **Admin Approval**
   - [ ] Login as admin
   - [ ] Navigate to withdrawals
   - [ ] View pending withdrawal
   - [ ] Approve withdrawal
   - [ ] Verify status changed to 'approved'
   - [ ] Check email sent to user
   - [ ] Verify balance deducted

3. **Admin Rejection**
   - [ ] Create another withdrawal request
   - [ ] Reject as admin
   - [ ] Add rejection reason
   - [ ] Verify status changed to 'rejected'
   - [ ] Check email sent
   - [ ] Verify balance NOT deducted

#### Expected Results:
- ✅ Users can request withdrawals
- ✅ Minimum threshold enforced
- ✅ Admin can approve/reject
- ✅ Status updates correctly
- ✅ Emails sent appropriately
- ✅ Balance calculations correct

---

### Flow 5: Admin Operations ✅

#### Test Steps:
1. **Admin Login**
   - [ ] Navigate to `/admin/login`
   - [ ] Login with admin credentials
   - [ ] Verify redirect to admin dashboard
   - [ ] Check admin layout loads

2. **Merchant Management**
   - [ ] Create new merchant
   - [ ] Edit existing merchant
   - [ ] Delete merchant
   - [ ] Verify changes reflect on frontend

3. **Offer Management**
   - [ ] Create new offer
   - [ ] Edit existing offer
   - [ ] Activate/deactivate offer
   - [ ] Verify new offer alert emails sent (if enabled)
   - [ ] Check offer appears on frontend

4. **User Management**
   - [ ] View user list
   - [ ] View user details
   - [ ] Check user transactions
   - [ ] Verify user data accurate

5. **Analytics**
   - [ ] View analytics dashboard
   - [ ] Check metrics load
   - [ ] Verify data accurate
   - [ ] Test date filters

6. **Withdrawal Management**
   - [ ] View withdrawal requests
   - [ ] Filter by status
   - [ ] Approve/reject withdrawals
   - [ ] Verify updates work

#### Expected Results:
- ✅ Admin can access all features
- ✅ CRUD operations work
- ✅ Changes reflect immediately
- ✅ Data accurate
- ✅ Email notifications work

---

### Flow 6: Referral Program ✅

#### Test Steps:
1. **Get Referral Code**
   - [ ] Login as user
   - [ ] Navigate to `/referrals`
   - [ ] View referral code
   - [ ] Copy referral link
   - [ ] Verify link format correct

2. **Referral Registration**
   - [ ] Use referral link to register
   - [ ] Complete registration
   - [ ] Verify referral relationship created
   - [ ] Check referral dashboard shows new referral

3. **Referral Earnings**
   - [ ] As referred user, earn cashback
   - [ ] Verify referral earning created
   - [ ] Check referrer's dashboard
   - [ ] Verify 10% bonus calculated
   - [ ] Confirm referral earning when transaction confirmed

#### Expected Results:
- ✅ Referral codes generated
- ✅ Referral links work
- ✅ Relationships tracked
- ✅ Earnings calculated correctly
- ✅ Dashboard shows accurate data

---

### Flow 7: User Profile & Settings ✅

#### Test Steps:
1. **View Profile**
   - [ ] Navigate to `/profile`
   - [ ] Verify user data displays
   - [ ] Check total earnings shown

2. **Update Profile**
   - [ ] Edit name
   - [ ] Save changes
   - [ ] Verify update successful
   - [ ] Check changes persist

3. **Change Password**
   - [ ] Enter current password
   - [ ] Enter new password
   - [ ] Confirm new password
   - [ ] Save changes
   - [ ] Verify can login with new password

4. **Notification Settings**
   - [ ] Toggle notification preferences
   - [ ] Save settings
   - [ ] Verify preferences saved
   - [ ] Test email notifications respect settings

#### Expected Results:
- ✅ Profile data displays correctly
- ✅ Updates work
- ✅ Password change works
- ✅ Notification settings work
- ✅ Changes persist

---

### Flow 8: Favorites & Social Features ✅

#### Test Steps:
1. **Add to Favorites**
   - [ ] Login as user
   - [ ] Click favorite button on offer
   - [ ] Verify offer added to favorites
   - [ ] Navigate to `/favorites`
   - [ ] Verify offer appears

2. **Remove from Favorites**
   - [ ] Click favorite button again
   - [ ] Verify removed from favorites
   - [ ] Check favorites page updated

3. **Share Functionality**
   - [ ] Click share button
   - [ ] Test social media sharing
   - [ ] Test copy link
   - [ ] Verify link format correct

#### Expected Results:
- ✅ Favorites work correctly
- ✅ Favorites persist
- ✅ Share links work
- ✅ Social sharing functional

---

### Flow 9: Analytics & Reports ✅

#### Test Steps:
1. **User Analytics**
   - [ ] Navigate to `/analytics`
   - [ ] Verify data loads
   - [ ] Test different tabs
   - [ ] Test date filters
   - [ ] Verify charts render

2. **Cashback History**
   - [ ] Navigate to `/cashback-history`
   - [ ] Verify charts display
   - [ ] Test different views
   - [ ] Test filters
   - [ ] Verify calendar view

3. **Admin Analytics**
   - [ ] Login as admin
   - [ ] View admin analytics
   - [ ] Verify metrics accurate
   - [ ] Test filters

#### Expected Results:
- ✅ Analytics load correctly
- ✅ Charts render properly
- ✅ Data accurate
- ✅ Filters work
- ✅ No performance issues

---

### Flow 10: Error Handling ✅

#### Test Steps:
1. **Network Errors**
   - [ ] Disconnect internet
   - [ ] Try to make API call
   - [ ] Verify error message shown
   - [ ] Check error handling works

2. **Invalid Input**
   - [ ] Submit form with invalid data
   - [ ] Verify validation messages
   - [ ] Check form doesn't submit

3. **Unauthorized Access**
   - [ ] Try to access admin without login
   - [ ] Try to access user data without auth
   - [ ] Verify redirects work

4. **404 Errors**
   - [ ] Navigate to non-existent route
   - [ ] Verify 404 page (if exists)
   - [ ] Check error handling

#### Expected Results:
- ✅ Errors handled gracefully
- ✅ User-friendly error messages
- ✅ No crashes
- ✅ Proper redirects

---

## 🧪 Test Checklist Summary

### Must Pass Before Launch
- [ ] User registration works
- [ ] User login works
- [ ] Cashback tracking works
- [ ] Withdrawal system works
- [ ] Admin operations work
- [ ] Email notifications work
- [ ] Referral program works
- [ ] No critical errors
- [ ] Mobile responsive
- [ ] Cross-browser compatible

### Should Pass
- [ ] All features functional
- [ ] Performance acceptable
- [ ] Error handling works
- [ ] Analytics accurate

---

## 🐛 Common Issues & Solutions

### Issue: Email Not Sending
**Solution**: Check SMTP configuration in `.env`

### Issue: Database Errors
**Solution**: Verify database initialized, check file permissions

### Issue: CORS Errors
**Solution**: Check `FRONTEND_URL` in backend `.env`

### Issue: Authentication Failing
**Solution**: Verify JWT_SECRET set, check token expiration

### Issue: Images Not Loading
**Solution**: Check image URLs, verify CORS for external images

---

## 📊 Test Results Template

```
Date: ___________
Tester: ___________

Flow 1: Registration/Login
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Flow 2: Browse/Search
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Flow 3: Cashback Tracking
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Flow 4: Withdrawals
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Flow 5: Admin Operations
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Critical Issues Found: ___________
```

---

## 🚀 Next Steps After Testing

1. Fix any critical bugs found
2. Document any issues
3. Retest fixed issues
4. Prepare for deployment
5. Create user acceptance test plan
