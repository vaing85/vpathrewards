# Manual Test Checklist - Quick Reference

Use this checklist to quickly test all critical flows before launch.

## ✅ Quick Test Checklist

### 1. User Registration & Login
- [ ] Register new user at `/register`
- [ ] Login with credentials
- [ ] Verify redirect to dashboard
- [ ] Check user data displays

### 2. Browse & Search
- [ ] View homepage - check featured offers
- [ ] Search for merchant
- [ ] Filter by category
- [ ] View merchant detail page
- [ ] View offer detail page

### 3. Cashback Tracking
- [ ] Click on offer link (should track click)
- [ ] Manually track cashback via API or form
- [ ] Verify transaction appears in dashboard
- [ ] Check status is 'pending'

### 4. Admin Operations
- [ ] Login as admin (`/admin/login`)
- [ ] Create new merchant
- [ ] Create new offer
- [ ] View user list
- [ ] View analytics

### 5. Withdrawal
- [ ] Request withdrawal (min $10)
- [ ] Login as admin
- [ ] Approve withdrawal
- [ ] Verify email sent
- [ ] Check balance updated

### 6. Referral Program
- [ ] View referral code at `/referrals`
- [ ] Copy referral link
- [ ] Register new user with referral link
- [ ] Verify referral tracked
- [ ] Check referral dashboard

### 7. Favorites
- [ ] Add offer to favorites
- [ ] View favorites page
- [ ] Remove from favorites
- [ ] Verify updates

### 8. Profile & Settings
- [ ] View profile
- [ ] Update name
- [ ] Change password
- [ ] Update notification settings

### 9. Analytics
- [ ] View user analytics
- [ ] View cashback history
- [ ] Check charts render
- [ ] Test filters

### 10. Error Handling
- [ ] Try invalid login
- [ ] Try accessing protected route
- [ ] Check error messages display
- [ ] Verify no crashes

---

## 🚨 Critical Issues to Watch For

- [ ] No console errors
- [ ] No 500 errors
- [ ] Forms validate correctly
- [ ] Images load
- [ ] Navigation works
- [ ] Mobile responsive
- [ ] Email notifications work

---

## 📝 Test Results

**Date**: ___________
**Tester**: ___________

**Overall Status**: [ ] Ready [ ] Needs Fixes

**Issues Found**:
1. ___________
2. ___________
3. ___________

**Notes**:
___________
