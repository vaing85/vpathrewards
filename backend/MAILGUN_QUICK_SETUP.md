# Mailgun Quick Setup - You Already Have an Account! 🎉

Since you have a Mailgun account, let's configure it in 3 steps:

---

## 🚀 3-Step Setup

### Step 1: Get Your SMTP Credentials

1. **Log in:** https://app.mailgun.com/
2. **Go to:** Your Domain → **"Sending"** → **"Domain Settings"** → **"SMTP credentials"** tab
3. **Copy these values:**
   - **SMTP Username:** `postmaster@yourdomain.mailgun.org` (or similar)
   - **SMTP Password:** (click "Show" to reveal)

### Step 2: Update Configuration

Edit `backend/.env.production` and replace:

```env
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your-mailgun-smtp-password-here
SMTP_FROM="CashBack Rewards" <noreply@yourdomain.com>
```

**With your actual values:**
- `SMTP_USER` = Your Mailgun SMTP username
- `SMTP_PASS` = Your Mailgun SMTP password
- `noreply@yourdomain.com` = Your verified domain email

### Step 3: Validate

```bash
cd backend
npm run validate:prod
```

✅ Done! Your email service is configured!

---

## 📍 Where to Find SMTP Credentials

**In Mailgun Dashboard:**
1. Click on your **domain** (left sidebar)
2. Go to **"Sending"** tab
3. Click **"Domain Settings"**
4. Click **"SMTP credentials"** tab
5. You'll see:
   - **SMTP hostname:** `smtp.mailgun.org`
   - **Port:** `587`
   - **Username:** (your SMTP username)
   - **Password:** (click "Show" to see)

---

## ✅ Quick Checklist

- [ ] Logged into Mailgun
- [ ] Found SMTP credentials
- [ ] Updated `.env.production` with credentials
- [ ] Ran `npm run validate:prod`
- [ ] Configuration validated ✅

---

## 🧪 Test It

1. Start server: `npm run dev`
2. Register a new user
3. Check for welcome email!

**Or check Mailgun logs:**
- Dashboard → **"Sending"** → **"Logs"**
- See if emails are being sent

---

## 🆘 Quick Help

**"Can't find SMTP credentials"**
→ Make sure you're in **"Domain Settings"** → **"SMTP credentials"** tab

**"Authentication failed"**
→ Double-check username and password are correct

**"Using sandbox domain"**
→ You can only send to authorized recipients. Add them in Mailgun dashboard or verify your own domain.

---

**That's it!** 🎉 See `SETUP_MAILGUN.md` for more details.
