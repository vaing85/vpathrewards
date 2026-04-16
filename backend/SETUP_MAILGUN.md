# Mailgun Setup Guide - Quick Configuration

Since you already have a Mailgun account, let's configure it!

---

## 🚀 Quick Setup Steps

### Step 1: Get Your SMTP Credentials

1. **Log in to Mailgun Dashboard**
   - Go to: https://app.mailgun.com/

2. **Navigate to SMTP Settings**
   - Click on your **domain** (or create one if you haven't)
   - Go to **"Sending"** → **"Domain Settings"**
   - Click on your verified domain
   - Go to **"SMTP credentials"** tab

3. **Get Your SMTP Details**
   You'll see:
   - **SMTP Hostname:** `smtp.mailgun.org`
   - **Port:** `587` (or `465` for SSL)
   - **Username:** `postmaster@yourdomain.mailgun.org` (or similar)
   - **Password:** (shown in dashboard - click "Show" if hidden)

### Step 2: Verify Your Domain (If Not Done)

If you haven't verified a domain yet:

1. Go to **"Sending"** → **"Domains"**
2. Click **"Add New Domain"**
3. Enter your domain (e.g., `yourdomain.com`)
4. Follow instructions to add DNS records:
   - TXT record for domain verification
   - MX records (optional, for receiving)
   - CNAME records for tracking
5. Wait for verification (can take a few minutes to hours)

**OR** use Mailgun's sandbox domain for testing:
- Domain: `sandbox1234567890.mailgun.org` (your sandbox domain)
- You can only send to authorized recipients with sandbox

### Step 3: Update Configuration

Edit `backend/.env.production` and update the Mailgun section:

```env
# Email Configuration (Mailgun)
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your-mailgun-smtp-password
SMTP_FROM="CashBack Rewards" <noreply@yourdomain.com>
```

**Replace:**
- `SMTP_USER` = Your Mailgun SMTP username (from Step 1)
- `SMTP_PASS` = Your Mailgun SMTP password (from Step 1)
- `noreply@yourdomain.com` = Your verified domain email

### Step 4: Validate Configuration

```bash
cd backend
npm run validate:prod
```

Should show: ✅ SMTP configuration is correct

### Step 5: Test Email Sending

**Option 1: Test via User Registration**
1. Start your server: `npm run dev`
2. Register a new user
3. Check for welcome email

**Option 2: Check Mailgun Logs**
1. Go to Mailgun dashboard
2. Check **"Sending"** → **"Logs"**
3. See if emails are being sent

---

## 📋 Mailgun Configuration Checklist

- [ ] Mailgun account created
- [ ] Domain verified (or using sandbox)
- [ ] SMTP credentials obtained
- [ ] `.env.production` updated with credentials
- [ ] Configuration validated
- [ ] Test email sent successfully

---

## 🆘 Troubleshooting

### Issue: "Authentication failed"

**Solutions:**
- Double-check SMTP username and password
- Ensure you're using SMTP credentials, not API key
- Try regenerating SMTP password in Mailgun dashboard

### Issue: "Sender not verified"

**Solutions:**
- Verify your domain in Mailgun dashboard
- If using sandbox, add recipient to authorized recipients
- Check DNS records are correct

### Issue: "Connection timeout"

**Solutions:**
- Check firewall allows port 587
- Try port 465 with `SMTP_SECURE=true`
- Verify SMTP host is `smtp.mailgun.org`

### Issue: "Sandbox domain - recipient not authorized"

**Solutions:**
- Add recipient email to authorized recipients in Mailgun
- Or verify your own domain to send to anyone

---

## 📊 Mailgun Free Tier Limits

- **5,000 emails/month** (free tier)
- **First 3 months:** 5,000 emails/month
- **After 3 months:** 1,000 emails/month (still free!)

**Perfect for MVP!** 🎉

---

## ✅ Next Steps

After configuration:

1. ✅ Test email sending
2. ✅ Verify emails are received
3. ✅ Check Mailgun logs for delivery status
4. ✅ Deploy to production

---

**Need Help?** Check Mailgun dashboard → Support or see `EMAIL_SERVICE_SETUP.md` for more details.
