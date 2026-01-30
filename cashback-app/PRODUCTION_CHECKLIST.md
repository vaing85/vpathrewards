# Production Deployment Checklist

Use this checklist to ensure your production deployment is complete and secure.

---

## 🔐 Security Configuration

### Environment Variables
- [ ] `NODE_ENV=production` is set
- [ ] `JWT_SECRET` is a secure random string (32+ bytes)
- [ ] `FRONTEND_URL` matches your production domain
- [ ] `.env` file is NOT committed to version control
- [ ] `.env` file has proper permissions (600 on Linux/Mac)

### Authentication & Authorization
- [ ] Default admin password has been changed
- [ ] JWT tokens expire after 7 days (default)
- [ ] Admin routes are protected
- [ ] User routes require authentication

### Rate Limiting
- [ ] API rate limit: 100 requests/15 min (production)
- [ ] Auth rate limit: 5 requests/15 min (production)
- [ ] Admin rate limit: 50 requests/15 min
- [ ] Rate limits are appropriate for your use case

### Security Headers
- [ ] Helmet.js is configured
- [ ] CORS is restricted to production domain
- [ ] HTTPS is enabled
- [ ] Security headers are set

---

## 📧 Email Configuration

### Email Service Setup
- [ ] Email service account created (SendGrid/AWS SES/Mailgun)
- [ ] SMTP credentials configured in `.env`
- [ ] Sender email/domain verified
- [ ] Test email sent successfully

### Email Types Tested
- [ ] Welcome email (user registration)
- [ ] Cashback confirmation email
- [ ] Withdrawal notification email
- [ ] New offer alert email (if enabled)

---

## 🗄️ Database

### Database Setup
- [ ] Production database configured
- [ ] Database indexes created (32 single + 10 composite)
- [ ] Database backup strategy in place
- [ ] Database credentials are secure

### Database Operations
- [ ] Database migrations completed
- [ ] Seed data loaded (if needed)
- [ ] Database connection tested

---

## 🚀 Deployment

### Build Process
- [ ] Backend built successfully (`npm run build`)
- [ ] Frontend built successfully (`npm run build`)
- [ ] No build errors or warnings
- [ ] Production dependencies installed (`npm install --production`)

### Server Configuration
- [ ] Server starts without errors
- [ ] Health endpoint responds (`/api/health`)
- [ ] Port is correctly configured
- [ ] Process manager configured (PM2/systemd/Docker)

### Reverse Proxy (if used)
- [ ] Nginx/Apache configured
- [ ] SSL certificate installed
- [ ] HTTPS redirects HTTP
- [ ] Proxy passes to backend correctly

---

## ✅ Testing

### API Endpoints
- [ ] Health check endpoint works
- [ ] User registration works
- [ ] User login works
- [ ] Cashback tracking works
- [ ] Withdrawal requests work
- [ ] Admin endpoints work

### User Flows
- [ ] User can register and login
- [ ] User can browse merchants/offers
- [ ] User can track cashback
- [ ] User can request withdrawal
- [ ] Admin can manage merchants/offers
- [ ] Admin can approve/reject withdrawals

### Email Testing
- [ ] Welcome emails are received
- [ ] Cashback confirmation emails work
- [ ] Withdrawal notification emails work

### Browser Testing
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge

### Mobile Testing
- [ ] Responsive design works
- [ ] Mobile navigation works
- [ ] Forms work on mobile
- [ ] Touch interactions work

---

## 📊 Monitoring & Logging

### Logging
- [ ] Logging is enabled (`LOG_TO_FILE=true`)
- [ ] Log files are being created
- [ ] Log rotation is configured
- [ ] Error logs are accessible

### Monitoring
- [ ] Health check monitoring set up
- [ ] Uptime monitoring configured
- [ ] Error tracking configured (optional)
- [ ] Performance monitoring (optional)

---

## 📚 Documentation

### Documentation Created
- [ ] Production setup guide
- [ ] Environment configuration guide
- [ ] Deployment guide
- [ ] API documentation (if needed)
- [ ] Admin user guide

### Documentation Updated
- [ ] README.md updated
- [ ] Environment variable documentation
- [ ] Troubleshooting guide

---

## 🔄 Post-Deployment

### Initial Checks
- [ ] All tests passing
- [ ] No critical errors in logs
- [ ] Email service working
- [ ] Database operations working
- [ ] API endpoints responding

### Ongoing Maintenance
- [ ] Backup strategy implemented
- [ ] Update schedule planned
- [ ] Security review scheduled
- [ ] Performance monitoring active
- [ ] Error tracking active

---

## 🎯 Production Readiness Score

**Count your checkmarks:**

- **90-100% checked:** ✅ Production ready!
- **70-89% checked:** ⚠️  Almost ready, review unchecked items
- **50-69% checked:** ⚠️  Needs more work before production
- **<50% checked:** ❌ Not ready for production

---

## 📝 Notes

**Date of Deployment:** _______________

**Deployed By:** _______________

**Production URL:** _______________

**Issues Encountered:**
- 
- 
- 

**Additional Notes:**
- 
- 
- 

---

## 🆘 Support

If you encounter issues:

1. Check the [Troubleshooting Guide](../backend/TROUBLESHOOTING.md)
2. Review error logs
3. Check environment variables
4. Verify all services are running

---

**Last Updated:** $(date)
