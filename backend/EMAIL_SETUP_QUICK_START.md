# Email Service Setup - Quick Start

## 🎯 Recommendation: SendGrid

**Why SendGrid?**
- ✅ Easiest setup (5 minutes)
- ✅ Free tier: 100 emails/day (perfect for MVP)
- ✅ No credit card required
- ✅ Simple API key authentication

---

## 🚀 Quick Setup (5 Steps)

### 1. Sign Up for SendGrid
👉 Go to: **https://sendgrid.com/free/**

### 2. Verify Your Email
- Go to **Settings** → **Sender Authentication**
- Click **"Verify a Single Sender"**
- Enter your email and verify it

### 3. Create API Key
- Go to **Settings** → **API Keys**
- Click **"Create API Key"**
- Name: `Cashback Production`
- Permission: **"Full Access"** or **"Mail Send"**
- **COPY THE KEY** (starts with `SG.`)

### 4. Update Configuration

Edit `backend/.env.production` and replace:

```env
SMTP_PASS=your-sendgrid-api-key-here
```

With your actual API key:

```env
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Also update the sender email:

```env
SMTP_FROM="CashBack Rewards" <noreply@yourdomain.com>
```

Replace `noreply@yourdomain.com` with your verified email.

### 5. Validate Configuration

```bash
cd backend
npm run validate:prod
```

Should show: ✅ SMTP configuration is correct

---

## ✅ Done!

Your email service is configured!

**Test it:** Register a new user and check for welcome email.

---

## 📚 Detailed Guides

- **Full Setup Guide:** `EMAIL_SERVICE_SETUP.md`
- **SendGrid Quick Guide:** `SETUP_SENDGRID.md`
- **Troubleshooting:** See `EMAIL_SERVICE_SETUP.md` → Troubleshooting section

---

## 🆘 Quick Help

**"Authentication failed"**
→ Check API key is correct and has "Mail Send" permission

**"Sender not verified"**
→ Verify sender email in SendGrid dashboard

**Need more help?**
→ See `EMAIL_SERVICE_SETUP.md` for detailed troubleshooting
